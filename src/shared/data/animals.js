// 🐾 ANIMAL FACTS TABLE - one row per animal. The Animal Kingdom topic makes questions from it
// (baby names, group names, "which one is a mammal?"), the same way the flag questions come from country data.
//
//   name, plural   "Kangaroo", "kangaroos"
//   emoji          shown on screen (null if there isn't one)
//   cls            mammal | bird | reptile | amphibian | fish | insect | arachnid | mollusc | crustacean | other
//   kind           what to call an "other" animal ("sea star")
//   baby: [main name, ...other names that are also right]     bl = how hard (1 easy, 2 medium, 3 hard)
//   group: [main name, ...other names that are also right]    gl = how hard
//   trick: true    surprises people ("a whale is a mammal, not a fish!")
//   note           a fun fact shown with this animal's questions
//
// The "...also right" names matter: they stop a right answer ever showing up as a wrong choice.
// Want to add an animal? Copy a row, and double-check the facts in a book or on a trusted website first.

export const ANIMALS = [
  // ---------- mammals ----------
  { name: "Kangaroo", plural: "kangaroos", emoji: "🦘", cls: "mammal", baby: ["joey"], bl: 1, group: ["mob", "troop", "herd", "court"], gl: 2,
    note: "A baby kangaroo is as small as a jelly bean when it's born, and grows up in its mum's pouch." },
  { name: "Koala", plural: "koalas", emoji: "🐨", cls: "mammal", baby: ["joey"], bl: 2,
    note: "Koalas are marsupials like kangaroos, so their babies grow up in a pouch too." },
  { name: "Lion", plural: "lions", emoji: "🦁", cls: "mammal", baby: ["cub", "whelp"], bl: 1, group: ["pride"], gl: 1 },
  { name: "Tiger", plural: "tigers", emoji: "🐯", cls: "mammal", baby: ["cub", "whelp"], bl: 1,
    note: "Tigers are the biggest cats in the world, and they love swimming." },
  { name: "Bear", plural: "bears", emoji: "🐻", cls: "mammal", baby: ["cub"], bl: 1, group: ["sleuth", "sloth"], gl: 3 },
  { name: "Panda", plural: "pandas", emoji: "🐼", cls: "mammal", baby: ["cub"], bl: 1, group: ["embarrassment", "sleuth", "sloth"], gl: 3,
    note: "Giant pandas usually live on their own, so seeing a group of them is rare!" },
  { name: "Fox", plural: "foxes", emoji: "🦊", cls: "mammal", baby: ["kit", "cub", "pup"], bl: 2, group: ["skulk", "leash", "earth"], gl: 3,
    note: "Just like Rufus! Foxes are part of the dog family." },
  { name: "Wolf", plural: "wolves", emoji: "🐺", cls: "mammal", baby: ["pup", "cub", "whelp", "puppy"], bl: 2, group: ["pack"], gl: 1 },
  { name: "Dog", plural: "dogs", emoji: "🐶", cls: "mammal", baby: ["puppy", "pup", "whelp"], bl: 1, group: ["pack"], gl: 1 },
  { name: "Cat", plural: "cats", emoji: "🐱", cls: "mammal", baby: ["kitten", "kit"], bl: 1, group: ["clowder", "glaring", "clutter"], gl: 3 },
  { name: "Cow", plural: "cows", emoji: "🐮", cls: "mammal", baby: ["calf"], bl: 1, group: ["herd", "mob"], gl: 1 },
  { name: "Horse", plural: "horses", emoji: "🐴", cls: "mammal", baby: ["foal", "colt", "filly"], bl: 2, group: ["herd", "team", "string"], gl: 1 },
  { name: "Zebra", plural: "zebras", emoji: "🦓", cls: "mammal", baby: ["foal", "colt", "filly"], bl: 2, group: ["dazzle", "zeal", "herd"], gl: 3,
    note: "No two zebras have exactly the same stripes." },
  { name: "Sheep", plural: "sheep", emoji: "🐑", cls: "mammal", baby: ["lamb"], bl: 1, group: ["flock", "herd", "mob"], gl: 1 },
  { name: "Goat", plural: "goats", emoji: "🐐", cls: "mammal", baby: ["kid", "kidling"], bl: 1, group: ["herd", "tribe", "trip", "flock"], gl: 2 },
  { name: "Pig", plural: "pigs", emoji: "🐷", cls: "mammal", baby: ["piglet", "shoat"], bl: 1 },
  { name: "Deer", plural: "deer", emoji: "🦌", cls: "mammal", baby: ["fawn", "calf", "kid"], bl: 2, group: ["herd"], gl: 1 },
  { name: "Elephant", plural: "elephants", emoji: "🐘", cls: "mammal", baby: ["calf"], bl: 2, group: ["herd", "parade"], gl: 1,
    note: "Elephant herds are led by the oldest and wisest grandma elephant." },
  { name: "Giraffe", plural: "giraffes", emoji: "🦒", cls: "mammal", baby: ["calf"], bl: 2, group: ["tower", "herd", "journey"], gl: 3,
    note: "A baby giraffe is already about as tall as a grown-up person when it's born." },
  { name: "Whale", plural: "whales", emoji: "🐳", cls: "mammal", trick: true, baby: ["calf"], bl: 2, group: ["pod", "school", "gam", "herd"], gl: 2,
    note: "Whales breathe air and feed their babies milk, so they're mammals, not fish!" },
  { name: "Dolphin", plural: "dolphins", emoji: "🐬", cls: "mammal", trick: true, baby: ["calf", "pup"], bl: 2, group: ["pod", "school", "team"], gl: 2,
    note: "Dolphins breathe air through a blowhole on top of their head. They're mammals!" },
  { name: "Seal", plural: "seals", emoji: "🦭", cls: "mammal", baby: ["pup", "calf", "whelp"], bl: 2, group: ["colony", "rookery", "herd", "harem", "bob", "pod"], gl: 3 },
  { name: "Bat", plural: "bats", emoji: "🦇", cls: "mammal", trick: true, baby: ["pup"], bl: 3, group: ["colony", "cloud", "camp"], gl: 2,
    note: "Bats are the only mammals that can really fly." },
  { name: "Hippo", plural: "hippos", emoji: "🦛", cls: "mammal", baby: ["calf"], bl: 2, group: ["bloat", "pod", "herd", "school"], gl: 3,
    note: "Hippos spend most of the day in water to keep their skin cool." },
  { name: "Rhino", plural: "rhinos", emoji: "🦏", cls: "mammal", baby: ["calf"], bl: 2, group: ["crash", "herd"], gl: 3,
    note: "A rhino's horn is made of keratin, the same stuff as your fingernails." },
  { name: "Monkey", plural: "monkeys", emoji: "🐒", cls: "mammal", group: ["troop", "barrel", "tribe", "band"], gl: 2 },
  { name: "Gorilla", plural: "gorillas", emoji: "🦍", cls: "mammal", group: ["troop", "band"], gl: 2 },
  { name: "Otter", plural: "otters", emoji: "🦦", cls: "mammal", baby: ["pup", "kit", "whelp", "cub"], bl: 2, group: ["raft", "romp", "family", "bevy", "lodge"], gl: 3,
    note: "Sea otters sometimes hold paws while they sleep, or wrap themselves in seaweed, so they don't drift apart." },
  { name: "Camel", plural: "camels", emoji: "🐫", cls: "mammal", baby: ["calf"], bl: 2, group: ["caravan", "herd", "flock", "train"], gl: 3 },
  { name: "Llama", plural: "llamas", emoji: "🦙", cls: "mammal", baby: ["cria"], bl: 3, group: ["herd", "flock"], gl: 2 },
  { name: "Hedgehog", plural: "hedgehogs", emoji: "🦔", cls: "mammal", baby: ["hoglet", "piglet", "pup"], bl: 3, group: ["array", "prickle"], gl: 3 },
  { name: "Beaver", plural: "beavers", emoji: "🦫", cls: "mammal", baby: ["kit", "kitten", "pup"], bl: 3, group: ["colony", "family", "lodge"], gl: 3 },
  { name: "Mouse", plural: "mice", emoji: "🐭", cls: "mammal", baby: ["pup", "pinkie", "kitten"], bl: 3, group: ["mischief", "nest", "horde", "colony"], gl: 3 },
  { name: "Squirrel", plural: "squirrels", emoji: "🐿️", cls: "mammal", baby: ["kit", "kitten", "pup"], bl: 3, group: ["scurry", "dray"], gl: 3 },
  { name: "Leopard", plural: "leopards", emoji: "🐆", cls: "mammal", baby: ["cub"], bl: 1, group: ["leap", "prowl"], gl: 3 },
  { name: "Rabbit", plural: "rabbits", emoji: "🐰", cls: "mammal", baby: ["kit", "kitten", "bunny", "kitling"], bl: 2 },
  { name: "Skunk", plural: "skunks", emoji: "🦨", cls: "mammal", baby: ["kit"], bl: 3 },
  { name: "Raccoon", plural: "raccoons", emoji: "🦝", cls: "mammal", baby: ["kit", "cub"], bl: 3 },
  { name: "Platypus", plural: "platypuses", emoji: null, cls: "mammal", trick: true,
    note: "The platypus is a mammal that lays eggs!" },
  { name: "Echidna", plural: "echidnas", emoji: null, cls: "mammal", trick: true, baby: ["puggle"], bl: 3,
    note: "Echidnas are spiky mammals that lay eggs, just like the platypus. A baby echidna grows up in its mum's pouch." },
  { name: "Badger", plural: "badgers", emoji: "🦡", cls: "mammal", baby: ["cub", "kit"], bl: 2, group: ["cete", "clan", "colony"], gl: 3,
    note: "Badgers live in big underground homes called setts, with lots of tunnels and rooms." },
  { name: "Hare", plural: "hares", emoji: null, cls: "mammal", baby: ["leveret"], bl: 3, group: ["husk", "drove", "down"], gl: 3,
    note: "Baby hares are born with fur and their eyes open, ready to go. Baby rabbits are born with no fur and their eyes shut!" },
  { name: "Porcupine", plural: "porcupines", emoji: null, cls: "mammal", baby: ["porcupette", "pup"], bl: 3, group: ["prickle"], gl: 3,
    note: "A porcupine's quills are special hairs. Baby porcupettes are born with soft quills that harden soon after they're born." },
  { name: "Sloth", plural: "sloths", emoji: "🦥", cls: "mammal", note: "Sloths spend almost their whole lives hanging upside down in the trees." },
  { name: "Orangutan", plural: "orangutans", emoji: "🦧", cls: "mammal", note: "Orangutans build a fresh leafy nest high up in the trees to sleep in, almost every night." },
  { name: "Bison", plural: "bison", emoji: "🦬", cls: "mammal", baby: ["calf"], bl: 2, group: ["herd"], gl: 1 },
  { name: "Mammoth", plural: "mammoths", emoji: "🦣", cls: "mammal",
    note: "Woolly mammoths were hairy cousins of elephants that lived in the Ice Age." },

  // ---------- birds ----------
  { name: "Penguin", plural: "penguins", emoji: "🐧", cls: "bird", trick: true, baby: ["chick", "nestling", "hatchling"], bl: 1,
    group: ["waddle", "colony", "rookery", "huddle", "raft", "creche", "flock"], gl: 3,
    note: "Penguins can't fly, but they're birds: they have feathers and lay eggs." },
  { name: "Owl", plural: "owls", emoji: "🦉", cls: "bird", baby: ["owlet", "chick", "hatchling"], bl: 2, group: ["parliament", "stare", "flock"], gl: 3 },
  { name: "Eagle", plural: "eagles", emoji: "🦅", cls: "bird", baby: ["eaglet", "chick", "hatchling"], bl: 2, group: ["convocation", "aerie", "flock"], gl: 3 },
  { name: "Duck", plural: "ducks", emoji: "🦆", cls: "bird", baby: ["duckling", "chick", "hatchling"], bl: 1, group: ["paddling", "raft", "team", "flock", "brace", "badling", "herd"], gl: 3 },
  { name: "Swan", plural: "swans", emoji: "🦢", cls: "bird", baby: ["cygnet", "chick", "hatchling"], bl: 2, group: ["bevy", "wedge", "flock", "game", "herd"], gl: 3 },
  { name: "Goose", plural: "geese", emoji: null, cls: "bird", baby: ["gosling", "chick", "hatchling"], bl: 2, group: ["gaggle", "skein", "flock", "wedge"], gl: 1 },
  { name: "Chicken", plural: "chickens", emoji: "🐔", cls: "bird", baby: ["chick", "peep", "poult", "hatchling"], bl: 1, group: ["flock", "brood", "peep"], gl: 1 },
  { name: "Flamingo", plural: "flamingos", emoji: "🦩", cls: "bird", baby: ["chick", "hatchling"], bl: 2, group: ["flamboyance", "flock", "stand", "colony"], gl: 3,
    note: "Flamingos are pink because of the food they eat. Their chicks are grey!" },
  { name: "Parrot", plural: "parrots", emoji: "🦜", cls: "bird", baby: ["chick", "hatchling"], bl: 2, group: ["pandemonium", "company", "flock"], gl: 3 },
  { name: "Turkey", plural: "turkeys", emoji: "🦃", cls: "bird", baby: ["poult", "chick", "hatchling"], bl: 3, group: ["rafter", "gang", "flock"], gl: 3 },
  { name: "Starling", plural: "starlings", emoji: null, cls: "bird", group: ["murmuration", "chattering", "flock"], gl: 3,
    note: "Thousands of starlings can swoop and swirl together in the evening sky. These amazing shapes are called murmurations." },
  { name: "Hummingbird", plural: "hummingbirds", emoji: null, cls: "bird", group: ["charm", "bouquet", "glittering", "shimmer", "hover"], gl: 3 },
  { name: "Pigeon", plural: "pigeons", emoji: null, cls: "bird", baby: ["squab", "squeaker", "chick", "hatchling"], bl: 3 },
  { name: "Dodo", plural: "dodos", emoji: "🦤", cls: "bird", trick: true,
    note: "Dodos were big birds that couldn't fly. They lived on the island of Mauritius and died out over 300 years ago." },
  { name: "Peacock", plural: "peacocks", emoji: "🦚", cls: "bird", baby: ["peachick", "chick", "poult", "hatchling"], bl: 3, group: ["muster", "ostentation", "pride", "party", "flock"], gl: 3,
    note: "Only the boys (peacocks) have the giant fan of tail feathers. The girls are called peahens." },

  // ---------- reptiles ----------
  { name: "Snake", plural: "snakes", emoji: "🐍", cls: "reptile", baby: ["snakelet", "hatchling", "neonate"], bl: 2, group: ["nest", "den", "bed", "pit"], gl: 3,
    note: "Some snakes hatch from eggs and some are born alive, depending on the kind of snake." },
  { name: "Crocodile", plural: "crocodiles", emoji: "🐊", cls: "reptile", baby: ["hatchling"], bl: 2, group: ["bask", "float", "congregation"], gl: 3,
    note: "Crocodile mums carry their babies gently in their mouths down to the water." },
  { name: "Turtle", plural: "turtles", emoji: "🐢", cls: "reptile", trick: true, baby: ["hatchling"], bl: 2, group: ["bale", "turn", "dole"], gl: 3,
    note: "Turtles are reptiles, not amphibians! They have scaly skin, breathe with lungs from the day they hatch, and even sea turtles lay their eggs on land." },
  { name: "Lizard", plural: "lizards", emoji: "🦎", cls: "reptile", baby: ["hatchling"], bl: 2, group: ["lounge"], gl: 3 },

  // ---------- amphibians ----------
  { name: "Frog", plural: "frogs", emoji: "🐸", cls: "amphibian", baby: ["tadpole", "froglet", "polliwog"], bl: 1,
    note: "Most frogs start life as tadpoles in water, then grow legs and hop onto land." },
  { name: "Toad", plural: "toads", emoji: null, cls: "amphibian", baby: ["tadpole", "toadlet", "polliwog"], bl: 2 },
  { name: "Newt", plural: "newts", emoji: null, cls: "amphibian", baby: ["eft", "tadpole", "larva"], bl: 3 },
  { name: "Axolotl", plural: "axolotls", emoji: null, cls: "amphibian", trick: true },

  // ---------- fish ----------
  { name: "Shark", plural: "sharks", emoji: "🦈", cls: "fish", trick: true, baby: ["pup", "cub"], bl: 2, group: ["shiver", "school", "shoal", "frenzy"], gl: 3,
    note: "Sharks are fish, even though some are huge. Their skeletons are made of bendy cartilage, not bone." },
  { name: "Fish", plural: "fish", emoji: "🐟", cls: "fish", noPick: true, baby: ["fry", "fingerling", "larva", "hatchling"], bl: 3, group: ["school", "shoal"], gl: 1 },
  { name: "Pufferfish", plural: "pufferfish", emoji: "🐡", cls: "fish", note: "A pufferfish can blow itself up like a spiky balloon." },
  { name: "Eel", plural: "eels", emoji: null, cls: "fish", trick: true, baby: ["elver", "glass eel", "larva", "fry"], bl: 3,
    note: "Eels look a bit like snakes, but they're fish! They breathe with gills and have fins." },
  { name: "Salmon", plural: "salmon", emoji: null, cls: "fish", note: "Salmon swim all the way back up rivers to the stream where they hatched." },
  { name: "Goldfish", plural: "goldfish", emoji: null, cls: "fish" },
  { name: "Clownfish", plural: "clownfish", emoji: null, cls: "fish", note: "Clownfish live safely among the stinging arms of sea anemones." },
  { name: "Seahorse", plural: "seahorses", emoji: null, cls: "fish", trick: true, note: "Seahorses are fish, and it's the dads who carry the eggs!" },

  // ---------- insects (6 legs) ----------
  { name: "Bee", plural: "bees", emoji: "🐝", cls: "insect", group: ["swarm", "hive", "colony", "grist", "nest"], gl: 1 },
  { name: "Ant", plural: "ants", emoji: "🐜", cls: "insect", group: ["colony", "army", "nest", "swarm"], gl: 1 },
  { name: "Butterfly", plural: "butterflies", emoji: "🦋", cls: "insect", baby: ["caterpillar", "larva"], bl: 1, group: ["kaleidoscope", "flutter", "swarm", "rabble"], gl: 3 },
  { name: "Ladybug", plural: "ladybugs", emoji: "🐞", cls: "insect", group: ["loveliness", "swarm"], gl: 3, note: "In Britain, ladybugs are called ladybirds." },
  { name: "Cricket", plural: "crickets", emoji: "🦗", cls: "insect", group: ["orchestra", "swarm"], gl: 3, note: "Crickets chirp by rubbing their wings together." },
  { name: "Mosquito", plural: "mosquitoes", emoji: "🦟", cls: "insect" },
  { name: "Beetle", plural: "beetles", emoji: "🪲", cls: "insect" },

  // ---------- not insects, even though people think so! ----------
  { name: "Spider", plural: "spiders", emoji: "🕷️", cls: "arachnid", trick: true, baby: ["spiderling"], bl: 3,
    note: "Spiders have 8 legs, so they're arachnids, not insects. Insects have 6 legs." },
  { name: "Scorpion", plural: "scorpions", emoji: "🦂", cls: "arachnid", trick: true },
  { name: "Octopus", plural: "octopuses", emoji: "🐙", cls: "mollusc", trick: true, note: "An octopus has three hearts and blue blood!" },
  { name: "Snail", plural: "snails", emoji: "🐌", cls: "mollusc" },
  { name: "Squid", plural: "squid", emoji: "🦑", cls: "mollusc" },
  { name: "Crab", plural: "crabs", emoji: "🦀", cls: "crustacean", trick: true },
  { name: "Lobster", plural: "lobsters", emoji: "🦞", cls: "crustacean" },
  { name: "Shrimp", plural: "shrimp", emoji: "🦐", cls: "crustacean" },
  { name: "Starfish", plural: "starfish", emoji: null, cls: "other", kind: "sea star", trick: true, note: "Starfish aren't fish at all! Scientists call them sea stars." },
  { name: "Jellyfish", plural: "jellyfish", emoji: null, cls: "other", kind: "jelly", trick: true, group: ["bloom", "smack", "swarm"], gl: 3, note: "Jellyfish aren't fish either. They have no brain, no heart and no bones!" },
];

// What makes each group special (shown after "which one is a mammal?" questions).
export const CLASSES = {
  mammal: { label: "Mammal", emoji: "🐾", what: "Mammals have hair or fur and feed their babies milk." },
  bird: { label: "Bird", emoji: "🪶", what: "Birds have feathers and lay eggs (even the ones that can't fly)." },
  reptile: { label: "Reptile", emoji: "🦎", what: "Reptiles have dry, scaly skin, and most of them lay eggs." },
  amphibian: { label: "Amphibian", emoji: "🐸", what: "Most amphibians start life in water, and many can live on land when they grow up." },
  fish: { label: "Fish", emoji: "🐟", what: "Fish live in water, breathe with gills and usually have fins." },
  insect: { label: "Insect", emoji: "🐞", what: "Insects have 6 legs and 3 body parts." },
  arachnid: { label: "Arachnid", emoji: "🕷️", what: "Arachnids, like spiders and scorpions, have 8 legs." },
};
