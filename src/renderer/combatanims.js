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
      lArm: [[0, STANCE.lArm], [0.05, [-40, 40, -18]], [0.12, [-108, 14, -4]], [0.16, [-98, 16, -5]], [0.35, STANCE.lArm]],
      lFore: [[0, STANCE.lFore], [0.05, [-120, -16, 0]], [0.12, [-20, -4, 0]], [0.16, [-22, -6, 0]], [0.35, STANCE.lFore]],
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
      rArm: [[0, STANCE.rArm], [0.07, [-30, -44, 22]], [0.18, [-115, -8, 4]], [0.22, [-105, -12, 6]], [0.45, STANCE.rArm]],
      rFore: [[0, STANCE.rFore], [0.07, [-120, 20, 0]], [0.18, [-18, 4, 0]], [0.22, [-22, 8, 0]], [0.45, STANCE.rFore]],
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
      rArm: [[0, STANCE.rArm], [0.18, [-8, -52, 26]], [0.28, [-150, -6, 6]], [0.36, [-135, -10, 8]], [0.65, STANCE.rArm]],
      rFore: [[0, STANCE.rFore], [0.18, [-110, 24, 0]], [0.28, [-55, 8, 0]], [0.36, [-65, 10, 0]], [0.65, STANCE.rFore]],
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

  // Dash to the target: the torso leans forward, the knees bend and the arms trail behind
  // her. The clip is a glide (the x is moved by melee.js); it loops while she runs.
  dash_forward: {
    loop: false,
    length: 0.3,
    keys: {
      rootPos: [[0, STANCE.rootPos], [0.08, [0, -1.15, -0.6]], [0.2, [0, -0.9, -0.9]], [0.3, STANCE.rootPos]],
      rootRot: [[0, STANCE.rootRot], [0.08, [0, -6, 0]], [0.2, [0, -4, 0]], [0.3, STANCE.rootRot]],
      body: [[0, STANCE.body], [0.08, [26, -18, 0]], [0.2, [22, -14, 0]], [0.3, STANCE.body]],
      head: [[0, STANCE.head], [0.08, [-4, 6, 0]], [0.2, [-2, 8, 0]], [0.3, STANCE.head]],
      rArm: [[0, STANCE.rArm], [0.08, [26, -34, 20]], [0.2, [34, -30, 24]], [0.3, STANCE.rArm]],
      rFore: [[0, STANCE.rFore], [0.08, [-46, 10, 0]], [0.2, [-52, 12, 0]], [0.3, STANCE.rFore]],
      lArm: [[0, STANCE.lArm], [0.08, [26, 36, -18]], [0.2, [34, 32, -22]], [0.3, STANCE.lArm]],
      lFore: [[0, STANCE.lFore], [0.08, [-52, -10, 0]], [0.2, [-58, -12, 0]], [0.3, STANCE.lFore]],
      rLeg: [[0, STANCE.rLeg], [0.08, [-26, 0, 12]], [0.2, [6, 0, 12]], [0.3, STANCE.rLeg]],
      rShin: [[0, STANCE.rShin], [0.08, [56, 0, 0]], [0.2, [22, 0, 0]], [0.3, STANCE.rShin]],
      lLeg: [[0, STANCE.lLeg], [0.08, [16, 0, -10]], [0.2, [-30, 0, -12]], [0.3, STANCE.lLeg]],
      lShin: [[0, STANCE.lShin], [0.08, [38, 0, 0]], [0.2, [66, 0, 0]], [0.3, STANCE.lShin]],
    },
  },

  // Dash back to the formation: she leans back, the front leg pushes off and the arms
  // open for balance (never a fall).
  dash_backward: {
    loop: false,
    length: 0.28,
    keys: {
      rootPos: [[0, STANCE.rootPos], [0.07, [0, -0.95, 0.5]], [0.18, [0, -0.75, 0.7]], [0.28, STANCE.rootPos]],
      rootRot: [[0, STANCE.rootRot], [0.07, [0, 6, 0]], [0.28, STANCE.rootRot]],
      body: [[0, STANCE.body], [0.07, [-12, -30, 0]], [0.18, [-6, -26, 0]], [0.28, STANCE.body]],
      head: [[0, STANCE.head], [0.07, [-14, 12, 0]], [0.18, [-8, 12, 0]], [0.28, STANCE.head]],
      rArm: [[0, STANCE.rArm], [0.07, [-46, -44, 30]], [0.18, [-38, -40, 26]], [0.28, STANCE.rArm]],
      rFore: [[0, STANCE.rFore], [0.07, [-58, 18, 0]], [0.28, STANCE.rFore]],
      lArm: [[0, STANCE.lArm], [0.07, [-42, 46, -28]], [0.18, [-34, 42, -24]], [0.28, STANCE.lArm]],
      lFore: [[0, STANCE.lFore], [0.07, [-64, -14, 0]], [0.28, STANCE.lFore]],
      rLeg: [[0, STANCE.rLeg], [0.07, [-30, 0, 12]], [0.18, [-42, 0, 12]], [0.28, STANCE.rLeg]],
      rShin: [[0, STANCE.rShin], [0.07, [52, 0, 0]], [0.18, [26, 0, 0]], [0.28, STANCE.rShin]],
      lLeg: [[0, STANCE.lLeg], [0.07, [-10, 0, -12]], [0.18, [4, 0, -12]], [0.28, STANCE.lLeg]],
      lShin: [[0, STANCE.lShin], [0.07, [40, 0, 0]], [0.18, [70, 0, 0]], [0.28, STANCE.lShin]],
    },
  },

  // Dodge: a lightning backstep/side sway with a low center of gravity; she snaps back
  // to the guard right after (melee.js moves the x and fades her to 0.7).
  dodge: {
    loop: false,
    length: 0.34,
    keys: {
      rootPos: [[0, STANCE.rootPos], [0.06, [0, -1.6, 0.7]], [0.14, [-2.4, -0.7, 0.5]], [0.24, [-1.2, -1.0, 0.2]], [0.34, STANCE.rootPos]],
      rootRot: [[0, STANCE.rootRot], [0.06, [0, -12, 4]], [0.14, [0, -20, 8]], [0.34, STANCE.rootRot]],
      body: [[0, STANCE.body], [0.06, [14, -6, -10]], [0.14, [4, 2, -16]], [0.34, STANCE.body]],
      head: [[0, STANCE.head], [0.06, [-6, 4, 6]], [0.14, [-12, 0, 10]], [0.34, STANCE.head]],
      rArm: [[0, STANCE.rArm], [0.06, [-40, -40, 26]], [0.14, [-56, -30, 18]], [0.34, STANCE.rArm]],
      rFore: [[0, STANCE.rFore], [0.06, [-96, 12, 0]], [0.34, STANCE.rFore]],
      lArm: [[0, STANCE.lArm], [0.06, [-34, 44, -22]], [0.14, [-50, 36, -14]], [0.34, STANCE.lArm]],
      lFore: [[0, STANCE.lFore], [0.06, [-104, -12, 0]], [0.34, STANCE.lFore]],
      rLeg: [[0, STANCE.rLeg], [0.06, [-34, 0, 14]], [0.14, [-16, 0, 16]], [0.34, STANCE.rLeg]],
      rShin: [[0, STANCE.rShin], [0.06, [72, 0, 0]], [0.14, [40, 0, 0]], [0.34, STANCE.rShin]],
      lLeg: [[0, STANCE.lLeg], [0.06, [-40, 0, -14]], [0.14, [-24, 0, -16]], [0.34, STANCE.lLeg]],
      lShin: [[0, STANCE.lShin], [0.06, [84, 0, 0]], [0.14, [52, 0, 0]], [0.34, STANCE.lShin]],
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
      rArm: [[0, STANCE.rArm], [0.16, [-18, -62, 34]], [0.34, [-120, -10, 4]], [0.42, [-110, -14, 6]], [0.72, STANCE.rArm]],
      rFore: [[0, STANCE.rFore], [0.16, [-122, 28, 0]], [0.34, [-22, 6, 0]], [0.42, [-28, 8, 0]], [0.72, STANCE.rFore]],
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

  // ---------------------------------------------------------------- manobras especiais
  // Golpe Quebra-Guarda (Nv1): stance larga, os dois braços sobem (guarda alta) e ela
  // desce um martelo duplo em cima do alvo. Hit em 0,52 s.
  special_breaker: {
    loop: false,
    length: 0.95,
    keys: {
      rootPos: [[0, STANCE.rootPos], [0.14, [0, -0.95, 0.35]], [0.3, [0, -0.8, 0.25]], [0.46, [0, -0.55, -2.5]], [0.58, [0, -0.95, -2.1]], [0.95, STANCE.rootPos]],
      rootRot: [[0, STANCE.rootRot], [0.14, [0, 10, 0]], [0.3, [0, 8, 0]], [0.46, [0, -10, 0]], [0.95, STANCE.rootRot]],
      body: [[0, STANCE.body], [0.14, [-10, -18, 0]], [0.3, [-12, -16, 0]], [0.46, [28, -4, 0]], [0.58, [20, -10, 0]], [0.95, STANCE.body]],
      head: [[0, STANCE.head], [0.14, [-18, 10, 0]], [0.3, [-20, 8, 0]], [0.46, [16, 2, 0]], [0.58, [10, 6, 0]], [0.95, STANCE.head]],
      rArm: [[0, STANCE.rArm], [0.14, [-168, -26, 22]], [0.3, [-172, -24, 24]], [0.46, [-24, -16, 6]], [0.58, [-36, -20, 8]], [0.95, STANCE.rArm]],
      rFore: [[0, STANCE.rFore], [0.14, [-22, 12, 0]], [0.3, [-20, 12, 0]], [0.46, [-8, 8, 0]], [0.95, STANCE.rFore]],
      lArm: [[0, STANCE.lArm], [0.14, [-168, 26, -22]], [0.3, [-172, 24, -24]], [0.46, [-24, 16, -6]], [0.58, [-36, 20, -8]], [0.95, STANCE.lArm]],
      lFore: [[0, STANCE.lFore], [0.14, [-22, -12, 0]], [0.3, [-20, -12, 0]], [0.46, [-8, -8, 0]], [0.95, STANCE.lFore]],
      rLeg: [[0, STANCE.rLeg], [0.14, [-10, 0, 18]], [0.46, [-6, 0, 16]], [0.95, STANCE.rLeg]],
      rShin: [[0, STANCE.rShin], [0.14, [58, 0, 0]], [0.46, [44, 0, 0]], [0.95, STANCE.rShin]],
      lLeg: [[0, STANCE.lLeg], [0.14, [-20, 0, -18]], [0.46, [-16, 0, -16]], [0.95, STANCE.lLeg]],
      lShin: [[0, STANCE.lShin], [0.14, [66, 0, 0]], [0.46, [50, 0, 0]], [0.95, STANCE.lShin]],
    },
  },

  // Punho Relâmpago (Nv2) / despertar da Fúria: pés firmes afastados, punhos fechados, os
  // braços descem e vão para trás, as costas arqueiam e o queixo sobe num RUGIDO dourado.
  // Em seguida: rajada de investidas curtas com três golpes alternados. Hit em 1,00 s.
  special_awakening: {
    loop: false,
    length: 1.6,
    keys: {
      rootPos: [[0, STANCE.rootPos], [0.15, [0, -1.0, 0.1]], [0.32, [0, -0.85, 0.15]], [0.44, [0, -0.9, 0.12]], [0.5, [0, -0.82, 0.1]], [0.6, [0, -0.6, -0.8]], [0.7, [0, -0.55, -1.8]], [0.8, [0, -0.6, -1.0]], [0.9, [0, -0.52, -1.9]], [1.0, [0, -0.6, -1.1]], [1.1, [0, -0.3, -2.0]], [1.24, [0, -0.7, -1.2]], [1.6, STANCE.rootPos]],
      rootRot: [[0, STANCE.rootRot], [0.32, [0, 4, 0]], [0.6, [0, -4, 0]], [0.7, [0, -10, 0]], [0.9, [0, 8, 0]], [1.1, [0, -8, 0]], [1.6, STANCE.rootRot]],
      body: [[0, STANCE.body], [0.15, [12, -18, 0]], [0.32, [-18, -12, 0]], [0.44, [-22, -10, 0]], [0.5, [-18, -12, 0]], [0.6, [18, -16, 0]], [0.7, [20, -38, 0]], [0.8, [14, -20, 0]], [0.9, [16, 8, 0]], [1.0, [12, -18, 0]], [1.1, [6, -32, 0]], [1.24, [14, -22, 0]], [1.6, STANCE.body]],
      head: [[0, STANCE.head], [0.15, [-4, 8, 0]], [0.32, [-30, 6, 0]], [0.44, [-34, 4, 0]], [0.5, [-28, 6, 0]], [0.6, [-6, 12, 0]], [0.7, [-10, 4, 0]], [0.9, [-8, 16, 0]], [1.1, [-14, 0, 0]], [1.6, STANCE.head]],
      rArm: [[0, STANCE.rArm], [0.15, [24, -26, 14]], [0.32, [48, -18, 10]], [0.44, [52, -16, 8]], [0.5, [46, -18, 10]], [0.6, [-24, -26, 12]], [0.7, [-96, -30, 0]], [0.8, [-70, -26, 8]], [0.9, [-52, -14, 10]], [1.0, [-74, -24, 8]], [1.1, [-132, -16, 4]], [1.24, [-70, -28, 10]], [1.6, STANCE.rArm]],
      rFore: [[0, STANCE.rFore], [0.32, [-14, 12, 0]], [0.44, [-10, 10, 0]], [0.6, [-40, 14, 0]], [0.7, [-8, 10, 0]], [0.9, [-60, 8, 0]], [1.1, [-46, 6, 0]], [1.24, [-78, 14, 0]], [1.6, STANCE.rFore]],
      lArm: [[0, STANCE.lArm], [0.15, [24, 26, -14]], [0.32, [48, 18, -10]], [0.44, [52, 16, -8]], [0.5, [46, 18, -10]], [0.6, [-24, 26, -12]], [0.7, [-54, 30, -8]], [0.8, [-64, 26, -8]], [0.9, [-88, 42, -8]], [1.0, [-62, 30, -8]], [1.1, [-58, 34, -10]], [1.24, [-74, 30, -10]], [1.6, STANCE.lArm]],
      lFore: [[0, STANCE.lFore], [0.32, [-14, -12, 0]], [0.44, [-10, -10, 0]], [0.6, [-40, -14, 0]], [0.7, [-62, -10, 0]], [0.9, [-10, -8, 0]], [1.1, [-70, -10, 0]], [1.24, [-80, -14, 0]], [1.6, STANCE.lFore]],
      rLeg: [[0, STANCE.rLeg], [0.15, [-10, 0, 18]], [0.6, [-8, 0, 16]], [0.7, [-16, 0, 12]], [0.9, [-12, 0, 12]], [1.1, [-18, 0, 10]], [1.6, STANCE.rLeg]],
      rShin: [[0, STANCE.rShin], [0.15, [54, 0, 0]], [0.6, [42, 0, 0]], [0.7, [30, 0, 0]], [0.9, [26, 0, 0]], [1.1, [22, 0, 0]], [1.6, STANCE.rShin]],
      lLeg: [[0, STANCE.lLeg], [0.15, [-20, 0, -18]], [0.6, [-18, 0, -16]], [0.7, [-14, 0, -12]], [0.9, [-10, 0, -10]], [1.1, [-12, 0, -8]], [1.6, STANCE.lLeg]],
      lShin: [[0, STANCE.lShin], [0.15, [64, 0, 0]], [0.6, [52, 0, 0]], [0.7, [40, 0, 0]], [0.9, [34, 0, 0]], [1.1, [30, 0, 0]], [1.6, STANCE.lShin]],
    },
  },

  // Chute Meteoro (Nv3): agacha fundo (jump_antic), salta quase até o topo da janela (o
  // `pet.lift` de stepLeap faz o salto de tela; o clipe só dá a pose), fica ~250 ms no ar e
  // cai na diagonal com os dois pés em cima do alvo. Hit em 0,95 s.
  special_meteor: {
    loop: false,
    length: 1.3,
    keys: {
      rootPos: [[0, STANCE.rootPos], [0.16, [0, -1.55, 0.25]], [0.3, [0, -1.65, 0.2]], [0.4, [0, -0.35, -0.6]], [0.5, [0, 0.45, -1.2]], [0.62, [0, 0.55, -1.5]], [0.72, [0, 0.5, -1.85]], [0.82, [0, -0.2, -3.2]], [0.95, [0, -1.25, -3.85]], [1.05, [0, -1.0, -3.5]], [1.3, STANCE.rootPos]],
      rootRot: [[0, STANCE.rootRot], [0.16, [0, 8, 0]], [0.4, [0, -4, 0]], [0.5, [0, -8, 0]], [0.72, [0, -10, 0]], [0.95, [0, -4, 0]], [1.3, STANCE.rootRot]],
      body: [[0, STANCE.body], [0.16, [28, -14, 0]], [0.3, [30, -12, 0]], [0.4, [-6, -8, 0]], [0.5, [-16, 0, 0]], [0.72, [-20, 0, 0]], [0.82, [12, -4, 0]], [0.95, [26, -8, 0]], [1.05, [18, -10, 0]], [1.3, STANCE.body]],
      head: [[0, STANCE.head], [0.16, [12, 4, 0]], [0.4, [-12, 4, 0]], [0.5, [-16, 0, 0]], [0.72, [-18, 0, 0]], [0.82, [8, 2, 0]], [0.95, [18, 4, 0]], [1.3, STANCE.head]],
      rArm: [[0, STANCE.rArm], [0.16, [42, -30, 24]], [0.4, [-140, -18, 18]], [0.5, [-152, -14, 20]], [0.72, [-150, -14, 22]], [0.82, [-40, -20, 40]], [0.95, [-16, -14, 46]], [1.05, [-30, -20, 26]], [1.3, STANCE.rArm]],
      rFore: [[0, STANCE.rFore], [0.16, [-24, 12, 0]], [0.4, [-18, 10, 0]], [0.72, [-18, 10, 0]], [0.95, [-14, 8, 0]], [1.3, STANCE.rFore]],
      lArm: [[0, STANCE.lArm], [0.16, [42, 30, -24]], [0.4, [-140, 18, -18]], [0.5, [-152, 14, -20]], [0.72, [-150, 14, -22]], [0.82, [-40, 20, -40]], [0.95, [-16, 14, -46]], [1.05, [-30, 20, -26]], [1.3, STANCE.lArm]],
      lFore: [[0, STANCE.lFore], [0.16, [-24, -12, 0]], [0.4, [-18, -10, 0]], [0.72, [-18, -10, 0]], [0.95, [-14, -8, 0]], [1.3, STANCE.lFore]],
      rLeg: [[0, STANCE.rLeg], [0.16, [-42, 0, 14]], [0.3, [-46, 0, 16]], [0.4, [-24, 0, 10]], [0.5, [-72, 0, 8]], [0.62, [-76, 0, 8]], [0.72, [-80, 0, 8]], [0.82, [-98, 0, 12]], [0.95, [-92, 0, 14]], [1.05, [-48, 0, 12]], [1.3, STANCE.rLeg]],
      rShin: [[0, STANCE.rShin], [0.16, [100, 0, 0]], [0.3, [104, 0, 0]], [0.4, [20, 0, 0]], [0.5, [78, 0, 0]], [0.72, [84, 0, 0]], [0.82, [-4, 0, 0]], [0.95, [-10, 0, 0]], [1.05, [62, 0, 0]], [1.3, STANCE.rShin]],
      lLeg: [[0, STANCE.lLeg], [0.16, [-46, 0, -14]], [0.3, [-50, 0, -16]], [0.4, [-26, 0, -10]], [0.5, [-60, 0, -8]], [0.62, [-64, 0, -8]], [0.72, [-68, 0, -8]], [0.82, [-98, 0, -12]], [0.95, [-92, 0, -14]], [1.05, [-48, 0, -12]], [1.3, STANCE.lLeg]],
      lShin: [[0, STANCE.lShin], [0.16, [104, 0, 0]], [0.3, [108, 0, 0]], [0.4, [20, 0, 0]], [0.5, [86, 0, 0]], [0.72, [92, 0, 0]], [0.82, [-4, 0, 0]], [0.95, [-10, 0, 0]], [1.05, [64, 0, 0]], [1.3, STANCE.lShin]],
    },
  },

  // Contra-Impacto Sísmico (Nv4) / guarda suprema: um pé atrás, os braços cruzados na
  // frente do rosto, um joelho no chão, e uma ONDA de partículas sai do centro dela. Hit em 0,62 s.
  special_guard: {
    loop: false,
    length: 1.25,
    keys: {
      rootPos: [[0, STANCE.rootPos], [0.16, [0, -0.6, 0.6]], [0.3, [0, -1.3, 0.5]], [0.45, [0, -1.85, 0.5]], [0.55, [0, -1.9, 0.5]], [0.62, [0, -1.0, 0.1]], [0.75, [0, -1.35, 0.2]], [1.25, STANCE.rootPos]],
      rootRot: [[0, STANCE.rootRot], [0.16, [0, 10, 0]], [0.3, [0, 14, 0]], [0.62, [0, -6, 0]], [1.25, STANCE.rootRot]],
      body: [[0, STANCE.body], [0.16, [14, -8, 0]], [0.3, [18, -10, 0]], [0.45, [22, -12, 0]], [0.55, [24, -12, 0]], [0.62, [-8, -20, 0]], [0.75, [12, -12, 0]], [1.25, STANCE.body]],
      head: [[0, STANCE.head], [0.16, [4, 6, 0]], [0.3, [8, 4, 0]], [0.45, [12, 2, 0]], [0.62, [-16, 0, 0]], [0.75, [-2, 6, 0]], [1.25, STANCE.head]],
      rArm: [[0, STANCE.rArm], [0.16, [-96, -30, 16]], [0.3, [-128, -38, 18]], [0.45, [-132, -36, 16]], [0.55, [-134, -36, 16]], [0.62, [0, -62, 38]], [0.75, [-52, -28, 14]], [1.25, STANCE.rArm]],
      rFore: [[0, STANCE.rFore], [0.16, [-120, 12, 0]], [0.3, [-142, 10, 0]], [0.45, [-146, 10, 0]], [0.62, [-16, 6, 0]], [0.75, [-74, 12, 0]], [1.25, STANCE.rFore]],
      lArm: [[0, STANCE.lArm], [0.16, [-94, 34, -16]], [0.3, [-124, 40, -16]], [0.45, [-128, 38, -16]], [0.55, [-130, 38, -16]], [0.62, [0, 62, -38]], [0.75, [-50, 30, -14]], [1.25, STANCE.lArm]],
      lFore: [[0, STANCE.lFore], [0.16, [-118, -12, 0]], [0.3, [-140, -10, 0]], [0.45, [-144, -10, 0]], [0.62, [-16, -6, 0]], [0.75, [-72, -12, 0]], [1.25, STANCE.lFore]],
      rLeg: [[0, STANCE.rLeg], [0.16, [-12, 0, 10]], [0.3, [-16, 0, 10]], [0.45, [-40, 0, 8]], [0.55, [-42, 0, 8]], [0.62, [-30, 0, 10]], [1.25, STANCE.rLeg]],
      rShin: [[0, STANCE.rShin], [0.16, [46, 0, 0]], [0.3, [52, 0, 0]], [0.45, [76, 0, 0]], [0.55, [78, 0, 0]], [0.62, [58, 0, 0]], [1.25, STANCE.rShin]],
      lLeg: [[0, STANCE.lLeg], [0.16, [18, 0, -10]], [0.3, [22, 0, -10]], [0.45, [24, 0, -8]], [0.55, [24, 0, -8]], [0.62, [10, 0, -12]], [1.25, STANCE.lLeg]],
      lShin: [[0, STANCE.lShin], [0.16, [52, 0, 0]], [0.3, [56, 0, 0]], [0.45, [84, 0, 0]], [0.55, [86, 0, 0]], [0.62, [62, 0, 0]], [1.25, STANCE.lShin]],
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
  // cast_special já traz a própria carga dentro do clipe (ver melee.startCharge).
  cast_special: { kind: 'attack', durationMs: 850, hitFrameMs: 620, comboWindowMs: null, next: null, charge: true },
  // Manobras especiais (só com a Fúria): cada uma tem uma coreografia própria.
  special_breaker: { kind: 'attack', durationMs: 950, hitFrameMs: 520, comboWindowMs: null, next: null },
  special_awakening: { kind: 'attack', durationMs: 1600, hitFrameMs: 1000, comboWindowMs: null, next: null },
  special_meteor: { kind: 'attack', durationMs: 1300, hitFrameMs: 950, comboWindowMs: null, next: null },
  special_guard: { kind: 'attack', durationMs: 1250, hitFrameMs: 620, comboWindowMs: null, next: null },
  // A guarda segura a pose durante a carga do inimigo (o bloqueio vem ANTES do dano).
  combat_block: { kind: 'defense', durationMs: 450, hitFrameMs: null, comboWindowMs: null },
  // O passo de esquiva (a opacidade e o "Miss!" ficam no melee.js).
  dodge: { kind: 'defense', durationMs: 340, hitFrameMs: null, comboWindowMs: null },
  combat_dodge_step: { kind: 'defense', durationMs: 400, hitFrameMs: null, comboWindowMs: null },
  // Os deslocamentos do combate: só pose (quem anda é o melee.js).
  dash_forward: { kind: 'move', durationMs: 300, hitFrameMs: null, comboWindowMs: null },
  dash_backward: { kind: 'move', durationMs: 280, hitFrameMs: null, comboWindowMs: null },
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
