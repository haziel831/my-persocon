// Rewards: loot boxes (the pet opens them, then a CS-style roulette picks the prize), achievements
// and daily missions (both pay in boxes), and the effects of the single-use prizes.
import { ITEMS, itemById, BUFF_LABELS, BUFF_ICONS, attrLevelOf } from './game.js';
import { translate } from './i18n.js';
import { UPGRADES } from './upgrades.js';
import { BOXES, RARITIES, RARITY_ORDER, LOOT_ITEMS } from './lootitems.js';
import { GAMES } from './games.js';
import { MINIGAMES, mgUnlocked, mgLevel } from './minigames.js';
import { icon } from './pixel.js';
import { dollReact } from './watch.js';
import { luckOf, FIGURES, figureById } from './casinoitems.js';
import { ALBUM_MAX } from './funtoys.js';

const rand = (a, b) => a + Math.random() * (b - a);
const randInt = (a, b) => Math.floor(rand(a, b + 1));
const pick = (list) => list[Math.floor(Math.random() * list.length)];
const el = (cls, parent, html = '') => {
  const d = document.createElement('div');
  d.className = cls;
  if (html) d.innerHTML = html;
  parent?.append(d);
  return d;
};

// ---------- prizes ----------

const COINS = { comum: [20, 60], incomum: [80, 160], raro: [250, 450], lendario: [900, 1500] };


// luck: affection-based (luckOf), shifts the odds a bit towards the rarer prizes.
export function rollRarity(odds, lucky, luck = 0) {
  const w = odds.map((o, i) => o * (lucky ? [0.4, 1, 1.8, 2.6][i] : 1) * Math.max(0.05, 1 + luck * [-0.3, 0.15, 0.5, 0.8][i]));
  let r = Math.random() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < w.length; i++) if ((r -= w[i]) <= 0) return RARITY_ORDER[i];
  return RARITY_ORDER[0];
}

// Collectibles by box rarity: Gacha figures (lendario → Épico), cartridges by complexity, mangás,
// Jam lights and the v1.21 toys (the cheap ones are raro, the big ones lendario).
const FIG_RARITY = { comum: 'comum', incomum: 'incomum', raro: 'raro', lendario: 'epico' };
const CART_TIER = { incomum: [1, 2], raro: [2, 4], lendario: [4, 5] };
const TOYS = {
  raro: ['ioio', 'bambole', 'cubo', 'robo', 'tamagotchi', 'pipa'],
  lendario: ['skate', 'camera', 'pula_pula', 'aquario', 'teclado'],
};
const DECOR = { incomum: ['confete', 'holofote'], raro: ['globo', 'laser', 'fumaca'] };
// Chance weight of each kind of prize per rarity (what can't be given right now is skipped).
// Food and power-ups were removed in 1.9.4.
const TABLE = {
  comum: { loot: 30, coins: 20, figure: 8, manga: 6 },
  incomum: { loot: 26, coins: 16, figure: 10, cart: 7, manga: 8, decor: 5 },
  raro: { loot: 26, coins: 14, figure: 12, cart: 10, manga: 6, decor: 6, toy: 12 },
  lendario: { loot: 34, coins: 14, jackpot: 4, figure: 16, cart: 6, toy: 18 },
};
// A collectible she already has (rolled for a box she can't get, or got meanwhile) turns into coins.
const DUPE = { comum: 20, incomum: 60, raro: 150, lendario: 400 };

// game (optional): avoids collectibles she already owns.
function prizeOf(kind, rarity, game) {
  const has = (id) => {
    const it = itemById(id);
    if (!game || !it) return false;
    if (it.cart) return game.cartridges.includes(it.cart);
    if (it.manga) return game.mangas.includes(id);
    if (it.toy && !it.decor) return !!game.toys[id] && !game.toys[id].broken;
    return false;
  };
  const ids = (list) => list.filter((id) => itemById(id) && !has(id));
  switch (kind) {
    case 'loot': {
      const loot = LOOT_ITEMS.filter((i) => !i.box && i.rarity === rarity);
      return loot.length && { kind: 'item', id: pick(loot).id, n: 1, rarity };
    }
    case 'figure': {
      const list = FIGURES.filter((f) => !f.up && f.rarity === FIG_RARITY[rarity] && !game?.figures?.includes(f.id));
      return list.length && { kind: 'figure', id: pick(list).id, rarity };
    }
    case 'cart': {
      const [lo, hi] = CART_TIER[rarity] || [];
      const list = ids(ITEMS.filter((i) => i.cart && GAMES[i.cart]?.tier >= lo && GAMES[i.cart]?.tier <= hi).map((i) => i.id));
      return list.length && { kind: 'item', id: pick(list), n: 1, rarity };
    }
    case 'manga': {
      const vol = { comum: [1, 1], incomum: [2, 3], raro: [1, 3] }[rarity];
      const list = ids(ITEMS.filter((i) => i.manga && i.manga.vol >= vol[0] && i.manga.vol <= vol[1]).map((i) => i.id));
      return list.length && { kind: 'item', id: pick(list), n: 1, rarity };
    }
    case 'toy': {
      const list = ids(TOYS[rarity] || []);
      return list.length && { kind: 'item', id: pick(list), n: 1, rarity };
    }
    case 'decor': {
      const list = ids(DECOR[rarity] || []);
      return list.length && { kind: 'item', id: pick(list), n: 1, rarity };
    }
    case 'jackpot':
      return { kind: 'coins', n: Math.round(randInt(2500, 4000) / 50) * 50, rarity, jackpot: true };
    default: {
      const [a, b] = COINS[rarity];
      return { kind: 'coins', n: Math.round(randInt(a, b) / 5) * 5, rarity };
    }
  }
}

export function rollPrize(rarity, game = null) {
  const table = Object.entries(TABLE[rarity] || TABLE.comum);
  for (let tries = 0; tries < 6 && table.length; tries++) {
    let r = Math.random() * table.reduce((a, [, w]) => a + w, 0);
    const i = Math.max(0, table.findIndex(([, w]) => (r -= w) <= 0));
    const p = prizeOf(table[i][0], rarity, game);
    if (p) return p;
    table.splice(i, 1);
  }
  return prizeOf('coins', rarity);
}

const prizeArt = (p) => (p.kind === 'coins' ? icon('coinpile') : p.kind === 'figure' ? figureById(p.id)?.img : itemById(p.id)?.img) || icon('box_comum');
const prizeName = (p) => (p.kind === 'coins' ? `${p.jackpot ? '💰 ' : ''}${p.n} moedas`
  : p.kind === 'figure' ? `Boneco: ${figureById(p.id)?.name || p.id}`
  : `${itemById(p.id)?.name || p.id}${p.n > 1 ? ` ×${p.n}` : ''}`);

// ---------- achievements ----------

const sum = (o) => Object.values(o || {}).reduce((a, b) => a + (typeof b === 'number' ? b : (b?.plays ?? b?.n ?? 0)), 0);
const miniStat = (g, key) => Object.values(g.profile.minigames || {}).reduce((a, r) => a + (r?.[key] || 0), 0);
const miniTop = (g) => Math.max(1, ...Object.values(g.profile.minigames || {}).map(mgLevel));
const ageDays = (g) => (Date.now() - (g.profile.born || Date.now())) / 864e5;
const fun = (a) => a.game.profile.fun || {};
const ev = (a, k) => a.game.profile.events?.[k] || 0;
const upCount = (a) => new Set(Object.entries(a.game.toys || {}).filter(([, t]) => t.up).map(([k]) => k.split('#')[0]).filter((b) => UPGRADES[b])).size;
const tasteCount = (a, t) => Object.values(a.game.profile.tastes || {}).filter((v) => !t || v === t).length;
const NEW_TOYS = ['ioio', 'bambole', 'pipa', 'cubo', 'skate', 'aquario', 'teclado', 'pula_pula', 'camera', 'robo', 'tamagotchi'];
const crowD = (a) => a.game.profile.crow || {};
const CROW_SKILL_COUNT = 7;
const placed = (...ids) => (app) => ids.some((id) => app.game.toys[id]?.placed);

// [id, emoji, name, description, value(app), goal, box]
const ACHIEVEMENTS = [
  ['carinho1', '🤚', 'Primeiro Cafuné', 'Faça carinho pela primeira vez', (a) => a.game.profile.pats, 1, 'caixa_comum'],
  ['carinho50', '💞', 'Mãos Mágicas', '50 cafunés', (a) => a.game.profile.pats, 50, 'caixa_rara'],
  ['carinho300', '👑', 'Mestre do Cafuné', '300 cafunés', (a) => a.game.profile.pats, 300, 'caixa_lendaria'],
  ['comilona', '🍙', 'Barriguinha Feliz', 'Consumir 25 itens', (a) => sum(a.game.profile.consumed), 25, 'caixa_comum'],
  ['gourmet', '🍱', 'Gourmet', 'Consumir 150 itens', (a) => sum(a.game.profile.consumed), 150, 'caixa_rara'],
  ['paladar', '👅', 'Paladar Refinado', 'Provar 20 sabores diferentes', (a) => Object.keys(a.game.profile.tastes || {}).length, 20, 'caixa_rara'],
  ['pegapega', '🏃', 'Pega-Pega', 'Brincar de pega-pega 10 vezes', (a) => a.game.profile.chases, 10, 'caixa_comum'],
  ['fuga', '💨', 'Escapista', 'Escapar 10 vezes', (a) => a.game.profile.escapes, 10, 'caixa_rara'],
  ['gamer', '🎮', 'Gamer', 'Jogar 20 partidas de videogame', (a) => a.game.profile.gamesPlayed, 20, 'caixa_comum'],
  ['proplayer', '🕹️', 'Pro Player', 'Jogar 100 partidas de videogame', (a) => a.game.profile.gamesPlayed, 100, 'caixa_rara'],
  ['colecao', '💾', 'Colecionadora', 'Ter 8 cartuchos', (a) => (a.game.cartridges || []).length, 8, 'caixa_rara'],
  ['otaku', '📚', 'Otaku', 'Ter 10 mangás', (a) => (a.game.mangas || []).length, 10, 'caixa_rara'],
  ['mini5', '🎲', 'Hora do Recreio', 'Jogar 5 minijogos', (a) => miniStat(a.game, 'plays'), 5, 'caixa_comum'],
  ['mini25', '🏅', 'Campeã', 'Vencer 25 minijogos', (a) => miniStat(a.game, 'wins'), 25, 'caixa_rara'],
  ['mininv5', '⬆️', 'Parceira de Jogo', 'Chegar ao nível 5 em um minijogo', (a) => miniTop(a.game), 5, 'caixa_rara'],
  ['mininv10', '🏆', 'Mestra dos Jogos', 'Chegar ao nível 10 em um minijogo', (a) => miniTop(a.game), 10, 'caixa_lendaria'],
  ['minibonus', '🎁', 'Prêmio Merecido', 'Ganhar 20 bônus de minijogos', (a) => a.game.profile.mgBonusTotal, 20, 'caixa_comum'],
  ['afeto100', '💗', 'Amizade', 'Chegar a 100 de Afeição', (a) => a.pet.affection, 100, 'caixa_comum'],
  ['afeto400', '💖', 'Melhores Amigas', 'Chegar a 400 de Afeição', (a) => a.pet.affection, 400, 'caixa_rara'],
  ['afeto1000', '💝', 'Laço Eterno', 'Afeição máxima (1000)', (a) => a.pet.affection, 1000, 'caixa_lendaria'],
  ['todosmini', '🗝️', 'Tudo Liberado', 'Desbloquear todos os minijogos', (a) => MINIGAMES.filter((m) => mgUnlocked(m.id, a.pet.affection)).length, MINIGAMES.length, 'caixa_lendaria'],
  ['moedas1k', '¥', 'Cofrinho', 'Ganhar 1.000 moedas', (a) => a.game.profile.coinsEarned, 1000, 'caixa_comum'],
  ['moedas10k', '💰', 'Magnata', 'Ganhar 10.000 moedas', (a) => a.game.profile.coinsEarned, 10000, 'caixa_rara'],
  ['pedidos', '📝', 'Atenciosa', 'Atender 10 pedidos', (a) => a.game.profile.requestsDone, 10, 'caixa_rara'],
  ['caixas10', '🎁', 'Viciada em Caixas', 'Abrir 10 caixas', (a) => a.game.profile.boxesOpened, 10, 'caixa_rara'],
  ['lendario', '🌟', 'Sorte Grande', 'Tirar um prêmio Lendário', (a) => (a.game.profile.gotLegendary ? 1 : 0), 1, 'caixa_rara'],
  ['missoes', '📅', 'Rotina Exemplar', 'Concluir 15 missões diárias', (a) => a.game.profile.missionsDone, 15, 'caixa_rara'],
  ['semana', '🎂', 'Uma Semana Juntas', '7 dias de convivência', (a) => ageDays(a.game), 7, 'caixa_rara'],
  ['mes', '🏆', 'Um Mês Juntas', '30 dias de convivência', (a) => ageDays(a.game), 30, 'caixa_lendaria'],
  ['compras', '🛍️', 'Consumista', 'Fazer 30 compras', (a) => a.game.profile.purchases, 30, 'caixa_comum'],
  ['mesada', '👛', 'Mesada', 'Dar 500 moedas para a carteira dela', (a) => a.game.profile.walletGiven, 500, 'caixa_comum'],
  ['gacha10', '🎰', 'Gira-Gira', 'Girar a Gacha-Machine 10 vezes', (a) => a.game.profile.gachaPulls, 10, 'caixa_comum'],
  ['epico', '🔴', 'Épico!', 'Tirar uma cápsula Épica na Gacha', (a) => (a.game.profile.gotEpic ? 1 : 0), 1, 'caixa_rara'],
  ['bonecos8', '🧸', 'Colecionadora de Bonecos', 'Ter 8 bonecos colecionáveis', (a) => (a.game.figures || []).length, 8, 'caixa_rara'],
  ['bonecos16', '🏯', 'Coleção Completa', 'Ter todos os bonecos colecionáveis', (a) => (a.game.figures || []).filter((id) => !figureById(id)?.up).length, FIGURES.filter((f) => !f.up).length, 'caixa_lendaria'],
  ['trinca', '🍒', 'Trinca!', 'Ela tirar 3 iguais na Slot-Machine', (a) => a.game.profile.slotTriples, 1, 'caixa_rara'],
  ['jackpot', '💰', 'Jackpot!', 'Ela tirar 7-7-7 na Slot-Machine', (a) => a.game.profile.jackpots, 1, 'caixa_lendaria'],
  ['gacha50', '🎰', 'Viciada em Gacha', 'Girar a Gacha-Machine 50 vezes', (a) => a.game.profile.gachaPulls, 50, 'caixa_rara'],
  ['slot50', '🎲', 'Apostadora', 'Ela girar a Slot-Machine 50 vezes', (a) => a.game.profile.slotSpins, 50, 'caixa_comum'],
  ['vend10', '🥤', 'Freguesa da Máquina', 'Ela comprar 10 vezes nas vending machines', (a) => a.game.profile.vendBuys, 10, 'caixa_comum'],
  ['vend50', '🏪', 'Cliente VIP', 'Ela comprar 50 vezes nas vending machines', (a) => a.game.profile.vendBuys, 50, 'caixa_rara'],
  ['vend7777', '🎰', 'Mais Um Grátis!', 'Tirar 7777 na roleta da vending machine', (a) => ev(a, 'vendLucky'), 1, 'caixa_rara'],
  ['favoritas', '😍', 'Favoritas', 'Ter 5 comidas ou bebidas favoritas', (a) => tasteCount(a, 'love'), 5, 'caixa_rara'],
  ['paladar40', '🍽️', 'Crítica Gastronômica', 'Provar 40 sabores diferentes', (a) => tasteCount(a), 40, 'caixa_lendaria'],
  ['ioio5', '🪀', 'Truque na Manga', 'Ioiô no nível 5', (a) => Math.min(10, 1 + Math.floor((fun(a).yoyo || 0) / 12)), 5, 'caixa_comum'],
  ['ioio10', '🌀', 'Mestre do Ioiô', 'Ioiô no nível máximo (10)', (a) => Math.min(10, 1 + Math.floor((fun(a).yoyo || 0) / 12)), 10, 'caixa_rara'],
  ['bambole40', '⭕', 'Rainha do Bambolê', 'Recorde de 40s no bambolê', (a) => fun(a).hoopBest, 40, 'caixa_rara'],
  ['cubo40', '🧩', 'Cubo Relâmpago', 'Resolver o cubo mágico em até 40s', (a) => (fun(a).cubeBest && fun(a).cubeBest <= 40 ? 1 : 0), 1, 'caixa_rara'],
  ['album', '📷', 'Fotógrafa', `Encher o álbum de fotos (${ALBUM_MAX})`, (a) => (fun(a).photos || []).length, ALBUM_MAX, 'caixa_rara'],
  ['aquario', '🐟', 'Aquarista', 'Alimentar os peixes do aquário 20 vezes', (a) => ev(a, 'fishFeed'), 20, 'caixa_comum'],
  ['tama', '🥚', 'Mamãe Virtual', 'Deixar o Tamapet feliz 10 vezes', (a) => ev(a, 'tamaHappy'), 10, 'caixa_rara'],
  ['skate', '🛹', 'Skatista', 'Andar de skate 15 vezes', (a) => ev(a, 'toy:skate'), 15, 'caixa_comum'],
  ['manobra', '🤘', 'Manobra Radical', 'Deslizar de skate em cima de janelas 10 vezes', (a) => ev(a, 'skateGrind'), 10, 'caixa_rara'],
  ['pulapula', '🦘', 'Lá no Alto!', 'Pular do pula-pula para cima de uma janela', (a) => ev(a, 'trampWindow'), 1, 'caixa_rara'],
  ['diversao', '🎪', 'Parque de Diversões', `Brincar com todos os ${NEW_TOYS.length} brinquedos novos`, (a) => NEW_TOYS.filter((id) => ev(a, `toy:${id}`)).length, NEW_TOYS.length, 'caixa_lendaria'],
  ['doll10', '🧸', 'Amigo de Pano', 'Brincar com o Doll 10 vezes', (a) => ev(a, 'dollPlay'), 10, 'caixa_rara'],
  ['dollwin', '🏁', 'Campeã do Doll', 'Vencer o Doll 5 vezes', (a) => ev(a, 'dollWin'), 5, 'caixa_comum'],
  ['bolada', '💰', 'Bolada!', 'Tirar a bolada de moedas numa caixa', (a) => a.game.profile.lootJackpots, 1, 'caixa_lendaria'],
  ['corvo', '🥚', 'Amigo de Penas', 'Abrir a Caixa Misteriosa', (a) => (a.game.gear?.corvo ? 1 : 0), 1, 'caixa_comum'],
  ['corvoaula', '🎓', 'Primeira Lição', 'Ensinar uma habilidade ao Corvo', (a) => crowD(a).learned?.length, 1, 'caixa_comum'],
  ['corvogenio', '🧠', 'Corvo Prodígio', `Ensinar todas as ${CROW_SKILL_COUNT} habilidades ao Corvo`, (a) => crowD(a).learned?.length, CROW_SKILL_COUNT, 'caixa_lendaria'],
  ['corvotreino', '🏋️', 'Treinadora', 'Treinar o Corvo 30 vezes', (a) => crowD(a).trains, 30, 'caixa_rara'],
  ['corvopresente', '🎁', 'Entrega Aérea', 'Receber 10 presentes do Corvo', (a) => crowD(a).gifts, 10, 'caixa_rara'],
  ['corvobrilho', '✨', 'Olho Clínico', 'O Corvo achar 20 brilhos', (a) => crowD(a).shinies, 20, 'caixa_rara'],
  ['corvotruque', '🎩', 'Respeitável Público', 'Ver 10 apresentações do Corvo', (a) => crowD(a).tricks, 10, 'caixa_rara'],
  ['corvodoll', '🧸', 'Penas e Pano', 'O Corvo brincar 5 vezes com o Doll', (a) => crowD(a).dollPlays, 5, 'caixa_rara'],
  ['corvomoveis', '🛋️', 'Poleiro Favorito', 'O Corvo pousar em 6 móveis diferentes', (a) => crowD(a).perches?.length, 6, 'caixa_rara'],
  ['corvocabeca', '👒', 'Chapéu Vivo', 'O Corvo pousar 20 vezes na cabeça dela', (a) => crowD(a).heads, 20, 'caixa_comum'],
  ['upgrade1', '⬆️', 'Primeiro Upgrade', 'Aperfeiçoar uma mobília', (a) => ev(a, 'upgrade'), 1, 'caixa_comum'],
  ['upgrade5', '🔧', 'Engenheira', 'Aperfeiçoar 5 mobílias', (a) => upCount(a), 5, 'caixa_rara'],
  ['upgradeall', '🌆', 'Cidade Neon', `Aperfeiçoar todas as ${Object.keys(UPGRADES).length} mobílias`, (a) => upCount(a), Object.keys(UPGRADES).length, 'caixa_lendaria'],
  ['bonecosneon', '🤖', 'Coleção Neon', 'Ter todos os bonecos da Gacha Neon', (a) => (a.game.figures || []).filter((id) => figureById(id)?.up).length, FIGURES.filter((f) => f.up).length, 'caixa_lendaria'],
  ['dj', '🎹', 'DJ Persocon', 'Ela tocar 3 músicas no Sintetizador Neon', (a) => ev(a, 'songImport') + ev(a, 'pianoStart'), 3, 'caixa_rara'],
  ['arcade10', '🔫', 'Atiradora de Elite', 'Ela jogar 10 partidas no Arcade de Tiro', (a) => ev(a, 'arcadePlay'), 10, 'caixa_rara'],
  // Atributos: Força / Constituição / Agilidade (uma conquista por marco de nível).
  ['attr_str5', '💪', 'Braços Fortes', 'Força no Nv 5', (a) => attrLevelOf(a.game.attrXp('str')), 5, 'caixa_rara'],
  ['attr_str10', '🦾', 'Corpo de Aço', 'Força no Nv 10', (a) => attrLevelOf(a.game.attrXp('str')), 10, 'caixa_lendaria'],
  ['attr_con5', '🛡️', 'Saúde de Ferro', 'Constituição no Nv 5', (a) => attrLevelOf(a.game.attrXp('con')), 5, 'caixa_rara'],
  ['attr_con10', '🏰', 'Muralha Viva', 'Constituição no Nv 10', (a) => attrLevelOf(a.game.attrXp('con')), 10, 'caixa_lendaria'],
  ['attr_agi5', '🌀', 'Passos Leves', 'Agilidade no Nv 5', (a) => attrLevelOf(a.game.attrXp('agi')), 5, 'caixa_rara'],
  ['attr_agi10', '⚡', 'Velocidade da Luz', 'Agilidade no Nv 10', (a) => attrLevelOf(a.game.attrXp('agi')), 10, 'caixa_lendaria'],
].map(([id, emoji, name, desc, value, goal, box]) => ({ id, emoji, name, desc, value, goal, box }));

// ---------- ícones GTORAVERSE 32x32 (assets/achievements/) ----------
// Tema + tier: caixa_comum → Bronze, caixa_rara → Silver, caixa_lendaria → Gold (Gift boxes e Diamonds são fixos).
const ACH_ICONS = {
  carinho1: 'Bronze-Heart', carinho50: 'Silver-Heart', carinho300: 'Gold-Heart',
  comilona: 'Bronze-Medal', gourmet: 'Silver-Medal', paladar: 'Silver-Star',
  pegapega: 'Bronze-Star', fuga: 'Silver-Pin', gamer: 'Bronze-Trophy', proplayer: 'Silver-Trophy',
  colecao: 'Silver-Pin', otaku: 'Silver-Medal',
  mini5: 'Bronze-Star', mini25: 'Silver-Medal', mininv5: 'Silver-Pin', mininv10: 'Gold-Trophy', minibonus: 'Bronze-Coin',
  afeto100: 'Bronze-Heart', afeto400: 'Silver-Heart', afeto1000: 'Gold-Heart', todosmini: 'Gold-Crown',
  moedas1k: 'Bronze-Coin', moedas10k: 'Silver-Coin',
  pedidos: 'Silver-Star', caixas10: 'Gift-Box-Red', lendario: 'Diamond-Crystal',
  missoes: 'Silver-Star', semana: 'Silver-Pin', mes: 'Gold-Trophy',
  compras: 'Bronze-Star', mesada: 'Bronze-Coin',
  gacha10: 'Bronze-Star', epico: 'Diamond', bonecos8: 'Silver-Pin', bonecos16: 'Gold-Crown',
  trinca: 'Silver-Medal', jackpot: 'Gold-Coin', gacha50: 'Silver-Star', slot50: 'Bronze-Medal',
  vend10: 'Bronze-Pin', vend50: 'Silver-Pin', vend7777: 'Diamond-Crystal',
  favoritas: 'Silver-Heart', paladar40: 'Gold-Medal',
  ioio5: 'Bronze-Star', ioio10: 'Silver-Medal', bambole40: 'Silver-Medal', cubo40: 'Silver-Medal',
  album: 'Silver-Pin', aquario: 'Bronze-Star', tama: 'Silver-Heart',
  skate: 'Bronze-Star', manobra: 'Silver-Medal', pulapula: 'Silver-Star',
  diversao: 'Gold-Crown',
  doll10: 'Silver-Heart', dollwin: 'Bronze-Trophy', bolada: 'Gold-Coin',
  corvo: 'Gift-Box-Green', corvoaula: 'Bronze-Pin', corvogenio: 'Gold-Crown', corvotreino: 'Silver-Medal', corvopresente: 'Gift-Box-Blue',
  corvobrilho: 'Diamond', corvotruque: 'Silver-Medal', corvodoll: 'Silver-Heart', corvomoveis: 'Silver-Pin', corvocabeca: 'Bronze-Pin',
  upgrade1: 'Bronze-Medal', upgrade5: 'Silver-Medal', upgradeall: 'Gold-Crown',
  bonecosneon: 'Gold-Crown', dj: 'Silver-Medal', arcade10: 'Silver-Medal',
  attr_str5: 'Silver-Medal', attr_str10: 'Gold-Medal', attr_con5: 'Silver-Shield', attr_con10: 'Gold-Shield', attr_agi5: 'Silver-Star', attr_agi10: 'Gold-Star',
};
const achIcon = (a) => `assets/achievements/Achievement-Pack-32x32_${ACH_ICONS[a.id] || (a.box === 'caixa_lendaria' ? 'Gold-Star' : a.box === 'caixa_rara' ? 'Silver-Star' : 'Bronze-Star')}.png`;

// ---------- daily missions ----------

const MISSIONS = {
  cafune: { text: (n) => `Fazer ${n} cafunés`, goal: [3, 6], ev: 'pet' },
  comer: { text: (n) => `Dar comida ${n} vezes`, goal: [2, 4], ev: 'ate', test: (d) => d.item?.cat === 'comidas' },
  beber: { text: (n) => `Dar ${n} bebidas`, goal: [2, 3], ev: 'ate', test: (d) => d.item?.cat === 'bebidas' },
  minijogo: { text: (n) => `Jogar ${n} minijogo${n > 1 ? 's' : ''}`, goal: [1, 3], ev: 'miniEnd' },
  vencer: { text: () => 'Vencer um minijogo', goal: [1, 1], ev: 'miniEnd', test: (d) => d.win },
  recorde: { text: () => 'Bater um recorde em um minijogo', goal: [1, 1], ev: 'miniEnd', test: (d) => d.best },
  bonusmini: { text: (n) => `Ganhar ${n} bônus de minijogo${n > 1 ? 's' : ''}`, goal: [1, 2], ev: 'miniEnd', test: (d) => d.bonus },
  banho: { text: () => 'Dar um banho', goal: [1, 1], ev: 'bath' },
  brincar: { text: (n) => `Ela brincar ${n}× com brinquedos`, goal: [2, 3], ev: 'toyEnd', test: (d, app) => !d.interrupted && !!app.game.toys[d.id], can: (app) => Object.entries(app.game.toys).some(([id, t]) => t.placed && !itemById(id.split('#')[0])?.fixed) },
  pegapega: { text: () => 'Brincar de pega-pega', goal: [1, 1], ev: 'chaseEnd' },
  comprar: { text: (n) => `Comprar ${n} itens`, goal: [2, 4], ev: 'bought' },
  ler: { text: () => 'Ela ler um mangá', goal: [1, 1], ev: 'readManga', can: (app) => (app.game.mangas || []).length > 0 },
  humor: { text: (n) => `Manter o Humor acima de 70 por ${n} min`, goal: [5, 10], time: (app) => app.pet.stats.mood > 70 },
  companhia: { text: (n) => `Passar ${n} min com ela`, goal: [20, 40], time: () => true },
  mesada: { text: () => 'Dar moedas para a carteira dela', goal: [1, 1], ev: 'walletGift' },
  gacha: { text: (n) => `Girar a Gacha-Machine ${n}×`, goal: [1, 2], ev: 'gachaPrize', can: (app) => !!app.game.toys.gacha?.placed },
  slot: { text: () => 'Ela jogar na Slot-Machine', goal: [1, 1], ev: 'slotEnd', can: (app) => !!app.game.toys.slot?.placed },
  vending: { text: () => 'Ela comprar algo na vending machine', goal: [1, 1], ev: 'vendBuy', can: placed('venda_comida', 'venda_bebida') },
  peixes: { text: (n) => `Ela alimentar os peixes ${n}×`, goal: [1, 2], ev: 'fun', test: (d) => d.kind === 'fishFeed', can: placed('aquario') },
  foto: { text: (n) => `Ela tirar ${n} foto${n > 1 ? 's' : ''}`, goal: [1, 3], ev: 'fun', test: (d) => d.kind === 'photo', can: placed('camera') },
  doll: { text: () => 'Ela brincar com o Doll', goal: [1, 1], ev: 'dollPlay', can: (app) => !!app.game.gear?.cristal && placed('pelucia')(app) },
  pular: { text: (n) => `Ela pular no pula-pula ${n}×`, goal: [5, 10], ev: 'trampJump', can: placed('pula_pula') },
  esquive: { text: (n) => `Esquivar ou bloquear ${n}× no combate`, goal: [2, 5], ev: 'defence' },
};
const today = () => new Date().toDateString();

// ---------- particles ----------

const CONFETTI = ['#ff4d6d', '#ffd23f', '#3bceac', '#4b69ff', '#d32ce6', '#ff9f1c', '#ffffff'];
const BUFF_COLORS = { noHunger: '#ff9f40', doubleMood: '#ffd23f', noTired: '#5ef0ff', shield: '#7ab8ff', coinMagnet: '#ffe066' };

export class Rewards {
  constructor(app) {
    this.app = app;
    this.opening = null;
    this.parts = [];
    this.popups = [];
    this.popping = null;
    this.checkT = 1;
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'fx-loot';
    document.body.append(this.canvas);
    this.ctx = this.canvas.getContext('2d');
    this.crownEl = Object.assign(document.createElement('img'), { className: 'loot-crown', src: icon('crown'), draggable: false });
    document.body.append(this.crownEl);
    app.game.onOpenBox = (id) => this.open(id);
    app.pet.on((type, data) => this.onEvent(type, data));
    // Mini pop-up quando um atributo sobe de nível (no estilo da missão concluída).
    app.pet.on((type, data) => {
      if (type === 'attrXp' && data?.up && (data.level ?? 0) >= 2) this.attrToast(data);
    });
    this.daily();
    this.repeatRemaining = 0;
    this.repeatId = null;
  }

  get profile() {
    return this.app.game.profile;
  }

  // ---------- boxes ----------

  open(id) {
    const { game, pet } = this.app;
    const box = BOXES[id];
    // Support multi-open: call openMany(id, n) before.
    if (!box || !game.count(id) || pet.dead) {
      this.repeatRemaining = 0;
      this.repeatId = null;
      return false;
    }
    if (this.repeatId !== id) {
      // single open triggered outside run
      this.repeatRemaining = 0;
      this.repeatId = null;
    }
    // Só uma caixa por vez — sem enfileirar várias (travava a fila de ações).
    const hasBox = !!(this.opening || (pet.actionQueue || []).some((a) => a.kind === 'box'));
    if (hasBox) return false;
    if (pet.busyForQueue?.()) {
      pet.enqueue({ kind: 'box', id, label: itemById(id)?.name || 'Caixa' });
      return true;
    }
    return this.openNow(id);
  }

  openMany(id, n) {
    const cnt = Math.max(1, Math.min(n || 1, this.app.game.count(id) || 1));
    this.repeatId = cnt > 1 ? id : null;
    this.repeatRemaining = cnt > 1 ? cnt - 1 : 0;
    return this.open(id);
  }

  // Starts the open right away (also used when the action queue drains a box).
  openNow(id) {
    const { game, pet } = this.app;
    const box = BOXES[id];
    if (!box || this.opening || !game.count(id) || pet.dead) return false;
    game.take(id);
    const p = this.profile;
    const lucky = (p.luck || 0) > 0;
    if (lucky) p.luck--;
    const win = rollPrize(rollRarity(box.odds, lucky, luckOf(pet.affection) + (this.app.crow?.luck() || 0) + (pet.buff?.('luck') ? 0.05 : 0)), game);
    p.boxesOpened = (p.boxesOpened || 0) + 1;
    if (win.rarity === 'lendario') p.gotLegendary = true;
    this.opening = { id, box, win, lucky };
    game.changed();
    this.app.closeMenu?.();
    pet.emit('lootOpen', { id });
    this.petOpens(id, () => this.roulette());
    return true;
  }

  // The pet shakes the box harder and harder until it pops open. Never interrupts another action.
  petOpens(id, done) {
    const { pet, sound, toys } = this.app;
    const free = pet.mode === 'ground' && !pet.paused && !pet.busyForQueue?.() && pet.action !== 'sleep';
    if (!free) return setTimeout(done, 250);
    let beat = 0;
    pet.playToy({
      id: 'lootbox', dur: 2.7, hold: itemById(id).img, facing: 'front',
      tick: (dt, tp) => {
        const k = Math.min(1, tp.t / 2.4);
        tp.reach = 0.3 + k * 0.25;
        tp.angle = Math.sin(tp.t * (18 + k * 30)) * (4 + k * 16);
        tp.bob = -Math.abs(Math.sin(tp.t * 9)) * k * 6;
        if (tp.t >= beat) {
          beat += 0.42 - k * 0.25;
          sound.tone8(260 + k * 500, 340 + k * 600, 0.05, 'square', 0.05);
          const h = this.app.head;
          if (h && Math.random() < 0.6) toys.furn.floatText(h.x + rand(-30, 30), h.y - 10, pick(['✨', '❔', '❗', '⭐']));
        }
      },
      onEnd: () => {
        sound.tone8(180, 900, 0.18, 'sawtooth', 0.08);
        const h = this.app.head || { x: innerWidth / 2, y: innerHeight / 2 };
        this.burst(h.x, h.y + pet.P * 0.15, 50, 520);
        done();
      },
    });
  }

  roulette() {
    const o = this.opening;
    const { sound } = this.app;
    const root = el('loot-overlay hitzone', document.body);
    const panel = el('loot-panel', root);
    const boxItem = itemById(o.id);
    el('loot-title', panel, `<img src="${boxItem.img}"> ${boxItem.name}${o.lucky ? ' <span class="loot-luck">🍀 sorte!</span>' : ''}`);
    const win = el('loot-window', panel);
    const strip = el('loot-strip', win);
    el('loot-marker', win);
    const N = 50;
    const at = 42;
    const cards = [];
    for (let i = 0; i < N; i++) {
      const p = i === at ? o.win : rollPrize(rollRarity(o.box.odds));
      const c = el(`loot-card r-${p.rarity}`, strip, `<img src="${prizeArt(p)}" draggable="false"><span>${prizeName(p)}</span>`);
      c.style.setProperty('--rc', RARITIES[p.rarity].color);
      cards.push(c);
    }
    const info = el('loot-info', panel, 'Girando…');
    sound.play('blip', { volume: 0.5 });
    requestAnimationFrame(() => {
      const cw = cards[1].offsetLeft - cards[0].offsetLeft;
      const center = win.clientWidth / 2;
      const end = -(at * cw + cw / 2 - center + rand(-0.38, 0.38) * cw);
      strip.style.transition = 'transform 6.4s cubic-bezier(0.05, 0.75, 0.08, 1)';
      strip.style.transform = `translateX(${end}px)`;
      let last = -1;
      let finished = false;
      const tick = () => {
        if (finished) return;
        const x = new DOMMatrix(getComputedStyle(strip).transform).m41;
        const idx = Math.floor((center - x) / cw);
        if (idx !== last) {
          last = idx;
          sound.tone8(1400, 1100, 0.02, 'square', 0.035);
        }
        requestAnimationFrame(tick);
      };
      tick();
      const reveal = () => {
        if (finished) return;
        finished = true;
        this.reveal(root, panel, info, cards[at]);
      };
      strip.addEventListener('transitionend', reveal, { once: true });
      setTimeout(reveal, 7000);
    });
  }

  reveal(root, panel, info, card) {
    const o = this.opening;
    const { app } = this;
    const { win } = o;
    const r = RARITIES[win.rarity];
    const tier = RARITY_ORDER.indexOf(win.rarity);
    card.classList.add('win');
    root.classList.add('done', `r-${win.rarity}`);
    root.style.setProperty('--rc', r.color);
    info.remove();
    this.grant(win);
    const note = win.dupe ? `Ela já tinha · +${win.dupe} moedas para você`
      : win.jackpot ? 'Bolada de moedas!'
      : win.kind === 'item' ? itemById(win.id)?.note : '';
    const res = el('loot-result', panel, `
      <div class="loot-rays"></div>
      <img src="${prizeArt(win)}" draggable="false">
      <div class="loot-rarity">${r.label.toUpperCase()}${tier >= 3 ? '!!!' : tier >= 2 ? '!' : ''}</div>
      <div class="loot-name">${prizeName(win)}</div>
      ${note ? `<div class="loot-note">${note}</div>` : ''}`);
    const btn = document.createElement('button');
    btn.className = 'primary';
    btn.textContent = 'Pegar ✓';
    res.append(btn);
    this.fanfare(tier);
    const rect = card.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    this.burst(cx, cy, 30 + tier * 40, 400 + tier * 150);
    if (tier >= 2) this.confettiRain(tier >= 3 ? 220 : 110);
    if (tier >= 3) {
      this.fireworks(5);
      root.classList.add('flash');
    }
    app.pet.emit('lootPrize', { rarity: win.rarity, name: prizeName(win) });
    if (tier >= 2) app.antics?.tryStart(tier >= 3 ? 'twirl' : 'hops');
    dollReact(app, tier >= 2 ? '🤩' : '🎁', tier >= 2 ? 'cheer' : null, 2);
    let closed = false;
    const close = () => {
      if (closed) return;
      closed = true;
      root.classList.add('out');
      setTimeout(() => root.remove(), 300);
      this.opening = null;
      app.game.changed();
      // Next box in the queue (or whatever she was going to do).
      if (app.pet?.mode === 'ground') app.pet.chooseNext?.();
    };
    btn.onclick = () => {
      const repeat = this.repeatRemaining > 0;
      const rid = this.repeatId;
      close();
      if (repeat) {
        this.repeatRemaining--;
        setTimeout(() => this.open(rid), 800);
      } else {
        this.repeatId = null;
      }
    };
    root.addEventListener('click', (e) => e.target === root && close());
    setTimeout(close, 9000);
  }

  // Coins only come out of boxes for the player (never into her wallet). Collectibles go where a
  // purchase would (bag, shelf, gear, toys); one she already has turns into coins.
  grant(p) {
    const { game } = this.app;
    const item = p.kind === 'item' && itemById(p.id);
    const owned = p.kind === 'figure' ? game.figures.includes(p.id)
      : item?.cart ? game.cartridges.includes(item.cart)
      : item?.manga ? game.mangas.includes(p.id)
      : item?.toy && !item.decor ? !!game.toys[p.id] && !game.toys[p.id].broken
      : false;
    if (p.kind === 'coins') { game.coins += p.n; this.app.pet?.emit('earn', { n: p.n }); }
    else if (owned) {
      p.dupe = DUPE[p.rarity] || DUPE.comum;
      game.coins += p.dupe;
      this.app.pet?.emit('earn', { n: p.dupe });
    } else if (p.kind === 'figure') game.figures.push(p.id);
    else if (item && (item.cart || item.manga || item.toy)) {
      game.deliveries.unshift({ id: p.id, n: p.n, x: null, display: null });
      game.deliver(p.id);
    } else game.inventory[p.id] = Math.min(999, game.count(p.id) + p.n);
    if (p.jackpot) this.profile.lootJackpots = (this.profile.lootJackpots || 0) + 1;
    game.changed();
  }

  // Rising arpeggio, longer for rarer prizes.
  fanfare(tier) {
    const { sound } = this.app;
    const notes = [523, 659, 784, 1047, 1319, 1568].slice(0, 3 + tier);
    notes.forEach((f, i) => setTimeout(() => sound.tone8(f, f, 0.12 + (i === notes.length - 1 ? 0.25 : 0), 'square', 0.07), i * 95));
    if (tier >= 3) setTimeout(() => [784, 988, 1175, 1568].forEach((f) => sound.tone8(f, f * 1.01, 0.6, 'triangle', 0.05)), notes.length * 95 + 60);
  }

  // ---------- prize effects ----------

  onEvent(type, data) {
    if (type === 'medicine' && data?.item?.special) this.special(data.item);
    const it = (type === 'medicine' || (type === 'ate' && data?.item?.vendUp)) && data?.item;
    if (it && (it.buffs || it.buff || ['raro', 'lendario'].includes(it.rarity))) this.powerUp(it);
    if (type === 'funBig') type = 'fun';
    if (type === 'toyUpgraded') setTimeout(() => dollReact(this.app, '🤩', 'cheer', 2.4), 600);
    else if (type === 'songImport') dollReact(this.app, '🎶', 'cheer', 2);
    else if (type === 'arcadePlay') dollReact(this.app, '🔫', null, 1.6);
    this.count(type, data || {});
    const d = this.profile.daily;
    if (!d || d.day !== today()) return;
    for (const m of d.list) {
      const def = MISSIONS[m.id];
      if (!def || m.done || def.ev !== type || (def.test && !def.test(data || {}, this.app))) continue;
      m.n++;
      if (m.n >= m.goal) this.completeMission(m);
      else this.app.game.changed();
    }
  }

  // Event counters for the achievements (profile.events): fun-toy moments, toys played, Doll games.
  count(type, d) {
    const key = type === 'fun' ? d.kind
      : type === 'toyEnd' && d.id ? `toy:${String(d.id).split('#')[0]}`
      : type === 'dollPlay' || type === 'vendLucky' || type === 'songImport' || type === 'arcadePlay' ? type
      : type === 'toyUpgraded' ? 'upgrade'
      : (type === 'dollWin' || type === 'dollGameEnd') && d.won ? 'dollWin'
      : null;
    if (!key) return;
    const c = (this.profile.events ||= {});
    c[key] = (c[key] || 0) + 1;
    this.app.game.changed();
  }

  special(item) {
    const { app } = this;
    const { pet, game, toys } = app;
    const h = app.head || { x: pet.x, y: pet.y - pet.P };
    const p = this.profile;
    switch (item.special) {
      case 'fortune':
        pet.emit('fortune', { text: pick(FORTUNES) });
        break;
      case 'confetti':
        this.burst(h.x, h.y, 90, 600);
        app.sound.tone8(200, 1200, 0.15, 'sawtooth', 0.07);
        break;
      case 'bubbles':
        for (let i = 0; i < 26; i++) this.parts.push({ type: 'bubble', x: h.x + rand(-60, 60), y: h.y + rand(0, pet.P * 0.6), vx: rand(-10, 10), vy: rand(-70, -30), r: rand(5, 14), life: rand(2.5, 4.5), t: -rand(0, 1.5) });
        break;
      case 'zzz':
        [0, 400, 800].forEach((ms) => setTimeout(() => toys.furn.floatText(h.x + rand(-10, 20), h.y - 10, '💤'), ms));
        break;
      case 'hearts':
        this.rain('❤', 40, ['#ff4d6d', '#ff8fab', '#ffffff']);
        break;
      case 'fireflies':
        p.firefliesUntil = Date.now() + 180e3;
        break;
      case 'fireworks':
        this.fireworks(9);
        break;
      case 'cart': {
        const missing = Object.keys(GAMES).filter((g) => !game.cartridges.includes(g));
        if (missing.length) {
          const g = pick(missing);
          game.cartridges.push(g);
          game.bag = true;
          toys.furn.floatText(h.x, h.y - 10, `💾 ${GAMES[g].name}`);
        } else {
          game.coins += 200;
          this.app.pet?.emit('earn', { n: 200 });
          toys.furn.floatText(h.x, h.y - 10, '+200 ¥');
        }
        game.changed();
        break;
      }
      case 'phoenix':
        this.flash('#ffb300');
        this.burst(h.x, h.y, 140, 700, ['#ffb300', '#ff6b00', '#ffe066', '#ffffff']);
        toys.furn.floatText(h.x, h.y - 10, '🔥');
        break;
      case 'luck':
        p.luck = (p.luck || 0) + 3;
        this.rain('★', 30, ['#ffe066', '#ffffff']);
        toys.furn.floatText(h.x, h.y - 10, '🍀 +3 caixas com sorte');
        break;
      case 'crown':
        p.crownUntil = Date.now() + 15 * 60e3;
        this.burst(h.x, h.y - 20, 40, 400, ['#ffd23f', '#ffffff']);
        break;
      case 'rainbow':
        p.rainbowUntil = Date.now() + 180e3;
        break;
    }
    game.changed();
  }

  // Power-up (buff or rare prize): sparks charge up around her while she glows, then a burst,
  // a shock ring on the floor and the bonus icon popping over her head, with a fanfare.
  powerUp(item) {
    const { app } = this;
    const { pet, sound } = app;
    const list = item.buffs || (item.buff ? [item.buff] : []);
    const b = list[0]?.[0];
    const color = BUFF_COLORS[b] || RARITIES[item.rarity]?.color || '#ffd23f';
    const ch = BUFF_ICONS[b] || '✨';
    const label = translate(list.length ? list.map(([k]) => BUFF_LABELS[k] || k).join(' + ') : item.name);
    const P = pet.P;
    pet.cheer?.(2.6);
    const body = document.getElementById('pet');
    if (body) {
      body.style.setProperty('--pu', color);
      body.classList.remove('powerup');
      void body.offsetWidth;
      body.classList.add('powerup');
      clearTimeout(this.puTimer);
      this.puTimer = setTimeout(() => body.classList.remove('powerup'), 2700);
    }
    sound.tone8(160, 1100, 0.6, 'sawtooth', 0.045);
    [0, 110, 220, 330, 440].forEach((ms, i) => setTimeout(() => sound.tone8(420 + i * 170, 520 + i * 170, 0.06, 'square', 0.04), ms));
    for (let i = 0; i < 46; i++) {
      const a = rand(0, Math.PI * 2);
      const r = rand(0.35, 0.8) * P;
      this.parts.push({ type: 'rise', x: pet.x + Math.cos(a) * r, y: pet.y - rand(0, 0.25) * P, vx: 0, vy: -rand(110, 230), color: pick([color, color, '#ffffff']), life: rand(0.45, 0.8), t: -rand(0, 0.5) });
    }
    setTimeout(() => {
      const h = app.head || { x: pet.x, y: pet.y - P };
      this.flash(color, 0.22);
      sound.tone8(110, 40, 0.4, 'sawtooth', 0.06);
      this.fanfare(3);
      for (let i = 0; i < 64; i++) {
        const a = (i / 64) * Math.PI * 2;
        const v = rand(140, 300);
        this.parts.push({ type: 'spark', x: h.x, y: h.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, color: Math.random() < 0.25 ? '#ffffff' : color, life: rand(0.8, 1.4), t: 0 });
      }
      this.parts.push(
        { type: 'ring', x: pet.x, y: pet.y, r: 6, vr: P * 3.4, vx: 0, vy: 0, color, life: 0.7, t: 0 },
        { type: 'ring', x: pet.x, y: pet.y, r: 6, vr: P * 2.2, vx: 0, vy: 0, color: '#ffffff', life: 0.9, t: -0.12 },
        { type: 'badge', ch, text: label, x: h.x, y: h.y - P * 0.3, vx: 0, vy: -26, color, life: 2.6, t: 0 },
      );
    }, 620);
  }

  // ---------- achievements ----------

  checkAchievements() {
    const p = this.profile;
    const got = (p.achievements ||= {});
    let any = false;
    for (const a of ACHIEVEMENTS) {
      if (got[a.id] || (a.value(this.app) || 0) < a.goal) continue;
      got[a.id] = Date.now();
      this.app.game.inventory[a.box] = this.app.game.count(a.box) + 1;
      this.celebrate({ kind: 'ach', icon: achIcon(a), title: 'CONQUISTA DESBLOQUEADA', name: a.name, desc: a.desc, box: a.box });
      any = true;
    }
    const first = !p.mgSeen;
    const seen = (p.mgSeen ||= []);
    for (const m of MINIGAMES) {
      if (seen.includes(m.id) || !mgUnlocked(m.id, this.app.pet.affection)) continue;
      seen.push(m.id);
      any = true;
      if (!first) this.celebrate({ kind: 'mission', emoji: m.icon, title: 'MINIJOGO DESBLOQUEADO', name: m.name, desc: 'Já dá pra jogar em Brincar' });
    }
    if (any) this.app.game.changed();
  }

  achievements() {
    const got = this.profile.achievements || {};
    return ACHIEVEMENTS.map((a) => ({ ...a, icon: achIcon(a), done: !!got[a.id], at: got[a.id], n: Math.min(a.goal, Math.floor(a.value(this.app) || 0)) }));
  }

  // ---------- missions ----------

  daily() {
    const p = this.profile;
    if (p.daily?.day === today()) return p.daily;
    const ids = Object.keys(MISSIONS).filter((id) => !MISSIONS[id].can || MISSIONS[id].can(this.app)).sort(() => Math.random() - 0.5).slice(0, 3);
    p.daily = { day: today(), bonus: false, list: ids.map((id) => ({ id, goal: randInt(...MISSIONS[id].goal), n: 0, done: false })) };
    this.app.game.changed();
    return p.daily;
  }

  missions() {
    return this.daily().list.map((m) => ({ ...m, text: MISSIONS[m.id].text(m.goal) }));
  }

  // O reset das missões: uma vez por dia, e só as que NÃO foram concluídas são sorteadas
  // de novo (as concluídas ficam como estão).
  canResetDaily() {
    return this.profile.lastDailyResetDate !== today();
  }

  resetDaily() {
    const p = this.profile;
    if (!this.canResetDaily()) return false;
    const d = this.daily();
    const keep = d.list.filter((m) => m.done);
    const pool = Object.keys(MISSIONS)
      .filter((id) => !MISSIONS[id].can || MISSIONS[id].can(this.app))
      .filter((id) => !keep.some((m) => m.id === id))
      .sort(() => Math.random() - 0.5);
    const fresh = pool.slice(0, Math.max(0, 3 - keep.length))
      .map((id) => ({ id, goal: randInt(...MISSIONS[id].goal), n: 0, done: false }));
    d.list = [...keep, ...fresh];
    p.lastDailyResetDate = today();
    this.app.game.changed();
    return true;
  }

  completeMission(m) {
    const { game } = this.app;
    const d = this.profile.daily;
    m.done = true;
    m.n = m.goal;
    this.profile.missionsDone = (this.profile.missionsDone || 0) + 1;
    game.inventory.caixa_comum = game.count('caixa_comum') + 1;
    this.celebrate({ kind: 'mission', emoji: '📅', title: 'MISSÃO CONCLUÍDA', name: MISSIONS[m.id].text(m.goal), box: 'caixa_comum' });
    if (!d.bonus && d.list.every((x) => x.done)) {
      d.bonus = true;
      game.inventory.caixa_rara = game.count('caixa_rara') + 1;
      this.celebrate({ kind: 'ach', emoji: '🗓️', title: 'MISSÕES DO DIA COMPLETAS', name: 'Dia Perfeito!', desc: 'Todas as missões de hoje', box: 'caixa_rara' });
    }
    game.changed();
  }

  // ---------- celebration popups ----------

  // Mini pop-up quando um atributo sobe de nível.
  attrToast({ id, level }) {
    const ATTR_LBL = { str: 'Força', con: 'Constituição', agi: 'Agilidade', dex: 'Destreza' };
    const shape = { str: 'Medal', con: 'Shield', agi: 'Star', dex: 'Pin' }[id];
    if (!shape) return;   // só os atributos treináveis de combate disparam
    const tier = level >= 10 ? 'Gold' : level >= 5 ? 'Silver' : 'Bronze';
    this.celebrate({ kind: 'mission', icon: `assets/achievements/Achievement-Pack-32x32_${tier}-${shape}.png`, title: 'NÍVEL DE ATRIBUTO', name: `${ATTR_LBL[id]} Nv ${level}` });
  }

  celebrate(c) {
    this.popups.push(c);
    if (!this.popping) this.nextPopup();
  }

  nextPopup() {
    const c = this.popups.shift();
    this.popping = c || null;
    if (!c) return;
    const { app } = this;
    const big = c.kind === 'ach';
    const box = c.box && itemById(c.box);
    const pop = el(`ach-pop ${big ? 'big' : 'small'}`, document.body, `
      ${big ? '<div class="ach-rays"></div>' : ''}
      <div class="ach-trophy">${c.icon ? `<img src="${c.icon}" alt="">` : `<span>${c.emoji}</span>`}</div>
      <div class="ach-text">
        <div class="ach-title">${c.title}</div>
        <div class="ach-name">${c.name}</div>
        ${c.desc ? `<div class="ach-desc">${c.desc}</div>` : ''}
        ${box ? `<div class="ach-reward"><img src="${box.img}"> +1 ${box.name}</div>` : ''}
      </div>`);
    if (big) {
      this.flash('#ffd23f', 0.35);
      this.confettiRain(130);
      this.fanfare(3);
      const { pet } = app;
      pet.emit('achievement', { name: c.name });
      if (!pet.toyPlay) app.antics?.tryStart('hops');
      dollReact(app, '🏆', 'cheer', 2.2);
    } else {
      this.fanfare(1);
      app.pet.emit('missionDone', { name: c.name });
      const r = pop.getBoundingClientRect();
      this.burst(r.left + 40, r.top + 40, 30, 350);
    }
    const dur = big ? (this.popups.length > 1 ? 3000 : 4600) : 3000;
    setTimeout(() => pop.classList.add('out'), dur);
    setTimeout(() => {
      pop.remove();
      this.nextPopup();
    }, dur + 450);
  }

  // ---------- particles ----------

  burst(x, y, n, speed, colors = CONFETTI) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2);
      const v = rand(0.3, 1) * speed;
      this.parts.push({ type: 'confetti', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - speed * 0.4, w: rand(5, 10), h: rand(3, 6), rot: rand(0, 6), vr: rand(-12, 12), color: pick(colors), life: rand(1.6, 2.8), t: 0 });
    }
  }

  confettiRain(n) {
    for (let i = 0; i < n; i++) {
      this.parts.push({ type: 'confetti', x: rand(0, innerWidth), y: rand(-200, -10), vx: rand(-40, 40), vy: rand(80, 260), w: rand(6, 11), h: rand(3, 6), rot: rand(0, 6), vr: rand(-10, 10), color: pick(CONFETTI), life: rand(3, 4.5), t: -rand(0, 1) });
    }
  }

  rain(ch, n, colors) {
    const { pet } = this.app;
    for (let i = 0; i < n; i++) {
      this.parts.push({ type: 'glyph', ch, x: pet.x + rand(-pet.P, pet.P), y: pet.y - pet.P * rand(1.2, 2.2), vx: rand(-15, 15), vy: rand(30, 70), size: rand(12, 24), color: pick(colors), life: rand(2.5, 4), t: -rand(0, 1.5) });
    }
  }

  fireworks(n) {
    const { sound } = this.app;
    for (let i = 0; i < n; i++) {
      setTimeout(() => {
        const x = rand(innerWidth * 0.15, innerWidth * 0.85);
        this.parts.push({ type: 'rocket', x, y: innerHeight, vx: rand(-40, 40), vy: -rand(innerHeight * 0.8, innerHeight * 1.1), ty: rand(innerHeight * 0.15, innerHeight * 0.45), color: pick(CONFETTI.slice(0, 6)), life: 4, t: 0 });
        sound.tone8(300, 900, 0.3, 'triangle', 0.03);
      }, i * rand(250, 550));
    }
  }

  explode(r) {
    this.app.sound.tone8(120, 40, 0.3, 'sawtooth', 0.06);
    for (let i = 0; i < 70; i++) {
      const a = (i / 70) * Math.PI * 2;
      const v = rand(120, 260);
      this.parts.push({ type: 'spark', x: r.x, y: r.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, color: Math.random() < 0.2 ? '#ffffff' : r.color, life: rand(1.1, 1.8), t: 0 });
    }
  }

  flash(color, alpha = 0.5) {
    const f = el('loot-flash', document.body);
    f.style.background = color;
    f.style.setProperty('--a', alpha);
    setTimeout(() => f.remove(), 700);
  }

  // ---------- frame ----------

  update(dt, hidden) {
    const { app } = this;
    const p = this.profile;
    this.checkT -= dt;
    if (this.checkT <= 0) {
      this.checkT = 2;
      this.checkAchievements();
      const d = this.daily();
      for (const m of d.list) {
        const def = MISSIONS[m.id];
        if (m.done || !def.time) continue;
        if (def.time(app)) m.s = (m.s || 0) + 2;
        const n = Math.floor((m.s || 0) / 60);
        if (n !== m.n) {
          m.n = n;
          if (n >= m.goal) this.completeMission(m);
        }
      }
    }
    const now = Date.now();
    const head = app.head;
    const show = !hidden && head && !app.pet.dead;
    // Crown on the head.
    const crown = show && (p.crownUntil || 0) > now;
    this.crownEl.style.display = crown ? 'block' : 'none';
    if (crown) {
      const s = Math.round(app.pet.P * 0.22);
      this.crownEl.style.width = `${s}px`;
      this.crownEl.style.transform = `translate(${Math.round(head.x - s / 2)}px, ${Math.round(head.y - s * 1.15)}px) rotate(${app.pet.tilt * 57}deg)`;
    }
    // Rainbow hue cycling on the pet.
    document.getElementById('pet')?.classList.toggle('rainbow', !hidden && (p.rainbowUntil || 0) > now);
    // Fireflies around the pet.
    if (show && (p.firefliesUntil || 0) > now && this.parts.filter((q) => q.type === 'firefly').length < 10 && Math.random() < dt * 4) {
      this.parts.push({ type: 'firefly', x: head.x + rand(-80, 80), y: head.y + rand(-60, 80), vx: 0, vy: 0, ph: rand(0, 6), life: rand(3, 6), t: 0 });
    }
    this.draw(dt, hidden);
  }

  draw(dt, hidden) {
    const { canvas, ctx } = this;
    if (!this.parts.length && !this.drawn) return;
    const dpr = devicePixelRatio || 1;
    if (canvas.width !== Math.round(innerWidth * dpr) || canvas.height !== Math.round(innerHeight * dpr)) {
      canvas.width = Math.round(innerWidth * dpr);
      canvas.height = Math.round(innerHeight * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    this.drawn = this.parts.length > 0;
    const next = [];
    for (const q of this.parts) {
      q.t += dt;
      if (q.t < 0) {
        next.push(q);
        continue;
      }
      if (q.t >= q.life) {
        if (q.type === 'rocket') this.explode(q);
        continue;
      }
      const fade = Math.min(1, (q.life - q.t) / 0.6);
      switch (q.type) {
        case 'confetti':
          q.vx *= 1 - dt * 1.5;
          q.vy += 520 * dt;
          q.vy = Math.min(q.vy, 260);
          q.rot += q.vr * dt;
          break;
        case 'spark':
          q.vx *= 1 - dt * 1.8;
          q.vy = q.vy * (1 - dt * 1.8) + 90 * dt;
          break;
        case 'bubble':
          q.vx += Math.sin(q.t * 3 + q.r) * 20 * dt;
          break;
        case 'glyph':
          q.vx = Math.sin(q.t * 2 + q.size) * 20;
          break;
        case 'rocket':
          q.vy += innerHeight * 0.55 * dt;
          if (q.y <= q.ty || q.vy >= 0) {
            this.explode(q);
            continue;
          }
          break;
        case 'firefly':
          q.vx = Math.sin(q.t * 1.3 + q.ph) * 25;
          q.vy = Math.cos(q.t * 1.1 + q.ph * 2) * 18;
          break;
        case 'ring':
          q.r += q.vr * dt * (1 - q.t / q.life);
          break;
        case 'badge':
          q.vy *= 1 - dt * 1.6;
          if (this.app.head) q.x = this.app.head.x;
          break;
      }
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      if (hidden) {
        next.push(q);
        continue;
      }
      ctx.globalAlpha = fade;
      if (q.type === 'confetti') {
        ctx.save();
        ctx.translate(q.x, q.y);
        ctx.rotate(q.rot);
        ctx.scale(1, Math.cos(q.t * 9 + q.rot));
        ctx.fillStyle = q.color;
        ctx.fillRect(-q.w / 2, -q.h / 2, q.w, q.h);
        ctx.restore();
      } else if (q.type === 'spark' || q.type === 'rocket') {
        ctx.fillStyle = q.color;
        ctx.shadowColor = q.color;
        ctx.shadowBlur = 8;
        ctx.fillRect(q.x - 2, q.y - 2, 4, q.type === 'rocket' ? 10 : 4);
        ctx.shadowBlur = 0;
      } else if (q.type === 'bubble') {
        ctx.strokeStyle = 'rgba(190,235,255,0.9)';
        ctx.fillStyle = 'rgba(190,235,255,0.15)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(q.x, q.y, q.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.fillRect(q.x - q.r * 0.45, q.y - q.r * 0.5, 2, 2);
      } else if (q.type === 'glyph') {
        ctx.fillStyle = q.color;
        ctx.font = `${q.size}px PxEmoji, sans-serif`;
        ctx.fillText(q.ch, q.x, q.y);
      } else if (q.type === 'rise') {
        ctx.fillStyle = q.color;
        ctx.shadowColor = q.color;
        ctx.shadowBlur = 10;
        ctx.fillRect(Math.round(q.x - 1.5), Math.round(q.y - 6), 3, 12);
        ctx.shadowBlur = 0;
      } else if (q.type === 'ring') {
        ctx.strokeStyle = q.color;
        ctx.shadowColor = q.color;
        ctx.shadowBlur = 12;
        ctx.lineWidth = Math.max(1, 5 * fade);
        ctx.beginPath();
        ctx.ellipse(q.x, q.y, q.r, q.r * 0.3, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
      } else if (q.type === 'badge') {
        const k = Math.min(1, q.t / 0.2);
        const pop = k < 1 ? k * 1.25 : 1 + Math.max(0, 0.25 - (q.t - 0.2) * 1.5);
        ctx.save();
        ctx.textAlign = 'center';
        ctx.font = `${Math.round(48 * pop)}px PxEmoji, sans-serif`;
        ctx.shadowColor = q.color;
        ctx.shadowBlur = 16;
        ctx.fillText(q.ch, q.x, q.y);
        ctx.shadowBlur = 0;
        ctx.lineJoin = 'round';
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#1a1020';
        ctx.font = `bold ${Math.round(18 * Math.min(1, pop))}px PxEmoji, system-ui, sans-serif`;
        ctx.strokeText('POWER UP!', q.x, q.y - 54);
        ctx.fillStyle = q.color;
        ctx.fillText('POWER UP!', q.x, q.y - 54);
        ctx.font = 'bold 13px PxEmoji, system-ui, sans-serif';
        ctx.strokeText(q.text, q.x, q.y + 20);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(q.text, q.x, q.y + 20);
        ctx.restore();
      } else if (q.type === 'firefly') {
        const glow = 0.5 + 0.5 * Math.sin(q.t * 5 + q.ph);
        ctx.globalAlpha = fade * (0.3 + glow * 0.7);
        ctx.fillStyle = '#eaff7a';
        ctx.shadowColor = '#d4ff3a';
        ctx.shadowBlur = 12;
        ctx.fillRect(q.x - 2, q.y - 2, 4, 4);
        ctx.shadowBlur = 0;
      }
      next.push(q);
    }
    ctx.globalAlpha = 1;
    this.parts = next;
  }
}

const FORTUNES = [
  'A sorte sorri para quem faz cafuné.',
  'Uma caixa lendária está no seu futuro...',
  'Hoje é um ótimo dia para um lanchinho.',
  'Quem brinca junto, fica junto!',
  'Um cartucho perdido vai te encontrar.',
  'Sua paciência será recompensada em moedas.',
  'Grandes aventuras começam com um bocejo.',
  'Alguém está pensando em você agora mesmo.',
];
