// The action clips of the Persocon: item use, the crouch before a jump, the knockback arc
// and the get-up. They are generated procedurally (like combatanims.js) on the standard
// YSM/Bedrock rig, so the SAME clips work on both models (Ninna and Aghata) and the model
// files themselves are never touched (their license forbids editing them).
//
// The rig (see combatanims.js for the axes):
//   Root → AllBody → UpBody (torso) → AllHead → Head
//                                   → Arm → RightArm → RightForeArm
//                                          → LeftArm  → LeftForeArm
//                → DownBody → Leg → RightLeg → RightLowerLeg
//                              → LeftLeg  → LeftLowerLeg
//
// A channel is [pitch(x), yaw(y), roll(z)] in degrees:
//   rx < 0 → a hanging limb swings FORWARD (-Z); the torso/head leans BACK
//   rx > 0 → a hanging limb swings BACK; the torso/head leans FORWARD
//   ry > 0 → the torso turns to its RIGHT; a limb points to its own side
//   rz > 0 → the right limb rolls outward (the left one inward)
//   position: y+ = up, z+ = BACKWARD (she faces -Z), x- = her right
import { AnimClip } from './animation.js';
import { rig, buildClip } from './combatanims.js';

// The neutral standing pose: everything at the model's rest position (arms down).
const NEUTRAL = {
  rootPos: [0, 0, 0],
  rootRot: [0, 0, 0],
  body: [0, 0, 0],
  head: [0, 0, 0],
  rArm: [0, 0, 0],
  rFore: [0, 0, 0],
  lArm: [0, 0, 0],
  lFore: [0, 0, 0],
  rLeg: [0, 0, 0],
  rShin: [0, 0, 0],
  lLeg: [0, 0, 0],
  lShin: [0, 0, 0],
};

// Every clip: { loop, length, keys: { boneKey: [[t, value], ...] } }.
export const ACTION_CLIPS = {
  // Using an item: the hand goes down to the pocket/bag, brings the item up to the
  // chest/mouth (with a little nod), holds it there (~450 ms) and comes back down.
  use_item: {
    loop: false,
    length: 1.0,
    keys: {
      rootPos: [[0, NEUTRAL.rootPos], [0.16, [0, -0.1, 0.2]], [0.4, [0, 0, -0.1]], [0.85, [0, 0, -0.1]], [1.0, NEUTRAL.rootPos]],
      rootRot: [[0, NEUTRAL.rootRot], [0.16, [0, -6, 0]], [0.4, [0, 5, 0]], [0.85, [0, 3, 0]], [1.0, NEUTRAL.rootRot]],
      body: [[0, NEUTRAL.body], [0.16, [6, -8, 0]], [0.4, [2, 6, 0]], [0.85, [2, 4, 0]], [1.0, NEUTRAL.body]],
      head: [[0, NEUTRAL.head], [0.16, [14, -6, 0]], [0.4, [-6, 4, 0]], [0.55, [-2, 4, 0]], [0.7, [-8, 4, 0]], [0.85, [-5, 4, 0]], [1.0, NEUTRAL.head]],
      rArm: [[0, NEUTRAL.rArm], [0.16, [16, -8, 10]], [0.4, [-74, -16, 4]], [0.85, [-72, -16, 4]], [1.0, NEUTRAL.rArm]],
      rFore: [[0, NEUTRAL.rFore], [0.16, [-34, 0, 0]], [0.4, [-92, 0, 0]], [0.85, [-92, 0, 0]], [1.0, NEUTRAL.rFore]],
      lArm: [[0, NEUTRAL.lArm], [0.16, [10, 6, -8]], [0.4, [-26, 14, -8]], [0.85, [-26, 14, -8]], [1.0, NEUTRAL.lArm]],
      lFore: [[0, NEUTRAL.lFore], [0.16, [-24, 0, 0]], [0.4, [-56, 0, 0]], [0.85, [-56, 0, 0]], [1.0, NEUTRAL.lFore]],
      rLeg: [[0, NEUTRAL.rLeg], [0.16, [-6, 0, 4]], [0.4, [-4, 0, 4]], [1.0, NEUTRAL.rLeg]],
      lLeg: [[0, NEUTRAL.lLeg], [0.16, [4, 0, -4]], [0.4, [2, 0, -4]], [1.0, NEUTRAL.lLeg]],
    },
  },

  // The crouch before a jump: the knees bend, the center of mass drops, the torso leans
  // forward and the arms pull back to gather momentum. The vertical velocity only comes
  // when this clip is over (behavior.js).
  jump_prep: {
    loop: false,
    length: 0.22,
    keys: {
      rootPos: [[0, NEUTRAL.rootPos], [0.1, [0, -1.1, 0]], [0.22, [0, -1.8, 0]]],
      rootRot: [[0, NEUTRAL.rootRot], [0.22, [0, 0, 0]]],
      body: [[0, NEUTRAL.body], [0.1, [11, 0, 0]], [0.22, [19, 0, 0]]],
      head: [[0, NEUTRAL.head], [0.1, [5, 0, 0]], [0.22, [11, 0, 0]]],
      rArm: [[0, NEUTRAL.rArm], [0.1, [-9, -8, 13]], [0.22, [-18, -16, 26]]],
      rFore: [[0, NEUTRAL.rFore], [0.1, [-23, 0, 0]], [0.22, [-46, 0, 0]]],
      lArm: [[0, NEUTRAL.lArm], [0.1, [-9, 8, -13]], [0.22, [-18, 16, -26]]],
      lFore: [[0, NEUTRAL.lFore], [0.1, [-23, 0, 0]], [0.22, [-46, 0, 0]]],
      rLeg: [[0, NEUTRAL.rLeg], [0.1, [-18, 0, 7]], [0.22, [-36, 0, 14]]],
      rShin: [[0, NEUTRAL.rShin], [0.1, [42, 0, 0]], [0.22, [84, 0, 0]]],
      lLeg: [[0, NEUTRAL.lLeg], [0.1, [-22, 0, -7]], [0.22, [-44, 0, -14]]],
      lShin: [[0, NEUTRAL.lShin], [0.1, [45, 0, 0]], [0.22, [90, 0, 0]]],
    },
  },

  // Knocked up: she is launched backwards, the torso arched, the head back and the
  // arms/legs flailing behind her.
  knockup: {
    loop: false,
    length: 0.5,
    keys: {
      rootPos: [[0, NEUTRAL.rootPos], [0.12, [0, 0.5, 0.6]], [0.5, [0, 0.2, 0.4]]],
      rootRot: [[0, NEUTRAL.rootRot], [0.12, [-10, 0, -6]], [0.5, [-4, 0, -2]]],
      body: [[0, NEUTRAL.body], [0.12, [-22, 0, 0]], [0.5, [-16, 0, 0]]],
      head: [[0, NEUTRAL.head], [0.12, [-30, 0, 0]], [0.5, [-22, 0, 0]]],
      rArm: [[0, NEUTRAL.rArm], [0.12, [42, -14, 44]], [0.5, [30, -10, 34]]],
      rFore: [[0, NEUTRAL.rFore], [0.12, [-24, 0, 0]], [0.5, [-20, 0, 0]]],
      lArm: [[0, NEUTRAL.lArm], [0.12, [42, 14, -44]], [0.5, [30, 10, -34]]],
      lFore: [[0, NEUTRAL.lFore], [0.12, [-24, 0, 0]], [0.5, [-20, 0, 0]]],
      rLeg: [[0, NEUTRAL.rLeg], [0.12, [24, 0, 10]], [0.5, [18, 0, 10]]],
      rShin: [[0, NEUTRAL.rShin], [0.12, [22, 0, 0]], [0.5, [18, 0, 0]]],
      lLeg: [[0, NEUTRAL.lLeg], [0.12, [10, 0, -10]], [0.5, [8, 0, -10]]],
      lShin: [[0, NEUTRAL.lShin], [0.12, [30, 0, 0]], [0.5, [24, 0, 0]]],
    },
  },

  // The hard landing: the body folds on the impact, the knees absorb it.
  fall_hit: {
    loop: false,
    length: 0.28,
    keys: {
      rootPos: [[0, NEUTRAL.rootPos], [0.07, [0, -1.1, 0.4]], [0.28, [0, -0.5, 0.2]]],
      rootRot: [[0, NEUTRAL.rootRot], [0.07, [14, 0, 4]], [0.28, [4, 0, 0]]],
      body: [[0, NEUTRAL.body], [0.07, [26, 0, 0]], [0.28, [12, 0, 0]]],
      head: [[0, NEUTRAL.head], [0.07, [20, 0, 0]], [0.28, [8, 0, 0]]],
      rArm: [[0, NEUTRAL.rArm], [0.07, [-6, -20, 34]], [0.28, [-14, -12, 20]]],
      rFore: [[0, NEUTRAL.rFore], [0.07, [-52, 0, 0]], [0.28, [-40, 0, 0]]],
      lArm: [[0, NEUTRAL.lArm], [0.07, [-6, 20, -34]], [0.28, [-14, 12, -20]]],
      lFore: [[0, NEUTRAL.lFore], [0.07, [-52, 0, 0]], [0.28, [-40, 0, 0]]],
      rLeg: [[0, NEUTRAL.rLeg], [0.07, [-40, 0, 14]], [0.28, [-14, 0, 12]]],
      rShin: [[0, NEUTRAL.rShin], [0.07, [86, 0, 0]], [0.28, [52, 0, 0]]],
      lLeg: [[0, NEUTRAL.lLeg], [0.07, [-46, 0, -14]], [0.28, [-18, 0, -12]]],
      lShin: [[0, NEUTRAL.lShin], [0.07, [92, 0, 0]], [0.28, [58, 0, 0]]],
    },
  },

  // Knocked down: she stays lying on the floor (used with the 'lie' pose).
  knockdown: {
    loop: 'hold_on_last_frame',
    length: 0.5,
    keys: {
      rootPos: [[0, NEUTRAL.rootPos], [0.5, NEUTRAL.rootPos]],
      rootRot: [[0, NEUTRAL.rootRot], [0.5, NEUTRAL.rootRot]],
      body: [[0, NEUTRAL.body], [0.12, [-10, 0, 0]], [0.5, [-6, 0, 0]]],
      head: [[0, NEUTRAL.head], [0.12, [-16, 10, 0]], [0.5, [-10, 6, 0]]],
      rArm: [[0, NEUTRAL.rArm], [0.12, [-16, -12, 26]], [0.5, [-10, -8, 18]]],
      rFore: [[0, NEUTRAL.rFore], [0.12, [-30, 0, 0]], [0.5, [-22, 0, 0]]],
      lArm: [[0, NEUTRAL.lArm], [0.12, [-16, 12, -26]], [0.5, [-10, 8, -18]]],
      lFore: [[0, NEUTRAL.lFore], [0.12, [-30, 0, 0]], [0.5, [-22, 0, 0]]],
      rLeg: [[0, NEUTRAL.rLeg], [0.12, [8, 0, 6]], [0.5, [4, 0, 4]]],
      rShin: [[0, NEUTRAL.rShin], [0.12, [16, 0, 0]], [0.5, [10, 0, 0]]],
      lLeg: [[0, NEUTRAL.lLeg], [0.12, [6, 0, -6]], [0.5, [3, 0, -4]]],
      lShin: [[0, NEUTRAL.lShin], [0.12, [14, 0, 0]], [0.5, [9, 0, 0]]],
    },
  },

  // Getting up: she pushes herself off the floor with the hands and the knees and
  // stands back up (the pose goes back to 'stand' with this clip).
  get_up: {
    loop: false,
    length: 0.75,
    keys: {
      rootPos: [[0, [0, -1.5, 0]], [0.3, [0, -0.9, 0]], [0.55, [0, -0.25, 0]], [0.75, [0, 0, 0]]],
      rootRot: [[0, [0, 0, 0]], [0.75, [0, 0, 0]]],
      body: [[0, [28, 0, 0]], [0.3, [20, 0, 0]], [0.55, [8, 0, 0]], [0.75, [0, 0, 0]]],
      head: [[0, [20, 0, 0]], [0.3, [14, 0, 0]], [0.55, [6, 0, 0]], [0.75, [0, 0, 0]]],
      rArm: [[0, [-34, -10, 16]], [0.3, [-30, -10, 20]], [0.55, [-14, -6, 12]], [0.75, [0, 0, 0]]],
      rFore: [[0, [-46, 0, 0]], [0.3, [-40, 0, 0]], [0.55, [-20, 0, 0]], [0.75, [0, 0, 0]]],
      lArm: [[0, [-34, 10, -16]], [0.3, [-30, 10, -20]], [0.55, [-14, 6, -12]], [0.75, [0, 0, 0]]],
      lFore: [[0, [-46, 0, 0]], [0.3, [-40, 0, 0]], [0.55, [-20, 0, 0]], [0.75, [0, 0, 0]]],
      rLeg: [[0, [-42, 0, 12]], [0.3, [-30, 0, 12]], [0.55, [-10, 0, 10]], [0.75, [0, 0, 0]]],
      rShin: [[0, [88, 0, 0]], [0.3, [62, 0, 0]], [0.55, [24, 0, 0]], [0.75, [0, 0, 0]]],
      lLeg: [[0, [-46, 0, -12]], [0.3, [-34, 0, -12]], [0.55, [-12, 0, -10]], [0.75, [0, 0, 0]]],
      lShin: [[0, [92, 0, 0]], [0.3, [66, 0, 0]], [0.55, [26, 0, 0]], [0.75, [0, 0, 0]]],
    },
  },
};

// The names of the action clips (the tests and the behavior check them).
export const ACTION_CLIP_NAMES = Object.keys(ACTION_CLIPS);

// Adds the action clips to the animator (a clip with the same name is replaced).
// Returns the names registered.
export function addActionClips(boneNames, clips) {
  const r = rig(boneNames);
  if (!r.rArm && !r.lArm) return [];
  const added = [];
  for (const [name, def] of Object.entries(ACTION_CLIPS)) {
    const json = buildClip(def, r);
    if (!Object.keys(json.bones).length) continue;
    clips.set(name, new AnimClip(name, json));
    added.push(name);
  }
  return added;
}
