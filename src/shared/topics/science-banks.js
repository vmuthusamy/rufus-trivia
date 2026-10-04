// 🔬 The science question banks inside "Science & Space" (see science.js for how they're mixed).
// level: 1 = easy, 2 = medium, 3 = hard. Facts must be true; when scientists aren't sure, say "scientists think".

import { bankTopic } from "../kit.js";

export const lab = bankTopic({
  id: "lab",
  title: "Science Lab",
  emoji: "🧪",
  eyebrow: "Science Lab",
  questions: [
    // --- Solids, liquids and gases ---
    { q: "What does water turn into when it freezes?", a: "Ice", wrong: ["Steam", "Salt", "Sand", "Glass"], level: 1, emoji: "🌡️",
      fact: "Water takes up about 9% more space when it freezes. That makes ice less dense than water, so it floats!" },
    { q: "Which state of matter keeps its own shape, even outside a container?", a: "Solid", wrong: ["Liquid", "Gas", "Steam"], level: 1, emoji: "🔬",
      fact: "A liquid takes the shape of its container, and a gas spreads out to fill all the space it can." },
    { q: "What is the glowing 'fourth state of matter' found in lightning and stars?", a: "Plasma", wrong: ["Jelly", "Crystal", "Foam", "Slime"], level: 3, emoji: "⚡",
      fact: "Scientists think most of the stuff we can see in the universe is plasma, because stars are made of it." },
    { q: "What is it called when a liquid turns into a gas?", a: "Evaporation", wrong: ["Condensation", "Freezing", "Melting", "Dissolving"], level: 2, emoji: "☀️",
      fact: "Sweat cools you down: as it evaporates off your skin, it carries some of your heat away." },
    { q: "What is it called when water vapour in the air turns back into drops?", a: "Condensation", wrong: ["Evaporation", "Melting", "Freezing", "Erosion"], level: 2, emoji: "🥤",
      fact: "That's why a cold drink gets wet on the outside on a warm day. Clouds form the same way, high in the sky!" },

    // --- Materials ---
    { q: "Which metal is a liquid at room temperature?", a: "Mercury", wrong: ["Iron", "Gold", "Copper", "Silver"], level: 3, emoji: "⚗️",
      fact: "Mercury is so dense that a lump of iron will float on top of it!" },
    { q: "Which of these is the hardest natural material?", a: "Diamond", wrong: ["Gold", "Granite", "Glass", "Iron"], level: 1, emoji: "🔨",
      fact: "Diamond is made of carbon, just like the soft graphite 'lead' in your pencil. Only the way the atoms join up is different!" },

    // --- Magnets ---
    { q: "Which of these will stick to a magnet?", a: "An iron nail", wrong: ["A wooden spoon", "A plastic cup", "A glass marble", "A rubber band"], level: 1, emoji: "🧲",
      fact: "Not all metals are magnetic! Aluminium cans, copper and gold don't stick to magnets." },
    { q: "What happens when you bring the north ends of two magnets close?", a: "They push apart", wrong: ["They stick together", "They change colour", "They get very hot", "They turn into one magnet"], level: 1, emoji: "🧲",
      fact: "Magnets can be super strong. Some fast trains, called maglev trains, use them to float above their track!" },
    { q: "A compass needle is a tiny magnet. Which way does it point?", a: "North", wrong: ["East", "West", "Towards the Sun"], level: 1, emoji: "🧭",
      fact: "It lines up with Earth's magnetism, which is made by hot, liquid iron swirling deep inside our planet." },
    { q: "Where on a bar magnet is the pull strongest?", a: "At both ends", wrong: ["Right in the middle", "Only at the north end", "It's the same all over"], level: 2, emoji: "🧲",
      fact: "The ends are called poles. Snap a magnet in half and each piece gets its own north and south pole!" },

    // --- Forces ---
    { q: "Which force slows things down when they rub against each other?", a: "Friction", wrong: ["Gravity", "Magnetism", "Electricity"], level: 1, emoji: "🛝",
      fact: "Rub your hands together fast and they get warm. That warmth comes from friction!" },
    { q: "What helps a parachute fall slowly?", a: "Air resistance", wrong: ["Magnetism", "Electricity", "Sunlight", "Sound waves"], level: 2, emoji: "🪂",
      fact: "Skydivers spread out like a starfish to fall more slowly, because more air pushes against them." },
    { q: "Which scientist is said to have wondered about gravity after seeing an apple fall?", a: "Isaac Newton", wrong: ["Charles Darwin", "Marie Curie", "Louis Pasteur", "Ada Lovelace"], level: 1, emoji: "🍎",
      fact: "An apple tree linked to the story still grows at Newton's childhood home, Woolsthorpe Manor in England." },
    { q: "In science, what do we call a push or a pull?", a: "A force", wrong: ["A circuit", "A material", "A liquid", "A shadow"], level: 1, emoji: "🛒",
      fact: "Forces can make things start, stop, speed up, slow down, change direction or even change shape, like squashing play dough!" },
    { q: "When a boat floats, what is the push from the water called?", a: "Upthrust", wrong: ["Friction", "Gravity", "Magnetism", "Static"], level: 3, emoji: "⛵",
      fact: "A huge steel ship floats because its hollow shape pushes aside lots of water, and the water pushes back up." },
    { q: "Why does a hot-air balloon rise?", a: "Hot air is lighter than cold", wrong: ["Cold air is lighter than hot", "The basket is magnetic", "The clouds pull it up"], level: 2, emoji: "🎈",
      fact: "The first passengers in a hot-air balloon, in 1783 in France, were a sheep, a duck and a rooster!" },

    // --- Light and shadows ---
    { q: "What forms when an object blocks light?", a: "A shadow", wrong: ["A rainbow", "An echo", "A reflection", "A magnet"], level: 1, emoji: "🔦",
      fact: "Shadows are longest in the morning and evening, when the Sun is low in the sky." },
    { q: "What is it called when light bounces off a shiny surface?", a: "Reflection", wrong: ["Refraction", "Evaporation", "Vibration", "Pollination"], level: 2, emoji: "✨",
      fact: "A periscope uses two mirrors to bounce light around corners, so you can peek over a wall." },
    { q: "Why does a straw look broken in a glass of water?", a: "Light bends at the surface", wrong: ["The water squashes it", "The straw goes soft", "The glass is magnetic"], level: 3, emoji: "🥛",
      fact: "This bending of light is called refraction. It also makes swimming pools look shallower than they really are!" },
    { q: "Why do we see lightning before we hear the thunder?", a: "Light is faster than sound", wrong: ["Sound is faster than light", "Thunder happens later", "Clouds hold the sound in"], level: 2, emoji: "⛈️",
      fact: "Count the seconds between the flash and the rumble. Every 3 seconds means the storm is about 1 kilometre away." },

    // --- Colours and rainbows ---
    { q: "How many colours are usually named in a rainbow?", a: "7", wrong: ["3", "5", "10", "12"], level: 1, emoji: "🌈",
      fact: "A rainbow is really a full circle! The ground usually hides the bottom half, but from a plane you can sometimes see it all." },
    { q: "To see a rainbow, where must the Sun be?", a: "Behind you", wrong: ["In front of you", "Right above your head", "Hidden behind clouds"], level: 2, emoji: "🌦️",
      fact: "Rainbows appear when sunlight shines into raindrops, which bend the light and split it into colours." },
    { q: "What colour do you get if you mix blue and yellow paint?", a: "Green", wrong: ["Purple", "Orange", "Pink", "Red"], level: 1, emoji: "🎨",
      fact: "Light mixes differently from paint: shine red, green and blue light together and you get white!" },
    { q: "In a normal rainbow, which colour runs along the outside edge?", a: "Red", wrong: ["Violet", "Green", "Blue", "Yellow"], level: 3, emoji: "🌈",
      fact: "In a double rainbow, the second, fainter bow has its colours the other way round!" },

    // --- Sound ---
    { q: "All sounds are made by things doing what?", a: "Vibrating", wrong: ["Melting", "Glowing", "Shrinking", "Freezing"], level: 1, emoji: "🥁",
      fact: "Touch your throat gently while you hum. You can feel your vocal cords buzzing!" },
    { q: "Sound travels fastest through which of these?", a: "Steel", wrong: ["Air", "Water", "Empty space"], level: 3, emoji: "🔊",
      fact: "Sound zips through steel more than 15 times faster than through air. In empty space there's no sound at all!" },
    { q: "What is an echo?", a: "A sound bouncing back", wrong: ["A sound that never ends", "A sound only dogs hear", "A sound made by wind"], level: 1, emoji: "⛰️",
      fact: "Bats and dolphins make clicks and listen to the echoes to find their way. It's called echolocation." },
    { q: "What do we call how high or low a sound is?", a: "Pitch", wrong: ["Volume", "Echo", "Speed", "Shadow"], level: 2, emoji: "🎸",
      fact: "A short, tight guitar string vibrates faster and makes a higher note than a long, loose one." },
    { q: "Which unit do we use to measure how loud a sound is?", a: "Decibels", wrong: ["Kilograms", "Metres", "Volts", "Degrees"], level: 3, emoji: "📢",
      fact: "A quiet whisper is about 30 decibels, and normal talking is about 60 to 70." },

    // --- Electricity ---
    { q: "For a bulb in a circuit to light up, the circuit must be...?", a: "Complete, with no gaps", wrong: ["Broken in the middle", "Wet all over", "Kept very cold", "Upside down"], level: 1, emoji: "💡",
      fact: "A switch works by opening or closing a gap in the circuit. Off makes a gap; on closes it." },
    { q: "Which of these lets electricity flow through it easily?", a: "Copper", wrong: ["Rubber", "Plastic", "Wood", "Glass"], level: 2, emoji: "🔌",
      fact: "Electric wires have copper inside to carry electricity, wrapped in plastic to keep us safe." },
    { q: "What usually powers a torch when it isn't plugged in?", a: "A battery", wrong: ["A bulb", "A switch", "A lens", "A mirror"], level: 1, emoji: "🔦",
      fact: "Alessandro Volta built the first electric battery in 1800. The 'volt' is named after him!" },
    { q: "Rub a balloon on your hair and it can stick to a wall. Why?", a: "Static electricity", wrong: ["Magnetism", "Gravity", "Sticky air", "Sound waves"], level: 1, emoji: "🎈",
      fact: "Lightning is a giant spark of static electricity, like a huge version of the tiny zap from a doorknob." },

    // --- Kitchen chemistry ---
    { q: "What happens when you mix vinegar and baking soda?", a: "It fizzes and bubbles", wrong: ["It freezes solid", "It turns into sugar", "It glows in the dark", "It turns into metal"], level: 1, emoji: "🧪",
      fact: "The bubbles are carbon dioxide, the same gas that puts the fizz in fizzy drinks." },
    { q: "What does iron need to go rusty?", a: "Water and oxygen", wrong: ["Sand and sunlight", "Darkness and cold", "Sugar and flour"], level: 2, emoji: "🔩",
      fact: "Salty seawater makes iron rust even faster. That's why ships and piers get lots of protective paint." },
    { q: "Stir sugar into hot tea and it seems to vanish. What has it done?", a: "Dissolved", wrong: ["Melted", "Evaporated", "Frozen"], level: 2, emoji: "☕",
      fact: "Sugar dissolves faster in hot water than in cold, because the hot water's tiny particles move faster." },
    { q: "How can you get the salt back out of salty water?", a: "Let it evaporate", wrong: ["Pour it through a sieve", "Stir it with a magnet", "Shake it really hard"], level: 3, emoji: "🧂",
      fact: "Lots of sea salt is made this way: seawater is left in shallow ponds until the sun dries the water away." },
    { q: "What makes bread dough rise?", a: "Yeast making gas bubbles", wrong: ["Salt making it float", "Flour soaking up air", "The oven blowing air in"], level: 3, emoji: "🍞",
      fact: "Yeast is alive! Each yeast is a tiny fungus made of just one cell, far too small to see without a microscope." },
    { q: "Which of these changes can NOT be undone?", a: "Cooking an egg", wrong: ["Melting ice", "Freezing juice", "Melting chocolate", "Melting butter"], level: 2, emoji: "🤔",
      fact: "Scientists call this an irreversible change: heat turns the runny egg into new stuff that can't go back." },

    // --- Plants ---
    { q: "What is the name for how green plants make food from sunlight?", a: "Photosynthesis", wrong: ["Evaporation", "Hibernation", "Pollination", "Germination"], level: 2, emoji: "🌿",
      fact: "Plants use sunlight, water and carbon dioxide to make sugar, and give out oxygen for us to breathe." },
    { q: "What is the green stuff in leaves that catches sunlight?", a: "Chlorophyll", wrong: ["Pollen", "Nectar", "Sap", "Chalk"], level: 3, emoji: "🍃",
      fact: "In autumn, many trees stop making chlorophyll, so the yellow and orange colours hiding in the leaves show through." },
    { q: "Which part of a plant takes in water from the soil?", a: "The roots", wrong: ["The petals", "The flowers", "The leaves", "The pollen"], level: 1, emoji: "🌱",
      fact: "Water travels up from the roots through tiny tubes in the stem, all the way to the leaves." },
    { q: "What do bees carry from flower to flower to help plants make seeds?", a: "Pollen", wrong: ["Sap", "Soil", "Seeds", "Leaves"], level: 1, emoji: "🐝",
      fact: "This is called pollination. Bees visit flowers to collect sweet nectar and pollen as food." },

    // --- Famous scientists and discoveries ---
    { q: "Marie Curie was the first woman to win which famous prize?", a: "The Nobel Prize", wrong: ["An Oscar", "A Grammy", "A BAFTA", "An Olympic medal"], level: 2, emoji: "👩‍🔬",
      fact: "She won it twice, in physics and in chemistry. She's still the only person to win in two different sciences." },
    { q: "Which two new elements did Marie and Pierre Curie discover?", a: "Polonium and radium", wrong: ["Oxygen and hydrogen", "Gold and silver", "Iron and copper", "Carbon and helium"], level: 3, emoji: "🔬",
      fact: "Marie named polonium after Poland, the country where she was born and grew up." },
    { q: "Which germ-stopping medicine did Alexander Fleming discover in 1928?", a: "Penicillin", wrong: ["Aspirin", "Insulin", "Paracetamol", "Vitamin C"], level: 2, emoji: "🧫",
      fact: "He spotted it after a holiday, when mould growing on a dish in his lab had stopped germs growing around it." },
    { q: "In 1903, the Wright brothers made the first controlled flight in what?", a: "A plane with an engine", wrong: ["A hot-air balloon", "A helicopter", "A space rocket"], level: 2, emoji: "🔧",
      fact: "That first flight lasted just 12 seconds and went about 37 metres. Later that day they flew for nearly a minute!" },
    { q: "Which scientist is famous for the equation E = mc²?", a: "Albert Einstein", wrong: ["Isaac Newton", "Charles Darwin", "Marie Curie", "Ada Lovelace"], level: 2, emoji: "🧮",
      fact: "Einstein's Nobel Prize wasn't for E = mc². It was for explaining how light can knock tiny particles out of metal." },
    { q: "Who is often called the first computer programmer?", a: "Ada Lovelace", wrong: ["Marie Curie", "Florence Nightingale", "Jane Goodall", "Mary Anning"], level: 3, emoji: "💻",
      fact: "In 1843 she wrote steps for a calculating machine that was never finished, and guessed it might even make music!" },
    { q: "Which ancient Greek thinker is said to have shouted 'Eureka!' in his bath?", a: "Archimedes", wrong: ["Aristotle", "Plato", "Pythagoras", "Socrates"], level: 3, emoji: "🛁",
      fact: "'Eureka' means 'I have found it!' The story says he'd worked out how to check if a king's crown was pure gold." },
  ],
});

export const body = bankTopic({
  id: "body",
  title: "Your Amazing Body",
  emoji: "🫀",
  eyebrow: "Your Amazing Body",
  questions: [
    // --- Bones ---
    { q: "About how many bones does a grown-up's skeleton have?", a: "206", wrong: ["32", "106", "500", "2,000"], level: 2, emoji: "🦴",
      fact: "Babies are born with about 300 bones. Some of them join together as you grow." },
    { q: "What is the longest bone in your body?", a: "The thigh bone", wrong: ["The shin bone", "The collarbone", "The upper arm bone", "The jaw bone"], level: 2, emoji: "📏",
      fact: "Its scientific name is the femur. In most grown-ups it's about a quarter of their height!" },
    { q: "Where is the smallest bone in your body?", a: "Inside your ear", wrong: ["In your little toe", "In your fingertip", "In your nose", "In your eyelid"], level: 3, emoji: "🔍",
      fact: "It's called the stirrup because of its shape, and it's only about 3 millimetres long!" },
    { q: "Which part of your skeleton protects your brain?", a: "The skull", wrong: ["The ribs", "The hips", "The kneecaps", "The toes"], level: 1, emoji: "🧠",
      fact: "Your skull looks like one big bone, but it's really about 22 bones. All of them except your jawbone are joined tightly together!" },
    { q: "What do your ribs protect?", a: "Your heart and lungs", wrong: ["Your brain and eyes", "Your knees and ankles", "Your teeth and tongue", "Your fingers and toes"], level: 1, emoji: "🛡️",
      fact: "Most people have 12 pairs of ribs. They make a bony cage around your chest." },
    { q: "What is the place where two bones meet, like your knee or elbow?", a: "A joint", wrong: ["A muscle", "A nerve", "A vein"], level: 1, emoji: "🤸",
      fact: "Knees and elbows bend like door hinges, but your shoulders and hips are ball-and-socket joints that can swing round." },
    { q: "What does your skin make when sunshine falls on it?", a: "Vitamin D", wrong: ["Vitamin C", "Vitamin B12", "Vitamin K", "Vitamin A"], level: 3, emoji: "☀️",
      fact: "Vitamin D helps your body use calcium to keep your bones, teeth and muscles healthy." },

    // --- Muscles ---
    { q: "About how many muscles are in your body?", a: "More than 600", wrong: ["About 6", "About 60", "About 6 million"], level: 2, emoji: "💪",
      fact: "Muscles can only pull, never push. That's why they work in pairs, like the biceps and triceps in your arm." },
    { q: "What is the biggest muscle in your body?", a: "The one in your bottom", wrong: ["The one in your tongue", "The one in your eyelid", "The one in your thumb"], level: 2, emoji: "🏋️",
      fact: "It's called the gluteus maximus. It keeps you standing tall and powers you up the stairs." },
    { q: "What joins your muscles to your bones?", a: "Tendons", wrong: ["Ligaments", "Nerves", "Veins", "Hairs"], level: 3, emoji: "🏃",
      fact: "The Achilles tendon, at the back of your ankle, is the strongest and thickest tendon in your body." },

    // --- Heart and blood ---
    { q: "Which muscle keeps working all day and all night, even while you sleep?", a: "Your heart", wrong: ["Your tongue", "Your biceps", "Your calf muscle", "Your tummy muscles"], level: 1, emoji: "😴",
      fact: "Your heart beats about 100,000 times every day, pumping blood all around your body." },
    { q: "About how big is your heart?", a: "About the size of your fist", wrong: ["About the size of a pea", "About the size of a football", "About the size of your head"], level: 1, emoji: "🤔",
      fact: "It sits in your chest, a little to the left of the middle." },
    { q: "What are the tubes that carry blood away from your heart called?", a: "Arteries", wrong: ["Veins", "Nerves", "Tendons", "Ligaments"], level: 3, emoji: "🫀",
      fact: "Your pulse is the beat you feel as blood is pushed through an artery. Try finding it on your wrist!" },
    { q: "Where does your body make most of its blood cells?", a: "Inside your bones", wrong: ["In your heart", "In your stomach", "In your brain", "In your skin"], level: 2, emoji: "🔴",
      fact: "Red blood cells carry oxygen all around your body, and each one lasts about 4 months." },
    { q: "What do doctors use to listen to your heartbeat?", a: "A stethoscope", wrong: ["A telescope", "A microscope", "A periscope", "A kaleidoscope"], level: 2, emoji: "👩‍⚕️",
      fact: "The 'lub-dub' sound of your heartbeat is made by little flaps inside your heart, called valves, closing." },

    // --- Lungs and breathing ---
    { q: "Which gas does your body need from the air you breathe in?", a: "Oxygen", wrong: ["Helium", "Carbon dioxide", "Neon"], level: 1, emoji: "🌬️",
      fact: "Most of the air is actually nitrogen, about 78%. Only about 21% is oxygen, and that's plenty!" },
    { q: "What is the big, flat muscle under your lungs that helps you breathe?", a: "The diaphragm", wrong: ["The biceps", "The triceps", "The calf muscle"], level: 3, emoji: "🎈",
      fact: "Hiccups happen when your diaphragm suddenly twitches and your vocal cords snap shut with a 'hic!'" },
    { q: "How many lungs do you have?", a: "2", wrong: ["1", "3", "4"], level: 1, emoji: "🫁",
      fact: "Your left lung is a little smaller than your right one, to make room for your heart." },

    // --- Brain, nerves and sleep ---
    { q: "Which part of your body is in charge of your thinking and moving?", a: "Your brain", wrong: ["Your heart", "Your stomach", "Your lungs", "Your liver"], level: 1, emoji: "💭",
      fact: "A grown-up's brain is only about 2% of their body weight, but it uses about a fifth of all their body's energy!" },
    { q: "What carries messages between your brain and the rest of your body?", a: "Nerves", wrong: ["Bones", "Muscles", "Tendons", "Hairs"], level: 2, emoji: "⚡",
      fact: "The fastest nerve messages zoom along at up to about 120 metres every second!" },
    { q: "Which side of your brain controls the right side of your body?", a: "The left side", wrong: ["The right side", "Neither side", "It swaps every day"], level: 3, emoji: "🧠",
      fact: "The nerve pathways between your brain and body cross over on the way. Scientists still aren't sure why we're built this way!" },
    { q: "How much sleep do children aged 6 to 12 need each night?", a: "About 9 to 12 hours", wrong: ["About 2 to 3 hours", "About 4 to 5 hours", "About 20 hours"], level: 2, emoji: "🛏️",
      fact: "Your body releases lots of growth hormone in deep sleep. That's one reason a good night's sleep matters so much while you're growing!" },

    // --- The senses ---
    { q: "Hold your nose and food tastes of much less. Which sense are you blocking?", a: "Smell", wrong: ["Hearing", "Sight", "Touch"], level: 2, emoji: "🍬",
      fact: "Try a jelly bean with your nose held: it just tastes sweet. Let go and the real flavour arrives!" },
    { q: "Which tiny parts of your tongue pick up sweet, salty, sour and bitter?", a: "Taste buds", wrong: ["Eardrums", "Eyelashes", "Nostrils", "Freckles"], level: 1, emoji: "👅",
      fact: "You have thousands of taste buds, and the cells in them are replaced every week or two!" },
    { q: "What is the black circle in the middle of your eye?", a: "The pupil", wrong: ["The iris", "The eyelash", "The eyebrow", "The eyelid"], level: 2, emoji: "👁️",
      fact: "It's really an opening that lets light in. It gets bigger in the dark to let more light into your eye." },
    { q: "Which part of your ear wobbles when sound waves hit it?", a: "The eardrum", wrong: ["The earlobe", "The kneecap", "The tonsils"], level: 2, emoji: "👂",
      fact: "Deep inside your ears are tiny tubes of liquid that help you keep your balance!" },

    // --- Skin, hair and nails ---
    { q: "What is the largest organ of your body?", a: "Your skin", wrong: ["Your heart", "Your brain", "Your stomach"], level: 2, emoji: "🧍",
      fact: "Your skin keeps germs out, helps keep you at the right temperature and lets you feel touch." },
    { q: "What is special about your fingerprints?", a: "Nobody else has the same", wrong: ["They change every day", "Everyone's are the same", "They glow in the dark", "They wash off in the bath"], level: 1, emoji: "🖐️",
      fact: "Even identical twins have different fingerprints. Yours formed before you were born!" },
    { q: "What is your hair made of?", a: "Keratin", wrong: ["Chalk", "Plastic", "Cotton", "Bone"], level: 3, emoji: "💇",
      fact: "You have more than 100,000 hairs on your head, and about 50 to 100 fall out every day. New ones grow back!" },

    // --- Teeth ---
    { q: "How many sets of teeth do people grow?", a: "2", wrong: ["1", "3", "5"], level: 1, emoji: "😁",
      fact: "Children have 20 baby teeth. Grown-ups have up to 32 adult teeth." },
    { q: "How long should you brush your teeth each time?", a: "About 2 minutes", wrong: ["About 2 seconds", "About 20 minutes", "About 2 hours"], level: 1, emoji: "🪥",
      fact: "Brush twice a day, and make one of those times just before bed. Night-time brushing is extra important!" },
    { q: "What are the big, flat teeth at the back of your mouth called?", a: "Molars", wrong: ["Incisors", "Canines", "Tusks"], level: 3, emoji: "🦷",
      fact: "Molars grind food into mush. Your front incisors cut, and your pointy canines grip and tear." },

    // --- Digestion and keeping healthy ---
    { q: "What is the stretchy bag that churns up your food after you swallow?", a: "Your stomach", wrong: ["Your lungs", "Your heart", "Your brain", "Your kidneys"], level: 1, emoji: "🍽️",
      fact: "Strong muscles and special juices in your stomach mash food into a thick, soupy mix." },
    { q: "Where does digestion begin?", a: "In your mouth", wrong: ["In your stomach", "In your heart", "In your lungs"], level: 2, emoji: "🥪",
      fact: "Just smelling or thinking about tasty food gets your mouth making saliva, which starts softening food." },
    { q: "What is the longest part of the tube that food travels through?", a: "The small intestine", wrong: ["The large intestine", "The stomach", "The food pipe"], level: 3, emoji: "🌀",
      fact: "It's called 'small' because it's narrow, but it's much longer than you are tall!" },
    { q: "How many portions of fruit and veg should you aim to eat each day?", a: "At least 5", wrong: ["Just 1", "Exactly 2", "About 50"], level: 1, emoji: "🍓",
      fact: "Frozen and tinned fruit and veg count towards your 5 A Day too, not just fresh!" },
    { q: "About how much of your body is water?", a: "More than half", wrong: ["Almost none", "About a tenth", "All of it"], level: 2, emoji: "💧",
      fact: "Babies are even more watery: a newborn is about 78% water!" },
  ],
});
