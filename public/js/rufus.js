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
      <g class="eyes">${R(13, 7, 3, 3, "#000")}${R(19, 7, 3, 3, "#000")}${R(14, 7, 1, 1, "#fff")}${R(20, 7, 1, 1, "#fff")}</g>
      ${R(16, 10, 2, 2, "#000")}
      <g class="grin">${R(12, 13, 2, 2, "#fff")}${R(14, 12, 2, 2, "#fff")}${R(16, 13, 2, 2, "#fff")}${R(18, 12, 2, 2, "#fff")}${R(20, 13, 2, 2, "#fff")}</g>
      <g class="frown">${R(14, 13, 6, 1, "#000")}${R(13, 14, 1, 1, "#000")}${R(20, 14, 1, 1, "#000")}</g>
      ${R(10, 24, 4, 6, LEG)}${R(20, 24, 4, 6, LEG)}${R(10, 28, 4, 4, PAW)}${R(20, 28, 4, 4, PAW)}
    </g>
  </svg>`;
}

export const LINES = {
  hello: ["Hi! I'm Rufus! Pick a topic and let's play!", "Psst... I know all 195 flags. Do you?", "Ready for an adventure? Tap Solo Quest!"],
  poke: ["Hee hee, that tickles!", "Ich bin ein glücklicher Fuchs! (I'm a happy fox!)", "Foxes curl their bushy tails around themselves like a blanket to keep warm!", "Tail spin! 🌀", "I brushed my teeth today. Look at this grin!", "Fun fact: a group of foxes is called a skulk!"],
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
  const list = LINES[kind] || [""];
  const s = list[Math.floor(Math.random() * list.length)];
  return s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
}

export function makeFox(el) {
  el.innerHTML = foxSVG();
  el.classList.add("fox");
  let t = null;
  return {
    el,
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
