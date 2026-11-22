// Close-up: she hops behind the taskbar and pops up huge in front of the screen (torso up), knocks on
// the glass (glitch) and says something: water, posture, meals by the hour, the date, or the player's
// own reminders and alarms (Ações › Lembretes). A click gives her a cafuné; then she drops back down and
// climbs back onto the taskbar where she was.
import { icon } from './pixel.js';
import { isFocus } from './focusmode.js';

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => Math.min(Math.max(v, a), b);
const easeOut = (t) => 1 - (1 - t) ** 3;
const backOut = (t) => 1 + 2.2 * (t - 1) ** 3 + 1.2 * (t - 1) ** 2;

// [id, label]: 8-bit effects from sound.sfx, plus her own voice.
export const REMINDER_SOUNDS = [['chime', 'Sininho'], ['bell', 'Sino'], ['jingle', 'Jingle'], ['beep2', 'Bipe'], ['ding', 'Ding'], ['powerup', 'Power-up'], ['voz', 'Voz dela']];

const HOP = 0.75;
const GONE = 0.45;
const RISE = 0.9;
const KNOCK = 0.42;
const PAT = 1.9;
const DROP = 0.55;
const BACK = 0.9;

export class Closeup {
  constructor(app) {
    this.app = app;
    this.cur = null;
    this.queue = [];
    this.snoozes = [];
    this.nextAuto = rand(12, 22) * 60;
    this.lastCheck = '';
  }

  get cfg() {
    return this.app.config;
  }

  get en() {
    return this.cfg.lang === 'en';
  }

  get active() {
    return !!this.cur;
  }

  name() {
    return this.app.game.profile.owner || this.app.speech?.memory?.Nome || (this.en ? 'friend' : 'amigo');
  }

  fill(text) {
    return String(text).replace(/\{name\}/g, this.name());
  }

  // ---------- what she comes to say ----------

  topic() {
    const en = this.en;
    const d = new Date();
    const h = d.getHours() + d.getMinutes() / 60;
    const md = `${d.getMonth() + 1}-${d.getDate()}`;
    const out = [];
    const add = (w, pt, eng) => out.push([w, en ? eng : pt]);
    add(3, pick(['{name}, bebe uma água! Hidratação é tudo!', 'Ei, {name}! Já tomou água nessa última hora?', 'Toc toc! Hora do golinho de água, {name}!']),
      pick(['{name}, drink some water! Hydration is everything!', 'Hey, {name}! Had any water this past hour?', 'Knock knock! Water sip time, {name}!']));
    add(3, pick(['Postura, {name}! Costas retas e ombros relaxados.', '{name}, endireita essa coluna! Eu tô vendo daqui!', 'Pés no chão, costas no encosto, {name}!']),
      pick(['Posture, {name}! Straight back, relaxed shoulders.', "{name}, sit up straight! I can see you from here!", 'Feet on the floor, back on the chair, {name}!']));
    add(2, pick(['Descansa os olhos, {name}: olha pra longe por 20 segundos!', '{name}, pisca um pouquinho! A tela cansa a vista.']),
      pick(['Rest your eyes, {name}: look far away for 20 seconds!', '{name}, blink a little! Screens tire your eyes.']));
    add(2, pick(['Bora alongar, {name}? Estica os braços pra cima!', '{name}, levanta um pouco e dá uma voltinha!']),
      pick(["Let's stretch, {name}? Arms up high!", '{name}, stand up and walk around a bit!']));
    if (h >= 6 && h < 10) add(5, pick(['Bom dia, {name}! Já tomou café da manhã?', '{name}, nada de trabalhar sem café da manhã!']), pick(['Good morning, {name}! Had breakfast yet?', '{name}, no working without breakfast!']));
    if (h >= 11.5 && h < 14) add(6, pick(['{name}, já é hora do almoço! Vai comer alguma coisa!', 'Almoço, {name}! Minha barriga até roncou por você.']), pick(["{name}, it's lunchtime! Go eat something!", 'Lunch, {name}! My tummy rumbled for you.']));
    if (h >= 15.5 && h < 17) add(3, 'Hora do lanchinho da tarde, {name}?', 'Afternoon snack time, {name}?');
    if (h >= 18.5 && h < 21) add(6, pick(['{name}, já jantou? Não vale pular a janta!', 'Hora da janta, {name}! Vai comer direitinho.']), pick(["{name}, had dinner yet? Don't skip it!", 'Dinner time, {name}! Eat properly.']));
    if (h >= 23 || h < 5) add(6, pick(['{name}, já tá tarde... que tal ir dormir?', 'Madrugada, {name}! Amanhã você agradece se dormir agora.']), pick(["{name}, it's late... how about going to bed?", "It's past midnight, {name}! Tomorrow-you will thank you for sleeping now."]));
    const wd = d.getDay();
    if (wd === 1) add(1.5, 'Segunda-feira... força, {name}! A gente consegue!', "Monday... hang in there, {name}! We've got this!");
    if (wd === 5) add(1.5, 'Sextou, {name}! Já tem plano pro fim de semana?', "It's Friday, {name}! Any weekend plans?");
    if (wd === 0 || wd === 6) add(1.5, 'Fim de semana, {name}! Não esquece de descansar também.', "Weekend, {name}! Don't forget to rest too.");
    const days = {
      '1-1': ['Feliz Ano Novo, {name}!', 'Happy New Year, {name}!'],
      '2-14': ['Dia de São Valentim, {name}! Você é meu favorito.', "Valentine's Day, {name}! You're my favorite."],
      '4-1': ['{name}, sua tela tá quebrada! ...Mentira, é Dia da Mentira!', "{name}, your screen is broken! ...Just kidding, April Fools'!"],
      '6-12': ['Dia dos Namorados, {name}! Eu fico com você hoje.', "Lovers' Day in Brazil, {name}! I'll keep you company."],
      '10-12': ['Dia das Crianças, {name}! Bora brincar?', "Children's Day, {name}! Let's play?"],
      '10-31': ['Gostosuras ou travessuras, {name}? Feliz Halloween!', 'Trick or treat, {name}? Happy Halloween!'],
      '12-24': ['Véspera de Natal, {name}! Já arrumou a árvore?', 'Christmas Eve, {name}! Is the tree ready?'],
      '12-25': ['Feliz Natal, {name}!', 'Merry Christmas, {name}!'],
      '12-31': ['Último dia do ano, {name}! Obrigada por tudo!', 'Last day of the year, {name}! Thanks for everything!'],
    };
    if (days[md]) add(20, days[md][0], days[md][1]);
    const born = new Date(this.app.game.profile.born || Date.now());
    const months = (d.getFullYear() - born.getFullYear()) * 12 + d.getMonth() - born.getMonth();
    if (months > 0 && d.getDate() === born.getDate()) add(20, `Hoje faz ${months} ${months === 1 ? 'mês' : 'meses'} que a gente tá junto, {name}!`, `It's been ${months} month${months === 1 ? '' : 's'} together today, {name}!`);
    let r = Math.random() * out.reduce((s, [w]) => s + w, 0);
    return (out.find(([w]) => (r -= w) <= 0) || out[0])[1];
  }

  // ---------- reminders and alarms (config.reminders) ----------

  checkReminders() {
    const d = new Date();
    const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    const stamp = `${d.toDateString()} ${hm}`;
    if (stamp === this.lastCheck) return;
    this.lastCheck = stamp;
    const list = this.cfg.reminders || [];
    let changed = false;
    for (const r of list) {
      if (!r.on || r.time !== hm || r.fired === stamp) continue;
      if (r.days === 'weekdays' && (d.getDay() === 0 || d.getDay() === 6)) continue;
      r.fired = stamp;
      if (r.days === 'once') r.on = false;
      changed = true;
      this.fire(r);
    }
    const now = Date.now();
    for (const s of this.snoozes.filter((s) => s.at <= now)) {
      this.snoozes.splice(this.snoozes.indexOf(s), 1);
      this.fire(s.r);
    }
    if (changed) this.app.setOption('reminders', [...list]);
  }

  fire(r) {
    const item = { kind: r.alarm ? 'alarm' : 'reminder', text: r.text || (this.en ? 'Reminder, {name}!' : 'Lembrete, {name}!'), sound: r.sound || 'chime', volume: r.volume ?? 1, r };
    if (r.alarm) this.queue.unshift(item);
    else this.queue.push(item);
  }

  // Test from the menu: right now.
  test(r) {
    this.queue.unshift(r ? { ...r, kind: r.alarm ? 'alarm' : 'reminder', text: r.text || (this.en ? 'Reminder, {name}!' : 'Lembrete, {name}!'), sound: r.sound || 'chime', volume: r.volume ?? 1, r }
      : { kind: 'auto', text: this.topic() });
  }

  ring(item) {
    const k = clamp(item.volume ?? 1, 0, 2) * (this.cfg.reminderVolume ?? 1);
    if (item.sound === 'voz') this.app.sound.voice(5);
    else this.app.sound.sfx(item.sound || 'chime', 1.6 * k);
  }

  // ---------- loop ----------

  ready(urgent) {
    const { pet } = this.app;
    if (pet.dead || pet.offstage || pet.leaving || pet.chase || pet.x === null || pet.mode !== 'ground') return false;
    if (this.app.minigames?.active || this.app.gameOver || this.app.intro?.busy) return false;
    if (urgent) return true;
    return !pet.toyPlay && !pet.activity && !pet.eating && !pet.hook && !this.app.uiOpen?.() && ['idle', 'walk', 'sit', 'emote', 'run'].includes(pet.action);
  }

  update(dt, hidden) {
    this.checkReminders();
    if (this.cur) return this.tick(dt);
    if (hidden) return;
    const next = this.queue[0];
    if (next) {
      const urgent = next.kind !== 'auto';
      if (!this.ready(urgent)) return;
      return this.start(this.queue.shift());
    }
    if (this.cfg.closeupAuto === false || isFocus(this.cfg, this.app)) return;
    if ((this.nextAuto -= dt) > 0) return;
    if (!this.ready(false) || this.app.pet.surfaceId !== 'floor') {
      this.nextAuto = 45;
      return;
    }
    this.nextAuto = (rand(18, 40) * 60) / (this.cfg.closeupFreq ?? 1);
    this.start({ kind: 'auto', text: this.topic() });
  }

  start(item) {
    const { pet } = this.app;
    if (pet.toyPlay) pet.endToy(true);
    if (pet.ballPlay) pet.endBall(true);
    // Always clear leftovers from a previous approach (opacity/clip/zoom/detail) so the 2nd+ visit shows her.
    this.resetVisual();
    const c = (this.cur = { ...item, text: this.fill(item.text), phase: 'hop', t: 0, rings: 0, els: [], floor: pet.y, offFloor: pet.surfaceId !== 'floor' });
    pet.closeup = true;
    pet.playToy({
      id: 'closeup', dur: Infinity, anim: pet.pickClip(['jump'], ['idle']), facing: 'front', lift: 0,
      hold: item.hold || null, holdFrom: item.hold ? 0 : 1, holdSize: item.holdSize || 0.22,
      tick: () => {},
      onEnd: () => this.cleanup(c),
    });
    this.app.sound.play('jump', { volume: 0.5 });
  }

  // Zoom / WebGL detail / CSS opacity / clipPath — anything that can leave her invisible.
  resetVisual() {
    const { pet, view } = this.app;
    const canvas = view.canvas;
    pet.zoom = null;
    pet.shiftX = 0;
    pet.bodyY = 0;
    pet.squash = null;
    pet.hideRect = null;
    if (canvas) {
      canvas.style.opacity = '';
      canvas.style.clipPath = '';
    }
    view.setDetail?.(1);
  }

  // Desktop game tip: same approach as a reminder, holding the icon.
  startGame(g) {
    const en = this.en;
    const name = g.name || 'game';
    this.queue.unshift({
      kind: 'desktopGame',
      text: en ? `{name}, let's play ${name}?` : `{name}, bora jogar ${name}?`,
      hold: g.icon || icon('joystick'),
      holdSize: 0.28,
      game: g,
      sound: 'chime',
    });
  }

  phase(name) {
    const c = this.cur;
    c.phase = name;
    c.t = 0;
  }

  // Size of the close-up (zoom) and where her feet go (screen px) when fully up.
  // Cap so torso/head stay on screen even at >100% size or tiny monitors (800×600).
  frame() {
    const { pet, view } = this.app;
    const H = Math.max(240, innerHeight);
    const W = Math.max(320, innerWidth);
    const P = Math.max(40, pet.P);
    const want = ((this.cfg.closeupSize ?? 1) * 0.88 * H) / P;
    const Z = clamp(Math.min(want, (0.72 * H) / P, (0.55 * W) / P), 1.6, 10);
    const sx = clamp(pet.x, Z * P * 0.28, W - Z * P * 0.28);
    // Feet a bit below the bottom so only the upper body fills the view.
    const feet = H + clamp(0.22 * Z * P, 24, H * 0.28);
    return { Z, P, H, sx, feet, view };
  }

  // Puts her feet at screen y with zoom Z, shifted horizontally to sx.
  place(Z, feetY, sx) {
    const { pet } = this.app;
    pet.zoom = Z;
    pet.shiftX = sx - pet.x;
    pet.bodyY = feetY - pet.y - (Z - 1) * pet.P * 0.55;
  }

  // Hides what is below the taskbar line (hopping down behind it / climbing back up).
  // Up on a window there is no taskbar to hide behind: she fades out and back in instead.
  clipFloor(on, fade = 1) {
    const { pet, view } = this.app;
    const c = this.cur;
    const canvas = view.canvas;
    if (c?.offFloor) {
      // Floor path must not leave a stale clip; off-floor path must not leave opacity at 0.
      pet.hideRect = null;
      if (canvas) canvas.style.clipPath = '';
      canvas.style.opacity = on ? String(clamp(fade, 0, 1)) : '';
      return;
    }
    if (canvas) canvas.style.opacity = '';
    pet.hideRect = on && c ? { x: -innerWidth, y: c.floor, w: innerWidth * 3, h: innerHeight * 2 } : null;
    if (!on && canvas) canvas.style.clipPath = '';
  }

  tick(dt) {
    const c = this.cur;
    const { pet, sound } = this.app;
    const tp = pet.toyPlay;
    if (!tp || tp.id !== 'closeup') return this.cleanup(c);
    c.t += dt;
    const P = pet.P;
    if (c.phase === 'hop') {
      const u = Math.min(1, c.t / HOP);
      tp.lift = P * (2.2 * u - 3.4 * u * u);
      this.clipFloor(true, (1 - u) * 2);
      if (u >= 1) {
        sound.sfx('whoosh', 0.8);
        this.phase('gone');
      }
    } else if (c.phase === 'gone') {
      tp.lift = -P * 2;
      this.clipFloor(true, 0);
      if (c.t >= GONE) {
        this.clipFloor(false);
        tp.lift = 0;
        c.f = this.frame();
        // Cap detail: high DPR × detail can blank the WebGL buffer on the 2nd approach.
        this.app.view.setDetail?.(Math.min(c.f.Z, 2.5));
        const canvas = this.app.view.canvas;
        if (canvas) { canvas.style.opacity = ''; canvas.style.clipPath = ''; }
        pet.hideRect = null;
        pet.squash = null;
        pet.anim(pet.pickClip(['idle'], ['idle']), { facing: 'front', restart: true });
        sound.sfx('boing', 1.2);
        this.phase('rise');
      }
    } else if (c.phase === 'rise') {
      const { Z, H, sx, feet } = c.f;
      const u = Math.min(1, c.t / RISE);
      // Visible again while rising (never keep opacity/clip from the hop).
      const canvas = this.app.view.canvas;
      if (canvas) { canvas.style.opacity = ''; canvas.style.clipPath = ''; }
      pet.hideRect = null;
      this.place(Z, H + 1.1 * Z * P + (feet - H - 1.1 * Z * P) * backOut(u), sx);
      if (u >= 1) {
        if (c.kind === 'desktopGame') {
          // Skip knocks: she already has the icon up (Play/Later live in the close-up bubble).
          this.phase('talk');
          this.talk();
        } else {
          this.phase('knock');
          // Reminders: three firm knocks with one fist. Alarms: both fists, fast and frantic.
          if (c.kind === 'alarm') this.startKnocks(16, 0.15, true);
          else this.startKnocks(3, KNOCK, false);
        }
      }
    } else if (c.phase === 'knock') {
      const { Z, sx, feet } = c.f;
      c.punch = Math.max(0, (c.punch || 0) - dt * 7);
      this.place(Z * (1 + 0.04 * c.punch), feet, sx);
      if (this.knockTick(dt) && (c.after = (c.after || 0) + dt) >= 0.25) {
        this.phase('talk');
        this.talk();
      }
    } else if (c.phase === 'talk') {
      const { Z, sx, feet } = c.f;
      c.punch = Math.max(0, (c.punch || 0) - dt * 7);
      // Keep her drawable: a leftover opacity:0 / clipPath from hop made her vanish on 2nd visit.
      const canvas = this.app.view.canvas;
      if (canvas && (canvas.style.opacity || canvas.style.clipPath)) {
        canvas.style.opacity = '';
        canvas.style.clipPath = '';
      }
      pet.hideRect = null;
      this.place(Z * (1 + 0.04 * c.punch), feet + Math.sin(c.t * 1.6) * P * Z * 0.006, sx);
      this.knockTick(dt);
      this.typeText(dt);
      this.layout();
      const alarm = c.kind === 'alarm';
      if (alarm || c.kind === 'reminder') {
        c.ringT = (c.ringT ?? 0) - dt;
        if (c.ringT <= 0 && c.rings < (alarm ? 30 : 2)) {
          c.ringT = alarm ? 4 : 6;
          c.rings++;
          this.ring(c);
          if (alarm && c.rings > 1) this.startKnocks(8, 0.15, true);
        }
      }
      if (c.t >= (c.talkFor || (alarm ? 150 : 40))) {
        c.onTimeout?.();
        this.leave();
      }
    } else if (c.phase === 'pat') {
      const { Z, sx, feet } = c.f;
      this.place(Z, feet, sx);
      this.layout();
      this.patHand();
      if (c.t >= PAT) this.leave();
    } else if (c.phase === 'drop') {
      const { Z, sx, feet } = c.f;
      const u = Math.min(1, c.t / DROP);
      this.place(Z, feet + u * u * 1.2 * Z * P, sx);
      if (u >= 1) {
        this.restore();
        pet.anim(pet.pickClip(['jump'], ['idle']), { facing: 'front', restart: true });
        sound.play('jump', { volume: 0.5 });
        this.phase('back');
      }
    } else if (c.phase === 'back') {
      const u = Math.min(1, c.t / BACK);
      // From below the taskbar: up over the edge and down onto it.
      tp.lift = -P * 1.6 + P * (6.2 * u - 4.6 * u * u);
      tp.lift = u >= 1 ? 0 : tp.lift;
      this.clipFloor(true, u * 2);
      if (u >= 1) {
        this.clipFloor(false);
        sound.play('landing', { volume: 0.5 });
        pet.endToy(false);
        pet.chooseNext();
        return;
      }
    }
  }

  restore() {
    this.resetVisual();
    this.removeEls();
  }

  cleanup(c) {
    if (this.cur !== c || !c) return;
    this.clipFloor(false);
    this.restore();
    this.cur = null;
    this.app.pet.closeup = false;
    this.app.uiChanged?.();
  }

  removeEls() {
    const c = this.cur;
    if (!c) return;
    for (const el of c.els) el.remove();
    c.els = [];
    c.bubble = c.hit = c.hand = null;
  }

  // Head of the close-up (screen px) and the visible width of her body.
  headAt() {
    const { Z, P, sx } = this.cur.f;
    const { pet } = this.app;
    const top = (this.app.view.bounds?.top || P) * (pet.zoom || Z);
    const feet = pet.y + (pet.bodyY || 0) + ((pet.zoom || Z) - 1) * P * 0.55;
    return { x: sx, y: feet - top + Z * P * 0.12, top: feet - top, w: Z * P * 0.5 };
  }

  // n knocks, one every `period` seconds; both = alternating fists (the idle one stays raised, ready).
  startKnocks(n, period, both) {
    this.cur.kn = { n, period, both, t: 0, hits: 0 };
  }

  // Fist pulled back, then a quick strike forward against the glass and a rebound. True when done.
  knockTick(dt) {
    const c = this.cur;
    const k = c.kn;
    const tp = this.app.pet.toyPlay;
    if (!k) return true;
    k.t += dt;
    const i = Math.floor(k.t / k.period);
    if (i >= k.n) {
      c.kn = null;
      if (tp) tp.armPose = null;
      return true;
    }
    const u = (k.t % k.period) / k.period;
    const v = u < 0.55 ? 0.15 * (1 - u / 0.55) : u < 0.7 ? (u - 0.55) / 0.15 : 1 - ((u - 0.7) / 0.3) * 0.85;
    const side = k.both && i % 2 ? 'Left' : 'Right';
    const idle = k.both ? 0.3 : null;
    if (tp) tp.armPose = { knock: side === 'Right' ? { Right: v, Left: idle } : { Left: v, Right: idle } };
    if (i >= k.hits && u >= 0.7) {
      k.hits = i + 1;
      this.knock(side, k.both);
    }
    return false;
  }

  // Where a fist touches the screen (screen px).
  fistAt(side) {
    const { pet, view } = this.app;
    const Z = pet.zoom || this.cur.f.Z;
    const hp = view.handPoint?.(side);
    const feet = pet.y + (pet.bodyY || 0) + (Z - 1) * pet.P * 0.55;
    const x = pet.x + (pet.shiftX || 0);
    if (!hp) {
      const hd = this.headAt();
      return { x: hd.x + rand(-0.15, 0.15) * hd.w, y: hd.y + hd.w * 0.4 };
    }
    return { x: x + hp.x * Z, y: feet - hp.y * Z };
  }

  knock(side, frantic) {
    const c = this.cur;
    const { sound } = this.app;
    const { x, y } = this.fistAt(side);
    c.punch = 1;
    sound.sfx('glassTap', frantic ? 1.6 : 2.4);
    sound.play('bonk', { volume: frantic ? 0.3 : 0.45, rate: frantic ? rand(1.5, 1.8) : 1.4 });
    this.glitch(x, y, frantic);
  }

  // Glitch on the "glass": RGB-split bars, scanlines, a ripple where she hit, and the screen shaking.
  glitch(x, y, light) {
    const el = document.createElement('div');
    el.className = 'cu-glitch';
    for (let i = 0; i < (light ? 4 : 10); i++) {
      const b = document.createElement('i');
      b.style.top = `${rand(0, 98)}%`;
      b.style.height = `${rand(0.4, 5)}%`;
      b.style.left = `${rand(-20, 30)}%`;
      b.style.width = `${rand(30, 100)}%`;
      b.style.background = pick(['rgba(255, 0, 90, 0.45)', 'rgba(0, 240, 255, 0.45)', 'rgba(255, 255, 255, 0.35)', 'rgba(120, 0, 255, 0.4)']);
      b.style.animationDelay = `${rand(0, 0.12)}s`;
      el.append(b);
    }
    const ring = document.createElement('b');
    ring.style.left = `${x}px`;
    ring.style.top = `${y}px`;
    el.append(ring);
    document.body.append(el);
    setTimeout(() => el.remove(), 420);
    document.body.classList.remove('screen-knock');
    void document.body.offsetWidth;
    document.body.classList.add('screen-knock');
    setTimeout(() => document.body.classList.remove('screen-knock'), 400);
  }

  talk() {
    const c = this.cur;
    const { pet, sound } = this.app;
    pet.anim(pet.pickClip(['emote_pos', 'emote'], ['idle']), { facing: 'front', restart: true });
    if (c.kind === 'auto') sound.voice(4);
    else c.ringT = 0;
    const en = this.en;
    const bubble = document.createElement('div');
    bubble.className = `cu-bubble hitzone${c.kind === 'alarm' ? ' alarm' : ''}`;
    const tag = c.tag || (c.kind === 'alarm' ? (en ? 'Alarm' : 'Alarme') : c.kind === 'reminder' ? (en ? 'Reminder' : 'Lembrete') : '');
    bubble.innerHTML = `${tag ? `<small>${tag}</small>` : ''}<p></p><div class="cu-actions"></div>`;
    const actions = bubble.querySelector('.cu-actions');
    const btn = (label, fn) => {
      const b = document.createElement('button');
      b.textContent = label;
      b.onclick = (e) => {
        e.stopPropagation();
        fn();
      };
      actions.append(b);
    };
    if (Array.isArray(c.actions) && c.actions.length) {
      for (const [label, fn] of c.actions) btn(label, fn);
    } else {
      btn(en ? 'Ok! (cafuné)' : 'Ok! (cafuné)', () => this.pat());
      if (c.kind === 'alarm' || c.kind === 'reminder') {
        btn(en ? 'Snooze 5 min' : 'Soneca 5 min', () => {
          this.snoozes.push({ at: Date.now() + 5 * 60000, r: c.r || { text: c.text, alarm: c.kind === 'alarm', sound: c.sound } });
          this.leave();
        });
      }
      if (c.kind === 'desktopGame' && c.game) {
        btn(en ? '▶ Play' : '▶ Jogar', () => {
          window.petAPI.openDesktopItem(c.game.path).catch(() => {});
          this.app.sound?.play('ok');
          this.app.pet.emit('desktopGamePlay', { name: c.game.name });
          this.app.desktopGames?.closeBubble?.();
          this.leave();
        });
        btn(en ? 'Later' : 'Depois', () => {
          this.app.pet.emit('desktopGameNo', { name: c.game.name });
          this.app.desktopGames?.closeBubble?.();
          this.leave();
        });
      }
    }
    bubble.addEventListener('pointerdown', (e) => e.stopPropagation());
    document.body.append(bubble);
    const hit = document.createElement('div');
    hit.className = 'cu-hit hitzone';
    hit.title = en ? 'Click: cafuné' : 'Clique: cafuné';
    hit.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      if (e.button === 0) this.pat();
    });
    hit.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
    document.body.append(hit);
    c.bubble = bubble;
    c.hit = hit;
    c.els.push(bubble, hit);
    c.shown = 0;
    c.typeT = 0;
    this.layout();
    this.app.uiChanged?.();
  }

  typeText(dt) {
    const c = this.cur;
    const p = c.bubble?.querySelector('p');
    if (!p || c.shown >= c.text.length) return;
    c.typeT += dt;
    const n = Math.min(c.text.length, Math.floor(c.typeT * 26));
    for (let i = c.shown; i < n; i++) if (/\S/.test(c.text[i])) this.app.sound.speak(c.text[i]);
    c.shown = n;
    p.textContent = c.text.slice(0, n);
    this.app.view.setMouth?.(n < c.text.length ? 0.5 + 0.5 * Math.sin(c.typeT * 30) : 0);
  }

  layout() {
    const c = this.cur;
    if (!c?.f) return;
    const hd = this.headAt();
    if (c.hit) {
      const w = hd.w;
      Object.assign(c.hit.style, { left: `${Math.round(hd.x - w / 2)}px`, top: `${Math.round(Math.max(0, hd.top))}px`, width: `${Math.round(w)}px`, height: `${Math.round(Math.max(0, innerHeight - hd.top))}px` });
    }
    if (c.bubble) {
      const b = c.bubble;
      const bw = b.offsetWidth;
      const right = hd.x + hd.w * 0.6;
      const x = right + bw + 8 < innerWidth ? right : Math.max(8, hd.x - hd.w * 0.6 - bw);
      b.style.left = `${Math.round(x)}px`;
      b.style.top = `${Math.round(clamp(hd.top + hd.w * 0.15, 8, innerHeight - b.offsetHeight - 8))}px`;
      b.classList.toggle('flip', x < hd.x);
    }
  }

  pat() {
    const c = this.cur;
    if (!c || c.phase !== 'talk') return;
    const { pet, sound, game } = this.app;
    c.kn = null;
    if (pet.toyPlay) pet.toyPlay.armPose = null;
    c.bubble?.remove();
    c.bubble = null;
    this.app.view.setMouth?.(0);
    pet.adjust({ mood: 6, affection: 2 }, 'cafuné');
    game.profile.pats = (game.profile.pats || 0) + 1;
    game.dirty = true;
    this.app.view.setExpression?.('pet');
    pet.anim(pet.pickClip(['emote_pos'], ['idle']), { facing: 'front', restart: true });
    sound.voice(3);
    const hand = document.createElement('div');
    hand.className = 'cu-hand';
    hand.innerHTML = `<img src="${icon('hand')}" draggable="false">`;
    document.body.append(hand);
    c.hand = hand;
    c.els.push(hand);
    c.heartT = 0;
    this.phase('pat');
    this.app.uiChanged?.();
  }

  patHand() {
    const c = this.cur;
    if (!c.hand) return;
    const hd = this.headAt();
    const s = hd.w * 0.55;
    const rub = Math.sin(c.t * 12) * hd.w * 0.12;
    c.hand.style.width = `${Math.round(s)}px`;
    c.hand.style.transform = `translate(${Math.round(hd.x - s / 2 + rub)}px, ${Math.round(hd.top - s * 0.45)}px) rotate(${Math.sin(c.t * 12) * 8}deg) scaleY(-1)`;
    c.heartT -= 1 / 60;
    if (c.heartT <= 0) {
      c.heartT = 0.3;
      const h = document.createElement('div');
      h.className = 'cu-heart';
      h.textContent = pick(['💗', '💕']);
      h.style.left = `${Math.round(hd.x + rand(-0.6, 0.6) * hd.w)}px`;
      h.style.top = `${Math.round(hd.top + rand(0, 0.3) * hd.w)}px`;
      document.body.append(h);
      setTimeout(() => h.remove(), 1200);
      if (Math.random() < 0.5) this.app.sound.play('blip', { volume: 0.3, rate: 1.3 });
    }
  }

  leave() {
    const c = this.cur;
    if (!c || c.phase === 'drop' || c.phase === 'back') return;
    c.kn = null;
    if (this.app.pet.toyPlay) this.app.pet.toyPlay.armPose = null;
    if (c.kind === 'desktopGame' && c.game) this.app.desktopGames?.flyBack?.(c.game);
    this.app.desktopGames?.closeBubble?.();
    this.removeEls();
    this.app.view.setMouth?.(0);
    this.app.sound.sfx('whoosh', 0.8);
    this.phase('drop');
    this.app.uiChanged?.();
  }
}
