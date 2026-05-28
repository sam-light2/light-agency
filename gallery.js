/* ============================================================
   Hero depth gallery — Three.js port of the 3d-gallery-photography
   React component. Cloth-shader planes loop through Z space,
   responding to wheel / arrow-key scrubbing with auto-play after
   3s of inactivity. Falls back to a static image if WebGL is
   unavailable.
   ============================================================ */

import * as THREE from 'three';

const DEFAULT_DEPTH_RANGE = 50;
const MAX_HORIZONTAL_OFFSET = 8;
const MAX_VERTICAL_OFFSET = 8;
const VISIBLE_COUNT = 8;
const SPEED = 1;

const FADE = {
  fadeIn:  { start: 0.05, end: 0.25 },
  fadeOut: { start: 0.40, end: 0.43 },
};
const BLUR = {
  blurIn:  { start: 0.00, end: 0.10 },
  blurOut: { start: 0.40, end: 0.43 },
  maxBlur: 8.0,
};

/* ---- WebGL detection ---- */
const hasWebGL = (() => {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl') || c.getContext('experimental-webgl'));
  } catch { return false; }
})();

const container = document.querySelector('[data-gallery]');
if (!container) {
  // Nothing to mount into
} else if (!hasWebGL) {
  container.classList.add('hero__canvas-wrap--no-webgl');
} else {
  initGallery(container);
}

function initGallery(container) {
  /* ---- Image sources from data attribute ---- */
  const sources = (container.dataset.galleryImages || '')
    .split(',').map(s => s.trim()).filter(Boolean);
  if (!sources.length) return;

  /* ---- Renderer / scene / camera ---- */
  const canvas = document.createElement('canvas');
  canvas.className = 'hero__canvas';
  container.appendChild(canvas);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);

  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 200);
  camera.position.set(0, 0, 0);

  const sizeToContainer = () => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  sizeToContainer();
  window.addEventListener('resize', sizeToContainer, { passive: true });

  /* ---- Cloth-style ShaderMaterial factory ----
     WebGL1-compatible: uses a mapSize uniform instead of textureSize() so
     it compiles on both GLSL 1.0 (WebGL1) and GLSL 3.0 (WebGL2). */
  const makeMaterial = () => new THREE.ShaderMaterial({
    transparent: true,
    uniforms: {
      map:         { value: null },
      mapSize:     { value: new THREE.Vector2(1024, 1024) },
      opacity:     { value: 1.0 },
      blurAmount:  { value: 0.0 },
      scrollForce: { value: 0.0 },
      time:        { value: 0.0 },
      isHovered:   { value: 0.0 },
    },
    vertexShader: /* glsl */`
      uniform float scrollForce;
      uniform float time;
      uniform float isHovered;
      varying vec2 vUv;

      void main() {
        vUv = uv;
        vec3 pos = position;

        float curveIntensity = scrollForce * 0.3;
        float distFromCenter = length(pos.xy);
        float curve = distFromCenter * distFromCenter * curveIntensity;

        float ripple1 = sin(pos.x * 2.0 + scrollForce * 3.0) * 0.02;
        float ripple2 = sin(pos.y * 2.5 + scrollForce * 2.0) * 0.015;
        float cloth   = (ripple1 + ripple2) * abs(curveIntensity) * 2.0;

        float flag = 0.0;
        if (isHovered > 0.5) {
          float phase = pos.x * 3.0 + time * 8.0;
          float damp  = smoothstep(-0.5, 0.5, pos.x);
          flag = sin(phase) * 0.1 * damp;
          flag += sin(pos.x * 5.0 + time * 12.0) * 0.03 * damp;
        }

        pos.z -= (curve + cloth + flag);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    fragmentShader: /* glsl */`
      uniform sampler2D map;
      uniform vec2 mapSize;
      uniform float opacity;
      uniform float blurAmount;
      uniform float scrollForce;
      varying vec2 vUv;

      void main() {
        vec4 color = texture2D(map, vUv);

        if (blurAmount > 0.0) {
          vec2 texel = 1.0 / mapSize;
          vec4 acc = vec4(0.0);
          float total = 0.0;
          for (float x = -2.0; x <= 2.0; x += 1.0) {
            for (float y = -2.0; y <= 2.0; y += 1.0) {
              vec2 off = vec2(x, y) * texel * blurAmount;
              float w = 1.0 / (1.0 + length(vec2(x, y)));
              acc += texture2D(map, vUv + off) * w;
              total += w;
            }
          }
          color = acc / total;
        }

        float highlight = abs(scrollForce) * 0.05 * 0.1;
        color.rgb += vec3(highlight);
        gl_FragColor = vec4(color.rgb, color.a * opacity);
      }
    `,
  });

  /* ---- Load textures ---- */
  const loader = new THREE.TextureLoader();
  loader.crossOrigin = 'anonymous';
  const loadTex = (src) => new Promise((resolve) => {
    loader.load(
      src,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.minFilter  = THREE.LinearMipmapLinearFilter;
        tex.magFilter  = THREE.LinearFilter;
        tex.anisotropy = renderer.capabilities.getMaxAnisotropy?.() || 4;
        resolve(tex);
      },
      undefined,
      () => resolve(null)
    );
  });

  Promise.all(sources.map(loadTex)).then((textures) => {
    const valid = textures.filter(Boolean);
    if (!valid.length) {
      container.classList.add('hero__canvas-wrap--no-webgl');
      return;
    }
    buildScene(valid);
  });

  /* ---- Spatial positions (golden-angle distribution) ---- */
  const spatial = [];
  for (let i = 0; i < VISIBLE_COUNT; i++) {
    const ha = (i * 2.618) % (Math.PI * 2);
    const va = (i * 1.618 + Math.PI / 3) % (Math.PI * 2);
    const hr = (i % 3) * 1.2;
    const vr = ((i + 1) % 4) * 0.8;
    spatial.push({
      x: (Math.sin(ha) * hr * MAX_HORIZONTAL_OFFSET) / 3,
      y: (Math.cos(va) * vr * MAX_VERTICAL_OFFSET) / 4,
    });
  }

  function buildScene(textures) {
    container.classList.add('hero__canvas-wrap--ready');

    const total = textures.length;
    const planes = [];

    for (let i = 0; i < VISIBLE_COUNT; i++) {
      const material = makeMaterial();
      const imageIndex = i % total;
      const tex = textures[imageIndex];

      material.uniforms.map.value     = tex;
      material.uniforms.mapSize.value = new THREE.Vector2(tex.image.width, tex.image.height);

      const aspect = tex.image.width / tex.image.height;
      const geo = new THREE.PlaneGeometry(1, 1, 32, 32);
      const mesh = new THREE.Mesh(geo, material);

      // Scale matches the React version: aspect>1 → wide, aspect<1 → tall
      if (aspect > 1) mesh.scale.set(2 * aspect, 2, 1);
      else            mesh.scale.set(2, 2 / aspect, 1);

      const z = (DEFAULT_DEPTH_RANGE / VISIBLE_COUNT) * i;
      mesh.position.set(spatial[i].x, spatial[i].y, z - DEFAULT_DEPTH_RANGE / 2);

      planes.push({ mesh, material, imageIndex, z });
      scene.add(mesh);
    }

    /* ---- Interaction state ---- */
    let scrollVelocity = 0;
    let autoPlay = true;
    let lastInteraction = Date.now();

    const onWheel = (e) => {
      // Only intercept wheel events that occur over the canvas while the
      // hero is in view; otherwise the page can't scroll past the hero.
      const rect = canvas.getBoundingClientRect();
      const heroVisible = rect.bottom > 0 && rect.top < window.innerHeight;
      if (!heroVisible) return;
      scrollVelocity += e.deltaY * 0.01 * SPEED;
      autoPlay = false;
      lastInteraction = Date.now();
    };
    canvas.addEventListener('wheel', onWheel, { passive: true });

    const onKey = (e) => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        scrollVelocity -= 2 * SPEED;
        autoPlay = false; lastInteraction = Date.now();
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        scrollVelocity += 2 * SPEED;
        autoPlay = false; lastInteraction = Date.now();
      }
    };
    document.addEventListener('keydown', onKey);

    /* ---- Hover detection via raycaster (drives flag-wave shader) ---- */
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    let hovered = null;

    canvas.addEventListener('pointermove', (e) => {
      const rect = canvas.getBoundingClientRect();
      ndc.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
      ndc.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
      raycaster.setFromCamera(ndc, camera);
      const hits = raycaster.intersectObjects(planes.map((p) => p.mesh));
      const next = hits.length ? hits[0].object : null;
      if (next !== hovered) {
        if (hovered) hovered.material.uniforms.isHovered.value = 0;
        hovered = next;
        if (hovered) hovered.material.uniforms.isHovered.value = 1;
      }
    });
    canvas.addEventListener('pointerleave', () => {
      if (hovered) hovered.material.uniforms.isHovered.value = 0;
      hovered = null;
    });

    /* ---- Resume auto-play after 3s of inactivity ---- */
    setInterval(() => {
      if (Date.now() - lastInteraction > 3000) autoPlay = true;
    }, 1000);

    /* ---- Pause rendering when hero isn't visible (perf) ---- */
    let heroOnScreen = true;
    const visObserver = new IntersectionObserver(
      ([entry]) => { heroOnScreen = entry.isIntersecting; },
      { threshold: 0 }
    );
    visObserver.observe(container);

    /* ---- Animation loop ---- */
    const clock = new THREE.Clock();
    const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const totalRange = DEFAULT_DEPTH_RANGE;
    const halfRange  = totalRange / 2;

    const tick = () => {
      requestAnimationFrame(tick);
      if (!heroOnScreen) return;

      const delta = clock.getDelta();
      const time  = clock.getElapsedTime();

      if (autoPlay && !reduceMotion) scrollVelocity += 0.3 * delta;
      scrollVelocity *= 0.95;

      planes.forEach((p) => {
        let newZ = p.z + scrollVelocity * delta * 10;
        newZ = ((newZ % totalRange) + totalRange) % totalRange;
        p.z = newZ;

        const worldZ = p.z - halfRange;
        p.mesh.position.z = worldZ;

        const u = p.material.uniforms;
        u.time.value        = time;
        u.scrollForce.value = scrollVelocity;

        const t = p.z / totalRange;

        // Opacity ramp
        let opacity;
        if      (t < FADE.fadeIn.start)                                        opacity = 0;
        else if (t <= FADE.fadeIn.end)                                         opacity = (t - FADE.fadeIn.start) / (FADE.fadeIn.end - FADE.fadeIn.start);
        else if (t >= FADE.fadeOut.start && t <= FADE.fadeOut.end)             opacity = 1 - (t - FADE.fadeOut.start) / (FADE.fadeOut.end - FADE.fadeOut.start);
        else if (t > FADE.fadeOut.end)                                         opacity = 0;
        else                                                                   opacity = 1;
        u.opacity.value = Math.max(0, Math.min(1, opacity));

        // Blur ramp
        let blur;
        if      (t < BLUR.blurIn.start)                                        blur = BLUR.maxBlur;
        else if (t <= BLUR.blurIn.end)                                         blur = BLUR.maxBlur * (1 - (t - BLUR.blurIn.start) / (BLUR.blurIn.end - BLUR.blurIn.start));
        else if (t >= BLUR.blurOut.start && t <= BLUR.blurOut.end)             blur = BLUR.maxBlur * ((t - BLUR.blurOut.start) / (BLUR.blurOut.end - BLUR.blurOut.start));
        else if (t > BLUR.blurOut.end)                                         blur = BLUR.maxBlur;
        else                                                                   blur = 0;
        u.blurAmount.value = Math.max(0, Math.min(BLUR.maxBlur, blur));
      });

      renderer.render(scene, camera);
    };
    tick();
  }
}
