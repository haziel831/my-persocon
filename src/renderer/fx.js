// Feedback particles around the pet: red hearts when Humor goes up, pink hearts for Afeição,
// black broken hearts when either goes down (more of them the bigger the change). Also the
// stomach rumble every 5 points of hunger lost and the burst when drinking potions/power-ups.
import { icon } from './pixel.js';
import { isPowerUp } from './game.js';

// Impact effects for the melee (pixel sheets from 06_VFX): the strike spark, the slash, the
// dust and the metallic shield. Drawn on a small canvas, one frame at a time.
const IMPACT = {
  spark: { file: 'electric-impact', frames: 14, cols: 5, cell: 96, ms: 50, scale: 0.6 },
  rust: { file: 'electric-impact', frames: 14, cols: 5, cell: 96, ms: 50, scale: 0.5, tint: 'sepia(1) saturate(3.4) hue-rotate(-18deg) brightness(0.9)' },
  slash: { file: 'crescent-slash', frames: 10, cols: 5, cell: 96, ms: 50, scale: 0.85 },
  burst: { file: 'warm-explosion', frames: 15, cols: 5, cell: 96, ms: 50, scale: 0.8 },
  dust: { file: 'smoke-puff', frames: 14, cols: 5, cell: 96, ms: 50, scale: 0.5 },
  shield: { file: 'electric-impact', frames: 14, cols: 5, cell: 96, ms: 50, scale: 0.5, tint: 'grayscale(0.4) brightness(1.5) contrast(1.2)' },
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

  // A melee impact at (x, y): the pixel sheet of the effect, played frame by frame.
  impact(kind, x, y, scale = 1) {
    const def = IMPACT[kind];
    if (!def || typeof document === 'undefined') return;
    const cv = document.createElement('canvas');
    cv.className = 'vfx-impact';
    cv.width = def.cell;
    cv.height = def.cell;
    const size = Math.round(def.cell * def.scale * scale);
    cv.style.width = `${size}px`;
    cv.style.height = `${size}px`;
    cv.style.left = `${Math.round(x - size / 2)}px`;
    cv.style.top = `${Math.round(y - size / 2)}px`;
    if (def.tint) cv.style.filter = def.tint;
    document.body.append(cv);
    const img = new Image();
    img.src = new URL(`./assets/vfx/${def.file}.png`, import.meta.url).href;
    const g = cv.getContext('2d');
    g.imageSmoothingEnabled = false;
    const t0 = performance.now();
    const tick = () => {
      const i = Math.min(def.frames - 1, Math.floor((performance.now() - t0) / def.ms));
      const sx = (i % def.cols) * def.cell;
      const sy = Math.floor(i / def.cols) * def.cell;
      g.clearRect(0, 0, def.cell, def.cell);
      g.drawImage(img, sx, sy, def.cell, def.cell, 0, 0, def.cell, def.cell);
      if (i < def.frames - 1) requestAnimationFrame(tick);
      else setTimeout(() => cv.remove(), 60);
    };
    if (img.complete && img.naturalWidth) tick();
    else img.onload = tick;
    img.onerror = () => cv.remove();
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
