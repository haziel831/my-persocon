// Title music: "Chrome Requiem" — procedural Web Audio, no audio files.
// Darksynth / industrial cyberpunk at 116 BPM: heavy pulsing sub bass in a dark minor key,
// hard electronic drums (kick + noise snare + hats), a fast metallic arpeggio and a futuristic
// saw-lead with a neon echo. Scheduled ahead with attack/release envelopes: no clicks, clean loop.
// All sound goes through sound.musicBus (or master), so the game's volume/mute controls apply.

const NOTE = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
const freq = (n) => {
  const m = /^([A-G]#?)(-?\d)$/.exec(n);
  if (!m) throw new Error('nota invalida: ' + n);
  return 440 * 2 ** ((NOTE[m[1]] + (+m[2] + 1) * 12 - 69) / 12);
};

const BPM = 116;
const LOOP = 128; // 8 bars of 16ths (~16.5s), loops seamlessly
// Dark minor progression: Am → F → Dm → E (harmonic-minor pull back to Am).
const ROOTS = ['A1', 'F1', 'D2', 'E2', 'A1', 'F1', 'D2', 'E2'];
const CHORD = [
  ['A3', 'C4', 'E4'], // Am
  ['F3', 'A3', 'C4'], // F
  ['D3', 'F3', 'A3'], // Dm
  ['E3', 'G#3', 'B3'], // E major (dark harmonic-minor tension)
  ['A3', 'C4', 'E4'], // Am
  ['F3', 'A3', 'C4'], // F
  ['D3', 'F3', 'A3'], // Dm
  ['E3', 'G#3', 'B3'], // E — pulls hard back to Am
];
// Fast metallic 16th arpeggio (minor 7th colour for the cyber edge).
const ARP = [0, 3, 7, 10, 12, 10, 7, 3];
// Futurist lead stabs, a minor-key motif that answers the arp.
const LEAD = [
  [0, 'A5', 10], [14, 'C6', 8], [28, 'E5', 12], [44, 'G5', 8],
  [56, 'A5', 14], [72, 'F5', 12], [88, 'E5', 10], [100, 'G#5', 8],
  [112, 'A5', 12], [122, 'E5', 6],
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

  start(volume = 1.0) {
    const c = this.ctx;
    if (!c || this.playing || !this.sound.enabled) return;
    c.resume?.().catch(() => {});
    this.playing = true;

    this.masterLp = c.createBiquadFilter();
    this.masterLp.type = 'lowpass';
    this.masterLp.frequency.value = 5200;
    this.masterLp.Q.value = 0.5;

    this.out = c.createGain();
    const peak = Math.min(0.9, Math.max(0.0002, volume)); // headroom: no clipping
    this.out.gain.setValueAtTime(0.0001, c.currentTime);
    this.out.gain.exponentialRampToValueAtTime(peak, c.currentTime + 1.6);
    this.masterLp.connect(this.out);
    this.out.connect(this.sound.musicBus || this.sound.master);

    // Gentle bus limiting keeps stacked drums/bass/lead from clipping.
    this.comp = c.createDynamicsCompressor();
    this.comp.threshold.value = -14;
    this.comp.knee.value = 12;
    this.comp.ratio.value = 4;
    this.comp.attack.value = 0.004;
    this.comp.release.value = 0.2;
    this.bus = c.createGain();
    this.bus.gain.value = 0.95;
    this.bus.connect(this.comp);
    this.comp.connect(this.masterLp);
    this.bus.connect(this.masterLp);

    // Slightly detuned chorus for the wide cyber pad.
    this.chorusWet = c.createGain();
    this.chorusWet.gain.value = 0.26;
    this.chorusWet.connect(this.masterLp);
    this.chorusLfos = [];
    [0.017, 0.029].forEach((base, i) => {
      const d = c.createDelay(0.1);
      d.delayTime.value = base;
      const lfo = c.createOscillator();
      lfo.frequency.value = 0.31 + i * 0.13;
      const depth = c.createGain();
      depth.gain.value = 0.0017;
      lfo.connect(depth);
      depth.connect(d.delayTime);
      lfo.start();
      this.bus.connect(d);
      d.connect(this.chorusWet);
      this.chorusLfos.push(lfo);
    });

    // Long neon echo for the lead.
    this.delay = c.createDelay(1.5);
    this.delay.delayTime.value = 0.36;
    const dfb = c.createGain();
    dfb.gain.value = 0.33;
    const dlp = c.createBiquadFilter();
    dlp.type = 'lowpass';
    dlp.frequency.value = 2800;
    this.delay.connect(dlp);
    dlp.connect(dfb);
    dfb.connect(this.delay);
    dlp.connect(this.masterLp);

    this.revWet = c.createGain();
    this.revWet.gain.value = 0.12;
    this.revWet.connect(this.masterLp);
    [0.047, 0.081].forEach((t) => {
      const d = c.createDelay(0.3);
      d.delayTime.value = t;
      const lp = c.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 2100;
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
    if (this.out && this.ctx) this.out.gain.setTargetAtTime(Math.min(0.9, Math.max(0.0002, v)), this.ctx.currentTime, 0.4);
  }

  stop(fade = 1.0) {
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
      this.comp?.disconnect();
      this.masterLp?.disconnect();
      this.delay?.disconnect();
      this.chorusLfos?.forEach((l) => { try { l.stop(); } catch (e) { /* ja parado */ } });
    }, fade * 1000 + 400);
  }

  schedule() {
    const c = this.ctx;
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

    // Deep sub foundation on the downbeats.
    if (beat === 0) this.sub(root, t, s16 * 9);
    if (beat === 8) this.sub(root, t, s16 * 7);

    // Heavy darksynth bass: driving 8ths with an acidic filter sweep and a 5th-on-off beat.
    if (beat % 2 === 0) {
      const off = ARP[(beat / 2) % ARP.length];
      const f = freq(root) * 2 ** (off / 12);
      this.voice(f, t, s16 * 1.8, 0.062, {
        wave: 'saw', cutoff: beat % 8 === 6 ? 1650 : 420, cutoffEnd: 240,
        attack: 0.004, release: 0.12, send: 0.05,
      });
      // second detuned layer makes it thicker/pulsing
      this.voice(f, t, s16 * 1.8, 0.028, {
        wave: 'saw', cutoff: 700, attack: 0.004, release: 0.12, detune: -11,
      });
    }

    if (beat === 0) this.pad(chord, t, s16 * 15.6);

    // Hard electronic kit: 4-on-the-floor kick, synthetic snare on 2 & 4, driving hats.
    if (beat % 4 === 0) this.kick(t, beat === 0 ? 0.3 : 0.24);
    if (beat === 4 || beat === 12) this.snare(t);
    if (beat % 2 === 1) this.hat(t, beat % 4 === 3 ? 0.011 : 0.007);
    // 16th ghost hats keep the industrial drive forward
    if (beat % 4 === 2) this.hat(t + s16 * 0.5, 0.004);

    // Fast metallic arpeggio on every 16th, bright and cutting.
    const arpNote = chord[step % chord.length];
    this.voice(freq(arpNote) * 2, t, s16 * 1.1, 0.009, {
      wave: 'glass', cutoff: 4200, attack: 0.003, release: 0.18, send: 0.35,
    });

    const hit = LEAD.find(([p]) => p === pos);
    if (hit) this.lead(hit[1], t, hit[2] * s16);
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
      lfo.frequency.value = 4.2;
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
      g.gain.exponentialRampToValueAtTime(i ? 0.03 : 0.07, t + 0.3);
      g.gain.setValueAtTime(i ? 0.03 : 0.07, t + Math.max(0.32, dur - 0.7));
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
        this.voice(f, t, dur, j === 1 ? 0.011 : 0.007, {
          wave: i % 2 ? 'brass' : 'saw',
          cutoff: 650, cutoffEnd: 1600,
          attack: 1.0, release: 1.8,
          detune: cents + (i - 1.5) * 2,
          send: 0.12,
        });
      });
    });
  }

  lead(n, t, dur) {
    const f = freq(n);
    // Futurist detuned saw lead through the neon echo.
    this.voice(f, t, dur, 0.03, {
      wave: 'saw', cutoff: 2600, cutoffEnd: 1400, attack: 0.012,
      release: Math.max(0.3, dur * 0.6), slide: 22, send: 0.6, vibrato: 3,
    });
    this.voice(f, t, dur, 0.022, {
      wave: 'saw', cutoff: 2200, attack: 0.012, release: Math.max(0.3, dur * 0.6), detune: 12, send: 0.5,
    });
    this.voice(f / 2, t, dur, 0.012, {
      wave: 'square', cutoff: 900, attack: 0.03, release: Math.max(0.3, dur * 0.6), detune: -7, send: 0.2,
    });
  }

  kick(t, vol = 0.2) {
    const c = this.ctx;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(110, t);
    o.frequency.exponentialRampToValueAtTime(38, t + 0.18);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.34);
    o.connect(g);
    g.connect(this.bus);
    o.start(t);
    o.stop(t + 0.4);
  }

  // Synthetic industrial snare (noise burst + short tonal body).
  snare(t) {
    const c = this.ctx;
    const src = c.createBufferSource();
    src.buffer = this.noiseBuffer();
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1500;
    bp.Q.value = 0.7;
    const g = c.createGain();
    g.gain.setValueAtTime(0.075, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    src.connect(bp);
    bp.connect(g);
    g.connect(this.bus);
    src.start(t);
    src.stop(t + 0.22);
    const o = c.createOscillator();
    const og = c.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(220, t);
    o.frequency.exponentialRampToValueAtTime(140, t + 0.1);
    og.gain.setValueAtTime(0.05, t);
    og.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
    o.connect(og);
    og.connect(this.bus);
    o.start(t);
    o.stop(t + 0.16);
  }

  clap(t) {
    const c = this.ctx;
    const src = c.createBufferSource();
    src.buffer = this.noiseBuffer();
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1800;
    bp.Q.value = 0.9;
    const g = c.createGain();
    g.gain.setValueAtTime(0.035, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    src.connect(bp);
    bp.connect(g);
    g.connect(this.bus);
    src.start(t);
    src.stop(t + 0.18);
  }

  hat(t, vol = 0.006) {
    const c = this.ctx;
    const src = c.createBufferSource();
    src.buffer = this.noiseBuffer();
    const hp = c.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 7500;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    src.connect(hp);
    hp.connect(g);
    g.connect(this.bus);
    src.start(t);
    src.stop(t + 0.06);
  }
}
