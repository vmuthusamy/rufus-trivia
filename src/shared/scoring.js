// How points work. Same rules for everyone, worked out on the server only.

export const SOLO = { lives: 3, timer: 15, maxQuestions: 60 };

export const ROOM_LIMITS = {
  counts: [5, 10, 15, 20],
  timers: [10, 15, 20, 30],
  levels: ["easy", "medium", "hard", "mixed"],
  maxPlayers: 30,
};

// Which level (1 easy, 2 medium, 3 hard) question number `index` should be.
export function levelFor(setting, index, total) {
  if (setting === "easy") return 1;
  if (setting === "medium") return 2;
  if (setting === "hard") return 3;
  if (setting === "ramp") return index < 5 ? 1 : index < 12 ? 2 : 3; // solo runs keep getting harder
  // "mixed": first third easy, middle medium, last third hard
  const third = total / 3;
  return index < third ? 1 : index < third * 2 ? 2 : 3;
}

// Points for one answer.
//   correct: right or wrong
//   msUsed: how long they took
//   timeLimitMs: the timer for this question
//   level: 1-3 (harder = more points)
//   streak: how many right in a row INCLUDING this one
export function scoreAnswer({ correct, msUsed, timeLimitMs, level, streak }) {
  if (!correct) return 0;
  const speed = Math.max(0, Math.min(1, 1 - msUsed / timeLimitMs));
  const base = 500 + 500 * speed;                  // 500 for being right, up to +500 for being fast
  const mult = level === 3 ? 1.5 : level === 2 ? 1.25 : 1;
  const streakBonus = Math.min(Math.max(streak - 1, 0), 5) * 100; // +100 per streak step, max +500
  return Math.round((base * mult) / 10) * 10 + streakBonus;
}
