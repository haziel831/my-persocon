// Synthesizer of the upgraded keyboard: voices (how it sounds), MIDI reading, audio → notes
// (pitch tracking, like a rough MIDI conversion) and a playlist player.
// A song is { name, notes: [[start s, midi note, duration s, velocity 0..1], ...] }.

export const VOICES = [
  ['lead', 'Lead Synthwave'], ['pad', 'Pad etéreo'], ['chip', 'Chiptune 8-bit'],
  ['pluck', 'Pluck'], ['bass', 'Baixo synth'], ['organ', 'Órgão retrô'],
];
const MAX_NOTES = 4000;
const hz = (n) => 440 * 2 ** ((n - 69) / 12);

// One note through the chosen voice. out: where it goes (master or the echo bus).
export function synthNote(sound, out, voice, t, midi, dur, vel = 0.8, vol = 1) {
  const c = sound.ctx;
  const f = hz(voice === 'bass' ? midi - 12 : midi);
  const v = 0.11 * vel * vol;
  const env = c.createGain();
  const atk = voice === 'pad' ? Math.min(0.25, dur * 0.4) : voice === 'pluck' ? 0.004 : 0.012;
  const rel = voice === 'pad' ? 0.5 : voice === 'pluck' ? 0.05 : 0.12;
  const hold = voice === 'pluck' ? Math.min(dur, 0.18) : dur;
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(v, t + atk);
  if (voice === 'pluck') env.gain.exponentialRampToValueAtTime(v * 0.05, t + hold);
  else env.gain.setValueAtTime(v * (voice === 'organ' ? 1 : 0.75), t + Math.max(atk, hold));
  env.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(atk, hold) + rel);
  const end = t + Math.max(atk, hold) + rel + 0.02;
  let dest = env;
  if (voice === 'lead' || voice === 'bass' || voice === 'pluck') {
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.Q.value = voice === 'bass' ? 6 : 4;
    lp.frequency.setValueAtTime(Math.min(12000, f * (voice === 'pluck' ? 10 : 6)), t);
    lp.frequency.exponentialRampToValueAtTime(Math.min(8000, f * 2.2), t + Math.max(0.05, hold));
    lp.connect(env);
    dest = lp;
  }
  env.connect(out);
  const oscs = [];
  const osc = (type, detune = 0, mul = 1, gain = 1) => {
    const o = c.createOscillator();
    o.type = type;
    o.frequency.value = f * mul;
    o.detune.value = detune;
    if (gain !== 1) {
      const g = c.createGain();
      g.gain.value = gain;
      o.connect(g).connect(dest);
    } else o.connect(dest);
    o.start(t);
    o.stop(end);
    oscs.push(o);
  };
  if (voice === 'lead') { osc('sawtooth', -9); osc('sawtooth', 9); osc('square', 0, 0.5, 0.3); }
  else if (voice === 'pad') { osc('triangle', -12); osc('triangle', 12); osc('sine', 0, 2, 0.3); }
  else if (voice === 'chip') osc('square');
  else if (voice === 'pluck') { osc('square'); osc('sawtooth', 5, 1, 0.5); }
  else if (voice === 'bass') { osc('sawtooth'); osc('square', 0, 0.5, 0.6); }
  else { osc('sine'); osc('sine', 0, 2, 0.5); osc('sine', 0, 3, 0.25); osc('sine', 0, 4, 0.15); }
  // Mono: the next note cuts this one with a short fade (no clicks).
  return {
    t, end,
    cut(at) {
      if (at >= end) return;
      at = Math.max(at, t);
      env.gain.cancelScheduledValues(at);
      env.gain.setTargetAtTime(0.0001, at, 0.008);
      for (const o of oscs) { try { o.stop(at + 0.05); } catch {} }
    },
  };
}

// One voice at a time (a mono synth): each new note cuts the one still sounding.
export class MonoVoice {
  play(sound, out, voice, t, midi, dur, vel, vol) {
    this.last?.cut(t);
    this.last = synthNote(sound, out, voice, t, midi, dur, vel, vol);
  }
}

// A song as a single line: notes starting together keep the highest (the melody) and each note
// ends where the next one starts.
export function monoize(notes) {
  const out = [];
  for (const n of notes) {
    const prev = out[out.length - 1];
    if (prev && n[0] - prev[0] < 0.03) {
      if (n[1] > prev[1]) out[out.length - 1] = [prev[0], n[1], Math.max(prev[2], n[2]), Math.max(prev[3], n[3])];
      continue;
    }
    out.push([...n]);
  }
  for (let i = 0; i < out.length - 1; i++) out[i][2] = Math.max(0.04, Math.min(out[i][2], out[i + 1][0] - out[i][0]));
  return out;
}

// Echo bus (a feedback delay) for the "eco" option.
export function echoBus(sound) {
  const c = sound.ctx;
  const input = c.createGain();
  const delay = c.createDelay(1);
  const fb = c.createGain();
  const wet = c.createGain();
  delay.delayTime.value = 0.28;
  fb.gain.value = 0.38;
  wet.gain.value = 0.45;
  input.connect(sound.master);
  input.connect(delay);
  delay.connect(fb).connect(delay);
  delay.connect(wet).connect(sound.master);
  return input;
}

// ---------- MIDI ----------
export function parseMidi(buf) {
  const d = new DataView(buf);
  let p = 0;
  const str = (n) => String.fromCharCode(...new Uint8Array(buf, p, n));
  if (str(4) !== 'MThd') throw new Error('MIDI inválido');
  const div = d.getUint16(12);
  const tracks = d.getUint16(10);
  p = 8 + d.getUint32(4);
  const events = [];
  const tempos = [[0, 500000]];
  for (let k = 0; k < tracks && p < buf.byteLength; k++) {
    if (str(4) !== 'MTrk') break;
    const len = d.getUint32(p + 4);
    let q = p + 8;
    const stop = q + len;
    let tick = 0;
    let status = 0;
    const vlq = () => { let v = 0; let b; do { b = d.getUint8(q++); v = (v << 7) | (b & 127); } while (b & 128); return v; };
    while (q < stop) {
      tick += vlq();
      let b = d.getUint8(q);
      if (b & 128) { status = b; q++; } else b = status;
      const type = status >> 4;
      const ch = status & 15;
      if (status === 0xff) {
        const meta = d.getUint8(q++);
        const n = vlq();
        if (meta === 0x51) tempos.push([tick, (d.getUint8(q) << 16) | (d.getUint8(q + 1) << 8) | d.getUint8(q + 2)]);
        q += n;
      } else if (status === 0xf0 || status === 0xf7) q += vlq();
      else if (type === 8 || type === 9) {
        const note = d.getUint8(q);
        const vel = d.getUint8(q + 1);
        q += 2;
        if (ch !== 9) events.push([tick, type === 9 && vel > 0, note, vel, ch]);
      } else q += type === 12 || type === 13 ? 1 : 2;
    }
    p = stop;
  }
  tempos.sort((a, b) => a[0] - b[0]);
  const secs = (tick) => {
    let s = 0;
    let lastT = 0;
    let us = 500000;
    for (const [t, u] of tempos) {
      if (t >= tick) break;
      s += ((t - lastT) * us) / div / 1e6;
      lastT = t;
      us = u;
    }
    return s + ((tick - lastT) * us) / div / 1e6;
  };
  events.sort((a, b) => a[0] - b[0]);
  const open = new Map();
  const notes = [];
  for (const [tick, on, note, vel, ch] of events) {
    const key = ch * 128 + note;
    if (on) open.set(key, [secs(tick), vel]);
    else if (open.has(key)) {
      const [s, v] = open.get(key);
      open.delete(key);
      notes.push([s, note, Math.max(0.05, secs(tick) - s), v / 127]);
    }
  }
  return tidy(notes);
}

// ---------- audio → notes ----------
// Melody extraction for full songs (voice, band and drums mixed): per 23 ms frame, every candidate
// pitch is scored by the sum of its harmonics in the spectrum (a pitch is penalized when there is
// energy halfway between its harmonics, the sign of a lower true pitch); the best candidate in the
// melody range is the melody. The pitch track is smoothed and cut into notes with hysteresis, so
// vibrato and short wobbles don't break a note, and a fresh attack on the same pitch starts a new one.
const STFT = { win: 1024, nfft: 2048, hop: 256, lo: 50, hi: 96, harm: 10 };
export const TUNE = { voice: 0.45, bg: 0.7, onset: 0.3, range: 10 };
export const setVoiceK = (k) => { TUNE.voice = k; };

function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      let t = re[i]; re[i] = re[j]; re[j] = t;
      t = im[i]; im[i] = im[j]; im[j] = t;
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang);
    const wi = Math.sin(ang);
    const half = len >> 1;
    for (let i = 0; i < n; i += len) {
      let cr = 1;
      let ci = 0;
      for (let k = 0; k < half; k++) {
        const a = i + k;
        const b = a + half;
        const xr = re[b] * cr - im[b] * ci;
        const xi = re[b] * ci + im[b] * cr;
        re[b] = re[a] - xr; im[b] = im[a] - xi;
        re[a] += xr; im[a] += xi;
        const t = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = t;
      }
    }
  }
}

export async function audioToNotes(ctx, buf) {
  const audio = await ctx.decodeAudioData(buf);
  const R = 11025;
  const { win, nfft, hop, lo, hi, harm } = STFT;
  // Mono mix resampled to 11 kHz by the audio engine (proper anti-aliasing), kick and rumble cut.
  const off = new OfflineAudioContext(1, Math.max(win, Math.ceil(Math.min(audio.duration, 300) * R)), R);
  const src = off.createBufferSource();
  src.buffer = audio;
  const hp = off.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 110;
  src.connect(hp).connect(off.destination);
  src.start();
  return pcmToNotes((await off.startRendering()).getChannelData(0), R);
}

// The analysis itself, on mono samples at 11025 Hz (already high-passed).
export async function pcmToNotes(x, R = 11025) {
  const { win, nfft, hop, lo, hi, harm } = STFT;
  const binHz = R / nfft;
  const bins = nfft / 2;
  const range = (f, semi) => [Math.max(1, Math.floor((f * 2 ** (-semi / 12)) / binHz)), Math.min(bins - 1, Math.ceil((f * 2 ** (semi / 12)) / binHz))];
  const cands = [];
  for (let m = lo; m <= hi + 1e-9; m += 1 / 3) {
    const f0 = 440 * 2 ** ((m - 69) / 12);
    const parts = [];
    for (let h = 1; h <= harm && h * f0 < R / 2 - 50; h++) parts.push([...range(h * f0, 0.45), 0.84 ** (h - 1), ...range((h - 0.5) * f0, 0.3)]);
    cands.push({ m, parts });
  }
  const hann = Float32Array.from({ length: win }, (_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (win - 1)));
  const re = new Float32Array(nfft);
  const im = new Float32Array(nfft);
  const mag = new Float32Array(bins);
  const score = new Float32Array(cands.length + 40);
  const peakIn = (a, b) => { let v = 0; for (let k = a; k <= b; k++) if (mag[k] > v) v = mag[k]; return v; };
  const pitch = [];
  const sal = [];
  const rms = [];
  const nF0 = Math.max(0, Math.floor((x.length - win) / hop) + 1);
  const M = new Float32Array(nF0 * bins);
  for (let f = 0, s = 0; f < nF0; f++, s += hop) {
    re.fill(0);
    im.fill(0);
    let e = 0;
    for (let i = 0; i < win; i++) { const v = x[s + i]; e += v * v; re[i] = v * hann[i]; }
    fft(re, im);
    for (let k = 0; k < bins; k++) M[f * bins + k] = Math.sqrt(Math.sqrt(re[k] * re[k] + im[k] * im[k]));
    rms.push(Math.sqrt(e / win));
    if (f % 500 === 0) await new Promise((r) => setTimeout(r, 0));
  }
  // Held background per bin (pads, sustained chords): the 3rd lowest of 13 block means around
  // each frame (±0.6 s). Taking it off leaves what moves: the melody with its attacks and vibrato.
  const BLK = 4;
  const nB = Math.ceil(nF0 / BLK);
  const bmean = new Float32Array(nB * bins);
  for (let f = 0; f < nF0; f++) for (let k = 0; k < bins; k++) bmean[((f / BLK) | 0) * bins + k] += M[f * bins + k] / BLK;
  const bg = new Float32Array(nB * bins);
  for (let j = 0; j < nB; j++) {
    for (let k = 0; k < bins; k++) {
      let a = Infinity, b = Infinity, c = Infinity;
      for (let q = Math.max(0, j - 6); q <= Math.min(nB - 1, j + 6); q++) {
        const v = bmean[q * bins + k];
        if (v < a) { c = b; b = a; a = v; } else if (v < b) { c = b; b = v; } else if (v < c) c = v;
      }
      bg[j * bins + k] = c === Infinity ? b === Infinity ? a : b : c;
    }
  }
  for (let f = 0; f < nF0; f++) {
    const j = (f / BLK) | 0;
    for (let k = 0; k < bins; k++) mag[k] = Math.max(0, M[f * bins + k] - TUNE.bg * bg[j * bins + k]);
    let best = 0;
    let bi = 0;
    cands.forEach((c, ci) => {
      let v = 0;
      for (const [a, b, w, ha, hb] of c.parts) v += w * (peakIn(a, b) - 0.5 * peakIn(ha, hb));
      score[ci] = v;
      if (v > best) { best = v; bi = ci; }
    });
    // Chords under the melody prop up its lower octave; the octave above, if nearly as strong,
    // is the real note (a truly low note would be penalized up there by its odd harmonics).
    if (score[bi + 36] > best * 0.6) bi += 36;
    const bm = cands[bi].m;
    pitch.push(bm);
    sal.push(best);
    if (pitch.length % 250 === 0) await new Promise((r) => setTimeout(r, 0));
  }
  const nF = pitch.length;
  if (!nF) return [];
  const sorted = [...sal].sort((a, b) => a - b);
  const sTop = sorted[Math.floor(nF * 0.9)] || 1;
  const rTop = [...rms].sort((a, b) => a - b)[Math.floor(nF * 0.9)] || 1;
  // Voiced: strong for the song and for its own passage (±1.5 s), so quiet verses still count but
  // the accompaniment filling the melody's pauses doesn't.
  const span = Math.round(1.5 / (hop / R));
  const voiced = sal.map((v, i) => {
    if (v < sTop * 0.22 || rms[i] < rTop * 0.04) return false;
    let m = 0;
    for (let j = Math.max(0, i - span); j < Math.min(nF, i + span); j++) if (sal[j] > m) m = sal[j];
    return v > m * TUNE.voice;
  });
  // Median of 5 voiced frames: single-frame jumps (octave slips, drum hits) disappear.
  const mid = pitch.map((p, i) => {
    if (!voiced[i]) return null;
    const w = [];
    for (let j = i - 2; j <= i + 2; j++) if (voiced[j]) w.push(pitch[j]);
    w.sort((a, b) => a - b);
    return w[w.length >> 1];
  });

  const dt = hop / R;
  const t0 = win / 2 / R;
  const notes = [];
  let cur = null;
  let gap = 0;
  let pend = null;
  const close = (end) => {
    if (cur && (end - cur.i) * dt >= 0.06) notes.push([t0 + cur.i * dt, cur.n, (end - cur.i) * dt, Math.min(1, 0.45 + (0.55 * cur.s) / sTop)]);
    cur = null;
  };
  const open = (i, n) => { cur = { i, n, s: sal[i], low: sal[i], lowAt: i }; };
  // Attack of pitch n at frame i: how much its first harmonics grew over 2 frames, for their level.
  const flux = (i, n) => {
    if (i < 2 || i >= nF) return 0;
    const f0 = 440 * 2 ** ((n - 69) / 12);
    let up = 0;
    let lvl = 0;
    for (let h = 1; h <= 4; h++) {
      const k = Math.round((h * f0) / binHz);
      if (k + 1 >= bins) break;
      const p = i * bins + k;
      const q = (i - 2) * bins + k;
      const a = Math.max(M[p - 1], M[p], M[p + 1]);
      up += Math.max(0, a - Math.max(M[q - 1], M[q], M[q + 1]));
      lvl += a;
    }
    return lvl ? up / lvl : 0;
  };
  for (let i = 0; i < nF; i++) {
    const f = mid[i];
    if (f == null) {
      if (cur && ++gap >= 3) close(i - gap + 1);
      pend = null;
      continue;
    }
    gap = 0;
    const n = Math.round(f);
    if (!cur) { open(i, n); continue; }
    // Within ¾ of a semitone it's the same note (vibrato, slides); a new pitch must hold 3 frames.
    if (Math.abs(f - cur.n) <= 0.75) {
      pend = null;
      cur.s = Math.max(cur.s, sal[i]);
      // A new attack on the same pitch: the harmonics dipped and came back strong.
      if (sal[i] < cur.low) { cur.low = sal[i]; cur.lowAt = i; }
      if ((i - cur.i) * dt > 0.12 && i - cur.lowAt >= 2 && sal[i] > cur.low * 2 && sal[i] > sTop * 0.45) { const at = cur.lowAt; close(at); open(at, n); continue; }
      // Or its harmonics jumped up again (a repeated note sung or played right after the last).
      const fx = flux(i, cur.n);
      if ((i - cur.i) * dt > 0.1 && fx > TUNE.onset && fx >= flux(i - 1, cur.n) && fx >= flux(i + 1, cur.n)) { close(i - 1); open(i - 1, n); }
      continue;
    }
    if (pend && Math.abs(f - pend.f) <= 0.6) pend.k++;
    else pend = { n, f, i, k: 1 };
    if (pend.k >= 3) {
      close(pend.i);
      open(pend.i, pend.n);
      pend = null;
    }
  }
  close(nF);
  // The melody lives around its usual pitch: notes far below it are bass or chords leaking in.
  const byPitch = [...notes].sort((a, b) => a[1] - b[1]);
  const total = notes.reduce((a, n) => a + n[2], 0);
  let acc = 0;
  const center = byPitch.find((n) => (acc += n[2]) >= total / 2)?.[1] ?? 60;
  return tidy(notes.filter((n) => n[1] >= center - TUNE.range));
}

// Keeps it light to save: rounded numbers, a playable range and a note limit.
function tidy(notes) {
  return monoize(notes
    .filter((n) => n[1] >= 24 && n[1] <= 108)
    .sort((a, b) => a[0] - b[0] || b[1] - a[1]))
    .slice(0, MAX_NOTES)
    .map(([s, n, d, v]) => [Math.round(s * 100) / 100, n, Math.round(d * 100) / 100, Math.round(v * 100) / 100]);
}

export const songLength = (song) => song.notes.reduce((m, [s, , d]) => Math.max(m, s + d), 0);

// Schedules a song a little ahead of time; onNote(midi) when each note sounds, onEnd() at the end.
export class SynthPlayer {
  constructor(sound) {
    this.sound = sound;
    this.cur = null;
  }

  get playing() {
    return !!this.cur;
  }

  play(song, cfg, onNote, onEnd) {
    this.stop();
    const s = this.sound;
    if (!s.enabled || !song?.notes?.length) return onEnd?.();
    const out = cfg.echo ? echoBus(s) : s.master;
    const notes = monoize(song.notes);
    const mono = new MonoVoice();
    const cur = { song, i: 0, t0: s.ctx.currentTime + 0.1, out, cfg, onEnd, timers: [], mono };
    this.cur = cur;
    const len = songLength(song);
    const pump = () => {
      if (this.cur !== cur) return;
      const now = s.ctx.currentTime;
      while (cur.i < notes.length && cur.t0 + notes[cur.i][0] < now + 0.3) {
        const [st, n, d, v] = notes[cur.i++];
        const at = cur.t0 + st;
        if (at >= now - 0.05) {
          mono.play(s, out, cfg.voice || 'lead', Math.max(at, now), n, Math.min(d, 4), v, cfg.vol ?? 1);
          cur.timers.push(setTimeout(() => this.cur === cur && onNote?.(n), Math.max(0, (at - now) * 1000)));
        }
      }
      if (cur.timers.length > 200) cur.timers.splice(0, 100);
      if (now > cur.t0 + len + 0.4) {
        this.cur = null;
        clearInterval(cur.iv);
        onEnd?.();
      }
    };
    cur.iv = setInterval(pump, 60);
    pump();
  }

  stop() {
    const cur = this.cur;
    if (!cur) return;
    this.cur = null;
    clearInterval(cur.iv);
    cur.timers.forEach(clearTimeout);
    cur.mono.last?.cut(this.sound.ctx.currentTime + 0.01);
    if (cur.out !== this.sound.master) setTimeout(() => cur.out.disconnect(), 1500);
  }
}
