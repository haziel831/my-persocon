// Weapon / toy skills she trains (profile.skills) and the moves unlocked by level.
// Level 1..10; the XP curve is deliberately slow, so the moves are earned over many sessions.
// The unarmed skill is the melee system: its moves use the YSM combat clips (combatanims.js).
// The weapon skills stay in the catalog but have no combat use for now.

export const SKILL_DEFS = {
  unarmed: {
    name: 'Desarmado', icon: '👊', art: 'Combate Corpo a Corpo',
    moves: [],
  },
  espada: {
    name: 'Espada de bamboo', icon: '🗡️', art: 'Espadas',
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
    name: 'Syntoyo', icon: '🪀', art: 'Syntoyo',
    moves: [
      { id: 'chicote', name: 'Chicote neon', lvl: 1, dmg: 8, clip: 'yoyo_chicote' },
      { id: 'orbita', name: 'Órbita laser', lvl: 3, dmg: 11, clip: 'yoyo_orbita' },
      { id: 'piao', name: 'Pião estelar', lvl: 5, dmg: 14, clip: 'yoyo_piao' },
      { id: 'serpente', name: 'Serpente de luz', lvl: 7, dmg: 18, clip: 'yoyo_serpente' },
      { id: 'supernova', name: 'Supernova', lvl: 9, dmg: 24, clip: 'yoyo_supernova' },
    ],
  },
  queimada: {
    name: 'Bola de queimada', icon: '🏀', art: 'Arremesso',
    moves: [
      { id: 'reto', name: 'Arremesso reto', lvl: 1, dmg: 7, clip: 'queimada_reto' },
      { id: 'curva', name: 'Curva', lvl: 3, dmg: 10, clip: 'queimada_curva' },
      { id: 'alto', name: 'Arco alto', lvl: 5, dmg: 13, clip: 'queimada_alto' },
      { id: 'giro', name: 'Com giro', lvl: 7, dmg: 17, clip: 'queimada_giro' },
      { id: 'foguete', name: 'Foguete', lvl: 9, dmg: 21, clip: 'queimada_foguete' },
    ],
  },
};

// The order the martial arts show up in the Combat panel (only the ones she knows).
export const COMBAT_ARTS = ['unarmed', 'espada', 'queimada', 'syntoyo'];

// The unarmed moves of the melee system. Each one unlocks with the Combat Skill Level:
//   1 → jab + guarda · 3 → cross · 5 → passo evasivo · 7 → uppercut · 8 → gancho pesado
//   9 → chute alto · 10 → chute circular
// Every strike has its OWN clip (combatanims.js): jab, cross, uppercut, hook, high kick,
// roundhouse and the dropkick of the maneuvers.
export const COMBAT_MOVES = [
  { id: 'jab', name: 'Jab direto', lvl: 1, dmg: 4, clip: 'attack_jab', kind: 'attack' },
  { id: 'guard', name: 'Guarda básica', lvl: 1, dmg: 0, clip: 'combat_block', kind: 'defend' },
  { id: 'cross', name: 'Cross da direita', lvl: 3, dmg: 8, clip: 'attack_cross', kind: 'attack' },
  { id: 'step', name: 'Passo evasivo', lvl: 5, dmg: 0, clip: 'combat_dodge_step', kind: 'dodge' },
  { id: 'upper', name: 'Uppercut pesado', lvl: 7, dmg: 13, clip: 'attack_uppercut', kind: 'attack' },
  { id: 'hook', name: 'Gancho pesado', lvl: 8, dmg: 15, clip: 'attack_hook', kind: 'attack' },
  { id: 'kick', name: 'Chute alto', lvl: 9, dmg: 16, clip: 'attack_high_kick', kind: 'attack' },
  { id: 'round', name: 'Chute circular', lvl: 10, dmg: 18, clip: 'attack_roundhouse_kick', kind: 'attack' },
];
SKILL_DEFS.unarmed.moves = COMBAT_MOVES;

// Cumulative XP to reach each level (index = level). Level 1 = 0.
// The curve is slow on purpose: the moves have to be earned over many training sessions.
const XP_AT = [0, 0, 60, 150, 270, 430, 630, 880, 1180, 1530, 1950];
// Level 10 needs ~1950 XP (a dummy session gives ~13 XP: ~150 sessions).

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

// Did she already train this art? The unarmed basics are with her from the start; the weapon
// arts only show up once she has actually trained them.
export function skillStarted(id, xp) {
  if (id === 'unarmed') return true;
  return (xp || 0) > 0;
}

// The melee moves unlocked at this Combat Skill Level (the combat system only uses these).
export function combatMoves(xp) {
  return skillMoves('unarmed', xp);
}

export function skillPick(id, xp) {
  const list = skillMoves(id, xp);
  return list[Math.floor(Math.random() * list.length)] || null;
}

// Solo practice is slow; the training dummy gives more XP, the sparring more still and a
// real fight (the horde) the most — a real battle teaches what no dummy can.
export function skillGain(kind = 'solo') {
  if (kind === 'battle') return 2.4 + Math.random() * 1.4;
  if (kind === 'sparring') return 1.6 + Math.random() * 1.2;
  return kind === 'dummy' ? 0.8 + Math.random() * 0.6 : 0.12 + Math.random() * 0.12;
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
