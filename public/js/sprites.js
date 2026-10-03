// Pixel-art characters from Arvind's game, Adventures of Rufus (rufusfamily.com).
// Copied from the game's canvas drawing code (every fillRect became a little square in an SVG path),
// so they look exactly like they do in the game. Generated once; edit by hand if a sprite changes.
//   box: [x, y, width, height] of the picture; layers: [colour, path] painted in order.

export const SPRITES = {
  rufus: {
    box: [0, 0, 32, 32],
    layers: [
      ["#D2691E", "M8 12h16v12h-16zM10 4h14v12h-14zM10 0h4v6h-4zM20 0h4v6h-4z"],
      ["#A0522D", "M11 1h2v4h-2zM21 1h2v4h-2z"],
      ["#F4A460", "M12 16h10v6h-10z"],
      ["#000", "M13 7h3v3h-3zM19 7h3v3h-3z"],
      ["#FFF", "M14 7h1v1h-1zM20 7h1v1h-1z"],
      ["#000", "M16 10h2v2h-2z"],
      ["#FFF", "M12 13h2v2h-2zM14 12h2v2h-2zM16 13h2v2h-2zM18 12h2v2h-2zM20 13h2v2h-2z"],
      ["#8B4513", "M10 24h4v6h-4zM20 24h4v6h-4z"],
      ["#5C3317", "M10 28h4v4h-4zM20 28h4v4h-4z"],
      ["#D2691E", "M2 14h6v4h-6zM0 12h4v4h-4z"],
      ["#FFFFFF", "M0 12h3v4h-3z"],
    ],
  },
  marthina: {
    box: [-2, 0, 38, 34],
    layers: [
      ["#E8A040", "M6 12h22v14h-22zM4 14h26v10h-26z"],
      ["#FFF8F0", "M10 14h14v10h-14zM8 16h18v6h-18z"],
      ["#E8A040", "M8 2h18v14h-18zM6 4h22v10h-22z"],
      ["#FFF8F0", "M12 8h10v8h-10zM10 10h14v4h-14z"],
      ["#E8A040", "M9 0h5v5h-5zM22 0h5v5h-5z"],
      ["#D4883A", "M10 1h3v3h-3zM23 1h3v3h-3z"],
      ["#2D5A1E", "M13 6h3v3h-3zM20 6h3v3h-3z"],
      ["#FFF", "M14 6h2v1h-2zM21 6h2v1h-2z"],
      ["#FF9999", "M16 10h2v2h-2z"],
      ["#D4883A", "M14 12h2v1h-2zM16 13h2v1h-2zM18 12h2v1h-2z"],
      ["#FFCCAA", "M10 9h2v2h-2zM24 9h2v2h-2z"],
      ["#D4883A", "M10 26h5v6h-5zM21 26h5v6h-5z"],
      ["#FFF8F0", "M10 30h5v2h-5zM21 30h5v2h-5z"],
      ["#E8A040", "M0 12h6v6h-6zM-2 10h6v6h-6z"],
      ["#FFF8F0", "M-2 10h4v6h-4z"],
    ],
  },
  renard: {
    box: [0, 0, 32, 32],
    layers: [
      ["#B85C2A", "M8 12h16v12h-16zM10 4h14v12h-14zM10 0h4v6h-4zM20 0h4v6h-4z"],
      ["#333", "M10 0h4v2h-4zM20 0h4v2h-4z"],
      ["#8B4513", "M11 1h2v4h-2zM21 1h2v4h-2z"],
      ["#DEB887", "M12 16h10v6h-10z"],
      ["#000", "M13 7h3v3h-3zM19 7h3v3h-3z"],
      ["#333", "M12 5h4v2h-4zM19 5h4v2h-4zM13 6h2v1h-2zM21 6h2v1h-2z"],
      ["#FFF", "M14 7h1v1h-1zM20 7h1v1h-1z"],
      ["#000", "M16 10h2v2h-2z"],
      ["#8B4513", "M13 13h2v1h-2zM15 14h4v1h-4zM19 13h2v1h-2z"],
      ["#6B3410", "M10 24h4v6h-4zM20 24h4v6h-4z"],
      ["#333", "M10 28h4v4h-4zM20 28h4v4h-4z"],
      ["#B85C2A", "M2 14h6v4h-6zM0 12h4v4h-4z"],
      ["#FFF", "M0 12h3v4h-3z"],
    ],
  },
  felix: {
    box: [0, 0, 34, 34],
    layers: [
      ["#B5732E", "M8 12h18v13h-18zM9 3h16v13h-16zM8 0h5v7h-5zM21 0h5v7h-5z"],
      ["#E23B2E", "M9 1h3v5h-3z"],
      ["#8BC34A", "M22 1h3v5h-3z"],
      ["#FFF8F0", "M12 8h10v8h-10zM14 6h6v4h-6z"],
      ["#000", "M13 6h3v3h-3zM19 6h3v3h-3z"],
      ["#FFF", "M14 6h1v1h-1zM20 6h1v1h-1z"],
      ["#111", "M16 11h3v3h-3z"],
      ["#8B4513", "M14 14h2v1h-2zM16 15h3v1h-3zM19 14h1v1h-1z"],
      ["#F5872B", "M13 15h9v9h-9z"],
      ["#FFF8F0", "M4 14h5v9h-5z"],
      ["#8BC34A", "M25 14h5v9h-5z"],
      ["#5FA030", "M25 16h5v1h-5zM25 19h5v1h-5z"],
      ["#8BC34A", "M11 25h5v7h-5zM19 25h5v7h-5z"],
      ["#5FA030", "M11 27h5v1h-5zM19 27h5v1h-5z"],
      ["#E23B2E", "M11 30h5v2h-5zM19 30h5v2h-5z"],
      ["#B5732E", "M2 13h6v6h-6z"],
      ["#FFF8F0", "M0 12h4v5h-4z"],
    ],
  },
  fiery: {
    box: [-4, -2, 36, 36],
    layers: [
      ["#CC3300", "M8 12h16v14h-16z"],
      ["#FFAA66", "M11 14h10v10h-10z"],
      ["#FF9955", "M11 16h10v1h-10zM11 19h10v1h-10zM11 22h10v1h-10z"],
      ["#CC3300", "M6 0h20v14h-20z"],
      ["#AA2200", "M6 8h20v6h-20z"],
      ["#FFF", "M8 8h2v3h-2zM12 8h2v3h-2zM16 8h2v3h-2zM20 8h2v3h-2zM24 8h2v3h-2zM10 11h2v2h-2zM14 11h2v2h-2zM18 11h2v2h-2zM22 11h2v2h-2z"],
      ["#FFD700", "M10 3h4v4h-4zM20 3h4v4h-4z"],
      ["#000", "M11 4h2v2h-2zM21 4h2v2h-2z"],
      ["#FFF", "M12 4h1v1h-1zM22 4h1v1h-1z"],
      ["#CC3300", "M4 16h4v3h-4zM24 16h4v3h-4z"],
      ["#AA2200", "M3 18h2v2h-2zM26 18h2v2h-2zM9 26h6v8h-6zM19 26h6v8h-6z"],
      ["#882200", "M9 30h6v4h-6zM19 30h6v4h-6z"],
      ["#FF4400", "M14 -2h4v3h-4zM10 0h3v2h-3zM19 0h3v2h-3z"],
      ["#CC3300", "M0 18h8v5h-8zM-2 20h6v4h-6zM-4 22h4v3h-4z"],
      ["#FF4400", "M0 18h8v1h-8zM-2 20h6v1h-6z"],
      ["#AA2200", "M-4 23h3v2h-3z"],
    ],
  },
  bookworm: {
    box: [0, 0, 20, 12],
    layers: [
      ["#8B6914", "M2 4h16v6h-16z"],
      ["#A0792C", "M4 4h3v6h-3zM9 4h3v6h-3zM14 4h3v6h-3z"],
      ["#6B4E0A", "M0 2h5v8h-5z"],
      ["#FF0000", "M1 4h2v2h-2z"],
      ["#6B4E0A", "M1 0h1v3h-1zM3 0h1v3h-1z"],
      ["#A0792C", "M17 5h3v3h-3z"],
    ],
  },
  treat: {
    box: [0, 0, 16, 16],
    layers: [
      ["#FF4444", "M4 4h8v8h-8zM2 6h12v4h-12zM6 2h4v12h-4z"],
      ["#FF8888", "M5 5h2v2h-2z"],
      ["#228B22", "M7 0h3v4h-3zM10 1h2v2h-2z"],
    ],
  },
  paw: {
    box: [0, 0, 20, 20],
    layers: [
      ["#FFF8B0", "M4 3h12v14h-12z"],
      ["#FFD700", "M6 10h8v6h-8zM5 11h10v4h-10zM4 5h4v4h-4zM8 3h4v4h-4zM12 5h4v4h-4z"],
      ["#FFFFFF", "M7 11h2v2h-2zM5 6h1v1h-1zM9 4h1v1h-1zM13 6h1v1h-1z"],
      ["#FFF8B0", "M1 1h2v2h-2zM17 1h2v2h-2zM1 17h2v2h-2zM17 17h2v2h-2z"],
      ["#DAA520", "M6 16h8v1h-8zM4 9h1v1h-1zM15 9h1v1h-1z"],
    ],
  },
  gem: {
    box: [0, 0, 16, 16],
    layers: [
      ["#00CED1", "M6 2h4v2h-4zM4 4h8v2h-8zM2 6h12v4h-12zM4 10h8v2h-8zM6 12h4v2h-4z"],
      ["#7FFFD4", "M5 5h3v3h-3zM7 3h2v2h-2z"],
      ["#FFFFFF", "M6 5h1v1h-1zM8 3h1v1h-1z"],
      ["#008B8B", "M2 9h12v1h-12zM6 13h4v1h-4z"],
    ],
  },
  squirrel: {
    box: [0, 0, 24, 24],
    layers: [
      ["#808080", "M6 8h12v10h-12zM8 2h10v8h-10z"],
      ["#696969", "M8 0h3v4h-3zM15 0h3v4h-3z"],
      ["#FF0000", "M10 4h2v2h-2zM15 4h2v2h-2z"],
      ["#A0A0A0", "M0 4h6v10h-6zM2 2h4v4h-4z"],
      ["#555", "M8 18h4v4h-4zM14 18h4v4h-4z"],
    ],
  },
  wasp: {
    box: [0, 0, 24, 20],
    layers: [
      ["RGBA(200, 220, 255, 0.6)", "M4 0h6v8h-6z"],
      ["RGBA(200, 220, 255, 0.6)", "M14 0h6v8h-6z"],
      ["RGBA(200, 220, 255, 0.6)", "M2 2h4v4h-4z"],
      ["RGBA(200, 220, 255, 0.6)", "M18 2h4v4h-4z"],
      ["#FFD700", "M6 6h12v10h-12z"],
      ["#222", "M6 8h12v2h-12z"],
      ["#FFD700", "M6 10h12v2h-12z"],
      ["#222", "M6 12h12v2h-12z"],
      ["#FFD700", "M6 14h12v2h-12zM8 4h8v4h-8z"],
      ["#FF0000", "M9 5h2v2h-2zM13 5h2v2h-2z"],
      ["#222", "M10 16h4v2h-4zM11 18h2v2h-2z"],
    ],
  },
  clown: {
    box: [0, 0, 28, 28],
    layers: [
      ["#DD2222", "M4 0h20v10h-20zM2 2h24v8h-24zM6 0h16v4h-16z"],
      ["#FFFFFF", "M6 8h16v12h-16zM8 6h12v14h-12z"],
      ["#FF0000", "M11 12h6v5h-6zM12 11h4v7h-4z"],
      ["#000000", "M9 10h3v3h-3zM16 10h3v3h-3z"],
      ["#FFFFFF", "M10 10h1v1h-1zM17 10h1v1h-1z"],
      ["#FF4444", "M9 17h10v2h-10zM10 16h8v1h-8z"],
      ["#4488FF", "M8 20h12v6h-12z"],
      ["#FFFF00", "M10 21h2v2h-2zM16 22h2v2h-2z"],
      ["#FF6600", "M4 26h8v2h-8zM16 26h8v2h-8z"],
    ],
  },
};

// An <svg> string for one sprite. Crisp edges keep the pixels sharp at any size.
export function spriteSVG(name, label = "") {
  const s = SPRITES[name] || SPRITES.rufus;
  const paths = s.layers.map(([c, d]) => `<path fill="${c}" d="${d}"/>`).join("");
  const a11y = label ? `role="img" aria-label="${label}"` : `aria-hidden="true"`;
  return `<svg class="sprite" viewBox="${s.box.join(" ")}" shape-rendering="crispEdges" ${a11y}>${paths}</svg>`;
}
