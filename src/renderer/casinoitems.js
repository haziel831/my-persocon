// Gacha-Machine, Slot-Machine and the collectible figures (only from the Gacha): odds, payouts and
// pixel art. The machines are drawn frame by frame (knob, lever, lights), each frame cached as an icon.
import { icon, defineIcons } from './pixel.js';

export const GACHA_PRICE = 30;

// Animation variants of each machine (and of playing video games): chosen at random, never the same
// twice in a row, unless one is fixed in the machine's right-click menu (toys[id].anim).
export const STYLES = {
  gacha: [['classic', 'Clássica'], ['turbo', 'Turbo (gira rápido)'], ['kick', 'Emperrada (chute na máquina)'], ['drama', 'Suspense (rufar de tambores)'], ['twist', 'Torcer a cápsula']],
  slot: [['lever', 'Alavanca'], ['button', 'Botão SPIN'], ['turbo', 'Turbo'], ['lucky', 'Sopro da sorte'], ['slowmo', 'Câmera lenta']],
  venda: [['classic', 'Moedas e botão'], ['card', 'Cartão por aproximação'], ['stuck', 'Produto emperrado'], ['lucky', 'Roleta da sorte'], ['indecisive', 'Indecisa']],
  game: [['calm', 'Tranquila'], ['hype', 'Empolgada'], ['focus', 'Concentrada'], ['rage', 'Pavio curto'], ['rhythm', 'No ritmo']],
};
const lastStyle = {};
export function pickStyle(toy, key, list) {
  const opts = list.filter(([k]) => k !== lastStyle[key]);
  const k = opts[Math.floor(Math.random() * opts.length)][0];
  lastStyle[key] = k;
  return k;
}
export const GACHA_ORDER = ['comum', 'incomum', 'raro', 'epico'];
const GACHA_ODDS = [60, 28, 10, 2];
const GACHA_LUCK = [-0.5, 0.3, 0.8, 1.2];

// Luck in the games comes from affection: 0 (none) → 1 (maximum); a little bad luck below zero.
export const luckOf = (affection) => Math.max(-0.1, Math.min(1, (affection || 0) / 1000));

export function rollGacha(luck = 0) {
  const w = GACHA_ODDS.map((o, i) => o * Math.max(0.05, 1 + luck * GACHA_LUCK[i]));
  let r = Math.random() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < w.length; i++) if ((r -= w[i]) <= 0) return GACHA_ORDER[i];
  return GACHA_ORDER[0];
}

// ---------- slot ----------

// weight: chance on each reel; pay: multiplier of the bet for three of a kind.
export const SLOT_SYMBOLS = [
  { id: 'cereja', pix: 'sym_cereja', weight: 5, pay: 5 },
  { id: 'limao', pix: 'sym_limao', weight: 5, pay: 8 },
  { id: 'sino', pix: 'sym_sino', weight: 4, pay: 12 },
  { id: 'estrela', pix: 'sym_estrela', weight: 3, pay: 20 },
  { id: 'diamante', pix: 'sym_diamante', weight: 2, pay: 40 },
  { id: 'sete', pix: 'sym_sete', weight: 1, pay: 100 },
];
const SLOT_TOTAL = SLOT_SYMBOLS.reduce((a, s) => a + s.weight, 0);
const spinOne = () => {
  let r = Math.random() * SLOT_TOTAL;
  for (let i = 0; i < SLOT_SYMBOLS.length; i++) if ((r -= SLOT_SYMBOLS[i].weight) <= 0) return i;
  return 0;
};

// Three of a kind pays its table; two cherries anywhere pay x2. Returns the multiplier (0 = lost).
export function slotPayout(r) {
  if (r[0] === r[1] && r[1] === r[2]) return SLOT_SYMBOLS[r[0]].pay;
  return r.filter((s) => s === 0).length === 2 ? 2 : 0;
}

// Luck gives a lost spin a second chance (about 70% back on average with no affection, ~92% at the maximum).
export function rollSlot(luck = 0) {
  let r = [spinOne(), spinOne(), spinOne()];
  if (!slotPayout(r) && Math.random() < Math.max(0, luck) * 0.35) r = [spinOne(), spinOne(), spinOne()];
  return r;
}

// Picture strip of each reel (just the look: the result is rolled apart and the reel stops on it).
export const SLOT_STRIPS = [0, 1, 2].map((k) => {
  const list = SLOT_SYMBOLS.flatMap((s, i) => Array(Math.max(1, Math.round(s.weight * 0.8))).fill(i));
  for (let i = list.length - 1; i > 0; i--) {
    const j = (i * 7 + k * 5 + 3) % (i + 1);
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
});

// ---------- figures ----------

const SKIN = '#f2c9a0';
const person = (o) => ({ rect, px }) => {
  const skin = o.skin || SKIN;
  rect(5, 13, 2, 4, o.bottom); rect(8, 13, 2, 4, o.bottom);
  rect(4, 16, 3, 1, o.shoes || '#2b1a0a'); rect(8, 16, 3, 1, o.shoes || '#2b1a0a');
  rect(4, 8, 6, 5, o.top); rect(3, 8, 1, 4, o.sleeve || skin); rect(10, 8, 1, 4, o.sleeve || skin);
  if (o.belt) rect(4, 12, 6, 1, o.belt);
  if (o.tails) { rect(1, 3, 2, 6, o.hair); rect(11, 3, 2, 6, o.hair); }
  rect(4, 2, 6, 6, skin);
  rect(4, 1, 6, 2, o.hair); rect(3, 2, 1, 4, o.hair); rect(10, 2, 1, 4, o.hair);
  px(5, 5, '#1d1a26'); px(8, 5, '#1d1a26');
  if (o.spiky) { px(4, 0, o.hair); px(6, 0, o.hair); px(9, 0, o.hair); }
  if (o.headband) rect(4, 3, 6, 1, o.headband);
  if (o.cap) { rect(4, 0, 6, 2, o.cap); rect(9, 2, 3, 1, o.cap); }
  if (o.hood) { rect(4, 0, 6, 2, o.hood); rect(10, 1, 2, 1, o.hood); rect(12, 2, 1, 3, o.hood); }
  if (o.hat) { rect(1, 2, 12, 1, o.hat); rect(4, 0, 6, 2, o.hat); if (o.band) rect(4, 1, 6, 1, o.band); }
  if (o.mustache) rect(5, 6, 4, 1, '#2b1a0a');
  if (o.sword) { rect(12, 3, 1, 8, '#d8dce6'); rect(11, 10, 3, 1, '#c98200'); rect(12, 11, 1, 2, '#6e4520'); }
  if (o.wand) { rect(12, 6, 1, 7, '#ffd23f'); rect(11, 4, 3, 2, '#ff6fb5'); px(12, 3, '#ffffff'); }
  if (o.mic) { rect(12, 7, 1, 3, '#555555'); rect(11, 5, 2, 2, '#c0c4d0'); }
};
const SHAPES = {
  slime: ([a, b]) => ({ rect, px }) => {
    rect(3, 10, 8, 7, a); rect(4, 8, 6, 2, a); rect(6, 6, 2, 2, a); rect(3, 16, 8, 1, b);
    rect(4, 9, 1, 2, '#ffffff'); px(5, 12, '#1d1a26'); px(8, 12, '#1d1a26'); rect(6, 14, 2, 1, b);
  },
  ghost: ([a, b]) => ({ rect, px }) => {
    rect(3, 5, 8, 11, a); rect(4, 3, 6, 2, a); [3, 5, 7, 9].forEach((x) => px(x, 16, a));
    rect(4, 7, 2, 3, b); rect(8, 7, 2, 3, b); px(5, 8, '#2a5bd7'); px(9, 8, '#2a5bd7');
  },
  mushroom: ([a, b]) => ({ rect, px }) => {
    rect(2, 5, 10, 4, a); rect(3, 3, 8, 2, a); rect(5, 2, 4, 1, a);
    rect(4, 4, 2, 2, b); rect(9, 6, 2, 2, b); px(6, 7, b);
    rect(4, 9, 6, 7, '#f4e6c8'); px(5, 11, '#1d1a26'); px(8, 11, '#1d1a26'); rect(4, 16, 2, 1, '#6e4520'); rect(8, 16, 2, 1, '#6e4520');
  },
  hedgehog: ([a, b]) => ({ rect, px }) => {
    rect(1, 6, 3, 2, a); rect(2, 9, 2, 2, a); rect(3, 3, 3, 2, a);
    rect(4, 4, 6, 9, a); rect(7, 6, 4, 4, b); rect(7, 5, 2, 2, '#ffffff'); px(8, 6, '#1d1a26'); px(10, 8, '#1d1a26');
    rect(6, 10, 3, 3, b); rect(5, 13, 2, 2, a); rect(8, 13, 2, 2, a);
    rect(4, 15, 3, 2, '#e23b3b'); rect(8, 15, 3, 2, '#e23b3b'); px(5, 15, '#ffffff'); px(9, 15, '#ffffff');
  },
  robocat: ([a, b]) => ({ rect, px }) => {
    rect(3, 2, 8, 7, a); rect(4, 4, 6, 5, b); px(5, 4, '#1d1a26'); px(8, 4, '#1d1a26'); px(7, 6, '#e23b3b'); rect(5, 7, 4, 1, '#1d1a26');
    rect(4, 9, 6, 1, '#e23b3b'); px(7, 10, '#ffd23f');
    rect(4, 10, 6, 5, a); rect(5, 11, 4, 3, b); rect(4, 15, 2, 2, b); rect(8, 15, 2, 2, b);
  },
  armor: ([a, b]) => ({ rect, px }) => {
    rect(4, 1, 6, 6, a); rect(5, 3, 4, 2, b); rect(3, 7, 8, 6, a); rect(2, 7, 2, 3, a); rect(10, 7, 2, 3, a);
    rect(10, 9, 3, 3, '#7a7e93'); px(12, 10, '#5ef0ff'); px(7, 9, b);
    rect(4, 13, 2, 4, a); rect(8, 13, 2, 4, a);
  },
  mecha: ([a, b, c]) => ({ rect, px }) => {
    rect(5, 2, 4, 4, a); rect(4, 1, 2, 1, '#ffd23f'); rect(8, 1, 2, 1, '#ffd23f'); px(7, 1, c);
    px(6, 4, '#5fd36a'); px(7, 4, '#5fd36a');
    rect(3, 6, 8, 4, b); rect(4, 7, 2, 1, '#ffd23f'); rect(8, 7, 2, 1, '#ffd23f'); rect(5, 10, 4, 2, c);
    rect(1, 6, 2, 6, a); rect(11, 6, 2, 6, a); rect(4, 12, 2, 5, a); rect(8, 12, 2, 5, a);
    rect(3, 16, 3, 1, c); rect(8, 16, 3, 1, c);
  },
  dragon: ([a, b]) => ({ rect, circle, px }) => {
    rect(1, 5, 4, 4, b); rect(2, 4, 2, 1, b); rect(0, 8, 2, 2, b);
    circle(7, 11, 4, a); rect(8, 4, 4, 4, a); rect(11, 5, 2, 2, a); px(10, 5, '#ffd23f'); px(9, 3, '#f4f1ea'); px(12, 7, '#ffffff');
    rect(6, 10, 3, 4, '#ffd23f'); rect(2, 13, 3, 2, a); px(1, 12, a);
    rect(5, 15, 2, 2, a); rect(9, 15, 2, 2, a);
  },
};

// [id, name, rarity, kind, colors (or the outfit of a person)]; mini: colors on the shelf.
const FIG = [
  ['fig_slime', 'Slime Azul', 'comum', 'slime', ['#3fa9f5', '#1b6fb5']],
  ['fig_fantasma', 'Fantasminha Faminto', 'comum', 'ghost', ['#ff6a6a', '#ffffff']],
  ['fig_cogumelo', 'Cogumelo Saltitante', 'comum', 'mushroom', ['#e23b3b', '#ffffff']],
  ['fig_estudante', 'Estudante de Uniforme', 'comum', 'person', { hair: '#4a2f1a', top: '#2c3e7a', bottom: '#3a3a46', sleeve: '#2c3e7a' }],
  ['fig_ninja', 'Ninja da Névoa', 'incomum', 'person', { hair: '#2b1a0a', top: '#2f7a6e', bottom: '#2c2e38', headband: '#e23b3b', spiky: true }],
  ['fig_encanador', 'Carteiro Saltador', 'incomum', 'person', { hair: '#4a2f1a', cap: '#3a54b8', top: '#ffd23f', bottom: '#6e4520' }],
  ['fig_ourico', 'Ouriço Velocista', 'incomum', 'hedgehog', ['#3c8c5a', SKIN]],
  ['fig_gatorobo', 'Gato-Robô', 'incomum', 'robocat', ['#f4a3c0', '#ffffff']],
  ['fig_magica', 'Garota Mágica', 'raro', 'person', { hair: '#b48cff', top: '#ffffff', bottom: '#b48cff', tails: true, wand: true }],
  ['fig_samurai', 'Samurai Errante', 'raro', 'person', { hair: '#2b1a0a', top: '#7a2f8f', bottom: '#2c2e38', sleeve: '#7a2f8f', sword: true }],
  ['fig_cacadora', 'Caçadora Espacial', 'raro', 'armor', ['#7a3cff', '#5ef0ff']],
  ['fig_pirata', 'Pirata dos Sete Mares', 'raro', 'person', { hair: '#2b1a0a', top: '#ffffff', bottom: '#2c2e38', hat: '#1d1a26', band: '#e23b3b' }],
  ['fig_mecha', 'Mecha Gigante', 'epico', 'mecha', ['#5a6270', '#ffd23f', '#3c8c5a']],
  ['fig_dragao', 'Dragão Ancestral', 'epico', 'dragon', ['#c21f7e', '#ff6ad5']],
  ['fig_idol', 'Idol Virtual', 'epico', 'person', { hair: '#ff9f43', top: '#2c2e38', bottom: '#ff9f43', tails: true, mic: true }],
  ['fig_heroi', 'Herói da Espada Antiga', 'epico', 'person', { hair: '#c0c0d0', hood: '#7a2f8f', top: '#7a2f8f', bottom: '#f4e6c8', belt: '#6e4520', sword: true }],
  // Only from the upgraded (neon) Gacha.
  ['fig_bitghost', 'Fantasma 8-bit', 'comum', 'ghost', ['#5ef0ff', '#ffffff'], true],
  ['fig_neonslime', 'Slime Neon', 'incomum', 'slime', ['#ff3ea5', '#7a3cff'], true],
  ['fig_neoncat', 'Gato-Robô Neon', 'incomum', 'robocat', ['#ff3ea5', '#2a1a4e'], true],
  ['fig_ciberninja', 'Ninja Cibernético', 'raro', 'person', { hair: '#1d1a26', top: '#1a1030', bottom: '#120c24', headband: '#5ef0ff', sleeve: '#ff3ea5', sword: true }, true],
  ['fig_dj', 'DJ Synthwave', 'raro', 'person', { hair: '#ff3ea5', top: '#7a3cff', bottom: '#120c24', cap: '#5ef0ff', mic: true }, true],
  ['fig_neonmecha', 'Mecha Neon', 'epico', 'mecha', ['#2a1a4e', '#ff3ea5', '#5ef0ff'], true],
  ['fig_ciberdragao', 'Dragão Cibernético', 'epico', 'dragon', ['#5ef0ff', '#7a3cff'], true],
  ['fig_holoidol', 'Idol Holográfica', 'epico', 'person', { hair: '#c8ffff', top: '#7a3cff', bottom: '#ff3ea5', tails: true, wand: true }, true],
];
const RARITY_COLOR = { comum: '#4b69ff', incomum: '#8847ff', raro: '#d32ce6', epico: '#eb4b4b' };

export const FIGURES = FIG.map(([id, name, rarity, kind, look, up]) => ({
  id, name, rarity, kind, up: !!up,
  mini: kind === 'person' ? [look.cap || look.hat || look.hood || look.hair, look.top] : [look[0], look[1]],
  get img() { return typeof document === 'undefined' ? '' : icon(id); },
}));
export const figureById = (id) => FIGURES.find((f) => f.id === id);

// Paints the 14x20 figure (with its base) at (ox, oy) of another sprite: the shelves use it.
export function paintFigure(id, p, ox = 0, oy = 0) {
  const f = FIG.find((e) => e[0] === id);
  if (!f) return;
  const [, , rarity, kind, look] = f;
  const q = {
    rect: (x, y, w, h, c) => p.rect(ox + x, oy + y, w, h, c),
    px: (x, y, c) => p.px(ox + x, oy + y, c),
    circle: (x, y, r, c) => p.circle(ox + x, oy + y, r, c),
  };
  (kind === 'person' ? person(look) : SHAPES[kind](look))(q);
  q.rect(1, 17, 12, 3, '#2c2e38'); q.rect(1, 17, 12, 1, RARITY_COLOR[rarity]);
}

defineIcons(Object.fromEntries(FIG.map(([id]) => [id, (sprite) => sprite(14, 20, (p) => paintFigure(id, p))])));

// ---------- machine art ----------

// Capsule: top half in the color of the rarity.
const capsule = (c, dark) => (sprite) => sprite(11, 11, ({ rect, circle, px }) => {
  circle(5, 5, 4, '#f4f1ea');
  rect(4, 1, 3, 1, c); rect(2, 2, 7, 2, c); rect(1, 4, 9, 1, c); rect(1, 5, 9, 1, dark);
  px(3, 2, '#ffffff'); px(7, 7, '#d8dce6');
});

// Japanese gashapon (26x44): poster with the collection on top, a clear box full of capsules, the
// coin mechanism with the price sticker and a big crank, and the capsule door below it.
// Upgraded machines: the same drawing with the colors swapped for a dark synthwave palette.
const neonize = (p, map) => ({
  rect: (x, y, w, h, c) => p.rect(x, y, w, h, map[c] || c),
  px: (x, y, c) => p.px(x, y, map[c] || c),
  circle: (x, y, r, c) => p.circle(x, y, r, map[c] || c),
});
const GACHA_NEON = {
  '#2c2e38': '#120c24', '#fff6d8': '#2a1250', '#e23b3b': '#d8304a', '#ff7a7a': '#ff5fa2', '#b01f1f': '#9a1f3a', '#8a1f1f': '#5ef0ff',
  '#ffd23f': '#5ef0ff', '#fff1b0': '#c8ffff', '#c98200': '#1aa0b8', '#8a8ea0': '#7a3cff', '#d4effb': '#2a1a5e',
  '#d8dce6': '#3e2c66', '#a8acb8': '#2c2048', '#c0c4d0': '#ff3ea5', '#5b5e70': '#3e2c66', '#3a3d4a': '#241a3e', '#ff9a9a': '#ffffff',
};
const SLOT_NEON = {
  '#7a2f8f': '#120c24', '#ffd23f': '#2a1250', '#6a5a30': '#1a0c30', '#e23b3b': '#5ef0ff', '#3a54b8': '#2f46c0', '#5d7ce0': '#ff3ea5',
  '#24346e': '#1a2470', '#ffc23a': '#5ef0ff', '#7ad04a': '#7a3cff', '#8a8ea0': '#3e2c66', '#c0c4d0': '#a8acc8',
};
const BULB_UP = {
  idle: (i, lit) => ((i + lit) % 2 ? '#ff3ea5' : '#5ef0ff'),
  spin: (i, lit) => ['#ff3ea5', '#ff9a3d', '#ffd23f', '#5ef0ff', '#7a3cff'][(i + lit) % 5],
  win: (i, lit) => (lit % 2 ? '#ffffff' : ['#ff3ea5', '#5ef0ff', '#ffd23f'][i % 3]),
  off: () => '#2a1a3e',
};
const CAPS = ['#4b69ff', '#ff6fb5', '#ffd23f', '#7ad04a', '#8847ff', '#ff8a3d', '#5ef0ff', '#eb4b4b'];
const PILE = [[5, 20], [9, 21], [13, 20], [17, 21], [21, 20], [7, 17], [11, 17], [15, 17], [19, 17], [5, 14], [9, 14], [13, 14], [17, 14], [21, 14], [11, 11], [16, 11]];
const gachaArt = (knob, shake, lit, glow, chute, up) => (sprite) => sprite(26, 44, (p) => {
  const { rect, circle, px } = up ? neonize(p, GACHA_NEON) : p;
  // Poster: title band with chasing lights and the four rarities of figures.
  rect(1, 0, 24, 10, '#2c2e38'); rect(2, 1, 22, 8, '#fff6d8'); rect(2, 1, 22, 2, '#e23b3b');
  for (let i = 0; i < 11; i++) px(3 + i * 2, 1, (i + lit) % 2 ? '#ffffff' : '#ffd23f');
  [6, 10, 15, 19].forEach((x) => px(x, 2, '#ffffff'));
  [['#4b69ff', '#f2c9a0'], ['#8847ff', '#7ad04a'], ['#d32ce6', '#ffd23f'], ['#eb4b4b', '#5ef0ff']].forEach(([c, d], i) => {
    const x = 3 + i * 5;
    rect(x, 4, 4, 4, '#ffffff'); rect(x + 1, 4, 2, 2, d); rect(x + 1, 6, 2, 1, c); rect(x, 7, 4, 1, c);
  });
  // Clear box with the capsules (they jump around while the crank turns).
  rect(2, 10, 22, 15, '#8a8ea0'); rect(3, 11, 20, 13, glow || '#d4effb');
  PILE.forEach(([x, y], i) => {
    const dx = shake ? ((i * 7 + shake * 3) % 3) - 1 : 0;
    const dy = shake ? ((i * 5 + shake * 2) % 3) - 1 : 0;
    const cx = Math.min(21, Math.max(5, x + dx));
    const cy = Math.min(22, Math.max(12, y + dy));
    circle(cx, cy, 2, CAPS[i % CAPS.length]); rect(cx - 1, cy + 1, 3, 1, '#f4f1ea'); px(cx - 1, cy - 1, '#ffffff');
  });
  rect(4, 12, 1, 6, 'rgba(255,255,255,0.7)'); px(5, 12, 'rgba(255,255,255,0.7)'); rect(21, 12, 1, 3, 'rgba(255,255,255,0.5)');
  // Body: price sticker (¥ 30), coin slot, big crank, capsule door and coin return.
  rect(1, 25, 24, 15, '#e23b3b'); rect(1, 25, 24, 1, '#ff7a7a'); rect(23, 26, 2, 14, '#b01f1f');
  rect(2, 27, 9, 9, '#ffd23f'); rect(2, 27, 9, 1, '#fff1b0'); rect(2, 35, 9, 1, '#c98200');
  rect(3, 28, 2, 2, '#c98200'); px(3, 28, '#fff1b0'); rect(6, 28, 4, 1, '#e23b3b');
  for (const [d, ox] of [...String(GACHA_PRICE).padStart(2).slice(-2)].map((d, i) => [d, 4 + i * 4])) {
    const bits = DIGITS[+d];
    if (!bits || d === ' ') continue;
    for (let k = 0; k < 15; k++) if (bits[k] === '1') px(ox + (k % 3), 30 + Math.floor(k / 3), '#1d1a26');
  }
  rect(12, 27, 10, 9, '#d8dce6'); rect(12, 27, 10, 1, '#ffffff'); rect(21, 28, 1, 8, '#a8acb8');
  rect(19, 28, 2, 3, '#5b5e70'); rect(19, 29, 2, 1, '#1d1a26');
  circle(16, 31, 3, '#a8acb8'); circle(16, 31, 2, '#c0c4d0');
  const bar = '#2c2e38';
  const knobEnd = (x, y) => { rect(x - 1, y - 1, 3, 3, '#e23b3b'); px(x - 1, y - 1, '#ff9a9a'); };
  if (knob === 0) { rect(12, 31, 9, 2, bar); knobEnd(12, 31); knobEnd(20, 32); }
  else if (knob === 2) { rect(15, 27, 2, 9, bar); knobEnd(16, 27); knobEnd(15, 35); }
  else for (let k = -4; k <= 4; k++) { const y = 31 + (knob === 1 ? k : -k); rect(16 + k, y, 2, 1, bar); if (k === -4 || k === 4) knobEnd(16 + k, y); }
  circle(16, 31, 1, '#ffd23f');
  rect(3, 36, 7, 3, '#1d1a26'); rect(3, 36, 7, 1, '#5b5e70'); px(6, 37, '#8a8ea0');
  rect(12, 36, 10, 4, '#1d1a26'); rect(12, 36, 10, 1, '#c0c4d0'); rect(14, 37, 6, 2, chute || '#3a3a46');
  if (chute) px(15, 37, '#ffffff');
  rect(1, 40, 24, 1, '#8a1f1f');
  rect(1, 41, 5, 3, '#5b5e70'); rect(20, 41, 5, 3, '#5b5e70'); rect(6, 41, 14, 1, '#3a3d4a');
});

// mode: idle (slow lights), spin (chasing), win (all flashing), off (dim, after a loss).
const BULB = {
  idle: (i, lit) => ((i + lit) % 2 ? '#ffd23f' : '#ff8a3d'),
  spin: (i, lit) => ((i + lit) % 3 === 0 ? '#ffffff' : '#8847ff'),
  win: (i, lit) => (lit % 2 ? '#ffffff' : (i % 2 ? '#ff3b6b' : '#ffd23f')),
  off: () => '#4a3a50',
};
const slotArt = (lever, lit, mode, up) => (sprite) => sprite(28, 40, (p) => {
  const { rect, circle, px } = up ? neonize(p, SLOT_NEON) : p;
  const bulb = up ? BULB_UP : BULB;
  const off = mode === 'off';
  rect(1, 0, 22, 7, '#7a2f8f'); rect(2, 1, 20, 5, off ? '#6a5a30' : '#ffd23f');
  for (let i = 0; i < 3; i++) {
    const x = 5 + i * 5;
    rect(x, 2, 3, 1, '#e23b3b'); px(x + 2, 3, '#e23b3b'); px(x + 1, 4, '#e23b3b');
  }
  for (let i = 0; i < 11; i++) { p.px(2 + i * 2, 0, bulb[mode](i, lit)); p.px(2 + i * 2, 6, bulb[mode](i + 1, lit)); }
  rect(1, 7, 22, 29, '#3a54b8'); rect(1, 7, 22, 1, '#5d7ce0'); rect(21, 8, 2, 28, '#24346e'); rect(1, 8, 1, 28, '#ffc23a');
  rect(3, 10, 18, 11, '#ffc23a'); rect(4, 11, 16, 9, '#1d1a26');
  for (let i = 0; i < 3; i++) {
    rect(4 + i * 6, 11, 4, 9, '#f4f1ea');
    px(5 + i * 6, 15, ['#e23b3b', '#ffd23f', '#e23b3b'][i]); px(6 + i * 6, 15, ['#e23b3b', '#ffd23f', '#e23b3b'][i]);
  }
  rect(4, 22, 16, 3, '#24346e'); rect(5, 23, 3, 1, '#e23b3b'); rect(10, 23, 3, 1, '#ffd23f'); rect(15, 23, 3, 1, '#7ad04a');
  rect(17, 26, 3, 3, '#8a8ea0'); px(18, 27, '#1d1a26');
  rect(4, 30, 16, 4, '#ffc23a'); rect(5, 31, 14, 2, '#1d1a26');
  if (mode === 'win') [6, 9, 11, 14, 16].forEach((x, i) => p.px(x, 31 + (i % 2), '#ffd23f'));
  rect(0, 36, 24, 4, '#24346e'); rect(0, 36, 24, 1, '#ffc23a');
  rect(23, 17, 2, 5, '#8a8ea0');
  if (lever === 0) { rect(25, 6, 1, 13, '#c0c4d0'); circle(25, 5, 2, '#e23b3b'); }
  else if (lever === 1) { rect(25, 12, 1, 7, '#c0c4d0'); circle(25, 11, 2, '#e23b3b'); }
  else { rect(25, 19, 1, 8, '#c0c4d0'); circle(25, 27, 2, '#e23b3b'); }
});

// Reel window (inside the glass) and the Gacha chute, in fractions of each picture.
export const SLOT_WINDOW = { x: 4 / 28, y: 11 / 40, w: 16 / 28, h: 9 / 40 };
export const SLOT_TRAY = { x: 12 / 28, y: 32 / 40 };
export const SLOT_COIN = { x: 18.5 / 28, y: 27 / 40 };
export const GACHA_CHUTE = { x: 17 / 26, y: 38 / 44 };

const made = new Set();
const frame = (name, draw) => {
  if (!made.has(name)) {
    made.add(name);
    defineIcons({ [name]: draw });
  }
  return icon(name);
};
export const gachaFrame = (knob = 0, shake = 0, lit = 0, glow = '', chute = '', up = false) => frame(`gacha${up ? 'U' : ''}_${knob}_${shake}_${lit}_${glow}_${chute}`, gachaArt(knob, shake, lit, glow, chute, up));
export const slotFrame = (lever = 0, lit = 0, mode = 'idle', up = false) => frame(`slot${up ? 'U' : ''}_${lever}_${lit}_${mode}`, slotArt(lever, lit, mode, up));

// ---------- Japanese vending machines (32x52) ----------
// Jidouhanbaiki: lit brand sign on top, a showcase with 12 sample products (3 rows of 4), each with
// its price tag and button (blue = cold, red = hot), the money panel (credit display, coin slot,
// bill slot, IC card reader, coin return), a 4-digit lottery display and the pick-up tray at the
// bottom. kind: 'comida' | 'bebida'.
const VEND_CANS = ['#e23b3b', '#3c8c5a', '#3a54b8', '#ffd23f', '#ff8a3d', '#5ef0ff', '#7ad04a', '#8847ff', '#f4f1ea', '#ff6fb5', '#c98200', '#2a6fd6'];
const DIGITS = ['111101101101111', '010110010010111', '111001111100111', '111001111001111', '101101111001001', '111100111001111', '111100111101111', '111001010010010', '111101111101111', '111101111001111'];
const COFFEE = ['#6e4520', '#1d1a26', '#c98200', '#8a2b1a'];
const HOT_ROW = 2;

// One sample behind the glass (3x5 at x, y): cans, PET bottles and hot coffee for drinks; onigiri,
// sandwiches, breads and cup noodles for food.
function vendSample(rect, px, food, r, c, x, y, col) {
  if (!food) {
    if (r === HOT_ROW) {
      if (c === 3) { px(x + 1, y + 1, '#ff8a3d'); rect(x, y + 2, 3, 3, '#e8d8a8'); rect(x, y + 3, 3, 1, '#3c8c5a'); return; }
      rect(x, y + 1, 3, 1, '#c0c4d0'); rect(x, y + 2, 3, 3, COFFEE[c]); px(x + 1, y + 3, '#ffd23f'); px(x, y + 2, '#ffffff');
      return;
    }
    if ((r + c) % 2 === 0) {
      rect(x, y, 3, 1, '#c0c4d0'); rect(x, y + 1, 3, 4, col); rect(x, y + 2, 3, 1, '#ffffff'); px(x, y + 3, '#ffffff');
      return;
    }
    px(x + 1, y, r ? '#3c8c5a' : '#f4f1ea'); rect(x, y + 1, 3, 4, '#cfeeff'); rect(x, y + 2, 3, 2, col); px(x, y + 1, '#ffffff');
    return;
  }
  if (r === 0) {
    if (c === 1) { px(x + 2, y + 1, '#f4e6c8'); rect(x, y + 2, 3, 3, '#f4e6c8'); rect(x, y + 3, 3, 1, '#7ad04a'); px(x + 1, y + 2, '#e23b3b'); return; }
    px(x + 1, y + 1, '#f4f1ea'); rect(x, y + 2, 3, 3, '#f4f1ea'); rect(x + 1, y + 3, 1, 2, '#1d1a26'); px(x, y + 4, col);
    return;
  }
  if (r === 1) {
    rect(x, y + 1, 3, 4, 'rgba(255,255,255,0.55)');
    const bread = ['#e8b45a', '#c8642d', '#a0602a', '#f0d27a'][c];
    rect(x, y + 2, 3, 3, bread); px(x + 1, y + 2, '#fff1b0'); if (c === 2) rect(x, y + 3, 3, 1, '#5a2a1a');
    return;
  }
  if (c === 3) { rect(x, y + 3, 3, 2, '#f4f1ea'); px(x, y + 2, '#c8642d'); px(x + 2, y + 2, '#c8642d'); px(x + 1, y + 3, '#c8642d'); return; }
  rect(x, y, 3, 1, '#c0c4d0'); rect(x, y + 1, 3, 4, '#f4f1ea'); rect(x, y + 2, 3, 1, ['#e23b3b', '#ffd23f', '#ff8a3d'][c]); px(x + 1, y + 3, '#1d1a26');
}

const VEND_NEON = {
  '#ff7a7a': '#ff5fa2', '#1d2733': '#120c24', '#fff6e0': '#1a0f33', '#e4f4ff': '#0f1636', '#fff1b0': '#2a1250', '#fff8d0': '#3a1a6a',
  '#2a6fd6': '#1a2470', '#3f86ec': '#2f46c0', '#8a8ea0': '#7a3cff', '#2c2e38': '#120c24', '#45485a': '#5ef0ff', '#3a3d4a': '#241a3e',
  '#2a2c36': '#ff3ea5', '#1d1a26': '#0a0614', '#5b5e70': '#5ef0ff', '#ff3b3b': '#5ef0ff', '#4a1a1a': '#123a4a', '#ff8a3d': '#ff3ea5',
};
const vendArt = (kind, lit, sel, blink, led, ic, tray, empty, up) => (sprite) => sprite(32, 52, (p) => {
  const { rect, px, circle } = up ? neonize(p, VEND_NEON) : p;
  const food = kind === 'comida';
  const body = food ? '#d8343c' : '#f2f4f8';
  const shade = food ? '#a8222a' : '#c4ccd8';
  const glass = food ? '#fff6e0' : '#e4f4ff';
  rect(1, 0, 30, 1, body); rect(0, 1, 32, 49, body); rect(30, 1, 2, 49, shade); rect(1, 1, 29, 1, food ? '#ff7a7a' : '#ffffff');
  // Brand sign, lit from inside (generic logos: a swoosh and a sun / a red mark and a steaming bowl).
  rect(1, 2, 29, 7, '#1d2733');
  const bright = lit === 1;
  if (food) {
    rect(2, 3, 27, 5, bright ? '#fff8d0' : '#fff1b0');
    rect(4, 4, 3, 3, '#d8343c'); px(5, 5, '#fff1b0');
    rect(8, 4, 9, 1, '#d8343c'); rect(8, 6, 7, 1, '#d8343c'); px(11, 5, '#d8343c'); px(15, 5, '#d8343c');
    rect(21, 5, 6, 2, '#d8343c'); rect(22, 7, 4, 1, '#a8222a'); px(22, 4, '#a8acb8'); px(24, 3, '#a8acb8'); px(26, 4, '#a8acb8');
  } else {
    rect(2, 3, 27, 5, bright ? '#3f86ec' : '#2a6fd6');
    px(4, 6, '#ffffff'); rect(5, 5, 2, 1, '#ffffff'); rect(7, 4, 3, 1, '#ffffff'); rect(10, 5, 2, 1, '#ffffff'); rect(12, 6, 3, 1, '#ffffff'); rect(15, 5, 2, 1, '#ffffff'); rect(17, 4, 2, 1, '#ffffff');
    rect(6, 7, 12, 1, '#9fd0ff');
    circle(24, 5, 2, '#ffd23f'); px(23, 4, '#fff6b0');
  }
  for (let i = 0; i < 14; i++) px(2 + i * 2, 2, (i + lit) % 3 === 0 ? '#ffffff' : food ? '#ff8a3d' : '#5ef0ff');
  // Cold / hot band over the showcase.
  if (food) rect(2, 9, 22, 1, '#ff8a3d');
  else { rect(2, 9, 15, 1, '#3fa9f5'); rect(17, 9, 7, 1, '#ff4a4a'); }
  // Showcase: samples, price tags and the lit buttons.
  rect(2, 10, 22, 26, '#1d2733'); rect(3, 11, 20, 24, glass); rect(3, 11, 20, 1, bright ? '#ffffff' : glass);
  for (let r = 0; r < 3; r++) {
    const y = 11 + r * 8;
    rect(3, y + 5, 20, 1, '#8a8ea0'); rect(3, y + 6, 20, 1, '#d8dce6');
    for (let c = 0; c < 4; c++) {
      const i = r * 4 + c;
      const x = 4 + c * 5;
      if (empty !== i) vendSample(rect, px, food, r, c, x, y, VEND_CANS[(i * 5) % 12]);
      rect(x, y + 5, 3, 1, '#ffffff'); px(x + 1, y + 5, '#5b5e70');
      const on = r === HOT_ROW ? '#ff4a4a' : '#3fa9f5';
      rect(x, y + 6, 3, 1, sel === i ? (blink ? '#ffffff' : '#ffe14a') : on);
    }
  }
  rect(4, 12, 1, 14, 'rgba(255,255,255,0.45)'); px(5, 12, 'rgba(255,255,255,0.45)');
  // Money panel.
  rect(25, 10, 5, 26, '#2c2e38'); rect(25, 10, 5, 1, '#45485a');
  rect(26, 12, 3, 2, ic || sel >= 0 ? '#9cff6a' : '#3a5a32');
  rect(26, 15, 3, 3, '#8a8ea0'); rect(27, 15, 1, 3, '#1d1a26');
  rect(26, 19, 3, 2, '#c0c4d0'); rect(26, 20, 3, 1, '#1d1a26');
  rect(26, 22, 3, 4, ic ? '#5ef0ff' : '#3a54b8'); px(27, 23, ic ? '#ffffff' : '#9fd0ff'); px(28, 24, ic ? '#ffffff' : '#9fd0ff');
  px(27, 27, '#c0c4d0'); rect(26, 28, 3, 1, '#c0c4d0');
  rect(26, 31, 3, 3, '#1d1a26'); rect(26, 31, 3, 1, '#5b5e70');
  // Lottery display and the IC card sticker.
  rect(2, 37, 20, 7, '#140f1a');
  for (let d = 0; d < 4; d++) {
    const ch = led ? led[d] : '';
    const bits = /[0-9]/.test(ch || '') ? DIGITS[+ch] : null;
    const x = 4 + d * 4;
    if (bits) for (let k = 0; k < 15; k++) { if (bits[k] === '1') px(x + (k % 3), 38 + Math.floor(k / 3), '#ff3b3b'); }
    else rect(x, 40, 3, 1, ch === '-' ? '#ff3b3b' : '#4a1a1a');
  }
  rect(23, 37, 7, 7, food ? '#ffd23f' : '#2a6fd6');
  const mark = food ? '#a8222a' : '#ffffff';
  rect(24, 39, 1, 3, mark); rect(26, 39, 3, 1, mark); px(26, 40, mark); rect(26, 41, 3, 1, mark);
  // Pick-up tray (the bought product shows up here) and the kick plate.
  rect(3, 45, 22, 4, '#1d1a26'); rect(3, 45, 22, 1, '#5b5e70'); rect(13, 46, 4, 1, '#3a3d4a');
  if (tray) { rect(11, 46, 6, 2, tray); px(11, 46, '#ffffff'); }
  rect(26, 45, 4, 4, shade);
  rect(0, 50, 32, 2, '#3a3d4a'); for (let i = 0; i < 6; i++) rect(3 + i * 5, 51, 3, 1, '#2a2c36');
  if (up) {
    // Neon trim, a holographic scan sweeping the showcase and a projector dot on top.
    p.rect(0, 1, 1, 49, lit % 2 ? '#5ef0ff' : '#3ab8d0'); p.rect(31, 1, 1, 49, lit % 2 ? '#ff3ea5' : '#c02a80');
    p.rect(1, 0, 30, 1, '#5ef0ff'); p.rect(2, 9, 22, 1, food ? '#ff3ea5' : '#5ef0ff');
    p.rect(3, 12 + lit * 8, 20, 1, 'rgba(94,240,255,0.55)'); p.rect(3, 13 + lit * 8, 20, 1, 'rgba(94,240,255,0.2)');
    p.px(15, 0, '#ffffff'); p.rect(2, 44, 22, 1, '#7a3cff');
  }
});
export const VEND_COIN = { x: 27.5 / 32, y: 16.5 / 52 };
export const VEND_IC = { x: 27.5 / 32, y: 24 / 52 };
export const VEND_TRAY = { x: 14 / 32, y: 47 / 52 };
export const vendCell = (i) => ({ x: (5.5 + (i % 4) * 5) / 32, y: (14 + Math.floor(i / 4) * 8) / 52 });
export const vendFrame = (kind, lit = 0, sel = -1, blink = 0, led = '', ic = false, tray = '', empty = -1, up = false) =>
  frame(`vend_${kind}_${lit}_${sel}_${blink}_${led}_${ic}_${tray}_${empty}_${up ? 1 : 0}`, vendArt(kind, lit, sel, blink, led, ic, tray, empty, up));
export const VEND_TRAY_COLORS = VEND_CANS;

const CAPSULE_DARK = { comum: '#2a3c9a', incomum: '#5a24b0', raro: '#8e1a9a', epico: '#a02a2a' };
export const capsuleIcon = (rarity) => icon(`capsule_${rarity}`);

defineIcons({
  gacha_icon: gachaArt(0, 0, 0, '', ''),
  slot_icon: slotArt(0, 0, 'idle'),
  vend_comida_icon: vendArt('comida', 0, -1, 0, '', false, '', -1),
  vend_bebida_icon: vendArt('bebida', 0, -1, 0, '', false, '', -1),
  ...Object.fromEntries(GACHA_ORDER.map((r) => [`capsule_${r}`, capsule(RARITY_COLOR[r], CAPSULE_DARK[r])])),
  sym_cereja: (s) => s(8, 8, ({ rect, circle, px }) => {
    rect(4, 0, 2, 1, '#3c8c5a'); px(3, 1, '#3c8c5a'); px(6, 1, '#3c8c5a'); px(2, 2, '#3c8c5a'); px(6, 2, '#3c8c5a');
    circle(2, 5, 2, '#e23b3b'); circle(6, 5, 2, '#c42a2a'); px(1, 4, '#ffb0b0'); px(5, 4, '#ffb0b0');
  }),
  sym_limao: (s) => s(8, 8, ({ rect, px }) => {
    rect(1, 2, 6, 4, '#ffd23f'); rect(2, 1, 4, 6, '#ffd23f'); px(0, 3, '#e8b400'); px(7, 4, '#e8b400'); px(2, 2, '#fff6b0');
  }),
  sym_sino: (s) => s(8, 8, ({ rect, px }) => {
    rect(3, 0, 2, 1, '#c98200'); rect(2, 1, 4, 2, '#ffc23a'); rect(1, 3, 6, 3, '#ffc23a'); rect(0, 6, 8, 1, '#c98200'); rect(3, 7, 2, 1, '#8a5a00'); px(2, 2, '#fff1b0');
  }),
  sym_estrela: (s) => s(8, 8, ({ rect }) => {
    rect(3, 0, 2, 2, '#ffd23f'); rect(0, 2, 8, 2, '#ffd23f'); rect(1, 4, 6, 1, '#ffd23f'); rect(1, 5, 2, 2, '#ffd23f'); rect(5, 5, 2, 2, '#ffd23f'); rect(3, 2, 1, 1, '#fff6b0');
  }),
  sym_diamante: (s) => s(8, 8, ({ rect, px }) => {
    rect(1, 1, 6, 1, '#9ff6ff'); rect(0, 2, 8, 2, '#5ef0ff'); rect(1, 4, 6, 1, '#3fc1e0'); rect(2, 5, 4, 1, '#3fc1e0'); rect(3, 6, 2, 1, '#2a9ac0'); px(2, 2, '#ffffff');
  }),
  sym_sete: (s) => s(8, 8, ({ rect }) => {
    rect(0, 0, 8, 2, '#e23b3b'); rect(5, 2, 2, 2, '#e23b3b'); rect(4, 4, 2, 2, '#e23b3b'); rect(3, 6, 2, 2, '#e23b3b');
  }),
});
