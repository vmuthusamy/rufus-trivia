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

function tone(freq, at, dur, { type = "square", vol = 0.2, slide = 0, bus = sfxBus, attack = 0.006 } = {}) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type;
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
  coin(t) { tone(NOTE.B5, t, 0.06, { vol: 0.1 }); tone(NOTE.E6, t + 0.06, 0.18, { vol: 0.1 }); },
  fanfare(t) {
    const mel = [["C5", 0, 0.12], ["E5", 0.12, 0.12], ["G5", 0.24, 0.12], ["C6", 0.36, 0.3], ["G5", 0.7, 0.12], ["C6", 0.84, 0.6]];
    mel.forEach(([n, at, d]) => { tone(NOTE[n], t + at, d + 0.05, { vol: 0.15 }); tone(NOTE[n] / 2, t + at, d + 0.05, { type: "triangle", vol: 0.12 }); });
    noise(t + 0.84, 0.6, { vol: 0.06, freq: 6000 });
  },
  sad(t) { [NOTE.G4, NOTE.F4, NOTE.E4].forEach((f, i) => tone(f, t + i * 0.3, 0.3, { type: "sawtooth", vol: 0.08 })); tone(NOTE.D4 * 1.0, t + 0.9, 0.9, { type: "sawtooth", vol: 0.08, slide: 0.9 }); },
};

// ---------- music: little chiptune loops (all original tunes) ----------
// Want a new song? Add one here: 32 melody notes (eighth notes, null = rest) and
// 16 bass notes, then use its name as `music:` in a topic file.
// hold = how many eighth-notes each melody note rings for (big = dreamy, small = bouncy).
export const MUSIC = {
  adventure: {
    name: "Fox Adventure", emoji: "🦊", tempo: 132, lead: "square", hold: 0.9, bassType: "triangle", hats: true, kick: true,
    melody: ["E5", "G5", "A5", "G5", "E5", "D5", "C5", "D5", "E5", "E5", "G5", "A5", "C6", "A5", "G5", null,
             "A5", "G5", "E5", "D5", "C5", "D5", "E5", "G5", "D5", null, "C5", "D5", "E5", null, null, null],
    bass: ["C3", "C3", "G2", "G2", "A2", "A2", "E2", "E2", "F2", "F2", "C3", "C3", "G2", "G2", "G2", "B2"],
  },
  cosmic: {
    name: "Cosmic Drift", emoji: "🌌", tempo: 96, lead: "triangle", hold: 1.9, bassType: "sine", hats: false, kick: false, sparkle: ["A6", "C7", "E7", "G6"],
    melody: ["A4", null, "C5", null, "E5", null, "G5", null, "F5", null, "E5", null, "C5", null, "D5", null,
             "E5", null, "A5", null, "G5", null, "E5", null, "D5", null, null, null, "C5", null, "B4", null],
    bass: ["A2", "A2", "A2", "A2", "F2", "F2", "F2", "F2", "C3", "C3", "C3", "C3", "G2", "G2", "E2", "E2"],
  },
  city: {
    name: "City Groove", emoji: "🏙️", tempo: 112, lead: "square", hold: 0.6, bassType: "sawtooth", hats: true, kick: true, bassShort: true,
    melody: ["D5", null, "F5", "D5", null, "A5", null, "G5", "F5", null, "D5", null, "C5", "D5", null, null,
             "D5", null, "F5", "G5", null, "A5", "C6", "A5", "G5", null, "F5", null, "E5", "F5", "D5", null],
    bass: ["D2", "D3", "D2", "A2", "G2", "G3", "G2", "D3", "F2", "F3", "F2", "C3", "A2", "A2", "G2", "E2"],
  },
  brain: {
    name: "Brain Beats", emoji: "🧮", tempo: 144, lead: "square", hold: 0.45, bassType: "triangle", hats: true, kick: true,
    melody: ["E5", "G5", "B5", "G5", "E5", "G5", "B5", "D6", "C6", "B5", "A5", "G5", "F#5", "G5", "A5", null,
             "E5", "G5", "B5", "G5", "E5", "B5", "E6", "D6", "C6", "A5", "F#5", "A5", "G5", null, "E5", null],
    bass: ["E2", "E3", "C2", "C3", "A2", "A3", "B2", "B3", "E2", "E3", "C2", "C3", "A2", "B2", "E2", "B2"],
  },
};
let musicTimer = null, step = 0, nextAt = 0, track = MUSIC.adventure, gameMode = false;

function scheduleMusic() {
  const t = track;
  const stepDur = 60 / (t.tempo * (gameMode ? 1.1 : 1)) / 2; // eighth notes, a bit faster while playing
  while (nextAt < ctx.currentTime + 0.15) {
    const m = t.melody[step % t.melody.length];
    if (m) tone(NOTE[m], nextAt, stepDur * t.hold, { type: t.lead, vol: t.lead === "triangle" ? 0.7 : 0.45, bus: musicBus });
    if (step % 2 === 0) {
      const b = t.bass[(step / 2) % t.bass.length];
      if (b) tone(NOTE[b], nextAt, stepDur * (t.bassShort ? 0.8 : 1.8), { type: t.bassType, vol: t.bassType === "sawtooth" ? 0.35 : 0.9, bus: musicBus });
    }
    if (t.hats && step % 2 === 1) noise(nextAt, 0.04, { vol: 0.25, freq: 8000, bus: musicBus });
    if (t.kick && step % 8 === 0) noise(nextAt, 0.12, { vol: 0.5, freq: 160, type: "lowpass", bus: musicBus });
    if (t.sparkle && step % 4 === 2) tone(NOTE[t.sparkle[(step / 4) % t.sparkle.length | 0]], nextAt, 0.6, { type: "sine", vol: 0.12, bus: musicBus });
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
  // quieter (and a little faster) while you're thinking, back up on menus
  mood(kind) {
    gameMode = kind === "game";
    if (musicBus) musicBus.gain.setTargetAtTime(gameMode ? 0.07 : 0.14, ctx.currentTime, 0.4);
  },
};
