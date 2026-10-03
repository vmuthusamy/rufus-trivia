// Seeded random numbers. The same seed always makes the same game,
// which is how every player in a challenge room gets the exact same questions.

export function hashSeed(str) {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  return h1 >>> 0;
}

export function makeRng(seed) {
  let a = typeof seed === "number" ? seed >>> 0 : hashSeed(String(seed));
  // mulberry32: tiny, fast, good enough for shuffling quiz questions
  function next() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  const rng = {
    next,
    int: (n) => Math.floor(next() * n),
    chance: (p) => next() < p,
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    shuffle(arr) {
      const out = arr.slice();
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out;
    },
    // pairs: [[value, weight], ...]
    weighted(pairs) {
      const total = pairs.reduce((s, p) => s + p[1], 0);
      let r = next() * total;
      for (const [value, w] of pairs) { if ((r -= w) < 0) return value; }
      return pairs[pairs.length - 1][0];
    },
  };
  return rng;
}

// A fresh random seed for a new game (uses the platform's crypto RNG).
export function freshSeed() {
  const b = new Uint32Array(2);
  crypto.getRandomValues(b);
  return b[0].toString(36) + b[1].toString(36);
}
