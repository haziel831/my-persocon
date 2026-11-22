// Furniture, extra consoles, ball types, mangás and the party (disco) kit: catalog, pixel art
// and what the pet does with each one. Toys delegates placement/drag to this through play().
import { icon, defineIcons, refreshIcon, cartridge, CART_SHEET_CELLS } from './pixel.js';
import { GACHA_PRICE, figureById, paintFigure } from './casinoitems.js';
import { upIcon, upSize, ARCADE_SCREEN } from './upgrades.js';
import { ArcadeShooter } from './arcadeshooter.js';
import { crtFilter, GAMES } from './games.js';
import { ATTR_XP, MANGA_RARITY_XP } from './attrxp.js';

const tvActive = (app, pet) => !!app.tvWatch?.on
  || pet.activity === 'watch'
  || baseId(String(pet.toyPlay?.id || '')) === 'videogame';
import { RARITIES } from './lootitems.js';
import { dollBonus, dollWave, dollHasSkill } from './dollskills.js';

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (l) => l[Math.floor(Math.random() * l.length)];
const clamp = (v, a, b) => Math.min(Math.max(v, a), b);

// Front-facing cartridge art (same cells as the shop sheet) drawn on the Gaming Shelf.
const CART_ART = typeof Image === 'undefined' ? null : new Image();
if (CART_ART) CART_ART.src = new URL('./assets/carts/carts_atlas.png', import.meta.url).href;

// ---------- pixel art ----------
// The three handhelds are painted as standalone functions (1x) so the Gaming Shelf can draw
// them again in its top display slots, at 2x, without going through the icon cache.
const paintBuddy = ({ rect, px }) => {
  rect(1, 0, 12, 1, '#c9c6cf'); rect(0, 1, 14, 19, '#c9c6cf'); rect(0, 20, 13, 1, '#c9c6cf'); rect(0, 21, 12, 1, '#c9c6cf'); rect(1, 22, 10, 1, '#c9c6cf');
  rect(1, 1, 12, 1, '#b4b1bb');
  rect(2, 3, 10, 8, '#5b5a6a'); rect(4, 4, 6, 6, '#9bbc0f'); px(3, 6, '#e8433f');
  rect(5, 8, 2, 1, '#306230'); px(6, 7, '#306230'); rect(8, 5, 1, 2, '#306230');
  rect(2, 12, 5, 1, '#8e8b96');
  rect(1, 15, 3, 1, '#2b2b36'); rect(2, 14, 1, 3, '#2b2b36');
  px(11, 14, '#a0233b'); px(9, 15, '#a0233b');
  px(5, 18, '#8e8b96'); px(7, 18, '#8e8b96');
  for (const [x, y] of [[9, 20], [10, 19], [11, 18], [11, 20], [12, 19]]) px(x, y, '#9e9ba6');
};
const paintGameGlow = ({ rect, px }) => {
  rect(0, 1, 22, 11, '#26262c'); rect(1, 0, 20, 12, '#26262c'); rect(6, 2, 10, 8, '#0c1a10'); rect(7, 3, 8, 6, '#4ad07a');
  rect(6, 2, 10, 1, '#5ac8ff'); rect(6, 9, 10, 1, '#5ac8ff'); px(6, 3, '#5ac8ff'); px(15, 3, '#5ac8ff');
  rect(1, 5, 3, 1, '#555'); rect(2, 4, 1, 3, '#555'); rect(18, 4, 2, 2, '#5ac8ff'); rect(18, 7, 2, 2, '#4a7bd5');
};
const paintPlayPocket = ({ rect, px }) => {
  rect(1, 0, 24, 11, '#16161c'); rect(0, 1, 26, 9, '#16161c'); rect(7, 1, 12, 9, '#05050a'); rect(8, 2, 10, 7, '#2c3e7a');
  rect(7, 1, 12, 1, '#2fb4ff'); rect(7, 9, 12, 1, '#2fb4ff'); px(7, 2, '#2fb4ff'); px(18, 2, '#2fb4ff');
  rect(2, 4, 3, 1, '#666'); rect(3, 3, 1, 3, '#666'); rect(21, 3, 1, 1, '#c33'); rect(23, 4, 1, 1, '#3c3'); rect(21, 5, 1, 1, '#33c'); rect(19, 4, 1, 1, '#cc3');
};
defineIcons({
  bed: (sprite) => sprite(34, 18, ({ rect }) => {
    rect(0, 2, 3, 16, '#8a5a2b'); rect(31, 6, 3, 12, '#8a5a2b');
    rect(2, 9, 30, 5, '#f4f1ea'); rect(3, 6, 8, 4, '#ffffff');
    rect(11, 7, 21, 6, '#d94a4a'); rect(11, 7, 21, 1, '#f07272');
    rect(2, 14, 30, 2, '#6e4520');
  }),
  tvset: (sprite) => sprite(30, 30, ({ rect }) => {
    rect(9, 0, 1, 4, '#555'); rect(20, 0, 1, 4, '#555');
    rect(1, 4, 28, 19, '#3b3b46'); rect(3, 6, 24, 15, '#050507');
    rect(12, 23, 6, 2, '#2a2a33');
    rect(5, 25, 20, 5, '#c9c6c0'); rect(5, 27, 20, 1, '#8c8a86'); rect(7, 28, 4, 1, '#d33c3c'); rect(19, 26, 4, 2, '#333');
  }),
  joystick: (sprite) => sprite(12, 7, ({ rect }) => {
    rect(0, 0, 12, 7, '#c9c6c0'); rect(1, 3, 3, 1, '#222'); rect(2, 2, 1, 3, '#222'); rect(8, 2, 1, 2, '#d33c3c'); rect(10, 3, 1, 2, '#d33c3c'); rect(5, 3, 2, 1, '#555');
  }),
  globo: (sprite) => sprite(14, 18, ({ rect, circle }) => {
    rect(6, 0, 2, 4, '#888'); circle(7, 11, 6, '#c8ccd8');
    for (let y = 5; y < 18; y += 2) for (let x = 1; x < 14; x += 2) rect(x, y, 1, 1, '#f4f6ff');
    rect(4, 8, 2, 2, '#ffffff');
  }),
  holofote: (sprite) => sprite(14, 16, ({ rect, circle }) => {
    rect(6, 9, 2, 5, '#333'); rect(3, 14, 8, 2, '#333'); circle(7, 6, 5, '#2b2b36'); circle(7, 6, 3, '#fff3a6');
  }),
  laser: (sprite) => sprite(14, 10, ({ rect }) => {
    rect(0, 3, 14, 7, '#26262e'); rect(10, 5, 3, 3, '#ff3b6b'); rect(2, 5, 1, 1, '#5fd36a'); rect(4, 5, 1, 1, '#5fd36a');
  }),
  fumaca: (sprite) => sprite(16, 11, ({ rect, circle }) => {
    rect(0, 4, 13, 7, '#3a3a46'); rect(13, 6, 3, 3, '#555'); circle(4, 2, 2, '#d8dbe6'); circle(8, 1, 1, '#d8dbe6');
  }),
  confete: (sprite) => sprite(12, 16, ({ rect }) => {
    rect(3, 4, 6, 12, '#ffb347'); rect(3, 6, 6, 2, '#ff5fa2'); rect(3, 11, 6, 2, '#5fb8ff');
    rect(1, 0, 1, 1, '#ff5fa2'); rect(6, 1, 1, 1, '#5fd36a'); rect(10, 0, 1, 1, '#ffd23f'); rect(4, 2, 1, 1, '#5fb8ff');
  }),
  alvo: (sprite) => sprite(22, 26, ({ rect, circle }) => {
    rect(4, 18, 3, 8, '#8a5a2b'); rect(15, 18, 3, 8, '#8a5a2b');
    circle(11, 10, 10, '#f4f1ea'); circle(11, 10, 8, '#e23c3c'); circle(11, 10, 6, '#f4f1ea'); circle(11, 10, 4, '#e23c3c'); circle(11, 10, 1, '#ffd23f');
  }),
  dart: (sprite) => sprite(10, 3, ({ rect }) => { rect(0, 1, 7, 1, '#555'); rect(7, 0, 3, 3, '#e23c3c'); }),
  tub: (sprite) => sprite(34, 17, ({ rect }) => {
    rect(29, 0, 2, 6, '#b8bcc8'); rect(26, 0, 4, 2, '#b8bcc8'); rect(26, 2, 2, 1, '#8fd3ff');
    rect(1, 5, 32, 2, '#ffffff'); rect(2, 7, 30, 6, '#eef2f8'); rect(4, 13, 26, 1, '#d6dce8');
    rect(2, 7, 30, 1, '#c9d2e2'); rect(4, 9, 6, 2, '#ffffff');
    for (let x = 3; x < 31; x += 5) rect(x, 4, 4, 1, '#ffffff');
    rect(4, 14, 3, 3, '#d9b04a'); rect(27, 14, 3, 3, '#d9b04a');
  }),
  almofada: (sprite) => sprite(22, 9, ({ rect }) => {
    rect(1, 1, 20, 8, '#7a5cff'); rect(0, 2, 22, 6, '#7a5cff'); rect(2, 2, 18, 2, '#9a85ff'); rect(10, 4, 2, 2, '#ffd23f');
  }),
  buddy: (sprite) => sprite(14, 23, paintBuddy),
  buddy_back: (sprite) => sprite(14, 23, ({ rect, px }) => {
    rect(1, 0, 12, 1, '#c9c6cf'); rect(0, 1, 14, 19, '#c9c6cf'); rect(0, 20, 13, 1, '#c9c6cf'); rect(0, 21, 12, 1, '#c9c6cf'); rect(1, 22, 10, 1, '#c9c6cf');
    rect(3, 0, 8, 7, '#9e9ba6'); rect(4, 1, 6, 4, '#5b5a6a'); rect(5, 2, 4, 2, '#9bbc0f');
    px(1, 2, '#8e8b96'); px(12, 2, '#8e8b96');
    rect(3, 11, 8, 9, '#b4b1bb'); for (const y of [13, 15, 17]) rect(5, y, 4, 1, '#8e8b96');
  }),
  gamegear: (sprite) => sprite(22, 12, paintGameGlow),
  psp: (sprite) => sprite(26, 11, paintPlayPocket),
  // Backs of the handhelds (what we see while the pet plays facing the screen).
  gamegear_back: (sprite) => sprite(22, 12, ({ rect, px }) => {
    rect(0, 1, 22, 11, '#26262c'); rect(1, 0, 20, 12, '#26262c'); rect(6, 0, 10, 1, '#0e0e12');
    rect(1, 3, 6, 8, '#1c1c21'); rect(15, 3, 6, 8, '#1c1c21');
    for (const y of [4, 6, 8]) { rect(2, y, 4, 1, '#34343d'); rect(16, y, 4, 1, '#34343d'); }
    rect(8, 3, 6, 5, '#3a3a45'); rect(9, 4, 4, 1, '#9a9aa8'); rect(9, 6, 3, 1, '#5fd0ff');
    rect(8, 2, 6, 1, '#5ac8ff'); px(8, 8, '#5ac8ff'); px(13, 8, '#5ac8ff');
    px(8, 10, '#5a5a66'); px(13, 10, '#5a5a66'); rect(9, 10, 4, 1, '#121216');
  }),
  psp_back: (sprite) => sprite(26, 11, ({ rect, circle, px }) => {
    rect(1, 0, 24, 11, '#16161c'); rect(0, 1, 26, 9, '#16161c');
    circle(13, 5, 4, '#272731'); circle(13, 5, 3, '#3a3a48'); circle(13, 5, 1, '#16161c'); rect(11, 3, 2, 1, '#6c6c80');
    rect(3, 4, 5, 1, '#55556a'); rect(3, 6, 4, 1, '#383848');
    rect(18, 3, 6, 5, '#1d1d25'); rect(19, 4, 4, 1, '#2e2e3a'); rect(19, 6, 4, 1, '#2e2e3a');
    px(24, 9, '#5a5a66'); rect(6, 0, 3, 1, '#2a2a34'); rect(17, 0, 3, 1, '#2a2a34');
  }),
  // Balls: 17x17 with the circle centered and no baked light (they spin; ball.js shades them).
  volleyball: (sprite) => sprite(17, 17, ({ circle, rect }) => {
    circle(8, 8, 7, '#f4f1ea'); rect(2, 6, 13, 2, '#ffd23f'); rect(4, 10, 10, 2, '#3c6be0'); rect(7, 1, 2, 5, '#3c6be0');
  }, undefined, true, false),
  basketball: (sprite) => sprite(17, 17, ({ circle, rect }) => {
    circle(8, 8, 7, '#f08a2b'); rect(1, 8, 15, 1, '#2b1a0a'); rect(8, 1, 1, 15, '#2b1a0a'); rect(4, 3, 1, 11, '#2b1a0a'); rect(12, 3, 1, 11, '#2b1a0a');
  }, undefined, true, false),
  dodgeball: (sprite) => sprite(17, 17, ({ circle, rect }) => {
    circle(8, 8, 7, '#d93a3a'); rect(3, 8, 11, 1, '#a82424'); rect(8, 3, 1, 3, '#f0d0d0'); rect(8, 11, 1, 3, '#f0d0d0');
  }, undefined, true, false),
  doll: (sprite) => sprite(10, 20, ({ rect }) => {
    rect(2, 0, 6, 6, '#c69c6d'); rect(2, 0, 6, 2, '#4a2f1a'); rect(3, 3, 1, 1, '#333'); rect(6, 3, 1, 1, '#333');
    rect(2, 6, 6, 7, '#3fa9b5'); rect(0, 6, 2, 7, '#c69c6d'); rect(8, 6, 2, 7, '#c69c6d'); rect(2, 13, 3, 7, '#3b3f9e'); rect(5, 13, 3, 7, '#3b3f9e');
  }),
});

// ---------- mangás: 10 per genre ----------
export const MANGA_GENRES = {
  aventura: { label: 'Aventura', color: '#e2603b', symbol: '#ffd23f', gain: { mood: 0.35 }, react: 'excite' },
  romance: { label: 'Romance', color: '#ff6fb5', symbol: '#ffffff', gain: { mood: 0.3, energy: 0.03 }, react: 'love' },
  terror: { label: 'Terror', color: '#3a2f4a', symbol: '#d33c3c', gain: { mood: 0.2, energy: -0.04 }, react: 'scare' },
  comedia: { label: 'Comédia', color: '#ffd23f', symbol: '#3c6be0', gain: { mood: 0.45 }, react: 'laugh' },
};
const TITLES = {
  aventura: ['Lâmina do Horizonte', 'Piratas de Cristal', 'O Último Dragão', 'Rumo ao Topo', 'Caçadores de Ruínas', 'Vento Selvagem', 'Ilha Perdida', 'Coração de Ferro', 'Estrada Estelar', 'Mapa Proibido'],
  romance: ['Carta sob a Cerejeira', 'Café às Cinco', 'Promessa de Verão', 'Guarda-chuva Dividido', 'Notas de Piano', 'Sorriso na Estação', 'Festival de Lanternas', 'Dois Corações', 'Primeira Neve', 'Bilhete Secreto'],
  terror: ['A Casa do Fim da Rua', 'Sussurros no Poço', 'Boneca de Porcelana', 'Escola à Meia-noite', 'O Espelho', 'Floresta sem Volta', 'Hospital Abandonado', 'Olhos na Janela', 'Ritual', 'Túnel 7'],
  comedia: ['Gato Chefe', 'Clube dos Preguiçosos', 'Meu Vizinho Ninja', 'Desastre na Cozinha', 'Escola dos Malucos', 'Robô Atrapalhado', 'Férias Caóticas', 'O Herói Desajeitado', 'Pizza Lendária', 'Tio Samurai'],
};
const hsl = (h, s, l) => `hsl(${h}, ${s}%, ${l}%)`;
// Fixed rarity per position (0–9): every genre gets the same spread, so saves stay deterministic.
const MANGA_RARITIES = ['comum', 'comum', 'incomum', 'comum', 'raro', 'incomum', 'comum', 'epico', 'incomum', 'lendario'];
export const MANGAS = Object.entries(TITLES).flatMap(([genre, list]) => list.map((title, i) => ({
  id: `manga_${genre}_${i}`, genre, title, vol: 1 + (i % 3), hue: (i * 37 + genre.length * 50) % 360,
  rarity: MANGA_RARITIES[i],
})));
// Capas reais recortadas de Assets/mangas.jfif (40 capas, 10 por gênero, ordem de MANGAS).
const mangaCover = (idx) => new URL(`./assets/mangas/manga_${String(idx).padStart(2, '0')}.png`, import.meta.url).href;
export function mangaIcon(m) {
  if (typeof document === 'undefined') return '';
  return mangaCover(MANGAS.indexOf(m));
}
// A mesma capa é usada nas mãos da Persocon e do Doll ao ler.
export function mangaCoverIcon(m) {
  if (typeof document === 'undefined') return '';
  return mangaCover(MANGAS.indexOf(m));
}

// ---------- shelf art sources ----------
// The shelves show the real covers and the real cartridge art. Both are shrunk once to the
// size of a slot (with a good filter) and then pasted 1:1 in the shelf picture, so the shelf
// can be shown at its own resolution without any blur.
const mangaImgs = [];
const mangaMinis = new Array(MANGAS.length).fill(null);
const cartMinis = [];

const shrink = (img, sx, sy, sw, sh, dw, dh) => {
  const c = document.createElement('canvas');
  c.width = dw;
  c.height = dh;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = true;
  g.imageSmoothingQuality = 'high';
  g.drawImage(img, sx, sy, sw, sh, 0, 0, dw, dh);
  return c;
};
// How many covers/cartridges are ready to be drawn (the shelf is redrawn as they arrive).
export const shelfArtReady = () => mangaMinis.filter(Boolean).length + cartMinis.filter(Boolean).length;

// Loads the covers and the cartridge sheet and shrinks them to slot size.
function loadShelfArt() {
  if (typeof document === 'undefined') return;
  for (let i = 0; i < MANGAS.length; i++) {
    if (mangaMinis[i]) continue;
    let im = mangaImgs[i];
    if (!im) {
      im = mangaImgs[i] = new Image();
      im.onload = () => { mangaMinis[i] = shrink(im, 0, 0, im.naturalWidth, im.naturalHeight, MANGA_W, MANGA_H); };
      im.src = mangaCover(i);
      continue;
    }
    if (im.complete && im.naturalWidth) mangaMinis[i] = shrink(im, 0, 0, im.naturalWidth, im.naturalHeight, MANGA_W, MANGA_H);
  }
  if (!cartMinis.length && CART_ART?.complete && CART_ART.naturalWidth) {
    for (const id of CART_SHEET_CELLS) {
      const idx = CART_SHEET_CELLS.indexOf(id);
      const sx = (idx % 4) * 128;
      const sy = Math.floor(idx / 4) * 128;
      // The label of the cartridge (the colourful part in the middle of the cell).
      cartMinis.push(shrink(CART_ART, sx + 48, sy + 16, 64, 64, CART_W - 2, 13));
    }
  }
}

// ---------- catalog ----------
const item = (id, cat, name, price, pixName, extra = {}) => ({
  id, cat, name, price, pix: pixName, effects: {}, toy: true, ...extra,
  get img() { return typeof document === 'undefined' ? '' : icon(this.pix); },
});
// size/ratio: width in pet heights and height/width; back: drawn behind the pet.
export const FURN = {
  cama: { size: 0.75, ratio: 18 / 34, back: true },
  videogame: { size: 0.55, ratio: 1, back: true, screen: { x: 3 / 30, y: 6 / 30, w: 24 / 30, h: 15 / 30 } },
  almofada: { size: 0.38, ratio: 9 / 22, back: true },
  banheira: { size: 0.72, ratio: 17 / 34 },
  // The shelves keep their original size: the picture is 97x118 (111x141 for the Pro).
  estante: { size: 0.6, ratio: 118 / 97, back: true },
  estante_cartuchos: { size: 0.6, ratio: 118 / 97, back: true },
  alvo: { size: 0.4, ratio: 26 / 22, back: true },
  escrivaninha: { size: 0.8, ratio: 36 / 48, back: true },
  cafeteira: { size: 0.88, ratio: 42 / 32, back: true },
  vitrine_doces: { size: 0.62, ratio: 25 / 20, back: true },
  mesa_cafe: { size: 0.58, ratio: 28 / 19, back: true },
  mural: { size: 0.7, ratio: 22 / 30, back: true },
  globo: { size: 0.16, ratio: 18 / 14, disco: true },
  holofote: { size: 0.2, ratio: 16 / 14, disco: true },
  laser: { size: 0.2, ratio: 10 / 14, disco: true },
  fumaca: { size: 0.24, ratio: 11 / 16, disco: true },
  confete: { size: 0.15, ratio: 16 / 12, disco: true },
  gamegear: { size: 0.24, ratio: 12 / 22, console: true },
  psp: { size: 0.28, ratio: 11 / 26, console: true },
  impressora: { size: 0.52, ratio: 1, back: true },
  gacha: { size: 0.5, ratio: 44 / 26, back: true },
  slot: { size: 0.62, ratio: 40 / 28, back: true },
  venda_comida: { size: 0.72, ratio: 52 / 32, back: true },
  venda_bebida: { size: 0.72, ratio: 52 / 32, back: true },
  // Width ≈ half her height so drawn height (size×ratio) ≈ 1× pet height.
  boneco_treino: { size: 0.48, ratio: 28 / 16, back: true },
};
// Each shelf has 5 rows of 13 slots: a mangá takes one, a figure two.
const SHELF_ROWS = 5;
const SHELF_COLS = 13;
// ---------- shelf grid (pixels of the shelf picture) ----------
// The picture keeps the original size (97x118, 111x141 for the Pro) so the furniture looks
// exactly as before; only the drawing of the items inside got better.
const SHELF_CELL = 7;    // column pitch
const SHELF_ROWP = 23;   // row pitch (the original one)
const SHELF_PADX = 6;    // frame padding on the sides
const MANGA_H = 19;      // cover: ~85% of the row
const MANGA_W = 7;
const FIG_H = 20;        // collectible figure: the 14x20 sprite
const FIG_W = 14;
const CART_H = 19;       // cartridge, front view
const CART_W = 7;
// The three handhelds stand on the ROOF of the Gaming Shelf, outside the internal rows:
// each one has its own slot (left, center, right) and they shrink to fit side by side.
export const CONSOLE_SLOTS = [
  { id: 'gameboy', at: 0.24 },
  { id: 'gamegear', at: 0.5 },
  { id: 'psp', at: 0.76 },
];
const ROOF_W = 0.146;    // width of a docked handheld, as a fraction of the pet height
// 3D printer build area, in fractions of its picture (28x28): between the posts, down to the bed.
export const PRINT_AREA = { x1: 5 / 28, x2: 23 / 28, top: 6 / 28, bed: 21 / 28 };
export const BALLS = {
  bola: { pix: 'ball', bounce: 0.62, grav: 1, size: 0.11, mode: 'futebol', drag: 0.1, roll: 0.7 },
  bola_volei: { pix: 'volleyball', bounce: 0.72, grav: 0.75, size: 0.12, mode: 'volei', drag: 0.35, roll: 1.1 },
  bola_basquete: { pix: 'basketball', bounce: 0.82, grav: 1, size: 0.12, mode: 'basquete', drag: 0.12, roll: 0.9 },
  bola_queimada: { pix: 'dodgeball', bounce: 0.55, grav: 1.05, size: 0.115, mode: 'queimada', drag: 0.2, roll: 1.5 },
};
export const CONSOLES = { gameboy: 'gb', gamegear: 'gg', psp: 'psp' };

// Decor (party kit) can be placed many times: copies are saved as "globo#2", "globo#3"…
export const baseId = (key) => String(key).split('#')[0];

export const FURN_ITEMS = [
  item('cama', 'mobilia', 'Cama', 300, 'bed', { furn: true, gain: { energy: 0.1, mood: 0.2 }, note: 'Dorme deitado de lado até encher a energia · às vezes senta ou deita para brincar' }),
  item('videogame', 'mobilia', 'TV / VideoGame', 450, 'tvset', { furn: true, gain: { mood: 0.5 }, note: 'Senta de frente para a TV e joga qualquer cartucho · come pipoca e bebe refri enquanto joga' }),
  item('almofada', 'mobilia', 'Almofada', 90, 'almofada', { furn: true, gain: { mood: 0.2, energy: 0.12 }, note: 'Senta para descansar e brincar' }),
  item('banheira', 'mobilia', 'Banheira', 320, 'tub', { furn: true, gain: { hygiene: 6, mood: 0.3, energy: 0.05 }, note: 'Toma banho de espuma sozinha quando está suja · clique para mandar tomar banho' }),
  item('estante', 'mobilia', 'Estante', 250, 'estante_icon', { furn: true, decor: true, noWear: true, note: 'Guarda 65 mangás ou 30 bonecos colecionáveis · pode ter várias · a Persocon lê e brinca sozinha' }),
  item('estante_cartuchos', 'mobilia', 'Gaming Shelf', 250, 'estante_cart_icon', { furn: true, decor: true, noWear: true, note: 'Guarda cartuchos e os portáteis no topo · aceita só cartuchos · com ela a bolsa de cartuchos some · clique para ver a lista' }),
  item('gacha', 'mobilia', 'Gacha-Machine', 600, 'gacha_icon', { furn: true, noWear: true, note: `Clique para girar (¥ ${GACHA_PRICE}, você paga) · ela também gira sozinha com a carteira dela · cápsulas Comum, Incomum, Rara e Épica: moedas (para você), comidas, bebidas e bonecos colecionáveis` }),
  item('slot', 'mobilia', 'Slot-Machine', 800, 'slot_icon', { furn: true, noWear: true, note: 'Ela aposta as moedas da carteira dela · os ganhos vão para você · clique para pedir uma rodada · a sorte vem da Afeição' }),
  item('alvo', 'mobilia', 'Alvo', 160, 'alvo', { furn: true, gain: { mood: 0.35 }, note: 'Clique para um minigame de 3 minutos com recorde · a Persocon também joga dardos' }),
  item('mural', 'mobilia', 'Mural de Recados e Fotos', 220, 'mural', {
    furn: true, decor: true, noWear: true,
    note: 'Mostra as últimas fotos do álbum da câmera e um post-it curto que você pode editar',
  }),
  item('cafeteira', 'mobilia', 'Cafeteira / Estação de Chá', 300, 'cafeteira', {
    furn: true, noWear: true, gain: { mood: 0.08, energy: 0.03 },
    note: 'Chá e Café pela carteira dela · nunca dá reação ruim · com upgrade vira a Estação Energy Neon',
  }),
  item('vitrine_doces', 'mobilia', 'Máquina de Espresso', 260, 'cafe_espresso', {
    furn: true, noWear: true, gain: { mood: 0.12, energy: 0.05 },
    note: 'Máquina de espresso decorativa e interativa · combina com a Cafeteira e com as pausas do Pomodoro',
  }),
  item('mesa_cafe', 'mobilia', 'Cafeteira Clássica', 220, 'cafe_machine', {
    furn: true, noWear: true, gain: { mood: 0.1, energy: 0.04 },
    note: 'Cafeteira de filtro clássica, decorativa e interativa · nunca dá reação ruim',
  }),
  item('escrivaninha', 'mobilia', 'Escrivaninha com Abajur', 260, 'escrivaninha', {
    furn: true, noWear: true, gain: { mood: 0.12, energy: 0.05 },
    note: 'Estuda e lê com a luz do abajur · treina Inteligência em sessões de foco · o abajur acende sozinho à noite',
  }),
  item('boneco_treino', 'mobilia', 'Boneco de treino', 200, 'dummy', {
    furn: true, noWear: true, gain: { mood: 0.25, energy: -0.08, thirst: -0.06 },
    note: 'Tamanho dela · balança como pino de boliche · combate por turnos desarmada (só socos) · o treino acaba quando ela fica sem energia',
  }),
  item('globo', 'mobilia', 'Globo de luz', 140, 'globo', { furn: true, decor: true, note: 'Liga ao Ouvir Música · mova no Editar mobília (até para o alto) · pode ter vários · botão direito: cor e intensidade' }),
  item('holofote', 'mobilia', 'Holofotes', 120, 'holofote', { furn: true, decor: true, note: 'Liga ao Ouvir Música · mova no Editar mobília (até para o alto) · pode ter vários · botão direito: cor e intensidade' }),
  item('laser', 'mobilia', 'Lasers', 160, 'laser', { furn: true, decor: true, note: 'Liga ao Ouvir Música · mova no Editar mobília (até para o alto) · pode ter vários · botão direito: cor e intensidade' }),
  item('fumaca', 'mobilia', 'Máquina de fumaça', 130, 'fumaca', { furn: true, decor: true, note: 'Liga ao Ouvir Música · mova no Editar mobília (até para o alto) · pode ter vários · botão direito: cor e intensidade' }),
  item('confete', 'mobilia', 'Lança-confete', 90, 'confete', { furn: true, decor: true, note: 'Liga ao Ouvir Música · mova no Editar mobília (até para o alto) · pode ter vários · botão direito: cor e intensidade' }),
  item('impressora', 'mobilia', 'Impressora 3D', 0, 'printer3d', { furn: true, fixed: true, note: 'Imprime as compras uma de cada vez, em fila · a Persocon pega cada item e guarda' }),
  item('gamegear', 'fun', 'GameGlow', 320, 'gamegear', { baggable: true, gain: { mood: 0.58 }, note: 'Aceita todos os cartuchos · mais divertido que o GameBuddy' }),
  item('psp', 'fun', 'PlayPocket 3000', 480, 'psp', { baggable: true, gain: { mood: 0.66 }, note: 'Aceita todos os cartuchos · o mais divertido dos portáteis' }),
  item('bola_volei', 'fun', 'Bola de vôlei', 90, 'volleyball', { baggable: true, gain: { mood: 0.35, energy: -0.1, hunger: -0.04, thirst: -0.07 }, note: 'Rebate na parede' }),
  item('bola_basquete', 'fun', 'Bola de basquete', 100, 'basketball', { baggable: true, gain: { mood: 0.35, energy: -0.1, hunger: -0.04, thirst: -0.07 }, note: 'Dribla e arremessa' }),
  item('bola_queimada', 'fun', 'Bola de queimada', 70, 'dodgeball', { baggable: true, weapon: 'queimada', gain: { mood: 0.35, energy: -0.1, hunger: -0.04, thirst: -0.07 }, note: 'Arremessos fortes · arma com níveis de arremesso' }),
  ...MANGAS.map((m) => ({
    id: m.id, cat: 'mangas', manga: m, name: `${m.title} vol. ${m.vol}`, price: 25 + m.vol * 10, effects: {},
    note: `${MANGA_GENRES[m.genre].label} · ${RARITIES[m.rarity].label} · vai para a Estante`,
    get img() { return mangaIcon(m); },
  })),
];

defineIcons({
  estante_cart_icon: (sprite) => sprite(24, 30, ({ rect }) => {
    rect(0, 0, 24, 30, '#262633'); rect(1, 1, 22, 28, '#14141c');
    rect(0, 0, 24, 1, '#5ef0ff'); rect(23, 1, 1, 28, '#5ef0ff'); rect(0, 29, 24, 1, '#ff3ea5'); rect(0, 1, 1, 28, '#ff3ea5');
    for (let r = 0; r < 4; r++) {
      rect(1, 7 + r * 7, 22, 1, r % 2 ? '#ff7ac8' : '#7af4ff');
      rect(1, 8 + r * 7, 22, 1, '#22222c');
    }
    ['#e94b6a', '#4c8ef0', '#7bd35a', '#ffa53a', '#ffd23f'].forEach((c, i) => {
      const x = 3 + i * 4;
      rect(x, 2, 3, 5, '#9a98a4');
      rect(x, 2, 3, 1, '#bdbbc6');
      rect(x + 1, 3, 1, 3, c);
    });
  }),
});
defineIcons({ estante_icon: (sprite) => sprite(24, 30, ({ rect }) => {
  rect(0, 0, 24, 30, '#8a5a2b'); rect(1, 1, 22, 28, '#5a3818');
  for (let r = 0; r < 4; r++) rect(1, 7 + r * 7, 22, 1, '#8a5a2b');
  ['#e2603b', '#ff6fb5', '#3a2f4a', '#ffd23f', '#3c6be0'].forEach((c, i) => rect(3 + i * 3, 2, 2, 5, c));
}) });

// Desk with lamp: the lit variant is used at night/dawn and during a focus session.
const paintDesk = ({ rect, px }, lit, up) => {
  const wood = up ? '#1a1330' : '#8a5a2b';
  const woodHi = up ? '#3a2a58' : '#b0793f';
  const woodLo = up ? '#100c20' : '#5a3818';
  // Tampo chanfrado (3 tons + contorno).
  rect(0, 11, 48, 3, '#1d1a26'); rect(1, 9, 46, 3, wood); rect(1, 9, 46, 1, woodHi);
  rect(2, 12, 44, 2, woodLo);
  // Pés e gaveteiro lateral.
  rect(3, 14, 4, 19, wood); rect(3, 14, 1, 19, woodHi); rect(41, 14, 4, 19, wood); rect(41, 14, 1, 19, woodHi);
  rect(7, 14, 10, 16, woodLo); rect(8, 15, 8, 14, wood);
  [17, 22, 27].forEach((y) => { rect(10, y, 5, 1, '#c9c6d0'); px(12, y, '#8a909e'); });
  // Caderno aberto, lápis e pilha de livros.
  rect(18, 7, 12, 3, '#f4f1ea'); rect(19, 6, 10, 2, '#fffdf6'); rect(23, 6, 1, 3, '#c9c6d0');
  rect(31, 8, 6, 1, '#ffd23f'); px(37, 8, '#e2475a');
  rect(36, 6, 7, 2, '#3c6be0'); rect(36, 4, 7, 2, '#e2475a'); rect(37, 2, 6, 2, '#7fd8a0');
  // Abajur articulado.
  rect(43, 2, 2, 7, '#8a909e'); rect(40, 1, 7, 1, '#c9c6d0');
  rect(38, 2, 6, 3, up ? '#2c2048' : '#8a5a2b'); rect(38, 2, 6, 1, up ? '#5ef0ff' : '#b0793f');
  rect(39, 5, 4, 2, lit ? (up ? '#5ef0ff' : '#ffd23f') : '#8a8577');
  if (lit) {
    rect(20, 9, 18, 3, up ? 'rgba(94,240,255,0.35)' : 'rgba(255,210,63,0.35)');
    rect(23, 8, 12, 2, up ? 'rgba(94,240,255,0.5)' : 'rgba(255,244,200,0.6)');
    px(37, 4, '#ffffff'); px(39, 3, '#ffffff');
  }
  if (up) {
    rect(1, 12, 46, 1, lit ? '#ff3ea5' : '#7a3cff');
    rect(2, 28, 44, 1, '#5ef0ff');
  }
};
defineIcons({
  escrivaninha: (sprite) => sprite(48, 36, (p) => paintDesk(p, false, false)),
  escrivaninha_lamp: (sprite) => sprite(48, 36, (p) => paintDesk(p, true, false)),
  escrivaninha_up: (sprite) => sprite(52, 38, (p) => paintDesk(p, false, true)),
  escrivaninha_up_lit: (sprite) => sprite(52, 38, (p) => paintDesk(p, true, true)),
});

// Coffee/tea station: the two brew frames add a little animated steam.
const paintBrewer = ({ rect, px }, up, brew) => {
  const W = up ? 34 : 32;
  const body = up ? '#1a1030' : '#d8d4cc';
  const bodyHi = up ? '#2c2048' : '#f4f1ea';
  const bodyLo = up ? '#120c24' : '#8a8577';
  const accent = up ? '#ff3ea5' : '#c8553d';
  // Contorno + corpo.
  rect(0, 6, W, 32, '#1d1a26');
  rect(1, 7, W - 2, 29, body); rect(1, 7, W - 2, 2, bodyHi); rect(1, 34, W - 2, 2, bodyLo);
  if (up) {
    rect(1, 7, W - 2, 1, '#5ef0ff');
    rect(2, 10, 3, 24, '#7a3cff'); rect(W - 5, 10, 3, 24, '#ff3ea5');
    rect(4, 4, W - 8, 3, '#120c24'); rect(5, 4, W - 10, 1, '#5ef0ff');
    rect(8, 5, 3, 1, '#ffd23f'); rect(14, 5, 3, 1, '#5ef0ff'); rect(20, 5, 3, 1, '#ff3ea5');
  } else {
    rect(2, 7, W - 4, 2, '#f4f1ea');
    rect(3, 4, W - 6, 3, '#8a5a2b'); rect(3, 4, W - 6, 1, '#b0793f');
  }
  // Painel / display.
  rect(4, 12, W - 8, 7, up ? '#120c24' : '#3b3b46');
  rect(5, 13, W - 10, 5, up ? '#2c2048' : '#5b5e70');
  rect(6, 14, 8, 2, up ? '#5ef0ff' : '#ffd23f');
  px(W - 6, 14, brew ? (up ? '#5ef0ff' : '#7fd8a0') : (up ? '#ff3ea5' : '#d33c3c'));
  // Bico extrator + bandeja + xícara.
  rect(7, 21, 7, 2, bodyLo); rect(9, 23, 3, 4, '#8a909e');
  rect(5, 29, W - 10, 3, '#c9c6d0'); rect(5, 31, W - 10, 1, '#8a909e');
  rect(11, 26, 6, 4, '#f4f1ea'); rect(12, 27, 4, 2, '#5a3818'); rect(17, 27, 2, 2, '#f4f1ea');
  // Jarra de chá ao lado.
  rect(W - 9, 18, 6, 10, '#b5793a'); rect(W - 8, 17, 4, 2, '#d8a86a'); rect(W - 7, 15, 2, 2, '#8a5a2b');
  // Gavetinha (base madeira / bandeja neon).
  rect(4, 35, W - 8, 3, up ? '#2c2048' : '#8a5a2b'); rect(7, 36, W - 14, 1, up ? '#5ef0ff' : '#c9a06a');
  if (brew) {
    rect(10, 25, 1, 3, up ? '#5ef0ff' : '#6a3a1a');
    [[8, 9], [12, 6], [16, 8], [20, 4]].forEach(([x, y], i) => {
      px(x, y, up ? '#5ef0ff' : '#ffffff');
      px(x + 1, y - 1, i % 2 ? '#ff9a3d' : '#d8d4cc');
    });
    if (up) { rect(6, 30, W - 12, 1, 'rgba(94,240,255,0.55)'); px(4, 29, '#ffffff'); px(W - 5, 30, '#5ef0ff'); }
  }
};
defineIcons({
  cafeteira: (sprite) => sprite(32, 42, (p) => paintBrewer(p, false, false)),
  cafeteira_brew: (sprite) => sprite(32, 42, (p) => paintBrewer(p, false, true)),
  cafeteira_up: (sprite) => sprite(34, 48, (p) => paintBrewer(p, true, false)),
  cafeteira_up_brew: (sprite) => sprite(34, 48, (p) => paintBrewer(p, true, true)),
});
// Real sprites copied from the café item pack (nearest-neighbour, transparent PNGs).
const cafeArt = (file) => new URL(`./assets/cafe/${file}`, import.meta.url).href;
defineIcons({
  cafe_machine: () => cafeArt('coffee-machine.png'),
  cafe_espresso: () => cafeArt('espresso-machine.png'),
  cafe_pot: () => cafeArt('coffee-pot.png'),
  cafe_cup: () => cafeArt('cup.png'),
  cafe_drink: () => cafeArt('drink.png'),
  cafe_glass: () => cafeArt('glass.png'),
});
// Mural frames: five distinct looks, each in landscape and portrait.
export const MURAL_FRAMES = {
  cortica: { outer: '#8a5a2b', inner: '#c8a06a', board: '#e8dfc0', edge: '#cfc4a0', accent: '#d33c3c' },
  madeira: { outer: '#5a3818', inner: '#a87e48', board: '#f6efd8', edge: '#d8c49a', accent: '#3c6be0' },
  neon: { outer: '#120c24', inner: '#7a3cff', board: '#1a1030', edge: '#5ef0ff', accent: '#ff3ea5' },
  dourada: { outer: '#8a6a1a', inner: '#ffd23f', board: '#fff8d8', edge: '#e8c84a', accent: '#e2475a' },
  escura: { outer: '#1a1a22', inner: '#3a3a48', board: '#25252e', edge: '#5a5a6a', accent: '#ffd23f' },
};
const paintMural = ({ rect, px }, f, vertical) => {
  const W = vertical ? 22 : 30;
  const H = vertical ? 30 : 22;
  rect(0, 0, W, H, f.outer); rect(1, 1, W - 2, H - 2, f.inner);
  rect(3, 3, W - 6, H - 6, f.board);
  rect(4, 4, W - 8, 1, f.edge); rect(4, H - 5, W - 8, 1, f.edge);
  px(Math.floor(W / 2), 1, f.accent); px(Math.floor(W / 2), H - 2, f.accent);
  px(1, Math.floor(H / 2), f.accent); px(W - 2, Math.floor(H / 2), f.accent);
};
defineIcons({
  mural: (sprite) => sprite(30, 22, (p) => paintMural(p, MURAL_FRAMES.cortica, false)),
  ...Object.fromEntries(Object.entries(MURAL_FRAMES).flatMap(([key, f]) => [
    [`mural_${key}`, (sprite) => sprite(30, 22, (p) => paintMural(p, f, false))],
    [`mural_${key}_v`, (sprite) => sprite(22, 30, (p) => paintMural(p, f, true))],
  ])),
});

// Drinks sold ONLY by the cafeteira. `legacy` keeps them out of the common shop and vending
// machines; `noBadTaste` guarantees she never reacts badly to them.
const coffeeDrink = (id, name, price, effects, extra = {}) => ({
  id, cat: 'bebidas', name, price, effects: { thirst: 30, ...effects },
  coffee: true, legacy: true, noBadTaste: true, pix: `cd_${id}`,
  ...extra,
  get img() { return typeof document === 'undefined' ? '' : icon(this.pix); },
});

export const COFFEE_ITEMS = [
  // Base machine: short, gentle buffs (2.5 min).
  coffeeDrink('cha_quente', 'Chá', 12, { energy: 8, mood: 2 }, { buffs: [['doubleMood', 150]] }),
  coffeeDrink('cafe_forte', 'Café', 18, { energy: 16, mood: 2 }, { buffs: [['noTired', 150]] }),
  // Upgraded machine: exclusive, stronger and longer (5–8 min), one personality per flavour.
  coffeeDrink('voltmint', 'VoltMint', 38, { energy: 26, mood: 3 }, { energyDrink: true, buffs: [['noTired', 360], ['swift', 360]] }),
  coffeeDrink('neoberry_surge', 'NeoBerry Surge', 46, { energy: 22, mood: 10 }, { energyDrink: true, buffs: [['doubleMood', 420], ['shield', 300]] }),
  coffeeDrink('solaris_zero', 'Solaris Zero', 54, { energy: 24, mood: 4 }, { energyDrink: true, buffs: [['noTired', 480], ['luck', 480]] }),
  coffeeDrink('cybermatcha_rush', 'CyberMatcha Rush', 68, { energy: 28, mood: 6 }, { energyDrink: true, buffs: [['smart', 420], ['noTired', 360]], attrXp: { int: 4, con: 2 } }),
  coffeeDrink('hyperyuzu', 'HyperYuzu', 82, { energy: 36, mood: 8 }, { energyDrink: true, buffs: [['noTired', 480], ['doubleMood', 480], ['shield', 360]] }),
];

defineIcons(Object.fromEntries(COFFEE_ITEMS.map((it) => [it.pix, (sprite) => sprite(12, 16, ({ rect, px }) => {
  const cup = it.id === 'cha_quente' || it.id === 'cafe_forte';
  const colors = {
    cha_quente: '#b5793a', cafe_forte: '#5a3818', voltmint: '#3dd6a0', neoberry_surge: '#7a3cff',
    solaris_zero: '#ffd23f', cybermatcha_rush: '#7fd8a0', hyperyuzu: '#f4f1ea',
  };
  const c = colors[it.id];
  if (cup) {
    rect(2, 4, 8, 10, '#f4f1ea'); rect(2, 4, 8, 2, c); rect(3, 7, 6, 4, c);
    rect(9, 6, 2, 4, '#f4f1ea'); px(5, 2, '#ffffff'); px(7, 1, '#ffffff');
  } else {
    rect(3, 1, 6, 2, '#c0c4d0'); rect(3, 3, 6, 11, c); rect(3, 6, 6, 3, '#120c24');
    px(4, 4, '#ffffff'); px(4, 11, '#ffffff'); rect(3, 14, 6, 1, '#8a909e');
  }
})])));

// Cafeteira drinks use the real cup/pot/glass sprites from the same pack.
defineIcons({
  cd_cha_quente: () => cafeArt('coffee-pot.png'),
  cd_cafe_forte: () => cafeArt('cup.png'),
  cd_voltmint: () => new URL('./assets/consumables/sodas/soda_01.png', import.meta.url).href,
  cd_neoberry_surge: () => new URL('./assets/consumables/sodas/soda_02.png', import.meta.url).href,
  cd_solaris_zero: () => new URL('./assets/consumables/sodas/soda_03.png', import.meta.url).href,
  cd_cybermatcha_rush: () => new URL('./assets/consumables/sodas/soda_04.png', import.meta.url).href,
  cd_hyperyuzu: () => new URL('./assets/consumables/sodas/soda_05.png', import.meta.url).href,
});

defineIcons({
  dummy: (sprite) => sprite(16, 28, ({ rect, circle, px }) => {
    rect(7, 18, 2, 10, '#4a2e18'); rect(7, 18, 1, 10, '#6a4224');
    px(5, 18, '#e8c84a'); px(6, 19, '#d4b03a'); px(10, 18, '#e8c84a'); px(11, 19, '#c49a28');
    rect(3, 9, 10, 9, '#d8c49a'); rect(4, 9, 8, 1, '#e8d8b0'); rect(11, 10, 2, 7, '#b8a078');
    px(5, 12, '#a89068'); px(8, 14, '#a89068'); px(6, 15, '#a89068');
    rect(1, 11, 2, 3, '#c8b088'); rect(13, 11, 2, 3, '#c8b088');
    px(0, 11, '#e8c84a'); px(0, 13, '#d4b03a'); px(15, 11, '#e8c84a'); px(15, 13, '#c49a28');
    px(6, 8, '#e8c84a'); px(9, 8, '#d4b03a'); px(7, 8, '#c49a28');
    circle(8, 4, 3, '#e0d0a8'); rect(10, 3, 2, 3, '#c8b088');
    px(6, 3, '#3a2a18'); px(9, 3, '#3a2a18');
    px(5, 2, '#3a2a18'); px(7, 4, '#3a2a18'); px(8, 2, '#3a2a18'); px(10, 4, '#3a2a18');
    px(6, 5, '#5a3a28'); px(7, 6, '#5a3a28'); px(8, 5, '#5a3a28'); px(9, 6, '#5a3a28');
    circle(8, 13, 3, '#c02828'); circle(8, 13, 1, '#e83838');
  }),
  // The upgraded dummy: rusty scrap metal, exposed gears, bolts and mechanical joints.
  dummy_scrap: (sprite) => sprite(16, 28, ({ rect, circle, px }) => {
    // Base plate and the post.
    rect(4, 24, 8, 4, '#4a3b33'); rect(4, 24, 8, 1, '#6d564a');
    rect(6, 14, 4, 11, '#5a4a40'); rect(6, 14, 1, 11, '#7d6558');
    rect(3, 24, 10, 1, '#2f2620');
    // Torso: rusty plates with rivets.
    rect(3, 8, 10, 7, '#8a6b52'); rect(3, 8, 10, 1, '#b08a68');
    rect(4, 9, 8, 5, '#75563f'); rect(4, 9, 1, 5, '#9c7a5c');
    rect(7, 9, 2, 5, '#5e4534');
    px(3, 9, '#d8b487'); px(12, 9, '#d8b487'); px(3, 14, '#d8b487'); px(12, 14, '#d8b487');
    // Exposed gear on the chest.
    circle(8, 12, 2, '#c9a15e'); circle(8, 12, 1, '#6b4f2c'); px(8, 11, '#e8c88a');
    // Rust spots.
    px(5, 11, '#b5613a'); px(10, 13, '#b5613a'); px(6, 14, '#9c4f2f'); px(11, 10, '#9c4f2f');
    // Arms: scrap beams with bolts.
    rect(1, 9, 2, 6, '#6b5449'); rect(13, 9, 2, 6, '#6b5449');
    rect(0, 10, 1, 4, '#8a6b52'); rect(15, 10, 1, 4, '#8a6b52');
    px(1, 9, '#d8b487'); px(14, 9, '#d8b487'); px(1, 14, '#d8b487'); px(14, 14, '#d8b487');
    // Joints (mechanical shoulders).
    circle(2, 9, 1, '#3a3a44'); circle(13, 9, 1, '#3a3a44');
    // Head: a metal box with a single glowing eye and antennae.
    rect(5, 2, 6, 5, '#8a6b52'); rect(5, 2, 6, 1, '#b08a68'); rect(6, 3, 4, 3, '#5e4534');
    rect(7, 4, 2, 1, '#ff7a3d'); px(6, 3, '#d8b487'); px(9, 3, '#d8b487');
    px(5, 0, '#6b5449'); px(10, 0, '#6b5449'); px(5, 1, '#8a6b52'); px(10, 1, '#8a6b52');
    // Scrap on the head and a crack on the plates.
    px(4, 6, '#b5613a'); px(11, 6, '#b5613a'); px(9, 10, '#4a3b33');
  }),
});

defineIcons({ printer3d: (sprite) => sprite(28, 28, ({ rect, px }) => {
  rect(1, 1, 26, 3, '#4a4d5e'); rect(1, 1, 26, 1, '#6b6f84'); rect(11, 2, 6, 1, '#ff8a3d');
  rect(2, 4, 3, 18, '#5b5e70'); rect(23, 4, 3, 18, '#5b5e70'); rect(3, 4, 1, 18, '#7a7e93'); rect(24, 4, 1, 18, '#7a7e93');
  rect(6, 21, 16, 1, '#ff8a3d'); rect(6, 22, 16, 1, '#1f1f26');
  rect(0, 22, 28, 6, '#2c2e38'); rect(0, 22, 28, 1, '#45485a');
  rect(3, 24, 7, 3, '#12141a'); rect(4, 25, 4, 1, '#5ef0ff'); px(8, 25, '#ff8a3d');
  rect(20, 24, 2, 2, '#ff8a3d'); rect(23, 24, 2, 2, '#5b5e70');
}) });

// ---------- behaviors ----------
export class Furniture {
  constructor(app, toys) {
    this.app = app;
    this.toys = toys;
    this.fxCanvas = null;
    this.parts = [];
    this.target = null;
    this.darts = [];
    this.arcade = { playing: false, targets: [], booms: [], score: 0, t: 0, acc: 0, aim: { x: 18, y: 13 } };
  }

  get P() {
    return this.app.pet.P;
  }

  art(id, key = id) {
    const b = baseId(id);
    const up = !!this.app.game.toys[key]?.up;
    const skins = this.app.skins;
    // Custom skins win over every built-in sprite, including shelves, brewer and casino art.
    if (skins?.has?.(b, up)) {
      const casino = this.app.casino;
      const cur = casino?.cur;
      const vend = casino?.vend?.cur || casino?.vend?.out?.v;
      let active = false;
      if (b === 'gacha' || b === 'slot') {
        active = (!!cur && baseId(String(cur.id || '')) === b)
          || baseId(String(casino?.out?.s?.id || '')) === b;
      } else if (b === 'cafeteira' || b === 'venda_comida' || b === 'venda_bebida') {
        active = baseId(String(vend?.id || '')) === b;
      } else if (b === 'impressora') active = !!(this.toys.unpacking || this.app.game.deliveries?.length);
      else if (b === 'videogame') active = tvActive(this.app, this.app.pet);
      else if (b === 'banheira') active = /bath|banho/.test(this.app.pet.action || '');
      else if (b === 'escrivaninha') active = !!this.app.pomodoro?.active;
      const custom = skins.art(b, null, active, up);
      if (custom) return custom;
    }
    if (id === 'cafeteira') return this.app.casino?.vend?.art?.(id) || icon('cafeteira');
    if (id === 'estante' || id === 'estante_cartuchos') return this.shelfImage(key);
    if (this.toys.casino?.owns(id)) return this.toys.casino.art(id);
    return upIcon(id, this.app.game.toys[key]) || (this.toys.fun?.owns(id) ? this.toys.fun.art(id) : null);
  }

  // Gains of a piece; upgraded comfort pieces give more.
  gainOf(id, it) {
    const up = this.app.game.toys[id]?.up;
    if (!up || !it.gain) return it.gain;
    if (id === 'banheira') return { ...it.gain, hygiene: it.gain.hygiene * 1.5, energy: 0.2 };
    // Neon desk: a calm place to study, with a stronger energy recovery while she uses it.
    if (id === 'escrivaninha') return { mood: 0.2, energy: 0.22 };
    const k = id === 'almofada' ? 1.6 : id === 'cama' || id === 'videogame' ? 1.3 : 1;
    return Object.fromEntries(Object.entries(it.gain).map(([s, v]) => [s, v > 0 ? v * k : v]));
  }

  // Rows x columns of a shelf (the upgraded one is bigger).
  shelfDims(key) {
    return this.app.game.toys[key]?.up ? [6, 15] : [SHELF_ROWS, SHELF_COLS];
  }

  shelfKind(key) {
    return baseId(key) === 'estante_cartuchos' ? 'cart' : 'manga';
  }

  shelfKeys(kind) {
    const { game } = this.app;
    const base = kind === 'cart' ? 'estante_cartuchos' : 'estante';
    return Object.keys(game.toys)
      .filter((k) => baseId(k) === base && game.toys[k].placed)
      .sort((a, b) => (Number(a.split('#')[1]) || 1) - (Number(b.split('#')[1]) || 1));
  }

  // Placed manga shelves in order ("estante", "estante#2"…) and what each one holds: mangás first, then
  // the figures, filling row by row ({ manga | figure, row, col }).
  shelves() {
    const { game } = this.app;
    const keys = this.shelfKeys('manga');
    const out = new Map(keys.map((k) => [k, []]));
    let s = 0;
    let row = 0;
    let col = 0;
    const put = (entry, n) => {
      if (s >= keys.length) return;
      let [rows, cols] = this.shelfDims(keys[s]);
      if (col + n > cols) {
        row++;
        col = 0;
      }
      if (row >= rows) {
        s++;
        row = 0;
        col = 0;
      }
      if (s >= keys.length) return;
      out.get(keys[s]).push({ ...entry, row, col });
      col += n;
    };
    for (const id of game.mangas || []) put({ manga: id }, 1);
    for (const id of game.figures || []) put({ figure: id }, 2);
    return out;
  }

  // Placed gaming shelves and the cartridges each one holds (one slot per cartridge).
  cartShelves() {
    const { game } = this.app;
    const keys = this.shelfKeys('cart');
    const out = new Map(keys.map((k) => [k, []]));
    let s = 0;
    let row = 0;
    let col = 0;
    for (const id of game.cartridges || []) {
      if (s >= keys.length) break;
      const [rows, cols] = this.shelfDims(keys[s]);
      if (col >= cols) {
        row++;
        col = 0;
      }
      if (row >= rows) {
        s++;
        row = 0;
        col = 0;
      }
      if (s >= keys.length) break;
      out.get(keys[s]).push({ cart: id, row, col });
      col++;
    }
    return out;
  }

  shelfList(key) {
    return this.shelfKind(key) === 'cart'
      ? this.cartShelves().get(key) || []
      : this.shelves().get(key) || [];
  }

  shelfCapacity(key) {
    const [rows, cols] = this.shelfDims(key);
    return rows * cols;
  }

  // Geometry of a shelf picture: width, height and where each row/column starts.
  shelfGeom(key) {
    const kind = this.shelfKind(key);
    const [rows, cols] = this.shelfDims(key);
    const W = SHELF_PADX + cols * SHELF_CELL;   // 97 (111 for the Pro)
    const H = 3 + rows * SHELF_ROWP;             // 118 (141 for the Pro)
    return {
      kind, rows, cols, W, H,
      rowTop: (r) => 2 + r * SHELF_ROWP,
      colX: (c) => 3 + c * SHELF_CELL,
      // Top of the board of a row: everything stands on it.
      floor: (r) => 2 + r * SHELF_ROWP + 21,
    };
  }

  shelfImage(key) {
    const kind = this.shelfKind(key);
    const list = this.shelfList(key);
    const up = !!this.app.game.toys[key]?.up;
    loadShelfArt();
    const sig = `${kind}${up ? '+' : ''}${shelfArtReady()}|${list.map((e) => `${e.manga || e.figure || e.cart}@${e.row}.${e.col}`).join(',')}`;
    this.shelfArt ||= new Map();
    const cached = this.shelfArt.get(key);
    if (cached?.sig === sig) return cached.url;
    const g = this.shelfGeom(key);
    const { rows, W, H } = g;
    const name = `shelf_${kind}${up ? 'up' : ''}_${String(key).replace(/[^a-z0-9]/gi, '')}`;
    // Manga shelf: wood. Gaming shelf: graphite metal with neon strips.
    // The handhelds stand on the roof of the shelf, outside the picture.
    defineIcons({ [name]: (sprite) => sprite(W, H, (p) => {
      const { rect } = p;
      if (kind === 'cart') {
        const frame = up ? '#221536' : '#262633';
        const inner = up ? '#120c24' : '#14141c';
        rect(0, 0, W, H, frame); rect(2, 2, W - 4, H - 4, inner);
        rect(0, 0, W, 1, up ? '#5ef0ff' : '#5a5a70'); rect(0, H - 1, W, 1, up ? '#ff3ea5' : '#3a3a48');
        rect(0, 1, 1, H - 2, up ? '#ff3ea5' : '#4a4a5a'); rect(W - 1, 1, 1, H - 2, up ? '#5ef0ff' : '#4a4a5a');
        for (let r = 0; r < rows; r++) {
          const y = g.rowTop(r);
          rect(2, y, W - 4, 1, up ? '#7af4ff' : '#3a3a48');
          rect(2, g.floor(r), W - 4, 2, up ? '#2c2048' : '#22222c');
          rect(2, g.floor(r), W - 4, 1, up ? (r % 2 ? '#ff7ac8' : '#7af4ff') : '#3a3a48');
        }
      } else if (up) {
        rect(0, 0, W, H, '#8a5a2b'); rect(2, 2, W - 4, H - 4, '#5a3818'); rect(0, 0, W, 1, '#5ef0ff'); rect(0, H - 1, W, 1, '#ff3ea5');
        rect(0, 1, 1, H - 2, '#ff3ea5'); rect(W - 1, 1, 1, H - 2, '#5ef0ff');
        for (let r = 0; r < rows; r++) {
          const y = g.rowTop(r);
          rect(2, y, W - 4, 1, r % 2 ? '#ff7ac8' : '#7af4ff');
          rect(2, g.floor(r), W - 4, 2, '#a8743c'); rect(2, g.floor(r), W - 4, 1, '#c8945c');
        }
      } else {
        rect(0, 0, W, H, '#8a5a2b'); rect(2, 2, W - 4, H - 4, '#5a3818'); rect(0, 0, W, 1, '#a8743c');
        for (let r = 0; r < rows; r++) {
          const y = g.rowTop(r);
          rect(2, y, W - 4, 1, '#4a2e12');
          rect(2, g.floor(r), W - 4, 2, '#8a5a2b'); rect(2, g.floor(r), W - 4, 1, '#a8743c');
        }
      }
      for (const e of list) {
        const x = g.colX(e.col);
        const floor = g.floor(e.row);
        const m = e.manga && MANGAS.find((v) => v.id === e.manga);
        if (m) {
          // The real cover, seen from the front, filling the row of the shelf.
          const idx = MANGAS.indexOf(m);
          const mini = mangaMinis[idx];
          const top = floor - MANGA_H;
          if (mini) {
            p.image(mini, 0, 0, MANGA_W, MANGA_H, x, top, MANGA_W, MANGA_H);
            // A darker edge on the left: the book seen a little from the side.
            rect(x, top, 1, MANGA_H, 'rgba(0,0,0,0.3)');
          } else {
            // Cover not loaded yet: the genre color keeps the slot readable.
            rect(x, top, MANGA_W, MANGA_H, MANGA_GENRES[m.genre].color);
            rect(x + 1, top + 4, MANGA_W - 2, 3, hsl(m.hue, 70, 75));
          }
          rect(x, floor, MANGA_W, 1, 'rgba(0,0,0,0.3)');
        } else if (e.figure && figureById(e.figure)) {
          // The figure stands on the plank, with its little stand under it.
          const fx = x + (SHELF_CELL * 2 - FIG_W) / 2;
          paintFigure(e.figure, p, fx, floor - FIG_H, 1, true);
        } else if (e.cart && (GAMES[e.cart] || e.cart === 'unknown')) {
          // Front view of the cartridge: body, label with the art of the game, connector.
          const idx = CART_SHEET_CELLS.indexOf(e.cart);
          const top = floor - CART_H;
          const mini = cartMinis[idx];
          if (e.cart === 'unknown') {
            // O cartucho preto misterioso: todo preto, com um brilho vermelho fraco.
            rect(x, top, CART_W, CART_H, '#0c0c12');
            rect(x, top, CART_W, 1, '#1e1e2a');
            rect(x + 1, top + 2, CART_W - 2, 13, '#040408');
            rect(x + 2, top + 6, CART_W - 4, 1, '#2c0a12');
            rect(x + 3, top + 9, CART_W - 6, 1, '#2c0a12');
            rect(x + 1, top + 15, CART_W - 2, 2, '#14141c');
            rect(x + 1, top + 17, CART_W - 2, 2, '#050508');
            rect(x, floor, CART_W, 1, 'rgba(0,0,0,0.3)');
            continue;
          }
          const col = GAMES[e.cart].color || '#888';
          const body = up ? '#3a3a48' : '#9a98a4';
          rect(x, top, CART_W, CART_H, body);
          rect(x, top, CART_W, 1, up ? '#5a5a70' : '#bdbbc6');
          rect(x + 1, top + 2, CART_W - 2, 13, col);
          if (mini) p.image(mini, 0, 0, CART_W - 2, 13, x + 1, top + 2, CART_W - 2, 13);
          rect(x + 1, top + 15, CART_W - 2, 2, up ? '#3a3a48' : '#6d6b78');
          rect(x + 1, top + 17, CART_W - 2, 2, up ? '#111' : '#4a4852');
          rect(x, floor, CART_W, 1, 'rgba(0,0,0,0.3)');
        }
      }
    }, undefined, false) });
    const url = refreshIcon(name);
    this.shelfArt.set(key, { sig, url });
    return url;
  }

  // The reserved slot of a handheld on the roof of the Gaming Shelf (left, center, right).
  roofSlot(id) {
    const slot = CONSOLE_SLOTS.find((s) => s.id === id);
    return slot ? slot.at : null;
  }

  // Width of a handheld docked on the roof: the three of them fit side by side.
  roofSize(id) {
    const t = this.app.game.toys[id];
    if (!t?.placed || !t.on || baseId(t.on) !== 'estante_cartuchos') return 0;
    return Math.round(this.P * ROOF_W);
  }

  // One reserved slot: a small dock with the handheld standing on it (empty when not owned).
  // Whether the pet would play with this piece right now.
  usable(id) {
    const b = baseId(id);
    if (FURN[b]?.disco || id === 'impressora') return false;
    if (b === 'estante') return (this.shelves().get(id) || []).length > 0;
    if (b === 'estante_cartuchos') return false;
    if (id === 'videogame') return this.app.game.cartridges.length > 0;
    if (this.toys.casino?.owns(id)) return this.toys.casino.usable(id);
    if (this.toys.fun?.owns(b)) return this.toys.fun.usable(b);
    return true;
  }

  spot(id, t) {
    const P = this.P;
    if (this.toys.casino?.owns(id)) return this.toys.casino.spot(id, t);
    if (id === 'videogame') return t.x + P * 0.42 * upSize(id, t);
    if (id === 'cama' || id === 'almofada' || id === 'banheira') return t.x;
    if (id === 'alvo') return t.up ? t.x : t.x + P * 1.6;
    return t.x + P * 0.45;
  }

  // Height of the seat the pet sits/lies on (CSS px above the floor).
  liftFor(pet) {
    const tp = pet.toyPlay;
    const P = this.P;
    if (tp?.lift != null) return tp.lift;
    if ((pet.onBed && pet.action === 'sleep') || tp?.id === 'cama') return P * 0.75 * (18 / 34) * 0.55;
    const cushion = this.app.game.toys.almofada;
    const onIt = pet.onCushion && cushion?.placed && Math.abs(cushion.x - pet.x) < P * 0.3;
    if (tp?.id === 'almofada' || (onIt && (tp?.cushioned || ['sleep', 'sit', 'watch', 'react', 'eat'].includes(pet.action)))) return P * 0.38 * (9 / 22) * 0.55;
    if (tp?.id === 'banheira') return P * 0.18;
    return 0;
  }

  play(id, pet, end) {
    const { game } = this.app;
    const scale = game.difficultyScale();
    const it = this.toys.item(id);
    const pickAnim = pet.pickClip(['pegar'], ['use_mainhand', 'swing_hand', 'idle']);
    if (id === 'cama') {
      const lie = Math.random() < 0.4;
      pet.playToy({ id, dur: rand(12, 28), gain: this.gainOf(id, it), scale, anim: lie ? 'sleep' : 'sit', pose: lie ? 'lie' : 'sit', facing: lie ? (pet.dir > 0 ? 'right' : 'left') : 'front', onEnd: end,
        tick: (dt, tp) => { tp.next = (tp.next ?? 4) - dt; if (tp.next <= 0) { tp.next = rand(4, 8); pet.emit('emote'); } } });
      return true;
    }
    if (id === 'banheira') {
      const care = this.app.care;
      const up = this.app.game.toys.banheira?.up;
      // Upgraded: she stands inside the laser stall (hidden behind its door) instead of sitting in the tub.
      pet.playToy({ id, dur: up ? rand(9, 15) : rand(14, 22), gain: this.gainOf(id, it), scale: 1, anim: up ? 'idle' : 'sit', pose: up ? undefined : 'sit', facing: 'front', lift: up ? 0 : undefined,
        tick: (dt, tp) => care?.bathTick(dt, tp, true, up && this.toys.els.get('banheira')),
        onEnd: (i, tp) => { care?.bathEnd(i, !!up); end(i, tp); } });
      pet.emit('bath', { tub: true });
      return true;
    }
    if (id === 'almofada') {
      pet.playToy({ id, dur: rand(15, 40), gain: this.gainOf(id, it), scale, anim: 'sit', pose: 'sit', facing: Math.random() < 0.5 ? 'front' : pet.side(), onEnd: end });
      return true;
    }
    if (id === 'videogame') {
      const cart = game.pickCart();
      game.cartridge = cart;
      pet.playToy({
        id, dur: rand(30, 150), gain: this.gainOf(id, it), scale, anim: 'sit', pose: 'sit', facing: 'back', cart, tv: true, console: 'tv',
        onEnd: (i, tp) => { this.toys.screen.stop(); game.playedCart(cart, tp?.t || 0); game.playedConsole?.('videogame', tp?.t || 0); end(i); },
        tick: (dt, tp) => { this.toys.gameboyTick(dt, tp, pet); this.snack(dt, tp, pet); },
      });
      return true;
    }
    if (this.toys.casino?.owns(id)) return this.toys.casino.play(id, pet, end);
    if (baseId(id) === 'estante') return this.playShelf(id, pet, end);
    if (baseId(id) === 'estante_cartuchos') return false;
    if (id === 'alvo' && game.toys.alvo?.up) {
      const t = game.toys.alvo;
      pet.playToy({
        id, dur: rand(18, 40), gain: { mood: it.gain.mood * 1.55 }, scale, anim: 'idle', pose: 'stand', facing: 'back',
        onEnd: (i, tp) => {
          this.arcade.playing = false;
          this.toys.els.get('alvo')?.classList.remove('arcade-playing');
          end(i, tp);
        },
        tick: (dt, tp) => this.arcadeTick(dt, tp, pet),
      });
      // Stand in front of the cabinet, facing it (back to the player).
      pet.x = this.spot(id, t);
      pet.dir = t.flip ? -1 : 1;
      this.toys.els.get('alvo')?.classList.add('arcade-playing');
      pet.emit('arcadePlay');
      return true;
    }
    if (id === 'alvo') {
      pet.playToy({ id, dur: rand(12, 22), gain: it.gain, scale, anim: 'idle', facing: 'left', onEnd: end, tick: (dt, tp) => this.dartTick(dt, tp, pet) });
      return true;
    }
    return false;
  }

  // Shelf: read a manga or play with a figure. kind = 'manga' | 'figure' forces one; else she picks.
  playShelf(id, pet, end, kind) {
    const list = this.shelves().get(id) || [];
    const mangas = list.filter((e) => e.manga);
    const figs = list.filter((e) => e.figure);
    const scale = this.app.game.difficultyScale();
    const pickAnim = pet.pickClip(['pegar'], ['use_mainhand', 'swing_hand', 'idle']);
    const wantFig = kind === 'figure' || (!kind && figs.length && (!mangas.length || Math.random() < 0.35));
    if (wantFig && figs.length) {
      const f = figureById(pick(figs).figure);
      pet.playToy({
        id, dur: rand(8, 16), gain: { mood: 0.35 }, scale, hold: f.img, holdFrom: 0.9, holdSize: 0.14, pickAnim, anim: 'idle', facing: 'front', figure: f, onEnd: end,
        tick: (dt, tp) => {
          tp.reach = 0.45 + Math.sin(tp.t * 2) * 0.1;
          tp.angle = Math.sin(tp.t * 3) * 15;
          tp.next = (tp.next ?? 2) - dt;
          if (tp.next <= 0) {
            tp.next = rand(3, 6);
            pet.emit('emote');
          }
        },
      });
      pet.emit('figurePlay', { figure: f });
      return true;
    }
    const ownedMangas = mangas.map((e) => MANGAS.find((x) => x.id === e.manga)).filter(Boolean);
    const order = { lendario: 5, epico: 4, raro: 3, incomum: 2, comum: 1 };
    const m = dollHasSkill(this.app, 'curador') && ownedMangas.length
      ? ownedMangas.slice().sort((a, b) => (order[b.rarity] || 0) - (order[a.rarity] || 0))[0]
      : MANGAS.find((x) => x.id === pick(mangas)?.manga);
    if (!m) return false;
    const g = MANGA_GENRES[m.genre];
    pet.playToy({
      id, dur: rand(20, 60), gain: g.gain, scale, hold: mangaCoverIcon(m), holdFrom: 0.9, holdSize: 0.16, pickAnim,
      anim: 'sit', pose: 'sit', facing: 'front', manga: m, onEnd: end,
      tick: (dt, tp) => {
        pet.dir = 1;
        tp.facing = 'front';
        tp.reach = 0.4;
        tp.angle = Math.sin(tp.t * 0.8) * 3;
        tp.page = (tp.page ?? 3) - dt;
        if (tp.page <= 0) {
          tp.page = rand(2.5, 5);
          this.app.sound.tone8(1800, 1400, 0.03, 'triangle', 0.03);
          if (Math.random() < 0.3) {
            if (g.react === 'excite') pet.emit('gameExcite');
            else if (g.react === 'love') { pet.emit('emote'); pet.love?.(0.3); }
            else pet.emit('react', { kind: g.react });
          }
        }
      },
    });
    // Reading trains Inteligência: rarer volumes teach more (never coins — XP only).
    if (dollHasSkill(this.app, 'curador')) dollWave(this.app, 'curador', '📚', '📚', 180);
    const xp = Math.max(1, Math.round(ATTR_XP.int.manga * (MANGA_RARITY_XP[m.rarity] || 1)));
    this.app.game.attrAdd?.('int', xp, 'Mangá');
    pet.emit('readManga', { manga: m });
    return true;
  }

  // While playing (TV / handheld): snacks from inventory — popcorn/chips/soda first, then normal food/drink.
  // Instant adjust so toyPlay is not interrupted (eating action would end the session).
  snack(dt, tp, pet) {
    tp.snackT = (tp.snackT ?? rand(12, 25)) - dt;
    if (tp.snackT > 0 || pet.eating) return;
    tp.snackT = rand(14, 28);
    const { game, sound } = this.app;
    const s = pet.stats;
    const fits = (v, k) => v < 70 && v + (k || 0) <= 105;
    const want = (i) => (i.cat === 'comidas' && fits(s.hunger, i.effects?.hunger))
      || (i.cat === 'bebidas' && fits(s.thirst, i.effects?.thirst));
    const snacks = game.items((i) => i.watchOnly && want(i));
    const list = snacks.length ? snacks
      : game.items((i) => want(i) && i.price > 0 && !i.buff && (i.cat === 'comidas' || i.cat === 'bebidas'));
    if (!list.length) return;
    const { item: food } = pick(list);
    pet.adjust(food.effects);
    game.take(food.id);
    sound.play('blip', { volume: 0.4 });
    pet.emit('ate', { item: food });
  }

  // The pet throwing darts at the target.
  dartTick(dt, tp, pet) {
    const t = this.app.game.toys.alvo;
    tp.next = (tp.next ?? 1) - dt;
    pet.dir = t.x < pet.x ? -1 : 1;
    if (tp.next > 0) return;
    tp.next = rand(1.1, 1.8);
    pet.anim(pet.pickClip(['arremessar'], ['swing_hand', 'use_mainhand']), { facing: pet.dir > 0 ? 'right' : 'left', restart: true });
    const P = this.P;
    const skill = Math.min(1, 0.3 + pet.affection / 300);
    const off = (1 - skill) * rand(-1, 1) * P * 0.2;
    const cy = this.toys.floorY() - P * 0.4 * (26 / 22) + P * 0.4 * 0.45;
    this.darts.push({ x: pet.x, y: pet.y - P * 0.6, tx: t.x + off, ty: cy + rand(-1, 1) * (1 - skill) * P * 0.15, t: 0, el: this.toys.makeEl('toy flying dart', icon('dart')) });
    this.app.sound.swish?.();
  }

  updateDarts(dt, hidden) {
    const P = this.P;
    for (const d of this.darts) {
      d.t += dt * 2.2;
      const u = Math.min(1, d.t);
      const x = d.x + (d.tx - d.x) * u;
      const y = d.y + (d.ty - d.y) * u - Math.sin(u * Math.PI) * P * 0.3;
      const s = P * 0.14;
      d.el.style.display = hidden ? 'none' : 'block';
      d.el.style.width = `${s}px`;
      d.el.style.transform = `translate(${x - s / 2}px, ${y}px) scaleX(${d.tx < d.x ? -1 : 1})`;
      if (u >= 1 && !d.hit) {
        d.hit = true;
        const t = this.app.game.toys.alvo;
        const cy = this.toys.floorY() - P * 0.4 * (26 / 22) + P * 0.4 * 0.45;
        const r = Math.hypot(d.tx - t.x, d.ty - cy) / (P * 0.2);
        const pts = r < 0.12 ? 50 : r < 0.4 ? 25 : r < 0.7 ? 10 : r < 1 ? 5 : 0;
        this.app.sound.tone8(pts >= 25 ? 990 : 330, pts >= 25 ? 1320 : 220, 0.08, 'square', 0.06);
        this.floatText(d.tx, d.ty - P * 0.1, pts ? `+${pts}` : 'errou');
        if (pts >= 50) this.app.pet.emit('gameExcite');
        d.life = 1.2;
      }
      if (d.hit && (d.life -= dt) <= 0) d.el.remove();
    }
    this.darts = this.darts.filter((d) => !d.hit || d.life > 0);
  }

  // ---------- shooting arcade (upgraded target) ----------
  // Standing facing the cabinet (back to the player): arms toward the screen, sways like with handhelds.
  arcadeTick(dt, tp, pet) {
    const a = this.arcade;
    a.playing = true;
    const t = this.app.game.toys.alvo;
    pet.dir = t?.flip ? -1 : 1;
    // Arms forward toward the machine (not hanging down).
    tp.reach = 0.52 + Math.sin(tp.t * 14) * 0.04 + (tp.excite || 0) * 0.15;
    tp.leanTo = (tp.leanTo ?? 0) * 0.35 + Math.sin(tp.t * 1.8) * 0.07 * pet.dir + (a.aim.x - 18) * 0.004 * pet.dir;
    tp.lean = (tp.lean ?? 0) + ((tp.leanTo ?? 0) - (tp.lean ?? 0)) * Math.min(1, dt * 3);
    pet.tilt = tp.lean + Math.sin(tp.t * 12) * 0.02;
    pet.tiltPivot = { x: 0, y: 0 };
    tp.excite = Math.max(0, (tp.excite || 0) - dt * 1.2);
    tp.next = (tp.next ?? 0.8) - dt;
    if (tp.next > 0) return;
    tp.next = rand(0.28, 0.75);
    const { sound } = this.app;
    // Cabinet chatter while she plays.
    sound.tone8(1600, 240, 0.1, 'square', 0.055);
    if (Math.random() < 0.45) sound.tone8(880 + Math.random() * 600, 220, 0.06, 'sawtooth', 0.03);
    if (Math.random() < 0.25) sound.sfx?.('coin', 0.35);
    if (Math.random() < 0.2) sound.sfx?.('blip', 0.3);
    const tgt = a.targets[0];
    if (!tgt || Math.random() > Math.min(0.9, 0.5 + pet.affection / 400)) return;
    a.targets.shift();
    a.booms.push({ x: tgt.x, y: tgt.y, t: 0 });
    a.score += 100;
    sound.noise?.(sound.ctx.currentTime + 0.01, 0.14, 0.22, 1100);
    sound.sfx?.('laser', 0.45);
    tp.excite = 1;
    tp.streak = (tp.streak || 0) + 1;
    if (tp.streak % 5 === 0) {
      pet.emit('gameExcite');
      const el = this.toys.els.get('alvo');
      const r = el?.getBoundingClientRect();
      if (r) this.floatText(r.left + r.width / 2, r.top, `+${tp.streak * 100}`);
      sound.sfx?.('powerup', 0.5);
    }
  }

  // Live screen sits only inside ARCADE_SCREEN (not stretched over the whole cabinet).
  updateArcade(dt, hidden) {
    const t = this.app.game.toys.alvo;
    const el = this.toys.els.get('alvo');
    if (!el) return;
    const old = el.querySelector('canvas.arcade-live');
    if (!t?.up) { old?.remove(); return; }
    if (hidden || el.style.display === 'none') return;
    const a = this.arcade;
    a.acc += dt;
    if (a.acc < 1 / 15) return;
    dt = a.acc;
    a.acc = 0;
    a.t += dt;
    const W = 36;
    const H = 26;
    let c = old;
    if (!c) {
      crtFilter();
      c = document.createElement('canvas');
      c.className = 'arcade-live';
      c.width = W;
      c.height = H;
      el.append(c);
    }
    // Pin the canvas to the bezel hole so nothing paints onto the cabinet art.
    Object.assign(c.style, {
      left: `${ARCADE_SCREEN.x * 100}%`,
      top: `${ARCADE_SCREEN.y * 100}%`,
      width: `${ARCADE_SCREEN.w * 100}%`,
      height: `${ARCADE_SCREEN.h * 100}%`,
      right: 'auto',
      bottom: 'auto',
      transform: t.flip ? 'scaleX(-1)' : '',
    });
    c.classList.toggle('neon-play', !!a.playing);
    el.classList.toggle('arcade-playing', !!a.playing);
    const g = c.getContext('2d');
    g.save();
    if (t.flip) { g.translate(W, 0); g.scale(-1, 1); }
    g.fillStyle = '#120c24';
    g.fillRect(0, 0, W, H);
    g.fillStyle = '#2a1250';
    g.fillRect(0, H - 7, W, 7);
    g.fillStyle = '#ff3ea5';
    g.fillRect(0, H - 7, W, 1);
    g.fillStyle = '#7a3cff';
    for (let i = 0; i < 3; i++) g.fillRect(0, H - 5 + i * 2 - Math.floor((a.t * 6) % 2), W, 1);
    g.fillStyle = '#ffffff';
    for (let i = 0; i < 6; i++) g.fillRect((i * 11 + Math.floor(a.t * 4)) % W, (i * 5) % (H - 9), 1, 1);
    if (a.targets.length < 3 && Math.random() < dt * 1.5) {
      const dir = Math.random() < 0.5 ? 1 : -1;
      a.targets.push({ x: dir > 0 ? -4 : W + 4, y: rand(3, H - 11), vx: dir * rand(8, 16) });
    }
    for (const s of a.targets) {
      s.x += s.vx * dt;
      const x = Math.round(s.x);
      const y = Math.round(s.y + Math.sin(a.t * 3 + s.vx) * 1.5);
      g.fillStyle = '#5ef0ff';
      g.fillRect(x - 1, y - 1, 3, 1);
      g.fillStyle = '#ffd23f';
      g.fillRect(x - 3, y, 7, 2);
      g.fillStyle = '#ff3ea5';
      g.fillRect(x - 2, y + 1, 1, 1);
      g.fillRect(x + 2, y + 1, 1, 1);
    }
    a.targets = a.targets.filter((s) => s.x > -8 && s.x < W + 8);
    for (const b of a.booms) {
      b.t += dt;
      const r = Math.round(b.t * 14);
      g.fillStyle = b.t < 0.1 ? '#ffffff' : '#ff8a3d';
      for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, -1.4], [0, 1.4], [-1.4, 0], [1.4, 0]]) g.fillRect(Math.round(b.x + dx * r), Math.round(b.y + dy * r), 1, 1);
    }
    a.booms = a.booms.filter((b) => b.t < 0.35);
    const goal = a.targets[0] || { x: W / 2 + Math.sin(a.t) * 6, y: H / 2 - 3 };
    a.aim.x += (goal.x - a.aim.x) * Math.min(1, dt * 6);
    a.aim.y += (goal.y - a.aim.y) * Math.min(1, dt * 6);
    const ax = Math.round(clamp(a.aim.x, 2, W - 3));
    const ay = Math.round(clamp(a.aim.y, 2, H - 8));
    g.fillStyle = a.playing ? '#5ef0ff' : 'rgba(94,240,255,0.5)';
    g.fillRect(ax - 3, ay, 2, 1); g.fillRect(ax + 2, ay, 2, 1); g.fillRect(ax, ay - 3, 1, 2); g.fillRect(ax, ay + 2, 1, 2);
    if (a.playing) {
      g.fillStyle = '#ffd23f';
      g.fillRect(1, 1, Math.min(W - 2, Math.round((a.score % 2000) / 2000 * (W - 2))), 1);
    } else {
      if (Math.random() < dt * 0.8 && a.targets.length) { const s = a.targets.shift(); a.booms.push({ x: s.x, y: s.y, t: 0 }); }
      if (Math.floor(a.t * 2) % 2 === 0) {
        g.fillStyle = '#ffd23f';
        g.fillRect(Math.round(W / 2 - 6), H - 4, 12, 2);
      }
    }
    // Scanlines + soft vignette (CRT look on top of the playfield).
    g.fillStyle = 'rgba(0,0,0,0.28)';
    for (let y = 0; y < H; y += 2) g.fillRect(0, y, W, 1);
    const pulse = a.playing ? 0.75 + Math.sin(a.t * 10) * 0.25 : 0.55;
    g.strokeStyle = `rgba(255, 62, 100, ${pulse})`;
    g.lineWidth = 1;
    g.strokeRect(0.5, 0.5, W - 1, H - 1);
    g.restore();
  }

  floatText(x, y, text) {
    const el = document.createElement('div');
    el.className = 'float-text';
    el.textContent = text;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    document.body.append(el);
    setTimeout(() => el.remove(), 1100);
  }

  // ---------- target minigame (player, 3 minutes) ----------
  startTargetGame() {
    if (this.target) return;
    const { game, sound, pet } = this.app;
    if (game.toys.alvo?.up) {
      this.target = new ArcadeShooter(this.app, () => this.endTargetGame());
      pet.emit('versusStart');
      this.app.uiChanged();
      return;
    }
    const el = document.createElement('div');
    el.className = 'target-game hitzone';
    el.innerHTML = '<div class="tg-hud"><b class="tg-time">3:00</b> · <span class="tg-score">0</span> pts · recorde <span class="tg-best"></span><button class="tg-quit">✕</button></div>';
    document.body.append(el);
    el.querySelector('.tg-best').textContent = game.profile.targetBest || 0;
    el.querySelector('.tg-quit').onclick = (e) => { e.stopPropagation(); this.endTargetGame(); };
    this.target = { el, t: 180, score: 0, spawn: 0, list: [] };
    sound.tone8(660, 990, 0.2, 'square', 0.08);
    pet.emit('versusStart');
    this.app.uiChanged();
  }

  endTargetGame() {
    const tg = this.target;
    if (!tg) return;
    this.target = null;
    if (tg.destroy) tg.destroy();
    else tg.el.remove();
    const { game, pet } = this.app;
    const best = game.profile.targetBest || 0;
    if (tg.score > best) game.profile.targetBest = tg.score;
    pet.adjust({ mood: Math.min(15, tg.score / 40) });
    pet.love?.(Math.min(6, tg.score / 100));
    pet.emit('versusEnd', { pet: 0, player: tg.score, record: tg.score > best });
    const up = !!game.toys.alvo?.up;
    const mul = (up ? 1.8 : 1) * dollBonus(this.app, 'olheiro', 1.2);
    game.attrAdd?.('dex', Math.round(ATTR_XP.dex.target * mul), 'Alvo');
    game.attrAdd?.('per', Math.round(ATTR_XP.per.arcade * mul), 'Alvo');
    if (dollWave(this.app, 'olheiro', '🎯', '🎯', 180)) game.attrAdd?.('cha', 0.2, 'Social');
    this.app.uiChanged();
  }

  updateTarget(dt) {
    const tg = this.target;
    if (!tg) return;
    if (tg.update) return tg.update(dt);
    tg.t -= dt;
    tg.spawn -= dt;
    const P = this.P;
    if (tg.spawn <= 0 && tg.list.length < 4) {
      tg.spawn = rand(0.5, 1.1);
      const s = Math.round(P * rand(0.28, 0.45));
      const b = document.createElement('div');
      b.className = 'tg-target';
      b.style.width = b.style.height = `${s}px`;
      b.style.backgroundImage = `url(${icon('alvo')})`;
      if (this.app.game.toys.alvo?.up) b.classList.add('neon');
      const x = rand(20, innerWidth - s - 20);
      const y = rand(60, innerHeight - s - P * 0.6);
      b.style.left = `${x}px`;
      b.style.top = `${y}px`;
      const tgt = { el: b, life: rand(1.6, 2.6) };
      b.onpointerdown = (e) => {
        e.stopPropagation();
        const r = b.getBoundingClientRect();
        const d = Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height * 0.4)) / (r.width / 2);
        const pts = d < 0.15 ? 50 : d < 0.45 ? 25 : d < 0.75 ? 10 : 5;
        tg.score += pts;
        this.app.sound.tone8(pts >= 25 ? 990 : 520, pts >= 25 ? 1480 : 700, 0.06, 'square', 0.07);
        this.floatText(e.clientX, e.clientY - 20, `+${pts}`);
        if (pts >= 50) this.app.pet.emit('gameExcite');
        tgt.life = 0;
      };
      tg.el.append(b);
      tg.list.push(tgt);
    }
    for (const t of tg.list) {
      t.life -= dt;
      if (t.life <= 0) t.el.remove();
    }
    tg.list = tg.list.filter((t) => t.life > 0);
    const s = Math.max(0, Math.ceil(tg.t));
    tg.el.querySelector('.tg-time').textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    tg.el.querySelector('.tg-score').textContent = tg.score;
    if (tg.t <= 0) this.endTargetGame();
  }

  // ---------- party kit (only during Jam) ----------
  updateDisco(dt, hidden) {
    const { game, pet, world } = this.app;
    const on = pet.activity === 'jam' && !hidden;
    const items = on ? Object.entries(game.toys).filter(([key, t]) => FURN[baseId(key)]?.disco && t.placed && !t.broken && this.toys.here(t)) : [];
    if (!items.length) {
      if (this.fxCanvas) {
        this.fxCanvas.remove();
        this.fxCanvas = null;
        this.parts = [];
      }
      return;
    }
    let c = this.fxCanvas;
    if (!c) {
      c = this.fxCanvas = document.createElement('canvas');
      c.className = 'disco-fx';
      document.body.prepend(c);
    }
    if (c.width !== innerWidth || c.height !== innerHeight) {
      c.width = innerWidth;
      c.height = innerHeight;
    }
    // Drawn at most ~30 times a second: a full-screen canvas every frame is what made it lag.
    this.discoT = (this.discoT || 0) + dt;
    this.discoAcc = (this.discoAcc || 0) + dt;
    if (this.discoAcc < 1 / 30) return;
    dt = this.discoAcc;
    this.discoAcc = 0;
    const g = c.getContext('2d');
    g.clearRect(0, 0, c.width, c.height);
    g.globalCompositeOperation = 'lighter';
    const T = this.discoT;
    const beat = 0.5 + 0.5 * Math.sin(T * Math.PI * 2 * ((this.app.modes?.bpm || 120) / 60));
    const ground = this.toys.floorY();
    const P = this.P;
    for (const [key, t] of items) {
      const id = baseId(key);
      // Effects come out of the object wherever it was left (t.y: its bottom; default the floor).
      const floor = t.y ?? ground;
      const color = t.color || { globo: '#ffffff', holofote: '#fff3a6', laser: '#ff3b6b', fumaca: '#c8c8ff', confete: 'multi' }[id];
      const k = t.power ?? 1;
      const col = (a) => (color === 'multi' ? `hsla(${(T * 90) % 360}, 90%, 60%, ${a})` : hexA(color, a));
      g.save();
      if (id === 'globo') {
        const gx = t.x;
        const gy = t.y == null ? 40 : floor - this.toys.size(key) * this.toys.ratio(id) * 0.5;
        g.strokeStyle = '#888';
        g.beginPath(); g.moveTo(gx, 0); g.lineTo(gx, gy - 14); g.stroke();
        for (let i = 0; i < 40 * k; i++) {
          const a = i * 2.39 + T * 0.6;
          const r = (i / (40 * k)) * Math.max(innerWidth, innerHeight) * 0.6;
          const x = gx + Math.cos(a) * r;
          const y = gy + Math.abs(Math.sin(a * 1.3)) * r * 0.9;
          g.fillStyle = color === 'multi' ? `hsla(${(i * 37 + T * 60) % 360}, 90%, 70%, ${0.25 + beat * 0.4})` : hexA(color, 0.25 + beat * 0.4);
          g.fillRect(x, y, 4, 4);
        }
        g.fillStyle = '#d8dce8';
        g.beginPath(); g.arc(gx, gy, 14, 0, Math.PI * 2); g.fill();
        g.fillStyle = `rgba(255,255,255,${0.5 + beat * 0.5})`;
        for (let i = 0; i < 6; i++) g.fillRect(gx - 10 + ((i * 7 + T * 20) % 20), gy - 8 + i * 3, 3, 2);
      } else if (id === 'holofote') {
        for (const side of [-1, 1]) {
          const ang = -Math.PI / 2 + side * (0.35 + Math.sin(T * 0.9 + side) * 0.45);
          const len = innerHeight * 1.1;
          const w = 0.12 + 0.05 * k;
          const grd = g.createLinearGradient(t.x, floor, t.x + Math.cos(ang) * len, floor + Math.sin(ang) * len);
          grd.addColorStop(0, col(0.45 * k * (0.6 + beat * 0.4)));
          grd.addColorStop(1, col(0));
          g.fillStyle = grd;
          g.beginPath();
          g.moveTo(t.x, floor - P * 0.15);
          g.lineTo(t.x + Math.cos(ang - w) * len, floor + Math.sin(ang - w) * len);
          g.lineTo(t.x + Math.cos(ang + w) * len, floor + Math.sin(ang + w) * len);
          g.fill();
        }
      } else if (id === 'laser') {
        const n = Math.round(4 + 6 * k);
        const y0 = floor - P * 0.12;
        for (let i = 0; i < n; i++) {
          const a = -Math.PI / 2 + Math.sin(T * 1.7 + i * 0.7) * 1.1;
          const x1 = t.x + Math.cos(a) * innerWidth;
          const y1 = y0 + Math.sin(a) * innerWidth;
          const hue = (i * 50 + T * 80) % 360;
          // Wide faint stroke + thin bright one instead of shadowBlur (very slow on long lines).
          g.beginPath();
          g.moveTo(t.x, y0);
          g.lineTo(x1, y1);
          g.lineWidth = 6;
          g.strokeStyle = color === 'multi' ? `hsla(${hue}, 100%, 60%, ${0.12 + beat * 0.1})` : hexA(color, 0.12 + beat * 0.1);
          g.stroke();
          g.lineWidth = 2;
          g.strokeStyle = color === 'multi' ? `hsla(${hue}, 100%, 60%, ${0.5 + beat * 0.5})` : hexA(color, 0.5 + beat * 0.5);
          g.stroke();
        }
      } else if (id === 'fumaca') {
        if (this.parts.length < 300 && Math.random() < dt * 6 * k) this.parts.push({ kind: 'smoke', x: t.x, y: floor - P * 0.1, vx: rand(-30, 30), vy: rand(-20, -6), r: rand(20, 40), life: rand(3, 6), max: 6, color });
      } else if (id === 'confete') {
        if (this.parts.length < 300 && Math.random() < dt * 30 * k * (0.5 + beat)) this.parts.push({ kind: 'conf', x: rand(0, innerWidth), y: -10, vx: rand(-30, 30), vy: rand(60, 140), r: rand(3, 6), life: 8, max: 8, spin: rand(0, 6), color });
      }
      g.restore();
    }
    g.globalCompositeOperation = 'source-over';
    for (const p of this.parts) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.kind === 'smoke') {
        p.r += dt * 12;
        g.globalAlpha = Math.max(0, Math.min(0.35, p.life / p.max)) / 0.35;
        g.drawImage(this.puff(p.color === 'multi' ? `hsl(${Math.round(T * 60) % 360},70%,80%)` : p.color), p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
        g.globalAlpha = 1;
      } else {
        p.spin += dt * 6;
        g.fillStyle = p.color === 'multi' ? `hsl(${Math.round(p.r * 97 + p.x) % 360}, 90%, 60%)` : p.color;
        const cs = Math.cos(p.spin);
        const sn = Math.sin(p.spin);
        g.setTransform(cs, sn, -sn, cs, p.x, p.y);
        g.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2);
        if (p.y > ground) p.life = 0;
      }
    }
    g.setTransform(1, 0, 0, 1, 0, 0);
    this.parts = this.parts.filter((p) => p.life > 0);
  }

  // Soft round smoke sprite per color (multicolor smoke is quantized to a few hues).
  puff(color) {
    const key = color.startsWith('hsl') ? color.replace(/\d+(?=,)/, (h) => String(Math.round(h / 30) * 30)) : color;
    this.puffs ||= new Map();
    let c = this.puffs.get(key);
    if (!c) {
      c = document.createElement('canvas');
      c.width = c.height = 64;
      const g = c.getContext('2d');
      const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      grd.addColorStop(0, key.startsWith('hsl') ? key.replace('hsl', 'hsla').replace(')', ',0.35)') : hexA(key, 0.35));
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grd;
      g.fillRect(0, 0, 64, 64);
      this.puffs.set(key, c);
    }
    return c;
  }

  update(dt, hidden) {
    this.updateDarts(dt, hidden);
    this.updateArcade(dt, hidden);
    this.updateTarget(dt);
    this.updateDisco(dt, hidden);
  }
}

function hexA(hex, a) {
  const h = String(hex).replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

export { cartridge };
