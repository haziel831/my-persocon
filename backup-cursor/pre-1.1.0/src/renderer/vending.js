// Japanese vending machines (furniture): one for food and one for drinks. When hungry/thirsty she
// walks to the machine and buys, with her own wallet (profile.wallet), something she loves, likes or
// finds ok (store price +20%) and eats/drinks it right there. Without enough money she just looks sad.
// The player's coins are never created here: she only spends her wallet.
import { ITEMS, TASTE_RANK } from './game.js';
import { STYLES, pickStyle, vendFrame, vendCell, VEND_COIN, VEND_TRAY, VEND_TRAY_COLORS } from './casinoitems.js';
import { dollReact } from './watch.js';

const pick = (l) => l[Math.floor(Math.random() * l.length)];
const clamp = (v, a, b) => Math.min(Math.max(v, a), b);

export const VEND_MARKUP = 1.2;
const KINDS = { venda_comida: 'comidas', venda_bebida: 'bebidas' };
const STAT = { comidas: 'hunger', bebidas: 'thirst' };

export class Vending {
  constructor(app, toys, casino) {
    this.app = app;
    this.toys = toys;
    this.casino = casino;
    this.cur = null;
    this.order = null;
    this.m = {};
    this.brokeAt = -1e9;
  }

  get P() {
    return this.app.pet.P;
  }

  owns(id) {
    return id in KINDS;
  }

  state(id) {
    return (this.m[id] ||= { lit: 0, litT: 0, sel: -1, blink: 0, blinkT: 0, led: '', ic: false, tray: '', empty: -1, jolt: 0 });
  }

  art(id) {
    const m = this.state(id);
    return vendFrame(id === 'venda_comida' ? 'comida' : 'bebida', m.lit % 3, m.sel, m.sel >= 0 ? m.blink % 2 : 0, m.led, m.ic, m.tray, m.empty);
  }

  // Only used when she needs it (toys.needsSupply) or when the player asks.
  usable() {
    return false;
  }

  spot(id, t) {
    return t.x + (t.flip ? -1 : 1) * this.P * 0.2;
  }

  priceOf(item) {
    return Math.ceil(item.price * VEND_MARKUP);
  }

  // Favorites first, then what she likes, then neutral ones; with none of those known yet, something
  // she never tasted. Never what she dislikes or hates.
  choose(cat, wallet) {
    const game = this.app.game;
    const all = ITEMS.filter((i) => i.cat === cat && !i.legacy && !i.watchOnly && !i.loot && !i.buff && i.price > 0)
      .map((item) => ({ item, rank: TASTE_RANK[game.tasteOf(item.id)] ?? -1 }));
    const known = all.filter((e) => e.rank >= TASTE_RANK.ok);
    const list = known.length ? known : all.filter((e) => e.rank === -1);
    const ok = list.filter((e) => this.priceOf(e.item) <= wallet);
    if (!ok.length) return { broke: list.length > 0 };
    const w = ok.map((e) => (e.rank === TASTE_RANK.love ? 10 : e.rank === TASTE_RANK.like ? 4 : 1));
    let r = Math.random() * w.reduce((a, b) => a + b, 0);
    for (let i = 0; i < ok.length; i++) if ((r -= w[i]) <= 0) return { item: ok[i].item };
    return { item: ok[0].item };
  }

  machine(cat) {
    const key = cat === 'comidas' ? 'venda_comida' : cat === 'bebidas' ? 'venda_bebida' : null;
    const t = key && this.app.game.toys[key];
    return t?.placed && !t.broken && this.toys.reach(t) ? key : null;
  }

  // Called by toys.needsSupply when she is hungry/thirsty: { x, use } to walk there, or null.
  // likedInBag: the backpack already has something she likes (then she buys only sometimes).
  plan(cat, likedInBag) {
    const key = this.machine(cat);
    if (!key || this.cur || this.app.pet.dead) return null;
    if (likedInBag && Math.random() > 0.35) return null;
    const c = this.choose(cat, this.casino.wallet);
    if (!c.item) {
      if (!c.broke || performance.now() - this.brokeAt < 240000) return null;
      this.brokeAt = performance.now();
    }
    return { x: this.spot(key, this.app.game.toys[key]), use: () => this.go(key, c.item || null) };
  }

  go(id, item) {
    this.order = { id, item };
    this.toys.play(id, this.app.pet);
  }

  // Click on the machine: asks her to buy something (with her wallet).
  click(id, x, y, no, say) {
    const { pet, antics, minigames } = this.app;
    if (this.cur) return no('Ela já está comprando!');
    const cat = KINDS[id];
    if (pet.stats[STAT[cat]] > 92) return no(cat === 'comidas' ? 'Ela está sem fome agora' : 'Ela está sem sede agora');
    const w = this.casino.wallet;
    const c = this.choose(cat, w);
    if (!c.item) return no(c.broke ? `Carteira dela: 🪙 ${w} · não dá para nada que ela goste (Ações → Carteira)` : 'Nada aqui que ela queira');
    if (pet.mode !== 'ground' || pet.surfaceId !== 'floor' || pet.chase || pet.mini || pet.eating || pet.meals?.length || pet.activity || pet.ballPlay || minigames?.active
      || !['idle', 'walk', 'run', 'sit', 'emote', 'toy', 'antic', 'goto', 'react'].includes(pet.action)) return no('Ela está ocupada agora');
    if (pet.toyPlay) pet.endToy(true);
    if (pet.action === 'antic') antics?.stop(false);
    if (!pet.goTo(this.toys.spot(id), () => this.go(id, c.item))) return no('Ela está ocupada agora');
    this.app.sound.play('ok', { volume: 0.4 });
    say(`👛 ${w}`);
  }

  play(id, pet, end) {
    const { game } = this.app;
    const o = this.order?.id === id ? this.order : null;
    this.order = null;
    if (!o) {
      pet.chooseNext();
      return true;
    }
    const t = game.toys[id];
    let item = o.item;
    if (item && this.priceOf(item) > this.casino.wallet) item = null;
    const v = {
      id, item, price: item ? this.priceOf(item) : 0, style: item ? pickStyle(null, 'venda', STYLES.venda) : 'broke',
      cell: item ? [...item.id].reduce((a, ch) => a + ch.charCodeAt(0), 0) % 12 : -1, beat: 0, coins: 0,
    };
    v.color = VEND_TRAY_COLORS[(v.cell * 5 + 12) % 12];
    this.cur = v;
    pet.dir = t.x < pet.x ? -1 : 1;
    pet.playToy({
      id, dur: 40, anim: 'idle', facing: 'back', holdSize: 0.12,
      onEnd: (interrupted) => {
        this.finish(v, interrupted);
        end(interrupted);
      },
      tick: (dt, tp) => this.tick(dt, tp, v, pet),
    });
    pet.emit('vendStart', { item, kind: KINDS[id] });
    return true;
  }

  float(id, f, text, dy = 16) {
    this.casino.float(id, f, text, dy);
  }

  pay(v) {
    const { game } = this.app;
    v.paid = true;
    this.casino.wallet -= v.price;
    const p = game.profile;
    p.vendBuys = (p.vendBuys || 0) + 1;
    p.vendSpent = (p.vendSpent || 0) + v.price;
    game.changed();
    this.float(v.id, VEND_COIN, `👛 −${v.price}`);
  }

  // Timeline: look → pay (coins or card) → button → the product drops (sometimes it gets stuck, or
  // the lottery runs) → she takes it from the tray and eats/drinks it (finish → pet.feed).
  tick(dt, tp, v, pet) {
    const { sound } = this.app;
    const m = this.state(v.id);
    const t = tp.t;
    const st = v.style;
    if (st === 'broke') return this.brokeTick(t, tp, v, pet, m);
    const L = st === 'indecisive' ? 3.2 : 0.9;
    if (t < L) {
      tp.reach = 0.3 + Math.sin(t * 2) * 0.05;
      if (st === 'indecisive' && t >= v.beat) {
        v.beat = t + 0.75;
        m.sel = (v.cell + 1 + Math.floor(Math.random() * 11)) % 12;
        sound.sfx('select', 0.6);
        if (!v.hmm) {
          v.hmm = true;
          this.toys.furn.floatText(pet.x, pet.y - this.P * 1.15, '🤔');
        }
        pet.tilt = (Math.random() < 0.5 ? -1 : 1) * 0.05;
        pet.tiltPivot = { x: 0, y: 0 };
      }
      return;
    }
    const card = st === 'card';
    const P1 = L + (card ? 0.7 : 1.1);
    if (t < P1) {
      if (!v.paid) {
        pet.tilt = 0;
        m.sel = -1;
        this.pay(v);
        if (card) {
          m.ic = true;
          sound.sfx('beep2');
        }
        v.n = card ? 0 : clamp(Math.ceil(v.price / 40), 2, 5);
      }
      tp.reach = 0.55 + Math.sin(t * 12) * 0.04;
      if (!card && v.coins < v.n && t >= L + (v.coins * 1) / v.n) {
        v.coins++;
        sound.sfx('clink', 0.9);
      }
      return;
    }
    if (m.ic) m.ic = false;
    const S = P1 + 0.45;
    if (t < S) {
      if (m.sel !== v.cell) {
        m.sel = v.cell;
        sound.sfx('beep');
      }
      tp.reach = 0.45;
      return;
    }
    // The product drops down the glass into the tray.
    const stuck = st === 'stuck';
    const D = S + (stuck ? 2.2 : 0.9);
    if (t < D) {
      if (!v.drop) this.startDrop(v, m);
      const k = t - S;
      if (stuck) {
        if (k < 0.5) this.dropAt(v, k / 0.5 * 0.35);
        else if (k < 1.5) {
          if (!v.stuckSaid) {
            v.stuckSaid = true;
            sound.sfx('buzz', 0.7);
            this.toys.furn.floatText(pet.x, pet.y - this.P * 1.15, '❗');
          }
          if (k > 1.0 && !v.kicked) {
            v.kicked = true;
            pet.anim(pet.pickClip(['chutar'], ['swing_hand', 'use_mainhand', 'idle']), { facing: 'back', restart: true });
            sound.sfx('bonk', 1.3);
            m.jolt = 1.3;
            pet.emit('vendStuck');
          }
          this.dropAt(v, 0.35);
        } else this.dropAt(v, 0.35 + ((k - 1.5) / 0.7) * 0.65);
      } else this.dropAt(v, Math.min(1, k / 0.6));
      return;
    }
    if (!v.landed) {
      v.landed = true;
      this.endDrop(v);
      m.tray = v.color;
      m.sel = -1;
      sound.sfx('clunk');
    }
    // Lottery: 4 rolling digits, four sevens give one more for free.
    const R = D + (st === 'lucky' ? 2 : 0);
    if (t < R) {
      const k = Math.floor((t - D) * 12);
      if (k !== v.roll) {
        v.roll = k;
        const d = String(k % 10);
        m.led = d.repeat(4);
        sound.sfx('tick', 0.8);
      }
      return;
    }
    if (st === 'lucky' && !v.lotto) {
      v.lotto = true;
      const win = Math.random() < 0.08;
      m.led = win ? '7777' : `777${pick([1, 2, 3, 4, 5, 6, 8, 9])}`;
      if (win) {
        v.bonus = true;
        sound.sfx('fanfare');
        this.float(v.id, VEND_TRAY, '🎉 7777! Mais um grátis!', 50);
        pet.emit('vendLucky');
      } else sound.sfx('wahwah', 0.6);
    }
    const K = R + (st === 'lucky' ? 0.8 : 0);
    if (t < K) return;
    if (!v.taking) {
      v.taking = true;
      pet.tilt = 0;
      pet.anim(pet.pickClip(['pegar'], ['use_mainhand', 'swing_hand', 'idle']), { facing: 'front', restart: true });
    }
    if (t >= K + 0.5 && !v.taken) {
      v.taken = true;
      m.tray = '';
      tp.hold = v.item.img;
      tp.reach = 0.35;
      sound.sfx(KINDS[v.id] === 'bebidas' ? 'can' : 'select', 0.8);
      pet.anim('idle', { facing: 'front' });
      pet.emit('vendBuy', { item: v.item, price: v.price });
      dollReact(this.app, KINDS[v.id] === 'bebidas' ? '🥤' : '🍙', null, 1.4);
    }
    if (t >= K + 1.3) pet.timer = 0;
  }

  // No money: checks the coin slot, opens her wallet, sighs.
  brokeTick(t, tp, v, pet, m) {
    const { sound } = this.app;
    if (t < 1) {
      tp.reach = 0.55;
      return;
    }
    if (!v.said) {
      v.said = true;
      sound.sfx('buzz', 0.6);
      m.led = '----';
      this.toys.furn.floatText(pet.x, pet.y - this.P * 1.15, `👛 ${this.casino.wallet}`);
    }
    if (t >= 1.6 && !v.sad) {
      v.sad = true;
      pet.anim(pet.pickClip(['emote_neg', 'triste'], ['idle']), { facing: 'front', restart: true });
      pet.adjust({ mood: -2 });
      pet.emit('vendBroke');
      dollReact(this.app, '😢', null, 1.6);
    }
    if (t >= 3.6) pet.timer = 0;
  }

  startDrop(v, m) {
    const c = this.casino.at(v.id, vendCell(v.cell));
    const el = this.toys.makeEl('toy flying vend-drop', v.item.img);
    v.drop = { el, x0: c.x, y0: c.y };
    m.empty = v.cell;
    this.app.sound.sfx('whirr', 0.8);
  }

  dropAt(v, k) {
    const d = v.drop;
    if (!d) return;
    const b = this.casino.at(v.id, VEND_TRAY);
    const s = Math.round(this.P * 0.09);
    const e = k * k;
    const x = d.x0 + (b.x - d.x0) * k;
    const y = d.y0 + (b.y - d.y0) * e;
    d.el.style.width = d.el.style.height = `${s}px`;
    d.el.style.transform = `translate(${Math.round(x - s / 2)}px, ${Math.round(y - s / 2)}px) rotate(${Math.round(k * 200)}deg)`;
  }

  endDrop(v) {
    v.drop?.el.remove();
    v.drop = null;
  }

  finish(v, interrupted) {
    const { game, pet } = this.app;
    const m = this.state(v.id);
    this.endDrop(v);
    Object.assign(m, { sel: -1, empty: -1, ic: false, led: '', tray: '' });
    pet.tilt = 0;
    if (v.paid && v.item) {
      const n = v.bonus ? 2 : 1;
      let stored = n;
      if (!interrupted && v.taken && pet.feed(v.item)) stored--;
      if (stored) {
        game.inventory[v.item.id] = Math.min(99, game.count(v.item.id) + stored);
        this.float(v.id, VEND_TRAY, `🎒 ${v.item.name}${stored > 1 ? ` ×${stored}` : ''} → mochila`, 40);
      }
      game.changed();
    }
    if (this.cur === v) this.cur = null;
  }

  update(dt, hidden) {
    for (const id of Object.keys(KINDS)) {
      const el = this.toys.els.get(id);
      if (!el) continue;
      const m = this.state(id);
      const busy = this.cur?.id === id;
      m.litT -= dt;
      if (m.litT <= 0) {
        m.lit++;
        m.litT = busy ? 0.15 : 0.6;
      }
      m.blinkT -= dt;
      if (m.blinkT <= 0) {
        m.blink++;
        m.blinkT = 0.15;
      }
      m.jolt = Math.max(0, m.jolt - dt * 2);
      const shake = m.jolt > 0 ? `${((Math.random() * 2 - 1) * m.jolt * 2).toFixed(1)}px ${(-Math.random() * m.jolt * 2).toFixed(1)}px` : '';
      if (el.style.translate !== shake) el.style.translate = shake;
    }
    const d = this.cur?.drop;
    if (d) d.el.style.display = hidden ? 'none' : 'block';
  }
}
