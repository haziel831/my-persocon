// Melody extraction check without a browser: synthetic band mixes at 11025 Hz → pcmToNotes.
// node test/mp3test.mjs [hard] [seed]
import { pcmToNotes, TUNE } from '../src/renderer/synth.js';

for (const k of Object.keys(TUNE)) if (process.env[k.toUpperCase()]) TUNE[k] = Number(process.env[k.toUpperCase()]);

const R = 11025;
const hard = process.argv[2] === 'hard';
let seed = Number(process.argv[3] || 7);
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const mel = [];
let t = 0.3;
const scale = [0, 2, 4, 5, 7, 9, 11, 12, 14, 16];
while (t < 15) {
  const d = [0.18, 0.25, 0.25, 0.4, 0.5, 0.75][Math.floor(rnd() * 6)];
  const rep = hard && mel.length && rnd() < 0.3;
  mel.push([t, rep ? mel[mel.length - 1][1] : 64 + scale[Math.floor(rnd() * scale.length)] - 2, d]);
  t += d + (rnd() < 0.2 ? 0.12 : hard ? 0.04 : 0.02);
}
const L = Math.floor(R * 16);
const out = new Float32Array(L);
const add = (t0, dur, fn) => {
  const a = Math.floor(t0 * R);
  const b = Math.min(L, Math.floor((t0 + dur) * R));
  for (let i = a; i < b; i++) out[i] += fn((i - a) / R, (i - a) / (b - a));
};
const hzOf = (n) => 440 * 2 ** ((n - 69) / 12);
const ml = hard ? 0.13 : 0.22;
for (const [t0, n, d] of mel) {
  const f = hzOf(n);
  let ph = 0;
  add(t0, d * 0.95, (tt, u) => {
    ph += (2 * Math.PI * f * 2 ** ((0.25 * Math.sin(2 * Math.PI * 5.5 * tt) * Math.min(1, tt * 4)) / 12)) / R;
    let v = 0;
    for (let h = 1; h <= 8 && h * f < R / 2; h++) v += Math.sin(ph * h) * (h === 1 ? 1 : h === 2 ? 0.7 : 0.5 / h);
    return v * ml * Math.min(1, tt * 60) * (1 - u * 0.3);
  });
}
const chords = [[48, 52, 55], [45, 48, 52], [41, 45, 48], [43, 47, 50]];
const harmTone = (f, hs, k) => (tt) => { let v = 0; for (let h = 1; h <= hs && h * f < R / 2; h++) v += Math.sin(2 * Math.PI * f * h * tt) / k(h); return v; };
for (let b = 0; b < 8; b++) for (const n of chords[b % 4]) { const g = harmTone(hzOf(n + 12), 2, (h) => (h === 1 ? 1 : 3.3)); add(b * 2, 2, (tt) => g(tt) * 0.07); }
for (let s = 0; s < 32; s++) {
  const g = harmTone(hzOf(chords[Math.floor(s / 4) % 4][0] - 12 + (s % 2 ? 12 : 0)), 5, (h) => h);
  add(s * 0.5, 0.45, (tt) => g(tt) * 0.16 * Math.exp(-tt * 3));
}
for (let s = 0; s < 32; s++) add(s * 0.5, 0.25, (tt) => Math.sin(2 * Math.PI * (50 + 70 * Math.exp(-tt * 30)) * tt) * 0.5 * Math.exp(-tt * 14));
for (let s = 0; s < 16; s++) add(s + 0.5, 0.18, (tt) => (rnd() * 2 - 1) * 0.3 * Math.exp(-tt * 20));
for (let s = 0; s < 64; s++) add(s * 0.25 + 0.125, 0.05, (tt) => (rnd() * 2 - 1) * 0.08 * Math.exp(-tt * 60));
if (hard) {
  for (let b = 0; b < 8; b++) for (const n of chords[b % 4]) { const g = harmTone(hzOf(n + 12), 7, (h) => h); add(b * 2, 2, (tt) => g(tt) * 0.045); }
  for (let s = 0; s < 64; s++) {
    const c = chords[Math.floor(s / 8) % 4];
    const g = harmTone(hzOf(c[s % 3] + 24 + (s % 4 === 3 ? 12 : 0)), 4, (h) => h * h);
    add(s * 0.25, 0.24, (tt) => g(tt) * 0.07 * Math.exp(-tt * 9));
  }
}
// 110 Hz high-pass, like audioToNotes.
{
  const w = (2 * Math.PI * 110) / R;
  const al = Math.sin(w) / (2 * 0.7071);
  const cw = Math.cos(w);
  const a0 = 1 + al;
  const [b0, b1, b2, a1, a2] = [(1 + cw) / 2 / a0, -(1 + cw) / a0, (1 + cw) / 2 / a0, (-2 * cw) / a0, (1 - al) / a0];
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < L; i++) {
    const x0 = out[i];
    const y0 = b0 * x0 + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1; x1 = x0; y2 = y1; y1 = y0;
    out[i] = y0;
  }
}
const t1 = performance.now();
const notes = await pcmToNotes(out, R);
const ms = Math.round(performance.now() - t1);
const near = (s0, t0) => Math.abs(s0 - t0) < 0.12;
const hit = mel.filter(([t0, m]) => notes.some(([s0, n0]) => near(s0, t0) && n0 === m)).length;
const extra = notes.filter(([s0, n0]) => !mel.some(([t0, m]) => near(s0, t0) && n0 === m));
console.log(`${hard ? 'hard' : 'easy'} seed ${process.argv[3] || 7}: melodia ${mel.length} · acertos ${hit} (${Math.round((hit / mel.length) * 100)}%) · detectadas ${notes.length} · extras ${extra.length} · ${ms} ms`);
if (process.argv[4]) {
  console.log('esperado', mel.map(([a, m]) => `${a.toFixed(2)}:${m}`).join(' '));
  console.log('obtido  ', notes.map(([a, m]) => `${a.toFixed(2)}:${m}`).join(' '));
}
