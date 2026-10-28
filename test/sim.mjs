// Headless behavior simulation: runs the pet over a fake desktop and checks invariants.
// Usage: node test/sim.mjs [minutes]
import { World } from '../src/renderer/world.js';
import { Pet } from '../src/renderer/behavior.js';

let seed = 12345;
Math.random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);

const cfg = {
  petHeight: 110, walkSpeed: 0.5, runSpeed: 1.4, climbSpeed: 0.4, gravity: 16, jumpReach: 1.6,
  climbChance: 0.6, emotes: ['extra0', 'extra1'],
};

const view = {
  pose: 'stand', facing: 'front', current: null, speed: 1,
  animator: {
    has: () => true,
    clips: new Map([['extra0', { loop: 'loop', length: 1.08 }], ['extra1', { loop: 'hold', length: 1.5 }]]),
  },
  setPose(p) {
    const tilted = (x) => x === 'climb' || x === 'lie';
    const changed = tilted(p) !== tilted(this.pose);
    this.pose = p;
    return changed;
  },
  setFacing(f) { this.facing = f; },
  setHold() {},
  handOffset: () => ({ x: -20, y: -130 }),
  play(n, o) { this.current = n; this.speed = o?.speed ?? 1; },
};

const W = 2560, H = 1392;
let windows = [
  { id: 'C', x: 900, y: 300, w: 500, h: 500 },
  { id: 'A', x: 300, y: 600, w: 900, h: 600 },
  { id: 'B', x: 1400, y: 400, w: 700, h: 950 },
];

const world = new World(cfg.petHeight);
const pet = new Pet(view, world, cfg);
const events = {};
pet.on((type) => (events[type] = (events[type] || 0) + 1));

// Scripted user input: [time (s), action]
const script = [
  [300, () => pet.pause()],
  [330, () => (script.pausedCheck = { mode: pet.mode, action: pet.action, x: pet.x })],
  [331, () => script.pausedCheck && (script.pausedCheck.moved = Math.abs(pet.x - script.pausedCheck.x) > 1)],
  [332, () => pet.resume()],
  [700, () => pet.pat()],
  [900, () => pet.grab(pet.x, pet.y - 80)],
  ...Array.from({ length: 60 }, (_, i) => [900.1 + i / 30, () => pet.drag(800 + i * 12, 500 - i * 4)]),
  [902.2, () => pet.release()],
  [1100, () => { pet.setSize(160); world.petHeight = 160; }],
  [1200, () => pet.restart()],
  [1300, () => pet.setSize(110)],
  [1350, () => pet.slap()],
  [1360, () => { pet.stats.hunger = 40; pet.feed({ cat: 'comidas', name: 'A', effects: { hunger: 30, health: 5 } }); pet.feed({ cat: 'bebidas', name: 'B', effects: { energy: 10 } }); }],
  [1361, () => (script.eatCheck = { action: pet.action, eating: pet.eating?.item.name, queued: pet.meals.length })],
  [1368, () => (script.eatCheck.after = { hunger: Math.round(pet.stats.hunger), eating: pet.eating?.item.name ?? null, queued: pet.meals.length })],
  [1369, () => { pet.stats.energy = 90; script.sleepRefused = !pet.putToSleep(); pet.stats.energy = 50; }],
  [1370, () => pet.putToSleep()],
  [1385, () => (script.sleepCheck = pet.action)],
  [1420, () => { pet.stats.energy = 80; script.chaseStarted = pet.play(); }],
  [1500, () => { pet.stats.hunger = 0; pet.stats.health = 0.3; }],
  [1560, () => (script.deadCheck = { dead: pet.dead, action: pet.action, mode: pet.mode })],
  [1570, () => pet.revive()],
  [1600, () => { script.toy = { started: pet.goTo(pet.x + 30, () => pet.playToy({ id: 'gameboy', dur: 3, gain: { mood: 1 }, hold: 'x', wobble: 0.08, onEnd: (i) => (script.toy.ended = !i) })) }; }],
  [1610, () => { pet.stats.mood = 50; script.watch = pet.startActivity('watch'); }],
  [1615, () => { script.watchAction = pet.action; pet.react('scare'); script.reactAction = pet.action; }],
  [1620, () => { script.afterReact = pet.action; pet.feed({ cat: 'comidas', name: 'W', effects: { hunger: 5 } }); }],
  [1640, () => { script.afterEatWatch = pet.action; pet.stopActivity(); pet.startActivity('jam'); }],
  [1650, () => { script.jamAction = pet.action; script.jamClip = view.current; pet.stopActivity(); }],
  [1660, () => { const m0 = pet.stats.mood; for (let i = 0; i < 8; i++) pet.pat(); script.patSpam = Math.round(pet.stats.mood - m0); }],
  [1670, () => { Object.assign(pet.stats, { health: 50, hunger: 75, mood: 95 }); script.h0 = pet.stats.health; }],
  [1700, () => { script.regenAt75 = pet.stats.health > script.h0 + 0.05; Object.assign(pet.stats, { hunger: 95, mood: 95 }); script.h1 = pet.stats.health; }],
  [1730, () => { script.regenAt95 = pet.stats.health > script.h1 + 0.05; }],
];
// Cursor wandering around (used by the chase).
const moveCursor = (t) => (pet.cursor = { x: 1200 + Math.sin(t * 0.7) * 700, y: 900 + Math.cos(t * 0.4) * 350 });
const send = () => pet.onWorldUpdate(world.update({ width: W, height: H, windows: windows.map((w) => ({ ...w })) }));
send();

const minutes = Number(process.argv[2] || 30);
const dt = 1 / 60;
const counts = {};
const transitions = {};
const errors = [];
let last = '';
let t = 0;
let moveTest = null;
const qte = { count: 0, seen: null, counted: false };
const sleepStarts = new Set();

for (let i = 0; i < minutes * 60 * 60; i++) {
  t += dt;
  if (i % 3 === 0) {
    // Mid-run: drag whatever window the pet stands on, then restore.
    if (!moveTest && t > 600 && pet.mode === 'ground' && pet.surfaceId !== 'floor' && pet.action !== 'land') {
      moveTest = { id: pet.surfaceId, startX: pet.x, startWinX: windows.find((w) => w.id === pet.surfaceId).x, steps: 0 };
    }
    if (moveTest && moveTest.steps < 20) {
      const w = windows.find((x) => x.id === moveTest.id);
      w.x += 5;
      w.y -= 2;
      moveTest.steps++;
      if (moveTest.steps === 20) moveTest.result = { mode: pet.mode, on: pet.surfaceId, winDx: w.x - moveTest.startWinX };
    }
    send();
  }
  while (script.length && script[0][0] <= t) script.shift()[1]();
  moveCursor(t);
  // QTE: mash ← → on the first catch (escape), give up on the next ones.
  if (pet.chase?.qte) {
    qte.seen = qte.seen || pet.chase.qte;
    if (qte.seen === pet.chase.qte && !qte.counted) { qte.count++; qte.counted = true; }
    if (qte.count === 1 && i % 6 === 0) pet.qtePress(i % 12 ? 'left' : 'right');
  } else {
    qte.seen = null;
    qte.counted = false;
  }
  const before = pet.action;
  pet.update(dt);
  if (before !== 'sleep' && pet.action === 'sleep' && pet.stats.energy > 70) sleepStarts.add(t.toFixed(1));

  const state = `${pet.mode}/${pet.action}`;
  counts[state] = (counts[state] || 0) + dt;
  if (state !== last) {
    const key = `${last} -> ${state}`;
    transitions[key] = (transitions[key] || 0) + 1;
    last = state;
  }

  if (!Number.isFinite(pet.x) || !Number.isFinite(pet.y)) errors.push(`t=${t.toFixed(1)} non-finite position`);
  if (pet.mode !== 'held' && (pet.x < 0 || pet.x > W || pet.y < 0 || pet.y > H + 1)) errors.push(`t=${t.toFixed(1)} out of screen ${pet.x},${pet.y}`);
  if (pet.mode === 'ground') {
    const s = world.surfaceAt(pet.surfaceId, pet.x, 2);
    if (!s) errors.push(`t=${t.toFixed(1)} grounded on missing surface ${pet.surfaceId}`);
    else if (Math.abs(s.y - pet.y) > 0.5) errors.push(`t=${t.toFixed(1)} floating ${pet.y} vs ${s.y}`);
  }
  if (pet.mode === 'wall' && pet.action !== 'jumpGrab' && !world.wallAt(pet.wall.id, pet.wall.side, pet.y, 3)) {
    errors.push(`t=${t.toFixed(1)} on missing wall`);
  }
  if (errors.length > 20) break;
}

console.log(`Simulated ${minutes} min\n\nTime per state (s):`);
for (const [k, v] of Object.entries(counts).sort((a, b) => b[1] - a[1])) console.log(`  ${k.padEnd(22)} ${v.toFixed(0)}`);
console.log('\nTransitions:');
for (const [k, v] of Object.entries(transitions).sort((a, b) => b[1] - a[1])) console.log(`  ${k.padEnd(40)} ${v}`);
console.log('\nWindow drag test:', JSON.stringify(moveTest));
console.log('Pause check:', JSON.stringify(script.pausedCheck));
console.log('Events:', JSON.stringify(events));
console.log('Sleep check:', script.sleepCheck, '| chase started:', script.chaseStarted, '| death check:', JSON.stringify(script.deadCheck));
console.log('Eat check:', JSON.stringify(script.eatCheck), '| sleep refused at 90%:', script.sleepRefused);
console.log('QTEs:', qte.count, '| escapes event:', events.qteEscape || 0, '| sleeps started above 70% energy:', sleepStarts.size);
const pick = (o, ...k) => Object.fromEntries(k.map((x) => [x, o[x]]));
console.log('New:', JSON.stringify(pick(script, 'toy', 'watch', 'watchAction', 'reactAction', 'afterReact', 'afterEatWatch', 'jamAction', 'jamClip', 'patSpam', 'regenAt75', 'regenAt95')));
console.log('Stats:', Object.entries(pet.stats).map(([k, v]) => `${k}=${v.toFixed(0)}`).join(' '));
console.log(`\nErrors: ${errors.length}`);
for (const e of errors) console.log('  ' + e);
process.exit(errors.length ? 1 : 0);
