import * as THREE from './vendor/three.module.js';

// Spring chains for bones named "HairPhys*" (the bundled model's twin tails): each segment hangs
// toward gravity with some lag and lies down on the floor (world y = 0) instead of crossing it.
const DOWN = new THREE.Vector3(0, -1, 0);
const STIFF = 0.18;
const SPRING = 90;
const DAMP = 11;

export class HairPhysics {
  constructor(root) {
    this.segs = [];
    root.traverse((o) => {
      if (o.isGroup && /^HairPhys/i.test(o.name)) this.segs.push({ bone: o, dir: null, vel: new THREE.Vector3(), len: 0 });
    });
    for (const s of this.segs) {
      const child = s.bone.children.find((c) => /^HairPhys/i.test(c.name));
      s.len = child ? child.position.length() : 0;
    }
    for (const s of this.segs) if (!s.len) s.len = Math.max(1, ...this.segs.filter((o) => o.len).map((o) => o.len));
    this.q = new THREE.Quaternion();
    this.v = new THREE.Vector3();
    this.anim = new THREE.Vector3();
    this.target = new THREE.Vector3();
    this.pos = new THREE.Vector3();
    this.scale = new THREE.Vector3();
  }

  get active() {
    return this.segs.length > 0;
  }

  update(dt, snap = false) {
    if (!this.segs.length) return;
    dt = Math.min(dt, 1 / 20);
    for (const s of this.segs) {
      const { bone } = s;
      bone.parent.updateWorldMatrix(true, false);
      bone.parent.matrixWorld.decompose(this.v, this.q, this.scale);
      bone.updateWorldMatrix(false, false);
      this.pos.setFromMatrixPosition(bone.matrixWorld);
      const len = s.len * this.scale.y;
      this.anim.copy(DOWN).applyQuaternion(bone.quaternion).applyQuaternion(this.q).normalize();
      const t = this.target.copy(DOWN).lerp(this.anim, STIFF).normalize();
      const room = this.pos.y - 0.15;
      if (len > 0 && t.y * len < -room) {
        const h = this.v.set(t.x, 0, t.z);
        if (h.lengthSq() < 1e-4) h.set(this.anim.x, 0, this.anim.z);
        if (h.lengthSq() < 1e-4) h.set(0, 0, 1);
        h.normalize();
        const y = Math.max(-1, Math.min(0, -room / len));
        t.copy(h).multiplyScalar(Math.sqrt(1 - y * y)).setY(y);
      }
      if (snap || !s.dir) {
        s.dir = t.clone();
        s.vel.set(0, 0, 0);
      } else {
        s.vel.addScaledVector(this.v.copy(t).sub(s.dir), SPRING * dt).multiplyScalar(Math.exp(-DAMP * dt));
        s.dir.addScaledVector(s.vel, dt).normalize();
      }
      const local = this.v.copy(s.dir).applyQuaternion(this.q.invert()).normalize();
      bone.quaternion.setFromUnitVectors(DOWN, local);
      bone.updateMatrixWorld(true);
    }
  }
}
