// Builds src/renderer/assets/fonts/PxEmoji.otf: a COLR/CPAL colour font whose glyphs are the 24x24 pixel icons of the emoji atlas
// ("Pixel Art Emojis" faces first, pixelated Twemoji for the rest).
// Needs opentype.js (npm i opentype.js --prefix %TEMP%\otf) and test/shots/emoji.html (dump of test/emoji-build.html).
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const opentype = createRequire(import.meta.url)(process.env.TEMP + '/otf/node_modules/opentype.js');
const h = readFileSync('test/shots/emoji.html', 'utf8');
const j = JSON.parse(h.match(/<pre id="__report">(.*?)<\/pre>/s)[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&'));
const raw = Buffer.from(j.raw, 'base64');
const N = j.n, W = j.cols * N, U = Math.floor(896 / N), ADV = N * U + 2 * U, TOP = 796;

const cpCell = new Map();
for (const [s, cell] of [...Object.entries(j.icons), ...Object.entries(j.sheet)]) {
  const cps = [...s].map((c) => c.codePointAt(0)).filter((c) => c !== 0xfe0f);
  if (cps.length === 1 && cps[0] >= 0xa0) cpCell.set(cps[0], cell);
}
const byCell = new Map();
for (const [cp, cell] of cpCell) {
  if (!byCell.has(cell)) byCell.set(cell, new Set());
  byCell.get(cell).add(cp);
}

const rect = (p, x, y, w) => {
  const x0 = U + x * U, x1 = x0 + w * U, y1 = TOP - y * U, y0 = y1 - U;
  p.moveTo(x0, y0); p.lineTo(x1, y0); p.lineTo(x1, y1); p.lineTo(x0, y1); p.close();
};
const glyphs = [new opentype.Glyph({ name: '.notdef', advanceWidth: ADV, path: new opentype.Path() })];
for (const [name, cp] of [['vs16', 0xfe0f], ['zwj', 0x200d], ['keycap', 0x20e3]]) glyphs.push(new opentype.Glyph({ name, unicode: cp, advanceWidth: 0, path: new opentype.Path() }));
const palette = new Map(), colors = [], base = [], layers = [];
for (const [cell, cps] of [...byCell].sort((a, b) => a[0] - b[0])) {
  const cx = (cell % j.cols) * N, cy = Math.floor(cell / j.cols) * N;
  const all = new opentype.Path(), runs = new Map();
  for (let y = 0; y < N; y++) {
    let x = 0;
    while (x < N) {
      const o = ((cy + y) * W + cx + x) * 4;
      if (!raw[o + 3]) { x++; continue; }
      const key = (raw[o] << 16) | (raw[o + 1] << 8) | raw[o + 2];
      let w = 1;
      while (x + w < N) {
        const q = ((cy + y) * W + cx + x + w) * 4;
        if (!raw[q + 3] || ((raw[q] << 16) | (raw[q + 1] << 8) | raw[q + 2]) !== key) break;
        w++;
      }
      if (!runs.has(key)) runs.set(key, new opentype.Path());
      rect(runs.get(key), x, y, w);
      rect(all, x, y, w);
      x += w;
    }
  }
  const id = glyphs.length;
  const [first, ...rest] = [...cps];
  const g = new opentype.Glyph({ name: 'u' + first.toString(16), unicode: first, advanceWidth: ADV, path: all });
  g.unicodes = [first, ...rest];
  glyphs.push(g);
  base.push({ glyphID: id, firstLayerIndex: layers.length, numLayers: runs.size });
  for (const [key, path] of runs) {
    if (!palette.has(key)) {
      palette.set(key, colors.length);
      colors.push((((key & 255) << 24) | (((key >> 8) & 255) << 16) | ((key >> 16) << 8) | 255) >>> 0);
    }
    layers.push({ glyphID: glyphs.length, paletteIndex: palette.get(key) });
    glyphs.push(new opentype.Glyph({ name: `l${glyphs.length}`, advanceWidth: ADV, path }));
  }
}
const font = new opentype.Font({ familyName: 'PxEmoji', styleName: 'Regular', unitsPerEm: 1024, ascender: 896, descender: -128, glyphs });
font.tables.cpal = { version: 0, numPaletteEntries: colors.length, colorRecords: colors, colorRecordIndices: [0] };
font.tables.colr = { version: 0, baseGlyphRecords: base, layerRecords: layers };
writeFileSync('src/renderer/assets/fonts/PxEmoji.otf', Buffer.from(font.toArrayBuffer()));
console.log(base.length, 'icons,', layers.length, 'layers,', colors.length, 'colours');
