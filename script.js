(() => {
  const $ = (sel, root = document) => root.querySelector(sel);

  const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
  const isMobileLayout = () => {
    try {
      return window.matchMedia?.("(max-width: 540px)")?.matches ?? false;
    } catch (_) {
      return false;
    }
  };

  const headlineEl = $("#headline");
  const bgHeartsEl = $("#bgHearts");

  const arena = $("#arena");
  const yesBtn = $("#yesBtn");
  const noBtn = $("#noBtn");

  const questionCard = $("#questionCard");
  const resultCard = $("#resultCard");
  const resultLine = $("#resultLine");

  function wrapHeadlineLetters() {
    if (!headlineEl) return;

    const walker = document.createTreeWalker(headlineEl, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });

    const textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);

    textNodes.forEach((node) => {
      const text = node.nodeValue;
      const frag = document.createDocumentFragment();

      const wrap = document.createElement("span");
      wrap.className = "kine";

      let visibleCharIndex = 0;
      let wordEl = null;
      const flushWord = () => {
        if (wordEl) {
          wrap.appendChild(wordEl);
          wordEl = null;
        }
      };

      for (const ch of text) {
        if (ch === " ") {
          flushWord();
          wrap.appendChild(document.createTextNode(" "));
          continue;
        }

        if (!wordEl) {
          wordEl = document.createElement("span");
          wordEl.className = "kine__word";
        }

        const s = document.createElement("span");
        s.className = "kine__char";
        s.textContent = ch;

        const delay = (visibleCharIndex % 14) * 45;
        const dur = 2600 + (visibleCharIndex % 11) * 120;
        s.style.animationDelay = `${delay}ms`;
        s.style.animationDuration = `${dur}ms`;

        visibleCharIndex += 1;
        wordEl.appendChild(s);
      }

      flushWord();

      frag.appendChild(wrap);
      node.parentNode?.replaceChild(frag, node);
    });
  }

  function spawnBackgroundHearts(count = 18) {
    if (!bgHeartsEl || prefersReducedMotion) return;

    bgHeartsEl.innerHTML = "";
    const vw = Math.max(320, window.innerWidth);
    for (let i = 0; i < count; i += 1) {
      const h = document.createElement("div");
      h.className = "floatHeart";

      const x = Math.random() * vw;
      const dx = (Math.random() - 0.5) * 120;
      const dur = 10 + Math.random() * 14;
      const delay = -Math.random() * dur;
      const size = 10 + Math.random() * 14;

      h.style.left = `${x}px`;
      h.style.width = `${size}px`;
      h.style.height = `${size}px`;
      h.style.opacity = `${0.18 + Math.random() * 0.32}`;
      h.style.setProperty("--x", "0px");
      h.style.setProperty("--dx", `${dx}px`);
      h.style.animationDuration = `${dur}s`;
      h.style.animationDelay = `${delay}s`;

      bgHeartsEl.appendChild(h);
    }
  }

  let dodgeCount = 0;
  let lastPos = { x: null, y: null };
  let dodging = false;

  function rectsIntersect(a, b, pad = 0) {
    return !(
      a.right + pad < b.left ||
      a.left - pad > b.right ||
      a.bottom + pad < b.top ||
      a.top - pad > b.bottom
    );
  }

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function getRectRelativeToArena(el) {
    const a = arena.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    return {
      left: r.left - a.left,
      top: r.top - a.top,
      right: r.right - a.left,
      bottom: r.bottom - a.top,
      width: r.width,
      height: r.height,
    };
  }

  function placeNoButtonAt(centerX, centerY) {
    noBtn.style.left = `${centerX}px`;
    noBtn.style.top = `${centerY}px`;
  }

  function pickSafeRandomPosition() {
    const a = arena.getBoundingClientRect();
    const bw = noBtn.offsetWidth;
    const bh = noBtn.offsetHeight;
    const pad = 10;

    const minX = pad + bw / 2;
    const maxX = a.width - pad - bw / 2;
    const minY = pad + bh / 2;
    const maxY = a.height - pad - bh / 2;

    const yesR = getRectRelativeToArena(yesBtn);

    const avoidPad = 18;

    let best = null;
    for (let i = 0; i < 18; i += 1) {
      const cx = clamp(minX + Math.random() * (maxX - minX), minX, maxX);
      const cy = clamp(minY + Math.random() * (maxY - minY), minY, maxY);

      const candidate = {
        left: cx - bw / 2,
        right: cx + bw / 2,
        top: cy - bh / 2,
        bottom: cy + bh / 2,
      };

      const tooCloseToYes = rectsIntersect(candidate, yesR, avoidPad);

      const tooCloseToLast =
        lastPos.x !== null &&
        Math.hypot(cx - lastPos.x, cy - lastPos.y) < Math.min(64, a.width * 0.18);

      if (tooCloseToYes || tooCloseToLast) continue;

      best = { cx, cy };
      break;
    }

    if (!best) {
      best = {
        cx: clamp((minX + maxX) / 2 + (Math.random() - 0.5) * 80, minX, maxX),
        cy: clamp((minY + maxY) / 2 + (Math.random() - 0.5) * 40, minY, maxY),
      };
    }

    return best;
  }

  function updateNoButtonDifficulty() {
    if (dodgeCount >= 7) {
      noBtn.style.setProperty("--no-scale", "0.84");
      noBtn.style.opacity = "0.64";
      noBtn.style.filter = "blur(0.2px) saturate(0.9)";
    } else if (dodgeCount >= 4) {
      noBtn.style.setProperty("--no-scale", "0.92");
      noBtn.style.opacity = "0.82";
      noBtn.style.filter = "saturate(0.95)";
    } else {
      noBtn.style.setProperty("--no-scale", "1");
      noBtn.style.opacity = "1";
      noBtn.style.filter = "none";
    }
  }

  function dodgeNoButton(reason = "hover") {
    if (dodging) return;
    dodging = true;

    dodgeCount += 1;
    updateNoButtonDifficulty();

    const { cx, cy } = pickSafeRandomPosition();
    lastPos = { x: cx, y: cy };

    if (!prefersReducedMotion) {
      noBtn.classList.remove("is-booped");
      void noBtn.offsetWidth;
      noBtn.classList.add("is-booped");
    }

    placeNoButtonAt(cx, cy);

    window.setTimeout(() => {
      try {
        if (document.activeElement === noBtn) noBtn.focus({ preventScroll: true });
      } catch (_) {
      }
      dodging = false;
    }, prefersReducedMotion ? 0 : 260);
  }

  function initNoButtonPosition() {
    const a = arena.getBoundingClientRect();
    const bw = noBtn.offsetWidth;
    const bh = noBtn.offsetHeight;

    let cx;
    let cy;

    if (isMobileLayout()) {
      const pad = 12;
      const gap = 12;
      const yesR = getRectRelativeToArena(yesBtn);
      cx = clamp(yesR.left + yesR.width / 2, pad + bw / 2, a.width - pad - bw / 2);
      cy = clamp(yesR.bottom + gap + bh / 2, pad + bh / 2, a.height - pad - bh / 2);
    } else {
      cx = clamp(a.width * 0.72, 12 + bw / 2, a.width - 12 - bw / 2);
      cy = clamp(a.height * 0.55, 12 + bh / 2, a.height - 12 - bh / 2);
    }

    lastPos = { x: cx, y: cy };
    placeNoButtonAt(cx, cy);
    updateNoButtonDifficulty();
  }

  function resizeCanvas() {}

  function transitionToResult() {
    if (!questionCard || !resultCard) return;

    yesBtn?.setAttribute?.("disabled", "true");
    noBtn?.setAttribute?.("disabled", "true");

    const show = () => {
      resultCard.hidden = false;
      resultCard.classList.remove("is-visible");
      if (resultLine) resultLine.textContent = "Мені зараз дуже тепло.";
      requestAnimationFrame(() => resultCard.classList.add("is-visible"));
    };

    if (prefersReducedMotion) {
      questionCard.hidden = true;
      show();
      return;
    }

    questionCard.classList.add("is-leaving");
    window.setTimeout(() => {
      questionCard.hidden = true;
      show();
    }, 380);
  }

  function bindEvents() {
    if (!arena || !yesBtn || !noBtn) return;

    noBtn.addEventListener("mouseenter", () => dodgeNoButton("mouseenter"));
    noBtn.addEventListener("focus", () => dodgeNoButton("focus"));
    noBtn.addEventListener("touchstart", (e) => {
      e.preventDefault();
      dodgeNoButton("touchstart");
    }, { passive: false });

    noBtn.addEventListener("click", () => {
      dodgeNoButton("click");
    });

    yesBtn.addEventListener("click", () => {
      transitionToResult();
    });

    window.addEventListener("resize", () => {
      spawnBackgroundHearts();
      initNoButtonPosition();
      resizeCanvas();
    });
  }

  function init() {
    wrapHeadlineLetters();
    spawnBackgroundHearts();

    window.setTimeout(() => {
      initNoButtonPosition();
    }, 0);

    resizeCanvas();
    bindEvents();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

