// 🦊 RUFUS TRIVIA - the browser side.
// The server runs the game and keeps the answers secret. This file just shows
// what the server says, as excitingly as possible, and sends your answers back.

import { CONFIG } from "./config.js";
import { store } from "./store.js";
import { sound, MUSIC } from "./sound.js";
import { makeHost, makeFox, line } from "./rufus.js";
import * as fx from "./fx.js";
import { openGame } from "./net.js";
import { celebrate, streakBroken, badge } from "./streaks.js";
import qrcode from "./vendor/qrcode.mjs";

const $ = (id) => document.getElementById(id);
function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const SHAPES = ["▲", "◆", "●", "★"];
const LEVEL = { 1: ["Easy", null], 2: ["Medium", "#a78bfa"], 3: ["Hard 🔥", "#ff4d6d"] };
const LEVEL_NAMES = { easy: "Easy", medium: "Medium", hard: "Hard", mixed: "Mixed" };
const MENU_SCREENS = new Set(["home", "profile", "setup", "join", "hall"]);

const S = {
  meta: null,
  topicId: "flags",
  profile: store.active(),
  draft: null,
  after: null,
  setup: { count: 10, timer: 15, level: "mixed" },
  hall: { topic: "flags", period: "all" },
  join: { code: "", info: null },
  screen: null,
  g: null, // the game we're in right now
};

const host = makeHost({ dock: $("rufusDock"), foxEl: $("rufus"), bubble: $("bubble"), text: $("bubbleText") });
let heroFox = null;

// ---------- small helpers ----------
function toast(msg, ms = 2600) {
  const t = $("toast");
  t.textContent = msg;
  t.classList.remove("hidden");
  clearTimeout(toast.t);
  toast.t = setTimeout(() => t.classList.add("hidden"), ms);
}
function announce(msg) { $("announcer").textContent = msg; }

async function api(path, opts) {
  const r = await fetch(path, opts);
  let data = {};
  try { data = await r.json(); } catch {}
  if (!r.ok) throw Object.assign(new Error(data.error || "Network trouble. Try again!"), { status: r.status, data });
  return data;
}
const post = (path, body) => api(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

const topic = (id) => (S.meta && (S.meta.topics.find((t) => t.id === id) || S.meta.topics[0])) || null;
const emojiFor = (animal) => ((S.meta && S.meta.names.animals.find((a) => a[0] === animal)) || [0, "🦊"])[1];
const playerPayload = () => S.profile && { id: S.profile.id, adj: S.profile.adj, animal: S.profile.animal, color: S.profile.color, nick: S.profile.nick || null };
// A typed-in first name wins; otherwise the secret agent name ("Turbo Fox").
const displayName = (p) => (p.nick ? p.nick : `${p.adj} ${p.animal}`);
const meOf = (st) => st.players.find((p) => p.id === st.me) || { score: 0, streak: 0, lives: 0, rank: 1 };

function restartAnim(node, cls) {
  node.classList.remove(cls);
  void node.offsetWidth;
  node.classList.add(cls);
}

function typeText(node, text) {
  clearInterval(node._t);
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) { node.textContent = text; return; }
  let i = 0;
  node.textContent = "";
  node._t = setInterval(() => {
    i += 2;
    node.textContent = text.slice(0, i);
    if (i >= text.length) clearInterval(node._t);
  }, 16);
}

function avatar(cls, p) {
  const a = el("span", cls, p.emoji);
  a.style.setProperty("--pc", p.color);
  return a;
}

// ---------- screens ----------
function show(name, { accent } = {}) {
  const next = $("scr-" + name);
  document.querySelectorAll(".screen.on").forEach((s) => { if (s !== next) s.classList.remove("on"); });
  if (!next.classList.contains("on")) {
    next.querySelectorAll(".anim").forEach((e, i) => e.style.setProperty("--i", i));
    next.classList.add("on");
    next.scrollTop = 0;
  }
  S.screen = name;
  const t = topic(S.topicId);
  fx.setAccent(accent || (name === "home" && t ? t.color : next.dataset.accent));
  $("parade").classList.toggle("off", !MENU_SCREENS.has(name));
  host.show(name !== "home");
  host.ingame(name === "game");
  if (name !== "game") fx.setSpeed(1);
  sound.mood(name === "game" ? "game" : "menu");
}

function requireProfile(next) {
  if (S.profile) next();
  else openProfile(next);
}

// ---------- top bar ----------
function renderMe() {
  const p = S.profile;
  $("meAv").textContent = p ? emojiFor(p.animal) : "❔";
  $("meChip").style.setProperty("--pc", p ? p.color : "");
  $("meName").textContent = p ? displayName(p) : "Pick a name";
}

// ---------- HOME ----------
function renderTopics() {
  const box = $("topicCards");
  box.innerHTML = "";
  for (const t of S.meta.topics) {
    const b = el("button", "topic");
    b.setAttribute("role", "radio");
    b.setAttribute("aria-checked", String(t.id === S.topicId));
    b.style.setProperty("--tc", t.color);
    b.append(el("span", "te", t.emoji), el("b", null, t.title), el("small", null, t.blurb));
    const best = store.best(S.profile && S.profile.id, t.id);
    if (best) b.append(el("span", "best", "★ " + best.toLocaleString()));
    b.onclick = () => {
      const changed = S.topicId !== t.id;
      S.topicId = t.id;
      store.setPref("topic", t.id);
      sound.play("pick");
      renderTopics();
      fx.setAccent(t.color);
      if (changed) themeFor(t);
      if (heroFox) heroFox.mood("cheer", 900);
      heroSay(`${t.emoji} ${t.title}! ${t.blurb}`);
    };
    box.append(b);
  }
}

// Each topic dresses up the home screen: what orbits Rufus, what floats in the background, and the music.
function themeFor(t) {
  const flags = t.orbit === "flags";
  renderOrbit(flags ? S.meta.gallery.slice(14, 22) : t.orbit);
  fx.parade($("parade"), flags ? S.meta.gallery.slice(0, 14) : Array.from({ length: 14 }, (_, i) => t.orbit[i % t.orbit.length]));
  applyMusic(t);
}

// "auto" = each topic plays its own song; otherwise the song the player picked from the ♫ menu.
function applyMusic(t) {
  const pick = store.pref("track", "auto");
  sound.setTrack(pick === "auto" ? (t && t.music) || "adventure" : pick);
}

function renderOrbit(items) {
  const orbit = $("orbit");
  orbit.innerHTML = "";
  const small = innerWidth < 980;
  const rad = small ? 120 : Math.min(230, innerWidth * 0.17);
  items.forEach((item, i) => {
    const o = el("div", "orb");
    o.style.setProperty("--ang", (i * 360) / items.length + "deg");
    o.style.setProperty("--rad", rad + "px");
    o.style.setProperty("--k", i);
    const holder = el("i");
    let thing;
    if (item.startsWith("/")) {
      thing = new Image();
      thing.src = item;
      thing.alt = "";
      thing.style.setProperty("--s", (small ? 46 : 64 + (i % 3) * 10) + "px");
    } else {
      thing = el("span", "oe", item); // an emoji: planet, landmark, maths symbol…
      thing.style.setProperty("--s", (small ? 38 : 50 + (i % 3) * 10) + "px");
    }
    thing.style.setProperty("--dl", -i * 0.4 + "s");
    holder.append(thing);
    o.append(holder);
    orbit.append(o);
  });
}

// ---------- MUSIC MENU ----------
function renderMusicMenu() {
  const menu = $("musicMenu");
  menu.innerHTML = "";
  menu.append(el("p", null, "Music"));
  const current = sound.musicOn ? store.pref("track", "auto") : "off";
  const t = topic(S.g ? S.g.topicId : S.topicId);
  const item = (id, emoji, name, sub) => {
    const b = el("button");
    b.setAttribute("role", "menuitemradio");
    b.setAttribute("aria-checked", String(current === id));
    const label = el("span", null, name);
    if (sub) label.append(el("small", null, sub));
    b.append(el("span", "e", emoji), label);
    b.onclick = () => pickMusic(id);
    menu.append(b);
  };
  item("auto", "✨", "Match the topic", t ? `${t.title} → ${(MUSIC[t.music] || MUSIC.adventure).name}` : "");
  for (const [id, m] of Object.entries(MUSIC)) item(id, m.emoji, m.name);
  item("off", "🔇", "Music off");
}

function pickMusic(id) {
  if (id === "off") {
    sound.setMusic(false);
    store.setPref("music", false);
  } else {
    store.setPref("track", id);
    store.setPref("music", true);
    applyMusic(topic(S.g ? S.g.topicId : S.topicId));
    sound.setMusic(true);
    sound.unlock();
  }
  $("musicBtn").setAttribute("aria-pressed", String(sound.musicOn));
  sound.play("pick");
  renderMusicMenu();
}

function toggleMusicMenu(open) {
  const menu = $("musicMenu");
  const show = open ?? menu.classList.contains("hidden");
  if (show) renderMusicMenu();
  menu.classList.toggle("hidden", !show);
  $("musicBtn").setAttribute("aria-expanded", String(show));
}

function heroSay(msg) {
  let b = $("heroBubble");
  if (!b) return;
  b.textContent = msg;
  restartAnim(b, "show");
}

// Once a day, tell the server "this device visited" for the stats page.
// It's a random id made up right here: no name, no account, no cookie.
function pingVisit() {
  const today = new Date().toISOString().slice(0, 10);
  if (store.pref("visitDay", "") === today) return;
  let vid = store.pref("vid", "");
  if (!/^v[a-z0-9]{10,30}$/.test(vid)) {
    const b = new Uint8Array(10);
    crypto.getRandomValues(b);
    vid = "v" + [...b].map((x) => x.toString(36).padStart(2, "0")).join("").slice(0, 18);
    store.setPref("vid", vid);
  }
  fetch("/api/visit", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ vid }), keepalive: true })
    .then((r) => { if (r.ok) store.setPref("visitDay", today); })
    .catch(() => {});
}

function preloadFlags(list) {
  let i = 0;
  const step = () => {
    for (let k = 0; k < 10 && i < list.length; k++, i++) { const im = new Image(); im.src = list[i]; }
    if (i < list.length) setTimeout(step, 300);
  };
  setTimeout(step, 1800);
}

// ---------- PROFILE ----------
function randomDraft() {
  const n = S.meta.names;
  return { id: null, adj: pick(n.adjectives), animal: pick(n.animals)[0], color: pick(n.colors) };
}

// opts.back = which screen "Back" returns to; opts.ownName = jump straight to typing a real name
function openProfile(after, opts = {}) {
  S.after = after || null;
  S.profileBack = opts.back || null;
  // fresh = start a brand-new player (e.g. a second player on the same computer)
  S.draft = S.profile && !opts.fresh ? { ...S.profile } : randomDraft();
  S.ownNameOpen = !!(S.draft.nick || opts.ownName);
  renderSaved();
  renderBuilder(true);
  show("profile", { accent: S.draft.color });
  if (opts.ownName) {
    host.say("Type your first name and it'll show on the leaderboard!", { mood: "happy" });
    setTimeout(() => $("ownNameInput").focus(), 350);
  } else host.say(line("profile"), { mood: "happy" });
}

function renderSaved() {
  const box = $("savedProfiles");
  box.innerHTML = "";
  const list = store.profiles();
  if (!list.length) return;
  for (const p of list) {
    const b = el("button");
    b.setAttribute("aria-pressed", String(S.draft.id === p.id));
    const av = avatar("av", { emoji: emojiFor(p.animal), color: p.color });
    av.style.background = p.color;
    b.append(av, document.createTextNode(displayName(p)));
    b.onclick = () => { S.draft = { ...p }; S.ownNameOpen = !!p.nick; sound.play("pick"); renderSaved(); renderBuilder(true); };
    box.append(b);
  }
  const add = el("button", null, "＋ New player");
  add.onclick = () => { S.draft = randomDraft(); S.ownNameOpen = false; sound.play("pick"); renderSaved(); renderBuilder(true); };
  box.append(add);
}

function renderBuilder(pop) {
  const d = S.draft, n = S.meta.names;
  $("pvEmoji").textContent = emojiFor(d.animal);
  // Show the typed name if there is one, otherwise the secret agent name.
  $("pvAdj").textContent = d.nick ? "" : d.adj;
  $("pvAnimal").textContent = d.nick ? "" : d.animal;
  $("pvOwn").textContent = d.nick || "";
  $("reelRow").classList.toggle("off", !!d.nick);
  $("ownNameBox").classList.toggle("hidden", !S.ownNameOpen);
  $("ownNameToggle").classList.toggle("hidden", !!S.ownNameOpen);
  const input = $("ownNameInput");
  if (document.activeElement !== input) input.value = d.nick || "";
  $("pvAvatar").style.setProperty("--pc", d.color);
  if (pop) restartAnim($("pvAvatar"), "pop");
  fx.setAccent(d.color);

  const grid = $("animalGrid");
  grid.innerHTML = "";
  for (const [name, emoji] of n.animals) {
    const b = el("button", null, emoji);
    b.title = name;
    b.setAttribute("aria-label", name);
    b.setAttribute("aria-pressed", String(name === d.animal));
    b.onclick = () => { d.animal = name; sound.play("pick"); renderBuilder(true); };
    grid.append(b);
  }
  const sw = $("swatches");
  sw.innerHTML = "";
  for (const c of n.colors) {
    const b = el("button");
    b.style.setProperty("--sw", c);
    b.setAttribute("aria-label", "Colour " + c);
    b.setAttribute("aria-pressed", String(c === d.color));
    b.onclick = () => { d.color = c; sound.play("pick"); renderBuilder(true); };
    sw.append(b);
  }
}

function stepAdj(dir) {
  const list = S.meta.names.adjectives;
  const i = list.indexOf(S.draft.adj);
  S.draft.adj = list[(i + dir + list.length) % list.length];
  sound.play("click");
  renderBuilder(false);
}

function spinName() {
  const n = S.meta.names;
  const adjEl = $("pvAdj"), aniEl = $("pvAnimal");
  adjEl.classList.add("spinning");
  aniEl.classList.add("spinning");
  let k = 0;
  const t = setInterval(() => {
    adjEl.textContent = pick(n.adjectives);
    aniEl.textContent = pick(n.animals)[0];
    sound.play("tick");
    if (++k > 14) {
      clearInterval(t);
      adjEl.classList.remove("spinning");
      aniEl.classList.remove("spinning");
      S.draft.adj = pick(n.adjectives);
      S.draft.animal = pick(n.animals)[0];
      sound.play("coin");
      renderBuilder(true);
    }
  }, 70);
}

// Typing a real name: quick checks right here, the full check happens on the server when saving.
function onOwnNameInput() {
  const input = $("ownNameInput"), hint = $("ownNameHint");
  const v = input.value.replace(/\s+/g, " ").trimStart();
  // Preview with tidy capitals ("arvind" -> "Arvind"); the server tidies it the same way when saving.
  const tidy = v.trim().toLowerCase().replace(/(^|[ '-])(\p{L})/gu, (_, sep, ch) => sep + ch.toUpperCase());
  S.draft.nick = tidy || null;
  input.classList.remove("bad");
  hint.classList.remove("bad");
  if (/[^\p{L}' -]/u.test(v)) {
    hint.textContent = "Letters only, please (no numbers or symbols).";
    hint.classList.add("bad");
  } else {
    hint.textContent = "First name only, please. Never your full name or where you live.";
  }
  renderBuilder(false);
}

function useSecretName() {
  S.draft.nick = null;
  S.ownNameOpen = false;
  $("ownNameInput").value = "";
  sound.play("pick");
  renderBuilder(true);
}

function rejectName(reason) {
  const input = $("ownNameInput"), hint = $("ownNameHint");
  hint.textContent = reason;
  hint.classList.add("bad");
  restartAnim(input, "bad");
  input.focus();
  sound.play("wrong");
  host.say(reason, { mood: "think" });
}

async function saveProfile() {
  const d = S.draft;
  const btn = $("profileSave");
  btn.disabled = true;
  try {
    // A typed-in name has to pass the server's check (letters only, nothing rude).
    if (d.nick) {
      const res = await post("/api/names/check", { nick: d.nick }).catch(() => ({ ok: false, reason: "Can't check that name right now. Try again!" }));
      if (!res.ok) { rejectName(res.reason); return; }
      d.nick = res.nick;
    } else {
      d.nick = null;
    }
    const before = S.profile && S.profile.id === d.id ? S.profile : null;
    if (!d.id) d.id = store.newId();
    store.saveProfile(d);
    S.profile = { ...d };
    renderMe();
    renderTopics();
    sound.play("coin");
    // Changed your name or look? Update the scores you already have in the Hall of Fame.
    if (before && (displayName(before) !== displayName(d) || before.animal !== d.animal || before.color !== d.color)) {
      post("/api/hall/rename", { player: playerPayload() })
        .then((r) => { if (r.updated) toast(`Hall of Fame updated: you're now ${displayName(d)}! 🏆`, 3500); })
        .catch(() => {});
    }
    const next = S.after;
    S.after = null;
    if (next) next();
    else show(S.profileBack || "home");
  } finally {
    btn.disabled = false;
  }
}

// ---------- SOLO ----------
async function startSolo() {
  try {
    const { id } = await post("/api/solo", { topic: S.topicId, player: playerPayload() });
    startGame(`/api/solo/${id}/ws`, { kind: "solo", topicId: S.topicId });
  } catch (e) { toast(e.message); }
}

// ---------- CHALLENGE SETUP ----------
function seg(box, values, current, labelOf, onPick) {
  box.innerHTML = "";
  for (const v of values) {
    const b = el("button", null, labelOf(v));
    b.setAttribute("aria-pressed", String(v === current));
    b.onclick = () => { onPick(v); sound.play("pick"); };
    box.append(b);
  }
}

function renderSetup() {
  const r = S.meta.room, t = topic(S.topicId);
  $("setupTopic").textContent = `${t.emoji} ${t.title} · ${t.blurb}`;
  seg($("segCount"), r.counts, S.setup.count, (v) => `${v}`, (v) => { S.setup.count = v; renderSetup(); });
  seg($("segTimer"), r.timers, S.setup.timer, (v) => `${v}s`, (v) => { S.setup.timer = v; renderSetup(); });
  seg($("segLevel"), r.levels, S.setup.level, (v) => LEVEL_NAMES[v] || v, (v) => { S.setup.level = v; renderSetup(); });
}

async function createRoom() {
  const btn = $("createRoomBtn");
  btn.disabled = true;
  try {
    const { code } = await post("/api/rooms", { topic: S.topicId, ...S.setup, player: playerPayload() });
    history.replaceState(null, "", "/join/" + code);
    startGame(`/api/rooms/${code}/ws`, { kind: "room", code, topicId: S.topicId });
  } catch (e) { toast(e.message); }
  btn.disabled = false;
}

// ---------- JOIN ----------
function openJoin(prefill = "") {
  const box = $("codeInputs");
  box.innerHTML = "";
  const inputs = [];
  for (let i = 0; i < 5; i++) {
    const inp = el("input");
    inp.maxLength = 1;
    inp.autocapitalize = "characters";
    inp.autocomplete = "off";
    inp.spellcheck = false;
    inp.inputMode = "text";
    inp.setAttribute("aria-label", `Letter ${i + 1}`);
    inp.value = prefill[i] || "";
    inp.addEventListener("input", () => {
      const letters = inp.value.toUpperCase().replace(/[^A-Z]/g, "");
      if (letters.length > 1) { fill(i, letters); return; } // pasted a whole code
      inp.value = letters;
      if (letters && i < 4) inputs[i + 1].focus();
      sound.play("click");
      checkCode(inputs);
    });
    inp.addEventListener("keydown", (e) => {
      if (e.key === "Backspace" && !inp.value && i > 0) inputs[i - 1].focus();
      if (e.key === "Enter" && !$("joinGoBtn").disabled) $("joinGoBtn").click();
    });
    inputs.push(inp);
    box.append(inp);
  }
  function fill(from, letters) {
    for (let k = 0; k < letters.length && from + k < 5; k++) inputs[from + k].value = letters[k];
    inputs[Math.min(4, from + letters.length)].focus();
    checkCode(inputs);
  }
  S.join = { code: "", info: null };
  $("joinPreview").textContent = "Ask the host for the 5-letter code.";
  $("joinGoBtn").disabled = true;
  show("join");
  host.say("Type the 5 letters from the host's screen!", { mood: "happy" });
  if (prefill.length === 5) checkCode(inputs);
  else setTimeout(() => inputs[prefill.length || 0].focus(), 350);
}

async function checkCode(inputs) {
  const code = inputs.map((i) => i.value).join("");
  const go = $("joinGoBtn"), prev = $("joinPreview");
  go.disabled = true;
  S.join = { code, info: null };
  if (code.length < 5) {
    if (S.g && S.g.lurking) leaveGame(false); // stop "picking an avatar…" in a room we're no longer joining
    prev.textContent = "Ask the host for the 5-letter code.";
    return;
  }
  prev.textContent = "Looking for that room…";
  try {
    const info = await api(`/api/rooms/${code}`);
    if (S.join.code !== code) return;
    S.join.info = info;
    prev.innerHTML = "";
    const card = el("div", "room-card");
    const hostTxt = info.host ? `hosted by ${info.host.emoji} ${info.host.name}` : "";
    card.append(el("span", "e", info.topic.emoji), el("span", null, `${info.topic.title} · ${hostTxt} · ${info.players} playing`));
    prev.append(card);
    // Who you'll join as, with a way to switch (handy when two kids share one computer).
    if (S.profile) {
      const as = el("div", "join-as");
      as.append(document.createTextNode(`Joining as ${emojiFor(S.profile.animal)} ${displayName(S.profile)} · `));
      const sw = el("button", "link-btn", "Switch player");
      sw.onclick = () => openProfile(() => { show("join"); checkCode(inputs); }, { back: "join" });
      as.append(sw);
      prev.append(as);
    }
    go.disabled = false;
    sound.play("coin");
    // Step into the room's "waiting room" right away, so the host sees someone is coming.
    if (!S.g || S.g.code !== code) startGame(`/api/rooms/${code}/ws`, { kind: "room", code, topicId: info.topic.id, lurk: true });
  } catch (e) {
    if (S.join.code !== code) return;
    // Only say "no room" when the server really said so; otherwise it's a connection problem.
    prev.textContent = e.status === 404
      ? "Hmm, no room with that code. Check the letters! (Is your friend on rufustrivia.com too?)"
      : "Can't reach the game server right now. Check the internet and try again!";
    restartAnim($("codeInputs"), "bad");
    sound.play("wrong");
  }
}

// Tabs in the same browser share one saved player. They talk to each other so the same player
// can't accidentally join a room twice (which would kick the other tab out).
const tabs = "BroadcastChannel" in window ? new BroadcastChannel("rufus-trivia") : null;
if (tabs) {
  tabs.addEventListener("message", (e) => {
    const m = e.data || {};
    if (m.t === "who" && S.g && S.g.code === m.code && !S.g.lurking && S.profile && S.profile.id === m.pid) {
      tabs.postMessage({ t: "here", nonce: m.nonce });
    }
  });
}
function playingInAnotherTab(code) {
  return new Promise((resolve) => {
    if (!tabs || !S.profile) return resolve(false);
    const nonce = Math.random().toString(36).slice(2);
    const on = (e) => { if (e.data && e.data.t === "here" && e.data.nonce === nonce) { tabs.removeEventListener("message", on); resolve(true); } };
    tabs.addEventListener("message", on);
    tabs.postMessage({ t: "who", code, pid: S.profile.id, nonce });
    setTimeout(() => { tabs.removeEventListener("message", on); resolve(false); }, 300);
  });
}

async function joinRoom() {
  const { code, info } = S.join;
  if (!info) return;
  if (await playingInAnotherTab(code)) {
    // Same browser, same player, already in this room: make a second player for this tab instead.
    toast(`${displayName(S.profile)} is already in this room in another tab. Make a second player for this tab!`, 5000);
    const g = S.g && S.g.code === code ? S.g : startGame(`/api/rooms/${code}/ws`, { kind: "room", code, topicId: info.topic.id, lurk: true });
    editAvatar(g, { fresh: true });
    return;
  }
  history.replaceState(null, "", "/join/" + code);
  // We're usually already in the room's waiting room (see checkCode). If not, step in now.
  const g = S.g && S.g.code === code ? S.g : startGame(`/api/rooms/${code}/ws`, { kind: "room", code, topicId: info.topic.id, lurk: true });
  if (S.profile) {
    g.lurking = false;
    g.conn.send(helloMsg(g)); // if the connection isn't open yet, it says hello as soon as it is
    return;
  }
  // New here? The host already sees "picking an avatar…" while you build a nickname,
  // so nobody gets left behind when the host presses Start.
  editAvatar(g);
}

// Open the nickname/avatar builder while connected to a room (new player, or changing it in the lobby).
function editAvatar(g, opts = {}) {
  g.editing = true;
  openProfile(() => {
    g.editing = false;
    g.lurking = false;
    g.conn.send(helloMsg(g));
    if (g.st && g.st.phase === "lobby") show("lobby", { accent: g.st.topic.color });
  }, { fresh: opts.fresh });
}

function helloMsg(g) {
  return {
    t: "hello", player: playerPayload(),
    avoid: store.seen(S.profile.id, g.topicId), missed: store.missed(S.profile.id, g.topicId),
  };
}

// ---------- GAME CONNECTION ----------
function startGame(path, { kind, code, topicId, lurk = false }) {
  leaveGame(false);
  const g = {
    kind, code, topicId, st: null, conn: null, lurking: lurk, editing: false,
    lastQi: -1, revealedQi: -1, finalKey: null, hallShown: false,
    locked: false, offset: 0, shownAt: 0, raf: 0, cdT: 0, lastTick: -1,
    prevRank: {}, seenPlayers: new Set(), standingsT: 0, lobbyCode: null, wasDown: false, startArmedAt: 0,
  };
  S.g = g;
  g.conn = openGame(path, {
    hello: () => (g.lurking ? { t: "lurk" } : helloMsg(g)),
    onMessage: (m) => onMessage(g, m),
    onStatus: (s, closeCode) => onStatus(g, s, closeCode),
  });
  applyMusic(topic(topicId));
  if (kind === "solo") {
    prepGame(g, { topic: topic(topicId), kind: "solo" });
    show("game", { accent: topic(topicId).color });
  }
  return g;
}

function leaveGame(goHome = true) {
  const g = S.g;
  if (g) {
    g.conn.close();
    stopTimer(g);
    clearInterval(g.cdT);
    clearTimeout(g.standingsT);
    S.g = null;
  }
  $("countdown").classList.add("hidden");
  $("standings").classList.add("hidden");
  $("banner").classList.add("hidden");
  if (goHome) {
    history.replaceState(null, "", "/");
    renderTopics();
    applyMusic(topic(S.topicId));
    show("home");
  }
}

// ---------- QUIT (a friendly "are you sure?" card, not a browser popup) ----------
let quitFox = null;
function openQuit() {
  const g = S.g;
  if (!g) return;
  const st = g.st, me = st ? meOf(st) : { score: 0 };
  const solo = g.kind === "solo";
  const isHost = st && st.hostId === st.me;
  $("quitTitle").textContent = solo ? "End this run?" : st && st.phase === "lobby" ? "Leave the room?" : "Leave the challenge?";
  $("quitText").textContent = solo
    ? (me.score > 0 ? `Your ${me.score.toLocaleString()} points so far will still go to the Hall of Fame.` : "You haven't scored yet, so there's nothing to save.")
    : isHost ? "You're the host, so the next player will take over the room." : "Your friends can keep playing without you.";
  $("quitYes").textContent = solo ? "End run" : "Leave";
  if (!quitFox) quitFox = makeFox($("quitFox"));
  quitFox.mood("sad", 0);
  $("quitModal").classList.remove("hidden");
  setTimeout(() => $("quitNo").focus(), 50);
}

function closeQuit() { $("quitModal").classList.add("hidden"); }

function confirmQuit() {
  closeQuit();
  const g = S.g;
  if (!g) return;
  sound.play("click");
  // Solo: the server ends the run, saves the score, and sends the results screen.
  if (g.kind === "solo" && g.st && ["countdown", "question", "reveal"].includes(g.st.phase) && g.conn.send({ t: "quit" })) {
    stopTimer(g);
    return;
  }
  if (g.kind === "room") g.conn.send({ t: "leave" });
  leaveGame(true);
}

function onStatus(g, s, closeCode) {
  if (S.g !== g) return;
  if (s === "reconnecting") { g.wasDown = true; toast("Reconnecting… 📡", 6000); }
  if (s === "open" && g.wasDown) { g.wasDown = false; toast("Back online! ✅"); }
  if (s === "ended") {
    if (closeCode === 4000) toast("This game is open somewhere else.");
    else if (closeCode === 4001) toast("That room has closed.");
    else if (closeCode === 4003) toast("The host removed you from this room.", 4000);
    leaveGame(true);
  }
}

function onMessage(g, m) {
  if (S.g !== g) return;
  if (m.t === "error") { toast(m.message, 4000); return; }
  if (m.t === "peek") {
    // We're still picking an avatar. If the game already started, tell them to hurry.
    if (m.phase !== "lobby" && !g.hurried) {
      g.hurried = true;
      host.say("Hurry! The game has started. Pick your name and jump in!", { mood: "cheer", ms: 5000 });
    }
    return;
  }
  if (m.t !== "state") return;
  const st = m;
  g.st = st;
  g.offset = st.serverNow - Date.now();

  if (st.phase === "lobby") return renderLobby(g, st);
  if (st.phase === "countdown") return renderCountdown(g, st);
  if (st.phase === "question") {
    if (st.qi !== g.lastQi) renderQuestion(g, st, false);
    else renderWaiting(g, st);
    return;
  }
  if (st.phase === "reveal") {
    if (st.qi !== g.lastQi) renderQuestion(g, st, true);
    if (g.revealedQi !== st.qi) renderReveal(g, st);
    return;
  }
  if (st.phase === "final") {
    const key = st.round + ":" + st.qi;
    if (g.finalKey !== key) renderFinal(g, st, key);
    if (st.final.hall && !g.hallShown) renderHallResult(g, st);
  }
}

// ---------- LOBBY ----------
function renderLobby(g, st) {
  if (S.screen !== "lobby" && !g.editing) {
    show("lobby", { accent: st.topic.color });
    host.say(line(st.hostId === st.me ? "lobby" : "waitHost"), { mood: "happy", ms: 0 });
  }
  if (st.event === "rematch") {
    g.lastQi = -1; g.revealedQi = -1; g.prevRank = {}; g.hallShown = false;
  }
  if (g.lobbyCode !== st.code) {
    g.lobbyCode = st.code;
    const tiles = $("codeTiles");
    tiles.innerHTML = "";
    [...st.code].forEach((ch, k) => { const s = el("span", null, ch); s.style.setProperty("--k", k); tiles.append(s); });
    const url = `${location.origin}/join/${st.code}`;
    $("joinUrlText").textContent = `${location.host}/join/${st.code}`;
    const qr = qrcode(0, "M");
    qr.addData(url);
    qr.make();
    $("qrBox").innerHTML = qr.createSvgTag({ cellSize: 4, margin: 0, scalable: true, alt: "QR code to join room " + st.code });
    $("copyLinkBtn").onclick = async () => {
      try { await navigator.clipboard.writeText(url); toast("Link copied! 📋"); } catch { toast(url, 6000); }
      sound.play("coin");
    };
    $("shareBtn").classList.toggle("hidden", !navigator.share);
    $("shareBtn").onclick = () => navigator.share({ title: "Rufus Trivia challenge!", text: `Join my ${st.topic.title} challenge! Code: ${st.code}`, url }).catch(() => {});
  }

  $("lobbyTopic").textContent = `${st.topic.emoji} ${st.topic.title}`;
  const here = st.players.filter((p) => p.connected).length;
  $("lobbyCount").textContent = here <= 1 ? "Waiting for friends…" : `${here} players ready!`;
  const chips = $("lobbySettings");
  chips.innerHTML = "";
  chips.append(el("span", "chip", `${st.settings.count} questions`), el("span", "chip", `${st.settings.timer}s each`), el("span", "chip", LEVEL_NAMES[st.settings.level] || st.settings.level));

  const grid = $("playerGrid");
  grid.innerHTML = "";
  st.players.forEach((p, i) => {
    const card = el("div", "pcard" + (p.connected ? "" : " away") + (p.id === st.me ? " you" : ""));
    card.style.setProperty("--pc", p.color);
    if (g.seenPlayers.has(p.id)) card.style.animation = "none";
    const av = avatar("av", p);
    av.style.setProperty("--dl", -i * 0.3 + "s");
    card.append(av, el("div", "nm", p.name));
    if (p.id === st.hostId) card.append(el("span", "tag", "👑 HOST"));
    else if (p.id === st.me) card.append(el("span", "tag", "YOU"));
    // The host can remove someone (a stranger who guessed the code, or a name that isn't OK).
    // Two taps, so nobody gets removed by accident.
    if (st.hostId === st.me && p.id !== st.me) {
      const x = el("button", "kick", "✕");
      x.setAttribute("aria-label", `Remove ${p.name}`);
      x.title = `Remove ${p.name}`;
      x.onclick = () => {
        if (x.classList.contains("armed")) { g.conn.send({ t: "kick", seat: p.id }); sound.play("click"); toast(`${p.name} was removed.`); return; }
        x.classList.add("armed");
        x.textContent = "Remove?";
        setTimeout(() => { x.classList.remove("armed"); x.textContent = "✕"; }, 3000);
      };
      card.append(x);
    }
    grid.append(card);
    if (!g.seenPlayers.has(p.id)) {
      g.seenPlayers.add(p.id);
      if (p.id !== st.me) { sound.play("join"); host.say(`${p.emoji} ${p.name} joined!`, { mood: "happy", ms: 2500 }); }
    }
  });
  // Friends who opened the link but are still building their avatar.
  for (let i = 0; i < st.choosing; i++) {
    const ghost = el("div", "pcard ghost");
    const av = el("div", "av");
    av.append(el("span", null, "🎨"));
    ghost.append(av, el("div", "nm", "Picking an avatar…"));
    grid.append(ghost);
  }
  if (st.choosing > (g.lastChoosing || 0)) sound.play("join");
  g.lastChoosing = st.choosing;
  if (st.players.length < 2 && !st.choosing) grid.append(el("div", "empty", "Friends will pop up here when they join ✨"));

  const isHost = st.hostId === st.me;
  const note = $("choosingNote");
  note.classList.toggle("hidden", !st.choosing);
  note.textContent = st.choosing === 1
    ? "🎨 1 friend is still picking an avatar. Give them a moment!"
    : `🎨 ${st.choosing} friends are still picking avatars. Give them a moment!`;
  $("startBtn").classList.toggle("hidden", !isHost);
  $("startBtn").classList.toggle("pulse", !st.choosing);
  $("waitHost").classList.toggle("hidden", isHost);
}

// Host pressed Start. If someone is still picking an avatar, warn first; a second tap starts anyway.
function pressStart() {
  const g = S.g;
  if (!g || !g.st) return;
  const waiting = g.st.choosing;
  if (waiting && Date.now() - g.startArmedAt > 5000) {
    g.startArmedAt = Date.now();
    sound.play("wrong");
    toast(`${waiting === 1 ? "1 friend is" : waiting + " friends are"} still picking an avatar! Tap Start again to go anyway.`, 4500);
    host.say("Wait for it… someone's still choosing their avatar!", { mood: "think" });
    return;
  }
  g.conn.send({ t: "start" });
  sound.play("click");
}

// ---------- COUNTDOWN ----------
function prepGame(g, { topic: t, kind }) {
  $("hudTopic").textContent = `${t.emoji} ${t.title}`;
  $("hudCount").innerHTML = "Get ready!";
  $("hudMid").innerHTML = "";
  $("hudStreak").textContent = "";
  const sc = $("hudScore");
  sc.dataset.v = 0;
  sc.textContent = "0";
  $("answers").innerHTML = "";
  $("answers").className = "answers";
  $("factBox").classList.add("hidden");
  $("nextBtn").classList.add("hidden");
  $("answeredRow").innerHTML = "";
  $("qEyebrow").textContent = kind === "solo" ? "Solo quest" : "Challenge";
  $("qPrompt").textContent = "Get ready…";
  const m = $("media");
  m.innerHTML = "";
  const w = el("div", "emoji-card", t.emoji);
  m.append(w);
  $("levelTag").textContent = "Ready";
  $("timerNum").textContent = "";
}

function renderCountdown(g, st) {
  if (S.screen !== "game") {
    prepGame(g, st);
    show("game", { accent: st.topic.color });
  }
  if (st.kind === "solo") renderHearts(meOf(st).lives);
  host.say(st.kind === "solo" ? "3 hearts. Don't lose them all! Go go go!" : "Here we go! Same questions for everyone!", { mood: "cheer", ms: 2600 });
  const overlay = $("countdown"), num = $("cdNum");
  overlay.classList.remove("hidden");
  const end = st.deadline - g.offset;
  clearInterval(g.cdT);
  let shown = null;
  const tick = () => {
    const left = end - Date.now();
    if (left < -400) { overlay.classList.add("hidden"); clearInterval(g.cdT); return; }
    const n = left > 2600 ? 3 : left > 1700 ? 2 : left > 800 ? 1 : 0;
    if (n === shown) return;
    shown = n;
    num.textContent = n || "GO!";
    num.className = n ? "tick" : "tick go";
    restartAnim(num, "tick");
    sound.play(n ? "count" : "go");
  };
  tick();
  g.cdT = setInterval(tick, 50);
}

// ---------- QUESTION ----------
function renderHearts(lives, breaking = -1) {
  const box = $("hudMid");
  box.innerHTML = "";
  const wrap = el("div", "hearts");
  wrap.setAttribute("aria-label", `${lives} hearts left`);
  for (let i = 0; i < S.meta.solo.lives; i++) {
    const h = el("span", null, "🧡");
    if (i >= lives) h.classList.add(i === breaking ? "breaking" : "lost");
    wrap.append(h);
  }
  box.append(wrap);
}

function renderPips(st) {
  const box = $("hudMid");
  box.innerHTML = "";
  const wrap = el("div", "pips");
  for (let i = 0; i < st.total; i++) {
    const p = el("i");
    if (i === st.qi) p.className = "on";
    else if (i < st.qi && st.pipLog && st.pipLog[i] != null) p.className = st.pipLog[i] ? "good" : "bad";
    wrap.append(p);
  }
  box.append(wrap);
}

function renderStreak(n) {
  const s = $("hudStreak"), b = badge(n);
  s.textContent = b.text;
  s.className = "streak " + b.cls + (n >= 3 ? " hot" : "");
}

// The swooping streak banner. Big ones for milestones, mini ones for random shout-outs.
function showBanner(b) {
  const ban = $("banner");
  ban.style.setProperty("--b1", b.colors[0]);
  ban.style.setProperty("--b2", b.colors[1]);
  $("bannerEmoji").textContent = b.emoji;
  $("bannerText").textContent = b.text;
  $("bannerSub").textContent = b.sub;
  ban.className = "banner" + (b.size === "mini" ? " mini" : "") + (b.level >= 6 ? " lv-high" : "");
  void ban.offsetWidth;
  clearTimeout(showBanner.t);
  showBanner.t = setTimeout(() => ban.classList.add("hidden"), b.size === "mini" ? 1600 : b.level >= 6 ? 2200 : 1800);
}

function renderMedia(m, fallbackEmoji) {
  const box = $("media");
  box.innerHTML = "";
  restartAnim(box, "swap");
  if (m && m.kind === "flag") {
    const pole = el("div", "flagpole");
    const wrap = el("div", "cloth-wrap");
    const cloth = el("div", "cloth");
    const img = new Image();
    img.src = m.img;
    img.alt = "Mystery flag";
    cloth.append(img);
    wrap.append(cloth);
    pole.append(el("div", "pole"), wrap);
    box.append(pole);
    if (m.caption) box.append(el("div", "caption", m.caption));
  } else if (m && m.kind === "story") {
    // A Rufus story problem: big picture + which level of his game it happens in
    const w = el("div", "story-card");
    w.append(el("div", "emoji-card", m.text), el("div", "place", `📍 ${m.place}`));
    box.append(w);
  } else if (m && m.kind === "photo") {
    // A landmark photo (with the photographer's credit, shown after answering)
    const w = el("div", "photo-card");
    const img = new Image();
    img.src = m.img;
    img.alt = m.caption || "Mystery landmark";
    w.append(img);
    if (m.caption) w.append(el("div", "caption-pill", m.caption));
    box.append(w);
  } else if (m && m.kind === "word") {
    const w = el("div", "word-card");
    w.append(el("div", "w", m.text));
    if (m.sub) w.append(el("div", "ws", m.sub));
    box.append(w);
  } else {
    box.append(el("div", "emoji-card", (m && m.text) || fallbackEmoji || "❓"));
  }
}

function waitForImages(root, cap = 1400) {
  const imgs = [...root.querySelectorAll("img")].filter((i) => !i.complete);
  if (!imgs.length) return Promise.resolve();
  return Promise.race([
    Promise.all(imgs.map((i) => new Promise((r) => { i.onload = i.onerror = r; }))),
    new Promise((r) => setTimeout(r, cap)),
  ]);
}

function renderQuestion(g, st, silent) {
  $("countdown").classList.add("hidden");
  clearInterval(g.cdT);
  $("standings").classList.add("hidden");
  clearTimeout(g.standingsT);
  $("banner").classList.add("hidden");
  if (S.screen !== "game") show("game", { accent: st.topic.color });

  g.lastQi = st.qi;
  g.revealedQi = -1;
  g.locked = !!st.mine;
  const q = st.question;
  const me = meOf(st);

  const [lvlName, lvlColor] = LEVEL[q.level] || LEVEL[2];
  fx.setAccent(lvlColor || st.topic.color);
  $("levelTag").textContent = lvlName;

  $("hudTopic").textContent = `${st.topic.emoji} ${st.topic.title}`;
  $("hudCount").innerHTML = st.kind === "room" ? `Q <b>${st.qi + 1}</b> / ${st.total}` : `Q <b>${st.qi + 1}</b>`;
  if (st.kind === "solo") renderHearts(me.lives);
  else renderPips({ ...st, pipLog: g.pipLog });
  const sc = $("hudScore");
  sc.dataset.v = me.score;
  sc.textContent = me.score.toLocaleString();
  renderStreak(me.streak);

  renderMedia(q.media, st.topic.emoji);
  $("qEyebrow").textContent = q.eyebrow;
  $("qPrompt").textContent = q.prompt;
  restartAnim($("qEyebrow"), "q-anim");
  restartAnim($("qPrompt"), "q-anim");

  const box = $("answers");
  box.innerHTML = "";
  const pics = q.choices.every((c) => c.img && !c.label);
  box.className = "answers" + (pics ? " pics" : "");
  q.choices.forEach((c, i) => {
    const b = el("button", `ans c${i}`);
    b.style.setProperty("--k", i);
    b.append(el("span", "shape", SHAPES[i]));
    if (pics) {
      const pic = el("div", "pic");
      const img = new Image();
      img.src = c.img;
      img.alt = `Flag ${i + 1}`;
      pic.append(img);
      b.append(pic, el("span", "lbl", ""));
      b.setAttribute("aria-label", `Flag option ${i + 1}`);
    } else {
      if (c.img) { const im = new Image(); im.src = c.img; im.className = "mini"; im.alt = ""; b.append(im); }
      if (c.emoji) b.append(el("span", "em", c.emoji));
      b.append(el("span", "txt", c.label));
    }
    b.append(el("span", "key", String(i + 1)));
    b.onclick = () => answer(i);
    box.append(b);
  });

  $("factBox").classList.add("hidden");
  $("nextBtn").classList.add("hidden");
  renderWaiting(g, st);
  if (st.mine) lockUI(st.mine.choice, st.kind === "room");

  if (silent) { stopTimer(g); return; }
  g.shownAt = performance.now();
  // Start your stopwatch when the pictures have actually loaded, so slow Wi-Fi isn't unfair.
  waitForImages($("scr-game")).then(() => { if (g.lastQi === st.qi && !g.locked) g.shownAt = performance.now(); });
  startTimer(g, st);
  if (Math.random() < 0.3) host.say(line("think"), { mood: "think", ms: 1500 });
  else host.hide();
  announce(`Question ${st.qi + 1}. ${q.prompt}`);
}

function renderWaiting(g, st) {
  const row = $("answeredRow");
  row.innerHTML = "";
  if (st.kind !== "room") return;
  const here = st.players.filter((p) => p.connected);
  const done = here.filter((p) => p.answered).length;
  for (const p of here) {
    const a = avatar("mini-av" + (p.answered ? " done" : ""), p);
    a.title = p.name;
    row.append(a);
  }
  row.append(el("span", null, `${done}/${here.length} locked in`));
  if (st.event === "answered" && st.phase === "question") sound.play("click");
}

function lockUI(choice, showBadge) {
  const box = $("answers");
  box.classList.add("locked");
  [...box.children].forEach((b, i) => {
    b.disabled = true;
    if (i === choice) {
      b.classList.add("picked");
      if (showBadge) b.append(el("span", "lock", "🔒 Locked in!"));
    }
  });
}

function answer(i) {
  const g = S.g;
  if (!g || !g.st || g.st.phase !== "question" || g.locked) return;
  const ms = Math.round(performance.now() - g.shownAt);
  if (!g.conn.send({ t: "answer", q: g.st.qi, choice: i, ms })) { toast("Reconnecting… try again in a second!"); return; }
  g.locked = true;
  lockUI(i, g.kind === "room");
  sound.play("lock");
  if (g.kind === "room") host.say(line("locked"), { mood: "think", ms: 0 });
}

// ---------- TIMER ----------
function startTimer(g, st) {
  stopTimer(g);
  const total = st.settings.timer * 1000;
  const end = st.deadline - g.offset;
  const arc = $("timerArc"), num = $("timerNum"), bar = $("timebar"), tEl = $("timer"), card = $("mediaCard");
  g.lastTick = -1;
  const loop = () => {
    const left = Math.max(0, end - Date.now());
    const k = left / total;
    arc.style.strokeDashoffset = String(175.9 * (1 - k));
    bar.style.transform = `scaleX(${k})`;
    const secs = Math.ceil(left / 1000);
    num.textContent = secs;
    const col = k > 0.5 ? "#3ddc97" : k > 0.25 ? "#ffd23f" : "#ff4d6d";
    tEl.style.setProperty("--tcol", col);
    card.style.setProperty("--tcol", col);
    tEl.classList.toggle("urgent", secs <= 3 && left > 0 && !g.locked);
    if (secs !== g.lastTick && left > 0 && !g.locked) {
      if (secs <= 3) sound.play("urgent");
      else if (secs <= 5) sound.play("tick");
    }
    g.lastTick = secs;
    if (left > 0 && S.g === g && g.st.phase === "question") g.raf = requestAnimationFrame(loop);
    else tEl.classList.remove("urgent");
  };
  loop();
}

function stopTimer(g) {
  cancelAnimationFrame(g.raf);
  $("timer").classList.remove("urgent");
}

// ---------- REVEAL ----------
function renderReveal(g, st) {
  g.revealedQi = st.qi;
  stopTimer(g);
  const r = st.reveal, mine = st.mine, me = meOf(st);
  const box = $("answers");
  const btns = [...box.children];
  box.classList.remove("locked");
  box.classList.add("revealed");
  btns.forEach((b) => { b.disabled = true; const l = b.querySelector(".lock"); if (l) l.remove(); });
  const right = btns[r.answer];
  right.classList.add("right");
  right.append(el("span", "mark", "✓"));
  if (mine && mine.choice >= 0 && mine.choice !== r.answer) {
    btns[mine.choice].classList.add("wrong");
    btns[mine.choice].append(el("span", "mark", "✗"));
  }
  // Learning moment: show the names under every flag, and little flags next to every name.
  if (r.labels) {
    btns.forEach((b, i) => {
      const L = r.labels[i];
      if (!L) return;
      const lbl = b.querySelector(".lbl");
      if (lbl) lbl.textContent = L.label;
      else if (L.img && !b.querySelector(".mini")) {
        const im = new Image();
        im.src = L.img;
        im.className = "mini";
        im.alt = "";
        b.insertBefore(im, b.querySelector(".txt"));
      }
    });
  }
  // Challenge: little avatars show who picked what.
  if (st.kind === "room") {
    const by = {};
    st.players.forEach((p) => { if (p.last && p.last.choice >= 0) (by[p.last.choice] = by[p.last.choice] || []).push(p); });
    btns.forEach((b, i) => {
      if (!by[i]) return;
      const who = el("div", "who");
      by[i].slice(0, 7).forEach((p, k) => { const a = avatar("", p); a.style.setProperty("--k", k); a.title = p.name; who.append(a); });
      b.append(who);
    });
    g.pipLog = g.pipLog || {};
    g.pipLog[st.qi] = !!(mine && mine.correct);
    renderPips({ ...st, pipLog: g.pipLog });
  }

  $("answeredRow").innerHTML = "";
  const fb = $("factBox");
  fb.classList.remove("hidden");
  restartAnim(fb, "fact");
  typeText($("factText"), r.fact);
  // Photo credits (landmark photos are shared by photographers on Wikimedia Commons)
  const cr = $("factCredit");
  cr.innerHTML = "";
  if (r.credits && r.credits.length) {
    // One photo: "Place: Author · Licence". Several: just the photographers (full details on the Credits page).
    const text = r.credits.length === 1 ? r.credits[0]
      : "Photos by " + [...new Set(r.credits.map((c) => c.split(": ").slice(1).join(": ").split(" · ")[0]))].join(", ");
    cr.append(document.createTextNode("📷 " + text + " · "));
    const a = el("a", null, "Wikimedia Commons");
    a.href = "/credits";
    a.target = "_blank";
    cr.append(a);
  }
  store.remember(S.profile.id, g.topicId, r.key, !!(mine && mine.correct));
  // the timer ring turns into a big tick or cross
  const won = !!(mine && mine.correct);
  $("timerNum").textContent = won ? "✓" : "✗";
  $("timer").style.setProperty("--tcol", won ? "#3ddc97" : "#ff4d6d");
  $("timerArc").style.strokeDashoffset = "0";

  const sc = $("hudScore");
  if (mine && mine.correct) {
    sound.play("correct");
    const c = fx.center(right);
    fx.burst(c.x, c.y, { count: 45 + Math.min(me.streak, 8) * 14 });
    fx.floatText("+" + mine.points.toLocaleString(), c.x, c.y - 20);
    fx.flash("glow");
    setTimeout(() => { fx.countUp(sc, me.score, 800); restartAnim(sc.parentElement, "bump"); }, 380);
    // Streaks get bigger, louder and sillier the longer they go (see streaks.js).
    const hype = celebrate(me.streak, g.topicId, S.profile ? displayName(S.profile) : "friend");
    let say = line(mine.ms < 3000 ? "fast" : "correct");
    if (hype) {
      say = hype.say;
      if (hype.banner) showBanner(hype.banner);
      if (hype.banner && hype.banner.size === "big") {
        setTimeout(() => sound.play("streak", hype.level), 250);
        if (hype.level >= 4) setTimeout(() => fx.fireworks(Math.min(3 + hype.level, 10)), 400);
      }
    }
    host.say(say, { mood: me.streak >= 3 ? "cheer" : "happy" });
    fx.setSpeed(1 + Math.min(me.streak, 12) * 0.35);
    announce(`Correct! Plus ${mine.points} points.`);
  } else {
    const timeout = !mine || mine.timeout || mine.choice < 0;
    sound.play(timeout ? "timeout" : "wrong");
    fx.shake($("mediaCard"));
    fx.flash("hurt");
    host.say(streakBroken(g.myStreak || 0) || line(timeout ? "timeout" : "wrong"), { mood: "sad" });
    fx.setSpeed(1);
    sc.textContent = me.score.toLocaleString();
    sc.dataset.v = me.score;
    if (st.kind === "solo") setTimeout(() => { renderHearts(me.lives, me.lives); sound.play("heart"); }, 350);
    announce(timeout ? "Time's up!" : "Not quite.");
  }
  g.myStreak = me.streak;
  renderStreak(me.streak);
  // The band gets hyped with your streak: twin leads at 5, everything at 15.
  sound.setIntensity(me.streak >= 15 ? 3 : me.streak >= 5 ? 2 : 1);

  const next = $("nextBtn");
  if (st.kind === "solo") {
    next.textContent = me.lives <= 0 ? "See results ▶" : "Next ▶";
    next.classList.remove("hidden");
    if (me.lives <= 0) host.say("Out of hearts! Let's see your score…", { mood: "sad" });
    setTimeout(() => next.focus({ preventScroll: true }), 150);
  } else {
    next.textContent = st.qi + 1 >= st.total ? "Final scores ▶" : "Next ▶";
    next.classList.toggle("hidden", st.hostId !== st.me);
    g.standingsT = setTimeout(() => showStandings(g, st), 2400);
  }
  // On a small or short screen, make sure the Next button is in view.
  if (!next.classList.contains("hidden")) setTimeout(() => next.scrollIntoView({ block: "nearest", behavior: "smooth" }), 250);
}

function standingRow(p, st, rankShown) {
  const li = el("li", "srow" + (p.id === st.me ? " me" : ""));
  li.dataset.id = p.id;
  const nm = el("span", "n", p.name);
  if (p.streak >= 3) nm.append(el("span", "stk", badge(p.streak).text)); // show friends' streaks too
  li.append(el("span", "r", rankShown ? String(p.rank) : "·"), avatar("av", p), nm);
  const s = el("span", "s", p.score.toLocaleString());
  if (p.last && p.last.points) s.append(el("span", "plus", "+" + p.last.points.toLocaleString()));
  li.append(s);
  return li;
}

function showStandings(g, st) {
  if (S.g !== g || g.st.phase !== "reveal" || g.st.qi !== st.qi) return;
  const box = $("standings"), ol = $("standingsList");
  box.classList.remove("hidden");
  restartAnim(box, "standings");
  const players = st.players.slice();
  const before = players.slice().sort((a, b) => (g.prevRank[a.id] || 99) - (g.prevRank[b.id] || 99) || a.rank - b.rank);
  ol.innerHTML = "";
  before.slice(0, 8).forEach((p) => ol.append(standingRow(p, st, false)));
  setTimeout(() => {
    if (S.g !== g) return;
    fx.flip(ol, () => {
      ol.innerHTML = "";
      players.sort((a, b) => a.rank - b.rank).slice(0, 8).forEach((p) => {
        const row = standingRow(p, st, true);
        const old = g.prevRank[p.id];
        if (old && old !== p.rank) row.querySelector(".n").append(el("span", "mv " + (p.rank < old ? "up" : "down"), p.rank < old ? "▲" : "▼"));
        ol.append(row);
      });
    });
    g.prevRank = Object.fromEntries(players.map((p) => [p.id, p.rank]));
  }, 700);
}

// ---------- FINAL ----------
function renderFinal(g, st, key) {
  g.finalKey = key;
  g.hallShown = false;
  stopTimer(g);
  clearInterval(g.cdT);
  clearTimeout(g.standingsT);
  $("standings").classList.add("hidden");
  $("countdown").classList.add("hidden");
  show("final", { accent: "#ffd23f" });
  const f = st.final, me = meOf(st);
  const solo = st.kind === "solo";
  $("finalSolo").classList.toggle("hidden", !solo);
  $("finalRoom").classList.toggle("hidden", solo);
  $("pbStamp").classList.add("hidden");
  $("waitRematch").classList.add("hidden");
  const again = $("againBtn");
  again.classList.remove("hidden");

  if (solo) {
    const out = me.lives <= 0 && !f.quit;
    $("finalEyebrow").textContent = `${st.topic.emoji} ${st.topic.title} · run complete`;
    $("finalTitle").textContent = f.quit ? "Run ended" : out ? "Out of hearts!" : "Legendary run!";
    const fs = $("finalScore");
    fs.dataset.v = 0;
    fs.textContent = "0";
    setTimeout(() => fx.countUp(fs, f.me.score, 1600, () => { if (Math.random() < 0.3) sound.play("tick"); }), 500);
    const stats = $("finalStats");
    stats.innerHTML = "";
    const pct = f.asked ? Math.round((f.me.correct / f.asked) * 100) : 0;
    for (const [k, v] of [["Correct", `${f.me.correct}/${f.asked}`], ["Best streak", `🔥 ${f.me.bestStreak}`], ["Accuracy", `${pct}%`]]) {
      const s = el("div", "stat");
      s.append(el("div", "k", k), el("div", "v", v));
      stats.append(s);
    }
    $("hallResult").innerHTML = "";
    $("hallResult").append(el("span", "medal", "📡"), el("span", "txt", "Sending your score to the Hall of Fame…"));
    g.localRecord = store.recordGame(S.profile.id, g.topicId, f.me.score, false);
    again.textContent = "Play again ▶";
    again.onclick = () => { S.topicId = g.topicId; startSolo(); };
    sound.play(out ? "sad" : "fanfare");
    host.say(line("done"), { mood: out ? "sad" : "happy" });
  } else {
    const ranked = st.players.slice().sort((a, b) => a.rank - b.rank);
    const winner = ranked[0];
    $("roomTitle").textContent = winner.id === st.me ? "You win! 🏆" : `${winner.emoji} ${winner.name} wins!`;
    const pod = $("podium");
    pod.innerHTML = "";
    const order = [ranked[1], ranked[0], ranked[2]];
    order.forEach((p, k) => {
      if (!p) return;
      const place = p === ranked[0] ? 1 : p === ranked[1] ? 2 : 3;
      const col = el("div", `pod p${place}`);
      const who = el("div", "who");
      who.style.setProperty("--dl", [1.1, 1.7, 0.6][k] + "s");
      const av = avatar("av", p);
      if (place === 1) av.append(el("span", "crown", "👑"));
      who.append(av, el("span", "nm", p.name), el("span", "sc", p.score.toLocaleString()));
      const block = el("div", "block", String(place));
      block.style.setProperty("--gd", [0.4, 0.9, 0.1][k] + "s");
      col.append(who, block);
      pod.append(col);
    });
    const rest = $("restList");
    rest.innerHTML = "";
    ranked.slice(3).forEach((p) => rest.append(standingRow({ ...p, last: null }, st, true)));
    const won = winner.id === st.me;
    store.recordGame(S.profile.id, g.topicId, me.score, won);
    setTimeout(() => { fx.fireworks(won ? 8 : 4); fx.rain(won ? 220 : 120); sound.play("fanfare"); }, 1500);
    host.say(line(won ? "win" : "lose"), { mood: won ? "cheer" : "happy" });
    const isHost = st.hostId === st.me;
    again.textContent = "Rematch ▶";
    again.classList.toggle("hidden", !isHost);
    $("waitRematch").classList.toggle("hidden", isHost);
    again.onclick = () => { g.conn.send({ t: "rematch" }); sound.play("click"); };
  }

  const lr = $("learnedRow");
  lr.innerHTML = "";
  (f.learned || []).forEach((L, k) => {
    const c = el("div", "lcard");
    c.style.setProperty("--k", k);
    if (L.img) { const im = new Image(); im.src = L.img; im.alt = ""; c.append(im); }
    else if (L.emoji) c.append(el("span", "le", L.emoji));
    c.append(el("div", null, L.label));
    lr.append(c);
  });
  $("learnedBox").classList.toggle("hidden", !(f.learned && f.learned.length));
  if (solo && f.hall) renderHallResult(g, st);
}

function renderHallResult(g, st) {
  g.hallShown = true;
  const h = st.final.hall, box = $("hallResult");
  box.innerHTML = "";
  if (h && h.skipped) { box.append(el("span", "medal", "🦊"), el("span", "txt", "No answers yet, so nothing to save this time.")); return; }
  if (!h || h.error) { box.append(el("span", "medal", "🙈"), el("span", "txt", "Couldn't reach the Hall of Fame this time.")); return; }
  const medal = h.runRank <= 3 ? ["🥇", "🥈", "🥉"][h.runRank - 1] : "🏅";
  const txt = el("span", "txt");
  txt.append(el("b", null, `#${h.runRank} of ${h.players}`), document.createTextNode(h.newBest ? "New personal best in the Hall of Fame!" : `in the Hall of Fame · your best is ${h.best.toLocaleString()}`));
  box.append(el("span", "medal", medal), txt);
  // On the board as "Turbo Fox"? Offer to put their real (first) name there instead.
  if (S.profile && !S.profile.nick) {
    const b = el("button", "btn ghost name-btn", "✏️ Put my real name on it");
    b.onclick = () => openProfile(() => {
      S.g && S.g.conn.send(helloMsg(S.g));
      show("final");
      const t = box.querySelector(".txt");
      if (t) t.append(el("small", "renamed", `Now on the board as ${displayName(S.profile)} ✨`));
      box.querySelector(".name-btn")?.remove();
    }, { back: "final", ownName: true });
    box.append(b);
  }
  if (h.newBest && h.score > 0) {
    setTimeout(() => {
      $("pbStamp").classList.remove("hidden");
      fx.fireworks(7);
      fx.rain(200);
      sound.play("fanfare");
      host.say(line("record"), { mood: "cheer" });
    }, 1300);
  }
  renderTopics();
}

// ---------- HALL OF FAME ----------
function openHall(topicId) {
  S.hall.topic = topicId || S.topicId;
  show("hall");
  host.say(line("hall"), { mood: "happy" });
  renderHallTabs();
  loadHall();
}

function renderHallTabs() {
  const tabs = $("hallTabs");
  tabs.innerHTML = "";
  for (const t of S.meta.topics) {
    const b = el("button", null, `${t.emoji} ${t.title}`);
    b.setAttribute("aria-pressed", String(t.id === S.hall.topic));
    b.onclick = () => { S.hall.topic = t.id; sound.play("pick"); renderHallTabs(); loadHall(); };
    tabs.append(b);
  }
  $("segPeriod").querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.period === S.hall.period)));
}

async function loadHall() {
  const list = $("hallList"), me = $("hallMe");
  const want = S.hall.topic + S.hall.period;
  list.innerHTML = "";
  me.textContent = "Loading the legends…";
  try {
    const pid = S.profile ? S.profile.id : "";
    const data = await api(`/api/hall?topic=${S.hall.topic}&period=${S.hall.period}&pid=${encodeURIComponent(pid)}`);
    if (S.hall.topic + S.hall.period !== want) return;
    me.innerHTML = "";
    if (data.me) me.append(document.createTextNode("Your best: "), el("b", null, data.me.best.toLocaleString()), document.createTextNode(` · rank #${data.me.rank}`));
    else me.textContent = S.profile ? "You're not on this board yet. Play a Solo Quest!" : "";
    if (S.profile) {
      const b = el("button", "link-btn", S.profile.nick ? "✏️ Change my name" : "✏️ Show my real name here");
      b.onclick = () => openProfile(() => { show("hall"); setTimeout(loadHall, 400); }, { back: "hall", ownName: !S.profile.nick });
      me.append(document.createTextNode("  "), b);
    }
    if (!data.rows.length) { list.append(el("li", "hall-empty", "No scores yet. Be the very first legend! 🦊")); return; }
    data.rows.forEach((r, i) => {
      const li = el("li", `hrow${i < 3 ? " g" + (i + 1) : ""}${r.me ? " me" : ""}`);
      li.style.setProperty("--k", i);
      const n = el("span", "n", r.name);
      n.append(el("small", null, `${r.correct} correct${r.me ? " · that's you!" : ""}`));
      li.append(el("span", "r", i < 3 ? ["🥇", "🥈", "🥉"][i] : String(i + 1)), avatar("av", r), n, el("span", "s", r.score.toLocaleString()));
      list.append(li);
    });
  } catch (e) {
    me.textContent = e.message;
  }
}

// ---------- wiring ----------
function wire() {
  $("brandBtn").onclick = () => {
    const phase = S.g && S.g.st && S.g.st.phase;
    if (S.g && ["countdown", "question", "reveal", "lobby"].includes(phase) && S.screen !== "profile") { openQuit(); return; }
    leaveGame(true);
  };
  $("quitBtn").onclick = () => { sound.play("click"); openQuit(); };
  $("quitNo").onclick = closeQuit;
  $("quitYes").onclick = confirmQuit;
  $("quitModal").onclick = (e) => { if (e.target === $("quitModal")) closeQuit(); };
  $("meChip").onclick = () => {
    sound.play("click");
    if (!S.g) { openProfile(); return; }
    const phase = S.g.st && S.g.st.phase;
    if (phase === "lobby") editAvatar(S.g); // you can change your avatar while waiting
    else if (phase === "final") openProfile(() => { S.g && S.g.conn.send(helloMsg(S.g)); show("final"); }, { back: "final" });
    else if (!S.g.editing) toast("Finish this game first!");
  };
  $("ownNameToggle").onclick = () => {
    S.ownNameOpen = true;
    sound.play("pick");
    renderBuilder(false);
    host.say("Type your first name and it'll show on the leaderboard! Just your first name, OK?", { mood: "happy" });
    setTimeout(() => $("ownNameInput").focus(), 50);
  };
  $("ownNameInput").addEventListener("input", onOwnNameInput);
  $("ownNameInput").addEventListener("keydown", (e) => { if (e.key === "Enter") saveProfile(); });
  $("useSecretName").onclick = useSecretName;
  $("editAvatarBtn").onclick = () => { sound.play("click"); if (S.g) editAvatar(S.g); };
  $("soloBtn").onclick = () => { sound.play("click"); requireProfile(startSolo); };
  $("challengeBtn").onclick = () => { sound.play("click"); requireProfile(() => { renderSetup(); show("setup"); host.say("Pick the rules, then share the code with your friends!", { mood: "happy" }); }); };
  $("joinBtn").onclick = () => { sound.play("click"); openJoin(); };
  $("hallBtn").onclick = () => { sound.play("click"); openHall(); };
  $("finalHallBtn").onclick = () => { const t = S.g ? S.g.topicId : S.topicId; leaveGame(false); history.replaceState(null, "", "/"); openHall(t); };
  $("hallPlayBtn").onclick = () => { S.topicId = S.hall.topic; renderTopics(); requireProfile(startSolo); };
  $("createRoomBtn").onclick = createRoom;
  $("joinGoBtn").onclick = joinRoom;
  $("startBtn").onclick = pressStart;
  $("leaveLobbyBtn").onclick = () => leaveGame(true);
  $("nextBtn").onclick = () => { if (S.g && S.g.conn.send({ t: "next" })) { sound.play("click"); $("nextBtn").classList.add("hidden"); } };
  $("profileSave").onclick = saveProfile;
  $("profileCancel").onclick = () => {
    S.after = null;
    const g = S.g;
    if (g && g.editing) {
      g.editing = false;
      if (g.lurking) { leaveGame(true); return; }           // backed out before joining the room
      show(g.st && g.st.phase === "lobby" ? "lobby" : "game");
      return;
    }
    show(S.profileBack || "home");
  };
  $("adjPrev").onclick = () => stepAdj(-1);
  $("adjNext").onclick = () => stepAdj(1);
  $("adjSpin").onclick = spinName;
  document.querySelectorAll("[data-go='home']").forEach((b) => { b.onclick = () => { sound.play("click"); leaveGame(true); }; });
  $("segPeriod").querySelectorAll("button").forEach((b) => { b.onclick = () => { S.hall.period = b.dataset.period; sound.play("pick"); renderHallTabs(); loadHall(); }; });

  const poke = (fox, where) => {
    fox.mood("cheer", 900);
    sound.play("coin");
    const c = fx.center(where);
    fx.burst(c.x, c.y, { count: 24, power: 7 });
    return line("poke");
  };
  $("rufus").onclick = () => host.say(poke(host.fox, $("rufus")), { mood: "cheer" });
  $("heroFox").onclick = () => heroSay(poke(heroFox, $("heroFox")));

  const setToggle = (btn, on) => btn.setAttribute("aria-pressed", String(on));
  setToggle($("soundBtn"), sound.sfxOn);
  setToggle($("musicBtn"), sound.musicOn);
  $("soundBtn").onclick = () => { const on = !sound.sfxOn; sound.setSfx(on); store.setPref("sfx", on); setToggle($("soundBtn"), on); sound.play("click"); };
  $("musicBtn").onclick = (e) => { e.stopPropagation(); sound.play("click"); toggleMusicMenu(); };
  document.addEventListener("click", (e) => { if (!e.target.closest(".music-wrap")) toggleMusicMenu(false); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") { toggleMusicMenu(false); closeQuit(); } });

  if (CONFIG.youtubeUrl) { $("ytBtn").href = CONFIG.youtubeUrl; $("ytBtn").classList.remove("hidden"); }

  const unlock = () => sound.unlock();
  addEventListener("pointerdown", unlock, { once: true });
  addEventListener("keydown", unlock, { once: true });

  document.addEventListener("keydown", (e) => {
    if (e.target.tagName === "INPUT" || e.metaKey || e.ctrlKey) return;
    if (S.screen !== "game" || !S.g || !S.g.st || !$("quitModal").classList.contains("hidden")) return;
    const k = e.key.toLowerCase();
    const idx = "1234".includes(k) ? "1234".indexOf(k) : "abcd".includes(k) ? "abcd".indexOf(k) : -1;
    if (idx >= 0 && S.g.st.phase === "question") { answer(idx); return; }
    if ((e.key === "Enter" || e.key === " ") && !$("nextBtn").classList.contains("hidden") && document.activeElement !== $("nextBtn")) {
      e.preventDefault();
      $("nextBtn").click();
    }
  });
}

// ---------- start! ----------
async function boot() {
  fx.initBackdrop();
  heroFox = makeFox($("heroFox"));
  sound.init({ sfx: store.pref("sfx", true), music: store.pref("music", true) });
  wire();
  try {
    S.meta = await api("/api/meta");
  } catch {
    toast("Can't reach the game server. Is it running?", 10000);
    return;
  }
  S.topicId = topic(store.pref("topic", "flags")).id;
  themeFor(topic(S.topicId));
  preloadFlags(S.meta.gallery);
  pingVisit();
  renderMe();
  renderTopics();

  const m = location.pathname.match(/^\/join\/([A-Za-z]{5})\/?$/) || location.search.match(/[?&]join=([A-Za-z]{5})/);
  if (m) { openJoin(m[1].toUpperCase()); return; }
  show("home");
  setTimeout(() => heroSay(S.profile ? `Welcome back, ${displayName(S.profile)}! Ready to beat your record?` : line("hello")), 700);
}

boot();
