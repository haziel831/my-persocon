// Custom looks for objects. Priority: an image/GIF/3D model imported for that object, then the
// Minecraft resourcepack (1.20.1 layout), then the built-in pixel art.
import { translate } from './i18n.js';
const TEX = 'assets/minecraft/textures/';
const SND = 'assets/minecraft/sounds/';

// Object id -> resourcepack texture(s). 'food' is the supplies bag (barrel), 'bag' the cartridge bag (chest).
const RP_ITEMS = {
  maca: 'item/apple.png', cenoura: 'item/carrot.png', pao: 'item/bread.png', biscoito: 'item/cookie.png',
  sopa: 'item/mushroom_stew.png', peixe: 'item/cooked_cod.png', carne: 'item/cooked_beef.png', bolo: 'item/cake.png',
  agua: 'item/potion.png', suco: 'item/honey_bottle.png', leite: 'item/milk_bucket.png', salada: 'item/beetroot_soup.png',
  sanduiche: 'item/baked_potato.png', sorvete: 'item/snowball.png', hamburguer: 'item/cooked_porkchop.png',
  pizza: 'item/pumpkin_pie.png', espada: 'item/iron_sword.png', bola: 'item/slime_ball.png', bola_queimada: 'item/fire_charge.png',
  bola_volei: 'item/snowball.png', bola_basquete: 'item/magma_cream.png', remedio: 'item/glass_bottle.png',
};
const RP_FURN = {
  food: 'block/barrel_side.png', estante: 'block/bookshelf.png', alvo: 'block/target_side.png',
  almofada: 'block/white_wool.png', globo: 'block/sea_lantern.png', holofote: 'block/redstone_lamp_on.png',
};
const RP_SOUNDS = {
  bonk: ['damage/hit1', 'damage/hit2', 'damage/hit3'], hit: ['damage/hit1', 'damage/hit2'], explode: ['random/explode1', 'random/explode2', 'random/explode3', 'random/explode4'],
  jump: ['step/cloth1', 'step/cloth2', 'step/cloth3'], footstep: ['step/grass1', 'step/grass2', 'step/grass3', 'step/grass4'],
  landing: ['damage/fallsmall'], blastoff: ['random/bow'], teleport: ['mob/endermen/portal'], blip: ['random/click'],
  ok: ['random/orb'], cancel: ['random/break'],
};
export const RP_PARTS = [
  ['janelas', 'Janelas (tema)'], ['itens', 'Itens e comidas'], ['sons', 'Sons'], ['musicas', 'Músicas'], ['mobilia', 'Mobília e bolsas'],
];

// Pure chroma key for imported object art. `edgeOnly` flood-fills from the borders so interior
// pixels of the same colour (machine outlines, dark screens) are preserved.
export function applyChromaKey(canvas, { color = 'auto', tol = 24, edgeOnly = true } = {}) {
  const g = canvas?.getContext?.('2d');
  if (!g || !canvas.width || !canvas.height) return canvas;
  const w = canvas.width;
  const h = canvas.height;
  const image = g.getImageData(0, 0, w, h);
  const p = image.data;
  const at = (x, y) => (y * w + x) * 4;
  let hex = color;
  if (color === 'auto') {
    const corners = [[0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1]];
    let r = 0; let gg = 0; let b = 0; let n = 0;
    for (const [x, y] of corners) {
      const i = at(x, y);
      if (p[i + 3] < 8) continue;
      r += p[i]; gg += p[i + 1]; b += p[i + 2]; n++;
    }
    if (!n) return canvas;
    const toHex = (v) => Math.round(v / n).toString(16).padStart(2, '0');
    hex = `#${toHex(r)}${toHex(gg)}${toHex(b)}`;
  }
  const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex);
  if (!m) return canvas;
  const tr = parseInt(m[1], 16);
  const tg = parseInt(m[2], 16);
  const tb = parseInt(m[3], 16);
  const limit = Math.max(0, Math.min(100, Number(tol) || 0));
  const hit = (i) => p[i + 3] > 8 && Math.max(Math.abs(p[i] - tr), Math.abs(p[i + 1] - tg), Math.abs(p[i + 2] - tb)) <= limit;
  if (edgeOnly) {
    const seen = new Uint8Array(w * h);
    const stack = [];
    const push = (x, y) => {
      if (x < 0 || y < 0 || x >= w || y >= h) return;
      const idx = y * w + x;
      if (seen[idx]) return;
      seen[idx] = 1;
      if (!hit(idx * 4)) return;
      stack.push(idx);
    };
    for (let x = 0; x < w; x++) { push(x, 0); push(x, h - 1); }
    for (let y = 0; y < h; y++) { push(0, y); push(w - 1, y); }
    while (stack.length) {
      const idx = stack.pop();
      const x = idx % w;
      const y = (idx / w) | 0;
      p[idx * 4 + 3] = 0;
      push(x - 1, y); push(x + 1, y); push(x, y - 1); push(x, y + 1);
    }
  } else {
    for (let i = 0; i < p.length; i += 4) if (hit(i)) p[i + 3] = 0;
  }
  g.putImageData(image, 0, 0);
  return canvas;
}

const loadImg = (src) => new Promise((ok, fail) => {
  const i = new Image();
  i.onload = () => ok(i);
  i.onerror = fail;
  i.src = src;
});
const canvas = (w, h) => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  return [c, g];
};
const hex = (d) => `#${[d[0], d[1], d[2]].map((v) => v.toString(16).padStart(2, '0')).join('')}`;

// A skin can be a legacy single-file object, an explicit idle set, or dual-state.
const hasSkinFrames = (o) => !!(o?.frames?.length || o?.idle?.frames?.length || o?.active?.frames?.length);

// Chest front from entity/chest/normal.png (lid, latch, base).
async function chestFront(src) {
  const img = await loadImg(src);
  const k = img.width / 64;
  const [c, g] = canvas(14 * k, 15 * k);
  g.drawImage(img, 14 * k, 14 * k, 14 * k, 5 * k, 0, 0, 14 * k, 5 * k);
  g.drawImage(img, 14 * k, 33 * k, 14 * k, 10 * k, 0, 5 * k, 14 * k, 10 * k);
  g.drawImage(img, 1 * k, 1 * k, 2 * k, 4 * k, 6 * k, 3 * k, 2 * k, 4 * k);
  return c.toDataURL('image/png');
}

// Side view of a bed: wool mattress over planks with two legs.
async function bedArt(wool, planks) {
  const [w, p] = await Promise.all([loadImg(wool), planks ? loadImg(planks) : null]);
  const [c, g] = canvas(68, 36);
  g.drawImage(w, 0, 0, w.width, w.height / 2, 0, 6, 68, 12);
  g.drawImage(w, 0, 0, w.width, w.height / 3, 2, 0, 18, 8);
  if (p) {
    g.drawImage(p, 0, 0, p.width, p.height / 2, 0, 18, 68, 10);
    g.drawImage(p, 0, 0, 4, p.height, 2, 28, 6, 8);
    g.drawImage(p, 0, 0, 4, p.height, 60, 28, 6, 8);
  }
  return c.toDataURL('image/png');
}

// ---- GIF decoder (own LZW parser) -------------------------------------------------
// ImageDecoder in WebView2 can report a wrong frameCount or stop decoding halfway through
// a GIF, so GIFs go through this deterministic parser instead. It honours per-frame delays,
// transparency, local colour tables, interlacing and the three disposal methods.
function gifBytes(dataUrl) {
  const b64 = String(dataUrl).split(',')[1] || '';
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function lzwDecode(minCodeSize, data, expected) {
  const clear = 1 << minCodeSize;
  const end = clear + 1;
  let dict = [];
  let codeSize = minCodeSize + 1;
  let next = end + 1;
  const reset = () => {
    dict = new Array(4096);
    for (let i = 0; i < clear; i++) dict[i] = [i];
    dict[clear] = null;
    dict[end] = null;
    next = end + 1;
    codeSize = minCodeSize + 1;
  };
  reset();
  let bit = 0;
  const read = () => {
    if (bit + codeSize > data.length * 8) return undefined;
    let v = 0;
    for (let i = 0; i < codeSize; i++) {
      const byte = data[(bit + i) >> 3];
      v |= ((byte >> ((bit + i) & 7)) & 1) << i;
    }
    bit += codeSize;
    return v;
  };
  const out = [];
  let prev = null;
  for (;;) {
    const code = read();
    if (code === undefined) break;
    if (code === clear) { reset(); prev = null; continue; }
    if (code === end) break;
    let entry;
    if (code < next && dict[code]) entry = dict[code];
    else if (code === next && prev) entry = prev.concat(prev[0]);
    else break;
    for (const v of entry) out.push(v);
    if (prev && next < 4096) {
      dict[next++] = prev.concat(entry[0]);
      if (next === (1 << codeSize) && codeSize < 12) codeSize++;
    }
    prev = entry;
    if (out.length >= expected) break;
  }
  return out;
}

function decodeGif(dataUrl, max = 160) {
  const b = gifBytes(dataUrl);
  if (b.length < 14 || String.fromCharCode(b[0], b[1], b[2]) !== 'GIF') return null;
  let p = 6;
  const w = b[p] | (b[p + 1] << 8); p += 2;
  const h = b[p] | (b[p + 1] << 8); p += 2;
  const packed = b[p++]; p += 2; // background + aspect
  const gctSize = (packed & 0x80) ? 3 * (2 << (packed & 7)) : 0;
  const gct = b.slice(p, p + gctSize); p += gctSize;
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const frames = [];
  const delays = [];
  let gce = { disposal: 0, delay: 100, transparent: -1 };
  let before = null;
  let prevRect = null;
  let prevDisposal = 0;
  while (p < b.length) {
    const block = b[p++];
    if (block === 0x3B) break;
    if (block === 0x21) {
      const label = b[p++];
      const subs = [];
      while (p < b.length) { const n = b[p++]; if (!n) break; subs.push(b.slice(p, p + n)); p += n; }
      if (label === 0xF9 && subs[0]?.length >= 4) {
        const s = subs[0];
        gce = {
          disposal: (s[0] >> 2) & 7,
          delay: Math.max(20, ((s[1] | (s[2] << 8)) || 10) * 10),
          transparent: (s[0] & 1) ? s[3] : -1,
        };
      }
      continue;
    }
    if (block !== 0x2C) continue;
    const left = b[p] | (b[p + 1] << 8); p += 2;
    const top = b[p] | (b[p + 1] << 8); p += 2;
    const iw = b[p] | (b[p + 1] << 8); p += 2;
    const ih = b[p] | (b[p + 1] << 8); p += 2;
    const ip = b[p++];
    const lctSize = (ip & 0x80) ? 3 * (2 << (ip & 7)) : 0;
    const palette = lctSize ? b.slice(p, p + lctSize) : gct; p += lctSize;
    const minCode = b[p++];
    const chunks = [];
    while (p < b.length) { const n = b[p++]; if (!n) break; chunks.push(b.slice(p, p + n)); p += n; }
    const size = chunks.reduce((a, c) => a + c.length, 0);
    const packedData = new Uint8Array(size);
    let o = 0;
    for (const c of chunks) { packedData.set(c, o); o += c.length; }
    const pixels = lzwDecode(minCode, packedData, iw * ih);

    // A disposal applies to the PREVIOUS frame's rectangle, never to this one.
    if (prevDisposal === 2 && prevRect) ctx.clearRect(prevRect.left, prevRect.top, prevRect.w, prevRect.h);
    else if (prevDisposal === 3 && before) ctx.putImageData(before, 0, 0);
    before = ctx.getImageData(0, 0, w, h);
    prevRect = { left, top, w: iw, h: ih };
    prevDisposal = gce.disposal;

    const rows = [];
    if (ip & 0x40) {
      for (const start of [0, 4, 2, 1]) {
        const step = start === 0 || start === 4 ? 8 : start === 2 ? 4 : 2;
        for (let y = start; y < ih; y += step) rows.push(y);
      }
    } else {
      for (let y = 0; y < ih; y++) rows.push(y);
    }
    const tmp = document.createElement('canvas');
    tmp.width = iw; tmp.height = ih;
    const tctx = tmp.getContext('2d');
    tctx.imageSmoothingEnabled = false;
    const img = tctx.createImageData(iw, ih);
    for (let i = 0; i < pixels.length && i < iw * ih; i++) {
      const idx = pixels[i];
      if (idx === gce.transparent) continue;
      const row = rows[(i / iw) | 0];
      if (row === undefined) continue;
      const q = (row * iw + (i % iw)) * 4;
      const c = idx * 3;
      img.data[q] = palette[c] || 0;
      img.data[q + 1] = palette[c + 1] || 0;
      img.data[q + 2] = palette[c + 2] || 0;
      img.data[q + 3] = 255;
    }
    // drawImage composites with alpha: transparent pixels keep the previous frame intact.
    tctx.putImageData(img, 0, 0);
    ctx.drawImage(tmp, left, top);

    const s = Math.min(1, max / Math.max(w, h));
    if (s < 1) {
      const [small, sg] = canvas(Math.max(1, Math.round(w * s)), Math.max(1, Math.round(h * s)));
      sg.drawImage(cv, 0, 0, small.width, small.height);
      frames.push(small.toDataURL('image/png'));
    } else frames.push(cv.toDataURL('image/png'));
    delays.push(gce.delay);
  }
  return frames.length ? { frames, delays } : null;
}

// Animated GIF / APNG -> frames with their real per-frame delays.
export async function decodeAnimated(dataUrl, max = 160) {
  // decodeGif checks the magic bytes itself and returns null for non-GIF data.
  const parsed = decodeGif(dataUrl, max);
  if (parsed) return parsed;
  const blob = await (await fetch(dataUrl)).blob();
  if (!('ImageDecoder' in window)) return { frames: [dataUrl], delays: [100] };
  let dec;
  try {
    dec = new ImageDecoder({ data: blob.stream(), type: blob.type || 'image/gif' });
    await dec.tracks.ready;
    const total = dec.tracks.selectedTrack?.frameCount || 1;
    const n = Math.min(total, 120);
    const frames = [];
    const delays = [];
    for (let i = 0; i < n; i++) {
      const { image } = await dec.decode({ frameIndex: i });
      const w = image.displayWidth || image.codedWidth || 1;
      const h = image.displayHeight || image.codedHeight || 1;
      const s = Math.min(1, max / Math.max(w, h));
      const [c, g] = canvas(Math.max(1, Math.round(w * s)), Math.max(1, Math.round(h * s)));
      g.clearRect(0, 0, c.width, c.height);
      g.drawImage(image, 0, 0, c.width, c.height);
      frames.push(c.toDataURL('image/png'));
      const us = Number(image.duration) || 0;
      delays.push(Math.max(20, Math.min(5000, us > 0 ? Math.round(us / 1000) : 100)));
      image.close();
    }
    return frames.length ? { frames, delays } : { frames: [dataUrl], delays: [100] };
  } catch {
    return { frames: [dataUrl], delays: [100] };
  } finally {
    try { dec?.close?.(); } catch {}
  }
}

// .gltf keeps the mesh and textures in sibling files. Pack them into one GLB so the
// loader never fetches those files (a missing .bin surfaces as "Invalid typed array length").
function beside(file, uri) {
  const rel = decodeURIComponent(uri.split(/[?#]/)[0]);
  const sep = file.includes('\\') ? '\\' : '/';
  return file.replace(/[/\\][^/\\]*$/, '') + sep + rel.replace(/[\\/]/g, sep);
}

function bytesToDataUrl(bytes, mime) {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return `data:${mime};base64,${btoa(bin)}`;
}

function glbBytes(json, bin) {
  const jsonBytes = new TextEncoder().encode(JSON.stringify(json));
  const jsonPad = (4 - (jsonBytes.length % 4)) % 4;
  const binPad = (4 - (bin.length % 4)) % 4;
  const total = 12 + 8 + jsonBytes.length + jsonPad + 8 + bin.length + binPad;
  const out = new Uint8Array(total);
  const view = new DataView(out.buffer);
  view.setUint32(0, 0x46546C67, true);
  view.setUint32(4, 2, true);
  view.setUint32(8, total, true);
  let o = 12;
  view.setUint32(o, jsonBytes.length + jsonPad, true);
  view.setUint32(o + 4, 0x4E4F534A, true);
  out.set(jsonBytes, o + 8);
  out.fill(0x20, o + 8 + jsonBytes.length, o + 8 + jsonBytes.length + jsonPad);
  o += 8 + jsonBytes.length + jsonPad;
  view.setUint32(o, bin.length + binPad, true);
  view.setUint32(o + 4, 0x004E4942, true);
  out.set(bin, o + 8);
  return out;
}

async function uriBytes(file, uri) {
  if (/^data:/i.test(uri)) return new Uint8Array(await (await fetch(uri)).arrayBuffer());
  try {
    const data = await window.petAPI.readFileData(beside(file, uri));
    return new Uint8Array(await (await fetch(data)).arrayBuffer());
  } catch {
    throw new Error(`Não achei "${uri}" na pasta do modelo.`);
  }
}

export async function readModel(path) {
  const data = await window.petAPI.readFileData(path);
  if (!/\.gltf$/i.test(path)) return data;
  const json = JSON.parse(new TextDecoder().decode(await (await fetch(data)).arrayBuffer()));
  const buffers = json.buffers || [];
  const external = [...buffers.map((b) => b.uri), ...(json.images || []).map((im) => im.uri)].filter((u) => u && !/^(data:|https?:|blob:)/i.test(u));
  if (!external.length) return data;
  if (buffers.length !== 1 || !buffers[0].uri) throw new Error('Este .gltf não traz a malha num único arquivo ao lado.');
  let bin = await uriBytes(path, buffers[0].uri);
  delete buffers[0].uri;
  const views = json.bufferViews || (json.bufferViews = []);
  for (const im of json.images || []) {
    if (!im.uri || /^(data:|https?:|blob:)/i.test(im.uri)) continue;
    const bytes = await uriBytes(path, im.uri);
    const pad = (4 - (bin.length % 4)) % 4;
    const next = new Uint8Array(bin.length + pad + bytes.length);
    next.set(bin);
    next.set(bytes, bin.length + pad);
    views.push({ buffer: 0, byteOffset: bin.length + pad, byteLength: bytes.length });
    im.bufferView = views.length - 1;
    if (!im.mimeType) im.mimeType = /\.jpe?g$/i.test(im.uri) ? 'image/jpeg' : 'image/png';
    delete im.uri;
    bin = next;
  }
  buffers[0].byteLength = bin.length;
  return bytesToDataUrl(glbBytes(json, bin), 'model/gltf-binary');
}

// 3D model (.glb/.gltf/.vrm data URL, or an already built three.js object such as a posed YSM)
// rendered to images: one at the chosen rotation, or a spinning loop.
export async function render3d(source, { rot = 0, tilt = 0, spin = false, size = 160, count = 24 } = {}) {
  const THREE = await import('./vendor/three.module.js');
  let model = source;
  if (typeof source === 'string') {
    const { GLTFLoader } = await import('./vendor/addons/loaders/GLTFLoader.js');
    const buf = await (await fetch(source)).arrayBuffer();
    model = (await new GLTFLoader().parseAsync(buf, '')).scene;
  }
  const scene = new THREE.Scene();
  scene.add(new THREE.AmbientLight(0xffffff, 1.6));
  const sun = new THREE.DirectionalLight(0xffffff, 2);
  sun.position.set(1, 2, 3);
  scene.add(sun);
  const root = new THREE.Group();
  const holder = new THREE.Group();
  holder.add(model);
  root.add(holder);
  scene.add(root);
  const box = new THREE.Box3().setFromObject(holder);
  const dim = box.getSize(new THREE.Vector3());
  const ctr = box.getCenter(new THREE.Vector3());
  holder.position.copy(ctr).negate();
  const r = Math.max(dim.x, dim.y, dim.z) * 0.6 || 1;
  const cam = new THREE.OrthographicCamera(-r, r, r, -r, 0.01, r * 20);
  cam.position.set(0, 0, r * 6);
  const cv = document.createElement('canvas');
  const ren = new THREE.WebGLRenderer({ canvas: cv, alpha: true, antialias: true, preserveDrawingBuffer: true });
  ren.setSize(size, size, false);
  ren.setClearColor(0x000000, 0);
  const frames = [];
  const n = spin ? count : 1;
  for (let i = 0; i < n; i++) {
    root.rotation.set(tilt * Math.PI / 180, (rot * Math.PI) / 180 + (spin ? (i / n) * Math.PI * 2 : 0), 0);
    ren.render(scene, cam);
    frames.push(cv.toDataURL('image/png'));
  }
  ren.dispose();
  ren.forceContextLoss?.();
  return { frames, delays: frames.map(() => 80), ratio: 1 };
}

export class Skins {
  constructor(app) {
    this.app = app;
    this.objects = {};
    this.objectsUpgrade = {};
    this.rp = null;
    this.music = null;
    // Per-object animation clocks: entering "used" restarts at frame 0 and the used
    // art is held for at least one full cycle before falling back to idle.
    this._artState = new Map();
    this._artAt = new Map();
    this._artHold = new Map();
    this.version = 0;
    this.error = '';
    globalThis.petSkins = this;
  }

  // Invalidates decoded-frame clocks and the DOM <img> cache so a saved skin shows instantly.
  bump() {
    this.version = (this.version || 0) + 1;
    this._artState.clear();
    this._artAt.clear();
    this._artHold.clear();
    for (const el of this.app.toys?.els?.values() || []) {
      const img = el.querySelector?.('img:not(.mark)');
      if (img) img.removeAttribute('src');
    }
  }

  async load() {
    const api = window.petAPI;
    // Old builds may have left skin maps in localStorage: migrate them once.
    const migrate = (key) => {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        const value = JSON.parse(raw);
        localStorage.removeItem(key);
        return value && typeof value === 'object' ? value : null;
      } catch (e) {
        console.error('[skins] falha ao migrar skin antiga', key, e);
        return null;
      }
    };
    try {
      this.objects = (await api?.loadBlob?.('objects')) || migrate('objects') || migrate('skins') || {};
      this.objectsUpgrade = (await api?.loadBlob?.('objectsUpgrade')) || migrate('objectsUpgrade') || {};
    } catch (e) {
      this.error = translate(`Não foi possível carregar as aparências salvas: ${e?.message || e}`);
      console.error('[skins] load', e);
    }
    this.rp = null;
    if (this.app.config?.theme === 'resourcepack') this.app.setOption?.('theme', 'padrao');
    this.applyRp();
  }

  // Current image of an object (animated objects cycle through their frames).
  // `active` asks for the "working" art of dual-state machines; live edits take priority.
  art(id, fallback, active = false, upgraded = false) {
    const live = this.app.toys?.live?.(id, upgraded);
    const store = upgraded ? this.objectsUpgrade : this.objects;
    const o = hasSkinFrames(live) ? live : store[id];
    const key = `${id}:${upgraded ? 'up' : 'base'}`;
    const now = performance.now();
    // New format keeps both states explicitly; old single-file skins use `frames`.
    const idle = o?.idle?.frames?.length ? o.idle : o;
    const used = (o?.mode === 'dual' || o?.active?.frames?.length) && o?.active?.frames?.length ? o.active : null;
    const speedOf = (set) => set?.speed || o?.speed || 1;
    const totalOf = (set) => {
      if (!set?.frames?.length) return 0;
      const delays = set.delays?.length ? set.delays : new Array(set.frames.length).fill(100);
      return delays.reduce((a, b) => a + (b || 100), 0) / speedOf(set);
    };
    // Keep the "used" art alive for at least one complete loop, even if the interaction
    // flag already cleared (short machine timers used to cut the spin at frame 3).
    const hold = this._artHold.get(key);
    if (!active && used && hold && now < hold.until) active = true;
    if (active && used && (!hold || now >= hold.until)) {
      this._artHold.set(key, { until: now + Math.max(1, totalOf(used)) });
    } else if (!active && hold && now >= hold.until) {
      this._artHold.delete(key);
    }
    const wasActive = this._artState.get(key) || false;
    if (active !== wasActive) {
      this._artState.set(key, active);
      this._artAt.set(key, now); // restart at frame 0 whenever the state changes
    }
    const start = this._artAt.get(key) || 0;
    const frameOf = (set, frozen = false) => {
      if (!set?.frames?.length) return null;
      if (frozen || set.frames.length === 1) return set.frames[0];
      const delays = set.delays?.length ? set.delays : new Array(set.frames.length).fill(100);
      const speed = speedOf(set);
      const total = delays.reduce((a, b) => a + b, 0) / speed;
      let t = total > 0 ? (now - start) % total : 0;
      for (let i = 0; i < set.frames.length; i++) {
        t -= (delays[i] || 100) / speed;
        if (t < 0) return set.frames[i];
      }
      return set.frames[0];
    };
    if (active && used) {
      const a = frameOf(used);
      if (a) return a;
    }
    if (idle?.frames?.length) {
      if (!active && o.mode === 'firstFrame') return frameOf(idle, true);
      return frameOf(idle);
    }
    const rp = this.rp;
    if (rp?.tex?.[id] && ((rp.parts.mobilia && rp.furn?.includes(id)) || (rp.parts.itens && !rp.furn?.includes(id)))) return rp.tex[id];
    return fallback;
  }

  has(id, upgraded = false) {
    const store = upgraded ? this.objectsUpgrade : this.objects;
    return hasSkinFrames(store[id]) || !!this.rp?.tex?.[id];
  }

  // Height / width of a custom image (null = use the default proportions).
  ratio(id, upgraded = false) {
    const live = this.app.toys?.live?.(id, upgraded);
    if (live?.ratio) return live.ratio;
    const store = upgraded ? this.objectsUpgrade : this.objects;
    const o = store[id];
    if (o?.ratio) return o.ratio;
    if (!o && !upgraded && this.rp?.tex?.[id] && this.rp.ratio?.[id]) return this.rp.ratio[id];
    return null;
  }

  region(id, upgraded = false) {
    return (upgraded ? this.objectsUpgrade : this.objects)[id]?.region || null;
  }

  // The hitbox of a custom image: the part that really answers the click (null = all of it).
  hitbox(id, upgraded = false) {
    return (upgraded ? this.objectsUpgrade : this.objects)[id]?.hitbox || null;
  }

  // The size of a custom image (1 = the same size as the default art).
  scale(id, upgraded = false) {
    const live = this.app.toys?.live?.(id, upgraded);
    if (live?.scale != null) return live.scale;
    return (upgraded ? this.objectsUpgrade : this.objects)[id]?.scale || 1;
  }

  async setObject(id, data, upgraded = false) {
    const store = upgraded ? this.objectsUpgrade : this.objects;
    if (data) store[id] = data;
    else delete store[id];
    try {
      // Skins live in data/*.json via Tauri (no localStorage 5 MB quota).
      await window.petAPI.storeBlob(upgraded ? 'objectsUpgrade' : 'objects', store);
      this.error = '';
    } catch (e) {
      this.error = translate(`Não foi possível salvar a aparência: ${e?.message || e}`);
      console.error('[skins] store', e);
    }
    this.bump();
    this.app.uiChanged?.();
  }

  // ---------- resourcepack ----------

  // Names in the zip plus a few textures for the preview.
  async scan(path) {
    const head = await window.petAPI.readZip(path, ['pack.png', `${TEX}gui/widgets.png`, `${TEX}gui/container/inventory.png`,
      `${TEX}block/barrel_side.png`, `${TEX}entity/chest/normal.png`, `${TEX}item/apple.png`, `${TEX}block/bookshelf.png`], 10);
    const names = head.names || [];
    const has = {
      janelas: names.some((n) => n.startsWith(`${TEX}gui/`)),
      itens: names.some((n) => n.startsWith(`${TEX}item/`)),
      sons: names.some((n) => n.startsWith(SND) && !n.startsWith(`${SND}music/`) && !n.startsWith(`${SND}records/`)),
      musicas: names.some((n) => n.startsWith(`${SND}music/`) || n.startsWith(`${SND}records/`)),
      mobilia: names.some((n) => n.startsWith(`${TEX}block/`) || n.startsWith(`${TEX}entity/chest/`)),
    };
    return { names, files: head.files || {}, has };
  }

  async importPack(path, parts, scan) {
    const want = new Set();
    const tex = (p) => want.add(TEX + p);
    if (parts.itens) Object.values(RP_ITEMS).forEach(tex);
    if (parts.mobilia) {
      Object.values(RP_FURN).forEach(tex);
      ['entity/chest/normal.png', 'block/red_wool.png', 'block/oak_planks.png'].forEach(tex);
    }
    if (parts.janelas) ['gui/widgets.png', 'gui/container/inventory.png'].forEach(tex);
    if (parts.sons) Object.values(RP_SOUNDS).flat().forEach((s) => want.add(`${SND}${s}.ogg`));
    const music = parts.musicas ? scan.names.filter((n) => /\.ogg$/.test(n) && (n.startsWith(`${SND}music/`) || n.startsWith(`${SND}records/`))).slice(0, 12) : [];
    music.forEach((n) => want.add(n));
    const { files } = await window.petAPI.readZip(path, [...want], want.size + 4);
    const get = (p) => files[TEX + p];
    const rp = { parts, tex: {}, ratio: {}, furn: [], sounds: {}, music: [], gui: null, name: path.split(/[\\/]/).pop() };
    if (parts.itens) for (const [id, p] of Object.entries(RP_ITEMS)) if (get(p)) rp.tex[id] = get(p);
    if (parts.mobilia) {
      for (const [id, p] of Object.entries(RP_FURN)) if (get(p)) { rp.tex[id] = get(p); rp.furn.push(id); }
      if (get('entity/chest/normal.png')) { rp.tex.bag = await chestFront(get('entity/chest/normal.png')); rp.ratio.bag = 15 / 14; rp.furn.push('bag'); }
      if (get('block/red_wool.png')) { rp.tex.cama = await bedArt(get('block/red_wool.png'), get('block/oak_planks.png')); rp.ratio.cama = 36 / 68; rp.furn.push('cama'); }
      for (const id of ['food', 'estante', 'alvo', 'globo', 'holofote']) if (rp.tex[id]) rp.ratio[id] = 1;
      if (rp.tex.almofada) rp.ratio.almofada = 0.45;
    }
    if (parts.janelas) rp.gui = await this.guiFrom(get('gui/inventory.png') || get('gui/container/inventory.png'), get('gui/widgets.png'));
    if (parts.sons) for (const [k, list] of Object.entries(RP_SOUNDS)) {
      const found = list.map((s) => files[`${SND}${s}.ogg`]).filter(Boolean);
      if (found.length) rp.sounds[k] = found;
    }
    rp.music = music.map((n) => files[n]).filter(Boolean);
    this.rp = rp;
    try { await window.petAPI.storeBlob('resourcepack', rp); }
    catch (e) { this.error = translate(`Falha ao salvar o resourcepack: ${e?.message || e}`); console.error('[skins] pack', e); }
    if (parts.janelas && rp.gui) this.app.setOption?.('theme', 'resourcepack');
    this.applyRp();
    return rp;
  }

  async clearPack() {
    this.rp = null;
    this.stopMusic();
    try { await window.petAPI.storeBlob('resourcepack', null); }
    catch (e) { this.error = translate(`Falha ao remover o resourcepack: ${e?.message || e}`); console.error('[skins] pack', e); }
    if (this.app.config.theme === 'resourcepack') this.app.setOption?.('theme', 'padrao');
    this.applyRp();
  }

  async guiFrom(inv, widgets) {
    if (!inv && !widgets) return null;
    const out = { bg: '#c6c6c6', light: '#ffffff', dark: '#555555', accent: '#3a6ea5', btn: null, btnHover: null };
    if (inv) {
      const img = await loadImg(inv);
      const k = img.width / 256;
      const [, g] = canvas(img.width, img.height);
      g.drawImage(img, 0, 0);
      const px = (x, y) => hex(g.getImageData(Math.floor(x * k), Math.floor(y * k), 1, 1).data);
      out.bg = px(10, 10);
      out.light = px(3, 3);
      out.dark = px(172, 162);
    }
    if (widgets) {
      const img = await loadImg(widgets);
      const k = img.width / 256;
      const crop = (y) => {
        const [c, g] = canvas(200 * k, 20 * k);
        g.drawImage(img, 0, y * k, 200 * k, 20 * k, 0, 0, 200 * k, 20 * k);
        return c.toDataURL('image/png');
      };
      out.btn = crop(66);
      out.btnHover = crop(86);
      const [, g] = canvas(img.width, img.height);
      g.drawImage(img, 0, 0);
      out.accent = hex(g.getImageData(Math.floor(100 * k), Math.floor(96 * k), 1, 1).data);
    }
    return out;
  }

  applyRp() {
    const rp = this.rp;
    const s = document.documentElement.style;
    const gui = rp?.parts?.janelas ? rp.gui : null;
    if (gui) {
      s.setProperty('--rp-bg', gui.bg);
      s.setProperty('--rp-light', gui.light);
      s.setProperty('--rp-dark', gui.dark);
      s.setProperty('--rp-accent', gui.accent);
      s.setProperty('--rp-btn', gui.btn ? `url("${gui.btn}")` : 'none');
      s.setProperty('--rp-btn-hover', gui.btnHover ? `url("${gui.btnHover}")` : 'none');
    }
    this.app.sound?.setPack?.(rp?.parts?.sons ? rp.sounds : null);
    this.app.toys?.refreshArt?.();
  }

  get hasMusic() {
    return !!this.rp?.parts?.musicas && !!this.rp.music?.length;
  }

  playMusic() {
    if (!this.hasMusic) return;
    this.stopMusic();
    const list = this.rp.music;
    const a = (this.music = new Audio(list[Math.floor(Math.random() * list.length)]));
    a.volume = Math.max(0, Math.min(1, (this.app.config.volume ?? 0.3) * 0.8));
    a.onended = () => this.music === a && this.playMusic();
    a.play().catch(() => {});
  }

  stopMusic() {
    if (!this.music) return;
    this.music.onended = null;
    this.music.pause();
    this.music = null;
  }
}
