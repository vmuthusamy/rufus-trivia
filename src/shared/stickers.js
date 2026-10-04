// 🎖️ STICKERS - collectible achievements. Earned in games, kept forever on that player,
// and shown off next to their name in every challenge room after that.
//
// Want a new sticker? Add it to STICKERS (rarity 1 = common ... 5 = super rare),
// then award it in one of the functions below. The server decides who earns what,
// so stickers can't be faked.

export const STICKERS = [
  // streaks (the same milestones as the streak banners)
  { id: "streak3", emoji: "🎩", name: "Hat Trick", how: "Get 3 right in a row", rarity: 1 },
  { id: "streak5", emoji: "🧠", name: "Brain Spree", how: "Get 5 right in a row", rarity: 1 },
  { id: "streak7", emoji: "🔥", name: "On Fire", how: "Get 7 right in a row", rarity: 2 },
  { id: "streak10", emoji: "⚡", name: "Fact Frenzy", how: "Get 10 right in a row", rarity: 2 },
  { id: "streak15", emoji: "🌪️", name: "Running Wild", how: "Get 15 right in a row", rarity: 3 },
  { id: "streak20", emoji: "🚀", name: "Unstoppable", how: "Get 20 right in a row", rarity: 3 },
  { id: "streak25", emoji: "🛡️", name: "Untouchable", how: "Get 25 right in a row", rarity: 4 },
  { id: "streak30", emoji: "💎", name: "Invincible", how: "Get 30 right in a row", rarity: 4 },
  { id: "streak40", emoji: "🌌", name: "Galaxy Brain", how: "Get 40 right in a row", rarity: 5 },
  { id: "streak50", emoji: "👑", name: "LEGENDARY", how: "Get 50 right in a row", rarity: 5 },
  // special moments
  { id: "speedy", emoji: "🐾", name: "Speedy Paws", how: "Answer right in under 2 seconds", rarity: 1 },
  { id: "champion", emoji: "🏆", name: "Champion", how: "Win a challenge room", rarity: 2 },
  { id: "perfect", emoji: "💯", name: "Perfect Round", how: "Get every question right in a challenge (5+ questions)", rarity: 4 },
  { id: "partyhost", emoji: "🎉", name: "Party Host", how: "Host a challenge with 4 or more players", rarity: 2 },
  { id: "social", emoji: "🤝", name: "Team Player", how: "Play 5 challenge games", rarity: 2 },
  { id: "globetrotter", emoji: "🧳", name: "Explorer", how: "Play every topic at least once", rarity: 2 },
  // 🎯 Quiz Bingo (the Rufus family cheers you on: see stickersForBingo and stickersForCall)
  { id: "bingo_line", emoji: "🎯", name: "Bingo!", how: "Be first to fill a line in a Bingo game", rarity: 2 },
  { id: "bingo_blackout", emoji: "🌑", name: "Blackout", how: "Be first to stamp your whole card in a Blackout Bingo game", rarity: 4 },
  { id: "felix_socks", emoji: "🧦", name: "Felix's Lucky Socks", how: "Get BINGO in 8 calls or fewer", rarity: 3 },
  { id: "marthina_pizza", emoji: "🍕", name: "Marthina's Perfect Pizza", how: "Get BINGO without a single wrong tap", rarity: 3 },
  { id: "renard_eye", emoji: "🧐", name: "Renard's Sharp Eye", how: "Spot 5 calls that aren't on your card in one Bingo game", rarity: 2 },
  { id: "fiery_stomp", emoji: "🦖", name: "Fiery's Double Stomp", how: "Finish two lines with one stamp", rarity: 4 },
  { id: "golden_paw", emoji: "🐾", name: "Golden Paw", how: "Get BINGO on a Second chance! call", rarity: 3 },
  // topic masters: 15 right in one game
  { id: "flags_master", emoji: "🚩", name: "Flag Master", how: "Get 15 right in one Flag Frenzy game", rarity: 3 },
  { id: "culture_master", emoji: "🎬", name: "Super Fan", how: "Get 15 right in one Books & Pop Culture game", rarity: 3 },
  { id: "animals_master", emoji: "🐍", name: "Snake Charmer", how: "Get 15 right in one Animal Kingdom game", rarity: 3 },
  { id: "science_master", emoji: "🔬", name: "Science Whiz", how: "Get 15 right in one Science & Space game", rarity: 3 },
  { id: "math_master", emoji: "🧙", name: "Math Wizard", how: "Get 15 right in one Math Blast game", rarity: 3 },
  // retired: their topics are gone, so nobody new can earn them. Whoever has one keeps it
  // (a rare collector's sticker!), and the sticker book only shows them to their owners.
  { id: "world_master", emoji: "🗺️", name: "World Traveller", how: "Got 15 right in one Capitals & Landmarks game", rarity: 3, retired: true },
  { id: "space_master", emoji: "🧑‍🚀", name: "Space Ace", how: "Got 15 right in one Space Explorer game", rarity: 3, retired: true },
];

export const STICKER_BY_ID = Object.fromEntries(STICKERS.map((s) => [s.id, s]));
const STREAK_AT = [3, 5, 7, 10, 15, 20, 25, 30, 40, 50];

// After each question is revealed (never before, so a sticker can't give the answer away).
export function stickersForAnswer({ topic, correct, streak, ms, correctSoFar }) {
  if (!correct) return [];
  const out = [];
  if (STREAK_AT.includes(streak)) out.push("streak" + streak);
  if (ms < 2000) out.push("speedy");
  if (correctSoFar === 15 && STICKER_BY_ID[topic + "_master"]) out.push(topic + "_master");
  return out;
}

// When a challenge room finishes.
export function stickersForFinish({ kind, rank, players, score, correct, count }) {
  if (kind !== "room") return [];
  const out = [];
  if (players >= 2 && rank === 1 && score > 0) out.push("champion");
  if (count >= 5 && correct === count) out.push("perfect");
  return out;
}

// 🎯 When someone gets BINGO (at the reveal of the winning call, never before).
//   win:     "line" or "blackout" (the room's bingo setting)
//   calls:   how many calls the game took (Felix's socks: 8 or fewer; only a Line game can be that quick)
//   perfect: every call right so far (a stamp, or ✋ when the square wasn't on their card)
//   again:   the winning call was a "Second chance!"
export function stickersForBingo({ win, calls, perfect, again }) {
  const out = [win === "blackout" ? "bingo_blackout" : "bingo_line"];
  if (calls <= 8) out.push("felix_socks");
  if (perfect) out.push("marthina_pizza");
  if (again) out.push("golden_paw");
  return out;
}

// 🎯 After every bingo call is revealed, for everyone (winner or not).
//   newLines:  how many lines this stamp finished at once (a corner can finish a row AND a column)
//   spotted:   right ✋ "Not on my card" taps so far this game
export function stickersForCall({ newLines, spotted }) {
  const out = [];
  if (newLines >= 2) out.push("fiery_stomp");
  if (spotted >= 5) out.push("renard_eye");
  return out;
}

// When a game starts (uses each player's game history, kept on the server).
export function stickersForStart({ kind, isHost, players, topicsPlayed, allTopics, roomGames }) {
  const out = [];
  if (kind === "room" && isHost && players >= 4) out.push("partyhost");
  if (topicsPlayed >= allTopics) out.push("globetrotter");
  if (roomGames >= 5) out.push("social");
  return out;
}

// The stickers someone shows off next to their name: rarest first, newest breaks ties.
export function showcase(ids, n = 3) {
  return (ids || [])
    .map((id, i) => ({ id, i }))
    .filter((x) => STICKER_BY_ID[x.id])
    .sort((a, b) => STICKER_BY_ID[b.id].rarity - STICKER_BY_ID[a.id].rarity || b.i - a.i)
    .slice(0, n)
    .map((x) => x.id);
}
