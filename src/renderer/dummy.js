// Training dummy physics: bowling-pin sway about the post (does not slide on the floor).

export class TrainingDummy {
  constructor(app) {
    this.app = app;
    this.tilt = 0;
    this.w = 0;
    this.flash = 0;
    this.punch = 0;
  }

  get P() {
    return this.app.pet.P;
  }

  get rec() {
    return this.app.game.toys.boneco_treino;
  }

  get active() {
    const t = this.rec;
    return !!(t?.placed && !t.broken && this.app.toys.here?.(t));
  }

  get x() {
    return this.rec?.x ?? null;
  }

  get y() {
    return this.app.toys.floorY();
  }

  hit(dmg = 5, side = 1) {
    if (!this.active) return;
    // Stronger impulse + squash punch so each strike reads clearly.
    this.w += side * (0.38 + dmg * 0.055);
    this.flash = 0.5;
    this.punch = Math.min(1, (this.punch || 0) + 0.55 + dmg * 0.03);
    this.app.sound?.tone8?.(160 + dmg * 8, 50, 0.07, 'triangle', 0.12);
    this.app.sound?.tone8?.(90, 40, 0.05, 'square', 0.06);
  }

  idle() {}

  update(dt) {
    if (!this.active) {
      this.tilt = this.w = this.flash = this.punch = 0;
      const el = this.app.toys.els.get('boneco_treino');
      if (el) {
        el.style.transform = el.style.transform.replace(/rotate\([^)]*\)/g, '').replace(/scale\([^)]*\)/g, '').trim();
        el.style.filter = '';
      }
      return;
    }
    // Spring pulls upright; base stays planted (bowling pin).
    this.w += -this.tilt * 14 * dt;
    this.w *= Math.exp(-1.9 * dt);
    this.tilt += this.w * dt;
    this.tilt = Math.max(-0.95, Math.min(0.95, this.tilt));
    this.flash = Math.max(0, this.flash - dt);
    this.punch = Math.max(0, this.punch - dt * 3.2);
    const el = this.app.toys.els.get('boneco_treino');
    if (!el) return;
    // Fixed point = bottom of the stand on the floor; top sways sideways.
    el.style.transformOrigin = '50% 100%';
    const base = el.style.transform.replace(/rotate\([^)]*\)/g, '').replace(/scale\([^)]*\)/g, '').trim();
    // Squash from the base (pin compresses on impact, doesn't lift the feet).
    const s = 1 + this.punch * 0.12;
    const sy = 1 / Math.max(0.82, s);
    el.style.transform = `${base} rotate(${this.tilt}rad) scale(${s.toFixed(3)}, ${sy.toFixed(3)})`.trim();
    el.style.filter = this.flash > 0
      ? `brightness(${1.35 + this.flash * 0.5}) saturate(${0.25 + this.flash}) contrast(1.15)`
      : '';
  }
}
