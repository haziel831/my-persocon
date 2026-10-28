// Shooting Arcade minigame (the upgraded target): round, pitch-black one-eyed creatures with bat
// wings fly at the screen. Shoot them before they get close enough to bite it: each bite cracks the
// screen and glitches it, and three bites end the game. Holographic crosshair, 8-bit gunshots and a
// synthwave battle loop.
import { translate } from './i18n.js';

const NEON = ['#5ef0ff', '#ff3ea5', '#7a3cff', '#ffd23f', '#ffffff'];
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (l) => l[Math.floor(Math.random() * l.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const midi = (n) => 440 * 2 ** ((n - 69) / 12);
const LENGTH = 180;
const LIVES = 3;

// ---------- music: synthwave battle loop in A minor (Am F C G), 150 bpm ----------
const STEP = 0.1;
const CHORDS = [[45, [69, 72, 76, 81]], [41, [65, 69, 72, 77]], [48, [67, 72, 76, 79]], [43, [67, 71, 74, 79]]];
const ARP = [0, 1, 2, 3, 2, 1, 2, 3, 0, 1, 2, 3, 2, 3, 2, 1];
const LEAD = [
  [0, 81, 2], [3, 79, 1], [4, 81, 2], [6, 84, 2], [8, 83, 2], [10, 79, 2], [12, 76, 4],
  [16, 77, 2], [19, 76, 1], [20, 77, 2], [22, 81, 2], [24, 79, 2], [26, 77, 2], [28, 76, 4],
  [32, 76, 2], [35, 74, 1], [36, 76, 2], [38, 79, 2], [40, 84, 2], [42, 83, 2], [44, 79, 4],
  [48, 79, 2], [51, 81, 1], [52, 83, 2], [54, 86, 2], [56, 83, 2], [58, 79, 2], [60, 74, 2], [62, 71, 2],
];

const waves = new WeakMap();
function pulse(ctx, duty) {
  const cache = waves.get(ctx) || {};
  if (!cache[duty]) {
    const n = 40;
    const real = new Float32Array(n);
    for (let k = 1; k < n; k++) real[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty);
    cache[duty] = ctx.createPeriodicWave(real, new Float32Array(n));
    waves.set(ctx, cache);
  }
  return cache[duty];
}

class BattleMusic {
  constructor(sound) {
    this.sound = sound;
    const c = sound.ctx;
    this.out = c.createGain();
    this.out.gain.value = 0.9;
    this.out.connect(sound.master);
    this.k = 0;
    this.t = c.currentTime + 0.15;
    this.iv = setInterval(() => this.pump(), 50);
    this.pump();
  }

  note(t, n, dur, wave, vol, vib) {
    const c = this.sound.ctx;
    const o = c.createOscillator();
    const g = c.createGain();
    if (wave === 'tri' || wave === 'saw') o.type = wave === 'tri' ? 'triangle' : 'sawtooth';
    else o.setPeriodicWave(pulse(c, wave));
    o.frequency.setValueAtTime(midi(n), t);
    if (vib) {
      const lfo = c.createOscillator();
      const depth = c.createGain();
      lfo.frequency.value = 6.5;
      depth.gain.setValueAtTime(0, t);
      depth.gain.linearRampToValueAtTime(midi(n) * 0.01, t + dur * 0.7);
      lfo.connect(depth).connect(o.frequency);
      lfo.start(t);
      lfo.stop(t + dur + 0.05);
    }
    g.gain.setValueAtTime(vol, t);
    g.gain.setValueAtTime(vol, t + Math.max(0.01, dur - 0.03));
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.out);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  kick(t) {
    const c = this.sound.ctx;
    const o = c.createOscillator();
    const g = c.createGain();
    o.frequency.setValueAtTime(160, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    g.gain.setValueAtTime(0.4, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    o.connect(g).connect(this.out);
    o.start(t);
    o.stop(t + 0.18);
  }

  pump() {
    const s = this.sound;
    while (this.t < s.ctx.currentTime + 0.25) {
      if (s.enabled) this.step(this.k, this.t);
      this.k++;
      this.t += STEP;
    }
  }

  step(k, t) {
    const s = this.sound;
    const i = k % 16;
    const loop = Math.floor(k / 64);
    const [root, ch] = CHORDS[Math.floor(k / 16) % 4];
    if (i % 2 === 0) this.note(t, root + (i % 4 === 2 ? 12 : 0), STEP * 1.7, 0.5, 0.075);
    if (i % 4 === 0) this.note(t, root - 12, STEP * 3.5, 'tri', 0.16);
    this.note(t, ch[ARP[i]] + (loop % 2 ? 12 : 0), STEP * 0.85, 0.125, 0.026);
    if (loop >= 1) for (const [at, n, len] of LEAD) if (at === k % 64) this.note(t, n, len * STEP * 0.95, 0.25, 0.055, len > 1);
    if (i % 4 === 0) this.kick(t);
    if (i === 4 || i === 12) s.noise(t, 0.1, 0.2, 2600);
    if (i % 2 === 1) s.noise(t, 0.02, 0.05, 9000);
  }

  stop() {
    clearInterval(this.iv);
    const now = this.sound.ctx.currentTime;
    this.out.gain.setTargetAtTime(0.0001, now, 0.08);
    setTimeout(() => this.out.disconnect(), 800);
  }
}

// ---------- the creature (drawn in a 24x20 pixel grid, scaled) ----------
const WING_UP = [[2, 1, 2], [3, 0, 4], [4, 0, 5], [5, 1, 5], [6, 1, 5], [7, 2, 5], [8, 3, 5]];
const WING_DOWN = [[8, 2, 5], [9, 0, 5], [10, 0, 5], [11, 0, 4], [12, 1, 4], [13, 1, 2], [14, 1, 1]];

function creature(g, cx, cy, size, flap, lx, ly, hurt) {
  const u = size / 24;
  const P = (x, y, w, h, c) => {
    g.fillStyle = c;
    g.fillRect(Math.round(cx + (x - 12) * u), Math.round(cy + (y - 10) * u), Math.ceil(w * u), Math.ceil(h * u));
  };
  const halo = g.createRadialGradient(cx, cy, size * 0.1, cx, cy, size * 0.62);
  halo.addColorStop(0, 'rgba(122,60,255,0.35)');
  halo.addColorStop(1, 'rgba(122,60,255,0)');
  g.fillStyle = halo;
  g.fillRect(cx - size * 0.62, cy - size * 0.62, size * 1.24, size * 1.24);
  for (const [y, x0, x1] of flap ? WING_DOWN : WING_UP) {
    P(x0, y, x1 - x0 + 1, 1, '#07060b');
    P(23 - x1, y, x1 - x0 + 1, 1, '#07060b');
  }
  const [y0, x0, x1] = (flap ? WING_DOWN : WING_UP)[0];
  P(x0, y0, x1 - x0 + 1, 1, '#2c2340');
  P(23 - x1, y0, x1 - x0 + 1, 1, '#2c2340');
  for (let dy = -7; dy <= 7; dy++) {
    const hw = Math.round(Math.sqrt(49.5 - dy * dy));
    P(12 - hw, 10 + dy, hw * 2, 1, '#050508');
  }
  P(8, 4, 3, 1, '#2c2340'); P(6, 6, 1, 2, '#2c2340');
  for (let dy = -4; dy <= 4; dy++) {
    const hw = Math.round(Math.sqrt(18.5 - dy * dy));
    P(12 - hw, 9 + dy, hw * 2, 1, hurt ? '#ff9aa8' : '#f2eeee');
  }
  P(8, 9, 1, 1, '#d03050'); P(15, 8, 1, 1, '#d03050'); P(9, 12, 1, 1, '#d03050');
  const ix = 12 + lx;
  const iy = 9 + ly;
  for (let dy = -2; dy <= 2; dy++) {
    const hw = [1, 2, 2, 2, 1][dy + 2];
    P(ix - hw, iy + dy, hw * 2, 1, '#ff3ea5');
  }
  P(ix - 1, iy - 1, 2, 2, '#050508');
  P(ix, iy - 2, 1, 1, '#ffffff');
  P(10, 16, 1, 2, '#ffffff'); P(13, 16, 1, 2, '#ffffff');
}

// Jagged rays from the bite point, with a few branches, plus the tooth marks around it.
function makeCrack(x, y, s) {
  const lines = [];
  const n = Math.floor(rand(7, 11));
  for (let i = 0; i < n; i++) {
    let a = (i / n) * Math.PI * 2 + rand(-0.25, 0.25);
    let px = x + Math.cos(a) * s * 0.18;
    let py = y + Math.sin(a) * s * 0.14;
    const pts = [[px, py]];
    const len = s * rand(0.6, 1.6);
    for (let d = 0; d < len;) {
      const step = rand(10, 30);
      a += rand(-0.45, 0.45);
      px += Math.cos(a) * step;
      py += Math.sin(a) * step;
      d += step;
      pts.push([px, py]);
      if (Math.random() < 0.18) {
        const b = a + rand(0.5, 1.1) * (Math.random() < 0.5 ? -1 : 1);
        const l = rand(15, 45);
        lines.push([[px, py], [px + Math.cos(b) * l, py + Math.sin(b) * l]]);
      }
    }
    lines.push(pts);
  }
  const teeth = [];
  for (let i = 0; i < 7; i++) {
    const a = Math.PI * (0.15 + (i / 6) * 0.7);
    teeth.push([x + Math.cos(a) * s * 0.3, y - Math.sin(a) * s * 0.18, 1]);
    teeth.push([x + Math.cos(a) * s * 0.3, y + Math.sin(a) * s * 0.18, -1]);
  }
  return { lines, teeth, x, y, s };
}

export class ArcadeShooter {
  constructor(app, onEnd) {
    this.app = app;
    this.onEnd = onEnd;
    const el = (this.el = document.createElement('div'));
    el.className = 'target-game arcade-game hitzone';
    el.innerHTML = '<canvas class="ag-cv"></canvas><div class="tg-hud"><b class="tg-time">3:00</b> · <span class="tg-score">0</span> pts · recorde <span class="tg-best"></span> · <span class="tg-lives"></span><button class="tg-quit">✕</button></div>';
    document.body.append(el);
    this.cv = el.querySelector('canvas');
    this.g = this.cv.getContext('2d');
    el.querySelector('.tg-best').textContent = app.game.profile.targetBest || 0;
    el.querySelector('.tg-quit').onclick = (e) => { e.stopPropagation(); this.finish(); };
    this.t = LENGTH;
    this.score = 0;
    this.lives = LIVES;
    this.mobs = [];
    this.parts = [];
    this.cracks = [];
    this.spawn = 0.6;
    this.glitch = 0;
    this.recoil = 0;
    this.clock = 0;
    this.over = null;
    this.mouse = { x: innerWidth / 2, y: innerHeight / 2 };
    el.addEventListener('pointermove', (e) => { this.mouse = { x: e.clientX, y: e.clientY }; });
    this.cv.addEventListener('pointerdown', (e) => { e.stopPropagation(); this.shoot(e.clientX, e.clientY); });
    if (app.sound.enabled) this.music = new BattleMusic(app.sound);
    this.hud();
  }

  get base() {
    return Math.min(innerWidth, innerHeight) * 0.24;
  }

  size(m) {
    return this.base * (0.28 + 1.05 * m.z ** 1.6) * (m.lunge != null ? 1 + m.lunge * 2.6 : 1);
  }

  hud() {
    const s = Math.max(0, Math.ceil(this.t));
    this.el.querySelector('.tg-time').textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    this.el.querySelector('.tg-score').textContent = this.score;
    this.el.querySelector('.tg-lives').textContent = '❤️'.repeat(this.lives) + '🖤'.repeat(LIVES - this.lives);
  }

  sfx(kind) {
    const s = this.app.sound;
    if (!s.enabled) return;
    const t = s.ctx.currentTime + 0.005;
    if (kind === 'shot') {
      s.tone('square', 1400, 180, t, 0.09, 0.07);
      s.noise(t, 0.05, 0.18, 5000);
    } else if (kind === 'boom') {
      s.noise(t, 0.28, 0.3, 1200);
      s.tone('square', 600, 60, t, 0.25, 0.06);
      s.tone('triangle', 1800, 2600, t + 0.02, 0.08, 0.05);
    } else if (kind === 'bite') {
      s.noise(t, 0.18, 0.45, 500);
      s.noise(t + 0.06, 0.25, 0.3, 3500);
      s.tone('sawtooth', 120, 40, t, 0.35, 0.12);
    } else if (kind === 'over') {
      [72, 67, 64, 60, 55].forEach((n, i) => s.tone('square', midi(n), midi(n), t + i * 0.16, 0.15, 0.07));
    } else if (kind === 'win') {
      [72, 76, 79, 84, 88].forEach((n, i) => s.tone('square', midi(n), midi(n), t + i * 0.1, 0.12, 0.07));
    }
  }

  shoot(x, y) {
    if (this.over) return;
    this.recoil = 1;
    this.sfx('shot');
    this.parts.push({ kind: 'ring', x, y, r0: 4, r1: 26, life: 0.15, age: 0, c: NEON[0] });
    const hit = [...this.mobs].sort((a, b) => b.z - a.z).find((m) => Math.hypot(x - m.x, y - m.y) < this.size(m) * 0.33);
    if (!hit) return;
    const s = this.size(hit);
    const eye = Math.hypot(x - hit.x, y - (hit.y - s / 24)) < s * 0.19;
    const pts = Math.round((20 + 60 * (1 - hit.z)) * (eye ? 2 : 1));
    this.score += pts;
    this.mobs = this.mobs.filter((m) => m !== hit);
    this.explode(hit.x, hit.y, s, pts, eye);
    if (eye) this.app.pet.emit('gameExcite');
    this.hud();
  }

  explode(x, y, s, pts, eye) {
    this.sfx('boom');
    for (let i = 0; i < 46; i++) {
      const a = rand(0, Math.PI * 2);
      const v = rand(80, 420) * (s / 120 + 0.6);
      this.parts.push({ kind: 'px', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rand(0.45, 0.9), age: 0, c: pick(NEON), s: Math.round(rand(3, 7)) });
    }
    for (let i = 0; i < 3; i++) this.parts.push({ kind: 'ring', x, y, r0: s * 0.15, r1: s * (0.8 + i * 0.35), life: 0.45 + i * 0.1, age: -i * 0.06, c: NEON[i] });
    this.parts.push({ kind: 'flash', x, y, r: s * 0.45, life: 0.12, age: 0 });
    this.parts.push({ kind: 'text', x, y: y - s * 0.3, text: `${eye ? '👁️ ' : ''}+${pts}`, life: 0.9, age: 0, c: eye ? NEON[3] : NEON[0] });
  }

  bite(m) {
    this.lives--;
    this.cracks.push(makeCrack(m.x, m.y, this.base * 1.2));
    this.glitch = 0.75;
    this.sfx('bite');
    document.body.classList.remove('arcade-bite');
    void document.body.offsetWidth;
    document.body.classList.add('arcade-bite');
    clearTimeout(this.biteT);
    this.biteT = setTimeout(() => document.body.classList.remove('arcade-bite'), 650);
    this.app.pet.emit('react', { kind: 'scare' });
    this.hud();
    if (this.lives <= 0) this.end(false);
  }

  end(win) {
    if (this.over) return;
    this.over = { win, t: 2.6 };
    this.music?.stop();
    this.music = null;
    this.sfx(win ? 'win' : 'over');
  }

  finish() {
    this.music?.stop();
    this.music = null;
    this.onEnd?.();
  }

  destroy() {
    this.music?.stop();
    clearTimeout(this.biteT);
    document.body.classList.remove('arcade-bite');
    this.el.remove();
  }

  update(dt) {
    dt = Math.min(dt, 0.05);
    this.clock += dt;
    this.recoil = Math.max(0, this.recoil - dt * 6);
    this.glitch = Math.max(0, this.glitch - dt);
    if (this.over) {
      if ((this.over.t -= dt) <= 0) return this.finish();
    } else {
      this.t -= dt;
      const k = clamp(1 - this.t / LENGTH, 0, 1);
      this.spawn -= dt;
      if (this.spawn <= 0 && this.mobs.length < 3 + Math.floor(k * 5)) {
        this.spawn = rand(1.1, 1.7) - k * 0.75;
        const W = innerWidth;
        this.mobs.push({ x: rand(W * 0.12, W * 0.88), y: rand(innerHeight * 0.2, innerHeight * 0.7), vx: rand(40, 110) * (Math.random() < 0.5 ? -1 : 1), ph: rand(0, 6), z: 0, speed: 1 / rand(8 - 4 * k, 10 - 4 * k), lunge: null });
      }
      for (const m of this.mobs) {
        m.ph += dt;
        if (m.lunge != null) {
          if ((m.lunge += dt) > 0.28) m.bit = true;
          continue;
        }
        m.z = Math.min(1, m.z + m.speed * dt);
        const s = this.size(m);
        m.x += m.vx * dt * (1 - m.z * 0.6);
        if (m.x < s / 2 || m.x > innerWidth - s / 2) m.vx = -m.vx;
        m.x = clamp(m.x, s / 2, innerWidth - s / 2);
        m.y = clamp(m.y + Math.sin(m.ph * 2.2) * 40 * dt, s / 2 + 40, innerHeight - s / 2);
        if (m.z >= 1) m.lunge = 0;
      }
      for (const m of this.mobs.filter((q) => q.bit)) this.bite(m);
      this.mobs = this.mobs.filter((m) => !m.bit);
      if (this.t <= 0) this.end(true);
      this.hud();
    }
    this.draw(dt);
  }

  draw(dt) {
    const cv = this.cv;
    const dpr = devicePixelRatio || 1;
    const W = innerWidth;
    const H = innerHeight;
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) {
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
    }
    const g = this.g;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.imageSmoothingEnabled = false;
    g.clearRect(0, 0, W, H);

    for (const m of [...this.mobs].sort((a, b) => a.z - b.z)) {
      const s = this.size(m);
      const look = [clamp((this.mouse.x - m.x) / 160, -1, 1) * 1.5, clamp((this.mouse.y - m.y) / 160, -1, 1) * 1.2];
      g.globalAlpha = Math.min(1, m.z * 8 + 0.15);
      creature(g, m.x, m.y, s, Math.floor(m.ph * (m.lunge != null ? 14 : 7)) % 2, look[0], look[1], m.lunge != null);
      g.globalAlpha = 1;
      if (m.z > 0.75 && m.lunge == null && Math.floor(this.clock * 8) % 2) {
        g.strokeStyle = 'rgba(255,62,165,0.7)';
        g.lineWidth = 2;
        g.strokeRect(Math.round(m.x - s * 0.4), Math.round(m.y - s * 0.4), Math.round(s * 0.8), Math.round(s * 0.8));
      }
    }

    for (const q of this.parts) {
      q.age += dt;
      if (q.age < 0) continue;
      const f = q.age / q.life;
      g.save();
      g.globalAlpha = Math.max(0, 1 - f);
      if (q.kind === 'px') {
        q.vx *= 1 - dt * 2.5;
        q.vy *= 1 - dt * 2.5;
        q.x += q.vx * dt;
        q.y += q.vy * dt;
        g.fillStyle = q.c;
        g.shadowColor = q.c;
        g.shadowBlur = 8;
        g.fillRect(Math.round(q.x), Math.round(q.y), q.s, q.s);
      } else if (q.kind === 'ring') {
        g.strokeStyle = q.c;
        g.shadowColor = q.c;
        g.shadowBlur = 12;
        g.lineWidth = 3 * (1 - f) + 1;
        g.beginPath();
        g.arc(q.x, q.y, q.r0 + (q.r1 - q.r0) * f, 0, Math.PI * 2);
        g.stroke();
      } else if (q.kind === 'flash') {
        g.fillStyle = '#ffffff';
        g.beginPath();
        g.arc(q.x, q.y, q.r, 0, Math.PI * 2);
        g.fill();
      } else if (q.kind === 'text') {
        g.font = 'bold 18px PxEmoji, Consolas, monospace';
        g.textAlign = 'center';
        g.lineWidth = 4;
        g.strokeStyle = '#120c24';
        const y = q.y - f * 30;
        g.strokeText(q.text, q.x, y);
        g.fillStyle = q.c;
        g.fillText(q.text, q.x, y);
      }
      g.restore();
    }
    this.parts = this.parts.filter((q) => q.age < q.life);

    for (const c of this.cracks) {
      g.save();
      g.lineJoin = 'miter';
      for (const [w, col] of [[4, 'rgba(0,0,0,0.45)'], [1.5, 'rgba(235,245,255,0.9)']]) {
        g.lineWidth = w;
        g.strokeStyle = col;
        g.beginPath();
        for (const pts of c.lines) {
          g.moveTo(pts[0][0], pts[0][1]);
          for (const [x, y] of pts.slice(1)) g.lineTo(x, y);
        }
        g.stroke();
      }
      g.fillStyle = 'rgba(235,245,255,0.85)';
      const ts = c.s * 0.05;
      for (const [x, y, d] of c.teeth) {
        g.beginPath();
        g.moveTo(x - ts / 2, y);
        g.lineTo(x + ts / 2, y);
        g.lineTo(x, y + d * ts * 1.2);
        g.fill();
      }
      g.restore();
    }

    if (this.glitch > 0) {
      const k = this.glitch / 0.75;
      for (let i = 0; i < 9; i++) {
        g.fillStyle = pick(['rgba(255,62,165,0.35)', 'rgba(94,240,255,0.35)', 'rgba(255,255,255,0.25)', 'rgba(0,0,0,0.4)']);
        g.fillRect(rand(-40, W * 0.5), rand(0, H), rand(W * 0.2, W), rand(2, 18) * k);
      }
      for (let i = 0; i < 160 * k; i++) {
        g.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)';
        g.fillRect(rand(0, W), rand(0, H), 2, 2);
      }
    }

    if (!this.over) this.crosshair(g);
    else {
      const a = Math.min(1, (2.6 - this.over.t) / 0.3);
      g.save();
      g.globalAlpha = a;
      g.textAlign = 'center';
      g.font = 'bold 44px PxEmoji, Consolas, monospace';
      g.lineWidth = 6;
      g.strokeStyle = '#120c24';
      const text = translate(this.over.win ? 'VITÓRIA!' : 'GAME OVER');
      g.strokeText(text, W / 2, H * 0.42);
      g.shadowColor = this.over.win ? NEON[0] : NEON[1];
      g.shadowBlur = 18;
      g.fillStyle = this.over.win ? NEON[0] : NEON[1];
      g.fillText(text, W / 2, H * 0.42);
      g.font = 'bold 18px PxEmoji, Consolas, monospace';
      g.shadowBlur = 0;
      g.lineWidth = 4;
      g.strokeText(`${this.score} pts`, W / 2, H * 0.42 + 34);
      g.fillStyle = NEON[3];
      g.fillText(`${this.score} pts`, W / 2, H * 0.42 + 34);
      g.restore();
    }
  }

  // Holographic sight: broken ring turning slowly, a cross with a gap, flickering scanlines; it
  // turns pink and closes in over a creature.
  crosshair(g) {
    const { x, y } = this.mouse;
    const over = this.mobs.some((m) => Math.hypot(x - m.x, y - m.y) < this.size(m) * 0.33);
    const c = over ? NEON[1] : NEON[0];
    const r = (over ? 17 : 22) * (1 + this.recoil * 0.35);
    g.save();
    g.globalAlpha = 0.75 + Math.random() * 0.25;
    g.strokeStyle = c;
    g.shadowColor = c;
    g.shadowBlur = 10;
    g.lineWidth = 2;
    const rot = this.clock * 1.2;
    for (let i = 0; i < 4; i++) {
      g.beginPath();
      g.arc(x, y, r, rot + (i * Math.PI) / 2 + 0.25, rot + ((i + 1) * Math.PI) / 2 - 0.25);
      g.stroke();
    }
    g.beginPath();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      g.moveTo(x + dx * 6, y + dy * 6);
      g.lineTo(x + dx * (r + 8), y + dy * (r + 8));
    }
    g.stroke();
    g.shadowBlur = 0;
    g.fillStyle = NEON[1];
    g.fillRect(Math.round(x) - 1, Math.round(y) - 1, 3, 3);
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.clip();
    g.globalAlpha = 0.18;
    g.fillStyle = c;
    for (let yy = -r; yy < r; yy += 3) g.fillRect(x - r, y + yy + ((this.clock * 20) % 3), r * 2, 1);
    g.restore();
  }
}
