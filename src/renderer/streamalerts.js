// Local bridge alert queue: batches follows and reacts with speech, VFX and helpers.
import { personaLine } from './persona.js';

export class StreamAlerts {
  constructor(app) {
    this.app = app;
    this.queue = [];
    this.follows = [];
    this.timer = null;
  }

  push(event) {
    if (!event || !event.type) return;
    if (event.type === 'follow') {
      const user = this.app ? String(event.user || 'alguém').replace(/[<>&"']/g, '').slice(0, 40) : 'alguém';
      this.follows.push(user);
      this.app?.rememberFollower?.(user);
      this.flushSoon();
      return;
    }
    if (event.follower === true) this.app?.rememberFollower?.(event.user);
    this.queue.push(event);
    if (this.queue.length > 6) this.queue.shift();
    this.flushSoon();
  }

  flushSoon() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush(), 350);
  }

  flush() {
    if (this.follows.length) {
      const names = this.follows;
      this.follows = [];
      const who = names.length === 1 ? names[0] : `${names[0]} e mais ${names.length - 1}`;
      this.react({ type: 'follow', user: who });
    }
    while (this.queue.length) this.react(this.queue.shift());
  }

  redeem(ev) {
    const app = this.app;
    const map = app.config.streamRedeems || {};
    const name = String(ev.reward || '').trim();
    const cfg = map[name] || { action: 'moedas', coins: 25 };
    const text = String(ev.text || '').replace(/[<>&"']/g, '').trim().slice(0, 80);
    const blocked = String(app.config.streamBlockedWords || '').toLowerCase().split(',').map((s) => s.trim()).filter(Boolean);
    if (blocked.some((w) => text.toLowerCase().includes(w))) return;
    const user = String(ev.user || 'alguém').replace(/[<>&"']/g, '').slice(0, 40);
    const coins = Number(cfg.coins || 0);
    switch (cfg.action) {
      case 'moedas':
        app.game.earn(coins, 'Pontos do canal');
        app.speech?.say(personaLine(app, 'coins', { user, coins }), 3, { priority: true });
        break;
      case 'sky_drop':
        app.toys?.skyDrop?.(cfg.item || 'maca', { fromUser: false });
        app.speech?.say(personaLine(app, 'drop', { user }), 3, { priority: true });
        break;
      case 'mural_note': {
        const key = Object.keys(app.game.toys || {}).find((k) => k.split('#')[0] === 'mural' && app.game.toys[k].placed);
        if (key) {
          app.game.toys[key].note = text;
          app.game.changed();
          app.toys.updateMural(key);
          app.speech?.say(personaLine(app, 'mural', { user, text }), 4, { priority: true });
        } else app.speech?.say(app.config.lang === 'en' ? 'There is no placed photo board.' : 'Não há um mural posicionado.', 3, { priority: true });
        break;
      }
      case 'bolhas': case 'aviao': case 'trio': {
        const id = cfg.action === 'bolhas' ? 'bolhas' : cfg.action === 'aviao' ? 'aviao' : 'trio';
        if (id === 'trio') app.trio?.startTheft?.(); else app.toys?.callFurn?.(id);
        app.speech?.say(personaLine(app, 'toy', { user, id }), 3, { priority: true });
        break;
      }
      case 'clima': {
        const kind = ['chuva', 'sakura', 'neve', 'vagalumes'].find((k) => text.toLowerCase().includes(k) || cfg.climate === k);
        if (kind && app.weather) { app.weather.start(kind); app.weather.until = Date.now() + 120000; }
        break;
      }
      case 'tts_say':
        app.tts?.enqueue(`${user} disse: ${text}`);
        break;
      default: break;
    }
  }

  react(ev) {
    const app = this.app;
    if (!app) return;
    const user = String(ev.user || 'alguém').replace(/[<>&"']/g, '').slice(0, 40);
    let line = '';
    switch (ev.type) {
      case 'follow':
        app.pet?.react?.('cheer');
        app.doll?.brain?.say?.('♥', 2);
        line = personaLine(app, 'follow', { user });
        break;
      case 'sub':
        app.pet?.react?.('cheer');
        app.fx?.confettiRain?.(18);
        app.crow?.say?.('🎉', 2);
        line = personaLine(app, 'sub', { user });
        break;
      case 'raid':
        app.pet?.react?.('cheer');
        app.fx?.confettiRain?.(28);
        line = personaLine(app, 'raid', { user });
        break;
      case 'bits':
        app.pet?.react?.('cheer');
        line = personaLine(app, 'bits', { user, amount: ev.amount || 0 });
        break;
      case 'redeem':
        this.redeem(ev);
        line = personaLine(app, 'redeem', { user, reward: ev.reward || (app.config.lang === 'en' ? 'surprise' : 'surpresa') });
        break;
      case 'say':
        line = String(ev.text || '').replace(/[<>&"']/g, '').slice(0, 140);
        break;
      default: return;
    }
    if (line) app.speech?.say(line, 3.5, { priority: true });
  }
}
