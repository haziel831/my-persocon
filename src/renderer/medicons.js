// Medicine and PowerUp icons, Japanese theme: tonic bottle, sakura bandage, kampo packet, gourd
// flask and omamori charms for the PowerUps.
import { defineIcons } from './pixel.js';

const GOLD = '#f2c23a';
const GOLD_L = '#fff0a0';
const RED = '#d8303c';
const WHITE = '#f6f2e8';

const omamori = (body, light, mark) => (s) => s(14, 16, ({ rect, px }) => {
  px(6, 0, RED); px(7, 0, RED); rect(5, 1, 1, 2, RED); rect(8, 1, 1, 2, RED); rect(6, 2, 2, 1, GOLD);
  rect(3, 3, 8, 1, body); rect(2, 4, 10, 11, body); rect(3, 15, 8, 1, body);
  rect(2, 4, 10, 1, light); rect(2, 4, 1, 11, light);
  rect(3, 6, 8, 1, GOLD); rect(3, 13, 8, 1, GOLD);
  rect(4, 7, 6, 6, '#2a1a20');
  mark({ rect, px });
});

defineIcons({
  med_vitamin: (s) => s(12, 16, ({ rect, px }) => {
    rect(4, 0, 4, 2, GOLD); rect(4, 0, 4, 1, GOLD_L);
    rect(4, 2, 4, 2, '#7a3a12'); rect(3, 4, 6, 1, '#7a3a12'); rect(2, 5, 8, 10, '#8a4214'); rect(3, 15, 6, 1, '#5a2a0c');
    rect(2, 7, 8, 5, WHITE); rect(2, 7, 8, 1, '#3a8ad8'); rect(2, 11, 8, 1, '#3a8ad8');
    rect(4, 8, 4, 3, RED); px(5, 9, WHITE); px(6, 9, WHITE);
    rect(3, 5, 1, 2, '#c8743a'); rect(3, 12, 1, 2, '#c8743a');
  }),
  med_bandage: (s) => s(16, 10, ({ rect, px }) => {
    rect(1, 2, 14, 6, '#f6c8c8'); rect(0, 3, 1, 4, '#f6c8c8'); rect(15, 3, 1, 4, '#f6c8c8');
    rect(5, 1, 6, 8, WHITE); rect(5, 1, 6, 1, '#fff');
    [[2, 4], [13, 5]].forEach(([x, y]) => { px(x, y - 1, '#ff7fa8'); px(x - 1, y, '#ff7fa8'); px(x + 1, y, '#ff7fa8'); px(x, y + 1, '#ff7fa8'); px(x, y, GOLD); });
    px(7, 3, '#e8b8b8'); px(9, 3, '#e8b8b8'); px(7, 6, '#e8b8b8'); px(9, 6, '#e8b8b8'); px(8, 4, '#ff9ab8'); px(8, 5, '#ff9ab8');
  }),
  med_pill: (s) => s(16, 16, ({ rect, px, circle }) => {
    rect(1, 1, 11, 13, WHITE); rect(1, 1, 11, 2, '#e8e0cc'); rect(1, 13, 11, 1, '#d8ccb0');
    rect(3, 4, 7, 7, RED); rect(4, 5, 5, 5, WHITE);
    rect(5, 6, 3, 1, RED); rect(6, 6, 1, 3, RED); rect(5, 8, 3, 1, RED); px(5, 9, RED); px(7, 9, RED);
    circle(12, 12, 3, '#e8433f'); rect(12, 9, 4, 6, '#3ab0e8'); rect(12, 9, 1, 6, '#e8433f'); px(11, 11, '#ffb0a8'); px(13, 10, '#a8e0ff');
  }),
  med_potion: (s) => s(12, 16, ({ rect, circle, px }) => {
    rect(5, 0, 2, 2, '#a0703c'); rect(5, 0, 2, 1, '#c89058');
    circle(6, 4, 2, '#e8a850'); rect(3, 6, 6, 1, RED); px(2, 7, RED); px(2, 8, RED);
    circle(6, 11, 4, '#e8a850'); rect(4, 7, 4, 1, '#e8a850');
    rect(4, 10, 5, 3, '#7ad070'); px(4, 9, '#b8f0a0'); px(7, 3, '#fff0c8'); px(4, 9, '#fff0c8');
    rect(5, 11, 3, 1, '#c8ffb8');
  }),
  med_star: omamori('#e8742a', '#ffa860', ({ rect, px }) => {
    rect(5, 9, 4, 3, WHITE); rect(6, 8, 2, 1, WHITE); rect(5, 11, 4, 1, '#1d1a26'); px(7, 8, '#fff');
  }),
  med_heart: omamori('#e8487a', '#ff8ab0', ({ rect, px }) => {
    rect(5, 8, 2, 1, '#ff5a8a'); rect(8, 8, 2, 1, '#ff5a8a'); rect(5, 9, 5, 2, '#ff5a8a'); rect(6, 11, 3, 1, '#ff5a8a'); px(7, 12, '#ff5a8a'); px(5, 8, '#ffc0d4');
  }),
  med_bolt: omamori('#3a3a8a', '#6a6ad8', ({ rect, px }) => {
    rect(7, 8, 2, 1, GOLD); rect(6, 9, 2, 1, GOLD); rect(5, 10, 4, 1, GOLD); rect(6, 11, 2, 1, GOLD); px(6, 12, GOLD); px(8, 8, GOLD_L);
  }),
  med_shield: omamori('#2a7ad8', '#6ab0ff', ({ rect, px }) => {
    rect(4, 8, 6, 1, RED); rect(5, 9, 1, 4, RED); rect(8, 9, 1, 4, RED); rect(5, 10, 4, 1, RED); px(4, 8, '#ff8a8a');
  }),
  med_clover: omamori('#2a8a3a', '#6ad878', ({ rect, px }) => {
    rect(6, 8, 2, 1, '#3cbc4a'); rect(5, 9, 4, 2, '#3cbc4a'); rect(6, 11, 2, 1, '#3cbc4a');
    px(6, 9, '#b8ffc0'); px(8, 10, '#1a5a22');
  }),
  med_magnet: omamori('#8a2a3a', '#d86070', ({ rect, px }) => {
    rect(5, 8, 1, 4, '#ff5a5a'); rect(8, 8, 1, 4, '#5a8aff'); rect(5, 8, 4, 1, '#c0c8d8');
    px(5, 8, '#ffb0b0'); px(8, 8, '#b0d0ff');
  }),
  med_crown: omamori('#8a6a12', '#f2c23a', ({ rect, px }) => {
    rect(4, 10, 6, 2, GOLD); rect(4, 9, 1, 1, GOLD); rect(6, 8, 2, 2, GOLD); rect(9, 9, 1, 1, GOLD);
    px(5, 10, GOLD_L); px(7, 8, '#fff'); px(8, 10, RED);
  }),
  // Clear / reset: gray charm with an X (test helper from powermeup).
  med_reset: omamori('#5a5a6a', '#9a9ab0', ({ rect, px }) => {
    px(5, 8, WHITE); px(9, 8, WHITE); px(6, 9, WHITE); px(8, 9, WHITE); px(7, 10, WHITE);
    px(6, 11, WHITE); px(8, 11, WHITE); px(5, 12, WHITE); px(9, 12, WHITE);
  }),
});
