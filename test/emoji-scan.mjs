// Lists every emoji / pictographic symbol used in src/renderer (for the pixel-art emoji atlas).
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = 'src/renderer';
const RX = /(?:\p{Extended_Pictographic}|\p{Regional_Indicator}|[#*0-9]\uFE0F?\u20E3)(?:\uFE0F|\p{Emoji_Modifier}|\u20E3|\u200D(?:\p{Extended_Pictographic})\uFE0F?|\p{Regional_Indicator})*|[♥♡♪♫♬✓✔✕✖✗✘★☆✦✧→←↑↓↔⇄•…¥]/gu;
const found = new Map();
for (const f of readdirSync(dir)) {
  if (!/\.(js|html|css)$/.test(f)) continue;
  const text = readFileSync(join(dir, f), 'utf8');
  for (const m of text.matchAll(RX)) {
    const s = m[0];
    const e = found.get(s) || { n: 0, files: new Set() };
    e.n++;
    e.files.add(f);
    found.set(s, e);
  }
}
const list = [...found].sort((a, b) => b[1].n - a[1].n).map(([s, e]) => ({ s, cp: [...s].map((c) => c.codePointAt(0).toString(16)).join('-'), n: e.n, files: [...e.files].join(',') }));
writeFileSync('test/emoji-list.json', JSON.stringify(list, null, 1));
console.log(list.length, 'distinct');
console.log(list.map((e) => `${e.s} ${e.cp} ${e.n}`).join('\n'));
