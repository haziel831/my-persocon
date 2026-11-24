// Title music: "Nocturno de Veludo" — original procedural Web Audio track, no samples, no
// copyrighted material (safe for Twitch streams). Nocturnal Melancholic Synthwave: slow 3/4
// (~80 BPM) in A minor with a gentle 6/8 lilt, warm detuned analog pads, a deep low-passed
// synthwave bass, a shimmering celesta arpeggio with a long echo and a slow, nostalgic lead.
// Everything goes through sound.musicBus (or master), so the game's volume/mute controls apply.
// All envelopes start/end at silence and the output fades in/out: seamless, click-free loop.

const NOTE = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
const freq = (n) => {
  const m = /^([A-G]#?)(-?\d)$/.exec(n);
  if (!m) throw new Error('nota invalida: ' + n);
  return 440 * 2 ** ((NOTE[m[1]] + (+m[2] + 1) * 12 - 69) / 12);
};

const BPM = 80;
const EIGHTH = 60 / BPM / 2;   // 0.375s — six eighths per 3/4 bar
const SWING = 0.06;            // subtle nocturnal lilt on offbeats only
const BARS = 16;
const LOOP = BARS * 6;         // 96 eighths ≈ 36s, harmonically resolves back to Am

// Melancholic progression: Am · Am · F · E | C · G · F · E | Am · Am · Dm · E | F · C · Dm · E
// The E major (harmonic-minor V) at each bar 4/8/12/15 pulls longingly back to Am.
const PROG = ['Am', 'Am', 'F', 'E', 'C', 'G', 'F', 'E', 'Am', 'Am', 'Dm', 'E', 'F', 'C', 'Dm', 'E'];
const BASS = ['A1', 'A1', 'F1', 'E1', 'C2', 'G1', 'F1', 'E1', 'A1', 'A1', 'D2', 'E1', 'F1', 'C2', 'D2', 'E1'];
const CHORDS = {
  Am: ['A3', 'C4', 'E4'],
  F:  ['F3', 'A3', 'C4'],
  E:  ['E3', 'G#3', 'B3'],
  C:  ['C3', 'E3', 'G3'],
  G:  ['G3', 'B3', 'D4'],
  Dm: ['D3', 'F3', 'A3'],
};
// Celesta climbs the chord tones; alternate pattern keeps the 2-bar phrase breathing.
const ARP_A = [0, 1, 2, 1, 2, 1];
const ARP_B = [0, 2, 1, 2, 1, 0];

// Slow, sparse lead motif. Each entry: [eighth step, note, length in eighths].
const LEAD = [
  [0,  'E4', 3], [3,  'A4', 3],
  [6,  'C5', 6],
  [12, 'C5', 3], [15, 'A4', 3],
  [18, 'G#4', 6],
  [24, 'G4', 3], [27, 'E4', 3],
  [30, 'D4', 3], [33, 'G4', 3],
  [36, 'A4', 6],
  [42, 'B4', 3], [45, 'G#4', 3],
  [48, 'E4', 3], [51, 'A4', 3],
  [54, 'C5', 6],
  [60, 'F5', 3], [63, 'E5', 3],
  [66, 'B4', 6],
  [72, 'C5', 3], [75, 'A4', 3],
  [78, 'G4', 3], [81, 'C5', 3],
  [84, 'F4', 6],
  [90, 'G#4', 6], // resolves into the loop's opening Am
];

export class Music {
  constructor(sound) {
    this.sound = sound;
    this.playing = false;
    this.timer = 0;
    this.nodes = [];
  }

  get ctx() {
    return this.sound.ctx;
  }

  // Register long-lived graph nodes so stop() can tear the whole graph down cleanly.
  n(node) {
    this.nodes.push(node);
    return node;
  }

  start(volume = 1.0) {
    const c = this.ctx;
    if (!c || this.playing || !this.sound.enabled) return;
    c.resume?.().catch(() => {});
    this.playing = true;
    this.nodes = [];

    // Warm master tone: gentle low-pass keeps the mix soft and avoids harsh transients.
    this.masterLp = this.n(c.createBiquadFilter());
    this.masterLp.type = 'lowpass';
    this.masterLp.frequency.value = 4400;
    this.masterLp.Q.value = 0.5;

    this.out = this.n(c.createGain());
    const peak = Math.min(0.92, Math.max(0.0002, volume)); // headroom: no clipping
    this.out.gain.setValueAtTime(0.0001, c.currentTime);
    this.out.gain.exponentialRampToValueAtTime(peak, c.currentTime + 2.4); // slow, ethereal fade-in
    this.masterLp.connect(this.out);
    this.out.connect(this.sound.musicBus || this.sound.master);

    // Gentle bus glue so stacked pads/bass/lead never clip.
    this.comp = this.n(c.createDynamicsCompressor());
    this.comp.threshold.value = -18;
    this.comp.knee.value = 18;
    this.comp.ratio.value = 3;
    this.comp.attack.value = 0.02;
    this.comp.release.value = 0.4;
    this.bus = this.n(c.createGain());
    this.bus.gain.value = 0.95;
    this.bus.connect(this.comp);
    this.comp.connect(this.masterLp);

    // Wide, slowly drifting chorus for the analog pads.
    this.chorusWet = this.n(c.createGain());
    this.chorusWet.gain.value = 0.3;
    this.chorusWet.connect(this.masterLp);
    this.chorusLfos = [];
    [0.021, 0.033].forEach((base, i) => {
      const d = this.n(c.createDelay(0.1));
      d.delayTime.value = base;
      const lfo = c.createOscillator();
      lfo.frequency.value = 0.11 + i * 0.07;
      const depth = this.n(c.createGain());
      depth.gain.value = 0.0021;
      lfo.connect(depth);
      depth.connect(d.delayTime);
      lfo.start();
      this.bus.connect(d);
      d.connect(this.chorusWet);
      this.chorusLfos.push(lfo);
    });

    // Long, darkening echo for the celesta and lead (≈ dotted eighth at 80 BPM).
    this.delay = this.n(c.createDelay(1.5));
    this.delay.delayTime.value = EIGHTH * 1.5;
    const dfb = this.n(c.createGain());
    dfb.gain.value = 0.4;
    const dlp = this.n(c.createBiquadFilter());
    dlp.type = 'lowpass';
    dlp.frequency.value = 2000;
    this.delay.connect(dlp);
    dlp.connect(dfb);
    dfb.connect(this.delay);
    dlp.connect(this.masterLp);

    // Spacious, soft reverb tail built from short feedback delays.
    this.revWet = this.n(c.createGain());
    this.revWet.gain.value = 0.17;
    this.revWet.connect(this.masterLp);
    [0.053, 0.089, 0.131].forEach((t) => {
      const d = this.n(c.createDelay(0.3));
      d.delayTime.value = t;
      const lp = this.n(c.createBiquadFilter());
      lp.type = 'lowpass';
      lp.frequency.value = 1700;
      const fb = this.n(c.createGain());
      fb.gain.value = 0.32;
      this.bus.connect(d);
      d.connect(lp);
      lp.connect(fb);
      fb.connect(d);
      lp.connect(this.revWet);
    });

    this.step = 0;
    this.next = c.currentTime + 0.08;
    this.timer = setInterval(() => this.schedule(), 25);
    this.schedule();
  }

  setVolume(v) {
    if (this.out && this.ctx) {
      this.out.gain.setTargetAtTime(Math.min(0.92, Math.max(0.0002, v)), this.ctx.currentTime, 0.4);
    }
  }

  stop(fade = 1.2) {
    if (!this.playing) return;
    this.playing = false;
    clearInterval(this.timer);
    const out = this.out;
    const t = this.ctx.currentTime;
    out.gain.cancelScheduledValues(t);
    out.gain.setValueAtTime(Math.max(0.0002, out.gain.value), t);
    out.gain.exponentialRampToValueAtTime(0.0001, t + fade);
    setTimeout(() => {
      this.chorusLfos?.forEach((l) => { try { l.stop(); } catch (e) { /* ja parado */ } });
      this.nodes.forEach((node) => { try { node.disconnect(); } catch (e) { /* ja desconectado */ } });
      this.nodes = [];
    }, fade * 1000 + 400);
  }

  schedule() {
    const c = this.ctx;
    while (this.next < c.currentTime + 0.22) {
      this.playStep(this.step, this.next, EIGHTH);
      this.step++;
      this.next += EIGHTH;
    }
  }

  playStep(step, t, eighth) {
    const pos = step % LOOP;
    const bar = Math.floor(pos / 6);
    const inBar = pos % 6;
    const chord = CHORDS[PROG[bar]];
    const root = BASS[bar];

    // Warm analog pad: one slow-swelling chord per bar, sustained past the bar line.
    if (inBar === 0) this.pad(chord, t, eighth * 6 + 0.9);

    // Deep filtered bass: a soft pulse on beat 1, a lighter one on beat 3, a ghost on the
    // middle offbeat — the gentle heartbeat of the 3/4 sway.
    if (inBar === 0) this.bass(root, t, eighth * 3.4);
    if (inBar === 4) this.bass(root, t, eighth * 2.6, 0.75);
    if (inBar === 2) this.bass(root, t, eighth * 1.6, 0.35, true);

    // Delicate celesta arpeggio, gently swung on offbeats and drenched in the long echo.
    const pattern = bar % 2 ? ARP_B : ARP_A;
    const at = t + (inBar % 2 ? eighth * SWING : 0);
    const arpNote = chord[pattern[inBar]];
    this.celesta(freq(arpNote) * 2, at, eighth * 1.7);

    // Slow, nostalgic lead melody.
    const hit = LEAD.find(([p]) => p === pos);
    if (hit) this.lead(freq(hit[1]), t, hit[2] * eighth);
  }

  wave(name) {
    if (!this.waves) this.waves = {};
    if (this.waves[name]) return this.waves[name];
    const n = 48;
    const imag = new Float32Array(n);
    for (let k = 1; k < n; k++) {
      if (name === 'saw') imag[k] = 1 / k;
      else if (name === 'brass') imag[k] = (1 / k) * Math.exp(-k / 9);
      else if (name === 'bell') imag[k] = k % 2 ? Math.exp(-k / 5) / k : 0;
      else if (name === 'glass') imag[k] = k % 2 ? 1 / (k * k) : 0;
    }
    this.waves[name] = this.ctx.createPeriodicWave(new Float32Array(n), imag);
    return this.waves[name];
  }

  voice(f, t, dur, vol, { wave = 'saw', cutoff = 0, cutoffEnd = 0, attack = 0.01, release = 0.1, detune = 0, send = 0, vibrato = 0 } = {}) {
    const c = this.ctx;
    const o = c.createOscillator();
    if (wave === 'sine' || wave === 'triangle') o.type = wave;
    else o.setPeriodicWave(this.wave(wave));

    o.frequency.setValueAtTime(f, t);
    if (detune) o.detune.value = detune;

    if (vibrato) {
      const lfo = c.createOscillator();
      const depth = c.createGain();
      lfo.type = 'sine';
      lfo.frequency.value = 3.6;
      depth.gain.value = f * (vibrato / 1200);
      lfo.connect(depth);
      depth.connect(o.frequency);
      lfo.start(t);
      lfo.stop(t + dur + 0.06);
    }

    const g = c.createGain();
    const a = Math.min(attack, dur * 0.45);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + a);
    g.gain.setValueAtTime(vol, t + Math.max(a, dur - release));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    let node = o;
    if (cutoff) {
      const lp = c.createBiquadFilter();
      lp.type = 'lowpass';
      lp.Q.value = 0.45;
      lp.frequency.setValueAtTime(cutoff, t);
      if (cutoffEnd) lp.frequency.exponentialRampToValueAtTime(cutoffEnd, t + dur);
      node = node.connect(lp);
    }
    node.connect(g);
    g.connect(this.bus);
    if (send) {
      const sg = c.createGain();
      sg.gain.value = send;
      g.connect(sg);
      sg.connect(this.delay);
    }
    o.start(t);
    o.stop(t + dur + 0.05);
    return o;
  }

  bass(root, t, dur, level = 1, octave = false) {
    const f = freq(root) * (octave ? 2 : 1);
    // Sine foundation + low triangle body + a whisper of filtered saw for synthwave warmth.
    this.voice(f, t, dur, 0.115 * level, {
      wave: 'sine', cutoff: 260, cutoffEnd: 170, attack: 0.14, release: Math.min(0.6, dur * 0.5),
    });
    this.voice(f, t, dur, 0.05 * level, {
      wave: 'triangle', cutoff: 380, attack: 0.18, release: 0.5, detune: -6,
    });
    this.voice(f, t, dur, 0.022 * level, {
      wave: 'saw', cutoff: 300, cutoffEnd: 180, attack: 0.2, release: 0.5, detune: 7,
    });
  }

  pad(chord, t, dur) {
    chord.forEach((n, i) => {
      const f = freq(n);
      // Three slightly detuned layers per note: wide, breathing, analog.
      [-11, 0, 11].forEach((cents, j) => {
        this.voice(f, t, dur, j === 1 ? 0.016 : 0.011, {
          wave: i % 2 ? 'brass' : 'saw',
          cutoff: 700, cutoffEnd: 1150,
          attack: 0.9, release: 1.3,
          detune: cents + (i - 1) * 3,
          send: 0.18,
        });
      });
    });
  }

  celesta(f, t, dur) {
    // Synthetic bell/celesta: odd-harmonic bell plus a pure sine shimmer, both echoing.
    this.voice(f, t, dur, 0.021, {
      wave: 'bell', cutoff: 5200, attack: 0.004, release: Math.min(0.5, dur * 0.8), send: 0.6,
    });
    this.voice(f * 2, t, dur * 0.6, 0.008, {
      wave: 'sine', attack: 0.003, release: 0.2, send: 0.45,
    });
  }

  lead(f, t, dur) {
    // Slow, mysterious lead: soft triangle entry, sine body and a quiet high shimmer.
    const rel = Math.max(0.5, dur * 0.7);
    this.voice(f, t, dur, 0.055, {
      wave: 'triangle', cutoff: 2400, attack: 0.18, release: rel, vibrato: 4, send: 0.5,
    });
    this.voice(f, t, dur, 0.028, {
      wave: 'sine', attack: 0.2, release: rel, detune: 5, send: 0.35,
    });
    this.voice(f * 2, t, dur * 0.8, 0.011, {
      wave: 'sine', attack: 0.25, release: rel, send: 0.3,
    });
  }
}
