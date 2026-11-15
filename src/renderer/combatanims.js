// Close-combat animations for the Persocon (melee system).
//
// The rig is the Yes Steve Model / Bedrock one used by the Persocon models:
//   Root → AllBody → UpBody (torso) → AllHead → Head (+ Eyelids, HairBack)
//                                   → Arm → RightArm → RightForeArm → RightHandLocator
//                                          → LeftArm  → LeftForeArm  → LeftHandLocator
//                → DownBody → SkirtFront/SkirtBack, Leg → RightLeg → RightLowerLeg → RightFoot
//                                                      → LeftLeg  → LeftLowerLeg  → LeftFoot
//
// Axes (see model.js / animation.js): the model faces -Z (view.js turns it with YAW.front = PI).
// A channel is [pitch(x), yaw(y), roll(z)] in degrees and is applied as
//   final.x = rest.x - rx,  final.y = rest.y - ry,  final.z = rest.z + rz   (Euler ZYX)
// so, for this rig:
//   rx < 0  → a hanging limb swings FORWARD (-Z); the torso/head (content above the pivot) leans BACK
//   rx > 0  → a hanging limb swings BACK; the torso/head leans FORWARD (chin down)
//   ry > 0  → the torso turns to its RIGHT; a limb points to its own side (right arm out)
//   ry < 0  → the torso turns to its LEFT; the right arm points inward
//   rz > 0  → the right limb rolls outward (the left one inward)
//   position: y+ = up, z+ = BACKWARD (the character faces -Z), x- = the character's right
//
// The clips are generated procedurally (like genanims.js) so they work on any model with the
// standard bones, and the model's own file is never touched.
import { AnimClip } from './animation.js';

// ---------------------------------------------------------------- rig

function rig(boneNames) {
  const lower = new Map([...boneNames].map((n) => [n.toLowerCase(), n]));
  const find = (...names) => names.map((n) => lower.get(n.toLowerCase())).find(Boolean) || null;
  return {
    root: find('Root'),
    body: find('UpBody', 'UpperBody', 'Body', 'Torso'),
    head: find('Head', 'AllHead'),
    eyelids: find('Eyelids', 'EyeLids'),
    hip: find('Hips', 'Pelvis', 'Hip', 'Leg'),
    rArm: find('RightArm'),
    lArm: find('LeftArm'),
    rFore: find('RightForeArm', 'RightLowerArm', 'RightArm2'),
    lFore: find('LeftForeArm', 'LeftLowerArm', 'LeftArm2'),
    rLeg: find('RightLeg'),
    lLeg: find('LeftLeg'),
    rShin: find('RightLowerLeg', 'RightShin', 'RightCalf'),
    lShin: find('LeftLowerLeg', 'LeftShin', 'LeftCalf'),
  };
}
export { rig };

// ---------------------------------------------------------------- channels

// A channel from control points [time, value]: Catmull-Rom between them, so the motion is
// smooth and the extremes can snap (a punch overshoots a little at the hit frame).
const cr = (pts) => Object.fromEntries(pts.map(([t, v]) => {
  const a = v.map((n) => Math.round(n * 100) / 100);
  return [t.toFixed(3), { pre: a, post: a, lerp_mode: 'catmullrom' }];
}));
export { cr };

// A channel sampled from a function of the time (the looping idle: the ends must match).
const fn = (len, f, steps = 48) => Object.fromEntries(Array.from({ length: steps + 1 }, (_, i) => {
  const t = (len * i) / steps;
  return [t.toFixed(3), f(t).map((n) => Math.round(n * 100) / 100)];
}));

// ---------------------------------------------------------------- the set

// Neutral fighting stance (also the pose every attack starts and ends from).
const STANCE = {
  rootRot: [0, 0, 0],
  rootPos: [0, -0.55, 0],
  body: [10, -25, 0],
  head: [-6, 12, 0],
  rArm: [-62, -28, 12],
  rFore: [-78, 14, 0],
  lArm: [-58, 32, -10],
  lFore: [-92, -12, 0],
  rLeg: [-8, 0, 10],
  rShin: [38, 0, 0],
  lLeg: [-22, 0, -10],
  lShin: [52, 0, 0],
};

// The breathing loop of the fighting stance (1.2 s).
const idlePose = (p) => {
  const b = Math.sin(p);          // the breathing
  const b2 = Math.sin(p * 2);     // the micro sway
  return {
    rootPos: [0, -0.55 + b * 0.09, 0],
    rootRot: [0, 0, b * 0.5],
    body: [10 + b * 1.2, -25 + b2 * 1.6, 0],
    head: [-6 - b * 1.6, 12 - b2 * 1.2, 0],
    rArm: [-62 + b2 * 1.6, -28, 12 + b * 1.2],
    rFore: [-78 - b * 2, 14, 0],
    lArm: [-58 - b2 * 1.6, 32, -10 - b * 1.2],
    lFore: [-92 + b * 2, -12, 0],
    rLeg: [-8, 0, 10],
    rShin: [38 + b * 1.6, 0, 0],
    lLeg: [-22, 0, -10],
    lShin: [52 - b * 1.6, 0, 0],
  };
};

// Every clip: { loop, length, keys: { boneKey: [[t, value], ...] } }.
// The times are the real ones (the hit frames are exact keyframes).
export const COMBAT_CLIPS = {
  // Fighting stance: knees bent, torso bladed 25°, both hands up, breathing loop.
  combat_idle: { loop: true, length: 1.2, idle: true },

  // Light attack 1: fast left jab, the torso twists, a step forward. Hit at 0.12 s.
  attack_jab: {
    loop: false,
    length: 0.35,
    keys: {
      rootPos: [[0, STANCE.rootPos], [0.05, [0, -0.62, -0.4]], [0.12, [0, -0.46, -2.2]], [0.16, [0, -0.5, -1.8]], [0.35, STANCE.rootPos]],
      rootRot: [[0, STANCE.rootRot], [0.05, [0, 6, 0]], [0.12, [0, -3, 0]], [0.35, STANCE.rootRot]],
      body: [[0, STANCE.body], [0.05, [12, -31, 0]], [0.12, [14, -8, 0]], [0.16, [13, -14, 0]], [0.35, STANCE.body]],
      head: [[0, STANCE.head], [0.05, [-8, 15, 0]], [0.12, [-11, 6, 0]], [0.35, STANCE.head]],
      lArm: [[0, STANCE.lArm], [0.05, [-40, 40, -18]], [0.12, [-88, 14, -4]], [0.16, [-84, 16, -5]], [0.35, STANCE.lArm]],
      lFore: [[0, STANCE.lFore], [0.05, [-120, -16, 0]], [0.12, [-8, -4, 0]], [0.16, [-14, -6, 0]], [0.35, STANCE.lFore]],
      rArm: [[0, STANCE.rArm], [0.05, [-70, -24, 16]], [0.12, [-50, -34, 18]], [0.35, STANCE.rArm]],
      rFore: [[0, STANCE.rFore], [0.05, [-95, 12, 0]], [0.12, [-70, 16, 0]], [0.35, STANCE.rFore]],
      lLeg: [[0, STANCE.lLeg], [0.05, [-25, 0, -10]], [0.12, [-14, 0, -12]], [0.35, STANCE.lLeg]],
      lShin: [[0, STANCE.lShin], [0.05, [58, 0, 0]], [0.12, [40, 0, 0]], [0.35, STANCE.lShin]],
      rLeg: [[0, STANCE.rLeg], [0.05, [-6, 0, 10]], [0.12, [-14, 0, 12]], [0.35, STANCE.rLeg]],
      rShin: [[0, STANCE.rShin], [0.05, [42, 0, 0]], [0.12, [30, 0, 0]], [0.35, STANCE.rShin]],
    },
  },

  // Light attack 2: right cross with a full hip and shoulder rotation. Hit at 0.18 s.
  attack_cross: {
    loop: false,
    length: 0.45,
    keys: {
      rootPos: [[0, STANCE.rootPos], [0.07, [0, -0.7, -0.6]], [0.18, [0, -0.4, -3.2]], [0.22, [0, -0.5, -2.6]], [0.45, STANCE.rootPos]],
      rootRot: [[0, STANCE.rootRot], [0.07, [0, 12, 0]], [0.18, [0, -16, 0]], [0.22, [0, -8, 0]], [0.45, STANCE.rootRot]],
      body: [[0, STANCE.body], [0.07, [14, -4, 0]], [0.18, [16, -44, 0]], [0.22, [14, -30, 0]], [0.45, STANCE.body]],
      head: [[0, STANCE.head], [0.07, [-8, 16, 0]], [0.18, [-12, 4, 0]], [0.45, STANCE.head]],
      rArm: [[0, STANCE.rArm], [0.07, [-30, -44, 22]], [0.18, [-92, -8, 4]], [0.22, [-88, -12, 6]], [0.45, STANCE.rArm]],
      rFore: [[0, STANCE.rFore], [0.07, [-120, 20, 0]], [0.18, [-6, 4, 0]], [0.22, [-14, 8, 0]], [0.45, STANCE.rFore]],
      lArm: [[0, STANCE.lArm], [0.07, [-52, 40, -14]], [0.18, [-64, 26, -8]], [0.45, STANCE.lArm]],
      lFore: [[0, STANCE.lFore], [0.07, [-100, -16, 0]], [0.18, [-80, -10, 0]], [0.45, STANCE.lFore]],
      rLeg: [[0, STANCE.rLeg], [0.07, [-4, 0, 10]], [0.18, [-16, 0, 12]], [0.45, STANCE.rLeg]],
      rShin: [[0, STANCE.rShin], [0.07, [44, 0, 0]], [0.18, [26, 0, 0]], [0.45, STANCE.rShin]],
      lLeg: [[0, STANCE.lLeg], [0.07, [-28, 0, -10]], [0.18, [-12, 0, -12]], [0.45, STANCE.lLeg]],
      lShin: [[0, STANCE.lShin], [0.07, [60, 0, 0]], [0.18, [38, 0, 0]], [0.45, STANCE.lShin]],
    },
  },

  // Heavy attack / combo finisher: deep crouch, then an uppercut with a hop. Hit at 0.28 s.
  attack_uppercut: {
    loop: false,
    length: 0.65,
    keys: {
      rootPos: [[0, STANCE.rootPos], [0.18, [0, -3.2, -0.8]], [0.28, [0, 1.6, -2.6]], [0.36, [0, 0.6, -2.0]], [0.65, STANCE.rootPos]],
      rootRot: [[0, STANCE.rootRot], [0.18, [0, 14, 0]], [0.28, [0, -8, 0]], [0.36, [0, -4, 0]], [0.65, STANCE.rootRot]],
      body: [[0, STANCE.body], [0.18, [22, -6, 0]], [0.28, [-14, -40, 0]], [0.36, [-8, -32, 0]], [0.65, STANCE.body]],
      head: [[0, STANCE.head], [0.18, [4, 18, 0]], [0.28, [-18, 2, 0]], [0.36, [-12, 8, 0]], [0.65, STANCE.head]],
      rArm: [[0, STANCE.rArm], [0.18, [-8, -52, 26]], [0.28, [-124, -6, 6]], [0.36, [-116, -10, 8]], [0.65, STANCE.rArm]],
      rFore: [[0, STANCE.rFore], [0.18, [-110, 24, 0]], [0.28, [-42, 8, 0]], [0.36, [-52, 10, 0]], [0.65, STANCE.rFore]],
      lArm: [[0, STANCE.lArm], [0.18, [-46, 44, -16]], [0.28, [-72, 20, -6]], [0.36, [-64, 28, -8]], [0.65, STANCE.lArm]],
      lFore: [[0, STANCE.lFore], [0.18, [-104, -18, 0]], [0.28, [-70, -8, 0]], [0.36, [-84, -10, 0]], [0.65, STANCE.lFore]],
      rLeg: [[0, STANCE.rLeg], [0.18, [-38, 0, 14]], [0.28, [-6, 0, 10]], [0.36, [-12, 0, 10]], [0.65, STANCE.rLeg]],
      rShin: [[0, STANCE.rShin], [0.18, [86, 0, 0]], [0.28, [24, 0, 0]], [0.36, [30, 0, 0]], [0.65, STANCE.rShin]],
      lLeg: [[0, STANCE.lLeg], [0.18, [-46, 0, -14]], [0.28, [-10, 0, -10]], [0.36, [-16, 0, -10]], [0.65, STANCE.lLeg]],
      lShin: [[0, STANCE.lShin], [0.18, [92, 0, 0]], [0.28, [30, 0, 0]], [0.36, [38, 0, 0]], [0.65, STANCE.lShin]],
    },
  },

  // Roundhouse: the torso leans back while the right leg sweeps in a wide horizontal arc.
  // Hit at 0.25 s.
  attack_roundhouse_kick: {
    loop: false,
    length: 0.6,
    keys: {
      rootPos: [[0, STANCE.rootPos], [0.12, [0, -0.9, -0.4]], [0.25, [0, -0.35, -1.2]], [0.32, [0, -0.5, -0.8]], [0.6, STANCE.rootPos]],
      rootRot: [[0, STANCE.rootRot], [0.12, [0, -16, 0]], [0.25, [0, 20, 0]], [0.32, [0, 10, 0]], [0.6, STANCE.rootRot]],
      body: [[0, STANCE.body], [0.12, [6, -38, 0]], [0.25, [-24, -6, 0]], [0.32, [-18, -12, 0]], [0.6, STANCE.body]],
      head: [[0, STANCE.head], [0.12, [-4, 18, 0]], [0.25, [-16, 4, 0]], [0.32, [-12, 8, 0]], [0.6, STANCE.head]],
      hip: [[0, [0, 0, 0]], [0.12, [0, -14, 0]], [0.25, [0, 26, 0]], [0.32, [0, 12, 0]], [0.6, [0, 0, 0]]],
      rArm: [[0, STANCE.rArm], [0.12, [-40, -34, 26]], [0.25, [16, -14, 4]], [0.32, [6, -18, 6]], [0.6, STANCE.rArm]],
      rFore: [[0, STANCE.rFore], [0.12, [-96, 16, 0]], [0.25, [-50, 8, 0]], [0.32, [-62, 10, 0]], [0.6, STANCE.rFore]],
      lArm: [[0, STANCE.lArm], [0.12, [-70, 26, -4]], [0.25, [-40, 40, -40]], [0.32, [-48, 36, -26]], [0.6, STANCE.lArm]],
      lFore: [[0, STANCE.lFore], [0.12, [-104, -16, 0]], [0.25, [-70, -6, 0]], [0.32, [-82, -10, 0]], [0.6, STANCE.lFore]],
      rLeg: [[0, STANCE.rLeg], [0.12, [-46, 0, 16]], [0.25, [-80, -75, 18]], [0.32, [-62, -52, 16]], [0.6, STANCE.rLeg]],
      rShin: [[0, STANCE.rShin], [0.12, [92, 0, 0]], [0.25, [-6, 0, 0]], [0.32, [10, 0, 0]], [0.6, STANCE.rShin]],
      lLeg: [[0, STANCE.lLeg], [0.12, [-28, 0, -10]], [0.25, [-14, 0, -16]], [0.32, [-18, 0, -12]], [0.6, STANCE.lLeg]],
      lShin: [[0, STANCE.lShin], [0.12, [58, 0, 0]], [0.25, [30, 0, 0]], [0.32, [40, 0, 0]], [0.6, STANCE.lShin]],
    },
  },

  // Block: the arms crossed tight in front of the face, the head tucked, braced.
  combat_block: {
    loop: 'hold_on_last_frame',
    length: 0.16,
    keys: {
      rootPos: [[0, STANCE.rootPos], [0.16, [0, -1.2, 0]]],
      rootRot: [[0, STANCE.rootRot], [0.16, [0, 6, 0]]],
      body: [[0, STANCE.body], [0.16, [16, -16, 0]]],
      head: [[0, STANCE.head], [0.16, [14, 10, 0]]],
      rArm: [[0, STANCE.rArm], [0.16, [-96, -42, -10]]],
      rFore: [[0, STANCE.rFore], [0.16, [-118, -16, 0]]],
      lArm: [[0, STANCE.lArm], [0.16, [-92, 46, 10]]],
      lFore: [[0, STANCE.lFore], [0.16, [-124, 14, 0]]],
      rLeg: [[0, STANCE.rLeg], [0.16, [-14, 0, 14]]],
      rShin: [[0, STANCE.rShin], [0.16, [56, 0, 0]]],
      lLeg: [[0, STANCE.lLeg], [0.16, [-26, 0, -14]]],
      lShin: [[0, STANCE.lShin], [0.16, [64, 0, 0]]],
    },
  },

  // Dodge: a quick lateral hop with the center of gravity low.
  combat_dodge_step: {
    loop: false,
    length: 0.4,
    keys: {
      rootPos: [[0, STANCE.rootPos], [0.1, [0, -2.2, -0.6]], [0.18, [-3.5, -0.2, -1.4]], [0.28, [-1.4, -1.2, -0.4]], [0.4, STANCE.rootPos]],
      rootRot: [[0, STANCE.rootRot], [0.1, [0, 8, 0]], [0.18, [0, -10, 0]], [0.4, STANCE.rootRot]],
      body: [[0, STANCE.body], [0.1, [20, -18, 0]], [0.18, [14, -32, 0]], [0.4, STANCE.body]],
      head: [[0, STANCE.head], [0.1, [6, 16, 0]], [0.18, [-2, 8, 0]], [0.4, STANCE.head]],
      rArm: [[0, STANCE.rArm], [0.1, [-30, -34, 20]], [0.18, [-50, -24, 10]], [0.4, STANCE.rArm]],
      rFore: [[0, STANCE.rFore], [0.1, [-104, 18, 0]], [0.18, [-84, 12, 0]], [0.4, STANCE.rFore]],
      lArm: [[0, STANCE.lArm], [0.1, [-26, 38, -18]], [0.18, [-48, 28, -8]], [0.4, STANCE.lArm]],
      lFore: [[0, STANCE.lFore], [0.1, [-110, -16, 0]], [0.18, [-96, -10, 0]], [0.4, STANCE.lFore]],
      rLeg: [[0, STANCE.rLeg], [0.1, [-36, 0, 14]], [0.18, [-20, 0, 10]], [0.4, STANCE.rLeg]],
      rShin: [[0, STANCE.rShin], [0.1, [80, 0, 0]], [0.18, [46, 0, 0]], [0.4, STANCE.rShin]],
      lLeg: [[0, STANCE.lLeg], [0.1, [-44, 0, -14]], [0.18, [-16, 0, -10]], [0.4, STANCE.lLeg]],
      lShin: [[0, STANCE.lShin], [0.1, [88, 0, 0]], [0.18, [40, 0, 0]], [0.4, STANCE.lShin]],
    },
  },

  // Heavy hook: a wide wind-up (the torso rotates away, the shoulder drops) and then an
  // explosive hook across the body. Hit at 0.34 s.
  attack_hook: {
    loop: false,
    length: 0.72,
    keys: {
      rootPos: [[0, STANCE.rootPos], [0.16, [0, -0.55, -0.3]], [0.34, [0, -0.45, -1.9]], [0.42, [0, -0.55, -1.5]], [0.72, STANCE.rootPos]],
      rootRot: [[0, STANCE.rootRot], [0.16, [0, 18, 0]], [0.34, [0, -22, 0]], [0.42, [0, -12, 0]], [0.72, STANCE.rootRot]],
      body: [[0, STANCE.body], [0.16, [14, 22, 0]], [0.34, [18, -36, 0]], [0.42, [15, -24, 0]], [0.72, STANCE.body]],
      head: [[0, STANCE.head], [0.16, [-4, 22, 0]], [0.34, [-12, 2, 0]], [0.42, [-8, 6, 0]], [0.72, STANCE.head]],
      rArm: [[0, STANCE.rArm], [0.16, [-18, -62, 34]], [0.34, [-98, -10, 4]], [0.42, [-92, -14, 6]], [0.72, STANCE.rArm]],
      rFore: [[0, STANCE.rFore], [0.16, [-122, 28, 0]], [0.34, [-10, 6, 0]], [0.42, [-18, 8, 0]], [0.72, STANCE.rFore]],
      lArm: [[0, STANCE.lArm], [0.16, [-52, 46, -16]], [0.34, [-64, 32, -10]], [0.72, STANCE.lArm]],
      lFore: [[0, STANCE.lFore], [0.16, [-106, -18, 0]], [0.34, [-76, -12, 0]], [0.72, STANCE.lFore]],
      rLeg: [[0, STANCE.rLeg], [0.16, [-6, 0, 12]], [0.34, [-20, 0, 14]], [0.72, STANCE.rLeg]],
      rShin: [[0, STANCE.rShin], [0.16, [42, 0, 0]], [0.34, [24, 0, 0]], [0.72, STANCE.rShin]],
      lLeg: [[0, STANCE.lLeg], [0.16, [-28, 0, -10]], [0.34, [-12, 0, -12]], [0.72, STANCE.lLeg]],
      lShin: [[0, STANCE.lShin], [0.16, [60, 0, 0]], [0.34, [36, 0, 0]], [0.72, STANCE.lShin]],
    },
  },

  // High kick: she pivots on one leg, leans the torso back for balance and extends the
  // kicking leg high toward the target's head. Hit at 0.3 s.
  attack_high_kick: {
    loop: false,
    length: 0.66,
    keys: {
      rootPos: [[0, STANCE.rootPos], [0.12, [0, -0.85, -0.3]], [0.3, [0, -0.3, -1.3]], [0.38, [0, -0.5, -0.9]], [0.66, STANCE.rootPos]],
      rootRot: [[0, STANCE.rootRot], [0.12, [0, -20, 0]], [0.3, [0, 26, 0]], [0.38, [0, 14, 0]], [0.66, STANCE.rootRot]],
      body: [[0, STANCE.body], [0.12, [6, -36, 0]], [0.3, [-30, -2, 0]], [0.38, [-22, -8, 0]], [0.66, STANCE.body]],
      head: [[0, STANCE.head], [0.12, [-2, 20, 0]], [0.3, [-22, 2, 0]], [0.38, [-16, 6, 0]], [0.66, STANCE.head]],
      hip: [[0, [0, 0, 0]], [0.12, [0, -18, 0]], [0.3, [0, 30, 0]], [0.38, [0, 16, 0]], [0.66, [0, 0, 0]]],
      rArm: [[0, STANCE.rArm], [0.12, [-40, -36, 26]], [0.3, [24, -14, 58]], [0.38, [10, -20, 44]], [0.66, STANCE.rArm]],
      rFore: [[0, STANCE.rFore], [0.12, [-100, 16, 0]], [0.3, [-40, 8, 0]], [0.66, STANCE.rFore]],
      lArm: [[0, STANCE.lArm], [0.12, [-72, 34, -14]], [0.3, [-44, 46, -50]], [0.38, [-52, 40, -38]], [0.66, STANCE.lArm]],
      lFore: [[0, STANCE.lFore], [0.12, [-110, -16, 0]], [0.3, [-62, -6, 0]], [0.66, STANCE.lFore]],
      rLeg: [[0, STANCE.rLeg], [0.12, [-44, 0, 16]], [0.3, [-88, -10, 22]], [0.38, [-70, -8, 20]], [0.66, STANCE.rLeg]],
      rShin: [[0, STANCE.rShin], [0.12, [92, 0, 0]], [0.3, [2, 0, 0]], [0.38, [18, 0, 0]], [0.66, STANCE.rShin]],
      lLeg: [[0, STANCE.lLeg], [0.12, [-8, 0, -12]], [0.3, [-2, 0, -16]], [0.38, [-6, 0, -14]], [0.66, STANCE.lLeg]],
      lShin: [[0, STANCE.lShin], [0.12, [14, 0, 0]], [0.3, [6, 0, 0]], [0.66, STANCE.lShin]],
    },
  },

  // Dropkick / meteoro: she crouches, jumps, extends both legs forward in the air and
  // lands on the feet. Hit at 0.52 s.
  attack_dropkick: {
    loop: false,
    length: 0.9,
    keys: {
      rootPos: [[0, STANCE.rootPos], [0.14, [0, -2.6, -0.4]], [0.3, [0, 2.2, -1.6]], [0.52, [0, 1.6, -3.4]], [0.66, [0, -1.4, -2.0]], [0.9, STANCE.rootPos]],
      rootRot: [[0, STANCE.rootRot], [0.14, [0, 12, 0]], [0.3, [0, 4, 0]], [0.52, [0, -8, 0]], [0.66, [0, 0, 0]], [0.9, STANCE.rootRot]],
      body: [[0, STANCE.body], [0.14, [24, 0, 0]], [0.3, [-10, 0, 0]], [0.52, [-16, 0, 0]], [0.66, [22, 0, 0]], [0.9, STANCE.body]],
      head: [[0, STANCE.head], [0.14, [12, 0, 0]], [0.3, [-14, 0, 0]], [0.52, [-18, 0, 0]], [0.66, [14, 0, 0]], [0.9, STANCE.head]],
      rArm: [[0, STANCE.rArm], [0.14, [-30, -30, 40]], [0.3, [-40, -24, 52]], [0.52, [-30, -20, 60]], [0.66, [-20, -14, 30]], [0.9, STANCE.rArm]],
      rFore: [[0, STANCE.rFore], [0.14, [-100, 10, 0]], [0.3, [-70, 8, 0]], [0.52, [-50, 6, 0]], [0.9, STANCE.rFore]],
      lArm: [[0, STANCE.lArm], [0.14, [-30, 30, -40]], [0.3, [-40, 24, -52]], [0.52, [-30, 20, -60]], [0.66, [-20, 14, -30]], [0.9, STANCE.lArm]],
      lFore: [[0, STANCE.lFore], [0.14, [-100, -10, 0]], [0.3, [-70, -8, 0]], [0.52, [-50, -6, 0]], [0.9, STANCE.lFore]],
      rLeg: [[0, STANCE.rLeg], [0.14, [-40, 0, 14]], [0.3, [-86, 0, 10]], [0.52, [-98, 0, 12]], [0.66, [-46, 0, 12]], [0.9, STANCE.rLeg]],
      rShin: [[0, STANCE.rShin], [0.14, [88, 0, 0]], [0.3, [10, 0, 0]], [0.52, [-8, 0, 0]], [0.66, [64, 0, 0]], [0.9, STANCE.rShin]],
      lLeg: [[0, STANCE.lLeg], [0.14, [-46, 0, -14]], [0.3, [-86, 0, -10]], [0.52, [-98, 0, -12]], [0.66, [-46, 0, -12]], [0.9, STANCE.lLeg]],
      lShin: [[0, STANCE.lShin], [0.14, [92, 0, 0]], [0.3, [10, 0, 0]], [0.52, [-8, 0, 0]], [0.66, [64, 0, 0]], [0.9, STANCE.lShin]],
    },
  },

  // Fury special: a wide stance with both arms pulled back, vibrating with energy, and
  // then a two-handed forward thrust. Hit at 0.62 s.
  cast_special: {
    loop: false,
    length: 0.85,
    keys: {
      rootPos: [[0, STANCE.rootPos], [0.18, [0, -1.4, 0]], [0.45, [0, -1.5, 0]], [0.62, [0, -0.4, -1.4]], [0.85, STANCE.rootPos]],
      rootRot: [[0, STANCE.rootRot], [0.18, [0, 8, 0]], [0.45, [0, 6, 0]], [0.62, [0, -8, 0]], [0.85, STANCE.rootRot]],
      body: [[0, STANCE.body], [0.18, [6, 6, 0]], [0.3, [9, 4, 0]], [0.45, [8, 5, 0]], [0.62, [14, -14, 0]], [0.85, STANCE.body]],
      head: [[0, STANCE.head], [0.18, [-10, 14, 0]], [0.3, [-13, 12, 0]], [0.45, [-12, 13, 0]], [0.62, [-6, 2, 0]], [0.85, STANCE.head]],
      rArm: [[0, STANCE.rArm], [0.18, [-6, -46, 34]], [0.3, [-150, -34, 42]], [0.38, [-154, -30, 46]], [0.45, [-150, -34, 42]], [0.62, [-98, -16, 8]], [0.85, STANCE.rArm]],
      rFore: [[0, STANCE.rFore], [0.18, [-64, 18, 0]], [0.3, [-38, 14, 0]], [0.45, [-38, 14, 0]], [0.62, [-10, 6, 0]], [0.85, STANCE.rFore]],
      lArm: [[0, STANCE.lArm], [0.18, [-6, 46, -34]], [0.3, [-150, 34, -42]], [0.38, [-154, 30, -46]], [0.45, [-150, 34, -42]], [0.62, [-98, 16, -8]], [0.85, STANCE.lArm]],
      lFore: [[0, STANCE.lFore], [0.18, [-64, -18, 0]], [0.3, [-38, -14, 0]], [0.45, [-38, -14, 0]], [0.62, [-10, -6, 0]], [0.85, STANCE.lFore]],
      rLeg: [[0, STANCE.rLeg], [0.18, [-24, 0, 20]], [0.45, [-24, 0, 20]], [0.62, [-8, 0, 14]], [0.85, STANCE.rLeg]],
      rShin: [[0, STANCE.rShin], [0.18, [62, 0, 0]], [0.45, [62, 0, 0]], [0.62, [30, 0, 0]], [0.85, STANCE.rShin]],
      lLeg: [[0, STANCE.lLeg], [0.18, [-24, 0, -20]], [0.45, [-24, 0, -20]], [0.62, [-8, 0, -14]], [0.85, STANCE.lLeg]],
      lShin: [[0, STANCE.lShin], [0.18, [68, 0, 0]], [0.45, [68, 0, 0]], [0.62, [34, 0, 0]], [0.85, STANCE.lShin]],
    },
  },

  // Hit reaction: the head and torso snap back, the arms flail, then she settles.
  combat_hit_stagger: {
    loop: false,
    length: 0.45,
    keys: {
      rootPos: [[0, STANCE.rootPos], [0.09, [0, -0.35, 2.6]], [0.18, [0, -0.7, 1.4]], [0.45, STANCE.rootPos]],
      rootRot: [[0, STANCE.rootRot], [0.09, [0, -14, 6]], [0.18, [0, -6, 2]], [0.45, STANCE.rootRot]],
      body: [[0, STANCE.body], [0.09, [-22, -10, 8]], [0.18, [-6, -20, 3]], [0.45, STANCE.body]],
      head: [[0, STANCE.head], [0.09, [-30, 4, -6]], [0.18, [-14, 10, 0]], [0.45, STANCE.head]],
      eyelids: { position: [[0, [0, 0, 0]], [0.05, [0, 0, -0.16]], [0.3, [0, 0, -0.16]], [0.4, [0, 0, 0]]] },
      rArm: [[0, STANCE.rArm], [0.09, [10, -8, 44]], [0.18, [-20, -18, 30]], [0.45, STANCE.rArm]],
      rFore: [[0, STANCE.rFore], [0.09, [-30, 26, 0]], [0.18, [-58, 18, 0]], [0.45, STANCE.rFore]],
      lArm: [[0, STANCE.lArm], [0.09, [6, 10, -40]], [0.18, [-24, 20, -28]], [0.45, STANCE.lArm]],
      lFore: [[0, STANCE.lFore], [0.09, [-26, -30, 0]], [0.18, [-64, -18, 0]], [0.45, STANCE.lFore]],
      rLeg: [[0, STANCE.rLeg], [0.09, [12, 0, 14]], [0.18, [0, 0, 12]], [0.45, STANCE.rLeg]],
      rShin: [[0, STANCE.rShin], [0.09, [58, 0, 0]], [0.18, [46, 0, 0]], [0.45, STANCE.rShin]],
      lLeg: [[0, STANCE.lLeg], [0.09, [-4, 0, -14]], [0.18, [-14, 0, -12]], [0.45, STANCE.lLeg]],
      lShin: [[0, STANCE.lShin], [0.09, [64, 0, 0]], [0.18, [56, 0, 0]], [0.45, STANCE.lShin]],
    },
  },
};

// ---------------------------------------------------------------- metadata

// durationMs: how long the clip lasts. hitFrameMs: when the hit lands (VFX/SFX).
// comboWindowMs: the window in which the next attack of the chain may start.
export const COMBAT_META = {
  combat_idle: { kind: 'idle', durationMs: 1200, hitFrameMs: null, comboWindowMs: null },
  attack_jab: { kind: 'attack', durationMs: 350, hitFrameMs: 120, comboWindowMs: { from: 130, to: 330 }, next: 'attack_cross' },
  attack_cross: { kind: 'attack', durationMs: 450, hitFrameMs: 180, comboWindowMs: { from: 200, to: 430 }, next: 'attack_uppercut' },
  attack_uppercut: { kind: 'attack', durationMs: 650, hitFrameMs: 280, comboWindowMs: { from: 300, to: 620 }, next: null },
  attack_roundhouse_kick: { kind: 'attack', durationMs: 600, hitFrameMs: 250, comboWindowMs: null, next: null },
  attack_hook: { kind: 'attack', durationMs: 720, hitFrameMs: 340, comboWindowMs: null, next: null },
  attack_high_kick: { kind: 'attack', durationMs: 660, hitFrameMs: 300, comboWindowMs: null, next: null },
  attack_dropkick: { kind: 'attack', durationMs: 900, hitFrameMs: 520, comboWindowMs: null, next: null },
  // cast_special already brings its own charge inside the clip (see melee.startCharge).
  cast_special: { kind: 'attack', durationMs: 850, hitFrameMs: 620, comboWindowMs: null, next: null, charge: true },
  combat_block: { kind: 'defense', durationMs: 160, hitFrameMs: null, comboWindowMs: null },
  combat_dodge_step: { kind: 'defense', durationMs: 400, hitFrameMs: null, comboWindowMs: null },
  combat_hit_stagger: { kind: 'stagger', durationMs: 450, hitFrameMs: null, comboWindowMs: null },
};

export const COMBAT_ANIM_NAMES = Object.keys(COMBAT_META);
// The attacks in chain order (jab → cross → uppercut).
export const COMBAT_CHAIN = ['attack_jab', 'attack_cross', 'attack_uppercut'];

// ---------------------------------------------------------------- builder

const TAU = Math.PI * 2;

function buildClip(def, r) {
  const bones = {};
  if (def.idle) {
    // The breathing loop: every bone sampled from the pose function (the phase goes 0..2π).
    for (const [key, bone] of Object.entries(r)) {
      if (!bone || key === 'eyelids') continue;
      if (key === 'root') {
        bones[bone] = {
          rotation: fn(def.length, (t) => idlePose((t / def.length) * TAU).rootRot),
          position: fn(def.length, (t) => idlePose((t / def.length) * TAU).rootPos),
        };
        continue;
      }
      if (!(key in idlePose(0))) continue;
      bones[bone] = { rotation: fn(def.length, (t) => idlePose((t / def.length) * TAU)[key]) };
    }
    return { loop: true, animation_length: def.length, bones };
  }
  for (const [key, bone] of Object.entries(r)) {
    if (!bone) continue;
    // The Root carries both a rotation and a position channel.
    if (key === 'root') {
      const rot = def.keys.rootRot;
      const pos = def.keys.rootPos;
      if (!rot && !pos) continue;
      bones[bone] = {};
      if (rot) bones[bone].rotation = cr(rot);
      if (pos) bones[bone].position = cr(pos);
      continue;
    }
    const spec = def.keys[key];
    if (!spec) continue;
    if (Array.isArray(spec)) bones[bone] = { rotation: cr(spec) };
    else if (spec.position) bones[bone] = { position: cr(spec.position) };
  }
  return { loop: def.loop, animation_length: def.length, bones };
}

// Adds the combat clips to the animator (overriding a clip with the same name).
// Returns the names registered.
export { buildClip };
export function addCombatClips(boneNames, clips) {
  const r = rig(boneNames);
  if (!r.rArm && !r.lArm) return [];
  const added = [];
  for (const [name, def] of Object.entries(COMBAT_CLIPS)) {
    const json = buildClip(def, r);
    if (!Object.keys(json.bones).length) continue;
    clips.set(name, new AnimClip(name, json));
    added.push(name);
  }
  return added;
}
