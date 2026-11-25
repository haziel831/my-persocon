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
  const raw = String(cargo.stderr || '').replace(/\r/g, '');
  // Progress lines ("Downloaded ...", "Compiling ...") bury the compiler error. Print the
  // FULL log to the console (GitHub Actions keeps it), then summarise from the first error.
  console.error('\n--- cargo check: log completo ---\n' + raw + '\n--- fim do log ---\n');
  const lines = raw.split('\n').filter((l) => l.trim());
  const progress = /^(Downloading|Downloaded|Compiling|Checking|Finished|Updating|Locking|Adding|Blocking|warning:|note:|help:)/i;
  const meaningful = lines.filter((l) => !progress.test(l.trim()));
  const found = meaningful.findIndex((l) => /error(\[|:)|^-->/i.test(l.trim()));
  const detail = (found >= 0 ? meaningful.slice(found) : meaningful.slice(-80)).slice(-120).join('\n');
  problems.push(`cargo check (src-tauri):\n${detail || firstLines(raw, 20)}`);
}

// 3) Resumo.
if (problems.length) {
  console.error(`\n✘ ${problems.length} problema(s) encontrado(s):`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log(`✔ OK: ${files.length} arquivos JS sem erro de sintaxe${cargo.error ? '' : ' e cargo check limpo'}.`);
