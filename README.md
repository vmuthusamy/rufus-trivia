# Rufus Trivia 🦊

**Play it: [rufustrivia.com](https://rufustrivia.com)**

A trivia game starring **Rufus the fox** from [Adventures of Rufus](https://rufusfamily.com).
Play solo to set a record in the Hall of Fame, or make a room and challenge friends live:
everyone gets the same questions at the same moment, like Blooket.

| Topic | What's in it | Where the questions come from |
|---|---|---|
| 🚩 Flag Frenzy | 195 countries, 4 question styles, lookalike flags on hard | flag-icons data, generated fresh every game |
| 📚 Books & Pop Culture | 📚 Book Club (favourite books and their characters), 🎬 Movie Magic (U/PG films and their characters), 🎮 Games, Toys & TV | hand-written, fact-checked banks |
| 🦁 Animal Kingdom | baby animals, animal groups, "is it a mammal?", amazing animal records, plus 🐍 Snake Spotter, 🦊 Rufus's Fox Facts and 🦖 Fiery's Dino Dig | an animal facts table + hand-written banks |
| 🔬 Science & Space | 🧪 Science Lab, 🫀 Your Amazing Body, 🌋 Planet Earth and 🚀 Space (about 7 in 10 questions are science) | hand-written, fact-checked banks |
| 🧮 Math Blast | sums, times tables, fractions, "make the number" puzzles (which sum makes 48?), mystery-number equations on a balance scale, Rufus story problems starring Fiery, Marthina, Renard and friends | random numbers, never runs out |

**🎯 Quiz Bingo** (a challenge-room game for Flags, Math Blast and Animal Kingdom): the host picks *Game: Bingo* and
*Win: Line* (first to fill a row, column or diagonal) or *Blackout* (all 16 squares). Everyone gets their own 4×4 card of
answers from a shared pool of 24. Rufus calls a question with no choices: tap its answer on your card to stamp it 🐾, or
"Not on my card ✋". Squares someone still needs come back as "Second chance!" calls. Every pool is built so that exactly
one square is right for each call (see `src/shared/bingo.js`).

Retired topics (🗺️ Capitals & Landmarks, 🚀 Space Explorer) are hidden from the menus but their code stays, so games that were
already running can finish and old scores stay in the Hall of Fame. See `RETIRED` in `src/shared/topics/index.js`.

- **No AI, no inference costs.** Questions come from open data, hand-written banks and random numbers.
- **Fresh every game.** Each device remembers what it has seen, so the next game avoids it, and brings back missed questions for practice.
- **Fair.** The server keeps the answers secret, times every answer and works out the points.
  Scores reach the Hall of Fame straight from the server; flag and photo file names are scrambled so they can't give answers away.
- **Kid-safe.** No sign-up. Players get a "secret agent" name ("Turbo Fox") by default; they can choose to show their
  first name instead, which the server checks (letters only, nothing rude).
- **One of a kind.** The first player to use a typed-in name keeps it, so nobody else can show up as "Arvind"
  on the leaderboard or in a challenge room. The owner gets a secret name key ("comet-otter-473") in their
  profile to be the same player (stickers and all) on another device.

## Run it on your computer

```bash
npm install
npm run dev          # http://127.0.0.1:8787
```

## Tests

```bash
npm test             # makes thousands of questions per topic (and bingo pools) and checks them all
npm run test:e2e     # with `npm run dev` running: plays solo, a 3-player challenge and a 3-player bingo over real WebSockets
npm run test:load    # with `npm run dev` running: 6 rooms x 25 kids, checks every question is fair
node test/load.mjs --base https://rufustrivia.com --rooms 2 --players 10   # a gentle check of the live site
```

The load test checks that everyone in a room got the identical question and deadline, saw the same answer,
and that scores add up. On a laptop, 150 players across 6 rooms got each question within ~5 ms of each other.

## Deploying (automatic)

Every push to `main` runs the tests in GitHub Actions and, if they pass, deploys to Cloudflare
(`.github/workflows/deploy.yml`). The Worker serves `rufustrivia.com` and `www.rufustrivia.com`
(see `routes` in `wrangler.jsonc`).

One-time setup, in GitHub → Settings → Secrets and variables → Actions:

| Secret | Where to get it |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Cloudflare → My Profile → API Tokens → Create Token → "Edit Cloudflare Workers" template |
| `CLOUDFLARE_ACCOUNT_ID` | the long id in your Cloudflare dashboard URL |

Until the secrets exist, pushes still run the tests and skip the deploy. You can also deploy by hand with
`npx wrangler login` then `npm run deploy`. Everything fits Cloudflare's free plan.

## How it's built

```
public/                      the website (plain HTML/CSS/JS, no build step)
  index.html                 every screen
  css/app.css                the look: nebula, synthwave grid, glass cards
  js/app.js                  screens + reacting to what the server says
  js/streaks.js              ✏️ streak names ("Hat Trick!" → "LEGENDARY!") and Rufus's jokes
  js/sound.js                ✏️ 8-bit sound effects + songs (made live, no audio files)
  js/rufus.js                Rufus (pixel art from his game) and the things he says
  js/sprites.js              Rufus, Fiery, Marthina, Renard, Felix and the baddies, copied from his game's pixel art
  js/fx.js                   confetti, fireworks, the moving grid, number roll-ups
  js/config.js               ✏️ YouTube link and other easy settings
  credits.html               every source and licence (made by the landmarks script)
  f/  l/  m/                 flag, landmark and map pictures (scrambled names)
src/                         the server (a Cloudflare Worker)
  worker.js                  the front door: /api/...
  room.js                    GameRoom Durable Object: runs one game (solo or challenge)
  hall.js                    HallOfFame Durable Object: the shared scoreboard (SQLite)
  shared/bingo.js            🎯 Quiz Bingo's rules: the pool of squares, cards, calls, lines, second chances
  shared/topics/             ✏️ the quiz topics; add new ones here
  shared/topics/animal-banks.js  ✏️ snake, fox, dino and amazing-animal questions
  shared/data/animals.js     ✏️ the animal facts table (baby names, group names, mammal/bird/reptile...)
  shared/data/flag-notes.js  ✏️ flag fun facts, lookalike flags, easy/hard lists
  shared/data/landmark-notes.js  ✏️ which landmarks to include, their fun facts and nicer names
scripts/build-icons.mjs      favicon.ico / app icons (the same pixel fox as rufusfamily.com)
scripts/build-data.mjs       flag-icons → country data + flag pictures
scripts/build-landmarks.mjs  Wikidata + Commons → landmark data, photos and the credits page
scripts/build-maps.mjs       Natural Earth → a little map for every country (npm run build:maps)
```

## Adding things

- **A topic:** copy `src/shared/topics/_template.js`, write questions, add it to `src/shared/topics/index.js`.
  Each topic picks its `orbit` (what circles Rufus) and `music` (a song from `public/js/sound.js`).
  Give a question bank a `guide` and a character from the game presents it. To build one topic out of
  several parts (like Animal Kingdom), use `mixTopic()` from `kit.js`. The home screen and the quiz picker
  lay out any number of topics in even rows by themselves.
- **Animals:** a new row in `src/shared/data/animals.js` makes baby-name, group-name and class questions
  automatically. Snake/fox/dino questions go in `animal-banks.js`; the numbers in `parts` at the bottom of animals.js set how often each comes up.
- **Landmarks:** add the Wikipedia title to `LANDMARK_LIST` in `landmark-notes.js`, then `npm run build:landmarks`.
  The script also discovers famous UNESCO World Heritage Sites by itself every time it runs
  (`npm run build:landmarks -- --discover 120` for more). It skips whole cities and sad or touchy places,
  and anything in `SKIP`.
- **Math story problems:** `STORIES` in `src/shared/topics/math.js`, set in the real levels of Adventures of Rufus.
  Give a story a `who:` (a sprite name from `public/js/sprites.js`) and that character shows up on screen.
- **"Make the number" characters:** `CREW` in `math.js` says who needs how many of what (Fiery's marshmallows,
  Marthina's cupcakes...). New ways to write a number go in `WAYS`.

## Credits and licences

The full list, with every photographer, is on the site at [/credits](https://rufustrivia.com/credits).

- Flags and country data: [flag-icons](https://github.com/lipis/flag-icons) (MIT)
- Landmark data: [Wikidata](https://www.wikidata.org) (CC0)
- Landmark photos: [Wikimedia Commons](https://commons.wikimedia.org), each under its own licence (CC BY, CC BY-SA, CC0 or public domain), credited in the game and on the credits page
- Maps: [Natural Earth](https://www.naturalearthdata.com) (public domain) via [world-atlas](https://github.com/topojson/world-atlas), drawn with [topojson-client](https://github.com/topojson/topojson-client) and [d3-geo](https://github.com/d3/d3-geo) (ISC), matched with [i18n-iso-countries](https://github.com/michaelwittig/node-i18n-iso-countries) (MIT)
- QR codes: [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) (MIT)
- Fonts: Lilita One and Nunito (Google Fonts, SIL Open Font License 1.1)
- Rufus: pixel art from Adventures of Rufus 🦊

Rufus Trivia's own code is licensed under the GPL-3.0 (see `LICENSE`).
