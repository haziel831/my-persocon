// Custom looks for objects. Priority: an image/GIF/3D model imported for that object, then the
// Minecraft resourcepack (1.20.1 layout), then the built-in pixel art.
const TEX = 'assets/minecraft/textures/';
const SND = 'assets/minecraft/sounds/';

// Object id -> resourcepack texture(s). 'food' is the supplies bag (barrel), 'bag' the cartridge bag (chest).
const RP_ITEMS = {
  maca: 'item/apple.png', cenoura: 'item/carrot.png', pao: 'item/bread.png', biscoito: 'item/cookie.png',
  sopa: 'item/mushroom_stew.png', peixe: 'item/cooked_cod.png', carne: 'item/cooked_beef.png', bolo: 'item/cake.png',
  agua: 'item/potion.png', suco: 'item/honey_bottle.png', leite: 'item/milk_bucket.png', salada: 'item/beetroot_soup.png',
  sanduiche: 'item/baked_potato.png', sorvete: 'item/snowball.png', hamburguer: 'item/cooked_porkchop.png',
  pizza: 'item/pumpkin_pie.png', espada: 'item/iron_sword.png', bola: 'item/slime_ball.png', bola_queimada: 'item/fire_charge.png',
  bola_volei: 'item/snowball.png', bola_basquete: 'item/magma_cream.png', remedio: 'item/glass_bottle.png',
};
const RP_FURN = {
  food: 'block/barrel_side.png', estante: 'block/bookshelf.png', alvo: 'block/target_side.png',
  almofada: 'block/white_wool.png', globo: 'block/sea_lantern.png', holofote: 'block/redstone_lamp_on.png',
};
const RP_SOUNDS = {
  bonk: ['damage/hit1', 'damage/hit2', 'damage/hit3'], hit: ['damage/hit1', 'damage/hit2'], explode: ['random/explode1', 'random/explode2', 'random/explode3', 'random/explode4'],
  jump: ['step/cloth1', 'step/cloth2', 'step/cloth3'], footstep: ['step/grass1', 'step/grass2', 'step/grass3', 'step/grass4'],
  landing: ['damage/fallsmall'], blastoff: ['random/bow'], teleport: ['mob/endermen/portal'], blip: ['random/click'],
  ok: ['random/orb'], cancel: ['random/break'],
};
export const RP_PARTS = [
  ['janelas', 'Janelas (tema)'], ['itens', 'Itens e comidas'], ['sons', 'Sons'], ['musicas', 'Músicas'], ['mobilia', 'Mobília e bolsas'],
];

const loadImg = (src) => new Promise((ok, fail) => {
  const i = new Image();
  i.onload = () => ok(i);
  i.onerror = fail;
  i.src = src;
});
const canvas = (w, h) => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  return [c, g];
};
const hex = (d) => `#${[d[0], d[1], d[2]].map((v) => v.toString(16).padStart(2, '0')).join('')}`;

// Chest front from entity/chest/normal.png (lid, latch, base).
async function chestFront(src) {
  const img = await loadImg(src);
  const k = img.width / 64;
  const [c, g] = canvas(14 * k, 15 * k);
  g.drawImage(img, 14 * k, 14 * k, 14 * k, 5 * k, 0, 0, 14 * k, 5 * k);
  g.drawImage(img, 14 * k, 33 * k, 14 * k, 10 * k, 0, 5 * k, 14 * k, 10 * k);
  g.drawImage(img, 1 * k, 1 * k, 2 * k, 4 * k, 6 * k, 3 * k, 2 * k, 4 * k);
  return c.toDataURL('image/png');
}

// Side view of a bed: wool mattress over planks with two legs.
async function bedArt(wool, planks) {
  const [w, p] = await Promise.all([loadImg(wool), planks ? loadImg(planks) : null]);
  const [c, g] = canvas(68, 36);
  g.drawImage(w, 0, 0, w.width, w.height / 2, 0, 6, 68, 12);
  g.drawImage(w, 0, 0, w.width, w.height / 3, 2, 0, 18, 8);
  if (p) {
    g.drawImage(p, 0, 0, p.width, p.height / 2, 0, 18, 68, 10);
    g.drawImage(p, 0, 0, 4, p.height, 2, 28, 6, 8);
    g.drawImage(p, 0, 0, 4, p.height, 60, 28, 6, 8);
  }
  return c.toDataURL('image/png');
}

// Animated GIF / APNG -> frames (max 64px..256px) with their delays.
export async function decodeAnimated(dataUrl, max = 160) {
  const blob = await (await fetch(dataUrl)).blob();
  if (!('ImageDecoder' in window)) return { frames: [dataUrl], delays: [100] };
  const dec = new ImageDecoder({ data: blob.stream(), type: blob.type || 'image/gif' });
  await dec.tracks.ready;
  const n = Math.min(dec.tracks.selectedTrack?.frameCount || 1, 60);
  const frames = [];
  const delays = [];
  for (let i = 0; i < n; i++) {
    const { image } = await dec.decode({ frameIndex: i });
    const s = Math.min(1, max / Math.max(image.displayWidth, image.displayHeight));
    const [c, g] = canvas(Math.max(1, Math.round(image.displayWidth * s)), Math.max(1, Math.round(image.displayHeight * s)));
    g.drawImage(image, 0, 0, c.width, c.height);
    frames.push(c.toDataURL('image/png'));
    delays.push(Math.max(20, (image.duration || 100000) / 1000));
    image.close();
  }
  return { frames, delays };
}

// .gltf keeps the mesh and textures in sibling files. Pack them into one GLB so the
// loader never fetches those files (a missing .bin surfaces as "Invalid typed array length").
function beside(file, uri) {
  const rel = decodeURIComponent(uri.split(/[?#]/)[0]);
  const sep = file.includes('\\') ? '\\' : '/';
  return file.replace(/[/\\][^/\\]*$/, '') + sep + rel.replace(/[\\/]/g, sep);
}

function bytesToDataUrl(bytes, mime) {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return `data:${mime};base64,${btoa(bin)}`;
}

function glbBytes(json, bin) {
  const jsonBytes = new TextEncoder().encode(JSON.stringify(json));
  const jsonPad = (4 - (jsonBytes.length % 4)) % 4;
  const binPad = (4 - (bin.length % 4)) % 4;
  const total = 12 + 8 + jsonBytes.length + jsonPad + 8 + bin.length + binPad;
  const out = new Uint8Array(total);
  const view = new DataView(out.buffer);
  view.setUint32(0, 0x46546C67, true);
  view.setUint32(4, 2, true);
  view.setUint32(8, total, true);
  let o = 12;
  view.setUint32(o, jsonBytes.length + jsonPad, true);
  view.setUint32(o + 4, 0x4E4F534A, true);
  out.set(jsonBytes, o + 8);
  out.fill(0x20, o + 8 + jsonBytes.length, o + 8 + jsonBytes.length + jsonPad);
  o += 8 + jsonBytes.length + jsonPad;
  view.setUint32(o, bin.length + binPad, true);
  view.setUint32(o + 4, 0x004E4942, true);
  out.set(bin, o + 8);
  return out;
}

async function uriBytes(file, uri) {
  if (/^data:/i.test(uri)) return new Uint8Array(await (await fetch(uri)).arrayBuffer());
  try {
    const data = await window.petAPI.readFileData(beside(file, uri));
    return new Uint8Array(await (await fetch(data)).arrayBuffer());
  } catch {
    throw new Error(`Não achei "${uri}" na pasta do modelo.`);
  }
}

export async function readModel(path) {
  const data = await window.petAPI.readFileData(path);
  if (!/\.gltf$/i.test(path)) return data;
  const json = JSON.parse(new TextDecoder().decode(await (await fetch(data)).arrayBuffer()));
  const buffers = json.buffers || [];
  const external = [...buffers.map((b) => b.uri), ...(json.images || []).map((im) => im.uri)].filter((u) => u && !/^(data:|https?:|blob:)/i.test(u));
  if (!external.length) return data;
  if (buffers.length !== 1 || !buffers[0].uri) throw new Error('Este .gltf não traz a malha num único arquivo ao lado.');
  let bin = await uriBytes(path, buffers[0].uri);
  delete buffers[0].uri;
  const views = json.bufferViews || (json.bufferViews = []);
  for (const im of json.images || []) {
    if (!im.uri || /^(data:|https?:|blob:)/i.test(im.uri)) continue;
    const bytes = await uriBytes(path, im.uri);
    const pad = (4 - (bin.length % 4)) % 4;
    const next = new Uint8Array(bin.length + pad + bytes.length);
    next.set(bin);
    next.set(bytes, bin.length + pad);
    views.push({ buffer: 0, byteOffset: bin.length + pad, byteLength: bytes.length });
    im.bufferView = views.length - 1;
    if (!im.mimeType) im.mimeType = /\.jpe?g$/i.test(im.uri) ? 'image/jpeg' : 'image/png';
    delete im.uri;
    bin = next;
  }
  buffers[0].byteLength = bin.length;
  return bytesToDataUrl(glbBytes(json, bin), 'model/gltf-binary');
}

// 3D model (.glb/.gltf/.vrm data URL, or an already built three.js object such as a posed YSM)
// rendered to images: one at the chosen rotation, or a spinning loop.
export async function render3d(source, { rot = 0, tilt = 0, spin = false, size = 160, count = 24 } = {}) {
  const THREE = await import('./vendor/three.module.js');
  let model = source;
  if (typeof source === 'string') {
    const { GLTFLoader } = await import('./vendor/addons/loaders/GLTFLoader.js');
    const buf = await (await fetch(source)).arrayBuffer();
    model = (await new GLTFLoader().parseAsync(buf, '')).scene;
  }
  const scene = new THREE.Scene();
  scene.add(new THREE.AmbientLight(0xffffff, 1.6));
  const sun = new THREE.DirectionalLight(0xffffff, 2);
  sun.position.set(1, 2, 3);
  scene.add(sun);
  const root = new THREE.Group();
  const holder = new THREE.Group();
  holder.add(model);
  root.add(holder);
  scene.add(root);
  const box = new THREE.Box3().setFromObject(holder);
  const dim = box.getSize(new THREE.Vector3());
  const ctr = box.getCenter(new THREE.Vector3());
  holder.position.copy(ctr).negate();
  const r = Math.max(dim.x, dim.y, dim.z) * 0.6 || 1;
  const cam = new THREE.OrthographicCamera(-r, r, r, -r, 0.01, r * 20);
  cam.position.set(0, 0, r * 6);
  const cv = document.createElement('canvas');
  const ren = new THREE.WebGLRenderer({ canvas: cv, alpha: true, antialias: true, preserveDrawingBuffer: true });
  ren.setSize(size, size, false);
  ren.setClearColor(0x000000, 0);
  const frames = [];
  const n = spin ? count : 1;
  for (let i = 0; i < n; i++) {
    root.rotation.set(tilt * Math.PI / 180, (rot * Math.PI) / 180 + (spin ? (i / n) * Math.PI * 2 : 0), 0);
    ren.render(scene, cam);
    frames.push(cv.toDataURL('image/png'));
  }
  ren.dispose();
  ren.forceContextLoss?.();
  return { frames, delays: frames.map(() => 80), ratio: 1 };
}

export class Skins {
  constructor(app) {
    this.app = app;
    this.objects = {};
    this.rp = null;
    this.music = null;
    globalThis.petSkins = this;
  }

  async load() {
    const api = window.petAPI;
    try {
      this.objects = (await api?.loadBlob?.('objects')) || {};
    } catch {}
    this.rp = null;
    if (this.app.config?.theme === 'resourcepack') this.app.setOption?.('theme', 'padrao');
    this.applyRp();
  }

  // Current image of an object (animated objects cycle through their frames).
  art(id, fallback) {
    const o = this.objects[id];
    if (o?.frames?.length) {
      if (o.frames.length === 1) return o.frames[0];
      const total = o.delays.reduce((a, b) => a + b, 0) / (o.speed || 1);
      let t = performance.now() % total;
      for (let i = 0; i < o.frames.length; i++) {
        t -= o.delays[i] / (o.speed || 1);
        if (t < 0) return o.frames[i];
      }
      return o.frames[0];
    }
    const rp = this.rp;
    if (rp?.tex?.[id] && ((rp.parts.mobilia && rp.furn?.includes(id)) || (rp.parts.itens && !rp.furn?.includes(id)))) return rp.tex[id];
    return fallback;
  }

  has(id) {
    return !!this.objects[id]?.frames?.length || !!this.rp?.tex?.[id];
  }

  // Height / width of a custom image (null = use the default proportions).
  ratio(id) {
    const o = this.objects[id];
    if (o?.ratio) return o.ratio;
    if (!o && this.rp?.tex?.[id] && this.rp.ratio?.[id]) return this.rp.ratio[id];
    return null;
  }

  region(id) {
    return this.objects[id]?.region || null;
  }

  // The hitbox of a custom image: the part that really answers the click (null = all of it).
  hitbox(id) {
    return this.objects[id]?.hitbox || null;
  }

  // The size of a custom image (1 = the same size as the default art).
  scale(id) {
    return this.objects[id]?.scale || 1;
  }

  async setObject(id, data) {
    if (data) this.objects[id] = data;
    else delete this.objects[id];
    await window.petAPI?.storeBlob?.('objects', this.objects).catch(() => {});
    this.app.toys?.refreshArt?.();
  }

  // ---------- resourcepack ----------

  // Names in the zip plus a few textures for the preview.
  async scan(path) {
    const head = await window.petAPI.readZip(path, ['pack.png', `${TEX}gui/widgets.png`, `${TEX}gui/container/inventory.png`,
      `${TEX}block/barrel_side.png`, `${TEX}entity/chest/normal.png`, `${TEX}item/apple.png`, `${TEX}block/bookshelf.png`], 10);
    const names = head.names || [];
    const has = {
      janelas: names.some((n) => n.startsWith(`${TEX}gui/`)),
      itens: names.some((n) => n.startsWith(`${TEX}item/`)),
      sons: names.some((n) => n.startsWith(SND) && !n.startsWith(`${SND}music/`) && !n.startsWith(`${SND}records/`)),
      musicas: names.some((n) => n.startsWith(`${SND}music/`) || n.startsWith(`${SND}records/`)),
      mobilia: names.some((n) => n.startsWith(`${TEX}block/`) || n.startsWith(`${TEX}entity/chest/`)),
    };
    return { names, files: head.files || {}, has };
  }

  async importPack(path, parts, scan) {
    const want = new Set();
    const tex = (p) => want.add(TEX + p);
    if (parts.itens) Object.values(RP_ITEMS).forEach(tex);
    if (parts.mobilia) {
      Object.values(RP_FURN).forEach(tex);
      ['entity/chest/normal.png', 'block/red_wool.png', 'block/oak_planks.png'].forEach(tex);
    }
    if (parts.janelas) ['gui/widgets.png', 'gui/container/inventory.png'].forEach(tex);
    if (parts.sons) Object.values(RP_SOUNDS).flat().forEach((s) => want.add(`${SND}${s}.ogg`));
    const music = parts.musicas ? scan.names.filter((n) => /\.ogg$/.test(n) && (n.startsWith(`${SND}music/`) || n.startsWith(`${SND}records/`))).slice(0, 12) : [];
    music.forEach((n) => want.add(n));
    const { files } = await window.petAPI.readZip(path, [...want], want.size + 4);
    const get = (p) => files[TEX + p];
    const rp = { parts, tex: {}, ratio: {}, furn: [], sounds: {}, music: [], gui: null, name: path.split(/[\\/]/).pop() };
    if (parts.itens) for (const [id, p] of Object.entries(RP_ITEMS)) if (get(p)) rp.tex[id] = get(p);
    if (parts.mobilia) {
      for (const [id, p] of Object.entries(RP_FURN)) if (get(p)) { rp.tex[id] = get(p); rp.furn.push(id); }
      if (get('entity/chest/normal.png')) { rp.tex.bag = await chestFront(get('entity/chest/normal.png')); rp.ratio.bag = 15 / 14; rp.furn.push('bag'); }
      if (get('block/red_wool.png')) { rp.tex.cama = await bedArt(get('block/red_wool.png'), get('block/oak_planks.png')); rp.ratio.cama = 36 / 68; rp.furn.push('cama'); }
      for (const id of ['food', 'estante', 'alvo', 'globo', 'holofote']) if (rp.tex[id]) rp.ratio[id] = 1;
      if (rp.tex.almofada) rp.ratio.almofada = 0.45;
    }
    if (parts.janelas) rp.gui = await this.guiFrom(get('gui/inventory.png') || get('gui/container/inventory.png'), get('gui/widgets.png'));
    if (parts.sons) for (const [k, list] of Object.entries(RP_SOUNDS)) {
      const found = list.map((s) => files[`${SND}${s}.ogg`]).filter(Boolean);
      if (found.length) rp.sounds[k] = found;
    }
    rp.music = music.map((n) => files[n]).filter(Boolean);
    this.rp = rp;
    await window.petAPI.storeBlob('resourcepack', rp).catch(() => {});
    if (parts.janelas && rp.gui) this.app.setOption?.('theme', 'resourcepack');
    this.applyRp();
    return rp;
  }

  async clearPack() {
    this.rp = null;
    this.stopMusic();
    await window.petAPI?.storeBlob?.('resourcepack', null).catch(() => {});
    if (this.app.config.theme === 'resourcepack') this.app.setOption?.('theme', 'padrao');
    this.applyRp();
  }

  async guiFrom(inv, widgets) {
    if (!inv && !widgets) return null;
    const out = { bg: '#c6c6c6', light: '#ffffff', dark: '#555555', accent: '#3a6ea5', btn: null, btnHover: null };
    if (inv) {
      const img = await loadImg(inv);
      const k = img.width / 256;
      const [, g] = canvas(img.width, img.height);
      g.drawImage(img, 0, 0);
      const px = (x, y) => hex(g.getImageData(Math.floor(x * k), Math.floor(y * k), 1, 1).data);
      out.bg = px(10, 10);
      out.light = px(3, 3);
      out.dark = px(172, 162);
    }
    if (widgets) {
      const img = await loadImg(widgets);
      const k = img.width / 256;
      const crop = (y) => {
        const [c, g] = canvas(200 * k, 20 * k);
        g.drawImage(img, 0, y * k, 200 * k, 20 * k, 0, 0, 200 * k, 20 * k);
        return c.toDataURL('image/png');
      };
      out.btn = crop(66);
      out.btnHover = crop(86);
      const [, g] = canvas(img.width, img.height);
      g.drawImage(img, 0, 0);
      out.accent = hex(g.getImageData(Math.floor(100 * k), Math.floor(96 * k), 1, 1).data);
    }
    return out;
  }

  applyRp() {
    const rp = this.rp;
    const s = document.documentElement.style;
    const gui = rp?.parts?.janelas ? rp.gui : null;
    if (gui) {
      s.setProperty('--rp-bg', gui.bg);
      s.setProperty('--rp-light', gui.light);
      s.setProperty('--rp-dark', gui.dark);
      s.setProperty('--rp-accent', gui.accent);
      s.setProperty('--rp-btn', gui.btn ? `url("${gui.btn}")` : 'none');
      s.setProperty('--rp-btn-hover', gui.btnHover ? `url("${gui.btnHover}")` : 'none');
    }
    this.app.sound?.setPack?.(rp?.parts?.sons ? rp.sounds : null);
    this.app.toys?.refreshArt?.();
  }

  get hasMusic() {
    return !!this.rp?.parts?.musicas && !!this.rp.music?.length;
  }

  playMusic() {
    if (!this.hasMusic) return;
    this.stopMusic();
    const list = this.rp.music;
    const a = (this.music = new Audio(list[Math.floor(Math.random() * list.length)]));
    a.volume = Math.max(0, Math.min(1, (this.app.config.volume ?? 0.3) * 0.8));
    a.onended = () => this.music === a && this.playMusic();
    a.play().catch(() => {});
  }

  stopMusic() {
    if (!this.music) return;
    this.music.onended = null;
    this.music.pause();
    this.music = null;
  }
}
