// Voice command router. This is the ONLY list of scene actions the LLM is allowed to request
// through a [ACTION:nome] tag. Every handler goes through existing game APIs with guards, so a
// hallucinated or unsafe name can never reach the renderer internals.

const norm = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().trim().replace(/[\s-]+/g, '_').replace(/^_+|_+$/g, '');

const ALIAS = {
  andar: 'andar', walk: 'andar', caminhar: 'andar', ir: 'andar',
  parar: 'parar', stop: 'parar', ficar: 'parar',
  virar: 'virar', turn: 'virar', vira: 'virar', olhar: 'olhar', look: 'olhar',
  ir_para: 'ir_para', ir: 'ir_para', ir_para_a_tv: 'ir_para', go: 'ir_para', walk_to: 'ir_para', move: 'ir_para',
  sentar: 'sentar', sit: 'sentar', senta: 'sentar', sit_down: 'sentar', come_here: 'vem_ca',
  dormir: 'dormir', sleep: 'dormir', descansar: 'dormir', go_to_bed: 'dormir', nap: 'dormir', rest: 'dormir',
  acenar: 'acenar', wave: 'acenar',
  dancar: 'dancar', dance: 'dancar', party: 'dancar',
  usar_movel: 'usar_movel', usar: 'usar_movel', moveis: 'usar_movel', furniture: 'usar_movel',
  banho: 'banho', bath: 'banho', shower: 'banho', wash: 'banho',
  comer: 'comer', eat: 'comer', snack: 'comer', food: 'comer', lanche: 'comer',
  beber: 'beber', drink: 'beber', water: 'beber', agua: 'beber',
  cafe: 'cafe', coffee: 'cafe', make_coffee: 'cafe', espresso: 'cafe',
  estudar: 'estudar', study: 'estudar', read: 'estudar', manga: 'estudar', book: 'estudar',
  jogar: 'jogar', play: 'jogar', games: 'jogar', arcade: 'jogar', slot: 'jogar', claw: 'jogar', gacha: 'jogar',
  tv_ligar: 'tv_ligar', ligar_tv: 'tv_ligar', tv_on: 'tv_ligar', ligar_a_tv: 'tv_ligar',
  tv: 'tv_ligar', watch: 'tv_ligar', watch_tv: 'tv_ligar', turn_on_tv: 'tv_ligar', assistir_tv: 'tv_ligar',
  tv_desligar: 'tv_desligar', desligar_tv: 'tv_desligar', tv_off: 'tv_desligar',
  tv_editar: 'tv_editar', editar_tv: 'tv_editar',
  roupa: 'roupa', skin: 'roupa', trocar_roupa: 'roupa', acessorio: 'roupa', visual: 'roupa',
  expressao: 'expressao', expression: 'expressao',
  combate_iniciar: 'combate_iniciar', combate: 'combate_iniciar', lutar: 'combate_iniciar',
  combate_pausar: 'combate_pausar', parar_combate: 'combate_pausar',
  defesa: 'defesa', defender: 'defesa',
  ataque: 'ataque', atacar: 'ataque',
  clima: 'clima', weather: 'clima',
  treinar_doll: 'treinar_doll', train_doll: 'treinar_doll',
  treinar_corvo: 'treinar_corvo', train_crow: 'treinar_corvo',
  cafune: 'cafune', head_pat: 'cafune', pat: 'cafune', pet: 'cafune',
};

const FURN_ALIAS = {
  pc: 'escrivaninha', computador: 'escrivaninha', escrivaninha: 'escrivaninha',
  cadeira: 'almofada', almofada: 'almofada', cama: 'cama', sofa: 'cama',
  console: 'videogame', videogame: 'videogame', tv: 'videogame',
  mesa: 'mesa_cafe', impressora: 'impressora', maquina: 'venda_comida',
};

const EXPRESSION = {
  feliz: 'happy', alegre: 'happy', corada: 'happy', timida: 'happy',
  brava: 'angry', raiva: 'angry', irritada: 'angry',
  surpresa: 'surprised', espantada: 'surprised',
  pensativa: 'sad', triste: 'sad',
};

const ACTIONS = {
  andar(app) {
    const p = app.pet;
    if (!p || p.dead || p.mode !== 'ground') return false;
    const W = app.world?.width || innerWidth;
    const to = Math.min(W - p.P, Math.max(p.P, p.x + (p.dir || 1) * p.P * 2.5));
    return !!p.goTo?.(to);
  },
  parar(app) {
    if (!app.pet || app.pet.dead) return false;
    app.pet.pause();
    return true;
  },
  virar(app) {
    const p = app.pet;
    if (!p || p.dead) return false;
    p.dir = -(p.dir || 1);
    p.anim?.('idle', { facing: p.dir > 0 ? 'right' : 'left' });
    return true;
  },
  sentar(app) {
    if (!app.pet || app.pet.dead) return false;
    app.pet.requestGround?.('sit');
    return true;
  },
  dormir(app) {
    if (!app.pet || app.pet.dead) return false;
    app.pet.requestGround?.('sleepLong');
    return true;
  },
  acenar(app) {
    const p = app.pet;
    if (!p || p.dead) return false;
    if (app.view?.animator?.has?.('wave')) p.anim?.('wave', { facing: 'front' });
    else p.startGround?.('emote');
    app.emoticons?.show?.('happy', true);
    return true;
  },
  dancar(app) {
    if (!app.pet || app.pet.dead) return false;
    app.startMode?.('jam');
    return true;
  },
  usar_movel(app, arg) {
    const { game, toys, pet } = app;
    if (!game || !toys || !pet || pet.dead) return false;
    const key = norm(arg).replace(/^o_|^a_/, '');
    let id = FURN_ALIAS[key];
    if (!id && key) {
      id = Object.keys(game.toys).find((k) => k.includes(key) && game.toys[k].placed && toys.here(game.toys[k]));
    }
    const t = game.toys[id];
    if (!t?.placed || t.broken || !toys.here(t)) return false;
    const go = () => toys.play(id, pet, { forced: true });
    if (pet.mode === 'ground' && pet.goTo?.(toys.spot(id), go)) return true;
    go();
    return true;
  },
  tv_ligar(app) {
    if (!app.tvWatch?.tv) return false;
    app.tvWatch.start();
    return true;
  },
  tv_desligar(app) {
    if (!app.tvWatch?.on) return false;
    app.tvWatch.stop();
    return true;
  },
  tv_editar(app) {
    if (!app.toys) return false;
    if (app.toys.editing) app.toys.stopEdit();
    else app.toys.startEdit();
    return true;
  },
  roupa(app) {
    app.openObjects?.();
    return true;
  },
  expressao(app, arg) {
    if (!app.pet || app.pet.dead) return false;
    const ex = EXPRESSION[norm(arg)] || 'happy';
    app.view?.setExpression?.(ex);
    app.emoticons?.show?.(ex === 'angry' ? 'angry' : ex === 'surprised' ? 'surprised' : 'happy', true);
    return true;
  },
  combate_iniciar(app) {
    if (!app.melee || app.melee.active || app.pet?.dead) return false;
    return !!app.melee.enter?.('fight');
  },
  combate_pausar(app) {
    return !!app.melee?.stop?.();
  },
  defesa(app) {
    const p = app.pet;
    if (!p || p.dead) return false;
    if (app.view?.animator?.has?.('guard')) p.anim?.('guard', { facing: 'front' });
    else p.setCombat?.(true);
    return true;
  },
  ataque(app) {
    if (!app.melee || app.pet?.dead) return false;
    if (app.melee.active) return !!app.melee.chainAttack?.();
    return !!app.melee.enter?.('fight');
  },
  banho(app) {
    if (!app.care || app.pet?.dead) return false;
    return !!app.care.bath?.();
  },
  comer(app) {
    const g = app.game;
    const id = g?.herBag?.()?.find((x) => x) || null;
    if (!id || !g?.useFromBag) return false;
    return !!g.useFromBag(id);
  },
  beber(app) {
    const g = app.game;
    const bag = g?.herBag?.() || [];
    const id = bag.find((x) => /bebida|drink|agua|water|cafe|cha/i.test(String(x))) || bag[0];
    if (!id || !g?.useFromBag) return false;
    return !!g.useFromBag(id);
  },
  cafe(app) {
    return !!app.pomodoro?.coffeeBreak?.();
  },
  estudar(app, arg) {
    const id = /livro|book/.test(arg) ? 'livro' : 'manga';
    const t = app.game?.toys?.[id];
    if (!t?.placed || t.broken || !app.toys?.here?.(t)) return false;
    app.toys.play(id, app.pet);
    return true;
  },
  jogar(app, arg) {
    const wanted = /gacha/.test(arg) ? 'gacha' : /slot|caca|claw/.test(arg) ? 'slot' : 'videogame';
    const t = app.game?.toys?.[wanted];
    if (!t?.placed || t.broken || !app.toys?.here?.(t)) return false;
    app.toys.play(wanted, app.pet, { forced: true });
    return true;
  },
  clima(app, arg) {
    const kind = /chuva|rain/.test(arg) ? 'chuva' : /neve|snow/.test(arg) ? 'neve'
      : /vagalum|firefl/.test(arg) ? 'vagalumes' : 'sakura';
    if (!app.weather) return false;
    app.weather.start(kind);
    return true;
  },
  treinar_doll(app) {
    const brain = app.doll?.brain;
    if (!brain) return false;
    return !!brain.teachSkill?.(brain.nextSkill?.()) || !!brain.perform?.('yoga');
  },
  treinar_corvo(app) {
    return !!app.crow?.startDuo?.('treinar', true);
  },
  cafune(app) {
    if (!app.pet || app.pet.dead) return false;
    app.setHand?.('pat');
    app.pet.react?.('love');
    return true;
  },
  vem_ca(app) {
    const p = app.pet;
    if (!p || p.dead) return false;
    p.anim?.('idle', { facing: 'front' });
    return !!p.goTo?.((app.world?.width || innerWidth) / 2);
  },
  ir_para(app, arg) {
    const p = app.pet;
    if (!p || p.dead || p.mode !== 'ground') return false;
    const W = app.world?.width || innerWidth;
    let x = W / 2;
    if (/esquerda|left/.test(arg)) x = p.P * 1.2;
    else if (/direita|right/.test(arg)) x = W - p.P * 1.2;
    else if (/tv|televisao|television/.test(arg)) x = app.toys?.tvRect?.()?.ox ?? W / 2;
    else if (/pc|escrivaninha|computer|desk/.test(arg)) x = app.game?.toys?.escrivaninha?.x ?? W / 2;
    else if (/cama|bed/.test(arg)) x = app.game?.toys?.cama?.x ?? W / 2;
    return !!p.goTo?.(Math.min(W - p.P, Math.max(p.P, x)));
  },
  olhar(app, arg) {
    const p = app.pet;
    if (!p || p.dead) return false;
    const facing = /tras|back/.test(arg) ? 'back'
      : /esquerda|left/.test(arg) ? 'left'
        : /direita|right/.test(arg) ? 'right' : 'front';
    p.anim?.('idle', { facing, restart: true });
    return true;
  },
};

// Catalog injected into the system prompt so the LLM can pick a real action name.
export function actionPrompt(lang = 'pt') {
  const names = Object.keys(ACTIONS).join(', ');
  return lang === 'en'
    ? `You may also control the scene. If the creator's order requires an action, end your reply with exactly one tag from this list: [ACTION:name] — names: ${names}. Never invent names. Keep the tag in addition to your spoken answer.`
    : `Você também pode agir na cena. Se a ordem do criador pedir uma ação, termine sua resposta com exatamente uma tag desta lista: [ACTION:nome] — nomes: ${names}. Nunca invente nomes. Mantenha a tag além da resposta falada.`;
}

// Removes the tag from the spoken text so she never says "[ACTION:...]" out loud.
export function parseAction(text) {
  const s = String(text || '');
  const m = /\[ACTION\s*:\s*([^\]]+)\]/i.exec(s);
  if (!m) return { text: s.trim(), name: '', arg: '' };
  const [name, ...rest] = m[1].trim().split(/\s+/);
  return {
    text: s.replace(m[0], '').replace(/\s+/g, ' ').trim(),
    name: norm(name),
    arg: norm(rest.join(' ')),
  };
}

export function runAction(name, arg, app) {
  const key = ALIAS[norm(name)];
  const fn = key && ACTIONS[key];
  if (!fn || !app) return false;
  try { return !!fn(app, String(arg || '')); } catch { return false; }
}

export const ACTION_NAMES = Object.keys(ACTIONS);

// Natural-language commands, Portuguese and English. Accents, case, punctuation and polite
// prefixes ("Aghata, please...", "can you...", "por favor...") are ignored on purpose.
const NATURAL = [
  { re: /^(?:(?:watch|turn on|switch on|start|open)\s+)?(?:the\s+)?tv$|^assistir\s+(?:a\s+)?tv$|^ver\s+(?:a\s+)?tv$|^ligar\s+(?:a\s+)?tv$/, name: 'tv_ligar' },
  { re: /^(?:turn off|switch off|close|stop)\s+(?:the\s+)?tv$|^desligar\s+(?:a\s+)?tv$/, name: 'tv_desligar' },
  { re: /^(?:take a\s+)?(?:bath|shower|wash)(?:\s+now)?$|^tomar banho$|^banho$/, name: 'banho' },
  { re: /^(?:go to sleep|go to bed|sleep|nap|rest)(?:\s+now)?$|^dormir$|^descansar$/, name: 'dormir' },
  { re: /^(?:eat|have food|snack|have a snack)(?:\s+now)?$|^comer$|^lanche$/, name: 'comer' },
  { re: /^(?:drink|water|have water|have a drink)(?:\s+now)?$|^beber$|^agua$/, name: 'beber' },
  { re: /^(?:make coffee|coffee|espresso)(?:\s+now)?$|^fazer cafe$|^cafe$/, name: 'cafe' },
  { re: /^(?:dance|party)(?:\s+now)?$|^dancar$|^danca$/, name: 'dancar' },
  { re: /^(?:study|read|read manga|manga|book)(?:\s+now)?$|^estudar$|^ler$|^manga$/, name: 'estudar' },
  { re: /^(?:play games?|play|arcade|gacha|slot|claw machine|claw)(?:\s+now)?$|^jogar$|^gacha$|^caca-niqueis$/, name: 'jogar' },
  { re: /^(?:sit down|sit)(?:\s+here)?(?:\s+now)?$|^sentar$/, name: 'sentar' },
  { re: /^come here$|^vem ca$/, name: 'vem_ca' },
  { re: /^(?:stop|cancel)$|^parar$/, name: 'parar' },
  { re: /^(?:change the\s+)?weather$|^clima$/, name: 'clima' },
  { re: /^train\s+(?:the\s+)?doll$|^treinar\s+(?:a\s+)?doll$/, name: 'treinar_doll' },
  { re: /^train\s+(?:the\s+)?crow$|^treinar\s+(?:o\s+)?corvo$/, name: 'treinar_corvo' },
  { re: /^(?:head pat|pat me|pet me)$|^cafune$/, name: 'cafune' },
];

const REPLY_KEY = {
  tv_ligar: 'tv', tv_desligar: 'tv_off', banho: 'banho', dormir: 'dormir', comer: 'comer', beber: 'beber',
  cafe: 'cafe', dancar: 'dancar', estudar: 'estudar', jogar: 'jogar', sentar: 'sentar', virar: 'virar',
  parar: 'parar', clima: 'clima', treinar_doll: 'doll', treinar_corvo: 'crow', cafune: 'cafune', vem_ca: 'sentar',
  ir_para: 'sentar', olhar: 'virar',
};

export function commandReplyKey(name) {
  return REPLY_KEY[name] || 'default';
}

export function normalizeCommand(text) {
  let s = String(text || '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[.!?,;:]+/g, ' ')
    .replace(/\*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  for (let i = 0; i < 2; i++) {
    s = s.replace(/^(?:ai|aghata|agatha|ninna|persocon|voce|you)\s*[,:]?\s*/, '');
    s = s.replace(/^(?:please|por favor|can you|could you|would you|will you|voce pode|voce poderia|pode|poderia|me|pra|para)\s+/, '');
  }
  return s.replace(/\s+/g, ' ').trim();
}

// Directions and fuller phrases: an order like "vai até a TV e senta" must be obeyed at once.
// Ordered from the most specific to the most generic so the right action wins.
const LOOSE = [
  { re: /\b(?:train|treinar)\b.*\b(?:doll|bone)\b/, name: 'treinar_doll' },
  { re: /\b(?:train|treinar)\b.*\b(?:crow|corvo)\b/, name: 'treinar_corvo' },
  { re: /\b(?:turn off|desligar)\b.*\btv\b/, name: 'tv_desligar' },
  { re: /\b(?:turn on|watch|ligar|assistir)\b.*\btv\b|^\btv\b/, name: 'tv_ligar' },
  { re: /\b(?:banho|bath|shower|wash|lavar)\b/, name: 'banho' },
  { re: /\b(?:dormir|sleep|bed|nap|descansar|rest)\b/, name: 'dormir' },
  { re: /\b(?:cafe|coffee|espresso)\b/, name: 'cafe' },
  { re: /\b(?:comer|eat|lanche|snack|food|fome)\b/, name: 'comer' },
  { re: /\b(?:beber|drink|water|agua|sed)\b/, name: 'beber' },
  { re: /\b(?:dancar|danca|dance|party|danc)\b/, name: 'dancar' },
  { re: /\b(?:estudar|ler|manga|study|read|book|livro)\b/, name: 'estudar' },
  { re: /\b(?:jogar|play|game|arcade|gacha|slot|claw|niqueis)\b/, name: 'jogar' },
  { re: /\b(?:sentar|sit)\b/, name: 'sentar' },
  { re: /\b(?:parar|stop|cancel)\b/, name: 'parar' },
  { re: /\b(?:clima|weather)\b/, name: 'clima' },
  { re: /\b(?:cafune|head pat|pat me|pet me|carinho)\b/, name: 'cafune' },
  { re: /\b(?:vem ca|come here|vem aqui)\b/, name: 'vem_ca' },
  { re: /\b(?:go|walk|move|ir|anda|vai)\b.*\b(?:tv|esquerda|direita|left|right|pc|cama|bed)\b/, name: 'ir_para', arg: true },
  { re: /\b(?:olhar|look|vira|turn)\b.*\b(?:frente|front|esquerda|left|direita|right|tras|back|camera)\b/, name: 'olhar', arg: true },
];

export function matchNaturalCommand(text) {
  const s = normalizeCommand(text);
  if (!s || s.length > 120) return null;
  for (const entry of NATURAL) {
    if (entry.re.test(s)) return { name: entry.name, arg: '', key: REPLY_KEY[entry.name] || 'default' };
  }
  for (const entry of LOOSE) {
    if (entry.re.test(s)) {
      return { name: entry.name, arg: entry.arg ? s : '', key: REPLY_KEY[entry.name] || 'default' };
    }
  }
  return null;
}
