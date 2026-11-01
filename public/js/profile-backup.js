// A backup carries the private player ID, not a copy of the wallet. Keep it like a password.
export function readProfileBackup(text) {
  if (typeof text !== "string" || text.length > 16384) throw new Error("That backup file is too large.");
  let b;
  try { b = JSON.parse(text); } catch { throw new Error("Choose a Rufus Trivia backup file."); }
  const p = b?.player;
  if (b?.app !== "rufus-trivia" || b.version !== 1 || !p ||
      typeof p.id !== "string" || !/^[a-zA-Z0-9_-]{8,40}$/.test(p.id) ||
      ![p.adj, p.animal, p.color].every((v) => typeof v === "string" && v.length <= 40) ||
      (p.nick != null && (typeof p.nick !== "string" || p.nick.length > 14))) {
    throw new Error("Choose a valid Rufus Trivia backup file.");
  }
  // Only profile fields are allowed. A backup cannot set coins, cards, scores or stickers.
  return { id: p.id, adj: p.adj, animal: p.animal, color: p.color, nick: p.nick || null };
}

export function makeProfileBackup(player) {
  const clean = readProfileBackup(JSON.stringify({ app: "rufus-trivia", version: 1, player }));
  return JSON.stringify({ app: "rufus-trivia", version: 1, player: clean }, null, 2);
}
