// Gacha-Machine and Slot-Machine. The Persocon has her own wallet (the player gives her coins in
// Ações → Carteira) and spends it on her own at both machines; a click on the Gacha is paid by the
// player. Coin prizes and Slot winnings go to the player's coins (asked by the user). Odds follow affection.
import { ITEMS, itemById, isEdible } from './game.js';
import { icon } from './pixel.js';
import { RARITIES } from './lootitems.js';
import { dollReact } from './watch.js';
import {
  GACHA_PRICE, GACHA_ORDER, rollGacha, luckOf, FIGURES, figureById, SLOT_SYMBOLS, SLOT_STRIPS, rollSlot, slotPayout,
  gachaFrame, slotFrame, capsuleIcon, SLOT_WINDOW, SLOT_TRAY, SLOT_COIN, GACHA_CHUTE, STYLES, pickStyle,
} from './casinoitems.js';
import { Vending } from './vending.js';

const rand = (a, b) => a + Math.random() * (b - a);
const randInt = (a, b) => Math.floor(rand(a, b + 1));
const pick = (l) => l[Math.floor(Math.random() * l.length)];
const clamp = (v, a, b) => Math.min(Math.max(v, a), b);
const GOLD = ['#ffd23f', '#ffc23a', '#fff1b0', '#c98200'];

// ---------- gacha prizes ----------

const PRIZE_COINS = { comum: [5, 15], incomum: [20, 40], raro: [60, 100], epico: [150, 300] };
// A figure she already has turns into coins for the player.
const DUPE_COINS = { comum: 10, incomum: 25, raro: 60, epico: 150 };
const FOOD_PRICE = { comum: [1, 15], incomum: [15, 30], raro: [25, 60] };
const EPIC_FOOD = ['elixir', 'estrela', 'ampulheta'];

// Upgraded Gacha: its own figures join the pool, more figures and food, bigger coin prizes and
// lootbox prizes in the rare capsules.
const LOOT_OF = { raro: ['raro'], epico: ['raro', 'lendario'] };
function rollPrize(rarity, up = false) {
  const r = Math.random();
  if (up && LOOT_OF[rarity] && r > 0.9) {
    const loot = ITEMS.filter((i) => i.loot && LOOT_OF[rarity].includes(i.rarity));
    if (loot.length) return { kind: 'item', id: pick(loot).id, n: 1, rarity };
  }
  if (r < (rarity === 'epico' ? 0.5 : 0.35) + (up ? 0.1 : 0)) {
    const pool = FIGURES.filter((f) => f.rarity === rarity && (up || !f.up));
    const fresh = up && Math.random() < 0.6 ? pool.filter((f) => f.up) : pool;
    return { kind: 'figure', id: pick(fresh.length ? fresh : pool).id, rarity };
  }
  if (up && r > 0.85) {
    const [a, b] = PRIZE_COINS[rarity];
    return { kind: 'coins', n: Math.round((randInt(a, b) * 1.6) / 5) * 5, rarity };
  }
  if (r < 0.7) {
    if (rarity === 'epico') return { kind: 'item', id: pick(EPIC_FOOD), n: 1, rarity };
    const [lo, hi] = FOOD_PRICE[rarity];
    const food = ITEMS.filter((i) => isEdible(i) && !i.legacy && !i.watchOnly && !i.loot && i.price >= lo && i.price <= hi);
    if (food.length) return { kind: 'item', id: pick(food).id, n: rarity === 'raro' ? randInt(2, 3) : rarity === 'incomum' ? randInt(1, 2) : 1, rarity };
  }
  const [a, b] = PRIZE_COINS[rarity];
  return { kind: 'coins', n: Math.round(randInt(a, b) / 5) * 5, rarity };
}
const prizeArt = (p) => (p.kind === 'coins' ? icon('coinpile') : p.kind === 'figure' ? figureById(p.id)?.img : itemById(p.id)?.img) || '';
const prizeName = (p) => (p.kind === 'coins' ? `${p.n} moedas para você`
  : p.kind === 'figure' ? `Boneco: ${figureById(p.id)?.name || p.id}`
  : `${itemById(p.id)?.name || p.id}${p.n > 1 ? ` ×${p.n}` : ''}`);

export class Casino {
  constructor(app, toys) {
    this.app = app;
    this.toys = toys;
    this.cur = null;
    this.order = null;
    this.caps = [];
    this.m = {
      gacha: { knob: 0, shake: 0, lit: 0, litT: 0, glow: '', chute: '', jolt: 0 },
      slot: { lever: 0, lit: 0, litT: 0, mode: 'idle', jolt: 0, line: 0, reels: [0, 1, 2].map(() => ({ pos: randInt(0, 40), target: null, done: true })) },
    };
    this.vend = new Vending(app, toys, this);
  }

  get P() {
    return this.app.pet.P;
  }

  get wallet() {
    return this.app.game.profile.wallet || 0;
  }

  set wallet(v) {
    this.app.game.profile.wallet = Math.max(0, Math.round(v));
  }

  owns(id) {
    return id === 'gacha' || id === 'slot' || this.vend.owns(id);
  }

  // Coins she keeps for food and drinks at the vending machines; she only gambles what is left.
  reserve() {
    let r = 0;
    for (const cat of ['comidas', 'bebidas']) if (this.vend.machine(cat)) r += this.vend.cheapest(cat) * 2;
    return r;
  }

  spare() {
    return Math.max(0, this.wallet - this.reserve());
  }

  // Plays on her own only with spare money, some mood and not too often.
  usable(id) {
    if (this.vend.owns(id)) return this.vend.usable(id);
    if (this.cur || this.order || this.out) return false;
    const { mood } = this.app.pet.stats;
    const now = Date.now();
    if (id === 'gacha') return this.spare() >= GACHA_PRICE + 10 && mood > 15 && now >= (this.gachaAt || 0);
    return this.spare() >= 20 && mood > 20 && now >= (this.slotAt || 0);
  }

  // Gacha: on the side she comes from; Slot: on the side of the lever.
  spot(id, t) {
    if (this.vend.owns(id)) return this.vend.spot(id, t);
    if (id === 'slot') return t.x + (t.flip ? -1 : 1) * this.P * 0.5;
    return t.x + (this.app.pet.x < t.x ? -1 : 1) * this.P * 0.42;
  }

  art(id) {
    if (this.vend.owns(id)) return this.vend.art(id);
    const m = this.m[id];
    const up = !!this.app.game.toys[id]?.up;
    if (id === 'gacha') return gachaFrame(m.knob, m.shake, m.lit % 2, m.glow, m.chute, up);
    return slotFrame(m.lever, m.mode === 'spin' ? m.lit % (up ? 5 : 3) : m.mode === 'off' ? 0 : m.lit % 2, m.mode, up);
  }

  // Screen point of a spot of the machine's picture (fractions), following its mirroring.
  at(id, f) {
    const t = this.app.game.toys[id];
    const w = this.toys.size(id);
    const h = w * this.toys.ratio(id);
    const fx = t?.flip ? 1 - f.x : f.x;
    return { x: (t?.x ?? 0) - w / 2 + w * fx, y: (t?.y ?? this.toys.floorY()) - h + h * f.y };
  }

  float(id, f, text, dy = 16) {
    if (!this.app.game.toys[id]) return;
    const p = this.at(id, f);
    this.toys.furn.floatText(p.x, p.y - dy, text);
  }

  // ---------- requests from the player ----------

  // Left click on a machine: the Gacha is paid by the player; at the Slot she bets her own wallet.
  click(id, x, y) {
    const { game, pet, sound } = this.app;
    const say = (text) => this.toys.furn.floatText(x, y - 24, text);
    const no = (text) => {
      if (text) say(text);
      sound.play('cancel', { volume: 0.4 });
    };
    if (pet.dead) return no();
    if (this.vend.owns(id)) return this.vend.click(id, x, y, no, say);
    if (this.cur || this.order) return no('Ela já está jogando!');
    if (id === 'gacha') {
      if (!game.canBuy({ price: GACHA_PRICE })) return no(`Precisa de ¥ ${GACHA_PRICE}`);
      if (!this.send(id, 'player')) return no('Ela está ocupada agora');
      game.pay(GACHA_PRICE);
      game.changed();
      sound.play('ok', { volume: 0.4 });
      this.app.gains?.show(`−¥ ${GACHA_PRICE}`, 'spend', 'Gacha');
      return say(`¥ −${GACHA_PRICE}`);
    }
    if (this.wallet < 5) return no('Carteira dela vazia · Ações → Carteira');
    if (!this.send(id, 'ask')) return no('Ela está ocupada agora');
    sound.play('ok', { volume: 0.4 });
  }

  send(id, by) {
    const { pet, antics, minigames } = this.app;
    if (pet.mode !== 'ground' || pet.surfaceId !== 'floor' || pet.chase || pet.mini || pet.eating || pet.meals?.length || pet.activity || pet.ballPlay || minigames?.active) return false;
    if (!['idle', 'walk', 'run', 'sit', 'emote', 'toy', 'antic', 'goto', 'react'].includes(pet.action)) return false;
    if (pet.toyPlay) pet.endToy(true);
    if (pet.action === 'antic') antics?.stop(false);
    this.order = { id, by };
    if (pet.goTo(this.toys.spot(id), () => this.toys.play(id, pet))) return true;
    this.order = null;
    return false;
  }

  // She never got there: the player's coins come back.
  dropOrder() {
    const o = this.order;
    this.order = null;
    if (o?.by !== 'player') return;
    const { game } = this.app;
    game.coins += GACHA_PRICE;
    game.changed();
    this.float('gacha', GACHA_CHUTE, `¥ +${GACHA_PRICE} (devolvido)`, 40);
    this.app.gains?.show(`+¥ ${GACHA_PRICE}`, 'gain', 'Gacha (devolvido)');
  }

  play(id, pet, end) {
    if (this.vend.owns(id)) return this.vend.play(id, pet, end);
    const order = this.order?.id === id ? this.order : null;
    this.order = null;
    const ok = id === 'gacha' ? this.gacha(pet, end, order?.by || 'wallet') : this.slot(pet, end, !!order);
    if (!ok) {
      if (order) {
        this.order = order;
        this.dropOrder();
      }
      pet.chooseNext();
    }
    return true;
  }

  // ---------- gacha ----------

  gacha(pet, end, by) {
    const { game, sound } = this.app;
    const t = game.toys.gacha;
    if (by !== 'player') {
      if (this.wallet < GACHA_PRICE) return false;
      if (by === 'wallet') this.gachaAt = Date.now() + 15 * 60000;
      this.wallet -= GACHA_PRICE;
      this.float('gacha', { x: 0.7, y: 0.66 }, `👛 −${GACHA_PRICE}`);
      this.app.gains?.show(`−¥ ${GACHA_PRICE}`, 'spend', 'Gacha · carteira dela', '👛');
    }
    const rarity = rollGacha(luckOf(pet.affection) + (this.app.crow?.luck('gacha') || 0) + (pet.buff?.('luck') ? 0.05 : 0));
    const g = { id: 'gacha', prize: rollPrize(rarity, !!t.up), up: !!t.up, tier: GACHA_ORDER.indexOf(rarity), by, beat: 0, style: pickStyle(t, 'gacha', STYLES.gacha) };
    this.cur = g;
    const p = game.profile;
    p.gachaPulls = (p.gachaPulls || 0) + 1;
    if (rarity === 'epico') p.gotEpic = true;
    game.changed();
    pet.dir = t.x < pet.x ? -1 : 1;
    sound.tone8(1800, 2400, 0.06, 'square', 0.05);
    pet.playToy({
      id: 'gacha', dur: 30, holdSize: 0.13, anim: pet.pickClip(['pegar'], ['use_mainhand', 'swing_hand', 'idle']), facing: pet.side(),
      onEnd: (interrupted) => {
        this.endGacha(g, interrupted);
        end(interrupted);
      },
      tick: (dt, tp) => this.gachaTick(dt, tp, g, pet),
    });
    pet.emit('gachaStart', { by });
    return true;
  }

  // Turns the knob (the dome glows before a Raro/Épico), the capsule rolls out to her feet, she
  // shakes it open and celebrates according to the rarity.
  // Variants (g.style): classic, turbo (fast crank, the capsule flies high), kick (gets stuck, she
  // kicks the machine), drama (slow crank with a drum roll and rainbow dome), twist (twists it open).
  gachaTick(dt, tp, g, pet) {
    const { sound } = this.app;
    const m = this.m.gacha;
    const t = tp.t;
    const st = g.style;
    const T1 = { turbo: 1.5, kick: 3, drama: 3.2 }[st] ?? 2.2;
    const o = T1 - 2.2;
    if (t < T1) {
      if (st === 'kick' && t >= 1.6) {
        if (!g.stuck) {
          g.stuck = true;
          m.knob = 0;
          m.shake = 0;
          sound.sfx('buzz');
          this.float('gacha', GACHA_CHUTE, '❓', 40);
          pet.tilt = 0;
          pet.anim('idle', { facing: 'front' });
        }
        if (t >= 2.3 && !g.kicked) {
          g.kicked = true;
          pet.anim(pet.pickClip(['chutar'], ['swing_hand', 'use_mainhand', 'idle']), { facing: pet.side(), restart: true });
          sound.sfx('bonk', 1.4);
          m.jolt = 1.4;
          m.shake = 2;
          pet.emit('gachaKick');
        }
        return;
      }
      const speed = st === 'turbo' ? 12 : st === 'drama' ? 3 : 5;
      const k = Math.floor(t * speed) % 4;
      if (k !== m.knob) {
        m.knob = k;
        if (st === 'turbo') sound.tone8(300 + t * 700, 220 + t * 600, 0.03, 'square', 0.05);
        else sound.tone8(420, 260, st === 'drama' ? 0.06 : 0.03, 'square', 0.05);
      }
      m.shake = 1 + (Math.floor(t * (st === 'turbo' ? 22 : 12)) % 2);
      const amp = st === 'turbo' ? 2 : 1;
      tp.reach = 0.4 + Math.sin(t * speed * 2) * 0.08 * amp;
      pet.tilt = Math.sin(t * speed * 2) * 0.04 * amp * pet.dir;
      pet.tiltPivot = { x: 0, y: 0 };
      if (g.up) {
        m.glow = ['#4a1a7e', '#7a1f6a', '#1a4a7e', '#2a1a5e'][Math.floor(t * 10) % 4];
        if (t >= (g.zap ?? 0)) {
          g.zap = t + 0.28;
          sound.tone8(900 + t * 500, 300, 0.07, 'sawtooth', 0.03);
          this.toys.furn.floatText(this.at('gacha', { x: 0.5, y: 0.35 }).x + rand(-12, 12), this.at('gacha', { x: 0.5, y: 0.3 }).y, pick(['✨', '⚡', '💫']));
        }
      }
      if (st === 'drama') {
        m.glow = ['#ff8a8a', '#ffe08a', '#8affc1', '#8ad8ff', '#d68aff'][Math.floor(t * 6) % 5];
        if (t >= (g.roll ?? 0)) {
          g.roll = t + 0.62;
          sound.sfx('drumroll', 0.8);
        }
      }
      if (t > T1 - 1.1 && g.tier >= 2) {
        m.glow = g.tier >= 3 ? (Math.floor(t * 8) % 2 ? '#ff8a8a' : '#ffe08a') : '#f0a8f5';
        if (g.tier >= 3) m.jolt = Math.max(m.jolt, 0.8);
        if (t >= g.beat) {
          g.beat = t + 0.12;
          sound.tone8(400 + (t - T1 + 1.1) * 900, 500 + (t - T1 + 1.1) * 1000, 0.05, 'triangle', 0.04);
        }
      }
      return;
    }
    if (!g.cap) {
      pet.tilt = 0;
      const high = st === 'turbo' || st === 'kick';
      this.popCap(g, pet, high);
      if (high) sound.sfx('boing');
      else sound.tone8(300, 900, 0.08, 'square', 0.06);
      pet.anim(st === 'turbo' ? pet.pickClip(['comemorar'], ['jump', 'idle']) : 'idle', { facing: 'front', restart: st === 'turbo' });
      return;
    }
    if (t < 3.3 + o) return;
    if (!g.held) {
      g.held = true;
      this.dropCap(g.cap);
      m.chute = '';
      tp.hold = capsuleIcon(g.prize.rarity);
      pet.anim(pet.pickClip(['pegar'], ['use_mainhand', 'idle']), { facing: 'front', restart: true });
      g.beat = t;
    }
    const openDur = st === 'drama' ? 2.2 : 1.2;
    if (t < 3.3 + o + openDur) {
      const k = (t - 3.3 - o) / openDur;
      tp.reach = 0.35 + k * 0.15;
      if (st === 'twist') {
        tp.angle = k * 540;
        if (t >= g.beat) {
          g.beat = t + 0.22;
          sound.sfx('ratchet', 0.7);
        }
        return;
      }
      tp.angle = Math.sin(t * (20 + k * 25)) * (5 + k * 14 + g.tier * 3) * (st === 'drama' ? 0.6 : 1);
      if (t >= g.beat) {
        if (st === 'drama') {
          g.beat = t + 0.55 - k * 0.25;
          sound.sfx('heartbeat', 0.8);
        } else {
          g.beat = t + 0.3 - k * 0.15;
          sound.tone8(500 + k * 400, 600 + k * 500, 0.04, 'square', 0.04);
        }
      }
      return;
    }
    if (!g.opened) {
      g.opened = true;
      tp.hold = null;
      tp.angle = 0;
      if (st === 'twist' || st === 'kick') sound.sfx('boing', 0.8);
      if (st === 'drama' && g.tier >= 1) sound.sfx('fanfare', 0.9);
      this.revealGacha(g, pet);
    }
    if (t >= (g.tier >= 2 ? 7.6 : 6.6) + o + openDur - 1.2) pet.timer = 0;
  }

  revealGacha(g, pet) {
    const { app } = this;
    const { prize, tier } = g;
    const rw = app.rewards;
    const color = RARITIES[prize.rarity].color;
    this.grant(prize);
    g.granted = true;
    const h = app.head || { x: pet.x, y: pet.y - pet.P };
    rw?.burst(h.x, h.y + pet.P * 0.25, 20 + tier * 35, 260 + tier * 140, [color, '#ffffff', color, '#f4f1ea']);
    this.prizeCard(prize, h);
    pet.adjust({ mood: [-4, 6, 12, 22][tier] });
    if (tier >= 3) pet.love(1.5);
    if (tier === 0) {
      app.sound.tone8(520, 260, 0.35, 'triangle', 0.06);
      pet.anim(pet.pickClip(['emote_neg'], ['idle']), { facing: 'front', restart: true });
    } else {
      rw?.fanfare(tier);
      pet.anim(pet.pickClip(['emote_pos', 'emote'], ['idle']), { facing: 'front', restart: true });
    }
    if (tier >= 2) {
      rw?.flash(color, tier >= 3 ? 0.45 : 0.25);
      rw?.confettiRain(tier >= 3 ? 220 : 90);
    }
    if (tier >= 3) {
      rw?.fireworks(6);
      this.m.gacha.jolt = 1.5;
    }
    if (g.up) {
      const c = this.at('gacha', { x: 0.5, y: 0.4 });
      rw?.burst(c.x, c.y, 40 + tier * 40, 320 + tier * 120, ['#ff3ea5', '#5ef0ff', '#7a3cff', '#ffd23f']);
      rw?.flash(tier >= 2 ? color : '#ff3ea5', 0.15 + tier * 0.08);
      if (tier >= 1) rw?.fireworks(1 + tier * 2);
      [0, 4, 7, 12, 16].slice(0, 2 + tier).forEach((s, i) => setTimeout(() => app.sound.tone8(523 * 2 ** (s / 12), 523 * 2 ** (s / 12), 0.12, 'square', 0.05), i * 80));
    }
    dollReact(app, ['😕', '🙂', '🤩', '🤯'][tier], tier >= 2 ? 'cheer' : null, 2);
    pet.emit('gachaPrize', { rarity: prize.rarity, kind: prize.kind, name: prizeName(prize), dupe: !!prize.dupe });
  }

  prizeCard(p, h) {
    const r = RARITIES[p.rarity];
    const el = document.createElement('div');
    el.className = `casino-prize r-${p.rarity}`;
    el.style.setProperty('--rc', r.color);
    const img = document.createElement('img');
    img.src = prizeArt(p);
    img.draggable = false;
    const label = document.createElement('b');
    label.textContent = `${r.label.toUpperCase()}${p.rarity === 'epico' ? '!!!' : p.rarity === 'raro' ? '!' : ''}`;
    const name = document.createElement('span');
    name.textContent = prizeName(p) + (p.dupe ? ` · repetido: +${p.dupe} ¥ para você` : '');
    el.append(img, label, name);
    el.style.left = `${Math.round(clamp(h.x, 110, innerWidth - 110))}px`;
    el.style.top = `${Math.round(Math.max(90, h.y - this.P * 0.3))}px`;
    document.body.append(el);
    setTimeout(() => el.remove(), 3400);
  }

  grant(p) {
    const { game } = this.app;
    if (p.kind === 'coins') this.pay(p.n);
    else if (p.kind === 'figure') {
      if (game.figures.includes(p.id)) {
        p.dupe = DUPE_COINS[p.rarity];
        this.pay(p.dupe);
      } else game.figures.push(p.id);
    } else game.inventory[p.id] = Math.min(999, game.count(p.id) + p.n);
    game.changed();
  }

  // Coins won at the machines go to the player.
  pay(n) {
    const { game } = this.app;
    game.coins += n;
    const p = game.profile;
    p.casinoCoins = (p.casinoCoins || 0) + n;
    if (n > 0) this.app.pet?.emit('earn', { n });
  }

  popCap(g, pet, high) {
    Object.assign(this.m.gacha, { knob: 0, shake: 0, glow: '', chute: RARITIES[g.prize.rarity].color });
    const c = this.at('gacha', GACHA_CHUTE);
    const el = this.toys.makeEl('toy flying casino-cap', capsuleIcon(g.prize.rarity));
    g.cap = { el, x: c.x, y: c.y, vx: Math.sign(pet.x - c.x || 1) * this.P * rand(0.9, 1.3), vy: -this.P * (high ? 2.8 : 1.6), rot: 0, s: this.P * 0.12, tx: pet.x + pet.dir * this.P * 0.12 };
    this.caps.push(g.cap);
  }

  endGacha(g, interrupted) {
    // Paid but interrupted: the capsule still rolls out of the chute before the prize is granted.
    if (!g.granted && !g.cap) this.popCap(g, this.app.pet, false);
    const cap = g.cap;
    if (cap) setTimeout(() => this.dropCap(cap), g.held ? 0 : 2200);
    Object.assign(this.m.gacha, { knob: 0, shake: 0, glow: '', chute: '' });
    this.app.pet.tilt = 0;
    if (!g.granted) {
      this.grant(g.prize);
      g.granted = true;
      this.float('gacha', GACHA_CHUTE, `🎁 ${prizeName(g.prize)}`, 40);
      const p = g.prize;
      if (p.kind === 'coins') this.app.gains?.show(`+¥ ${p.n}`, 'gain', 'Prêmio do Gacha');
      else this.app.gains?.show(p.dupe ? `+¥ ${p.dupe}` : prizeName(p), p.dupe ? 'gain' : 'item', p.dupe ? `${prizeName(p)} repetido` : 'Prêmio do Gacha', prizeArt(p) || '🎁');
      this.app.pet.emit('gachaPrize', { rarity: g.prize.rarity, kind: g.prize.kind, name: prizeName(g.prize), quiet: true });
    }
    if (this.cur === g) this.cur = null;
    if (!interrupted && g.tier >= 1) setTimeout(() => this.app.antics?.tryStart(g.tier >= 3 ? 'twirl' : 'hops'), 0);
  }

  dropCap(c) {
    c.el.remove();
    this.caps = this.caps.filter((x) => x !== c);
  }

  // Capsule bouncing out of the chute and rolling to her feet.
  updateCaps(dt, hidden) {
    const floor = this.toys.floorY();
    for (const c of this.caps) {
      c.vy += this.P * 9 * dt;
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      if (c.y > floor - c.s / 2) {
        c.y = floor - c.s / 2;
        if (Math.abs(c.vy) > this.P * 0.4) this.app.sound.tone8(900, 700, 0.03, 'square', 0.03);
        c.vy = -c.vy * 0.45;
        c.vx *= 0.8;
      }
      if ((c.tx - c.x) * Math.sign(c.vx) < this.P * 0.1) c.vx *= 1 - Math.min(1, dt * 8);
      c.rot += (c.vx / (c.s / 2)) * dt * 57;
      c.el.style.display = hidden ? 'none' : 'block';
      c.el.style.width = c.el.style.height = `${Math.round(c.s)}px`;
      c.el.style.transform = `translate(${Math.round(c.x - c.s / 2)}px, ${Math.round(c.y - c.s / 2)}px) rotate(${Math.round(c.rot)}deg)`;
    }
  }

  // ---------- slot ----------

  // A session of a few spins from her wallet (more when the player asked).
  slot(pet, end, asked) {
    const { game } = this.app;
    const t = game.toys.slot;
    if (this.wallet < 5) return false;
    // Budget of the session: on her own, at most a third of the spare money (asked: the whole wallet).
    const left = asked ? this.wallet : Math.max(5, Math.floor(this.spare() / 3));
    if (!asked) this.slotAt = Date.now() + 10 * 60000;
    const s = { id: 'slot', left, spins: asked ? randInt(3, 6) : randInt(2, 5), net: 0, streak: 0, phase: 'wait', wait: 0.5, st: 0, result: null, beat: 0, style: pickStyle(t, 'slot', STYLES.slot), up: !!t.up };
    this.cur = s;
    pet.dir = t.x < pet.x ? -1 : 1;
    pet.playToy({
      id: 'slot', dur: 180, anim: 'idle', facing: pet.side(),
      onEnd: (interrupted) => {
        this.endSlot(s, interrupted);
        end(interrupted);
      },
      tick: (dt, tp) => this.slotTick(dt, tp, s, pet),
    });
    pet.emit('slotStart', { asked });
    return true;
  }

  pull(s, pet) {
    const { game, sound } = this.app;
    const w = Math.min(this.wallet, s.left);
    s.bet = s.up ? (w >= 1000 ? 100 : w >= 400 ? 50 : w >= 120 ? 25 : w >= 10 ? 10 : 5) : w >= 300 ? 25 : w >= 100 ? 10 : 5;
    this.wallet -= s.bet;
    s.left -= s.bet;
    const p = game.profile;
    p.slotSpins = (p.slotSpins || 0) + 1;
    game.changed();
    s.result = rollSlot(luckOf(pet.affection) + (this.app.crow?.luck('slot') || 0) + (pet.buff?.('luck') ? 0.05 : 0));
    const stops = { turbo: [0.5, 0.75, 1], slowmo: [1.4, 2.2, 3] }[s.style] || [0.9, 1.35, 1.8];
    Object.assign(s, { resolved: false, phase: 'spin', st: 0, beat: 0, stops, started: false, ticks: 0, pre: s.style === 'lucky' ? 1 : 0 });
    const m = this.m.slot;
    m.mode = 'spin';
    m.line = 0;
    for (const r of m.reels) {
      r.target = null;
      r.done = false;
    }
    this.float('slot', SLOT_COIN, `👛 −${s.bet}`);
    sound.sfx('clink');
  }

  // First frame of a spin: the lever (or the SPIN button) and its sound.
  startSpin(s, pet) {
    const { sound } = this.app;
    s.started = true;
    if (s.style === 'button') {
      sound.sfx('beep2');
      pet.anim(pet.pickClip(['pegar'], ['use_mainhand', 'swing_hand', 'idle']), { facing: pet.side(), restart: true });
      return;
    }
    sound.tone8(160, 90, 0.12, 'sawtooth', 0.05);
    if (s.style === 'turbo') setTimeout(() => sound.sfx('laser', 0.7), 100);
    pet.anim(pet.pickClip(['pegar'], ['swing_hand', 'use_mainhand', 'idle']), { facing: pet.side(), restart: true });
  }

  slotTick(dt, tp, s, pet) {
    const m = this.m.slot;
    // Sopro da sorte: blows on her hands and rubs them before pulling.
    if (s.phase === 'spin' && s.pre > 0) {
      s.pre -= dt;
      tp.reach = 0.1 + Math.abs(Math.sin(s.pre * 14)) * 0.12;
      pet.tilt = Math.sin(s.pre * 20) * 0.03;
      pet.tiltPivot = { x: 0, y: 0 };
      if (!s.blown && s.pre < 0.7) {
        s.blown = true;
        this.app.sound.sfx('puff', 0.8);
        this.toys.furn.floatText(pet.x, pet.y - this.P * 1.1, '🍀');
        pet.anim('idle', { facing: 'front' });
      }
      if (s.pre <= 0) pet.tilt = 0;
      return;
    }
    if (s.phase === 'spin' && !s.started) this.startSpin(s, pet);
    if (s.phase !== 'spin') {
      s.wait -= dt;
      if (s.wait > 0) return;
      if (s.phase === 'result') {
        m.mode = 'idle';
        m.line = 0;
        s.phase = 'wait';
        s.wait = rand(0.3, 0.7);
        return;
      }
      if (s.spins <= 0 || this.wallet < 5 || s.left < 5) {
        pet.timer = 0;
        return;
      }
      return this.pull(s, pet);
    }
    s.st += dt;
    m.lever = s.style === 'button' ? 0 : s.st < 0.1 ? 1 : s.st < 0.4 ? 2 : s.st < 0.55 ? 1 : 0;
    tp.reach = s.style === 'button' ? (s.st < 0.25 ? 0.5 : 0.25) : s.st < 0.5 ? 0.55 - s.st * 0.5 : 0.25;
    const reels = m.reels;
    const pair = s.result[0] === s.result[1];
    // Two equal: the last reel spins longer and slower, the machine rumbles.
    const tease = pair && reels[1].done && !reels[2].done;
    const speed = { turbo: 26, slowmo: 10 }[s.style] || 16;
    reels.forEach((r, i) => {
      if (r.done) return;
      if (r.target == null) {
        r.pos -= (tease && i === 2 ? 9 : speed) * dt;
        if (s.st >= s.stops[i] + (i === 2 && pair ? 1.3 : 0)) r.target = this.targetFor(r, i, s.result[i]);
      } else {
        r.pos = Math.max(r.target, r.pos - Math.max(2.5, (r.pos - r.target) * 7) * dt);
        if (r.pos === r.target) {
          r.done = true;
          if (s.style === 'lucky') this.app.sound.sfx('ding', 0.6);
          else if (s.style === 'turbo') this.app.sound.tone8(440 + i * 220, 440 + i * 220, 0.05, 'square', 0.06);
          else this.app.sound.tone8(220, 140, 0.05, 'square', 0.07);
        }
      }
    });
    // Reels ticking while they turn.
    const turning = reels.find((r) => !r.done);
    if (turning) {
      const n = Math.floor(-turning.pos / 2);
      if (n !== s.ticks) {
        s.ticks = n;
        this.app.sound.sfx('tick', 0.5);
      }
    }
    if (s.up && turning && s.st >= (s.zap ?? 0)) {
      s.zap = s.st + 0.2;
      this.app.sound.tone8(600 + s.st * 400, 1200 + s.st * 500, 0.05, 'sawtooth', 0.025);
      m.jolt = Math.max(m.jolt, 0.2);
    }
    if (tease && s.st >= s.beat) {
      s.beat = s.st + 0.14;
      if (s.style === 'slowmo') this.app.sound.sfx('heartbeat', 0.7);
      else this.app.sound.tone8(500 + s.st * 200, 600 + s.st * 260, 0.05, 'triangle', 0.04);
      if (s.style === 'slowmo') s.beat = s.st + 0.5;
      m.jolt = Math.max(m.jolt, 0.35);
    }
    if (reels.every((r) => r.done)) this.resolve(s, pet);
  }

  // Next position (going down the strip) where the reel shows the symbol on the pay line.
  targetFor(r, i, sym) {
    const strip = SLOT_STRIPS[i];
    const n = strip.length;
    let T = Math.floor(r.pos) - 3;
    while (strip[((T % n) + n) % n] !== sym) T--;
    return T;
  }

  resolve(s, pet, quiet = false) {
    if (s.resolved) return;
    s.resolved = true;
    const { app } = this;
    const { game, sound } = app;
    const rw = app.rewards;
    const mult = slotPayout(s.result);
    const win = Math.round(s.bet * mult * (s.up ? 1.5 : 1));
    this.pay(win);
    s.net += win - s.bet;
    const p = game.profile;
    if (s.result[0] === s.result[1] && s.result[1] === s.result[2]) p.slotTriples = (p.slotTriples || 0) + 1;
    if (mult >= 100) p.jackpots = (p.jackpots || 0) + 1;
    if (win) p.slotWon = (p.slotWon || 0) + win;
    game.changed();
    s.spins--;
    s.phase = 'result';
    const tier = !mult ? 0 : mult >= 100 ? 4 : mult >= 20 ? 3 : mult >= 5 ? 2 : 1;
    s.wait = [0.9, 1.3, 1.6, 2.4, 3.4][tier];
    if (quiet) return;
    const m = this.m.slot;
    m.mode = mult ? 'win' : 'off';
    m.line = mult ? 1 : 0;
    if (!mult) {
      s.streak++;
      const lose = pick(['buzz', 'wahwah', 'old']);
      if (lose === 'old') sound.tone8(180, 110, 0.25, 'sawtooth', 0.05);
      else sound.sfx(lose, 0.8);
      pet.adjust({ mood: s.streak >= 3 ? -3 : -1.5 });
      if (s.streak >= 3 && Math.random() < 0.5) pet.anim(pet.pickClip(['emote_neg'], ['idle']), { facing: 'front', restart: true });
      pet.emit('slotLose', { streak: s.streak });
      return;
    }
    s.streak = 0;
    pet.adjust({ mood: [0, 2, 5, 12, 25][tier] });
    if (tier >= 4) pet.love(2);
    const tray = this.at('slot', SLOT_TRAY);
    this.toys.furn.floatText(tray.x, tray.y - this.P * 0.25, `+${win} ¥ para você`);
    this.app.gains?.show(`+¥ ${win}`, 'gain', 'Caça-níquel', '🎰');
    rw?.burst(tray.x, tray.y, 8 + tier * 18, 160 + tier * 90, GOLD);
    for (let k = 0; k < 2 + tier * 2; k++) setTimeout(() => sound.tone8(1500 + Math.random() * 500, 2100, 0.04, 'square', 0.04), k * 70);
    setTimeout(() => sound.sfx(pick(['coin', 'jingle', 'chime', 'bell']), 0.8), 160);
    if (tier >= 2) rw?.fanfare(Math.min(3, tier - 1));
    if (tier >= 3) {
      rw?.flash('#ffd23f', tier >= 4 ? 0.5 : 0.25);
      rw?.confettiRain(tier >= 4 ? 240 : 100);
      m.jolt = 1;
    }
    if (tier >= 4) {
      rw?.fireworks(8);
      this.toys.furn.floatText(tray.x, tray.y - this.P * 0.9, '💰 JACKPOT! 💰');
      m.jolt = 2;
    }
    if (s.up) {
      const c = this.at('slot', { x: 0.43, y: 0.4 });
      rw?.burst(c.x, c.y, 30 + tier * 40, 260 + tier * 130, ['#ff3ea5', '#5ef0ff', '#7a3cff', '#ffd23f']);
      rw?.flash(['#5ef0ff', '#ff3ea5', '#7a3cff', '#ffd23f'][tier % 4], 0.12 + tier * 0.08);
      if (tier >= 2) rw?.fireworks(tier * 2);
      [0, 4, 7, 11, 12, 16, 19].slice(0, 3 + tier).forEach((st, i) => setTimeout(() => sound.tone8(392 * 2 ** (st / 12), 392 * 2 ** (st / 12), 0.1, 'square', 0.045), 250 + i * 75));
      m.jolt = Math.max(m.jolt, 0.6 + tier * 0.3);
    }
    pet.anim(pet.pickClip(['emote_pos', 'emote'], ['idle']), { facing: 'front', restart: true });
    if (tier >= 2) pet.emit('gameExcite');
    dollReact(app, tier >= 3 ? '🤑' : '🙂', tier >= 3 ? 'cheer' : null, 1.6);
    pet.emit('slotWin', { mult, win });
    // After a big win she usually stops while ahead.
    if (tier >= 3 && Math.random() < 0.6) s.spins = 0;
  }

  endSlot(s, interrupted) {
    // The bet is in: the reels keep turning without her and pay out at the end.
    if (s.phase === 'spin' && s.result && !s.resolved) {
      this.m.slot.lever = 0;
      s.pre = 0;
      this.out = { s, interrupted };
      return;
    }
    this.closeSlot(s, interrupted);
  }

  spinOut(dt) {
    const { s } = this.out;
    const m = this.m.slot;
    if (!s.resolved) {
      s.st += dt;
      m.reels.forEach((r, i) => {
        if (r.done) return;
        if (r.target == null) {
          r.pos -= 16 * dt;
          if (s.st >= s.stops[i]) r.target = this.targetFor(r, i, s.result[i]);
        } else {
          r.pos = Math.max(r.target, r.pos - Math.max(2.5, (r.pos - r.target) * 7) * dt);
          if (r.pos === r.target) {
            r.done = true;
            this.app.sound.tone8(220, 140, 0.05, 'square', 0.07);
          }
        }
      });
      if (!m.reels.every((r) => r.done)) return;
      const net = s.net;
      this.resolve(s, this.app.pet, true);
      const win = s.net - net + s.bet;
      m.mode = win ? 'win' : 'off';
      m.line = win ? 1 : 0;
      if (win) {
        const tray = this.at('slot', SLOT_TRAY);
        this.toys.furn.floatText(tray.x, tray.y - this.P * 0.25, `+${win} ¥ para você`);
        this.app.gains?.show(`+¥ ${win}`, 'gain', 'Caça-níquel', '🎰');
        this.app.sound.sfx('coin', 0.8);
      } else this.app.sound.sfx('buzz', 0.6);
      this.out.hold = 1.6;
      return;
    }
    if ((this.out.hold -= dt) > 0) return;
    const { interrupted } = this.out;
    this.out = null;
    this.closeSlot(s, interrupted);
  }

  closeSlot(s, interrupted) {
    const m = this.m.slot;
    Object.assign(m, { lever: 0, mode: 'idle', line: 0 });
    if (this.cur === s) this.cur = null;
    this.app.pet.emit('slotEnd', { net: s.net, interrupted });
    if (!interrupted && s.net > 0) setTimeout(() => this.app.antics?.tryStart('hops'), 0);
  }

  // Reels drawn over the glass of the machine (3 rows visible, the middle one is the pay line).
  drawReels(el, t, hidden) {
    let c = el.querySelector('canvas.slot-reels');
    if (!c) {
      c = document.createElement('canvas');
      c.className = 'slot-reels';
      c.width = 160;
      c.height = 90;
      el.append(c);
      this.symImg ||= SLOT_SYMBOLS.map((s) => Object.assign(new Image(), { src: icon(s.pix) }));
    }
    const W = SLOT_WINDOW;
    const left = `${((t.flip ? 1 - W.x - W.w : W.x) * 100).toFixed(2)}%`;
    if (c.style.left !== left) Object.assign(c.style, { left, top: `${(W.y * 100).toFixed(2)}%`, width: `${(W.w * 100).toFixed(2)}%`, height: `${(W.h * 100).toFixed(2)}%` });
    if (hidden) return;
    const m = this.m.slot;
    const on = !!m.line && m.lit % 2 === 1;
    const up = !!this.app.game.toys.slot?.up;
    const key = `${up}|${m.reels.map((r) => r.pos.toFixed(2)).join()}|${on}|${this.symImg.every((i) => i.complete)}`;
    if (c.dataset.key === key) return;
    c.dataset.key = key;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.fillStyle = up ? '#120c24' : '#1d1a26';
    g.fillRect(0, 0, 160, 90);
    m.reels.forEach((r, i) => {
      const x0 = i * 60;
      const strip = SLOT_STRIPS[i];
      const n = strip.length;
      const fast = !r.done && r.target == null;
      g.save();
      g.beginPath();
      g.rect(x0, 0, 40, 90);
      g.clip();
      g.fillStyle = up ? '#2a1a4e' : '#f4f1ea';
      g.fillRect(x0, 0, 40, 90);
      for (let j = Math.ceil(r.pos - 2); j <= Math.floor(r.pos + 2); j++) {
        const img = this.symImg[strip[((j % n) + n) % n]];
        if (!img.complete) continue;
        const y = 30 + (j - r.pos) * 30;
        if (fast) {
          g.globalAlpha = 0.3;
          g.drawImage(img, x0 + 7, y - 7, 26, 26);
          g.globalAlpha = 0.7;
        }
        g.drawImage(img, x0 + 7, y + 2, 26, 26);
        g.globalAlpha = 1;
      }
      g.restore();
    });
    const grd = g.createLinearGradient(0, 0, 0, 90);
    grd.addColorStop(0, 'rgba(0,0,0,0.55)');
    grd.addColorStop(0.3, 'rgba(0,0,0,0)');
    grd.addColorStop(0.7, 'rgba(0,0,0,0)');
    grd.addColorStop(1, 'rgba(0,0,0,0.55)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 160, 90);
    g.fillStyle = on ? (up ? '#5ef0ff' : '#ffd23f') : up ? 'rgba(255, 62, 165, 0.85)' : 'rgba(226, 59, 59, 0.8)';
    g.fillRect(0, on ? 43 : 44, 160, on ? 4 : 2);
    if (on) {
      g.strokeStyle = '#ffd23f';
      g.lineWidth = 3;
      for (let i = 0; i < 3; i++) g.strokeRect(i * 60 + 1.5, 31.5, 37, 27);
    }
  }

  update(dt, hidden) {
    const { pet, game } = this.app;
    if (this.order && !this.cur && pet.action !== 'goto') this.dropOrder();
    this.updateCaps(dt, hidden);
    if (this.out) this.spinOut(dt);
    this.vend.update(dt, hidden);
    for (const id of ['gacha', 'slot']) {
      const m = this.m[id];
      m.litT -= dt;
      if (m.litT <= 0) {
        m.lit++;
        m.litT = id === 'slot' ? { idle: 0.7, spin: 0.1, win: 0.14, off: 0.5 }[m.mode] : this.cur?.id === 'gacha' ? 0.12 : 0.8;
      }
      m.jolt = Math.max(0, m.jolt - dt * 2);
      const el = this.toys.els.get(id);
      if (!el) continue;
      const shake = m.jolt > 0 ? `${((Math.random() * 2 - 1) * m.jolt * 2).toFixed(1)}px ${(-Math.random() * m.jolt * 2).toFixed(1)}px` : '';
      if (el.style.translate !== shake) el.style.translate = shake;
      if (id === 'slot' && game.toys.slot) this.drawReels(el, game.toys.slot, hidden);
    }
  }
}
