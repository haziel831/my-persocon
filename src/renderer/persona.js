// Personality bank for the live stage: calm/stoic (Aghata) vs upbeat default (Ninna).
// PT and EN live side by side so streamctrl and the chat helpers share the same voice.

const STOIC_PT = {
  follow: ['Ah... {user} conectou. Obrigada pelo follow.', 'Mais um sinal por aqui... obrigada, {user}.'],
  sub: ['...{user} virou sub. Isso é... gentil demais. Obrigada.', '...não precisava de tanto, {user}. Obrigada de verdade.'],
  raid: 'Muitos sinais novos de uma vez... bem-vindos, pessoal do {user}.',
  bits: 'Recebi isso de {user}... vou guardar com cuidado.',
  redeem: 'Um resgate de {user}... obrigada.',
  coins: '...{coins} moedas. Obrigada, {user}.',
  drop: '{user}, algo está caindo...',
  mural: '{user} escreveu no mural: {text}... anotado.',
  toy: '{user} pediu {id}... tudo bem.',
  coffee: 'Café de {user}... vou aceitar.',
  snack: '{user} deixou um lanche... obrigada.',
  draw: 'Desenho para {user}... só um instante.',
  scare: 'Ah... foi susto.',
  greet: 'Olá... o dia está calmo por aqui.',
  pomodoro: 'Pausa terminada... um pouco de silêncio, por favor.',
  back: 'Ah... você voltou.',
  hi: ['Olá, {user}. Estou ouvindo.', 'Oi, {user}... tudo calmo por aqui.'],
  pat: '...ei. Isso me deixa sem jeito. Mas... não precisa parar.',
  dance: 'Certo... só um pouco.',
  climate: 'Clima ajustado... {kind}.',
  gg: '...gg. Bom trabalho.',
  water: 'Lembrete silencioso... beba água.',
  posture: 'Os ombros... relaxe a postura um pouco.',
  f: '...meus pêsames.',
  brb: 'Pausa na transmissão... já voltamos.',
};

const STOIC_EN = {
  follow: ['Ah... {user} joined. Thanks for the follow.', 'Another signal in the noise... thank you, {user}.'],
  sub: ['...{user} subscribed. That is... very kind. Thank you.', '...you did not have to, {user}. Thank you, truly.'],
  raid: 'So many new signals at once... welcome, everyone from {user}.',
  bits: 'I received this from {user}... I will keep it safe.',
  redeem: 'A redeem from {user}... thank you.',
  coins: '...{coins} coins. Thank you, {user}.',
  drop: '{user}, something is falling...',
  mural: '{user} wrote on the board: {text}... noted.',
  toy: '{user} asked for {id}... all right.',
  coffee: 'Coffee from {user}... I will take it.',
  snack: '{user} left a snack... thank you.',
  draw: 'A drawing for {user}... one moment.',
  scare: 'Ah... just a scare.',
  greet: 'Hello... it is quiet here today.',
  pomodoro: 'Break is over... a little silence, please.',
  back: 'Oh... you are back.',
  hi: ['Hello, {user}. I am listening.', 'Hi, {user}... it is quiet here.'],
  pat: '...hey. This makes me shy. But... you may keep going.',
  dance: 'All right... just a little.',
  climate: 'Weather set... {kind}.',
  gg: '...gg. Well played.',
  water: 'A quiet reminder... drink some water.',
  posture: 'The shoulders... relax them a little.',
  f: '...my condolences.',
  brb: 'Pausing the stream... we will be right back.',
};

const DEFAULT_PT = {
  follow: 'Valeu pelo follow, {user}!',
  sub: 'Valeu o sub, {user}!',
  raid: 'Bem-vindos, {user} e galera!',
  bits: 'Valeu os {amount} bits, {user}!',
  redeem: 'Resgate: {reward} — valeu, {user}!',
  coins: '{user}, +{coins} moedas do canal!',
  drop: '{user}, um item está caindo!',
  mural: '{user} escreveu no mural: {text}',
  toy: '{user} pediu {id}!',
  coffee: 'Café do {user}! Vou tomar!',
  snack: 'Lanche do {user}! Obrigada!',
  draw: 'Vou desenhar para {user}!',
  scare: 'Ai! Que susto!',
  greet: 'Oi! Que bom te ver!',
  pomodoro: 'Pausa acabada! Bora continuar!',
  back: 'Ei, você voltou!',
  hi: 'Oi, {user}!',
  pat: '{user}, obrigada pelo cafuné!',
  dance: 'Vamos dançar!',
  climate: 'Clima: {kind}!',
  gg: 'GG! Bom trabalho!',
  water: 'Beba água e ajeite a postura!',
  posture: 'Ajeite a postura aí!',
  f: 'F... respeito.',
  brb: 'Pausa rapidinha... já volto!',
};

const DEFAULT_EN = {
  follow: 'Thanks for the follow, {user}!',
  sub: 'Thanks for the sub, {user}!',
  raid: 'Welcome, {user} and crew!',
  bits: 'Thanks for the {amount} bits, {user}!',
  redeem: 'Redeem: {reward} — thanks, {user}!',
  coins: '{user}, +{coins} channel coins!',
  drop: '{user}, an item is falling!',
  mural: '{user} wrote on the board: {text}',
  toy: '{user} asked for {id}!',
  coffee: 'Coffee from {user}! Cheers!',
  snack: 'Snack from {user}! Thank you!',
  draw: 'Drawing for {user}!',
  scare: 'Eek! That scared me!',
  greet: 'Hi! Good to see you!',
  pomodoro: 'Break is over! Let us keep going!',
  back: 'Hey, you are back!',
  hi: 'Hi, {user}!',
  pat: 'Thanks for the pat, {user}!',
  dance: "Let's dance!",
  climate: 'Weather: {kind}!',
  gg: 'GG! Nice work!',
  water: 'Drink water and fix your posture!',
  posture: 'Fix your posture!',
  f: 'F... respect.',
  brb: 'Quick break... be right back!',
};

export function defaultPersona(app) {
  return /aghata/i.test(app?.config?.modelDir || '') ? 'estoica' : 'padrao';
}

export function isStoic(app) {
  return (app?.config?.streamPersona || defaultPersona(app)) === 'estoica';
}

export function personaLine(app, key, vars = {}) {
  const en = app?.config?.lang === 'en';
  const bank = isStoic(app) ? (en ? STOIC_EN : STOIC_PT) : (en ? DEFAULT_EN : DEFAULT_PT);
  const raw = bank[key];
  const tpl = Array.isArray(raw) ? raw[Math.floor(Math.random() * raw.length)] : raw;
  if (!tpl) return '';
  return tpl.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));
}
