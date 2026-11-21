// Speech-bubble emoticons shown above the pet's head.
// Art: Pipoya Popup Emotes Pack, used as ONE sprite sheet (960x576) with 18 rows of 10 emote
// groups; each group is a 3-frame animation (3 x 32px) clipped by CSS background-position and
// played with a steps(3) animation. No .gif files and no generated pixel emotes are used.

import { isFocus } from './focusmode.js';

const SHEET_COLS = 10;
const SHEET_ROWS = 18;
const FRAME = 32; // frame size in the sheet
const GROUP = FRAME * 3; // width of one emote group in the sheet
const SHEET_W = 960;
const SHEET_H = 576;

// Every emote is registered once, pointing at its group index in the sheet.
// Group i sits at column (i % 10) and row (i / 10).
const EMOTES = {
  interrobang: 2, // "!?" bubble
  question: 1, // "?" bubble
  dizzy: 30, // spiral eyes
  sparkle: 4, // sparkles
  hearts: 7, // pink heart
  blush: 10, // shy cheeks
  sleep: 20, // Zz
  dots: 17, // "..." (sleep dots)
  scribble: 18, // tangled mind (thinking)
  anger: 21, // anger spark
  storm: 54, // storm cloud (sad)
  brokenheart: 9, // broken heart
  note: 3, // music note
  medal: 77, // gold medal (gaming / victory)
  star: 5, // big star (excited)
  sweat: 22, // effort drops
  arrow: 88, // red arrow (go)
  hand: 87, // open hand (thanks)
  bowl: 65, // bowl of food (hungry)
  drink: 66, // mug (thirsty)
  laugh: 33, // big laugh
  shock: 35, // shocked face
  rainbow: 57, // rainbow (sport)
  peace: 86, // victory hand (rock-paper-scissors)
};

// Alternative themes: one PNG per emote, or one 16px sheet (13x5 cells).
const PIXY_URL = new URL('./assets/emotes/pixymoji/', import.meta.url).href;
const PIXEL16_URL = new URL('./assets/emotes/pixel16.png', import.meta.url).href;
const PIXY = {
  interrobang: 'exclamation-question-mark.png', question: 'red-question-mark.png', dizzy: 'dizzy.png',
  sparkle: 'sparkles.png', hearts: 'pink-heart.png', blush: 'flushed-face.png', sleep: 'sleeping-face.png',
  dots: 'zzz.png', scribble: 'thinking-face.png', anger: 'anger-symbol.png', storm: 'disappointed-face.png',
  brokenheart: 'broken-heart.png', note: 'speaker-high.png', medal: 'first-place-medal.png', star: 'star.png',
  sweat: 'sweat-droplets.png', arrow: 'backhand-index-pointing-right.png', hand: 'waving-hand.png',
  bowl: 'shallow-pan-of-food.png', drink: 'glass-of-milk.png', laugh: 'face-with-tears-of-joy.png',
  shock: 'exploding-head.png', rainbow: 'rainbow.png', peace: 'ok-hand.png',
};

const CATEGORIES = {
  surprise: ['interrobang'],
  help: ['question'],
  dizzy: ['dizzy'],
  happy: ['sparkle'],
  love: ['hearts'],
  shy: ['blush'],
  sleepy: ['sleep'],
  sleeping: ['dots'],
  thinking: ['scribble'],
  angry: ['anger'],
  sad: ['storm'],
  heartbreak: ['brokenheart'],
  music: ['note'],
  gaming: ['medal'],
  excited: ['star'],
  effort: ['sweat'],
  go: ['arrow'],
  thanks: ['hand'],
  hungry: ['bowl'],
  thirsty: ['drink'],
  laugh: ['laugh'],
  scared: ['shock'],
  sport: ['rainbow'],
  rps: ['peace'],
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
    this.images = new Map(Object.entries(EMOTES));
    this.current = null;
    this.stats = stats;
    this.box = document.createElement('div');
    this.box.className = 'emoticon';
    this.el = document.createElement('div');
    this.el.className = 'pipo-emote';
    this.box.appendChild(this.el);
    document.body.appendChild(this.box);
    this.visible = 0;
    this.cooldown = 0;
    this.sleepTimer = 4;
    this.scale = 2;
    this.size = 64;
  }

  setSize(P) {
    this.P = P;
    const s = (P / 110) * 2 * (this.cfg.emoticonScale ?? 0.5);
    this.scale = Math.max(0.5, Math.round(s * 4) / 4);
    this.size = Math.max(20, Math.round(FRAME * this.scale));
    if (this.current) this.apply(this.current);
  }

  // Clips the 3-frame group from the sheet and lets CSS step through it.
  apply(name) {
    const group = this.images.get(name);
    if (group == null) return;
    const theme = this.cfg.emoteTheme || 'pipo';
    const el = this.el;
    if (theme === 'pixymoji' || theme === 'pixel16') {
      el.classList.add('emote-static');
      el.style.width = `${this.size}px`;
      el.style.height = `${this.size}px`;
      if (theme === 'pixymoji') {
        el.style.backgroundImage = `url("${PIXY_URL}${PIXY[name] || 'star.png'}")`;
        el.style.backgroundSize = 'contain';
        el.style.backgroundPosition = 'center';
      } else {
        const idx = Math.max(0, Object.keys(EMOTES).indexOf(name));
        const scale = this.size / 16;
        el.style.backgroundImage = `url("${PIXEL16_URL}")`;
        el.style.backgroundSize = `${13 * scale}px ${5 * scale}px`;
        el.style.backgroundPosition = `${-(idx % 13) * scale}px ${-Math.floor(idx / 13) * scale}px`;
      }
      return;
    }
    el.classList.remove('emote-static');
    el.style.backgroundImage = '';
    const k = this.size / FRAME;
    const x = -((group % SHEET_COLS) * GROUP) * k;
    const y = -Math.floor(group / SHEET_COLS) * FRAME * k;
    el.style.width = `${this.size}px`;
    el.style.height = `${this.size}px`;
    el.style.backgroundSize = `${SHEET_W * k}px ${SHEET_H * k}px`;
    el.style.setProperty('--pipo-x', `${x}px`);
    el.style.setProperty('--pipo-y', `${y}px`);
    el.style.setProperty('--pipo-x-end', `${x - GROUP * k}px`);
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
    this.current = pick(names);
    this.apply(this.current);
    this.el.classList.remove('pop');
    void this.el.offsetWidth;
    this.el.classList.add('pop');
    this.visible = category === 'sleeping' ? 3 : 2.6;
    this.cooldown = this.visible + 3;
  }

  maybe(category, p) {
    const rate = (this.cfg.emoticonRate ?? 1) * (isFocus(this.cfg) ? 0.3 : 1);
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
      box.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
      this.rect = { x, y, w, h };
    }
  }
}
