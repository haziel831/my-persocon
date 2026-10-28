// Builds src/renderer/assets/logo.png from Assets/MiDLogoSlice.png: the white outside the gear becomes
// transparent (flood fill from the borders), then a box-filtered downscale to 256x256.
import { readPng, writePng } from './png.mjs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const src = readPng(join(root, 'Assets', 'MiDLogoSlice.png'));
const { w, h, data } = src;
const light = (i) => data[i * 4 + 3] > 0 && data[i * 4] + data[i * 4 + 1] + data[i * 4 + 2] > 600;
const outside = new Uint8Array(w * h);
const stack = [];
for (let x = 0; x < w; x++) stack.push(x, (h - 1) * w + x);
for (let y = 0; y < h; y++) stack.push(y * w, y * w + w - 1);
while (stack.length) {
  const i = stack.pop();
  if (outside[i] || (!light(i) && data[i * 4 + 3] > 0)) continue;
  outside[i] = 1;
  const x = i % w, y = (i / w) | 0;
  if (x > 0) stack.push(i - 1);
  if (x < w - 1) stack.push(i + 1);
  if (y > 0) stack.push(i - w);
  if (y < h - 1) stack.push(i + w);
}
for (let i = 0; i < w * h; i++) if (outside[i]) data[i * 4 + 3] = 0;

let bx0 = w, bx1 = 0, by0 = h, by1 = 0;
for (let i = 0; i < w * h; i++) if (data[i * 4 + 3]) {
  const x = i % w, y = (i / w) | 0;
  bx0 = Math.min(bx0, x); bx1 = Math.max(bx1, x); by0 = Math.min(by0, y); by1 = Math.max(by1, y);
}
const side = Math.max(bx1 - bx0, by1 - by0) + 8, cx = (bx0 + bx1) / 2 - side / 2, cy = (by0 + by1) / 2 - side / 2;
const S = 256, out = Buffer.alloc(S * S * 4);
for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
  const x0 = Math.floor(cx + (x * side) / S), x1 = Math.floor(cx + ((x + 1) * side) / S), y0 = Math.floor(cy + (y * side) / S), y1 = Math.floor(cy + ((y + 1) * side) / S);
  let r = 0, g = 0, b = 0, a = 0, n = 0;
  for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) {
    n++;
    if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
    const o = (yy * w + xx) * 4, al = data[o + 3];
    r += data[o] * al; g += data[o + 1] * al; b += data[o + 2] * al; a += al;
  }
  const o = (y * S + x) * 4;
  if (a) out.set([r / a, g / a, b / a, a / n], o);
}
writePng(join(root, 'src', 'renderer', 'assets', 'logo.png'), { w: S, h: S, data: out });
console.log('logo.png ok');
