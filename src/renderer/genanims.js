// Procedural Bedrock-style clips for models that miss some (YSM exports often only have the
// basics): built from whatever standard bones the model has (forearms and shins when present).
// Never replaces a clip the model already has.
import { AnimClip } from './animation.js';

const S = Math.sin;
const C = Math.cos;
const TAU = Math.PI * 2;

// Keyframes sampled from f(phase) over the clip (phase 0..2π).
const kf = (len, f, n = 16) => Object.fromEntries(Array.from({ length: n + 1 }, (_, i) => {
  const t = (len * i) / n;
  return [t.toFixed(3), f((i / n) * TAU).map((v) => Math.round(v * 100) / 100)];
}));

// Roles the pet looks for (see behavior.pickClip) for each generated extra.
export const GEN_ROLES = {
  gen_aceno: 'emote_pos', gen_bravo: 'emote_neg', gen_danca: 'danca', gen_triste: 'triste', gen_comemorar: 'comemorar',
  gen_rir: 'rir', gen_medo: 'medo', gen_cantar: 'cantar', gen_chutar: 'chutar', gen_arremessar: 'arremessar',
  gen_pegar: 'pegar', gen_golpe: 'golpe',
  gen_soco: 'soco', gen_gancho_punho: 'gancho_punho', gen_chute_baixo: 'chute_baixo', gen_combo_punho: 'combo_punho',
  gen_uppercut: 'uppercut', gen_guard_pose: 'guard_pose', gen_step_in: 'step_in',
  gen_kendo_kamae: 'kendo_kamae', gen_kendo_men: 'kendo_men', gen_kendo_kote: 'kendo_kote',
  gen_kendo_do: 'kendo_do', gen_kendo_tsuki: 'kendo_tsuki', gen_kendo_nuki: 'kendo_nuki',
  gen_combat_idle: 'combat_idle', gen_combat_jump: 'combat_jump',
};

function rig(boneNames) {
  const lower = new Map([...boneNames].map((n) => [n.toLowerCase(), n]));
  const find = (...names) => names.map((n) => lower.get(n.toLowerCase())).find(Boolean) || null;
  return {
    head: find('Head', 'AllHead'),
    body: find('UpperBody', 'Body'),
    rArm: find('RightArm'),
    lArm: find('LeftArm'),
    rFore: find('RightForeArm', 'RightLowerArm', 'RightArm2'),
    lFore: find('LeftForeArm', 'LeftLowerArm', 'LeftArm2'),
    rLeg: find('RightLeg'),
    lLeg: find('LeftLeg'),
    rShin: find('RightLowerLeg', 'RightShin', 'RightCalf', 'RightLeg2'),
    lShin: find('LeftLowerLeg', 'LeftShin', 'LeftCalf', 'LeftLeg2'),
  };
}

// 0 → 1 → 0 over the clip, for one-shot moves.
const arc = (p) => S(p / 2);
// 0 → 1 over the first part, then back to 0.
const windup = (p, at = 0.4) => (p < TAU * at ? p / (TAU * at) : 1 - (p - TAU * at) / (TAU * (1 - at)));
// [in the first part?, 0..1 progress inside that part].
const phase = (p, at) => (p < TAU * at ? [true, p / (TAU * at)] : [false, (p - TAU * at) / (TAU * (1 - at))]);

function build(r) {
  const defs = {
    // ---- basics (only used when the model lacks them) ----
    idle: [3, true, { head: (p) => [S(p) * 2, 0, 0], rArm: (p) => [0, 0, 3 + S(p) * 2], lArm: (p) => [0, 0, -3 - S(p) * 2], rFore: (p) => [-6 - S(p) * 2, 0, 0], lFore: (p) => [-6 - S(p) * 2, 0, 0] }],
    walk: [1, true, {
      rLeg: (p) => [S(p) * 35, 0, 0], lLeg: (p) => [-S(p) * 35, 0, 0],
      rShin: (p) => [Math.max(0, C(p)) * 35, 0, 0], lShin: (p) => [Math.max(0, -C(p)) * 35, 0, 0],
      rArm: (p) => [-S(p) * 30, 0, 2], lArm: (p) => [S(p) * 30, 0, -2], rFore: (p) => [-15 - Math.max(0, -S(p)) * 20, 0, 0], lFore: (p) => [-15 - Math.max(0, S(p)) * 20, 0, 0],
      head: (p) => [C(p * 2) * 2, 0, 0],
    }],
    run: [0.6, true, {
      body: [10, 0, 0], head: [-10, 0, 0],
      rLeg: (p) => [S(p) * 60, 0, 0], lLeg: (p) => [-S(p) * 60, 0, 0],
      rShin: (p) => [Math.max(0, C(p)) * 70, 0, 0], lShin: (p) => [Math.max(0, -C(p)) * 70, 0, 0],
      rArm: (p) => [-S(p) * 55, 0, 4], lArm: (p) => [S(p) * 55, 0, -4], rFore: [-70, 0, 0], lFore: [-70, 0, 0],
    }],
    sit: [2, true, { rLeg: [-90, 10, 0], lLeg: [-90, -10, 0], rShin: [70, 0, 0], lShin: [70, 0, 0], rArm: (p) => [-30 + S(p) * 3, 0, 5], lArm: (p) => [-30 - S(p) * 3, 0, -5], rFore: [-25, 0, 0], lFore: [-25, 0, 0], head: (p) => [S(p) * 3, 0, 0] }],
    sleep: [3, true, { rArm: [0, 0, 6], lArm: [0, 0, -6], rFore: [-40, 0, 0], lFore: [-40, 0, 0], rShin: [30, 0, 0], lShin: [30, 0, 0], body: (p) => [S(p) * 1.5, 0, 0], head: [0, 0, 8] }],
    climb: [0.8, true, { rArm: (p) => [-160 + S(p) * 20, 0, 0], lArm: (p) => [-160 - S(p) * 20, 0, 0], rFore: (p) => [-20 - S(p) * 20, 0, 0], lFore: (p) => [-20 + S(p) * 20, 0, 0], rLeg: (p) => [-30 + S(p) * 25, 0, 0], lLeg: (p) => [-30 - S(p) * 25, 0, 0], rShin: (p) => [30 - S(p) * 20, 0, 0], lShin: (p) => [30 + S(p) * 20, 0, 0] }],
    jump: [0.5, 'hold_on_last_frame', { rArm: [-150, 0, 10], lArm: [-150, 0, -10], rFore: [-20, 0, 0], lFore: [-20, 0, 0], rLeg: [-25, 0, 0], lLeg: [15, 0, 0], rShin: [40, 0, 0], lShin: [20, 0, 0] }],
    fall: [0.4, true, { rArm: (p) => [0, 0, 110 + S(p) * 25], lArm: (p) => [0, 0, -110 - S(p) * 25], rFore: (p) => [-20 + S(p) * 15, 0, 0], lFore: (p) => [-20 - S(p) * 15, 0, 0], rLeg: (p) => [S(p) * 20, 0, 0], lLeg: (p) => [-S(p) * 20, 0, 0], rShin: [25, 0, 0], lShin: [25, 0, 0] }],
    swing_hand: [0.4, false, { rArm: (p) => [-60 + C(p) * 60, 0, 0], rFore: (p) => [-30 * arc(p), 0, 0] }],
    use_mainhand: [0.6, false, { rArm: (p) => [-80 + S(p) * 10, -10, 0], rFore: (p) => [-20 - S(p) * 10, 0, 0] }],
    eat: [0.5, true, { rArm: (p) => [-70 + S(p) * 10, -20, 0], rFore: (p) => [-80 + S(p) * 15, 0, 0], head: (p) => [5 + S(p) * 4, 0, 0] }],
    attacked: [0.4, false, { body: (p) => [-8 * arc(p), 0, S(p) * 8], head: (p) => [-10, 0, S(p) * 6], rArm: (p) => [0, 0, 25 * arc(p)], lArm: (p) => [0, 0, -25 * arc(p)] }],
    // ---- extras (picked through GEN_ROLES) ----
    gen_aceno: [1.2, true, { rArm: (p) => [-150, 0, 15], rFore: (p) => [-25, 0, S(p) * 35], head: (p) => [0, 0, S(p) * 4] }],
    gen_danca: [1, true, {
      body: (p) => [0, S(p) * 15, 0], head: (p) => [0, S(p) * 20, S(p * 2) * 5],
      rArm: (p) => [-100 - S(p) * 60, 0, 10], lArm: (p) => [-100 + S(p) * 60, 0, -10], rFore: (p) => [-40 + S(p) * 30, 0, 0], lFore: (p) => [-40 - S(p) * 30, 0, 0],
      rLeg: (p) => [S(p) * 20, 0, 0], lLeg: (p) => [-S(p) * 20, 0, 0], rShin: (p) => [Math.max(0, S(p)) * 40, 0, 0], lShin: (p) => [Math.max(0, -S(p)) * 40, 0, 0],
    }],
    gen_triste: [2, true, { head: (p) => [25 + S(p) * 3, 0, 0], body: [8, 0, 0], rArm: [5, 0, 2], lArm: [5, 0, -2], rFore: [-10, 0, 0], lFore: [-10, 0, 0] }],
    gen_bravo: [0.8, true, { rArm: [-55, -30, 0], lArm: [-55, 30, 0], rFore: [-95, 0, 0], lFore: [-95, 0, 0], head: (p) => [-5, S(p) * 14, 0], body: (p) => [0, 0, S(p) * 2] }],
    gen_comemorar: [0.6, true, {
      rArm: (p) => [-170, 0, 20 + S(p) * 15], lArm: (p) => [-170, 0, -20 - S(p) * 15], rFore: (p) => [-30 - S(p) * 30, 0, 0], lFore: (p) => [-30 + S(p) * 30, 0, 0],
      rLeg: (p) => [S(p) * 15, 0, 0], lLeg: (p) => [-S(p) * 15, 0, 0], rShin: (p) => [20 + S(p) * 20, 0, 0], lShin: (p) => [20 - S(p) * 20, 0, 0],
    }],
    gen_rir: [0.5, true, { body: (p) => [S(p) * 5, 0, 0], head: (p) => [-15 + S(p) * 6, 0, 0], rArm: [-30, 20, 0], lArm: [-30, -20, 0], rFore: [-75, 0, 0], lFore: [-75, 0, 0] }],
    gen_medo: [0.5, true, { body: (p) => [-5, 0, S(p * 2) * 2], head: [12, 0, 0], rArm: (p) => [-110 + S(p * 2) * 4, 25, 0], lArm: (p) => [-110 - S(p * 2) * 4, -25, 0], rFore: [-60, 0, 0], lFore: [-60, 0, 0], rShin: [15, 0, 0], lShin: [15, 0, 0] }],
    gen_cantar: [1.4, true, { rArm: (p) => [-110 + S(p) * 8, -25, 0], rFore: (p) => [-50 + S(p) * 8, 0, 0], lArm: (p) => [-20 - S(p) * 30, 0, -20 - S(p) * 20], lFore: (p) => [-20 - S(p) * 20, 0, 0], head: (p) => [-10 + S(p) * 5, S(p) * 10, 0] }],
    // Leg goes back with the knee bent, then swings through straight and returns.
    gen_chutar: [0.6, false, {
      rLeg: (p) => { const [a, t] = phase(p, 0.35); return [a ? 30 * t : 30 * (1 - t) - 115 * S(t * Math.PI), 0, 0]; },
      rShin: (p) => { const [a, t] = phase(p, 0.35); return [a ? 50 * t : 50 * (1 - t) * (1 - S(t * Math.PI)), 0, 0]; },
      lArm: (p) => [-40 * arc(p), 0, -15], rArm: (p) => [30 * arc(p), 0, 15],
    }],
    gen_arremessar: [0.7, false, { rArm: (p) => [p < TAU * 0.45 ? -170 * (p / (TAU * 0.45)) : -170 + 130 * ((p - TAU * 0.45) / (TAU * 0.55)), 0, 0], rFore: (p) => [-70 * windup(p, 0.45), 0, 0], body: (p) => [p < TAU * 0.45 ? -8 * (p / (TAU * 0.45)) : 10 * arc(p), 0, 0] }],
    gen_pegar: [0.8, false, { body: (p) => [40 * arc(p), 0, 0], head: (p) => [10 * arc(p), 0, 0], rArm: (p) => [-50 * arc(p), 0, 5], lArm: (p) => [-50 * arc(p), 0, -5], rFore: (p) => [-20 * arc(p), 0, 0], lFore: (p) => [-20 * arc(p), 0, 0], rShin: (p) => [30 * arc(p), 0, 0], lShin: (p) => [30 * arc(p), 0, 0] }],
    gen_golpe: [0.45, false, { rArm: (p) => [-90 * Math.min(1, arc(p) * 1.4), -10, 0], rFore: (p) => [p < TAU * 0.4 ? -100 * windup(p, 0.4) : -100 * (1 - Math.min(1, (p - TAU * 0.4) / (TAU * 0.2))), 0, 0], lArm: [-30, 15, 0], lFore: [-80, 0, 0], body: (p) => [0, -15 * arc(p), 0] }],
    // ---- amateur martial arts ----
    gen_guard_pose: [1.2, true, {
      rArm: [-70, -25, 0], lArm: [-70, 25, 0], rFore: [-95, 0, 0], lFore: [-95, 0, 0],
      body: (p) => [4, S(p) * 4, 0], head: (p) => [-4, S(p) * 6, 0], rLeg: [8, 0, 6], lLeg: [-6, 0, -6],
    }],
    gen_soco: [0.5, false, {
      rArm: (p) => [-40 - 50 * Math.min(1, arc(p) * 1.6), -20, 0], rFore: (p) => [-40 - 50 * windup(p, 0.35), 0, 0],
      lArm: [-55, 20, 0], lFore: [-90, 0, 0], body: (p) => [0, -20 * arc(p), 0],
      rLeg: (p) => [10 * arc(p), 0, 0], lLeg: (p) => [-8 * arc(p), 0, 0],
    }],
    gen_gancho_punho: [0.55, false, {
      rArm: (p) => [-60 - 30 * arc(p), -40 + 70 * arc(p), 10], rFore: (p) => [-90 * windup(p, 0.4), 0, 0],
      lArm: [-40, 15, 0], body: (p) => [5, -35 * arc(p), 0], head: (p) => [0, -10 * arc(p), 0],
    }],
    gen_chute_baixo: [0.65, false, {
      rLeg: (p) => { const [a, t] = phase(p, 0.3); return [a ? 25 * t : 25 * (1 - t) - 90 * S(t * Math.PI), 0, 8]; },
      rShin: (p) => { const [a, t] = phase(p, 0.3); return [a ? 40 * t : 40 * (1 - t) * (1 - S(t * Math.PI)), 0, 0]; },
      lArm: (p) => [-50 * arc(p), 0, -12], rArm: (p) => [25 * arc(p), 0, 12], body: (p) => [0, 10 * arc(p), 0],
    }],
    gen_combo_punho: [0.85, false, {
      rArm: (p) => [-50 - 40 * S(p * 2), -15, 0], lArm: (p) => [-50 - 40 * S(p * 2 + 1.2), 15, 0],
      rFore: (p) => [-70 - 30 * S(p * 2), 0, 0], lFore: (p) => [-70 - 30 * S(p * 2 + 1.2), 0, 0],
      body: (p) => [0, -12 * S(p * 2), 0], rLeg: (p) => [8 * S(p), 0, 0], lLeg: (p) => [-8 * S(p), 0, 0],
    }],
    gen_uppercut: [0.55, false, {
      rArm: (p) => { const [a, t] = phase(p, 0.4); return [a ? -20 - 40 * t : -60 + 100 * t, -10, 0]; },
      rFore: (p) => [-100 * windup(p, 0.45), 0, 0], lArm: [-45, 20, 0], body: (p) => [-8 * arc(p), -10 * arc(p), 0],
      rLeg: (p) => [15 * arc(p), 0, 0], lShin: (p) => [20 * arc(p), 0, 0],
    }],
    gen_step_in: [0.7, false, {
      rLeg: (p) => [25 * arc(p), 0, 0], lLeg: (p) => [-20 * arc(p), 0, 0], rShin: (p) => [15 * arc(p), 0, 0],
      rArm: (p) => [-50 - 40 * Math.min(1, Math.max(0, (p / TAU - 0.35) * 2.5)), -15, 0],
      rFore: (p) => [-80 * Math.min(1, Math.max(0, (p / TAU - 0.35) * 2.5)), 0, 0],
      lArm: [-60, 20, 0], lFore: [-90, 0, 0], body: (p) => [5, -8 * arc(p), 0],
    }],
    // ---- kendô (cotovelos/joelhos bem dobrados) ----
    gen_combat_idle: [2.2, true, {
      rArm: (p) => [-62 + S(p * 2) * 2, -28, 12], rFore: (p) => [-78 - S(p * 2) * 4, 14, 0],
      lArm: (p) => [-58 - S(p * 2) * 2, 32, -10], lFore: (p) => [-92 + S(p * 2) * 4, -12, 0],
      body: (p) => [8 + S(p * 2), S(p) * 2.5, 0], head: (p) => [-4, 6 + S(p) * 2, 0],
      rLeg: [-8, 0, 10], lLeg: [-22, 0, -10], rShin: (p) => [38 + S(p * 2) * 3, 0, 0], lShin: (p) => [52 - S(p * 2) * 3, 0, 0],
    }],
    gen_combat_jump: [0.55, 'hold_on_last_frame', {
      rArm: [-98, -18, 16], lArm: [-92, 22, -14], rFore: [-70, 12, 0], lFore: [-88, -10, 0],
      body: [14, 0, 0], head: [-10, 4, 0], rLeg: [-62, 0, 8], lLeg: [-42, 0, -8], rShin: [88, 0, 0], lShin: [80, 0, 0],
    }],
    gen_kendo_kamae: [1.6, true, {
      rArm: (p) => [-62 + S(p) * 1.5, -28, 12], rFore: (p) => [-78 - S(p * 2) * 3, 14, 0],
      lArm: (p) => [-58 - S(p) * 1.5, 32, -10], lFore: (p) => [-92 + S(p * 2) * 3, -12, 0],
      body: (p) => [8 + S(p * 2), S(p) * 2.5, 0], head: (p) => [-4, 6 + S(p) * 2, 0],
      rLeg: [-8, 0, 10], lLeg: [-22, 0, -10], rShin: [38, 0, 0], lShin: [52, 0, 0],
    }],
    gen_kendo_men: [0.75, false, {
      rArm: (p) => { const [a, t] = phase(p, 0.38); return [a ? -62 - 93 * t : -155 + 113 * t, -28 + 10 * arc(p), 12]; },
      lArm: (p) => { const [a, t] = phase(p, 0.38); return [a ? -58 - 90 * t : -148 + 96 * t, 32 - 8 * arc(p), -10]; },
      rFore: (p) => [-78 - 20 * windup(p, 0.4), 14, 0], lFore: (p) => [-92 - 14 * windup(p, 0.4), -12, 0],
      body: (p) => [8 + 8 * arc(p), -8 * arc(p), 0], head: (p) => [-4 - 8 * windup(p, 0.4), 6, 0],
      rLeg: (p) => [-8 - 10 * arc(p), 0, 10], lLeg: (p) => [-22 - 8 * arc(p), 0, -10],
      rShin: (p) => [38 + 12 * arc(p), 0, 0], lShin: (p) => [52 + 10 * arc(p), 0, 0],
    }],
    gen_kendo_kote: [0.62, false, {
      rArm: (p) => [-62 + 14 * arc(p), -28 - 34 * arc(p), 12 + 10 * arc(p)],
      lArm: (p) => [-58 + 8 * arc(p), 32 - 20 * arc(p), -10 + 8 * arc(p)],
      rFore: (p) => [-78 - 12 * windup(p, 0.35), 10, 0], lFore: (p) => [-92 + 18 * arc(p), -10, 0],
      body: (p) => [8, -18 * arc(p), 0], rLeg: (p) => [-8 - 8 * arc(p), 0, 10], lLeg: (p) => [-22 - 6 * arc(p), 0, -10],
      rShin: (p) => [38 + 12 * arc(p), 0, 0], lShin: (p) => [52 + 8 * arc(p), 0, 0],
    }],
    gen_kendo_do: [0.68, false, {
      rArm: (p) => { const [a, t] = phase(p, 0.35); return [a ? -62 - 48 * t : -110 + 68 * t, -28 + 40 * arc(p), 12 + 28 * arc(p)]; },
      lArm: (p) => { const [a, t] = phase(p, 0.35); return [a ? -58 - 42 * t : -100 + 52 * t, 32, -10 - 16 * arc(p)]; },
      rFore: (p) => [-78 - 16 * windup(p, 0.4), 8, 0], lFore: (p) => [-92 - 10 * windup(p, 0.4), -12, 0],
      body: (p) => [8 + 4 * arc(p), -20 * arc(p), 12 * arc(p)], head: (p) => [-4 + 8 * arc(p), 0, 0],
      rLeg: (p) => [-8 - 6 * arc(p), 0, 10], lLeg: (p) => [-22 - 4 * arc(p), 0, -10],
      rShin: (p) => [38 + 10 * arc(p), 0, 0], lShin: (p) => [52 + 8 * arc(p), 0, 0],
    }],
    gen_kendo_tsuki: [0.58, false, {
      rArm: (p) => [-62 - 28 * Math.min(1, arc(p) * 1.4), -28 + 14 * arc(p), 12],
      lArm: (p) => [-58 - 28 * Math.min(1, arc(p) * 1.4), 32 - 12 * arc(p), -10],
      rFore: (p) => [-78 + 28 * arc(p), 12, 0], lFore: (p) => [-92 + 30 * arc(p), -10, 0],
      body: (p) => [8 + 10 * arc(p), 0, 0], rLeg: (p) => [-8 - 12 * arc(p), 0, 10], lLeg: (p) => [-22 - 10 * arc(p), 0, -10],
      rShin: (p) => [38 + 14 * arc(p), 0, 0], lShin: (p) => [52 + 12 * arc(p), 0, 0],
    }],
    gen_kendo_nuki: [0.82, false, {
      rArm: (p) => { const [a, t] = phase(p, 0.42); return [a ? -62 - 88 * t : -150 + 108 * t, -28, 12]; },
      lArm: (p) => { const [a, t] = phase(p, 0.42); return [a ? -58 - 84 * t : -142 + 90 * t, 32, -10]; },
      rFore: (p) => [-78 - 16 * windup(p, 0.45), 12, 0], lFore: (p) => [-92 - 12 * windup(p, 0.45), -10, 0],
      body: (p) => [8 + 6 * arc(p), -12 * arc(p), 0],
      rLeg: (p) => { const [a, t] = phase(p, 0.35); return [a ? -8 + 2 * t : -8 - 8 * t, a ? 12 * t : 12 * (1 - t), 10]; },
      lLeg: (p) => { const [a, t] = phase(p, 0.35); return [a ? -22 - 2 * t : -22 - 6 * t, a ? -10 * t : -10 * (1 - t), -10]; },
      rShin: (p) => [38 + 12 * arc(p), 0, 0], lShin: (p) => [52 + 10 * arc(p), 0, 0],
    }],
  };
  const out = {};
  for (const [name, [len, loop, parts]] of Object.entries(defs)) {
    const bones = {};
    for (const [key, f] of Object.entries(parts)) {
      const bone = r[key];
      if (!bone) continue;
      bones[bone] = { rotation: typeof f === 'function' ? kf(len, f) : { '0.0': f } };
    }
    // Arms and legs are the minimum for a clip to make sense.
    if (!Object.keys(bones).length || (!r.rArm && !r.rLeg)) continue;
    out[name] = { loop, animation_length: len, bones };
  }
  return out;
}

// Adds the missing clips to `clips` (Map name → AnimClip); returns the names added.
export function addGenerated(boneNames, clips) {
  const r = rig(boneNames);
  if (!r.rArm || !r.lArm) return [];
  const added = [];
  for (const [name, json] of Object.entries(build(r))) {
    const role = GEN_ROLES[name];
    // Skip if the model already has this gen clip or a baked clip named after the role.
    if (clips.has(name) || (role && clips.has(role))) continue;
    clips.set(name, new AnimClip(name, json));
    added.push(name);
  }
  return added;
}
