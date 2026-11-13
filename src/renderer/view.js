import * as THREE from './vendor/three.module.js';
import { buildModel } from './model.js';
import { loadClips, Animator } from './animation.js';
import { addGenerated, GEN_ROLES } from './genanims.js';
import { addCombatClips } from './combatanims.js';
import { HairPhysics } from './hairphys.js';

// Model faces -Z; the camera looks at it from +Z.
const YAW = { front: Math.PI, back: 0, right: -Math.PI / 2, left: Math.PI / 2 };

// Body orientations Minecraft applies outside the animation (ladder crawl, lying in bed).
// ground rests the lowest point of the posed model on the surface (sitting/lying animations are
// authored for a seat or bed and would float otherwise); center keeps it horizontally centered.
export const POSES = {
  stand: { pitch: 0, ground: false, center: false },
  sit: { pitch: 0, ground: true, center: false },
  climb: { pitch: 90, ground: true, center: true },
  lie: { pitch: 90, ground: true, center: true },
};

function loadTexture(dataUrl) {
  return new Promise((resolve, reject) => {
    new THREE.TextureLoader().load(
      dataUrl,
      (t) => {
        t.magFilter = THREE.NearestFilter;
        t.minFilter = THREE.NearestFilter;
        t.generateMipmaps = false;
        t.colorSpace = THREE.SRGBColorSpace;
        t.flipY = true;
        resolve(t);
      },
      undefined,
      reject,
    );
  });
}

export class PetView {
  static async create(files, petHeight, canvas) {
    const texture = await loadTexture(files.texture);
    const model = buildModel(files.geometry, texture);
    const clips = loadClips(files.animations);
    const generated = addGenerated(model.bones.keys(), clips);
    // Close-combat clips (melee system): they replace a clip with the same name.
    const combatClips = addCombatClips(model.bones.keys(), clips);
    const view = new PetView(model, clips, petHeight, canvas);
    view.generated = [...generated, ...combatClips];
    view.combatClips = combatClips;
    view.genRoles = Object.fromEntries(generated.filter((n) => GEN_ROLES[n]).map((n) => [n, GEN_ROLES[n]]));
    if (files.mc) view.defaultRoles = (await import('./mcmodel.js')).MC_ROLES;
    return view;
  }

  constructor(model, clips, petHeight, canvas) {
    this.model = model;
    this.animator = new Animator(model.bones, clips);
    this.hair = new HairPhysics(model.root);
    this.modelHeight = Math.max(1, model.box.max.y - Math.min(0, model.box.min.y));
    this.canvas = canvas;

    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.anchor = new THREE.Group();
    this.yawGroup = new THREE.Group();
    this.poseGroup = new THREE.Group();
    this.poseGroup.add(model.root);
    this.yawGroup.add(this.poseGroup);
    this.anchor.add(this.yawGroup);
    this.scene.add(this.anchor);
    this.camera = new THREE.OrthographicCamera();
    this.camera.position.set(0, 0, 200);
    this.camera.lookAt(0, 0, 0);

    this.box = new THREE.Box3();
    this.bounds = { top: petHeight, centerX: 0 };
    this.pose = 'stand';
    this.snap = true;
    this.resize(petHeight);

    this.facing = null;
    this.setFacing('front', true);
    // The red flash when she takes damage (the intensity says how bad it was).
    this.flashT = 0;
    this.flashI = 0;
  }

  // The red flash on the model: the tint gets stronger with the damage.
  flash(intensity = 1) {
    this.flashT = Math.max(this.flashT, 0.32);
    this.flashI = Math.max(this.flashI, Math.min(1, Math.max(0.25, intensity)));
  }

  // Pet height in CSS pixels; everything else scales from it.
  resize(petHeight) {
    const P = (this.petHeight = petHeight);
    this.ppu = P / this.modelHeight;
    this.width = Math.round(P * 2.4);
    this.height = Math.round(P * 1.8);
    this.feetX = this.width / 2;
    this.feetY = Math.round(this.height - P * 0.3);

    this.renderer.setPixelRatio((devicePixelRatio * (this.detail || 1)) / (this.pixelate || 1));
    this.renderer.setSize(this.width, this.height, false);
    this.canvas.style.width = this.width + 'px';
    this.canvas.style.height = this.height + 'px';

    const u = 1 / this.ppu;
    Object.assign(this.camera, {
      left: -this.feetX * u,
      right: (this.width - this.feetX) * u,
      top: this.feetY * u,
      bottom: -(this.height - this.feetY) * u,
      near: 0.1,
      far: 1000,
    });
    this.camera.updateProjectionMatrix();
    this.snap = true;
  }

  // Renders k times sharper while the canvas is scaled up by CSS (the close-up in front of the screen).
  setDetail(k) {
    // Cap so DPR × detail stays within a safe WebGL buffer (blank canvas on 2nd close-up).
    const cap = Math.max(1.5, Math.min(3, 3072 / Math.max(this.width || 1, this.height || 1, 1)));
    this.detail = Math.min(Math.max(1, k || 1), cap);
    const pr = (devicePixelRatio * this.detail) / (this.pixelate || 1);
    this.renderer.setPixelRatio(pr);
    this.renderer.setSize(this.width, this.height, false);
    // Keep CSS size in sync after buffer resize (avoids a blank layer until the next hop-down).
    this.canvas.style.width = this.width + 'px';
    this.canvas.style.height = this.height + 'px';
  }

  // Renders at 1/k resolution (pixelation filters); the canvas is scaled back up without smoothing.
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

  // Turns through every angle on the shortest path instead of snapping.
  updateYaw(dt) {
    const r = this.yawGroup.rotation;
    let d = (this.yawTarget ?? r.y) - r.y;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    if (Math.abs(d) < 0.002) return;
    const step = Math.sign(d) * Math.min(Math.abs(d), Math.max(Math.abs(d) * (1 - Math.exp(-10 * dt)), 6 * dt));
    r.set(0, r.y + step, 0);
  }

  // Meshes that touch the ground: hair, clothes and accessories hang below the body when
  // sitting/lying and would make the pet float.
  supportMeshes() {
    if (this.support) return this.support;
    const skip = /hair|cloth|skirt|robin|hat|ear|tail|wing|cape|ribbon|bow|dress|acc|gun|beast|black|locator/i;
    const list = [];
    this.model.root.traverse((o) => {
      if (!o.isMesh) return;
      for (let p = o; p && p !== this.model.root; p = p.parent) if (p.name && skip.test(p.name)) return;
      list.push(o);
    });
    return (this.support = list.length ? list : null);
  }

  // Returns true when the body orientation changed (callers skip the crossfade then).
  // The default Persocons climb upright, facing the wall (their clip is authored that way).
  pitchOf(name) {
    return name === 'climb' && this.model.id === 'geometry.mypersocon' ? 0 : POSES[name].pitch;
  }

  setPose(pose) {
    const name = pose in POSES ? pose : 'stand';
    const pitchChanged = this.pitchOf(name) !== this.pitchOf(this.pose);
    this.pose = name;
    this.poseGroup.rotation.set(this.pitchOf(name) * (Math.PI / 180), 0, 0);
    if (pitchChanged) this.snap = true;
    return pitchChanged;
  }

  play(name, opts) {
    this.animator.play(name, opts);
  }

  // Posed model extents relative to the feet, in model units, ignoring the current anchor offset.
  measure() {
    this.scene.updateMatrixWorld(true);
    const b = this.box.setFromObject(this.yawGroup, true);
    const a = this.anchor.position;
    let minY = b.min.y;
    const support = POSES[this.pose].ground && this.supportMeshes();
    if (support) {
      const s = new THREE.Box3();
      for (const m of support) s.expandByObject(m, true);
      if (!s.isEmpty()) minY = s.min.y;
    }
    return { minX: b.min.x - a.x, maxX: b.max.x - a.x, minY: minY - a.y, maxY: b.max.y - a.y };
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

  // Bones that draw something, minus locators/empty bones (toggling them changes nothing),
  // wrappers holding a single part and bones holding the whole body.
  partNames() {
    if (this.parts) return this.parts;
    const count = (o) => { let n = 0; o.traverse((c) => c.isMesh && n++); return n; };
    const total = count(this.model.root);
    this.parts = [];
    for (const [name, b] of this.model.bones) {
      const n = count(b);
      if (!n || n === total) continue;
      if (!b.children.some((c) => c.isMesh) && b.children.filter((c) => !c.isMesh && count(c)).length === 1) continue;
      this.parts.push(name);
    }
    return this.parts;
  }

  // Accessories removed by the player (bones hidden with everything attached to them). Names
  // outside partNames() (saved before it was filtered, e.g. "Root") are ignored so the pet
  // can't vanish without a chip to bring it back.
  setHidden(names = []) {
    const parts = new Set(this.partNames());
    const set = new Set(names.filter((n) => parts.has(n)));
    for (const [name, b] of this.model.bones) b.visible = !set.has(name);
  }

  resetArms() {
    for (const name of ['RightArm', 'RightForeArm', 'LeftArm', 'LeftForeArm']) {
      const b = this.model.bones.get(name);
      if (b) b.rotation.copy(b.userData.restRot);
    }
  }

  armCenterX(name) {
    this.applyHold(name);
    this.scene.updateMatrixWorld(true);
    const b = new THREE.Box3().setFromObject(this.model.bones.get(name), true);
    return (b.min.x + b.max.x) / 2;
  }

  // Raised arm while carried by the mouse (applied on top of the animation). side is the
  // screen side ('left' | 'right') the arm should be on, or false to let go.
  setHold(side) {
    if (this.hold === side) return;
    this.hold = side;
    this.holdBone = null;
    this.resetArms();
    if (!side) return;
    const names = ['RightArm', 'LeftArm'].filter((n) => this.model.bones.has(n));
    if (!names.length) return;
    this.holdBone = names.find((n) => (this.armCenterX(n) > 0) === (side === 'right')) || names[0];
    this.resetArms();
  }

  applyHold(name = this.holdBone) {
    const arm = name && this.model.bones.get(name);
    if (!arm) return null;
    const r = arm.userData.restRot;
    const out = name === 'LeftArm' ? 0.35 : -0.35;
    arm.rotation.set(r.x + Math.PI, r.y, r.z + out, r.order);
    const fore = this.model.bones.get(name.replace('Arm', 'ForeArm'));
    if (fore) fore.rotation.copy(fore.userData.restRot);
    return arm;
  }

  // Hand position (tip of the raised arm) relative to the feet, in CSS pixels; null without an arm.
  handOffset() {
    const arm = this.applyHold();
    if (!arm) return null;
    this.scene.updateMatrixWorld(true);
    const b = new THREE.Box3().setFromObject(arm, true);
    return { x: ((b.min.x + b.max.x) / 2) * this.ppu, y: -(b.max.y - 0.8) * this.ppu };
  }

  // Both arms forward holding something: amount 0 = in front of the chest, 1 = at the mouth.
  setReach(amount) {
    if (amount === null && this.reach !== null && this.reach !== undefined) this.resetArms();
    this.reach = amount;
  }

  applyReach(a) {
    for (const [name, inward] of [['RightArm', 1], ['LeftArm', -1]]) {
      const arm = this.model.bones.get(name);
      if (!arm) continue;
      const r = arm.userData.restRot;
      arm.rotation.set(r.x + 1.0 + 0.4 * a, r.y + inward * (0.15 + 0.15 * a), r.z * (1 - 0.8 * a), r.order);
      const fore = this.model.bones.get(name.replace('Arm', 'ForeArm'));
      if (fore) {
        const f = fore.userData.restRot;
        fore.rotation.set(f.x + 0.55 + 0.5 * a, f.y, f.z, f.order);
      }
    }
  }

  // One arm doing its own thing over the animation (yo-yo): { side: 'Right' | 'Left', up 0..1, other 0..1 }.
  // up 0 = arm stretched down and forward (throw), 1 = elbow bent with the hand at the chest (catch);
  // other = how far forward the other hand comes (holding the string in two-hand tricks).
  setArmPose(pose) {
    if (!pose && this.armPose) this.resetArms();
    this.armPose = pose || null;
  }

  // knock: { Right, Left } 0..1 per raised fist (1 = touching the screen glass); a missing side keeps the clip.
  applyArmPose({ side = 'Right', up = 0.5, other = 0, knock = null }) {
    if (knock) {
      for (const [s, inward] of [['Right', 1], ['Left', -1]]) {
        const v = knock[s];
        const arm = v == null ? null : this.model.bones.get(`${s}Arm`);
        if (!arm) continue;
        const r = arm.userData.restRot;
        arm.rotation.set(r.x + 1.7 + 0.45 * v, r.y + inward * 0.3, r.z * 0.3, r.order);
        const fore = this.model.bones.get(`${s}ForeArm`);
        if (fore) {
          const f = fore.userData.restRot;
          fore.rotation.set(f.x + 1.25 - 1.05 * v, f.y, f.z, f.order);
        }
      }
      return;
    }
    const set = (name, ax, fx) => {
      const arm = this.model.bones.get(name);
      if (!arm) return;
      const r = arm.userData.restRot;
      arm.rotation.set(r.x + ax, r.y, r.z * 0.4, r.order);
      const fore = this.model.bones.get(name.replace('Arm', 'ForeArm'));
      if (fore) fore.rotation.set(fore.userData.restRot.x + fx, fore.userData.restRot.y, fore.userData.restRot.z, fore.userData.restRot.order);
    };
    const off = side === 'Right' ? 'LeftArm' : 'RightArm';
    set(`${side}Arm`, 0.55 + 0.55 * up, 0.25 + 1.15 * up);
    set(off, 0.15 + 0.95 * other, 0.2 + 0.5 * other);
  }

  // One hand (locator, else the middle of the forearm) relative to the feet, in CSS pixels (y up).
  handPoint(side) {
    const v = new THREE.Vector3();
    const loc = this.model.bones.get(`${side}HandLocator`);
    if (loc) loc.getWorldPosition(v);
    else {
      const fore = this.model.bones.get(`${side}ForeArm`) || this.model.bones.get(`${side}Arm`);
      if (!fore) return null;
      new THREE.Box3().setFromObject(fore, true).getCenter(v);
    }
    return { x: v.x * this.ppu, y: v.y * this.ppu };
  }

  // Midpoint between both hands relative to the feet, in CSS pixels (y up); null without hands.
  handsPoint() {
    const pts = [];
    const v = new THREE.Vector3();
    for (const side of ['Right', 'Left']) {
      const loc = this.model.bones.get(`${side}HandLocator`);
      if (loc) {
        pts.push(loc.getWorldPosition(v).clone());
        continue;
      }
      const fore = this.model.bones.get(`${side}ForeArm`) || this.model.bones.get(`${side}Arm`);
      if (fore) pts.push(new THREE.Box3().setFromObject(fore, true).getCenter(v).clone());
    }
    if (!pts.length) return null;
    const x = pts.reduce((s, p) => s + p.x, 0) / pts.length;
    const y = pts.reduce((s, p) => s + p.y, 0) / pts.length;
    return { x: x * this.ppu, y: y * this.ppu };
  }

  update(dt) {
    this.updateYaw(dt);
    this.animator.update(dt);
    if (this.hold) this.applyHold();
    else if (this.armPose) this.applyArmPose(this.armPose);
    else if (this.reach !== null && this.reach !== undefined) this.applyReach(this.reach);
    const snap = this.snap;
    this.updateAnchor(dt);
    this.hair.update(dt, snap);
    // The red flash fades out (it started when she took damage).
    if (this.flashT > 0) {
      this.flashT = Math.max(0, this.flashT - dt);
      const i = this.flashI * (this.flashT / 0.32);
      this.canvas.style.filter = `sepia(${(i * 0.9).toFixed(3)}) saturate(${(1 + i * 7).toFixed(2)}) hue-rotate(-40deg) brightness(${(1 + i * 0.4).toFixed(2)})`;
      if (this.flashT <= 0) {
        this.canvas.style.filter = '';
        this.flashI = 0;
      }
    }
    this.renderer.render(this.scene, this.camera);
  }

  // Whether the pet is drawn near (x, y), in canvas CSS pixels.
  hitTest(x, y, radius = 3) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return false;
    const gl = this.renderer.getContext();
    const d = this.renderer.getPixelRatio();
    const s = Math.max(1, Math.round(radius * d)) * 2 + 1;
    const cw = gl.drawingBufferWidth;
    const ch = gl.drawingBufferHeight;
    const px = Math.min(Math.max(Math.round(x * d) - (s >> 1), 0), cw - s);
    const py = Math.min(Math.max(Math.round((this.height - y) * d) - (s >> 1), 0), ch - s);
    const buf = new Uint8Array(s * s * 4);
    gl.readPixels(px, py, s, s, gl.RGBA, gl.UNSIGNED_BYTE, buf);
    for (let i = 3; i < buf.length; i += 4) if (buf[i] > 40) return true;
    return false;
  }

  dispose() {
    this.model.material.map?.dispose();
    this.model.material.dispose();
    this.scene.traverse((o) => o.geometry?.dispose());
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }
}
