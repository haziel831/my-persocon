// Loot boxes and the single-use prizes that only come out of them (never sold in the Shop).
// special: extra effect run by rewards.js when the item is used.
import { icon, defineIcons, glyphIcon } from './pixel.js';

export const RARITIES = {
  comum: { label: 'Comum', color: '#4b69ff' },
  incomum: { label: 'Incomum', color: '#8847ff' },
  raro: { label: 'Raro', color: '#d32ce6' },
  lendario: { label: 'Lendário', color: '#ffb300' },
  // Only from the Gacha-Machine (it uses comum → incomum → raro → epico).
  epico: { label: 'Épico', color: '#eb4b4b' },
};
export const RARITY_ORDER = ['comum', 'incomum', 'raro', 'lendario'];

const loot = (id, name, rarity, pixName, extra = {}) => ({
  id, cat: 'premios', name, rarity, pix: pixName, price: 0, effects: {}, loot: true, consumable: true, ...extra,
  get img() { return typeof document === 'undefined' ? '' : icon(GLYPHS[this.pix] ? `lg_${this.pix}` : this.pix); },
});
// Prizes drawn with the PxEmoji pixel-art glyphs.
const GLYPHS = {
  fortune: '🥠', popper: '🎉', bubblejar: '🫧', candy: '🍬', popsicle: '🍧', soap: '🧼', sleepcan: '💤', feast: '🍱', firstaid: '🩹', hearts: '💕',
  fireflies: '✨', rocket: '🎆', magnet: '🧲', lovecrystal: '💎', clock: '⏰', feather: '🪶', shootingstar: '🌠', crown: '👑', rainbow: '🌈',
};

// odds: chance of each rarity (comum, incomum, raro, lendario) for the prize.
export const BOXES = {
  caixa_comum: { odds: [70, 22, 7, 1] },
  caixa_rara: { odds: [30, 42, 22, 6] },
  caixa_lendaria: { odds: [0, 30, 48, 22] },
};

export const LOOT_ITEMS = [
  loot('caixa_comum', 'Caixa Comum', 'comum', 'box_comum', { box: true, consumable: false, note: 'Abra no Inventário: a Persocon abre e sai um prêmio na roleta' }),
  loot('caixa_rara', 'Caixa Rara', 'raro', 'box_rara', { box: true, consumable: false, note: 'Mais chance de prêmios incomuns, raros e lendários' }),
  loot('caixa_lendaria', 'Caixa Lendária', 'lendario', 'box_lendaria', { box: true, consumable: false, note: 'Nunca sai prêmio comum · grande chance de lendário' }),
  // comum
  loot('biscoito_sorte', 'Biscoito da Sorte', 'comum', 'fortune', { effects: { mood: 6, hunger: 4 }, special: 'fortune', note: 'Ela lê a sorte do dia' }),
  loot('lanca_confete', 'Lança-confete de bolso', 'comum', 'popper', { effects: { mood: 10 }, special: 'confetti', note: 'Uma chuva de confete em volta dela' }),
  loot('frasco_bolhas', 'Frasco de Bolhas', 'comum', 'bubblejar', { effects: { mood: 6, hygiene: 15 }, special: 'bubbles', note: 'Bolhas de sabão subindo' }),
  loot('bala_energia', 'Bala de Energia', 'comum', 'candy', { effects: { energy: 20 } }),
  loot('picole', 'Picolé de Frutas', 'comum', 'popsicle', { effects: { thirst: 30, mood: 5 } }),
  // incomum
  loot('banho_lata', 'Banho Instantâneo', 'incomum', 'soap', { effects: { hygiene: 100 }, special: 'bubbles', note: 'Limpinha na hora' }),
  loot('soneca_lata', 'Soneca em Lata', 'incomum', 'sleepcan', { effects: { energy: 60 }, special: 'zzz' }),
  loot('banquete', 'Banquete Completo', 'incomum', 'feast', { effects: { hunger: 100, thirst: 100, mood: 10 } }),
  loot('kit_socorro', 'Kit de Primeiros Socorros', 'incomum', 'firstaid', { effects: { health: 100 } }),
  loot('chuva_coracoes', 'Chuva de Corações', 'incomum', 'hearts', { effects: { mood: 15, affection: 15 }, special: 'hearts', note: 'Corações caindo em volta dela' }),
  loot('pote_vagalumes', 'Pote de Vagalumes', 'incomum', 'fireflies', { effects: { mood: 20 }, special: 'fireflies', note: 'Vagalumes voam em volta dela por 2 minutos' }),
  // raro
  loot('fogos', 'Fogos de Artifício', 'raro', 'rocket', { effects: { mood: 30, affection: 10 }, special: 'fireworks', note: 'Um show de fogos na área de trabalho' }),
  loot('ima_moedas', 'Ímã de Moedas', 'raro', 'magnet', { buff: ['coinMagnet', 1800], note: 'Moedas por tempo em dobro' }),
  loot('cristal_afeicao', 'Cristal de Afeição', 'raro', 'lovecrystal', { effects: { affection: 40, mood: 20 }, special: 'hearts' }),
  loot('cartucho_misterioso', 'Cartucho Misterioso', 'raro', 'mysterycart', { special: 'cart', note: 'Um cartucho que ela ainda não tem (ou moedas, se já tiver todos)' }),
  loot('relogio_parado', 'Relógio Parado', 'raro', 'clock', { buffs: [['noHunger', 900], ['noTired', 900]], note: 'Fome e cansaço param por 15 min' }),
  // lendario
  loot('pena_fenix', 'Pena da Fênix', 'lendario', 'feather', { effects: { health: 100, hunger: 100, thirst: 100, energy: 100, mood: 100, hygiene: 100 }, buff: ['shield', 3600], special: 'phoenix', note: 'Tudo no máximo e escudo por 1 hora' }),
  loot('estrela_cadente', 'Estrela Cadente', 'lendario', 'shootingstar', { effects: { mood: 20 }, special: 'luck', note: 'As próximas 3 caixas vêm com mais sorte' }),
  loot('coroa', 'Coroa Real', 'lendario', 'crown', { effects: { mood: 50, affection: 30 }, special: 'crown', note: 'Ela usa a coroa por 15 minutos' }),
  loot('elixir_arco_iris', 'Elixir Arco-íris', 'lendario', 'rainbow', { effects: { mood: 25 }, special: 'rainbow', note: 'Ela fica com as cores do arco-íris por 3 minutos' }),
];

// Treasure chest: outlined wood with metal bands and a lock (gem) in the middle.
const box = (wd, wm, wl, md, ml, gem) => (sprite) => sprite(20, 17, ({ rect, px }) => {
  const O = '#1a1020';
  rect(2, 0, 16, 1, O); rect(1, 1, 18, 2, O); rect(0, 3, 20, 14, O);
  rect(3, 1, 14, 1, wl); rect(2, 2, 16, 1, wl); rect(1, 3, 18, 3, wm); rect(1, 6, 18, 1, wd);
  rect(0, 7, 20, 1, O);
  rect(1, 8, 18, 8, wm); rect(1, 8, 18, 1, wl); rect(1, 11, 18, 1, wd); rect(1, 15, 18, 1, wd);
  for (const x of [3, 15]) {
    rect(x, 2, 2, 5, md); rect(x, 2, 1, 4, ml);
    rect(x, 8, 2, 8, md); rect(x, 8, 1, 7, ml);
  }
  rect(8, 5, 4, 6, O); rect(9, 6, 2, 4, md); rect(9, 6, 2, 2, gem); px(9, 6, '#ffffff'); px(10, 9, O);
});

defineIcons({
  box_comum: box('#4a2a14', '#7a4a24', '#a8703a', '#5c6680', '#c8d0e0', '#7fe3ff'),
  box_rara: box('#33164e', '#5e2a8a', '#8a4cbc', '#7c84a8', '#eef0ff', '#ff6ad5'),
  box_lendaria: box('#4e0e0e', '#8c1c1c', '#c03a3a', '#b07800', '#ffe070', '#5affc8'),
  coinpile: (s) => s(16, 14, ({ rect, px }) => {
    const coin = (x, y) => {
      rect(x + 1, y, 5, 1, '#8a5a00'); rect(x, y + 1, 7, 3, '#8a5a00');
      rect(x + 1, y + 1, 5, 2, '#ffc23a'); rect(x + 2, y + 1, 3, 1, '#fff1b0');
    };
    coin(1, 10); coin(8, 10); coin(4, 7); coin(1, 4); coin(8, 5); coin(5, 1);
    px(14, 1, '#ffffff'); px(0, 1, '#fff1b0');
  }),
  fortune: (s) => s(16, 12, ({ rect, px }) => {
    rect(2, 4, 12, 6, '#e8b45c'); rect(4, 2, 8, 2, '#e8b45c'); rect(3, 10, 10, 1, '#b07a2a'); rect(7, 3, 2, 7, '#b07a2a');
    rect(9, 6, 6, 2, '#ffffff'); px(14, 6, '#d33');
  }),
  popper: (s) => s(16, 16, ({ rect, px }) => {
    rect(3, 9, 5, 6, '#e94b8a'); rect(4, 8, 3, 1, '#ffd23f'); rect(3, 11, 5, 1, '#ffd23f');
    px(7, 5, '#ffd23f'); px(10, 3, '#5ef0ff'); px(12, 6, '#7aff6a'); px(9, 1, '#ff6ad5'); px(13, 2, '#ffd23f'); px(11, 8, '#ff6ad5'); px(5, 3, '#7aff6a');
  }),
  bubblejar: (s) => s(14, 16, ({ rect, circle, px }) => {
    rect(3, 6, 8, 9, '#9fe3ff'); rect(4, 4, 6, 2, '#e94b8a'); rect(4, 8, 1, 5, '#e6fbff');
    circle(10, 2, 2, '#c9f4ff'); px(10, 1, '#ffffff'); circle(4, 2, 1, '#c9f4ff');
  }),
  candy: (s) => s(18, 10, ({ rect, circle, px }) => {
    circle(9, 5, 4, '#ff5a5a'); rect(0, 3, 4, 4, '#ffd23f'); rect(14, 3, 4, 4, '#ffd23f');
    rect(7, 2, 1, 6, '#ffffff'); rect(10, 2, 1, 6, '#ffffff'); px(8, 3, '#ffd0d0');
  }),
  popsicle: (s) => s(10, 18, ({ rect, px }) => {
    rect(1, 0, 8, 12, '#ff7ab0'); rect(1, 4, 8, 4, '#ffd23f'); rect(1, 8, 8, 4, '#7ad8ff'); rect(4, 12, 2, 6, '#c8935a'); px(2, 1, '#ffd0e4');
  }),
  soap: (s) => s(16, 14, ({ rect, circle }) => {
    rect(1, 7, 12, 6, '#7ad8ff'); rect(2, 8, 10, 1, '#c9f4ff');
    circle(12, 4, 2, '#e6fbff'); circle(6, 3, 2, '#e6fbff'); circle(14, 9, 1, '#e6fbff');
  }),
  sleepcan: (s) => s(12, 16, ({ rect, px }) => {
    rect(1, 3, 10, 13, '#5b4bd6'); rect(1, 2, 10, 1, '#c0c4d0'); rect(1, 15, 10, 1, '#3a2f9a');
    rect(3, 6, 6, 1, '#ffd23f'); rect(7, 7, 1, 1, '#ffd23f'); rect(5, 8, 1, 1, '#ffd23f'); rect(3, 9, 6, 1, '#ffd23f'); px(9, 12, '#ffffff');
  }),
  feast: (s) => s(20, 14, ({ rect, circle, px }) => {
    rect(0, 10, 20, 3, '#f2f2f2'); rect(1, 13, 18, 1, '#b8b8c4');
    circle(6, 7, 4, '#c8642d'); rect(4, 6, 2, 1, '#e8935a'); rect(10, 4, 3, 7, '#f5d76e'); circle(15, 8, 3, '#7ad04a'); px(15, 6, '#ff5a5a');
  }),
  firstaid: (s) => s(16, 14, ({ rect }) => {
    rect(1, 3, 14, 11, '#f2f2f2'); rect(5, 0, 6, 3, '#b8b8c4'); rect(6, 1, 4, 2, '#f2f2f2');
    rect(7, 5, 2, 7, '#e23b3b'); rect(4, 7, 8, 3, '#e23b3b');
  }),
  hearts: (s) => s(18, 16, ({ rect }) => {
    const heart = (x, y, c) => { rect(x, y, 2, 1, c); rect(x + 3, y, 2, 1, c); rect(x - 1, y + 1, 7, 2, c); rect(x, y + 3, 5, 1, c); rect(x + 1, y + 4, 3, 1, c); rect(x + 2, y + 5, 1, 1, c); };
    heart(2, 1, '#ff6ad5'); heart(10, 4, '#ff3b6b'); heart(4, 9, '#ff9ad0');
  }),
  fireflies: (s) => s(14, 18, ({ rect, px }) => {
    rect(2, 5, 10, 12, '#3b5a3a'); rect(3, 3, 8, 2, '#8a5a2b'); rect(2, 6, 10, 10, '#21352a');
    px(5, 9, '#eaff6a'); px(9, 8, '#eaff6a'); px(7, 12, '#eaff6a'); px(4, 14, '#c6ff4a'); px(10, 13, '#eaff6a');
  }),
  rocket: (s) => s(12, 18, ({ rect, px }) => {
    rect(4, 2, 4, 10, '#e23b3b'); rect(5, 0, 2, 2, '#ffd23f'); rect(4, 5, 4, 1, '#ffffff'); rect(2, 10, 2, 3, '#3a54b8'); rect(8, 10, 2, 3, '#3a54b8');
    rect(5, 12, 2, 6, '#c8935a'); px(1, 1, '#ffd23f'); px(10, 3, '#5ef0ff'); px(11, 0, '#ff6ad5');
  }),
  magnet: (s) => s(16, 16, ({ rect }) => {
    rect(1, 1, 4, 10, '#e23b3b'); rect(11, 1, 4, 10, '#e23b3b'); rect(1, 10, 14, 5, '#e23b3b');
    rect(1, 1, 4, 3, '#d8dce6'); rect(11, 1, 4, 3, '#d8dce6');
  }),
  lovecrystal: (s) => s(14, 18, ({ rect }) => {
    rect(5, 0, 4, 2, '#ffb0e0'); rect(3, 2, 8, 4, '#ff6ad5'); rect(1, 6, 12, 5, '#e23b9a'); rect(3, 11, 8, 3, '#c21f7e'); rect(5, 14, 4, 3, '#a0145f');
    rect(4, 3, 2, 6, '#ffd0ef');
  }),
  mysterycart: (s) => s(16, 18, ({ rect }) => {
    rect(1, 0, 14, 18, '#5b5e70'); rect(1, 0, 14, 2, '#7a7e93'); rect(3, 3, 10, 10, '#2c2e38'); rect(3, 15, 10, 2, '#3b3d4a');
    rect(6, 5, 4, 1, '#ffd23f'); rect(9, 6, 1, 2, '#ffd23f'); rect(7, 8, 2, 1, '#ffd23f'); rect(7, 9, 1, 1, '#ffd23f'); rect(7, 11, 1, 1, '#ffd23f');
  }),
  clock: (s) => s(16, 16, ({ circle, rect, px }) => {
    circle(8, 9, 6, '#ffd23f'); circle(8, 9, 5, '#fff6d8'); rect(7, 1, 2, 2, '#ffd23f'); rect(8, 5, 1, 4, '#2c2e38'); rect(8, 9, 3, 1, '#2c2e38'); px(8, 9, '#e23b3b');
  }),
  feather: (s) => s(14, 18, ({ rect, px }) => {
    rect(6, 1, 3, 3, '#ffd23f'); rect(4, 4, 6, 4, '#ff8a3d'); rect(3, 8, 6, 4, '#e23b3b'); rect(4, 12, 4, 2, '#b01f1f');
    rect(6, 2, 1, 15, '#fff1b0'); px(5, 17, '#fff1b0'); px(9, 5, '#fff1b0');
  }),
  shootingstar: (s) => s(18, 16, ({ rect, px }) => {
    rect(0, 10, 6, 1, '#5ef0ff'); rect(2, 12, 6, 1, '#ff6ad5'); rect(1, 8, 6, 1, '#ffd23f');
    rect(11, 2, 2, 12, '#ffd23f'); rect(7, 6, 10, 3, '#ffd23f'); rect(9, 4, 6, 7, '#ffd23f'); px(11, 6, '#ffffff'); px(12, 5, '#fff1b0');
  }),
  crown: (s) => s(18, 14, ({ rect, px }) => {
    rect(1, 6, 16, 7, '#ffc23a'); rect(1, 2, 2, 4, '#ffc23a'); rect(8, 0, 2, 6, '#ffc23a'); rect(15, 2, 2, 4, '#ffc23a'); rect(4, 4, 2, 2, '#ffc23a'); rect(12, 4, 2, 2, '#ffc23a');
    rect(1, 11, 16, 2, '#c98200'); px(5, 8, '#e23b3b'); px(9, 8, '#3a54b8'); px(12, 8, '#7ad04a'); px(9, 1, '#ffffff');
  }),
  rainbow: (s) => s(14, 18, ({ rect }) => {
    rect(5, 0, 4, 4, '#c0c4d0'); rect(6, 0, 2, 1, '#8a5a2b');
    rect(2, 4, 10, 2, '#e23b3b'); rect(1, 6, 12, 2, '#ff8a3d'); rect(1, 8, 12, 2, '#ffd23f'); rect(1, 10, 12, 2, '#7ad04a'); rect(1, 12, 12, 2, '#3a8cff'); rect(2, 14, 10, 2, '#8847ff'); rect(3, 16, 8, 2, '#d32ce6');
  }),
});
defineIcons(Object.fromEntries(Object.entries(GLYPHS).map(([k, ch]) => [`lg_${k}`, () => glyphIcon(ch)])));
