// 🦊 Rufus! Drawn from the same pixel art as his sprite in Adventures of Rufus,
// as an SVG so he stays crisp at any size. He can talk and change mood.

const R = (x, y, w, h, fill) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`;
const ORANGE = "#D2691E", LIGHT = "#F4A460", EAR = "#A0522D", LEG = "#8B4513", PAW = "#5C3317";

export function foxSVG() {
  return `<svg class="fox-svg" viewBox="-2 -3 36 36" aria-hidden="true">
    <g class="tail">${R(2, 14, 6, 4, ORANGE)}${R(0, 12, 4, 4, ORANGE)}${R(0, 12, 3, 4, "#fff")}</g>
    <g class="body">
      ${R(8, 12, 16, 12, ORANGE)}${R(10, 4, 14, 12, ORANGE)}
      ${R(10, 0, 4, 6, ORANGE)}${R(20, 0, 4, 6, ORANGE)}${R(11, 1, 2, 4, EAR)}${R(21, 1, 2, 4, EAR)}
      ${R(12, 16, 10, 6, LIGHT)}
      <g class="look"><g class="eyes">${R(13, 7, 3, 3, "#000")}${R(19, 7, 3, 3, "#000")}${R(14, 7, 1, 1, "#fff")}${R(20, 7, 1, 1, "#fff")}</g></g>
      ${R(16, 10, 2, 2, "#000")}
      <g class="grin">${R(12, 13, 2, 2, "#fff")}${R(14, 12, 2, 2, "#fff")}${R(16, 13, 2, 2, "#fff")}${R(18, 12, 2, 2, "#fff")}${R(20, 13, 2, 2, "#fff")}</g>
      <g class="frown">${R(14, 13, 6, 1, "#000")}${R(13, 14, 1, 1, "#000")}${R(20, 14, 1, 1, "#000")}</g>
      ${R(10, 24, 4, 6, LEG)}${R(20, 24, 4, 6, LEG)}${R(10, 28, 4, 4, PAW)}${R(20, 28, 4, 4, PAW)}
    </g>
  </svg>`;
}

export const LINES = {
  hello: ["Hi! I'm Rufus! Pick a topic and let's play!", "Psst... I know all 195 flags. Do you?", "Ready for an adventure? Tap Solo Quest!"],
  correct: ["Tail-spin-tastic!", "Fox-tastic!", "You nailed it!", "Woohoo! Treats for everyone!", "Big toothy grin time!", "That's my friend!", "Boom! Right answer!"],
  fast: ["Whoa, lightning paws!", "Faster than a fox chasing treats!", "Speedy!"],
  wrong: ["Oof! Even foxes slip sometimes.", "So close! Let's learn this one.", "No worries, the next one's yours!", "Tricky one! Remember it for next time."],
  timeout: ["Too slow! The clock got us.", "Time's up! Let's be quicker next time."],
  streak: ["{n} in a row! You're ON FIRE!", "{n} streak! Unstoppable!", "{n} in a row! Tail spin of victory!"],
  think: ["Hmm, think carefully...", "Look at the colours!", "You've got this!", "Trust your gut!"],
  locked: ["Locked in! Waiting for the others...", "Answer locked! Fingers crossed!"],
  lobby: ["Share the code! Everyone gets the same questions.", "The more friends, the more fun!"],
  waitHost: ["Waiting for the host to press Start...", "Get your paws ready!"],
  win: ["You're the champion! 🏆", "Victory dance time!"],
  lose: ["Great game! Rematch?", "So close! Let's go again!"],
  record: ["NEW RECORD! I'm so proud of you!", "A new personal best! Fox-tastic!"],
  done: ["Nice run! Can you beat it?", "Good game! Practice makes perfect."],
  hall: ["These are the legends! Can you join them?", "Only the best foxes make it here."],
  profile: ["Pick a secret agent name! No real names needed.", "Ooh, which animal will you be?"],
};

export function line(kind, vars = {}) {
  const s = pickOne(LINES[kind] || [""]);
  return s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
}
const pickOne = (list) => list[Math.floor(Math.random() * list.length)];

// 🎪 RUFUS'S TRICKS: tap Rufus and he does the next one. They come from a shuffled pile,
// so you see every trick before any of them comes round again.
//   id     the animation (see "RUFUS'S TRICKS" in app.css: .fox.t-spin, .fox.t-flip...)
//   ms     how long it lasts
//   sound  a sound effect from sound.js
//   pop    emoji that pop out of him
//   say    what he says (one at random)
// Want a new trick? Add a line here and a matching .fox.t-yourtrick animation in app.css.
export const TRICKS = [
  { id: "spin", ms: 900, sound: "coin", pop: ["🌀", "✨"], say: ["Tail spin! 🌀", "Whoosh! My famous tail spin!", "Tail-spin-tastic!"] },
  { id: "flip", ms: 1000, sound: "join", pop: ["⭐", "✨"], say: ["Backflip! Ta-da!", "Did you see that? A perfect 10!"] },
  { id: "dance", ms: 1600, sound: "pick", pop: ["🎵", "🎶"], say: ["Dance party! My dad Felix taught me this one.", "Wiggle wiggle wiggle!"] },
  { id: "pounce", ms: 1200, sound: "lock", pop: ["❄️", "🐾"], say: ["Mousing pounce! Foxes leap up high and dive nose-first into the snow to find mice.",
    "Scientists think foxes might use the Earth's magnetism to aim their pounces!"] },
  { id: "peek", ms: 1100, sound: "click", pop: ["👀"], say: ["Peekaboo! I see you!", "Where did I go? Here I am!"] },
  { id: "giggle", ms: 900, sound: "coin", pop: ["😆", "💛"], say: ["Hee hee, that tickles!", "Ha ha! Stop it!", "I brushed my teeth today. Look at this grin!"] },
  { id: "nap", ms: 2200, sound: null, pop: ["💤"], say: ["Zzz... Foxes curl their bushy tails around themselves like a blanket to keep warm.", "Just a quick fox nap... zzz"] },
  { id: "snack", ms: 1000, sound: "coin", pop: ["🍓", "🫐"], say: ["Treats! Berries are my favourite.", "Nom nom! Wild foxes love berries and fruit too."] },
  { id: "hello", ms: 1200, sound: "pick", pop: ["💬", "🌍"], say: [
    "Hallo! Ich bin ein glücklicher Fuchs! (That's German for \"I'm a happy fox!\")",
    "Bonjour ! In French, a fox is \"un renard\", just like my friend Renard!",
    "Ciao! Sono una volpe felice! (Italian for \"I'm a happy fox!\") Marthina taught me.",
    "¡Hola! ¡Soy un zorro feliz! (Spanish for \"I'm a happy fox!\")",
    "Konnichiwa! In Japanese, a fox is a \"kitsune\".",
    "Namaste! In Hindi, a fox is a \"lomdi\".",
    "Fun fact: a group of foxes is called a skulk!",
  ] },
];
// Tap really fast (5 taps in 2.5 seconds) for the SUPER COMBO.
const SUPER = { id: "super", ms: 1400, sound: "fanfare", pop: ["🎆", "⭐", "🌀"], super: true, say: ["SUPER COMBO! 🎆", "MEGA TAIL SPIN! You found my secret move!"] };

export function makeFox(el) {
  // Two copies of Rufus: a black, blurry, perfectly still one underneath (his shadow) and the real,
  // wriggling one on top. Making the shadow with a drop-shadow filter on the moving fox meant the
  // browser had to re-blur him on every frame; a still shadow is painted once (see .fox-shade in app.css).
  el.innerHTML = foxSVG().replace('class="fox-svg"', 'class="fox-shade"') + foxSVG();
  el.classList.add("fox");
  let t = null, trickT = null, pile = [], taps = [], eyes = "";
  const look = el.querySelector(".fox-svg .look"); // the real fox's eyes (the shadow copy has eyes too, but they stay put)
  return {
    el,
    // Do the next trick. Returns it, so the caller can play its sound and say its line.
    trick(id) {
      const now = Date.now();
      if (!id) taps = [...taps.filter((at) => now - at < 2500), now]; // only real taps count towards the combo
      let trick = TRICKS.find((x) => x.id === id);
      if (!trick && taps.length >= 5) { trick = SUPER; taps = []; }
      if (!trick) {
        if (!pile.length) pile = [...TRICKS].sort(() => Math.random() - 0.5); // shuffle a fresh pile
        trick = pile.pop();
      }
      el.classList.remove(...TRICKS.map((x) => "t-" + x.id), "t-super");
      void el.offsetWidth; // restart the animation, even for the same trick twice
      el.classList.add("t-" + trick.id);
      clearTimeout(trickT);
      trickT = setTimeout(() => el.classList.remove("t-" + trick.id), trick.ms);
      return { ...trick, line: pickOne(trick.say) };
    },
    // Rufus's eyes follow your mouse (or finger): one pixel left/right/up/down.
    lookAt(x, y) {
      const r = el.getBoundingClientRect();
      if (!r.width) return;
      const dx = x - (r.left + r.width / 2), dy = y - (r.top + r.height * 0.3);
      const step = (d, far) => (Math.abs(d) < far ? 0 : Math.sign(d));
      const next = `translate(${step(dx, r.width * 0.4)} ${step(dy, r.height * 0.4)})`;
      if (next !== eyes) look.setAttribute("transform", (eyes = next)); // only touch the page when they move
    },
    mood(m, ms = 1600) {
      el.classList.remove("happy", "cheer", "sad", "think");
      void el.offsetWidth; // restart the animation
      if (m) el.classList.add(m);
      clearTimeout(t);
      if (m && ms) t = setTimeout(() => el.classList.remove(m), ms);
    },
  };
}

// The Rufus who lives in the corner and talks.
export function makeHost({ dock, foxEl, bubble, text }) {
  const fox = makeFox(foxEl);
  let typing = null, hideT = null;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  return {
    fox,
    say(msg, { mood = null, ms = 4200 } = {}) {
      clearInterval(typing); clearTimeout(hideT);
      if (!msg) { bubble.classList.add("hide"); return; }
      bubble.classList.remove("hide");
      if (mood) fox.mood(mood);
      if (reduce) text.textContent = msg;
      else {
        let i = 0;
        text.textContent = "";
        typing = setInterval(() => {
          text.textContent = msg.slice(0, ++i);
          if (i >= msg.length) clearInterval(typing);
        }, 18);
      }
      if (ms) hideT = setTimeout(() => bubble.classList.add("hide"), ms + msg.length * 18);
    },
    hide() { clearTimeout(hideT); bubble.classList.add("hide"); },
    show(on) { dock.classList.toggle("away", !on); },
    ingame(on) { dock.classList.toggle("ingame", on); },
  };
}
