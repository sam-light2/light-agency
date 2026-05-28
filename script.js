/* ============================================================
   [Your Name] — Portfolio
   Vanilla JS: cursor, scroll reveals, hover states, year stamp
   ============================================================ */

(() => {
  'use strict';

  const isTouch = matchMedia('(hover: none)').matches;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* --------------------------------------------------------
     Nav theme: now dark-by-default (set in HTML) because the
     new marquee hero has a light background. The previous
     light-over-photo observer is no longer needed.
     -------------------------------------------------------- */
  const nav = document.querySelector('.nav');
  if (nav) nav.classList.add('nav--dark');

  /* --------------------------------------------------------
     Custom cursor (skipped on touch devices)
     -------------------------------------------------------- */
  const cursor = document.querySelector('.cursor');

  if (cursor && !isTouch) {
    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let curX = mouseX;
    let curY = mouseY;
    let rafId = null;

    document.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    }, { passive: true });

    const tick = () => {
      // Smooth easing toward mouse
      curX += (mouseX - curX) * 0.22;
      curY += (mouseY - curY) * 0.22;
      cursor.style.transform = `translate3d(${curX}px, ${curY}px, 0) translate(-50%, -50%)`;
      rafId = requestAnimationFrame(tick);
    };
    tick();

    // Hide cursor when leaving window
    document.addEventListener('mouseleave', () => {
      cursor.style.opacity = '0';
    });
    document.addEventListener('mouseenter', () => {
      cursor.style.opacity = '1';
    });

    // Hover state on interactive elements
    const hoverables = document.querySelectorAll(
      'a, button, .work__item, .hero__cta'
    );
    hoverables.forEach((el) => {
      el.addEventListener('mouseenter', () => cursor.classList.add('is-hover'));
      el.addEventListener('mouseleave', () => cursor.classList.remove('is-hover'));
    });
  } else if (cursor) {
    cursor.style.display = 'none';
  }

  /* --------------------------------------------------------
     Scroll reveals via IntersectionObserver
     -------------------------------------------------------- */
  if (!reduceMotion && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.12,
        rootMargin: '0px 0px -8% 0px',
      }
    );

    document.querySelectorAll('.reveal, .stagger').forEach((el) => io.observe(el));
  } else {
    // No IO — show everything
    document.querySelectorAll('.reveal, .stagger').forEach((el) => {
      el.classList.add('is-visible');
    });
  }

  /* --------------------------------------------------------
     Auto-update copyright year
     -------------------------------------------------------- */
  document.querySelectorAll('[data-year]').forEach((el) => {
    el.textContent = new Date().getFullYear();
  });

  /* --------------------------------------------------------
     Smooth scroll fallback for anchors (most browsers do this
     via CSS scroll-behavior, but this guarantees it).
     -------------------------------------------------------- */
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (e) => {
      const targetId = anchor.getAttribute('href');
      if (!targetId || targetId === '#') return;
      const target = document.querySelector(targetId);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({
        behavior: reduceMotion ? 'auto' : 'smooth',
        block: 'start',
      });
    });
  });

  /* --------------------------------------------------------
     Whisper text — wrap each word in a span, stagger-reveal
     on scroll into view. Drop a [data-whisper] attr on any
     text-only element to opt in.
     -------------------------------------------------------- */
  const setupWhisper = (el) => {
    // Only split if it's pure text (no children we'd lose)
    if (el.dataset.whisperReady === '1') return;
    const raw = el.textContent.trim();
    if (!raw) return;

    const words = raw.split(/\s+/);
    el.textContent = '';
    const frag = document.createDocumentFragment();
    words.forEach((w, i) => {
      const span = document.createElement('span');
      span.className = 'whisper-word';
      span.textContent = w;
      // staggered delay per word
      span.style.transitionDelay = `${i * 0.06}s`;
      frag.appendChild(span);
    });
    el.appendChild(frag);
    el.dataset.whisperReady = '1';
  };

  const whisperEls = document.querySelectorAll('[data-whisper]');
  whisperEls.forEach(setupWhisper);

  if (!reduceMotion && 'IntersectionObserver' in window) {
    const whisperIO = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.querySelectorAll('.whisper-word').forEach((w) => {
              w.classList.add('is-in');
            });
            whisperIO.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.2, rootMargin: '0px 0px -10% 0px' }
    );
    whisperEls.forEach((el) => whisperIO.observe(el));
  } else {
    whisperEls.forEach((el) => {
      el.querySelectorAll('.whisper-word').forEach((w) => w.classList.add('is-in'));
    });
  }

  /* --------------------------------------------------------
     Dot cards — count up the value when scrolled into view.
     Each card uses data-count="<target>" and data-format=
     "short" | "impressions" | "raw".
     -------------------------------------------------------- */
  const formatStat = (n, mode) => {
    if (mode === 'impressions') {
      if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(0)}M+`;
      if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K`;
      return String(n);
    }
    // "short" — 1.2M / 777K style
    if (n >= 1_000_000) {
      const v = n / 1_000_000;
      return v >= 10 ? `${Math.round(v)}M` : `${v.toFixed(1).replace(/\.0$/, '')}M`;
    }
    if (n >= 1_000) {
      const v = n / 1_000;
      return v >= 10 ? `${Math.round(v)}K` : `${v.toFixed(1).replace(/\.0$/, '')}K`;
    }
    return String(n);
  };

  const animateCount = (el, target, duration, mode) => {
    const start = performance.now();
    const tick = (now) => {
      const elapsed = now - start;
      const t = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      const value = Math.floor(target * eased);
      el.textContent = formatStat(value, mode);
      if (t < 1) requestAnimationFrame(tick);
      else el.textContent = formatStat(target, mode);
    };
    requestAnimationFrame(tick);
  };

  const dotCards = document.querySelectorAll('[data-dot-card]');
  if (dotCards.length) {
    if (reduceMotion || !('IntersectionObserver' in window)) {
      dotCards.forEach((card) => {
        const target = parseInt(card.dataset.count, 10) || 0;
        const mode   = card.dataset.format || 'short';
        const valEl  = card.querySelector('[data-dot-value]');
        if (valEl) valEl.textContent = formatStat(target, mode);
      });
    } else {
      const dotIO = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            const card   = entry.target;
            const target = parseInt(card.dataset.count, 10) || 0;
            const mode   = card.dataset.format || 'short';
            const valEl  = card.querySelector('[data-dot-value]');
            if (valEl) animateCount(valEl, target, 2000, mode);
            dotIO.unobserve(card);
          });
        },
        { threshold: 0.3 }
      );
      dotCards.forEach((card) => dotIO.observe(card));
    }
  }

  /* --------------------------------------------------------
     Coverflow carousel — center card crisp, neighbors scaled
     down + blurred, far cards hidden. Auto-advances every 4s,
     pauses on hover, supports prev/next + keyboard arrows.
     -------------------------------------------------------- */
  document.querySelectorAll('[data-carousel]').forEach((root) => {
    const cards    = Array.from(root.querySelectorAll('[data-card]'));
    const prevBtn  = root.querySelector('[data-carousel-prev]');
    const nextBtn  = root.querySelector('[data-carousel-next]');
    if (!cards.length) return;

    const total = cards.length;
    let current = Math.floor(total / 2);
    let timerId = null;

    const layout = () => {
      cards.forEach((card, i) => {
        const offset = i - current;
        let pos = ((offset % total) + total) % total;
        if (pos > Math.floor(total / 2)) pos -= total;

        const isCenter   = pos === 0;
        const isAdjacent = Math.abs(pos) === 1;
        const farAway    = Math.abs(pos) > 1;

        const x       = pos * 45;       // %
        const scale   = isCenter ? 1 : isAdjacent ? 0.85 : 0.7;
        const rotY    = pos * -10;      // deg
        const z       = isCenter ? 10 : isAdjacent ? 5 : 1;
        const opacity = isCenter ? 1 : isAdjacent ? 0.4 : 0;
        const blur    = isCenter ? 0 : 4;

        card.style.setProperty('--cf-x',       `${x}%`);
        card.style.setProperty('--cf-scale',   scale);
        card.style.setProperty('--cf-rot',     `${rotY}deg`);
        card.style.setProperty('--cf-z',       z);
        card.style.setProperty('--cf-opacity', opacity);
        card.style.setProperty('--cf-blur',    `${blur}px`);
        card.style.setProperty('--cf-vis',     farAway ? 'hidden' : 'visible');
        card.dataset.pos = pos;
      });
    };

    const next = () => { current = (current + 1) % total; layout(); };
    const prev = () => { current = (current - 1 + total) % total; layout(); };

    const startTimer = () => {
      if (reduceMotion) return;
      stopTimer();
      timerId = setInterval(next, 4000);
    };
    const stopTimer = () => {
      if (timerId) { clearInterval(timerId); timerId = null; }
    };

    if (prevBtn) prevBtn.addEventListener('click', () => { prev(); startTimer(); });
    if (nextBtn) nextBtn.addEventListener('click', () => { next(); startTimer(); });

    // Keyboard support when carousel is focused/hovered
    root.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft')  { prev(); startTimer(); }
      if (e.key === 'ArrowRight') { next(); startTimer(); }
    });

    // Pause auto-advance on hover
    root.addEventListener('mouseenter', stopTimer);
    root.addEventListener('mouseleave', startTimer);

    layout();
    startTimer();
  });

  /* Hero parallax removed — the marquee is the hero's motion anchor now,
     and drifting the title in the centered layout pushed it into the desc. */
})();
