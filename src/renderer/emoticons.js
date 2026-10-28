// Speech-bubble pixel emoticons shown above the pet's head.
import { emoteSet } from './pixel.js';

const CATEGORIES = {
  surprise: ['g_interrobang', 'g_exclaim', 'g_scared'],
  help: ['g_help', 'g_scared'],
  dizzy: ['g_dizzy', 'g_sweat'],
  happy: ['g_sparkle', 'g_sun', 'g_flower', 'g_lol', 'g_ok', 'g_thanks'],
  love: ['g_hearts', 'g_stareyes', 'g_flower'],
  shy: ['g_shy'],
  sleepy: ['g_yawn'],
  sleeping: ['g_zzz', 'g_dots'],
  thinking: ['g_question', 'g_dots', 'g_idea'],
  angry: ['g_vein', 'g_angrycloud', 'g_fire'],
  sad: ['g_heartbreak', 'g_cry', 'g_rain'],
  heartbreak: ['g_heartbreak'],
  music: ['g_note', 'g_mic'],
  gaming: ['g_game'],
  excited: ['g_sparkle', 'g_hearts', 'g_stareyes', 'g_fire'],
  effort: ['g_sweat', 'g_fire', 'g_go'],
  go: ['g_go', 'g_ok'],
  thanks: ['g_thanks'],
  hungry: ['g_food'],
  thirsty: ['g_drink'],
  laugh: ['g_lol'],
  scared: ['g_scared', 'g_skull'],
  sport: ['g_ball', 'g_go'],
  rps: ['g_rock', 'g_paper', 'g_scissors'],
};

// Pet event -> [category, probability]; probability 1 means always (ignores cooldown).
const REACTIONS = {
  grab: ['surprise', 1],
  heldLong: ['help', 1],
  hardLand: ['dizzy', 1],
  bump: ['dizzy', 0.6],
  climb: ['effort', 0.35],
  climbTop: ['happy', 0.4],
  sleep: ['sleepy', 1],
  emote: ['happy', 0.45],
  pause: ['thinking', 0.8],
  resume: ['go', 1],
  restart: ['surprise', 1],
  idle: ['thinking', 0.12],
  edge: ['thinking', 0.2],
  hop: ['go', 0.3],
  sit: ['happy', 0.15],
  patAngry: ['angry', 1],
  bought: ['love', 1],
  toyBroke: ['sad', 1],
  toySad: ['sad', 0.9],
  toyRepaired: ['thanks', 1],
  requestDone: ['thanks', 1],
  medicine: ['happy', 1],
  hide: ['thinking', 1],
  ambush: ['surprise', 1],
  wallJump: ['go', 0.3],
  leap: ['go', 0.25],
  toyStart: ['happy', 0.5],
  toyPick: ['gaming', 0.5],
  gameExcite: ['excited', 0.6],
  ballFetch: ['excited', 1],
  ballKick: ['sport', 0.2],
  sing: ['music', 1],
  wantPlay: ['gaming', 1],
  versusStart: ['excited', 1],
  chaseTrip: ['dizzy', 1],
  toyRefuse: ['angry', 1],
  toyAccept: ['happy', 1],
  activityTired: ['sleepy', 1],
  ballHeader: ['happy', 0.5],
  ballStart: ['go', 0.5],
  hookHit: ['go', 0.2],
  leave: ['heartbreak', 1],
  dollBoo: ['surprise', 1],
  gameRage: ['angry', 0.6],
  gachaKick: ['angry', 0.8],
  vendBuy: ['happy', 0.8],
  vendBroke: ['sad', 1],
  vendStuck: ['surprise', 1],
  vendLucky: ['excited', 1],
  activity: ['music', 0.6],
};

// Not shown while every stat is at 70% or more (forced ones turn into a neutral surprise).
const NEGATIVE = new Set(['sad', 'angry', 'help', 'hungry', 'sleepy', 'dizzy']);

const pick = (list) => list[Math.floor(Math.random() * list.length)];

export class Emoticons {
  // stats: () => current pet stats, used to hold back negative emoticons while the pet is well.
  constructor(cfg, stats = () => null) {
    this.cfg = cfg;
    this.reload();
    this.frames = null;
    this.frameT = 0;
    this.stats = stats;
    this.box = document.createElement('div');
    this.box.className = 'emoticon';
    this.el = document.createElement('img');
    this.el.draggable = false;
    this.box.appendChild(this.el);
    document.body.appendChild(this.box);
    this.visible = 0;
    this.cooldown = 0;
    this.sleepTimer = 4;
    this.scale = 2;
  }

  // Rebuilds the image table for the emote theme ('auto' follows the UI theme).
  reload() {
    this.images = new Map();
    this.sides = new Map();
    const t = this.cfg.emoteTheme;
    for (const e of emoteSet(!t ? 'padrao' : t === 'auto' ? this.cfg.theme || 'padrao' : t)) {
      this.images.set(e.name, e.frames);
      this.sides.set(e.name, { l: e.left, c: e.frames, r: e.right });
    }
    this.current = null;
  }

  setSize(P) {
    this.P = P;
    const s = (P / 110) * 2 * (this.cfg.emoticonScale ?? 0.5);
    this.scale = Math.max(0.5, Math.round(s * 4) / 4);
    const img = this.el;
    if (img.naturalWidth) {
      img.style.width = (img.naturalWidth / 2) * this.scale + 'px';
      img.style.height = (img.naturalHeight / 2) * this.scale + 'px';
    }
  }

  // Shows a sample bubble (used while adjusting size/position in the options).
  preview() {
    this.show('happy', true);
  }

  wellCared() {
    const s = this.stats();
    return !!s && Object.values(s).every((v) => v >= 70);
  }

  show(category, force = false) {
    if (this.cfg.emoticons === false) return;
    if (NEGATIVE.has(category) && this.wellCared()) {
      if (!force) return;
      category = 'surprise';
    }
    if (!force && (this.cooldown > 0 || this.visible > 0)) return;
    const names = (CATEGORIES[category] || []).filter((n) => this.images.has(n));
    if (!names.length) return;
    const img = this.el;
    img.onload = () => {
      img.style.width = (img.naturalWidth / 2) * this.scale + 'px';
      img.style.height = (img.naturalHeight / 2) * this.scale + 'px';
    };
    const name = pick(names);
    const data = this.images.get(name);
    this.current = this.sides.get(name) || null;
    this.frames = Array.isArray(data) ? data : null;
    this.frameT = 0;
    img.src = this.frames ? this.frames[0] : data;
    img.classList.remove('pop');
    void img.offsetWidth;
    img.classList.add('pop');
    this.visible = category === 'sleeping' ? 3 : 2.6;
    this.cooldown = this.visible + 3;
  }

  maybe(category, p) {
    const rate = (this.cfg.emoticonRate ?? 1) * (this.cfg.focus ? 0.3 : 1);
    if (p >= 1) this.show(category, true);
    else if (Math.random() < p * rate) this.show(category);
  }

  react(type, data) {
    switch (type) {
      case 'release':
        if (data.speed > 12) this.show('surprise', true);
        return;
      case 'land':
        if (data.thrown) this.maybe(Math.random() < 0.5 ? 'happy' : 'thanks', 0.5);
        return;
      case 'wake':
        if (data.startled) this.show('surprise', true);
        else this.maybe(Math.random() < 0.5 ? 'sleepy' : 'happy', 0.6);
        return;
      case 'pet':
        this.show(Math.random() < 0.3 ? 'shy' : 'love', true);
        return;
      case 'emote':
        this.maybe(Math.random() < 0.15 ? 'rps' : Math.random() < 0.5 ? 'love' : 'happy', 0.45);
        return;
      case 'slap':
        this.show(Math.random() < 0.5 ? 'angry' : 'sad', true);
        return;
      case 'eat':
        this.maybe('happy', 0.5);
        return;
      case 'ate': {
        const t = data.taste;
        if (t === 'dislike' || t === 'hate') this.show(t === 'hate' ? 'angry' : 'sad', true);
        else if (t === 'ok') this.maybe(Math.random() < 0.5 ? 'thanks' : 'happy', 0.6);
        else this.show(t === 'love' || (!t && Math.random() < 0.6) ? 'love' : t === 'like' ? 'happy' : 'thanks', true);
        return;
      }
      case 'notSleepy':
        this.show('thinking', true);
        return;
      case 'qteStart':
        this.show('surprise', true);
        return;
      case 'qteEscape':
        this.show(Math.random() < 0.5 ? 'surprise' : 'dizzy', true);
        return;
      case 'chaseStart':
        this.show('go', true);
        return;
      case 'chaseJump':
        this.maybe('effort', 0.15);
        return;
      case 'chaseEnd':
        this.show(data.caught ? (Math.random() < 0.5 ? 'love' : 'happy') : 'sad', data.caught);
        return;
      case 'tooTired':
        this.show('sleepy', true);
        return;
      case 'death':
        this.show('sad', true);
        return;
      case 'react':
        this.show({ scare: 'scared', laugh: 'laugh', sad: 'sad', tense: 'surprise' }[data.kind] || (Math.random() < 0.5 ? 'happy' : 'love'), true);
        return;
      case 'mood': {
        const { health, hunger, mood, energy } = data;
        if (health < 25) this.maybe(Math.random() < 0.5 ? 'help' : 'sad', 0.9);
        else if (hunger < 30) this.maybe('hungry', 0.8);
        else if ((data.thirst ?? 100) < 30) this.maybe('thirsty', 0.8);
        else if (energy < 25) this.maybe('sleepy', 0.8);
        else if (mood < 15) this.maybe('angry', 0.6);
        else if (mood < 30) this.maybe('sad', 0.6);
        else if (energy < 35) this.maybe('effort', 0.5);
        else if (mood > 85) this.maybe('love', 0.5);
        else if (mood > 70) this.maybe('happy', 0.3);
        return;
      }
    }
    const r = REACTIONS[type];
    if (r) this.maybe(r[0], r[1]);
  }

  // head: screen position just above the pet's head.
  update(dt, head, sleeping, hidden) {
    this.cooldown -= dt;
    if (sleeping) {
      this.sleepTimer -= dt;
      if (this.sleepTimer <= 0) {
        this.sleepTimer = 6 + Math.random() * 4;
        this.show('sleeping');
      }
    } else {
      this.sleepTimer = 4;
    }
    if (this.visible > 0) {
      this.visible -= dt;
      if (this.frames) {
        this.frameT += dt;
        const src = this.frames[Math.floor(this.frameT / 0.22) % this.frames.length];
        if (this.el.src !== src) this.el.src = src;
      }
      if (this.visible <= 0) this.el.classList.remove('pop');
    }
    const box = this.box;
    const show = this.visible > 0 && !hidden && this.cfg.emoticons !== false;
    box.style.display = show ? 'block' : 'none';
    this.rect = null;
    if (show) {
      const w = this.el.offsetWidth;
      const h = this.el.offsetHeight;
      const x = Math.min(Math.max(2, head.x + (this.cfg.emoticonOffsetX ?? -28) - w / 2), innerWidth - w - 2);
      let y = head.y - (this.cfg.emoticonOffsetY ?? 12) - h;
      // Too close to the top of the screen: show it below the head instead.
      if (y < 2) y = head.y + this.P * 0.45;
      if (this.current) {
        const off = head.x - (x + w / 2);
        const side = off < -w * 0.18 ? 'l' : off > w * 0.18 ? 'r' : 'c';
        this.frames = this.current[side];
      }
      box.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
      this.rect = { x, y, w, h };
    }
  }
}
