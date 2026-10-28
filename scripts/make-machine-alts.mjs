// 3 alternativas de Arcade / Slot / Gacha em Assets/alts (pixel art 16-bit + tela idle).
// Gera PNG (prévia no Explorer) + GIF válido + preview.html para escolher no navegador.
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '..', 'Assets', 'alts');
fs.mkdirSync(OUT, { recursive: true });

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const hex = (h) => {
  const n = parseInt(String(h).replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

// ---------- PNG (RGBA) ----------
function crcTable() {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c;
  }
  return t;
}
const CRC = crcTable();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const typ = Buffer.from(type);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([typ, data])));
  return Buffer.concat([len, typ, data, crc]);
}
function encodePng(rgba, w, h) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    for (let x = 0; x < w; x++) {
      const s = (y * w + x) * 4;
      const d = y * (w * 4 + 1) + 1 + x * 4;
      raw[d] = rgba[s]; raw[d + 1] = rgba[s + 1]; raw[d + 2] = rgba[s + 2]; raw[d + 3] = rgba[s + 3] || 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; // RGBA 8-bit
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------- GIF89a (global palette, reliable LZW) ----------
function encodeGif(frames, w, h, delayCs = 10) {
  // Build a shared palette from all frames (max 256).
  const map = new Map();
  const pal = [];
  const add = (r, g, b) => {
    const key = `${r >> 2},${g >> 2},${b >> 2}`;
    let i = map.get(key);
    if (i != null) return i;
    if (pal.length >= 256) {
      // nearest
      let best = 0; let bd = 1e9;
      for (let j = 0; j < pal.length; j++) {
        const p = pal[j];
        const d = (p[0] - r) ** 2 + (p[1] - g) ** 2 + (p[2] - b) ** 2;
        if (d < bd) { bd = d; best = j; }
      }
      return best;
    }
    i = pal.length;
    pal.push([r & ~3, g & ~3, b & ~3]);
    map.set(key, i);
    return i;
  };
  add(0, 0, 0);
  const indexed = frames.map((rgba) => {
    const ix = Buffer.alloc(w * h);
    for (let i = 0, p = 0; i < rgba.length; i += 4, p++) ix[p] = add(rgba[i], rgba[i + 1], rgba[i + 2]);
    return ix;
  });
  let psize = 1;
  while ((1 << psize) < pal.length && psize < 8) psize++;
  const ncolors = 1 << psize;
  while (pal.length < ncolors) pal.push([0, 0, 0]);

  const parts = [];
  parts.push(Buffer.from('GIF89a'));
  const hdr = Buffer.alloc(7);
  hdr.writeUInt16LE(w, 0); hdr.writeUInt16LE(h, 2);
  hdr[4] = 0x80 | (psize - 1); // global palette
  hdr[5] = 0; hdr[6] = 0;
  parts.push(hdr);
  const gpal = Buffer.alloc(ncolors * 3);
  for (let i = 0; i < ncolors; i++) {
    gpal[i * 3] = pal[i][0]; gpal[i * 3 + 1] = pal[i][1]; gpal[i * 3 + 2] = pal[i][2];
  }
  parts.push(gpal);
  // loop
  parts.push(Buffer.from([0x21, 0xff, 0x0b]));
  parts.push(Buffer.from('NETSCAPE2.0'));
  parts.push(Buffer.from([0x03, 0x01, 0x00, 0x00, 0x00]));

  const minCode = Math.max(2, psize);
  for (const ix of indexed) {
    const gce = Buffer.alloc(8);
    gce[0] = 0x21; gce[1] = 0xf9; gce[2] = 0x04; gce[3] = 0x08; // dispose to previous? use 0x04 restore bg, or 0x08 do not dispose
    gce[3] = 0x04;
    gce.writeUInt16LE(delayCs, 4); gce[6] = 0; gce[7] = 0;
    parts.push(gce);
    const desc = Buffer.alloc(10);
    desc[0] = 0x2c;
    desc.writeUInt16LE(0, 1); desc.writeUInt16LE(0, 3);
    desc.writeUInt16LE(w, 5); desc.writeUInt16LE(h, 7);
    desc[9] = 0; // use global palette
    parts.push(desc);
    parts.push(Buffer.from([minCode]));
    const lzw = lzwEncode(ix, minCode);
    for (let i = 0; i < lzw.length; i += 255) {
      const chunk = lzw.subarray(i, Math.min(i + 255, lzw.length));
      parts.push(Buffer.from([chunk.length]));
      parts.push(chunk);
    }
    parts.push(Buffer.from([0]));
  }
  parts.push(Buffer.from([0x3b]));
  return Buffer.concat(parts);
}

function lzwEncode(indexStream, minCodeSize) {
  const clear = 1 << minCodeSize;
  const eoi = clear + 1;
  let codeSize = minCodeSize + 1;
  let next = eoi + 1;
  const dict = new Map();
  const resetDict = () => { dict.clear(); next = eoi + 1; codeSize = minCodeSize + 1; };

  let acc = 0; let nbits = 0;
  const bytes = [];
  const put = (code) => {
    acc |= (code << nbits);
    nbits += codeSize;
    while (nbits >= 8) {
      bytes.push(acc & 255);
      acc >>= 8;
      nbits -= 8;
    }
  };

  resetDict();
  put(clear);
  let w = String(indexStream[0]);
  for (let i = 1; i < indexStream.length; i++) {
    const k = String(indexStream[i]);
    const wk = `${w},${k}`;
    if (dict.has(wk)) w = wk;
    else {
      put(w.includes(',') ? dict.get(w) : +w);
      if (next < 4096) {
        dict.set(wk, next++);
        if (next > (1 << codeSize) && codeSize < 12) codeSize++;
      } else {
        put(clear);
        resetDict();
      }
      w = k;
    }
  }
  put(w.includes(',') ? dict.get(w) : +w);
  put(eoi);
  if (nbits > 0) bytes.push(acc & 255);
  return Buffer.from(bytes);
}

// ---------- canvas ----------
function make(w, h) {
  const d = new Uint8ClampedArray(w * h * 4);
  const set = (x, y, c) => {
    x |= 0; y |= 0;
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const [r, g, b] = typeof c === 'string' ? hex(c) : c;
    const i = (y * w + x) * 4;
    d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255;
  };
  const rect = (x, y, rw, rh, c) => {
    for (let yy = 0; yy < rh; yy++) for (let xx = 0; xx < rw; xx++) set(x + xx, y + yy, c);
  };
  const px = set;
  const circle = (cx, cy, r, c) => {
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.55) set(cx + x, cy + y, c);
  };
  const hline = (x, y, len, c) => rect(x, y, len, 1, c);
  const vline = (x, y, len, c) => rect(x, y, 1, len, c);
  // fill transparent black bg first so PNG has alpha=0 outside? machines are solid — fill dark checker? fill void.
  for (let i = 0; i < d.length; i += 4) { d[i] = 0; d[i + 1] = 0; d[i + 2] = 0; d[i + 3] = 0; }
  return { w, h, d, rect, px, circle, hline, vline };
}

function scale2(src) {
  const W = src.w * 2; const H = src.h * 2;
  const out = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < src.h; y++) {
    for (let x = 0; x < src.w; x++) {
      const i = (y * src.w + x) * 4;
      for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
        const o = ((y * 2 + dy) * W + x * 2 + dx) * 4;
        out[o] = src.d[i]; out[o + 1] = src.d[i + 1]; out[o + 2] = src.d[i + 2]; out[o + 3] = src.d[i + 3];
      }
    }
  }
  return { w: W, h: H, d: out };
}

function arcadeScreen(g, sx, sy, sw, sh, t, variant) {
  const sky = [['#0a0820', '#1a1040', '#ff3ea5'], ['#041018', '#0c2840', '#5ef0ff'], ['#100808', '#301010', '#ffd23f']][variant];
  const { rect, px, hline, vline } = g;
  rect(sx, sy, sw, sh, sky[0]);
  for (let i = 0; i < 4; i++) {
    const y = sy + sh - 5 + i;
    hline(sx, y, sw, sky[1]);
    const step = 3 + i;
    for (let x = 0; x < sw; x += step) px(sx + ((x + t) % step), y, sky[2]);
  }
  for (let y = 0; y < sh; y += 2) hline(sx, sy + y, sw, '#060410');
  for (let i = 0; i < 10; i++) {
    px(sx + ((i * 11 + t * 2) % sw), sy + 1 + ((i * 7) % (sh - 7)), (i + t) % 3 ? '#ffffff' : '#c8e8ff');
  }
  for (let i = 0; i < 3; i++) {
    const x = sx + Math.floor(((t * (2 + i) + i * 11) % (sw + 8)) - 4);
    const y = sy + 2 + i * 3 + (((t + i * 2) % 4) < 2 ? 0 : 1);
    rect(x, y, 5, 2, '#ffd23f');
    px(x + 2, y - 1, '#5ef0ff');
    px(x + 1, y + 2, '#ff3ea5'); px(x + 3, y + 2, '#ff3ea5');
  }
  const cx = sx + Math.floor(sw / 2) + (Math.sin(t * 0.7) * 3 | 0);
  const cy = sy + Math.floor(sh / 2) - 1 + (Math.cos(t * 0.5) * 2 | 0);
  px(cx - 2, cy, '#5ef0ff'); px(cx + 2, cy, '#5ef0ff'); px(cx, cy - 2, '#5ef0ff'); px(cx, cy + 2, '#5ef0ff');
  if ((t >> 2) % 2 === 0) rect(sx + Math.floor(sw / 2) - 5, sy + sh - 3, 10, 1, '#ffd23f');
  const neon = (t % 6) < 3 ? '#ff3e64' : '#ff8aa0';
  hline(sx, sy, sw, neon); hline(sx, sy + sh - 1, sw, neon);
  vline(sx, sy, sh, neon); vline(sx + sw - 1, sy, sh, neon);
}

function slotWindow(g, sx, sy, sw, sh, t, variant) {
  const { rect, px, hline } = g;
  const rim = [['#ffc23a', '#ff3ea5'], ['#5ef0ff', '#ff3ea5'], ['#7ad04a', '#ffd23f']][variant];
  rect(sx, sy, sw, sh, rim[0]);
  rect(sx + 1, sy + 1, sw - 2, sh - 2, '#14101e');
  const cols = 3;
  const cw = Math.floor((sw - 4) / cols);
  const syms = ['#e23b3b', '#ffd23f', '#5ef0ff', '#7ad04a', '#ff3ea5', '#ffffff'];
  for (let i = 0; i < cols; i++) {
    const x = sx + 2 + i * cw;
    rect(x, sy + 2, cw - 1, sh - 4, '#f0ece4');
    const syi = syms[(i + (t >> 1)) % syms.length];
    const yOff = (t + i) % 3;
    rect(x + 1, sy + 3 + yOff, cw - 3, 2, syi);
    px(x + 2, sy + 4 + yOff, '#ffffff');
  }
  for (let y = 2; y < sh - 2; y += 2) hline(sx + 1, sy + y, sw - 2, '#0a0814');
  const pulse = (t % 4) < 2 ? rim[1] : rim[0];
  hline(sx, sy, sw, pulse); hline(sx, sy + sh - 1, sw, pulse);
}

function gachaWindow(g, sx, sy, sw, sh, t, variant) {
  const { rect, px, circle } = g;
  const glass = [['#b8e8f8', '#ffffff'], ['#2a1a5e', '#5ef0ff'], ['#ffe0f0', '#ff6fb5']][variant];
  rect(sx, sy, sw, sh, '#7a8090');
  rect(sx + 1, sy + 1, sw - 2, sh - 2, glass[0]);
  const caps = ['#4b69ff', '#ff6fb5', '#ffd23f', '#7ad04a', '#8847ff', '#ff8a3d', '#5ef0ff', '#eb4b4b'];
  const pile = [[3, 10], [7, 11], [11, 10], [15, 11], [5, 7], [9, 7], [13, 7], [7, 4], [12, 4]];
  pile.forEach(([x, y], i) => {
    const dy = ((i + t) % 3) - 1;
    const cx = sx + 2 + x;
    const cy = clamp(sy + 2 + y + dy, sy + 2, sy + sh - 3);
    circle(cx, cy, 2, caps[(i + t) % caps.length]);
    px(cx - 1, cy - 1, glass[1]);
  });
  rect(sx + 2, sy + 2, 1, Math.floor(sh * 0.45), glass[1]);
  const pulse = (t % 4) < 2 ? glass[1] : '#ffd23f';
  for (let i = 0; i < sw; i++) { px(sx + i, sy, pulse); px(sx + i, sy + sh - 1, pulse); }
}

function arcadeAlt(variant, frame) {
  const c = make(26, 46);
  const { rect, px, circle, hline } = c;
  const body = [['#d03038', '#901820'], ['#3a2468', '#201040'], ['#287878', '#185858']][variant];
  const neon = [['#ff3ea5', '#5ef0ff', '#ffd23f'], ['#ffd23f', '#ff3ea5', '#5ef0ff'], ['#5ef0ff', '#7ad04a', '#ffd23f']][variant];
  rect(0, 7, 26, 37, body[0]);
  rect(0, 7, 2, 37, body[1]); rect(24, 7, 2, 37, body[1]);
  rect(0, 7, 1, 37, neon[0]); rect(25, 7, 1, 37, neon[1]);
  rect(1, 0, 24, 7, '#14101e');
  hline(1, 0, 24, neon[0]); hline(1, 6, 24, neon[1]);
  circle(13, 3, 2, '#f4f0e8'); circle(13, 3, 1, '#e03030'); px(13, 3, neon[2]);
  for (let i = 0; i < 10; i++) px(3 + i * 2, 1, (i + frame) % 2 ? neon[0] : neon[1]);
  rect(3, 9, 20, 15, '#0c0a18');
  arcadeScreen(c, 4, 10, 18, 13, frame + variant * 2, variant);
  rect(2, 25, 22, 5, '#2a2a38');
  hline(2, 25, 22, '#484860');
  rect(4, 26, 5, 2, neon[1]); px(7, 28, neon[1]);
  rect(17, 26, 5, 2, neon[0]); px(18, 28, neon[0]);
  px(12, 27, neon[2]); px(14, 27, '#ffffff');
  hline(2, 30, 22, '#f0ece4');
  rect(9, 32, 8, 9, '#1c1824');
  rect(10, 33, 2, 3, neon[0]); rect(14, 33, 2, 3, neon[0]);
  hline(11, 38, 4, '#5a5868');
  rect(0, 44, 26, 2, '#242430');
  hline(2, 45, 22, neon[0]);
  return scale2(c);
}

function slotAlt(variant, frame) {
  const c = make(28, 40);
  const { rect, px, circle, hline } = c;
  const top = [['#6a2888', '#ffd23f'], ['#101028', '#5ef0ff'], ['#285838', '#ff9840']][variant];
  const body = [['#3048b0', '#182868'], ['#1c1038', '#2a1858'], ['#404028', '#282818']][variant];
  const neon = [['#ffc23a', '#ff3ea5'], ['#5ef0ff', '#ff3ea5'], ['#7ad04a', '#ffd23f']][variant];
  rect(1, 0, 22, 7, top[0]);
  rect(2, 1, 20, 5, top[1]);
  for (let i = 0; i < 3; i++) { rect(5 + i * 5, 2, 3, 1, '#e03030'); px(6 + i * 5, 3, '#e03030'); }
  for (let i = 0; i < 11; i++) {
    const on = (i + frame) % 3 === 0;
    px(2 + i * 2, 0, on ? '#ffffff' : neon[0]);
    px(2 + i * 2, 6, on ? neon[1] : '#403050');
  }
  rect(1, 7, 22, 29, body[0]);
  rect(21, 8, 2, 28, body[1]);
  rect(1, 8, 1, 28, neon[0]);
  slotWindow(c, 3, 10, 18, 11, frame, variant);
  rect(24, 10, 3, 14, '#c8c8d0');
  circle(25, 9 + (frame % 2), 1, '#e03030');
  rect(4, 23, 16, 3, '#14101e');
  if ((frame >> 1) % 2 === 0) hline(6, 24, 12, neon[0]);
  rect(3, 28, 18, 5, '#2a2a38');
  hline(3, 28, 18, '#484860');
  for (let i = 0; i < 5; i++) px(6 + i * 3, 30, (i + frame) % 2 ? neon[1] : neon[0]);
  rect(2, 35, 20, 3, '#1c1c28');
  return scale2(c);
}

function gachaAlt(variant, frame) {
  const c = make(26, 44);
  const { rect, px, circle, hline } = c;
  const body = [['#e02828', '#a01818'], ['#181028', '#2a1850'], ['#f078a8', '#c05080']][variant];
  const neon = [['#ffd23f', '#5ef0ff'], ['#ff3ea5', '#5ef0ff'], ['#ffffff', '#ff80c0']][variant];
  rect(1, 0, 24, 10, '#282838');
  rect(2, 1, 22, 8, variant === 1 ? '#241848' : '#fff4d0');
  rect(2, 1, 22, 2, body[0]);
  for (let i = 0; i < 11; i++) px(3 + i * 2, 1, (i + frame) % 2 ? '#ffffff' : neon[0]);
  [[3, '#4b69ff'], [8, '#8847ff'], [13, '#d030e0'], [18, '#e03030']].forEach(([x, col], i) => {
    rect(x, 4, 4, 4, '#ffffff');
    rect(x + 1, 4, 2, 2, neon[(i + frame) % 2]);
    rect(x + 1, 6, 2, 1, col);
  });
  gachaWindow(c, 2, 10, 22, 15, frame, variant);
  rect(1, 25, 24, 15, body[0]);
  hline(1, 25, 24, neon[0]);
  rect(23, 26, 2, 14, body[1]);
  rect(2, 27, 9, 9, neon[0]);
  hline(2, 27, 9, '#fff8c0');
  rect(3, 28, 2, 2, '#c07000');
  rect(6, 28, 4, 1, body[0]);
  const dig = { 3: '111100111001111', 0: '111101101101111' };
  [...'30'].forEach((d, i) => {
    const bits = dig[d];
    for (let k = 0; k < 15; k++) if (bits[k] === '1') px(4 + i * 4 + (k % 3), 30 + (k / 3 | 0), '#181820');
  });
  rect(12, 27, 10, 9, '#d0d4e0');
  hline(12, 27, 10, '#ffffff');
  rect(19, 28, 2, 3, '#585868');
  circle(16, 31, 3, '#a8acb8');
  circle(16, 31, 2, '#c0c4d0');
  circle(16, 31, 1, neon[0]);
  const ang = frame % 4;
  if (ang === 0) rect(12, 31, 9, 2, '#282838');
  else if (ang === 2) rect(15, 27, 2, 9, '#282838');
  else for (let k = -3; k <= 3; k++) px(16 + k, 31 + (ang === 1 ? k : -k), '#282838');
  rect(3, 36, 7, 3, '#181820');
  rect(12, 36, 10, 4, '#181820');
  hline(12, 36, 10, '#c0c4d0');
  rect(14, 37, 6, 2, (frame >> 1) % 2 ? neon[1] : '#383848');
  hline(1, 40, 24, body[1]);
  rect(1, 41, 5, 3, '#585868'); rect(20, 41, 5, 3, '#585868');
  hline(6, 41, 14, '#383848');
  return scale2(c);
}

function saveAlt(name, makeFrame, n = 8) {
  const frames = [];
  let w = 0; let h = 0;
  for (let i = 0; i < n; i++) {
    const f = makeFrame(i);
    w = f.w; h = f.h;
    frames.push(f.d);
  }
  // PNG preview = frame 0 (Explorer shows this)
  const png = encodePng(frames[0], w, h);
  fs.writeFileSync(path.join(OUT, `${name}.png`), png);
  // Sheet of all frames (horizontal) for picking animation feel
  const sheet = new Uint8ClampedArray(w * n * h * 4);
  for (let i = 0; i < n; i++) {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const s = (y * w + x) * 4;
        const d = (y * (w * n) + i * w + x) * 4;
        sheet[d] = frames[i][s]; sheet[d + 1] = frames[i][s + 1]; sheet[d + 2] = frames[i][s + 2]; sheet[d + 3] = frames[i][s + 3];
      }
    }
  }
  fs.writeFileSync(path.join(OUT, `${name}_sheet.png`), encodePng(sheet, w * n, h));
  // GIF animated
  const gif = encodeGif(frames, w, h, 10);
  fs.writeFileSync(path.join(OUT, `${name}.gif`), gif);
  console.log(name, `${w}x${h}`, `png ${png.length}b`, `gif ${gif.length}b`);
}

const names = [];
for (let v = 0; v < 3; v++) {
  for (const [kind, fn] of [['arcade', arcadeAlt], ['slot', slotAlt], ['gacha', gachaAlt]]) {
    const name = `${kind}_alt${v + 1}`;
    names.push(name);
    saveAlt(name, (f) => fn(v, f));
  }
}

// Remove broken/old formats
for (const f of fs.readdirSync(OUT)) {
  if (/\.(jpg|jpeg)$/i.test(f)) fs.unlinkSync(path.join(OUT, f));
}

const html = `<!doctype html>
<meta charset="utf-8">
<title>Alts — Arcade / Slot / Gacha</title>
<style>
  body { margin: 0; padding: 24px; background: #12141c; color: #e8e8f0; font: 14px Consolas, monospace; }
  h1 { font-size: 18px; margin: 0 0 8px; }
  p { opacity: 0.7; margin: 0 0 20px; }
  section { margin-bottom: 28px; }
  h2 { font-size: 14px; color: #5ef0ff; margin: 0 0 12px; }
  .row { display: flex; flex-wrap: wrap; gap: 18px; }
  figure { margin: 0; text-align: center; background: #1a1d28; border: 1px solid #2a2e3a; border-radius: 10px; padding: 12px; }
  img { image-rendering: pixelated; height: 180px; background:
    linear-gradient(45deg,#222 25%,transparent 25%),linear-gradient(-45deg,#222 25%,transparent 25%),
    linear-gradient(45deg,transparent 75%,#222 75%),linear-gradient(-45deg,transparent 75%,#222 75%);
    background-size: 12px 12px; background-position: 0 0,0 6px,6px -6px,-6px 0; }
  figcaption { margin-top: 8px; font-size: 12px; }
  code { color: #ffd23f; }
</style>
<h1>Alternativas (pixel art 16-bit)</h1>
<p>GIF animado à esquerda · PNG estático (Explorer) · escolha e diga qual usar.</p>
${['arcade', 'slot', 'gacha'].map((kind) => `
<section>
  <h2>${kind}</h2>
  <div class="row">
    ${[1, 2, 3].map((i) => {
    const n = `${kind}_alt${i}`;
    return `<figure>
      <img src="${n}.gif" alt="${n}">
      <figcaption><code>${n}.gif</code><br><code>${n}.png</code></figcaption>
    </figure>`;
  }).join('')}
  </div>
</section>`).join('')}
`;
fs.writeFileSync(path.join(OUT, 'preview.html'), html);
console.log('ok →', OUT);
console.log('abra Assets/alts/preview.html no navegador');
