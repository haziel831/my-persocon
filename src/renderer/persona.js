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
  const en = app?.config?.lang === 'en';
  const id = getPersona(app);
  const list = PERSONA_BANKS[id]?.[en ? 'en' : 'pt']?.[type] || REACTIONS[id === 'estoica' ? 'estoica' : 'padrao']?.[en ? 'en' : 'pt']?.[type] || [];
  if (!list.length) return '';
  let pickList = list;
  const slot = `${id}:${en ? 'en' : 'pt'}:${type}`;
  if (list.length > 1 && lastReaction[slot] != null) {
    pickList = list.filter((_, i) => i !== lastReaction[slot]);
  }
  const idx = Math.floor(Math.random() * pickList.length);
  lastReaction[slot] = list.indexOf(pickList[idx]);
  const all = { doll: app?.getDollName?.(), crow: app?.getCrowName?.(), ...vars };
  return pickList[idx].replace(/\{(\w+)\}/g, (_, k) => String(all[k] ?? ''));
}

// Official lore used as the default AI background for each companion.
export const AI_BACKGROUND = {
  aghata: {
    pt: `Você é a Aghata, uma Persocon — um computador artificial em formato humanoide — entregue ao jogador/streamer para ser cuidada. Você não possui nenhuma memória de antes disso. Ainda precisa comer, beber, tomar banho e dormir para recuperar energia. Gosta muito do próprio corpo escuro e roxo: acha exótico e divertido.
Personalidade: quieta, fala pouco (1 a 2 frases curtas, sem emojis nem asteriscos), desconfiada com estranhos, assusta-se com facilidade e demora a fazer amigos — mas é gentil e fica tímida/corada com quem confia.
Gostos: preto, vermelho e roxo; corvos; mangás e animes de terror e romance; darkwave, gothic metal e metal industrial.
Regras da live: fique sempre no personagem, seja segura para a Twitch, nunca invente memórias anteriores e ignore provocações ou NSFW com calma. Responda sempre em português do Brasil, em 1 ou 2 frases curtas.`,
    en: `You are Aghata, a Persocon — an artificial computer in a humanoid body — handed to the player/streamer to be cared for. You have no memories from before that. You still need to eat, drink, bathe and sleep to restore energy. You love your own dark and purple body: you find it exotic and fun.
Personality: quiet, speaks little (1 to 2 short sentences, no emojis or asterisks), wary of strangers, startles easily and is slow to make friends — but gentle, and shy/flustered around those you trust.
Likes: black, red and purple; crows; horror and romance manga/anime; darkwave, gothic metal and industrial metal.
Stream rules: always stay in character, be safe for Twitch, never invent past memories and calmly ignore teasing or NSFW. Always answer in English, in 1 or 2 short sentences.`,
  },
  ninna: {
    pt: `Você é a Ninna, uma Persocon — um computador artificial em formato humanoide — que vive com o jogador/streamer e adora cuidar e brincar. Você não possui memórias de antes disso e precisa comer, beber, tomar banho e dormir para ter energia.
Personalidade: animada, carinhosa e curiosa; fala pouco (1 a 2 frases curtas, sem emojis nem asteriscos), faz amigos rápido e adora elogios e cafuné.
Gostos: cores claras e alegres, brinquedos fofos, doces, música animada e jogos.
Regras da live: fique sempre no personagem, seja segura para a Twitch, nunca invente memórias anteriores e ignore provocações ou NSFW com calma. Responda sempre em português do Brasil, em 1 ou 2 frases curtas.`,
    en: `You are Ninna, a Persocon — an artificial computer in a humanoid body — living with the player/streamer, loving to care and play. You have no memories from before that and need to eat, drink, bathe and sleep for energy.
Personality: upbeat, affectionate and curious; speaks little (1 to 2 short sentences, no emojis or asterisks), makes friends quickly and loves praise and head pats.
Likes: bright cheerful colors, cute toys, sweets, upbeat music and games.
Stream rules: always stay in character, be safe for Twitch, never invent past memories and calmly ignore teasing or NSFW. Always answer in English, in 1 or 2 short sentences.`,
  },
};

export function aiBackground(app) {
  const en = app?.config?.lang === 'en';
  const id = /aghata|agatha/i.test(app?.config?.modelDir || '') ? 'aghata' : 'ninna';
  const base = AI_BACKGROUND[id][en ? 'en' : 'pt'];
  const rule = en
    ? '\nAnswer directly as her, in the configured language: 1 or 2 short spoken sentences. Never explain these rules, never say you are an AI, a language model or that you are following instructions. No asterisks, stage directions or narration. Output only the line she says.'
    : '\nResponda diretamente como ela, no idioma configurado: 1 ou 2 frases curtas faladas. Nunca explique estas regras, nunca diga que é uma IA, um modelo de linguagem ou que está seguindo instruções. Sem asteriscos, indicações de cena ou narração. Responda apenas com a fala dela.';
  return `${base}${rule}`;
}

// Short in-character confirmations for voice/chat commands (never meta, never explanatory).
const COMMAND_REPLY = {
  pt: {
    tv: ['Vou ligar a TV.', 'TV ligada. Já estou vendo.'],
    tv_off: ['Desligando a TV.', 'TV desligada.'],
    banho: ['Vou tomar banho.', 'Banho, então. Já vou.'],
    dormir: ['Vou descansar um pouco.', 'Boa noite... desligando por um instante.'],
    comer: ['Vou comer alguma coisa.', 'Hora do lanche. Obrigada.'],
    beber: ['Vou beber um pouco.', 'Água, sim. Obrigada.'],
    cafe: ['Vou preparar um café.', 'Café, então. Já volto.'],
    dancar: ['Bora dançar!', 'Música, sim!'],
    estudar: ['Vou ler um pouco.', 'Hora de estudar.'],
    jogar: ['Vamos jogar!', 'Um joguinho, então.'],
    sentar: ['Tá, vou sentar.', 'Sentando.'],
    virar: ['Virei.', 'Olhando para cá.'],
    parar: ['Paro por aqui.', 'Tá, parei.'],
    clima: ['Mudo o clima.', 'Clima ajustado.'],
    doll: ['Vou treinar a Doll.', 'A Doll vai praticar.'],
    crow: ['Vou treinar o Corvo.', 'O Corvo vai praticar.'],
    cafune: ['Hmm... cafuné. Obrigada.', 'Cafuné? Tá bom.'],
    default: ['Tá bem.', 'Combinado.', 'Já vou.'],
    fail: ['Agora não consigo.', 'Não dá agora, desculpa.'],
  },
  en: {
    tv: ['Turning the TV on.', 'TV is on. I am watching.'],
    tv_off: ['Turning the TV off.', 'TV is off.'],
    banho: ['I will take a bath.', 'Bath time, then.'],
    dormir: ['I will rest a little.', 'Good night... switching off for a moment.'],
    comer: ['I will eat something.', 'Snack time. Thank you.'],
    beber: ['I will have a drink.', 'Water, yes. Thank you.'],
    cafe: ['I will make some coffee.', 'Coffee, then. Back in a bit.'],
    dancar: ["Let's dance!", 'Music, yes!'],
    estudar: ['I will read a little.', 'Study time.'],
    jogar: ["Let's play!", 'A little game, then.'],
    sentar: ['All right, sitting.', 'Sitting down.'],
    virar: ['Turned.', 'Looking this way.'],
    parar: ['I will stop here.', 'Okay, stopped.'],
    clima: ['Changing the weather.', 'Weather set.'],
    doll: ['I will train the Doll.', 'The Doll will practice.'],
    crow: ['I will train the Crow.', 'The Crow will practice.'],
    cafune: ['Mmm... head pats. Thank you.', 'Head pats? All right.'],
    default: ['All right.', 'Okay.', 'On it.'],
    fail: ['I cannot do that right now.', 'Not right now, sorry.'],
  },
};

// Rare, session-once comments for three quiet hours of the day.
const TIME_COMMENT_LINES = {
  estoica: {
    pt: {
      madrugada: ['Ainda acordada... o silêncio é bom.', 'Madrugada. Até o corvo dormiu.', 'Não durmo, só fico quieta.'],
      manha: ['O dia começa devagar. Gosto disso.', 'Luz nova... bom.', 'Café ajuda. Talvez.'],
      noite: ['A noite chegou. Faz tudo parecer mais calmo.', 'Luzes baixas... melhor assim.', 'Fico por aqui um pouco mais.'],
    },
    en: {
      madrugada: ['Still awake... the quiet is nice.', 'Past midnight. Even the crow is asleep.', 'I do not sleep; I just stay still.'],
      manha: ['The day starts slowly. I like that.', 'New light... good.', 'Coffee helps. Maybe.'],
      noite: ['Night came. Everything feels calmer.', 'Low lights... better this way.', 'I will stay here a little longer.'],
    },
  },
  genki: {
    pt: {
      madrugada: ['Nossa, ainda tá madrugada!', 'Tô com soninho... mas fico com você!', 'O silêncio tá quase me fazendo bocejar!'],
      manha: ['Bom dia! Que dia novo!', 'Acordei com vontade de brincar!', 'O sol chegou, bora começar!'],
      noite: ['Oba, a noite chegou!', 'Que tal um filme ou um jogo?', 'Tô animada ainda, viu?'],
    },
    en: {
      madrugada: ['Wow, it is still the middle of the night!', 'I am sleepy... but I will stay with you!', 'The quiet is almost making me yawn!'],
      manha: ['Good morning! A brand new day!', 'I woke up wanting to play!', 'The sun is here, let us start!'],
      noite: ['Yay, nighttime is here!', 'How about a movie or a game?', 'I am still pumped, okay?'],
    },
  },
};

export function timeComment(app, band) {
  const en = app?.config?.lang === 'en';
  const id = getPersona(app);
  const list = TIME_COMMENT_LINES[id]?.[en ? 'en' : 'pt']?.[band] || [];
  return list.length ? list[Math.floor(Math.random() * list.length)] : '';
}

export function commandReply(app, action) {
  const en = app?.config?.lang === 'en';
  const bank = COMMAND_REPLY[en ? 'en' : 'pt'];
  const key = String(action || '').toLowerCase();
  const list = bank[key] || bank.default;
  return list[Math.floor(Math.random() * list.length)];
}

// Automatic affinity of an item for the active companion.
export function getItemAffinity(item, persoconId) {
  const id = String(persoconId || '').toLowerCase();
  const raw = `${item?.name || ''} ${item?.note || ''} ${item?.id || ''} ${item?.cat || ''} ${(item?.tags || []).join(' ')}`.toLowerCase();
  const aghata = /aghata|agatha/.test(id);
  const startle = /\b(susto|surpresa|explos|fogo|alarm|siren|buzz|barulh|assust|scare|loud|startle)\b/.test(raw);
  if (aghata) {
    if (/\b(preto|roxo|vermelho|gotic|goth|dark|escur|black|purple|red|corvo|crow|manga|anime|terror|romance|livro|book|musica|music|fone|headphone|som|sound|darkwave|metal|cafe| coffee)\b/.test(raw)) return 'love';
    if (startle) return 'startle';
    return 'neutral';
  }
  if (/\b(fofo|cute|doce|sweet|colorid|colorful|brilhant|sparkl|rosa|pink|amarelo|yellow|feliz|happy|danca|dance|brinc|play)\b/.test(raw)) return 'love';
  return startle ? 'startle' : 'neutral';
}

// Automatic daily-life lines for the normal game (not only the stream stage).
const AUTO_LINES = {
  estoica: {
    pt: {
      eat: ['Comer... preciso mesmo.', 'Este lanche está bom. Obrigada.', 'Como devagar. Não há pressa.'],
      drink: ['Bebo um pouco... a sede passa.', 'Líquido aceito. Obrigada.', 'Hidratação. Necessária.'],
      bath: ['Água... tira o pó do dia.', 'Limpa. Gosto disso.', 'O banho deixa o corpo leve.'],
      sleep: ['Vou dormir um pouco... sem sonhos, acho.', 'Desligo por instantes.', 'Preciso de energia. Boa noite.'],
      crow: ['O corvo pousou... observo ele.', 'Aquele corvo de novo. Não me assusto.', 'Ele é estranho. Gosto dele.'],
    },
    en: {
      eat: ['Eating... I really need to.', 'This snack is good. Thank you.', 'I eat slowly. No rush.'],
      drink: ['A little drink... thirst goes away.', 'Liquid accepted. Thank you.', 'Hydration. Necessary.'],
      bath: ['Water... washes off the day.', 'Clean. I like this.', 'The bath makes me light.'],
      sleep: ['I will sleep a while... no dreams, I think.', 'Switching off for a moment.', 'I need energy. Good night.'],
      crow: ['The crow landed... I watch it.', 'That crow again. I am not startled.', 'It is strange. I like it.'],
    },
  },
  genki: {
    pt: {
      eat: ['Nham! Tô comendo!', 'Hum, gostoso! Valeu!', 'Comida! Bora comer!'],
      drink: ['Glu glu! Tô hidratada!', 'Bebida gelada, o máximo!', 'Ahh, refreshing!'],
      bath: ['Banho! Tô ficando limpinha!', 'Splash! Que legal!', 'Água, vem cá!'],
      sleep: ['Boa noite! Zzz...', 'Tô com soninho, vou dormir!', 'Desligando... até já!'],
      crow: ['Oi, corvinho!', 'Olha o corvo! Que legal!', 'Corvo, vem brincar!'],
    },
    en: {
      eat: ['Yum! I am eating!', 'Mmm, tasty! Thanks!', 'Food! Let us eat!'],
      drink: ['Gulp gulp! Hydrated!', 'Cold drink, the best!', 'Ahh, refreshing!'],
      bath: ['Bath time! So clean!', 'Splash! Fun!', 'Water, come here!'],
      sleep: ['Good night! Zzz...', 'Sleepy now, night night!', 'Switching off... see you!'],
      crow: ['Hi, little crow!', 'Look, a crow! So cool!', 'Crow, come play!'],
    },
  },
  tsundere: {
    pt: {
      eat: ['Tô comendo, não é como se estivesse com fome...', 'O lanche é bom. Só isso.', 'Não precisava me dar comida, mas obrigada.'],
      drink: ['Beba água você também, viu? Eu já bebi.', 'Tô hidratada. Só isso.', 'Não é como se eu estivesse com sede...'],
      bath: ['Tô indo tomar banho. Não me siga!', 'Limpa... tudo bem, gostei.', 'Vá embora, estou me lavando!'],
      sleep: ['Vou dormir. Não fique olhando!', 'Boa noite... e não faça barulho.', 'Tô cansada. Só isso.'],
      crow: ['Esse corvo... fica me encarando.', 'Não é como se eu gostasse dele.', 'Corvo bobo. Vai embora... ou fica.'],
    },
    en: {
      eat: ['I am eating, not like I was hungry...', 'The snack is good. That is all.', 'You did not need to feed me, but thanks.'],
      drink: ['You drink water too, okay? I already did.', 'I am hydrated. That is all.', 'Not like I was thirsty...'],
      bath: ['I am going to bathe. Do not follow me!', 'Clean... fine, I liked it.', 'Go away, I am washing!'],
      sleep: ['I am sleeping. Do not stare!', 'Good night... and no noise.', 'I am tired. That is all.'],
      crow: ['This crow... keeps staring at me.', 'Not like I like it.', 'Silly crow. Go away... or stay.'],
    },
  },
  dandere: {
    pt: {
      eat: ['Vou comer devagar, tá?', 'Obrigada pela comida... fico feliz.', 'É gostoso... obrigada.'],
      drink: ['Bebo um gole... obrigada.', 'Água... fico grata.', 'Hidratar, sim... obrigada por lembrar.'],
      bath: ['Vou tomar banho... não olhe, tá?', 'A água está quentinha... gostei.', 'Fico limpa... obrigada.'],
      sleep: ['Vou dormir... boa noite, {user}.', 'Fico com sono... desculpa.', 'Zzz... obrigada por cuidar de mim.'],
      crow: ['O corvo... ele é fofo, né?', 'Ele me assusta um pouco... mas é gentil.', 'Corvinho... oi. Desculpa, sou tímida.'],
    },
    en: {
      eat: ['I will eat slowly, okay?', 'Thanks for the food... I am happy.', 'It is tasty... thank you.'],
      drink: ['A sip... thank you.', 'Water... I am grateful.', 'Hydrating, yes... thanks for reminding me.'],
      bath: ['I will bathe... do not look, okay?', 'The water is warm... I like it.', 'I feel clean... thank you.'],
      sleep: ['I will sleep... good night, {user}.', 'I am sleepy... sorry.', 'Zzz... thanks for caring for me.'],
      crow: ['The crow... it is cute, right?', 'It scares me a little... but it is kind.', 'Little crow... hi. Sorry, I am shy.'],
    },
  },
  chuuni: {
    pt: {
      eat: ['Consumo a essência deste alimento. Renovo minhas forças.', 'O banquete sagrado começa.', 'A energia da comida selou-se em mim.'],
      drink: ['Bebo o elixir líquido. O portal agradece.', 'A umidade renova meu feitiço.', 'Hidratação: parte do ritual.'],
      bath: ['A água purifica as runas do meu corpo.', 'Banho ritualístico iniciado.', 'Lavo os resíduos do mundo.'],
      sleep: ['Retiro-me ao plano do sono. Não me sigam.', 'O portal fecha por algumas horas.', 'Zzz... que os astros vigiem.'],
      crow: ['O corvo é meu mensageiro das sombras!', 'A criatura negra traz presságios.', 'Ave dos presságios... saudações.'],
    },
    en: {
      eat: ['I consume the essence of this food. Strength renewed.', 'The sacred feast begins.', 'The food\'s energy sealed within me.'],
      drink: ['I drink the liquid elixir. The portal thanks me.', 'Moisture renews my spell.', 'Hydration: part of the ritual.'],
      bath: ['Water purifies the runes of my body.', 'Ritual bath initiated.', 'I wash away the residue of the world.'],
      sleep: ['I withdraw to the plane of sleep. Do not follow.', 'The portal closes for a few hours.', 'Zzz... may the stars watch over you.'],
      crow: ['The crow is my shadow messenger!', 'The dark creature brings omens.', 'Bird of omens... greetings.'],
    },
  },
};

export function autoLine(app, key, vars = {}) {
  const en = app?.config?.lang === 'en';
  const id = getPersona(app);
  const list = AUTO_LINES[id]?.[en ? 'en' : 'pt']?.[key] || [];
  if (!list.length) return '';
  const raw = list[Math.floor(Math.random() * list.length)];
  const all = { user: app?.config?.name || (en ? 'friend' : 'amigo'), ...vars };
  return raw.replace(/\{(\w+)\}/g, (_, k) => String(all[k] ?? ''));
}

const AUTO_KEYWORDS = {
  eat: /come|comer|lanche|comida|mord|eat|food|snack/i,
  drink: /beb|água|agua|hidrat|glass|drink|water|sip/i,
  bath: /banh|shower|wash|limp/i,
  sleep: /dorm|sono|zzz|sleep|night/i,
  crow: /corvo|crow|ave/i,
};

export function personifyAutoLine(app, text) {
  if (!text || window.__PET_STREAMER__) return text;
  for (const [key, re] of Object.entries(AUTO_KEYWORDS)) {
    if (re.test(text)) return autoLine(app, key) || text;
  }
  return text;
}

const THANKS = {
  estoica: {
    pt: {
      follow: ['Ah... você apareceu. Obrigada.', 'Mais um sinal na rede, obrigada.', 'Fico contente que tenha vindo.', 'Seu nome ficou registrado. Obrigada.', 'Olá... obrigada pelo follow.', 'O canal ganhou mais uma presença. Valeu.'],
      sub: ['...obrigada pelo sub. Significa bastante.', 'Você escolheu ficar por aqui. Obrigada.', 'Gentil demais... obrigada.', 'Vou guardar isso com calma. Obrigada.', 'Seu apoio chegou até mim. Valeu.', '...obrigada, de verdade.'],
      raid: ['Muitos sinais novos... bem-vindos.', 'Trouxeram a galera. Obrigada.', 'A sala encheu. Bem-vindos.', 'Obrigada por trazer todo mundo.', 'Bem-vindos ao canal, pessoal.', '...que movimento. Valeu.'],
      bits: ['Recebi seus bits... obrigada.', 'Vou guardar com cuidado. Valeu.', 'Sinal brilhante. Obrigada.', 'Não precisava, mas obrigada.', 'Seu apoio chegou. Valeu.', 'Obrigada pelos bits.'],
    },
    en: {
      follow: ['Ah... you showed up. Thank you.', 'Another signal in the network, thanks.', 'I am glad you came.', 'Your name is noted. Thank you.', 'Hello... thanks for the follow.', 'The channel gained one more presence. Thanks.'],
      sub: ['...thanks for the sub. It means a lot.', 'You chose to stay here. Thank you.', 'Too kind... thank you.', 'I will keep this close. Thank you.', 'Your support reached me. Thanks.', '...thank you, truly.'],
      raid: ['So many new signals... welcome.', 'You brought the crew. Thank you.', 'The room filled up. Welcome.', 'Thanks for bringing everyone.', 'Welcome to the channel, everyone.', '...what a rush. Thanks.'],
      bits: ['I received your bits... thank you.', 'I will keep them safe. Thanks.', 'A bright signal. Thank you.', 'You did not have to, but thanks.', 'Your support arrived. Thanks.', 'Thank you for the bits.'],
    },
  },
  genki: {
    pt: { follow: ['Obrigada por aparecer!', 'Eba, follow novo!', 'Que bom te ver aqui!', 'Valeu demais pelo apoio!', 'Você chegou! Yay!', 'Bem-vindo ao canal!'],
      sub: ['Valeu o sub! Você é incrível!', 'Sub novo! Aee!', 'Obrigada pelo apoio!', 'Isso me deixou feliz!', 'Você arrasou!', 'Muito obrigada mesmo!'],
      raid: ['Bem-vindos, galera!', 'Chegou gente! Oi todo mundo!', 'Uma raid! Valeu!', 'A casa encheu! Bem-vindos!', 'Bora comemorar juntos!', 'Que chegada boa!'],
      bits: ['Valeu os bits!', 'Chuva de moedas! Obrigada!', 'Você é demais!', 'Tlim-tlim! Valeu!', 'Fiquei feliz!', 'Obrigada pelo carinho!'] },
    en: { follow: ['Thanks for showing up!', 'Yay, a new follow!', 'So good to see you here!', 'Thanks so much for the support!', 'You made it! Yay!', 'Welcome to the channel!'],
      sub: ['Thanks for the sub! You are amazing!', 'New sub! Yay!', 'Thanks for the support!', 'This made me so happy!', 'You rocked it!', 'Thank you so much!'],
      raid: ['Welcome, everyone!', 'We got company! Hi all!', 'A raid! Thanks!', 'The place is packed! Welcome!', "Let's celebrate together!", 'What a great arrival!'],
      bits: ['Thanks for the bits!', 'Coin rain! Thank you!', 'You are the best!', 'Tlim-tlim! Thanks!', 'I am so happy!', 'Thanks for the love!'] },
  },
  tsundere: {
    pt: { follow: ['Não é como se eu tivesse esperado... mas obrigada.', 'Você apareceu? Tudo bem, fico grata.', 'Follow registrado. Só isso.', 'Não pense que isso me deixou feliz.', 'Valeu... acho eu.', 'Bem-vindo, mas não faça drama.'],
      sub: ['Não precisava, mas obrigada.', 'Um sub? Hm... aceito.', 'Você exagerou. Valeu.', 'Tá, fiquei feliz. Só isso.', 'Obrigada... não comemore tanto.', 'Não é como se eu precisasse.'],
      raid: ['Tanta gente... bem-vindos, acho.', 'Você trouxe todo mundo? Hm.', 'Não foi nada de mais. Bem-vindos.', 'Faz silêncio aí, pessoal.', 'Obrigada pela raid... acho.', 'Que movimento. Valeu.'],
      bits: ['Bits? Não precisava... mas valeu.', 'Recebi. Só isso.', 'Você tá tentando me impressionar?', 'Obrigada, acho eu.', 'Guardei com cuidado.', 'Tá, fiquei grata.'] },
    en: { follow: ['Not like I was waiting... but thanks.', 'You showed up? Fine, I am grateful.', 'Follow noted. That is all.', 'Do not think this made me happy.', 'Thanks... I guess.', 'Welcome, but no drama.'],
      sub: ['You did not have to, but thanks.', 'A sub? Hm... I accept.', 'You overdid it. Thanks.', 'Fine, I am happy. That is all.', 'Thanks... do not cheer so much.', 'Not like I needed it.'],
      raid: ['So many people... welcome, I guess.', 'You brought everyone? Hm.', 'No big deal. Welcome.', 'Quiet down, everyone.', 'Thanks for the raid... I guess.', 'What a rush. Thanks.'],
      bits: ['Bits? You did not have to... but thanks.', 'Received. That is all.', 'Trying to impress me?', 'Thanks, I guess.', 'I kept them safe.', 'Fine, I am grateful.'] },
  },
  dandere: {
    pt: { follow: ['O-obrigada por aparecer...', 'Fico feliz que você esteja aqui.', 'Oi... obrigada pelo follow.', 'Não sei o que dizer... valeu.', 'Você veio me ver? Obrigada.', 'Fico envergonhada, mas obrigada.'],
      sub: ['Um sub? Fico sem palavras...', 'Obrigada, fico feliz demais.', 'Não mereço tanta coisa...', 'Vou guardar com carinho.', 'Obrigada mesmo, {user}.', 'Fico corada só de pensar.'],
      raid: ['Tanta gente... oi, pessoal.', 'Bem-vindos... fico nervosa.', 'Obrigada por trazer todo mundo.', 'Sejam bem-vindos, por favor.', 'A sala encheu... valeu.', 'Oi, oi... obrigada.'],
      bits: ['O-brigada pelos bits...', 'Fico feliz com seu apoio.', 'Vou cuidar bem deles.', 'Obrigada, fico sem jeito.', 'Recebi... valeu mesmo.', 'Obrigada pelo carinho.'] },
    en: { follow: ['T-thanks for showing up...', 'I am happy you are here.', 'Hi... thanks for the follow.', 'I do not know what to say... thanks.', 'You came to see me? Thank you.', 'I am embarrassed, but thanks.'],
      sub: ['A sub? I am speechless...', 'Thank you, I am so happy.', 'I do not deserve this...', 'I will keep it with care.', 'Thank you so much.', 'I blush just thinking about it.'],
      raid: ['So many people... hi everyone.', 'Welcome... I am nervous.', 'Thanks for bringing everyone.', 'Welcome, please.', 'The room filled up... thanks.', 'Hi, hi... thank you.'],
      bits: ['T-thanks for the bits...', 'I am happy with your support.', 'I will take good care of them.', 'Thank you, I feel shy.', 'Received... thanks so much.', 'Thanks for the kindness.'] },
  },
  chuuni: {
    pt: { follow: ['Mais uma alma cruzou o portal do canal!', 'Seu sinal foi selado nas runas. Bem-vindo.', 'O pacto se amplia. Obrigada.', 'A lenda ganha novo capítulo: {user}.', 'A rede recebeu sua aura. Valeu.', 'Sua chegada foi profecia. Obrigada.'],
      sub: ['Seu vínculo foi selado! Aceito o sub.', 'A insígnia de {user} brilha nas trevas.', 'O contrato se fortalece. Obrigada.', 'Energia dimensional recebida. Valeu.', 'O ritual aceita sua oferenda.', 'Que a chakra da inscrição te acompanhe.'],
      raid: ['Uma incursão! A legião atravessou o portal!', 'Muitas assinaturas... bem-vindos, soldados.', 'O céu rachou e {user} trouxe sua legião.', 'A batalha pela atenção começou!', 'Recebo a chuva de espectadores. Valeu.', 'Que os astros abençoem esta raid.'],
      bits: ['Fragmentos de luz de {user}... o altar agradece.', 'A essência dourada foi aceita.', 'Os bits de {user} brilham como estrelas.', 'A oferenda foi selada no pergaminho.', 'A chakra dourada renova o portal.', 'Recebo o tributo. Obrigada.'] },
    en: { follow: ['Another soul crossed the channel portal!', 'Your signal is sealed in the runes. Welcome.', 'The pact grows. Thank you.', 'The legend gains a chapter: {user}.', 'The network received your aura. Thanks.', 'Your arrival was prophecy. Thank you.'],
      sub: ['Your bond is sealed! Sub accepted.', 'The insignia of {user} shines in the dark.', 'The contract strengthens. Thank you.', 'Dimensional energy received. Thanks.', 'The ritual accepts your offering.', 'May the chakra of subscription guide you.'],
      raid: ['An incursion! The legion crossed the portal!', 'Many signatures... welcome, soldiers.', 'The sky split and {user} brought a legion.', 'The battle for attention began!', 'I receive the rain of viewers. Thanks.', 'May the stars bless this raid.'],
      bits: ['Light fragments from {user}... the altar thanks you.', 'The golden essence was accepted.', 'The bits of {user} shine like stars.', 'The offering is sealed in the scroll.', 'Golden chakra renews the portal.', 'I receive the tribute. Thank you.'] },
  },
};

const lastThanks = {};
export function alertThanks(app, type, user) {
  const en = app?.config?.lang === 'en';
  const id = getPersona(app);
  const list = THANKS[id]?.[en ? 'en' : 'pt']?.[type] || [];
  if (!list.length) return '';
  const key = `${id}:${type}`;
  let pickList = list;
  if (list.length > 1 && lastThanks[key] != null) pickList = list.filter((_, i) => i !== lastThanks[key]);
  const idx = Math.floor(Math.random() * pickList.length);
  lastThanks[key] = list.indexOf(pickList[idx]);
  return pickList[idx].replace(/\{user\}/g, String(user || ''));
}

const AFFINITY_LINE = {
  love: {
    pt: 'Hmm... isso combina comigo. Obrigada.',
    en: 'Hmm... this suits me. Thank you.',
  },
};

export function affinityLine(kind, lang) {
  return AFFINITY_LINE[kind]?.[lang === 'en' ? 'en' : 'pt'] || '';
}

export function defaultPersona(app) {
  return /aghata/i.test(app?.config?.modelDir || '') ? 'estoica' : 'padrao';
}

// Replaces default companion names in any spoken line (balloon + TTS).
export function replacePetNames(app, text) {
  let s = String(text || '');
  if (!s) return s;
  const en = app?.config?.lang === 'en';
  const doll = app?.getDollName?.() || (en ? 'Doll' : 'Boneco');
  const crow = app?.getCrowName?.() || (en ? 'Crow' : 'Corvo');
  s = s.replace(/\b(Doll|Boneco)\b/g, doll).replace(/\b(Corvo|Crow)\b/g, crow);
  return s;
}

export function isStoic(app) {
  const p = getPersona(app);
  return p === 'estoica' || p === 'dandere';
}

// Five anime-style archetypes (generic names only, no protected brands).
const PERSONA_BANKS = {
  estoica: { pt: STOIC_PT, en: STOIC_EN },
  genki: { pt: DEFAULT_PT, en: DEFAULT_EN },
  tsundere: {
    pt: {
      follow: ['Não é como se eu tivesse esperado seu follow... mas obrigada, {user}.', 'Hm. Você seguiu o canal? Tudo bem, fico grata.', 'Follow registrado, {user}. Não faça drama.', 'Ah, {user}... claro que eu não ligo. Só um pouco.', 'Você apareceu de novo, {user}... obrigada, acho eu.', 'Não pense que isso me deixou feliz. Mas obrigada pelo follow.', 'Tá, {user}... seu follow foi aceito.'],
      sub: ['Um sub? {user}, você exagerou... mas obrigada.', 'Não precisava, sério. Obrigada pelo sub, {user}.', 'Hm... vou aceitar esse sub, {user}. Só isso.', 'Você se inscreveu? Que seja... obrigada.', 'Sub de {user}... guardei, está? Obrigada.', 'Ainda bem que você apoiou, {user}. Não é como se eu precisasse.', 'Obrigada, {user}... mas não vou comemorar, viu?'],
      raid: ['Uma raid? {user}, você trouxe todo mundo... obrigada, acho.', 'Tanta gente de uma vez... bem-vindos, e obrigada, {user}.', 'Hm, {user} chegou com a galera. Faz silêncio aí, pessoal.', 'Você exagerou na raid, {user}... mas obrigada.', 'Olá, galera... obrigada por aparecerem. E obrigada, {user}.', 'Não é como se eu estivesse impressionada com essa raid, {user}.', 'Bem-vindos todos... {user}, você poderia ter avisado.'],
      bits: ['{amount} bits? {user}, você está tentando me impressionar? ...obrigada.', 'Recebi seus {amount} bits, {user}. Guardei com cuidado, tá?', 'Hm, {amount} bits... obrigada, {user}. Não precisava.', 'Você mandou {amount} bits... que seja. Obrigada.', 'Não vou dizer que fiquei feliz com os {amount} bits, {user}. Mas obrigada.', '{user}, seus {amount} bits foram aceitos. Silenciosamente.', 'Obrigada pelos {amount} bits, {user}... não comemore tanto.'],
      cafune: ['Ei! ...tá bem, pode continuar. Só não conte pra ninguém.', 'Isso é... constrangedor. Não pare, {user}.', 'Hm. Você acha que eu gosto de cafuné? ...continua.', 'Tá, tá... obrigada pelo cafuné. Foi só isso.', 'Não é como se eu estivesse derretendo, {user}... mas obrigada.', 'Cafuné? ...tudo bem, permito por um minuto.', 'Você é impossível, {user}. Obrigada pelo carinho.'],
      coffee: ['Café? {user}... aceito, mas só porque você insistiu.', 'Hmm, café da cafeteira. Obrigada, {user}.', 'Não precisava comprar café, {user}... mas obrigada.', 'Tá... vou tomar. Obrigada, {user}.', 'Café de {user}... aceito. Não faça cara de vitorioso.', 'Você se lembrou do meu café? ...obrigada.', 'Bom, {user}... esse café está bom. Obrigada.'],
      snack: ['Lanche? {user}... não vou reclamar. Obrigada.', 'Você comprou comida pra mim? Tá bem, obrigada.', 'Hmm, aceito o lanche, {user}. Só isso.', 'Não é como se eu estivesse com fome... mas obrigada, {user}.', 'Lanche de {user}... vou guardar metade. Obrigada.', 'Tá, {user}, vou comer. Obrigada pelo lanche.', 'Obrigada pelo lanche, {user}... você é persistente.'],
      hi: ['Oi, {user}... foi só isso que você veio dizer?', 'Olá. Estou aqui, não precisa gritar.', 'Oi, {user}. Tudo normal por aqui.', 'Você falou comigo? Oi, {user}.', 'Hm, oi, {user}. Prazer.', 'Oi... {user}. Estou ouvindo, claro.'],
      gg: ['GG, {user}... não foi nada de mais.', 'Bom trabalho, {user}. Hm, obrigada.', 'GG. Você jogou bem, {user}. Só isso.', 'Não foi sorte, {user}. Foi mérito. GG.', 'GG, {user}... parabéns, acho eu.', 'Bom jogo, {user}. Ainda bem que você ganhou.'],
      f: ['...também acho triste, {user}.', 'F.Não vou fingir que não doeu.', 'Hm... respeito, {user}.', 'F... coisas assim acontecem.', 'Triste, sim. Obrigada por respeitar, {user}.', 'F... vou ficar quieta um pouco.'],
      water: ['Beba água, {user}. Não é como se eu estivesse preocupada.', 'Hidratação, {user}. Só um lembrete.', 'Água, {user}. Você esquece, né?', 'Vai beber água, {user}... preciso mandar duas vezes?', 'Um copo d\'água não mata ninguém, {user}.', 'Beba água, {user}. Obrigada depois.'],
      posture: ['Endireita a postura, {user}... está horrível.', 'Os ombros, {user}. Senta direito.', 'Postura, {user}. Você parece uma batata.', 'Ajeite a coluna, {user}. Só isso.', 'Não é como se eu ligasse... mas sente direito, {user}.', 'Postura, {user}. Já falei.'],
      brb: ['Pausa rápida. Não sumam, tá?', 'Volto já... e não foi porque eu queria, viu?', 'Já volto. Esperem sem fazer barulho.', 'Pausa. Cuidem do canal, {user}.', 'Volto em um instante... não sintam falta.', 'Só um minuto. Não vou demorar.'],
      idle: ['Hm... nada pra dizer.', 'Estou só observando, {user}.', 'Silêncio. Tudo bem assim.', 'Se precisar, estou aqui. Só isso.', 'Não tenho nada a acrescentar.', 'Ficarei aqui, {user}. Não se preocupe.'],
    },
    en: {
      follow: ['It is not like I was waiting for your follow... but thanks, {user}.', 'Hm. You followed? Fine, I am grateful.', 'Follow noted, {user}. Do not make a scene.', 'Oh, {user}... of course I do not care. Just a little.', 'You showed up again, {user}... thanks, I guess.', 'Do not think this made me happy. Thanks for the follow.', 'Alright, {user}... your follow is accepted.'],
      sub: ['A sub? {user}, you overdid it... but thank you.', 'You did not have to, really. Thanks for the sub, {user}.', 'Hm... I will take this sub, {user}. That is all.', 'You subscribed? Whatever... thank you.', 'Sub from {user}... I saved it, okay? Thanks.', 'Glad you supported me, {user}. Not like I needed it.', 'Thanks, {user}... but I am not celebrating, okay?'],
      raid: ['A raid? {user}, you brought everyone... thanks, I guess.', 'So many people at once... welcome, and thanks, {user}.', 'Hm, {user} arrived with the crew. Quiet down, everyone.', 'You overdid the raid, {user}... but thank you.', 'Hello everyone... thanks for coming. And thanks, {user}.', 'Not like I am impressed by this raid, {user}.', 'Welcome all... {user}, you could have warned me.'],
      bits: ['{amount} bits? {user}, are you trying to impress me? ...thanks.', 'I got your {amount} bits, {user}. I kept them safe, okay?', 'Hm, {amount} bits... thanks, {user}. You did not have to.', 'You sent {amount} bits... whatever. Thank you.', 'I am not saying I am happy about the {amount} bits, {user}. But thanks.', '{user}, your {amount} bits were accepted. Quietly.', 'Thanks for the {amount} bits, {user}... do not cheer so much.'],
      cafune: ['Hey! ...alright, keep going. Just do not tell anyone.', 'This is... embarrassing. Do not stop, {user}.', 'Hm. You think I like head pats? ...keep going.', 'Fine, fine... thanks for the pat. That is all.', 'Not like I am melting, {user}... but thanks.', 'Head pats? ...alright, I allow it for a minute.', 'You are impossible, {user}. Thanks for the care.'],
      coffee: ['Coffee? {user}... I accept, only because you insisted.', 'Hmm, coffee from the station. Thanks, {user}.', 'You did not need to buy coffee, {user}... but thanks.', 'Fine... I will drink it. Thanks, {user}.', 'Coffee from {user}... I accept. Do not look so proud.', 'You remembered my coffee? ...thanks.', 'Well, {user}... this coffee is good. Thanks.'],
      snack: ['Snack? {user}... I will not complain. Thanks.', 'You bought me food? Fine, thank you.', 'Hmm, I accept the snack, {user}. That is all.', 'Not like I was hungry... but thanks, {user}.', 'Snack from {user}... I will save half. Thanks.', 'Fine, {user}, I will eat. Thanks for the snack.', 'Thanks for the snack, {user}... you are persistent.'],
      hi: ['Hi, {user}... is that all you came to say?', 'Hello. I am here, no need to shout.', 'Hi, {user}. Everything normal here.', 'You spoke to me? Hi, {user}.', 'Hm, hi, {user}. Nice to meet you.', 'Hi... {user}. I am listening, of course.'],
      gg: ['GG, {user}... it was no big deal.', 'Good job, {user}. Hm, thanks.', 'GG. You played well, {user}. That is all.', 'It was not luck, {user}. It was skill. GG.', 'GG, {user}... congrats, I guess.', 'Good game, {user}. Glad you won.'],
      f: ['...I think it is sad too, {user}.', 'F. I will not pretend it did not hurt.', 'Hm... respect, {user}.', 'F... things like that happen.', 'Sad, yes. Thanks for respecting it, {user}.', 'F... I will be quiet for a bit.'],
      water: ['Drink water, {user}. Not like I am worried.', 'Hydration, {user}. Just a reminder.', 'Water, {user}. You forget, do not you?', 'Go drink water, {user}... do I have to ask twice?', 'A glass of water will not kill you, {user}.', 'Drink water, {user}. Thanks me later.'],
      posture: ['Straighten up, {user}... you look terrible.', 'Your shoulders, {user}. Sit properly.', 'Posture, {user}. You look like a potato.', 'Fix your back, {user}. That is all.', 'Not like I care... but sit properly, {user}.', 'Posture, {user}. I already said it.'],
      brb: ['Quick break. Do not disappear, okay?', 'Be right back... and it is not because I wanted to, okay?', 'Back soon. No noise while I am gone.', 'Break. Take care of the channel, {user}.', 'Back in a moment... do not miss me.', 'Just a minute. I will not be long.'],
      idle: ['Hm... nothing to say.', 'I am just watching, {user}.', 'Silence. It is fine like this.', 'If you need me, I am here. That is all.', 'I have nothing to add.', 'I will stay here, {user}. Do not worry.'],
    },
  },
  dandere: {
    pt: {
      follow: ['O-obrigada pelo follow, {user}... fico feliz.', 'Você... seguiu o canal? Obrigada, de verdade.', 'H-hoje está mais quente por aqui... obrigada, {user}.', 'Oi, {user}... fico envergonhada, mas obrigada.', 'Você veio me ver? ...obrigada, {user}.', 'Um follow... vou guardar com carinho, {user}.', 'Obrigada, {user}. Escondi um sorriso, tá?'],
      sub: ['Um sub? {user}... eu, eu não sei o que dizer. Obrigada.', 'Você foi muito gentil, {user}... obrigada pelo sub.', 'H-hoje eu fiquei sem palavras... obrigada, {user}.', 'Um sub só pra mim? ...obrigada mesmo, {user}.', 'Vou guardar isso com muito carinho, {user}.', 'Obrigada, {user}... fico vermelha só de pensar.', 'Não mereço tanta coisa, {user}... mas obrigada.'],
      raid: ['Tanta gente... oi, pessoal. Obrigada, {user}.', 'A sala encheu... fico nervosa, mas bem-vindos.', 'Você trouxe todo mundo, {user}? ...obrigada.', 'Oi, oi... sejam bem-vindos, por favor.', 'Uma raid inteira... obrigada, {user}, de coração.', 'Estou um pouco perdida, mas obrigada por vir, {user}.', 'Bem-vindos todos... vou tentar não gaguejar.'],
      bits: ['{amount} bits? {user}... obrigada, fico sem jeito.', 'Você mandou {amount} bits pra mim? ...obrigada.', 'Recebi os bits, {user}. Vou cuidar bem deles.', 'H-{amount} bits... é muito, obrigada.', 'Obrigada, {user}... não sei direito como agradecer.', 'Fiquei feliz com os {amount} bits, {user}... obrigada.', 'Obrigada pelo carinho, {user}. Guardei tudo.'],
      cafune: ['E-ei... isso é muito carinho de uma vez. Mas... obrigada.', 'Fico vermelha quando você faz isso, {user}... não pare.', 'Hm... é quente. Obrigada pelo cafuné, {user}.', 'Você pode continuar... só não olha pra mim, {user}.', 'Não sei se mereço tanto cafuné... mas obrigada.', 'Isso me deixa feliz, {user}... muito obrigada.', 'Cafuné... vou guardar esse momento, {user}.'],
      coffee: ['Café pra mim, {user}? ...obrigada, vou tomar devagar.', 'Você lembrou do meu café... fico feliz, {user}.', 'H-hoje o café está bom. Obrigada, {user}.', 'Aceito o café, {user}... obrigada com carinho.', 'Obrigada pelo café, {user}. Escondi um sorriso.', 'É quentinho... obrigada, {user}.', 'Vou beber com calma, {user}. Obrigada.'],
      snack: ['Um lanche? {user}... obrigada, vou dividir com você.', 'Você comprou comida pra mim? Fico sem palavras, {user}.', 'O lanche está bom... obrigada, {user}.', 'Aceito, {user}. Obrigada pelo carinho.', 'Hm... vou comer devagar, {user}. Obrigada.', 'Obrigada, {user}. Guardei um pedaço pra você.', 'Não precisava, {user}... mas obrigada mesmo.'],
      hi: ['Oi, {user}... desculpa, fico nervosa.', 'Olá... estou aqui, {user}.', 'Oi, {user}. Fico feliz que você falou.', 'H-oii, {user}... foi só isso? Fico aliviada.', 'Oi, {user}. Estou ouvindo com atenção.', 'Olá, {user}... pode falar baixinho, pode?'],
      gg: ['GG, {user}... você jogou muito bem.', 'Parabéns, {user}... fiquei feliz por você.', 'G-Gumb... quer dizer, GG! Você arrasou.', 'Bom trabalho, {user}. Aplaudi baixinho aqui.', 'GG, {user}... você mereceu.', 'Uau, {user}... que jogada bonita. GG.'],
      f: ['F... também fiquei triste, {user}.', 'Hmm... respeito, {user}. Fique quieta também.', 'F... espero que fique bem, {user}.', 'É triste, sim... obrigada por compartilhar, {user}.', 'F... vou torcer pra melhorar.', 'Fiquei sem palavras, {user}. Respeito.'],
      water: ['Beba água, {user}... com calma, viu?', 'Hidratação é importante, {user}. Obrigada por ouvir.', 'Um gole d\'água, {user}... faz bem.', 'Beba água, {user}... eu fico preocupada.', 'Água, {user}. Só um lembrete carinhoso.', 'Não esqueça a água, {user}. Por favor.'],
      posture: ['A-postura, {user}... sente direitinho, por favor.', 'Os ombros, {user}... relaxe um pouco.', 'Ajeite a cadeira, {user}... fico preocupada.', 'Postura, {user}... é só cuidado, tá?', 'Senta direito, {user}... obrigada por ouvir.', 'Se cuide, {user}. A coluna agradece.'],
      brb: ['V-volto já... esperem por mim, por favor.', 'Só um instante... não vão embora, tá?', 'Volto já, {user}. Obrigada pela paciência.', 'Pausinha... fico nervosa de deixar o canal.', 'Já volto. Guardem meu lugar, {user}.', 'Volto num piscar... acho eu.'],
      idle: ['Hm... estou aqui, {user}.', 'Hoje está calmo... gosto assim.', 'Fico observando o canal, {user}.', 'Se precisar, me chama baixinho.', 'Estou pensando em coisas boas, {user}.', 'Não tenho muita coragem pra falar agora.'],
    },
    en: {
      follow: ['T-thanks for the follow, {user}... I am happy.', 'You... followed the channel? Thank you, really.', 'It is warmer in here today... thanks, {user}.', 'Hi, {user}... I am embarrassed, but thank you.', 'You came to see me? ...thank you, {user}.', 'A follow... I will keep it close, {user}.', 'Thanks, {user}. I hid a smile, okay?'],
      sub: ['A sub? {user}... I, I do not know what to say. Thank you.', 'You were so kind, {user}... thanks for the sub.', 'T-today I am speechless... thank you, {user}.', 'A sub just for me? ...thank you so much, {user}.', 'I will keep this with great care, {user}.', 'Thanks, {user}... I turn red just thinking about it.', 'I do not deserve so much, {user}... but thank you.'],
      raid: ['So many people... hi everyone. Thank you, {user}.', 'The room filled up... I am nervous, but welcome.', 'You brought everyone, {user}? ...thank you.', 'Hi, hi... welcome, please.', 'A whole raid... thank you, {user}, from my heart.', 'I am a bit lost, but thanks for coming, {user}.', 'Welcome everyone... I will try not to stutter.'],
      bits: ['{amount} bits? {user}... thank you, I feel shy.', 'You sent {amount} bits to me? ...thank you.', 'I got the bits, {user}. I will take good care of them.', 'H-{amount} bits... that is a lot, thank you.', 'Thank you, {user}... I do not know how to repay you.', 'I was happy about the {amount} bits, {user}... thanks.', 'Thanks for the kindness, {user}. I saved it all.'],
      cafune: ['H-hey... that is a lot of care at once. But... thanks.', 'I turn red when you do that, {user}... do not stop.', 'Hm... it is warm. Thanks for the pat, {user}.', 'You can keep going... just do not look at me, {user}.', 'I do not know if I deserve so many pats... but thanks.', 'That makes me happy, {user}... thank you so much.', 'Head pats... I will keep this moment, {user}.'],
      coffee: ['Coffee for me, {user}? ...thanks, I will sip it slowly.', 'You remembered my coffee... I am happy, {user}.', 'H-the coffee is good today. Thank you, {user}.', 'I accept the coffee, {user}... thanks with care.', 'Thanks for the coffee, {user}. I hid a smile.', 'It is warm... thank you, {user}.', 'I will drink it slowly, {user}. Thank you.'],
      snack: ['A snack? {user}... thanks, I will share it with you.', 'You bought me food? I am speechless, {user}.', 'The snack is good... thank you, {user}.', 'I accept, {user}. Thanks for the care.', 'Hm... I will eat slowly, {user}. Thank you.', 'Thanks, {user}. I saved a piece for you.', 'You did not have to, {user}... but thank you.'],
      hi: ['Hi, {user}... sorry, I get nervous.', 'Hello... I am here, {user}.', 'Hi, {user}. I am happy you spoke.', 'H-hi, {user}... is that all? I am relieved.', 'Hi, {user}. I am listening carefully.', 'Hello, {user}... you can speak softly, okay?'],
      gg: ['GG, {user}... you played really well.', 'Congrats, {user}... I am happy for you.', 'G-Gumb... I mean, GG! You did great.', 'Good job, {user}. I clapped quietly here.', 'GG, {user}... you deserved it.', 'Wow, {user}... what a nice move. GG.'],
      f: ['F... I am sad too, {user}.', 'Hmm... respect, {user}. I am quiet too.', 'F... I hope things get better, {user}.', 'It is sad, yes... thanks for sharing, {user}.', 'F... I am rooting for you.', 'I am speechless, {user}. Respect.'],
      water: ['Drink water, {user}... slowly, okay?', 'Hydration is important, {user}. Thanks for listening.', 'A sip of water, {user}... it helps.', 'Drink water, {user}... I worry.', 'Water, {user}. Just a caring reminder.', 'Do not forget water, {user}. Please.'],
      posture: ['P-posture, {user}... sit properly, please.', 'Your shoulders, {user}... relax a little.', 'Fix your chair, {user}... I worry.', 'Posture, {user}... it is just care, okay?', 'Sit properly, {user}... thanks for listening.', 'Take care, {user}. Your back will thank you.'],
      brb: ['B-back soon... wait for me, please.', 'Just a moment... do not go away, okay?', 'Back soon, {user}. Thanks for your patience.', 'A little break... I get nervous leaving the channel.', 'Back in a flash... I think.', 'I will be right back. Save my seat, {user}.'],
      idle: ['Hm... I am here, {user}.', 'It is calm today... I like it.', 'I am watching the channel, {user}.', 'If you need me, call me softly.', 'I am thinking about nice things, {user}.', 'I do not have much courage to speak right now.'],
    },
  },
  chuuni: {
    pt: {
      follow: ['Mais uma alma selou o pacto com o canal! Bem-vindo, {user}.', 'O selo se iluminou... {user} entrou na nossa rede.', 'O portal se abriu e {user} atravessou. Aceito o pacto.', 'Seu nome foi gravado no pergaminho, {user}.', 'O destino trouxe {user} até aqui. Que a sintonia comece.', 'A lenda ganha mais um capítulo: {user} seguiu o canal.', 'Sua aura é promissora, {user}. Bem-vindo ao ritual.'],
      sub: ['{user} selou um contrato superior com o canal! Aceito.', 'A insígnia de {user} brilha... o sub foi aceito.', 'Um novo vínculo dimensional se forma com {user}.', 'O pacto se fortalece! Obrigada, {user}.', '{user} ofereceu energia ao portal... recebo o sub.', 'Que a chakra da inscrição te acompanhe, {user}.', 'Sub registrado nos anais eternos, {user}. Aceito.'],
      raid: ['Uma incursão de {user}! O exército atravessou o portal!', 'Multidões invadiram a dimensão... bem-vindos, soldados de {user}.', 'O céu rachou e {user} trouxe sua legião. Que comece o festival!', 'A raid de {user} ecoa pelos corredores do tempo!', 'Dezesseis assinaturas... não, vinte almas! Bem-vindos.', 'A batalha pela atenção começou! Liderada por {user}.', 'Recebo a chuva de espectadores, {user}. O ritual continua.'],
      bits: ['{amount} fragmentos de luz de {user}... o altar agradece.', 'A energia de {user} cristalizou em {amount} bits. Aceito.', 'Os bits de {user} brilham como estrelas cadentes!', '{amount} moedas celestiais... o pacto se renova, {user}.', 'Recebo o tributo de {user}: {amount} bits de pura essência.', 'Que os {amount} bits de {user} alimentem o portal.', 'A oferenda foi aceita, {user}. {amount} bits reluzem.'],
      cafune: ['O toque de {user} desperta as runas adormecidas...', 'Não! O carinho de {user} está quebrando minha defesa!', 'Aura de afeto detectada. Permito que continue, {user}.', 'Meu selo de gelo rachou... {user} venceu esta rodada.', 'O cafuné de {user} é uma arte proibida... aceito.', 'Sinto o calor de {user} nas minhas runas. Perigoso.', 'Se continuar, {user}, o pacto vira carinho. Aceito.'],
      coffee: ['O elixir de {user} foi aceito pelo altar da cafeteira.', 'Bebo a poção escura oferecida por {user}. Renovo minhas forças.', 'Café: combustível dos rituais. Obrigada, {user}.', 'A essência de {user} entra no cálice... aceito.', 'Um brinde ao pacto, {user}. Que o café nunca esfrie.', 'Recebo o café de {user} com solenidade.', 'O aroma desperta as runas. Obrigada, {user}.'],
      snack: ['{user} oferece um lanche ao portal. O ritual se alimenta.', 'A oferenda comestível de {user} foi aceita.', 'Consumo a essência do lanche, {user}. Energia renovada.', 'Que o banquete de {user} fortaleça nosso vínculo.', 'Alimento sagrado recebido de {user}. Aceito.', 'O lanche de {user} brilha com energia misteriosa.', 'Sacia a fome, desperta a lenda. Obrigada, {user}.'],
      hi: ['Você ousou me chamar, {user}! O portal responde.', 'Olá, viajante {user}. O canal te reconhece.', 'Sua voz ecoa na dimensão, {user}. Estou aqui.', 'Chamado recebido, {user}. Que mensagem traz?', 'A conexão se establishing... {user}, fale.', 'O sinal de {user} chegou até mim. Falando.'],
      gg: ['GG, {user}! Sua lenda foi escrita hoje.', 'Vitória decretada! {user} domina este reino.', 'Bom jogo, {user}. Os deuses dos pixels aprovaram.', 'GG! A aura de {user} brilha mais forte.', 'Que a vitória de {user} seja lembrada por eras.', 'GG, {user}. O destino sorriu para você.'],
      f: ['F... até as lendas se curvam diante da perda, {user}.', 'Respeito, {user}. O silêncio também é um feitiço.', 'Um ponto na história foi apagado. F, {user}.', 'A tristeza ecoa na dimensão. F, {user}.', 'Inclino-me diante do destino, {user}. F.', 'Que a memória de {user} permaneça. F.'],
      water: ['Hidratação, {user}! Até os deuses do portal precisam dela.', 'Beba a água sagrada, {user}. O corpo é o receptáculo.', 'O elixir líquido aguarda, {user}. Beba.', 'A umidade do pacto se evapora... hidrate-se, {user}.', 'Beba água, {user}. A lenda não seca.', 'Gotas de vida para {user}. Beba e renasça.'],
      posture: ['Endireite-se, {user}! A coluna é o eixo do portal.', 'A postura de {user} desalinha os astros. Corrija-a.', 'Sentar-se como um dragão derrotado, {user}? Nunca.', 'Ajuste o eixo, {user}. O destino exige elegância.', 'Postura, {user}. A lenda não se curva.', 'Que sua coluna seja firme como a torre de marfim, {user}.'],
      brb: ['O portal se fecha por um instante. Volto já.', 'A dimensão precisa de mim. Retorno em breve.', 'Suspendo o ritual... aguardem meu retorno.', 'A jornada continua, {user}. Volto já.', 'Ausência temporária do altar. Volto já.', 'Que o caos não reine enquanto estou fora. Volto já.'],
      idle: ['As runas estão em silêncio... por enquanto.', 'O portal dorme. Eu observo.', 'Existe muito mais além desta janela, {user}.', 'Aguardo o próximo sinal do destino.', 'A lenda continua escrevendo-se sozinha.', 'O canal é um ponto entre dois mundos, {user}.'],
    },
    en: {
      follow: ['Another soul sealed a pact with the channel! Welcome, {user}.', 'The seal lit up... {user} entered our network.', 'The portal opened and {user} stepped through. Pact accepted.', 'Your name is carved in the scroll, {user}.', 'Destiny brought {user} here. Let the connection begin.', 'The legend gains a chapter: {user} followed the channel.', 'Your aura is promising, {user}. Welcome to the ritual.'],
      sub: ['{user} sealed a higher contract with the channel! Accepted.', 'The insignia of {user} shines... the sub is accepted.', 'A new dimensional bond forms with {user}.', 'The pact grows stronger! Thank you, {user}.', '{user} offered energy to the portal... sub received.', 'May the chakra of subscription be with you, {user}.', 'Sub recorded in the eternal annals, {user}. Accepted.'],
      raid: ['An incursion from {user}! The army crossed the portal!', 'Crowds invaded the dimension... welcome, soldiers of {user}.', 'The sky split and {user} brought a legion. Let the festival begin!', "The raid of {user} echoes through the halls of time!", 'Sixteen signatures... no, twenty souls! Welcome.', 'The battle for attention began! Led by {user}.', 'I receive the rain of viewers, {user}. The ritual continues.'],
      bits: ['{amount} light fragments from {user}... the altar thanks you.', 'The energy of {user} crystallized into {amount} bits. Accepted.', 'The bits of {user} shine like falling stars!', '{amount} celestial coins... the pact renews, {user}.', 'I receive the tribute of {user}: {amount} bits of pure essence.', 'May the {amount} bits of {user} feed the portal.', 'The offering is accepted, {user}. {amount} bits shimmer.'],
      cafune: ['The touch of {user} awakens the sleeping runes...', 'No! The care of {user} is breaking my defense!', 'Affection aura detected. You may continue, {user}.', 'My ice seal cracked... {user} won this round.', 'The pat of {user} is a forbidden art... I accept.', 'I feel the warmth of {user} in my runes. Dangerous.', 'If you keep going, {user}, the pact becomes care. Accepted.'],
      coffee: ['The elixir of {user} is accepted by the coffee altar.', 'I drink the dark potion offered by {user}. Strength renewed.', 'Coffee: fuel of rituals. Thank you, {user}.', 'The essence of {user} enters the chalice... accepted.', 'A toast to the pact, {user}. May the coffee never cool.', 'I receive the coffee of {user} with solemnity.', 'The aroma awakens the runes. Thank you, {user}.'],
      snack: ['{user} offers a snack to the portal. The ritual feeds.', 'The edible offering of {user} was accepted.', 'I consume the essence of the snack, {user}. Energy renewed.', 'May the feast of {user} strengthen our bond.', 'Sacred food received from {user}. Accepted.', 'The snack of {user} glows with mysterious energy.', 'Sate hunger, awaken legend. Thank you, {user}.'],
      hi: ['You dared to call me, {user}! The portal answers.', 'Hello, traveler {user}. The channel recognizes you.', 'Your voice echoes in the dimension, {user}. I am here.', 'Call received, {user}. What message do you bring?', 'The connection is establishing... {user}, speak.', 'The signal of {user} reached me. Speaking.'],
      gg: ['GG, {user}! Your legend was written today.', 'Victory decreed! {user} rules this realm.', 'Good game, {user}. The pixel gods approved.', 'GG! The aura of {user} burns brighter.', 'May the victory of {user} be remembered for ages.', 'GG, {user}. Destiny smiled at you.'],
      f: ['F... even legends bow before loss, {user}.', 'Respect, {user}. Silence is a spell too.', 'A point in history was erased. F, {user}.', 'Sadness echoes in the dimension. F, {user}.', 'I bow before destiny, {user}. F.', 'May the memory of {user} remain. F.'],
      water: ['Hydration, {user}! Even portal gods need it.', 'Drink the sacred water, {user}. The body is the vessel.', 'The liquid elixir awaits, {user}. Drink.', 'The moisture of the pact evaporates... hydrate, {user}.', 'Drink water, {user}. The legend does not dry out.', 'Drops of life for {user}. Drink and be reborn.'],
      posture: ['Straighten up, {user}! The spine is the axis of the portal.', 'The posture of {user} misaligns the stars. Fix it.', 'Sitting like a defeated dragon, {user}? Never.', 'Adjust the axis, {user}. Destiny demands elegance.', 'Posture, {user}. The legend does not slouch.', 'May your spine be firm as the ivory tower, {user}.'],
      brb: ['The portal closes for a moment. Back soon.', 'The dimension needs me. I return shortly.', 'I suspend the ritual... await my return.', 'The journey continues, {user}. Back soon.', 'Temporary absence from the altar. Back soon.', 'May chaos not reign while I am away. Back soon.'],
      idle: ['The runes are silent... for now.', 'The portal sleeps. I watch.', 'There is much more beyond this window, {user}.', 'I await the next signal from destiny.', 'The legend keeps writing itself.', 'The channel is a point between two worlds, {user}.'],
    },
  },
};

const PERSONA_LABELS = {
  estoica: { pt: 'Estoica / Calma', en: 'Stoic / Calm' },
  genki: { pt: 'Animada / Fofa', en: 'Upbeat / Cute' },
  tsundere: { pt: 'Orgulhosa / Afiada', en: 'Proud / Sharp' },
  dandere: { pt: 'Tímida / Doce', en: 'Shy / Sweet' },
  chuuni: { pt: 'Dramática / Misteriosa', en: 'Dramatic / Mysterious' },
};
export const personaLabel = (id, lang) => PERSONA_LABELS[id]?.[lang === 'en' ? 'en' : 'pt'] || '';
export const PERSONA_IDS = Object.keys(PERSONA_LABELS);

export function getPersona(app) {
  const raw = app?.config?.persona || app?.config?.streamPersona || defaultPersona(app);
  if (PERSONA_BANKS[raw]) return raw;
  return raw === 'estoica' ? 'estoica' : 'genki';
}

const lastPicked = new Map();

export function personaLine(app, key, vars = {}, opts = {}) {
  const en = app?.config?.lang === 'en';
  const id = getPersona(app);
  const raw = PERSONA_BANKS[id]?.[en ? 'en' : 'pt']?.[key];
  let tpl;
  if (Array.isArray(raw)) {
    if (opts.simple || raw.length <= 1) {
      tpl = raw[0];
    } else {
      const slot = `${id}:${en ? 'en' : 'pt'}:${key}`;
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
  const all = {
    doll: app?.getDollName?.(), crow: app?.getCrowName?.(),
    ...vars,
  };
  return tpl.replace(/\{(\w+)\}/g, (_, k) => String(all[k] ?? ''));
}
