// Walkable geometry derived from the desktop's windows.
// Surfaces: visible parts of window top edges + the floor (taskbar top).
// Walls: visible parts of window left/right edges.
// Coordinates are overlay-local DIPs; windows arrive ordered topmost first.

function subtract(intervals, a, b) {
  const out = [];
  for (const [s, e] of intervals) {
    if (b <= s || a >= e) {
      out.push([s, e]);
      continue;
    }
    if (a > s) out.push([s, a]);
    if (b < e) out.push([b, e]);
  }
  return out;
}

export class World {
  constructor(petHeight) {
    this.petHeight = petHeight;
    this.width = 0;
    this.height = 0;
    this.windows = new Map();
    this.surfaces = [];
    this.walls = [];
    this.ready = false;
  }

  // Returns per-window movement since the previous update: Map<id, {dx, dy}>.
  update(data) {
    const moved = new Map();
    const next = new Map();
    for (const w of data.windows) {
      const r = { id: w.id, x: w.x, y: w.y, w: w.w, h: w.h, right: w.x + w.w, bottom: w.y + w.h, maximized: w.maximized, active: !!w.active };
      const prev = this.windows.get(w.id);
      if (prev && (prev.x !== r.x || prev.y !== r.y)) moved.set(w.id, { dx: r.x - prev.x, dy: r.y - prev.y });
      next.set(w.id, r);
    }
    this.windows = next;
    this.width = data.width;
    this.height = data.height;
    this.rebuild([...next.values()]);
    this.ready = true;
    return moved;
  }

  rebuild(order) {
    const W = this.width;
    const H = this.height;
    const minTop = this.petHeight * 1.05;
    const surfaces = [{ id: 'floor', y: H, x1: 0, x2: W }];
    const walls = [];

    order.forEach((r, i) => {
      const above = order.slice(0, i);

      if (!r.maximized && r.y >= minTop && r.y < H - 4) {
        let segs = [[Math.max(0, r.x), Math.min(W, r.right)]];
        for (const o of above) {
          if (o.y < r.y && o.bottom > r.y - 2) segs = subtract(segs, o.x, o.right);
        }
        for (const [x1, x2] of segs) if (x2 - x1 >= 24) surfaces.push({ id: r.id, y: r.y, x1, x2 });
      }

      if (r.maximized) return;
      for (const side of ['left', 'right']) {
        const x = side === 'left' ? r.x : r.right;
        if (x <= 0 || x >= W) continue;
        let segs = [[Math.max(0, r.y), Math.min(H, r.bottom)]];
        for (const o of above) {
          if (o.x < x + 1 && o.right > x - 1) segs = subtract(segs, o.y, o.bottom);
        }
        for (const [y1, y2] of segs) if (y2 - y1 >= 8) walls.push({ id: r.id, side, x, y1, y2, top: r.y });
      }
    });

    this.surfaces = surfaces;
    this.walls = walls;
  }

  window(id) {
    return this.windows.get(id);
  }

  // Surface segment belonging to `id` that contains x (with tolerance).
  surfaceAt(id, x, tol = 1) {
    for (const s of this.surfaces) {
      if (s.id === id && x >= s.x1 - tol && x <= s.x2 + tol) return s;
    }
    return null;
  }

  // First surface crossed when moving down from y0 to y1 at x.
  landing(x, y0, y1, exclude) {
    let best = null;
    for (const s of this.surfaces) {
      if (s.id === exclude) continue;
      if (x < s.x1 || x > s.x2) continue;
      if (s.y >= y0 - 0.5 && s.y <= y1 + 0.5 && (!best || s.y < best.y)) best = s;
    }
    return best;
  }

  wallAt(id, side, y, tol = 2) {
    for (const w of this.walls) {
      if (w.id === id && w.side === side && y >= w.y1 - tol && y <= w.y2 + tol) return w;
    }
    return null;
  }

  // Walls crossed while walking horizontally from x0 to x1 at height y.
  wallsCrossed(x0, x1, y, dir) {
    const side = dir > 0 ? 'left' : 'right';
    const lo = Math.min(x0, x1);
    const hi = Math.max(x0, x1);
    return this.walls.filter((w) => w.side === side && w.x >= lo && w.x <= hi && w.y1 < y - 2);
  }
}
