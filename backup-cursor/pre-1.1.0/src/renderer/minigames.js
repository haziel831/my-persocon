// Brincadeiras (minigames) played with the Persocon on a full-screen overlay. Each one opens with
// a short guide (can be turned off per game) and ends with coins, mood and affection.
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
    'O pavio é secreto: quem estiver com a batata quando ela explodir perde.']],
  ['ritmo', '🎶', 'Siga o ritmo', 'Setas no compasso enquanto ela dança', [
    'As setas descem nas 4 pistas. Aperte a seta do teclado (← ↑ ↓ →) quando ela passar pela linha.',
    'Também dá para clicar nos botões embaixo de cada pista.',
    'Acertos em sequência fazem combo. 40 segundos.']],
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
    'A Persocon sopra bolhas. Clique nelas para estourar.',
    'Bolhas douradas valem 5 pontos.',
    'Ela também estoura as que passam perto dela. 45 segundos.']],
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

// Affection needed to unlock each minigame (they stay hidden until then).
export const MG_UNLOCK = { jokenpo: 0, copos: 30, bolhas: 70, pesca: 120, batata: 180, estatua: 250, esconde: 330, ritmo: 420, desenho: 520, tesouro: 650 };
export const mgUnlocked = (id, affection) => (affection ?? 0) >= (MG_UNLOCK[id] ?? 0);

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
    if (this.active || this.guide || pet.dead || pet.chase || !byId(id) || !mgUnlocked(id, pet.affection)) return;
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
    if (pet.mode === 'ground') pet.chooseNext();
    sound.tone8(660, 990, 0.2, 'square', 0.08);
    this.app.focus?.();
    this.app.uiChanged();
    this[id]();
  }

  // score: points for the profile; coins are a share of it. opts: { win, text, quit }
  finish(score, opts = {}) {
    const a = this.active;
    if (!a) return;
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
      rec.plays++;
      if (opts.win) rec.wins++;
      const best = score > rec.best;
      if (best) rec.best = score;
      pet.adjust({ mood: opts.win ? 12 : 6, energy: -3 });
      pet.love?.(opts.win ? 3 : 1.5);
      sound.play(opts.win ? 'ok' : 'cancel', { volume: 0.6 });
      this.toast(`${opts.text || (opts.win ? 'Vitória!' : 'Fim de jogo')} · ${score} pts${best ? ' · recorde!' : ''}`);
      game.changed();
      pet.emit('miniEnd', { id: a.id, win: !!opts.win, score });
    }
    if (pet.mode === 'ground' && !pet.dead) {
      if (opts.quit) pet.chooseNext();
      else this.react(opts.win ? 'happy' : 'sad');
    }
    this.app.uiChanged();
  }

  toast(text) {
    const el = div('mg-toast', document.body);
    el.textContent = text;
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
    else if (kind === 'happy') pet.anim(pet.pickClip(['emote_pos', 'emote'], ['idle']), { facing, restart: true });
    else if (kind === 'sad') pet.anim(pet.pickClip(['emote_neg'], ['idle']), { facing, restart: true });
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
      const icons = shuffle(['📦', '🌵', '🛋️', '🧺', '🗑️', '🌳', '🚪', '🎁']);
      s.spots = [];
      for (let i = 0; i < n; i++) {
        const x = x1 + ((i + 0.5) / n) * (x2 - x1) + rand(-P * 0.1, P * 0.1);
        const el = div('mg-spot', this.active.root);
        el.textContent = icons[i];
        el.style.fontSize = `${Math.round(P * 0.62)}px`;
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
      this.app.sound.play(found ? 'ok' : 'cancel', { volume: 0.5 });
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
      this.app.sound.play('bonk', { volume: 0.4 });
      this.float(x, y - 20, 'Não está aqui!');
    };
    s.tick = (dt) => {
      if (s.phase === 'count') {
        s.t -= dt;
        cover.textContent = `🙈 Contando... ${Math.max(1, Math.ceil(s.t))}`;
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
    potato.textContent = '🥔';
    potato.style.fontSize = `${Math.round(P * 0.3)}px`;
    const bar = div('mg-holdbar', this.active.root);
    Object.assign(s, { holder: 'pet', hold: rand(0.8, 1.4), fuse: rand(25, 40), passes: 0, x: 0, y: 0, fly: null, over: false });
    this.say('Batata quente! 🔥');
    const throwTo = (target) => {
      s.fly = { x0: s.x, y0: s.y, target, t: 0, dur: 0.45 };
      s.holder = 'fly';
      this.app.sound.play('jump', { volume: 0.4 });
    };
    const explode = (playerLost) => {
      s.over = true;
      potato.textContent = '💥';
      potato.style.fontSize = `${Math.round(P * 0.6)}px`;
      bar.style.display = 'none';
      this.app.sound.play('explode', { volume: 0.5 });
      if (playerLost) this.say(pick(['Hahaha! Explodiu com você!', 'Queimou! 🔥']));
      else this.say(pick(['Aaai! Explodiu comigo!', 'Nããão! 💥']));
      this.react(playerLost ? 'happy' : 'sad');
      this.later(1.6, () => this.finish(s.passes, { win: !playerLost, text: playerLost ? 'A batata explodiu com você' : 'A batata explodiu com ela!' }));
    };
    s.click = (x, y) => {
      if (s.holder === 'player' && !s.over && this.onPet(x, y)) {
        s.passes++;
        this.app.sound.play('blip', { volume: 0.5 });
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
          this.app.sound.play('hit', { volume: 0.6 });
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
    const W = 280;
    const H = 380;
    const c = Object.assign(document.createElement('canvas'), { width: W, height: H });
    panel.append(c);
    const g = c.getContext('2d');
    const ARROWS = ['←', '↑', '↓', '→'];
    const KEYS = ['ArrowLeft', 'ArrowUp', 'ArrowDown', 'ArrowRight'];
    const COLORS = ['#ff5c8a', '#5cc8ff', '#7dff8a', '#ffd25c'];
    const btns = div('mg-row', panel);
    const bpm = clamp(this.app.modes?.bpm || 110, 80, 150);
    Object.assign(s, { t: 40, notes: [], beat: 0, score: 0, combo: 0, best: 0, hits: 0, misses: 0, flash: [0, 0, 0, 0], label: '', labelT: 0 });
    const TRAVEL = 1.6;
    const HIT_Y = H - 50;
    const hit = (lane) => {
      if (s.t <= 0) return;
      s.flash[lane] = 0.12;
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
        this.app.sound.tone8([523, 659, 587, 784][lane], [523, 659, 587, 784][lane] * 1.01, 0.09, 'square', 0.06);
        if (s.combo % 10 === 0) {
          this.app.pet.emit('gameExcite');
          this.react('happy');
        }
      } else {
        s.combo = 0;
        s.label = 'Errou';
        s.labelT = 0.4;
      }
    };
    KEYS.forEach((k, i) => btns.append(button(ARROWS[i], () => hit(i))));
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
    this.say('Vamos dançar! 🎵');
    s.tick = (dt) => {
      s.clock += dt;
      s.t -= dt;
      const spb = 60 / bpm;
      if (s.t > TRAVEL && s.clock + TRAVEL >= s.beat * spb) {
        const at = s.beat * spb + TRAVEL;
        if (s.beat > 1 && Math.random() < 0.55 + Math.min(0.3, s.clock / 100)) s.notes.push({ lane: Math.floor(Math.random() * 4), at });
        if (s.beat > 8 && s.beat % 4 === 2 && Math.random() < 0.3) s.notes.push({ lane: Math.floor(Math.random() * 4), at: at + spb / 2 });
        s.beat++;
      }
      if (Math.floor((s.clock - dt) / spb) !== Math.floor(s.clock / spb)) this.app.sound.tone8(120, 50, 0.08, 'sine', 0.05);
      for (const n of s.notes) {
        if (!n.done && s.clock - n.at > 0.17) {
          n.done = true;
          n.miss = true;
          s.combo = 0;
          s.misses++;
        }
      }
      s.notes = s.notes.filter((n) => !n.done || s.clock - n.at < 0.3);
      g.clearRect(0, 0, W, H);
      const lw = W / 4;
      for (let i = 0; i < 4; i++) {
        g.fillStyle = s.flash[i] > 0 ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.05)';
        g.fillRect(i * lw + 3, 0, lw - 6, H);
        s.flash[i] -= dt;
        g.fillStyle = COLORS[i];
        g.globalAlpha = 0.35;
        g.font = 'bold 30px system-ui';
        g.textAlign = 'center';
        g.fillText(ARROWS[i], i * lw + lw / 2, HIT_Y + 11);
        g.globalAlpha = 1;
      }
      g.fillStyle = 'rgba(255,255,255,0.6)';
      g.fillRect(0, HIT_Y - 1, W, 2);
      for (const n of s.notes) {
        if (n.done) continue;
        const y = HIT_Y - ((n.at - s.clock) / TRAVEL) * HIT_Y;
        g.fillStyle = COLORS[n.lane];
        g.font = 'bold 34px system-ui';
        g.fillText(ARROWS[n.lane], n.lane * lw + lw / 2, y + 12);
      }
      if (s.labelT > 0) {
        s.labelT -= dt;
        g.fillStyle = '#fff';
        g.font = 'bold 20px system-ui';
        g.fillText(s.label, W / 2, 40);
      }
      if (s.combo >= 3) {
        g.fillStyle = '#ffd25c';
        g.font = 'bold 16px system-ui';
        g.fillText(`Combo ${s.combo}`, W / 2, 66);
      }
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
        this.app.sound.play(f[1] ? 'ok' : 'bonk', { volume: 0.5 });
        if (f[1] >= 8) this.say(pick(['Uau, que peixão!', 'Raro!!']));
        else if (!f[1]) this.say('Uma bota?! 😒');
        this.pose('happy', 1.4);
        newCast();
      } else if (s.phase === 'wait') {
        this.float(s.bx, wy - P * 0.3, 'Espantou!');
        this.app.sound.play('cancel', { volume: 0.3 });
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
          this.app.sound.tone8(880, 1320, 0.12, 'square', 0.08);
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
      g.fillStyle = 'rgba(40,120,220,0.55)';
      g.beginPath();
      g.moveTo(wx1, floor);
      for (let x = wx1; x <= wx2; x += 8) g.lineTo(x, wy + Math.sin(x / 18 + s.clock * 3) * 3);
      g.lineTo(wx2, floor);
      g.closePath();
      g.fill();
      const hx = (pet.x ?? px) + side * P * 0.22;
      const hy = (pet.mode === 'ground' ? pet.y : floor) - P * 0.55;
      const tipX = hx + side * P * 0.55;
      const tipY = hy - P * 0.45;
      g.strokeStyle = '#7a4a22';
      g.lineWidth = 3;
      g.beginPath(); g.moveTo(hx, hy); g.lineTo(tipX, tipY); g.stroke();
      const by = wy + s.dip + Math.sin(s.clock * 4) * 1.5;
      g.strokeStyle = 'rgba(255,255,255,0.7)';
      g.lineWidth = 1;
      g.beginPath(); g.moveTo(tipX, tipY); g.quadraticCurveTo((tipX + s.bx) / 2, Math.max(tipY, by) + 10, s.bx, by - 6); g.stroke();
      g.fillStyle = '#ff3b3b';
      g.beginPath(); g.arc(s.bx, by - 4, 5, Math.PI, 0); g.fill();
      g.fillStyle = '#fff';
      g.beginPath(); g.arc(s.bx, by - 4, 5, 0, Math.PI); g.fill();
      if (s.phase === 'bite') {
        g.fillStyle = '#ffd25c';
        g.font = `bold ${Math.round(P * 0.3)}px system-ui`;
        g.textAlign = 'center';
        g.fillText('!', s.bx, by - P * 0.2);
      }
      if (s.flying) {
        const f = s.flying;
        f.t += dt;
        const k = Math.min(1, f.t / 0.6);
        g.font = `${Math.round(P * 0.25)}px system-ui`;
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
          const swaps = 3 + s.round * 2 + Math.floor(aff / 250);
          const dur = Math.max(0.16, 0.5 - s.round * 0.06 - aff / 5000);
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
            this.app.sound.tone8(300, 260, 0.05, 'square', 0.04);
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
          s.window = Math.max(0.45, 1.3 - s.round * 0.08);
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
      const aff = Math.max(0, this.app.pet.affection || 0);
      const p = clamp(0.2 + s.ink / 2500 + s.strokes * 0.03 + aff / 2500, 0.08, 0.9);
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

  bolhas() {
    const s = this.s;
    const P = this.P;
    const aff = Math.max(0, this.app.pet.affection || 0);
    Object.assign(s, { t: 45, you: 0, her: 0, spawn: 0, list: [], petT: 1.5 });
    const pop = (b, who) => {
      b.dead = true;
      b.el.classList.add('pop');
      setTimeout(() => b.el.remove(), 180);
      const pts = b.gold ? 5 : 1;
      if (who === 'you') s.you += pts;
      else s.her += pts;
      this.float(b.x, b.y - b.r, `${who === 'you' ? '+' : '🧼 +'}${pts}`);
      this.app.sound.tone8(b.gold ? 1400 : 900, b.gold ? 1800 : 1200, 0.05, 'sine', 0.06);
    };
    s.click = (x, y) => {
      const b = s.list.find((e) => !e.dead && Math.hypot(e.x - x, e.y - y) < e.r + 4);
      if (b) pop(b, 'you');
    };
    this.say('Vou soprar bolhas! 🧼');
    s.tick = (dt) => {
      s.t -= dt;
      s.spawn -= dt;
      const h = this.head();
      if (s.spawn <= 0 && s.t > 0) {
        s.spawn = Math.max(0.2, 0.45 - (45 - s.t) * 0.004);
        const r = rand(P * 0.08, P * 0.18);
        const el = div('mg-bubble', this.active.root);
        const gold = Math.random() < 0.08;
        if (gold) el.classList.add('gold');
        el.style.width = el.style.height = `${Math.round(r * 2)}px`;
        s.list.push({ el, x: h.x, y: h.y, r, vx: rand(-90, 90), vy: rand(-110, -50), ph: rand(0, 6), gold, life: rand(5, 8) });
      }
      s.petT -= dt;
      if (s.petT <= 0) {
        s.petT = rand(0.9, 1.7) * (1.4 - Math.min(0.6, aff / 1000));
        const near = s.list.filter((b) => !b.dead && Math.hypot(b.x - h.x, b.y - h.y) < P * 1.6).sort((a, b) => Math.hypot(a.x - h.x, a.y - h.y) - Math.hypot(b.x - h.x, b.y - h.y))[0];
        if (near) {
          pop(near, 'her');
          this.pose('happy', 0.8);
        }
      }
      for (const b of s.list) {
        if (b.dead) continue;
        b.life -= dt;
        b.ph += dt * 2;
        b.vx *= 1 - dt * 0.6;
        b.x += (b.vx + Math.sin(b.ph) * 25) * dt;
        b.y += b.vy * dt;
        if (b.life <= 0 || b.y < -b.r) {
          b.dead = true;
          b.el.remove();
          continue;
        }
        b.el.style.transform = `translate(${Math.round(b.x - b.r)}px, ${Math.round(b.y - b.r)}px)`;
      }
      s.list = s.list.filter((b) => !b.dead);
      this.info(`Você ${s.you} × ${s.her} Persocon · ${Math.max(0, Math.ceil(s.t))}s`);
      if (s.t <= 0 && !s.over) {
        s.over = true;
        const win = s.you > s.her;
        this.say(win ? 'Você estourou mais! 😮' : s.you === s.her ? 'Empate!' : 'Ganhei! Hehe 🧼');
        this.finish(s.you, { win, coinRate: 0.3, text: `Você ${s.you} × ${s.her} Persocon` });
      }
    };
    s.cleanup = () => s.list.forEach((b) => b.el.remove());
  }

  // ---------- 9. Pedra, papel e tesoura ----------

  jokenpo() {
    const s = this.s;
    const HANDS = ['✊', '✋', '✌️'];
    const NAMES = ['Pedra', 'Papel', 'Tesoura'];
    const panel = this.panel('mg-rps');
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
      total.textContent = `Placar geral: ${stats.w} vitórias · ${stats.l} derrotas · ${stats.d} empates`;
      this.info(`Primeiro a 3 vence · ${s.you} × ${s.her}`);
    };
    const play = (mine) => {
      if (s.busy) return;
      s.busy = true;
      const counts = [0, 1, 2].map((i) => s.history.filter((h) => h === i).length);
      const fav = counts.indexOf(Math.max(...counts));
      const hers = s.history.length >= 2 && Math.random() < 0.4 ? (fav + 1) % 3 : Math.floor(Math.random() * 3);
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
          s.you++;
          stats.w++;
          msg.textContent = `${NAMES[mine]} vence ${NAMES[hers].toLowerCase()}! Ponto seu.`;
          this.pose('sad', 1.2);
        } else if (r === 2) {
          s.her++;
          stats.l++;
          msg.textContent = `${NAMES[hers]} vence ${NAMES[mine].toLowerCase()}! Ponto dela.`;
          this.pose('happy', 1.2);
          this.say(pick(['Hehe!', 'Te li!', 'Essa foi minha!']));
        } else {
          stats.d++;
          msg.textContent = 'Empate!';
        }
        this.app.sound.play(r === 1 ? 'ok' : r === 2 ? 'cancel' : 'blip', { volume: 0.5 });
        refresh();
        this.app.game.changed();
        if (s.you >= 3 || s.her >= 3) return this.later(1.4, () => this.finish(s.you * 3, { win: s.you >= 3, coinRate: 1, text: `Você ${s.you} × ${s.her} Persocon` }));
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
