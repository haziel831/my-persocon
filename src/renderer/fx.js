// Feedback particles around the pet: red hearts when Humor goes up, pink hearts for Afeição,
// black broken hearts when either goes down (more of them the bigger the change). Also the
// stomach rumble every 5 points of hunger lost and the burst when drinking potions/power-ups.
import { icon } from './pixel.js';
import { isPowerUp } from './game.js';
import { VfxSequence, VFX_FOLDERS } from './vfx.js';
import { isFocus } from './focusmode.js';

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

// Tinta dos golpes de espada: cor base + brilho (usada nos arcos, faíscas e flashes).
const BLADE_TINT = {
  cyan: ['#aef6ff', 'rgba(70, 220, 255, 0.95)'],
  white: ['#ffffff', 'rgba(215, 240, 255, 0.95)'],
  crimson: ['#ff9ab0', 'rgba(255, 40, 90, 0.95)'],
  gold: ['#ffeaa6', 'rgba(255, 200, 60, 0.95)'],
  purple: ['#d3b6ff', 'rgba(150, 90, 255, 0.95)'],
  blue: ['#9fd0ff', 'rgba(60, 150, 255, 0.95)'],
};
const tintOf = (c) => BLADE_TINT[c] || BLADE_TINT.cyan;

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

  // The dash trail: a short motion blur behind her while she runs (few frames, cheap).
  dashTrail(x, y, size = 90, dir = 1) {
    if (typeof document === 'undefined') return;
    const el = document.createElement('div');
    el.className = 'dash-trail';
    const w = Math.round(size * 0.95);
    const h = Math.round(size * 0.42);
    el.style.width = `${w}px`;
    el.style.height = `${h}px`;
    el.style.left = `${Math.round(x - w / 2)}px`;
    el.style.top = `${Math.round(y - h / 2)}px`;
    el.style.setProperty('--dx', `${Math.round(-dir * size * 0.55)}px`);
    document.body.append(el);
    setTimeout(() => el.remove(), 280);
  }

  // The healing particles of a medicine used in combat: green crosses + blue sparkles.
  heal(x, y, size = 120) {
    if (typeof document === 'undefined') return;
    const n = 14;
    for (let i = 0; i < n; i++) {
      const el = document.createElement('div');
      el.className = 'heal-spark';
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.5;
      const r = size * (0.18 + Math.random() * 0.3);
      el.style.left = `${Math.round(x + Math.cos(a) * r)}px`;
      el.style.top = `${Math.round(y + Math.sin(a) * r * 0.55)}px`;
      const green = i % 2 === 0;
      el.style.background = green ? '#8f8' : '#9cf';
      el.style.boxShadow = green ? '0 0 6px 2px rgba(90, 240, 120, 0.85)' : '0 0 6px 2px rgba(90, 170, 255, 0.85)';
      el.style.setProperty('--dy', `${Math.round(-size * (0.5 + Math.random() * 0.45))}px`);
      el.style.setProperty('--delay', `${(Math.random() * 0.3).toFixed(2)}s`);
      document.body.append(el);
      setTimeout(() => el.remove(), 900);
    }
    const ring = document.createElement('div');
    ring.className = 'fx-ring';
    const s = Math.round(size * 1.1);
    ring.style.width = ring.style.height = `${s}px`;
    ring.style.left = `${Math.round(x - s / 2)}px`;
    ring.style.top = `${Math.round(y - s / 2)}px`;
    ring.style.borderColor = '#8f8';
    document.body.append(ring);
    setTimeout(() => ring.remove(), 900);
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

  // The charge before a strike: the aura around her + the rising energy particles.
  // color: 'red' (a normal strike / the crimson blast), 'blue' or 'gold' (a special).
  charge(x, y, size = 120, ms = 450, color = 'red') {
    if (typeof document === 'undefined') return;
    const el = document.createElement('div');
    el.className = `combat-aura charge${color && color !== 'red' ? ` ${color}` : ''}`;
    const s = Math.round(size * 0.95);
    el.style.width = el.style.height = `${s}px`;
    el.style.left = `${Math.round(x)}px`;
    el.style.top = `${Math.round(y)}px`;
    document.body.append(el);
    setTimeout(() => el.remove(), ms + 150);
    // The particles rising around her, in the color of the charge.
    const tint = {
      red: ['#ff8a7a', 'rgba(255, 40, 40, 0.9)'],
      blue: ['#8cc8ff', 'rgba(60, 150, 255, 0.9)'],
      gold: ['#ffd98a', 'rgba(255, 195, 60, 0.9)'],
    }[color] || ['#ff8a7a', 'rgba(255, 40, 40, 0.9)'];
    const n = 16;
    for (let i = 0; i < n; i++) {
      const p = document.createElement('div');
      p.className = 'charge-spark';
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.4;
      const r = size * (0.16 + Math.random() * 0.24);
      p.style.left = `${Math.round(x + Math.cos(a) * r)}px`;
      p.style.top = `${Math.round(y + Math.sin(a) * r * 0.55)}px`;
      p.style.background = tint[0];
      p.style.boxShadow = `0 0 6px 2px ${tint[1]}`;
      p.style.setProperty('--dy', `${Math.round(-size * (0.45 + Math.random() * 0.4))}px`);
      p.style.setProperty('--delay', `${(Math.random() * (ms / 1000) * 0.65).toFixed(2)}s`);
      document.body.append(p);
      setTimeout(() => p.remove(), ms + 450);
    }
  }

  // A onda de partículas que sai do centro dela (a guarda suprema): um anel dourado
  // que se abre e faíscas voando para todos os lados.
  wave(x, y, size = 160, color = 'gold') {
    if (typeof document === 'undefined') return;
    const el = document.createElement('div');
    el.className = `combat-wave ${color}`;
    el.style.left = `${Math.round(x)}px`;
    el.style.top = `${Math.round(y)}px`;
    el.style.setProperty('--wave', `${Math.max(2, Math.round(size / 10))}`);
    document.body.append(el);
    setTimeout(() => el.remove(), 900);
    const tint = {
      gold: ['#ffe89a', 'rgba(255, 205, 70, 0.95)'],
      blue: ['#a8dcff', 'rgba(60, 150, 255, 0.9)'],
      white: ['#ffffff', 'rgba(220, 240, 255, 0.9)'],
    }[color] || ['#ffe89a', 'rgba(255, 205, 70, 0.95)'];
    const n = 18;
    for (let i = 0; i < n; i++) {
      const p = document.createElement('div');
      p.className = 'wave-spark';
      const a = (i / n) * Math.PI * 2;
      p.style.left = `${Math.round(x)}px`;
      p.style.top = `${Math.round(y)}px`;
      p.style.background = tint[0];
      p.style.boxShadow = `0 0 7px 2px ${tint[1]}`;
      p.style.setProperty('--dx', `${Math.round(Math.cos(a) * size * 0.55)}px`);
      p.style.setProperty('--dy', `${Math.round(Math.sin(a) * size * 0.32)}px`);
      p.style.setProperty('--delay', `${(i % 4) * 0.03}s`);
      document.body.append(p);
      setTimeout(() => p.remove(), 950);
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

  // ---------- lâmina: VFX do combate de espada ----------

  // O crescente luminoso do corte. É um SVG (arco grosso colorido + fio branco) que gira
  // no ângulo do golpe e se abre/fecha em ~260 ms.
  slashArc(x, y, size = 130, opts = {}) {
    if (typeof document === 'undefined') return null;
    const ns = 'http://www.w3.org/2000/svg';
    const [base, glow] = tintOf(opts.color || 'cyan');
    const s = Math.max(30, Math.round(size));
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('class', `fx-slash${opts.mirror ? ' mirror' : ''}`);
    svg.style.width = `${s}px`;
    svg.style.height = `${s}px`;
    svg.style.left = `${Math.round(x - s / 2)}px`;
    svg.style.top = `${Math.round(y - s / 2)}px`;
    svg.style.setProperty('--rot', `${opts.angle ?? -18}deg`);
    svg.style.setProperty('--glow', glow);
    if (opts.ms) svg.style.animationDuration = `${opts.ms}ms`;
    const d = opts.path || 'M 6 84 Q 50 -8 94 84';
    for (const [width, color, opacity] of [[7, base, 0.95], [2.2, '#ffffff', 1]]) {
      const p = document.createElementNS(ns, 'path');
      p.setAttribute('d', d);
      p.setAttribute('fill', 'none');
      p.setAttribute('stroke', color);
      p.setAttribute('stroke-width', String(width));
      p.setAttribute('stroke-linecap', 'round');
      p.setAttribute('opacity', String(opacity));
      svg.append(p);
    }
    document.body.append(svg);
    setTimeout(() => svg.remove(), (opts.ms || 300) + 140);
    return svg;
  }

  // O X de dois cortes (combo): dois crescentes cruzados, um logo depois do outro.
  slashX(x, y, size = 150, opts = {}) {
    this.slashArc(x, y, size, { ...opts, angle: -40, ms: opts.ms ?? 380 });
    setTimeout(() => this.slashArc(x, y, size, { ...opts, angle: 40, mirror: true, ms: opts.ms ?? 380 }), opts.stagger ?? 70);
  }

  // O brilho metálico (embainhar a espada, aparar): uma estrela de quatro pontas.
  glint(x, y, size = 46, color = 'white') {
    if (typeof document === 'undefined') return;
    const el = document.createElement('div');
    el.className = 'fx-glint';
    const s = Math.max(16, Math.round(size));
    el.style.width = `${s}px`;
    el.style.height = `${s}px`;
    el.style.left = `${Math.round(x - s / 2)}px`;
    el.style.top = `${Math.round(y - s / 2)}px`;
    el.style.setProperty('--glow', tintOf(color)[1]);
    document.body.append(el);
    setTimeout(() => el.remove(), 460);
  }

  // Faíscas direcionais do impacto: saem num cone (angle) na direção do corte.
  sparks(x, y, opts = {}) {
    if (typeof document === 'undefined') return;
    const n = opts.count ?? 16;
    const [base, glow] = tintOf(opts.color || 'white');
    const ang = opts.angle ?? -Math.PI / 2;
    const spread = opts.spread ?? 1.15;
    const reach = opts.reach ?? 74;
    for (let i = 0; i < n; i++) {
      const el = document.createElement('div');
      el.className = 'fx-hit-spark';
      const a = ang + (Math.random() - 0.5) * spread;
      const r = reach * (0.45 + Math.random() * 0.8);
      el.style.left = `${Math.round(x)}px`;
      el.style.top = `${Math.round(y)}px`;
      el.style.background = i % 3 === 0 ? '#ffffff' : base;
      el.style.boxShadow = `0 0 6px 2px ${glow}`;
      el.style.setProperty('--dx', `${Math.round(Math.cos(a) * r)}px`);
      el.style.setProperty('--dy', `${Math.round(Math.sin(a) * r)}px`);
      el.style.setProperty('--del', `${(Math.random() * 0.05).toFixed(2)}s`);
      document.body.append(el);
      setTimeout(() => el.remove(), 600);
    }
  }

  // O flash diagonal que atravessa o hitbox no impacto (hit-stop visual).
  impactSlash(x, y, size = 120, opts = {}) {
    if (typeof document === 'undefined') return;
    const el = document.createElement('div');
    el.className = 'fx-impact-slash';
    const w = Math.round(size);
    const h = Math.round(size * 0.42);
    el.style.width = `${w}px`;
    el.style.height = `${h}px`;
    el.style.left = `${Math.round(x - w / 2)}px`;
    el.style.top = `${Math.round(y - h / 2)}px`;
    el.style.setProperty('--rot', `${opts.angle ?? -32}deg`);
    el.style.setProperty('--glow', tintOf(opts.color || 'white')[1]);
    document.body.append(el);
    setTimeout(() => el.remove(), 460);
  }

  // Uma silhueta fantasma: recorta o próprio canvas do renderer (preserveDrawingBuffer) e
  // pinta a cópia em ciano/roxo, sumindo em 250–300 ms.
  afterimage(source, sx, sy, sw, sh, x, y, w, h, opts = {}) {
    if (typeof document === 'undefined' || !source) return null;
    try {
      const c = this._ghostCanvas || (this._ghostCanvas = document.createElement('canvas'));
      c.width = Math.max(1, Math.round(sw));
      c.height = Math.max(1, Math.round(sh));
      const g = c.getContext('2d');
      g.clearRect(0, 0, c.width, c.height);
      g.drawImage(source, sx, sy, sw, sh, 0, 0, c.width, c.height);
      const el = document.createElement('img');
      el.className = `fx-afterimage ${opts.color || 'cyan'}`;
      el.src = c.toDataURL('image/png');
      el.style.left = `${Math.round(x)}px`;
      el.style.top = `${Math.round(y)}px`;
      el.style.width = `${Math.round(w)}px`;
      el.style.height = `${Math.round(h)}px`;
      el.style.setProperty('--a', String(opts.alpha ?? 0.5));
      el.style.setProperty('--dx', `${Math.round(opts.dx ?? 0)}px`);
      document.body.append(el);
      setTimeout(() => el.remove(), 340);
      return el;
    } catch {
      return null;
    }
  }

  // O fantasma dela mesma (atalho: pega a região do corpo no canvas do renderer).
  ghost(opts = {}) {
    const { view } = this.app;
    if (typeof document === 'undefined' || !view?.canvas) return null;
    const r = devicePixelRatio || 1;
    const P = view.petHeight;
    const w = P * 0.92;
    const h = P * 1.2;
    const x = view.feetX - w / 2;
    const y = view.feetY - h;
    return this.afterimage(view.canvas, x * r, y * r, w * r, h * r, x, y, w, h, opts);
  }

  // O corte laser horizontal (Corte Relâmpago): uma linha que varre a tela de um ponto ao outro.
  laserLine(x1, y1, x2, y2, opts = {}) {
    if (typeof document === 'undefined') return null;
    const el = document.createElement('div');
    el.className = 'fx-laser';
    const len = Math.hypot(x2 - x1, y2 - y1);
    const ang = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
    el.style.left = `${Math.round(x1)}px`;
    el.style.top = `${Math.round(y1)}px`;
    el.style.width = `${Math.round(len)}px`;
    el.style.setProperty('--rot', `${ang.toFixed(1)}deg`);
    el.style.setProperty('--glow', tintOf(opts.color || 'white')[1]);
    if (opts.ms) el.style.animationDuration = `${opts.ms}ms`;
    document.body.append(el);
    setTimeout(() => el.remove(), (opts.ms || 520) + 160);
    return el;
  }

  // O vórtice do Giro Supremo: três anéis de energia girando em velocidades diferentes,
  // abrindo para fora enquanto a lâmina passa.
  vortex(x, y, size = 210, ms = 900, color = 'crimson') {
    if (typeof document === 'undefined') return null;
    const el = document.createElement('div');
    el.className = `fx-vortex ${color}`;
    const s = Math.round(size);
    el.style.width = `${s}px`;
    el.style.height = `${s}px`;
    el.style.left = `${Math.round(x - s / 2)}px`;
    el.style.top = `${Math.round(y - s / 2)}px`;
    el.style.setProperty('--ms', `${ms}ms`);
    el.style.setProperty('--ms-slow', `${Math.round(ms * 0.7)}ms`);
    el.style.setProperty('--ms-fast', `${Math.round(ms * 0.45)}ms`);
    el.style.setProperty('--glow', tintOf(color)[1]);
    for (let i = 0; i < 3; i++) el.append(document.createElement('i'));
    document.body.append(el);
    setTimeout(() => el.remove(), ms + 220);
    return el;
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
    if (step < this.hungerStep && this.app.config.growl !== false && !isFocus(this.app.config, this.app)) sound.growl(1 - pet.stats.hunger / 100);
    this.hungerStep = step;
  }
}
