// Modo Foco (Pomodoro): the Persocon and the Doll keep the user company through focus sessions.
// No extra coins are ever granted here — rewards are affection, mood and attribute XP only.
import { dollReact } from './watch.js';
import { setRuntimeFocus } from './focusmode.js';
import { ATTR_XP } from './attrxp.js';

const PRESETS = {
  '25/5': { focus: 25, break: 5 },
  '50/10': { focus: 50, break: 10 },
};

const clock = (sec) => `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;

export class Pomodoro {
  constructor(app) {
    this.app = app;
    this.active = false;
    this.paused = false;
    this.phase = null; // 'focus' | 'break'
    this.preset = '25/5';
    this.left = 0;
    this.endsAt = 0;
    this.savedPaused = false;
    this.credited = false;
    this.deskKey = null;
    this.deskUp = false;
  }

  // Only the focus block suppresses distractions; the break is a normal, relaxed interval.
  get focusing() {
    return this.active && this.phase === 'focus';
  }

  // Short label for the status dock (glyph is added there, from PxEmoji).
  get label() {
    if (!this.active) return null;
    const en = this.app.config.lang === 'en';
    const name = this.phase === 'break' ? (en ? 'Break' : 'Pausa') : (en ? 'Focus' : 'Foco');
    const t = this.paused ? this.left : Math.max(0, Math.ceil((this.endsAt - Date.now()) / 1000));
    return `${name} ${clock(t)}`;
  }

  start(preset = this.preset) {
    const { app } = this;
    if (this.active) this.cancel(true);
    this.preset = PRESETS[preset] ? preset : '25/5';
    this.active = true;
    this.paused = false;
    this.credited = false;
    // Reuse the existing Focus Mode switches through a runtime-only flag (never saved).
    this.savedPaused = !!app.pet?.paused;
    setRuntimeFocus(app.config, true);
    // If a desk is placed, study there and light its lamp for the whole session.
    const desk = Object.entries(app.game?.toys || {}).find(([key, t]) => key.split('#')[0] === 'escrivaninha' && t.placed && !t.broken);
    this.deskKey = desk?.[0] ?? null;
    this.deskUp = !!desk?.[1]?.up;
    if (desk) desk[1].lampOn = true;
    app.antics?.stop?.(false);
    const settle = () => {
      if (!this.savedPaused && !app.pet?.paused) app.pet?.pause?.();
      if (app.pet?.mode === 'ground') app.pet?.startGround?.('sit');
    };
    if (desk && !app.pet?.goTo?.(desk[1].x, settle)) settle();
    else settle();
    app.doll?.brain?.focusPose?.(true);
    this.begin('focus');
    app.sound?.sfx?.('ding');
    app.speech?.say(
      app.config.lang === 'en' ? 'I will focus with you. Breathe easy — I am right here.' : 'Vou focar com você. Respira fundo, tô bem aqui.',
      4,
    );
    this.changed();
  }

  begin(phase) {
    this.phase = phase;
    const minutes = PRESETS[this.preset][phase];
    this.left = minutes * 60;
    this.endsAt = Date.now() + this.left * 1000;
  }

  pause() {
    if (!this.active || this.paused) return;
    this.left = Math.max(0, Math.ceil((this.endsAt - Date.now()) / 1000));
    this.paused = true;
    this.app.sound?.play?.('ok', { volume: 0.4 });
    this.changed();
  }

  resume() {
    if (!this.active || !this.paused) return;
    this.endsAt = Date.now() + this.left * 1000;
    this.paused = false;
    this.app.sound?.play?.('ok', { volume: 0.4 });
    this.changed();
  }

  toggle() {
    if (!this.active) return this.start();
    if (this.paused) this.resume();
    else this.pause();
  }

  cancel(quiet = false) {
    if (!this.active) return;
    const { app } = this;
    this.active = false;
    this.paused = false;
    this.phase = null;
    setRuntimeFocus(app.config, false);
    if (this.deskKey && app.game?.toys?.[this.deskKey]) app.game.toys[this.deskKey].lampOn = false;
    this.deskKey = null;
    this.deskUp = false;
    if (!this.savedPaused) app.pet?.resume?.();
    app.doll?.brain?.focusPose?.(false);
    if (!quiet) {
      app.sound?.play?.('cancel', { volume: 0.5 });
      app.speech?.say(app.config.lang === 'en' ? 'Focus mode over. Good work!' : 'Fim do foco. Bom trabalho!', 3);
    }
    this.changed();
  }

  // Called every frame from the main loop.
  update(dt = 0) {
    if (!this.active || this.paused) return;
    // Neon desk: energy recovers while she studies or takes her break there.
    if (this.deskUp && this.deskKey) {
      const rate = this.phase === 'break' ? 0.25 : 0.12;
      this.app.pet?.adjust?.({ energy: rate * Math.max(0, dt) }, 'escrivaninha');
    }
    const left = Math.max(0, Math.ceil((this.endsAt - Date.now()) / 1000));
    if (left !== this.left) {
      this.left = left;
      this.app.dock?.invalidate?.();
    }
    if (left > 0) return;
    if (this.phase === 'focus') {
      // The interval is not "focus": let her move and celebrate before the reward.
      setRuntimeFocus(this.app.config, false);
      if (!this.savedPaused) this.app.pet?.resume?.();
      this.app.doll?.brain?.focusPose?.(false);
      this.begin('break');
      this.reward();
      this.coffeeBreak();
      this.app.speech?.say(
        this.app.config.lang === 'en' ? 'Session done! Drink some water and rest your eyes.' : 'Sessão concluída! Beba água e descanse os olhos.',
        4.5,
      );
    } else {
      this.cancel(true);
      this.app.speech?.say(
        this.app.config.lang === 'en' ? 'Break over — ready when you are!' : 'Pausa acabada — quando quiser, continuamos!',
        4,
      );
    }
    this.changed();
  }

  // Focus completion: affection, mood and Constitution XP. NEVER coins.
  reward() {
    if (this.credited) return;
    this.credited = true;
    const { app } = this;
    app.pet?.adjust?.({ mood: 8, affection: 2 }, 'foco');
    app.game?.attrAdd?.('con', 4, 'Foco');
    if (this.deskKey) {
      const amount = Math.round(ATTR_XP.int.focus * (this.deskUp ? 1.5 : 1));
      app.game?.attrAdd?.('int', amount, 'Foco');
    }
    app.sound?.sfx?.('chime');
    app.pet?.react?.('cheer');
    dollReact(app, '🎉', 'cheer', 2.6);
  }

  // A coffee break: if a Cafeteira is placed, she buys a drink with her own wallet.
  coffeeBreak() {
    const app = this.app;
    const station = Object.entries(app.game?.toys || {}).find(([key, t]) => key.split('#')[0] === 'cafeteira' && t.placed && !t.broken);
    if (!station) return;
    app.casino?.vend?.click?.('cafeteira', station[1].x, station[1].y, () => {}, () => {});
  }

  changed() {
    this.app.dock?.invalidate?.();
    this.app.uiChanged?.();
  }
}

export { PRESETS as FOCUS_PRESETS };
