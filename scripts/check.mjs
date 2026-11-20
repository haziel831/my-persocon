// Verificação rápida do projeto: sintaxe de todo o JS do renderer + `cargo check` do Rust.
// Uso: `npm run check` ou `node scripts/check.mjs`. Não gera build nenhum.
import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const RENDERER = join(ROOT, 'src', 'renderer');
const TAURI_DIR = join(ROOT, 'src-tauri');

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

const problems = [];
const firstLines = (text, max = 3) => String(text || '').trim().split(/\r?\n/).slice(0, max).join(' ');

// 1) Sintaxe de cada arquivo do renderer (vendor = bibliotecas de terceiros, não mexemos).
const files = listJs(RENDERER).sort();
for (const file of files) {
  const r = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (r.status !== 0) {
    problems.push(`${relative(ROOT, file)}: ${firstLines(r.stderr || r.stdout)}`);
  }
}

// 2) Rust.
const cargo = spawnSync('cargo', ['check', '--message-format', 'short'], { cwd: TAURI_DIR, encoding: 'utf8' });
if (cargo.error?.code === 'ENOENT') {
  console.warn('! cargo não encontrado no PATH — etapa Rust ignorada.');
} else if (cargo.status !== 0) {
  const errors = String(cargo.stderr || '')
    .split(/\r?\n/)
    .filter((l) => l.includes('error') || l.trim().startsWith('-->'))
    .slice(0, 6)
    .join(' | ');
  problems.push(`cargo check (src-tauri): ${errors || firstLines(cargo.stderr)}`);
}

// 3) Resumo.
if (problems.length) {
  console.error(`\n✘ ${problems.length} problema(s) encontrado(s):`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log(`✔ OK: ${files.length} arquivos JS sem erro de sintaxe${cargo.error ? '' : ' e cargo check limpo'}.`);
