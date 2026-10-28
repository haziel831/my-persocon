import * as THREE from './vendor/three.module.js';

// Converts Bedrock (YSM / Blockbench) geometry into a three.js bone hierarchy.
// Follows Blockbench's bedrock import conventions: X is mirrored, rotations use
// ZYX order with X and Y angles negated. The resulting model faces -Z.

const D2R = Math.PI / 180;
const FACE_SHADE = { north: 1, south: 1, east: 0.82, west: 0.82, up: 1, down: 0.62 };

export function bedrockRotation(r) {
  return new THREE.Euler(-(r?.[0] || 0) * D2R, -(r?.[1] || 0) * D2R, (r?.[2] || 0) * D2R, 'ZYX');
}

function bbPoint(p) {
  return new THREE.Vector3(-(p?.[0] || 0), p?.[1] || 0, p?.[2] || 0);
}

// Corners as seen from outside the face: top-left, top-right, bottom-left, bottom-right.
function faceCorners(face, a, b) {
  const [x0, y0, z0] = a;
  const [x1, y1, z1] = b;
  switch (face) {
    case 'north': return [[x1, y1, z0], [x0, y1, z0], [x1, y0, z0], [x0, y0, z0]];
    case 'south': return [[x0, y1, z1], [x1, y1, z1], [x0, y0, z1], [x1, y0, z1]];
    case 'east': return [[x1, y1, z1], [x1, y1, z0], [x1, y0, z1], [x1, y0, z0]];
    case 'west': return [[x0, y1, z0], [x0, y1, z1], [x0, y0, z0], [x0, y0, z1]];
    case 'up': return [[x0, y1, z0], [x1, y1, z0], [x0, y1, z1], [x1, y1, z1]];
    case 'down': return [[x0, y0, z1], [x1, y0, z1], [x0, y0, z0], [x1, y0, z0]];
  }
  return null;
}

// Box UV layout (used when a cube's "uv" is a [u, v] array).
function boxUV(uv, size, mirror) {
  const [u, v] = uv;
  const [w, h, d] = size.map((s) => Math.floor(s));
  const faces = {
    east: [u, v + d, d, h],
    north: [u + d, v + d, w, h],
    west: [u + d + w, v + d, d, h],
    south: [u + d + w + d, v + d, w, h],
    up: [u + d + w, v + d, -w, -d],
    down: [u + d + w + w, v, -w, d],
  };
  const out = {};
  for (const [k, [fu, fv, fw, fh]] of Object.entries(faces)) {
    out[k] = mirror ? { uv: [fu + fw, fv], uv_size: [-fw, fh] } : { uv: [fu, fv], uv_size: [fw, fh] };
  }
  if (mirror) [out.east, out.west] = [out.west, out.east];
  return out;
}

function buildBoneGeometry(bone, bonePivot, texW, texH) {
  const pos = [];
  const uvs = [];
  const col = [];
  const idx = [];

  for (const cube of bone.cubes || []) {
    const inflate = cube.inflate || 0;
    const o = cube.origin || [0, 0, 0];
    const s = cube.size || [0, 0, 0];
    const from = [-(o[0] + s[0]) - inflate, o[1] - inflate, o[2] - inflate];
    const to = [-o[0] + inflate, o[1] + s[1] + inflate, o[2] + s[2] + inflate];

    let xform = null;
    if (cube.rotation) {
      const piv = bbPoint(cube.pivot);
      const m = new THREE.Matrix4().makeRotationFromEuler(bedrockRotation(cube.rotation));
      xform = new THREE.Matrix4()
        .makeTranslation(piv.x, piv.y, piv.z)
        .multiply(m)
        .multiply(new THREE.Matrix4().makeTranslation(-piv.x, -piv.y, -piv.z));
    }

    const faces = Array.isArray(cube.uv) ? boxUV(cube.uv, s, cube.mirror) : cube.uv || {};
    for (const [face, def] of Object.entries(faces)) {
      if (!def || !def.uv) continue;
      const corners = faceCorners(face, from, to);
      if (!corners) continue;
      const size = def.uv_size || [0, 0];
      let u1, v1, u2, v2;
      if (face === 'up' || face === 'down') {
        u1 = def.uv[0] + size[0]; v1 = def.uv[1] + size[1];
        u2 = def.uv[0]; v2 = def.uv[1];
      } else {
        u1 = def.uv[0]; v1 = def.uv[1];
        u2 = def.uv[0] + size[0]; v2 = def.uv[1] + size[1];
      }
      const faceUV = [[u1, v1], [u2, v1], [u1, v2], [u2, v2]];
      const shade = FACE_SHADE[face];
      const base = pos.length / 3;
      for (let i = 0; i < 4; i++) {
        const v = new THREE.Vector3(...corners[i]);
        if (xform) v.applyMatrix4(xform);
        v.sub(bonePivot);
        pos.push(v.x, v.y, v.z);
        uvs.push(faceUV[i][0] / texW, 1 - faceUV[i][1] / texH);
        col.push(shade, shade, shade);
      }
      idx.push(base, base + 2, base + 1, base + 1, base + 2, base + 3);
    }
  }

  if (!pos.length) return null;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  return g;
}

export function buildModel(geoJson, texture) {
  const geo = geoJson['minecraft:geometry'][0];
  const texW = geo.description?.texture_width || 64;
  const texH = geo.description?.texture_height || 64;

  const material = new THREE.MeshBasicMaterial({
    map: texture,
    vertexColors: true,
    alphaTest: 0.1,
    side: THREE.DoubleSide,
  });

  const root = new THREE.Group();
  const bones = new Map();

  for (const b of geo.bones) {
    const group = new THREE.Group();
    group.name = b.name;
    const pivot = bbPoint(b.pivot);
    group.userData.pivot = pivot;
    group.rotation.copy(bedrockRotation(b.rotation));
    const g = buildBoneGeometry(b, pivot, texW, texH);
    if (g) group.add(new THREE.Mesh(g, material));
    bones.set(b.name, group);
  }

  for (const b of geo.bones) {
    const group = bones.get(b.name);
    const parent = b.parent ? bones.get(b.parent) : null;
    const parentPivot = parent ? parent.userData.pivot : new THREE.Vector3();
    group.position.copy(group.userData.pivot).sub(parentPivot);
    (parent || root).add(group);
    group.userData.restPos = group.position.clone();
    group.userData.restRot = group.rotation.clone();
  }

  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  return { root, bones, box, material, id: geo.description?.identifier || '' };
}
