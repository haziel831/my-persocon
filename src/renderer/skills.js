// Weapon / toy skills she trains (profile.skills) and the moves unlocked by level.
// Level 1..10; XP curves are steep so she does not rank up in one session.
// Clip names use a combat prefix: melee_ / espada_ / yoyo_ / queimada_

export const SKILL_DEFS = {
  unarmed: {
    name: 'Desarmado', icon: '👊',
    moves: [
      { id: 'guard', name: 'Guarda amadora', lvl: 1, dmg: 2, clip: 'melee_guarda' },
      { id: 'jab', name: 'Soco direto', lvl: 2, dmg: 4, clip: 'melee_soco' },
      { id: 'step', name: 'Passo + jab', lvl: 3, dmg: 5, clip: 'melee_passo' },
      { id: 'hook', name: 'Gancho', lvl: 4, dmg: 7, clip: 'melee_gancho' },
      { id: 'kick', name: 'Chute baixo', lvl: 5, dmg: 9, clip: 'melee_chute' },
      { id: 'combo', name: 'Combo de 2', lvl: 6, dmg: 12, clip: 'melee_combo' },
      { id: 'elbow', name: 'Cotovelada', lvl: 7, dmg: 14, clip: 'melee_soco' },
      { id: 'round', name: 'Chute circular', lvl: 8, dmg: 16, clip: 'melee_chute' },
      { id: 'upper', name: 'Uppercut', lvl: 9, dmg: 18, clip: 'melee_upper' },
      { id: 'flurry', name: 'Rajada amadora', lvl: 10, dmg: 22, clip: 'melee_combo' },
    ],
  },
  espada: {
    name: 'Espada de bamboo', icon: '🗡️',
    moves: [
      { id: 'kamae', name: 'Kamae (guarda)', lvl: 1, dmg: 3, clip: 'espada_guarda' },
      { id: 'men', name: 'Men (cabeça)', lvl: 2, dmg: 7, clip: 'espada_men' },
      { id: 'kote', name: 'Kote (punho)', lvl: 3, dmg: 8, clip: 'espada_kote' },
      { id: 'do', name: 'Do (tronco)', lvl: 4, dmg: 10, clip: 'espada_do' },
      { id: 'tsuki', name: 'Tsuki (estocada)', lvl: 5, dmg: 12, clip: 'espada_tsuki' },
      { id: 'nuki', name: 'Nuki-men', lvl: 6, dmg: 14, clip: 'espada_nuki' },
      { id: 'renzoku', name: 'Renzoku-waza', lvl: 7, dmg: 17, clip: 'espada_men' },
      { id: 'kaeshi', name: 'Kaeshi-do', lvl: 8, dmg: 19, clip: 'espada_do' },
      { id: 'debana', name: 'Debana-kote', lvl: 9, dmg: 21, clip: 'espada_kote' },
      { id: 'ippon', name: 'Ippon final', lvl: 10, dmg: 26, clip: 'espada_nuki' },
    ],
  },
  syntoyo: {
    name: 'Syntoyo', icon: '🪀',
    moves: [
      { id: 'chicote', name: 'Chicote neon', lvl: 1, dmg: 8, clip: 'yoyo_chicote' },
      { id: 'orbita', name: 'Órbita laser', lvl: 3, dmg: 11, clip: 'yoyo_orbita' },
      { id: 'piao', name: 'Pião estelar', lvl: 5, dmg: 14, clip: 'yoyo_piao' },
      { id: 'serpente', name: 'Serpente de luz', lvl: 7, dmg: 18, clip: 'yoyo_serpente' },
      { id: 'supernova', name: 'Supernova', lvl: 9, dmg: 24, clip: 'yoyo_supernova' },
    ],
  },
  queimada: {
    name: 'Bola de queimada', icon: '🏀',
    moves: [
      { id: 'reto', name: 'Arremesso reto', lvl: 1, dmg: 7, clip: 'queimada_reto' },
      { id: 'curva', name: 'Curva', lvl: 3, dmg: 10, clip: 'queimada_curva' },
      { id: 'alto', name: 'Arco alto', lvl: 5, dmg: 13, clip: 'queimada_alto' },
      { id: 'giro', name: 'Com giro', lvl: 7, dmg: 17, clip: 'queimada_giro' },
      { id: 'foguete', name: 'Foguete', lvl: 9, dmg: 21, clip: 'queimada_foguete' },
    ],
  },
};

// Cumulative XP to reach each level (index = level). Level 1 = 0.
const XP_AT = (() => {
  const a = [0, 0];
  let sum = 0;
  for (let lvl = 2; lvl <= 10; lvl++) {
    sum += 18 + (lvl - 2) * 22; // 18, 40, 62, 84… between levels
    a[lvl] = sum;
  }
  return a;
})();
// Level 10 needs ~XP_AT[10] ≈ 666 XP (~150+ dummy hits).

export const skillLevel = (xp) => {
  const v = Math.max(0, xp || 0);
  let lvl = 1;
  for (let i = 2; i <= 10; i++) {
    if (v >= XP_AT[i]) lvl = i;
    else break;
  }
  return lvl;
};

export const skillXpFor = (lvl) => XP_AT[Math.min(10, Math.max(1, lvl))] || 0;

export function skillMoves(id, xp) {
  const def = SKILL_DEFS[id];
  if (!def) return [];
  const lvl = skillLevel(xp);
  return def.moves.filter((m) => m.lvl <= lvl);
}

export function skillPick(id, xp) {
  const list = skillMoves(id, xp);
  return list[Math.floor(Math.random() * list.length)] || null;
}

// Solo practice is slow; the training dummy gives more XP (still paced).
export function skillGain(kind = 'solo') {
  return kind === 'dummy' ? 0.45 + Math.random() * 0.35 : 0.12 + Math.random() * 0.12;
}

// Portable toys/gear she can carry (furniture and the Doll stay on the desktop).
export const BAG_ITEMS = new Set([
  'gancho', 'syntoyo', 'ioio', 'espada', 'bola', 'bola_volei', 'bola_basquete', 'bola_queimada',
  'gameboy', 'gamegear', 'psp', 'microfone',
  'bambole', 'pipa', 'cubo', 'skate', 'camera', 'robo', 'tamagotchi',
]);

export const BAG_SHOP = {
  bolsa_p: { slots: 3, name: 'Bolsa pequena', price: 120 },
  bolsa_m: { slots: 6, name: 'Bolsa média', price: 280 },
  bolsa_g: { slots: 9, name: 'Bolsa grande', price: 520 },
};

export function bagCapacity(profile) {
  return Math.max(1, profile.bagSize || 1);
}
