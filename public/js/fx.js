// Eye candy: the synthwave grid, floating particles, confetti, fireworks,
// rolling numbers and smooth list re-ordering.

const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const root = document.documentElement;

// ---------- accent colour (the whole page tints to match the moment) ----------
let accent = [255, 138, 31], target = [255, 138, 31];
function hexToRgb(hex) {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function setAccent(hex) {
  target = hexToRgb(hex);
  root.style.setProperty("--a", hex);
  root.style.setProperty("--a-rgb", target.join(","));
}

// ---------- background: perspective grid + particles ----------
let speed = 1, speedTarget = 1;
export function setSpeed(s) { speedTarget = s; }

export function initBackdrop() {
  const gc = document.getElementById("grid"), gx = gc.getContext("2d");
  const pc = document.getElementById("particles"), px = pc.getContext("2d");
  let W, H, parts = [], scroll = 0, last = 0;

  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    W = innerWidth; H = innerHeight;
    for (const c of [gc, pc]) { c.width = W * dpr; c.height = H * dpr; }
    gx.setTransform(dpr, 0, 0, dpr, 0, 0);
    px.setTransform(dpr, 0, 0, dpr, 0, 0);
    parts = [];
    const n = Math.round((W * H) / 12000);
    for (let i = 0; i < n; i++) parts.push({ x: Math.random() * W, y: Math.random() * H, z: Math.random() * 0.8 + 0.2, tw: Math.random() * 6.28 });
  }

  function frame(t) {
    const dt = Math.min(50, t - (last || t));
    last = t;
    for (let i = 0; i < 3; i++) accent[i] += (target[i] - accent[i]) * 0.04;
    speed += (speedTarget - speed) * 0.03;
    const rgb = accent.map(Math.round).join(",");

    // grid floor
    gx.clearRect(0, 0, W, H);
    const horizon = H * 0.56, vpX = W * 0.5, cols = 22;
    gx.strokeStyle = `rgba(${rgb},.2)`;
    gx.lineWidth = 1;
    for (let i = -cols; i <= cols; i++) {
      gx.beginPath(); gx.moveTo(vpX, horizon); gx.lineTo(vpX + i * (W / cols) * 1.6, H); gx.stroke();
    }
    if (!reduce) scroll = (scroll + dt * 0.00007 * speed) % 1;
    for (let j = 0; j < 22; j++) {
      const f = (j + scroll) / 22, y = horizon + (H - horizon) * f * f;
      gx.globalAlpha = Math.min(1, f * 1.3);
      gx.beginPath(); gx.moveTo(0, y); gx.lineTo(W, y); gx.stroke();
    }
    gx.globalAlpha = 1;
    const grd = gx.createLinearGradient(0, horizon - 40, 0, H);
    grd.addColorStop(0, `rgba(${rgb},0)`); grd.addColorStop(0.15, `rgba(${rgb},.10)`); grd.addColorStop(1, `rgba(${rgb},0)`);
    gx.fillStyle = grd; gx.fillRect(0, horizon - 40, W, H - horizon + 40);

    // particles drifting up, faster when you're on a streak
    px.clearRect(0, 0, W, H);
    for (const p of parts) {
      if (!reduce) p.y -= p.z * 0.3 * speed * (dt / 16);
      if (p.y < -4) { p.y = H + 4; p.x = Math.random() * W; }
      const a = (0.3 + 0.5 * Math.abs(Math.sin(t * 0.001 + p.tw))) * p.z;
      px.fillStyle = `rgba(${rgb},${a.toFixed(2)})`;
      px.beginPath(); px.arc(p.x, p.y, p.z * 1.7, 0, 6.283); px.fill();
    }
    requestAnimationFrame(frame);
  }
  addEventListener("resize", resize);
  resize();
  requestAnimationFrame(frame);
}

// ---------- floating flags behind menus ----------
// items: flag picture paths ("/f/...") or emoji (for topics like Space or Math)
export function parade(el, items) {
  el.innerHTML = "";
  const n = Math.min(items.length, innerWidth < 700 ? 8 : 14);
  for (let i = 0; i < n; i++) {
    let img;
    if (items[i].startsWith("/")) {
      img = new Image();
      img.src = items[i];
      img.alt = "";
      img.decoding = "async";
    } else {
      img = document.createElement("span");
      img.className = "pe";
      img.textContent = items[i];
    }
    const depth = Math.random();
    img.style.cssText = [
      `left:${Math.random() * 96}%`, `--w:${Math.round(40 + depth * 60)}px`, `--o:${(0.12 + depth * 0.22).toFixed(2)}`,
      `--b:${((1 - depth) * 2.5).toFixed(1)}px`, `--t:${Math.round(26 + (1 - depth) * 30)}s`, `--dl:${-Math.random() * 50}s`,
      `--dx:${Math.round((Math.random() - 0.5) * 200)}px`, `--r1:${Math.round((Math.random() - 0.5) * 40)}deg`, `--r2:${Math.round((Math.random() - 0.5) * 60)}deg`,
    ].join(";");
    el.appendChild(img);
  }
}

// ---------- confetti, bursts and fireworks ----------
const cc = document.getElementById("confetti");
const cx = cc.getContext("2d");
let bits = [], running = false;
const PALETTE = ["#ff8a1f", "#ffd23f", "#3ddc97", "#38bdf8", "#f472b6", "#8b5cf6", "#ffffff"];

function sizeConfetti() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  cc.width = innerWidth * dpr; cc.height = innerHeight * dpr;
  cx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
addEventListener("resize", sizeConfetti);
sizeConfetti();

function runConfetti() {
  if (running) return;
  running = true;
  let last = performance.now();
  (function tick(now) {
    const dt = Math.min(40, now - last) / 16;
    last = now;
    cx.clearRect(0, 0, innerWidth, innerHeight);
    bits = bits.filter((b) => b.life > 0 && b.y < innerHeight + 40);
    for (const b of bits) {
      b.vx *= b.drag; b.vy = b.vy * b.drag + b.g * dt;
      b.x += b.vx * dt; b.y += b.vy * dt; b.rot += b.vr * dt; b.life -= dt;
      cx.save();
      cx.globalAlpha = Math.max(0, Math.min(1, b.life / 30));
      cx.translate(b.x, b.y); cx.rotate(b.rot);
      cx.fillStyle = b.c;
      if (b.kind === "spark") { cx.beginPath(); cx.arc(0, 0, b.s, 0, 6.283); cx.fill(); }
      else cx.fillRect(-b.s, -b.s * 0.45, b.s * 2, b.s * 0.9 * Math.abs(Math.cos(b.rot * 2)) + 1);
      cx.restore();
    }
    if (bits.length) requestAnimationFrame(tick);
    else { running = false; cx.clearRect(0, 0, innerWidth, innerHeight); }
  })(last);
}

export function burst(x, y, { count = 70, power = 11, colors = PALETTE, spark = false } = {}) {
  if (reduce) return;
  for (let i = 0; i < count; i++) {
    const ang = Math.random() * Math.PI * 2, v = power * (0.35 + Math.random() * 0.75);
    bits.push({
      x, y, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v - power * 0.35, g: spark ? 0.12 : 0.28, drag: spark ? 0.95 : 0.975,
      rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, s: spark ? 2 + Math.random() * 2 : 4 + Math.random() * 5,
      c: colors[(Math.random() * colors.length) | 0], life: 70 + Math.random() * 50, kind: spark ? "spark" : "paper",
    });
  }
  runConfetti();
}

export function rain(count = 160) {
  if (reduce) return;
  for (let i = 0; i < count; i++) {
    bits.push({
      x: Math.random() * innerWidth, y: -20 - Math.random() * innerHeight * 0.6, vx: (Math.random() - 0.5) * 3, vy: 2 + Math.random() * 3,
      g: 0.05, drag: 0.995, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3, s: 4 + Math.random() * 5,
      c: PALETTE[(Math.random() * PALETTE.length) | 0], life: 260, kind: "paper",
    });
  }
  runConfetti();
}

export function fireworks(n = 5) {
  if (reduce) return;
  for (let i = 0; i < n; i++) {
    setTimeout(() => {
      const c = PALETTE[(Math.random() * 6) | 0];
      burst(innerWidth * (0.15 + Math.random() * 0.7), innerHeight * (0.15 + Math.random() * 0.35), { count: 60, power: 9, colors: [c, "#fff"], spark: true });
    }, i * 380);
  }
}

// ---------- little helpers ----------
export function center(el) {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

export function floatText(text, x, y) {
  const d = document.createElement("div");
  d.className = "float-pts";
  d.textContent = text;
  d.style.left = x + "px";
  d.style.top = y + "px";
  document.body.appendChild(d);
  setTimeout(() => d.remove(), 1400);
}

// Roll a number up like a slot machine.
export function countUp(el, to, ms = 900, onStep) {
  const from = Number(el.dataset.v || 0);
  el.dataset.v = to;
  if (reduce || from === to) { el.textContent = to.toLocaleString(); return; }
  const start = performance.now();
  let lastShown = from;
  (function step(now) {
    const k = Math.min(1, (now - start) / ms), e = 1 - Math.pow(1 - k, 3);
    const v = Math.round(from + (to - from) * e);
    el.textContent = v.toLocaleString();
    if (onStep && v !== lastShown && k < 1) onStep();
    lastShown = v;
    if (k < 1) requestAnimationFrame(step);
  })(start);
}

// Re-order a list with every row gliding to its new spot (FLIP animation).
export function flip(container, mutate) {
  const before = new Map([...container.children].map((c) => [c.dataset.id, c.getBoundingClientRect().top]));
  mutate();
  if (reduce) return;
  for (const c of container.children) {
    const b = before.get(c.dataset.id);
    if (b == null) continue;
    const dy = b - c.getBoundingClientRect().top;
    if (dy) c.animate([{ transform: `translateY(${dy}px)` }, { transform: "none" }], { duration: 750, easing: "cubic-bezier(.2,.9,.3,1.15)" });
  }
}

export function shake(el) {
  el.classList.remove("shake-screen");
  void el.offsetWidth;
  el.classList.add("shake-screen");
}

export function flash(kind) {
  const v = document.getElementById("vignette");
  v.classList.add(kind);
  setTimeout(() => v.classList.remove(kind), 450);
}
