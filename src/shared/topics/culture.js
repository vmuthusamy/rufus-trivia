// 📚 BOOKS & POP CULTURE - favourite books, films and their characters, games, toys and TV.
// It's a "mixed" topic: five parts stirred together with mixTopic().
//
//   📚 Book Club, 🎬 Movie Magic, 🎮 Games, Toys & TV   hand-written questions (book-banks.js, screen-banks.js)
//   🧩 Emoji puzzles, 🎭 Who's from where?             made fresh from the tables in data/stories.js
//                                                       (see culture-makers.js)
//
// Only films rated U/PG and family-friendly games (ESRB E/E10+), and no song lyrics (they belong to the songwriters).
// Want more emoji puzzles? Change the numbers in `parts` at the bottom and play a game to see.

import { mixTopic } from "../kit.js";
import { books } from "./book-banks.js";
import { movies, games } from "./screen-banks.js";
import { emojiPuzzles, characters } from "./culture-makers.js";

export default mixTopic({
  id: "culture",
  title: "Books & Pop Culture",
  emoji: "📚",
  color: "#f472b6",
  blurb: "Favourite books, films, characters, games and TV.",
  orbit: ["📚", "🎬", "🎮", "🧸", "🍿", "🦸", "🐉", "🧙"],
  music: "popcorn",
  // How often each part comes up (out of 14.5). The two made-fresh parts are about 2 in every 5 questions:
  // they have the most to ask about, so kids who play lots of games keep meeting new questions.
  parts: [
    [3, books],          // 📚 Book Club
    [3, movies],         // 🎬 Movie Magic
    [2.5, games],        // 🎮 Games, Toys & TV
    [2.5, emojiPuzzles], // 🧩 "Which film is this emoji puzzle?"
    [3.5, characters],   // 🎭 "Which story is Baloo from?" and "Which of these is from Moana?"
  ],
});

