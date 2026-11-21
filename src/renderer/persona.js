// Personality bank for the live stage: calm/stoic (Aghata) vs upbeat default (Ninna).
// PT and EN live side by side so streamctrl and the chat helpers share the same voice.

const STOIC_PT = {
  follow: [
    'Ah... {user} conectou. Obrigada pelo follow.',
    'Mais um sinal por aqui... obrigada, {user}.',
    '...{user} agora acompanha este canal. Bem-vindo.',
    'Sinal estável de {user}. Obrigada por ficar.',
    'Anotei sua presença, {user}... obrigada pelo follow.',
    'O ruído diminuiu um pouco... {user} chegou.',
    'Obrigada pelo follow, {user}. Fique à vontade no silêncio.',
  ],
  sub: [
    '...{user} virou sub. Isso é... gentil demais. Obrigada.',
    '...não precisava de tanto, {user}. Obrigada de verdade.',
    'Um vínculo novo com {user}... agradeço muito o sub.',
    '{user} apoiou o canal... vou guardar esse gesto.',
    'Luzes demais de repente... mas obrigada pelo sub, {user}.',
    'Sinal forte de {user}. Obrigada por se inscrever.',
    '...obrigada pelo sub, {user}. Significa bastante.',
  ],
  raid: [
    'Muitos sinais novos de uma vez... bem-vindos, pessoal do {user}.',
    '{user} trouxe uma raid... fiquem à vontade por aqui.',
    'A sala encheu de repente... obrigada pela raid, {user}.',
    'Conexão recebida de {user} e sua galera... sejam bem-vindos.',
    'Mais vozes na rede... obrigada pela raid, {user}.',
    'Ah... {user} apareceu com todo mundo. Bem-vindos.',
    'Obrigada por trazer o pessoal até aqui, {user}.',
  ],
  bits: [
    'Recebi {amount} bits de {user}... vou guardar com cuidado.',
    '...{amount} bits, {user}? Obrigada pela gentileza.',
    'Pequenos fragmentos dourados de {user}... obrigada pelos {amount} bits.',
    '{user} enviou {amount} bits... agradeço em silêncio.',
    'Sinal brilhante: {amount} bits de {user}. Obrigada.',
    'Não precisava gastar {amount} bits comigo, {user}... mas obrigada.',
    'Obrigada pelos {amount} bits, {user}. Vou lembrar disso.',
  ],
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
  follow: [
    'Ah... {user} joined. Thanks for the follow.',
    'Another signal in the noise... thank you, {user}.',
    '...{user} is following now. Welcome.',
    'Steady signal from {user}. Thank you for staying.',
    'I noted your presence, {user}... thanks for the follow.',
    'The static cleared a bit... {user} arrived.',
    'Thank you for following, {user}. Make yourself comfortable.',
  ],
  sub: [
    '...{user} subscribed. That is... very kind. Thank you.',
    '...you did not have to, {user}. Thank you, truly.',
    'A new link with {user}... I appreciate the sub.',
    '{user} supported the channel... I will remember that.',
    'So many lights all of a sudden... thank you for the sub, {user}.',
    'Strong signal from {user}. Thank you for subscribing.',
    '...thank you for the sub, {user}. It means a lot.',
  ],
  raid: [
    'So many new signals at once... welcome, everyone from {user}.',
    '{user} brought a raid... please make yourselves at home.',
    'The room filled up all at once... thanks for the raid, {user}.',
    'Incoming connection from {user} and crew... welcome.',
    'More voices on the network... thank you for the raid, {user}.',
    'Ah... {user} arrived with everyone. Welcome in.',
    'Thank you for bringing everyone over, {user}.',
  ],
  bits: [
    'I received {amount} bits from {user}... I will keep them safe.',
    '...{amount} bits, {user}? Thank you for your kindness.',
    'Little golden fragments from {user}... thanks for the {amount} bits.',
    '{user} sent {amount} bits... I thank you quietly.',
    'Bright signal: {amount} bits from {user}. Thank you.',
    'You did not need to spend {amount} bits, {user}... thank you.',
    'Thank you for the {amount} bits, {user}.',
  ],
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
  follow: [
    'Valeu pelo follow, {user}!',
    'Oba! {user} começou a seguir! Bem-vindo!',
    'Mais um amigo no palco! Obrigada pelo follow, {user}!',
    'Ebaaa! {user} chegou dando follow!',
    'Seja muito bem-vindo, {user}! Valeu pelo follow!',
    'Aee! Obrigada por seguir o canal, {user}!',
    '{user} entrou pro time! Valeu demais pelo follow!',
  ],
  sub: [
    'Valeu o sub, {user}!',
    'Uhuuu! {user} virou sub! Hora do show!',
    'Obrigada demais pelo sub, {user}! Você é incrível!',
    'Aee! {user} se inscreveu no canal! Festa no palco!',
    'Muito obrigada pelo apoio com o sub, {user}!',
    'Olha só, {user} agora é sub! Valeu mesmo!',
    'Sub novo! Obrigada de coração, {user}!',
  ],
  raid: [
    'Bem-vindos, {user} e galera!',
    'RAID! Valeu por trazer todo mundo, {user}!',
    'Olha quanta gente! Obrigada pela raid, {user}!',
    'Sejam bem-vindos, pessoal do {user}! Puxa uma cadeira!',
    'Aee! Chegou a tropa do {user}! Valeu pela raid!',
    'Que festa! Muito obrigada pela raid, {user}!',
    'Valeu {user} pela raid! Bora aproveitar a live!',
  ],
  bits: [
    'Valeu os {amount} bits, {user}!',
    'Chuva de moedas! Obrigada pelos {amount} bits, {user}!',
    'Uau! {user} mandou {amount} bits! Muito obrigada!',
    'Aee! {amount} bits brilhantes do {user}! Valeu!',
    'Obrigada pelo carinho e pelos {amount} bits, {user}!',
    '{user} jogou {amount} bits no palco! Valeu demais!',
    'Tlim-tlim! Obrigada pelos {amount} bits, {user}!',
  ],
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
  follow: [
    'Thanks for the follow, {user}!',
    'Yay! {user} just followed! Welcome!',
    'Another friend on stage! Thanks for following, {user}!',
    'Woohoo! {user} dropped a follow!',
    'Welcome in, {user}! Thanks for the follow!',
    'Awesome! Thanks for following the channel, {user}!',
    '{user} joined the crew! Thank you so much!',
  ],
  sub: [
    'Thanks for the sub, {user}!',
    'Woohoo! {user} just subscribed! Showtime!',
    'Thank you so much for the sub, {user}! You rock!',
    'Yay! {user} became a subscriber! Party on stage!',
    'Thank you for supporting the stream with a sub, {user}!',
    'Look at that, {user} is a sub now! Thanks!',
    'New sub! Thank you from the heart, {user}!',
  ],
  raid: [
    'Welcome, {user} and crew!',
    'RAID! Thanks for bringing everyone over, {user}!',
    'Look at all these people! Thanks for the raid, {user}!',
    'Welcome, {user} squad! Grab a seat!',
    'Yay! {user} and the whole crew arrived! Thanks for the raid!',
    'What a party! Thank you for the raid, {user}!',
    'Thanks {user} for the raid! Let us have fun!',
  ],
  bits: [
    'Thanks for the {amount} bits, {user}!',
    'Coin shower! Thanks for the {amount} bits, {user}!',
    'Whoa! {user} cheered {amount} bits! Thank you!',
    'Yay! {amount} shiny bits from {user}! Thanks!',
    'Thank you for the love and the {amount} bits, {user}!',
    '{user} tossed {amount} bits on stage! Thank you!',
    'Ka-ching! Thanks for the {amount} bits, {user}!',
  ],
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

const REACTIONS = {
  estoica: {
    pt: {
      follow: ['Ah... {user} conectou. Obrigada pelo follow.', 'Mais um sinal por aqui... obrigada, {user}.', 'Você apareceu... fico contente.', 'Seguiu o sinal até aqui. Obrigada, {user}.', 'Um nome novo... bem-vindo.', 'Olá, {user}. Estou ouvindo.', 'Parece que o canal cresceu... valeu.', 'Fico grata, {user}. De verdade.'],
      sub: ['...{user} virou sub. Isso é... gentil demais.', 'Não precisava de tanto, {user}. Obrigada.', 'Um sub... vou guardar isso com calma.', 'Seu apoio chegou até aqui. Obrigada, {user}.', 'Hmm... obrigada, {user}.', 'Isso é muita gentileza. Obrigada.', 'Vou lembrar deste momento.', 'Obrigada por ficar, {user}.'],
      raid: ['Muitos sinais novos de uma vez... bem-vindos, pessoal do {user}.', 'A sala ficou cheia... bem-vindos.', 'Trouxeram gente... obrigada, {user}.', 'Olá a todos... entrem sem pressa.', 'Uma chegada grande. Bem-vindos.', 'Sejam bem-vindos ao canal.', '...que movimento. Obrigada, {user}.', 'Fico feliz em ver vocês aqui.'],
      bits: ['Recebi isso de {user}... vou guardar com cuidado.', '{amount} bits... obrigada, {user}.', 'Isso veio com carinho. Obrigada.', 'Recebi sua mensagem, {user}.', 'Os bits chegaram... valeu.', 'Obrigada pelo apoio, {user}.', 'Vou guardar cada um deles.', 'Muita generosidade... obrigada.'],
    },
    en: {
      follow: ['Ah... {user} joined. Thanks for the follow.', 'Another signal in the noise... thank you, {user}.', 'You found your way here. Thank you.', 'A new name... welcome.', 'Hello, {user}. I am listening.', 'The channel grew a little... thank you.', 'I am glad you are here, {user}.', 'Thank you, truly.'],
      sub: ['...{user} subscribed. That is... very kind.', 'You did not have to, {user}. Thank you.', 'A sub... I will remember this.', 'Your support reached me. Thank you, {user}.', 'Hmm... thank you, {user}.', 'That is very generous. Thank you.', 'I will keep this moment.', 'Thank you for staying, {user}.'],
      raid: ['So many new signals at once... welcome, everyone from {user}.', 'The room got full... welcome, all.', 'You brought friends... thank you, {user}.', 'Hello everyone... come in slowly.', 'A big arrival. Welcome.', 'Welcome to the channel.', '...what a rush. Thank you, {user}.', 'I am glad to see you all here.'],
      bits: ['I received this from {user}... I will keep it safe.', '{amount} bits... thank you, {user}.', 'This came with care. Thank you.', 'I got your message, {user}.', 'The bits arrived... thank you.', 'Thank you for the support, {user}.', 'I will keep every one of them.', 'Such generosity... thank you.'],
    },
  },
  padrao: {
    pt: {
      follow: ['Valeu pelo follow, {user}!', 'Eba, {user} chegou!', 'Mais uma pessoa na galera! Oi, {user}!', 'Follow novo! Obra prima, {user}!', 'Que bom te ver por aqui, {user}!', 'Você entrou no time! Valeu!', 'Oi, {user}! Fico feliz!', 'Bem-vindo ao canal, {user}!'],
      sub: ['Valeu o sub, {user}!', 'Você é demais, {user}!', 'Sub novo! Show!', 'Obrigada pelo apoio, {user}!', 'Isso me deixa feliz, {user}!', 'Você arrasou, {user}!', 'Muito obrigada mesmo!', 'Vamos comemorar, galera!'],
      raid: ['Bem-vindos, {user} e galera!', 'Chegou gente! Oi, todo mundo!', 'Uma raid! Valeu, {user}!', 'A casa encheu! Bem-vindos!', 'Que chegada boa! Oi, galera!', 'Sejam bem-vindos ao canal!', 'Valeu por trazer todo mundo, {user}!', 'Bora comemorar juntos!'],
      bits: ['Valeu os {amount} bits, {user}!', '{amount} bits! Você é incrível!', 'Chegaram bits! Obrigada, {user}!', 'Isso é apoio de verdade! Valeu!', 'Uhuu, {amount} bits!', 'Obrigada pelo carinho, {user}!', 'Você me deixou feliz, {user}!', 'Bora gastar isso com alegria!'],
    },
    en: {
      follow: ['Thanks for the follow, {user}!', 'Yay, {user} is here!', 'More friends in the crowd! Hi, {user}!', 'New follow! You are the best, {user}!', 'Good to see you here, {user}!', 'You joined the team! Thanks!', 'Hi, {user}! So happy!', 'Welcome to the channel, {user}!'],
      sub: ['Thanks for the sub, {user}!', 'You are amazing, {user}!', 'New sub! Awesome!', 'Thanks for the support, {user}!', 'This makes me so happy, {user}!', 'You rocked it, {user}!', 'Thank you so much!', "Let's celebrate, everyone!"],
      raid: ['Welcome, {user} and crew!', 'We got company! Hi, everyone!', 'A raid! Thanks, {user}!', 'The place is packed! Welcome!', 'What a great arrival! Hi, all!', 'Welcome to the channel!', 'Thanks for bringing everyone, {user}!', "Let's celebrate together!"],
      bits: ['Thanks for the {amount} bits, {user}!', '{amount} bits! You are incredible!', 'Bits arrived! Thank you, {user}!', 'That is real support! Thanks!', 'Yay, {amount} bits!', 'Thanks for the love, {user}!', 'You made me so happy, {user}!', "Let's spend it joyfully!"],
    },
  },
};
const lastReaction = {};
export function randomReaction(app, type, vars = {}) {
  const who = isStoic(app) ? 'estoica' : 'padrao';
  const list = REACTIONS[who]?.[app?.config?.lang === 'en' ? 'en' : 'pt']?.[type] || [];
  if (!list.length) return '';
  let pickList = list;
  if (list.length > 1 && lastReaction[who + type] != null) {
    pickList = list.filter((_, i) => i !== lastReaction[who + type]);
  }
  const idx = Math.floor(Math.random() * pickList.length);
  lastReaction[who + type] = list.indexOf(pickList[idx]);
  return pickList[idx].replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));
}

export function defaultPersona(app) {
  return /aghata/i.test(app?.config?.modelDir || '') ? 'estoica' : 'padrao';
}

export function isStoic(app) {
  return (app?.config?.streamPersona || defaultPersona(app)) === 'estoica';
}

const lastPicked = new Map();

export function personaLine(app, key, vars = {}, opts = {}) {
  const en = app?.config?.lang === 'en';
  const stoic = isStoic(app);
  const bank = stoic ? (en ? STOIC_EN : STOIC_PT) : (en ? DEFAULT_EN : DEFAULT_PT);
  const raw = bank[key];
  let tpl;
  if (Array.isArray(raw)) {
    if (opts.simple || raw.length <= 1) {
      tpl = raw[0];
    } else {
      const slot = `${stoic ? 's' : 'd'}:${en ? 'en' : 'pt'}:${key}`;
      const prev = lastPicked.get(slot);
      let idx = Math.floor(Math.random() * raw.length);
      if (idx === prev) idx = (idx + 1 + Math.floor(Math.random() * (raw.length - 1))) % raw.length;
      lastPicked.set(slot, idx);
      tpl = raw[idx];
    }
  } else {
    tpl = raw;
  }
  if (!tpl) return '';
  return tpl.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));
}
