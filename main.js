/* catherinewg — landing page
 * 1. Hero name pan     (GSAP ScrollTrigger: pinned section, vertical scroll -> translateX)
 * 2. Intro highlight   (ScrollTrigger progress -> moving red word band)
 * 3. Drink carousel    (drag / swipe / arrows / dots, one card per gesture, no autoplay)
 */

/* ---- Edit drinks here. Order = carousel order. `start` = drink shown on load. ---- */
const DRINKS = [
  { name: "matcha",             img: "assets/drinks/matchamatcha.png",   alt: "Iced matcha latte in a short glass", pair: "writing", href: "#writing" },
  { name: "espresso tonic",     img: "assets/drinks/espresso_tonic.png", alt: "Espresso tonic with an orange slice", pair: "work",    href: "#work" },
  { name: "something floral",   img: "assets/drinks/cocktail.png",       alt: "Coupe cocktail garnished with a periwinkle flower", pair: "花樣年華", href: "#hua-yang" },
  { name: "salt water (why...?)", img: "assets/drinks/glass_water.png",  alt: "A plain glass of water", pair: "kindred", href: "#kindred" },
];
const START_INDEX = 1;

gsap.registerPlugin(ScrollTrigger);
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ================= 1. HERO NAME PAN ================= */
function initHero() {
  const hero = document.querySelector(".hero");
  const canvas = document.querySelector(".hero__canvas");
  const mm = gsap.matchMedia();

  // Desktop with a fine pointer only. Touch / narrow screens get the static, uncropped name (CSS).
  mm.add("(min-width: 768px) and (pointer: fine) and (prefers-reduced-motion: no-preference)", () => {
    const distance = () => Math.max(0, canvas.scrollWidth - window.innerWidth);
    gsap.to(canvas, {
      x: () => -distance(),
      ease: "none",
      scrollTrigger: {
        trigger: hero,
        start: "top top",
        end: () => "+=" + distance() * 1.1,  // ~1.1px of scroll per px of pan
        pin: true,
        scrub: 0.6,                          // slight smoothing, still fully reversible
        invalidateOnRefresh: true,
      },
    });
  });
}

/* ================= 2. INTRO "LYRICS" HIGHLIGHT ================= */
function splitWords(root) {
  // Wrap every word in a span, preserving inline elements like <a>.
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach((node) => {
    const frag = document.createDocumentFragment();
    node.textContent.split(/(\s+)/).forEach((part) => {
      if (!part) return;
      if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
      const s = document.createElement("span");
      s.className = "w";
      s.textContent = part;
      frag.appendChild(s);
    });
    node.replaceWith(frag);
  });
  return [...root.querySelectorAll(".w")];
}

function initHighlight() {
  const block = document.querySelector("[data-highlight]");
  const words = splitWords(block);
  const BAND = 5; // words lit red at once
  const N = words.length;

  if (reduceMotion) { words.forEach((w) => w.classList.add("is-read")); return; }

  let last = -1;
  const paint = (head) => {
    if (head === last) return;
    last = head;
    for (let i = 0; i < N; i++) {
      const w = words[i];
      const read = i < head - BAND;
      const now = !read && i < head;
      w.classList.toggle("is-read", read);
      w.classList.toggle("is-now", now);
    }
  };

  ScrollTrigger.create({
    trigger: block,
    start: "top 78%",    // band starts when the paragraph enters the lower part of the screen
    end: "bottom 38%",   // ...and has fully passed by the time the text is in the upper-middle
    refreshPriority: -1, // calculate after the hero pin (created later) adds its spacing
    onUpdate: (self) => paint(Math.round(self.progress * (N + BAND))),
    onRefresh: (self) => paint(Math.round(self.progress * (N + BAND))),
  });
  paint(0);
}

/* ================= 3. DRINK CAROUSEL ================= */
function initCarousel() {
  const stage = document.querySelector(".bar__stage");
  const track = document.querySelector(".bar__track");
  const dotsEl = document.querySelector(".bar__dots");
  const caption = document.querySelector(".bar__caption");
  const nameEl = document.querySelector(".bar__name");
  const pairEl = document.querySelector(".bar__pair");

  const cards = DRINKS.map((d, i) => {
    const li = document.createElement("li");
    li.className = "card";
    li.setAttribute("role", "group");
    li.setAttribute("aria-roledescription", "slide");
    li.setAttribute("aria-label", `${i + 1} of ${DRINKS.length}: ${d.name}`);
    li.innerHTML = `<img src="${d.img}" alt="${d.alt}" draggable="false" />`;
    track.appendChild(li);
    return li;
  });

  const dots = DRINKS.map((d, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.setAttribute("role", "tab");
    b.setAttribute("aria-label", d.name);
    b.addEventListener("click", () => go(i));
    dotsEl.appendChild(b);
    return b;
  });

  let index = START_INDEX;
  let dragX = 0;

  // Distance between card centres: neighbours sit near the viewport edges so they read as a
  // deliberate crop, but never closer than one card width + a gap (narrow screens).
  const spacing = () => {
    const cw = cards[0].offsetWidth;
    const vw = stage.clientWidth;
    // neighbours are scaled to 0.82, so the closest they can sit without touching is ~0.91 * cw
    return Math.max(cw * 0.91 + 16, vw / 2 - cw * 0.12);
  };

  function layout() {
    const sp = spacing();
    cards.forEach((c, i) => {
      const off = i - index;
      const scale = off === 0 ? 1 : 0.82;
      c.style.transform = `translateX(${off * sp + dragX}px) scale(${scale})`;
      c.classList.toggle("is-active", off === 0);
      c.classList.toggle("is-far", Math.abs(off) > 1);
      c.setAttribute("aria-hidden", off === 0 ? "false" : "true");
    });
    dots.forEach((b, i) => b.setAttribute("aria-selected", String(i === index)));
  }

  function setCaption(immediate) {
    const d = DRINKS[index];
    const apply = () => {
      nameEl.textContent = d.name;
      pairEl.textContent = `pairs with ${d.pair} →`;
      pairEl.href = d.href;
      caption.classList.remove("is-swapping");
    };
    if (immediate || reduceMotion) return apply();
    caption.classList.add("is-swapping");
    setTimeout(apply, 220);
  }

  function go(i) {
    const next = Math.max(0, Math.min(DRINKS.length - 1, i));
    if (next === index) { layout(); return; }
    index = next;
    layout();
    setCaption();
  }

  // --- drag / swipe: one card per gesture, regardless of distance ---
  let startX = 0, startY = 0, pointerId = null, axis = null;
  stage.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    pointerId = e.pointerId; startX = e.clientX; startY = e.clientY; axis = null; dragX = 0;
  });
  stage.addEventListener("pointermove", (e) => {
    if (e.pointerId !== pointerId) return;
    const dx = e.clientX - startX, dy = e.clientY - startY;
    if (!axis) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      if (axis === "x") { stage.setPointerCapture(pointerId); stage.classList.add("is-dragging"); }
    }
    if (axis !== "x") return;
    const atEdge = (dx > 0 && index === 0) || (dx < 0 && index === DRINKS.length - 1);
    dragX = dx * (atEdge ? 0.25 : 0.6); // rubber-band at the ends
    layout();
  });
  const endDrag = (e) => {
    if (e.pointerId !== pointerId) return;
    const dx = e.clientX - startX;
    const wasX = axis === "x";
    pointerId = null; axis = null; dragX = 0;
    stage.classList.remove("is-dragging");
    if (!wasX) return;
    if (dx < -40) go(index + 1);
    else if (dx > 40) go(index - 1);
    else layout();
  };
  stage.addEventListener("pointerup", endDrag);
  stage.addEventListener("pointercancel", endDrag);

  // Click a peeking neighbour to step toward it.
  cards.forEach((c, i) => c.addEventListener("click", () => { if (i !== index) go(i); }));

  // --- keyboard: arrows when the carousel is focused, or anywhere while it's on screen ---
  let onScreen = false;
  new IntersectionObserver(([en]) => { onScreen = en.isIntersecting; }, { threshold: 0.5 }).observe(stage);
  document.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    if (!onScreen && document.activeElement !== stage) return;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName)) return;
    e.preventDefault();
    go(index + (e.key === "ArrowRight" ? 1 : -1));
  });

  window.addEventListener("resize", layout);
  // First paint: place cards without animating them in from the centre.
  stage.classList.add("is-dragging");
  layout();
  setCaption(true);
  requestAnimationFrame(() => requestAnimationFrame(() => stage.classList.remove("is-dragging")));
}

/* ================= boot ================= */
initCarousel();
initHighlight();
// Measure the hero only once the display font has loaded — the pan distance depends on it.
document.fonts.ready.then(() => {
  initHero();
  ScrollTrigger.refresh();
});
