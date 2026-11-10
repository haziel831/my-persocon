// The ball toy as a physics object: rolls, bounces on the floor/window tops/screen edges, the
// player can only grab and throw it (the cursor doesn't push it), and the pet chases, kicks,
// heads and throws it. Several ball kinds can sit on the desktop at once; one is "in play".
import { icon } from './pixel.js';
import { BALLS } from './furniture.js';

const clamp = (v, a, b) => Math.min(Math.max(v, a), b);

// Light and shadow that stay put while the ball art spins under them (17x17 grid, like the sprites).
let shadeUrl = null;
function shade() {
  if (shadeUrl) return shadeUrl;
  const c = document.createElement('canvas');
  c.width = c.height = 17;
  const g = c.getContext('2d');
  const [lx, ly, lz] = [-0.5, -0.6, 0.62];
  for (let y = 0; y < 17; y++) {
    for (let x = 0; x < 17; x++) {
      const dx = (x - 8) / 7.4;
      const dy = (y - 8) / 7.4;
      const d2 = dx * dx + dy * dy;
      if (d2 > 1) continue;
      const l = dx * lx + dy * ly + Math.sqrt(1 - d2) * lz;
      const a = l > 0.88 ? 0.45 : l > 0.7 ? 0.18 : l < 0.05 ? 0.38 : l < 0.3 ? 0.2 : 0;
      if (!a) continue;
      g.fillStyle = l > 0.5 ? `rgba(255,255,255,${a})` : `rgba(20,16,40,${a})`;
      g.fillRect(x, y, 1, 1);
    }
  }
  return (shadeUrl = c.toDataURL('image/png'));
}

function emptyBody() {
  return { el: null, x: null, y: 0, vx: 0, vy: 0, spin: 0, w: 0, bounceCool: 0 };
}

export class Ball {
  constructor(app) {
    this.app = app;
    this.bodies = new Map();
    this._focus = null;
    this.held = null;
    // Mirrored focus state (pet / toys read these).
    this.x = null;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.spin = 0;
    this.w = 0;
    this.bounceCool = 0;
  }

  get P() {
    return this.app.pet.P;
  }

  placedIds() {
    const toys = this.app.game.toys;
    return Object.keys(BALLS).filter((id) => toys[id]?.placed && !toys[id].broken && this.app.toys.here(toys[id]));
  }

  // Prefer a specific ball for play (e.g. dodgeball session).
  focusOn(id) {
    if (!id || !BALLS[id]) return;
    if (this._focus && this._focus !== id) this.stashFocus();
    this._focus = id;
    this.pullFocus();
  }

  get id() {
    const ids = this.placedIds();
    if (this._focus && ids.includes(this._focus)) return this._focus;
    return ids[0] || null;
  }

  get kind() {
    return BALLS[this.id] || BALLS.bola;
  }

  get mode() {
    return this.kind.mode;
  }

  get rec() {
    return this.app.game.toys[this.id];
  }

  get r() {
    return this.P * this.kind.size;
  }

  get active() {
    return !!this.id;
  }

  // Legacy single-el accessor (grab/update of focus).
  get el() {
    return this.bodies.get(this.id)?.el || null;
  }

  stashFocus() {
    const id = this._focus;
    if (!id) return;
    let b = this.bodies.get(id);
    if (!b) b = emptyBody();
    b.x = this.x;
    b.y = this.y;
    b.vx = this.vx;
    b.vy = this.vy;
    b.spin = this.spin;
    b.w = this.w;
    b.bounceCool = this.bounceCool;
    this.bodies.set(id, b);
    const rec = this.app.game.toys[id];
    if (rec && this.x != null) {
      rec.x = this.x;
      rec.ballY = this.y;
    }
  }

  pullFocus() {
    const id = this.id;
    if (!id) {
      this.x = null;
      return;
    }
    const b = this.bodies.get(id) || emptyBody();
    this.bodies.set(id, b);
    const rec = this.app.game.toys[id];
    const floor = this.app.world.surfaces[0]?.y ?? innerHeight;
    const r = this.P * BALLS[id].size;
    if (b.x != null) {
      this.x = b.x;
      this.y = b.y;
      this.vx = b.vx;
      this.vy = b.vy;
      this.spin = b.spin;
      this.w = b.w;
      this.bounceCool = b.bounceCool;
    } else if (rec) {
      this.x = rec.x ?? this.app.world.width / 2;
      this.y = rec.ballY ?? floor - r;
      this.vx = this.vy = this.w = this.spin = 0;
      this.bounceCool = 0;
    } else {
      this.x = null;
    }
  }

  ensureBody(id) {
    let b = this.bodies.get(id);
    if (!b) {
      b = emptyBody();
      this.bodies.set(id, b);
    }
    if (b.el && b.el.dataset.id === id) return b;
    b.el?.remove();
    const el = (b.el = document.createElement('div'));
    el.className = 'toy ball';
    el.title = 'Arraste e solte para jogar a bola · botão direito guarda no inventário';
    el.dataset.id = id;
    const kind = BALLS[id];
    el.innerHTML = `<img src="${this.app.skins?.art(id, icon(kind.pix)) || icon(kind.pix)}" draggable="false"><i class="ball-shade" style="background-image:url(${shade()})"></i>`;
    el.addEventListener('pointerdown', (e) => this.grab(e, id));
    el.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.app.toys.contextMenu(id, e.clientX, e.clientY);
    });
    document.body.append(el);
    return b;
  }

  kick(vx, vy) {
    this.vx = vx * 0.7;
    this.vy = vy * 0.8;
    this.w = (this.vx / this.r) * 0.6;
    this.bounceCool = 0;
    this.app.sound.tone8(260, 140, 0.08, 'square', 0.12);
  }

  set(x, y) {
    this.x = x;
    this.y = y;
    this.vx = this.vy = this.w = 0;
  }

  // Target for the pet's grappling hook.
  hookTarget() {
    const self = this;
    return {
      get x() { return self.x; },
      get y() { return self.y; },
      move: (x, y) => this.set(x, y),
      done: () => this.kick(0, -this.P * 2),
    };
  }

  grab(e, id = this.id) {
    if (e.button !== 0) return;
    e.stopPropagation();
    this.focusOn(id);
    const body = this.ensureBody(id);
    const el = body.el;
    try {
      el.setPointerCapture(e.pointerId);
    } catch {}
    this.held = { hist: [{ t: performance.now(), x: e.clientX, y: e.clientY }], id };
    this.set(e.clientX, e.clientY);
    const move = (ev) => {
      this.set(ev.clientX, ev.clientY);
      const h = this.held.hist;
      h.push({ t: performance.now(), x: ev.clientX, y: ev.clientY });
      while (h.length > 2 && h[h.length - 1].t - h[0].t > 100) h.shift();
    };
    const up = () => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
      const h = this.held.hist;
      this.held = null;
      const a = h[0];
      const b = h[h.length - 1];
      const dt = (b.t - a.t) / 1000;
      if (dt > 0.01) {
        const max = this.P * 16;
        this.vx = clamp(((b.x - a.x) / dt) * 0.65, -max, max);
        this.vy = clamp(((b.y - a.y) / dt) * 0.65, -max, max);
        this.w = (this.vx / this.r) * 0.4;
      }
      const pet = this.app.pet;
      if (Math.hypot(this.vx, this.vy) > this.P * 3 || Math.abs(this.x - pet.x) < this.P * 2.5) pet.ballThrown();
      if (this.rec) this.rec.x = this.x;
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
  }

  hit(x, y) {
    const el = this.el;
    if (!el || el.style.display === 'none') return false;
    return Math.hypot(x - this.x, y - this.y) < this.r + 6;
  }

  // One physics substep: gravity, air drag, spin (w, rad/s), bounces with friction and rolling.
  step(dt, r, W, floor) {
    const { pet, world } = this.app;
    const k = this.kind;
    const y0 = this.y;
    this.vy = Math.min(this.vy + pet.gravity * k.grav * dt, this.P * 30);
    const drag = Math.exp(-(k.drag ?? 0.12) * dt);
    this.vx *= drag;
    this.vy *= drag;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.w *= Math.exp(-0.3 * dt);
    if (this.x < r || this.x > W - r) {
      this.x = clamp(this.x, r, W - r);
      this.vx = -this.vx * (0.55 + k.bounce * 0.3);
      this.vy += this.w * r * 0.15;
      this.w *= -0.5;
      this.thud(Math.abs(this.vx));
    }
    if (this.y < r) {
      this.y = r;
      this.vy = Math.abs(this.vy) * 0.5;
    }
    const s = this.vy >= 0 ? world.landing(this.x, y0 + r, this.y + r) : null;
    const ground = s ? s.y : this.y + r >= floor ? floor : null;
    if (ground === null) return;
    this.y = ground - r;
    const slip = this.vx - this.w * r;
    const grip = this.vy > this.P * 0.9 ? 0.35 : Math.min(1, dt * 14);
    this.vx -= slip * grip * 0.4;
    this.w += (slip * grip * 0.6) / r;
    if (this.vy > this.P * 0.9) {
      this.thud(this.vy);
      this.vy = -this.vy * k.bounce;
    } else {
      this.vy = 0;
      this.vx *= Math.exp(-(k.roll ?? 0.9) * dt);
      if (Math.abs(this.vx) < 1.5) this.vx = 0;
      this.w = this.vx / r;
    }
  }

  thud(v) {
    if (this.bounceCool > 0) return;
    this.app.sound.tone8(180, 90, 0.05, 'triangle', Math.min(0.12, v / (this.P * 120)));
    this.bounceCool = 0.08;
  }

  // Hitting the Doll knocks it over; the ball bounces back off it.
  hitDoll(r) {
    const d = this.app.doll;
    if (!d?.el || d.x == null || d.held || d.el.style.display === 'none') return;
    const cx = d.x;
    const cy = d.y - d.h * 0.5;
    const dx = this.x - cx;
    const dy = this.y - cy;
    const hw = d.h * 0.22 + r;
    const hh = d.h * 0.5 + r;
    if (Math.abs(dx) > hw || Math.abs(dy) > hh) return;
    const rel = Math.hypot(this.vx - d.vx, this.vy - d.vy);
    if (rel < this.P * 1.2) return;
    const side = Math.sign(dx) || 1;
    this.x = cx + side * hw;
    d.knock?.(this.vx * 0.45, -Math.min(this.P * 4, rel * 0.25), this);
    this.vx = side * Math.abs(this.vx) * 0.45;
    this.thud(rel);
  }

  paintBody(id, hidden, floor) {
    const kind = BALLS[id];
    const r = this.P * kind.size;
    const body = this.ensureBody(id);
    const focus = id === this.id;
    if (!focus) {
      // Parked balls sit on the floor at their saved x (no shared physics).
      const rec = this.app.game.toys[id];
      if (body.x == null) {
        body.x = rec?.x ?? this.app.world.width / 2;
        body.y = rec?.ballY ?? floor - r;
      }
      body.vx = body.vy = body.w = 0;
    } else {
      body.x = this.x;
      body.y = this.y;
      body.vx = this.vx;
      body.vy = this.vy;
      body.spin = this.spin;
      body.w = this.w;
      body.bounceCool = this.bounceCool;
      if (this.rec) {
        this.rec.x = this.x;
        this.rec.ballY = this.y;
      }
    }
    const art = this.app.skins?.art(id, null);
    const im = body.el.firstElementChild;
    if (im && art && im.getAttribute('src') !== art) im.src = art;
    const s = Math.round(r * 2);
    const bx = focus ? this.x : body.x;
    const by = focus ? this.y : body.y;
    body.el.style.display = hidden ? 'none' : 'block';
    body.el.style.width = `${s}px`;
    body.el.style.height = `${s}px`;
    body.el.style.transform = `translate(${Math.round(bx - r)}px, ${Math.round(by - r)}px)`;
    if (im) im.style.transform = `rotate(${(focus ? this.spin : body.spin) || 0}rad)`;
    const sh = body.el.lastElementChild;
    if (sh) sh.style.display = art ? 'none' : '';
  }

  // A setup was loaded: the records hold the new positions, so the cached bodies are dropped
  // and the balls read them again on the next focus.
  syncFromRecords() {
    for (const [id, b] of this.bodies) {
      const rec = this.app.game.toys[id];
      if (!rec) continue;
      b.x = rec.x;
      b.y = rec.ballY ?? b.y;
      b.vx = b.vy = b.w = b.spin = 0;
      b.bounceCool = 0;
    }
    this.pullFocus();
  }

  update(dt, hidden) {
    const { pet, world } = this.app;
    const ids = this.placedIds();
    for (const [id, b] of [...this.bodies]) {
      if (!ids.includes(id)) {
        b.el?.remove();
        this.bodies.delete(id);
        if (this._focus === id) this._focus = null;
      }
    }
    if (!ids.length) {
      pet.ball = null;
      this.x = null;
      this.held = null;
      return;
    }
    if (!this._focus || !ids.includes(this._focus)) {
      this._focus = ids[0];
      this.pullFocus();
    }
    pet.ball = this;
    const floor = world.surfaces[0]?.y ?? innerHeight;
    const r = this.r;
    const W = world.width;
    if (this.x === null) this.set(this.rec?.x ?? W / 2, floor - r);

    if (!this.held && !(pet.hook?.target && pet.hook.phase === 'pull' && pet.hook.kind === 'pull')) {
      this.bounceCool -= dt;
      const n = clamp(Math.ceil((Math.hypot(this.vx, this.vy) * dt) / (r * 0.5)), 1, 8);
      for (let i = 0; i < n; i++) this.step(dt / n, r, W, floor);
      this.hitDoll(r);
      this.spin += this.w * dt;
    }

    for (const id of ids) this.paintBody(id, hidden, floor);
  }
}
