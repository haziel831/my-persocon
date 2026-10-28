// Shared synthwave tracks for "Siga o ritmo", the musical keyboard and the Neon Synthesizer upgrade.
// Melodies are [[semitone from C5=62, beats], ...]. Synth songs are { name, notes: [[start, midi, dur, vel], ...] }.

const BEAT = 0.28;

// Energetic rhythm-game beds: bpm + root Hz + scale ratios for lead/bass arps.
export const RHYTHM_TRACKS = [
  { bpm: 138, root: 55, name: 'Neon Drive', lead: [4, 4.8, 5.333, 6, 7.112, 8, 9.6], bass: [1, 1.2, 1.5, 0.75] },
  { bpm: 144, root: 61.74, name: 'Laser Rush', lead: [4, 4.5, 5.333, 6, 6.75, 8, 9], bass: [1, 0.75, 1.5, 1.125] },
  { bpm: 132, root: 58.27, name: 'Vapor Pulse', lead: [4, 4.8, 5.04, 6, 7.2, 8, 9.6], bass: [1, 1.2, 1.5, 0.9] },
  { bpm: 148, root: 65.41, name: 'Grid Runner', lead: [4, 4.5, 5.333, 6, 8, 9, 10.67], bass: [1, 1.5, 0.75, 1.125] },
  { bpm: 140, root: 49, name: 'Magenta Night', lead: [4, 4.8, 5.333, 6.4, 7.2, 8, 9.6], bass: [1, 1.2, 1.5, 0.8] },
  { bpm: 136, root: 73.42, name: 'Chrome Hearts', lead: [4, 4.5, 5.04, 6, 6.75, 8, 9], bass: [1, 0.89, 1.33, 1.5] },
  { bpm: 128, root: 43.65, name: 'Sunset Freeway', lead: [4, 4.8, 5.333, 6, 7.112, 8, 9.6], bass: [1, 1.5, 1.2, 0.75] },
  { bpm: 142, root: 82.41, name: 'Pixel Mirage', lead: [4, 4.5, 5.333, 6, 8, 9, 12], bass: [1, 1.125, 1.5, 0.75] },
  { bpm: 126, root: 69.3, name: 'Afterglow', lead: [4, 4.8, 5.333, 6, 7.2, 8, 9.6], bass: [1, 1.2, 0.9, 1.5] },
  { bpm: 150, root: 98, name: 'Hyperlane', lead: [4, 4.5, 5.333, 6, 6.75, 8, 10.67], bass: [1, 0.75, 1.5, 1.125] },
  { bpm: 134, root: 51.91, name: 'Soft Circuit', lead: [4, 4.8, 5.04, 6, 7.112, 8, 9.6], bass: [1, 1.2, 1.5, 0.8] },
  { bpm: 146, root: 36.71, name: 'Zero Gravity', lead: [4, 4.5, 5.333, 6, 8, 9, 12], bass: [1, 1.5, 0.75, 1.125] },
  { bpm: 141, root: 46.25, name: 'Pink Static', lead: [4, 4.8, 5.333, 6.4, 8, 9.6, 12], bass: [1, 0.8, 1.2, 1.5] },
  { bpm: 155, root: 77.78, name: 'Overdrive', lead: [4, 4.5, 5.333, 6, 6.75, 8, 9], bass: [1, 1.5, 1.125, 0.75] },
  { bpm: 130, root: 41.2, name: 'Midnight Taxi', lead: [4, 4.8, 5.333, 6, 7.2, 8, 9.6], bass: [1, 1.2, 1.5, 0.9] },
  { bpm: 139, root: 87.31, name: 'Crystal Coast', lead: [4, 4.5, 5.04, 6, 8, 9, 10.67], bass: [1, 0.89, 1.33, 1.5] },
];

// Melodies she can play on the keyboard (semitone from C5). Classics + synthwave hooks from the tracks above.
export const KEYBOARD_SONGS = {
  estrelinha: [[0, 1], [0, 1], [7, 1], [7, 1], [9, 1], [9, 1], [7, 2], [5, 1], [5, 1], [4, 1], [4, 1], [2, 1], [2, 1], [0, 2]],
  alegria: [[4, 1], [4, 1], [5, 1], [7, 1], [7, 1], [5, 1], [4, 1], [2, 1], [0, 1], [0, 1], [2, 1], [4, 1], [4, 1.5], [2, 0.5], [2, 2]],
  jacques: [[0, 1], [2, 1], [4, 1], [0, 1], [0, 1], [2, 1], [4, 1], [0, 1], [4, 1], [5, 1], [7, 2], [4, 1], [5, 1], [7, 2],
    [7, 0.5], [9, 0.5], [7, 0.5], [5, 0.5], [4, 1], [0, 1], [0, 1], [-5, 1], [0, 2]],
  parabens: [[-5, 0.75], [-5, 0.25], [-3, 1], [-5, 1], [0, 1], [-1, 2], [-5, 0.75], [-5, 0.25], [-3, 1], [-5, 1], [2, 1], [0, 2],
    [-5, 0.75], [-5, 0.25], [7, 1], [4, 1], [0, 1], [-1, 1], [-3, 2], [5, 0.75], [5, 0.25], [4, 1], [0, 1], [2, 1], [0, 2]],
  // Extra classics / chiptune-ish (original names).
  luar: [[0, 1], [2, 1], [4, 1], [7, 2], [4, 1], [2, 1], [0, 2], [0, 1], [2, 1], [4, 1], [9, 2], [7, 1], [4, 1], [0, 2]],
  brisa: [[7, 0.5], [9, 0.5], [7, 0.5], [5, 0.5], [4, 1], [2, 1], [0, 2], [2, 0.5], [4, 0.5], [5, 0.5], [7, 0.5], [9, 1], [7, 1], [4, 2]],
  marchinha: [[0, 0.5], [0, 0.5], [4, 1], [0, 0.5], [0, 0.5], [5, 1], [0, 0.5], [0, 0.5], [7, 0.5], [5, 0.5], [4, 0.5], [2, 0.5], [0, 2]],
  coracao: [[0, 1], [4, 1], [7, 1], [12, 2], [11, 1], [9, 1], [7, 2], [4, 1], [5, 1], [7, 1], [4, 1], [2, 1], [0, 2]],
  // Synthwave hooks (same names as the rhythm tracks).
  neonDrive: [[0, 0.5], [3, 0.5], [5, 0.5], [7, 0.5], [5, 0.5], [3, 0.5], [0, 1], [7, 0.5], [10, 0.5], [12, 1], [10, 0.5], [7, 0.5], [5, 1],
    [0, 0.5], [3, 0.5], [5, 0.5], [7, 0.5], [8, 0.5], [7, 0.5], [5, 1], [3, 0.5], [0, 0.5], [-2, 1], [0, 2]],
  laserRush: [[7, 0.25], [5, 0.25], [7, 0.5], [12, 0.5], [10, 0.5], [7, 0.5], [5, 0.5], [3, 0.5], [0, 1],
    [3, 0.25], [5, 0.25], [7, 0.5], [10, 0.5], [12, 0.5], [15, 0.5], [12, 0.5], [10, 0.5], [7, 1]],
  vaporPulse: [[0, 1], [5, 1], [7, 0.5], [8, 0.5], [7, 1], [5, 1], [3, 1], [0, 1], [8, 1], [7, 0.5], [5, 0.5], [3, 1], [0, 2]],
  gridRunner: [[0, 0.5], [0, 0.5], [7, 0.5], [0, 0.5], [5, 0.5], [0, 0.5], [3, 0.5], [0, 0.5],
    [12, 0.5], [10, 0.5], [7, 0.5], [5, 0.5], [3, 0.5], [5, 0.5], [7, 1]],
  magentaNight: [[0, 1], [3, 0.5], [5, 0.5], [7, 1], [8, 1], [7, 0.5], [5, 0.5], [3, 1], [0, 1],
    [5, 0.5], [7, 0.5], [10, 1], [8, 1], [7, 2]],
  chromeHearts: [[4, 0.5], [7, 0.5], [11, 0.5], [12, 0.5], [11, 0.5], [7, 0.5], [4, 1],
    [2, 0.5], [5, 0.5], [9, 0.5], [11, 0.5], [9, 0.5], [5, 0.5], [2, 1], [0, 2]],
  sunsetFreeway: [[0, 1.5], [2, 0.5], [3, 1], [5, 1], [7, 2], [5, 1], [3, 1], [2, 1], [0, 2],
    [7, 1], [8, 0.5], [7, 0.5], [5, 1], [3, 2]],
  pixelMirage: [[12, 0.5], [7, 0.5], [5, 0.5], [7, 0.5], [12, 0.5], [15, 0.5], [12, 0.5], [7, 0.5],
    [5, 0.5], [3, 0.5], [0, 0.5], [3, 0.5], [5, 0.5], [7, 0.5], [12, 1]],
  afterglow: [[0, 2], [3, 1], [5, 1], [7, 2], [5, 1], [3, 1], [0, 2], [-2, 1], [0, 1], [3, 2]],
  hyperlane: [[0, 0.25], [3, 0.25], [5, 0.25], [7, 0.25], [10, 0.25], [12, 0.25], [15, 0.5],
    [12, 0.25], [10, 0.25], [7, 0.25], [5, 0.25], [3, 0.25], [0, 0.5], [7, 0.5], [12, 1]],
  softCircuit: [[0, 1], [2, 0.5], [3, 0.5], [5, 1], [7, 1], [5, 0.5], [3, 0.5], [2, 1], [0, 1],
    [7, 0.5], [8, 0.5], [7, 0.5], [5, 0.5], [3, 2]],
  zeroGravity: [[12, 1], [7, 0.5], [5, 0.5], [3, 1], [0, 1], [-5, 1], [0, 0.5], [3, 0.5], [5, 0.5], [7, 0.5], [12, 2]],
  pinkStatic: [[0, 0.5], [5, 0.5], [8, 0.5], [12, 0.5], [8, 0.5], [5, 0.5], [0, 1],
    [3, 0.5], [7, 0.5], [10, 0.5], [15, 0.5], [10, 0.5], [7, 0.5], [3, 1]],
  overdrive: [[0, 0.5], [7, 0.5], [12, 0.5], [7, 0.5], [5, 0.5], [12, 0.5], [5, 0.5], [3, 0.5],
    [10, 0.5], [3, 0.5], [0, 0.5], [7, 0.5], [12, 1]],
  midnightTaxi: [[0, 1], [5, 0.5], [7, 0.5], [8, 1], [7, 1], [5, 1], [3, 1], [0, 1],
    [8, 0.5], [7, 0.5], [5, 1], [3, 0.5], [0, 0.5], [-2, 2]],
  crystalCoast: [[7, 0.5], [9, 0.5], [11, 0.5], [12, 1], [11, 0.5], [9, 0.5], [7, 1],
    [4, 0.5], [5, 0.5], [7, 0.5], [9, 1], [7, 0.5], [5, 0.5], [4, 1], [0, 2]],
};

const TRACK_MELODY = {
  'Neon Drive': 'neonDrive', 'Laser Rush': 'laserRush', 'Vapor Pulse': 'vaporPulse', 'Grid Runner': 'gridRunner',
  'Magenta Night': 'magentaNight', 'Chrome Hearts': 'chromeHearts', 'Sunset Freeway': 'sunsetFreeway',
  'Pixel Mirage': 'pixelMirage', 'Afterglow': 'afterglow', 'Hyperlane': 'hyperlane', 'Soft Circuit': 'softCircuit',
  'Zero Gravity': 'zeroGravity', 'Pink Static': 'pinkStatic', 'Overdrive': 'overdrive', 'Midnight Taxi': 'midnightTaxi',
  'Crystal Coast': 'crystalCoast',
};

const NAMES = {
  estrelinha: 'Estrelinha', alegria: 'Ode à Alegria', jacques: 'Frère Jacques', parabens: 'Parabéns',
  luar: 'Claro de Lua', brisa: 'Brisa', marchinha: 'Marchinha', coracao: 'Coração',
  neonDrive: 'Neon Drive', laserRush: 'Laser Rush', vaporPulse: 'Vapor Pulse', gridRunner: 'Grid Runner',
  magentaNight: 'Magenta Night', chromeHearts: 'Chrome Hearts', sunsetFreeway: 'Sunset Freeway',
  pixelMirage: 'Pixel Mirage', afterglow: 'Afterglow', hyperlane: 'Hyperlane', softCircuit: 'Soft Circuit',
  zeroGravity: 'Zero Gravity', pinkStatic: 'Pink Static', overdrive: 'Overdrive', midnightTaxi: 'Midnight Taxi',
  crystalCoast: 'Crystal Coast',
};

// Turns a [[semi, beats]] melody into a SynthPlayer song (optionally with a bass line an octave down).
export function melodyToSynth(name, melody, { bpm = 110, root = 62, bass = true } = {}) {
  const beat = 60 / bpm;
  let t = 0;
  const notes = [];
  for (const [semi, beats] of melody) {
    const d = Math.max(0.06, beats * beat * 0.92);
    if (semi != null) {
      notes.push([t, root + semi, d, 0.85]);
      if (bass && beats >= 0.5) notes.push([t, root + semi - 12, Math.min(d, beat * 0.9), 0.55]);
    }
    t += beats * beat;
  }
  return { name, notes };
}

// Built-in songs for the Neon Synthesizer (playlist when she has no imports, or mixed with them).
export const SYNTH_SONGS = [
  ...Object.entries(KEYBOARD_SONGS).map(([id, mel]) => {
    const track = RHYTHM_TRACKS.find((t) => TRACK_MELODY[t.name] === id);
    const bpm = track?.bpm || (id === 'hyperlane' || id === 'overdrive' || id === 'laserRush' ? 140 : 112);
    return melodyToSynth(NAMES[id] || id, mel, { bpm, root: 62, bass: true });
  }),
];

export const songLabel = (id) => NAMES[id] || id;
export const KEYBOARD_BEAT = BEAT;
