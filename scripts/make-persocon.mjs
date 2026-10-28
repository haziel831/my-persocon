// Builds the bundled default model (models/MyPersocon): an anime-style android (big head, hair,
// blinking eyes, ear units) with the
// standard YSM bone names the app drives (Root, AllBody, UpBody, AllHead, Head, arms, legs...),
// a texture painted here (per-face UVs) and every clip the app plays, plus "off" and "boot".
// Run: node scripts/make-persocon.mjs (both units) or node scripts/make-persocon.mjs ninna|aghata
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { writePng } from './png.mjs';

// Two selectable units sharing the body: Ninna (silver hair, white dress, gentle smile) and Aghata
// (black hair and dress with purple details, black eyes, neutral face).
const VARIANTS = {
  ninna: {
    out: 'models/MyPersocon', name: 'Ninna',
    face: { wing: true, blush: true, smile: true, calm: false },
    colors: {},
  },
  aghata: {
    out: 'models/Aghata', name: 'Aghata',
    face: { wing: false, blush: false, smile: false, calm: true },
    colors: {
      hair: [40, 38, 46], hairHi: [84, 80, 98], hairLo: [22, 20, 26],
      cloth: [40, 38, 46], clothHi: [62, 58, 72], clothLo: [26, 24, 30], trim: [150, 92, 214], bow: [176, 112, 240],
      shell: [62, 60, 70], shellLo: [44, 42, 50],
      led: [176, 112, 255], ledHi: [230, 204, 255], ledLo: [110, 62, 180],
      iris: [30, 28, 34], irisHi: [74, 70, 84], irisGlow: [46, 42, 52], pupil: [10, 10, 12], lash: [24, 22, 28], lashLo: [150, 130, 132],
    },
  },
};
const rawArgs = process.argv.slice(2);
const argvRest = [];
let KEY;
for (let i = 0; i < rawArgs.length; i++) {
  const a = rawArgs[i];
  if (a === '--out') { argvRest.push(a, rawArgs[++i]); continue; }
  if (a.startsWith('--')) { argvRest.push(a); continue; }
  if (!KEY) KEY = a;
}
if (!KEY) {
  for (const k of Object.keys(VARIANTS)) execFileSync(process.execPath, [fileURLToPath(import.meta.url), k, ...argvRest], { stdio: 'inherit' });
  process.exit(0);
}
const V = VARIANTS[KEY];
if (!V) throw new Error(`unknown unit: ${KEY}`);

// --preview → ModelPreview; --out <dir> → pasta explícita (antes de colocar na build).
const PREV = 'D:/MyProjects/Apps/Assets/My Tools/HaZ -DevTool - ModelPreview/Models';
const outFlag = argvRest.indexOf('--out');
const OUT = outFlag >= 0 && argvRest[outFlag + 1]
  ? argvRest[outFlag + 1]
  : argvRest.includes('--preview') ? path.join(PREV, path.basename(V.out)) : V.out;
const CREDITS = ` © HaZ - email: haz.midnight@gmail.com. Uso pessoal livre; proibido uso comercial e edição (ver README.txt).`;
const PX = 4; // texture pixels per model unit
const ATLAS_W = 256;

// ---------- palette ----------
const C = {
  shell: [236, 240, 246], shellLo: [208, 216, 228], seam: [148, 160, 180],
  limb: [92, 100, 120], limbHi: [120, 130, 152], joint: [52, 58, 74], jointHi: [78, 86, 106], dark: [34, 38, 50],
  led: [70, 232, 255], ledHi: [214, 252, 255], ledLo: [24, 150, 200], mouth: [196, 98, 112], white: [255, 255, 255],
  skin: [255, 228, 212], skinLo: [238, 196, 182], blush: [255, 166, 178],
  hair: [206, 212, 224], hairHi: [244, 247, 252], hairLo: [150, 156, 174],
  cloth: [246, 245, 240], clothHi: [255, 255, 255], clothLo: [214, 212, 204],
  iris: [44, 124, 226], irisHi: [178, 226, 255], pupil: [20, 50, 128], lash: [58, 56, 70], lashLo: [176, 140, 140],
};
C.trim = C.clothLo;
C.bow = C.led;
C.irisGlow = C.led;
Object.assign(C, V.colors);

// ---------- painters (draw on one face: put(x, y, rgb), w, h) ----------
const lines = (put, w, h, list, col) => {
  for (const [x0, y0, x1, y1] of list) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let i = 0; i <= n; i++) put(Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n), col);
  }
};
const disc = (put, cx, cy, r, col) => {
  for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) put(x, y, col);
};
const ring = (put, cx, cy, r, col) => {
  for (let y = Math.floor(cy - r - 1); y <= cy + r + 1; y++) for (let x = Math.floor(cx - r - 1); x <= cx + r + 1; x++) {
    const d = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
    if (Math.abs(d - r) < 0.7) put(x, y, col);
  }
};
const rect = (put, x0, y0, w, h, col) => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) put(x, y, col); };
const ridges = (step = 2, col = C.jointHi) => (put, w, h) => { for (let y = 1; y < h; y += step) lines(put, w, h, [[0, y, w - 1, y]], col); };
// Face pixels (head 8 x 7.6 units -> 32 x 30 px; the bangs cover rows 0-12): eyes 8 x 10 px,
// wide apart and low on the face.
const EYE_Y = 13;
const EYE_X = 2;
const EYE_W = 8;
const P = {
  // Anime eyes: thick top lash with a wing, rounded iris (dark top, glowing bottom), pupil, a big and
  // a small highlight, a short lower lash; hatched blush under them; tiny mouth.
  face(put, w, h) {
    const eye = (x0, outer) => {
      const y0 = EYE_Y, W = EYE_W;
      const sx = (dx) => (outer < 0 ? x0 + dx : x0 + W - 1 - dx);
      // Calm eyes: flat, slightly lowered upper lid (no arch or wing).
      const lid = F.calm ? 1 : 0;
      rect(put, x0, y0 + 2 + lid, W, 7 - lid, C.iris);
      rect(put, x0, y0 + 5, W, 3, C.irisGlow);
      rect(put, x0, y0 + 8, W, 1, C.irisHi);
      rect(put, x0 + 1, y0 + 9, W - 2, 1, C.irisHi);
      rect(put, x0 + 3, y0 + 4, 2, 4, C.pupil);
      rect(put, Math.min(sx(1), sx(2)), y0 + 3 + lid, 2, 2, C.white);
      put(sx(5), y0 + 8, C.white);
      if (F.calm) {
        rect(put, x0 - 1, y0 + 2, W + 2, 1, C.lash);
        rect(put, x0, y0 + 1, W, 1, C.lash);
      } else {
        rect(put, x0 - 1, y0 + 1, W + 2, 1, C.lash);
        rect(put, x0 + 1, y0, W - 2, 1, C.lash);
      }
      if (F.wing) put(sx(-2), y0, C.lash);
      rect(put, sx(-1), y0 + 2, 1, 3, C.lash);
      rect(put, x0 + 2, y0 + 10, W - 4, 1, C.lashLo);
      if (F.blush) for (const d of [1, 4]) { put(sx(d - 1), y0 + 13, C.blush); put(sx(d), y0 + 12, C.blush); }
    };
    const F = V.face;
    const m = Math.floor((w - 1) / 2);
    eye(EYE_X, -1);
    eye(w - EYE_X - EYE_W, 1);
    if (F.smile) { put(m - 1, 26, C.mouth); put(m + 2, 26, C.mouth); }
    rect(put, m, 27, 2, 1, C.mouth);
  },
  tip(put, w, h) { for (let y = 1; y < h; y += 2) lines(put, w, h, [[0, y, w - 1, y]], C.ledHi); },
  hair(put, w, h) {
    for (let x = 2; x < w - 1; x += 4) lines(put, w, h, [[x, 0, x, h - 1]], C.hairLo);
    const sy = Math.round(h * 0.18);
    if (h > 8) for (let x = 1; x < w - 1; x += 4) rect(put, x, sy, 2, 1, C.hairHi);
  },
  hairTop(put, w, h) {
    lines(put, w, h, [[Math.round(w / 2), 0, Math.round(w / 2), h - 1]], C.hairLo);
    rect(put, Math.round(w * 0.25), Math.round(h * 0.3), Math.round(w * 0.2), 2, C.hairHi);
  },
  // Shine band across the front of the hair.
  bangs(put, w, h) {
    for (let x = 2; x < w - 1; x += 4) lines(put, w, h, [[x, 0, x, h - 1]], C.hairLo);
    for (let x = 3; x < w - 3; x += 4) rect(put, x, Math.round(h * 0.3), 2, 1, C.hairHi);
  },
  // Closed eye: a soft "‿" curve with lashes at the ends.
  lid(put, w, h) {
    const y = Math.round(h * 0.6);
    rect(put, 2, y + 1, w - 4, 1, C.lash);
    put(1, y, C.lash); put(w - 2, y, C.lash);
    put(0, y - 1, C.lash); put(w - 1, y - 1, C.lash);
  },
  ear(put, w, h) {
    rect(put, 0, 0, w, h, C.joint);
    ring(put, (w - 1) / 2, (h - 1) / 2, Math.min(w, h) * 0.32, C.led);
    disc(put, (w - 1) / 2, (h - 1) / 2, Math.min(w, h) * 0.14, C.ledLo);
  },
  chest(put, w, h) {
    const m = (w - 1) / 2;
    lines(put, w, h, [[2, 0, m - 1, 6], [w - 3, 0, m + 1, 6]], C.shellLo);
    lines(put, w, h, [[1, 2, 1, h - 2], [w - 2, 2, w - 2, h - 2]], C.shellLo);
    lines(put, w, h, [[3, h - 6, w - 4, h - 6], [Math.round(m), h - 6, Math.round(m), h - 1]], C.shellLo);
    const cy = Math.round(h * 0.42);
    disc(put, m, cy, 2.6, C.joint);
    disc(put, m, cy, 1.8, C.led);
    put(Math.round(m - 0.6), cy - 1, C.ledHi);
  },
  back(put, w, h) {
    lines(put, w, h, [[Math.round((w - 1) / 2), 0, Math.round((w - 1) / 2), h - 1]], C.shellLo);
    for (let y = 6; y < h - 6; y += 3) lines(put, w, h, [[4, y, Math.round(w / 2) - 3, y], [Math.round(w / 2) + 2, y, w - 5, y]], C.seam);
  },
  pack(put, w, h) { for (let y = 2; y < h - 1; y += 3) lines(put, w, h, [[2, y, w - 3, y]], C.dark); rect(put, w - 4, 1, 2, 2, C.led); },
  hips(put, w, h) { lines(put, w, h, [[2, 0, Math.round(w / 2), h - 2], [w - 3, 0, Math.round(w / 2), h - 2]], C.shellLo); },
  shoulder(put, w, h) { ring(put, (w - 1) / 2, (h - 1) / 2, Math.min(w, h) * 0.3, C.shellLo); },
  forearm(put, w, h) { lines(put, w, h, [[0, h - 4, w - 1, h - 4]], C.led); lines(put, w, h, [[0, 2, w - 1, 2]], C.shellLo); },
  hand(put, w, h) { for (let x = 1; x < w - 1; x += 2) lines(put, w, h, [[x, Math.round(h * 0.45), x, h - 1]], C.skinLo); },
  collar(put, w, h) { lines(put, w, h, [[0, h - 1, w - 1, h - 1]], C.led); },
  // Plain white dress: soft folds, a simple stitched hem and a round neckline with a tiny bow.
  hem(put, w, h) {
    lines(put, w, h, [[0, h - 3, w - 1, h - 3]], C.trim);
    for (let x = 3; x < w - 2; x += 6) lines(put, w, h, [[x, 0, x, h - 5]], C.clothLo);
  },
  folds(put, w, h) { for (let x = 3; x < w - 2; x += 6) lines(put, w, h, [[x, 2, x, h - 1]], C.clothLo); },
  trim(put, w, h) { lines(put, w, h, [[0, h - 1, w - 1, h - 1]], C.trim); },
  bodice(put, w, h) {
    const m = (w - 1) / 2;
    for (let x = 0; x < w; x++) { const d = Math.abs(x - m); if (d < 7) put(x, Math.round(1 + Math.sqrt(49 - d * d) * 0.6), C.trim); }
    rect(put, Math.round(m) - 2, 6, 5, 2, C.bow);
    put(Math.round(m), 8, C.ledLo);
    lines(put, w, h, [[0, h - 3, w - 1, h - 3]], C.trim);
  },
  bodiceBack(put, w, h) { lines(put, w, h, [[Math.round((w - 1) / 2), 2, Math.round((w - 1) / 2), h - 4], [0, h - 3, w - 1, h - 3]], C.trim); },
  thigh(put, w, h) { lines(put, w, h, [[Math.round(w / 2), 3, Math.round(w / 2), h - 3], [1, 3, w - 2, 3]], C.shellLo); },
  shin(put, w, h) {
    lines(put, w, h, [[1, Math.round(h * 0.55), w - 2, Math.round(h * 0.55)]], C.shellLo);
    rect(put, Math.round(w / 2) - 1, 3, 2, 2, C.led);
  },
  shinSide(put, w, h) { lines(put, w, h, [[1, Math.round(h * 0.55), w - 2, Math.round(h * 0.55)]], C.shellLo); },
  foot(put, w, h) { lines(put, w, h, [[0, h - 2, w - 1, h - 2]], C.shellLo); },
};

// ---------- geometry ----------
// paint: { base, all?, north?, south?, east?, west?, up?, down?, sides? (north/south/east/west) }
const SHELL = { base: C.shell };
const JOINT = { base: C.joint, sides: ridges(2) };
const DARK = { base: C.dark };
const bones = [];
const bone = (name, parent, pivot, cubes = [], extra = {}) => bones.push({ name, ...(parent && { parent }), pivot, cubes, ...extra });
const cube = (origin, size, paint = SHELL, extra = {}) => ({ origin, size, paint, ...extra });
const flipX = (c) => ({
  ...c,
  origin: [-(c.origin[0] + c.size[0]), c.origin[1], c.origin[2]],
  ...(c.pivot && { pivot: [-c.pivot[0], c.pivot[1], c.pivot[2]] }),
  ...(c.rotation && { rotation: [c.rotation[0], -c.rotation[1], -c.rotation[2]] }),
});
const flipPivot = (p) => [-p[0], p[1], p[2]];

bone('Root', null, [0, 0, 0]);
// Proportions close to a "4 heads" anime figure: long legs (half the height), short torso, a head a
// bit wider than the body, thick limbs, big boots, layered skirt and long twin tails.
const HIP = 20.6;
bone('AllBody', 'Root', [0, HIP, 0]);
const SKIN = { base: C.skin };
const HAIR = { base: C.hair, sides: P.hair, up: P.hairTop };
const CLOTH = { base: C.cloth, sides: P.folds };
const TIP = { base: C.led, sides: P.tip };
bone('UpBody', 'AllBody', [0, HIP, 0], [
  cube([-3.7, 20.6, -2.5], [7.4, 1.4, 5.0], { base: C.cloth, sides: ridges(4, C.clothLo) }),
  cube([-3.6, 21.9, -2.4], [7.2, 9.4, 4.8], { base: C.cloth, north: P.bodice, south: P.bodiceBack }),
  cube([-3.9, 31.0, -1.9], [7.8, 0.9, 3.8], { base: C.cloth }),
  cube([-4.3, 29.8, -2.6], [8.6, 1.4, 5.2], { base: C.cloth, sides: P.trim }),
  cube([-2.0, 23.6, 2.4], [4.0, 5.0, 0.8], { base: C.joint, south: P.pack }),
]);
bone('AllHead', 'UpBody', [0, 32.4, 0], [cube([-1.3, 31.4, -1.3], [2.6, 2.2, 2.6], SKIN)]);
const HEAD = { x: 4, y0: 33.2, h: 7.6, z: 3.5 };
const hairSideR = [
  cube([-5.4, 33.2, -2.6], [1.5, 8.0, 6.0], HAIR),
  cube([-5.0, 30.2, -3.9], [1.1, 9.0, 1.2], HAIR),
  cube([-4.4, 37.0, -4.3], [1.2, 3.8, 1.0], HAIR),
  cube([-2.3, 37.6, -4.4], [1.1, 3.0, 1.0], HAIR),
];
bone('Head', 'AllHead', [0, 33.8, 0], [
  cube([-HEAD.x, HEAD.y0, -HEAD.z], [HEAD.x * 2, HEAD.h, HEAD.z * 2], { base: C.skin, north: P.face }),
  cube([-4.5, 40.6, -4.0], [9.0, 1.4, 8.6], HAIR),
  cube([-3.5, 41.8, -3.0], [7.0, 1.0, 6.5], HAIR),
  cube([-4.3, 38.0, -4.3], [8.6, 2.8, 0.9], { ...HAIR, north: P.bangs }),
  cube([-0.6, 36.8, -4.5], [1.2, 1.8, 1.0], HAIR),
  cube([-1.4, 37.4, -4.45], [0.9, 1.0, 1.0], HAIR),
  cube([0.5, 37.3, -4.45], [0.9, 1.1, 1.0], HAIR),
  cube([-4.4, 33.6, 3.0], [8.8, 7.4, 2.0], HAIR),
  cube([-3.2, 34.8, 5.0], [6.4, 5.8, 1.0], HAIR),
  cube([-0.3, 42.6, -1.6], [0.6, 2.2, 0.6], HAIR, { pivot: [0, 42.6, -1.3], rotation: [-25, 0, 20] }),
  ...hairSideR, ...hairSideR.map(flipX),
]);
// Eyelids hide inside the face; blinking pushes them out (no clip touches them = eyes open).
const LID = [cube([-4.0, 34.4, -3.48], [2.6, 3.3, 0.1], { base: C.skin, north: P.lid })];
bone('Eyelids', 'Head', [0, 36, -3.5], [...LID, ...LID.map(flipX)]);
// Twin tails down to the shins, ending in glowing data tips; a hair tie on each.
// Each tail is a chain of HairPhys* bones: the app hangs them with gravity, lag and floor contact.
const TIE = cube([-4.7, 34.0, 2.5], [1.8, 1.5, 1.6], { base: C.led });
bone('HairBack', 'Head', [0, 36.0, 4.5], [TIE, flipX(TIE)]);
const TAIL = [
  [[-3.3, 34.6, 3.4], [cube([-4.3, 28.6, 2.9], [3.0, 6.0, 1.0], HAIR)]],
  [[-3.7, 29.6, 4.4], [cube([-5.0, 23.6, 3.9], [2.6, 6.0, 1.0], HAIR)]],
  [[-4.35, 24.6, 4.9], [cube([-5.5, 18.8, 4.4], [2.3, 5.8, 1.0], HAIR)]],
  [[-4.65, 19.2, 5.1], [cube([-5.8, 13.8, 4.6], [2.3, 5.4, 1.0], HAIR), cube([-6.0, 10.4, 4.55], [2.3, 3.6, 1.1], TIP)]],
];
for (const side of ['R', 'L']) {
  TAIL.forEach(([pivot, cubes], i) => {
    const l = side === 'L';
    bone(`HairPhys${side}${i + 1}`, i ? `HairPhys${side}${i}` : 'HairBack', l ? flipPivot(pivot) : pivot, l ? cubes.map(flipX) : cubes);
  });
}
const earR = [
  cube([-6.3, 34.6, -1.8], [1.1, 4.4, 3.6], { base: C.joint, east: P.ear, west: P.ear }),
  cube([-6.2, 38.6, -0.2], [0.7, 3.4, 1.2], SHELL, { pivot: [-5.85, 38.6, 0.4], rotation: [-30, 0, 0] }),
];
bone('EarUnits', 'Head', [0, 37, 0], [...earR, ...earR.map(flipX)]);

bone('Arm', 'UpBody', [0, 31.2, 0]);
const arm = (side) => {
  const f = side === 'Left' ? flipX : (c) => c;
  const fp = side === 'Left' ? flipPivot : (p) => p;
  bone(`${side}Arm`, 'Arm', fp([-5.1, 30.6, 0]), [
    cube([-6.9, 27.4, -1.9], [3.6, 3.4, 3.8], { base: C.cloth, sides: P.trim }),
    cube([-6.4, 24.4, -1.35], [2.6, 3.4, 2.7], SKIN),
  ].map(f));
  bone(`${side}ForeArm`, `${side}Arm`, fp([-5.1, 24.8, 0]), [
    cube([-6.3, 20.0, -1.25], [2.4, 5.0, 2.5], SKIN),
    cube([-6.35, 17.6, -1.3], [2.5, 2.5, 2.6], { base: C.skin, sides: P.hand }),
  ].map(f));
  bone(`${side}HandLocator`, `${side}ForeArm`, fp([-5.1, 18.6, 0]));
};
arm('Right');
arm('Left');

bone('DownBody', 'AllBody', [0, HIP, 0], [
  cube([-4.0, 18.6, -2.5], [8.0, 5.8, 5.0], CLOTH),
]);
// Knee-length A-line skirt in front/back panels (named "Skirt*" so the app never stands or sits
// on them); the panels swing open with the legs.
const half = (o, s, front, paint) => (front ? cube([o[0], o[1], o[2]], [s[0], s[1], -o[2]], paint) : cube([o[0], o[1], 0.02], [s[0], s[1], s[2] + o[2] - 0.02], paint));
for (const front of [true, false]) {
  bone(front ? 'SkirtFront' : 'SkirtBack', 'DownBody', [0, 20.6, 0], [
    half([-4.3, 16.4, -2.8], [8.6, 4.4, 5.6], front, CLOTH),
    half([-4.9, 11.4, -3.3], [9.8, 5.0, 6.6], front, { base: C.cloth, sides: P.hem }),
  ]);
}
bone('Leg', 'DownBody', [0, 21.0, 0]);
const leg = (side) => {
  const f = side === 'Left' ? flipX : (c) => c;
  const fp = side === 'Left' ? flipPivot : (p) => p;
  bone(`${side}Leg`, 'Leg', fp([-2.0, 21.0, 0]), [
    cube([-3.75, 11.4, -1.8], [3.5, 10.0, 3.6], SKIN),
  ].map(f));
  bone(`${side}LowerLeg`, `${side}Leg`, fp([-2.0, 11.7, 0]), [
    cube([-3.6, 6.0, -1.7], [3.2, 6.0, 3.4], SKIN),
  ].map(f));
  bone(`${side}Foot`, `${side}LowerLeg`, fp([-2.0, 2.5, 0]), [
    cube([-3.95, 4.2, -2.0], [3.9, 2.2, 4.0], { base: C.shell, sides: P.collar }),
    cube([-3.85, 0.3, -1.9], [3.7, 4.1, 3.8], { base: C.shell, north: P.shin }),
    cube([-3.8, 0.3, -4.1], [3.6, 2.3, 2.3], { base: C.shell, north: P.foot }),
    cube([-3.95, 0, -4.2], [3.9, 0.5, 6.2], DARK),
  ].map(f));
};
leg('Right');
leg('Left');

// ---------- texture atlas (per-face UVs) ----------
const faceDims = (s) => ({ north: [s[0], s[1]], south: [s[0], s[1]], east: [s[2], s[1]], west: [s[2], s[1]], up: [s[0], s[2]], down: [s[0], s[2]] });
const rects = [];
for (const b of bones) for (const c of b.cubes) for (const [face, [fw, fh]] of Object.entries(faceDims(c.size))) {
  rects.push({ c, face, w: Math.max(1, Math.round(fw * PX)), h: Math.max(1, Math.round(fh * PX)) });
}
const sorted = [...rects].sort((a, b) => b.h - a.h);
let x = 1, y = 1, row = 0;
for (const r of sorted) {
  if (x + r.w + 1 > ATLAS_W) { x = 1; y += row + 2; row = 0; }
  r.x = x; r.y = y;
  x += r.w + 2;
  row = Math.max(row, r.h);
}
const ATLAS_H = 2 ** Math.ceil(Math.log2(y + row + 2));
const data = Buffer.alloc(ATLAS_W * ATLAS_H * 4);
const setPx = (px, py, [r, g, b], a = 255) => {
  if (px < 0 || py < 0 || px >= ATLAS_W || py >= ATLAS_H) return;
  const i = (py * ATLAS_W + px) * 4;
  data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = a;
};
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const mix = (a, b, k) => a.map((v, i) => Math.round(v + (b[i] - v) * k));
for (const r of rects) {
  const p = r.c.paint;
  const base = p.base;
  // 1 px gutter around the face with its base color (no bleeding at nearest filtering).
  for (let yy = -1; yy <= r.h; yy++) for (let xx = -1; xx <= r.w; xx++) setPx(r.x + xx, r.y + yy, base);
  for (let yy = 0; yy < r.h; yy++) for (let xx = 0; xx < r.w; xx++) {
    let col = base;
    const n = (rnd() - 0.5) * 6;
    col = col.map((v) => Math.max(0, Math.min(255, v + n)));
    if (yy === 0 || xx === 0) col = mix(col, C.white, 0.18);
    if (yy === r.h - 1 || xx === r.w - 1) col = mix(col, [0, 0, 0], 0.16);
    setPx(r.x + xx, r.y + yy, col);
  }
  const put = (px, py, col) => { if (px >= 0 && py >= 0 && px < r.w && py < r.h) setPx(r.x + px, r.y + py, col); };
  const side = ['north', 'south', 'east', 'west'].includes(r.face);
  p.all?.(put, r.w, r.h);
  if (side) p.sides?.(put, r.w, r.h);
  p[r.face]?.(put, r.w, r.h);
}

// ---------- geometry json ----------
const geo = {
  format_version: '1.12.0',
  credits: CREDITS,
  'minecraft:geometry': [{
    description: { identifier: 'geometry.mypersocon', texture_width: ATLAS_W / PX, texture_height: ATLAS_H / PX, visible_bounds_width: 4, visible_bounds_height: 3.5, visible_bounds_offset: [0, 1.25, 0] },
    bones: bones.map((b) => ({
      name: b.name,
      ...(b.parent && { parent: b.parent }),
      pivot: b.pivot,
      ...(b.cubes.length && {
        cubes: b.cubes.map((c) => {
          const uv = {};
          for (const r of rects.filter((q) => q.c === c)) uv[r.face] = { uv: [r.x / PX, r.y / PX], uv_size: [r.w / PX, r.h / PX] };
          return { origin: c.origin, size: c.size, ...(c.pivot && { pivot: c.pivot }), ...(c.rotation && { rotation: c.rotation }), uv };
        }),
      }),
    })),
  }],
};

// ---------- animations ----------
const S = Math.sin;
const Cs = Math.cos;
const TAU = Math.PI * 2;
const r2 = (v) => Math.round(v * 100) / 100;
const ease = (t) => t * t * (3 - 2 * t);
// Loop channel sampled from f(phase 0..2π).
const loopKf = (len, f, n = Math.max(24, Math.round(len * 24))) => Object.fromEntries(Array.from({ length: n + 1 }, (_, i) => [((len * i) / n).toFixed(3), f((i / n) * TAU).map(r2)]));
// One-shot channel from key poses [[t, [x, y, z]], ...], eased between keys, sampled at 24 fps.
const tween = (len, keys) => {
  const at = (t) => {
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 0; i < keys.length - 1; i++) {
      const [t0, a] = keys[i];
      const [t1, b] = keys[i + 1];
      if (t <= t1) { const k = ease((t - t0) / (t1 - t0 || 1)); return a.map((v, j) => v + (b[j] - v) * k); }
    }
    return keys[keys.length - 1][1];
  };
  const n = Math.round(len * 24);
  return Object.fromEntries(Array.from({ length: n + 1 }, (_, i) => [(i / 24).toFixed(3), at(i / 24).map(r2)]));
};
// bones: { Bone: { rotation, position } } where a channel is [x,y,z] (still), f(phase) (loop) or [[t, v], ...] (keys).
function clip(len, loop, spec) {
  const out = { loop, animation_length: len, bones: {} };
  for (const [name, chans] of Object.entries(spec)) {
    out.bones[name] = {};
    for (const [ch, v] of Object.entries(chans)) {
      out.bones[name][ch] = typeof v === 'function' ? loopKf(len, v) : !Array.isArray(v) ? v : Array.isArray(v[0]) ? tween(len, v) : v;
    }
  }
  return out;
}
const rot = (v) => ({ rotation: v });
// Eyelids: quick blinks at the given times (raw keyframes, no easing: a blink is a snap).
const SHUT = [0, 0, -0.16];
const OPEN = [0, 0, 0];
const blink = (len, at) => {
  const k = { '0.000': OPEN };
  for (const t of at) Object.assign(k, { [(t - 0.01).toFixed(3)]: OPEN, [t.toFixed(3)]: SHUT, [(t + 0.11).toFixed(3)]: SHUT, [(t + 0.12).toFixed(3)]: OPEN });
  k[len.toFixed(3)] = OPEN;
  return { position: k };
};
const closed = { position: SHUT };
// Long hair trails behind the head: lag of the body's motion.
const hair = (f) => ({ rotation: f });

// Lying on its back (feet at the origin): Root pitched, lifted by half the body depth.
const LIE = -90;
const LIE_Y = 3.4;
// Lying on its side, seen from the front (death): rolled, lifted by the shoulder width, centered.
const ROLL = 90;
const ROLL_Y = 6.6;
const ROLL_X = -21;

// Switched off on its back, limp: head rolled aside, one knee up, arms loose.
const OFFP = {
  Head: [0, 24, 8],
  RightArm: [-8, 0, 26], RightForeArm: [-30, 0, 0],
  LeftArm: [-18, 0, -12], LeftForeArm: [-50, 0, 0],
  RightLeg: [-30, 0, 6], RightLowerLeg: [56, 0, 0], RightFoot: [-14, 0, 0],
  LeftLeg: [-4, -10, -8], LeftLowerLeg: [10, 0, 0], LeftFoot: [22, 0, 0],
  SkirtFront: [-14, 0, 0],
};
const lying = {
  Root: { rotation: [LIE, 0, 0], position: [0, LIE_Y, 0] },
  ...Object.fromEntries(Object.entries(OFFP).map(([k, v]) => [k, rot(v)])),
  Eyelids: closed, HairBack: { rotation: [-8, 0, 0], position: [0, 0, -2.4] },
};
// Gait shared by walk/run: p = 0 has the right leg back and the left leg forward.
const gait = ({ leg, knee, kneeBase, arm, fore, foreBase, lean, bob, skirt }) => ({
  Root: { position: (p) => [S(p) * 0.25, -bob * (0.3 + 0.7 * (Cs(p * 2) + 1) / 2), 0], rotation: (p) => [0, S(p) * 3, 0] },
  UpBody: rot((p) => [lean + Cs(p * 2) * 1, -S(p) * 5, Cs(p) * 1.5]),
  Head: rot((p) => [-lean * 0.6 - Cs(p * 2) * 1.5, S(p) * 4, -Cs(p) * 1.5]),
  HairBack: hair((p) => [lean + 6 + Cs(p * 2 - 0.8) * 3, -S(p - 0.6) * 4, Cs(p - 0.6) * 3]),
  SkirtFront: rot((p) => [-Math.abs(Cs(p)) * leg * skirt, 0, Cs(p) * 2]), SkirtBack: rot((p) => [Math.abs(Cs(p)) * leg * skirt * 0.8, 0, Cs(p) * 2]),
  RightLeg: rot((p) => [Cs(p) * leg - 2, 0, 1]), LeftLeg: rot((p) => [-Cs(p) * leg - 2, 0, -1]),
  RightLowerLeg: rot((p) => [kneeBase + Math.max(0, S(p)) ** 1.4 * knee, 0, 0]),
  LeftLowerLeg: rot((p) => [kneeBase + Math.max(0, -S(p)) ** 1.4 * knee, 0, 0]),
  RightFoot: rot((p) => [-(Cs(p) * leg + kneeBase + Math.max(0, S(p)) ** 1.4 * knee) * 0.6, 0, 0]),
  LeftFoot: rot((p) => [-(-Cs(p) * leg + kneeBase + Math.max(0, -S(p)) ** 1.4 * knee) * 0.6, 0, 0]),
  RightArm: rot((p) => [-Cs(p) * arm + 4, 10, 8]), LeftArm: rot((p) => [Cs(p) * arm + 4, -10, -8]),
  RightForeArm: rot((p) => [-foreBase - Math.max(0, Cs(p)) * fore, 0, 0]), LeftForeArm: rot((p) => [-foreBase - Math.max(0, -Cs(p)) * fore, 0, 0]),
});

const A = {
  // Breathing, a slow weight shift, a curious head tilt and two blinks.
  idle: clip(4, true, {
    Root: { rotation: (p) => [0, 0, S(p) * 1.2] },
    UpBody: { rotation: (p) => [S(p * 2) * 1.2, 0, -S(p) * 1.5], position: (p) => [0, Math.max(0, S(p * 2)) * 0.12, 0] },
    AllHead: rot((p) => [-S(p * 2) * 1.2, S(p) * 4, 0]),
    Head: rot((p) => [S(p * 2) * 1.5, 0, S(p) * 4]),
    HairBack: hair((p) => [2 + S(p * 2 - 0.8) * 2, 0, -S(p - 0.6) * 2]),
    RightArm: rot((p) => [0, 0, 8 + S(p * 2) * 1.5]), LeftArm: rot((p) => [0, 0, -8 - S(p * 2) * 1.5]),
    SkirtFront: rot((p) => [0, 0, -S(p) * 1.2]), SkirtBack: rot((p) => [0, 0, -S(p) * 1.2]),
    RightForeArm: rot((p) => [-10 - S(p * 2) * 3, 0, 0]), LeftForeArm: rot((p) => [-10 - S(p * 2 + 0.5) * 3, 0, 0]),
    RightLeg: rot((p) => [0, 0, Math.max(0, S(p)) * 2]), LeftLeg: rot((p) => [0, 0, -Math.max(0, -S(p)) * 2]),
    Eyelids: blink(4, [1.3, 3.2]),
  }),
  walk: clip(1, true, gait({ leg: 25, knee: 32, kneeBase: 6, arm: 20, fore: 16, foreBase: 14, lean: -1.5, bob: 0.8, skirt: 0.6 })),
  run: clip(0.6, true, gait({ leg: 48, knee: 80, kneeBase: 12, arm: 42, fore: 14, foreBase: 62, lean: 12, bob: 1.4, skirt: 0.5 })),
  // Floor sit hugging the knees: hips rest on the floor, feet tucked in at the same height.
  sit: clip(4, true, {
    UpBody: { rotation: (p) => [14 + S(p * 2) * 1.2, 0, 0], position: (p) => [0, Math.max(0, S(p * 2)) * 0.1, 0] },
    AllHead: rot((p) => [0, S(p) * 6, 0]),
    Head: rot((p) => [-14 + S(p * 2) * 1.5, 0, S(p) * 5]),
    HairBack: hair((p) => [52 + S(p * 2 - 0.8) * 1.5, 0, -S(p - 0.6) * 2]),
    SkirtFront: rot([-112, 0, 0]), SkirtBack: rot([78, 0, 0]),
    RightLeg: rot([-136, 6, 4]), RightLowerLeg: rot([98, 0, 0]), RightFoot: rot([6, 0, 0]),
    LeftLeg: rot([-124, -6, -4]), LeftLowerLeg: rot((p) => [74 + S(p) * 3, 0, 0]), LeftFoot: rot([-4, 0, 0]),
    RightArm: rot((p) => [-62 + S(p * 2) * 1.5, -14, 22]), RightForeArm: rot([-52, 18, 0]),
    LeftArm: rot((p) => [-60 - S(p * 2) * 1.5, 14, -22]), LeftForeArm: rot([-52, -18, 0]),
    Eyelids: blink(4, [2.1]),
  }),
  // Curled on its side (the app lays the body down): knees drawn up, hands by the face, slow breathing.
  sleep: clip(4, true, {
    Root: { rotation: [-10, -76, 18] },
    UpBody: rot((p) => [10 + S(p) * 1.6, -18, -10]),
    DownBody: rot([-28, 0, 0]),
    Head: rot((p) => [6 + S(p) * 1.2, 24, 10]),
    RightArm: rot([-44, -36, 4]), RightForeArm: rot([-118, 0, 0]),
    LeftArm: rot([-56, 12, 26]), LeftForeArm: rot([-126, 0, 0]),
    RightLeg: { rotation: [-36, -28, -6], position: [0, 0, 1] }, RightLowerLeg: rot([94, 4, 0]), RightFoot: rot([16, 0, -12]),
    LeftLeg: { rotation: [-12, -10, -4], position: [0, 0, 1] }, LeftLowerLeg: rot([52, 0, 0]), LeftFoot: rot([36, -4, -2]),
    SkirtFront: rot([-30, 0, 0]), SkirtBack: rot([12, 0, 0]),
    Eyelids: closed, HairBack: rot([-4, 10, 0]),
  }),
  jump: clip(0.5, 'hold_on_last_frame', {
    RightArm: rot([[0, [0, 0, 4]], [0.25, [-30, 0, 70]]]), LeftArm: rot([[0, [0, 0, -4]], [0.25, [-30, 0, -70]]]),
    RightForeArm: rot([[0, [0, 0, 0]], [0.25, [-30, 0, 0]]]), LeftForeArm: rot([[0, [0, 0, 0]], [0.25, [-30, 0, 0]]]),
    RightLeg: rot([[0, [0, 0, 0]], [0.25, [-45, 0, 0]]]), LeftLeg: rot([[0, [0, 0, 0]], [0.25, [-15, 0, 0]]]),
    RightLowerLeg: rot([[0, [0, 0, 0]], [0.25, [60, 0, 0]]]), LeftLowerLeg: rot([[0, [0, 0, 0]], [0.25, [40, 0, 0]]]),
    SkirtFront: rot([[0, [0, 0, 0]], [0.25, [-24, 0, 0]]]), SkirtBack: rot([[0, [0, 0, 0]], [0.25, [8, 0, 0]]]),
    Head: rot([[0, [0, 0, 0]], [0.25, [-8, 0, 0]]]),
    HairBack: rot([[0, [2, 0, 0]], [0.15, [-14, 0, 0]], [0.5, [10, 0, 0]]]),
  }),
  // Upright, facing the wall (seen from the back): hand over hand, the opposite knee steps up while
  // the lower arm pulls, body swaying to the pulling side, head looking up.
  climb: clip(0.9, true, {
    Root: { position: (p) => [S(p) * 0.3, Math.max(0, -Cs(p * 2)) * 0.5, 0], rotation: (p) => [0, 0, S(p) * 3] },
    UpBody: rot((p) => [6, S(p) * 5, S(p) * 3]),
    Head: rot((p) => [-18, -S(p) * 6, 0]),
    HairBack: hair((p) => [10 + S(p * 2 - 0.8) * 3, 0, S(p - 0.5) * 4]),
    RightArm: rot((p) => [-168 + Math.max(0, S(p)) * 58, 0, -14]), LeftArm: rot((p) => [-168 + Math.max(0, -S(p)) * 58, 0, 14]),
    RightForeArm: rot((p) => [-6 - Math.max(0, S(p)) * 72, 0, 0]), LeftForeArm: rot((p) => [-6 - Math.max(0, -S(p)) * 72, 0, 0]),
    RightLeg: rot((p) => [-10 - Math.max(0, S(p)) * 60, 0, 6]), LeftLeg: rot((p) => [-10 - Math.max(0, -S(p)) * 60, 0, -6]),
    RightLowerLeg: rot((p) => [12 + Math.max(0, S(p)) * 80, 0, 0]), LeftLowerLeg: rot((p) => [12 + Math.max(0, -S(p)) * 80, 0, 0]),
    RightFoot: rot((p) => [-Math.max(0, S(p)) * 20, 0, 0]), LeftFoot: rot((p) => [-Math.max(0, -S(p)) * 20, 0, 0]),
    SkirtFront: rot((p) => [-Math.abs(S(p)) * 32, 0, 0]),
  }),
  // Holding on to the wall: both hands up, one knee resting on a ledge, looking around.
  climbing: clip(3, true, {
    Root: { rotation: (p) => [0, 0, S(p) * 1.5] },
    UpBody: rot((p) => [4 + S(p * 2) * 1.5, 0, S(p) * 2]),
    AllHead: rot((p) => [0, S(p) * 28, 0]), Head: rot((p) => [-10 + S(p * 2) * 3, 0, 0]),
    HairBack: hair((p) => [8 + S(p * 2 - 0.8) * 2, -S(p - 0.6) * 6, 0]),
    RightArm: rot((p) => [-160 + S(p * 2) * 3, 0, -16]), LeftArm: rot((p) => [-150 - S(p * 2) * 3, 0, 16]),
    RightForeArm: rot([-14, 0, 0]), LeftForeArm: rot([-34, 0, 0]),
    RightLeg: rot([-48, 0, 6]), RightLowerLeg: rot([70, 0, 0]), LeftLeg: rot((p) => [-6 + S(p) * 3, 0, -4]), LeftLowerLeg: rot([10, 0, 0]),
    SkirtFront: rot([-22, 0, 0]),
    Eyelids: blink(3, [1.4]),
  }),
  attacked: clip(0.45, false, {
    UpBody: rot([[0, [0, 0, 0]], [0.1, [-14, 0, 4]], [0.45, [0, 0, 0]]]),
    Head: rot([[0, [0, 0, 0]], [0.1, [-18, 8, 0]], [0.45, [0, 0, 0]]]),
    HairBack: rot([[0, [0, 0, 0]], [0.15, [18, 0, -6]], [0.45, [0, 0, 0]]]),
    RightArm: rot([[0, [0, 0, 4]], [0.12, [-20, 0, 35]], [0.45, [0, 0, 4]]]), LeftArm: rot([[0, [0, 0, -4]], [0.12, [-20, 0, -35]], [0.45, [0, 0, -4]]]),
    Root: { position: [[0, [0, 0, 0]], [0.1, [0, 0, 1.2]], [0.45, [0, 0, 0]]] },
    Eyelids: { position: [[0, OPEN], [0.05, SHUT], [0.3, SHUT], [0.35, OPEN]] },
  }),
  // Knees give out, then it tips over sideways (reads from the front) and lies switched off.
  death: clip(1.2, 'hold_on_last_frame', {
    Root: {
      rotation: [[0, [0, 0, 0]], [0.35, [0, 0, 0]], [0.95, [0, 0, ROLL]], [1.05, [0, 0, ROLL - 5]], [1.2, [0, 0, ROLL]]],
      position: [[0, [0, 0, 0]], [0.35, [0, -2, 0]], [0.95, [ROLL_X, ROLL_Y, 0]]],
    },
    RightLowerLeg: rot([[0, [0, 0, 0]], [0.35, [40, 0, 0]], [0.95, [26, 0, 0]], [1.2, [30, 0, 0]]]), LeftLowerLeg: rot([[0, [0, 0, 0]], [0.35, [40, 0, 0]], [0.95, [48, 0, 0]], [1.2, [52, 0, 0]]]),
    RightLeg: rot([[0, [0, 0, 0]], [0.35, [-30, 0, 0]], [0.95, [-12, 0, 0]]]), LeftLeg: rot([[0, [0, 0, 0]], [0.35, [-30, 0, 0]], [0.95, [-30, 0, 0]]]),
    SkirtFront: rot([[0, [0, 0, 0]], [0.35, [-18, 0, 0]], [0.95, [-18, 0, 0]]]),
    RightFoot: rot([[0, [0, 0, 0]], [1.0, [18, 0, 0]]]), LeftFoot: rot([[0, [0, 0, 0]], [1.0, [24, 0, 0]]]),
    RightArm: rot([[0, [0, 0, 8]], [0.6, [-40, 0, 30]], [1.0, [-30, 0, 140]], [1.2, [-34, 0, 136]]]), LeftArm: rot([[0, [0, 0, -8]], [0.6, [-40, 0, -30]], [1.0, [-46, 0, -16]], [1.2, [-50, 0, -14]]]),
    RightForeArm: rot([[0, [0, 0, 0]], [1.0, [-40, 0, 0]], [1.2, [-46, 0, 0]]]), LeftForeArm: rot([[0, [0, 0, 0]], [1.0, [-60, 0, 0]], [1.2, [-66, 0, 0]]]),
    Head: rot([[0, [0, 0, 0]], [0.35, [20, 0, 0]], [1.0, [10, 0, -16]], [1.2, [12, 0, -18]]]),
    HairBack: rot([[0, [0, 0, 0]], [0.6, [-10, 0, 0]], [1.0, [34, 0, 0]], [1.2, [30, 0, 0]]]),
    Eyelids: { position: [[0, OPEN], [0.3, OPEN], [0.4, SHUT]] },
  }),
  off: clip(1, 'hold_on_last_frame', lying),
  extra0: clip(1, true, { // comemorar: fist pumps with little hops
    Root: { position: (p) => [0, Math.max(0, S(p * 2)) * 1.6, 0] },
    RightArm: rot((p) => [-10, 0, 145 + S(p * 2) * 12]), LeftArm: rot((p) => [-10, 0, -145 + S(p * 2) * 12]),
    RightForeArm: rot((p) => [-10 - Math.max(0, S(p * 2)) * 25, 0, 0]), LeftForeArm: rot((p) => [-10 - Math.max(0, -S(p * 2)) * 25, 0, 0]),
    RightLowerLeg: rot((p) => [Math.max(0, -S(p * 2)) * 25, 0, 0]), LeftLowerLeg: rot((p) => [Math.max(0, -S(p * 2)) * 25, 0, 0]),
    RightLeg: rot((p) => [-Math.max(0, -S(p * 2)) * 15, 0, 0]), LeftLeg: rot((p) => [-Math.max(0, -S(p * 2)) * 15, 0, 0]),
    Head: rot((p) => [-10, 0, S(p) * 6]),
    HairBack: hair((p) => [4 + Math.max(0, -S(p * 2 - 0.6)) * 14, 0, S(p - 0.5) * 4]),
  }),
  extra1: clip(1.2, true, { // wave
    RightArm: rot((p) => [-14, 0, 138 + S(p) * 16]), RightForeArm: rot((p) => [-22 - S(p) * 8, 0, 0]),
    LeftArm: rot([0, 0, -6]), Head: rot((p) => [-4, 0, S(p) * 6]), UpBody: rot((p) => [0, 0, -S(p) * 2]),
  }),
  extra2: clip(1, true, { // happy sway with hands at the cheeks
    Root: { rotation: (p) => [0, 0, S(p) * 4] },
    Head: rot((p) => [-6, 0, S(p) * 10]),
    RightArm: rot([-62, 0, 34]), LeftArm: rot([-62, 0, -34]),
    RightForeArm: rot((p) => [-100 + S(p) * 6, 0, 0]), LeftForeArm: rot((p) => [-100 - S(p) * 6, 0, 0]),
    RightLeg: rot((p) => [0, 0, Math.max(0, S(p)) * 6]), LeftLeg: rot((p) => [0, 0, -Math.max(0, -S(p)) * 6]),
    HairBack: hair((p) => [2, 0, -S(p - 0.5) * 9]),
    Eyelids: closed,
  }),
  extra3: clip(2.4, true, { // scanning the horizon, hand over the visor
    AllHead: rot((p) => [0, S(p) * 40, 0]), Head: rot([-6, 0, 0]),
    RightArm: rot([-106, 0, 30]), RightForeArm: rot([-90, 0, -60]),
    LeftArm: rot([0, 0, -6]), UpBody: rot((p) => [0, S(p) * 8, 0]),
    HairBack: hair((p) => [2, -S(p - 0.5) * 10, 0]),
    Eyelids: blink(2.4, [1.15]),
  }),
  extra4: clip(0.8, true, { // angry: fists down, head shake, stomp
    RightArm: rot((p) => [-14 + S(p * 2) * 4, 0, 14]), LeftArm: rot((p) => [-14 - S(p * 2) * 4, 0, -14]),
    RightForeArm: rot([-40, 0, 0]), LeftForeArm: rot([-40, 0, 0]),
    Head: rot((p) => [12, S(p * 2) * 10, 0]), UpBody: rot([8, 0, 0]),
    RightLeg: rot((p) => [-Math.max(0, S(p)) * 30, 0, 0]), RightLowerLeg: rot((p) => [Math.max(0, S(p)) * 40, 0, 0]),
    SkirtFront: rot((p) => [-Math.max(0, S(p)) * 18, 0, 0]),
  }),
  extra5: clip(2.4, true, { // sad: drooping head and shoulders
    UpBody: rot((p) => [12 + S(p) * 1.5, 0, 0]), Head: rot((p) => [28 + S(p) * 2, 0, 0]),
    RightArm: rot([6, 0, 2]), LeftArm: rot([6, 0, -2]), RightForeArm: rot([-4, 0, 0]), LeftForeArm: rot([-4, 0, 0]),
    HairBack: hair((p) => [-10 + S(p) * 1.5, 0, 0]),
    Eyelids: blink(2.4, [0.9, 1.3]),
  }),
  extra6: clip(1.25, true, { // robot moves: elbows locked at 90°, arms ticking up and down
    RightArm: rot((p) => [S(p) > 0 ? -90 : 0, 0, 10]), LeftArm: rot((p) => [S(p) > 0 ? 0 : -90, 0, -10]),
    RightForeArm: rot((p) => [S(p) > 0 ? 0 : -90, 0, 0]), LeftForeArm: rot((p) => [S(p) > 0 ? -90 : 0, 0, 0]),
    AllHead: rot((p) => [0, S(p) > 0 ? 20 : -20, 0]), Root: { rotation: (p) => [0, S(p) > 0 ? 8 : -8, 0] },
  }),
  // Caramel Dansen — looped groove: hip sway, bounce, alternating knee dips, scooping arms.
  extra7: clip(2.4, true, (() => {
    const beat = (p) => S(p * 2); // 2 bounces per cycle
    const side = (p) => S(p); // weight left ↔ right
    const scoop = (p, lag) => S(p * 2 - lag); // arm scoop on the beat
    return {
      Root: {
        position: (p) => [side(p) * 1.8, Math.max(0, -beat(p)) * 1.1 + Math.abs(beat(p)) * 0.35, 0],
        rotation: (p) => [2 + beat(p) * 2, side(p) * 18, side(p) * 8],
      },
      UpBody: rot((p) => [4 + beat(p) * 3, side(p) * 14, side(p) * 10]),
      AllHead: rot((p) => [0, side(p) * 12, 0]),
      Head: rot((p) => [-6 + beat(p) * 5, side(p) * 8, side(p) * 10]),
      HairBack: hair((p) => [8 + Math.abs(beat(p - 0.4)) * 12, -side(p - 0.35) * 14, -side(p - 0.35) * 10]),
      // Arms: cross-body scoop then open — classic caramel groove silhouette.
      RightArm: rot((p) => {
        const s = scoop(p, 0);
        return [-55 - s * 55, -20 - Math.max(0, s) * 35, 18 + Math.max(0, -s) * 70];
      }),
      LeftArm: rot((p) => {
        const s = scoop(p, Math.PI);
        return [-55 - s * 55, 20 + Math.max(0, s) * 35, -18 - Math.max(0, -s) * 70];
      }),
      RightForeArm: rot((p) => [-35 - Math.max(0, scoop(p, 0.4)) * 50, 10, 0]),
      LeftForeArm: rot((p) => [-35 - Math.max(0, scoop(p, Math.PI + 0.4)) * 50, -10, 0]),
      // Legs: bent knees with alternating dips (caramel step).
      RightLeg: rot((p) => [-8 - Math.max(0, side(p)) * 22 - Math.max(0, beat(p)) * 8, 4, 6 + Math.max(0, side(p)) * 8]),
      LeftLeg: rot((p) => [-8 - Math.max(0, -side(p)) * 22 - Math.max(0, -beat(p)) * 8, -4, -6 - Math.max(0, -side(p)) * 8]),
      RightLowerLeg: rot((p) => [28 + Math.max(0, side(p)) * 42 + Math.max(0, beat(p)) * 12, 0, 0]),
      LeftLowerLeg: rot((p) => [28 + Math.max(0, -side(p)) * 42 + Math.max(0, -beat(p)) * 12, 0, 0]),
      RightFoot: rot((p) => [-10 - Math.max(0, side(p)) * 8, 0, 0]),
      LeftFoot: rot((p) => [-10 - Math.max(0, -side(p)) * 8, 0, 0]),
      SkirtFront: rot((p) => [-Math.abs(side(p)) * 18 - Math.abs(beat(p)) * 6, 0, side(p) * 4]),
      SkirtBack: rot((p) => [Math.abs(side(p)) * 12, 0, side(p) * 4]),
      Eyelids: blink(2.4, [0.9, 1.85]),
    };
  })()),
  // Disco: arms up, quick hip bounce.
  extra8: clip(1.6, true, (() => {
    const b = (p) => S(p * 2);
    const s = (p) => S(p);
    return {
      Root: { position: (p) => [s(p) * 1.2, Math.abs(b(p)) * 1.4, 0], rotation: (p) => [0, s(p) * 10, s(p) * 6] },
      UpBody: rot((p) => [6 + b(p) * 4, s(p) * 8, s(p) * 12]),
      AllHead: rot((p) => [0, s(p) * 16, 0]),
      Head: rot((p) => [-12 + b(p) * 6, s(p) * 6, s(p) * 8]),
      HairBack: hair((p) => [10 + Math.abs(b(p - 0.3)) * 10, -s(p) * 10, -s(p) * 8]),
      RightArm: rot((p) => [-160 - b(p) * 12, -10, 28 + Math.abs(s(p)) * 18]),
      LeftArm: rot((p) => [-160 + b(p) * 12, 10, -28 - Math.abs(s(p)) * 18]),
      RightForeArm: rot((p) => [-25 - Math.abs(b(p)) * 20, 0, 0]),
      LeftForeArm: rot((p) => [-25 - Math.abs(b(p)) * 20, 0, 0]),
      RightLeg: rot((p) => [-6 - Math.max(0, s(p)) * 18, 0, 8]),
      LeftLeg: rot((p) => [-6 - Math.max(0, -s(p)) * 18, 0, -8]),
      RightLowerLeg: rot((p) => [20 + Math.max(0, s(p)) * 30, 0, 0]),
      LeftLowerLeg: rot((p) => [20 + Math.max(0, -s(p)) * 30, 0, 0]),
      SkirtFront: rot((p) => [-Math.abs(s(p)) * 14, 0, s(p) * 3]),
      SkirtBack: rot((p) => [Math.abs(s(p)) * 10, 0, s(p) * 3]),
      Eyelids: blink(1.6, [0.7, 1.35]),
    };
  })()),
  // Side-step shuffle: weight shifts, arms swing opposite.
  extra9: clip(1.8, true, (() => {
    const s = (p) => S(p);
    const b = (p) => S(p * 2);
    return {
      Root: { position: (p) => [s(p) * 3.2, Math.abs(b(p)) * 0.5, 0], rotation: (p) => [2, s(p) * 22, s(p) * 4] },
      UpBody: rot((p) => [2, s(p) * 18, s(p) * 6]),
      AllHead: rot((p) => [0, -s(p) * 14, 0]),
      Head: rot((p) => [-4 + b(p) * 3, -s(p) * 8, 0]),
      HairBack: hair((p) => [4 + Math.abs(s(p - 0.4)) * 10, s(p) * 12, s(p) * 6]),
      RightArm: rot((p) => [-40 - s(p) * 50, -15, 12 + Math.max(0, -s(p)) * 40]),
      LeftArm: rot((p) => [-40 + s(p) * 50, 15, -12 - Math.max(0, s(p)) * 40]),
      RightForeArm: rot((p) => [-50 - Math.max(0, s(p)) * 25, 0, 0]),
      LeftForeArm: rot((p) => [-50 - Math.max(0, -s(p)) * 25, 0, 0]),
      RightLeg: rot((p) => [-12 - Math.max(0, s(p)) * 28, 8, 10]),
      LeftLeg: rot((p) => [-12 - Math.max(0, -s(p)) * 28, -8, -10]),
      RightLowerLeg: rot((p) => [35 + Math.max(0, s(p)) * 35, 0, 0]),
      LeftLowerLeg: rot((p) => [35 + Math.max(0, -s(p)) * 35, 0, 0]),
      RightFoot: rot((p) => [-8 - Math.max(0, s(p)) * 10, 0, 0]),
      LeftFoot: rot((p) => [-8 - Math.max(0, -s(p)) * 10, 0, 0]),
      SkirtFront: rot((p) => [-Math.abs(s(p)) * 20, 0, s(p) * 5]),
      SkirtBack: rot((p) => [Math.abs(s(p)) * 14, 0, s(p) * 4]),
      Eyelids: blink(1.8, [0.85, 1.5]),
    };
  })()),
  // Wave / idol: body sway, hand waves high, soft knee bounce.
  extra10: clip(2.0, true, (() => {
    const s = (p) => S(p);
    const w = (p) => S(p * 2);
    return {
      Root: { position: (p) => [0, Math.abs(w(p)) * 0.7, 0], rotation: (p) => [0, s(p) * 8, s(p) * 10] },
      UpBody: rot((p) => [4, s(p) * 6, s(p) * 14]),
      AllHead: rot((p) => [0, s(p) * 10, 0]),
      Head: rot((p) => [-8, s(p) * 12, s(p) * 6]),
      HairBack: hair((p) => [6 + Math.abs(w(p - 0.5)) * 8, -s(p) * 8, -s(p) * 10]),
      RightArm: rot((p) => [-150, -5, 40 + w(p) * 28]),
      LeftArm: rot((p) => [-20 - Math.abs(s(p)) * 15, 8, -18]),
      RightForeArm: rot((p) => [-30 - w(p) * 25, 0, 0]),
      LeftForeArm: rot((p) => [-40 - Math.abs(s(p)) * 15, 0, 0]),
      RightLeg: rot((p) => [-4 - Math.max(0, s(p)) * 10, 0, 6]),
      LeftLeg: rot((p) => [-4 - Math.max(0, -s(p)) * 10, 0, -6]),
      RightLowerLeg: rot((p) => [18 + Math.abs(w(p)) * 16, 0, 0]),
      LeftLowerLeg: rot((p) => [18 + Math.abs(w(p)) * 16, 0, 0]),
      SkirtFront: rot((p) => [-Math.abs(s(p)) * 10, 0, s(p) * 4]),
      SkirtBack: rot((p) => [Math.abs(s(p)) * 8, 0, s(p) * 3]),
      Eyelids: blink(2.0, [1.0, 1.7]),
    };
  })()),
  // Twist: torso twist, arms crossed then open, quick steps.
  extra11: clip(1.5, true, (() => {
    const t = (p) => S(p);
    const b = (p) => S(p * 2);
    return {
      Root: { position: (p) => [t(p) * 1.5, Math.abs(b(p)) * 0.9, 0], rotation: (p) => [4, t(p) * 28, t(p) * 5] },
      UpBody: rot((p) => [8 + b(p) * 2, t(p) * 32, t(p) * 8]),
      AllHead: rot((p) => [0, -t(p) * 18, 0]),
      Head: rot((p) => [-6 + b(p) * 4, -t(p) * 10, t(p) * 6]),
      HairBack: hair((p) => [8 + Math.abs(t(p - 0.3)) * 14, t(p) * 16, t(p) * 8]),
      RightArm: rot((p) => [-70 - Math.max(0, t(p)) * 40, -40 + t(p) * 50, 20]),
      LeftArm: rot((p) => [-70 - Math.max(0, -t(p)) * 40, 40 - t(p) * 50, -20]),
      RightForeArm: rot((p) => [-70 - Math.abs(t(p)) * 20, 15, 0]),
      LeftForeArm: rot((p) => [-70 - Math.abs(t(p)) * 20, -15, 0]),
      RightLeg: rot((p) => [-10 - Math.max(0, t(p)) * 20, 6, 12]),
      LeftLeg: rot((p) => [-10 - Math.max(0, -t(p)) * 20, -6, -12]),
      RightLowerLeg: rot((p) => [30 + Math.max(0, t(p)) * 28, 0, 0]),
      LeftLowerLeg: rot((p) => [30 + Math.max(0, -t(p)) * 28, 0, 0]),
      SkirtFront: rot((p) => [-Math.abs(t(p)) * 22, 0, t(p) * 6]),
      SkirtBack: rot((p) => [Math.abs(t(p)) * 16, 0, t(p) * 5]),
      Eyelids: blink(1.5, [0.6, 1.2]),
    };
  })()),
};
// Jam / papel "danca": pool danca + danca2… (pickClip sorteia e evita repetir a atual).
A.danca = A.extra7;
A.danca2 = A.extra8;
A.danca3 = A.extra9;
A.danca4 = A.extra10;
A.danca5 = A.extra11;
A.comemorar = A.extra0;

// ---------- combate por arma (prefixo = tipo: melee_ / espada_ / yoyo_ / queimada_) ----------
// ForeArm X negativo = cotovelo; LowerLeg X positivo = joelho.
const K = {
  body: [8, 0, 0], head: [-4, 6, 0],
  rArm: [-62, -28, 12], rFore: [-78, 14, 0],
  lArm: [-58, 32, -10], lFore: [-92, -12, 0],
  rLeg: [-8, 0, 10], rShin: [38, 0, 0], rFoot: [-12, 0, 0],
  lLeg: [-22, 0, -10], lShin: [52, 0, 0], lFoot: [14, 0, 0],
};
Object.assign(A, {
  // ===== ESPADA DE BAMBOO (kendô) =====
  espada_idle: clip(2.4, true, {
    Root: { rotation: (p) => [0, 0, S(p) * 1], position: (p) => [0, -0.55 + Math.max(0, S(p * 2)) * 0.08, 0] },
    UpBody: rot((p) => [K.body[0] + S(p * 2) * 1.5, S(p) * 2.5, 0]),
    AllHead: rot((p) => [0, S(p) * 3, 0]),
    Head: rot((p) => [K.head[0] + S(p * 2), K.head[1], S(p) * 2]),
    HairBack: hair((p) => [4 + S(p * 2 - 0.7) * 2, 0, -S(p - 0.5) * 2]),
    RightArm: rot((p) => [K.rArm[0] + S(p * 2) * 2, K.rArm[1], K.rArm[2] + S(p) * 1.5]),
    LeftArm: rot((p) => [K.lArm[0] - S(p * 2) * 2, K.lArm[1], K.lArm[2] - S(p) * 1.5]),
    RightForeArm: rot((p) => [K.rFore[0] - S(p * 2) * 4, K.rFore[1], 0]),
    LeftForeArm: rot((p) => [K.lFore[0] + S(p * 2) * 4, K.lFore[1], 0]),
    RightLeg: rot((p) => [K.rLeg[0] + Math.max(0, S(p)) * 3, 0, K.rLeg[2]]),
    LeftLeg: rot((p) => [K.lLeg[0] - Math.max(0, -S(p)) * 3, 0, K.lLeg[2]]),
    RightLowerLeg: rot((p) => [K.rShin[0] + S(p * 2) * 3, 0, 0]),
    LeftLowerLeg: rot((p) => [K.lShin[0] - S(p * 2) * 3, 0, 0]),
    RightFoot: rot(K.rFoot), LeftFoot: rot(K.lFoot),
    SkirtFront: rot([-14, 0, 0]), SkirtBack: rot([8, 0, 0]),
    Eyelids: blink(2.4, [1.1, 2.0]),
  }),
  espada_pulo: clip(0.55, 'hold_on_last_frame', {
    Root: { position: [[0, [0, -0.55, 0]], [0.25, [0, 0.2, 0]], [0.55, [0, 0.1, 0]]] },
    UpBody: rot([[0, K.body], [0.2, [12, 0, 0]], [0.55, [14, 0, 0]]]),
    Head: rot([[0, K.head], [0.25, [-10, 4, 0]]]),
    HairBack: rot([[0, [4, 0, 0]], [0.15, [-14, 0, 0]], [0.55, [10, 0, 0]]]),
    RightArm: rot([[0, K.rArm], [0.2, [-88, -22, 14]], [0.55, [-98, -18, 16]]]),
    LeftArm: rot([[0, K.lArm], [0.2, [-82, 26, -12]], [0.55, [-92, 22, -14]]]),
    RightForeArm: rot([[0, K.rFore], [0.55, [-70, 12, 0]]]), LeftForeArm: rot([[0, K.lFore], [0.55, [-88, -10, 0]]]),
    RightLeg: rot([[0, K.rLeg], [0.25, [-55, 0, 8]], [0.55, [-62, 0, 8]]]),
    LeftLeg: rot([[0, K.lLeg], [0.25, [-35, 0, -8]], [0.55, [-42, 0, -8]]]),
    RightLowerLeg: rot([[0, K.rShin], [0.25, [78, 0, 0]], [0.55, [88, 0, 0]]]),
    LeftLowerLeg: rot([[0, K.lShin], [0.25, [70, 0, 0]], [0.55, [80, 0, 0]]]),
    SkirtFront: rot([[0, [-14, 0, 0]], [0.25, [-32, 0, 0]]]),
  }),
  espada_guarda: clip(1.6, true, {
    Root: { position: (p) => [0, -0.55 + Math.max(0, S(p * 2)) * 0.05, 0] },
    UpBody: rot((p) => [K.body[0] + S(p * 2), S(p) * 2.5, 0]),
    Head: rot((p) => [K.head[0], K.head[1] + S(p) * 2, 0]),
    HairBack: hair((p) => [4 + S(p * 2), 0, 0]),
    RightArm: rot((p) => [K.rArm[0] + S(p) * 1.5, K.rArm[1], K.rArm[2]]),
    LeftArm: rot((p) => [K.lArm[0] - S(p) * 1.5, K.lArm[1], K.lArm[2]]),
    RightForeArm: rot((p) => [K.rFore[0] - S(p * 2) * 3, K.rFore[1], 0]),
    LeftForeArm: rot((p) => [K.lFore[0] + S(p * 2) * 3, K.lFore[1], 0]),
    RightLeg: rot(K.rLeg), LeftLeg: rot(K.lLeg),
    RightLowerLeg: rot((p) => [K.rShin[0] + S(p * 2) * 2, 0, 0]),
    LeftLowerLeg: rot((p) => [K.lShin[0] - S(p * 2) * 2, 0, 0]),
    RightFoot: rot(K.rFoot), LeftFoot: rot(K.lFoot),
    SkirtFront: rot([-14, 0, 0]),
  }),
  // Men: sobe com cotovelos dobrados → corta com snap de antebraço → joelhos no fumikomi.
  espada_men: clip(0.78, false, {
    Root: { position: [[0, [0, -0.55, 0]], [0.28, [0, -0.35, 0]], [0.48, [0, -0.2, 1.2]], [0.78, [0, -0.55, 0]]] },
    UpBody: rot([[0, K.body], [0.22, [4, 0, 0]], [0.4, [12, -8, 0]], [0.55, [16, -10, 0]], [0.78, K.body]]),
    Head: rot([[0, K.head], [0.3, [-14, 4, 0]], [0.52, [4, 4, 0]], [0.78, K.head]]),
    HairBack: rot([[0, [4, 0, 0]], [0.32, [-18, 0, 0]], [0.55, [16, 0, 0]], [0.78, [4, 0, 0]]]),
    RightArm: rot([[0, K.rArm], [0.14, [-100, -20, 10]], [0.3, [-155, -10, 6]], [0.46, [-58, -24, 14]], [0.58, [-42, -18, 10]], [0.78, K.rArm]]),
    LeftArm: rot([[0, K.lArm], [0.14, [-95, 24, -8]], [0.3, [-148, 12, -4]], [0.46, [-68, 28, -8]], [0.58, [-52, 30, -8]], [0.78, K.lArm]]),
    RightForeArm: rot([[0, K.rFore], [0.3, [-55, 8, 0]], [0.46, [-95, 16, 0]], [0.58, [-70, 12, 0]], [0.78, K.rFore]]),
    LeftForeArm: rot([[0, K.lFore], [0.3, [-70, -8, 0]], [0.46, [-105, -10, 0]], [0.58, [-88, -10, 0]], [0.78, K.lFore]]),
    RightLeg: rot([[0, K.rLeg], [0.3, [-4, 0, 10]], [0.5, [-18, 0, 12]], [0.78, K.rLeg]]),
    LeftLeg: rot([[0, K.lLeg], [0.3, [-16, 0, -10]], [0.5, [-30, 0, -12]], [0.78, K.lLeg]]),
    RightLowerLeg: rot([[0, K.rShin], [0.3, [32, 0, 0]], [0.5, [48, 0, 0]], [0.78, K.rShin]]),
    LeftLowerLeg: rot([[0, K.lShin], [0.3, [46, 0, 0]], [0.5, [62, 0, 0]], [0.78, K.lShin]]),
  }),
  espada_kote: clip(0.66, false, {
    Root: { position: [[0, [0, -0.55, 0]], [0.38, [0, -0.25, 1.0]], [0.66, [0, -0.55, 0]]] },
    UpBody: rot([[0, K.body], [0.22, [6, -12, 0]], [0.42, [8, -20, 0]], [0.66, K.body]]),
    Head: rot([[0, K.head], [0.38, [-4, 8, 0]], [0.66, K.head]]),
    RightArm: rot([[0, K.rArm], [0.16, [-78, -40, 16]], [0.38, [-48, -62, 22]], [0.52, [-58, -36, 14]], [0.66, K.rArm]]),
    LeftArm: rot([[0, K.lArm], [0.16, [-72, 18, -6]], [0.38, [-52, 8, 6]], [0.52, [-60, 22, -6]], [0.66, K.lArm]]),
    RightForeArm: rot([[0, K.rFore], [0.38, [-88, 8, 0]], [0.52, [-72, 10, 0]], [0.66, K.rFore]]),
    LeftForeArm: rot([[0, K.lFore], [0.38, [-70, -8, 0]], [0.66, K.lFore]]),
    RightLeg: rot([[0, K.rLeg], [0.38, [-16, 0, 12]], [0.66, K.rLeg]]),
    LeftLeg: rot([[0, K.lLeg], [0.38, [-28, 0, -12]], [0.66, K.lLeg]]),
    RightLowerLeg: rot([[0, K.rShin], [0.38, [50, 0, 0]], [0.66, K.rShin]]),
    LeftLowerLeg: rot([[0, K.lShin], [0.38, [58, 0, 0]], [0.66, K.lShin]]),
  }),
  espada_do: clip(0.72, false, {
    Root: { position: [[0, [0, -0.55, 0]], [0.42, [0.5, -0.2, 0.9]], [0.72, [0, -0.55, 0]]] },
    UpBody: rot([[0, K.body], [0.22, [4, -10, 10]], [0.44, [10, -24, 16]], [0.72, K.body]]),
    Head: rot([[0, K.head], [0.42, [6, -6, 0]], [0.72, K.head]]),
    HairBack: rot([[0, [4, 0, 0]], [0.28, [-12, 0, 0]], [0.48, [10, 10, 0]], [0.72, [4, 0, 0]]]),
    RightArm: rot([[0, K.rArm], [0.18, [-110, -14, 24]], [0.36, [-82, 8, 48]], [0.52, [-42, 18, 38]], [0.72, K.rArm]]),
    LeftArm: rot([[0, K.lArm], [0.18, [-100, 18, -14]], [0.36, [-72, 30, -28]], [0.52, [-48, 38, -22]], [0.72, K.lArm]]),
    RightForeArm: rot([[0, K.rFore], [0.36, [-65, 6, 0]], [0.52, [-90, 8, 0]], [0.72, K.rFore]]),
    LeftForeArm: rot([[0, K.lFore], [0.36, [-80, -10, 0]], [0.52, [-100, -12, 0]], [0.72, K.lFore]]),
    RightLeg: rot([[0, K.rLeg], [0.42, [-14, 0, 12]], [0.72, K.rLeg]]),
    LeftLeg: rot([[0, K.lLeg], [0.42, [-26, 0, -12]], [0.72, K.lLeg]]),
    RightLowerLeg: rot([[0, K.rShin], [0.42, [48, 0, 0]], [0.72, K.rShin]]),
    LeftLowerLeg: rot([[0, K.lShin], [0.42, [60, 0, 0]], [0.72, K.lShin]]),
  }),
  espada_tsuki: clip(0.64, false, {
    Root: { position: [[0, [0, -0.55, 0]], [0.36, [0, -0.15, 1.5]], [0.5, [0, -0.35, 0.5]], [0.64, [0, -0.55, 0]]] },
    UpBody: rot([[0, K.body], [0.28, [14, 0, 0]], [0.42, [18, 0, 0]], [0.64, K.body]]),
    Head: rot([[0, K.head], [0.36, [-8, 4, 0]], [0.64, K.head]]),
    RightArm: rot([[0, K.rArm], [0.22, [-78, -16, 10]], [0.4, [-95, -8, 6]], [0.52, [-68, -24, 12]], [0.64, K.rArm]]),
    LeftArm: rot([[0, K.lArm], [0.22, [-72, 24, -8]], [0.4, [-90, 14, -4]], [0.52, [-62, 30, -10]], [0.64, K.lArm]]),
    // Estocada: cotovelos abrem um pouco, mas ainda dobrados (não braço reto).
    RightForeArm: rot([[0, K.rFore], [0.4, [-42, 10, 0]], [0.52, [-70, 12, 0]], [0.64, K.rFore]]),
    LeftForeArm: rot([[0, K.lFore], [0.4, [-55, -8, 0]], [0.52, [-85, -10, 0]], [0.64, K.lFore]]),
    RightLeg: rot([[0, K.rLeg], [0.36, [-20, 0, 10]], [0.64, K.rLeg]]),
    LeftLeg: rot([[0, K.lLeg], [0.36, [-32, 0, -10]], [0.64, K.lLeg]]),
    RightLowerLeg: rot([[0, K.rShin], [0.36, [52, 0, 0]], [0.64, K.rShin]]),
    LeftLowerLeg: rot([[0, K.lShin], [0.36, [64, 0, 0]], [0.64, K.lShin]]),
  }),
  espada_nuki: clip(0.88, false, {
    Root: {
      rotation: [[0, [0, 0, 0]], [0.26, [0, -20, 0]], [0.58, [0, -8, 0]], [0.88, [0, 0, 0]]],
      position: [[0, [0, -0.55, 0]], [0.26, [-0.9, -0.4, -0.3]], [0.55, [0, -0.15, 1.1]], [0.88, [0, -0.55, 0]]],
    },
    UpBody: rot([[0, K.body], [0.26, [6, -14, 0]], [0.55, [14, -8, 0]], [0.88, K.body]]),
    Head: rot([[0, K.head], [0.26, [-4, -12, 0]], [0.55, [2, 4, 0]], [0.88, K.head]]),
    RightArm: rot([[0, K.rArm], [0.2, [-85, -30, 12]], [0.4, [-150, -10, 6]], [0.58, [-48, -20, 12]], [0.88, K.rArm]]),
    LeftArm: rot([[0, K.lArm], [0.2, [-78, 24, -10]], [0.4, [-142, 12, -4]], [0.58, [-58, 28, -8]], [0.88, K.lArm]]),
    RightForeArm: rot([[0, K.rFore], [0.4, [-50, 8, 0]], [0.58, [-92, 14, 0]], [0.88, K.rFore]]),
    LeftForeArm: rot([[0, K.lFore], [0.4, [-72, -8, 0]], [0.58, [-100, -10, 0]], [0.88, K.lFore]]),
    RightLeg: rot([[0, K.rLeg], [0.26, [-6, 14, 14]], [0.58, [-16, 0, 12]], [0.88, K.rLeg]]),
    LeftLeg: rot([[0, K.lLeg], [0.26, [-18, -10, -14]], [0.58, [-28, 0, -12]], [0.88, K.lLeg]]),
    RightLowerLeg: rot([[0, K.rShin], [0.26, [44, 0, 0]], [0.58, [52, 0, 0]], [0.88, K.rShin]]),
    LeftLowerLeg: rot([[0, K.lShin], [0.26, [56, 0, 0]], [0.58, [64, 0, 0]], [0.88, K.lShin]]),
  }),
  espada_golpe: clip(0.55, false, {
    Root: { position: [[0, [0, -0.55, 0]], [0.3, [0, -0.25, 0.8]], [0.55, [0, -0.55, 0]]] },
    UpBody: rot([[0, K.body], [0.22, [10, -8, 0]], [0.55, K.body]]),
    RightArm: rot([[0, K.rArm], [0.14, [-130, -16, 10]], [0.34, [-48, -22, 12]], [0.55, K.rArm]]),
    LeftArm: rot([[0, K.lArm], [0.14, [-120, 18, -8]], [0.34, [-58, 28, -8]], [0.55, K.lArm]]),
    RightForeArm: rot([[0, K.rFore], [0.34, [-95, 12, 0]], [0.55, K.rFore]]),
    LeftForeArm: rot([[0, K.lFore], [0.34, [-100, -10, 0]], [0.55, K.lFore]]),
    RightLeg: rot([[0, K.rLeg], [0.32, [-16, 0, 10]], [0.55, K.rLeg]]),
    LeftLeg: rot([[0, K.lLeg], [0.32, [-28, 0, -10]], [0.55, K.lLeg]]),
    RightLowerLeg: rot([[0, K.rShin], [0.32, [50, 0, 0]], [0.55, K.rShin]]),
    LeftLowerLeg: rot([[0, K.lShin], [0.32, [60, 0, 0]], [0.55, K.lShin]]),
  }),

  // ===== CORPO A CORPO (melee_) =====
  melee_idle: clip(2.2, true, {
    Root: { rotation: (p) => [0, 0, S(p) * 1.2], position: (p) => [0, -0.45 + Math.max(0, S(p * 2)) * 0.08, 0] },
    UpBody: rot((p) => [6 + S(p * 2) * 1.5, S(p) * 4, 0]),
    Head: rot((p) => [-6 + S(p * 2), S(p) * 5, 0]),
    HairBack: hair((p) => [3 + S(p * 2) * 2, 0, 0]),
    RightArm: rot((p) => [-55 + S(p * 2) * 3, -35, 18]), LeftArm: rot((p) => [-58 - S(p * 2) * 3, 35, -18]),
    RightForeArm: rot((p) => [-100 - S(p * 2) * 4, 0, 0]), LeftForeArm: rot((p) => [-100 + S(p * 2) * 4, 0, 0]),
    RightLeg: rot([-6, 0, 12]), LeftLeg: rot([-14, 0, -12]),
    RightLowerLeg: rot([36, 0, 0]), LeftLowerLeg: rot([42, 0, 0]),
    SkirtFront: rot([-12, 0, 0]),
    Eyelids: blink(2.2, [1.0]),
  }),
  melee_guarda: clip(1.4, true, {
    Root: { position: [0, -0.5, 0] },
    UpBody: rot((p) => [8, S(p) * 3, 0]), Head: rot((p) => [-8, S(p) * 4, 0]),
    RightArm: rot([-70, -40, 16]), LeftArm: rot([-70, 40, -16]),
    RightForeArm: rot([-105, 0, 0]), LeftForeArm: rot([-105, 0, 0]),
    RightLeg: rot([-10, 0, 14]), LeftLeg: rot([-16, 0, -14]),
    RightLowerLeg: rot([40, 0, 0]), LeftLowerLeg: rot([46, 0, 0]),
  }),
  melee_soco: clip(0.5, false, {
    Root: { position: [[0, [0, -0.45, 0]], [0.28, [0, -0.2, 0.9]], [0.5, [0, -0.45, 0]]] },
    UpBody: rot([[0, [6, 0, 0]], [0.28, [8, -22, 0]], [0.5, [6, 0, 0]]]),
    Head: rot([[0, [-6, 0, 0]], [0.28, [-4, -8, 0]], [0.5, [-6, 0, 0]]]),
    RightArm: rot([[0, [-55, -35, 18]], [0.18, [-40, -25, 10]], [0.32, [-85, -8, 6]], [0.5, [-55, -35, 18]]]),
    LeftArm: rot([[0, [-58, 35, -18]], [0.32, [-50, 30, -14]], [0.5, [-58, 35, -18]]]),
    RightForeArm: rot([[0, [-100, 0, 0]], [0.18, [-110, 0, 0]], [0.32, [-35, 0, 0]], [0.5, [-100, 0, 0]]]),
    LeftForeArm: rot([-100, 0, 0]),
    RightLeg: rot([[0, [-6, 0, 12]], [0.3, [-18, 0, 12]], [0.5, [-6, 0, 12]]]),
    LeftLeg: rot([[0, [-14, 0, -12]], [0.3, [-22, 0, -12]], [0.5, [-14, 0, -12]]]),
    RightLowerLeg: rot([[0, [36, 0, 0]], [0.3, [48, 0, 0]], [0.5, [36, 0, 0]]]),
    LeftLowerLeg: rot([42, 0, 0]),
  }),
  melee_gancho: clip(0.55, false, {
    Root: { position: [[0, [0, -0.45, 0]], [0.3, [0, -0.15, 0.7]], [0.55, [0, -0.45, 0]]] },
    UpBody: rot([[0, [6, 0, 0]], [0.3, [10, -35, 8]], [0.55, [6, 0, 0]]]),
    RightArm: rot([[0, [-55, -35, 18]], [0.2, [-70, -55, 30]], [0.35, [-50, 25, 40]], [0.55, [-55, -35, 18]]]),
    LeftArm: rot([[0, [-58, 35, -18]], [0.35, [-45, 25, -12]], [0.55, [-58, 35, -18]]]),
    RightForeArm: rot([[0, [-100, 0, 0]], [0.25, [-115, 0, 0]], [0.4, [-70, 0, 0]], [0.55, [-100, 0, 0]]]),
    LeftForeArm: rot([-95, 0, 0]),
    RightLeg: rot([[0, [-6, 0, 12]], [0.3, [-14, 0, 14]], [0.55, [-6, 0, 12]]]),
    LeftLeg: rot([-14, 0, -12]),
    RightLowerLeg: rot([[0, [36, 0, 0]], [0.3, [50, 0, 0]], [0.55, [36, 0, 0]]]),
    LeftLowerLeg: rot([42, 0, 0]),
  }),
  melee_chute: clip(0.65, false, {
    Root: { position: [[0, [0, -0.45, 0]], [0.35, [0, -0.1, 0.5]], [0.65, [0, -0.45, 0]]] },
    UpBody: rot([[0, [6, 0, 0]], [0.35, [4, 12, 0]], [0.65, [6, 0, 0]]]),
    RightArm: rot([[0, [-55, -35, 18]], [0.35, [-20, -20, 25]], [0.65, [-55, -35, 18]]]),
    LeftArm: rot([[0, [-58, 35, -18]], [0.35, [-80, 20, -20]], [0.65, [-58, 35, -18]]]),
    RightForeArm: rot([-90, 0, 0]), LeftForeArm: rot([-90, 0, 0]),
    RightLeg: rot([[0, [-6, 0, 12]], [0.2, [-25, 0, 8]], [0.4, [-95, 0, 10]], [0.65, [-6, 0, 12]]]),
    LeftLeg: rot([[0, [-14, 0, -12]], [0.4, [-8, 0, -16]], [0.65, [-14, 0, -12]]]),
    RightLowerLeg: rot([[0, [36, 0, 0]], [0.2, [70, 0, 0]], [0.4, [20, 0, 0]], [0.65, [36, 0, 0]]]),
    LeftLowerLeg: rot([[0, [42, 0, 0]], [0.4, [50, 0, 0]], [0.65, [42, 0, 0]]]),
  }),
  melee_combo: clip(0.85, false, {
    Root: { position: [[0, [0, -0.45, 0]], [0.25, [0, -0.25, 0.7]], [0.5, [0, -0.25, 0.9]], [0.85, [0, -0.45, 0]]] },
    UpBody: rot([[0, [6, 0, 0]], [0.25, [8, -18, 0]], [0.5, [8, 18, 0]], [0.85, [6, 0, 0]]]),
    RightArm: rot([[0, [-55, -35, 18]], [0.22, [-90, -10, 8]], [0.4, [-50, -30, 16]], [0.55, [-40, -20, 10]], [0.85, [-55, -35, 18]]]),
    LeftArm: rot([[0, [-58, 35, -18]], [0.3, [-50, 30, -14]], [0.55, [-88, 12, -8]], [0.85, [-58, 35, -18]]]),
    RightForeArm: rot([[0, [-100, 0, 0]], [0.22, [-40, 0, 0]], [0.4, [-100, 0, 0]], [0.85, [-100, 0, 0]]]),
    LeftForeArm: rot([[0, [-100, 0, 0]], [0.55, [-40, 0, 0]], [0.85, [-100, 0, 0]]]),
    RightLeg: rot([[0, [-6, 0, 12]], [0.3, [-16, 0, 12]], [0.85, [-6, 0, 12]]]),
    LeftLeg: rot([[0, [-14, 0, -12]], [0.55, [-20, 0, -12]], [0.85, [-14, 0, -12]]]),
    RightLowerLeg: rot([40, 0, 0]), LeftLowerLeg: rot([44, 0, 0]),
  }),
  melee_upper: clip(0.58, false, {
    Root: { position: [[0, [0, -0.45, 0]], [0.25, [0, -0.55, 0.3]], [0.4, [0, -0.1, 0.8]], [0.58, [0, -0.45, 0]]] },
    UpBody: rot([[0, [6, 0, 0]], [0.25, [14, -8, 0]], [0.4, [-4, -10, 0]], [0.58, [6, 0, 0]]]),
    RightArm: rot([[0, [-55, -35, 18]], [0.22, [-30, -20, 8]], [0.4, [-140, -5, 10]], [0.58, [-55, -35, 18]]]),
    LeftArm: rot([[0, [-58, 35, -18]], [0.4, [-45, 25, -12]], [0.58, [-58, 35, -18]]]),
    RightForeArm: rot([[0, [-100, 0, 0]], [0.22, [-115, 0, 0]], [0.4, [-50, 0, 0]], [0.58, [-100, 0, 0]]]),
    LeftForeArm: rot([-95, 0, 0]),
    RightLeg: rot([[0, [-6, 0, 12]], [0.25, [-20, 0, 10]], [0.4, [-12, 0, 10]], [0.58, [-6, 0, 12]]]),
    LeftLeg: rot([-14, 0, -12]),
    RightLowerLeg: rot([[0, [36, 0, 0]], [0.25, [55, 0, 0]], [0.58, [36, 0, 0]]]),
    LeftLowerLeg: rot([42, 0, 0]),
  }),
  melee_passo: clip(0.6, false, {
    Root: { position: [[0, [0, -0.45, 0]], [0.35, [0, -0.2, 1.2]], [0.6, [0, -0.45, 0]]] },
    UpBody: rot([[0, [6, 0, 0]], [0.35, [10, -12, 0]], [0.6, [6, 0, 0]]]),
    RightArm: rot([[0, [-55, -35, 18]], [0.25, [-45, -25, 12]], [0.4, [-88, -8, 6]], [0.6, [-55, -35, 18]]]),
    LeftArm: rot([[0, [-58, 35, -18]], [0.4, [-50, 28, -14]], [0.6, [-58, 35, -18]]]),
    RightForeArm: rot([[0, [-100, 0, 0]], [0.4, [-45, 0, 0]], [0.6, [-100, 0, 0]]]),
    LeftForeArm: rot([-100, 0, 0]),
    RightLeg: rot([[0, [-6, 0, 12]], [0.35, [-22, 0, 12]], [0.6, [-6, 0, 12]]]),
    LeftLeg: rot([[0, [-14, 0, -12]], [0.35, [-24, 0, -12]], [0.6, [-14, 0, -12]]]),
    RightLowerLeg: rot([[0, [36, 0, 0]], [0.35, [52, 0, 0]], [0.6, [36, 0, 0]]]),
    LeftLowerLeg: rot([[0, [42, 0, 0]], [0.35, [55, 0, 0]], [0.6, [42, 0, 0]]]),
  }),

  // ===== YOYO / SYNTOYO (yoyo_) =====
  yoyo_idle: clip(2, true, {
    Root: { position: (p) => [0, -0.2 + Math.max(0, S(p * 2)) * 0.1, 0], rotation: (p) => [0, S(p) * 6, 0] },
    UpBody: rot((p) => [4, S(p * 2) * 8, S(p) * 3]), Head: rot((p) => [-4, S(p) * 10, 0]),
    HairBack: hair((p) => [5 + Math.abs(S(p * 2)) * 4, S(p) * 6, 0]),
    RightArm: rot((p) => [-100 + S(p * 2) * 25, -10, 20 + S(p) * 15]),
    LeftArm: rot((p) => [-30 - S(p) * 20, 10, -25]),
    RightForeArm: rot((p) => [-40 - Math.abs(S(p * 2)) * 35, 0, 0]),
    LeftForeArm: rot([-50, 0, 0]),
    RightLeg: rot((p) => [S(p) * 12, 0, 6]), LeftLeg: rot((p) => [-S(p) * 12, 0, -6]),
    RightLowerLeg: rot((p) => [20 + Math.max(0, S(p)) * 25, 0, 0]),
    LeftLowerLeg: rot((p) => [20 + Math.max(0, -S(p)) * 25, 0, 0]),
    SkirtFront: rot((p) => [-Math.abs(S(p)) * 12, 0, 0]),
  }),
  yoyo_chicote: clip(0.55, false, {
    Root: { position: [[0, [0, -0.2, 0]], [0.3, [0, -0.05, 0.6]], [0.55, [0, -0.2, 0]]] },
    UpBody: rot([[0, [4, 0, 0]], [0.25, [6, -20, 0]], [0.55, [4, 0, 0]]]),
    RightArm: rot([[0, [-100, -10, 20]], [0.15, [-140, -20, 15]], [0.35, [-50, 10, 30]], [0.55, [-100, -10, 20]]]),
    LeftArm: rot([[0, [-30, 10, -25]], [0.35, [-45, 15, -20]], [0.55, [-30, 10, -25]]]),
    RightForeArm: rot([[0, [-50, 0, 0]], [0.15, [-90, 0, 0]], [0.35, [-20, 0, 0]], [0.55, [-50, 0, 0]]]),
    LeftForeArm: rot([-50, 0, 0]),
    RightLeg: rot([[0, [0, 0, 6]], [0.3, [-12, 0, 8]], [0.55, [0, 0, 6]]]),
    LeftLeg: rot([-8, 0, -6]),
    RightLowerLeg: rot([[0, [22, 0, 0]], [0.3, [40, 0, 0]], [0.55, [22, 0, 0]]]),
    LeftLowerLeg: rot([28, 0, 0]),
  }),
  yoyo_orbita: clip(1.1, true, {
    Root: { rotation: (p) => [0, S(p) * 25, 0], position: (p) => [S(p) * 0.4, -0.15, 0] },
    UpBody: rot((p) => [4, S(p) * 15, S(p * 2) * 4]), Head: rot((p) => [-4, S(p) * 20, 0]),
    RightArm: rot((p) => [-110, S(p) * 40, 25 + S(p * 2) * 20]),
    LeftArm: rot((p) => [-40, -S(p) * 20, -20]),
    RightForeArm: rot((p) => [-55 - S(p * 2) * 20, 0, 0]),
    LeftForeArm: rot([-45, 0, 0]),
    RightLeg: rot((p) => [S(p) * 15, 0, 6]), LeftLeg: rot((p) => [-S(p) * 15, 0, -6]),
    RightLowerLeg: rot((p) => [25 + Math.abs(S(p)) * 20, 0, 0]),
    LeftLowerLeg: rot((p) => [25 + Math.abs(Cs(p)) * 20, 0, 0]),
  }),
  yoyo_piao: clip(0.9, true, {
    Root: { rotation: (p) => [0, (p / TAU) * 360, 0], position: (p) => [0, -0.1 + Math.abs(S(p * 2)) * 0.5, 0] },
    UpBody: rot((p) => [6, S(p * 2) * 10, 0]), Head: rot((p) => [-8, 0, S(p) * 8]),
    RightArm: rot([-90, 0, 70]), LeftArm: rot([-40, 20, -30]),
    RightForeArm: rot([-30, 0, 0]), LeftForeArm: rot([-60, 0, 0]),
    RightLeg: rot((p) => [-20 - Math.abs(S(p * 2)) * 15, 0, 8]),
    LeftLeg: rot((p) => [-10 + Math.abs(S(p * 2)) * 10, 0, -8]),
    RightLowerLeg: rot((p) => [50 + Math.abs(S(p * 2)) * 20, 0, 0]),
    LeftLowerLeg: rot([35, 0, 0]),
    SkirtFront: rot((p) => [-20 - Math.abs(S(p * 2)) * 15, 0, 0]),
  }),
  yoyo_serpente: clip(0.8, false, {
    Root: { position: [[0, [0, -0.2, 0]], [0.25, [0, -0.1, 0.4]], [0.5, [0, -0.05, 0.9]], [0.8, [0, -0.2, 0]]] },
    UpBody: rot([[0, [4, 0, 0]], [0.25, [6, 15, 0]], [0.5, [8, -15, 0]], [0.8, [4, 0, 0]]]),
    RightArm: rot([[0, [-100, -10, 20]], [0.2, [-120, 30, 25]], [0.4, [-80, -40, 20]], [0.6, [-50, 20, 35]], [0.8, [-100, -10, 20]]]),
    LeftArm: rot([[0, [-30, 10, -25]], [0.5, [-50, 15, -20]], [0.8, [-30, 10, -25]]]),
    RightForeArm: rot([[0, [-50, 0, 0]], [0.3, [-85, 0, 0]], [0.55, [-25, 0, 0]], [0.8, [-50, 0, 0]]]),
    LeftForeArm: rot([-50, 0, 0]),
    RightLeg: rot([[0, [0, 0, 6]], [0.5, [-14, 0, 8]], [0.8, [0, 0, 6]]]),
    LeftLeg: rot([-8, 0, -6]),
    RightLowerLeg: rot([[0, [22, 0, 0]], [0.5, [42, 0, 0]], [0.8, [22, 0, 0]]]),
    LeftLowerLeg: rot([28, 0, 0]),
  }),
  yoyo_supernova: clip(0.95, false, {
    Root: { position: [[0, [0, -0.2, 0]], [0.35, [0, 0.4, 0]], [0.55, [0, -0.1, 0.5]], [0.95, [0, -0.2, 0]]] },
    UpBody: rot([[0, [4, 0, 0]], [0.35, [-8, 0, 0]], [0.55, [12, 0, 0]], [0.95, [4, 0, 0]]]),
    Head: rot([[0, [-4, 0, 0]], [0.35, [-16, 0, 0]], [0.55, [6, 0, 0]], [0.95, [-4, 0, 0]]]),
    HairBack: rot([[0, [4, 0, 0]], [0.35, [-20, 0, 0]], [0.6, [18, 0, 0]], [0.95, [4, 0, 0]]]),
    RightArm: rot([[0, [-100, -10, 20]], [0.3, [-170, 0, 15]], [0.55, [-40, 0, 40]], [0.95, [-100, -10, 20]]]),
    LeftArm: rot([[0, [-30, 10, -25]], [0.3, [-160, 0, -15]], [0.55, [-40, 0, -40]], [0.95, [-30, 10, -25]]]),
    RightForeArm: rot([[0, [-50, 0, 0]], [0.3, [-20, 0, 0]], [0.55, [-70, 0, 0]], [0.95, [-50, 0, 0]]]),
    LeftForeArm: rot([[0, [-50, 0, 0]], [0.3, [-20, 0, 0]], [0.55, [-70, 0, 0]], [0.95, [-50, 0, 0]]]),
    RightLeg: rot([[0, [0, 0, 6]], [0.35, [-40, 0, 8]], [0.55, [-15, 0, 6]], [0.95, [0, 0, 6]]]),
    LeftLeg: rot([[0, [-8, 0, -6]], [0.35, [-35, 0, -8]], [0.55, [-12, 0, -6]], [0.95, [-8, 0, -6]]]),
    RightLowerLeg: rot([[0, [22, 0, 0]], [0.35, [70, 0, 0]], [0.55, [40, 0, 0]], [0.95, [22, 0, 0]]]),
    LeftLowerLeg: rot([[0, [28, 0, 0]], [0.35, [65, 0, 0]], [0.55, [40, 0, 0]], [0.95, [28, 0, 0]]]),
  }),

  // ===== BOLA DE QUEIMADA (queimada_) =====
  queimada_idle: clip(2, true, {
    Root: { position: (p) => [0, -0.35 + Math.max(0, S(p * 2)) * 0.06, 0] },
    UpBody: rot((p) => [6 + S(p * 2), S(p) * 3, 0]), Head: rot((p) => [-5, S(p) * 6, 0]),
    RightArm: rot((p) => [-70 + S(p * 2) * 4, -25, 15]), LeftArm: rot((p) => [-40, 15, -20]),
    RightForeArm: rot((p) => [-85 - S(p * 2) * 5, 10, 0]), LeftForeArm: rot([-55, 0, 0]),
    RightLeg: rot([-10, 0, 10]), LeftLeg: rot([-16, 0, -10]),
    RightLowerLeg: rot([40, 0, 0]), LeftLowerLeg: rot([46, 0, 0]),
    SkirtFront: rot([-12, 0, 0]),
    Eyelids: blink(2, [1.2]),
  }),
  queimada_reto: clip(0.6, false, {
    Root: { position: [[0, [0, -0.35, 0]], [0.28, [0, -0.15, 1.0]], [0.6, [0, -0.35, 0]]] },
    UpBody: rot([[0, [6, 0, 0]], [0.2, [10, -8, 0]], [0.35, [8, -15, 0]], [0.6, [6, 0, 0]]]),
    RightArm: rot([[0, [-70, -25, 15]], [0.18, [-140, -15, 10]], [0.35, [-55, 5, 20]], [0.6, [-70, -25, 15]]]),
    LeftArm: rot([[0, [-40, 15, -20]], [0.35, [-55, 20, -15]], [0.6, [-40, 15, -20]]]),
    RightForeArm: rot([[0, [-85, 10, 0]], [0.18, [-100, 5, 0]], [0.35, [-25, 0, 0]], [0.6, [-85, 10, 0]]]),
    LeftForeArm: rot([-55, 0, 0]),
    RightLeg: rot([[0, [-10, 0, 10]], [0.3, [-22, 0, 10]], [0.6, [-10, 0, 10]]]),
    LeftLeg: rot([[0, [-16, 0, -10]], [0.3, [-24, 0, -10]], [0.6, [-16, 0, -10]]]),
    RightLowerLeg: rot([[0, [40, 0, 0]], [0.3, [55, 0, 0]], [0.6, [40, 0, 0]]]),
    LeftLowerLeg: rot([46, 0, 0]),
  }),
  queimada_curva: clip(0.65, false, {
    Root: { position: [[0, [0, -0.35, 0]], [0.3, [0.3, -0.1, 0.8]], [0.65, [0, -0.35, 0]]] },
    UpBody: rot([[0, [6, 0, 0]], [0.25, [8, 18, 8]], [0.4, [6, -22, -6]], [0.65, [6, 0, 0]]]),
    RightArm: rot([[0, [-70, -25, 15]], [0.2, [-120, 25, 20]], [0.4, [-45, -35, 25]], [0.65, [-70, -25, 15]]]),
    LeftArm: rot([[0, [-40, 15, -20]], [0.4, [-50, 20, -15]], [0.65, [-40, 15, -20]]]),
    RightForeArm: rot([[0, [-85, 10, 0]], [0.2, [-95, 0, 0]], [0.4, [-30, 5, 0]], [0.65, [-85, 10, 0]]]),
    LeftForeArm: rot([-55, 0, 0]),
    RightLeg: rot([[0, [-10, 0, 10]], [0.35, [-18, 8, 12]], [0.65, [-10, 0, 10]]]),
    LeftLeg: rot([-16, 0, -10]),
    RightLowerLeg: rot([[0, [40, 0, 0]], [0.35, [52, 0, 0]], [0.65, [40, 0, 0]]]),
    LeftLowerLeg: rot([46, 0, 0]),
  }),
  queimada_alto: clip(0.7, false, {
    Root: { position: [[0, [0, -0.35, 0]], [0.25, [0, -0.5, 0.2]], [0.45, [0, 0.1, 0.6]], [0.7, [0, -0.35, 0]]] },
    UpBody: rot([[0, [6, 0, 0]], [0.25, [16, 0, 0]], [0.45, [-2, -8, 0]], [0.7, [6, 0, 0]]]),
    Head: rot([[0, [-5, 0, 0]], [0.25, [8, 0, 0]], [0.45, [-12, 0, 0]], [0.7, [-5, 0, 0]]]),
    RightArm: rot([[0, [-70, -25, 15]], [0.22, [-40, -20, 10]], [0.45, [-160, -5, 12]], [0.7, [-70, -25, 15]]]),
    LeftArm: rot([[0, [-40, 15, -20]], [0.45, [-50, 15, -18]], [0.7, [-40, 15, -20]]]),
    RightForeArm: rot([[0, [-85, 10, 0]], [0.22, [-100, 5, 0]], [0.45, [-40, 0, 0]], [0.7, [-85, 10, 0]]]),
    LeftForeArm: rot([-55, 0, 0]),
    RightLeg: rot([[0, [-10, 0, 10]], [0.25, [-25, 0, 10]], [0.45, [-12, 0, 10]], [0.7, [-10, 0, 10]]]),
    LeftLeg: rot([-16, 0, -10]),
    RightLowerLeg: rot([[0, [40, 0, 0]], [0.25, [60, 0, 0]], [0.7, [40, 0, 0]]]),
    LeftLowerLeg: rot([46, 0, 0]),
  }),
  queimada_giro: clip(0.75, false, {
    Root: {
      rotation: [[0, [0, 0, 0]], [0.35, [0, 160, 0]], [0.55, [0, 200, 0]], [0.75, [0, 360, 0]]],
      position: [[0, [0, -0.35, 0]], [0.4, [0, -0.1, 0.7]], [0.75, [0, -0.35, 0]]],
    },
    UpBody: rot([[0, [6, 0, 0]], [0.4, [10, 0, 0]], [0.75, [6, 0, 0]]]),
    RightArm: rot([[0, [-70, -25, 15]], [0.25, [-130, 0, 20]], [0.5, [-55, 10, 30]], [0.75, [-70, -25, 15]]]),
    LeftArm: rot([[0, [-40, 15, -20]], [0.4, [-60, 20, -25]], [0.75, [-40, 15, -20]]]),
    RightForeArm: rot([[0, [-85, 10, 0]], [0.25, [-95, 0, 0]], [0.5, [-30, 0, 0]], [0.75, [-85, 10, 0]]]),
    LeftForeArm: rot([-55, 0, 0]),
    RightLeg: rot([[0, [-10, 0, 10]], [0.4, [-20, 0, 12]], [0.75, [-10, 0, 10]]]),
    LeftLeg: rot([-16, 0, -10]),
    RightLowerLeg: rot([[0, [40, 0, 0]], [0.4, [55, 0, 0]], [0.75, [40, 0, 0]]]),
    LeftLowerLeg: rot([46, 0, 0]),
    SkirtFront: rot([[0, [-12, 0, 0]], [0.4, [-28, 0, 0]], [0.75, [-12, 0, 0]]]),
  }),
  queimada_foguete: clip(0.7, false, {
    Root: { position: [[0, [0, -0.35, 0]], [0.2, [0, -0.55, -0.2]], [0.4, [0, 0.15, 1.4]], [0.7, [0, -0.35, 0]]] },
    UpBody: rot([[0, [6, 0, 0]], [0.2, [14, 0, 0]], [0.4, [4, -12, 0]], [0.7, [6, 0, 0]]]),
    Head: rot([[0, [-5, 0, 0]], [0.2, [6, 0, 0]], [0.4, [-10, 0, 0]], [0.7, [-5, 0, 0]]]),
    RightArm: rot([[0, [-70, -25, 15]], [0.18, [-150, -10, 8]], [0.4, [-40, 5, 25]], [0.7, [-70, -25, 15]]]),
    LeftArm: rot([[0, [-40, 15, -20]], [0.4, [-70, 20, -18]], [0.7, [-40, 15, -20]]]),
    RightForeArm: rot([[0, [-85, 10, 0]], [0.18, [-100, 0, 0]], [0.4, [-15, 0, 0]], [0.7, [-85, 10, 0]]]),
    LeftForeArm: rot([-55, 0, 0]),
    RightLeg: rot([[0, [-10, 0, 10]], [0.2, [-28, 0, 10]], [0.4, [-18, 0, 10]], [0.7, [-10, 0, 10]]]),
    LeftLeg: rot([[0, [-16, 0, -10]], [0.4, [-28, 0, -10]], [0.7, [-16, 0, -10]]]),
    RightLowerLeg: rot([[0, [40, 0, 0]], [0.2, [62, 0, 0]], [0.4, [48, 0, 0]], [0.7, [40, 0, 0]]]),
    LeftLowerLeg: rot([[0, [46, 0, 0]], [0.4, [58, 0, 0]], [0.7, [46, 0, 0]]]),
  }),
});
// Aliases antigos / genéricos → nomes por arma (compat).
Object.assign(A, {
  combat_idle: A.espada_idle, combat_jump: A.espada_pulo, golpe: A.espada_golpe,
  kendo_kamae: A.espada_guarda, kendo_men: A.espada_men, kendo_kote: A.espada_kote,
  kendo_do: A.espada_do, kendo_tsuki: A.espada_tsuki, kendo_nuki: A.espada_nuki,
  guard_pose: A.melee_guarda, soco: A.melee_soco, gancho_punho: A.melee_gancho,
  chute_baixo: A.melee_chute, combo_punho: A.melee_combo, uppercut: A.melee_upper, step_in: A.melee_passo,
});
// First boot: lies still, twitches, sits up, rises in one hydraulic move with the torso kept
// upright, then looks around and checks its own hand.
const BOOT = 6.6;
const sitUp = -LIE;
A.boot = clip(BOOT, 'hold_on_last_frame', {
  Root: {
    rotation: [[0, [LIE, 0, 0]], [3.0, [LIE, 0, 0]], [3.8, [0, 0, 0]], [BOOT, [0, 0, 0]]],
    position: [[0, [0, LIE_Y, 0]], [3.0, [0, LIE_Y, 0]], [3.8, [0, 0, 0]], [3.92, [0, -0.7, 0]], [4.05, [0, 0, 0]], [BOOT, [0, 0, 0]]],
  },
  UpBody: rot([[0, [0, 0, 0]], [1.6, [0, 0, 0]], [2.6, [sitUp, 0, 0]], [3.0, [sitUp, 0, 0]], [3.8, [0, 0, 0]], [BOOT, [0, 0, 0]]]),
  RightLeg: rot([[0, OFFP.RightLeg], [2.2, OFFP.RightLeg], [3.0, [-10, 0, 3]], [3.4, [-35, 0, 2]], [3.8, [0, 0, 0]], [BOOT, [0, 0, 0]]]),
  LeftLeg: rot([[0, OFFP.LeftLeg], [2.2, OFFP.LeftLeg], [3.0, [-4, 0, -4]], [3.4, [-35, 0, -2]], [3.8, [0, 0, 0]], [BOOT, [0, 0, 0]]]),
  RightLowerLeg: rot([[0, OFFP.RightLowerLeg], [2.2, OFFP.RightLowerLeg], [3.0, [10, 0, 0]], [3.4, [55, 0, 0]], [3.8, [0, 0, 0]], [3.92, [10, 0, 0]], [4.05, [0, 0, 0]], [BOOT, [0, 0, 0]]]),
  LeftLowerLeg: rot([[0, OFFP.LeftLowerLeg], [3.0, [0, 0, 0]], [3.4, [55, 0, 0]], [3.8, [0, 0, 0]], [3.92, [10, 0, 0]], [4.05, [0, 0, 0]], [BOOT, [0, 0, 0]]]),
  SkirtFront: rot([[0, OFFP.SkirtFront], [2.2, OFFP.SkirtFront], [3.0, [0, 0, 0]], [3.4, [-22, 0, 0]], [3.8, [0, 0, 0]], [BOOT, [0, 0, 0]]]),
  RightFoot: rot([[0, OFFP.RightFoot], [2.2, OFFP.RightFoot], [3.0, [0, 0, 0]], [BOOT, [0, 0, 0]]]),
  LeftFoot: rot([[0, OFFP.LeftFoot], [2.2, OFFP.LeftFoot], [3.0, [0, 0, 0]], [BOOT, [0, 0, 0]]]),
  RightArm: rot([[0, OFFP.RightArm], [1.6, OFFP.RightArm], [2.6, [-30, 0, 8]], [3.0, [-30, 0, 8]], [3.8, [0, 0, 6]], [5.0, [0, 0, 6]], [5.5, [-80, 0, 12]], [6.0, [-80, 0, 12]], [6.4, [0, 0, 4]], [BOOT, [0, 0, 4]]]),
  RightForeArm: rot([[0, OFFP.RightForeArm], [0.95, OFFP.RightForeArm], [1.05, [-55, 0, 0]], [1.2, [-30, 0, 0]], [1.3, [-48, 0, 0]], [1.45, [-30, 0, 0]], [2.6, [-20, 0, 0]], [5.0, [-8, 0, 0]], [5.5, [-75, 0, -20]], [5.75, [-75, 0, 20]], [6.0, [-75, 0, -10]], [6.4, [-8, 0, 0]], [BOOT, [-8, 0, 0]]]),
  LeftArm: rot([[0, OFFP.LeftArm], [1.6, OFFP.LeftArm], [2.6, [-30, 0, -8]], [3.0, [-30, 0, -8]], [3.8, [0, 0, -6]], [BOOT, [0, 0, -8]]]),
  LeftForeArm: rot([[0, OFFP.LeftForeArm], [1.6, OFFP.LeftForeArm], [2.6, [-20, 0, 0]], [3.8, [-8, 0, 0]], [BOOT, [-8, 0, 0]]]),
  Head: rot([[0, OFFP.Head], [1.3, OFFP.Head], [1.6, [0, 0, 0]], [2.6, [22, 0, 0]], [3.0, [22, 0, 0]], [3.8, [0, 0, 0]], [5.0, [0, 0, 0]], [5.5, [18, -14, 0]], [6.0, [18, -14, 0]], [6.4, [0, 0, 0]], [BOOT, [0, 0, 0]]]),
  AllHead: rot([[0, [0, 0, 0]], [4.05, [0, 0, 0]], [4.4, [0, 38, 0]], [4.6, [0, 38, 0]], [4.95, [0, -38, 0]], [5.1, [0, -38, 0]], [5.4, [0, 0, 0]], [BOOT, [0, 0, 0]]]),
  HairBack: {
    rotation: [[0, [-8, 0, 0]], [3.0, [-8, 0, 0]], [3.8, [14, 0, 0]], [4.3, [0, 0, 0]], [4.6, [0, 0, -6]], [4.95, [0, 0, 6]], [5.4, [0, 0, 0]], [BOOT, [0, 0, 0]]],
    position: [[0, [0, 0, -2.4]], [3.0, [0, 0, -2.4]], [3.8, [0, 0, 0]], [BOOT, [0, 0, 0]]],
  },
  Eyelids: {
    position: {
      '0.000': SHUT, '1.580': SHUT, '1.600': OPEN, '1.700': OPEN, '1.710': SHUT, '1.800': SHUT, '1.810': OPEN,
      '4.200': OPEN, '4.210': SHUT, '4.320': SHUT, '4.330': OPEN, [BOOT.toFixed(3)]: OPEN,
    },
  },
});

const anims = { format_version: '1.8.0', credits: CREDITS, animations: A };

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'main.json'), JSON.stringify(geo));
fs.writeFileSync(path.join(OUT, 'main.animation.json'), JSON.stringify(anims));
writePng(path.join(OUT, 'texture.png'), { w: ATLAS_W, h: ATLAS_H, data });
const EMAIL = 'haz.midnight@gmail.com';
const LICENSE = 'Uso pessoal livre. Proibido uso comercial, venda, edição/modificação, obras derivadas e redistribuição sem autorização. / Free for personal use. No commercial use, selling, editing/modifying, derivative works or redistribution without permission.';
fs.writeFileSync(path.join(OUT, 'ysm.json'), JSON.stringify({
  metadata: {
    name: V.name,
    authors: [{ name: 'HaZ', role: 'Autor / Author', contact: { email: EMAIL } }],
    license: { type: 'Uso pessoal / Personal use only', description: LICENSE },
    tips: `Persocon ${V.name} do My Persocon. © HaZ (${EMAIL}). Leia README.txt.`,
  },
}, null, 2));
fs.writeFileSync(path.join(OUT, 'README.txt'), `${V.name.toUpperCase()} — Persocon do My Persocon
Modelo 3D no formato Yes Steve Model (pasta): main.json, main.animation.json, texture.png, ysm.json.

CRÉDITOS
  Criação, design, textura e animações: HaZ
  Contato: ${EMAIL}
  © ${new Date().getFullYear()} HaZ. Todos os direitos reservados.

LICENÇA DE USO
  PERMITIDO
  - Uso pessoal e gratuito (no My Persocon, em programas ou jogos que leiam modelos YSM, em
    vídeos, prints e transmissões pessoais sem fins lucrativos), mantendo os créditos.

  PROIBIDO
  - Qualquer uso comercial: vender, alugar, cobrar acesso, incluir em produtos, pacotes ou
    serviços pagos, ou usar em material publicitário.
  - Editar ou modificar o modelo, a textura ou as animações, e criar obras derivadas
    (recolorir, recortar partes, trocar rosto ou roupas, converter e republicar etc.).
  - Redistribuir ou reenviar os arquivos (originais ou modificados) sem autorização por escrito.
  - Remover ou alterar os créditos, ou dizer que é o autor.
  - Usar os arquivos para treinar modelos de inteligência artificial.

  Para qualquer uso fora do permitido, peça autorização: ${EMAIL}

--------------------------------------------------------------------------------

${V.name.toUpperCase()} — Persocon from My Persocon
3D model in Yes Steve Model folder format: main.json, main.animation.json, texture.png, ysm.json.

CREDITS
  Creation, design, texture and animations: HaZ
  Contact: ${EMAIL}
  © ${new Date().getFullYear()} HaZ. All rights reserved.

LICENSE
  ALLOWED
  - Free personal use (in My Persocon, in programs or games that read YSM models, and in
    personal non-profit videos, screenshots and streams), keeping the credits.

  NOT ALLOWED
  - Any commercial use: selling, renting, paid access, inclusion in paid products, bundles
    or services, or advertising.
  - Editing or modifying the model, texture or animations, or making derivative works
    (recoloring, cutting parts, swapping face or clothes, converting and reuploading, etc.).
  - Redistributing or reuploading the files (original or modified) without written permission.
  - Removing or changing the credits, or claiming authorship.
  - Using the files to train artificial intelligence models.

  For anything outside these terms, ask for permission: ${EMAIL}
`.replace(/\n/g, '\r\n'));
console.log(`${V.name}: ${bones.length} bones, ${rects.length / 6} cubes, atlas ${ATLAS_W}x${ATLAS_H}, ${Object.keys(A).length} clips`);
