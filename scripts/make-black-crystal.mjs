// Converte o cristal preto (fundo branco) num icone RGBA transparente e pequeno.
// Uso: node scripts/make-black-crystal.mjs
import { readPng, writePng } from './png.mjs';

const SRC = 'D:/MyProjects/Apps/Assets/black_crystal.png';
const OUT = 'D:/MyProjects/Apps/My Persocon(OpenCode)/src/renderer/assets/items/black_crystal.png';
const SIZE = 48;          // o icone do item
const WHITE = 232;        // acima disso é branco de fundo
const SOFT = 20;          // faixa de suavização da borda

const img = readPng(SRC);
console.log('origem', img.w, 'x', img.h);

// 1) tira o fundo branco (com borda suave) e desconta o branco da cor.
const px = Buffer.from(img.data);
let minX = img.w, minY = img.h, maxX = -1, maxY = -1;
for (let y = 0; y < img.h; y++) {
  for (let x = 0; x < img.w; x++) {
    const i = (y * img.w + x) * 4;
    const r = px[i], g = px[i + 1], b = px[i + 2];
    const lum = Math.min(r, g, b);
    let a = 255;
    if (lum > WHITE) a = 0;
    else if (lum > WHITE - SOFT) a = Math.round(255 * (WHITE - lum) / SOFT);
    if (a === 0) { px[i + 3] = 0; continue; }
    // desconta o branco misturado na borda (a cor real do cristal)
    const k = a / 255;
    px[i] = Math.max(0, Math.min(255, Math.round((r - 255 * (1 - k)) / k)));
    px[i + 1] = Math.max(0, Math.min(255, Math.round((g - 255 * (1 - k)) / k)));
    px[i + 2] = Math.max(0, Math.min(255, Math.round((b - 255 * (1 - k)) / k)));
    px[i + 3] = a;
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
}
const cw = maxX - minX + 1, ch = maxY - minY + 1;
console.log('conteudo', cw, 'x', ch, 'em', minX, minY);

// 2) reduz (nearest neighbor) para o tamanho do icone
const data = Buffer.alloc(SIZE * SIZE * 4);
for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    const sx = minX + Math.floor((x * cw) / SIZE);
    const sy = minY + Math.floor((y * ch) / SIZE);
    const s = (sy * img.w + sx) * 4;
    const d = (y * SIZE + x) * 4;
    data[d] = px[s]; data[d + 1] = px[s + 1]; data[d + 2] = px[s + 2]; data[d + 3] = px[s + 3];
  }
}
writePng(OUT, { w: SIZE, h: SIZE, data });
console.log('ok ->', OUT);
