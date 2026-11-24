// Brincadeiras (minigames) played with the Persocon on a full-screen overlay. Each one opens with
// a short guide (can be turned off per game) and ends with mood, her level in the game and, on a win,
// the game's own bonus (MG_BONUS).
import { RHYTHM_TRACKS } from './swsongs.js';

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (list) => list[Math.floor(Math.random() * list.length)];
const clamp = (v, a, b) => Math.min(Math.max(v, a), b);
const shuffle = (list) => {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export const MINIGAMES = [
  ['esconde', '🙈', 'Esconde-esconde', 'Ela se esconde e você procura', [
    'Feche os olhos: a Persocon vai se esconder atrás de um dos objetos.',
    'Clique no objeto onde você acha que ela está.',
    'Quanto mais rápido achar, mais pontos. Se demorar, um objeto começa a tremer de risada.',
    '3 rodadas.']],
  ['batata', '🥔', 'Batata quente', 'Passe a batata antes de explodir', [
    'Quando a batata estiver com você, ela segue o mouse: clique na Persocon para devolver.',
    'Cada passe deixa o tempo mais curto. Se segurar demais, queima a mão!',
    'O pavio é secreto: quem estiver com a batata quando o pavio acabar perde.']],
  ['ritmo', '🎶', 'Siga o ritmo', 'Synthwave: setas no beat com lasers', [
    'Visual synthwave: setas neon descem nas 4 pistas. Aperte ← ↑ ↓ → (ou os botões) na linha de julgamento.',
    'Lasers laterais e a batida acompanham a música energética. Acertos em sequência fazem combo.',
    '40 segundos · quanto maior o combo, mais ela se empolga.']],
  ['pesca', '🎣', 'Pescaria', 'Fisgue na hora certa', [
    'A Persocon joga a linha na água ao lado dela.',
    'Quando a boia afundar e aparecer "!", clique em qualquer lugar para fisgar.',
    'Clicar cedo demais espanta o peixe. Peixes raros valem mais. 60 segundos.']],
  ['copos', '🥤', 'Adivinhe o copo', 'Siga a moeda embaixo dos copos', [
    'Ela mostra a moeda embaixo de um copo e embaralha.',
    'Clique no copo onde a moeda está.',
    'Cada rodada embaralha mais rápido, e mais ainda quanto maior a afeição. 5 rodadas.']],
  ['estatua', '🗿', 'Estátua', 'Congele a Persocon quando a música parar', [
    'Ela dança enquanto a música toca.',
    'Quando a música parar, clique nela rápido para ela virar estátua.',
    'Clicar com a música tocando ou demorar demais custa uma vida. 3 vidas.']],
  ['desenho', '✏️', 'Desenho', 'Desenhe e ela tenta adivinhar', [
    'Você recebe uma palavra secreta: desenhe-a no quadro.',
    'Clique em "Pronto!" e a Persocon tenta adivinhar.',
    'Desenhos mais caprichados ajudam ela a acertar. 3 rodadas.']],
  ['bolhas', '🧼', 'Bolhas de sabão', 'Estoure mais bolhas que ela', [
    'Três máquinas espalhadas pela tela soltam bolhas. Clique nelas para estourar.',
    'Bolhas douradas valem 5 pontos. Ela corre, pula e usa o gancho para estourar uma linha inteira.',
    'Quem estourar mais em 1 minuto vence.']],
  ['jokenpo', '✊', 'Pedra, papel e tesoura', 'Melhor de 5, com placar', [
    'Escolha pedra, papel ou tesoura.',
    'Pedra quebra tesoura, tesoura corta papel, papel embrulha pedra.',
    'Quem fizer 3 pontos primeiro vence. Ela presta atenção nas suas escolhas!']],
  ['tesouro', '🗺️', 'Caça ao tesouro', 'Quente ou frio pela tela', [
    'Há 3 tesouros escondidos na tela.',
    'Mova o mouse: o termômetro e a Persocon dizem se está quente ou frio.',
    'Clique para cavar. Você tem 10 escavações e 90 segundos.']],
].map(([id, icon, name, desc, guide]) => ({ id, icon, name, desc, guide }));

const byId = (id) => MINIGAMES.find((g) => g.id === id);

// Shared synthwave palette + beeps (same language as "Siga o ritmo").
const SW = { pink: '#ff2d95', cyan: '#00f0ff', lime: '#b8ff3c', amber: '#ffb347', violet: '#7a5cff', bg: '#0b0218', panel: '#1a0540' };
const swBeep = (app, kind = 'hit', k = 1) => {
  const s = app.sound;
  if (!s?.tone8) return;
  const v = 0.055 * k;
  if (kind === 'hit') {
    s.tone8(660, 990, 0.08, 'sawtooth', v);
    s.tone8(1320, 1760, 0.05, 'square', v * 0.5);
  } else if (kind === 'ok') {
    s.tone8(523, 784, 0.12, 'sawtooth', v);
    s.tone8(784, 1175, 0.14, 'square', v * 0.55);
  } else if (kind === 'bad') {
    s.tone8(180, 70, 0.14, 'sawtooth', v * 0.9);
  } else if (kind === 'tick') s.tone8(2400, 1800, 0.03, 'square', v * 0.45);
  else if (kind === 'warn') s.tone8(880, 1320, 0.1, 'square', v);
  else if (kind === 'boom') {
    s.tone8(90, 40, 0.22, 'sawtooth', v * 1.2);
    s.tone8(220, 80, 0.18, 'triangle', v * 0.7);
  } else if (kind === 'pass') s.tone8(440, 880, 0.06, 'square', v * 0.7);
  else if (kind === 'start') {
    [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => s.tone8(f, f * 1.5, 0.1, 'sawtooth', v), i * 70));
  }
};

// Affection needed to unlock each minigame (they stay hidden until then).
export const MG_UNLOCK = { jokenpo: 0, copos: 100, bolhas: 200, pesca: 300, batata: 400, estatua: 500, esconde: 600, ritmo: 700, desenho: 800, tesouro: 900 };
export const mgUnlocked = (id, affection) => (affection ?? 0) >= (MG_UNLOCK[id] ?? 0);

// Her level in each game: +1 every 3 wins (max 10); she plays better as it goes up.
export const mgLevel = (rec) => Math.min(10, 1 + Math.floor((rec?.wins || 0) / 3));
export const BONUS_DAILY = 3;
const BONUS_COOLDOWN = 15 * 60000;
// Buffs are refreshed, never stacked.
const setBuff = (app, name, secs) => { (app.pet.buffs ||= {})[name] = Date.now() + secs * 1000; };
const giveBox = (app, id) => {
  app.game.inventory[id] = app.game.count(id) + 1;
  return `🎁 +1 ${id === 'caixa_rara' ? 'Caixa Rara' : 'Caixa Comum'}`;
};
// What a win gives in each game (at most BONUS_DAILY a day per game, 15 min apart): [menu text, apply(app, score, s) → toast].
export const MG_BONUS = {
  jokenpo: ['Trato feito: a próxima comida que ela não gosta não tira Humor', (app) => { setBuff(app, 'deal', 3 * 3600); return '✊ Trato feito!'; }],
  copos: ['+5% de sorte na Gacha, na Slot e nas caixas por 30 min', (app) => { setBuff(app, 'luck', 1800); return '🍀 Sorte +5% por 30 min'; }],
  bolhas: ['+25 de Higiene', (app) => { app.pet.adjust({ hygiene: 25 }); return '🧼 +25 Higiene'; }],
  pesca: ['Peixe assado no Inventário (2 com 50 pts)', (app, score) => {
    const n = score >= 50 ? 2 : 1;
    app.game.inventory.peixe = app.game.count('peixe') + n;
    return `🐟 +${n} Peixe assado`;
  }],
  batata: ['Zera o tédio: cafuné e brinquedos voltam a render Humor cheio', (app) => { app.pet.bored = {}; return '🥔 Tédio zerado!'; }],
  estatua: ['Comportada por 1h: não mexe no cursor nem nos ícones', (app) => { setBuff(app, 'behaved', 3600); return '🗿 Comportada por 1h'; }],
  esconde: ['Ela acha uma Caixa Comum', (app) => giveBox(app, 'caixa_comum')],
  ritmo: ['Ela aprende um passo novo ao ouvir música (até 4)', (app) => {
    const p = app.game.profile;
    if ((p.jamMoves || 0) >= 4) return '🎶 Ela já sabe todos os passos';
    app.pet.jamMoves = p.jamMoves = (p.jamMoves || 0) + 1;
    return `🎶 Passo novo ao ouvir música! (${p.jamMoves}/4)`;
  }],
  desenho: ['Seu melhor desenho vai para o Álbum', (app, score, s) => {
    if (!s.art) return null;
    const fun = (app.game.profile.fun ||= {});
    const photos = (fun.photos ||= []);
    photos.push({ src: s.art, at: Date.now(), drawing: true });
    while (photos.length > 12) photos.shift();
    return '✏️ Desenho guardado no Álbum';
  }],
  tesouro: ['Caixa Comum (achando os 3 tesouros: Caixa Rara)', (app, score, s) => giveBox(app, s.found >= 3 ? 'caixa_rara' : 'caixa_comum')],
};

export class Minigames {
  constructor(app) {
    this.app = app;
    this.active = null;
    this.guide = null;
    this.mouse = { x: innerWidth / 2, y: innerHeight / 2 };
  }

  get P() {
    return this.app.pet.P;
  }

  // ---------- start / guide / end ----------

  start(id) {
    const { pet } = this.app;
    if (this.active || this.guide || pet.dead || pet.chase || pet.action === 'sleep' || !byId(id) || !mgUnlocked(id, pet.affection)) return;
    if (this.app.care?.refuse()) return;
    if (this.app.config.guidesOff?.[id]) return this.begin(id);
    this.showGuide(id);
  }

  showGuide(id) {
    const g = byId(id);
    const el = document.createElement('div');
    el.className = 'mg-guide hitzone';
    const card = div('mg-card', el);
    div('mg-title', card).textContent = `${g.icon} ${g.name}`;
    const ul = document.createElement('ul');
    for (const line of g.guide) ul.append(Object.assign(document.createElement('li'), { textContent: line }));
    card.append(ul);
    const res = document.createElement('div');
    res.className = 'mg-guide-result';
    const bonusText = MG_BONUS[id] ? MG_BONUS[id][0] : (this.app.config?.lang === 'en' ? 'no special bonus (default Mood/Energy only)' : 'sem bônus especial (apenas Humor/Energia padrão)');
    const en = this.app.config?.lang === 'en';
    res.innerHTML = `<b>${en ? 'If you win' : 'Se você vencer'}</b>: +10 Humor${MG_BONUS[id] ? ` + (${bonusText})` : ''}<br><b>${en ? 'If you lose' : 'Se você perder'}</b>: +5 Humor, -6 Energia (Persocon).`;
    card.append(res);
    const label = document.createElement('label');
    const box = Object.assign(document.createElement('input'), { type: 'checkbox' });
    label.append(box, ' Não mostrar novamente');
    card.append(label);
    const row = div('mg-row', card);
    const close = (go) => {
      if (box.checked) this.app.setOption('guidesOff', { ...(this.app.config.guidesOff || {}), [id]: true });
      el.remove();
      this.guide = null;
      this.app.uiChanged();
      if (go) this.begin(id);
    };
    row.append(button('Cancelar', () => close(false)), button('Começar!', () => close(true), 'primary'));
    el.addEventListener('pointerdown', (e) => e.stopPropagation());
    document.body.append(el);
    this.guide = el;
    this.app.sound.play('blip', { volume: 0.4 });
    this.app.uiChanged();
  }

  begin(id) {
    const { pet, modes, sound } = this.app;
    if (this.active || pet.dead) return;
    if (pet.activity) modes.stop();
    if (pet.toyPlay) pet.endToy(true);
    const root = document.createElement('div');
    root.className = `mg mg-${id} hitzone`;
    const hud = div('mg-hud', root);
    const g = byId(id);
    div('mg-name', hud).textContent = `${g.icon} ${g.name}`;
    const info = div('mg-info', hud);
    hud.append(button('✕', () => this.finish(0, { quit: true }), 'mg-quit'));
    root.addEventListener('pointermove', (e) => { this.mouse = { x: e.clientX, y: e.clientY }; });
    root.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      this.mouse = { x: e.clientX, y: e.clientY };
      if (e.button === 0 && !e.target.closest('button, .mg-panel')) this.s.click?.(e.clientX, e.clientY, e);
    });
    root.addEventListener('contextmenu', (e) => e.preventDefault());
    document.body.append(root);
    this.keys = (e) => this.s?.key?.(e);
    window.addEventListener('keydown', this.keys);
    this.active = { id, root, info, timers: [] };
    this.s = {};
    pet.mini = () => this.pose(this.s.pose || 'idle');
    pet.funNow?.();
    if (pet.mode === 'ground') pet.chooseNext();
    swBeep(this.app, 'start');
    this.app.focus?.();
    this.app.uiChanged();
    this[id]();
  }

  // score: points for the profile; coins are a share of it. opts: { win, text, quit }
  finish(score, opts = {}) {
    const a = this.active;
    if (!a) return;
    const played = this.s;
    this.s.cleanup?.();
    window.removeEventListener('keydown', this.keys);
    a.root.remove();
    this.active = null;
    this.s = {};
    const { pet, game, sound } = this.app;
    this.petCanvas().style.opacity = '';
    pet.mini = null;
    if (!opts.quit) {
      const rec = ((game.profile.minigames ||= {})[a.id] ||= { plays: 0, best: 0, wins: 0 });
      const lv = mgLevel(rec);
      rec.plays++;
      if (opts.win) rec.wins++;
      const levelUp = mgLevel(rec) > lv;
      const best = score > rec.best;
      if (best) rec.best = score;
      // No affection from minigames; the same game played over and over gets boring (less Humor).
      pet.adjust({ mood: opts.win ? 10 : 5, energy: -6 }, `mini:${a.id}`);
      const bonus = opts.win ? this.bonus(a.id, score, played) : null;
      sound.play(opts.win ? 'ok' : 'cancel', { volume: 0.6 });
      this.toast(`${opts.text || (opts.win ? 'Vitória!' : 'Fim de jogo')} · ${score} pts${best ? ' · recorde!' : ''}${bonus?.text ? ` · ${bonus.text}` : ''}`);
      if (levelUp) setTimeout(() => this.toast(`⬆️ Nível ${mgLevel(rec)} em ${byId(a.id).name}: ela joga melhor agora!`), 1600);
      game.changed();
      pet.emit('miniEnd', { id: a.id, win: !!opts.win, score, best, levelUp, bonus: !!bonus?.got });
    }
    if (pet.mode === 'ground' && !pet.dead) {
      if (opts.quit) pet.chooseNext();
      else this.react(opts.win ? 'smug' : 'pouting');
    }
    this.app.uiChanged();
  }

  // Bonus wins left today and minutes until the next one, per game.
  bonusLeft(id) {
    const p = this.app.game.profile;
    const today = new Date().toDateString();
    const d = (p.mgDaily ||= {});
    if (d.day !== today) Object.assign(d, { day: today, n: {} });
    const at = (p.mgBonusAt ||= {})[id] || 0;
    return { left: Math.max(0, BONUS_DAILY - (d.n[id] || 0)), wait: Math.max(0, at + BONUS_COOLDOWN - Date.now()) };
  }

  bonus(id, score, s) {
    const b = MG_BONUS[id];
    if (!b) return null;
    const { left, wait } = this.bonusLeft(id);
    if (!left) return { text: 'bônus do dia esgotado' };
    if (wait) return { text: `próximo bônus em ${Math.ceil(wait / 60000)} min` };
    const text = b[1](this.app, score, s);
    if (!text) return null;
    const p = this.app.game.profile;
    p.mgDaily.n[id] = (p.mgDaily.n[id] || 0) + 1;
    p.mgBonusAt[id] = Date.now();
    p.mgBonusTotal = (p.mgBonusTotal || 0) + 1;
    return { text, got: true };
  }

  // 0..1 from her level in this game (harder opponent / better teammate).
  skill(id) {
    return (mgLevel(this.app.game.profile.minigames?.[id]) - 1) / 9;
  }

  toast(text, img = null) {
    const el = div('mg-toast', document.body);
    el.textContent = text;
    if (img) {
      const i = document.createElement('img');
      i.src = img;
      i.className = 'mg-toast-ico';
      el.prepend(i);
    }
    setTimeout(() => el.remove(), 3200);
  }

  update(dt, hidden) {
    if (!this.active) return;
    const s = this.s;
    if (s.poseT > 0 && (s.poseT -= dt) <= 0) this.pose(s.pose || 'idle');
    s.tick?.(dt, hidden);
  }

  // ---------- helpers ----------

  petCanvas() {
    return document.getElementById('pet');
  }

  info(text) {
    if (this.active) this.active.info.textContent = text;
  }

  say(text) {
    if (this.app.config.speech !== false) this.app.speech?.say(text, 1.8);
  }

  float(x, y, text) {
    this.app.toys.furn.floatText(x, y, text);
  }

  onPet(x, y) {
    const { pet } = this.app;
    if (pet.x === null) return false;
    return this.app.overPet(x, y) || Math.hypot(x - pet.x, y - (pet.y - this.P * 0.5)) < this.P * 0.42;
  }

  head() {
    const { pet } = this.app;
    return this.app.head || { x: pet.x, y: pet.y - this.P };
  }

  // Ground pose for the pet while a game runs: idle, dance, happy, sad or freeze.
  pose(kind, dur = 0) {
    const { pet } = this.app;
    this.s.pose = dur ? this.s.pose : kind;
    this.s.poseT = dur;
    if (pet.mode !== 'ground' || pet.dead) return;
    pet.action = 'mini';
    pet.timer = Infinity;
    const facing = this.s.facing || 'front';
    if (kind === 'dance') pet.anim((this.s.danceClip ||= pet.pickClip(['danca'], [...pet.emotes, 'idle'])), { facing, restart: true, speed: pet.danceSpeed || 1 });
    else if (kind === 'freeze') pet.anim(this.s.danceClip || 'idle', { facing, speed: 0 });
    else if (kind === 'happy' || kind === 'smug' || kind === 'laughing') pet.anim(pet.pickClip(['emote_pos', 'emote'], ['idle']), { facing, restart: true });
    else if (kind === 'sad' || kind === 'pouting') pet.anim(pet.pickClip(['emote_neg'], ['idle']), { facing, restart: true });
    else pet.anim('idle', { facing });
  }

  react(kind) {
    const { pet } = this.app;
    if (pet.mode !== 'ground' || pet.dead) return;
    pet.anim(kind === 'happy' ? pet.pickClip(['emote_pos', 'emote'], ['idle']) : pet.pickClip(['emote_neg'], ['idle']), { facing: 'front', restart: true });
    pet.timer = 1.6;
  }

  later(sec, fn) {
    const a = this.active;
    const id = setTimeout(() => this.active === a && fn(), sec * 1000);
    a.timers.push(id);
  }

  panel(cls = '') {
    const p = div(`mg-panel ${cls}`, this.active.root);
    p.addEventListener('pointerdown', (e) => e.stopPropagation());
    return p;
  }

  // ---------- 1. Esconde-esconde ----------

  esconde() {
    const { pet, world } = this.app;
    const P = this.P;
    const s = this.s;
    s.round = 0;
    s.score = 0;
    const cover = div('mg-cover', this.active.root);
    const spotsEl = [];
    const newRound = () => {
      s.round++;
      for (const e of spotsEl.splice(0)) e.remove();
      const ground = pet.mode === 'ground' ? pet.validateGround() : null;
      const x1 = Math.max(P * 0.5, ground ? ground.x1 + P * 0.4 : P * 0.5);
      const x2 = Math.min(world.width - P * 0.5, ground ? ground.x2 - P * 0.4 : world.width - P * 0.5);
      const y = ground ? pet.y : this.app.toys.floorY();
      const n = clamp(Math.floor((x2 - x1) / (P * 0.8)), 2, 5);
      const icons = shuffle(['📦', '🧊', '🔮', '📺', '🚪', '🗼', '💎', '🎁']);
      const hues = [SW.pink, SW.cyan, SW.lime, SW.amber, SW.violet];
      s.spots = [];
      for (let i = 0; i < n; i++) {
        const x = x1 + ((i + 0.5) / n) * (x2 - x1) + rand(-P * 0.1, P * 0.1);
        const el = div('mg-spot', this.active.root);
        el.innerHTML = `<i>${icons[i]}</i>`;
        el.style.setProperty('--sw', hues[i % hues.length]);
        el.style.fontSize = `${Math.round(P * 0.55)}px`;
        el.style.left = `${Math.round(x)}px`;
        el.style.top = `${Math.round(y)}px`;
        spotsEl.push(el);
        s.spots.push({ x, el });
      }
      s.hide = Math.floor(Math.random() * n);
      this.petCanvas().style.opacity = '0';
      if (pet.mode === 'ground') pet.x = s.spots[s.hide].x;
      cover.style.display = 'flex';
      s.phase = 'count';
      s.t = 3;
      s.tries = 0;
      this.info(`Rodada ${s.round}/3 · ${s.score} pts`);
    };
    const reveal = (found) => {
      s.phase = 'reveal';
      const spot = s.spots[s.hide];
      spot.el.classList.add('found');
      this.petCanvas().style.opacity = '';
      if (found) {
        const pts = Math.max(1, Math.ceil(s.t / 2) - s.tries);
        s.score += pts;
        this.float(spot.x, spot.el.getBoundingClientRect().top - 10, `+${pts}`);
        this.say(pick(['Achou! 😳', 'Ahh, me pegou!', 'Como você sabia?!']));
        this.react('happy');
      } else {
        this.say(pick(['Eu tava aqui o tempo todo!', 'Hehe, ganhei essa!']));
        this.react('happy');
      }
      swBeep(this.app, found ? 'ok' : 'bad');
      this.info(`Rodada ${s.round}/3 · ${s.score} pts`);
      this.later(2, () => (s.round >= 3 ? this.finish(s.score, { win: s.score >= 12, coinRate: 0.8 }) : newRound()));
    };
    s.click = (x, y) => {
      if (s.phase !== 'seek') return;
      const i = s.spots.findIndex((sp) => {
        const r = sp.el.getBoundingClientRect();
        return x >= r.left - 6 && x <= r.right + 6 && y >= r.top - 6 && y <= r.bottom + 6;
      });
      if (i < 0) return;
      if (i === s.hide) return reveal(true);
      s.tries++;
      const el = s.spots[i].el;
      el.classList.remove('shake');
      void el.offsetWidth;
      el.classList.add('shake');
      swBeep(this.app, 'bad');
      this.float(x, y - 20, 'Não está aqui!');
    };
    s.tick = (dt) => {
      if (s.phase === 'count') {
        s.t -= dt;
        const n = Math.max(1, Math.ceil(s.t));
        if (cover.dataset.n !== String(n)) {
          cover.dataset.n = String(n);
          swBeep(this.app, 'tick');
        }
        cover.textContent = `👁 Contando... ${n}`;
        if (s.t <= 0) {
          cover.style.display = 'none';
          s.phase = 'seek';
          s.t = 20;
          s.hint = 7;
        }
      } else if (s.phase === 'seek') {
        s.t -= dt;
        s.hint -= dt;
        this.info(`Rodada ${s.round}/3 · ${s.score} pts · ${Math.ceil(s.t)}s`);
        if (s.hint <= 0) {
          s.hint = 3;
          const el = s.spots[s.hide].el;
          el.classList.remove('giggle');
          void el.offsetWidth;
          el.classList.add('giggle');
          this.float(s.spots[s.hide].x, el.getBoundingClientRect().top - 6, 'hihi');
        }
        if (s.t <= 0) reveal(false);
      }
    };
    s.cleanup = () => {
      this.petCanvas().style.opacity = '';
    };
    newRound();
  }

  // ---------- 2. Batata quente ----------

  batata() {
    const s = this.s;
    const P = this.P;
    const potato = div('mg-potato', this.active.root);
    potato.innerHTML = '<i>🥔</i>';
    potato.style.setProperty('--sz', `${Math.round(P * 0.38)}px`);
    const bar = div('mg-holdbar', this.active.root);
    Object.assign(s, { holder: 'pet', hold: rand(0.8, 1.4), fuse: rand(25, 40), passes: 0, x: 0, y: 0, fly: null, over: false });
    this.say('Batata quente! 🔥');
    const throwTo = (target) => {
      s.fly = { x0: s.x, y0: s.y, target, t: 0, dur: 0.45 };
      s.holder = 'fly';
      swBeep(this.app, 'pass');
    };
    const explode = (playerLost) => {
      s.over = true;
      potato.classList.add('boom');
      potato.innerHTML = '<i>💥</i>';
      bar.style.display = 'none';
      swBeep(this.app, 'boom', 1.3);
      if (playerLost) this.say(pick(['Hahaha! Explodiu com você!', 'Queimou! 🔥']));
      else this.say(pick(['Aaai! Explodiu comigo!', 'Nããão! 💥']));
      this.react(playerLost ? 'happy' : 'sad');
      // `win` is from the Persocon's perspective: she wins when the PLAYER got burned.
      this.later(1.6, () => this.finish(s.passes, { win: playerLost, text: playerLost ? 'A batata explodiu com você' : 'A batata explodiu com ela!' }));
    };
    s.click = (x, y) => {
      if (s.holder === 'player' && !s.over && this.onPet(x, y)) {
        s.passes++;
        swBeep(this.app, 'hit');
        throwTo('pet');
      }
    };
    s.tick = (dt) => {
      if (s.over) return;
      s.fuse -= dt;
      const h = this.head();
      if (s.holder === 'pet') {
        s.x = h.x;
        s.y = h.y - P * 0.1;
        s.hold -= dt;
        if (s.hold <= 0) throwTo('player');
      } else if (s.holder === 'player') {
        s.x = this.mouse.x;
        s.y = this.mouse.y - P * 0.15;
        s.hold -= dt;
        bar.style.width = `${Math.round(clamp(s.hold / s.limit, 0, 1) * 100)}px`;
        if (s.hold <= 0) {
          s.over = true;
          swBeep(this.app, 'boom');
          this.say('Segurou demais! Queimou a mão!');
          this.react('happy');
          bar.style.display = 'none';
          return this.later(1.4, () => this.finish(s.passes, { text: 'Queimou a mão!' }));
        }
      } else if (s.fly) {
        const f = s.fly;
        f.t += dt;
        const k = Math.min(1, f.t / f.dur);
        const tx = f.target === 'pet' ? h.x : this.mouse.x;
        const ty = f.target === 'pet' ? h.y - P * 0.1 : this.mouse.y - P * 0.15;
        s.x = f.x0 + (tx - f.x0) * k;
        s.y = f.y0 + (ty - f.y0) * k - Math.sin(k * Math.PI) * P * 0.6;
        if (k >= 1) {
          s.fly = null;
          if (f.target === 'pet') {
            s.holder = 'pet';
            s.hold = Math.max(0.35, rand(0.6, 1.3) - s.passes * 0.04);
          } else {
            s.holder = 'player';
            s.limit = s.hold = Math.max(0.8, 2.6 - s.passes * 0.12);
          }
        }
      }
      if (s.fuse <= 0) return explode(s.holder === 'player' || s.fly?.target === 'player');
      const hot = s.fuse < 5;
      potato.classList.toggle('hot', hot);
      potato.style.transform = `translate(${Math.round(s.x)}px, ${Math.round(s.y)}px) translate(-50%, -50%) rotate(${Math.round(s.y * 2) % 360}deg)`;
      bar.style.display = s.holder === 'player' ? 'block' : 'none';
      bar.style.transform = `translate(${Math.round(s.x - 50)}px, ${Math.round(s.y - P * 0.3)}px)`;
      this.info(`${s.passes} passes${hot ? ' · 🔥 vai explodir!' : ''}`);
    };
  }

  // ---------- 3. Siga o ritmo ----------

  ritmo() {
    const s = this.s;
    const panel = this.panel('mg-rhythm');
    const W = 320;
    const H = 420;
    const c = Object.assign(document.createElement('canvas'), { width: W, height: H });
    panel.append(c);
    const g = c.getContext('2d');
    const ARROWS = ['←', '↑', '↓', '→'];
    const KEYS = ['ArrowLeft', 'ArrowUp', 'ArrowDown', 'ArrowRight'];
    // Neon synthwave lanes: hot pink, cyan, lime, amber.
    const COLORS = ['#ff2d95', '#00f0ff', '#b8ff3c', '#ffb347'];
    const GLOWS = ['#ff6ec7', '#5efbff', '#d4ff7a', '#ffd27a'];
    const track = pick(RHYTHM_TRACKS);
    const bpm = track.bpm;
    const R = track.root;
    const LEAD = (track.lead || [4, 4.8, 5.333, 6, 7.112, 8, 9.6]).map((k) => R * k);
    const BASS = (track.bass || [1, 1.2, 1.5, 0.75]).map((k) => R * k);
    const sound = this.app.sound;
    // Neon chevron arrow (lane 0← 1↑ 2↓ 3→) with outer glow.
    const arrow = (lane, x, y, size, color, glow, alpha = 1) => {
      g.save();
      g.translate(x, y);
      g.rotate([Math.PI, -Math.PI / 2, Math.PI / 2, 0][lane]);
      g.globalAlpha = alpha;
      g.shadowColor = glow;
      g.shadowBlur = size * 0.55;
      g.fillStyle = color;
      g.beginPath();
      g.moveTo(size * 0.48, 0);
      g.lineTo(-size * 0.18, -size * 0.42);
      g.lineTo(-size * 0.18, -size * 0.16);
      g.lineTo(-size * 0.48, -size * 0.16);
      g.lineTo(-size * 0.48, size * 0.16);
      g.lineTo(-size * 0.18, size * 0.16);
      g.lineTo(-size * 0.18, size * 0.42);
      g.closePath();
      g.fill();
      g.shadowBlur = 0;
      g.fillStyle = 'rgba(255,255,255,0.55)';
      g.beginPath();
      g.moveTo(size * 0.3, 0);
      g.lineTo(-size * 0.05, -size * 0.2);
      g.lineTo(-size * 0.05, size * 0.2);
      g.closePath();
      g.fill();
      g.restore();
    };
    const btns = div('mg-row', panel);
    Object.assign(s, {
      t: 40, notes: [], beat: 0, score: 0, combo: 0, best: 0, hits: 0, misses: 0,
      flash: [0, 0, 0, 0], label: '', labelT: 0, pulse: 0, laser: 0, stars: Array.from({ length: 28 }, () => ({
        x: rand(0, W), y: rand(0, H * 0.55), s: rand(0.6, 2.2), tw: rand(0, 6),
      })),
    });
    const TRAVEL = 1.45;
    const HIT_Y = H - 56;
    const HORIZON = H * 0.42;
    const hit = (lane) => {
      if (s.t <= 0) return;
      s.flash[lane] = 0.14;
      const now = s.clock;
      const n = s.notes.filter((e) => e.lane === lane && !e.done).sort((a, b) => Math.abs(a.at - now) - Math.abs(b.at - now))[0];
      const d = n ? Math.abs(n.at - now) : 9;
      if (d < 0.17) {
        n.done = true;
        const perfect = d < 0.09;
        s.score += perfect ? 3 : 1;
        s.combo++;
        s.hits++;
        s.best = Math.max(s.best, s.combo);
        s.label = perfect ? 'Perfeito!' : 'Bom!';
        s.labelT = 0.5;
        s.pulse = 1;
        const f = LEAD[lane + (perfect ? 3 : 0)] || LEAD[lane];
        sound.tone8(f, f * 1.5, 0.12, 'sawtooth', perfect ? 0.08 : 0.06);
        sound.tone8(f * 2, f * 2.2, 0.06, 'square', 0.035);
        if (s.combo % 10 === 0) {
          this.app.pet.emit('gameExcite');
          this.react('happy');
          sound.tone8(R * 8, R * 12, 0.2, 'sawtooth', 0.06);
        }
      } else {
        s.combo = 0;
        s.label = 'Errou';
        s.labelT = 0.4;
        sound.tone8(90, 40, 0.1, 'sawtooth', 0.04);
      }
    };
    KEYS.forEach((k, i) => {
      const b = button(ARROWS[i], () => hit(i));
      b.style.borderColor = COLORS[i];
      b.style.color = COLORS[i];
      btns.append(b);
    });
    s.key = (e) => {
      const i = KEYS.indexOf(e.key);
      if (i >= 0) {
        e.preventDefault();
        if (!e.repeat) hit(i);
      }
    };
    s.clock = 0;
    s.facing = 'front';
    this.pose('dance');
    this.say(pick(['Synthwave! Sente o beat! 🎵', 'Luzes no máximo — vamos dançar!', `Bora no ritmo de ${track.name}!`]));
    // Kick / hat / bass / arp on the energetic grid.
    const playBeat = (n) => {
      const step = n % 8;
      sound.tone8(90, 40, 0.1, 'sine', step % 2 === 0 ? 0.1 : 0.04);
      if (step % 2 === 0) sound.tone8(BASS[(n >> 1) % BASS.length], BASS[(n >> 1) % BASS.length] * 0.85, 0.22, 'sawtooth', 0.055);
      if (step === 0 || step === 4) sound.tone8(180, 60, 0.08, 'triangle', 0.07);
      else sound.tone8(2400, 1800, 0.03, 'square', 0.025);
      if (step % 2 === 1) sound.tone8(LEAD[(n * 3) % LEAD.length], LEAD[(n * 3) % LEAD.length] * 1.01, 0.08, 'square', 0.03);
      s.laser = 1;
      s.pulse = Math.max(s.pulse, step % 2 === 0 ? 0.85 : 0.4);
    };
    s.tick = (dt) => {
      s.clock += dt;
      s.t -= dt;
      s.pulse = Math.max(0, s.pulse - dt * 2.4);
      s.laser = Math.max(0, s.laser - dt * 3.2);
      const spb = 60 / bpm;
      // Eighth-note grid for denser, more energetic music.
      const eighth = Math.floor(s.clock / (spb / 2));
      if (eighth !== Math.floor((s.clock - dt) / (spb / 2))) playBeat(eighth);
      if (s.t > TRAVEL && s.clock + TRAVEL >= s.beat * spb) {
        const at = s.beat * spb + TRAVEL;
        if (s.beat > 1 && Math.random() < 0.6 + Math.min(0.28, s.clock / 90)) s.notes.push({ lane: Math.floor(Math.random() * 4), at });
        if (s.beat > 6 && s.beat % 4 === 2 && Math.random() < 0.4) s.notes.push({ lane: Math.floor(Math.random() * 4), at: at + spb / 2 });
        if (s.beat > 12 && s.beat % 8 === 0 && Math.random() < 0.45) {
          const a = Math.floor(Math.random() * 4);
          s.notes.push({ lane: a, at });
          s.notes.push({ lane: (a + 2) % 4, at: at + spb / 2 });
        }
        s.beat++;
      }
      for (const n of s.notes) {
        if (!n.done && s.clock - n.at > 0.17) {
          n.done = true;
          n.miss = true;
          s.combo = 0;
          s.misses++;
        }
      }
      s.notes = s.notes.filter((n) => !n.done || s.clock - n.at < 0.3);

      // ---- synthwave backdrop ----
      const sky = g.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, '#0b0218');
      sky.addColorStop(0.35, '#1a0540');
      sky.addColorStop(0.55, '#3b0a5c');
      sky.addColorStop(1, '#12001f');
      g.fillStyle = sky;
      g.fillRect(0, 0, W, H);
      for (const st of s.stars) {
        st.tw += dt;
        g.globalAlpha = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(st.tw * 3 + st.x));
        g.fillStyle = '#fff';
        g.fillRect(st.x, st.y, st.s, st.s);
      }
      g.globalAlpha = 1;
      // Retro sun.
      const sunY = HORIZON - 8 + s.pulse * 4;
      const sunR = 54 + s.pulse * 6;
      const sun = g.createRadialGradient(W / 2, sunY, 4, W / 2, sunY, sunR);
      sun.addColorStop(0, '#ffe56a');
      sun.addColorStop(0.45, '#ff6b9d');
      sun.addColorStop(1, 'rgba(255,45,149,0)');
      g.fillStyle = sun;
      g.beginPath();
      g.arc(W / 2, sunY, sunR, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#12001f';
      for (let i = 0; i < 6; i++) {
        const y = sunY - sunR * 0.55 + i * (sunR * 0.22);
        g.fillRect(W / 2 - sunR, y, sunR * 2, 3 + i * 0.4);
      }
      // Perspective grid floor.
      g.save();
      g.beginPath();
      g.rect(0, HORIZON, W, H - HORIZON);
      g.clip();
      const scroll = (s.clock * 90) % 40;
      g.strokeStyle = `rgba(255,45,149,${0.35 + s.pulse * 0.35})`;
      g.lineWidth = 1;
      for (let i = 0; i < 14; i++) {
        const t = (i + scroll / 40) / 14;
        const y = HORIZON + t * t * (H - HORIZON);
        g.beginPath();
        g.moveTo(0, y);
        g.lineTo(W, y);
        g.stroke();
      }
      g.strokeStyle = `rgba(0,240,255,${0.3 + s.pulse * 0.4})`;
      for (let i = -8; i <= 8; i++) {
        g.beginPath();
        g.moveTo(W / 2 + i * 14, HORIZON);
        g.lineTo(W / 2 + i * 70, H);
        g.stroke();
      }
      g.restore();
      g.strokeStyle = '#ff2d95';
      g.shadowColor = '#ff2d95';
      g.shadowBlur = 8 + s.pulse * 12;
      g.beginPath();
      g.moveTo(0, HORIZON);
      g.lineTo(W, HORIZON);
      g.stroke();
      g.shadowBlur = 0;

      // Side lasers locked to the beat (sweep + intensity).
      const laserA = s.laser;
      if (laserA > 0.02) {
        const sweep = Math.sin(s.clock * Math.PI * (bpm / 60)) * 18;
        for (const [side, col] of [[0, '#ff2d95'], [1, '#00f0ff']]) {
          const x0 = side ? W - 6 : 6;
          g.save();
          g.globalAlpha = 0.25 + laserA * 0.75;
          g.strokeStyle = col;
          g.shadowColor = col;
          g.shadowBlur = 18 + laserA * 22;
          g.lineWidth = 2 + laserA * 3;
          g.beginPath();
          g.moveTo(x0, 8);
          g.lineTo(x0 + (side ? -1 : 1) * (10 + sweep), HORIZON);
          g.lineTo(x0 + (side ? -1 : 1) * (4 + Math.abs(sweep)), H - 8);
          g.stroke();
          g.lineWidth = 1;
          g.globalAlpha = 0.15 + laserA * 0.35;
          g.beginPath();
          g.moveTo(x0 + (side ? -10 : 10), 20);
          g.lineTo(x0 + (side ? -1 : 1) * (28 + sweep * 0.6), H * 0.7);
          g.stroke();
          g.restore();
        }
      }

      // Playfield lanes.
      const pad = 28;
      const fieldW = W - pad * 2;
      const lw = fieldW / 4;
      for (let i = 0; i < 4; i++) {
        const x = pad + i * lw;
        const fl = Math.max(0, s.flash[i]);
        s.flash[i] -= dt;
        const lg = g.createLinearGradient(x, 0, x, H);
        lg.addColorStop(0, 'rgba(0,0,0,0)');
        lg.addColorStop(0.35, `${COLORS[i]}10`);
        lg.addColorStop(1, fl > 0 ? `${COLORS[i]}55` : `${COLORS[i]}18`);
        g.fillStyle = lg;
        g.fillRect(x + 2, HORIZON - 10, lw - 4, H - HORIZON + 10);
        g.strokeStyle = `${COLORS[i]}66`;
        g.globalAlpha = 0.5 + fl * 2;
        g.strokeRect(x + 2.5, HORIZON - 10, lw - 5, H - HORIZON + 10);
        g.globalAlpha = 1;
        // Hit receptor.
        g.fillStyle = 'rgba(0,0,0,0.35)';
        g.fillRect(pad + i * lw + 6, HIT_Y - 22, lw - 12, 44);
        arrow(i, pad + i * lw + lw / 2, HIT_Y, 28, COLORS[i], GLOWS[i], 0.35 + fl * 2 + s.pulse * 0.25);
      }
      // Judgement line.
      g.strokeStyle = `rgba(255,255,255,${0.45 + s.pulse * 0.4})`;
      g.shadowColor = '#fff';
      g.shadowBlur = 6 + s.pulse * 10;
      g.beginPath();
      g.moveTo(pad, HIT_Y);
      g.lineTo(W - pad, HIT_Y);
      g.stroke();
      g.shadowBlur = 0;

      for (const n of s.notes) {
        if (n.done && !n.miss) continue;
        const y = HIT_Y - ((n.at - s.clock) / TRAVEL) * (HIT_Y - (HORIZON - 20));
        if (y < HORIZON - 30) continue;
        const a = n.miss ? Math.max(0, 1 - (s.clock - n.at) * 4) : 1;
        arrow(n.lane, pad + n.lane * lw + lw / 2, y, 34, COLORS[n.lane], GLOWS[n.lane], a);
      }
      if (s.labelT > 0) {
        s.labelT -= dt;
        g.fillStyle = s.label === 'Errou' ? '#ff6b9d' : '#fff';
        g.font = 'bold 22px PxEmoji, system-ui';
        g.textAlign = 'center';
        g.shadowColor = s.label === 'Errou' ? '#ff2d95' : '#00f0ff';
        g.shadowBlur = 12;
        g.fillText(s.label, W / 2, 36);
        g.shadowBlur = 0;
      }
      if (s.combo >= 3) {
        g.fillStyle = '#ffb347';
        g.font = 'bold 16px PxEmoji, system-ui';
        g.textAlign = 'center';
        g.shadowColor = '#ff2d95';
        g.shadowBlur = 10;
        g.fillText(`COMBO ${s.combo}`, W / 2, 60);
        g.shadowBlur = 0;
      }
      g.fillStyle = 'rgba(0,240,255,0.85)';
      g.font = 'bold 11px PxEmoji, system-ui';
      g.textAlign = 'left';
      g.fillText(track.name, 12, H - 10);
      g.textAlign = 'right';
      g.fillText(`${bpm} BPM`, W - 12, H - 10);

      this.info(`${s.score} pts · ${Math.max(0, Math.ceil(s.t))}s`);
      if (s.t <= 0 && !s.over) {
        s.over = true;
        const acc = s.hits / Math.max(1, s.hits + s.misses);
        this.finish(s.score, { win: acc >= 0.7, coinRate: 0.35, text: `${Math.round(acc * 100)}% de acertos · combo máx. ${s.best}` });
      }
    };
  }

  // ---------- 4. Pescaria ----------

  pesca() {
    const { pet, world } = this.app;
    const s = this.s;
    const P = this.P;
    const c = Object.assign(document.createElement('canvas'), { className: 'mg-canvas', width: innerWidth, height: innerHeight });
    this.active.root.append(c);
    const g = c.getContext('2d');
    const floor = pet.mode === 'ground' ? pet.y : this.app.toys.floorY();
    const px = pet.x ?? world.width / 2;
    const side = px + P * 0.5 + P * 4 < world.width ? 1 : -1;
    const wx1 = side > 0 ? px + P * 0.45 : Math.max(0, px - P * 0.45 - P * 4.5);
    const wx2 = side > 0 ? Math.min(world.width, wx1 + P * 4.5) : px - P * 0.45;
    const wy = floor - P * 0.22;
    s.facing = side > 0 ? 'right' : 'left';
    this.pose('idle');
    const FISH = [['🐟', 3, 40], ['🐠', 5, 25], ['🐡', 8, 12], ['🦑', 10, 7], ['👢', 0, 12], ['💎', 20, 3]];
    Object.assign(s, { t: 60, score: 0, caught: 0, phase: 'wait', wait: rand(2, 5), bx: rand(wx1 + P * 0.6, wx2 - P * 0.3), dip: 0, clock: 0, flying: null });
    const newCast = (delay = rand(2, 5.5)) => {
      s.phase = 'wait';
      s.wait = delay;
      s.bx = rand(wx1 + P * 0.6, wx2 - P * 0.3);
    };
    s.click = () => {
      if (s.phase === 'bite') {
        let r = Math.random() * FISH.reduce((a, f) => a + f[2], 0);
        const f = FISH.find((e) => (r -= e[2]) <= 0) || FISH[0];
        s.score += f[1];
        s.caught++;
        s.flying = { icon: f[0], t: 0, x: s.bx, y: wy };
        this.float(s.bx, wy - P * 0.5, f[1] ? `${f[0]} +${f[1]}` : `${f[0]} ...`);
        swBeep(this.app, f[1] ? 'ok' : 'bad');
        if (f[1] >= 8) this.say(pick(['Uau, que peixão!', 'Raro!!']));
        else if (!f[1]) this.say('Uma bota?! 😒');
        this.pose('happy', 1.4);
        newCast();
      } else if (s.phase === 'wait') {
        this.float(s.bx, wy - P * 0.3, 'Espantou!');
        swBeep(this.app, 'bad', 0.7);
        newCast(rand(3, 6));
      }
    };
    s.tick = (dt) => {
      s.clock += dt;
      s.t -= dt;
      if (s.phase === 'wait') {
        s.wait -= dt;
        s.dip = Math.random() < dt * 0.6 ? 4 : Math.max(0, s.dip - dt * 20);
        if (s.wait <= 0) {
          s.phase = 'bite';
          s.bite = Math.max(0.55, 1 - s.caught * 0.04);
          swBeep(this.app, 'warn');
        }
      } else if (s.phase === 'bite') {
        s.dip = 12;
        s.bite -= dt;
        if (s.bite <= 0) {
          this.float(s.bx, wy - P * 0.3, 'Escapou...');
          newCast();
        }
      }
      g.clearRect(0, 0, c.width, c.height);
      // Neon synthwave pool.
      const water = g.createLinearGradient(0, wy - 20, 0, floor);
      water.addColorStop(0, 'rgba(0,240,255,0.15)');
      water.addColorStop(0.5, 'rgba(122,92,255,0.45)');
      water.addColorStop(1, 'rgba(255,45,149,0.35)');
      g.fillStyle = water;
      g.beginPath();
      g.moveTo(wx1, floor);
      for (let x = wx1; x <= wx2; x += 8) g.lineTo(x, wy + Math.sin(x / 18 + s.clock * 3) * 3);
      g.lineTo(wx2, floor);
      g.closePath();
      g.fill();
      g.strokeStyle = SW.cyan;
      g.shadowColor = SW.cyan;
      g.shadowBlur = 10;
      g.lineWidth = 2;
      g.beginPath();
      for (let x = wx1; x <= wx2; x += 8) {
        const yy = wy + Math.sin(x / 18 + s.clock * 3) * 3;
        if (x === wx1) g.moveTo(x, yy);
        else g.lineTo(x, yy);
      }
      g.stroke();
      g.shadowBlur = 0;
      // Grid lines inside the water.
      g.strokeStyle = 'rgba(255,45,149,0.25)';
      g.lineWidth = 1;
      for (let i = 1; i < 5; i++) {
        const y = wy + (floor - wy) * (i / 5);
        g.beginPath();
        g.moveTo(wx1 + 4, y);
        g.lineTo(wx2 - 4, y);
        g.stroke();
      }
      const hx = (pet.x ?? px) + side * P * 0.22;
      const hy = (pet.mode === 'ground' ? pet.y : floor) - P * 0.55;
      const tipX = hx + side * P * 0.55;
      const tipY = hy - P * 0.45;
      g.strokeStyle = SW.pink;
      g.shadowColor = SW.pink;
      g.shadowBlur = 8;
      g.lineWidth = 3;
      g.beginPath(); g.moveTo(hx, hy); g.lineTo(tipX, tipY); g.stroke();
      const by = wy + s.dip + Math.sin(s.clock * 4) * 1.5;
      g.strokeStyle = 'rgba(0,240,255,0.85)';
      g.shadowColor = SW.cyan;
      g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(tipX, tipY); g.quadraticCurveTo((tipX + s.bx) / 2, Math.max(tipY, by) + 10, s.bx, by - 6); g.stroke();
      g.shadowBlur = 12;
      g.fillStyle = s.phase === 'bite' ? SW.amber : SW.pink;
      g.beginPath(); g.arc(s.bx, by - 4, 6, Math.PI, 0); g.fill();
      g.fillStyle = '#fff';
      g.shadowBlur = 0;
      g.beginPath(); g.arc(s.bx, by - 4, 6, 0, Math.PI); g.fill();
      if (s.phase === 'bite') {
        g.fillStyle = SW.amber;
        g.shadowColor = SW.amber;
        g.shadowBlur = 14;
        g.font = `bold ${Math.round(P * 0.28)}px PxEmoji, system-ui`;
        g.textAlign = 'center';
        g.fillText('!', s.bx, by - P * 0.22);
        g.shadowBlur = 0;
      }
      if (s.flying) {
        const f = s.flying;
        f.t += dt;
        const k = Math.min(1, f.t / 0.6);
        g.font = `${Math.round(P * 0.25)}px PxEmoji, system-ui`;
        g.textAlign = 'center';
        g.fillText(f.icon, f.x + (hx - f.x) * k, f.y + (hy - f.y) * k - Math.sin(k * Math.PI) * P * 0.8);
        if (k >= 1) s.flying = null;
      }
      this.info(`${s.caught} peixes · ${s.score} pts · ${Math.max(0, Math.ceil(s.t))}s`);
      if (s.t <= 0 && !s.over) {
        s.over = true;
        this.finish(s.score, { win: s.score >= 25, coinRate: 0.5, text: `${s.caught} fisgados` });
      }
    };
  }

  // ---------- 5. Adivinhe o copo ----------

  copos() {
    const s = this.s;
    const panel = this.panel('mg-cups');
    const stage = div('mg-stage', panel);
    const msg = div('mg-msg', panel);
    const aff = Math.max(0, this.app.pet.affection || 0);
    const SP = 120;
    const cups = [0, 1, 2].map((slot) => {
      const el = div('mg-cup', stage);
      const coin = div('mg-coin', stage);
      const cup = { el, coin, slot };
      el.onclick = () => s.choose?.(cup);
      return cup;
    });
    const place = (cup, dur) => {
      cup.el.style.transition = `left ${dur}s ease-in-out, transform 0.25s`;
      cup.el.style.left = `${20 + cup.slot * SP}px`;
      cup.coin.style.left = `${20 + cup.slot * SP + 34}px`;
    };
    Object.assign(s, { round: 0, score: 0 });
    const round = () => {
      s.round++;
      s.choose = null;
      const coinCup = cups[Math.floor(Math.random() * 3)];
      s.coinCup = coinCup;
      for (const c of cups) {
        place(c, 0);
        c.coin.style.display = c === coinCup ? 'block' : 'none';
        c.el.classList.toggle('up', c === coinCup);
      }
      msg.textContent = `Rodada ${s.round}/5 · olhe a moeda!`;
      this.info(`${s.score}/5 acertos`);
      this.later(1.2, () => {
        coinCup.el.classList.remove('up');
        this.later(0.35, () => {
          coinCup.coin.style.display = 'none';
          msg.textContent = 'Embaralhando...';
          if (s.round === 1) this.say('Presta atenção, hein!');
          const sk = this.skill('copos');
          const swaps = 3 + s.round * 2 + Math.floor(aff / 250) + Math.floor(sk * 3);
          const dur = Math.max(0.14, 0.5 - s.round * 0.06 - aff / 5000 - sk * 0.08);
          let i = 0;
          const step = () => {
            if (i++ >= swaps) {
              msg.textContent = 'Onde está a moeda?';
              s.choose = choose;
              return;
            }
            const [a, b] = shuffle(cups).slice(0, 2);
            [a.slot, b.slot] = [b.slot, a.slot];
            place(a, dur);
            place(b, dur);
            swBeep(this.app, 'tick', 0.8);
            this.later(dur + 0.05, step);
          };
          step();
        });
      });
    };
    const choose = (cup) => {
      s.choose = null;
      const right = cup === s.coinCup;
      for (const c of cups) {
        c.coin.style.display = c === s.coinCup ? 'block' : 'none';
        place(c, 0);
      }
      cup.el.classList.add('up');
      if (!right) s.coinCup.el.classList.add('up');
      if (right) s.score++;
      msg.textContent = right ? 'Acertou! 🎉' : 'Errou! Estava ali.';
      this.app.sound.play(right ? 'ok' : 'cancel', { volume: 0.5 });
      this.say(right ? pick(['Olho de águia!', 'Nossa, acertou!']) : pick(['Hehe, te enganei!', 'Quase!']));
      this.pose(right ? 'sad' : 'happy', 1.5);
      this.info(`${s.score}/5 acertos`);
      this.later(1.8, () => (s.round >= 5 ? this.finish(s.score * 4, { win: s.score >= 3, coinRate: 0.6, text: `${s.score}/5 acertos` }) : round()));
    };
    round();
  }

  // ---------- 6. Estátua ----------

  estatua() {
    const s = this.s;
    const big = div('mg-big', this.active.root);
    const NOTES = [523, 587, 659, 784, 659, 587, 523, 440, 494, 523, 587, 523];
    Object.assign(s, { lives: 3, round: 0, phase: 'music', note: 0, noteT: 0 });
    const music = () => {
      s.round++;
      s.phase = 'music';
      s.t = rand(2, 6);
      big.textContent = '';
      this.pose('dance');
    };
    const fail = (text) => {
      s.lives--;
      s.phase = 'wait';
      big.textContent = text;
      this.app.sound.play('cancel', { volume: 0.5 });
      this.pose('happy', 1.2);
      if (s.lives <= 0) return this.later(1.4, () => this.finish(s.round - 1, { win: s.round - 1 >= 8, text: `${s.round - 1} estátuas` }));
      this.later(1.4, music);
    };
    s.click = (x, y) => {
      if (!this.onPet(x, y)) return;
      if (s.phase === 'music') return fail('Ainda está tocando! 💔');
      if (s.phase === 'stop') {
        s.phase = 'wait';
        big.textContent = '🗿 Estátua!';
        this.pose('freeze');
        this.app.sound.play('ok', { volume: 0.5 });
        if (s.round >= 12) return this.later(1.4, () => this.finish(s.round, { win: true, text: '12 estátuas perfeitas' }));
        this.later(1.4, music);
      }
    };
    s.tick = (dt) => {
      this.info(`Rodada ${s.round} · ${'❤️'.repeat(Math.max(0, s.lives))}`);
      if (s.phase === 'music') {
        s.t -= dt;
        s.noteT -= dt;
        if (s.noteT <= 0) {
          s.noteT = 0.22;
          const f = NOTES[s.note++ % NOTES.length];
          this.app.sound.tone8(f, f, 0.18, 'square', 0.06);
        }
        if (s.t <= 0) {
          s.phase = 'stop';
          s.window = Math.max(0.4, 1.3 - s.round * 0.08 - this.skill('estatua') * 0.25);
          big.textContent = 'PAROU! Clique nela!';
        }
      } else if (s.phase === 'stop') {
        s.window -= dt;
        if (s.window <= 0) fail('Muito lento! 💔');
      }
    };
    this.say('Quando a música parar, me congela!');
    music();
  }

  // ---------- 7. Desenho ----------

  desenho() {
    const s = this.s;
    const WORDS = ['casa', 'sol', 'gato', 'árvore', 'peixe', 'coração', 'estrela', 'carro', 'flor', 'lua', 'cachorro', 'bolo', 'nuvem', 'guarda-chuva', 'óculos', 'barco', 'maçã', 'pizza', 'chapéu', 'foguete'];
    const panel = this.panel('mg-draw');
    const word = div('mg-msg', panel);
    const W = 380;
    const H = 260;
    const c = Object.assign(document.createElement('canvas'), { width: W, height: H, className: 'mg-board' });
    panel.append(c);
    const g = c.getContext('2d');
    const guesses = div('mg-guesses', panel);
    const row = div('mg-row', panel);
    const clear = () => {
      g.fillStyle = '#fff';
      g.fillRect(0, 0, W, H);
      s.ink = 0;
      s.strokes = 0;
    };
    row.append(button('Limpar', () => s.phase === 'draw' && clear()), button('Pronto!', () => done(), 'primary'));
    let last = null;
    c.addEventListener('pointerdown', (e) => {
      if (s.phase !== 'draw') return;
      c.setPointerCapture(e.pointerId);
      last = [e.offsetX, e.offsetY];
      s.strokes++;
    });
    c.addEventListener('pointermove', (e) => {
      if (!last || s.phase !== 'draw') return;
      g.strokeStyle = '#222';
      g.lineWidth = 4;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(...last);
      g.lineTo(e.offsetX, e.offsetY);
      g.stroke();
      s.ink += Math.hypot(e.offsetX - last[0], e.offsetY - last[1]);
      last = [e.offsetX, e.offsetY];
    });
    c.addEventListener('pointerup', () => { last = null; });
    Object.assign(s, { round: 0, score: 0 });
    const round = () => {
      s.round++;
      s.word = pick(WORDS.filter((w) => w !== s.word));
      s.phase = 'draw';
      s.t = 45;
      clear();
      guesses.textContent = '';
      word.textContent = `Desenhe: ${s.word.toUpperCase()}`;
    };
    const done = () => {
      if (s.phase !== 'draw') return;
      s.phase = 'guess';
      word.textContent = 'A Persocon está pensando...';
      if (s.ink > (s.artInk || 150)) {
        s.artInk = s.ink;
        s.art = c.toDataURL('image/png');
      }
      const aff = Math.max(0, this.app.pet.affection || 0);
      const p = clamp(0.2 + s.ink / 2500 + s.strokes * 0.03 + aff / 2500 + this.skill('desenho') * 0.15, 0.08, 0.92);
      const wrong = shuffle(WORDS.filter((w) => w !== s.word)).slice(0, 3);
      const at = Math.random() < p ? Math.floor(Math.random() * 3) : -1;
      const list = at >= 0 ? [...wrong.slice(0, at), s.word] : wrong;
      list.forEach((w, i) => this.later(1.3 + i * 1.7, () => {
        const right = w === s.word;
        const chip = div(`mg-chip${right ? ' right' : ''}`, guesses);
        chip.textContent = `${right ? '✔' : '✖'} ${w}`;
        this.say(right ? `${w[0].toUpperCase()}${w.slice(1)}! Acertei?` : pick([`Hmm... ${w}?`, `Seria... ${w}?`, `Já sei! ${w}!`]));
        this.app.sound.play(right ? 'ok' : 'blip', { volume: 0.4 });
        if (right) {
          const pts = 3 - i;
          s.score += pts;
          this.pose('happy', 1.5);
          word.textContent = `Ela acertou na ${i + 1}ª tentativa! +${pts}`;
        } else if (i === list.length - 1) {
          this.pose('sad', 1.5);
          word.textContent = `Ela desistiu! Era: ${s.word.toUpperCase()}`;
          this.later(0.6, () => this.say(pick([`Isso era ${s.word}?! 😂`, 'Desisto! Que desenho é esse?', 'Ahh, agora eu vi!'])));
        }
        if (i === list.length - 1) this.later(2.4, () => (s.round >= 3 ? this.finish(s.score * 3, { win: s.score >= 4, coinRate: 0.7 }) : round()));
      }));
    };
    s.tick = (dt) => {
      if (s.phase !== 'draw') return this.info(`Rodada ${s.round}/3 · ${s.score} pts`);
      s.t -= dt;
      this.info(`Rodada ${s.round}/3 · ${s.score} pts · ${Math.max(0, Math.ceil(s.t))}s`);
      if (s.t <= 0) done();
    };
    round();
  }

  // ---------- 8. Bolhas de sabão ----------
  // Three machines blow bubbles around the screen; she runs, jumps and hookshots a whole line. 60s race.

  bolhas() {
    const s = this.s;
    const { pet } = this.app;
    const P = this.P;
    const sk = this.skill('bolhas');
    const floor = (() => {
      const f = pet.world.surfaces.find((x) => x.id === 'floor');
      return f ? f.y : innerHeight - 48;
    })();
    const margin = P * 0.5;
    const xs = [0.18, 0.5, 0.82].map((k) => clamp(innerWidth * k + rand(-P * 0.4, P * 0.4), margin, innerWidth - margin));
    const machines = xs.map((x) => {
      const el = div('mg-blower', this.active.root);
      el.innerHTML = '<i></i><b></b>';
      const m = { el, x, y: floor - P * 0.15, cool: rand(0.1, 0.6) };
      el.style.transform = `translate(${Math.round(m.x - 22)}px, ${Math.round(m.y - 36)}px)`;
      return m;
    });
    Object.assign(s, {
      t: 60, you: 0, her: 0, list: [], machines, floor,
      ai: 'run', aiT: 0, tx: pet.x, hook: null, hop: 0, hopV: 0, baseY: floor,
    });
    if (pet.mode === 'ground') {
      pet.y = floor;
      s.baseY = floor;
    }
    const pop = (b, who) => {
      if (b.dead) return;
      b.dead = true;
      b.el.classList.add('pop');
      setTimeout(() => b.el.remove(), 180);
      const pts = b.gold ? 5 : 1;
      if (who === 'you') s.you += pts;
      else s.her += pts;
      this.float(b.x, b.y - b.r, `${who === 'you' ? '+' : '🧼 +'}${pts}`);
      this.app.sound.tone8(b.gold ? 1400 : 900, b.gold ? 1800 : 1200, 0.05, 'sine', 0.06);
    };
    const distSeg = (px, py, ax, ay, bx, by) => {
      const dx = bx - ax;
      const dy = by - ay;
      const len2 = dx * dx + dy * dy || 1;
      const t = clamp(((px - ax) * dx + (py - ay) * dy) / len2, 0, 1);
      return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
    };
    const spawn = (m) => {
      const r = rand(P * 0.07, P * 0.16);
      const el = div('mg-bubble', this.active.root);
      const gold = Math.random() < 0.1;
      if (gold) el.classList.add('gold');
      el.style.width = el.style.height = `${Math.round(r * 2)}px`;
      s.list.push({
        el, x: m.x + rand(-8, 8), y: m.y - 28, r, gold,
        vx: rand(-55, 55), vy: rand(-95, -40), ph: rand(0, 6), life: rand(6, 10),
      });
    };
    // Best cluster: pick a bubble with the most neighbors nearby (she chases that).
    const cluster = () => {
      const alive = s.list.filter((b) => !b.dead);
      if (!alive.length) return null;
      let best = null;
      let bestN = -1;
      for (const b of alive) {
        let n = 0;
        for (const o of alive) if (o !== b && Math.hypot(o.x - b.x, o.y - b.y) < P * 1.8) n++;
        if (n > bestN || (n === bestN && Math.hypot(b.x - pet.x, b.y - (pet.y - P * 0.5)) < Math.hypot(best.x - pet.x, best.y - (pet.y - P * 0.5)))) {
          best = b;
          bestN = n;
        }
      }
      return best;
    };
    // Aim the hook through the densest row of bubbles from her hand.
    const aimHook = () => {
      const alive = s.list.filter((b) => !b.dead);
      if (alive.length < 2) return null;
      const ox = pet.x;
      const oy = pet.y - P * 0.55 - (s.hop || 0);
      let best = null;
      let bestHits = 0;
      for (const b of alive) {
        const ang = Math.atan2(b.y - oy, b.x - ox);
        const reach = P * (5.5 + sk);
        const tx = ox + Math.cos(ang) * reach;
        const ty = oy + Math.sin(ang) * reach;
        let hits = 0;
        for (const o of alive) if (distSeg(o.x, o.y, ox, oy, tx, ty) < o.r + P * 0.18) hits++;
        if (hits > bestHits) {
          bestHits = hits;
          best = { tx, ty, hits };
        }
      }
      return bestHits >= 2 ? best : null;
    };
    const startHook = (aim) => {
      const ox = pet.x;
      const oy = pet.y - P * 0.55 - (s.hop || 0);
      const line = div('mg-hookline', this.active.root);
      const tip = div('mg-hooktip', line);
      s.hook = { el: line, tip, ox, oy, tx: aim.tx, ty: aim.ty, u: 0, hit: false };
      pet.dir = aim.tx >= pet.x ? 1 : -1;
      s.facing = pet.dir > 0 ? 'right' : 'left';
      pet.anim(pet.pickClip(['gancho'], ['use_mainhand', 'swing_hand', 'idle']), { facing: s.facing, restart: true });
      this.app.sound.sfx?.('whoosh', 1.2);
      s.ai = 'hook';
    };
    const face = (tx) => {
      s.facing = tx >= pet.x ? 'right' : 'left';
      pet.dir = s.facing === 'right' ? 1 : -1;
    };
    s.click = (x, y) => {
      // Only the nearest bubble in a tight radius — camping one spot can't sweep a cloud.
      let best = null;
      let bestD = Infinity;
      for (const b of s.list) {
        if (b.dead) continue;
        const d = Math.hypot(b.x - x, b.y - y);
        if (d < b.r + 6 && d < bestD) {
          best = b;
          bestD = d;
        }
      }
      if (best) pop(best, 'you');
    };
    this.say(pick(['Máquinas de bolhas! Eu ganho dessa vez!', 'Corre! Quem estoura mais vence!', 'Olha o meu gancho nas bolhas! 🧼']));
    this.pose('idle');
    s.tick = (dt) => {
      if (s.over) return;
      s.t -= dt;
      // Machines blow.
      for (const m of s.machines) {
        m.cool -= dt;
        if (m.cool <= 0 && s.t > 0) {
          m.cool = rand(0.28, 0.55) * (1 - sk * 0.15);
          spawn(m);
          m.el.classList.remove('puff');
          void m.el.offsetWidth;
          m.el.classList.add('puff');
        }
      }
      // Bubbles drift (rise + wander); they don't stick to her head.
      for (const b of s.list) {
        if (b.dead) continue;
        b.life -= dt;
        b.ph += dt * 2.2;
        b.vx += Math.sin(b.ph * 0.7) * 40 * dt;
        b.vx = clamp(b.vx, -120, 120);
        b.x += b.vx * dt;
        b.y += (b.vy + Math.sin(b.ph) * 18) * dt;
        if (b.x < b.r) {
          b.x = b.r;
          b.vx = Math.abs(b.vx);
        }
        if (b.x > innerWidth - b.r) {
          b.x = innerWidth - b.r;
          b.vx = -Math.abs(b.vx);
        }
        if (b.life <= 0 || b.y < -b.r) {
          b.dead = true;
          b.el.remove();
          continue;
        }
        b.el.style.transform = `translate(${Math.round(b.x - b.r)}px, ${Math.round(b.y - b.r)}px)`;
      }
      s.list = s.list.filter((b) => !b.dead);

      // Her hop (local bodyY so she doesn't leave the minigame).
      if (s.hop > 0 || s.hopV) {
        s.hopV -= P * 18 * dt;
        s.hop = Math.max(0, s.hop + s.hopV * dt);
        if (s.hop <= 0) {
          s.hop = 0;
          s.hopV = 0;
        }
        pet.bodyY = -s.hop;
      } else pet.bodyY = 0;

      // Hookshot: tip flies out, then every bubble on the line pops.
      if (s.hook) {
        const h = s.hook;
        h.u = Math.min(1, h.u + dt * (2.8 + sk));
        const tipX = h.ox + (h.tx - h.ox) * h.u;
        const tipY = h.oy + (h.ty - h.oy) * h.u;
        const len = Math.hypot(tipX - h.ox, tipY - h.oy);
        const ang = Math.atan2(tipY - h.oy, tipX - h.ox);
        h.el.style.width = `${Math.round(len)}px`;
        h.el.style.transform = `translate(${Math.round(h.ox)}px, ${Math.round(h.oy)}px) rotate(${ang}rad)`;
        if (h.u >= 1 && !h.hit) {
          h.hit = true;
          for (const b of s.list) if (!b.dead && distSeg(b.x, b.y, h.ox, h.oy, h.tx, h.ty) < b.r + P * 0.2) pop(b, 'her');
          this.app.sound.sfx?.('glassTap', 1.4);
          this.float(tipX, tipY, '🪝');
        }
        if (h.u >= 1) {
          h.el.remove();
          s.hook = null;
          s.ai = 'run';
          s.aiT = 0.15;
        }
      } else if (pet.mode === 'ground' && !pet.dead && s.t > 0) {
        s.aiT -= dt;
        const handY = pet.y - P * 0.45 - s.hop;
        // Touch nearby bubbles while running / at the peak of a jump.
        for (const b of s.list) {
          if (b.dead) continue;
          if (Math.hypot(b.x - pet.x, b.y - handY) < P * (0.55 + (s.hop > 0 ? 0.25 : 0))) {
            pop(b, 'her');
            this.app.sound.play('blip', { volume: 0.25, rate: 1.3 });
          }
        }
        if (s.aiT <= 0) {
          const aim = aimHook();
          const tgt = cluster();
          // Hook when a good line is open (more often as her skill grows).
          if (aim && Math.random() < 0.35 + sk * 0.4) {
            startHook(aim);
          } else if (tgt && tgt.y < pet.y - P * 1.1 && Math.abs(tgt.x - pet.x) < P * 2.2 && s.hop <= 0 && Math.random() < 0.55) {
            // Jump toward a high bubble.
            face(tgt.x);
            s.hopV = P * (7.5 + sk * 2);
            s.hop = 0.01;
            pet.anim(pet.pickClip(['jump'], ['idle']), { facing: s.facing, restart: true });
            this.app.sound.play('jump', { volume: 0.35 });
            s.ai = 'jump';
            s.aiT = 0.5;
            s.tx = tgt.x;
          } else if (tgt) {
            s.ai = 'run';
            s.tx = tgt.x;
            s.aiT = rand(0.25, 0.55);
            face(s.tx);
            pet.anim(pet.pickClip(['correr', 'run'], ['walk', 'idle']), { facing: s.facing, restart: false });
          } else {
            // Wander between machines while waiting for bubbles.
            s.tx = pick(s.machines).x;
            s.aiT = 0.6;
            face(s.tx);
            pet.anim('walk', { facing: s.facing });
          }
        }
        if (s.ai === 'run' || s.ai === 'jump') {
          const spd = pet.runSpeed * (0.85 + sk * 0.35) * (s.ai === 'jump' ? 0.7 : 1);
          const dx = s.tx - pet.x;
          if (Math.abs(dx) > 4) pet.x += Math.sign(dx) * Math.min(Math.abs(dx), spd * dt);
          pet.x = clamp(pet.x, margin, innerWidth - margin);
        }
      }

      this.info(`Você ${s.you} × ${s.her} Persocon · ${Math.max(0, Math.ceil(s.t))}s`);
      if (s.t <= 0) {
        s.over = true;
        pet.bodyY = 0;
        if (s.hook) {
          s.hook.el.remove();
          s.hook = null;
        }
        const win = s.you > s.her;
        this.say(win ? 'Você estourou mais! 😮' : s.you === s.her ? 'Empate!' : 'Ganhei! Hehe 🧼');
        this.finish(s.you, { win, coinRate: 0.3, text: `Você ${s.you} × ${s.her} Persocon` });
      }
    };
    s.cleanup = () => {
      pet.bodyY = 0;
      s.list.forEach((b) => b.el.remove());
      s.machines.forEach((m) => m.el.remove());
      s.hook?.el.remove();
    };
  }

  // ---------- 9. Pedra, papel e tesoura ----------

  jokenpo() {
    const s = this.s;
    const HANDS = ['✊', '✋', '✌️'];
    const NAMES = ['Pedra', 'Papel', 'Tesoura'];
    const panel = this.panel('mg-rps mg-synth');
    const score = div('mg-msg', panel);
    const show = div('mg-hands', panel);
    const you = div('mg-hand', show);
    div('mg-vs', show).textContent = 'vs';
    const her = div('mg-hand', show);
    const msg = div('mg-msg', panel);
    const row = div('mg-row', panel);
    const stats = (this.app.game.profile.rps ||= { w: 0, l: 0, d: 0 });
    const total = div('mg-note', panel);
    Object.assign(s, { you: 0, her: 0, busy: false, history: [] });
    const refresh = () => {
      score.textContent = `Você ${s.you} × ${s.her} Persocon`;
      total.textContent = `Placar geral: ${stats.w} derrotas · ${stats.l} vitórias da Persocon · ${stats.d} empates`;
      this.info(`Primeiro a 3 vence · ${s.you} × ${s.her}`);
    };
    const play = (mine) => {
      if (s.busy) return;
      s.busy = true;
      const counts = [0, 1, 2].map((i) => s.history.filter((h) => h === i).length);
      const fav = counts.indexOf(Math.max(...counts));
      const hers = s.history.length >= 2 && Math.random() < 0.4 + 0.25 * this.skill('jokenpo') ? (fav + 1) % 3 : Math.floor(Math.random() * 3);
      s.history.push(mine);
      you.textContent = her.textContent = '✊';
      you.classList.add('shake');
      her.classList.add('shake');
      ['Jo...', 'Ken...', 'Pô!'].forEach((w, i) => this.later(i * 0.4, () => {
        msg.textContent = w;
        this.app.sound.tone8(440 + i * 110, 440 + i * 110, 0.08, 'square', 0.06);
      }));
      this.later(1.25, () => {
        you.classList.remove('shake');
        her.classList.remove('shake');
        you.textContent = HANDS[mine];
        her.textContent = HANDS[hers];
        const r = (mine - hers + 3) % 3;
        if (r === 1) {
          // Player won: the Persocon is disappointed (sad/pouting).
          s.you++;
          stats.w++;
          msg.textContent = `${NAMES[mine]} vence ${NAMES[hers].toLowerCase()}! Ponto seu.`;
          this.pose('sad', 1.2);
          this.app.streamAlerts?.showReactionEmote?.('pouting');
        } else if (r === 2) {
          // Persocon won: celebrate (happy/smug/laughing).
          s.her++;
          stats.l++;
          msg.textContent = `${NAMES[hers]} vence ${NAMES[mine].toLowerCase()}! Ponto dela.`;
          this.pose('smug', 1.2);
          this.say(pick(['Hehe!', 'Te li!', 'Essa foi minha!']));
          this.app.streamAlerts?.showReactionEmote?.('smug');
        } else {
          stats.d++;
          msg.textContent = 'Empate!';
        }
        this.app.sound.play(r === 1 ? 'ok' : r === 2 ? 'cancel' : 'blip', { volume: 0.5 });
        refresh();
        this.app.game.changed();
        // `win` must be from the Persocon's perspective (she reached 3 first).
        if (s.you >= 3 || s.her >= 3) return this.later(1.4, () => this.finish(s.her * 3, { win: s.her >= 3, coinRate: 1, text: `Você ${s.you} × ${s.her} Persocon` }));
        s.busy = false;
      });
    };
    HANDS.forEach((hand, i) => row.append(button(`${hand} ${NAMES[i]}`, () => play(i))));
    you.textContent = her.textContent = '❔';
    msg.textContent = 'Escolha!';
    refresh();
  }

  // ---------- 10. Caça ao tesouro ----------

  tesouro() {
    const s = this.s;
    const P = this.P;
    const thermo = div('mg-thermo', this.active.root);
    const fill = div('mg-thermo-fill', thermo);
    const label = div('mg-thermo-label', thermo);
    const R = P * 0.38;
    Object.assign(s, { t: 90, found: 0, digs: 10, hintT: 3, prev: null });
    const hide = () => {
      s.spot = { x: rand(80, innerWidth - 80), y: rand(120, innerHeight - P * 0.8) };
      s.prev = null;
    };
    const heat = () => {
      const d = Math.hypot(this.mouse.x - s.spot.x, this.mouse.y - s.spot.y);
      return { d, k: clamp(1 - d / (Math.hypot(innerWidth, innerHeight) * 0.55), 0, 1) };
    };
    const word = (k) => (k > 0.93 ? 'Fervendo! 🔥' : k > 0.8 ? 'Quente!' : k > 0.62 ? 'Morno' : k > 0.4 ? 'Frio' : 'Congelando ❄️');
    const end = () => {
      if (s.over) return;
      s.over = true;
      this.finish(s.found * 10 + s.digs, { win: s.found >= 2, coinRate: 0.6, text: `${s.found}/3 tesouros` });
    };
    s.click = (x, y) => {
      if (s.over || s.digs <= 0) return;
      s.digs--;
      const hole = div('mg-hole', this.active.root);
      hole.style.left = `${x}px`;
      hole.style.top = `${y}px`;
      if (Math.hypot(x - s.spot.x, y - s.spot.y) < R) {
        s.found++;
        hole.textContent = pick(['💰', '💎', '👑', '🧰']);
        hole.classList.add('treasure');
        this.app.sound.play('ok', { volume: 0.6 });
        this.say(pick(['Achou um tesouro!', 'Uaaau, brilhante!']));
        this.pose('happy', 1.5);
        if (s.found >= 3) return this.later(1.2, end);
        hide();
      } else {
        hole.textContent = '🕳️';
        this.app.sound.play('bonk', { volume: 0.4 });
        this.float(x, y - 20, 'Nada aqui...');
      }
      if (s.digs <= 0) this.later(1, end);
    };
    s.tick = (dt) => {
      s.t -= dt;
      const { k } = heat();
      fill.style.height = `${Math.round(k * 100)}%`;
      fill.style.background = `hsl(${Math.round(220 - k * 220)}, 85%, 55%)`;
      label.textContent = word(k);
      s.hintT -= dt;
      if (s.hintT <= 0) {
        s.hintT = 4;
        const w = word(k);
        if (s.prev !== null && w !== word(s.prev)) this.say(k > s.prev ? `${w} Tá esquentando!` : `${w} Esfriou...`);
        s.prev = k;
      }
      this.info(`${s.found}/3 tesouros · ${s.digs} escavações · ${Math.max(0, Math.ceil(s.t))}s`);
      if (s.t <= 0) end();
    };
    this.say('Tem tesouro escondido na tela!');
    hide();
  }
}

function div(className, parent) {
  const el = document.createElement('div');
  el.className = className;
  parent?.append(el);
  return el;
}

function button(text, onclick, className = '') {
  const b = document.createElement('button');
  b.textContent = text;
  if (className) b.className = className;
  b.onclick = (e) => { e.stopPropagation(); onclick(); };
  return b;
}
