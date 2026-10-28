// Furniture upgrade show: holographic brackets lock on the piece, a laser scans it while data
// pixels are pulled in and arcs crackle, a progress bar fills, then a flash reveals the new look
// with neon shockwaves and a pixel burst, all over a short 8-bit jingle.
import { translate } from './i18n.js';

const NEON = ['#5ef0ff', '#ff3ea5', '#7a3cff', '#ffd23f', '#ffffff'];
const STEP = 0.095;
const REVEAL = 20 * STEP;
const END = 3.7;
const midi = (n) => 440 * 2 ** ((n - 69) / 12);
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (l) => l[Math.floor(Math.random() * l.length)];

// Old blue-robot style: a 25% pulse lead with vibrato over a bouncing octave bass, in E minor,
// resolving into an "item get" run in E major at the reveal. [step, note, length]
const LEAD = [
  [0, 76, 2], [2, 79, 1], [3, 81, 1], [4, 83, 3], [7, 81, 1], [8, 79, 2], [10, 76, 1], [11, 79, 1],
  [12, 81, 3], [15, 83, 1], [16, 86, 1], [17, 83, 1], [18, 86, 1], [19, 88, 1],
  [20, 71, 1], [21, 76, 1], [22, 80, 1], [23, 83, 3], [26, 81, 1], [27, 83, 1], [28, 85, 1], [29, 88, 8],
];
const HARM = [[4, 79, 3], [12, 78, 3], [23, 80, 3], [29, 83, 8]];
const ROOTS = [[0, 40], [8, 36], [12, 38], [16, 35], [20, 40], [24, 45], [26, 47], [28, 40]];
const BASS = [];
for (let s = 0; s < 29; s++) {
  const root = ROOTS.filter(([at]) => at <= s).pop()[1];
  BASS.push([s, root + (s % 2) * 12, 0.8]);
}
BASS.push([29, 40, 8]);

const pulses = new WeakMap();
function pulse(ctx, duty) {
  const key = `p${duty}`;
  const cache = pulses.get(ctx) || {};
  if (!cache[key]) {
    const n = 40;
    const real = new Float32Array(n);
    for (let k = 1; k < n; k++) real[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty);
    cache[key] = ctx.createPeriodicWave(real, new Float32Array(n));
    pulses.set(ctx, cache);
  }
  return cache[key];
}

// A held chip note: flat sustain, quick release and (for the lead) a delayed vibrato.
function chip(sound, t, note, dur, wave, vol, vib) {
  const c = sound.ctx;
  const o = c.createOscillator();
  const g = c.createGain();
  if (wave === 'triangle') o.type = 'triangle';
  else o.setPeriodicWave(pulse(c, wave));
  o.frequency.setValueAtTime(midi(note), t);
  if (vib && dur > 0.2) {
    const lfo = c.createOscillator();
    const depth = c.createGain();
    lfo.frequency.value = 6;
    depth.gain.setValueAtTime(0, t);
    depth.gain.linearRampToValueAtTime(midi(note) * 0.012, t + Math.min(0.25, dur * 0.6));
    lfo.connect(depth).connect(o.frequency);
    lfo.start(t);
    lfo.stop(t + dur + 0.05);
  }
  g.gain.setValueAtTime(vol, t);
  g.gain.setValueAtTime(vol, t + Math.max(0.01, dur - 0.03));
  g.gain.linearRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(sound.master);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function jingle(sound) {
  const t0 = sound.ctx.currentTime + 0.03;
  for (const [s, n, len] of LEAD) chip(sound, t0 + s * STEP, n, len * STEP * 0.95, 0.25, 0.07, true);
  for (const [s, n, len] of HARM) chip(sound, t0 + s * STEP, n, len * STEP * 0.95, 0.125, 0.035, false);
  for (const [s, n, len] of BASS) chip(sound, t0 + s * STEP, n, len * STEP, 'triangle', 0.2, false);
  for (let s = 0; s < 29; s++) {
    if (s % 4 === 0) sound.noise(t0 + s * STEP, 0.05, 0.3, 150);
    if (s % 4 === 2 || (s >= 16 && s < 20)) sound.noise(t0 + s * STEP, 0.05, 0.16, 4200);
    else if (s % 2) sound.noise(t0 + s * STEP, 0.02, 0.05, 8000);
  }
  sound.noise(t0 + REVEAL, 0.7, 0.3, 6000);
  sound.noise(t0 + REVEAL, 0.2, 0.45, 140);
  sound.tone('sawtooth', 90, 1200, t0, REVEAL, 0.025);
}

export function upgradeFx(app, el, title, onReveal) {
  const { sound, pet } = app;
  const cv = document.createElement('canvas');
  cv.className = 'upgrade-fx';
  const dpr = devicePixelRatio || 1;
  cv.width = innerWidth * dpr;
  cv.height = innerHeight * dpr;
  cv.style.width = `${innerWidth}px`;
  cv.style.height = `${innerHeight}px`;
  document.body.append(cv);
  const g = cv.getContext('2d');
  g.scale(dpr, dpr);
  el?.classList.add('upgrading');

  if (sound.enabled) jingle(sound);

  const parts = [];
  const arcs = [];
  let start = performance.now();
  let last = start;
  let revealed = false;
  let arcAt = 0;
  let zapAt = 0;
  const pic = el?.querySelector('img:not(.mark)') || el;
  const box = () => {
    const r = pic?.getBoundingClientRect();
    return r && r.width ? r : { left: innerWidth / 2 - 40, top: innerHeight / 2 - 40, width: 80, height: 80 };
  };
  const font = (px) => `bold ${px}px PxEmoji, Consolas, monospace`;
  // Translucent hologram fragments and scanline slivers drifting up off the piece.
  const holo = (r, n) => {
    for (let i = 0; i < n; i++) {
      const line = Math.random() < 0.35;
      parts.push({
        kind: 'holo', x: r.left + rand(0, r.width), y: r.top + rand(0.1, 1) * r.height, vy: -rand(25, 70),
        w: line ? rand(10, 26) : rand(3, 8), h: line ? 1 : rand(2, 6), life: rand(0.8, 1.6), age: 0,
        c: pick([NEON[0], NEON[0], NEON[1], NEON[2]]), sway: rand(0, 6),
      });
    }
  };
  const done = translate('UPGRADE COMPLETO!');
  const name = translate(title);

  const frame = (now) => {
    const t = (now - start) / 1000;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const r = box();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const size = Math.max(r.width, r.height);
    g.clearRect(0, 0, innerWidth, innerHeight);

    if (t < REVEAL) {
      const k = Math.min(1, t / 0.45);
      const pad = 6 + (1 - k) * size * 0.8;
      const L = r.left - pad;
      const T = r.top - pad;
      const W = r.width + pad * 2;
      const H = r.height + pad * 2;
      const c = Math.max(8, Math.min(W, H) * 0.22);
      g.save();
      g.globalAlpha = k;
      g.strokeStyle = NEON[0];
      g.lineWidth = 3;
      g.shadowColor = NEON[0];
      g.shadowBlur = 10;
      g.beginPath();
      for (const [x, y, sx, sy] of [[L, T, 1, 1], [L + W, T, -1, 1], [L, T + H, 1, -1], [L + W, T + H, -1, -1]]) {
        g.moveTo(x, y + sy * c); g.lineTo(x, y); g.lineTo(x + sx * c, y);
      }
      g.stroke();
      // Hologram grid over the piece.
      g.shadowBlur = 0;
      g.globalAlpha = 0.22 * k;
      g.strokeStyle = NEON[1];
      g.lineWidth = 1;
      g.beginPath();
      for (let x = r.left; x <= r.left + r.width; x += 6) { g.moveTo(x + 0.5, r.top); g.lineTo(x + 0.5, r.top + r.height); }
      for (let y = r.top; y <= r.top + r.height; y += 6) { g.moveTo(r.left, y + 0.5); g.lineTo(r.left + r.width, y + 0.5); }
      g.stroke();
      g.restore();

      if (t > 0.35) {
        const p = (t - 0.35) / (REVEAL - 0.35);
        // Scan laser.
        const y = r.top + (0.5 - 0.5 * Math.cos(p * Math.PI * 5)) * r.height;
        g.save();
        g.fillStyle = 'rgba(94,240,255,0.16)';
        g.fillRect(r.left - 4, y, r.width + 8, r.top + r.height - y);
        g.strokeStyle = NEON[1];
        g.shadowColor = NEON[1];
        g.shadowBlur = 14;
        g.lineWidth = 3;
        g.beginPath(); g.moveTo(r.left - 10, y); g.lineTo(r.left + r.width + 10, y); g.stroke();
        g.restore();
        // Data pixels pulled in, hex digits rising.
        for (let i = 0; i < 5; i++) {
          const a = rand(0, Math.PI * 2);
          const d = size * rand(0.9, 1.8);
          parts.push({ kind: 'in', x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d, tx: cx + rand(-0.3, 0.3) * r.width, ty: cy + rand(-0.3, 0.3) * r.height, life: rand(0.35, 0.6), age: 0, c: pick(NEON), s: rand(2, 4) });
        }
        holo(r, 1);
        if (Math.random() < 0.5) parts.push({ kind: 'hex', x: r.left + rand(0, r.width), y: r.top + r.height, vy: -rand(40, 90), life: 0.8, age: 0, c: pick(NEON.slice(0, 3)), ch: pick('01AF3C7E9B') });
        // Electric arcs between the edges.
        if (t >= arcAt) {
          arcAt = t + rand(0.06, 0.16);
          const edge = () => pick([[r.left, r.top + rand(0, r.height)], [r.left + r.width, r.top + rand(0, r.height)], [r.left + rand(0, r.width), r.top]]);
          arcs.push({ a: edge(), b: edge(), life: 0.09, c: pick([NEON[0], NEON[4], NEON[2]]) });
        }
        if (t >= zapAt && sound.enabled) {
          zapAt = t + rand(0.12, 0.25);
          sound.noise(sound.ctx.currentTime + 0.005, 0.03, 0.08, rand(4000, 7000));
        }
        // Progress bar.
        const bw = Math.max(90, r.width + 24);
        const bx = cx - bw / 2;
        const by = r.top + r.height + 10;
        g.save();
        g.fillStyle = '#120c24';
        g.fillRect(bx - 2, by - 2, bw + 4, 12);
        const grad = g.createLinearGradient(bx, 0, bx + bw, 0);
        grad.addColorStop(0, NEON[1]); grad.addColorStop(0.5, NEON[2]); grad.addColorStop(1, NEON[0]);
        g.fillStyle = grad;
        g.fillRect(bx, by, bw * Math.min(1, p), 8);
        g.strokeStyle = NEON[0];
        g.lineWidth = 1;
        g.strokeRect(bx - 2.5, by - 2.5, bw + 5, 13);
        g.font = font(11);
        g.textAlign = 'center';
        g.fillStyle = '#ffffff';
        g.shadowColor = NEON[1];
        g.shadowBlur = 6;
        g.fillText(`UPGRADE ${Math.min(100, Math.floor(p * 100))}%`, cx, by + 24);
        g.restore();
      }
    } else if (!revealed) {
      revealed = true;
      el?.classList.remove('upgrading');
      onReveal?.();
      app.rewards?.flash('#5ef0ff', 0.35);
      holo(r, 40);
      pet.cheer?.(2.6);
      for (let i = 0; i < 90; i++) {
        const a = rand(0, Math.PI * 2);
        const v = rand(120, 460);
        parts.push({ kind: 'out', x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 80, life: rand(0.7, 1.4), age: 0, c: pick(NEON), s: rand(2, 5) });
      }
      for (let i = 0; i < 3; i++) parts.push({ kind: 'ring', x: cx, y: cy, life: 0.8 + i * 0.15, age: -i * 0.12, c: NEON[i] });
    }

    for (const q of arcs) {
      q.life -= dt;
      g.save();
      g.strokeStyle = q.c;
      g.shadowColor = q.c;
      g.shadowBlur = 8;
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(q.a[0], q.a[1]);
      for (let i = 1; i < 6; i++) {
        const f = i / 6;
        g.lineTo(q.a[0] + (q.b[0] - q.a[0]) * f + rand(-7, 7), q.a[1] + (q.b[1] - q.a[1]) * f + rand(-7, 7));
      }
      g.lineTo(q.b[0], q.b[1]);
      g.stroke();
      g.restore();
    }
    for (let i = arcs.length - 1; i >= 0; i--) if (arcs[i].life <= 0) arcs.splice(i, 1);

    for (const q of parts) {
      q.age += dt;
      if (q.age < 0) continue;
      const f = q.age / q.life;
      g.save();
      g.globalAlpha = Math.max(0, 1 - f);
      if (q.kind === 'in') {
        const e = f * f;
        g.fillStyle = q.c;
        g.fillRect(q.x + (q.tx - q.x) * e, q.y + (q.ty - q.y) * e, q.s, q.s);
      } else if (q.kind === 'out') {
        q.vy += 420 * dt;
        q.x += q.vx * dt;
        q.y += q.vy * dt;
        g.fillStyle = q.c;
        g.fillRect(q.x, q.y, q.s, q.s);
      } else if (q.kind === 'holo') {
        q.y += q.vy * dt;
        if (Math.random() < 0.12) { g.restore(); continue; }
        const x = q.x + Math.sin(q.age * 9 + q.sway) * 2;
        g.globalAlpha *= 0.55;
        g.fillStyle = q.c;
        g.shadowColor = q.c;
        g.shadowBlur = 6;
        g.fillRect(x, q.y, q.w, q.h);
        if (q.h > 2) { g.globalAlpha *= 0.6; g.fillStyle = '#ffffff'; g.fillRect(x, q.y, q.w, 1); }
      } else if (q.kind === 'hex') {
        q.y += q.vy * dt;
        g.fillStyle = q.c;
        g.font = font(10);
        g.fillText(q.ch, q.x, q.y);
      } else if (q.kind === 'ring') {
        g.strokeStyle = q.c;
        g.shadowColor = q.c;
        g.shadowBlur = 12;
        g.lineWidth = 4 * (1 - f) + 1;
        g.beginPath();
        g.arc(q.x, q.y, size * 0.2 + f * size * 1.8, 0, Math.PI * 2);
        g.stroke();
      }
      g.restore();
    }
    for (let i = parts.length - 1; i >= 0; i--) if (parts[i].age >= parts[i].life) parts.splice(i, 1);

    if (t >= REVEAL) {
      const k = t - REVEAL;
      if (k < 1.4) holo(r, 1);
      // White flash over the piece, then the title.
      if (k < 0.3) {
        g.fillStyle = `rgba(255,255,255,${1 - k / 0.3})`;
        g.fillRect(r.left - 6, r.top - 6, r.width + 12, r.height + 12);
      }
      const a = Math.min(1, k / 0.15) * Math.min(1, (END - t) / 0.4);
      const s = 1 + Math.max(0, 0.6 - k * 3) + Math.sin(k * 10) * 0.03;
      const ty = Math.max(40, r.top - 26 - Math.min(14, k * 40));
      g.save();
      g.globalAlpha = Math.max(0, a);
      g.translate(cx, ty);
      g.scale(s, s);
      g.textAlign = 'center';
      g.font = font(18);
      g.lineWidth = 4;
      g.strokeStyle = '#120c24';
      g.strokeText(done, 0, 0);
      g.shadowColor = NEON[1];
      g.shadowBlur = 12;
      const grad = g.createLinearGradient(-90, 0, 90, 0);
      grad.addColorStop(0, NEON[0]); grad.addColorStop(0.5, '#ffffff'); grad.addColorStop(1, NEON[1]);
      g.fillStyle = grad;
      g.fillText(done, 0, 0);
      g.font = font(12);
      g.shadowBlur = 0;
      g.lineWidth = 3;
      g.strokeText(name, 0, 17);
      g.fillStyle = NEON[3];
      g.fillText(name, 0, 17);
      g.restore();
    }

    if (t < END || parts.length) requestAnimationFrame(frame);
    else cv.remove();
  };
  requestAnimationFrame(frame);
}
