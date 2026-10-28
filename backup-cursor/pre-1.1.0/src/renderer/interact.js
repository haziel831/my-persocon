// Autonomous interactions with the player and the desktop: asking for attention (knocking on the
// "glass" or waving until clicked), stealing the cursor for a moment, break reminders, finding gifts,
// sitting on the active window's title bar, reacting to the PC's sound, kicking and stacking copies
// of desktop icons, the Recycle Bin (only a show: it is never touched) and pushing a real icon a few
// pixels, laughing, and putting it back.
import { icon } from './pixel.js';
import { dollReact } from './watch.js';

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => Math.min(Math.max(v, a), b);
const ease = (v) => v * v * (3 - 2 * v);
const today = () => new Date().toDateString();

// Minimum gap (s) between two of each kind; up to 50% more is added at random.
const GAP = { attention: 1800, steal: 1800, perch: 900, sound: 420, kick: 1080, bin: 1500, nudge: 1500 };
// Player actions that count as paying attention to her.
const TOUCH = new Set(['pet', 'grab', 'slap', 'chaseStart', 'bought', 'requestDone']);
export const IX_NAMES = [
  ['attention', 'Pedir atenção'], ['steal', 'Roubar o cursor'], ['pause', 'Lembrete de pausa'], ['gift', 'Presente'],
  ['perch', 'Sentar na janela'], ['sound', 'Ouvir o som'], ['kick', 'Chutar ícones'], ['bin', 'Lixeira'], ['nudge', 'Empurrar ícone'],
];

export class Interactions {
  constructor(app) {
    this.app = app;
    this.clock = 0;
    // Nothing right after starting.
    this.next = Object.fromEntries(Object.keys(GAP).map((k) => [k, rand(180, 480)]));
    this.next.steal = rand(600, 1200);
    this.next.attention = 0;
    this.wait = rand(60, 120);
    this.touchAt = 0;
    this.attentionAfter = rand(1200, 2100);
    this.session = 0;
    this.awayT = 0;
    this.pauseAt = rand(3600, 7200);
    this.cur = null;
    this.task = null;
    this.pending = false;
    this.listen = null;
    this.props = [];
    this.moved = [];
    this.icons = null;
    this.iconsAt = -1e9;
    this.input = { tick: null, typingAt: -1e9, buttons: false, at: -1e9, cursor: null, busy: false };
    this.stillT = 0;
    this.lastCursor = null;
    this.hoverDone = false;
    app.pet.on((type) => TOUCH.has(type) && this.touched());
    window.petAPI?.onAudio?.((a) => this.onAudio(a));
    addEventListener('beforeunload', () => this.restoreAll());
  }

  get cfg() {
    return this.app.config;
  }

  get P() {
    return this.app.pet.P;
  }

  allowed(kind) {
    const c = this.cfg;
    const api = window.petAPI || {};
    const desk = !c.streamer && !c.focus;
    switch (kind) {
      case 'steal': return c.cursorSteal !== false && desk && !!api.setCursor;
      case 'kick': case 'bin': case 'nudge': return c.iconPlay !== false && desk && !!api.desktopAll;
      case 'perch': return c.windowPerch !== false && desk;
      case 'sound': return c.soundReact !== false && !c.focus && !!api.audioListen;
      case 'attention': return c.askAttention !== false && !c.focus;
      case 'pause': return c.breakReminder !== false;
      default: return true;
    }
  }

  free(debug = false) {
    const { pet, minigames, antics, desktopGames } = this.app;
    return !pet.dead && !pet.paused && !pet.leaving && !pet.chase && !pet.activity && !pet.toyPlay && !pet.hook && !pet.eating && !pet.meals.length
      && !pet.ballPlay && !pet.mini && !minigames?.active && !antics?.cur && !desktopGames?.task && !desktopGames?.bubble
      && !this.cur && !this.task && !this.pending && pet.mode === 'ground' && ['walk', 'idle', 'sit', 'emote'].includes(pet.action)
      && (debug || (!this.app.uiOpen?.() && pet.stats.energy > 15));
  }

  touched() {
    this.touchAt = this.clock;
    if (this.cur) this.cur.touched = true;
  }

  say(type, data) {
    this.app.pet.emit(type, data);
  }

  float(text, dy = 0) {
    const { pet, toys } = this.app;
    toys.furn.floatText(pet.x + rand(-6, 6), pet.y - pet.P * (pet.zoom || 1) * 1.15 + dy, text);
  }

  // A routine owned by pet.playToy (so the watchdog and every "busy" check know about it).
  toy(kind, opts) {
    const { pet } = this.app;
    const c = { kind };
    this.cur = c;
    pet.playToy({
      id: `ix_${kind}`, facing: 'front', ...opts,
      onEnd: (interrupted, tp) => {
        if (this.cur === c) this.cur = null;
        pet.squash = null;
        pet.bodyY = 0;
        pet.zoom = null;
        pet.tiltPivot = { x: 0, y: 0 };
        opts.onEnd?.(interrupted, tp, c);
      },
    });
    return true;
  }

  // Debug buttons: right now, skipping cooldowns and options.
  trigger(kind) {
    if (!this.free(true)) return false;
    if (['kick', 'bin', 'nudge'].includes(kind)) return this.withIcons(kind, true);
    if (kind === 'pause') this.session = this.pauseAt;
    return !!this[kind]?.();
  }

  start(kind) {
    this.next[kind] = this.clock + GAP[kind] * rand(1, 1.5);
    if (['kick', 'bin', 'nudge'].includes(kind)) return this.withIcons(kind);
    return this[kind]();
  }

  update(dt, hidden) {
    this.clock += dt;
    this.updateProps(dt, hidden);
    this.updateTask(dt);
    this.updateListen(dt);
    for (const m of this.moved) if (this.clock >= m.at) this.restore(m);
    if (hidden) return;
    this.pollInput();
    this.trackUse(dt);
    this.trackCursor(dt);
    if (!this.free()) return;
    if (this.tryPause() || this.tryAttention() || this.trySteal()) return;
    if ((this.wait -= dt) > 0) return;
    this.wait = rand(50, 100) * (this.cfg.focus ? 3 : 1);
    if (this.tryGift()) return;
    const kinds = ['perch', 'sound', 'kick', 'bin', 'nudge'].filter((k) => this.clock >= this.next[k] && this.allowed(k));
    if (kinds.length && Math.random() < 0.55) this.start(pick(kinds));
  }

  // ---------- player ----------

  // Continuous use: resets after a real break (the mouse still for ~8 minutes).
  trackUse(dt) {
    if (this.app.watch?.away) {
      this.awayT += dt;
      if (this.awayT > 300) this.session = 0;
    } else {
      this.awayT = 0;
      this.session += dt;
    }
  }

  trackCursor(dt) {
    const c = this.app.pet.cursor;
    const prev = this.lastCursor;
    this.lastCursor = c ? { x: c.x, y: c.y } : null;
    if (!c || !prev || Math.hypot(c.x - prev.x, c.y - prev.y) > 2) {
      this.stillT = 0;
      this.hoverDone = false;
    } else this.stillT += dt;
  }

  // Keyboard use is the session's last input changing while the mouse stays put.
  pollInput() {
    const api = window.petAPI;
    const inp = this.input;
    if (!api?.inputState || !this.allowed('steal') || inp.busy || this.clock - inp.at < 0.8) return;
    inp.at = this.clock;
    inp.busy = true;
    const c = this.app.pet.cursor;
    api.inputState().then((r) => {
      inp.busy = false;
      if (!Array.isArray(r)) return;
      const [tick, buttons] = r;
      const moved = !c || !inp.cursor || Math.hypot(c.x - inp.cursor.x, c.y - inp.cursor.y) > 1;
      if (inp.tick != null && tick !== inp.tick && !moved && !buttons) inp.typingAt = this.clock;
      inp.tick = tick;
      inp.buttons = !!buttons;
      inp.cursor = c ? { x: c.x, y: c.y } : null;
    }).catch(() => { inp.busy = false; });
  }

  tryAttention() {
    if (!this.allowed('attention') || this.clock < this.next.attention) return false;
    const w = this.app.watch;
    if (this.clock - this.touchAt < this.attentionAfter || !w || w.away || w.idle > 30) return false;
    this.next.attention = this.clock + GAP.attention * rand(1, 1.5);
    this.attentionAfter = rand(1200, 2100);
    return this.attention();
  }

  // Comes up to the "glass" and knocks on it (ripples, a crack, the screen shaking) or waves,
  // until the player clicks her or gives up after ~25 s.
  attention() {
    const { pet, sound } = this.app;
    this.say('ixAttention');
    dollReact(this.app, '👀', null);
    const knock = (tp) => {
      const P = this.P;
      const z = pet.zoom || 1;
      const x = pet.x + rand(-0.14, 0.14) * P * z;
      const y = pet.y - P * z * rand(0.62, 0.8);
      const el = document.createElement('div');
      el.className = 'ix-knock';
      el.style.left = `${Math.round(x)}px`;
      el.style.top = `${Math.round(y)}px`;
      document.body.append(el);
      setTimeout(() => el.remove(), 500);
      sound.play('bonk', { volume: 0.35, rate: 1.7 });
      pet.anim(pet.pickClip(['golpe'], ['swing_hand', 'use_mainhand', 'idle']), { facing: 'front', restart: true });
      pet.squash = { x: 1.03, y: 0.97 };
      if (++tp.knocks === 5 && !tp.crack) tp.crack = this.crack(x, y);
      if (tp.knocks % 3 === 0) {
        document.body.classList.remove('screen-knock');
        void document.body.offsetWidth;
        document.body.classList.add('screen-knock');
        setTimeout(() => document.body.classList.remove('screen-knock'), 400);
      }
    };
    return this.toy('attention', {
      dur: 25, anim: 'idle',
      tick: (dt, tp) => {
        tp.knocks ??= 0;
        pet.zoom = 1 + 0.35 * ease(Math.min(1, tp.t / 1.2));
        if (tp.t < 1.2) return;
        const u = (tp.t - 1.2) % 5;
        const knocking = u < 2.6;
        if (knocking) {
          const k = Math.floor(u / 0.45);
          if (k < 4 && k !== tp.k) {
            tp.k = k;
            knock(tp);
          } else if (k >= 4) pet.squash = null;
          tp.waving = false;
        } else {
          tp.k = -1;
          if (!tp.waving) {
            tp.waving = true;
            pet.squash = null;
            pet.anim(pet.pickClip(['emote_pos', 'emote'], ['idle']), { facing: 'front', restart: true });
            this.float(pick(['👋', '❗', '🙋']));
          }
          pet.tilt = Math.sin(tp.t * 6) * 0.06;
        }
      },
      onEnd: (interrupted, tp, c) => {
        const el = tp.crack;
        if (el) {
          el.style.opacity = '0';
          setTimeout(() => el.remove(), 700);
        }
        if (c.touched) {
          this.say('ixAttentionYes');
          pet.adjust({ mood: 6 });
          pet.love(1);
          this.float('♥');
          this.app.antics?.tryStart('hops');
        } else if (!interrupted) {
          this.say('ixAttentionNo');
          pet.adjust({ mood: -2 });
        }
      },
    });
  }

  // A light crack on the "glass": a few lines out of the knocking point.
  crack(x, y) {
    const el = document.createElement('div');
    el.className = 'ix-crack';
    const n = 6 + Math.floor(Math.random() * 3);
    let d = '';
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rand(-0.3, 0.3);
      let px = 40;
      let py = 40;
      d += `M${px} ${py}`;
      for (let j = 0; j < 3; j++) {
        const r = rand(8, 14);
        px += Math.cos(a + rand(-0.4, 0.4)) * r;
        py += Math.sin(a + rand(-0.4, 0.4)) * r;
        d += ` L${px.toFixed(1)} ${py.toFixed(1)}`;
      }
    }
    el.innerHTML = `<svg width="80" height="80" viewBox="0 0 80 80"><path d="${d}" fill="none" stroke="rgba(0,0,0,0.35)" stroke-width="2.4"/><path d="${d}" fill="none" stroke="rgba(255,255,255,0.9)" stroke-width="1"/></svg>`;
    el.style.left = `${Math.round(x - 40)}px`;
    el.style.top = `${Math.round(y - 40)}px`;
    document.body.append(el);
    this.app.sound.tone8(1800, 900, 0.08, 'square', 0.04);
    return el;
  }

  // Cursor resting near her, the player not typing nor holding a button: sometimes she runs
  // to it, grabs it and runs off with it for 1-3 s. Pulling the mouse away frees it.
  trySteal() {
    const { pet } = this.app;
    const c = pet.cursor;
    if (!c || this.hoverDone || !this.allowed('steal') || this.clock < this.next.steal) return false;
    const P = this.P;
    const near = Math.abs(c.x - pet.x) < P * 3 && c.y > pet.y - P * 1.5 && c.y < pet.y + P * 0.1;
    if (!near || this.stillT < 1.2 || this.input.buttons || this.clock - this.input.typingAt < 15) return false;
    this.hoverDone = true;
    if (Math.random() > 0.35) return false;
    this.next.steal = this.clock + GAP.steal * rand(1, 1.5);
    return this.steal();
  }

  steal() {
    const { pet } = this.app;
    const c = pet.cursor;
    const s = pet.validateGround();
    if (!c || !s) return false;
    const P = this.P;
    const x = clamp(c.x, s.x1 + P * 0.25, s.x2 - P * 0.25);
    this.say('ixStealGo');
    return pet.goTo(x, () => this.grabCursor(), Math.abs(x - pet.x) > P * 0.5);
  }

  grabCursor() {
    const { pet } = this.app;
    const c = pet.cursor;
    const P = this.P;
    const s = pet.validateGround();
    if (!s || !c || Math.abs(c.x - pet.x) > P * 0.7 || c.y < pet.y - P * 1.5 || c.y > pet.y + P * 0.15 || this.input.buttons) {
      this.say('ixStealMiss');
      return pet.chooseNext();
    }
    pet.dir = s.x2 - pet.x > pet.x - s.x1 ? 1 : -1;
    if (Math.random() < 0.3 && Math.min(s.x2 - pet.x, pet.x - s.x1) > P * 2) pet.dir = -pet.dir;
    this.say('ixSteal');
    dollReact(this.app, '😂', null);
    let sent = -1;
    return this.toy('steal', {
      dur: rand(1.2, 3), anim: 'run', facing: pet.side(),
      tick: (dt, tp) => {
        const cur = pet.cursor;
        if (tp.set && tp.t > 0.3 && (this.input.buttons || (cur && Math.hypot(cur.x - tp.set.x, cur.y - tp.set.y) > P * 0.9))) {
          tp.yank = true;
          pet.timer = 0;
          return;
        }
        const g = pet.validateGround() || s;
        const nx = pet.x + pet.dir * pet.runSpeed * 0.8 * dt;
        if (nx < g.x1 + P * 0.25 || nx > g.x2 - P * 0.25) {
          pet.dir = -pet.dir;
          pet.anim('run', { facing: pet.side() });
        } else pet.x = nx;
        if (tp.t - sent < 0.03) return;
        sent = tp.t;
        tp.set = { x: pet.x + pet.dir * P * 0.22, y: pet.y - P * 0.62 };
        window.petAPI.setCursor?.(tp.set.x * devicePixelRatio, tp.set.y * devicePixelRatio)?.catch?.(() => {});
      },
      onEnd: (interrupted, tp) => {
        this.say(tp.yank ? 'ixStealYank' : 'ixStealEnd');
        this.float(tp.yank ? '😤' : '😜');
        pet.adjust({ mood: tp.yank ? 1 : 4 });
      },
    });
  }

  tryPause() {
    if (!this.allowed('pause') || this.session < this.pauseAt) return false;
    return this.pause();
  }

  // After 1-2 h of continuous use: water or a stretch, and she does it too.
  pause() {
    const { pet, sound } = this.app;
    const water = Math.random() < 0.5;
    const mins = Math.round(this.session / 60);
    this.session = 0;
    this.pauseAt = rand(3600, 7200);
    this.say('ixPause', { kind: water ? 'water' : 'stretch', mins });
    dollReact(this.app, water ? '💧' : '🙆', 'cheer', 2);
    if (water) {
      return this.toy('pause', {
        dur: 6, anim: 'idle', hold: icon('tapwater'), holdFrom: 0,
        tick: (dt, tp) => {
          tp.reach = 0.45 + (Math.sin(tp.t * 1.4) > 0.6 ? 0.25 : 0);
          if ((tp.sip = (tp.sip ?? 1.2) - dt) <= 0) {
            tp.sip = 1.4;
            sound.sip?.();
            this.float('💧');
          }
        },
        onEnd: () => pet.adjust({ mood: 2, thirst: 6 }),
      });
    }
    // Arms up, side bends, squats, back up.
    return this.toy('pause', {
      dur: 9, anim: 'idle',
      tick: (dt, tp) => {
        const t = tp.t;
        pet.tiltPivot = { x: 0, y: 0 };
        if (t < 2) {
          const u = ease(Math.min(1, t / 1.2));
          pet.squash = { x: 1 - 0.04 * u, y: 1 + 0.08 * u };
        } else if (t < 5) {
          pet.squash = { x: 0.97, y: 1.05 };
          pet.tilt = Math.sin((t - 2) * Math.PI / 1.5) * 0.2;
        } else if (t < 7.6) {
          pet.tilt = 0;
          const down = Math.sin(((t - 5) / 1.3) * Math.PI);
          pet.squash = { x: 1 + 0.05 * Math.max(0, down), y: 1 - 0.13 * Math.max(0, down) };
        } else {
          pet.squash = null;
          pet.tilt = 0;
        }
        const n = Math.floor(t / 1.5);
        if (n !== tp.n && t < 7.5) {
          tp.n = n;
          this.float(String(n + 1));
          sound.tone8(500, 500, 0.05, 'square', 0.04);
        }
      },
      onEnd: () => {
        pet.adjust({ mood: 3, energy: 2 });
        this.float('💪');
      },
    });
  }

  // High affection: now and then she "finds" a Caixa Comum and hands it over (never coins).
  tryGift() {
    const { pet, game } = this.app;
    if (pet.affection < 250) return false;
    const g = (game.profile.gifts ||= { day: '', n: 0, at: 0 });
    if (g.day !== today()) {
      g.day = today();
      g.n = 0;
    }
    if (g.n >= 2 || Date.now() - g.at < 4 * 3600e3) return false;
    if (Math.random() > 0.08 + pet.affection / 4000) return false;
    return this.gift();
  }

  gift() {
    const { pet, game, sound, toys } = this.app;
    const g = (game.profile.gifts ||= { day: today(), n: 0, at: 0 });
    g.n++;
    g.at = Date.now();
    game.changed?.();
    this.say('ixGiftFind');
    toys.furn.floatText(pet.x, pet.y - this.P * 1.2, '❗');
    return this.toy('gift', {
      dur: 7.5, anim: pet.pickClip(['comemorar'], ['idle']), hold: icon('box_comum'), holdFrom: 1.2,
      pickAnim: pet.pickClip(['pegar'], ['use_mainhand', 'idle']),
      tick: (dt, tp) => {
        if (!tp.shown) {
          tp.shown = true;
          this.say('ixGift');
          sound.play('ok', { volume: 0.5 });
          dollReact(this.app, '🎁', 'cheer', 2);
        }
        tp.reach = 0.75 + Math.sin(tp.t * 5) * 0.06;
        tp.bob = -Math.abs(Math.sin(tp.t * 4)) * this.P * 0.05;
      },
      onEnd: (interrupted, tp, c) => {
        game.inventory.caixa_comum = game.count('caixa_comum') + 1;
        game.changed?.();
        toys.furn.floatText(pet.x, pet.y - this.P * 1.25, '🎁 +1 Caixa Comum');
        sound.play('ok', { volume: 0.6 });
        if (c.touched) pet.love(0.5);
      },
    });
  }

  // ---------- desktop ----------

  // Climbs onto the active window's title bar (hook, window side or the wallpaper) and sits there
  // swinging; if the window is dragged or minimized she falls.
  perch() {
    const { pet, world } = this.app;
    const P = this.P;
    const w = [...world.windows.values()].find((v) => v.active && !v.maximized);
    if (!w) return false;
    const segs = world.surfaces.filter((s) => s.id === w.id && s.x2 - s.x1 > P * 0.9 && s.y > P * 1.2);
    if (!segs.length) return false;
    if (pet.surfaceId === w.id) return this.sitOn(w.id);
    const s = segs.reduce((a, b) => (b.x2 - b.x1 > a.x2 - a.x1 ? b : a));
    const fl = pet.validateGround();
    if (!fl) return false;
    this.say('ixPerchGo');
    this.task = { kind: 'perch', id: w.id, t: 0 };
    if (pet.gear.gancho && pet.y - s.y < P * 12 && pet.fireHook(clamp(pet.x, s.x1 + P * 0.3, s.x2 - P * 0.3), s.y, 'self')) return true;
    const walls = world.walls.filter((v) => v.id === w.id && Math.abs(v.y1 - v.top) <= 2 && v.y2 >= pet.y - pet.maxJump() && v.y1 < pet.y - P * 0.6)
      .sort((a, b) => Math.abs(a.x - pet.x) - Math.abs(b.x - pet.x));
    for (const v of walls) {
      const gx = v.x + (v.side === 'left' ? -P * 0.3 : P * 0.3);
      if (gx < fl.x1 || gx > fl.x2) continue;
      if (pet.goTo(gx, () => {
        const wall = world.wallAt(v.id, v.side, Math.min(pet.y, v.y2) - 3, 6);
        if (!wall) {
          this.task = null;
          return pet.chooseNext();
        }
        pet.dir = v.side === 'left' ? 1 : -1;
        pet.startClimb(wall);
      }, Math.abs(gx - pet.x) > P * 4)) return true;
    }
    const x = clamp(pet.x, s.x1 + P * 0.4, s.x2 - P * 0.4);
    if (x >= fl.x1 && x <= fl.x2 && pet.goTo(x, () => {
      if (!pet.scaleTo(s.y, () => this.mount(w.id), 20)) {
        this.task = null;
        pet.chooseNext();
      }
    }, Math.abs(x - pet.x) > P * 4)) return true;
    this.task = null;
    return false;
  }

  mount(id) {
    const { pet, world } = this.app;
    const s = world.surfaceAt(id, pet.x, 2);
    this.task = null;
    if (!s) {
      if (pet.scaling) pet.scaling.hold = 0;
      return;
    }
    pet.scaling = null;
    pet.mode = 'ground';
    pet.surfaceId = id;
    pet.y = s.y;
    this.sitOn(id);
  }

  sitOn(id) {
    const { pet, world } = this.app;
    const w0 = world.window(id);
    if (!w0) return false;
    const at = { x: w0.x, y: w0.y };
    this.say('ixPerch');
    return this.toy('perch', {
      dur: rand(18, 32), anim: 'sit', pose: 'sit',
      tick: (dt, tp) => {
        const w = world.window(id);
        if (!w) return;
        const dx = w.x - at.x;
        const dy = w.y - at.y;
        if (Math.abs(dx) + Math.abs(dy) > 4) {
          pet.fall(-Math.sign(dx || 1) * this.P * 1.2, -this.P * 1.2);
          return;
        }
        pet.bodyY = -Math.abs(Math.sin(tp.t * 3)) * this.P * 0.015;
        pet.tilt = Math.sin(tp.t * 1.6) * 0.04;
        if ((tp.note = (tp.note ?? 2) - dt) <= 0) {
          tp.note = rand(2.5, 4.5);
          this.float(pick(['♪', '♫', '~']));
        }
      },
      onEnd: (interrupted) => {
        if (interrupted && pet.mode === 'air') {
          this.say('ixPerchFall');
          this.float('😵');
        }
      },
    });
  }

  updateTask(dt) {
    const k = this.task;
    if (!k) return;
    const { pet } = this.app;
    k.t += dt;
    if (pet.dead || pet.mode === 'held' || k.t > 40) return this.endTask();
    if (k.kind === 'perch') {
      if (pet.mode === 'ground' && pet.surfaceId === k.id && pet.action !== 'toy' && !pet.hook) {
        this.task = null;
        this.sitOn(k.id);
      } else if (pet.mode === 'ground' && pet.surfaceId !== k.id && !['goto', 'hook', 'land'].includes(pet.action) && k.t > 1) this.task = null;
    } else if (k.kind === 'nudge' && k.phase === 'push') this.pushTick(dt, k);
  }

  endTask() {
    const k = this.task;
    this.task = null;
    if (k?.ghost) this.sendHome(k.ghost);
  }

  // ---------- sound ----------

  sound() {
    const m = this.app.modes;
    if (m?.kind || m?.probing || this.listen || !window.petAPI?.audioListen) return false;
    this.listen = { t: 0, n: 0, sum: 0, loud: 0, beats: 0 };
    window.petAPI.audioListen(true).catch(() => {});
    this.float('👂');
    return true;
  }

  onAudio(a) {
    const l = this.listen;
    if (!l) return;
    l.n++;
    l.sum += a.level;
    if (a.level > 0.2) l.loud++;
    if (a.beat) l.beats++;
  }

  updateListen(dt) {
    const l = this.listen;
    if (!l || (l.t += dt) < 4) return;
    this.listen = null;
    const m = this.app.modes;
    if (!m?.kind && !m?.probing) window.petAPI.audioListen?.(false).catch(() => {});
    if (!l.n || !this.free(true)) return;
    const level = l.sum / l.n;
    if (l.loud > l.n * 0.4 || level > 0.2) this.ears();
    else if (level > 0.015 && l.beats >= 3) this.boogie();
  }

  ears() {
    const { pet } = this.app;
    this.say('ixLoud');
    this.float('🙉');
    return this.toy('ears', {
      dur: 4, anim: pet.pickClip(['medo'], ['idle']),
      tick: (dt, tp) => {
        pet.squash = { x: 1.02, y: 0.95 };
        pet.tilt = Math.sin(tp.t * 28) * 0.025;
      },
      onEnd: () => pet.adjust({ mood: -1 }),
    });
  }

  boogie() {
    const { pet } = this.app;
    this.say('ixDance');
    dollReact(this.app, '🎵', 'cheer', 3);
    const clip = pet.pickClip(['danca'], ['idle']);
    return this.toy('dance', {
      dur: rand(7, 10), anim: clip,
      tick: (dt, tp) => {
        pet.bodyY = -Math.abs(Math.sin(tp.t * 5)) * this.P * 0.04;
        const f = Math.floor(tp.t / 1.1);
        if (f !== tp.f) {
          tp.f = f;
          pet.anim(clip, { facing: ['front', 'left', 'front', 'right'][f % 4] });
          if (f % 2 === 0) this.float(pick(['♪', '♫']));
        }
      },
      onEnd: () => pet.adjust({ mood: 4 }),
    });
  }

  // ---------- desktop icons ----------

  async iconsNow(fresh) {
    if (this.icons && !fresh && this.clock - this.iconsAt < 60) return this.icons;
    let list = [];
    try {
      list = (await window.petAPI.desktopAll?.()) || [];
    } catch {}
    const s = devicePixelRatio || 1;
    const { world } = this.app;
    const wins = [...world.windows.values()];
    this.icons = list.map((d) => ({ ...d, x: d.x / s, y: d.y / s, w: d.w / s, h: d.h / s }))
      .filter((d) => d.x >= 0 && d.y >= 0 && d.x + d.w <= world.width && d.y + d.h < world.height
        && !wins.some((w) => w.x < d.x + d.w && w.right > d.x && w.y < d.y + d.h && w.bottom > d.y));
    this.iconsAt = this.clock;
    return this.icons;
  }

  // Stand-ins when the desktop can't be read (debug buttons in the test page).
  fakeIcons() {
    const H = this.app.world.height;
    return [
      { name: 'Jogo', icon: icon('joystick'), x: 24, y: 24, w: 48, h: 48 },
      { name: 'Pasta', emoji: '📁', x: 24, y: 104, w: 48, h: 48 },
      { name: 'Notas', emoji: '📝', x: 24, y: 184, w: 48, h: 48 },
      { name: 'Lixeira', bin: true, x: 24, y: H - 110, w: 48, h: 48, fake: true },
    ];
  }

  withIcons(kind, force) {
    this.pending = true;
    this.iconsNow(force).then((list) => {
      this.pending = false;
      if (force && !list.some((d) => kind !== 'bin' || d.bin)) list = this.fakeIcons();
      if (!this.free(force) || !this[kind](list)) {
        if (force) this.app.speech?.say('Não achei ícones pra isso!', 2);
      }
    }).catch(() => { this.pending = false; });
    return true;
  }

  // A floating copy of a desktop icon (or an emoji): tweens, physics, then flies back home.
  prop(g, home = true) {
    const size = clamp(g.h || 40, 24, 64);
    let el;
    if (g.icon) {
      el = document.createElement('img');
      el.src = g.icon;
      el.draggable = false;
    } else {
      el = document.createElement('div');
      el.textContent = g.bin ? '🗑️' : g.emoji || '📄';
      el.style.fontSize = `${Math.round(size * 0.78)}px`;
      el.style.lineHeight = `${size}px`;
    }
    el.className = 'dg-ghost ix-prop';
    el.style.width = `${size}px`;
    el.style.height = `${size}px`;
    document.body.append(el);
    const x = g.x + g.w / 2;
    const y = g.y + g.h / 2;
    const p = { el, size, x, y, rot: 0, home: home ? { x, y } : null };
    this.props.push(p);
    this.placeProp(p);
    return p;
  }

  placeProp(p) {
    p.el.style.transform = `translate(${Math.round(p.x - p.size / 2)}px, ${Math.round(p.y - p.size / 2)}px) rotate(${Math.round(p.rot)}deg)`;
  }

  tween(p, to, dur, arc = 0, done = null, delay = 0) {
    p.phys = false;
    p.tw = { fx: p.x, fy: p.y, tx: to.x, ty: to.y, fr: p.rot, t: -delay, dur, arc, done };
  }

  sendHome(p) {
    if (p.homing || p.gone) return;
    p.homing = true;
    if (!p.home) return this.drop(p);
    p.el.style.zIndex = '7';
    this.tween(p, p.home, 0.8, this.P * 0.8, () => this.drop(p));
  }

  drop(p) {
    p.gone = true;
    p.el.style.transition = 'opacity 0.3s';
    p.el.style.opacity = '0';
    setTimeout(() => p.el.remove(), 350);
  }

  wobble(p) {
    p.el.classList.remove('ix-wobble');
    void p.el.offsetWidth;
    p.el.classList.add('ix-wobble');
  }

  updateProps(dt, hidden) {
    if (!this.props.length) return;
    const { world } = this.app;
    const H = world.height;
    const W = world.width;
    const g = this.P * 14;
    for (const p of this.props) {
      if (p.gone) continue;
      const tw = p.tw;
      if (tw) {
        tw.t += dt;
        if (tw.t >= 0) {
          const u = Math.min(1, tw.t / tw.dur);
          const e = ease(u);
          p.x = tw.fx + (tw.tx - tw.fx) * e;
          p.y = tw.fy + (tw.ty - tw.fy) * e - tw.arc * Math.sin(Math.PI * u);
          p.rot = tw.fr * (1 - e);
          if (u >= 1) {
            p.tw = null;
            tw.done?.(p);
          }
        }
      } else if (p.phys) {
        p.vy += g * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.spin * dt;
        const r = p.size / 2;
        if (p.y + r > H) {
          p.y = H - r;
          p.vy = -Math.abs(p.vy) * 0.45;
          p.vx *= 0.75;
          p.spin *= 0.6;
        }
        if (p.x < r || p.x > W - r) {
          p.x = clamp(p.x, r, W - r);
          p.vx = -p.vx * 0.6;
        }
        if ((p.life -= dt) <= 0) this.sendHome(p);
      }
      p.el.style.display = hidden ? 'none' : '';
      this.placeProp(p);
    }
    this.props = this.props.filter((p) => !p.gone);
  }

  // Copies of 1-3 icons fly down into a stack next to her; she backs up, runs and kicks it; they
  // bounce around and fly back to their places.
  kick(list) {
    const { pet, sound } = this.app;
    const P = this.P;
    const pool = list.filter((d) => !d.bin).sort(() => Math.random() - 0.5).slice(0, 1 + Math.floor(Math.random() * 3));
    const s = pet.validateGround();
    if (!pool.length || !s || s.x2 - s.x1 < P * 4) return false;
    const dir = pet.x < (s.x1 + s.x2) / 2 ? 1 : -1;
    pet.dir = dir;
    const baseX = clamp(pet.x + dir * P * 1.1, s.x1 + P * 0.5, s.x2 - P * 0.5);
    let top = s.y;
    const props = pool.map((g, i) => {
      const p = this.prop(g);
      const ty = top - p.size / 2;
      top -= p.size;
      this.tween(p, { x: baseX, y: ty }, 0.6, P * 1.2, () => sound.tone8(400 + i * 150, 700 + i * 150, 0.06, 'square', 0.04), i * 0.55);
      return p;
    });
    this.say(pool.length > 1 ? 'ixStack' : 'ixKick', { n: pool.length });
    const tStack = pool.length * 0.55 + 0.6;
    return this.toy('kick', {
      dur: tStack + 6, anim: pet.pickClip(['olhar', 'curioso'], ['idle']), facing: pet.side(),
      tick: (dt, tp) => {
        if (tp.t < tStack) {
          pet.tilt = Math.sin(tp.t * 4) * 0.04;
          return;
        }
        const t2 = tp.t - tStack;
        if (t2 < 0.9) {
          if (!tp.back) {
            tp.back = true;
            pet.tilt = 0;
            pet.anim('walk', { facing: dir > 0 ? 'right' : 'left', speed: -1 });
          }
          pet.x = clamp(pet.x - dir * pet.walkSpeed * dt, s.x1 + P * 0.2, s.x2 - P * 0.2);
          return;
        }
        if (!tp.kicked) {
          if (!tp.run) {
            tp.run = true;
            pet.dir = dir;
            pet.anim('run', { facing: pet.side() });
          }
          const gap = baseX - dir * P * 0.35 - pet.x;
          if (dir * gap > 1 && t2 < 3.5) {
            pet.x += dir * Math.min(Math.abs(gap), pet.runSpeed * dt);
            return;
          }
          tp.kicked = true;
          tp.kickT = tp.t;
          for (const p of props) {
            if (p.gone || p.homing) continue;
            p.tw = null;
            p.phys = true;
            p.vx = dir * P * rand(3, 7);
            p.vy = -P * rand(3, 6.5);
            p.spin = rand(-720, 720);
            p.life = 3;
          }
          sound.play('bonk', { volume: 0.5, rate: 0.9 });
          pet.anim(pet.pickClip(['chute', 'golpe'], ['swing_hand', 'use_mainhand', 'idle']), { facing: pet.side(), restart: true });
          this.say('ixKicked');
          return;
        }
        if (tp.t - tp.kickT > 1 && !tp.laugh) {
          tp.laugh = true;
          pet.anim(pet.pickClip(['comemorar', 'emote_pos', 'emote'], ['idle']), { facing: 'front', restart: true });
          this.float(pick(['kkk', 'Gol!', '⚽']));
          dollReact(this.app, '⚽', 'cheer', 2);
        }
      },
      onEnd: () => {
        for (const p of props) this.sendHome(p);
        pet.adjust({ mood: 4, energy: -1, thirst: -1 });
      },
    });
  }

  // Walks to the Recycle Bin and throws something in, or dives into it and pops back out.
  // Only copies are animated: the real bin is never touched.
  bin(list) {
    const b = list.find((d) => d.bin);
    const { pet, world } = this.app;
    const P = this.P;
    const s = pet.validateGround();
    if (!b || !s || s.id !== 'floor') return false;
    const cx = b.x + b.w / 2;
    const cy = b.y + b.h / 2;
    const side = cx + P * 1.2 < world.width - P * 0.3 ? 1 : -1;
    const x = clamp(cx + side * P * (0.9 + Math.random() * 1.2), s.x1 + P * 0.3, s.x2 - P * 0.3);
    const dive = s.y - b.y < P * 2.4 && Math.random() < 0.45;
    this.say('ixBinGo');
    return pet.goTo(x, () => this.binAct(b, dive), Math.abs(x - pet.x) > P * 4);
  }

  binAct(b, dive) {
    const { pet, sound } = this.app;
    const P = this.P;
    const cx = b.x + b.w / 2;
    const cy = b.y + b.h / 2;
    pet.dir = cx >= pet.x ? 1 : -1;
    // A copy over the real bin, only when there is no real one under it.
    const cover = b.fake ? this.prop(b, false) : null;
    const shake = () => {
      sound.play('bonk', { volume: 0.4, rate: 0.7 });
      const el = document.createElement('div');
      el.className = 'ix-knock';
      el.style.left = `${Math.round(cx)}px`;
      el.style.top = `${Math.round(cy)}px`;
      document.body.append(el);
      setTimeout(() => el.remove(), 500);
      if (cover) this.wobble(cover);
    };
    const end = () => cover && this.drop(cover);
    if (!dive) {
      return this.toy('bin', {
        dur: 4.6, anim: 'idle', facing: pet.side(),
        tick: (dt, tp) => {
          if (tp.t > 0.5 && !tp.thrown) {
            tp.thrown = true;
            pet.anim(pet.pickClip(['jogar', 'golpe'], ['swing_hand', 'use_mainhand', 'idle']), { facing: pet.side(), restart: true });
            const paper = this.prop({ emoji: pick(['📃', '🍌', '🥫', '🧻']), x: pet.x + pet.dir * P * 0.2 - 16, y: pet.y - P * 0.7 - 16, w: 32, h: 32 }, false);
            paper.rot = 540;
            this.tween(paper, { x: cx, y: cy }, 0.85, P * 1.2, () => {
              this.drop(paper);
              shake();
              this.float('🎯');
              this.say('ixBin', { dive: false });
            });
          }
          if (tp.t > 2 && !tp.cheer) {
            tp.cheer = true;
            pet.anim(pet.pickClip(['comemorar', 'emote_pos', 'emote'], ['idle']), { facing: 'front', restart: true });
          }
        },
        onEnd: () => {
          end();
          pet.adjust({ mood: 3 });
        },
      });
    }
    const x0 = pet.x;
    const rise = pet.y - b.y;
    return this.toy('bin', {
      dur: 4.4, anim: 'idle', facing: pet.side(),
      tick: (dt, tp) => {
        const t = tp.t;
        pet.tiltPivot = { x: 0, y: 0 };
        if (t < 0.3) {
          pet.squash = { x: 1.08, y: 0.9 };
        } else if (t < 1.1) {
          if (!tp.jump) {
            tp.jump = true;
            pet.emit('hop');
            pet.anim('jump', { facing: pet.side(), restart: true });
          }
          const u = (t - 0.3) / 0.8;
          pet.x = x0 + (cx - x0) * u;
          pet.bodyY = -(rise * u + P * 0.8 * Math.sin(Math.PI * u));
          const k = u < 0.7 ? 1 : 1 - (u - 0.7) / 0.3 * 0.95;
          pet.squash = { x: k, y: k };
        } else if (t < 2.7) {
          if (!tp.inside) {
            tp.inside = true;
            this.say('ixBin', { dive: true });
          }
          pet.squash = { x: 0.04, y: 0.04 };
          pet.bodyY = -(pet.y - cy);
          if ((tp.rustle = (tp.rustle ?? 0) - dt) <= 0) {
            tp.rustle = 0.45;
            shake();
            this.app.toys.furn.floatText(cx + rand(-10, 10), b.y, pick(['💨', '❔', '♪']));
          }
        } else if (t < 3.4) {
          if (!tp.out) {
            tp.out = true;
            pet.anim('jump', { facing: 'front', restart: true });
            sound.play('jump', { volume: 0.5 });
          }
          const u = (t - 2.7) / 0.7;
          pet.x = cx + (x0 - cx) * u;
          pet.bodyY = -(rise * (1 - u) + P * 0.9 * Math.sin(Math.PI * u));
          const k = Math.min(1, 0.05 + u * 1.6);
          pet.squash = { x: k, y: k };
        } else {
          if (!tp.land) {
            tp.land = true;
            pet.anim(pet.pickClip(['comemorar', 'emote_pos', 'emote'], ['idle']), { facing: 'front', restart: true });
            this.float('✨');
          }
          pet.x = x0;
          pet.bodyY = 0;
          pet.squash = null;
        }
      },
      onEnd: () => {
        pet.x = x0;
        end();
        pet.adjust({ mood: 4, hygiene: -3 });
      },
    });
  }

  // Pushes a real icon a few pixels (or a copy, when the desktop doesn't allow it), looks at the
  // player and laughs; a few seconds later the icon goes back to where it was.
  nudge(list) {
    const { pet, world } = this.app;
    const P = this.P;
    const s = pet.validateGround();
    if (!s || s.id !== 'floor') return false;
    const g = pick(list.filter((d) => !d.bin));
    if (!g) return false;
    const cx = g.x + g.w / 2;
    const cy = g.y + g.h / 2;
    // She stands where there is room; pushes away from herself, or pulls when that would go off screen.
    const side = g.x - P * 0.6 < 0 ? 1 : g.x + g.w + P * 0.6 > world.width ? -1 : Math.random() < 0.5 ? 1 : -1;
    const far = g.x - P * 0.4 < 0 || g.x + g.w + P * 0.4 > world.width;
    const dirX = far ? side : -side;
    const x = clamp(cx + side * (g.w / 2 + P * 0.22), s.x1 + P * 0.3, s.x2 - P * 0.3);
    const feet = cy + P * 0.6;
    const rise = s.y - feet;
    if (rise > P * 9) return false;
    this.say('ixNudgeGo');
    this.task = { kind: 'nudge', g, side, dirX, t: 0 };
    const ok = pet.goTo(x, () => {
      pet.dir = -side;
      if (rise < P * 0.25) {
        this.task.phase = 'push';
        this.task.pt = 0;
        this.toy('nudge', { dur: 3.6, anim: 'idle', facing: pet.side() });
        return;
      }
      if (!pet.scaleTo(feet, () => {
        if (!this.task) return;
        this.task.phase = 'push';
        this.task.pt = 0;
      }, 4.5)) {
        this.task = null;
        pet.chooseNext();
      }
    }, Math.abs(x - pet.x) > P * 4);
    if (!ok) this.task = null;
    return ok;
  }

  pushTick(dt, k) {
    const { pet, sound } = this.app;
    const P = this.P;
    const g = k.g;
    k.pt += dt;
    const step = [0.3, 0.9, 1.5].findIndex((t) => k.pt >= t && !(k.done || []).includes(t));
    if (step >= 0) {
      (k.done ||= []).push([0.3, 0.9, 1.5][step]);
      const dx = k.dirX * P * 0.1;
      pet.tilt = k.dirX * 0.15;
      pet.tiltPivot = { x: 0, y: 0 };
      sound.tone8(260, 200, 0.06, 'square', 0.05);
      k.off = (k.off || 0) + dx;
      if (k.real !== false && window.petAPI?.moveIcon) {
        window.petAPI.moveIcon(g.name, Math.round(dx * devicePixelRatio), 0).then((orig) => {
          if (Array.isArray(orig) && !k.orig) {
            k.orig = orig;
            this.moved.push({ name: g.name, orig, at: this.clock + 5.5 });
          } else if (!k.orig) this.fakeNudge(k);
        }).catch(() => this.fakeNudge(k));
      } else this.fakeNudge(k);
    } else if (k.pt > 0.45 && k.pt < 2) pet.tilt *= Math.exp(-6 * dt);
    if (k.pt > 2 && !k.laugh) {
      k.laugh = true;
      pet.tilt = 0;
      pet.anim(pet.pickClip(['comemorar', 'emote_pos', 'emote'], ['idle']), { facing: 'front', restart: true });
      this.float(pick(['kkk', 'hihi', '😆']));
      sound.tone8(900, 1300, 0.07, 'square', 0.04);
      setTimeout(() => sound.tone8(1000, 1400, 0.07, 'square', 0.04), 140);
      this.say('ixNudge');
      dollReact(this.app, '😆', null);
    }
    if (k.pt > 3.4) {
      this.task = null;
      if (k.ghost) setTimeout(() => this.sendHome(k.ghost), 2500);
    }
  }

  // The desktop refused (auto-arrange, test page): a copy slides instead.
  fakeNudge(k) {
    k.real = false;
    const g = k.g;
    if (!k.ghost) k.ghost = this.prop(g);
    const p = k.ghost;
    this.tween(p, { x: g.x + g.w / 2 + (k.off || 0), y: g.y + g.h / 2 }, 0.2);
  }

  restore(m) {
    this.moved = this.moved.filter((v) => v !== m);
    window.petAPI?.placeIcon?.(m.name, m.orig[0], m.orig[1])?.catch?.(() => {});
    if (!this.app.pet.dead) {
      this.say('ixNudgeBack');
      this.app.sound.tone8(700, 400, 0.08, 'triangle', 0.04);
    }
  }

  restoreAll() {
    for (const m of this.moved) window.petAPI?.placeIcon?.(m.name, m.orig[0], m.orig[1])?.catch?.(() => {});
    this.moved = [];
  }
}
