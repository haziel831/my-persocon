// Converte as animações GIF do "Angry slime" em folhas PNG (uma linha por animação).
// Uso: node scripts/gif-slime-sheet.mjs
import { readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, basename } from 'node:path';
import { readGif } from './gif.mjs';
import { writePng } from './png.mjs';

const SRC = 'D:/MyProjects/Apps/Assets/NEW/ItchIo G.Lerf 2.0 Slime Pack/ItchIo G.Lerf 2.0 Slime Pack/Animations gifs_OriginalSize/Angry slime';
const OUT = 'D:/MyProjects/Apps/My Persocon(OpenCode)/src/renderer/assets/enemies/unknown_slime';

mkdirSync(OUT, { recursive: true });

for (const file of readdirSync(SRC).filter((f) => f.toLowerCase().endsWith('.gif'))) {
  const gif = readGif(join(SRC, file));
  const name = basename(file, '.gif');
  // Recorta a area comum de todos os quadros (a pwa que o slime ocupa).
  let minX = gif.w, minY = gif.h, maxX = 0, maxY = 0;
  for (const f of gif.frames) {
    for (let y = 0; y < gif.h; y++) {
      for (let x = 0; x < gif.w; x++) {
        if (f.data[(y * gif.w + x) * 4 + 3] > 0) {
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }
  }
  if (maxX < minX) { minX = minY = 0; maxX = gif.w - 1; maxY = gif.h - 1; }
  const cw = maxX - minX + 1, ch = maxY - minY + 1;
  const n = gif.frames.length;
  const W = cw * n, H = ch;
  const data = Buffer.alloc(W * H * 4);
  gif.frames.forEach((f, i) => {
    for (let y = 0; y < ch; y++) {
      for (let x = 0; x < cw; x++) {
        const s = ((minY + y) * gif.w + (minX + x)) * 4;
        const d = (y * W + i * cw + x) * 4;
        data[d] = f.data[s]; data[d + 1] = f.data[s + 1]; data[d + 2] = f.data[s + 2]; data[d + 3] = f.data[s + 3];
      }
    }
  });
  writePng(join(OUT, `${name}.png`), { w: W, h: H, data });
  const delays = gif.frames.map((f) => f.delay);
  writeFileSync(join(OUT, `${name}.json`), JSON.stringify({ frames: n, cw, ch, delays }, null, 1));
  console.log(`${name}: ${n} quadros de ${cw}x${ch} (gif ${gif.w}x${gif.h}) delays ${delays.join(',')}`);
}
