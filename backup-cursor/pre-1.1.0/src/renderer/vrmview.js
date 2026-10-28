// VRoid (.vrm) pet: same interface as PetView, with procedural humanoid animations and VRM expressions.
import * as THREE from './vendor/three.module.js';
import { GLTFLoader } from './vendor/addons/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils } from './vendor/three-vrm.module.js';

const YAW = { front: Math.PI, back: 0, right: -Math.PI / 2, left: Math.PI / 2 };
const POSES = {
  stand: { pitch: 0, ground: false, center: false },
  sit: { pitch: 0, ground: true, center: false },
  climb: { pitch: 0, ground: false, center: true },
  lie: { pitch: 90, ground: true, center: true },
};
const BONES = ['hips', 'spine', 'chest', 'neck', 'head', 'leftUpperArm', 'leftLowerArm', 'rightUpperArm', 'rightLowerArm',
  'leftUpperLeg', 'leftLowerLeg', 'rightUpperLeg', 'rightLowerLeg', 'leftFoot', 'rightFoot'];
const DOWN = 1.25;
const S = Math.sin;
const C = Math.cos;
const TAU = Math.PI * 2;
const pos = (v) => Math.max(0, v);

function base() {
  const p = { hipsY: 0 };
  for (const b of BONES) p[b] = [0, 0, 0];
  p.leftUpperArm[2] = -DOWN;
  p.rightUpperArm[2] = DOWN;
  p.leftLowerArm[1] = -0.15;
  p.rightLowerArm[1] = 0.15;
  return p;
}

// Hands together in front of the chest (a = 0) up to the mouth (a = 1).
function reachArms(p, a) {
  p.leftUpperArm = [-(0.45 + 0.75 * a), 0.25, -1.15];
  p.rightUpperArm = [-(0.45 + 0.75 * a), -0.25, 1.15];
  p.leftLowerArm = [0, -(1.35 + 0.35 * a), 0];
  p.rightLowerArm = [0, 1.35 + 0.35 * a, 0];
}

// name: [loop, length, pose(t, L) -> bone eulers, expression]
const CLIPS = {
  idle: ['loop', 6, (t) => {
    const p = base();
    const b = S(t * 2.2);
    p.chest[0] = 0.02 * b;
    p.head[1] = 0.18 * S(t * 0.5);
    p.head[0] = 0.05 * S(t * 0.7);
    p.leftUpperArm[2] += 0.04 * b;
    p.rightUpperArm[2] -= 0.04 * b;
    return p;
  }],
  walk: ['loop', 1 / 1.7, (t, L) => {
    const p = base();
    const w = t * TAU * 1.7;
    const s = S(w);
    p.leftUpperLeg[0] = -0.45 * s;
    p.rightUpperLeg[0] = 0.45 * s;
    p.leftLowerLeg[0] = 0.1 + 0.6 * pos(S(w + 1.6));
    p.rightLowerLeg[0] = 0.1 + 0.6 * pos(-S(w + 1.6));
    p.leftUpperArm[0] = 0.35 * s;
    p.rightUpperArm[0] = -0.35 * s;
    p.hips[1] = 0.08 * s;
    p.chest[1] = -0.1 * s;
    p.hipsY = -0.015 * L * Math.abs(C(w));
    return p;
  }],
  run: ['loop', 1 / 2.6, (t, L) => {
    const p = base();
    const w = t * TAU * 2.6;
    const s = S(w);
    p.leftUpperLeg[0] = -0.85 * s;
    p.rightUpperLeg[0] = 0.85 * s;
    p.leftLowerLeg[0] = 0.3 + 1.0 * pos(S(w + 1.4));
    p.rightLowerLeg[0] = 0.3 + 1.0 * pos(-S(w + 1.4));
    p.leftUpperArm[0] = 0.75 * s;
    p.rightUpperArm[0] = -0.75 * s;
    p.leftLowerArm[1] = -1.3;
    p.rightLowerArm[1] = 1.3;
    p.spine[0] = 0.22;
    p.hips[1] = 0.12 * s;
    p.hipsY = 0.04 * L * Math.abs(S(w));
    return p;
  }],
  jump: ['loop', 1, (t) => {
    const p = base();
    p.leftUpperLeg[0] = p.rightUpperLeg[0] = -0.55;
    p.leftLowerLeg[0] = p.rightLowerLeg[0] = 0.9;
    p.leftUpperArm[2] = -0.45 + 0.1 * S(t * 8);
    p.rightUpperArm[2] = 0.45 - 0.1 * S(t * 8);
    p.spine[0] = 0.1;
    return p;
  }],
  sit: ['loop', 6, (t, L) => {
    const p = base();
    const b = S(t * 2);
    p.hipsY = -L * 0.9;
    p.leftUpperLeg = [-1.45, 0, 0.12];
    p.rightUpperLeg = [-1.45, 0, -0.12];
    p.leftLowerLeg[0] = p.rightLowerLeg[0] = 0.25;
    p.leftUpperArm = [-0.35, 0, -1.2];
    p.rightUpperArm = [-0.35, 0, 1.2];
    p.leftLowerArm[1] = -0.9;
    p.rightLowerArm[1] = 0.9;
    p.spine[0] = 0.06 + 0.015 * b;
    p.head[1] = 0.15 * S(t * 0.4);
    return p;
  }],
  sleep: ['loop', 5, (t) => {
    const p = base();
    p.chest[0] = 0.03 * S(t * 1.3);
    p.head[2] = 0.25;
    p.leftUpperArm[2] = -1.4;
    p.rightUpperArm[2] = 1.4;
    return p;
  }, 'blink'],
  climb: ['loop', 0.8, (t) => {
    const p = base();
    const s = S(t * TAU / 0.8);
    p.leftUpperArm = [-0.3, 0, 1.15 + 0.35 * s];
    p.rightUpperArm = [-0.3, 0, -(1.15 - 0.35 * s)];
    p.leftLowerArm[1] = -0.5;
    p.rightLowerArm[1] = 0.5;
    p.leftUpperLeg[0] = -0.7 * pos(-s);
    p.rightUpperLeg[0] = -0.7 * pos(s);
    p.leftLowerLeg[0] = 1.0 * pos(-s);
    p.rightLowerLeg[0] = 1.0 * pos(s);
    return p;
  }],
  climbing: ['loop', 3, (t) => {
    const p = base();
    p.leftUpperArm = [-0.3, 0, 1.3];
    p.rightUpperArm = [-0.3, 0, -1.3];
    p.leftUpperLeg[0] = -0.3;
    p.leftLowerLeg[0] = 0.5;
    p.head[1] = 0.3 * S(t);
    return p;
  }],
  attacked: ['once', 0.5, (t) => {
    const p = base();
    const k = S(Math.PI * Math.min(1, t / 0.5));
    p.spine[0] = -0.3 * k;
    p.head[0] = -0.35 * k;
    p.leftUpperArm[2] = -DOWN + 0.7 * k;
    p.rightUpperArm[2] = DOWN - 0.7 * k;
    return p;
  }, 'surprised'],
  use_mainhand: ['once', 0.7, (t) => {
    const p = base();
    const k = S(Math.PI * Math.min(1, t / 0.7));
    p.rightUpperArm = [-1.3 * k, 0, DOWN * (1 - 0.25 * k)];
    p.rightLowerArm[1] = 0.2;
    p.spine[0] = 0.2 * k;
    p.leftUpperLeg[0] = -0.3 * k;
    p.leftLowerLeg[0] = 0.5 * k;
    return p;
  }],
  swing_hand: ['once', 0.5, (t) => {
    const p = base();
    const u = Math.min(1, t / 0.5);
    p.rightUpperArm = [-2.7 + 2.3 * u, 0, 0.35];
    p.leftUpperArm = [-0.9 + 0.5 * u, 0, -0.45];
    p.leftLowerArm[1] = -1;
    p.spine = [0.25 * u, -0.3 + 0.6 * u, 0];
    p.rightUpperLeg[0] = 0.25;
    p.leftUpperLeg[0] = -0.35;
    return p;
  }],
  extra_aceno: ['loop', 1.2, (t) => {
    const p = base();
    p.rightUpperArm = [0, 0, -0.85];
    p.rightLowerArm = [0, 0, -0.7 + 0.45 * S(t * 9)];
    p.head[2] = -0.12;
    p.head[1] = 0.15;
    return p;
  }, 'happy'],
  extra_pulo: ['loop', 0.7, (t, L) => {
    const p = base();
    const k = Math.abs(S((Math.PI * t) / 0.7));
    p.hipsY = 0.12 * L * k;
    p.leftUpperArm[2] = 0.9 + 0.2 * k;
    p.rightUpperArm[2] = -0.9 - 0.2 * k;
    p.leftUpperLeg[0] = p.rightUpperLeg[0] = -0.3 * k;
    p.leftLowerLeg[0] = p.rightLowerLeg[0] = 0.6 * k;
    return p;
  }, 'happy'],
  extra_danca: ['loop', 1, (t, L) => {
    const p = base();
    const s = S(t * TAU);
    p.hips[2] = 0.12 * s;
    p.hipsY = -0.03 * L * Math.abs(s);
    p.chest[2] = -0.15 * s;
    p.head[2] = 0.15 * s;
    p.leftUpperArm[2] = s > 0 ? 0.6 : -0.9;
    p.rightUpperArm[2] = s > 0 ? 0.9 : -0.6;
    p.leftLowerArm[1] = -0.8;
    p.rightLowerArm[1] = 0.8;
    p.leftLowerLeg[0] = 0.4 * pos(s);
    p.rightLowerLeg[0] = 0.4 * pos(-s);
    return p;
  }, 'happy'],
  extra_triste: ['loop', 3, (t) => {
    const p = base();
    p.head[0] = 0.45 + 0.05 * S(t * 2);
    p.spine[0] = 0.25;
    p.leftUpperArm[2] = -1.38;
    p.rightUpperArm[2] = 1.38;
    return p;
  }, 'sad'],
  extra_bravo: ['loop', 0.9, (t) => {
    const p = base();
    p.leftUpperArm = [-0.95, 0.4, -1.15];
    p.rightUpperArm = [-0.85, -0.4, 1.15];
    p.leftLowerArm[1] = -1.9;
    p.rightLowerArm[1] = 1.9;
    p.head[1] = 0.3 * S(t * 12);
    const st = pos(S((t * TAU) / 0.9));
    p.rightUpperLeg[0] = -0.4 * st;
    p.rightLowerLeg[0] = 0.5 * st;
    return p;
  }, 'angry'],
};

class VrmAnimator {
  constructor(view) {
    this.view = view;
    this.clips = new Map(Object.entries(CLIPS).map(([n, [loop, length]]) => [n, { loop, length }]));
    this.speed = 1;
    this.name = 'idle';
    this.t = 0;
    this.clipSpeed = 1;
  }

  has(name) {
    return this.clips.has(name) && !this.disabled?.has(name);
  }

  play(name, { restart = false, fade = 0.18, speed = 1, force = false } = {}) {
    if (!(force ? this.clips.has(name) : this.has(name))) name = 'idle';
    this.clipSpeed = speed;
    if (name === this.name && !restart) return;
    this.name = name;
    this.t = speed < 0 ? CLIPS[name][1] : 0;
    this.view.snapBones = fade === 0;
    this.view.setClipExpression(CLIPS[name][3]);
  }

  update(dt) {
    const [loop, length] = CLIPS[this.name];
    this.t += dt * this.speed * this.clipSpeed;
    if (loop === 'once') this.t = Math.min(Math.max(this.t, 0), length);
  }
}

// A plain .glb (no VRM humanoid): wrapped in a stand-in rig whose "hips" carries the whole model,
// so the procedural clips bob and sway it, with marker bones for the head, hands and feet.
function plainRig(model) {
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const k = 1.5 / Math.max(0.01, size.y);
  model.scale.setScalar(k);
  model.position.set(-(box.min.x + box.max.x) / 2 * k, -box.min.y * k, -(box.min.z + box.max.z) / 2 * k);
  const H = 1.5;
  const W = (size.x * k) / 2;
  const root = new THREE.Group();
  const hips = new THREE.Group();
  hips.add(model);
  root.add(hips);
  const marks = { hips };
  for (const [name, x, y] of [['head', 0, H * 0.85], ['leftHand', W * 0.8, H * 0.5], ['rightHand', -W * 0.8, H * 0.5], ['leftFoot', W * 0.3, 0], ['rightFoot', -W * 0.3, 0], ['chest', 0, H * 0.65]]) {
    const o = new THREE.Object3D();
    o.position.set(x, y, 0);
    hips.add(o);
    marks[name] = o;
  }
  model.traverse((o) => (o.frustumCulled = false));
  return {
    scene: root,
    plain: true,
    expressionManager: null,
    update() {},
    humanoid: { getNormalizedBoneNode: (n) => (n === 'hips' ? hips : null), getRawBoneNode: (n) => marks[n] || null },
  };
}

export class VrmView {
  static CLIPS = Object.keys(CLIPS);

  static async create(files, petHeight, canvas) {
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));
    const buf = await (await fetch(files.vrm)).arrayBuffer();
    const gltf = await loader.parseAsync(buf, '');
    const vrm = gltf.userData.vrm;
    if (!vrm) return new VrmView(plainRig(gltf.scene), petHeight, canvas);
    VRMUtils.removeUnnecessaryVertices(gltf.scene);
    VRMUtils.combineSkeletons?.(gltf.scene);
    VRMUtils.rotateVRM0(vrm);
    vrm.scene.traverse((o) => (o.frustumCulled = false));
    return new VrmView(vrm, petHeight, canvas);
  }

  partNames() {
    const out = [];
    this.vrm.scene.traverse((o) => o.isMesh && o.name && !out.includes(o.name) && out.push(o.name));
    return out;
  }

  setHidden(names = []) {
    const set = new Set(names);
    this.vrm.scene.traverse((o) => { if (o.isMesh && o.name) o.visible = !set.has(o.name); });
  }

  constructor(vrm, petHeight, canvas) {
    this.vrm = vrm;
    this.canvas = canvas;
    this.animator = new VrmAnimator(this);
    this.defaultRoles = { extra_aceno: 'emote_pos', extra_pulo: 'emote_pos', extra_danca: 'danca', extra_triste: 'emote_neg', extra_bravo: 'emote_neg' };
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.scene = new THREE.Scene();
    this.scene.add(new THREE.AmbientLight(0xffffff, 1.6));
    const sun = new THREE.DirectionalLight(0xffffff, 1.4);
    sun.position.set(0.5, 1.5, 2);
    this.scene.add(sun);
    this.anchor = new THREE.Group();
    this.yawGroup = new THREE.Group();
    this.poseGroup = new THREE.Group();
    // VRM faces +Z; the pet views expect -Z (front = yaw PI).
    this.turn = new THREE.Group();
    this.turn.rotation.y = Math.PI;
    this.turn.add(vrm.scene);
    this.poseGroup.add(this.turn);
    this.yawGroup.add(this.poseGroup);
    this.anchor.add(this.yawGroup);
    this.scene.add(this.anchor);
    this.camera = new THREE.OrthographicCamera();
    this.camera.position.set(0, 0, 50);
    this.camera.lookAt(0, 0, 0);

    const h = vrm.humanoid;
    this.bones = new Map(BONES.map((b) => [b, h.getNormalizedBoneNode(b)]).filter(([, n]) => n));
    this.hipsRest = this.bones.get('hips').position.clone();
    vrm.update(0);
    this.scene.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(vrm.scene);
    this.modelHeight = Math.max(0.3, box.max.y - Math.min(0, box.min.y));
    const v = new THREE.Vector3();
    const headY = h.getRawBoneNode('head')?.getWorldPosition(v).y ?? box.max.y * 0.9;
    this.headTop = box.max.y - headY;
    this.legLen = (h.getRawBoneNode('hips')?.getWorldPosition(v).y ?? this.modelHeight * 0.5) * 0.95;
    this.cur = {};
    this.snapBones = true;
    this.expr = { name: null, w: 0, t: 0 };
    this.clipExpr = null;
    this.blinkT = 3;
    this.mouth = 0;
    this.bounds = { top: petHeight, centerX: 0 };
    this.pose = 'stand';
    this.snap = true;
    this.resize(petHeight);
    this.facing = null;
    this.setFacing('front', true);
  }

  resize(petHeight) {
    const P = (this.petHeight = petHeight);
    this.ppu = P / this.modelHeight;
    this.width = Math.round(P * 2.4);
    this.height = Math.round(P * 1.8);
    this.feetX = this.width / 2;
    this.feetY = Math.round(this.height - P * 0.3);
    this.renderer.setPixelRatio(devicePixelRatio / (this.pixelate || 1));
    this.renderer.setSize(this.width, this.height, false);
    this.canvas.style.width = this.width + 'px';
    this.canvas.style.height = this.height + 'px';
    const u = 1 / this.ppu;
    Object.assign(this.camera, { left: -this.feetX * u, right: (this.width - this.feetX) * u, top: this.feetY * u, bottom: -(this.height - this.feetY) * u, near: 0.01, far: 200 });
    this.camera.updateProjectionMatrix();
    this.snap = true;
  }

  setPixelate(k) {
    this.pixelate = Math.max(1, k || 1);
    this.canvas.style.imageRendering = this.pixelate > 1 ? 'pixelated' : '';
    this.resize(this.petHeight);
  }

  setFacing(facing, instant = this.smoothTurn === false) {
    if (facing === this.facing) return;
    this.facing = facing;
    this.yawTarget = typeof facing === 'number' ? facing : YAW[facing] ?? 0;
    if (instant) this.yawGroup.rotation.set(0, this.yawTarget, 0);
    if (POSES[this.pose].center) this.snap = true;
  }

  updateYaw(dt) {
    const r = this.yawGroup.rotation;
    let d = (this.yawTarget ?? r.y) - r.y;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    if (Math.abs(d) < 0.002) return;
    r.set(0, r.y + Math.sign(d) * Math.min(Math.abs(d), Math.max(Math.abs(d) * (1 - Math.exp(-10 * dt)), 6 * dt)), 0);
  }

  setPose(pose) {
    const name = pose in POSES ? pose : 'stand';
    const changed = POSES[name].pitch !== POSES[this.pose].pitch;
    this.pose = name;
    this.poseGroup.rotation.set(POSES[name].pitch * (Math.PI / 180), 0, 0);
    if (changed) this.snap = true;
    return changed;
  }

  play(name, opts) {
    this.animator.play(name, opts);
  }

  // ---------- expressions ----------

  setClipExpression(name) {
    this.clipExpr = name || null;
  }

  // A short expression reacting to an event (fades out by itself).
  setExpression(name, seconds = 2.5) {
    this.expr = { name, w: 1, t: seconds };
  }

  setMouth(v) {
    this.mouth = v;
  }

  updateExpressions(dt) {
    const em = this.vrm.expressionManager;
    if (!em) return;
    const names = ['happy', 'angry', 'sad', 'relaxed', 'surprised'];
    const target = {};
    if (this.clipExpr && this.clipExpr !== 'blink') target[this.clipExpr] = 0.8;
    if (this.expr.name) {
      this.expr.t -= dt;
      if (this.expr.t <= 0) this.expr.name = null;
      else target[this.expr.name] = Math.min(1, this.expr.t);
    }
    if (this.mood !== undefined && !Object.keys(target).length) {
      if (this.mood > 80) target.relaxed = 0.35;
      else if (this.mood < 30) target.sad = 0.4;
    }
    for (const n of names) {
      const cur = em.getValue(n) ?? 0;
      em.setValue(n, cur + ((target[n] || 0) - cur) * Math.min(1, dt * 8));
    }
    this.blinkT -= dt;
    let blink = 0;
    if (this.clipExpr === 'blink') blink = 1;
    else if (this.blinkT < 0.15) blink = 1 - Math.abs(this.blinkT - 0.075) / 0.075;
    if (this.blinkT <= 0) this.blinkT = 2.5 + Math.random() * 3;
    em.setValue('blink', Math.max(0, Math.min(1, blink)));
    em.setValue('aa', this.mouth);
  }

  // ---------- arms held / reaching ----------

  setHold(side) {
    this.hold = side;
  }

  setReach(amount) {
    this.reach = amount;
  }

  handOffset() {
    if (!this.hold) return null;
    this.applyPose(this.targetPose(), true);
    this.vrm.update(0);
    this.scene.updateMatrixWorld(true);
    const hand = this.vrm.humanoid.getRawBoneNode(this.holdBoneName() === 'leftUpperArm' ? 'leftHand' : 'rightHand');
    if (!hand) return null;
    const v = hand.getWorldPosition(new THREE.Vector3());
    return { x: v.x * this.ppu, y: -(v.y + 0.05) * this.ppu };
  }

  holdBoneName() {
    // Screen right while facing front is the model's left hand.
    return this.hold === 'right' ? 'leftUpperArm' : 'rightUpperArm';
  }

  handsPoint() {
    const v = new THREE.Vector3();
    const pts = ['leftHand', 'rightHand'].map((n) => this.vrm.humanoid.getRawBoneNode(n)).filter(Boolean).map((n) => n.getWorldPosition(v).clone());
    if (!pts.length) return null;
    const x = pts.reduce((s, p) => s + p.x, 0) / pts.length;
    const y = pts.reduce((s, p) => s + p.y, 0) / pts.length;
    return { x: x * this.ppu, y: y * this.ppu };
  }

  targetPose() {
    const [, , fn] = CLIPS[this.animator.name];
    const p = fn(this.animator.t, this.legLen);
    if (this.hold) {
      const b = this.holdBoneName();
      p[b] = b === 'leftUpperArm' ? [0, 0, 1.45] : [0, 0, -1.45];
      p[b.replace('Upper', 'Lower')] = [0, 0, 0];
    } else if (this.reach !== null && this.reach !== undefined) reachArms(p, this.reach);
    return p;
  }

  applyPose(p, snap) {
    const k = snap ? 1 : this.blendK;
    for (const [name, node] of this.bones) {
      const t = p[name] || [0, 0, 0];
      const c = (this.cur[name] ||= [0, 0, 0]);
      for (let i = 0; i < 3; i++) c[i] += (t[i] - c[i]) * k;
      node.rotation.set(c[0], c[1], c[2]);
    }
    const hy = (this.cur.hipsY ??= 0) + (p.hipsY - (this.cur.hipsY ?? 0)) * k;
    this.cur.hipsY = hy;
    this.bones.get('hips').position.set(this.hipsRest.x, this.hipsRest.y + hy, this.hipsRest.z);
  }

  // ---------- anchoring (feet on the surface) ----------

  measure() {
    this.scene.updateMatrixWorld(true);
    const v = new THREE.Vector3();
    const a = this.anchor.position;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    const h = this.vrm.humanoid;
    for (const n of ['hips', 'head', 'leftHand', 'rightHand', 'leftFoot', 'rightFoot', 'leftToes', 'rightToes', 'leftLowerLeg', 'rightLowerLeg', 'chest']) {
      const node = h.getRawBoneNode(n);
      if (!node) continue;
      node.getWorldPosition(v);
      minX = Math.min(minX, v.x);
      maxX = Math.max(maxX, v.x);
      minY = Math.min(minY, v.y);
      maxY = Math.max(maxY, v.y);
    }
    const head = h.getRawBoneNode('head')?.getWorldPosition(v);
    const top = head ? head.y + this.headTop * Math.cos(this.poseGroup.rotation.x) : maxY;
    return { minX: minX - a.x, maxX: maxX - a.x, minY: minY - 0.04 - a.y, maxY: Math.max(maxY, top) - a.y };
  }

  reanchor() {
    this.snap = true;
    this.updateAnchor(0);
  }

  updateAnchor(dt) {
    const m = this.measure();
    const p = POSES[this.pose];
    const tx = p.center ? -(m.minX + m.maxX) / 2 : 0;
    const ty = p.ground ? -m.minY : 0;
    const a = this.anchor.position;
    if (this.snap) {
      a.set(tx, ty, 0);
      this.snap = false;
    } else {
      const k = 1 - Math.exp(-14 * dt);
      a.set(a.x + (tx - a.x) * k, a.y + (ty - a.y) * k, 0);
    }
    this.bounds = { top: (m.maxY + a.y) * this.ppu, centerX: ((m.minX + m.maxX) / 2 + a.x) * this.ppu };
  }

  update(dt) {
    this.updateYaw(dt);
    this.animator.update(dt);
    this.blendK = this.snapBones ? 1 : 1 - Math.exp(-dt / 0.07);
    this.snapBones = false;
    this.applyPose(this.targetPose(), false);
    this.updateExpressions(dt);
    this.vrm.update(dt);
    this.updateAnchor(dt);
    this.renderer.render(this.scene, this.camera);
  }

  hitTest(x, y, radius = 3) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return false;
    const gl = this.renderer.getContext();
    const d = this.renderer.getPixelRatio();
    const s = Math.max(1, Math.round(radius * d)) * 2 + 1;
    const px = Math.min(Math.max(Math.round(x * d) - (s >> 1), 0), gl.drawingBufferWidth - s);
    const py = Math.min(Math.max(Math.round((this.height - y) * d) - (s >> 1), 0), gl.drawingBufferHeight - s);
    const buf = new Uint8Array(s * s * 4);
    gl.readPixels(px, py, s, s, gl.RGBA, gl.UNSIGNED_BYTE, buf);
    for (let i = 3; i < buf.length; i += 4) if (buf[i] > 40) return true;
    return false;
  }

  dispose() {
    if (!this.vrm.plain) VRMUtils.deepDispose(this.vrm.scene);
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }
}
