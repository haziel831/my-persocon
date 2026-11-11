// Decodificador GIF (LZW) mínimo: lê um GIF e devolve os quadros já compostos em RGBA.
// Usado para transformar as animações do slime em folhas PNG (scripts/gif-slime-sheet.mjs).
import { readFileSync } from 'node:fs';

// LZW: os índices do bloco de dados da imagem.
function lzw(buf, minCodeSize, maxOut) {
  const clear = 1 << minCodeSize;
  const end = clear + 1;
  let codeSize = minCodeSize + 1;
  let dict = [];
  const reset = () => {
    dict = [];
    for (let i = 0; i < clear; i++) dict[i] = [i];
    dict[clear] = [];
    dict[end] = [];
    codeSize = minCodeSize + 1;
  };
  reset();
  const out = [];
  let bitPos = 0;
  let prev = null;
  const readCode = () => {
    if ((bitPos + codeSize) > buf.length * 8) return -1;
    let code = 0;
    for (let i = 0; i < codeSize; i++) {
      const byte = buf[(bitPos >> 3)];
      const bit = (byte >> (bitPos & 7)) & 1;
      code |= bit << i;
      bitPos++;
    }
    return code;
  };
  for (;;) {
    const code = readCode();
    if (code < 0 || code === end) break;
    if (code === clear) { reset(); prev = null; continue; }
    let entry;
    if (code < dict.length && dict[code]?.length) entry = dict[code];
    else if (prev) entry = [...prev, prev[0]];
    else break;
    for (const v of entry) {
      out.push(v);
      if (out.length >= maxOut) return out;
    }
    if (prev && dict.length < 4096) {
      dict.push([...prev, entry[0]]);
      if (dict.length === (1 << codeSize) && codeSize < 12) codeSize++;
    }
    prev = entry;
  }
  return out;
}

// Lê um GIF e devolve { w, h, frames: [{ data: RGBA, delay }] } já compostas.
export function readGif(path) {
  const b = readFileSync(path);
  const sig = b.toString('ascii', 0, 6);
  if (!/^GIF8[79]a$/.test(sig)) throw new Error(`não é um GIF: ${path}`);
  const w = b.readUInt16LE(6), h = b.readUInt16LE(8);
  const flags = b[10];
  let pos = 13;
  let gct = null;
  if (flags & 0x80) {
    const n = 2 << (flags & 7);
    gct = b.subarray(pos, pos + n * 3);
    pos += n * 3;
  }
  const bg = flags & 0x10 ? gct : null;
  void bg;
  const frames = [];
  let gce = { delay: 0, transparent: -1, disposal: 0 };
  let canvas = Buffer.alloc(w * h * 4);   // o quadro composto (pra disposal)
  let pending = null;
  while (pos < b.length) {
    const block = b[pos];
    if (block === 0x3b) break;                       // trailer
    if (block === 0x21) {                            // extensão
      const label = b[pos + 1];
      pos += 2;
      if (label === 0xf9) {                          // graphic control
        const size = b[pos];
        const d = b.subarray(pos + 1, pos + 1 + size);
        gce = {
          disposal: (d[0] >> 2) & 7,
          transparent: (d[0] & 1) ? d[3] : -1,
          delay: d.readUInt16LE(1) * 10,             // centésimos de segundo -> ms
        };
        pos += size + 1;
      }
      while (b[pos] !== 0) pos += b[pos] + 1;        // pula os subblocos
      pos++;
      continue;
    }
    if (block === 0x2c) {                            // descritor de imagem
      const ix = b.readUInt16LE(pos + 1), iy = b.readUInt16LE(pos + 3);
      const iw = b.readUInt16LE(pos + 5), ih = b.readUInt16LE(pos + 7);
      const iflags = b[pos + 9];
      pos += 10;
      let lct = gct;
      if (iflags & 0x80) {
        const n = 2 << (iflags & 7);
        lct = b.subarray(pos, pos + n * 3);
        pos += n * 3;
      }
      const interlaced = !!(iflags & 0x40);
      const minCodeSize = b[pos];
      pos++;                                 // byte do tamanho mínimo do código LZW
      // junta os subblocos de dados
      const chunks = [];
      while (pos < b.length && b[pos] !== 0) {
        const len = b[pos];
        chunks.push(b.subarray(pos + 1, pos + 1 + len));
        pos += len + 1;
      }
      pos++;
      const data = Buffer.concat(chunks);
      const indices = lzw(data, minCodeSize, iw * ih);
      // monta o quadro (na ordem interlaçada -> normal)
      const pixels = Buffer.alloc(iw * ih);
      let k = 0;
      const rows = interlaced ? interlaceRows(ih) : [...Array(ih).keys()];
      for (const y of rows) {
        for (let x = 0; x < iw; x++) {
          pixels[y * iw + x] = indices[k++] ?? 0;
        }
      }
      // compõe no canvas (com o retângulo da imagem)
      const prev = Buffer.from(canvas);
      for (let y = 0; y < ih; y++) {
        for (let x = 0; x < iw; x++) {
          const idx = pixels[y * iw + x];
          if (idx === gce.transparent) continue;
          const cx = ix + x, cy = iy + y;
          if (cx >= w || cy >= h) continue;
          const o = (cy * w + cx) * 4;
          canvas[o] = lct[idx * 3];
          canvas[o + 1] = lct[idx * 3 + 1];
          canvas[o + 2] = lct[idx * 3 + 2];
          canvas[o + 3] = 255;
        }
      }
      pending = { data: Buffer.from(canvas), delay: gce.delay || 100, rect: [ix, iy, iw, ih] };
      // o descarte acontece depois que o quadro for mostrado
      frames.push(pending);
      pending = null;
      // disposal
      if (gce.disposal === 2) {
        for (let y = 0; y < ih; y++) {
          for (let x = 0; x < iw; x++) {
            const o = ((iy + y) * w + (ix + x)) * 4;
            if (ix + x < w && iy + y < h) { canvas[o] = 0; canvas[o + 1] = 0; canvas[o + 2] = 0; canvas[o + 3] = 0; }
          }
        }
      } else if (gce.disposal === 3) {
        canvas = prev;
      }
      gce = { delay: 0, transparent: -1, disposal: 0 };
      continue;
    }
    pos++;   // byte desconhecido
  }
  return { w, h, frames };
}

function interlaceRows(h) {
  const rows = [];
  for (const [start, step] of [[0, 8], [4, 8], [2, 4], [1, 2]]) {
    for (let y = start; y < h; y += step) rows.push(y);
  }
  return rows;
}
