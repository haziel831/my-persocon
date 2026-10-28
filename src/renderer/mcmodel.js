// Minecraft player model built from a skin (64x64, legacy 64x32, classic or slim arms), with
// procedural Bedrock-style animations, so a plain skin works as a pet (or as the Doll).

const loadImage = (src) => new Promise((ok, fail) => {
  const img = new Image();
  img.onload = () => ok(img);
  img.onerror = () => fail(new Error('Skin inválida'));
  img.src = src;
});

function geometry(legacy, slim) {
  const aw = slim ? 3 : 4;
  const cube = (origin, size, uv, extra = {}) => ({ origin, size, uv, ...extra });
  const over = (origin, size, uv, inflate) => (legacy ? null : cube(origin, size, uv, { inflate }));
  const bone = (name, pivot, cubes, parent) => ({ name, pivot, cubes: cubes.filter(Boolean), ...(parent && { parent }) });
  // The skin's second layer goes in child bones so Acessórios can hide it apart from the body.
  const layer = (name, parent, pivot, c) => c && bone(name, pivot, [c], parent);
  return {
    format_version: '1.12.0',
    'minecraft:geometry': [{
      description: { identifier: 'geometry.pet.minecraft', texture_width: 64, texture_height: legacy ? 32 : 64 },
      bones: [
        bone('Body', [0, 24, 0], [cube([-4, 12, -2], [8, 12, 4], [16, 16])]),
        layer('Jacket', 'Body', [0, 24, 0], over([-4, 12, -2], [8, 12, 4], [16, 32], 0.25)),
        bone('Head', [0, 24, 0], [cube([-4, 24, -4], [8, 8, 8], [0, 0])]),
        layer('Hat', 'Head', [0, 24, 0], cube([-4, 24, -4], [8, 8, 8], [32, 0], { inflate: 0.5 })),
        bone('RightArm', [-5, 22, 0], [cube([-4 - aw, 12, -2], [aw, 12, 4], [40, 16])]),
        layer('RightSleeve', 'RightArm', [-5, 22, 0], over([-4 - aw, 12, -2], [aw, 12, 4], [40, 32], 0.25)),
        bone('LeftArm', [5, 22, 0], [legacy ? cube([4, 12, -2], [aw, 12, 4], [40, 16], { mirror: true }) : cube([4, 12, -2], [aw, 12, 4], [32, 48])]),
        layer('LeftSleeve', 'LeftArm', [5, 22, 0], over([4, 12, -2], [aw, 12, 4], [48, 48], 0.25)),
        bone('RightLeg', [-1.9, 12, 0], [cube([-3.9, 0, -2], [4, 12, 4], [0, 16])]),
        layer('RightPants', 'RightLeg', [-1.9, 12, 0], over([-3.9, 0, -2], [4, 12, 4], [0, 32], 0.25)),
        bone('LeftLeg', [1.9, 12, 0], [legacy ? cube([-0.1, 0, -2], [4, 12, 4], [0, 16], { mirror: true }) : cube([-0.1, 0, -2], [4, 12, 4], [16, 48])]),
        layer('LeftPants', 'LeftLeg', [1.9, 12, 0], over([-0.1, 0, -2], [4, 12, 4], [0, 48], 0.25)),
      ].filter(Boolean),
    }],
  };
}

// Keyframes sampled from f(phase) over one loop (phase 0..2π).
const kf = (len, f, n = 12) => Object.fromEntries(Array.from({ length: n + 1 }, (_, i) => {
  const t = (len * i) / n;
  return [t.toFixed(3), f((i / n) * Math.PI * 2).map((v) => Math.round(v * 100) / 100)];
}));
const still = (v) => ({ '0.0': v });
const S = Math.sin;
const C = Math.cos;

function clip(len, bones, loop = true) {
  const out = { loop, animation_length: len, bones: {} };
  for (const [name, f] of Object.entries(bones)) out.bones[name] = { rotation: typeof f === 'function' ? kf(len, f) : still(f) };
  return out;
}

export const MC_ANIMS = {
  idle: clip(3, { Head: (p) => [S(p) * 2, 0, 0], RightArm: (p) => [0, 0, 3 + S(p) * 2], LeftArm: (p) => [0, 0, -3 - S(p) * 2] }),
  walk: clip(1, { RightLeg: (p) => [S(p) * 35, 0, 0], LeftLeg: (p) => [-S(p) * 35, 0, 0], RightArm: (p) => [-S(p) * 30, 0, 2], LeftArm: (p) => [S(p) * 30, 0, -2], Head: (p) => [C(p * 2) * 2, 0, 0] }),
  run: clip(0.6, { Body: [10, 0, 0], Head: [-10, 0, 0], RightLeg: (p) => [S(p) * 60, 0, 0], LeftLeg: (p) => [-S(p) * 60, 0, 0], RightArm: (p) => [-S(p) * 55, 0, 4], LeftArm: (p) => [S(p) * 55, 0, -4] }),
  sit: clip(2, { RightLeg: [-90, 10, 0], LeftLeg: [-90, -10, 0], RightArm: (p) => [-30 + S(p) * 3, 0, 5], LeftArm: (p) => [-30 - S(p) * 3, 0, -5], Head: (p) => [S(p) * 3, 0, 0] }),
  sleep: clip(3, { RightArm: [0, 0, 6], LeftArm: [0, 0, -6], Body: (p) => [S(p) * 1.5, 0, 0], Head: [0, 0, 8] }),
  climb: clip(0.8, { RightArm: (p) => [-160 + S(p) * 20, 0, 0], LeftArm: (p) => [-160 - S(p) * 20, 0, 0], RightLeg: (p) => [-30 + S(p) * 25, 0, 0], LeftLeg: (p) => [-30 - S(p) * 25, 0, 0] }),
  climbing: clip(0.8, { RightArm: (p) => [-160 + S(p) * 20, 0, 0], LeftArm: (p) => [-160 - S(p) * 20, 0, 0], RightLeg: (p) => [-30 + S(p) * 25, 0, 0], LeftLeg: (p) => [-30 - S(p) * 25, 0, 0] }),
  jump: clip(0.5, { RightArm: [-150, 0, 10], LeftArm: [-150, 0, -10], RightLeg: [-25, 0, 0], LeftLeg: [15, 0, 0] }, 'hold_on_last_frame'),
  fall: clip(0.4, { RightArm: (p) => [0, 0, 110 + S(p) * 25], LeftArm: (p) => [0, 0, -110 - S(p) * 25], RightLeg: (p) => [S(p) * 20, 0, 0], LeftLeg: (p) => [-S(p) * 20, 0, 0] }),
  swing_hand: clip(0.4, { RightArm: (p) => [-60 + C(p) * 60, 0, 0] }, false),
  use_mainhand: clip(0.6, { RightArm: (p) => [-80 + S(p) * 10, -10, 0] }, false),
  eat: clip(0.5, { RightArm: (p) => [-100 + S(p) * 15, -20, 0], Head: (p) => [5 + S(p) * 4, 0, 0] }),
  attacked: clip(0.4, { Body: (p) => [0, 0, S(p) * 8], Head: (p) => [-10, 0, S(p) * 6] }, false),
  extra_aceno: clip(1.2, { RightArm: (p) => [-170, 0, S(p) * 25], Head: (p) => [0, 0, S(p) * 4] }),
  extra_danca: clip(1, { Body: (p) => [0, S(p) * 15, 0], Head: (p) => [0, S(p) * 20, S(p * 2) * 5], RightArm: (p) => [-100 - S(p) * 60, 0, 10], LeftArm: (p) => [-100 + S(p) * 60, 0, -10], RightLeg: (p) => [S(p) * 20, 0, 0], LeftLeg: (p) => [-S(p) * 20, 0, 0] }),
  extra_triste: clip(2, { Head: (p) => [25 + S(p) * 3, 0, 0], Body: [8, 0, 0], RightArm: [5, 0, 2], LeftArm: [5, 0, -2] }),
  extra_bravo: clip(0.5, { RightArm: (p) => [-60 + S(p) * 30, 0, 15], LeftArm: (p) => [-60 - S(p) * 30, 0, -15], Head: (p) => [-5, S(p) * 10, 0] }),
  extra_pulo: clip(0.6, { RightArm: (p) => [-170, 0, 20 + S(p) * 15], LeftArm: (p) => [-170, 0, -20 - S(p) * 15], RightLeg: (p) => [S(p) * 15, 0, 0], LeftLeg: (p) => [-S(p) * 15, 0, 0] }),
  extra_cantar: clip(1.4, { RightArm: (p) => [-110 + S(p) * 8, -25, 0], LeftArm: (p) => [-20 - S(p) * 30, 0, -20 - S(p) * 20], Head: (p) => [-10 + S(p) * 5, S(p) * 10, 0] }),
};

export const MC_ROLES = { extra_aceno: 'emote_pos', extra_danca: 'danca', extra_triste: 'triste', extra_bravo: 'emote_neg', extra_pulo: 'comemorar', extra_cantar: 'cantar' };

// Same shape as the files the host returns for YSM models: { geometry, animations, texture }.
export async function mcModel(skin, slim = false) {
  const img = await loadImage(skin);
  const legacy = img.height === img.width / 2;
  return { geometry: geometry(legacy, slim), animations: [{ file: 'minecraft.animation.json', animations: MC_ANIMS }], texture: skin, mc: true, slim };
}
