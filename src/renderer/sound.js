// Sound effects: WAV samples from assets/sfx plus synthesized 8-bit chewing/gulping.

const SETS = {
  bonk: ['collide/bonk-', 6],
  hit: ['collide/hit-', 7],
  explode: ['collide/explode-', 3],
  jump: ['player/jump-', 10],
  footstep: ['player/footstep', 0],
  landing: ['player/landing', 0],
  blastoff: ['player/blast-off-2', 0],
  teleport: ['player/teleport', 0],
  blip: ['ui/blip-', 2],
  ok: ['ui/ok-', 3],
  cancel: ['ui/cancel-', 3],
  fury: ['powerup/epico_4_hyperflash', 0],
};

const rand = (a, b) => a + Math.random() * (b - a);

// Seeded RNG for the generated 8-bit sound set.
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Pitch / length character of each sample set, used to generate its 8-bit replacement.
const SYNTH_BASE = {
  bonk: [180, 0.5, 0.12, 0.6], hit: [140, 0.4, 0.18, 0.8], explode: [90, 0.3, 0.45, 1], jump: [300, 2.2, 0.16, 0],
  footstep: [120, 0.7, 0.04, 0.7], landing: [110, 0.5, 0.1, 0.6], blastoff: [200, 3, 0.35, 0.3], teleport: [400, 2.5, 0.3, 0],
  blip: [660, 1.1, 0.05, 0], ok: [520, 1.5, 0.14, 0], cancel: [420, 0.6, 0.14, 0],
  fury: [200, 2.8, 0.55, 0.35],
};
const VOWEL = { a: 1, e: 1.18, i: 1.4, o: 0.88, u: 0.78 };

export const SOUND_THEMES = {
  padrao: { label: 'Padrão', pitch: 1, len: 1 },
  gameboy: { label: 'GameBuddy', wave: 'square', pitch: 1, len: 0.9 },
  suave: { label: 'Suave', wave: 'sine', pitch: 0.9, len: 1.2 },
  retro: { label: 'Retrô', wave: 'triangle', pitch: 1, len: 1 },
  synth: { label: 'Synthwave', wave: 'sawtooth', pitch: 0.8, len: 1.3 },
  fofo: { label: 'Fofo', pitch: 1.5, len: 0.8 },
  grave: { label: 'Grave', pitch: 0.6, len: 1.1 },
};

export class Sound {
  constructor(cfg) {
    this.cfg = cfg;
    this.buffers = new Map();
    this.last = new Map();
    this.ctx = null;
    this.crowVol = 1;
    this.crowFlapVol = 1;
    this.dnd = false; // transient Do Not Disturb: silences everything without touching config
    this.ducked = false; // TTS is talking: SFX and music dip so the voice is clear
    try {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
      // The regular background music has its own bus: the combat mode pauses it without
      // touching the sound effects (and the combat track plays on its own node).
      this.musicBus = this.ctx.createGain();
      this.musicBus.connect(this.master);
      this.musicPaused = false;
      // Crow (and wing flaps) on their own buses so their sliders never scale other SFX.
      this.crowBus = this.ctx.createGain();
      this.crowFlapBus = this.ctx.createGain();
      this.crowBus.connect(this.master);
      this.crowFlapBus.connect(this.master);
      this.applyVolume();
      this.applyCrowVolume();
    } catch {
      this.ctx = null;
    }
    this.reseed();
    this.ctx?.addEventListener('statechange', () => { this.applyVolume(); this.applyCrowVolume(); });
    const unlock = () => this.ctx?.state === 'suspended' && this.ctx.resume().catch(() => {});
    window.addEventListener('pointerdown', unlock, true);
    window.addEventListener('keydown', unlock, true);
  }

  async load() {
    if (!this.ctx) return;
    const jobs = [];
    for (const [name, [path, count]] of Object.entries(SETS)) {
      const files = count ? Array.from({ length: count }, (_, i) => `${path}${i + 1}.wav`) : [`${path}.wav`];
      this.buffers.set(name, []);
      for (const file of files) {
        jobs.push(
          fetch(new URL(`./assets/sfx/${file}`, import.meta.url))
            .then((r) => r.arrayBuffer())
            .then((b) => this.ctx.decodeAudioData(b))
            .then((buf) => this.buffers.get(name).push(buf))
            .catch(() => {}),
        );
      }
    }
    await Promise.all(jobs);
  }

  get enabled() {
    return !!this.ctx && this.cfg.sound !== false && !this.dnd;
  }

  setDnd(on) {
    this.dnd = !!on;
    if (this.dnd && this.master) this.master.gain.value = 0;
    else if (!this.dnd) this.applyVolume();
  }

  applyVolume() {
    if (!this.master) return;
    if (this.dnd) { this.master.gain.value = 0; return; }
    const vol = Math.max(0, Math.min(1, this.cfg.volume ?? 0.3));
    this.master.gain.value = this.ducked ? vol * 0.35 : vol;
  }

  // Smooth duck/restore around Kokoro speech (does not touch the saved volume).
  setDucking(on) {
    if (!this.master || !!on === !!this.ducked) return;
    this.ducked = !!on;
    if (this.dnd) return;
    const vol = Math.max(0, Math.min(1, this.cfg.volume ?? 0.3));
    this.master.gain.setTargetAtTime(this.ducked ? vol * 0.35 : vol, this.ctx.currentTime, this.ducked ? 0.08 : 0.2);
  }

  applyCrowVolume() {
    if (this.crowBus) this.crowBus.gain.value = Math.max(0, Math.min(2, this.crowVol ?? 1));
    if (this.crowFlapBus) this.crowFlapBus.gain.value = Math.max(0, Math.min(2, this.crowFlapVol ?? 1));
  }

  // The regular music goes down (combat mode) and comes back afterwards.
  pauseMusic() {
    if (!this.musicBus || this.musicPaused) return;
    this.musicPaused = true;
    this.musicBus.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.12);
  }

  resumeMusic() {
    if (!this.musicBus || !this.musicPaused) return;
    this.musicPaused = false;
    this.musicBus.gain.setTargetAtTime(1, this.ctx.currentTime, 0.2);
  }

  // cfg.soundSeed set: every sample set is replaced by a generated 8-bit sound (new seed = new set).
  reseed() {
    const seed = this.cfg.soundSeed;
    this.synth = null;
    this.voiceWave = this.voiceBase = null;
    if (!seed) return;
    const r = rng(seed);
    const waves = ['square', 'triangle', 'sawtooth', 'square'];
    this.synth = {};
    for (const [name, [f, sweep, dur, noise]] of Object.entries(SYNTH_BASE)) {
      this.synth[name] = {
        wave: waves[Math.floor(r() * waves.length)],
        f: f * (0.6 + r() * 0.9),
        sweep: sweep * (0.7 + r() * 0.6),
        dur: dur * (0.7 + r() * 0.7),
        noise: noise * (0.5 + r()),
        arp: r() < 0.35 ? 1 + Math.floor(r() * 3) : 0,
      };
    }
    this.voiceWave = waves[Math.floor(r() * 3)];
    this.voiceBase = 0.75 + r() * 0.6;
  }

  playSynth(name, volume, rate) {
    const s = this.synth[name];
    if (!s) return;
    const t = this.ctx.currentTime + 0.005;
    const f0 = s.f * rate * rand(0.95, 1.05);
    const v = 0.12 * volume;
    const steps = s.arp + 1;
    for (let i = 0; i < steps; i++) {
      const ti = t + (i * s.dur) / steps;
      const fi = f0 * (1 + i * 0.25);
      this.tone(s.wave, fi, fi * s.sweep, ti, s.dur / steps, v);
    }
    if (s.noise > 0.05) this.noise(t, s.dur, v * s.noise * 2, f0 * 4);
  }

  // Resourcepack sounds (name -> [data URLs]) replace the matching sample sets; null restores them.
  async setPack(map) {
    this.pack = null;
    if (!map || !this.ctx) return;
    const pack = new Map();
    for (const [name, urls] of Object.entries(map)) {
      const bufs = [];
      for (const u of urls) {
        try {
          bufs.push(await this.ctx.decodeAudioData(await (await fetch(u)).arrayBuffer()));
        } catch {}
      }
      if (bufs.length) pack.set(name, bufs);
    }
    this.pack = pack;
  }

  // Random variation of a sample set, never the same one twice in a row.
  play(name, { volume = 1, rate = 1, vary = 0.06 } = {}) {
    if (!this.enabled) return;
    if (this.synth && !this.pack?.has(name)) return this.playSynth(name, volume, rate);
    const list = this.pack?.get(name) || this.buffers.get(name);
    if (!list?.length) return;
    let i = Math.floor(Math.random() * list.length);
    if (list.length > 1 && i === this.last.get(name)) i = (i + 1) % list.length;
    this.last.set(name, i);
    const src = this.ctx.createBufferSource();
    src.buffer = list[i];
    src.playbackRate.value = rate * rand(1 - vary, 1 + vary);
    const g = this.ctx.createGain();
    g.gain.value = volume;
    src.connect(g).connect(this.master);
    src.start();
  }

  // ---------- synthesized 8-bit eating sounds ----------

  tone(type, f0, f1, t0, dur, vol, dest) {
    if (this.dnd) return;
    const c = this.ctx;
    const o = c.createOscillator();
    const g = c.createGain();
    const th = SOUND_THEMES[this.cfg?.soundTheme] || SOUND_THEMES.padrao;
    type = th.wave || type;
    f0 *= th.pitch;
    f1 *= th.pitch;
    dur *= th.len;
    o.type = type;
    o.frequency.setValueAtTime(f0, t0);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(g).connect(dest || this.master);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }

  noise(t0, dur, vol, freq = 1800, dest) {
    if (this.dnd) return;
    const c = this.ctx;
    if (!this.noiseBuf) {
      // Coarse sample-and-hold noise sounds more "chiptune" than white noise.
      const len = Math.floor(c.sampleRate * 0.5);
      const buf = c.createBuffer(1, len, c.sampleRate);
      const d = buf.getChannelData(0);
      let v = 0;
      for (let i = 0; i < len; i++) {
        if (i % 6 === 0) v = Math.random() * 2 - 1;
        d[i] = v;
      }
      this.noiseBuf = buf;
    }
    const src = c.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = c.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = freq;
    f.Q.value = 1.2;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(f).connect(g).connect(dest || this.master);
    src.start(t0, Math.random() * 0.3);
    src.stop(t0 + dur + 0.02);
  }

  // One bite: a crunchy blip followed by a couple of chews.
  chew() {
    if (!this.enabled) return;
    const t = this.ctx.currentTime + 0.01;
    this.noise(t, 0.07, 0.5, rand(1500, 2600));
    this.tone('square', rand(220, 280), 90, t, 0.06, 0.12);
    for (let i = 1; i <= 2; i++) {
      const ti = t + i * rand(0.16, 0.2);
      this.tone('square', rand(150, 190), 70, ti, 0.07, 0.09);
      this.noise(ti, 0.05, 0.25, rand(900, 1400));
    }
  }

  // Swallowing food: a falling "glup".
  swallow() {
    if (!this.enabled) return;
    const t = this.ctx.currentTime + 0.01;
    this.tone('triangle', 420, 110, t, 0.16, 0.35);
    this.tone('square', 140, 70, t + 0.12, 0.1, 0.08);
  }

  // A sip of a drink: two quick rising bubbles.
  sip() {
    if (!this.enabled) return;
    const t = this.ctx.currentTime + 0.01;
    this.noise(t, 0.12, 0.18, 3200);
    for (let i = 0; i < 2; i++) {
      const ti = t + 0.06 + i * 0.13;
      this.tone('triangle', rand(180, 220), rand(480, 560), ti, 0.1, 0.3);
    }
  }

  tone8(f0, f1, dur, type = 'square', vol = 0.1) {
    if (!this.enabled) return;
    this.tone(type, f0, f1, this.ctx.currentTime + 0.005, dur, vol);
  }

  bell(strength = 1) {
    if (!this.enabled) return;
    const t = this.ctx.currentTime + 0.005;
    const v = 0.06 + 0.08 * Math.min(1, strength);
    this.tone('square', 1568, 1560, t, 0.25, v);
    this.tone('triangle', 2350, 2340, t, 0.35, v * 0.8);
  }

  // The Persocon's voice: one 8-bit syllable with her timbre (soundSeed wave/base pitch + Tom/Volume options).
  syllable(t, k = 1, glide = rand(0.8, 1.25), dur = 0.07) {
    const pitch = ({ grave: 0.6, normal: 1, agudo: 1.6 }[this.cfg.voicePitch] ?? 1) * (this.voiceBase || 1);
    const f = 420 * k * pitch * rand(0.96, 1.04);
    this.tone(this.voiceWave || 'square', f, f * glide, t, dur, (this.cfg.voiceVolume ?? 0.7) * 0.18);
  }

  // Animal-crossing style babble: a few random syllables.
  voice(syllables = 4) {
    if (!this.enabled) return;
    let t = this.ctx.currentTime + 0.01;
    for (let i = 0; i < syllables; i++) {
      this.syllable(t, rand(0.76, 1.24));
      t += rand(0.08, 0.12);
    }
  }

  // Typed letter in the speech balloon: each vowel (or a lone consonant run) is one syllable of her voice.
  speak(ch) {
    if (!this.enabled || !ch || ch === ' ') return;
    const c = ch.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const now = this.ctx.currentTime;
    const gap = now - (this.lastSyl ?? -1);
    const v = VOWEL[c];
    let k, glide;
    if (v) {
      if (gap < 0.06) return;
      k = 1 + (v - 1) * 0.6;
      glide = c === 'i' ? 1.1 : rand(0.85, 1.05);
    } else if ('!?'.includes(c)) {
      k = 1.15;
      glide = c === '?' ? 1.35 : 0.75;
    } else if (/[a-z0-9]/.test(c) && gap > 0.14) {
      k = 0.9 + (c.charCodeAt(0) % 5) * 0.04;
      glide = 0.9;
    } else return;
    this.lastSyl = now;
    this.syllable(now + 0.005, k, glide, '!?'.includes(c) ? 0.1 : 0.07);
  }

  // Hookshot: chain rattling out, metallic clank when it hits, ratchet while reeling.
  hookshot(kind) {
    if (!this.enabled) return;
    const t = this.ctx.currentTime + 0.005;
    if (kind === 'fire') {
      this.tone('square', 1200, 600, t, 0.06, 0.08);
      for (let i = 0; i < 6; i++) this.tone('square', 2200 - i * 150, 1800 - i * 150, t + 0.03 + i * 0.035, 0.02, 0.05);
    } else if (kind === 'hit') {
      this.tone('square', 1760, 1700, t, 0.12, 0.1);
      this.tone('triangle', 2640, 2600, t, 0.2, 0.07);
      this.noise(t, 0.06, 0.25, 4000);
      for (let i = 0; i < 5; i++) this.tone('square', 900, 850, t + 0.12 + i * 0.05, 0.02, 0.05);
    } else {
      this.tone('square', 700, 1400, t, 0.05, 0.06);
    }
  }

  // Bamboo sword cutting the air.
  swish() {
    if (!this.enabled) return;
    const t = this.ctx.currentTime + 0.005;
    this.noise(t, 0.14, 0.35, rand(2500, 3800));
    this.tone('triangle', rand(900, 1100), 300, t, 0.12, 0.05);
  }

  // Stomach rumble: low wobbling square + noise; k 0..1 = how hungry (louder, longer).
  growl(k = 0.5) {
    if (!this.enabled) return;
    const t = this.ctx.currentTime + 0.01;
    const v = 0.05 + 0.2 * k;
    const n = 3 + Math.round(k * 5);
    for (let i = 0; i < n; i++) {
      const f = rand(55, 85) * (1 - k * 0.2);
      this.tone('square', f, f * rand(0.7, 1.3), t + i * 0.09, 0.11, v);
    }
    this.noise(t, 0.12 * n, v * 0.6, 160);
  }

  // Potion / power-up: rising arpeggio, longer and brighter the stronger the item (k 0..1).
  powerup(k = 0.5) {
    if (!this.enabled) return;
    const t = this.ctx.currentTime + 0.01;
    const steps = 4 + Math.round(k * 8);
    const base = 330 + k * 120;
    for (let i = 0; i < steps; i++) {
      const f = base * Math.pow(2, (i * [0, 4, 7, 12][i % 4] / 12 + Math.floor(i / 4)) / 3);
      this.tone('square', f, f * 1.01, t + i * 0.055, 0.09, 0.07);
      if (k > 0.5) this.tone('triangle', f * 2, f * 2, t + i * 0.055, 0.07, 0.04);
    }
    if (k > 0.6) this.noise(t + steps * 0.055, 0.35, 0.2, 6000);
  }

  // Karaoke / random singing: a short 8-bit melody in a random style.
  sing(style = 'pop', bars = 2) {
    if (!this.enabled) return;
    const scales = { pop: [0, 2, 4, 7, 9], blues: [0, 3, 5, 6, 7, 10], rock: [0, 3, 5, 7, 10], jazz: [0, 2, 3, 5, 7, 9, 10], enka: [0, 1, 5, 7, 8] };
    const sc = scales[style] || scales.pop;
    const pitch = ({ grave: 0.6, normal: 1, agudo: 1.6 }[this.cfg.voicePitch] ?? 1) * (this.voiceBase || 1);
    const vol = (this.cfg.voiceVolume ?? 0.7) * 0.14;
    let t = this.ctx.currentTime + 0.01;
    for (let i = 0; i < bars * 6; i++) {
      const n = sc[Math.floor(Math.random() * sc.length)] + (Math.random() < 0.3 ? 12 : 0);
      const f = 440 * pitch * Math.pow(2, n / 12);
      const d = [0.15, 0.3, 0.15, 0.45][i % 4];
      this.tone(this.voiceWave || 'square', f, f * 1.005, t, d * 0.9, vol);
      t += d;
    }
  }

  // End of a drink: a refreshed "ahh" chirp.
  refreshed() {
    if (!this.enabled) return;
    const t = this.ctx.currentTime + 0.01;
    this.tone('square', 520, 780, t, 0.08, 0.08);
    this.tone('square', 780, 1040, t + 0.09, 0.1, 0.07);
  }

  // Notes one after the other: [[freq, dur], ...] (freq 0 = rest).
  seq(notes, type = 'square', vol = 0.05, gap = 0) {
    if (!this.enabled) return;
    let t = this.ctx.currentTime + 0.01;
    for (const [f, d] of notes) {
      if (f) this.tone(type, f, f * 1.003, t, d * 0.92, vol);
      t += d + gap;
    }
  }

  // Named 8-bit effects for the machines and the video games (k scales the volume).
  sfx(name, k = 1) {
    if (!this.enabled) return;
    const t = this.ctx.currentTime + 0.01;
    const v = 0.05 * k;
    const T = (type, f0, f1, at, dur, vol = v) => this.tone(type, f0, f1, t + at, dur, vol);
    const N = (at, dur, vol, f) => this.noise(t + at, dur, vol * k, f);
    switch (name) {
      case 'coin': T('square', 988, 988, 0, 0.06); T('square', 1319, 1319, 0.06, 0.2); break;
      case 'clink': T('triangle', rand(2400, 3000), 2200, 0, 0.05, v * 0.8); T('square', 1600, 1500, 0.04, 0.04, v * 0.4); break;
      case 'jump': T('square', 300, 900, 0, 0.14); break;
      case 'hit': N(0, 0.12, 0.25, 900); T('sawtooth', 300, 80, 0, 0.14); break;
      case 'laser': T('square', 1800, 300, 0, 0.12); break;
      case 'explode': N(0, 0.4, 0.35, 500); T('square', 120, 40, 0, 0.35); break;
      case 'powerup': [523, 659, 784, 1047, 1319].forEach((f, i) => T('square', f, f, i * 0.05, 0.07)); break;
      case 'levelup': [392, 523, 659, 784, 1047, 784, 1047].forEach((f, i) => T('square', f, f, i * 0.08, 0.1)); break;
      case 'gameover': [494, 466, 440, 415].forEach((f, i) => T('triangle', f, f * 0.98, i * 0.22, 0.24, v * 1.4)); break;
      case 'select': T('square', 660, 660, 0, 0.04); T('square', 990, 990, 0.05, 0.05); break;
      case 'beep': T('square', 1320, 1320, 0, 0.07); break;
      case 'pop': T('sine', 880, 240, 0, 0.09, v * 1.4); T('triangle', 1400, 700, 0.01, 0.05, v * 0.5); break;
      case 'beep2': T('square', 1320, 1320, 0, 0.06); T('square', 1760, 1760, 0.09, 0.08); break;
      case 'buzz': T('sawtooth', 140, 120, 0, 0.3); break;
      case 'ding': T('triangle', 1760, 1750, 0, 0.4, v * 1.2); T('square', 2637, 2630, 0, 0.12, v * 0.4); break;
      case 'clunk': N(0, 0.08, 0.3, 400); T('square', 160, 60, 0, 0.12, v * 1.4); break;
      case 'bonk': T('square', 220, 90, 0, 0.1, v * 1.4); N(0, 0.05, 0.2, 700); break;
      case 'whirr': for (let i = 0; i < 8; i++) T('square', 180 + (i % 2) * 40, 170, i * 0.06, 0.05, v * 0.5); break;
      case 'puff': N(0, 0.25, 0.25, 2600); N(0.28, 0.22, 0.2, 2400); break;
      case 'tvon': T('sine', 60, 15000, 0, 0.18, v * 0.5); N(0, 0.2, 0.12, 5000); break;
      case 'drumroll': for (let i = 0; i < 14; i++) N(i * 0.045, 0.04, 0.15 + i * 0.01, 300); break;
      case 'ratchet': for (let i = 0; i < 6; i++) T('square', 420 - i * 20, 260, i * 0.05, 0.03, v * 0.8); break;
      case 'wahwah': [392, 370, 349, 330].forEach((f, i) => T('triangle', f, f * 0.94, i * 0.28, i === 3 ? 0.6 : 0.26, v * 1.2)); break;
      case 'boing': T('square', 200, 600, 0, 0.08); T('square', 600, 250, 0.08, 0.14); break;
      case 'chime': [1047, 1319, 1568, 2093].forEach((f, i) => T('triangle', f, f, i * 0.07, 0.3, v)); break;
      case 'jingle': [784, 988, 1175, 1568, 1175, 1568].forEach((f, i) => T('square', f, f, i * 0.07, 0.08)); break;
      case 'bell': [1568, 2093, 1568, 2093, 2637].forEach((f, i) => T('triangle', f, f, i * 0.09, 0.2, v)); break;
      case 'tick': T('square', 1800, 1700, 0, 0.015, v * 0.5); break;
      case 'can': N(0, 0.15, 0.35, 4500); T('square', 900, 700, 0, 0.04, v * 0.6); break;
      case 'whoosh': N(0, 0.3, 0.2, 1200); break;
      case 'heartbeat': T('sine', 70, 50, 0, 0.1, v * 3); T('sine', 70, 50, 0.16, 0.1, v * 2.4); break;
      case 'fanfare': [[523, 0.1], [523, 0.1], [523, 0.1], [698, 0.35]].reduce((at, [f, d]) => (T('square', f, f, at, d), at + d), 0); break;
      case 'rub': N(0, 0.16, 0.1, rand(2600, 3400)); T('sine', rand(700, 820), rand(900, 1050), 0.03, 0.12, v * 0.35); break;
      case 'purr': for (let i = 0; i < 6; i++) T('triangle', 95 + (i % 2) * 12, 90, i * 0.05, 0.045, v * 0.9); break;
      case 'slap': N(0, 0.06, 0.6, 5200); N(0.01, 0.1, 0.35, 1800); T('square', 900, 180, 0, 0.07, v * 1.2); break;
      case 'ouch': T('square', 700, 1100, 0, 0.06, v * 0.7); T('square', 1100, 520, 0.06, 0.16, v * 0.7); break;
      case 'tramp': T('triangle', 120, 520, 0, 0.16, v * 2); T('sine', 260, 180, 0, 0.3, v * 1.2); for (let i = 0; i < 5; i++) T('square', 1100 - i * 90, 1000 - i * 90, 0.02 + i * 0.035, 0.025, v * 0.3); break;
      case 'trampLand': N(0, 0.06, 0.25, 500); T('triangle', 160, 90, 0, 0.12, v * 1.5); break;
      case 'bedBounce': N(0, 0.12, 0.2, 380); T('sine', 140, 230, 0, 0.18, v * 1.4); T('triangle', 900, 860, 0.03, 0.05, v * 0.25); break;
      case 'shatter': N(0, 0.25, 0.4, 5600); [2900, 3700, 2400, 4200].forEach((f, i) => T('triangle', f, f * 0.9, 0.02 + i * 0.04, 0.06, v * 0.6)); T('square', 180, 60, 0, 0.12, v * 1.2); break;
      case 'tvstatic': N(0, 0.35, 0.18, 6000); break;
    }
  }

  // The crow (crow.js): raspy stepped caws, wing flaps and pecks. Same minimum-gap rule as toy().
  // Volumes live on crowBus / crowFlapBus (never multiplied into shared tone/noise levels).
  crow(name, k = 1) {
    if (!this.enabled || k <= 0) return;
    const flap = name === 'flap' || name === 'takeoff' || name === 'land';
    if (flap ? (this.crowFlapVol ?? 1) <= 0 : (this.crowVol ?? 1) <= 0) return;
    // Synth tones are far quieter than the recorded effects; this keeps the crow audible next to them.
    const loud = 3.5;
    if (this.crowRon && RON_VOICE.has(name)) {
      const jingle = name === 'learn' || name === 'gift';
      this.ronClip(k, jingle);
      if (!jingle) return;
      name += 'Ron';
    }
    const now = this.ctx.currentTime;
    this.crowAt ||= new Map();
    if (now - (this.crowAt.get(name) ?? -9) < ({ flap: 0.12, peck: 0.08, hop: 0.1 }[name] ?? 0.25)) return;
    this.crowAt.set(name, now);
    const t = now + 0.01;
    const bus = flap ? this.crowFlapBus : this.crowBus;
    const v = 0.05 * k * loud;
    const T = (type, f0, f1, at, dur, vol = v) => this.tone(type, f0, f1, t + at, dur, vol, bus);
    const N = (at, dur, vol, f) => this.noise(t + at, dur, vol * k * loud, f, bus);
    // "Kraa": a falling sawtooth chopped into steps, a square an octave and a half up and a breath of noise.
    const caw = (at, f, len = 6, step = 0.03) => {
      for (let i = 0; i < len; i++) {
        const fi = f * (1 - i * 0.06) * (i % 2 ? 0.94 : 1);
        T('sawtooth', fi, fi * 0.97, at + i * step, step + 0.006, v * 1.1);
        T('square', fi * 1.5, fi * 1.45, at + i * step, step, v * 0.35);
      }
      N(at, len * step, 0.12, 1700);
    };
    switch (name) {
      case 'caw': caw(0, rand(640, 760)); break;
      case 'caw2': caw(0, rand(660, 740), 5); caw(0.24, rand(600, 680), 6); break;
      case 'caw3': caw(0, 720, 4, 0.025); caw(0.16, 700, 4, 0.025); caw(0.34, 640, 7); break;
      case 'squawk': caw(0, 980, 4, 0.022); T('square', 1400, 700, 0.09, 0.08, v * 0.6); break;
      case 'coo': T('triangle', 380, 520, 0, 0.08, v * 1.4); T('triangle', 520, 400, 0.09, 0.1, v * 1.2); break;
      case 'flap': N(0, 0.05, 0.16, rand(1100, 1500)); T('square', 140, 90, 0, 0.04, v * 0.5); break;
      case 'takeoff': for (let i = 0; i < 4; i++) { N(i * 0.08, 0.05, 0.18, 1200 + i * 150); T('square', 150 + i * 30, 110, i * 0.08, 0.04, v * 0.5); } T('triangle', 300, 900, 0.05, 0.25, v * 0.5); break;
      case 'land': N(0, 0.05, 0.2, 700); T('square', 200, 90, 0, 0.06, v * 0.9); break;
      case 'peck': T('square', rand(1500, 1800), 1200, 0, 0.018, v * 0.9); N(0, 0.02, 0.2, 3800); break;
      case 'hop': T('square', 420, 640, 0, 0.05, v * 0.6); break;
      case 'learn': [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => T('square', f, f, i * 0.07, 0.09, v * 0.9)); caw(0.55, 760, 5); break;
      case 'gift': [1319, 1568, 2093].forEach((f, i) => T('triangle', f, f, i * 0.06, 0.18, v)); caw(0.25, 700, 4); break;
      case 'learnRon': [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => T('square', f, f, i * 0.07, 0.09, v * 0.6)); break;
      case 'giftRon': [1319, 1568, 2093].forEach((f, i) => T('triangle', f, f, i * 0.06, 0.18, v * 0.7)); break;
      case 'grab': T('square', 600, 1200, 0, 0.06, v * 0.8); T('square', 1200, 1200, 0.07, 0.05, v * 0.6); break;
      case 'trainOk': T('square', 660, 660, 0, 0.06, v * 0.8); T('square', 990, 990, 0.07, 0.09, v * 0.8); break;
      case 'trainMiss': T('triangle', 400, 300, 0, 0.12, v); T('triangle', 300, 220, 0.13, 0.16, v); break;
    }
  }

  // Crow easter egg: real voice clips, one at a time with a gap (force skips the gap, never the overlap).
  async ronClip(k = 1, force = false) {
    const now = this.ctx.currentTime;
    if (now < (this.ronEnd ?? 0) || (!force && now - (this.ronEnd ?? -9) < 2.5)) return;
    this.ronEnd = now + 0.5;
    if (!this.ron) {
      this.ron = new Map();
      await Promise.all(Object.keys(RON_CLIPS).map((n) =>
        fetch(new URL(`./assets/crow/ron/${n}.mp3`, import.meta.url))
          .then((r) => r.arrayBuffer())
          .then((b) => this.ctx.decodeAudioData(b))
          .then((buf) => this.ron.set(n, buf))
          .catch(() => {})));
    }
    const names = [...this.ron.keys()].filter((n) => n !== this.ronLast);
    if (!this.enabled) return;
    if (!names.length) {
      this.ronEnd = 0;
      this.crowRon = false;
      this.crow('caw', k);
      this.crowRon = true;
      return;
    }
    const n = names[Math.floor(Math.random() * names.length)];
    this.ronLast = n;
    const src = this.ctx.createBufferSource();
    src.buffer = this.ron.get(n);
    const g = this.ctx.createGain();
    g.gain.value = 0.9 * Math.min(2.4, k);
    src.connect(g).connect(this.crowBus || this.master);
    src.start();
    this.ronEnd = this.ctx.currentTime + src.buffer.duration;
    this.onRon?.(RON_CLIPS[n], src.buffer.duration);
  }

  // Toy effects (funtoys.js, toys.js, the Doll). Each name has a minimum gap, so per-frame callers never pile up.
  toy(name, k = 1) {
    if (!this.enabled) return;
    const now = this.ctx.currentTime;
    this.toyAt ||= new Map();
    if (now - (this.toyAt.get(name) ?? -9) < (TOY_GAP[name] ?? 0.1)) return;
    this.toyAt.set(name, now);
    const t = now + 0.01;
    const v = 0.05 * k;
    const T = (type, f0, f1, at, dur, vol = v) => this.tone(type, f0, f1, t + at, dur, vol);
    const N = (at, dur, vol, f) => this.noise(t + at, dur, vol * k, f);
    switch (name) {
      case 'yoyoDown': T('triangle', 1500, 700, 0, 0.12, v * 0.7); N(0, 0.1, 0.06, 5200); break;
      case 'yoyoUp': T('triangle', 700, 1500, 0, 0.1, v * 0.7); break;
      case 'yoyoCatch': T('square', 1250, 1250, 0, 0.025, v * 0.8); N(0, 0.03, 0.15, 3000); break;
      case 'yoyoSpin': for (let i = 0; i < 4; i++) T('triangle', 1100 + i * 90, 1000 + i * 90, i * 0.05, 0.04, v * 0.4); break;
      case 'hoopSwish': N(0, 0.14, 0.09, 1600 + rand(-200, 200)); T('triangle', 230, 290, 0, 0.1, v * 0.25); break;
      case 'hoopDrop': T('square', 320, 160, 0, 0.05, v * 1.1); T('square', 260, 130, 0.09, 0.05, v * 0.8); T('square', 220, 110, 0.15, 0.04, v * 0.5); N(0, 0.2, 0.2, 700); break;
      case 'kiteFlap': N(0, 0.06, 0.14, 2300); N(0.09, 0.05, 0.1, 2700); break;
      case 'kiteWind': N(0, 0.9, 0.05, 650); T('sine', 300, 360, 0, 0.9, v * 0.12); break;
      case 'kiteReel': for (let i = 0; i < 5; i++) T('square', 1900, 1800, i * 0.045, 0.012, v * 0.5); break;
      case 'cubeTwist': N(0, 0.035, 0.22, 3600); T('square', rand(1500, 1900), 1250, 0, 0.022, v * 0.45); break;
      case 'cubeSolve': [784, 988, 1175, 1568].forEach((f, i) => T('square', f, f, i * 0.06, 0.08, v * 0.9)); T('triangle', 3136, 3130, 0.24, 0.3, v * 0.5); break;
      case 'cubeGrr': T('sawtooth', 150, 110, 0, 0.18, v * 0.6); break;
      case 'skateRoll': N(0, 0.24, 0.05, 240); break;
      case 'skatePop': N(0, 0.04, 0.32, 1400); T('square', 650, 220, 0, 0.05, v); break;
      case 'skateLand': N(0, 0.07, 0.3, 480); T('square', 150, 70, 0, 0.07, v * 1.2); break;
      case 'skateGrind': N(0, 0.3, 0.14, 4300); T('sawtooth', 1900, 1750, 0, 0.3, v * 0.12); break;
      case 'skateSpin': T('triangle', 500, 1300, 0, 0.18, v * 0.5); N(0, 0.15, 0.1, 2600); break;
      case 'bubble': T('sine', rand(500, 800), rand(1300, 1700), 0, 0.06, v * 0.7); break;
      case 'glassTap': T('triangle', 2500, 2450, 0, 0.05, v); T('triangle', 3300, 3250, 0.012, 0.04, v * 0.5); break;
      case 'feed': for (let i = 0; i < 3; i++) N(i * 0.04, 0.025, 0.18, 5200); break;
      case 'scrub': N(0, 0.12, 0.12, 3200); N(0.14, 0.1, 0.1, 2800); break;
      case 'tramp': T('triangle', 120, 520, 0, 0.16, v * 2); T('sine', 260, 180, 0, 0.3, v * 1.2); for (let i = 0; i < 5; i++) T('square', 1100 - i * 90, 1000 - i * 90, 0.02 + i * 0.035, 0.025, v * 0.3); break;
      case 'trampCreak': T('sawtooth', 210, 150, 0, 0.1, v * 0.3); N(0, 0.05, 0.12, 900); break;
      case 'trampFlip': T('square', 420, 1300, 0, 0.22, v * 0.5); break;
      case 'trampWobble': for (let i = 0; i < 4; i++) T('triangle', 300 - i * 30, 250 - i * 30, i * 0.07, 0.06, v * 0.7); break;
      case 'shutter': N(0, 0.03, 0.4, 5200); T('square', 2100, 1800, 0, 0.02, v); N(0.07, 0.03, 0.3, 4200); break;
      case 'flashCharge': T('sine', 900, 4200, 0, 0.45, v * 0.22); break;
      case 'eject': for (let i = 0; i < 7; i++) T('square', 210 + (i % 2) * 50, 190, i * 0.05, 0.045, v * 0.45); break;
      case 'polaroidShake': N(0, 0.05, 0.12, 2400); N(0.08, 0.05, 0.12, 2000); break;
      case 'windTick': T('square', 2300, 2100, 0, 0.014, v * 0.6); break;
      case 'robotStep': T('square', rand(430, 620), 300, 0, 0.024, v * 0.35); break;
      case 'robotBump': T('square', 320, 120, 0, 0.08, v * 1.1); N(0, 0.05, 0.2, 900); break;
      case 'robotBeep': T('square', 880, 880, 0, 0.05, v * 0.6); T('square', 660, 660, 0.07, 0.05, v * 0.6); break;
      case 'robotStop': for (let i = 0; i < 4; i++) T('square', 500 - i * 80, 420 - i * 80, i * 0.06, 0.05, v * 0.5); break;
      case 'tamaBeep': T('square', 2093, 2093, 0, 0.04, v * 0.6); break;
      case 'tamaEat': T('square', 1047, 1047, 0, 0.04, v * 0.6); T('square', 784, 784, 0.07, 0.04, v * 0.6); T('square', 1047, 1047, 0.14, 0.04, v * 0.6); break;
      case 'tamaHappy': [1568, 2093, 2637].forEach((f, i) => T('square', f, f, i * 0.07, 0.07, v * 0.6)); break;
      case 'tamaSad': [880, 784, 659].forEach((f, i) => T('triangle', f, f * 0.98, i * 0.15, 0.14, v * 0.8)); break;
      case 'swordClash': T('square', 2600, 2500, 0, 0.06, v * 0.8); T('triangle', 3900, 3800, 0, 0.14, v * 0.5); N(0, 0.04, 0.25, 6000); break;
      case 'swordSpin': N(0, 0.35, 0.2, 2800); T('triangle', 600, 1400, 0, 0.35, v * 0.3); break;
      case 'squeak': T('square', 1150, 1700, 0, 0.06, v * 0.45); T('square', 1700, 1100, 0.06, 0.06, v * 0.35); break;
      case 'throw': N(0, 0.12, 0.14, 2000); T('triangle', 480, 950, 0, 0.1, v * 0.4); break;
      case 'dribble': T('triangle', 210, 110, 0, 0.06, v * 0.9); N(0, 0.03, 0.12, 600); break;
      case 'tada': [523, 659, 784, 1047].forEach((f, i) => T('square', f, f, i * 0.06, i === 3 ? 0.18 : 0.06, v * 0.8)); break;
      case 'aww': [440, 392, 330].forEach((f, i) => T('triangle', f, f * 0.97, i * 0.12, 0.12, v * 0.8)); break;
      case 'cheer': for (let i = 0; i < 5; i++) T('square', 1300 + (i % 2) * 300, 1300 + (i % 2) * 300, i * 0.05, 0.04, v * 0.35); break;
    }
  }
}

const RON_VOICE = new Set(['caw', 'caw2', 'caw3', 'squawk', 'coo', 'learn', 'gift']);
const RON_CLIPS = {
  smash1: 'Lemme smash.', smash_clean: 'Lemme smash.', smash_please: 'Lemme smash... please.', smash_plz: 'Lemme smash. Plz.',
  smaesh: 'Smaesh.', ben: 'Ben is a hoe.',
};

const TOY_GAP = {
  yoyoDown: 0.25, yoyoUp: 0.25, hoopSwish: 0.18, kiteWind: 3, kiteFlap: 0.8, kiteReel: 0.6, cubeTwist: 0.12, skateRoll: 0.22,
  skateGrind: 0.3, bubble: 0.35, feed: 0.15, scrub: 0.3, tramp: 0.15, trampCreak: 0.15, shutter: 0.3, robotStep: 0.15, windTick: 0.12, tamaBeep: 0.12,
  swordClash: 0.25, squeak: 0.4, dribble: 0.15, cheer: 0.6, tada: 0.8, aww: 0.8, polaroidShake: 0.2,
};
