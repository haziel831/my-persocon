// Tiny Game Boy games: the pet plays them on its own (think → input), and the player can join
// with the arrow keys (+ space/up as the button). Pong and Combat are real 2-player games;
// everything else runs split-screen (left = pet, right = player).

const PAL = ['#0f380f', '#306230', '#8bac0f', '#9bbc0f'];
const W = 80;
const H = 72;
const rnd = (a, b) => a + Math.random() * (b - a);
const ri = (n) => Math.floor(Math.random() * n);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// tier = complexity: price and how long it takes to get good at it. vs: 'native' | 'split'.
export const GAMES = {
  tetris: { name: 'Tetris', color: '#e94b6a', tier: 2, vs: 'split' },
  pong: { name: 'Pong', color: '#f4f1ea', tier: 1, vs: 'native' },
  galaga: { name: 'Galaga', color: '#4c8ef0', tier: 2, vs: 'split' },
  asteroids: { name: 'Asteroids', color: '#ffa53a', tier: 2, vs: 'split' },
  invaders: { name: 'Space Invaders', color: '#7bd35a', tier: 2, vs: 'split' },
  flappy: { name: 'Flappy Bird', color: '#f6d23c', tier: 1, vs: 'split' },
  breakout: { name: 'Breakout', color: '#e2603b', tier: 1, vs: 'split' },
  combat: { name: 'Combat (1977)', color: '#9a8a52', tier: 2, vs: 'native' },
  riverraid: { name: 'River Raid', color: '#3c7be0', tier: 3, vs: 'split' },
  pacman: { name: 'Pac-Man', color: '#ffe23a', tier: 3, vs: 'split' },
  donkeykong: { name: 'Donkey Kong', color: '#b0582c', tier: 3, vs: 'split' },
  sonic: { name: 'Sonic', color: '#2d5fe0', tier: 4, vs: 'split' },
  marioworld: { name: 'Mario World', color: '#e23c3c', tier: 4, vs: 'split' },
  mariokart: { name: 'Mario Kart', color: '#38b04a', tier: 5, vs: 'split' },
};

const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12);
const N = { A4: 69, B4: 71, C5: 72, D5: 74, E5: 76, F5: 77, G5: 79, A5: 81, R: 0 };
// Korobeiniki (folk tune used by Tetris).
const KORO = 'E5 2 B4 1 C5 1 D5 2 C5 1 B4 1 A4 2 A4 1 C5 1 E5 2 D5 1 C5 1 B4 3 C5 1 D5 2 E5 2 C5 2 A4 2 A4 4 R 1 D5 3 F5 1 A5 2 G5 1 F5 1 E5 3 C5 1 E5 2 D5 1 C5 1 B4 2 B4 1 C5 1 D5 2 E5 2 C5 2 A4 2 A4 4'
  .split(' ').reduce((a, v, i, arr) => (i % 2 ? a : [...a, [N[v], +arr[i + 1]]]), []);
const LOOPS = {
  tetris: KORO,
  galaga: [[N.C5, 1], [N.E5, 1], [N.G5, 1], [N.E5, 1], [N.A4, 1], [N.C5, 1], [N.E5, 2]],
  pong: [[N.A4, 2], [N.R, 6]],
  asteroids: [[45, 2], [44, 2]],
  invaders: [[45, 2], [43, 2], [41, 2], [40, 2]],
  flappy: [[N.G5, 1], [N.R, 1], [N.E5, 1], [N.R, 1], [N.C5, 2], [N.R, 2]],
  breakout: [[N.C5, 1], [N.G5, 1], [N.C5, 1], [N.A5, 1]],
  combat: [[40, 3], [N.R, 1], [43, 3], [N.R, 1]],
  riverraid: [[N.A4, 1], [N.A4, 1], [N.C5, 1], [N.D5, 1]],
  pacman: [[N.B4, 1], [83, 1], [78, 1], [75, 1], [83, 1], [78, 2], [75, 2]],
  donkeykong: [[N.C5, 1], [N.R, 1], [N.C5, 1], [N.D5, 1], [N.E5, 2], [N.C5, 2]],
  sonic: [[N.E5, 1], [N.G5, 1], [N.A5, 1], [N.G5, 1], [N.E5, 1], [N.D5, 1], [N.C5, 2]],
  marioworld: [[N.E5, 1], [N.E5, 1], [N.R, 1], [N.E5, 1], [N.R, 1], [N.C5, 1], [N.E5, 2], [N.G5, 2], [N.R, 2]],
  mariokart: [[N.C5, 1], [N.E5, 1], [N.G5, 1], [N.C5, 1], [N.A4, 1], [N.C5, 1], [N.F5, 2]],
};

export class GameScreen {
  constructor(sound) {
    this.sound = sound;
    this.el = document.createElement('div');
    this.el.className = 'gb-screen hitzone';
    this.canvas = document.createElement('canvas');
    this.title = document.createElement('div');
    this.el.append(this.canvas, this.title);
    document.body.appendChild(this.el);
    this.g = this.canvas.getContext('2d');
    this.game = null;
    this.keys = {};
    addEventListener('keydown', (e) => this.key(e, true));
    addEventListener('keyup', (e) => this.key(e, false));
  }

  // gb | gg | psp | tv: frame style of the screen (CSS via data-console).
  setConsole(id) {
    this.el.dataset.console = id || 'gb';
  }

  key(e, down) {
    if (!this.vs || this.ai2 || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(e.key)) return;
    this.keys[e.key] = down;
    e.preventDefault();
    e.stopPropagation();
  }

  // skill: 0..1, how good the pet is at this game. vs: the player joins. ai2: skill of the Doll as player 2.
  start(game, { skill = 0.3, vs = false, ai2 = 0 } = {}) {
    this.game = game;
    this.skill = skill;
    this.ai2 = vs ? ai2 : 0;
    this.vs = vs;
    this.native = vs && GAMES[game]?.vs === 'native';
    this.split = vs && !this.native;
    this.canvas.width = this.split ? W * 2 + 2 : W;
    this.canvas.height = H;
    this.el.classList.toggle('vs', vs);
    this.el.classList.toggle('split', this.split);
    this.title.textContent = (GAMES[game]?.name || game) + (vs ? (this.ai2 ? ' · VS Doll' : ' · VS') : '');
    this.sides = [this.newState()];
    if (this.split) this.sides.push(this.newState());
    this.motion = 0;
    this.press = 0;
    this.musicStep = 0;
    this.musicT = 0;
    this.keys = {};
    this.el.style.display = 'block';
  }

  newState() {
    const s = { t: 0, score: 0 };
    this.def.init?.call(this, s);
    return s;
  }

  get def() {
    this.table ||= this.games;
    return this.table[this.game] || {};
  }

  stop() {
    this.game = null;
    this.vs = false;
    this.ai2 = 0;
    this.el.style.display = 'none';
  }

  // Score of [pet, player].
  scores() {
    const a = this.sides[0];
    if (this.native) return [a.score, a.score2 || 0];
    return [a.score, this.sides[1]?.score || 0];
  }

  sfx(f0, f1, dur = 0.06, type = 'square', vol = 0.12) {
    this.sound.tone8(f0, f1, dur, type, vol * (this.sound.cfg?.gbVolume ?? 0.25));
  }

  music(dt) {
    const seq = LOOPS[this.game];
    if (!seq) return;
    this.musicT -= dt;
    if (this.musicT > 0) return;
    const [n, len] = seq[this.musicStep++ % seq.length];
    const beat = this.game === 'tetris' ? 0.14 : 0.12;
    this.musicT = len * beat;
    if (n) this.sfx(NOTE(n), NOTE(n), len * beat * 0.9, ['asteroids', 'invaders', 'combat'].includes(this.game) ? 'triangle' : 'square', 0.05);
  }

  playerInput() {
    const k = this.keys;
    return { x: (k.ArrowRight ? 1 : 0) - (k.ArrowLeft ? 1 : 0), y: (k.ArrowDown ? 1 : 0) - (k.ArrowUp ? 1 : 0), a: !!(k[' '] || k.ArrowUp) };
  }

  // The pet's input, made sloppier when it is not good at the game yet.
  petInput(s) {
    const c = this.def.think?.call(this, s) || { x: 0, y: 0, a: false };
    const miss = (1 - this.skill) * 0.5;
    if (Math.random() < miss * 0.3) c.x = ri(3) - 1;
    if (Math.random() < miss * 0.2) c.a = !c.a;
    return c;
  }

  dollInput(s) {
    const k = this.skill;
    this.skill = this.ai2;
    const c = this.petInput(s);
    this.skill = k;
    return c;
  }

  update(dt) {
    if (!this.game) return;
    this.music(dt);
    const g = this.g;
    const d = this.def;
    const pet = this.sides[0];
    const c = this.petInput(pet);
    this.motion += (c.x - this.motion) * Math.min(1, dt * 8);
    if (c.a) this.press = 1;
    this.press = Math.max(0, this.press - dt * 4);
    const draw = (s, input, ox) => {
      s.t += dt;
      g.save();
      g.translate(ox, 0);
      g.beginPath();
      g.rect(0, 0, W, H);
      g.clip();
      g.fillStyle = PAL[3];
      g.fillRect(0, 0, W, H);
      d.step?.call(this, s, dt, g, input, this.native && !this.ai2 ? this.playerInput() : null);
      g.restore();
    };
    draw(pet, c, 0);
    if (this.split) {
      g.fillStyle = PAL[0];
      g.fillRect(W, 0, 2, H);
      draw(this.sides[1], this.ai2 ? this.dollInput(this.sides[1]) : this.playerInput(), W + 2);
    }
  }

  text(g, str, x, y, c = 0) {
    g.fillStyle = PAL[c];
    g.font = '7px monospace';
    g.textBaseline = 'top';
    g.fillText(str, x, y);
  }

  // ---------- games: init(s) · think(s) → {x, y, a} · step(s, dt, g, input, p2?) ----------

  get games() {
    return {
      tetris: { init: (s) => this.tetrisInit(s), think: (s) => this.tetrisThink(s), step: this.tetris },
      pong: { init: (s) => Object.assign(s, { bx: 40, by: 36, vx: 40, vy: 25, l: 36, r: 36, score2: 0 }), think: (s) => ({ x: 0, y: Math.sign(s.by - s.l + rnd(-3, 3) * (1 - this.skill) * 3), a: false }), step: this.pong },
      asteroids: { init: (s) => Object.assign(s, { ang: 0, shots: [], rocks: Array.from({ length: 5 }, () => this.rock(6)), cool: 0 }), think: this.asteroidsThink, step: this.asteroids },
      invaders: { init: (s) => Object.assign(s, { inv: this.grid(), dx: 6, px: 40, shots: [], cool: 0, galaga: false, divers: [] }), think: this.shooterThink, step: this.shooter },
      galaga: { init: (s) => Object.assign(s, { inv: this.grid(), dx: 4, px: 40, shots: [], cool: 0, galaga: true, divers: [] }), think: this.shooterThink, step: this.shooter },
      flappy: { init: (s) => Object.assign(s, { y: 36, vy: 0, pipes: [], next: 0, flapped: false }), think: this.flappyThink, step: this.flappy },
      breakout: { init: (s) => Object.assign(s, { px: 40, bx: 40, by: 50, vx: 30, vy: -34, bricks: this.bricks() }), think: (s) => ({ x: Math.sign(s.bx - s.px) * (Math.abs(s.bx - s.px) > 2 ? 1 : 0), y: 0, a: false }), step: this.breakout },
      combat: { init: (s) => Object.assign(s, { tanks: [{ x: 12, y: 36, a: 0, cool: 0 }, { x: 68, y: 36, a: Math.PI, cool: 0 }], shots: [], score2: 0 }), think: this.combatThink, step: this.combat },
      riverraid: { init: (s) => Object.assign(s, { px: 40, scroll: 0, river: [], foes: [], shots: [], fuel: 1, cool: 0 }), think: this.riverThink, step: this.riverraid },
      pacman: { init: (s) => this.pacInit(s), think: this.pacThink, step: this.pacman },
      donkeykong: { init: (s) => Object.assign(s, { x: 8, y: 0, floor: 0, vy: 0, barrels: [], next: 1, climbing: false }), think: this.kongThink, step: this.donkeykong },
      sonic: { init: (s) => this.runnerInit(s, 'sonic'), think: this.runnerThink, step: this.runner },
      marioworld: { init: (s) => this.runnerInit(s, 'mario'), think: this.runnerThink, step: this.runner },
      mariokart: { init: (s) => Object.assign(s, { pos: 0, x: 0, speed: 0, karts: [{ z: 30, x: -0.3 }, { z: 70, x: 0.4 }, { z: 120, x: 0 }], place: 4 }), think: (s) => ({ x: Math.sign(this.curve(s.pos + 8) * 0.6 - s.x) * (Math.abs(this.curve(s.pos + 8) * 0.6 - s.x) > 0.08 ? 1 : 0), y: -1, a: true }), step: this.mariokart },
    };
  }

  // ---------- Tetris ----------

  tetrisInit(s) {
    s.board = Array.from({ length: 18 }, () => Array(10).fill(0));
    s.drop = 0;
    s.move = 0;
    this.newPiece(s);
  }

  newPiece(s) {
    const SHAPES = [[[1, 1, 1, 1]], [[1, 1], [1, 1]], [[0, 1, 0], [1, 1, 1]], [[1, 0, 0], [1, 1, 1]], [[0, 0, 1], [1, 1, 1]], [[1, 1, 0], [0, 1, 1]], [[0, 1, 1], [1, 1, 0]]];
    let p = SHAPES[ri(7)];
    for (let r = ri(4); r > 0; r--) p = this.rot(p);
    s.piece = p;
    s.px = ri(11 - p[0].length);
    s.py = 0;
    s.target = ri(11 - p[0].length);
    if (this.hits(s, s.px, 0)) s.board = s.board.map((row) => row.fill(0));
  }

  rot(p) {
    return p[0].map((_, i) => p.map((row) => row[i]).reverse());
  }

  hits(s, x, y, piece = s.piece) {
    return piece.some((row, j) => row.some((v, i) => v && (x + i < 0 || x + i > 9 || y + j >= 18 || s.board[y + j]?.[x + i])));
  }

  tetrisThink(s) {
    return { x: Math.sign(s.target - s.px), y: s.px === s.target && this.skill > 0.6 ? 1 : 0, a: false };
  }

  tetris(s, dt, g, c) {
    s.move -= dt;
    if (s.move <= 0 && (c.x || c.a)) {
      s.move = 0.12;
      if (c.x && !this.hits(s, s.px + c.x, s.py)) s.px += c.x;
      if (c.a && !s.rotHeld) {
        const r = this.rot(s.piece);
        if (!this.hits(s, s.px, s.py, r)) s.piece = r;
      }
    }
    s.rotHeld = c.a;
    s.drop += dt * (c.y > 0 ? 5 : 1);
    if (s.drop > 0.3) {
      s.drop = 0;
      if (this.hits(s, s.px, s.py + 1)) {
        s.piece.forEach((row, j) => row.forEach((v, i) => v && s.board[s.py + j] && (s.board[s.py + j][s.px + i] = 1)));
        const full = s.board.filter((row) => row.every(Boolean)).length;
        s.board = s.board.filter((row) => !row.every(Boolean));
        while (s.board.length < 18) s.board.unshift(Array(10).fill(0));
        s.score += full * 100 + 10;
        if (full) this.sfx(500, 1000, 0.15);
        else this.sfx(180, 120, 0.04, 'square', 0.08);
        this.newPiece(s);
      } else s.py++;
    }
    const cell = (x, y, col) => {
      g.fillStyle = PAL[col];
      g.fillRect(4 + x * 4, y * 4, 4, 4);
      g.fillStyle = PAL[col === 0 ? 1 : 0];
      g.fillRect(4 + x * 4 + 3, y * 4, 1, 4);
    };
    g.fillStyle = PAL[2];
    g.fillRect(0, 0, 4, H);
    g.fillRect(44, 0, 4, H);
    s.board.forEach((row, y) => row.forEach((v, x) => v && cell(x, y, 1)));
    s.piece.forEach((row, j) => row.forEach((v, i) => v && cell(s.px + i, s.py + j, 0)));
    this.text(g, String(s.score), 52, 8);
  }

  // ---------- Pong (native 2P: pet = left, player = right) ----------

  pong(s, dt, g, c, p2) {
    s.bx += s.vx * dt;
    s.by += s.vy * dt;
    if (s.by < 2 || s.by > H - 3) {
      s.vy *= -1;
      s.by = clamp(s.by, 2, H - 3);
      this.sfx(300, 300, 0.03);
    }
    s.l = clamp(s.l + c.y * 55 * dt, 7, H - 7);
    if (p2) s.r = clamp(s.r + p2.y * 55 * dt, 7, H - 7);
    else s.r += (s.by + Math.sin(s.t * 2) * 10 - s.r) * Math.min(1, dt * 3.5);
    for (const [px, py, side] of [[4, s.l, 1], [75, s.r, -1]]) {
      if (Math.abs(s.bx - px) < 2 && Math.abs(s.by - py) < 8 && Math.sign(s.vx) !== side) {
        s.vx = -s.vx * 1.05;
        s.vy += (s.by - py) * 3 + rnd(-6, 6);
        this.sfx(600, 600, 0.04);
      }
    }
    if (s.bx < 0 || s.bx > W) {
      if (s.bx < 0) s.score2++;
      else s.score++;
      const dir = s.bx < 0 ? 1 : -1;
      Object.assign(s, { bx: 40, by: 36, vx: dir * 40, vy: rnd(-25, 25) });
      this.sfx(200, 80, 0.25);
    }
    g.fillStyle = PAL[1];
    for (let y = 0; y < H; y += 6) g.fillRect(39, y, 2, 3);
    g.fillStyle = PAL[0];
    g.fillRect(3, s.l - 7, 2, 14);
    g.fillRect(75, s.r - 7, 2, 14);
    g.fillRect(s.bx - 1, s.by - 1, 3, 3);
    this.text(g, `${s.score}`, 30, 2);
    this.text(g, `${s.score2}`, 46, 2);
  }

  // ---------- Asteroids ----------

  rock(r, x = rnd(0, W), y = rnd(0, H)) {
    return { x, y, r, vx: rnd(-12, 12), vy: rnd(-12, 12) };
  }

  asteroidsThink(s) {
    const r = s.rocks[0];
    if (!r) return { x: 1, y: 0, a: false };
    const want = Math.atan2(r.y - 36, r.x - 40);
    const diff = Math.atan2(Math.sin(want - s.ang), Math.cos(want - s.ang));
    return { x: Math.abs(diff) > 0.15 ? Math.sign(diff) : 0, y: 0, a: Math.abs(diff) < 0.4 };
  }

  asteroids(s, dt, g, c) {
    s.ang += c.x * dt * 3;
    s.cool -= dt;
    if (c.a && s.cool <= 0) {
      s.cool = 0.3;
      s.shots.push({ x: 40, y: 36, vx: Math.cos(s.ang) * 60, vy: Math.sin(s.ang) * 60, t: 1 });
      this.sfx(900, 300, 0.05, 'square', 0.06);
    }
    for (const o of s.shots) {
      o.x += o.vx * dt;
      o.y += o.vy * dt;
      o.t -= dt;
    }
    for (const r of s.rocks) {
      r.x = (r.x + r.vx * dt + W) % W;
      r.y = (r.y + r.vy * dt + H) % H;
    }
    for (const sh of s.shots) {
      const hit = s.rocks.find((r) => Math.hypot(r.x - sh.x, r.y - sh.y) < r.r + 1);
      if (!hit) continue;
      sh.t = 0;
      s.score += 20;
      s.rocks.splice(s.rocks.indexOf(hit), 1);
      if (hit.r > 3) s.rocks.push(this.rock(hit.r / 2, hit.x, hit.y), this.rock(hit.r / 2, hit.x, hit.y));
      this.sfx(150, 40, 0.15, 'sawtooth', 0.1);
    }
    s.shots = s.shots.filter((o) => o.t > 0);
    if (s.rocks.length < 3) s.rocks.push(this.rock(6, 0, rnd(0, H)));
    g.strokeStyle = PAL[0];
    g.fillStyle = PAL[0];
    for (const r of s.rocks) {
      g.beginPath();
      g.arc(Math.round(r.x), Math.round(r.y), r.r, 0, Math.PI * 2);
      g.stroke();
    }
    for (const o of s.shots) g.fillRect(o.x, o.y, 1, 1);
    g.beginPath();
    g.moveTo(40 + Math.cos(s.ang) * 5, 36 + Math.sin(s.ang) * 5);
    g.lineTo(40 + Math.cos(s.ang + 2.5) * 4, 36 + Math.sin(s.ang + 2.5) * 4);
    g.lineTo(40 + Math.cos(s.ang - 2.5) * 4, 36 + Math.sin(s.ang - 2.5) * 4);
    g.closePath();
    g.fill();
    this.text(g, String(s.score), 2, 2);
  }

  // ---------- Space Invaders / Galaga ----------

  grid() {
    const inv = [];
    for (let r = 0; r < 4; r++) for (let c = 0; c < 7; c++) inv.push({ x: 8 + c * 9, y: 6 + r * 7, alive: true });
    return inv;
  }

  shooterThink(s) {
    if (!s.aim || !s.aim.alive || Math.random() < 0.01) s.aim = s.inv.filter((i) => i.alive)[ri(s.inv.filter((i) => i.alive).length)];
    const dx = (s.aim?.x ?? 40) - s.px;
    return { x: Math.abs(dx) > 1.5 ? Math.sign(dx) : 0, y: 0, a: Math.abs(dx) < 4 };
  }

  shooter(s, dt, g, c) {
    let alive = s.inv.filter((i) => i.alive);
    if (!alive.length) {
      s.inv = this.grid();
      alive = s.inv;
    }
    const minX = Math.min(...alive.map((i) => i.x));
    const maxX = Math.max(...alive.map((i) => i.x));
    if ((s.dx > 0 && maxX > W - 6) || (s.dx < 0 && minX < 3)) {
      s.dx = -s.dx;
      if (!s.galaga) for (const i of s.inv) i.y += 2;
      if (Math.max(...alive.map((i) => i.y)) > 55) s.inv = this.grid();
    }
    for (const i of s.inv) i.x += s.dx * dt;
    s.px = clamp(s.px + c.x * 34 * dt, 4, W - 4);
    s.cool -= dt;
    if (c.a && s.cool <= 0) {
      s.cool = 0.4;
      s.shots.push({ x: s.px, y: 64 });
      this.sfx(1200, 600, 0.04, 'square', 0.05);
    }
    if (s.galaga && Math.random() < dt * 0.5 && alive.length) s.divers.push({ ...alive[ri(alive.length)], t: 0 });
    for (const sh of s.shots) sh.y -= 70 * dt;
    for (const sh of s.shots) {
      const hit = s.inv.find((i) => i.alive && Math.abs(i.x - sh.x) < 4 && Math.abs(i.y - sh.y) < 3);
      if (hit) {
        hit.alive = false;
        sh.y = -10;
        s.score += 10;
        this.sfx(220, 60, 0.12, 'sawtooth', 0.08);
      }
    }
    s.shots = s.shots.filter((sh) => sh.y > 0);
    g.fillStyle = PAL[0];
    const stepF = Math.floor(s.t * 3) % 2;
    for (const i of s.inv) {
      if (!i.alive) continue;
      g.fillRect(i.x - 3, i.y - 1, 6, 3);
      g.fillRect(i.x - 3 + (stepF ? 0 : 1), i.y + 2, 1, 1);
      g.fillRect(i.x + 2 - (stepF ? 0 : 1), i.y + 2, 1, 1);
      g.fillStyle = PAL[3];
      g.fillRect(i.x - 2, i.y, 1, 1);
      g.fillRect(i.x + 1, i.y, 1, 1);
      g.fillStyle = PAL[0];
    }
    if (s.galaga) {
      for (const d of s.divers) {
        d.t += dt;
        d.y += 30 * dt;
        d.x += Math.sin(d.t * 4) * 30 * dt;
        g.fillStyle = PAL[1];
        g.fillRect(d.x - 2, d.y - 2, 5, 4);
      }
      s.divers = s.divers.filter((d) => d.y < H);
      g.fillStyle = PAL[0];
    }
    for (const sh of s.shots) g.fillRect(sh.x, sh.y, 1, 3);
    g.fillRect(s.px - 3, 66, 7, 3);
    g.fillRect(s.px - 1, 64, 3, 2);
    this.text(g, String(s.score), 2, 62, 1);
  }

  // ---------- Flappy Bird ----------

  flappyThink(s) {
    const p = s.pipes.find((q) => q.x + 6 > 18);
    const gap = p ? p.gap + 4 : 36;
    return { x: 0, y: 0, a: s.y > gap + rnd(-3, 3) && s.vy > -10 };
  }

  flappy(s, dt, g, c) {
    if (c.a && !s.flapped) {
      s.vy = -52;
      this.sfx(700, 1100, 0.05, 'square', 0.05);
    }
    s.flapped = c.a;
    s.vy += 160 * dt;
    s.y += s.vy * dt;
    s.next -= dt;
    if (s.next <= 0) {
      s.next = 1.6;
      s.pipes.push({ x: W, gap: rnd(16, 48), scored: false });
    }
    for (const p of s.pipes) p.x -= 26 * dt;
    s.pipes = s.pipes.filter((p) => p.x > -10);
    const hit = s.y > H - 4 || s.y < 0 || s.pipes.some((p) => p.x < 22 && p.x + 8 > 16 && (s.y < p.gap - 9 || s.y > p.gap + 9));
    for (const p of s.pipes) if (!p.scored && p.x + 8 < 16) {
      p.scored = true;
      s.score++;
      this.sfx(900, 900, 0.05);
    }
    if (hit) {
      this.sfx(300, 60, 0.2, 'sawtooth', 0.08);
      Object.assign(s, { y: 36, vy: 0, pipes: [], next: 0.5 });
    }
    g.fillStyle = PAL[1];
    for (const p of s.pipes) {
      g.fillRect(p.x, 0, 8, p.gap - 9);
      g.fillRect(p.x, p.gap + 9, 8, H);
    }
    g.fillStyle = PAL[2];
    g.fillRect(0, H - 3, W, 3);
    g.fillStyle = PAL[0];
    g.fillRect(16, s.y - 2, 5, 4);
    g.fillRect(19, s.y - 1, 3, 1);
    this.text(g, String(s.score), 38, 2);
  }

  // ---------- Breakout ----------

  bricks() {
    const b = [];
    for (let r = 0; r < 4; r++) for (let c = 0; c < 9; c++) b.push({ x: 2 + c * 8.5, y: 8 + r * 5, alive: true });
    return b;
  }

  breakout(s, dt, g, c) {
    s.px = clamp(s.px + c.x * 50 * dt, 6, W - 6);
    s.bx += s.vx * dt;
    s.by += s.vy * dt;
    if (s.bx < 1 || s.bx > W - 1) {
      s.vx *= -1;
      s.bx = clamp(s.bx, 1, W - 1);
    }
    if (s.by < 1) s.vy = Math.abs(s.vy);
    if (s.vy > 0 && s.by > 64 && s.by < 67 && Math.abs(s.bx - s.px) < 7) {
      s.vy = -Math.abs(s.vy);
      s.vx = (s.bx - s.px) * 6;
      this.sfx(500, 500, 0.03);
    }
    if (s.by > H) {
      this.sfx(200, 60, 0.2);
      Object.assign(s, { bx: s.px, by: 50, vx: rnd(-30, 30), vy: -34 });
    }
    const hit = s.bricks.find((b) => b.alive && s.bx > b.x && s.bx < b.x + 8 && s.by > b.y && s.by < b.y + 4);
    if (hit) {
      hit.alive = false;
      s.vy *= -1;
      s.score += 10;
      this.sfx(800, 600, 0.04);
    }
    if (!s.bricks.some((b) => b.alive)) s.bricks = this.bricks();
    g.fillStyle = PAL[1];
    for (const b of s.bricks) if (b.alive) g.fillRect(b.x, b.y, 7, 4);
    g.fillStyle = PAL[0];
    g.fillRect(s.px - 6, 65, 12, 2);
    g.fillRect(s.bx - 1, s.by - 1, 2, 2);
    this.text(g, String(s.score), 2, 0);
  }

  // ---------- Combat (native 2P tanks) ----------

  combatThink(s) {
    const [me, foe] = s.tanks;
    const want = Math.atan2(foe.y - me.y, foe.x - me.x);
    const diff = Math.atan2(Math.sin(want - me.a), Math.cos(want - me.a));
    const far = Math.hypot(foe.x - me.x, foe.y - me.y) > 30;
    return { x: Math.abs(diff) > 0.12 ? Math.sign(diff) : 0, y: far ? -1 : 0, a: Math.abs(diff) < 0.25 };
  }

  combat(s, dt, g, c, p2) {
    const inputs = [c, p2 || this.combatAI(s)];
    s.tanks.forEach((t, i) => {
      const k = inputs[i];
      t.a += k.x * 2.6 * dt;
      const sp = -k.y * 18 * dt;
      t.x = clamp(t.x + Math.cos(t.a) * sp, 4, W - 4);
      t.y = clamp(t.y + Math.sin(t.a) * sp, 4, H - 4);
      if (Math.abs(t.x - 40) < 4 && Math.abs(t.y - 36) < 10) t.x = t.x < 40 ? 36 : 44;
      t.cool -= dt;
      if (k.a && t.cool <= 0) {
        t.cool = 0.9;
        s.shots.push({ x: t.x, y: t.y, vx: Math.cos(t.a) * 50, vy: Math.sin(t.a) * 50, from: i, life: 1.6 });
        this.sfx(160, 90, 0.1, 'sawtooth', 0.08);
      }
    });
    for (const sh of s.shots) {
      sh.x += sh.vx * dt;
      sh.y += sh.vy * dt;
      sh.life -= dt;
      if (sh.x < 1 || sh.x > W - 1) sh.vx *= -1;
      if (sh.y < 1 || sh.y > H - 1) sh.vy *= -1;
      const foe = s.tanks[1 - sh.from];
      if (Math.hypot(foe.x - sh.x, foe.y - sh.y) < 4) {
        sh.life = 0;
        if (sh.from === 0) s.score++;
        else s.score2++;
        foe.a += Math.PI;
        this.sfx(120, 30, 0.3, 'sawtooth', 0.1);
      }
    }
    s.shots = s.shots.filter((sh) => sh.life > 0);
    g.fillStyle = PAL[2];
    g.fillRect(38, 26, 4, 20);
    s.tanks.forEach((t, i) => {
      g.fillStyle = PAL[i ? 1 : 0];
      g.fillRect(t.x - 3, t.y - 3, 6, 6);
      g.fillRect(t.x + Math.cos(t.a) * 4 - 1, t.y + Math.sin(t.a) * 4 - 1, 2, 2);
    });
    g.fillStyle = PAL[0];
    for (const sh of s.shots) g.fillRect(sh.x, sh.y, 1, 1);
    this.text(g, `${s.score}`, 4, 1);
    this.text(g, `${s.score2}`, 70, 1, 1);
  }

  combatAI(s) {
    const [foe, me] = s.tanks;
    const want = Math.atan2(foe.y - me.y, foe.x - me.x);
    const diff = Math.atan2(Math.sin(want - me.a), Math.cos(want - me.a));
    return { x: Math.abs(diff) > 0.2 ? Math.sign(diff) : 0, y: Math.sin(s.t) > 0 ? -1 : 0, a: Math.abs(diff) < 0.3 };
  }

  // ---------- River Raid ----------

  riverAt(s, y) {
    const k = (s.scroll - y) * 0.05;
    const center = 40 + Math.sin(k) * 14 + Math.sin(k * 0.37) * 8;
    const half = 16 + Math.sin(k * 0.6) * 6;
    return [center - half, center + half];
  }

  riverThink(s) {
    const [l, r] = this.riverAt(s, 50);
    const foe = s.foes.find((f) => f.y < 60 && f.y > 10);
    const target = foe ? foe.x : (l + r) / 2;
    return { x: Math.abs(target - s.px) > 2 ? Math.sign(target - s.px) : 0, y: 0, a: !!foe && Math.abs(foe.x - s.px) < 5 };
  }

  riverraid(s, dt, g, c) {
    s.scroll += 22 * dt;
    s.px += c.x * 36 * dt;
    s.fuel -= dt * 0.04;
    s.cool -= dt;
    if (c.a && s.cool <= 0) {
      s.cool = 0.35;
      s.shots.push({ x: s.px, y: 60 });
      this.sfx(1000, 400, 0.04, 'square', 0.05);
    }
    if (Math.random() < dt * 0.9) {
      const [l, r] = this.riverAt(s, 0);
      s.foes.push({ x: rnd(l + 4, r - 4), y: 0, fuel: Math.random() < 0.25 });
    }
    for (const f of s.foes) f.y += 22 * dt;
    for (const sh of s.shots) sh.y -= 80 * dt;
    for (const sh of s.shots) {
      const f = s.foes.find((q) => Math.abs(q.x - sh.x) < 4 && Math.abs(q.y - sh.y) < 3);
      if (f) {
        f.y = H + 9;
        sh.y = -9;
        s.score += f.fuel ? 5 : 30;
        this.sfx(200, 50, 0.12, 'sawtooth', 0.08);
      }
    }
    const [l, r] = this.riverAt(s, 62);
    const crash = s.px < l + 2 || s.px > r - 2 || s.fuel <= 0 || s.foes.some((f) => !f.fuel && Math.abs(f.x - s.px) < 4 && Math.abs(f.y - 62) < 3);
    for (const f of s.foes) if (f.fuel && Math.abs(f.x - s.px) < 5 && Math.abs(f.y - 62) < 4) s.fuel = Math.min(1, s.fuel + dt * 0.6);
    if (crash) {
      this.sfx(150, 30, 0.35, 'sawtooth', 0.1);
      Object.assign(s, { px: (l + r) / 2, fuel: 1, foes: [] });
    }
    s.foes = s.foes.filter((f) => f.y < H + 4);
    s.shots = s.shots.filter((sh) => sh.y > 0);
    g.fillStyle = PAL[1];
    for (let y = 0; y < H; y += 2) {
      const [a, b] = this.riverAt(s, y);
      g.fillRect(0, y, a, 2);
      g.fillRect(b, y, W - b, 2);
    }
    for (const f of s.foes) {
      g.fillStyle = PAL[f.fuel ? 2 : 0];
      g.fillRect(f.x - 3, f.y - 1, 6, f.fuel ? 5 : 3);
    }
    g.fillStyle = PAL[0];
    for (const sh of s.shots) g.fillRect(sh.x, sh.y, 1, 2);
    g.fillRect(s.px - 3, 62, 7, 2);
    g.fillRect(s.px - 1, 59, 3, 6);
    g.fillRect(2, H - 4, 20 * s.fuel, 2);
    this.text(g, String(s.score), 50, 1);
  }

  // ---------- Pac-Man ----------

  pacInit(s) {
    const MAP = [
      '##########',
      '#........#',
      '#.##.##..#',
      '#........#',
      '#.#.##.#.#',
      '#...#....#',
      '#.#...##.#',
      '#........#',
      '##########',
    ];
    s.map = MAP.map((r) => r.split(''));
    Object.assign(s, { cx: 1, cy: 1, dir: [1, 0], want: [1, 0], prog: 0, ghosts: [{ cx: 8, cy: 7, dir: [-1, 0], prog: 0 }, { cx: 8, cy: 1, dir: [0, 1], prog: 0 }] });
  }

  pacOpen(s, x, y) {
    return s.map[y]?.[x] && s.map[y][x] !== '#';
  }

  pacThink(s) {
    if (s.prog > 0.1) return { x: s.want[0], y: s.want[1], a: false };
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => this.pacOpen(s, s.cx + dx, s.cy + dy));
    const danger = (dx, dy) => s.ghosts.some((gh) => Math.abs(gh.cx - (s.cx + dx)) + Math.abs(gh.cy - (s.cy + dy)) < 2);
    const dot = (dx, dy) => s.map[s.cy + dy][s.cx + dx] === '.';
    const safe = dirs.filter(([dx, dy]) => !danger(dx, dy));
    const pool = safe.length ? safe : dirs;
    const food = pool.filter(([dx, dy]) => dot(dx, dy));
    const pick = (food.length ? food : pool)[ri((food.length ? food : pool).length)] || [0, 0];
    return { x: pick[0], y: pick[1], a: false };
  }

  pacman(s, dt, g, c) {
    if (c.x || c.y) s.want = c.x ? [c.x, 0] : [0, c.y];
    s.prog += dt * 5;
    if (s.prog >= 1) {
      s.prog = 0;
      s.cx += s.dir[0];
      s.cy += s.dir[1];
      if (s.map[s.cy][s.cx] === '.') {
        s.map[s.cy][s.cx] = ' ';
        s.score += 10;
        this.sfx(600 + (s.score % 20) * 10, 400, 0.03, 'square', 0.05);
      }
      if (this.pacOpen(s, s.cx + s.want[0], s.cy + s.want[1])) s.dir = s.want;
      if (!this.pacOpen(s, s.cx + s.dir[0], s.cy + s.dir[1])) s.dir = [0, 0];
      if (!s.map.some((r) => r.includes('.'))) s.map = s.map.map((r) => r.map((v) => (v === ' ' ? '.' : v)));
    }
    for (const gh of s.ghosts) {
      gh.prog += dt * 3.6;
      if (gh.prog >= 1) {
        gh.prog = 0;
        gh.cx += gh.dir[0];
        gh.cy += gh.dir[1];
        const opts = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => this.pacOpen(s, gh.cx + dx, gh.cy + dy) && !(dx === -gh.dir[0] && dy === -gh.dir[1]));
        opts.sort((a, b) => Math.hypot(gh.cx + a[0] - s.cx, gh.cy + a[1] - s.cy) - Math.hypot(gh.cx + b[0] - s.cx, gh.cy + b[1] - s.cy));
        gh.dir = (Math.random() < 0.6 ? opts[0] : opts[ri(opts.length)]) || [-gh.dir[0], -gh.dir[1]];
      }
      if (gh.cx === s.cx && gh.cy === s.cy) {
        this.sfx(500, 60, 0.4, 'square', 0.08);
        Object.assign(s, { cx: 1, cy: 1, dir: [1, 0], prog: 0 });
      }
    }
    const T = 8;
    const ox = 0;
    const oy = 0;
    s.map.forEach((row, y) => row.forEach((v, x) => {
      if (v === '#') {
        g.fillStyle = PAL[1];
        g.fillRect(ox + x * T, oy + y * T, T, T);
      } else if (v === '.') {
        g.fillStyle = PAL[0];
        g.fillRect(ox + x * T + 3, oy + y * T + 3, 2, 2);
      }
    }));
    const px = (s.cx + s.dir[0] * s.prog) * T + 4;
    const py = (s.cy + s.dir[1] * s.prog) * T + 4;
    g.fillStyle = PAL[0];
    g.beginPath();
    const mouth = Math.abs(Math.sin(s.t * 12)) * 0.7;
    const a0 = Math.atan2(s.dir[1], s.dir[0] || 1);
    g.moveTo(px, py);
    g.arc(px, py, 3.5, a0 + mouth, a0 + Math.PI * 2 - mouth);
    g.fill();
    for (const gh of s.ghosts) {
      const gx = (gh.cx + gh.dir[0] * gh.prog) * T + 1;
      const gy = (gh.cy + gh.dir[1] * gh.prog) * T + 1;
      g.fillStyle = PAL[1];
      g.fillRect(gx, gy, 6, 6);
      g.fillStyle = PAL[3];
      g.fillRect(gx + 1, gy + 2, 1, 1);
      g.fillRect(gx + 4, gy + 2, 1, 1);
    }
    this.text(g, String(s.score), 2, H - 7, 3);
  }

  // ---------- Donkey Kong ----------

  kongFloorY(f, x) {
    const base = 64 - f * 16;
    return base + (f % 2 ? x : W - x) * 0.04;
  }

  kongThink(s) {
    const ladder = s.floor % 2 ? 8 : 70;
    const barrel = s.barrels.find((b) => b.floor === s.floor && Math.abs(b.x - s.x) < 9 && Math.sign(b.vx) !== Math.sign(b.x - s.x || 1) * -1);
    if (s.climbing) return { x: 0, y: -1, a: false };
    return { x: Math.abs(ladder - s.x) > 1 ? Math.sign(ladder - s.x) : 0, y: Math.abs(ladder - s.x) <= 1.5 ? -1 : 0, a: !!barrel && s.vy === 0 };
  }

  donkeykong(s, dt, g, c) {
    const ladder = s.floor % 2 ? 8 : 70;
    const ground = this.kongFloorY(s.floor, s.x);
    if (s.climbing) {
      s.y -= 18 * dt;
      if (s.y <= this.kongFloorY(s.floor + 1, s.x)) {
        s.floor++;
        s.climbing = false;
        s.score += 50;
        this.sfx(700, 900, 0.06);
        if (s.floor >= 3) {
          s.score += 300;
          this.sfx(500, 1200, 0.3);
          Object.assign(s, { floor: 0, x: 8, barrels: [] });
        }
      }
    } else {
      s.x = clamp(s.x + c.x * 24 * dt, 3, W - 3);
      if (c.a && s.vy === 0) {
        s.vy = -42;
        this.sfx(400, 800, 0.06, 'square', 0.05);
      }
      if (s.vy || s.y < ground) {
        s.vy += 150 * dt;
        s.y += s.vy * dt;
        if (s.y >= ground) {
          s.y = ground;
          s.vy = 0;
        }
      } else s.y = ground;
      if (c.y < 0 && Math.abs(s.x - ladder) < 3 && s.floor < 3 && s.vy === 0) s.climbing = true;
    }
    s.next -= dt;
    if (s.next <= 0) {
      s.next = rnd(1.6, 3);
      s.barrels.push({ floor: 3, x: 70, vx: -20 });
    }
    for (const b of s.barrels) {
      b.x += b.vx * dt;
      if (b.x < 2 || b.x > W - 2) {
        b.floor--;
        b.vx = -b.vx;
        b.x = clamp(b.x, 2, W - 2);
      }
      const by = this.kongFloorY(b.floor, b.x);
      if (b.floor === s.floor && !s.climbing && Math.abs(b.x - s.x) < 3 && s.y > by - 4) {
        this.sfx(300, 50, 0.3, 'sawtooth', 0.08);
        Object.assign(s, { floor: 0, x: 8, y: this.kongFloorY(0, 8), vy: 0, barrels: [] });
        break;
      }
      if (b.floor === s.floor && !b.jumped && Math.abs(b.x - s.x) < 3 && s.y < by - 4) {
        b.jumped = true;
        s.score += 100;
      }
    }
    s.barrels = s.barrels.filter((b) => b.floor >= 0);
    g.fillStyle = PAL[1];
    for (let f = 0; f < 4; f++) for (let x = 0; x < W; x += 4) g.fillRect(x, this.kongFloorY(f, x) + 1, 4, 2);
    g.fillStyle = PAL[2];
    for (let f = 0; f < 3; f++) {
      const lx = f % 2 ? 8 : 70;
      for (let y = this.kongFloorY(f + 1, lx); y < this.kongFloorY(f, lx); y += 3) g.fillRect(lx - 2, y, 5, 1);
    }
    g.fillStyle = PAL[0];
    g.fillRect(66, this.kongFloorY(3, 70) - 9, 9, 9);
    for (const b of s.barrels) g.fillRect(b.x - 2, this.kongFloorY(b.floor, b.x) - 3, 4, 4);
    g.fillRect(s.x - 1, s.y - 6, 3, 6);
    this.text(g, String(s.score), 2, 0);
  }

  // ---------- Sonic / Mario World (side runners) ----------

  runnerInit(s, kind) {
    Object.assign(s, { kind, dist: 0, y: 0, vy: 0, speed: 0, things: [], next: 1 });
  }

  runnerGround(s, x) {
    return s.kind === 'sonic' ? 58 + Math.sin((s.dist + x) * 0.05) * 5 : 60;
  }

  runnerThink(s) {
    const t = s.things.find((q) => q.x > 14 && q.x < 34);
    const jump = t && (t.type === 'foe' || t.type === 'pipe' || (t.type === 'coin' && t.y < 50));
    return { x: 1, y: 0, a: !!jump };
  }

  runner(s, dt, g, c) {
    const top = s.kind === 'sonic' ? 90 : 50;
    s.speed += ((c.x > 0 ? top : c.x < 0 ? 10 : top * 0.5) - s.speed) * Math.min(1, dt * 1.5);
    s.dist += s.speed * dt;
    const ground = this.runnerGround(s, 16);
    if (c.a && s.y >= ground - 0.5) {
      s.vy = -70;
      this.sfx(s.kind === 'sonic' ? 500 : 400, 900, 0.08, 'square', 0.05);
    }
    s.vy += 200 * dt;
    s.y = Math.min(ground, s.y + s.vy * dt);
    if (s.y >= ground) s.vy = 0;
    s.next -= dt * s.speed / 40;
    if (s.next <= 0) {
      s.next = rnd(0.8, 1.8);
      const r = Math.random();
      const type = r < 0.45 ? 'coin' : r < 0.8 ? 'foe' : s.kind === 'mario' ? 'pipe' : 'spring';
      s.things.push({ x: W + 4, y: type === 'coin' ? rnd(38, 54) : 0, type });
    }
    for (const t of s.things) t.x -= s.speed * dt;
    for (const t of s.things) {
      if (t.done || Math.abs(t.x - 16) > 4) continue;
      const ty = t.type === 'coin' ? t.y : this.runnerGround(s, t.x) - 3;
      if (t.type === 'coin' && Math.abs(ty - (s.y - 4)) < 6) {
        t.done = true;
        s.score += 10;
        this.sfx(s.kind === 'sonic' ? 1300 : 990, s.kind === 'sonic' ? 1700 : 1320, 0.08, 'square', 0.05);
      } else if (t.type === 'foe') {
        t.done = true;
        if (s.vy > 0 && s.y < ty) {
          s.score += 100;
          s.vy = -50;
          this.sfx(300, 150, 0.08);
        } else {
          s.score = Math.max(0, s.score - 50);
          s.speed = 0;
          this.sfx(400, 80, 0.3, 'sawtooth', 0.08);
        }
      } else if (t.type === 'pipe' && s.y > ty - 4) s.speed = Math.min(s.speed, 5);
      else if (t.type === 'spring') {
        t.done = true;
        s.vy = -110;
        this.sfx(300, 1400, 0.15);
      }
    }
    s.things = s.things.filter((t) => t.x > -8);
    g.fillStyle = PAL[1];
    for (let x = 0; x < W; x += 2) g.fillRect(x, this.runnerGround(s, x), 2, H);
    if (s.kind === 'mario') {
      g.fillStyle = PAL[2];
      for (let i = 0; i < 3; i++) g.fillRect(((i * 37 - s.dist * 0.3) % 100 + 100) % 100 - 10, 10 + i * 6, 12, 4);
    }
    for (const t of s.things) {
      if (t.done) continue;
      const gy = this.runnerGround(s, t.x);
      g.fillStyle = PAL[t.type === 'coin' ? 2 : 0];
      if (t.type === 'coin') {
        g.fillRect(t.x - 1, t.y - 2, 3, 4);
        g.fillStyle = PAL[0];
        g.fillRect(t.x, t.y - 1, 1, 2);
      } else if (t.type === 'pipe') {
        g.fillStyle = PAL[1];
        g.fillRect(t.x - 4, gy - 10, 8, 10);
        g.fillRect(t.x - 5, gy - 12, 10, 3);
      } else if (t.type === 'spring') g.fillRect(t.x - 2, gy - 3, 5, 3);
      else g.fillRect(t.x - 3, gy - 5, 6, 5);
    }
    g.fillStyle = PAL[0];
    if (s.kind === 'sonic' && s.y < this.runnerGround(s, 16) - 1) {
      g.beginPath();
      g.arc(16, s.y - 4, 3.5, 0, Math.PI * 2);
      g.fill();
    } else {
      g.fillRect(14, s.y - 8, 5, 8);
      g.fillStyle = PAL[s.kind === 'sonic' ? 2 : 1];
      g.fillRect(s.kind === 'sonic' ? 12 : 14, s.y - 9, s.kind === 'sonic' ? 3 : 6, 2);
    }
    this.text(g, String(s.score), 2, 1);
  }

  // ---------- Mario Kart (pseudo-3D road) ----------

  curve(z) {
    return Math.sin(z * 0.013) * 0.8 + Math.sin(z * 0.031) * 0.4;
  }

  mariokart(s, dt, g, c) {
    s.speed += ((c.a || c.y < 0 ? 60 : 15) - s.speed) * Math.min(1, dt);
    const off = Math.abs(s.x) > 1;
    if (off) s.speed *= 1 - dt * 1.5;
    s.pos += s.speed * dt;
    s.x += c.x * 1.6 * dt - this.curve(s.pos) * s.speed * 0.012 * dt;
    s.x = clamp(s.x, -1.6, 1.6);
    for (const k of s.karts) {
      k.z += 40 * dt;
      k.x += (this.curve(k.z) * 0.5 - k.x) * dt;
    }
    s.place = 1 + s.karts.filter((k) => k.z > s.pos).length;
    s.score = Math.floor(s.pos / 10);
    if (Math.random() < dt * 4) this.sfx(80 + s.speed, 80 + s.speed, 0.05, 'sawtooth', 0.02);
    const hz = 26;
    g.fillStyle = PAL[2];
    g.fillRect(0, 0, W, hz);
    for (let y = hz; y < H; y++) {
      const p = (y - hz) / (H - hz);
      const z = s.pos + 2 / (p + 0.02);
      const cx = W / 2 + (this.curve(z) * 0.6 - s.x) * 40 * p + this.curve(z) * 18 * (1 - p);
      const half = 4 + 34 * p;
      const stripe = Math.floor(z / 3) % 2;
      g.fillStyle = PAL[stripe ? 1 : 2];
      g.fillRect(0, y, W, 1);
      g.fillStyle = PAL[stripe ? 0 : 1];
      g.fillRect(cx - half - 2, y, half * 2 + 4, 1);
      g.fillStyle = PAL[3];
      g.fillRect(cx - half, y, half * 2, 1);
    }
    for (const k of s.karts) {
      const dz = k.z - s.pos;
      if (dz < 2 || dz > 60) continue;
      const p = clamp(2 / dz - 0.02, 0, 1);
      const y = hz + p * (H - hz);
      const x = W / 2 + (k.x - s.x) * 40 * p;
      const sz = 2 + 8 * p;
      g.fillStyle = PAL[1];
      g.fillRect(x - sz / 2, y - sz / 2, sz, sz / 2);
    }
    g.fillStyle = PAL[0];
    g.fillRect(36, 60, 8, 5);
    g.fillRect(34, 63, 2, 3);
    g.fillRect(44, 63, 2, 3);
    this.text(g, `${s.place}º`, 2, 1);
  }
}
