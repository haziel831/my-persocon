// Local bridge alert queue: batches follows and reacts with speech, VFX and helpers.
import { personaLine, randomReaction } from './persona.js';

export class StreamAlerts {
  constructor(app) {
    this.app = app;
    this.queue = [];
    this.follows = [];
    this.pins = [];
    this.timer = null;
  }

  push(event) {
    if (!event || !event.type) return;
    if (event.type === 'follow') {
      const user = this.app ? String(event.user || 'alguém').replace(/[<>&"']/g, '').slice(0, 40) : 'alguém';
      this.follows.push(user);
      this.app?.rememberFollower?.(user);
      if (window.__PET_STREAMER__ && this.app?.config?.streamRandomAlerts !== false && this.app?.config?.followPins !== false) {
        this.pinFollow(user);
      }
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
      case 'pagar_cafe': {
        const drink = cfg.item || 'cafe_forte';
        app.game.inventory[drink] = (app.game.inventory[drink] || 0) + 1;
        app.game.changed?.();
        app.toys?.callFurn?.('cafeteira');
        app.gainAffection?.(5, 'pagar_cafe');
        app.speech?.say(personaLine(app, 'coffee', { user }), 3, { priority: true });
        break;
      }
      case 'dar_lanche': {
        const food = cfg.item || 'maca';
        app.game.inventory[food] = (app.game.inventory[food] || 0) + 1;
        app.game.changed?.();
        app.gainAffection?.(5, 'dar_lanche');
        app.speech?.say(personaLine(app, 'snack', { user }), 3, { priority: true });
        break;
      }
      case 'cafune':
        app.setHand?.('pat');
        app.emoticons?.show?.('love', true);
        app.gainAffection?.(6, 'cafune');
        app.speech?.say(personaLine(app, 'pat', { user }), 3, { priority: true });
        break;
      case 'desenho': {
        const key = Object.keys(app.game.toys || {}).find((k) => k.split('#')[0] === 'mural' && app.game.toys[k].placed);
        if (key) { app.game.toys[key].note = `♥ ${user}`; app.game.changed?.(); app.toys?.updateMural?.(key); }
        app.speech?.say(personaLine(app, 'draw', { user }), 4, { priority: true });
        break;
      }
      case 'susto':
        app.pet?.react?.('scare');
        app.speech?.say(personaLine(app, 'scare'), 3, { priority: true });
        break;
      case 'clima': {
        const all = ['chuva', 'sakura', 'neve', 'vagalumes'];
        const kind = all.find((k) => text.toLowerCase().includes(k) || cfg.climate === k)
          || all[Math.floor(Math.random() * all.length)];
        if (app.weather) { app.weather.start(kind); app.weather.until = Date.now() + 120000; }
        app.speech?.say(personaLine(app, 'climate', { kind }), 3, { priority: true });
        break;
      }
      case 'tts_say':
        app.tts?.enqueue?.(`${user} disse: ${text}`, { priority: true });
        break;
      default: return false;
    }
    return true;
  }

  pinFollow(user) {
    const card = document.createElement('div');
    card.className = 'follow-pin';
    const art = document.createElement('canvas');
    art.width = 24; art.height = 24;
    const g = art.getContext('2d');
    g.fillStyle = '#ff4fb8'; g.fillRect(9, 8, 6, 8); g.fillRect(7, 10, 10, 4);
    g.fillStyle = '#ffd23f'; g.fillRect(11, 4, 2, 4); g.fillRect(4, 11, 3, 2); g.fillRect(17, 11, 3, 2);
    const label = document.createElement('span');
    label.textContent = `♥ ${String(user || 'alguém').replace(/[<>&"']/g, '').slice(0, 40)}`;
    card.append(art, label);
    document.body.append(card);
    const slot = this.pins.length;
    card.style.left = `${Math.round(12 + (slot % 10) * (Math.min(120, innerWidth / 10)))}px`;
    card.style.top = '6px';
    this.pins.push(card);
    while (this.pins.length > 10) {
      const old = this.pins.shift();
      old.classList.add('leaving');
      setTimeout(() => old.remove(), 500);
    }
  }

  clearPins() {
    for (const card of this.pins) card.remove();
    this.pins.length = 0;
  }

  subShow(user) {
    const app = this.app;
    const canvas = document.createElement('canvas');
    canvas.className = 'sub-show-canvas';
    canvas.width = innerWidth; canvas.height = innerHeight;
    document.body.append(canvas);
    const g = canvas.getContext('2d');
    const colors = ['#ff3ea5', '#5ef0ff', '#a855f7'];
    const t0 = performance.now();
    const beams = Array.from({ length: 6 }, (_, i) => ({ x: (i + 0.5) * canvas.width / 6, dir: i % 2 ? 1 : -1, c: colors[i % 3] }));
    app.sound?.playSubSynthwave?.(10);
    app.startMode?.('jam');
    const draw = (now) => {
      const t = (now - t0) / 1000;
      if (t >= 10 || !canvas.isConnected) {
        canvas.remove();
        app.modes?.stop?.();
        return;
      }
      g.clearRect(0, 0, canvas.width, canvas.height);
      for (const b of beams) {
        const a = 0.12 + 0.08 * Math.sin(t * Math.PI * 2 * (136 / 60) + b.x);
        g.fillStyle = b.c; g.globalAlpha = a;
        g.beginPath(); g.moveTo(b.x, -20);
        g.lineTo(b.x + b.dir * (90 + 140 * Math.sin(t * 2)), canvas.height);
        g.lineTo(b.x + b.dir * (30 + 60 * Math.sin(t * 2)), canvas.height);
        g.closePath(); g.fill();
      }
      g.globalAlpha = 1;
      if (Math.random() < 0.35) {
        g.fillStyle = colors[Math.floor(Math.random() * 3)];
        const x = Math.random() * canvas.width, y = Math.random() * canvas.height * 0.6;
        for (let i = 0; i < 18; i++) {
          const ang = (i / 18) * Math.PI * 2;
          g.fillRect(x + Math.cos(ang) * Math.random() * 30, y + Math.sin(ang) * Math.random() * 30, 3, 3);
        }
      }
      g.font = '700 42px PxEmoji, system-ui, sans-serif';
      g.textAlign = 'center';
      g.shadowColor = '#ff3ea5'; g.shadowBlur = 24;
      g.fillStyle = '#fff';
      g.fillText(String(user || '').replace(/[<>&"']/g, '').slice(0, 40), canvas.width / 2, 100 + Math.sin(t * 4) * 6);
      g.shadowBlur = 0;
      requestAnimationFrame(draw);
    };
    requestAnimationFrame(draw);
  }

  react(ev) {
    const app = this.app;
    if (!app) return;
    const user = String(ev.user || 'alguém').replace(/[<>&"']/g, '').slice(0, 40);
    const rich = app.config.streamRandomAlerts !== false;
    const thanks = (key, vars) => rich ? randomReaction(app, key, vars) : personaLine(app, key, vars);
    let line = '';
    switch (ev.type) {
      case 'follow':
        if (rich) {
          app.pet?.react?.('cheer');
          app.doll?.brain?.say?.('♥', 2);
          app.fx?.followHearts?.(6);
        }
        app.gainAffection?.(2, 'follow');
        line = thanks('follow', { user });
        break;
      case 'sub':
        if (rich) {
          app.pet?.react?.('cheer');
          app.fx?.confettiRain?.(18);
          app.crow?.say?.('🎉', 2);
          if (window.__PET_STREAMER__ && app.config.subShow !== false) this.subShow(user);
        }
        app.gainAffection?.(8, 'sub');
        line = thanks('sub', { user });
        break;
      case 'raid':
        if (rich) {
          app.pet?.react?.('cheer');
          app.fx?.confettiRain?.(28);
        }
        app.gainAffection?.(6, 'raid');
        line = thanks('raid', { user, viewers: ev.viewers || 15 });
        break;
      case 'bits':
        if (rich) {
          app.pet?.react?.('cheer');
          app.fx?.coinRain?.(20);
          app.sound?.play?.('coin', { volume: 0.75 });
        }
        app.gainAffection?.(4, 'bits');
        line = thanks('bits', { user, amount: ev.amount || 0 });
        break;
      case 'redeem':
        if (!this.redeem(ev)) {
          line = personaLine(app, 'redeem', { user, reward: ev.reward || (app.config.lang === 'en' ? 'surprise' : 'surpresa') });
        }
        break;
      case 'say':
        line = String(ev.text || '').replace(/[<>&"']/g, '').slice(0, 140);
        break;
      default: return;
    }
    if (line) {
      app.chatBox?.push?.(ev.type, line);
      app.speech?.say(line, 3.5, { priority: true });
    }
  }
}
