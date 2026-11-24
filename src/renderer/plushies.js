// Claw Machine plushies — placeholder collection for now.
//
// TROCAR AS ARTES DEPOIS: cada pelúcia usa um ícone gerado em `defineIcons` abaixo. Quando as
// PNGs definitivas chegarem, basta trocar o corpo da função daquele ícone por
// `new URL('./assets/claw/plush/<id>.png', import.meta.url).href` (ou adicionar `imgAsset` na
// entrada correspondente em PLUSHIES). O resto do jogo — save, raridade, prêmio e i18n — não muda.

import { defineIcons, icon } from './pixel.js';

const plush = (id, name, rarity, pix) => ({
  id, name, rarity, pix,
  get img() { return icon(pix); },
});

export const PLUSHIES = [
  plush('ursinho', 'Ursinho', 'comum', 'plush_ursinho'),
  plush('estrela', 'Estrela', 'comum', 'plush_estrela'),
  plush('gatinho', 'Gatinho', 'comum', 'plush_gatinho'),
  plush('coelhinho', 'Coelhinho', 'rara', 'plush_coelhinho'),
  plush('slime', 'Slime', 'rara', 'plush_slime'),
  plush('corvo', 'Corvo de Pelúcia', 'epica', 'plush_corvo'),
];

export const plushById = (id) => PLUSHIES.find((p) => p.id === id) || null;

// Success chance and rarity table favour the Synthwave (upgraded) machine.
// Keep the odds here: the claw flow only consumes { ok, plush, rarity }.
export function rollPlush(up = false) {
  if (Math.random() >= (up ? 0.65 : 0.45)) return { ok: false };
  const table = up
    ? [['comum', 0.5], ['rara', 0.38], ['epica', 0.12]]
    : [['comum', 0.72], ['rara', 0.24], ['epica', 0.04]];
  let r = Math.random();
  let rarity = 'comum';
  for (const [rar, weight] of table) {
    if ((r -= weight) <= 0) { rarity = rar; break; }
  }
  const pool = PLUSHIES.filter((p) => p.rarity === rarity);
  return { ok: true, rarity, plush: pool[Math.floor(Math.random() * pool.length)] || PLUSHIES[0] };
}

const C = {
  brown: '#a4643c', brownL: '#c98b5a', dark: '#2a1826', pink: '#f6a8c0',
  gold: '#f4c63c', goldL: '#fff0a0', white: '#f2f0e8', gray: '#c9ced8',
  green: '#5fc86a', greenD: '#2e7a3e', cyan: '#5ef0ff', violet: '#7a3cff',
  crow: '#2a2440', crowL: '#4a4266', beak: '#ffb347',
};

// PLACEHOLDER pixel art (16×16). Replace one function per definitive PNG later.
defineIcons({
  plush_ursinho: (s) => s(16, 16, ({ rect, px, circle }) => {
    circle(4, 4, 2, C.brown); circle(12, 4, 2, C.brown);
    circle(8, 9, 5, C.brown); circle(8, 9, 3, C.brownL);
    rect(6, 8, 1, 1, C.dark); rect(9, 8, 1, 1, C.dark);
    rect(7, 10, 2, 1, C.pink); circle(8, 11, 1, C.pink);
  }),
  plush_estrela: (s) => s(16, 16, ({ rect, px }) => {
    rect(6, 1, 4, 2, C.gold); rect(4, 3, 8, 2, C.gold); rect(1, 5, 14, 3, C.gold);
    rect(3, 8, 10, 2, C.gold); rect(6, 10, 4, 4, C.gold);
    px(5, 5, C.goldL); px(7, 4, C.goldL); px(9, 6, C.goldL);
    rect(6, 6, 1, 1, C.dark); rect(9, 6, 1, 1, C.dark); rect(7, 8, 2, 1, C.dark);
  }),
  plush_gatinho: (s) => s(16, 16, ({ rect, px, circle }) => {
    rect(3, 3, 3, 4, C.gray); rect(10, 3, 3, 4, C.gray);
    circle(8, 9, 5, C.gray); circle(8, 10, 3, C.white);
    rect(5, 8, 2, 1, C.dark); rect(9, 8, 2, 1, C.dark);
    px(8, 10, C.pink); rect(7, 11, 2, 1, C.dark);
    rect(2, 10, 2, 1, C.gray); rect(12, 10, 2, 1, C.gray);
  }),
  plush_coelhinho: (s) => s(16, 16, ({ rect, px, circle }) => {
    rect(5, 0, 2, 7, C.white); rect(9, 0, 2, 7, C.white);
    rect(5, 1, 1, 5, C.pink); rect(10, 1, 1, 5, C.pink);
    circle(8, 10, 5, C.white); circle(8, 11, 3, C.white);
    rect(6, 9, 1, 1, C.dark); rect(9, 9, 1, 1, C.dark);
    px(8, 11, C.pink); rect(7, 12, 2, 1, C.dark); rect(13, 11, 2, 2, C.white);
  }),
  plush_slime: (s) => s(16, 16, ({ rect, px }) => {
    rect(4, 5, 8, 2, C.green); rect(2, 7, 12, 4, C.green); rect(1, 9, 14, 4, C.green);
    rect(2, 13, 12, 2, C.greenD);
    rect(5, 8, 2, 2, C.dark); rect(9, 8, 2, 2, C.dark);
    px(5, 8, C.white); px(9, 8, C.white); rect(7, 11, 2, 1, C.greenD);
    rect(4, 4, 2, 1, C.green); px(7, 3, C.green);
  }),
  plush_corvo: (s) => s(16, 16, ({ rect, px, circle }) => {
    circle(8, 8, 5, C.crow); rect(3, 7, 3, 2, C.crowL); rect(10, 7, 3, 2, C.crowL);
    rect(5, 7, 2, 2, C.cyan); rect(9, 7, 2, 2, C.cyan);
    px(5, 7, C.white); px(9, 7, C.white);
    rect(6, 9, 4, 2, C.beak); px(8, 12, C.violet);
    rect(4, 13, 8, 2, C.crow); rect(2, 12, 3, 3, C.crowL);
  }),
});
