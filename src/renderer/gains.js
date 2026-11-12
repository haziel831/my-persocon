// Small feed in a screen corner listing what was won, spent or received (machines, Crow, repairs, buffs).
// Readable for a few seconds but out of the way: no clicks, at most a few lines, fades out on its own.
import { BUFF_LABELS, BUFF_ICONS, ATTRS } from './game.js';

const LIFE = 5200;
const MAX = 4;
// O nome de cada atributo (Força, Constituição…).
const ATTR_LABELS = Object.fromEntries(ATTRS);

export class Gains {
  constructor(app) {
    this.app = app;
    this.life = LIFE;
    this.el = document.createElement('div');
    this.el.className = 'gains';
    document.body.append(this.el);
    app.pet?.on((type, data) => {
      if (type === 'attrXp') return this.attrXp(data);
      if (type !== 'medicine' && type !== 'ate') return;
      for (const [b, s] of data.item.buffs || (data.item.buff ? [data.item.buff] : [])) this.show(`+${Math.round(s / 60)} min`, 'buff', BUFF_LABELS[b] || b, BUFF_ICONS[b]);
    });
  }

  // O indicador pequeno dos atributos: o XP que ela acabou de ganhar (ou o nível novo).
  attrXp({ id, amount, level, up }) {
    const label = ATTR_LABELS[id] || id;
    if (up) {
      this.show(`Nv ${level}`, 'attr', `${label} subiu!`);
      this.app.sound?.play?.('ok', { volume: 0.25 });
      return;
    }
    const v = amount < 10 ? amount.toFixed(1) : String(Math.round(amount));
    this.show(`+${v} XP`, 'attr', label);
  }

  // kind: 'gain' | 'spend' | 'item' | 'buff'. ic: emoji (PxEmoji) or an image URL.
  show(amount, kind = 'gain', label = '', ic = null) {
    if (this.app.config?.gainsFeed === false) return;
    const row = document.createElement('div');
    row.className = `gain-row ${kind}`;
    const icEl = ic && /^(data:|blob:|[a-z]+:\/\/|\.|\/)/.test(ic) ? Object.assign(document.createElement('img'), { src: ic, draggable: false }) : document.createElement('span');
    icEl.className = 'gain-ic';
    if (icEl.tagName === 'SPAN') icEl.textContent = ic || { gain: '💰', spend: '💸', item: '🎁', buff: '✨' }[kind] || '✨';
    const amt = document.createElement('b');
    amt.textContent = amount;
    const lab = document.createElement('span');
    lab.className = 'gain-label';
    lab.textContent = label;
    row.append(icEl, amt, lab);
    this.el.prepend(row);
    while (this.el.children.length > MAX) this.el.lastElementChild.remove();
    this.place();
    this.timer ||= setInterval(() => {
      if (this.el.children.length) return this.place();
      clearInterval(this.timer);
      this.timer = null;
    }, 400);
    setTimeout(() => row.classList.add('out'), this.life);
    setTimeout(() => row.remove(), this.life + 500);
  }

  // Sits next to the status dock when it is shown in a bottom corner, otherwise bottom-right.
  place() {
    const dock = document.querySelector('.status-dock');
    const s = this.el.style;
    s.left = s.right = s.top = s.bottom = '';
    if (dock?.getClientRects().length) {
      const r = dock.getBoundingClientRect();
      const left = r.left + r.width / 2 < innerWidth / 2;
      if (left) s.left = `${Math.round(r.left)}px`;
      else s.right = `${Math.round(innerWidth - r.right)}px`;
      if (r.top > innerHeight / 2) s.bottom = `${Math.round(innerHeight - r.top + 6)}px`;
      else s.top = `${Math.round(r.bottom + 6)}px`;
      this.el.classList.toggle('down', r.top <= innerHeight / 2);
    } else {
      s.right = '12px';
      s.bottom = '64px';
      this.el.classList.remove('down');
    }
  }
}
