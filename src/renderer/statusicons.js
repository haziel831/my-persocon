// Pixel icons for the negative status cards in the status dock (DEBUFFS.art in behavior.js).
// One 14x14 sprite per status, same paint helpers as the item/medicine icons.
import { defineIcons } from './pixel.js';

const FACE_EYES = ({ rect }) => { rect(4, 5, 2, 2, '#1d1a26'); rect(8, 5, 2, 2, '#1d1a26'); };

defineIcons({
  // Pale green face, flat mouth, sweat drop.
  db_gripe: (s) => s(14, 14, ({ rect, px, circle }) => {
    circle(7, 8, 5, '#9fd07a');
    FACE_EYES({ rect });
    rect(5, 11, 4, 1, '#1d1a26');
    rect(11, 0, 2, 3, '#3fa2e8'); px(11, 3, '#3fa2e8');
  }),
  // Drumstick: brown meat, white bone.
  db_fome: (s) => s(14, 14, ({ rect, px, circle }) => {
    circle(6, 5, 4, '#a85a2a');
    circle(5, 4, 2, '#c87a42');
    rect(8, 8, 2, 2, '#c87a42');
    rect(9, 9, 3, 2, '#f6f2e8');
    px(12, 8, '#f6f2e8'); px(12, 11, '#f6f2e8');
  }),
  // Water drop with a shine.
  db_desidratacao: (s) => s(14, 14, ({ rect, px }) => {
    rect(6, 1, 2, 2, '#3fa2e8');
    px(5, 3, '#3fa2e8'); px(8, 3, '#3fa2e8');
    rect(4, 5, 6, 1, '#3fa2e8'); rect(3, 6, 8, 4, '#3fa2e8');
    rect(4, 10, 6, 1, '#3fa2e8'); rect(5, 11, 4, 1, '#3fa2e8');
    px(5, 6, '#a8dcff'); px(5, 7, '#a8dcff'); px(6, 5, '#a8dcff');
  }),
  // Mud blob with splatter around it.
  db_suja: (s) => s(14, 14, ({ px, circle }) => {
    circle(7, 8, 5, '#7a5a34');
    circle(6, 7, 3, '#8f6a42');
    px(2, 3, '#7a5a34'); px(11, 2, '#7a5a34'); px(12, 12, '#7a5a34'); px(1, 10, '#7a5a34');
    px(5, 6, '#5f452a'); px(9, 9, '#5f452a'); px(7, 11, '#5f452a');
  }),
  // Empty battery with one red bar left.
  db_exausta: (s) => s(14, 14, ({ rect }) => {
    rect(1, 4, 11, 7, '#6a6a7a');
    rect(2, 5, 9, 5, '#1d1a26');
    rect(12, 6, 2, 3, '#6a6a7a');
    rect(4, 7, 3, 1, '#e2475a');
  }),
  // Sad blue face with a tear.
  db_abatida: (s) => s(14, 14, ({ rect, px, circle }) => {
    circle(7, 7, 5, '#7fa8d8');
    rect(4, 5, 2, 1, '#1d1a26'); rect(8, 5, 2, 1, '#1d1a26');
    px(5, 10, '#1d1a26'); px(6, 9, '#1d1a26'); px(7, 9, '#1d1a26'); px(8, 9, '#1d1a26'); px(9, 10, '#1d1a26');
    px(9, 7, '#3fa2e8'); px(9, 8, '#3fa2e8'); px(9, 9, '#2a7ab8');
  }),
  // Red face, angry brows, gritted teeth.
  db_estressada: (s) => s(14, 14, ({ rect, px, circle }) => {
    circle(7, 7, 5, '#e2475a');
    px(4, 4, '#1d1a26'); px(5, 5, '#1d1a26'); px(9, 4, '#1d1a26'); px(8, 5, '#1d1a26');
    rect(4, 7, 2, 2, '#1d1a26'); rect(8, 7, 2, 2, '#1d1a26');
    rect(5, 10, 4, 2, '#f6f2e8');
    px(6, 10, '#1d1a26'); px(8, 10, '#1d1a26'); px(7, 11, '#1d1a26');
  }),
  // Swirl rings (constipation).
  db_prisao: (s) => s(14, 14, ({ circle }) => {
    circle(7, 7, 5, '#c88f5a');
    circle(7, 7, 3, '#7a4f28');
    circle(7, 7, 1, '#e0b078');
  }),
  // Green face with a wavy mouth.
  db_nausea: (s) => s(14, 14, ({ rect, px, circle }) => {
    circle(7, 7, 5, '#7ec850');
    rect(4, 5, 2, 1, '#1d1a26'); rect(8, 5, 2, 1, '#1d1a26');
    px(5, 10, '#1d1a26'); px(6, 9, '#1d1a26'); px(7, 10, '#1d1a26'); px(8, 9, '#1d1a26'); px(9, 10, '#1d1a26');
  }),
  // Dull face, half-lidded eyes, "..." trailing (boredom).
  db_tedio: (s) => s(14, 14, ({ rect, px, circle }) => {
    circle(7, 7, 5, '#d8c898');
    rect(4, 5, 2, 1, '#1d1a26'); rect(8, 5, 2, 1, '#1d1a26');
    rect(5, 9, 4, 1, '#1d1a26');
    px(12, 5, '#1d1a26'); px(13, 7, '#1d1a26'); px(12, 9, '#1d1a26');
  }),
  // Bandage with a red cross on the pad.
  db_lesao: (s) => s(14, 14, ({ rect, px }) => {
    rect(1, 6, 12, 3, '#f0b090');
    rect(4, 5, 6, 5, '#f6d8c0');
    rect(4, 5, 6, 1, '#fff6ec');
    px(6, 6, '#d8303c'); px(6, 7, '#d8303c'); px(6, 8, '#d8303c');
    px(5, 7, '#d8303c'); px(7, 7, '#d8303c');
    px(2, 7, '#d89070'); px(11, 7, '#d89070');
  }),
  // Dazed: a purple face with swirling stars around it.
  db_atordoado: (s) => s(14, 14, ({ rect, px, circle }) => {
    circle(7, 8, 5, '#c8a0f0');
    rect(4, 7, 2, 2, '#1d1a26'); rect(8, 7, 2, 2, '#1d1a26');
    rect(5, 11, 4, 1, '#1d1a26');
    px(4, 10, '#1d1a26'); px(10, 10, '#1d1a26');
    // The little stars around the head.
    px(1, 2, '#ffe98a'); px(2, 1, '#ffe98a'); px(3, 2, '#ffe98a'); px(2, 3, '#ffe98a');
    px(11, 2, '#ffe98a'); px(12, 1, '#ffe98a'); px(13, 2, '#ffe98a'); px(12, 3, '#ffe98a');
    px(1, 12, '#ffe98a'); px(2, 11, '#ffe98a'); px(3, 12, '#ffe98a');
  }),
});
