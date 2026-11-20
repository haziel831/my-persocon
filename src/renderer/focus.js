// Modo Foco (Pomodoro): the Persocon and the Doll keep the user company through focus sessions.
// No extra coins are ever granted here — rewards are affection, mood and attribute XP only.
import { dollReact } from './watch.js';

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
    this.savedFocus = false;
    this.savedPaused = false;
    this.credited = false;
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
    // Reuse the existing Focus Mode switches (requests, desktop mischief, idle chatter...).
    this.savedFocus = !!app.config.focus;
    this.savedPaused = !!app.pet?.paused;
    app.config.focus = true;
    app.antics?.stop?.(false);
    if (!app.pet?.paused) app.pet?.pause?.();
    if (app.pet?.mode === 'ground') app.pet?.startGround?.('sit');
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
    app.config.focus = this.savedFocus;
    if (!this.savedPaused) app.pet?.resume?.();
    app.doll?.brain?.focusPose?.(false);
    if (!quiet) {
      app.sound?.play?.('cancel', { volume: 0.5 });
      app.speech?.say(app.config.lang === 'en' ? 'Focus mode over. Good work!' : 'Fim do foco. Bom trabalho!', 3);
    }
    this.changed();
  }

  // Called every frame from the main loop.
  update() {
    if (!this.active || this.paused) return;
    const left = Math.max(0, Math.ceil((this.endsAt - Date.now()) / 1000));
    if (left !== this.left) {
      this.left = left;
      this.app.dock?.invalidate?.();
    }
    if (left > 0) return;
    if (this.phase === 'focus') {
      this.reward();
      this.begin('break');
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
    app.sound?.sfx?.('chime');
    app.pet?.react?.('cheer');
    dollReact(app, '🎉', 'cheer', 2.6);
  }

  changed() {
    this.app.dock?.invalidate?.();
    this.app.uiChanged?.();
  }
}

export { PRESETS as FOCUS_PRESETS };
