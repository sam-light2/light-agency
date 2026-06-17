/* ============================================================
   [Your Name] — Portfolio
   Vanilla JS: cursor, scroll reveals, hover states, year stamp
   ============================================================ */

(() => {
  'use strict';

  const isTouch = matchMedia('(hover: none)').matches;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* --------------------------------------------------------
     Nav theme: transparent (cream text) over the photo hero,
     crossfades to the frosted cream backdrop once the hero
     scrolls out of view.
     -------------------------------------------------------- */
  const nav = document.querySelector('.nav');
  const heroSection = document.querySelector('.hero');

  if (nav && heroSection) {
    const navObserver = new IntersectionObserver(
      ([entry]) => {
        // Hero visible → transparent nav. Hero gone → dark nav.
        nav.classList.toggle('nav--dark', !entry.isIntersecting);
      },
      { threshold: 0.08 }
    );
    navObserver.observe(heroSection);
  } else if (nav) {
    // No hero on page — always use dark nav.
    nav.classList.add('nav--dark');
  }

  /* --------------------------------------------------------
     Work videos — reliable mobile playback.
     Mobile browsers often refuse to autoplay several <video>
     elements at once (data-saver / battery policies), and iOS
     only honours `muted` when it's set as a JS property. We
     enforce muted + inline, then play/pause based on viewport
     visibility so only on-screen clips run.
     -------------------------------------------------------- */
  const workVideos = document.querySelectorAll('.work__video');
  if (workVideos.length) {
    workVideos.forEach((v) => {
      v.muted = true;            // property form — required by iOS
      v.defaultMuted = true;
      v.playsInline = true;
      v.setAttribute('muted', '');
      v.setAttribute('playsinline', '');
      v.setAttribute('webkit-playsinline', '');
      // `preload="metadata"` only fetches duration/dimensions — mobile then
      // paints a black rectangle until playback starts. `auto` pulls enough
      // data to render the first frame, so the clip is visible immediately.
      v.preload = 'auto';
      // Force the decoder to surface a poster frame even if autoplay is
      // blocked (Low Power Mode / data-saver), so it never looks empty.
      v.addEventListener('loadeddata', () => {
        if (v.paused && v.currentTime === 0) {
          try { v.currentTime = 0.05; } catch (_) {}
        }
      }, { once: true });
    });

    const tryPlay = (v) => {
      const p = v.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    };

    // Videos currently on-screen — a later user gesture retries these.
    const onScreen = new Set();

    if ('IntersectionObserver' in window) {
      const videoIO = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              onScreen.add(entry.target);
              tryPlay(entry.target);
            } else {
              onScreen.delete(entry.target);
              entry.target.pause();
            }
          });
        },
        // Low threshold + margin so tall 9:16 clips (taller than a phone
        // viewport) reliably trigger and start a touch before they enter.
        { threshold: 0.01, rootMargin: '0px 0px 12% 0px' }
      );
      workVideos.forEach((v) => videoIO.observe(v));
    } else {
      workVideos.forEach(tryPlay);
    }

    // Mobile browsers gate muted autoplay behind a user gesture. The first
    // tap/scroll satisfies that, so retry the on-screen clips (or all of
    // them) once, then detach the listeners.
    const unlock = () => {
      const targets = onScreen.size ? onScreen : new Set(workVideos);
      targets.forEach(tryPlay);
      window.removeEventListener('touchstart', unlock);
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('scroll', unlock);
    };
    window.addEventListener('touchstart', unlock, { passive: true });
    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('scroll', unlock, { passive: true });
  }

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
     Logo cloud — infinite horizontal scroll, slows on hover
     -------------------------------------------------------- */
  (function () {
    const track = document.getElementById('logoTrack');
    if (!track) return;

    const mask = track.parentElement;
    let pos = 0;
    let currentSpeed = 0;
    const normalSpeed = 0.9;
    const hoverSpeed  = 0.22;
    let hovering = false;
    let started  = false;

    function tick() {
      const target = hovering ? hoverSpeed : normalSpeed;
      currentSpeed += (target - currentSpeed) * 0.05;

      pos -= currentSpeed;
      const half = track.scrollWidth / 2;
      if (half > 0 && pos < -half) pos += half;

      track.style.transform = `translateX(${pos}px)`;
      requestAnimationFrame(tick);
    }

    function start() {
      if (started) return;
      started = true;
      requestAnimationFrame(tick);
    }

    mask.addEventListener('mouseenter', () => { hovering = true; });
    mask.addEventListener('mouseleave', () => { hovering = false; });

    // Start as soon as any pixel of the section enters view.
    // rootMargin fires 80px before the section reaches the bottom of the
    // viewport so the track is already moving when eyes land on it.
    const cloudSection = track.closest('.logo-cloud');
    if (cloudSection && 'IntersectionObserver' in window) {
      const cloudIO = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) { cloudIO.disconnect(); start(); }
      }, { threshold: 0, rootMargin: '0px 0px -80px 0px' });
      cloudIO.observe(cloudSection);
    } else {
      start();
    }
  }());

  /* Carousel removed — hero is now just the centered text stack. */

  /* Hero parallax removed — the marquee is the hero's motion anchor now,
     and drifting the title in the centered layout pushed it into the desc. */
})();
