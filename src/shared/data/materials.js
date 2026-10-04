// 🧲 EVERYDAY SCIENCE TABLE - the "Magnet test", "Sink or float?", "Circuit test", "Natural or made?"
// and "Solid, liquid or gas?" questions in Science & Space are made from these rows (see topics/science-makers.js).
//
// THINGS: everyday objects you could test at home or school.
//   mag    true = a magnet picks it up · false = it doesn't
//   float  true = floats in plain water · false = sinks
//   elec   true = lets electricity through (a conductor) · false = keeps it out (an insulator)
//   Leave a test OUT when the answer is "it depends" (a steel paperclip can sit on top of water if you're
//   very careful; some plastics float and some sink). Then that thing is never used for that test.
//   metal  true for metals: "Which metal does NOT stick?" only uses these
//   lv     how hard (1 easy, 2 medium, 3 hard); can be one number, or { mag: 3, elec: 1 } per test
//   trick  tests where the answer surprises people (aluminium isn't magnetic; ebony sinks)
//   many   true for a name that means lots of things ("Iron filings stick", not "sticks")
//   notes  one fun fact per test. A thing can only be the RIGHT answer for a test it has a note for.

export const THINGS = [
  // ---------- metals ----------
  { id: "nail", name: "An iron nail", metal: true, mag: true, float: false, elec: true, lv: 1,
    notes: { mag: "Iron is one of only a few magnetic metals. Nickel and cobalt are magnetic too.",
      float: "Iron is nearly 8 times as heavy as the same amount of water, so a nail drops straight to the bottom.",
      elec: "All metals let electricity through, but copper does it much better than iron. That's why wires are made of copper." } },
  { id: "clip", name: "A steel paperclip", metal: true, mag: true, elec: true, lv: 1,
    notes: { mag: "Steel is made mostly of iron, which is why a magnet can pick up a whole chain of paperclips!",
      elec: "A paperclip can bridge a gap in a circuit, like a tiny metal switch." } },
  { id: "tin", name: "A steel food tin", metal: true, mag: true, lv: 2,
    notes: { mag: "Recycling centres use giant magnets to pull steel tins out from the aluminium drinks cans!" } },
  { id: "pin", name: "A steel safety pin", metal: true, mag: true, elec: true, lv: 2,
    notes: { mag: "Stroke a steel pin with a magnet lots of times, always the same way, and the pin can become a magnet too!" } },
  { id: "filings", name: "Iron filings", many: true, metal: true, mag: true, lv: 2,
    notes: { mag: "Sprinkle iron filings around a magnet and they line up to show the invisible pattern of its magnetic field." } },
  { id: "foil", name: "Aluminium foil", metal: true, mag: false, elec: true, lv: { mag: 3, elec: 2 }, trick: ["mag"],
    notes: { mag: "Aluminium is a metal, but it isn't magnetic, so a magnet won't pick up foil or drinks cans.",
      elec: "Aluminium is a good conductor. Many big power lines carry electricity on aluminium wires, because it's so light." } },
  { id: "copper", name: "A copper wire", metal: true, mag: false, float: false, elec: true, lv: { mag: 3, elec: 1, float: 1 }, trick: ["mag"],
    notes: { mag: "Copper isn't magnetic, but drop a strong magnet down a copper pipe and it falls in slow motion!",
      elec: "Copper is one of the best conductors there is, so it's inside almost every plug and cable." } },
  { id: "gold", name: "A gold ring", metal: true, mag: false, float: false, elec: true, lv: { mag: 3, float: 1, elec: 2 }, trick: ["mag"],
    notes: { mag: "Gold isn't magnetic. If a 'gold' ring sticks to a magnet, it can't be pure gold!",
      float: "Gold is about 19 times as heavy as the same amount of water.",
      elec: "Gold is a brilliant conductor that never goes rusty, so tiny bits of it are used inside phones and computers." } },
  { id: "silver", name: "A real silver spoon", metal: true, mag: false, float: false, elec: true, lv: { mag: 3, float: 1, elec: 2 }, trick: ["mag"],
    notes: { mag: "Real silver isn't magnetic at all.",
      elec: "Silver is the best conductor of electricity of all the metals!" } },
  { id: "brass", name: "A brass key", metal: true, mag: false, float: false, elec: true, lv: { mag: 3, float: 1, elec: 2 }, trick: ["mag"],
    notes: { mag: "Brass is a mix of copper and zinc, and neither of those is magnetic.",
      elec: "Brass lets electricity through, so it's used for the pins inside many plugs." } },

  // ---------- not metals ----------
  { id: "graphite", name: "Pencil 'lead'", mag: false, elec: true, lv: 3, trick: ["elec"],
    notes: { elec: "Pencil 'lead' isn't lead at all: it's graphite, a kind of carbon that can carry electricity!" } },
  { id: "saltwater", name: "Salty water", mag: false, elec: true, lv: 3, trick: ["elec"],
    notes: { elec: "Pure water hardly lets electricity through, but stir in some salt and it carries electricity well." } },
  { id: "spoon", name: "A wooden spoon", mag: false, float: true, elec: false, lv: 1,
    notes: { float: "Most wood floats because it's full of tiny spaces filled with air.",
      elec: "Wood keeps heat out too, so a wooden spoon's handle stays cool in a hot pan." } },
  { id: "cork", name: "A cork", mag: false, float: true, elec: false, lv: 1,
    notes: { float: "Cork comes from the bark of the cork oak tree. It's so light that it's used to make fishing floats." } },
  { id: "ruler", name: "A plastic ruler", mag: false, elec: false, lv: 1,
    notes: { elec: "Plastic is a great insulator. Rub a plastic ruler on your jumper and its static can pick up tiny bits of paper!" } },
  { id: "band", name: "A rubber band", mag: false, elec: false, lv: 1,
    notes: { elec: "Rubber is such a good insulator that electricians wear rubber gloves to stay safe." } },
  { id: "marble", name: "A glass marble", mag: false, float: false, elec: false, lv: 1,
    notes: { float: "Glass is about two and a half times as heavy as the same amount of water.",
      elec: "Glass keeps electricity out but lets light through, which makes it perfect for light bulbs." } },
  { id: "mug", name: "A china mug", mag: false, elec: false, lv: 2,
    notes: { elec: "Big power lines are often held up by china or glass insulators, so electricity can't leak into the poles." } },
  { id: "pingpong", name: "A ping-pong ball", mag: false, float: true, elec: false, lv: 1,
    notes: { float: "A ping-pong ball weighs only about 2.7 grams, and it's full of air." } },
  { id: "ebony", name: "A block of ebony wood", mag: false, float: false, elec: false, lv: 3, trick: ["float"],
    notes: { float: "Ebony is one of the few woods so heavy for its size that it sinks!" } },
  { id: "pebble", name: "A pebble", mag: false, float: false, lv: 1,
    notes: { float: "Most rocks are between two and three times as heavy as the same amount of water." } },
  { id: "apple", name: "An apple", mag: false, float: true, lv: 2,
    notes: { float: "About a quarter of an apple is air. That's why you can play bobbing for apples!" } },
  { id: "egg", name: "A fresh egg", mag: false, float: false, lv: 3, trick: ["float"],
    notes: { float: "An old egg can float, though: as it ages, water escapes through its shell and the air pocket inside grows bigger." } },
  { id: "potato", name: "A potato", mag: false, float: false, lv: 2,
    notes: { float: "Stir lots of salt into the water and a potato will float! Salty water pushes up harder." } },
  { id: "ice", name: "An ice cube", mag: false, float: true, lv: 1,
    notes: { float: "Ice floats, so ponds freeze from the top down, and fish can keep swimming in the water underneath." } },
  { id: "candle", name: "A candle", mag: false, float: true, lv: 2,
    notes: { float: "Candle wax is a little lighter than water, which is how floating candles bob on the surface." } },
  { id: "brick", name: "A brick", mag: false, float: false, lv: 1,
    notes: { float: "Some old Roman bricks have pawprints in them, from dogs and cats that walked over the clay while it was soft!" } },
  { id: "plasticine", name: "A ball of plasticine", mag: false, float: false, lv: 2,
    notes: { float: "Squash the same plasticine into a boat shape and it floats! The wide shape pushes aside more water." } },
  { id: "duck", name: "A rubber duck", mag: false, float: true, lv: 1,
    notes: { float: "In 1992, thousands of bath toys fell off a ship into the Pacific. Scientists tracked where they floated to learn about ocean currents!" } },
  { id: "balsa", name: "A balsa wood stick", mag: false, float: true, lv: 2,
    notes: { float: "Balsa is one of the lightest woods in the world, which is why it's used for model planes." } },
  { id: "coconut", name: "A coconut", mag: false, float: true, lv: 2,
    notes: { float: "Coconuts can float across oceans and still grow into new palm trees when they wash up on a beach." } },
];

// Natural (comes from plants, animals or the ground) or made by people?
// Only clear-cut ones: rubber and paper are left out, because people argue about them.
export const MATERIALS = [
  { id: "wool", name: "Wool", natural: true, lv: 1, note: "Wool is a sheep's fleece. A sheep grows a new woolly coat every year." },
  { id: "cotton", name: "Cotton", natural: true, lv: 1, note: "Cotton grows as fluffy balls around the seeds of the cotton plant." },
  { id: "silk", name: "Silk", natural: true, lv: 2, note: "Silk is spun by silkworms, which are really moth caterpillars, to make their cocoons." },
  { id: "wood", name: "Wood", natural: true, lv: 1, note: "Wood is mostly made of a tough stuff called cellulose, which helps trees stand tall." },
  { id: "stone", name: "Stone", natural: true, lv: 1, note: "Granite, slate and marble are all natural stones, cut from the ground to make buildings." },
  { id: "bamboo", name: "Bamboo", natural: true, lv: 2, note: "Some kinds of bamboo can grow almost a metre in a single day!" },
  { id: "sand", name: "Sand", natural: true, lv: 2, note: "Most beach sand is tiny bits of rock and shell, worn down by waves over a very long time." },
  { id: "plastic", name: "Plastic", natural: false, lv: 1, note: "Most plastic is made from oil. It can take hundreds of years to break down, so recycling it helps." },
  { id: "glass", name: "Glass", natural: false, lv: 2, note: "Glass is made by melting sand in a super-hot furnace. People were making it more than 4,000 years ago, in ancient Mesopotamia." },
  { id: "nylon", name: "Nylon", natural: false, lv: 2, note: "Nylon was invented in the 1930s. Some of the first things made from it were toothbrush bristles!" },
  { id: "polyester", name: "Polyester", natural: false, lv: 3, note: "Lots of fleece jackets are made of polyester, and some are made from recycled plastic bottles!" },
  { id: "concrete", name: "Concrete", natural: false, lv: 2, note: "The ancient Romans built with concrete. The Pantheon's concrete dome in Rome is almost 2,000 years old!" },
  { id: "steel", name: "Steel", natural: false, lv: 2, note: "Steel is made mostly from iron, with a little carbon mixed in to make it stronger." },
  { id: "brick", name: "Brick", natural: false, lv: 2, note: "Bricks are made from clay, baked hard in a very hot oven called a kiln." },
];

// Solid, liquid or gas at room temperature (about 20°C)?
export const STATES = {
  solid: { emoji: "🧊", what: "A solid keeps its own shape." },
  liquid: { emoji: "💧", what: "A liquid flows and takes the shape of its container." },
  gas: { emoji: "💨", what: "A gas spreads out to fill all the space it can." },
};
export const SUBSTANCES = [
  // gases
  { id: "oxygen", name: "Oxygen", state: "gas", lv: 2, note: "Oxygen has no colour, but cool it to about −183°C and it turns into a pale blue liquid!" },
  { id: "helium", name: "Helium", state: "gas", lv: 2, note: "Helium is so light that some of it slowly escapes from Earth's air into space." },
  { id: "co2", name: "Carbon dioxide", state: "gas", lv: 2, note: "Frozen carbon dioxide is called dry ice. It turns straight from a solid into a gas, without melting!" },
  { id: "nitrogen", name: "Nitrogen", state: "gas", lv: 3, note: "Chefs sometimes use super-cold liquid nitrogen to make ice cream in seconds!" },
  { id: "neon", name: "Neon", state: "gas", lv: 3, note: "Neon glows bright red-orange when electricity passes through it, which is why it's used in glowing signs." },
  { id: "hydrogen", name: "Hydrogen", state: "gas", lv: 3, note: "Hydrogen is the lightest and most common element in the whole universe." },
  // liquids
  { id: "milk", name: "Milk", state: "liquid", lv: 1, note: "Milk is mostly water: about 87% of it!" },
  { id: "honey", name: "Honey", state: "liquid", lv: 2, note: "Honey is a thick, slow-flowing liquid. Scientists call thick liquids 'viscous'." },
  { id: "oil", name: "Olive oil", state: "liquid", lv: 1, note: "Oil floats on top of water, because it's lighter and the two don't mix." },
  { id: "vinegar", name: "Vinegar", state: "liquid", lv: 1, note: "Vinegar is a weak acid. That's what gives it its sour taste." },
  { id: "mercury", name: "Mercury", state: "liquid", lv: 3, note: "Mercury freezes at about −39°C, so somewhere very cold it can turn solid." },
  { id: "water", name: "Water", state: "liquid", lv: 1, note: "Water is the only common substance found naturally on Earth as a solid, a liquid and a gas." },
  // solids
  { id: "salt", name: "Salt", state: "solid", lv: 1, note: "Salt is made of tiny cube-shaped crystals. Look closely with a magnifying glass!" },
  { id: "sand", name: "Sand", state: "solid", lv: 3, note: "Sand can be poured like a liquid, but each grain is a tiny solid that keeps its shape." },
  { id: "sugar", name: "Sugar", state: "solid", lv: 1, note: "Heat sugar and it melts into a golden liquid. That's how caramel is made." },
  { id: "chocolate", name: "Chocolate", state: "solid", lv: 1, note: "Chocolate melts at about 34°C, just below body temperature, so it melts in your mouth." },
  { id: "iron", name: "Iron", state: "solid", lv: 1, note: "Iron has to be heated to about 1,538°C before it melts." },
  { id: "gold", name: "Gold", state: "solid", lv: 2, note: "Gold can be hammered into sheets so thin that light shines through them. It's called gold leaf." },
  { id: "wax", name: "Candle wax", state: "solid", lv: 2, note: "When a candle burns, the wax melts and then turns into a gas, and it's the gas that burns!" },
];
