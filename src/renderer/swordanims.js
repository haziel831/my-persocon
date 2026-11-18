// Armed combat animations for the equipped sword (sword system).
//
// Same idea as combatanims.js: the clips are generated procedurally on the YSM/Bedrock rig,
// so they work on any model with the standard bones and the model files are never touched.
// The metadata (duration/hit frame) lives in combatanims.js COMBAT_META, so the melee engine
// and the Combat controller already know these clips.
//
// Rig axes (see combatanims.js):
//   rx < 0 → a hanging limb swings FORWARD (-Z); the torso/head leans BACK
//   ry > 0 → the torso turns to its RIGHT; a limb points to its own side
//   rz > 0 → the right limb rolls outward (the left one inward)
//   rootPos z < 0 → forward (toward the enemy), y = up
import { rig } from './combatanims.js';
import { AnimClip } from './animation.js';

// Sampled channel (the looping idle: the ends must match).
const fn = (len, f, steps = 48) => Object.fromEntries(Array.from({ length: steps + 1 }, (_, i) => {
  const t = (len * i) / steps;
  return [t.toFixed(3), f(t).map((n) => Math.round(n * 100) / 100)];
}));

// Control points [time, value, postValue?]. The third item gives a key with a different value
// AFTER it (pre: value / post: postValue), which is how a full 360° spin comes back to 0
// without unwinding on the next clip: the pose ends at -360 (identical to 0) and snaps to 0.
const cr = (pts) => Object.fromEntries(pts.map(([t, v, post]) => {
  const a = v.map((n) => Math.round(n * 100) / 100);
  const b = (post || v).map((n) => Math.round(n * 100) / 100);
  return [t.toFixed(3), { pre: a, post: b, lerp_mode: 'catmullrom' }];
}));

// The sword stance: right hand low in front (the blade up), left hand ready, knees bent.
const STANCE = {
  rootRot: [0, 0, 0],
  rootPos: [0, -0.55, 0],
  body: [8, -22, 0],
  head: [-4, 12, 0],
  rArm: [-58, -22, 10],
  rFore: [-64, 10, 0],
  lArm: [-46, 26, -8],
  lFore: [-80, -10, 0],
  hip: [0, -6, 0],
  rLeg: [-8, 0, 10],
  rShin: [38, 0, 0],
  lLeg: [-20, 0, -10],
  lShin: [50, 0, 0],
};

// The breathing loop of the stance with the sword in hand (1.2 s).
const idlePose = (p) => {
  const b = Math.sin(p);
  const b2 = Math.sin(p * 2);
  return {
    rootPos: [0, -0.55 + b * 0.07, 0],
    rootRot: [0, 0, b * 0.4],
    body: [8 + b * 1.1, -22 + b2 * 1.4, 0],
    head: [-4 - b * 1.4, 12 - b2 * 1.1, 0],
    rArm: [-58 + b2 * 1.4, -22, 10 + b * 1.0],
    rFore: [-64 - b * 1.6, 10, 0],
    lArm: [-46 - b2 * 1.2, 26, -8 - b * 1.0],
    lFore: [-80 + b * 1.4, -10, 0],
    hip: [0, -6 + b2 * 0.8, 0],
    rLeg: [-8, 0, 10],
    rShin: [38 + b * 1.4, 0, 0],
    lLeg: [-20, 0, -10],
    lShin: [50 - b * 1.4, 0, 0],
  };
};

export const SWORD_CLIPS = {
  // Sword in hand: the fighting stance breathing (used while she charges the second strike).
  sword_idle: { loop: true, length: 1.2, idle: true },

  // Draw & Sheathe: the right hand goes down to the left hip, grabs the handle and pulls the
  // blade up in a short arc. The sheathe is the same arc backwards.
  sword_draw: {
    loop: false,
    length: 0.5,
    keys: {
      rootPos: [[0, STANCE.rootPos], [0.14, [0, -0.7, 0.1]], [0.3, [0, -0.62, -0.2]], [0.5, [0, -0.55, -0.1]]],
      rootRot: [[0, STANCE.rootRot], [0.14, [0, 6, 0]], [0.32, [0, -4, 0]], [0.5, STANCE.rootRot]],
      body: [[0, STANCE.body], [0.14, [12, -34, 0]], [0.3, [4, -6, 0]], [0.5, STANCE.body]],
      head: [[0, STANCE.head], [0.14, [4, 20, 0]], [0.3, [-8, 2, 0]], [0.5, STANCE.head]],
      rArm: [[0, STANCE.rArm], [0.12, [-10, -10, 6]], [0.26, [-6, -20, 4]], [0.38, [-124, -24, 18]], [0.5, [-72, -24, 12]]],
      rFore: [[0, STANCE.rFore], [0.12, [-48, 6, 0]], [0.26, [-72, 12, 0]], [0.38, [-26, 8, 0]], [0.5, [-60, 10, 0]]],
      lArm: [[0, STANCE.lArm], [0.14, [-38, 30, -12]], [0.3, [-52, 24, -6]], [0.5, STANCE.lArm]],
      lFore: [[0, STANCE.lFore], [0.14, [-92, -12, 0]], [0.3, [-70, -8, 0]], [0.5, STANCE.lFore]],
      rLeg: [[0, STANCE.rLeg], [0.14, [-12, 0, 12]], [0.5, STANCE.rLeg]],
      rShin: [[0, STANCE.rShin], [0.14, [48, 0, 0]], [0.5, STANCE.rShin]],
      lLeg: [[0, STANCE.lLeg], [0.14, [-26, 0, -12]], [0.5, STANCE.lLeg]],
      lShin: [[0, STANCE.lShin], [0.14, [58, 0, 0]], [0.5, STANCE.lShin]],
    },
  },

  sword_sheathe: {
    loop: false,
    length: 0.45,
    keys: {
      rootPos: [[0, STANCE.rootPos], [0.16, [0, -0.66, 0]], [0.32, [0, -0.7, 0.05]], [0.45, STANCE.rootPos]],
      rootRot: [[0, STANCE.rootRot], [0.16, [0, -4, 0]], [0.32, [0, 6, 0]], [0.45, STANCE.rootRot]],
      body: [[0, STANCE.body], [0.16, [6, -8, 0]], [0.32, [12, -32, 0]], [0.45, STANCE.body]],
      head: [[0, STANCE.head], [0.16, [-8, 4, 0]], [0.32, [4, 18, 0]], [0.45, STANCE.head]],
      rArm: [[0, [-72, -24, 12]], [0.16, [-120, -22, 16]], [0.3, [-10, -18, 6]], [0.45, STANCE.rArm]],
      rFore: [[0, [-60, 10, 0]], [0.16, [-30, 8, 0]], [0.3, [-64, 10, 0]], [0.45, STANCE.rFore]],
      lArm: [[0, STANCE.lArm], [0.16, [-52, 24, -6]], [0.3, [-40, 28, -10]], [0.45, STANCE.lArm]],
      lFore: [[0, STANCE.lFore], [0.16, [-70, -8, 0]], [0.3, [-88, -12, 0]], [0.45, STANCE.lFore]],
      rLeg: [[0, STANCE.rLeg], [0.2, [-12, 0, 12]], [0.45, STANCE.rLeg]],
      rShin: [[0, STANCE.rShin], [0.2, [48, 0, 0]], [0.45, STANCE.rShin]],
      lLeg: [[0, STANCE.lLeg], [0.2, [-26, 0, -12]], [0.45, STANCE.lLeg]],
      lShin: [[0, STANCE.lShin], [0.2, [58, 0, 0]], [0.45, STANCE.lShin]],
    },
  },

  // Basic Slash: raise the blade overhead, then a fast diagonal downward cut. Hit at 0.30 s.
  sword_slash: {
    loop: false,
    length: 0.6,
    keys: {
      rootPos: [[0, STANCE.rootPos], [0.14, [0, -0.8, 0.2]], [0.24, [0, -0.7, 0.1]], [0.3, [0, -0.5, -1.9]], [0.4, [0, -0.6, -1.5]], [0.6, STANCE.rootPos]],
      rootRot: [[0, STANCE.rootRot], [0.14, [0, 8, 0]], [0.3, [0, -10, 0]], [0.4, [0, -6, 0]], [0.6, STANCE.rootRot]],
      body: [[0, STANCE.body], [0.14, [-20, -44, -4]], [0.24, [-24, -48, -4]], [0.3, [26, 16, 5]], [0.4, [30, 24, 7]], [0.6, STANCE.body]],
      hip: [[0, STANCE.hip], [0.14, [0, -18, 0]], [0.24, [0, -20, 0]], [0.3, [0, 18, 0]], [0.4, [0, 22, 0]], [0.6, STANCE.hip]],
      head: [[0, STANCE.head], [0.14, [-16, 6, 0]], [0.3, [12, 4, 0]], [0.4, [16, 8, 0]], [0.6, STANCE.head]],
      rArm: [[0, STANCE.rArm], [0.14, [-172, -30, 32]], [0.24, [-182, -26, 30]], [0.3, [-12, -10, 8]], [0.4, [6, -4, 14]], [0.6, STANCE.rArm]],
      rFore: [[0, STANCE.rFore], [0.14, [-18, 12, 0]], [0.24, [-14, 10, 0]], [0.3, [-6, 6, 0]], [0.4, [-10, 6, 0]], [0.6, STANCE.rFore]],
      lArm: [[0, STANCE.lArm], [0.14, [-110, 34, -18]], [0.24, [-116, 32, -18]], [0.3, [-34, 38, -12]], [0.4, [-26, 34, -10]], [0.6, STANCE.lArm]],
      lFore: [[0, STANCE.lFore], [0.14, [-58, -10, 0]], [0.3, [-92, -12, 0]], [0.6, STANCE.lFore]],
      rLeg: [[0, STANCE.rLeg], [0.14, [-4, 0, 12]], [0.3, [-22, 0, 12]], [0.6, STANCE.rLeg]],
      rShin: [[0, STANCE.rShin], [0.14, [40, 0, 0]], [0.3, [30, 0, 0]], [0.6, STANCE.rShin]],
      lLeg: [[0, STANCE.lLeg], [0.14, [-24, 0, -12]], [0.3, [-10, 0, -14]], [0.6, STANCE.lLeg]],
      lShin: [[0, STANCE.lShin], [0.14, [56, 0, 0]], [0.3, [44, 0, 0]], [0.6, STANCE.lShin]],
    },
  },

  // Piercing Thrust: crouch slightly, pull the sword arm all the way back, then a straight
  // horizontal thrust into the target's hitbox. Hit at 0.34 s.
  sword_thrust: {
    loop: false,
    length: 0.62,
    keys: {
      rootPos: [[0, STANCE.rootPos], [0.16, [0, -1.0, 0.35]], [0.26, [0, -1.05, 0.3]], [0.34, [0, -0.5, -2.5]], [0.46, [0, -0.6, -2.1]], [0.62, STANCE.rootPos]],
      rootRot: [[0, STANCE.rootRot], [0.16, [0, 10, 0]], [0.34, [0, -2, 0]], [0.46, [0, 2, 0]], [0.62, STANCE.rootRot]],
      body: [[0, STANCE.body], [0.16, [18, -46, -3]], [0.26, [22, -52, -3]], [0.34, [10, 6, 3]], [0.46, [12, 10, 4]], [0.62, STANCE.body]],
      hip: [[0, STANCE.hip], [0.16, [0, -22, 0]], [0.26, [0, -26, 0]], [0.34, [0, 12, 0]], [0.46, [0, 14, 0]], [0.62, STANCE.hip]],
      head: [[0, STANCE.head], [0.16, [2, 24, 0]], [0.34, [-2, 0, 0]], [0.62, STANCE.head]],
      rArm: [[0, STANCE.rArm], [0.16, [-40, -46, 20]], [0.26, [-34, -52, 22]], [0.34, [-104, -6, 4]], [0.46, [-100, -8, 6]], [0.62, STANCE.rArm]],
      rFore: [[0, STANCE.rFore], [0.16, [-118, 18, 0]], [0.26, [-126, 20, 0]], [0.34, [-6, 2, 0]], [0.46, [-10, 4, 0]], [0.62, STANCE.rFore]],
      lArm: [[0, STANCE.lArm], [0.16, [-64, 34, -16]], [0.26, [-70, 36, -18]], [0.34, [-44, 30, -10]], [0.62, STANCE.lArm]],
      lFore: [[0, STANCE.lFore], [0.16, [-98, -12, 0]], [0.34, [-86, -12, 0]], [0.62, STANCE.lFore]],
      rLeg: [[0, STANCE.rLeg], [0.16, [-30, 0, 14]], [0.34, [-6, 0, 10]], [0.46, [-10, 0, 12]], [0.62, STANCE.rLeg]],
      rShin: [[0, STANCE.rShin], [0.16, [74, 0, 0]], [0.34, [34, 0, 0]], [0.46, [40, 0, 0]], [0.62, STANCE.rShin]],
      lLeg: [[0, STANCE.lLeg], [0.16, [-36, 0, -14]], [0.34, [-16, 0, -12]], [0.62, STANCE.lLeg]],
      lShin: [[0, STANCE.lShin], [0.16, [80, 0, 0]], [0.34, [46, 0, 0]], [0.62, STANCE.lShin]],
    },
  },

  // Spin Attack (special): phase 1 = wide stance, both hands on the sword near the hip, the
  // red charge glows for ~0.6 s. Phase 2 = release, dash and a full 360° spin. Hit at 0.86 s.
  sword_spin: {
    loop: false,
    length: 1.5,
    keys: {
      rootPos: [[0, STANCE.rootPos], [0.2, [0, -1.15, 0.1]], [0.45, [0, -1.2, 0.12]], [0.6, [0, -1.1, 0.05]], [0.86, [0, -0.7, -2.7]], [1.05, [0, -1.0, -2.3]], [1.5, STANCE.rootPos]],
      // A volta inteira: o corpo gira 360° e o último keyframe volta a 0 no mesmo instante
      // (a pose em -360 é idêntica à de 0, então o clipe seguinte não "desenrola" o giro).
      rootRot: [[0, [0, 0, 0]], [0.6, [0, 0, 0]], [0.7, [0, -60, 0]], [0.86, [0, -300, 0]], [0.92, [0, -360, 0], [0, 0, 0]], [1.5, [0, 0, 0]]],
      body: [[0, STANCE.body], [0.2, [14, -46, 0]], [0.45, [16, -48, 0]], [0.6, [12, -44, 0]], [0.72, [2, -20, 0]], [0.86, [-4, 12, 0]], [1.0, [16, -6, 0]], [1.5, STANCE.body]],
      head: [[0, STANCE.head], [0.2, [-4, 20, 0]], [0.45, [-2, 18, 0]], [0.6, [-6, 22, 0]], [0.86, [-8, 0, 0]], [1.05, [10, 4, 0]], [1.5, STANCE.head]],
      hip: [[0, [0, 0, 0]], [0.2, [0, -16, 0]], [0.45, [0, -18, 0]], [0.6, [0, -12, 0]], [0.72, [0, 20, 0]], [0.86, [0, 46, 0]], [1.05, [0, 10, 0]], [1.5, [0, 0, 0]]],
      rArm: [[0, STANCE.rArm], [0.2, [-30, -54, 22]], [0.45, [-34, -56, 24]], [0.6, [-28, -50, 20]], [0.72, [-70, -78, 14]], [0.86, [-96, -70, 8]], [1.0, [-44, -30, 16]], [1.5, STANCE.rArm]],
      rFore: [[0, STANCE.rFore], [0.2, [-108, 18, 0]], [0.45, [-114, 20, 0]], [0.6, [-104, 16, 0]], [0.72, [-30, 8, 0]], [0.86, [-8, 4, 0]], [1.0, [-56, 10, 0]], [1.5, STANCE.rFore]],
      lArm: [[0, STANCE.lArm], [0.2, [-34, 40, -18]], [0.45, [-38, 42, -20]], [0.6, [-32, 38, -16]], [0.72, [-58, 54, -12]], [0.86, [-40, 44, -6]], [1.0, [-48, 30, -10]], [1.5, STANCE.lArm]],
      lFore: [[0, STANCE.lFore], [0.2, [-112, -14, 0]], [0.45, [-118, -16, 0]], [0.6, [-108, -12, 0]], [0.72, [-44, -10, 0]], [0.86, [-70, -8, 0]], [1.0, [-84, -10, 0]], [1.5, STANCE.lFore]],
      rLeg: [[0, STANCE.rLeg], [0.2, [-10, 0, 24]], [0.45, [-12, 0, 26]], [0.6, [-10, 0, 22]], [0.86, [-24, 0, 12]], [1.05, [-14, 0, 14]], [1.5, STANCE.rLeg]],
      rShin: [[0, STANCE.rShin], [0.2, [62, 0, 0]], [0.45, [66, 0, 0]], [0.6, [60, 0, 0]], [0.86, [40, 0, 0]], [1.05, [52, 0, 0]], [1.5, STANCE.rShin]],
      lLeg: [[0, STANCE.lLeg], [0.2, [-26, 0, -24]], [0.45, [-28, 0, -26]], [0.6, [-24, 0, -22]], [0.86, [-8, 0, -14]], [1.05, [-18, 0, -12]], [1.5, STANCE.lLeg]],
      lShin: [[0, STANCE.lShin], [0.2, [68, 0, 0]], [0.45, [72, 0, 0]], [0.6, [66, 0, 0]], [0.86, [46, 0, 0]], [1.05, [58, 0, 0]], [1.5, STANCE.lShin]],
    },
  },

  // Corte Relâmpago (iaido): the low crouch with the hand on the sheath, the dash THROUGH the
  // enemy, the pause with her back turned and the click of the blade going home (the hit burst
  // comes after that, from the melee engine). Hit at 0.44 s.
  sword_iaido: {
    loop: false,
    length: 1.5,
    keys: {
      rootPos: [[0, STANCE.rootPos], [0.12, [0, -1.2, 0.25]], [0.34, [0, -1.28, 0.32]], [0.44, [0, -0.55, -2.6]], [0.62, [0, -0.62, -2.9]], [0.86, [0, -0.6, -2.8]], [1.06, [0, -0.58, -2.6]], [1.24, [0, -0.56, -1.1]], [1.5, STANCE.rootPos]],
      // O corpo dá meia-volta depois do corte (as costas para o inimigo).
      rootRot: [[0, [0, 0, 0]], [0.12, [0, -22, 0]], [0.34, [0, -26, 0]], [0.44, [0, 40, 0]], [0.62, [0, 118, 0]], [0.86, [0, 126, 0]], [1.06, [0, 120, 0]], [1.24, [0, 60, 0]], [1.5, [0, 0, 0]]],
      body: [[0, STANCE.body], [0.12, [26, -40, -6]], [0.34, [30, -44, -7]], [0.44, [32, 22, 6]], [0.62, [8, 10, 0]], [0.86, [6, 6, 0]], [1.06, [10, -14, 0]], [1.24, [8, -20, 0]], [1.5, STANCE.body]],
      hip: [[0, STANCE.hip], [0.12, [0, -24, 0]], [0.34, [0, -28, 0]], [0.44, [0, 24, 0]], [0.62, [0, 12, 0]], [1.06, [0, -10, 0]], [1.5, STANCE.hip]],
      head: [[0, STANCE.head], [0.12, [16, 14, 0]], [0.34, [18, 12, 0]], [0.44, [-6, 0, 0]], [0.62, [2, -10, 0]], [1.06, [6, -6, 0]], [1.5, STANCE.head]],
      // A mão esquerda na bainha (preparando o saque), depois o braço direito varre na horizontal.
      rArm: [[0, STANCE.rArm], [0.12, [-24, -58, 26]], [0.34, [-28, -62, 28]], [0.44, [-96, 34, 6]], [0.62, [-88, 52, 2]], [0.86, [-86, 50, 2]], [1.06, [-20, -52, 24]], [1.24, [-44, -30, 14]], [1.5, STANCE.rArm]],
      rFore: [[0, STANCE.rFore], [0.12, [-118, 20, 0]], [0.34, [-124, 22, 0]], [0.44, [-10, 2, 0]], [0.62, [-6, 0, 0]], [0.86, [-8, 0, 0]], [1.06, [-114, 18, 0]], [1.24, [-78, 12, 0]], [1.5, STANCE.rFore]],
      lArm: [[0, STANCE.lArm], [0.12, [-40, 42, -20]], [0.34, [-44, 44, -22]], [0.44, [-70, 26, -6]], [0.62, [-46, 30, -10]], [1.06, [-38, 40, -18]], [1.5, STANCE.lArm]],
      lFore: [[0, STANCE.lFore], [0.12, [-116, -16, 0]], [0.34, [-120, -18, 0]], [0.44, [-60, -8, 0]], [0.62, [-84, -10, 0]], [1.06, [-110, -14, 0]], [1.5, STANCE.lFore]],
      rLeg: [[0, STANCE.rLeg], [0.12, [-34, 0, 20]], [0.34, [-38, 0, 22]], [0.44, [-6, 0, 10]], [0.62, [-16, 0, 12]], [1.06, [-16, 0, 14]], [1.5, STANCE.rLeg]],
      rShin: [[0, STANCE.rShin], [0.12, [76, 0, 0]], [0.34, [80, 0, 0]], [0.44, [30, 0, 0]], [0.62, [44, 0, 0]], [1.06, [48, 0, 0]], [1.5, STANCE.rShin]],
      lLeg: [[0, STANCE.lLeg], [0.12, [-40, 0, -20]], [0.34, [-44, 0, -22]], [0.44, [-14, 0, -12]], [0.62, [-24, 0, -14]], [1.06, [-24, 0, -14]], [1.5, STANCE.lLeg]],
      lShin: [[0, STANCE.lShin], [0.12, [84, 0, 0]], [0.34, [88, 0, 0]], [0.44, [40, 0, 0]], [0.62, [54, 0, 0]], [1.06, [56, 0, 0]], [1.5, STANCE.lShin]],
    },
  },

  // Dança das Lâminas: a short leap and a 3-hit flurry (down-left, up-right, overhead slam)
  // with the torso whipping side to side. Hit frames: 0.25 / 0.55 / 0.9 s.
  sword_combo: {
    loop: false,
    length: 1.5,
    keys: {
      rootPos: [[0, STANCE.rootPos], [0.1, [0, -0.2, 0.1]], [0.25, [0, -0.35, -0.9]], [0.55, [0, -0.5, -1.3]], [0.78, [0, -0.3, -1.5]], [0.9, [0, -0.95, -1.9]], [1.14, [0, -0.7, -1.5]], [1.5, STANCE.rootPos]],
      rootRot: [[0, [0, 0, 0]], [0.1, [0, -24, 0]], [0.25, [0, 16, 0]], [0.55, [0, -18, 0]], [0.78, [0, 20, 0]], [0.9, [0, 4, 0]], [1.14, [0, -6, 0]], [1.5, [0, 0, 0]]],
      body: [[0, STANCE.body], [0.1, [-18, -40, -6]], [0.25, [28, 22, 6]], [0.4, [10, 4, 0]], [0.55, [24, -30, -6]], [0.7, [-16, -34, -6]], [0.9, [32, 6, 4]], [1.14, [14, -10, 0]], [1.5, STANCE.body]],
      hip: [[0, STANCE.hip], [0.1, [0, -20, 0]], [0.25, [0, 20, 0]], [0.55, [0, -22, 0]], [0.78, [0, -24, 0]], [0.9, [0, 12, 0]], [1.14, [0, -8, 0]], [1.5, STANCE.hip]],
      head: [[0, STANCE.head], [0.1, [-10, 10, 0]], [0.25, [10, -4, 0]], [0.55, [6, 12, 0]], [0.9, [18, 2, 0]], [1.14, [6, 4, 0]], [1.5, STANCE.head]],
      rArm: [[0, STANCE.rArm], [0.1, [-160, -36, 30]], [0.25, [-14, 20, 10]], [0.4, [-96, -40, 22]], [0.55, [-158, -6, 34]], [0.7, [-178, -18, 26]], [0.9, [-6, -6, 8]], [1.14, [-44, -16, 12]], [1.5, STANCE.rArm]],
      rFore: [[0, STANCE.rFore], [0.1, [-20, 10, 0]], [0.25, [-8, 4, 0]], [0.4, [-64, 14, 0]], [0.55, [-18, 8, 0]], [0.7, [-14, 8, 0]], [0.9, [-4, 2, 0]], [1.14, [-40, 10, 0]], [1.5, STANCE.rFore]],
      lArm: [[0, STANCE.lArm], [0.1, [-100, 38, -20]], [0.25, [-30, 30, -8]], [0.55, [-108, 40, -20]], [0.9, [-22, 26, -6]], [1.14, [-40, 28, -10]], [1.5, STANCE.lArm]],
      lFore: [[0, STANCE.lFore], [0.1, [-64, -12, 0]], [0.25, [-92, -10, 0]], [0.55, [-58, -10, 0]], [0.9, [-96, -12, 0]], [1.5, STANCE.lFore]],
      rLeg: [[0, STANCE.rLeg], [0.1, [-30, 0, 16]], [0.25, [-6, 0, 12]], [0.55, [-30, 0, 16]], [0.9, [-12, 0, 10]], [1.14, [-18, 0, 12]], [1.5, STANCE.rLeg]],
      rShin: [[0, STANCE.rShin], [0.1, [72, 0, 0]], [0.25, [26, 0, 0]], [0.55, [70, 0, 0]], [0.9, [58, 0, 0]], [1.14, [56, 0, 0]], [1.5, STANCE.rShin]],
      lLeg: [[0, STANCE.lLeg], [0.1, [-36, 0, -16]], [0.25, [-14, 0, -12]], [0.55, [-34, 0, -16]], [0.9, [-26, 0, -12]], [1.14, [-26, 0, -12]], [1.5, STANCE.lLeg]],
      lShin: [[0, STANCE.lShin], [0.1, [80, 0, 0]], [0.25, [34, 0, 0]], [0.55, [78, 0, 0]], [0.9, [68, 0, 0]], [1.14, [66, 0, 0]], [1.5, STANCE.lShin]],
    },
  },

  // Guard: the blade held high across the body, the head tucked, braced.
  sword_guard: {
    loop: 'hold_on_last_frame',
    length: 0.28,
    keys: {
      rootPos: [[0, STANCE.rootPos], [0.28, [0, -0.95, 0.15]]],
      rootRot: [[0, STANCE.rootRot], [0.28, [0, 4, 0]]],
      body: [[0, STANCE.body], [0.28, [14, -34, 0]]],
      hip: [[0, STANCE.hip], [0.28, [0, -16, 0]]],
      head: [[0, STANCE.head], [0.28, [12, 16, 0]]],
      rArm: [[0, STANCE.rArm], [0.28, [-96, -44, 18]]],
      rFore: [[0, STANCE.rFore], [0.28, [-108, 14, 0]]],
      lArm: [[0, STANCE.lArm], [0.28, [-84, 44, 8]]],
      lFore: [[0, STANCE.lFore], [0.28, [-118, -14, 0]]],
      rLeg: [[0, STANCE.rLeg], [0.28, [-14, 0, 14]]],
      rShin: [[0, STANCE.rShin], [0.28, [56, 0, 0]]],
      lLeg: [[0, STANCE.lLeg], [0.28, [-26, 0, -14]]],
      lShin: [[0, STANCE.lShin], [0.28, [64, 0, 0]]],
    },
  },
};

// The armed move list: it replaces the unarmed punches/kicks while the sword is equipped.
// The level is the Sword skill level (the kendo training arts), so the moves are earned by
// training the sword. `weapon: true` applies the sword multiplier in the damage roll.
export const SWORD_MOVES = [
  { id: 'corte', name: 'Corte Básico', lvl: 1, dmg: 6, clip: 'sword_slash', kind: 'attack', weapon: true },
  { id: 'guarda_espada', name: 'Guarda de Espada', lvl: 1, dmg: 0, clip: 'sword_guard', kind: 'defend' },
  { id: 'estocada', name: 'Estocada', lvl: 3, dmg: 10, clip: 'sword_thrust', kind: 'attack', weapon: true },
  // O saque-relâmpago: o corte só "abre" no inimigo depois que ela embainha, de costas.
  { id: 'relampago', name: 'Corte Relâmpago', lvl: 5, dmg: 13, clip: 'sword_iaido', kind: 'attack', weapon: true, iaido: true, chargeColor: 'blue' },
  { id: 'diagonal', name: 'Corte Diagonal', lvl: 6, dmg: 15, clip: 'sword_slash', kind: 'attack', weapon: true },
  // Três golpes em sequência (baixo-esquerda, cima-direita, cima embaixo).
  { id: 'danca', name: 'Dança das Lâminas', lvl: 7, dmg: 6, clip: 'sword_combo', kind: 'attack', weapon: true, hits: 3, hitGap: 0.3, chargeColor: 'blue' },
  { id: 'giro_lamina', name: 'Giro Supremo', lvl: 8, dmg: 20, clip: 'sword_spin', kind: 'attack', weapon: true, aoe: true, charge: 0.6, knockup: true, chargeColor: 'gold' },
  { id: 'ippon_lamina', name: 'Ippon da Lâmina', lvl: 10, dmg: 26, clip: 'sword_thrust', kind: 'attack', weapon: true },
];

// How much the blade adds over a bare hand (the weapon multiplier of the armed system).
export const SWORD_MULT = 1.4;

// ---------------------------------------------------------------- builder

function buildClip(def, r) {
  const bones = {};
  if (def.idle) {
    for (const [key, bone] of Object.entries(r)) {
      if (!bone || key === 'eyelids') continue;
      if (key === 'root') {
        bones[bone] = {
          rotation: fn(def.length, (t) => idlePose((t / def.length) * Math.PI * 2).rootRot),
          position: fn(def.length, (t) => idlePose((t / def.length) * Math.PI * 2).rootPos),
        };
        continue;
      }
      if (!(key in idlePose(0))) continue;
      bones[bone] = { rotation: fn(def.length, (t) => idlePose((t / def.length) * Math.PI * 2)[key]) };
    }
    return { loop: true, animation_length: def.length, bones };
  }
  for (const [key, bone] of Object.entries(r)) {
    if (!bone) continue;
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
    bones[bone] = { rotation: cr(spec) };
  }
  return { loop: def.loop, animation_length: def.length, bones };
}

// Adds the sword clips to the animator. Returns the names registered.
export function addSwordClips(boneNames, clips) {
  const r = rig(boneNames);
  if (!r.rArm && !r.lArm) return [];
  const added = [];
  for (const [name, def] of Object.entries(SWORD_CLIPS)) {
    const json = buildClip(def, r);
    if (!Object.keys(json.bones).length) continue;
    clips.set(name, new AnimClip(name, json));
    added.push(name);
  }
  return added;
}
