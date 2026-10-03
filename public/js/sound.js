// 8-bit sound effects and music, made live with the Web Audio API.
// Every sound is generated from oscillators (like the menu music in Adventures of Rufus),
// so there are no audio files and nothing copyrighted.

let ctx = null, master, sfxBus, musicBus, noiseBuf;
let sfxOn = true, musicOn = true;

const NOTE = (() => {
  const names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const out = {};
  for (let oct = 1; oct <= 7; oct++) names.forEach((n, i) => { out[n + oct] = 440 * Math.pow(2, (i - 9) / 12 + (oct - 4)); });
  return out;
})();

function ensure() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.8; master.connect(ctx.destination);
    sfxBus = ctx.createGain(); sfxBus.gain.value = 0.55; sfxBus.connect(master);
    musicBus = ctx.createGain(); musicBus.gain.value = 0.14; musicBus.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === "suspended") ctx.resume();
  return true;
}

// type can be "square"/"triangle"/... or a PeriodicWave (see pulse() below)
function tone(freq, at, dur, { type = "square", vol = 0.2, slide = 0, bus = sfxBus, attack = 0.006 } = {}) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  if (typeof type === "string") o.type = type;
  else o.setPeriodicWave(type);
  o.frequency.setValueAtTime(freq, at);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), at + dur);
  g.gain.setValueAtTime(0.0001, at);
  g.gain.linearRampToValueAtTime(vol, at + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  o.connect(g); g.connect(bus);
  o.start(at); o.stop(at + dur + 0.03);
}

function noise(at, dur, { vol = 0.15, freq = 3000, bus = sfxBus, type = "highpass" } = {}) {
  const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = noiseBuf; f.type = type; f.frequency.value = freq;
  g.gain.setValueAtTime(vol, at); g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  s.connect(f); f.connect(g); g.connect(bus);
  s.start(at); s.stop(at + dur + 0.02);
}

const SFX = {
  click(t) { tone(700, t, 0.05, { vol: 0.08 }); },
  pick(t) { tone(520, t, 0.07, { vol: 0.12 }); tone(780, t + 0.05, 0.09, { vol: 0.12 }); },
  lock(t) { tone(300, t, 0.08, { vol: 0.14, type: "triangle" }); tone(600, t + 0.06, 0.12, { vol: 0.12, type: "triangle" }); },
  correct(t) {
    ["C5", "E5", "G5", "C6"].forEach((n, i) => tone(NOTE[n], t + i * 0.07, 0.16, { vol: 0.16 }));
    tone(NOTE.C7, t + 0.3, 0.35, { type: "triangle", vol: 0.12 });
    noise(t + 0.28, 0.25, { vol: 0.05, freq: 7000 });
  },
  wrong(t) {
    tone(240, t, 0.38, { type: "sawtooth", vol: 0.13, slide: 0.55 });
    tone(180, t + 0.06, 0.4, { type: "sawtooth", vol: 0.1, slide: 0.5 });
  },
  timeout(t) { [523, 392, 330, 262].forEach((f, i) => tone(f, t + i * 0.11, 0.14, { type: "triangle", vol: 0.15 })); },
  tick(t) { tone(1250, t, 0.035, { vol: 0.06 }); },
  urgent(t) { tone(1650, t, 0.05, { vol: 0.1 }); tone(1650, t + 0.12, 0.05, { vol: 0.07 }); },
  count(t) { tone(NOTE.A4, t, 0.18, { vol: 0.16 }); },
  go(t) { tone(NOTE.A5, t, 0.4, { vol: 0.16 }); tone(NOTE.E6, t + 0.02, 0.4, { vol: 0.1, type: "triangle" }); noise(t, 0.3, { vol: 0.06 }); },
  join(t) { tone(500, t, 0.14, { vol: 0.13, slide: 2.2, type: "triangle" }); },
  // level 1..12: the bigger the streak, the higher and longer the fanfare
  streak(t, level = 1) {
    const up = Math.pow(2, Math.min(level, 12) * 1.5 / 12); // climbs 1.5 semitones per level
    noise(t, 0.5, { vol: 0.12, freq: 900, type: "bandpass" });
    tone(300 * up, t, 0.45, { vol: 0.12, slide: 4, type: "sawtooth" });
    const notes = ["E5", "G5", "B5", "E6", "G6", "B6"].slice(0, Math.min(6, 3 + Math.ceil(level / 2)));
    notes.forEach((n, i) => tone(NOTE[n] * up, t + 0.25 + i * 0.06, 0.14, { vol: 0.12 }));
    if (level >= 6) { // big chord on top for the really huge streaks
      const end = t + 0.3 + notes.length * 0.06;
      [NOTE.E5, NOTE.G5 * 1.0, NOTE.B5].forEach((f) => tone(f * up, end, 0.6, { vol: 0.08, type: "triangle" }));
      noise(end, 0.6, { vol: 0.05, freq: 7000 });
    }
  },
  heart(t) { tone(NOTE.E5, t, 0.12, { vol: 0.14 }); tone(NOTE.C5, t + 0.12, 0.12, { vol: 0.14 }); tone(NOTE.A4, t + 0.24, 0.3, { vol: 0.14, slide: 0.7 }); },
  // a sticker being peeled and slapped on, with a sparkle
  sticker(t) {
    noise(t, 0.22, { vol: 0.12, freq: 2600, type: "bandpass" });
    tone(NOTE.C5, t + 0.2, 0.08, { vol: 0.16, type: "triangle" });
    ["E6", "G6", "C7", "E7"].forEach((n, i) => tone(NOTE[n], t + 0.28 + i * 0.07, 0.2, { vol: 0.1, type: "triangle" }));
  },
  coin(t) { tone(NOTE.B5, t, 0.06, { vol: 0.1 }); tone(NOTE.E6, t + 0.06, 0.18, { vol: 0.1 }); },
  fanfare(t) {
    const mel = [["C5", 0, 0.12], ["E5", 0.12, 0.12], ["G5", 0.24, 0.12], ["C6", 0.36, 0.3], ["G5", 0.7, 0.12], ["C6", 0.84, 0.6]];
    mel.forEach(([n, at, d]) => { tone(NOTE[n], t + at, d + 0.05, { vol: 0.15 }); tone(NOTE[n] / 2, t + at, d + 0.05, { type: "triangle", vol: 0.12 }); });
    noise(t + 0.84, 0.6, { vol: 0.06, freq: 6000 });
  },
  sad(t) { [NOTE.G4, NOTE.F4, NOTE.E4].forEach((f, i) => tone(f, t + i * 0.3, 0.3, { type: "sawtooth", vol: 0.08 })); tone(NOTE.D4 * 1.0, t + 0.9, 0.9, { type: "sawtooth", vol: 0.08, slide: 0.9 }); },
};

// ============================================================
// 🎵 MUSIC: an 8-bit "NES-style" band, just like Adventures of Rufus.
// ------------------------------------------------------------
// ALL OF THESE TUNES ARE ORIGINAL. What we borrow from the classic Nintendo-era games
// (Contra, Mario...) is the *technique*, not their melodies:
//    PULSE 1  -> the tune you hum   (a thin "pulse" wave, like the real NES chip)
//    PULSE 2  -> a twin harmony under the tune (Contra's famous double leads)
//    TRIANGLE -> a bouncy bassline (the Mario-style boom-chick bounce)
//    NOISE    -> the drums (kick, snare, hi-hats)
// Grooviness comes from SWING (every other 16th note lands a little late),
// syncopation (notes between the beats), ghost snares and drum fills.
//
// A song is a little recipe. Want to remix one? Change the numbers!
//   bpm    : speed            swing : 0 = straight, 0.2 = very bouncy
//   duty   : lead tone (0.125 thin & buzzy, 0.25 classic NES, 0.5 round)
//   chords : 4 chords, one per bar. root = bass note, notes = 4 notes the tune can use (MIDI numbers, 60 = middle C)
//   bass   : 16 slots per bar: how far above the root (0 root, 7 fifth, 12 octave), -1 = rest
//   lead   : 4 tune phrases, 16 slots each: which chord note (0-3), -1 = rest
//   kick / snare / ghost : which of the 16 slots get a drum hit
//   twin   : harmony this many semitones under the lead (Contra-style), 0 = off until you're on a streak
// ============================================================
export const MUSIC = {
  // Sunny and bouncy, like a happy overworld level
  adventure: {
    name: "Fox Adventure", emoji: "🦊", bpm: 150, swing: 0.16, duty: 0.25, twin: 0, stab: true, hats: 2,
    chords: [
      { root: 36, notes: [64, 67, 72, 76] }, // C
      { root: 33, notes: [64, 69, 72, 76] }, // Am
      { root: 41, notes: [65, 69, 72, 77] }, // F
      { root: 43, notes: [62, 67, 71, 74] }, // G
    ],
    bass: [0, -1, -1, 12, -1, -1, 7, -1, 0, -1, -1, 12, -1, 7, -1, -1],
    lead: [
      [2, -1, 2, -1, -1, 3, -1, 2, -1, 1, 2, -1, 0, -1, -1, -1],
      [1, -1, 1, 2, -1, 3, -1, -1, 2, -1, 1, -1, 0, 1, 2, -1],
      [3, -1, -1, 3, -1, 2, 3, -1, 2, 1, -1, 0, -1, 1, -1, -1],
      [0, 1, 2, -1, 3, -1, 2, -1, 1, -1, 2, 3, -1, -1, 3, -1],
    ],
    kick: [0, 6, 8], snare: [4, 12], ghost: [10, 15],
  },
  // Dreamy space groove with echoes
  cosmic: {
    name: "Cosmic Groove", emoji: "🌌", bpm: 104, swing: 0.12, duty: 0.5, twin: 0, echo: true, hats: 2, hold: 3,
    chords: [
      { root: 36, notes: [64, 67, 71, 76] }, // Cmaj7
      { root: 33, notes: [64, 67, 69, 72] }, // Am7
      { root: 29, notes: [64, 65, 69, 72] }, // Fmaj7
      { root: 31, notes: [62, 64, 67, 71] }, // G6
    ],
    bass: [0, -1, -1, 7, -1, -1, 12, -1, -1, -1, 0, -1, 7, -1, -1, -1],
    lead: [
      [0, -1, 1, -1, 2, -1, 3, -1, -1, -1, 2, -1, 1, -1, -1, -1],
      [3, -1, -1, 2, -1, -1, 1, -1, 2, -1, -1, -1, -1, -1, -1, -1],
      [0, 1, 2, 3, -1, -1, -1, -1, 3, 2, 1, -1, -1, -1, 0, -1],
      [2, -1, -1, -1, 3, -1, -1, 2, -1, 1, -1, -1, 0, -1, -1, -1],
    ],
    kick: [0, 10], snare: [8], ghost: [14],
  },
  // Funky city strut: syncopated, popping bass
  city: {
    name: "City Funk", emoji: "🏙️", bpm: 112, swing: 0.22, duty: 0.125, twin: 0, hats: 1, openHat: 14, bassLen: 0.55, leadLen: 0.6,
    chords: [
      { root: 38, notes: [62, 65, 69, 72] }, // Dm7
      { root: 43, notes: [62, 67, 71, 74] }, // G
      { root: 33, notes: [60, 64, 67, 69] }, // Am7
      { root: 43, notes: [62, 65, 67, 72] }, // Gsus
    ],
    bass: [0, -1, 12, 0, -1, 0, 12, -1, 0, -1, -1, 10, 12, -1, 7, -1],
    lead: [
      [-1, -1, 2, -1, 3, -1, -1, 2, -1, 3, -1, -1, 1, -1, 0, -1],
      [0, -1, -1, 0, -1, 1, -1, 2, -1, -1, 3, -1, 2, 1, -1, -1],
      [3, -1, 3, -1, -1, 2, -1, 3, -1, 1, -1, -1, 0, -1, 1, 2],
      [-1, 2, -1, 3, -1, -1, 2, -1, 1, -1, 0, -1, -1, -1, -1, -1],
    ],
    kick: [0, 3, 8, 10], snare: [4, 12], ghost: [7, 11, 15],
  },
  // Fast, heroic run-and-gun with twin leads
  brain: {
    name: "Brain Blaster", emoji: "🧮", bpm: 160, swing: 0, duty: 0.25, twin: 3, hats: 2, bassLen: 0.5,
    chords: [
      { root: 40, notes: [64, 67, 71, 76] }, // Em
      { root: 36, notes: [64, 67, 72, 76] }, // C
      { root: 38, notes: [62, 66, 69, 74] }, // D
      { root: 35, notes: [63, 66, 71, 75] }, // B
    ],
    bass: [0, 12, 0, 12, 0, 12, 0, 12, 0, 12, 0, 12, 0, 12, 7, 12],
    lead: [
      [3, -1, 3, 2, 3, -1, 1, -1, 2, -1, 2, 1, 2, -1, 0, -1],
      [0, 1, 2, -1, 3, -1, 2, 1, 2, -1, -1, 1, 0, -1, -1, -1],
      [3, 2, 3, -1, 2, 1, 2, -1, 1, 0, 1, -1, 2, -1, 3, -1],
      [0, -1, 0, 1, 2, -1, 2, 3, -1, 3, 2, 1, 0, -1, -1, -1],
    ],
    kick: [0, 3, 8, 11], snare: [4, 12], ghost: [14],
  },
};

// The order phrases play in: verse A (8 bars), then verse B (8 bars), then round again.
const FORM_A = [0, 1, 0, 2, 0, 1, 3, 2];
const FORM_B = [2, 3, 2, 3, 1, 0, 3, 0];

const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);

// NES-style pulse waves: 12.5%, 25% and 50% "duty cycle" give the thin, classic and round sounds.
const waves = {};
function pulse(duty) {
  if (!waves[duty]) {
    const n = 40, real = new Float32Array(n), imag = new Float32Array(n);
    for (let k = 1; k < n; k++) real[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty);
    waves[duty] = ctx.createPeriodicWave(real, imag);
  }
  return waves[duty];
}

// A held note (NES notes don't fade like a piano; they hold, then stop)
function note(freq, at, dur, wave, vol) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  if (typeof wave === "string") o.type = wave; else o.setPeriodicWave(wave);
  o.frequency.setValueAtTime(freq, at);
  g.gain.setValueAtTime(0.0001, at);
  g.gain.linearRampToValueAtTime(vol, at + 0.004);
  g.gain.setValueAtTime(vol * 0.85, at + Math.max(0.01, dur * 0.7));
  g.gain.linearRampToValueAtTime(0.0001, at + dur);
  o.connect(g); g.connect(musicBus);
  o.start(at); o.stop(at + dur + 0.02);
}
function kick(at, vol) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = "sine";
  o.frequency.setValueAtTime(150, at);
  o.frequency.exponentialRampToValueAtTime(42, at + 0.12);
  g.gain.setValueAtTime(vol, at);
  g.gain.exponentialRampToValueAtTime(0.0001, at + 0.16);
  o.connect(g); g.connect(musicBus);
  o.start(at); o.stop(at + 0.18);
}
const snare = (at, vol) => { noise(at, 0.11, { vol, freq: 1800, type: "bandpass", bus: musicBus }); note(190, at, 0.05, "triangle", vol * 0.5); };
const hat = (at, vol, open) => noise(at, open ? 0.13 : 0.03, { vol, freq: 7500, bus: musicBus });

let musicTimer = null, step = 0, nextAt = 0, track = MUSIC.adventure, gameMode = false, intensity = 0;

// Play one 16th-note "slot" of the song.
function playStep(t, at, stepDur) {
  const s = step % 16, bar = Math.floor(step / 16);
  const chord = t.chords[bar % t.chords.length];
  const intro = bar < 2;                                  // first 2 bars: just drums + bass
  const section = Math.floor(bar / 8) % 2;                // verse A or B
  const phrase = t.lead[(section ? FORM_B : FORM_A)[bar % 8] % t.lead.length];
  const when = at + (s % 2 === 1 ? t.swing * stepDur : 0); // swing!
  const hot = intensity;                                  // 0 menu, 1 playing, 2 streak 5+, 3 streak 15+

  // drums (with a fill at the end of every 8 bars)
  const fill = bar % 8 === 7 && s >= 12;
  if (t.kick.includes(s) || (hot >= 3 && (s === 10 || s === 14))) kick(when, 0.9);
  if (fill) snare(when, 0.22 + (s - 12) * 0.12);
  else if (t.snare.includes(s)) snare(when, 0.5);
  else if (!intro && t.ghost && t.ghost.includes(s)) snare(when, 0.12);
  const every = hot >= 2 ? 1 : t.hats;
  if (every && s % every === 0) hat(when, s % 4 === 2 ? 0.2 : 0.1, t.openHat === s);

  // bass
  const b = t.bass[s];
  if (b >= 0) note(midi(chord.root + b), when, stepDur * (t.bassLen || 0.85), "triangle", 0.8);

  // a little chord "stab" on the first beat of every other bar
  if (t.stab && s === 0 && bar % 2 === 0 && !intro) {
    chord.notes.slice(0, 3).forEach((n) => note(midi(n - 12), when, stepDur * 1.4, pulse(0.125), 0.05));
  }

  // the tune
  if (intro) return;
  const idx = phrase[s];
  if (idx < 0) return;
  let rests = 0;
  while (s + 1 + rests < 16 && phrase[s + 1 + rests] === -1 && rests < (t.hold || 2)) rests++;
  const len = stepDur * (1 + rests) * (t.leadLen || 0.85);
  const n = chord.notes[idx] + (hot >= 3 && section === 1 ? 12 : 0); // octave up on a mega streak
  note(midi(n), when, len, pulse(t.duty), 0.26);
  const twin = t.twin || (hot >= 2 ? 4 : 0);                         // twin harmony on a streak
  if (twin) note(midi(n - twin), when, len, pulse(0.125), 0.12);
  if (t.echo) note(midi(n + 12), when + stepDur * 3, len * 0.8, pulse(0.5), 0.06);
}

function scheduleMusic() {
  const t = track;
  const stepDur = 60 / (t.bpm * (gameMode ? 1.05 : 1)) / 4;
  while (nextAt < ctx.currentTime + 0.15) {
    playStep(t, nextAt, stepDur);
    nextAt += stepDur;
    step++;
  }
}

export const sound = {
  get sfxOn() { return sfxOn; },
  get musicOn() { return musicOn; },
  init({ sfx, music }) { sfxOn = sfx; musicOn = music; },
  unlock() { if (ensure() && musicOn) this.startMusic(); },
  play(name, arg) {
    if (!sfxOn || !SFX[name] || !ensure()) return;
    try { SFX[name](ctx.currentTime + 0.01, arg); } catch {}
  },
  setSfx(on) { sfxOn = on; },
  setMusic(on) { musicOn = on; on ? this.startMusic() : this.stopMusic(); },
  startMusic() {
    if (!musicOn || musicTimer || !ensure()) return;
    nextAt = ctx.currentTime + 0.05;
    musicTimer = setInterval(scheduleMusic, 30);
  },
  stopMusic() { clearInterval(musicTimer); musicTimer = null; },
  // Switch songs (starts the new one from the top).
  setTrack(id) {
    const next = MUSIC[id] || MUSIC.adventure;
    if (next === track) return;
    track = next;
    step = 0;
    if (ctx) nextAt = ctx.currentTime + 0.08;
  },
  get track() { return Object.keys(MUSIC).find((k) => MUSIC[k] === track); },
  // quieter while you're thinking, back up on menus
  mood(kind) {
    gameMode = kind === "game";
    if (!gameMode) intensity = 0;
    else if (intensity === 0) intensity = 1;
    if (musicBus) musicBus.gain.setTargetAtTime(gameMode ? 0.08 : 0.14, ctx.currentTime, 0.4);
  },
  // The band gets hyped as your streak grows: 1 normal, 2 = twin leads + fast hats, 3 = MAX
  setIntensity(level) { intensity = Math.max(0, Math.min(3, level)); },
};
