import { test } from "node:test";
import assert from "node:assert/strict";
import { STICKERS, STICKER_BY_ID, stickersForAnswer, stickersForFinish, stickersForStart, showcase } from "../src/shared/stickers.js";
import { TOPICS } from "../src/shared/topics/index.js";

test("every sticker has a unique id, an emoji, a name, a hint and a rarity 1-5", () => {
  assert.equal(new Set(STICKERS.map((s) => s.id)).size, STICKERS.length);
  for (const s of STICKERS) assert.ok(s.emoji && s.name && s.how && s.rarity >= 1 && s.rarity <= 5, s.id);
});

test("every topic has a master sticker", () => {
  for (const t of TOPICS) assert.ok(STICKER_BY_ID[t.id + "_master"], `${t.id} needs a ${t.id}_master sticker`);
});

test("streak stickers at exactly 3, 5, 7, 10... in a row, and only for right answers", () => {
  const at = (streak, correct = true) => stickersForAnswer({ topic: "flags", correct, streak, ms: 5000, correctSoFar: 1 });
  assert.deepEqual(at(3), ["streak3"]);
  assert.deepEqual(at(4), []);
  assert.deepEqual(at(10), ["streak10"]);
  assert.deepEqual(at(50), ["streak50"]);
  assert.deepEqual(at(3, false), []);
});

test("speedy paws for a right answer under 2 seconds; topic master at 15 right in one game", () => {
  assert.deepEqual(stickersForAnswer({ topic: "math", correct: true, streak: 1, ms: 1500, correctSoFar: 1 }), ["speedy"]);
  assert.deepEqual(stickersForAnswer({ topic: "math", correct: true, streak: 1, ms: 2500, correctSoFar: 15 }), ["math_master"]);
  assert.deepEqual(stickersForAnswer({ topic: "math", correct: false, streak: 0, ms: 500, correctSoFar: 15 }), []);
});

test("champion and perfect round only in challenge rooms", () => {
  assert.deepEqual(stickersForFinish({ kind: "room", rank: 1, players: 3, score: 900, correct: 5, count: 5 }), ["champion", "perfect"]);
  assert.deepEqual(stickersForFinish({ kind: "room", rank: 1, players: 1, score: 900, correct: 2, count: 5 }), []);
  assert.deepEqual(stickersForFinish({ kind: "room", rank: 1, players: 2, score: 0, correct: 0, count: 5 }), []);
  assert.deepEqual(stickersForFinish({ kind: "solo", rank: 1, players: 1, score: 900, correct: 9, count: 9 }), []);
});

test("party host, explorer and team player", () => {
  assert.deepEqual(stickersForStart({ kind: "room", isHost: true, players: 4, topicsPlayed: 1, allTopics: 4, roomGames: 1 }), ["partyhost"]);
  assert.deepEqual(stickersForStart({ kind: "solo", isHost: true, players: 1, topicsPlayed: 4, allTopics: 4, roomGames: 0 }), ["globetrotter"]);
  assert.deepEqual(stickersForStart({ kind: "room", isHost: false, players: 6, topicsPlayed: 2, allTopics: 4, roomGames: 5 }), ["social"]);
});

test("showcase: rarest first, newest breaks ties, unknown ids ignored", () => {
  assert.deepEqual(showcase(["streak3", "speedy", "perfect", "nope", "streak5"]), ["perfect", "streak5", "speedy"]);
});

test("every topic's song exists (a typo would silently fall back to the default song)", async () => {
  const { MUSIC } = await import("../public/js/sound.js");
  for (const t of TOPICS) assert.ok(MUSIC[t.music || "adventure"], `${t.id}: no song called "${t.music}"`);
});
