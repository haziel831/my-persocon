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
  // Draws an already loaded image (a sprite-sheet cell) or a canvas inside the icon being painted.
  const image = (img, sx, sy, sw, sh, dx, dy, dw, dh) => {
    if (!img) return;
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    if (!w || !h) return;
    const smooth = g.imageSmoothingEnabled;
    g.imageSmoothingEnabled = false;
    g.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
    g.imageSmoothingEnabled = smooth;
  };
  paint({ rect, px, circle, image });
  if (hd) return (artStyle === 'classic' ? detail : detail16)(g, w, h, outline, light);
  if (outline) {
    const d = g.getImageData(0, 0, w, h);
    const a = (x, y) => x >= 0 && y >= 0 && x < w && y < h && d.data[(y * w + x) * 4 + 3] > 0;
    const edge = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (!a(x, y) && (a(x - 1, y) || a(x + 1, y) || a(x, y - 1) || a(x, y + 1))) edge.push([x, y]);
    g.fillStyle = outline;
    for (const [x, y] of edge) g.fillRect(x, y, 1, 1);
  }
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

// '16bit' (default) or 'classic' (the finish above, kept for rolling back).
let artStyle = '16bit';

function scale2x(g, w, h) {
  const src = new Uint32Array(g.getImageData(0, 0, w, h).data.buffer);
  const W = w * 2;
  const big = new Uint32Array(W * h * 2);
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
  return big;
}

const lum = (v) => ((v & 255) * 0.3 + ((v >> 8) & 255) * 0.59 + ((v >> 16) & 255) * 0.11) / 255;

// Ramp step for a base color: warm highlights (+1..+3, +3 = glint), cool purple shadows (-1, -2).
function ramp(r, g, b, lvl) {
  if (lvl > 0) {
    const a = [0, 0.15, 0.32, 0.65][lvl];
    return [r + (255 - r) * a, g + (246 - g) * a, b + (220 - b) * a];
  }
  if (lvl < 0) {
    const a = lvl === -1 ? 0.2 : 0.4;
    return [r * (1 - a * 1.05) + 10 * a, g * (1 - a * 1.2) + 4 * a, b * (1 - a * 0.7) + 40 * a];
  }
  return [r, g, b];
}

// 16-bit (Super Nintendo-like) finish. After Scale2x the whole shape gets volume shading in a 5-step
// hue-shifted ramp (clean bands, checker dithering only between them), a glint on the big shapes,
// a dark contour where a darker color meets a lighter one, and a selective outline (lighter on the
// lit top-left side, dark on the bottom-right one).
function detail16(g, w, h, outline, light = true) {
  const big = scale2x(g, w, h);
  const W = w * 2;
  const H = h * 2;
  const N = W * H;
  const solid = (v) => v >>> 24 > 0;
  // Run lengths of the silhouette in the 4 directions (how far the shape goes on each side).
  const L = new Int16Array(N);
  const R = new Int16Array(N);
  const U = new Int16Array(N);
  const D = new Int16Array(N);
  for (let y = 0; y < H; y++) {
    for (let x = 1; x < W; x++) {
      const i = y * W + x;
      if (solid(big[i]) && solid(big[i - 1])) L[i] = L[i - 1] + 1;
    }
    for (let x = W - 2; x >= 0; x--) {
      const i = y * W + x;
      if (solid(big[i]) && solid(big[i + 1])) R[i] = R[i + 1] + 1;
    }
  }
  for (let x = 0; x < W; x++) {
    for (let y = 1; y < H; y++) {
      const i = y * W + x;
      if (solid(big[i]) && solid(big[i - W])) U[i] = U[i - W] + 1;
    }
    for (let y = H - 2; y >= 0; y--) {
      const i = y * W + x;
      if (solid(big[i]) && solid(big[i + W])) D[i] = D[i + W] + 1;
    }
  }
  const get = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? 0 : big[y * W + x]);
  const out = new Uint8ClampedArray(N * 4);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const p = big[i];
      if (!solid(p)) continue;
      const sx = L[i] + R[i] + 1;
      const sy = U[i] + D[i] + 1;
      const tx = sx >= 4 ? (L[i] + 0.5) / sx : 0.5;
      const ty = sy >= 4 ? (U[i] + 0.5) / sy : 0.5;
      let f = 0;
      if (sx >= 4 || sy >= 4) {
        f = light
          ? (1 - 2 * (0.6 * ty + 0.4 * tx)) * 1.9 - (y / H) * 0.3
          : Math.min(tx, 1 - tx, ty, 1 - ty) * 2.4 - 0.6;
      }
      // Clean bands; checker dithering only in a narrow strip between two of them.
      const fl = Math.floor(f);
      const fr = f - fl;
      let lvl = fr < 0.4 ? fl : fr > 0.6 ? fl + 1 : fl + ((x + y) & 1);
      lvl = Math.max(-2, Math.min(2, lvl));
      if (light && sx >= 10 && sy >= 10 && ty > 0.1 && ty < 0.24 && tx > 0.14 && tx < 0.3) lvl = 3;
      if (Math.min(sx, sy) >= 3) {
        const lp = lum(p);
        let diff = 0;
        for (const n of [get(x + 1, y), get(x - 1, y), get(x, y + 1), get(x, y - 1)]) {
          if (solid(n) && n !== p) diff = Math.max(diff, lum(n) - lp);
        }
        if (diff > 0.12) lvl = diff > 0.35 ? -2 : Math.min(lvl, -1);
      }
      const [r, gg, b] = ramp(p & 255, (p >> 8) & 255, (p >> 16) & 255, lvl);
      const o = i * 4;
      out[o] = r;
      out[o + 1] = gg;
      out[o + 2] = b;
      out[o + 3] = p >>> 24;
    }
  }
  if (outline) {
    const [or, og, ob] = hexRgb(outline);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (solid(big[y * W + x])) continue;
        const right = get(x + 1, y);
        const down = get(x, y + 1);
        const n = [right, down, get(x - 1, y), get(x, y - 1)].find(solid);
        if (n === undefined) continue;
        const lit = solid(right) || solid(down);
        const [nr, ng, nb] = ramp(n & 255, (n >> 8) & 255, (n >> 16) & 255, -2);
        const k = lit ? 0.5 : 0.82;
        const o = (y * W + x) * 4;
        out[o] = or * k + nr * (1 - k) * 0.7;
        out[o + 1] = og * k + ng * (1 - k) * 0.7;
        out[o + 2] = ob * k + nb * (1 - k) * 0.7;
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
  // 32x32 cartoon glove (cafunÃ© cursor) and the red open hand (tapa cursor), outlined.
  glove: () => sprite(32, 32, ({ rect }) => {
    const O = '#2a2738';
    const shape = (c, g) => {
      rect(7 - g, 12 - g, 18 + g * 2, 12 + g * 2, c);
      [[8, 4, 9], [12, 2, 11], [16, 3, 10], [20, 5, 8]].forEach(([x, y, hgt]) => rect(x - g, y - g, 4 + g * 2, hgt + 4 + g * 2, c));
      rect(2 - g, 14 - g, 7 + g * 2, 5 + g * 2, c);
      rect(4 - g, 18 - g, 5 + g * 2, 4 + g * 2, c);
      rect(8 - g, 23 - g, 16 + g * 2, 7 + g * 2, c);
    };
    shape(O, 1);
    shape('#ffffff', 0);
    [[11, 6], [15, 4], [19, 5]].forEach(([x, y]) => rect(x, y + 2, 1, 8, '#b9c1d6'));
    rect(23, 12, 2, 11, '#d8deeb');
    rect(8, 23, 16, 1, '#b9c1d6');
    rect(8, 25, 16, 5, '#e6eaf4');
    rect(8, 26, 16, 1, '#c4cbe0');
    rect(8, 28, 16, 1, '#c4cbe0');
    [[12, 15], [16, 15], [20, 15]].forEach(([x, y]) => rect(x, y, 2, 1, '#d8deeb'));
  }),
  slapcur: () => sprite(32, 32, ({ rect }) => {
    const O = '#3a1420';
    const shape = (c, g) => {
      rect(7 - g, 12 - g, 18 + g * 2, 13 + g * 2, c);
      [[8, 4, 9], [12, 2, 11], [16, 3, 10], [20, 5, 8]].forEach(([x, y, hgt]) => rect(x - g, y - g, 3 + g * 2, hgt + 4 + g * 2, c));
      rect(2 - g, 14 - g, 7 + g * 2, 5 + g * 2, c);
      rect(9 - g, 25 - g, 14 + g * 2, 6 + g * 2, c);
    };
    shape(O, 1);
    shape(SKIN, 0);
    rect(22, 12, 3, 13, SKIN_D);
    [[11, 6], [15, 4], [19, 5]].forEach(([x, y]) => rect(x, y + 2, 1, 8, SKIN_D));
    rect(11, 16, 9, 6, '#ef8a8a');
    rect(9, 25, 14, 6, '#c8344c');
    rect(9, 25, 14, 1, '#ee6b80');
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
  // Popcorn sizes: small cup / medium tub / large bucket (silhouette differs).
  popcorn_p: () => sprite(10, 14, ({ rect, circle }) => {
    rect(2, 7, 6, 7, '#e63c3c');
    [3, 5, 7].forEach((x) => rect(x, 7, 1, 7, '#fff'));
    [[3, 5], [5, 4], [7, 5]].forEach(([x, y]) => circle(x, y, 2, '#fff4c8'));
    rect(1, 7, 8, 1, '#b82a2a');
  }),
  popcorn_m: () => sprite(14, 16, ({ rect, circle }) => {
    rect(3, 6, 8, 10, '#e63c3c');
    [4, 7, 10].forEach((x) => rect(x, 6, 1, 10, '#fff'));
    [[4, 4], [7, 3], [10, 4], [5, 2], [9, 1], [7, 5]].forEach(([x, y]) => circle(x, y, 2, '#fff4c8'));
    rect(2, 6, 10, 1, '#b82a2a');
  }),
  popcorn_g: () => sprite(18, 18, ({ rect, circle }) => {
    rect(2, 6, 14, 12, '#e63c3c');
    [4, 7, 10, 13].forEach((x) => rect(x, 6, 1, 12, '#fff'));
    [[4, 4], [7, 2], [10, 3], [13, 4], [5, 1], [9, 0], [12, 1], [8, 5]].forEach(([x, y]) => circle(x, y, 2, '#fff4c8'));
    rect(1, 6, 16, 1, '#b82a2a');
    rect(3, 16, 12, 1, '#9a2020');
  }),
  popcorn: () => DEFS.popcorn_m(),
  // Chip bags: small / medium / family size.
  chips_p: () => sprite(10, 14, ({ rect }) => {
    rect(2, 3, 6, 11, '#e8a020');
    rect(2, 3, 6, 2, '#c9c9d6');
    rect(2, 12, 6, 2, '#c9c9d6');
    rect(3, 6, 4, 1, '#c8361f');
    rect(3, 8, 4, 3, '#ffe27a');
    [[3, 1], [5, 0]].forEach(([x, y]) => rect(x, y, 2, 2, '#f7d36a'));
  }),
  chips_m: () => sprite(14, 16, ({ rect }) => {
    rect(2, 3, 10, 13, '#e8a020');
    rect(2, 3, 10, 2, '#c9c9d6');
    [3, 5, 7, 9, 11].forEach((x) => rect(x, 3, 1, 1, '#9a9aaa'));
    rect(2, 14, 10, 2, '#c9c9d6');
    rect(3, 6, 8, 1, '#c8361f');
    rect(4, 8, 6, 5, '#ffe27a');
    [[5, 9], [7, 10], [6, 11], [8, 9]].forEach(([x, y]) => rect(x, y, 2, 1, '#e8b84a'));
    rect(3, 13, 8, 1, '#c8361f');
    [[4, 1], [7, 0], [9, 1]].forEach(([x, y]) => rect(x, y, 3, 2, '#f7d36a'));
    rect(11, 4, 1, 10, '#c48010');
  }),
  chips_g: () => sprite(18, 18, ({ rect }) => {
    rect(2, 3, 14, 15, '#e8a020');
    rect(2, 3, 14, 2, '#c9c9d6');
    [3, 5, 7, 9, 11, 13].forEach((x) => rect(x, 3, 1, 1, '#9a9aaa'));
    rect(2, 16, 14, 2, '#c9c9d6');
    rect(3, 6, 12, 1, '#c8361f');
    rect(4, 8, 10, 6, '#ffe27a');
    [[5, 9], [8, 10], [11, 9], [7, 12], [10, 11]].forEach(([x, y]) => rect(x, y, 2, 1, '#e8b84a'));
    rect(3, 15, 12, 1, '#c8361f');
    [[4, 1], [8, 0], [12, 1]].forEach(([x, y]) => rect(x, y, 3, 2, '#f7d36a'));
    rect(15, 4, 1, 12, '#c48010');
  }),
  chips: () => DEFS.chips_m(),
  // Soda cans: mini / regular / tall bottle.
  soda_p: () => sprite(8, 12, ({ rect }) => {
    rect(1, 2, 6, 10, '#3c7be0');
    rect(1, 2, 6, 1, '#7aa8f0');
    rect(2, 5, 4, 3, '#fff');
    rect(2, 6, 4, 1, '#e63c3c');
    rect(3, 0, 2, 2, '#f4f1ea');
  }),
  soda_m: () => sprite(10, 16, ({ rect }) => {
    rect(1, 3, 8, 13, '#3c7be0');
    rect(1, 3, 8, 1, '#7aa8f0');
    rect(2, 7, 6, 4, '#fff');
    rect(3, 8, 4, 2, '#e63c3c');
    rect(6, 0, 1, 4, '#f4f1ea');
    rect(6, 0, 3, 1, '#f4f1ea');
  }),
  soda_g: () => sprite(12, 18, ({ rect }) => {
    rect(2, 2, 8, 16, '#2a5fc4');
    rect(2, 2, 8, 1, '#7aa8f0');
    rect(3, 6, 6, 5, '#fff');
    rect(4, 7, 4, 3, '#e63c3c');
    rect(4, 0, 4, 2, '#f4f1ea');
    rect(5, 0, 2, 3, '#d8d4c8');
    rect(3, 16, 6, 1, '#1a3a80');
  }),
  soda: () => DEFS.soda_m(),
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
  gameboy: () => sprite(12, 16, ({ rect, px }) => {
    rect(1, 0, 10, 1, '#c9c6cf');
    rect(0, 1, 12, 13, '#c9c6cf');
    rect(0, 14, 11, 1, '#c9c6cf');
    rect(1, 15, 8, 1, '#c9c6cf');
    rect(2, 2, 8, 6, '#5b5a6a');
    rect(3, 3, 6, 4, '#9bbc0f');
    rect(5, 5, 2, 1, '#306230');
    rect(2, 10, 3, 1, '#2b2b36');
    rect(3, 9, 1, 3, '#2b2b36');
    px(9, 9, '#a0233b'); px(7, 10, '#a0233b');
    px(8, 13, '#9e9ba6'); px(9, 12, '#9e9ba6');
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
// Mapeamento dos jogos para as artes em cartuchos3.png (16 artes disponÃ­veis, 4x4 grid)
// Cada cartucho na folha tem aprox. 64x80px. Jogos mapeados por similaridade temÃ¡tica:
// Linha 1: Mario-style, Sonic-style, Space shooter 1, Space shooter 2
// Linha 2: Mario jumping, Ninja/Action, Castle/Dungeon, Adventure
// Linha 3: Mario running, Boxing/Fighting, Book/Puzzle, Sword/RPG
// Linha 4: Racing, Strategy, Platformer, Character action
const CARTRUCHO_ART_INDEX = {
  tetris: 10,        // Book/Puzzle style (linha 3, col 3)
  pong: 12,          // Boxing/Fighting (linha 3, col 1) - arcade classic
  galaga: 2,         // Space shooter (linha 1, col 3)
  asteroids: 3,      // Space shooter 2 (linha 1, col 4)
  invaders: 1,       // Space/Action (linha 1, col 2)
  flappy: 8,         // Adventure (linha 2, col 4)
  breakout: 0,       // Mario-style (linha 1, col 1) - classic arcade
  combat: 12,        // Boxing/Fighting (linha 3, col 1)
  riverraid: 2,      // Space shooter (linha 1, col 3)
  pacman: 4,         // Mario jumping (linha 2, col 1)
  donkeykong: 6,     // Castle/Dungeon (linha 2, col 3)
  sonic: 1,          // Sonic-style (linha 1, col 2)
  marioworld: 0,     // Mario-style (linha 1, col 1)
  mariokart: 16,     // Racing (linha 4, col 1)
};
// DimensÃµes do sprite sheet cartuchos3.png
const CARTRIDGE_SPRITE = {
  src: new URL('./assets/NEW/cartuchos3.png', import.meta.url).href,
  cols: 4,
  rows: 4,
  cartW: 64,
  cartH: 80,
  img: null,
  async load() {
    if (this.img) return this.img;
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => { this.img = img; resolve(img); };
      img.onerror = () => { this.img = null; resolve(null); };
      img.src = this.src;
    });
  },
  getArt(index) {
    if (index < 0 || index >= 16) return null;
    const col = index % this.cols;
    const row = Math.floor(index / this.cols);
    return { x: col * this.cartW, y: row * this.cartH, w: this.cartW, h: this.cartH };
  },
};

// Old labels kept for fallback when sprite fails to load
const LABELS_FALLBACK = {
  tetris: ({ rect }) => { rect(5, 9, 3, 1, '#3cc'); rect(6, 8, 1, 1, '#3cc'); rect(9, 7, 2, 2, '#fd3'); rect(10, 9, 3, 1, '#c3c'); },
  pong: ({ rect }) => { rect(5, 6, 1, 4, '#fff'); rect(12, 7, 1, 4, '#fff'); rect(8, 8, 2, 2, '#fff'); },
  galaga: ({ rect }) => { rect(8, 6, 2, 4, '#fff'); rect(6, 9, 6, 1, '#f33'); rect(7, 5, 4, 1, '#3cf'); },
  asteroids: ({ circle, rect }) => { circle(7, 8, 2, '#a98'); rect(11, 6, 2, 2, '#fff'); },
  invaders: ({ rect }) => { rect(6, 6, 6, 3, '#7f5'); rect(6, 9, 1, 1, '#7f5'); rect(11, 9, 1, 1, '#7f5'); rect(7, 7, 1, 1, '#000'); rect(10, 7, 1, 1, '#000'); },
  flappy: ({ rect }) => { rect(6, 7, 4, 3, '#fd3'); rect(10, 8, 2, 1, '#f80'); rect(12, 4, 2, 3, '#3a3'); rect(12, 10, 2, 2, '#3a3'); },
  breakout: ({ rect }) => { rect(5, 5, 3, 1, '#f33'); rect(9, 5, 3, 1, '#fd3'); rect(5, 7, 3, 1, '#3c3'); rect(8, 9, 1, 1, '#fff'); rect(7, 11, 4, 1, '#fff'); },
  combat: ({ rect }) => { rect(6, 7, 5, 4, '#6a4'); rect(11, 8, 2, 1, '#6a4'); rect(5, 11, 7, 1, '#333'); },
  riverraid: ({ rect }) => { rect(4, 4, 2, 8, '#3a3'); rect(12, 4, 2, 8, '#3a3'); rect(6, 4, 6, 8, '#38f'); rect(8, 7, 2, 4, '#fd3'); rect(7, 9, 4, 1, '#fd3'); },
  pacman: ({ rect }) => { rect(5, 6, 7, 5, '#7d5'); rect(6, 5, 5, 1, '#7d5'); rect(7, 7, 1, 1, '#000'); rect(10, 7, 1, 1, '#000'); rect(4, 8, 1, 1, '#fff'); rect(12, 8, 1, 1, '#fff'); },
  donkeykong: ({ rect }) => { rect(5, 5, 5, 5, '#842'); rect(6, 6, 3, 2, '#da8'); rect(10, 10, 3, 2, '#c62'); },
  sonic: ({ rect }) => { rect(5, 8, 7, 3, '#3a8'); rect(3, 9, 2, 1, '#fff'); rect(2, 10, 2, 1, '#fff'); rect(10, 7, 2, 1, '#fd3'); },
  marioworld: ({ rect }) => { rect(6, 5, 5, 3, '#f83'); rect(6, 8, 5, 4, '#3ac'); rect(7, 6, 1, 1, '#000'); rect(9, 6, 1, 1, '#000'); },
  mariokart: ({ rect }) => { rect(5, 8, 8, 3, '#38f'); rect(5, 11, 2, 1, '#222'); rect(11, 11, 2, 1, '#222'); rect(8, 6, 2, 2, '#ddd'); },
};
const LABELS = LABELS_FALLBACK;

// Single cartridge sheet (4x4, 128px cells) cut from cartuchos3.png. The shop/inventory clip it
// with CSS background-position; the hand-held sprites still use the per-game PNGs cut from it.
export const CART_SHEET_CELLS = ['combat', 'marioworld', 'flappy', 'sonic', 'tetris', 'pong', 'mariokart',
  'donkeykong', 'pacman', 'breakout', 'asteroids', 'riverraid', 'invaders', 'galaga'];
export function cartSheetStyle(id) {
  const i = CART_SHEET_CELLS.indexOf(id);
  if (i < 0) return null;
  return { backgroundPosition: `${(i % 4) * 100 / 3}% ${Math.floor(i / 4) * 100 / 3}%` };
}

// Cartridge with a per-game label; console: 'gb' grey, 'gg' black, 'psp' disc (UMD). fav: little heart.
// Usa labels desenhados para cada jogo - as artes de cartuchos3.png sÃ£o referenciais.
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
    // Desenha o label do jogo
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


function glyphFrames(ch) {
  return [0, 2].map((lift) => {
    const c = document.createElement('canvas');
    c.width = 52; c.height = 54;
    const g = c.getContext('2d');
    g.font = '55.35px PxEmoji';
    g.fillText(ch, 0, 49 - lift);
    return c.toDataURL('image/png');
  });
}

export const glyphIcon = (ch) => glyphFrames(ch)[0];

const cache = new Map();
export function icon(name) {
  if (!cache.has(name)) cache.set(name, DEFS[name] ? DEFS[name]() : '');
  return cache.get(name);
}

// Redraws an icon whose definition changed (the shelf is rebuilt when its content changes)
// and returns the new url, without piling up old versions in the cache.
export function refreshIcon(name) {
  cache.delete(name);
  return icon(name);
}

// Switches the finish and redraws the cached icons, swapping them in the images already on screen.
export function setArtStyle(style) {
  const next = style === 'classic' ? 'classic' : '16bit';
  if (next === artStyle) return;
  artStyle = next;
  if (typeof document === 'undefined') return;
  const swap = new Map();
  for (const key of [...cache.keys()]) {
    const old = cache.get(key);
    cache.delete(key);
    const [, color, game, consoleId, fav] = key.split(':');
    const url = key.startsWith('cart:') ? cartridge(color, game, consoleId, fav === 'true') : icon(key);
    if (old) swap.set(old, url);
  }
  for (const img of document.querySelectorAll('img')) {
    const url = swap.get(img.getAttribute('src'));
    if (url) img.src = url;
  }
}

// Lets other modules add their own pixel icons: defineIcons({ name: (sprite) => dataUrl }).
export function defineIcons(defs) {
  for (const [name, fn] of Object.entries(defs)) DEFS[name] = () => fn(sprite);
}
export { sprite };

// Text made only of emoji/symbols: shown as a bare PxEmoji icon instead of inside a speech bubble.
const EMOJI_ONLY = /^[\s\p{Extended_Pictographic}\uFE0F\u200Dâ™ªâ™«â™¬âœ“âœ¦âœ§]+$/u;
export const emojiOnly = (s) => !!s && EMOJI_ONLY.test(s);
