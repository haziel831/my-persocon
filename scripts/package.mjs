// Assembles dist/My Persocon X.Y [edition]/ from the release build: the .exe, the bundled model, changelogs and licenses.
// Player files (config, save, backups, imported models, logs) live in %APPDATA%\My Persocon and are never touched here.
// With --preview, runs that build in preview mode (renders animation sheets into preview/).
import { cpSync, mkdirSync, copyFileSync, existsSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const { version, edition } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const demo = process.argv.includes('--demo');
const beta = process.argv.includes('--beta');
const combat = process.argv.includes('--combat');
const name = combat ? 'My Persocon Combat' : demo ? 'My Persocon Demo' : 'My Persocon';
const short = version.replace(/^(\d+\.\d+)\.0$/, '$1');
const suffix = combat || demo ? '' : (beta ? 'BETA' : edition);
const out = join(root, 'dist', combat ? name : [name, short, suffix].filter(Boolean).join(' '));
const exe = join(out, `${name}.exe`);

if (process.argv.includes('--preview')) {
  if (!existsSync(exe)) throw new Error('Run "npm run dist" first.');
  const extra = process.argv.slice(2).filter((a) => a !== '--preview');
  spawnSync(exe, ['--preview', ...extra], { stdio: 'inherit', cwd: root });
  process.exit(0);
}

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
const targetDir = process.env.CARGO_TARGET_DIR || join(root, 'src-tauri', 'target');
copyFileSync(join(targetDir, 'release', 'persocon.exe'), exe);
// The arena is its own build ("My Persocon Combat.exe"); normal editions ship only the game exe.
for (const item of ['models/MyPersocon', 'models/Aghata', 'THIRD_PARTY_LICENSES.txt', 'LEIA-ME.txt']) {
  if (existsSync(join(root, item))) cpSync(join(root, item), join(out, item), { recursive: true });
  else console.warn(`Missing: ${item}`);
}
// Only the changelogs from the First Release (1.0) on: vX.Y.md, not the Early Access vX.Y.Z.md ones.
mkdirSync(join(out, 'ChangeLogs'), { recursive: true });
for (const f of readdirSync(join(root, 'ChangeLogs')).filter((n) => /^v\d+\.\d+\.md$/.test(n))) copyFileSync(join(root, 'ChangeLogs', f), join(out, 'ChangeLogs', f));
console.log(`Ready: ${out}`);
