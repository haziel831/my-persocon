// Como cada atividade treina os atributos (Força e Constituição).
//
// Os valores são de XP por evento: o save guarda o XP acumulado de cada atributo e o nível
// sai dele (nível 2 = 25 XP, nível 3 = 100 XP, nível 10 = 2025 XP).
//
// Força (str)
//   dummy   — um golpe acertado no Boneco de Treino (treino normal)
//   heavy   — um golpe acertado numa luta de verdade (Treino Pesado / Unknown)
//   session — terminar uma sessão de Treino Pesado
//   climb   — por segundo escalando a janela
//   throw   — um arremesso da Bola de Queimada
//   catch   — pegar a Bola de Queimada
//
// Constituição (con)
//   energy  — por Energia gasta (de leve, o gasto do dia a dia)
//   turn    — um turno de treino no boneco
//   hurt    — por ponto de Saúde perdido numa luta de verdade (a parte forte)
//
// Agilidade (agi)
//   tramp   — um pulo no pula-pula (o up do Synthwave rende mais)
//   flip    — um flip/twist no ar do pula-pula
//   run     — por segundo correndo de verdade (pega-pega, perseguição)
//   ball    — arremessar/pegar a Bola de Queimada
//   hook    — um disparo bem-sucedido do gancho
//   hoop    — por segundo rodando o bambolê
//   skate   — por segundo de skate
//   session — terminar uma sessão de Treino Pesado
//   catch   — ela pegar o cursor no pega-pega
//   escape  — o jogador escapar do QTE do pega-pega
// Destreza (dex)
//   dodge   — esquivar no combate
//   block   — bloquear no combate
//
// Inteligência (int)
//   manga   — terminar a leitura de um mangá na estante
//   desk    — estudar na Escrivaninha com Abajur
//   focus   — concluir um bloco de foco (Pomodoro)
export const ATTR_XP = {
  str: {
    dummy: 1.5,
    heavy: 4,
    session: 15,
    climb: 0.3,
    throw: 1.2,
    catch: 0.8,
  },
  con: {
    energy: 0.12,
    turn: 1,
    hurt: 0.5,
  },
  agi: {
    tramp: 0.5,
    flip: 0.3,
    run: 0.2,
    ball: 0.6,
    hook: 0.8,
    hoop: 0.15,
    skate: 0.4,
    session: 10,
    catch: 2,
    escape: 2,
  },
  dex: {
    dodge: 0.4,
    block: 0.2,
    target: 0.8,
    arcade: 1.2,
  },
  int: {
    manga: 1.5,
    desk: 2,
    focus: 6,
    console: 1.2,
    consolePro: 2,
  },
  cha: {
    aquario: 0.8,
    aquarioUp: 1.4,
    emote: 0.4,
    music: 0.6,
    teach: 1,
    social: 0.5,
  },
  per: {
    target: 0.8,
    arcade: 1.2,
    weather: 0.3,
  },
};

// Carisma acelera o ensino de outros personagens (Corvo, Doll): XP e duração da sessão.
export function teachSpeedMul(game) {
  const lvl = game?.attrLevel?.('cha') || 1;
  return Math.min(2.2, 1 + (lvl - 1) * 0.12);
}

// Reading a manga trains Inteligência by its rarity: rarer volumes teach more.
export const MANGA_RARITY_XP = {
  comum: 1,
  incomum: 1.5,
  raro: 2.2,
  epico: 3,
  lendario: 4,
};

// De onde veio o XP (o log mostra: "+4 XP em Força (Treino Pesado)").
export const ATTR_SOURCES = {
  climb: 'Escalada',
  ball: 'Bola de queimada',
  dummy: 'Boneco de Treino',
  heavy: 'Treino Pesado',
  unknown: 'Unknown',
  energy: 'Energia',
  tramp: 'Pula-pula',
  run: 'Correr',
  hook: 'Gancho',
  hoop: 'Bambolê',
  skate: 'Skate',
  dodge: 'Esquiva',
  catch: 'Pega-pega',
  escape: 'Pega-pega',
  manga: 'Mangá',
  desk: 'Escrivaninha',
  focus: 'Foco',
  console: 'Videogame',
  consolePro: 'Videogame Neon',
  target: 'Alvo',
  arcade: 'Arcade de Tiro',
  aquario: 'Aquário',
  aquarioUp: 'Aquário de Koi',
  emote: 'Emote',
  music: 'Música',
  teach: 'Ensino',
  social: 'Social',
  weather: 'Clima',
};

// O XP em que o nível começa.
export const attrXpFor = (lvl) => 25 * Math.pow(Math.max(0, lvl - 1), 2);

// O nível, o quanto já andou e o quanto falta para o próximo (a barra do perfil).
export function attrProgress(xp) {
  const v = Math.max(0, xp || 0);
  let lvl = 1;
  for (let i = 2; i <= 10; i++) {
    if (v >= attrXpFor(i)) lvl = i;
    else break;
  }
  if (lvl >= 10) return { lvl: 10, cur: 1, need: 0, max: 1, done: true };
  const base = attrXpFor(lvl);
  const need = attrXpFor(lvl + 1);
  return { lvl, cur: v - base, need, max: need - base, done: false };
}
