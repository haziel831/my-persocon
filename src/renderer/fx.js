// Feedback particles around the pet: red hearts when Humor goes up, pink hearts for Afeição,
// black broken hearts when either goes down (more of them the bigger the change). Also the
// stomach rumble every 5 points of hunger lost and the burst when drinking potions/power-ups.
import { icon } from './pixel.js';
import { isPowerUp } from './game.js';
import { VfxSequence, VFX_FOLDERS } from './vfx.js';

// Impact effects for the melee: the 32x32 pixel sheet (assets/vfx/32x32_simple_sfx_sheet.png),
// sliced frame by frame and drawn at the exact impact point.
const SFX_COLS = 5;
const SFX_CELL = 32;
// The frames of each effect (col, row) inside the sheet.
const IMPACT = {
  burst: { frames: [[0, 7], [1, 7], [2, 7], [3, 7]], ms: 55, scale: 1.25 }, // the explosion rings
  shield: { frames: [[3, 7], [4, 7], [0, 8]], ms: 70, scale: 1 },        // the guard ring
  dust: { frames: [[2, 12], [3, 12], [4, 12], [1, 13]], ms: 70, scale: 0.8 },  // the puff
  rust: { frames: [[1, 11], [2, 11], [3, 11], [4, 11]], ms: 55, scale: 0.8 }, // the rust flakes
};
let sfxSheet = null;
const sfxImage = () => {
  if (sfxSheet === null) {
    sfxSheet = new Image();
    sfxSheet.src = new URL('./assets/vfx/32x32_simple_sfx_sheet.png', import.meta.url).href;
  }
  return sfxSheet;
};

// The big explosions (BearFX): the sheet has 7 frames down each column and a few variants
// side by side. 'fire' is the yellow blast, 'blood' the crimson one (Explosão Carmesim).
const BOOM = {
  fire: { file: 'bearfx_fire.png', cols: 5 },
  blood: { file: 'bearfx_blood.png', cols: 4 },
};
const BOOM_ROWS = 7;
const BOOM_CELL = 64;
const boomImages = {};
const boomImage = (kind) => {
  const def = BOOM[kind];
  if (!def) return null;
  if (!boomImages[kind]) {
    const img = new Image();
    img.src = new URL(`./assets/vfx/${def.file}`, import.meta.url).href;
    boomImages[kind] = img;
  }
  return boomImages[kind];
};

export class Fx {
  constructor(app) {
    this.app = app;
    const { pet } = app;
    this.mood = pet.stats.mood;
    this.aff = pet.affection;
    this.acc = { mood: 0, aff: 0 };
    this.t = 0;
    this.hungerStep = Math.floor(pet.stats.hunger / 5);
    pet.on((type, d) => {
      if (type === 'medicine') this.potion(d?.item);
      // Food/drink with buff (vending neon, etc.) also get the PowerUp get FX.
      else if (type === 'ate' && isPowerUp(d?.item)) this.potion(d.item);
    });
  }

  heart(kind, head, big) {
    const el = document.createElement('div');
    el.className = `fx-heart ${kind}`;
    const P = this.app.pet.P;
    const s = Math.round(P * (big ? 0.11 : 0.075));
    el.style.width = el.style.height = `${s}px`;
    el.style.backgroundImage = `url(${icon(kind === 'broken' ? 'heartbreak' : 'heart')})`;
    el.style.left = `${head.x + (Math.random() - 0.5) * P * 0.6}px`;
    el.style.top = `${head.y + P * (0.05 + Math.random() * 0.25)}px`;
    el.style.setProperty('--dx', `${(Math.random() - 0.5) * 50}px`);
    document.body.append(el);
    setTimeout(() => el.remove(), 1500);
  }

  potion(item) {
    const { head, pet, sound } = this.app;
    if (!item || !head) return;
    const fx = item.effects || {};
    const power = Math.min(1, Object.values(fx).reduce((a, v) => a + Math.max(0, v), 0) / 100);
    sound.powerup(power);
    const cx = pet.x;
    const cy = pet.y - pet.P * 0.55;
    const n = 6 + Math.round(power * 16);
    for (let i = 0; i < n; i++) {
      const el = document.createElement('div');
      el.className = 'fx-spark';
      const a = (i / n) * Math.PI * 2;
      const r = pet.P * (0.35 + power * 0.5);
      el.style.left = `${cx}px`;
      el.style.top = `${cy}px`;
      el.style.background = ['#7f7', '#bfb', '#fff'][i % 3];
      el.style.setProperty('--dx', `${Math.cos(a) * r}px`);
      el.style.setProperty('--dy', `${Math.sin(a) * r - pet.P * 0.3}px`);
      document.body.append(el);
      setTimeout(() => el.remove(), 1400);
    }
    const ring = document.createElement('div');
    ring.className = 'fx-ring';
    const s = pet.P * (0.8 + power);
    ring.style.width = ring.style.height = `${s}px`;
    ring.style.left = `${cx - s / 2}px`;
    ring.style.top = `${cy - s / 2}px`;
    ring.style.borderColor = '#7f7';
    document.body.append(ring);
    setTimeout(() => ring.remove(), 1100);
  }

  // The damage number that floats up from the hit: red, with a dark pixel outline, and
  // bigger the bigger the hit was.
  damage(x, y, amount, opts = {}) {
    if (typeof document === 'undefined' || !(amount > 0)) return;
    const el = document.createElement('div');
    el.className = 'dmg-num';
    const n = Math.round(amount);
    el.textContent = opts.crit ? `${n}!` : String(n);
    // 13px num golpe de 1, até 40px (o crítico cresce mais).
    const size = Math.max(13, Math.min(40, 13 + n * 1.25)) * (opts.crit ? 1.15 : 1);
    el.style.fontSize = `${Math.round(size)}px`;
    el.style.left = `${Math.round(x + (Math.random() - 0.5) * 14)}px`;
    el.style.top = `${Math.round(y - 58)}px`;   // bem mais alto acima do lutador
    el.style.setProperty('--rise', `${Math.round(-48 - n * 0.9)}px`);
    el.style.setProperty('--drop', `${Math.round(26 + n * 0.35)}px`);
    document.body.append(el);
    setTimeout(() => el.remove(), 1250);
  }

  // A blood sequence from the pixel effects pack: ONE folder per hit (light or heavy).
  seq(folder, x, y, opts = {}) {
    if (typeof document === 'undefined') return null;
    const f = folder || VFX_FOLDERS.light;
    return new VfxSequence(f, x, y, opts);
  }

  // The charge before a strike: the blue aura around her + the rising energy particles.
  charge(x, y, size = 120, ms = 450) {
    if (typeof document === 'undefined') return;
    const el = document.createElement('div');
    el.className = 'combat-aura charge';
    const s = Math.round(size * 0.95);
    el.style.width = el.style.height = `${s}px`;
    el.style.left = `${Math.round(x)}px`;
    el.style.top = `${Math.round(y)}px`;
    document.body.append(el);
    setTimeout(() => el.remove(), ms + 150);
    // The blue particles rising around her.
    const n = 16;
    for (let i = 0; i < n; i++) {
      const p = document.createElement('div');
      p.className = 'charge-spark';
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.4;
      const r = size * (0.16 + Math.random() * 0.24);
      p.style.left = `${Math.round(x + Math.cos(a) * r)}px`;
      p.style.top = `${Math.round(y + Math.sin(a) * r * 0.55)}px`;
      p.style.setProperty('--dy', `${Math.round(-size * (0.45 + Math.random() * 0.4))}px`);
      p.style.setProperty('--delay', `${(Math.random() * (ms / 1000) * 0.65).toFixed(2)}s`);
      document.body.append(p);
      setTimeout(() => p.remove(), ms + 450);
    }
  }

  // The melee impact at (x, y): the frames of the 32x32 sheet played one by one.
  impact(kind, x, y, scale = 1) {
    const def = IMPACT[kind];
    if (!def || typeof document === 'undefined') return;
    const cv = document.createElement('canvas');
    cv.className = 'vfx-impact';
    cv.width = SFX_CELL;
    cv.height = SFX_CELL;
    const size = Math.round(SFX_CELL * def.scale * scale);
    cv.style.width = `${size}px`;
    cv.style.height = `${size}px`;
    cv.style.left = `${Math.round(x - size / 2)}px`;
    cv.style.top = `${Math.round(y - size / 2)}px`;
    document.body.append(cv);
    const img = sfxImage();
    const g = cv.getContext('2d');
    g.imageSmoothingEnabled = false;
    const t0 = performance.now();
    const tick = () => {
      const i = Math.min(def.frames.length - 1, Math.floor((performance.now() - t0) / def.ms));
      const [c, r] = def.frames[i];
      g.clearRect(0, 0, SFX_CELL, SFX_CELL);
      if (img.complete && img.naturalWidth) {
        g.drawImage(img, c * SFX_CELL, r * SFX_CELL, SFX_CELL, SFX_CELL, 0, 0, SFX_CELL, SFX_CELL);
      }
      if (i < def.frames.length - 1) requestAnimationFrame(tick);
      else setTimeout(() => cv.remove(), 60);
    };
    if (img.complete && img.naturalWidth) tick();
    else img.onload = tick;
    img.onerror = () => cv.remove();
  }

  // A big explosion (BearFX): the frames of a column play one after the other.
  explosion(kind = 'fire', x = 0, y = 0, scale = 1, variant = -1) {
    const def = BOOM[kind];
    if (!def || typeof document === 'undefined') return;
    const col = variant >= 0 ? variant % def.cols : Math.floor(Math.random() * def.cols);
    const cv = document.createElement('canvas');
    cv.className = 'vfx-boom';
    cv.width = BOOM_CELL;
    cv.height = BOOM_CELL;
    const size = Math.round(BOOM_CELL * 1.5 * scale);
    cv.style.width = `${size}px`;
    cv.style.height = `${size}px`;
    cv.style.left = `${Math.round(x - size / 2)}px`;
    cv.style.top = `${Math.round(y - size / 2)}px`;
    document.body.append(cv);
    const img = boomImage(kind);
    const g = cv.getContext('2d');
    g.imageSmoothingEnabled = false;
    const t0 = performance.now();
    const tick = () => {
      const i = Math.min(BOOM_ROWS - 1, Math.floor((performance.now() - t0) / 70));
      g.clearRect(0, 0, BOOM_CELL, BOOM_CELL);
      if (img.complete && img.naturalWidth) {
        g.drawImage(img, col * BOOM_CELL, i * BOOM_CELL, BOOM_CELL, BOOM_CELL, 0, 0, BOOM_CELL, BOOM_CELL);
      }
      if (i < BOOM_ROWS - 1) requestAnimationFrame(tick);
      else setTimeout(() => cv.remove(), 80);
    };
    if (img.complete && img.naturalWidth) tick();
    else img.onload = tick;
    img.onerror = () => cv.remove();
  }

  // A small object thrown at the target: it flies in an arc and lands on it.
  projectile(x0, y0, x1, y1, ms = 340) {
    if (typeof document === 'undefined') return;
    const cv = document.createElement('canvas');
    cv.className = 'vfx-proj';
    cv.width = 8;
    cv.height = 8;
    cv.style.width = '8px';
    cv.style.height = '8px';
    document.body.append(cv);
    const g = cv.getContext('2d');
    g.imageSmoothingEnabled = false;
    const t0 = performance.now();
    const tick = () => {
      const u = Math.min(1, (performance.now() - t0) / ms);
      const x = x0 + (x1 - x0) * u;
      const y = y0 + (y1 - y0) * u - Math.sin(u * Math.PI) * 18;
      cv.style.left = `${Math.round(x - 4)}px`;
      cv.style.top = `${Math.round(y - 4)}px`;
      g.clearRect(0, 0, 8, 8);
      g.fillStyle = '#f4f1ea';
      g.fillRect(2, 2, 4, 4);
      g.fillStyle = '#9a98a4';
      g.fillRect(2, 2, 4, 1);
      g.fillRect(2, 5, 4, 1);
      if (u < 1) requestAnimationFrame(tick);
      else setTimeout(() => cv.remove(), 60);
    };
    tick();
  }

  // The screen (and the pet) shake on a heavy hit.
  shake(strength = 0.5) {
    if (typeof document === 'undefined') return;
    const b = document.body;
    b.classList.remove('combat-shake');
    void b.offsetWidth;      // restart the animation
    b.style.setProperty('--shake', String(Math.max(0.15, Math.min(1, strength))));
    b.classList.add('combat-shake');
    clearTimeout(this.shakeT);
    this.shakeT = setTimeout(() => b.classList.remove('combat-shake'), 220);
  }

  update(dt, head, hidden) {
    const { pet, sound } = this.app;
    if (pet.dead) return;
    const dm = pet.stats.mood - this.mood;
    const da = pet.affection - this.aff;
    this.mood = pet.stats.mood;
    this.aff = pet.affection;
    this.acc.mood += dm;
    this.acc.aff += da * 4;
    this.t -= dt;
    if (this.t <= 0 && !hidden && head) {
      this.t = 0.25;
      for (const [k, cls] of [['mood', 'red'], ['aff', 'pink']]) {
        const v = this.acc[k];
        if (Math.abs(v) < 0.6) continue;
        const n = Math.min(6, Math.ceil(Math.abs(v) / 2.5));
        for (let i = 0; i < n; i++) this.heart(v > 0 ? cls : 'broken', head, Math.abs(v) > 6);
        this.acc[k] = 0;
      }
      this.acc.mood *= 0.5;
      this.acc.aff *= 0.5;
    }
    // A rumble each time hunger drops another 5 points; louder the emptier the stomach.
    const step = Math.floor(pet.stats.hunger / 5);
    if (step < this.hungerStep && this.app.config.growl !== false && !this.app.config.focus) sound.growl(1 - pet.stats.hunger / 100);
    this.hungerStep = step;
  }
}
