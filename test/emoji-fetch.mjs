// Downloads the Twemoji SVG (CC-BY 4.0) of every symbol in test/emoji-list.json into test/emoji-svg.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';

const KEEP_TEXT = new Set(['a5', '2026', '2022']);
// Text symbols Twemoji doesn't draw: the closest emoji stands in.
const ALIAS = { 2192: '27a1', 2190: '2b05', 2191: '2b06', 2193: '2b07', 2194: '2194', '266a': '1f3b5', '266b': '1f3b6', '266c': '1f3b6',
  2713: '2714', 2715: '2716', 2717: '274c', 2718: '274c', 2605: '2b50', 2606: '2b50', 2726: '2728', 2727: '2728', 2661: '2764', '21c4': '1f501' };
const list = JSON.parse(readFileSync('test/emoji-list.json', 'utf8')).filter((e) => !KEEP_TEXT.has(e.cp));
const extra = [{ s: '!', cp: '2757' }, { s: '?', cp: '2753' }];
mkdirSync('test/emoji-svg', { recursive: true });
const out = [];
for (const e of [...list, ...extra]) {
  let cp = ALIAS[e.cp] || e.cp;
  if (!cp.includes('200d')) cp = cp.split('-').filter((c) => c !== 'fe0f').join('-');
  const file = `test/emoji-svg/${cp}.svg`;
  if (!existsSync(file)) {
    const r = await fetch(`https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.1.0/assets/svg/${cp}.svg`);
    if (!r.ok) {
      console.log('MISSING', e.s, cp, r.status);
      continue;
    }
    writeFileSync(file, await r.text());
  }
  out.push({ s: e.s, file: `${cp}.svg` });
}
writeFileSync('test/emoji-map.json', JSON.stringify(out));
console.log(out.length, 'ok');
