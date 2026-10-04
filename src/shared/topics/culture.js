// 📚 BOOKS & POP CULTURE - favourite books, films and their characters, games, toys and TV.
// The questions live in two files:
//   book-banks.js    📚 Book Club
//   screen-banks.js  🎬 Movie Magic, 🎮 Games, Toys & TV
// Only films rated U/PG and family-friendly games (ESRB E/E10+), and no song lyrics (they belong to the songwriters).
// Want more movie questions? Change the numbers in `parts` at the bottom.

import { mixTopic } from "../kit.js";
import { books } from "./book-banks.js";
import { movies, games } from "./screen-banks.js";

export default mixTopic({
  id: "culture",
  title: "Books & Pop Culture",
  emoji: "📚",
  color: "#f472b6",
  blurb: "Favourite books, films, characters, games and TV.",
  orbit: ["📚", "🎬", "🎮", "🧸", "🍿", "🦸", "🐉", "🧙"],
  music: "popcorn",
  // How often each part comes up (out of 11)
  parts: [
    [4, books],   // 📚 Book Club
    [4, movies],  // 🎬 Movie Magic
    [3, games],   // 🎮 Games, Toys & TV
  ],
});
