// Visual filters for the pet canvas: SVG/CSS shaders, distortion, retro looks, pixelation, voxel.

export const FILTERS = [
  ['nenhum', 'Nenhum'],
  ['pixel', 'Pixelado'],
  ['voxel', 'Voxel'],
  ['crt', 'TV de tubo (CRT)'],
  ['gameboy', 'GameBuddy (4 cores)'],
  ['retro', 'Retrô (sépia)'],
  ['vhs', 'VHS'],
  ['onda', 'Distorção (onda)'],
  ['holograma', 'Holograma'],
  ['neon', 'Contorno neon'],
  ['toon', 'Cel shading'],
  ['noite', 'Visão noturna'],
];

const SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" style="position:absolute">
  <filter id="f-gameboy" color-interpolation-filters="sRGB">
    <feColorMatrix type="matrix" values="0.3 0.59 0.11 0 0  0.3 0.59 0.11 0 0  0.3 0.59 0.11 0 0  0 0 0 1 0"/>
    <feComponentTransfer>
      <feFuncR type="discrete" tableValues="0.06 0.19 0.55 0.61"/>
      <feFuncG type="discrete" tableValues="0.22 0.38 0.67 0.74"/>
      <feFuncB type="discrete" tableValues="0.06 0.19 0.06 0.06"/>
    </feComponentTransfer>
  </filter>
  <filter id="f-onda" x="-10%" y="-10%" width="120%" height="120%">
    <feTurbulence type="fractalNoise" baseFrequency="0.012 0.06" numOctaves="1" seed="2" result="n">
      <animate attributeName="seed" values="1;2;3;4;5;6;7;8" dur="0.8s" repeatCount="indefinite"/>
    </feTurbulence>
    <feDisplacementMap in="SourceGraphic" in2="n" scale="10" xChannelSelector="R" yChannelSelector="G"/>
  </filter>
  <filter id="f-vhs" x="-5%" y="-5%" width="110%" height="110%">
    <feColorMatrix in="SourceGraphic" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r"/>
    <feOffset in="r" dx="-2" dy="0" result="r2"/>
    <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0" result="gb"/>
    <feOffset in="gb" dx="2" dy="0" result="gb2"/>
    <feBlend in="r2" in2="gb2" mode="screen"/>
  </filter>
  <filter id="f-crt" x="-10%" y="-10%" width="120%" height="120%">
    <feGaussianBlur in="SourceGraphic" stdDeviation="1.6" result="b"/>
    <feColorMatrix in="b" type="matrix" values="1.3 0 0 0 0  0 1.3 0 0 0  0 0 1.4 0 0  0 0 0 0.7 0" result="glow"/>
    <feMerge><feMergeNode in="glow"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
  <filter id="f-neon" x="-15%" y="-15%" width="130%" height="130%">
    <feMorphology in="SourceAlpha" operator="dilate" radius="2" result="d"/>
    <feFlood flood-color="#3ff6ff"/>
    <feComposite in2="d" operator="in" result="o"/>
    <feGaussianBlur in="o" stdDeviation="3" result="g"/>
    <feMerge><feMergeNode in="g"/><feMergeNode in="o"/><feMergeNode in="SourceGraphic"/></feMerge>
  </filter>
  <filter id="f-toon" color-interpolation-filters="sRGB">
    <feComponentTransfer>
      <feFuncR type="discrete" tableValues="0.1 0.4 0.7 1"/>
      <feFuncG type="discrete" tableValues="0.1 0.4 0.7 1"/>
      <feFuncB type="discrete" tableValues="0.1 0.4 0.7 1"/>
    </feComponentTransfer>
    <feMorphology operator="dilate" radius="1" in="SourceAlpha" result="d"/>
    <feFlood flood-color="#1d1a26"/>
    <feComposite in2="d" operator="in" result="line"/>
    <feMerge><feMergeNode in="line"/><feMergeNode/></feMerge>
  </filter>
  <filter id="f-voxel" color-interpolation-filters="sRGB">
    <feConvolveMatrix order="3" kernelMatrix="2 1 0  1 1 -1  0 -1 -2" preserveAlpha="true" result="emb"/>
    <feComponentTransfer in="emb">
      <feFuncR type="discrete" tableValues="0.05 0.3 0.55 0.8 1"/>
      <feFuncG type="discrete" tableValues="0.05 0.3 0.55 0.8 1"/>
      <feFuncB type="discrete" tableValues="0.05 0.3 0.55 0.8 1"/>
    </feComponentTransfer>
  </filter>
</svg>`;

// filter: CSS filter, pixelate: render resolution divisor (relative to pet height), mask: scanlines.
const LOOKS = {
  nenhum: {},
  pixel: { pixelate: 48 },
  voxel: { pixelate: 28, filter: 'url(#f-voxel) drop-shadow(2px 3px 0 rgba(0,0,0,0.45))' },
  crt: { pixelate: 90, filter: 'url(#f-crt) saturate(1.2)', scan: true },
  gameboy: { pixelate: 60, filter: 'url(#f-gameboy)' },
  retro: { filter: 'sepia(0.85) contrast(1.15) saturate(1.2)' },
  vhs: { filter: 'url(#f-vhs) saturate(1.4) contrast(1.05)', scan: true },
  onda: { filter: 'url(#f-onda)' },
  holograma: { filter: 'grayscale(1) sepia(1) hue-rotate(150deg) saturate(3) brightness(1.2) opacity(0.75) drop-shadow(0 0 6px #3ff6ff)', scan: true },
  neon: { filter: 'url(#f-neon)' },
  toon: { filter: 'url(#f-toon)' },
  noite: { filter: 'grayscale(1) sepia(1) hue-rotate(60deg) saturate(4) brightness(1.1) contrast(1.3)', scan: true },
};

// Moves each CSS filter function from its identity value towards the full effect (k 0..1+).
const IDENTITY = { sepia: 0, grayscale: 0, invert: 0, saturate: 1, contrast: 1, brightness: 1, opacity: 1, blur: 0, 'hue-rotate': 0 };
function scaleFilter(str, k) {
  return str.replace(/([a-z-]+)\(([^()]*(?:\([^()]*\))?[^()]*)\)/g, (all, fn, arg) => {
    if (fn === 'url') return k >= 0.35 ? all : '';
    if (fn === 'drop-shadow') return `drop-shadow(${arg.replace(/(-?[\d.]+)px/g, (m, n) => `${(n * k).toFixed(2)}px`)})`;
    if (!(fn in IDENTITY)) return all;
    const m = arg.match(/^(-?[\d.]+)(.*)$/);
    if (!m) return all;
    const v = IDENTITY[fn] + (parseFloat(m[1]) - IDENTITY[fn]) * k;
    return `${fn}(${Math.max(0, v).toFixed(3)}${m[2]})`;
  }).trim();
}

export function applyFilter(canvas, view, name, P, strength = 1) {
  if (!document.getElementById('pet-filters')) {
    const box = document.createElement('div');
    box.id = 'pet-filters';
    box.innerHTML = SVG;
    document.body.append(box);
  }
  const k = Math.max(0, Math.min(2, strength));
  const look = LOOKS[name] || LOOKS.nenhum;
  canvas.style.filter = look.filter ? scaleFilter(look.filter, k) : '';
  canvas.style.maskImage = canvas.style.webkitMaskImage = look.scan && k > 0.05 ? `repeating-linear-gradient(0deg, #000 0 2px, rgba(0,0,0,${(1 - 0.45 * Math.min(1, k)).toFixed(2)}) 2px 3px)` : '';
  view.setPixelate?.(look.pixelate && k > 0.05 ? Math.max(1, (P * devicePixelRatio) / (look.pixelate / Math.max(0.25, k))) : 1);
}
