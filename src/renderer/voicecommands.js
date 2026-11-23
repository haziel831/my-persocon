// Voice command router. This is the ONLY list of scene actions the LLM is allowed to request
// through a [ACTION:nome] tag. Every handler goes through existing game APIs with guards, so a
// hallucinated or unsafe name can never reach the renderer internals.

const norm = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().trim().replace(/[\s-]+/g, '_').replace(/^_+|_+$/g, '');

const ALIAS = {
  andar: 'andar', walk: 'andar', caminhar: 'andar', ir: 'andar',
  parar: 'parar', stop: 'parar', ficar: 'parar',
  virar: 'virar', turn: 'virar',
  sentar: 'sentar', sit: 'sentar', senta: 'sentar',
  dormir: 'dormir', sleep: 'dormir', descansar: 'dormir',
  acenar: 'acenar', wave: 'acenar',
  dancar: 'dancar', dance: 'dancar',
  usar_movel: 'usar_movel', usar: 'usar_movel', moveis: 'usar_movel', furniture: 'usar_movel',
  tv_ligar: 'tv_ligar', ligar_tv: 'tv_ligar', tv_on: 'tv_ligar', ligar_a_tv: 'tv_ligar',
  tv_desligar: 'tv_desligar', desligar_tv: 'tv_desligar', tv_off: 'tv_desligar',
  tv_editar: 'tv_editar', editar_tv: 'tv_editar',
  roupa: 'roupa', skin: 'roupa', trocar_roupa: 'roupa', acessorio: 'roupa', visual: 'roupa',
  expressao: 'expressao', expression: 'expressao',
  combate_iniciar: 'combate_iniciar', combate: 'combate_iniciar', lutar: 'combate_iniciar',
  combate_pausar: 'combate_pausar', parar_combate: 'combate_pausar',
  defesa: 'defesa', defender: 'defesa',
  ataque: 'ataque', atacar: 'ataque',
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
