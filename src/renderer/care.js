// Tiredness and hygiene on screen: sweat drops after effort (pet.exertion) or when exhausted,
// stink waves and a fly when dirty, refusing hard play when drained, and baths (menu "Dar banho"
// or the Banheira furniture) with soap bubbles.
import { icon, defineIcons } from './pixel.js';

const rand = (a, b) => a + Math.random() * (b - a);

defineIcons({
  sweat: (sprite) => sprite(5, 7, ({ rect }) => {
    rect(2, 0, 1, 1, '#bfe8ff'); rect(1, 1, 3, 2, '#8fd3ff'); rect(0, 3, 5, 3, '#5fb8ff'); rect(1, 6, 3, 1, '#3c8fe0'); rect(1, 3, 1, 2, '#ffffff');
  }),
  stink: (sprite) => sprite(5, 12, ({ rect }) => {
    const c = '#9cc84a';
    [[2, 0], [3, 1], [3, 2], [2, 3], [1, 4], [1, 5], [2, 6], [3, 7], [3, 8], [2, 9], [1, 10], [1, 11]].forEach(([x, y]) => rect(x, y, 1, 1, c));
  }, null),
  fly: (sprite) => sprite(7, 5, ({ rect }) => {
    rect(1, 0, 2, 2, '#d8eeff'); rect(4, 0, 2, 2, '#d8eeff'); rect(2, 2, 3, 3, '#2b2b36'); rect(3, 2, 1, 1, '#c33');
  }),
});

export class Care {
  constructor(app) {
    this.app = app;
    this.sweatT = 0;
    this.stinkT = 0;
    this.fly = null;
    this.t = 0;
    app.care = this;
  }

  get P() {
    return this.app.pet.P;
  }

  particle(cls, img, x, y, size, life, vars = {}) {
    const el = document.createElement('div');
    el.className = cls;
    if (img) el.style.backgroundImage = `url(${icon(img)})`;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.width = `${size}px`;
    el.style.height = `${img === 'stink' ? size * 2.4 : size * (img === 'sweat' ? 1.4 : 1)}px`;
    for (const [k, v] of Object.entries(vars)) el.style.setProperty(k, v);
    document.body.append(el);
    setTimeout(() => el.remove(), life);
  }

  // Drops flying off the head.
  sweat(n = 1) {
    const h = this.app.head;
    if (!h) return;
    const P = this.P;
    for (let i = 0; i < n; i++) {
      const side = Math.random() < 0.5 ? -1 : 1;
      this.particle('fx-sweat', 'sweat', h.x + side * P * rand(0.08, 0.2), h.y + P * rand(0.02, 0.15), Math.round(P * 0.05), 900,
        { '--dx': `${side * rand(8, 22)}px` });
    }
  }

  stink() {
    const { pet } = this.app;
    const P = this.P;
    this.particle('fx-stink', 'stink', pet.x + rand(-0.3, 0.3) * P, pet.y - P * rand(0.35, 0.8), Math.round(P * 0.05), 1800,
      { '--dx': `${rand(-10, 10)}px` });
  }

  bubbles(n, x0, x1, y0, y1) {
    for (let i = 0; i < n; i++) {
      const s = Math.round(this.P * rand(0.03, 0.08));
      this.particle('fx-bubble', null, rand(x0, x1) - s / 2, rand(y0, y1), s, 1400, { '--dx': `${rand(-12, 12)}px`, '--dy': `${-rand(25, 60)}px` });
    }
  }

  // "Dar banho" (menu): soap bubbles all over, scrubbing wiggle.
  // fromQueue: already dequeued — start now even if she just freed up.
  bath(fromQueue = false) {
    const { pet } = this.app;
    if (pet.dead || pet.mode !== 'ground' || pet.chase || this.app.minigames?.active) return false;
    if (pet.toyPlay?.id === 'banho') return false;
    if (!fromQueue && pet.busyForQueue?.()) {
      pet.enqueue({ kind: 'bath', label: 'Banho' });
      return true;
    }
    if (pet.toyPlay) pet.endToy(true);
    if (pet.activity) pet.stopActivity?.();
    pet.playToy({
      id: 'banho', dur: 7, anim: 'idle', facing: 'front', gain: { hygiene: 15, mood: 0.6 },
      tick: (dt, tp) => this.bathTick(dt, tp, false),
      onEnd: (interrupted) => this.bathEnd(interrupted),
    });
    pet.emit('bath');
    return true;
  }

  // Neon laser lines sweeping over a box of the screen (the laser stall).
  laserScan(r, life) {
    const el = document.createElement('div');
    el.className = 'laser-scan';
    Object.assign(el.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` });
    document.body.append(el);
    setTimeout(() => el.remove(), life);
  }

  // stall: the element of the upgraded tub (laser stall) instead of the bubbles.
  bathTick(dt, tp, tub, stall = null) {
    const { pet, sound } = this.app;
    const P = this.P;
    if (stall) {
      tp.bub = (tp.bub ?? 0) - dt;
      if (tp.bub <= 0) {
        tp.bub = 1.2;
        const r = stall.getBoundingClientRect();
        this.laserScan({ left: r.left + r.width * 0.1, top: r.top + r.height * 0.1, width: r.width * 0.8, height: r.height * 0.8 }, 1200);
      }
      tp.zap = (tp.zap ?? 0) - dt;
      if (tp.zap <= 0) {
        tp.zap = rand(0.15, 0.4);
        sound.tone8(2400 + Math.random() * 800, 500, 0.05, 'square', 0.018);
      }
      pet.exertion = Math.max(0, pet.exertion - 6 * dt);
      return;
    }
    tp.bub = (tp.bub ?? 0) - dt;
    if (tp.bub <= 0) {
      tp.bub = 0.09;
      if (tub) this.bubbles(2, pet.x - P * 0.35, pet.x + P * 0.35, pet.y - P * 0.42, pet.y - P * 0.3);
      else this.bubbles(2, pet.x - P * 0.28, pet.x + P * 0.28, pet.y - P * 0.95, pet.y - P * 0.1);
      if (Math.random() < 0.25) sound.tone8(1200 + Math.random() * 600, 1800, 0.04, 'triangle', 0.025);
    }
    if (!tub) {
      const w = Math.sin(tp.t * 13);
      pet.squash = { x: 1 + 0.02 * w, y: 1 - 0.02 * w };
    }
    pet.exertion = Math.max(0, pet.exertion - 6 * dt);
  }

  bathEnd(interrupted, laser = false) {
    const { pet, sound } = this.app;
    pet.squash = null;
    if (interrupted) return;
    sound.tone8(700, 1400, 0.15, laser ? 'square' : 'triangle', 0.05);
    const h = this.app.head;
    if (h && !laser) this.bubbles(8, h.x - this.P * 0.4, h.x + this.P * 0.4, h.y, h.y + this.P * 0.4);
    pet.emit('bathEnd');
  }

  // Hard play refused when too thirsty/hungry/tired (with a reason).
  refuse() {
    const { pet } = this.app;
    const why = pet.drained();
    if (!why) return false;
    pet.emit('refuse', { why });
    this.app.minigames?.toast?.({ thirst: 'Ela está com muita sede para brincar agora', hunger: 'Ela está com muita fome para brincar agora', energy: 'Ela está cansada demais para brincar agora' }[why]);
    return true;
  }

  update(dt, hidden) {
    const { pet } = this.app;
    const h = this.app.head;
    this.t += dt;
    const off = hidden || pet.dead || !h || pet.mode === 'dragged';
    const asleep = pet.action === 'sleep';
    const s = pet.stats;
    if (!off && !asleep) {
      const sweaty = pet.exertion > 60 || (s.energy < 8 && pet.action === 'run');
      if (sweaty && (this.sweatT -= dt) <= 0) {
        this.sweatT = pet.exertion > 85 ? rand(1.2, 2.2) : rand(2.5, 4.5);
        this.sweat(1);
      } else if (!sweaty) this.sweatT = Math.max(this.sweatT, rand(0.8, 1.6));
    }
    if (!off && s.hygiene < 30 && pet.toyPlay?.id !== 'banho' && pet.toyPlay?.id !== 'banheira' && (this.stinkT -= dt) <= 0) {
      this.stinkT = s.hygiene < 15 ? rand(0.5, 0.9) : rand(1, 1.8);
      this.stink();
    }
    // A fly buzzes around her head when really dirty.
    if (!off && s.hygiene < 15) {
      if (!this.fly) {
        this.fly = document.createElement('div');
        this.fly.className = 'fx-fly';
        this.fly.style.backgroundImage = `url(${icon('fly')})`;
        document.body.append(this.fly);
      }
      const P = this.P;
      const t = this.t;
      const x = h.x + Math.cos(t * 2.6) * P * 0.38 + Math.sin(t * 9) * 4;
      const y = h.y + P * 0.05 + Math.sin(t * 3.7) * P * 0.12 + Math.cos(t * 11) * 3;
      const sz = Math.round(P * 0.05);
      this.fly.style.width = `${sz}px`;
      this.fly.style.height = `${Math.round(sz * 0.72)}px`;
      this.fly.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px) scaleX(${Math.sin(t * 2.6) > 0 ? -1 : 1})`;
    } else if (this.fly) {
      this.fly.remove();
      this.fly = null;
    }
  }
}
