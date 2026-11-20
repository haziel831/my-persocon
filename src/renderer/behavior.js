import { Combat } from './combat.js';
import { ATTR_XP } from './attrxp.js';
import { dayPeriod } from './watch.js';
import { isFocus } from './focusmode.js';

const rand = (a, b) => a + Math.random() * (b - a);
const chance = (p) => Math.random() < p;
const clamp = (v, a, b) => Math.min(Math.max(v, a), b);

function pickWeighted(weights) {
  const entries = Object.entries(weights).filter(([, w]) => w > 0);
  let r = Math.random() * entries.reduce((s, [, w]) => s + w, 0);
  for (const [k, w] of entries) {
    if ((r -= w) <= 0) return k;
  }
  return entries[0][0];
}

// Drain multiplier for energy, hunger and mood.
export const DIFFICULTIES = { facil: 0.5, normal: 1, dificil: 2, extremo: 4 };

// Per-second rates at "normal". Hunger is satiety: 100 = full stomach, 0 = empty.
const RATES = {
  energy: 0.01,
  energyActive: 0.02,
  energySleep: 0.3,
  hunger: 0.011,
  hungerSleep: 0.016,
  mood: 0.024,
  healthStarve: 0.02,
  healthRegen: 0.004,
  thirst: 0.014,
  hygiene: 0.004,
};

// Negative status effects: cards in the status dock (art + color per status). auto = ms before it
// wears off on its own; most also have a cure (food, drink, bath, sleep, cafuné, medicine, play).
// fx = per second. art = pixel icon defined in statusicons.js.
export const DEBUFFS = {
  gripe: { icon: '😷', art: 'db_gripe', color: '#8fd07a', auto: 3600e3, fx: { energy: -0.04, mood: -0.015, health: -0.008 },
    pt: { name: 'Gripe', desc: 'Energia e humor caem mais rápido', cure: 'Remédio ou dormir bem' },
    en: { name: 'Flu', desc: 'Drains Energy and Mood faster', cure: 'Medicine or good sleep' } },
  fome: { icon: '🍗', art: 'db_fome', color: '#f0a030', auto: 1800e3, fx: { mood: -0.03, health: -0.025, energy: -0.015 },
    pt: { name: 'Fome Extrema', desc: 'Humor e saúde caem', cure: 'Comer algo' },
    en: { name: 'Starving', desc: 'Mood and Health drop', cure: 'Eat something' } },
  desidratacao: { icon: '💧', art: 'db_desidratacao', color: '#3fa2e8', auto: 1800e3, fx: { energy: -0.03, mood: -0.02, health: -0.015 },
    pt: { name: 'Desidratação', desc: 'Energia e humor caem', cure: 'Beber algo' },
    en: { name: 'Dehydration', desc: 'Energy and Mood drop', cure: 'Drink something' } },
  suja: { icon: '🧼', art: 'db_suja', color: '#c8a06a', auto: 3600e3, fx: { mood: -0.025, health: -0.005 },
    pt: { name: 'Suja Demais', desc: 'Humor cai', cure: 'Banho' },
    en: { name: 'Filthy', desc: 'Mood drops', cure: 'A bath' } },
  exausta: { icon: '😴', art: 'db_exausta', color: '#9a8fd8', auto: 3600e3, fx: { mood: -0.02, health: -0.005 },
    pt: { name: 'Exausta', desc: 'Humor e saúde caem', cure: 'Dormir (de preferência na cama)' },
    en: { name: 'Exhausted', desc: 'Mood and Health drop', cure: 'Sleep (a bed is best)' } },
  abatida: { icon: '😢', art: 'db_abatida', color: '#7fa8d8', auto: 3600e3, fx: { mood: -0.01, health: -0.003 },
    pt: { name: 'Abatida', desc: 'Ganhos de Humor e Afecção −30%', cure: 'Cafuné ou recuperar o humor' },
    en: { name: 'Dejected', desc: 'Mood and Affection gains −30%', cure: 'A pat or better Mood' } },
  estressada: { icon: '😤', art: 'db_estressada', color: '#e2475a', auto: 180e3, fx: { mood: -0.025, energy: -0.015, health: -0.01 },
    pt: { name: 'Estressada', desc: 'Humor e energia caem', cure: 'Cafuné ou tempo' },
    en: { name: 'Stressed', desc: 'Mood and Energy drop', cure: 'A pat or time' } },
  prisao: { icon: '🌀', art: 'db_prisao', color: '#c88f5a', auto: 1800e3, fx: { mood: -0.015, health: -0.015 },
    pt: { name: 'Prisão de Ventre', desc: 'Humor e saúde caem', cure: 'Remédio ou tempo' },
    en: { name: 'Constipation', desc: 'Mood and Health drop', cure: 'Medicine or time' } },
  nausea: { icon: '😵', art: 'db_nausea', color: '#7ec850', auto: 1800e3, fx: { mood: -0.03, health: -0.02 },
    pt: { name: 'Náusea', desc: 'Humor e saúde caem', cure: 'Remédio ou tempo' },
    en: { name: 'Nausea', desc: 'Mood and Health drop', cure: 'Medicine or time' } },
  tedio: { icon: '🥱', art: 'db_tedio', color: '#a0a0b8', auto: 3600e3, fx: { mood: -0.02 },
    pt: { name: 'Tédio', desc: 'Ganhos de Humor e Afecção −30%', cure: 'Brincar, minijogo ou TV' },
    en: { name: 'Boredom', desc: 'Mood and Affection gains −30%', cure: 'Play, minigame or TV' } },
  lesao: { icon: '🩹', art: 'db_lesao', color: '#ff8a8a', auto: 3600e3, fx: { energy: -0.03, mood: -0.02, health: -0.012 },
    pt: { name: 'Lesão', desc: 'Energia, humor e saúde caem', cure: 'Remédio ou tempo' },
    en: { name: 'Injury', desc: 'Energy, Mood and Health drop', cure: 'Medicine or time' } },
  // Atordoado: um golpe pesado do inimigo deixa ela tonta por 1 a 3 turnos (a duração em turnos é
  // sorteada na hora; o debuff só mantém o ícone na tela até a luta acabar).
  atordoado: { icon: '💫', art: 'db_atordoado', color: '#c8a0f0', auto: 45000e3, fx: { mood: -0.01 },
    pt: { name: 'Atordoado', desc: 'Ela erra muitos golpes (1 a 3 turnos)', cure: 'Esperar ou tomar um remédio' },
    en: { name: 'Stunned', desc: 'She misses many strikes (1 to 3 turns)', cure: 'Wait it out or take a medicine' } },
};

// How low her core stats are (0 = fine, 1 = everything critical): scales the random rolls, so
// statuses show up more often when she is being neglected on several fronts at once.
function riskOf(s) {
  const low = (v, t) => Math.max(0, (t - v) / t);
  return (low(s.hunger, 40) + low(s.thirst, 40) + low(s.hygiene, 40)
    + low(s.energy, 40) + low(s.health, 40) + low(s.mood, 40)) / 6;
}

const ACTION_EFFORT = { run: 2.3, chase: 2.4, qte: 2.2, jam: 2, mini: 2, ball: 2.2, walk: 1.25, climbRest: 1.2, sit: 0.65, watch: 0.65, emote: 1.1 };
const ANTIC_EFFORT = { squats: 2.2, shadowbox: 2.3, hops: 2, twirl: 1.8, butterfly: 1.9, balance: 1.4, trip: 1.5, doze: 0.5, yawn: 0.7, gaze: 0.7, hum: 0.8, tap: 0.8, look: 0.8, pant: 0.5 };

// Toys that are a seat themselves (or sit somewhere else): never moved to the cushion.
const SEAT_TOYS = new Set(['cama', 'almofada', 'banheira', 'videogame', 'pelucia', 'perch']);

export const FULL_STATS = { health: 100, hunger: 80, mood: 70, energy: 100, thirst: 80, hygiene: 100 };
export const AFFECTION_MAX = 1000;
export const AFFECTION_LEAVE = -100;
// The crouch before every jump (the vertical velocity only comes after it).
export const JUMP_PREP = 0.22;
// The knockback sequence: the flight, the fall on the floor and the get-up.
export const KNOCK_DOWN_TIME = 0.4;
export const KNOCK_GETUP_TIME = 0.75;
// INCONSCIENTE: how long she lies knocked out after a defeat (about five minutes).
export const KO_TIME = 300;
export const KO_TIME_JITTER = 30;

export class Pet {
  constructor(view, world, cfg, stats) {
    this.view = view;
    this.world = world;
    this.cfg = cfg;
    this.emotes = (cfg.emotes || []).filter((e) => view.animator.has(e));
    this.setSize(cfg.petHeight);

    this.x = null;
    this.y = null;
    this.dir = 1;
    this.mode = 'air';
    this.surfaceId = null;
    this.wall = null;
    this.vx = 0;
    this.vy = 0;
    this.action = null;
    this.timer = 0;
    this.awake = 0;
    this.jump = null;
    // A agachada antes do pulo: o vy só entra quando a animação acaba.
    this.jumpPrep = null;
    // O golpe pesado que a joga no ar: voo → queda → levantar.
    this.knock = null;
    this.hold = null;
    this.thrown = false;
    this.paused = false;
    // First run (intro.js): not on the desktop yet / lying switched off until the player clicks.
    this.offstage = false;
    this.powerOff = false;
    this.pending = null;
    this.actionQueue = [];
    this.combat = false;
    this.combatKind = null;
    // COMBAT_MODE: the strict lock of the melee system (no pettings, no events, no timers).
    this.combatMode = false;
    // Close-combat clips (melee system): the controller plays them by name and fires the hit.
    this.combatAnim = new Combat(this);
    this.chase = null;
    this.dead = false;
    // INCONSCIENTE: estado pós-derrota (ela cai no chão e não responde a nada até recuperar 50%+ de HP/Energia).
    this.unconscious = false;
    this.cursor = null;
    this.meals = [];
    this.eating = null;
    this.dosing = 0;
    this.doseGap = 0;

    // Visual tilt (radians) around tiltPivot (offset from the feet), driven while being carried.
    this.tilt = 0;
    this.tiltPivot = { x: 0, y: 0 };

    this.stats = { ...FULL_STATS, ...stats };
    // 0..100: recent physical effort (sweat, panting); fades in about two minutes.
    this.exertion = 0;
    this.moodTimer = rand(20, 40);
    this.listeners = [];

    this.clock = 0;
    this.patTimes = [];
    this.buffs = {};
    this.debuffs = {};
    this.dbcd = {};
    this.lastFun = 0;
    this.lowMoodT = 0;
    this.overeat = 0;
    this.stressHits = [];
    this.activity = null;
    this.toyPlay = null;
    this.goal = null;
    this.request = null;
    this.requestTimer = rand(30, 60);
    this.hideRect = null;
    this.hopAtEdge = false;
    this.danceSpeed = 1;
    this.affection = 0;
    this.neglect = 0;
    this.gear = {};
    this.leaving = null;
    this.carry = null;
    this.hook = null;
    this.ballPlay = null;
    this.watchTarget = null;
    this.setRoles(cfg.animRoles && Object.keys(cfg.animRoles).length ? cfg.animRoles : view.defaultRoles || {});
  }

  // 'emote' (old saves) counts as a positive emote.
  setRoles(roles) {
    // Generated clips fill only the roles the model has nothing for.
    const gen = Object.entries(this.view.genRoles || {}).filter(([n, r]) => !roles[n] && !Object.values(roles).includes(r));
    roles = { ...roles, ...Object.fromEntries(gen) };
    this.roles = roles;
    const has = (n) => this.view.animator.has(n);
    this.emotes = (this.cfg.emotes || []).filter((e) => has(e) && !roles[e]);
    for (const [name, role] of Object.entries(roles)) if ((role === 'emote' || role === 'emote_pos') && has(name) && !this.emotes.includes(name)) this.emotes.push(name);
    this.negEmotes = this.roleClips('emote_neg');
    this.sitClip = this.roleClips('sentar')[0] || null;
  }

  // Affection: slowest stat, -100..1000. Gains shrink as it grows; at -100 the pet leaves.
  love(n) {
    if (this.dead) return;
    if (n > 0) {
      n *= 0.5 * (1 - Math.max(0, this.affection) / (AFFECTION_MAX * 1.25));
      // Poor survival needs slow down how fast Affection grows (0.65x worst, 1.1x best).
      n *= 0.5 + 0.6 * this.needN();
      n *= this.debuffGain();
    }
    const before = this.affection;
    this.affection = clamp(this.affection + n, AFFECTION_LEAVE, AFFECTION_MAX);
    const mark = Math.floor(this.affection / 100) * 100;
    if (n > 0 && mark > 0 && mark > before) this.emit('loveMilestone', { level: mark });
    if (this.affection <= AFFECTION_LEAVE) this.leave();
  }

  // Packs a bindle and walks off the screen for good.
  leave() {
    if (this.leaving) return;
    this.endChase(false);
    this.finishEating();
    this.endToy(true);
    this.stopActivity();
    this.dead = true;
    this.leaving = { t: 0, gone: false };
    this.request = null;
    if (this.hold) {
      this.view.setHold(false);
      this.hold = null;
    }
    this.emit('leave');
    if (this.mode === 'ground') this.startLeave();
    else if (this.mode !== 'air') this.fall(0, 0);
  }

  startLeave() {
    this.action = 'leave';
    this.timer = Infinity;
    this.dir = this.x > this.world.width / 2 ? 1 : -1;
    this.carry = 'bindle';
    this.anim('walk', { facing: this.side() });
  }

  updateLeave(dt) {
    const l = this.leaving;
    l.t += dt;
    if (l.t < 2.5) {
      if (this.action !== 'leaveLook') {
        this.action = 'leaveLook';
        this.anim(this.negEmotes[0] || 'idle', { facing: 'front' });
      }
      return;
    }
    if (this.action !== 'leave') this.startLeave();
    this.x += this.dir * this.walkSpeed * 0.8 * dt;
    if (!l.gone && (this.x < -this.P || this.x > this.world.width + this.P)) {
      l.gone = true;
      this.emit('left');
    }
  }

  roleClips(...roles) {
    return Object.entries(this.roles).filter(([n, r]) => roles.includes(r) && this.view.animator.has(n)).map(([n]) => n);
  }

  pickClip(roles, fallback) {
    const list = this.roleClips(...roles);
    // Clips named after the role (e.g. kendo_men) count even without animRoles.
    // Variants: danca2, danca3… also join the pool so Jam can alternate dances.
    const names = this.view.animator.clips ? [...this.view.animator.clips.keys()] : [];
    for (const r of roles) {
      if (!r) continue;
      if (this.view.animator.has(r) && !list.includes(r)) list.push(r);
      const re = new RegExp(`^${r}\\d+$`);
      for (const n of names) if (re.test(n) && !list.includes(n)) list.push(n);
    }
    let pool = list.length ? list : fallback.filter((n) => this.view.animator.has(n));
    // Prefer a different clip than the one currently playing (dance / emote swaps).
    if (pool.length > 1 && this.animName && pool.includes(this.animName)) {
      const alt = pool.filter((n) => n !== this.animName);
      if (alt.length) pool = alt;
    }
    return pool[Math.floor(Math.random() * pool.length)] || 'idle';
  }

  buff(name) {
    return (this.buffs?.[name] || 0) > Date.now();
  }

  // ---------- negative status effects ----------
  // At most 3 at once; the same one never stacks (its timer just refreshes). A status with a
  // cure stays until the cure happens; the rest wear off after DEBUFFS[id].auto milliseconds.
  hasDebuff(id) {
    return (this.debuffs?.[id] || 0) > Date.now();
  }

  addDebuff(id) {
    if (this.dead || !DEBUFFS[id]) return false;
    const now = Date.now();
    const list = (this.debuffs ||= {});
    if (list[id] > now) return false; // already active: no stacking, no re-announce
    if ((this.debuffCool?.[id] || 0) > now) return false; // just cured / wore off: stays clean for a while
    if (Object.keys(list).filter((k) => list[k] > now).length >= 3) return false;
    list[id] = now + DEBUFFS[id].auto;
    this.emit('debuff', { id, on: true });
    return true;
  }

  // A cure or a natural end: drops the status and tells the UI (60s before it can come back).
  cureDebuff(id) {
    if (this.debuffs?.[id]) {
      delete this.debuffs[id];
      (this.debuffCool ||= {})[id] = Date.now() + 60e3;
      this.emit('debuff', { id, on: false });
    }
  }

  cureAllDebuffs() {
    for (const id of Object.keys(this.debuffs || {})) this.cureDebuff(id);
  }

  // Triggers from neglected stats, the stat-based cures, the per-second effects and expiry.
  updateDebuffs(dt) {
    if (this.dead) return;
    const s = this.stats;
    const sleep = this.action === 'sleep';
    // --- triggers ---
    // Certain: a need crossed the red line or stayed there for long.
    if (s.hunger <= 5) this.addDebuff('fome');
    if (s.thirst <= 5) this.addDebuff('desidratacao');
    if (s.hygiene <= 8) this.addDebuff('suja');
    if (!sleep && s.energy <= 6) this.addDebuff('exausta');
    this.lowMoodT = s.mood <= 30 ? this.lowMoodT + dt : 0;
    if (this.lowMoodT > 60) this.addDebuff('abatida');
    // Bored: no play/toy/activity/minigame for 10 minutes while awake and in a decent mood.
    if (this.action !== 'sleep' && this.clock - this.lastFun > 600 && s.mood >= 40 && s.mood <= 75) this.addDebuff('tedio');
    // Probabilistic, rolled every 10s: the lower her core stats, the higher the chance.
    this.rollT = (this.rollT || 0) + dt;
    if (this.rollT >= 10) {
      this.rollT = 0;
      const r = riskOf(s);
      const p = (base) => chance(Math.min(0.9, base * (1 + 2.5 * r)));
      // Neglected hygiene + exhaustion: she catches something.
      if (s.hygiene < 15 && s.energy < 30 && p(0.3)) this.addDebuff('gripe');
      // Rare bad luck when everything is low at once (a cold or a stress crisis).
      if (r > 0.45 && p(0.15)) this.addDebuff(chance(0.5) ? 'nausea' : 'estressada');
    }
    // --- stat cures (the actions that heal by doing) ---
    if (s.hunger >= 40) this.cureDebuff('fome');
    if (s.thirst >= 40) this.cureDebuff('desidratacao');
    if (s.hygiene >= 40) this.cureDebuff('suja');
    if (s.energy >= 45) this.cureDebuff('exausta');
    if (s.hygiene >= 40 && s.energy >= 45) this.cureDebuff('gripe');
    if (s.mood >= 55) this.cureDebuff('abatida');
    // --- effects + expiry ---
    const now = Date.now();
    for (const id of Object.keys(this.debuffs)) {
      if (this.debuffs[id] <= now) { this.cureDebuff(id); continue; }
      const fx = DEBUFFS[id].fx;
      const delta = {};
      for (const [k, v] of Object.entries(fx)) {
        // Mood keeps its 50 floor and Health respects the shield: both go through adjust().
        if (k === 'mood' || k === 'health') delta[k] = v * dt;
        else s[k] = clamp(s[k] + v * dt, 0, 100);
      }
      if (Object.keys(delta).length) this.adjust(delta);
    }
  }

  // Highest jump: a quarter of the monitor height.
  maxJump() {
    return Math.min(this.P * 4.5, (this.world.height || 1e9) * 0.25);
  }

  on(fn) {
    this.listeners.push(fn);
  }

  emit(type, data = {}) {
    for (const fn of this.listeners) fn(type, data);
  }

  // A luta manda: com o motor ativo (ou nocaute/recuperação) nada de fala ou ação autônoma
  // por baixo — o turno da luta não pode ser atropelado por um passeio ou uma soneca.
  inCombat() {
    if (this.combatMode) return true;
    const m = this.app?.melee;
    if (m?.active || m?.isKnockedDown || m?.isRecovering) return true;
    return !!(typeof window !== 'undefined' && window.Melee?.isActive?.());
  }

  // src: where a mood gain comes from (defaults to what she is doing); the same source gets boring.
  // Her maximum Health: the Constitution and the Strength make her tougher.
  maxHealth() {
    const g = this.app?.game;
    if (!g?.maxHealth) return 100;
    return g.maxHealth();
  }

  adjust(delta, src) {
    for (let [k, v] of Object.entries(delta)) {
      if (k === 'mood' && v > 0) v = this.moodGain(v, src);
      if (k === 'mood' && v > 0 && this.buff('doubleMood')) v *= 2;
      // Event dips never take Humor under 50: only punish() (direct mistreatment) does.
      if (k === 'mood' && v < 0 && !this.harsh) v = Math.max(v, Math.min(0, 50 - this.stats.mood));
      if (k === 'health' && v < 0 && this.buff('shield')) continue;
      if (k === 'affection') this.love(v);
      else if (k in this.stats) this.stats[k] = clamp(this.stats[k] + v, 0, k === 'health' ? this.maxHealth() : 100);
      // Spending energy is physical effort: sweats and gets dirty.
      if (k === 'energy' && v < 0 && this.action !== 'sleep') {
        this.exertion = Math.min(100, this.exertion - v * 5);
        this.stats.hygiene = clamp(this.stats.hygiene + v * 0.6, 0, 100);
        // Every Energy spent trains her Constitution.
        this.app?.game?.attrGain?.('con', -v * ATTR_XP.con.energy, 'energy');
      }
    }
  }

  // Direct mistreatment (slap, hated food, hard throw, floor sleep, forced wake): the only
  // source allowed to push Humor below 50. Two hits in a minute also stress her out.
  punish(delta, src) {
    this.harsh = true;
    this.adjust(delta, src);
    this.harsh = false;
    const now = Date.now();
    this.stressHits = (this.stressHits || []).filter((t) => now - t < 60e3);
    this.stressHits.push(now);
    if (this.stressHits.length >= 2) this.addDebuff('estressada');
  }

  // 0..1: how settled the affection is (600+ counts as full). One of the two Mood multipliers.
  affT() {
    return clamp((this.affection || 0) / 600, 0, 1);
  }

  // Dejected / bored: everything she wins from care or fun counts ~30% less.
  debuffGain() {
    return (this.hasDebuff('abatida') || this.hasDebuff('tedio')) ? 0.7 : 1;
  }

  // 0.25..1 per survival need (50+ is fine), averaged: the worse she is cared for, the slower
  // Humor grows, the faster it drains and the slower Affection grows (0.48x..1.21x on Humor gains).
  needN() {
    const s = this.stats;
    const w = (x) => (x >= 50 ? 1 : 0.25 + 0.75 * (x / 50));
    return (w(s.hunger) + w(s.thirst) + w(s.hygiene) + w(s.energy)) / 4;
  }

  // Humor gains shrink near the top (half above 70, a fifth above 90) and with boredom: every point
  // won from one source makes the next ones from it smaller, recovering over a few minutes.
  moodGain(v, src = this.actKey()) {
    const m = this.stats.mood;
    const sat = m > 90 ? 0.2 : m > 70 ? 0.5 : 1;
    const bored = (this.bored ||= {});
    const out = ((v * sat) / (1 + (bored[src] || 0) / 25)) * (0.6 + 0.5 * this.affT()) * (0.7 + 0.4 * this.needN()) * this.debuffGain();
    bored[src] = Math.min(150, (bored[src] || 0) + out);
    return out;
  }

  // Too drained for hard play: the stat that is missing, or null.
  drained() {
    const s = this.stats;
    if ((s.thirst ?? 100) < 15) return 'thirst';
    if (s.hunger < 15) return 'hunger';
    if (s.energy < 15) return 'energy';
    return null;
  }

  // Walks slower when tired.
  tiredMul() {
    const e = this.stats.energy;
    const base = e < 15 ? 0.55 : e < 30 ? 0.75 : 1;
    return base * (this.buff('swift') ? 1.25 : 1);
  }

  // A Agilidade deixa a corrida mais rápida (Nv 1 = normal, Nv 10 ≈ +63%).
  updateAgiSpeed() {
    const base = this.baseRunSpeed ?? this.runSpeed;
    const lvl = this.app?.game?.attrLevel?.('agi') ?? 1;
    this.runSpeed = base * (1 + (lvl - 1) * 0.07);
  }

  setSize(P) {
    const cfg = this.cfg;
    const k = cfg.speedScale ?? 1;
    this.P = P;
    this.walkSpeed = cfg.walkSpeed * P * k;
    this.baseRunSpeed = cfg.runSpeed * P * k;
    this.updateAgiSpeed();
    this.climbSpeed = cfg.climbSpeed * P * k;
    this.gravity = cfg.gravity * P;
    this.jumpReach = cfg.jumpReach * P;
    this.climbInset = P * 0.14;
    this.edgeMargin = P * 0.08;
    if (this.world.petHeight !== P) {
      this.world.petHeight = P;
      if (this.world.ready) this.world.rebuild([...this.world.windows.values()]);
    }
    if (this.mode === 'ground') this.validateGround();
    else if (this.mode === 'wall' && this.action !== 'jumpGrab') this.validateWall();
  }

  anim(name, { pose = 'stand', facing = 'front', speed = 1, restart = false } = {}) {
    if (name === 'sit' && this.sitClip) name = this.sitClip;
    // Combat: idle/jump swap to the weapon-prefixed clip (melee_ / espada_ / yoyo_ / queimada_).
    // walk/run stay as normal locomotion so she does not slide while closing distance.
    if (this.combat) {
      const pref = this.combatKind || 'espada';
      if (name === 'idle') {
        if (this.view.animator.has(`${pref}_idle`)) name = `${pref}_idle`;
        else if (this.view.animator.has('combat_idle')) name = 'combat_idle';
      } else if (name === 'jump') {
        if (this.view.animator.has(`${pref}_pulo`)) name = `${pref}_pulo`;
        else if (this.view.animator.has('combat_jump')) name = 'combat_jump';
      }
    }
    if (!this.view.animator.has(name)) name = 'idle';
    this.animName = name;
    const snapped = this.view.setPose(pose);
    this.view.setFacing(facing);
    this.view.play(name, { restart, fade: snapped ? 0 : 0.18, speed });
  }

  // Plays an animation by name (melee system): playAnimation('attack_jab').
  // Combat clips go through the controller (hit frame, combo window, back to the stance).
  playAnimation(name, { facing = 'front', restart = true, speed = 1 } = {}) {
    if (!name) return false;
    if (this.combatAnim?.isCombatClip(name)) return this.combatAnim.play(name, { facing, restart, speed });
    if (!this.view.animator.has(name)) return false;
    this.anim(name, { facing, restart, speed });
    return true;
  }

  // The next attack of the combo chain (when the window of the current one is open).
  chainAttack() {
    return this.combatAnim?.chain() || false;
  }

  setCombat(on, kind = null) {    const nextKind = on ? (kind || this.combatKind || 'espada') : null;
    const same = !!on === !!this.combat && nextKind === this.combatKind;
    this.combat = !!on;
    this.combatKind = nextKind;
    if (same) return;
    const cur = this.view.animator.current?.name;
    const combatIdles = ['combat_idle', 'espada_idle', 'melee_idle', 'yoyo_idle', 'queimada_idle'];
    if (on && (cur === 'idle' || !cur || combatIdles.includes(cur))) this.anim('idle');
    else if (!on && combatIdles.includes(cur)) this.anim('idle');
  }

  // Busy with something the player should not interrupt (bath / sleep / loot box wait in queue).
  busyForQueue() {
    const app = this.app;
    return !!(this.dead || this.chase || this.eating || this.ballPlay || this.mini || this.hook
      || this.carry || this.toyPlay || this.activity || this.deferredToy
      || ['goto', 'react', 'hurt', 'land', 'dizzy', 'eat', 'toy', 'antic', 'qte', 'ball', 'jam', 'watch'].includes(this.action)
      || app?.minigames?.active || app?.antics?.cur);
  }

  enqueue(action) {
    this.actionQueue ||= [];
    if (action.kind === 'sleep' || action.kind === 'bath') {
      this.actionQueue = this.actionQueue.filter((a) => a.kind !== action.kind);
    }
    this.actionQueue.push(action);
    this.emit('queue', action);
    return true;
  }

  // Drains one queued care action when free. Returns true if it started something.
  runQueued() {
    if (!this.actionQueue?.length || this.busyForQueue()) return false;
    const a = this.actionQueue.shift();
    if (!a) return false;
    if (a.kind === 'sleep') {
      // Too annoyed to go back to sleep: the request is dropped.
      if (Date.now() >= (this.noSleepUntil || 0)) this.requestGround('sleepLong');
      return true;
    }
    if (a.kind === 'bath') {
      this.app?.care?.bath(true);
      return true;
    }
    if (a.kind === 'box' && a.id) {
      this.app?.rewards?.openNow?.(a.id);
      return true;
    }
    return false;
  }

  side() {
    return this.dir > 0 ? 'right' : 'left';
  }

  spawn(x) {
    const W = this.world.width;
    this.x = typeof x === 'number' ? clamp(x, this.P, W - this.P) : rand(this.P, W - this.P);
    this.y = this.P * 1.2;
    this.fall(0, 0);
  }

  // ---------- controls ----------

  pause() {
    if (this.paused || this.dead) return;
    this.endChase(false);
    this.paused = true;
    if (this.mode === 'ground') {
      if (['sit', 'sleep', 'dizzy', 'eat'].includes(this.action)) this.timer = Infinity;
      else if (this.action !== 'land') this.startGround('idle');
    } else if (this.mode === 'wall' && this.action !== 'jumpGrab') {
      this.restOnWall(Infinity);
    }
    this.emit('pause');
  }

  resume() {
    if (!this.paused) return;
    this.paused = false;
    if (this.mode === 'ground' && this.action !== 'sleep') this.timer = Math.min(this.timer, rand(0.3, 1));
    else if (this.mode === 'ground') this.timer = rand(3, 8);
    else if (this.mode === 'wall' && this.action === 'climbRest') this.timer = 0.3;
    this.emit('resume');
  }

  restart() {
    this.paused = false;
    this.pending = null;
    this.actionQueue = [];
    this.combat = false;
    this.combatKind = null;
    this.chase = null;
    this.meals = [];
    this.dosing = 0;
    this.doseGap = 0;
    this.finishEating();
    this.endToy(true);
    this.activity = null;
    this.goal = null;
    this.hideRect = null;
    this.hook = null;
    this.ballPlay = null;
    if (this.hold) this.view.setHold(false);
    this.hold = null;
    this.tilt = 0;
    this.spawn();
    this.emit('restart');
  }

  // Starts over after losing the pet.
  revive() {
    this.dead = false;
    this.stats = { ...FULL_STATS };
    this.request = null;
    this.patTimes = [];
    this.affection = 0;
    this.neglect = 0;
    this.leaving = null;
    this.carry = null;
    this.restart();
  }

  // ---------- care actions ----------

  // Cafuné (also a short click on the pet).
  pat() {
    if (this.dead) return;
    // While sleeping she ignores the player (no wake, no mood/emote); so does she right
    // after being dragged awake (annoyedUntil).
    if (this.action === 'sleep' || this.clock < (this.annoyedUntil || -1e9)) return;
    // Too many in a short time gets annoying.
    this.patTimes = this.patTimes.filter((t) => this.clock - t < 10);
    this.patTimes.push(this.clock);
    if (this.patTimes.length > 5) {
      this.adjust({ mood: -5, affection: -2 });
      if (this.mode === 'ground' && ['idle', 'walk', 'sit', 'emote'].includes(this.action)) {
        this.action = 'hurt';
        this.timer = this.paused ? Infinity : 1;
        this.anim('attacked', { restart: true, facing: 'front' });
      }
      return this.emit('patAngry');
    }
    this.adjust({ mood: 8, affection: 0.6 }, 'cafune');
    // A good cafuné pulls her out of the blues and melts the stress away.
    this.cureDebuff('abatida');
    this.cureDebuff('estressada');
    this.fulfill('pat');
    if (this.mode !== 'ground') return this.emit('pet');
    if (!['dizzy', 'land', 'chase', 'qte', 'eat'].includes(this.action)) {
      this.action = 'idle';
      this.timer = this.paused ? Infinity : rand(2, 3.5);
      this.anim('idle');
    }
    this.emit('pet');
  }

  // What the pet is doing right now, as an incentive key (toy id, activity or action).
  actKey() {
    if (this.toyPlay) return this.toyPlay.id;
    if (this.action === 'ball') return 'bola';
    return this.activity || this.action;
  }

  // Any fun resets the boredom timer and clears Tédio.
  funNow() {
    this.lastFun = this.clock;
    this.cureDebuff('tedio');
  }

  prefMul(k) {
    return 2 ** (this.prefs?.[k] || 0);
  }

  encourage(k, d) {
    if (!k || ['idle', 'hurt', 'land', 'dizzy', 'fall', 'held'].includes(k)) return;
    this.prefs ||= {};
    const v = clamp((this.prefs[k] || 0) + d * 0.2, -3, 3);
    if (Math.abs(v) < 0.005) delete this.prefs[k];
    else this.prefs[k] = v;
    this.emit('prefs', { key: k, value: this.prefs[k] || 0, up: d > 0 });
  }

  // Cafuné by rubbing the cursor over the pet: never interrupts, encourages what it is doing.
  rub() {
    if (this.dead || this.action === 'sleep' || this.clock < (this.annoyedUntil || -1e9) || this.clock - (this.rubAt || 0) < 0.35) return;
    this.rubAt = this.clock;
    this.adjust({ mood: 2, affection: 0.25 }, 'cafune');
    this.encourage(this.actKey(), 0.5);
    this.fulfill('pat');
    this.emit('pet', { rub: true });
  }

  slap() {
    if (this.dead) return;
    this.encourage(this.actKey(), -2.5);
    // Interrupt cleanly: training/hop left action='toy' without toyPlay and blocked every queue.
    if (this.toyPlay) this.endToy(true);
    if (this.activity) this.stopActivity?.();
    if (this.ballPlay) this.endBall?.(true);
    if (this.eating) this.finishEating();
    this.lift = 0;
    this.squash = null;
    this.setCombat(false);
    this.punish({ mood: -22, health: -6, affection: -10 });
    if (this.dead) return;
    if (this.mode === 'ground' && this.action !== 'chase' && this.action !== 'qte') {
      const startled = this.action === 'sleep';
      this.action = 'hurt';
      this.timer = this.paused ? Infinity : 1.2;
      this.anim('attacked', { restart: true, facing: 'front' });
      if (startled) {
        this.emit('wake', { startled: true });
        // O jogador acordou ela: o que ficou na fila entra na fila de comida.
        this.drainWakeUpQueue();
      }
    } else if (this.action === 'toy') {
      // Not on the floor (or chase): still drop the orphan toy action so queues work again.
      this.action = 'idle';
      this.timer = 0.4;
    }
    this.emit('slap');
    this.checkDeath();
  }

  // item: { cat, effects: {hunger, health, mood, energy} }. Meals are queued and eaten bite by
  // bite once the pet stands somewhere and isn't playing; the effects are applied per bite.
  feed(item) {
    if (this.dead || this.meals.length >= 5) return false;
    // COMBAT_MODE: no feeding during the fight.
    if (this.combatMode) return false;
    // Dormindo: o item fica na fila para depois (ela não acorda por causa disso).
    if (this.action === 'sleep') return this.queueForWakeUp(item);
    this.meals.push(item);
    if (this.canStartEating()) this.startEating();
    else if (this.mode === 'wall') this.fall(0, 0);
    return true;
  }

  // Fila do que o jogador deu enquanto ela dormia: nada acorda ela, ela consome na ordem
  // assim que acordar.
  queueForWakeUp(item) {
    const q = (this.pendingWakeUpQueue ||= []);
    q.push(item);
    this.emit('wakeQueued', { item });
    return true;
  }

  // Depois de acordar: o que ficou na fila entra na fila normal de comida/remédio.
  drainWakeUpQueue() {
    const q = this.pendingWakeUpQueue;
    if (!q?.length) return;
    this.pendingWakeUpQueue = [];
    for (const item of q) {
      if (this.meals.length >= 8) break;
      this.meals.push(item);
    }
    if (this.meals.length && this.canStartEating()) this.startEating();
  }

  canStartEating() {
    return !this.eating && !(this.dosing > 0) && !(this.doseGap > 0) && !this.chase
      && this.mode === 'ground' && !['land', 'dizzy', 'hurt', 'dead', 'goto', 'toy', 'sleep'].includes(this.action);
  }

  // Medicines and power-ups share the meal queue: finish FX → short gap → next (never overlap).
  medicate(item) {
    if (this.dead) return false;
    // Dormindo: fica na fila para depois (ela não acorda por causa disso).
    if (this.action === 'sleep') return this.queueForWakeUp(item);
    // COMBAT_MODE: o remédio é aplicado na hora (a luta continua rodando).
    if (!this.combatMode && (this.eating || this.dosing > 0 || this.doseGap > 0 || this.meals.length)) {
      if (this.meals.length >= 8) return false;
      this.meals.push(item);
      return true;
    }
    this.dose(item);
    return true;
  }

  dose(item) {
    this.adjust(item.effects || {});
    if (item.clearBuffs) this.buffs = {};
    else {
      for (const [b, s] of item.buffs || (item.buff ? [item.buff] : [])) this.buffs[b] = Math.max(Date.now(), this.buffs[b] || 0) + s * 1000;
    }
    // Medicine fixes what medicine can fix: flu, constipation, nausea and injuries.
    if (item.cat === 'medicina' && !item.clearBuffs) {
      for (const id of (item.cures || ['gripe', 'prisao', 'nausea', 'lesao'])) this.cureDebuff(id);
    }
    // Glow animation is 2.6s; keep the pose until it ends (queue waits for dosing + doseGap).
    if (item.clearBuffs) this.dosing = 0.7;
    else if (item.buff || item.buffs) this.dosing = 2.6;
    else this.dosing = 1.0;
    this.doseGap = 0;
    if (this.mode === 'ground') {
      // A animação de uso: a mão desce até a bolsa e sobe com o item.
      this.anim('use_item', { facing: 'front', restart: true });
      // Em combate quem manda no `action`/`timer` é a luta (o tick do toy): a pose é só visual.
      if (!this.combatMode) {
        this.action = 'react';
        this.timer = this.dosing + 0.5;
      }
    }
    this.emit('medicine', { item });
  }

  // Any purchase: the pet gets excited.
  bought(item) {
    this.adjust({ mood: 5 });
    this.emit('bought', { item });
  }

  // ---------- requests (when unhappy) ----------

  // kind: 'food' | 'drink' | 'pat' | 'play' | 'jam' | 'watch' | …; id: exact item if any.
  fulfill(kind, id) {
    const match = (r) => {
      if (!r) return false;
      if (r.id && id && r.id !== id) return false;
      if (r.id && id && r.id === id) return true;
      if (r.kind === kind) return true;
      // Giving a toy/gear to her bag also clears a generic "play" / matching toy wish.
      if (kind === 'play' && (r.kind === 'toy' || r.kind === 'play' || r.kind === 'ball')) return true;
      return false;
    };
    const live = match(this.request) ? this.request : null;
    const r = live || this.pendingWish(kind, id) || (kind === 'play' ? this.pendingWish('toy', id) : null);
    if (!r) return;
    if (live) this.request = null;
    this.forgetWish(r);
    const love = r.wish ? 2 : 1.2;
    this.adjust({ mood: 12, affection: love }, 'pedido');
    this.emit('requestDone', { ...r, love });
  }

  // Live requests (the balloon + the remembered "wants"): never more than 3 at once.
  liveWishes() {
    const now = Date.now();
    this.wishes = (this.wishes || []).filter((w) => w.until > now);
    return this.wishes;
  }

  // What she asked for stays pending for 3 hours (shown in the docked status) after the balloon goes.
  rememberWish(r) {
    const list = this.liveWishes();
    const until = Date.now() + 3 * 3600e3;
    const old = list.find((w) => w.kind === r.kind && (w.id || '') === (r.id || ''));
    if (old) old.until = until;
    else list.push({ kind: r.kind, id: r.id, name: r.name, label: r.label, img: r.img, wish: !!r.wish, at: Date.now(), until });
    if (list.length > 3) list.shift();
  }

  pendingWish(kind, id) {
    const list = this.wishes || [];
    const now = Date.now();
    for (let i = list.length - 1; i >= 0; i--) if (list[i].until <= now) list.splice(i, 1);
    return list.find((w) => w.kind === kind && !(w.id && id && w.id !== id)) || null;
  }

  forgetWish(r) {
    const list = this.wishes || [];
    const i = list.findIndex((w) => w.kind === r.kind && (w.id || '') === (r.id || ''));
    if (i >= 0) list.splice(i, 1);
  }

  // Something she asks for out of the blue (from pet.js: toys she owns, a bath, music...).
  wish() {
    if (this.request || this.dead || isFocus(this.cfg, this.app) || this.combatMode || this.liveWishes().length >= 3) return false;
    const w = this.wishPool?.();
    if (!w) return false;
    this.request = { ...w, wish: true, t: 60 };
    this.rememberWish(this.request);
    this.emit('request', this.request);
    return true;
  }

  updateRequest(dt) {
    // Asleep she neither asks nor counts down what she asked.
    if (this.action === 'sleep') return;
    // COMBAT_MODE: no requests during the fight — and anything asked before is dropped
    // (the balloon and the "Wants" chips do not follow her into the battle).
    if (this.inCombat()) {
      if (this.request) {
        this.request = null;
        this.emit('requestEnd');
      }
      return;
    }
    if (this.request) {
      this.request.t -= dt;
      if (this.request.t <= 0) {
        this.request = null;
        this.emit('requestEnd');
      }
      return;
    }
    if (this.stats.mood >= 60 || this.activity || this.chase || isFocus(this.cfg, this.app) || this.liveWishes().length >= 3) return;
    this.requestTimer -= dt;
    if (this.requestTimer > 0) return;
    this.requestTimer = rand(60, 120);
    // Food and drinks no longer exist (1.9.4): only ask for them if some item still exists.
    const hasFood = !!this.requestPool?.('comidas');
    const hasDrink = !!this.requestPool?.('bebidas');
    // Desserts are requested often, but only when the player already owns them.
    const hasDessert = !!this.requestPool?.('sobremesas');
    const kind = pickWeighted({ food: hasFood ? 3 : 0, drink: hasDrink ? 2 : 0, dessert: hasDessert ? 4 : 0, pat: 2, play: 1, wish: 3 });
    if (kind === 'wish' && this.wish()) return;
    const cat = kind === 'food' ? 'comidas' : kind === 'drink' ? 'bebidas' : kind === 'dessert' ? 'sobremesas' : null;
    const item = cat ? this.requestPool?.(cat) : null;
    this.request = { kind, id: item?.id, name: item?.name, img: item?.img, t: 45 };
    this.rememberWish(this.request);
    this.emit('request', this.request);
  }

  // ---------- walking to things, toys ----------

  // run: hurries there (running clip, faster).
  goTo(x, cb, run = false) {
    if (!Number.isFinite(x) || this.dead || this.chase || this.mode !== 'ground' || ['eat', 'land', 'dizzy', 'hurt'].includes(this.action)) return false;
    const s = this.validateGround();
    if (!s || x < s.x1 || x > s.x2) return false;
    this.paused = false;
    this.action = 'goto';
    this.goal = { x, cb, t: 15, run };
    this.dir = x >= this.x ? 1 : -1;
    this.anim(run ? 'run' : 'walk', { facing: this.side() });
    return true;
  }

  // opts: { id, dur, gain, hold (img), holdFrom (s), wobble, anim, pose, facing, pickAnim, tick(dt, tp), onEnd }
  // With pickAnim the pet first bends down for the toy (it stays on the floor until holdFrom).
  playToy(opts) {
    if (this.dead || this.action === 'sleep') return;
    // Em combate ninguém toma o toy da luta (um recado da impressora, por exemplo, parava o motor).
    if (this.toyPlay?.id === 'unknown' && this.app?.melee?.active && opts.id !== 'unknown') return;
    // Bath is care, not fun — it does not cure Tédio.
    if (!/^banho/.test(String(opts.id))) this.funNow();
    // Toys played sitting down go to the cushion (she takes the toy along).
    if (opts.pose === 'sit' && !opts.cushioned && !SEAT_TOYS.has(String(opts.id).split('#')[0])) {
      const c = this.paused ? null : this.findCushion?.() ?? null;
      if (c != null) {
        const go = { ...opts, cushioned: true, pickAnim: null, holdFrom: 0 };
        if (Math.abs(c - this.x) <= 2) return this.playToy(go);
        this.deferredToy = go;
        if (this.goTo(c, () => {
          this.deferredToy = null;
          this.playToy(go);
        })) return;
        this.deferredToy = null;
      }
    }
    if (opts.cushioned) this.onCushion = true;
    const combatOn = !!(opts.combat || opts.train || opts.id === 'espada' || opts.syntoyo || opts.id === 'bola_queimada');
    if (combatOn) opts.combat = true;
    const combatKind = opts.combatKind
      || (opts.id === 'espada' ? 'espada'
        : (opts.syntoyo || opts.id === 'syntoyo') ? 'yoyo'
          : opts.id === 'bola_queimada' ? 'queimada'
            : opts.train ? 'melee' : 'espada');
    this.toyPlay = { holdFrom: 0, wobble: 0, ...opts, t: 0, picked: !opts.pickAnim };
    this.action = 'toy';
    this.timer = opts.dur;
    if (combatOn) this.setCombat(true, combatKind);
    if (opts.pickAnim) this.anim(opts.pickAnim, { facing: 'front', restart: true });
    else this.anim(opts.anim || 'idle', { pose: opts.pose || 'stand', facing: opts.facing || 'front' });
    this.emit('toyStart', { id: opts.id });
  }

  endToy(interrupted) {
    const tp = this.toyPlay;
    if (!tp) return;
    // A luta NÃO acaba por tempo: o toy da horda só sai quando o combate acaba de verdade
    // (melee.stop/fim) ou quando alguém interrompe de propósito.
    if (tp.id === 'unknown' && this.app?.melee?.active && !interrupted) {
      this.timer = Infinity;
      return;
    }
    this.toyPlay = null;
    if (tp.train || tp.combat) this.setCombat(false);
    if (Math.abs(this.tilt) > 0) this.tilt = 0;
    this.lift = 0;
    this.squash = null;
    // Avoid action='toy' with no toyPlay (busy forever after a slap mid-training).
    if (this.action === 'toy') this.action = interrupted ? 'idle' : this.action;
    tp.onEnd?.(interrupted, tp);
    this.emit('toyEnd', { id: tp.id, interrupted });
  }

  updateToy(dt) {
    const tp = this.toyPlay;
    if (!tp) return this.startGround('idle');
    tp.t += dt;
    const k = tp.scale ?? 1;
    const delta = {};
    for (const [stat, v] of Object.entries(tp.gain || {})) delta[stat] = v * k * dt;
    // Dummy training: never drain energy below the floor (the melee training goes lower:
    // she trains until she is exhausted).
    const floor = tp.trainFloor ?? 50;
    if (tp.train && delta.energy < 0 && this.stats.energy + delta.energy < floor) {
      delta.energy = Math.min(0, floor - this.stats.energy);
    }
    this.adjust(delta);
    if (tp.train && this.stats.energy <= floor && tp.picked) {
      this.endToy(false);
      this.chooseNext();
      return;
    }
    if (!tp.picked && tp.t >= tp.holdFrom) {
      tp.picked = true;
      this.anim(tp.anim || 'idle', { pose: tp.pose || 'stand', facing: tp.facing || 'front' });
      this.emit('toyPick', { id: tp.id });
    }
    if (tp.tick && tp.picked) tp.tick(dt, tp);
    else if (tp.wobble && tp.t >= tp.holdFrom) {
      this.tilt = Math.sin(tp.t * 8) * tp.wobble;
      this.tiltPivot = { x: 0, y: 0 };
    }
    this.timer -= dt;
    if (this.timer <= 0) {
      this.endToy(false);
      this.chooseNext();
    }
  }

  // ---------- ball ----------
  // this.ball (set by the app): { x, y, r, vx, vy, held, kick(vx, vy), hookTarget() }.

  startBall(excited = false) {
    if (!this.ball || this.dead || this.chase || this.eating || this.mode !== 'ground') return false;
    this.funNow();
    this.ballPlay = { t: rand(25, 45), cool: 0.4, excite: excited ? 1 : 0, onEnd: this.ballPlay?.onEnd };
    this.action = 'ball';
    this.timer = Infinity;
    this.emit('ballStart', { excited });
    return true;
  }

  endBall(interrupted = false) {
    const bp = this.ballPlay;
    if (!bp) return;
    this.ballPlay = null;
    bp.onEnd?.(interrupted);
    this.emit('ballEnd');
    if (!interrupted && this.mode === 'ground' && this.action === 'ball') this.chooseNext();
  }

  // The player threw the ball: the pet gets excited and plays along.
  ballThrown() {
    if (this.dead || this.chase) return;
    this.adjust({ mood: 4, affection: 1 });
    this.emit('ballFetch');
    this.fulfill('play');
    if (this.ballPlay) {
      this.ballPlay.excite = Math.min(2, this.ballPlay.excite + 1);
      this.ballPlay.t += 10;
    } else if (this.mode === 'ground' && ['idle', 'walk', 'run', 'sit', 'emote', 'watch', 'jam', 'react'].includes(this.action) && !this.activity) {
      this.startBall(true);
    }
  }

  updateBall(dt, s) {
    const b = this.ball;
    const bp = this.ballPlay;
    if (!b || !bp) return this.endBall(true);
    bp.t -= dt;
    bp.cool -= dt;
    const k = 1 + bp.excite * 0.5;
    this.adjust({ mood: 0.3 * k * dt, energy: -0.1 * dt, hunger: -0.04 * dt, thirst: -0.07 * dt });
    if (bp.t <= 0 || this.stats.energy < 8) return this.endBall();
    if (b.held) {
      this.dir = Math.sign(b.x - this.x) || this.dir;
      return this.anim('idle', { facing: this.side() });
    }
    const P = this.P;
    // Dodgeball wind-up: hold the ball up, then throw (runs even while cool is ticking).
    if (bp.windup > 0 && (b.mode || 'futebol') === 'queimada') {
      bp.windup -= dt;
      const fwd = this.dir || 1;
      b.set(this.x + fwd * P * 0.28, this.y - P * 0.6);
      if (bp.windup > 0) return this.anim(this.pickClip(['pegar'], ['use_mainhand', 'idle']), { facing: fwd > 0 ? 'right' : 'left', restart: false });
      const xp = this.app?.game?.skillXp?.('queimada') || 0;
      const lvl = Math.min(10, 1 + Math.floor(Math.sqrt(xp) / 2.2));
      const power = 14 + lvl * 0.7;
      b.kick(fwd * rand(power, power + 5) * P, -rand(1 + lvl * 0.15, 3 + lvl * 0.25) * P);
      this.anim(this.pickClip(['arremessar'], ['swing_hand', 'use_mainhand']), { facing: fwd > 0 ? 'right' : 'left', restart: true });
      this.app?.game?.skillAdd?.('queimada', 0.9);
      // Arremessar a bola treina a Força.
      this.app?.game?.attrGain?.('str', ATTR_XP.str.throw, 'ball');
      // Arremessar a bola treina a Agilidade (tempo de reação).
      this.app?.game?.attrGain?.('agi', ATTR_XP.agi.ball, 'ball');
      const doll = this.app?.doll;
      const dummy = this.app?.dummy;
      const playNice = this.toyPlay?.id === 'pelucia' || !!this.app?.crow?.playing;
      if (!playNice && doll?.x != null && Math.abs(b.x - doll.x) < P * 1.2) {
        doll.knock?.(fwd * (4 + lvl) * P * 0.15, -2 * P);
        this.app?.toys?.furn?.floatText?.(doll.x, doll.y - P, `💥 ${4 + lvl}`);
      }
      if (dummy?.active && Math.abs(this.x - dummy.x) < P * 1.4) {
        dummy.hit(6 + lvl, fwd);
        this.app?.game?.skillAdd?.('queimada', 2.5);
      }
      this.emit('ballThrow');
      return;
    }
    const dx = b.x - this.x;
    const above = this.y - (b.y + b.r);
    if (this.gear.gancho && Math.abs(dx) > P * 6 && bp.cool <= 0 && chance(dt * 0.6)) {
      bp.cool = 2;
      return this.fireHook(b.x, b.y, 'pull', b.hookTarget());
    }
    // Header / intercept: the ball flies near, over the head.
    const coming = Math.sign(b.vx) === -Math.sign(dx) || Math.abs(b.vx) < P;
    if (above > P * 0.7 && above < this.maxJump() && Math.abs(dx) < P * 1.8 && coming && bp.cool <= 0 && chance(0.6)) {
      bp.cool = 1.2;
      const h = clamp(above - P * 0.5, P * 0.4, this.maxJump());
      const vy = -Math.sqrt(2 * this.gravity * h);
      this.dir = Math.sign(dx) || this.dir;
      this.emit('ballJump');
      return this.fall(clamp((dx * this.gravity) / -vy, -this.runSpeed * 1.5, this.runSpeed * 1.5), vy);
    }
    if (Math.abs(dx) < P * 0.4 && above < P * 0.4 && bp.cool <= 0) {
      bp.cool = 0.7;
      const fwd = chance(0.75) ? this.dir : -this.dir;
      const mode = b.mode || 'futebol';
      if (mode === 'futebol' && chance(0.5)) {
        // Keepie-uppie: small kicks straight up, staying under the ball.
        bp.cool = 0.35;
        b.kick(rand(-0.6, 0.6) * P, -rand(6, 8) * P);
        this.anim(this.pickClip(['chutar'], ['swing_hand', 'idle']), { facing: 'front', restart: true });
        this.emit('ballKick');
        return;
      }
      if (mode === 'volei') {
        const wall = this.x < this.world.width / 2 ? -1 : 1;
        b.kick(wall * rand(9, 13) * P, -rand(8, 11) * P);
        this.dir = wall;
        this.anim(this.pickClip(['arremessar'], ['swing_hand', 'jump']), { facing: wall > 0 ? 'right' : 'left', restart: true });
        this.emit('ballKick');
        return;
      }
      if (mode === 'basquete') {
        if (chance(0.18)) {
          b.kick(fwd * rand(4, 7) * P, -rand(11, 14) * P);
          this.anim(this.pickClip(['arremessar'], ['jump', 'swing_hand']), { facing: 'front', restart: true });
          this.emit('ballThrow');
        } else {
          // Dribble: pushes the ball down so it bounces back to the hand while running.
          bp.cool = 0.25;
          b.vx = this.dir * this.runSpeed * 0.8;
          b.vy = rand(5, 7) * P;
          this.emit('dribble');
        }
        return;
      }
      if (mode === 'queimada') {
        bp.windup = 0.4;
        bp.cool = 0.55;
        b.set(this.x + fwd * P * 0.25, this.y - P * 0.55);
        this.anim(this.pickClip(['pegar'], ['use_mainhand', 'idle']), { facing: fwd > 0 ? 'right' : 'left', restart: true });
        // Pegar a bola também treina a Força e a Agilidade.
        this.app?.game?.attrGain?.('str', ATTR_XP.str.catch, 'ball');
        this.app?.game?.attrGain?.('agi', ATTR_XP.agi.ball, 'ball');
        return;
      }
      if (chance(0.2)) {
        // Picks it up and throws it high.
        b.kick(fwd * rand(4, 8) * P, -rand(8, 11) * P);
        this.anim(this.pickClip(['arremessar'], ['swing_hand', 'use_mainhand', 'jump']), { facing: fwd > 0 ? 'right' : 'left', restart: true });
        this.emit('ballThrow');
      } else {
        b.kick(fwd * rand(6, 13) * P * (0.9 + bp.excite * 0.15), -rand(2, 7) * P);
        this.tilt = -fwd * 0.3;
        this.tiltPivot = { x: 0, y: 0 };
        this.emit('ballKick');
      }
      return;
    }
    // Runs to where the ball is going.
    const tx = b.x + b.vx * 0.25;
    const d = tx - this.x;
    const lo = Math.max(s.x1, P * 0.2);
    const hi = Math.min(s.x2, this.world.width - P * 0.2);
    if (Math.abs(d) < P * 0.15 || (tx < lo && this.x <= lo + 1) || (tx > hi && this.x >= hi - 1)) {
      this.dir = Math.sign(dx) || this.dir;
      return this.anim('idle', { facing: this.side() });
    }
    this.dir = Math.sign(d);
    this.x = clamp(this.x + this.dir * Math.min(Math.abs(d), this.runSpeed * (0.9 + bp.excite * 0.25) * dt), lo, hi);
    this.anim('run', { facing: this.side() });
  }

  // Header while jumping: the ball bounces off the head.
  ballHeader() {
    const b = this.ball;
    if (!b || b.held || !this.ballPlay) return;
    const hx = this.x;
    const hy = this.y - this.P * 0.95;
    if (Math.hypot(b.x - hx, b.y - hy) > b.r + this.P * 0.3) return;
    b.kick(this.dir * rand(4, 9) * this.P, -rand(6, 9) * this.P);
    this.emit('ballHeader');
  }

  // ---------- grappling hook ----------
  // kind 'self': zips the pet to the hooked point; 'pull': reels target { x, y, move(x, y), done() } in.

  hookOrigin() {
    return { x: this.x + this.dir * this.P * 0.18, y: this.y - this.P * 0.58 };
  }

  fireHook(tx, ty, kind = 'self', target = null) {
    if (!this.gear.gancho || this.hook || this.dead || this.mode === 'held') return false;
    const o = this.hookOrigin();
    const aimX = target?.x ?? tx;
    const aimY = target?.y ?? ty;
    this.dir = aimX >= this.x ? 1 : -1;
    // Far targets need more than the old 1.5s hard cap or the tip times out before the pull.
    const reach = Math.hypot(aimX - o.x, aimY - o.y);
    this.hook = {
      kind, tx, ty, target, phase: 'out', tipX: o.x, tipY: o.y, t: 0,
      maxOut: Math.min(5, Math.max(1.8, reach / (this.P * 12) + 0.6)),
    };
    if (this.mode === 'ground') {
      this.action = 'hook';
      this.timer = Infinity;
    }
    this.anim(this.pickClip(['gancho'], ['use_mainhand', 'swing_hand', 'idle']), { facing: this.side(), restart: true });
    this.emit('hookFire', { kind });
    // Disparar o gancho treina a Agilidade (tempo de reação).
    if (this.app?.game) this.app.game.attrGain?.('agi', ATTR_XP.agi.hook, 'hook');
    return true;
  }

  // Zips up to a window top above.
  hookSomewhere() {
    const P = this.P;
    const opts = this.world.surfaces.filter((s) => s.id !== 'floor' && s.y < this.y - P * 2 && s.y > this.y - P * 12 && s.x2 - s.x1 > P * 0.8
      && Math.min(Math.abs(s.x1 - this.x), Math.abs(s.x2 - this.x), s.x1 < this.x && s.x2 > this.x ? 0 : 1e9) < P * 8);
    if (!opts.length) return false;
    const s = opts[Math.floor(Math.random() * opts.length)];
    return this.fireHook(clamp(this.x, s.x1 + P * 0.3, s.x2 - P * 0.3), s.y, 'self');
  }

  updateHook(dt) {
    const h = this.hook;
    if (!h) return;
    h.t += dt;
    const P = this.P;
    const tgt = h.target;
    if (h.phase === 'out') {
      const tx = tgt ? tgt.x : h.tx;
      const ty = tgt ? tgt.y : h.ty;
      if (!Number.isFinite(tx) || !Number.isFinite(ty)) return this.endHook();
      const dx = tx - h.tipX;
      const dy = ty - h.tipY;
      const d = Math.hypot(dx, dy);
      // Slightly faster tip so long pulls still connect before maxOut.
      const step = P * 18 * dt;
      if (d <= step || d < 1) {
        h.tipX = tx;
        h.tipY = ty;
        h.phase = 'pull';
        this.emit('hookHit', { kind: h.kind });
        if (h.kind === 'self') {
          this.mode = 'hook';
          this.surfaceId = null;
          this.wall = null;
          this.anim('jump', { facing: this.side() });
        }
        return;
      }
      h.tipX += (dx / d) * step;
      h.tipY += (dy / d) * step;
      if (h.t > (h.maxOut || 2.5)) this.endHook();
      return;
    }
    if (h.kind === 'self') {
      if (tgt) {
        h.tipX = tgt.x;
        h.tipY = tgt.y;
      }
      const dx = h.tipX - this.dir * P * 0.18 - this.x;
      const dy = h.tipY + P * 0.58 - this.y;
      const d = Math.hypot(dx, dy);
      const step = P * 11 * dt;
      if (!Number.isFinite(d) || d <= step || h.t > 5) {
        this.x = clamp(h.tipX, P * 0.2, this.world.width - P * 0.2);
        this.y = h.tipY;
        return this.arriveHook();
      }
      this.x += (dx / d) * step;
      this.y += (dy / d) * step;
      return;
    }
    if (!tgt || typeof tgt.move !== 'function') return this.endHook();
    const o = this.hookOrigin();
    const dx = o.x - tgt.x;
    const dy = o.y - tgt.y;
    const d = Math.hypot(dx, dy);
    const step = P * 10 * dt;
    if (!Number.isFinite(d) || d <= Math.max(step, P * 0.3) || h.t > 6) {
      this.hook = null;
      this.emit('hookEnd');
      try { tgt.done?.(); } catch { /* ignore */ }
      if (this.mode === 'ground' && this.action === 'hook') this.chooseNext();
      return;
    }
    tgt.move(tgt.x + (dx / d) * step, tgt.y + (dy / d) * step);
    h.tipX = tgt.x;
    h.tipY = tgt.y;
  }

  arriveHook() {
    this.hook = null;
    this.emit('hookEnd');
    const s = this.world.landing(this.x, this.y - 8, this.y + 8);
    if (s) return this.land(s, 0);
    this.fall(this.dir * this.P * 1.2, -this.P * 2);
  }

  endHook() {
    this.hook = null;
    this.emit('hookEnd');
    if (this.mode === 'hook') this.fall(0, 0);
    else if (this.mode === 'ground' && this.action === 'hook') this.chooseNext();
  }

  // ---------- Jam / Assistir ----------

  startActivity(kind) {
    if (this.dead || this.action === 'sleep') return false;
    this.endChase(false);
    this.funNow();
    this.activity = kind;
    this.paused = false;
    this.fulfill('play');
    this.requestGround(kind);
    this.emit('activity', { kind });
    return true;
  }

  // Jam/Assistir: care when hunger/thirst/energy ≤50%; chooseNext brings her back to the activity.
  tendNeed() {
    if (this.mode !== 'ground' || this.surfaceId !== 'floor' || this.dead || this.chase || this.mini || this.meals.length) return false;
    const s = this.stats;
    if (s.hunger <= 50 || s.thirst <= 50 || s.health < 30) {
      const bag = this.needsSupply?.();
      if (bag?.hooked || (bag && this.goTo(bag.x, bag.use))) return true;
    }
    const bath = s.hygiene < 15 && this.findBath?.();
    if (bath && this.goTo(bath.x, () => bath.play(this))) return true;
    if (s.energy <= 50 && Date.now() >= (this.noSleepUntil || 0)) {
      this.startGround('sleepLong');
      return true;
    }
    return false;
  }

  stopActivity() {
    const kind = this.activity;
    if (!kind) return;
    this.activity = null;
    if (this.mode === 'ground' && ['jam', 'watch', 'react'].includes(this.action)) this.startGround('idle');
    this.emit('activityEnd', { kind });
  }

  // kind: 'scare' | 'laugh' | 'cheer'
  // Short celebration (power-ups), only when she isn't in the middle of something.
  cheer(dur = 2.2) {
    if (this.mode !== 'ground' || this.eating || this.mini || this.dead || !['idle', 'walk', 'run', 'sit', 'emote'].includes(this.action)) return false;
    this.action = 'react';
    this.timer = dur;
    this.anim(this.pickClip(['comemorar', 'danca'], this.emotes.length ? this.emotes : ['jump']), { restart: true, facing: 'front' });
    return true;
  }

  react(kind) {
    if (this.mode !== 'ground' || !['jam', 'watch'].includes(this.action)) return;
    this.action = 'react';
    this.timer = kind === 'scare' ? 1.4 : 2;
    const sad = this.negEmotes.length ? this.negEmotes : ['sit'];
    const clip = kind === 'scare' ? this.pickClip(['medo'], ['attacked'])
      : kind === 'sad' ? this.pickClip(['triste'], sad)
      : kind === 'tense' ? this.pickClip(['medo'], ['idle'])
      : this.pickClip(kind === 'laugh' ? ['rir', 'comemorar'] : ['comemorar', 'danca'], this.emotes.length ? this.emotes : ['jump']);
    this.anim(clip, { restart: true, facing: kind === 'tense' ? this.watchFacing ?? 'front' : 'front' });
    this.adjust({ mood: { scare: -1, sad: -0.5, tense: 0.5 }[kind] ?? 3 });
    this.emit('react', { kind });
  }

  startEating() {
    const item = this.meals.shift();
    if (!item) return;
    if (item.cat === 'medicina' || item.consumable) {
      this.dose(item);
      return;
    }
    const drink = item.cat === 'bebidas';
    // Stuffed and still eating: one more full-belly meal and her stomach rebels (3 = Prisão).
    if (!drink) {
      this.overeat = this.stats.hunger >= 88 ? this.overeat + 1 : Math.max(0, this.overeat - 1);
      if (this.overeat >= 3) {
        this.overeat = 0;
        this.addDebuff('prisao');
      }
    }
    const wasSleeping = this.action === 'sleep';
    this.action = 'eat';
    this.timer = Infinity;
    const slow = this.activity === 'watch' ? 1.8 : 1;
    // Drinks: one long continuous sip (sometimes with a straw) instead of separate gulps.
    this.eating = drink
      ? { item, drink, bites: 3, done: 0, t: 0, beat: 1.1 * slow, lead: 0.6, raise: 0, applied: 0, straw: chance(0.5), sip: true }
      : { item, drink, bites: 4, done: 0, t: 0, beat: 1.05 * slow, lead: 0.6, raise: 0, applied: 0 };
    // While watching it eats sitting, still turned to the video.
    if (this.activity === 'watch') this.anim('sit', { pose: 'sit', facing: this.watchFacing ?? Math.PI / 4 });
    // A mão vai até a bolsa e traz o item para a boca (a animação de uso).
    else this.anim('use_item', { facing: 'front', restart: true });
    this.fulfill(drink ? 'drink' : 'food', item.id);
    if (item.cat === 'sobremesas') this.fulfill('dessert', item.id);
    if (wasSleeping) this.emit('wake', { startled: false });
    this.emit('eat', { item, drink });
  }

  applyMeal(fraction) {
    const e = this.eating;
    const delta = {};
    for (const [k, v] of Object.entries(e.item.effects || {})) delta[k] = v * fraction;
    e.applied += fraction;
    this.adjust(delta);
  }

  // Ends the current meal; whatever wasn't eaten yet counts anyway when interrupted.
  finishEating() {
    const e = this.eating;
    if (!e) return;
    if (e.applied < 1) this.applyMeal(1 - e.applied);
    this.eating = null;
    this.love(0.8);
    for (const [b, s] of e.item.buffs || (e.item.buff ? [e.item.buff] : [])) this.buffs[b] = Math.max(Date.now(), this.buffs[b] || 0) + s * 1000;
    // Food/drink PowerUps (buff): hold the glow (~2.6s) before the queue advances.
    if (e.item.buff || e.item.buffs) {
      this.dosing = 2.6;
      this.doseGap = 0;
      if (this.mode === 'ground') {
        this.action = 'react';
        this.timer = this.dosing + 0.5;
        this.anim('idle', { facing: 'front' });
      }
    }
    // Exclusive drinks can also train attributes (e.g. CyberMatcha Rush).
    if (e.item.attrXp) {
      for (const [attr, amount] of Object.entries(e.item.attrXp)) this.app?.game?.attrAdd?.(attr, amount, 'Bebida');
    }
    this.emit('ate', { item: e.item, drink: e.drink });
    this.checkDeath();
  }

  // Each beat: hand goes up to the mouth, a bite/sip, hand comes back down.
  updateEating(dt) {
    const e = this.eating;
    e.t += dt;
    const local = e.t - e.lead;
    if (local < 0) {
      e.raise = 0;
      return;
    }
    const n = Math.floor(local / e.beat);
    const u = (local % e.beat) / e.beat;
    if (e.sip && n < e.bites) {
      // Cup stays at the mouth for the whole drink.
      e.raise = Math.min(1, local / 0.35);
      if (u >= 0.3 && e.done <= n) {
        e.done = n + 1;
        this.applyMeal(1 / e.bites);
        this.emit('bite', { item: e.item, drink: true, n: e.done, of: e.bites });
      }
      return;
    }
    if (n >= e.bites) {
      e.raise = e.sip ? Math.max(0, 1 - (local - e.bites * e.beat) / 0.3) : 0;
      if (local > e.bites * e.beat + 0.3) {
        this.finishEating();
        // PowerUp food/drink already set dosing + react — don't walk away mid-FX.
        if (!(this.dosing > 0)) this.chooseNext();
      }
      return;
    }
    e.raise = u < 0.3 ? u / 0.3 : u < 0.55 ? 1 : Math.max(0, 1 - (u - 0.55) / 0.3);
    if (u >= 0.3 && e.done <= n) {
      e.done = n + 1;
      this.applyMeal(1 / e.bites);
      this.emit('bite', { item: e.item, drink: e.drink, n: e.done, of: e.bites });
    }
  }

  putToSleep() {
    if (this.dead) return false;
    if (this.action === 'sleep') return true;
    // Woken up angrily: refuses to go back to sleep for two minutes.
    if (Date.now() < (this.noSleepUntil || 0)) {
      this.emit('notSleepy');
      return false;
    }
    if (this.stats.energy > 70) {
      this.emit('notSleepy');
      return false;
    }
    if (this.busyForQueue()) {
      this.enqueue({ kind: 'sleep', label: 'Dormir' });
      return true;
    }
    this.endChase(false);
    this.requestGround('sleepLong');
    return true;
  }

  // Dragged out of sleep: extremely annoyed — big Mood hit, ignores cafuné for a while and
  // refuses to sleep again for two minutes.
  wakeAngry() {
    this.punish({ mood: -25, affection: -4 });
    this.annoyedUntil = this.clock + 45;
    this.noSleepUntil = Date.now() + 120e3;
    this.slept = 0;
    this.emit('wakeAngry');
  }

  // Brincar: 60 s of trying to catch the mouse cursor.
  play() {
    if (this.dead) return false;
    if (this.action === 'sleep') {
      this.emit('notSleepy');
      return false;
    }
    if (this.stats.energy < 12) {
      this.emit('tooTired');
      return false;
    }
    this.funNow();
    this.adjust({ mood: 8, hunger: -6, thirst: -8, energy: -10 });
    this.paused = false;
    this.finishEating();
    this.stopActivity();
    this.fulfill('play');
    this.chase = { t: 30, cool: 0.5, caught: false, qte: null, grace: 0, escapes: 0, hide: null, wallJumps: 0 };
    this.emit('chaseStart');
    if (this.mode === 'ground') this.startChaseRun();
    else if (this.mode === 'wall') this.fall(0, 0);
    return true;
  }

  // Runs `kind` now if standing on something, otherwise as soon as the pet lands.
  requestGround(kind) {
    if (this.mode === 'ground' && this.action !== 'land') return this.startGround(kind);
    this.pending = kind;
    if (this.mode === 'wall') this.fall(0, 0);
  }

  checkDeath() {
    if (this.dead || this.unconscious || this.stats.health > 0) return;
    // EM COMBATE a derrota não mata: ela desmaia (INCONSCIENTE por alguns minutos) e a
    // luta termina; no resto do jogo continua sendo a morte de sempre. O treino no boneco
    // não nocauteia: a sessão só para (a luta de verdade é a que derruba).
    const ko = !!this.combatMode && this.app?.melee?.kind === 'unknown';
    // No treino ela também não morre: só sai da luta (sem pose de morta).
    const training = !!this.combatMode && !ko;
    if (!this.combatMode) this.dead = true;
    this.chase = null;
    this.eating = null;
    this.meals = [];
    this.dosing = 0;
    this.doseGap = 0;
    this.paused = false;
    if (this.hold) {
      this.view.setHold(false);
      this.hold = null;
    }
    if (ko) this.lieUnconscious();
    else if (training) this.app?.melee?.stop?.('tired');
    else if (this.mode === 'ground') this.lieDead();
    else if (this.mode !== 'air') this.fall(0, 0);
    this.emit('death');
  }

  lieDead() {
    this.action = 'dead';
    this.timer = Infinity;
    this.anim(this.view.animator.has('death') ? 'death' : 'sleep', { pose: this.view.animator.has('death') ? 'stand' : 'lie', facing: 'front' });
  }

  // INCONSCIENTE — fora de ação depois de uma derrota: deitada, fora de combate
  // e sem responder a nada por cerca de cinco minutos (KO_TIME, com variação).
  lieUnconscious() {
    if (this.dead || this.offstage) return;
    this.chase = null;
    this.eating = null;
    this.meals = [];
    // Só arma o relógio e avisa uma vez: reaplicar a pose não reinicia o nocaute.
    if (!this.unconscious) {
      this.unconscious = true;
      this.koTotal = KO_TIME + rand(-KO_TIME_JITTER, KO_TIME_JITTER);
      this.koT = this.koTotal;
      this.emit('ko');
    }
    this.paused = true;   // a IA não decide nada enquanto ela está fora
    this.action = 'sleep';   // o motor já sabe tratar o sleep (timer Infinity, regen de energia no chão)
    this.timer = Infinity;
    this.onCushion = false;
    this.onBed = false;
    // A luta acabou: some a moldura vermelha de combate enquanto ela está apagada.
    try { document.body.classList.remove('combat-mode'); } catch { /* sem DOM */ }
    const has = (n) => this.view?.animator?.has(n);
    const clip = has('sleep') ? 'sleep' : has('death') ? 'death' : 'idle';
    this.anim(clip, { pose: 'lie', facing: 'front' });
  }

  // Acorda sozinha quando o tempo de nocaute acaba (e com pelo menos metade de HP e Energia).
  reviveUnconscious() {
    if (!this.unconscious || this.dead) return;
    this.unconscious = false;
    this.koT = 0;
    const maxHP = this.maxHealth?.() ?? 100;
    // Acorda com metade da saúde (a regen do nocaute já a levou até aí) e a energia cheia.
    this.stats.health = Math.max(this.stats.health, maxHP * 0.5);
    this.stats.energy = Math.max(this.stats.energy, 100);
    this.paused = false;
    this.slept = 0;
    this.action = 'idle';
    this.timer = rand(1.5, 3);
    this.anim('idle', { facing: 'front', restart: true });
    try { this.app?.combatUI?.updateDefeatProgress?.(1, 0); } catch { /* HUD */ }
    this.emit('wake', { startled: false });
    this.chooseNext();
  }

  // Switched off on the floor (first run): the bundled model has "off"; others reuse death/sleep.
  lieOff() {
    this.action = 'off';
    this.timer = Infinity;
    const has = (n) => this.view.animator.has(n);
    const clip = has('off') ? 'off' : has('death') ? 'death' : 'sleep';
    this.anim(clip, { pose: clip === 'sleep' ? 'lie' : 'stand', facing: clip === 'death' ? 'front' : this.side() });
  }

  // Getting up and booting for the first time; returns how long it lasts.
  bootUp() {
    this.powerOff = false;
    this.action = 'boot';
    const clip = this.view.animator.clips.get('boot');
    this.timer = clip ? clip.length + 0.4 : 4.5;
    this.anim(clip ? 'boot' : 'idle', { restart: true, facing: clip ? this.side() : 'front' });
    return this.timer;
  }

  // ---------- carried by the mouse ----------

  // (cx, cy): cursor position. The pet swings to hang from its raised hand under the cursor.
  grab(cx, cy) {
    if (this.dead) return;
    const wasSleeping = this.action === 'sleep';
    this.endChase(false);
    this.anim('jump', { facing: 'front' });
    this.view.setHold(cx >= this.x ? 'right' : 'left');
    const hand = this.view.handOffset();
    const ox = this.x - cx;
    const oy = this.y - cy;
    const tx = hand ? -hand.x : ox;
    const ty = hand ? -hand.y : oy;
    this.hold = {
      cx, cy, ox, oy, tx, ty, px: cx, v: 0, pv: 0, w: 0, t: 0, hist: [], long: false,
      L: Math.max(this.P * 0.35, ty - this.P * 0.5),
    };
    this.mode = 'held';
    this.surfaceId = null;
    this.wall = null;
    this.jump = null;
    this.scaling = null;
    this.action = 'held';
    this.adjust({ mood: -1 });
    this.emit('grab');
    if (wasSleeping) this.wakeAngry();
  }

  drag(cx, cy) {
    if (!this.hold) return;
    this.hold.cx = cx;
    this.hold.cy = cy;
  }

  release() {
    const h = this.hold;
    if (!h) return;
    let vx = 0;
    let vy = 0;
    const a = h.hist[0];
    const b = h.hist[h.hist.length - 1];
    if (a && b && b.t - a.t > 0.02) {
      vx = (b.x - a.x) / (b.t - a.t);
      vy = (b.y - a.y) / (b.t - a.t);
    }
    const max = this.P * 30;
    const speed = Math.hypot(vx, vy);
    if (speed > max) {
      vx *= max / speed;
      vy *= max / speed;
    }
    this.hold = null;
    this.view.setHold(false);
    if (Math.abs(vx) > this.P) this.dir = Math.sign(vx);
    this.fall(vx, vy);
    this.thrown = true;
    const s = Math.min(speed, max) / this.P;
    if (s > 8) this.adjust({ mood: -4, affection: -1.5 });
    this.emit('release', { speed: s });
  }

  updateHeld(dt) {
    const h = this.hold;
    h.t += dt;
    const vx = dt > 0 ? (h.cx - h.px) / dt : 0;
    h.px = h.cx;
    h.v += (vx - h.v) * Math.min(1, dt * 20);
    const ax = clamp((h.v - h.pv) / Math.max(dt, 1e-3), -80 * this.P, 80 * this.P);
    h.pv = h.v;
    // Pendulum hanging from the hand, pushed by the cursor's horizontal acceleration. Right after
    // the grab the push is softened and the damping raised so the first swing stays small.
    const ramp = Math.min(1, h.t / 0.6);
    const push = 0.35 + 0.65 * ramp;
    const damping = 3 + 6 * (1 - ramp);
    const alpha = -(this.gravity / h.L) * Math.sin(this.tilt) + ((ax * push) / h.L) * Math.cos(this.tilt) - damping * h.w;
    h.w += alpha * dt;
    this.tilt = clamp(this.tilt + h.w * dt, -1.2, 1.2);
    // Slide from where it was grabbed to hanging by the hand.
    const k = 1 - Math.exp(-18 * dt);
    h.ox += (h.tx - h.ox) * k;
    h.oy += (h.ty - h.oy) * k;
    this.tiltPivot = { x: -h.ox, y: -h.oy };
    this.x = h.cx + h.ox;
    this.y = h.cy + h.oy;
    h.hist.push({ t: h.t, x: h.cx, y: h.cy });
    while (h.hist.length > 2 && h.t - h.hist[0].t > 0.1) h.hist.shift();
    if (!h.long && h.t > 5) {
      h.long = true;
      this.emit('heldLong');
    }
  }

  // ---------- mouse chase (Brincar) ----------

  startChaseRun() {
    this.action = 'chase';
    this.timer = Infinity;
    this.anim('run', { facing: this.side() });
  }

  endChase(caught) {
    if (!this.chase) return;
    this.chase = null;
    this.hideRect = null;
    this.love(1.5);
    if (caught) {
      this.adjust({ mood: 20 });
      // Ela pegar o cursor treina a Agilidade (tempo de reação).
      this.app?.game?.attrGain?.('agi', ATTR_XP.agi.catch, 'catch');
    }
    if (this.mode === 'ground' && (this.action === 'chase' || this.action === 'qte')) {
      if (caught && this.emotes.length) this.startGround('emote');
      else this.startGround('idle');
    }
    this.emit('chaseEnd', { caught });
  }

  // The pet got the cursor: the user has a few seconds to break free by mashing ← →.
  // The healthier the pet, the faster it pulls the escape bar back down.
  startQte() {
    const ch = this.chase;
    ch.qte = { bar: 0.3, t: 8, total: 8, drain: 0.08 + 0.32 * (this.stats.health / 100), last: null, presses: 0 };
    if (this.mode === 'ground') this.holdCursor();
    this.emit('qteStart');
  }

  holdCursor() {
    this.action = 'qte';
    this.timer = Infinity;
    this.anim('idle', { facing: 'front' });
  }

  // key: 'left' | 'right'. Alternating keys count fully, repeating the same key barely helps.
  qtePress(key) {
    const q = this.chase?.qte;
    if (!q) return;
    q.bar = Math.min(1, q.bar + (key !== q.last ? 0.09 : 0.025));
    q.last = key;
    q.presses++;
    if (q.bar >= 1) this.escapeQte();
  }

  escapeQte() {
    const ch = this.chase;
    ch.qte = null;
    ch.grace = 2;
    ch.escapes++;
    // O jogador escapar também treina a Agilidade dela (leitura de movimento).
    this.app?.game?.attrGain?.('agi', ATTR_XP.agi.escape, 'escape');
    if (this.mode === 'ground') {
      this.action = 'dizzy';
      this.timer = 1.1;
      this.anim('attacked', { restart: true, facing: 'front' });
    }
    this.emit('qteEscape');
  }

  updateQte(dt) {
    const q = this.chase.qte;
    q.t -= dt;
    q.bar -= q.drain * dt;
    if (q.bar <= 0 || q.t <= 0) this.endChase(true);
  }

  cursorCaught() {
    const c = this.cursor;
    if (!c) return false;
    return Math.abs(c.x - this.x) < this.P * 0.35 && c.y > this.y - this.P * 1.15 && c.y < this.y + this.P * 0.05;
  }

  updateChase(dt, s) {
    const c = this.cursor;
    const ch = this.chase;
    ch.cool -= dt;
    if (!c) return;
    const dx = c.x - this.x;
    const above = this.y - c.y;
    // Starts relaxed and slow, panics as the timer runs out (faster, but trips more often).
    const panic = clamp(1 - ch.t / 30, 0, 1);
    const speed = this.runSpeed * (0.75 + panic * 0.65);
    ch.wallJumps = 0;
    if (ch.cool <= 0 && !ch.hide && chance(dt * (0.015 + panic * 0.22))) {
      ch.cool = 1.2;
      this.adjust({ health: -3, mood: -4 });
      this.action = 'hurt';
      this.timer = 0.9;
      this.anim('attacked', { restart: true, facing: this.side() });
      this.emit('chaseTrip');
      return;
    }

    if (ch.hide) return this.updateHide(dt, s, dx, above, speed);
    if (ch.cool <= 0 && Math.abs(dx) > this.P * 4 && chance(dt * 0.3) && this.planHide(s)) return;

    // Grappling hook: zips straight to the cursor.
    if (this.gear.gancho && ch.cool <= 0 && (above > this.P * 2.5 || Math.abs(dx) > this.P * 6) && chance(dt * 0.7)) {
      ch.cool = 2;
      const pet = this;
      return this.fireHook(c.x, c.y, 'self', { get x() { return pet.cursor?.x ?? c.x; }, get y() { return (pet.cursor?.y ?? c.y) + pet.P * 0.5; } });
    }

    // Long horizontal leap to gain ground.
    if (ch.cool <= 0 && Math.abs(dx) > this.P * 3.5 && Math.abs(above) < this.P * 0.8 && chance(dt * 1.2)) {
      ch.cool = 0.9;
      this.dir = Math.sign(dx);
      this.emit('leap');
      return this.fall(this.dir * speed * 2.4, -this.P * 2.4);
    }

    if (above > this.P * 0.9 && Math.abs(dx) < this.P * 2.5 && ch.cool <= 0) {
      const h = clamp(above - this.P * 0.4, this.P * 0.5, this.maxJump());
      const vy = -Math.sqrt(2 * this.gravity * h);
      const tUp = -vy / this.gravity;
      const vx = clamp(dx / tUp, -speed * 1.5, speed * 1.5);
      ch.cool = 0.7;
      if (Math.abs(vx) > this.P) this.dir = Math.sign(vx);
      this.emit('chaseJump');
      return this.fall(vx, vy);
    }

    if (Math.abs(dx) < this.P * 0.12) {
      this.anim('idle');
      return;
    }
    this.dir = Math.sign(dx);
    const nx = this.x + this.dir * speed * dt;
    const lo = Math.max(s.x1, this.P * 0.2);
    const hi = Math.min(s.x2, this.world.width - this.P * 0.2);
    if (nx < lo || nx > hi) {
      const offEdge = (this.dir > 0 && c.x > s.x2) || (this.dir < 0 && c.x < s.x1);
      if (offEdge && ch.cool <= 0 && (nx > this.P * 0.2 && nx < this.world.width - this.P * 0.2)) {
        ch.cool = 0.5;
        return this.fall(this.dir * speed, -this.P * (c.y < this.y ? 5 : 2));
      }
      this.x = clamp(nx, lo, hi);
      return;
    }
    this.x = nx;
    this.anim('run', { facing: this.side() });
  }

  // Ambush: run to the side of a window that covers the pet's surface and wait behind it.
  planHide(s) {
    const P = this.P;
    let best = null;
    for (const w of this.world.windows.values()) {
      if (w.maximized || w.y > this.y - P * 1.1 || w.bottom < this.y - 2) continue;
      for (const [edge, inward] of [[w.x, 1], [w.right, -1]]) {
        const x = edge + inward * P * 0.45;
        if (x < s.x1 || x > s.x2 || x < P || x > this.world.width - P) continue;
        const d = Math.abs(x - this.x);
        if (d < P * 8 && (!best || d < best.d)) best = { x, d, id: w.id, inward };
      }
    }
    if (!best) return false;
    this.chase.hide = { ...best, phase: 'go', t: 7 };
    this.chase.cool = 1;
    return true;
  }

  updateHide(dt, s, dx, above, speed) {
    const h = this.chase.hide;
    const win = this.world.window(h.id);
    h.t -= dt;
    if (!win || h.t <= 0) {
      this.chase.hide = null;
      this.hideRect = null;
      return;
    }
    if (h.phase === 'go') {
      const d = h.x - this.x;
      if (Math.abs(d) < 4) {
        h.phase = 'wait';
        this.anim('idle', { facing: h.inward > 0 ? 'left' : 'right' });
        this.emit('hide');
      } else {
        this.dir = Math.sign(d);
        this.x += this.dir * Math.min(Math.abs(d), speed * dt);
        this.anim('run', { facing: this.side() });
        return;
      }
    }
    this.hideRect = { x: win.x, y: win.y, w: win.w, h: win.h };
    if (Math.abs(dx) < this.P * 2.2 && above > -this.P && above < this.P * 3) {
      this.chase.hide = null;
      this.hideRect = null;
      this.chase.cool = 0.8;
      const hgt = clamp(above + this.P * 0.3, this.P * 0.5, this.maxJump());
      const vy = -Math.sqrt(2 * this.gravity * hgt);
      this.dir = Math.sign(dx) || this.dir;
      this.emit('ambush');
      this.fall(clamp((dx * this.gravity) / -vy, -speed * 2, speed * 2), vy);
    }
  }

  // ---------- world sync ----------

  onWorldUpdate(moved) {
    if (this.offstage) return;
    if (this.x === null) return this.spawn(this.cfg.spawnX);
    if (this.mode === 'ground') {
      const m = moved.get(this.surfaceId);
      if (m) {
        this.x += m.dx;
        this.y += m.dy;
      }
      this.validateGround();
    } else if (this.mode === 'wall') {
      const m = moved.get(this.wall.id);
      if (m) {
        this.x += m.dx;
        this.y += m.dy;
        if (this.jump) this.jump.y1 += m.dy;
      }
      if (this.action !== 'jumpGrab') this.validateWall();
    }
  }

  validateGround() {
    const s = this.world.surfaceAt(this.surfaceId, this.x, 2);
    if (!s) {
      this.fall(0, 0);
      return null;
    }
    this.y = s.y;
    this.x = clamp(this.x, Math.max(s.x1, this.P * 0.15), Math.min(s.x2, this.world.width - this.P * 0.15));
    return s;
  }

  validateWall() {
    const w = this.world.wallAt(this.wall.id, this.wall.side, this.y);
    if (!w) {
      this.fall(0, 0);
      return null;
    }
    this.x = w.x + (w.side === 'left' ? -this.climbInset : this.climbInset);
    return w;
  }

  // ---------- ground ----------

  // A heavy blow launches her: she flies in a real arc (gravity), hits the floor and
  // gets up. Her turn waits until she is standing again (the melee listens to 'getUp').
  launchKnockback(vx, vy) {
    if (this.dead) return;
    this.knock = { stage: 'air', t: 0 };
    this.scaling = null;
    this.mode = 'air';
    this.surfaceId = null;
    this.wall = null;
    this.jump = null;
    this.vx = vx;
    this.vy = vy;
    this.action = 'fall';
    this.anim('knockup', { facing: Math.abs(vx) > this.P ? this.side() : 'front', restart: true });
    this.emit('knockup');
  }

  // The landing of a knockback: the impact, the dust and then she stays on the floor.
  knockLand(s) {
    const k = this.knock;
    this.mode = 'ground';
    this.surfaceId = s.id;
    this.y = s.y;
    this.vx = this.vy = 0;
    k.stage = 'impact';
    k.t = 0;
    this.action = 'land';
    this.app?.fx?.impact?.('dust', this.x, this.y - 6, 0.8);
    this.app?.fx?.shake?.(0.45);
    this.emit('knockdown');
    // Nocauteada (derrota): ela já estava caindo; não tem levantar, fica deitada inconsciente.
    if (this.unconscious) {
      this.knock = null;
      this.action = 'sleep';
      this.timer = Infinity;
      this.anim(this.view.animator.has('sleep') ? 'sleep' : 'idle', { pose: 'lie', facing: 'front' });
      // Sem queda em andamento a luta não espera mais nada (o turno destrava).
      this.emit('getUp');
      return;
    }
    this.anim('fall_hit', { facing: this.side(), restart: true });
  }

  // The get-up sequence: on the floor → lying → pushing herself up → standing.
  updateKnock(dt) {
    const k = this.knock;
    if (!k) return;
    // Ficou inconsciente no meio da queda: fica deitada, sem levantar.
    if (this.unconscious) {
      this.knock = null;
      this.action = 'sleep';
      this.timer = Infinity;
      this.anim(this.view.animator.has('sleep') ? 'sleep' : 'idle', { pose: 'lie', facing: 'front' });
      this.emit('getUp');
      return;
    }
    k.t += dt;
    if (k.stage === 'impact') {
      if (k.t < 0.12) return;
      k.stage = 'down';
      k.t = 0;
      this.action = 'knockdown';
      this.anim('knockdown', { pose: 'lie', facing: 'front', restart: true });
      return;
    }
    if (k.stage === 'down') {
      if (k.t < KNOCK_DOWN_TIME) return;
      k.stage = 'up';
      k.t = 0;
      this.action = 'getup';
      this.anim('get_up', { facing: this.side(), restart: true });
      return;
    }
    if (k.stage === 'up') {
      if (k.t < KNOCK_GETUP_TIME) return;
      this.knock = null;
      this.action = 'land';
      this.timer = 0.2;
      this.anim('idle', { facing: this.side() });
      this.emit('getUp');
    }
  }

  land(s, impact = 0) {
    // A knockback has its own landing (the floor impact and the get-up).
    if (this.knock?.stage === 'air') return this.knockLand(s);
    const thrown = this.thrown;
    this.mode = 'ground';
    this.surfaceId = s.id;
    this.y = s.y;
    this.vx = this.vy = 0;
    this.thrown = false;
    if (this.leaving) return this.startLeave();
    if (this.dead) return this.lieDead();
    // Nocaute no ar: aterrissa e já fica deitada, sem levantar.
    if (this.unconscious) return this.lieUnconscious();
    if (impact > this.P * (thrown ? 9 : 20)) {
      this.action = 'dizzy';
      this.timer = this.paused ? Infinity : rand(2.2, 3.2);
      // Her own clumsy falls stay mild; a throw that lands hard is mistreatment.
      if (thrown) this.punish(impact > this.P * 15
        ? { mood: -32, health: -8, affection: -8 }
        : { mood: -16, health: -4, affection: -4 });
      else this.adjust({ mood: -6 });
      // A real fall hurts: her own hard tumbles always injure; a hard throw half the time.
      if (!thrown || impact > this.P * 15) this.addDebuff('lesao');
      else if (chance(0.4)) this.addDebuff('lesao');
      this.anim('sit', { pose: 'sit', facing: 'front' });
      this.emit('hardLand', { thrown });
      this.checkDeath();
      return;
    }
    if (this.chase) {
      this.chase.wallJumps = 0;
      this.emit('land', { thrown, impact: impact / this.P });
      return this.chase.qte ? this.holdCursor() : this.startChaseRun();
    }
    this.action = 'land';
    this.timer = 0.35;
    this.anim('idle');
    this.emit('land', { thrown, impact: impact / this.P });
  }

  startGround(kind) {
    // COMBAT_MODE: a ação é do motor da luta — nada de passeio/soneca por baixo.
    if (this.inCombat()) return;
    if (kind !== 'sleep' && kind !== 'sleepLong') this.onBed = false;
    // Sitting (resting or watching): the cushion first, if there is one on the floor.
    if (kind === 'sit' || kind === 'watch') {
      const c = this.onCushion || this.paused ? null : this.findCushion?.() ?? null;
      if (c != null && Math.abs(c - this.x) > 2 && this.goTo(c, () => {
        this.onCushion = true;
        this.startGround(kind);
      })) return;
      if (c != null) this.onCushion = Math.abs(c - this.x) <= 2;
    } else if (kind !== 'sleep' && kind !== 'sleepLong') this.onCushion = false;
    this.action = kind;
    const f = this.side();
    switch (kind) {
      case 'walk':
        if (chance(0.35)) this.dir = -this.dir;
        this.timer = rand(3, 9);
        this.anim('walk', { facing: this.side(), speed: this.tiredMul() });
        break;
      case 'run':
        if (chance(0.35)) this.dir = -this.dir;
        this.timer = rand(1.5, 3.5);
        this.anim('run', { facing: this.side(), speed: this.tiredMul() });
        break;
      case 'sit':
        this.timer = rand(6, 15);
        this.anim('sit', { pose: 'sit', facing: chance(0.5) ? 'front' : f });
        break;
      case 'sleep':
      case 'sleepLong': {
        // Has a bed (or cushion): walks over and sleeps on it.
        const bed = !this.onBed && !this.onCushion && !this.paused && this.findBed?.();
        if (bed && Math.abs(bed.x - this.x) > 2 && this.goTo(bed.x, () => {
          this[bed.cushion ? 'onCushion' : 'onBed'] = true;
          this.startGround('sleepLong');
        })) return;
        if (bed) this[bed.cushion ? 'onCushion' : 'onBed'] = true;
      }
        this.action = 'sleep';
        // Sleeps until fully recharged (or dragged awake); no bed/cushion = cold floor penalty.
        this.timer = Infinity;
        this.awake = 0;
        this.slept = 0;
        if (!this.onBed && !this.onCushion) {
          this.punish({ mood: -10 });
          this.app?.toys?.furn?.floatText?.(this.x, this.y - this.P * 1.2, this.cfg?.lang === 'en' ? 'Cold floor… −10 Mood' : 'Chão frio… −10 Humor');
        }
        this.anim('sleep', { pose: 'lie', facing: f });
        break;
      case 'emote': {
        const sad = this.negEmotes.length && (this.stats.mood < 35 || !this.emotes.length);
        const pool = sad ? this.negEmotes : this.emotes;
        const name = pool[Math.floor(Math.random() * pool.length)];
        const clip = this.view.animator.clips.get(name);
        this.timer = clip.loop === 'loop' ? clip.length * Math.max(1, Math.ceil(2.5 / clip.length)) : clip.length + 0.8;
        if (!sad) this.adjust({ mood: 2 });
        this.anim(name, { restart: true });
        break;
      }
      case 'jam':
        this.timer = rand(6, 10);
        this.anim(this.pickClip(['danca'], [...this.emotes, 'idle']), { restart: true, facing: 'front', speed: this.danceSpeed });
        break;
      case 'watch':
        // Sits diagonally, turned toward where the video is.
        this.timer = Infinity;
        this.watchFacing = (this.watchTarget ?? this.world.width / 2) >= this.x ? -Math.PI / 4 : Math.PI / 4;
        this.anim('sit', { pose: 'sit', facing: this.watchFacing });
        break;
      case 'hop':
        this.action = 'walk';
        this.hopAtEdge = true;
        this.timer = 12;
        this.anim('walk', { facing: this.side() });
        break;
      default:
        this.action = 'idle';
        this.timer = rand(2, 5);
        this.anim('idle');
    }
    if (this.paused && kind !== 'sleepLong' && kind !== 'watch' && kind !== 'jam') this.timer = Infinity;
    this.emit(this.action);
  }

  chooseNext() {
    // INCONSCIENTE (pós-derrota): nenhuma ação é escolhida; ela é destravada só quando acorda.
    if (this.unconscious) return;
    if (this.leaving) return this.startLeave();
    if (this.dead) return this.lieDead();
    if (this.powerOff) return this.lieOff();
    // COMBAT_MODE: the fight owns her; nothing else starts.
    if (this.inCombat()) {
      // A luta roda no tick do toy: se uma ação por baixo tirou o `action` de 'toy',
      // devolve a ação para ele (senão o updateToy para e a luta congela em pé).
      const tp = this.toyPlay;
      if (tp) {
        this.action = 'toy';
        this.timer = Math.max(1, (tp.dur || 3600) - (tp.t || 0));
        if (tp.picked) this.anim(tp.anim || 'idle', { pose: tp.pose || 'stand', facing: tp.facing || 'front' });
        return;
      }
      this.action = 'idle';
      this.timer = Infinity;
      return;
    }
    if (this.runQueued()) return;
    if (this.app?.game?.flushAfterPlay?.()) return;
    if (this.pending) {
      const kind = this.pending;
      this.pending = null;
      return this.startGround(kind);
    }
    if (this.chase) return this.chase.qte ? this.holdCursor() : this.startChaseRun();
    if (this.mini) return this.mini();
    if (this.meals.length && this.canStartEating()) return this.startEating();
    if (this.ballPlay && this.ball) {
      this.action = 'ball';
      this.timer = Infinity;
      return;
    }
    // Something ready on the 3D printer goes before Jam/Assistir.
    const parcel = this.findDelivery?.();
    if (parcel?.urgent && this.goTo(parcel.x, parcel.go, parcel.rush)) return;
    if (this.activity) return this.startGround(this.activity);
    if (this.paused) return this.startGround('idle');
    if (parcel && !parcel.urgent && this.goTo(parcel.x, parcel.go, parcel.rush)) return;
    const focus = !!isFocus(this.cfg, this.app);
    if (this.findToy && !focus && chance(0.3)) {
      const toy = this.findToy();
      if (toy && this.goTo(toy.x, () => toy.play(this))) return;
    }
    const w = { walk: 45, idle: 18, run: 7, sit: 10, emote: 12, sleep: 6, hop: this.surfaceId !== 'floor' ? 6 : 0, ...this.cfg.actionWeights };
    for (const k of Object.keys(w)) w[k] *= this.prefMul(k);
    // Stuck up on a window for too long: jumps back down to the taskbar.
    if (this.surfaceId !== 'floor' && this.clock - (this.floorAt ?? this.clock) > 120) w.hop = 400;
    if (!this.emotes.length && !this.negEmotes.length) w.emote = 0;
    const { energy: e, mood: m, hunger } = this.stats;
    if (focus) {
      w.run = 0;
      w.hop *= 0.3;
      w.walk *= 0.35;
      w.emote *= 0.3;
      w.sit *= 3;
      w.idle *= 2;
    }
    // Real madrugada (00–05h): a little sleepier and more fond of sitting still.
    if (this.cfg.dayRoutine !== false && dayPeriod() === 'madrugada') {
      w.sleep *= 1.5;
      w.sit *= 1.3;
    }
    if (!focus && this.gear.gancho && e > 30 && chance(0.25) && this.hookSomewhere()) return;
    if (!focus && this.gear.microfone && e > 25 && chance(0.05 * this.prefMul('mic')) && this.trySing?.()) return;
    if (!focus && this.surfaceId === 'floor' && e > 25 && chance(0.04) && this.tryDoll?.()) return;
    if (!focus && this.surfaceId === 'floor' && e > 20 && chance(0.05) && this.tryCrow?.()) return;
    if (this.exertion > 60 && this.clock - (this.pantAt ?? -1e9) > 25 && this.tryAntic?.('pant')) {
      this.pantAt = this.clock;
      return;
    }
    if (chance(focus ? 0.02 : 0.14) && this.tryAntic?.()) return;
    const bag = this.needsSupply?.();
    if (bag?.hooked) return;
    if (bag && this.goTo(bag.x, bag.use)) return;
    const bath = this.stats.hygiene < 40 && this.surfaceId === 'floor' && this.findBath?.();
    if (bath && this.goTo(bath.x, () => bath.play(this))) return;
    if (e > 70 || (this.awake < 90 && e >= 40)) w.sleep = 0;
    if (Date.now() < (this.noSleepUntil || 0)) w.sleep = 0;
    if (e < 50) {
      w.sleep *= e < 25 ? 8 : 2.5;
      w.sit *= 2;
      w.run *= 0.25;
    }
    if (hunger < 25) {
      w.run *= 0.3;
      w.sit *= 1.5;
    }
    if (m > 80) w.emote *= 1.6;
    if (m < 30) w.emote *= this.negEmotes.length ? 1.4 : 0.3;
    this.startGround(pickWeighted(w));
  }

  updateGround(dt) {
    const s = this.validateGround();
    if (!s) return;

    // COMBAT_MODE: a luta manda — só o toy da luta continua sendo ticado aqui.
    if (this.inCombat()) {
      if (this.action === 'toy') this.updateToy(dt);
      return;
    }

    // Free but still holding a player queue: drain now (do not wait for the idle timer).
    if ((this.afterPlay?.length || this.meals.length || this.actionQueue?.length)
      && !this.busyForQueue()
      && ['idle', 'walk', 'run', 'sit', 'emote'].includes(this.action)) {
      this.chooseNext();
      return;
    }

    if (this.action === 'chase') return this.updateChase(dt, s);
    if (this.action === 'toy') return this.updateToy(dt);
    if (this.action === 'ball') return this.updateBall(dt, s);
    if (this.action === 'hook') return;
    // Jam: the dance clip keeps playing, mixed with little hops, side steps and turns.
    if (this.action === 'jam') {
      this.jamT = (this.jamT ?? 2) - dt;
      if (this.jamT <= 0) {
        this.jamT = rand(1.5, 4) / (this.danceSpeed || 1);
        if (this.jamAlt) {
          this.jamAlt = false;
          this.anim(this.pickClip(['danca'], [...this.emotes, 'idle']), { restart: true, facing: 'front', speed: this.danceSpeed });
        }
        const r = Math.random();
        // Steps learned in "Siga o ritmo" (jamMoves 0..4): spin, cheer, long slide, big hop.
        const learned = this.jamMoves || 0;
        if (learned && r < 0.35) {
          const move = Math.floor(Math.random() * learned);
          if (move === 0) {
            this.view.setFacing(Math.PI);
            this.jamSpin = 0.35;
          } else if (move === 1) {
            this.anim(this.pickClip(['comemorar', 'emote_pos'], [...this.emotes, 'idle']), { restart: true, facing: 'front' });
            this.jamAlt = true;
            this.jamT = 1.3;
          } else if (move === 2) {
            this.dir = chance(0.5) ? 1 : -1;
            this.jamStep = 0.9;
            this.jamFast = true;
          } else {
            this.emit('hop');
            return this.fall(0, -this.P * 2.8);
          }
          return;
        }
        if (r < 0.22) {
          // Switch to another dance loop (danca / danca2 / …).
          this.anim(this.pickClip(['danca'], [...this.emotes, 'idle']), { restart: true, facing: 'front', speed: this.danceSpeed });
        } else if (r < 0.42) {
          this.emit('hop');
          return this.fall(rand(-0.5, 0.5) * this.P, -this.P * rand(1.3, 2.1));
        } else if (r < 0.62) {
          this.dir = chance(0.5) ? 1 : -1;
          this.jamStep = rand(0.3, 0.7);
        } else if (r < 0.8) this.view.setFacing(chance(0.5) ? 'left' : 'right');
        else this.view.setFacing('front');
      }
      if (this.jamSpin > 0 && (this.jamSpin -= dt) <= 0) this.view.setFacing('front');
      if (this.jamStep > 0) {
        this.jamStep -= dt;
        this.x = clamp(this.x + this.dir * this.walkSpeed * (this.jamFast ? 1.5 : 0.6) * dt, s.x1 + this.P * 0.2, s.x2 - this.P * 0.2);
        if (this.jamStep <= 0) this.jamFast = false;
      }
    }
    if (this.action === 'goto') {
      const g = this.goal;
      g.t -= dt;
      const d = g.x - this.x;
      if (Math.abs(d) < 3 || g.t <= 0) {
        this.goal = null;
        if (g.t > 0) g.cb();
        else this.chooseNext();
        return;
      }
      this.dir = Math.sign(d);
      this.x += this.dir * Math.min(Math.abs(d), (g.run ? this.runSpeed * 0.9 : this.walkSpeed * 1.3) * dt);
      this.anim(g.run ? 'run' : 'walk', { facing: this.side() });
      return;
    }

    if (this.action === 'walk' || this.action === 'run') {
      const speed = (this.action === 'run' ? this.runSpeed : this.walkSpeed) * this.tiredMul();
      const nx = this.x + this.dir * speed * dt;
      if (this.tryClimbWall(this.x, nx)) return;

      const lo = Math.max(s.x1 + this.edgeMargin, this.P * 0.2);
      const hi = Math.min(s.x2 - this.edgeMargin, this.world.width - this.P * 0.2);
      if ((this.dir > 0 && nx >= hi) || (this.dir < 0 && nx <= lo)) {
        this.x = clamp(nx, lo, hi);
        const screenEdge = this.dir > 0 ? hi >= this.world.width - this.P * 0.21 : lo <= this.P * 0.21;
        if (screenEdge && s.id === 'floor' && this.onScreenEdge?.(this.dir)) return;
        this.onEdge(s);
        return;
      }
      this.x = nx;
    }

    if (this.action === 'dead') return;
    if (this.action === 'sleep') {
      this.slept = (this.slept || 0) + dt;
      if (this.unconscious) this.timer = Infinity;           // inconsciente: acorda só pela regen própria
      else if (this.stats.energy >= 98 && this.slept > 20) this.timer = 0;
      else this.timer = Infinity;
    }
    this.timer -= dt;
    if (this.timer <= 0) {
      const wasSleeping = this.action === 'sleep';
      this.chooseNext();
      if (wasSleeping) {
        this.emit('wake', { startled: false });
        // Acabou de acordar: ela consome o que o jogador deixou na fila.
        this.drainWakeUpQueue();
      }
    }
  }

  onEdge(s) {
    const win = s.id === 'floor' ? null : this.world.window(s.id);
    const realEdge = win && (this.dir > 0 ? Math.abs(s.x2 - win.right) < 2 : Math.abs(s.x1 - win.x) < 2);
    if (win && this.hopAtEdge) {
      // Jumping down to the floor (or a lower window) below.
      this.hopAtEdge = false;
      this.emit('hop');
      return this.fall(this.dir * this.P * 1.4, -this.P * 2.5);
    }
    this.hopAtEdge = false;
    if (realEdge) {
      const wall = this.world.wallAt(s.id, this.side(), this.y + 4, 0);
      const r = Math.random();
      if (wall && r < 0.4) return this.startClimbDown(wall);
      if (r < 0.65) {
        this.emit('hop');
        return this.fall(this.dir * this.P * 1.1, -this.P * 3);
      }
    }
    this.dir = -this.dir;
    this.emit('edge');
    if (chance(0.3)) this.startGround('idle');
    else this.view.setFacing(this.side());
  }

  // Walking toward a window side: maybe climb it (jumping up to grab it if it hangs above).
  tryClimbWall(x0, x1) {
    const inset = this.climbInset;
    for (const w of this.world.wallsCrossed(x0 + this.dir * inset, x1 + this.dir * inset, this.y, this.dir)) {
      if (w.id === this.surfaceId) continue;
      if (w.y1 > this.y - this.P * 0.6) continue;
      if (w.y2 < this.y - Math.max(this.jumpReach, this.maxJump())) continue;
      if (Math.abs(w.y1 - w.top) > 2) continue;
      const mountX = w.x + this.dir * this.P * 0.3;
      if (!this.world.surfaceAt(w.id, mountX, 0)) continue;
      if (!chance(isFocus(this.cfg, this.app) ? 0 : this.cfg.climbChance * (this.stats.energy < 30 ? 0.3 : 1))) continue;
      this.startClimb(w);
      return true;
    }
    return false;
  }

  // ---------- walls ----------

  startClimb(w) {
    this.mode = 'wall';
    this.wall = { id: w.id, side: w.side };
    this.surfaceId = null;
    this.x = w.x + (w.side === 'left' ? -this.climbInset : this.climbInset);
    let targetY = Math.min(this.y, w.y2 - 2);
    // Often jumps straight up the side and clings there instead of climbing from the bottom.
    if (chance(0.5)) targetY = Math.min(targetY, Math.max(w.y1 + this.P * 0.4, this.y - rand(0.5, 1) * this.maxJump()));
    if (this.y - targetY > 3) {
      this.action = 'jumpGrab';
      this.jump = { y0: this.y, y1: targetY, t: 0, dur: 0.3 + ((this.y - targetY) / this.P) * 0.18 };
      this.anim('jump', { facing: 'back', restart: true });
    } else {
      this.action = 'climbUp';
      this.anim('climb', { pose: 'climb', facing: 'back' });
    }
    this.emit('climb', { jump: this.action === 'jumpGrab' });
  }

  startClimbDown(w) {
    this.mode = 'wall';
    this.wall = { id: w.id, side: w.side };
    this.surfaceId = null;
    this.y = Math.min(w.y2 - 1, this.y + this.P * 0.5);
    this.x = w.x + (w.side === 'left' ? -this.climbInset : this.climbInset);
    this.action = 'climbDown';
    this.anim('climb', { pose: 'climb', facing: 'back', speed: -1 });
  }

  // Climbs straight up the wallpaper (no window side needed) until the feet reach y; cb runs on
  // arrival, then it clings there for `hold` seconds and climbs back down.
  scaleTo(y, cb, hold = 4) {
    if (this.mode !== 'ground' || this.dead || this.chase) return false;
    this.mode = 'scale';
    this.surfaceId = null;
    this.scaling = { y, cb, hold, phase: 'up' };
    this.action = 'climbUp';
    this.anim('climb', { pose: 'climb', facing: 'back' });
    this.emit('climb', { jump: false });
    return true;
  }

  updateScale(dt) {
    const s = this.scaling;
    if (!s) return this.fall(0, 0);
    const speed = Math.max(this.climbSpeed, this.P * 2.2);
    if (s.phase === 'up') {
      this.y -= speed * dt;
      if (this.y <= s.y) {
        this.y = s.y;
        s.phase = 'hold';
        this.action = 'climbRest';
        this.anim('climbing', { pose: 'climb', facing: 'back' });
        s.cb?.();
      }
    } else if (s.phase === 'hold') {
      if ((s.hold -= dt) <= 0) {
        s.phase = 'down';
        this.action = 'climbDown';
        this.anim('climb', { pose: 'climb', facing: 'back', speed: -1 });
      }
    } else {
      const y0 = this.y;
      this.y += speed * 1.3 * dt;
      const land = this.world.landing(this.x, y0, this.y);
      if (land) {
        this.scaling = null;
        return this.land(land);
      }
      if (this.y > this.world.height) this.fall(0, 0);
    }
  }

  restOnWall(duration) {
    if (this.action !== 'climbRest') this.resumeAction = this.action;
    this.action = 'climbRest';
    this.timer = duration;
    this.anim('climbing', { pose: 'climb', facing: 'back' });
  }

  updateWall(dt) {
    if (this.action === 'jumpGrab') {
      const j = this.jump;
      j.t += dt;
      const u = Math.min(1, j.t / j.dur);
      this.y = j.y0 + (j.y1 - j.y0) * u - this.P * 0.25 * Math.sin(Math.PI * u);
      const w = this.world.wallAt(this.wall.id, this.wall.side, j.y1);
      if (!w) return this.fall(0, 0);
      this.x = w.x + (w.side === 'left' ? -this.climbInset : this.climbInset);
      if (u >= 1) {
        this.y = j.y1;
        this.jump = null;
        this.action = 'climbUp';
        this.anim('climb', { pose: 'climb', facing: 'back' });
      }
      return;
    }

    const w = this.validateWall();
    if (!w) return;

    if (this.paused && this.action !== 'climbRest') return this.restOnWall(Infinity);
    if (this.action === 'climbRest') {
      this.timer -= dt;
      if (this.timer <= 0) {
        this.action = this.resumeAction || 'climbUp';
        this.anim('climb', { pose: 'climb', facing: 'back', speed: this.action === 'climbDown' ? -1 : 1 });
      }
      return;
    }

    if (chance(dt * (this.stats.energy < 30 ? 0.35 : 0.12))) return this.restOnWall(rand(0.8, 2));

    if (this.action === 'climbUp') {
      this.y -= this.climbSpeed * dt;
      if (this.y <= w.y1) {
        this.y = w.y1;
        const dir = w.side === 'left' ? 1 : -1;
        const mountX = w.x + dir * this.P * 0.3;
        const s = Math.abs(w.y1 - w.top) <= 2 ? this.world.surfaceAt(w.id, mountX, 0) : null;
        if (!s) return this.startClimbDown(w);
        this.mode = 'ground';
        this.surfaceId = w.id;
        this.wall = null;
        this.dir = dir;
        this.x = mountX;
        this.y = s.y;
        this.action = 'walk';
        this.timer = rand(2, 6);
        this.anim('walk', { facing: this.side() });
        this.emit('climbTop');
      }
    } else {
      const y0 = this.y;
      this.y += this.climbSpeed * dt;
      const s = this.world.landing(this.x, y0, this.y);
      if (s) {
        this.dir = w.side === 'left' ? -1 : 1;
        return this.land(s);
      }
      if (this.y > w.y2) this.fall(0, 0);
    }
  }

  // ---------- air ----------

  // Todo salto passa por aqui: ela AGACHA (~220 ms) e só depois recebe o vy.
  // (A exaustão/sono cancelam a agachada: nada de ficar agachada para sempre.)
  startJumpPrep(vx, vy) {
    this.jumpPrep = { vx, vy, t: 0 };
    this.anim('jump_prep', { facing: this.side(), restart: true });
    this.emit('jumpPrep');
  }

  updateJumpPrep(dt) {
    const p = this.jumpPrep;
    if (!p) return;
    p.t += dt;
    if (this.dead || this.paused || this.mode !== 'ground') { this.jumpPrep = null; return; }
    if (p.t < JUMP_PREP) return;
    const { vx, vy } = p;
    this.jumpPrep = null;
    this.fall(vx, vy, true);
  }

  fall(vx, vy, skipPrep = false) {
    // Um salto para cima começa com a agachada (o vy só entra depois dela).
    if (!skipPrep && vy < 0 && !this.jumpPrep && this.mode === 'ground' && !this.dead && !this.paused) {
      this.startJumpPrep(vx, vy);
      return;
    }
    this.scaling = null;
    this.mode = 'air';
    this.surfaceId = null;
    this.wall = null;
    this.jump = null;
    this.vx = vx;
    this.vy = vy;
    this.action = 'fall';
    this.anim('jump', { facing: Math.abs(vx) > this.P ? this.side() : 'front' });
  }

  updateAir(dt) {
    const W = this.world.width;
    const H = this.world.height;
    this.vy = Math.min(this.vy + this.gravity * dt, this.P * 25);
    this.vx *= Math.exp(-0.35 * dt);
    const y0 = this.y;
    const x0 = this.x;
    this.y += this.vy * dt;
    this.x += this.vx * dt;
    if (this.ballPlay) this.ballHeader();
    const minX = this.P * 0.2;
    const maxX = W - this.P * 0.2;
    // Chase parkour: kick off screen edges and window sides toward the cursor.
    const ch = this.chase;
    if (ch && !ch.qte && this.cursor && ch.wallJumps < 3 && Math.abs(this.vx) > this.P * 0.5) {
      const dirX = Math.sign(this.vx);
      const hitScreen = this.x < minX || this.x > maxX;
      const wall = !hitScreen && this.world.wallsCrossed(x0, this.x, this.y - this.P * 0.5, dirX).find((w) => w.y1 < this.y - this.P * 0.5);
      if ((hitScreen || wall) && this.cursor.y < this.y - this.P * 0.5) {
        ch.wallJumps++;
        this.x = hitScreen ? clamp(this.x, minX, maxX) : x0;
        this.dir = -dirX;
        this.vx = -dirX * this.runSpeed * 1.4;
        this.vy = -Math.sqrt(2 * this.gravity * Math.min(this.P * 3, this.maxJump()));
        this.anim('jump', { facing: this.side(), restart: true });
        this.emit('wallJump');
        return;
      }
    }
    if (this.x < minX || this.x > maxX) {
      this.x = clamp(this.x, minX, maxX);
      const hard = Math.abs(this.vx) > this.P * 6;
      this.vx = (this.x === minX ? 1 : -1) * Math.abs(this.vx) * 0.45;
      if (hard) this.emit('bump');
    }
    const top = this.P * 1.05;
    if (this.y < top && this.vy < 0) {
      this.y = top;
      const hard = this.vy < -this.P * 6;
      this.vy = Math.abs(this.vy) * 0.3;
      if (hard) this.emit('bump');
    }
    if (this.vy >= 0) {
      // Thrown onto the trampoline or the bed: springs back up, a bit lower each time.
      const b = this.vy > this.P * 2.6 && this.bouncer?.(this.x, y0, this.y);
      if (b) {
        this.y = b.top;
        this.vy = -Math.min(this.vy * b.rest, Math.sqrt(2 * this.gravity * this.P * b.max));
        this.vx *= 0.75;
        this.emit('bounce', { key: b.key, sfx: b.sfx });
        return;
      }
      const s = this.world.landing(this.x, y0, this.y);
      if (s) return this.land(s, this.vy);
    }
    if (this.y >= H) this.land(this.world.surfaces[0], this.vy);
  }

  // ---------- main ----------

  // How hard she is working right now (1 = standing around). Drives the drain of energy, hunger,
  // thirst and hygiene: resting, reading or gaming < 1, walking a bit more, running/climbing/sports a lot.
  effort() {
    const a = this.action;
    const tp = this.toyPlay;
    const base = this.effortBase(a, tp);
    // A high Constitution makes every action cost less (see ENERGY_PER_CON in game.js).
    const con = this.app?.game?.attrLevel?.('con') ?? 1;
    return base * (1 - (con - 1) * 0.04);
  }

  effortBase(a, tp) {
    if (this.mode === 'held') return 0.7;
    if (this.mode === 'wall' || this.mode === 'scale' || this.mode === 'hook' || a === 'climbUp' || a === 'climbDown') return 2.6;
    if (this.mode === 'air') return 1.8;
    if (tp) {
      if (tp.effort) return tp.effort;
      if (tp.id === 'espada' || tp.id === 'ball' || /^bola/.test(tp.id)) return 2.2;
      if (tp.cart || tp.console || tp.pose === 'sit' || tp.pose === 'lie' || tp.anim === 'sit' || tp.anim === 'sleep') return 0.6;
      return 1.2;
    }
    if (a === 'antic') return ANTIC_EFFORT[this.anticKind] ?? 1.2;
    if (a === 'goto') return this.goal?.run ? 2.2 : 1.25;
    return ACTION_EFFORT[a] ?? 1;
  }

  updateStats(dt) {
    if (this.dead) return;
    const d = DIFFICULTIES[this.cfg.difficulty] ?? 1;
    const s = this.stats;
    const sleeping = this.mode === 'ground' && this.action === 'sleep';
    // INCONSCIENTE (pós-derrota): deitada, regen passiva, sem punição e sem drain — acorda no fim do tempo.
    if (this.unconscious) {
      const maxHP = this.maxHealth?.() ?? 100;
      const total = Math.max(1, this.koTotal ?? KO_TIME);
      // A regen acompanha o relógio do nocaute: energia cheia e saúde até METADE ao acordar.
      s.energy = Math.min(100, s.energy + (100 / total) * dt);
      s.health = Math.min(maxHP * 0.5, s.health + (maxHP * 0.5 / total) * dt);
      s.mood = Math.min(100, s.mood + 1.2 * dt);
      this.koT = Math.max(0, (this.koT ?? 0) - dt);
      if (this.koT <= 0) this.reviveUnconscious();
      else {
        this._koUiT = (this._koUiT || 0) + dt;
        if (this._koUiT >= 0.5) {
          this._koUiT = 0;
          const total = Math.max(1, this.koTotal ?? KO_TIME);
          try { this.app?.combatUI?.updateDefeatProgress?.(1 - this.koT / total, this.koT); } catch { /* HUD */ }
        }
      }
      for (const k of Object.keys(s)) s[k] = clamp(s[k], 0, 100);
      this.updateDebuffs(dt);
      return;
    }
    const noHunger = this.buff('noHunger');
    const noTired = this.buff('noTired');
    if (this.action !== 'sleep' && this.action !== 'goto') this.onBed = false;
    if (!['sleep', 'goto', 'sit', 'watch', 'react', 'eat'].includes(this.action) && !this.toyPlay?.cushioned) this.onCushion = false;
    const e = sleeping ? 0 : this.effort();
    if (sleeping) {
      // Bed: faster rest and the hunger stops at half; floor: slow.
      // Upgraded bed: 1.5x faster, no hunger nor thirst; upgraded cushion: comfier.
      const up = !!this.furnUp?.(this.onBed ? 'cama' : this.onCushion ? 'almofada' : '');
      s.energy += RATES.energySleep * (this.onBed ? (up ? 3 : 2) : this.onCushion ? (up ? 2.1 : 1.4) : 0.6) * dt;
      if (up) s.mood += this.moodGain((this.onBed ? 0.02 : 0.03) * dt);
      if (!noHunger && !(this.onBed && (up || s.hunger <= 50))) s.hunger -= RATES.hungerSleep * d * dt;
    } else {
      if (!noTired) s.energy -= (e > 1 ? RATES.energy + RATES.energyActive * (e - 1) : RATES.energy * e) * d * dt;
      if (!noHunger) s.hunger -= RATES.hunger * d * (1 + (e - 1) * 0.6) * dt;
    }
    if (!(sleeping && this.onBed && this.furnUp?.('cama'))) s.thirst -= RATES.thirst * d * (sleeping ? 0.5 : Math.max(0.5, e)) * dt;
    s.hygiene = Math.max(0, s.hygiene - RATES.hygiene * d * (sleeping ? 0.3 : Math.max(0.3, 1 + (e - 1) * 4)) * dt);
    this.exertion = clamp(this.exertion + ((e >= 1.8 ? 2 * (e - 1) : 0) - 1.2) * dt, 0, 100);
    // Jam / Assistir: fun but tiring and makes the pet hungry.
    const act = this.activity;
    if (act === 'jam' && ['jam', 'react'].includes(this.action)) {
      s.mood += this.moodGain(0.09 * dt);
      if (!noHunger) s.hunger -= 0.025 * d * dt;
      if (!noTired) s.energy -= 0.03 * d * dt;
      s.thirst -= 0.03 * d * dt;
    } else if (act === 'watch' && ['watch', 'react', 'eat'].includes(this.action)) {
      s.mood += this.moodGain(0.06 * dt);
      if (!noHunger) s.hunger -= 0.02 * d * dt;
    }
    // Hungry or thirsty for a long time hurts the affection.
    if (s.hunger < 40 || s.thirst < 40) {
      this.neglect += dt;
      if (this.neglect > 180) this.love(-0.012 * d * dt);
    } else this.neglect = 0;
    // Natural drain: affection and survival needs scale it, and it hard-stops at 50 — below that,
    // only direct mistreatment (punish) can take Humor lower.
    if (s.mood > 50) {
      const moodDrain = RATES.mood * (1 + 0.35 * (1 - this.affT())) * (1 + 0.6 * (1 - this.needN()));
      s.mood = Math.max(50, s.mood - moodDrain * d * dt);
    }
    if (this.bored) {
      for (const k of Object.keys(this.bored)) if ((this.bored[k] -= dt * 0.08) <= 0) delete this.bored[k];
    }
    if (s.hunger < 50) {
      if (!this.buff('shield')) s.health -= RATES.healthStarve * ((50 - s.hunger) / 50) * dt;
    } else if (s.hunger > 80 && s.mood > 80) s.health += RATES.healthRegen * dt;
    for (const k of Object.keys(s)) s[k] = clamp(s[k], 0, 100);
    if (s.energy <= 0 && !this.exhausted) this.collapseFromExhaustion();
    else if (s.energy > 22) this.exhausted = false;

    this.moodTimer -= dt;
    if (this.moodTimer <= 0) {
      this.moodTimer = rand(25, 50);
      this.emit('mood', { ...s });
    }
    this.updateDebuffs(dt);
    this.checkDeath();
  }

  // Energy hit zero: faint, lose humor / a little affection, warn the player about pat/slap prefs.
  collapseFromExhaustion() {
    if (this.dead || this.exhausted || this.offstage) return;
    // Em combate, o motor encerra do jeito certo ('Sem energia — a horda recuou').
    if (this.combatMode) return;
    this.exhausted = true;
    if (this.toyPlay) this.endToy(true);
    if (this.ballPlay) this.endBall(true);
    if (this.activity) this.app?.modes?.stop?.();
    this.adjust({ mood: -18, energy: 8 });
    this.love(-4);
    this.emit('exhausted');
    const en = this.cfg?.lang === 'en';
    const msg = en
      ? 'She fainted from exhaustion! Use pat / slap while she trains or plays to tune how often she does it.'
      : 'Ela desmaiou de cansaço! Use o modo cafuné / tapa nas atividades dela para ajustar com que frequência ela treina e brinca.';
    this.app?.toys?.furn?.floatText?.(this.x, this.y - this.P * 1.2, en ? '😵 Exhausted!' : '😵 Desmaiou!');
    setTimeout(() => this.app?.speech?.say?.(msg, 5), 400);
    // Toast banner for the player.
    const tip = document.createElement('div');
    tip.className = 'mg-toast';
    tip.textContent = msg;
    document.body.append(tip);
    setTimeout(() => tip.remove(), 5200);
    if (this.mode === 'ground') {
      this.startGround('sleep');
      this.anim(this.pickClip(['triste', 'medo'], ['sleep', 'sit']), { pose: 'sleep', facing: 'front', restart: true });
    }
  }

  update(dt) {
    if (this.offstage || this.x === null || !this.world.ready) return;
    // O número do frame: o motor da luta usa para ser ticado UMA vez por frame.
    this.frame = (this.frame || 0) + 1;
    this.awake += dt;
    this.clock += dt;
    // Combat clips: the hit frame and the return to the fighting stance.
    this.combatAnim?.update(dt);
    // A agachada antes do pulo: o vy só entra quando ela acaba de levantar.
    if (this.jumpPrep) { this.updateJumpPrep(dt); return; }
    // No chão depois de um nocaute: ela fica deitada e só se levanta depois.
    if (this.knock && this.mode === 'ground') { this.updateKnock(dt); return; }
    if (this.dosing > 0) {
      this.dosing -= dt;
      if (this.dosing <= 0) {
        this.dosing = 0;
        // Short beat between PowerUps so FX/jingle don't stack or cancel.
        if (this.meals.length) this.doseGap = 0.45;
      }
    } else if (this.doseGap > 0) {
      this.doseGap -= dt;
      if (this.doseGap <= 0) {
        this.doseGap = 0;
        if (this.meals.length && this.canStartEating()) this.startEating();
        else if (this.action === 'react') this.timer = Math.min(this.timer, 0.1);
      }
    }
    if (this.surfaceId === 'floor' || this.mode !== 'ground') this.floorAt = this.clock;
    if (this.leaving && this.mode === 'ground') return this.updateLeave(dt);
    if (!this.powerOff && this.action !== 'boot') {
      this.updateStats(dt);
      if (!this.dead) this.updateRequest(dt);
    }
    // Escalar a janela treina a Força aos poucos (o tempo lá em cima conta).
    if ((this.mode === 'wall' || this.mode === 'scale') && (this.action === 'climbUp' || this.action === 'climbDown')) {
      this.app?.game?.attrGain?.('str', ATTR_XP.str.climb * dt, 'climb');
    }
    // Correr de verdade treina a Agilidade (andar não conta — só pega-pega/perseguição/correr).
    if (this.action === 'run') {
      this.app?.game?.attrGain?.('agi', ATTR_XP.agi.run * dt, 'run');
    }
    if (this.mode !== 'held') this.tilt *= Math.exp(-8 * dt);
    if (this.eating && this.action !== 'eat') this.finishEating();
    // Em combate, a luta não pode acabar porque uma ação mudou por baixo (só o motor encerra).
    if (this.toyPlay && this.action !== 'toy' && !this.combatMode) this.endToy(true);
    if (this.goal && this.action !== 'goto') this.goal = null;
    // Closeup hop uses hideRect behind the taskbar; don't clear it mid-approach.
    if (this.hideRect && !this.chase?.hide && !this.closeup) this.hideRect = null;
    if (this.ballPlay && this.mode === 'ground' && !['ball', 'land', 'hook'].includes(this.action)) this.endBall(true);
    if (this.hook && this.mode === 'held') this.hook = null;

    const ch = this.chase;
    if (ch?.qte) {
      this.updateQte(dt);
    } else if (ch) {
      ch.t -= dt;
      ch.grace -= dt;
      if (this.mode !== 'held' && ch.grace <= 0 && this.cursorCaught()) {
        ch.caught = true;
        this.startQte();
      } else if (ch.t <= 0) {
        this.endChase(false);
      }
    }

    if (this.hook) {
      this.updateHook(dt);
      if (this.mode === 'hook' || (this.mode === 'ground' && this.action === 'hook')) return;
    }
    if (this.mode === 'held') {
      this.updateHeld(dt);
    } else if (this.mode === 'hook') {
      this.fall(0, 0);
    } else if (this.mode === 'ground') {
      if (this.action === 'eat') {
        if (this.validateGround()) this.updateEating(dt);
      } else if (this.action === 'qte') {
        this.validateGround();
      } else if (['land', 'dizzy', 'hurt', 'react'].includes(this.action)) {
        this.validateGround();
        this.timer -= dt;
        if (this.timer <= 0) {
          // Still dosing / in the gap: keep the react pose until the queue advances.
          if (this.dosing > 0 || this.doseGap > 0) {
            this.timer = 0.2;
          } else if (this.pending || this.chase || this.dead || this.meals.length || this.activity || this.ballPlay || this.action === 'react') {
            this.chooseNext();
          } else if (this.paused) this.startGround('idle');
          else if (this.powerOff) this.lieOff();
          // Em combate a luta manda: nada de passeio aleatório depois do get_up (o
          // chooseNext devolve a ação ao toy da luta).
          else if (this.action === 'land' && !this.inCombat()) this.startGround(chance(0.6) ? 'walk' : 'idle');
          else this.chooseNext();
        }
      } else {
        this.updateGround(dt);
      }
    } else if (this.mode === 'wall') {
      this.updateWall(dt);
    } else if (this.mode === 'scale') {
      this.updateScale(dt);
    } else {
      this.updateAir(dt);
    }
    // Resgate do combate: o motor da luta só é ticado pelo toy do combate. Se alguma coisa
    // por baixo troca o `action` (remédio, reação, queda) o updateToy não roda e a luta
    // congelaria em pé. Aqui ele é ticado no máximo UMA vez por frame, seja qual for a ação.
    const melee = this.app?.melee;
    if (this.combatMode && melee?.active && melee.frame !== this.frame) melee.update(dt);
  }
}
