// 🪐 PLANETS & MOONS TABLE - the "Planet Patrol" questions in Science & Space are made from these rows
// (see topics/science-makers.js), the same way the flag questions come from country data.
//
// Numbers are from NASA's planet fact sheets (nssdc.gsfc.nasa.gov/planetary/factsheet).
//   order   place from the Sun (1 = closest)
//   km      how wide it is, in kilometres (its diameter at the equator)
//   kind    "rocky" | "gas" (gas giant) | "ice" (ice giant)
//   rings   true if it has rings (all four giants do!)
//   moons   false for the two planets with no moons at all. We never ask HOW MANY moons:
//           astronomers keep finding new ones, so the numbers keep changing.
//   spin    hours to spin round once (Venus and Mercury are super slow!)
//   spinSay how to say the spin out loud
//   notes   fun facts; one is picked for the answer
//
// Two planets that are almost the same (Earth and Venus are nearly the same size) are never
// asked about against each other: the question maker needs a clear winner (see GAP in science-makers.js).

export const PLANETS = [
  { name: "Mercury", order: 1, km: 4879, kind: "rocky", rings: false, moons: false, spin: 1407.6, spinSay: "about 59 Earth days",
    notes: ["Mercury has almost no air to hold in heat, so its nights drop to about −180°C.",
      "Mercury is the smallest planet, only a little bigger than our Moon."] },
  { name: "Venus", order: 2, km: 12104, kind: "rocky", rings: false, moons: false, spin: 5832.5, spinSay: "about 243 Earth days",
    notes: ["Venus spins the opposite way to most planets, so there the Sun rises in the west!",
      "Venus is nearly the same size as Earth, so it's sometimes called Earth's twin."] },
  { name: "Earth", order: 3, km: 12756, kind: "rocky", rings: false, moons: true, spin: 23.9, spinSay: "about 24 hours",
    notes: ["Earth is the only planet known to have life, and liquid water on its surface.",
      "Earth is the only planet whose name doesn't come from a Greek or Roman god."] },
  { name: "Mars", order: 4, km: 6792, kind: "rocky", rings: false, moons: true, spin: 24.6, spinSay: "about 24 and a half hours",
    notes: ["A day on Mars is only about 40 minutes longer than a day on Earth.",
      "Mars has two tiny moons, Phobos and Deimos, which are lumpy like potatoes."] },
  { name: "Jupiter", order: 5, km: 142984, kind: "gas", rings: true, moons: true, spin: 9.9, spinSay: "about 10 hours",
    notes: ["Jupiter spins faster than any other planet: a day there lasts only about 10 hours.",
      "Jupiter is more than twice as heavy as all the other planets put together!"] },
  { name: "Saturn", order: 6, km: 120536, kind: "gas", rings: true, moons: true, spin: 10.7, spinSay: "about 10 and a half hours",
    notes: ["Saturn's rings are hugely wide but very thin: in most places only about 10 metres thick.",
      "Saturn's biggest moon, Titan, has lakes and rivers, but they're full of liquid methane, not water."] },
  { name: "Uranus", order: 7, km: 51118, kind: "ice", rings: true, moons: true, spin: 17.2, spinSay: "about 17 hours",
    notes: ["Uranus was the first planet found with a telescope, by William Herschel in 1781, from his garden in Bath.",
      "Uranus looks blue-green because of methane gas in its air."] },
  { name: "Neptune", order: 8, km: 49528, kind: "ice", rings: true, moons: true, spin: 16.1, spinSay: "about 16 hours",
    notes: ["Neptune was found in 1846 using maths: astronomers worked out where it must be before anyone spotted it.",
      "Neptune's biggest moon, Triton, goes round it the opposite way to the way Neptune spins."] },
];

export const KINDS = {
  rocky: { label: "rocky planet", say: "a rocky planet", what: "The four planets closest to the Sun are small and rocky, with solid ground you could stand on." },
  gas: { label: "gas giant", say: "a gas giant", what: "Gas giants are made mostly of hydrogen and helium gas, with no solid ground to land on." },
  ice: { label: "ice giant", say: "an ice giant", what: "Ice giants are made mostly of icy stuff like water, methane and ammonia, under thick, cold air." },
};

// Moons (and Charon, which goes round the dwarf planet Pluto). km = how wide it is.
export const MOONS = [
  { name: "The Moon", planet: "Earth", km: 3475, lv: 1, note: "The Moon is slowly drifting away from Earth, by about 3.8 centimetres every year." },
  { name: "Phobos", planet: "Mars", km: 22.2, lv: 3, note: "Phobos whizzes around Mars three times every day!" },
  { name: "Deimos", planet: "Mars", km: 12.4, lv: 3, note: "Deimos is the smaller of Mars's two moons, only about 12 kilometres across: smaller than many cities!" },
  { name: "Io", planet: "Jupiter", km: 3643, lv: 2, note: "Io is the most volcanic place in the solar system, with hundreds of volcanoes." },
  { name: "Europa", planet: "Jupiter", km: 3122, lv: 2, note: "Scientists think Europa has a huge, salty ocean hidden under its icy crust." },
  { name: "Ganymede", planet: "Jupiter", km: 5268, lv: 3, note: "Ganymede is the biggest moon in the solar system. It's even wider than the planet Mercury!" },
  { name: "Callisto", planet: "Jupiter", km: 4821, lv: 3, note: "Callisto is one of the most cratered places in the whole solar system." },
  { name: "Titan", planet: "Saturn", km: 5150, lv: 2, note: "Titan is the only moon with thick air, and it has lakes of liquid methane." },
  { name: "Enceladus", planet: "Saturn", km: 504, lv: 3, note: "Enceladus shoots fountains of icy water out into space from cracks near its south pole." },
  { name: "Mimas", planet: "Saturn", km: 396, lv: 3, note: "Mimas has one giant crater that makes it look a bit like the Death Star from Star Wars!" },
  { name: "Titania", planet: "Uranus", km: 1578, lv: 3, note: "Titania is named after the fairy queen in Shakespeare's play A Midsummer Night's Dream." },
  { name: "Miranda", planet: "Uranus", km: 472, lv: 3, note: "Miranda has a cliff about 20 kilometres tall, one of the tallest known in the solar system." },
  { name: "Triton", planet: "Neptune", km: 2707, lv: 3, note: "Scientists think Triton was once a dwarf planet that got caught by Neptune's gravity." },
  { name: "Charon", planet: "Pluto", km: 1212, lv: 3, note: "Charon is so big compared with Pluto that the two spin around each other like dance partners." },
];

// The five dwarf planets that astronomers officially count.
export const DWARFS = [
  { name: "Pluto", lv: 1, note: "In 2015 the New Horizons spacecraft flew past Pluto and spotted a giant heart-shaped plain of ice." },
  { name: "Ceres", lv: 2, note: "Ceres is the biggest thing in the asteroid belt, between Mars and Jupiter." },
  { name: "Eris", lv: 3, note: "Eris is about as big as Pluto. Finding it in 2005 helped astronomers decide what a planet really is." },
  { name: "Haumea", lv: 3, note: "Haumea spins round once about every 4 hours, so fast that it's stretched into an egg shape!" },
  { name: "Makemake", lv: 3, note: "Makemake is named after the creator god of the people of Rapa Nui (Easter Island)." },
];
