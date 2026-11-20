// Offline ambient weather over the desktop: one lightweight canvas, a few dozen particles.
// No internet, no external textures; falls back to a hard stop when hidden or fullscreen.
import { icon } from './pixel.js';
import { dayPeriod } from './watch.js';

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (l) => l[Math.floor(Math.random() * l.length)];
const DURATION = { chuva: [120, 240], sakura: [120, 240], vagalumes: [120, 240], neve: [120, 240] };

export class Weather {
  constructor(app) {
    this.app = app;
    this.mode = null;
    this.until = 0;
    this.nextAt = Date.now() + rand(300, 900) * 1000; // no event right after launch
    this.parts = [];
    this.reactAt = 0;
    this.umbrella = null;

    const canvas = document.createElement('canvas');
    Object.assign(canvas.style, { position: 'fixed', inset: '0', width: '100%', height: '100%', pointerEvents: 'none', zIndex: '12', display: 'none' });
    document.body.append(canvas);
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
  }

  get active() {
    return this.mode;
  }

  stop() {
    this.mode = null;
    this.parts.length = 0;
    this.canvas.style.display = 'none';
    this.canvas.width = this.canvas.height = 0;
    if (this.umbrella) this.umbrella.style.display = 'none';
  }

  start(mode) {
    this.mode = mode;
    const [a, b] = DURATION[mode];
    this.until = Date.now() + rand(a, b) * 1000;
    const count = Math.round(rand(25, 45));
    const W = this.app.world?.width || innerWidth;
    const H = this.app.world?.height || innerHeight;
    this.parts = Array.from({ length: count }, () => this.spawn(W, H, true));
    this.canvas.width = W;
    this.canvas.height = H;
    this.canvas.style.display = 'block';
    if (mode !== 'vagalumes') this.say(mode, true);
  }

  spawn(W, H, initial = false) {
    const p = {
      x: rand(0, W),
      y: initial ? rand(0, H) : rand(-40, -4),
      size: rand(2, 5),
      phase: rand(0, Math.PI * 2),
      sway: rand(0.4, 1.4),
    };
    if (this.mode === 'chuva') { p.vx = rand(-40, -15); p.vy = rand(280, 460); p.size = rand(8, 16); }
    else if (this.mode === 'neve') { p.vx = rand(-12, 12); p.vy = rand(18, 42); }
    else if (this.mode === 'sakura') { p.vx = rand(-16, 10); p.vy = rand(22, 48); }
    else { p.vx = rand(-8, 8); p.vy = rand(-6, 6); p.size = rand(2, 4); }
    return p;
  }

  draw(dt, W, H) {
    const g = this.ctx;
    g.clearRect(0, 0, W, H);
    const t = performance.now() / 1000;
    for (const p of this.parts) {
      p.phase += dt * p.sway;
      p.x += (p.vx + Math.sin(p.phase) * (this.mode === 'neve' || this.mode === 'sakura' ? 14 : 4)) * dt;
      p.y += p.vy * dt;
      if (p.y > H + 20 || p.x < -30 || p.x > W + 30) Object.assign(p, this.spawn(W, H));
      if (this.mode === 'chuva') {
        g.strokeStyle = 'rgba(150,195,255,0.35)';
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(p.x, p.y);
        g.lineTo(p.x - p.size * 0.3, p.y + p.size);
        g.stroke();
      } else if (this.mode === 'neve') {
        g.fillStyle = 'rgba(255,255,255,0.8)';
        g.beginPath(); g.arc(p.x, p.y, p.size * 0.6, 0, Math.PI * 2); g.fill();
      } else if (this.mode === 'sakura') {
        g.fillStyle = pick(['rgba(255,183,213,0.85)', 'rgba(255,214,232,0.8)', 'rgba(255,158,200,0.8)']);
        g.fillRect(p.x, p.y, p.size, p.size * 0.7);
      } else {
        const glow = 0.35 + 0.35 * Math.sin(t * 2.4 + p.phase);
        g.fillStyle = `rgba(190,255,120,${glow.toFixed(2)})`;
        g.beginPath(); g.arc(p.x, p.y, p.size, 0, Math.PI * 2); g.fill();
      }
    }
  }

  // Occasionally reach for a nearby firefly, or comment on petals/snow.
  react(dt, hidden) {
    if (hidden || performance.now() < this.reactAt) return;
    this.reactAt = performance.now() + rand(18, 45) * 1000;
    const pet = this.app.pet;
    if (pet.dead || pet.combatMode || pet.toyPlay || pet.activity || pet.chase || pet.paused) return;
    if (this.mode === 'vagalumes') {
      const head = this.app.head || { x: pet.x, y: pet.y - pet.P };
      const near = this.parts.find((p) => Math.hypot(p.x - head.x, p.y - head.y) < pet.P * 1.6);
      if (near && pet.mode === 'ground') {
        pet.dir = near.x >= pet.x ? 1 : -1;
        pet.startGround('hop');
      }
    } else if (this.mode === 'sakura' || this.mode === 'neve') {
      if (Math.random() < 0.6) this.app.emoticons?.show?.(this.mode === 'neve' ? 'star' : 'love', true);
      this.say(this.mode);
    }
  }

  say(mode, force = false) {
    const en = this.app.config.lang === 'en';
    const lines = {
      chuva: ['Chuva leve... boa hora para ficar quietinha.', 'Light rain... a good time to stay cozy.'],
      sakura: ['Olha as pétalas! Tão lindas!', 'Look at the petals! So pretty!'],
      neve: ['Neve! Posso pegar um floco?', 'Snow! Can I catch a flake?'],
      vagalumes: ['Tem vagalumes por perto...', 'There are fireflies nearby...'],
    }[mode];
    if (!lines) return;
    if (!force && Math.random() > 0.5) return;
    this.app.speech?.say(en ? lines[1] : lines[0], 3.5);
  }

  update(dt, hidden, fullscreen) {
    const cfg = this.app.config.weather || 'auto';
    if (hidden || fullscreen || cfg === 'off') {
      if (this.mode) this.stop();
      else this.canvas.style.display = 'none';
      if (this.umbrella) this.umbrella.style.display = 'none';
      return;
    }
    const now = Date.now();
    if (cfg !== 'auto') {
      if (this.mode !== cfg) this.start(cfg);
    } else if (this.mode) {
      if (now > this.until) {
        this.stop();
        this.nextAt = now + rand(480, 900) * 1000;
      }
    } else if (now > this.nextAt) {
      const night = ['noite', 'madrugada'].includes(dayPeriod());
      const choices = night ? ['chuva', 'sakura', 'neve', 'vagalumes'] : ['chuva', 'sakura', 'neve'];
      this.start(pick(choices));
    }
    if (!this.mode) return;
    const W = this.app.world?.width || innerWidth;
    const H = this.app.world?.height || innerHeight;
    if (this.canvas.width !== W || this.canvas.height !== H) {
      this.canvas.width = W;
      this.canvas.height = H;
    }
    this.draw(dt, W, H);
    this.react(dt, hidden);

    // Pixel umbrella above her head while it rains.
    if (this.mode === 'chuva') {
      if (!this.umbrella) {
        this.umbrella = document.createElement('img');
        this.umbrella.src = icon('umbrella');
        this.umbrella.alt = '';
        Object.assign(this.umbrella.style, { position: 'fixed', pointerEvents: 'none', zIndex: '13', width: '36px', height: '20px' });
        document.body.append(this.umbrella);
      }
      const head = this.app.head || { x: this.app.pet?.x || 0, y: (this.app.pet?.y || 0) - 60 };
      this.umbrella.style.display = 'block';
      this.umbrella.style.left = `${Math.round(head.x - 18)}px`;
      this.umbrella.style.top = `${Math.round(head.y - 34)}px`;
    } else if (this.umbrella) this.umbrella.style.display = 'none';
  }
}
