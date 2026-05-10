/* ============================================================
   [Your Name] — Portfolio
   Vanilla JS: cursor, scroll reveals, hover states, year stamp
   ============================================================ */

(() => {
  'use strict';

  const isTouch = matchMedia('(hover: none)').matches;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

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
