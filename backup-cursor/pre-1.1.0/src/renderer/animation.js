import { compileMolang } from './molang.js';

const D2R = Math.PI / 180;

function compileVec(v, isScale) {
  if (Array.isArray(v)) {
    const fns = [0, 1, 2].map((i) => compileMolang(v[i] ?? 0));
    return (ctx) => [fns[0](ctx), fns[1](ctx), fns[2](ctx)];
  }
  const f = compileMolang(v ?? (isScale ? 1 : 0));
  return (ctx) => {
    const s = f(ctx);
    return [s, s, s];
  };
}

function isKeyframeMap(v) {
  return v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).some((k) => !Number.isNaN(parseFloat(k)));
}

function compileChannel(spec, isScale) {
  if (spec == null) return null;
  if (!isKeyframeMap(spec)) {
    if (spec && typeof spec === 'object' && !Array.isArray(spec)) {
      const v = compileVec(spec.post ?? spec.pre, isScale);
      return { length: 0, sample: v };
    }
    return { length: 0, sample: compileVec(spec, isScale) };
  }

  const keys = Object.entries(spec)
    .map(([t, val]) => {
      let pre, post, lerp = 'linear';
      if (val && typeof val === 'object' && !Array.isArray(val)) {
        post = val.post ?? val.pre;
        pre = val.pre ?? val.post;
        lerp = val.lerp_mode || 'linear';
      } else {
        pre = post = val;
      }
      return { t: parseFloat(t), pre: compileVec(pre, isScale), post: compileVec(post, isScale), lerp };
    })
    .filter((k) => !Number.isNaN(k.t))
    .sort((a, b) => a.t - b.t);

  const length = keys.length ? keys[keys.length - 1].t : 0;

  const sample = (ctx, time) => {
    if (keys.length === 1 || time <= keys[0].t) return keys[0].pre(ctx);
    const last = keys[keys.length - 1];
    if (time >= last.t) return last.post(ctx);
    let i = 0;
    while (i < keys.length - 1 && keys[i + 1].t <= time) i++;
    const k0 = keys[i];
    const k1 = keys[i + 1];
    const a = (time - k0.t) / (k1.t - k0.t || 1);
    const p1 = k0.post(ctx);
    const p2 = k1.pre(ctx);
    if (k0.lerp === 'catmullrom' || k1.lerp === 'catmullrom') {
      const p0 = (keys[i - 1] || k0).post(ctx);
      const p3 = (keys[i + 2] || k1).pre(ctx);
      return [0, 1, 2].map((j) => catmull(p0[j], p1[j], p2[j], p3[j], a));
    }
    return [0, 1, 2].map((j) => p1[j] + (p2[j] - p1[j]) * a);
  };

  return { length, sample };
}

function catmull(p0, p1, p2, p3, t) {
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}

export class AnimClip {
  constructor(name, json) {
    this.name = name;
    this.loop = json.loop === true || json.loop === 'true' ? 'loop' : json.loop === 'hold_on_last_frame' ? 'hold' : 'once';
    this.bones = {};
    let maxKey = 0;
    for (const [bone, chans] of Object.entries(json.bones || {})) {
      const c = {
        rotation: compileChannel(chans.rotation, false),
        position: compileChannel(chans.position, false),
        scale: compileChannel(chans.scale, true),
      };
      for (const ch of Object.values(c)) if (ch) maxKey = Math.max(maxKey, ch.length);
      this.bones[bone] = c;
    }
    this.length = Number(json.animation_length) || maxKey;
  }

  localTime(t) {
    if (this.length <= 0) return 0;
    if (this.loop === 'loop') return ((t % this.length) + this.length) % this.length;
    return Math.min(Math.max(t, 0), this.length);
  }

  finished(t) {
    return this.loop !== 'loop' && t >= this.length;
  }
}

export function loadClips(animFiles) {
  const clips = new Map();
  for (const file of animFiles) {
    for (const [name, json] of Object.entries(file.animations || {})) {
      clips.set(name, new AnimClip(name, json));
    }
  }
  return clips;
}

// Drives a bone hierarchy with one main clip at a time, crossfading between clips.
export class Animator {
  constructor(bones, clips) {
    this.bones = bones;
    this.clips = clips;
    this.ctx = {};
    this.current = null;
    this.time = 0;
    this.speed = 1;
    this.fadeFrom = null;
    this.fade = 1;
    this.fadeDuration = 0.18;
    this.pose = new Map();
  }

  // Clips turned off by the player count as missing (force: debug preview).
  has(name) {
    return this.clips.has(name) && !this.disabled?.has(name);
  }

  play(name, { restart = false, fade = 0.18, speed = 1, force = false } = {}) {
    if (!force && this.disabled?.has(name)) name = this.has('idle') ? 'idle' : null;
    const clip = this.clips.get(name);
    if (!clip) return;
    this.speed = speed;
    if (this.current === clip && !restart) return;
    this.fadeFrom = this.pose.size ? new Map([...this.pose].map(([k, v]) => [k, v.map((a) => a.slice())])) : null;
    this.fade = fade > 0 && this.fadeFrom ? 0 : 1;
    this.fadeDuration = fade;
    this.current = clip;
    this.time = 0;
  }

  get finished() {
    return this.current ? this.current.finished(this.time) : true;
  }

  samplePose(clip, time) {
    const pose = new Map();
    const lt = clip.localTime(time);
    for (const [name, ch] of Object.entries(clip.bones)) {
      if (!this.bones.has(name)) continue;
      const rot = ch.rotation ? ch.rotation.sample(this.ctx, lt) : [0, 0, 0];
      const pos = ch.position ? ch.position.sample(this.ctx, lt) : [0, 0, 0];
      const scl = ch.scale ? ch.scale.sample(this.ctx, lt) : [1, 1, 1];
      pose.set(name, [rot, pos, scl]);
    }
    return pose;
  }

  update(dt) {
    if (!this.current) return;
    this.time += dt * this.speed;
    if (this.fade < 1) this.fade = Math.min(1, this.fade + dt / this.fadeDuration);

    const target = this.samplePose(this.current, this.time);
    const pose = new Map();
    const ident = [[0, 0, 0], [0, 0, 0], [1, 1, 1]];
    const names = new Set([...target.keys(), ...(this.fade < 1 && this.fadeFrom ? this.fadeFrom.keys() : [])]);
    const f = this.fade;
    for (const name of names) {
      const b = target.get(name) || ident;
      if (f >= 1 || !this.fadeFrom) {
        pose.set(name, b);
        continue;
      }
      const a = this.fadeFrom.get(name) || ident;
      pose.set(name, [0, 1, 2].map((c) => [0, 1, 2].map((j) => a[c][j] + (b[c][j] - a[c][j]) * f)));
    }
    this.pose = pose;

    for (const [name, bone] of this.bones) {
      const p = pose.get(name) || ident;
      const rr = bone.userData.restRot;
      const rp = bone.userData.restPos;
      bone.rotation.set(rr.x - p[0][0] * D2R, rr.y - p[0][1] * D2R, rr.z + p[0][2] * D2R, 'ZYX');
      bone.position.set(rp.x - p[1][0], rp.y + p[1][1], rp.z + p[1][2]);
      bone.scale.set(p[2][0], p[2][1], p[2][2]);
    }
  }
}
