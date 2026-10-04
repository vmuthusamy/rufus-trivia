// 🏆 ANIMAL RECORDS TABLE - numbers for "Which of these is the fastest / heaviest / lives the longest?"
// The Animal Kingdom topic (see topics/animals.js) picks 4 animals whose numbers are FAR apart,
// so there's only ever one right answer.
//
// Every number is a RANGE [low, high], because real animals differ (boys and girls, wild and zoo...):
//   speed  [low, high]  top running speed on land, in km/h
//   weight [low, high]  a grown-up's weight, in kg
//   life   [low, high]  how many years it can live (wild ... the oldest ones, often in zoos)
// A question only asks "which is the fastest?" when the winner's LOW number beats everyone else's
// HIGH number by a clear gap. So even the slowest cheetah beats the fastest lion... or they're not asked together!
// Leave a number out (or null) when trusted books don't agree.
//
//   plural  used in "Where do wild ___ live?"
//   where   the ONE continent where it lives in the wild (null if it's more than one, or a bit muddled)
//   diet    "plants" | "meat" | "both"  (null if it's a mix that would make a question unfair)
//   lv      1 = everyone knows it, 2 = most kids know it, 3 = a bit unusual
//
// Want to add an animal? Copy a row and check its numbers in two trusted places
// (a zoo, a museum, National Geographic, Britannica...). Then run `npm test`.

export const RECORDS = [
  // ---------- big and famous ----------
  { name: "Cheetah", plural: "cheetahs", emoji: "🐆", lv: 1, speed: [93, 104], weight: [21, 72], life: [8, 20], diet: "meat" },
  { name: "Lion", plural: "lions", emoji: "🦁", lv: 1, speed: [48, 70], weight: [110, 250], life: [10, 25], diet: "meat" },
  { name: "Tiger", plural: "tigers", emoji: "🐯", lv: 1, speed: [49, 65], weight: [65, 320], life: [10, 26], where: "Asia", diet: "meat" },
  { name: "African elephant", plural: "African elephants", emoji: "🐘", lv: 1, speed: [20, 35], weight: [2500, 7000], life: [50, 70], diet: "plants" },
  { name: "Giraffe", plural: "giraffes", emoji: "🦒", lv: 1, speed: [50, 60], weight: [700, 1900], life: [20, 30], where: "Africa", diet: "plants" },
  { name: "Zebra", plural: "zebras", emoji: "🦓", lv: 1, speed: [56, 70], weight: [175, 450], life: [20, 40], where: "Africa", diet: "plants" },
  { name: "Gorilla", plural: "gorillas", emoji: "🦍", lv: 1, speed: [32, 40], weight: [70, 230], life: [35, 60], where: "Africa" },
  { name: "Kangaroo", plural: "kangaroos", emoji: "🦘", lv: 1, speed: [50, 71], weight: [18, 90], life: [8, 23], where: "Oceania", diet: "plants" },
  { name: "Koala", plural: "koalas", emoji: "🐨", lv: 1, weight: [4, 15], life: [10, 20], where: "Oceania", diet: "plants" },
  { name: "Giant panda", plural: "giant pandas", emoji: "🐼", lv: 1, weight: [70, 160], life: [15, 38], where: "Asia" },
  { name: "Wolf", plural: "wolves", emoji: "🐺", lv: 1, speed: [50, 65], weight: [18, 80], life: [6, 16], diet: "meat" },
  { name: "Red fox", plural: "red foxes", emoji: "🦊", lv: 1, speed: [45, 50], weight: [2.2, 14], life: [2, 14], diet: "both" },
  { name: "Blue whale", plural: "blue whales", emoji: "🐳", lv: 1, weight: [50000, 200000], life: [70, 110], diet: "meat" },
  { name: "Hippo", plural: "hippos", emoji: "🦛", lv: 2, speed: [20, 40], weight: [1300, 4500], life: [40, 65] },
  { name: "White rhino", plural: "white rhinos", emoji: "🦏", lv: 2, speed: [40, 55], weight: [1700, 3600], life: [35, 50], where: "Africa", diet: "plants" },
  { name: "Polar bear", plural: "polar bears", emoji: "🐻‍❄️", lv: 2, speed: [30, 40], weight: [150, 800], life: [15, 30], diet: "meat" },
  { name: "Brown bear", plural: "brown bears", emoji: "🐻", lv: 2, speed: [48, 56], weight: [80, 600], life: [20, 35], diet: "both" },

  // ---------- farm, home and garden ----------
  { name: "Horse", plural: "horses", emoji: "🐴", lv: 1, speed: [44, 88], weight: [380, 1000], life: [25, 40], diet: "plants" },
  { name: "Cow", plural: "cows", emoji: "🐮", lv: 1, weight: [400, 1200], life: [15, 25], diet: "plants" },
  { name: "Pig", plural: "pigs", emoji: "🐷", lv: 1, weight: [50, 350], life: [15, 20], diet: "both" },
  { name: "Sheep", plural: "sheep", emoji: "🐑", lv: 2, weight: [35, 160], life: [10, 20], diet: "plants" },
  { name: "Pet cat", plural: "pet cats", emoji: "🐱", lv: 1, speed: [40, 48], weight: [2.5, 8], life: [12, 20], diet: "meat" },
  { name: "Mouse", plural: "mice", emoji: "🐭", lv: 1, speed: [8, 13], weight: [0.012, 0.03], life: [1, 3], diet: "both" },
  { name: "Squirrel", plural: "squirrels", emoji: "🐿️", lv: 2, speed: [20, 32], weight: [0.4, 0.72], life: [3, 20], diet: "both" },
  { name: "Chicken", plural: "chickens", emoji: "🐔", lv: 1, speed: [9, 15], weight: [1, 5], life: [5, 12], diet: "both" },
  { name: "Garden snail", plural: "garden snails", emoji: "🐌", lv: 1, speed: [0.003, 0.05], weight: [0.002, 0.015], diet: "plants" },

  // ---------- birds ----------
  { name: "Ostrich", plural: "ostriches", lv: 2, speed: [55, 70], weight: [60, 160], life: [30, 50], diet: "both" },
  { name: "Emperor penguin", plural: "emperor penguins", emoji: "🐧", lv: 2, weight: [20, 45], life: [15, 25], where: "Antarctica", diet: "meat" },
  { name: "Bald eagle", plural: "bald eagles", emoji: "🦅", lv: 2, weight: [3, 6.3], life: [20, 38], where: "North America", diet: "meat" },
  { name: "Hummingbird", plural: "hummingbirds", lv: 2, weight: [0.0016, 0.024], life: [3, 12] },
  { name: "Emu", plural: "emus", lv: 2, speed: [48, 50], weight: [18, 60], life: [10, 20], where: "Oceania", diet: "both" },
  { name: "Andean condor", plural: "Andean condors", lv: 3, weight: [7.5, 15], where: "South America", diet: "meat" },
  { name: "Kiwi", plural: "kiwis", lv: 3, weight: [1, 4], where: "Oceania", diet: "both" },

  // ---------- reptiles ----------
  { name: "Galápagos tortoise", plural: "Galápagos tortoises", emoji: "🐢", lv: 2, speed: [0.2, 0.5], weight: [35, 420], life: [100, 170], where: "South America", diet: "plants" },
  { name: "Saltwater crocodile", plural: "saltwater crocodiles", emoji: "🐊", lv: 2, speed: [12, 29], weight: [80, 1100], diet: "meat" },
  { name: "Komodo dragon", plural: "Komodo dragons", emoji: "🦎", lv: 2, speed: [16, 20], weight: [30, 166], life: [25, 50], where: "Asia", diet: "meat" },
  { name: "Green anaconda", plural: "green anacondas", emoji: "🐍", lv: 3, weight: [10, 100], diet: "meat" },

  // ---------- record breakers you might not know ----------
  { name: "Sloth", plural: "sloths", emoji: "🦥", lv: 2, speed: [0.1, 0.3], weight: [2, 9], life: [20, 40], diet: "plants" },
  { name: "Bowhead whale", plural: "bowhead whales", lv: 3, weight: [75000, 100000], life: [100, 200], diet: "meat" },
  { name: "Greenland shark", plural: "Greenland sharks", lv: 3, life: [250, 500], diet: "meat" },
  { name: "Pronghorn", plural: "pronghorns", lv: 3, speed: [80, 88], weight: [34, 65], life: [10, 15], where: "North America", diet: "plants" },
  { name: "American bison", plural: "American bison", emoji: "🦬", lv: 2, speed: [55, 65], weight: [320, 1000], life: [15, 25], diet: "plants" },
  { name: "Moose", plural: "moose", lv: 3, speed: [48, 56], weight: [200, 720], life: [15, 25], diet: "plants" },
  { name: "Asian elephant", plural: "Asian elephants", lv: 3, weight: [2000, 5500], life: [45, 70], diet: "plants" },
  { name: "Orangutan", plural: "orangutans", emoji: "🦧", lv: 2, weight: [30, 100], life: [35, 60], where: "Asia" },
  { name: "Red panda", plural: "red pandas", lv: 3, weight: [3, 6.2], life: [8, 15], where: "Asia" },
  { name: "Snow leopard", plural: "snow leopards", lv: 3, weight: [22, 55], life: [10, 22], where: "Asia", diet: "meat" },
  { name: "Okapi", plural: "okapis", lv: 3, weight: [200, 350], life: [20, 30], where: "Africa", diet: "plants" },
  { name: "Meerkat", plural: "meerkats", lv: 3, weight: [0.6, 1], life: [6, 14], where: "Africa" },
  { name: "Lemur", plural: "lemurs", lv: 3, where: "Africa" },
  { name: "Platypus", plural: "platypuses", lv: 3, weight: [0.7, 2.4], life: [10, 21], where: "Oceania", diet: "meat" },
  { name: "Wombat", plural: "wombats", lv: 3, weight: [20, 40], life: [5, 30], where: "Oceania", diet: "plants" },
  { name: "Tasmanian devil", plural: "Tasmanian devils", lv: 3, weight: [4, 14], life: [5, 8], where: "Oceania", diet: "meat" },
  { name: "Capybara", plural: "capybaras", lv: 3, weight: [35, 66], life: [8, 12], diet: "plants" },
];

// What Rufus says after "Where do wild ___ live?" (every animal with a `where` needs one; the tests check).
export const HOME_NOTES = {
  Giraffe: "Wild giraffes live in the savannas and woodlands of Africa.",
  Zebra: "Wild zebras live in the grasslands of eastern and southern Africa.",
  Gorilla: "Wild gorillas live in the rainforests of central Africa.",
  Tiger: "Wild tigers live in forests and grasslands across Asia, from India to Russia's far east.",
  Kangaroo: "Wild kangaroos live in Australia and New Guinea.",
  Koala: "Wild koalas live in the eucalyptus forests of eastern Australia.",
  "Giant panda": "Wild giant pandas live in misty bamboo forests in the mountains of China.",
  "White rhino": "Wild white rhinos live in the grasslands of Africa.",
  "Emperor penguin": "Emperor penguins raise their chicks on the sea ice around Antarctica, the coldest place on Earth.",
  "Bald eagle": "Bald eagles live in North America, from Alaska and Canada down to northern Mexico.",
  Emu: "Emus live only in Australia, and they're the second-tallest birds in the world after the ostrich.",
  "Andean condor": "Andean condors soar over the Andes mountains of South America on huge wings, about 3 metres across.",
  Kiwi: "Kiwis live only in New Zealand. They can't fly, and they sniff out food with nostrils at the tip of their beak!",
  "Galápagos tortoise": "Galápagos tortoises live on the Galápagos Islands, which belong to Ecuador in South America.",
  "Komodo dragon": "Komodo dragons live on a few islands in Indonesia, in Asia. They're the biggest lizards in the world.",
  Pronghorn: "Pronghorns live on the open plains of North America.",
  Orangutan: "Wild orangutans live in the rainforests of Borneo and Sumatra, in Asia.",
  "Red panda": "Red pandas live in mountain forests in Asia, from Nepal to China.",
  "Snow leopard": "Snow leopards live high in the mountains of Central Asia.",
  Okapi: "Okapis live in the rainforests of the Democratic Republic of the Congo, in Africa.",
  Meerkat: "Meerkats live in the dry lands of southern Africa.",
  Lemur: "Wild lemurs live only on Madagascar and a few tiny islands nearby, off the coast of Africa.",
  Platypus: "Platypuses live in the rivers and streams of eastern Australia, including Tasmania.",
  Wombat: "Wombats live only in Australia.",
  "Tasmanian devil": "Wild Tasmanian devils live only on the Australian island of Tasmania.",
};
