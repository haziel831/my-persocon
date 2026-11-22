// Title / intro music: "Mysterious Synthwave" — procedural Web Audio, no audio files.
// A minor, 92 BPM, 8-bar loop. Filtered analog-saw arpeggio, detuned warm pads,
// a slow enigmatic bell lead with a long neon delay. Everything is scheduled ahead of
// time and uses attack/release envelopes so the loop never clicks.

const NOTE = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
const freq = (n) => {
  const m = /^([A-G]#?)(-?\d)$/.exec(n);
  if (!m) throw new Error('nota invalida: ' + n);
  return 440 * 2 ** ((NOTE[m[1]] + (+m[2] + 1) * 12 - 69) / 12);
};

const BPM = 92;
const LOOP = 128; // 8 bars of 16 sixteenths (~20.9s)
// Roots: Am - F - Cmaj - G - Dm - E - Am - E. Minor with maj7/add9 colour.
const ROOTS = ['A1', 'F1', 'C2', 'G1', 'D2', 'E2', 'A1', 'E2'];
const CHORD = [
  ['A3', 'C4', 'E4', 'B4'], // Am9
  ['F3', 'A3', 'C4', 'E4'], // Fmaj7
  ['C3', 'E3', 'G3', 'B3'], // Cmaj7
  ['G2', 'B2', 'D3', 'E3'], // G6
  ['D3', 'F3', 'A3', 'E4'], // Dm9
  ['E2', 'G#2', 'B2', 'D3'], // E7
  ['A3', 'C4', 'E4', 'B4'], // Am9
  ['E2', 'G#2', 'B2', 'D3'], // E7 — unresolved, pulls back to Am
];
// Eighth-note arpeggio offsets from the root (semitones): a quiet pulsing analog line.
const ARP = [0, 7, 12, 7, 0, 3, 12, 10];
// Slow, sparse lead: [step in loop, note, length in sixteenths].
const LEAD = [
  [4, 'E5', 22],
  [30, 'C5', 18],
  [50, 'D5', 20],
  [70, 'B4', 16],
  [88, 'A4', 24],
  [112, 'G#4', 14],
];

export class Music {
  constructor(sound) {
    this.sound = sound;
    this.playing = false;
    this.timer = 0;
  }

  get ctx() {
    return this.sound.ctx;
  }

  start(volume = 0.72) {
    const c = this.ctx;
    if (!c || this.playing || !this.sound.enabled) return;
    c.resume?.().catch(() => {});
    this.playing = true;

    // Gentle master tone shaping: keeps the synths warm and removes harsh top end.
    this.masterLp = c.createBiquadFilter();
    this.masterLp.type = 'lowpass';
    this.masterLp.frequency.value = 4200;
    this.masterLp.Q.value = 0.4;

    this.out = c.createGain();
    this.out.gain.setValueAtTime(0.0001, c.currentTime);
    this.out.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), c.currentTime + 2.2);
    this.masterLp.connect(this.out);

    // Gate follows the game's mute/DND setting in real time.
    this.gate = c.createGain();
    this.gate.gain.value = this.sound.enabled ? 1 : 0.0001;
    this.out.connect(this.gate);
    this.gate.connect(this.sound.musicBus || this.sound.master);

    this.bus = c.createGain();
    this.bus.gain.value = 0.9;
    this.bus.connect(this.masterLp);

    // Slightly detuned chorus taps for the wide analog pad.
    this.chorusWet = c.createGain();
    this.chorusWet.gain.value = 0.28;
    this.chorusWet.connect(this.masterLp);
    this.chorusLfos = [];
    [0.018, 0.031].forEach((base, i) => {
      const d = c.createDelay(0.1);
      d.delayTime.value = base;
      const lfo = c.createOscillator();
      lfo.frequency.value = 0.17 + i * 0.09;
      const depth = c.createGain();
      depth.gain.value = 0.0018;
      lfo.connect(depth);
      depth.connect(d.delayTime);
      lfo.start();
      this.bus.connect(d);
      d.connect(this.chorusWet);
      this.chorusLfos.push(lfo);
    });

    // Long neon echo for the bell lead (dotted-eighth feel at 92 BPM).
    this.delay = c.createDelay(1.5);
    this.delay.delayTime.value = 0.49;
    const dfb = c.createGain();
    dfb.gain.value = 0.36;
    const dlp = c.createBiquadFilter();
    dlp.type = 'lowpass';
    dlp.frequency.value = 2600;
    this.delay.connect(dlp);
    dlp.connect(dfb);
    dfb.connect(this.delay);
    this.delay.connect(this.masterLp);
    this.delayWet = c.createGain();
    this.delayWet.gain.value = 0.34;
    this.delayWet.connect(this.masterLp);
    dlp.connect(this.delayWet);

    // Shortroom taps, no rain: quiet, mysterious air.
    this.revWet = c.createGain();
    this.revWet.gain.value = 0.12;
    this.revWet.connect(this.masterLp);
    [0.057, 0.093].forEach((t) => {
      const d = c.createDelay(0.3);
      d.delayTime.value = t;
      const lp = c.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 1900;
      const fb = c.createGain();
      fb.gain.value = 0.3;
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
      this.out.gain.setTargetAtTime(Math.max(0.0002, v), this.ctx.currentTime, 0.4);
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
      out.disconnect();
      this.gate?.disconnect();
      this.masterLp?.disconnect();
      this.delay?.disconnect();
      this.chorusLfos?.forEach((l) => { try { l.stop(); } catch (e) { /* ja parado */ } });
    }, fade * 1000 + 400);
  }

  schedule() {
    const c = this.ctx;
    // Mute / DND is picked up on the next scheduler tick (25 ms).
    if (this.gate) this.gate.gain.setTargetAtTime(this.sound.enabled ? 1 : 0.0001, c.currentTime, 0.08);
    const s16 = 60 / BPM / 4;
    while (this.next < c.currentTime + 0.22) {
      this.playStep(this.step, this.next, s16);
      this.step++;
      this.next += s16;
    }
  }

  playStep(step, t, s16) {
    const pos = step % LOOP;
    const bar = Math.floor(pos / 16);
    const beat = pos % 16;
    const chord = CHORD[bar];
    const root = ROOTS[bar];

    // Sub pulse: felt more than heard, two long notes per bar.
    if (beat === 0) this.sub(root, t, s16 * 10);
    if (beat === 8) this.sub(root, t, s16 * 8);

    // Analog arpeggio: filtered saw eighths, gently opening and closing.
    if (beat % 2 === 0) {
      const off = ARP[beat / 2];
      this.voice(freq(root) * 2 ** (off / 12), t, s16 * 1.75, 0.048, {
        wave: 'saw', cutoff: 380, cutoffEnd: 980, attack: 0.008, release: 0.16, send: 0.08,
      });
    }

    // Warm detuned pad, re-triggered every bar with a long envelope.
    if (beat === 0) this.pad(chord, t, s16 * 16.6);

    // Sparse glass shimmer in the upper register, well below whistle territory.
    if (beat === 6 || beat === 14) {
      this.voice(freq(chord[2]) * 2, t, s16 * 3, 0.005, {
        wave: 'glass', cutoff: 2800, attack: 0.03, release: 0.8, send: 0.45,
      });
    }

    // Enigmatic bell lead, with long delay tail.
    const hit = LEAD.find(([p]) => p === pos);
    if (hit) this.bell(hit[1], t, hit[2] * s16);
  }

  noiseBuffer() {
    if (this.noiseBuf) return this.noiseBuf;
    const c = this.ctx;
    const len = Math.floor(c.sampleRate * 0.5);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noiseBuf = buf;
    return buf;
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

  voice(f, t, dur, vol, { wave = 'saw', cutoff = 0, cutoffEnd = 0, attack = 0.01, release = 0.1, detune = 0, send = 0, slide = 0, vibrato = 0 } = {}) {
    const c = this.ctx;
    const o = c.createOscillator();
    if (wave === 'sine') o.type = 'sine';
    else o.setPeriodicWave(this.wave(wave));

    if (slide) {
      o.frequency.setValueAtTime(f * 2 ** (-slide / 1200), t);
      o.frequency.exponentialRampToValueAtTime(f, t + Math.min(0.3, dur * 0.4));
    } else {
      o.frequency.setValueAtTime(f, t);
    }
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
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.setValueAtTime(vol, t + Math.max(attack, dur - release));
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

  sub(n, t, dur) {
    const f = freq(n);
    const c = this.ctx;
    [f, f / 2].forEach((ff, i) => {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(ff, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(i ? 0.028 : 0.065, t + 0.4);
      g.gain.setValueAtTime(i ? 0.028 : 0.065, t + Math.max(0.42, dur - 0.7));
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g);
      g.connect(this.bus);
      o.start(t);
      o.stop(t + dur + 0.05);
    });
  }

  pad(chord, t, dur) {
    chord.forEach((n, i) => {
      const f = freq(n);
      [-9, 0, 9].forEach((cents, j) => {
        this.voice(f, t, dur, j === 1 ? 0.011 : 0.0075, {
          wave: i % 2 ? 'brass' : 'saw',
          cutoff: 700, cutoffEnd: 1500,
          attack: 1.1, release: 2.0,
          detune: cents + (i - 1.5) * 2,
          send: 0.12,
        });
      });
    });
  }

  bell(n, t, dur) {
    this.voice(freq(n), t, dur, 0.024, {
      wave: 'bell', cutoff: 3000, attack: 0.02, release: Math.max(0.4, dur * 0.8), send: 0.55,
    });
    this.voice(freq(n) / 2, t, dur * 0.9, 0.009, {
      wave: 'sine', attack: 0.04, release: Math.max(0.4, dur * 0.7), send: 0.2,
    });
  }
}
