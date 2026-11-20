// Shop catalog, inventory, coins, toys and saved progress (save.json next to the app).
import { FULL_STATS, DIFFICULTIES, DEBUFFS } from './behavior.js';
import { icon, cartridge } from './pixel.js';
import { GAMES } from './games.js';
import { FURN_ITEMS, COFFEE_ITEMS, baseId } from './furniture.js';
import { FUN_ITEMS } from './funtoys.js';
import { LOOT_ITEMS, RARITIES } from './lootitems.js';
import { FOOD_ITEMS } from './consumables.js';
import { MED_ITEMS } from './meditems.js';
import './medicons.js';
import { DEMO } from './edition.js';
import { BAG_ITEMS as BAGGABLE } from './skills.js';
import { attrProgress as attrProg } from './attrxp.js';
import { skillLevel, skillXpFor } from './skills.js';

export { ATTR_XP } from './attrxp.js';

const START_COINS = DEMO ? 2000 : 1000;
// Coins added to saves from before the bigger starting money (save version 2).
const START_BONUS = DEMO ? 1500 : 500;
const SAVE_VERSION = 3;
const EDITION = DEMO ? 'demo' : 'full';
// Her personal bag / "Dar a ela" — paused (items already in herBag stay usable).
export const HER_BAG = false;

export const SHOP_CATEGORIES = [
  ['fun', '🎮', 'Brinquedos'],
  ['cartuchos', '🕹', 'Cartuchos'],
  ['comidas', '🍙', 'Comidas'],
  ['bebidas', '🥤', 'Bebidas'],
  ['sobremesas', '🍰', 'Sobremesas'],
  ['medicina', '💊', 'Medicamentos'],
  ['mangas', '📚', 'Mangás'],
  ['mobilia', '🛋', 'Mobília'],
  ['specials', '💎', 'Specials'],
];

// A arena de teste (My Persocon Combate.exe) compra de tudo sem gastar moeda nenhuma.
// ESTE É O ÚNICO LUGAR onde o modo de teste muda as regras de dinheiro: no jogo normal a
// flag é sempre falsa (o `__PET_COMBATE__` só existe no executável de combate).
export const COMBATE = !!(typeof window !== 'undefined' && window.__PET_COMBATE__);
export const INFINITE_MONEY = COMBATE;

const pix = (id, cat, name, price, pixName, extra = {}) => ({
  id, cat, name, price, pix: pixName, effects: {}, ...extra,
  get img() {
    if (extra?.imgAsset) return new URL(extra.imgAsset, import.meta.url).href;
    return typeof document === 'undefined' ? '' : icon(this.pix);
  },
});

// Nomes personalizados (até 24 caracteres, sem HTML).
const cleanCustomName = (value, fallback) => {
  const s = String(value || '').replace(/[<>&"']/g, '').trim().slice(0, 24);
  return s || fallback;
};
export const crowName = (app) => cleanCustomName(app?.game?.profile?.crowName, app?.config?.lang === 'en' ? 'Crow' : 'Corvo');
export const dollName = (app) => cleanCustomName(app?.game?.profile?.dollName, app?.config?.lang === 'en' ? 'Doll' : 'Boneco');

export const BUFF_LABELS = {
  noHunger: 'Sem fome (não passa)',
  doubleMood: 'Humor em dobro ao ganhar',
  noTired: 'Sem cansaço (energia)',
  shield: 'Escudo (bloqueia dano à Saúde)',
  coinMagnet: 'Moedas em dobro',
  luck: 'Sorte +5% (Gacha/Slot/caixas)',
  deal: 'Trato: comida ruim sem Humor',
  behaved: 'Comportada (sem cursor/ícones)',
  swift: 'Pés ligeiros (velocidade +25%)',
  smart: 'Mente afiada (XP de atributo +50%)',
};
export const BUFF_ICONS = { noHunger: '🍔', doubleMood: '😊', noTired: '⚡', shield: '🛡️', coinMagnet: '🧲', luck: '🍀', deal: '✊', behaved: '🗿', swift: '💨', smart: '🧠' };

// Cartridge prices fixed per game (1.9.4).
const CART_PRICES = {
  combat: 80, marioworld: 140, flappy: 50, sonic: 140, tetris: 80, pong: 50, mariokart: 170,
  donkeykong: 110, pacman: 110, breakout: 50, asteroids: 80, riverraid: 110, invaders: 80, galaga: 80,
};
// Only games with art in the sheet are sold; the rest stay disabled for now.
export const CART_GAMES = ['combat', 'marioworld', 'flappy', 'sonic', 'tetris', 'pong', 'mariokart',
  'donkeykong', 'pacman', 'breakout', 'asteroids', 'riverraid', 'invaders', 'galaga'];

// Food, drinks and desserts (1.9.6) come from consumables.js; medicine/power-ups were removed in 1.9.4.
export const ITEMS = [
  // Fun stuffs: placed on the desktop, the pet plays with them on its own. gain = stats per second.
  // GameBuddy stays on the desktop (cartridge bag sits next to it); not baggable.
  { id: 'gameboy', cat: 'fun', toy: true, name: 'GameBuddy', price: 180, effects: {}, gain: { mood: 0.45 }, get img() { return icon('buddy'); } },
  pix('pelucia', 'fun', 'Doll (boneco articulado)', 120, 'doll', { toy: true, gain: { mood: 0.3, energy: 0.05 }, note: 'Boneco de blocos com física · botão direito troca a skin' }),
  pix('bola', 'fun', 'Bola', 80, 'ball', { toy: true, baggable: true, gain: { mood: 0.35, energy: -0.1, hunger: -0.04, thirst: -0.07 } }),
  pix('espada', 'fun', 'Espada de bamboo', 100, 'sword', { toy: true, baggable: true, weapon: 'espada', gain: { mood: 0.4, hunger: -0.06, thirst: -0.07, energy: -0.1 } }),
  pix('gancho', 'fun', 'Grappling hook', 250, 'hook', { gear: true, baggable: true }),
  pix('microfone', 'fun', 'Microfone de mão', 150, 'mic', { gear: true, baggable: true, note: 'Canta sozinho de vez em quando · libera o Modo Karaokê ao Ouvir Música' }),
  pix('syntoyo', 'fun', 'Syntoyo', 180, 'syntoyo', { toy: true, gear: true, baggable: true, weapon: 'syntoyo', gain: { mood: 0.4 }, note: 'Ioiô synthwave · novos truques e golpes · só aparece ao dominar o ioiô comum' }),
  pix('bolsa_p', 'fun', 'Bolsa pequena', 120, 'bag_s', { gear: true, bagSlots: 3, note: 'Inventário dela: 3 slots' }),
  pix('bolsa_m', 'fun', 'Bolsa média', 280, 'bag_m', { gear: true, bagSlots: 6, note: 'Inventário dela: 6 slots' }),
  pix('bolsa_g', 'fun', 'Bolsa grande', 520, 'bag_g', { gear: true, bagSlots: 9, note: 'Inventário dela: 9 slots' }),
  // Specials: rare and expensive (no consumables/food).
  pix('cristal', 'specials', 'Crystal Mágico', 2500, 'crystal', { gear: true, rare: true, note: 'Dá vida ao Doll: ele passeia, investiga objetos e mobília e brinca com a Persocon (precisa do Doll na área de trabalho)' }),
  pix('trevo', 'specials', 'Trevo da Sorte', 1500, 'clover', { gear: true, rare: true, note: '+50% em todas as moedas ganhas' }),
  pix('corvo', 'specials', 'Caixa Misteriosa', 3000, 'crowbox', { gear: true, rare: true, note: 'Tem algo vivo aí dentro... dá para ouvir umas bicadas. Um novo amigo para a Persocon treinar?' }),
  pix('estrela', 'specials', 'Estrela dos Desejos', 1000, 'wishstar', { consumable: true, rare: true, effects: { affection: 40, mood: 40 } }),
  // Cartridges: art cut from cartuchos3.png into one image per game.
  ...Object.entries(GAMES).filter(([id]) => CART_GAMES.includes(id)).map(([id, g]) => ({
    id: `cart_${id}`, cat: 'cartuchos', cart: id, name: g.name, price: CART_PRICES[id], effects: {},
    img: new URL(`./assets/carts/${id}.png`, import.meta.url).href,
  })),
  // O cartucho preto misterioso: sem nome, de graça, e só faz alguma coisa na TV com console.
  // Fica guardado na aba Especial (compra única): pode ser usado em todas as ondas.
  { id: 'cart_unknown', cat: 'especiais', cart: 'unknown', name: 'Cartucho Preto', price: 0, effects: {}, mystery: true,
    special: true, unsellable: true, canSell: false, eternal: true,
    note: 'O que quer que ele seja, só a TV aceita ele. Pode ser inserido quantas vezes quiser.',
    get img() { return cartridge('#000000', 'unknown', 'gb'); } },
  // O Cristal Negro: cai do "Unknown" e fica guardado para uso futuro.
  { id: 'cristal_negro', cat: 'especiais', name: 'Cristal Negro', price: 0, effects: {}, special: true,
    unsellable: true, canSell: false, eternal: true, note: 'Saiu do Unknown. Não vende e não se descarta.',
    img: new URL('./assets/items/black_crystal.png', import.meta.url).href },
  ...FOOD_ITEMS,
  ...MED_ITEMS,
  ...FURN_ITEMS,
  ...COFFEE_ITEMS,
  ...FUN_ITEMS,
  ...LOOT_ITEMS,
];


export const STAT_LABELS = { health: 'Saúde', hunger: 'Fome', mood: 'Humor', energy: 'Energia', thirst: 'Sede', hygiene: 'Higiene' };

export const ATTRS = [
  ['str', 'Força'], ['dex', 'Destreza'], ['agi', 'Agilidade'], ['con', 'Constituição'],
  ['will', 'Força de Vontade'], ['per', 'Percepção'], ['cha', 'Carisma'], ['int', 'Inteligência'],
];

// Attribute level from its XP: slow and gradual (level 10 needs ~2000 XP).
export function attrLevelOf(xp) {
  const v = Math.max(0, xp || 0);
  return Math.min(10, 1 + Math.floor(Math.sqrt(v / 25)));
}
// How much Health the attributes add: the Constitution is the sturdy one, the Strength helps too.
export const MAX_HP_BASE = 100;
export const HP_PER_CON = 4;
export const HP_PER_STR = 2;
// The Constitution makes every action cheaper.
export const ENERGY_PER_CON = 0.04;

export const itemById = (id) => ITEMS.find((i) => i.id === id);
export const isEdible = (item) => item && ['comidas', 'bebidas', 'sobremesas'].includes(item.cat);
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
// Itens do enredo (Cartucho Preto e Cristal Negro) nunca saem do inventário.
export const isEternal = (item) => !!item?.eternal;
export const isSellable = (item) => {
  if (isEternal(item)) return false;
  if (!item || item.fixed) return false;
  // Itens marcados como invendíveis (o Cristal Negro) nunca podem ser vendidos.
  if (item.unsellable || item.canSell === false) return false;
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
  if (item.cures && item.cures.length) parts.push(`Cura: ${item.cures.map((c) => DEBUFFS[c]?.pt?.name || c).join(', ')}`);
  if (item.clearBuffs) parts.push('Remove todos os buffs ativos');
  if (item.rare) parts.push('💎 Raro');
  if (item.rarity && (item.loot || isPowerUp(item))) parts.push(`★ ${RARITIES[item.rarity]?.label || item.rarity}`);
  if (item.loot && item.note) parts.push(item.note);
  if (item.toy) parts.push('Coloque na área de trabalho');
  if (item.cart) {
    if (item.mystery) parts.push('Só aparece depois que você tiver todos os outros cartuchos · só a TV aceita ele');
    else parts.push(`Vai para a Gaming Shelf (ou para a bolsa de cartuchos, sem ela) · complexidade ${'★'.repeat(GAMES[item.cart]?.tier || 1)}`);
  }
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
  // A espada equipada fica na cintura dela (o objeto sai do desktop).
  swordEquipped: false,
});

export class Game {
  constructor(pet, save) {
    this.pet = pet;
    this.listeners = [];
    this.dirty = false;
    this.load(save);
    setInterval(() => this.persist(), 15000);
    // O XP de atributo chega aos poucos (escalada, energia): junta e joga no save de 1 em 1s.
    setInterval(() => this.flushAttrGain(), 1000);
    // Coins per minute while alive: 1, +1 when happy, +1 when well cared for (max 180/hour).
    setInterval(() => {
      // Streamer Mode uses its own isolated wallet fed by channel points / live events.
      if (window.__PET_STREAMER__ || pet.dead) return;
      const s = pet.stats;
      const cared = s.health >= 60 && s.hunger >= 40 && (s.thirst ?? 100) >= 40 && (s.hygiene ?? 100) >= 40;
      // Affection speeds it up: up to x3 at the maximum. Furniture and fun stuff on the desktop add more.
      const k = (pet.buff('coinMagnet') ? 2 : 1) * (1 + Math.max(0, pet.affection) / 500) * this.decorBonus();
      const p = this.profile;
      p.coinFrac = (p.coinFrac || 0) + (1 + (s.mood >= 60 ? 1 : 0) + (cared ? 1 : 0)) * k;
      const n = Math.floor(p.coinFrac);
      p.coinFrac -= n;
      if (n) this.earn(n, 'Renda (tempo)');
    }, 60000);
    // Daily bonus on the first start of each day.
    const today = new Date().toDateString();
    if (this.profile.lastDaily !== today) {
      this.dailyBonus = !!this.profile.lastDaily;
      this.profile.lastDaily = today;
      if (this.dailyBonus) this.earn(100, 'Bônus diário');
    }
    pet.on((type, data) => {
      const p = this.profile;
      // Em combate a derrota não zera o progresso: ela só desmaia e volta sozinha.
      if (type === 'death') {
        if (this.pet.unconscious) return;
        return this.reset();
      }
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
    const placed = Object.entries(this.toys).filter(([k, t]) => t?.placed && !t.broken && baseId(k) !== 'impressora');
    const upgraded = placed.filter(([k, t]) => t?.up).length;
    const n = placed.length;
    return 1 + Math.min(1.5, n * 0.06 + upgraded * 0.08);
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
    // A progressão do Cartucho Preto (as ondas) — começa no Wave 1; o 10 é a trava do Boss.
    this.profile.blackCartridgeWave ??= 1;
    // Quem ela encara no cartucho preto: 'slime' | 'grim' | 'mixed' (padrão).
    this.profile.blackEnemy ??= 'mixed';
    this.profile.crowName ??= '';
    this.profile.dollName ??= '';
    // A espada equipada (na cintura) não pode existir duas vezes: nem no desktop, nem no inventário.
    this.profile.swordEquipped = this.profile.swordEquipped === true;
    this.profile.cristalAwarded ??= !!this.profile.unknownDone;
    this.profile.blackCartLore ??= false;
    // toys: { id: { uses, maxUses, broken, placed, x } }
    this.toys = { ...(save?.toys || {}) };
    // Decor kept in the inventory is just a count (older saves also had a record for it).
    for (const [key, t] of Object.entries(this.toys)) if (!t.placed && itemById(baseId(key))?.decor) delete this.toys[key];
    // Espada equipada: o objeto sai do desktop/inventário/bolsa (ela está com ela na cintura).
    if (this.profile.swordEquipped) this.takeSwordOutOfWorld();
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
    // Saved desktop layouts ("setups"): the position of every object on the desktop.
    this.setups = Array.isArray(save?.setups) ? save.setups : [];
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
    // Streamer Mode never uses the 3D printer: items fall from the sky instead.
    if (!window.__PET_STREAMER__ && !this.toys.impressora) this.toys.impressora = { uses: 0, maxUses: 0, broken: false, placed: true, x: null, display: 0 };
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
      // A espada equipada vive na cintura dela: não é um objeto órfão, não volta para o inventário.
      if (id === 'espada' && this.profile.swordEquipped) continue;
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

  earn(n, source = 'Geral') {
    if (this.gear.trevo && n > 0) n = Math.round(n * 1.5);
    this.coins += n;
    this.profile.coinsEarned += n;
    if (n > 0) this.pet?.emit('earn', { n, src: source });
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
    if (item.cart) {
      // O cartucho preto some da loja para sempre depois de comprado.
      if (item.mystery && (this.cartridges.includes('unknown') || (this.inventory.cart_unknown || 0) > 0 || this.profile.unknownDone)) return false;
      // E ele só aparece depois que o jogador tiver TODOS os outros cartuchos.
      if (item.mystery && !this.allCarts()) return false;
      return ['gameboy', 'gamegear', 'psp', 'videogame'].some((c) => this.toys[c] || this.count(c) > 0) && !this.cartridges.includes(item.cart);
    }
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
    if (this.cartridges?.length && !this.hasGamingShelf()) this.bag = true;
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
    if (!HER_BAG || isEternal(itemById(id))) return false;
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
    const kind = item.cat === 'comidas' ? 'food' : item.cat === 'bebidas' ? 'drink' : item.cat === 'sobremesas' ? 'dessert' : 'play';
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
    // Em combate remédio/power-up vale na hora (mesma regra do use()).
    const inFight = !!this.pet.combatMode && (item.cat === 'medicina' || item.consumable);
    if (this.pet.busyForQueue?.() && !this.pet.dead && !inFight) {
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

  // ---------- attributes (Força / Constituição) ----------

  attrXp(id) {
    return (this.profile.attrXp ||= {})[id] || 0;
  }

  attrLevel(id) {
    return attrLevelOf(this.attrXp(id));
  }

  // Ajuste manual do nível de um atributo (os botões +1/−1 do perfil). O XP vai para o piso do
  // nível pedido, então o nível muda exatamente 1 por clique.
  attrSetLevel(id, lvl) {
    const xp = (this.profile.attrXp ||= {});
    const before = attrLevelOf(xp[id] || 0);
    const target = Math.min(10, Math.max(1, Math.round(lvl)));
    xp[id] = Math.ceil((target - 1) ** 2 * 25);
    (this.profile.attrs ||= {})[id] = target;
    if (id === 'agi') this.pet?.updateAgiSpeed?.();
    this.changed();
    if (target !== before) {
      this.pet?.emit?.('attrXp', { id, amount: 0, xp: xp[id], level: target, up: target > before, source: 'perfil' });
    }
    return target;
  }

  // Safe decay: never below zero, never used for the eternal storyline items.
  attrDecay(id, amount, source = '') {
    return this.attrAdd(id, -Math.abs(amount), source);
  }

  // Gains attribute XP (the level goes up on its own). The save is marked dirty, not written
  // right away: this is called with every point of Energy spent.
  // source: where the XP came from (the XP log shows it: "Força (Treino Pesado)").
  attrAdd(id, amount, source = '') {
    if (amount > 0 && this.pet?.buff?.('smart')) amount = Math.round(amount * 1.5);
    const xp = (this.profile.attrXp ||= {});
    const before = this.profile.attrs[id] ?? 1;
    xp[id] = Math.max(0, (xp[id] || 0) + amount);
    const lvl = attrLevelOf(xp[id]);
    this.profile.attrs[id] = lvl;
    if (id === 'agi') this.pet?.updateAgiSpeed?.();
    this.dirty = true;
    // O indicador pequeno: quanto de XP ela acabou de ganhar neste atributo.
    if (amount > 0) this.pet?.emit?.('attrXp', { id, amount, xp: xp[id], level: lvl, up: lvl > before, source });
    return lvl;
  }

  // Ganho de XP que chega aos poucos (escalada, energia): fica acumulado e entra de uma vez.
  attrGain(id, amount, source = '') {
    if (!(amount > 0)) return;
    // Ledger de XP da luta (melee.enter/leave) — usado pelo resumo pós-batalha.
    if (this._xpFight) {
      const key = `${id}|${source || 'outros'}`;
      this._xpFight[key] = (this._xpFight[key] || 0) + amount;
    }
    const acc = (this._attrAcc ||= {});
    const keys = (this._attrAccKeys ||= {});
    const key = `${id}|${source}`;
    acc[key] = (acc[key] || 0) + amount;
    keys[key] = { id, source };
  }

  // Joga o XP acumulado no atributo (a cada segundo).
  flushAttrGain() {
    const acc = this._attrAcc;
    if (!acc) return;
    this._attrAcc = null;
    const keys = this._attrAccKeys || {};
    this._attrAccKeys = null;
    for (const [key, v] of Object.entries(acc)) {
      if (v <= 0) continue;
      const k = keys[key] || {};
      this.attrAdd(k.id, v, k.source);
    }
  }

  // O progresso do atributo (nível, quanto falta para o próximo) para a barra do perfil.
  attrProgress(id) {
    return attrProg(this.attrXp(id));
  }

  // Her maximum Health: the Constitution and the Strength make her tougher.
  maxHealth() {
    const con = this.attrLevel('con');
    const str = this.attrLevel('str');
    return MAX_HP_BASE + (con - 1) * HP_PER_CON + (str - 1) * HP_PER_STR;
  }

  // Ajuste manual do nível de uma arte (os botões +1/−1 do perfil). O XP vai para o
  // piso do nível pedido, então o nível muda exatamente 1 por clique.
  skillSetLevel(id, lvl) {
    const s = (this.profile.skills ||= {});
    const before = skillLevel(s[id] || 0);
    const target = Math.min(10, Math.max(1, Math.round(lvl)));
    s[id] = skillXpFor(target);
    this.changed();
    if (target !== before) {
      this.pet?.emit?.('skillXp', { id, amount: 0, xp: s[id], level: target, up: target > before });
    }
    return target;
  }

  skillAdd(id, amount) {
    const s = (this.profile.skills ||= {});
    const before = s[id] || 0;
    s[id] = before + amount;
    this.changed();
    // O log de XP sabe o quanto ela ganhou em cada arte.
    this.pet?.emit?.('skillXp', { id, amount, xp: s[id], level: skillLevel(s[id]), up: skillLevel(s[id]) > skillLevel(before) });
    return s[id];
  }

  hasShelf() {
    return this.count('estante') > 0 || Object.keys(this.toys).some((k) => baseId(k) === 'estante');
  }

  // The gaming shelf replaces the cartridge bag — even while it is still being printed/placed.
  hasGamingShelf() {
    return this.count('estante_cartuchos') > 0
      || Object.keys(this.toys).some((k) => baseId(k) === 'estante_cartuchos')
      || (this.deliveries || []).some((d) => d.id === 'estante_cartuchos')
      || (this.queue || []).some((j) => j.id === 'estante_cartuchos');
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
    this.earn(got, 'Venda');
    return got;
  }

  pay(n, source = 'Geral') {
    if (!INFINITE_MONEY) this.coins -= n;
    if (n > 0) this.pet?.emit('pay', { n, src: source });
  }

  // Returns the bought item (for the purchase reaction) or null. It goes into the 3D printer queue
  // (printed one at a time, random time) and then the pet takes it from the printer (see deliver).
  buy(id, n = 1) {
    const item = itemById(id);
    if (!item || !this.canBuy(item, n)) return null;
    this.pay((item.price || 0) * n);
    this.profile.purchases = (this.profile.purchases || 0) + 1;
    // Streamer Mode: nothing goes through the printer; items drop from the sky on stage.
    if (window.__PET_STREAMER__) {
      for (let i = 0; i < n; i++) this.toys?.skyDrop?.(id, { fromUser: true });
      this.pet.bought(item);
      return item;
    }
    // Arena de teste: sem fila da impressora — o item cai direto no inventário.
    if (COMBATE) {
      this.deliveries.push({ id, n, x: null, display: null });
      const got = this.deliver(id);
      this.pet.bought(item);
      return got;
    }
    if (this.toys.impressora) {
      const waiting = this.queue.find((j, i) => j.id === id && (i > 0 || !j.t));
      if (waiting) {
        waiting.n += n;
        waiting.paid = (waiting.paid || 0) + (item.price || 0) * n;
      } else this.queue.push({ id, n, t: 0, dur: Math.min(30, (5 + Math.random() * 10) * (1 + 0.12 * (n - 1))), paid: (item.price || 0) * n });
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
    } else if (item.cart === 'unknown') {
      // O cartucho preto fica guardado na aba Especial (compra única, uso repetido).
      this.inventory.cart_unknown = (this.inventory.cart_unknown || 0) + n;
      if (!this.hasGamingShelf()) this.bag = true;
      // A primeira vez que ele chega às suas mãos: a aura sombria aparece.
      if (!this.profile.blackCartLore) {
        this.profile.blackCartLore = true;
        this.pet?.emit?.('blackCartGet');
      }
    } else if (item.cart) {
      if (!this.cartridges.includes(item.cart)) this.cartridges.push(item.cart);
      if (!this.hasGamingShelf()) this.bag = true;
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
    // Drinks from her own coffee station are always welcome — never a grimace or a complaint.
    if (item.noBadTaste) tastes[item.id] = 'like';
    else if (first) tastes[item.id] = rollTaste(item);
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
    // Em combate remédio/power-up vale na hora: a luta não para para esvaziar a fila.
    const inFight = !!this.pet.combatMode && (item.cat === 'medicina' || item.consumable);
    // Busy: queue consumables (loot boxes use actionQueue via open()).
    if (this.pet.busyForQueue?.() && !this.pet.dead && !inFight) {
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
    if (isEternal(itemById(id))) return;
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
    if (id === 'gameboy') {
    t.placed = false;
    this.inventory.gameboy = (this.inventory.gameboy || 0) + 1;
    this.manualGameboyStored = true;
    this.changed();
    return;
  }
    if (itemById(id)?.decor) {
      delete this.toys[key];
      this.inventory[id] = this.count(id) + 1;
    } else {
      t.placed = false;
      this.inventory[id] = 1;
    }
    this.changed();
  }

  // ---------- espada (combate armado) ----------

  // O registro da espada no desktop (cria se ainda não existir, sem duplicar).
  swordRecord() {
    let t = this.toys.espada;
    if (!t) {
      t = this.toys.espada = { uses: 0, maxUses: 20 + Math.floor(Math.random() * 31), broken: false, placed: false, x: null };
    }
    return t;
  }

  // Tira a espada do desktop, do inventário e da bolsa dela: ela passa a carregá-la.
  takeSwordOutOfWorld() {
    const t = this.toys.espada;
    if (t) {
      t.placed = false;
      t.x = t.y = t.on = t.dx = undefined;
      delete t.fromBag;
      delete t.homeX;
    }
    delete this.inventory.espada;
    const bag = this.herBag();
    const i = bag.indexOf('espada');
    if (i >= 0) bag.splice(i, 1);
  }

  // Equipa a espada: pega o objeto do desktop, do inventário ou da bolsa e fica com ele na cintura.
  equipSword() {
    if (this.profile.swordEquipped) return false;
    const t = this.toys.espada;
    const onDesk = !!t?.placed;
    const inBag = this.herBag().includes('espada');
    if (!onDesk && !this.count('espada') && !inBag) return false;
    this.takeSwordOutOfWorld();
    this.profile.swordEquipped = true;
    this.changed();
    return true;
  }

  // Desequipa: a espada volta para o inventário do jogador.
  unequipSword() {
    if (!this.profile.swordEquipped) return false;
    this.profile.swordEquipped = false;
    this.inventory.espada = 1;
    this.changed();
    return true;
  }

  // Larga a espada na área de trabalho, na frente dela (o objeto volta a existir no desktop).
  placeSword() {
    const pet = this.pet;
    const P = pet?.P || 130;
    const dir = pet?.dir || 1;
    const t = this.swordRecord();
    t.broken = false;
    t.placed = true;
    t.x = pet ? Math.round(pet.x + dir * P * 0.8) : 400;
    t.y = t.on = t.dx = undefined;
    t.display = 0;
    delete t.fromBag;
    delete t.homeX;
    this.profile.swordEquipped = false;
    delete this.inventory.espada;
    this.changed();
    return t;
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

  // Removes a cartridge for good (the mysterious black one after its event).
  removeCart(id) {
    const i = this.cartridges.indexOf(id);
    if (i < 0) return false;
    this.cartridges.splice(i, 1);
    if (this.profile.carts) delete this.profile.carts[id];
    this.changed();
    return true;
  }

  // O jogador já tem todos os cartuchos do catálogo? (o cartucho preto só aparece depois disso)
  allCarts() {
    return CART_GAMES.every((id) => this.cartridges.includes(id));
  }

  // The pet picks a cartridge on its own, leaning towards the ones it likes.
  // The mysterious black one never enters on its own: only the player inserts it.
  pickCart() {
    const list = this.cartridges.filter((id) => id !== 'unknown');
    if (!list.length) return this.cartridges[0];
    const w = list.map((id) => Math.max(0.15, 1 + this.cartStat(id).love));
    let r = Math.random() * w.reduce((a, b) => a + b, 0);
    for (let i = 0; i < list.length; i++) if ((r -= w[i]) <= 0) return list[i];
    return list[0];
  }

  // Puts every placed toy back in the inventory; placing it again resets its position.
  storeAll() {
    for (const [key, t] of Object.entries(this.toys)) {
      if (!t.placed) continue;
      // GameBuddy stays on the desktop with the cartridge bag (without a Gaming Shelf).
      if (baseId(key) === 'gameboy' && !this.hasGamingShelf()) continue;
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
      deliveries: this.deliveries, queue: this.queue, disco: this.disco, setups: this.setups,
    }).catch(() => {});
  }

  // ---------- setups (saved desktop layouts) ----------

  // Snapshot of every object on the desktop: where it is and on which monitor.
  captureSetup(name) {
    const items = {};
    for (const [key, t] of Object.entries(this.toys)) {
      if (!t?.placed) continue;
      items[key] = { x: t.x ?? null, y: t.y ?? null, on: t.on ?? null, dx: t.dx ?? null, display: t.display ?? 0, ballY: t.ballY ?? null };
    }
    const setup = {
      name: (name || 'Setup').trim().slice(0, 40) || 'Setup',
      at: Date.now(),
      items,
      bagX: this.bagX ?? null,
      foodBagX: this.foodBagX ?? null,
    };
    this.setups.push(setup);
    if (this.setups.length > 12) this.setups.shift();
    this.changed();
    return setup;
  }

  // Puts every object back where it was. Objects that are gone (sold/broken) are ignored;
  // the ones that are still in the inventory are placed again, so the setup comes back whole.
  applySetup(index) {
    const setup = this.setups[index];
    if (!setup) return false;
    for (const [key, p] of Object.entries(setup.items || {})) {
      const id = baseId(key);
      let rec = this.toys[key];
      if (rec?.broken) continue;
      if (!rec || !rec.placed) {
        // Still owned but not on the desktop: put it back where the setup says.
        if (!this.count(id)) continue;
        const placed = this.placeToy(id, p.x ?? 0, p.display ?? 0);
        if (!placed) continue;
        rec = this.toys[placed];
      }
      if (!rec) continue;
      rec.x = p.x ?? null;
      rec.y = p.y ?? null;
      rec.on = p.on ?? null;
      rec.dx = p.dx ?? null;
      rec.display = p.display ?? 0;
      if (p.ballY != null) rec.ballY = p.ballY;
    }
    if (setup.bagX != null) this.bagX = setup.bagX;
    if (setup.foodBagX != null) this.foodBagX = setup.foodBagX;
    this.changed();
    return true;
  }

  deleteSetup(index) {
    if (index < 0 || index >= this.setups.length) return false;
    this.setups.splice(index, 1);
    this.changed();
    return true;
  }
}
