// Toys from v1.21: yo-yo, hula hoop, kite, magic cube, skateboard, aquarium, keyboard, trampoline,
// instant camera, wind-up robot and tamagotchi. Catalog, pixel art and what the pet does with each
// one; Toys hands them over through owns()/play(). Their progress lives in profile.fun.
import { icon, defineIcons } from './pixel.js';
import { FURN, baseId } from './furniture.js';

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (l) => l[Math.floor(Math.random() * l.length)];
const clamp = (v, a, b) => Math.min(Math.max(v, a), b);

export const ALBUM_MAX = 12;

// ---------- pixel art ----------
const CUBE = ['#e23c3c', '#3c6be0', '#ffd23f', '#5fd36a', '#ff8a3d', '#f4f1ea'];
const cubeFace = (seed) => (sprite) => sprite(13, 13, ({ rect }) => {
  rect(0, 0, 13, 13, '#1d1a26');
  let s = seed;
  for (let i = 0; i < 9; i++) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    rect(1 + (i % 3) * 4, 1 + Math.floor(i / 3) * 4, 3, 3, seed ? CUBE[s % 6] : CUBE[0]);
  }
});
defineIcons({
  ioio: (sprite) => sprite(10, 10, ({ circle, rect }) => {
    circle(5, 5, 4, '#e2384d'); rect(1, 4, 8, 2, '#f4f1ea'); circle(5, 5, 1, '#7a1020');
  }),
  ioio_loop: (sprite) => sprite(5, 5, ({ rect }) => {
    rect(1, 1, 3, 1, '#f4f1ea'); rect(1, 3, 3, 1, '#f4f1ea'); rect(1, 1, 1, 3, '#f4f1ea'); rect(3, 1, 1, 3, '#f4f1ea');
  }),
  bambole: (sprite) => sprite(22, 8, ({ rect }) => {
    rect(4, 0, 14, 2, '#ff4fa3'); rect(4, 6, 14, 2, '#ff4fa3'); rect(0, 3, 2, 2, '#ff4fa3'); rect(20, 3, 2, 2, '#ff4fa3');
    rect(1, 1, 3, 2, '#ff4fa3'); rect(18, 1, 3, 2, '#ff4fa3'); rect(1, 5, 3, 2, '#ff4fa3'); rect(18, 5, 3, 2, '#ff4fa3');
    for (let x = 5; x < 18; x += 4) { rect(x, 0, 2, 2, '#ffd23f'); rect(x + 1, 6, 2, 2, '#4fc3ff'); }
  }),
  pipa: (sprite) => sprite(16, 22, ({ rect, px }) => {
    for (let y = 0; y <= 12; y++) {
      const half = y <= 5 ? y + 1 : 13 - y;
      rect(8 - half, y, half, 1, '#ff4f6d');
      rect(8, y, half, 1, '#ffd23f');
    }
    rect(8, 0, 1, 13, '#8a5a2b'); rect(2, 5, 13, 1, '#8a5a2b');
    for (let y = 13; y < 22; y++) px(8 + ((y >> 1) % 2), y, '#f4f1ea');
    rect(6, 16, 2, 2, '#4fc3ff'); rect(9, 19, 2, 2, '#5fd36a');
  }),
  carretel: (sprite) => sprite(8, 8, ({ rect }) => {
    rect(0, 0, 8, 2, '#8a5a2b'); rect(0, 6, 8, 2, '#8a5a2b'); rect(1, 2, 6, 4, '#f4f1ea'); rect(3, 2, 2, 4, '#d8d4c8');
  }),
  cubo: cubeFace(0),
  cubo_a: cubeFace(7),
  cubo_b: cubeFace(42),
  cubo_c: cubeFace(1234),
  skate: (sprite) => sprite(26, 8, ({ rect }) => {
    rect(2, 2, 22, 2, '#8a5a2b'); rect(0, 1, 2, 2, '#8a5a2b'); rect(24, 1, 2, 2, '#8a5a2b');
    rect(2, 2, 22, 1, '#2b2b36'); rect(9, 3, 8, 1, '#ff4fa3');
    rect(5, 4, 3, 1, '#a8acb8'); rect(18, 4, 3, 1, '#a8acb8');
    rect(4, 5, 2, 2, '#ffd23f'); rect(7, 5, 2, 2, '#ffd23f'); rect(17, 5, 2, 2, '#ffd23f'); rect(20, 5, 2, 2, '#ffd23f');
  }),
  aquario: (sprite) => sprite(32, 26, (p) => tankArt(p, true)),
  aquario_tank: (sprite) => sprite(32, 26, (p) => tankArt(p, false)),
  racao: (sprite) => sprite(6, 8, ({ rect, px }) => {
    rect(0, 1, 6, 7, '#ffb347'); rect(0, 0, 6, 1, '#d8dce8'); rect(1, 3, 4, 2, '#3fa9d8'); px(4, 3, '#ff8a3d');
  }),
  esponja: (sprite) => sprite(8, 5, ({ rect }) => { rect(0, 0, 8, 2, '#5fd36a'); rect(0, 2, 8, 3, '#ffd23f'); }),
  teclado: (sprite) => sprite(34, 20, ({ rect }) => {
    rect(5, 10, 2, 10, '#3a3a46'); rect(27, 10, 2, 10, '#3a3a46'); rect(7, 15, 20, 1, '#3a3a46');
    rect(0, 1, 34, 9, '#26262e'); rect(0, 1, 34, 1, '#3e3e4c');
    rect(3, 4, 28, 5, '#f4f1ea');
    for (let k = 1; k < 14; k++) rect(3 + k * 2, 4, 1, 5, '#b8b4aa');
    for (let o = 0; o < 2; o++) for (const k of [0, 1, 3, 4, 5]) rect(3 + (o * 7 + k) * 2 + 1, 4, 2, 3, '#1d1a26');
    rect(4, 2, 2, 1, '#ff4fa3'); rect(7, 2, 2, 1, '#5fd0ff'); rect(25, 2, 6, 1, '#5fd36a');
  }),
  pula_pula: (sprite) => sprite(32, 12, ({ rect }) => {
    rect(3, 6, 2, 6, '#3a3a46'); rect(27, 6, 2, 6, '#3a3a46'); rect(15, 6, 2, 6, '#3a3a46');
    rect(0, 3, 32, 3, '#3c6be0'); rect(0, 3, 32, 1, '#6f95ff');
    rect(3, 2, 26, 2, '#1d1a26'); rect(5, 2, 22, 1, '#34303f');
    for (let x = 2; x < 31; x += 4) rect(x, 4, 2, 1, '#ffd23f');
  }),
  camera: (sprite) => sprite(14, 12, ({ rect, circle }) => {
    rect(11, 0, 2, 2, '#e23c3c');
    rect(0, 2, 14, 10, '#f4f1ea'); rect(0, 8, 14, 4, '#ff6fb5'); rect(2, 10, 10, 1, '#1d1a26');
    circle(7, 6, 3, '#2b2b36'); circle(7, 6, 1, '#7fb8ff');
    rect(1, 3, 3, 2, '#ffd23f'); rect(10, 3, 3, 2, '#2b2b36');
  }),
  robo: (sprite) => sprite(12, 16, ({ rect, px }) => {
    rect(5, 0, 2, 2, '#888'); px(5, 0, '#ff3b6b');
    rect(2, 2, 8, 5, '#b8bcc8'); rect(3, 4, 2, 1, '#5fd0ff'); rect(7, 4, 2, 1, '#5fd0ff'); rect(4, 6, 4, 1, '#3a3a46');
    rect(1, 7, 10, 6, '#d94a4a'); rect(4, 9, 4, 2, '#ffd23f');
    rect(0, 8, 1, 4, '#b8bcc8'); rect(11, 8, 1, 4, '#b8bcc8');
    rect(2, 13, 3, 3, '#6a6e7a'); rect(7, 13, 3, 3, '#6a6e7a');
  }),
  tamagotchi: (sprite) => sprite(10, 12, ({ rect, circle, px }) => {
    rect(4, 0, 2, 1, '#d8dce8'); circle(5, 6, 4, '#ff9ad5'); rect(1, 3, 8, 6, '#ff9ad5');
    rect(2, 3, 6, 4, '#c8e6a0'); rect(4, 4, 2, 2, '#2b3a1a');
    px(3, 9, '#ffd23f'); px(5, 10, '#ffd23f'); px(7, 9, '#ffd23f');
  }),
  fun_blank: (sprite) => sprite(2, 2, () => {}),
});

// Glass tank on a little cabinet; the shop picture has fish, the placed one gets live fish.
function tankArt({ rect, px }, fish) {
  rect(2, 20, 28, 6, '#5a3818'); rect(2, 20, 28, 1, '#8a5a2b'); rect(14, 22, 4, 2, '#3a2410');
  rect(0, 0, 32, 20, '#2b3a4a'); rect(0, 0, 32, 2, '#1d2a36');
  rect(1, 3, 30, 16, '#3fa9d8'); rect(1, 3, 30, 1, '#7fd0f0');
  rect(1, 16, 30, 3, '#e8d18a'); rect(6, 15, 3, 1, '#a89a70');
  rect(4, 10, 1, 6, '#3c9a4a'); rect(5, 12, 1, 4, '#3c9a4a'); rect(25, 9, 1, 7, '#3c9a4a'); rect(26, 12, 1, 4, '#3c9a4a');
  if (fish) {
    rect(10, 7, 4, 2, '#ff8a3d'); rect(14, 6, 1, 4, '#ff8a3d'); px(10, 7, '#1d1a26');
    rect(19, 11, 4, 2, '#ffd23f'); rect(18, 10, 1, 4, '#ffd23f'); px(22, 11, '#1d1a26');
  }
}

// ---------- catalog ----------
Object.assign(FURN, {
  aquario: { size: 0.62, ratio: 26 / 32, back: true },
  teclado: { size: 0.7, ratio: 20 / 34 },
  pula_pula: { size: 0.72, ratio: 12 / 32, back: true },
});
// Size (pet heights) and height/width of the ones that aren't furniture.
export const FUN_SIZE = {
  ioio: [0.09, 1], bambole: [0.38, 8 / 22], pipa: [0.2, 22 / 16], cubo: [0.11, 1], skate: [0.34, 8 / 26],
  camera: [0.17, 12 / 14], robo: [0.17, 16 / 12], tamagotchi: [0.11, 12 / 10],
};
const item = (id, cat, name, price, pixName, extra = {}) => ({
  id, cat, name, price, pix: pixName, effects: {}, toy: true, ...extra,
  get img() { return typeof document === 'undefined' ? '' : icon(this.pix); },
});
export const FUN_ITEMS = [
  item('ioio', 'fun', 'Ioiô', 60, 'ioio', { gain: { mood: 0.35 }, note: 'Faz truques que melhoram com o uso (nível salvo)' }),
  item('bambole', 'fun', 'Bambolê', 70, 'bambole', { gain: { mood: 0.4, energy: -0.12, hunger: -0.04, thirst: -0.07 }, note: 'Quanto mais Energia, mais tempo ela gira · guarda o recorde' }),
  item('pipa', 'fun', 'Pipa', 110, 'pipa', { gain: { mood: 0.4, energy: -0.03 }, note: 'Solta pipa perto da borda da tela ou de uma janela · a linha pode enroscar num ícone (só de mentira)' }),
  item('cubo', 'fun', 'Cubo mágico', 90, 'cubo_a', { gain: { mood: 0.3 }, note: 'Ela resolve sozinha · mais rápido com mais Afeição · guarda o recorde' }),
  item('skate', 'fun', 'Skate', 220, 'skate', { gain: { mood: 0.5, energy: -0.12, hunger: -0.05, thirst: -0.08 }, note: 'Anda no chão e pula para cima das janelas · às vezes cai e ganha um curativo temporário' }),
  item('aquario', 'mobilia', 'Aquário', 420, 'aquario', { furn: true, noWear: true, gain: { mood: 0.3 }, note: 'Ela alimenta os peixes · sem comida por muito tempo a água fica turva e ela fica triste · clique para pedir que ela alimente' }),
  item('teclado', 'mobilia', 'Teclado musical', 350, 'teclado', { furn: true, gain: { mood: 0.45 }, note: 'Ela toca melodias 8-bit com a voz dela · clique nas teclas para tocar você também' }),
  item('pula_pula', 'mobilia', 'Pula-pula', 380, 'pula_pula', { furn: true, gain: { mood: 0.5, energy: -0.14, hunger: -0.05, thirst: -0.08 }, note: 'Pulos altos: às vezes alcança o topo de uma janela e fica lá em cima · clique para ela pular' }),
  item('camera', 'fun', 'Câmera instantânea', 300, 'camera', { gain: { mood: 0.35 }, note: `Ela tira fotos da cena, que vão para o Álbum (Perfil) · até ${ALBUM_MAX} fotos` }),
  item('robo', 'fun', 'Robô de corda', 140, 'robo', { gain: { mood: 0.4, energy: -0.06, thirst: -0.04 }, note: 'Ela dá corda, ele anda pela tela e ela persegue · esbarra no Doll' }),
  item('tamagotchi', 'fun', 'Tamagotchi', 160, 'tamagotchi', { noWear: true, gain: { mood: 0.3 }, note: 'Um bichinho virtual com fome e humor próprios: ela cuida dele' }),
];
const IDS = new Set(FUN_ITEMS.map((i) => i.id));
const PHYSICAL = new Set(['bambole', 'skate', 'pula_pula', 'robo']);

const YOYO_TRICKS = [
  { id: 'sobe', name: 'Sobe e desce', lvl: 1, dur: 1.4 },
  { id: 'dorme', name: 'Dormir', lvl: 2, dur: 2.6 },
  { id: 'cachorro', name: 'Passear com o cachorro', lvl: 3, dur: 3.2 },
  { id: 'elevador', name: 'Elevador', lvl: 4, dur: 2.8 },
  { id: 'mundo', name: 'Volta ao mundo', lvl: 5, dur: 2.2 },
  { id: 'berco', name: 'Berço do gato', lvl: 7, dur: 3 },
  { id: 'torre', name: 'Torre Eiffel', lvl: 9, dur: 3.2 },
];

// [semitone, beats]; null = rest.
const SONGS = {
  estrelinha: [[0, 1], [0, 1], [7, 1], [7, 1], [9, 1], [9, 1], [7, 2], [5, 1], [5, 1], [4, 1], [4, 1], [2, 1], [2, 1], [0, 2]],
  alegria: [[4, 1], [4, 1], [5, 1], [7, 1], [7, 1], [5, 1], [4, 1], [2, 1], [0, 1], [0, 1], [2, 1], [4, 1], [4, 1.5], [2, 0.5], [2, 2]],
  jacques: [[0, 1], [2, 1], [4, 1], [0, 1], [0, 1], [2, 1], [4, 1], [0, 1], [4, 1], [5, 1], [7, 2], [4, 1], [5, 1], [7, 2],
    [7, 0.5], [9, 0.5], [7, 0.5], [5, 0.5], [4, 1], [0, 1], [0, 1], [-5, 1], [0, 2]],
  parabens: [[-5, 0.75], [-5, 0.25], [-3, 1], [-5, 1], [0, 1], [-1, 2], [-5, 0.75], [-5, 0.25], [-3, 1], [-5, 1], [2, 1], [0, 2],
    [-5, 0.75], [-5, 0.25], [7, 1], [4, 1], [0, 1], [-1, 1], [-3, 2], [5, 0.75], [5, 0.25], [4, 1], [0, 1], [2, 1], [0, 2]],
};
const WHITE = [0, 2, 4, 5, 7, 9, 11, 12, 14, 16, 17, 19, 21, 23];
const BEAT = 0.3;

export class FunToys {
  constructor(app, toys) {
    this.app = app;
    this.toys = toys;
    this.fx = null;
    this.imgs = new Map();
    this.keyFlash = new Map();
    this.flakes = [];
    this.fish = null;
    this.icons = [];
    this.fishScare = 0;
    app.pet?.on?.((type) => {
      if (type === 'ballThrow') this.sfx('throw', 1.2);
      else if (type === 'dribble') this.sfx('dribble');
    });
  }

  get P() {
    return this.app.pet.P;
  }

  sfx(name, k = 1) {
    this.app.sound.toy?.(name, k);
  }

  // The living Doll, when it can play (not held, not in a duo minigame).
  get doll() {
    const d = this.app.doll;
    return d?.alive && d.x != null && !d.held && !d.brain?.duo ? d : null;
  }

  // What the Doll is doing with a toy right now (dollai.js toyFx), or null.
  dollFx(id) {
    const b = this.app.doll?.brain;
    const fx = b?.toyFx;
    return fx && b.using === fx.key && (!id || fx.id === id) ? fx : null;
  }

  // The Doll is playing along with this toyPlay of hers right now.
  withDoll(tp) {
    return !!(tp?.dollIn && this.doll && this.app.doll.brain.joined?.(tp));
  }

  // Hand of the Doll in the pose it uses for the toy (yo-yo: arm out to the side).
  dollHand(side = false) {
    const d = this.app.doll;
    const H = d.h;
    return side ? { x: d.x - H * 0.5, y: d.y - (d.lift || 0) - H * 0.52 } : { x: d.x, y: d.y - (d.lift || 0) - H * 0.55 };
  }

  // A clip for a moment (cheer, oops) and back to the toy's own animation afterwards.
  // Sitting she only reacts with the body (force: gets up for it).
  flash(pet, tp, roles, fallback, secs = 0.9, force = false) {
    if (tp.pose === 'sit' && !force) return;
    pet.anim(pet.pickClip(roles, fallback), { facing: tp.sideFace ? pet.side() : 'front', restart: true });
    tp.animBack = secs;
    tp.animKey = null;
  }

  common(dt, tp, pet) {
    if (tp.animBack > 0 && (tp.animBack -= dt) <= 0) {
      tp.animBack = 0;
      pet.anim(tp.anim || 'idle', { pose: tp.pose || 'stand', facing: tp.sideFace ? pet.side() : tp.facing || 'front' });
    }
  }

  get data() {
    return (this.app.game.profile.fun ||= {});
  }

  owns(id) {
    return IDS.has(baseId(id));
  }

  physical(id) {
    return PHYSICAL.has(baseId(id));
  }

  say(kind, extra = {}, big = false) {
    this.app.pet.emit(big ? 'funBig' : 'fun', { kind, ...extra });
  }

  float(x, y, text) {
    this.toys.furn.floatText(x, y, text);
  }

  img(name) {
    let im = this.imgs.get(name);
    if (!im) {
      im = new Image();
      im.src = icon(name);
      this.imgs.set(name, im);
    }
    return im;
  }

  hand() {
    const p = this.app.pet;
    return this.app.hands || { x: p.x + p.dir * p.P * 0.15, y: p.y - (p.lift || 0) - p.P * 0.5 };
  }

  bandaged() {
    return (this.data.bandageUntil || 0) > Date.now();
  }

  tank() {
    const now = Date.now();
    return (this.data.tank ||= { fed: now, murk: 0, at: now });
  }

  tama() {
    const now = Date.now();
    return (this.data.tama ||= { hunger: 90, mood: 90, at: now, born: now });
  }

  yoyoLevel() {
    return Math.min(10, 1 + Math.floor((this.data.yoyo || 0) / 12));
  }

  art(id) {
    return id === 'aquario' ? icon('aquario_tank') : null;
  }

  usable(id) {
    if (id === 'skate') return !this.bandaged();
    return true;
  }

  // Extra weight when she has a reason to go there (hungry fish, a needy tamagotchi).
  want(id) {
    if (id === 'aquario') {
      const k = this.tank();
      return k.murk > 40 || Date.now() - k.fed > 4 * 3600000 ? 4 : 1;
    }
    if (id === 'tamagotchi') {
      const m = this.tama();
      return m.hunger < 45 || m.mood < 45 ? 4 : 1;
    }
    return 1;
  }

  // The placed piece disappears while she uses it (hoop around the waist, board under the feet).
  hides(id) {
    const tp = this.app.pet.toyPlay;
    if (tp?.picked && tp.id === id && (id === 'bambole' || id === 'skate')) return true;
    const fx = this.dollFx();
    return !!fx?.on && fx.key === id && ['bambole', 'ioio', 'cubo'].includes(fx.id);
  }

  clickable(id) {
    return id === 'aquario' || id === 'teclado' || id === 'pula_pula';
  }

  spot(id, t) {
    const P = this.P;
    const W = this.app.world.width;
    if (id === 'pipa') {
      // Next to the closest screen edge or window side.
      const pet = this.app.pet;
      const xs = [P * 0.5, W - P * 0.5];
      for (const w of this.app.world.windows.values()) {
        if (w.maximized) continue;
        if (w.x > P) xs.push(w.x - P * 0.4);
        if (w.right < W - P) xs.push(w.right + P * 0.4);
      }
      return xs.reduce((a, b) => (Math.abs(b - pet.x) < Math.abs(a - pet.x) ? b : a));
    }
    if (id === 'aquario') return t.x + (this.app.pet.x < t.x ? -1 : 1) * P * 0.45;
    if (id === 'teclado' || id === 'pula_pula' || id === 'skate' || id === 'bambole') return t.x;
    return t.x + P * 0.35;
  }

  title(id) {
    const d = this.data;
    switch (id) {
      case 'ioio': return `Ioiô · nível ${this.yoyoLevel()} (${d.yoyo || 0} truques) · arraste para mover · botão direito para opções`;
      case 'bambole': return `Bambolê · recorde ${d.hoopBest ? `${d.hoopBest}s` : '—'} · arraste para mover · botão direito para opções`;
      case 'cubo': return `Cubo mágico · recorde ${d.cubeBest ? `${d.cubeBest}s` : '—'} · arraste para mover · botão direito para opções`;
      case 'skate': return this.bandaged() ? 'Skate · ela está com curativo: espera sarar para andar de novo' : null;
      case 'camera': return `Câmera instantânea · Álbum ${(d.photos || []).length}/${ALBUM_MAX} (Perfil) · arraste para mover · botão direito para opções`;
      case 'tamagotchi': {
        const m = this.tama();
        return `Tamagotchi · fome ${Math.round(m.hunger)}% · humor ${Math.round(m.mood)}% · arraste para mover · botão direito para opções`;
      }
      case 'aquario': {
        const k = this.tank();
        const h = Math.floor((Date.now() - k.fed) / 3600000);
        return `Aquário · água ${k.murk < 20 ? 'limpa' : k.murk < 60 ? 'um pouco turva' : 'turva'} · comida há ${h ? `${h} h` : 'pouco tempo'} · clique para ela alimentar os peixes`;
      }
      case 'teclado': return 'Teclado musical · clique nas teclas para tocar · botão direito para opções';
      case 'pula_pula': return 'Pula-pula · clique para ela pular · botão direito para opções';
      default: return null;
    }
  }

  // Lines and buttons added to the right-click menu.
  menu(id, btn, el) {
    const info = (text) => {
      const r = document.createElement('div');
      r.className = 'row';
      r.textContent = text;
      el.append(r);
    };
    const d = this.data;
    if (id === 'ioio') info(`🪀 Nível ${this.yoyoLevel()} · ${d.yoyo || 0} truques feitos`);
    if (id === 'bambole') info(`⏱ Recorde: ${d.hoopBest ? `${d.hoopBest}s` : '—'}`);
    if (id === 'cubo') info(`🧩 Recorde: ${d.cubeBest ? `${d.cubeBest}s` : '—'}`);
    if (id === 'tamagotchi') {
      const m = this.tama();
      info(`🥚 Bichinho: fome ${Math.round(m.hunger)}% · humor ${Math.round(m.mood)}%`);
    }
    if (id === 'aquario') {
      info(`🐟 Água ${Math.round(100 - this.tank().murk)}% limpa`);
      btn('🐟 Pedir para ela alimentar os peixes', () => this.ask(id));
    }
    if (id === 'teclado') btn('🎹 Pedir para ela tocar', () => this.ask(id));
    if (id === 'pula_pula') btn('🤸 Pedir para ela pular', () => this.ask(id));
    if (id === 'camera') {
      info(`📷 Álbum: ${(d.photos || []).length}/${ALBUM_MAX}`);
      btn('📷 Pedir uma foto', () => this.ask(id));
      btn('🖼 Abrir o Álbum', () => {
        this.app.albumTab = true;
        this.app.openMenu?.('perfil');
      });
    }
  }

  // Sends her to play with it now (button or click).
  ask(id) {
    const p = this.app.pet;
    const t = this.app.game.toys[id];
    if (!t?.placed || t.broken || p.dead || p.mode !== 'ground' || p.toyPlay?.id === id) return false;
    if (p.toyPlay) p.endToy(true);
    this.app.doll?.brain?.yieldToy?.(id);
    if (p.surfaceId !== 'floor' || !p.goTo(this.toys.spot(id), () => this.toys.play(id, p))) {
      this.app.sound.play('cancel', { volume: 0.4 });
      return false;
    }
    return true;
  }

  // Left click on one of the clickable pieces (true = handled).
  click(id, ev) {
    if (id === 'teclado') {
      const el = this.toys.els.get(id);
      const t = this.app.game.toys[id];
      if (!el || !t) return false;
      const r = el.getBoundingClientRect();
      let u = (ev.clientX - r.left) / r.width;
      if (t.flip) u = 1 - u;
      if ((ev.clientY - r.top) / r.height > 0.55) return true;
      const k = clamp(Math.floor(((u - 3 / 34) / (28 / 34)) * 14), 0, 13);
      this.note(WHITE[k], 0.3);
      this.flashKey(WHITE[k]);
      this.playerNote();
      return true;
    }
    this.ask(id);
    return true;
  }

  // The player playing the keyboard: she enjoys it (a little, rate-limited).
  playerNote() {
    const { pet } = this.app;
    const now = performance.now();
    this.played = now - (this.playedAt || 0) < 4000 ? (this.played || 0) + 1 : 1;
    this.playedAt = now;
    if (pet.dead || this.played % 8) return;
    pet.adjust({ mood: 2 });
    pet.love?.(0.1);
    this.app.modes?.note?.(true);
    this.say('pianoPlayer');
  }

  note(semi, dur) {
    const s = this.app.sound;
    if (!s.enabled) return;
    const f = 293.66 * 2 ** (semi / 12);
    s.syllable(s.ctx.currentTime + 0.005, f / 420, 1.004, clamp(dur * 0.85, 0.08, 0.5));
  }

  flashKey(semi) {
    let n = ((semi % 24) + 24) % 24;
    while (!WHITE.includes(n)) n--;
    this.keyFlash.set(WHITE.indexOf(n), 0.25);
  }

  play(id, pet, end, scale, pickAnim) {
    const fn = {
      ioio: this.playYoyo, bambole: this.playHoop, pipa: this.playKite, cubo: this.playCube, skate: this.playSkate,
      aquario: this.playTank, teclado: this.playKeys, pula_pula: this.playTramp, camera: this.playCamera, robo: this.playRobot, tamagotchi: this.playTama,
    }[baseId(id)];
    if (!fn) return false;
    const done = (i, tp) => {
      pet.squash = null;
      pet.bodyY = 0;
      end(i, tp);
    };
    fn.call(this, id, pet, this.toys.item(id), scale, pickAnim, done);
    const tp = pet.toyPlay;
    if (tp?.id === id && tp.tick) {
      const inner = tp.tick;
      tp.tick = (dt, x) => {
        this.common(dt, x, pet);
        inner(dt, x);
      };
    }
    return true;
  }

  // Leaves the toy where it was used (the hoop where it fell, the board where she stopped).
  dropAt(id, x) {
    const t = this.app.game.toys[id];
    if (!t?.placed) return;
    t.x = clamp(x, this.P * 0.3, this.app.world.width - this.P * 0.3);
    this.app.game.changed();
  }

  // ---------- yo-yo ----------
  playYoyo(id, pet, it, scale, pickAnim, end) {
    pet.playToy({
      id, dur: rand(14, 24), gain: it.gain, scale, hold: icon('ioio_loop'), holdSize: 0.04, holdFrom: 0.9, pickAnim, anim: 'idle', facing: 'front', onEnd: end,
      tick: (dt, tp) => this.yoyoTick(dt, tp, pet),
    });
  }

  yoyoTick(dt, tp, pet) {
    tp.reach = 0.32;
    let y = tp.yo;
    if (!y || y.t >= y.dur) {
      if (y && !y.fail) this.yoyoDone(y, pet, tp);
      const lvl = this.yoyoLevel();
      const list = YOYO_TRICKS.filter((k) => k.lvl <= lvl);
      const k = Math.random() < 0.35 ? list[list.length - 1] : pick(list);
      const fail = Math.random() < Math.max(0.04, 0.4 - lvl * 0.04);
      y = tp.yo = { k, t: 0, dur: k.dur * rand(0.9, 1.15), fail, failAt: rand(0.3, 0.6) };
      this.sfx('yoyoDown');
    }
    const u0 = y.t / y.dur;
    y.t += dt;
    const u = y.t / y.dur;
    if (y.fail && !y.drop && y.t >= y.failAt * y.dur) {
      const at = this.yoyoPoint(y, this.hand());
      y.drop = { x: at.x, y: at.y, vy: 0 };
      y.dur = y.t + 1.8;
      this.app.sound.sfx('bonk', 0.6);
      this.flash(pet, tp, ['emote_neg'], ['idle'], 1.7);
      pet.squash = { x: 1.04, y: 0.95 };
      this.say('yoyoFail');
    }
    if (y.drop) {
      const floor = this.toys.floorY() - this.P * 0.035;
      y.drop.vy += pet.gravity * dt;
      y.drop.y = Math.min(floor, y.drop.y + y.drop.vy * dt);
      pet.squash = null;
    } else {
      // The body goes with the trick: swings around the world, leans to walk the dog, sleeper hums.
      const id = y.k.id;
      if (id === 'sobe' && u0 < 0.5 && u >= 0.5) this.sfx('yoyoUp');
      if (id === 'dorme' && u > 0.2 && u < 0.8) this.sfx('yoyoSpin', 0.6);
      if (u0 < 0.85 && u >= 0.85) this.sfx('yoyoUp');
      if (id === 'mundo') {
        pet.tilt = Math.sin(u * Math.PI * 2) * 0.09 * (pet.dir || 1);
        tp.bob = -Math.abs(Math.sin(u * Math.PI)) * 3;
      } else if (id === 'cachorro') {
        pet.tilt = (pet.dir || 1) * 0.07 * Math.sin(u * Math.PI);
        pet.bodyY = this.P * 0.03 * Math.sin(u * Math.PI);
      } else if (id === 'torre' || id === 'berco') {
        tp.reach = 0.42;
        pet.tilt = Math.sin(tp.t * 3) * 0.02;
      } else pet.tilt = Math.sin(tp.t * 2.4) * 0.02;
      if (id !== 'cachorro') pet.bodyY = 0;
    }
    pet.tiltPivot = { x: 0, y: 0 };
  }

  yoyoDone(y, pet, tp) {
    const d = this.data;
    const before = this.yoyoLevel();
    d.yoyo = (d.yoyo || 0) + 1;
    const lvl = this.yoyoLevel();
    const h = this.hand();
    this.sfx('yoyoCatch');
    if (lvl > before) {
      this.app.sound.sfx('levelup', 0.6);
      this.float(h.x, h.y - this.P * 0.5, `🪀 Nível ${lvl}!`);
      const fresh = YOYO_TRICKS.find((k) => k.lvl === lvl);
      this.say('yoyoLevel', { lvl, trick: fresh?.name }, true);
      pet.emit('gameExcite');
      this.flash(pet, tp, ['comemorar', 'emote_pos'], ['jump', 'idle'], 1.2);
    } else if (Math.random() < 0.3) {
      this.float(h.x, h.y - this.P * 0.4, `✨ ${y.k.name}`);
      // A little flourish after a hard trick.
      if (y.k.lvl >= 4 && Math.random() < 0.6) this.flash(pet, tp, ['emote_pos', 'comemorar'], ['idle'], 0.8);
    }
  }

  // Where the yo-yo is during a trick, and the string shape when both hands hold it.
  yoyoPoint(y, h) {
    const P = this.P;
    const dir = this.app.pet.dir || 1;
    const L = P * 0.55;
    const u = clamp(y.t / y.dur, 0, 1);
    const floor = this.toys.floorY() - P * 0.035;
    const down = (a, b) => (u < a ? u / a : u > b ? (1 - u) / (1 - b) : 1);
    let x = h.x;
    let yy = h.y;
    let pts = null;
    switch (y.k.id) {
      case 'sobe': yy = h.y + L * Math.sin(u * Math.PI); break;
      case 'dorme': yy = h.y + L * down(0.18, 0.82); break;
      case 'cachorro': {
        yy = h.y + Math.min(floor - h.y, L * 1.6) * down(0.2, 0.8);
        if (u > 0.2 && u < 0.8) x = h.x + dir * P * 0.5 * Math.sin(((u - 0.2) / 0.6) * Math.PI);
        break;
      }
      case 'mundo': {
        const a = u * Math.PI * 2;
        x = h.x + Math.sin(a) * L * dir;
        yy = h.y + Math.cos(a) * L;
        break;
      }
      case 'elevador': {
        if (u < 0.2) yy = h.y + L * (u / 0.2);
        else {
          const b = { x: h.x, y: h.y + L };
          const h2 = { x: h.x - dir * P * 0.16, y: h.y + P * 0.04 };
          const s = u > 0.85 ? 0 : Math.sin(((u - 0.2) / 0.65) * Math.PI);
          pts = [[h.x, h.y], [b.x, b.y], [h2.x, h2.y]];
          x = b.x + (h2.x - b.x) * s;
          yy = b.y + (h2.y - b.y) * s;
        }
        break;
      }
      default: {
        const d = down(0.15, 0.85);
        const h2x = h.x - dir * P * 0.18;
        pts = d < 0.3 ? null : y.k.id === 'torre'
          ? [[h.x, h.y], [h.x - dir * P * 0.09, h.y + L * 0.9 * d], [h2x, h.y]]
          : [[h.x, h.y], [h.x, h.y + L * 0.5 * d], [h2x, h.y + L * 0.5 * d], [h2x, h.y]];
        x = h.x - dir * P * 0.09 + Math.sin(u * Math.PI * 6) * P * 0.06 * d;
        yy = h.y + L * 0.7 * d;
      }
    }
    return { x, y: Math.min(yy, floor), pts };
  }

  drawYoyo(g, tp) {
    const y = tp.yo;
    if (!y) return;
    const P = this.P;
    const h = this.hand();
    const at = y.drop || this.yoyoPoint(y, h);
    g.lineWidth = Math.max(1, P * 0.008);
    g.strokeStyle = 'rgba(245, 242, 234, 0.95)';
    g.beginPath();
    if (y.drop) {
      // Slack, tangled string.
      g.moveTo(h.x, h.y);
      for (let i = 1; i <= 12; i++) {
        const u = i / 12;
        g.lineTo(h.x + (at.x - h.x) * u + Math.sin(u * 18) * P * 0.03, h.y + (at.y - h.y) * u + Math.cos(u * 15) * P * 0.02);
      }
    } else if (at.pts) {
      g.moveTo(at.pts[0][0], at.pts[0][1]);
      for (const [px, py] of at.pts.slice(1)) g.lineTo(px, py);
      const mid = at.pts[Math.floor(at.pts.length / 2)];
      g.moveTo(mid[0], mid[1]);
      g.lineTo(at.x, at.y);
    } else {
      g.moveTo(h.x, h.y);
      g.lineTo(at.x, at.y);
    }
    g.stroke();
    const r = P * 0.035;
    g.fillStyle = '#e2384d';
    g.beginPath(); g.arc(at.x, at.y, r, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#f4f1ea';
    const a = y.drop ? 0 : y.t * 25;
    g.fillRect(at.x - r * Math.cos(a), at.y - r * 0.18, r * 2 * Math.abs(Math.cos(a)), r * 0.36);
  }

  // ---------- hula hoop ----------
  playHoop(id, pet, it, scale, pickAnim, end) {
    const spin = clamp(4 + pet.stats.energy * 0.45, 4, 50) * rand(0.8, 1.15);
    // Waist (classic), around the neck, on one arm or hopping while it spins.
    const style = pick(['cintura', 'cintura', 'pescoco', 'braco', 'pulando']);
    pet.playToy({
      id, dur: spin + 1.8, gain: it.gain, scale, anim: style === 'braco' ? 'idle' : pet.pickClip(['danca'], ['idle']), facing: 'front', effort: style === 'pulando' ? 2.4 : 2, spin, style,
      ...(style === 'braco' ? { hold: icon('fun_blank'), holdSize: 0.02 } : {}),
      onEnd: (i) => {
        this.dropAt(id, pet.x);
        end(i);
      },
      tick: (dt, tp) => {
        const on = tp.t < tp.spin;
        const P = this.P;
        tp.phase = (tp.phase || 0) + dt * (on ? (style === 'braco' ? 13 : style === 'pescoco' ? 12 : 11) : 0);
        if (style === 'braco') {
          tp.reach = on ? 0.8 : 0.3;
          pet.tilt = on ? Math.sin(tp.phase) * 0.02 : 0;
        } else if (style === 'pescoco') {
          pet.tilt = on ? Math.sin(tp.phase) * 0.035 : 0;
          tp.bob = 0;
        } else pet.tilt = on ? Math.sin(tp.phase) * 0.05 : 0;
        pet.tiltPivot = { x: 0, y: -P * (style === 'pescoco' ? 0.7 : 0.45) };
        if (style === 'pulando') {
          tp.lift = on ? Math.abs(Math.sin(tp.t * 4.5)) * P * 0.12 : 0;
          if (on && Math.abs(Math.sin(tp.t * 4.5)) < 0.08) this.app.sound.play('footstep', { volume: 0.2, rate: 1.2 });
        }
        const lap = Math.floor(tp.phase / (Math.PI * 2));
        if (on && lap !== tp.lap) {
          tp.lap = lap;
          this.sfx('hoopSwish', 0.8);
        }
        if (!on && tp.drop == null) {
          tp.drop = 0;
          tp.lift = 0;
          this.sfx('hoopDrop');
          this.hoopScore(tp, pet);
        }
        if (tp.drop != null) tp.drop += dt;
      },
    });
  }

  hoopScore(tp, pet) {
    const d = this.data;
    const secs = Math.round(tp.spin * 10) / 10;
    const record = secs > (d.hoopBest || 0);
    if (record) d.hoopBest = secs;
    this.app.game.changed();
    this.float(pet.x, pet.y - this.P * 1.15, record ? `🏆 Recorde! ${secs}s` : `⏱ ${secs}s · ${Math.round(tp.spin * 1.75)} voltas`);
    this.say(record ? 'hoopRecord' : 'hoopDrop', { secs }, record);
    if (record) {
      pet.emit('gameExcite');
      this.flash(pet, tp, ['comemorar', 'emote_pos'], ['jump', 'idle'], 1.8);
    } else if (secs < 9) this.flash(pet, tp, ['emote_neg', 'triste'], ['idle'], 1.8);
    else if (Math.random() < 0.5) this.flash(pet, tp, ['emote_pos', 'emote'], ['idle'], 1.8);
  }

  drawHoop(g, tp, back) {
    const pet = this.app.pet;
    const P = this.P;
    const floor = pet.y - (pet.lift || 0);
    let rx = P * 0.27;
    let ry = P * 0.065;
    let cx = pet.x + Math.sin(tp.phase || 0) * P * 0.05;
    let cy = floor - P * 0.42;
    if (tp.style === 'pescoco') {
      rx = P * 0.19;
      ry = P * 0.05;
      cy = floor - P * 0.8;
      cx = pet.x + Math.sin(tp.phase || 0) * P * 0.035;
    } else if (tp.style === 'braco') {
      const h = this.hand();
      rx = P * 0.15;
      ry = P * 0.15 * Math.abs(Math.cos((tp.phase || 0) * 0.5)) + P * 0.02;
      cx = h.x + Math.sin(tp.phase || 0) * P * 0.03;
      cy = h.y + P * 0.08;
    }
    if (tp.drop != null) {
      const u = Math.min(1, tp.drop / 0.4);
      const y0 = cy;
      cy = y0 + (floor - P * 0.02 - y0) * u * u;
      rx = Math.max(rx, P * 0.22);
      ry = P * (0.065 - 0.03 * u);
      cx = pet.x;
    }
    this.ring(g, cx, cy, rx, ry, tp.phase || 0, back, P * 0.028);
  }

  // Striped hoop as an ellipse; back = the half behind the body.
  ring(g, cx, cy, rx, ry, phase, back, lw) {
    const n = 24;
    g.lineWidth = lw;
    g.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2;
      const a1 = ((i + 1) / n) * Math.PI * 2;
      const mid = (a0 + a1) / 2;
      if ((Math.sin(mid) < 0) !== back) continue;
      g.strokeStyle = ['#ff4fa3', '#ffd23f', '#4fc3ff'][(i + Math.floor(phase * 2)) % 3];
      g.beginPath();
      g.moveTo(cx + Math.cos(a0) * rx, cy + Math.sin(a0) * ry);
      g.lineTo(cx + Math.cos(a1) * rx, cy + Math.sin(a1) * ry);
      g.stroke();
    }
    g.lineCap = 'butt';
  }

  // ---------- kite ----------
  playKite(id, pet, it, scale, pickAnim, end) {
    const inward = pet.x < this.app.world.width / 2 ? 1 : -1;
    this.loadIcons();
    pet.playToy({
      id, dur: rand(18, 32), gain: it.gain, scale, hold: icon('carretel'), holdSize: 0.07, holdFrom: 0.9, pickAnim, anim: 'idle', facing: 'front', effort: 1.3,
      inward, snagAt: Math.random() < 0.45 ? rand(6, 12) : Infinity, onEnd: end,
      tick: (dt, tp) => this.kiteTick(dt, tp, pet),
    });
  }

  loadIcons() {
    if (this.app.config?.streamer || !this.app.interact?.iconsNow) return;
    this.app.interact.iconsNow().then((l) => (this.icons = l || [])).catch(() => {});
  }

  // Where the string starts: her hands, or the Doll's while it holds the reel.
  kiteHand(tp) {
    return tp.dollReel && this.withDoll(tp) ? this.dollHand() : this.hand();
  }

  kiteTick(dt, tp, pet) {
    const P = this.P;
    const W = this.app.world.width;
    const h = this.kiteHand(tp);
    const k = (tp.k ||= { x: h.x, y: h.y, up: 0, rot: 0, spin: 0 });
    k.up = Math.min(1, k.up + dt / 3);
    this.sfx('kiteWind', 0.7);
    // The Doll took the reel: her hands are free, she cheers and points.
    const reel = !!(tp.dollReel && this.withDoll(tp));
    if (reel !== !!tp.reelOut) {
      tp.reelOut = reel;
      tp.hold = icon(reel ? 'fun_blank' : 'carretel');
      if (reel) this.flash(pet, tp, ['emote_pos', 'comemorar'], ['idle'], 1.4);
    }
    tp.reach = reel ? 0.2 : 0.65 + Math.sin(tp.t * 1.3) * 0.05;
    let lean = 0;
    if (k.snag) {
      k.snag.t += dt;
      k.x += Math.sin(tp.t * 9) * P * 0.01;
      lean = -tp.inward * 0.07 * (1 + Math.sin(tp.t * 14) * 0.5);
      if (k.snag.t > k.snag.dur) {
        k.snag = null;
        tp.snagAt = Infinity;
        this.app.sound.sfx('boing', 0.6);
        this.flash(pet, tp, ['comemorar', 'emote_pos'], ['jump', 'idle'], 1);
        this.say('kiteFree');
      }
    } else {
      // Now and then: pulls the line to climb, makes the kite loop, or runs a few steps to catch wind.
      const m = tp.move;
      if (m) m.t += dt;
      if (!m || m.t > m.dur) {
        tp.move = null;
        tp.moveIn = (tp.moveIn ?? rand(3, 6)) - (m ? 0 : dt);
        if (tp.moveIn <= 0 && !reel) {
          tp.moveIn = rand(4, 8);
          const kind = pick(['tug', 'tug', 'loop', 'run']);
          tp.move = { kind, t: 0, dur: kind === 'run' ? 1.4 : kind === 'loop' ? 1.6 : 1.2 };
          if (kind === 'loop') this.sfx('kiteFlap');
          if (kind === 'tug') this.sfx('kiteReel');
        }
      }
      let climb = 0;
      if (tp.move?.kind === 'tug') {
        const u = tp.move.t / tp.move.dur;
        tp.reach = 0.45 + 0.2 * Math.abs(Math.sin(u * Math.PI * 3));
        lean = -tp.inward * 0.06 * Math.sin(u * Math.PI);
        climb = P * 0.6 * Math.sin(u * Math.PI);
      } else if (tp.move?.kind === 'run') {
        const x0 = pet.x;
        pet.x = clamp(pet.x - tp.inward * P * 1.1 * dt, P * 0.3, W - P * 0.3);
        if (pet.x !== x0 && tp.animKey !== 'run') {
          tp.animKey = 'run';
          pet.dir = -tp.inward;
          pet.anim('run', { facing: pet.side() });
        }
        if (tp.move.t + dt > tp.move.dur) {
          tp.animKey = null;
          pet.anim('idle', { facing: 'front' });
        }
        climb = P * 0.4;
      } else if (tp.move?.kind === 'loop') k.spin = (tp.move.t / tp.move.dur) * Math.PI * 2 * tp.inward;
      if (!tp.move || tp.move.kind !== 'loop') k.spin = 0;
      const tx = clamp(h.x + tp.inward * P * (2.4 + Math.sin(tp.t * 0.4) * 0.7), 40, W - 40);
      const ty = Math.max(40, h.y - P * 0.3 - P * (3.2 + Math.sin(tp.t * 0.27) * 0.6) * k.up - climb);
      k.x += (tx - k.x) * Math.min(1, dt * 1.4);
      k.y += (ty - k.y) * Math.min(1, dt * 1.4);
      if (tp.move?.kind === 'loop') {
        k.x += Math.cos(k.spin) * P * 0.9 * dt * 2;
        k.y += Math.sin(k.spin) * P * 0.9 * dt * 2;
      }
      if (!lean) lean = Math.sin(tp.t * 0.9) * 0.03;
      if (tp.t > tp.snagAt) {
        const ic = this.snagIcon(h, k);
        tp.snagAt = Infinity;
        if (ic) {
          k.snag = { ic, t: 0, dur: rand(3, 5) };
          tp.move = null;
          this.app.sound.sfx('bonk', 0.5);
          this.flash(pet, tp, ['emote_neg', 'medo'], ['idle'], 1.6);
          this.say('kiteSnag');
        }
      }
    }
    pet.tilt = lean;
    k.rot = Math.sin(tp.t * 2.1) * 0.25 + (k.spin || 0);
    pet.tiltPivot = { x: 0, y: 0 };
  }

  // A desktop icon close to the string (only the drawing bends around it; the icon is never touched).
  snagIcon(h, k) {
    const P = this.P;
    let best = null;
    let bestD = P * 1.4;
    for (const ic of this.icons) {
      const cx = ic.x + ic.w / 2;
      const cy = ic.y + ic.h / 2;
      if (cy > h.y || cy < k.y) continue;
      const dx = k.x - h.x;
      const dy = k.y - h.y;
      const u = clamp(((cx - h.x) * dx + (cy - h.y) * dy) / (dx * dx + dy * dy || 1), 0.15, 0.85);
      const d = Math.hypot(h.x + dx * u - cx, h.y + dy * u - cy);
      if (d < bestD) {
        bestD = d;
        best = ic;
      }
    }
    return best;
  }

  drawKite(g, tp) {
    const k = tp.k;
    if (!k) return;
    const P = this.P;
    const h = this.kiteHand(tp);
    g.lineWidth = Math.max(1, P * 0.006);
    g.strokeStyle = 'rgba(250, 248, 240, 0.9)';
    g.beginPath();
    g.moveTo(h.x, h.y);
    if (k.snag) {
      const ic = k.snag.ic;
      const cx = ic.x + (k.x > h.x ? ic.w : 0);
      g.lineTo(cx, ic.y + ic.h * 0.2);
      g.lineTo(k.x, k.y);
      g.stroke();
      g.font = `bold ${Math.round(P * 0.16)}px Consolas, monospace`;
      g.fillStyle = '#ffd23f';
      g.fillText('!', cx - P * 0.03, ic.y - P * 0.04);
    } else {
      g.quadraticCurveTo((h.x + k.x) / 2, (h.y + k.y) / 2 + P * 0.45, k.x, k.y);
      g.stroke();
    }
    const s = P * 0.16;
    g.save();
    g.translate(k.x, k.y);
    g.rotate(k.rot);
    g.fillStyle = '#ff4f6d';
    g.beginPath(); g.moveTo(0, -s); g.lineTo(-s * 0.7, -s * 0.2); g.lineTo(0, s); g.closePath(); g.fill();
    g.fillStyle = '#ffd23f';
    g.beginPath(); g.moveTo(0, -s); g.lineTo(s * 0.7, -s * 0.2); g.lineTo(0, s); g.closePath(); g.fill();
    g.strokeStyle = '#8a5a2b';
    g.lineWidth = Math.max(1, P * 0.01);
    g.beginPath(); g.moveTo(0, -s); g.lineTo(0, s); g.moveTo(-s * 0.7, -s * 0.2); g.lineTo(s * 0.7, -s * 0.2); g.stroke();
    g.strokeStyle = 'rgba(250, 248, 240, 0.9)';
    g.beginPath();
    g.moveTo(0, s);
    const tt = tp.t * 5;
    for (let i = 1; i <= 7; i++) g.lineTo(Math.sin(tt + i * 0.9) * s * 0.25, s + i * s * 0.32);
    g.stroke();
    for (let i = 2; i <= 6; i += 2) {
      g.fillStyle = i % 4 ? '#4fc3ff' : '#5fd36a';
      g.fillRect(Math.sin(tt + i * 0.9) * s * 0.25 - s * 0.1, s + i * s * 0.32 - s * 0.05, s * 0.2, s * 0.1);
    }
    g.restore();
  }

  // ---------- magic cube ----------
  playCube(id, pet, it, scale, pickAnim, end) {
    const solve = clamp(75 - Math.max(0, pet.affection) * 0.06, 12, 75) * rand(0.8, 1.2);
    const sit = Math.random() < 0.65;
    pet.playToy({
      id, dur: solve + 3.5, gain: it.gain, scale, hold: icon('cubo_a'), holdSize: 0.1, holdFrom: 0.9, pickAnim, anim: sit ? 'sit' : 'idle', pose: sit ? 'sit' : 'stand', facing: 'front', solve, onEnd: end,
      stuckAt: Math.random() < 0.45 ? rand(0.25, 0.7) * solve : Infinity,
      tick: (dt, tp) => {
        if (tp.t < tp.solve) {
          // Stuck for a moment (frowns at it, turns it around), then a fast burst of moves.
          if (tp.t > tp.stuckAt && !tp.stuck) {
            tp.stuck = 1.8;
            tp.stuckAt = Infinity;
            this.sfx('cubeGrr');
            this.flash(pet, tp, ['emote_neg', 'medo'], ['idle'], 1.6);
            this.float(pet.x, pet.y - this.P * 1.05, pick(['🤔', '💢', '❓']));
          }
          if (tp.stuck > 0) {
            tp.stuck -= dt;
            tp.reach = 0.55;
            tp.angle = Math.sin(tp.t * 2) * 40;
            pet.tilt = Math.sin(tp.t * 1.5) * 0.05;
            if (tp.stuck <= 0) tp.burst = 1.6;
            return;
          }
          tp.burst = Math.max(0, (tp.burst || 0) - dt);
          tp.next = (tp.next ?? 0.5) - dt;
          tp.twist = Math.max(0, (tp.twist || 0) - dt * 4);
          if (tp.next <= 0) {
            tp.next = tp.burst > 0 ? rand(0.09, 0.16) : rand(0.25, 0.7);
            tp.hold = icon(pick(['cubo_a', 'cubo_b', 'cubo_c']));
            tp.twist = 1;
            tp.side = Math.random() < 0.5 ? -1 : 1;
            this.sfx('cubeTwist', tp.burst > 0 ? 0.8 : 0.6);
          }
          tp.angle = tp.twist * 18 * (tp.side || 1);
          tp.reach = 0.3 + Math.sin(tp.t * 1.5) * 0.03 + (tp.burst > 0 ? 0.06 : 0);
          pet.tilt = tp.burst > 0 ? Math.sin(tp.t * 20) * 0.015 : Math.sin(tp.t * 0.8) * 0.015;
          tp.bob = tp.burst > 0 ? Math.sin(tp.t * 30) : 0;
          return;
        }
        if (tp.solved) {
          tp.bob = -Math.abs(Math.sin((tp.t - tp.solve) * 7)) * 4;
          return;
        }
        tp.solved = true;
        tp.hold = icon('cubo');
        tp.angle = 0;
        tp.reach = 0.75;
        const d = this.data;
        const secs = Math.round(tp.solve - 0.9);
        const record = !d.cubeBest || secs < d.cubeBest;
        if (record) d.cubeBest = secs;
        this.app.game.changed();
        this.sfx('cubeSolve');
        this.float(pet.x, pet.y - this.P * 1.1, record ? `🏆 Recorde! ${secs}s` : `🧩 ${secs}s`);
        // Racing the Doll: it may have finished first.
        if (tp.rival === 'doll') {
          this.flash(pet, tp, ['emote_neg', 'triste'], ['idle'], 2, true);
          return;
        }
        if (this.withDoll(tp)) {
          tp.rival = 'pet';
          pet.emit('dollToy', { kind: 'cubeWin' });
        } else this.say('cubeSolved', { secs, record }, record);
        this.flash(pet, tp, ['comemorar', 'emote_pos'], ['jump', 'idle'], 2, true);
        pet.emit('gameExcite');
      },
    });
  }

  // ---------- skateboard ----------
  playSkate(id, pet, it, scale, pickAnim, end) {
    pet.dir = pet.x < this.app.world.width / 2 ? 1 : -1;
    pet.playToy({
      id, dur: rand(16, 30), gain: it.gain, scale, anim: 'idle', facing: pet.side(), effort: 2,
      onEnd: (i, tp) => {
        this.dropAt(id, tp?.sk?.mode === 'fall' ? tp.sk.bx : pet.x);
        end(i);
      },
      tick: (dt, tp) => this.skateTick(dt, tp, pet),
    });
  }

  // Top of what is under her at x, as a height above the floor (0 = floor).
  skateGround(x, below) {
    const floor = this.toys.floorY();
    let best = 0;
    for (const s of this.app.world.surfaces) {
      if (s.id === 'floor' || x < s.x1 || x > s.x2) continue;
      const h = floor - s.y;
      if (h <= below + 1 && h > best) best = h;
    }
    return best;
  }

  skateTick(dt, tp, pet) {
    const P = this.P;
    const W = this.app.world.width;
    const g = pet.gravity;
    const board = P * 0.07;
    const sound = this.app.sound;
    const s = (tp.sk ||= { mode: 'roll', lift: board, v: 0, jv: 0, flip: 0 });
    if (s.mode === 'fall') {
      s.ft += dt;
      s.jv += g * dt;
      s.lift = Math.max(0, s.lift - s.jv * dt);
      s.bvy += g * dt;
      s.bx = clamp(s.bx + s.bvx * dt, P * 0.2, W - P * 0.2);
      s.by = Math.max(0, s.by - s.bvy * dt);
      if (s.by === 0) s.bvx *= 0.9;
      s.brot += dt * 9 * (s.by > 0 ? 1 : 0);
      tp.lift = s.lift;
      if (s.ft > 1.8) pet.timer = 0;
      return;
    }
    // Manual (wheelie) slows her down a little; crouching before a big ollie too.
    s.v = Math.min(P * (s.manual > 0 ? 2 : 2.4), s.v + P * 1.6 * dt);
    pet.x += pet.dir * s.v * dt;
    if (pet.x < P * 0.4 || pet.x > W - P * 0.4) {
      pet.x = clamp(pet.x, P * 0.4, W - P * 0.4);
      pet.dir = -pet.dir;
      s.v *= 0.4;
      pet.anim('idle', { facing: pet.side() });
      sound.tone8(300, 200, 0.06, 'square', 0.03);
    }
    s.flip = Math.max(0, s.flip - dt * 2.5);
    s.shuv = Math.max(0, (s.shuv || 0) - dt * 2.2);
    s.manual = Math.max(0, (s.manual || 0) - dt);
    s.cheer = Math.max(0, (s.cheer || 0) - dt);
    pet.squash = null;
    pet.bodyY = 0;
    if (s.mode === 'air') {
      s.jv += g * dt;
      s.lift -= s.jv * dt;
      // 180: turns around in the air (mirrors through the middle) and lands going the other way.
      if (s.turn != null) {
        s.turn = Math.min(1, s.turn + dt * 2.2);
        pet.squash = { x: Math.cos(s.turn * Math.PI) || 0.01, y: 1 };
      }
      const top = this.skateGround(pet.x, s.lift - board) + board;
      if (s.jv > 0 && s.lift <= top) {
        s.lift = top;
        const high = s.peak - top > P * 1.6;
        const trick = s.flip > 0 || s.shuv > 0 || s.turn != null;
        if (s.turn != null) {
          s.turn = null;
          pet.dir = -pet.dir;
          pet.squash = null;
        }
        s.mode = top > board + 1 ? 'grind' : 'roll';
        this.sfx('skateLand');
        const risk = 0.07 + (pet.stats.energy < 30 ? 0.1 : 0) + (high ? 0.06 : 0) + (trick ? 0.05 : 0);
        if (Math.random() < risk) return this.skateFall(tp, pet, s);
        if (s.mode === 'grind') this.say('skateGrind');
        else if ((trick || high) && Math.random() < 0.5) {
          s.cheer = 0.7;
          pet.anim(pet.pickClip(['comemorar', 'emote_pos'], ['jump', 'idle']), { facing: pet.side(), restart: true });
          this.float(pet.x, pet.y - s.lift - P * 1.1, pick(['✨', '🔥', '⭐']));
          this.sfx('cheer', 0.7);
        } else pet.anim('idle', { facing: pet.side() });
      }
    } else {
      const top = this.skateGround(pet.x, s.lift - board) + board;
      if (top < s.lift - 1) {
        // Ran off the edge of the window: drops.
        s.mode = 'air';
        s.jv = 0;
        s.peak = s.lift;
      } else {
        if (s.crouch > 0) {
          s.crouch -= dt;
          pet.squash = { x: 1.05, y: 0.9 };
          pet.bodyY = P * 0.03;
          if (s.crouch <= 0) this.ollie(s, P * rand(0.8, 1.1), g, pet);
        } else {
          const ahead = this.skateTarget(pet, s);
          if (ahead != null) this.ollie(s, ahead + P * 0.35, g, pet);
          else if (Math.random() < dt * 0.35) {
            const r = Math.random();
            if (r < 0.2) s.manual = rand(1, 1.8);
            else if (r < 0.35) s.crouch = 0.45;
            else {
              this.ollie(s, P * rand(0.35, 0.7), g, pet);
              if (r < 0.6) s.flip = 1;
              else if (r < 0.75) {
                s.shuv = 1;
                this.sfx('skateSpin', 0.8);
              } else if (r < 0.88) s.turn = 0;
            }
          }
        }
        this.sfx(s.mode === 'grind' ? 'skateGrind' : 'skateRoll', s.mode === 'grind' ? 0.8 : 0.5 + s.v / (P * 2.4) * 0.5);
      }
      if (s.mode === 'grind' && Math.random() < dt * 6) this.float(pet.x - pet.dir * P * 0.15, pet.y - s.lift, '✦');
    }
    tp.lift = s.lift;
    if (s.mode === 'air') pet.tilt = -pet.dir * 0.08;
    else if (s.manual > 0) pet.tilt = -pet.dir * 0.13;
    else pet.tilt = Math.sin(tp.t * 3) * 0.02;
    pet.tiltPivot = { x: s.manual > 0 ? -pet.dir * P * 0.12 : 0, y: 0 };
  }

  // A window top just ahead within jumping height: its height above where she is.
  skateTarget(pet, s) {
    const P = this.P;
    const floor = this.toys.floorY();
    const cur = s.lift - P * 0.07;
    const max = pet.maxJump() * 1.1;
    for (const w of this.app.world.surfaces) {
      if (w.id === 'floor') continue;
      const h = floor - w.y - cur;
      if (h < P * 0.4 || h > max) continue;
      const edge = pet.dir > 0 ? w.x1 : w.x2;
      const dist = (edge - pet.x) * pet.dir;
      if (dist > P * 0.3 && dist < P * 0.9 && w.x2 - w.x1 > P * 1.2) return h;
    }
    return null;
  }

  ollie(s, h, g, pet) {
    s.mode = 'air';
    s.jv = -Math.sqrt(2 * g * h);
    s.peak = s.lift + h;
    this.sfx('skatePop');
    pet.anim(pet.pickClip(['comemorar'], ['jump']), { facing: pet.side(), restart: true });
    setTimeout(() => pet.toyPlay?.sk === s && s.mode !== 'fall' && !s.cheer && pet.anim('idle', { facing: pet.side() }), 500);
  }

  skateFall(tp, pet, s) {
    const P = this.P;
    Object.assign(s, { mode: 'fall', ft: 0, jv: 0, bx: pet.x, by: s.lift, bvx: pet.dir * P * 3, bvy: -P * 3, brot: 0 });
    this.app.sound.sfx('hit', 0.8);
    this.sfx('aww', 0.7);
    pet.squash = null;
    pet.anim('attacked', { facing: 'front', restart: true });
    pet.adjust({ mood: -5, health: -3 });
    this.data.bandageUntil = Date.now() + 8 * 60000;
    this.app.game.changed();
    this.say('skateFall', {}, true);
  }

  drawSkate(g, tp) {
    const s = tp.sk;
    const pet = this.app.pet;
    const P = this.P;
    const im = this.img('skate');
    if (!im.complete) return;
    const w = P * 0.34;
    const h = w * (8 / 26);
    g.save();
    if (s?.mode === 'fall') {
      g.translate(s.bx, this.toys.floorY() - s.by - h / 2);
      g.rotate(s.brot);
    } else {
      g.translate(pet.x, pet.y - (s?.lift ?? P * 0.07) + h / 2);
      if (s?.mode === 'air') g.rotate(-pet.dir * 0.12);
      else if (s?.manual > 0) g.rotate(-pet.dir * 0.2);
      g.scale((pet.dir < 0 ? -1 : 1) * (s?.shuv ? Math.cos(s.shuv * Math.PI * 2) : 1), s?.flip ? Math.cos(s.flip * Math.PI * 2) : 1);
    }
    g.imageSmoothingEnabled = false;
    g.drawImage(im, -w / 2, -h / 2, w, h);
    g.restore();
  }

  // ---------- aquarium ----------
  playTank(id, pet, it, scale, pickAnim, end) {
    const k = this.tank();
    const t = this.app.game.toys[id];
    pet.dir = t.x < pet.x ? -1 : 1;
    const clean = k.murk > 30;
    pet.playToy({
      id, dur: clean ? rand(13, 17) : rand(7, 10), gain: it.gain, scale, hold: icon('racao'), holdSize: 0.08, holdFrom: 0, anim: 'idle', facing: pet.side(), clean, onEnd: end,
      tick: (dt, tp) => this.tankTick(dt, tp, pet),
    });
  }

  tankTick(dt, tp, pet) {
    const k = this.tank();
    if (tp.t < 5) {
      tp.reach = 0.55;
      tp.angle = 100 + Math.sin(tp.t * 18) * 15;
      tp.next = (tp.next ?? 0.6) - dt;
      if (tp.next <= 0) {
        tp.next = rand(0.2, 0.4);
        for (let i = 0; i < 2; i++) this.flakes.push({ x: rand(0.3, 0.7), y: 0.12, vy: rand(0.04, 0.08), life: 12 });
        this.sfx('feed', 0.8);
      }
      if (!tp.fed && tp.t > 1) {
        tp.fed = true;
        k.fed = Date.now();
        this.app.game.changed();
        this.say('fishFeed');
      }
      return;
    }
    if (!tp.clean || k.murk <= 0) return this.tankWatch(dt, tp, pet, k);
    if (!tp.wiping) {
      tp.wiping = true;
      tp.hold = icon('esponja');
      tp.angle = 0;
    }
    tp.reach = 0.45 + Math.sin(tp.t * 5) * 0.15;
    tp.angle = Math.sin(tp.t * 5) * 25;
    pet.tilt = Math.sin(tp.t * 5) * 0.025;
    pet.tiltPivot = { x: 0, y: 0 };
    k.murk = Math.max(0, k.murk - dt * 9);
    this.sfx('scrub', 0.7);
    if (Math.random() < dt * 2) {
      const t = this.app.game.toys.aquario;
      this.float(t.x + rand(-0.2, 0.2) * this.P, this.toys.floorY() - this.P * 0.4, '✨');
    }
    if (k.murk <= 0 && !tp.cleanSaid) {
      tp.cleanSaid = true;
      this.app.game.changed();
      this.say('tankClean');
      this.flash(pet, tp, ['emote_pos', 'comemorar'], ['idle'], 1.2);
    }
  }

  // After feeding: taps the glass (the fish dart away), presses her face to it, waves at them.
  tankWatch(dt, tp, pet, k) {
    tp.hold = icon('fun_blank');
    tp.next = (tp.next ?? 0) - dt;
    if (tp.next <= 0) {
      tp.next = rand(1.6, 2.8);
      tp.watch = pick(['tap', 'face', 'wave', 'bubbles']);
      tp.wt = 0;
      if (tp.watch === 'wave') this.flash(pet, tp, ['emote_pos', 'emote'], ['idle'], 1.2);
      if (tp.watch === 'face' && Math.random() < 0.5) this.float(pet.x + pet.dir * this.P * 0.3, pet.y - this.P * 0.95, pick(['🐟', '♥', '😮']));
    }
    tp.wt = (tp.wt || 0) + dt;
    tp.reach = 0.2;
    tp.bob = 0;
    pet.bodyY = 0;
    pet.tilt = 0;
    if (tp.watch === 'tap') {
      tp.reach = 0.55;
      const n = Math.floor(tp.wt * 3);
      tp.bob = n % 2 ? 2 : 0;
      if (n !== tp.tapN && n < 4 && n % 2 === 0) {
        tp.tapN = n;
        this.sfx('glassTap');
        this.fishScare = 1.2;
      }
    } else if (tp.watch === 'face') {
      pet.tilt = pet.dir * 0.09 * Math.min(1, tp.wt * 3);
      pet.bodyY = this.P * 0.03 * Math.min(1, tp.wt * 3);
    } else if (tp.watch === 'bubbles' && Math.random() < dt * 2.5) this.sfx('bubble', 0.8);
    if (tp.watch !== 'tap') tp.tapN = -1;
    pet.tiltPivot = { x: 0, y: 0 };
  }

  // Fish swimming, food flakes, bubbles and the murky tint in a little canvas over the tank.
  updateTank(dt, hidden) {
    const el = this.toys.els.get('aquario');
    if (!el || hidden || el.style.display === 'none') return;
    const c = this.liveCanvas(el, 64, 52);
    this.tankAcc = (this.tankAcc || 0) + dt;
    if (this.tankAcc < 1 / 12) return;
    dt = this.tankAcc;
    this.tankAcc = 0;
    const g = c.getContext('2d');
    const k = this.tank();
    const hungry = Date.now() - k.fed > 6 * 3600000;
    const [x1, x2, y1, y2] = [3, 61, 8, 32];
    this.fish ||= [['#ff8a3d', 22, 16], ['#ffd23f', 40, 24], ['#ff6fb5', 30, 28]].map(([color, x, y]) => ({ color, x, y, vx: rand(6, 12) * (Math.random() < 0.5 ? -1 : 1), ph: rand(0, 6) }));
    g.clearRect(0, 0, 64, 52);
    for (const f of this.flakes) {
      f.y += f.vy * dt;
      f.life -= dt;
    }
    this.flakes = this.flakes.filter((f) => f.life > 0 && f.y < 0.62);
    this.fishScare = Math.max(0, this.fishScare - dt);
    for (const f of this.fish) {
      const food = this.flakes[0];
      const speed = (hungry ? 0.5 : 1) * (this.fishScare > 0 ? 3 : 1);
      if (food) {
        const fx = x1 + food.x * (x2 - x1);
        const fy = food.y * 52;
        f.vx = clamp(fx - f.x, -18, 18);
        f.y += clamp(fy - f.y, -10, 10) * dt * 2;
        if (Math.abs(fx - f.x) < 3 && Math.abs(fy - f.y) < 3) this.flakes.shift();
      } else {
        f.ph += dt * 2;
        f.y += Math.sin(f.ph) * dt * 3;
      }
      f.x += f.vx * speed * dt;
      if (f.x < x1 + 3 || f.x > x2 - 4) f.vx = -f.vx;
      f.x = clamp(f.x, x1 + 3, x2 - 4);
      f.y = clamp(f.y, y1 + 2, y2 - 3);
      const d = f.vx < 0 ? -1 : 1;
      g.fillStyle = f.color;
      g.fillRect(Math.round(f.x - 3), Math.round(f.y - 1), 6, 3);
      g.fillRect(Math.round(f.x - 3 - d * 3), Math.round(f.y - 2 + (hungry ? 1 : 0)), 2, 4);
      g.fillStyle = '#1d1a26';
      g.fillRect(Math.round(f.x + d * 2 - (d < 0 ? 1 : 0)), Math.round(f.y - 1), 1, 1);
    }
    g.fillStyle = '#f4e1a0';
    for (const f of this.flakes) g.fillRect(Math.round(x1 + f.x * (x2 - x1)), Math.round(f.y * 52), 1, 1);
    this.bubT = (this.bubT || 0) + dt;
    g.fillStyle = 'rgba(220, 245, 255, 0.8)';
    for (let i = 0; i < 4; i++) {
      const u = ((this.bubT * 0.25 + i * 0.27) % 1);
      g.fillRect(Math.round(12 + i * 13 + Math.sin(u * 9 + i) * 2), Math.round(y2 - u * (y2 - y1)), 1, 1);
    }
    if (k.murk > 2) {
      g.fillStyle = `rgba(92, 104, 38, ${(k.murk / 100) * 0.72})`;
      g.fillRect(x1 - 1, 6, x2 - x1 + 2, 32);
      g.fillStyle = `rgba(60, 70, 20, ${(k.murk / 100) * 0.6})`;
      for (let i = 0; i < Math.round(k.murk / 8); i++) g.fillRect(x1 + ((i * 37) % (x2 - x1)), 8 + ((i * 23) % 26), 1, 1);
    }
  }

  liveCanvas(el, w, h) {
    let c = el.querySelector('canvas.fun-live');
    if (!c) {
      c = document.createElement('canvas');
      c.className = 'fun-live';
      c.width = w;
      c.height = h;
      el.append(c);
    }
    const t = this.app.game.toys[el.dataset.id];
    c.style.transform = t?.flip ? 'scaleX(-1)' : '';
    return c;
  }

  // ---------- keyboard ----------
  playKeys(id, pet, it, scale, pickAnim, end) {
    pet.playToy({
      id, dur: rand(18, 32), gain: it.gain, scale, hold: icon('fun_blank'), holdSize: 0.02, anim: 'idle', facing: 'front', onEnd: end,
      tick: (dt, tp) => this.keysTick(dt, tp, pet),
    });
    this.say('pianoStart');
  }

  // Play styles (one per song): calm sway, rock (head-banging), virtuoso (fast, hands crossing), singer (bouncing to the beat).
  keysTick(dt, tp, pet) {
    const P = this.P;
    if (!tp.song) {
      tp.rest = (tp.rest ?? 0.4) - dt;
      if (tp.bow > 0) {
        tp.bow -= dt;
        pet.squash = { x: 1, y: 1 - 0.06 * Math.sin(Math.min(1, tp.bow) * Math.PI) };
        pet.bodyY = P * 0.03 * Math.sin(Math.min(1, tp.bow) * Math.PI);
        if (tp.bow <= 0) {
          pet.squash = null;
          pet.bodyY = 0;
        }
      }
      if (tp.rest > 0) return;
      const name = Math.random() < 0.25 ? null : pick(Object.keys(SONGS));
      const notes = name ? SONGS[name] : Array.from({ length: 16 }, (_, i) => [pick([0, 2, 4, 7, 9, 12]), i % 4 === 3 ? 2 : pick([0.5, 1])]);
      const style = pick(['calma', 'rock', 'virtuose', 'cantora']);
      tp.song = { notes, i: 0, next: 0, style, tempo: style === 'virtuose' ? 0.75 : style === 'rock' ? 0.9 : style === 'calma' ? 1.15 : 1 };
    }
    const s = tp.song;
    s.next -= dt;
    if (s.next <= 0) {
      if (s.i >= s.notes.length) {
        tp.song = null;
        tp.rest = 1.6;
        // Takes a bow, sometimes celebrates (and the Doll dancing next to her claps).
        tp.bow = 1;
        if (Math.random() < 0.5) {
          pet.emit('gameExcite');
          this.flash(pet, tp, ['comemorar', 'emote_pos'], ['idle'], 1.4);
        }
        if (this.withDoll(tp)) this.sfx('cheer', 0.8);
        return;
      }
      const [semi, beats] = s.notes[s.i++];
      s.next = beats * BEAT * s.tempo;
      if (semi != null) {
        const oct = s.style === 'virtuose' && s.i % 8 > 5 ? 12 : 0;
        this.note(semi + oct, beats * BEAT * s.tempo);
        this.flashKey(semi + oct);
        tp.press = 1;
        tp.side = s.style === 'virtuose' ? (s.i % 2 ? 1 : -1) : semi > 6 ? 1 : -1;
        if (s.i % 4 === 0) this.app.modes?.note?.(Math.random() < 0.4);
      }
    }
    tp.press = Math.max(0, (tp.press || 0) - dt * 6);
    const p = tp.press;
    pet.squash = null;
    pet.bodyY = 0;
    if (s.style === 'rock') {
      tp.reach = 0.24 + p * 0.08;
      tp.bob = p * 4;
      pet.tilt = Math.sin(tp.t * 9) * 0.05 + (tp.side || 0) * p * 0.03;
      pet.bodyY = P * 0.015 * Math.abs(Math.sin(tp.t * 9));
    } else if (s.style === 'virtuose') {
      tp.reach = 0.26 + p * 0.12;
      tp.bob = p * 2;
      pet.tilt = (tp.side || 0) * (0.03 + p * 0.03);
    } else if (s.style === 'cantora') {
      tp.reach = 0.22 + p * 0.06;
      tp.bob = p * 2;
      pet.tilt = Math.sin(tp.t * 3) * 0.04;
      pet.bodyY = -P * 0.02 * Math.abs(Math.sin(tp.t * Math.PI / (BEAT * 2)));
      if (Math.random() < dt * 0.5) this.float(pet.x + rand(-0.3, 0.3) * P, pet.y - P * 1.15, pick(['♪', '♫']));
    } else {
      tp.reach = 0.22 + p * 0.06;
      tp.bob = p * 2;
      pet.tilt = Math.sin(tp.t * 2) * 0.03 + (tp.side || 0) * p * 0.02;
    }
    pet.tiltPivot = { x: 0, y: 0 };
  }

  // The Doll walking on the keys: the key under its feet sounds (an octave up, its own little voice).
  dollStep(x) {
    const el = this.toys.els.get('teclado');
    const t = this.app.game.toys.teclado;
    if (!el || !t) return;
    const r = el.getBoundingClientRect();
    if (!r.width) return;
    let u = (x - r.left) / r.width;
    if (t.flip) u = 1 - u;
    const k = clamp(Math.floor(((u - 3 / 34) / (28 / 34)) * 14), 0, 13);
    if (k === this.dollKey) return;
    this.dollKey = k;
    const s = this.app.sound;
    if (s.enabled && !this.app.config?.focus) {
      const f = 293.66 * 2 ** ((WHITE[k] + 12) / 12);
      s.tone8(f, f * 1.002, 0.16, 'triangle', 0.035);
    }
    this.flashKey(WHITE[k]);
  }

  updateKeys(dt, hidden) {
    const el = this.toys.els.get('teclado');
    if (!el || (!this.keyFlash.size && !this.keysLit)) return;
    const c = this.liveCanvas(el, 68, 40);
    const g = c.getContext('2d');
    g.clearRect(0, 0, 68, 40);
    this.keysLit = this.keyFlash.size > 0;
    if (hidden) return this.keyFlash.clear();
    for (const [k, life] of this.keyFlash) {
      g.fillStyle = `rgba(255, 79, 216, ${Math.min(1, life * 4) * 0.75})`;
      g.fillRect((3 + k * 2) * 2 + 2, 8, 2, 10);
      const left = life - dt;
      if (left <= 0) this.keyFlash.delete(k);
      else this.keyFlash.set(k, left);
    }
  }

  // ---------- trampoline ----------
  playTramp(id, pet, it, scale, pickAnim, end) {
    const t = this.app.game.toys[id];
    pet.x = clamp(t.x, this.P * 0.3, this.app.world.width - this.P * 0.3);
    pet.playToy({
      id, dur: rand(14, 24), gain: it.gain, scale, anim: 'jump', facing: 'front', effort: 2.2,
      onEnd: (i) => {
        pet.squash = null;
        end(i);
      },
      tick: (dt, tp) => this.trampTick(dt, tp, pet, id),
    });
  }

  trampTick(dt, tp, pet, id) {
    const P = this.P;
    const floor = this.toys.floorY();
    const base = this.toys.size(id) * this.toys.ratio(id) * 0.7;
    const j = (tp.j ||= { h: 0, v: 0, n: 0, air: 1 });
    const g = pet.gravity * 0.8;
    j.v -= g * dt;
    j.h += j.v * dt;
    j.at = (j.at || 0) + dt;
    pet.squash = j.h < P * 0.05 && j.v < 0 ? (j.trick === 'seat' ? { x: 1.14, y: 0.84 } : { x: 1.08, y: 0.92 }) : null;
    if (j.h <= 0) {
      j.h = 0;
      j.n++;
      let target = Math.min(P * (0.6 + j.n * 0.35), P * (1 + 2.5 * pet.stats.energy / 100));
      // Bouncing with the Doll: each one launches the other a bit higher.
      if (this.withDoll(tp)) target += P * 0.3;
      if (!tp.tried && j.n >= 4) {
        tp.tried = true;
        const s = Math.random() < 0.55 && this.trampWindow(pet, floor);
        if (s) {
          j.big = s;
          target = floor - s.y - base + P * 0.3;
          this.say('trampBig');
        }
      }
      // A wobbly landing now and then: a small bounce to get the balance back.
      if (!j.big && j.n > 2 && !j.wobbled && Math.random() < 0.08) {
        j.wobbled = true;
        target = P * 0.25;
        j.trick = 'wobble';
        this.sfx('trampWobble');
        this.float(pet.x, pet.y - base - P * 1.1, '💦');
        pet.anim(pet.pickClip(['emote_neg', 'medo'], ['idle']), { facing: 'front', restart: true });
      } else {
        j.trick = j.big || target < P * 1 ? null : pick(['star', 'star', 'tuck', 'seat', 'twist', 'flip']);
        if (j.trick === 'flip' && target < P * 1.8) j.trick = 'twist';
        if (j.trick === 'seat') pet.anim('sit', { pose: 'sit', facing: 'front', restart: true });
        else pet.anim(pet.pickClip(j.trick === 'star' ? ['comemorar', 'emote_pos'] : ['comemorar'], ['jump']), { facing: 'front', restart: true });
      }
      j.flip = j.trick === 'flip';
      j.v = Math.sqrt(2 * g * target);
      j.air = (2 * j.v) / g;
      j.at = 0;
      this.sfx('tramp', 1.2);
      if (j.flip || j.trick === 'twist') this.sfx('trampFlip', 0.8);
    }
    const u = clamp(j.at / (j.air || 1), 0, 1);
    if (j.h > P * 0.05) {
      if (j.trick === 'tuck') pet.squash = { x: 1, y: 1 - 0.14 * Math.sin(u * Math.PI) };
      else if (j.trick === 'twist') pet.squash = { x: Math.cos(u * Math.PI * 2) || 0.01, y: 1 };
    }
    const lift = base + j.h;
    if (j.big) {
      const s = this.app.world.surfaceAt(j.big.id, pet.x, 0);
      const top = floor - j.big.y;
      if (!s) j.big = null;
      else if (lift > top) j.above = true;
      else if (j.above && j.v < 0) {
        pet.squash = null;
        pet.lift = 0;
        pet.endToy(false);
        pet.y = s.y - 1;
        pet.timer = 1;
        pet.fall(0, 0);
        this.say('trampWindow', {}, true);
        return;
      }
    }
    tp.lift = lift;
    pet.tilt = j.flip ? clamp(j.at / j.air, 0, 1) * Math.PI * 2 * (pet.dir || 1) : Math.sin(j.at * 6) * 0.04;
    pet.tiltPivot = { x: 0, y: -P * 0.45 };
  }

  // A window top right above the trampoline, high but reachable.
  trampWindow(pet, floor) {
    const P = this.P;
    const H = this.app.world.height || floor;
    const list = this.app.world.surfaces.filter((s) => s.id !== 'floor' && pet.x > s.x1 + P * 0.2 && pet.x < s.x2 - P * 0.2
      && floor - s.y > P * 1.2 && floor - s.y < Math.min(H * 0.75, P * 9));
    return list.length ? pick(list) : null;
  }

  // ---------- instant camera ----------
  playCamera(id, pet, it, scale, pickAnim, end) {
    const shots = 1 + Math.floor(Math.random() * 3);
    pet.playToy({
      id, dur: 2.2 + shots * 4.2, gain: it.gain, scale, hold: icon('camera'), holdSize: 0.16, holdFrom: 0.9, pickAnim, anim: 'idle', facing: 'front', shots, onEnd: end,
      tick: (dt, tp) => {
        const P = this.P;
        tp.next = (tp.next ?? 1.6) - dt;
        // Each shot is framed differently: normal, selfie, crouched low, or sideways (portrait).
        if (!tp.shot && tp.next < 1.2) {
          tp.shot = pick(['normal', 'normal', 'selfie', 'agachada', 'retrato']);
          this.sfx('flashCharge');
          if (tp.shot === 'selfie') this.flash(pet, tp, ['emote_pos', 'emote'], ['idle'], 1.2);
        }
        if (!tp.said && tp.next < 1) {
          tp.said = true;
          this.say('photoReady');
        }
        if (tp.next <= 0 && (tp.taken || 0) < tp.shots) {
          tp.taken = (tp.taken || 0) + 1;
          tp.next = 4.2;
          this.snap(pet, tp);
          tp.shake = 2.2;
        }
        const shot = tp.next < 1.2 || tp.next > 3.6 ? tp.shot : null;
        tp.reach = shot === 'selfie' ? 0.95 : 0.72;
        tp.angle = shot === 'selfie' ? -25 : shot === 'retrato' ? 90 : 0;
        pet.bodyY = shot === 'agachada' ? P * 0.09 : 0;
        pet.squash = shot === 'agachada' ? { x: 1.03, y: 0.93 } : null;
        pet.tilt = shot === 'selfie' ? -0.06 * (pet.dir || 1) : 0;
        pet.tiltPivot = { x: 0, y: 0 };
        tp.bob = tp.next > 3.8 ? -2 : 0;
        // Shakes the polaroid while it develops.
        if (tp.shake > 0 && tp.next <= 3.6) {
          tp.shot = null;
          tp.shake -= dt;
          tp.angle = Math.sin(tp.t * 22) * 22;
          tp.reach = 0.5;
          this.sfx('polaroidShake', 0.7);
        }
      },
    });
  }

  snap(pet, tp) {
    const src = this.capture(pet, tp);
    this.sfx('shutter');
    setTimeout(() => this.sfx('eject', 0.9), 180);
    const flash = document.createElement('div');
    flash.className = 'fun-flash';
    document.body.append(flash);
    setTimeout(() => flash.remove(), 450);
    if (!src) return;
    const d = this.data;
    const photos = (d.photos ||= []);
    photos.push({ src, at: Date.now() });
    while (photos.length > ALBUM_MAX) photos.shift();
    this.app.game.changed();
    const h = this.hand();
    const card = document.createElement('div');
    card.className = 'fun-photo';
    const img = document.createElement('img');
    img.src = src;
    card.append(img);
    card.style.left = `${Math.round(h.x - 30)}px`;
    card.style.top = `${Math.round(h.y - 10)}px`;
    document.body.append(card);
    setTimeout(() => card.remove(), 3600);
    this.say('photo', {}, photos.length === 1);
  }

  // Polaroid of what is on screen around her (or the Doll / another object): the overlay's own
  // canvases and pictures drawn over a soft backdrop. Not a real screenshot.
  capture(pet, tp) {
    const P = this.P;
    const others = [...this.toys.els.values()].filter((e) => e.style.display !== 'none' && !e.classList.contains('parcel'));
    const doll = this.app.doll;
    let cx = pet.x;
    let cy = pet.y - (pet.lift || 0) - P * 0.5;
    // The Doll posing for her: it is the subject (both of them in the frame).
    if (this.withDoll(tp) && doll?.x != null) {
      cx = (doll.x + pet.x) / 2;
      cy = doll.y - P * 0.35;
    } else if (Math.random() < 0.4) {
      if (doll?.active && doll.x != null && Math.random() < 0.6) {
        cx = doll.x;
        cy = doll.y - P * 0.2;
      } else if (others.length) {
        const r = pick(others).getBoundingClientRect();
        cx = r.left + r.width / 2;
        cy = r.top + r.height / 2;
      }
    }
    const sw = P * 2.4;
    const sh = sw * 0.75;
    const left = clamp(cx - sw / 2, 0, Math.max(0, innerWidth - sw));
    const top = clamp(cy - sh / 2, 0, Math.max(0, innerHeight - sh));
    const W = 200;
    const H = 150;
    const k = W / sw;
    try {
      const c = document.createElement('canvas');
      c.width = W;
      c.height = H;
      const g = c.getContext('2d');
      const hour = new Date().getHours();
      const sky = hour >= 6 && hour < 17 ? ['#bfe6ff', '#fff3d6'] : hour >= 17 && hour < 20 ? ['#ffb38a', '#ffe0f0'] : ['#2a2d5a', '#6a5a9a'];
      const grd = g.createLinearGradient(0, 0, 0, H);
      grd.addColorStop(0, sky[0]);
      grd.addColorStop(1, sky[1]);
      g.fillStyle = grd;
      g.fillRect(0, 0, W, H);
      const floorY = (this.toys.floorY() - top) * k;
      g.fillStyle = 'rgba(0, 0, 0, 0.12)';
      if (floorY < H) g.fillRect(0, floorY, W, H - floorY);
      const draw = (el) => {
        if (!el || el.style?.display === 'none') return;
        const r = el.getBoundingClientRect();
        if (!r.width || r.right < left || r.left > left + sw || r.bottom < top || r.top > top + sh) return;
        try {
          g.drawImage(el, (r.left - left) * k, (r.top - top) * k, r.width * k, r.height * k);
        } catch {}
      };
      g.imageSmoothingEnabled = false;
      for (const el of others) if (el.classList.contains('back')) draw(el.querySelector('img:not(.mark)'));
      if (this.fx?.back) g.drawImage(this.fx.back, left, top, sw, sh, 0, 0, W, H);
      draw(document.getElementById('pet'));
      for (const el of others) if (!el.classList.contains('back')) draw(el.querySelector('img:not(.mark)'));
      draw(document.querySelector('canvas.toy.doll'));
      draw(document.querySelector('.held-toy img'));
      g.fillStyle = 'rgba(255, 140, 60, 0.85)';
      g.font = 'bold 10px Consolas, monospace';
      g.fillText(new Date().toLocaleDateString(), W - 70, H - 6);
      return c.toDataURL('image/jpeg', 0.78);
    } catch {
      return null;
    }
  }

  // ---------- wind-up robot ----------
  playRobot(id, pet, it, scale, pickAnim, end) {
    pet.playToy({
      id, dur: rand(18, 30), gain: it.gain, scale, pickAnim, holdFrom: 0.9, anim: 'idle', facing: 'front', effort: 1.8,
      onEnd: (i) => {
        this.dropAt(id, this.app.game.toys[id]?.x ?? pet.x);
        end(i);
      },
      tick: (dt, tp) => this.robotTick(dt, tp, pet, id),
    });
  }

  robotTick(dt, tp, pet, id) {
    const P = this.P;
    const W = this.app.world.width;
    const t = this.app.game.toys[id];
    if (!t) return;
    const r = (tp.r ||= { phase: 'wind', w: 0, dir: Math.random() < 0.5 ? 1 : -1, spring: 0, cool: 0 });
    const anim = (name, facing) => {
      const key = `${name}:${facing}`;
      if (tp.animKey === key) return;
      tp.animKey = key;
      pet.anim(name, { facing });
    };
    r.cool -= dt;
    if (tp.animBack > 0) return;
    if (r.phase === 'wind') {
      r.clip ||= pet.pickClip(['pegar'], ['use_mainhand', 'idle']);
      anim(r.clip, 'front');
      r.w += dt;
      tp.tk = (tp.tk ?? 0) - dt;
      if (tp.tk <= 0) {
        tp.tk = 0.22;
        this.sfx('windTick', 1.2);
      }
      if (r.w > 1.3) {
        r.phase = 'run';
        r.spring = rand(5, 9);
        this.app.sound.sfx('ratchet', 0.6);
        this.sfx('robotBeep');
        if (!tp.saidGo) {
          tp.saidGo = true;
          this.say('robotGo');
        }
      }
      return;
    }
    if (r.phase === 'run') {
      this.moveRobot(t, r, dt);
      const doll = this.app.doll;
      if (doll?.active && doll.x != null && !doll.held && r.cool <= 0 && Math.abs(doll.x - t.x) < P * 0.22 && doll.y > this.toys.floorY() - P * 0.6) {
        r.cool = 2;
        doll.knock(r.dir * P * 2, -P * 3);
        r.dir = -r.dir;
        this.app.sound.sfx('bonk', 0.7);
        this.say('robotDoll');
      }
      if (r.spring <= 0) {
        r.phase = 'stop';
        // It ran down: claps for it, or a little hop of joy.
        if (Math.random() < 0.45) {
          this.flash(pet, tp, ['comemorar', 'emote_pos'], ['jump', 'idle'], 1);
          return;
        }
      }
    }
    // She chases it (and walks back to it once it stops to wind it again), hopping when she is close.
    const want = r.phase === 'run' ? t.x - r.dir * P * 0.4 : t.x + (pet.x < t.x ? -1 : 1) * P * 0.28;
    const dx = want - pet.x;
    pet.bodyY = 0;
    if (Math.abs(dx) > P * 0.08) {
      pet.dir = dx > 0 ? 1 : -1;
      const fast = Math.abs(dx) > P * 0.6;
      pet.x = clamp(pet.x + pet.dir * Math.min(Math.abs(dx), (fast ? pet.runSpeed * 0.7 : pet.walkSpeed) * dt), P * 0.2, W - P * 0.2);
      anim(fast ? 'run' : 'walk', pet.side());
      if (!fast && r.phase === 'run' && tp.hop) pet.bodyY = -P * 0.06 * Math.abs(Math.sin(tp.t * 9));
    } else if (r.phase === 'stop') {
      r.phase = 'wind';
      r.w = 0;
      r.dir = pet.x < t.x ? 1 : -1;
      tp.hop = Math.random() < 0.5;
    } else anim('idle', 'front');
  }

  // Wind-up walk with its spring running down; turns back at the screen edges.
  moveRobot(t, r, dt) {
    const P = this.P;
    const W = this.app.world.width;
    r.spring -= dt;
    const sp = P * 1.1 * clamp(r.spring / 2, 0.15, 1);
    t.x += r.dir * sp * dt;
    if (t.x < P * 0.2 || t.x > W - P * 0.2) {
      t.x = clamp(t.x, P * 0.2, W - P * 0.2);
      r.dir = -r.dir;
      this.sfx('robotBump');
    }
    t.flip = r.dir < 0;
    r.stepT = (r.stepT ?? 0) - dt;
    if (r.stepT <= 0) {
      r.stepT = 0.18;
      this.sfx('robotStep');
    }
    if (r.spring <= 0) this.sfx('robotStop');
  }

  updateRobotEl() {
    const el = this.toys.els.get('robo');
    if (!el) return;
    const tp = this.app.pet.toyPlay;
    const fx = this.dollFx('robo');
    el.classList.toggle('fun-walk', (tp?.id === 'robo' && tp.r?.phase === 'run') || !!fx?.run);
  }

  // ---------- tamagotchi ----------
  playTama(id, pet, it, scale, pickAnim, end) {
    const sit = Math.random() < 0.35;
    const m0 = this.tama();
    pet.playToy({
      id, dur: rand(12, 20), gain: it.gain, scale, hold: icon('tamagotchi'), holdSize: 0.09, holdFrom: 0.9, pickAnim, anim: sit ? 'sit' : 'idle', pose: sit ? 'sit' : 'stand', facing: 'front', onEnd: end,
      worried: m0.hunger < 35 || m0.mood < 35,
      tick: (dt, tp) => {
        tp.next = (tp.next ?? 1.4) - dt;
        if (tp.act) tp.act.t -= dt;
        // Worried at first when the little pet is sad; mashing the buttons while playing with it.
        if (tp.worried && tp.t < 2.5) {
          tp.reach = 0.55;
          pet.tilt = Math.sin(tp.t * 2) * 0.04;
          if (!tp.sadSnd) {
            tp.sadSnd = true;
            this.sfx('tamaSad');
          }
        } else {
          const mash = tp.act?.kind === 'play' && tp.act.t > 0;
          tp.reach = 0.42 + (mash ? Math.sin(tp.t * 30) * 0.02 : 0);
          tp.bob = mash ? Math.sin(tp.t * 30) * 1.2 : 0;
          pet.tilt = mash ? Math.sin(tp.t * 6) * 0.02 : Math.sin(tp.t * 1.2) * 0.015;
          if (mash) this.sfx('tamaBeep', 0.5);
        }
        pet.tiltPivot = { x: 0, y: 0 };
        if (tp.next > 0) return;
        tp.next = rand(2, 3.2);
        const m = this.tama();
        const feed = m.hunger <= m.mood;
        if (feed) m.hunger = Math.min(100, m.hunger + rand(18, 28));
        else m.mood = Math.min(100, m.mood + rand(15, 25));
        tp.act = { kind: feed ? 'feed' : 'play', t: 1.2 };
        this.sfx(feed ? 'tamaEat' : 'tamaBeep', 0.8);
        if (m.hunger > 90 && m.mood > 90 && !tp.happy) {
          tp.happy = true;
          pet.adjust({ mood: 3 });
          this.sfx('tamaHappy');
          this.flash(pet, tp, ['comemorar', 'emote_pos'], ['jump', 'idle'], 1.2);
          this.say('tamaHappy');
        }
      },
    });
  }

  drawTama(g, tp) {
    const P = this.P;
    const h = this.hand();
    const m = this.tama();
    const s = Math.max(2, Math.round(P * 0.018));
    const w = s * 20;
    const ht = s * 16;
    const x = Math.round(h.x - w / 2);
    const y = Math.round(h.y - P * 0.42 - ht);
    g.fillStyle = '#ff9ad5';
    g.beginPath();
    g.ellipse(x + w / 2, y + ht / 2, w / 2 + s * 2, ht / 2 + s * 2, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#c8e6a0';
    g.fillRect(x, y, w, ht);
    const sad = m.hunger < 25 || m.mood < 25;
    const bounce = Math.floor(tp.t * 3) % 2;
    const bx = x + s * 7;
    const by = y + s * (5 + (sad ? 1 : bounce));
    g.fillStyle = '#2b3a1a';
    g.fillRect(bx + s, by, s * 4, s);
    g.fillRect(bx, by + s, s * 6, s * 4);
    g.fillRect(bx + s, by + s * 5, s, s);
    g.fillRect(bx + s * 4, by + s * 5, s, s);
    g.fillStyle = '#c8e6a0';
    g.fillRect(bx + s, by + s * 2, s, s);
    g.fillRect(bx + s * 4, by + s * 2, s, s);
    if (sad) g.fillRect(bx + s * 2, by + s * 4, s * 2, s);
    if (tp.act?.t > 0) {
      g.fillStyle = tp.act.kind === 'feed' ? '#8a5a2b' : '#d33c3c';
      const ix = x + s * 15;
      const iy = y + s * 3;
      if (tp.act.kind === 'feed') {
        g.fillRect(ix, iy + s, s * 3, s * 2);
        g.fillRect(ix + s, iy, s, s);
      } else {
        g.fillRect(ix, iy, s, s); g.fillRect(ix + s * 2, iy, s, s); g.fillRect(ix, iy + s, s * 3, s); g.fillRect(ix + s, iy + s * 2, s, s);
      }
    }
    const bar = (v, row, color) => {
      g.fillStyle = 'rgba(43, 58, 26, 0.35)';
      g.fillRect(x + s, y + ht - s * row, s * 6, s);
      g.fillStyle = color;
      g.fillRect(x + s, y + ht - s * row, Math.round((s * 6 * v) / 100), s);
    };
    bar(m.hunger, 2, '#8a5a2b');
    bar(m.mood, 4, '#d33c3c');
  }

  drawBandage(g) {
    const head = this.app.head;
    const im = this.img('bandage');
    if (!head || !im.complete) return;
    const P = this.P;
    const w = P * 0.11;
    g.save();
    g.translate(head.x + P * 0.07, head.y + P * 0.16);
    g.rotate(-0.4);
    g.imageSmoothingEnabled = false;
    g.drawImage(im, -w / 2, -w / 2, w, w);
    g.restore();
  }

  // ---------- per frame ----------
  tickState(now) {
    const { game, pet } = this.app;
    if (game.toys.aquario) {
      const k = this.tank();
      const h = clamp((now - (k.at || now)) / 3600000, 0, 72);
      k.at = now;
      if (now - k.fed > 6 * 3600000) k.murk = Math.min(100, k.murk + h * 10);
      if (game.toys.aquario.placed && k.murk > 60 && !pet.dead) {
        pet.adjust({ mood: (-0.01 * (k.murk - 60)) / 40 });
        this.tankNag = (this.tankNag ?? 120) - 1;
        if (this.tankNag <= 0) {
          this.tankNag = rand(150, 260);
          this.say('tankDirty');
        }
      }
    }
    if (game.toys.tamagotchi) {
      const m = this.tama();
      const h = clamp((now - (m.at || now)) / 3600000, 0, 72);
      m.at = now;
      m.hunger = Math.max(0, m.hunger - h * 6);
      m.mood = Math.max(0, m.mood - h * 5);
      if (game.toys.tamagotchi.placed && (m.hunger < 25 || m.mood < 25) && !pet.dead) {
        this.tamaNag = (this.tamaNag ?? 90) - 1;
        if (this.tamaNag <= 0) {
          this.tamaNag = rand(180, 320);
          this.say('tamaHungry');
        }
      }
    }
  }

  update(dt, hidden) {
    this.slowT = (this.slowT ?? 0) - dt;
    if (this.slowT <= 0) {
      this.slowT = 1;
      this.tickState(Date.now());
    }
    this.updateTank(dt, hidden);
    this.updateKeys(dt, hidden);
    this.updateRobotEl();
    this.drawFx(dt, hidden);
  }

  // Two see-through canvases: one behind the pet (kite, back of the hoop), one in front.
  drawFx(dt, hidden) {
    const pet = this.app.pet;
    const tp = pet.toyPlay;
    const kind = tp?.picked && ['ioio', 'bambole', 'pipa', 'skate', 'tamagotchi'].includes(tp.id) ? tp.id : null;
    const band = this.bandaged() && !pet.dead;
    const dfx = this.dollFx();
    const dk = dfx?.on && (dfx.id === 'ioio' || dfx.id === 'bambole') && this.app.doll?.el?.style.display !== 'none' ? dfx : null;
    if (hidden || (!kind && !band && !dk)) {
      if (this.fx) {
        this.fx.back.remove();
        this.fx.front.remove();
        this.fx = null;
      }
      return;
    }
    if (!this.fx) {
      const mk = (cls) => {
        const c = document.createElement('canvas');
        c.className = cls;
        document.body.append(c);
        return c;
      };
      this.fx = { back: mk('fun-fx back'), front: mk('fun-fx') };
    }
    this.fxAcc = (this.fxAcc || 0) + dt;
    if (this.fxAcc < 1 / 30) return;
    this.fxAcc = 0;
    const [b, f] = [this.fx.back, this.fx.front].map((c) => {
      if (c.width !== innerWidth || c.height !== innerHeight) {
        c.width = innerWidth;
        c.height = innerHeight;
      }
      const g = c.getContext('2d');
      g.clearRect(0, 0, c.width, c.height);
      return g;
    });
    if (kind === 'ioio') this.drawYoyo(f, tp);
    else if (kind === 'bambole') {
      this.drawHoop(b, tp, true);
      this.drawHoop(f, tp, false);
    } else if (kind === 'pipa') this.drawKite(b, tp);
    else if (kind === 'skate') this.drawSkate(f, tp);
    else if (kind === 'tamagotchi') this.drawTama(f, tp);
    if (band) this.drawBandage(f);
    if (dk?.id === 'ioio') this.drawDollYoyo(f, dk);
    else if (dk) {
      const d = this.app.doll;
      const H = d.h;
      const cy = d.y - (d.lift || 0) - H * 0.42;
      const drop = dk.drop != null ? Math.min(1, dk.drop / 0.35) : 0;
      for (const [g, back] of [[b, true], [f, false]]) {
        this.ring(g, d.x + Math.sin(dk.phase || 0) * H * 0.06, cy + (d.y - H * 0.02 - cy) * drop * drop, H * 0.42, H * 0.1 * (1 - drop * 0.5), dk.phase || 0, back, Math.max(2, H * 0.045));
      }
    }
  }

  // The Doll's yo-yo: down and up from its hand, a "sleeper" spin at the bottom now and then.
  drawDollYoyo(g, fx) {
    const d = this.app.doll;
    const H = d.h;
    const h = this.dollHand(true);
    const u = ((fx.yt || 0) % 1.3) / 1.3;
    const y = h.y + H * 0.75 * Math.min(1, Math.sin(u * Math.PI) * 1.4);
    g.lineWidth = 1;
    g.strokeStyle = 'rgba(245, 242, 234, 0.95)';
    g.beginPath();
    g.moveTo(h.x, h.y);
    g.lineTo(h.x, y);
    g.stroke();
    const r = Math.max(2.5, H * 0.07);
    g.fillStyle = '#e2384d';
    g.beginPath(); g.arc(h.x, y, r, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#f4f1ea';
    g.fillRect(h.x - r, y - r * 0.18, r * 2 * Math.abs(Math.cos((fx.yt || 0) * 25)), r * 0.36);
  }
}
