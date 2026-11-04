// Shop catalog, inventory, coins, toys and saved progress (save.json next to the app).
import { FULL_STATS, DIFFICULTIES } from './behavior.js';
import { icon, cartridge } from './pixel.js';
import { GAMES } from './games.js';
import { FURN_ITEMS, baseId } from './furniture.js';
import { FUN_ITEMS } from './funtoys.js';
import { LOOT_ITEMS, RARITIES } from './lootitems.js';
import { VEND_UP_ITEMS, VEND_ITEMS } from './vendupitems.js';
import './medicons.js';
import { DEMO } from './edition.js';
import { BAG_ITEMS as BAGGABLE } from './skills.js';

const START_COINS = DEMO ? 2000 : 1000;
// Coins added to saves from before the bigger starting money (save version 2).
const START_BONUS = DEMO ? 1500 : 500;
const SAVE_VERSION = 3;
const EDITION = DEMO ? 'demo' : 'full';
// Her personal bag / "Dar a ela" — paused (items already in herBag stay usable).
export const HER_BAG = false;

export const SHOP_CATEGORIES = [
  ['comidas', '🍙', 'Comidas'],
  ['bebidas', '🥤', 'Bebidas'],
  ['medicina', '💊', 'Medicina'],
  ['fun', '🎮', 'Brinquedos'],
  ['cartuchos', '🕹', 'Cartuchos'],
  ['mangas', '📚', 'Mangás'],
  ['mobilia', '🛋', 'Mobília'],
  ['specials', '💎', 'Specials'],
];

// Price follows what it gives: Health and Energy weigh the most; bad side effects lower the price.
const WEIGHT = { hunger: 1, thirst: 0.8, health: 2, energy: 1.5, mood: 1.2, hygiene: 1 };
const valueOf = (fx) => Object.entries(fx).reduce((a, [k, v]) => a + (WEIGHT[k] ?? 1) * (v > 0 ? v : v * 0.5), 0);
const foodPrice = (fx, k = 0.6) => {
  const v = valueOf(fx) * k;
  return Math.max(5, v < 40 ? Math.round(v) : Math.round(v / 5) * 5);
};

export const INFINITE_MONEY = false;

const food = (id, cat, name, effects) => {
  const fx = cat === 'bebidas' ? { thirst: 35, ...effects } : effects;
  return { id, cat, name, effects: fx, price: foodPrice(fx), img: new URL(`./assets/food/${id}.png`, import.meta.url).href };
};
// Popcorn, chips and soda: session snacks. Usable any time; while watching she picks them first.
const snack = (id, cat, name, pixName, size, effects) => pix(id, cat, name, foodPrice(effects), pixName, { effects, watchOnly: true, size });
// Medicine works at once, so it costs double per point.
const med = (id, name, pixName, effects, cures = []) => pix(id, 'medicina', name, foodPrice(effects, 2.8), pixName, { effects, cures });
const pix = (id, cat, name, price, pixName, extra = {}) => ({
  id, cat, name, price, pix: pixName, effects: {}, ...extra,
  get img() {
    return typeof document === 'undefined' ? '' : icon(this.pix);
  },
});

export const BUFF_LABELS = {
  noHunger: 'Sem fome (não passa)',
  doubleMood: 'Humor em dobro ao ganhar',
  noTired: 'Sem cansaço (energia)',
  shield: 'Escudo (bloqueia dano à Saúde)',
  coinMagnet: 'Moedas em dobro',
  luck: 'Sorte +5% (Gacha/Slot/caixas)',
  deal: 'Trato: comida ruim sem Humor',
  behaved: 'Comportada (sem cursor/ícones)',
};
export const BUFF_ICONS = { noHunger: '🍔', doubleMood: '😊', noTired: '⚡', shield: '🛡️', coinMagnet: '🧲', luck: '🍀', deal: '✊', behaved: '🗿' };

// effects: changes applied to the pet's stats when consumed (hunger = satiety).
export const ITEMS = [
  food('onigiri', 'comidas', 'Onigiri', { hunger: 18, health: 2 }),
  food('onigiri_alga', 'comidas', 'Onigiri com alga', { hunger: 20, health: 3 }),
  food('onigiri_feliz', 'comidas', 'Onigiri sorridente', { hunger: 18, mood: 5 }),
  food('nigiri', 'comidas', 'Nigiri de salmão', { hunger: 14, health: 4 }),
  food('sushi_roll', 'comidas', 'Sushi roll', { hunger: 22, health: 3 }),
  food('uramaki', 'comidas', 'Uramaki', { hunger: 26, health: 3, mood: 3 }),
  food('ramen', 'comidas', 'Ramen', { hunger: 35, health: 2, energy: 4 }),
  food('ramen_picante', 'comidas', 'Ramen picante', { hunger: 35, mood: 5 }),
  food('bento', 'comidas', 'Bentô', { hunger: 45, health: 6 }),
  food('bento_especial', 'comidas', 'Bentô especial', { hunger: 50, health: 8, mood: 4 }),
  food('tempura', 'comidas', 'Tempurá de camarão', { hunger: 24, mood: 4, health: -1 }),
  food('tempura_tigela', 'comidas', 'Tigela de tempurá', { hunger: 30, mood: 5, health: -1 }),
  food('takoyaki', 'comidas', 'Takoyaki', { hunger: 22, mood: 6 }),
  food('takoyaki_porcao', 'comidas', 'Porção de takoyaki', { hunger: 30, mood: 7, health: -1 }),
  food('taiyaki', 'comidas', 'Taiyaki', { hunger: 14, mood: 10 }),
  food('taiyaki_creme', 'comidas', 'Taiyaki de creme', { hunger: 14, mood: 12, health: -1 }),
  food('mochi', 'comidas', 'Mochi', { hunger: 8, mood: 10 }),
  food('mochi_morango', 'comidas', 'Mochi de morango', { hunger: 10, mood: 14, health: -1 }),
  food('daifuku', 'comidas', 'Daifuku', { hunger: 10, mood: 12 }),
  food('dango', 'comidas', 'Dango', { hunger: 10, mood: 9 }),
  food('mitarashi', 'comidas', 'Mitarashi dango', { hunger: 12, mood: 10 }),
  food('matcha', 'bebidas', 'Chá matcha', { energy: 12, health: 2 }),
  food('matcha_quente', 'bebidas', 'Matcha quente', { energy: 14, mood: 4 }),
  food('matcha_gelado', 'bebidas', 'Matcha gelado', { energy: 8, health: 3, hunger: 2 }),
  food('matcha_latte', 'bebidas', 'Matcha latte', { energy: 10, hunger: 6, mood: 4 }),
  food('bubble_matcha', 'bebidas', 'Bubble tea de matcha', { hunger: 8, mood: 10, health: -1 }),
  food('matcha_frappe', 'bebidas', 'Matcha frappé', { mood: 12, energy: 6, health: -1 }),
  // Free: keeps the pet alive, but it hates them.
  pix('sobras', 'comidas', 'Sobras', 0, 'leftovers', { effects: { hunger: 25, mood: -25 }, note: 'Grátis, mas ela odeia' }),
  pix('agua_torneira', 'bebidas', 'Água de Torneira', 0, 'tapwater', { effects: { thirst: 30, mood: -20 }, note: 'Grátis, mas ela odeia' }),
  snack('pipoca_p', 'comidas', 'Pipoca pequena', 'popcorn_p', 1, { hunger: 18, mood: 10 }),
  snack('pipoca_m', 'comidas', 'Pipoca média', 'popcorn_m', 2, { hunger: 32, mood: 18 }),
  snack('pipoca_g', 'comidas', 'Pipoca grande', 'popcorn_g', 3, { hunger: 50, mood: 28 }),
  snack('soda_p', 'bebidas', 'Soda pequena', 'soda_p', 1, { thirst: 30, mood: 8 }),
  snack('soda_m', 'bebidas', 'Soda média', 'soda_m', 2, { thirst: 50, mood: 14 }),
  snack('soda_g', 'bebidas', 'Soda grande', 'soda_g', 3, { thirst: 75, mood: 22 }),
  snack('chips_p', 'comidas', 'Batata chips pequena', 'chips_p', 1, { hunger: 16, mood: 10, thirst: -4 }),
  snack('chips_m', 'comidas', 'Batata chips média', 'chips_m', 2, { hunger: 28, mood: 17, thirst: -6 }),
  snack('chips_g', 'comidas', 'Batata chips grande', 'chips_g', 3, { hunger: 44, mood: 26, thirst: -9 }),
med('vitamina', 'Vitamina', 'med_vitamin', { health: 8, energy: 4 }, ['gripe', 'exausta']),
  med('curativo', 'Curativo', 'med_bandage', { health: 12 }, ['lesao', 'nausea']),
  med('remedio', 'Remédio', 'med_pill', { health: 30, mood: -3 }, ['gripe', 'prisao', 'nausea', 'lesao']),
  med('pocao', 'Poção de cura', 'med_potion', { health: 60, energy: 20 }, ['gripe', 'prisao', 'nausea', 'lesao']),
  // New: targeted cures for each negative status.
  med('antigripal', 'Antigripal', 'med_vitamin', { health: 5, energy: 6 }, ['gripe']),
  med('laxante', 'Laxante', 'med_pill', { health: 3, mood: 2 }, ['prisao']),
  med('antinausea', 'Antinausea', 'med_potion', { health: 8, mood: 3 }, ['nausea']),
  med('bandagem_lesao', 'Curativo para lesão', 'med_bandage', { health: 14, energy: 3 }, ['lesao']),
  med('energetico', 'Energético', 'med_bolt', { energy: 25, mood: -6 }, ['exausta']),
  pix('pu_saciedade', 'medicina', 'PowerUp: Saciedade', 280, 'med_star', { buff: ['noHunger', 300], rarity: 'comum' }),
  pix('pu_alegria', 'medicina', 'PowerUp: Alegria', 280, 'med_heart', { buff: ['doubleMood', 300], rarity: 'comum' }),
  pix('pu_energia', 'medicina', 'PowerUp: Energia', 280, 'med_bolt', { buff: ['noTired', 300], rarity: 'comum' }),
  pix('pu_sorte', 'medicina', 'PowerUp: Sorte', 320, 'med_clover', { buff: ['luck', 600], rarity: 'incomum' }),
  pix('pu_ima', 'medicina', 'PowerUp: Ímã', 360, 'med_magnet', { buff: ['coinMagnet', 900], rarity: 'incomum' }),
  pix('pu_escudo', 'medicina', 'PowerUp: Escudo', 420, 'med_shield', { buff: ['shield', 600], rarity: 'raro' }),
  pix('pu_supremo', 'medicina', 'PowerUp: Supremo', 900, 'med_crown', {
    buffs: [['shield', 1200], ['noHunger', 600], ['noTired', 600], ['doubleMood', 600]], rarity: 'epico',
  }),
  // Test helper (promo powermeup): wipes every active buff. Not sold in the shop.
  pix('pu_limpar', 'medicina', 'PowerUp: Reset', 0, 'med_reset', {
    clearBuffs: true, legacy: true, note: 'Remove todos os buffs ativos',
  }),
  // Fun stuffs: placed on the desktop, the pet plays with them on its own. gain = stats per second.
  // GameBuddy stays on the desktop (cartridge bag sits next to it); not baggable.
  { id: 'gameboy', cat: 'fun', toy: true, name: 'GameBuddy', price: 180, effects: {}, gain: { mood: 0.45 }, get img() { return icon('buddy'); } },
  pix('pelucia', 'fun', 'Doll (boneco articulado)', 120, 'doll', { toy: true, gain: { mood: 0.3, energy: 0.05 }, note: 'Boneco de blocos com física · botão direito troca a skin' }),
  pix('bola', 'fun', 'Bola', 80, 'ball', { toy: true, baggable: true, gain: { mood: 0.35, energy: -0.1, hunger: -0.04, thirst: -0.07 } }),
  pix('espada', 'fun', 'Espada de bamboo', 100, 'sword', { toy: true, baggable: true, weapon: 'espada', gain: { mood: 0.4, hunger: -0.06, thirst: -0.07, energy: -0.1 } }),
  pix('gancho', 'fun', 'Grappling hook', 250, 'hook', { gear: true, baggable: true }),
  pix('microfone', 'fun', 'Microfone de mão', 150, 'mic', { gear: true, baggable: true, note: 'Canta sozinho de vez em quando · libera o Modo Karaokê no Jam' }),
  pix('syntoyo', 'fun', 'Syntoyo', 180, 'syntoyo', { toy: true, gear: true, baggable: true, weapon: 'syntoyo', gain: { mood: 0.4 }, note: 'Ioiô synthwave · novos truques e golpes · só aparece ao dominar o ioiô comum' }),
  pix('bolsa_p', 'fun', 'Bolsa pequena', 120, 'bag_s', { gear: true, bagSlots: 3, note: 'Inventário dela: 3 slots' }),
  pix('bolsa_m', 'fun', 'Bolsa média', 280, 'bag_m', { gear: true, bagSlots: 6, note: 'Inventário dela: 6 slots' }),
  pix('bolsa_g', 'fun', 'Bolsa grande', 520, 'bag_g', { gear: true, bagSlots: 9, note: 'Inventário dela: 9 slots' }),
  // Specials: rare and expensive.
  pix('cristal', 'specials', 'Crystal Mágico', 2500, 'crystal', { gear: true, rare: true, note: 'Dá vida ao Doll: ele passeia, investiga objetos e mobília e brinca com a Persocon (precisa do Doll na área de trabalho)' }),
  pix('trevo', 'specials', 'Trevo da Sorte', 1500, 'clover', { gear: true, rare: true, note: '+50% em todas as moedas ganhas' }),
  pix('elixir', 'specials', 'Elixir Dourado', 800, 'elixir', { consumable: true, rare: true, rarity: 'lendario', effects: { health: 100, hunger: 100, thirst: 100, energy: 100, mood: 100, hygiene: 100 }, buff: ['shield', 1800] }),
  pix('ampulheta', 'specials', 'Ampulheta Encantada', 1200, 'hourglass', { consumable: true, rare: true, rarity: 'lendario', buffs: [['noHunger', 1800], ['noTired', 1800], ['doubleMood', 1800]] }),
  pix('corvo', 'specials', 'Caixa Misteriosa', 3000, 'crowbox', { gear: true, rare: true, note: 'Tem algo vivo aí dentro... dá para ouvir umas bicadas. Um novo amigo para a Persocon treinar?' }),
  pix('estrela', 'specials', 'Estrela dos Desejos', 1000, 'wishstar', { consumable: true, rare: true, effects: { affection: 40, mood: 40 } }),
  ...Object.entries(GAMES).filter(([id]) => id !== 'tetris').map(([id, g]) => ({
    id: `cart_${id}`, cat: 'cartuchos', cart: id, name: g.name, price: 20 + g.tier * 30, effects: {},
    get img() {
      return typeof document === 'undefined' ? '' : cartridge(g.color, id);
    },
  })),
  ...FURN_ITEMS,
  ...FUN_ITEMS,
  ...LOOT_ITEMS,
  ...VEND_UP_ITEMS,
  ...VEND_ITEMS,
  ...legacyItems(),
];

// Items from the first catalog: no longer sold, but still usable if they are in a saved inventory.
function legacyItems() {
  return [
  { id: 'maca', cat: 'comidas', icon: '🍎', name: 'Maçã', effects: { hunger: 10, health: 3 } },
  { id: 'banana', cat: 'comidas', icon: '🍌', name: 'Banana', effects: { hunger: 12, energy: 3 } },
  { id: 'cenoura', cat: 'comidas', icon: '🥕', name: 'Cenoura', effects: { hunger: 8, health: 4 } },
  { id: 'pao', cat: 'comidas', icon: '🍞', name: 'Pão', effects: { hunger: 15 } },
  { id: 'biscoito', cat: 'comidas', icon: '🍪', name: 'Biscoito', effects: { hunger: 6, mood: 6 } },
  { id: 'sanduiche', cat: 'comidas', icon: '🥪', name: 'Sanduíche', effects: { hunger: 25, health: 2 } },
  { id: 'salada', cat: 'comidas', icon: '🥗', name: 'Salada', effects: { hunger: 15, health: 8 } },
  { id: 'sopa', cat: 'comidas', icon: '🍲', name: 'Sopa', effects: { hunger: 25, health: 6 } },
  { id: 'peixe', cat: 'comidas', icon: '🐟', name: 'Peixe assado', effects: { hunger: 30, health: 5 } },
  { id: 'carne', cat: 'comidas', icon: '🍖', name: 'Carne assada', effects: { hunger: 40, energy: 5 } },
  { id: 'pizza', cat: 'comidas', icon: '🍕', name: 'Pizza', effects: { hunger: 35, mood: 8, health: -1 } },
  { id: 'hamburguer', cat: 'comidas', icon: '🍔', name: 'Hambúrguer', effects: { hunger: 38, mood: 6, health: -2 } },
  { id: 'bolo', cat: 'comidas', icon: '🍰', name: 'Bolo', effects: { hunger: 18, mood: 12, health: -1 } },
  { id: 'sorvete', cat: 'comidas', icon: '🍨', name: 'Sorvete', effects: { hunger: 8, mood: 14 } },
  { id: 'agua', cat: 'bebidas', icon: '💧', name: 'Água', effects: { hunger: 3, health: 3 } },
  { id: 'suco', cat: 'bebidas', icon: '🧃', name: 'Suco', effects: { hunger: 6, health: 2, mood: 3 } },
  { id: 'leite', cat: 'bebidas', icon: '🥛', name: 'Leite', effects: { hunger: 8, health: 3 } },
  { id: 'cha', cat: 'bebidas', icon: '🍵', name: 'Chá', effects: { mood: 6, health: 2 } },
  { id: 'cafe', cat: 'bebidas', icon: '☕', name: 'Café', effects: { energy: 15, hunger: -2 } },
  { id: 'refri', cat: 'bebidas', icon: '🥤', name: 'Refrigerante', effects: { hunger: 4, mood: 8, health: -2 } },
  ].map((i) => ({ ...i, legacy: true }));
}

export const STAT_LABELS = { health: 'Saúde', hunger: 'Fome', mood: 'Humor', energy: 'Energia', thirst: 'Sede', hygiene: 'Higiene' };

export const ATTRS = [
  ['str', 'Força'], ['dex', 'Destreza'], ['agi', 'Agilidade'], ['con', 'Constituição'],
  ['will', 'Força de Vontade'], ['per', 'Percepção'], ['cha', 'Carisma'], ['int', 'Inteligência'],
];

export const itemById = (id) => ITEMS.find((i) => i.id === id);
export const isEdible = (item) => item && (item.cat === 'comidas' || item.cat === 'bebidas');
// Things she tastes the first time: from favorite to hated, neutral being the most common.
export const hasTaste = (item) => isEdible(item) || item?.cat === 'medicina';
export const TASTES = ['love', 'like', 'ok', 'dislike', 'hate'];
export const TASTE_MOOD = { love: 10, like: 4, ok: 0, dislike: -10, hate: -18 };
// Higher = she picks it first (her own food bag, requests, vending machines).
export const TASTE_RANK = { love: 4, like: 3, ok: 2, dislike: 1, hate: 0 };
export function rollTaste(item) {
  const r = Math.random();
  if (item.price === 0) return r < 0.6 ? 'dislike' : 'hate';
  return r < 0.1 ? 'love' : r < 0.3 ? 'like' : r < 0.75 ? 'ok' : r < 0.92 ? 'dislike' : 'hate';
}
export const isConsumable = (item) => isEdible(item) || item?.cat === 'medicina' || !!item?.consumable || !!item?.box;
export const isPowerUp = (item) => !!(item && (item.buff || item.buffs));
export const POWER_TIER = { comum: 0, incomum: 1, raro: 2, lendario: 3, epico: 4 };
export const powerTier = (item) => {
  if (!item) return 0;
  if (item.rarity != null && POWER_TIER[item.rarity] != null) return POWER_TIER[item.rarity];
  if (item.buffs || item.rare) return 3;
  if (item.buff) return 1;
  return 0;
};
export const POWERUP_DURS = [2.6, 2.6, 2.6, 2.6, 2.6];
export const powerupDuration = (item) => (isPowerUp(item) ? 2.6 : 1.0);

// Food, drinks, multi-copy furniture, PowerUps and loot prizes: sell at half of shopValue.
export const SELL_RATE = 0.5;
// Friendly catalog value when price is 0 (loot prizes): by rarity.
const LOOT_VALUE = { comum: 40, incomum: 100, raro: 220, lendario: 500, epico: 350 };
export const shopValue = (item) => {
  if (!item) return 0;
  if ((item.price || 0) > 0) return item.price;
  if (item.cat === 'premios' || item.loot) return LOOT_VALUE[item.rarity] || 50;
  return 0;
};
export const isSellable = (item) => {
  if (!item || item.fixed) return false;
  if (isEdible(item) || item.decor) return shopValue(item) > 0;
  if (item.cat === 'premios' || item.loot) return true;
  // PowerUps (and other priced medicine).
  if (item.cat === 'medicina') return !!(item.buff || item.buffs) || shopValue(item) > 0;
  return false;
};
export const sellPrice = (item) => Math.max(1, Math.floor(shopValue(item) * SELL_RATE));

export function effectText(item) {
  const effects = item.effects || item;
  const parts = Object.entries(effects).map(([k, v]) => `${v > 0 ? '+' : ''}${v} ${STAT_LABELS[k] || (k === 'affection' ? 'Afeição' : k)}`);
  for (const b of item.buffs || (item.buff ? [item.buff] : [])) parts.push(`${BUFF_LABELS[b[0]]} por ${b[1] / 60} min`);
  if (item.clearBuffs) parts.push('Remove todos os buffs ativos');
  if (item.rare) parts.push('💎 Raro');
  if (item.rarity && (item.loot || isPowerUp(item))) parts.push(`★ ${RARITIES[item.rarity]?.label || item.rarity}`);
  if (item.loot && item.note) parts.push(item.note);
  if (item.toy) parts.push('Coloque na área de trabalho');
  if (item.cart) parts.push(`Vai para a bolsa de cartuchos (GameBuddy, GameGlow, PlayPocket e TV) · complexidade ${'★'.repeat(GAMES[item.cart]?.tier || 1)}`);
  if ((item.toy || item.manga) && item.note) parts.push(item.note);
  if (item.watchOnly) parts.push('Petisco de sessão · assistindo ou jogando na TV ela prefere este');
  if (item.gear) parts.push(item.note || 'A Persocon guarda e usa sozinha: alcança lugares altos, puxa coisas e pega o mouse');
  return parts.join(' · ');
}

const newProfile = () => ({
  born: Date.now(), consumed: {}, pats: 0, slaps: 0, chases: 0, chaseWins: 0, escapes: 0,
  gamesPlayed: 0, coinsEarned: 0, toysBought: 0, requestsDone: 0, purchases: 0, boxesOpened: 0, missionsDone: 0, wallet: 0,
  attrs: Object.fromEntries(ATTRS.map(([k]) => [k, 0])),
  bagSize: 1, herBag: [], skills: {},
});

export class Game {
  constructor(pet, save) {
    this.pet = pet;
    this.listeners = [];
    this.dirty = false;
    this.load(save);
    setInterval(() => this.persist(), 15000);
    // Coins per minute while alive: 1, +1 when happy, +1 when well cared for (max 180/hour).
    setInterval(() => {
      if (pet.dead) return;
      const s = pet.stats;
      const cared = s.health >= 60 && s.hunger >= 40 && (s.thirst ?? 100) >= 40 && (s.hygiene ?? 100) >= 40;
      // Affection speeds it up: up to x3 at the maximum. Furniture and fun stuff on the desktop add more.
      const k = (pet.buff('coinMagnet') ? 2 : 1) * (1 + Math.max(0, pet.affection) / 500) * this.decorBonus();
      const p = this.profile;
      p.coinFrac = (p.coinFrac || 0) + (1 + (s.mood >= 60 ? 1 : 0) + (cared ? 1 : 0)) * k;
      const n = Math.floor(p.coinFrac);
      p.coinFrac -= n;
      if (n) this.earn(n);
    }, 60000);
    // Daily bonus on the first start of each day.
    const today = new Date().toDateString();
    if (this.profile.lastDaily !== today) {
      this.dailyBonus = !!this.profile.lastDaily;
      this.profile.lastDaily = today;
      if (this.dailyBonus) this.earn(100);
    }
    pet.on((type, data) => {
      const p = this.profile;
      if (type === 'death') return this.reset();
      if (type === 'pet') p.pats++;
      if (type === 'slap') p.slaps++;
      if (type === 'chaseStart') p.chases++;
      if (type === 'chaseEnd' && data.caught) {
        p.chaseWins++;
      }
      if (type === 'qteEscape') p.escapes++;
      // Skip flush on interrupted toyEnd: slap sets hurt right after and would race with feed/queue.
      if (type === 'toyEnd' && data?.interrupted) { /* chooseNext after hurt flushes */ }
      else if (['toyEnd', 'activityEnd', 'chaseEnd', 'ballEnd'].includes(type)) this.flushAfterPlay();
      if (type === 'requestDone') {
        p.requestsDone++;
      }
      if (type === 'ate') p.consumed[data.item.id] = (p.consumed[data.item.id] || 0) + 1;
      if ((type === 'ate' || type === 'medicine') && hasTaste(data.item)) this.taste(data.item, data);
      if (['eat', 'slap', 'pet', 'chaseEnd', 'wake', 'prefs'].includes(type)) this.dirty = true;
    });
  }

  // Placed furniture and fun stuff (not broken, minus the printer): +6% coins each, up to x2.
  decorBonus() {
    const n = Object.entries(this.toys).filter(([k, t]) => t.placed && !t.broken && baseId(k) !== 'impressora').length;
    return 1 + Math.min(1, n * 0.06);
  }

  load(save) {
    this.inventory = { ...(save?.inventory || {}) };
    this.coins = save?.coins ?? START_COINS;
    if (save && (save.version || 1) < SAVE_VERSION) this.coins += START_BONUS;
    this.wishes = save?.wishes || [];
    this.promos = save?.promos || [];
    this.profile = { ...newProfile(), ...(save?.profile || {}) };
    this.profile.attrs = Object.fromEntries(ATTRS.map(([k]) => [k, 0]));
    this.profile.bagSize ||= 1;
    this.profile.herBag ||= [];
    this.profile.skills ||= {};
    // toys: { id: { uses, maxUses, broken, placed, x } }
    this.toys = { ...(save?.toys || {}) };
    // Decor kept in the inventory is just a count (older saves also had a record for it).
    for (const [key, t] of Object.entries(this.toys)) if (!t.placed && itemById(baseId(key))?.decor) delete this.toys[key];
    // Last color/intensity chosen for each party item: new copies start with it.
    this.disco = { ...(save?.disco || {}) };
    this.cartridges = save?.cartridges || ['tetris'];
    this.cartridge = save?.cartridge || 'tetris';
    this.bag = !!save?.bag;
    this.bagX = save?.bagX ?? null;
    this.gear = { ...(save?.gear || {}) };
    if (HER_BAG) {
      for (const id of ['gancho', 'microfone', 'syntoyo']) {
        if (this.gear[id] && !this.profile.herBag.includes(id) && this.profile.herBag.length < (this.profile.bagSize || 1)) {
          this.profile.herBag.push(id);
        }
      }
    }
    this.foodBagX = save?.foodBagX ?? null;
    this.perch = save?.perch || {};
    this.mangas = save?.mangas || [];
    // Collectible figures from the Gacha (kept on the shelves).
    this.figures = save?.figures || [];
    this.dollSkin = save?.dollSkin || null;
    this.dollScale = Math.min(2.5, Math.max(0.5, save?.dollScale || 1));
    // Doll YSM import removed from UI — ignore leftover save field.
    this.dollModel = null;
    this.dollAwake = save?.dollAwake !== false;
    // Purchases waiting on the floor until the pet checks and puts them away: [{ id, n, x, display }].
    this.deliveries = save?.deliveries || [];
    // Purchases waiting for the 3D printer, in order (the first one is printing): [{ id, n, t, dur }].
    this.queue = save?.queue || [];
    // Every game has the 3D printer: purchases come out of it.
    if (!this.toys.impressora) this.toys.impressora = { uses: 0, maxUses: 0, broken: false, placed: true, x: null, display: 0 };
    this.repairToys();
    this.ensureDesktopBuddy();
    this.ensureSyntoyoToy();
    this.pet.buffs = { ...(save?.buffs || {}) };
    this.pet.affection = save?.affection ?? 0;
    this.profile.loveTop ??= Math.max(0, Math.floor(this.pet.affection / 100) * 100);
    this.pet.jamMoves = this.profile.jamMoves || 0;
    this.pet.gear = this.gear;
    this.pet.prefs = this.profile.prefs ||= {};
    this.pet.wishes = this.wishes;
    this.migrateTastes();
  }

  // Orphan furniture (placed:false, not in inventory / her bag) vanished from both desk and Inventário.
  // Also clears stale homeX left when training on the dummy was interrupted.
  repairToys() {
    for (const [key, t] of Object.entries(this.toys)) {
      if (!t || typeof t !== 'object') continue;
      delete t.homeX;
      const id = baseId(key);
      const item = itemById(id);
      if (!item || item.fixed || item.decor) continue;
      if (t.placed) continue;
      if (this.count(id) > 0 || this.bagHas(id)) continue;
      // Restore to the player's inventory so it shows up again.
      this.inventory[id] = 1;
    }
  }

  // Older saves only had gear.syntoyo (bag-only). Ensure a desktop toy + Inventário entry.
  ensureSyntoyoToy() {
    if (!this.gear.syntoyo && !this.count('syntoyo') && !this.bagHas('syntoyo')) return;
    this.gear.syntoyo = true;
    this.pet.gear = this.gear;
    if (!this.toys.syntoyo) {
      this.toys.syntoyo = { uses: 0, maxUses: 20 + Math.floor(Math.random() * 31), broken: false, placed: false, x: null };
    }
    const t = this.toys.syntoyo;
    if (!t.placed && !this.count('syntoyo') && !this.bagHas('syntoyo')) this.inventory.syntoyo = 1;
  }

  static async load() {
    try {
      const save = (await window.petAPI.loadSave(DEMO)) || null;
      // Demo and full game saves don't mix.
      return save?.edition && save.edition !== EDITION ? null : save;
    } catch {
      return null;
    }
  }

  onChange(fn) {
    this.listeners.push(fn);
  }

  changed() {
    this.dirty = true;
    for (const fn of this.listeners) fn();
    this.persist();
  }

  earn(n) {
    if (this.gear.trevo && n > 0) n = Math.round(n * 1.5);
    this.coins += n;
    this.profile.coinsEarned += n;
    if (n > 0) this.pet?.emit('earn', { n });
    this.changed();
  }

  count(id) {
    return this.inventory[id] || 0;
  }

  items(filter = () => true) {
    return Object.entries(this.inventory)
      .filter(([, n]) => n > 0)
      .map(([id, n]) => ({ item: itemById(id), count: n }))
      .filter((e) => e.item && filter(e.item));
  }

  // Whether the item is listed in the shop right now.
  available(item) {
    if (item.legacy || item.fixed || item.loot) return false;
    if ((item.cart || item.manga || item.gear || (item.toy && !item.decor)) && this.pending(item.id)) return false;
    if (item.cart) return ['gameboy', 'gamegear', 'psp', 'videogame'].some((c) => this.toys[c]) && !this.cartridges.includes(item.cart);
    if (item.manga) return this.hasShelf() && !this.mangas.includes(item.id);
    if (item.id === 'ioio') return !this.gear.syntoyo && (!this.toys.ioio || this.toys.ioio.broken) && !(this.profile.herBag || []).includes('ioio');
    if (item.id === 'syntoyo') {
      const lvl = Math.min(10, 1 + Math.floor((this.profile.fun?.yoyo || 0) / 12));
      return lvl >= 10 && !this.gear.syntoyo;
    }
    if (item.bagSlots) {
      if (!HER_BAG) return false;
      const cur = this.profile.bagSize || 1;
      return !this.gear[item.id] && item.bagSlots > cur;
    }
    if (item.gear) return !this.gear[item.id];
    if (item.decor) return true;
    if (item.toy) return !this.toys[item.id] || this.toys[item.id].broken;
    return true;
  }

  herBag() {
    return this.profile.herBag ||= [];
  }

  bagCap() {
    return Math.max(1, this.profile.bagSize || 1);
  }

  bagHas(id) {
    return this.herBag().includes(id);
  }

  bagFree() {
    return this.bagCap() - this.herBag().length;
  }

  // Food/drink that can sit in her personal bag (one unit per slot; same id may repeat).
  isBagSupply(item) {
    return !!item && ['comidas', 'bebidas'].includes(item.cat) && !item.watchOnly;
  }

  // Portable toy/gear/food she can carry (not furniture, not the Doll, not bag upgrades).
  canBag(id) {
    if (!HER_BAG) return false;
    const item = itemById(id);
    // GameBuddy stays on the desktop with the cartridge bag.
    if (!item || item.bagSlots || item.fixed || item.furn || item.decor || id === 'pelucia' || id === 'corvo' || id === 'gameboy') return false;
    if (this.isBagSupply(item)) return true;
    return !!(item.baggable || item.gear || BAGGABLE.has(id));
  }

  // Pull GameBuddy out of her bag (old saves) and keep it placed on the desk.
  ensureDesktopBuddy() {
    const bag = this.herBag();
    const i = bag.indexOf('gameboy');
    if (i >= 0) bag.splice(i, 1);
    let t = this.toys.gameboy;
    if (!t && (this.count('gameboy') > 0 || i >= 0)) {
      t = this.toys.gameboy = { uses: 0, maxUses: 20 + Math.floor(Math.random() * 31), broken: false, placed: false, x: null };
    }
    if (this.cartridges?.length) this.bag = true;
    if (!t) return;
    if (this.count('gameboy') > 0) this.take('gameboy');
    if (!t.placed || t.x == null) {
      t.placed = true;
      if (t.x == null) t.x = (this.bagX != null ? this.bagX + 40 : null);
      delete t.fromBag;
    }
    // Cartridge bag follows the GameBuddy; drop a stale perch on a missing object.
    const perch = (this.perch ||= {}).bag;
    if (perch?.on && !this.toys[perch.on]?.placed) {
      perch.on = perch.dx = perch.y = undefined;
    }
    if (t.placed && t.x != null && (this.bagX == null || !Number.isFinite(this.bagX))) {
      this.bagX = t.x - 40;
    }
  }

  // Put an owned baggable item (or 1 food/drink) into her personal bag. Returns false if full / invalid.
  bagStore(id) {
    if (!HER_BAG) return false;
    const item = itemById(id);
    if (!item || !this.canBag(id)) return false;
    const supply = this.isBagSupply(item);
    if (supply && !this.count(id)) return false;
    const bag = this.herBag();
    if (this.bagFree() <= 0) return false;
    // Toys/gear stay unique; food/drinks may fill several slots.
    if (!supply && bag.includes(id)) return false;
    // Leave the desktop / player inventory.
    const t = this.toys[id];
    if (t?.placed) {
      t.placed = false;
      t.x = null;
    }
    if (this.inventory[id]) {
      this.inventory[id]--;
      if (!this.inventory[id]) delete this.inventory[id];
    }
    bag.push(id);
    if (item.gear || id === 'syntoyo' || id === 'gancho' || id === 'microfone') this.gear[id] = true;
    this.pet.gear = this.gear;
    // "Dar a ela" counts as fulfilling the matching wish/request.
    const kind = item.cat === 'comidas' ? 'food' : item.cat === 'bebidas' ? 'drink' : 'play';
    this.pet?.fulfill?.(kind, id);
    this.changed();
    return true;
  }

  // How many of id she carries in her bag (food can stack across slots).
  bagCount(id) {
    return this.herBag().filter((x) => x === id).length;
  }

  // Eat/drink 1 unit from her bag (does not touch the desktop inventory).
  useFromBag(id) {
    const bag = this.herBag();
    const i = bag.indexOf(id);
    const item = itemById(id);
    if (i < 0 || !item || !isConsumable(item)) return false;
    if (this.pet.busyForQueue?.() && !this.pet.dead) {
      (this.pet.afterPlay ||= []).push(`bag:${id}`);
      return true;
    }
    if (item.cat === 'medicina' || item.consumable) {
      if (!this.pet.medicate(item)) return false;
      this.profile.consumed[id] = (this.profile.consumed[id] || 0) + 1;
    } else if (!this.pet.feed(item)) return false;
    bag.splice(i, 1);
    this.changed();
    return true;
  }

  // Send an item from her bag back to the player's inventory.
  bagTake(id) {
    const bag = this.herBag();
    const i = bag.indexOf(id);
    if (i < 0) return false;
    bag.splice(i, 1);
    const item = itemById(id);
    // Syntoyo stays unlocked (gear + desktop toy); other bag gear clears until given again.
    if (id === 'syntoyo') {
      this.gear.syntoyo = true;
      this.pet.gear = this.gear;
    } else if (item?.gear) {
      delete this.gear[id];
      this.pet.gear = this.gear;
    }
    this.inventory[id] = (this.inventory[id] || 0) + 1;
    if (id === 'syntoyo') this.ensureSyntoyoToy();
    this.changed();
    return true;
  }

  skillXp(id) {
    return (this.profile.skills ||= {})[id] || 0;
  }

  skillAdd(id, amount) {
    const s = (this.profile.skills ||= {});
    s[id] = (s[id] || 0) + amount;
    this.changed();
    return s[id];
  }

  hasShelf() {
    return this.count('estante') > 0 || Object.keys(this.toys).some((k) => baseId(k) === 'estante');
  }

  // Coins handed to the Persocon's own wallet (spent by her at the Gacha and the Slot): Humor and
  // affection, less and less for gifts in a row (what was given in the last 30 min counts).
  giveWallet(n) {
    if (this.pet.dead || n <= 0 || !this.canBuy({ price: n })) return null;
    this.pay(n);
    const p = this.profile;
    const now = Date.now();
    p.gifts = (p.gifts || []).filter(([t]) => now - t < 30 * 60e3);
    const recent = p.gifts.reduce((a, [, v]) => a + v, 0);
    p.gifts.push([now, n]);
    p.wallet = (p.wallet || 0) + n;
    p.walletGiven = (p.walletGiven || 0) + n;
    const k = 1 / (1 + recent / 100);
    const fx = { mood: Math.min(18, 3 + n / 6) * k, affection: Math.sqrt(n) * 0.6 * k };
    this.pet.adjust(fx);
    this.pet.emit('walletGift', { n, k });
    this.changed();
    return fx;
  }

  canBuy(item, n = 1) {
    return INFINITE_MONEY || (item.price || 0) * n <= this.coins;
  }

  canSell(item, n = 1) {
    return isSellable(item) && n > 0 && this.count(item.id) >= n;
  }

  // Refund at SELL_RATE; only inventory stacks (place furniture back first).
  sell(id, n = 1) {
    const item = itemById(id);
    if (!this.canSell(item, n)) return 0;
    const got = sellPrice(item) * n;
    this.inventory[id] = this.count(id) - n;
    if (!this.inventory[id]) delete this.inventory[id];
    this.earn(got);
    return got;
  }

  pay(n) {
    if (!INFINITE_MONEY) this.coins -= n;
  }

  // Returns the bought item (for the purchase reaction) or null. It goes into the 3D printer queue
  // (printed one at a time, random time) and then the pet takes it from the printer (see deliver).
  buy(id, n = 1) {
    const item = itemById(id);
    if (!item || !this.canBuy(item, n)) return null;
    this.pay((item.price || 0) * n);
    this.profile.purchases = (this.profile.purchases || 0) + 1;
    if (this.toys.impressora) {
      const waiting = this.queue.find((j, i) => j.id === id && (i > 0 || !j.t));
      if (waiting) waiting.n += n;
      else this.queue.push({ id, n, t: 0, dur: Math.min(30, (5 + Math.random() * 10) * (1 + 0.12 * (n - 1))) });
    } else {
      const d = this.deliveries.find((e) => e.id === id);
      if (d) d.n += n;
      else this.deliveries.push({ id, n, x: null, display: null });
    }
    this.changed();
    this.pet.bought(item);
    return item;
  }

  pending(id) {
    return this.deliveries.some((d) => d.id === id) || this.queued(id);
  }

  queued(id) {
    return this.queue.some((j) => j.id === id);
  }

  // Puts a delivered purchase away: into the inventory, the cartridge bag, the shelf or the gear.
  deliver(id) {
    const i = this.deliveries.findIndex((d) => d.id === id);
    const item = itemById(id);
    if (i < 0) return null;
    const [{ n }] = this.deliveries.splice(i, 1);
    if (!item) {
      this.changed();
      return null;
    }
    if (item.manga) {
      if (!this.mangas.includes(id)) this.mangas.push(id);
    } else if (item.bagSlots) {
      this.gear[id] = true;
      this.profile.bagSize = Math.max(this.profile.bagSize || 1, item.bagSlots);
    } else if (item.id === 'syntoyo') {
      this.gear.syntoyo = true;
      // Retires the classic yo-yo: gone from desktop and her bag.
      delete this.toys.ioio;
      delete this.inventory.ioio;
      const bag = this.herBag();
      const yi = bag.indexOf('ioio');
      if (yi >= 0) bag.splice(yi, 1);
      // Desktop toy (like ioio) so Inventário → Colocar works.
      const old = this.toys.syntoyo;
      this.toys.syntoyo = {
        uses: old?.uses || 0,
        maxUses: old?.maxUses || 20 + Math.floor(Math.random() * 31),
        broken: !!old?.broken,
        placed: !!old?.placed,
        x: old?.x ?? null,
      };
      if (HER_BAG && !bag.includes('syntoyo') && this.bagFree() > 0) bag.push('syntoyo');
      else if (!this.toys.syntoyo.placed) this.inventory.syntoyo = 1;
      this.profile.toysBought++;
      this.pet.gear = this.gear;
    } else if (item.gear) {
      this.gear[id] = true;
      if (HER_BAG && item.baggable && !this.bagHas(id) && this.bagFree() > 0) this.herBag().push(id);
      this.pet.gear = this.gear;
    } else if (item.cart) {
      if (!this.cartridges.includes(item.cart)) this.cartridges.push(item.cart);
      this.bag = true;
    } else if (item.decor) {
      this.inventory[id] = Math.min(99, this.count(id) + n);
    } else if (item.toy) {
      const old = this.toys[id];
      this.toys[id] = { uses: 0, maxUses: item.noWear ? 0 : 20 + Math.floor(Math.random() * 31), broken: false, placed: !!old?.placed, x: old?.x ?? null };
      if (!old?.placed) this.inventory[id] = 1;
      this.profile.toysBought++;
    } else {
      this.inventory[id] = Math.min(99, this.count(id) + n);
    }
    this.changed();
    return item;
  }

  // First time: 10% favorite, 20% likes, 45% neutral, 17% dislikes, 8% hates (free leftovers/tap
  // water: 60% dislikes, 40% hates). Every time after that it changes Humor by TASTE_MOOD.
  taste(item, data) {
    const tastes = (this.profile.tastes ||= {});
    const first = !tastes[item.id];
    if (first) tastes[item.id] = rollTaste(item);
    const taste = tastes[item.id];
    if (data) data.taste = taste;
    // Jokenpô "deal": the next food she dislikes costs no Humor.
    const deal = TASTE_MOOD[taste] < 0 && this.pet.buff('deal');
    if (deal) delete this.pet.buffs.deal;
    else if (TASTE_MOOD[taste]) this.pet.punish({ mood: TASTE_MOOD[taste], ...(taste === 'hate' ? { affection: -3 } : {}) });
    // Something she hates sitting in her stomach makes her queasy.
    if (taste === 'hate') this.pet.addDebuff('nausea');
    this.pet.emit('taste', { item, taste, first, deal });
    this.changed();
  }

  // Saves from before v1.20 had only love/ok/hate (25% hates): spread them over the five levels.
  migrateTastes() {
    const p = this.profile;
    if ((p.tasteRev || 0) >= 2) return;
    p.tasteRev = 2;
    for (const [id, t] of Object.entries(p.tastes || {})) {
      const free = itemById(id)?.price === 0;
      if (t === 'ok') p.tastes[id] = Math.random() < 0.3 ? 'like' : 'ok';
      else if (t === 'hate') p.tastes[id] = free ? (Math.random() < 0.6 ? 'dislike' : 'hate') : Math.random() < 0.4 ? 'ok' : Math.random() < 0.7 ? 'dislike' : 'hate';
    }
  }

  tasteOf(id) {
    return this.profile.tastes?.[id] || null;
  }

  use(id) {
    if (typeof id === 'string' && id.startsWith('bag:')) return this.useFromBag(id.slice(4));
    const item = itemById(id);
    if (!item || !this.count(id) || !isConsumable(item)) return false;
    if (item.box) return !!this.onOpenBox?.(id);
    // Busy: queue consumables (loot boxes use actionQueue via open()).
    if (this.pet.busyForQueue?.() && !this.pet.dead) {
      (this.pet.afterPlay ||= []).push(id);
      return true;
    }
    if (item.cat === 'medicina' || item.consumable) {
      if (!this.pet.medicate(item)) return false;
      this.profile.consumed[id] = (this.profile.consumed[id] || 0) + 1;
    } else if (!this.pet.feed(item)) return false;
    this.take(id);
    return true;
  }

  // Consumables queued while busy (afterPlay): one at a time so feed/medicate can finish.
  flushAfterPlay() {
    const pet = this.pet;
    if (!pet.afterPlay?.length || pet.dead || pet.busyForQueue?.()) return false;
    const id = pet.afterPlay.shift();
    return !!this.use(id);
  }

  take(id) {
    this.inventory[id]--;
    if (!this.inventory[id]) delete this.inventory[id];
    this.changed();
  }

  // ---------- toys ----------

  // Returns the key of the placed object (a decor copy gets its own, e.g. "globo#2") or null.
  placeToy(id, x, display = 0) {
    if (itemById(id)?.decor) {
      if (!this.count(id)) return null;
      let key = id;
      for (let n = 2; this.toys[key]; n++) key = `${id}#${n}`;
      this.toys[key] = { uses: 0, maxUses: 0, broken: false, placed: true, x, display, ...this.disco[id] };
      this.take(id);
      return key;
    }
    const t = this.toys[id];
    if (!t || t.placed || t.broken) return null;
    t.placed = true;
    t.x = x;
    t.y = t.on = t.dx = undefined;
    t.display = display;
    if (this.count(id)) this.take(id);
    else this.changed();
    return id;
  }

  pickUpToy(key) {
    const t = this.toys[key];
    if (!t?.placed || itemById(baseId(key))?.fixed) return;
    const id = baseId(key);
    // GameBuddy (and its cartridge bag) stay on the desktop.
    if (id === 'gameboy') return;
    if (itemById(id)?.decor) {
      delete this.toys[key];
      this.inventory[id] = this.count(id) + 1;
    } else {
      t.placed = false;
      this.inventory[id] = 1;
    }
    this.changed();
  }

  // One play session; returns true when the toy broke.
  wearToy(id) {
    const t = this.toys[id];
    if (!t || t.broken) return false;
    t.uses++;
    // Decor copies and the machines (maxUses 0) never wear out.
    if (!t.maxUses || itemById(baseId(id))?.noWear) return false;
    if (id === 'gameboy') this.profile.gamesPlayed++;
    if (t.uses >= t.maxUses) t.broken = true;
    this.changed();
    return t.broken;
  }

  // ---------- cartridges: taste, skill and favorites ----------

  cartStat(id) {
    const carts = (this.profile.carts ||= {});
    return (carts[id] ||= { time: 0, plays: 0, love: Math.random() - 0.5 });
  }

  // 0.15 → 1 with practice; harder games take longer to master.
  cartSkill(id) {
    return Math.min(1, 0.15 + this.cartStat(id).time / ((GAMES[id]?.tier || 2) * 900));
  }

  isFavorite(id) {
    const s = this.profile.carts?.[id];
    if (!s || s.plays < 2 || s.love < 0.35) return false;
    const loves = Object.values(this.profile.carts).filter((c) => c.plays >= 2).map((c) => c.love).sort((a, b) => b - a);
    return s.love >= (loves[Math.min(2, loves.length - 1)] ?? 0);
  }

  playedCart(id, secs) {
    const s = this.cartStat(id);
    s.time += secs;
    s.plays++;
    s.love = Math.max(-1, Math.min(2, s.love + (Math.random() - 0.4) * 0.25 + Math.min(0.15, secs / 900)));
    this.changed();
  }

  // Favorite handheld / TV console (when several are on the desk she tries them until one sticks).
  consoleStat(id) {
    const consoles = (this.profile.consoles ||= {});
    return (consoles[id] ||= { time: 0, plays: 0, love: Math.random() - 0.5 });
  }

  isFavoriteConsole(id) {
    const s = this.profile.consoles?.[id];
    if (!s || s.plays < 2 || s.love < 0.4) return false;
    const loves = Object.values(this.profile.consoles).filter((c) => c.plays >= 2).map((c) => c.love).sort((a, b) => b - a);
    return s.love >= (loves[0] ?? 0);
  }

  playedConsole(id, secs) {
    if (!id) return;
    const s = this.consoleStat(id);
    s.time += secs;
    s.plays++;
    s.love = Math.max(-1, Math.min(2, s.love + (Math.random() - 0.35) * 0.28 + Math.min(0.18, secs / 700)));
    this.changed();
  }

  // The pet picks a cartridge on its own, leaning towards the ones it likes.
  pickCart() {
    const list = this.cartridges;
    const w = list.map((id) => Math.max(0.15, 1 + this.cartStat(id).love));
    let r = Math.random() * w.reduce((a, b) => a + b, 0);
    for (let i = 0; i < list.length; i++) if ((r -= w[i]) <= 0) return list[i];
    return list[0];
  }

  // Puts every placed toy back in the inventory; placing it again resets its position.
  storeAll() {
    for (const [key, t] of Object.entries(this.toys)) {
      if (!t.placed) continue;
      // GameBuddy stays on the desktop with the cartridge bag.
      if (baseId(key) === 'gameboy') continue;
      if (itemById(baseId(key))?.decor) {
        this.pickUpToy(key);
        continue;
      }
      t.placed = false;
      t.x = null;
      this.inventory[key] = 1;
    }
    this.bagX = null;
    this.foodBagX = null;
    this.perch = {};
    this.changed();
  }

  repairCost(id) {
    return Math.ceil((itemById(id)?.price || 0) / 2);
  }

  repairToy(id) {
    const t = this.toys[id];
    const cost = this.repairCost(id);
    if (!t?.broken || (!INFINITE_MONEY && this.coins < cost)) return false;
    this.pay(cost);
    Object.assign(t, { broken: false, uses: 0, maxUses: 20 + Math.floor(Math.random() * 31) });
    this.changed();
    return true;
  }

  difficultyScale() {
    return 1 / Math.sqrt(DIFFICULTIES[this.pet.cfg.difficulty] ?? 1);
  }

  // ---------- save ----------

  // Losing the pet (or deleting the save) wipes all progress.
  reset() {
    this.load(null);
    this.changed();
  }

  persist() {
    if (this.frozen) return Promise.resolve();
    const stats = this.pet.dead ? { ...FULL_STATS } : { ...this.pet.stats };
    this.dirty = false;
    return window.petAPI.storeSave({
      version: SAVE_VERSION, edition: EDITION, wishes: this.wishes, promos: this.promos, stats, inventory: this.inventory, coins: this.coins, profile: this.profile, toys: this.toys,
      cartridges: this.cartridges, cartridge: this.cartridge, bag: this.bag, bagX: this.bagX, buffs: this.pet.buffs, savedAt: Date.now(),
      affection: this.pet.affection, gear: this.gear, foodBagX: this.foodBagX, perch: this.perch, mangas: this.mangas, figures: this.figures, dollSkin: this.dollSkin, dollScale: this.dollScale, dollModel: this.dollModel, dollAwake: this.dollAwake,
      deliveries: this.deliveries, queue: this.queue, disco: this.disco,
    }).catch(() => {});
  }
}
