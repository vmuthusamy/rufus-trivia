// Remembers things in this browser: players on this device, personal bests,
// which questions you've seen (so games stay fresh) and which ones you missed.
// Wrapped in try/catch: private windows can block storage, and the game should still work.

const mem = {};
function get(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v == null ? (key in mem ? mem[key] : fallback) : JSON.parse(v);
  } catch { return key in mem ? mem[key] : fallback; }
}
function set(key, value) {
  mem[key] = value;
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

const MAX_PROFILES = 6;
const SEEN_KEEP = 160;
const MISSED_KEEP = 60;

function blank() { return { best: {}, seen: {}, missed: {}, games: 0, wins: 0 }; }

export const store = {
  newId() {
    const b = new Uint8Array(12);
    crypto.getRandomValues(b);
    return "p" + [...b].map((x) => x.toString(36).padStart(2, "0")).join("").slice(0, 20);
  },
  profiles() { return get("rt_profiles", []); },
  active() {
    const id = get("rt_active", null);
    return this.profiles().find((p) => p.id === id) || null;
  },
  setActive(id) { set("rt_active", id); },
  saveProfile(p) {
    const list = this.profiles().filter((x) => x.id !== p.id);
    list.unshift({ id: p.id, adj: p.adj, animal: p.animal, color: p.color, nick: p.nick || null });
    set("rt_profiles", list.slice(0, MAX_PROFILES));
    this.setActive(p.id);
  },

  data(pid) { return Object.assign(blank(), get("rt_p_" + pid, {})); },
  saveData(pid, d) { set("rt_p_" + pid, d); },

  seen(pid, topic) { return (this.data(pid).seen[topic] || []).slice(); },
  missed(pid, topic) { return (this.data(pid).missed[topic] || []).slice(); },

  // After each question: remember it was seen, and whether it needs practice.
  remember(pid, topic, key, correct) {
    if (!pid || !key) return;
    const d = this.data(pid);
    const seen = (d.seen[topic] || []).filter((k) => k !== key);
    seen.push(key);
    d.seen[topic] = seen.slice(-SEEN_KEEP);
    let missed = (d.missed[topic] || []).filter((k) => k !== key);
    if (!correct) missed.push(key);
    d.missed[topic] = missed.slice(-MISSED_KEEP);
    this.saveData(pid, d);
  },

  best(pid, topic) { return pid ? this.data(pid).best[topic] || 0 : 0; },
  recordGame(pid, topic, score, won) {
    const d = this.data(pid);
    d.games += 1;
    if (won) d.wins += 1;
    const prev = d.best[topic] || 0;
    if (score > prev) d.best[topic] = score;
    this.saveData(pid, d);
    return { prev, isBest: score > prev };
  },

  pref(name, fallback) { return get("rt_pref_" + name, fallback); },
  setPref(name, value) { set("rt_pref_" + name, value); },
};
