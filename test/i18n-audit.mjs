// Lists Portuguese UI strings that translate() leaves (partly) untranslated: node test/i18n-audit.mjs
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { translate } from '../src/renderer/i18n.js';

const dir = join(import.meta.dirname, '../src/renderer');
const SKIP = new Set(['i18n.js', 'introtext.js', 'changelog.js', 'speech.js', 'tips.js', 'names.js', 'logger.js']);
const PT = /[ãõçáéíóúâêôà]|\b(de|da|do|das|dos|ela|dela|você|para|com|não|uma|nas|nos|na|ou|pela|pelo|vai|está|clique|seu|sua|vence|ponto|mais|sem|ainda|aqui|quando|depois|tem|ganhar|comprar|abrir|ligar)\b/i;

// Strings in a JS source: [text with ${...} as "7", line]. Skips comments and regex literals.
function strings(src) {
  const out = [];
  let i = 0;
  let prev = '';
  const line = (p) => src.slice(0, p).split('\n').length;
  const lexTo = (end) => {
    let depth = 0;
    while (i < src.length) {
      const c = src[i];
      if (c === '/' && src[i + 1] === '/') { i = src.indexOf('\n', i); if (i < 0) i = src.length; continue; }
      if (c === '/' && src[i + 1] === '*') { i = src.indexOf('*/', i + 2) + 2; continue; }
      if (c === "'" || c === '"') {
        const s = i++;
        let t = '';
        while (i < src.length && src[i] !== c) { if (src[i] === '\\') t += src[i++]; t += src[i++]; }
        i++;
        out.push([t, line(s)]);
        prev = 'x';
        continue;
      }
      if (c === '`') {
        const s = i++;
        let t = '';
        while (i < src.length && src[i] !== '`') {
          if (src[i] === '\\') { t += src[i] + src[i + 1]; i += 2; continue; }
          if (src[i] === '$' && src[i + 1] === '{') { i += 2; lexTo('}'); t += '7'; continue; }
          t += src[i++];
        }
        i++;
        out.push([t, line(s)]);
        prev = 'x';
        continue;
      }
      if (c === '/' && (prev === '' || /[(,=:[!&|?{};+\-*%<>~^]$/.test(prev) || /\b(return|typeof|case|in|of)$/.test(prev))) {
        i++;
        let cls = false;
        while (i < src.length && (src[i] !== '/' || cls)) { if (src[i] === '\\') i++; else if (src[i] === '[') cls = true; else if (src[i] === ']') cls = false; i++; }
        i++;
        while (/[a-z]/.test(src[i])) i++;
        prev = 'x';
        continue;
      }
      if (end && (c === '{')) depth++;
      if (end && c === '}') { if (!depth--) { i++; return; } }
      if (!/\s/.test(c)) prev = /[\w$]/.test(c) ? (/[\w$]/.test(prev.slice(-1)) ? prev + c : c) : c;
      i++;
    }
  };
  lexTo(null);
  return out;
}

const seen = new Set();
const lines = [];
for (const f of readdirSync(dir).filter((f) => f.endsWith('.js') && !SKIP.has(f))) {
  for (const [raw, ln] of strings(readFileSync(join(dir, f), 'utf8'))) {
    const s = raw.replace(/\\n/g, ' ').trim();
    if (s.length < 3 || !PT.test(s) || seen.has(s)) continue;
    seen.add(s);
    const out = translate(s);
    if (PT.test(out)) lines.push(`${f}:${ln}: ${s.slice(0, 100)}  =>  ${out.slice(0, 100)}`);
  }
}
writeFileSync(join(import.meta.dirname, 'i18n-audit.txt'), lines.join('\n'), 'utf8');
console.log(lines.length);
