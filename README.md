# Rufus Trivia 🦊

**Play it: [rufustrivia.com](https://rufustrivia.com)**

A trivia game starring **Rufus the fox** from [Adventures of Rufus](https://rufusfamily.com).
Play solo to set a record in the Hall of Fame, or make a room and challenge friends live:
everyone gets the same questions at the same moment, like Blooket.

| Topic | What's in it | Where the questions come from |
|---|---|---|
| 🚩 Flag Frenzy | 195 countries, 4 question styles, lookalike flags on hard | flag-icons data, generated fresh every game |
| 🗺️ Capitals & Landmarks | 185 capitals + ~190 world landmarks with photos | flag-icons + Wikidata + Wikimedia Commons |
| 🚀 Space Explorer | planets, stars and astronauts | a hand-written question bank |
| 🧮 Math Blast | sums, times tables, fractions, Rufus story problems | random numbers, never runs out |

- **No AI, no inference costs.** Questions come from open data, hand-written banks and random numbers.
- **Fresh every game.** Each device remembers what it has seen, so the next game avoids it, and brings back missed questions for practice.
- **Fair.** The server keeps the answers secret, times every answer and works out the points.
  Scores reach the Hall of Fame straight from the server; flag and photo file names are scrambled so they can't give answers away.
- **Kid-safe.** No sign-up. Players get a "secret agent" name ("Turbo Fox") by default; they can choose to show their
  first name instead, which the server checks (letters only, nothing rude).

## Run it on your computer

```bash
npm install
npm run dev          # http://127.0.0.1:8787
```

## Tests

```bash
npm test             # makes thousands of questions per topic and checks them all
npm run test:e2e     # with `npm run dev` running: plays solo + a 3-player challenge over real WebSockets
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
  js/fx.js                   confetti, fireworks, the moving grid, number roll-ups
  js/config.js               ✏️ YouTube link and other easy settings
  credits.html               every source and licence (made by the landmarks script)
  f/  l/                     flag and landmark pictures (scrambled names)
src/                         the server (a Cloudflare Worker)
  worker.js                  the front door: /api/...
  room.js                    GameRoom Durable Object: runs one game (solo or challenge)
  hall.js                    HallOfFame Durable Object: the shared scoreboard (SQLite)
  shared/topics/             ✏️ the quiz topics; add new ones here
  shared/data/flag-notes.js  ✏️ flag fun facts, lookalike flags, easy/hard lists
  shared/data/landmark-notes.js  ✏️ which landmarks to include, their fun facts and nicer names
scripts/build-icons.mjs      favicon.ico / app icons (the same pixel fox as rufusfamily.com)
scripts/build-data.mjs       flag-icons → country data + flag pictures
scripts/build-landmarks.mjs  Wikidata + Commons → landmark data, photos and the credits page
```

## Adding things

- **A topic:** copy `src/shared/topics/_template.js`, write questions, add it to `src/shared/topics/index.js`.
  Each topic picks its `orbit` (what circles Rufus) and `music` (a song from `public/js/sound.js`).
- **Landmarks:** add the Wikipedia title to `LANDMARK_LIST` in `landmark-notes.js`, then `npm run build:landmarks`.
  The script also discovers famous UNESCO World Heritage Sites by itself every time it runs
  (`npm run build:landmarks -- --discover 120` for more). It skips whole cities and sad or touchy places,
  and anything in `SKIP`.
- **Math story problems:** `STORIES` in `src/shared/topics/math.js`, set in the real levels of Adventures of Rufus.

## Credits and licences

The full list, with every photographer, is on the site at [/credits](https://rufustrivia.com/credits).

- Flags and country data: [flag-icons](https://github.com/lipis/flag-icons) (MIT)
- Landmark data: [Wikidata](https://www.wikidata.org) (CC0)
- Landmark photos: [Wikimedia Commons](https://commons.wikimedia.org), each under its own licence (CC BY, CC BY-SA, CC0 or public domain), credited in the game and on the credits page
- QR codes: [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) (MIT)
- Fonts: Lilita One and Nunito (Google Fonts, SIL Open Font License 1.1)
- Rufus: pixel art from Adventures of Rufus 🦊

Rufus Trivia's own code is licensed under the GPL-3.0 (see `LICENSE`).
