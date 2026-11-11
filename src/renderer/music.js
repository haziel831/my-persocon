// Title music, variant E: "Blade Runner, sunrise" - 16-bit (SNES) and less sad.
// Same lush Vangelis machinery as variant D (brass pads, chorus, reverb, rain),
// but in F major / D minor with maj7 + add9 colour, a lighter groove, and the
// lead kept in the warm middle register (C4-A4). Never shrill.
// NOTE: freq() only understands sharps (A#), never flats (Bb).

const NOTE = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
const freq = (n) => {
  const m = /^([A-G]#?)(-?\d)$/.exec(n);
  if (!m) throw new Error('nota invalida: ' + n);
  return 440 * 2 ** ((NOTE[m[1]] + (+m[2] + 1) * 12 - 69) / 12);
};

const BPM = 80;
const LOOP = 128; // 8 bars of 16ths
// F major with D minor colour. Maj7 and add9 everywhere: light, unresolved, not bleak.
const BASS = ['F2', 'C2', 'D2', 'A#1', 'F2', 'C2', 'G2', 'A#1'];
const CHORD = [
  ['F3', 'A3', 'C4', 'E4'], // Fmaj7
  ['C3', 'E3', 'G3', 'D4'], // C(add9)
  ['D3', 'F3', 'A3', 'C4'], // Dm7
  ['A#2', 'D3', 'F3', 'A3'], // A#maj7
  ['F3', 'A3', 'C4', 'E4'], // Fmaj7
  ['C3', 'E3', 'G3', 'D4'], // C(add9)
  ['G2', 'A#2', 'D3', 'F3'], // Gm7
  ['A#2', 'D3', 'F3', 'A3'], // A#maj7
];
// Melody stays between C4 and A4. Nothing above A4, ever. 0 = rest.
const LEAD = [
  [0, 16], [0, 16],
  ['A4', 6], [0, 2], ['F4', 4], [0, 4], // Dm7
  ['D4', 8], [0, 2], ['F4', 4], [0, 2], // A#maj7
  ['E4', 6], [0, 2], ['C4', 4], [0, 4], // Fmaj7
  ['G4', 8], [0, 2], ['E4', 4], [0, 2], // C(add9)
  ['F4', 6], [0, 2], ['A4', 4], [0, 4], // Gm7
  ['A4', 12], [0, 4], // A#maj7: lands on the maj7, open and unresolved
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

    this.masterLp = c.createBiquadFilter();
    this.masterLp.type = 'lowpass';
    this.masterLp.frequency.value = 3800;
    this.masterLp.Q.value = 0.5;

    this.out = c.createGain();
    this.out.gain.setValueAtTime(0.0001, c.currentTime);
    this.out.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), c.currentTime + 1.6);
    this.masterLp.connect(this.out);
    this.out.connect(this.sound.musicBus || this.sound.master);

    this.bus = c.createGain();
    this.bus.connect(this.masterLp);

    // Chorus: two modulated taps for a wide 16-bit pad.
    this.chorusWet = c.createGain();
    this.chorusWet.gain.value = 0.36;
    this.chorusWet.connect(this.masterLp);
    this.chorusLfos = [];
    [0.019, 0.027].forEach((base, i) => {
      const d = c.createDelay(0.1);
      d.delayTime.value = base;
      const lfo = c.createOscillator();
      lfo.frequency.value = 0.29 + i * 0.12;
      const depth = c.createGain();
      depth.gain.value = 0.0021;
      lfo.connect(depth);
      depth.connect(d.delayTime);
      lfo.start();
      this.bus.connect(d);
      d.connect(this.chorusWet);
      this.chorusLfos.push(lfo);
    });

    // 2-tap space.
    this.revWet = c.createGain();
    this.revWet.gain.value = 0.18;
    this.revWet.connect(this.masterLp);
    [0.043, 0.071].forEach((t) => {
      const d = c.createDelay(0.2);
      d.delayTime.value = t;
      const lp = c.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 2400;
      const fb = c.createGain();
      fb.gain.value = 0.38;
      this.bus.connect(d);
      d.connect(lp);
      lp.connect(fb);
      fb.connect(d);
      lp.connect(this.revWet);
    });

    // Shorter echo than D: motion, not fog.
    this.delay = c.createDelay(1.2);
    this.delay.delayTime.value = 0.36;
    const dfb = c.createGain();
    dfb.gain.value = 0.3;
    this.delay.connect(dfb);
    dfb.connect(this.delay);
    this.delay.connect(this.masterLp);

    // Rain, but lighter than D.
    const rain = c.createBufferSource();
    rain.buffer = this.noiseBuffer();
    rain.loop = true;
    const rlp = c.createBiquadFilter();
    rlp.type = 'bandpass';
    rlp.frequency.value = 1500;
    rlp.Q.value = 0.5;
    this.rainGain = c.createGain();
    this.rainGain.gain.setValueAtTime(0.0001, c.currentTime);
    this.rainGain.gain.exponentialRampToValueAtTime(0.0045, c.currentTime + 2.5);
    rain.connect(rlp);
    rlp.connect(this.rainGain);
    this.rainGain.connect(this.masterLp);
    rain.start();
    this.rain = rain;

    this.step = 0;
    this.next = c.currentTime + 0.06;
    this.leadAt = 0;
    this.leadIndex = 0;
    this.timer = setInterval(() => this.schedule(), 25);
    this.schedule();
  }

  setVolume(v) {
    if (this.out) this.out.gain.setTargetAtTime(Math.max(0.0002, v), this.ctx.currentTime, 0.4);
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
    if (this.rainGain) this.rainGain.gain.setTargetAtTime(0.0001, t, 0.3);
    setTimeout(() => {
      out.disconnect();
      this.masterLp?.disconnect();
      this.delay?.disconnect();
      this.chorusLfos?.forEach((l) => { try { l.stop(); } catch (e) { /* já parado */ } });
      if (this.rain) {
        try { this.rain.stop(); } catch (e) { /* já parado */ }
        this.rain.disconnect();
        this.rain = null;
      }
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

    // Sub bass: two long roots per bar.
    if (beat === 0) this.sub(BASS[bar], t, s16 * 9);
    if (beat === 8) this.sub(BASS[bar], t, s16 * 7);

    // Pad carries the harmony.
    if (beat === 0) this.pad(chord, t, s16 * 16);

    // Soft glass sparkle from bar 3, octave up only (no 4x whistle).
    if (bar >= 2 && beat % 4 === 0) this.shimmer(chord, beat, t, s16);

    // Melody.
    if (pos === 0) {
      this.leadIndex = 0;
      this.leadAt = 0;
    }
    for (let guard = 0; guard < 8 && this.leadIndex < LEAD.length && pos === this.leadAt; guard++) {
      const cur = LEAD[this.leadIndex];
      if (cur[0]) this.lead(cur[0], t, cur[1] * s16 * 0.98);
      this.leadAt += cur[1];
      this.leadIndex++;
    }

    // Light pulse from bar 3.
    if (bar >= 2) {
      if (beat === 0) this.kick(t, 0.2);
      if (beat === 8) this.kick(t, 0.12);
      if (beat === 4 || beat === 12) this.rim(t, 0.8);
      if (beat === 6 || beat === 14) this.hat(t);
    }

    // Swell closing the loop.
    if (pos === LOOP - 32) this.swell(t, s16 * 32);
  }

  noiseBuffer() {
    if (this.noiseBuf) return this.noiseBuf;
    const c = this.ctx;
    const len = Math.floor(c.sampleRate * 1.0);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noiseBuf = buf;
    return buf;
  }

  wave(name) {
    if (!this.waves) this.waves = {};
    if (this.waves[name]) return this.waves[name];
    const n = 32;
    const imag = new Float32Array(n);
    for (let k = 1; k < n; k++) {
      if (name === 'saw') imag[k] = 1 / k;
      else if (name === 'brass') imag[k] = (1 / k) * Math.exp(-k / 7);
      else if (name === 'glass') imag[k] = k % 2 ? 1 / (k * k) : 0;
    }
    this.waves[name] = this.ctx.createPeriodicWave(new Float32Array(n), imag);
    return this.waves[name];
  }

  voice(f, t, dur, vol, { wave = 'saw', cutoff = 0, cutoffEnd = 0, attack = 0.01, release = 0.1, detune = 0, send = 0, slide = 0, vibrato = 0 } = {}) {
    const c = this.ctx;
    const o = c.createOscillator();
    o.setPeriodicWave(this.wave(wave));

    if (slide) {
      o.frequency.setValueAtTime(f * 2 ** (-slide / 1200), t);
      o.frequency.exponentialRampToValueAtTime(f, t + Math.min(0.25, dur * 0.4));
    } else {
      o.frequency.setValueAtTime(f, t);
    }
    if (detune) o.detune.value = detune;

    if (vibrato) {
      const lfo = c.createOscillator();
      const depth = c.createGain();
      lfo.type = 'sine';
      lfo.frequency.value = 4.0;
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
      lp.Q.value = 0.4;
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
    // Two sines, no harmonics: felt more than heard.
    const f = freq(n);
    const c = this.ctx;
    [f, f / 2].forEach((ff, i) => {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(ff, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(i ? 0.032 : 0.072, t + 0.3);
      g.gain.setValueAtTime(i ? 0.032 : 0.072, t + Math.max(0.31, dur - 0.55));
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g);
      g.connect(this.bus);
      o.start(t);
      o.stop(t + dur + 0.05);
    });
  }

  pad(chord, t, dur) {
    // Four tones x three detuned brass voices. Brighter filter than D.
    chord.forEach((n) => {
      const f = freq(n);
      [-8, 0, 8].forEach((cents, i) => {
        this.voice(f, t, dur, i === 1 ? 0.013 : 0.009, {
          wave: 'brass',
          cutoff: 800,
          cutoffEnd: 2200,
          attack: 0.3,
          release: 1.1,
          detune: cents,
          send: 0.1,
        });
      });
    });
  }

  shimmer(chord, beat, t, s16) {
    // One octave up, gentle, quarter-note rate. Sparkle, not a whistle.
    const idx = [0, 2, 3, 1][(beat / 4) % 4];
    this.voice(freq(chord[idx]) * 2, t, s16 * 3, 0.006, {
      wave: 'glass',
      cutoff: 2600,
      attack: 0.02,
      release: 0.7,
      send: 0.35,
    });
  }

  lead(n, t, dur) {
    // Warm middle-register voice: brass body, low cutoff, almost no vibrato.
    this.voice(freq(n), t, dur, 0.03, {
      wave: 'brass',
      cutoff: 1700,
      attack: 0.07,
      release: 0.55,
      slide: 22,
      vibrato: 4,
      send: 0.4,
    });
    this.voice(freq(n) / 2, t, dur, 0.012, {
      wave: 'saw',
      cutoff: 700,
      attack: 0.09,
      release: 0.5,
      detune: -5,
      send: 0.2,
    });
  }

  kick(t, vol = 0.2) {
    const c = this.ctx;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(95, t);
    o.frequency.exponentialRampToValueAtTime(34, t + 0.22);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
    o.connect(g);
    g.connect(this.bus);
    o.start(t);
    o.stop(t + 0.45);
  }

  rim(t, vol = 1) {
    const c = this.ctx;
    const src = c.createBufferSource();
    src.buffer = this.noiseBuffer();
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 2200;
    bp.Q.value = 1.2;
    const g = c.createGain();
    g.gain.setValueAtTime(0.038 * vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
    src.connect(bp);
    bp.connect(g);
    g.connect(this.bus);
    src.start(t);
    src.stop(t + 0.12);
  }

  hat(t) {
    const c = this.ctx;
    const src = c.createBufferSource();
    src.buffer = this.noiseBuffer();
    const hp = c.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 8000;
    const g = c.createGain();
    g.gain.setValueAtTime(0.006, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    src.connect(hp);
    hp.connect(g);
    g.connect(this.bus);
    src.start(t);
    src.stop(t + 0.06);
  }

  swell(t, dur) {
    const c = this.ctx;
    const src = c.createBufferSource();
    src.buffer = this.noiseBuffer();
    src.loop = true;
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(400, t);
    lp.frequency.exponentialRampToValueAtTime(2400, t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.018, t + dur * 0.92);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(lp);
    lp.connect(g);
    g.connect(this.bus);
    src.start(t);
    src.stop(t + dur + 0.05);
  }
}
