// Lightweight offline sanity check for src/renderer/i18n.js.
// Warns about empty entries, conflicting duplicates and translate() keys that are not in EN.
// It never fails `npm run check` (translation gaps are warnings, not syntax errors).
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const I18N = join(ROOT, 'src', 'renderer', 'i18n.js');
const RENDERER = join(ROOT, 'src', 'renderer');

// Body of `const EN = { ... }`, found by balancing braces while ignoring strings/comments.
function objectBody(src, marker) {
  const at = src.indexOf(marker);
  if (at < 0) return null;
  let open = src.indexOf('{', at);
  if (open < 0) return null;
  let depth = 0;
  let quote = null;
  let esc = false;
  let line = false;
  let block = false;
  for (let i = open; i < src.length; i++) {
    const c = src[i];
    const n = src[i + 1];
    if (line) { if (c === '\n') line = false; continue; }
    if (block) { if (c === '*' && n === '/') { block = false; i++; } continue; }
    if (quote) {
      if (esc) { esc = false; continue; }
      if (c === '\\') { esc = true; continue; }
      if (c === quote) quote = null;
      continue;
    }
    if (c === '/' && n === '/') { line = true; i++; continue; }
    if (c === '/' && n === '*') { block = true; i++; continue; }
    if (c === "'" || c === '"' || c === '`') { quote = c; continue; }
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return src.slice(open + 1, i);
    }
  }
  return null;
}

const skipWs = (s, i) => {
  while (i < s.length) {
    if (/\s/.test(s[i])) { i++; continue; }
    if (s.startsWith('//', i)) { while (i < s.length && s[i] !== '\n') i++; continue; }
    if (s.startsWith('/*', i)) { const end = s.indexOf('*/', i + 2); i = end < 0 ? s.length : end + 2; continue; }
    break;
  }
  return i;
};

// Reads a single- or double-quoted JS string starting at i.
function readString(s, i) {
  i = skipWs(s, i);
  const q = s[i];
  if (q !== "'" && q !== '"') return null;
  let out = '';
  for (let j = i + 1; j < s.length; j++) {
    const c = s[j];
    if (c === '\\') {
      const n = s[j + 1] || '';
      out += n === 'n' ? '\n' : n === 't' ? '\t' : n;
      j++;
      continue;
    }
    if (c === q) return { value: out, end: j + 1 };
    out += c;
  }
  return null;
}

function parseEntries(body) {
  const out = [];
  let i = 0;
  while (i < body.length) {
    i = skipWs(body, i);
    if (i >= body.length) break;
    if (body[i] === ',') { i++; continue; }
    const key = readString(body, i);
    if (!key) { i++; continue; }
    i = skipWs(body, key.end);
    if (body[i] !== ':') { i++; continue; }
    const value = readString(body, i + 1);
    if (!value) { i++; continue; }
    out.push([key.value, value.value]);
    i = value.end;
  }
  return out;
}

const warn = [];
let entries = [];
let source = '';
try {
  source = readFileSync(I18N, 'utf8');
  const body = objectBody(source, 'const EN');
  if (body == null) {
    warn.push('i18n.js: dicionário EN não encontrado.');
  } else {
    entries = parseEntries(body);
    const byKey = new Map();
    const byValue = new Map();
    for (const [key, value] of entries) {
      if (!key.trim() || !value.trim()) warn.push(`entrada vazia: ${JSON.stringify(key)} → ${JSON.stringify(value)}`);
      if (byKey.has(key) && byKey.get(key) !== value) {
        warn.push(`chave duplicada com valores diferentes: ${JSON.stringify(key)}`);
      } else byKey.set(key, value);
      if (!byValue.has(value)) byValue.set(value, []);
      byValue.get(value).push(key);
    }
    // Short words ("All", "Remove") are legitimately reused; only long sentences reused by
    // different keys suggest a copy/paste mistake.
    for (const [value, keys] of byValue) {
      if (value.trim().length > 20 && new Set(keys).size > 1) {
        warn.push(`valor EN ${JSON.stringify(value)} usado por ${keys.length} chaves diferentes`);
      }
    }
  }
} catch (e) {
  warn.push(`i18n.js: não foi possível ler (${e?.message || e}).`);
}

// Strings literais passadas a translate() em todo o renderer.
const listJs = (dir) => {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'vendor' || entry.name === 'node_modules') continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listJs(full));
    else if (/\.m?js$/.test(entry.name)) out.push(full);
  }
  return out;
};

const known = new Set(entries.map(([key]) => key));
const missing = new Set();
const CALL = /\btranslate\(\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')\s*[,)]/g;
for (const file of listJs(RENDERER)) {
  const text = readFileSync(file, 'utf8');
  for (const m of text.matchAll(CALL)) {
    const raw = m[1];
    let text2;
    try { text2 = JSON.parse(raw.startsWith("'") ? `"${raw.slice(1, -1).replace(/"/g, '\\"')}"` : raw); }
    catch { continue; }
    if (!text2 || !/[a-z]/i.test(text2) || text2.includes('${')) continue;
    if (!known.has(text2)) missing.add(text2);
  }
}

if (warn.length || missing.size) {
  console.warn(`! i18n: ${warn.length} problema(s) no dicionário, ${missing.size} chave(s) de translate() sem tradução.`);
  for (const w of warn.slice(0, 20)) console.warn(`  - ${w}`);
  for (const k of [...missing].sort().slice(0, 25)) console.warn(`  - translate(${JSON.stringify(k)}) sem entrada em EN`);
  if (warn.length > 20 || missing.size > 25) console.warn('  - ... (saída resumida)');
} else {
  console.log(`✔ i18n: ${entries.length} entradas coerentes · nenhuma chave translate() faltando.`);
}
