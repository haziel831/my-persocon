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
    if (clips.has(name)) continue;
    clips.set(name, new AnimClip(name, json));
    added.push(name);
  }
  return added;
}
