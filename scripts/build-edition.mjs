// Builds one of the two 2.0 editions from the same source, then restores the flags.
//   node scripts/build-edition.mjs beta  -> dist/My Persocon 2.0 BETA  (Streamer/Twitch/IA/PTT)
//   node scripts/build-edition.mjs base  -> dist/My Persocon 2.0       (game only)
import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const mode = process.argv[2];
if (mode !== 'base' && mode !== 'beta') throw new Error('Use: node scripts/build-edition.mjs base|beta');

const jsFile = join(root, 'src', 'renderer', 'edition.js');
const rsFile = join(root, 'src-tauri', 'src', 'main.rs');
const jsSrc = readFileSync(jsFile, 'utf8');
const rsSrc = readFileSync(rsFile, 'utf8');
const JS_ON = 'export const STREAM = true;';
const JS_OFF = 'export const STREAM = false;';
const RS_ON = 'const STREAM_BUILD: bool = true;';
const RS_OFF = 'const STREAM_BUILD: bool = false;';
if (!jsSrc.includes(JS_ON) && !jsSrc.includes(JS_OFF)) throw new Error('edition.js: STREAM flag not found');
if (!rsSrc.includes(RS_ON) && !rsSrc.includes(RS_OFF)) throw new Error('main.rs: STREAM_BUILD flag not found');

const wantStream = mode === 'beta';
writeFileSync(jsFile, jsSrc.replace(JS_OFF, JS_ON).replace(JS_ON, wantStream ? JS_ON : JS_OFF));
writeFileSync(rsFile, rsSrc.replace(RS_OFF, RS_ON).replace(RS_ON, wantStream ? RS_ON : RS_OFF));

let code = 1;
try {
  code = spawnSync('npx', ['tauri', 'build'], { stdio: 'inherit', cwd: root, shell: true }).status ?? 1;
  if (code === 0) {
    const args = [join(root, 'scripts', 'package.mjs')];
    if (wantStream) args.push('--beta');
    code = spawnSync(process.execPath, args, { stdio: 'inherit', cwd: root }).status ?? 1;
  }
} finally {
  // Always put the source back to the default (BETA) flag.
  writeFileSync(jsFile, jsSrc.replace(JS_OFF, JS_ON));
  writeFileSync(rsFile, rsSrc.replace(RS_OFF, RS_ON));
}
process.exit(code);
