// First run: a mysterious wooden box on the desktop floor. Click → selection letter (the player signs it),
// click again → name and sex of the unit, then the box bursts open, the Persocon tumbles out switched off,
// and a click on it boots it for the first time.
import { textFor } from './introtext.js';
import { cleanName, NAME_MAX } from './names.js';
import { upgradeJingle } from './upgradefx.js';
import { personaLabel } from './persona.js';

const LOGO_URL = new URL('./assets/logo.png', import.meta.url).href;
const BOX_URL = new URL('./assets/items/delivery_box.png', import.meta.url).href;
const BW = 64;
const BH = 53;
const VOICE = { M: 'grave', F: 'agudo', X: 'normal' };
// Bundled units the player picks from; switching reloads the page and resumes at the box opening.
const UNITS = { ninna: { dir: 'models/MyPersocon', name: 'Ninna' }, aghata: { dir: 'models/Aghata', name: 'Aghata' } };
// Four of the five existing persona IDs; IDs match the Options selector exactly.
const INTRO_PERSONAS = ['estoica', 'genki', 'tsundere', 'dandere'];

const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};

// Pixel-art crate (BW x BH); lid = only the top planks (drawn on its own canvas for the opening).
function drawCrate(g, lid) {
  const wood = ['#c08a4a', '#a8743a', '#b47e42'];
  const dark = '#5a3615';
  const edge = '#7a4c22';
  const rows = lid ? [[0, 6]] : [[6, 14], [14, 22], [22, 30]];
  for (const [i, [y0, y1]] of rows.entries()) {
    g.fillStyle = wood[i % 3];
    g.fillRect(0, y0, BW, y1 - y0);
    g.fillStyle = 'rgba(255,255,255,0.12)';
    g.fillRect(1, y0 + 1, BW - 2, 1);
    g.fillStyle = 'rgba(0,0,0,0.18)';
    for (let x = 3; x < BW - 3; x += 7) g.fillRect(x + ((y0 * 3) % 5), y0 + 3, 3, 1);
    g.fillStyle = dark;
    g.fillRect(0, y1 - 1, BW, 1);
  }
  g.fillStyle = edge;
  if (lid) {
    g.fillRect(0, 0, BW, 1);
    g.fillRect(0, 0, 1, 6);
    g.fillRect(BW - 1, 0, 1, 6);
    g.fillStyle = '#d9d9d9';
    for (const x of [3, BW - 4]) g.fillRect(x, 2, 1, 1);
    return;
  }
  g.fillRect(0, 6, 3, BH - 6);
  g.fillRect(BW - 3, 6, 3, BH - 6);
  for (let i = 0; i < 20; i++) {
    const x = 4 + Math.round((i / 19) * (BW - 9));
    const y = BH - 3 - Math.round((i / 19) * (BH - 11));
    g.fillRect(x, y, 2, 2);
  }
  g.fillStyle = '#d9d9d9';
  for (const [x, y] of [[1, 8], [BW - 2, 8], [1, BH - 3], [BW - 2, BH - 3]]) g.fillRect(x, y, 1, 1);
  // Red "?" stamp.
  g.fillStyle = 'rgba(200,30,40,0.85)';
  const q = ['0110', '1001', '0001', '0010', '0100', '0000', '0100'];
  q.forEach((row, y) => [...row].forEach((p, x) => p === '1' && g.fillRect(BW - 12 + x, 11 + y, 1, 1)));
  g.strokeStyle = 'rgba(200,30,40,0.7)';
  g.strokeRect(BW - 14.5, 9.5, 8, 11);
  g.fillStyle = 'rgba(30,20,10,0.55)';
  for (const [x, y] of [[6, 10], [6, 11], [5, 11], [7, 11], [6, 12], [6, 13], [6, 14]]) g.fillRect(x, y, 1, 1);
}

// Rubber stamp: the logo's dark strokes in red ink inside a double ring, with a worn, grainy print.
function makeStamp() {
  const S = 160;
  const c = el('canvas', 'intro-stamp');
  c.width = c.height = S;
  const g = c.getContext('2d');
  const ink = [178, 28, 36];
  const img = new Image();
  img.onload = () => {
    const pad = 22;
    g.drawImage(img, pad, pad, S - pad * 2, S - pad * 2);
    const d = g.getImageData(0, 0, S, S);
    const p = d.data;
    for (let i = 0; i < p.length; i += 4) {
      const lum = (p[i] + p[i + 1] + p[i + 2]) / 765;
      const a = p[i + 3] / 255;
      const on = a > 0.4 && lum < 0.55;
      p[i] = ink[0];
      p[i + 1] = ink[1];
      p[i + 2] = ink[2];
      p[i + 3] = on ? 235 : 0;
    }
    g.putImageData(d, 0, 0);
    g.strokeStyle = `rgb(${ink})`;
    g.lineWidth = 6;
    g.beginPath();
    g.arc(S / 2, S / 2, S / 2 - 5, 0, Math.PI * 2);
    g.stroke();
    g.lineWidth = 2;
    g.beginPath();
    g.arc(S / 2, S / 2, S / 2 - 14, 0, Math.PI * 2);
    g.stroke();
    // Worn ink: punch random specks out of the print.
    g.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 700; i++) {
      g.globalAlpha = Math.random() * 0.8;
      g.fillRect(Math.random() * S, Math.random() * S, 1 + Math.random() * 2, 1 + Math.random() * 2);
    }
  };
  img.src = LOGO_URL;
  return c;
}

export class Intro {
  constructor(app) {
    this.app = app;
    this.stage = 'box';
    this.t = 0;
    this.shake = 0;
    this.nextWobble = 2;
    this.fx = [];
  }

  get T() {
    return textFor(this.app.config);
  }

  get busy() {
    return this.stage !== 'done';
  }

  get floor() {
    return this.app.world.surfaces?.[0]?.y ?? innerHeight;
  }

  start() {
    const { pet, game } = this.app;
    pet.offstage = true;
    pet.powerOff = false;
    game.profile.booted = false;
    document.body.classList.add('intro-on');
    // Make sure the frameless window accepts clicks before the first box click.
    window.petAPI?.setInteractive?.(true);
    this.buildBox();
  }

  // ---------- the box ----------

  buildBox() {
    const P = this.app.pet.P;
    this.scale = Math.max(2, (P * 0.95) / BW);
    this.box = el('div', 'intro-box hitzone');
    // Official pixel-art delivery box; one crisp image (no canvas smoothing).
    const img = el('img', 'intro-crate');
    img.src = BOX_URL;
    img.draggable = false;
    img.style.width = `${BW * this.scale}px`;
    img.style.height = `${BH * this.scale}px`;
    // The image is pointer-events:none, so the container MUST have its own size to be hittable.
    this.box.style.width = `${BW * this.scale}px`;
    this.box.style.height = `${BH * this.scale}px`;
    this.hint = el('div', 'intro-hint', this.T.boxHint);
    img.style.pointerEvents = 'none'; // the click always lands on the box container
    this.box.append(img, this.hint);
    this.lid = img; // the whole sprite lifts away when the box bursts
    // Document-level hit test in capture phase: reliable even if a child or an overlay
    // would otherwise swallow the pointerdown. Covers the whole box image.
    this._boxDown = (e) => {
      if (!this.box || (this.stage !== 'box' && this.stage !== 'signed')) return;
      const r = this.box.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) return;
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) return;
      e.preventDefault();
      e.stopPropagation();
      this.clickBox();
    };
    document.addEventListener('pointerdown', this._boxDown, true);
    document.body.append(this.box);
    this.bx = null;
  }

  placeBox() {
    const w = this.app.world;
    if (!w.ready || !this.box) return;
    if (this.bx === null) this.bx = Math.round(w.width * 0.5);
    const bw = BW * this.scale;
    const bh = BH * this.scale;
    this.box.style.left = `${Math.round(this.bx - bw / 2)}px`;
    this.box.style.top = `${Math.round(this.floor - bh)}px`;
  }

  clickBox() {
    const s = this.app.sound;
    if (this.stage === 'box') {
      s?.sfx?.('clunk');
      this.showLetter();
    } else if (this.stage === 'signed') {
      s?.play('blip', { volume: 0.4 });
      this.showForm();
    }
  }

  // ---------- letter ----------

  modal(cls) {
    this.closeModal();
    const back = el('div', 'intro-modal-back');
    back.dataset.noI18n = '';
    const card = el('div', `intro-card ${cls}`);
    back.append(card);
    back.onpointerdown = (e) => { if (e.target === back) this.closeModal(); };
    document.body.append(back);
    this.modalEl = back;
    this.app.dialog = 'intro';
    this.app.uiChanged?.();
    return card;
  }

  closeModal() {
    if (!this.modalEl) return;
    this.modalEl.remove();
    this.modalEl = null;
    if (this.app.dialog === 'intro') this.app.dialog = null;
    this.app.uiChanged?.();
  }

  // Midnight easter egg: thick purple border pulsing 3 times around the whole screen.
  flashMidnight() {
    const flash = el('div', 'midnight-flash');
    document.body.append(flash);
    flash.addEventListener('animationend', () => flash.remove(), { once: true });
    setTimeout(() => flash.remove(), 2600);
  }

  showLetter() {
    const T = this.T;
    const card = this.modal('intro-letter');
    card.append(el('h2', '', T.letterTitle));
    for (const p of T.letter) {
      const d = el('div', 'intro-par');
      d.innerHTML = p;
      card.append(d);
    }
    const sigRow = el('div', 'intro-sig');
    const input = el('input', 'intro-sig-input');
    input.maxLength = NAME_MAX;
    input.placeholder = T.signHere;
    input.spellcheck = false;
    const line = el('div', 'intro-sig-line');
    sigRow.append(input, line);
    const foot = el('div', 'intro-foot');
    const haz = el('div', 'intro-haz', '— HaZ');
    foot.append(haz, makeStamp());
    const btn = el('button', 'intro-btn', T.sign);
    btn.disabled = true;
    input.oninput = () => { btn.disabled = !cleanName(input.value); };
    const sign = () => {
      const owner = cleanName(input.value);
      if (!owner || card.classList.contains('signed')) return;
      const { app } = this;
      app.game.profile.owner = owner;
      if (owner.trim().toLowerCase() === 'midnight') {
        // Easter egg: signing the letter as "Midnight" (any case) starts with 100,000 coins.
        app.game.coins = 100000;
        app.game.changed?.();
        app.game.persist?.();
        upgradeJingle(app.sound);
        this.flashMidnight();
      } else {
        app.sound?.play('ok', { volume: 0.5 });
      }
      card.classList.add('signed');
      setTimeout(() => {
        this.closeModal();
        this.stage = 'signed';
        this.hint.textContent = T.openHint;
        this.shake = 0.6;
      }, 700);
    };
    btn.onclick = sign;
    input.onkeydown = (e) => { if (e.key === 'Enter') sign(); };
    card.append(sigRow, btn, foot);
    this.grabKeys(input);
  }

  // ---------- name / sex ----------

  showForm() {
    const T = this.T;
    const card = this.modal('intro-form intro-persona');
    card.append(el('h2', '', T.formTitle));
    const name = el('input', 'intro-input');
    name.maxLength = NAME_MAX;
    name.placeholder = T.petName;
    name.spellcheck = false;
    const current = this.app.config.modelDir === UNITS.aghata.dir ? 'aghata' : 'ninna';
    let unit = current;
    name.value = UNITS[unit].name;
    const sexRow = el('div', 'intro-sex');
    let sex = null;
    let persona = null;
    const go = el('button', 'intro-btn', T.open);
    const valid = () => { go.disabled = !cleanName(name.value) || !sex || !persona; };
    const unitRow = el('div', 'intro-sex');
    for (const [id, label] of T.units) {
      const b = el('button', `intro-sex-btn${id === unit ? ' on' : ''}`, label);
      b.onclick = () => {
        const typed = cleanName(name.value);
        if (!typed || Object.values(UNITS).some((u) => u.name === typed)) name.value = UNITS[id].name;
        unit = id;
        for (const o of unitRow.children) o.classList.toggle('on', o === b);
        this.app.sound?.play('blip', { volume: 0.35 });
        valid();
      };
      unitRow.append(b);
    }
    for (const [id, label] of T.sexes) {
      const b = el('button', 'intro-sex-btn', label);
      b.onclick = () => {
        sex = id;
        for (const o of sexRow.children) o.classList.toggle('on', o === b);
        this.app.sound?.play('blip', { volume: 0.35 });
        valid();
      };
      sexRow.append(b);
    }
    const personaRow = el('div', 'intro-persona-grid');
    for (const id of INTRO_PERSONAS) {
      const b = el('button', 'intro-persona-card');
      b.append(el('b', '', personaLabel(id, this.app.config.lang)));
      b.append(el('span', '', T.personaDesc?.[id] || ''));
      b.onclick = () => {
        persona = id;
        for (const o of personaRow.children) o.classList.toggle('on', o === b);
        this.app.sound?.play('blip', { volume: 0.35 });
        valid();
      };
      personaRow.append(b);
    }
    name.oninput = valid;
    valid();
    go.onclick = async () => {
      const n = cleanName(name.value);
      if (!n || !sex || !persona || go.dataset.busy) return;
      const { app } = this;
      app.setName(n);
      if (app.setSex) app.setSex(sex);
      else app.game.profile.sex = sex;
      app.setOption('voicePitch', VOICE[sex]);
      app.setOption('persona', persona);
      app.pushStreamerState?.(true);
      if (n === 'HaZ') {
        app.setOption('debug', true);
        app.setOption('debugUnlocked', true);
        app.game.coins = 5000;
        app.game.changed();
        await app.game.persist?.();
        app.sound?.sfx?.('levelup', 1);
      } else {
        app.setOption('debug', false);
        app.setOption('debugUnlocked', false);
      }
      app.game.changed?.();
      if (unit !== current) {
        go.dataset.busy = '1';
        sessionStorage.setItem('mp-intro-open', JSON.stringify({ owner: app.game.profile.owner, sex }));
        await window.petAPI.saveConfig({ modelDir: UNITS[unit].dir, name: n, voicePitch: VOICE[sex], persona });
        await app.game.persist?.();
        location.reload();
        return;
      }
      // Save the persona immediately: the debounced setOption() save may not run if the app closes.
      await window.petAPI.saveConfig({ persona });
      this.closeModal();
      this.openBox();
    };
    name.onkeydown = (e) => { if (e.key === 'Enter') go.click(); };
    card.append(el('label', 'intro-label', T.unit), unitRow, el('label', 'intro-label', T.petName), name,
      el('label', 'intro-label', T.sex), sexRow, el('label', 'intro-label', T.persona), personaRow,
      el('p', 'intro-persona-note', T.personaNote), go);
    this.grabKeys(name);
  }

  // Back from the reload that swapped the unit: restore what the form set and open the box.
  resumeOpen({ owner, sex } = {}) {
    const { app } = this;
    if (owner) app.game.profile.owner = owner;
    if (sex) {
      if (app.setSex) app.setSex(sex);
      else app.game.profile.sex = sex;
    }
    app.game.changed?.();
    this.stage = 'signed';
    this.openBox();
  }

  // The overlay window does not get the keyboard by itself: ask for it on open and on every click in the field.
  grabKeys(input) {
    const grab = () => { this.app.focus?.(); input.focus(); };
    input.addEventListener('pointerdown', () => this.app.focus?.());
    setTimeout(grab, 50);
    setTimeout(() => document.activeElement === input && this.app.focus?.(), 400);
  }

  // ---------- opening ----------

  openBox() {
    this.stage = 'opening';
    this.hint.remove();
    this.box.classList.remove('hitzone');
    if (this._boxDown) { document.removeEventListener('pointerdown', this._boxDown, true); this._boxDown = null; }
    this.openT = 0;
    this.shake = 1.4;
    this.app.sound?.tone8?.(90, 140, 0.5, 'sawtooth', 0.05);
  }

  burst() {
    const { app } = this;
    const { pet } = app;
    const s = app.sound;
    s?.sfx?.('explode', 1.2);
    s?.sfx?.('puff');
    this.lid.classList.add('fly');
    const bw = BW * this.scale;
    const bh = BH * this.scale;
    for (let i = 0; i < 26; i++) {
      this.fx.push({
        x: this.bx + (Math.random() - 0.5) * bw, y: this.floor - bh * (0.7 + Math.random() * 0.4),
        vx: (Math.random() - 0.5) * 420, vy: -150 - Math.random() * 380, life: 0.9 + Math.random() * 0.6,
        c: Math.random() < 0.55 ? ['#c08a4a', '#a8743a', '#7a4c22'][i % 3] : '#e8dcc8', s: 3 + Math.random() * 4,
      });
    }
    this.fxCanvas = el('canvas', 'intro-fx');
    this.fxCanvas.width = innerWidth;
    this.fxCanvas.height = innerHeight;
    document.body.append(this.fxCanvas);
    // Out it tumbles, switched off.
    pet.offstage = false;
    pet.powerOff = true;
    pet.dir = Math.random() < 0.5 ? -1 : 1;
    pet.x = this.bx;
    pet.y = this.floor - bh * 0.6;
    pet.fall(pet.dir * pet.P * 1.3, -pet.P * 3.4);
    const limp = pet.view.animator.has('off');
    pet.anim(limp ? 'off' : 'jump', { facing: limp ? pet.side() : 'front' });
    this.spin = pet.dir * (5 + Math.random() * 3);
    this.stage = 'falling';
    setTimeout(() => this.box?.classList.add('gone'), 500);
    setTimeout(() => { this.box?.remove(); this.box = null; }, 1300);
  }

  // ---------- waking up ----------

  onPetClick() {
    if (this.stage === 'off' && this.app.pet.powerOff && this.app.pet.mode === 'ground') {
      this.wake();
      return true;
    }
    return this.busy;
  }

  wake() {
    const { app } = this;
    const { pet } = app;
    this.stage = 'boot';
    this.wakeHint?.remove();
    this.wakeHint = null;
    const len = pet.bootUp();
    const s = app.sound;
    s?.tone8?.(80, 900, 0.7, 'sawtooth', 0.05);
    setTimeout(() => s?.tone8?.(900, 1400, 0.15, 'square', 0.04), 700);
    const T = this.T;
    const owner = app.game.profile.owner || '?';
    const name = app.config.name || 'Persocon';
    const lines = T.boot(owner, name);
    this.bootEl = el('div', 'intro-boot');
    this.bootEl.dataset.noI18n = '';
    this.bootLog = el('div', 'intro-boot-log');
    this.bootBar = el('div', 'intro-boot-bar');
    const fill = el('i');
    this.bootBar.append(fill);
    this.bootEl.append(this.bootLog, this.bootBar);
    document.body.append(this.bootEl);
    this.bootT = 0;
    this.bootLen = len;
    this.bootFill = fill;
    this.bootLines = lines.map((text, i) => ({ text, at: 0.3 + (i * (len - 0.9)) / lines.length }));
    this.bootNext = 0;
    this.bootWho = [owner, name];
    pet.timer = Infinity;
  }

  updateBoot(dt) {
    const s = this.app.sound;
    this.bootT += dt;
    const lines = this.bootLines;
    while (this.bootNext < lines.length && this.bootT >= lines[this.bootNext].at) {
      const i = this.bootNext++;
      this.bootLog.append(el('div', '', lines[i].text));
      while (this.bootLog.children.length > 4) this.bootLog.firstChild.remove();
      const last = i === lines.length - 1;
      s?.tone8?.(last ? 1320 : 660 + i * 40, last ? 1760 : 700 + i * 40, 0.05, 'square', 0.035);
    }
    this.bootFill.style.width = `${Math.min(100, (this.bootT / Math.max(0.1, this.bootLen - 0.5)) * 100)}%`;
    if (this.bootT >= this.bootLen) this.finish(...this.bootWho);
  }

  finish(owner, name) {
    const { app } = this;
    const s = app.sound;
    s?.sfx?.('chime', 1.4);
    this.bootEl?.classList.add('done');
    setTimeout(() => { this.bootEl?.remove(); this.bootEl = null; }, 900);
    if (app.pet.action === 'boot') app.pet.timer = 0.3;
    app.game.profile.booted = true;
    app.game.profile.born = Date.now();
    app.game.changed?.();
    app.game.persist?.();
    this.stage = 'done';
    document.body.classList.remove('intro-on');
    app.speech?.say?.(this.T.hello(owner, name), 6);
    // New game: after the greeting she looks around, confused about where she is.
    setTimeout(() => app.pet.emit('newgame'), 6500);
    if (app.head) app.fx?.heart?.('love', app.head, true);
    this.onDone?.();
  }

  // ---------- per frame ----------

  update(dt) {
    this.t += dt;
    const { pet } = this.app;
    if (this.box) {
      this.placeBox();
      if (this.stage === 'box' || this.stage === 'signed') {
        this.nextWobble -= dt;
        if (this.nextWobble <= 0) {
          this.nextWobble = 2.5 + Math.random() * 3;
          this.shake = 0.5;
          this.app.sound?.tone8?.(120, 90, 0.08, 'triangle', 0.03);
        }
      }
      if (this.stage === 'opening') {
        this.openT += dt;
        if (this.openT > 1.1) this.burst();
      }
      this.shake = Math.max(0, this.shake - dt);
      const k = this.stage === 'opening' ? 1 + this.openT * 3 : 1;
      const a = this.shake > 0 ? Math.sin(this.t * 38) * 4 * Math.min(1, this.shake * 2) * k : 0;
      const hop = this.shake > 0 ? -Math.abs(Math.sin(this.t * 19)) * 3 * Math.min(1, this.shake) * k : 0;
      this.box.style.transform = `translateY(${hop.toFixed(1)}px) rotate(${a.toFixed(2)}deg)`;
    }
    if (this.stage === 'falling') {
      if (pet.mode === 'ground') {
        this.stage = 'off';
        pet.tilt = 0;
        this.app.sound?.play('landing', { volume: 0.5 });
        this.app.sound?.play('bonk', { volume: 0.3 });
        if (!pet.powerOff) pet.powerOff = true;
        pet.lieOff();
        this.wakeHint = el('div', 'intro-hint wake', this.T.clickToWake);
        this.wakeHint.dataset.noI18n = '';
        document.body.append(this.wakeHint);
      } else {
        pet.tilt += this.spin * dt;
      }
    }
    if (this.wakeHint && this.app.head) {
      this.wakeHint.style.left = `${Math.round(this.app.head.x)}px`;
      this.wakeHint.style.top = `${Math.round(Math.min(this.app.head.y, pet.y - pet.P * 0.2) - pet.P * 0.25)}px`;
    }
    if (this.stage === 'boot') this.updateBoot(dt);
    if (this.bootEl && this.app.head) {
      this.bootEl.style.left = `${Math.round(this.app.head.x)}px`;
      this.bootEl.style.top = `${Math.round(this.app.head.y - 12)}px`;
    }
    this.updateFx(dt);
  }

  updateFx(dt) {
    if (!this.fxCanvas) return;
    const g = this.fxCanvas.getContext('2d');
    g.clearRect(0, 0, this.fxCanvas.width, this.fxCanvas.height);
    for (const p of this.fx) {
      p.life -= dt;
      p.vy += 900 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.y > this.floor - 2) { p.y = this.floor - 2; p.vy *= -0.3; p.vx *= 0.6; }
      g.globalAlpha = Math.max(0, Math.min(1, p.life * 2));
      g.fillStyle = p.c;
      g.fillRect(Math.round(p.x), Math.round(p.y), Math.round(p.s), Math.round(p.s * 0.6));
    }
    this.fx = this.fx.filter((p) => p.life > 0);
    if (!this.fx.length) { this.fxCanvas.remove(); this.fxCanvas = null; }
  }
}
