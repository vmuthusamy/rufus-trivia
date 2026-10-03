// Builds the landmark questions from open data:
//   - Wikidata (public domain, CC0): names, countries, descriptions, how famous each place is
//   - Wikimedia Commons: a photo of each landmark, with the photographer's name and licence
//
//   npm run build:landmarks                  # curated list + discover up to 60 more
//   npm run build:landmarks -- --discover 0  # only the curated list
//   npm run build:landmarks -- --discover 120 --min-links 50
//
// Edit the list in src/shared/data/landmark-notes.js. Photos already downloaded are reused,
// so running it again is quick. It writes:
//   src/shared/data/landmarks.js  the data the quiz uses
//   public/l/*.jpg                photos (scrambled names so they don't give away answers)
//   public/credits.html           every source, licence and photographer, for the website

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync, readdirSync, readFileSync, statSync, unlinkSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { LANDMARK_LIST, SKIP, NAMES } from "../src/shared/data/landmark-notes.js";
import { COUNTRIES } from "../src/shared/data/countries.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_IMG = join(root, "public", "l");
const OUT_DATA = join(root, "src", "shared", "data", "landmarks.js");
const OUT_CREDITS = join(root, "public", "credits.html");
// Wikimedia asks scripts to say who they are. We point at the project, not a person.
const UA = "RufusTrivia/1.0 (https://github.com/vmuthusamy/rufus-trivia; kids quiz build script)";
const SALT = "rufus-the-fox-loves-landmarks";
const BOX = 600; // photos fit inside 600x600

const args = process.argv.slice(2);
const opt = (name, dflt) => { const i = args.indexOf(name); return i >= 0 ? Number(args[i + 1]) : dflt; };
const DISCOVER = opt("--discover", 60);
const MIN_LINKS = opt("--min-links", 60);

const KNOWN_CODES = new Set(COUNTRIES.map((c) => c.code));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Auto-discovered sites must be a PLACE to visit (not a whole city) and not a sad or touchy one.
const NOT_A_LANDMARK = /\b(city|capital|town|municipality|prefecture|commune|comune|settlement|governorate|enclave|province|county|district|territory|independent state|country)\b/i;
const NOT_FOR_KIDS = /\b(concentration|extermination|genocide|massacre|prison|nuclear|bomb|slave|war|battle|memorial|cemetery|tomb of the unknown)\b/i;
const OK_LICENSE = (lic) => !/^GFDL/i.test(lic); // GFDL-only photos need the whole licence copied alongside: skip them

async function sparql(query) {
  const res = await fetch("https://query.wikidata.org/sparql", {
    method: "POST",
    headers: { "User-Agent": UA, Accept: "application/sparql-results+json", "Content-Type": "application/x-www-form-urlencoded" },
    body: "query=" + encodeURIComponent(query),
  });
  if (!res.ok) throw new Error(`Wikidata said ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return (await res.json()).results.bindings;
}

// Kids (and grown-ups) might type an old or redirecting Wikipedia title: follow redirects.
async function canonicalTitles(titles) {
  const map = new Map();
  for (let i = 0; i < titles.length; i += 50) {
    const batch = titles.slice(i, i + 50);
    const url = "https://en.wikipedia.org/w/api.php?action=query&format=json&redirects=1&titles=" + encodeURIComponent(batch.join("|"));
    const q = (await (await fetch(url, { headers: { "User-Agent": UA } })).json()).query || {};
    const hop = new Map();
    for (const n of q.normalized || []) hop.set(n.from, n.to);
    for (const r of q.redirects || []) hop.set(r.from, r.to);
    for (const t of batch) {
      let c = t;
      for (let k = 0; k < 3 && hop.has(c); k++) c = hop.get(c);
      map.set(t, c);
    }
    await sleep(200);
  }
  return map;
}

const FIELDS = `
  ?item wikibase:sitelinks ?links .
  OPTIONAL { ?item wdt:P18 ?image }
  OPTIONAL { ?item wdt:P17 ?country . ?country wdt:P297 ?code }
  OPTIONAL { ?item schema:description ?desc . FILTER(LANG(?desc) = "en") }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". ?item rdfs:label ?name . }`;

function group(rows, discovered) {
  const byId = new Map();
  for (const r of rows) {
    const id = r.item.value.split("/").pop();
    const it = byId.get(id) || {
      id, title: r.title.value, name: r.name ? r.name.value : r.title.value, desc: r.desc ? r.desc.value : "",
      links: Number(r.links.value), codes: new Set(), image: null, discovered,
    };
    if (r.code) it.codes.add(r.code.value.toLowerCase());
    if (!it.image && r.image) it.image = decodeURIComponent(r.image.value.split("/Special:FilePath/").pop());
    byId.set(id, it);
  }
  return [...byId.values()];
}

async function curated(titles) {
  const values = titles.map((t) => JSON.stringify(t) + "@en").join(" ");
  return group(await sparql(`
    SELECT ?item ?title ?name ?desc ?links ?image ?code WHERE {
      VALUES ?title { ${values} }
      ?article schema:about ?item ; schema:isPartOf <https://en.wikipedia.org/> ; schema:name ?title .
      ${FIELDS}
    }`), false);
}

// The "dynamic" part: the most famous UNESCO World Heritage Sites (wd:Q9259) not on our list yet.
async function discover(have) {
  if (!DISCOVER) return [];
  const rows = await sparql(`
    SELECT ?item ?title ?name ?desc ?links ?image ?code WHERE {
      ?item wdt:P1435 wd:Q9259 ; wikibase:sitelinks ?links ; wdt:P18 ?image .
      FILTER(?links >= ${MIN_LINKS})
      ?article schema:about ?item ; schema:isPartOf <https://en.wikipedia.org/> ; schema:name ?title .
      ${FIELDS}
    } ORDER BY DESC(?links) LIMIT 2000`);
  return group(rows, true)
    .filter((it) => !have.has(it.id) && !SKIP.has(it.title) && it.codes.size === 1)
    .filter((it) => !NOT_A_LANDMARK.test(it.desc) && !NOT_FOR_KIDS.test(it.desc + " " + it.name))
    .sort((a, b) => b.links - a.links)
    .slice(0, DISCOVER);
}

const stripHtml = (s) => (s || "").replace(/<[^>]*>/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#0?39;/g, "'")
  .replace(/\bUser:/g, "").replace(/\s+/g, " ").trim();

// Ask Commons for a smaller copy of each photo, plus who took it and the licence.
async function photoInfo(files) {
  const out = new Map();
  for (let i = 0; i < files.length; i += 40) {
    const batch = files.slice(i, i + 40);
    const url = "https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo"
      + `&iiprop=url|extmetadata&iiurlwidth=${BOX}&iiurlheight=${BOX}&titles=` + encodeURIComponent(batch.map((f) => "File:" + f).join("|"));
    const data = await (await fetch(url, { headers: { "User-Agent": UA } })).json();
    const norm = new Map((data.query.normalized || []).map((n) => [n.to, n.from]));
    for (const page of Object.values(data.query.pages || {})) {
      const info = page.imageinfo && page.imageinfo[0];
      if (!info) continue;
      const m = info.extmetadata || {};
      const asked = (norm.get(page.title) || page.title).replace(/^File:/, "");
      out.set(asked.replace(/_/g, " "), {
        thumb: info.thumburl || info.url,
        page: info.descriptionurl,
        author: stripHtml(m.Artist && m.Artist.value).slice(0, 120) || "Unknown",
        license: stripHtml(m.LicenseShortName && m.LicenseShortName.value) || "see source",
        licenseUrl: (m.LicenseUrl && m.LicenseUrl.value) || "",
      });
    }
    await sleep(300);
  }
  return out;
}

async function download(url, file) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (res.ok) { writeFileSync(file, Buffer.from(await res.arrayBuffer())); return true; }
    await sleep(1500 * (attempt + 1));
  }
  return false;
}

// On a Mac, squeeze photos down further (JPEG, quality 70). Elsewhere they're used as downloaded.
let hasSips = true;
function squeeze(file) {
  if (!hasSips) return;
  try { execFileSync("sips", ["-Z", String(BOX), "-s", "format", "jpeg", "-s", "formatOptions", "70", file, "--out", file], { stdio: "ignore" }); }
  catch { hasSips = false; }
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// ---------------- go! ----------------
mkdirSync(OUT_IMG, { recursive: true });
console.log(`Looking up ${LANDMARK_LIST.length} landmarks on Wikipedia + Wikidata…`);
const canon = await canonicalTitles(LANDMARK_LIST);
const mine = await curated([...new Set(canon.values())]);
const found = new Set(mine.map((m) => m.title));
const missing = LANDMARK_LIST.filter((t) => !found.has(canon.get(t)));
console.log(`  found ${mine.length}` + (missing.length ? `; not found (check the Wikipedia title): ${missing.join(", ")}` : ""));
for (const m of mine) { const orig = LANDMARK_LIST.find((t) => canon.get(t) === m.title); m.listTitle = orig || m.title; }

const extra = await discover(new Set(mine.map((m) => m.id)));
if (DISCOVER) console.log(`Discovered ${extra.length} more World Heritage Sites (≥ ${MIN_LINKS} Wikipedias).`);

const all = [...mine, ...extra].filter((it) => it.image && !SKIP.has(it.title) && !SKIP.has(it.listTitle));
const info = await photoInfo(all.map((it) => it.image));

const rows = [];
const keep = new Set();
let downloaded = 0, reused = 0;
for (const it of all) {
  const p = info.get(it.image.replace(/_/g, " "));
  if (!p || !p.thumb) { console.log(`  no photo for ${it.name}, skipping`); continue; }
  if (!OK_LICENSE(p.license)) { console.log(`  ${it.name}: photo is ${p.license} only, skipping`); continue; }
  const codes = [...it.codes].filter((c) => KNOWN_CODES.has(c));
  if (!codes.length) { console.log(`  ${it.name} isn't in one of our 195 countries, skipping`); continue; }
  const name = createHash("sha256").update(SALT + ":" + it.id).digest("hex").slice(0, 12) + ".jpg";
  const file = join(OUT_IMG, name);
  if (existsSync(file)) reused++;
  else {
    if (!(await download(p.thumb, file))) { console.log(`  download failed for ${it.name}, skipping`); continue; }
    squeeze(file);
    downloaded++;
    await sleep(150); // be polite to Wikimedia's servers
  }
  keep.add(name);
  const key = it.listTitle || it.title;
  rows.push({
    id: it.id, title: key, name: NAMES[key] || it.name, desc: it.desc, links: it.links, countries: codes,
    img: "/l/" + name, credit: { author: p.author, license: p.license, licenseUrl: p.licenseUrl, url: p.page },
    ...(it.discovered ? { discovered: true } : {}),
  });
}
rows.sort((a, b) => b.links - a.links);

// Tidy up photos we no longer use.
let removed = 0;
for (const f of readdirSync(OUT_IMG)) if (!keep.has(f)) { unlinkSync(join(OUT_IMG, f)); removed++; }

writeFileSync(OUT_DATA, `// AUTO-GENERATED by scripts/build-landmarks.mjs from Wikidata (CC0) + Wikimedia Commons photos.
// Don't edit by hand: change src/shared/data/landmark-notes.js and run \`npm run build:landmarks\`.
export const LANDMARKS = [
${rows.map((r) => "  " + JSON.stringify(r)).join(",\n")}
];
`);

// ---------- the Credits page ----------
const mit = (file) => esc(readFileSync(join(root, "node_modules", file), "utf8").trim());
const qrHeader = readFileSync(join(root, "public", "js", "vendor", "qrcode.mjs"), "utf8").match(/Copyright \(c\) [^\n]+/)[0];
writeFileSync(OUT_CREDITS, `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Credits · Rufus Trivia</title>
<meta name="description" content="The open-source projects, open data and photographers behind Rufus Trivia, and their licences.">
<link rel="icon" href="/favicon.ico" sizes="48x48"><link rel="icon" href="/favicon.svg" type="image/svg+xml">
<style>
  :root{--ink:#fff7ec;--muted:#b9b3d6;--a:#ffb15c;--card:#1a1440;--line:rgba(255,255,255,.12)}
  *{box-sizing:border-box} body{margin:0;padding:28px 16px 70px;background:#0b0820;color:var(--ink);font:16px/1.55 system-ui,-apple-system,"Segoe UI",sans-serif}
  main{max-width:960px;margin:auto} a{color:var(--a)} h1{font-size:34px;margin:0 0 6px} h2{font-size:22px;margin:34px 0 10px}
  .lead{color:var(--muted);margin:0 0 18px} .card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:16px 18px;margin:10px 0}
  .card b{color:#fff} .tag{display:inline-block;font:700 12px ui-monospace,monospace;letter-spacing:.06em;padding:3px 8px;border-radius:999px;background:rgba(255,177,92,.15);color:var(--a);margin-left:6px}
  details{margin-top:8px} summary{cursor:pointer;color:var(--a)} pre{white-space:pre-wrap;font:12.5px/1.45 ui-monospace,monospace;color:var(--muted);background:#120d30;padding:12px;border-radius:10px}
  ul.photos{list-style:none;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:10px}
  ul.photos li{display:flex;gap:12px;align-items:center;background:var(--card);border:1px solid var(--line);border-radius:12px;padding:8px}
  ul.photos img{width:88px;height:66px;object-fit:cover;border-radius:8px;flex:none} small{color:var(--muted)}
  .back{display:inline-block;margin-bottom:18px;font-weight:800}
</style></head><body><main>
<a class="back" href="/">← Back to the game</a>
<h1>🦊 Credits &amp; licences</h1>
<p class="lead">Rufus Trivia is free, has no ads and uses no AI. It's built from open-source code, open data and photos
shared by photographers around the world. Thank you to all of them! Here's who made what, and the licence we use it under.</p>

<h2>🚩 Flags and country facts</h2>
<div class="card"><b>flag-icons</b> by Panayiotis Lipiridis and contributors <span class="tag">MIT License</span><br>
All 195 flag pictures, plus country names, capitals and continents, come from
<a href="https://github.com/lipis/flag-icons">github.com/lipis/flag-icons</a>. File names were changed so they don't give away quiz answers.
<details><summary>Full licence text</summary><pre>${mit("flag-icons/LICENSE")}</pre></details></div>
<div class="card"><b>Flag fun facts</b> were written for this game by hand.</div>

<h2>🗺️ Landmarks</h2>
<div class="card"><b>Wikidata</b> <span class="tag">CC0 1.0 (public domain)</span><br>
Landmark names, countries, descriptions and how well-known each place is come from <a href="https://www.wikidata.org">Wikidata</a>,
the free knowledge base. CC0 means no permission is needed, but we're happy to say thanks.</div>
<div class="card"><b>Wikimedia Commons photos</b> <span class="tag">licence per photo below</span><br>
Each photo is from <a href="https://commons.wikimedia.org">Wikimedia Commons</a> and keeps its own licence
(mostly <a href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA</a> or <a href="https://creativecommons.org/licenses/by/4.0/">CC BY</a>,
some public domain or CC0). Photos were only resized and re-saved; nothing else was changed. The photographer and licence are also shown in the game after each answer.</div>
<ul class="photos">
${rows.map((r) => `<li><img src="${r.img}" alt="${esc(r.name)}" loading="lazy"><div><b>${esc(r.name)}</b><br><small>Photo: ${esc(r.credit.author)} · ${r.credit.licenseUrl ? `<a href="${esc(r.credit.licenseUrl)}">${esc(r.credit.license)}</a>` : esc(r.credit.license)} · <a href="${esc(r.credit.url)}">source</a></small></div></li>`).join("\n")}
</ul>

<h2>🧭 Maps</h2>
<div class="card"><b>Natural Earth</b> <span class="tag">Public domain</span><br>
The country outlines in the map questions come from <a href="https://www.naturalearthdata.com">Natural Earth</a>, free map data made by mapmakers
around the world. Natural Earth is in the public domain, so no permission is needed, but we're happy to say thanks. The maps follow Natural Earth's
borders; a couple of places whose borders grown-ups still argue about are left out of the map questions. File names were changed so they don't give away quiz answers.</div>
<div class="card"><b>world-atlas</b>, <b>topojson-client</b> and <b>d3-geo</b> by Mike Bostock <span class="tag">ISC License</span><br>
world-atlas packages the Natural Earth outlines; topojson-client and d3-geo turn them into the little map pictures when we build the game.
<a href="https://github.com/topojson/world-atlas">github.com/topojson/world-atlas</a> · <a href="https://github.com/topojson/topojson-client">github.com/topojson/topojson-client</a> · <a href="https://github.com/d3/d3-geo">github.com/d3/d3-geo</a>
<details><summary>Full licence text</summary><pre>${["world-atlas", "topojson-client", "d3-geo"].map((p) => p + "\n" + mit(p + "/LICENSE")).join("\n\n")}</pre></details></div>
<div class="card"><b>i18n-iso-countries</b> by Andreas Wittig / widdix <span class="tag">MIT License</span><br>
Matches each country to its number in the map data. <a href="https://github.com/michaelwittig/node-i18n-iso-countries">github.com/michaelwittig/node-i18n-iso-countries</a>
<details><summary>Full licence text</summary><pre>${mit("i18n-iso-countries/LICENSE")}</pre></details></div>

<h2>📱 Code and fonts</h2>
<div class="card"><b>qrcode-generator</b> by Kazuhiko Arase <span class="tag">MIT License</span><br>
Makes the QR codes for joining a challenge. <a href="https://github.com/kazuhikoarase/qrcode-generator">github.com/kazuhikoarase/qrcode-generator</a>
<details><summary>Full licence text</summary><pre>The MIT License (MIT)

${esc(qrHeader)}

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.</pre></details></div>
<div class="card"><b>Lilita One</b> and <b>Nunito</b> fonts from <a href="https://fonts.google.com">Google Fonts</a> <span class="tag">SIL Open Font License 1.1</span><br>
<a href="https://openfontlicense.org">openfontlicense.org</a></div>
<div class="card"><b>Emoji</b> (the animals, planets and so on) are drawn by your own device's emoji font. The game doesn't include any emoji images.</div>

<h2>🎵 Made for this game</h2>
<div class="card"><b>Rufus the fox</b> pixel art comes from <a href="https://rufusfamily.com">Adventures of Rufus</a>, made by a 9-year-old game designer and his family.<br>
<b>Music and sound effects</b> are original tunes, played live by your browser (no recordings).<br>
<b>Space and maths questions</b> and the Rufus story problems were written for this game.</div>
<div class="card"><b>Rufus Trivia's own code</b> <span class="tag">GPL-3.0</span><br>
Source code: <a href="https://github.com/vmuthusamy/rufus-trivia">github.com/vmuthusamy/rufus-trivia</a></div>
</main></body></html>
`);

console.log(`\nWrote ${rows.length} landmarks (${downloaded} new photos, ${reused} reused, ${removed} old ones removed).`);
const size = readdirSync(OUT_IMG).reduce((s, f) => s + statSync(join(OUT_IMG, f)).size, 0);
console.log(`Photos on disk: ${readdirSync(OUT_IMG).length} files, ${(size / 1e6).toFixed(1)} MB. Credits page: public/credits.html`);
if (extra.length) console.log(`Discovered: ${rows.filter((r) => r.discovered).map((r) => r.name).join(", ")}`);
