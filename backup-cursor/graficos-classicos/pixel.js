// Pixel-art icons drawn from simple shapes. By default they come out at double resolution with
// smoothed diagonals (Scale2x), light from the top-left, a soft volume gradient and a thin outline.

// light: false skips the baked top-left lighting (for things that rotate, like the balls).
function sprite(w, h, paint, outline = '#1d1a26', hd = true, light = true) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  const rect = (x, y, rw, rh, color) => {
    g.fillStyle = color;
    g.fillRect(x, y, rw, rh);
  };
  const px = (x, y, color) => rect(x, y, 1, 1, color);
  const circle = (cx, cy, r, color) => {
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.6) px(cx + x, cy + y, color);
  };
  paint({ rect, px, circle });
  if (hd && !emoteTheme) return detail(g, w, h, outline, light);
  if (outline) {
    const d = g.getImageData(0, 0, w, h);
    const a = (x, y) => x >= 0 && y >= 0 && x < w && y < h && d.data[(y * w + x) * 4 + 3] > 0;
    const edge = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (!a(x, y) && (a(x - 1, y) || a(x + 1, y) || a(x, y - 1) || a(x, y + 1))) edge.push([x, y]);
    g.fillStyle = outline;
    for (const [x, y] of edge) g.fillRect(x, y, 1, 1);
  }
  if (emoteTheme) recolor(g, w, h);
  return c.toDataURL('image/png');
}

function detail(g, w, h, outline, light = true) {
  const src = new Uint32Array(g.getImageData(0, 0, w, h).data.buffer);
  const W = w * 2;
  const H = h * 2;
  const big = new Uint32Array(W * H);
  const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : src[y * w + x]);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = src[y * w + x];
      const A = at(x, y - 1);
      const B = at(x + 1, y);
      const C = at(x - 1, y);
      const D = at(x, y + 1);
      const i = y * 2 * W + x * 2;
      big[i] = C === A && C !== D && A !== B ? A : p;
      big[i + 1] = A === B && A !== C && B !== D ? B : p;
      big[i + W] = D === C && D !== B && C !== A ? C : p;
      big[i + W + 1] = B === D && B !== A && D !== C ? D : p;
    }
  }
  const out = new Uint8ClampedArray(W * H * 4);
  const bytes = new Uint8Array(big.buffer);
  const get = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? 0 : big[y * W + x]);
  const solid = (v) => v >>> 24 > 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const p = big[i];
      const o = i * 4;
      if (!solid(p)) continue;
      const up = get(x, y - 1);
      const down = get(x, y + 1);
      const left = get(x - 1, y);
      const right = get(x + 1, y);
      // Light from the top-left: rim highlight on top/left edges, shade on bottom/right ones
      // (skipped on 1-px lines so thin details keep their color).
      let k = 0.06 - (y / H) * 0.12;
      if (!light) k = 0;
      else if (up !== p && down === p) k += 0.2;
      else if (down !== p && up === p) k -= 0.2;
      else if (left !== p && right === p) k += 0.08;
      else if (right !== p && left === p) k -= 0.1;
      for (let ch = 0; ch < 3; ch++) {
        const v = bytes[o + ch];
        out[o + ch] = k >= 0 ? v + (255 - v) * k : v * (1 + k);
      }
      out[o + 3] = bytes[o + 3];
    }
  }
  if (outline) {
    const [or, og, ob] = hexRgb(outline);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (solid(big[y * W + x])) continue;
        const n = [get(x - 1, y), get(x + 1, y), get(x, y - 1), get(x, y + 1)].find(solid);
        if (n === undefined) continue;
        // Colored outline: the outline color mixed with a dark version of the neighbor.
        const o = (y * W + x) * 4;
        out[o] = or * 0.6 + (n & 255) * 0.18;
        out[o + 1] = og * 0.6 + ((n >> 8) & 255) * 0.18;
        out[o + 2] = ob * 0.6 + ((n >> 16) & 255) * 0.18;
        out[o + 3] = 255;
      }
    }
  }
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  c.getContext('2d').putImageData(new ImageData(out, W, H), 0, 0);
  return c.toDataURL('image/png');
}

function hexRgb(hex) {
  const s = String(hex).replace('#', '');
  const n = parseInt(s.length === 3 ? s.split('').map((ch) => ch + ch).join('') : s, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const SKIN = '#f6cfa6';
const SKIN_D = '#dca57a';

const DEFS = {
  // 32x32 open hand (petting), sleeve at the bottom.
  hand: () => sprite(32, 32, ({ rect }) => {
    rect(8, 13, 16, 12, SKIN);
    [[8, 5, 8], [12, 3, 10], [16, 4, 9], [20, 6, 7]].forEach(([x, y, hgt]) => rect(x, y, 3, hgt + 2, SKIN));
    rect(3, 15, 6, 4, SKIN);
    rect(5, 19, 4, 3, SKIN);
    rect(22, 13, 2, 12, SKIN_D);
    [[10, 6], [14, 4], [18, 5], [22, 7]].forEach(([x, y]) => rect(x, y, 1, 7, SKIN_D));
    rect(8, 24, 16, 1, SKIN_D);
    rect(9, 25, 14, 6, '#5b7bd5');
    rect(9, 25, 14, 1, '#8ea6ee');
  }),
  bell: () => sprite(14, 16, ({ rect, circle, px }) => {
    rect(6, 0, 2, 2, '#d33c4e');
    circle(7, 7, 5, '#f4c542');
    rect(2, 7, 11, 5, '#f4c542');
    rect(1, 11, 13, 2, '#e09b26');
    rect(4, 4, 2, 4, '#fff1a8');
    circle(7, 13, 1, '#8a5a12');
    px(10, 9, '#e09b26');
  }),
  heart: () => sprite(13, 12, ({ circle, rect }) => {
    circle(3, 3, 3, '#ef4b6a');
    circle(9, 3, 3, '#ef4b6a');
    for (let i = 0; i < 6; i++) rect(i, 3 + i, 13 - i * 2, 1, '#ef4b6a');
    rect(2, 2, 2, 2, '#ffb3c3');
  }),
  // Round soccer ball, 17x17 (centered, so it spins in place). Unlit: the ball adds its own shading.
  ball: () => sprite(17, 17, ({ circle, rect, px }) => {
    circle(8, 8, 7, '#f4f1ea');
    rect(7, 7, 3, 3, '#2b2b36');
    px(8, 6, '#2b2b36');
    px(8, 10, '#2b2b36');
    rect(2, 5, 2, 3, '#2b2b36');
    rect(13, 5, 2, 3, '#2b2b36');
    rect(4, 12, 3, 2, '#2b2b36');
    rect(10, 12, 3, 2, '#2b2b36');
    rect(7, 1, 3, 1, '#2b2b36');
  }, undefined, true, false),
  // Bamboo sword (shinai), vertical, 6x28.
  sword: () => sprite(6, 28, ({ rect }) => {
    rect(2, 0, 2, 19, '#d9c27a');
    rect(2, 0, 1, 19, '#efe0a6');
    [4, 9, 14].forEach((y) => rect(2, y, 2, 1, '#9c8442'));
    rect(0, 19, 6, 2, '#5b3b24');
    rect(2, 21, 2, 7, '#e8e2d4');
    rect(2, 24, 2, 1, '#b8382f');
  }),
  // Hookshot (Ocarina of Time look): grey barrel, red grip, brown handle, 18x10.
  // Ocarina of Time hookshot: dark iron barrel, maroon body with brass bands, grip below, 26x14.
  hook: () => sprite(26, 14, ({ rect, px }) => {
    rect(2, 4, 9, 6, '#7a2230');
    rect(2, 4, 9, 1, '#a8394a');
    rect(3, 9, 8, 1, '#4d1420');
    rect(11, 5, 11, 4, '#3d4150');
    rect(11, 5, 11, 1, '#6b7186');
    rect(4, 4, 1, 6, '#d9a93a');
    rect(9, 4, 1, 6, '#d9a93a');
    rect(21, 4, 2, 6, '#d9a93a');
    rect(23, 5, 2, 4, '#c7ccd9');
    px(25, 6, '#fff');
    px(25, 7, '#fff');
    rect(4, 10, 4, 4, '#4a2e1a');
    rect(4, 10, 4, 1, '#6e4a2c');
    rect(0, 5, 2, 4, '#d9a93a');
    rect(12, 3, 3, 2, '#3d4150');
  }),
  // Spear-like tip with two side barbs.
  hooktip: () => sprite(12, 11, ({ rect, px }) => {
    rect(0, 4, 4, 3, '#3d4150');
    rect(3, 3, 2, 5, '#d9a93a');
    rect(5, 4, 4, 3, '#dfe4ee');
    rect(9, 5, 2, 1, '#fff');
    px(11, 5, '#fff');
    rect(5, 1, 2, 3, '#aab1c2');
    rect(5, 7, 2, 3, '#aab1c2');
    px(4, 0, '#aab1c2');
    px(4, 10, '#aab1c2');
  }),
  chain: () => sprite(8, 4, ({ rect }) => {
    rect(0, 1, 3, 2, '#6b7186');
    rect(4, 0, 3, 4, '#a9b0c0');
    rect(5, 1, 1, 2, 'rgba(0,0,0,0)');
  }, null),
  heartbreak: () => sprite(13, 12, ({ circle, rect }) => {
    circle(3, 3, 3, '#1a1420');
    circle(9, 3, 3, '#1a1420');
    for (let i = 0; i < 6; i++) rect(i, 3 + i, 13 - i * 2, 1, '#1a1420');
    for (let y = 0; y < 11; y++) rect(6 + ((y >> 1) % 2 ? 1 : -1) * (y % 2), y, 1, 1, 'rgba(0,0,0,0)');
    rect(6, 1, 1, 10, '#8a2b3c');
    rect(2, 2, 1, 1, '#4a4058');
  }),
  mic: () => sprite(8, 18, ({ rect, circle }) => {
    circle(4, 3, 3, '#9aa3b5');
    rect(2, 2, 5, 1, '#5d6475');
    rect(2, 4, 5, 1, '#5d6475');
    rect(3, 7, 3, 11, '#2b2b36');
    rect(3, 7, 1, 11, '#4d4d5c');
    rect(2, 7, 5, 1, '#d9a93a');
  }),
  popcorn: () => sprite(14, 16, ({ rect, circle }) => {
    rect(3, 6, 8, 10, '#e63c3c');
    [4, 7, 10].forEach((x) => rect(x, 6, 1, 10, '#fff'));
    [[4, 4], [7, 3], [10, 4], [5, 2], [9, 1], [7, 5]].forEach(([x, y]) => circle(x, y, 2, '#fff4c8'));
    rect(2, 6, 10, 1, '#b82a2a');
  }),
  soda: () => sprite(10, 16, ({ rect }) => {
    rect(1, 3, 8, 13, '#3c7be0');
    rect(1, 3, 8, 1, '#7aa8f0');
    rect(2, 7, 6, 4, '#fff');
    rect(3, 8, 4, 2, '#e63c3c');
    rect(6, 0, 1, 4, '#f4f1ea');
    rect(6, 0, 3, 1, '#f4f1ea');
  }),
  // Generic cardboard box: any purchase while it is being carried to be put away.
  box: () => sprite(16, 13, ({ rect }) => {
    rect(0, 3, 16, 10, '#b5824a');
    rect(0, 3, 16, 1, '#6e4a25');
    rect(0, 12, 16, 1, '#6e4a25');
    rect(0, 3, 1, 10, '#6e4a25');
    rect(15, 3, 1, 10, '#6e4a25');
    rect(1, 0, 6, 3, '#c99560');
    rect(9, 0, 6, 3, '#c99560');
    rect(1, 0, 6, 1, '#6e4a25');
    rect(9, 0, 6, 1, '#6e4a25');
    rect(7, 4, 2, 8, '#d9c27a');
    rect(1, 4, 6, 1, '#cc9a63');
    rect(9, 4, 6, 1, '#cc9a63');
    rect(10, 8, 4, 2, '#f1ead8');
    rect(10, 8, 4, 1, '#8b6a44');
  }),
  // Free food: a dented plate of leftovers, and a plain glass of tap water.
  leftovers: () => sprite(16, 10, ({ rect, circle }) => {
    rect(0, 7, 16, 2, '#cfd3d8');
    rect(2, 9, 12, 1, '#9aa0a8');
    circle(5, 5, 3, '#a67c4e');
    circle(10, 6, 2, '#7d8c3a');
    rect(8, 3, 4, 2, '#d8c79a');
    rect(3, 3, 1, 1, '#5b4a36');
    rect(12, 4, 1, 1, '#5b4a36');
    rect(13, 7, 2, 1, '#e8eaee');
  }),
  tapwater: () => sprite(10, 14, ({ rect }) => {
    rect(1, 0, 8, 14, 'rgba(220,235,245,0.55)');
    rect(2, 5, 6, 8, '#9fc6e0');
    rect(2, 5, 6, 1, '#c8e2f2');
    rect(3, 7, 1, 4, '#d8edf8');
    rect(1, 13, 8, 1, '#8aa2b4');
  }),
  // Food backpack left on the desktop (the pet takes food, drinks and medicine from it).
  backpack: () => sprite(18, 20, ({ rect }) => {
    rect(6, 0, 6, 2, '#3f6b3a');
    rect(2, 2, 14, 18, '#5f9a4f');
    rect(2, 2, 14, 7, '#78b764');
    rect(4, 11, 10, 7, '#4f8442');
    rect(8, 7, 2, 3, '#f4c542');
    rect(5, 13, 3, 3, '#e8433f');
    rect(10, 13, 3, 3, '#cfe9ff');
  }),
  // Bindle on a stick (the pet leaving).
  bindle: () => sprite(20, 20, ({ rect, circle }) => {
    for (let i = 0; i < 16; i++) rect(2 + i, 18 - i, 2, 1, '#8a5a2b');
    circle(15, 5, 4, '#d33c4e');
    rect(12, 4, 2, 1, '#fff');
    rect(16, 6, 1, 1, '#fff');
  }),
  note: () => sprite(10, 13, ({ rect, circle }) => {
    rect(6, 0, 2, 10, '#fff');
    rect(6, 0, 4, 2, '#fff');
    rect(8, 2, 2, 2, '#fff');
    circle(4, 10, 2, '#fff');
  }, null),
  cup: () => sprite(12, 14, ({ rect }) => {
    rect(8, 0, 1, 5, '#e94b6a');
    rect(1, 4, 10, 9, '#cfe9ff');
    rect(2, 6, 8, 6, '#7bd35a');
    rect(2, 6, 2, 6, '#a8ec8c');
  }),
  food: () => sprite(14, 13, ({ rect }) => {
    for (let i = 0; i < 7; i++) rect(6 - i, i + 1, 2 + i * 2, 1, '#f7f4ea');
    rect(0, 8, 14, 4, '#f7f4ea');
    rect(4, 8, 6, 4, '#1f3b2c');
  }),
  gameboy: () => sprite(12, 16, ({ rect }) => {
    rect(1, 0, 10, 16, '#c9c6cf');
    rect(2, 2, 8, 6, '#5b5a6a');
    rect(3, 3, 6, 4, '#9bbc0f');
    rect(2, 10, 3, 1, '#2b2b36');
    rect(3, 9, 1, 3, '#2b2b36');
    rect(7, 10, 2, 2, '#a0233b');
    rect(9, 9, 1, 1, '#a0233b');
  }),
  vitamin: () => sprite(12, 12, ({ circle, rect }) => {
    circle(6, 6, 5, '#ffa53a');
    rect(4, 4, 1, 3, '#fff');
    rect(5, 7, 2, 1, '#fff');
    rect(7, 4, 1, 3, '#fff');
  }),
  pill: () => sprite(14, 8, ({ circle, rect }) => {
    circle(3, 4, 3, '#e8433f');
    circle(10, 4, 3, '#f4f1ea');
    rect(3, 1, 4, 7, '#e8433f');
    rect(7, 1, 4, 7, '#f4f1ea');
    rect(3, 2, 3, 1, '#ff9a96');
  }),
  potion: () => sprite(12, 15, ({ rect, circle }) => {
    rect(4, 0, 4, 2, '#a0703c');
    rect(5, 2, 2, 3, '#cfe9ff');
    circle(6, 9, 5, '#cfe9ff');
    circle(6, 10, 4, '#d33c8e');
    rect(3, 8, 2, 2, '#ffb3e0');
  }),
  crystal: () => sprite(12, 16, ({ rect }) => {
    [[5, 0, 2], [4, 1, 4], [3, 2, 6], [2, 3, 8], [1, 4, 10], [1, 5, 10], [1, 6, 10], [1, 7, 10], [2, 8, 8], [2, 9, 8], [3, 10, 6], [3, 11, 6], [4, 12, 4], [4, 13, 4], [5, 14, 2], [5, 15, 2]]
      .forEach(([x, y, w]) => rect(x, y, w, 1, '#8b4fe0'));
    [[5, 1, 1], [4, 2, 2], [3, 3, 2], [2, 4, 2], [2, 5, 2], [2, 6, 2], [3, 8, 1], [3, 9, 1]].forEach(([x, y, w]) => rect(x, y, w, 1, '#d6b8ff'));
    rect(6, 2, 1, 12, '#b083ff');
    rect(8, 6, 2, 3, '#5d2fa8');
    rect(3, 4, 1, 1, '#ffffff');
  }),
  elixir: () => sprite(12, 16, ({ rect, circle }) => {
    rect(4, 0, 4, 2, '#7a4a1c');
    rect(5, 2, 2, 3, '#fff3c4');
    circle(6, 10, 5, '#fff3c4');
    circle(6, 11, 4, '#f2b51d');
    rect(4, 9, 4, 1, '#ffe27a');
    rect(3, 10, 1, 2, '#fff8dc');
    rect(6, 12, 1, 1, '#fff8dc');
  }),
  hourglass: () => sprite(12, 16, ({ rect }) => {
    rect(0, 0, 12, 2, '#8a5a2c');
    rect(0, 14, 12, 2, '#8a5a2c');
    [[1, 2, 10], [2, 4, 8], [3, 6, 6], [5, 7, 2], [3, 8, 6], [2, 10, 8], [1, 12, 10]].forEach(([x, y, w], i) => rect(x, y, w, i === 3 ? 1 : 2, '#cfeeff'));
    rect(3, 4, 6, 2, '#e8c35a');
    rect(5, 6, 2, 3, '#e8c35a');
    rect(3, 11, 6, 3, '#e8c35a');
  }),
  clover: () => sprite(14, 16, ({ rect, circle }) => {
    circle(4, 4, 3, '#3fae4a');
    circle(10, 4, 3, '#3fae4a');
    circle(4, 9, 3, '#3fae4a');
    circle(10, 9, 3, '#3fae4a');
    rect(6, 5, 2, 3, '#2d8a38');
    rect(7, 9, 1, 7, '#2d8a38');
    rect(3, 3, 1, 1, '#a8f0a0');
    rect(9, 3, 1, 1, '#a8f0a0');
  }),
  wishstar: () => sprite(16, 14, ({ rect }) => {
    rect(9, 0, 1, 11, '#ffd93b');
    rect(4, 4, 11, 2, '#ffd93b');
    rect(7, 2, 5, 7, '#ffd93b');
    rect(6, 3, 7, 5, '#ffd93b');
    rect(8, 3, 2, 2, '#fff6c0');
    rect(0, 10, 4, 1, '#ff9ad5');
    rect(2, 12, 4, 1, '#9ad5ff');
    rect(3, 8, 3, 1, '#c8a8ff');
  }),
  bandage: () => sprite(14, 8, ({ rect }) => {
    rect(0, 2, 14, 4, '#f2c79a');
    rect(4, 1, 6, 6, '#fbe3c8');
    rect(6, 3, 1, 1, '#d9a77c');
    rect(8, 4, 1, 1, '#d9a77c');
  }),
  bolt: () => sprite(10, 14, ({ rect }) => {
    [[5, 0, 4], [4, 2, 4], [3, 4, 4], [2, 6, 7], [5, 7, 3], [4, 9, 3], [3, 11, 2], [2, 13, 1]].forEach(([x, y, w]) => rect(x, y, w, 2, '#ffd93b'));
  }),
  star: () => sprite(13, 13, ({ rect }) => {
    rect(6, 0, 1, 13, '#ffd93b');
    rect(0, 5, 13, 2, '#ffd93b');
    rect(4, 2, 5, 9, '#ffd93b');
    rect(2, 4, 9, 5, '#ffd93b');
    rect(5, 4, 2, 2, '#fff6c0');
  }),
  shield: () => sprite(12, 14, ({ rect }) => {
    rect(1, 0, 10, 8, '#4c8ef0');
    for (let i = 0; i < 5; i++) rect(1 + i, 8 + i, 10 - i * 2, 1, '#4c8ef0');
    rect(5, 2, 2, 8, '#cfe2ff');
    rect(3, 4, 6, 2, '#cfe2ff');
  }),
  plush: () => sprite(16, 16, ({ circle, rect }) => {
    circle(3, 3, 2, '#b07a4a');
    circle(12, 3, 2, '#b07a4a');
    circle(8, 6, 5, '#c88b55');
    rect(3, 10, 10, 6, '#c88b55');
    circle(8, 8, 2, '#f0d2a8');
    rect(5, 5, 1, 1, '#1d1a26');
    rect(10, 5, 1, 1, '#1d1a26');
    rect(7, 7, 2, 1, '#1d1a26');
    rect(6, 12, 4, 3, '#f0d2a8');
  }),
  bag: () => sprite(18, 16, ({ rect }) => {
    rect(5, 0, 8, 2, '#7a3b2e');
    rect(4, 1, 2, 4, '#7a3b2e');
    rect(12, 1, 2, 4, '#7a3b2e');
    rect(1, 4, 16, 12, '#b5543f');
    rect(1, 4, 16, 5, '#d0694f');
    rect(8, 7, 2, 3, '#f4c542');
    rect(2, 10, 14, 1, '#8f3f2e');
  }),
  broken: () => sprite(12, 12, ({ rect }) => {
    for (let i = 0; i < 10; i++) {
      rect(1 + i, 1 + i, 2, 1, '#ff4d4d');
      rect(9 - i, 1 + i, 2, 1, '#ff4d4d');
    }
  }),
  wrench: () => sprite(13, 13, ({ rect, circle }) => {
    circle(9, 3, 3, '#b8bcc8');
    rect(8, 0, 2, 3, 'rgba(0,0,0,0)');
    for (let i = 0; i < 8; i++) rect(7 - i, 5 + i, 2, 2, '#b8bcc8');
  }),
};

// Cartridge with a colored label (per game).
// Label art for each game, drawn in the 10x8 label area at (4, 4).
const LABELS = {
  tetris: ({ rect }) => { rect(5, 9, 3, 1, '#3cc'); rect(6, 8, 1, 1, '#3cc'); rect(9, 7, 2, 2, '#fd3'); rect(10, 9, 3, 1, '#c3c'); },
  pong: ({ rect }) => { rect(5, 6, 1, 4, '#fff'); rect(12, 7, 1, 4, '#fff'); rect(8, 8, 2, 2, '#fff'); },
  galaga: ({ rect }) => { rect(8, 6, 2, 4, '#fff'); rect(6, 9, 6, 1, '#f33'); rect(7, 5, 4, 1, '#3cf'); },
  asteroids: ({ circle, rect }) => { circle(7, 8, 2, '#a98'); rect(11, 6, 2, 2, '#fff'); },
  invaders: ({ rect }) => { rect(6, 6, 6, 3, '#7f5'); rect(6, 9, 1, 1, '#7f5'); rect(11, 9, 1, 1, '#7f5'); rect(7, 7, 1, 1, '#000'); rect(10, 7, 1, 1, '#000'); },
  flappy: ({ rect }) => { rect(6, 7, 4, 3, '#fd3'); rect(10, 8, 2, 1, '#f80'); rect(12, 4, 2, 3, '#3a3'); rect(12, 10, 2, 2, '#3a3'); },
  breakout: ({ rect }) => { rect(5, 5, 3, 1, '#f33'); rect(9, 5, 3, 1, '#fd3'); rect(5, 7, 3, 1, '#3c3'); rect(8, 9, 1, 1, '#fff'); rect(7, 11, 4, 1, '#fff'); },
  combat: ({ rect }) => { rect(6, 7, 5, 4, '#6a4'); rect(11, 8, 2, 1, '#6a4'); rect(5, 11, 7, 1, '#333'); },
  riverraid: ({ rect }) => { rect(4, 4, 2, 8, '#3a3'); rect(12, 4, 2, 8, '#3a3'); rect(6, 4, 6, 8, '#38f'); rect(8, 7, 2, 4, '#fd3'); rect(7, 9, 4, 1, '#fd3'); },
  pacman: ({ circle, rect }) => { circle(8, 8, 3, '#fd3'); rect(9, 7, 3, 2, '#000'); rect(12, 8, 1, 1, '#fff'); },
  donkeykong: ({ rect }) => { rect(5, 5, 5, 5, '#842'); rect(6, 6, 3, 2, '#da8'); rect(10, 10, 3, 2, '#c62'); },
  sonic: ({ circle, rect }) => { circle(8, 8, 3, '#25e'); rect(9, 7, 2, 1, '#fff'); rect(5, 6, 2, 1, '#25e'); rect(6, 11, 4, 1, '#e22'); },
  marioworld: ({ rect }) => { rect(6, 5, 5, 2, '#e22'); rect(6, 7, 5, 2, '#fca'); rect(6, 9, 5, 3, '#33e'); },
  mariokart: ({ rect }) => { rect(5, 8, 8, 3, '#e22'); rect(5, 11, 2, 1, '#222'); rect(11, 11, 2, 1, '#222'); rect(8, 6, 2, 2, '#fca'); },
};

// Cartridge with a per-game label; console: 'gb' grey, 'gg' black, 'psp' disc (UMD). fav: little heart.
export function cartridge(color, game, consoleId = 'gb', fav = false) {
  const key = `cart:${color}:${game}:${consoleId}:${fav}`;
  if (cache.has(key)) return cache.get(key);
  const url = sprite(18, 18, (p) => {
    const { rect, circle } = p;
    if (consoleId === 'psp') {
      circle(9, 9, 8, '#d8d8e0');
      rect(4, 5, 10, 8, color);
    } else {
      const body = consoleId === 'gg' ? '#2a2a30' : '#9a98a4';
      rect(2, 0, 14, 18, body);
      rect(2, 0, 14, 2, consoleId === 'gg' ? '#45454d' : '#bdbbc6');
      rect(4, 3, 10, 11, color);
      rect(5, 4, 8, 9, 'rgba(0,0,0,0.35)');
      rect(4, 15, 10, 2, consoleId === 'gg' ? '#111' : '#6d6b78');
    }
    LABELS[game]?.(p);
    if (fav) {
      rect(13, 0, 2, 1, '#ff3b6b');
      rect(16, 0, 1, 1, '#ff3b6b');
      rect(12, 1, 6, 2, '#ff3b6b');
      rect(13, 3, 4, 1, '#ff3b6b');
      rect(14, 4, 2, 1, '#ff3b6b');
    }
  });
  cache.set(key, url);
  return url;
}

// Animated speech-bubble emoticons in the style of the GIF set (white bubble, dark outline, ~27x24).
// tail: where the little pointer sits so it always points at the pet ('l' | 'c' | 'r').
const bubble = (draw) => (f, tail = 'c') => sprite(27, 24, (p) => {
  const { rect } = p;
  rect(2, 1, 23, 17, '#fff');
  rect(1, 2, 25, 15, '#fff');
  const tx = { l: 4, c: 11, r: 19 }[tail];
  rect(tx, 18, 4, 2, '#fff');
  rect(tail === 'r' ? tx + 2 : tx, 20, 2, 2, '#fff');
  draw(p, f);
}, undefined, false);

// Emote themes: recolors the generated bubbles (bubble color, outline, inks).
const EMOTE_THEMES = {
  padrao: null,
  dark: { bg: [43, 43, 54], line: [232, 232, 240] },
  light: { bg: [255, 255, 255], line: [120, 120, 140] },
  synthwave: { bg: [42, 22, 64], line: [255, 79, 216], neon: true },
  gameboy: { pal: [[15, 56, 15], [48, 98, 48], [139, 172, 15], [155, 188, 15]] },
  'gameboy-light': { pal: [[0, 40, 40], [20, 100, 90], [80, 180, 150], [170, 230, 200]] },
  'gameboy-color': { bg: [250, 240, 200], line: [70, 40, 120] },
  'gameboy-advance': { bg: [220, 225, 255], line: [60, 60, 140] },
  gamegear: { bg: [30, 30, 36], line: [90, 200, 255], neon: true },
  psp: { bg: [235, 238, 245], line: [20, 20, 30], gloss: true },
};
let emoteTheme = null;

function recolor(g, w, h) {
  const t = emoteTheme;
  if (!t) return;
  const d = g.getImageData(0, 0, w, h);
  const px = d.data;
  for (let i = 0; i < px.length; i += 4) {
    if (!px[i + 3]) continue;
    const [r, gg, b] = [px[i], px[i + 1], px[i + 2]];
    const lum = (r * 0.3 + gg * 0.59 + b * 0.11) / 255;
    let out;
    if (t.pal) out = t.pal[Math.min(3, Math.floor(lum * 4))];
    else if (r > 245 && gg > 245 && b > 245) out = t.bg;
    else if (r < 40 && gg < 40 && b < 50) out = t.line;
    else if (t.neon) out = [Math.min(255, r * 1.2 + 40), Math.min(255, gg * 0.8 + 40), Math.min(255, b * 1.3 + 60)];
    else if (t.gloss && i / 4 / w < 6) out = [Math.min(255, r + 40), Math.min(255, gg + 40), Math.min(255, b + 40)];
    if (out) [px[i], px[i + 1], px[i + 2]] = out;
  }
  g.putImageData(d, 0, 0);
}

const EMOTES = {
  g_note: [3, bubble(({ rect, circle }, f) => {
    const y = f === 1 ? 2 : 3;
    rect(14, y, 2, 9, '#7a5cff');
    rect(14, y, 6, 2, '#7a5cff');
    rect(18, y + 2, 2, 2, '#7a5cff');
    circle(12, y + 10, 2, '#7a5cff');
    if (f === 2) rect(5, 6, 2, 2, '#ff6f91');
    if (f !== 0) rect(21, 11, 2, 2, '#ffd23f');
  })],
  g_sparkle: [3, bubble(({ rect }, f) => {
    const star = (x, y, s, c) => { rect(x - s, y, s * 2 + 1, 1, c); rect(x, y - s, 1, s * 2 + 1, c); };
    star(13, 9, f === 1 ? 4 : 3, '#ffcf3b');
    star(6, 5, f === 2 ? 2 : 1, '#5fd0ff');
    star(20, 13, f === 0 ? 2 : 1, '#ff6fb5');
  })],
  g_heartbreak: [2, bubble(({ rect, circle }, f) => {
    const dx = f ? 1 : 0;
    circle(10 - dx, 7, 3, '#ef4b6a');
    circle(16 + dx, 7, 3, '#ef4b6a');
    for (let i = 0; i < 6; i++) {
      rect(7 + i - dx, 8 + i, 6 - i, 1, '#ef4b6a');
      rect(13 + dx, 8 + i, 6 - i, 1, '#ef4b6a');
    }
    rect(13, 4, 1, 3, '#fff');
    rect(12, 7, 1, 3, '#fff');
    rect(13, 10, 1, 3, '#fff');
  })],
  g_vein: [2, bubble(({ rect }, f) => {
    const c = '#e8433f';
    const s = f ? 1 : 0;
    rect(8 - s, 4 - s, 3, 4, c);
    rect(16 + s, 4 - s, 3, 4, c);
    rect(8 - s, 11 + s, 3, 4, c);
    rect(16 + s, 11 + s, 3, 4, c);
    rect(11, 7, 5, 1, c);
    rect(11, 11, 5, 1, c);
  })],
  g_zzz: [3, bubble(({ rect }, f) => {
    const z = (x, y, s, c) => { rect(x, y, s, 1, c); for (let i = 1; i < s - 1; i++) rect(x + s - 1 - i, y + i, 1, 1, c); rect(x, y + s - 1, s, 1, c); };
    z(5, 9, 5, '#5b7bd5');
    if (f >= 1) z(12, 5, 4, '#5b7bd5');
    if (f >= 2) z(18, 2, 3, '#5b7bd5');
  })],
  g_interrobang: [2, bubble(({ rect }, f) => {
    const c = f ? '#e8433f' : '#1d1a26';
    rect(8, 3, 2, 8, c);
    rect(8, 13, 2, 2, c);
    rect(14, 3, 5, 2, '#1d1a26');
    rect(18, 4, 2, 4, '#1d1a26');
    rect(15, 8, 3, 2, '#1d1a26');
    rect(15, 10, 2, 1, '#1d1a26');
    rect(15, 13, 2, 2, '#1d1a26');
  })],
  g_game: [2, bubble(({ rect }, f) => {
    rect(5, 6, 17, 8, '#5b5a6a');
    rect(7, 9, 4, 2, '#fff');
    rect(8, 8, 2, 4, '#fff');
    rect(16, f ? 8 : 9, 2, 2, '#e8433f');
    rect(19, f ? 10 : 9, 2, 2, '#5fd0ff');
  })],
  g_hearts: [3, bubble(({ circle, rect }, f) => {
    const heart = (x, y, c) => { circle(x, y, 2, c); circle(x + 4, y, 2, c); for (let i = 0; i < 4; i++) rect(x - 2 + i, y + 1 + i, 9 - i * 2, 1, c); };
    heart(5, 5 + (f === 0 ? 0 : 1), '#ef4b6a');
    heart(14, 8 - (f === 1 ? 1 : 0), '#ff8fb1');
    if (f === 2) rect(21, 3, 2, 2, '#ffd23f');
  })],
  g_question: [2, bubble(({ rect }, f) => {
    const c = f ? '#5b7bd5' : '#1d1a26';
    rect(10, 3, 7, 2, c); rect(16, 4, 2, 4, c); rect(12, 8, 4, 2, c); rect(12, 10, 2, 2, c); rect(12, 13, 2, 2, c);
  })],
  g_exclaim: [2, bubble(({ rect }, f) => {
    const c = f ? '#e8433f' : '#ff9a3b';
    rect(12, 2 + f, 3, 9, c); rect(12, 13, 3, 3, c);
  })],
  g_sweat: [2, bubble(({ rect, circle }, f) => {
    circle(13, 9, 4, '#ffd27a'); rect(10, 8, 2, 1, '#1d1a26'); rect(15, 8, 2, 1, '#1d1a26'); rect(11, 11, 5, 1, '#1d1a26');
    rect(19, 3 + f * 2, 2, 3, '#5fd0ff'); rect(19, 6 + f * 2, 1, 1, '#5fd0ff');
  })],
  g_stareyes: [2, bubble(({ rect, circle }, f) => {
    circle(13, 9, 5, '#ffd27a');
    const star = (x, y) => { rect(x - 1, y, 3, 1, '#ffcf3b'); rect(x, y - 1, 1, 3, '#ffcf3b'); };
    star(11, 8); star(16, 8);
    rect(11, 12, 5, 1 + f, '#e8433f');
  })],
  g_food: [2, bubble(({ rect, circle }, f) => {
    circle(13, 10, 5, '#fff7e0'); rect(8, 10, 11, 4, '#e8e2d4'); rect(10, 6 - f, 7, 3, '#2b2b36');
    rect(18, 3, 1, 4, '#c9c4bb'); rect(20, 3, 1, 4, '#c9c4bb');
  })],
  g_drink: [2, bubble(({ rect }, f) => {
    rect(10, 5, 7, 10, '#5fd0ff'); rect(10, 5 + f, 7, 2, '#fff'); rect(15, 2, 1, 5, '#e8433f'); rect(15, 2, 3, 1, '#e8433f');
  })],
  g_idea: [2, bubble(({ rect, circle }, f) => {
    circle(13, 7, 4, f ? '#fff36a' : '#ffd23f'); rect(11, 11, 5, 3, '#9a98a4');
    if (f) { rect(6, 6, 2, 1, '#ffd23f'); rect(19, 6, 2, 1, '#ffd23f'); rect(13, 1, 1, 1, '#ffd23f'); }
  })],
  g_dots: [3, bubble(({ rect }, f) => {
    for (let i = 0; i <= f; i++) rect(7 + i * 5, 9, 3, 3, '#1d1a26');
  })],
  g_angrycloud: [2, bubble(({ rect, circle }, f) => {
    circle(10, 9, 4, '#5b5a6a'); circle(16, 8, 5, '#5b5a6a'); rect(8, 10, 12, 4, '#5b5a6a');
    rect(13, 13 + f, 2, 3, '#ffd23f'); rect(12, 15 + f, 2, 1, '#ffd23f');
  })],
  g_sun: [2, bubble(({ rect, circle }, f) => {
    circle(13, 9, 3, '#ffcf3b');
    const r = f ? 6 : 5;
    rect(13, 9 - r, 1, 2, '#ffcf3b'); rect(13, 8 + r, 1, 2, '#ffcf3b'); rect(13 - r, 9, 2, 1, '#ffcf3b'); rect(12 + r, 9, 2, 1, '#ffcf3b');
  })],
  g_rain: [3, bubble(({ rect, circle }, f) => {
    circle(10, 6, 3, '#9a98a4'); circle(15, 5, 4, '#9a98a4'); rect(8, 6, 11, 3, '#9a98a4');
    for (const x of [9, 13, 17]) rect(x, 10 + ((f + x) % 3), 1, 2, '#5fd0ff');
  })],
  g_flower: [2, bubble(({ rect, circle }, f) => {
    for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [0, 2]]) circle(13 + dx, 8 + dy, 2, f ? '#ff8fb1' : '#ff6fb5');
    circle(13, 8, 1, '#ffd23f'); rect(13, 11, 1, 5, '#5fbf5a'); rect(14, 13, 2, 1, '#5fbf5a');
  })],
  g_skull: [2, bubble(({ rect, circle }, f) => {
    circle(13, 8, 4, '#f4f1ea'); rect(11, 11, 5, 3, '#f4f1ea'); rect(11, 7, 2, 2, '#1d1a26'); rect(14, 7, 2, 2, '#1d1a26');
    rect(12, 12 + f, 1, 2, '#1d1a26'); rect(14, 12 + f, 1, 2, '#1d1a26');
  })],
  g_lol: [2, bubble(({ rect, circle }, f) => {
    circle(13, 9, 5, '#ffd27a'); rect(10, 7, 2, 1, '#1d1a26'); rect(15, 7, 2, 1, '#1d1a26');
    rect(10, 10, 7, 3 + f, '#e8433f'); rect(10, 10, 7, 1, '#fff');
    rect(6, 8 + f, 1, 2, '#5fd0ff'); rect(20, 8 + f, 1, 2, '#5fd0ff');
  })],
  g_scared: [2, bubble(({ rect, circle }, f) => {
    circle(13, 9, 5, '#cfe3ff'); rect(10 - f, 7, 2, 2, '#1d1a26'); rect(15 + f, 7, 2, 2, '#1d1a26'); circle(13, 12, 1 + f, '#1d1a26');
  })],
  g_cry: [3, bubble(({ rect, circle }, f) => {
    circle(13, 9, 5, '#ffd27a'); rect(10, 8, 2, 1, '#1d1a26'); rect(15, 8, 2, 1, '#1d1a26'); rect(11, 12, 5, 1, '#1d1a26');
    rect(10, 9 + f, 1, 2, '#5fd0ff'); rect(16, 9 + ((f + 1) % 3), 1, 2, '#5fd0ff');
  })],
  g_fire: [3, bubble(({ rect, circle }, f) => {
    circle(13, 10, 4, '#ff6a2a'); circle(13, 11, 2, '#ffd23f'); rect(12, 3 + (f % 2), 2, 4, '#ff6a2a'); rect(16, 5 + ((f + 1) % 2), 1, 3, '#ff9a3b');
  })],
  g_ball: [2, bubble(({ rect, circle }, f) => {
    circle(13 + f, 9, 4, '#f4f1ea'); rect(12 + f, 8, 2, 2, '#2b2b36'); rect(6, 15, 15, 1, '#5fbf5a');
  })],
  g_mic: [2, bubble(({ rect, circle }, f) => {
    circle(11, 6, 2, '#9aa3b5'); rect(10, 8, 2, 7, '#2b2b36');
    rect(16, 4 + f, 2, 5, '#7a5cff'); rect(16, 4 + f, 4, 1, '#7a5cff'); circle(15, 9 + f, 1, '#7a5cff');
  })],
  g_ok: [2, bubble(({ rect }, f) => {
    const c = '#5fbf5a';
    rect(7, 9 + f, 2, 2, c); rect(9, 11 + f, 2, 2, c); rect(11, 9 + f, 2, 2, c); rect(13, 7 + f, 2, 2, c); rect(15, 5 + f, 2, 2, c); rect(17, 3 + f, 2, 2, c);
  })],
};

// [{ name, frames: { l, c, r } }] for the generated emoticons, recolored for the emote theme.
export function emoteSet(theme = 'padrao') {
  if (typeof document === 'undefined') return [];
  emoteTheme = EMOTE_THEMES[theme] || null;
  try {
    return Object.entries(EMOTES).map(([name, [n, draw]]) => ({
      name,
      frames: Array.from({ length: n }, (_, f) => draw(f, 'c')),
      left: Array.from({ length: n }, (_, f) => draw(f, 'l')),
      right: Array.from({ length: n }, (_, f) => draw(f, 'r')),
    }));
  } finally {
    emoteTheme = null;
  }
}

export const EMOTE_THEME_LIST = Object.keys(EMOTE_THEMES);

const cache = new Map();
export function icon(name) {
  if (!cache.has(name)) cache.set(name, DEFS[name] ? DEFS[name]() : '');
  return cache.get(name);
}

// Lets other modules add their own pixel icons: defineIcons({ name: (sprite) => dataUrl }).
export function defineIcons(defs) {
  for (const [name, fn] of Object.entries(defs)) DEFS[name] = () => fn(sprite);
}
export { sprite };
