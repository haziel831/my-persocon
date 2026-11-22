// Local bridge alert queue: batches follows and reacts with speech, VFX and helpers.
import { alertThanks, personaLine, randomReaction } from './persona.js';
import { upgradeJingle } from './upgradefx.js';

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
        app.speech?.say(personaLine(app, 'coins', { user, coins }), 3, { priority: true, source: 'alert' });
        break;
      case 'sky_drop':
        app.toys?.skyDrop?.(cfg.item || 'maca', { fromUser: false });
        app.speech?.say(personaLine(app, 'drop', { user }), 3, { priority: true, source: 'alert' });
        break;
      case 'mural_note': {
        const key = Object.keys(app.game.toys || {}).find((k) => k.split('#')[0] === 'mural' && app.game.toys[k].placed);
        if (key) {
          app.game.toys[key].note = text;
          app.game.changed();
          app.toys.updateMural(key);
          app.speech?.say(personaLine(app, 'mural', { user, text }), 4, { priority: true, source: 'alert' });
        } else app.speech?.say(app.config.lang === 'en' ? 'There is no placed photo board.' : 'Não há um mural posicionado.', 3, { priority: true, source: 'alert' });
        break;
      }
      case 'bolhas': case 'aviao': case 'trio': {
        const id = cfg.action === 'bolhas' ? 'bolhas' : cfg.action === 'aviao' ? 'aviao' : 'trio';
        if (id === 'trio') app.trio?.startTheft?.(); else app.toys?.callFurn?.(id);
        app.speech?.say(personaLine(app, 'toy', { user, id }), 3, { priority: true, source: 'alert' });
        break;
      }
      case 'pagar_cafe': {
        const drink = cfg.item || 'cafe_forte';
        app.game.inventory[drink] = (app.game.inventory[drink] || 0) + 1;
        app.game.changed?.();
        app.toys?.callFurn?.('cafeteira');
        app.gainAffection?.(5, 'pagar_cafe');
        app.speech?.say(personaLine(app, 'coffee', { user }), 3, { priority: true, source: 'alert' });
        break;
      }
      case 'dar_lanche': {
        const food = cfg.item || 'maca';
        app.game.inventory[food] = (app.game.inventory[food] || 0) + 1;
        app.game.changed?.();
        app.gainAffection?.(5, 'dar_lanche');
        app.speech?.say(personaLine(app, 'snack', { user }), 3, { priority: true, source: 'alert' });
        break;
      }
      case 'cafune':
        app.setHand?.('pat');
        app.emoticons?.show?.('love', true);
        app.gainAffection?.(6, 'cafune');
        app.speech?.say(personaLine(app, 'pat', { user }), 3, { priority: true, source: 'alert' });
        break;
      case 'desenho': {
        const key = Object.keys(app.game.toys || {}).find((k) => k.split('#')[0] === 'mural' && app.game.toys[k].placed);
        if (key) { app.game.toys[key].note = `♥ ${user}`; app.game.changed?.(); app.toys?.updateMural?.(key); }
        app.speech?.say(personaLine(app, 'draw', { user }), 4, { priority: true, source: 'alert' });
        break;
      }
      case 'susto':
        app.pet?.react?.('scare');
        app.speech?.say(personaLine(app, 'scare'), 3, { priority: true, source: 'alert' });
        break;
      case 'clima': {
        const all = ['chuva', 'sakura', 'neve', 'vagalumes'];
        const kind = all.find((k) => text.toLowerCase().includes(k) || cfg.climate === k)
          || all[Math.floor(Math.random() * all.length)];
        if (app.weather) { app.weather.start(kind); app.weather.until = Date.now() + 120000; }
        app.speech?.say(personaLine(app, 'climate', { kind }), 3, { priority: true, source: 'alert' });
        break;
      }
      case 'tts_say':
        const hide = app.config.ttsHideViewerNames === true;
        app.tts?.enqueue?.(hide ? text : `${user} ${app.config.lang === 'en' ? 'said:' : 'disse:'} ${text}`, { priority: true, chat: !hide });
        break;
      default: return false;
    }
    return true;
  }

  // Floating reaction emote (bottom-left of the stage), 3s hold, no stacking.
  showReactionEmote(emotion = 'normal', speech = '') {
    const app = this.app;
    if (!window.__PET_STREAMER__ && app.config.emotesOutsideStreamer !== true) return;
    if (app.config.reactionEmote === false) return;
    const folder = /aghata|agatha/i.test(app.config?.modelDir || '') ? 'aghata' : 'ninna';
    const files = {
      normal: 'normal.png', shy: 'shy.png', sad: 'sad.png', anxious: 'anxious.png',
      confused: 'confused.png', gentle: 'shy.png', happy: 'happy_512.png',
      angry: 'anxious.png', hype: 'happy_512.png', love: 'shy.png', laugh: 'happy_512.png',
    };
    const file = files[emotion] || 'normal.png';
    let el = this.reactionEl;
    if (!el || !el.isConnected) {
      el = document.createElement('div');
      el.className = 'reaction-emote';
      el.innerHTML = '<img alt="" draggable="false">';
      document.body.append(el);
      this.reactionEl = el;
    }
    const img = el.querySelector('img');
    img.src = new URL(`../assets/emotes/${folder}/${file}`, import.meta.url).href;
    img.onerror = () => {
      img.onerror = null;
      img.src = new URL(`../assets/emotes/aghata/normal.png`, import.meta.url).href;
    };
    let bubble = this.reactionBubble;
    if (!bubble || !bubble.isConnected) {
      bubble = document.createElement('div');
      bubble.className = 'reaction-bubble';
      document.body.append(bubble);
      this.reactionBubble = bubble;
    }
    if (speech) {
      bubble.textContent = String(speech).replace(/[<>&"']/g, '').slice(0, 220);
      bubble.hidden = false;
    } else {
      bubble.hidden = true;
    }
    el.classList.add('up');
    bubble.classList.add('up');
    clearTimeout(this.reactionTimer);
    clearTimeout(this.reactionTimer2);
    const finish = () => {
      el.classList.remove('up');
      bubble.classList.remove('up');
      this.reactionTimer2 = setTimeout(() => {
        el.remove(); this.reactionEl = null;
        bubble.remove(); this.reactionBubble = null;
      }, 500);
    };
    this.reactionTimer = setTimeout(() => {
      // Keep her on screen while the TTS is still talking, plus 2 extra seconds.
      if (app.tts?.speaking) this.reactionTimer = setTimeout(finish, 2000);
      else finish();
    }, 6000);
  }

  reactionForText(text) {
    const t = String(text || '').toLowerCase();
    if (/obrigad|valeu|thanks|cafun|carinh|amor|love/.test(t)) return 'shy';
    if (/triste|sad|pêsames|f\.\.\.|loss/.test(t)) return 'sad';
    if (/susto|assust|scare|socorro/.test(t)) return 'anxious';
    if (/gg|uau|wow|hype|vamos|bora|danc/.test(t)) return 'hype';
    if (/\?|confus|hmm/.test(t)) return 'confused';
    return 'normal';
  }

  // 5-second Follow celebration: same approach state as "ask for attention",
  // rhythmic hops, a held thank-you sign and the furniture-upgrade jingle.
  followCelebration(user, subtitle = '', extras = false, kind = 'follow') {
    const app = this.app;
    const pet = app.pet;
    if (!pet) return;
    const name = String(user || 'alguém').replace(/[<>&"']/g, '').slice(0, 40);
    const thanks = alertThanks(app, kind, name);
    const sign = document.createElement('div');
    sign.className = 'follow-thanks';
    const who = document.createElement('b');
    who.textContent = name;
    if (subtitle) {
      const sub = document.createElement('span');
      sub.className = 'ft-sub';
      sub.textContent = subtitle;
      sign.append(sub);
    }
    const phrase = document.createElement('span');
    phrase.className = 'ft-phrase';
    phrase.textContent = thanks;
    sign.append(who, phrase);
    sign.style.display = 'none';
    document.body.append(sign);
    let spotlights = null;
    let spotRaf = 0;
    if (extras) {
      spotlights = document.createElement('canvas');
      spotlights.className = 'follow-spotlights';
      spotlights.width = innerWidth; spotlights.height = innerHeight;
      document.body.append(spotlights);
      spotlights.style.display = 'none';
      const g = spotlights.getContext('2d');
      const colors = ['#ff3ea5', '#5ef0ff', '#a855f7', '#ffd23f'];
      const t0 = performance.now();
      const draw = (now) => {
        const t = (now - t0) / 1000;
        if (!spotlights.isConnected || spotlights.style.display === 'none') { spotRaf = requestAnimationFrame(draw); return; }
        if (t >= 5) return;
        g.clearRect(0, 0, spotlights.width, spotlights.height);
        for (let i = 0; i < 4; i++) {
          const x = spotlights.width * (0.2 + 0.2 * i) + Math.sin(t * 1.6 + i) * spotlights.width * 0.18;
          g.globalAlpha = 0.12 + 0.06 * Math.sin(t * 6 + i);
          g.fillStyle = colors[i];
          g.beginPath(); g.moveTo(x, -20); g.lineTo(x + 130, spotlights.height);
          g.lineTo(x - 130, spotlights.height); g.closePath(); g.fill();
        }
        g.globalAlpha = 1;
        spotRaf = requestAnimationFrame(draw);
      };
      spotRaf = requestAnimationFrame(draw);
    }
    let appeared = false;
    const cleanup = () => {
      cancelAnimationFrame(spotRaf);
      app.closeup?.resetVisual?.();
      pet.hideRect = null;
      pet.bodyY = 0;
      for (const el of [sign, spotlights]) {
        if (!el) continue;
        el.classList.add('leaving');
        setTimeout(() => el.remove(), 350);
      }
    };
    pet.playToy({
      id: 'ix_alert', dur: 5.8, anim: 'idle', facing: 'front',
      tick: (dt, tp) => {
        const P = pet.P || 64;
        if (tp.t < 0.35) {
          // Fase 1: jump up and disappear from the normal stage.
          const u = tp.t / 0.35;
          pet.bodyY = -Math.sin(Math.PI * u) * P * 1.1;
          pet.hideRect = u > 0.85 ? { x: -innerWidth, y: pet.y, w: innerWidth * 3, h: innerHeight * 2 } : null;
          return;
        }
        if (!appeared) {
          appeared = true;
          pet.bodyY = 0;
          pet.hideRect = null;
          upgradeJingle(app.sound);
          const Z = 2.6;
          const sx = innerWidth / 2 - Z * P * 0.35;
          const feet = innerHeight + Z * P * 0.2;
          if (app.closeup?.place) app.closeup.place(Z, feet, sx);
          else { pet.zoom = Z; pet.shiftX = sx - pet.x; pet.bodyY = feet - pet.y - (Z - 1) * P * 0.55; }
          sign.style.display = 'flex';
          sign.style.left = `${Math.round(sx - 70)}px`;
          sign.style.top = `${Math.round(innerHeight * 0.26)}px`;
          if (spotlights) spotlights.style.display = 'block';
          if (extras) app.fx?.confettiRain?.(60);
        }
        sign.classList.add('up');
      },
      onEnd: cleanup,
    });
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
    app.twitch?.trackViewer?.(user);
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
        this.followCelebration(user, '', false, 'follow');
        app.gainAffection?.(2, 'follow');
        line = thanks('follow', { user });
        break;
      case 'sub':
        if (window.__PET_STREAMER__) this.followCelebration(user, 'SUB!', true, 'sub');
        else if (rich) { app.pet?.react?.('cheer'); app.fx?.confettiRain?.(18); app.crow?.say?.('🎉', 2); }
        app.gainAffection?.(8, 'sub');
        line = thanks('sub', { user });
        break;
      case 'raid':
        if (window.__PET_STREAMER__) this.followCelebration(user, 'RAID!', true, 'raid');
        else if (rich) { app.pet?.react?.('cheer'); app.fx?.confettiRain?.(28); }
        app.gainAffection?.(6, 'raid');
        line = thanks('raid', { user, viewers: ev.viewers || 15 });
        break;
      case 'bits':
        if (window.__PET_STREAMER__) this.followCelebration(user, `${ev.amount || 0} BITS`, true, 'bits');
        else if (rich) { app.pet?.react?.('cheer'); app.fx?.coinRain?.(20); app.sound?.play?.('coin', { volume: 0.75 }); }
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
    const emotionByType = {
      follow: 'shy', sub: 'hype', raid: 'hype', bits: 'hype', redeem: 'gentle',
      pagar_cafe: 'gentle', dar_lanche: 'gentle', cafune: 'shy', susto: 'anxious', tts_say: 'normal',
    };
    this.showReactionEmote(emotionByType[ev.type] || this.reactionForText(line), line);
    if (line) {
      app.chatBox?.push?.(ev.type, line);
      app.speech?.say(line, 3.5, { priority: true, source: 'alert' });
    }
  }
}
