// Kid-safe names.
//
// The main way to get a name is to build one from the word lists below ("Turbo Fox").
// That's anonymous and can never be rude. Kids who want their REAL name on the
// leaderboard can type a first name instead; checkNick() below decides if it's OK.

export const ADJECTIVES = [
  "Turbo", "Sneaky", "Mighty", "Cosmic", "Fuzzy", "Jolly", "Speedy", "Brave", "Clever", "Lucky",
  "Sparkly", "Zippy", "Bouncy", "Giant", "Tiny", "Super", "Mega", "Happy", "Wild", "Silly",
  "Rocket", "Ninja", "Pixel", "Golden", "Thunder", "Frosty", "Blazing", "Groovy", "Epic", "Dizzy",
  "Snappy", "Funky", "Wobbly", "Jumpy", "Shiny", "Swift", "Daring", "Noble", "Laser", "Comet",
];

export const ANIMALS = [
  ["Fox", "🦊"], ["Panda", "🐼"], ["Tiger", "🐯"], ["Frog", "🐸"], ["Monkey", "🐵"], ["Lion", "🦁"],
  ["Koala", "🐨"], ["Octopus", "🐙"], ["Unicorn", "🦄"], ["Dragon", "🐲"], ["Penguin", "🐧"], ["Owl", "🦉"],
  ["Otter", "🦦"], ["Shark", "🦈"], ["Dino", "🦖"], ["Bunny", "🐰"], ["Puppy", "🐶"], ["Kitty", "🐱"],
  ["Hamster", "🐹"], ["Turtle", "🐢"], ["Whale", "🐳"], ["Eagle", "🦅"], ["Bee", "🐝"], ["Llama", "🦙"],
  ["Sloth", "🦥"], ["Hedgehog", "🦔"], ["Parrot", "🦜"], ["Raccoon", "🦝"],
];

export const COLORS = ["#ff8a1f", "#ff4d6d", "#ffd23f", "#3ddc97", "#38bdf8", "#8b5cf6", "#f472b6", "#a3e635"];

const ANIMAL_EMOJI = Object.fromEntries(ANIMALS);

// ---------- typed-in names ----------
// Rules: 2-14 characters, letters only (plus space, hyphen, apostrophe).
// No numbers or symbols means no ages, phone numbers, emails or web links.
const NICK_RE = /^\p{L}[\p{L}' -]*$/u;

// Words that are never OK as a whole word ("Ass" is blocked, "Cassandra" is fine).
const BAD_WORDS = new Set(`
  ass arse butt crap damn hell piss poop pee fart shit shite bum boob boobs tit tits sex sexy porn
  dick cock penis vagina balls nazi hitler kill killer die dead suicide drug drugs weed beer
  stupid idiot dumb loser hate ugly fat moron retard
`.split(/\s+/).filter(Boolean));

// Bits that are never innocent, even inside a longer word.
const BAD_PARTS = ["fuck", "cunt", "nigg", "faggot", "motherf", "asshole", "bitch", "whore", "dildo", "wanker"];

function isRude(nick) {
  const plain = nick.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase(); // "Zoë" -> "zoe"
  const words = plain.split(/[ '-]+/).filter(Boolean);
  const squashed = plain.replace(/[^a-z]/g, ""); // catches "f u c k" and "A-s-s"
  return words.some((w) => BAD_WORDS.has(w)) || BAD_WORDS.has(squashed) || BAD_PARTS.some((p) => squashed.includes(p));
}

// Is this typed-in name OK? Returns { ok, nick } or { ok: false, reason } (reason is shown to the kid).
// An empty name is fine: it just means "use my secret agent name".
export function checkNick(raw) {
  if (raw == null || raw === "") return { ok: true, nick: null };
  if (typeof raw !== "string") return { ok: false, reason: "That name won't work." };
  const nick = raw.normalize("NFC").replace(/\s+/g, " ").trim();
  if (nick.length < 2 || nick.length > 14) return { ok: false, reason: "Use 2 to 14 letters." };
  if (!NICK_RE.test(nick)) return { ok: false, reason: "Letters only, please (no numbers or symbols)." };
  if (isRude(nick)) return { ok: false, reason: "Hmm, let's pick a different name." };
  // Tidy capitals: "arvind" -> "Arvind", "mary-jane" -> "Mary-Jane"
  return { ok: true, nick: nick.toLowerCase().replace(/(^|[ '-])(\p{L})/gu, (_, sep, ch) => sep + ch.toUpperCase()) };
}

// The part of a name that makes it "the same name": "Zoë", "zoe" and "Z'oe" are all "zoe".
export function nameKey(nick) {
  if (typeof nick !== "string") return "";
  return nick.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^\p{L}]/gu, "");
}

// Check a player profile sent by a browser. Returns a clean copy, or null if it's not allowed.
// A typed-in name that breaks the rules is quietly ignored (they keep their secret agent name).
export function cleanPlayer(p) {
  if (!p || typeof p !== "object") return null;
  const id = typeof p.id === "string" && /^[a-zA-Z0-9_-]{8,40}$/.test(p.id) ? p.id : null;
  if (!id) return null;
  const adj = ADJECTIVES.includes(p.adj) ? p.adj : null;
  const animal = p.animal in ANIMAL_EMOJI ? p.animal : null;
  const color = COLORS.includes(p.color) ? p.color : COLORS[0];
  if (!adj || !animal) return null;
  const typed = checkNick(p.nick);
  const nick = typed.ok ? typed.nick : null;
  return { id, adj, animal, color, nick, name: nick || adj + " " + animal, emoji: ANIMAL_EMOJI[animal] };
}

// Keys for "seen recently" / "missed" lists: short, safe strings only.
export function cleanKeys(list, max = 300) {
  if (!Array.isArray(list)) return [];
  return list.filter((k) => typeof k === "string" && /^[a-z0-9_-]{1,32}$/i.test(k)).slice(-max);
}
