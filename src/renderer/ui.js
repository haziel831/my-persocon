import { PetView } from './view.js';
import { SHOP_CATEGORIES, ITEMS, STAT_LABELS, BUFF_LABELS, BUFF_ICONS, ATTRS, INFINITE_MONEY, effectText, isEdible, isConsumable, isSellable, sellPrice, isPowerUp, hasTaste, itemById, HER_BAG } from './game.js';
import { SKILL_DEFS, COMBAT_ARTS, skillLevel, skillMoves, skillStarted, skillXpFor } from './skills.js';
import { MANEUVERS } from './melee.js';
import { GAMES } from './games.js';
import { FILTERS } from './filters.js';
import { AFFECTION_MAX, FULL_STATS } from './behavior.js';
import { SOUND_THEMES } from './sound.js';
import { RP_PARTS, readModel } from './skins.js';
import { icon, cartSheetStyle } from './pixel.js';
import { baseId, FURN } from './furniture.js';
import { luckOf, FIGURES, GACHA_PRICE } from './casinoitems.js';
import { RARITIES } from './lootitems.js';
import { MINIGAMES, MG_UNLOCK, MG_BONUS, BONUS_DAILY, mgUnlocked, mgLevel } from './minigames.js';
import { DEMO, demoLocked, demoGameLocked, editionLabel } from './edition.js';
import { resetTips } from './tips.js';
import { DUOS } from './dollai.js';
import { ANTIC_NAMES } from './antics.js';
import { IX_NAMES } from './interact.js';
import { COMBAT_ANIM_NAMES, COMBAT_META } from './combat.js';
import { CHANGES } from './changelog.js';
import { REMINDER_SOUNDS } from './closeup.js';
import { ALBUM_MAX } from './funtoys.js';
import { logInfo, recentLog } from './logger.js';
import { attrProgress as attrProg } from './attrxp.js';

const DEFAULT_MODEL_DIR = 'models/MyPersocon';
const AGHATA_MODEL_DIR = 'models/Aghata';
// O que cada atributo faz (a caixinha que abre quando ela clica no atributo).
const ATTR_DESC = {
  str: 'Aumenta o dano físico dos golpes corpo a corpo, manobras especiais e arremessos. Contribui para os Pontos de Vida (HP) máximos. Treina escalando as janelas, arremessando a Bola de Queimada, acertando golpes no Boneco de Treino e ainda mais no Treino Pesado.',
  con: 'Reduz o gasto de energia em todas as ações e golpes. Aumenta significativamente os Pontos de Vida (HP) máximos. Treina gastando energia todo dia, levando dano de verdade em combate e treinando no Boneco de Treino.',
  dex: 'Aumenta a esquiva dos golpes e a precisão dos ataques rápidos. Por enquanto ela ainda não muda o jogo.',
  agi: 'Deixa os movimentos mais rápidos: ela se mexe e ataca antes do adversário. Por enquanto ela ainda não muda o jogo.',
  will: 'Resiste aos status negativos e segura o Humor mais alto. Por enquanto ela ainda não muda o jogo.',
  per: 'Melhora a atenção no que acontece ao redor. Por enquanto ela ainda não muda o jogo.',
  cha: 'Ajuda a ganhar Afeição e a negociar as trocas. Por enquanto ela ainda não muda o jogo.',
  int: 'Ajuda a aprender mais rápido (golpes, truques e minijogos). Por enquanto ela ainda não muda o jogo.',
};
// Promo codes (Opções › Outros), case-insensitive. once: redeemed a single time per save.
const PROMOS = {
  hazmidnight: { debug: true },
  betatester: { once: true, coins: 5000 },
  // Free Mystery Box (Shop → Specials → Caixa Misteriosa / crow).
  letmesmash: { once: true, free: 'corvo' },
  // 10 random PowerUps covering every rarity (inventory; reusable).
  powermeup: { powerups: 10 },
};

// Tiny DOM builder: h('div.a.b', {onclick, style...}, children...)
function h(tag, props = {}, ...children) {
  const [name, ...classes] = tag.split('.');
  const el = document.createElement(name || 'div');
  if (classes.length) el.className = classes.join(' ');
  for (const [k, v] of Object.entries(props || {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'style') Object.assign(el.style, v);
    else if (k in el && typeof v !== 'string') el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat(Infinity)) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

const ACTION_LABELS = {
  idle: 'Parada', walk: 'Andando', run: 'Correndo', sit: 'Sentada', sleep: 'Dormindo', emote: 'Brincando',
  climbUp: 'Escalando', climbDown: 'Descendo', climbRest: 'Descansando na parede', jumpGrab: 'Pulando',
  fall: 'Caindo', land: 'Aterrissando', held: 'Sendo carregada', dizzy: 'Tonta', eat: 'Comendo',
  hurt: 'Machucada', chase: 'Pega-pega!', qte: 'Pegou o mouse!', dead: 'Sem vida',
  goto: 'Indo até algo', toy: 'Brincando', jam: 'Dançando (Jam)', watch: 'Assistindo', react: 'Reagindo',
  ball: 'Jogando bola', hook: 'Usando o gancho', leave: 'Indo embora...', leaveLook: 'Indo embora...',
};

export const prefLabel = (k) => ACTION_LABELS[k] || itemById(k)?.name || k;

const coinText = (game) => (INFINITE_MONEY ? '∞' : String(game.coins));

// Defaults for options that changed after release (applied once to old configs, and by "Restaurar padrões").
export const DEFAULT_OPTS = {
  emoticonScale: 0.75, emoticonOffsetX: -26, emoticonOffsetY: 10,
  volume: 0.3, gbVolume: 0.7, footsteps: false,
};

export const THEMES = [
  ['padrao', 'Padrão', ['#1d2130', '#7aa2ff']],
  ['pixel', 'Pixel art', ['#2b2b45', '#ffcc4d']],
  ['retro', 'Retrô', ['#f1e4c3', '#c8553d']],
  ['synthwave', 'Synthwave', ['#1a0b2e', '#ff4fd8']],
  ['gameboy', 'GameBuddy', ['#0f380f', '#8bac0f']],
  ['gameboy-light', 'GameBuddy Light', ['#0a3d3a', '#38c7b2']],
  ['gameboy-color', 'GameBuddy Color', ['#3b2a6b', '#ffd23f']],
  ['gameboy-advance', 'GameBuddy Advance', ['#4b3f9e', '#9fd3ff']],
  ['dark', 'Dark', ['#121216', '#e8e8f0']],
  ['light', 'Light', ['#f4f5f8', '#3a6df0']],
  ['gamegear', 'GameGlow', ['#1e1e24', '#5ac8ff']],
  ['psp', 'PlayPocket 3000', ['#e9ecf2', '#14141e']],
  ['resourcepack', 'Resourcepack', ['#c6c6c6', '#3a6ea5']],
];

// YSM packs carry extra textures (arrows, effects): prefer the one named like the skin, else the biggest.
const mainTexture = (list) => list.find((t) => /skin|default|main/i.test(t.name)) || [...list].sort((a, b) => b.width * b.height - a.width * a.height)[0];

export const ANIM_ROLES = [
  ['', 'Não usar'], ['emote_pos', 'Emote positivo'], ['emote_neg', 'Emote negativo'], ['danca', 'Dança'], ['comemorar', 'Comemorar'],
  ['medo', 'Medo'], ['rir', 'Rir'], ['pegar', 'Pegar objeto'], ['golpe', 'Golpe (espada)'], ['arremessar', 'Arremessar'], ['gancho', 'Usar gancho'], ['sentar', 'Sentar'], ['triste', 'Triste'], ['cantar', 'Cantar'],
];
const isExtra = (n) => /^(extra|parallel)\d*/i.test(n);

function roleSelect(value, onchange) {
  const cur = value === 'emote' ? 'emote_pos' : value || '';
  const sel = h('select.role', { onchange: () => onchange(sel.value) }, ANIM_ROLES.map(([id, label]) => h('option', { value: id, selected: id === cur }, label)));
  return sel;
}

function age(born) {
  const m = Math.floor((Date.now() - born) / 60000);
  const d = Math.floor(m / 1440);
  const hh = Math.floor((m % 1440) / 60);
  return d ? `${d} dia(s) e ${hh}h` : hh ? `${hh}h ${m % 60}min` : `${m % 60} min`;
}

const itemIcon = (item) => {
  const sheet = item.cart ? cartSheetStyle(item.cart) : null;
  if (sheet) return h('span.item-icon', {}, h('span.cart-sheet', { style: sheet }));
  if (['comidas', 'bebidas', 'sobremesas', 'medicina'].includes(item.cat)) {
    return h('span.item-icon', {}, h(item.art32 ? 'img.consumable-img big' : 'img.consumable-img', { src: item.img, draggable: false }));
  }
  const src = globalThis.petSkins?.art(item.id, item.img) || item.img;
  return h('span.item-icon', {}, src ? h('img', { src, draggable: false }) : item.icon);
};

// Item art can be a data: URL (generated icons) or an app URL; never render that as text.
const isArtSrc = (v) => typeof v === 'string' && /^(data:|https?:|blob:|file:|asset:|\.?\/)/.test(v);

// Click sounds for every button/input inside a menu or dialog.
function wireSounds(root, sound) {
  if (!sound) return;
  root.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b || b.disabled) return;
    if (b.matches('.cat, .seg button, .chip, .texture')) sound.play('blip', { volume: 0.5 });
    else if (b.matches('.back, .close, .link')) sound.play('cancel', { volume: 0.5 });
    else if (b.matches('.buy, .primary, .item, .tile')) sound.play('ok', { volume: 0.5 });
    else sound.play('blip', { volume: 0.5 });
  });
  root.addEventListener('change', (e) => {
    if (e.target.type === 'checkbox') sound.play(e.target.checked ? 'ok' : 'cancel', { volume: 0.5 });
  });
  let lastTick = 0;
  root.addEventListener('input', (e) => {
    if (e.target.type !== 'range' || performance.now() - lastTick < 70) return;
    lastTick = performance.now();
    const t = (e.target.value - e.target.min) / (e.target.max - e.target.min || 1);
    sound.play('blip', { volume: 0.3, rate: 0.8 + t * 0.6, vary: 0 });
  });
}

const DIFFICULTY_OPTIONS = [['facil', 'Fácil'], ['normal', 'Normal'], ['dificil', 'Difícil'], ['extremo', 'Extremo']];

const affectionWidth = (a) => `${Math.max(0, (a / AFFECTION_MAX) * 100)}%`;

function statBars(stats, affection) {
  return h('div.bars', {}, Object.entries(STAT_LABELS).map(([k, label]) =>
    h('div.bar', { 'data-stat': k },
      h('span', {}, label, h('b', {}, `${Math.round(stats[k])}%`)),
      h('div.track', {}, h(`div.fill.${k}`, { style: { width: `${stats[k]}%` } })))),
  h('div.bar.affection', { title: 'Afeição: sobe devagar com carinho e cuidados; cai com maus-tratos e fome/sede. Em −100 a Persocon vai embora.' },
    h('span', {}, 'Afeição', h('b', {}, `${Math.round(affection)}`)),
    h('div.track', {}, h('div.fill.affection', { style: { width: affectionWidth(affection) } }))));
}

function slider({ label, min, max, step, value, format, oninput, onchange }) {
  const out = h('span.value', {}, format(value));
  const input = h('input', { type: 'range', min, max, step, value });
  input.addEventListener('input', () => {
    out.textContent = format(+input.value);
    oninput?.(+input.value);
  });
  input.addEventListener('change', () => onchange?.(+input.value));
  return h('label.row.slider', {}, h('span.label', {}, label), input, out);
}

function headToggle(icon, title, on, onclick) {
  return h(`button.pin${on ? '.on' : ''}`, { title: `${title}: ${on ? 'ligado' : 'desligado'}`, onclick }, icon, h('small', {}, on ? 'ON' : 'OFF'));
}

function toggle({ label, value, onchange }) {
  const input = h('input', { type: 'checkbox', checked: !!value, onchange: () => onchange(input.checked) });
  return h('label.row.toggle', {}, h('span.label', {}, label), input, h('span.switch'));
}

function segmented(options, value, onpick) {
  const seg = h('div.seg', {}, options.map(([id, label]) =>
    h(`button${id === value ? '.active' : ''}`, {
      'data-seg': String(id),
      onclick: (e) => {
        for (const b of seg.children) b.classList.toggle('active', b === e.currentTarget);
        onpick(id);
      },
    }, label)));
  return seg;
}

// Whether she already tasted it and liked it (Shop, Inventory and the food picker).
function tasteTag(game, item) {
  if (!hasTaste(item)) return null;
  const [cls, text, title] = {
    love: ['love', '♥ favorita', 'Ela ama: dá Humor extra sempre que come'],
    like: ['like', '👍 gosta', 'Ela gosta: um pouco de Humor extra quando come'],
    ok: ['ok', '✓ neutra', 'Ela já provou e achou normal'],
    dislike: ['dislike', '👎 não gosta', 'Ela não gosta muito: perde um pouco de Humor quando come'],
    hate: ['hate', '💢 odeia', 'Ela odeia: perde Humor quando come'],
  }[game.tasteOf(item.id)] || ['new', '? nunca provou', 'Na primeira vez ela decide: na maioria das vezes acha normal, às vezes adora ou detesta'];
  return h(`span.taste.${cls}`, { title }, text);
}

// ---------------------------------------------------------------- context menu

const CATEGORIES = [
  ['acoes', '✦', 'Ações'],
  ['brincar', '🎾', 'Brincar'],
  ['shop', '🛒', 'Shop'],
  ['inventario', 'backpack', 'Inventário'],
  ['perfil', '👤', 'Perfil'],
  ['modelo', '◆', 'Modelo'],
  ['temas', '🎨', 'Temas'],
  ['opcoes', '⚙', 'Opções'],
];

export class Menu {
  constructor(app) {
    this.app = app;
    this.el = null;
    this.category = 'acoes';
    this.shopCat = 'fun';
    this.invCat = 'todos';
    this.qty = 1;
    this.expanded = null;
    this.feeding = false;
    app.game.onChange(() => {
      if (!this.open) return;
      if (['inventario', 'shop', 'perfil'].includes(this.category) || this.feeding || this.giving) this.render();
      else this.refreshStats();
    });
  }

  get open() {
    return !!this.el;
  }

  show(x, y) {
    this.close();
    this.openGroups = new Set();
    const outside = (e) => e.target === this.backdrop && !this.app.overPet(e.clientX, e.clientY);
    const dismiss = () => {
      this.app.sound?.play('cancel', { volume: 0.4 });
      this.close();
    };
    const pinned = () => !!this.app.config.menuPinned;
    this.backdrop = h(`div.backdrop${pinned() ? '.pinned' : ''}`, {
      onpointerdown: (e) => e.button === 0 && outside(e) && !pinned() && dismiss(),
      oncontextmenu: (e) => {
        e.preventDefault();
        if (outside(e) && !pinned()) dismiss();
      },
    });
    this.el = h('div.menu.hitzone', {
      onpointerdown: (e) => {
        e.stopPropagation();
        if (e.button === 2 || (e.button === 0 && e.target.closest('.menu-head') && !e.target.closest('button'))) this.startDrag(e);
      },
      oncontextmenu: (e) => e.preventDefault(),
    });
    wireSounds(this.el, this.app.sound);
    this.backdrop.append(this.el);
    document.body.append(this.backdrop);
    this.manual = this.app.config.menuPos || null;
    this.render();
    this.anchor = { x, y };
    this.place();
    this.ticker = setInterval(() => this.refreshStats(), 500);
    this.app.uiChanged();
  }

  applySize() {
    const c = this.app.config;
    this.el.style.width = `${c.menuWidth ?? 360}px`;
    this.el.style.maxHeight = `${c.menuHeight ?? 56}vh`;
  }

  // Dragging with the right button anywhere on the menu (or the left one on its header).
  startDrag(e) {
    const r = this.el.getBoundingClientRect();
    const ox = e.clientX - r.left;
    const oy = e.clientY - r.top;
    const el = this.el;
    el.classList.add('dragging');
    try {
      el.setPointerCapture(e.pointerId);
    } catch {}
    const move = (ev) => {
      this.manual = { left: ev.clientX - ox, top: ev.clientY - oy };
      this.place();
    };
    const up = () => {
      el.classList.remove('dragging');
      if (this.manual) this.app.setOption('menuPos', this.manual);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
  }

  place() {
    const r = this.el.getBoundingClientRect();
    const fit = (v, size, max) => Math.min(Math.max(8, v), max - size - 8);
    if (this.manual) {
      this.el.style.left = fit(this.manual.left, r.width, innerWidth) + 'px';
      this.el.style.top = fit(this.manual.top, r.height, innerHeight) + 'px';
      return;
    }
    const { x, y } = this.anchor;
    this.el.style.left = fit(x + 6, r.width, innerWidth) + 'px';
    this.el.style.top = fit(y - r.height / 2, r.height, innerHeight) + 'px';
  }

  close() {
    if (!this.el) return;
    this.app.stopPreview?.();
    clearInterval(this.ticker);
    // A caixinha de atributo que ficou aberta: some com o menu.
    if (this._attrOutside) { document.removeEventListener('click', this._attrOutside); this._attrOutside = null; }
    this._attrOpen = null;
    this.backdrop.remove();
    this.el = null;
    this.expanded = null;
    this.feeding = false;
    this.giving = false;
    this.reminding = false;
    this.app.uiChanged();
  }

  // After a quick action: closes the menu unless it is pinned open.
  done() {
    if (this.app.config.menuPinned) this.render();
    else this.close();
  }

  select(category) {
    if (category !== this.category) this.openGroups = new Set();
    this.category = category;
    this.expanded = null;
    this.feeding = false;
    this.giving = false;
    this.reminding = false;
    // Trocar de aba fecha a caixinha de atributo.
    this._attrOpen = null;
    this.render();
  }

  refreshStats() {
    if (!this.el) return;
    const pet = this.app.pet;
    for (const bar of this.el.querySelectorAll('.bar[data-stat]')) {
      const v = pet.stats[bar.dataset.stat];
      bar.querySelector('.fill').style.width = `${v}%`;
      bar.querySelector('b').textContent = `${Math.round(v)}%`;
    }
    const aff = this.el.querySelector('.bar.affection');
    if (aff) {
      aff.querySelector('.fill').style.width = affectionWidth(pet.affection);
      aff.querySelector('b').textContent = Math.round(pet.affection);
      aff.classList.toggle('danger', pet.affection < 0);
    }
    const state = this.el.querySelector('.who .state');
    if (state) state.textContent = this.stateText();
    const coins = this.el.querySelector('.coins b');
    if (coins) coins.textContent = coinText(this.app.game);
    // Os atributos: o nível e a barra de XP andam sozinhos enquanto o menu está aberto.
    for (const row of this.el.querySelectorAll('.attr[data-attr]')) {
      const pr = attrProg(this.app.game.attrXp(row.dataset.attr));
      const lvl = row.querySelector('b.attr-lvl');
      if (lvl) lvl.textContent = `Nv ${pr.lvl}`;
      const bar = row.querySelector('.fill.attr');
      if (bar) bar.style.width = `${(pr.lvl / 10) * 100}%`;
      const xp = row.querySelector('.fill.xp');
      if (xp) xp.style.width = `${pr.done ? 100 : Math.max(0, Math.min(100, (pr.cur / pr.max) * 100))}%`;
      const txt = row.querySelector('.attr-xp');
      if (txt) txt.textContent = pr.done ? 'nível máximo' : `${Math.floor(pr.cur)} / ${pr.need} XP`;
    }
  }

  stateText() {
    const pet = this.app.pet;
    if (pet.dead) return 'Sem vida';
    if (pet.paused) return 'Pausada';
    if (pet.chase?.qte) return 'Pegou o mouse! Fuja com ← →';
    if (pet.chase) return `Pega-pega! ${Math.ceil(pet.chase.t)}s`;
    if (pet.eating) return `${pet.eating.drink ? 'Bebendo' : 'Comendo'}: ${pet.eating.item.name}`;
    if (pet.toyPlay?.id === 'gameboy') return `Jogando ${GAMES[this.app.game.cartridge]?.name || ''}`;
    if (pet.toyPlay?.id === 'inspect') return 'Examinando a compra';
    return ACTION_LABELS[pet.action] || '—';
  }

  render() {
    if (!this.el) return;
    this.applySize();
    const { app } = this;
    const view = `${this.category}/${this.shopCat}/${this.invCat}`;
    const scrolls = view === this.lastView ? [...this.el.querySelectorAll('.panel, .panel *')].filter((e) => e.scrollTop).map((e) => [e.className, e.scrollTop]) : [];
    this.lastView = view;
    this.el.replaceChildren(
      h('div.menu-head', {},
        h('img.avatar', { src: app.avatar, draggable: false }),
        h('div.who', {}, h('div.name', {}, app.config.name || 'Ninna'), h('div.state', {}, this.stateText()),
          h('div.coins', { title: INFINITE_MONEY ? 'Dinheiro infinito (fase de testes)' : 'Moedas: ganhe com o tempo (mais se ela estiver feliz e bem cuidada) e com o bônus diário' }, '¥ ', h('b', {}, coinText(app.game)))),
        statBars(app.pet.stats, app.pet.affection),
        h('div.head-btns', {},
          headToggle('📌', 'Manter o menu aberto mesmo clicando fora', !!app.config.menuPinned, () => {
            app.setOption('menuPinned', !app.config.menuPinned);
            this.backdrop.classList.toggle('pinned', !!app.config.menuPinned);
            app.uiChanged();
            this.render();
          }),
          headToggle('⬆', 'Sempre no topo das outras janelas', app.config.alwaysOnTop !== false, () => {
            app.setOption('alwaysOnTop', app.config.alwaysOnTop === false);
            this.render();
          })),
      ),
      this.buffsRow() || '',
      h('div.cats', {}, CATEGORIES.map(([id, ico, label]) =>
        h(`button.cat${this.category === id ? '.active' : ''}`, { onclick: () => this.select(id), title: id === 'inventario' ? 'Abrir inventário…' : label },
          id === 'inventario' || ico === 'backpack'
            ? h('img.cat-pix', { src: icon('backpack'), draggable: false, alt: '' })
            : h('span.icon', {}, ico),
          label))),
      h('div.panel', {}, this[this.category]()),
      h('div.menu-foot', {},
        h('span.hint', {}, 'Botão direito: arrastar o menu ou a Persocon'),
        h('button.link', { onclick: () => app.quit() }, 'Sair')),
    );
    this.fold(this.el.querySelector('.panel'));
    for (const [cls, top] of scrolls) {
      const el = [...this.el.querySelectorAll('.panel, .panel *')].find((e) => e.className === cls);
      if (el) el.scrollTop = top;
    }
    if (this.anchor) this.place();
    this.applyFlash();
  }

  // Bought/used item: its row blinks (or its category, if it is gone from the list).
  flashItem(id) {
    this.flashing = { id, cat: itemById(id)?.cat, t: performance.now() };
    this.applyFlash();
  }

  applyFlash() {
    const f = this.flashing;
    if (!f || !this.el) return;
    const age = performance.now() - f.t;
    if (age > 900) {
      this.flashing = null;
      return;
    }
    let els = [...this.el.querySelectorAll(`[data-item="${f.id}"]`)];
    if (!els.length && f.cat) els = [...this.el.querySelectorAll(`[data-seg="${f.cat}"]`)];
    for (const el of els) {
      if (el.classList.contains('flash')) continue;
      el.style.animationDelay = `-${Math.round(age)}ms`;
      el.classList.add('flash');
    }
  }

  tile(icon, label, hint, onclick, { disabled = false, active = false } = {}) {
    return h(`button.tile${active ? '.active' : ''}`, { onclick, disabled }, h('span.icon', {}, icon), h('span.label', {}, label), hint && h('span.hint', {}, hint));
  }

  acoes() {
    const { app } = this;
    const pet = app.pet;
    const dead = pet.dead || pet.unconscious;
    const food = app.game.items(isEdible);
    const total = food.reduce((n, e) => n + e.count, 0);
    const placed = app.toys?.editable().length || 0;
    if (this.feeding) return this.foodPicker(food);
    if (this.giving) return this.walletPanel();
    if (this.reminding) return this.remindersPanel();
    const alarms = (app.config.reminders || []).filter((r) => r.on).length;
    return h('div.grid', {},
      this.tile('👛', 'Carteira dela', `¥ ${app.game.profile.wallet || 0} na carteira · dar moedas`, () => { this.giving = true; this.render(); }, { disabled: dead }),
      this.tile('⏰', 'Lembretes e alarmes', alarms ? `${alarms} ativo(s) · ela vem bater na tela` : 'Ela vem bater na tela para lembrar', () => { this.reminding = true; this.render(); }, { disabled: dead }),
      this.tile('🤚', 'Cafuné', 'Segure e esfregue o cursor na Persocon · incentiva o que ela faz', () => { this.done(); this.app.setHand('pat'); }, { disabled: dead }),
      this.tile('✋', 'Dar tapa', 'Clique na Persocon · cancela e desincentiva a ação', () => { this.done(); this.app.setHand('slap'); }, { disabled: dead }),
      this.tile('🌙', 'Colocar para dormir', pet.stats.energy > 70 ? 'Sem sono (Energia acima de 70%)' : '+Energia −Fome',
        () => { if (pet.putToSleep()) this.done(); }, { disabled: dead || pet.action === 'sleep' || pet.stats.energy > 70 }),
      this.tile('🛁', 'Dar banho', `Higiene ${Math.round(pet.stats.hygiene)}% · espuma e bolhas`, () => { this.done(); setTimeout(() => app.care.bath(), 80); }, { disabled: dead || pet.toyPlay?.id === 'banho' }),
      this.tile('🛋', 'Editar mobília', placed ? 'Arrastar, girar e espelhar' : 'Coloque algo do Inventário', () => { this.close(); app.editFurniture(); }, { disabled: !placed }),
    );
  }

  // The Persocon's own wallet: the player gives coins (Humor and Afeição), she bets them at the machines.
  walletPanel() {
    const { app } = this;
    const g = app.game;
    const p = g.profile;
    const back = h('button.link.back', { onclick: () => { this.giving = false; this.render(); } }, '‹ Voltar');
    const give = (n) => h('button.buy', {
      disabled: app.pet.dead || (!INFINITE_MONEY && g.coins < n),
      onclick: () => {
        const fx = g.giveWallet(n);
        if (fx) {
          app.sound.play('ok', { volume: 0.4 });
          const hd = app.head;
          if (hd) app.toys?.furn.floatText(hd.x, hd.y - 10, fx.affection > 1 ? '💗' : '💕');
        } else app.sound.play('cancel', { volume: 0.4 });
        this.render();
      },
    }, `Dar ¥ ${n}`);
    const rows = [
      ['Suas moedas', coinText(g)],
      ['Sorte nos jogos', `${Math.round(Math.max(0, luckOf(app.pet.affection)) * 100)}% (vem da Afeição)`],
      ['Gacha-Machine', `${p.gachaPulls || 0} giros`],
      ['Slot-Machine', `${p.slotSpins || 0} rodadas · ${p.slotTriples || 0} trincas · ${p.jackpots || 0} jackpots`],
      ['Moedas ganhas nas máquinas', `¥ ${p.casinoCoins || 0} (vão para você)`],
      ['Compras nas Vending Machines', `${p.vendBuys || 0} compras · ¥ ${p.vendSpent || 0} gastos da carteira dela`],
      ['Bonecos', `${g.figures.length} / ${FIGURES.length}`],
    ];
    return [back,
      h('div.wallet', {}, h('span.wallet-ico', {}, '👛'), h('div', {}, h('b', {}, `¥ ${p.wallet || 0}`), h('small', {}, 'na carteira dela'))),
      h('div.row.center', {}, give(10), give(50), give(100)),
      h('div.note', {}, `Dar moedas deixa ela feliz e aumenta a Afeição (presentes seguidos rendem menos). Ela aposta a carteira sozinha na Slot-Machine e gira a Gacha-Machine (¥ ${GACHA_PRICE}); os prêmios em moedas e os ganhos da Slot vão para você. Com as Vending Machines, ela compra com a carteira o que gosta de comer e beber quando tem fome ou sede. Ela guarda o bastante para comer e beber e só aposta o que sobra, com calma.`),
      h('dl.facts.profile', {}, rows.flatMap(([k, v]) => [h('dt', {}, k), h('dd', {}, String(v))])),
    ];
  }

  // Reminders and alarms: at the set time she hops behind the taskbar, pops up huge and knocks on the screen.
  remindersPanel() {
    const { app } = this;
    const cfg = app.config;
    const list = cfg.reminders || [];
    const save = (next) => {
      app.setOption('reminders', next);
      this.render();
    };
    const field = (el) => {
      el.addEventListener('keydown', (e) => e.stopPropagation());
      el.addEventListener('pointerdown', () => app.focus?.());
      return el;
    };
    const DAYS = [['once', 'Uma vez'], ['daily', 'Todo dia'], ['weekdays', 'Seg a sex']];
    const dayLabel = (id) => (DAYS.find(([k]) => k === id) || DAYS[1])[1];
    const soundLabel = (id) => (REMINDER_SOUNDS.find(([k]) => k === id) || REMINDER_SOUNDS[0])[1];
    const draft = (this.reminderDraft ||= { time: '', text: '', days: 'daily', alarm: false, sound: 'chime' });
    const now = new Date(Date.now() + 5 * 60000);
    const time = field(h('input.text', { type: 'time', value: draft.time || `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`, oninput: (e) => (draft.time = e.target.value) }));
    const text = field(h('input.text', { maxlength: 80, placeholder: 'O que ela deve lembrar (ex.: reunião às 15h)', value: draft.text, spellcheck: false, oninput: (e) => (draft.text = e.target.value) }));
    const sound = h('select', { onchange: (e) => (draft.sound = e.target.value) }, REMINDER_SOUNDS.map(([id, label]) => h('option', { value: id, selected: id === draft.sound }, label)));
    const add = () => {
      if (!time.value) return app.sound.play('cancel', { volume: 0.4 });
      save([...list, { id: Date.now(), time: time.value, text: text.value.trim(), days: draft.days, alarm: draft.alarm, sound: draft.sound, on: true }]);
      this.reminderDraft = null;
      app.sound.play('ok', { volume: 0.4 });
    };
    const test = (r) => {
      this.close();
      app.closeup?.test(r);
    };
    const rows = [...list].sort((a, b) => a.time.localeCompare(b.time)).map((r) => h('div.item', {},
      h('span.icon', {}, r.alarm ? '⏰' : '📌'),
      h('div', {}, h('b', {}, `${r.time} · ${r.alarm ? 'Alarme' : 'Lembrete'}`), h('small', {}, `${r.text || 'Sem texto'} · ${dayLabel(r.days)} · ${soundLabel(r.sound)}`)),
      h('div.row', {},
        h('label.row.toggle', {}, h('input', { type: 'checkbox', checked: !!r.on, onchange: (e) => save(list.map((x) => (x === r ? { ...x, on: e.target.checked } : x))) }), h('span.switch')),
        h('button.link', { onclick: () => test(r) }, 'Testar'),
        h('button.link', { onclick: () => save(list.filter((x) => x !== r)) }, 'Remover'))));
    return [
      h('button.link.back', { onclick: () => { this.reminding = false; this.render(); } }, '‹ Voltar'),
      h('div.note', {}, 'Na hora marcada ela pula para trás da barra de tarefas, aparece bem grande na frente da tela e bate no vidro. Clique nela para um cafuné. Alarmes tocam até você responder; lembretes tocam duas vezes.'),
      h('div.items', {}, rows.length ? rows : h('div.note', {}, 'Nenhum lembrete ainda.')),
      h('div.row', {}, h('span.label', {}, 'Novo'), time, sound),
      h('div.row.name-row', {}, text),
      h('div.row', {}, segmented(DAYS, draft.days, (v) => (draft.days = v))),
      h('div.row', {}, segmented([[0, 'Lembrete'], [1, 'Alarme']], draft.alarm ? 1 : 0, (v) => (draft.alarm = !!+v)),
        h('button.link', { onclick: () => { app.sound.sfx(draft.sound === 'voz' ? 'chime' : draft.sound, 1.6 * (cfg.reminderVolume ?? 1)); if (draft.sound === 'voz') app.sound.voice(5); } }, 'Ouvir'),
        h('button.primary', { onclick: add }, 'Adicionar')),
      toggle({ label: 'Visitas automáticas (água, postura, refeições, datas)', value: cfg.closeupAuto !== false, onchange: (v) => app.setOption('closeupAuto', v) }),
      slider({ label: 'Frequência das visitas', min: 0.5, max: 2, step: 0.25, value: cfg.closeupFreq ?? 1, format: (v) => `${v}x`, onchange: (v) => app.setOption('closeupFreq', v) }),
      slider({ label: 'Tamanho dela na tela', min: 0.6, max: 1.2, step: 0.05, value: cfg.closeupSize ?? 1, format: (v) => `${Math.round(v * 100)}%`, onchange: (v) => app.setOption('closeupSize', v) }),
      slider({ label: 'Volume dos lembretes', min: 0, max: 2, step: 0.1, value: cfg.reminderVolume ?? 1, format: (v) => `${Math.round(v * 100)}%`, onchange: (v) => app.setOption('reminderVolume', v) }),
      h('div.row.center', {}, h('button.buy', { onclick: () => test(null) }, 'Testar aproximação')),
    ];
  }

  buffsRow() {
    const buffs = Object.entries(this.app.pet.buffs || {}).filter(([, t]) => t > Date.now());
    if (!buffs.length) return null;
    return h('div.buffs', {}, buffs.map(([k, t]) => h('span.buff', {}, `${BUFF_ICONS[k] || '✨'} ${BUFF_LABELS[k]} ${Math.ceil((t - Date.now()) / 60000)}min`)));
  }

  brincar() {
    const { app } = this;
    const pet = app.pet;
    const act = pet.activity;
    return [h('div.grid', {},
      this.tile('🎾', 'Pega-pega', pet.chase ? `${Math.ceil(pet.chase.t)}s restantes` : 'Pegue o mouse! (60s, contagem 3-2-1)', () => {
        this.done();
        app.startChase();
      }, { disabled: pet.dead || !!pet.chase }),
      this.tile('🎵', act === 'jam' ? 'Parar Jam' : 'Modo Jam', 'Ela dança a música do PC (quando pedir música/festa, use isto)', () => {
        if (act === 'jam') app.stopMode();
        else app.startMode('jam');
        this.render();
      }, { disabled: pet.dead, active: act === 'jam' }),
      app.game.gear.microfone && act !== 'jam' ? this.tile('🎤', 'Modo Karaokê', 'Jam com microfone, cantando junto', () => {
        app.modes.wantKaraoke = true;
        app.startMode('jam');
        this.render();
      }, { disabled: pet.dead }) : null,
      this.tile('📺', act === 'watch' ? 'Parar Assistir' : 'Modo Assistir', 'Clique no vídeo; ela senta e assiste (quando pedir cinema/assistir)', () => {
        if (act === 'watch') app.stopMode();
        else app.startMode('watch');
        this.render();
      }, { disabled: pet.dead, active: act === 'watch' }),
    ), h('div.note', {}, 'Modo Jam e Modo Assistir usam o som do PC. Enquanto fome, sede e energia estiverem acima de 50%, ela continua; se baixar, se cuida e volta. Sozinha, também para depois de um tempo.'),
    h('div.group', {}, 'Minijogos'),
    h('div.grid', {}, [...MINIGAMES].sort((a, b) => (MG_UNLOCK[a.id] ?? 0) - (MG_UNLOCK[b.id] ?? 0)).map((m) => {
      if (demoGameLocked(m.id)) return this.tile('🔒', m.name, 'Na versão completa', () => {}, { disabled: true });
      if (!mgUnlocked(m.id, pet.affection)) return this.tile('🔒', '???', `Desbloqueia com ${MG_UNLOCK[m.id]} de Afeição (agora ${Math.round(pet.affection)})`, () => {}, { disabled: true });
      const rec = app.game.profile.minigames?.[m.id];
      const { left, wait } = app.minigames.bonusLeft(m.id);
      const bonus = !left ? 'bônus de hoje esgotado' : wait ? `bônus em ${Math.ceil(wait / 60000)} min` : `vencer: ${MG_BONUS[m.id][0]} (${left}/${BONUS_DAILY} hoje)`;
      return this.tile(m.icon, m.name, `${m.desc} · Nv ${mgLevel(rec)}${rec ? ` · recorde ${rec.best}` : ''} · ${bonus}`, () => {
        this.done();
        app.minigames.start(m.id);
      }, { disabled: pet.dead || !!pet.chase || !!app.minigames.active });
    })),
    app.doll?.active ? h('div.group', {}, 'Persocon & Doll') : null,
    app.doll?.active ? h('div.grid', {}, DUOS.filter((d) => !d.alive || app.doll.alive).map((d) => this.tile(d.icon, d.name, d.desc, () => {
      this.done();
      app.doll.brain.startDuo(d.id, true);
    }, { disabled: pet.dead || !!pet.chase || !!app.minigames.active || !!app.doll.brain.duo }))) : null,
    app.doll?.active && !app.doll.alive ? h('div.note', {}, app.game.gear.cristal ? 'O Doll está dormindo (botão direito nele para acordar).' : 'Com o Crystal Mágico (Shop → Specials) o Doll ganha vida e brinca de muito mais coisas.') : null,
    Object.keys(app.config.guidesOff || {}).length
      ? h('div.row.center', {}, h('button.mini', { onclick: () => { app.setOption('guidesOff', {}); this.render(); } }, 'Mostrar os guias dos minijogos de novo'))
      : null];
  }

  perfil() {
    const r = this.app.rewards;
    if (this.app.albumTab) {
      this.app.albumTab = false;
      this.perfilTab = 'album';
    }
    const tab = this.perfilTab || 'perfil';
    const done = r ? r.missions().filter((m) => m.done).length : 0;
    const got = r ? r.achievements().filter((a) => a.done).length : 0;
    const figs = this.app.game.figures || [];
    const photos = this.app.game.profile.fun?.photos || [];
    const tabs = segmented([['perfil', '👤 Perfil'], ['missoes', `📅 Missões ${done}/3`], ['conquistas', `🏆 Conquistas ${got}/${r?.achievements().length || 0}`], ['colecao', `🧸 Coleção ${figs.length}/${FIGURES.length}`], ['album', `📷 Álbum ${photos.length}/${ALBUM_MAX}`]], tab,
      (id) => { this.perfilTab = id; this.render(); });
    tabs.classList.add('wrap');
    if (tab === 'album') {
      return [tabs,
        h('div.note', {}, `Fotos tiradas pela Persocon com a Câmera instantânea (até ${ALBUM_MAX}; quando enche, a mais antiga sai). Clique numa foto para ampliar.`),
        photos.length
          ? h('div.album', {}, photos.map((p, i) => [p, i]).reverse().map(([p, i]) => {
            const card = h('div.photo', { title: new Date(p.at).toLocaleString() },
              h('img', { src: p.src, draggable: false, onclick: () => card.classList.toggle('big') }),
              h('small', {}, new Date(p.at).toLocaleDateString()),
              h('button.mini', { title: 'Apagar esta foto', onclick: () => { photos.splice(i, 1); this.app.game.changed(); this.render(); } }, '✕'));
            return card;
          }))
          : h('div.note', {}, 'Nenhuma foto ainda. Compre a Câmera instantânea (Shop → Fun stuffs) e coloque na área de trabalho.')];
    }
    if (tab === 'colecao') {
      return [tabs,
        h('div.note', {}, 'Bonecos colecionáveis saem da Gacha-Machine e ficam na Estante (cada estante guarda 65 mangás ou 30 bonecos; compre mais estantes em Mobília). Repetidos viram moedas para você.'),
        h('div.figs', {}, FIGURES.map((f) => {
          const own = figs.includes(f.id);
          const card = h(`div.fig${own ? '.own' : ''}`, { title: `${own ? f.name : '???'} · ${RARITIES[f.rarity].label}` },
            h('img', { src: f.img, draggable: false }), h('small', {}, own ? f.name : '???'));
          card.style.setProperty('--rc', RARITIES[f.rarity].color);
          return card;
        }))];
    }
    if (!r || tab === 'perfil') return [tabs, ...this.perfilMain()];
    const bar = (n, goal, ok) => h('div.track', {}, h(`div.fill${ok ? '.ok' : ''}`, { style: { width: `${Math.min(100, (n / goal) * 100)}%` } }));
    const boxImg = (id) => h('img.reward-box', { src: itemById(id)?.img, title: itemById(id)?.name, draggable: false });
    if (tab === 'missoes') {
      const list = r.missions();
      const luck = this.app.game.profile.luck || 0;
      const canReset = r.canResetDaily?.();
      return [tabs,
        h('div.note', {}, 'Novas missões todo dia. Cada uma vale uma Caixa Comum; completar as três dá uma Caixa Rara extra.'),
        h('div.quests', {}, list.map((m) => h(`div.quest${m.done ? '.done' : ''}`, {},
          h('span.quest-ico', {}, m.done ? '✅' : '📌'),
          h('div.quest-body', {}, h('div', {}, m.text), bar(m.n, m.goal, m.done), h('small', {}, `${Math.min(m.n, m.goal)} / ${m.goal}`)),
          boxImg('caixa_comum')))),
        h(`div.quest.bonus${list.every((m) => m.done) ? '.done' : ''}`, {},
          h('span.quest-ico', {}, '⭐'), h('div.quest-body', {}, h('div', {}, 'Bônus: todas as missões do dia')), boxImg('caixa_rara')),
        luck ? h('div.note', {}, `🍀 Próximas ${luck} caixa(s) com sorte aumentada.`) : null,
        h('div.row.center', {}, h('button', {
          disabled: !canReset,
          title: canReset
            ? 'Sorteia de novo só as missões que você ainda não concluiu (1 vez por dia)'
            : 'Você já resetou as missões hoje',
          onclick: () => {
            if (!r.resetDaily?.()) return this.app.sound.play('cancel', { volume: 0.4 });
            this.app.sound.play('ok', { volume: 0.5 });
            this.render();
          },
        }, canReset ? '🎲 Resetar Missões (1/dia)' : '✓ Missões já resetadas hoje')),
      ].filter(Boolean);
    }
    return [tabs, h('div.achs', {}, r.achievements().map((a) => h(`div.ach${a.done ? '.done' : ''}`, { title: a.done ? `Conquistada em ${new Date(a.at).toLocaleDateString()}` : '' },
      h('span.ach-ico', {}, h('img', { src: a.icon, draggable: 'false', alt: '' })),
      h('div.quest-body', {}, h('b', {}, a.name), h('small', {}, a.desc), a.done ? null : bar(a.n, a.goal), a.done ? null : h('small', {}, `${a.n} / ${a.goal}`)),
      boxImg(a.box))))];
  }

  perfilMain() {
    const { app } = this;
    const g = app.game;
    const p = g.profile;
    const open = { ...(this._perfilOpen || {}) };
    // A collapsible section: the title toggles the content. `body` replaces the fact list.
    const section = (key, title, list, body) => {
      const isOpen = !!open[key];
      return [
        h('button.skill-head.perfil-head', {
          onclick: () => { this._perfilOpen = { ...open, [key]: !isOpen }; this.render(); },
        }, `${isOpen ? '▼' : '▶'} ${title}`),
        isOpen ? (body || h('dl.facts.profile', {}, list.flatMap(([k, v]) => [h('dt', {}, k), h('dd', {}, String(v))]))) : null,
      ];
    };
    const combatLvl = skillLevel(g.skillXp('unarmed'));
    const combatNext = skillXpFor(Math.min(10, combatLvl + 1));
    const geral = [
      ['Nome', app.config.name || 'Ninna'],
      ['Idade', age(p.born)],
      ['Afeição', `${Math.round(app.pet.affection)} / ${AFFECTION_MAX} · moedas ×${(1 + Math.max(0, app.pet.affection) / 500).toFixed(1)}`],
      ['Moedas', (() => {
        const bits = [`¥ ${coinText(g)}`, `ganhou ${p.coinsEarned}`];
        const active = [];
        active.push(`afeição ×${(1 + Math.max(0, app.pet.affection) / 500).toFixed(1)}`);
        if (g.gear.trevo) active.push('trevo +50%');
        if (app.pet.buff('coinMagnet')) active.push(BUFF_LABELS.coinMagnet);
        const decor = g.decorBonus?.() || 1;
        if (decor > 1.01) active.push(`desktop ×${decor.toFixed(2)}`);
        const s = app.pet.stats;
        if (s.mood >= 60) active.push('+feliz');
        if (s.health >= 60 && s.hunger >= 40 && (s.thirst ?? 100) >= 40 && (s.hygiene ?? 100) >= 40) active.push('+cuidada');
        for (const [k, t] of Object.entries(app.pet.buffs || {})) {
          if (t > Date.now() && k !== 'coinMagnet') active.push(`${BUFF_ICONS[k] || ''} ${BUFF_LABELS[k] || k}`.trim());
        }
        return `${bits.join(' · ')} · ativos: ${active.join(' · ')}`;
      })()],
      ['Carteira dela', `¥ ${p.wallet || 0} · sorte nos jogos ${Math.round(Math.max(0, luckOf(app.pet.affection)) * 100)}%`],
    ];
    const favoritos = [
      ...[['love', '♥ Favoritos'], ['like', '👍 Gosta'], ['dislike', '👎 Não gosta'], ['hate', '💢 Odeia']].map(([t, label]) => [label,
        Object.entries(p.tastes || {}).filter(([, v]) => v === t).map(([id]) => itemById(id)?.name || id).join(', ') || '—']),
    ];
    const recordes = [
      ...(p.fun?.yoyo ? [['Ioiô', `nível ${Math.min(10, 1 + Math.floor(p.fun.yoyo / 12))} · ${p.fun.yoyo} truques`]] : []),
      ...(p.fun?.hoopBest ? [['Recorde no bambolê', `${p.fun.hoopBest}s`]] : []),
      ...(p.fun?.cubeBest ? [['Recorde do cubo mágico', `${p.fun.cubeBest}s`]] : []),
      ...(p.fun?.tama ? [['Tamapet', `fome ${Math.round(p.fun.tama.hunger)}% · humor ${Math.round(p.fun.tama.mood)}%`]] : []),
      ['Pega-pega', `${p.chases} partidas · ${p.chaseWins} vitórias da Persocon · ${p.escapes} fugas`],
    ];
    const del = h('button.danger', {
      onclick: () => {
        if (!del.dataset.sure) {
          del.dataset.sure = '1';
          del.textContent = 'Tem certeza? Clique de novo para apagar tudo';
          return;
        }
        app.deleteSave();
        this.render();
      },
    }, '🗑 Apagar save e começar uma nova Persocon');
    // ---------- Atributos ----------
    // Cada atributo é clicável: abre a explicação dele (e clicar fora fecha).
    const attrs = p.attrs || {};
    const attrBox = h('div.attrs', {}, ATTRS.map(([k, label]) => {
      const lvl = g.attrLevel?.(k) ?? (attrs[k] ?? 0);
      const xp = Math.floor(g.attrXp?.(k) || 0);
      const pr = attrProg(xp);
      const shown = this._attrOpen === k;
      return h(`div.attr${shown ? '.open' : ''}`, {
        'data-attr': k,
        title: `${xp} XP no total`,
        onclick: () => this.toggleAttr(k),
      },
        h('span', {}, label), h('b.attr-lvl', {}, `Nv ${lvl}`),
        h('div.track', {}, h('div.fill.attr', { style: { width: `${(lvl / 10) * 100}%` } })),
        h('div.track.xp', {}, h('div.fill.xp', { style: { width: `${pr.done ? 100 : (pr.cur / pr.max) * 100}%` } })),
        h('small.muted.attr-xp', {}, pr.done ? 'nível máximo' : `${Math.floor(pr.cur)} / ${pr.need} XP`),
        shown ? h('p.attr-desc', {}, ATTR_DESC[k] || '') : null);
    }));
    const attrsBody = h('div', {},
      attrBox,
      h('dl.facts.profile', {}, [
        h('dt', {}, 'Saúde máxima'), h('dd', {}, String(g.maxHealth?.() ?? 100)),
      ]));
    // ---------- Combate ----------
    // Só aparece o que ela já sabe: as artes que ela treinou e as manobras que desbloqueou.
    const arts = COMBAT_ARTS.map((id) => {
      const def = SKILL_DEFS[id];
      if (!def) return null;
      const xp = g.skillXp(id);
      const moves = skillMoves(id, xp);
      if (!skillStarted(id, xp) || !moves.length) return null;   // arte ainda não aprendida: nem aparece
      const lvl = skillLevel(xp);
      return h('div.combat-art', {},
        h('div.combat-art-head', {}, `${def.icon} ${def.art}`, h('span.muted', {}, `Nv ${lvl}`)),
        h('ul.skill-moves', {}, moves.map((m) => h('li', {}, `${m.name} · ${m.kind === 'attack' ? `dano ${m.dmg}` : m.kind === 'defend' ? 'defesa' : 'esquiva'}`))));
    }).filter(Boolean);
    const manList = MANEUVERS.filter((m) => combatLvl >= m.lvl);
    const manBox = manList.length
      ? h('div.maneuvers', {}, manList.map((m) => h('div.maneuver', {},
        h('b', {}, `✦ ${m.name}`),
        h('span.muted', {}, `Nv ${m.lvl}`),
        h('small', {}, m.pt))))
      : null;
    const combatBody = h('div.combat', {},
      h('dl.facts.profile', {}, [
        h('dt', {}, 'Combate'), h('dd', {}, `Nv ${combatLvl} · ${Math.floor(g.skillXp('unarmed'))}/${combatNext} XP`),
      ]),
      ...arts,
      manBox);
    return [
      h('div.group', {}, 'Perfil'),
      ...section('geral', 'Informações Gerais', geral),
      ...section('favoritos', 'Favoritos', favoritos),
      ...section('pats', 'Cafunés / tapas', [['Cafunés / tapas', `${p.pats} / ${p.slaps}`]]),
      ...section('games', 'Jogos no GameBuddy', [['Jogos no GameBuddy', p.gamesPlayed]]),
      ...section('carts', 'Cartuchos', [['Cartuchos', g.cartridges.map((c) => `${GAMES[c]?.name || c}${g.isFavorite(c) ? ' ♥' : ''} (nv ${Math.round(g.cartSkill(c) * 10)})`).join(', ') || '—']]),
      ...section('toys', 'Brinquedos comprados', [['Brinquedos comprados', p.toysBought]]),
      ...section('requests', 'Pedidos atendidos', [['Pedidos atendidos', p.requestsDone]]),
      ...section('records', 'Recordes e troféus', recordes),
      ...section('attrs', 'Atributos', null, attrsBody),
      ...section('combat', 'Combate', null, combatBody),
      h('div.group', {}, 'Incentivos (cafuné) e desincentivos (tapa)'),
      Object.keys(app.pet.prefs || {}).length
        ? h('div.prefs', {}, Object.entries(app.pet.prefs).map(([k, v]) => h('div.pref', {},
            h('span', {}, `${v > 0 ? '👍' : '👎'} ${prefLabel(k)}`),
            h('b', { class: v > 0 ? 'up' : 'down' }, `${v > 0 ? '+' : ''}${Math.round((2 ** v - 1) * 100)}%`),
            h('button.mini', { onclick: () => { delete app.pet.prefs[k]; g.changed(); this.render(); } }, 'Retirar'))))
        : h('div.note', {}, 'Nada ainda. Faça cafuné enquanto ele faz algo para incentivar; um tapa desincentiva.'),
      h('div.row.center', {},
        h('button', { onclick: () => window.petAPI.exportSave?.().then((ok) => ok && app.sound.play('ok')).catch(() => app.sound.play('cancel')) }, '⤒ Exportar save'),
        h('button', { onclick: async () => {
          await app.game.persist();
          const ok = await window.petAPI.importSave?.().catch(() => { app.sound.play('cancel'); return false; });
          if (ok) { app.game.frozen = true; location.reload(); }
        } }, '⤓ Importar save')),
      h('div.note', {}, 'O save atual vira backup antes de importar (3 backups automáticos).'),
      h('div.row.center', {}, del),
    ];
  }

  // Abre (ou fecha) a explicação de um atributo. Clicar fora dela também fecha.
  toggleAttr(key) {
    this._attrOpen = this._attrOpen === key ? null : key;
    // Fechou: o listener de "clicar fora" não precisa mais existir.
    if (!this._attrOpen && this._attrOutside) {
      document.removeEventListener('click', this._attrOutside);
      this._attrOutside = null;
    }
    this.render();
    if (!this._attrOpen || this._attrOutside) return;
    const close = (ev) => {
      // Um clique dentro de um atributo é tratado pelo próprio atributo.
      if (ev.target?.closest?.('.attr')) return;
      this._attrOutside = null;
      document.removeEventListener('click', close);
      this._attrOpen = null;
      this.render();
    };
    this._attrOutside = close;
    document.addEventListener('click', close);
  }

  temas() {
    const { app } = this;
    const cur = app.config.theme || 'padrao';
    const c = app.config;
    const chips = (list, cur, key) => h('div.filters', {}, list.map(([id, label]) => h(`button.chip${cur === id ? '.active' : ''}`, {
      onclick: () => { app.setOption(key, id); if (key !== 'soundTheme') app.previewEmoticon(); else app.sound?.tone8?.(660, 880, 0.12); this.render(); },
    }, label)));
    return h('div.rows', {},
      h('div.group', {}, 'Janelas'),
      h('div.row', {},
        h('button', { onclick: () => { this.close(); app.openObjects(); } }, '🎨 Visual dos objetos')),
      h('div.themes', {}, THEMES.filter(([id]) => id !== 'resourcepack').map(([id, label, [bg, accent]]) =>
        h(`button.theme${id === cur ? '.active' : ''}`, { onclick: () => { app.setOption('theme', id); this.render(); } },
          h('span.swatch', { style: { background: `linear-gradient(135deg, ${bg} 55%, ${accent} 55%)` } }), label))),
      h('div.group', {}, 'Sons'),
      chips(Object.entries(SOUND_THEMES).map(([id, t]) => [id, t.label]), c.soundTheme || 'padrao', 'soundTheme'));
  }

  foodPicker(food) {
    const back = h('button.link.back', { onclick: () => { this.feeding = false; this.render(); } }, '‹ Voltar');
    if (!food.length) {
      return h('div.empty', {}, back,
        h('div.empty-icon', {}, '🍽'),
        h('div', {}, 'Nenhuma comida no inventário.'),
        h('button.primary', { onclick: () => this.select('shop') }, 'Ir para a Shop'));
    }
    return [back, h('div.items', {}, food.map(({ item, count }) =>
      h('button.item', { 'data-item': item.id, onclick: () => { this.flashItem(item.id); this.app.game.use(item.id); this.refreshStats(); } },
        itemIcon(item),
        h('span.item-name', {}, item.name, h('span.count', {}, `×${count}`), tasteTag(this.app.game, item)),
        h('span.item-fx', {}, effectText(item)))))];
  }

  shop() {
    const { game } = this.app;
    // Cartridges only show up once a console (or the TV + console) is owned; mangas need the shelf.
    const hasConsole = ['gameboy', 'gamegear', 'psp', 'videogame'].some((id) => game.count(id) > 0 || !!game.toys[id]);
    const cats = SHOP_CATEGORIES.filter(([id]) =>
      (id !== 'cartuchos' || hasConsole) && (id !== 'mangas' || game.hasShelf()));
    if (!cats.some(([id]) => id === this.shopCat)) this.shopCat = 'fun';
    const tabs = segmented(cats.map(([id, icon, label]) => [id, `${icon} ${label}`]), this.shopCat, (id) => {
      this.shopCat = id;
      this.render();
    });
    // A compra em quantidade (1x/5x/10x) volta nas coisas que dá para empilhar.
    const multi = ['comidas', 'bebidas', 'sobremesas', 'medicina'].includes(this.shopCat);
    const n = multi ? (this.qty || 1) : 1;
    const list = ITEMS.filter((i) => (i.cat === this.shopCat || (this.shopCat === 'cartuchos' && i.mystery)) && game.available(i) && (HER_BAG || !i.bagSlots));
    if (['cartuchos', 'comidas', 'bebidas', 'sobremesas', 'medicina'].includes(this.shopCat)) list.sort((a, b) => (a.price || 0) - (b.price || 0));
    if (DEMO) list.sort((a, b) => demoLocked(a.id) - demoLocked(b.id));
    const price = (item) => (INFINITE_MONEY && item.price ? `¥ ∞` : item.price ? `¥ ${item.price * n}` : 'Grátis');
    const body = list.length
      ? h('div.items', {}, list.map((item) =>
          h('div.item', { 'data-item': item.id },
            itemIcon(item),
            h('span.item-name', {}, item.name, tasteTag(game, item), game.count(item.id) ? h('span.count', {}, `tem ${game.count(item.id)}`) : null,
              game.pending(item.id) ? h('span.count', {}, game.queued(item.id) ? 'na fila da impressora' : 'impresso, a guardar') : null,
              game.toys[item.id]?.broken ? h('span.count.warn', {}, 'quebrado') : null),
            h('span.item-fx', {}, effectText(item)),
            demoLocked(item.id)
              ? h('button.buy', { disabled: true }, '🔒 Versão completa')
              : h('button.buy', { onclick: () => { this.flashItem(item.id); game.buy(item.id, n); }, disabled: !game.canBuy(item, n) }, `${price(item)}${n > 1 ? ` (×${n})` : ''}`))))
      : h('div.empty', {}, h('div.empty-icon', {}, this.shopCat === 'mobilia' ? '🛋' : '✓'),
          h('div', {}, this.shopCat === 'mangas' ? 'Compre uma Estante (Mobília) para liberar os mangás.' : 'Nada novo por aqui.'));
    const qty = multi && h('div.row', {}, h('span.label', {}, 'Quantidade'),
      segmented([[1, '×1'], [5, '×5'], [10, '×10']], this.qty, (v) => { this.qty = v; this.render(); }));
    tabs.classList.add('wrap');
    const note = {
      fun: 'Brinquedos vão para o inventário; coloque na área de trabalho e a Persocon brinca sozinha. Quebram depois de um tempo.',
      cartuchos: 'Cartuchos vão para a bolsa do GameBuddy ou para a Gaming Shelf, se ela estiver na área de trabalho. Quanto mais complexo o jogo, mais caro. A Persocon melhora com a prática e tem favoritos (♥, dão mais Humor). Todos têm modo 2 jogadores. E, quando você já tiver todos os outros cartuchos, aparece um cartucho preto sem nome, de graça — ninguém sabe o que ele é (só a TV aceita ele).',
      comidas: 'Comida enche a Fome. Cada Persocon tem gostos próprios (♥ a ☹) e come sozinha quando está com fome.',
      bebidas: 'Bebidas matam a Sede e algumas dão Energia. Servem também para acompanhar uma refeição.',
      sobremesas: 'Sobremesas dão bastante Humor. Ela come como refeição, então não substituem um prato principal.',
      medicina: 'Medicamentos curam efeitos negativos (gripe, prisão de ventre, náusea, lesão) ou dão bônus temporários. Todos custam um pouco de Humor.',
    }[this.shopCat] || 'Ordenadas do mais barato ao mais caro.';
    return [tabs, qty, h('div.note', {}, '📦 Toda compra sai pela Impressora 3D e a Persocon guarda no 🎒 Inventário.'),
      DEMO ? h('div.note', {}, '🔒 Demo: os itens com cadeado ficam na versão completa.') : null, h('div.note', {}, note), body];
  }

  inventario() {
    const { app } = this;
    const { game } = app;
    const owned = game.items();
    const placed = Object.entries(game.toys).filter(([, t]) => t.placed).map(([key, t]) => ({ key, item: itemById(baseId(key)), t })).filter((e) => e.item);
    if (!owned.length && !placed.length) {
      return h('div.empty', {},
        h('div.empty-icon', {}, '🎒'),
        h('div', {}, 'Inventário vazio.'),
        HER_BAG ? h('div.note', {}, 'Ela também tem mochila própria: "Dar a ela" guarda na bolsa dela (ícone na tela).') : null,
        h('button.primary', { onclick: () => this.select('shop') }, 'Ir para a Shop'));
    }
    const ownedRow = ({ item, count }) => {
      const nSell = isSellable(item) ? Math.min(this.qty || 1, count) : 0;
      const sellYen = nSell ? sellPrice(item) * nSell : 0;
      // Buttons L→R: extras → Vender → Usar (Usar is rightmost / first from the right).
      return h('div.item', { 'data-item': item.id },
        itemIcon(item),
        h('span.item-name', {}, item.name, h('span.count', {}, `×${count}`), tasteTag(game, item)),
        h('span.item-fx', {}, effectText(item)),
        HER_BAG && game.canBag?.(item.id) && !item.bagSlots && h('button.buy', {
          onclick: () => {
            if (game.bagStore(item.id)) {
              app.sound.play('ok');
              this.flashItem(item.id);
              app.gains?.show(item.name, 'item', '→ bolsa dela', item.img || '🎒');
              this.render();
            } else app.sound.play('cancel', { volume: 0.4 });
          },
          disabled: app.pet.dead || game.bagFree() <= 0 || (
            !game.isBagSupply?.(item) && game.bagHas(item.id)
          ),
          title: game.bagFree() <= 0 ? 'Bolsa dela cheia' : 'Vai para a bolsa dela (ícone na tela) · ela usa e guarda sozinha',
        }, '🎒 Dar a ela'),
        item.toy && game.toys[item.id]?.broken && repairBtn(item.id),
        item.toy && !game.toys[item.id]?.broken && h('button.buy', { onclick: () => app.placeToy(item.id) }, 'Colocar'),
        item.id === 'cart_unknown' && h('button.buy', {
          onclick: () => { if (!app.unknown?.insert?.()) { /* insert já avisa */ } },
          title: 'Insere o cartucho preto na TV (a ameaça da TV)',
        }, '🕹 Usar na TV'),
        nSell > 0 && h('button.buy', {
          onclick: () => {
            const got = game.sell(item.id, nSell);
            if (!got) return app.sound.play('cancel', { volume: 0.4 });
            this.flashItem(item.id);
            app.sound.play('ok', { volume: 0.5 });
            app.gains?.show(`+¥ ${got}`, 'gain', item.name, item.img || '💰');
            this.refreshStats();
            this.render();
          },
          title: 'Vende pela metade do preço da Shop · só o que está no inventário',
        }, `Vender ¥ ${sellYen}${nSell > 1 ? ` (×${nSell})` : ''}`),
        isConsumable(item) && h('button.buy', {
          onclick: async () => {
            this.flashItem(item.id);
            if (item.box && (game.count(item.id) || 0) > 1) {
              // Open dialog to select how many boxes to open
              const { BoxOpenDialog } = await import('./ui.js');
              const dialog = new BoxOpenDialog(app, item.id, game.count(item.id));
              dialog.open();
              return;
            }
            if (!game.use(item.id)) app.sound.play('cancel', { volume: 0.4 });
            this.refreshStats();
            this.render();
          },
          disabled: app.pet.dead || (item.box && (app.rewards?.opening
            || (app.pet.actionQueue || []).some((a) => a.kind === 'box'))),
          title: item.box && (app.rewards?.opening || (app.pet.actionQueue || []).some((a) => a.kind === 'box'))
            ? 'Já tem uma caixa abrindo · espere terminar'
            : '',
        }, item.box ? '🎁 Abrir' : 'Usar'));
    };
    const repairBtn = (key) => h('button.buy.repair', {
      onclick: () => { if (app.toys.repair(key)) this.render(); },
      disabled: !INFINITE_MONEY && game.coins < game.repairCost(baseId(key)),
    }, `🔧 Consertar ¥ ${game.repairCost(baseId(key))}`);
    const placedRow = ({ key, item, t }) =>
      h('div.item', {},
        itemIcon(item),
        h('span.item-name', {}, item.name, h(t.broken ? 'span.count.warn' : 'span.count', {}, t.broken ? 'quebrado' : 'na área de trabalho')),
        h('span.item-fx', {}, t.broken ? `Conserto: ¥ ${game.repairCost(item.id)} (metade do preço)` : FURN[item.id]?.disco ? 'Liga no modo Jam' : `Usado ${t.uses}×`),
        t.broken && repairBtn(key),
        item.fixed ? null : h('button.buy', { onclick: () => game.pickUpToy(key) }, 'Guardar'));
    const bagNote = HER_BAG
      ? h('div.note', {}, `🎒 "Dar a ela" → bolsa dela (${game.herBag().length}/${game.bagCap()}, ícone na tela): comidas/bebidas e brinquedos portáteis (ioiô, bolas…). GameBuddy fica no desktop. Ela usa sozinha e guarda de novo.`)
      : (game.herBag().length ? h('div.note', {}, `🎒 Bolsa dela pausada (${game.herBag().length} item(ns) ainda guardados — menu rápido para devolver).`) : null);
    const known = new Set([...SHOP_CATEGORIES.map(([id]) => id), 'premios', 'especiais']);
    const groups = [...SHOP_CATEGORIES, ['premios', '🎁', 'Prêmios'], ['especiais', '💎', 'Especial'], ['outros', '✦', 'Outros']].map(([id, icon, label]) => {
      const mine = (e) => (id === 'outros' ? !known.has(e.item.cat) : e.item.cat === id);
      return { id, icon, label, owned: owned.filter(mine), placed: placed.filter(mine) };
    }).filter((g) => g.owned.length || g.placed.length);
    const size = (g) => g.owned.reduce((n, e) => n + e.count, 0) + g.placed.length;
    const tabList = [['todos', '🎒 Todos'], ...groups.map((g) => [g.id, `${g.icon} ${g.label} ${size(g)}`])];
    if (placed.length) tabList.push(['colocados', `🖥 Colocados ${placed.length}`]);
    if (!tabList.some(([id]) => id === this.invCat)) this.invCat = 'todos';
    const tabs = segmented(tabList, this.invCat, (id) => { this.invCat = id; this.render(); });
    tabs.classList.add('wrap');
    const rows = (g) => [...g.owned.map(ownedRow), ...g.placed.map(placedRow)];
    const body = this.invCat === 'todos' ? groups.flatMap((g) => [h('div.group', { 'data-seg': g.id }, `${g.icon} ${g.label}`), ...rows(g)])
      : this.invCat === 'colocados' ? placed.map(placedRow)
      : rows(groups.find((g) => g.id === this.invCat));
    const actions = placed.length ? h('div.row.center', {},
      h('button', {
        title: 'Guarda todos os objetos da área de trabalho (útil se algum sumiu da tela); ao colocar de novo, voltam para perto da Persocon',
        onclick: () => { game.storeAll(); app.sound.play('ok', { volume: 0.4 }); this.render(); },
      }, '📦 Guardar tudo'),
      app.toys?.editable().length ? h('button', { onclick: () => { this.close(); app.editFurniture(); } }, '🛋 Editar mobília') : null) : null;
    const canSellAny = owned.some((e) => isSellable(e.item));
    const sellQty = canSellAny && h('div.row', {}, h('span.label', {}, 'Vender'),
      segmented([[1, '×1'], [5, '×5'], [10, '×10']], this.qty, (v) => { this.qty = v; this.render(); }));
    const sellNote = canSellAny
      ? h('div.note', {}, '💰 Comidas, bebidas, mobília (várias), PowerUps e prêmios: venda pela metade do valor. Guarde da área de trabalho antes.')
      : null;
    return [tabs, bagNote, sellQty, sellNote, actions, h('div.items', {}, body)];
  }

  modelo() {
    const { app } = this;
    const exp = this.expanded;
    const toggleRow = (id) => { this.expanded = exp === id ? null : id; this.render(); };
    const grid = h('div.grid', {},
      this.tile('⤓', 'Importar modelo', 'YSM, modelo 3D ou skin de blocos', () => { this.close(); app.openImport(); }),
      ![DEFAULT_MODEL_DIR, AGHATA_MODEL_DIR].includes(app.config.modelDir || DEFAULT_MODEL_DIR) && this.tile('↺', 'Modelo padrão', 'Voltar para a Ninna', async () => {
        await window.petAPI.saveConfig({ modelDir: DEFAULT_MODEL_DIR });
        await app.reloadForModel();
      }),
      this.tile('✂', 'Acessórios', 'Remover partes do modelo', () => toggleRow('parts'), { active: exp === 'parts' }),
      this.tile('🎨', 'Visual dos objetos', 'Imagem, GIF ou 3D', () => { this.close(); app.openObjects(); }),
      this.tile('⇕', 'Ajustar tamanho', `${app.config.petHeight}px`, () => toggleRow('size'), { active: exp === 'size' }),
      this.tile('✎', 'Mudar nome', app.config.name || 'Ninna', () => toggleRow('name'), { active: exp === 'name' }),
      this.tile('♫', 'Animações extras', 'Para que serve cada uma', () => { this.close(); new RolesDialog(app).show(); }),
      this.tile('▶', 'Ligar/desligar animações', 'Ver e escolher quais ela usa', () => toggleRow('anims'), { active: exp === 'anims' }),
      h('div.tile.info', {},
        h('span.icon', {}, '▦'),
        h('span.label', {}, 'Modelo atual'),
        h('span.hint', {}, `${app.config.modelDir}`),
        h('span.hint', {}, `${app.view.animator.clips.size} animações`)),
    );
    let extra = null;
    if (exp === 'size') extra = this.sizeSlider();
    if (exp === 'anims') extra = [
      app.previewing ? h('div.row', {}, h('button', { onclick: () => { app.stopPreview(); this.render(); } }, '⏹ Parar prévia')) : null,
      ...this.animItems(),
    ];
    if (exp === 'parts') {
      const names = app.view.partNames?.() || [];
      const hidden = new Set(app.hiddenParts().filter((n) => names.includes(n)));
      extra = [
        h('div.note', {}, 'Desmarque uma parte para escondê-la (vale também após reiniciar).'),
        h('div.chips', {}, names.map((n) => h(`button.chip${hidden.has(n) ? '' : '.active'}`, {
          onclick: (e) => {
            hidden.has(n) ? hidden.delete(n) : hidden.add(n);
            e.currentTarget.classList.toggle('active', !hidden.has(n));
            app.setHiddenParts([...hidden]);
          },
        }, n))),
        h('div.row.center', {}, h('button', { onclick: () => { app.setHiddenParts([]); this.render(); } }, 'Mostrar tudo')),
      ];
    }
    if (exp === 'name') {
      const input = h('input.text', { value: app.config.name || '', maxlength: 16, placeholder: 'Nome da Persocon' });
      const save = () => { app.setName(input.value.trim() || 'Persocon'); this.expanded = null; this.render(); };
      input.addEventListener('keydown', (e) => e.key === 'Enter' && save());
      const sex = segmented([['M', 'M'], ['F', 'F'], ['X', '???']], app.game.profile.sex || 'F', (v) => {
        app.setSex?.(v);
        app.setOption('voicePitch', { M: 'grave', F: 'agudo', X: 'normal' }[v]);
      });
      extra = h('div', {}, h('div.row.name-row', {}, input, h('button.primary', { onclick: save }, 'Salvar')), h('div.row', {}, h('span.label', {}, 'Sexo'), sex));
      setTimeout(() => { app.focus(); input.focus(); input.select(); }, 0);
    }
    return [grid, extra && h('div.expand', {}, extra)];
  }

  sizeSlider() {
    const { app } = this;
    return slider({
      label: 'Tamanho', min: 50, max: 300, step: 5, value: app.config.petHeight, format: (v) => `${v}px`,
      oninput: (v) => app.setSize(v),
      onchange: () => this.render(),
    });
  }

  opcoes() {
    const { app } = this;
    const c = app.config;
    const emo = (key) => (v) => { app.setOption(key, v); app.previewEmoticon(); };
    return h('div.rows', {},
      h('div.group', {}, 'Jogo'),
      h('div.row', {}, h('span.label', {}, 'Dificuldade'), segmented(DIFFICULTY_OPTIONS, c.difficulty || 'normal', (v) => app.setOption('difficulty', v))),
      h('div.note', {}, 'A dificuldade muda a velocidade com que Energia, Fome e Humor caem.'),
      h('div.group', {}, 'Persocon'),
      this.sizeSlider(),
      slider({ label: 'Velocidade', min: 0.4, max: 2.5, step: 0.1, value: c.speedScale ?? 1, format: (v) => `${v.toFixed(1)}×`,
        oninput: (v) => app.setOption('speedScale', v) }),
      slider({ label: 'Escalar janelas', min: 0, max: 1, step: 0.05, value: c.climbChance, format: (v) => `${Math.round(v * 100)}%`,
        oninput: (v) => app.setOption('climbChance', v) }),
      h('div.group', {}, 'Filtro da Persocon'),
      h('div.filters', {}, FILTERS.map(([id, label]) => h(`button.chip${(c.filter || 'nenhum') === id ? '.active' : ''}`, {
        onclick: () => { app.setOption('filter', id); this.render(); },
      }, label))),
      slider({ label: 'Intensidade', min: 0, max: 2, step: 0.05, value: c.filterStrength ?? 1, format: (v) => `${Math.round(v * 100)}%`,
        oninput: (v) => app.setOption('filterStrength', v) }),
      h('div.group', {}, 'Ajuda'),
      toggle({
        label: 'Mostrar dicas e tutoriais na tela',
        value: !app.game.profile.tipsOff,
        onchange: (v) => {
          if (v) resetTips(app.game);
          else { app.game.profile.tipsOff = true; app.game.changed?.(); }
          this.render();
        },
      }),
      h('div.note', {}, DEMO
        ? 'Na Demo as dicas explicam Jam, Assistir e Opções. Dá para desligar aqui ou no botão "Não mostrar dicas".'
        : 'Dicas aparecem nos primeiros dias. Desligue aqui ou no botão "Não mostrar dicas" de cada cartão.'),
      h('div.group', {}, 'Comportamento'),
      toggle({ label: 'Começar Modo Jam / Assistir sozinho', value: c.autoActivity !== false, onchange: (v) => app.setOption('autoActivity', v) }),
      toggle({ label: 'Reagir ao que acontece no desktop (janelas, mouse)', value: c.desktopReactions !== false, onchange: (v) => app.setOption('desktopReactions', v) }),
      toggle({ label: 'Achar jogos nos ícones da área de trabalho', value: c.desktopGames !== false, onchange: (v) => app.setOption('desktopGames', v) }),
      h('div.group', {}, 'Interações com o desktop/cursor'),
      toggle({ label: 'Roubar o cursor de vez em quando (1-3 s)', value: c.cursorSteal !== false, onchange: (v) => app.setOption('cursorSteal', v) }),
      toggle({ label: 'Brincar com os ícones (chutar cópias, lixeira, empurrar e devolver)', value: c.iconPlay !== false, onchange: (v) => app.setOption('iconPlay', v) }),
      toggle({ label: 'Sentar na barra de título da janela ativa', value: c.windowPerch !== false, onchange: (v) => app.setOption('windowPerch', v) }),
      toggle({ label: 'Dançar / tapar os ouvidos com o som do PC', value: c.soundReact !== false, onchange: (v) => app.setOption('soundReact', v) }),
      toggle({ label: 'Pedir atenção (bater na tela) quando esquecida', value: c.askAttention !== false, onchange: (v) => app.setOption('askAttention', v) }),
      toggle({ label: 'Lembretes de pausa (água/alongar a cada 1-2 h)', value: c.breakReminder !== false, onchange: (v) => app.setOption('breakReminder', v) }),
      h('div.note', {}, 'O Modo foco e o Streamer Mode desligam as interações com o desktop/cursor. Ícones empurrados de verdade voltam ao lugar em segundos.'),
      toggle({ label: 'Clicar através da Persocon e dos objetos', value: !!c.clickThrough, onchange: (v) => app.setOption('clickThrough', v) }),
      h('div.note', {}, 'Com "clicar através", abra o menu pelo ícone da bandeja.'),
      h('div.group', {}, 'Emoticons'),
      toggle({ label: 'Mostrar', value: c.emoticons !== false, onchange: (v) => app.setOption('emoticons', v) }),
      slider({ label: 'Frequência', min: 0.2, max: 3, step: 0.1, value: c.emoticonRate ?? 1, format: (v) => `${v.toFixed(1)}×`,
        oninput: (v) => app.setOption('emoticonRate', v) }),
      slider({ label: 'Tamanho', min: 0.5, max: 3, step: 0.25, value: c.emoticonScale ?? 0.5, format: (v) => `${v.toFixed(2)}×`,
        oninput: emo('emoticonScale') }),
      slider({ label: 'Posição X', min: -80, max: 80, step: 2, value: c.emoticonOffsetX ?? -28, format: (v) => `${v}px`,
        oninput: emo('emoticonOffsetX') }),
      slider({ label: 'Posição Y', min: -60, max: 120, step: 2, value: c.emoticonOffsetY ?? 12, format: (v) => `${v}px`,
        oninput: emo('emoticonOffsetY') }),
      h('div.group', {}, 'Som'),
      toggle({ label: 'Efeitos sonoros', value: c.sound !== false, onchange: (v) => app.setOption('sound', v) }),
      slider({ label: 'Volume', min: 0, max: 1, step: 0.05, value: c.volume ?? 0.3, format: (v) => `${Math.round(v * 100)}%`,
        oninput: (v) => app.setOption('volume', v) }),
      toggle({ label: 'Passos', value: c.footsteps === true, onchange: (v) => app.setOption('footsteps', v) }),
      toggle({ label: 'Barriga roncando', value: c.growl !== false, onchange: (v) => app.setOption('growl', v) }),
      slider({ label: 'Volume do GameBuddy', min: 0, max: 2, step: 0.05, value: c.gbVolume ?? 0.25, format: (v) => `${Math.round(v * 100)}%`,
        oninput: (v) => app.setOption('gbVolume', v) }),
      h('div.row', {}, h('span.label', {}, 'Set de sons'),
        h('button', { onclick: () => { app.setOption('soundSeed', 1 + Math.floor(Math.random() * 1e9)); app.sound.play('ok'); app.sound.play('jump'); app.sound.voice(4); this.render(); } }, '🎲 Gerar novo set 8-bit'),
        c.soundSeed ? h('button', { onclick: () => { app.setOption('soundSeed', 0); app.sound.play('ok'); this.render(); } }, 'Originais') : null),
      h('div.note', {}, c.soundSeed ? `Usando set gerado #${c.soundSeed}. Gere outro até gostar.` : 'Usando os sons originais.'),
      h('div.group', {}, 'Voz 8-bit'),
      toggle({ label: 'Falar (balões)', value: c.speech !== false, onchange: (v) => app.setOption('speech', v) }),
      h('div.row', {}, h('span.label', {}, 'Idioma da Persocon'), segmented([['pt', 'Português'], ['en', 'English']], c.lang || 'pt', (v) => app.setOption('lang', v))),
      slider({ label: 'Frequência de fala', min: 0, max: 3, step: 0.1, value: c.speechFreq ?? 1, format: (v) => (v ? `${v.toFixed(1)}×` : 'muda'),
        oninput: (v) => app.setOption('speechFreq', v) }),
      slider({ label: 'Volume da voz', min: 0, max: 1, step: 0.05, value: c.voiceVolume ?? 0.7, format: (v) => `${Math.round(v * 100)}%`,
        onchange: (v) => app.setOption('voiceVolume', v) }),
      h('div.row', {}, h('span.label', {}, 'Tom'), segmented([['grave', 'Grave'], ['normal', 'Normal'], ['agudo', 'Agudo']], c.voicePitch || 'normal', (v) => app.setOption('voicePitch', v))),
      this.monitorRows(),
      h('div.group', {}, 'Gráficos'),
      h('div.row', {}, h('span.label', {}, 'Estilo dos ícones'), segmented([['16bit', '16-bit'], ['classic', 'Clássico']], c.artStyle || '16bit', (v) => { app.setOption('artStyle', v); this.render(); })),
      h('div.group', {}, 'Menu'),
      ...[['menuWidth', 'Largura', 300, 640, 10, 360, (v) => `${v}px`], ['menuHeight', 'Altura', 40, 95, 1, 56, (v) => `${v}%`]].map(([key, label, min, max, step, def, format]) =>
        slider({ label, min, max, step, value: c[key] ?? def, format, oninput: (v) => { app.setOption(key, v); this.applySize(); this.place(); } })),
      h('div.group', {}, 'Status fixo na tela'),
      h('div.row', {}, h('span.label', {}, 'Posição'), segmented([['off', 'Desligado'], ['tl', '↖'], ['tr', '↗'], ['bl', '↙'], ['br', '↘']], c.statusDock ?? 'tr', (v) => app.setOption('statusDock', v))),
      slider({ label: 'Tamanho', min: 0.8, max: 2.5, step: 0.1, value: c.statusDockScale ?? 1.3, format: (v) => `${Math.round(v * 100)}%`, oninput: (v) => app.setOption('statusDockScale', v) }),
      ...(HER_BAG ? [
        h('div.group', {}, 'Ícone do inventário dela'),
        h('div.row', {}, h('span.label', {}, 'Posição'), segmented([['off', 'Desligado'], ['tl', '↖'], ['tr', '↗'], ['bl', '↙'], ['br', '↘']], c.herBagIcon ?? 'tr', (v) => app.setOption('herBagIcon', v))),
        slider({ label: 'Tamanho', min: 0.7, max: 2.5, step: 0.1, value: c.herBagIconScale ?? 1.4, format: (v) => `${Math.round(v * 100)}%`, oninput: (v) => app.setOption('herBagIconScale', v) }),
        h('div.note', {}, 'Ícone separado do status (por padrão abaixo dele): clique abre a mochila dela; botão direito move e ajusta o tamanho.'),
      ] : []),
      h('div.group', {}, 'Setups da mesa'),
      this.setupRows(),
      h('div.group', {}, 'Streamer Mode'),
      toggle({ label: 'Streamer Mode (janela para o OBS)', value: !!c.streamer, onchange: (v) => app.setOption('streamer', v) }),
      h('div.row', {}, h('span.label', {}, 'Fundo'), segmented([['verde', 'Verde'], ['azul', 'Azul'], ['magenta', 'Magenta'], ['transparente', 'Transparente']], c.streamerBg || 'verde', (v) => app.setOption('streamerBg', v))),
      h('div.note', {}, 'No OBS: Captura de janela → "My Persocon - Streamer Mode", marque "Área do cliente". Prefira fundo Verde/Azul/Magenta + filtro Chroma Key (captura estável). Evite o método "Windows 10" com fundo transparente — no Windows 11 costuma dar tela preta ou travar a stream. Duplo clique na Persocon liga/desliga; fechar a janela só sai do modo.'),
      h('div.group', {}, 'Outros'),
      h('div.row', {}, h('span.label', {}, 'Emoticons, volumes e passos'),
        h('button', { onclick: () => { for (const [k, v] of Object.entries(DEFAULT_OPTS)) app.setOption(k, v); app.sound.play('ok'); this.render(); } }, '↺ Restaurar padrões')),
      toggle({ label: 'Iniciar com o Windows', value: !!app.autostart, onchange: (v) => {
        window.petAPI.setAutostart?.(v).then((on) => { app.autostart = on; }).catch(() => { app.sound.play('cancel'); this.render(); });
      } }),
      h('div.row', {}, h('span.label', {}, 'Encontrou um bug?'),
        h('button', { onclick: () => {
          const p = app.pet;
          const info = [`Data: ${new Date().toString()}`, `Navegador: ${navigator.userAgent}`,
            `Tela: ${screen.width}x${screen.height} · dpr ${devicePixelRatio} · janela ${innerWidth}x${innerHeight}`,
            `Modelo: ${app.config.modelDir} · ação ${p.action} · modo ${p.mode}`, `Status: ${JSON.stringify(p.stats)}`,
            '', '--- log recente ---', recentLog()].join('\n');
          window.petAPI.makeReport?.(info).then((ok) => ok && app.sound.play('ok')).catch(() => app.sound.play('cancel'));
        } }, '🐞 Gerar relatório de erro')),
      h('div.note', {}, 'Cria um .zip com versão, configurações, save e logs recentes para enviar ao desenvolvedor.'),
      this.promoRow(),
      app.version ? h('div.note', { 'data-no-i18n': '' }, `My Persocon v${app.version} · ${editionLabel()}`) : null,
      this.debugRows(),
    );
  }

  promoRow() {
    const { app } = this;
    const input = h('input.text', { maxlength: 24, placeholder: 'Código', spellcheck: false, 'data-no-i18n': '' });
    const redeem = () => {
      const code = input.value.trim();
      if (!code) return;
      input.value = '';
      this.redeem(code);
    };
    input.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') redeem();
    });
    input.addEventListener('pointerdown', () => app.focus?.());
    return h('div', {},
      (app.config.debugUnlocked || app.config.debug) && toggle({ label: '🎮 Modo debug', value: !!app.config.debug, onchange: () => this.toggleDebug() }),
      h('div.row', {}, h('span.label', {}, 'Código promocional')),
      h('div.row.name-row', {}, input, h('button.primary', { onclick: redeem }, 'Resgatar')));
  }

  redeem(code) {
    const { app } = this;
    const { game } = app;
    const key = code.toLowerCase();
    const promo = PROMOS[key];
    const toast = (text) => {
      const el = h('div.konami-toast', {}, text);
      this.el?.append(el);
      setTimeout(() => el.remove(), 1800);
    };
    if (!promo) {
      app.sound.play('cancel');
      return toast('Código inválido');
    }
    if (promo.once && game.promos.includes(key)) {
      app.sound.play('cancel');
      return toast('Código já usado');
    }
    if (promo.debug) {
      if (promo.once) game.promos.push(key);
      app.setOption('debugUnlocked', true);
      return this.toggleDebug();
    }
    if (promo.free) {
      const item = itemById(promo.free);
      if (!item) {
        app.sound.play('cancel');
        return toast('Código inválido');
      }
      // Already owns it (e.g. crow bought): code does nothing — no grant, no "used" mark.
      if (game.gear[item.id] || game.pending(item.id) || !game.available(item)) {
        app.sound.play('cancel');
        return;
      }
      if (promo.once) game.promos.push(key);
      // Same path as Shop buy, without paying.
      game.profile.purchases = (game.profile.purchases || 0) + 1;
      if (game.toys.impressora) {
        const waiting = game.queue.find((j, i) => j.id === item.id && (i > 0 || !j.t));
        if (waiting) waiting.n += 1;
        else game.queue.push({ id: item.id, n: 1, t: 0, dur: Math.min(30, 5 + Math.random() * 10), paid: 0 });
      } else {
        const d = game.deliveries.find((e) => e.id === item.id);
        if (d) d.n += 1;
        else game.deliveries.push({ id: item.id, n: 1, x: null, display: null });
      }
      game.changed();
      game.pet.bought(item);
      app.gains?.show(item.name, 'gain', 'Código promocional');
      app.sound.sfx?.('levelup', 0.6);
      toast(item.id === 'corvo' ? 'Caixa Misteriosa grátis!' : `${item.name} grátis!`);
      this.render();
      return;
    }
    if (promo.powerups) {
      const pool = ITEMS.filter(isPowerUp);
      if (!pool.length) {
        app.sound.play('cancel');
        return toast('Código inválido');
      }
      if (promo.once) game.promos.push(key);
      const byR = {};
      for (const it of pool) (byR[it.rarity || 'comum'] ||= []).push(it);
      const picks = [];
      // At least one of each rarity that exists in the pool.
      for (const r of ['comum', 'incomum', 'raro', 'lendario', 'epico']) {
        const list = byR[r];
        if (list?.length) picks.push(list[Math.floor(Math.random() * list.length)]);
      }
      while (picks.length < promo.powerups) picks.push(pool[Math.floor(Math.random() * pool.length)]);
      for (const it of picks.slice(0, promo.powerups)) {
        game.inventory[it.id] = Math.min(99, (game.inventory[it.id] || 0) + 1);
      }
      // Test helper: clears all active buffs so you can re-test PowerUps cleanly.
      const reset = ITEMS.find((i) => i.id === 'pu_limpar');
      if (reset) game.inventory[reset.id] = Math.min(99, (game.inventory[reset.id] || 0) + 5);
      game.changed();
      app.gains?.show(`+${promo.powerups} PowerUps`, 'gain', 'Código promocional', '⚡');
      app.sound.sfx?.('levelup', 0.6);
      toast(`${promo.powerups} PowerUps + 5 Reset no Inventário!`);
      this.render();
      return;
    }
    if (promo.once) game.promos.push(key);
    if (promo.coins) {
      game.coins += promo.coins;
      game.changed();
      app.gains?.show(`+¥ ${promo.coins}`, 'gain', 'Código promocional');
      app.sound.sfx?.('levelup', 0.6);
      toast(`¥ ${promo.coins} resgatados!`);
      this.render();
    }
  }

  toggleDebug() {
    const { app } = this;
    const on = !app.config.debug;
    if (!on) logInfo('debug', 'modo debug desligado (código)');
    app.setOption('debug', on);
    if (on) {
      logInfo('debug', 'modo debug ligado (código)');
      app.debugConsole?.show();
    }
    (on ? [523, 659, 784, 1047] : [784, 659, 523, 392]).forEach((f, i) => setTimeout(() => app.sound?.tone8?.(f, f, 0.08, 'square', 0.08), i * 80));
    if (on) this.openGroups?.add(`${this.category}:Debug`);
    this.render();
    this.el.classList.remove('konami');
    void this.el.offsetWidth;
    this.el.classList.add('konami');
    const toast = h('div.konami-toast', {}, on ? '🎮 Modo debug ligado' : '🎮 Modo debug desligado');
    this.el.append(toast);
    setTimeout(() => toast.remove(), 1800);
    if (on) this.el.querySelector('.group.debug')?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }

  // Category titles fold the rows below them (▾/▸); remembered in config.foldedGroups.
  // Demo keeps Opções open so players find monitors / always-on-top / tips.
  fold(panel) {
    const { app } = this;
    const folded = new Set(app.config.foldedGroups || []);
    const open = (this.openGroups ||= new Set());
    const startFolded = this.category === 'opcoes' && !DEMO;
    for (const g of panel.querySelectorAll('.group:not([data-seg])')) {
      const box = h('div.fold-box');
      for (let n = g.nextSibling; n && !n.matches?.('.group'); n = g.nextSibling) box.append(n);
      if (!box.childNodes.length) continue;
      g.after(box);
      const key = `${this.category}:${g.textContent}`;
      const set = (closed) => {
        g.classList.toggle('closed', closed);
        box.hidden = closed;
      };
      g.classList.add('fold');
      set(startFolded ? !open.has(key) : folded.has(key));
      g.addEventListener('click', () => {
        const closed = !g.classList.contains('closed');
        set(closed);
        app.sound?.play('blip', { volume: 0.4 });
        if (startFolded) {
          if (closed) open.delete(key);
          else open.add(key);
          return;
        }
        const list = new Set(app.config.foldedGroups || []);
        if (closed) list.add(key);
        else list.delete(key);
        app.setOption('foldedGroups', [...list]);
      });
    }
  }

  // Setups: save where every object on the desktop is and bring them back later.
  setupRows() {
    const { app } = this;
    const game = app.game;
    const input = h('input.text', { maxlength: 24, placeholder: 'Nome do setup', spellcheck: false, 'data-no-i18n': '' });
    const save = () => {
      const name = input.value.trim();
      input.value = '';
      game.captureSetup(name);
      app.sound?.play('ok');
      this.render();
    };
    input.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') save();
    });
    input.addEventListener('pointerdown', () => app.focus?.());
    const setups = game.setups || [];
    const when = (t) => new Date(t).toLocaleString();
    return [
      h('div.row.name-row', {}, input, h('button.primary', { onclick: save }, '💾 Salvar setup')),
      h('div.note', {}, 'Salva a posição de todas as mobílias e objetos da área de trabalho. Depois é só carregar o setup para deixar tudo igual.'),
      setups.length
        ? h('div.rows', {}, setups.map((s, i) => h('div.row', {},
          h('span.label', {}, `🗼 ${s.name} · ${when(s.at)}`),
          h('button', {
            onclick: () => {
              game.applySetup(i);
              app.ball?.syncFromRecords?.();
              app.sound?.play('ok');
              this.render();
            },
          }, 'Carregar'),
          h('button', {
            onclick: () => {
              game.deleteSetup(i);
              app.sound?.play('cancel');
              this.render();
            },
          }, 'Excluir'))))
        : h('div.note', {}, 'Nenhum setup salvo ainda.'),
    ];
  }

  // Debug: shortcuts to try the latest features and a short changelog.
  debugRows() {
    const { app } = this;
    if (!app.config.debug) return null;
    const { pet, doll, game } = app;
    const s = pet.stats;
    const busy = () => app.speech?.say('Agora não dá!', 2);
    const btn = (label, fn, close = true) => h('button.chip', {
      onclick: () => {
        if (!close) return fn();
        this.done();
        setTimeout(() => fn() === false && busy(), 80);
      },
    }, label);
    const setStats = (v) => { Object.assign(s, v); game.changed(); this.render(); };
    const alive = doll?.alive;
    return [
      h('div.group.debug', {}, 'Debug'),
      h('div.note', {}, 'Modo debug ligado: os logs vão para a pasta "log" em %APPDATA%\\My Persocon. O console fica aberto até você fechar (mesmo com o debug desligado).'),
      h('div.filters', {},
        btn('Abrir console', () => app.debugConsole?.show(), false),
        btn('Aproximação (lembrete)', () => app.closeup?.test({ text: 'Teste de lembrete, {name}!' })),
        btn('Aproximação (alarme)', () => app.closeup?.test({ text: 'Teste de alarme, {name}!', alarm: true, sound: 'bell' })),
        btn('Efeito de Afeição', () => app.loveFx?.(Math.max(100, Math.ceil(pet.affection / 100) * 100)), false)),
      h('div.group', {}, 'Testar novidades'),
      h('div.note', {}, `Energia ${Math.round(s.energy)} · Fome ${Math.round(s.hunger)} · Sede ${Math.round(s.thirst ?? 100)} · Humor ${Math.round(s.mood)} · Higiene ${Math.round(s.hygiene ?? 100)} · Esforço ${Math.round(pet.exertion || 0)}`),
      h('div.filters', {},
        btn('Status cheios', () => { pet.exertion = 0; setStats({ ...FULL_STATS, hunger: 100, thirst: 100, mood: 100 }); }, false),
        btn('Cansada e com sede', () => setStats({ energy: 25, hunger: 30, thirst: 20 }), false),
        btn('Exausta (sem forças)', () => setStats({ energy: 10, thirst: 10 }), false),
        btn('Suada (esforço máx.)', () => { pet.exertion = 100; this.render(); }, false),
        btn('Suja', () => setStats({ hygiene: 20 }), false),
        btn('Imunda (mosca)', () => setStats({ hygiene: 8 }), false),
        btn('Dar banho', () => app.care.bath()),
        btn('Procurar jogo na área de trabalho', () => app.desktopGames?.trigger())),
      h('div.note', {}, `Moedas: ${game.coins}`),
      h('div.filters', {}, [100, 1000, 5000].map((n) => btn(`+${n} ¥`, () => { game.coins += n; game.changed(); app.sound.play('ok', { volume: 0.4 }); this.render(); }, false))),
      h('div.note', {}, 'Rotinas autônomas'),
      h('div.filters', {}, ANTIC_NAMES.map(([k, label]) => btn(label, () => app.antics.tryStart(k)))),
      h('div.note', {}, 'Interações (v1.19)'),
      h('div.filters', {}, IX_NAMES.map(([k, label]) => btn(label, () => app.interact?.trigger(k)))),
      h('div.note', {}, doll?.active ? 'Doll' : 'Doll (coloque o Doll na área de trabalho)'),
      doll?.active ? h('div.filters', {},
        !game.gear.cristal ? btn('Dar Crystal Mágico', () => { game.gear.cristal = true; doll.setAwake(true); doll.brain.wake(true); }) : null,
        game.gear.cristal ? btn('Animação de acordar', () => { doll.setAwake(true); doll.brain.wake(true); }) : null,
        alive ? btn('Truque', () => { if (doll.brain.duo) return false; doll.brain.trick(); }) : null,
        ...DUOS.filter((d) => !d.alive || alive).map((d) => btn(d.name, () => doll.brain.startDuo(d.id, true)))) : null,
      this.animRows(),
      this.combatRows(),
      h('div.group', {}, 'Changelog'),
      ...CHANGES.map(([v, items]) => h('div.note', {}, h('b', {}, `v${v}: `),
        items.map((x) => (app.config.lang === 'en' ? x[1] : x[0])).join(' · '))),
    ];
  }

  // Debug: every animation of the model (✨ = generated), with preview and on/off.
  animRows() {
    const { app } = this;
    const list = app.animList?.() || [];
    if (!list.length) return null;
    const open = !!this.animsOpen;
    return [
      h('div.group', {}, `Animações do modelo (${list.length})`),
      h('div.row', {},
        h('button', { onclick: () => { this.animsOpen = !open; this.render(); } }, open ? '▲ Esconder lista' : '▼ Mostrar lista'),
        app.previewing ? h('button', { onclick: () => { app.stopPreview(); this.render(); } }, '⏹ Parar prévia') : null),
      ...(open ? this.animItems(list) : []),
    ];
  }

  animItems(list = this.app.animList?.() || []) {
    const { app } = this;
    return [
      h('div.note', {}, '▶ mostra a animação na Persocon. Desligada = ela não usa mais (cai na "idle"). ✨ = gerada pelo app.'),
      ...list.map(({ name, generated, on }) => h('div.row', {},
        h('span.label', { style: { opacity: on ? '' : '0.5' } }, `${generated ? '✨ ' : ''}${name}`),
        h('button.mini', { onclick: () => { app.previewAnim(name); this.render(); } }, '▶'),
        h(`button.mini${on ? '' : '.danger'}`, { onclick: () => { app.setAnimOn(name, !on); this.render(); } }, on ? 'Ligada' : 'Desligada'))),
    ];
  }

  // Debug: the close-combat clips of the melee system, with the hit frame of each one.
  combatRows() {
    const { app } = this;
    const { pet } = app;
    const list = COMBAT_ANIM_NAMES.filter((n) => pet?.view?.animator?.has(n));
    if (!list.length) return null;
    const btn = (label, fn) => h('button.chip', {
      onclick: () => { this.done(); setTimeout(fn, 80); },
    }, label);
    return [
      h('div.group', {}, `Combate (${list.length})`),
      h('div.note', {}, 'Animações de corpo a corpo. ▶ toca a animação; o frame do golpe (hit) aparece em destaque. "Ligar combate" deixa ela na postura de luta.'),
      h('div.filters', {}, list.map((n) => {
        const meta = COMBAT_META[n];
        const hit = meta?.hitFrameMs != null ? ` · hit ${meta.hitFrameMs}ms` : '';
        return h('button.chip', {
          title: meta?.hitFrameMs != null ? `Duração ${meta.durationMs}ms · golpe em ${meta.hitFrameMs}ms` : `Duração ${meta?.durationMs ?? 0}ms`,
          onclick: () => { this.done(); setTimeout(() => app.previewCombat?.(n), 80); },
        }, `▶ ${n}${hit}`);
      })),
      h('div.filters', {},
        btn(pet.combat ? 'Desligar combate' : 'Ligar combate', () => {
          pet.setCombat(!pet.combat, pet.combatKind || 'melee');
          this.render();
        }),
        btn('▶ Soco (jab → cross → uppercut)', () => app.previewCombat?.('attack_jab')),
      ),
    ];
  }

  monitorRows() {
    const { app } = this;
    const mons = app.monitors();
    if (!mons.length) return null;
    const cur = (app.config.monitors?.[0] ?? app.display() ?? 0);
    return [
      h('div.group', {}, 'Monitor'),
      h('div.row', {}, h('span.label', {}, 'Onde ela aparece'),
        segmented(mons.map(([, , w, hgt, primary], i) => [i, `${i + 1} (${w}×${hgt})${primary ? ' ★' : ''}`]), cur, (i) => {
          app.setMonitors([i]);
          if (app.display() !== i) app.setDisplay?.(i);
          this.render();
        })),
      h('div.note', {}, mons.length < 2
        ? 'Só um monitor detectado. Resoluções baixas (ex.: 800×600) também funcionam.'
        : 'Por enquanto ela fica só em um monitor. Escolha qual; arrastar entre telas está desligado.'),
    ];
  }
}

// ---------------------------------------------------------------- game over

export function showGameOver(app, onRestart, kind) {
  if (kind === 'leave') {
    // The pet left for good: the only way forward is a brand new save.
    const el = h('div.backdrop.dim.gameover', { oncontextmenu: (e) => e.preventDefault() },
      h('div.gameover-box', {},
        h('div.gameover-title', {}, 'GAME OVER'),
        h('p', {}, `${app.config.name || 'Sua Persocon'} arrumou as coisas e foi embora para sempre.`),
        h('button.retry', {
          onclick: () => {
            el.remove();
            app.gameOver = null;
            app.uiChanged();
            onRestart();
          },
        }, 'Tentar denovo . . .')));
    document.body.append(el);
    app.gameOver = el;
    app.uiChanged();
    return;
  }
  const el = h('div.backdrop.dim', { oncontextmenu: (e) => e.preventDefault() },
    h('div.modal.small', {},
      h('div.modal-head', {}, h('span.title', {}, 'Você perdeu sua Persocon')),
      h('div.modal-body.center', {},
        h('div.empty-icon', {}, '🕯'),
        h('p', {}, `${app.config.name || 'Sua Persocon'} ficou sem saúde.`),
        h('p.note', {}, 'Todo o progresso foi perdido. Cuide bem da alimentação: com a Fome abaixo de 50% a Saúde começa a cair.')),
      h('div.modal-foot', {}, h('span.grow'), h('button.primary', {
        onclick: () => {
          el.remove();
          app.gameOver = null;
          app.uiChanged();
          onRestart();
        },
      }, 'Começar de novo'))));
  document.body.append(el);
  app.gameOver = el;
  app.uiChanged();
}

// ---------------------------------------------------------------- extra animation roles

// Animation list on the right, live preview always visible on the left.
export class RolesDialog {
  constructor(app) {
    this.app = app;
  }

  async show() {
    const { app } = this;
    const names = [...app.view.animator.clips.keys()];
    const extras = names.filter(isExtra);
    const roles = { ...(app.config.animRoles || {}) };
    const canvas = h('canvas.stage-canvas');
    const label = h('span.anim-name', {}, '—');
    const list = h('div.roles-list');
    const close = () => {
      cancelAnimationFrame(this.raf);
      this.view?.dispose();
      this.view = null;
      this.el.remove();
      app.dialog = null;
      app.uiChanged();
    };
    const play = (n) => {
      if (!this.view) return;
      label.textContent = n;
      this.view.setPose(PREVIEW_POSES[n] || 'stand');
      this.view.setFacing('front');
      this.view.play(n, { restart: true, fade: 0 });
      this.view.reanchor?.();
      for (const r of list.children) r.classList.toggle('active', r.dataset.name === n);
    };
    const rows = (extras.length ? extras : names).map((n) => {
      const row = h('div.row.role-row', { 'data-name': n, onclick: (e) => e.target.tagName !== 'SELECT' && play(n) },
        h('button.chip', {}, n),
        isExtra(n) || !extras.length ? roleSelect(roles[n], (v) => {
          roles[n] = v;
          app.pet.setRoles(roles);
          app.setOption('animRoles', roles);
          play(n);
        }) : null);
      return row;
    });
    list.append(...rows);
    this.el = h('div.backdrop.dim', { oncontextmenu: (e) => e.preventDefault() },
      h('div.modal.roles-modal', {},
        h('div.modal-head', {}, h('span.title', {}, 'Animações extras'), h('button.close', { onclick: close }, '✕')),
        h('div.modal-body', {},
          h('div.roles-layout', {},
            h('div.stage.sticky', {}, canvas, label),
            h('div', {}, h('div.note', {}, 'Clique numa animação para ver ao lado e escolha para que serve.'), list))),
        h('div.modal-foot', {}, h('span.grow'), h('button.primary', { onclick: close }, 'Pronto'))));
    wireSounds(this.el, app.sound);
    document.body.append(this.el);
    app.dialog = this.el;
    app.uiChanged();
    const Ctor = app.files.vrm ? (await import('./vrmview.js')).VrmView : PetView;
    this.view = await Ctor.create(app.files, 150, canvas);
    play(extras[0] || 'idle');
    let last = performance.now();
    const loop = (now) => {
      if (!this.view) return;
      this.view.update(Math.min(0.05, (now - last) / 1000));
      last = now;
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }
}

// ---------------------------------------------------------------- import dialog

const PREVIEW_POSES = { sleep: 'lie', climb: 'climb', climbing: 'climb', sit: 'sit' };
const REQUIRED = ['idle', 'walk', 'run', 'climb', 'climbing', 'sit', 'sleep', 'jump'];
const KIND_LABELS = { folder: 'Pasta', zip: 'Arquivo .zip' };

export class ImportDialog {
  constructor(app) {
    this.app = app;
    this.el = null;
    this.view = null;
  }

  get open() {
    return !!this.el;
  }

  show() {
    this.close();
    this.target = 'pet';
    this.el = h('div.backdrop.dim', { oncontextmenu: (e) => e.preventDefault() });
    this.modal = h('div.modal');
    wireSounds(this.modal, this.app.sound);
    this.el.append(this.modal);
    document.body.append(this.el);
    this.app.uiChanged();
    this.app.focus();
    this.stepPick();
    window.addEventListener('keydown', (this.onKey = (e) => e.key === 'Escape' && !this.busy && this.close()));
  }

  close() {
    if (!this.el) return;
    this.disposeView();
    window.removeEventListener('keydown', this.onKey);
    this.el.remove();
    this.el = null;
    this.app.uiChanged();
  }

  disposeView() {
    cancelAnimationFrame(this.raf);
    this.view?.dispose();
    this.view = null;
  }

  frame(title, body, footer) {
    this.modal.replaceChildren(
      h('div.modal-head', {}, h('span.title', {}, title), h('button.close', { onclick: () => !this.busy && this.close() }, '✕')),
      h('div.modal-body', {}, body),
      footer && h('div.modal-foot', {}, footer),
    );
  }

  stepPick(error) {
    this.disposeView();
    this.target = 'pet';
    const pick = async (folder) => {
      const path = await window.petAPI.pickModelSource(folder);
      if (path) this.inspect(path);
    };
    const pickYsm = async (folder) => {
      const path = await window.petAPI.pickModelSource(folder);
      if (path) this.inspect(path);
    };
    const pickSkin = async () => {
      const path = await window.petAPI.pickFile('Skin de blocos', 'Skin PNG', ['png']);
      if (path) this.stepSkin(await window.petAPI.readFileData(path), path.split(/[\\/]/).pop().replace(/\.png$/i, ''));
    };
    this.frame('Importar modelo', h('div.pick', {},
      h('div.grid.two-cols', {},
        h('button.tile.big', { onclick: () => pickYsm(true) }, h('span.icon', {}, '📁'), h('span.label', {}, 'Pasta do modelo YSM'),
          h('span.hint', {}, 'Pasta exportada com main.json, animações e textura')),
        h('button.tile.big', { onclick: () => pickYsm(false) }, h('span.icon', {}, '🗜'), h('span.label', {}, 'Arquivo .zip do modelo YSM'),
          h('span.hint', {}, '.zip da pasta exportada')),
        h('button.tile.big', { onclick: () => pick(false) }, h('span.icon', {}, '🧊'), h('span.label', {}, 'Modelo 3D (.vrm / .glb)'),
          h('span.hint', {}, 'VRoid/VRM com expressões ou qualquer .glb')),
        h('button.tile.big', { onclick: pickSkin }, h('span.icon', {}, '🟫'), h('span.label', {}, 'Skin de blocos (.png)'),
          h('span.hint', {}, 'Vira um modelo de blocos com animações')),
      ),
      error && h('div.error', {}, error),
      this.recentModels(),
      h('p.note', {}, 'Modelos YSM: importe a pasta exportada (ou um .zip da pasta). Arquivos .ysm não são aceitos. O Doll continua só com skin Minecraft (botão direito nele).'),
    ), [h('button', { onclick: () => this.close() }, 'Cancelar')]);
  }

  // The import writes the model's name into config.name; put the player's name for the pet back.
  async afterImport(modelName, extra = () => ({})) {
    const cfg = await window.petAPI.getConfig();
    const recentModels = [{ dir: cfg.modelDir, name: modelName, at: Date.now() }, ...(cfg.recentModels || []).filter((r) => r.dir !== cfg.modelDir)].slice(0, 12);
    await window.petAPI.saveConfig({ ...extra(cfg), name: this.app.config.name, recentModels }).catch(() => {});
    await this.app.reloadForModel();
  }

  // Models used/imported before: the most recent first, then the other installed ones. Click to switch.
  recentModels() {
    const cfg = this.app.config;
    const current = cfg.modelDir || DEFAULT_MODEL_DIR;
    const box = h('div.recent-models');
    const wrap = h('div.field-block', {}, h('span.label', {}, 'Modelos recentes'), box);
    const KIND = { mc: ['🟫', 'Skin de blocos'], vrm: ['🧊', 'Modelo 3D'], ysm: ['📦', 'Modelo YSM'] };
    const face = (skin) => {
      const c = h('canvas.recent-face', { width: 8, height: 8 });
      const img = new Image();
      img.onload = () => {
        const g = c.getContext('2d');
        g.drawImage(img, 8, 8, 8, 8, 0, 0, 8, 8);
        g.drawImage(img, 40, 8, 8, 8, 0, 0, 8, 8);
      };
      img.src = skin;
      return c;
    };
    (async () => {
      const installed = (await window.petAPI.listModels?.().catch(() => null)) || null;
      const byDir = new Map((installed || []).map((m) => [m.dir, m]));
      const seen = new Set();
      const list = [];
      for (const r of cfg.recentModels || []) {
        if (seen.has(r.dir) || (installed && !byDir.has(r.dir))) continue;
        seen.add(r.dir);
        list.push({ ...byDir.get(r.dir), ...r, name: r.name || byDir.get(r.dir)?.name || r.dir });
      }
      for (const m of [...(installed || [])].sort((a, b) => b.modified - a.modified)) if (!seen.has(m.dir)) list.push(m);
      for (const [dir, name] of [[AGHATA_MODEL_DIR, 'Aghata'], [DEFAULT_MODEL_DIR, 'Ninna']]) {
        const i = list.findIndex((m) => m.dir === dir);
        list.unshift({ ...(i >= 0 ? list.splice(i, 1)[0] : { dir, kind: 'ysm' }), name, removable: false });
      }
      box.replaceChildren(...list.slice(0, 12).map((m) => {
        const [icon, label] = KIND[m.kind] || ['▦', 'Modelo'];
        const using = m.dir === current;
        const card = h(`button.recent-model${using ? '.active' : ''}`, {
          title: m.dir,
          disabled: using,
          onclick: async () => {
            if (this.busy) return;
            this.busy = true;
            await window.petAPI.saveConfig({ modelDir: m.dir });
            await this.app.reloadForModel();
          },
        }, m.skin ? face(m.skin) : h('span.recent-icon', {}, icon), h('span.recent-name', {}, m.name), h('span.hint', {}, using ? 'em uso' : label));
        if (using || !m.removable) return card;
        const del = h('button.recent-del', {
          title: 'Apagar modelo',
          onclick: async (e) => {
            e.stopPropagation();
            if (!del.classList.contains('confirm')) {
              del.classList.add('confirm');
              del.textContent = 'Apagar?';
              return;
            }
            try {
              await window.petAPI.deleteModel(m.dir);
            } catch {
              this.app.sound?.play('cancel', { volume: 0.5 });
              return;
            }
            this.app.setOption('recentModels', (this.app.config.recentModels || []).filter((r) => r.dir !== m.dir));
            this.app.sound?.play('ok', { volume: 0.5 });
            slot.remove();
            if (!box.childElementCount) wrap.remove();
          },
        }, '✕');
        const slot = h('div.recent-slot', {}, card, del);
        return slot;
      }));
    })();
    return wrap;
  }

  // block skin: preview as the pet (block model + animations) or apply to the Doll.
  async stepSkin(skin, baseName) {
    const app = this.app;
    const img = await new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = skin; });
    if (!img || img.width !== 64 || (img.height !== 64 && img.height !== 32)) return this.stepPick('A skin precisa ter 64×64 ou 64×32 pixels.');
    const probe = document.createElement('canvas');
    probe.width = 64;
    probe.height = img.height;
    probe.getContext('2d').drawImage(img, 0, 0);
    const state = { name: baseName || 'Skin', slim: img.height === 64 && probe.getContext('2d').getImageData(54, 20, 1, 1).data[3] === 0, size: app.config.petHeight };
    if (this.target === 'doll') {
      app.doll?.setSkin(skin);
      app.skins?.setObject('pelucia', null);
      this.close();
      return;
    }
    const { mcModel } = await import('./mcmodel.js');
    let canvas = h('canvas.stage-canvas');
    const stage = h('div.stage', {}, canvas);
    const anims = ['idle', 'walk', 'run', 'sit', 'sleep', 'jump', 'extra_aceno', 'extra_danca'];
    let anim = 'idle';
    const build = async () => {
      this.disposeView();
      const fresh = h('canvas.stage-canvas');
      canvas.replaceWith(fresh);
      canvas = fresh;
      const files = await mcModel(skin, state.slim);
      this.view = await PetView.create(files, 130, canvas);
      this.view.setFacing('front');
      this.view.play(anim, { restart: true, fade: 0 });
      this.view.reanchor();
      let last = performance.now();
      const loop = (now) => {
        if (!this.view) return;
        this.view.update(Math.min(0.05, (now - last) / 1000));
        last = now;
        this.raf = requestAnimationFrame(loop);
      };
      this.raf = requestAnimationFrame(loop);
    };
    const nameInput = h('input.text', { value: state.name, maxlength: 24, oninput: () => (state.name = nameInput.value) });
    const errorBox = h('div.error', { style: { display: 'none' } });
    const importBtn = h('button.primary', {
      onclick: async () => {
        this.busy = true;
        importBtn.disabled = true;
        try {
          await window.petAPI.importMcSkin({ name: state.name.trim() || 'Skin', skin, slim: state.slim, petHeight: state.size });
          await this.afterImport(state.name.trim() || 'Skin');
        } catch (e) {
          this.busy = false;
          importBtn.disabled = false;
          errorBox.textContent = String(e);
          errorBox.style.display = 'block';
        }
      },
    }, 'Importar');
    this.frame('Skin de blocos', [h('div.import.three', {},
      h('div.left.sticky', {}, stage),
      h('div.mid', {}, h('div.field-block', {}, h('span.label', {}, 'Animações'),
        h('div.chips', {}, anims.map((n) => h('button.chip', { onclick: () => { anim = n; this.view?.play(n, { restart: true, fade: 0 }); this.view?.reanchor(); } }, n))))),
      h('div.right', {},
        h('label.row.field', {}, h('span.label', {}, 'Nome'), nameInput),
        toggle({ label: 'Braços finos', value: state.slim, onchange: (v) => { state.slim = v; build(); } }),
        slider({ label: 'Tamanho', min: 50, max: 300, step: 5, value: state.size, format: (v) => `${v}px`, oninput: (v) => (state.size = v) }),
        h('img.skin-flat', { src: skin, draggable: false }))), errorBox],
    [h('button', { onclick: () => this.stepPick() }, 'Voltar'), h('span.grow'), h('button', { onclick: () => this.close() }, 'Cancelar'), importBtn]);
    await build();
  }

  // 3D model for the Doll: rendered to an image at the chosen rotation.
  async pick3dDoll() {
    const path = await window.petAPI.pickFile('Modelo 3D', 'Modelo 3D', ['glb', 'vrm', 'gltf']);
    if (!path) return;
    try {
      const data = await readModel(path);
      this.close();
      this.app.openObjects('pelucia', { kind: '3d', data });
    } catch (e) {
      if (this.el) this.stepPick(String(e?.message || e));
    }
  }

  async inspect(path) {
    this.frame('Importar modelo YSM', h('div.loading', {}, h('div.spinner'), 'Lendo modelo…'));
    try {
      const { info, model } = await window.petAPI.inspectModel(path);
      if (!this.el) return;
      await this.stepPreview(path, info, model);
    } catch (e) {
      if (this.el) this.stepPick(String(e));
    }
  }

  async stepPreview(path, info, model) {
    const app = this.app;
    const isVrm = info.kind === 'vrm';
    const Vrm = isVrm ? (await import('./vrmview.js')).VrmView : null;
    const allNames = isVrm ? Vrm.CLIPS : info.animationFiles.flatMap((f) => f.names);
    const state = { name: info.name, texture: mainTexture(info.textures)?.name, size: app.config.petHeight, anim: allNames.includes('idle') ? 'idle' : allNames[0], facing: 'front' };

    let canvas = h('canvas.stage-canvas');
    const animLabel = h('span.anim-name', {}, state.anim || '—');
    const stage = h('div.stage', {}, canvas, animLabel);
    const hidden = new Set();
    const parts = h('div.chips');

    const chips = h('div.chips', {}, allNames.map((n) => h(`button.chip${REQUIRED.includes(n) ? '.core' : ''}`, { 'data-name': n, onclick: () => play(n) }, n)));
    // Extra animations: the user says what each one is for.
    const roles = {};
    const extras = allNames.filter(isExtra);
    const rolesBox = extras.length && h('div.field-block', {}, h('span.label', {}, 'Para que serve cada animação extra?'),
      h('div.roles', {}, extras.map((n) => h('label.row', {},
        h('button.chip', { onclick: () => play(n) }, n),
        roleSelect('', (v) => (roles[n] = v))))));

    const play = (name) => {
      if (!this.view || !name) return;
      state.anim = name;
      animLabel.textContent = name;
      const pose = PREVIEW_POSES[name] || 'stand';
      const facing = pose === 'lie' && state.facing === 'front' ? 'right' : state.facing;
      this.view.setPose(pose);
      this.view.setFacing(facing);
      this.view.play(name, { restart: true, fade: 0 });
      this.view.reanchor();
      for (const c of chips.children) c.classList.toggle('active', c.dataset.name === name);
    };

    const buildView = async () => {
      this.disposeView();
      // A disposed view loses its WebGL context, so every rebuild gets a fresh canvas.
      const fresh = h('canvas.stage-canvas');
      canvas.replaceWith(fresh);
      canvas = fresh;
      const tex = info.textures.find((t) => t.name === state.texture) || info.textures[0];
      this.view = isVrm ? await Vrm.create(model, 130, canvas) : await PetView.create({ ...model, texture: tex.data }, 130, canvas);
      this.view.setHidden?.([...hidden]);
      parts.replaceChildren(...(this.view.partNames?.() || []).map((n) => h(`button.chip${hidden.has(n) ? '' : '.active'}`, {
        title: 'Clique para remover/mostrar',
        onclick: (e) => {
          hidden.has(n) ? hidden.delete(n) : hidden.add(n);
          e.currentTarget.classList.toggle('active', !hidden.has(n));
          this.view?.setHidden?.([...hidden]);
        },
      }, n)));
      play(state.anim);
      let last = performance.now();
      const loop = (now) => {
        if (!this.view) return;
        this.view.update(Math.min(0.05, (now - last) / 1000));
        last = now;
        this.raf = requestAnimationFrame(loop);
      };
      this.raf = requestAnimationFrame(loop);
    };

    const facingBtns = segmented([['front', 'Frente'], ['right', 'Direita'], ['left', 'Esquerda'], ['back', 'Costas']], state.facing, (id) => {
      state.facing = id;
      play(state.anim);
    });

    const nameInput = h('input.text', { value: state.name, maxlength: 24, oninput: () => (state.name = nameInput.value) });
    const textures = h('div.textures', {}, info.textures.map((t) =>
      h(`button.texture${t.name === state.texture ? '.active' : ''}`, {
        title: `${t.name} (${t.width}×${t.height})`,
        onclick: async (e) => {
          state.texture = t.name;
          for (const b of textures.children) b.classList.toggle('active', b === e.currentTarget);
          await buildView();
        },
      }, h('img', { src: t.data, draggable: false }), h('span', {}, t.name))));

    const missing = REQUIRED.filter((n) => !allNames.includes(n));
    const [tw, th] = info.textureUnits || [];
    const facts = isVrm ? [
      ['Origem', 'VRoid / VRM'],
      ['Versão VRM', info.version || '—'],
      ['Tamanho', `${(info.bytes / 1048576).toFixed(1)} MB`],
      ['Expressões', info.expressions?.length ? info.expressions.join(', ') : 'padrão'],
      ['Animações', `${allNames.length} procedurais (geradas para a Persocon)`],
      info.authors?.length && ['Autores', info.authors.join(', ')],
      ['Compatível', 'todas as animações da Persocon ✓'],
    ].filter(Boolean) : [
      ['Origem', `${KIND_LABELS[info.kind] || info.kind}`],
      ['Geometria', `${info.geometryFile}${tw ? ` · UV ${tw}×${th}` : ''}`],
      ['Ossos', info.bones],
      ['Cubos', info.cubes],
      ['Animações', `${info.animationCount} em ${info.animationFiles.length} arquivo(s)`],
      ...info.animationFiles.map((f) => [`  ${f.file}`, `${f.names.length}`]),
      ['Texturas', info.textures.length],
      info.authors.length && ['Autores', info.authors.join(', ')],
      ['Compatível', missing.length ? `faltam: ${missing.join(', ')}` : 'todas as animações da Persocon ✓'],
    ].filter(Boolean);

    const body = h('div.import.three', {},
      h('div.left.sticky', {}, stage, facingBtns),
      h('div.mid', {},
        h('div.field-block', {}, h('span.label', {}, `Animações (${allNames.length}) — clique para ver ao lado`), chips),
        rolesBox,
        h('div.field-block', {}, h('span.label', {}, 'Acessórios / partes — desmarque para remover'), parts)),
      h('div.right', {},
        h('label.row.field', {}, h('span.label', {}, 'Nome'), nameInput),
        slider({ label: 'Tamanho', min: 50, max: 300, step: 5, value: state.size, format: (v) => `${v}px`, oninput: (v) => (state.size = v) }),
        info.textures.length > 1 && h('div.field-block', {}, h('span.label', {}, 'Textura'), textures),
        h('dl.facts', {}, facts.flatMap(([k, v]) => [h('dt', {}, k), h(`dd${k === 'Compatível' && missing.length ? '.warn' : ''}`, {}, String(v))])),
      ),
    );

    const errorBox = h('div.error', { style: { display: 'none' } });
    const importBtn = h('button.primary', {
      onclick: async () => {
        this.busy = true;
        importBtn.disabled = true;
        importBtn.textContent = 'Importando…';
        try {
          await window.petAPI.importModel({ path, name: state.name.trim() || info.name, texture: state.texture, petHeight: state.size });
          await this.afterImport(state.name.trim() || info.name, (cfg) => ({ animRoles: roles, hiddenParts: { ...(cfg.hiddenParts || {}), [cfg.modelDir]: [...hidden] } }));
        } catch (e) {
          this.busy = false;
          importBtn.disabled = false;
          importBtn.textContent = 'Importar';
          errorBox.textContent = String(e);
          errorBox.style.display = 'block';
        }
      },
    }, 'Importar');

    this.frame(`Importar: ${info.name}`, [body, errorBox], [
      h('button', { onclick: () => this.stepPick() }, 'Voltar'),
      h('span.grow'),
      h('button', { onclick: () => this.close() }, 'Cancelar'),
      importBtn,
    ]);
    await buildView();
  }
}

// ---------------------------------------------------------------- objects & resourcepack

class Dialog {
  constructor(app) {
    this.app = app;
    this.el = null;
  }

  open(title) {
    this.app.dialog?.close?.();
    this.el = h('div.backdrop.dim', { oncontextmenu: (e) => e.preventDefault() });
    this.modal = h('div.modal.wide');
    wireSounds(this.modal, this.app.sound);
    this.el.append(this.modal);
    document.body.append(this.el);
    this.app.dialog = this;
    this.title = title;
    this.app.uiChanged();
    this.app.focus();
    window.addEventListener('keydown', (this.onKey = (e) => e.key === 'Escape' && !this.busy && this.close()));
  }

  frame(body, footer) {
    this.modal.replaceChildren(
      h('div.modal-head', {}, h('span.title', {}, this.title), h('button.close', { onclick: () => !this.busy && this.close() }, '✕')),
      h('div.modal-body', {}, body),
      footer && h('div.modal-foot', {}, footer),
    );
  }

  close() {
    if (!this.el) return;
    window.removeEventListener('keydown', this.onKey);
    this.el.remove();
    this.el = null;
    if (this.app.dialog === this) this.app.dialog = null;
    this.app.uiChanged();
  }
}

const OBJ_EXTRA = [['bag', 'Bolsa de cartuchos', 'bag'], ['food', 'Inventário', 'backpack']];

// '#rrggbb' (ou #rgb) em [r, g, b].
function hexToRgb(hex) {
  const h = String(hex || '').replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16) || 0;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// Assa os quadros: rotação, espelhamento e a cor que vira transparente.
// (O tamanho NÃO é assado: ele é aplicado na hora de desenhar o objeto, para
//  o tamanho escolhido valer no objeto de verdade, na área de trabalho.)
export async function bake(frames, rot, flip, transparent = null) {
  const key = transparent?.on ? transparent.color : null;
  const tol = transparent?.tolerance ?? 48;
  if (!rot && !flip && !key) return frames;
  const out = [];
  for (const src of frames) {
    const img = await new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.src = src; });
    const iw = img.naturalWidth || img.width || 1;
    const ih = img.naturalHeight || img.height || 1;
    const side = rot % 180 !== 0;
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(side ? ih : iw));
    c.height = Math.max(1, Math.round(side ? iw : ih));
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.translate(c.width / 2, c.height / 2);
    g.rotate((rot * Math.PI) / 180);
    if (flip) g.scale(-1, 1);
    g.drawImage(img, -iw / 2, -ih / 2);
    // A cor escolhida fica transparente (com a tolerância ao redor).
    if (key) {
      const [tr, tg, tb] = hexToRgb(key);
      const d = g.getImageData(0, 0, c.width, c.height);
      const px = d.data;
      for (let i = 0; i < px.length; i += 4) {
        if (px[i + 3] < 8) continue;
        if (Math.abs(px[i] - tr) <= tol && Math.abs(px[i + 1] - tg) <= tol && Math.abs(px[i + 2] - tb) <= tol) px[i + 3] = 0;
      }
      g.putImageData(d, 0, 0);
    }
    out.push(c.toDataURL('image/png'));
  }
  return out;
}

export class ObjectsDialog extends Dialog {
  // Fechar (ou o X) sem aplicar: o objeto volta exatamente como estava ao abrir o modal.
  close() {
    this.revert();
    super.close();
  }

  // Guarda a aparência salva do objeto no momento em que o modal (ou a seleção) muda.
  captureSnapshot() {
    const id = this.sel;
    this.snapshot = { id, cfg: this.app.skins.objects[id] ? JSON.parse(JSON.stringify(this.app.skins.objects[id])) : null };
  }

  // Descarta a edição ao vivo e devolve a aparência salva no desktop.
  revert() {
    const s = this.snapshot;
    this.snapshot = null;
    this.app.toys.livePreview = null;
    if (s) {
      if (s.cfg) this.app.skins.objects[s.id] = JSON.parse(JSON.stringify(s.cfg));
      else delete this.app.skins.objects[s.id];
    }
    this.draft = null;
    this.baked = null;
    this.bakeKey = '';
    this.hitboxDraft = null;
    this.liveRatio = null;
    this.liveSeq = 0;
    this.ratioKey = '';
  }

  async show(focus, preset) {
    this.open('Visual dos objetos');
    this.list = [
      ...ITEMS.filter((i) => i.toy || i.cat === 'mobilia' || i.cat === 'fun').filter((i) => i.cat !== 'cartuchos').map((i) => [i.id, i.name, i.img, i]),
      ...OBJ_EXTRA.map(([id, name, pix]) => [id, name, icon(pix), null]),
    ];
    this.sel = focus || this.list[0][0];
    this.draft = null;
    this.snapshot = null;
    this.liveRatio = null;
    this.liveSeq = 0;
    this.ratioKey = '';
    this.captureSnapshot();
    if (preset?.kind === '3d') await this.load3d(preset.data, preset.rot);
    else this.render();
  }

  current(id) {
    const row = this.list.find((r) => r[0] === id);
    const base = row?.[2] || (id === 'pelucia' ? this.app.doll?.snapshot() : null) || this.app.toys?.furn?.art(id);
    return this.app.skins?.art(id, base) || base;
  }

  async pickImage() {
    const path = await window.petAPI.pickFile('Imagem do objeto', 'Imagem', ['png', 'gif', 'webp', 'apng']);
    if (!path) return;
    const data = await window.petAPI.readFileData(path);
    const { decodeAnimated } = await import('./skins.js');
    const anim = /\.(gif|webp|apng)$/i.test(path) ? await decodeAnimated(data).catch(() => null) : null;
    const old = this.app.skins.objects[this.sel] || {};
    this.draft = { kind: anim && anim.frames.length > 1 ? 'gif' : 'img', src: anim?.frames || [data], delays: anim?.delays || [100], rot: 0, flip: false, speed: 1, scale: old.scale || 1, transparent: { color: '#ff00ff', on: false, tolerance: 48 } };
    this.baked = null;
    this.bakeKey = '';
    this.render();
    this.refreshBake();
  }

  async pick3d() {
    const path = await window.petAPI.pickFile('Modelo 3D do objeto', 'Modelo 3D', ['glb', 'gltf', 'vrm']);
    if (!path) return;
    try {
      await this.load3d(await readModel(path));
    } catch (e) {
      this.draft = null;
      this.error = `Não foi possível abrir o modelo: ${e?.message || e}`;
      this.render();
    }
  }

  async load3d(data, rot = 30) {
    this.draft = { kind: '3d', model: data, rot, tilt: 10, spin: false, speed: 1 };
    await this.render3d();
  }

  async render3d() {
    const d = this.draft;
    this.frame(h('div.loading', {}, h('div.spinner'), 'Renderizando modelo 3D…'));
    try {
      const { render3d } = await import('./skins.js');
      const r = await render3d(d.model, { rot: d.rot, tilt: d.tilt, spin: d.spin });
      d.src = r.frames;
      d.delays = r.delays;
    } catch (e) {
      this.draft = null;
      this.error = `Não foi possível abrir o modelo: ${e?.message || e}`;
    }
    this.render();
  }

  async save() {
    const d = this.draft;
    const id = this.sel;
    const old = this.app.skins.objects[id] || {};
    const region = this.region || old.region;
    if (!d) {
      if (region) { await this.app.skins.setObject(id, { ...old, region }); this.snapshot = null; }
      return this.close();
    }
    // A prévia usa os quadros assados (rotação + transparência); o tamanho é o do objeto real.
    const frames = d.kind === '3d' ? d.src
      : (this.baked?.frames?.length ? this.baked.frames : await bake(d.src, d.rot, d.flip, d.transparent));
    const first = await new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.src = frames[0]; });
    const hitbox = d.hitbox || old.hitbox || null;
    this.snapshot = null; // aplicado: o objeto na área de trabalho já é o salvo
    await this.app.skins.setObject(id, { kind: d.kind, frames, delays: d.delays, speed: d.speed || 1, ratio: first.height / first.width, region, hitbox, scale: d.scale || 1 });
    if (id === 'pelucia') this.app.doll && (this.app.doll.snap = null);
    this.draft = null;
    this.baked = null;
    this.bakeKey = '';
    this.hitboxDraft = null;
    this.render();
    this.syncLive();
  }

  // Atualiza só a prévia (sem redesenhar o diálogo inteiro).
  updatePreview() {
    const d = this.draft;
    if (!d) return;
    // A prévia mostra o arquivo de verdade, já modificado: reassa e redesenha.
    this.refreshBake();
  }

  // Reassa o rascunho (rotação, transparência) para a prévia mostrar o resultado real.
  refreshBake() {
    const d = this.draft;
    if (!d || d.kind === '3d') { this.baked = null; this.syncLive(); return; }
    const t = d.transparent || {};
    const key = `${d.rot}|${d.flip}|${t.color}|${t.on}|${t.tolerance}|${d.src.length}`;
    if (this.bakeKey === key) { this.syncLive(); return; }
    this.bakeKey = key;
    this.syncLive();
    clearTimeout(this.bakeT);
    this.bakeT = setTimeout(async () => {
      try {
        const frames = await bake(d.src, d.rot, d.flip, d.transparent);
        if (this.draft !== d) return;
        this.baked = { frames, delays: d.delays };
        this.render();
      } catch { /* a prévia fica com a imagem original */ }
    }, 140);
  }

  // O objeto de verdade na área de trabalho acompanha tudo enquanto o diálogo está aberto
  // (imagem/GIF/3D, tamanho, rotação, espelho, velocidade e a transparência assada).
  syncLive() {
    const d = this.draft;
    const toys = this.app.toys;
    if (!d) { toys.livePreview = null; this.liveRatio = null; this.liveSeq = 0; return; }
    const baked = this.baked?.frames?.length ? this.baked.frames : null;
    const frames = d.kind === '3d' ? (d.src || null) : (baked || d.src || null);
    const first = frames?.[0];
    // A proporção vem do quadro final (o que vale no desktop); recarrega só quando os quadros mudam.
    const ratioKey = first ? `${frames.length}|${first.length}|${this.bakeKey || d.src?.length || 0}` : 'none';
    if (first && ratioKey !== this.ratioKey) {
      this.ratioKey = ratioKey;
      this.liveRatio = null;
      const seq = ++this.liveSeq;
      const img = new Image();
      img.onload = () => { if (this.liveSeq === seq) { this.liveRatio = (img.naturalHeight / img.naturalWidth) || 1; this.pushLive(); } };
      img.src = first;
    }
    this.pushLive();
  }

  // Empurra o rascunho para o objeto real na área de trabalho (uma vez só, com o que já se sabe).
  pushLive() {
    const d = this.draft;
    const toys = this.app.toys;
    if (!d) { toys.livePreview = null; return; }
    const baked = this.baked?.frames?.length ? this.baked.frames : null;
    const frames = d.kind === '3d' ? (d.src || null) : (baked || d.src || null);
    toys.livePreview = {
      id: this.sel,
      scale: d.scale || 1,
      rot: 0, // a rotação e o espelho do rascunho já vão ASSADOS nos quadros (bake) — o transform não reaplica
      flip: false,
      speed: d.speed || 1,
      frames: frames || null,
      delays: d.delays || [100],
      ratio: this.liveRatio || null,
    };
  }

  // Clicar na prévia: a cor do pixel vira a cor de transparência.
  pickColor(e, d) {
    const img = this.previewImg;
    if (!img?.naturalWidth) return;
    const c = document.createElement('canvas');
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0);
    // A prévia fica fixa (100%): o clique cai direto no pixel do arquivo já modificado.
    const r = img.getBoundingClientRect();
    const fx = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    const fy = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    const x = Math.round(fx * c.width);
    const y = Math.round(fy * c.height);
    if (x < 0 || y < 0 || x >= c.width || y >= c.height) return;
    const p = g.getImageData(x, y, 1, 1).data;
    const hex = `#${[p[0], p[1], p[2]].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
    const t = d.transparent || (d.transparent = { color: hex, on: true, tolerance: 48 });
    t.color = hex;
    t.on = true;
    this.render();
    this.refreshBake();
  }

  // A cor de transparência: qual cor some da imagem importada.
  colorControl(d) {
    const t = d.transparent || (d.transparent = { color: '#ff00ff', on: false, tolerance: 48 });
    const input = h('input', { type: 'color', value: t.color, oninput: (e) => { t.color = e.target.value; this.refreshBake(); } });
    return h('div.obj-color', {},
      h('div.row', {}, h('span.label', {}, 'Cor de transparência'), input,
        h('label.row.toggle', {}, h('span.label', {}, 'Remover'),
          h('input', { type: 'checkbox', checked: !!t.on, onchange: (e) => { t.on = e.target.checked; this.refreshBake(); } }), h('span.switch'))),
      slider({ label: 'Tolerância', min: 0, max: 120, step: 4, value: t.tolerance ?? 48, format: (v) => `${v}`, oninput: (v) => { t.tolerance = v; this.refreshBake(); } }),
      h('small.muted', {}, 'Clique na prévia para pegar a cor de um pixel.'));
  }

  render() {
    const app = this.app;
    const id = this.sel;
    const d = this.draft;
    const list = h('div.obj-list', {}, this.list.map(([oid, name]) => h(`button.obj${oid === id ? '.active' : ''}`, {
      onclick: () => { this.sel = oid; this.draft = null; this.region = null; this.error = null; this.baked = null; this.bakeKey = ''; this.hitboxDraft = null; this.liveRatio = null; this.liveSeq = 0; this.ratioKey = ''; this.captureSnapshot(); this.render(); this.syncLive(); },
    }, h('img', { src: this.current(oid) || '', draggable: false }), h('span', {}, name), app.skins?.objects[oid]?.frames ? h('b', {}, '★') : null)));
    // A prévia fica fixa (100%): é a referência estática para o conta-gotas de transparência e o hitbox.
    // O tamanho em edição aparece no objeto de verdade, na área de trabalho.
    const baked = this.baked?.frames?.length ? this.baked.frames : null;
    const srcFrames = baked || (d ? d.src : null);
    const shown = srcFrames ? srcFrames[0] : this.current(id);
    const previewW = 200;
    const img = h('img.obj-preview', { src: shown || '', draggable: false, style: { width: `${previewW}px` } });
    this.previewImg = img;
    // Clicar na prévia: pega a cor do pixel (é a cor que vira transparente).
    if (d && d.kind !== '3d' && !this.hitMode) {
      img.addEventListener('click', (e) => this.pickColor(e, d));
      img.style.cursor = 'crosshair';
    }
    if (srcFrames && srcFrames.length > 1) {
      let i = 0;
      const tick = () => {
        if (!img.isConnected) return;
        i = (i + 1) % srcFrames.length;
        img.src = srcFrames[i];
        setTimeout(tick, (d?.delays?.[i] || 100) / (d?.speed || 1));
      };
      setTimeout(tick, 100);
    }
    const stage = h('div.obj-stage', {}, img);
    // A caixa do hitbox: a parte da imagem que realmente responde ao clique.
    const hb = this.hitboxDraft || (d && d.hitbox) || app.skins.hitbox?.(id);
    const hbBox = hb ? h('div.obj-hitbox', { style: { left: `${hb.x * 100}%`, top: `${hb.y * 100}%`, width: `${hb.w * 100}%`, height: `${hb.h * 100}%` } }) : null;
    if (hbBox) stage.append(hbBox);
    if (d && this.hitMode) {
      img.style.cursor = 'crosshair';
      stage.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        const r = img.getBoundingClientRect();
        const fx = (v) => Math.min(1, Math.max(0, (v - r.left) / r.width));
        const fy = (v) => Math.min(1, Math.max(0, (v - r.top) / r.height));
        const x0 = fx(e.clientX);
        const y0 = fy(e.clientY);
        stage.setPointerCapture(e.pointerId);
        const move = (ev) => {
          const x1 = fx(ev.clientX);
          const y1 = fy(ev.clientY);
          this.hitboxDraft = {
            x: Math.min(x0, x1), y: Math.min(y0, y1),
            w: Math.max(0.05, Math.abs(x1 - x0)), h: Math.max(0.05, Math.abs(y1 - y0)),
          };
          Object.assign(hbBox?.style || {}, {
            left: `${this.hitboxDraft.x * 100}%`, top: `${this.hitboxDraft.y * 100}%`,
            width: `${this.hitboxDraft.w * 100}%`, height: `${this.hitboxDraft.h * 100}%`,
          });
        };
        const up = () => {
          stage.removeEventListener('pointermove', move);
          stage.removeEventListener('pointerup', up);
          this.hitMode = false;
          if (this.hitboxDraft) d.hitbox = this.hitboxDraft;
          this.render();
        };
        stage.addEventListener('pointermove', move);
        stage.addEventListener('pointerup', up);
      });
    }
    if (id === 'videogame') {
      const reg = this.region || app.skins.region(id) || { x: 0.1, y: 0.2, w: 0.8, h: 0.5 };
      const box = h('div.obj-region', { style: { left: `${reg.x * 100}%`, top: `${reg.y * 100}%`, width: `${reg.w * 100}%`, height: `${reg.h * 100}%` } });
      stage.append(box);
      stage.addEventListener('pointerdown', (e) => {
        const r = img.getBoundingClientRect();
        const fx = (v) => Math.min(1, Math.max(0, (v - r.left) / r.width));
        const fy = (v) => Math.min(1, Math.max(0, (v - r.top) / r.height));
        const x0 = fx(e.clientX);
        const y0 = fy(e.clientY);
        stage.setPointerCapture(e.pointerId);
        const move = (ev) => {
          const x1 = fx(ev.clientX);
          const y1 = fy(ev.clientY);
          this.region = { x: Math.min(x0, x1), y: Math.min(y0, y1), w: Math.max(0.05, Math.abs(x1 - x0)), h: Math.max(0.05, Math.abs(y1 - y0)) };
          Object.assign(box.style, { left: `${this.region.x * 100}%`, top: `${this.region.y * 100}%`, width: `${this.region.w * 100}%`, height: `${this.region.h * 100}%` });
        };
        const up = () => { stage.removeEventListener('pointermove', move); stage.removeEventListener('pointerup', up); };
        stage.addEventListener('pointermove', move);
        stage.addEventListener('pointerup', up);
      });
    }
    const controls = [];
    if (d?.kind === '3d') {
      const rerender = () => { clearTimeout(this.rt); this.rt = setTimeout(() => this.render3d(), 250); };
      controls.push(
        slider({ label: 'Rotação', min: 0, max: 355, step: 5, value: d.rot, format: (v) => `${v}°`, onchange: (v) => { d.rot = v; rerender(); } }),
        slider({ label: 'Inclinação', min: -60, max: 60, step: 5, value: d.tilt, format: (v) => `${v}°`, onchange: (v) => { d.tilt = v; rerender(); } }),
        toggle({ label: 'Girando (animado)', value: d.spin, onchange: (v) => { d.spin = v; rerender(); } }));
    } else if (d) {
      const hbDraft = this.hitboxDraft || d.hitbox;
      controls.push(
        h('div.row', {}, h('span.label', {}, 'Rotação'), segmented([[0, '0°'], [90, '90°'], [180, '180°'], [270, '270°']], d.rot, (v) => { d.rot = v; this.render(); this.refreshBake(); })),
        slider({ label: 'Rotação livre', min: 0, max: 360, step: 1, value: d.rot, format: (v) => `${v}°`, oninput: (v) => { d.rot = v; this.refreshBake(); }, onchange: () => this.render() }),
        slider({ label: 'Tamanho', min: 25, max: 400, step: 5, value: Math.round((d.scale || 1) * 100), format: (v) => `${v}%`, oninput: (v) => { d.scale = v / 100; this.syncLive(); }, onchange: () => this.render() }),
        toggle({ label: 'Espelhar', value: d.flip, onchange: (v) => { d.flip = v; this.render(); this.refreshBake(); } }),
        this.colorControl(d),
        h('div.row', {},
          h('button', { onclick: () => { this.hitMode = true; this.hitboxDraft = null; this.render(); } }, '🎯 Marcar hitbox'),
          hbDraft ? h('button', { onclick: () => { delete d.hitbox; this.hitboxDraft = null; this.render(); } }, '✕ Limpar hitbox') : null),
        h('small.muted', {}, 'O hitbox é a parte da imagem que responde ao clique (o resto deixa passar).'));
    }
    if (d && d.src.length > 1) controls.push(slider({ label: 'Velocidade', min: 0.25, max: 3, step: 0.25, value: d.speed, format: (v) => `${v}×`, oninput: (v) => { d.speed = v; this.syncLive(); } }));
    const has = !!app.skins?.objects[id];
    const right = h('div.obj-edit', {},
      stage,
      id === 'videogame' && h('div.note', {}, 'Arraste sobre a imagem para marcar onde fica a tela da TV.'),
      h('div.row', {},
        h('button', { onclick: () => this.pickImage() }, '🖼 Imagem / GIF'),
        h('button', { onclick: () => this.pick3d() }, '🧊 Modelo 3D'),
        has && h('button', { onclick: async () => {
          await app.skins.setObject(id, null);
          if (id === 'pelucia') app.doll?.setScale(1);
          this.draft = null; this.region = null; this.snapshot = null; this.render(); this.syncLive();
        } }, '↺ Restaurar padrão')),
      controls,
      this.error && h('div.error', {}, this.error),
      h('div.note', {}, 'PNG/GIF com transparência. Modelos 3D (.glb/.vrm) viram imagem na rotação escolhida (ou girando).'));
    // O objeto de verdade na área de trabalho já está no tamanho escolhido.
    this.syncLive();
    this.frame(h('div.objects', {}, list, right), [
      h('span.grow'),
      h('button', { onclick: () => this.close() }, 'Fechar'),
      h('button.primary', { onclick: () => this.save(), disabled: !d && !this.region }, 'Aplicar'),
    ]);
  }
}

export class PackDialog extends Dialog {
  show() {
    this.open('Resourcepack (Java 1.20.1)');
    this.stepPick();
  }

  stepPick(error) {
    const rp = this.app.skins?.rp;
    this.frame(h('div.pick', {},
      h('button.tile.big', { onclick: () => this.choose() }, h('span.icon', {}, '🧱'), h('span.label', {}, 'Escolher resourcepack (.zip)'),
        h('span.hint', {}, 'Janelas, itens, sons, músicas e mobília')),
      rp && h('div.row', {}, h('span.label', {}, `Atual: ${rp.name}`), h('button', { onclick: async () => { await this.app.skins.clearPack(); this.stepPick(); } }, 'Remover')),
      error && h('div.error', {}, error),
      h('p.note', {}, 'Com resourcepack, o Inventário (bolsa) vira um barril e a bolsa de cartuchos vira um baú. Temas e visuais por objeto continuam tendo prioridade.'),
    ), [h('button', { onclick: () => this.close() }, 'Fechar')]);
  }

  async choose() {
    const path = await window.petAPI.pickFile('Resourcepack', 'Resourcepack', ['zip']);
    if (!path) return;
    this.frame(h('div.loading', {}, h('div.spinner'), 'Lendo resourcepack…'));
    try {
      const scan = await this.app.skins.scan(path);
      this.stepParts(path, scan);
    } catch (e) {
      this.stepPick(String(e));
    }
  }

  stepParts(path, scan) {
    const T = 'assets/minecraft/textures/';
    const parts = {};
    const prev = (p, label) => scan.files[p] ? h('figure', {}, h('img', { src: scan.files[p], draggable: false }), h('figcaption', {}, label)) : null;
    const preview = h('div.rp-preview', {},
      prev('pack.png', 'Ícone'), prev(`${T}gui/widgets.png`, 'Janelas'), prev(`${T}block/barrel_side.png`, 'Barril (comida)'),
      prev(`${T}entity/chest/normal.png`, 'Baú (cartuchos)'), prev(`${T}item/apple.png`, 'Itens'), prev(`${T}block/bookshelf.png`, 'Estante'));
    const checks = RP_PARTS.map(([id, label]) => {
      parts[id] = !!scan.has[id];
      return h('label.row.toggle', {}, h('span.label', {}, `${label}${scan.has[id] ? '' : ' (não tem)'}`),
        h('input', { type: 'checkbox', checked: parts[id], disabled: !scan.has[id], onchange: (e) => (parts[id] = e.target.checked) }), h('span.switch'));
    });
    const btn = h('button.primary', {
      onclick: async () => {
        this.busy = true;
        btn.disabled = true;
        btn.textContent = 'Importando…';
        try {
          await this.app.skins.importPack(path, parts, scan);
          this.busy = false;
          this.close();
        } catch (e) {
          this.busy = false;
          this.stepPick(String(e));
        }
      },
    }, 'Importar');
    this.frame(h('div.rp', {}, h('div.rp-parts', {}, h('div.group', {}, 'O que usar'), checks), preview),
      [h('button', { onclick: () => this.stepPick() }, 'Voltar'), h('span.grow'), btn]);
  }
}

// Dialog for opening multiple loot boxes with a slider
export class BoxOpenDialog extends Dialog {
  constructor(app, boxId, maxCount) {
    super(app);
    this.boxId = boxId;
    this.maxCount = maxCount;
    this.selectedCount = 1;
  }

  open() {
    super.open('Abrir Caixas');
    const { game } = this.app;
    const boxItem = ITEMS.find((i) => i.id === this.boxId);
    const boxIcon = boxItem?.img || '🎁';

    const body = h('div.box-open-dialog', {},
      h('div.box-preview.center', {},
        h('div.box-icon', {}, isArtSrc(boxIcon) ? h('img', { src: boxIcon, alt: '', draggable: false }) : h('span.glyph', {}, boxIcon)),
        h('div.box-name', {}, boxItem?.name || 'Caixa'),
        h('div.box-count', {}, `Total: ${this.maxCount} caixa(s)`),
      ),
      h('div.slider-container.center', {},
        h('div.slider-label', {}, 'Quantidade a abrir'),
        h('div.slider-wrapper', {},
          slider({
            label: '',
            min: 1,
            max: this.maxCount,
            step: 1,
            value: 1,
            format: (v) => `×${v}`,
            oninput: (v) => { this.selectedCount = v; },
            onchange: () => {},
          }),
        ),
        h('div.slider-value.big', {}, `Abrir ${this.selectedCount} ${this.selectedCount === 1 ? 'caixa' : 'caixas'}`),
      ),
      h('div.quick-buttons.center', {},
        h('button.quick-btn', { onclick: () => { this.selectedCount = Math.min(5, this.maxCount); this.render(); } }, '×5'),
        h('button.quick-btn', { onclick: () => { this.selectedCount = Math.min(10, this.maxCount); this.render(); } }, '×10'),
        h('button.quick-btn', { onclick: () => { this.selectedCount = this.maxCount; this.render(); } }, 'Todas'),
      ),
    );

    const footer = [
      h('button', { onclick: () => this.close() }, 'Cancelar'),
      h('span.grow'),
      h('button.primary', {
        onclick: () => {
          if (this.selectedCount > 1) {
            this.app.rewards?.openMany?.(this.boxId, this.selectedCount);
          } else {
            game.use(this.boxId);
          }
          this.app.closeMenu?.();
          this.close();
        },
      }, `Abrir ${this.selectedCount} ${this.selectedCount === 1 ? 'caixa' : 'caixas'}`),
    ];

    this.frame(body, footer);
  }

  render() {
    // Update the slider value display
    const valueEl = this.modal?.querySelector('.slider-value.big');
    if (valueEl) {
      valueEl.textContent = `Abrir ${this.selectedCount} ${this.selectedCount === 1 ? 'caixa' : 'caixas'}`;
    }
    // Update slider input
    const sliderInput = this.modal?.querySelector('input[type="range"]');
    if (sliderInput) {
      sliderInput.value = this.selectedCount;
    }
    // Update button text
    const primaryBtn = this.modal?.querySelector('.modal-foot button.primary');
    if (primaryBtn) {
      primaryBtn.textContent = `Abrir ${this.selectedCount} ${this.selectedCount === 1 ? 'caixa' : 'caixas'}`;
    }
  }
}