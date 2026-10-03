// 🗺️ BUILD MAPS: draws a little "where in the world?" map for every country.
//
//   npm run build:maps
//
// Where the shapes come from (all free to use):
//   world-atlas   country outlines from Natural Earth (public domain), packaged as TopoJSON (ISC licence)
//   topojson-client + d3-geo   turn those outlines into SVG paths (ISC licence)
//   i18n-iso-countries         matches our two-letter codes ("fr") to Natural Earth's numbers ("250") (MIT)
//
// What it makes:
//   public/m/<scrambled>.svg     one map per country: the neighbourhood in blue, the country in orange
//   src/shared/data/maps.js      which map file belongs to which country, plus its land neighbours
//
// File names are scrambled on purpose (like the flags), so peeking at the picture's address
// doesn't give away the answer.

import { readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { feature, neighbors, mesh } from "topojson-client";
import { geoAzimuthalEqualArea, geoArea, geoCentroid, geoDistance, geoGraticule10, geoLength, geoPath, geoStream } from "d3-geo";
import iso from "i18n-iso-countries";
import { COUNTRIES } from "../src/shared/data/countries.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const atlas = (name) => JSON.parse(readFileSync(join(root, "node_modules", "world-atlas", name), "utf8"));
const OUT_IMG = join(root, "public", "m");
const OUT_DATA = join(root, "src", "shared", "data", "maps.js");
const SALT = "rufus-the-fox-reads-maps";

// ---------- picture settings (change a number, run again, see what happens!) ----------
const W = 400, H = 300;              // map size (4:3, same shape as the flag pictures)
const MAX_SCALE = 880;               // how far we can zoom in: about 26° of the globe across, so tiny countries still show their neighbours
const ISLAND_SCALE = 300;            // tiny island countries zoom out further, so there's more than just sea around them
const FILL = 0.6;                    // the country (and its nearby islands) fills about 60% of the picture
const TINY_AREA = 150;               // covers fewer square pixels than this? draw a circle around it so you can find it
const DETAIL_PX = 0.6;               // straighten wiggles smaller than this many pixels (keeps files small)
const SPECK_PX = 2;                  // neighbours' islands smaller than this are left out
const SEA = "#0c1a3d", GRID = "#1b3166", LAND = "#3d5283", ME = "#ff8a1f", ME_EDGE = "#fff1dc";

// Natural Earth draws a few places on their own. Join them to the country most of the world counts them in.
const JOIN_TO = { "Somaliland": "706", "N. Cyprus": "196" };

// ---------- load the outlines ----------
const topo = atlas("countries-50m.json");
const geoms = topo.objects.countries.geometries;
const shapes = feature(topo, topo.objects.countries).features;
// Tuvalu is too small for the 1:50m map, so borrow it from the detailed 1:10m one.
const topo10 = atlas("countries-10m.json");
const tuvalu = feature(topo10, topo10.objects.countries).features.find((f) => f.id === "798");
if (tuvalu) shapes.push(tuvalu);

const numericOf = (code) => iso.alpha2ToNumeric(code.toUpperCase());
const partsOf = (num) => shapes.filter((f) => f.id === num || JOIN_TO[f.properties.name] === num);

// ---------- land neighbours, longest shared border first ----------
const nb = neighbors(geoms);
const idxByNum = new Map();
geoms.forEach((g, i) => {
  const num = g.id || JOIN_TO[g.properties.name];
  if (num) idxByNum.set(num, [...(idxByNum.get(num) || []), i]);
});
const codeByNum = new Map(COUNTRIES.map((c) => [numericOf(c.code), c.code]));
function neighboursOf(code) {
  const num = numericOf(code);
  const mine = idxByNum.get(num) || [];
  const border = new Map(); // neighbour code -> km of shared border
  for (const i of mine) {
    for (const j of nb[i]) {
      const other = codeByNum.get(geoms[j].id || JOIN_TO[geoms[j].properties.name]);
      if (!other || other === code) continue;
      const line = mesh(topo, topo.objects.countries, (a, b) => (a === geoms[i] && b === geoms[j]) || (a === geoms[j] && b === geoms[i]));
      border.set(other, (border.get(other) || 0) + geoLength(line) * 6371);
    }
  }
  // Neighbours on the same continent first (France: Belgium before Brazil!), then longest border first.
  const continent = (c) => COUNTRIES.find((x) => x.code === c).continent;
  const away = (c) => (continent(c) === continent(code) ? 0 : 1);
  return [...border].sort((a, b) => away(a[0]) - away(b[0]) || b[1] - a[1]).map(([c]) => c);
}

// ---------- which bits of a country to frame (the mainland + islands close to it) ----------
// France's map should show France, not stretch all the way to its islands in the Caribbean.
function framePolys(parts) {
  const polys = [];
  for (const f of parts) {
    const g = f.geometry;
    for (const coords of g.type === "Polygon" ? [g.coordinates] : g.coordinates) {
      const p = { type: "Polygon", coordinates: coords };
      polys.push({ p, area: geoArea(p), c: geoCentroid(p) });
    }
  }
  polys.sort((a, b) => b.area - a.area);
  const main = polys[0];
  const radius = Math.max(...main.p.coordinates[0].map((pt) => geoDistance(main.c, pt)));
  const deg = Math.PI / 180;
  return polys.filter((x) => {
    const d = geoDistance(main.c, x.c);
    const big = x.area >= main.area * 0.02;
    return x === main || d <= radius + (big ? 8 : 3) * deg;
  }).map((x) => x.p);
}

// ---------- turn shapes into short SVG path text ----------
// Douglas-Peucker: keep only the points that change the outline by more than DETAIL_PX.
function simplify(pts) {
  if (pts.length < 4) return pts;
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const [ax, ay] = pts[a], [bx, by] = pts[b];
    const len = Math.hypot(bx - ax, by - ay) || 1e-9;
    let far = -1, farD = DETAIL_PX;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs((bx - ax) * (ay - pts[i][1]) - (ax - pts[i][0]) * (by - ay)) / len;
      if (d > farD) { far = i; farD = d; }
    }
    if (far > 0) { keep[far] = 1; stack.push([a, far], [far, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}
const num = (v) => {
  const s = (Math.round(v * 10) / 10).toString();
  return s.replace(/^(-?)0\./, "$1.");
};
function pathText(rings, closed, speck = 0) {
  let d = "";
  for (const ring of rings) {
    const xs = ring.map((p) => p[0]), ys = ring.map((p) => p[1]);
    if (Math.max(...xs) - Math.min(...xs) < speck && Math.max(...ys) - Math.min(...ys) < speck) continue;
    // Straighten tiny wiggles, then round to 0.1px.
    const pts = simplify(ring).map(([x, y]) => [Math.round(x * 10) / 10, Math.round(y * 10) / 10]);
    if (pts.length < (closed ? 3 : 2)) continue;
    let s = "M" + num(pts[0][0]) + " " + num(pts[0][1]) + "l";
    for (let i = 1; i < pts.length; i++) {
      for (const v of [pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]]) {
        const t = num(v);
        s += (t.startsWith("-") || s.endsWith("l") ? "" : " ") + t;
      }
    }
    d += s + (closed ? "z" : "");
  }
  return d;
}

// Run a shape through the map projection and collect the outline points (already cut to the picture's edges).
function project(projection, object) {
  const rings = [];
  let ring = null;
  const sink = {
    point(x, y) { ring.push([x, y]); },
    lineStart() { ring = []; },
    lineEnd() { if (ring.length) rings.push(ring); ring = null; },
    polygonStart() {}, polygonEnd() {}, sphere() {},
  };
  geoStream(object, projection.stream(sink));
  return rings;
}

function drawMap(code, island) {
  const parts = partsOf(numericOf(code));
  const frame = { type: "Feature", geometry: { type: "MultiPolygon", coordinates: framePolys(parts).map((p) => p.coordinates) } };
  const [lon, lat] = geoCentroid(frame);
  const projection = geoAzimuthalEqualArea().rotate([-lon, -lat]).clipAngle(150);
  projection.fitExtent([[W * (1 - FILL) / 2, H * (1 - FILL) / 2], [W * (1 + FILL) / 2, H * (1 + FILL) / 2]], frame);
  const fitted = projection.scale();
  const zoomTo = (scale) => {
    projection.scale(Math.min(fitted, scale)).translate([0, 0]).clipExtent(null);
    const [[x0, y0], [x1, y1]] = geoPath(projection).bounds(frame);
    projection.translate([W / 2 - (x0 + x1) / 2, H / 2 - (y0 + y1) / 2]).clipExtent([[-2, -2], [W + 2, H + 2]]);
  };
  zoomTo(MAX_SCALE);
  const tiny = geoPath(projection).area(frame) < TINY_AREA;
  if (tiny && island) zoomTo(ISLAND_SCALE);

  const others = shapes.filter((f) => !parts.includes(f));
  const land = pathText(others.flatMap((f) => project(projection, f)), true, SPECK_PX);
  const me = pathText(parts.flatMap((f) => project(projection, f)), true);
  const grid = pathText(project(projection, geoGraticule10()), false);

  // Small countries (or ones made of little islands) get a bright ring around them.
  const [[a0, b0], [a1, b1]] = geoPath(projection).bounds(frame);
  const ring = tiny
    ? `<circle cx="${num((a0 + a1) / 2)}" cy="${num((b0 + b1) / 2)}" r="${num(Math.min(46, Math.max(13, Math.hypot(a1 - a0, b1 - b0) / 2 + 8)))}" fill="${ME}" fill-opacity=".22" stroke="${ME}" stroke-width="3"/>`
    : "";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">` +
    `<rect width="${W}" height="${H}" fill="${SEA}"/>` +
    `<path d="${grid}" fill="none" stroke="${GRID}" stroke-width=".8"/>` +
    `<path d="${land}" fill="${LAND}" stroke="${SEA}" stroke-width=".8" stroke-linejoin="round"/>` +
    ring +
    `<path d="${me}" fill="${ME}" stroke="${ME_EDGE}" stroke-width="1.2" stroke-linejoin="round"/>` +
    `</svg>`;
  return { svg, tiny };
}

// ---------- build them all ----------
mkdirSync(OUT_IMG, { recursive: true });
const MAPS = {};
const missing = [];
let bytes = 0, biggest = ["", 0];
for (const c of COUNTRIES) {
  if (!partsOf(numericOf(c.code)).length) { missing.push(c.code); continue; }
  const near = neighboursOf(c.code);
  const { svg, tiny } = drawMap(c.code, near.length === 0);
  const file = createHash("sha256").update(SALT + ":" + c.code).digest("hex").slice(0, 10) + ".svg";
  writeFileSync(join(OUT_IMG, file), svg);
  bytes += svg.length;
  if (svg.length > biggest[1]) biggest = [c.code, svg.length];
  MAPS[c.code] = { img: "/m/" + file, tiny, near };
}

// Tidy up maps for countries that are no longer in the list.
const keep = new Set(Object.values(MAPS).map((m) => m.img.slice(3)));
for (const f of readdirSync(OUT_IMG)) if (!keep.has(f)) unlinkSync(join(OUT_IMG, f));

const lines = Object.entries(MAPS).map(([code, m]) => `  ${code}: ${JSON.stringify(m)},`);
writeFileSync(OUT_DATA, `// AUTO-GENERATED by scripts/build-maps.mjs from Natural Earth (public domain) via world-atlas.
// Don't edit by hand: change the script and run \`npm run build:maps\` instead.
// img = the map picture, tiny = drawn with a circle around it, near = land neighbours (longest border first).
export const MAPS = {
${lines.join("\n")}
};
`);

const onDisk = readdirSync(OUT_IMG).reduce((s, f) => s + statSync(join(OUT_IMG, f)).size, 0);
console.log(`Maps: ${Object.keys(MAPS).length} countries, ${(onDisk / 1e6).toFixed(2)} MB on disk, biggest ${biggest[0]} ${(biggest[1] / 1024).toFixed(1)} KB.`);
console.log(`Tiny (circled): ${Object.entries(MAPS).filter(([, m]) => m.tiny).map(([c]) => c).join(" ")}`);
console.log(`Island countries (no land neighbours): ${Object.entries(MAPS).filter(([, m]) => !m.near.length).map(([c]) => c).join(" ")}`);
if (missing.length) console.log(`No shape for: ${missing.join(" ")}`);
