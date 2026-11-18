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
  body: [8, -18, 0],
  head: [-4, 10, 0],
  rArm: [-58, -22, 10],
  rFore: [-64, 10, 0],
  lArm: [-46, 26, -8],
  lFore: [-80, -10, 0],
  hip: [0, 0, 0],
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
    body: [8 + b * 1.1, -18 + b2 * 1.4, 0],
    head: [-4 - b * 1.4, 10 - b2 * 1.1, 0],
    rArm: [-58 + b2 * 1.4, -22, 10 + b * 1.0],
    rFore: [-64 - b * 1.6, 10, 0],
    lArm: [-46 - b2 * 1.2, 26, -8 - b * 1.0],
    lFore: [-80 + b * 1.4, -10, 0],
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
      body: [[0, STANCE.body], [0.14, [-12, -24, 0]], [0.24, [-16, -22, 0]], [0.3, [26, -2, 0]], [0.4, [30, 4, 0]], [0.6, STANCE.body]],
      head: [[0, STANCE.head], [0.14, [-16, 4, 0]], [0.3, [12, 2, 0]], [0.4, [16, 6, 0]], [0.6, STANCE.head]],
      rArm: [[0, STANCE.rArm], [0.14, [-168, -26, 26]], [0.24, [-178, -22, 24]], [0.3, [-18, -14, 10]], [0.4, [4, -10, 14]], [0.6, STANCE.rArm]],
      rFore: [[0, STANCE.rFore], [0.14, [-22, 10, 0]], [0.24, [-18, 8, 0]], [0.3, [-8, 6, 0]], [0.4, [-12, 6, 0]], [0.6, STANCE.rFore]],
      lArm: [[0, STANCE.lArm], [0.14, [-104, 30, -14]], [0.24, [-110, 28, -14]], [0.3, [-40, 34, -10]], [0.4, [-32, 30, -8]], [0.6, STANCE.lArm]],
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
      body: [[0, STANCE.body], [0.16, [16, -40, 0]], [0.26, [18, -46, 0]], [0.34, [8, -2, 0]], [0.46, [10, 2, 0]], [0.62, STANCE.body]],
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

  // Guard: the blade held high across the body, the head tucked, braced.
  sword_guard: {
    loop: 'hold_on_last_frame',
    length: 0.28,
    keys: {
      rootPos: [[0, STANCE.rootPos], [0.28, [0, -0.95, 0.15]]],
      rootRot: [[0, STANCE.rootRot], [0.28, [0, 4, 0]]],
      body: [[0, STANCE.body], [0.28, [14, -30, 0]]],
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
  { id: 'diagonal', name: 'Corte Diagonal', lvl: 6, dmg: 15, clip: 'sword_slash', kind: 'attack', weapon: true },
  { id: 'giro_lamina', name: 'Giro de Lâmina', lvl: 8, dmg: 20, clip: 'sword_spin', kind: 'attack', weapon: true, aoe: true, charge: 0.6 },
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
