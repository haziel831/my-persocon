// Os VFX de impacto em sequências de quadros (o pack "Free Pixel Effects Pack #16").
//
// Cada pasta numerada é UM efeito diferente (1 a 9) e os PNGs dentro dela são os quadros
// desse efeito, em ordem (1_000.png, 1_001.png, ... 1_059.png). NUNCA tocamos todas as
// pastas de uma vez: cada golpe toca UMA pasta (a leve ou a pesada) e a instância se
// destrói quando a sequência acaba.
//
// Os assets ficam em assets/vfx/pixel_effects_16/<pasta>/<pasta>_NNN.png (32x32).
const DIR = './assets/vfx/pixel_effects_16/';
// Quantos quadros tem cada pasta do pack.
export const VFX_FRAMES = 60;
// A velocidade: o pack foi feito para 15-24 quadros por segundo.
export const VFX_FPS = 24;
// As pastas usadas no combate (das 9 do pack): a leve e a pesada.
export const VFX_FOLDERS = { light: 1, heavy: 6 };

// O quanto o flash vermelho acende: o dano maior acende mais (25% a 100%).
export const flashIntensity = (dmg, ref = 20) => Math.min(1, Math.max(0.25, (dmg || 0) / ref));

// Os quadros de cada pasta (as imagens ficam em cache: uma pasta é carregada uma vez só).
const cache = new Map();
export const framesOf = (folder) => {
  let list = cache.get(folder);
  if (!list) {
    list = Array.from({ length: VFX_FRAMES }, (_, i) => {
      const img = new Image();
      img.src = new URL(`${DIR}${folder}/${folder}_${String(i).padStart(3, '0')}.png`, import.meta.url).href;
      return img;
    });
    cache.set(folder, list);
  }
  return list;
};

// O centro do canvas na tela.
const x0 = (v, size) => v - size / 2;

// Uma instância da sequência: um canvas 32x32 que mostra os quadros da pasta em ordem.
export class VfxSequence {
  constructor(folder, x, y, opts = {}) {
    this.folder = folder;
    this.x = x;
    this.y = y;
    this.cell = opts.cell ?? 32;
    this.scale = opts.scale ?? 2;
    this.fps = opts.fps ?? VFX_FPS;
    this.canvas = null;
    this.done = false;
    this.play();
  }

  play() {
    if (typeof document === 'undefined') return;
    const frames = framesOf(this.folder);
    const cv = document.createElement('canvas');
    cv.className = 'vfx-seq';
    cv.width = this.cell;
    cv.height = this.cell;
    const size = Math.round(this.cell * this.scale);
    cv.style.width = `${size}px`;
    cv.style.height = `${size}px`;
    cv.style.left = `${Math.round(x0(this.x, size))}px`;
    cv.style.top = `${Math.round(x0(this.y, size))}px`;
    document.body.append(cv);
    this.canvas = cv;
    const g = cv.getContext('2d');
    g.imageSmoothingEnabled = false;
    const ms = Math.max(16, Math.round(1000 / this.fps));
    const t0 = performance.now();
    const tick = () => {
      if (this.done) return;
      const i = Math.floor((performance.now() - t0) / ms);
      if (i >= frames.length) return this.destroy();
      const img = frames[i];
      g.clearRect(0, 0, this.cell, this.cell);
      // Quadro ainda carregando: fica o anterior na tela (não pisca).
      if (img?.complete && img.naturalWidth) g.drawImage(img, 0, 0, this.cell, this.cell);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  // Some com a instância (a sequência acabou ou foi cancelada).
  destroy() {
    this.done = true;
    this.canvas?.remove();
    this.canvas = null;
  }
}
