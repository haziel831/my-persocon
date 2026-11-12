// Fun stuffs placed on the desktop floor: the pet plays with them by itself, they wear out and
// break, and clicking a broken one repairs it for half the price.
import { itemById, TASTE_RANK, HER_BAG } from './game.js';
import { DIFFICULTIES } from './behavior.js';
import { icon, cartridge, cartSheetStyle } from './pixel.js';
import { GAMES } from './games.js';
import { FURN, BALLS, CONSOLES, CONSOLE_SLOTS, Furniture, baseId, PRINT_AREA, MANGAS, MANGA_GENRES } from './furniture.js';
import { Casino } from './casino.js';
import { GACHA_PRICE, STYLES, pickStyle, figureById } from './casinoitems.js';
import { FunToys, FUN_SIZE } from './funtoys.js';
import { UPGRADES, upgradeCost, upSize, upRatio, upIcon } from './upgrades.js';
import { upgradeFx } from './upgradefx.js';
import { skillPick, skillGain, skillLevel } from './skills.js';

const clamp = (v, a, b) => Math.min(Math.max(v, a), b);
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (l) => l[Math.floor(Math.random() * l.length)];
const SUPPLY_STAT = { medicina: 'health', bebidas: 'thirst', comidas: 'hunger' };
// Springy furniture: hop heights (in pet heights) for things dropped on it, chance to fly off per
// bounce, and for the pet / Doll thrown on it: restitution and the highest bounce.
export const BOUNCY = {
  pula_pula: { hops: [1.6, 1.1, 0.7, 0.4, 0.2], fall: 0.2, rest: 0.85, max: 3, sfx: 'tramp' },
  cama: { hops: [0.6, 0.3, 0.12], fall: 0.04, rest: 0.45, max: 1.1, sfx: 'bed' },
};
// Picture of an item; the ones that only have an emoji get it drawn on a canvas.
const emojiArt = new Map();
function itemArt(item) {
  const src = globalThis.petSkins?.art(item?.id, item?.img) || item?.img;
  if (src || !item?.icon) return src || null;
  if (!emojiArt.has(item.icon)) {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    g.font = '55.35px PxEmoji, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(item.icon, 32, 36);
    emojiArt.set(item.icon, c.toDataURL('image/png'));
  }
  return emojiArt.get(item.icon);
}
// While playing, the pet faces the screen: what we see is the back of the handheld.
const backArt = (id) => icon(`${id === 'gameboy' ? 'buddy' : id}_back`);

export class Toys {
  constructor(app, screen) {
    this.app = app;
    this.screen = screen;
    this.els = new Map();
    // Drawn height of objects gliding between a furniture top and the floor.
    this.ys = new Map();
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
      const desk = Object.entries(game.toys)
        .filter(([id, t]) => t.placed && !t.broken && this.reach(t) && now - (this.lastPlay[id] || 0) > 45000 && this.furn.usable(id))
        .filter(([id]) => !this.physical(id) || !pet.drained())
        .filter(([id]) => this.app.doll?.brain?.using !== id)
        .map(([id]) => ({ id, bag: false }));
      const bag = (game.herBag?.() || [])
        .filter((id) => now - (this.lastPlay[id] || 0) > 25000)
        .filter((id) => !this.physical(id) || !pet.drained())
        .map((id) => ({ id, bag: true }));
      const dummyOk = game.toys.boneco_treino?.placed && !game.toys.boneco_treino.broken
        && this.reach(game.toys.boneco_treino) && pet.stats.energy >= 50
        && now - (this.lastPlay.boneco_treino || 0) > 40000;
      // Prefer training on the dummy over solo weapon play when it is available.
      if (dummyOk && Math.random() < 0.72) {
        if (pet.surfaceId !== 'floor') return { x: pet.x, play: (p) => p.startGround('hop') };
        return { x: this.spot('boneco_treino'), play: (p) => this.playDummy(p) };
      }
      const ids = [...desk, ...bag].filter(({ id }) => baseId(id) !== 'boneco_treino' || pet.stats.energy >= 50);
      if (!ids.length) return null;
      // Never plays from on top of a window: gets down to the floor first.
      if (pet.surfaceId !== 'floor') return { x: pet.x, play: (p) => p.startGround('hop') };
      // Bag items are preferred; desktop toys with strong cafuné can still win.
      // With several consoles out, she tries each until one becomes her favorite.
      const deskConsoles = desk.filter(({ id }) => CONSOLES[id] || id === 'videogame').map(({ id }) => id);
      const hasFavConsole = deskConsoles.some((id) => game.isFavoriteConsole?.(id));
      const w = ids.map(({ id, bag: inBag }) => {
        const pref = pet.prefMul(id);
        const base = this.fun.want(baseId(id));
        const bagMul = inBag ? 2.4 : 1;
        const cafeMul = !inBag && pref > 1.4 ? pref * 1.35 : pref;
        const dummyMul = baseId(id) === 'boneco_treino' ? 3.2 : 1;
        let consoleMul = 1;
        if ((CONSOLES[id] || id === 'videogame') && deskConsoles.length > 1) {
          if (hasFavConsole) consoleMul = game.isFavoriteConsole?.(id) ? 2.8 : 0.35;
          else consoleMul = 1.6 + Math.max(0, 1.2 - (game.consoleStat?.(id)?.plays || 0) * 0.35);
        }
        // Upgraded shooting arcade: she sometimes walks over on her own.
        const arcadeMul = id === 'alvo' && game.toys.alvo?.up ? 1.8 : 1;
        return Math.max(0.05, cafeMul * base * bagMul * dummyMul * consoleMul * arcadeMul);
      });
      let r = Math.random() * w.reduce((a, b) => a + b, 0);
      const pick = ids.find((_, i) => (r -= w[i]) <= 0) || ids[0];
      const id = pick.id;
      if (pick.bag) {
        // The weapons have no combat use: she plays them normally, never at the dummy.
        return { x: pet.x, play: (p) => this.playBag(id, p) };
      }
      if (BALLS[id]) {
        this.app.ball?.focusOn?.(id);
        const bx = this.app.ball?.id === id ? this.app.ball.x : game.toys[id]?.x;
        return { x: bx ?? pet.x, play: (p) => this.play(id, p) };
      }
      if (id === 'pelucia' && this.app.doll?.x != null) return { x: this.app.doll.x, play: (p) => this.play(id, p) };
      if (baseId(id) === 'boneco_treino') return { x: this.spot(id), play: (p) => this.playDummy(p) };
      // The weapons never train at the dummy: no combat utility for now.
      return { x: this.spot(id), play: (p) => this.play(id, p) };
    };
    pet.needsSupply = () => this.needsSupply();
    pet.trySing = () => this.sing(pet);
    for (const t of Object.values(game.toys)) if (t.upgrading) { delete t.upgrading; t.up = 1; }
    pet.furnUp = (id) => !!(id && game.toys[id]?.up);
    pet.findBed = () => {
      for (const [id, cushion] of [['cama', false], ['almofada', true]]) {
        const t = game.toys[id];
        if (t?.placed && !t.broken && this.reach(t) && pet.surfaceId === 'floor') return { x: t.x, cushion };
      }
      return null;
    };
    // A free cushion on the floor of this screen to sit on (x), or null.
    pet.findCushion = () => {
      if (pet.mode !== 'ground' || pet.surfaceId !== 'floor') return null;
      const t = game.toys.almofada;
      if (!t?.placed || t.broken || !this.reach(t) || t.on || this.app.doll?.brain?.using === 'almofada') return null;
      return t.x;
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
  // Pays the repair (half the price) of a broken toy; false when there isn't enough money.
  repair(id) {
    const { game } = this.app;
    const cost = game.repairCost(id);
    if (!game.repairToy(id)) {
      this.app.sound.play('cancel', { volume: 0.5 });
      return false;
    }
    this.app.sound.play('ok', { volume: 0.5 });
    this.app.pet.adjust({ mood: 5 });
    this.app.pet.emit('toyRepaired');
    this.app.gains?.show(`-¥ ${cost}`, 'spend', `${itemById(baseId(id))?.name || 'Brinquedo'} consertado`);
    return true;
  }

  // Right-click → Aperfeiçoar: pays 150% of the price (the printer has a fixed price), keeps its
  // place and scale; the upgraded look shows unless the player imported one for it.
  // A crackle of static jumping off a broken piece: a few flickering pixels and a tiny zigzag.
  staticSpark(el) {
    const r = el.getBoundingClientRect();
    if (!r.width) return;
    const c = document.createElement('canvas');
    c.width = 7;
    c.height = 7;
    const g = c.getContext('2d');
    const col = ['#ffffff', '#5ef0ff', '#ff3ea5', '#c8ccd8'][Math.floor(Math.random() * 4)];
    g.fillStyle = col;
    let x = Math.floor(Math.random() * 3);
    for (let y = 0; y < 7; y++) {
      g.fillRect(x, y, 1, 1);
      if (Math.random() < 0.6) x = Math.max(0, Math.min(6, x + (Math.random() < 0.5 ? -1 : 1) * 2));
    }
    g.globalAlpha = 0.6;
    for (let i = 0; i < 4; i++) g.fillRect(Math.floor(Math.random() * 7), Math.floor(Math.random() * 7), 1, 1);
    const s = Math.max(10, Math.round(this.P * 0.09));
    c.className = 'static-spark';
    c.style.width = c.style.height = `${s}px`;
    c.style.left = `${r.left + Math.random() * (r.width - s)}px`;
    c.style.top = `${r.top + Math.random() * r.height * 0.7}px`;
    c.style.setProperty('--dx', `${Math.round((Math.random() - 0.5) * s * 2)}px`);
    c.style.setProperty('--dy', `${-Math.round(s * (0.5 + Math.random()))}px`);
    document.body.append(c);
    setTimeout(() => c.remove(), 500);
  }

  upgrade(id) {
    const { game, sound, pet } = this.app;
    const b = baseId(id);
    const t = game.toys[id];
    const up = UPGRADES[b];
    const cost = upgradeCost(b, itemById(b));
    if (!up || !t || t.up || t.upgrading) return false;
    if (!game.canBuy({ price: cost })) {
      sound.play('cancel', { volume: 0.5 });
      this.app.gains?.show(`¥ ${cost}`, 'spend', 'Moedas insuficientes', '⬆️');
      return false;
    }
    game.pay(cost);
    t.upgrading = true;
    game.changed();
    this.app.gains?.show(`−¥ ${cost}`, 'spend', `${up.name} · aperfeiçoada`, '⬆️');
    upgradeFx(this.app, this.els.get(id), up.name, () => {
      delete t.upgrading;
      t.up = 1;
      this.furn.shelfArt?.delete(id);
      game.changed();
      pet.adjust({ mood: 8 });
      pet.emit('toyUpgraded', { id: b });
    });
    return true;
  }

  here(t) {
    return (t?.display ?? 0) === (this.app.display?.() ?? 0);
  }

  // On this screen and not hung up high (furniture can be placed anywhere while editing).
  reach(t) {
    return this.here(t) && (!!t.on || !(t.y < this.floorY() - this.P * 0.25));
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
      return b;
    };
    const title = document.createElement('div');
    title.className = 'title';
    title.textContent = id === 'corvo' ? 'Corvo' : (t?.up && UPGRADES[baseId(id)]?.name) || itemById(baseId(id))?.name || id;
    if (id === 'corvo') title.prepend(Object.assign(document.createElement('img'), { src: icon('crow'), className: 'crow-ico', draggable: false }));
    el.append(title);
    if (id === 'corvo') {
      this.app.crow?.menu(btn, x, y);
      return this.openMenu(el, x, y);
    }
    const up = UPGRADES[baseId(id)];
    if (up && t?.placed && !t.up && !t.upgrading && !t.broken) {
      const cost = upgradeCost(baseId(id), itemById(baseId(id)));
      const b = btn(`⬆️ Aperfeiçoar (¥ ${cost})`, () => this.upgrade(id));
      b.className = 'upgrade';
      b.title = up.note;
      if (!game.canBuy({ price: cost })) b.classList.add('poor');
    }
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
      btn('🧍 Trocar skin (.png de skin de blocos)…', async () => {
        const path = await window.petAPI.pickFile?.('Skin do Doll', 'Skin de blocos', ['png']);
        if (path) {
          this.app.doll?.clearYsm?.(true);
          this.app.skins?.setObject('pelucia', null);
          this.app.doll?.setScale?.(1);
          this.app.doll?.setSkin(await window.petAPI.readFileData(path));
        }
      });
      btn('🔁 Skin padrão', () => {
        this.app.doll?.clearYsm?.(true);
        this.app.doll?.setSkin(null);
        this.app.skins?.setObject('pelucia', null);
        this.app.doll?.setScale?.(1);
      });
      if (game.gear.cristal) btn(game.dollAwake !== false ? '😴 Fazer o Doll dormir (parar de se mexer)' : '✨ Acordar o Doll', () => this.app.doll?.setAwake(game.dollAwake === false));
    }
    if (id === 'videogame' && t && !t.broken) {
      const tw = this.app.tvWatch;
      if (tw?.on) btn('⏹ Desligar a TV', () => tw.stop());
      else btn('📺 Assistir na TV…', () => setTimeout(() => tw?.panel(x, y), 0));
      if (game.cartridges.length) btn('🎮 Chamar para jogar na TV', () => this.callTv());
      // O cartucho preto: só o jogador insere (a Persocon nunca começa ele sozinha).
      // Depois da primeira vitória dá para inseri-lo de novo, quantas vezes quiser.
      if (game.cartridges.includes('unknown') || game.profile.unknownDone) {
        btn(game.profile.unknownDone ? '🕹 Inserir o cartucho preto de novo' : '🕹 Inserir o cartucho preto', () => {
          if (!this.app.unknown?.insert?.()) this.app.sound.play('cancel', { volume: 0.4 });
        });
      }
    }
    if (baseId(id) === 'estante' && t) btn('📚 Ver conteúdo da estante', () => this.showShelfContents(id));
    if (baseId(id) === 'estante_cartuchos' && t) btn('🕹 Ver conteúdo da Gaming Shelf', () => this.showShelfContents(id));
    if (baseId(id) === 'estante' && t && !t.broken) {
      const list = this.furn.shelves().get(id) || [];
      if (list.some((e) => e.manga)) btn('📖 Chamar para ler mangá', () => this.callFurn(id, 'manga'));
      if (list.some((e) => e.figure)) btn('🧸 Chamar para brincar com miniaturas', () => this.callFurn(id, 'figure'));
    }
    if (id === 'alvo') {
      btn('🎯 Jogar (3 minutos)', () => this.furn.startTargetGame());
      if (t?.up && !t.broken) btn('🔫 Chamar para jogar no Arcade', () => this.callFurn(id));
    }
    if (baseId(id) === 'boneco_treino' && t && !t.broken) {
      const train = (heavy) => {
        const pet = this.app.pet;
        if (pet.dead || pet.mode !== 'ground') return;
        const need = heavy ? 30 : 50;
        if (pet.stats.energy < need) {
          this.app.sound.play('cancel', { volume: 0.4 });
          this.furn.floatText(pet.x, pet.y - this.P, `😵 Precisa de ≥${need}% de energia`);
          return;
        }
        if (pet.toyPlay) pet.endToy(true);
        pet.goTo(this.spot(id), () => this.playDummy(pet, heavy ? 'sparring' : 'unarmed'));
      };
      btn('👊 Treinar corpo a corpo', () => train(false));
      // The heavy training only exists on the upgraded Scrap Dummy, and only by hand.
      if (t.up) btn('💥 Treino Pesado (luta de verdade)', () => train(true));
    }
    if (id === 'gacha' && !t?.broken) btn(`🎰 Girar a Gacha (¥ ${GACHA_PRICE}, você paga)`, () => this.casino.click(id, x, y));
    if (id === 'slot' && !t?.broken) btn(`🎰 Pedir para ela jogar (carteira dela: ¥ ${this.casino.wallet})`, () => this.casino.click(id, x, y));
    if (this.casino.vend.owns(id) && !t?.broken) btn(`${id === 'venda_bebida' ? '🥤' : '🍙'} Pedir para ela comprar (carteira dela: ¥ ${this.casino.wallet})`, () => this.casino.click(id, x, y));
    // Call her to play with the toy (her personal bag / "Dar a ela" is paused).
    if (t && !t.broken && !['bag', 'food', 'corvo'].includes(id)) {
      const bid = baseId(id);
      const it = itemById(bid);
      if (!FURN[bid]) {
        if (HER_BAG) {
          const canBag = game.canBag?.(bid) && game.bagFree?.() > 0 && !game.bagHas?.(bid);
          if (canBag) {
            btn('🎒 Dar para ela', () => {
              if (game.bagStore(bid)) this.app.sound.play('ok');
              else this.app.sound.play('cancel', { volume: 0.4 });
            });
          } else if (it?.toy || BALLS[bid] || this.fun.owns(bid)) {
            btn('🎁 Dar para ela', () => { this.want = id; this.goPlay(); });
          }
        } else if (it?.toy || BALLS[bid] || this.fun.owns(bid)) {
          btn('🎁 Brincar com ela', () => { this.want = id; this.goPlay(); });
        }
      }
    }
    if (t && itemById(baseId(id))?.furn) btn('✏️ Editar esta mobília', () => this.editOne(id));
    btn('🎨 Mudar visual / importar…', () => this.app.openObjects?.(baseId(id)));
    if (id === 'impressora') this.printerInfo(el);
    if (t && !t.broken && this.fun.owns(id)) this.fun.menu(baseId(id), btn, el);
    if (t && !itemById(baseId(id))?.fixed && baseId(id) !== 'gameboy_verde') btn('📦 Guardar no inventário', () => game.pickUpToy(id));
    this.openMenu(el, x, y);
  }

  // Shows a menu/popup at x,y; it closes on any click outside it.
  openMenu(el, x, y) {
    this.closeMenu();
    el.style.left = `${Math.min(x, innerWidth - 230)}px`;
    el.style.top = `${Math.min(y, innerHeight - 220)}px`;
    el.addEventListener('pointerdown', (e) => e.stopPropagation());
    document.body.append(el);
    if (el.offsetHeight > 220) el.style.top = `${Math.max(4, Math.min(y, innerHeight - el.offsetHeight - 8))}px`;
    this.menuEl = el;
    this.app.sound.play('blip', { volume: 0.4 });
    // Any click outside closes it (capture: objects stop their own pointerdown from bubbling).
    this.menuOff = (e) => !el.contains(e.target) && this.closeMenu();
    setTimeout(() => this.menuEl === el && window.addEventListener('pointerdown', this.menuOff, true), 0);
    window.addEventListener('blur', this.menuOff);
    this.app.uiChanged();
  }

  // TV menu: she walks to the TV and plays a cartridge on it.
  callTv() {
    const p = this.app.pet;
    this.app.tvWatch?.stop();
    if (p.dead || p.mode !== 'ground') return this.app.sound.play('cancel', { volume: 0.4 });
    if (p.toyPlay) p.endToy(true);
    if (p.activity) this.app.modes?.stop();
    if (!p.goTo(this.spot('videogame'), () => this.play('videogame', p))) this.app.sound.play('cancel', { volume: 0.4 });
  }

  // Call her to a piece of furniture (shelf, arcade…); kind forces manga/figure on the shelf.
  callFurn(id, kind) {
    const p = this.app.pet;
    const t = this.app.game.toys[id];
    if (!t?.placed || t.broken || p.dead || p.mode !== 'ground') return this.app.sound.play('cancel', { volume: 0.4 });
    if (p.toyPlay) p.endToy(true);
    if (p.activity) this.app.modes?.stop();
    const go = () => {
      if (kind && baseId(id) === 'estante') this.furn.playShelf(id, p, () => {}, kind);
      else this.play(id, p);
    };
    if (!p.goTo(this.spot(id), go)) this.app.sound.play('cancel', { volume: 0.4 });
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

  // ---------- small things resting on top of furniture ----------

  canPerch(id) {
    if (id === 'bag' || id === 'food') return true;
    const b = baseId(id);
    // Handheld consoles (GameGlow, PlayPocket…) sit on furniture like the GameBuddy.
    if (FURN[b]?.console) return !!this.app.game.toys[id];
    return !!this.app.game.toys[id] && !FURN[b] && !BALLS[id] && b !== 'pelucia' && b !== 'robo';
  }

  // Where the spot of an object is kept: the toy itself, or game.perch for the two bags.
  perchOf(id) {
    const { game } = this.app;
    if (id === 'bag' || id === 'food') return ((game.perch ||= {})[id] ||= {});
    return game.toys[id];
  }

  // Tops of the furniture on this screen: [{ key, x1, x2, top, h }].
  surfaces(except) {
    const floor = this.floorY();
    const out = [];
    for (const [k, t] of Object.entries(this.app.game.toys)) {
      const f = FURN[baseId(k)];
      if (k === except || !f || f.disco || f.console || !t.placed || !this.here(t)) continue;
      const w = this.size(k);
      const h = w * this.ratio(k);
      out.push({ key: k, x1: t.x - w * 0.42, x2: t.x + w * 0.42, top: (t.y ?? floor) - h, h });
    }
    return out;
  }

  // Furniture top that catches an object dropped with its base at (x, bottom), or null.
  landing(id, x, bottom) {
    return this.surfaces(id).find((s) => x >= s.x1 && x <= s.x2 && bottom > s.top - this.P * 0.35 && bottom < s.top + s.h * 0.6) || null;
  }

  // Springy furniture under x whose top a falling bottom crossed between y0 and y1 (trampoline, bed).
  bounceAt(x, y0, y1) {
    for (const [k, t] of Object.entries(this.app.game.toys)) {
      const b = BOUNCY[baseId(k)];
      if (!b || !t.placed || t.broken || !this.here(t) || Math.abs(x - t.x) > this.size(k) * 0.4) continue;
      const top = this.topAt(k, x);
      if (y0 <= top + 3 && y1 >= top) return { key: k, top, ...b };
    }
    return null;
  }

  // A small object let go above the trampoline or the bed: it bounces a few times and may fall off.
  hop(id, x, bottom) {
    const k = Object.keys(this.app.game.toys).find((key) => {
      const t = this.app.game.toys[key];
      return BOUNCY[baseId(key)] && t.placed && !t.broken && this.here(t) && Math.abs(x - t.x) < this.size(key) * 0.4 && bottom <= this.topAt(key, x) + this.P * 0.15;
    });
    if (!k) return false;
    (this.hops ||= new Map()).set(id, { x, y: bottom, vx: 0, vy: 0, n: 0, rot: 0, spin: 0 });
    this.ys.delete(id);
    return true;
  }

  updateHops(dt) {
    if (!this.hops?.size) return;
    const { game, pet, sound } = this.app;
    const g = pet.gravity;
    const floor = this.floorY();
    const P = this.P;
    for (const [id, h] of this.hops) {
      const po = this.perchOf(id);
      const t = game.toys[id];
      if (!po || (id !== 'bag' && id !== 'food' && !t?.placed)) {
        this.hops.delete(id);
        continue;
      }
      const y0 = h.y;
      h.vy += g * dt;
      h.x = clamp(h.x + h.vx * dt, P * 0.2, this.app.world.width - P * 0.2);
      h.y += h.vy * dt;
      h.rot += h.spin * dt;
      if (id === 'bag') game.bagX = h.x;
      else if (id === 'food') game.foodBagX = h.x;
      else t.x = h.x;
      const s = h.vy > 0 && this.bounceAt(h.x, y0, h.y);
      if (s) {
        h.y = s.top;
        const H = s.hops[h.n++];
        if (H == null || Math.abs(h.vy) < P * 1.2) {
          // Settles on top of it.
          Object.assign(po, { on: s.key, dx: h.x - game.toys[s.key].x, y: s.top });
          this.hops.delete(id);
          continue;
        }
        h.vy = -Math.sqrt(2 * g * P * H);
        h.vx = rand(-0.5, 0.5) * P;
        h.spin = rand(-1, 1) * 260 * H;
        if (Math.random() < s.fall) h.vx = (Math.random() < 0.5 ? -1 : 1) * P * rand(1.4, 2.2);
        if (s.sfx === 'tramp') {
          sound.toy?.('tramp', 0.9);
          sound.toy?.('trampCreak', 0.6);
        } else sound.sfx('bedBounce', 1);
        continue;
      }
      if (h.y >= floor) {
        this.hops.delete(id);
        po.y = po.on = po.dx = undefined;
        this.ys.delete(id);
        const hard = h.vy > P * 3.5;
        const item = itemById(baseId(id));
        if (hard && t && t.maxUses && !t.broken && !item?.noWear && Math.random() < 0.45) {
          t.broken = true;
          game.changed();
          sound.sfx('shatter', 1.4);
          this.furn.floatText(h.x, floor - P * 0.5, '💥');
          pet.emit('toyBroke', { item });
        } else sound.sfx(hard ? 'clunk' : 'bonk', 0.8);
      }
    }
  }

  // Spot of an object resting on furniture; when that furniture is gone it drops to the floor.
  perchAt(id) {
    const p = this.perchOf(id);
    if (!p?.on) return null;
    const f = this.app.game.toys[p.on];
    if (!f?.placed || !this.here(f)) {
      p.on = p.dx = p.y = undefined;
      return null;
    }
    const w = this.size(p.on);
    const dx = clamp(p.dx || 0, -w * 0.42, w * 0.42);
    return { x: f.x + dx, y: this.topAt(p.on, f.x + dx) };
  }

  // Top of the drawing of a piece of furniture at screen x (its highest opaque pixel around that
  // column), so whatever stands on it touches the picture instead of the box. Falls back to the box.
  topAt(k, x) {
    const t = this.app.game.toys[k];
    const w = this.size(k);
    const h = w * this.ratio(k);
    const s = this.shape(k);
    const sunk = this.canPerch(k) && this.perchOf(k)?.on && !this.busy(k) ? h * (s?.bottom || 0) : 0;
    const box = (t?.y ?? this.floorY()) - h + sunk;
    const prof = s?.top;
    if (!prof || !t) return box;
    const n = prof.length;
    let fx = (x - (t.x - w / 2)) / w;
    if (t.flip) fx = 1 - fx;
    const i = clamp(Math.floor(fx * n), 0, n - 1);
    const r = Math.max(1, Math.round(n * 0.04));
    let f = 1;
    for (let j = Math.max(0, i - r); j <= Math.min(n - 1, i + r); j++) f = Math.min(f, prof[j]);
    return f >= 1 ? box : box + h * f;
  }

  // Silhouette of an object's picture: top opaque row per column and the empty rows at the bottom
  // (fractions). Cached; redone at most every few seconds when the picture changes.
  shape(k) {
    const img = this.els.get(k)?.querySelector(':scope > img');
    if (!img?.complete || !img.naturalWidth) return null;
    const cache = (this.shapes ||= new Map());
    const c = cache.get(k);
    const now = performance.now();
    if (c && (c.src === img.src || now - c.at < 3000)) return c.s;
    let s = null;
    try {
      const W = Math.min(96, img.naturalWidth);
      const H = Math.min(128, img.naturalHeight);
      const cv = document.createElement('canvas');
      cv.width = W;
      cv.height = H;
      const g = cv.getContext('2d', { willReadFrequently: true });
      g.drawImage(img, 0, 0, W, H);
      const d = g.getImageData(0, 0, W, H).data;
      const top = new Float32Array(W).fill(1);
      let low = -1;
      for (let x = 0; x < W; x++) {
        for (let y = 0; y < H; y++) {
          if (d[(y * W + x) * 4 + 3] < 96) continue;
          if (top[x] === 1) top[x] = y / H;
          if (y > low) low = y;
        }
      }
      s = { top, bottom: low < 0 ? 0 : (H - 1 - low) / H };
    } catch {
      s = null;
    }
    cache.set(k, { src: img.src, at: now, s });
    return s;
  }

  // Being used right now (by the pet, the Doll or the hookshot): it comes down to the floor meanwhile.
  busy(id) {
    const { pet, doll } = this.app;
    return pet.toyPlay?.id === id || doll?.brain?.task?.toy === id || this.pulling?.id === id;
  }

  // ---------- food backpack ----------

  foodBagX() {
    return this.app.game.foodBagX ?? this.app.world.width * 0.12;
  }

  hasSupplies() {
    const { game } = this.app;
    if (game.items((i) => SUPPLY_STAT[i.cat]).length > 0) return true;
    return (game.herBag?.() || []).some((id) => SUPPLY_STAT[itemById(id)?.cat]);
  }

  // Best food/drink she already carries in her personal bag.
  bestBagSupply(cat) {
    const { game } = this.app;
    const busy = this.busyFun();
    const list = (game.herBag?.() || [])
      .map((id) => itemById(id))
      .filter((i) => i && i.cat === cat && !i.buff && !i.watchOnly && !(busy && i.price === 0));
    if (!list.length) return null;
    const score = (i) => (i.price === 0 ? -100 : 0) + (TASTE_RANK[game.tasteOf(i.id)] ?? 2) * 12 + (i.effects?.[SUPPLY_STAT[cat]] || 0) * 0.5;
    list.sort((a, b) => score(b) - score(a));
    return list[0];
  }

  // Low on something the backpack / her bag has: walk to it (or eat from her bag) and use it.
  needsSupply() {
    const { pet, game } = this.app;
    if (pet.surfaceId !== 'floor' || this.supplyCool > performance.now()) return null;
    const s = pet.stats;
    const busy = this.busyFun();
    const has = (cat, extra = () => true) => game.items((i) => i.cat === cat && !i.watchOnly && !(busy && i.price === 0) && extra(i));
    const hasBag = (cat) => !!this.bestBagSupply(cat);
    let cat = null;
    if (s.health < 40 && has('medicina', (i) => !i.buff).length) cat = 'medicina';
    // Thirsty/hungry with a vending machine: sometimes (always, if the bag has nothing she likes)
    // she buys something she likes with her own wallet.
    const vend = this.casino.vend;
    for (const [c, low] of [['bebidas', s.thirst < 35], ['comidas', s.hunger < 35]]) {
      if (cat || !low) continue;
      const likesDesk = has(c, (i) => (TASTE_RANK[game.tasteOf(i.id)] ?? 2) >= 3).length > 0;
      const likesBag = (game.herBag?.() || []).some((id) => {
        const it = itemById(id);
        return it?.cat === c && (TASTE_RANK[game.tasteOf(id)] ?? 2) >= 3;
      });
      const v = vend.plan(c, likesDesk || likesBag);
      if (v) {
        this.supplyCool = performance.now() + 20000;
        return v;
      }
      if (hasBag(c) || has(c).length) cat = c;
    }
    if (!cat) return null;
    this.supplyCool = performance.now() + 20000;
    // Already carrying it: eat/drink without walking to the desktop backpack.
    if (hasBag(cat) && cat !== 'medicina') {
      return { x: pet.x, use: () => this.takeBagSupply(cat) };
    }
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

  takeBagSupply(cat) {
    const { game, pet, sound } = this.app;
    const item = this.bestBagSupply(cat);
    if (item && game.useFromBag(item.id)) {
      sound.play('blip', { volume: 0.4 });
      pet.emit('supply', { item, from: 'bag' });
    }
    if (pet.action === 'goto') pet.chooseNext();
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
    const bagUp = (id === 'bag' || id === 'food') && this.bagsUp() ? 1.3 : 1;
    // A handheld docked on the roof of the Gaming Shelf shrinks to fit the three slots.
    const roof = this.furn.roofSize?.(key);
    if (roof) return roof;
    return Math.round(this.P * scale * bagUp * upSize(id, this.app.game.toys[key]) * (FURN[id]?.size ?? FUN_SIZE[id]?.[0] ?? { gameboy: 0.2, bag: 0.26, food: 0.3, espada: 0.07, syntoyo: 0.09 }[id] ?? 0.28));
  }

  // Upgraded 3D printer: the cartridge case and the food backpack get the neon look and grow.
  bagsUp() {
    return Object.entries(this.app.game.toys).some(([k, t]) => baseId(k) === 'impressora' && t.up);
  }

  ratio(key) {
    const id = baseId(key);
    const upgraded = this.app.game.toys[key]?.up || ((id === 'bag' || id === 'food') && this.bagsUp());
    const own = !(upgraded && !this.app.skins?.objects?.[id]) && this.app.skins?.ratio(id);
    if (own) return own;
    const up = upRatio(id, this.app.game.toys[key]);
    if (up) return up;
    return FURN[id]?.ratio ?? FUN_SIZE[id]?.[1] ?? { gameboy: 1.6, espada: 4.5, food: 1.1, syntoyo: 1 }[id] ?? 1;
  }

  // Where the pet stands to play with a toy.
  spot(id) {
    const t = this.app.game.toys[id];
    const b = baseId(id);
    if (b === 'boneco_treino' && t) {
      // Fight range (not on top of the dummy): arrive on the side she's already on.
      const side = (this.app.pet?.x ?? t.x) < t.x ? -1 : 1;
      return clamp(t.x + side * this.P * 1.45, this.P * 0.3, this.app.world.width - this.P * 0.3);
    }
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
    let x = clamp(onFloor ? pet.x + pet.dir * this.P * 0.7 : world.width / 2, this.P * 0.4, world.width - this.P * 0.4);
    // Spread balls so a second kind does not sit on top of the first.
    if (BALLS[id]) {
      const gap = this.P * 0.55;
      for (let n = 0; n < 8; n++) {
        const hit = Object.keys(BALLS).some((k) => k !== id && game.toys[k]?.placed && !game.toys[k].broken
          && this.here(game.toys[k]) && Math.abs((game.toys[k].x ?? 0) - x) < gap);
        if (!hit) break;
        x = clamp(x + (pet.dir || 1) * gap, this.P * 0.4, world.width - this.P * 0.4);
      }
      this.app.ball?.focusOn?.(id);
    }
    const key = game.placeToy(id, x, this.app.display?.() ?? 0);
    if (!key) return this.app.sound.play('cancel', { volume: 0.5 });
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
      this.app.ball?.focusOn?.(id);
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
          this.play(id, pet, { forced: true });
        },
      };
      this.pulling = { id, tgt };
      if (pet.fireHook(t.x, tgt.y, 'pull', tgt)) return (this.want = null);
      this.pulling = null;
    }
    // Player-initiated ("Brincar com ela" / acabou de colocar): força o uso mesmo cansada.
    if (pet.goTo(this.spot(id), () => this.play(id, pet, { forced: true }))) this.want = null;
  }

  // Temporarily place a bag toy next to her; stow it back into the bag record when play ends (id stays in herBag).
  materializeBagToy(id, pet, x = null) {
    const { game } = this.app;
    const item = itemById(id);
    const t = game.toys[id] || (game.toys[id] = {
      uses: 0, maxUses: item?.noWear ? 0 : 20 + Math.floor(Math.random() * 31), broken: false, placed: false, x: null,
    });
    t.fromBag = true;
    t.placed = true;
    t.x = x ?? (pet.x + (pet.dir || 1) * this.P * 0.45);
    delete t.homeX;
    game.changed();
    return t;
  }

  stowBagToy(id) {
    const { game } = this.app;
    const t = game.toys[id];
    if (!t?.fromBag) return;
    t.placed = false;
    t.x = null;
    delete t.fromBag;
    delete t.homeX;
    game.changed();
  }

  // Play an item kept in her personal bag (no walk to a desktop spot); stays in the bag when done.
  playBag(id, pet) {
    const { game } = this.app;
    if (!game.bagHas?.(id)) return pet.chooseNext();
    this.lastPlay[id] = performance.now();
    const item = itemById(id);
    const scale = game.difficultyScale();
    const pickAnim = pet.pickClip(['pegar'], ['use_mainhand', 'swing_hand', 'idle']);
    const end = () => { this.stowBagToy(id); };
    if (id === 'syntoyo' || id === 'ioio') {
      this.materializeBagToy(id, pet, pet.x);
      const yoyoId = (id === 'syntoyo' || game.gear.syntoyo) ? 'syntoyo' : 'ioio';
      return this.fun.playYoyo(yoyoId, pet, item, scale, pickAnim, end);
    }
    if (this.fun.owns(id) && !FURN[baseId(id)]) {
      this.materializeBagToy(id, pet, pet.x);
      if (!this.fun.play(id, pet, end, scale, pickAnim)) {
        end();
        return pet.chooseNext();
      }
      return;
    }
    if (CONSOLES[id]) {
      const cart = game.pickCart();
      game.cartridge = cart;
      const fav = game.isFavorite(cart);
      const gain = fav ? { ...item.gain, mood: item.gain.mood * 1.6 } : item.gain;
      // With the cushion out, she always sits on it to play handhelds.
      const sit = pet.findCushion?.() != null || Math.random() < 0.5;
      const holdSize = id === 'psp' ? 0.26 : id === 'gamegear' ? 0.22 : undefined;
      pet.playToy({
        id, dur: rand(15, 130), gain, scale, hold: backArt(id), holdFrom: 0.9, holdSize, pickAnim, cart, console: id, fromBag: true,
        anim: sit ? 'sit' : 'idle', pose: sit ? 'sit' : 'stand',
        onEnd: (i, tp) => { game.playedCart(cart, tp?.t || 0); game.playedConsole?.(id, tp?.t || 0); },
        tick: (dt, tp) => { this.gameboyTick(dt, tp, pet); this.furn.snack(dt, tp, pet); },
      });
      return;
    }
    if (id === 'espada') {
      this.materializeBagToy(id, pet, pet.x);
      pet.playToy({
        id, dur: rand(16, 26), gain: item.gain, scale, hold: item.img, holdFrom: 0.9, pickAnim, one: true, fromBag: true,
        onEnd: () => { pet.squash = null; end(); },
        tick: (dt, tp) => this.swordTick(dt, tp, pet),
      });
      return;
    }
    if (id === 'microfone') {
      end();
      return pet.trySing?.() || pet.chooseNext();
    }
    if (id === 'gancho') {
      end();
      return pet.hookSomewhere?.() || pet.chooseNext();
    }
    if (BALLS[id]) {
      const t = this.materializeBagToy(id, pet);
      this.app.ball?.focusOn?.(id);
      pet.ballPlay = {
        onEnd: () => { this.stowBagToy(id); },
      };
      if (!pet.startBall(false)) {
        pet.ballPlay = null;
        this.stowBagToy(id);
        return pet.chooseNext();
      }
      return;
    }
    return pet.chooseNext();
  }

  // Training dummy: unarmed melee practice. The weapons have no combat use for now, so
  // she always fights with her fists (the melee engine runs the turns).
  // mode: 'unarmed' (the basic training) or 'sparring' (the heavy training, real fight).
  playDummy(pet, forcedMode = null, onEnd = null) {
    const { game } = this.app;
    const t = game.toys.boneco_treino;
    if (!t?.placed || t.broken) return pet.chooseNext();
    const melee = this.app.melee;
    const heavy = forcedMode === 'sparring';
    const started = heavy ? melee?.startSparring() : melee?.startTraining();
    if (!started) return pet.chooseNext();
    this.lastPlay.boneco_treino = performance.now();
    const item = itemById('boneco_treino');
    const pickAnim = pet.pickClip(['pegar'], ['use_mainhand', 'swing_hand', 'idle']);
    const end = (interrupted) => {
      pet.lift = 0;
      pet.squash = null;
      if (t) delete t.homeX;
      if (this.app.dummy) this.app.dummy.idle();
      melee.leave(interrupted ? 'interrupted' : 'done');
      onEnd?.(interrupted);
    };
    pet.playToy({
      id: 'boneco_treino', train: true, dummy: true, combatKind: 'combat', dur: 3600, gain: item.gain,
      anim: pet.pickClip(['combat_idle'], ['melee_idle', 'idle']), facing: 'front', onEnd: end, effort: 0.5,
      pickAnim, trainFloor: 15,
      tick: (dt, tp) => melee.update(dt),
    });
  }

  play(id, pet, opts = {}) {
    const { game } = this.app;
    const b = baseId(id);
    const item = itemById(b);
    const t = game.toys[id];
    if (!t || t.broken || !t.placed) return pet.chooseNext();
    if (!opts.forced && this.physical(id) && this.app.care?.refuse()) return pet.startGround('idle');
    this.app.doll?.brain?.yieldToy?.(id);
    this.lastPlay[id] = performance.now();
    t.homeX = t.x;
    const scale = game.difficultyScale();
    const end = (interrupted) => {
      if (CONSOLES[id] || id === 'videogame') this.screen.stop();
      if (t.placed && t.homeX != null) {
        t.x = t.homeX;
        delete t.homeX;
        game.changed();
      } else if (t) delete t.homeX;
      if (!interrupted && game.wearToy(id)) {
        this.app.sound.play('explode', { volume: 0.4 });
        pet.adjust({ mood: -6 * (DIFFICULTIES[pet.cfg.difficulty] ?? 1) });
        pet.emit('toyBroke', { item });
      }
    };
    const pickAnim = pet.pickClip(['pegar'], ['use_mainhand', 'swing_hand', 'idle']);
    if (b === 'boneco_treino') return this.playDummy(pet, null, end);
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
        game.playedConsole?.(id, tp?.t || 0);
        end(interrupted);
      };
      // With the cushion out, she always sits on it to play handhelds.
      const sit = pet.findCushion?.() != null || Math.random() < 0.5;
      const holdSize = id === 'psp' ? 0.26 : id === 'gamegear' ? 0.22 : undefined;
      pet.playToy({
        id, dur: rand(15, 130), gain, scale, hold: art === item.img ? backArt(id) : art, holdFrom: 0.9, holdSize, pickAnim, cart, console: id,
        anim: sit ? 'sit' : 'idle', pose: sit ? 'sit' : 'stand', onEnd: endGb,
        tick: (dt, tp) => { this.gameboyTick(dt, tp, pet); this.furn.snack(dt, tp, pet); },
      });
    } else if (id === 'pelucia') {
      this.dollPlay(pet, item, scale, pickAnim, end);
    } else if (id === 'espada') {
      // Solo: uses the sword even with low energy (only the dummy needs ≥50%).
      pet.playToy({
        id, dur: rand(16, 26), gain: item.gain, scale, hold: art, holdFrom: 0.9, pickAnim, one: true, effort: 2.2,
        onEnd: (i) => {
          pet.squash = null;
          game.skillAdd('espada', skillGain('solo'));
          end(i);
        },
        tick: (dt, tp) => this.swordTick(dt, tp, pet),
      });
    } else if (BALLS[id]) {
      this.app.ball?.focusOn?.(id);
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
      const boot = tp.console === 'tv' ? 'tvon' : tp.console === 'psp' ? 'powerup' : tp.console === 'gamegear' ? 'select' : 'select';
      setTimeout(() => sound.sfx(boot, tp.console === 'psp' ? 1.1 : tp.console === 'gamegear' ? 0.95 : 0.8), 150);
      if (tp.console === 'gamegear' || tp.console === 'psp') setTimeout(() => sound.sfx('jingle', tp.console === 'psp' ? 0.55 : 0.4), 280);
    }
    // O cartucho preto misterioso não é um jogo: na TV com console ele abre o evento do Unknown
    // (nos portáteis ele não faz nada: a tela fica preta e o evento espera a TV).
    if (cart === 'unknown') {
      if (!tp.unknown) {
        tp.unknown = true;
        if (tp.console === 'tv') {
          this.screen.stop();
          this.app.unknown?.erupt?.();
        } else {
          // Nos portáteis a tela fica preta: o evento espera a TV.
          this.screen.stop();
          sound.sfx('cancel', 0.4);
        }
      }
      return;
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
    const vol = tp.console === 'psp' ? 1.15 : tp.console === 'gamegear' ? 1.0 : 0.6;
    tp.next = st === 'hype' ? rand(0.4, 1.3) : st === 'focus' ? rand(1.5, 3.5) : rand(0.6, 2.2);
    tp.leanTo = rand(-0.09, 0.09) * (st === 'hype' ? 2 : st === 'focus' ? 0.3 : 1);
    const r = Math.random();
    const win = { calm: 0.12, hype: 0.3, focus: 0.06, rage: 0.1, rhythm: 0.12 }[st] ?? 0.12;
    if (r < win) {
      tp.excite = 1;
      pet.emit('gameExcite');
      if (st === 'focus') sound.sfx('levelup', 0.7 * (vol / 0.6));
      else sound.sfx(pick(['coin', 'jump', 'powerup', 'select', 'laser']), vol);
      if (st === 'hype' && Math.random() < 0.3) this.furn.floatText(pet.x, pet.y - this.P * 1.1, pick(['✨', '🔥', '⭐']));
    } else if (st === 'rage' && r < win + 0.12) {
      tp.rage = 1.2;
      tp.excite = 0.8;
      tp.leanTo = -0.18 * pet.dir;
      sound.sfx(pick(['hit', 'gameover', 'explode']), vol);
      this.furn.floatText(pet.x, pet.y - this.P * 1.1, pick(['💢', '😤', '#@!']));
      pet.emit('gameRage');
    } else if (r < win + 0.06) {
      tp.excite = 0.6;
      tp.leanTo = -0.14 * pet.dir;
      if (st !== 'focus') sound.sfx(pick(['hit', 'bonk']), vol * 0.7);
    } else if (st === 'rhythm' && r < win + 0.1) sound.sfx('jingle', vol * 0.85);
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
        // Walk clip while closing in — otherwise combat idle makes her slide.
        pet.anim('walk', { facing: pet.side(), restart: false });
        pet.tilt = 0;
        tp.swing = 0;
        return;
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
    // Kendo stances grow more complex with skill level.
    const kLvl = skillLevel(this.app.game.skillXp('espada'));
    tp.styleT = (tp.styleT ?? 0) - dt;
    if (tp.styleT <= 0) {
      tp.styleT = rand(3.5, 6.5);
      const pool = ['kamae', 'men', 'men'];
      if (kLvl >= 3) pool.push('kote', 'kote');
      if (kLvl >= 4) pool.push('do');
      if (kLvl >= 5) pool.push('tsuki');
      if (kLvl >= 6) pool.push('nuki');
      if (kLvl >= 7) pool.push('renzoku');
      tp.style = pick(pool);
      if (tp.style === 'kamae') tp.guard = 1.4;
    }
    if (tp.guard > 0) {
      tp.guard -= dt;
      tp.angle = -(tp.side || 1) * 12 + Math.sin(tp.t * 20) * 2;
      tp.reach = 0.55;
      pet.tilt = 0;
      if (!tp.guardAnim) {
        tp.guardAnim = true;
        pet.anim(pet.pickClip(['espada_guarda', 'kendo_kamae'], ['espada_idle', 'combat_idle', 'idle']), { facing: 'front', restart: true });
      }
      if (tp.guard <= 0) { tp.next = 0; tp.guardAnim = false; }
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
      tp.kind = tp.style === 'nuki' || tp.style === 'tsuki' ? 'lunge' : tp.style === 'renzoku' ? 'spin' : tp.style === 'do' ? 'cut' : Math.random() < 0.35 ? 'thrust' : 'cut';
      if (ball && !ball.held && Math.abs(ball.x - (pet.x + tp.side * P * 0.35)) < P * 0.45 && ball.y > pet.y - P * 1.1) {
        ball.kick(tp.side * rand(8, 12) * P, -rand(4, 8) * P);
        sound.tone8(900, 300, 0.06, 'square', 0.1);
        pet.emit('swordHit');
      }
      // Sparring with the Doll: the blows meet its fists.
      if (spar && Math.abs(doll.x - (pet.x + tp.side * P * 0.5)) < P * 0.45 && !doll.held) sound.toy?.('swordClash', 0.8);
      const role = ({ men: 'espada_men', kote: 'espada_kote', do: 'espada_do', tsuki: 'espada_tsuki', nuki: 'espada_nuki', renzoku: 'espada_men', kamae: 'espada_guarda' })[tp.style] || 'espada_men';
      const clip = pet.pickClip([role, 'golpe'], [role, `gen_${role}`, 'espada_golpe', 'golpe', 'swing_hand', 'use_mainhand', 'attacked']);
      pet.anim(clip, { facing: tp.kind === 'spin' || Math.random() < 0.45 ? 'front' : tp.side > 0 ? 'right' : 'left', restart: true });
      pet.emit('swordSwing');
      this.app.game.skillAdd('espada', skillGain(tp.dummy ? 'dummy' : 'solo') * 0.35);
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
    // Cartridges: the Gaming Shelf wins when it is placed; otherwise the cartridge bag.
    // (Old saves could keep game.bag = true next to a shelf and she walked to the dead bag.)
    if (item.cart) {
      const shelf = Object.entries(game.toys)
        .find(([k, t]) => baseId(k) === 'estante_cartuchos' && t.placed && this.reach(t));
      if (shelf) return shelf[1].x;
      if (!game.hasGamingShelf?.() && game.bag) return game.bagX ?? this.bagX();
      return null;
    }
    const shelf = item.manga && Object.entries(game.toys).find(([k, t]) => baseId(k) === 'estante' && t.placed && this.reach(t));
    return shelf ? shelf[1].x : null;
  }

  // Next errand for the pet: carry what it is holding to its place, or go check a new purchase.
  nextDelivery() {
    const { pet, game } = this.app;
    const u = this.unpacking;
    const carrying = u?.x != null && game.deliveries.includes(u.d);
    if (!carrying) this.unpacking = null;
    const crow = this.app.crow;
    const d = carrying ? u.d : game.deliveries.find((e) => e.onPrinter && this.here(e) && !crow?.claims(e)) || game.deliveries.find((e) => e.x != null && !e.onPrinter && this.here(e));
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
    const held = this.unpacking?.d.id === id;
    if (held) {
      this.unpacking = null;
      if (pet.toyPlay?.id === 'inspect') pet.endToy(true);
    }
    const d = game.deliveries.find((e) => e.id === id);
    const parcel = d && this.parcels.get(d)?.getBoundingClientRect();
    const from = !held && parcel?.width ? { x: parcel.x + parcel.width / 2, y: parcel.y + parcel.height / 2 } : { x: pet.x, y: pet.y - this.P * 0.5 };
    if (game.deliver(id)) {
      sound.play('ok', { volume: 0.35 });
      this.flyToBag(itemById(id), d?.n || 1, from);
    }
  }

  // The stored item flies into a backpack over her head: purchases go to the Inventory, not the desktop.
  flyToBag(item, n, from) {
    const { pet, game } = this.app;
    if (pet.x == null || document.hidden || !from) return;
    const P = this.P;
    // The backpack opens right above the 3D printer when it is close by (else over her head).
    const pr = this.els.get('impressora')?.getBoundingClientRect();
    const nearPrinter = pr?.width && Math.abs(pr.left + pr.width / 2 - from.x) < P * 3;
    const bx = nearPrinter ? pr.left + pr.width / 2 : pet.x + P * 0.55;
    const by = nearPrinter ? Math.max(P * 0.6, pr.top - P * 0.45) : pet.y - P * 1.55;
    const bag = document.createElement('div');
    bag.className = 'inv-bag';
    bag.textContent = '🎒';
    bag.style.left = `${bx}px`;
    bag.style.top = `${by}px`;
    document.body.append(bag);
    const c = 'translate(-50%, -50%)';
    bag.animate([
      { transform: `${c} scale(0)` }, { transform: `${c} scale(1.3)`, offset: 0.15 }, { transform: `${c} scale(1)`, offset: 0.45 },
      { transform: `${c} scale(1.5) rotate(-8deg)`, offset: 0.6 }, { transform: `${c} scale(1.1) rotate(6deg)`, offset: 0.7 },
      { transform: `${c} scale(1)`, offset: 0.85 }, { transform: `${c} scale(0)`, opacity: 0 },
    ], { duration: 2200, easing: 'ease-out' }).onfinish = () => bag.remove();
    const tag = document.createElement('div');
    tag.className = 'inv-tag';
    tag.textContent = `+${n} ${item?.name || ''} → Inventário`;
    tag.style.left = `${bx}px`;
    tag.style.top = `${by - P * 0.42}px`;
    document.body.append(tag);
    setTimeout(() => tag.remove(), 2600);
    const s = P * 0.3;
    const fly = this.makeEl('inv-fly', item && itemArt(item), '📦');
    fly.style.width = fly.style.height = `${s}px`;
    fly.style.left = `${from.x - s / 2}px`;
    fly.style.top = `${from.y - s / 2}px`;
    const dx = bx - from.x;
    const dy = by - from.y;
    fly.animate([
      { transform: 'translate(0, 0) scale(1)' },
      { transform: `translate(${dx * 0.45}px, ${Math.min(dy, 0) - P * 0.6}px) scale(1.2) rotate(-12deg)`, offset: 0.5 },
      { transform: `translate(${dx}px, ${dy}px) scale(0.25)`, opacity: 0.3 },
    ], { duration: 750, delay: 150, easing: 'ease-in', fill: 'both' }).onfinish = () => fly.remove();
    setTimeout(() => this.app.sound.play('blip', { volume: 0.4 }), 900);
    const p = game.profile;
    if ((p.invHints || 0) < 3) {
      p.invHints = (p.invHints || 0) + 1;
      game.dirty = true;
      setTimeout(() => this.app.speech?.say('Guardei no Inventário!', 2.5), 950);
    }
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
      job.t = (job.t || 0) + dt * (game.toys.impressora?.up ? 1.5 : 1);
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
    const app = this.app;
    const { game } = app;
    const render = () => {
      menu.querySelector('.pj-list')?.remove();
      const list = document.createElement('div');
      list.className = 'pj-list';
      if (!game.queue.length) {
        list.textContent = 'Fila vazia: compre algo na Shop';
      } else {
        game.queue.forEach((job, i) => {
          const row = document.createElement('div');
          row.className = 'pj-row';
          row.style = 'display:flex;align-items:center;justify-content:space-between;gap:6px;padding:2px 0;';
          const item = itemById(job.id);
          row.append(document.createTextNode(`${i ? `${i + 1}.` : '▶'} ${item?.name || job.id}${job.n > 1 ? ` ×${job.n}` : ''}`));
          const cancel = document.createElement('button');
          cancel.textContent = '✕';
          cancel.title = 'Cancelar esta impressão';
          cancel.onclick = async (e) => {
            e.stopPropagation();
            if (i === 0) {
              if (!confirm('Cancelar a impressão em curso?')) return;
            }
            const c = game.queue[i];
            if (!c) return;
            const it = itemById(c.id);
            const refund = c.paid ?? (it?.price || 0) * (c.n || 1);
            if (i > 0) {
              // Waiting job: cancel it and refund the full amount paid.
              game.queue.splice(i, 1);
            } else {
              // Current job: the confirmation above is enough; refund and let her stop.
              game.queue.shift();
            }
            this.app.sound.play('cancel');
            game.coins += refund;
            game.changed();
            app.gains?.show(`+¥ ${refund}`, 'gain', (c.n > 1 ? `${it?.name || c.id} ×${c.n} · ` : '') + 'Impressão cancelada');
            app.uiChanged?.();
            render();
          };
          row.append(cancel);
          list.append(row);
        });
      }
      menu.append(list);
    };
    render();
  }

  // A print is ready: she drops what she's doing and goes to get it (running if she has energy).
  callPet() {
    const { pet, antics, minigames } = this.app;
    if (this.unpacking || pet.dead || pet.mode !== 'ground' || pet.chase || pet.mini || minigames?.active || pet.paused || pet.eating || pet.meals?.length) return false;
    if (this.app.crow?.wantsPrinter()) return false;
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
    // COMBAT_MODE: nothing on the desk can be moved during the fight.
    if (this.app.pet?.combatMode) return;
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
    // Furniture only moves in "Editar mobília"; a click still works as usual.
    const fixed = !this.editing && !!itemById(baseId(id))?.furn;
    // Small things also go up and down, to be dropped on top of a piece of furniture.
    const lift = !fixed && this.canPerch(id);
    const decor = !!FURN[baseId(id)]?.disco || (this.editing && !!game.toys[id] && !itemById(baseId(id))?.fixed) || lift;
    const po = lift ? this.perchOf(id) : game.toys[id];
    let warned = false;
    const floor = this.floorY();
    const y0 = decor ? (lift && this.perchAt(id)?.y) || po.y || floor : 0;
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
      this.draggingId = id;
      document.body.dataset.dragToy = id;
      if (lift && po.on) po.on = po.dx = undefined;
      this.ys.delete(id);
      const x = clamp(x0 + ev.clientX - start, edge, this.app.world.width - edge);
      if (id === 'bag') game.bagX = x;
      else if (id === 'food') game.foodBagX = x;
      else game.toys[id].x = x;
      if (decor) {
        const h = this.size(id) * this.ratio(id);
        const y = clamp(y0 + ev.clientY - startY, h * 0.4, floor + h * 0.6);
        po.y = Math.abs(floor - y) < 6 ? undefined : y;
      }
    };
    // Let go over a piece of furniture: it rests on top; anywhere else (outside the editor) it falls.
    const settle = () => {
      const x = id === 'bag' ? game.bagX : id === 'food' ? game.foodBagX : game.toys[id]?.x;
      if (!this.editing && x != null && po.y !== undefined && this.hop(id, x, po.y)) {
        po.y = undefined;
        return;
      }
      const s = x != null && this.landing(id, x, po.y ?? floor);
      if (s) {
        Object.assign(po, { on: s.key, dx: x - game.toys[s.key].x, y: this.topAt(s.key, x) });
        po.loose = false;
        this.app.sound.play('blip', { volume: 0.35, rate: 1.3 });
      } else {
        // Left on the desk: a handheld stays there until the crow puts it back on the shelf.
        po.loose = true;
        if (!this.editing && po.y !== undefined) {
          this.ys.set(id, po.y);
          po.y = undefined;
        }
      }
    };
    if (this.editing) this.select(id);
    const up = (ev) => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      // Let her-bag panel receive the drop before we clear the drag id.
      const overBag = HER_BAG && this.app.quick?.bagEl?.contains?.(document.elementFromPoint(ev.clientX, ev.clientY));
      if (moved && overBag && game.bagStore?.(baseId(id))) {
        this.draggingId = null;
        delete document.body.dataset.dragToy;
        this.app.sound.play('ok');
        this.app.quick?.showBag?.(parseFloat(this.app.quick.bagEl.style.left) || ev.clientX, parseFloat(this.app.quick.bagEl.style.top) || ev.clientY);
        return;
      }
      this.draggingId = null;
      delete document.body.dataset.dragToy;
      if (moved && lift) settle();
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
          const it = itemById(baseId(id));
          // Prefer stowing portable toys into her bag when she has a free slot.
          if (HER_BAG && game.canBag?.(baseId(id)) && game.bagFree?.() > 0 && Math.random() < 0.55) {
            if (game.bagStore(baseId(id))) {
              pet.emit('toyAccept');
              pet.anim(pet.pickClip(['pegar', 'emote_pos'], ['idle']), { facing: 'front', restart: true });
              this.furn.floatText(pet.x, pet.y - this.P, '🎒');
              return;
            }
          }
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
      if (id === 'food') {
        el.title = 'Abrir inventário…';
        return this.app.openMenu?.('inventario');
      }
      const single = () => {
        if (!game.toys[id]) return;
        const sb = baseId(id);
        if (sb === 'estante' || sb === 'estante_cartuchos') return this.showShelfContents(id);
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
        if (game.toys[id].broken) this.repair(id);
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
    if (gb?.placed && gb.x != null) return gb.x - this.P * 0.45;
    return this.app.game.bagX ?? this.app.world.width * 0.5;
  }

  toggleBag() {
    if (this.app.game.hasGamingShelf?.()) return;
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
      const nm = id === 'unknown' ? '' : (GAMES[id]?.name || id);
      b.append(img, `${nm}${game.isFavorite(id) ? ' ♥' : ''}${nm ? ` · nível ${lvl}` : ''}`);
      b.onclick = (e) => {
        e.stopPropagation();
        game.cartridge = id;
        game.changed();
        if (id !== 'unknown' && this.screen.game) this.screen.start(id);
        sound.play(id === 'unknown' ? 'cancel' : 'ok', { volume: 0.4 });
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

  // Shelf contents as a list: owned titles/cartridges by name, locked ones as "???".
  // Any click closes it (an owned cartridge row equips that cartridge first).
  showShelfContents(id) {
    this.closeShelf();
    const { game, sound } = this.app;
    const b = baseId(id);
    const kind = this.furn.shelfKind(id);
    const en = this.app.config.lang === 'en';
    const el = document.createElement('div');
    el.className = 'shelf-pop hitzone';
    const title = document.createElement('div');
    title.className = 'title';
    title.textContent = (game.toys[id]?.up && UPGRADES[b]?.name) || itemById(b)?.name || b;
    const info = document.createElement('div');
    info.className = 'shelf-info';
    const used = this.furn.shelfList(id).reduce((a, e) => a + (e.figure ? 2 : 1), 0);
    info.textContent = `${en ? 'Used' : 'Ocupado'}: ${used}/${this.furn.shelfCapacity(id)} · ${en ? 'click anywhere to close' : 'clique em qualquer lugar para fechar'}`;
    const list = document.createElement('div');
    list.className = 'shelf-rows';
    const mkRow = (owned, text, cart, consoleId) => {
      const r = document.createElement('div');
      r.className = `shelf-row ${owned ? 'owned' : 'unknown'}`;
      if (cart) {
        // Front view of the cartridge, clipped from the same sheet used in the shop.
        const art = document.createElement('span');
        art.className = 'cart-sheet shelf-cart';
        Object.assign(art.style, cartSheetStyle(cart) || {});
        r.append(art);
      }
      const label = document.createElement('span');
      label.textContent = `${owned ? '•' : '?'} ${text}`;
      r.append(label);
      if (cart) {
        r.dataset.cart = cart;
        r.title = en ? 'Use this cartridge' : 'Usar este cartucho';
        if (game.cartridge === cart) r.classList.add('active');
      }
      if (consoleId) {
        r.dataset.console = consoleId;
        r.title = en ? 'Play with this handheld' : 'Brincar com este portátil';
      }
      return r;
    };
    if (kind === 'cart') {
      for (const [gid, g] of Object.entries(GAMES)) {
        const own = (game.cartridges || []).includes(gid);
        list.append(mkRow(own, own ? g.name : '???', own ? gid : null));
      }
      const seenConsoles = ['gameboy', 'gamegear', 'psp'].filter((c) => game.toys[c] || game.count(c) > 0);
      if (seenConsoles.length) {
        const h = document.createElement('div');
        h.className = 'shelf-sub';
        h.textContent = en ? 'Consoles on top' : 'Consoles no topo';
        list.append(h);
        for (const c of seenConsoles) list.append(mkRow(true, itemById(c)?.name || c, null, c));
      }
    } else {
      for (const m of MANGAS) {
        const own = (game.mangas || []).includes(m.id);
        list.append(mkRow(own, own ? `${m.title} vol. ${m.vol}` : `??? · ${MANGA_GENRES[m.genre].label}`));
      }
      const figs = (game.figures || []).map((fid) => figureById(fid)).filter(Boolean);
      if (figs.length) {
        const h = document.createElement('div');
        h.className = 'shelf-sub';
        h.textContent = en ? 'Figures' : 'Miniaturas';
        list.append(h);
        for (const f of figs) list.append(mkRow(true, f.name));
      }
    }
    el.append(title, info, list);
    document.body.append(el);
    this.shelfPopup = el;
    sound.play('blip', { volume: 0.45 });
    const onDown = (ev) => {
      const cart = ev?.target?.closest?.('[data-cart]')?.dataset.cart;
      const consoleId = ev?.target?.closest?.('[data-console]')?.dataset.console;
      if (consoleId) {
        // A handheld stored on the shelf comes out to play with her.
        if (!game.toys[consoleId]?.placed) {
          const shelf = Object.entries(game.toys).find(([k, t]) => baseId(k) === 'estante_cartuchos' && t.placed);
          game.placeToy(consoleId, shelf ? shelf[1].x : (this.app.pet.x ?? 0));
        }
        this.want = consoleId;
        this.goPlay();
        sound.play('ok', { volume: 0.4 });
      } else if (cart) {
        game.cartridge = cart;
        game.changed();
        // O cartucho preto não roda jogo nenhum: ele só espera a TV com console.
        if (cart !== 'unknown' && this.screen?.game) this.screen.start(cart);
        sound.play(cart === 'unknown' ? 'cancel' : 'ok', { volume: 0.4 });
      }
      this.closeShelf();
    };
    this.shelfOff = onDown;
    setTimeout(() => { if (this.shelfPopup === el) window.addEventListener('pointerdown', onDown, true); }, 0);
    this.app.uiChanged();
  }

  closeShelf() {
    if (this.shelfOff) window.removeEventListener('pointerdown', this.shelfOff, true);
    this.shelfOff = null;
    this.shelfPopup?.remove();
    this.shelfPopup = null;
    this.app.uiChanged();
  }

  // Whether (x, y) is over a toy (makes the click-through overlay clickable there).
  hit(x, y) {
    if (this.furn.hit?.(x, y)) return true;
    const pass = this.passing;
    if (pass && performance.now() > pass.until) this.passing = null;
    for (const el of [...this.els.values(), ...this.parcels.values(), this.popup, this.menuEl, this.shelfPopup]) {
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
    this.updateHops(dt);
    if (this.want && !this.editing) this.goPlay();
    // GameBuddy must stay on the desk (and keeps the cartridge bag visible beside it).
    const gb0 = game.toys.gameboy;
const restoreBase = (game.bagHas?.('gameboy') || (gb0 && (!gb0.placed || gb0.x == null)) || (game.count?.('gameboy') > 0)) || game.cartridges?.length;
    const restore = (restoreBase) && !game.manualGameboyStored;
    if (restore) {
      game.ensureDesktopBuddy?.();
    }
    const gb = game.toys.gameboy;
    const W = this.app.world.width || innerWidth;
    if (gb?.placed && (gb.x == null || !Number.isFinite(gb.x) || gb.x < 0 || gb.x > W)) {
      gb.x = clamp(W * 0.55, this.P * 0.5, W - this.P * 0.5);
      game.dirty = true;
    }
    const seen = new Set();
    // The handhelds stand on the ROOF of the Gaming Shelf, each one in its reserved slot.
    // A console left lying on the desk stays there (the crow picks it up and puts it back).
    const gshelf = Object.keys(game.toys)
      .filter((k) => baseId(k) === 'estante_cartuchos' && game.toys[k].placed)
      .sort((a, b) => (Number(a.split('#')[1]) || 1) - (Number(b.split('#')[1]) || 1))[0];
    if (gshelf) {
      const sw = this.size(gshelf);
      for (const slot of CONSOLE_SLOTS) {
        const ct = game.toys[slot.id];
        if (!ct?.placed || ct.broken) continue;
        if (this.draggingId === slot.id) continue;         // being dragged by the player
        if (!ct.on && (ct.y != null || ct.loose)) continue;  // lying on the desk: leave it there
        if (ct.on && baseId(ct.on) !== 'estante_cartuchos') continue;
        ct.on = gshelf;
        ct.dx = (slot.at - 0.5) * sw;
        ct.y = undefined;
        ct.loose = false;
      }
    }
    const list = Object.entries(game.toys).filter(([id, t]) => t.placed && !BALLS[id] && id !== 'pelucia' && this.here(t));
    // Cartridge bag: only without a Gaming Shelf (the shelf is the cartridge storage).
    if (!game.hasGamingShelf?.() && (game.bag || game.cartridges?.length)) {
      game.bag = true;
      let bx = game.bagX ?? this.bagX();
      if (!Number.isFinite(bx) || bx < this.P * 0.15 || bx > W - this.P * 0.15) {
        bx = gb?.placed && gb.x != null ? gb.x - this.P * 0.45 : W * 0.5;
        game.bagX = bx;
      }
      list.push(['bag', { x: bx, placed: true, display: this.app.display?.() ?? 0 }]);
    }
    if (this.hasSupplies()) list.push(['food', { x: this.foodBagX(), placed: true }]);
    const skins = this.app.skins;
    for (const [id, t] of list) {
      seen.add(id);
      const b = baseId(id);
      const item = itemById(b);
      const nb = this.bagsUp() ? '_up' : '';
      const base = id === 'bag' ? icon('bag' + nb) : id === 'food' ? icon('backpack' + nb) : this.furn.art(b, id) || item?.img;
      // Upgraded art beats the resource pack textures; only art the player imported wins over it.
      const bagUp = nb && (id === 'bag' || id === 'food') && !skins?.objects?.[id];
      const src = (t.up && !skins?.objects?.[b] && upIcon(b, t)) || (bagUp && base) || skins?.art(b, base) || base;
      const el = this.ensure(id, src);
      const img = el.querySelector('img:not(.mark)');
      if (img && img.getAttribute('src') !== src) img.src = src;
      el.classList.toggle('back', !!FURN[b]?.back);
      const size = this.size(id);
      const tp = pet.toyPlay;
      const inHands = (tp?.id === id && tp.hold && tp.t >= tp.holdFrom && !(FURN[id] && !FURN[id].console)) || this.fun.hides(id);
      const crowHold = this.app.crow?.holdToyId === id;
      el.style.display = hidden || inHands || crowHold ? 'none' : 'block';
      el.classList.toggle('broken', !!t.broken);
      if (t.broken) {
        el.style.setProperty('--brk', `url("${src}")`);
        if (!hidden && el.style.display !== 'none' && Math.random() < dt * 3) this.staticSpark(el);
      }
      const disco = !!FURN[b]?.disco;
      const party = disco && pet.activity === 'jam' && !t.broken;
      el.classList.toggle('dormant', disco && !party);
      el.classList.toggle('party', party);
      const mark = el.querySelector('.mark');
      mark.src = t.broken ? icon('wrench') : '';
      mark.style.display = t.broken ? 'block' : 'none';
      el.title = t.broken ? `Quebrado — clique para consertar (${game.repairCost(id)} moedas)`
        : id === 'bag' ? 'Clique para ver os cartuchos'
        : id === 'food' ? 'Abrir inventário…'
        : id === 'alvo' ? 'Clique para jogar (3 min) · botão direito para opções'
        : id === 'gacha' ? `Clique: girar a Gacha (¥ ${GACHA_PRICE}, você paga) · ela também gira com a carteira dela`
        : id === 'slot' ? `Clique: pedir para ela jogar · aposta da carteira dela (¥ ${this.casino.wallet}), os ganhos vão para você · a sorte vem da Afeição`
        : this.casino.vend.owns(id) ? `Clique: pedir para ela comprar algo que ela gosta com a carteira dela (¥ ${this.casino.wallet}) · com ${id === 'venda_bebida' ? 'sede' : 'fome'} ela vem sozinha`
        : disco ? 'Dormente: só liga no modo Jam · botão direito para cor e intensidade · mova no Editar mobília'
        : item?.furn ? 'Botão direito para opções · mova no Editar mobília'
        : 'Arraste para mover · botão direito para opções';
      const funTitle = !t.broken && this.fun.owns(b) && this.fun.title(b);
      if (funTitle) el.title = funTitle;
      if (this.editing) el.title = 'Arraste para mover · roda do mouse gira · Shift + roda muda o tamanho';
      const ratio = this.ratio(id);
      const perch = this.canPerch(id) ? this.perchAt(id) : null;
      if (perch) {
        if (id === 'bag') game.bagX = perch.x;
        else if (id === 'food') game.foodBagX = perch.x;
        else Object.assign(t, { x: perch.x, y: perch.y });
        t.x = perch.x;
      }
      let yb = perch ? (this.busy(id) ? floor : perch.y) : (this.canPerch(id) ? this.perchOf(id).y : t.y) ?? floor;
      const hp = this.hops?.get(id);
      if (hp) yb = hp.y;
      else if (this.ys.has(id)) {
        const c = this.ys.get(id);
        const n = c + (yb - c) * Math.min(1, dt * 9);
        if (Math.abs(n - yb) < 0.5 && !perch) this.ys.delete(id);
        else this.ys.set(id, n);
        yb = n;
      } else if (perch) this.ys.set(id, yb);
      let y = yb - size * ratio;
      // On furniture: the empty rows at the bottom of its own picture go below the top, so it touches it.
      if (perch && !this.busy(id)) y += size * ratio * (this.shape(id)?.bottom || 0);
      if (this.pulling?.id === id && pet.hook) y = this.pulling.tgt.y - size * ratio * 0.5;
      el.style.width = `${size}px`;
      el.style.height = `${Math.round(size * ratio)}px`;
      const rot = hp ? ` rotate(${hp.rot.toFixed(1)}deg)` : t.rot ? ` rotate(${t.rot}deg)` : '';
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
