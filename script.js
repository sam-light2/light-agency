/* ============================================================
   [Your Name] — Portfolio
   Vanilla JS: cursor, scroll reveals, hover states, year stamp
   ============================================================ */

(() => {
  'use strict';

  const isTouch = matchMedia('(hover: none)').matches;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* --------------------------------------------------------
     Nav theme toggle: light text over the hero photo,
     dark text once scrolled onto the cream sections.
     -------------------------------------------------------- */
  const nav = document.querySelector('.nav');
  const hero = document.querySelector('.hero');
  if (nav && hero) {
    const navObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // When the hero is mostly out of view, switch nav to dark.
          nav.classList.toggle('nav--dark', !entry.isIntersecting);
        });
      },
      { rootMargin: '-72px 0px 0px 0px', threshold: 0 }
    );
    navObserver.observe(hero);
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
     Custom video player — one instance per .vp
     -------------------------------------------------------- */
  const formatTime = (seconds) => {
    if (!isFinite(seconds) || seconds < 0) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const setupVideoPlayer = (root) => {
    const video       = root.querySelector('.vp__video');
    const playBtn     = root.querySelector('[data-vp-play]');
    const muteBtn     = root.querySelector('[data-vp-mute]');
    const seek        = root.querySelector('[data-vp-seek]');
    const seekFill    = root.querySelector('[data-vp-seek-fill]');
    const vol         = root.querySelector('[data-vp-vol]');
    const volFill     = root.querySelector('[data-vp-vol-fill]');
    const currentEl   = root.querySelector('[data-vp-current]');
    const durationEl  = root.querySelector('[data-vp-duration]');
    const speedBtns   = root.querySelectorAll('[data-vp-speed]');
    if (!video) return;

    // Reflect autoplay state
    const reflectPlayState = () => {
      root.classList.toggle('is-playing', !video.paused);
      root.classList.toggle('is-paused', video.paused);
    };
    reflectPlayState();

    // Initial volume display — videos start muted (loop autoplay)
    const reflectVolume = () => {
      const v = video.muted ? 0 : video.volume;
      volFill.style.width = `${v * 100}%`;
      root.classList.toggle('is-muted', video.muted || v === 0);
      root.classList.toggle('is-vol-low', !video.muted && v > 0 && v <= 0.5);
    };
    reflectVolume();

    // Play / pause
    const toggle = () => { if (video.paused) video.play(); else video.pause(); };
    playBtn.addEventListener('click', toggle);
    video.addEventListener('click', toggle);
    video.addEventListener('play',  reflectPlayState);
    video.addEventListener('pause', reflectPlayState);

    // Mute toggle
    muteBtn.addEventListener('click', () => {
      video.muted = !video.muted;
      if (!video.muted && video.volume === 0) video.volume = 1;
      reflectVolume();
    });

    // Time / progress
    video.addEventListener('loadedmetadata', () => {
      durationEl.textContent = formatTime(video.duration);
    });
    video.addEventListener('timeupdate', () => {
      if (!isFinite(video.duration) || video.duration === 0) return;
      const pct = (video.currentTime / video.duration) * 100;
      seekFill.style.width = `${pct}%`;
      currentEl.textContent = formatTime(video.currentTime);
      if (durationEl.textContent === '0:00') {
        durationEl.textContent = formatTime(video.duration);
      }
    });

    // Generic slider drag handler — works for both seek and volume
    const wireSlider = (track, onPercent) => {
      let dragging = false;
      const update = (clientX) => {
        const rect = track.getBoundingClientRect();
        const pct = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
        onPercent(pct);
      };
      track.addEventListener('mousedown', (e) => {
        dragging = true;
        update(e.clientX);
        e.preventDefault();
      });
      window.addEventListener('mousemove', (e) => { if (dragging) update(e.clientX); });
      window.addEventListener('mouseup',   () => { dragging = false; });
      track.addEventListener('touchstart', (e) => {
        dragging = true;
        update(e.touches[0].clientX);
      }, { passive: true });
      track.addEventListener('touchmove',  (e) => {
        if (dragging) update(e.touches[0].clientX);
      }, { passive: true });
      track.addEventListener('touchend',   () => { dragging = false; });
    };

    wireSlider(seek, (pct) => {
      if (!isFinite(video.duration) || video.duration === 0) return;
      video.currentTime = pct * video.duration;
      seekFill.style.width = `${pct * 100}%`;
    });
    wireSlider(vol, (pct) => {
      video.volume = pct;
      video.muted = pct === 0;
      reflectVolume();
    });

    // Speed buttons
    speedBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const speed = parseFloat(btn.dataset.vpSpeed);
        video.playbackRate = speed;
        speedBtns.forEach((b) => b.classList.toggle('is-active', b === btn));
      });
    });
  };

  document.querySelectorAll('[data-vp]').forEach(setupVideoPlayer);

  /* --------------------------------------------------------
     Optional: parallax-y subtle drift on hero title (only
     when motion is allowed and not on touch).
     -------------------------------------------------------- */
  if (!reduceMotion && !isTouch) {
    const heroTitle = document.querySelector('.hero__title');
    if (heroTitle) {
      let ticking = false;
      window.addEventListener(
        'scroll',
        () => {
          if (!ticking) {
            requestAnimationFrame(() => {
              const y = window.scrollY;
              if (y < window.innerHeight) {
                heroTitle.style.transform = `translateY(${y * 0.08}px)`;
              }
              ticking = false;
            });
            ticking = true;
          }
        },
        { passive: true }
      );
    }
  }
})();
