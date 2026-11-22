// Demo build (scripts/demo.mjs turns DEMO on while building): smaller shop, toys and minigames, no time limit.
export const DEMO = false;

// BETA edition (scripts/build-edition.mjs keeps this on; the plain 2.0 build turns it off).
// When false, Streamer Mode, Twitch, AI and Push-to-Talk are hidden and inert.
export const STREAM = true;
export const streamEnabled = () => STREAM;

const DEMO_ITEMS = new Set([
  'sobras', 'mochi', 'onigiri', 'dango', 'takoyaki', 'ramen', 'pipoca_p', 'bento',
  'agua_torneira', 'soda_p', 'matcha', 'bubble_matcha',
  'vitamina', 'curativo', 'remedio',
  'ioio', 'bola', 'cubo', 'pelucia', 'gameboy',
  'cart_pong', 'cart_flappy', 'cart_breakout',
  'almofada', 'globo', 'cama', 'banheira', 'gacha',
]);
const DEMO_MINIGAMES = new Set(['jokenpo', 'copos', 'bolhas']);

export const demoLocked = (id) => DEMO && !DEMO_ITEMS.has(id);
export const demoGameLocked = (id) => DEMO && !DEMO_MINIGAMES.has(id);
export const editionLabel = (label = 'First Release') => (DEMO ? 'Demo' : label);
// Releases count in steps of 0.1 (1.0, 1.1...); the semver patch stays 0 and is hidden.
export const shortVersion = (v) => String(v || '').replace(/^(\d+\.\d+)\.0$/, '$1');
