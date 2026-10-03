// Makes the site icons from the same pixel-art fox face as rufusfamily.com's tab icon.
//
//   npm run build:icons
//
// Writes into public/:
//   favicon.svg            the crisp vector icon (modern browsers)
//   favicon.ico            16, 32 and 48 px versions in one file (every browser, bookmarks)
//   apple-touch-icon.png   180 px, for "Add to Home Screen" on iPhone/iPad
//   icon-192.png, icon-512.png + manifest.webmanifest  (Android / installable app)
// No image libraries needed: the fox is drawn pixel by pixel and saved as PNG with Node's zlib.

import { writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const out = join(dirname(fileURLToPath(import.meta.url)), "..", "public");

// The fox face on a 32x32 grid: [x, y, w, h, colour, cornerRadius]
const FOX = [
  [6, 0, 6, 8, "#D2691E"], [20, 0, 6, 8, "#D2691E"],            // ears
  [4, 6, 24, 18, "#D2691E", 4],                                   // head
  [8, 14, 16, 8, "#F4A460"],                                      // muzzle
  [10, 9, 4, 4, "#000"], [18, 9, 4, 4, "#000"],                   // eyes
  [11, 9, 2, 2, "#FFF"], [19, 9, 2, 2, "#FFF"],                   // eye shine
  [14, 13, 4, 3, "#000"],                                         // nose
  [9, 18, 3, 3, "#FFF"], [12, 17, 3, 3, "#FFF"], [15, 18, 3, 3, "#FFF"], [18, 17, 3, 3, "#FFF"], [21, 18, 3, 3, "#FFF"], // the grin!
];
const BG = "#0b0820"; // the game's night-sky colour, for app icons

const svg = (withBg) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${withBg ? "-6 -6 44 44" : "0 0 32 32"}" shape-rendering="crispEdges">`
  + (withBg ? `<rect x="-6" y="-6" width="44" height="44" fill="${BG}"/>` : "")
  + FOX.map(([x, y, w, h, c, r]) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"${r ? ` rx="${r}"` : ""}/>`).join("")
  + "</svg>\n";

const hex = (c) => {
  const s = c.replace("#", "");
  const f = s.length === 3 ? s.split("").map((ch) => ch + ch).join("") : s;
  return [parseInt(f.slice(0, 2), 16), parseInt(f.slice(2, 4), 16), parseInt(f.slice(4, 6), 16)];
};

function inside(px, py, [x, y, w, h, , r = 0]) {
  if (px < x || px >= x + w || py < y || py >= y + h) return false;
  if (!r) return true;
  const cx = Math.min(Math.max(px, x + r), x + w - r), cy = Math.min(Math.max(py, y + r), y + h - r);
  return (px - cx) ** 2 + (py - cy) ** 2 <= r * r;
}

// Draw at `size` pixels. pad = empty border (in grid units); bg = background colour or null for transparent.
function render(size, { pad = 0, bg = null } = {}) {
  const span = 32 + pad * 2, px = new Uint8Array(size * size * 4), SS = 4;
  for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
    let r = 0, g = 0, b = 0, a = 0;
    for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
      const gx = ((i + (sx + 0.5) / SS) / size) * span - pad, gy = ((j + (sy + 0.5) / SS) / size) * span - pad;
      let col = bg;
      for (const rect of FOX) if (inside(gx, gy, rect)) col = rect[4];
      if (col) { const [cr, cg, cb] = hex(col); r += cr; g += cg; b += cb; a += 255; }
    }
    const n = SS * SS, k = (j * size + i) * 4, cover = a / 255;
    px[k] = cover ? r / cover : 0; px[k + 1] = cover ? g / cover : 0; px[k + 2] = cover ? b / cover : 0; px[k + 3] = a / n;
  }
  return px;
}

// ---- tiny PNG writer ----
const CRC = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = (buf) => { let c = 0xffffffff; for (const byte of buf) c = CRC[(c ^ byte) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function png(size, opts) {
  const px = render(size, opts);
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) { raw[y * (size * 4 + 1)] = 0; Buffer.from(px.buffer, y * size * 4, size * 4).copy(raw, y * (size * 4 + 1) + 1); }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0))]);
}

// ---- .ico = a little directory of PNGs ----
function ico(sizes) {
  const pngs = sizes.map((s) => png(s));
  const head = Buffer.alloc(6 + 16 * sizes.length);
  head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(sizes.length, 4);
  let offset = head.length;
  sizes.forEach((s, i) => {
    const e = 6 + i * 16;
    head[e] = s >= 256 ? 0 : s; head[e + 1] = s >= 256 ? 0 : s; head[e + 2] = 0; head[e + 3] = 0;
    head.writeUInt16LE(1, e + 4); head.writeUInt16LE(32, e + 6);
    head.writeUInt32LE(pngs[i].length, e + 8); head.writeUInt32LE(offset, e + 12);
    offset += pngs[i].length;
  });
  return Buffer.concat([head, ...pngs]);
}

writeFileSync(join(out, "favicon.svg"), svg(false));
writeFileSync(join(out, "favicon.ico"), ico([16, 32, 48]));
writeFileSync(join(out, "apple-touch-icon.png"), png(180, { pad: 5, bg: BG }));
writeFileSync(join(out, "icon-192.png"), png(192, { pad: 5, bg: BG }));
writeFileSync(join(out, "icon-512.png"), png(512, { pad: 5, bg: BG }));
writeFileSync(join(out, "manifest.webmanifest"), JSON.stringify({
  name: "Rufus Trivia", short_name: "Rufus Trivia",
  description: "Flags, capitals, landmarks, space and maths trivia starring Rufus the fox.",
  start_url: "/", display: "standalone", background_color: BG, theme_color: BG,
  icons: [
    { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
    { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    { src: "/favicon.svg", sizes: "any", type: "image/svg+xml" },
  ],
}, null, 2) + "\n");
console.log("Wrote favicon.svg, favicon.ico (16/32/48), apple-touch-icon.png, icon-192.png, icon-512.png, manifest.webmanifest");
