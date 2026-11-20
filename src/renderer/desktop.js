// Game shortcuts on the desktop: now and then the pet notices one, gets curious, goes to it
// (walking, jumping or climbing up the wallpaper, or reeling it in with the grappling hook), takes
// a copy of the icon and shows it to the player, suggesting a match.
import { icon } from './pixel.js';
import { dollReact } from './watch.js';
import { isFocus } from './focusmode.js';

const rand = (a, b) => a + Math.random() * (b - a);

export class DesktopGames {
  constructor(app) {
    this.app = app;
    this.wait = rand(90, 180);
    this.task = null;
    this.bubble = null;
    this.ghost = null;
    this.scanning = false;
  }

  get enabled() {
    const c = this.app.config;
    return c.desktopGames !== false && !isFocus(c, this.app) && !c.streamer && !!window.petAPI?.desktopIcons;
  }

  ready() {
    const p = this.app.pet;
    return !p.dead && !p.paused && !p.leaving && !p.chase && !p.activity && !p.toyPlay && !p.hook && !p.eating && !p.meals.length
      && !p.ballPlay && p.mode === 'ground' && p.surfaceId === 'floor' && ['walk', 'idle', 'sit', 'emote'].includes(p.action)
      && p.stats.energy > 20;
  }

  // Debug button: looks right now.
  trigger() {
    this.wait = 0;
    this.force = true;
  }

  async scan() {
    this.scanning = true;
    let list = [];
    try {
      list = (await window.petAPI.desktopIcons()) || [];
    } catch {}
    this.scanning = false;
    const s = devicePixelRatio || 1;
    const wins = [...this.app.world.windows.values()];
    const games = list.filter((d) => d.game)
      .map((d) => ({ ...d, x: d.x / s, y: d.y / s, w: d.w / s, h: d.h / s }))
      .filter((d) => d.y + d.h < this.app.world.height && !wins.some((w) => w.x < d.x + d.w && w.right > d.x && w.y < d.y + d.h && w.bottom > d.y));
    if (!games.length || !this.ready()) return;
    this.notice(games[Math.floor(Math.random() * games.length)]);
  }

  // Curiosity first: stops, turns to the icon, a "?" and a little lean, then goes.
  notice(g) {
    const { pet, toys } = this.app;
    const P = pet.P;
    const cx = g.x + g.w / 2;
    this.task = { g, t: 0, phase: 'curious' };
    pet.dir = cx >= pet.x ? 1 : -1;
    pet.emit('desktopCurious', { name: g.name });
    toys.furn.floatText(pet.x, pet.y - P * 1.2, '❓');
    pet.playToy({
      id: 'curious', dur: 2.2, anim: pet.pickClip(['olhar', 'curioso'], ['idle']), facing: pet.side(),
      tick: (dt, tp) => {
        pet.tilt = Math.sin(Math.min(1, tp.t / 0.6) * Math.PI * 0.5) * 0.12 * pet.dir;
        pet.tiltPivot = { x: 0, y: 0 };
        if (tp.t > 1.3 && !tp.bang) {
          tp.bang = true;
          toys.furn.floatText(pet.x, pet.y - P * 1.25, '❗');
          this.app.sound.tone8(700, 1100, 0.07, 'square', 0.05);
        }
      },
      onEnd: (interrupted) => {
        pet.tilt = 0;
        if (interrupted) this.task = null;
        else this.task.phase = 'go';
      },
    });
  }

  visit(g) {
    const { pet, world } = this.app;
    const P = pet.P;
    const cx = g.x + g.w / 2;
    const cy = g.y + g.h / 2;
    this.task = { g, t: 0, phase: 'visit' };
    if (pet.gear.gancho && Math.random() < 0.4) {
      const x = Math.min(Math.max(cx + P * 1.6, P * 0.4), world.width - P * 0.4);
      if (pet.goTo(x, () => this.pull(g))) return;
    }
    // Next to the icon (on the side with room), hands at its height.
    const right = cx + g.w / 2 + P * 0.3 < world.width - P * 0.3;
    const x = right ? cx + g.w / 2 + P * 0.25 : cx - g.w / 2 - P * 0.25;
    const feet = cy + P * 0.6;
    const rise = world.height - feet;
    const ok = pet.goTo(x, () => {
      pet.dir = cx >= pet.x ? 1 : -1;
      if (rise < P * 0.25) return this.grab(g);
      if (rise <= pet.maxJump()) {
        this.task.apex = true;
        pet.emit('hop');
        return pet.fall(0, -Math.sqrt(2 * pet.gravity * rise));
      }
      if (!pet.scaleTo(feet, () => this.grab(g), 1.2)) this.task = null;
    }, Math.abs(x - pet.x) > P * 4);
    if (!ok) this.task = null;
  }

  ghostEl(g) {
    this.ghost?.remove();
    const el = document.createElement('img');
    el.className = 'dg-ghost';
    el.src = g.icon || icon('joystick');
    el.draggable = false;
    el.style.width = `${Math.max(24, g.h * 0.9)}px`;
    document.body.append(el);
    this.ghost = el;
    return el;
  }

  placeGhost(x, y) {
    const el = this.ghost;
    if (!el) return;
    const s = el.offsetWidth || 32;
    el.style.transform = `translate(${Math.round(x - s / 2)}px, ${Math.round(y - s / 2)}px)`;
  }

  // Takes a copy of the icon: it pops out of the desktop into her hands and stays there.
  grab(g) {
    const { pet } = this.app;
    this.ghostEl(g);
    this.placeGhost(g.x + g.w / 2, g.y + g.h / 2);
    this.app.sound.tone8(500, 900, 0.06, 'square', 0.05);
    pet.emit('desktopGrab', { name: g.name });
    if (this.task) {
      this.task.carry = true;
      this.task.carryT = 0;
    }
  }

  // Grappling hook: a copy of the icon comes flying down into the pet's hands.
  pull(g) {
    const { pet } = this.app;
    this.ghostEl(g);
    const target = {
      x: g.x + g.w / 2,
      y: g.y + g.h / 2,
      move: (x, y) => {
        target.x = x;
        target.y = y;
        this.placeGhost(x, y);
      },
      done: () => this.show(g),
    };
    this.placeGhost(target.x, target.y);
    if (!pet.fireHook(target.x, target.y, 'pull', target)) this.show(g);
  }

  // Approaches the screen like a reminder, holding the desktop icon.
  show(g) {
    const { pet } = this.app;
    if (this.ghost) this.ghost.style.display = 'none';
    this.task = null;
    this.pendingFly = g;
    dollReact(this.app, '🎮', 'cheer', 2);
    if (this.app.closeup && !pet.closeup) this.app.closeup.startGame(g);
    else this.recommend(g);
  }

  flyBack(g) {
    const el = this.ghost;
    if (!el) return;
    const { pet } = this.app;
    const s = el.offsetWidth || 32;
    el.style.display = 'block';
    el.style.transition = 'none';
    this.placeGhost(pet.x, pet.y - pet.P * 0.7);
    void el.offsetWidth;
    el.style.transition = 'transform 0.7s ease-in, opacity 0.7s ease-in';
    el.style.transform = `translate(${Math.round(g.x + g.w / 2 - s / 2)}px, ${Math.round(g.y + g.h / 2 - s / 2)}px)`;
    el.style.opacity = '0.2';
    setTimeout(() => el.remove(), 800);
    this.ghost = null;
  }

  recommend(g) {
    const { app } = this;
    this.closeBubble();
    const en = app.config.lang === 'en';
    app.pet.emit('desktopGame', { name: g.name });
    const el = document.createElement('div');
    el.className = 'dg-bubble hitzone';
    const text = document.createElement('div');
    text.textContent = `🎮 ${g.name}`;
    const row = document.createElement('div');
    row.className = 'dg-row';
    const play = document.createElement('button');
    play.textContent = en ? '▶ Play' : '▶ Jogar';
    play.onclick = () => {
      window.petAPI.openDesktopItem(g.path).catch(() => {});
      app.sound?.play('ok');
      app.pet.emit('desktopGamePlay', { name: g.name });
      this.closeBubble();
    };
    const no = document.createElement('button');
    no.textContent = en ? 'Later' : 'Depois';
    no.onclick = () => {
      app.pet.emit('desktopGameNo', { name: g.name });
      this.closeBubble();
    };
    row.append(play, no);
    el.append(text, row);
    document.body.append(el);
    this.bubble = { el, life: 14 };
    this.placeBubble();
    app.uiChanged?.();
  }

  // Next to the pet, who is holding the icon up.
  placeBubble() {
    const b = this.bubble;
    if (!b) return;
    const { pet } = this.app;
    const r = b.el.getBoundingClientRect();
    const P = pet.P;
    let x = pet.x + P * 0.45;
    if (x + r.width > innerWidth - 4) x = pet.x - P * 0.45 - r.width;
    const y = Math.min(Math.max(4, pet.y - P * 1.05 - r.height), innerHeight - r.height - 4);
    b.el.style.transform = `translate(${Math.round(Math.max(4, x))}px, ${Math.round(y)}px)`;
  }

  closeBubble() {
    if (!this.bubble) return;
    this.bubble.el.remove();
    this.bubble = null;
    this.app.uiChanged?.();
  }

  update(dt) {
    const { pet } = this.app;
    if (this.bubble) {
      if ((this.bubble.life -= dt) <= 0) this.closeBubble();
      else this.placeBubble();
    }
    const task = this.task;
    if (task) {
      task.t += dt;
      if (task.phase === 'go' && pet.mode === 'ground' && pet.toyPlay?.id !== 'curious') {
        task.phase = 'visit';
        this.visit(task.g);
        return;
      }
      // Jump: grabs the icon at the top of the jump.
      if (task.apex && pet.mode === 'air' && pet.vy >= 0) {
        task.apex = false;
        this.grab(task.g);
      }
      // Carrying the copy down (climbing or falling): it follows her hands; shown once on the floor.
      if (task.carry) {
        task.carryT += dt;
        const u = Math.min(1, task.carryT / 0.35);
        const g = task.g;
        const hx = pet.x + pet.dir * pet.P * 0.15;
        const hy = pet.y - pet.P * 0.6;
        this.placeGhost(g.x + g.w / 2 + (hx - g.x - g.w / 2) * u, g.y + g.h / 2 + (hy - g.y - g.h / 2) * u);
        if (pet.mode === 'ground' && task.carryT > 0.35) return this.show(g);
      }
      if (task.t > 40 || pet.mode === 'held' || pet.dead || pet.chase) {
        if (this.ghost && !pet.toyPlay) {
          this.ghost.remove();
          this.ghost = null;
        }
        this.task = null;
      }
      return;
    }
    if (this.scanning || (this.wait -= dt) > 0) return;
    if (!this.enabled && !this.force) {
      this.wait = 60;
      return;
    }
    this.force = false;
    if (!this.ready()) {
      this.wait = 20;
      return;
    }
    this.wait = rand(240, 540);
    this.scan();
  }
}
