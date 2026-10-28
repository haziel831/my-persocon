// Builds the Demo: turns DEMO on in src/renderer/edition.js, runs the release build, packages it into
// dist/My Persocon Demo vX.Y.Z and puts the flag back (even when the build fails).
import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const file = join(root, 'src', 'renderer', 'edition.js');
const src = readFileSync(file, 'utf8');
const OFF = 'export const DEMO = false;';
if (!src.includes(OFF)) throw new Error('edition.js: DEMO flag not found');
writeFileSync(file, src.replace(OFF, 'export const DEMO = true;'));
let code = 1;
try {
  code = spawnSync('npx', ['tauri', 'build'], { stdio: 'inherit', cwd: root, shell: true }).status ?? 1;
  if (code === 0) code = spawnSync(process.execPath, [join(root, 'scripts', 'package.mjs'), '--demo'], { stdio: 'inherit', cwd: root }).status ?? 1;
} finally {
  writeFileSync(file, src);
}
process.exit(code);
