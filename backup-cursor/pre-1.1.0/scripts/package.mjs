// Assembles dist/Persocon vX.Y.Z/ from the release build: the .exe plus the editable config and model.
// Each version gets its own folder; a new one starts with the settings and imports of the newest older one,
// but with no save: the older versions' saves are deleted.
// With --preview, runs that build in preview mode (renders animation sheets into preview/).
import { cpSync, mkdirSync, copyFileSync, existsSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const { version } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const dist = join(root, 'dist');
const out = join(dist, `Persocon v${version}`);
const exe = join(out, 'Persocon.exe');

if (process.argv.includes('--preview')) {
  if (!existsSync(exe)) throw new Error('Run "npm run dist" first.');
  const extra = process.argv.slice(2).filter((a) => a !== '--preview');
  spawnSync(exe, ['--preview', ...extra], { stdio: 'inherit', cwd: root });
  process.exit(0);
}

const semver = (name) => (/^(?:Persocon|Desktop Pet) v(\d+)\.(\d+)\.(\d+)$/.exec(name) || []).slice(1).map(Number);
// Every other version folder, the most recently built first (the numbering restarted at 1.0.0,
// so "older" can't be decided by the version number).
const olderDirs = () => {
  const current = `Persocon v${version}`;
  return (existsSync(dist) ? readdirSync(dist) : [])
    .filter((name) => name !== current && semver(name).length)
    .map((name) => ({ dir: join(dist, name), t: statSync(join(dist, name)).mtimeMs }))
    .sort((a, b) => b.t - a.t)
    .map(({ dir }) => dir);
};

const fresh = !existsSync(out);
mkdirSync(out, { recursive: true });
if (fresh) {
  const older = olderDirs();
  const prev = older[0];
  if (prev) {
    for (const item of ['config.json', 'data', 'models']) {
      if (existsSync(join(prev, item))) cpSync(join(prev, item), join(out, item), { recursive: true });
    }
    console.log(`Carried settings over from ${prev}`);
  }
  for (const dir of older) rmSync(join(dir, 'save.json'), { force: true });
  console.log('New version starts without a save; older saves deleted');
}
const targetDir = process.env.CARGO_TARGET_DIR || join(root, 'src-tauri', 'target');
copyFileSync(join(targetDir, 'release', 'persocon.exe'), exe);
if (!existsSync(join(out, 'config.json'))) copyFileSync(join(root, 'config.json'), join(out, 'config.json'));
for (const dir of ['DaL_Kurumi', 'emoticons', 'models', 'ChangeLogs']) {
  if (existsSync(join(root, dir))) cpSync(join(root, dir), join(out, dir), { recursive: true });
}
console.log(`Ready: ${out}`);
