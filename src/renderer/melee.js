// Turn-based melee combat (unarmed).
//
// The engine owns the COMBAT_MODE: while a fight is on, the game is locked (no petting, no
// dragging, no random events, no crow, no needs), a red frame burns around the screen and the
// combat track loops over the regular music.
//
// The turns alternate: PERSOCON → OPPONENT. Each turn plays one of the YSM combat clips
// (combatanims.js) and the result is rolled with the Combat Skill Level: a higher level means
// more accuracy, more crits and a better defense.
import { combatMoves, skillLevel, skillGain } from './skills.js';
import { COMBAT_META } from './combatanims.js';

export const TURN = { PERSOCON: 'persocon', OPPONENT: 'opponent' };
// Energy below this ends the training: she is too tired to keep going.
export const EXHAUST_ENERGY = 15;
// Base energy spent on a turn; a higher Combat Skill Level makes every strike cheaper.
export const BASE_TURN_ENERGY = 3;
export const MIN_TURN_ENERGY = 0.8;
// The sparring is non-lethal: she stops at half of her health.
export const SAFETY_HP = 0.5;

const clamp = (v, a, b) => Math.min(Math.max(v, a), b);
const pick = (l) => l[Math.floor(Math.random() * l.length)];

// ---------- the combat track (a small 8-bit battle loop) ----------
// A driving riff in D minor with a bass pulse and a snare: it loops until the fight ends.
const STEP = 0.125;
const BASS = [38, 38, 41, 38, 36, 36, 33, 36];
const LEAD = [62, 65, 69, 65, 62, 60, 57, 60, 62, 69, 72, 69, 65, 62, 60, 57];

class CombatMusic {
  constructor(sound) {
    this.sound = sound;
    const c = sound.ctx;
    if (!c) return;
    this.out = c.createGain();
    this.out.gain.value = 0.55;
    this.out.connect(sound.master);
    this.k = 0;
    this.t = c.currentTime + 0.08;
    this.iv = setInterval(() => this.pump(), 60);
    this.pump();
  }

  note(t, n, dur, vol, type = 'square') {
    const c = this.sound.ctx;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(440 * 2 ** ((n - 69) / 12), t);
    g.gain.setValueAtTime(vol, t);
    g.gain.setValueAtTime(vol, t + Math.max(0.01, dur - 0.04));
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.out);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  kick(t) {
    const c = this.sound.ctx;
    const o = c.createOscillator();
    const g = c.createGain();
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.1);
    g.gain.setValueAtTime(0.35, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    o.connect(g).connect(this.out);
    o.start(t);
    o.stop(t + 0.16);
  }

  pump() {
    const s = this.sound;
    if (!s?.ctx) return;
    while (this.t < s.ctx.currentTime + 0.3) {
      if (s.enabled) this.step(this.k, this.t);
      this.k++;
      this.t += STEP;
    }
  }

  step(k, t) {
    const i = k % 16;
    const bar = Math.floor(k / 16) % BASS.length;
    const root = BASS[bar];
    this.note(t, root - 12, STEP * 1.6, 0.09, 'triangle');
    if (i % 2 === 0) this.note(t, LEAD[(k + bar) % LEAD.length], STEP * 0.8, 0.045);
    if (i % 4 === 0) this.kick(t);
    if (i === 4 || i === 12) this.sound.noise?.(t, 0.07, 0.11, 2400);
  }

  stop() {
    clearInterval(this.iv);
    const now = this.sound?.ctx?.currentTime ?? 0;
    try {
      this.out.gain.setTargetAtTime(0.0001, now, 0.08);
      setTimeout(() => this.out.disconnect(), 700);
    } catch { /* the context may be gone */ }
  }
}

// ---------- the engine ----------
export class Melee {
  constructor(app) {
    this.app = app;
    this.active = false;    // COMBAT_MODE
    this.kind = null;       // 'dummy' (training) | 'fight' (the scrap dummy)
    this.turn = TURN.PERSOCON;
    this.phase = 'idle';    // 'idle' | 'intro' | 'acting' | 'resolve'
    this.t = 0;
    this.wait = 0;
    this.move = null;
    this.next = TURN.PERSOCON;
    this.turns = 0;
    this.hits = 0;
    this.hitResolved = false;
    this.introT = 0;
    this.petHp = 100;
    this.opp = { hp: 100, max: 100, level: 1, defense: 0.2, dummy: true, scrap: false, name: 'Boneco' };
    this.music = null;
    this.hpBar = null;
    this.onPetEvent = (type, data) => this.onEvent(type, data);
    app.pet?.on?.(this.onPetEvent);
  }

  get pet() { return this.app.pet; }
  get game() { return this.app.game; }
  // The Combat Skill Level (the unarmed skill).
  get level() { return skillLevel(this.game?.skillXp?.('unarmed') || 0); }
  // The moves she may use right now (only the unlocked ones).
  get moves() { return combatMoves(this.game?.skillXp?.('unarmed') || 0); }
  get attacks() { return this.moves.filter((m) => m.kind === 'attack'); }

  // The energy a strike costs: the better she is, the less it costs.
  energyCost() {
    const lvl = this.level;
    return Math.max(MIN_TURN_ENERGY, BASE_TURN_ENERGY * (1 - (lvl - 1) * 0.06));
  }

  // ---------------- COMBAT_MODE ----------------

  enter(kind = 'fight') {
    if (this.active) return false;
    this.active = true;
    this.kind = kind;
    this.turns = 0;
    this.hits = 0;
    this.petHp = this.pet?.stats?.health ?? 100;
    this.pet.combatMode = true;
    // The frame and the combat track belong to the real fights; the training stays clean.
    if (kind !== 'dummy') {
      document.body.classList.add('combat-mode');
      this.app.sound?.pauseMusic?.();
      if (this.app.sound?.enabled) this.music = new CombatMusic(this.app.sound);
    }
    this.pet.emit?.('combatStart', { kind });
    return true;
  }

  leave(reason = 'end') {
    if (!this.active) return;
    this.active = false;
    this.kind = null;
    this.phase = 'idle';
    this.move = null;
    this.pet.combatMode = false;
    document.body.classList.remove('combat-mode');
    this.music?.stop();
    this.music = null;
    this.app.sound?.resumeMusic?.();
    this.removeHpBar();
    this.pet.emit?.('combatEnd', { reason, turns: this.turns, hits: this.hits });
  }

  // ---------------- the training against the dummy ----------------

  // Starts the simulated fight against the Training Dummy. Returns false when she cannot train.
  startTraining() {
    const { pet, game, toys } = this.app;
    const dummy = game?.toys?.boneco_treino;
    if (!dummy?.placed || dummy.broken) return false;
    if (pet.stats.energy < 50) {
      toys?.furn?.floatText?.(pet.x, pet.y - pet.P, '😵 Precisa de ≥50% de energia');
      return false;
    }
    this.opp = { hp: 100, max: 100, level: 1, defense: 0.22, dummy: true, scrap: false, name: 'Boneco' };
    if (!this.enter('dummy')) return false;
    this.phase = 'intro';
    this.t = 0;
    this.introT = 0;
    return true;
  }

  // ---------------- the heavy training (real sparring) ----------------

  // "Treino Pesado": a real fight against the upgraded Scrap Dummy. It attacks back.
  startSparring() {
    const { pet, game, toys } = this.app;
    const dummy = game?.toys?.boneco_treino;
    if (!dummy?.placed || dummy.broken) return false;
    if (!dummy.up) {
      toys?.furn?.floatText?.(pet.x, pet.y - pet.P, '🔧 Precisa do boneco Sucataoxidado');
      return false;
    }
    if (pet.stats.energy < 30) {
      toys?.furn?.floatText?.(pet.x, pet.y - pet.P, '😵 Precisa de ≥30% de energia');
      return false;
    }
    // The Scrap Dummy is one level below hers (at level 1 and 2 it is her equal).
    const lvl = this.level;
    const oppLvl = lvl <= 2 ? lvl : lvl - 1;
    this.opp = {
      hp: 100, max: 100, level: oppLvl, defense: 0.16 + oppLvl * 0.03,
      dummy: false, scrap: true, name: 'Sucataoxidado',
    };
    this.petHp = pet.stats.health;
    this.petHpMax = 100;      // her health never goes over 100
    if (!this.enter('fight')) return false;
    this.phase = 'intro';
    this.t = 0;
    this.introT = 0;
    this.showHpBar();
    return true;
  }

  // ---------------- the turns ----------------

  update(dt) {
    if (!this.active) return;
    const pet = this.pet;
    this.t += dt;
    switch (this.phase) {
      case 'intro': {
        // She steps into the strike range (the toy play owns her position) and squares up.
        this.introT += dt;
        const side = Math.sign((this.oppX() ?? pet.x) - pet.x) || pet.dir || 1;
        const want = (this.oppX() ?? pet.x) - side * pet.P * 0.8;
        const d = want - pet.x;
        pet.dir = side;
        if (Math.abs(d) > 2) pet.x += Math.sign(d) * Math.min(Math.abs(d), (pet.walkSpeed || 60) * 1.1 * dt);
        if (Math.abs(want - pet.x) <= 3 || this.introT > 1.4) this.beginTurn(TURN.PERSOCON);
        break;
      }
      case 'acting':
        // The clip is playing: the hit is resolved by the combatHit event. If the clip never
        // fires it (missing clip, interrupted), the turn still resolves.
        if (!this.hitResolved && this.t > (this.moveDur || 1) + 0.7) this.resolveHit();
        break;
      case 'resolve':
        if (this.t >= this.wait) this.beginTurn(this.next);
        break;
      default:
        break;
    }
    if (this.opp.scrap) this.updateHpBar();
    // The training ends when she is too tired (or the dummy is gone).
    if (this.active && this.kind === 'dummy') {
      const d = this.game?.toys?.boneco_treino;
      if (!d?.placed || d.broken) this.finishTraining('dummy-gone');
      else if (pet.stats.energy <= EXHAUST_ENERGY) this.finishTraining('tired');
    }
    // The sparring: non-lethal. She stops at half of her health.
    if (this.active && this.kind === 'fight') {
      const hp = pet.stats.health;
      if (hp <= (this.petHpMax ?? 100) * SAFETY_HP) this.finishSparring('safety');
      else if (pet.stats.energy <= EXHAUST_ENERGY) this.finishSparring('tired');
      else if (this.opp.hp <= 0) this.finishSparring('win');
    }
  }

  beginTurn(who) {
    this.turn = who;
    this.phase = 'acting';
    this.t = 0;
    this.hitResolved = false;
    if (who === TURN.PERSOCON) this.persoconTurn();
    else this.opponentTurn();
  }

  // The Persocon's turn: she uses one of the moves she has unlocked.
  persoconTurn() {
    const pet = this.pet;
    const list = this.attacks.length ? this.attacks : this.moves;
    if (!list.length) { this.finishTraining('nomoves'); return; }
    // The higher the level, the rarer the move (the basic jab is the bread and butter).
    const weights = list.map((m) => Math.max(1, 12 - m.lvl * 1.4));
    const move = pickWeighted(list, weights);
    this.move = move;
    this.next = TURN.OPPONENT;
    const facing = this.facing();
    pet.dir = facing > 0 ? 1 : -1;
    if (!pet.playAnimation(move.clip, { facing: facing > 0 ? 'right' : 'left' })) {
      // The model has no such clip: fall back to the stance.
      pet.playAnimation('combat_idle', { facing: facing > 0 ? 'right' : 'left' });
    }
    this.moveDur = (this.metaOf(move)?.durationMs ?? 400) / 1000;
  }

  // The opponent's turn. The Training Dummy NEVER attacks: it braces and waits.
  // The Scrap Dummy fights back.
  opponentTurn() {
    const pet = this.pet;
    this.next = TURN.PERSOCON;
    if (this.opp.scrap) return this.scrapTurn();
    this.move = { id: 'brace', name: 'Defende', kind: 'defend', clip: 'combat_block', dmg: 0 };
    this.moveDur = 0.45;
    const x = this.oppX();
    this.float(x, this.oppY() - 20, '🛡 O boneco se defende!');
    this.app.sound?.tone8?.(220, 160, 0.12, 'triangle', 0.05);
    // She waits in the fighting stance while the dummy braces.
    pet.anim('idle', { facing: this.facing() > 0 ? 'right' : 'left', restart: false });
    this.phase = 'acting';
    this.t = 0;
  }

  // The Scrap Dummy attacks: it rolls against her block/dodge and really hurts.
  scrapTurn() {
    const pet = this.pet;
    this.next = TURN.PERSOCON;
    this.move = { id: 'scrap', name: 'Golpe de Sucata', kind: 'attack', clip: 'attack_jab', dmg: 4 + this.opp.level * 2.2 };
    this.moveDur = 0.5;
    this.phase = 'acting';
    this.t = 0;
    this.float(this.oppX(), this.oppY() - 26, '⚙️ O Sucataoxidado ataca!');
    // The rolls: its accuracy against her defense.
    const lvl = this.level;
    const acc = clamp(0.38 + this.opp.level * 0.05, 0.2, 0.9);
    const block = clamp(0.06 + lvl * 0.035, 0.02, 0.4);
    const dodge = clamp(0.04 + lvl * 0.02, 0.02, 0.3);
    const r = Math.random();
    if (r < block) {
      this.resolveDefence('block');
    } else if (r < block + dodge) {
      this.resolveDefence('dodge');
    } else if (r < block + dodge + acc) {
      this.resolvePlayerHit();
    } else {
      this.resolveMiss();
    }
  }

  // She blocks: the metallic spark + the guard pose.
  resolveDefence(kind) {
    const pet = this.pet;
    const heavy = kind === 'block';
    pet.playAnimation(kind === 'dodge' ? 'combat_dodge_step' : 'combat_block', { facing: this.facing() > 0 ? 'right' : 'left' });
    this.float(pet.x, pet.y - pet.P * 1.1, kind === 'dodge' ? '💨 Ela desviou!' : '🛡 Ela bloqueou!');
    this.app.fx?.impact(kind === 'dodge' ? 'dust' : 'shield', pet.x + this.facing() * pet.P * 0.35, pet.y - pet.P * 0.6, kind === 'dodge' ? 0.45 : 0.5);
    this.app.fx?.shake(0.3);
    this.app.sound?.tone8?.(kind === 'dodge' ? 700 : 520, 220, 0.1, 'square', 0.07);
    this.afterTurn(0.45);
  }

  // The Scrap Dummy's blow lands: real health damage and the stagger animation.
  resolvePlayerHit() {
    const pet = this.pet;
    const dmg = Math.round(this.move.dmg * (0.85 + this.opp.level * 0.03) * (Math.random() < 0.15 ? 1.6 : 1));
    pet.adjust({ health: -dmg });
    pet.playAnimation('combat_hit_stagger', { facing: this.facing() > 0 ? 'right' : 'left' });
    this.float(pet.x, pet.y - pet.P * 1.15, `💢 −${dmg} Saúde`);
    this.app.fx?.impact('rust', pet.x + this.facing() * pet.P * 0.3, pet.y - pet.P * 0.65, 0.5);
    this.app.fx?.shake(0.55);
    this.app.sound?.tone8?.(140, 60, 0.14, 'square', 0.11);
    this.afterTurn(0.6);
  }

  // The Scrap Dummy misses.
  resolveMiss() {
    const pet = this.pet;
    this.float(pet.x, pet.y - pet.P * 1.1, '💨 O Sucataoxidado errou!');
    this.app.fx?.impact('dust', pet.x + this.facing() * pet.P * 0.3, pet.y - pet.P * 0.7, 0.4);
    this.app.sound?.tone8?.(520, 300, 0.08, 'triangle', 0.04);
    this.afterTurn(0.4);
  }

  afterTurn(wait) {
    this.phase = 'resolve';
    this.t = 0;
    this.wait = wait;
  }

  // The hit frame of the current move: the rolls happen here.
  onEvent(type, data) {
    if (!this.active || type !== 'combatHit') return;
    if (!this.move || data?.name !== this.move.clip) return;
    this.resolveHit();
  }

  resolveHit() {
    if (this.hitResolved) return;
    this.hitResolved = true;
    const move = this.move;
    const pet = this.pet;
    const lvl = this.level;
    const opp = this.opp;
    const hitChance = clamp(0.52 + lvl * 0.04 - opp.defense, 0.2, 0.95);
    const critChance = clamp(0.06 + lvl * 0.025, 0.06, 0.4);
    const blockChance = clamp(0.1 + opp.defense * 0.5 - lvl * 0.015, 0.02, 0.45);
    const r = Math.random();
    const side = this.facing();
    const x = this.oppX();
    const y = this.oppY() - 24;
    const heavy = move.lvl >= 7;
    if (r < blockChance) {
      this.float(x, y, '🛡 Bloqueou!');
      this.app.fx?.impact('shield', x, y, 0.45);
      this.app.fx?.impact('dust', x, y + 6, 0.4);
      this.app.fx?.shake(0.25);
      this.app.sound?.tone8?.(300, 180, 0.1, 'square', 0.06);
    } else if (r < blockChance + hitChance) {
      const crit = Math.random() < critChance;
      const dmg = Math.round(move.dmg * (0.85 + lvl * 0.03) * (crit ? 1.7 : 1));
      opp.hp = Math.max(0, opp.hp - dmg);
      this.hits++;
      this.float(x, y, crit ? `💥 Crítico! ${dmg}` : `💥 ${move.name} · ${dmg}`);
      // The impact: a sharp spark for the light hits, a slash + burst for the heavy ones.
      if (heavy) {
        this.app.fx?.impact('slash', x, y, 0.85);
        this.app.fx?.impact('burst', x, y, 0.8);
        this.app.fx?.shake(0.9);
      } else {
        this.app.fx?.impact('spark', x, y, 0.6);
        this.app.fx?.shake(0.45);
      }
      // The mechanical dummy throws rust when it takes the hit.
      if (opp.scrap) this.app.fx?.impact('rust', x, y - 6, 0.5);
      this.app.sound?.tone8?.(180 + dmg * 9, 70, 0.12, 'square', 0.1);
      this.app.sound?.swish?.();
      this.app.dummy?.hit?.(dmg, side);
    } else {
      this.float(x, y, '💨 Errou!');
      this.app.sound?.tone8?.(520, 300, 0.08, 'triangle', 0.04);
    }
    // Every turn trains her: a little XP, a little energy spent.
    const before = lvl;
    this.game.skillAdd('unarmed', skillGain('dummy'));
    const after = this.level;
    if (after > before) this.float(pet.x, pet.y - pet.P * 1.2, `⬆️ Nv ${after}`);
    pet.adjust({ energy: -this.energyCost(), mood: 0.4 });
    this.phase = 'resolve';
    this.t = 0;
    this.wait = 0.5;
  }

  finishTraining(reason = 'done') {
    this.stop(reason);
  }

  // The sparring ends: the Scrap Dummy goes back to 100% and she leaves the fight.
  finishSparring(reason = 'done') {
    if (!this.active) return;
    const pet = this.pet;
    if (reason === 'win') {
      // Defeating the Scrap Dummy gives a bonus of Combat Skill XP.
      this.game.skillAdd('unarmed', 12 + this.opp.level * 6);
      this.float(this.oppX(), this.oppY() - 40, '🏆 Sucataoxidado derrubado!');
      this.float(pet.x, pet.y - pet.P * 1.3, `⬆️ Nv ${this.level}`);
      this.app.sound?.play?.('ok', { volume: 0.5 });
    } else if (reason === 'safety') {
      this.float(pet.x, pet.y - pet.P * 1.3, '🛑 Treino interrompido (segurança)');
    } else {
      this.float(pet.x, pet.y - pet.P * 1.3, '😵 Sem energia — fim do treino');
    }
    // The Scrap Dummy is reset for the next round.
    this.opp.hp = this.opp.max;
    this.stop(reason);
  }

  // Stops the fight (the escape hatch: two clicks on her cancel it).
  stop(reason = 'cancelled') {
    if (!this.active) return false;
    this.leave(reason);
    this.pet.endToy?.(true);
    this.pet.chooseNext?.();
    return true;
  }

  // ---------------- the Scrap Dummy's health bar ----------------

  showHpBar() {
    if (this.hpBar) return this.hpBar;
    const el = document.createElement('div');
    el.className = 'scrap-hp';
    el.innerHTML = '<i></i>';
    document.body.append(el);
    this.hpBar = el;
    return el;
  }

  updateHpBar() {
    const el = this.hpBar;
    if (!el) return;
    const P = this.pet.P;
    const x = this.oppX() ?? this.pet.x;
    const y = this.oppY() - P * 1.15;
    const w = Math.max(40, P * 0.9);
    const pct = Math.max(0, Math.round((this.opp.hp / this.opp.max) * 100));
    el.style.left = `${Math.round(x - w / 2)}px`;
    el.style.top = `${Math.round(y)}px`;
    el.style.width = `${Math.round(w)}px`;
    el.firstElementChild.style.width = `${pct}%`;
    el.classList.toggle('low', pct <= 30);
  }

  removeHpBar() {
    this.hpBar?.remove();
    this.hpBar = null;
  }

  // ---------------- helpers ----------------

  metaOf(move) {
    return move ? COMBAT_META[move.clip] : null;
  }

  facing() {
    const pet = this.pet;
    const ox = this.oppX();
    return ox != null ? Math.sign(ox - pet.x) || pet.dir || 1 : 1;
  }

  oppX() {
    const d = this.app.game?.toys?.boneco_treino;
    return d?.x ?? this.pet.x + this.pet.P;
  }

  oppY() {
    return this.app.toys?.floorY?.() ?? this.pet.y;
  }

  float(x, y, text) {
    this.app.toys?.furn?.floatText?.(x, y, text);
  }
}

// Weighted pick (same idea as the skill picker).
function pickWeighted(list, weights) {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < list.length; i++) {
    if ((r -= weights[i]) <= 0) return list[i];
  }
  return list[0];
}
