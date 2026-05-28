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

  /* Carousel removed — hero is now just the centered text stack. */

  /* Hero parallax removed — the marquee is the hero's motion anchor now,
     and drifting the title in the centered layout pushed it into the desc. */
})();
