// The living Doll (Crystal Mágico): wanders the floor, investigates objects and furniture, and
// plays with the Persocon (player 2 on the consoles, reading, ball, Jam) plus duo minigames.
import { icon, emojiOnly } from './pixel.js';
import { MANGAS, mangaCoverIcon, BALLS, baseId } from './furniture.js';
import { isFocus } from './focusmode.js';

const clamp = (v, a, b) => Math.min(Math.max(v, a), b);
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const chance = (p) => Math.random() < p;

// Duo minigames (Brincar → Persocon & Doll). alive: needs the Crystal Mágico.
export const DUOS = [
  { id: 'abraco', icon: '🤗', name: 'Abraço', desc: 'A Persocon vai até o Doll e dá um abraço' },
  { id: 'pega', icon: '🏃', name: 'Pega-pega', desc: 'Os dois correm um atrás do outro (30s)', alive: true },
  { id: 'corrida', icon: '🏁', name: 'Corrida', desc: 'Aposte em quem chega primeiro', alive: true },
  { id: 'esconde', icon: '🙈', name: 'Esconde-esconde', desc: 'O Doll se esconde e a Persocon procura', alive: true },
  { id: 'chute', icon: '⚽', name: 'Bate-bola', desc: 'Chutam a bola um para o outro (precisa de uma bola)', alive: true },
];

// What the Doll "thinks" about each object it investigates.
const CURIOUS = {
  cama: ['💤', '❓'], almofada: ['☁', '😊'], estante: ['📚', '❗'], videogame: ['📺', '🎮'], gameboy: ['🎮', '❗'], gamegear: ['🎮', '❓'],
  psp: ['🎮', '✨'], alvo: ['🎯', '❗'], espada: ['⚔', '❗'], globo: ['✨', '😮'], laser: ['✨', '❗'], fumaca: ['☁', '❓'], caixa: ['🎵', '♪'],
};
const GENRE_FX = { aventura: '⚔', romance: '♥', terror: '😱', comedia: '😆' };

export class DollBrain {
  constructor(doll) {
    this.doll = doll;
    this.task = null;
    this.wait = 1;
    this.ph = 0;
    this.bubbleEl = null;
    this.bubbleT = 0;
    this.heldEl = null;
    this.heldSrc = null;
    this.duo = null;
    this.pokes = [];
  }

  get app() {
    return this.doll.app;
  }

  get P() {
    return this.doll.P;
  }

  // ---------- look: bubble and held item ----------

  say(text, life = 2.2) {
    if (!this.bubbleEl) {
      this.bubbleEl = document.createElement('div');
      this.bubbleEl.className = 'doll-bubble';
      document.body.append(this.bubbleEl);
    }
    this.bubbleEl.textContent = text;
    this.bubbleEl.classList.toggle('emoji-only', emojiOnly(text));
    this.bubbleEl.style.display = 'block';
    this.bubbleT = life;
  }

  hold(src) {
    this.heldSrc = src || null;
    if (!src) {
      if (this.heldEl) this.heldEl.style.display = 'none';
      return;
    }
    if (!this.heldEl) {
      this.heldEl = document.createElement('img');
      this.heldEl.className = 'doll-held';
      this.heldEl.draggable = false;
      document.body.append(this.heldEl);
    }
    if (this.heldEl.getAttribute('src') !== src) this.heldEl.src = src;
  }

  place(hidden) {
    const d = this.doll;
    const H = d.h;
    if (this.bubbleEl) {
      const show = this.bubbleT > 0 && !hidden;
      this.bubbleEl.style.display = show ? 'block' : 'none';
      if (show) this.bubbleEl.style.transform = `translate(${Math.round(d.x - 14)}px, ${Math.round(d.y - H - 30 - d.lift)}px)`;
    }
    if (this.heldEl) {
      const show = !!this.heldSrc && !hidden && !d.hiding;
      this.heldEl.style.display = show ? 'block' : 'none';
      if (show) {
        const w = Math.round(H * (this.heldWide ? 0.62 : 0.4));
        this.heldEl.style.width = `${w}px`;
        this.heldEl.style.transform = `translate(${Math.round(d.x - w / 2)}px, ${Math.round(d.y - H * 0.62 - d.lift)}px)`;
      }
    }
  }

  reset() {
    this.bubbleEl?.remove();
    this.heldEl?.remove();
    this.bubbleEl = this.heldEl = null;
    this.heldSrc = null;
    this.task = null;
    this.toyFx = null;
    this.baseLift = this.bounceH = this.flipA = 0;
    this.doll.back = false;
    this.waking = null;
    if (this.doll.el) this.doll.el.style.filter = '';
    if (this.duo) this.endDuo(true);
  }

  // ---------- poses (limb targets for the spring rig in doll.js) ----------

  // Standing on a toy (keyboard, trampoline) raises every pose while that toy task runs.
  pose(kind) {
    const r = this.poseOf(kind);
    if (this.task?.toy && this.baseLift) this.doll.lift += this.baseLift;
    return r;
  }

  poseOf(kind) {
    const d = this.doll;
    const s = Math.sin(this.ph * 9);
    d.lift = 0;
    d.restAngle = 0;
    if (kind !== 'play' && kind !== 'spin') d.back = false;
    // Shoulders la/ra, hips ll/rl, elbows le/re, knees lk/rk (left = screen right). For the left
    // side positive turns the limb toward the body, for the right side negative does.
    const c = Math.cos(this.ph * 9);
    switch (kind) {
      case 'walk':
      case 'run': {
        const run = kind === 'run';
        const a = run ? 0.9 : 0.55;
        const f = this.ph * (run ? 16 : 10);
        const w = Math.sin(f);
        d.lift = Math.abs(w) * d.h * (run ? 0.07 : 0.04);
        // The knee folds while the leg swings forward, the shin trails the thigh.
        const kl = Math.max(0, Math.cos(f)) * (run ? 0.9 : 0.5);
        const kr = Math.max(0, -Math.cos(f)) * (run ? 0.9 : 0.5);
        return {
          ll: w * a, rl: -w * a, lk: -w * a * 0.5 - kl, rk: w * a * 0.5 + kr,
          la: -w * a * 0.8, ra: w * a * 0.8, le: run ? 1.2 - w * 0.25 : 0.35, re: run ? -1.2 - w * 0.25 : -0.35,
          head: run ? 0.06 : 0,
        };
      }
      case 'dance':
        d.lift = Math.abs(Math.sin(this.ph * 5)) * d.h * 0.12;
        return {
          la: -2.2 + s * 0.4, ra: 2.2 - s * 0.4, le: -0.5 + s * 0.6, re: 0.5 + s * 0.6,
          ll: s * 0.3, rl: s * 0.3, lk: -s * 0.35 + 0.15, rk: -s * 0.35 - 0.15, head: s * 0.25,
        };
      case 'read':
        return { la: 0.75, ra: -0.75, le: 1.15, re: -1.15, head: 0.12 + Math.sin(this.ph * 0.7) * 0.05 };
      case 'play':
        return { la: 0.45, ra: -0.45, le: 1.25 + s * 0.08, re: -1.25 - Math.sin(this.ph * 11) * 0.08, head: Math.sin(this.ph * 2) * 0.08 };
      case 'inspect':
        return { la: 0.2, ra: 2.2, le: 0.6, re: 0.5 + Math.sin(this.ph * 2.2) * 0.15, head: Math.sin(this.ph * 2.2) * 0.22 };
      case 'wave':
        // Upper arm still, the forearm wags.
        return { la: 0.1, ra: 2.1, le: 0.25, re: 0.35 + Math.sin(this.ph * 14) * 0.55, head: 0.1 };
      case 'hug':
        return { la: 1.05, ra: -1.05, le: 1.1, re: -1.1, lk: 0.1, rk: -0.1, head: 0.15 };
      case 'cheer': {
        const up = Math.abs(Math.sin(this.ph * 7));
        d.lift = up * d.h * 0.18;
        return { la: -2.4, ra: 2.4, le: -0.3 + s * 0.25, re: 0.3 - s * 0.25, ll: 0.2, rl: -0.2, lk: -0.5 * up, rk: 0.5 * up, head: 0 };
      }
      case 'sad':
        return { la: 0.15, ra: -0.15, le: 0.45, re: -0.45, lk: 0.15, rk: -0.15, head: 0.45 };
      case 'sleep':
        d.restAngle = (d.sleepSide || 1) * Math.PI / 2;
        // Curled up a little.
        return { la: 0.4, ra: -0.4, le: 0.9, re: -0.9, ll: 0.25, rl: -0.25, lk: -0.6, rk: 0.6, head: 0.15 };
      case 'wake': {
        const t = this.waking || 0;
        const ease = (v) => v * v * (3 - 2 * v);
        if (t < 1.4) {
          const tr = Math.sin(this.ph * 40) * 0.06 * (t / 1.4);
          return { la: 0.1 + tr, ra: -0.1 - tr, le: 0.3, re: -0.3, head: 0.35 - t * 0.2 };
        }
        if (t < 2.4) {
          d.lift = d.h * 0.9 * ease((t - 1.4) / 1);
          return { la: -1.4, ra: 1.4, le: -0.4, re: 0.4, ll: 0.25, rl: -0.25, lk: -0.5, rk: 0.5, head: 0 };
        }
        if (t < 2.75) {
          d.lift = d.h * 0.9 * (1 - ease((t - 2.4) / 0.35));
          return { la: -2.2, ra: 2.2, ll: 0.3, rl: -0.3, lk: -0.7, rk: 0.7, head: 0 };
        }
        // Stretches after landing.
        return { la: -2.5 + Math.sin(this.ph * 3) * 0.15, ra: 2.5 - Math.sin(this.ph * 3) * 0.15, le: 0.25, re: -0.25, head: -0.1 };
      }
      case 'cartwheel':
        d.restAngle = this.spinA || 1e-4;
        d.angle = d.restAngle;
        return { la: -2.5, ra: 2.5, ll: 0.5, rl: -0.5, head: 0 };
      case 'handstand':
        d.restAngle = Math.PI;
        return { la: -2.6, ra: 2.6, ll: 0.3 + s * 0.25, rl: -0.3 - s * 0.25, lk: -0.4 - c * 0.3, rk: 0.4 - c * 0.3, head: 0 };
      case 'squat': {
        // Jumping jacks: knees give on the landing.
        const u = (Math.sin(this.ph * 6) + 1) / 2;
        d.lift = d.h * 0.06 * Math.abs(Math.sin(this.ph * 6));
        return { la: -2.6 * u, ra: 2.6 * u, le: -0.3 * u, re: 0.3 * u, ll: -0.45 * u, rl: 0.45 * u, lk: 0.35 * (1 - u), rk: -0.35 * (1 - u), head: 0 };
      }
      case 'punch': {
        // One fist shoots out straight, the other comes back to the chest.
        const p = Math.sin(this.ph * 12);
        return {
          la: p > 0 ? -1.5 : 0.35, ra: p < 0 ? 1.5 : -0.35, le: p > 0 ? 0 : 1.7, re: p < 0 ? 0 : -1.7,
          ll: 0.15, rl: -0.15, lk: -0.2, rk: 0.2, head: p * 0.08,
        };
      }
      case 'kick':
        return { ll: -1.2, lk: 0.35, rl: 0.1, rk: 0.25, la: 0.5, ra: -0.6, le: 0.4, re: -0.4, head: 0 };
      case 'sit': {
        // Cross-legged on the floor: thighs out to the sides, shins folded in, hips down.
        d.lift = -d.h * 0.28;
        const b = Math.sin(this.ph * 1.2);
        return { ll: -1.4, rl: 1.4, lk: 2.4, rk: -2.4, la: 0.35, ra: -0.35, le: 0.9, re: -0.9, head: b * 0.1 };
      }
      case 'think': {
        const b = Math.sin(this.ph * 1.6);
        return { la: 0.5, le: 1.5, ra: -0.3, re: -2.45, head: 0.18 + b * 0.08, ll: 0.05, rl: -0.05 };
      }
      case 'look':
        // Hand over the eyes, looking from side to side.
        return { ra: 1.5, re: 2.1, la: 0.1, le: 0.2, head: Math.sin(this.ph * 1.4) * 0.3 };
      case 'salute':
        return { ra: 1.3, re: 2.3, la: 0.05, le: 0.05, ll: 0, rl: 0, head: -0.05 };
      case 'clap': {
        const k = Math.max(0, Math.sin(this.ph * 14));
        return { la: 0.55, ra: -0.55, le: 0.8 + k * 0.6, re: -0.8 - k * 0.6, head: Math.sin(this.ph * 7) * 0.08 };
      }
      case 'airguitar': {
        const strum = Math.sin(this.ph * 20);
        d.lift = Math.abs(Math.sin(this.ph * 4)) * d.h * 0.03;
        return { la: -1.0, le: -0.3, ra: -0.4, re: -1.4 + strum * 0.35, ll: -0.2, rl: 0.2, lk: 0.2, rk: -0.2, head: Math.sin(this.ph * 8) * 0.18 };
      }
      case 'robot': {
        // Stiff, stepped moves.
        const st = Math.floor(this.ph * 3) % 4;
        return [
          { la: -1.57, le: 1.57, ra: 0.2, re: 0, head: 0.2 },
          { la: -0.2, le: 0, ra: 1.57, re: -1.57, head: -0.2 },
          { la: -1.57, le: 0, ra: 1.57, re: 0, head: 0 },
          { la: 0.6, le: 1.4, ra: -0.6, re: -1.4, head: 0, lk: 0.3, rk: -0.3 },
        ][st];
      }
      case 'stretch':
        d.restAngle = Math.sin(this.ph * 1.5) * 0.18 || 1e-4;
        return { la: -2.6, ra: 2.6, le: -0.25, re: 0.25, ll: 0.08, rl: -0.08, head: -Math.sin(this.ph * 1.5) * 0.15 };
      case 'yoga': {
        // Tree pose: one foot on the other knee, hands together over the head, a little wobble.
        const w = Math.sin(this.ph * 2.3) * 0.06;
        return { la: -2.6 + w, ra: 2.6 + w, le: -0.8, re: 0.8, ll: -1.1, lk: 2.3, rl: 0.02, rk: 0, head: w };
      }
      case 'spin':
        // Pirouette: front and back faces alternate.
        d.back = Math.floor(this.ph * 7) % 2 === 1;
        d.lift = d.h * 0.04;
        return { la: -1.5, ra: 1.5, le: -0.1, re: 0.1, ll: -0.15, rl: 0.15, head: 0 };
      case 'bow':
        return { la: 0.25, ra: -0.25, le: 0.7, re: -0.7, head: 0.55, lk: 0.1, rk: -0.1 };
      case 'sneak': {
        // Tiptoes with the hands up in front.
        const f = this.ph * 7;
        d.lift = d.h * (0.03 + Math.abs(Math.sin(f)) * 0.03);
        return { la: -0.7, ra: 0.7, le: 1.6, re: -1.6, ll: Math.sin(f) * 0.3, rl: -Math.sin(f) * 0.3, lk: -0.3, rk: 0.3, head: 0.12 };
      }
      case 'faint': {
        const t = this.faintT || 0;
        if (t < 0.6) return { la: 0.2, ra: -0.2, le: 0.3, re: -0.3, head: Math.sin(this.ph * 9) * 0.35 };
        const e = Math.min(1, (t - 0.6) / 0.35);
        d.restAngle = (d.sleepSide || 1) * (Math.PI / 2) * e * e || 1e-4;
        return { la: -1.4, ra: 1.4, le: -0.4, re: 0.4, ll: 0.2, rl: -0.2, head: 0.3 };
      }
      case 'shiver': {
        const tr = Math.sin(this.ph * 45) * 0.06;
        return { la: 0.8 + tr, ra: -0.8 - tr, le: 1.6, re: -1.6, lk: 0.15, rk: -0.15, head: 0.2 + tr };
      }
      case 'yoyo': {
        // Arm out to the side flicking the yo-yo, the other hand on the hip.
        const f = Math.sin(this.ph * 5);
        return { ra: 1.0 + f * 0.12, re: f * 0.15, la: 0.5, le: 1.6, ll: 0.08, rl: -0.08, head: -0.1 + f * 0.05 };
      }
      case 'hula': {
        const w = Math.sin(this.ph * 11);
        d.restAngle = w * 0.06 || 1e-4;
        return { la: -2.4 + w * 0.15, ra: 2.4 + w * 0.15, le: -0.4, re: 0.4, ll: 0.12 + w * 0.12, rl: -0.12 + w * 0.12, lk: -0.1, rk: 0.1, head: -w * 0.1 };
      }
      case 'bounce': {
        // On the trampoline: tucks in the air, arms up; somersaults sometimes.
        const up = this.bounceH || 0;
        d.lift = up;
        if (this.flipA) {
          d.restAngle = this.flipA;
          d.angle = d.restAngle;
        }
        const k = Math.min(1, up / (d.h * 1.5));
        return { la: -1.6 - k, ra: 1.6 + k, le: -0.3, re: 0.3, ll: 0.15 + k * 0.4, rl: -0.15 - k * 0.4, lk: -0.8 * k, rk: 0.8 * k, head: -0.1 };
      }
      case 'cube': {
        // Sitting, the cube in front, the wrists twisting it.
        d.lift = -d.h * 0.28;
        const tw = (this.twist || 0) * 0.35;
        return { ll: -1.4, rl: 1.4, lk: 2.4, rk: -2.4, la: 0.55, ra: -0.55, le: 1.3 + tw, re: -1.3 + tw, head: 0.18 };
      }
      case 'kite': {
        // Holding the reel at the chest, leaning against the pull of the line.
        d.restAngle = Math.sin(this.ph * 1.7) * 0.07 || 1e-4;
        return { la: 0.75, ra: -0.75, le: 1.2 + Math.sin(this.ph * 9) * 0.1, re: -1.2, ll: 0.2, rl: -0.2, lk: -0.2, rk: 0.2, head: -0.2 };
      }
      case 'wind':
        return { la: 0.55, ra: -0.55, le: 1.3 + Math.sin(this.ph * 14) * 0.45, re: -1.3, head: 0.25 };
      case 'peace':
        // Photo pose: one arm up making a "V", head tilted, weight on one leg.
        return { ra: 2.6, re: 0.4, la: 0.5, le: 1.5, ll: 0.15, rl: 0.05, lk: 0, rk: 0.2, head: 0.2 };
      default: {
        // Idle: breathing sway, arms hanging soft.
        const b = Math.sin(this.ph * 0.8);
        return { la: 0.05 + b * 0.03, ra: -0.05 - b * 0.03, le: 0.15, re: -0.15, head: b * 0.12 };
      }
    }
  }

  // ---------- tasks ----------

  // Doing something of its own (reading, a toy, a duo, playing with the Crow): the others don't pull it away.
  get busy() {
    const p = this.task?.pose;
    return !!this.duo || this.waking != null || !!this.using || performance.now() < (this.crowUntil || 0) || (!!p && !['idle', 'walk'].includes(p));
  }

  // A task: { pose, tick(dt) → true when done, end() }.
  run(task) {
    this.task?.end?.();
    this.task = task;
  }

  walkTo(x, then, speed = 0.9) {
    const W = this.app.world.width;
    const tx = clamp(x, this.P * 0.15, W - this.P * 0.15);
    this.run({
      pose: speed > 1.4 ? 'run' : 'walk',
      tick: (dt) => {
        const d = this.doll;
        const dx = tx - d.x;
        const step = this.P * speed * dt;
        if (Math.abs(dx) <= step) {
          d.x = tx;
          this.task = null;
          then?.();
          return false;
        }
        d.x += Math.sign(dx) * step;
        return false;
      },
    });
  }

  doFor(pose, dur, tick, end) {
    let t = 0;
    this.run({
      pose,
      tick: (dt) => {
        t += dt;
        const r = tick?.(dt, t);
        return r === true || t >= dur;
      },
      end,
    });
  }

  // Next to the pet, on the side the Doll is already on.
  besidePet() {
    const pet = this.app.pet;
    const side = this.doll.x < pet.x ? -1 : 1;
    let x = pet.x + side * this.P * 0.42;
    if (x < this.P * 0.2 || x > this.app.world.width - this.P * 0.2) x = pet.x - side * this.P * 0.42;
    return x;
  }

  // Stay beside the Persocon in a calm sitting pose during a focus session.
  focusPose(on) {
    if (!on) {
      if (this.task?.focus) this.task = null;
      return;
    }
    if (!this.app.doll?.alive || this.task?.focus) return;
    const sit = () => {
      this.doFor('sit', Infinity, () => false);
      this.task.focus = true;
    };
    if (Math.abs(this.doll.x - this.besidePet()) > this.P * 0.3) {
      this.walkTo(this.besidePet(), sit);
      this.task.focus = true;
    } else sit();
  }

  // ---------- brain ----------

  update(dt, grounded, hidden) {
    const d = this.doll;
    this.ph += dt;
    this.bubbleT -= dt;
    if (!this.app.game.profile.dollMet) {
      this.app.game.profile.dollMet = true;
      this.app.game.changed();
      this.wake(true);
    }
    if (this.waking != null) {
      this.wakeTick(dt);
      d.pose = this.pose('wake');
      this.place(hidden);
      return;
    }
    if (this.duo) {
      this.duoTick(dt, grounded);
    } else if (grounded) {
      if (this.task) {
        if (this.task.tick(dt)) {
          const t = this.task;
          this.task = null;
          t.end?.();
        }
      } else if ((this.wait -= dt) <= 0) this.think();
    }
    d.pose = grounded || this.duo ? this.pose(this.duoPose || this.task?.pose || 'idle') : null;
    this.place(hidden);
  }

  // Coming to life: glows and gathers sparkles, floats up with the arms open, bursts in light,
  // lands and stretches. first: the very first time (the pet is amazed).
  wake(first = false) {
    if (this.duo) this.endDuo(true);
    this.task = null;
    this.hold(null);
    this.waking = 0;
    this.wakeFirst = first;
    this.burst = false;
    this.sparkT = 0;
    this.app.sound.tone8(300, 900, 1.2, 'triangle', 0.04);
  }

  spark(x, y, tx, ty, color, life = 1000) {
    const el = document.createElement('div');
    el.className = 'fx-spark';
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.background = color;
    el.style.setProperty('--tx', `${tx}px`);
    el.style.setProperty('--ty', `${ty}px`);
    document.body.append(el);
    setTimeout(() => el.remove(), life);
  }

  wakeTick(dt) {
    const d = this.doll;
    const P = this.P;
    const t = (this.waking += dt);
    const cy = d.y - d.h * 0.5 - d.lift;
    const colors = ['#c9a6ff', '#8be9ff', '#fff3a8', '#ff9ad5'];
    // Sparkles drawn in toward the Doll while it charges and floats.
    if (t < 2.4 && (this.sparkT -= dt) <= 0) {
      this.sparkT = 0.07;
      const a = Math.random() * Math.PI * 2;
      const r = P * (0.35 + Math.random() * 0.25);
      this.spark(d.x + Math.cos(a) * r, cy + Math.sin(a) * r, -Math.cos(a) * r * 0.8, -Math.sin(a) * r * 0.8, pick(colors), 900);
    }
    const glow = t < 2.4 ? Math.min(1, t / 2.4) : Math.max(0, 1 - (t - 2.4) / 1.2);
    if (d.el) d.el.style.filter = glow > 0.01 ? `drop-shadow(0 0 ${Math.round(3 + glow * 12)}px #b98cff) brightness(${1 + glow * 0.6})` : '';
    if (t >= 2.4 && !this.burst) {
      this.burst = true;
      for (let i = 0; i < 22; i++) {
        const a = (i / 22) * Math.PI * 2;
        const r = P * (0.45 + Math.random() * 0.3);
        this.spark(d.x, cy, Math.cos(a) * r, Math.sin(a) * r, colors[i % colors.length], 1300);
      }
      const ring = document.createElement('div');
      ring.className = 'fx-ring';
      const s = P * 1.1;
      ring.style.width = ring.style.height = `${s}px`;
      ring.style.left = `${d.x - s / 2}px`;
      ring.style.top = `${cy - s / 2}px`;
      ring.style.borderColor = '#c9a6ff';
      document.body.append(ring);
      setTimeout(() => ring.remove(), 900);
      this.app.sound.powerup?.(1);
      this.say('✨', 2.5);
    }
    if (t >= 3.9) {
      this.waking = null;
      if (d.el) d.el.style.filter = '';
      this.wait = 1;
      this.app.pet.emit(this.wakeFirst ? 'dollAlive' : 'dollWake');
      this.say(pick(['😊', '♥', '👋']), 2);
      this.doFor('wave', 1.6);
    }
  }

  think() {
    const { pet, game, toys } = this.app;
    const tp = pet.toyPlay;
    const near = pet.mode === 'ground' && pet.surfaceId === 'floor' && !pet.dead;
    this.wait = rand(0.6, 2);
    this.hold(null);
    this.heldWide = false;
    this.toyFx = null;
    this.baseLift = this.bounceH = this.flipA = 0;
    if (near && pet.activity === 'jam') return this.joinJam();
    if (near && pet.activity === 'watch') return this.joinTv();
    if (near && tp?.picked && (tp.dollJoins || 0) < 2 && Math.abs(pet.x - this.doll.x) < this.P * 7 && chance(0.55) && this.joinToy(tp)) return;
    // Player 2 only on the TV console (furniture): handhelds are single-player.
    if (near && tp?.console === 'tv' && tp.inserted && !tp.versus && !tp.dollP2 && chance(0.6)) return this.joinConsole(tp);
    if (near && tp?.manga && chance(0.6)) return this.joinRead(tp);
    if (near && pet.action === 'ball' && this.app.ball?.active && chance(0.7)) return this.playBall(rand(10, 18));
    if (near && /sleep/.test(pet.action) && chance(0.6)) return this.sleepNear();
    const ac = this.app.antics?.cur;
    if (ac && Math.abs(pet.x - this.doll.x) < this.P * 5 && chance(0.7)) return this.mimic(ac.kind);
    if (near && this.reactToPet(tp)) return;
    if (chance(0.01) && this.vendSteal()) return;
    if (chance(0.16) && this.toyAlone()) return;
    const r = Math.random();
    if (r < 0.26) return this.inspect();
    if (r < 0.36 && game.mangas?.length && game.toys.estante?.placed && toys.here(game.toys.estante)) return this.readAlone();
    if (r < 0.43 && near && Math.abs(pet.x - this.doll.x) < this.P * 4) return this.greet();
    if (r < 0.48 && this.app.ball?.active) return this.playBall(rand(5, 9));
    if (r < 0.51) {
      this.say(pick(['✨', '♪', '😊']));
      this.doll.throwUp(0, -this.P * 3.2);
      return;
    }
    if (r < 0.57) return this.trick();
    if (r < 0.8) return this.perform();
    if (r < 0.84) return this.doFor('idle', rand(2, 4));
    this.walkTo(this.doll.x + rand(-1, 1) * this.P * 3, () => this.doFor('idle', rand(0.8, 2.5)), rand(0.6, 1.1));
  }

  // Watches what the Persocon is doing: cheers at the machines, keeps her company while she eats,
  // comforts her when she is sad. True when it started something.
  reactToPet(tp) {
    const pet = this.app.pet;
    const close = Math.abs(pet.x - this.doll.x) < this.P * 6;
    if (!close) return false;
    if (tp && /^(gacha|slot|venda_)/.test(String(tp.id)) && chance(0.6)) {
      return this.walkTo(this.besidePet(), () => {
        this.say(pick(['🍀', '❗', '😆', '✨']));
        this.doFor(pick(['clap', 'cheer']), rand(2, 3.5), (dt, t) => this.clapSound(t));
      }, 1.2), true;
    }
    if (pet.action === 'eat' && chance(0.35)) {
      return this.walkTo(this.besidePet(), () => {
        this.say(pick(['😋', '♥', '🍙']));
        this.doFor('sit', rand(4, 7));
      }, 1), true;
    }
    if (pet.stats?.mood < 30 && chance(0.25)) {
      return this.walkTo(this.besidePet(), () => {
        this.say('♥');
        pet.emit('dollHug');
        this.doFor('hug', 2.4);
      }, 1.2), true;
    }
    if (pet.action === 'sit' && chance(0.3)) {
      return this.walkTo(this.besidePet(), () => this.doFor('sit', rand(5, 9), (dt, t) => {
        if (Math.floor(t / 4) !== Math.floor((t - dt) / 4) && chance(0.5)) this.say(pick(['♪', '😌', '☁']), 1.4);
      }), 1), true;
    }
    return false;
  }

  clapSound(t) {
    if (Math.floor(t * 4.45) !== Math.floor((t - 1 / 60) * 4.45)) this.tone(1900, 1300, 0.03, 'square', 0.015);
  }

  tone(...a) {
    if (!isFocus(this.app.config, this.app)) this.app.sound.tone8(...a);
  }

  // Little shows on its own (procedural poses above), each with its bubble and sounds.
  perform(kind = pick(['sit', 'think', 'look', 'clap', 'airguitar', 'robot', 'stretch', 'yoga', 'spin', 'bow', 'sneak', 'faint', 'shiver', 'salute'])) {
    const d = this.doll;
    const pet = this.app.pet;
    const P = this.P;
    const notes = [523, 587, 659, 784, 880, 1047];
    switch (kind) {
      case 'sit':
        this.say(pick(['😌', '☁', '♪']));
        return this.doFor('sit', rand(5, 10), (dt, t) => {
          if (Math.floor(t / 3.5) !== Math.floor((t - dt) / 3.5) && chance(0.4)) this.say(pick(['♪', '💤', '😊']), 1.4);
        });
      case 'think':
        this.say('💭');
        return this.doFor('think', rand(3, 5), null, () => this.say(pick(['💡', '❓', '❗']), 1.6));
      case 'look':
        this.say('👀');
        return this.doFor('look', rand(2.5, 4));
      case 'clap':
        this.say(pick(['👏', '✨']));
        return this.doFor('clap', 2.4, (dt, t) => this.clapSound(t));
      case 'airguitar': {
        this.say('🎸');
        let n = 0;
        return this.doFor('airguitar', rand(3, 5), (dt, t) => {
          if (t > n * 0.22) {
            n++;
            const f = pick(notes) / 2;
            this.tone(f, f, 0.12, 'sawtooth', 0.012);
          }
        });
      }
      case 'robot': {
        this.say('🤖');
        let last = -1;
        return this.doFor('robot', 4, () => {
          const st = Math.floor(this.ph * 3) % 4;
          if (st !== last) {
            last = st;
            this.tone(300 + st * 120, 300 + st * 120, 0.06, 'square', 0.015);
          }
        });
      }
      case 'stretch':
        this.say(pick(['😊', '✨']));
        return this.doFor('stretch', 3, null, () => { d.restAngle = d.angle = 0; });
      case 'yoga':
        this.say('☯');
        return this.doFor('yoga', rand(4, 6), null, () => this.say('😌', 1.2));
      case 'spin':
        this.say('✨');
        this.tone(500, 1200, 0.5, 'triangle', 0.02);
        return this.doFor('spin', 2, null, () => { d.back = false; });
      case 'bow':
        this.say(pick(['😊', '♥']));
        return this.doFor('bow', 1.8);
      case 'salute':
        if (Math.abs(pet.x - d.x) > P * 6) return this.doFor('salute', 1.8);
        return this.walkTo(this.besidePet(), () => {
          this.say('😎');
          this.doFor('salute', 2);
        }, 1.1);
      case 'shiver':
        this.say(pick(['🥶', '😨']));
        return this.doFor('shiver', 2.5, null, () => this.say('😅', 1.2));
      case 'faint':
        d.sleepSide = chance(0.5) ? 1 : -1;
        this.faintT = 0;
        this.say('😵');
        return this.doFor('faint', 2.8, (dt) => {
          this.faintT += dt;
          if (this.faintT > 0.95 && this.faintT - dt <= 0.95) this.tone(160, 80, 0.08, 'triangle', 0.04);
        }, () => {
          d.angle = d.restAngle = 0;
          d.throwUp(0, -P * 1.6);
          this.say('😝', 1.2);
        });
      case 'sneak': {
        // Tiptoes up to the Persocon and gives her a fright.
        if (pet.mode !== 'ground' || pet.surfaceId !== 'floor' || Math.abs(pet.x - d.x) > P * 7) return this.doFor('look', 2.5);
        const side = d.x < pet.x ? -1 : 1;
        const tx = pet.x + side * P * 0.32;
        this.say('🤫');
        return this.doFor('sneak', 12, (dt) => {
          const dx = tx - d.x;
          if (Math.abs(dx) > P * 0.05) {
            d.x += Math.sign(dx) * Math.min(Math.abs(dx), P * 0.35 * dt);
            return false;
          }
          this.say('👻', 1.4);
          this.float(pet.x, pet.y - P * 1.2, '❗');
          this.tone(200, 900, 0.12, 'square', 0.04);
          pet.emit('dollBoo');
          return true;
        }, () => this.doFor('cheer', 1.5));
      }
    }
    return this.doFor('idle', 2);
  }

  // Copies what the Persocon is doing (antics.js).
  mimic(kind) {
    const d = this.doll;
    if (kind === 'hops') {
      let n = 0;
      return this.doFor('cheer', 2.5, (dt, t) => {
        if (t > n * 0.6) {
          n++;
          d.throwUp(0, -this.P * 2.6);
        }
      });
    }
    if (['twirl', 'hum'].includes(kind)) {
      this.say('♪');
      return this.doFor('dance', 3);
    }
    if (kind === 'squats') return this.doFor('squat', 5.5);
    if (kind === 'stretch' || kind === 'yawn') return this.doFor('stretch', 3);
    if (kind === 'pant') return this.doFor('sit', 4);
    if (kind === 'shadowbox') {
      this.say('❗');
      return this.doFor('punch', 3.5);
    }
    if (kind === 'wave') {
      this.say('👋');
      return this.doFor('wave', 2.4);
    }
    if (kind === 'butterfly') {
      this.say('😮');
      return this.doFor('inspect', 3);
    }
    if (kind === 'trip' || kind === 'sneeze') {
      this.say(kind === 'trip' ? '😟' : '😷');
      return this.doFor('idle', 2);
    }
    this.say('❓');
    this.doFor('inspect', 2.5);
  }

  // Acrobatics: cartwheel, flip or handstand.
  trick() {
    const d = this.doll;
    const W = this.app.world.width;
    const kind = pick(['cartwheel', 'flip', 'handstand']);
    if (kind === 'flip') {
      this.say('✨', 1.2);
      d.throwUp(0, -this.P * 4.6);
      d.spin = (chance(0.5) ? 1 : -1) * 13;
      return;
    }
    if (kind === 'handstand') {
      this.say('😝', 2);
      return this.doFor('handstand', 3.2, null, () => {
        d.angle = d.restAngle = 0;
        d.throwUp(0, -this.P * 1.5);
      });
    }
    const dir = d.x < W / 2 ? 1 : -1;
    this.spinA = 0;
    this.doFor('cartwheel', 1.3, (dt, t) => {
      d.x = clamp(d.x + dir * this.P * 1.2 * dt, this.P * 0.2, W - this.P * 0.2);
      this.spinA = dir * Math.PI * 2 * Math.min(1, t / 1.3);
    }, () => {
      this.spinA = 0;
      d.angle = d.restAngle = 0;
      this.say('✨', 1.2);
    });
  }

  inspect() {
    const { game, toys } = this.app;
    const ids = Object.entries(game.toys).filter(([id, t]) => t.placed && !t.broken && toys.here(t) && id !== 'pelucia' && !BALLS[id]).map(([id]) => id);
    if (!ids.length) return this.walkTo(this.doll.x + rand(-1, 1) * this.P * 3, () => this.doFor('inspect', 2));
    const id = pick(ids);
    const t = game.toys[id];
    const x = (t.x ?? this.doll.x) + rand(-0.15, 0.15) * this.P;
    const thoughts = CURIOUS[baseId(id)] || ['❓', '❗'];
    this.walkTo(x, () => {
      this.say(thoughts[0]);
      this.doFor('inspect', rand(2.5, 4.5), (dt, tt) => {
        if (tt > 2 && !this.saidMore) {
          this.saidMore = true;
          this.say(pick([...thoughts, '💡']));
        }
      }, () => {
        this.saidMore = false;
        // A bed or a cushion: takes a little nap on it.
        if (['cama', 'almofada'].includes(baseId(id)) && chance(0.35)) this.nap(rand(6, 12));
      });
    });
  }

  nap(dur) {
    this.doll.sleepSide = chance(0.5) ? 1 : -1;
    this.doFor('sleep', dur, (dt, t) => {
      if (Math.floor(t / 2.5) !== Math.floor((t - dt) / 2.5)) this.say('💤', 1.5);
    });
  }

  greet() {
    const pet = this.app.pet;
    this.walkTo(this.besidePet(), () => {
      this.say(pick(['👋', '😊', '♥']));
      this.doFor('wave', 2);
      if (chance(0.5)) pet.emit('dollHug');
    }, 1.2);
  }

  readAlone() {
    const { game } = this.app;
    const m = MANGAS.find((x) => x.id === pick(game.mangas));
    if (!m) return this.doFor('idle', 1);
    this.walkTo(game.toys.estante.x + this.P * 0.4, () => this.read(m, rand(12, 25), () => false));
  }

  read(m, dur, stop) {
    this.heldWide = true;
    this.hold(mangaCoverIcon(m));
    let page = 3;
    this.doFor('read', dur, (dt) => {
      if ((page -= dt) <= 0) {
        page = rand(3, 6);
        if (chance(0.4)) this.say(GENRE_FX[m.genre] || '❗', 1.6);
      }
      return stop();
    }, () => {
      this.heldWide = false;
      this.hold(null);
    });
  }

  joinRead(tp) {
    const { game, pet } = this.app;
    const own = game.mangas?.filter((id) => id !== tp.manga.id) || [];
    const m = MANGAS.find((x) => x.id === pick(own)) || tp.manga;
    this.walkTo(this.besidePet(), () => {
      if (pet.toyPlay !== tp) return;
      pet.emit('dollRead');
      this.read(m, 120, () => pet.toyPlay !== tp);
    }, 1.1);
  }

  joinConsole(tp) {
    const { pet } = this.app;
    this.walkTo(this.besidePet(), () => {
      if (pet.toyPlay !== tp) return;
      tp.dollP2 = clamp(0.25 + Math.random() * 0.5, 0.2, 0.8);
      pet.emit('dollJoin');
      this.say('🎮');
      this.doll.back = true;
      this.doFor('play', 600, () => pet.toyPlay !== tp, () => {
        this.doll.back = false;
        const a = tp.lastA ?? 0;
        const b = tp.lastB ?? 0;
        pet.emit('dollGameEnd', { won: a > b, tie: a === b });
        if (b > a) {
          this.say('🏆');
          this.doFor('cheer', 2);
        } else if (a > b) {
          this.say('😵');
          this.doFor('sad', 2);
        }
      });
    }, 1.2);
  }

  joinJam() {
    const { pet } = this.app;
    this.walkTo(this.besidePet(), () => {
      this.say('♪');
      let note = 2;
      this.doFor('dance', 300, (dt) => {
        if ((note -= dt) <= 0) {
          note = rand(2, 4);
          this.say(pick(['♪', '♫', '✨']), 1.4);
          if (chance(0.25)) this.doll.throwUp(0, -this.P * 2.5);
        }
        return pet.activity !== 'jam';
      });
    }, 1.3);
  }

  // Assistir (desktop video or the TV): sits beside her and reacts to the show.
  joinTv() {
    const { pet } = this.app;
    this.walkTo(this.besidePet(), () => {
      let face = rand(3, 6);
      this.doFor('sit', 300, (dt) => {
        if ((face -= dt) <= 0) {
          face = rand(5, 9);
          this.say(pick(['👀', '😮', '😂', '🍿', '✨', '😱']), 1.4);
        }
        return pet.activity !== 'watch';
      });
    }, 1.1);
  }

  // Runs after the ball and kicks it toward the pet (who then chases it).
  playBall(dur) {
    const { pet } = this.app;
    let cool = 0;
    this.doFor('run', dur, (dt) => {
      const ball = this.app.ball;
      if (!ball?.active || ball.x == null) return true;
      const d = this.doll;
      cool -= dt;
      const floor = this.app.world.surfaces[0]?.y ?? innerHeight;
      const dx = ball.x - d.x;
      if (Math.abs(dx) > this.P * 0.18) d.x += Math.sign(dx) * Math.min(Math.abs(dx), this.P * 2 * dt);
      if (cool <= 0 && Math.abs(dx) < this.P * 0.25 && ball.y > floor - this.P * 0.5 && !ball.held) {
        cool = 1.2;
        const dir = pet.x > ball.x ? 1 : -1;
        ball.kick(dir * this.P * rand(4, 8), -this.P * rand(2, 6));
        this.say(pick(['⚽', '❗', '😆']), 1.2);
        pet.ballThrown();
      }
      return false;
    });
  }

  sleepNear() {
    const { pet } = this.app;
    this.walkTo(this.besidePet(), () => {
      this.doll.sleepSide = this.doll.x < pet.x ? 1 : -1;
      let z = 0;
      this.doFor('sleep', 600, (dt) => {
        if ((z -= dt) <= 0) {
          z = 3;
          this.say('💤', 1.6);
        }
        return !/sleep/.test(pet.action);
      });
    });
  }

  // ---------- toys (funtoys.js / toys.js) ----------

  sfx(name, k = 1) {
    if (!isFocus(this.app.config, this.app)) this.app.sound.toy?.(name, k);
  }

  // Key of the toy the Doll is using on its own: the Persocon leaves it alone until it is done.
  get using() {
    return this.task?.toy || null;
  }

  // Playing along with this toyPlay of the Persocon right now.
  joined(tp) {
    return !!tp && this.task?.join === tp;
  }

  // She came for it (or the player asked her to): hands it over.
  yieldToy(key) {
    if (!key || this.using !== key) return;
    this.run(null);
    this.say(pick(['🙂', '👉', '♥']), 1.4);
    this.wait = 1.2;
  }

  toward(x, speed, dt) {
    const d = this.doll;
    const tx = clamp(x, this.P * 0.15, this.app.world.width - this.P * 0.15);
    const dx = tx - d.x;
    const step = this.P * speed * dt;
    if (Math.abs(dx) <= step) {
      d.x = tx;
      return true;
    }
    d.x += Math.sign(dx) * step;
    if (this.task) this.task.pose = speed > 1.4 ? 'run' : 'walk';
    return false;
  }

  // A task with a toy of its own; fx is what funtoys.js draws (yo-yo, hoop) and hides.
  toyTask(key, pose, dur, tick, end) {
    const fx = { id: baseId(key), key, on: true, t: 0 };
    this.doFor(pose, dur, (dt, t) => {
      fx.t = t;
      return tick?.(dt, t, fx);
    }, () => {
      if (this.toyFx === fx) this.toyFx = null;
      this.hold(null);
      this.baseLift = this.bounceH = this.flipA = 0;
      end?.(fx);
    });
    this.task.toy = key;
    this.toyFx = fx;
    return fx;
  }

  freeToy(ids) {
    const { game, toys, pet } = this.app;
    const keys = Object.keys(game.toys).filter((k) => {
      const t = game.toys[k];
      return ids.includes(baseId(k)) && t.placed && !t.broken && toys.reach(t) && pet.toyPlay?.id !== k && toys.want !== k && Math.abs((t.x ?? 0) - this.doll.x) < this.P * 8;
    });
    return keys.length ? pick(keys) : null;
  }

  toyOk(key) {
    const t = this.app.game.toys[key];
    return !!t?.placed && !t.broken && this.app.pet.toyPlay?.id !== key && !this.duo;
  }

  // Mischief: sneaks up to a vending machine and fishes in the tray. Sometimes a snack comes out
  // (it goes to the backpack); rarely its arm gets stuck, it struggles and ends up broken.
  vendSteal() {
    const key = this.freeToy(['venda_comida', 'venda_bebida']);
    const vend = this.app.toys.casino?.vend;
    if (!key || !vend || vend.cur || Date.now() < (this.stealAt || 0)) return false;
    this.stealAt = Date.now() + 15 * 60 * 1000;
    const { toys, game, sound } = this.app;
    const t = game.toys[key];
    const side = this.doll.x < t.x ? -1 : 1;
    this.say('👀', 1.4);
    this.walkTo(t.x + side * toys.size(key) * 0.1, () => {
      if (!this.toyOk(key) || vend.cur) return;
      const r = Math.random();
      const stuck = r < 0.12;
      const win = !stuck && r < 0.45;
      const m = vend.state(key);
      let beat = 0;
      this.toyTask(key, stuck ? 'shiver' : 'squat', stuck ? 4.5 : 2.6, (dt, tt) => {
        if (tt < beat) return;
        beat = tt + (stuck ? 0.35 : 0.6);
        m.jolt = stuck ? 1.2 : 0.5;
        sound.sfx(stuck ? 'bonk' : 'clink', stuck ? 1.1 : 0.7);
        if (stuck && tt > 1 && tt < 1.4) this.say('😱', 1.6);
      }, () => {
        if (stuck) {
          const doll = game.toys.pelucia;
          if (doll) doll.broken = true;
          m.jolt = 1.5;
          sound.sfx('bonk', 1.4);
          sound.sfx('buzz', 1);
          this.say('💥', 2);
          this.app.gains?.show('Ficou preso na máquina e quebrou', 'spend', 'Doll', '💥');
          this.app.pet.emit('dollToy', { kind: 'vendStuck' });
          game.changed();
          return;
        }
        if (!win) return this.say(pick(['😤', '😒']), 1.4);
        const cat = baseId(key) === 'venda_comida' ? 'comidas' : 'bebidas';
        const item = vend.choose(cat, Infinity)?.item;
        if (!item) return;
        game.inventory[item.id] = Math.min(99, game.count(item.id) + 1);
        game.changed();
        sound.sfx('clunk');
        this.say('😏', 1.6);
        this.hold(item.img);
        this.app.gains?.show(item.name, 'item', 'Doll pegou da máquina → mochila', item.img);
        this.app.pet.emit('dollToy', { kind: 'vendSteal', item });
        this.doFor('cheer', 1.6);
      });
    }, 0.7);
    return true;
  }

  // Plays on its own with a toy lying around: yo-yo, hoop, trampoline, cube, keyboard, robot, fish tank.
  toyAlone() {
    const key = this.freeToy(['ioio', 'bambole', 'pula_pula', 'cubo', 'teclado', 'robo', 'aquario']);
    if (!key) return false;
    const { toys, game } = this.app;
    const t = game.toys[key];
    const id = baseId(key);
    const side = this.doll.x < t.x ? -1 : 1;
    const x = id === 'pula_pula' || id === 'bambole' ? t.x
      : id === 'teclado' ? t.x + side * toys.size(key) * 0.3
        : id === 'aquario' ? t.x + side * this.P * 0.42 : t.x + side * this.P * 0.16;
    this.walkTo(x, () => {
      if (this.toyOk(key)) this[`solo_${id}`](key, t);
    }, 1.05);
    return true;
  }

  solo_ioio(key) {
    this.say('🪀');
    let n = -1;
    this.toyTask(key, 'yoyo', rand(8, 14), (dt, t, fx) => {
      fx.yt = (fx.yt || 0) + dt;
      const k = Math.floor(fx.yt / 1.3);
      if (k === n) return;
      n = k;
      if (k > 0 && chance(0.15)) {
        this.say(pick(['😵', '💫']), 1.2);
        this.sfx('yoyoCatch', 0.5);
      } else this.sfx('yoyoDown', 0.5);
    }, () => this.say(pick(['✨', '😊']), 1.4));
  }

  solo_bambole(key) {
    this.say('✨');
    const spin = rand(6, 14);
    let lap = 0;
    this.toyTask(key, 'hula', spin + 1, (dt, t, fx) => {
      if (t < spin) {
        fx.phase = (fx.phase || 0) + dt * 12;
        const l = Math.floor(fx.phase / (Math.PI * 2));
        if (l !== lap) {
          lap = l;
          if (l % 2 === 0) this.sfx('hoopSwish', 0.5);
        }
        return;
      }
      if (fx.drop == null) {
        fx.drop = 0;
        this.sfx('hoopDrop', 0.6);
        this.say(pick(['😆', '✨', '😅']), 1.4);
      }
      fx.drop += dt;
      this.task.pose = 'idle';
    }, () => this.app.toys.fun.dropAt(key, this.doll.x));
  }

  // Trampoline bounce as a pose height (the Doll itself stays "on the ground"), somersaults sometimes.
  bounceTick(dt, st, k = 1) {
    const P = this.P;
    const g = this.app.pet.gravity * 0.8;
    const j = (st.j ||= { h: 0, v: 0, flip: false, air: 1, at: 0 });
    j.v -= g * dt;
    j.h += j.v * dt;
    j.at += dt;
    if (j.h <= 0) {
      j.h = 0;
      const target = P * rand(0.45, 1) * k;
      j.v = Math.sqrt(2 * g * target);
      j.air = (2 * j.v) / g;
      j.at = 0;
      j.flip = target > P * 0.75 && chance(0.3);
      this.sfx('tramp', 0.6);
      if (j.flip) this.sfx('trampFlip', 0.4);
      if (chance(0.2)) this.say(pick(['✨', '😆', '♪']), 1);
    }
    this.bounceH = j.h;
    this.flipA = j.flip ? (clamp(j.at / j.air, 0, 1) * Math.PI * 2) || 1e-4 : 0;
  }

  solo_pula_pula(key) {
    const toys = this.app.toys;
    const t = this.app.game.toys[key];
    this.baseLift = t ? (t.y ?? toys.floorY()) - toys.topAt(key, t.x) : toys.size(key) * toys.ratio(key) * 0.7;
    this.say('😆');
    const st = {};
    this.toyTask(key, 'bounce', rand(8, 14), (dt) => this.bounceTick(dt, st));
  }

  solo_cubo(key) {
    const faces = ['cubo_a', 'cubo_b', 'cubo_c'];
    this.hold(icon('cubo_a'));
    this.say('🧩');
    const solve = rand(10, 22);
    const giveUp = chance(0.25) ? rand(0.5, 0.8) * solve : Infinity;
    let next = 0.4;
    this.toyTask(key, 'cube', solve + 2.2, (dt, t, fx) => {
      this.twist = Math.max(0, (this.twist || 0) - dt * 4);
      if (t > giveUp) {
        if (!fx.gaveUp) {
          fx.gaveUp = true;
          this.say('😵', 1.6);
          this.sfx('cubeGrr', 0.5);
          this.task.pose = 'sad';
        }
        return t > giveUp + 1.8;
      }
      if (t < solve) {
        if ((next -= dt) <= 0) {
          next = rand(0.3, 0.8);
          this.twist = 1;
          this.hold(icon(pick(faces)));
          this.sfx('cubeTwist', 0.4);
        }
      } else if (!fx.solved) {
        fx.solved = true;
        this.hold(icon('cubo'));
        this.say('🏆', 1.8);
        this.sfx('cubeSolve', 0.5);
        this.task.pose = 'cheer';
      }
    });
  }

  // Climbs on the keyboard and walks over the keys (each one sounds), stomping a little dance now and then.
  solo_teclado(key) {
    const { toys } = this.app;
    const fun = toys.fun;
    const t = this.app.game.toys[key];
    const w = toys.size(key);
    const top = w * toys.ratio(key) * 0.93;
    let dir = chance(0.5) ? 1 : -1;
    let stomp = 0;
    this.say('🎹');
    this.baseLift = 0;
    this.toyTask(key, 'cheer', rand(10, 18), (dt) => {
      const d = this.doll;
      if (this.baseLift < top) {
        this.baseLift = Math.min(top, this.baseLift + top * dt * 3);
        return;
      }
      const lo = t.x - w * 0.38;
      const hi = t.x + w * 0.38;
      if (stomp > 0) {
        stomp -= dt;
        this.task.pose = 'dance';
        if (Math.floor(stomp * 3) !== Math.floor((stomp + dt) * 3)) {
          fun.dollKey = -1;
          fun.dollStep(d.x);
        }
        return;
      }
      this.task.pose = 'walk';
      d.x += dir * this.P * 0.35 * dt;
      if (d.x < lo || d.x > hi) {
        d.x = clamp(d.x, lo, hi);
        dir = -dir;
      }
      fun.dollStep(d.x);
      if (chance(dt * 0.3)) {
        stomp = rand(1.2, 2);
        this.say(pick(['♪', '♫']), 1.2);
      }
    });
  }

  // Winds the robot and runs after it, twice.
  solo_robo(key) {
    const fun = this.app.toys.fun;
    const t = this.app.game.toys[key];
    const P = this.P;
    const r = { phase: 'wind', w: 0, dir: this.doll.x < t.x ? 1 : -1, spring: 0, rounds: 0 };
    this.say('🤖');
    this.toyTask(key, 'wind', 24, (dt, tt, fx) => {
      const d = this.doll;
      fx.run = r.phase === 'run';
      if (r.phase === 'wind') {
        this.task.pose = 'wind';
        r.w += dt;
        this.sfx('windTick', 0.8);
        if (r.w > 1.2) {
          r.phase = 'run';
          r.spring = rand(4, 7);
          this.sfx('robotBeep', 0.6);
        }
        return false;
      }
      if (r.phase === 'run') {
        fun.moveRobot(t, r, dt);
        if (r.spring <= 0) {
          r.phase = 'stop';
          r.rounds++;
          this.say(pick(['😆', '✨', '👏']), 1.2);
        }
      }
      const want = r.phase === 'run' ? t.x - r.dir * P * 0.3 : t.x + (d.x < t.x ? -1 : 1) * P * 0.16;
      const far = Math.abs(want - d.x) > P * 0.5;
      if (!this.toward(want, far ? 1.8 : 0.9, dt)) return false;
      if (r.phase === 'stop') {
        if (r.rounds >= 2) return true;
        r.phase = 'wind';
        r.w = 0;
        r.dir = d.x < t.x ? 1 : -1;
      } else this.task.pose = 'idle';
      return false;
    }, () => this.app.game.changed());
  }

  solo_aquario(key) {
    this.say('🐟');
    let tap = 1.5;
    this.toyTask(key, 'inspect', rand(6, 10), (dt) => {
      if ((tap -= dt) > 0) return;
      tap = rand(1.5, 3);
      this.task.pose = pick(['inspect', 'look', 'wave']);
      if (chance(0.5)) {
        this.sfx('glassTap', 0.6);
        this.app.toys.fun.fishScare = 1;
        this.say(pick(['😮', '🐟', '❗']), 1.2);
      } else this.sfx('bubble', 0.5);
    });
  }

  // ---------- playing along with the Persocon's toy ----------

  joinToy(tp) {
    const id = baseId(String(tp.id));
    const fn = {
      teclado: this.joinKeys, pipa: this.joinKite, pula_pula: this.joinTramp, skate: this.joinSkate, cubo: this.joinCube, robo: this.joinRobot,
      camera: this.joinPhoto, espada: this.joinSword, bambole: this.joinCount, ioio: this.joinWatch, tamagotchi: this.joinWatch, aquario: this.joinWatch,
    }[id];
    if (!fn || !this.app.game.toys[tp.id]) return false;
    tp.dollJoins = (tp.dollJoins || 0) + 1;
    fn.call(this, tp, id);
    return true;
  }

  // Walks over and plays along until she is done with the toy (linger: tick decides when to stop).
  joinWith(tp, { x, pose, max, tick, start, end, linger }) {
    const pet = this.app.pet;
    this.walkTo(x, () => {
      if (pet.toyPlay !== tp || this.duo || pet.dead) return;
      tp.dollIn = true;
      this.doFor(pose, max, (dt, t) => (!linger && pet.toyPlay !== tp) || tick?.(dt, t) === true, () => {
        tp.dollIn = false;
        this.hold(null);
        this.baseLift = this.bounceH = this.flipA = 0;
        end?.();
      });
      this.task.toy = `join:${tp.id}`;
      this.task.join = tp;
      start?.();
    }, 1.2);
  }

  // Next to a piece of furniture she is using (outside its picture).
  besideToy(tp) {
    const { pet, toys } = this.app;
    const side = this.doll.x < pet.x ? -1 : 1;
    const x = pet.x + side * (toys.size(tp.id) / 2 + this.P * 0.15);
    return x < this.P * 0.2 || x > this.app.world.width - this.P * 0.2 ? pet.x - side * (toys.size(tp.id) / 2 + this.P * 0.15) : x;
  }

  // She plays the keyboard, it dances (and claps between songs).
  joinKeys(tp) {
    const pet = this.app.pet;
    this.joinWith(tp, {
      x: this.besideToy(tp), pose: 'dance', max: 90,
      start: () => {
        this.say('♪');
        pet.emit('dollToy', { kind: 'piano' });
      },
      tick: (dt, t) => {
        if (Math.floor(t / 2.5) !== Math.floor((t - dt) / 2.5)) {
          this.say(pick(['♪', '♫', '✨']), 1.2);
          if (chance(0.3)) this.doll.throwUp(0, -this.P * 2.2);
        }
        this.task.pose = tp.song ? 'dance' : 'clap';
        if (!tp.song) this.clapSound(t);
      },
    });
  }

  // Holds the kite reel for her for a while, then hands it back.
  joinKite(tp) {
    const pet = this.app.pet;
    const keep = rand(6, 10);
    this.joinWith(tp, {
      x: this.besidePet(), pose: 'kite', max: 40,
      start: () => {
        tp.dollReel = true;
        this.hold(icon('carretel'));
        this.say('🪁');
        pet.emit('dollToy', { kind: 'kite' });
      },
      tick: (dt, t) => {
        if (tp.dollReel) {
          this.task.pose = 'kite';
          if (t > keep) {
            tp.dollReel = false;
            this.hold(null);
            this.say('👍', 1.4);
            pet.emit('dollToy', { kind: 'kiteBack' });
          }
          return false;
        }
        this.task.pose = t - keep < 3 ? 'clap' : 'look';
        if (this.task.pose === 'clap') this.clapSound(t);
        return t > keep + 6;
      },
      end: () => { tp.dollReel = false; },
    });
  }

  // Jumps on the trampoline with her.
  joinTramp(tp) {
    const { toys, game, pet } = this.app;
    const t = game.toys[tp.id];
    const side = this.doll.x < t.x ? -1 : 1;
    const st = {};
    this.joinWith(tp, {
      x: t.x + side * this.P * 0.24, pose: 'bounce', max: 40,
      start: () => {
        this.baseLift = toys.size(tp.id) * toys.ratio(tp.id) * 0.7;
        pet.emit('dollToy', { kind: 'tramp' });
      },
      tick: (dt) => this.bounceTick(dt, st, 0.8),
    });
  }

  // Watches her skate: cheers the jumps; if she falls, runs to her with a hug.
  joinSkate(tp) {
    const pet = this.app.pet;
    const P = this.P;
    let cool = 0;
    let fell = false;
    let after = null;
    const side = this.doll.x < pet.x ? -1 : 1;
    this.joinWith(tp, {
      x: clamp(pet.x + side * P * 1.2, P * 0.3, this.app.world.width - P * 0.3), pose: 'clap', max: 60, linger: true,
      start: () => pet.emit('dollToy', { kind: 'skate' }),
      tick: (dt, t) => {
        cool -= dt;
        if (after) {
          if (!after.at) {
            if (this.toward(this.besidePet(), 1.8, dt)) {
              after.at = t;
              this.task.pose = 'hug';
              this.say('🩹', 2);
              pet.emit('dollHug');
            }
            return t > after.t0 + 8;
          }
          return t - after.at > 2.2;
        }
        if (pet.toyPlay !== tp) {
          if (!fell || pet.dead) return true;
          after = { t0: t };
          return false;
        }
        const s = tp.sk;
        if (s?.mode === 'fall') {
          if (!fell) {
            fell = true;
            this.say('😱', 1.6);
            this.task.pose = 'shiver';
          }
          return false;
        }
        if (s?.mode === 'air' || s?.mode === 'grind') {
          this.task.pose = 'cheer';
          if (cool <= 0) {
            cool = 2.5;
            this.say(pick(['😮', '✨', '🔥', '👏']), 1.2);
            this.sfx('cheer', 0.4);
          }
        } else {
          this.task.pose = 'clap';
          this.clapSound(t);
        }
        return false;
      },
    });
  }

  // Races her on the cube: whoever solves it first.
  joinCube(tp) {
    const pet = this.app.pet;
    const faces = ['cubo_a', 'cubo_b', 'cubo_c'];
    let next = 0.3;
    let mine = 20;
    let lost = false;
    this.joinWith(tp, {
      x: this.besidePet(), pose: 'cube', max: 120,
      start: () => {
        this.hold(icon('cubo_a'));
        mine = Math.max(4, ((tp.solve ?? 20) - tp.t) * rand(0.7, 1.35));
        pet.emit('dollToy', { kind: 'cubeRace' });
      },
      tick: (dt, t) => {
        this.twist = Math.max(0, (this.twist || 0) - dt * 4);
        if (tp.rival === 'doll') {
          this.task.pose = 'cheer';
          return false;
        }
        if (tp.solved) {
          if (!lost) {
            lost = true;
            this.say('😵', 1.8);
            this.task.pose = 'sad';
            this.sfx('aww', 0.4);
          }
          return false;
        }
        if (t >= mine) {
          tp.rival = 'doll';
          this.hold(icon('cubo'));
          this.say('🏆', 2);
          this.sfx('cubeSolve', 0.5);
          this.float(this.doll.x, this.doll.y - this.doll.h * 1.6, 'Doll venceu!');
          pet.emit('dollToy', { kind: 'cubeLose' });
          return false;
        }
        if ((next -= dt) <= 0) {
          next = rand(0.25, 0.7);
          this.twist = 1;
          this.hold(icon(pick(faces)));
          this.sfx('cubeTwist', 0.35);
        }
        return false;
      },
    });
  }

  // Chases the wind-up robot together with her (a bit behind).
  joinRobot(tp) {
    const { pet, game } = this.app;
    const t = game.toys[tp.id];
    this.joinWith(tp, {
      x: this.besidePet(), pose: 'idle', max: 60,
      start: () => pet.emit('dollToy', { kind: 'robot' }),
      tick: (dt) => {
        const r = tp.r;
        if (!t || !r) return false;
        if (r.phase === 'run') {
          if (this.toward(t.x - r.dir * this.P * 0.75, 2.2, dt)) this.task.pose = 'idle';
        } else this.task.pose = r.phase === 'stop' ? 'cheer' : 'idle';
        return false;
      },
    });
  }

  // Poses for her photos (a different pose each shot).
  joinPhoto(tp) {
    const pet = this.app.pet;
    const side = this.doll.x < pet.x ? -1 : 1;
    let shot = -1;
    this.joinWith(tp, {
      x: clamp(pet.x + side * this.P * 0.85, this.P * 0.2, this.app.world.width - this.P * 0.2), pose: 'peace', max: 30,
      start: () => pet.emit('dollToy', { kind: 'photo' }),
      tick: () => {
        if ((tp.taken || 0) === shot) return false;
        shot = tp.taken || 0;
        this.task.pose = pick(['peace', 'cheer', 'salute', 'wave', 'bow']);
        if (shot) this.say(pick(['😊', '✨', '📸']), 1.2);
        return false;
      },
    });
  }

  // Spars with her bamboo sword: punches and kicks, jumps back to dodge.
  joinSword(tp) {
    const pet = this.app.pet;
    const P = this.P;
    let cool = 0;
    this.joinWith(tp, {
      x: clamp(pet.x + (this.doll.x < pet.x ? -1 : 1) * P * 0.7, P * 0.2, this.app.world.width - P * 0.2), pose: 'punch', max: 40,
      start: () => {
        tp.spar = true;
        this.say('⚔');
        pet.emit('dollToy', { kind: 'sword' });
      },
      tick: (dt, t) => {
        cool -= dt;
        const side = this.doll.x < pet.x ? -1 : 1;
        if (!this.toward(pet.x + side * P * 0.7, 1.4, dt)) return false;
        if (tp.swing > 0.85 && cool <= 0 && chance(0.5)) {
          cool = 1;
          this.doll.throwUp(side * P * 0.8, -P * 2.6);
          this.say(pick(['😝', '💨']), 1);
          return false;
        }
        this.task.pose = Math.floor(t * 1.2) % 3 === 2 ? 'kick' : 'punch';
        return false;
      },
      end: () => { tp.spar = false; },
    });
  }

  // Hoop: counts the seconds out loud and claps; cheers when it falls.
  joinCount(tp) {
    let n = 0;
    this.joinWith(tp, {
      x: this.besidePet(), pose: 'clap', max: 60,
      tick: (dt, t) => {
        if (tp.drop == null) {
          const k = Math.floor(tp.t);
          if (k !== n && k > 0) {
            n = k;
            if (k < 6 || k % 2 === 0) this.say(String(k), 0.9);
          }
          this.clapSound(t);
        } else if (this.task.pose !== 'cheer') {
          this.task.pose = 'cheer';
          this.say('👏', 1.5);
          this.sfx('cheer', 0.5);
        }
        return false;
      },
    });
  }

  // Yo-yo, tamagotchi, fish tank: sits next to her and watches.
  joinWatch(tp, id) {
    const faces = { ioio: ['😮', '👏', '✨'], tamagotchi: ['👀', '🥚', '♥'], aquario: ['🐟', '😮', '✨'] }[id] || ['😊'];
    this.joinWith(tp, {
      x: this.besidePet(), pose: id === 'tamagotchi' ? 'inspect' : 'sit', max: rand(8, 14),
      tick: (dt, t) => {
        if (Math.floor(t / 3) !== Math.floor((t - dt) / 3)) this.say(pick(faces), 1.3);
        return false;
      },
    });
  }

  // Clicked: waves, giggles; clicked a lot: gets dizzy.
  poked() {
    const now = performance.now();
    this.pokes = this.pokes.filter((t) => now - t < 2000);
    this.pokes.push(now);
    if (this.duo || this.waking != null) return;
    this.task = null;
    this.wait = 2.5;
    if (this.pokes.length >= 4) {
      this.pokes = [];
      this.say('💫', 2.5);
      this.doll.throwUp(rand(-1, 1) * this.P, -this.P * 3);
      this.doll.spin = 14;
      return;
    }
    this.say(pick(['❗', '😊', '♥', '✨', '😆']));
    if (chance(0.5)) this.doll.throwUp(0, -this.P * 2.6);
    else this.doFor('wave', 1.6);
  }

  knocked() {
    if (this.duo || this.waking != null) return;
    this.task = null;
    this.wait = 1.5;
    this.say(pick(['😵', '💫', '❗']), 1.6);
  }

  // ---------- duo minigames ----------

  // manual: started from the menu (the race asks for a bet).
  startDuo(kind, manual = false) {
    const { pet, minigames } = this.app;
    const d = this.doll;
    if (this.duo || this.waking != null || !d.active || pet.dead || pet.chase || minigames?.active || (pet.mini && !this.duo)) return false;
    if (kind !== 'abraco' && !d.alive) return false;
    if (['pega', 'corrida', 'chute'].includes(kind) && (manual ? this.app.care?.refuse() : pet.drained?.())) return false;
    if (kind === 'chute' && !this.app.ball?.active) {
      if (manual) minigames?.toast('Coloque uma bola na área de trabalho primeiro');
      return false;
    }
    if (pet.activity) this.app.modes?.stop();
    if (pet.toyPlay) pet.endToy(true);
    this.run(null);
    this.task = null;
    this.hold(null);
    this.duo = { kind, phase: 'wait', t: 0, manual };
    pet.mini = () => {
      if (pet.surfaceId !== 'floor') return pet.startGround('hop');
      pet.action = 'mini';
      pet.timer = Infinity;
      if (!this.duo?.petAnim) pet.anim('idle', { facing: 'front' });
    };
    if (pet.mode === 'ground') pet.chooseNext();
    this.app.uiChanged?.();
    return true;
  }

  endDuo(quiet = false) {
    const { pet } = this.app;
    const duo = this.duo;
    this.duo = null;
    this.duoPose = null;
    this.doll.hiding = false;
    this.betEl?.remove();
    this.betEl = null;
    if (pet.mini) pet.mini = null;
    if (!quiet && pet.mode === 'ground' && !pet.dead) {
      const sport = ['pega', 'corrida', 'chute'].includes(duo?.kind);
      pet.adjust(sport ? { mood: 10, energy: -8, hunger: -4, thirst: -6 } : { mood: 10, energy: -3 });
      pet.love?.(duo?.kind === 'abraco' ? 2 : 1.5);
    }
    if (pet.mode === 'ground' && !pet.dead && pet.action === 'mini') {
      if (duo?.react) {
        pet.anim(duo.react === 'happy' ? pet.pickClip(['emote_pos', 'emote'], ['idle']) : pet.pickClip(['emote_neg'], ['idle']), { facing: 'front', restart: true });
        pet.timer = 1.8;
      } else pet.chooseNext();
    }
    this.wait = 1.5;
    this.app.uiChanged?.();
  }

  // Pet helpers: walk/run toward x; returns true on arrival.
  petMove(x, speed, dt, anim) {
    const pet = this.app.pet;
    const W = this.app.world.width;
    const tx = clamp(x, this.P * 0.25, W - this.P * 0.25);
    const dx = tx - pet.x;
    const step = this.P * speed * dt;
    if (Math.abs(dx) <= step) {
      pet.x = tx;
      return true;
    }
    pet.x += Math.sign(dx) * step;
    pet.dir = Math.sign(dx);
    pet.anim(anim || (speed > 1.4 ? 'run' : 'walk'), { facing: pet.side() });
    return false;
  }

  petFace(x, anim = 'idle') {
    const pet = this.app.pet;
    pet.dir = x >= pet.x ? 1 : -1;
    pet.anim(anim, { facing: pet.side() });
  }

  petHappy() {
    const pet = this.app.pet;
    pet.anim(pet.pickClip(['emote_pos', 'emote'], ['idle']), { facing: 'front', restart: true });
  }

  dollMove(x, speed, dt, grounded) {
    const d = this.doll;
    if (!grounded) return false;
    const W = this.app.world.width;
    const tx = clamp(x, this.P * 0.15, W - this.P * 0.15);
    const dx = tx - d.x;
    const step = this.P * speed * dt;
    this.duoPose = speed > 1.4 ? 'run' : 'walk';
    if (Math.abs(dx) <= step) {
      d.x = tx;
      this.duoPose = 'idle';
      return true;
    }
    d.x += Math.sign(dx) * step;
    return false;
  }

  float(x, y, text) {
    this.app.toys.furn.floatText(x, y, text);
  }

  duoTick(dt, grounded) {
    const { pet, minigames } = this.app;
    const duo = this.duo;
    const d = this.doll;
    if (pet.dead || pet.chase || minigames?.active || !d.active) return this.endDuo(true);
    if (pet.mode !== 'ground') return;
    if (duo.phase === 'wait') {
      if (pet.surfaceId !== 'floor' || pet.action !== 'mini') {
        if ((duo.t += dt) > 12) this.endDuo(true);
        return;
      }
      duo.phase = 'start';
      duo.t = 0;
      duo.petAnim = true;
    }
    if (pet.action !== 'mini') {
      pet.action = 'mini';
      pet.timer = Infinity;
    }
    duo.t += dt;
    this[`duo_${duo.kind}`](dt, duo, grounded);
  }

  // Hug: the pet walks over and hugs the Doll (alive or not).
  duo_abraco(dt, duo) {
    const { pet } = this.app;
    const d = this.doll;
    if (duo.phase === 'start') {
      const side = pet.x < d.x ? -1 : 1;
      if (this.petMove(d.x + side * this.P * 0.3, 1, dt)) {
        duo.phase = 'hug';
        duo.t = 0;
        this.petFace(d.x);
        this.petHappy();
        pet.emit('dollHug');
        this.float(d.x, d.y - d.h - 10, '♥');
        this.app.sound.tone8(660, 990, 0.12, 'triangle', 0.06);
        if (d.alive) this.say('♥');
      } else if (duo.t > 15) this.endDuo(true);
      return;
    }
    this.duoPose = d.alive ? 'hug' : null;
    pet.tilt = Math.sin(duo.t * 4) * 0.05;
    if (duo.t > 2.6) {
      pet.tilt = 0;
      duo.react = 'happy';
      this.endDuo();
    }
  }

  // Tag: whoever is "it" chases the other; at the end, "it" loses.
  duo_pega(dt, duo, grounded) {
    const { pet, world } = this.app;
    const d = this.doll;
    const W = world.width;
    const P = this.P;
    if (duo.phase === 'start') {
      duo.phase = 'play';
      duo.it = chance(0.5) ? 'pet' : 'doll';
      duo.left = 30;
      duo.pause = 1.2;
      pet.emit('dollPlay', { kind: 'pega' });
      this.say(duo.it === 'doll' ? '😈' : '😆');
    }
    duo.left -= dt;
    duo.jump = (duo.jump || 0) - dt;
    duo.boost = (duo.boost || 0) - dt;
    duo.tagCool = (duo.tagCool || 0) - dt;
    duo.freeze = (duo.freeze || 0) - dt;
    if (duo.pause > 0) {
      duo.pause -= dt;
      this.duoPose = 'idle';
      this.petFace(d.x);
      return;
    }
    const dist = Math.abs(pet.x - d.x);
    const away = (from, x) => (x >= from ? W : 0);
    // Right after a tag the new "it" counts to itself while the other one gets away.
    if (duo.freeze > 0) {
      if (duo.it === 'pet') {
        this.petFace(d.x);
        this.dollMove(away(pet.x, d.x), 2.2, dt, grounded);
      } else {
        this.duoPose = 'idle';
        this.petMove(away(d.x, pet.x), 2.4, dt, 'run');
      }
      return;
    }
    if (duo.it === 'pet') {
      this.petMove(d.x, 2.3, dt, 'run');
      // Cornered: jumps over the pet.
      if (grounded && duo.jump <= 0 && dist < P * 0.9 && (d.x < P * 0.6 || d.x > W - P * 0.6)) {
        duo.jump = 2;
        d.throwUp(Math.sign(pet.x - d.x) * P * 4.5, -P * 6.5);
        this.say('😝', 1.2);
      } else this.dollMove(away(pet.x, d.x), 2, dt, grounded);
    } else {
      this.dollMove(pet.x, 2.1, dt, grounded);
      let target = away(d.x, pet.x);
      if ((pet.x < P * 0.6 || pet.x > W - P * 0.6) && dist < P * 0.9) duo.boost = 1;
      if (duo.boost > 0) target = d.x < pet.x ? 0 : W;
      this.petMove(target, duo.boost > 0 ? 2.8 : 1.9, dt, 'run');
    }
    if (dist < P * 0.28 && grounded && duo.tagCool <= 0) {
      duo.it = duo.it === 'pet' ? 'doll' : 'pet';
      duo.pause = 0.6;
      duo.freeze = 1.8;
      duo.tagCool = 3.2;
      this.app.sound.tone8(880, 440, 0.1, 'square', 0.06);
      this.float((pet.x + d.x) / 2, d.y - d.h - 20, 'Pegou!');
      if (duo.it === 'doll') this.say('😵', 1.2);
      else pet.emit('dollPlay', { kind: 'pega' });
    }
    if (duo.left <= 0) {
      const won = duo.it === 'doll';
      pet.emit('dollWin', { won });
      this.say(won ? '😭' : '🏆');
      duo.react = won ? 'happy' : 'sad';
      this.endDuo();
      this.doFor(won ? 'sad' : 'cheer', 2);
    }
  }

  // Race: (bet), both walk to the start line, 3-2-1, run to the other side.
  duo_corrida(dt, duo, grounded) {
    const { pet, world, game } = this.app;
    const d = this.doll;
    const W = world.width;
    const P = this.P;
    if (duo.phase === 'start') {
      duo.phase = duo.manual ? 'bet' : 'line';
      duo.dirR = d.x + pet.x > W ? -1 : 1;
      duo.x0 = duo.dirR > 0 ? P * 0.5 : W - P * 0.5;
      duo.x1 = duo.dirR > 0 ? W - P * 0.5 : P * 0.5;
      if (duo.manual) this.betPanel(duo);
      this.petFace(d.x);
      return;
    }
    if (duo.phase === 'bet') {
      this.duoPose = 'idle';
      if (duo.t > 12) this.betDone(duo, null);
      return;
    }
    if (duo.phase === 'line') {
      const a = this.petMove(duo.x0, 1.2, dt);
      const b = this.dollMove(duo.x0, 1.2, dt, grounded);
      if (a) this.petFace(duo.x1);
      if (a && b) {
        duo.phase = 'count';
        duo.t = 0;
        duo.n = 4;
        pet.emit('dollPlay', { kind: 'corrida' });
      } else if (duo.t > 25) this.endDuo(true);
      return;
    }
    if (duo.phase === 'count') {
      this.duoPose = 'idle';
      const n = 3 - Math.floor(duo.t);
      if (n !== duo.n) {
        duo.n = n;
        const y = pet.y - P * 1.2;
        this.float((pet.x + d.x) / 2, y, n > 0 ? String(n) : 'JÁ!');
        this.app.sound.tone8(n > 0 ? 520 : 1040, n > 0 ? 520 : 1040, 0.12, 'square', 0.07);
      }
      if (duo.t >= 3) {
        duo.phase = 'race';
        duo.t = 0;
        duo.sp = [1, 1];
        duo.next = 0;
      }
      return;
    }
    if (duo.phase === 'race') {
      if ((duo.next -= dt) <= 0) {
        duo.next = rand(0.5, 0.9);
        duo.sp = [rand(0.75, 1.25), rand(0.75, 1.25)];
        // Now and then someone trips for a moment.
        if (chance(0.06)) duo.tripPet = 0.7;
        if (chance(0.08)) duo.tripDoll = 0.7;
      }
      duo.tripPet = (duo.tripPet || 0) - dt;
      duo.tripDoll = (duo.tripDoll || 0) - dt;
      const petDone = duo.tripPet > 0 ? (this.petFace(duo.x1), false) : this.petMove(duo.x1, 2.4 * duo.sp[0], dt, 'run');
      let dollDone = false;
      if (duo.tripDoll > 0) {
        this.duoPose = 'sad';
        if (!duo.saidTrip) {
          duo.saidTrip = true;
          this.say('💫', 0.8);
        }
      } else {
        duo.saidTrip = false;
        dollDone = this.dollMove(duo.x1, 2.4 * duo.sp[1], dt, grounded);
      }
      if (petDone || dollDone) {
        const petWon = petDone && (!dollDone || chance(0.5));
        pet.emit('dollWin', { won: petWon });
        this.say(petWon ? '😭' : '🏆');
        if (duo.bet) {
          const right = (duo.bet === 'pet') === petWon;
          this.app.minigames?.toast(right ? 'Você acertou a aposta!' : 'Errou a aposta...');
        }
        duo.react = petWon ? 'happy' : 'sad';
        this.endDuo();
        this.doFor(petWon ? 'sad' : 'cheer', 2.5);
      }
    }
  }

  betPanel(duo) {
    const el = document.createElement('div');
    el.className = 'duo-bet hitzone';
    el.innerHTML = '<div class="duo-title">🏁 Corrida · quem vence?</div>';
    const row = document.createElement('div');
    row.className = 'duo-row';
    for (const [who, label] of [['pet', 'Persocon'], ['doll', 'Doll'], [null, 'Sem aposta']]) {
      const b = document.createElement('button');
      b.textContent = label;
      b.onclick = (e) => {
        e.stopPropagation();
        this.betDone(duo, who);
      };
      row.append(b);
    }
    el.append(row);
    el.addEventListener('pointerdown', (e) => e.stopPropagation());
    document.body.append(el);
    this.betEl = el;
    this.app.uiChanged?.();
  }

  betDone(duo, who) {
    duo.bet = who;
    duo.phase = 'line';
    duo.t = 0;
    this.betEl?.remove();
    this.betEl = null;
    this.app.uiChanged?.();
  }

  // Hide and seek: the pet counts facing away, the Doll hides behind something, the pet searches.
  duo_esconde(dt, duo, grounded) {
    const { pet, game, toys, world } = this.app;
    const d = this.doll;
    const P = this.P;
    if (duo.phase === 'start') {
      const spots = Object.entries(game.toys).filter(([id, t]) => t.placed && !t.broken && toys.here(t) && id !== 'pelucia' && !BALLS[id] && t.y == null).map(([, t]) => t.x);
      spots.push(P * 0.12, world.width - P * 0.12);
      duo.spot = pick(spots);
      duo.decoys = spots.filter((x) => x !== duo.spot).sort(() => Math.random() - 0.5).slice(0, 1 + Math.floor(Math.random() * 2));
      duo.phase = 'count';
      duo.t = 0;
      pet.anim('idle', { facing: 'back' });
      pet.emit('dollPlay', { kind: 'esconde' });
      this.say('🙈');
      return;
    }
    if (duo.phase === 'count') {
      if (!d.hiding && this.dollMove(duo.spot, 2.2, dt, grounded)) {
        d.hiding = true;
        this.duoPose = 'idle';
      }
      const n = 5 - Math.floor(duo.t);
      if (n !== duo.n && n > 0) {
        duo.n = n;
        this.float(pet.x, pet.y - P * 1.2, String(6 - n));
      }
      if (duo.t > 5 && d.hiding) {
        duo.phase = 'seek';
        duo.t = 0;
        duo.look = 0;
      } else if (duo.t > 20) {
        d.hiding = true;
        d.x = duo.spot;
      }
      return;
    }
    if (duo.phase === 'seek') {
      const target = duo.decoys.length ? duo.decoys[0] : duo.spot;
      if (duo.look > 0) {
        duo.look -= dt;
        if (duo.look <= 0) {
          if (duo.decoys.length) {
            duo.decoys.shift();
          } else {
            d.hiding = false;
            this.say('😆');
            d.throwUp(0, -P * 3);
            pet.emit('dollFound');
            this.petHappy();
            duo.react = 'happy';
            this.endDuo();
            this.doFor('cheer', 2);
          }
        }
        return;
      }
      if (this.petMove(target + (pet.x < target ? -1 : 1) * P * 0.25, 1.3, dt)) {
        duo.look = 1.4;
        this.petFace(target);
        if (duo.decoys.length) pet.emit('dollSearch');
      }
    }
  }

  // Kick-about: the two pass the ball back and forth.
  duo_chute(dt, duo, grounded) {
    const { pet } = this.app;
    const ball = this.app.ball;
    const d = this.doll;
    const P = this.P;
    if (!ball?.active || ball.x == null) return this.endDuo(true);
    if (duo.phase === 'start') {
      duo.phase = 'play';
      duo.left = 25;
      duo.cool = 0;
      duo.petCool = 0;
      duo.passes = 0;
      pet.emit('dollPlay', { kind: 'bola' });
    }
    duo.left -= dt;
    duo.cool -= dt;
    duo.petCool -= dt;
    const floor = this.app.world.surfaces[0]?.y ?? innerHeight;
    const low = ball.y > floor - P * 0.45;
    // Whoever is closer goes for the ball; the other waits facing it.
    const petNear = Math.abs(ball.x - pet.x) < Math.abs(ball.x - d.x);
    if (petNear) {
      this.dollMove(d.x, 1, dt, grounded);
      this.duoPose = 'idle';
      if (this.petMove(ball.x - Math.sign(d.x - ball.x || 1) * P * 0.15, 2, dt, 'run') || Math.abs(ball.x - pet.x) < P * 0.3) {
        if (low && duo.petCool <= 0) {
          duo.petCool = 1.6;
          duo.passes++;
          ball.kick(Math.sign(d.x - ball.x || 1) * P * rand(4, 7), -P * rand(2, 5));
          pet.anim(pet.pickClip(['chutar'], ['swing_hand', 'jump']), { facing: pet.side(), restart: true });
        }
      }
    } else {
      this.petFace(ball.x);
      if (this.dollMove(ball.x, 2, dt, grounded) || Math.abs(ball.x - d.x) < P * 0.25) {
        if (low && duo.cool <= 0) {
          duo.cool = 1.6;
          duo.passes++;
          this.duoPose = 'kick';
          ball.kick(Math.sign(pet.x - ball.x || 1) * P * rand(4, 7), -P * rand(2, 5));
          if (chance(0.3)) this.say(pick(['⚽', '😆', '❗']), 1);
        }
      }
    }
    if (duo.left <= 0) {
      this.app.minigames?.toast(`Bate-bola: ${duo.passes} passes!`);
      duo.react = 'happy';
      this.endDuo();
      this.doFor('cheer', 2);
    }
  }
}
