// Deal each subject a turn, but shuffle tied subjects using the game's seeded RNG.
// Counting existing keys means reconnects and multiplayer clients get the same questions.
export function balancedNext(ctx, parts) {
  const count = (keys, prefix) => [...(keys || [])].filter(k => k.startsWith(prefix)).length;
  const scores = parts.map(part => ({ part, used: count(ctx.used,part.prefix), recent: count(ctx.avoid,part.prefix) }));
  const min = Math.min(...scores.map(s=>s.used));
  const least = scores.filter(s=>s.used===min);
  const recentMin = Math.min(...least.map(s=>s.recent));
  return ctx.rng.pick(least.filter(s=>s.recent===recentMin)).part.next(ctx);
}
