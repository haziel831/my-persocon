// The crow (Shop → Specials, comes in a Caixa Misteriosa): a 3D bird (Bedrock model in assets/crow)
// that hops around, flies, perches on windows and on the Persocon's head, and learns skills she
// teaches it (she picks which). Skills stay hidden until learned:
//   procurar: flies off screen and comes back a while later with a random gift (even coins);
//   pegar: fetches what the 3D printer makes into the player inventory;
//   vigiar: warns when one of her stats gets low;  brilhos: pecks up small coins or a common loot item;
//   sorte: extra luck in the Gacha, the slot machine and the boxes;  truques: little shows that cheer her up;
//   imitar: repeats what she says (or the player's name);  consertar: sometimes fixes a broken toy;
//   cantar: sings when she is sad;  entregar: brings food/drink from the backpack;  ninar: watches her sleep;
//   guardar: picks up small toys left on the floor and sets them on top of furniture.
import * as THREE from './vendor/three.module.js';
import { buildModel } from './model.js';
import { loadClips, Animator } from './animation.js';
import { ITEMS, itemById } from './game.js';
import { LOOT_ITEMS } from './lootitems.js';
import { defineIcons, icon, emojiOnly } from './pixel.js';
import { CONSOLE_SLOTS } from './furniture.js';

const clamp = (v, a, b) => Math.min(Math.max(v, a), b);
const rand = (a, b) => a + Math.random() * (b - a);
const chance = (p) => Math.random() < p;
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const asset = (f) => new URL(`./assets/crow/${f}`, import.meta.url).href;

export const CROW_SKILLS = {
  procurar: { name: 'Procurar...', icon: '🔎', note: 'Voa para longe e volta depois de um tempo com um presente (às vezes moedas)' },
  pegar: { name: 'Pegar...', icon: '🪶', note: 'Busca o que a impressora 3D imprime e guarda no Inventário, bem mais rápido que a Persocon, vários de uma vez' },
  vigiar: { name: 'Vigiar...', icon: '👁', note: 'Avisa quando a fome, a sede, a energia, a higiene ou a saúde da Persocon ficam baixas' },
  brilhos: { name: 'Brilhos...', icon: '✨', note: 'De vez em quando cata no chão uma moedinha ou uma pecinha para a coleção' },
  sorte: { name: 'Sorte...', icon: '🍀', note: 'Na tela, dá um pouco mais de sorte no Gacha, no caça-níquel e nas caixas' },
  truques: { name: 'Truques...', icon: '🎩', note: 'Faz piruetas, cambalhotas e se finge de morto para alegrar a Persocon' },
  imitar: { name: 'Imitar...', icon: '🦜', note: 'Repete o que a Persocon fala (e o seu nome), do jeito dele' },
  consertar: { name: 'Consertar...', icon: '🔧', note: 'Bica um brinquedo ou móvel quebrado e às vezes consegue consertar de graça' },
  cantar: { name: 'Cantar...', icon: '🎵', note: 'Canta para a Persocon quando ela está triste (+humor)' },
  entregar: { name: 'Entregar...', icon: '🎒', note: 'Com fome ou sede longe da mochila, leva a comida ou a bebida até ela' },
  ninar: { name: 'Ninar...', icon: '🌙', note: 'Fica do lado dela enquanto dorme: acorda com mais energia e de bom humor' },
  guardar: { name: 'Guardar...', icon: '📦', note: 'Pega brinquedos espalhados no chão e guarda no topo das mobílias' },
};
// As Skills de Combate do Corvo: ele aprende pelo treinamento normal, mas só valem na luta.
// 56-80: ataque/ataque/suporte/suporte/suporte/suporte.
export const CROW_COMBAT_SKILLS = {
  rasante: { name: 'Rasante Sombrio', icon: '🪶', note: 'Mergulha de bico no inimigo: dano físico leve, ao alcance de qualquer onda', combat: true, kind: 'attack' },
  penas: { name: 'Penas Cortantes', icon: '🗡', note: 'Atira penas afiadas: dano pequeno + sangramento que corrói o inimigo por 4 turnos', combat: true, kind: 'attack' },
  bicada: { name: 'Bicada nos Olhos', icon: '👁', note: 'Dano baixo, mas deixa o inimigo cego (erra mais) por 2 turnos', combat: true, kind: 'attack' },
  grito: { name: 'Grito de Alerta', icon: '📢', note: 'Alerta a Persocon: ela desvia e bloqueia bem melhor no próximo turno inimigo', combat: true, kind: 'support' },
  busca: { name: 'Busca de Emergência', icon: '🎒', note: 'Usa o turno para buscar um item de cura do Inventário e dar à Persocon', combat: true, kind: 'support' },
  provocacao: { name: 'Provocação Aérea', icon: '💨', note: 'Distrai o inimigo no ar: a defesa dele cai 25% por 2 turnos', combat: true, kind: 'support' },
};
Object.assign(CROW_SKILLS, CROW_COMBAT_SKILLS);
// Vigiar: stat, level that worries it, icon and the name in the toast.
const WATCH = [
  ['hunger', 20, '🍙', 'Fome'], ['thirst', 20, '💧', 'Sede'], ['energy', 12, '💤', 'Energia'],
  ['hygiene', 20, '🧼', 'Higiene'], ['health', 30, '❤️', 'Saúde'],
];
const LUCK = 0.2;
const base = (k) => String(k).split('#')[0];
// Perched on a piece of furniture: what it says and does there ([bubble, animation]).
const FURN_FX = {
  cama: ['💤', 'idle'], banheira: ['💧', 'peck'], estante: ['📚', 'peck'], videogame: ['🎮', 'caw'], gacha: ['🎰', 'peck'],
  slot: ['🍒', 'caw'], venda_comida: ['🍙', 'peck'], venda_bebida: ['🥤', 'peck'], alvo: ['🎯', 'peck'], aquario: ['🐟', 'peck'],
  almofada: ['☁️', 'idle'],
};
// The same pieces after an upgrade.
const FURN_FX_UP = {
  cama: ['💤', 'idle'], banheira: ['✨', 'peck'], estante: ['✨', 'peck'], videogame: ['🎮', 'caw'], gacha: ['🤖', 'peck'],
  slot: ['💎', 'caw'], alvo: ['🔫', 'caw'], aquario: ['🐠', 'peck'], almofada: ['✨', 'idle'], impressora: ['✨', 'peck'],
};
const TRICK = { spin: 0.8, flip: 0.9, dead: 2 };
const XP = 100;
const SEARCH_GAP = [6, 14];
// How often it caws on its own (seconds between calls); "Calado" only answers when poked.
const TALK = [
  { name: 'Calado', gap: null },
  { name: 'Pouco', gap: [40, 80] },
  { name: 'Normal', gap: [14, 30] },
  { name: 'Muito', gap: [5, 11] },
];
const RON_TAPS = 13;
const TAP_GAP = 600;

// Shop picture: a purple crate with air holes and a big "?".
defineIcons({
  crowbox: (sprite) => sprite(20, 18, ({ rect, px }) => {
    rect(1, 5, 18, 12, '#5b3a8c'); rect(1, 15, 18, 2, '#3b2260'); rect(0, 2, 20, 4, '#7a52b8'); rect(0, 5, 20, 1, '#3b2260');
    rect(3, 8, 1, 1, '#1a0d2e'); rect(16, 8, 1, 1, '#1a0d2e'); rect(3, 12, 1, 1, '#1a0d2e'); rect(16, 12, 1, 1, '#1a0d2e');
    rect(8, 7, 4, 1, '#ffd84a'); rect(11, 8, 1, 2, '#ffd84a'); rect(9, 10, 2, 1, '#ffd84a'); rect(9, 11, 1, 1, '#ffd84a'); rect(9, 13, 1, 1, '#ffd84a');
    px(5, 3, '#ffffff66'); px(6, 3, '#ffffff66');
  }),
  // The crow itself (menus and toasts): a little black bird facing right.
  crow: (sprite) => sprite(16, 13, ({ rect, px }) => {
    const K = '#16161d', G = '#34344a', L = '#5a5a66';
    rect(10, 1, 4, 3, K); rect(14, 2, 2, 1, L); px(12, 2, '#ffffff');
    rect(5, 3, 8, 5, K); rect(4, 4, 1, 3, K); rect(6, 4, 5, 2, G);
    rect(1, 5, 4, 2, K); rect(0, 6, 2, 1, K);
    rect(8, 8, 1, 3, L); rect(10, 8, 1, 3, L); rect(7, 11, 2, 1, L); rect(10, 11, 2, 1, L);
  }),
});

export function crowIcon() {
  const img = document.createElement('img');
  img.src = icon('crow');
  img.className = 'crow-ico';
  img.draggable = false;
  return img;
}

export class Crow {
  constructor(app) {
    this.app = app;
    this.x = null;
    this.y = 0;
    this.lift = 0;
    this.dir = -1;
    this.act = null;
    this.perch = 'floor';
    this.duo = null;
    this.carry = [];
    this.pokes = [];
    this.load();
    if (app.pet) app.pet.tryCrow = () => this.tryPet();
    // Curious about freshly upgraded furniture: flies over to inspect it.
    app.pet?.on((type, d) => {
      if (type !== 'toyUpgraded' || !this.free || this.offscreen) return;
      setTimeout(() => { if (this.free) this.toFurniture(d?.id); }, 1200);
    });
  }

  get P() {
    return this.app.pet.P;
  }

  get H() {
    return this.P * 0.36;
  }

  // Not drawn for a while (minimized, pet hidden, out searching).
  get offscreen() {
    return performance.now() - (this.seenAt || 0) > 1500;
  }

  get owned() {
    return !!this.app.game?.gear?.corvo;
  }

  get data() {
    const p = this.app.game.profile;
    p.crow ||= { focus: null, xp: {}, learned: [], trains: 0, gifts: 0, searchAt: 0, away: null, born: false };
    return p.crow;
  }

  get activeSkills() {
    return Object.keys(CROW_SKILLS).filter((id) => !CROW_SKILLS[id].off);
  }

  get allLearned() {
    return this.activeSkills.every((id) => this.learned(id));
  }

  // Entry in the gains feed when it uses a skill.
  used(id, text, kind = 'skill', ic = null) {
    this.app.gains?.show(text, kind, `Corvo: ${CROW_SKILLS[id].name}`, ic || CROW_SKILLS[id].icon);
    this.app.pet?.emit('crowSkill', { id, name: CROW_SKILLS[id].name });
  }

  learned(id) {
    return this.data.learned.includes(id);
  }

  // Ele tem alguma Skill de Combate aprendida e está livre para entrar na luta?
  get combatReady() {
    if (!this.owned || this.x == null || this.away || this.duo || this.fetching || this.carry?.length || this.leaving || this.trick) return false;
    return Object.keys(CROW_COMBAT_SKILLS).some((id) => this.learned(id));
  }

  // XP do Corvo pelas Skills de Combate usadas em luta.
  combatGain(id, amount = 26) {
    const d = this.data;
    d.xp = d.xp || {};
    d.xp[id] = (d.xp[id] || 0) + amount;
    if (d.xp[id] >= XP && !this.learned(id)) {
      d.learned.push(id);
      d.xp[id] = 0;
      this.app.minigames?.toast?.(`O Corvo aprendeu: ${CROW_SKILLS[id].name}`, icon('crow'));
      this.app.sound?.crow?.('learn');
      this.app.pet?.emit('crowLearn', { id, combat: true });
    }
    this.app.game.changed?.();
  }

  get away() {
    return !!this.data.away;
  }

  // Around and free (not away, not fetching, not in a duo).
  get free() {
    return this.owned && this.x != null && !this.away && !this.duo && !this.fetching && !this.carry.length && !this.leaving && !this.trick;
  }

  floorY() {
    const w = this.app.world;
    return (w.surfaces.find((s) => s.id === 'floor') || w.surfaces[0])?.y ?? innerHeight;
  }

  async load() {
    try {
      const [geo, anim] = await Promise.all(['crow.geo.json', 'crow.animation.json'].map((f) => fetch(asset(f)).then((r) => r.json())));
      const tex = await new THREE.TextureLoader().loadAsync(asset('crow.png'));
      tex.magFilter = tex.minFilter = THREE.NearestFilter;
      tex.generateMipmaps = false;
      tex.colorSpace = THREE.SRGBColorSpace;
      this.model = buildModel(geo, tex);
      const clips = loadClips([{ animations: Object.fromEntries(Object.entries(anim.animations).map(([k, v]) => [k.replace('animation.crow.', ''), v])) }]);
      this.animator = new Animator(this.model.bones, clips);
      this.animator.play('idle');
      this.modelH = Math.max(1, this.model.box.max.y - Math.min(0, this.model.box.min.y));
    } catch (err) {
      this.app.log?.('crow', `modelo: ${err?.message || err}`);
    }
  }

  // ---------- look ----------

  ensure() {
    if (this.canvas || !this.model) return;
    const c = (this.canvas = document.createElement('canvas'));
    c.className = 'crow';
    document.body.append(c);
    this.renderer = new THREE.WebGLRenderer({ canvas: c, alpha: true, antialias: false });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.scene = new THREE.Scene();
    this.yaw = new THREE.Group();
    this.tilt = new THREE.Group();
    this.tilt.add(this.model.root);
    this.yaw.add(this.tilt);
    this.scene.add(this.yaw);
    this.camera = new THREE.OrthographicCamera();
    this.camera.position.set(0, 0, 100);
    this.camera.lookAt(0, 0, 0);
    // Clicks land on a small box around the bird, not the whole (mostly transparent) canvas.
    const hit = (this.hitEl = document.createElement('div'));
    hit.className = 'crow-hit hitzone';
    hit.title = 'Corvo · botão direito: perfil, habilidades e treino';
    hit.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      this.poke();
    });
    hit.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.app.toys.contextMenu('corvo', e.clientX, e.clientY);
    });
    document.body.append(hit);
    this.yawNow = Math.PI / 2 + 0.4;
  }

  remove() {
    for (const k of ['canvas', 'hitEl', 'bubbleEl', 'carryEl']) {
      this[k]?.remove();
      this[k] = null;
    }
    this.renderer?.dispose();
    this.renderer = null;
    this.x = null;
  }

  size() {
    const H = this.H;
    if (this.sizedFor === H) return;
    this.sizedFor = H;
    const ppu = H / this.modelH;
    this.cw = Math.round(H * 2.8);
    this.ch = Math.round(H * 2.2);
    this.feetY = Math.round(this.ch - H * 0.45);
    this.renderer.setPixelRatio(devicePixelRatio);
    this.renderer.setSize(this.cw, this.ch, false);
    Object.assign(this.canvas.style, { width: `${this.cw}px`, height: `${this.ch}px` });
    Object.assign(this.camera, { left: -this.cw / 2 / ppu, right: this.cw / 2 / ppu, top: this.feetY / ppu, bottom: -(this.ch - this.feetY) / ppu, near: 0.1, far: 500 });
    this.camera.updateProjectionMatrix();
  }

  play(name, speed = 1) {
    this.animator?.play(name, { speed });
  }

  say(text, life = 2.4) {
    if (!this.bubbleEl) {
      this.bubbleEl = document.createElement('div');
      this.bubbleEl.className = 'doll-bubble crow-bubble';
      document.body.append(this.bubbleEl);
    }
    this.bubbleEl.textContent = text;
    this.bubbleEl.classList.toggle('emoji-only', emojiOnly(text));
    this.bubbleT = life;
  }

  float(text) {
    this.app.toys.furn.floatText(this.x, this.y - this.lift - this.H * 1.2, text);
  }

  draw(dt, hidden) {
    this.ensure();
    if (!this.canvas) return;
    this.size();
    const show = !hidden && !this.away;
    this.canvas.style.display = this.hitEl.style.display = show ? 'block' : 'none';
    const yawTo = (this.dir < 0 ? 1 : -1) * (Math.PI / 2 + 0.4);
    let d = yawTo - this.yawNow;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    this.yawNow += d * Math.min(1, dt * 10);
    this.yaw.rotation.set(0.12, this.yawNow, 0);
    this.tilt.rotation.set(this.act?.kind === 'fly' ? -0.15 : 0, 0, 0);
    const tr = this.trick;
    if (tr && tr.i >= 0) {
      const k = tr.list[tr.i];
      const p = clamp(tr.t / TRICK[k], 0, 1);
      if (k === 'spin') this.yaw.rotation.y = this.yawNow + p * Math.PI * 2;
      if (k === 'flip') this.tilt.rotation.x = -p * Math.PI * 2;
      if (k === 'dead') this.tilt.rotation.z = Math.min(1, p * 5, (1 - p) * 4) * (Math.PI / 2);
    }
    this.animator?.update(dt);
    const H = this.H;
    const top = this.y - this.lift;
    if (show) {
      this.seenAt = performance.now();
      this.renderer.render(this.scene, this.camera);
      this.canvas.style.transform = `translate(${Math.round(this.x - this.cw / 2)}px, ${Math.round(top - this.feetY)}px)`;
      Object.assign(this.hitEl.style, { width: `${Math.round(H * 1.3)}px`, height: `${Math.round(H * 1.1)}px`, transform: `translate(${Math.round(this.x - H * 0.65)}px, ${Math.round(top - H * 1.05)}px)` });
    }
    if (this.bubbleEl) {
      this.bubbleT -= dt;
      const on = show && this.bubbleT > 0;
      this.bubbleEl.style.display = on ? 'block' : 'none';
      if (on) this.bubbleEl.style.transform = `translate(${Math.round(this.x - 12)}px, ${Math.round(top - H * 1.25 - this.bubbleEl.offsetHeight)}px)`;
    }
    if (this.carry.length) {
      if (!this.carryEl) {
        this.carryEl = document.createElement('div');
        this.carryEl.className = 'crow-carry';
        document.body.append(this.carryEl);
      }
      if (this.carryEl.childElementCount !== this.carry.length) {
        this.carryEl.textContent = '';
        for (const src of this.carry.slice(-4)) {
          const img = document.createElement('img');
          img.src = src;
          img.draggable = false;
          this.carryEl.append(img);
        }
      }
      const s = Math.round(H * 0.45);
      this.carryEl.style.setProperty('--s', `${s}px`);
      this.carryEl.style.display = show ? 'flex' : 'none';
      this.carryEl.style.transform = `translate(${Math.round(this.x - s / 2)}px, ${Math.round(top - s * 0.2)}px)`;
    } else if (this.carryEl) this.carryEl.style.display = 'none';
  }

  // ---------- movement ----------

  // Flies to target() (re-read every frame, so it can follow the pet's head).
  flyTo(target, then, speed = 3.4) {
    const t = target();
    this.act = { kind: 'fly', target, then, speed, d0: Math.max(1, Math.hypot(t.x - this.x, t.y - this.y)), flap: 0 };
    this.perch = null;
    this.play('fly', 1.2);
    this.app.sound.crow('takeoff', 0.8);
  }

  hopTo(x, then) {
    this.act = { kind: 'hop', tx: clamp(x, this.P * 0.2, this.app.world.width - this.P * 0.2), then, t: 0 };
    this.play('hop');
  }

  idle(t = rand(2, 5), anim = 'idle') {
    this.act = { kind: 'idle', t };
    this.play(anim);
  }

  landedOn() {
    const { world, pet } = this.app;
    if (this.perch === 'head') return this.app.head && pet.mode === 'ground' && !pet.dead && !pet.paused ? this.headSpot() : null;
    if (this.perch === 'printer') {
      const p = this.app.toys.printerGeom();
      return p ? { x: p.x, y: p.top + 2 } : null;
    }
    if (this.perch === 'doll') return this.dollOk() ? this.dollSpot() : null;
    if (this.perch?.startsWith?.('toy:')) {
      const g = this.furnGeom(this.perch.slice(4), true);
      if (!g) return null;
      const x = clamp(this.x, g.x - g.w * 0.45, g.x + g.w * 0.45);
      return { x, y: this.app.toys.topAt(g.id, x) + 2 };
    }
    if (this.perch?.startsWith?.('win:')) {
      const id = this.perch.slice(4);
      const s = world.surfaces.find((s) => String(s.id) === id && this.x >= s.x1 && this.x <= s.x2);
      return s ? { x: this.x, y: s.y } : null;
    }
    if (this.perch === 'combat') {
      // Atrás da Persocon, sempre no lado oposto para onde ela encara o oponente.
      const m = this.app.melee;
      const oppX = (m && m.active) ? (m.oppX?.() ?? null) : null;
      const back = oppX != null ? Math.sign(oppX - pet.x) || 1 : (pet.dir || 1);
      this.dir = back;
      return { x: clamp(pet.x - back * 60, this.P * 0.3, world.width - this.P * 0.3), y: this.floorY() - 45 };
    }
    return { x: this.x, y: this.floorY() };
  }

  move(dt) {
    const a = this.act;
    const P = this.P;
    if (!a) return this.idle();
    if (a.kind === 'fly') {
      const t = a.target();
      const dx = t.x - this.x;
      const dy = t.y - this.y;
      const dist = Math.hypot(dx, dy);
      const step = P * a.speed * dt;
      if (Math.abs(dx) > 2) this.dir = Math.sign(dx);
      if ((a.flap -= dt) <= 0) {
        a.flap = 0.22;
        this.app.sound.crow('flap', 0.5);
      }
      if (dist <= step) {
        this.x = t.x;
        this.y = t.y;
        this.lift = 0;
        this.act = null;
        this.app.sound.crow('land', 0.7);
        this.idle(rand(1, 3));
        a.then?.();
        return;
      }
      this.x += (dx / dist) * step;
      this.y += (dy / dist) * step;
      const prog = 1 - dist / a.d0;
      this.lift = Math.sin(clamp(prog, 0, 1) * Math.PI) * Math.min(P * 0.9, a.d0 * 0.3);
      return;
    }
    if (a.kind === 'hop') {
      const dx = a.tx - this.x;
      if (Math.abs(dx) < 2) {
        this.lift = 0;
        this.act = null;
        this.idle(rand(1, 3));
        a.then?.();
        return;
      }
      const prev = a.t % 0.4;
      a.t += dt;
      if (a.t % 0.4 < prev) this.app.sound.crow('hop', 0.4);
      this.dir = Math.sign(dx);
      this.x += Math.sign(dx) * Math.min(Math.abs(dx), P * 0.7 * dt);
      this.lift = Math.abs(Math.sin((a.t / 0.4) * Math.PI)) * this.H * 0.3;
      return;
    }
    if (a.kind === 'idle') {
      const spot = this.landedOn();
      if (!spot) {
        this.perch = null;
        return this.flyTo(() => ({ x: clamp(this.x, P * 0.3, this.app.world.width - P * 0.3), y: this.floorY() }), () => { this.perch = 'floor'; });
      }
      this.x = spot.x;
      this.y = spot.y;
      if (this.perch === 'head') this.dir = this.app.pet.dir || this.dir;
      if (a.peck && (a.peck -= dt) <= 0) {
        a.peck = rand(0.3, 0.6);
        this.app.sound.crow('peck', 0.6);
      }
      if ((a.t -= dt) <= 0) {
        this.act = null;
        if (a.then) a.then();
        else if (!this.duo) this.decide();
      }
    }
  }

  // ---------- life on its own ----------

  decide() {
    const { pet, world } = this.app;
    const P = this.P;
    const W = world.width;
    const d = this.data;
    // COMBAT_MODE: the crow does not start anything while she fights.
    if (pet.combatMode) return this.idle(rand(1.5, 3), 'caw');
    if (this.wantsPrinter()) return this.fetch();
    // carry is also used while tidy() holds a floor toy — don't treat that as a printer grab.
    if ((this.carry.length || this.fetching) && !this.holdToyId) return this.grab();
    // TV session: comes to watch from the top of the TV.
    if (this.app.tvWatch?.on && this.perch !== 'head') {
      if (this.perch === 'toy:videogame') return this.idle(rand(5, 10), 'idle');
      if (chance(0.6) && this.toFurniture('videogame')) return;
    }
    if (this.learned('procurar') && Date.now() > d.searchAt && this.perch !== 'head' && chance(0.3)) return this.search(false);
    if (this.learned('brilhos') && Date.now() > (d.shinyAt || 0) && this.perch !== 'head' && chance(0.35)) return this.shiny();
    if (this.learned('truques') && Date.now() > (d.trickAt || 0) && this.petFree() && chance(0.3)) return this.tricks();
    if (this.learned('entregar') && Date.now() > (d.deliverAt || 0) && this.deliver()) return;
    if (this.learned('ninar') && Date.now() > (d.lullAt || 0) && /sleep/.test(pet.action) && chance(0.5)) return this.lullaby();
    if (this.learned('cantar') && Date.now() > (d.singAt || 0) && pet.stats?.mood < 45 && this.petFree() && chance(0.4)) return this.sing();
    if (this.learned('consertar') && Date.now() > (d.fixAt || 0) && chance(0.25) && this.fixToy()) return;
    if (this.learned('guardar') && Date.now() > (d.tidyAt || 0) && this.perch !== 'head' && chance(0.4) && this.tidy()) return;
    if (this.perch === 'head') {
      if (chance(0.35)) return this.idle(rand(3, 6), chance(0.5) ? 'idle' : 'caw');
      return this.flyTo(() => ({ x: clamp(pet.x + rand(-2, 2) * P, P * 0.3, W - P * 0.3), y: this.floorY() }), () => { this.perch = 'floor'; });
    }
    if (this.dollOk() && !this.app.doll.brain.busy && Math.abs(this.app.doll.x - this.x) < P * 8 && chance(0.12)) return this.withDoll();
    const r = Math.random();
    const nearPet = pet.x != null ? clamp(pet.x + (chance(0.5) ? -1 : 1) * rand(0.6, 2.4) * P, P * 0.3, W - P * 0.3) : rand(P, W - P);
    if (r < 0.3) {
      if (this.perch === 'floor') return this.hopTo(nearPet);
      return this.flyTo(() => ({ x: nearPet, y: this.floorY() }), () => { this.perch = 'floor'; });
    }
    if (r < 0.45) {
      this.idle(rand(1.4, 2.8), 'peck');
      this.act.peck = 0.3;
      return;
    }
    if (r < 0.63 && this.headOk()) return this.toHead();
    if (r < 0.7 && this.toFurniture()) return;
    if (r < 0.78) {
      const wins = world.surfaces.filter((s) => s.id !== 'floor' && s.x2 - s.x1 > P * 0.4 && s.y > P);
      if (wins.length && chance(0.7)) {
        const s = pick(wins);
        const x = rand(s.x1 + P * 0.15, s.x2 - P * 0.15);
        return this.flyTo(() => ({ x, y: s.y }), () => { this.perch = `win:${s.id}`; });
      }
      const x = rand(P, W - P);
      return this.flyTo(() => ({ x, y: this.floorY() }), () => { this.perch = 'floor'; });
    }
    this.idle(rand(2, 6));
  }

  chatter(dt, d) {
    const gap = TALK[d.talk ?? 2]?.gap;
    if (!gap || this.x == null || d.away || this.duo) return;
    if (this.talkT == null || this.talkT <= 0) this.talkT = rand(gap[0], gap[1]) * (this.talkT == null ? 0.5 : 1);
    if ((this.talkT -= dt) > 0) return;
    this.app.sound.crow(pick(['caw', 'caw', 'caw2', 'caw3', 'squawk']), 0.8);
    if (this.free && this.act?.kind === 'idle' && !this.act.then && !this.trick) this.idle(1.6, 'caw');
  }

  // The balloon anchor (pet.js headCalm): follows her, jumps and sitting, but not the bounding box
  // twitching with every animation frame (raised arms, hair), which made it jump around up there.
  headSpot() {
    const h = this.app.headCalm || this.app.head;
    return h ? { x: h.x, y: h.y + this.H * 0.1 } : { x: this.x, y: this.y };
  }

  headOk() {
    const { pet } = this.app;
    return pet.mode === 'ground' && !pet.dead && !pet.paused && !pet.mini && !!this.app.head && ['idle', 'walk', 'sit', 'watch', 'jam'].includes(pet.action);
  }

  toHead() {
    this.flyTo(() => this.headSpot(), () => {
      this.perch = 'head';
      this.idle(rand(6, 18));
      this.data.heads = (this.data.heads || 0) + 1;
      this.app.pet.emit('crowHead');
    });
  }

  // ---------- skill: procurar ----------

  search(manual) {
    const d = this.data;
    if (!this.free) return false;
    if (manual && Date.now() - (d.searchedAt || 0) < 3 * 60e3) {
      this.say('💨');
      this.app.minigames?.toast('O Corvo ainda está cansado da última busca');
      return false;
    }
    const W = this.app.world.width;
    const side = this.x < W / 2 ? -1 : 1;
    this.leaving = true;
    this.app.sound.crow('caw2', 0.9);
    this.say('🔎');
    this.used('procurar', 'Saiu para procurar');
    this.flyTo(() => ({ x: side < 0 ? -this.P : W + this.P, y: this.P * 0.5 }), () => {
      this.leaving = false;
      d.away = { back: Date.now() + rand(60, 180) * 1000 };
      d.searchedAt = Date.now();
      d.searchAt = Date.now() + rand(...SEARCH_GAP) * 60e3;
      this.app.game.changed();
    }, 4);
    return true;
  }

  comeBack() {
    const { world, pet } = this.app;
    const W = world.width;
    const side = chance(0.5) ? -1 : 1;
    this.data.away = null;
    this.x = side < 0 ? -this.P : W + this.P;
    this.y = this.P * 0.6;
    const x = clamp((pet.x ?? W / 2) + rand(-1.2, 1.2) * this.P, this.P * 0.4, W - this.P * 0.4);
    this.flyTo(() => ({ x, y: this.floorY() }), () => {
      this.perch = 'floor';
      this.gift();
    });
  }

  gift() {
    const { game, sound, pet } = this.app;
    const d = this.data;
    d.gifts = (d.gifts || 0) + 1;
    sound.crow('gift');
    this.play('caw');
    const r = Math.random();
    if (r < 0.35) {
      const n = chance(0.06) ? 150 : Math.round(rand(10, 70));
      game.earn(n, 'Corvo');
      sound.sfx('coin');
      this.float(`+${n} ¥`);
      this.used('procurar', `+¥ ${n}`, 'gain', '💰');
      pet.emit('crowGift', { coins: n });
      return;
    }
    const loot = LOOT_ITEMS.filter((i) => !i.box && ['comum', 'incomum'].includes(i.rarity));
    const item = r < 0.9 ? pick(loot) : itemById(r < 0.97 ? 'caixa_comum' : 'caixa_rara');
    if (!item) return;
    game.deliveries.push({ id: item.id, n: 1, x: this.x + this.dir * this.H * 0.4, display: this.app.display?.() ?? 0 });
    game.changed();
    this.float('🎁');
    this.used('procurar', `+1 ${item.name}`, 'item', item.img);
    pet.emit('crowGift', { item });
  }

  // Lands on the floor next to her (or stays, if already there).
  nearPet(then) {
    const { pet, world } = this.app;
    const P = this.P;
    const side = this.x < pet.x ? -1 : 1;
    const x = clamp(pet.x + side * P * 0.6, P * 0.3, world.width - P * 0.3);
    if (this.perch === 'floor' && Math.abs(this.x - x) < P * 1.5) return this.hopTo(x, then);
    this.flyTo(() => ({ x, y: this.floorY() }), () => { this.perch = 'floor'; then(); });
  }

  petFree() {
    const { pet } = this.app;
    return pet.mode === 'ground' && pet.surfaceId === 'floor' && !pet.dead && !pet.paused && !pet.mini && ['idle', 'walk', 'sit'].includes(pet.action);
  }

  // ---------- skill: vigiar ----------

  watch(d) {
    const { pet, sound } = this.app;
    if (!this.learned('vigiar') || !this.free || pet.dead || pet.mode !== 'ground') return;
    const now = Date.now();
    d.watchAt ||= {};
    const w = WATCH.find(([k, lim]) => pet.stats[k] < lim && now > (d.watchAt[k] || 0));
    if (!w) return;
    d.watchAt[w[0]] = now + 8 * 60e3;
    const warn = () => {
      this.idle(2.5, 'caw');
      this.say(w[2], 3);
      sound.crow('caw2', 1);
      this.app.minigames?.toast(`O Corvo está preocupado: ${w[3]}`, icon('crow'));
      this.used('vigiar', w[3], 'skill', w[2]);
      pet.emit('crowWarn', { stat: w[0] });
    };
    if (this.headOk()) {
      this.flyTo(() => this.headSpot(), () => { this.perch = 'head'; warn(); });
    } else this.nearPet(warn);
  }

  // ---------- skill: brilhos ----------

  shiny() {
    const d = this.data;
    const P = this.P;
    d.shinyAt = Date.now() + rand(2, 5) * 60e3;
    const x = clamp(this.x + rand(-3, 3) * P, P * 0.3, this.app.world.width - P * 0.3);
    const dig = () => {
      this.idle(1.8, 'peck');
      this.act.peck = 0.2;
      this.act.then = () => this.foundShiny();
    };
    if (this.perch === 'floor') this.hopTo(x, dig);
    else this.flyTo(() => ({ x, y: this.floorY() }), () => { this.perch = 'floor'; dig(); });
  }

  foundShiny() {
    const { game, sound } = this.app;
    const d = this.data;
    d.shinies = (d.shinies || 0) + 1;
    this.play('caw');
    sound.crow('caw', 0.7);
    this.say('✨', 1.6);
    if (chance(0.75)) {
      const n = Math.round(rand(2, 12));
      game.earn(n, 'Corvo');
      sound.sfx('coin');
      this.float(`+${n} ¥`);
      this.used('brilhos', `+¥ ${n}`, 'gain');
    } else {
      const item = pick(LOOT_ITEMS.filter((i) => !i.box && i.rarity === 'comum'));
      if (item) {
        game.deliveries.push({ id: item.id, n: 1, x: this.x + this.dir * this.H * 0.4, display: this.app.display?.() ?? 0 });
        this.float('🎁');
        this.used('brilhos', `+1 ${item.name}`, 'item', item.img);
      }
    }
    game.changed();
    this.idle(rand(1, 2));
  }

  // ---------- skill: sorte ----------

  // Called by the Gacha, the slot machine and the boxes: extra luck while it is on screen.
  luck(toyId) {
    if (!this.learned('sorte') || !this.owned || this.x == null || this.data.away || this.offscreen) return 0;
    this.say('🍀', 2.5);
    this.float('🍀');
    this.used('sorte', 'Mais sorte');
    this.app.sound.crow('coo', 0.8);
    const t = toyId && this.app.game.toys[toyId];
    if (this.free && t?.x != null) {
      const x = clamp(t.x + this.P * 0.6, this.P * 0.3, this.app.world.width - this.P * 0.3);
      this.flyTo(() => ({ x, y: this.floorY() }), () => { this.perch = 'floor'; this.idle(rand(3, 5), 'caw'); });
    }
    return LUCK;
  }

  // ---------- skill: consertar ----------

  fixToy() {
    const { game, toys } = this.app;
    const ids = Object.keys(game.toys).filter((k) => {
      const t = game.toys[k];
      return t.placed && t.broken && t.x != null && toys.here(t) && !['pelucia', 'impressora'].includes(base(k));
    });
    if (!ids.length || !this.free) return false;
    const id = pick(ids);
    this.data.fixAt = Date.now() + rand(10, 20) * 60e3;
    const t = game.toys[id];
    this.say('🔧', 1.6);
    this.flyTo(() => ({ x: t.x, y: toys.topAt(id, t.x) + 2 }), () => {
      this.perch = `toy:${id}`;
      this.idle(3.2, 'peck');
      this.act.peck = 0.15;
      this.act.then = () => {
        if (!t.broken) return this.idle(1);
        if (chance(0.5)) {
          t.broken = false;
          t.uses = Math.floor((t.maxUses || 0) * 0.6);
          game.changed();
          this.app.sound.crow('trainOk');
          this.say('✨', 2);
          this.float('🔧');
          this.used('consertar', `Consertou: ${itemById(base(id))?.name || id}`);
          this.app.pet.emit('crowFix', { id });
        } else {
          this.app.sound.crow('trainMiss');
          this.say('😓', 2);
        }
        this.idle(rand(1, 2));
      };
    });
    return true;
  }

  // ---------- skill: cantar ----------

  sing(manual = false) {
    if (!this.free) {
      if (manual) this.app.minigames?.toast('Agora não dá');
      return false;
    }
    this.data.singAt = Date.now() + rand(6, 10) * 60e3;
    this.nearPet(() => {
      this.dir = this.app.pet.x < this.x ? -1 : 1;
      let n = 0;
      const note = () => {
        if (n++ >= 5) {
          this.app.pet.adjust?.({ mood: 8 });
          this.app.pet.love?.(0.5);
          this.used('cantar', '+8 humor');
          this.app.pet.emit('crowSing');
          return this.idle(rand(1, 2));
        }
        this.app.sound.crow(pick(['coo', 'caw', 'coo']), 0.7);
        this.float(pick(['🎵', '🎶']));
        this.idle(0.75, 'caw');
        this.act.then = note;
      };
      note();
    });
    return true;
  }

  // ---------- skill: entregar ----------

  // Hungry or thirsty: fetches food/drink from the backpack and brings it to her.
  deliver() {
    const { pet, toys, game } = this.app;
    const s = pet.stats;
    if (!this.free || !s) return false;
    // Allow deliver while she is idle/sit/walk or already going somewhere hungry.
    if (pet.dead || pet.paused || pet.mini || pet.mode !== 'ground' || pet.surfaceId !== 'floor') return false;
    if (!['idle', 'walk', 'sit', 'goto', 'eat'].includes(pet.action) && !pet.activity) return false;
    const cat = s.thirst < 40 ? 'bebidas' : s.hunger < 40 ? 'comidas' : null;
    if (!cat) return false;
    const item = toys.bestSupply(cat);
    if (!item) return false;
    const bx = toys.foodBagX();
    // Skip only when she is already right on the bag (she can grab it herself).
    if (Math.abs(bx - pet.x) < this.P * 1.2 && ['idle', 'sit'].includes(pet.action)) return false;
    this.data.deliverAt = Date.now() + rand(2, 5) * 60e3;
    toys.supplyCool = performance.now() + 25000;
    this.flyTo(() => ({ x: toys.foodBagX(), y: toys.perchAt('food')?.y ?? this.floorY() }), () => {
      this.perch = 'floor';
      this.idle(0.8, 'peck');
      this.act.then = () => {
        // Re-pick in case inventory changed while flying.
        const food = toys.bestSupply(cat);
        if (!food || !game.count(food.id)) {
          this.say('❓', 1.2);
          return this.idle(rand(1, 2));
        }
        this.say('🎒', 1.4);
        this.nearPet(() => {
          // Bypass busyForQueue so she actually eats even mid-activity.
          if (game.count(food.id) && pet.feed(food)) {
            game.take(food.id);
            this.used('entregar', cat === 'bebidas' ? 'Trouxe uma bebida' : 'Trouxe comida');
            this.app.sound.crow('gift');
            pet.emit('supply', { item: food, from: 'crow' });
          } else {
            this.say('😓', 1.4);
          }
          this.idle(rand(1.5, 3), 'caw');
        });
      };
    });
    return true;
  }

  // ---------- skill: guardar ----------

  // Small toys sitting on the floor (not already perched): pick one up and set it on furniture.
  floorToys() {
    const { game, toys, pet } = this.app;
    const floor = toys.floorY();
    const P = this.P;
    const out = [];
    for (const [id, t] of Object.entries(game.toys)) {
      if (!t?.placed || t.broken || !toys.here(t) || !toys.canPerch(id)) continue;
      if (t.on || toys.busy(id) || toys.hops?.has(id)) continue;
      if (pet.toyPlay?.id === id || this.app.doll?.brain?.task?.toy === id) continue;
      // On the floor (or nearly): no elevated free-float.
      if (t.y != null && t.y < floor - P * 0.35) continue;
      out.push(id);
    }
    // The handhelds left scattered on the desktop are picked up too.
    for (const slot of CONSOLE_SLOTS) {
      const t = game.toys[slot.id];
      if (!t?.placed || t.broken || t.on || out.includes(slot.id)) continue;
      if (!toys.here(t) || toys.busy(slot.id) || toys.hops?.has(slot.id)) continue;
      if (pet.toyPlay?.id === slot.id || this.app.doll?.brain?.task?.toy === slot.id) continue;
      if (this.holdToyId === slot.id) continue;
      if (t.y != null && t.y < floor - P * 0.35) continue;
      out.push(slot.id);
    }
    return out;
  }

  // Where a handheld goes back to: its reserved slot on the Gaming Shelf (or Pro).
  shelfSpot(id) {
    const { game, toys } = this.app;
    const slot = CONSOLE_SLOTS.find((s) => s.id === base(id));
    if (!slot) return null;
    const shelf = Object.entries(game.toys)
      .find(([k, t]) => base(k) === 'estante_cartuchos' && t.placed && toys.here(t));
    if (!shelf) return null;
    const [key, furn] = shelf;
    const w = toys.size(key);
    const x = furn.x + (slot.at - 0.5) * w;
    return { key, x, y: toys.topAt(key, x) };
  }

  tidySpot(exceptId) {
    const { toys } = this.app;
    const P = this.P;
    const surfs = toys.surfaces(exceptId).filter((s) => s.x2 - s.x1 > P * 0.35 && s.h > P * 0.25);
    if (!surfs.length) return null;
    // Prefer wider tops with fewer things already on them.
    const load = (key) => Object.values(this.app.game.toys).filter((t) => t?.on === key).length;
    surfs.sort((a, b) => (load(a.key) - load(b.key)) || ((b.x2 - b.x1) - (a.x2 - a.x1)));
    const s = surfs[0];
    const pad = P * 0.12;
    const x = clamp(s.x1 + pad + Math.random() * Math.max(0.01, s.x2 - s.x1 - pad * 2), s.x1 + pad, s.x2 - pad);
    return { key: s.key, x, y: toys.topAt(s.key, x) };
  }

  tidy(manual = false) {
    if (!this.free) {
      if (manual) this.app.minigames?.toast('Agora não dá');
      return false;
    }
    const ids = this.floorToys();
    if (!ids.length) {
      if (manual) {
        this.say('✨', 1.2);
        this.app.minigames?.toast('Nada no chão para guardar');
      }
      return false;
    }
    const id = pick(ids);
    const { game, toys, sound } = this.app;
    const t = game.toys[id];
    const item = itemById(base(id));
    // A handheld goes straight back to its reserved slot on the Gaming Shelf.
    const home = this.shelfSpot(id);
    const spot = home || this.tidySpot(ids[0]);
    if (!spot) {
      if (manual) this.app.minigames?.toast('Não tem mobília para guardar em cima');
      return false;
    }
    this.data.tidyAt = Date.now() + rand(2, 5) * 60e3;
    this.say('📦', 1.2);
    this.flyTo(() => ({ x: t.x, y: this.floorY() }), () => {
      this.perch = 'floor';
      if (!t?.placed || t.on || toys.busy(id) || !toys.here(t)) return this.idle(1);
      this.holdToyId = id;
      if (item?.img) this.carry = [item.img];
      sound.crow('grab');
      this.play('peck');
      this.idle(0.45, 'peck');
      this.act.then = () => {
        const dest = home || this.tidySpot(id) || spot;
        if (!dest || !game.toys[dest.key]?.placed) {
          this.holdToyId = null;
          this.carry = [];
          return this.idle(1);
        }
        this.flyTo(() => ({ x: dest.x, y: dest.y + 2 }), () => {
          this.perch = `toy:${dest.key}`;
          if (!t?.placed || toys.busy(id)) {
            this.holdToyId = null;
            this.carry = [];
            return this.idle(1);
          }
          const furn = game.toys[dest.key];
          const po = toys.perchOf(id);
          const dx = dest.x - furn.x;
          Object.assign(po, { on: dest.key, dx, y: toys.topAt(dest.key, dest.x) });
          po.loose = false;
          t.x = dest.x;
          toys.hops?.delete(id);
          toys.ys?.delete(id);
          this.holdToyId = null;
          this.carry = [];
          sound.crow('land', 0.6);
          this.float('📦');
          this.used('guardar', item?.name || id, 'skill', item?.img);
          this.idle(rand(1.2, 2.5), 'caw');
          game.changed();
        });
      };
    });
    return true;
  }

  // ---------- skill: ninar ----------

  lullaby() {
    const { pet } = this.app;
    this.data.lullAt = Date.now() + rand(10, 15) * 60e3;
    this.nearPet(() => {
      this.say('🌙', 3);
      this.app.sound.crow('coo', 0.4);
      this.idle(rand(8, 12), 'idle');
      this.act.then = () => {
        if (/sleep/.test(pet.action)) {
          pet.adjust?.({ energy: 10, mood: 4 });
          this.float('💤');
          this.used('ninar', '+10 energia');
        }
        this.idle(rand(1, 2));
      };
    });
    return true;
  }

  // ---------- skill: truques ----------

  tricks(manual = false) {
    if (!this.free) {
      if (manual) this.app.minigames?.toast('Agora não dá');
      return false;
    }
    this.data.trickAt = Date.now() + rand(4, 8) * 60e3;
    this.nearPet(() => {
      const list = ['spin', 'flip', 'dead'].sort(() => Math.random() - 0.5).slice(0, 2);
      this.trick = { list, i: -1, t: 0 };
      this.dir = this.app.pet.x < this.x ? -1 : 1;
      this.idle(99);
      this.app.pet.emit('crowTrick');
    });
    return true;
  }

  trickTick(dt) {
    const tr = this.trick;
    const { sound, pet } = this.app;
    tr.t += dt;
    if (tr.i < 0 || tr.t >= TRICK[tr.list[tr.i]]) {
      tr.i++;
      tr.t = 0;
      this.lift = 0;
      if (tr.i >= tr.list.length) {
        this.trick = null;
        this.data.tricks = (this.data.tricks || 0) + 1;
        this.app.game.changed();
        this.float('✨');
        this.used('truques', '+5 humor');
        sound.crow('trainOk');
        pet.adjust?.({ mood: 5 });
        pet.love?.(0.5);
        this.idle(rand(1, 2), 'caw');
        return;
      }
      const k = tr.list[tr.i];
      if (k === 'spin') { sound.crow('hop', 0.8); this.play('hop'); }
      if (k === 'flip') { sound.crow('squawk', 0.8); this.play('fly', 1.6); }
      if (k === 'dead') sound.crow('trainMiss');
    }
    const k = tr.list[tr.i];
    const p = tr.t / TRICK[k];
    if (k === 'spin') this.lift = Math.sin(p * Math.PI) * this.H * 0.35;
    if (k === 'flip') this.lift = Math.sin(p * Math.PI) * this.H * 0.9;
    if (k === 'dead' && tr.t > TRICK.dead - 0.5 && !tr.up) {
      tr.up = true;
      sound.crow('caw3');
      this.play('caw');
    }
    if (k !== 'dead') tr.up = false;
  }

  // ---------- skill: imitar ----------

  hookSpeech() {
    const s = this.app.speech;
    if (!s || s.crowHooked) return;
    s.crowHooked = true;
    const say = s.say.bind(s);
    s.say = (text, life) => {
      say(text, life);
      this.heard(s.text, s.life);
    };
  }

  heard(text, life) {
    if (!this.learned('imitar') || !this.owned || this.x == null || this.data.away || this.offscreen || !text) return;
    if (this.mimicking || performance.now() < (this.mimicAt || 0) || !chance(0.35)) return;
    this.mimicAt = performance.now() + 45e3;
    this.mimicking = true;
    setTimeout(() => {
      this.mimicking = false;
      this.mimic(text);
    }, (life + 0.5) * 1000);
  }

  mimic(text) {
    const { sound, pet } = this.app;
    if (this.data.away || this.offscreen || this.x == null) return;
    const name = this.app.speech?.memory?.['Nome'];
    let line;
    if (name && chance(0.25)) line = `${name}! ${name}!`;
    else {
      const words = text.replace(/[^\p{L}\p{N}' ]+/gu, ' ').trim().split(/\s+/);
      if (!words[0]) return;
      const tail = words.slice(-(chance(0.5) ? 2 : 3)).join(' ');
      line = `${tail}! ${words.at(-1)}!`;
    }
    this.say(`${line} Kraa!`, 2.8);
    this.used('imitar', 'Imitou');
    this.play('caw');
    if (!sound.crowRon) sound.crow('caw2', 0.8);
    setTimeout(() => !pet.dead && pet.emit('crowMimic'), 2200);
  }

  // ---------- with the Doll ----------

  dollOk() {
    const doll = this.app.doll;
    const b = doll?.brain;
    return !!doll?.alive && doll.x != null && !doll.held && !doll.hiding && !!b && !b.duo && b.waking == null;
  }

  dollSpot() {
    const doll = this.app.doll;
    return { x: doll.x, y: doll.y - doll.h - (doll.lift || 0) + this.H * 0.05 };
  }

  nearDoll(then) {
    const doll = this.app.doll;
    const P = this.P;
    const side = this.x < doll.x ? -1 : 1;
    const x = clamp(doll.x + side * P * 0.5, P * 0.3, this.app.world.width - P * 0.3);
    if (this.perch === 'floor' && Math.abs(this.x - x) < P * 1.5) return this.hopTo(x, then);
    this.flyTo(() => ({ x, y: this.floorY() }), () => { this.perch = 'floor'; then(); });
  }

  // Rides on the Doll's head while it dances, pecks it, or gets chased around.
  withDoll(kind = pick(['perch', 'chase', 'peck'])) {
    const { doll, sound } = this.app;
    const b = doll.brain;
    const d = this.data;
    const P = this.P;
    const W = this.app.world.width;
    d.dollPlays = (d.dollPlays || 0) + 1;
    this.app.game.changed();
    this.dollUntil = b.crowUntil = performance.now() + (kind === 'chase' ? 14e3 : 7e3);
    if (kind === 'perch') {
      return this.flyTo(() => this.dollSpot(), () => {
        this.perch = 'doll';
        this.idle(3.5, 'caw');
        sound.crow('caw', 0.8);
        b.say('♪', 2);
        b.doFor('dance', 3.5);
        this.act.then = () => this.flyTo(() => ({ x: clamp(doll.x + rand(-1.5, 1.5) * P, P * 0.3, W - P * 0.3), y: this.floorY() }), () => { this.perch = 'floor'; });
      });
    }
    if (kind === 'peck') {
      return this.nearDoll(() => {
        const side = this.x < doll.x ? -1 : 1;
        this.dir = -side;
        this.idle(1.2, 'peck');
        this.act.peck = 0.15;
        this.act.then = () => {
          if (this.dollOk()) {
            doll.throwUp(0, -P * 2.4);
            b.say(pick(['❗', '😆', '💢']));
          }
          sound.crow('squawk', 0.8);
          this.hopTo(this.x + side * P * 0.8);
        };
      });
    }
    // Chase: it flutters off a few times with the Doll running after it, then the Doll cheers.
    const round = (i) => {
      if (i >= 3 || !this.dollOk()) {
        if (this.dollOk()) {
          b.say(pick(['😆', '♥']));
          b.doFor('cheer', 1.5);
        }
        sound.crow('caw3', 0.8);
        return this.idle(rand(1, 2), 'caw');
      }
      const away = this.x < doll.x ? -1 : 1;
      let x = this.x + away * rand(1.2, 2) * P;
      if (x < P * 0.4 || x > W - P * 0.4) x = this.x - away * rand(1.2, 2) * P;
      x = clamp(x, P * 0.3, W - P * 0.3);
      b.walkTo(x, null, 1.5);
      this.flyTo(() => ({ x, y: this.floorY() }), () => {
        this.perch = 'floor';
        this.idle(0.5);
        this.act.then = () => round(i + 1);
      }, 2.2);
    };
    this.nearDoll(() => {
      b.say('❗', 1.2);
      round(0);
    });
  }

  // ---------- furniture ----------

  furnGeom(id, broken = false) {
    const { game, toys } = this.app;
    const t = game.toys[id];
    if (!t?.placed || (t.broken && !broken) || t.x == null || !toys.here(t) || ['pelucia', 'impressora'].includes(base(id))) return null;
    const w = toys.size(id);
    return { id, x: t.x, w, top: (t.y ?? this.floorY()) - w * toys.ratio(id) };
  }

  toFurniture(only) {
    const P = this.P;
    const spots = Object.keys(this.app.game.toys).filter((id) => !only || base(id) === only).map((id) => this.furnGeom(id)).filter((g) => g && g.w > P * 0.3 && g.top > P * 0.6);
    if (!spots.length) return false;
    const s = pick(spots);
    const off = rand(-0.3, 0.3) * s.w;
    this.flyTo(() => {
      const g = this.furnGeom(s.id);
      return g ? { x: g.x + off, y: this.app.toys.topAt(g.id, g.x + off) + 2 } : { x: this.x, y: this.floorY() };
    }, () => {
      if (!this.furnGeom(s.id)) {
        this.perch = 'floor';
        return;
      }
      this.perch = `toy:${s.id}`;
      const d = this.data;
      const k = base(s.id);
      d.perches ||= [];
      if (!d.perches.includes(k)) {
        d.perches.push(k);
        this.app.game.changed();
      }
      const fx = (this.app.game.toys[s.id]?.up && FURN_FX_UP[k]) || FURN_FX[k];
      if (!fx) return this.idle(rand(4, 10));
      this.say(fx[0], 2);
      this.idle(fx[1] === 'idle' ? rand(6, 12) : rand(2.5, 4), fx[1]);
      if (fx[1] === 'peck') this.act.peck = 0.3;
    });
    return true;
  }

  // ---------- skill: pegar ----------

  // Only while it is on screen and able to go; a print it hasn't reached in 10 s goes back to the Persocon.
  claims(d) {
    if (!this.learned('pegar') || !this.owned || this.x == null || this.away || this.duo || this.leaving || this.offscreen) return false;
    if (!this.canvas || this.x < 0 || this.x > this.app.world.width || this.app.pet.dead) return false;
    if (this.app.toys.unpacking?.d === d || !this.app.toys.printerGeom()) return false;
    this.claimAt ||= new WeakMap();
    if (!this.claimAt.has(d)) this.claimAt.set(d, performance.now());
    return performance.now() - this.claimAt.get(d) < 10000;
  }

  wantsPrinter() {
    return this.app.game.deliveries.some((d) => d.onPrinter && this.app.toys.here(d) && this.claims(d));
  }

  fetch() {
    const toys = this.app.toys;
    const p = toys.printerGeom();
    if (!p) return this.idle();
    this.flyTo(() => ({ x: p.x, y: p.top + 2 }), () => {
      this.perch = 'printer';
      this.grab();
    }, 5);
    this.fetching = true;
  }

  grab() {
    const { game, toys, sound } = this.app;
    for (const d of game.deliveries.filter((e) => e.onPrinter && toys.here(e) && toys.unpacking?.d !== e)) {
      const item = itemById(d.id);
      d.onPrinter = false;
      if (item?.img) this.carry.push(item.img);
      toys.store(d.id);
      sound.crow('grab');
      this.play('peck');
    }
    // Next print almost done: waits on the printer and takes that one too.
    const job = game.queue[0];
    if (job && job.dur - (job.t || 0) < 4 && this.carry.length < 6) return this.idle(Math.max(0.6, job.dur - (job.t || 0) + 0.4), 'idle');
    const { pet, world } = this.app;
    const P = this.P;
    const x = clamp((toys.foodBagX?.() ?? pet.x ?? this.x) + rand(-0.4, 0.4) * P, P * 0.3, world.width - P * 0.3);
    this.flyTo(() => ({ x, y: this.floorY() }), () => {
      this.perch = 'floor';
      if (this.carry.length) {
        this.float(this.carry.length > 1 ? `✓ ×${this.carry.length}` : '✓');
        this.used('pegar', `${this.carry.length} → inventário`, 'skill', this.carry[0]);
        sound.play('ok', { volume: 0.35 });
      }
      this.carry = [];
      this.fetching = false;
    }, 5);
  }

  // ---------- mouse ----------

  poke() {
    const { sound, pet } = this.app;
    // Easter egg: 13 rapid clicks swap the 8-bit caws for Ron's real voice; 13 more bring them back.
    // Clicks don't scare it off: it holds still while being clicked.
    const now = performance.now();
    if (now - (this.pokes.at(-1) ?? -1e9) > TAP_GAP) this.pokes = [];
    this.pokes.push(now);
    if (this.free && this.act?.kind === 'idle') this.act.t = Math.max(this.act.t, 2.5);
    if (this.pokes.length >= RON_TAPS) {
      this.pokes = [];
      const d = this.data;
      d.ron = !d.ron;
      sound.crowRon = d.ron;
      this.app.game.changed();
      this.play('caw');
      if (d.ron) {
        d.ronFound = true;
        this.flash();
        sound.ronClip(1, true);
        if (!pet.dead) setTimeout(() => { this.app.speech?.say('No, Ron.'); pet.emit('crowRon'); }, 1800);
      } else {
        this.say('Kraa!', 1.6);
        sound.crow('caw3');
      }
    }
  }

  flash() {
    const c = this.canvas;
    if (!c) return;
    c.classList.remove('ron-flash');
    void c.offsetWidth;
    c.classList.add('ron-flash');
    clearTimeout(this.flashTimer);
    this.flashTimer = setTimeout(() => c.classList.remove('ron-flash'), 1000);
  }

  // Right-click menu (called from toys.contextMenu with its button helper).
  menu(btn, x, y) {
    btn('📋 Perfil e habilidades', () => this.profile(x, y));
    if (!this.allLearned) btn('🎓 Treinar agora', () => this.startDuo('treinar', true));
    btn('🤗 Fazer carinho', () => this.startDuo('carinho', true));
    btn('🍞 Dar migalhas', () => this.startDuo('migalhas', true));
    btn('🙋 Pousar na cabeça dela', () => { if (this.free && this.headOk()) this.toHead(); });
    const skills = [
      this.learned('procurar') && ['🔎 Procurar...', () => this.search(true)],
      this.learned('truques') && ['🎩 Truques...', () => this.tricks(true)],
      this.learned('cantar') && ['🎵 Cantar...', () => this.sing(true)],
      this.learned('guardar') && ['📦 Guardar...', () => this.tidy(true)],
    ].filter(Boolean);
    if (!skills.length) return;
    // Skills in their own collapsed tab, to keep the menu short.
    const label = (open) => `✨ Habilidades (${skills.length}) ${open ? '▾' : '▸'}`;
    const tab = btn(label(false), () => {});
    const box = document.createElement('div');
    box.className = 'menu-sub';
    box.hidden = true;
    tab.after(box);
    for (const [l, fn] of skills) box.append(btn(l, fn));
    tab.onclick = (e) => {
      e.stopPropagation();
      box.hidden = !box.hidden;
      tab.textContent = label(!box.hidden);
      const m = tab.parentElement;
      const r = m.getBoundingClientRect();
      if (r.bottom > innerHeight - 8) m.style.top = `${Math.max(4, innerHeight - r.height - 8)}px`;
      this.app.sound.play('blip', { volume: 0.3 });
      this.app.uiChanged?.();
    };
  }

  profile(x, y) {
    const d = this.data;
    const el = document.createElement('div');
    el.className = 'toy-menu crow-profile hitzone';
    const add = (tag, cls, text) => {
      const e = document.createElement(tag);
      if (cls) e.className = cls;
      if (text != null) e.textContent = text;
      el.append(e);
      return e;
    };
    add('div', 'title', 'Corvo').prepend(crowIcon());
    add('div', 'crow-stats', `Treinos: ${d.trains || 0} · Presentes trazidos: ${d.gifts || 0}`);
    const cols = add('div', 'crow-cols');
    const mkCol = (title, combat) => {
      const col = document.createElement('div');
      col.className = 'crow-col';
      const h = document.createElement('div');
      h.className = 'crow-sub';
      h.textContent = title;
      col.append(h);
      const list = document.createElement('div');
      list.className = 'crow-skills';
      col.append(list);
      cols.append(col);
      return list;
    };
    const list = mkCol('Habilidades', false);
    const listC = mkCol('Skills de Combate', true);
    const skillRow = (id, s) => {
      const known = this.learned(id);
      const row = document.createElement('div');
      row.className = `crow-skill${known || s.off ? ' known' : ''}${s.off ? ' off' : ''}${s.combat ? ' combat' : ''}`;
      const head = document.createElement('div');
      head.className = 'crow-skill-head';
      const name = document.createElement('b');
      name.textContent = known || s.off ? `${s.icon} ${s.name}` : '❔ ???';
      const pct = document.createElement('span');
      pct.textContent = s.off ? 'off' : known ? '✓' : `${Math.floor(Math.min(99, ((d.xp[id] || 0) / XP) * 100))}%${d.focus === id ? ' · treinando' : ''}`;
      head.append(name, pct);
      const bar = document.createElement('div');
      bar.className = 'crow-bar';
      const fill = document.createElement('i');
      fill.style.width = `${known || s.off ? 100 : Math.min(99, ((d.xp[id] || 0) / XP) * 100)}%`;
      bar.append(fill);
      row.append(head, bar);
      if (known || s.off) {
        const note = document.createElement('small');
        note.textContent = s.note;
        row.append(note);
      }
      return row;
    };
    for (const [id, s] of Object.entries(CROW_SKILLS)) {
      (s.combat ? listC : list).append(skillRow(id, s));
    }
    add('div', 'crow-note', 'A Persocon decide o que ensinar. As Skills de Combate só valem na luta. As habilidades ficam ocultas até serem aprendidas.');
    add('div', 'crow-sub', 'Som');
    const vol = add('label', 'crow-opt');
    const range = document.createElement('input');
    Object.assign(range, { type: 'range', min: 0, max: 2, step: 0.05, value: d.vol ?? 1 });
    range.oninput = () => {
      d.vol = Number(range.value);
      this.app.sound.crowVol = d.vol;
      this.app.sound.applyCrowVolume();
    };
    range.onchange = () => { this.app.sound.crow('caw', 0.8); this.app.game.changed(); };
    vol.append('🔊 Volume', range);
    const flap = add('label', 'crow-opt');
    const flapRange = document.createElement('input');
    Object.assign(flapRange, { type: 'range', min: 0, max: 2, step: 0.05, value: d.flapVol ?? 1 });
    flapRange.oninput = () => {
      d.flapVol = Number(flapRange.value);
      this.app.sound.crowFlapVol = d.flapVol;
      this.app.sound.applyCrowVolume();
    };
    flapRange.onchange = () => { this.app.sound.crow('flap', 0.8); this.app.game.changed(); };
    flap.append('🪶 Asas', flapRange);
    const talk = add('div', 'crow-opt');
    const seg = document.createElement('div');
    seg.className = 'crow-seg';
    TALK.forEach((t, i) => {
      const b = document.createElement('button');
      b.textContent = t.name;
      b.classList.toggle('on', i === (d.talk ?? 2));
      b.onclick = () => {
        d.talk = i;
        this.talkT = 0;
        seg.querySelectorAll('button').forEach((o) => o.classList.toggle('on', o === b));
        this.app.game.changed();
      };
      seg.append(b);
    });
    talk.append('🗨 Fala', seg);
    this.app.toys.openMenu(el, x, y);
  }

  // ---------- with the Persocon ----------

  tryPet() {
    if (!this.free || performance.now() < (this.dollUntil || 0)) return false;
    const kinds = this.allLearned ? ['carinho', 'migalhas'] : ['treinar', 'treinar', 'treinar', 'carinho', 'migalhas'];
    return this.startDuo(pick(kinds));
  }

  startDuo(kind, manual = false) {
    const { pet, minigames, doll, care } = this.app;
    if (!this.free || pet.dead || pet.chase || minigames?.active || pet.mini || doll?.brain?.duo) {
      if (manual) minigames?.toast(this.away ? 'O Corvo saiu para procurar algo' : 'Agora não dá');
      return false;
    }
    if (kind === 'treinar' && (this.allLearned || (manual ? care?.refuse() : pet.drained?.()))) return false;
    if (pet.activity) this.app.modes?.stop();
    if (pet.toyPlay) pet.endToy(true);
    this.duo = { kind, phase: 'wait', t: 0 };
    pet.mini = () => {
      if (pet.surfaceId !== 'floor') return pet.startGround('hop');
      pet.action = 'mini';
      pet.timer = Infinity;
      pet.anim('idle', { facing: 'front' });
    };
    if (pet.mode === 'ground') pet.chooseNext();
    return true;
  }

  endDuo(quiet = false, react = null) {
    const { pet } = this.app;
    this.duo = null;
    if (pet.mini) pet.mini = null;
    if (pet.mode === 'ground' && !pet.dead && pet.action === 'mini') {
      if (!quiet && react) {
        pet.anim(pet.pickClip(['emote_pos', 'comemorar'], ['idle']), { facing: 'front', restart: true });
        pet.timer = 1.6;
      } else pet.chooseNext();
    }
    if (!this.act) this.idle();
  }

  petMove(x, speed, dt) {
    const pet = this.app.pet;
    const tx = clamp(x, this.P * 0.25, this.app.world.width - this.P * 0.25);
    const dx = tx - pet.x;
    const step = this.P * speed * dt;
    if (Math.abs(dx) <= step) {
      pet.x = tx;
      return true;
    }
    pet.x += Math.sign(dx) * step;
    pet.dir = Math.sign(dx);
    pet.anim(speed > 1.4 ? 'run' : 'walk', { facing: pet.side() });
    return false;
  }

  petFace(anim = 'idle', restart = false) {
    const pet = this.app.pet;
    pet.dir = this.x >= pet.x ? 1 : -1;
    pet.anim(anim, { facing: pet.side(), restart });
  }

  duoTick(dt) {
    const { pet, minigames, sound } = this.app;
    const duo = this.duo;
    if (pet.dead || pet.chase || minigames?.active || this.away) return this.endDuo(true);
    if (pet.mode !== 'ground') return;
    duo.t += dt;
    if (duo.phase === 'wait') {
      if (pet.action !== 'mini') {
        if (duo.t > 12) this.endDuo(true);
        return;
      }
      duo.phase = 'come';
      duo.t = 0;
      // The crow comes down next to her (from a window, her head or across the screen).
      const side = this.x != null && this.x < pet.x ? -1 : 1;
      const spot = () => ({ x: clamp(pet.x + side * this.P * 0.55, this.P * 0.3, this.app.world.width - this.P * 0.3), y: this.floorY() });
      if (this.perch !== 'floor' || Math.abs(this.x - pet.x) > this.P * 1.5) this.flyTo(spot, () => { this.perch = 'floor'; });
      else this.hopTo(spot().x);
      return;
    }
    if (pet.action !== 'mini') {
      pet.action = 'mini';
      pet.timer = Infinity;
    }
    if (duo.phase === 'come') {
      const crowHere = this.act?.kind === 'idle' && this.perch === 'floor';
      const near = crowHere && this.petMove(this.x + (pet.x < this.x ? -1 : 1) * this.P * 0.5, 1, dt);
      if (near) {
        duo.phase = 'act';
        duo.t = 0;
        duo.round = 0;
        duo.hits = 0;
        duo.next = 0.4;
        this.petFace();
        this.dir = pet.x < this.x ? -1 : 1;
        this.idle(99);
        this.begin(duo);
      } else if (duo.t > 15) this.endDuo(true);
      return;
    }
    this[`duo_${duo.kind}`](dt, duo, sound);
  }

  begin(duo) {
    const d = this.data;
    const { pet } = this.app;
    if (duo.kind === 'treinar') {
      if (d.focus && CROW_SKILLS[d.focus]?.off) d.focus = null;
      const open = this.activeSkills.filter((id) => !this.learned(id));
      if (!d.focus || this.learned(d.focus) || CROW_SKILLS[d.focus]?.off) {
        d.focus = open.length ? pick(open) : null;
        duo.fresh = !!d.focus;
      }
      pet.emit('crowTrain', { fresh: duo.fresh, done: !open.length });
    } else pet.emit('crowPlay', { kind: duo.kind });
  }

  // Training: four rounds of her showing something and the crow trying it.
  duo_treinar(dt, duo, sound) {
    const { pet, game } = this.app;
    const d = this.data;
    if ((duo.next -= dt) > 0) return;
    if (duo.round >= 4) {
      const gain = d.focus ? Math.round(5 + duo.hits * 4 + rand(0, 3)) : 0;
      d.trains = (d.trains || 0) + 1;
      pet.adjust({ mood: 6, energy: -3 });
      pet.love?.(1);
      if (d.focus) {
        d.xp[d.focus] = (d.xp[d.focus] || 0) + gain;
        this.float(`+${gain}%`);
        if (d.xp[d.focus] >= XP) {
          const id = d.focus;
          d.learned.push(id);
          d.focus = null;
          if (id === 'procurar') d.searchAt = Date.now() + 60e3;
          sound.crow('learn');
          this.say('✨');
          this.app.minigames?.toast(`O Corvo aprendeu: ${CROW_SKILLS[id].name}`, icon('crow'));
          pet.emit('crowLearn', { id });
        }
      }
      game.changed();
      return this.endDuo(false, 'happy');
    }
    if (!duo.shown) {
      duo.shown = true;
      duo.next = 0.7;
      this.petFace(pet.pickClip(['emote_pos', 'arremessar', 'pegar'], ['swing_hand', 'idle']), true);
      return;
    }
    duo.shown = false;
    duo.round++;
    duo.next = 1.1;
    const prog = d.focus ? (d.xp[d.focus] || 0) / XP : 1;
    if (chance(0.4 + prog * 0.45)) {
      duo.hits++;
      sound.crow('trainOk');
      this.float('✓');
      if (d.focus === 'pegar') {
        this.idle(1, 'peck');
        this.act.peck = 0.1;
      } else {
        this.play('fly', 1.4);
        this.app.sound.crow('flap', 0.6);
        duo.flutter = 0.7;
      }
    } else {
      sound.crow('trainMiss');
      this.float('❓');
      this.say(chance(0.5) ? '❓' : '💬', 1.2);
      this.play('caw');
    }
  }

  duo_carinho(dt, duo, sound) {
    const { pet } = this.app;
    if (!duo.started) {
      duo.started = true;
      this.petFace(pet.pickClip(['emote_pos'], ['idle']), true);
      sound.crow('coo');
      this.say('♥');
    }
    if ((duo.heart = (duo.heart ?? 0) - dt) <= 0) {
      duo.heart = 0.7;
      this.float('♥');
    }
    if (duo.t > 2.6) {
      pet.adjust({ mood: 6 });
      pet.love?.(1.5);
      this.endDuo(false, 'happy');
    }
  }

  duo_migalhas(dt, duo, sound) {
    const { pet } = this.app;
    if (!duo.started) {
      duo.started = true;
      this.petFace(pet.pickClip(['arremessar'], ['swing_hand', 'idle']), true);
      this.float('🍞');
      this.idle(99, 'peck');
      this.act.peck = 0.5;
    }
    if (duo.t > 3.4) {
      sound.crow('caw', 0.8);
      pet.adjust({ mood: 4 });
      this.endDuo(false, 'happy');
    }
  }

  // ---------- frame ----------

  update(dt, hidden) {
    const { pet, sound } = this.app;
    this.hidden = hidden;
    this.hookSpeech();
    if (!this.owned || pet.x == null || !this.model) {
      if (this.canvas) this.remove();
      sound.crowRon = false;
      return;
    }
    const d = this.data;
    if (d.focus && CROW_SKILLS[d.focus]?.off) d.focus = null;
    sound.crowRon = !!d.ron;
    sound.crowVol = d.vol ?? 1;
    sound.crowFlapVol = d.flapVol ?? 1;
    sound.applyCrowVolume();
    this.chatter(dt, d);
    sound.onRon ||= (text, dur) => !this.data.away && this.say(text, Math.max(2, dur + 0.6));
    if (this.x == null) {
      this.x = clamp(pet.x + this.P * 0.4, this.P * 0.3, this.app.world.width - this.P * 0.3);
      this.y = this.floorY();
      if (!d.born) {
        // Just came out of the Caixa Misteriosa: bursts out flapping and cawing.
        d.born = true;
        this.app.game.changed();
        this.y = this.floorY();
        const x = this.x;
        this.flyTo(() => ({ x: x + this.P * 0.3, y: this.floorY() - this.P * 1.2 }), () => this.flyTo(() => ({ x: x + this.P * 0.7, y: this.floorY() }), () => { this.perch = 'floor'; this.app.sound.crow('caw3'); }));
        this.app.sound.crow('caw3');
        this.app.minigames?.toast('Saiu um Corvo da Caixa Misteriosa! Botão direito nele: perfil e treino', icon('crow'));
        pet.emit('crowBorn');
      } else if (d.away) this.y = -this.P;
      else this.idle();
    }
    if (d.away) {
      if (Date.now() >= d.away.back) this.comeBack();
    } else if (pet.combatMode) {
      // COMBAT_MODE: o Corvo fica atrás da Persocon e só voa quando o combate manda
      // (o move roda para animar a ida/volta dele e o parado mantém a posição de apoio).
      const m = this.app.melee;
      if (m?.active && m.crowFight) {
        this.move(dt);
        // O Corvo encara sempre o mesmo lado que a Persocon (o do inimigo).
        const oppX = m.oppX?.() ?? null;
        if (oppX != null) this.dir = Math.sign(oppX - pet.x) || this.dir;
      } else if (this.act?.kind !== 'idle') this.idle();
    } else {
      if (this.duo) this.duoTick(dt);
      if (this.duo?.flutter > 0) {
        this.duo.flutter -= dt;
        this.lift = Math.sin((1 - this.duo.flutter / 0.7) * Math.PI) * this.H * 0.8;
        if (this.duo.flutter <= 0) {
          this.lift = 0;
          this.play('idle');
        }
      } else this.move(dt);
      if (this.trick) this.trickTick(dt);
      if (!this.duo && !this.trick && this.act?.kind === 'idle' && this.wantsPrinter() && this.perch !== 'printer') this.fetch();
      if ((this.watchT = (this.watchT ?? 3) - dt) <= 0) {
        this.watchT = 3;
        this.watch(d);
      }
    }
    this.draw(dt, hidden);
  }

  hit(x, y) {
    if (!this.hitEl || this.hitEl.style.display === 'none') return false;
    const r = this.hitEl.getBoundingClientRect();
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  }
}
