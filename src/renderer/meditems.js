// Medicamentos (1.9.7): ícones 16×16 recortados de
// Assets\NEW\16x16 Icon Pack\...\Spritesheets\Consumables & Survival.png
// Todos diminuem Humor (effects.mood negativo), em maior ou menor grau.
const art = (file) => new URL(`./assets/medicons/${file}`, import.meta.url).href;

const med = (id, name, price, file, extra = {}) => ({
  id, cat: 'medicina', name, price,
  img: art(file),
  effects: { mood: -3, ...(extra.effects || {}) },
  ...extra,
});

export const MED_ITEMS = [
  // Cura de efeitos negativos
  med('md_bandage', 'Bandagem', 10, 'bandage.png', { cures: ['lesao'], effects: { health: 8, mood: -2 } }),
  med('md_firstaid', 'Kit de Primeiros Socorros', 40, 'firstaid.png', { cures: ['gripe', 'prisao', 'nausea', 'lesao'], effects: { health: 18, mood: -4 } }),
  med('md_firstaid_red', 'Kit de Primeiros Socorros (Vermelho)', 55, 'firstaid_red.png', { cures: ['gripe', 'prisao', 'nausea', 'lesao'], effects: { health: 28, mood: -6 } }),
  med('md_bottle_red', 'Remédio para Gripe', 15, 'bottle_red.png', { cures: ['gripe'], effects: { health: 10, mood: -3 } }),
  med('md_bottle_blue', 'Remédio para Estômago', 15, 'bottle_blue.png', { cures: ['prisao'], effects: { health: 8, mood: -3 } }),
  med('md_bottle_green', 'Remédio para Náusea', 15, 'bottle_green.png', { cures: ['nausea'], effects: { health: 8, mood: -3 } }),
  med('md_bottle_orange', 'Remédio de Cura', 18, 'bottle_orange.png', { cures: ['lesao'], effects: { health: 14, mood: -3 } }),
  med('md_bottle_pink', 'Remédio Universal', 25, 'bottle_pink.png', { cures: ['gripe', 'prisao', 'nausea', 'lesao'], effects: { health: 12, mood: -4 } }),
  med('md_pills', 'Comprimidos', 20, 'pills.png', { clearBuffs: true, effects: { mood: -5 } }),

  // Bônus (buffs) — todos custam Humor
  med('md_vitamin', 'Pote de Vitaminas', 30, 'vitamin.png', { cures: [], buffs: [['noTired', 300]], effects: { energy: 15, mood: -5 } }),
  med('md_capsule_green', 'Cápsula Verde', 35, 'capsule_green.png', { cures: [], buffs: [['noHunger', 300]], effects: { mood: -4 } }),
  med('md_capsule_blue', 'Cápsula Azul', 35, 'capsule_blue.png', { cures: [], buffs: [['noTired', 300]], effects: { mood: -4 } }),
  med('md_capsule_red', 'Cápsula Vermelha', 35, 'capsule_red.png', { cures: [], buffs: [['shield', 300]], effects: { mood: -4 } }),
  med('md_capsule_purple', 'Cápsula Roxa', 40, 'capsule_purple.png', { cures: [], buffs: [['doubleMood', 300]], effects: { mood: -6 } }),
  med('md_capsule_orange', 'Cápsula Laranja', 35, 'capsule_orange.png', { cures: [], buffs: [['coinMagnet', 300]], effects: { mood: -4 } }),
  med('md_syringe_yellow', 'Seringa Amarela', 45, 'syringe_yellow.png', { cures: [], buffs: [['luck', 300]], effects: { mood: -5 } }),
  med('md_syringe_green', 'Seringa Verde', 45, 'syringe_green.png', { cures: [], buffs: [['noHunger', 600]], effects: { mood: -5 } }),
  med('md_syringe_blue', 'Seringa Azul', 45, 'syringe_blue.png', { cures: [], buffs: [['noTired', 600]], effects: { mood: -5 } }),
  med('md_syringe_red', 'Seringa Vermelha', 45, 'syringe_red.png', { cures: [], buffs: [['shield', 600]], effects: { mood: -5 } }),
];
