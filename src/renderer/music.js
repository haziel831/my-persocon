// Title music: original NES-style chiptune (pulse + triangle + noise),
// MM1/2 title / stage-select energy — faster, denser, more epic. Not an OST rip.

const NOTE = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
const freq = (n) => {
  const [, name, oct] = /^([A-G]#?)(\d)$/.exec(n);
  return 440 * 2 ** ((NOTE[name] + (+oct + 1) * 12 - 69) / 12);
};

const BPM = 172;
// 8 bars: E minor drive → lift → heroic resolve.
const BASS = ['E2', 'B1', 'C2', 'G1', 'A1', 'B1', 'C2', 'E2'];
const ARP = [
  ['E4', 'G4', 'B4'], ['B3', 'D4', 'F#4'], ['C4', 'E4', 'G4'], ['G3', 'B3', 'D4'],
  ['A3', 'C4', 'E4'], ['B3', 'D4', 'F#4'], ['C4', 'E4', 'G4'], ['E4', 'G#4', 'B4'],
];
// Lead in 16ths — busier runs + octave punches (stage-select / get-weapon energy).
const LEAD = [
  // bars 1-2 — opening charge
  ['B4', 1], ['E5', 1], ['G5', 1], ['B5', 1], ['G5', 1], ['E5', 1], ['B4', 1], ['E5', 1],
  ['D5', 1], ['B4', 1], ['A4', 1], ['B4', 1], ['E5', 2], ['G5', 2],
  // bars 3-4 — climb
  ['C5', 1], ['E5', 1], ['G5', 1], ['C6', 1], ['G5', 1], ['E5', 1], ['C5', 1], ['E5', 1],
  ['B4', 1], ['D5', 1], ['G5', 1], ['B5', 1], ['G5', 2], ['D5', 2],
  // bars 5-6 — agitato
  ['E5', 1], ['G5', 1], ['B5', 1], ['E6', 1], ['B5', 1], ['G5', 1], ['A5', 1], ['F#5', 1],
  ['E5', 1], ['G5', 1], ['B5', 1], ['D6', 1], ['B5', 2], ['G5', 2],
  // bars 7-8 — epic land
  ['B4', 1], ['E5', 1], ['G5', 1], ['B5', 1], ['E6', 2], ['B5', 1], ['G5', 1],
  ['E5', 1], ['G5', 1], ['B5', 1], ['E6', 1], ['G6', 2], ['E6', 2], ['B5', 4],
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

  start(volume = 0.78) {
    const c = this.ctx;
    if (!c || this.playing || !this.sound.enabled) return;
    c.resume?.().catch(() => {});
    this.playing = true;
    this.out = c.createGain();
    this.out.gain.setValueAtTime(0.0001, c.currentTime);
    this.out.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), c.currentTime + 0.55);
    this.out.connect(this.sound.master);
    this.delay = c.createDelay(0.5);
    this.delay.delayTime.value = 60 / BPM / 2;
    const fb = c.createGain();
    fb.gain.value = 0.14;
    this.delay.connect(fb).connect(this.delay);
    this.delay.connect(this.out);
    this.step = 0;
    this.next = c.currentTime + 0.06;
    this.leadAt = this.leadIndex = 0;
    this.timer = setInterval(() => this.schedule(), 25);
    this.schedule();
  }

  setVolume(v) {
    if (this.out) this.out.gain.setTargetAtTime(Math.max(0.0002, v), this.ctx.currentTime, 0.3);
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
    setTimeout(() => out.disconnect(), fade * 1000 + 200);
  }

  schedule() {
    const c = this.ctx;
    const s16 = 60 / BPM / 4;
    while (this.next < c.currentTime + 0.2) {
      this.playStep(this.step, this.next, s16);
      this.step++;
      this.next += s16;
    }
  }

  playStep(step, t, s16) {
    const pos = step % 128;
    const bar = Math.floor(pos / 16);
    const beat = pos % 16;
    const bass = BASS[bar];
    const chord = ARP[bar];

    // Driving bass: root on 1/3, octave punches on offbeats.
    if (beat % 4 === 0) this.bass(bass, t, s16 * 2.8);
    else if (beat % 2 === 0) this.bass(bass.replace(/\d/, (o) => String(+o + 1)), t, s16 * 1.2);
    else if (beat % 4 === 3) this.bass(bass, t, s16 * 0.7);

    // Fast pulse arp.
    this.arp(chord[beat % 3], t, s16 * 0.75);
    if (beat % 2 === 1) this.arp(chord[(beat + 1) % 3], t, s16 * 0.45);

    // Drums: four-on-floor kick feel + snare + open hats.
    if (beat % 4 === 0) this.kick(t);
    if (beat % 8 === 4) this.snare(t);
    if (beat % 8 === 6) this.snare(t, 0.55); // ghost
    this.hat(t, beat % 2 === 0 ? 0.055 : 0.032);
    if (beat % 4 === 2) this.hat(t, 0.07);

    // Power stabs on bar starts (epic hits).
    if (beat === 0) {
      this.voice('square', freq(chord[0]), t, s16 * 1.5, 0.04, { duty: 0.5, cutoff: 3000, send: 0.2 });
      this.voice('square', freq(chord[2]), t, s16 * 1.5, 0.03, { duty: 0.25, cutoff: 3500, send: 0.25 });
    }

    if (pos === 0) { this.leadIndex = 0; this.leadAt = 0; }
    const cur = LEAD[this.leadIndex];
    if (cur && pos === this.leadAt) {
      this.lead(cur[0], t, cur[1] * s16 * 0.9);
      this.leadAt += cur[1];
      this.leadIndex++;
    }
  }

  voice(type, f, t, dur, vol, { cutoff = 0, attack = 0.003, release = 0.05, detune = 0, send = 0, duty } = {}) {
    const c = this.ctx;
    const o = c.createOscillator();
    if (duty != null) {
      const n = 32;
      const real = new Float32Array(n);
      for (let k = 1; k < n; k++) real[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty);
      o.setPeriodicWave(c.createPeriodicWave(real, new Float32Array(n)));
    } else o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (detune) o.detune.value = detune;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.setValueAtTime(vol, t + Math.max(attack, dur - release));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let node = o;
    if (cutoff) {
      const lp = c.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = cutoff;
      node = node.connect(lp);
    }
    node.connect(g).connect(this.out);
    if (send) {
      const sg = c.createGain();
      sg.gain.value = send;
      g.connect(sg).connect(this.delay);
    }
    o.start(t);
    o.stop(t + dur + 0.04);
    return o;
  }

  bass(n, t, dur) {
    this.voice('triangle', freq(n), t, dur, 0.16, { release: 0.03 });
    this.voice('square', freq(n) / 2, t, dur, 0.055, { cutoff: 550, release: 0.03 });
  }

  arp(n, t, dur) {
    this.voice('square', freq(n), t, dur, 0.03, { cutoff: 4500, release: 0.02, duty: 0.25, send: 0.2 });
  }

  lead(n, t, dur) {
    this.voice('square', freq(n), t, dur, 0.062, { cutoff: 5200, attack: 0.006, release: 0.06, duty: 0.125, send: 0.3 });
    this.voice('square', freq(n), t, dur, 0.022, { cutoff: 5200, detune: 7, duty: 0.25, send: 0.18 });
  }

  kick(t) {
    const c = this.ctx;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(160, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.09);
    g.gain.setValueAtTime(0.32, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    o.connect(g).connect(this.out);
    o.start(t);
    o.stop(t + 0.2);
  }

  noise(t, dur, vol, type, f) {
    const c = this.ctx;
    if (!this.noiseBuf) {
      const len = Math.floor(c.sampleRate * 0.35);
      this.noiseBuf = c.createBuffer(1, len, c.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    const src = c.createBufferSource();
    src.buffer = this.noiseBuf;
    const flt = c.createBiquadFilter();
    flt.type = type;
    flt.frequency.value = f;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(flt).connect(g).connect(this.out);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  snare(t, vol = 1) {
    this.noise(t, 0.12, 0.15 * vol, 'bandpass', 2400);
    this.voice('triangle', 190, t, 0.05, 0.045 * vol);
  }

  hat(t, vol) {
    this.noise(t, 0.025, vol, 'highpass', 9000);
  }
}
