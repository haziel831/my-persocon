// Collectible plushies from the Claw Machine. All 15 use real transparent PNGs in
// src/renderer/assets/plushies/ (32×32). To swap art later, just replace the file with the same
// name — ids, save data, shelf slots, rarity and translations stay untouched.

const art = (file) => new URL(`./assets/plushies/${file}`, import.meta.url).href;

const plush = (id, name, rarity, file, favorite = false) => ({
  id, name, rarity, favorite, img: art(file),
});

export const PLUSHIES = [
  plush('ursinho_rosa', 'Ursinho Rosa', 'comum', '01_ursinho_rosa.png'),
  plush('estrela_dourada', 'Estrela Dourada', 'comum', '02_estrela_amarela.png'),
  plush('gatinho_laranja', 'Gatinho Laranja', 'comum', '03_gatinho_laranja.png'),
  plush('coelhinho_lilas', 'Coelhinho Lilás', 'comum', '04_coelhinho_lilas.png'),
  plush('slime_azul', 'Slime Azul', 'comum', '05_slime_azul.png'),
  plush('corvo_gotico', 'Corvo Gótico', 'epica', '06_corvo_gotico.png', true),
  plush('morceguinho_roxo', 'Morceguinho Roxo', 'rara', '07_morceguinho_roxo.png', true),
  plush('polvinho_rosa', 'Polvinho Rosa', 'comum', '08_polvo_rosa.png'),
  plush('fantasminha', 'Fantasminha', 'rara', '09_fantasminha.png', true),
  plush('shiba_inu', 'Shiba Inu', 'comum', '10_shiba_inu.png'),
  plush('panda_vermelho', 'Panda Vermelho', 'rara', '11_panda_vermelho.png'),
  plush('pinguim_cachecol', 'Pinguim de Cachecol', 'rara', '12_pinguim_cachecol.png'),
  plush('corujinha', 'Corujinha', 'rara', '13_corujinha.png'),
  plush('gato_cyber_synthwave', 'Gato Cyber Synthwave', 'epica', '14_gato_cyber_synthwave.png', true),
  plush('dragaozinho_roxo', 'Dragãozinho Roxo', 'epica', '15_dragaozinho_roxo.png', true),
];

export const plushById = (id) => PLUSHIES.find((p) => p.id === id) || null;

// Resolves IDs saved by older builds, short names and filenames with/without .png to the
// definitive plush entry, so a legacy save still draws the right sprite on the shelf.
export function resolvePlush(id) {
  if (!id) return null;
  const raw = String(id).trim().toLowerCase().replace(/\.png$/i, '');
  const mapped = PLUSH_MIGRATION[raw] || raw;
  return PLUSHIES.find((p) =>
    p.id.toLowerCase() === mapped
    || p.name.toLowerCase() === mapped
    || p.img.split('/').pop().toLowerCase().replace(/\.png$/i, '') === mapped) || null;
}

// Old save ids from the placeholder build are folded into the new ids; anything unknown is
// dropped instead of breaking a save.
export const PLUSH_MIGRATION = {
  ursinho: 'ursinho_rosa', estrela: 'estrela_dourada', gatinho: 'gatinho_laranja',
  coelhinho: 'coelhinho_lilas', slime: 'slime_azul', corvo: 'corvo_gotico',
};

// Odds stay here: the claw flow only consumes { ok, plush, rarity, dupe }.
// The Synthwave upgrade favours Raras/Épicas (and a slightly higher catch rate).
export function rollPlush(up = false) {
  if (Math.random() >= (up ? 0.65 : 0.45)) return { ok: false };
  const table = up
    ? [['comum', 0.38], ['rara', 0.4], ['epica', 0.22]]
    : [['comum', 0.74], ['rara', 0.21], ['epica', 0.05]];
  let r = Math.random();
  let rarity = 'comum';
  for (const [rar, weight] of table) {
    if ((r -= weight) <= 0) { rarity = rar; break; }
  }
  const pool = PLUSHIES.filter((p) => p.rarity === rarity);
  return { ok: true, rarity, plush: pool[Math.floor(Math.random() * pool.length)] || PLUSHIES[0] };
}
