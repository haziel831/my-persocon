// Reacts to what happens on the desktop: windows opening, closing, maximized or being dragged
// (with her riding on it, or not), lots of windows or none at all, the player going away and coming
// back, the mouse racing around. The Persocon comments and acts it out; the living Doll reacts too.
import { isFocus } from './focusmode.js';

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];

// Per-kind minimum gap (s) between two reactions of that kind.
const GAP = { winOpen: 70, winClose: 80, winMax: 120, winDrag: 50, winRide: 25, manyWindows: 600, emptyDesktop: 600, playerAway: 1, playerBack: 1, cursorFast: 150, cursorHover: 180 };

// Real time-of-day bands (local clock, no internet): manhã 06–11, tarde 12–18, noite 19–23, madrugada 00–05.
export const dayPeriod = (hour = new Date().getHours()) => (
  hour >= 6 && hour < 12 ? 'manha' : hour >= 12 && hour < 19 ? 'tarde' : hour >= 19 ? 'noite' : 'madrugada'
);
// A greeting can only happen once per real period change, with a long guard against clock jumps.
const PERIOD_GAP = 1800;

// The living Doll's reaction: an emoji bubble and, when it is free, a short pose.
export function dollReact(app, emoji, pose, dur = 1.6) {
  const doll = app.doll;
  const b = doll?.alive && doll.brain;
  if (!b || b.duo || b.waking != null) return;
  b.say(emoji, 2);
  const busy = b.task && !['idle', 'walk'].includes(b.task.pose);
  if (pose && !busy) {
    if (pose === 'jump') doll.throwUp?.(0, -app.pet.P * 2.6);
    else b.doFor(pose, dur);
  }
}

export class DesktopWatch {
  constructor(app) {
    this.app = app;
    this.ids = null;
    this.drag = new Map();
    this.last = {};
    this.cool = 20;
    this.idle = 0;
    this.away = false;
    this.cursor = null;
    this.fastT = 0;
    this.hoverT = 0;
    this.many = false;
    this.empty = false;
    this.period = null;
    this.periodAt = 0;
  }

  // One contextual greeting (and at most one little gesture) when the real period changes.
  dayTick() {
    const cfg = this.app.config;
    if (cfg.dayRoutine === false || isFocus(cfg, this.app)) return;
    const period = dayPeriod();
    if (this.period === null) {
      // Do not greet on launch — only on an actual change of period.
      this.period = period;
      this.periodAt = performance.now() / 1000;
      return;
    }
    if (period === this.period) return;
    const now = performance.now() / 1000;
    if (now - this.periodAt < PERIOD_GAP) return;
    this.period = period;
    this.periodAt = now;
    if (this.pet.dead || this.pet.unconscious || this.pet.mode === 'held') return;
    const calm = this.calm();
    if (period === 'manha') {
      if (calm) this.app.antics?.tryStart?.('stretch');
      // Morning tea/coffee, paid from her own wallet if a Cafeteira is placed.
      const station = Object.entries(this.app.game?.toys || {}).find(([key, t]) => key.split('#')[0] === 'cafeteira' && t.placed && !t.broken);
      if (station) this.app.casino?.vend?.click?.('cafeteira', station[1].x, station[1].y, () => {}, () => {});
    }
    if (period === 'madrugada' && calm) this.app.antics?.tryStart?.('yawn');
    this.app.speech?.sayPeriod?.(period);
  }

  get pet() {
    return this.app.pet;
  }

  // Free to act it out (otherwise she only comments).
  calm() {
    const p = this.pet;
    return !p.dead && !p.paused && !p.chase && !p.activity && !p.toyPlay && !p.eating && !p.hook && !p.ballPlay && !this.app.antics?.cur
      && p.mode === 'ground' && ['walk', 'idle', 'sit', 'emote'].includes(p.action) && !this.app.minigames?.active;
  }

  fire(kind, data = {}) {
    const now = performance.now() / 1000;
    if (this.app.config.desktopReactions === false || isFocus(this.app.config, this.app) || this.app.dndActive) return false;
    if (kind !== 'winRide' && this.cool > 0) return false;
    if (now - (this.last[kind] ?? -1e9) < (GAP[kind] ?? 60)) return false;
    if (this.pet.dead || this.pet.unconscious || this.pet.mode === 'held') return false;
    this.last[kind] = now;
    this.cool = rand(18, 30);
    this.pet.emit(kind, data);
    this.act(kind, data);
    return true;
  }

  // Face a point (a window) without walking.
  look(x) {
    const p = this.pet;
    if (!this.calm()) return;
    p.dir = x >= p.x ? 1 : -1;
    p.anim('idle', { facing: p.side() });
    p.action = 'idle';
    p.timer = rand(1.5, 3);
  }

  float(text) {
    const p = this.pet;
    this.app.toys.furn.floatText(p.x + rand(-6, 6), p.y - p.P * 1.2, text);
  }

  act(kind, d) {
    const { antics } = this.app;
    const calm = this.calm();
    switch (kind) {
      case 'winOpen':
        this.look(d.x);
        this.float('👀');
        dollReact(this.app, '👀', null);
        break;
      case 'winMax':
        this.float('😮');
        dollReact(this.app, '😮', null);
        break;
      case 'winClose':
        if (calm) antics?.tryStart('wave');
        dollReact(this.app, '👋', 'wave', 1.2);
        break;
      case 'winDrag':
        this.look(d.x);
        this.float(pick(['😵', '💨', '❗']));
        dollReact(this.app, '😵', null);
        break;
      case 'winRide':
        this.float(pick(['💨', '✨', '♪']));
        this.app.sound.tone8(600, 1200, 0.08, 'square', 0.04);
        break;
      case 'manyWindows':
        if (calm) antics?.tryStart('look');
        dollReact(this.app, '😵', null);
        break;
      case 'emptyDesktop':
        if (calm) antics?.tryStart('twirl');
        dollReact(this.app, '✨', 'jump');
        break;
      case 'playerAway':
        if (calm) antics?.tryStart(this.pet.stats.energy < 60 ? 'doze' : 'tap');
        dollReact(this.app, '💤', 'sleep', 8);
        break;
      case 'playerBack':
        if (calm) antics?.tryStart('hops');
        this.float('♥');
        dollReact(this.app, '🎉', 'cheer', 2);
        break;
      case 'cursorFast':
        this.float('😵');
        dollReact(this.app, '😵', null);
        break;
      case 'cursorHover':
        if (calm) antics?.tryStart('wave');
        dollReact(this.app, '👋', 'wave', 1.2);
        break;
    }
  }

  // After each world update: windows that appeared, vanished or are being dragged.
  onWorld(moved) {
    const { world } = this.app;
    const P = this.pet.P || 100;
    const wins = [...world.windows.values()];
    const ids = new Set(wins.map((w) => w.id));
    if (this.ids) {
      for (const w of wins) {
        if (this.ids.has(w.id) || w.w < P * 1.5 || w.h < P) continue;
        this.fire(w.maximized ? 'winMax' : 'winOpen', { x: w.x + w.w / 2 });
        break;
      }
      if ([...this.ids].some((id) => !ids.has(id))) this.fire('winClose');
    }
    this.ids = ids;
    // Dragging: steady movement for a moment.
    const now = performance.now();
    for (const [id, m] of moved) {
      const d = this.drag.get(id) || { dist: 0, t0: now };
      if (now - (d.last ?? now) > 400) {
        d.dist = 0;
        d.t0 = now;
      }
      d.dist += Math.hypot(m.dx, m.dy);
      d.last = now;
      this.drag.set(id, d);
      const ride = this.pet.surfaceId === id || this.pet.wall?.id === id;
      if (d.dist > P * (ride ? 1 : 2.5) && now - d.t0 > 300) {
        const w = world.window(id);
        if (ride) this.fire('winRide');
        else if (w) this.fire('winDrag', { x: w.x + w.w / 2 });
        d.dist = 0;
        d.t0 = now;
      }
    }
    const big = wins.filter((w) => w.w > P && w.h > P).length;
    if (!this.many && big >= 8) this.many = this.fire('manyWindows', { n: big }) || this.many;
    else if (big <= 5) this.many = false;
    if (!this.empty && big === 0) this.empty = this.fire('emptyDesktop') || this.empty;
    else if (big > 0) this.empty = false;
  }

  update(dt) {
    this.cool -= dt;
    this.dayTick();
    const c = this.pet.cursor;
    const P = this.pet.P || 100;
    if (!c) return;
    const prev = this.cursor;
    this.cursor = { x: c.x, y: c.y };
    const dist = prev ? Math.hypot(c.x - prev.x, c.y - prev.y) : 0;
    // Player away: the mouse still for 3 minutes; back as soon as it moves.
    if (dist < 2) {
      this.idle += dt;
      if (!this.away && this.idle > 180) {
        this.away = true;
        this.fire('playerAway');
      }
    } else {
      if (this.away && this.idle > 180) {
        this.cool = 0;
        this.fire('playerBack', { mins: Math.round(this.idle / 60) });
      }
      this.away = false;
      this.idle = 0;
    }
    // Mouse racing around the screen.
    const speed = dist / Math.max(dt, 1e-3);
    this.fastT = speed > P * 30 ? this.fastT + dt : Math.max(0, this.fastT - dt * 2);
    if (this.fastT > 0.8) {
      this.fastT = 0;
      this.fire('cursorFast');
    }
    // Resting the mouse right next to her.
    const p = this.pet;
    const near = dist < 3 && Math.abs(c.x - p.x) < P * 0.8 && c.y > p.y - P * 1.6 && c.y < p.y + P * 0.2;
    this.hoverT = near ? this.hoverT + dt : 0;
    if (this.hoverT > 6) {
      this.hoverT = -60;
      this.fire('cursorHover');
    }
  }
}
