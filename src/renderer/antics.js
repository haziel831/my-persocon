// Little autonomous routines of the Persocon, animated procedurally on top of any model's clips
// (squash & stretch, hops, tilts, facing turns): stretching, happy hops, twirls, looking around,
// tripping, dozing off standing, sneezing, balancing, squats, waving at the cursor, humming,
// impatient tapping, gazing at the desktop, shadowboxing and chasing a butterfly.

const clamp = (v, a, b) => Math.min(Math.max(v, a), b);
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const ease = (v) => v * v * (3 - 2 * v);
const FACES = ['front', 'right', 'back', 'left'];
export const ANTIC_NAMES = [
  ['stretch', 'Espreguiçar'], ['hops', 'Pulinhos'], ['twirl', 'Rodopio'], ['look', 'Olhar em volta'],
  ['trip', 'Tropeçar'], ['doze', 'Cochilar em pé'], ['sneeze', 'Espirrar'], ['balance', 'Equilibrar'],
  ['squats', 'Agachamentos'], ['wave', 'Acenar'], ['hum', 'Cantarolar'], ['tap', 'Bater o pé'],
  ['gaze', 'Olhar o desktop'], ['shadowbox', 'Lutar com a sombra'], ['butterfly', 'Borboleta'],
  ['yawn', 'Bocejar'], ['pant', 'Ofegar'],
];
// Extra cost of the physical routines, applied when they finish.
const COST = {
  hops: { energy: -2, hunger: -1, thirst: -2 },
  twirl: { energy: -1, thirst: -1 },
  balance: { energy: -1, thirst: -1 },
  trip: { energy: -1 },
  squats: { hunger: -2, thirst: -3 },
  shadowbox: { energy: -1, hunger: -2, thirst: -3 },
  butterfly: { energy: -1, hunger: -1, thirst: -2 },
};

export class Antics {
  constructor(app) {
    this.app = app;
    this.cur = null;
    this.last = {};
    app.pet.tryAntic = (kind) => this.tryStart(kind);
  }

  get P() {
    return this.app.pet.P;
  }

  // Weights by mood/energy/health/hunger; the same routine is not repeated within 2 minutes.
  weights() {
    const { pet } = this.app;
    const { energy: e, mood: m, health: h, hunger } = pet.stats;
    const c = pet.cursor;
    const cursorNear = c && Math.hypot(c.x - pet.x, c.y - pet.y) < this.P * 4;
    const floor = pet.surfaceId === 'floor';
    const weak = hunger < 30 || (pet.stats.thirst ?? 100) < 30 ? 0 : 1;
    return {
      stretch: e < 60 ? 3 : 1,
      hops: weak * (m > 70 && e > 40 ? 3 : m > 50 ? 1 : 0),
      twirl: m > 60 ? 2 : 0.4,
      look: 2,
      trip: e < 35 ? 1.2 : 0.4,
      doze: e < 40 ? 4 : 0,
      sneeze: h < 60 ? 2.5 : 0.5,
      balance: e > 30 ? 1 : 0,
      squats: weak * (e > 55 ? 1.5 : 0),
      wave: cursorNear ? 4 : 0,
      hum: m > 50 ? 2 : 0.6,
      tap: hunger < 35 ? 4 : 0,
      gaze: floor ? 1.2 : 0.4,
      shadowbox: weak * (e > 50 ? 1.2 : 0),
      butterfly: weak * (floor && e > 35 ? 1.5 : 0),
      yawn: e < 35 ? 3 : 0,
    };
  }

  tryStart(kind) {
    const { pet, minigames } = this.app;
    // INCONSCIENTE: nenhuma travessura, antic ou interação autônoma — ela está apagada fora.
    if (pet.unconscious) return false;
    // Focus session (Pomodoro) and discreet presets: no tricks or desktop mischief.
    if (this.app.pomodoro?.active || this.app.config.anticsOff) return false;
    if (this.cur || pet.mode !== 'ground' || pet.dead || pet.action === 'sleep' || pet.toyPlay || pet.activity || pet.mini || pet.chase || pet.eating || minigames?.active) return false;
    // COMBAT_MODE: no random antics during a fight.
    if (pet.combatMode) return false;
    if (!kind) {
      const now = performance.now();
      const w = Object.entries(this.weights()).filter(([k, v]) => v > 0 && now - (this.last[k] || -1e9) > 120000);
      if (!w.length) return false;
      let r = Math.random() * w.reduce((a, [, v]) => a + v, 0);
      kind = (w.find(([, v]) => (r -= v) <= 0) || w[0])[0];
    }
    this.last[kind] = performance.now();
    this.cur = { kind, t: 0, n: 0, next: 0 };
    pet.anticKind = kind;
    pet.action = 'antic';
    pet.timer = Infinity;
    pet.emit('antic', { kind });
    this[kind](0, this.cur, pet, true);
    return true;
  }

  stop(next = true) {
    const { pet } = this.app;
    this.cur?.cleanup?.();
    this.cur = null;
    pet.squash = null;
    pet.bodyY = 0;
    pet.tilt = 0;
    pet.tiltPivot = { x: 0, y: 0 };
    if (next && pet.action === 'antic' && pet.mode === 'ground') pet.chooseNext();
  }

  update(dt, hidden) {
    const c = this.cur;
    if (!c) return;
    const { pet } = this.app;
    if (pet.action !== 'antic' || pet.mode !== 'ground' || pet.dead) return this.stop(false);
    c.t += dt;
    if (this[c.kind](dt, c, pet, false, hidden)) {
      if (COST[c.kind]) pet.adjust(COST[c.kind]);
      this.stop();
    }
  }

  // ---------- helpers ----------

  float(text, dy = 0) {
    const h = this.app.head;
    if (h) this.app.toys.furn.floatText(h.x + rand(-8, 8), h.y - 6 + dy, text);
  }

  say(text) {
    if (this.app.config.speech !== false) this.app.speech?.say(text, 2);
  }

  tone(f0, f1, d = 0.08, type = 'square', v = 0.06) {
    this.app.sound.tone8(f0, f1, d, type, v);
  }

  sq(x, y) {
    this.app.pet.squash = { x, y };
  }

  // ---------- routines: (dt, state, pet, first) → true when finished ----------

  stretch(dt, c, pet, first) {
    if (first) pet.anim('idle', { facing: 'front' });
    const t = c.t;
    if (t < 1.6) {
      const u = ease(t / 1.6);
      this.sq(1 - 0.04 * u, 1 + 0.08 * u);
    } else if (t < 2.6) {
      pet.tilt = Math.sin((t - 1.6) * Math.PI * 2) * 0.12;
      this.sq(0.96, 1.08);
    } else {
      const u = ease(clamp((t - 2.6) / 0.6, 0, 1));
      pet.tilt = 0;
      this.sq(0.96 + 0.06 * u - 0.02 * Math.sin(u * Math.PI), 1.08 - 0.11 * u + 0.03 * Math.sin(u * Math.PI));
    }
    if (t > 3.3) {
      pet.adjust({ energy: 2, mood: 2 });
      return true;
    }
  }

  hops(dt, c, pet, first) {
    if (first) {
      c.total = 2 + Math.floor(Math.random() * 3);
      pet.anim(pet.pickClip(['comemorar'], ['jump', 'idle']), { facing: 'front', restart: true });
    }
    const len = 0.42;
    const i = Math.floor(c.t / len);
    const u = (c.t % len) / len;
    if (i >= c.total) {
      this.sq(1, 1);
      pet.bodyY = 0;
      pet.adjust({ mood: 3 });
      return c.t > c.total * len + 0.2;
    }
    if (i !== c.n) {
      c.n = i;
      this.tone(500 + i * 120, 900 + i * 120, 0.08, 'square', 0.05);
      if (i === 1) this.float('♥');
    }
    pet.bodyY = -this.P * 0.2 * Math.sin(u * Math.PI);
    const land = u < 0.15 ? 1 - u / 0.15 : u > 0.85 ? (u - 0.85) / 0.15 : 0;
    this.sq(1 + 0.1 * land, 1 - 0.12 * land + (land ? 0 : 0.05));
  }

  twirl(dt, c, pet, first) {
    if (first) c.clip = pet.pickClip(['danca'], ['idle']);
    const i = Math.floor(c.t / 0.16);
    if (i !== c.n || first) {
      c.n = i;
      pet.anim(c.clip, { facing: FACES[i % 4] });
    }
    pet.bodyY = -this.P * 0.05 * Math.abs(Math.sin(c.t * 6));
    if (c.t > 1.9) {
      pet.anim(pet.pickClip(['emote_pos', 'emote'], ['idle']), { facing: 'front', restart: true });
      this.float('✨');
      pet.adjust({ mood: 3 });
      return true;
    }
  }

  look(dt, c, pet, first) {
    const seq = [['left', 1.1], ['right', 1.1], ['front', 1.2]];
    let acc = 0;
    let face = 'front';
    for (const [f, d] of seq) {
      if (c.t < (acc += d)) {
        face = f;
        break;
      }
    }
    if (first || face !== c.face) {
      c.face = face;
      pet.anim('idle', { facing: face });
      if (face === 'front' && !first) this.float('❓');
    }
    pet.tilt = face === 'front' ? Math.sin(c.t * 3) * 0.04 : 0;
    return c.t > 3.6;
  }

  trip(dt, c, pet, first) {
    if (first) {
      pet.anim('walk', { facing: pet.side() });
      c.dir = pet.dir;
    }
    const s = pet.validateGround?.();
    if (c.t < 0.45) {
      if (s) pet.x = clamp(pet.x + c.dir * this.P * 1.1 * dt, s.x1 + this.P * 0.2, s.x2 - this.P * 0.2);
      return;
    }
    if (!c.fell) {
      c.fell = true;
      pet.anim('idle', { facing: c.dir > 0 ? 'right' : 'left', speed: 0 });
    }
    if (c.t < 0.75) pet.tilt = c.dir * 1.25 * ease((c.t - 0.45) / 0.3);
    else if (c.t < 1.8) {
      if (!c.thud) {
        c.thud = true;
        this.tone(160, 60, 0.12, 'triangle', 0.1);
        this.float('💫', this.P * 0.5);
      }
      pet.tilt = c.dir * 1.25;
    } else {
      if (!c.up) {
        c.up = true;
        pet.anim('idle', { facing: 'front' });
      }
      pet.tilt = c.dir * 1.25 * (1 - ease(clamp((c.t - 1.8) / 0.5, 0, 1)));
    }
    if (c.t > 2.5) {
      pet.adjust({ mood: -1 });
      return true;
    }
  }

  doze(dt, c, pet, first) {
    if (first) pet.anim('idle', { facing: 'front', speed: 0.3 });
    if (c.t < 4.8) {
      pet.tilt = Math.sin(c.t * 1.3) * 0.05;
      this.sq(1.01, 0.98 - 0.015 * Math.sin(c.t * 1.3));
      if ((c.next -= dt) <= 0) {
        c.next = 1.4;
        this.float('💤');
      }
      return;
    }
    if (!c.jolt) {
      c.jolt = true;
      pet.tilt = 0;
      this.float('❗');
      this.tone(700, 1100, 0.06, 'square', 0.06);
      pet.anim(pet.pickClip(['medo'], ['jump', 'idle']), { facing: 'front', restart: true });
    }
    const u = c.t - 4.8;
    pet.bodyY = -this.P * 0.12 * Math.max(0, Math.sin(Math.min(1, u / 0.35) * Math.PI));
    this.sq(1, 1);
    if (u > 1) {
      pet.adjust({ energy: 3 });
      return true;
    }
  }

  sneeze(dt, c, pet, first) {
    if (first) {
      c.dir = pet.dir || 1;
      pet.anim('idle', { facing: c.dir > 0 ? 'right' : 'left' });
    }
    if (c.t < 1.3) {
      const u = ease(c.t / 1.3);
      pet.tilt = -c.dir * 0.16 * u;
      this.sq(1 - 0.03 * u, 1 + 0.05 * u);
      return;
    }
    if (!c.boom) {
      c.boom = true;
      this.tone(1400, 200, 0.18, 'sawtooth', 0.07);
      this.say(pick(['Atchim!', 'Atchiiim!', 'Atchô!']));
      this.float('💦');
    }
    const u = clamp((c.t - 1.3) / 0.9, 0, 1);
    pet.tilt = c.dir * 0.22 * (1 - ease(u));
    this.sq(1 + 0.06 * (1 - u), 1 - 0.08 * (1 - u));
    return c.t > 2.4;
  }

  balance(dt, c, pet, first) {
    if (first) pet.anim('idle', { facing: 'front', speed: 0.5 });
    const t = c.t;
    const amp = t < 3 ? 0.04 + t * 0.03 : 0.2 * (1 - clamp((t - 3) / 0.8, 0, 1));
    pet.tilt = Math.sin(t * 3.4) * amp + Math.sin(t * 7.1) * amp * 0.25;
    if (t > 3 && !c.saved) {
      c.saved = true;
      this.float('❗');
      this.tone(600, 400, 0.06);
    }
    return t > 4;
  }

  squats(dt, c, pet, first) {
    if (first) pet.anim('idle', { facing: 'front' });
    const rep = 1.1;
    const i = Math.floor(c.t / rep);
    const u = (c.t % rep) / rep;
    const down = Math.sin(u * Math.PI);
    this.sq(1 + 0.05 * down, 1 - 0.14 * down);
    if (i !== c.n && i > 0) {
      c.n = i;
      this.float(String(i));
      this.tone(500, 500, 0.05, 'square', 0.04);
    }
    if (c.t > rep * 5) {
      pet.adjust({ energy: -3, mood: 3, health: 1 });
      this.float('💪');
      return true;
    }
  }

  wave(dt, c, pet, first) {
    if (first) {
      const cx = pet.cursor?.x ?? pet.x;
      pet.dir = cx >= pet.x ? 1 : -1;
      pet.anim(pet.pickClip(['emote_pos', 'emote'], ['idle']), { facing: Math.abs(cx - pet.x) < this.P * 0.6 ? 'front' : pet.side(), restart: true });
      this.say(pick(['Oi!', 'Ei, você!', 'Olá!', 'Tô te vendo!']));
    }
    pet.tilt = Math.sin(c.t * 5) * 0.05;
    return c.t > 2.4;
  }

  hum(dt, c, pet, first) {
    if (first) pet.anim(pet.pickClip(['cantar', 'danca'], ['idle']), { facing: 'front', speed: 0.6 });
    pet.tilt = Math.sin(c.t * 2.2) * 0.06;
    if ((c.next -= dt) <= 0) {
      c.next = rand(0.6, 1);
      this.float(pick(['♪', '♫']));
      this.tone(pick([523, 587, 659, 784, 880]), 0, 0.12, 'triangle', 0.03);
    }
    if (c.t > 5.5) {
      pet.adjust({ mood: 3 });
      return true;
    }
  }

  tap(dt, c, pet, first) {
    if (first) {
      pet.anim('idle', { facing: 'front' });
      this.say(pick(['Cadê a comida...', 'Tô esperando...', 'Hmpf.', 'Minha barriga...']));
    }
    pet.bodyY = -this.P * 0.012 * Math.abs(Math.sin(c.t * 14));
    pet.tilt = Math.sin(c.t * 1.5) * 0.03;
    if ((c.next -= dt) <= 0) {
      c.next = 1.2;
      this.float('💬');
    }
    return c.t > 4;
  }

  gaze(dt, c, pet, first) {
    if (first) {
      pet.anim('sit', { pose: 'sit', facing: 'back' });
      if (Math.random() < 0.5) this.say(pick(['Que vista bonita...', 'Hmm...', 'Quantas janelas...']));
    }
    if (c.t > 7) {
      pet.adjust({ mood: 2 });
      return true;
    }
  }

  shadowbox(dt, c, pet, first) {
    const i = Math.floor(c.t / 0.5);
    if (first || i !== c.n) {
      c.n = i;
      const f = i % 2 ? 'right' : 'left';
      pet.anim(pet.pickClip(['golpe'], ['swing_hand', 'use_mainhand', 'idle']), { facing: f, restart: true });
      if (i % 2 === 0) this.tone(300, 120, 0.05, 'square', 0.05);
      if (i === 2) this.say(pick(['Hiya!', 'Toma!', 'Ataque!']));
    }
    const u = (c.t % 0.5) / 0.5;
    pet.tilt = (c.n % 2 ? 1 : -1) * 0.12 * Math.sin(u * Math.PI);
    if (c.t > 3.5) {
      pet.adjust({ energy: -2, mood: 2 });
      return true;
    }
  }

  // A butterfly flutters by; she follows it, jumps for it, and it flies away.
  butterfly(dt, c, pet, first, hidden) {
    const P = this.P;
    const s = pet.validateGround?.();
    if (!s) return true;
    if (first) {
      const el = document.createElement('div');
      el.className = 'butterfly';
      el.textContent = '🦋';
      document.body.append(el);
      c.el = el;
      c.cleanup = () => el.remove();
      const side = pet.x < (s.x1 + s.x2) / 2 ? 1 : -1;
      c.bx = clamp(pet.x + side * P * 2, s.x1 + P * 0.5, s.x2 - P * 0.5);
      c.by = pet.y - P * 1.3;
      c.tx = c.bx;
      c.jump = 0;
      this.float('❗');
    }
    // The butterfly wanders near her head height, then leaves upward.
    if ((c.next -= dt) <= 0) {
      c.next = rand(0.7, 1.4);
      c.tx = clamp(c.bx + rand(-1.6, 1.6) * P, s.x1 + P * 0.3, s.x2 - P * 0.3);
    }
    const leaving = c.t > 9;
    c.bx += (c.tx - c.bx) * Math.min(1, dt * 1.5);
    c.by = leaving ? c.by - P * 2 * dt : pet.y - P * (1.15 + 0.25 * Math.sin(c.t * 2.3));
    c.el.style.display = hidden ? 'none' : 'block';
    c.el.style.fontSize = `${Math.round(P * 0.2)}px`;
    c.el.style.transform = `translate(${Math.round(c.bx)}px, ${Math.round(c.by + Math.sin(c.t * 9) * 4)}px) scaleX(${Math.sin(c.t * 18) > 0 ? 1 : 0.55})`;
    // She follows it and jumps when right under it.
    const dx = c.bx - pet.x;
    c.jump -= dt;
    if (c.jump > 0) {
      const u = 1 - c.jump / 0.5;
      pet.bodyY = -P * 0.35 * Math.sin(u * Math.PI);
    } else {
      pet.bodyY = 0;
      c.chase = !leaving && Math.abs(dx) > P * (c.chase ? 0.12 : 0.4);
      if (c.chase) {
        pet.dir = Math.sign(dx);
        pet.x = clamp(pet.x + pet.dir * Math.min(Math.abs(dx), P * 1.6 * dt), s.x1 + P * 0.2, s.x2 - P * 0.2);
        pet.anim('run', { facing: pet.side() });
      } else {
        pet.anim(leaving ? pet.pickClip(['emote_pos', 'emote'], ['idle']) : 'idle', { facing: leaving ? 'front' : pet.side() });
        if (!leaving && Math.random() < dt * 0.9) {
          c.jump = 0.5;
          this.tone(500, 900, 0.07, 'square', 0.04);
        }
      }
    }
    if (leaving && !c.bye) {
      c.bye = true;
      this.say(pick(['Tchau, borboleta!', 'Quase peguei!', 'Volta aqui!']));
    }
    if (c.t > 11.5) {
      pet.adjust({ mood: 4, energy: -2 });
      return true;
    }
  }

  // Out of breath after effort: bends forward, breathes fast and sweats, then wipes the brow.
  pant(dt, c, pet, first) {
    if (first) {
      c.dur = 2.4 + Math.min(2, pet.exertion / 40);
      c.side = pet.dir;
      pet.anim('idle', { facing: pet.side() });
    }
    const t = c.t;
    const bend = ease(clamp(t / 0.4, 0, 1)) * (t > c.dur - 0.5 ? 1 - ease(clamp((t - c.dur + 0.5) / 0.5, 0, 1)) : 1);
    pet.tilt = c.side * 0.16 * bend;
    pet.tiltPivot = { x: 0, y: 0 };
    const b = Math.sin(t * 15);
    this.sq(1 + 0.025 * b * bend, 1 - 0.035 * b * bend);
    if ((c.next -= dt) <= 0) {
      c.next = 0.7;
      if (t < c.dur - 0.5) this.float(pick(['haa', 'hff', 'ufa']), -4);
      if (Math.random() < 0.35) this.app.care?.sweat(1);
    }
    if (t > c.dur) {
      pet.exertion = Math.max(0, pet.exertion - 30);
      pet.anim(pet.pickClip(['emote_pos', 'emote'], ['idle']), { facing: 'front', restart: true });
      return true;
    }
  }

  // Big yawn when sleepy: stretches up, leans back a little, sighs.
  yawn(dt, c, pet, first) {
    if (first) {
      pet.anim('idle', { facing: 'front' });
      this.tone(420, 180, 0.9, 'triangle', 0.035);
      this.float('*boceja*', -6);
    }
    const t = c.t;
    const u = t < 1.1 ? ease(t / 1.1) : 1 - ease(clamp((t - 1.5) / 0.6, 0, 1));
    this.sq(1 - 0.03 * u, 1 + 0.06 * u);
    pet.tilt = -pet.dir * 0.06 * u;
    if (t > 2.2) {
      pet.tilt = 0;
      return true;
    }
  }
}
