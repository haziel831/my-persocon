// Food and drinks sold only by the upgraded (neon) vending machines: each one gives a buff. They
// are flagged legacy too, which keeps them out of the shop, the loot boxes, the gacha and the crow.
import { icon, defineIcons } from './pixel.js';

const NOTE = 'Exclusivo das máquinas de venda neon';
const vu = (id, cat, name, price, effects, buffs, rarity = 'comum') => ({
  id, cat, name, price, rarity, pix: `vu_${id}`, vendUp: true, legacy: true, note: NOTE,
  effects: cat === 'bebidas' ? { thirst: 35, ...effects } : effects,
  ...(buffs.length > 1 ? { buffs } : { buff: buffs[0] }),
  get img() {
    return typeof document === 'undefined' ? '' : icon(this.pix);
  },
});

export const VEND_UP_ITEMS = [
  vu('neo_onigiri', 'comidas', 'Onigiri Neon', 18, { hunger: 16, mood: 3 }, [['doubleMood', 120]], 'comum'),
  vu('holo_mochi', 'comidas', 'Mochi Holográfico', 30, { hunger: 10, mood: 12 }, [['doubleMood', 240]], 'comum'),
  vu('takoyaki_quantico', 'comidas', 'Takoyaki Quântico', 60, { hunger: 24, mood: 8 }, [['noHunger', 240]], 'incomum'),
  vu('ramen_plasma', 'comidas', 'Ramen de Plasma', 75, { hunger: 40, energy: 8 }, [['noTired', 300]], 'incomum'),
  vu('bento_cyber', 'comidas', 'Bentô Cyber', 110, { hunger: 50, health: 8 }, [['shield', 360]], 'raro'),
  vu('taiyaki_estelar', 'comidas', 'Taiyaki Estelar', 160, { hunger: 30, mood: 15 }, [['noHunger', 420], ['doubleMood', 420]], 'raro'),
  vu('agua_ionica', 'bebidas', 'Água Iônica', 15, { health: 2 }, [['shield', 120]], 'comum'),
  vu('soda_neon', 'bebidas', 'Soda Neon', 25, { mood: 8 }, [['doubleMood', 180]], 'comum'),
  vu('ramune_laser', 'bebidas', 'Ramune Laser', 45, { thirst: 40, energy: 6 }, [['noTired', 240]], 'incomum'),
  vu('matcha_turbo', 'bebidas', 'Matcha Turbo', 80, { energy: 14 }, [['noTired', 420]], 'incomum'),
  vu('cafe_nebula', 'bebidas', 'Café Nebulosa', 120, { thirst: 30, energy: 20, mood: 6 }, [['noTired', 480], ['shield', 300]], 'raro'),
  vu('elixir_synth', 'bebidas', 'Elixir Synthwave', 220, { thirst: 50, mood: 20, health: 10 }, [['coinMagnet', 300]], 'lendario'),
];

// Classic Japanese vending machine snacks and drinks, sold by both versions of the machines.
const NOTE_V = 'Exclusivo das máquinas de venda';
const vm = (id, cat, name, price, effects, buff, rarity) => ({
  id, cat, name, price, pix: `vm_${id}`, vend: true, legacy: true, note: NOTE_V,
  effects: cat === 'bebidas' ? { thirst: 30, ...effects } : effects,
  ...(buff ? { buff, rarity: rarity || 'comum' } : {}),
  get img() {
    return typeof document === 'undefined' ? '' : icon(this.pix);
  },
});

export const VEND_ITEMS = [
  vm('sopa_milho', 'comidas', 'Sopa de Milho em Lata', 14, { hunger: 14, mood: 3 }),
  vm('oden_lata', 'comidas', 'Oden em Lata', 22, { hunger: 22, health: 2 }),
  vm('melonpan', 'comidas', 'Pão de Melão', 12, { hunger: 14, mood: 4 }),
  vm('yakisoba_pan', 'comidas', 'Pão de Yakisoba', 16, { hunger: 20 }),
  vm('karaage_copo', 'comidas', 'Karaage no Copo', 20, { hunger: 22, mood: 4 }),
  vm('batata_copo', 'comidas', 'Batata Frita no Copo', 15, { hunger: 16, mood: 5, health: -1 }),
  vm('fruta_sando', 'comidas', 'Sanduíche de Frutas', 24, { hunger: 16, mood: 8 }),
  vm('purin', 'comidas', 'Pudim de Máquina', 18, { hunger: 10, mood: 10 }),
  vm('dango', 'comidas', 'Dango Tricolor', 13, { hunger: 12, mood: 5 }),
  vm('choco_palitos', 'comidas', 'Palitinhos de Chocolate', 10, { hunger: 6, mood: 7 }),
  vm('cafe_lata', 'bebidas', 'Café Gelado em Lata', 12, { energy: 10 }),
  vm('cafe_quente', 'bebidas', 'Café Quente em Lata', 13, { energy: 12, mood: 2 }, ['noTired', 120]),
  vm('cha_verde', 'bebidas', 'Chá Verde Gelado', 10, { health: 3 }),
  vm('mugicha', 'bebidas', 'Chá de Cevada', 9, { thirst: 36 }),
  vm('isotonico', 'bebidas', 'Bebida Isotônica', 14, { thirst: 42, energy: 4 }),
  vm('iogurte', 'bebidas', 'Bebida de Iogurte', 13, { hunger: 4, mood: 5 }),
  vm('melon_soda', 'bebidas', 'Soda de Melão', 12, { mood: 7, health: -1 }),
  vm('choco_quente', 'bebidas', 'Chocolate Quente em Lata', 15, { mood: 9, energy: 3 }),
  vm('pessego', 'bebidas', 'Suco de Pêssego', 12, { mood: 4, health: 2 }),
  vm('ramune', 'bebidas', 'Ramune Clássico', 11, { mood: 6 }),
];

const can = (body, band, light) => ({ rect, px }) => {
  rect(3, 1, 6, 1, '#c0c4d0'); rect(3, 2, 6, 9, body); rect(4, 2, 1, 9, light); rect(3, 5, 6, 3, band); rect(3, 11, 6, 1, '#8a909e'); px(7, 1, '#8a909e');
};
const bottle = (liquid, label, cap) => ({ rect, px }) => {
  rect(5, 0, 2, 1, cap); rect(5, 1, 2, 2, '#e8f4ff'); rect(4, 3, 4, 1, liquid); rect(3, 4, 6, 7, liquid); rect(3, 6, 6, 2, label); rect(3, 11, 6, 1, '#b8c4d4'); px(4, 4, '#ffffff'); px(4, 9, '#ffffff');
};
const steam = (px) => { px(4, 0, '#f4f1ea'); px(6, 0, '#f4f1ea'); };
defineIcons({
  vm_sopa_milho: (s) => s(12, 12, (d) => { can('#ffd23f', '#f4f1ea', '#ffe88a')(d); d.px(5, 6, '#f0a030'); d.px(7, 6, '#f0a030'); d.px(6, 7, '#f0a030'); }),
  vm_oden_lata: (s) => s(12, 12, (d) => { can('#8a5a2a', '#f4f1ea', '#a8783a')(d); d.px(4, 6, '#ffd23f'); d.px(6, 6, '#d89a50'); d.px(8, 6, '#ffffff'); }),
  vm_melonpan: (s) => s(12, 12, ({ rect, circle, px }) => {
    circle(6, 6, 4, '#c8e070'); rect(2, 8, 8, 2, '#a8c050'); rect(4, 3, 1, 6, '#e8f4a0'); rect(7, 3, 1, 6, '#e8f4a0'); rect(3, 5, 6, 1, '#e8f4a0'); px(4, 4, '#ffffff'); rect(2, 11, 8, 1, '#8a6a3a');
  }),
  vm_yakisoba_pan: (s) => s(12, 12, ({ rect, px }) => {
    rect(1, 6, 10, 4, '#d89a50'); rect(2, 10, 8, 1, '#b07030'); rect(2, 4, 8, 2, '#a0522d'); rect(3, 3, 6, 1, '#c06a3a'); px(4, 3, '#ff6060'); px(7, 4, '#ff6060'); px(5, 4, '#7ad04a'); px(2, 7, '#f0c080');
  }),
  vm_karaage_copo: (s) => s(12, 12, ({ rect, circle, px }) => {
    circle(4, 5, 2, '#c8742d'); circle(8, 5, 2, '#b8641d'); circle(6, 3, 2, '#d8843d'); rect(9, 0, 1, 4, '#e8d8b0');
    rect(3, 6, 6, 5, '#e2475a'); rect(3, 8, 6, 1, '#f4f1ea'); rect(4, 11, 4, 1, '#a02a3a'); px(5, 3, '#ffd23f');
  }),
  vm_batata_copo: (s) => s(12, 12, ({ rect, px }) => {
    rect(4, 1, 1, 5, '#ffd23f'); rect(6, 0, 1, 6, '#ffe14a'); rect(8, 2, 1, 4, '#ffd23f'); rect(5, 2, 1, 4, '#f0c030'); rect(7, 1, 1, 5, '#f0c030');
    rect(3, 5, 6, 6, '#e2475a'); rect(3, 7, 6, 1, '#ffd23f'); rect(4, 11, 4, 1, '#a02a3a');
  }),
  vm_fruta_sando: (s) => s(12, 12, ({ rect, px }) => {
    rect(1, 9, 10, 2, '#f4ead0'); rect(2, 7, 8, 2, '#f4ead0'); rect(3, 5, 6, 2, '#ffffff'); rect(4, 3, 4, 2, '#f4ead0'); rect(5, 2, 2, 1, '#f4ead0');
    px(4, 5, '#e2475a'); px(5, 6, '#e2475a'); px(7, 5, '#7ad04a'); px(6, 6, '#ffd23f'); rect(1, 11, 10, 1, '#c8b890');
  }),
  vm_purin: (s) => s(12, 12, ({ rect, px }) => {
    rect(4, 2, 4, 2, '#7a3a1a'); rect(3, 4, 6, 1, '#a0522d'); rect(3, 5, 6, 4, '#ffe08a'); rect(2, 9, 8, 1, '#ffd060'); rect(1, 10, 10, 1, '#d8dce8'); rect(2, 11, 8, 1, '#a8acb8'); px(4, 5, '#ffffff');
  }),
  vm_dango: (s) => s(12, 12, ({ rect, circle, px }) => {
    rect(10, 0, 1, 12, '#c8a070'); circle(9, 2, 2, '#ffb0c8'); circle(6, 5, 2, '#f4f1ea'); circle(3, 8, 2, '#7ad04a'); px(8, 1, '#ffffff'); px(5, 4, '#ffffff'); px(2, 7, '#a8f08a');
  }),
  vm_choco_palitos: (s) => s(12, 12, ({ rect, px }) => {
    rect(4, 0, 1, 5, '#6b3a1e'); rect(6, 1, 1, 4, '#6b3a1e'); rect(8, 0, 1, 5, '#6b3a1e'); rect(4, 4, 1, 1, '#f0c080'); rect(6, 4, 1, 1, '#f0c080'); rect(8, 4, 1, 1, '#f0c080');
    rect(2, 5, 8, 6, '#e2475a'); rect(2, 7, 8, 2, '#f4f1ea'); px(4, 7, '#6b3a1e'); px(7, 8, '#6b3a1e'); rect(2, 11, 8, 1, '#a02a3a');
  }),
  vm_cafe_lata: (s) => s(12, 12, (d) => { can('#3a2a1a', '#f4f1ea', '#5a4a3a')(d); d.px(5, 6, '#6b3a1e'); d.px(6, 6, '#6b3a1e'); d.px(7, 7, '#3a7bd5'); }),
  vm_cafe_quente: (s) => s(12, 12, (d) => { can('#c0392b', '#2a1a10', '#e05a4a')(d); steam(d.px); d.px(5, 6, '#ffd23f'); d.px(7, 6, '#ffd23f'); }),
  vm_cha_verde: (s) => s(12, 12, (d) => { bottle('#9ad870', '#2e7d32', '#2e7d32')(d); d.px(6, 6, '#f4f1ea'); }),
  vm_mugicha: (s) => s(12, 12, (d) => { bottle('#c8862d', '#f4f1ea', '#ffd23f')(d); d.px(5, 6, '#a0522d'); d.px(7, 7, '#a0522d'); }),
  vm_isotonico: (s) => s(12, 12, (d) => { bottle('#dff2ff', '#1f6fd0', '#1f6fd0')(d); d.px(5, 6, '#ffffff'); d.px(6, 7, '#ffffff'); }),
  vm_iogurte: (s) => s(12, 12, (d) => { bottle('#f4f1ea', '#3a7bd5', '#3a7bd5')(d); d.px(4, 6, '#f4f1ea'); d.px(6, 7, '#f4f1ea'); d.px(8, 6, '#f4f1ea'); }),
  vm_melon_soda: (s) => s(12, 12, (d) => { can('#3fd06a', '#f4f1ea', '#7af09a')(d); d.px(5, 6, '#3fd06a'); d.px(6, 7, '#e2475a'); }),
  vm_choco_quente: (s) => s(12, 12, (d) => { can('#6b3a1e', '#ffd23f', '#8b5a3e')(d); steam(d.px); d.px(5, 6, '#6b3a1e'); d.px(7, 6, '#6b3a1e'); }),
  vm_pessego: (s) => s(12, 12, (d) => { can('#ffb08a', '#ff7aa0', '#ffd0b0')(d); d.px(6, 6, '#ffd23f'); d.px(5, 7, '#7ad04a'); }),
  vm_ramune: (s) => s(12, 12, ({ rect, px }) => {
    rect(5, 0, 2, 2, '#3a7bd5'); rect(4, 2, 4, 2, '#bfe8ff'); px(5, 3, '#7ad04a'); rect(3, 4, 6, 7, '#bfe8ff'); rect(3, 7, 6, 1, '#3a7bd5'); rect(3, 11, 6, 1, '#8ac8f0'); px(4, 5, '#ffffff'); px(7, 9, '#ffffff');
  }),
});

const C = '#5ef0ff';
const K = '#ff3ea5';
const V = '#7a3cff';
const D = '#120c24';
defineIcons({
  vu_neo_onigiri: (s) => s(12, 12, ({ rect, px }) => {
    rect(5, 1, 2, 1, '#f4f1ea'); rect(4, 2, 4, 1, '#f4f1ea'); rect(3, 3, 6, 1, '#f4f1ea'); rect(2, 4, 8, 1, '#f4f1ea'); rect(1, 5, 10, 5, '#f4f1ea');
    rect(3, 7, 6, 3, D); rect(3, 7, 6, 1, C); px(5, 4, K); px(4, 3, '#ffffff'); rect(1, 10, 10, 1, V);
  }),
  vu_holo_mochi: (s) => s(12, 12, ({ rect, circle, px }) => {
    circle(6, 6, 4, '#ffb0e0'); rect(2, 8, 8, 2, '#e080c0'); rect(2, 6, 8, 1, 'rgba(94,240,255,0.6)'); rect(2, 3, 8, 1, 'rgba(94,240,255,0.35)');
    px(4, 4, '#ffffff'); rect(1, 11, 10, 1, V); px(9, 2, C);
  }),
  vu_takoyaki_quantico: (s) => s(12, 12, ({ rect, circle, px }) => {
    circle(3, 7, 2, '#c8642d'); circle(8, 7, 2, '#c8642d'); circle(5, 4, 2, '#c8642d');
    px(2, 6, C); px(8, 6, K); px(5, 3, C); px(4, 4, '#ffffff'); rect(1, 10, 10, 1, V); rect(2, 11, 8, 1, D);
  }),
  vu_ramen_plasma: (s) => s(12, 12, ({ rect, px }) => {
    rect(7, 0, 1, 6, '#ffd23f'); rect(9, 1, 1, 5, '#ffd23f');
    px(3, 1, K); px(4, 2, C); px(3, 3, K);
    rect(2, 5, 8, 1, K); rect(1, 6, 10, 1, C); rect(1, 7, 10, 3, D); rect(2, 10, 8, 1, D); rect(4, 11, 4, 1, '#2a1250');
    px(3, 5, '#ffe14a'); px(6, 5, '#ffffff'); rect(2, 8, 8, 1, V);
  }),
  vu_bento_cyber: (s) => s(12, 12, ({ rect, px }) => {
    rect(1, 3, 10, 8, D); rect(1, 3, 10, 1, C); rect(1, 10, 10, 1, K); rect(6, 4, 1, 6, V);
    rect(2, 5, 4, 4, '#f4f1ea'); px(3, 6, K); rect(7, 5, 3, 2, K); rect(7, 8, 3, 1, '#7ad04a'); px(8, 5, '#ffffff');
  }),
  vu_taiyaki_estelar: (s) => s(12, 12, ({ rect, px }) => {
    rect(2, 4, 7, 5, V); rect(1, 5, 1, 3, V); rect(9, 3, 2, 2, V); rect(9, 8, 2, 2, V); rect(9, 5, 1, 3, V);
    rect(2, 4, 7, 1, '#b080ff'); px(3, 5, '#ffffff'); px(5, 6, '#ffd23f'); px(7, 5, C); px(6, 8, K); rect(1, 10, 10, 1, D);
  }),
  vu_agua_ionica: (s) => s(12, 12, ({ rect, px }) => {
    rect(5, 0, 2, 1, C); rect(4, 1, 4, 1, '#cfeeff'); rect(3, 2, 6, 9, '#cfeeff'); rect(3, 5, 6, 6, C);
    rect(3, 6, 6, 2, D); px(5, 7, C); px(4, 9, '#ffffff'); px(7, 4, '#ffffff'); rect(3, 11, 6, 1, V);
  }),
  vu_soda_neon: (s) => s(12, 12, ({ rect, px }) => {
    rect(3, 1, 6, 1, '#c0c4d0'); rect(3, 2, 6, 9, K); rect(3, 11, 6, 1, '#c0c4d0');
    rect(3, 5, 6, 2, D); px(4, 5, C); px(6, 6, C); px(8, 5, C); rect(4, 2, 1, 9, '#ff9ad0');
  }),
  vu_ramune_laser: (s) => s(12, 12, ({ rect, px }) => {
    rect(5, 0, 2, 2, V); rect(4, 2, 4, 2, '#9ff6ff'); px(5, 3, K); rect(3, 4, 6, 7, '#9ff6ff');
    rect(3, 7, 6, 1, K); rect(3, 11, 6, 1, C); px(4, 5, '#ffffff');
  }),
  vu_matcha_turbo: (s) => s(12, 12, ({ rect, px }) => {
    rect(7, 0, 1, 2, K); rect(2, 1, 8, 1, '#f4f1ea'); rect(3, 2, 6, 9, '#3aa04a'); rect(3, 6, 6, 1, D);
    rect(5, 3, 2, 1, '#ffd23f'); rect(4, 4, 2, 1, '#ffd23f'); rect(5, 5, 2, 1, '#ffd23f'); px(5, 7, '#ffd23f'); rect(3, 11, 6, 1, C);
  }),
  vu_cafe_nebula: (s) => s(12, 12, ({ rect, px }) => {
    px(4, 1, K); px(5, 2, C); px(4, 3, K);
    rect(2, 4, 7, 7, '#2a1250'); rect(9, 6, 2, 3, '#2a1250'); px(9, 7, D); rect(2, 4, 7, 1, V);
    px(4, 6, '#ffffff'); px(6, 8, C); px(3, 9, K); px(7, 6, '#ffd23f'); rect(2, 11, 7, 1, C);
  }),
  vu_elixir_synth: (s) => s(12, 12, ({ rect, circle, px }) => {
    rect(5, 1, 2, 3, '#c8ccd8'); rect(5, 0, 2, 1, '#ffd23f'); circle(6, 7, 4, '#cfeeff');
    rect(3, 7, 7, 3, K); rect(3, 6, 7, 1, V); rect(4, 10, 5, 1, K); px(4, 5, '#ffffff'); px(8, 8, C); px(5, 9, '#ffffff');
  }),
});

// Real soda can sprites cut from food_sodas.jfif (transparent PNG, nearest-neighbour in CSS).
const SODA = (n) => new URL(`./assets/consumables/sodas/soda_${n}.png`, import.meta.url).href;
defineIcons({
  soda_01: () => SODA('01'), soda_02: () => SODA('02'), soda_03: () => SODA('03'),
  soda_04: () => SODA('04'), soda_05: () => SODA('05'),
  vu_soda_neon: () => SODA('02'), vu_cafe_nebula: () => SODA('05'),
  vm_melon_soda: () => SODA('03'), vm_cafe_lata: () => SODA('04'),
  vm_choco_quente: () => new URL('./assets/cafe/drink.png', import.meta.url).href,
  vm_ramune: () => new URL('./assets/cafe/glass.png', import.meta.url).href,
});
