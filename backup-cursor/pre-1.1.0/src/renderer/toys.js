// Fun stuffs placed on the desktop floor: the pet plays with them by itself, they wear out and
// break, and clicking a broken one repairs it for half the price.
import { itemById, TASTE_RANK } from './game.js';
import { DIFFICULTIES } from './behavior.js';
import { icon, cartridge } from './pixel.js';
import { GAMES } from './games.js';
import { FURN, BALLS, CONSOLES, Furniture, baseId, PRINT_AREA } from './furniture.js';
import { Casino } from './casino.js';
import { GACHA_PRICE, STYLES, pickStyle } from './casinoitems.js';
import { FunToys, FUN_SIZE } from './funtoys.js';

const clamp = (v, a, b) => Math.min(Math.max(v, a), b);
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (l) => l[Math.floor(Math.random() * l.length)];
const GB_BACK = new URL('./assets/toys/gameboy_back.png', import.meta.url).href;
const SUPPLY_STAT = { medicina: 'health', bebidas: 'thirst', comidas: 'hunger' };
// Picture of an item; the ones that only have an emoji get it drawn on a canvas.
const emojiArt = new Map();
function itemArt(item) {
  const src = globalThis.petSkins?.art(item?.id, item?.img) || item?.img;
  if (src || !item?.icon) return src || null;
  if (!emojiArt.has(item.icon)) {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    g.font = '52px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(item.icon, 32, 36);
    emojiArt.set(item.icon, c.toDataURL('image/png'));
  }
  return emojiArt.get(item.icon);
}
// While playing, the pet faces the screen: what we see is the back of the handheld.
const backArt = (id) => (id === 'gameboy' ? GB_BACK : icon(`${id}_back`));

export class Toys {
  constructor(app, screen) {
    this.app = app;
    this.screen = screen;
    this.els = new Map();
    this.lastPlay = {};
    this.sadTimer = 30;
    this.popup = null;
    this.parcels = new Map();
    this.unpacking = null;
    this.furn = new Furniture(app, this);
    this.fun = new FunToys(app, this);
    this.casino = new Casino(app, this);
    app.casino = this.casino;
    const { pet, game } = app;
    pet.findDelivery = () => this.nextDelivery();
    pet.findToy = () => {
      const now = performance.now();
      const ids = Object.entries(game.toys)
        .filter(([id, t]) => t.placed && !t.broken && this.reach(t) && now - (this.lastPlay[id] || 0) > 45000 && this.furn.usable(id))
        .filter(([id]) => !BALLS[id] || id === pet.ball?.id)
        .filter(([id]) => !this.physical(id) || !pet.drained())
        .filter(([id]) => this.app.doll?.brain?.using !== id)
        .map(([id]) => id);
      if (!ids.length) return null;
      // Never plays from on top of a window: gets down to the floor first.
      if (pet.surfaceId !== 'floor') return { x: pet.x, play: (p) => p.startGround('hop') };
      const w = ids.map((i) => pet.prefMul(i) * this.fun.want(baseId(i)));
      let r = Math.random() * w.reduce((a, b) => a + b, 0);
      const id = ids.find((_, i) => (r -= w[i]) <= 0) || ids[0];
      if (BALLS[id] && pet.ball) return { x: pet.ball.x, play: (p) => this.play(id, p) };
      if (id === 'pelucia' && this.app.doll?.x != null) return { x: this.app.doll.x, play: (p) => this.play(id, p) };
      return { x: this.spot(id), play: (p) => this.play(id, p) };
    };
    pet.needsSupply = () => this.needsSupply();
    pet.trySing = () => this.sing(pet);
    pet.findBed = () => {
      for (const [id, cushion] of [['cama', false], ['almofada', true]]) {
        const t = game.toys[id];
        if (t?.placed && !t.broken && this.reach(t) && pet.surfaceId === 'floor') return { x: t.x, cushion };
      }
      return null;
    };
    pet.findBath = () => {
      const t = game.toys.banheira;
      if (!t?.placed || t.broken || !this.here(t) || performance.now() - (this.lastPlay.banheira || 0) < 30000) return null;
      return { x: this.spot('banheira'), play: (p) => this.play('banheira', p) };
    };
  }

  physical(id) {
    return !!BALLS[id] || id === 'espada' || this.fun.physical(id);
  }

  item(id) {
    return itemById(id);
  }

  // Objects belong to the monitor they were placed on and stay there while the pet is away.
  here(t) {
    return (t?.display ?? 0) === (this.app.display?.() ?? 0);
  }

  // On this screen and not hung up high (furniture can be placed anywhere while editing).
  reach(t) {
    return this.here(t) && !(t.y < this.floorY() - this.P * 0.25);
  }

  // Right-click on an object: store it, change its look, and options of that object.
  contextMenu(id, x, y) {
    this.closeMenu();
    const { game, sound } = this.app;
    const t = game.toys[id];
    const el = document.createElement('div');
    el.className = 'toy-menu hitzone';
    const btn = (label, fn) => {
      const b = document.createElement('button');
      b.textContent = label;
      b.onclick = (e) => { e.stopPropagation(); this.closeMenu(); fn(); };
      el.append(b);
    };
    const title = document.createElement('div');
    title.className = 'title';
    title.textContent = itemById(baseId(id))?.name || id;
    el.append(title);
    if (FURN[baseId(id)]?.disco && t) {
      const prefs = (game.disco[baseId(id)] ||= {});
      const set = (k, v, save = true) => {
        t[k] = prefs[k] = v;
        if (save) game.changed();
      };
      const color = document.createElement('input');
      color.type = 'color';
      color.value = t.color && t.color !== 'multi' ? t.color : '#ff4fd8';
      color.oninput = () => set('color', color.value, false);
      color.onchange = () => set('color', color.value);
      const multi = document.createElement('button');
      multi.textContent = '🌈 Multicor';
      multi.onclick = (e) => { e.stopPropagation(); set('color', 'multi'); };
      const power = document.createElement('input');
      power.type = 'range';
      power.min = '0.2';
      power.max = '2';
      power.step = '0.1';
      power.value = String(t.power ?? 1);
      power.oninput = () => set('power', +power.value, false);
      power.onchange = () => set('power', +power.value);
      const row = (label, ...kids) => {
        const r = document.createElement('label');
        r.className = 'row';
        r.append(label, ...kids);
        el.append(r);
      };
      row('Cor ', color, multi);
      row('Intensidade ', power);
      const skins = this.app.skins;
      if (skins?.hasMusic) btn(skins.music ? '⏹ Parar música' : '🎵 Tocar música do resourcepack', () => (skins.music ? skins.stopMusic() : skins.playMusic()));
    }
    if (id === 'pelucia') {
      btn('🧍 Trocar skin (.png do Minecraft)…', async () => {
        const path = await window.petAPI.pickFile?.('Skin do Doll', 'Skin Minecraft', ['png']);
        if (path) this.app.doll?.setSkin(await window.petAPI.readFileData(path));
      });
      btn('🔁 Skin padrão', () => { this.app.doll?.setSkin(null); this.app.skins?.setObject('pelucia', null); });
      if (game.gear.cristal) btn(game.dollAwake !== false ? '😴 Fazer o Doll dormir (parar de se mexer)' : '✨ Acordar o Doll', () => this.app.doll?.setAwake(game.dollAwake === false));
    }
    if (id === 'alvo') btn('🎯 Jogar (3 minutos)', () => this.furn.startTargetGame());
    if (id === 'gacha' && !t?.broken) btn(`🎰 Girar a Gacha (🪙 ${GACHA_PRICE}, você paga)`, () => this.casino.click(id, x, y));
    if (id === 'slot' && !t?.broken) btn(`🎰 Pedir para ela jogar (carteira dela: 🪙 ${this.casino.wallet})`, () => this.casino.click(id, x, y));
    if (this.casino.vend.owns(id) && !t?.broken) btn(`${id === 'venda_bebida' ? '🥤' : '🍙'} Pedir para ela comprar (carteira dela: 🪙 ${this.casino.wallet})`, () => this.casino.click(id, x, y));
    const styles = t && (id === 'gacha' ? STYLES.gacha : id === 'slot' ? STYLES.slot : (id === 'videogame' || CONSOLES[id]) ? STYLES.game : null);
    if (styles) {
      const sel = document.createElement('select');
      for (const [k, label] of [['random', '🎲 Aleatória (alterna)'], ...styles]) sel.append(new Option(label, k, false, (t.anim || 'random') === k));
      sel.onchange = () => {
        t.anim = sel.value;
        game.changed();
      };
      const r = document.createElement('label');
      r.className = 'row';
      r.append('🎞 Animação ', sel);
      el.append(r);
    }
    if (t && itemById(baseId(id))?.furn) btn('✏️ Editar esta mobília', () => this.editOne(id));
    btn('🎨 Mudar visual / importar…', () => this.app.openObjects?.(baseId(id)));
    if (id === 'impressora') this.printerInfo(el);
    if (t && !t.broken && this.fun.owns(id)) this.fun.menu(baseId(id), btn, el);
    if (t && !itemById(baseId(id))?.fixed) btn('📦 Guardar no inventário', () => game.pickUpToy(id));
    el.style.left = `${Math.min(x, innerWidth - 230)}px`;
    el.style.top = `${Math.min(y, innerHeight - 220)}px`;
    el.addEventListener('pointerdown', (e) => e.stopPropagation());
    document.body.append(el);
    this.menuEl = el;
    sound.play('blip', { volume: 0.4 });
    // Any click outside closes it (capture: objects stop their own pointerdown from bubbling).
    this.menuOff = (e) => !el.contains(e.target) && this.closeMenu();
    setTimeout(() => this.menuEl === el && window.addEventListener('pointerdown', this.menuOff, true), 0);
    window.addEventListener('blur', this.menuOff);
    this.app.uiChanged();
  }

  // Double click on a piece of furniture: a small menu with just "Editar esta mobília".
  quickEdit(id, x, y) {
    this.closeMenu();
    const el = document.createElement('div');
    el.className = 'toy-menu hitzone';
    const title = document.createElement('div');
    title.className = 'title';
    title.textContent = itemById(baseId(id))?.name || id;
    const b = document.createElement('button');
    b.textContent = '✏️ Editar esta mobília';
    b.onclick = (e) => { e.stopPropagation(); this.closeMenu(); this.editOne(id); };
    el.append(title, b);
    el.style.left = `${Math.min(x, innerWidth - 230)}px`;
    el.style.top = `${Math.max(4, Math.min(y - 70, innerHeight - 90))}px`;
    el.addEventListener('pointerdown', (e) => e.stopPropagation());
    document.body.append(el);
    this.menuEl = el;
    this.app.sound.play('blip', { volume: 0.4 });
    this.menuOff = (e) => !el.contains(e.target) && this.closeMenu();
    setTimeout(() => this.menuEl === el && window.addEventListener('pointerdown', this.menuOff, true), 0);
    window.addEventListener('blur', this.menuOff);
    this.app.uiChanged();
  }

  // "Editar mobília" with this piece already selected.
  editOne(id) {
    this.startEdit();
    this.select(id);
  }

  closeMenu() {
    if (!this.menuEl) return;
    this.menuEl.remove();
    this.menuEl = null;
    window.removeEventListener('pointerdown', this.menuOff, true);
    window.removeEventListener('blur', this.menuOff);
    this.app.uiChanged();
  }

  // With the microphone: sings a random-style tune, music notes floating around.
  sing(pet) {
    if (!pet.gear.microfone || pet.mode !== 'ground' || pet.activity) return false;
    const style = ['pop', 'blues', 'rock', 'jazz', 'enka'][Math.floor(Math.random() * 5)];
    pet.playToy({
      id: 'mic', dur: rand(7, 13), hold: icon('mic'), holdFrom: 0, gain: { mood: 0.5, hunger: -0.04, thirst: -0.06 },
      anim: pet.pickClip(['cantar', 'danca'], ['idle']), onEnd: () => {},
      tick: (dt, tp) => {
        tp.next = (tp.next ?? 0) - dt;
        tp.reach = 0.5;
        tp.angle = -20;
        if (tp.next <= 0) {
          tp.next = rand(1.6, 2.6);
          this.app.sound.sing(style, 1);
          this.app.modes?.note(Math.random() < 0.4);
        }
      },
    });
    pet.emit('sing', { style });
    return true;
  }

  // ---------- food backpack ----------

  foodBagX() {
    return this.app.game.foodBagX ?? this.app.world.width * 0.12;
  }

  hasSupplies() {
    return this.app.game.items((i) => SUPPLY_STAT[i.cat]).length > 0;
  }

  // Low on something the backpack has: walk to it (or hook an item from afar) and use it.
  needsSupply() {
    const { pet, game } = this.app;
    if (pet.surfaceId !== 'floor' || this.supplyCool > performance.now()) return null;
    const s = pet.stats;
    const busy = this.busyFun();
    const has = (cat, extra = () => true) => game.items((i) => i.cat === cat && !i.watchOnly && !(busy && i.price === 0) && extra(i));
    let cat = null;
    if (s.health < 40 && has('medicina', (i) => !i.buff).length) cat = 'medicina';
    // Thirsty/hungry with a vending machine: sometimes (always, if the bag has nothing she likes)
    // she buys something she likes with her own wallet.
    const vend = this.casino.vend;
    for (const [c, low] of [['bebidas', s.thirst < 35], ['comidas', s.hunger < 35]]) {
      if (cat || !low) continue;
      const v = vend.plan(c, has(c, (i) => (TASTE_RANK[game.tasteOf(i.id)] ?? 2) >= 3).length > 0);
      if (v) {
        this.supplyCool = performance.now() + 20000;
        return v;
      }
      if (has(c).length) cat = c;
    }
    if (!cat) return null;
    this.supplyCool = performance.now() + 20000;
    const x = this.foodBagX();
    const take = () => this.takeSupply(cat);
    if (pet.gear.gancho && Math.abs(x - pet.x) > this.P * 5 && Math.random() < 0.6) {
      const item = this.bestSupply(cat);
      const el = this.makeEl('toy flying', item.img, item.icon);
      const t = { x, y: this.floorY() - this.P * 0.2, el, move(nx, ny) { this.x = nx; this.y = ny; }, done: () => { el.remove(); this.flying = null; take(); } };
      this.flying = t;
      if (pet.fireHook(t.x, t.y, 'pull', t)) return { hooked: true };
      el.remove();
      this.flying = null;
    }
    return { x: x + this.P * 0.3, use: take };
  }

  // Watching or playing: she won't grab the free leftovers / tap water on her own.
  busyFun() {
    const p = this.app.pet;
    return p.activity === 'watch' || p.action === 'watch' || !!p.toyPlay || !!p.mini || !!this.app.minigames?.active;
  }

  bestSupply(cat) {
    const stat = SUPPLY_STAT[cat];
    const busy = this.busyFun();
    const game = this.app.game;
    const list = game.items((i) => i.cat === cat && !i.buff && !i.watchOnly && !(busy && i.price === 0));
    // Her taste first (free leftovers/tap water only when nothing else is left), then the effect.
    const score = (i) => (i.price === 0 ? -100 : 0) + (TASTE_RANK[game.tasteOf(i.id)] ?? 2) * 12 + (i.effects?.[stat] || 0) * 0.5;
    list.sort((a, b) => score(b.item) - score(a.item));
    return list[0]?.item;
  }

  takeSupply(cat) {
    const { game, pet, sound } = this.app;
    const item = this.bestSupply(cat);
    if (item && game.use(item.id)) {
      sound.play('blip', { volume: 0.4 });
      pet.emit('supply', { item });
    }
    if (pet.action === 'goto') pet.chooseNext();
  }

  get P() {
    return this.app.pet.P;
  }

  floorY() {
    return this.app.world.surfaces[0]?.y ?? innerHeight;
  }

  size(key) {
    const scale = this.app.game.toys[key]?.scale || 1;
    const id = baseId(key);
    return Math.round(this.P * scale * (FURN[id]?.size ?? FUN_SIZE[id]?.[0] ?? { gameboy: 0.2, bag: 0.26, food: 0.3, espada: 0.07 }[id] ?? 0.28));
  }

  ratio(key) {
    const id = baseId(key);
    const own = this.app.skins?.ratio(id);
    if (own) return own;
    return FURN[id]?.ratio ?? FUN_SIZE[id]?.[1] ?? { gameboy: 1.6, espada: 4.5, food: 1.1 }[id] ?? 1;
  }

  // Where the pet stands to play with a toy.
  spot(id) {
    const t = this.app.game.toys[id];
    const b = baseId(id);
    const x = this.fun.owns(b) ? this.fun.spot(b, t) : FURN[b] && !FURN[b].console ? this.furn.spot(b, t) : t.x + this.P * 0.35;
    return clamp(x, this.P * 0.3, this.app.world.width - this.P * 0.3);
  }

  // TV screen area (CSS px) of the placed video game, from its picture's screen region.
  // rot/ox/oy: the TV's rotation (deg) around the middle of its base, for the screen to follow.
  tvRect() {
    const el = this.els.get('videogame');
    const t = this.app.game.toys.videogame;
    if (!el || el.style.display === 'none' || !t) return null;
    const w = this.size('videogame');
    const h = w * this.ratio('videogame');
    const left = t.x - w / 2;
    const top = this.floorY() - h;
    const s = this.app.skins?.region('videogame') || FURN.videogame.screen;
    const sx = t.flip ? 1 - s.x - s.w : s.x;
    return { x: left + w * sx, y: top + h * s.y, w: w * s.w, h: h * s.h, rot: t.rot || 0, ox: t.x, oy: this.floorY() };
  }

  // ---------- furniture editor (Ações → Editar mobília) ----------

  // Objects drawn on this monitor that can be moved/rotated (balls and the Doll have physics).
  editable() {
    return Object.entries(this.app.game.toys).filter(([id, t]) => t.placed && !BALLS[id] && id !== 'pelucia' && this.here(t)).map(([id]) => id);
  }

  startEdit() {
    if (this.editing) return;
    const { pet } = this.app;
    this.closeMenu();
    this.closeBag();
    this.editing = { wasPaused: pet.paused, sel: null };
    this.want = null;
    if (pet.toyPlay) pet.endToy(true);
    if (!pet.paused) this.app.pause();
    document.body.classList.add('editing-furn');
    const bar = document.createElement('div');
    bar.className = 'furn-bar hitzone';
    bar.innerHTML = '<span class="furn-title">🛋 Editando mobília</span><span class="furn-hint">Arraste para mover · roda do mouse gira · Shift + roda muda o tamanho</span>';
    const done = document.createElement('button');
    done.className = 'primary';
    done.textContent = '✔ Concluir';
    done.onclick = () => this.stopEdit();
    bar.append(done);
    const tools = document.createElement('div');
    tools.className = 'furn-tools hitzone';
    const tool = (label, title, fn) => {
      const b = document.createElement('button');
      b.textContent = label;
      b.title = title;
      b.onclick = (e) => { e.stopPropagation(); fn(); };
      tools.append(b);
    };
    tool('⟲', 'Girar 15° para a esquerda', () => this.rotate(-15));
    tool('⟳', 'Girar 15° para a direita', () => this.rotate(15));
    tool('⇋', 'Virar para o outro lado', () => this.mirror());
    tool('−', 'Diminuir', () => this.resize(-0.1));
    tool('+', 'Aumentar', () => this.resize(0.1));
    tool('⊙', 'Voltar ao normal (direção, giro e tamanho)', () => this.resetTurn());
    tool('📦', 'Guardar no inventário', () => {
      const id = this.editing?.sel;
      if (!id) return;
      this.select(null);
      this.app.game.pickUpToy(id);
    });
    tools.addEventListener('pointerdown', (e) => e.stopPropagation());
    document.body.append(bar, tools);
    Object.assign(this.editing, { bar, tools });
    this.app.sound.play('ok', { volume: 0.4 });
    this.app.uiChanged();
  }

  stopEdit() {
    const ed = this.editing;
    if (!ed) return;
    this.editing = null;
    ed.bar.remove();
    ed.tools.remove();
    document.body.classList.remove('editing-furn');
    for (const el of this.els.values()) el.classList.remove('selected');
    if (!ed.wasPaused) this.app.resume();
    this.app.game.changed();
    this.app.sound.play('ok', { volume: 0.4 });
    this.app.uiChanged();
  }

  select(id) {
    if (!this.editing) return;
    this.editing.sel = id && this.app.game.toys[id] ? id : null;
    for (const [k, el] of this.els) el.classList.toggle('selected', k === this.editing.sel);
  }

  rotate(deg) {
    const t = this.app.game.toys[this.editing?.sel];
    if (!t) return;
    t.rot = (((t.rot || 0) + deg + 540) % 360) - 180;
    this.app.sound.play('blip', { volume: 0.3, rate: 1 + deg / 60 });
    this.app.game.dirty = true;
  }

  mirror() {
    const t = this.app.game.toys[this.editing?.sel];
    if (!t) return;
    t.flip = !t.flip;
    this.app.sound.play('blip', { volume: 0.3 });
    this.app.game.dirty = true;
  }

  resize(step) {
    const t = this.app.game.toys[this.editing?.sel];
    if (!t) return;
    const scale = clamp(Math.round(((t.scale || 1) + step) * 10) / 10, 0.5, 2.5);
    if (scale === (t.scale || 1)) return;
    t.scale = scale;
    this.app.sound.play('blip', { volume: 0.3, rate: 0.8 + scale * 0.2 });
    this.app.game.dirty = true;
  }

  resetTurn() {
    const t = this.app.game.toys[this.editing?.sel];
    if (!t) return;
    t.rot = 0;
    t.flip = false;
    t.scale = 1;
    this.app.sound.play('cancel', { volume: 0.3 });
    this.app.game.dirty = true;
  }

  // Toolbar floating above the selected object.
  updateEditTools(hidden) {
    const ed = this.editing;
    if (!ed) return;
    const el = ed.sel && this.els.get(ed.sel);
    const show = !!el && !hidden && el.style.display !== 'none';
    ed.tools.style.display = show ? 'flex' : 'none';
    if (!show) return;
    const r = el.getBoundingClientRect();
    const w = ed.tools.offsetWidth;
    const h = ed.tools.offsetHeight;
    const x = clamp(r.left + r.width / 2 - w / 2, 4, innerWidth - w - 4);
    const y = r.top - h - 10 < 4 ? r.bottom + 10 : r.top - h - 10;
    ed.tools.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
  }

  place(id) {
    const { pet, world, game } = this.app;
    const onFloor = pet.mode === 'ground' && pet.surfaceId === 'floor';
    const x = clamp(onFloor ? pet.x + pet.dir * this.P * 0.7 : world.width / 2, this.P * 0.4, world.width - this.P * 0.4);
    const key = game.placeToy(id, x, this.app.display?.() ?? 0);
    if (!key) return;
    this.app.sound.play('ok', { volume: 0.4 });
    // A freshly placed toy gets played with right away.
    this.want = key;
    this.goPlay();
  }

  goPlay() {
    const { pet } = this.app;
    const id = this.want;
    const t = id && this.app.game.toys[id];
    if (!t?.placed || t.broken) return (this.want = null);
    if (pet.dead || pet.chase || pet.mini || pet.activity || pet.eating || pet.mode !== 'ground' || !['idle', 'walk', 'run', 'sit', 'emote'].includes(pet.action)) return;
    if (FURN[baseId(id)]?.disco || !this.furn.usable(id)) return (this.want = null);
    if (BALLS[id]) {
      if (pet.startBall(true)) this.want = null;
      return;
    }
    if (pet.surfaceId !== 'floor') return pet.startGround('hop');
    // Far away and carrying the hookshot: pulls the toy over instead of walking.
    if (pet.gear.gancho && Math.abs(t.x - pet.x) > this.P * 5 && Math.random() < 0.5) {
      const self = this;
      const tgt = {
        y: this.floorY() - this.size(id) * this.ratio(id) * 0.5,
        get x() { return t.x; },
        move(x, y) { t.x = clamp(x, self.P * 0.3, self.app.world.width - self.P * 0.3); this.y = y; },
        done: () => {
          t.x = clamp(pet.x + pet.dir * this.P * 0.35, this.P * 0.3, this.app.world.width - this.P * 0.3);
          this.app.game.changed();
          this.play(id, pet);
        },
      };
      this.pulling = { id, tgt };
      if (pet.fireHook(t.x, tgt.y, 'pull', tgt)) return (this.want = null);
      this.pulling = null;
    }
    if (pet.goTo(this.spot(id), () => this.play(id, pet))) this.want = null;
  }

  play(id, pet) {
    const { game } = this.app;
    const b = baseId(id);
    const item = itemById(b);
    const t = game.toys[id];
    if (!t || t.broken || !t.placed) return pet.chooseNext();
    if (this.physical(id) && this.app.care?.refuse()) return pet.startGround('idle');
    this.app.doll?.brain?.yieldToy?.(id);
    this.lastPlay[id] = performance.now();
    const scale = game.difficultyScale();
    const end = (interrupted) => {
      if (CONSOLES[id] || id === 'videogame') this.screen.stop();
      if (!interrupted && game.wearToy(id)) {
        this.app.sound.play('explode', { volume: 0.4 });
        pet.adjust({ mood: -6 * (DIFFICULTIES[pet.cfg.difficulty] ?? 1) });
        pet.emit('toyBroke', { item });
      }
    };
    const pickAnim = pet.pickClip(['pegar'], ['use_mainhand', 'swing_hand', 'idle']);
    if (this.fun.owns(b)) return this.fun.play(id, pet, end, scale, pickAnim) || pet.chooseNext();
    if (FURN[b] && !FURN[b].console && this.furn.play(id, pet, end)) return;
    if (FURN[b] && !FURN[b].console) return pet.chooseNext();
    const art = this.app.skins?.art(id, item.img) || item.img;
    if (CONSOLES[id]) {
      const cart = game.pickCart();
      game.cartridge = cart;
      const fav = game.isFavorite(cart);
      const gain = fav ? { ...item.gain, mood: item.gain.mood * 1.6 } : item.gain;
      const endGb = (interrupted, tp) => {
        game.playedCart(cart, tp?.t || 0);
        end(interrupted);
      };
      const sit = Math.random() < 0.5;
      pet.playToy({
        id, dur: rand(15, 130), gain, scale, hold: art === item.img ? backArt(id) : art, holdFrom: 0.9, pickAnim, cart, console: id,
        anim: sit ? 'sit' : 'idle', pose: sit ? 'sit' : 'stand', onEnd: endGb,
        tick: (dt, tp) => this.gameboyTick(dt, tp, pet),
      });
    } else if (id === 'pelucia') {
      this.dollPlay(pet, item, scale, pickAnim, end);
    } else if (id === 'espada') {
      pet.playToy({
        id, dur: rand(16, 26), gain: item.gain, scale, hold: art, holdFrom: 0.9, pickAnim, one: true,
        onEnd: (i) => {
          pet.squash = null;
          end(i);
        },
        tick: (dt, tp) => this.swordTick(dt, tp, pet),
      });
    } else if (BALLS[id]) {
      pet.ballPlay = { onEnd: end };
      if (!pet.startBall(false)) pet.ballPlay = null;
    }
  }

  // Thumbs mashing, swaying with the game, little jolts of excitement or frustration.
  gameboyTick(dt, tp, pet) {
    const { game } = this.app;
    const cart = tp.cart || game.cartridge;
    const sound = this.app.sound;
    // Play style (STYLES.game): chosen once per session, or fixed in the right-click menu.
    tp.style ||= pickStyle(game.toys[tp.id], 'game', STYLES.game);
    // First puts the cartridge in: holds it up for a moment (sometimes blows into it first), then a click.
    if (!tp.versus && !tp.inserted) {
      if (tp.ins === undefined) {
        tp.ins = 0;
        tp.blow = Math.random() < 0.35;
        tp.realHold = tp.hold;
        tp.hold = cartridge(GAMES[cart]?.color || '#888', cart, tp.console === 'gamegear' ? 'gg' : tp.console === 'psp' ? 'psp' : 'gb', game.isFavorite(cart));
      }
      const prev = tp.ins;
      tp.ins += dt;
      tp.cartIn = true;
      tp.reach = tp.blow && tp.ins < 1.6 ? 0.62 + Math.sin(tp.ins * 3) * 0.03 : 0.45 + Math.sin(tp.ins * 6) * 0.05;
      if (tp.blow) for (const at of [0.5, 1.15]) {
        if (prev < at && tp.ins >= at) {
          sound.sfx('puff', 0.7);
          this.furn.floatText(pet.x, pet.y - this.P * 1.1, '💨');
        }
      }
      if (tp.ins < (tp.blow ? 2.1 : 1.1)) return;
      tp.inserted = true;
      tp.cartIn = false;
      tp.hold = tp.realHold;
      sound.tone8(1300, 700, 0.05, 'square', 0.08);
      setTimeout(() => sound.sfx(tp.console === 'tv' ? 'tvon' : 'select', 0.8), 150);
    }
    if (!this.screen.game || (tp.dollP2 && !this.screen.ai2)) {
      this.screen.start(cart, { skill: game.cartSkill(cart), vs: !!tp.versus || !!tp.dollP2, ai2: tp.dollP2 || 0 });
      this.screen.setConsole?.(tp.console || 'gameboy');
    }
    if (tp.dollP2) {
      const [a, b] = this.screen.scores();
      if (a !== tp.lastA && tp.lastA != null) pet.emit('gameExcite');
      tp.lastA = a;
      tp.lastB = b;
    }
    if (tp.versus) {
      pet.love(dt * 0.03 * (1 + Math.min(3, tp.t / 120)));
      const [a, b] = this.screen.scores();
      if (a !== tp.lastA) pet.emit('gameExcite');
      tp.lastA = a;
      tp.lastB = b;
    }
    tp.excite = Math.max(0, (tp.excite || 0) - dt * 1.4);
    // Body follows the game: leans with the stick, jolts with the button.
    tp.leanTo = this.screen.motion * 0.12 * pet.dir + (tp.leanTo ?? 0) * 0.3;
    tp.excite = Math.max(tp.excite, this.screen.press * 0.35);
    tp.lean = (tp.lean ?? 0) + ((tp.leanTo ?? 0) - (tp.lean ?? 0)) * Math.min(1, dt * 3);
    tp.next = (tp.next ?? 1) - dt;
    const st = tp.style;
    if (tp.next <= 0) this.gameBeat(tp, pet, st);
    const mash = Math.sin(tp.t * 15) * 0.025 + Math.sin(tp.t * 23) * 0.015;
    if (st === 'focus') {
      // Leaning in, tiny precise thumbs.
      tp.reach = 0.3 + mash * 0.4 + tp.excite * 0.4;
      pet.tilt = 0.05 * pet.dir + tp.excite * 0.1 * Math.sin(tp.t * 18);
      tp.bob = Math.sin(tp.t * 15) * 0.4;
    } else if (st === 'rhythm') {
      // Nods to the music of the game.
      const beat = Math.sin(tp.t * Math.PI * 4);
      tp.reach = 0.26 + mash + tp.excite * 0.4;
      pet.tilt = tp.lean + beat * 0.05 + tp.excite * 0.1 * Math.sin(tp.t * 18);
      tp.bob = Math.abs(beat) * 2.4;
      const n = Math.floor(tp.t * 2);
      if (n !== tp.beatN) {
        tp.beatN = n;
        if (n % 2 === 0) sound.tone8([131, 165, 196, 165][(n / 2) % 4], [131, 165, 196, 165][(n / 2) % 4], 0.12, 'triangle', 0.02);
      }
    } else {
      const k = st === 'hype' ? 1.8 : st === 'rage' && tp.rage > 0 ? 2.2 : 1;
      tp.rage = Math.max(0, (tp.rage || 0) - dt);
      tp.reach = 0.26 + mash * k + tp.excite * 0.4;
      pet.tilt = tp.lean + Math.sin(tp.t * 1.7) * 0.03 * k + tp.excite * 0.1 * Math.sin(tp.t * 18)
        + (tp.rage > 0 ? Math.sin(tp.t * 40) * 0.04 : 0);
      tp.bob = Math.sin(tp.t * 15) * 1.2 * k;
    }
    pet.tiltPivot = { x: 0, y: 0 };
  }

  // A moment in the game, by play style: little wins (coin, jump, power-up), level ups, losses.
  gameBeat(tp, pet, st) {
    const sound = this.app.sound;
    tp.next = st === 'hype' ? rand(0.4, 1.3) : st === 'focus' ? rand(1.5, 3.5) : rand(0.6, 2.2);
    tp.leanTo = rand(-0.09, 0.09) * (st === 'hype' ? 2 : st === 'focus' ? 0.3 : 1);
    const r = Math.random();
    const win = { calm: 0.12, hype: 0.3, focus: 0.06, rage: 0.1, rhythm: 0.12 }[st] ?? 0.12;
    if (r < win) {
      tp.excite = 1;
      pet.emit('gameExcite');
      if (st === 'focus') sound.sfx('levelup', 0.7);
      else sound.sfx(pick(['coin', 'jump', 'powerup', 'select', 'laser']), 0.6);
      if (st === 'hype' && Math.random() < 0.3) this.furn.floatText(pet.x, pet.y - this.P * 1.1, pick(['✨', '🔥', '⭐']));
    } else if (st === 'rage' && r < win + 0.12) {
      tp.rage = 1.2;
      tp.excite = 0.8;
      tp.leanTo = -0.18 * pet.dir;
      sound.sfx(pick(['hit', 'gameover', 'explode']), 0.6);
      this.furn.floatText(pet.x, pet.y - this.P * 1.1, pick(['💢', '😤', '#@!']));
      pet.emit('gameRage');
    } else if (r < win + 0.06) {
      tp.excite = 0.6;
      tp.leanTo = -0.14 * pet.dir;
      if (st !== 'focus') sound.sfx(pick(['hit', 'bonk']), 0.4);
    } else if (st === 'rhythm' && r < win + 0.1) sound.sfx('jingle', 0.5);
  }

  stopVersus() {
    const { pet } = this.app;
    if (!pet.toyPlay?.versus) return false;
    pet.endToy(false);
    pet.chooseNext();
    return true;
  }

  // Hugs, tosses and catches, dances with or sits holding the Doll.
  dollPlay(pet, item, scale, pickAnim, end) {
    const doll = this.app.doll;
    const kind = pick(['hug', 'toss', 'dance', 'sit', 'spin', 'lift']);
    const sound = this.app.sound;
    pet.playToy({
      id: 'pelucia', dur: rand(10, 20), gain: item.gain, scale, hold: doll?.snapshot() || item.img, holdFrom: 0.9, pickAnim,
      anim: kind === 'dance' ? pet.pickClip(['danca'], ['idle']) : kind === 'sit' ? 'sit' : 'idle', pose: kind === 'sit' ? 'sit' : 'stand',
      onEnd: (i) => {
        pet.squash = null;
        pet.bodyY = 0;
        if (doll) {
          doll.set(clamp(pet.x + pet.dir * this.P * 0.3, this.P * 0.2, this.app.world.width - this.P * 0.2), this.floorY());
          doll.throwUp(pet.dir * this.P * 1.5, -this.P * 2);
        }
        end(i);
      },
      tick: (dt, tp) => {
        if (kind === 'hug') {
          tp.reach = 0.08;
          pet.tilt = Math.sin(tp.t * 3) * 0.06;
          // Squeezes it now and then (squeak!).
          if (Math.floor(tp.t / 2.2) !== Math.floor((tp.t - dt) / 2.2)) {
            sound.toy?.('squeak', 0.8);
            pet.squash = { x: 1.03, y: 0.97 };
          } else if (tp.t % 2.2 > 0.25) pet.squash = null;
        } else if (kind === 'spin') {
          // Twirls around holding it up.
          tp.reach = 0.55;
          const u = (tp.t % 2.4) / 2.4;
          pet.squash = u < 0.5 ? { x: Math.cos(u * 2 * Math.PI * 2) || 0.01, y: 1 } : null;
          tp.angle = Math.sin(tp.t * 4) * 15;
          if (u < 0.02) sound.toy?.('hoopSwish', 0.6);
        } else if (kind === 'lift') {
          // Lifts it over the head like a plane, bouncing on the toes.
          tp.reach = 0.85 + Math.sin(tp.t * 3) * 0.05;
          tp.angle = Math.sin(tp.t * 2) * 30;
          pet.bodyY = -Math.abs(Math.sin(tp.t * 3)) * this.P * 0.03;
          pet.tilt = Math.sin(tp.t * 2) * 0.05;
          if (Math.floor(tp.t / 3) !== Math.floor((tp.t - dt) / 3)) sound.toy?.('cheer', 0.4);
        } else if (kind === 'dance') {
          tp.reach = 0.5;
          tp.angle = Math.sin(tp.t * 6) * 25;
          pet.tilt = Math.sin(tp.t * 3) * 0.08;
        } else if (kind === 'sit') {
          tp.reach = 0.3;
          tp.angle = Math.sin(tp.t * 2) * 8;
        } else if (doll) {
          // Toss: throws it up, follows it and catches it.
          tp.next = (tp.next ?? 0.8) - dt;
          if (!tp.tossing && tp.next <= 0) {
            tp.tossing = true;
            tp.savedHold = tp.hold;
            tp.hold = null;
            doll.set(pet.x, pet.y - this.P * 0.6);
            doll.throwUp(pet.dir * this.P * 0.4, -this.P * 7);
            sound.toy?.('throw', 0.9);
            pet.anim(pet.pickClip(['arremessar'], ['jump', 'swing_hand']), { facing: 'front', restart: true });
          } else if (tp.tossing) {
            pet.x += clamp(doll.x - pet.x, -this.P * 3 * dt, this.P * 3 * dt);
            if (doll.vy > 0 && doll.y > pet.y - this.P * 0.7 && Math.abs(doll.x - pet.x) < this.P * 0.5) {
              tp.tossing = false;
              tp.hold = tp.savedHold;
              tp.next = rand(0.8, 1.6);
              pet.emit('gameExcite');
              this.app.sound.tone8(660, 880, 0.06, 'square', 0.05);
              sound.toy?.('squeak', 0.6);
            } else if (doll.y >= this.floorY() - 1 && doll.vy === 0) {
              // Missed it: picks it up a little embarrassed.
              tp.tossing = false;
              tp.hold = tp.savedHold;
              tp.next = 1.4;
              sound.toy?.('aww', 0.6);
              pet.anim(pet.pickClip(['emote_neg'], ['idle']), { facing: 'front', restart: true });
            }
          }
        }
        pet.tiltPivot = { x: 0, y: 0 };
      },
    });
  }

  // Strikes in the air: overhead cuts, side cuts, thrusts. With a ball out it trains hitting it.
  swordTick(dt, tp, pet) {
    const ball = pet.ball;
    if (ball && !ball.held && ball.x !== null) {
      const want = ball.x - pet.dir * this.P * 0.35;
      if (Math.abs(want - pet.x) > this.P * 0.25) {
        pet.dir = Math.sign(ball.x - pet.x) || pet.dir;
        pet.x = clamp(pet.x + Math.sign(want - pet.x) * pet.walkSpeed * 1.2 * dt, this.P * 0.2, this.app.world.width - this.P * 0.2);
      }
    }
    const P = this.P;
    const sound = this.app.sound;
    const doll = this.app.doll;
    const spar = tp.spar && doll?.x != null && doll.brain?.joined?.(tp);
    pet.squash = null;
    // Ends with a salute: sword raised, a little celebration.
    if (tp.t > tp.dur - 1.4) {
      if (!tp.saluted) {
        tp.saluted = true;
        pet.anim(pet.pickClip(['comemorar', 'emote_pos'], ['idle']), { facing: 'front', restart: true });
        sound.toy?.('swordClash', 0.6);
      }
      tp.angle = 0;
      tp.reach = 0.85;
      pet.tilt = 0;
      return;
    }
    // Stance changes every few seconds: kata (cuts and thrusts), spinning cuts, lunges, guard.
    tp.styleT = (tp.styleT ?? 0) - dt;
    if (tp.styleT <= 0) {
      tp.styleT = rand(4, 7);
      tp.style = pick(['kata', 'kata', 'giro', 'estocada', 'guarda']);
      if (tp.style === 'guarda') tp.guard = 1.3;
    }
    if (tp.guard > 0) {
      tp.guard -= dt;
      tp.angle = -(tp.side || 1) * 12 + Math.sin(tp.t * 20) * 2;
      tp.reach = 0.55;
      pet.tilt = 0;
      if (tp.guard <= 0) tp.next = 0;
      return;
    }
    tp.next = (tp.next ?? 0.3) - dt;
    tp.swing = Math.max(0, (tp.swing || 0) - dt * 2.6);
    if (tp.next <= 0) {
      tp.next = rand(0.55, 1.2);
      tp.swing = 1;
      tp.side = Math.random() < 0.5 ? -1 : 1;
      if (ball && ball.x !== null) tp.side = ball.x >= pet.x ? 1 : -1;
      if (spar) tp.side = doll.x >= pet.x ? 1 : -1;
      tp.kind = tp.style === 'giro' && Math.random() < 0.6 ? 'spin' : tp.style === 'estocada' ? 'lunge' : Math.random() < 0.3 ? 'thrust' : 'cut';
      if (ball && !ball.held && Math.abs(ball.x - (pet.x + tp.side * P * 0.35)) < P * 0.45 && ball.y > pet.y - P * 1.1) {
        ball.kick(tp.side * rand(8, 12) * P, -rand(4, 8) * P);
        sound.tone8(900, 300, 0.06, 'square', 0.1);
        pet.emit('swordHit');
      }
      // Sparring with the Doll: the blows meet its fists.
      if (spar && Math.abs(doll.x - (pet.x + tp.side * P * 0.5)) < P * 0.45 && !doll.held) sound.toy?.('swordClash', 0.8);
      const clip = pet.pickClip(['golpe'], ['swing_hand', 'use_mainhand', 'attacked']);
      pet.anim(clip, { facing: tp.kind === 'spin' || Math.random() < 0.6 ? 'front' : tp.side > 0 ? 'right' : 'left', restart: true });
      pet.emit('swordSwing');
      if (tp.kind === 'spin') sound.toy?.('swordSpin', 0.8);
      else sound.swish?.();
    }
    const u = 1 - tp.swing;
    if (tp.kind === 'spin') {
      tp.angle = tp.side * 360 * Math.min(1, u * 1.4);
      pet.squash = tp.swing > 0 ? { x: Math.cos(Math.min(1, u * 1.4) * Math.PI * 2) || 0.01, y: 1 } : null;
    } else tp.angle = tp.kind === 'thrust' || tp.kind === 'lunge' ? tp.side * 80 : tp.side * (-40 + 160 * Math.sin(Math.min(1, u * 1.6) * Math.PI / 2));
    if (tp.kind === 'lunge' && tp.swing > 0.5) pet.x = clamp(pet.x + tp.side * P * 0.9 * dt, P * 0.2, this.app.world.width - P * 0.2);
    tp.reach = 0.15 + tp.swing * (tp.kind === 'lunge' ? 0.75 : 0.6);
    pet.tilt = tp.side * (tp.kind === 'lunge' ? 0.2 : 0.12) * tp.swing;
    pet.tiltPivot = { x: 0, y: 0 };
  }

  // ---------- deliveries: purchases wait on the floor until the pet checks them and puts them away ----------

  // New purchase: lands next to the pet, which goes to check it as soon as it is free.
  bought() {
    const { pet } = this.app;
    this.placeDeliveries();
    if (pet.mode === 'ground' && !pet.paused && !pet.activity && !pet.dead && ['idle', 'walk', 'sit', 'emote'].includes(pet.action)) pet.chooseNext();
  }

  placeDeliveries() {
    const { pet, world, game } = this.app;
    let k = game.deliveries.filter((d) => d.x != null && this.here(d)).length;
    for (const d of game.deliveries) {
      if (d.x != null) continue;
      const x0 = pet.x ?? world.width / 2;
      d.x = clamp(x0 + (pet.dir || 1) * this.P * (0.9 + 0.35 * k++), this.P * 0.5, world.width - this.P * 0.5);
      d.display = this.app.display?.() ?? 0;
      game.dirty = true;
    }
  }

  // Where each kind of purchase is kept: food, drinks and medicine in the backpack, cartridges
  // in their bag, mangás on the shelf. null = straight into the inventory.
  storeSpot(item) {
    const { game } = this.app;
    if (SUPPLY_STAT[item.cat]) return this.foodBagX();
    if (item.cart && game.bag) return game.bagX ?? this.bagX();
    const shelf = item.manga && Object.entries(game.toys).find(([k, t]) => baseId(k) === 'estante' && t.placed && this.reach(t));
    return shelf ? shelf[1].x : null;
  }

  // Next errand for the pet: carry what it is holding to its place, or go check a new purchase.
  nextDelivery() {
    const { pet, game } = this.app;
    const u = this.unpacking;
    const carrying = u?.x != null && game.deliveries.includes(u.d);
    if (!carrying) this.unpacking = null;
    const d = carrying ? u.d : game.deliveries.find((e) => e.onPrinter && this.here(e)) || game.deliveries.find((e) => e.x != null && this.here(e));
    if (!d) return null;
    const urgent = !carrying && !!d.onPrinter;
    if (pet.surfaceId !== 'floor') return { x: pet.x, urgent, go: () => pet.startGround('hop') };
    if (urgent) return { x: game.toys.impressora?.x ?? d.x, rush: pet.stats.energy > 15, urgent, go: () => this.unpack(d) };
    const rush = this.rush();
    if (carrying) return { x: u.x, rush, go: () => { this.store(d.id); pet.chooseNext(); } };
    // In a hurry, things that go straight to the inventory are picked up the moment she arrives.
    if (rush && this.storeSpot(itemById(d.id) || {}) == null) return { x: d.x, rush, go: () => { this.store(d.id); pet.emit('stored', { quick: true }); pet.chooseNext(); } };
    return { x: d.x, rush, go: () => this.unpack(d) };
  }

  // Many purchases waiting on the floor: she runs and checks them quickly until all are put away.
  rush() {
    const here = this.app.game.deliveries.filter((e) => e.x != null && this.here(e));
    if (!here.length) this.rushing = false;
    else if (here.length >= 3 || here.reduce((n, e) => n + e.n, 0) >= 4) this.rushing = true;
    return !!this.rushing;
  }

  unpack(d) {
    const { pet } = this.app;
    const item = itemById(d.id);
    if (!item) {
      this.store(d.id);
      return pet.chooseNext();
    }
    this.unpacking = { d, item, picked: false, x: null };
    const rush = !!d.onPrinter || this.rush();
    pet.playToy({
      id: 'inspect', dur: rush ? 1.2 : 3.2, hold: itemArt(item), holdFrom: rush ? 0.35 : 1.1, wobble: 0.05,
      onEnd: (interrupted) => {
        const u = this.unpacking;
        if (!u || u.d !== d) return;
        if (interrupted) {
          this.unpacking = null;
          return;
        }
        u.x = this.storeSpot(item);
        if (u.x == null || Math.abs(u.x - pet.x) < this.P * 0.3) this.store(d.id);
      },
    });
  }

  // Into its bag or the inventory. Also used when the player clicks the parcel.
  store(id) {
    const { game, pet, sound } = this.app;
    if (this.unpacking?.d.id === id) {
      this.unpacking = null;
      if (pet.toyPlay?.id === 'inspect') pet.endToy(true);
    }
    if (game.deliver(id)) sound.play('ok', { volume: 0.35 });
  }

  updateDeliveries(hidden) {
    const { game, pet } = this.app;
    if (game.deliveries.some((d) => d.x == null) && pet.x !== null) this.placeDeliveries();
    // In a hurry she stops wandering to go pick things up.
    const now = performance.now();
    if (game.deliveries.length && now - (this.rushAt || 0) > 1000) {
      this.rushAt = now;
      if (game.deliveries.some((d) => d.onPrinter) && !this.unpacking && pet.action !== 'goto') this.callPet();
      else if (this.rush() && pet.mode === 'ground' && !pet.paused && !pet.activity && !pet.dead && ['idle', 'walk', 'sit'].includes(pet.action)) pet.chooseNext();
    }
    const u = this.unpacking;
    pet.carryImg = u?.x != null && pet.action === 'goto' ? (u.d.printed && itemArt(u.item)) || icon('box') : null;
    const floor = this.floorY();
    const printer = this.printerGeom();
    const seen = new Set();
    for (const d of game.deliveries) {
      if (d.x == null || !this.here(d)) continue;
      const item = itemById(d.id);
      seen.add(d);
      if (d.onPrinter && printer) d.x = printer.x;
      let el = this.parcels.get(d);
      if (!el) {
        el = this.makeEl('toy parcel', itemArt(item), '📦');
        const badge = document.createElement('span');
        badge.className = 'parcel-n';
        el.append(badge);
        el.addEventListener('pointerdown', (e) => {
          if (e.button !== 0) return;
          e.stopPropagation();
          this.store(d.id);
        });
        this.parcels.set(d, el);
      }
      const inHands = u?.d === d && (u.x != null || (pet.toyPlay?.id === 'inspect' && pet.toyPlay.t >= pet.toyPlay.holdFrom));
      // Taken from the printer: the next purchase in the queue starts printing.
      if (inHands && d.onPrinter) {
        d.onPrinter = false;
        game.dirty = true;
      }
      el.style.display = hidden || inHands ? 'none' : 'block';
      el.classList.toggle('printed', !!d.onPrinter);
      el.title = `${item?.name || d.id}${d.n > 1 ? ` ×${d.n}` : ''} · ${d.onPrinter ? 'pronto na impressora 3D: a Persocon vai pegar e guardar' : 'nova compra: a Persocon vai checar e guardar'} · clique para guardar agora`;
      el.querySelector('.parcel-n').textContent = d.n > 1 ? `×${d.n}` : '';
      const onBed = d.onPrinter && printer;
      const s = onBed ? printer.size * 0.5 : this.P * 0.24;
      el.style.width = el.style.height = `${s}px`;
      el.style.transform = `translate(${Math.round(d.x - s / 2)}px, ${Math.round((onBed ? printer.bed : floor) - s)}px)`;
    }
    for (const [d, el] of this.parcels) {
      if (seen.has(d)) continue;
      el.remove();
      this.parcels.delete(d);
    }
  }

  // ---------- 3D printer: purchases are printed one at a time, in order; the next one only starts
  // after the pet takes the last one off the bed ----------

  printerGeom() {
    const t = this.app.game.toys.impressora;
    if (!t?.placed || t.x == null) return null;
    const size = this.size('impressora');
    const h = size * this.ratio('impressora');
    const top = (t.y ?? this.floorY()) - h;
    return { x: t.x, size, top, bed: top + h * PRINT_AREA.bed };
  }

  updatePrinter(dt, hidden) {
    const { game, pet, world, sound } = this.app;
    const t = game.toys.impressora;
    if (!t?.placed) return;
    if (t.x == null) {
      t.x = clamp(world.width * 0.18, this.P * 0.5, world.width - this.P * 0.5);
      game.dirty = true;
    }
    t.display = this.app.display?.() ?? 0;
    const busy = game.deliveries.some((d) => d.onPrinter);
    const job = busy || pet.dead ? null : game.queue[0];
    if (job) {
      job.t = (job.t || 0) + dt;
      this.buzz = (this.buzz ?? 0) - dt;
      if (this.buzz <= 0 && !hidden && !pet.cfg.focus) {
        this.buzz = 0.35 + Math.random() * 0.3;
        sound.tone8(180 + Math.random() * 120, 140, 0.05, 'square', 0.012);
      }
      if (job.t >= job.dur) {
        game.queue.shift();
        game.deliveries.push({ id: job.id, n: job.n, x: t.x, display: t.display, onPrinter: true, printed: true });
        sound.tone8(880, 1320, 0.09, 'square', 0.05);
        setTimeout(() => sound.tone8(1320, 1760, 0.12, 'square', 0.05), 120);
        pet.emit('printed', { item: itemById(job.id) });
        game.changed();
        this.callPet();
      }
    }
    this.printerFx(job, hidden);
  }

  // Item being printed layer by layer (bottom up) under the moving print head, progress on the
  // little screen and how many purchases are still in the queue.
  printerFx(job, hidden) {
    const el = this.els.get('impressora');
    if (!el) return;
    let fx = el.querySelector('.pj');
    if (!fx) {
      fx = document.createElement('div');
      fx.className = 'pj';
      fx.innerHTML = '<img class="pj-item" draggable="false"><div class="pj-gantry"></div><div class="pj-nozzle"></div><div class="pj-bar"><i></i></div><span class="pj-q"></span>';
      el.append(fx);
    }
    const { game } = this.app;
    const waiting = game.queue.length - (job ? 1 : 0);
    const q = fx.querySelector('.pj-q');
    q.textContent = waiting > 0 ? `+${waiting}` : '';
    q.style.display = waiting > 0 ? 'block' : 'none';
    fx.classList.toggle('on', !!job && !hidden);
    if (!job) return;
    const item = itemById(job.id);
    const p = clamp(job.t / job.dur, 0, 1);
    const img = fx.querySelector('.pj-item');
    const art = itemArt(item);
    if (art && img.getAttribute('src') !== art) img.src = art;
    img.style.clipPath = `inset(${((1 - p) * 100).toFixed(1)}% 0 0 0)`;
    const top = PRINT_AREA.bed - 0.5 * p;
    fx.querySelector('.pj-gantry').style.top = `${(top * 100 - 2).toFixed(1)}%`;
    const nozzle = fx.querySelector('.pj-nozzle');
    nozzle.style.top = `${(top * 100 - 5).toFixed(1)}%`;
    nozzle.style.left = `${(25 + 50 * (0.5 + 0.5 * Math.sin(job.t * 7)) - 3).toFixed(1)}%`;
    fx.querySelector('.pj-bar i').style.width = `${Math.round(p * 100)}%`;
    el.title = `Imprimindo ${item?.name || job.id}${job.n > 1 ? ` ×${job.n}` : ''} · ${Math.ceil(job.dur - job.t)}s${waiting > 0 ? ` · ${waiting} na fila` : ''}`;
  }

  printerInfo(menu) {
    const { game } = this.app;
    const list = document.createElement('div');
    list.className = 'pj-list';
    list.textContent = game.queue.length
      ? game.queue.map((j, i) => `${i ? `${i + 1}.` : '▶'} ${itemById(j.id)?.name || j.id}${j.n > 1 ? ` ×${j.n}` : ''}`).join('\n')
      : 'Fila vazia: compre algo na Shop';
    menu.append(list);
  }

  // A print is ready: she drops what she's doing and goes to get it (running if she has energy).
  callPet() {
    const { pet, antics, minigames } = this.app;
    if (this.unpacking || pet.dead || pet.mode !== 'ground' || pet.chase || pet.mini || minigames?.active || pet.paused || pet.eating || pet.meals?.length) return false;
    if (!['idle', 'walk', 'run', 'sit', 'emote', 'sleep', 'toy', 'antic', 'ball', 'jam', 'watch', 'react'].includes(pet.action)) return false;
    if (pet.toyPlay?.id === 'inspect') return false;
    const wasSleeping = pet.action === 'sleep';
    if (pet.toyPlay) pet.endToy(true);
    if (pet.action === 'antic') antics?.stop(false);
    if (pet.ballPlay) pet.endBall?.(true);
    pet.chooseNext();
    if (wasSleeping) pet.emit('wake', { startled: false });
    return pet.action === 'goto';
  }

  makeEl(cls, src, emoji) {
    const el = document.createElement('div');
    el.className = cls;
    if (src) {
      const img = document.createElement('img');
      img.src = src;
      img.draggable = false;
      el.append(img);
    } else el.textContent = emoji || '🎁';
    document.body.appendChild(el);
    return el;
  }

  ensure(id, src) {
    let el = this.els.get(id);
    if (!el) {
      el = this.makeEl('toy', src);
      el.dataset.id = id;
      const mark = document.createElement('img');
      mark.className = 'mark';
      mark.draggable = false;
      el.append(mark);
      el.addEventListener('pointerdown', (e) => this.pointer(e, id));
      el.addEventListener('wheel', (e) => {
        if (!this.editing || !this.app.game.toys[id]) return;
        e.preventDefault();
        this.select(id);
        if (e.shiftKey) this.resize((e.deltaY || e.deltaX) > 0 ? -0.1 : 0.1);
        else this.rotate(e.deltaY > 0 ? 5 : -5);
      }, { passive: false });
      el.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        if (!this.editing && this.app.hitPet?.(e.clientX, e.clientY)) return;
        e.stopPropagation();
        this.contextMenu(id, e.clientX, e.clientY);
      });
      this.els.set(id, el);
    }
    return el;
  }

  // Drag sideways to move; a click repairs a broken toy or opens the cartridge bag.
  pointer(e, id) {
    if (e.button !== 0) return;
    const { game } = this.app;
    if (!this.editing) {
      // The pet in front of (or behind) an object gets the click.
      if (this.app.hitPet?.(e.clientX, e.clientY)) return;
      // Plain furniture ignores left clicks: they go to the desktop underneath.
      const t = game.toys[id];
      if (t && itemById(baseId(id))?.furn && !t.broken && !['alvo', 'banheira', 'gacha', 'slot'].includes(baseId(id)) && !this.fun.clickable(baseId(id)) && this.app.passClick?.()) {
        e.stopPropagation();
        this.passing = { el: this.els.get(id), until: performance.now() + 4000 };
        return;
      }
    }
    e.stopPropagation();
    const start = e.clientX;
    const startY = e.clientY;
    const x0 = id === 'bag' ? game.bagX ?? this.bagX() : id === 'food' ? this.foodBagX() : game.toys[id].x;
    // While editing, anything placed moves freely (even a bit under the taskbar); the printer stays on the floor.
    const decor = !!FURN[baseId(id)]?.disco || (this.editing && !!game.toys[id] && !itemById(baseId(id))?.fixed);
    // Furniture only moves in "Editar mobília"; a click still works as usual.
    const fixed = !this.editing && !!itemById(baseId(id))?.furn;
    let warned = false;
    const floor = this.floorY();
    const y0 = decor ? game.toys[id].y ?? floor : 0;
    const edge = this.editing ? -this.size(id) * 0.3 : this.P * 0.3;
    let moved = false;
    const el = this.els.get(id);
    try {
      el.setPointerCapture(e.pointerId);
    } catch {}
    const move = (ev) => {
      if (fixed) {
        if (!warned && Math.hypot(ev.clientX - start, ev.clientY - startY) > 12) {
          warned = true;
          this.furn.floatText(ev.clientX, ev.clientY - 24, 'Para mover: Ações → Editar mobília');
        }
        return;
      }
      if (Math.abs(ev.clientX - start) > 4 || (decor && Math.abs(ev.clientY - startY) > 4)) moved = true;
      if (!moved) return;
      const x = clamp(x0 + ev.clientX - start, edge, this.app.world.width - edge);
      if (id === 'bag') game.bagX = x;
      else if (id === 'food') game.foodBagX = x;
      else game.toys[id].x = x;
      if (decor) {
        const h = this.size(id) * this.ratio(id);
        const y = clamp(y0 + ev.clientY - startY, h * 0.4, floor + h * 0.6);
        game.toys[id].y = Math.abs(floor - y) < 6 ? undefined : y;
      }
    };
    if (this.editing) this.select(id);
    const up = (ev) => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      if (this.editing) {
        if (moved) game.dirty = true;
        return;
      }
      if (moved) {
        game.changed();
        // Dropped on the pet: it may accept and play, depending on mood and affection.
        const pet = this.app.pet;
        const t = game.toys[id];
        if (t && !t.broken && itemById(id)?.toy && !FURN[baseId(id)]?.disco && Math.abs(t.x - pet.x) < this.P * 0.5 && pet.mode === 'ground' && !pet.dead) {
          const p = clamp(0.15 + (pet.stats.mood - 30) / 100 + pet.affection / 800, 0.1, 0.95);
          if (Math.random() < p && !pet.toyPlay && !pet.eating) {
            pet.emit('toyAccept');
            if (pet.toyPlay) pet.endToy(true);
            this.play(id, pet);
          } else {
            pet.emit('toyRefuse');
            pet.anim(pet.pickClip(['emote_neg'], ['idle']), { facing: 'front', restart: true });
          }
        }
        return;
      }
      if (id === 'bag') return this.toggleBag();
      if (id === 'food') return this.app.openMenu?.('inventario');
      const single = () => {
        if (!game.toys[id]) return;
        if (id === 'alvo' && !game.toys[id].broken) return this.furn.startTargetGame();
        if (this.casino.owns(id) && !game.toys[id].broken) return this.casino.click(id, ev.clientX, ev.clientY);
        if (id === 'banheira' && !game.toys[id].broken) {
          const p = this.app.pet;
          if (p.toyPlay?.id !== 'banheira' && p.mode === 'ground' && !p.dead) {
            if (p.toyPlay) p.endToy(true);
            if (!p.goTo(this.spot(id), () => this.play(id, p))) this.app.sound.play('cancel', { volume: 0.4 });
          }
          return;
        }
        if (game.toys[id].broken) {
          if (game.repairToy(id)) {
            this.app.sound.play('ok', { volume: 0.5 });
            this.app.pet.adjust({ mood: 5 });
            this.app.pet.emit('toyRepaired');
          } else this.app.sound.play('cancel', { volume: 0.5 });
        }
      };
      if (game.toys[id] && !game.toys[id].broken && this.fun.clickable(baseId(id)) && this.fun.click(baseId(id), ev)) return;
      if (!itemById(baseId(id))?.furn) return single();
      // Furniture: a double click offers "Editar esta mobília" (the single click waits for it).
      const now = performance.now();
      const last = this.lastClick;
      if (last?.id === id && now - last.t < 350) {
        clearTimeout(last.timer);
        this.lastClick = null;
        return this.quickEdit(id, ev.clientX, ev.clientY);
      }
      clearTimeout(last?.timer);
      this.lastClick = { id, t: now, timer: setTimeout(() => { this.lastClick = null; single(); }, 300) };
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
  }

  bagX() {
    const gb = this.app.game.toys.gameboy;
    return gb?.placed ? gb.x - this.P * 0.45 : this.app.world.width * 0.5;
  }

  toggleBag() {
    if (this.popup) return this.closeBag();
    const { game, sound } = this.app;
    const el = document.createElement('div');
    el.className = 'bag-popup';
    const title = document.createElement('div');
    title.className = 'title';
    title.textContent = 'Bolsa de cartuchos';
    el.append(title);
    for (const id of game.cartridges) {
      const b = document.createElement('button');
      b.className = id === game.cartridge ? 'active' : '';
      const img = document.createElement('img');
      img.src = cartridge(GAMES[id]?.color || '#888', id, 'gb', game.isFavorite(id));
      const lvl = Math.round(game.cartSkill(id) * 10);
      b.append(img, `${GAMES[id]?.name || id}${game.isFavorite(id) ? ' ♥' : ''} · nível ${lvl}`);
      b.onclick = (e) => {
        e.stopPropagation();
        game.cartridge = id;
        game.changed();
        if (this.screen.game) this.screen.start(id);
        sound.play('ok', { volume: 0.4 });
        this.closeBag();
      };
      el.append(b);
    }
    document.body.append(el);
    this.popup = el;
    sound.play('blip', { volume: 0.5 });
    this.app.uiChanged();
  }

  closeBag() {
    this.popup?.remove();
    this.popup = null;
    this.app.uiChanged();
  }

  // Whether (x, y) is over a toy (makes the click-through overlay clickable there).
  hit(x, y) {
    if (this.furn.hit?.(x, y)) return true;
    const pass = this.passing;
    if (pass && performance.now() > pass.until) this.passing = null;
    for (const el of [...this.els.values(), ...this.parcels.values(), this.popup, this.menuEl]) {
      if (!el || el.style.display === 'none') continue;
      const r = el.getBoundingClientRect();
      // After a click went through, the piece stays see-through until the cursor leaves it
      // (double clicks on desktop icons behind it keep working).
      if (el === pass?.el) {
        if (!(x >= r.left && x <= r.right && y >= r.top && y <= r.bottom)) this.passing = null;
        continue;
      }
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return true;
    }
    return false;
  }

  update(dt, hidden) {
    const { game, pet } = this.app;
    const floor = this.floorY();
    if (this.want && !this.editing) this.goPlay();
    const seen = new Set();
    const list = Object.entries(game.toys).filter(([id, t]) => t.placed && !BALLS[id] && id !== 'pelucia' && this.here(t));
    if (game.bag) list.push(['bag', { x: game.bagX ?? this.bagX(), placed: true }]);
    if (this.hasSupplies()) list.push(['food', { x: this.foodBagX(), placed: true }]);
    const skins = this.app.skins;
    for (const [id, t] of list) {
      seen.add(id);
      const b = baseId(id);
      const item = itemById(b);
      const base = id === 'bag' ? icon('bag') : id === 'food' ? icon('backpack') : this.furn.art(b, id) || item?.img;
      const src = skins?.art(b, base) || base;
      const el = this.ensure(id, src);
      const img = el.querySelector('img:not(.mark)');
      if (img && img.getAttribute('src') !== src) img.src = src;
      el.classList.toggle('back', !!FURN[b]?.back);
      const size = this.size(id);
      const tp = pet.toyPlay;
      const inHands = (tp?.id === id && tp.hold && tp.t >= tp.holdFrom && !(FURN[id] && !FURN[id].console)) || this.fun.hides(id);
      el.style.display = hidden || inHands ? 'none' : 'block';
      el.classList.toggle('broken', !!t.broken);
      const disco = !!FURN[b]?.disco;
      const party = disco && pet.activity === 'jam' && !t.broken;
      el.classList.toggle('dormant', disco && !party);
      el.classList.toggle('party', party);
      const mark = el.querySelector('.mark');
      mark.src = t.broken ? icon('wrench') : '';
      mark.style.display = t.broken ? 'block' : 'none';
      el.title = t.broken ? `Quebrado — clique para consertar (${game.repairCost(id)} moedas)`
        : id === 'bag' ? 'Clique para ver os cartuchos'
        : id === 'food' ? 'Mochila de comida: a Persocon pega comida, bebida e remédio sozinha quando precisa · clique para abrir o inventário'
        : id === 'alvo' ? 'Clique para jogar (3 min) · botão direito para opções'
        : id === 'gacha' ? `Clique: girar a Gacha (🪙 ${GACHA_PRICE}, você paga) · ela também gira com a carteira dela`
        : id === 'slot' ? `Clique: pedir para ela jogar · aposta da carteira dela (🪙 ${this.casino.wallet}), os ganhos vão para você · a sorte vem da Afeição`
        : this.casino.vend.owns(id) ? `Clique: pedir para ela comprar algo que ela gosta com a carteira dela (🪙 ${this.casino.wallet}) · com ${id === 'venda_bebida' ? 'sede' : 'fome'} ela vem sozinha · botão direito: animação`
        : disco ? 'Dormente: só liga no modo Jam · botão direito para cor e intensidade · mova no Editar mobília'
        : item?.furn ? 'Botão direito para opções · mova no Editar mobília'
        : 'Arraste para mover · botão direito para opções';
      const funTitle = !t.broken && this.fun.owns(b) && this.fun.title(b);
      if (funTitle) el.title = funTitle;
      if (this.editing) el.title = 'Arraste para mover · roda do mouse gira · Shift + roda muda o tamanho';
      const ratio = this.ratio(id);
      let y = (t.y ?? floor) - size * ratio;
      if (this.pulling?.id === id && pet.hook) y = this.pulling.tgt.y - size * ratio * 0.5;
      el.style.width = `${size}px`;
      el.style.height = `${Math.round(size * ratio)}px`;
      const rot = t.rot ? ` rotate(${t.rot}deg)` : '';
      el.style.transform = `translate(${Math.round(t.x - size / 2)}px, ${Math.round(y)}px)${rot}`;
      if (img) img.style.transform = t.flip ? 'scaleX(-1)' : '';
    }
    this.updateEditTools(hidden);
    if (this.pulling && !pet.hook) this.pulling = null;
    if (this.flying) {
      const s = this.P * 0.2;
      const f = this.flying;
      f.el.style.width = f.el.style.height = `${s}px`;
      f.el.style.display = hidden ? 'none' : 'block';
      f.el.style.transform = `translate(${Math.round(f.x - s / 2)}px, ${Math.round(f.y - s / 2)}px)`;
      if (!pet.hook) {
        f.el.remove();
        this.flying = null;
      }
    }
    pet.lift = this.furn.liftFor(pet);
    this.furn.update(dt, hidden);
    this.fun.update(dt, hidden);
    this.casino.update(dt, hidden);
    for (const [id, el] of this.els) {
      if (!seen.has(id)) {
        el.remove();
        this.els.delete(id);
      }
    }
    this.updatePrinter(dt, hidden);
    this.updateDeliveries(hidden);
    // A broken toy left unrepaired makes the pet sad.
    const broken = Object.values(game.toys).filter((t) => t.placed && t.broken).length;
    if (broken && !pet.dead) {
      const d = DIFFICULTIES[pet.cfg.difficulty] ?? 1;
      pet.adjust({ mood: -0.015 * d * broken * dt });
      this.sadTimer -= dt;
      if (this.sadTimer <= 0) {
        this.sadTimer = rand(40, 70);
        pet.emit('toySad');
      }
    }
  }
}
