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
import { ITEMS, itemById } from './game.js';
import { ATTR_XP } from './attrxp.js';
import { VFX_FOLDERS, flashIntensity } from './vfx.js';
import { icon } from './pixel.js';
import { enemyPortrait, persoconPortrait } from './combatui.js';

export const TURN = { PERSOCON: 'persocon', CROW: 'corvo', FOE: 'foe' };
// Energy below this raises the low-energy warning (she can still fight).
export const EXHAUST_ENERGY = 15;
// At zero energy she is exhausted: she does NOT lose on the spot, but every blow hurts more.
export const EXHAUST_DAMAGE = 1.5;
// Base energy spent on a strike (a turn = a strike in this turn-based fight); a higher Combat
// Skill Level makes every strike cheaper, and the Constitution makes everything cheaper still.
export const BASE_TURN_ENERGY = 2;
export const MIN_TURN_ENERGY = 0.8;
// The sparring is non-lethal: she stops at half of her health.
export const SAFETY_HP = 0.5;
// JRPG pacing: every phase of a turn waits a little before the next one (slow on purpose).
export const PACE = {
  announce: 0.9,    // the turn is announced (ring + queue highlight)
  windup: 0.8,      // the wind-up / step forward before the hit frame
  impact: 0.7,      // the hit lands; the numbers and the effects show up
  recover: 1.2,     // the breathing pause before the next unit acts
};
// The freeze on contact (hit-stop): everything halts for a beat.
export const HIT_STOP = 0.12;
// The charge before the strike: she glows blue and gathers energy (the hit waits for it).
export const CHARGE_TIME = 0.45;
export const CHARGE_MANEUVER = 0.55;
// A distância de golpe (em "larguras da Persocon"): longe o bastante para os dois sprites não
// se encostarem (o corpo do slime tem quase uma largura dela) e perto o bastante para o soco.
export const STRIKE_GAP = 1.0;
// Melee range: she has to be in contact to hit (no throwing yet). Um pouco maior que a distância
// de golpe, para ela não ficar indo e voltando a cada turno.
export const MELEE_RANGE = 1.05;
// Abaixo disto ela está encostada/sobreposta (os sprites se cobrem a partir de ~0,87P) e recua.
export const MIN_GAP = 0.92;
// How far the enemy's blow pushes her back (always past the contact distance).
// O inimigo fecha só o excedente em foeStrike(): a briga não sai andando pelo chão.
export const KNOCKBACK = 0.4;
// O avanço até o alvo tem tempo máximo: se ela não chegar (parede, chão ruim), o golpe sai
// mesmo assim, com ela colada no alvo.
export const CLOSE_MAX = 1.6;
// Ela não pode ficar presa no chão: se o 'getUp' não vier, a luta destrava sozinha.
export const PET_DOWN_MAX = 2.6;
// O avanço até o alvo e o recuo até a formação são DASH: 3× a velocidade do andar.
export const DASH_SPEED = 3;
// O recuo é um tico mais rápido (a pausa do turno é curta e ela tem de chegar em casa).
export const RETREAT_SPEED = 4.2;
// Teto de tempo por fase: nenhuma fase pode segurar a fila de turnos para sempre (se o
// clipe/evento se perder, a luta avança na mão em vez de congelar).
export const PHASE_MAX = {
  intro: 2.4, align: 2.4, announce: 3, close: 3.4, charge: 3.6, windup: 5, impact: 4.2, recover: 4.2,
};
// As ondas do Cartucho Preto (o índice é a onda). 1 a 9 são lutáveis; 10 é a trava do Boss.
// Cada onda lança mais inimigos e mais fortes (vida/ataque/defesa/precisão/atordoamento).
export const BLACK_WAVES = [null,
  { count: 1, hp: 100, atk: 8, def: 0.02, level: 1, acc: 0.6, stun: 0 },
  { count: 2, hp: 135, atk: 11, def: 0.04, level: 2, acc: 0.65, stun: 0.06 },
  { count: 2, hp: 175, atk: 14, def: 0.06, level: 3, acc: 0.69, stun: 0.1 },
  { count: 3, hp: 220, atk: 18, def: 0.08, level: 4, acc: 0.73, stun: 0.13 },
  { count: 3, hp: 270, atk: 22, def: 0.1, level: 5, acc: 0.77, stun: 0.16 },
  { count: 3, hp: 330, atk: 27, def: 0.13, level: 6, acc: 0.81, stun: 0.19 },
  { count: 4, hp: 400, atk: 33, def: 0.16, level: 7, acc: 0.84, stun: 0.23 },
  { count: 4, hp: 480, atk: 40, def: 0.2, level: 8, acc: 0.87, stun: 0.26 },
  { count: 4, hp: 580, atk: 48, def: 0.25, level: 9, acc: 0.9, stun: 0.3 },
];
// The special maneuvers: one per Melee Combat Level, only with the Fúria status.
// color: a cor da aura da carga (vermelho normal, azul/dourado nos especiais).
// ranged: o golpe sai à distância (projétil) em vez de encostar nela.
export const MANEUVERS = [
  { lvl: 1, id: 'quebra_guarda', name: 'Golpe Quebra-Guarda', clip: 'attack_hook', mult: 1.5, ignoreDefense: true, color: 'red',
    pt: 'Smash que ignora a defesa do alvo (1,5× a Força)', en: 'A smash that ignores the target defense (1.5× Strength)' },
  { lvl: 2, id: 'punho_relampago', name: 'Punho Relâmpago', clip: 'attack_jab', mult: 1.1, hits: 3, color: 'blue',
    pt: 'Combo de 3 socos rápidos num turno só', en: 'A 3-hit flurry of fast punches in one turn' },
  { lvl: 3, id: 'chute_meteoro', name: 'Chute Meteoro', clip: 'attack_dropkick', mult: 1.8, stun: 0.45, color: 'gold',
    pt: 'Chute aéreo que pode atordoar o alvo (1,8×)', en: 'A leaping kick that can stun the target (1.8×)' },
  { lvl: 4, id: 'contra_impacto', name: 'Contra-Impacto Sísmico', clip: 'attack_uppercut', mult: 2.2, energy: 6, shock: true, color: 'gold',
    pt: 'Uppercut devastador com onda de choque (2,2×) e devolve energia', en: 'A devastating uppercut with a shockwave (2.2×) that gives energy back' },
  { lvl: 5, id: 'explosao_carmesim', name: 'Explosão Carmesim', clip: 'cast_special', mult: 3, explosion: true, color: 'red', ranged: true,
    pt: 'Explosão carmesim devastadora (3×)', en: 'A devastating crimson explosion (3×)' },
];
// The maneuver she can use at her current Melee Combat Level (the best one).
export const maneuverFor = (lvl) => {
  const list = MANEUVERS.filter((m) => m.lvl <= lvl);
  return list.length ? list[list.length - 1] : null;
};
// How many hits in a row she takes before the Fúria comes up.
export const FURY_HITS = 3;
// The accuracy penalty while she is Atordoada.
export const STUN_PENALTY = 0.45;

const clamp = (v, a, b) => Math.min(Math.max(v, a), b);
const pick = (l) => l[Math.floor(Math.random() * l.length)];

// ---------- the combat tracks (small 8-bit battle loops) ----------
// Five different themes; each fight picks one at random (melee.enter). Every track is a
// 16-step loop: the bass walks one note per bar, the lead plays on the step list and the
// drums mark the beat. `step` is the 16th length, so it also sets the tempo.
export const COMBAT_TRACKS = [
  {
    id: 'drive',                       // D minor, urgent (the old theme)
    step: 0.125,
    bassType: 'triangle', leadType: 'square',
    bass: [38, 38, 41, 38, 36, 36, 33, 36],
    lead: [62, 65, 69, 65, 62, 60, 57, 60, 62, 69, 72, 69, 65, 62, 60, 57],
    kick: [0, 4, 8, 12], snare: [4, 12], hat: [2, 6, 10, 14],
    vol: { bass: 0.09, lead: 0.045, kick: 0.35, snare: 0.11, hat: 0.045 },
  },
  {
    id: 'sprint',                      // E minor, fast and nervous
    step: 0.112,
    bassType: 'square', leadType: 'sawtooth',
    bass: [40, 40, 43, 40, 38, 38, 35, 38],
    lead: [64, 67, 71, 67, 64, 62, 59, 62, 64, 71, 74, 71, 67, 64, 62, 59],
    kick: [0, 6, 8, 14], snare: [4, 12], hat: [2, 5, 10, 13],
    vol: { bass: 0.075, lead: 0.038, kick: 0.34, snare: 0.1, hat: 0.04 },
  },
  {
    id: 'heavy',                       // A minor, slow and heavy
    step: 0.145,
    bassType: 'triangle', leadType: 'triangle',
    bass: [33, 33, 36, 33, 31, 31, 28, 33],
    lead: [57, 60, 64, 60, 57, 55, 52, 55, 57, 64, 67, 64, 60, 57, 55, 52],
    kick: [0, 7, 8], snare: [4, 12, 15], hat: [2, 6, 10, 14],
    leadSteps: [0, 2, 4, 6, 8, 10, 12, 14],
    vol: { bass: 0.11, lead: 0.05, kick: 0.4, snare: 0.13, hat: 0.04 },
  },
  {
    id: 'stabs',                       // C minor, short brass-like stabs
    step: 0.118,
    bassType: 'square', leadType: 'square',
    bass: [36, 36, 36, 39, 34, 34, 34, 31],
    lead: [60, 63, 67, 63, 60, 58, 55, 58, 60, 67, 70, 67, 63, 60, 58, 55],
    kick: [0, 4, 8, 12], snare: [6, 14], hat: [1, 3, 9, 11],
    leadSteps: [0, 3, 6, 8, 11, 14],
    leadDur: 0.55,
    vol: { bass: 0.08, lead: 0.05, kick: 0.33, snare: 0.12, hat: 0.04 },
  },
  {
    id: 'glitch',                      // F# minor, the black cartridge feel
    step: 0.102,
    bassType: 'sawtooth', leadType: 'square',
    bass: [30, 30, 33, 30, 35, 33, 30, 28],
    lead: [66, 70, 73, 70, 66, 63, 61, 63, 66, 73, 78, 73, 70, 66, 63, 61],
    kick: [0, 3, 8, 11], snare: [4, 10, 12, 15], hat: [1, 2, 5, 6, 9, 13, 14],
    vol: { bass: 0.075, lead: 0.042, kick: 0.32, snare: 0.09, hat: 0.035 },
  },
];

class CombatMusic {
  constructor(sound, track = COMBAT_TRACKS[0]) {
    this.sound = sound;
    this.track = track;
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
    g.gain.setValueAtTime(this.track?.vol?.kick ?? 0.35, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    o.connect(g).connect(this.out);
    o.start(t);
    o.stop(t + 0.16);
  }

  // The snare and the hats are the same noise burst, only shorter/brighter.
  drum(t, dur, vol, freq) {
    this.sound.noise?.(t, dur, vol, freq);
  }

  pump() {
    const s = this.sound;
    if (!s?.ctx) return;
    const step = this.track?.step || 0.125;
    while (this.t < s.ctx.currentTime + 0.3) {
      if (s.enabled) this.step(this.k, this.t);
      this.k++;
      this.t += step;
    }
  }

  step(k, t) {
    const tr = this.track;
    if (!tr) return;
    const v = tr.vol || {};
    const i = k % 16;
    const bar = Math.floor(k / 16) % tr.bass.length;
    // The bass walks a note per bar (an octave down, so it does not fight the lead).
    this.note(t, tr.bass[bar] - 12, tr.step * 1.6, v.bass, tr.bassType);
    // The lead: on every even step, or only on the `leadSteps` list (the stab theme).
    const onLead = tr.leadSteps ? tr.leadSteps.includes(i) : i % 2 === 0;
    if (onLead) this.note(t, tr.lead[(k + bar) % tr.lead.length], tr.step * (tr.leadDur ?? 0.8), v.lead, tr.leadType);
    if (tr.kick?.includes(i)) this.kick(t);
    if (tr.snare?.includes(i)) this.drum(t, 0.07, v.snare, 2400);
    if (tr.hat?.includes(i)) this.drum(t, 0.03, v.hat, 6200);
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
    this.kind = null;       // 'dummy' (training) | 'fight' (the scrap dummy) | 'unknown' (the wave)
    this.turn = TURN.PERSOCON;
    this.foeIdx = 0;        // o índice do inimigo em ação (ou do alvo sendo mirado)
    this.foes = [];         // todos os inimigos da onda (multi-inimigo)
    this.phase = 'idle';    // 'idle' | 'intro' | 'announce' | 'close' | 'charge' | 'windup' | 'impact' | 'recover' | 'victory'
    this.t = 0;
    this.wait = 0;
    this.move = null;
    this.next = TURN.PERSOCON;
    this.turns = 0;
    this.hits = 0;
    this.hitResolved = false;
    this.hitStop = 0;        // o hit-stop: tempo congelado no contato
    this.introT = 0;
    this.petHp = 100;
    this.petHpMax = 100;
    this.stunTurns = 0;      // turns left Atordoada
    this.fury = false;       // the Fúria status
    this.hitStreak = 0;      // hits taken in a row
    this.dizzyEl = null;     // the stars above her head
    this.furyAura = null;    // the fire above her head
    this.oppDizzyEl = null;  // the stars above the stunned enemy
    this.oppRef = { hp: 100, max: 100, level: 1, defense: 0.2, dummy: true, scrap: false, stunned: 0, name: 'Boneco' };
    this.crowFight = false;  // o Corvo entrou na luta
    this.crowActing = false; // o Corvo está executando a ação do turno dele
    this.petDown = false;    // ela está no chão (nocaute): o turno espera ela levantar
    this.homeX = null;       // a formação dela (para onde ela volta depois do golpe)
    this.returnTo = null;    // o retorno do desvio (x inicial + tempo)
    this.ghostT = 0;         // a opacidade 0,7 do desvio
    this.trailT = 0;         // o intervalo do rastro do dash
    this._seen = null;       // relógio de fase (fase presa = a fila avança)
    this.crowTurnT = 0;      // o relógio do turno do Corvo (cão de guarda de 2,5 s)
    this.pendingCrow = false; // a skill do Corvo espera a carga vermelha terminar
    this.pendingFoe = false;  // o golpe do inimigo espera a carga vermelha terminar
    this.chargeSpot = null;   // onde a carga está acontecendo (para o clarão de liberação)
    this._crowTurnStamp = -1; // em qual turno o Corvo já agiu (1 ação por ciclo)
    this.xpGained = 0;       // XP de combate ganho na luta (para o resumo)
    this.attrGained = { str: 0, con: 0, agi: 0 };
    this.fightStats = { strikes: 0, hits: 0, damage: 0 };
    this.blockBoost = 0;     // bônus temporário de bloqueio (Grito de Alerta)
    this.dodgeBoost = 0;     // bônus temporário de desvio (Grito de Alerta)
    this.itemPopT = 0;       // o ícone do item fica acima dela por um instante
    this.music = null;
    this.hpBar = null;
    this.onPetEvent = (type, data) => this.onEvent(type, data);
    app.pet?.on?.(this.onPetEvent);
  }

  get pet() { return this.app.pet; }
  get game() { return this.app.game; }
  get ui() { return this.app.combatUI; }
  // The Combat Skill Level (the unarmed skill).
  get level() { return skillLevel(this.game?.skillXp?.('unarmed') || 0); }
  // The moves she may use right now (only the unlocked ones).
  get moves() { return combatMoves(this.game?.skillXp?.('unarmed') || 0); }
  get attacks() { return this.moves.filter((m) => m.kind === 'attack'); }
  // O oponente atual: na luta contra o Unknown é o inimigo da fila; no treino, o boneco.
  get opp() {
    if (this.kind === 'unknown') return this.foes[this.foeIdx] ?? this.foes.find((f) => f.hp > 0) ?? null;
    return this.oppRef;
  }
  set opp(v) { this.oppRef = v; }

  // ---------------- a fila de turnos (JRPG) ----------------

  // A ordem desta luta: [Persocon, Corvo (se aliado), os inimigos vivos].
  sequence() {
    const seq = [{ turn: TURN.PERSOCON, foeIdx: -1 }];
    if (this.crowFight) seq.push({ turn: TURN.CROW, foeIdx: -1 });
    if (this.kind === 'unknown') {
      this.foes.forEach((f, i) => { if (f.hp > 0) seq.push({ turn: TURN.FOE, foeIdx: i }); });
    } else if (this.opp) {
      seq.push({ turn: TURN.FOE, foeIdx: 0 });
    }
    return seq;
  }

  // O próximo da fila depois de quem agiu.
  nextEntry() {
    const seq = this.sequence();
    if (!seq.length) return { turn: TURN.PERSOCON, foeIdx: -1 };
    // Persocon e Corvo não têm foeIdx; só o inimigo é identificado pelo índice na onda.
    const same = (s) => s.turn === this.turn && (s.turn !== TURN.FOE || s.foeIdx === this.foeIdx);
    let i = seq.findIndex(same);
    // O ator saiu da fila (inimigo morreu): pula para o próximo inimigo à frente dele.
    if (i < 0) i = seq.findIndex((s) => s.turn === TURN.FOE && s.foeIdx > (this.foeIdx ?? -1));
    if (i < 0) i = seq.findIndex((s) => s.turn === this.turn);
    if (i < 0) return seq[0];
    return seq[(i + 1) % seq.length];
  }

  firstAliveFoe() {
    const i = this.foes.findIndex((f) => f.hp > 0);
    return i < 0 ? 0 : i;
  }

  foesAlive() {
    if (this.kind === 'unknown') return this.foes.filter((f) => f.hp > 0).length;
    return this.opp?.hp > 0 ? 1 : 0;
  }

  // O id do ator da vez (para destacar na fila).
  activeId() {
    if (this.turn === TURN.PERSOCON) return 'persocon';
    if (this.turn === TURN.CROW) return 'corvo';
    return `foe${this.foeIdx}`;
  }

  // Os atores da fila para o topo da tela.
  queueActors() {
    const pet = this.pet;
    const name = this.app.config?.name || this.pet?.cfg?.name || 'Persocon';
    const dir = this.app.config?.modelDir || 'models/MyPersocon';
    const hpPct = pet.maxHealth?.() ? Math.max(0, pet.stats.health / pet.maxHealth()) : 1;
    const list = [{ id: 'persocon', name, face: persoconPortrait(dir, hpPct, name), glyph: null, side: 'ally', hp: hpPct }];
    if (this.crowFight) list.push({ id: 'corvo', name: 'Corvo', face: icon('crow'), glyph: null, side: 'ally', hp: null });
    if (this.kind === 'unknown') {
      this.foes.forEach((f, i) => list.push({
        id: `foe${i}`, name: f.name || 'Unknown', face: enemyPortrait(), glyph: null, side: 'enemy',
        hp: f.max ? Math.max(0, f.hp / f.max) : 0, dead: f.hp <= 0,
      }));
    } else if (this.opp) {
      list.push({
        id: 'foe0', name: this.opp.name || 'Inimigo', glyph: '🤖', face: null, side: 'enemy',
        hp: this.opp.max ? Math.max(0, this.opp.hp / this.opp.max) : 1,
      });
    }
    return list;
  }

  updateQueueHud() {
    const list = this.queueActors();
    this.ui?.showQueue(list);
    this.ui?.updateQueue(list, this.activeId());
  }

  // As barras de vida pequenas acima de cada inimigo.
  // Uma fonte de verdade só: x/y do inimigo (o mesmo que posiciona o sprite e o alvo dela).
  updateFoeBars() {
    if (this.kind !== 'unknown') return;
    const floor = this.app.toys?.floorY?.() ?? this.pet.y;
    const foes = this.foes
      .map((f, i) => ({ id: `foe${i}`, x: f.x ?? f.enemy?.x ?? 0, y: f.y ?? f.enemy?.y ?? floor, pct: f.max ? Math.max(0, f.hp / f.max) : 0 }));
    this.ui?.foeBars(foes);
  }

  // O anel de chão no lutador da vez.
  ringOnActor() {
    const pet = this.pet;
    if (this.turn === TURN.PERSOCON) return this.ui?.ring(pet.x, pet.y + 6);
    if (this.turn === TURN.CROW) {
      const c = this.app.crow;
      const floor = this.app.toys?.floorY?.() ?? pet.y;
      return this.ui?.ring(c?.x ?? pet.x, floor + 6);
    }
    const f = this.foes[this.foeIdx];
    if (this.kind === 'unknown' && f) {
      return this.ui?.ring(f.x ?? f.enemy?.x ?? pet.x, (f.y ?? f.enemy?.y ?? pet.y) + 6);
    }
    return this.ui?.ring(this.oppX() ?? pet.x, this.oppY() + 6);
  }

  // Uma fala do Corvo (o texto fica acima dele).
  sayCrow(iconText, text = '') {
    const crow = this.app.crow;
    if (!crow) return;
    const line = iconText ? `${iconText} ${text}`.trim() : text;
    this.say(crow.x, crow.y - this.pet.P * 1.35, line, 'good');
  }

  // XP do Corvo pelas lutas (combate e suporte).
  crowGain(id, amount = 26) {
    const crow = this.app.crow;
    crow?.combatGain?.(id, amount);
  }

  // O dano que ela causa num inimigo (qualquer um: boneco, sucata, gosmas).
  // NUNCA derruba a luta: qualquer erro nos visuais do inimigo é engolido com log.
  damageFoe(dmg, opts = {}) {
    const opp = this.opp;
    if (!opp || opp.hp <= 0) return;
    opp.hp = Math.max(0, opp.hp - dmg);
    this.hits++;
    this.fightStats.damage += dmg;
    // Glitch Surge (ondas 5+): gosma estoura ao morrer — abalo + dano em área (nunca derruba ela).
    if (this.kind === 'unknown' && opp.unknown && opp.hp === 0 && (this.wave ?? 1) >= 5) {
      try {
        this.app.fx?.explosion?.('fire', this.oppX(), this.oppY() - 10, 1.35);
        this.app.fx?.shake?.(0.8);
        this.app.sound?.play?.('explode', { volume: 0.4 });
        const surge = 4 + (this.wave ?? 5);
        const pet = this.pet;
        const safe = Math.min(surge, Math.max(0, Math.floor((pet.stats?.health ?? 1)) - 1));
        if (safe > 0) pet.adjust?.({ health: -safe });
        this.say(pet.x, pet.y - pet.P * 1.5, 'Glitch Surge!', 'bad');
      } catch { /* suprimentos visuais */ }
    }
    // O flash vermelho no alvo (e a animação de machucado) — com proteção total.
    const foe = opp.enemy;
    if (foe) {
      try { foe.play?.('hurt'); } catch { /* sprite removido */ }
      try { foe.flash?.(flashIntensity(dmg), 0.3); } catch { /* sprite falhou */ try { opp.hitFlash = 1; } catch {} }
      try { opp.hitFlash = flashIntensity(dmg); } catch {}
    }
    const x = this.oppX();
    const y = this.oppY() - 24;
    const heavy = dmg >= 12 || opts.crit;
    try { this.app.fx?.damage?.(x, y - 24, dmg, { crit: opts.crit }); } catch { /* HUD de dano */ }
    try { this.app.fx?.seq?.(heavy ? VFX_FOLDERS.heavy : VFX_FOLDERS.light, x, y, { scale: heavy ? 2.5 : 1.7 }); } catch { /* VFX */ }
    try { this.app.fx?.shake?.(heavy ? 0.9 : 0.45); } catch { /* shake */ }
    try { this.app.sound?.tone8?.(180 + dmg * 9, 70, 0.12, 'square', 0.1); } catch { /* sfx */ }
    try { if (opp.scrap) this.app.fx?.impact?.('rust', x, y - 6, 0.5); } catch { /* rust */ }
    try { this.game.attrGain?.('str', this.kind === 'dummy' ? ATTR_XP.str.dummy : ATTR_XP.str.heavy,
      this.kind === 'dummy' ? 'dummy' : (opp.unknown ? 'unknown' : 'heavy')); } catch { /* XP */ }
    this.attrGained.str += this.kind === 'dummy' ? ATTR_XP.str.dummy : ATTR_XP.str.heavy;
    this.hitStop = HIT_STOP;
    try { if (opp.enemy) this.updateFoeBars(); } catch { /* barras */ }
    try { this.updateQueueHud(); } catch { /* fila */ }
  }

  checkVictory() {
    if (!this.active || this.phase === 'victory') return false;
    if (this.kind !== 'dummy' && this.foesAlive() === 0) {
      this.victory();
      return true;
    }
    return false;
  }

  // A vitória: pose, fanfarra e o banner de resumo de XP.
  victory() {
    if (this.phase === 'victory') return;
    const pet = this.pet;
    this.phase = 'victory';
    this.t = 0;
    this.ui?.hideQueue();
    this.ui?.hideRing();
    this.ui?.hideFoeBars();
    try {
      pet.playAnimation?.(pet.pickClip?.(['victory', 'comemorar', 'emote_pos', 'dance'], ['idle']) || 'idle', { facing: 'front', restart: true });
    } catch {}
    this.app.sound?.play?.('ok', { volume: 0.6 });
    // A horda morre de verdade (animação de morte + fala dela).
    if (this.kind === 'unknown') this.app.unknown?.onDefeat?.('win');
    const lines = [];
    if (this.xpGained > 0) lines.push(['Combate Corpo a Corpo', this.xpGained]);
    if (this.attrGained.str > 0) lines.push(['Força', this.attrGained.str]);
    if (this.attrGained.agi > 0) lines.push(['Agilidade', this.attrGained.agi]);
    if (this.attrGained.con > 0) lines.push(['Constituição', this.attrGained.con]);
    this.ui?.victoryBanner(lines);
    this.ui?.fightSummary?.({ ...this.fightStats, xp: this.game?._xpFight || {} });
  }

  // The energy a strike costs: the better she is, the less it costs.
  energyCost() {
    const lvl = this.level;
    const con = this.game?.attrLevel?.('con') ?? 1;
    const base = Math.max(MIN_TURN_ENERGY, BASE_TURN_ENERGY * (1 - (lvl - 1) * 0.06));
    // The Constitution makes everything cheaper.
    return Math.max(MIN_TURN_ENERGY * 0.5, base * (1 - (con - 1) * 0.04));
  }

  // Strength: how hard she hits (and how far she can throw).
  get strength() { return this.game?.attrLevel?.('str') ?? 1; }
  get constitution() { return this.game?.attrLevel?.('con') ?? 1; }
  // Exhausted: no energy left. The fight goes on, but the blows hit harder.
  get exhausted() { return (this.pet?.stats?.energy ?? 100) <= 0; }

  // ---------------- COMBAT_MODE ----------------

  enter(kind = 'fight') {
    if (this.active) return false;
    this.active = true;
    this.kind = kind;
    this.turns = 0;
    this.hits = 0;
    this.petHp = this.pet?.stats?.health ?? 100;
    this.petHpMax = this.pet?.maxHealth?.() ?? 100;
    this.foes = kind === 'unknown' ? this.foes : [];
    this.foeIdx = 0;
    this.crowFight = false;
    this.xpGained = 0;
    this.attrGained = { str: 0, con: 0, agi: 0 };
    this.fightStats = { strikes: 0, hits: 0, damage: 0 };
    // Ledger de XP da luta (para o resumo pós-batalha).
    if (this.game) this.game._xpFight = {};
    this.blockBoost = 0;
    this.dodgeBoost = 0;
    this.lowWarned = false;
    this.exhaustWarned = false;
    this.hitStop = 0;
    this.itemPopT = 0;
    this.pet.combatMode = true;
    // O Corvo entra como aliado se estiver livre na área de trabalho e tiver Skill de Combate.
    if (this.crowAvailable()) this.joinCrow();
    // The frame and the combat track belong to the real fights; the training stays clean.
    if (kind !== 'dummy') {
      document.body.classList.add('combat-mode');
      this.app.sound?.pauseMusic?.();
      if (this.app.sound?.enabled) this.music = new CombatMusic(this.app.sound, this.pickTrack());
    }
    this.pet.emit?.('combatStart', { kind });
    return true;
  }

  // Sorteia a trilha do combate (nunca repete a da luta anterior).
  pickTrack() {
    const tracks = COMBAT_TRACKS;
    let pick = tracks[Math.floor(Math.random() * tracks.length)] || tracks[0];
    if (tracks.length > 1 && pick === this.lastTrack) {
      pick = tracks[(tracks.indexOf(pick) + 1) % tracks.length];
    }
    this.lastTrack = pick;
    return pick;
  }

  // O Corvo está pronto para lutar ao lado dela? (na área de trabalho, livre, com ≥1 Skill de Combate)
  crowAvailable() {
    const crow = this.app.crow;
    if (!crow?.owned) return false;
    if (crow.x == null || crow.away || crow.duo || crow.fetching || crow.carry?.length || crow.leaving || crow.trick) return false;
    return ['rasante', 'penas', 'bicada', 'grito', 'busca', 'provocacao'].some((id) => crow.learned?.(id));
  }

  // O Corvo entra NO CENTRO, sempre ATRÁS da Persocon (lado oposto para onde ela encara).
  joinCrow() {
    const crow = this.app.crow;
    const pet = this.pet;
    const { game } = this.app;
    this.crowFight = true;
    const W = this.app.world?.width || (typeof innerWidth !== 'undefined' ? innerWidth : 1280);
    const P = pet.P;
    // Direção para onde ela está encarando o oponente (+1 = encara a direita, -1 = encara a esquerda).
    const oppX = this.kind === 'unknown'
      ? (this.foes[0]?.x ?? W / 2 - P * 2)
      : (game?.toys?.boneco_treino?.x ?? W * 0.7);
    const facingDir = Math.sign(oppX - pet.x) || 1;
    const floor = this.app.toys?.floorY?.() ?? pet.y;
    crow.x = clamp(pet.x - facingDir * 65, P * 0.3, W - P * 0.3);
    crow.y = (pet.y ?? floor) - 85;   // flutuando atrás do ombro dela
    crow.lift = 0;
    crow.perch = 'combat';
    crow.dir = facingDir;        // olhando para o mesmo lado que a Persocon
    crow.idle?.(9999, 'idle');
    this.sayCrow('🪶', 'Comigo não passa!');
  }

  leave(reason = 'end') {
    if (!this.active) return;
    this.active = false;
    this.kind = null;
    this.phase = 'idle';
    this.move = null;
    this.foes = [];
    this.foeIdx = 0;
    this.crowFight = false;
    // O Corvo sai da formação de combate e volta à vida normal.
    const crow = this.app.crow;
    if (crow) {
      crow.perch = 'floor';
      crow.lift = 0;
      crow.idle?.(1, 'idle');
    }
    this.pet.combatMode = false;
    // Fim da luta: ela larga a guarda (antes o `combat` ficava ligado e o idle era o clipe de combate).
    const stance = this.pet.combatKind;
    if (this.pet.combat && (stance === 'black_cartridge_wave' || stance === 'combat')) {
      this.pet.setCombat?.(false);
      this.pet.view?.setFacing?.('front');
    }
    document.body.classList.remove('combat-mode');
    this.music?.stop();
    this.music = null;
    this.app.sound?.resumeMusic?.();
    if (this.game) this.game._xpFight = null;
    this.removeHpBar();
    this.removeDizzy();
    this.removeFuryAura();
    this.removeOppDizzy();
    this.ui?.clear();
    // The Atordoado is a combat status: it goes away with the fight.
    this.stunTurns = 0;
    this.pet.cureDebuff?.('atordoado');
    // Nada de sobra do combate: a opacidade do desvio, o retorno pendente e o petDown.
    this.clearGhost();
    this.returnTo = null;
    this.foeStep = null;
    this.petDown = false;
    this.downT = 0;
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
    this.foes = [];
    this.opp = { hp: 100, max: 100, level: 1, defense: 0.22, dummy: true, scrap: false, stunned: 0, name: 'Boneco' };
    this.xpGained = 0;
    this.attrGained = { str: 0, con: 0, agi: 0 };
    this.fightStats = { strikes: 0, hits: 0, damage: 0 };
    this.formation('dummy');
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
    // O Sucataoxidado escolhe uma postura de combate a cada sessão.
    const posture = pick(['certeiro', 'defensivo', 'brutal']);
    this.foes = [];
    this.opp = {
      hp: 100, max: 100, level: oppLvl,
      defense: 0.16 + oppLvl * 0.03 + (posture === 'defensivo' ? 0.15 : 0),
      dummy: false, scrap: true, stunned: 0, name: 'Sucataoxidado', posture,
    };
    this.xpGained = 0;
    this.attrGained = { str: 0, con: 0, agi: 0 };
    this.fightStats = { strikes: 0, hits: 0, damage: 0 };
    this.formation('fight');
    this.petHp = pet.stats.health;
    this.petHpMax = pet.maxHealth?.() ?? 100;   // her health never goes over the maximum
    if (!this.enter('fight')) return false;
    this.phase = 'intro';
    this.t = 0;
    this.introT = 0;
    this.say(pet.x, pet.y - pet.P * 1.35, posture === 'certeiro' ? 'Certeiro: ele dita o ritmo.' : posture === 'defensivo' ? 'Defensivo: ele se fecha num casulo de aço.' : 'Brutal: ele vai com tudo.', 'bad');
    this.showHpBar();
    return true;
  }

  // ---------------- o Unknown (uma horda de gosmas de glitch que saiu da TV) ----------------

  // Começa a luta contra a horda do Unknown (N gosmas, dependendo da onda).
  // `foes` é a lista de instâncias de slime montada por `unknown.js`.
  startUnknown(foes, wave = 1) {
    this.foes = (foes || []).map((e) => ({
      hp: e.hp, max: e.hp, level: e.level, defense: e.defense ?? e.def, atk: e.atk, name: e.name || 'Unknown',
      unknown: true, enemy: e, scrap: false, stunned: 0,
      baseAtk: e.atk, acc: e.acc, stun: e.stun, bleed: null, defDown: 0, defTurns: 0, accPen: 0, accTurns: 0,
    }));
    this.wave = wave;
    this.foeIdx = 0;
    this.xpGained = 0;
    this.attrGained = { str: 0, con: 0, agi: 0 };
    this.fightStats = { strikes: 0, hits: 0, damage: 0 };
    this.petHp = this.pet.stats.health;
    this.petHpMax = this.pet.maxHealth?.() ?? 100;
    this.formation('unknown');
    if (!this.enter('unknown')) return false;
    if (this.kind === 'unknown') {
      // O "beat" clássico: os dois times se olham na arena antes do turno 1 (o turno começa depois).
      this.phase = 'align';
      this.t = 0;
      this.say(this.pet.x, this.pet.y - this.pet.P * 1.35, '⚔', 'good', { big: true });
    } else {
      this.phase = 'intro';
      this.t = 0;
      this.introT = 0;
    }
    return true;
  }

  // A formação clássica de JRPG: os dois times se encontram no centro da tela, de lados opostos.
  // (O Boneco de Treino é móvel estática: a Persocon só anda até ele, sem formação central.)
  formation(kind = 'unknown') {
    const { pet, game } = this.app;
    const W = this.app.world?.width || (typeof innerWidth !== 'undefined' ? innerWidth : 1280);
    const P = pet.P;
    const floor = this.app.toys?.floorY?.() ?? pet.y;
    const dummy = game?.toys?.boneco_treino;
    const centerX = Math.round(W / 2);
    // A arena é o chão: ela desce do móvel (e solta o colchão/cama) antes da luta começar.
    pet.mode = 'ground';
    pet.surfaceId = 'floor';
    pet.y = floor;
    pet.lift = 0;
    pet.onBed = pet.onCushion = pet.onPrinter = false;
    pet.dir = 1;
    if (kind !== 'unknown' && dummy) {
      // O Boneco de Treino fica onde está (é mobília colocada); ela só entra pela esquerda.
      pet.x = Math.max(P * 0.25, Math.min(W - P * 0.25, dummy.x - Math.round(P * 1.7)));
    } else if (kind === 'unknown') {
      // A Persocon (e o Corvo) entram pela direita, encarando a esquerda (a horda à esquerda do centro).
      pet.x = clamp(centerX + Math.round(P * 1.15), P * 0.25, W - P * 0.25);
      pet.dir = -1;
    } else {
      pet.x = Math.max(P * 0.25, Math.min(W - P * 0.25, Math.round(W * 0.2)));
    }
    if (kind === 'unknown' && this.foes.length) {
      // Os inimigos se enfileiram à esquerda, escalonados (um leve zig-zag no eixo X e no Y),
      // todos de frente para a Persocon (à sua direita).
      const base = centerX - Math.round(P * 1.05);
      const n = this.foes.length;
      this.foes.forEach((f, i) => {
        if (f.enemy) {
          f.x = Math.max(P * 0.5, base - Math.round(i * 70));
          f.y = floor;
          f.slotX = f.x;         // o lugar dele na formação (ele volta para lá)
          f.enemy.x = f.x;
          f.enemy.y = f.y;
          f.enemy.dir = 1;   // de frente para a Persocon (ela está à direita deles)
          try { f.enemy.place?.(); } catch { /* o desenho usa x/y direto */ }
        }
      });
      // Para o fallback de oppX() (caso todos morram numa mesma frame): a última posição conhecida.
      this._foeFallbackX = base;
    }
    // A formação DELA: o lugar para onde ela volta depois de cada golpe (o lado direito).
    this.homeX = pet.x;
    // O Corvo entra pela joinCrow() (chamada no enter), já na posição final dela.
  }

  // ---------------- o Corvo (aliado de combate) ----------------

  // O sangramento (Penas Cortantes): dano no início do turno do inimigo.
  tickBleed() {
    if (this.kind !== 'unknown') return;
    const f = this.foes[this.foeIdx];
    if (f?.bleed) {
      const dmg = f.bleed.dmg;
      f.hp = Math.max(0, f.hp - dmg);
      f.enemy?.play?.('hurt');
      f.enemy?.flash?.(0.4);
      this.app.fx?.damage?.(this.oppX(), this.oppY() - 30, dmg);
      f.bleed.turns -= 1;
      if (f.bleed.turns <= 0) f.bleed = null;
      this.updateFoeBars();
      this.updateQueueHud();
      if (this.foes.every((g) => g.hp <= 0)) this.checkVictory();
    }
  }

  // O turno do Corvo: escolhe a melhor Skill de Combate que ele aprendeu.
  // NUNCA derruba a luta e NUNCA repete: uma única ação por ciclo (carga → skill).
  crowTurn() {
    // Já está executando? Ignora (nunca re-executa por frame).
    if (this.crowActing) return;
    // Já agiu neste mesmo turno? Só fecha a fase e deixa a fila seguir.
    if (this._crowTurnStamp === this.turns) { this.finishCrowTurn(); return; }
    const pet = this.pet;
    const crow = this.app.crow;
    const P = pet.P;
    this._crowTurnStamp = this.turns;
    this.crowActing = true;
    this.crowTurnT = 0;
    this.t = 0;
    this.move = { id: 'crow', name: 'Corvo', kind: 'attack', clip: 'combat_idle', dmg: 0 };
    this.moveDur = 0.5;
    // O Corvo não passa pelo resolveHit da Persocon (o dano dele é aplicado na skill).
    this.hitResolved = true;
    this.next = TURN.PERSOCON;
    // A carga vermelha antes da skill: ele junta energia pairando e só depois solta.
    this.phase = 'charge';
    this.chargeT = CHARGE_TIME;
    this.pendingCrow = true;
    this.chargeSpot = { x: crow?.x ?? pet.x, y: (crow?.y ?? pet.y) - P * 0.35, size: P * 0.8 };
    this.ui?.glowRed?.(crow?.canvas, CHARGE_TIME * 1000);
    this.app.fx?.charge?.(this.chargeSpot.x, this.chargeSpot.y, this.chargeSpot.size, CHARGE_TIME * 1000);
    this.app.sound?.tone8?.(200, 940, CHARGE_TIME, 'sawtooth', 0.045);
    crow?.play?.('fly', 1.9);
  }

  // Roda a skill do Corvo UMA vez (depois da carga). Qualquer erro fecha o turno.
  runCrowAct() {
    const pet = this.pet;
    try {
      this.crowAct(this.app.crow, pet, pet.P);
    } catch (err) {
      console.error('[CrowTurn Error]', err);
      this.finishCrowTurn();
    }
  }

  crowAct(crow, pet, P) {
    // Se a horda já está caída (vitória em andamento), o Corvo não age.
    if (this.kind === 'unknown' && !this.foes?.some((f) => f.hp > 0)) { this.finishCrowTurn(); return; }
    // O alvo, tanto no treino (Boneco/Sucataoxidado) quanto no Unknown (primeira gosma viva).
    const foeTarget = this.kind === 'unknown'
      ? (this.foes?.find((f) => f.hp > 0) ?? null)
      : (this.opp ?? { hp: 1, x: this.oppX() ?? (pet.x + P), y: this.oppY() ?? pet.y });
    const learned = (id) => crow?.learned?.(id);
    const maxHp = this.petHpMax || 100;
    // Meds de cura no Inventário (para a Busca de Emergência).
    const meds = [];
    for (const i of ITEMS) {
      if (i.cat !== 'medicina') continue;
      if ((this.game.count?.(i.id) || 0) <= 0) continue;
      if (!(i.effects?.health > 0)) continue;
      meds.push(i);
    }
    meds.sort((a, b) => (b.effects?.health || 0) - (a.effects?.health || 0));
    // As prioridades: socorrer ela ferida > enfraquecer > atacar > proteger.
    // No treino contra o Boneco ele nunca ataca: debuff/proteção não servem, então
    // o Corvo parte direto para os golpes (senão ele "não faz nada" na sessão).
    const training = this.kind === 'dummy';
    let skill = null;
    if (!training && pet.stats.health < maxHp * 0.6 && meds.length && learned('busca')) skill = 'busca';
    else if (!training && foeTarget && (foeTarget.defDown ?? 0) <= 0 && learned('provocacao')) skill = 'provocacao';
    else if (foeTarget && !foeTarget.bleed && learned('penas')) skill = 'penas';
    else if (!training && this.blockBoost <= 0 && learned('grito')) skill = 'grito';
    else if (learned('rasante')) skill = 'rasante';
    else if (learned('penas')) skill = 'penas';
    else if (learned('bicada')) skill = 'bicada';
    else if (learned('provocacao')) skill = 'provocacao';
    else if (learned('grito')) skill = 'grito';
    else skill = 'grito'; // fallback: sempre há algo (foi por isso que entrou na luta)
    // O Corvo encara o alvo e mergulha/atira; o ponto de impacto é o centro do corpo dele.
    const tx = this.combatTargetX() ?? (foeTarget?.x ?? pet.x);
    const ty = (this.oppY() ?? pet.y) - 25;
    const side = Math.sign(tx - pet.x) || 1;
    const home = { x: crow.x, y: crow.y };
    const target = { x: tx, y: ty };
    crow.dir = side;
    // Depois do voo: volta para a formação de combate (ou para o chão se a luta acabou).
    const settle = () => {
      const mm = this.app.melee;
      if (mm?.active && mm.crowFight) { crow.perch = 'combat'; crow.idle?.(9999, 'idle'); }
      else { crow.perch = 'floor'; crow.idle?.(1, 'idle'); }
    };
    // Dano só no impacto: o número, o flash e o sangramento nascem juntos.
    const impactHit = (dmg, opts = {}) => {
      if (!this.active) return;
      try {
        this.damageFoe(dmg, { crit: false });
        if (opts.bleed && foeTarget) foeTarget.bleed = opts.bleed;
        if (opts.accPen && foeTarget) { foeTarget.accPen = opts.accPen; foeTarget.accTurns = opts.accTurns; }
        this.checkVictory();
      } catch (err) { console.error('[CrowTurn hit]', err); }
    };
    // Investida: o Corvo voa até o inimigo, bate e volta.
    const dive = (dmg, opts = {}) => {
      this.ui?.crowStreak?.(crow.x, crow.y, target.x, target.y);
      crow.play?.('fly', 2.4);
      this.app.sound?.crow?.('flap', 1);
      crow.flyTo?.(() => ({ x: target.x - side * 16, y: target.y }), () => {
        try {
          impactHit(dmg, opts);
          this.app.fx?.impact?.('dust', target.x, target.y, 0.7);
          this.app.fx?.impact?.('rust', target.x, target.y, 0.45);
          this.app.sound?.crow?.('caw', 0.6);
        } catch (err) { console.error('[CrowTurn dive]', err); }
        crow.flyTo?.(() => ({ ...home }), settle, 3.4);
      }, 8.5);
    };
    if (skill === 'busca') {
      const item = meds[0];
      this.sayCrow('🎒', `Corvo usa ${item.name}!`);
      this.crowGain('busca');
      crow.play?.('fly', 1.8);
      // Passa por cima da cabeça dela e solta o item na mão.
      crow.flyTo?.(() => ({ x: pet.x, y: pet.y - P * 1.7 }), () => {
        try {
          pet.adjust(item.effects || {});
          this.game.take(item.id);
          this.game.changed();
          this.ui?.itemPop?.(pet.x, pet.y - P * 1.3, item.img);
          this.ui?.crowSparkle?.(pet.x, pet.y - P * 1.5);
          this.app.sound?.play?.('puff', { volume: 0.4 });
          this.app.fx?.impact?.('dust', pet.x, pet.y - P * 0.6, 0.4);
        } catch (err) { console.error('[CrowTurn busca]', err); }
        crow.flyTo?.(() => ({ ...home }), settle, 3.4);
      }, 4.5);
      this.finishCrowTurn();
      return;
    }
    if (skill === 'grito') {
      this.sayCrow('📢', 'Corvo usa Grito de Alerta!');
      this.crowGain('grito');
      crow.play?.('fly', 1.8);
      // Passa por cima dela e deixa as partículas do buff nela.
      crow.flyTo?.(() => ({ x: pet.x - side * 10, y: pet.y - P * 1.9 }), () => {
        try {
          this.blockBoost = Math.max(this.blockBoost, 0.25);
          this.dodgeBoost = Math.max(this.dodgeBoost, 0.2);
          this.ui?.crowSparkle?.(pet.x, pet.y - P * 1.2);
          this.app.fx?.impact?.('shield', pet.x, pet.y - P * 0.8, 0.6);
          this.app.sound?.crow?.('caw', 0.9);
        } catch (err) { console.error('[CrowTurn grito]', err); }
        crow.flyTo?.(() => ({ ...home }), settle, 3.4);
      }, 4.5);
      this.finishCrowTurn();
      return;
    }
    if (skill === 'provocacao') {
      this.sayCrow('💨', 'Corvo usa Provocação Aérea!');
      this.crowGain('provocacao');
      crow.play?.('fly', 2);
      // Um círculo rápido sobre a cabeça do inimigo, soltando penas escuras.
      const ring = [
        { x: target.x + side * 34, y: target.y - 55 },
        { x: target.x, y: target.y - 92 },
        { x: target.x - side * 34, y: target.y - 55 },
      ];
      const step = (i) => {
        if (i >= ring.length) {
          crow.flyTo?.(() => ({ ...home }), settle, 3.6);
          return;
        }
        crow.flyTo?.(() => ring[i], () => {
          try {
            this.ui?.crowFeathers?.(crow.x, crow.y, target.x, target.y, { count: 4, ms: 260, spread: 18 });
            this.app.sound?.crow?.('flap', 0.5);
          } catch { /* visual */ }
          step(i + 1);
        }, 7);
      };
      crow.flyTo?.(() => ({ x: target.x, y: target.y - 92 }), () => {
        try {
          if (foeTarget) { foeTarget.defDown = 0.25; foeTarget.defTurns = 2; }
          this.app.fx?.impact?.('dust', target.x, target.y - 10, 0.55);
          this.app.sound?.crow?.('caw', 0.7);
        } catch (err) { console.error('[CrowTurn provocacao]', err); }
        step(0);
      }, 6);
      this.finishCrowTurn();
      return;
    }
    if (skill === 'penas') {
      const dmg = 2 + Math.floor(Math.random() * 2) + Math.floor(this.level / 2);
      this.sayCrow('🗡', 'Corvo usa Penas Cortantes!');
      this.crowGain('penas');
      // Rajada de penas pretas: bate as asas e o dano só cai no impacto.
      crow.play?.('fly', 2.8);
      this.app.sound?.crow?.('flap', 1);
      this.ui?.crowFeathers?.(crow.x, crow.y, target.x, target.y, {
        count: 10 + Math.floor(Math.random() * 5),
        ms: 380,
        onHit: () => impactHit(dmg, { bleed: { dmg: 2 + Math.floor(Math.random() * 2), turns: 4 } }),
      });
      this.finishCrowTurn();
      return;
    }
    if (skill === 'bicada') {
      const dmg = 1 + Math.floor(Math.random() * 3);
      this.sayCrow('👁', 'Corvo usa Bicada nos Olhos!');
      this.crowGain('bicada');
      dive(dmg, { accPen: 0.3, accTurns: 2 });
      this.finishCrowTurn();
      return;
    }
    // Rasante Sombrio: a investida leve e rápida.
    const dmg = 5 + Math.floor(Math.random() * 3) + Math.floor(this.level / 2);
    this.sayCrow('🪶', 'Corvo usa Rasante Sombrio!');
    this.crowGain('rasante');
    dive(dmg);
    this.finishCrowTurn();
  }

  // Fecha o turno do Corvo (depois do efeito principal).
  finishCrowTurn(attacked = false) {
    this.crowActing = false;
    this.crowTurnT = 0;
    this.pendingCrow = false;
    if (attacked) {
      // O canto do Corvo pode derrubar a horda: a vitória começa aqui.
      if (!this.checkVictory()) { this.phase = 'impact'; this.t = 0; }
      return;
    }
    this.phase = 'impact';
    this.t = 0;
  }
  // O turno de um inimigo da horda: Investida Viscosa ou Pulso de Glitch (só na Persocon).
  // Aqui ele só se prepara e CARREGA EM VERMELHO; o golpe sai em foeStrike(), no fim da carga.
  foeTurn() {
    const foe = this.opp;
    // Se a horda morreu antes do turno (ex.: sangramento), o turno não acontece.
    if (this.kind === 'unknown' && !foe) { this.phase = 'impact'; this.t = 0; return; }
    this.next = TURN.PERSOCON;
    const glitch = Math.random() < 0.38;
    const baseAtk = foe?.atk ?? 3;
    this.move = {
      id: glitch ? 'glitch' : 'tackle',
      name: glitch ? 'Pulso de Glitch' : 'Investida Viscosa',
      kind: 'attack', clip: 'attack_jab',
      dmg: (glitch ? baseAtk * 1.6 : baseAtk) * (0.85 + (foe?.level || 1) * 0.03) * (0.9 + Math.random() * 0.2),
      glitch, stunChance: glitch ? (foe?.stun || 0) : 0,
    };
    this.moveDur = 0.5;
    this.say(this.oppX(), this.oppY() - this.pet.P * 1.05, this.move.name, 'bad');
    this.app.sound?.tone8?.(150, 90, 0.12, 'square', 0.07);
    if (glitch) this.app.sound?.tone8?.(900, 200, 0.18, 'sawtooth', 0.05);
    this.startFoeCharge(foe);
  }

  // A carga vermelha do inimigo (ele para, acende e junta energia antes do bote).
  startFoeCharge(foe) {
    const pet = this.pet;
    this.phase = 'charge';
    this.t = 0;
    this.chargeT = CHARGE_TIME;
    this.pendingFoe = true;
    const spot = { x: this.oppX() ?? pet.x, y: (this.oppY() ?? pet.y) - pet.P * 0.5, size: pet.P * 0.9 };
    this.chargeSpot = spot;
    this.ui?.glowRed?.(foe?.enemy?.el, CHARGE_TIME * 1000);
    this.app.fx?.charge?.(spot.x, spot.y, spot.size, CHARGE_TIME * 1000);
    this.app.sound?.tone8?.(210, 900, CHARGE_TIME, 'sawtooth', 0.04);
    // Ela fecha a guarda ENQUANTO o golpe vem: o bloqueio aparece antes do dano.
    this.guardUp();
    // Se ela recuou para a formação, ele se aproxima durante a carga (nada de teleporte).
    this.foeStep = this.foeApproach(foe);
  }

  // Ela levanta a guarda (o clipe cruza os braços e abaixa a cabeça) antes do impacto.
  guardUp() {
    const pet = this.pet;
    if (!pet?.playAnimation) return;
    if (pet.combatAnim?.name === 'combat_block') return;
    pet.playAnimation('combat_block', { facing: this.facing() > 0 ? 'right' : 'left', restart: false });
  }

  // O inimigo fora de alcance anda até a distância de golpe durante a carga dele.
  foeApproach(foe) {
    const pet = this.pet;
    const from = foe?.x ?? foe?.enemy?.x;
    if (!Number.isFinite(from)) return null;
    const dist = Math.abs(pet.x - from);
    if (dist <= pet.P * MELEE_RANGE) return null;
    const side = Math.sign(pet.x - from) || 1;
    return { foe, from, to: this.edgeX(pet.x - side * pet.P * STRIKE_GAP), t: 0, dur: CHARGE_TIME };
  }

  // O passo do inimigo (suavizado, sincronizado com o sprite a cada frame).
  stepFoe(dt) {
    const s = this.foeStep;
    if (!s?.foe) { this.foeStep = null; return; }
    s.t += dt;
    const k = Math.min(1, s.t / (s.dur || CHARGE_TIME));
    const e = 1 - (1 - k) * (1 - k);
    const x = this.edgeX(s.from + (s.to - s.from) * e);
    if (Number.isFinite(x)) {
      s.foe.x = x;
      if (s.foe.enemy) s.foe.enemy.x = x;
    }
    if (k >= 1) this.foeStep = null;
  }

  // O bote do inimigo (roda uma única vez, quando a carga termina).
  foeStrike() {
    const pet = this.pet;
    const foe = this.opp;
    if (this.kind === 'unknown' && !foe) { this.phase = 'impact'; this.t = 0; return; }
    foe?.enemy?.play?.('attack');
    // Se ela estiver longe, o golpe passa e ele avança — só o excedente, até a distância de golpe.
    const dist = this.distance();
    if (this.outOfRange()) {
      const ox = this.oppX() ?? pet.x;
      const dir = Math.sign(pet.x - ox) || 1;
      const step = Math.min(dist - pet.P * STRIKE_GAP, pet.P * 0.6);
      if (foe && step > 0) {
        const w = this.app.world?.width || 0;
        const nx = (foe.x ?? foe.enemy?.x ?? 0) + dir * step;
        foe.x = w ? Math.max(pet.P * 0.3, Math.min(w - pet.P * 0.3, nx)) : nx;
        if (foe.enemy) foe.enemy.x = foe.x;
      }
      this.say(this.oppX(), this.oppY() - this.pet.P * 1.25, 'Ele não alcançou!', 'good');
      this.app.fx?.impact?.('dust', this.oppX(), this.oppY() - 8, 0.5);
      this.hitResolved = true;
      this.phase = 'impact';
      this.t = 0;
      this.endFoeTurn(foe);
      return;
    }
    // A rolagem: precisão dele contra o bloqueio/desvio dela (o Corvo cobre com o Grito).
    const lvl = this.level;
    const dex = this.game?.attrLevel?.('dex') ?? 1;
    const block = clamp(0.06 + lvl * 0.035 + dex * 0.015 + this.blockBoost, 0.02, 0.6);
    const dodge = clamp(0.04 + lvl * 0.02 + dex * 0.02 + this.dodgeBoost, 0.02, 0.5);
    const stunned = (foe?.stunned || 0) > 0;
    const accBase = this.opp?.acc ?? 0.62;
    const acc = clamp(accBase - (foe?.accPen || 0) - (stunned ? 0.45 : 0), 0.05, 0.95);
    const r = Math.random();
    this.hitResolved = true;
    if (r < block) this.resolveDefence('block');
    else if (r < block + dodge) this.resolveDefence('dodge');
    else if (r < block + dodge + acc) this.resolvePlayerHit();
    else this.resolveMiss(stunned);
    this.endFoeTurn(foe, stunned);
  }

  // Fecha o turno do inimigo: a cegueira, a defesa derrubada e o Grito se desgastam.
  endFoeTurn(foe, stunned = false) {
    if (foe) {
      if (foe.accTurns > 0) { foe.accTurns -= 1; if (!foe.accTurns) foe.accPen = 0; }
      if (foe.defTurns > 0) { foe.defTurns -= 1; if (!foe.defTurns) foe.defDown = 0; }
      if (stunned) { foe.stunned = Math.max(0, foe.stunned - 1); if (!foe.stunned) this.removeOppDizzy(); }
    }
    // O Grito de Alerta e a Provocação se gastam no turno dele.
    this.blockBoost = 0;
    this.dodgeBoost = 0;
  }

  // A luta contra a horda acaba.
  finishUnknown(reason = 'done') {
    if (!this.active) return;
    const pet = this.pet;
    const game = this.game;
    if (reason === 'win') {
      this.app.sound?.play?.('ok', { volume: 0.5 });
      const wave = game.profile.blackCartridgeWave || 1;
      // A onda foi vencida: +1 — ao limpar a Wave 9 as waves RECOMEÇAM na Wave 1 (o Wave 10 é para o boss futuro).
      game.profile.blackCartridgeWave = wave >= 9 ? 1 : wave + 1;
      // O Cristal Negro cai SÓ na primeira vitória de sempre.
      if (!game.profile.cristalAwarded) {
        game.profile.cristalAwarded = true;
        game.inventory.cristal_negro = (game.inventory.cristal_negro || 0) + 1;
        game.changed();
        const item = game.items().find((e) => e.item?.id === 'cristal_negro');
        this.app.gains?.show('Cristal Negro', 'item', 'a horda caiu', item?.item?.img || '💎');
        this.app.sound?.play?.('powerup', { volume: 0.5 });
        // A cutscene nefasta do cristal (Trigger B).
        this.app.pet?.emit?.('cristalDrop');
      }
      // O cartucho preto continua guardado no Especial: dá para repetir as ondas.
      game.profile.unknownDone = true;
      game.changed();
      game.persist?.();
    } else if (reason === 'safety' || reason === 'tired') {
      // DERROTA: os inimigos recuam na fumaça, e ela cai no chão (Inconsciente até 50%).
      this.app.combatUI?.defeatBanner?.();
      // Uma vignette escura engole a tela por alguns segundos.
      const vignette = document.createElement('div');
      vignette.className = 'defeat-vignette';
      document.body.append(vignette);
      setTimeout(() => vignette.remove(), 2600);
      // Cada inimigo vira fumaça escura e desaparece.
      for (const f of this.foes) {
        if (f.enemy) this.app.combatUI?.smokePoof?.(f.enemy.x, f.enemy.y - this.pet.P * 0.5);
        f.hp = 0;
      }
      // A horda recua: toca a animação de espera e some para dentro da TV.
      this.app.unknown?.onDefeat?.('lose');
      this.app.sound?.play?.('gameover', { volume: 0.5 }) ?? this.app.sound?.tone8?.(80, 40, 0.8, 'sawtooth', 0.08);
      this.app.combatUI?.hideFoeBars?.();
      this.say(pet.x, pet.y - pet.P * 1.25, '...', 'bad');
      // Ela desaba no chão: INCONSCIENTE (trava total; acorda com 50%+ de HP e Energia).
      this.pet.lieUnconscious?.();
      this.app.combatUI?.fightSummary?.({ ...this.fightStats, xp: game._xpFight || {} });
    }
    // A luta contra a horda também é um treino de verdade: bônus de Força e Agilidade da sessão.
    if (this.turns >= 3) {
      game.attrGain?.('str', ATTR_XP.str.session, 'heavy');
      game.attrGain?.('agi', ATTR_XP.agi.session, 'heavy');
      this.attrGained.str += ATTR_XP.str.session;
      this.attrGained.agi += ATTR_XP.agi.session;
    }
    this.stop(reason);
  }

  // ---------------- the turns ----------------

  update(dt) {
    if (!this.active) return;
    const pet = this.pet;
    // Marca o frame: o resgate do combat (behavior.update) não pode ticar duas vezes.
    this.frame = this.app?.pet?.frame ?? -1;
    // Todos encaram o alvo vivo a cada frame (Persocon, Corvo e inimigos).
    this.faceCombatants();
    // Relógio de fase: nenhuma fase pode segurar a fila de turnos para sempre.
    if (this._seen !== this.phase) { this._seen = this.phase; this._seenT = 0; }
    else this._seenT = (this._seenT || 0) + dt;
    // Cão de guarda do Corvo: no máximo UMA ação por ciclo e nada de travar a fila.
    // (O turno normal dele: anúncio 0,9 s + carga 0,45 s + impacto 0,7 s = 2,05 s.)
    if (this.turn === TURN.CROW) {
      this.crowTurnT = (this.crowTurnT || 0) + dt;
      if (this.crowTurnT > 2.5 && !this.petDown && this.phase !== 'recover' && this.phase !== 'victory') {
        console.warn('[CrowTurn] watchdog: turno preso por mais de 2,5 s — avançando a fila');
        this.crowTurnT = 0;
        this.crowActing = false;
        this.pendingCrow = false;
        this.hitResolved = true;
        this.beginTurn(this.nextEntry());
        return;
      }
    } else this.crowTurnT = 0;
    // O hit-stop: no impacto tudo congela por um instante.
    if (this.hitStop > 0) {
      this.hitStop -= dt;
      this.updateAuras();
      return;
    }
    // Ela foi nocauteada e está no chão: a luta espera ela se levantar.
    if (this.petDown) {
      this.t = 0;
      // Rede de segurança: o 'getUp' é a única saída normal, então ela nunca pode depender
      // só dele. Sem queda em andamento (nocaute de derrota, animação perdida) ou passando
      // do tempo máximo, a luta destrava na mão.
      this.downT = (this.downT || 0) + dt;
      if (!this.pet.knock || this.downT > PET_DOWN_MAX) {
        console.warn('[PetDown] destravando o turno sem o getUp');
        this.petDown = false;
        this.downT = 0;
        this.pet.knock = null;
        this.pet.jumpPrep = null;
        this.t = 0;
      }
      this.updateAuras();
      return;
    }
    this.downT = 0;
    // O retorno do desvio: ela volta para a guarda num piscar.
    if (this.returnTo) {
      const r = this.returnTo;
      r.t += dt;
      const k = Math.min(1, r.t / 0.16);
      if (Number.isFinite(r.x)) pet.x = r.from + (r.x - r.from) * k;
      if (k >= 1) { if (Number.isFinite(r.x)) pet.x = r.x; this.returnTo = null; }
    }
    // A opacidade 0,7 do desvio volta ao normal.
    if (this.ghostT > 0) {
      this.ghostT -= dt;
      if (this.ghostT <= 0) this.clearGhost();
    }
    // Fase presa (clipe perdido no modelo, evento que não veio, queda sem getUp): a fila
    // AVANÇA na mão — a luta nunca fica parada num turno.
    const cap = PHASE_MAX[this.phase];
    if (cap && this._seenT > cap && this.phase !== 'victory') {
      console.warn(`[Melee] fase "${this.phase}" presa por ${this._seenT.toFixed(1)}s — avançando a fila`);
      this._seenT = 0;
      this.hitResolved = true;
      this.chargeT = 0;
      this.chargeSpot = null;
      this.pendingCrow = false;
      this.pendingFoe = false;
      this.closeT = 0;
      this.beginTurn(this.nextEntry());
      return;
    }
    this.t += dt;
    this.dt = dt;
    switch (this.phase) {
      case 'intro': {
        // She steps into the strike range (the toy play owns her position) and squares up.
        this.introT += dt;
        // A formação dela é o lugar de onde ela entra na luta.
        if (this.homeX == null) this.homeX = pet.x;
        const side = Math.sign((this.oppX() ?? pet.x) - pet.x) || pet.dir || 1;
        const want = (this.oppX() ?? pet.x) - side * pet.P * STRIKE_GAP;
        const d = want - pet.x;
        pet.dir = side;
        if (Math.abs(d) > 2) {
          pet.x = this.edgeX(pet.x + Math.sign(d) * Math.min(Math.abs(d), (pet.walkSpeed || 60) * 1.1 * dt));
          this.dashPose('dash_forward', side, dt);
        }
        if (Math.abs(want - pet.x) <= 3 || this.introT > 1.4) this.beginTurn({ turn: TURN.PERSOCON, foeIdx: this.kind === 'unknown' ? this.firstAliveFoe() : this.foeIdx });
        break;
      }
      case 'align':
        // O "beat" clássico de JRPG: os dois times se medem no centro da arena.
        // Se já começarem encostados, ela recua enquanto se medem.
        if (this.tooClose()) this.walkToSpot(dt);
        if (this.t >= 0.9) this.closeIn();
        break;
      case 'announce':
        // JRPG pace: the actor is named, then the wind-up starts.
        if (this.t >= PACE.announce) this.startTurn();
        break;
      case 'close':
        // She dashes back into contact; the strike only happens when she arrives.
        this.closeT = (this.closeT || 0) + dt;
        if (this.wrongSpot() && this.closeT < CLOSE_MAX) this.closeIn();
        else {
          // Estourou o tempo e ela ainda não chegou: cola no alvo e golpeia de qualquer jeito.
          if (this.wrongSpot()) this.snapToRange();
          this.closeT = 0;
          this.phase = 'windup';
          this.t = 0;
          this.persoconTurn();
        }
        break;
      case 'charge':
        // O inimigo se aproxima enquanto carrega (se ela estava na formação, longe).
        if (this.foeStep) this.stepFoe(dt);
        // The charge ends and the strike begins (the animation only starts now).
        if (this.t >= (this.chargeT || CHARGE_TIME)) {
          this.chargeT = 0;
          const crow = this.pendingCrow;
          const foe = this.pendingFoe;
          this.pendingCrow = false;
          this.pendingFoe = false;
          this.phase = 'windup';
          this.t = 0;
          // O clarão vermelho da liberação (antes do golpe sair).
          this.releaseCharge();
          if (crow) this.runCrowAct();
          else if (foe) { if (this.opp?.scrap) this.scrapStrike(); else this.foeStrike(); }
          else this.startMoveAnim();
        }
        break;
      case 'windup': {
        // The clip is playing: the hit is resolved by the combatHit event. If the clip never
        // fires it (missing clip, interrupted), the turn still resolves.
        if (!this.hitResolved && this.t > (this.moveDur || 1) + 0.7) this.resolveHit();
        break;
      }
      case 'impact':
        // The numbers and the effect are on screen for a beat.
        if (this.t >= PACE.impact) { this.phase = 'recover'; this.t = 0; }
        break;
      case 'recover':
        // De volta à formação: ela recua num dash (e o inimigo da vez volta ao lugar dele).
        this.returnToFormation(dt);
        if (this.t >= PACE.recover) this.beginTurn(this.nextEntry());
        break;
      case 'victory':
        // A pose de vitória, o banner e o resumo de XP: depois a luta termina.
        if (this.t >= 2.3) {
          if (this.kind === 'unknown') this.finishUnknown('win');
          else if (this.kind === 'fight') this.finishSparring('win');
          else this.stop('done');
        }
        break;
      default:
        break;
    }
    if (this.opp?.scrap) this.updateHpBar();
    if (this.kind === 'unknown') {
      // Sincroniza a posição do inimigo com o sprite a cada frame (o mesmo objeto, sempre).
      try {
        for (const f of this.foes) { if (f.enemy && f.x != null) { f.enemy.x = f.x; f.enemy.y = f.y; } }
        this.updateFoeBars();
      } catch { /* nunca derruba a luta */ }
    }
    this.updateAuras();
    // The training ends when the dummy is gone (energy no longer ends it by itself).
    if (this.active && this.kind === 'dummy') {
      const d = this.game?.toys?.boneco_treino;
      if (!d?.placed || d.broken) this.finishTraining('dummy-gone');
    }
    // The sparring: non-lethal. She stops at half of her health.
    if (this.active && this.kind === 'fight') {
      const hp = pet.stats.health;
      const hpMax = this.petHpMax ?? 100;
      // A vitória é conferida em checkVictory (fase victory); aqui é só a parada de segurança.
      if (hp <= hpMax * SAFETY_HP && this.phase !== 'victory') this.finishSparring('safety');
    }
    // A luta com o Unknown: mesma parada de segurança, e o drop quando ele cai.
    if (this.active && this.kind === 'unknown') {
      const hp = pet.stats.health;
      if (hp <= (this.petHpMax ?? 100) * SAFETY_HP && this.phase !== 'victory') this.finishUnknown('safety');
    }
    // Energia baixa / zerada: avisa uma vez; sem energia ela continua lutando (e apanha mais).
    if (this.active && this.phase !== 'victory') {
      const en = pet.stats.energy;
      if (en > EXHAUST_ENERGY) { this.lowWarned = false; this.exhaustWarned = false; }
      if (en <= 0 && !this.exhaustWarned) {
        this.exhaustWarned = true;
        this.say(pet.x, pet.y - pet.P * 1.25, 'Sem energia!', 'bad');
        this.ui?.warnBanner?.('Sem energia — cada golpe dói mais (a luta continua)', 2800);
        this.app.sound?.tone8?.(230, 110, 0.18, 'sawtooth', 0.07);
      } else if (en > 0 && en <= EXHAUST_ENERGY && !this.lowWarned) {
        this.lowWarned = true;
        this.say(pet.x, pet.y - pet.P * 1.25, 'Cansada...', 'bad');
        this.ui?.warnBanner?.('Energia baixa', 2200);
      }
    }
  }

  beginTurn(next) {
    this.t = 0;
    this.closeT = 0;
    this.downT = 0;
    this.hitResolved = false;
    this.move = null;
    this.phase = 'announce';
    // Zera o estado do Corvo a cada turno novo (ele age uma única vez por ciclo).
    this.crowTurnT = 0;
    this.crowActing = false;
    this.pendingCrow = false;
    this.pendingFoe = false;
    this.chargeSpot = null;
    this.foeStep = null;
    this.returnTo = null;
    // A fila reconhece os dois formatos: a entrada da fila ou a string simples.
    const entry = typeof next === 'string' ? { turn: next, foeIdx: this.kind === 'unknown' ? this.firstAliveFoe() : this.foeIdx } : next || { turn: TURN.PERSOCON, foeIdx: this.foeIdx };
    this.turn = entry.turn;
    if (entry.turn === TURN.PERSOCON || entry.turn === TURN.CROW) {
      this.foeIdx = this.kind === 'unknown' ? this.firstAliveFoe() : this.foeIdx;
    } else this.foeIdx = entry.foeIdx ?? 0;
    this.turns += 1;
    // JRPG pace: o ator é anunciado em cima da cabeça; o anel marca o chão e a fila se acende.
    if (this.turn === TURN.PERSOCON) {
      this.say(this.pet.x, this.pet.y - this.pet.P * 1.22, this.app.config?.name || 'Persocon', 'good');
    } else if (this.turn === TURN.CROW) {
      this.sayCrow('🪶', 'Corvo!');
    } else {
      const f = this.foes[this.foeIdx];
      this.say(this.oppX(), this.oppY() - this.pet.P * 1.1, f?.name || this.opp?.name || 'Inimigo', 'bad');
    }
    this.ringOnActor();
    this.updateQueueHud();
    // O sangramento começa no turno do inimigo ferido.
    if (this.turn === TURN.FOE) this.tickBleed();
  }

  // The turn itself: the move, the item or the maneuver.
  startTurn() {
    if (this.turn === TURN.PERSOCON) {
      // Out of the strike spot (too far or glued to him)? She fixes it before attacking.
      if (this.wrongSpot()) { this.closeIn(); return; }
      this.persoconTurn();
    } else if (this.turn === TURN.CROW) this.crowTurn();
    else this.opponentTurn();
  }

  // How far she is from the target.
  distance() {
    const ox = this.oppX() ?? this.pet.x;
    return Math.abs(ox - this.pet.x);
  }

  outOfRange() {
    return this.distance() > this.pet.P * MELEE_RANGE;
  }

  // Encostada demais (o corpo do inimigo é largo: os sprites já se cobrem).
  tooClose() {
    return this.distance() < this.pet.P * MIN_GAP;
  }

  // Fora do ponto de golpe, para longe ou para perto.
  wrongSpot() {
    return this.outOfRange() || this.tooClose();
  }

  // Ponto onde ela deve ficar para golpear (do lado dela em relação ao alvo).
  spotX() {
    const pet = this.pet;
    const ox = this.oppX() ?? pet.x;
    const side = Math.sign(ox - pet.x) || pet.dir || 1;
    return { side, want: ox - side * pet.P * STRIKE_GAP, ox };
  }

  // O mundo: ela nunca sai da tela pelo dash.
  edgeX(x) {
    const w = this.app.world?.width || 0;
    const P = this.pet.P;
    return w ? Math.min(w - P * 0.25, Math.max(P * 0.25, x)) : x;
  }

  // A formação dela: é para lá que ela volta depois de golpear (o lado direito da arena).
  homeSpot() {
    return Number.isFinite(this.homeX) ? this.homeX : this.pet.x;
  }

  // A pose do dash + o rastro. A animação é só visual: quem anda é o x.
  dashPose(clip, side, dt = this.dt || 0.016) {
    const pet = this.pet;
    if (pet.combatAnim?.name !== clip) {
      pet.playAnimation?.(clip, { facing: side > 0 ? 'right' : 'left', restart: true });
    }
    this.trailT = (this.trailT || 0) - dt;
    if (this.trailT <= 0) {
      this.trailT = 0.07;
      this.app.fx?.dashTrail?.(pet.x - side * pet.P * 0.1, pet.y - pet.P * 0.5, pet.P * 0.85, side);
    }
  }

  // Dá um passo na direção do ponto de golpe (para frente ou para trás) NO DASH: 3× o andar.
  walkToSpot(dt) {
    const pet = this.pet;
    const { side, want } = this.spotX();
    const d = want - pet.x;
    pet.dir = side;
    const step = Math.sign(d) * Math.min(Math.abs(d), (pet.walkSpeed || 60) * DASH_SPEED * dt);
    pet.x = this.edgeX(pet.x + step);
    // Indo para o alvo é o dash de ataque; recuando é o dash de volta (nunca o walk lento).
    const forward = Math.sign(d) === side;
    this.dashPose(forward ? 'dash_forward' : 'dash_backward', side, dt);
    return d;
  }

  // Depois do golpe: ela volta num dash para a formação e o inimigo volta para o lugar dele.
  returnToFormation(dt) {
    const pet = this.pet;
    const P = pet.P;
    const speed = (pet.walkSpeed || 60) * RETREAT_SPEED;
    const d = this.homeSpot() - pet.x;
    if (Math.abs(d) > 2) {
      const side = Math.sign(d);
      pet.x = this.edgeX(pet.x + Math.sign(d) * Math.min(Math.abs(d), speed * dt));
      this.dashPose('dash_backward', side, dt);
    }
    // O inimigo da vez também volta ao slot da formação (ninguém sai andando pelo chão).
    const f = this.kind === 'unknown' ? this.foes[this.foeIdx] : null;
    if (f && Number.isFinite(f.slotX) && Number.isFinite(f.x)) {
      const fd = f.slotX - f.x;
      if (Math.abs(fd) > 2) {
        f.x = this.edgeX(f.x + Math.sign(fd) * Math.min(Math.abs(fd), speed * dt));
        if (f.enemy) f.enemy.x = f.x;
      }
    }
  }

  // A opacidade 0,7 do desvio (o "borrão" de quem saiu do golpe).
  ghost(seconds = 0.3) {
    const cv = this.pet?.view?.canvas;
    if (!cv?.style) return;
    this.ghostT = Math.max(this.ghostT || 0, seconds);
    cv.style.opacity = '0.7';
  }

  clearGhost() {
    this.ghostT = 0;
    const cv = this.pet?.view?.canvas;
    if (cv?.style) cv.style.opacity = '';
  }

  // Ela se acerta na distância de golpe (o ataque só sai quando chega).
  closeIn() {
    const pet = this.pet;
    const first = this.phase !== 'close';
    this.phase = 'close';
    this.t = 0;
    if (first) {
      const { want, ox } = this.spotX();
      const back = Math.abs(want - pet.x) > Math.abs(ox - pet.x);
      this.say(pet.x, pet.y - pet.P * 1.05, back ? 'Recua!' : 'Avança!', 'good');
      this.app.sound?.tone8?.(300, 420, 0.05, 'square', 0.04);
    }
    this.walkToSpot(this.dt || 0.016);
  }

  // Cola ela na distância de golpe (usado quando o avanço estoura o tempo).
  snapToRange() {
    const pet = this.pet;
    const ox = this.oppX() ?? pet.x;
    const side = Math.sign(ox - pet.x) || pet.dir || 1;
    pet.dir = side;
    pet.x = ox - side * pet.P * STRIKE_GAP;
  }

  // The Persocon's turn: she uses a medicine when hurt, or fights with a maneuver/normal move.
  persoconTurn() {
    const pet = this.pet;
    this.phase = 'windup';
    this.t = 0;
    // She spends the turn on a medicine instead of attacking when it actually helps.
    // With the Fúria the maneuver comes first: the status is precious.
    const man = this.fury ? maneuverFor(this.level) : null;
    if (man) return this.maneuverTurn(man);
    if (this.useMedicine()) return;
    // Otherwise: one of the moves she has unlocked.
    const list = this.attacks.length ? this.attacks : this.moves;
    if (!list.length) { this.finishTraining('nomoves'); return; }
    // The higher the level, the rarer the move (the basic jab is the bread and butter).
    const weights = list.map((m) => Math.max(1, 12 - m.lvl * 1.4));
    const move = pickWeighted(list, weights);
    this.move = move;
    this.next = TURN.OPPONENT;
    const facing = this.facing();
    pet.dir = facing > 0 ? 1 : -1;
    this.moveDur = (this.metaOf(move)?.durationMs ?? 400) / 1000;
    // O nome do golpe: maior e piscando (é uma arte de combate).
    this.say(pet.x, pet.y - pet.P * 1.05, move.name, 'good', { big: move.kind === 'attack' });
    // A carga vem antes: a animação do golpe só começa depois dela.
    this.startCharge(move.kind === 'attack' ? CHARGE_TIME : 0);
  }

  // A carga antes do golpe: ela brilha em VERMELHO e junta energia (0 = sem carga).
  startCharge(dur = 0) {
    const pet = this.pet;
    if (!(dur > 0)) {
      this.startMoveAnim();
      return;
    }
    this.phase = 'charge';
    this.t = 0;
    this.chargeT = dur;
    // A pose de espera enquanto a energia junta.
    const facing = this.facing();
    // A Fúria tem a própria carga dentro do clipe (cast_special): ela já entra vibrando.
    if (this.metaOf(this.move)?.charge) {
      pet.playAnimation?.('cast_special', { facing: facing > 0 ? 'right' : 'left', restart: true });
    } else {
      pet.playAnimation?.('combat_idle', { facing: facing > 0 ? 'right' : 'left', restart: false });
    }
    // A aura da carga em volta dela, o brilho no modelo e as partículas de energia.
    // A cor vem do golpe (vermelho normal, azul/dourado nos especiais).
    const color = this.move?.maneuver?.color || 'red';
    const spot = { x: pet.x, y: pet.y - pet.P * 0.45, size: pet.P };
    this.chargeSpot = spot;
    if (color === 'red') this.ui?.glowRed?.(pet.view?.canvas, dur * 1000);
    this.app.fx?.charge?.(spot.x, spot.y, spot.size, dur * 1000, color);
    pet.view?.flash?.(1, color === 'blue' ? 'blue' : 'red', dur);
    // O som de juntar energia (sobe de tom).
    this.app.sound?.tone8?.(180, 920, dur, 'sawtooth', 0.045);
  }

  // O clarão rápido quando a carga estoura e o golpe sai.
  releaseCharge() {
    const s = this.chargeSpot;
    this.chargeSpot = null;
    if (s) this.ui?.chargeBurst?.(s.x, s.y, s.size);
    // Especial corpo a corpo: a investida para dentro do golpe (o cast_special já empurra o
    // tronco; aqui ela dá o passo que junta o dash com a soltura da energia).
    const man = this.move?.maneuver;
    if (man && !man.ranged) {
      const pet = this.pet;
      const facing = this.facing();
      const ox = this.oppX();
      const want = Number.isFinite(ox) ? ox - facing * pet.P * STRIKE_GAP : pet.x + facing * pet.P * 0.2;
      if (Math.abs(want - pet.x) > 2) {
        pet.x = this.edgeX(pet.x + Math.sign(want - pet.x) * Math.min(Math.abs(want - pet.x), pet.P * 0.35));
        this.app.fx?.dashTrail?.(pet.x - facing * pet.P * 0.15, pet.y - pet.P * 0.5, pet.P * 0.9, facing);
      }
      this.app.fx?.impact?.('dust', pet.x - facing * pet.P * 0.25, pet.y - 6, 0.7);
      this.app.fx?.shake?.(0.55);
    }
  }

  // A animação do golpe escolhido (depois da carga).
  startMoveAnim() {
    const pet = this.pet;
    if (!this.move) return;
    const facing = this.facing();
    // O clipe já está tocando (a carga faz parte dele): não recomeça.
    if (pet.combatAnim?.name === this.move.clip) return;
    if (!pet.playAnimation(this.move.clip, { facing: facing > 0 ? 'right' : 'left' })) {
      // The model has no such clip: fall back to the stance.
      pet.playAnimation('combat_idle', { facing: facing > 0 ? 'right' : 'left' });
    }
  }

  // The special maneuver (only with the Fúria): it consumes the status.
  maneuverTurn(man) {
    const pet = this.pet;
    this.fury = false;                 // the Fúria is spent
    this.removeFuryAura();
    this.move = {
      id: man.id, name: man.name, kind: 'attack', clip: man.clip,
      dmg: man.mult, maneuver: man, hits: man.hits || 1,
    };
    this.next = TURN.OPPONENT;
    const facing = this.facing();
    pet.dir = facing > 0 ? 1 : -1;
    this.moveDur = (this.metaOf(this.move)?.durationMs ?? 500) / 1000;
    this.say(pet.x, pet.y - pet.P * 1.15, `${man.name}!`, 'good', { big: true });
    // A manobra carrega mais: a aura azul dura um pouco mais.
    this.startCharge(CHARGE_MANEUVER);
  }

  // She drinks a medicine instead of attacking — but only if it helps RIGHT NOW:
  // it heals and she is hurt, or it cures a status she actually has.
  useMedicine() {
    const pet = this.pet;
    const game = this.game;
    const max = pet.maxHealth?.() ?? 100;
    const hurt = pet.stats.health < max * 0.6;
    const cures = (item) => (item.cures || []).some((c) => pet.hasDebuff?.(c));
    const meds = ITEMS.filter((i) => i.cat === 'medicina' && (game.count?.(i.id) || 0) > 0
      && ((i.effects?.health > 0 && hurt) || cures(i)));
    if (!meds.length) return false;
    meds.sort((a, b) => ((b.effects?.health || 0) + (cures(b) ? 50 : 0)) - ((a.effects?.health || 0) + (cures(a) ? 50 : 0)));
    const item = meds[0];
    pet.adjust(item.effects || {});
    for (const c of item.cures || []) pet.cureDebuff?.(c);
    // The stun wears off with the medicine that cures it.
    if ((item.cures || []).includes('atordoado')) this.stunTurns = 0;
    game.take(item.id);
    game.changed();
    pet.emit('ate', { item });
    this.move = { id: 'item', name: item.name, kind: 'item', clip: 'use_item', dmg: 0 };
    this.next = TURN.OPPONENT;
    this.hitResolved = true;          // no strike this turn
    this.say(pet.x, pet.y - pet.P * 1.05, `Usou ${item.name}`, 'good');
    // A animação de uso: ela leva o item à boca e segura (~450 ms) com o ícone em cima.
    pet.playAnimation?.('use_item', { facing: this.facing() > 0 ? 'right' : 'left', restart: true });
    this.ui?.itemPop(pet.x, pet.y - pet.P * 1.6, item.img);
    // As partículas verdes (cruzes) e azuis (brilhos) do remédio em volta dela.
    this.app.fx?.heal?.(pet.x, pet.y - pet.P * 0.7, pet.P);
    this.app.fx?.impact?.('dust', pet.x, pet.y - pet.P * 0.6, 0.4);
    this.app.sound?.play?.('puff', { volume: 0.4 });
    this.phase = 'impact';
    this.t = -0.45;                   // o tempo extra de segurar o item
    return true;
  }

  // The opponent's turn. The Training Dummy NEVER attacks: it braces and waits.
  // The Scrap Dummy fights back.
  opponentTurn() {
    const pet = this.pet;
    this.next = TURN.PERSOCON;
    this.phase = 'windup';
    this.t = 0;
    if (this.opp.unknown) return this.foeTurn();
    if (this.opp.scrap) return this.scrapTurn();
    this.move = { id: 'brace', name: 'Defende', kind: 'defend', clip: 'combat_block', dmg: 0 };
    this.moveDur = 0.45;
    this.say(this.oppX(), this.oppY() - this.pet.P * 1.05, 'O boneco se defende', 'bad');
    this.app.sound?.tone8?.(220, 160, 0.12, 'triangle', 0.05);
    // She waits in the fighting stance while the dummy braces.
    pet.anim('idle', { facing: this.facing() > 0 ? 'right' : 'left', restart: false });
    this.hitResolved = true;
    this.phase = 'impact';
    this.t = 0;
  }

  // The Scrap Dummy attacks: it rolls against her block/dodge and really hurts.
  // Primeiro ele carrega em vermelho; o golpe sai em scrapStrike().
  scrapTurn() {
    this.next = TURN.PERSOCON;
    // A postura do Sucataoxidado muda o golpe dele: Certeiro acerta mais e bate de leve,
    // Defensivo apanha pouco (e fecha o corpo), Brutal erra mais mas esmaga.
    const posture = this.opp?.posture || 'certeiro';
    let dmgMul = 1;
    let accBase = 0.38 + this.opp.level * 0.05;
    let callout = 'Golpe de Sucata';
    if (posture === 'certeiro') { dmgMul = 0.8; accBase = 0.55 + this.opp.level * 0.06; callout = 'Golpe Certeiro'; }
    else if (posture === 'brutal') { dmgMul = 1.5; accBase = 0.28 + this.opp.level * 0.045; callout = 'Golpe Brutal'; }
    else { dmgMul = 0.7; accBase = 0.3 + this.opp.level * 0.04; callout = 'Golpe Defensivo'; }
    this.move = { id: 'scrap', name: callout, kind: 'attack', clip: 'attack_jab', dmg: Math.round((4 + this.opp.level * 2.2) * dmgMul) };
    this.moveDur = 0.5;
    this._scrapAcc = accBase;
    this.say(this.oppX(), this.oppY() - this.pet.P * 1.05, callout, 'bad');
    this.app.sound?.tone8?.(posture === 'brutal' ? 110 : 150, 90, 0.12, 'square', 0.07);
    this.startFoeCharge(this.opp);
  }

  // O golpe do Sucataoxidado, no fim da carga vermelha.
  scrapStrike() {
    const dex = this.game?.attrLevel?.('dex') ?? 1;
    // The rolls: its accuracy against her defense.
    const lvl = this.level;
    let acc = clamp(this._scrapAcc ?? (0.38 + this.opp.level * 0.05), 0.2, 0.9);
    // Atordoado: the enemy hits far less often.
    const stunned = this.opp.stunned > 0;
    if (stunned) acc = clamp(acc - 0.45, 0.05, 0.9);
    const block = clamp(0.06 + lvl * 0.035 + dex * 0.015, 0.02, 0.45);
    const dodge = clamp(0.04 + lvl * 0.02 + dex * 0.02, 0.02, 0.35);
    const r = Math.random();
    this.hitResolved = true;
    if (r < block) {
      this.resolveDefence('block');
    } else if (r < block + dodge) {
      this.resolveDefence('dodge');
    } else if (r < block + dodge + acc) {
      this.resolvePlayerHit();
    } else {
      this.resolveMiss(stunned);
    }
    // The stun of the enemy wears off with the turns.
    if (stunned) {
      this.opp.stunned = Math.max(0, this.opp.stunned - 1);
      if (!this.opp.stunned) this.removeOppDizzy();
    }
  }

  // Ela bloqueia ou esquiva: a pose vem ANTES do dano (o golpe nem chega).
  resolveDefence(kind) {
    const pet = this.pet;
    const facing = this.facing();
    const face = facing > 0 ? 'right' : 'left';
    if (kind === 'dodge') {
      // O passo para trás: opacidade 0,7, "Miss!" e o retorno imediato à guarda.
      const before = pet.x;
      const away = this.edgeX(before - facing * pet.P * 0.45);
      pet.x = away;
      this.ghost(0.34);
      this.returnTo = { from: away, x: before, t: 0 };
      pet.playAnimation?.('dodge', { facing: face, restart: true });
      this.float(pet.x, pet.y - pet.P * 1.35, 'Miss!');
      this.say(pet.x, pet.y - pet.P * 1.05, 'Ela desviou!', 'bad');
      this.app.fx?.impact?.('dust', pet.x, pet.y - pet.P * 0.6, 0.45);
      this.app.sound?.tone8?.(700, 220, 0.1, 'square', 0.07);
    } else {
      // A guarda: braços cruzados na frente do rosto, cabeça baixa, e o corpo desliza
      // para trás com o impacto (sem cair).
      pet.playAnimation?.('combat_block', { facing: face, restart: true });
      this.say(pet.x, pet.y - pet.P * 1.05, 'Ela bloqueou!', 'bad');
      this.app.fx?.impact?.('shield', pet.x + facing * pet.P * 0.35, pet.y - pet.P * 0.6, 0.5);
      pet.x = this.edgeX(pet.x - facing * pet.P * 0.14);
      this.app.sound?.tone8?.(520, 220, 0.1, 'square', 0.07);
    }
    this.app.fx?.shake?.(0.3);
    // Blocking or dodging breaks the streak of hits: no Fúria.
    this.hitStreak = 0;
    // Esquivar/bloquear treina a Destreza (bloquear rende metade).
    this.game.attrGain?.('dex', ATTR_XP.dex[kind === 'dodge' ? 'dodge' : 'block'], 'dodge');
    this.pet.emit?.('defence', { kind });
    this.phase = 'impact';
    this.t = 0;
  }

  // The Scrap Dummy's blow lands: real health damage and the stagger animation.
  resolvePlayerHit() {
    const pet = this.pet;
    // Brutal postura: o Sucataoxidado acerta crits com mais frequência.
    const crit = Math.random() < (this.opp?.posture === 'brutal' ? 0.25 : 0.15);
    const dmg = Math.round(this.move.dmg * (0.85 + this.opp.level * 0.03) * (crit ? 1.6 : 1) * (this.exhausted ? EXHAUST_DAMAGE : 1));
    pet.adjust({ health: -dmg });
    // Levar dano de verdade treina a Constituição (é o jeito mais forte de ganhá-la).
    this.game.attrGain?.('con', dmg * ATTR_XP.con.hurt, this.kind === 'unknown' ? 'unknown' : 'heavy');
    // O flash vermelho nela (proporcional ao dano), o número de dano e o sangue.
    pet.view?.flash?.(flashIntensity(dmg));
    this.app.fx?.damage?.(pet.x, pet.y - pet.P * 1.18, dmg);
    this.app.fx?.seq?.(dmg >= 12 ? VFX_FOLDERS.heavy : VFX_FOLDERS.light, pet.x, pet.y - pet.P * 0.7, {
      scale: dmg >= 12 ? 2.4 : 1.7,
    });
    pet.playAnimation('combat_hit_stagger', { facing: this.facing() > 0 ? 'right' : 'left' });
    // The blow pushes her back: now she is out of reach and has to close in again.
    const w = this.app.world?.width || 0;
    const back = pet.x - this.facing() * pet.P * KNOCKBACK;
    pet.x = w ? Math.max(pet.P * 0.25, Math.min(w - pet.P * 0.25, back)) : back;
    // A heavy blow (critical ou assim) joga ela no ar: ela voa, cai e se levanta.
    // A luta espera ela ficar em pé de novo (petDown).
    const heavy = crit || dmg >= 10 || (this.opp?.level >= 2 && dmg >= 8);
    if (heavy && pet.launchKnockback) {
      pet.launchKnockback(-this.facing() * pet.P * 1.5, -pet.P * 2.4);
      this.petDown = true;
      this.downT = 0;
      this.say(pet.x, pet.y - pet.P * 1.3, 'Arremessada!', 'bad');
    }
    this.app.fx?.impact?.('rust', pet.x + this.facing() * pet.P * 0.3, pet.y - pet.P * 0.65, 0.5);
    this.app.fx?.shake?.(0.55);
    this.app.sound?.tone8?.(140, 60, 0.14, 'square', 0.11);
    // A critical hit or a heavy blow can leave her Atordoada for 1 to 3 turns.
    if (!this.stunTurns && (crit || (this.opp.level >= 2 && Math.random() < 0.18 + this.opp.level * 0.05))) {
      this.applyStun();
    }
    // O Pulso de Glitch atordoa por 1 turno só.
    if (this.move.stunChance && Math.random() < this.move.stunChance) this.applyStun(1);
    // Hits in a row without blocking or dodging: the Fúria comes up.
    this.hitStreak = (this.hitStreak || 0) + 1;
    if (this.hitStreak >= FURY_HITS && !this.fury) this.applyFury();
    // A fila de turnos mostra o estado (o retrato muda de emote conforme ela apanha).
    this.updateQueueHud();
    this.phase = 'impact';
    this.t = 0;
  }

  // Atordoada: 1 a 3 turnos de grande penalidade na precisão (ou o número fixo do Pulso de Glitch).
  applyStun(fixed = 0) {
    const pet = this.pet;
    const turns = fixed || 1 + Math.floor(Math.random() * 3);
    this.stunTurns = turns;
    pet.addDebuff?.('atordoado');
    this.say(pet.x, pet.y - pet.P * 1.2, 'Atordoada!', 'bad');
    this.app.sound?.tone8?.(880, 200, 0.25, 'triangle', 0.09);
    this.showDizzy();
  }

  // Fúria: ela pode soltar a manobra especial do seu nível.
  applyFury() {
    this.fury = true;
    this.hitStreak = 0;
    this.say(this.pet.x, this.pet.y - this.pet.P * 1.3, '[FÚRIA ATIVADA!]', 'good');
    // O som de ativação: o golpe grave que acompanha a aura vermelha.
    this.app.sound?.play?.('fury', { volume: 0.6 });
    this.showFury();
  }

  removeFuryAura() {
    this.furyAura?.remove();
    this.furyAura = null;
  }

  // The dizzy stars above her head while she is Atordoada.
  showDizzy() {
    if (this.dizzyEl || typeof document === 'undefined') return;
    this.dizzyEl = this.makeAura('dizzy', 'dizzy_stars.png');
  }

  removeDizzy() {
    this.dizzyEl?.remove();
    this.dizzyEl = null;
  }

  // The Fúria: a strong red energy aura around her, with the fire mark over the head.
  showFury() {
    if (this.furyAura || typeof document === 'undefined') return;
    const el = document.createElement('div');
    el.className = 'combat-aura fury';
    const mark = document.createElement('img');
    mark.className = 'fury-mark';
    mark.src = new URL('./assets/vfx/fire.png', import.meta.url).href;
    mark.draggable = false;
    el.appendChild(mark);
    document.body.append(el);
    this.furyAura = el;
  }

  // The stars above the stunned enemy.
  showOppDizzy() {
    if (this.oppDizzyEl || typeof document === 'undefined') return;
    this.oppDizzyEl = this.makeAura('dizzy', 'dizzy_stars.png');
  }

  removeOppDizzy() {
    this.oppDizzyEl?.remove();
    this.oppDizzyEl = null;
  }

  // A small image that follows a position (the auras of the fight).
  makeAura(cls, file) {
    const el = document.createElement('img');
    el.className = `combat-aura ${cls}`;
    el.src = new URL(`./assets/vfx/${file}`, import.meta.url).href;
    el.draggable = false;
    document.body.append(el);
    return el;
  }

  // The auras (her dizzy stars, her Fúria and the enemy's stars) follow their owners.
  updateAuras() {
    const pet = this.pet;
    const P = pet.P;
    if (this.dizzyEl) {
      this.dizzyEl.style.left = `${Math.round(pet.x)}px`;
      this.dizzyEl.style.top = `${Math.round(pet.y - P * 1.12)}px`;
    }
    if (this.furyAura) {
      // The red energy aura wraps her whole body.
      const s = Math.round(P * 1.55);
      this.furyAura.style.width = `${s}px`;
      this.furyAura.style.height = `${s}px`;
      this.furyAura.style.left = `${Math.round(pet.x)}px`;
      this.furyAura.style.top = `${Math.round(pet.y - P * 0.5)}px`;
    }
    if (this.oppDizzyEl) {
      this.oppDizzyEl.style.left = `${Math.round(this.oppX() ?? pet.x)}px`;
      this.oppDizzyEl.style.top = `${Math.round(this.oppY() - P * 1.12)}px`;
    }
    if (this.stunTurns > 0 && !this.dizzyEl) this.showDizzy();
    if (!this.stunTurns && this.dizzyEl) this.removeDizzy();
    if (this.fury && !this.furyAura) this.showFury();
    if (!this.fury && this.furyAura) this.removeFuryAura();
    if ((this.opp?.stunned || 0) > 0 && !this.oppDizzyEl) this.showOppDizzy();
    if (!(this.opp?.stunned || 0) && this.oppDizzyEl) this.removeOppDizzy();
  }

  // O inimigo errou o golpe (o Sucataoxidado tem fala própria; a horda é genérica).
  resolveMiss(stunned = false) {
    const pet = this.pet;
    const scrap = this.kind !== 'unknown' && this.opp?.scrap;
    const msg = stunned ? 'Atordoado!' : (scrap ? 'O Sucataoxidado errou!' : 'Errou!');
    this.say(pet.x, pet.y - pet.P * 1.05, msg, 'bad');
    this.app.fx?.impact?.('dust', pet.x + this.facing() * pet.P * 0.3, pet.y - pet.P * 0.7, 0.4);
    this.app.sound?.tone8?.(520, 300, 0.08, 'triangle', 0.04);
    this.phase = 'impact';
    this.t = 0;
  }

  // ---------------- o levantar do chão ----------------

  // Depois do get_up ela está DE PÉ: o estado do turno interrompido pela queda é limpo e a
  // fila volta a andar na hora. (Antes o turno ficava esperando um beat que nunca vinha: ela
  // andava até o alvo e congelava, sem atacar e sem passar a vez.)
  afterGetUp() {
    const pet = this.pet;
    this.petDown = false;
    this.downT = 0;
    this.crowTurnT = 0;      // o Corvo recomeça a contagem: nada de watchdog na cara
    this.hitStop = 0;
    this.closeT = 0;
    this.chargeT = 0;
    this.chargeSpot = null;
    this.foeStep = null;
    this.returnTo = null;
    this.pendingCrow = false;
    this.pendingFoe = false;
    this.trailT = 0;
    this.clearGhost();
    // Um nocaute pode jogar ela para fora do chão útil/da tela: volta para a formação.
    if (!Number.isFinite(pet.x)) pet.x = this.homeSpot();
    if (!this.active || this.phase === 'victory' || this.phase === 'idle') {
      this.updateQueueHud();
      return;
    }
    // A fila recomeça pelo próximo ator real (sem pular o turno de ninguém).
    this.beginTurn(this.nextEntry());
  }

  // The hit frame of the current move: the rolls happen here.
  onEvent(type, data) {
    // Ela levantou do chão: a luta volta a andar (o turno esperou ela).
    if (type === 'getUp') {
      this.afterGetUp();
      return;
    }
    if (!this.active || type !== 'combatHit') return;
    if (!this.move || data?.name !== this.move.clip) return;
    this.resolveHit();
  }

  // The roll of a single strike: 'block', 'miss' or the damage of the hit.
  rollStrike(man, mult = 1) {
    const lvl = this.level;
    const str = this.strength;
    const dex = this.game?.attrLevel?.('dex') ?? 1;
    const opp = this.opp;
    // Atordoada: ela erra muitos golpes.
    const stunned = this.stunTurns > 0;
    // A Provocação Aérea do Corvo derruba a defesa do inimigo.
    const oppDef = Math.max(0, (opp?.defense ?? 0) - (opp?.defDown || 0));
    let hitChance = clamp(0.52 + lvl * 0.04 + dex * 0.015 - oppDef, 0.2, 0.95);
    if (man?.ignoreDefense) hitChance = clamp(0.6 + lvl * 0.03 + dex * 0.015, 0.2, 0.95);
    if (stunned) hitChance = clamp(hitChance - STUN_PENALTY, 0.02, 0.95);
    const critChance = clamp(0.06 + lvl * 0.025 + dex * 0.01, 0.06, 0.45);
    const blockChance = clamp(0.1 + oppDef * 0.5 - lvl * 0.015, 0.02, 0.45);
    const r = Math.random();
    if (r < blockChance) return { result: 'block' };
    if (r >= blockChance + hitChance) return { result: 'miss', stunned };
    const crit = Math.random() < critChance;
    // The Strength decides how hard she hits; a maneuver has its own multiplier.
    const base = man ? man.mult * 6 : (this.move?.dmg ?? 0);
    const dmg = Math.max(1, Math.round(base * mult * (0.85 + lvl * 0.03) * (0.75 + str * 0.075) * (crit ? 1.7 : 1)));
    return { result: 'hit', dmg, crit };
  }

  // AGI (Nv 4+): cada nível acima de 3 dá +8% de chance de um golpe extra gratuito
  // no mesmo turno (Nv4 = 8% … Nv10 = 56%). O golpe extra é um pouco mais fraco que o normal.
  agiBonusStrike() {
    const agi = this.game?.attrLevel?.('agi') ?? 1;
    const chance = (agi - 3) * 0.08;
    if (chance <= 0 || Math.random() >= chance) return;
    const roll = this.rollStrike(null, 0.85);
    this.fightStats.strikes += 1;
    if (roll.result !== 'hit') return;
    this.fightStats.hits += 1;
    this.say(this.oppX(), this.oppY() - this.pet.P * 1.6, 'Golpe Rápido!', 'good');
    this.app.sound?.swish?.();
    this.damageFoe(roll.dmg, { crit: roll.crit });
  }

  resolveHit() {
    if (this.hitResolved) return;
    this.hitResolved = true;
    const move = this.move;
    const pet = this.pet;
    const lvl = this.level;
    const opp = this.opp;
    const man = move.maneuver;
    const side = this.facing();
    const x = this.oppX();
    const y = this.oppY() - 24;
    const heavy = move.lvl >= 7 || !!man;
    const hits = man?.hits || 1;
    let landed = false;
    let missed = false;
    let blocked = false;
    for (let h = 0; h < hits; h++) {
      const roll = this.rollStrike(man);
      this.fightStats.strikes += 1;
      if (roll.result === 'block') { blocked = true; break; }
      if (roll.result === 'miss') { missed = true; continue; }
      this.fightStats.hits += 1;
      landed = true;
      // Cada golpe acertado treina a Força (o treino pesado paga bem mais).
      this.damageFoe(roll.dmg, { crit: roll.crit });
      this.app.sound?.swish?.();
      this.app.dummy?.hit?.(roll.dmg, side);
      // Se a horda acabou no meio de um combo, os golpes restantes não acontecem.
      if (this.kind === 'unknown' && !this.foes.some((f) => f.hp > 0)) break;
    }
    if (landed) {
      // AGI (Nv 4+): chance de um golpe extra gratuito no mesmo turno.
      this.agiBonusStrike();
      // The special effects of the maneuver.
      this.applyManeuverFx(man, x, y);
    } else if (blocked) {
      this.say(this.oppX(), this.oppY() - this.pet.P * 1.05, 'Bloqueou!', 'good');
      this.app.fx?.impact?.('shield', x, y, 0.45);
      this.app.fx?.impact?.('dust', x, y + 6, 0.4);
      this.app.fx?.shake?.(0.25);
      this.app.sound?.tone8?.(300, 180, 0.1, 'square', 0.06);
    } else {
      // She missed: while stunned it shows why.
      this.say(this.oppX(), this.oppY() - this.pet.P * 1.05, missed && this.stunTurns > 0 ? 'Atordoada!' : 'Errou!', missed && this.stunTurns > 0 ? 'bad' : 'good');
      if (this.stunTurns > 0) this.app.fx?.impact?.('dust', pet.x, pet.y - pet.P * 0.8, 0.5);
      this.app.sound?.tone8?.(520, 300, 0.08, 'triangle', 0.04);
    }
    // Every turn trains her: a little XP, a little energy spent.
    const before = lvl;
    const gain = skillGain(this.kind === 'fight' ? 'sparring' : 'dummy');
    this.xpGained += gain;
    this.game.skillAdd('unarmed', gain);
    // Treinar no boneco também dá Constituição (de leve, um turno por vez).
    if (this.kind === 'dummy') { this.game.attrGain?.('con', ATTR_XP.con.turn, 'dummy'); this.attrGained.con += ATTR_XP.con.turn; }
    const after = this.level;
    if (after > before) this.say(pet.x, pet.y - pet.P * 1.25, `Nível ${after}!`, 'good');
    pet.adjust({ energy: -this.energyCost(), mood: 0.4 });
    // The stun lasts 1 to 3 of her turns.
    if (this.stunTurns > 0) {
      this.stunTurns = Math.max(0, this.stunTurns - 1);
      if (!this.stunTurns) pet.cureDebuff?.('atordoado');
    }
    if (this.checkVictory()) return;
    this.phase = 'impact';
    this.t = 0;
  }

  // The special effect of a maneuver (the shockwave, the explosion, the stun on the enemy).
  applyManeuverFx(man, x, y) {
    if (!man) return;
    // The Chute Meteoro can leave the enemy dizzy.
    if (man.stun && Math.random() < man.stun) {
      this.opp.stunned = 2;
      this.say(this.oppX(), this.oppY() - this.pet.P * 1.05, 'Atordoado!', 'good');
      this.showOppDizzy();
    }
    // The Contra-Impacto Sísmico: a shockwave ring and a bit of energy back.
    if (man.shock) {
      this.app.fx?.impact?.('burst', x, y, 1.6);
      this.app.fx?.impact?.('dust', x, y + 8, 1.2);
      this.app.sound?.play?.('whoosh', { volume: 0.5 });
      this.app.fx?.shake?.(1.2);
    }
    if (man.energy) this.pet.adjust({ energy: man.energy });
    // The Explosão Carmesim: the big crimson blast.
    if (man.explosion) {
      // Especial à distância: a energia sai dela como projétil até o alvo e estoura lá.
      if (man.ranged) {
        const pet = this.pet;
        const x1 = pet.x + this.facing() * pet.P * 0.3;
        const y1 = pet.y - pet.P * 0.6;
        this.app.fx?.projectile?.(x1, y1, x, y, 240);
        this.app.sound?.play?.('whoosh', { volume: 0.5 });
      }
      this.app.fx?.explosion?.('blood', x, y, 1.5);
      this.app.fx?.explosion?.('fire', x, y, 1.9, 1);
      this.app.fx?.shake?.(1.4);
      this.app.sound?.play?.('explode', { volume: 0.6 });
    }
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
      this.say(this.oppX(), this.oppY() - this.pet.P * 1.1, 'Sucataoxidado derrubado!', 'good');
      this.say(pet.x, pet.y - pet.P * 1.25, `Nível ${this.level}!`, 'good');
      this.app.sound?.play?.('ok', { volume: 0.5 });
    } else if (reason === 'safety') {
      this.say(pet.x, pet.y - pet.P * 1.25, 'Treino interrompido (segurança)', 'bad');
      this.ui?.warnBanner?.('Treino interrompido — segurança (HP abaixo de 50%)', 2600);
    } else {
      this.say(pet.x, pet.y - pet.P * 1.25, 'Sem energia — fim do treino', 'bad');
      this.ui?.warnBanner?.('Fim do treino — sem energia', 2600);
    }
    // The Scrap Dummy is reset for the next round.
    this.opp.hp = this.opp.max;
    // Terminar a sessão de Treino Pesado dá o bônus de Força e Agilidade da sessão.
    if (this.turns >= 3) {
      this.game.attrGain?.('str', ATTR_XP.str.session, 'heavy');
      this.game.attrGain?.('agi', ATTR_XP.agi.session, 'heavy');
    }
    this.stop(reason);
  }

  // Stops the fight (the escape hatch: two clicks on her cancel it).
  stop(reason = 'cancelled') {
    if (!this.active) return false;
    // Nada de estado de nocaute atravessando a luta: a próxima começa limpa.
    this.petDown = false;
    this.downT = 0;
    this.closeT = 0;
    if (this.pet) {
      this.pet.knock = null;
      this.pet.jumpPrep = null;
    }
    this.leave(reason);
    this.pet.endToy?.(true);
    this.pet.resume?.();          // segurança: nunca devolve a Persocon paralisada
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

  // O alvo vivo da vez (para posicionamento/encarada): usa a posição REAL do sprite,
  // que é sincronizada a cada frame — nunca a posição velha de um inimigo morto.
  combatTarget() {
    if (this.kind === 'unknown') {
      const alive = this.foes.filter((f) => f.hp > 0);
      return alive[0] ?? this.opp ?? null;
    }
    return this.opp ?? null;
  }

  combatTargetX() {
    const t = this.combatTarget();
    if (this.kind === 'unknown') return t?.enemy?.x ?? t?.x ?? this._foeFallbackX ?? this.pet.x;
    if (this.opp?.enemy) return this.opp.enemy.x;
    if (this.opp?.x != null) return this.opp.x;
    return this.app.game?.toys?.boneco_treino?.x ?? this.pet.x + this.pet.P;
  }

  // Encara o alvo: Persocon e Corvo sempre apontam para o inimigo vivo; os inimigos
  // apontam para ela. Roda a cada frame (a pose de vitória fica de frente para a tela).
  faceCombatants() {
    if (this.phase === 'victory') return;
    const pet = this.pet;
    const tx = this.combatTargetX();
    if (!Number.isFinite(tx)) return;
    const dir = Math.sign(tx - pet.x) || pet.dir || 1;
    pet.dir = dir;
    try {
      const want = dir > 0 ? 'right' : 'left';
      if (pet.view?.facing !== want) pet.view?.setFacing?.(want);
    } catch { /* sem view (testes) */ }
    if (this.kind === 'unknown') {
      for (const f of this.foes) {
        const e = f.enemy;
        if (!e) continue;
        const ex = e.x ?? f.x;
        if (ex == null) continue;
        e.dir = Math.sign(pet.x - ex) || 1;
      }
    }
    const crow = this.app.crow;
    if (crow && this.crowFight) crow.dir = dir;
  }

  oppX() {
    // A luta com a horda NUNCA mira o Boneco de Treino: só os inimigos da onda.
    if (this.kind === 'unknown') {
      const foe = this.foes?.find?.((f) => f.hp > 0) ?? this.opp;
      return foe?.x ?? foe?.enemy?.x ?? this._foeFallbackX ?? null;
    }
    if (this.opp?.enemy) return this.opp.enemy.x;
    if (this.opp?.x != null) return this.opp.x;
    const d = this.app.game?.toys?.boneco_treino;
    return d?.x ?? this.pet.x + this.pet.P;
  }

  oppY() {
    // O chão da arena (a horda fica sempre embaixo).
    if (this.kind === 'unknown') {
      const foe = this.foes.find((f) => f.hp > 0) ?? this.opp;
      return foe?.y ?? foe?.enemy?.y ?? this.app.toys?.floorY?.() ?? this.pet.y;
    }
    if (this.opp?.y != null) return this.opp.y;
    return this.app.toys?.floorY?.() ?? this.pet.y;
  }

  float(x, y, text) {
    this.app.toys?.furn?.floatText?.(x, y, text);
  }

  // The action text: a small box right above THAT fighter's head (green for her, red for
  // the enemy). The skills and the special maneuvers get a bigger, flashing text.
  say(x, y, text, kind = 'good', opts = {}) {
    if (typeof document === 'undefined') return;
    const el = document.createElement('div');
    el.className = `combat-line ${kind}${opts.big ? ' big' : ''}`;
    el.textContent = text;
    el.style.left = `${Math.round(x)}px`;
    el.style.top = `${Math.round(y - 62)}px`;   // bem mais alto acima da cabeça (JRPG clássico)
    document.body.append(el);
    setTimeout(() => {
      el.classList.add('out');
      setTimeout(() => el.remove(), 400);
    }, opts.big ? 1900 : 1500);
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
