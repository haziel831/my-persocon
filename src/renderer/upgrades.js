// Furniture upgrades (right-click → Aperfeiçoar): price, what changes, and the upgraded pixel art.
// The upgraded pictures keep the layout and main colors of the originals (screen, print bed, keys,
// water area), so everything placed over them still lines up. An imported look stays on top.
import { icon, defineIcons } from './pixel.js';

// price: fixed (the printer came for free); otherwise 150% of the shop price.
// size: the piece grows by this much when upgraded (it keeps its own scale and place).
// ratio: height / width of the upgraded picture when it differs from the original.
export const UPGRADES = {
  impressora: { price: 1500, name: 'Impressora 3D Neon', note: 'Visual neon e imprime 1,5x mais rápido', pix: 'printer3d_up' },
  estante: { name: 'Estante Grande', note: 'Maior: 6 prateleiras de 15 espaços (90 mangás ou 42 bonecos)', size: 1.22, ratio: 141 / 111 },
  estante_cartuchos: { name: 'Gaming Shelf Pro', note: 'Maior: 6 prateleiras de 15 espaços (90 cartuchos) e visual neon', size: 1.22, ratio: 141 / 111 },
  gacha: { name: 'Gacha-Machine Neon', note: 'Visual neon, animações mais épicas, mais prêmios e bonecos novos só dela' },
  videogame: { name: 'VideoGame Neon (TV + console)', note: 'Visual neon, TV maior e jogos com gráficos melhores', pix: 'tvset_up', size: 1.3 },
  cama: { name: 'Cama Moderna', note: 'Recupera energia 1,5x mais rápido, sem perder fome nem sede', pix: 'bed_up' },
  escrivaninha: { name: 'Escrivaninha Estúdio Neon', note: 'Treina Inteligência 1,5x mais rápido e recupera Energia enquanto ela estuda ou faz pausas', pix: 'escrivaninha_up', size: 1.1, ratio: 38 / 52 },
  cafeteira: { name: 'Estação Energy Neon', note: 'Máquina maior, cardápio exclusivo de Energy Drinks fictícios e power-ups fortes, todos pela carteira dela', imgAsset: './assets/cafe/espresso_upgrade_1_synthwave.png', size: 1.08, ratio: 1 / 0.94 },
  espresso_barista: { name: 'Espresso Barista Cyber', note: 'Visual synthwave cyber, mesma medida compacta e mesmos cafés exclusivos da máquina', imgAsset: './assets/cafe/espresso_upgrade_2_synthwave_cyber.png', size: 1.08, ratio: 1 / 0.94 },
  camera: { name: 'Câmera Instantânea Pro', note: 'Amplia o Álbum de 20 para 50 fotos e dá um visual cromo/neon', pix: 'camera_up' },
  almofada: { name: 'Almofada de Veludo', note: 'Mais confortável: descanso e humor melhores', pix: 'almofada_up' },
  banheira: { name: 'Cabine de Limpeza Laser', note: 'Cabine synthwave ampliada (2×): limpa mais rápido, dá um pouco de energia e esconde a Persocon atrás da cortina roxa', pix: 'tub_up', size: 2, ratio: 48 / 28 },
  teclado: { name: 'Sintetizador Neon', note: 'Som de sintetizador (mono), playlist de MIDI e timbres', pix: 'teclado_up_back' },
  aquario: { name: 'Aquário de Koi', note: 'Design moderno synthwave, tanque maior e carpas koi grandes e ativas', size: 1.35 },
  slot: { name: 'Slot-Machine Neon', note: 'Visual neon, animações mais épicas e apostas e prêmios maiores' },
  venda_comida: { name: 'Máquina de Comida Neon', note: 'Visual synthwave, compras com holograma e teleporte e comidas exclusivas com buff' },
  venda_bebida: { name: 'Máquina de Bebida Neon', note: 'Visual synthwave, compras com holograma e teleporte e bebidas exclusivas com buff' },
  alvo: { name: 'Arcade de Tiro', note: 'Vira uma máquina de arcade de tiro (maior): ela joga com a pistola de luz', pix: 'arcade_up', size: 1.45, ratio: 46 / 26 },
  boneco_treino: { price: 1200, name: 'Boneco Sucataoxidado', note: 'Robusto: chapas de metal enferrujado, engrenagens e juntas mecânicas · libera o Treino Pesado (luta de verdade)', pix: 'dummy_scrap' },
  balcao_madeira: {
    name: 'Balcão Synthwave', note: 'Visual neon synthwave com a mesma medida e o mesmo tampo de apoio',
    imgAsset: './assets/furniture/balcao_upgrade_1_synthwave.png',
  },
  balcao_cafeteria: {
    name: 'Balcão Cyber', note: 'Visual synthwave cyber com a mesma medida e o mesmo tampo de apoio',
    imgAsset: './assets/furniture/balcao_upgrade_2_synthwave_cyber.png',
  },
  claw: {
    price: 1000, name: 'Máquina de Garra Synthwave',
    note: 'Visual neon, GIFs próprios e mais chance de pegar pelúcia (com mais raras e épicas)',
    imgAsset: './assets/claw/claw_synthwave_static.png', size: 56 / 53, ratio: 92 / 56,
  },
  prateleira_pelucias: {
    name: 'Prateleira Synthwave', note: 'Visual neon com as mesmas 15 posições para as pelúcias',
    imgAsset: './assets/furniture/prateleira_pelucias_upgrade_synthwave.png', ratio: 92 / 82,
  },
  pula_pula: { price: 570, name: 'Pula-pula Synthwave', note: 'Visual synthwave, pulos mais altos e XP de Agilidade x1,5 no pula-pula', pix: 'pula_pula_up' },
};

export const upgradeCost = (id, item) => UPGRADES[id]?.price ?? Math.ceil((item?.price || 0) * 1.5);
export const upSize = (id, t) => (t?.up && UPGRADES[id]?.size) || 1;
export const upRatio = (id, t) => (t?.up && UPGRADES[id]?.ratio) || null;
export const upIcon = (id, t) => {
  const u = t?.up && UPGRADES[id];
  if (!u) return null;
  if (u.imgAsset) return new URL(u.imgAsset, import.meta.url).href;
  return u.pix ? icon(u.pix) : null;
};
// Arcade screen inside arcade_up (fractions of the 26×46 picture). Live canvas sits only here.
export const ARCADE_SCREEN = { x: 4 / 26, y: 10 / 46, w: 18 / 26, h: 13 / 46 };

const NEON = { pink: '#ff3ea5', cyan: '#5ef0ff', violet: '#7a3cff', deep: '#120c24', body: '#1a1030', panel: '#2c2048', sun: '#ff9a3d', gold: '#ffd23f' };

defineIcons({
  // Cartridge case and food backpack, restyled once the 3D printer is upgraded: the cartridges go
  // into a console box (printed console and controller on the front), the food into a cooler box.
  bag_up: (sprite) => sprite(20, 20, ({ rect, px }) => {
    rect(3, 0, 15, 1, '#e2e0ea'); rect(2, 1, 16, 2, '#d6d3e0'); rect(17, 1, 2, 1, '#c2bfd0');
    rect(16, 2, 3, 16, '#a9a6b8'); rect(16, 2, 1, 16, '#bdbacb');
    rect(1, 3, 15, 16, '#ecebf2'); rect(1, 3, 1, 16, '#ffffff');
    rect(1, 3, 15, 3, '#1c1d24'); rect(3, 4, 5, 1, '#ffffff'); px(10, 4, '#e2475a'); px(11, 4, NEON.cyan);
    rect(3, 7, 11, 6, '#2c2e38'); rect(3, 7, 11, 1, '#45485a'); rect(4, 9, 4, 1, '#5b5e70'); px(12, 9, '#7dff8a'); rect(4, 11, 9, 1, '#16171d');
    rect(5, 14, 7, 2, '#3a3d48'); px(6, 14, '#5b5e70'); px(10, 14, '#e2475a'); px(9, 15, NEON.cyan);
    rect(1, 17, 15, 2, '#2a2c34'); px(2, 17, '#ffffff'); rect(10, 17, 5, 1, '#5b5e70');
    rect(1, 19, 18, 1, '#6e6b7c');
  }),
  backpack_up: (sprite) => sprite(20, 22, ({ rect, px }) => {
    rect(6, 1, 8, 1, '#c9ced8'); rect(5, 2, 1, 3, '#c9ced8'); rect(14, 2, 1, 3, '#c9ced8'); rect(6, 1, 8, 1, '#dfe3ea');
    rect(1, 5, 18, 4, '#f2f4f8'); rect(2, 5, 16, 1, '#ffffff'); rect(1, 8, 18, 1, '#c9ced8');
    rect(1, 9, 18, 11, '#2f74d0'); rect(2, 10, 1, 9, '#5a96e8'); rect(17, 10, 1, 9, '#2560b0'); rect(1, 19, 18, 1, '#1f4f98');
    rect(8, 7, 4, 4, '#c9ced8'); rect(9, 8, 2, 2, '#8a909e');
    rect(5, 13, 10, 4, '#f2f4f8'); rect(6, 14, 3, 2, '#e2475a'); rect(10, 14, 4, 1, '#2f74d0'); rect(10, 15, 3, 1, '#2f74d0');
    rect(2, 20, 3, 1, '#1a1b22'); rect(15, 20, 3, 1, '#1a1b22');
  }),
  // Same posts/bed/area as printer3d (PRINT_AREA): its grey chassis with neon strips and a display.
  printer3d_up: (sprite) => sprite(28, 28, ({ rect, px }) => {
    rect(1, 1, 26, 3, '#4a4d5e'); rect(1, 1, 26, 1, '#6b6f84'); rect(4, 3, 20, 1, NEON.pink); rect(11, 2, 6, 1, NEON.cyan);
    rect(2, 4, 3, 18, '#5b5e70'); rect(23, 4, 3, 18, '#5b5e70'); rect(3, 4, 1, 18, NEON.cyan); rect(24, 4, 1, 18, NEON.pink);
    rect(5, 21, 18, 1, NEON.pink); rect(6, 22, 16, 1, NEON.cyan);
    rect(0, 22, 28, 6, '#2c2e38'); rect(0, 22, 28, 1, '#45485a');
    rect(3, 24, 9, 3, '#12141a'); rect(4, 25, 2, 1, NEON.pink); rect(6, 25, 2, 1, NEON.sun); rect(8, 25, 3, 1, NEON.cyan);
    rect(20, 24, 2, 2, NEON.cyan); rect(23, 24, 2, 2, NEON.pink); px(14, 25, NEON.gold); px(16, 25, NEON.gold);
    rect(1, 27, 26, 1, NEON.violet);
  }),
  // Neon studio desk: same footprint as the wooden one, lit lamp variant for night/focus.
  escrivaninha_up: (sprite) => sprite(28, 28, ({ rect, px }) => {
    rect(1, 7, 26, 3, NEON.violet); rect(1, 7, 26, 1, NEON.cyan);
    rect(3, 10, 3, 15, '#2c2048'); rect(22, 10, 3, 15, '#2c2048'); px(3, 10, NEON.pink); px(24, 10, NEON.pink);
    rect(2, 22, 24, 3, NEON.deep); rect(2, 24, 24, 1, NEON.pink);
    rect(7, 2, 13, 5, '#120c24'); rect(8, 3, 11, 3, NEON.deep); rect(9, 4, 9, 1, NEON.cyan);
    rect(4, 10, 8, 2, '#2c2048'); rect(5, 11, 6, 1, NEON.cyan);
    rect(18, 1, 1, 6, '#5b5e70'); rect(16, 6, 5, 1, NEON.pink);
    rect(17, 7, 3, 1, '#6b6f84');
  }),
  escrivaninha_up_lamp: (sprite) => sprite(28, 28, ({ rect, px }) => {
    rect(1, 7, 26, 3, NEON.violet); rect(1, 7, 26, 1, NEON.cyan);
    rect(3, 10, 3, 15, '#2c2048'); rect(22, 10, 3, 15, '#2c2048'); px(3, 10, NEON.pink); px(24, 10, NEON.pink);
    rect(2, 22, 24, 3, NEON.deep); rect(2, 24, 24, 1, NEON.pink);
    rect(7, 2, 13, 5, '#120c24'); rect(8, 3, 11, 3, NEON.deep); rect(9, 4, 9, 1, NEON.cyan);
    rect(4, 10, 8, 2, '#2c2048'); rect(5, 11, 6, 1, NEON.cyan);
    rect(18, 1, 1, 6, '#5b5e70'); rect(16, 6, 5, 1, NEON.pink);
    rect(17, 7, 3, 1, NEON.gold);
    rect(13, 8, 10, 8, 'rgba(255,210,63,0.35)'); rect(15, 9, 6, 5, '#fff4c8');
    px(12, 8, NEON.sun); px(24, 8, NEON.sun); px(18, 8, '#ffffff');
  }),
  // Synthwave trampoline: chrome springs, neon grid mat and a half-sun rising over the frame.
  pula_pula_up: (sprite) => sprite(32, 12, ({ rect, px, circle }) => {
    // half-sun (rising) centered on the mat
    rect(13, 0, 6, 1, NEON.sun); rect(11, 1, 10, 1, '#ffb85c'); rect(11, 2, 10, 1, NEON.gold);
    px(13, 1, NEON.sun); px(18, 1, NEON.sun);
    // legs: dark chrome with neon edges
    rect(3, 7, 2, 5, NEON.deep); rect(15, 7, 2, 5, NEON.deep); rect(27, 7, 2, 5, NEON.deep);
    px(3, 7, NEON.cyan); px(15, 7, NEON.cyan); px(27, 7, NEON.cyan);
    px(4, 11, NEON.pink); px(16, 11, NEON.pink); px(28, 11, NEON.pink);
    // frame body: deep purple with cyan rail on top and magenta rail below
    rect(0, 4, 32, 3, '#241533'); rect(0, 4, 32, 1, NEON.cyan); rect(0, 6, 32, 1, NEON.pink);
    // mat: perspective grid (vertical neon bars over a near-black field)
    rect(2, 2, 28, 2, NEON.deep);
    rect(4, 2, 1, 2, NEON.violet); rect(10, 2, 1, 2, NEON.violet); rect(16, 2, 1, 2, NEON.violet); rect(22, 2, 1, 2, NEON.violet); rect(28, 2, 1, 2, NEON.violet);
    rect(2, 3, 28, 1, '#150b26');
    // springs: gold dots along the body
    for (const x of [2, 7, 12, 17, 22, 27]) px(x, 5, NEON.gold);
    // side bolts
    px(0, 5, NEON.cyan); px(31, 5, NEON.pink);
  }),
  // Modern platform bed: graphite frame, upholstered tufted headboard, white sheets, slate duvet
  // folded at the top and a single cyan LED strip glowing under the base.
  bed_up: (sprite) => sprite(34, 18, ({ rect, px }) => {
    rect(0, 0, 5, 16, '#2a2c34'); rect(0, 0, 5, 1, '#3a3d48'); rect(1, 1, 3, 13, '#5b6070'); rect(1, 1, 3, 1, '#6e7484');
    for (const y of [4, 7, 10]) { px(2, y, '#454a58'); px(2, y - 1, '#6e7484'); }
    rect(31, 9, 3, 7, '#2a2c34'); rect(31, 9, 3, 1, '#3a3d48');
    rect(4, 9, 28, 4, '#eceff4'); rect(4, 9, 28, 1, '#ffffff');
    rect(5, 6, 7, 4, '#f6f7fa'); rect(5, 9, 7, 1, '#c9ced8'); px(6, 7, '#ffffff');
    rect(13, 7, 19, 6, '#34405a'); rect(13, 7, 19, 1, '#46536f'); rect(16, 12, 16, 1, '#2a3349');
    rect(13, 8, 3, 5, '#eceff4'); rect(13, 8, 3, 1, '#ffffff');
    rect(3, 13, 30, 3, '#2a2c34'); rect(3, 13, 30, 1, '#3a3d48');
    rect(5, 16, 26, 1, NEON.cyan); rect(7, 17, 22, 1, '#1d3a48');
  }),
  // Tufted velvet cushion in its purple, with gold piping.
  almofada_up: (sprite) => sprite(22, 9, ({ rect, px }) => {
    rect(2, 0, 18, 9, '#6a4ce8'); rect(0, 2, 22, 7, '#6a4ce8'); rect(1, 1, 20, 8, '#6a4ce8');
    rect(2, 1, 18, 2, '#9a85ff'); rect(1, 7, 20, 2, '#4a34b8');
    rect(1, 6, 20, 1, NEON.gold);
    for (const x of [5, 11, 16]) { px(x, 4, '#4a34b8'); px(x, 3, '#b8a8ff'); }
  }),
  // Slim TV in its grey (same screen rectangle as tvset) and the silver console with a neon stripe.
  tvset_up: (sprite) => sprite(30, 30, ({ rect, px }) => {
    rect(1, 4, 28, 19, '#3b3b46'); rect(1, 4, 28, 1, NEON.cyan); rect(1, 22, 28, 1, NEON.pink);
    rect(2, 5, 26, 17, '#2a2a33');
    rect(3, 6, 24, 15, '#050507');
    rect(13, 23, 4, 2, '#2a2a33'); rect(10, 24, 10, 1, '#555560');
    rect(4, 25, 22, 5, '#c9c6c0'); rect(4, 25, 22, 1, '#e4e2de'); rect(4, 27, 22, 1, NEON.violet);
    rect(7, 28, 4, 1, '#d33c3c'); rect(19, 26, 4, 2, '#333'); px(23, 28, NEON.cyan); px(24, 28, NEON.pink);
  }),
  // Laser cleaning stall: dark frame with neon edges, emitters on top and a frosted glass door
  // (she stands behind it, only a shadow shows through).
  tub_up: (sprite) => sprite(28, 48, ({ rect, px }) => {
    rect(0, 0, 28, 5, NEON.body); rect(0, 0, 28, 1, NEON.cyan); rect(2, 2, 24, 2, NEON.deep);
    for (let x = 4; x < 24; x += 5) { rect(x, 2, 3, 2, NEON.panel); px(x + 1, 3, x % 2 ? NEON.pink : NEON.cyan); }
    rect(0, 5, 3, 39, NEON.body); rect(25, 5, 3, 39, NEON.body); rect(2, 5, 1, 39, NEON.cyan); rect(25, 5, 1, 39, NEON.pink);
    rect(3, 5, 22, 39, 'rgba(170,220,255,0.82)');
    for (let y = 8; y < 42; y += 6) rect(3, y, 22, 1, 'rgba(255,255,255,0.35)');
    rect(4, 6, 2, 36, 'rgba(255,255,255,0.45)'); rect(13, 5, 1, 39, 'rgba(90,120,170,0.6)');
    rect(15, 22, 1, 6, '#c8ccd8'); rect(20, 12, 3, 4, NEON.deep); px(21, 13, NEON.cyan); px(21, 14, NEON.pink);
    rect(0, 44, 28, 4, NEON.body); rect(0, 44, 28, 1, NEON.panel); rect(2, 46, 24, 1, NEON.cyan); rect(3, 47, 22, 1, NEON.pink);
  }),
  // Keyboards seen from behind (she plays facing us): the back panel, the key tops peeking out.
  teclado_up_back: (sprite) => sprite(34, 20, ({ rect, px }) => {
    for (let k = 0; k < 10; k++) { px(Math.round(8 + k * 1.8), 10 + k, '#a8acc8'); px(Math.round(25 - k * 1.8), 10 + k, '#a8acc8'); }
    rect(6, 19, 4, 1, '#5a5a70'); rect(24, 19, 4, 1, '#5a5a70');
    rect(3, 0, 28, 1, '#f4f1ea');
    rect(0, 1, 34, 9, '#140c26'); rect(0, 1, 34, 1, NEON.pink); rect(0, 9, 34, 1, NEON.cyan);
    for (let x = 12; x <= 22; x += 2) rect(x, 4, 1, 3, NEON.panel);
    rect(3, 4, 6, 1, NEON.pink); rect(3, 6, 6, 1, NEON.cyan); px(5, 5, NEON.violet);
    [[25, NEON.cyan], [27, NEON.pink], [29, NEON.gold]].forEach(([x, c]) => { px(x, 5, c); px(x, 6, '#0a0618'); });
  }),
  // Arcade alt1 (16-bit): red cab, cyan side rails, pink marquee, dark screen hole for live canvas.
  arcade_up: (sprite) => sprite(26, 46, ({ rect, px, circle }) => {
    rect(0, 7, 26, 37, '#d03038'); rect(0, 7, 2, 37, '#901820'); rect(24, 7, 2, 37, '#901820');
    rect(0, 7, 1, 37, NEON.pink); rect(25, 7, 1, 37, NEON.cyan);
    rect(1, 0, 24, 7, '#14101e'); rect(1, 0, 24, 1, NEON.pink); rect(1, 6, 24, 1, NEON.cyan);
    circle(13, 3, 2, '#f4f0e8'); circle(13, 3, 1, '#e03030'); px(13, 3, NEON.gold);
    for (let i = 0; i < 10; i++) px(3 + i * 2, 1, i % 2 ? NEON.pink : NEON.cyan);
    // Bezel around the live screen (ARCADE_SCREEN = 4,10,18,13).
    rect(3, 9, 20, 15, NEON.deep); rect(4, 10, 18, 13, '#0a0a1a');
    rect(2, 25, 22, 5, '#2a2a38'); rect(2, 25, 22, 1, '#484860');
    rect(4, 26, 5, 2, NEON.cyan); px(7, 28, NEON.cyan);
    rect(17, 26, 5, 2, NEON.pink); px(18, 28, NEON.pink);
    px(12, 27, NEON.gold); px(14, 27, '#ffffff');
    rect(2, 30, 22, 1, '#f0ece4');
    rect(9, 32, 8, 9, '#1c1824'); rect(10, 33, 2, 3, NEON.pink); rect(14, 33, 2, 3, NEON.pink); rect(11, 38, 4, 1, '#5a5868');
    rect(0, 44, 26, 2, '#242430'); rect(2, 45, 22, 1, NEON.pink);
  }),
  aquario_up: (sprite) => sprite(32, 26, (p) => koiTank(p, true)),
  aquario_tank_up: (sprite) => sprite(32, 26, (p) => koiTank(p, false)),
});

// Same slate frame, blue water and wood cabinet as the old tank, made modern and synthwave: LED
// bar, a water that fades to violet, a neon grid floor, glowing plants and neon strips.
function koiTank({ rect, px }, fish) {
  rect(2, 20, 28, 6, '#5a3818'); rect(2, 20, 28, 1, NEON.pink); rect(14, 22, 4, 2, '#3a2410'); rect(2, 25, 28, 1, NEON.cyan);
  rect(0, 1, 32, 19, '#2b3a4a'); rect(0, 1, 32, 1, '#1d2a36');
  rect(2, 0, 28, 1, '#1d2a36'); rect(3, 1, 26, 1, NEON.cyan);
  rect(1, 3, 30, 16, '#3fa9d8'); rect(1, 3, 30, 1, '#7fd0f0');
  rect(1, 9, 30, 3, '#4a90e0'); rect(1, 12, 30, 3, '#5a78e0');
  rect(1, 15, 30, 4, NEON.body);
  for (let x = 2; x < 31; x += 4) rect(x, 15, 1, 4, '#5a1f7a');
  rect(1, 15, 30, 1, NEON.pink); rect(1, 17, 30, 1, '#5a1f7a');
  rect(18, 12, 5, 3, '#3a2a5a'); rect(19, 11, 3, 1, '#5a4a8a'); rect(7, 13, 3, 2, '#3a2a5a');
  rect(3, 7, 1, 8, '#2fd08a'); rect(4, 9, 1, 6, NEON.cyan); rect(26, 6, 1, 9, '#2fd08a'); rect(27, 9, 1, 6, NEON.cyan); rect(28, 11, 1, 4, '#2fd08a');
  if (fish) {
    rect(8, 6, 6, 2, '#f4f1ea'); rect(9, 6, 2, 1, '#e23b3b'); rect(12, 7, 1, 1, '#e23b3b'); rect(14, 5, 1, 4, '#f4f1ea'); px(8, 6, '#1d1a26');
    rect(18, 9, 6, 2, '#ff8a3d'); rect(20, 9, 2, 1, '#f4f1ea'); rect(17, 8, 1, 4, '#ff8a3d'); px(23, 9, '#1d1a26');
  }
}

// Koi look for the live tank: [body, patch, fin].
export const KOI = [
  ['#f4f1ea', '#e23b3b', '#ffd8d0'], ['#ff8a3d', '#f4f1ea', '#ffb07a'], ['#ffd23f', '#ff8a3d', '#fff1b0'],
  ['#1d1a26', '#ff8a3d', '#3a3446'], ['#f4f1ea', '#1d1a26', '#d8dce6'],
];
