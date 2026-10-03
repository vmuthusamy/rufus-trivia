// 🗺️ LANDMARKS - the list the build script turns into quiz data.
//
// To add a landmark: add its English Wikipedia article title (exactly as it appears
// at the top of the Wikipedia page) to LANDMARK_LIST, then run:
//     npm run build:landmarks
// The script looks it up on Wikidata (country, description, how famous it is) and
// downloads a photo from Wikimedia Commons with the photographer's credit.
// It ALSO discovers extra famous UNESCO World Heritage Sites on its own, so the
// list grows every time it runs. Anything you don't want goes in SKIP.

export const LANDMARK_LIST = [
  // Europe
  "Eiffel Tower", "Arc de Triomphe", "Louvre", "Notre-Dame de Paris", "Palace of Versailles", "Mont-Saint-Michel",
  "Big Ben", "Tower Bridge", "Tower of London", "Buckingham Palace", "Stonehenge", "Edinburgh Castle", "Giant's Causeway",
  "Cliffs of Moher", "Colosseum", "Leaning Tower of Pisa", "Trevi Fountain", "St. Peter's Basilica", "Pantheon, Rome",
  "Florence Cathedral", "Rialto Bridge", "St Mark's Basilica", "Pompeii", "Mount Vesuvius", "Sagrada Família", "Alhambra",
  "Neuschwanstein Castle", "Brandenburg Gate", "Cologne Cathedral", "Matterhorn", "Atomium", "Manneken Pis",
  "The Little Mermaid (statue)", "Charles Bridge", "Hallgrímskirkja", "Parthenon", "Acropolis of Athens", "Hagia Sophia",
  "Saint Basil's Cathedral", "Moscow Kremlin", "Red Square", "Sultan Ahmed Mosque", "Dubrovnik", "Belém Tower",
  // Asia
  "Great Wall of China", "Forbidden City", "Terracotta Army", "Potala Palace", "Taj Mahal", "Gateway of India",
  "Golden Temple", "Qutb Minar", "India Gate", "Hawa Mahal", "Lotus Temple", "Charminar", "Mysore Palace",
  "Meenakshi Temple", "Victoria Memorial, Kolkata", "Mount Fuji", "Himeji Castle", "Fushimi Inari-taisha", "Tokyo Tower",
  "Tokyo Skytree", "Itsukushima Shrine", "Gyeongbokgung", "Angkor Wat", "Borobudur", "Shwedagon Pagoda", "Bagan",
  "Wat Arun", "Grand Palace", "Hạ Long Bay", "Petronas Towers", "Marina Bay Sands", "Merlion", "Burj Khalifa",
  "Burj Al Arab", "Sheikh Zayed Grand Mosque", "Petra", "Mount Everest", "Paro Taktsang", "Sigiriya",
  // Africa
  "Great Pyramid of Giza", "Great Sphinx of Giza", "Abu Simbel", "Karnak", "Valley of the Kings", "Victoria Falls",
  "Mount Kilimanjaro", "Table Mountain", "Hassan II Mosque", "Great Mosque of Djenné",
  "Avenue of the Baobabs", "Church of Saint George, Lalibela", "Ngorongoro Conservation Area",
  // North America
  "Statue of Liberty", "Empire State Building", "Chrysler Building", "Times Square", "Golden Gate Bridge",
  "Hollywood Sign", "Space Needle", "Gateway Arch", "Lincoln Memorial", "Washington Monument", "White House",
  "United States Capitol", "Mount Rushmore", "Alcatraz Island", "Grand Canyon", "Niagara Falls", "Old Faithful",
  "CN Tower", "Château Frontenac", "Chichen Itza", "Teotihuacan", "Panama Canal",
  // South America
  "Machu Picchu", "Christ the Redeemer (statue)", "Sugarloaf Mountain", "Iguazu Falls", "Angel Falls",
  "Salar de Uyuni", "Perito Moreno Glacier", "Moai", "Galápagos Islands",
  // Oceania
  "Sydney Opera House", "Sydney Harbour Bridge", "Uluru", "Great Barrier Reef", "Twelve Apostles (Victoria)",
  "Milford Sound", "Sky Tower (Auckland)",
];

// Wikipedia titles to leave out, even if the discovery step finds them.
// (Sad places and places people argue about don't belong in a kids' party game.)
export const SKIP = new Set([
  "Auschwitz concentration camp", "Al-Aqsa Mosque", "Dome of the Rock", "Old City of Jerusalem", "Robben Island",
  "Hiroshima Peace Memorial", "Bikini Atoll", "Island of Gorée", "Heard Island and McDonald Islands", "Vatican City",
  "Church of the Nativity",
  "Grand Canyon National Park", // same place as "Grand Canyon" - two of them could show up as answers together
]);

// Friendlier names than Wikidata's official ones (key = the Wikipedia title in the list).
export const NAMES = {
  "Sagrada Família": "Sagrada Família",
  "Moai": "Moai statues",
  "Golden Temple": "Golden Temple",
  "Borobudur": "Borobudur",
  "Louvre": "The Louvre",
  "Great Sphinx of Giza": "Great Sphinx of Giza",
  "Karnak": "Karnak Temple",
  "Milford Sound": "Milford Sound",
  "Iguazu Falls": "Iguazu Falls",
  "Burj Al Arab": "Burj Al Arab",
  "Sheikh Zayed Grand Mosque": "Sheikh Zayed Grand Mosque",
  "Mont-Saint-Michel": "Mont-Saint-Michel",
  "Church of Saint George, Lalibela": "Church of Saint George, Lalibela",
  "Moscow Kremlin": "Moscow Kremlin",
  "Sultan Ahmed Mosque": "Blue Mosque",
};

// Hand-checked fun facts, keyed by the Wikipedia title above.
// Landmarks without one get a fact built from Wikidata's description.
export const LANDMARK_FACTS = {
  "Eiffel Tower": "It was built for the 1889 World's Fair and was the tallest structure in the world for over 40 years.",
  "Statue of Liberty": "It was a gift from France to the United States. It turned green because its copper skin weathered over time.",
  "Great Wall of China": "It's thousands of kilometres long, but you can't actually see it from space with just your eyes!",
  "Taj Mahal": "Emperor Shah Jahan built it in memory of his wife, Mumtaz Mahal.",
  "Colosseum": "Almost 2,000 years ago, tens of thousands of Romans packed in here to watch shows.",
  "Machu Picchu": "This Inca city sits high up in the Andes mountains of Peru.",
  "Great Pyramid of Giza": "It was the tallest human-made structure in the world for more than 3,800 years!",
  "Christ the Redeemer (statue)": "This giant statue looks out over Rio de Janeiro from the top of Corcovado mountain.",
  "Sydney Opera House": "Its roof is said to look like the sails of boats in Sydney Harbour.",
  "Big Ben": "Big Ben is actually the name of the giant bell inside the clock tower!",
  "Leaning Tower of Pisa": "It started leaning while it was still being built, because the ground underneath was too soft.",
  "Stonehenge": "These giant stones were put in place thousands of years ago, and nobody knows exactly why.",
  "Mount Everest": "It's the highest mountain above sea level on Earth.",
  "Grand Canyon": "The Colorado River carved this giant canyon over millions of years.",
  "Niagara Falls": "It sits right on the border between Canada and the United States.",
  "Mount Fuji": "It's Japan's tallest mountain, and it's actually a volcano!",
  "Petra": "This ancient city was carved right into pink-red rock cliffs.",
  "Chichen Itza": "At the spring and autumn equinoxes, shadows make it look like a snake is sliding down the pyramid's steps!",
  "Angkor Wat": "It's the largest religious monument in the world, and it's on Cambodia's flag!",
  "Sagrada Família": "Building started in 1882, and work on it has gone on for more than 140 years!",
  "Burj Khalifa": "It's the tallest building in the world, at more than 800 metres!",
  "Golden Gate Bridge": "Its famous colour is called International Orange.",
  "Mount Rushmore": "It shows the faces of four US presidents carved into a mountain.",
  "Moai": "Many of these giant stone heads on Easter Island actually have bodies buried underground!",
  "Saint Basil's Cathedral": "It's famous for its colourful onion-shaped domes.",
  "Neuschwanstein Castle": "This fairy-tale castle is said to have inspired Disney's Sleeping Beauty Castle.",
  "Victoria Falls": "Locals call it 'The Smoke that Thunders' because of its huge clouds of spray.",
  "Great Barrier Reef": "It's the world's largest coral reef system.",
  "Forbidden City": "Emperors of China lived here for about 500 years.",
  "Parthenon": "It's a temple for the goddess Athena, built more than 2,400 years ago.",
  "Hagia Sophia": "In its 1,500-year history it has been a church, a mosque and a museum.",
  "Brandenburg Gate": "It stood right next to the Berlin Wall, and today it's a symbol of a united Germany.",
  "CN Tower": "For more than 30 years it was the tallest free-standing structure in the world.",
  "Tower Bridge": "The road lifts up in the middle to let tall ships sail through.",
  "Arc de Triomphe": "Twelve big avenues meet around it in a giant star shape.",
  "Mount Kilimanjaro": "It's Africa's tallest mountain, and it has snow on top even though it's near the equator.",
  "Uluru": "This giant red rock is sacred to the Aboriginal Anangu people.",
  "Table Mountain": "It has a flat top, and the clouds that spill over it are called the 'tablecloth'.",
  "Matterhorn": "Its pointy shape is so famous it used to be on Toblerone chocolate boxes.",
};
