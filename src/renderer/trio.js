// Rare cooperative scenes with the Persocon, the Doll and the Crow.
// Everything is cancelled cleanly if the player grabs her, a fight starts or focus mode turns on.
import { dollReact } from './watch.js';
import { icon } from './pixel.js';

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (l) => l[Math.floor(Math.random() * l.length)];
const clamp = (v, a, b) => Math.min(Math.max(v, a), b);
const COOLDOWN = [15, 25]; // minutes between scenes

export class Trio {
  constructor(app) {
    this.app = app;
    this.active = null;
    this.scene = null;
    this.t = 0;
    this.nextAt = Date.now() + rand(...COOLDOWN) * 60000;
  }

  get ready() {
    const { app } = this;
    const p = app.pet;
    return !this.active && p && !p.dead && p.mode !== 'held' && !p.combatMode && !app.melee?.active
      && !app.pomodoro?.active && !app.config.anticsOff && !app.minigames?.active && !app.gameOver
      && !document.body.classList.contains('app-hidden')
      && app.doll?.alive && app.crow?.owned && !app.crow.away && !app.crow.leaving;
  }

  // Same checks, without the cooldown: used to abort a scene already in progress.
  stillValid() {
    const { app } = this;
    const p = app.pet;
    return !!p && !p.dead && p.mode !== 'held' && !p.combatMode && !app.melee?.active
      && !app.pomodoro?.active && !app.config.anticsOff && app.doll?.alive
      && app.crow?.owned && !app.crow.away && !app.crow.leaving;
  }

  finish() {
    const { app } = this;
    if (app.crow?.fetching) app.crow.fetching = false;
    if (app.crow?.carry?.length) app.crow.carry = [];
    this.active = null;
    this.scene = null;
    this.t = 0;
    this.nextAt = Date.now() + rand(...COOLDOWN) * 60000;
  }

  cancel(quiet = false) {
    if (!this.active) return;
    const { app } = this;
    app.crow?.idle?.();
    if (!quiet) app.pet?.emit?.('trioCancel');
    this.finish();
  }

  update(dt) {
    if (this.active) {
      if (!this.stillValid()) return this.cancel(true);
      this.t += dt;
      if (this.t > 50) return this.cancel(true);
      if (this.active === 'rhythm') this.rhythmTick(dt);
      return;
    }
    if (!this.ready || Date.now() < this.nextAt) return;
    // Once the long cooldown is over, a theft is still a rare surprise.
    if (Math.random() < dt * 0.02) this.startTheft();
  }

  // Called by Modes.start('jam') — a small chance to sync all three to the beat.
  jamStarted() {
    if (this.active || !this.ready) return;
    if (Math.random() < 0.22) this.startRhythm();
  }

  startTheft() {
    const { app } = this;
    const p = app.pet;
    const dir = p.dir || 1;
    const scene = this.scene = {
      kind: 'theft',
      item: icon(pick(['bola', 'ioio', 'bolhas', 'aviao'])),
    };
    this.active = 'theft';
    this.t = 0;
    app.crow.fetching = true;
    p.emit('trioStart', { kind: 'theft' });
    app.emoticons?.show?.('surprise', true);
    const crow = app.crow;
    const P = app.pet.P;
    crow.flyTo(() => ({ x: clamp(p.x + dir * P * 1.6, P, app.world.width - P), y: crow.floorY() }), () => {
      if (this.active !== 'theft') return;
      crow.carry.push(scene.item);
      app.doll?.brain?.say?.(pick(['❗', '😮', '💨']), 2);
      app.emoticons?.show?.('surprise', true);
      if (p.mode === 'ground') p.startGround('run');
      dollReact(app, '💨', 'dance', 3);
      crow.flyTo(() => ({ x: clamp(p.x - dir * P * 5, P, app.world.width - P), y: crow.floorY() - P * 1.2 }), () => {
        if (this.active !== 'theft') return;
        app.emoticons?.show?.('happy', true);
        crow.flyTo(() => ({ x: clamp(p.x + dir * P * 0.6, P, app.world.width - P), y: crow.floorY() }), () => {
          if (this.active !== 'theft') return;
          crow.carry = [];
          crow.fetching = false;
          p.react?.('cheer');
          p.adjust?.({ mood: 8, affection: 2 }, 'trio');
          dollReact(app, '🎉', 'clap', 2.5);
          p.emit('trioEnd', { kind: 'theft' });
          this.finish();
        }, 4.6);
      }, 3.2);
    }, 4.2);
  }

  startRhythm() {
    const { app } = this;
    this.active = 'rhythm';
    this.scene = { kind: 'rhythm', beat: 0 };
    this.t = 0;
    app.crow.fetching = true;
    app.pet.emit('trioRhythm');
    app.emoticons?.show?.('happy', true);
    dollReact(app, '🎵', 'dance', 9);
    const crow = app.crow;
    crow.flyTo(() => {
      const P = app.pet.P;
      const y = (app.head?.y ?? app.pet.y - P) - P * 0.8;
      return { x: app.pet.x + Math.sin(this.t * 3.2) * P * 1.1, y };
    }, () => {}, 3.6);
  }

  rhythmTick(dt) {
    const s = this.scene;
    if (!s) return;
    if (this.t - s.beat > 1.1) {
      s.beat = this.t;
      dollReact(this.app, '🎵', 'clap', 0.9);
      this.app.sound?.tone8?.(660, 880, 0.09, 'square', 0.05);
    }
    if (this.t > 9) {
      const p = this.app.pet;
      p.emit('trioEnd', { kind: 'rhythm' });
      p.adjust?.({ mood: 5, affection: 1 }, 'trio');
      this.app.crow?.idle?.();
      this.finish();
    }
  }
}
