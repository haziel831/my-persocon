// The Doll (replaces the plush): an articulated Minecraft-style figure drawn from a skin, with
// simple physics (falls, bounces, gets thrown) and limbs that swing with the movement.
// With the Crystal Mágico it comes alive (see dollai.js).
import { DollBrain } from './dollai.js';
import { icon } from './pixel.js';
import { DOLL_SKILLS, DOLL_COMBAT_SKILLS, DOLL_XP, dollData, dollHasSkill, trainRemaining, markTrain, fmtCooldown } from './dollskills.js';
import { dollName } from './game.js';
import { renameDialog } from './ui.js';
import { translate } from './i18n.js';

const clamp = (v, a, b) => Math.min(Math.max(v, a), b);

// [joint, floppy direction in the air]. Positive elbow/knee = lower part turns clockwise on screen.
const JOINTS = [['la', 1], ['ra', -1], ['ll', 0.5], ['rl', -0.5], ['head', 0.3], ['le', 0.7], ['re', -0.7], ['lk', -0.5], ['rk', 0.5]];

// Default skin painted in code (64x64): brown hair, teal shirt, blue pants.
function defaultSkin() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const r = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  r(0, 0, 32, 16, '#c69c6d'); r(0, 0, 32, 10, '#4a2f1a'); r(8, 8, 8, 2, '#4a2f1a');
  r(9, 12, 2, 1, '#ffffff'); r(13, 12, 2, 1, '#ffffff'); r(10, 12, 1, 1, '#3b3fd0'); r(13, 12, 1, 1, '#3b3fd0'); r(11, 14, 2, 1, '#8a5a3c');
  r(16, 16, 24, 16, '#3fa9b5'); r(40, 16, 16, 16, '#3fa9b5'); r(40, 28, 16, 4, '#c69c6d');
  r(0, 16, 16, 16, '#3b3f9e'); r(0, 28, 16, 4, '#5a5a5a');
  r(16, 48, 16, 16, '#3b3f9e'); r(16, 60, 16, 4, '#5a5a5a'); r(32, 48, 16, 16, '#3fa9b5'); r(32, 60, 16, 4, '#c69c6d');
  return c.toDataURL('image/png');
}

export class Doll {
  constructor(app) {
    this.app = app;
    this.el = null;
    this.x = null;
    this.y = 0;
    this.vx = this.vy = 0;
    this.angle = 0;
    this.spin = 0;
    // Shoulders/hips (la ra ll rl), elbows/knees (le re lk rk) and the head.
    this.limbs = Object.fromEntries(JOINTS.map(([k]) => [k, 0]));
    this.limbV = Object.fromEntries(JOINTS.map(([k]) => [k, 0]));
    this.held = null;
    this.skinSrc = null;
    this.img = null;
    this.pose = null;
    this.lift = 0;
    this.restAngle = 0;
    this.hiding = false;
    this.brain = new DollBrain(this);
    // The pet goes to the Doll on its own now and then: hugs it, or (alive) starts a game with it.
    if (app.pet) app.pet.tryDoll = () => {
      if (!this.active || this.x == null || this.held || app.pet.toyPlay || app.pet.activity || this.brain.busy) return false;
      const kinds = this.alive ? ['abraco', 'pega', 'pega', 'esconde', 'corrida', ...(app.ball?.active ? ['chute', 'chute'] : [])] : ['abraco'];
      return this.brain.startDuo(kinds[Math.floor(Math.random() * kinds.length)]);
    };
  }

  get alive() {
    const g = this.app.game;
    return !!g.gear.cristal && g.dollAwake !== false && this.active;
  }

  setAwake(on) {
    this.app.game.dollAwake = on;
    this.app.game.changed();
    if (!on) {
      this.brain.reset();
      this.pose = null;
      this.lift = this.restAngle = 0;
    } else this.brain.wake();
  }

  // Hit by the ball (or bumped): tumbles.
  knock(vx, vy) {
    this.throwUp(vx, vy);
    if (this.alive) this.brain.knocked();
  }

  poke() {
    if (this.toy?.broken) return this.app.toys.repair('pelucia');
    if (this.alive) return this.brain.poked();
    this.throwUp(0, -this.P * 2.2);
    this.app.sound.tone8(900, 1300, 0.08, 'triangle', 0.05);
  }

  get P() {
    return this.app.pet.P;
  }

  get h() {
    // dollScale (save): enlarges Minecraft skin and Yes Steve / 3D overrides alike.
    return this.P * 0.34 * (this.app.game.dollScale || 1);
  }

  setScale(mul) {
    const g = this.app.game;
    g.dollScale = Math.round(clamp(mul, 0.5, 2.5) * 100) / 100;
    g.changed();
  }

  nudgeScale(delta) {
    this.setScale((this.app.game.dollScale || 1) + delta);
  }

  // Live Yes Steve Model (PetView) instead of the Minecraft skin / baked image.
  get hasYsm() {
    return !!(this.view || this.app.game.dollModel);
  }

  async loadYsm(dir = this.app.game.dollModel) {
    if (!dir) {
      this.clearYsm(true);
      return;
    }
    if (this.ysmDir === dir && this.view) return;
    this.disposeView();
    this.ysmDir = dir;
    this.ysmLoading = true;
    this.ysmClip = null;
    try {
      const files = await window.petAPI.loadModelDir(dir);
      // Fresh canvas: WebGL cannot reuse one that already had a 2D context.
      if (this.el) { this.el.remove(); this.el = null; }
      this.ensure();
      const H = Math.max(40, this.h);
      if (files.vrm) {
        const { VrmView } = await import('./vrmview.js');
        this.view = await VrmView.create(files, H, this.el);
      } else {
        const { PetView } = await import('./view.js');
        this.view = await PetView.create(files, H, this.el);
      }
      this.view.play('idle', { restart: true, fade: 0 });
      this.app.game.dollModel = dir;
      this.app.game.changed();
    } catch (e) {
      console.warn('[Doll YSM]', e);
      this.clearYsm(true);
    }
    this.ysmLoading = false;
  }

  disposeView() {
    try { this.view?.dispose?.(); } catch {}
    this.view = null;
    this.ysmClip = null;
  }

  clearYsm(clearSave = true) {
    this.disposeView();
    this.ysmDir = null;
    if (this.el) {
      this.el.remove();
      this.el = null;
    }
    if (clearSave && this.app.game.dollModel) {
      this.app.game.dollModel = null;
      this.app.game.changed();
    }
  }

  syncYsmAnim() {
    const v = this.view;
    if (!v?.animator) return;
    const kind = this.brain?.duoPose || this.brain?.task?.pose
      || (Math.abs(this.vx) > this.P * 0.25 ? 'walk' : 'idle');
    const map = {
      idle: ['idle'], walk: ['walk', 'idle'], run: ['run', 'walk', 'idle'],
      sit: ['sit', 'idle'], sleep: ['sleep', 'sit', 'idle'],
      dance: ['dance', 'emote_pos', 'idle'], wave: ['wave', 'emote_pos', 'idle'],
      cheer: ['comemorar', 'emote_pos', 'idle'], read: ['sit', 'idle'],
      play: ['idle'], inspect: ['idle'], wake: ['idle'], spin: ['dance', 'idle'],
    };
    const names = map[kind] || ['idle'];
    const clip = names.find((n) => v.animator.has(n)) || (v.animator.has('idle') ? 'idle' : names[0]);
    if (clip && this.ysmClip !== clip) {
      this.ysmClip = clip;
      v.play(clip, { restart: kind === 'walk' || kind === 'run', fade: 0.18 });
    }
    if (Math.abs(this.vx) > 8) this.ysmFace = this.vx > 0 ? 'right' : 'left';
    v.setFacing?.(this.back ? 'back' : (this.ysmFace || 'front'), false);
  }

  get toy() {
    return this.app.game.toys.pelucia;
  }

  get active() {
    return this.shown && !this.toy.broken;
  }

  // Still on the desktop when broken: lies there greyed out until repaired.
  get shown() {
    const t = this.toy;
    return !!t?.placed && this.app.toys.here(t);
  }

  setSkin(src) {
    this.app.game.dollSkin = src || null;
    this.app.game.changed();
  }

  loadSkin() {
    const src = this.app.game.dollSkin || (this.app.files?.mc ? this.app.files.texture : null) || (Doll.def ||= defaultSkin());
    if (src === this.skinSrc) return;
    this.skinSrc = src;
    const img = new Image();
    img.onload = () => {
      this.img = img;
      this.legacy = img.height === img.width / 2;
      this.snap = null;
    };
    img.src = src;
  }

  menu(x, y) {
    // Always open on right-click, even while the Doll is asleep — the menu itself has the wake button.
    if (this.held || this.brain?.duo) return;
    const app = this.app;
    const d = dollData(app);
    const el = document.createElement('div');
    el.className = 'toy-menu crow-profile hitzone';
    const add = (tag, cls, text) => {
      const e = document.createElement(tag);
      if (cls) e.className = cls;
      if (text != null) e.textContent = text;
      el.append(e);
      return e;
    };
    add('div', 'title', dollName(app)).prepend(Object.assign(document.createElement('img'), {
      src: icon('doll'), className: 'crow-ico', draggable: false, alt: '',
    }));
    const totalSkills = Object.keys(DOLL_SKILLS).length + Object.keys(DOLL_COMBAT_SKILLS).length;
    const learnedCount = Object.keys({ ...DOLL_SKILLS, ...DOLL_COMBAT_SKILLS }).filter((id) => dollHasSkill(app, id)).length;
    add('div', 'crow-stats', `${translate('Treinos')}: ${d.trains || 0} · ${translate('Skills')}: ${learnedCount}/${totalSkills}`);
    const wake = add('button', '', translate(this.alive
      ? '😴 Fazer o Doll dormir (parar de se mexer)' : '✨ Acordar o Doll'));
    wake.onclick = () => { this.setAwake(!this.alive); this.menu(x, y); };
    const cols = add('div', 'crow-cols');
    const mkCol = (title, combat) => {
      const col = document.createElement('div');
      col.className = 'crow-col';
      const h = document.createElement('div');
      h.className = 'crow-sub';
      h.textContent = title;
      col.append(h);
      const list = document.createElement('div');
      list.className = 'crow-skills';
      col.append(list);
      cols.append(col);
      return { list, combat };
    };
    const normal = mkCol(translate('Skills Normais'), false);
    const combat = mkCol(translate('Skills de Combate'), true);
    const addSkill = (id, s, list) => {
      const known = dollHasSkill(app, id);
      const row = document.createElement('div');
      row.className = `crow-skill${known ? ' known' : ' off'}${s.combat ? ' combat' : ''}`;
      if (d.focus === id) row.classList.add('focus');
      const head = document.createElement('div');
      head.className = 'crow-skill-head';
      const b = document.createElement('b');
      b.textContent = known ? translate(s.name) : '❔ ???';
      const pct = document.createElement('span');
      pct.textContent = known ? '✓' : `${Math.floor(Math.min(99, ((d.xp[id] || 0) / DOLL_XP) * 100))}%${d.focus === id ? ` · ${translate('treinando')}` : ''}`;
      head.append(b, pct);
      const bar = document.createElement('div');
      bar.className = 'crow-bar';
      const fill = document.createElement('i');
      fill.style.width = `${known ? 100 : Math.floor(Math.min(99, ((d.xp[id] || 0) / DOLL_XP) * 100))}%`;
      bar.append(fill);
      row.append(head, bar);
      if (known) {
        const small = document.createElement('small');
        small.textContent = translate(s.desc);
        row.append(small);
      }
      if (!known) {
        row.onclick = () => { d.focus = id; app.game.changed(); this.menu(x, y); };
      }
      list.append(row);
    };
    for (const [id, s] of Object.entries(DOLL_SKILLS)) addSkill(id, s, normal.list);
    for (const [id, s] of Object.entries(DOLL_COMBAT_SKILLS)) addSkill(id, s, combat.list);
    add('div', 'crow-note', translate('A Persocon decide o que ensinar. As Skills de Combate só valem na luta. As habilidades ficam ocultas até serem aprendidas.'));
    const left = trainRemaining('doll', app.game);
    const train = add('button', '', left > 0 ? `${translate('🎓 Treinar')} (${fmtCooldown(left)})` : translate('🎓 Treinar'));
    train.disabled = left > 0;
    train.onclick = () => {
      app.toys.closeMenu?.();
      if (!this.brain.startDuo('treinar', true)) {
        app.sound?.play('cancel', { volume: 0.4 });
        this.menu(x, y);
      }
    };
    const rename = add('button', '', translate('✏️ Renomear'));
    rename.onclick = () => renameDialog(app.game.profile.dollName, (v) => {
      app.game.profile.dollName = String(v || '').slice(0, 24);
      app.game.changed();
    }, translate('Nome do Doll'));
    const skin = add('button', '', translate('🧱 Skin de blocos (.png)'));
    skin.onclick = () => this.importBlockSkin();
    const restore = add('button', '', translate('🔁 Restaurar padrão'));
    restore.onclick = () => { this.setSkin(null); app.game.dollModel = null; app.game.changed(); };
    app.toys.openMenu(el, x, y);
  }

  async importBlockSkin() {
    const path = await window.petAPI?.pickFile?.(translate('Skin de blocos do Doll'), translate('Skin PNG'), ['png']);
    if (!path) return;
    const data = await window.petAPI.readFileData(path);
    const ok = await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img.width === 64 && (img.height === 64 || img.height === 32));
      img.onerror = () => resolve(false);
      img.src = data;
    });
    if (!ok) {
      this.app.sound.play('cancel', { volume: 0.4 });
      this.app.speech?.say(translate('A skin precisa ser 64×64 ou 64×32.'), 3);
      return;
    }
    const slim = this.app.config?.dollSlim === true;
    const { mcModel } = await import('./mcmodel.js');
    const files = await mcModel(data, slim);
    this.app.game.dollSkin = data;
    this.app.game.dollSlim = !!slim;
    this.app.game.dollModel = files;
    this.app.game.changed();
    this.app.sound.play('ok', { volume: 0.4 });
  }

  ensure() {
    if (this.el) return;
    const el = (this.el = document.createElement('canvas'));
    el.className = 'toy doll';
    el.title = translate('Clique para interagir · arraste e solte para jogar · botão direito: menu do Doll');
    el.addEventListener('pointerdown', (e) => this.grab(e));
    el.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.menu(e.clientX, e.clientY);
    });
    document.body.append(el);
  }

  set(x, y) {
    this.x = x;
    this.y = y;
    this.vx = this.vy = 0;
  }

  throwUp(vx, vy) {
    this.vx = vx;
    this.vy = vy;
    this.spin = (Math.random() - 0.5) * 10;
  }

  grab(e) {
    if (e.button !== 0) { e.stopPropagation(); return; }
    e.stopPropagation();
    const el = this.el;
    try { el.setPointerCapture(e.pointerId); } catch {}
    this.held = { hist: [{ t: performance.now(), x: e.clientX, y: e.clientY }] };
    const t0 = performance.now();
    let moved = 0;
    const move = (ev) => {
      moved = Math.max(moved, Math.hypot(ev.clientX - e.clientX, ev.clientY - e.clientY));
      if (moved < 5) return;
      this.x = ev.clientX;
      this.y = ev.clientY + this.h * 0.75;
      const h = this.held.hist;
      h.push({ t: performance.now(), x: ev.clientX, y: ev.clientY });
      while (h.length > 2 && h[h.length - 1].t - h[0].t > 100) h.shift();
    };
    const up = () => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      const h = this.held.hist;
      this.held = null;
      if (moved < 5) {
        if (performance.now() - t0 < 400) this.poke();
        return;
      }
      this.brain.task = null;
      const a = h[0];
      const b = h[h.length - 1];
      const dt = (b.t - a.t) / 1000;
      if (dt > 0.01) {
        const max = this.P * 14;
        this.vx = clamp(((b.x - a.x) / dt) * 0.6, -max, max);
        this.vy = clamp(((b.y - a.y) / dt) * 0.6, -max, max);
        this.spin = this.vx / this.P * 0.8;
      }
      this.toy.x = this.x;
      this.app.game.changed();
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
  }

  // Procedural combat animation (works for the default/Minecraft rig and imported models).
  playCombat(kind = 'combat_idle', durMs = 800, onHit) {
    const poses = {
      combat_idle: 'guard',
      combat_attack: 'attack',
      combat_cast: 'cast',
      combat_shield: 'guard',
      combat_dodge: 'dodge',
      combat_hurt: 'hurt',
      combat_cheer: 'cheer',
    };
    const pose = poses[kind] || 'guard';
    this.pose = pose;
    this.combatAnim = kind;
    this.lift = kind === 'combat_cheer' ? this.P * 0.25 : kind === 'combat_attack' ? this.P * 0.1 : 0;
    let fired = false;
    const hitAt = Math.max(80, durMs * 0.42);
    const hitTimer = setTimeout(() => { if (!fired) { fired = true; onHit?.(); } }, hitAt);
    clearTimeout(this._combatEnd);
    this._combatEnd = setTimeout(() => {
      clearTimeout(hitTimer);
      if (!fired) onHit?.();
      this.pose = null;
      this.combatAnim = null;
      this.lift = 0;
      this.tilt = 0;
    }, durMs);
    return true;
  }

  hit(x, y) {
    if (!this.el || this.el.style.display === 'none') return false;
    const r = this.el.getBoundingClientRect();
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  }

  // Image/3D look imported for the Doll in "Visual dos objetos" (replaces the skin figure).
  override() {
    const src = this.app.skins?.objects?.pelucia?.frames ? this.app.skins.art('pelucia', null) : null;
    if (!src) return null;
    this.ovCache ||= new Map();
    let img = this.ovCache.get(src);
    if (!img) {
      img = new Image();
      img.src = src;
      if (this.ovCache.size > 80) this.ovCache.clear();
      this.ovCache.set(src, img);
    }
    return img.complete && img.naturalWidth ? img : null;
  }

  // Picture of the doll standing still (what the pet holds).
  snapshot() {
    if (this.view?.canvas) {
      try { return this.view.canvas.toDataURL('image/png'); } catch {}
    }
    const ov = this.app.skins?.objects?.pelucia?.frames;
    if (ov) return this.app.skins.art('pelucia', ov[0]);
    if (!this.img) return null;
    if (!this.snap) {
      const c = document.createElement('canvas');
      c.width = 16;
      c.height = 32;
      this.draw(c.getContext('2d'), 1, { la: 0.15, ra: -0.15, le: 0.15, re: -0.15 }, 0);
      this.snap = c.toDataURL('image/png');
    }
    return this.snap;
  }

  // Front view: head 8, body 12, limbs 4 wide, in skin pixels times k. Each limb is the same
  // 4x12 skin area split in two 6-pixel halves joined at the elbow/knee.
  // Back view (playing the TV): the whole figure is mirrored and drawn with the skin's back faces,
  // each blitted mirrored again so the textures read the right way round.
  draw(g, k, L, angle, back = false) {
    const img = this.img;
    if (!img) return;
    g.imageSmoothingEnabled = false;
    const cx = 8 * k;
    const blit = (sx, sy, sw, sh, x, y, flip) => {
      flip = !!flip !== back;
      if (flip) {
        g.save();
        g.scale(-1, 1);
        g.drawImage(img, sx, sy, sw, sh, -(x + sw) * k, y * k, sw * k, sh * k);
        g.restore();
      } else g.drawImage(img, sx, sy, sw, sh, x * k, y * k, sw * k, sh * k);
    };
    const part = (sx, sy, sw, sh, px, py, pivotX, pivotY, rot, ox, oy) => {
      g.save();
      g.translate(px * k + pivotX * k, py * k + pivotY * k);
      g.rotate(rot || 0);
      blit(sx, sy, sw, sh, ox, oy, false);
      g.restore();
    };
    // Upper half turns at the shoulder/hip, the lower half at the joint 6 pixels down; it repeats
    // the upper half's last row so no gap opens on the outside of the bend.
    const limb = (sx, sy, px, py, pivotY, rot, bend, flip = false) => {
      g.save();
      g.translate((px + 2) * k, (py + pivotY) * k);
      g.rotate(rot || 0);
      blit(sx, sy, 4, 6, -2, -pivotY, flip);
      g.translate(0, (6 - pivotY) * k);
      g.rotate(bend || 0);
      blit(sx, sy + 5, 4, 7, -2, -1, flip);
      g.restore();
    };
    g.save();
    g.translate(cx, 32 * k);
    g.rotate(angle);
    g.translate(-cx, -32 * k);
    if (back) {
      g.translate(16 * k, 0);
      g.scale(-1, 1);
    }
    const leg = this.legacy;
    const b = back ? 8 : 0;
    limb(4 + b, 20, 4, 20, 0, L.rl, L.rk);
    leg ? limb(4 + b, 20, 8, 20, 0, L.ll, L.lk, true) : limb(20 + b, 52, 8, 20, 0, L.ll, L.lk);
    part(back ? 32 : 20, 20, 8, 12, 4, 8, 0, 0, 0, 0, 0);
    if (!leg) part(back ? 32 : 20, 36, 8, 12, 4, 8, 0, 0, 0, 0, 0);
    limb(44 + b, 20, 0, 8, 1, L.ra, L.re);
    leg ? limb(44 + b, 20, 12, 8, 1, L.la, L.le, true) : limb(36 + b, 52, 12, 8, 1, L.la, L.le);
    part(back ? 24 : 8, 8, 8, 8, 4, 0, 4, 8, L.head, -4, -8);
    part(back ? 56 : 40, 8, 8, 8, 4, 0, 4, 8, L.head, -4, -8);
    g.restore();
  }

  update(dt, hidden) {
    const { pet, world } = this.app;
    if (!this.shown) {
      this.disposeView();
      this.ysmDir = null;
      if (this.el) {
        this.el.remove();
        this.el = null;
        this.brain.reset();
      }
      this.x = null;
      return;
    }
    // YSM-on-Doll import was removed from the UI; drop any leftover save and use Minecraft skin.
    if (this.app.game.dollModel || this.view) this.clearYsm(true);
    this.loadSkin();
    this.ensure();
    const floor = world.surfaces[0]?.y ?? innerHeight;
    if (this.x === null) this.set(this.toy.x ?? world.width / 2, floor);
    const tp = pet.toyPlay;
    const inHands = tp?.id === 'pelucia' && tp.t >= tp.holdFrom && !tp.tossing;
    const ax0 = this.vx;
    if (!this.held && !inHands) {
      this.vy = Math.min(this.vy + pet.gravity * dt, this.P * 30);
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.angle += this.spin * dt;
      // Thrown onto the trampoline or the bed: bounces back up.
      const b = this.vy > this.P * 2.4 && this.app.toys?.bounceAt(this.x, this.y - this.vy * dt, this.y);
      if (b) {
        this.y = b.top;
        this.vy = -Math.min(this.vy * b.rest, Math.sqrt(2 * pet.gravity * this.P * b.max));
        this.spin += (Math.random() - 0.5) * 8;
        if (b.sfx === 'tramp') this.app.sound.toy('tramp', 1);
        else this.app.sound.sfx('bedBounce', 1);
      }
      if (this.x < this.P * 0.1 || this.x > world.width - this.P * 0.1) {
        this.x = clamp(this.x, this.P * 0.1, world.width - this.P * 0.1);
        this.vx = -this.vx * 0.5;
      }
      if (this.y >= floor) {
        this.y = floor;
        if (this.vy > this.P * 2) {
          this.vy = -this.vy * 0.35;
          this.app.sound.tone8(150, 90, 0.05, 'triangle', 0.05);
        } else this.vy = 0;
        this.vx *= Math.exp(-5 * dt);
        this.spin *= Math.exp(-8 * dt);
        const rest = this.toy.broken ? Math.PI / 2 : this.alive ? this.restAngle : 0;
        const diff = rest - this.angle;
        this.angle += Math.atan2(Math.sin(diff), Math.cos(diff)) * Math.min(1, dt * 6);
      }
      this.toy.x = this.x;
    }
    const grounded = !this.held && !inHands && this.y >= floor - 0.5 && this.vy === 0 && Math.abs(this.vx) < this.P * 0.3;
    if (this.alive) this.brain.update(dt, grounded, hidden || inHands);
    else if (this.pose || this.brain.bubbleEl) {
      this.brain.reset();
      this.pose = null;
      this.lift = this.restAngle = 0;
      this.hiding = false;
    }
    // Limbs: damped springs pushed by the motion (or the living Doll's pose targets).
    const acc = (this.vx - ax0) / Math.max(dt, 1e-3);
    const air = this.y < floor - 1 || this.held;
    for (const [k, sign] of JOINTS) {
      const rest = air ? sign * 0.9 : (this.pose?.[k] ?? 0);
      const f = (rest - this.limbs[k]) * 60 - this.limbV[k] * 6 - acc * 0.0004 * sign + (air ? Math.sin(performance.now() / 90 + sign) * 4 : 0);
      this.limbV[k] += f * dt;
      this.limbs[k] = clamp(this.limbs[k] + this.limbV[k] * dt, -2.6, 2.6);
    }
    const H = this.h;
    const c = this.el;
    const broken = !!this.toy.broken;
    const lift = this.alive ? this.lift : 0;
    c.style.display = hidden || inHands ? 'none' : 'block';
    c.style.opacity = this.hiding ? '0.3' : '';
    if (broken !== this.wasBroken) {
      this.wasBroken = broken;
      c.style.filter = broken ? 'grayscale(0.85) brightness(0.85)' : '';
      c.title = broken ? `Quebrado — clique para consertar (¥ ${this.app.game.repairCost('pelucia')})` : 'Clique para interagir · arraste e solte para jogar · botão direito: skin e opções';
    }

    // Live YSM / VRM: drive PetView clips from the Doll's AI pose.
    if (this.view) {
      if (Math.abs((this.view.petHeight || 0) - H) > 1) this.view.resize(H);
      this.syncYsmAnim();
      this.view.update(dt);
      c.style.width = `${this.view.width}px`;
      c.style.height = `${this.view.height}px`;
      c.style.transform = `translate(${Math.round(this.x - this.view.feetX)}px, ${Math.round(this.y - lift - this.view.feetY)}px)`;
      return;
    }

    const k = Math.max(1, Math.round(H / 32));
    if (c.width !== 16 * k * 2 || c.height !== 32 * k + 8 * k) {
      c.width = 16 * k * 2;
      c.height = 32 * k + 8 * k;
    }
    const g = c.getContext('2d');
    g.clearRect(0, 0, c.width, c.height);
    g.save();
    const ov = this.override();
    if (ov) {
      const w = 16 * k;
      const hh = Math.min(38 * k, w * (ov.height / ov.width) * 1.6);
      const ww = hh * (ov.width / ov.height);
      g.translate(c.width / 2, 38 * k);
      g.rotate(this.angle);
      g.imageSmoothingEnabled = false;
      g.drawImage(ov, -ww / 2, -hh, ww, hh);
    } else if ((this.alive && this.restAngle) || this.toy.broken) {
      // Lying, upside down, cartwheels: turns around the middle of the body, kept on the floor.
      g.translate(16 * k, (22 + 8 * Math.abs(Math.sin(this.angle))) * k);
      g.rotate(this.angle);
      g.translate(-8 * k, -16 * k);
      this.draw(g, k, this.limbs, 0);
    } else {
      g.translate(8 * k, 6 * k);
      this.draw(g, k, this.limbs, this.angle, !!this.back);
    }
    g.restore();
    if (broken) {
      this.wrench ||= Object.assign(new Image(), { src: icon('wrench') });
      if (this.wrench.complete) {
        g.imageSmoothingEnabled = false;
        g.drawImage(this.wrench, 12 * k, 8 * k, 10 * k, 10 * k);
      }
    }
    const scale = H / (32 * k);
    c.style.width = `${c.width * scale}px`;
    c.style.height = `${c.height * scale}px`;
    c.style.transform = `translate(${Math.round(this.x - c.width * scale / 2)}px, ${Math.round(this.y - lift - (38 * k) * scale)}px)`;
  }
}
