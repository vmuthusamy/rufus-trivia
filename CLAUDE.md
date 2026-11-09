# Rufus Trivia 🦊

A trivia game (flags, books & pop culture, animals, science & space, maths) starring Rufus the fox, for kids around 9-10.
Live at https://rufustrivia.com · repo https://github.com/vmuthusamy/rufus-trivia
Sister project of `../adventures-of-rufus` (the platformer at rufusfamily.com).

## Run / test / deploy
- `npm run dev` → http://127.0.0.1:8787 (Cloudflare Worker + Durable Objects, all local)
- `npm test` → unit tests (question generators, scoring, nicknames)
- `npm run test:e2e` → needs `npm run dev` running; plays solo + a challenge room over WebSockets
- Pushing to `main` deploys to https://rufustrivia.com via GitHub Actions (tests must pass first); `npm run deploy` deploys by hand
- `npm run build:data` → only after upgrading `flag-icons`; regenerates `src/shared/data/countries.js` and `public/f/`
- `npm run build:landmarks` → refreshes landmarks from Wikidata + Commons photos and regenerates `public/credits.html`.
  Never hand-edit `src/shared/data/landmarks.js`; edit `landmark-notes.js` and re-run.
- `npm run build:cards` → re-copies the 🃏 cards from `experiments/cards-and-coins/prototype.html` into `public/js/card-art.js`
  and `src/shared/data/card-list.js`. Never hand-edit those two.
- `npm run build:maps` → redraws the country maps in `public/m/` + `src/shared/data/maps.js` from Natural Earth
  (offline, from npm packages). Never hand-edit `maps.js`; tweak the numbers at the top of `scripts/build-maps.mjs`.

## How it fits together
- **Server decides everything.** `src/room.js` (GameRoom Durable Object) builds questions from a seed,
  keeps answers private, times answers, scores, and sends each browser a "state" view.
  Never put answers, keys or facts in `publicQuestion()` (see `src/shared/game.js`).
- **Browser just shows it.** `public/js/app.js` re-renders from each state message; `fx.js`, `sound.js`
  and `rufus.js` are the eye/ear candy.
- **Hall of Fame** (`src/hall.js`) only accepts scores from GameRoom over RPC, never from the browser.
- **Topics** live in `src/shared/topics/`. Bank topics use `bankTopic()` from `kit.js` (optional `guide` =
  a sprite from `public/js/sprites.js` presenting the questions); generator topics implement
  `next({ rng, level, used, avoid, missed })`; `mixTopic()` combines parts with weights (see `animals.js`).
  A new topic also needs a `<id>_master` sticker in `src/shared/stickers.js` and its name in `public/stats.html`. Always use `rng`, never `Math.random`
  (the same seed must give the same game for everyone in a room).
- Flag files in `public/f/` have scrambled names on purpose (the URL must not reveal the country).
- **Quiz Bingo** (a challenge-room mode, `settings.mode = "bingo"`, only for `ROOM_LIMITS.bingoTopics`): the rules are
  pure functions in `src/shared/bingo.js` (pool of 24 squares, cards, calls, lines, second chances); the room side is the
  "QUIZ BINGO" section of `room.js`, the screens the "QUIZ BINGO" sections of `app.js`/`app.css`. Exactly ONE square in a
  pool may be right for each call, so a question with other right answers lists them in `alsoRight`, and one that only
  works with its 4 choices says `noBingo: true` (server-side only; `test/bingo.test.js` checks thousands of pools).
- **🎲 Mix it up** (topic id `mix` + a `mix` list of 2-5 playable topic ids, checked by `playable()` in
  `src/shared/topics/mix.js`): built with `mixTopic()`, equal weights. Mix question keys are `"<topic>-<key>"`, so topic ids
  must never contain `-`; the browser files them under the real topic (`rememberSeen` in app.js). Mix can't be bingo.
- **Rufus fun stickers** (`fun: true` in `stickers.js`) are the ONLY stickers a browser may ask for (`/api/stickers/fun`):
  taps on Rufus are counted in the browser (`funProgress` in `rufus.js`); his idle fidgets never count.
- **🃏 Rufus Coins and cards**: right answers earn coins, coins buy packs, packs hold cards. The rules and every number are in
  `src/shared/cards.js` (`ECONOMY`, `PACKS`); a brand new pack needs an entry there. A rarer card's `safety` number must stay bigger.
  Each player has their own `Burrow` Durable Object (`src/burrow.js`; the logic is `src/shared/burrow-core.js` so `npm test` can run it on real SQLite).
  GameRoom pays coins once, when a game ends (`queuePayouts`/`payOut` in `room.js`), and a burrow remembers every game it paid, so a retry can't pay twice.
  Packs are rolled and saved in the burrow before a browser sees them; the buy `nonce` makes a double tap buy once. The Card House screen is
  `public/js/cards.js` + `public/css/cards.css` (every class starts `rc-`). Cards are only for show: nothing about them may ever reach scoring, timing or question choice.
  Never put card pictures in `/api/meta` or a `/f/` flag file in card art (that's the Flag Frenzy answer key), and cards stay hidden during questions.
  Stamps are just your 3 sticker pins shown on your card, so stamping never uses a sticker up.
  Seasonal packs (`season` in `PACKS`, e.g. Diwali, Science Week, Thanksgiving): the server's clock only stops NEW purchases. Owned cards, featuring
  and already-bought packs never expire, and each window must stay open at least 7 days (`test/pack-availability.test.js`). New card art: `scripts/design-celebration-cards.mjs`, then `npm run build:cards`.
- **Arcade theme** (only while 🎲 Mix it up is the topic): `arcadeCheck()` in the "ARCADE" section of `app.js` puts
  `html.arcade` on the page (CSS: "ARCADE" at the end of `app.css`; `fx.setArcade()` for the grid; `data-arcade="..."` words
  in `index.html`); the music is `MUSIC.arcade`, the original menu tune from Adventures of Rufus, and the sprites are in `sprites.js`.
- Eye candy must stay at 60 frames a second (taps feel slow otherwise). Three rules keep it there:
  no `backdrop-filter` (glass panels paint their own copy of the sky: "painted glass" in `app.css` + `fx.alignGlass()`);
  a `filter`/`drop-shadow` goes on a still child, never on the element that moves (see the parade boxes, `.orb .ob`,
  `.emoji-card span` and Rufus's `.fox-shade`); anything redrawn every frame (timer ring, time bar) gets `will-change`.
  `fx.watchFrameRate()` flips slow devices to `html.lite`. Check with the frame counter in Chrome DevTools > Rendering.
- Names: "secret agent" names come from word lists in `src/shared/names.js`. Typed first names go through
  `checkNick()` there (letters only, rude-word filter). Never let free text reach the board without it.
  Typed names are also one-of-a-kind: `HallOfFame.claimName()` gives a name to the first player id that uses it
  (plus a name key to unlock it on another device). It's enforced in `/api/names/check`, `/api/hall/rename`
  and `GameRoom.onHello` (a taken name falls back to the secret agent name and the browser gets `nameTaken`).
- Credits: any new image, data or code from somewhere else must be credited in `public/credits.html`
  (generated by `scripts/build-landmarks.mjs`; add a section there). Commons photos must show author + licence.
- Keep content kid-appropriate: no violent wording (streaks/stories use dodge, chase, share, cool down) and no
  sad or politically touchy landmarks (see `SKIP` in `landmark-notes.js`).

## For Claude Code
The main audience is a 9-year-old learning to code, plus a parent. When helping:
- **Teach, don't just do.** Explain what each piece does in plain English.
- **New topic?** Point them to `src/shared/topics/_template.js` first and help them fill it in.
- **New fun facts?** `src/shared/data/flag-notes.js`. Facts must be true; when unsure, say "is said to".
- **New song?** Add it to `MUSIC` in `public/js/sound.js`, then set `music:` on a topic.
- Keep code simple and commented; suggest changing one number and refreshing to see what happens.
- Run `npm test` after changing topics: it checks thousands of generated questions.
