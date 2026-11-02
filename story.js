// "How it works" as a scroll story: the scroll position picks a frame of the Dreamina clips,
// the real app screen is mapped onto the phone in the scene, and the side card says what happens.
// Without JS, with reduced motion or the calm switch, the plain list of steps shows instead (CSS).
(function () {
  const root = document.documentElement;
  const section = document.querySelector('.story');
  if (!section) return;
  const track = section.querySelector('.story-track');
  const canvas = section.querySelector('.story-canvas');
  const onscreen = section.querySelector('.story-onscreen');
  const side = section.querySelector('.story-side');
  const phoneImg = section.querySelector('.story-phone img');
  const cap = section.querySelector('.story-cap');
  const capN = cap.querySelector('.story-n');
  const capP = cap.querySelector('p');
  const bar = section.querySelector('.story-bar span');
  const steps = [...section.querySelectorAll('.story-steps li')].map((li) => ({
    screen: li.dataset.screen,
    who: li.querySelector('.story-who').textContent,
    title: li.querySelector('h3').textContent,
    text: li.querySelector('p').innerHTML,
  }));

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const live = () => !reduced.matches && !root.classList.contains('calm');

  // Frames: clip 1 (driver → out of the window → the stop, cut before the close-up), clip 2 (mirrored: the car arrives), the in-car still
  const pad = (n) => String(n).padStart(3, '0');
  const F1 = Array.from({ length: 38 }, (_, i) => `story/f1/${pad(i + 1)}.webp`);
  const F2 = Array.from({ length: 50 }, (_, i) => `story/f2/${pad(i + 1)}.webp`);
  const K4 = 'story/k4.webp';

  // Where the blank phone screen sits in a frame, as fractions of the frame (TL, TR, BR, BL)
  const Q1 = [[549 / 960, 296 / 540], [605 / 960, 297 / 540], [599 / 960, 410 / 540], [538 / 960, 408 / 540]];
  const Q2 = [[415 / 960, 206 / 540], [494 / 960, 214 / 540], [482 / 960, 372 / 540], [400 / 960, 365 / 540]];
  const Q4 = [[606 / 1280, 302 / 720], [667 / 1280, 302 / 720], [667 / 1280, 428 / 720], [605 / 1280, 428 / 720]];

  // The timeline over the section's scroll (0..1). side: which side the card sits on (desktop).
  const SEG = [
    { t: [0, .11], hold: F1[0], step: 0, quad: Q1, fx: .56, side: 'r' },
    { t: [.11, .37], scrub: F1, step: 0, fx: [.56, .5], side: 'r' },
    { t: [.37, .42], fade: [F1[37], F2[0]], step: 1, fx: [.5, .45], side: 'r' },
    { t: [.42, .54], hold: F2[0], step: 1, quad: Q2, fx: .45, side: 'r' },
    { t: [.54, .65], hold: F2[0], step: 2, quad: Q2, screenOf: 1, fx: .45, side: 'r' },
    { t: [.65, .85], scrub: F2, step: 3, fx: [.45, .58], side: 'r' },
    { t: [.85, .9], fade: [F2[49], K4], step: 4, fx: [.58, .5], side: 'l' },
    { t: [.9, 1.0001], hold: K4, step: 4, quad: Q4, fx: .5, zoom: true, side: 'l' },
  ];

  const cache = new Map();
  const img = (src) => {
    let im = cache.get(src);
    if (!im) { im = new Image(); im.decoding = 'async'; im.src = src; cache.set(src, im); }
    return im;
  };
  const ready = (src) => { const im = cache.get(src); return im && im.complete && im.naturalWidth > 0 ? im : null; };
  let loaded = false;
  const loadAll = () => {
    if (loaded) return; loaded = true;
    [F1[0], F2[0], K4, ...F1, ...F2].forEach((src) => img(src).addEventListener('load', () => draw(false), { once: true }));
    steps.forEach((s) => img(s.screen));
  };

  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, dpr = 1;
  const resize = () => {
    const r = canvas.getBoundingClientRect();
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = Math.round(r.width * dpr); H = Math.round(r.height * dpr);
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    draw(true);
  };

  // Cover-fit an image into the canvas around a focal x; returns the mapping for overlays
  const fit = (im, fx, scale) => {
    const s = Math.max(W / im.naturalWidth, H / im.naturalHeight) * (scale || 1);
    const dw = im.naturalWidth * s, dh = im.naturalHeight * s;
    const ox = Math.min(0, Math.max(W - dw, W / 2 - fx * dw));
    const oy = (H - dh) / 2;
    return { s, dw, dh, ox, oy };
  };
  const paint = (im, m, a) => { ctx.globalAlpha = a; ctx.drawImage(im, m.ox, m.oy, m.dw, m.dh); ctx.globalAlpha = 1; };

  // Nearest frame that has loaded, so fast scrolling never shows a blank canvas
  const nearest = (list, i) => {
    for (let d = 0; d < list.length; d++) {
      const a = ready(list[i - d]); if (a) return a;
      const b = ready(list[i + d]); if (b) return b;
    }
    return null;
  };

  // CSS matrix3d that maps a w×h box onto a quad (homography)
  const homography = (w, h, q) => {
    const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = q;
    const src = [[0, 0], [w, 0], [w, h], [0, h]], dst = [[x0, y0], [x1, y1], [x2, y2], [x3, y3]];
    const A = [], B = [];
    for (let i = 0; i < 4; i++) {
      const [sx, sy] = src[i], [dx, dy] = dst[i];
      A.push([sx, sy, 1, 0, 0, 0, -sx * dx, -sy * dx]); B.push(dx);
      A.push([0, 0, 0, sx, sy, 1, -sx * dy, -sy * dy]); B.push(dy);
    }
    for (let c = 0; c < 8; c++) { // Gaussian elimination
      let p = c; for (let r = c + 1; r < 8; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
      [A[c], A[p]] = [A[p], A[c]]; [B[c], B[p]] = [B[p], B[c]];
      for (let r = 0; r < 8; r++) {
        if (r === c) continue;
        const f = A[r][c] / A[c][c];
        for (let k = c; k < 8; k++) A[r][k] -= f * A[c][k];
        B[r] -= f * B[c];
      }
    }
    const [a, b, c, d, e, f, g, hh] = B.map((v, i) => v / A[i][i]);
    return `matrix3d(${a},${d},0,${g},${b},${e},0,${hh},0,0,1,0,${c},${f},0,1)`;
  };

  const ease = (x) => x * x * (3 - 2 * x);
  const lerp = (a, b, t) => a + (b - a) * t;
  let progress = 0, shownStep = -1, shownSide = '', shownScreen = '';

  function draw(force) {
    if (!W) return;
    const p = progress;
    const seg = SEG.find((s) => p >= s.t[0] && p < s.t[1]) || SEG[SEG.length - 1];
    const local = Math.min(1, Math.max(0, (p - seg.t[0]) / (seg.t[1] - seg.t[0])));
    const fx = Array.isArray(seg.fx) ? lerp(seg.fx[0], seg.fx[1], local) : seg.fx;
    // Until a frame has loaded, the last picture stays on the canvas (never a blank stage)
    let m = null;
    if (seg.hold) {
      const im = ready(seg.hold) || img(seg.hold);
      if (im.naturalWidth) { m = fit(im, fx, seg.zoom ? 1 + .06 * ease(local) : 1); ctx.clearRect(0, 0, W, H); paint(im, m, 1); }
    } else if (seg.scrub) {
      const i = Math.round(local * (seg.scrub.length - 1));
      const im = nearest(seg.scrub, i);
      if (im) { ctx.clearRect(0, 0, W, H); paint(im, fit(im, fx), 1); }
    } else if (seg.fade) {
      const a = ready(seg.fade[0]), b = ready(seg.fade[1]);
      if (a) { ctx.clearRect(0, 0, W, H); paint(a, fit(a, fx), 1); }
      if (b) paint(b, fit(b, fx), ease(local));
    }

    // The real screen on the phone in the scene, faded in and out at the edges of the hold
    if (m && seg.quad) {
      const edge = Math.min(local, 1 - local) * (seg.t[1] - seg.t[0]);
      const a = Math.min(1, Math.max(0, edge / .015));
      const q = seg.quad.map(([x, y]) => [(m.ox + x * m.dw) / dpr, (m.oy + y * m.dh) / dpr]);
      const src = steps[seg.screenOf ?? seg.step].screen;
      if (onscreen.getAttribute('src') !== src) onscreen.src = src;
      if (onscreen.naturalWidth) {
        onscreen.style.width = onscreen.naturalWidth + 'px';
        onscreen.style.height = onscreen.naturalHeight + 'px';
        onscreen.style.transform = homography(onscreen.naturalWidth, onscreen.naturalHeight, q);
      }
      onscreen.style.opacity = a.toFixed(3);
    } else onscreen.style.opacity = 0;

    if (seg.step !== shownStep || force) {
      shownStep = seg.step;
      const s = steps[seg.step];
      cap.classList.remove('is-in'); void cap.offsetWidth; cap.classList.add('is-in');
      capN.textContent = `${seg.step + 1}/${steps.length} · ${s.who}`;
      capP.innerHTML = `<b class="story-title">${s.title}</b> ${s.text}`;
      if (shownScreen !== s.screen) {
        shownScreen = s.screen;
        side.classList.add('is-swapping');
        setTimeout(() => { phoneImg.src = s.screen; side.classList.remove('is-swapping'); }, 160);
      }
    }
    if (seg.side !== shownSide) { shownSide = seg.side; side.dataset.side = seg.side; }
    bar.style.transform = `scaleX(${p.toFixed(4)})`;
  }

  let raf = 0;
  const onScroll = () => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      const r = track.getBoundingClientRect();
      const total = r.height - innerHeight;
      progress = Math.min(1, Math.max(0, -r.top / total));
      draw(false);
    });
  };

  const start = () => {
    if (!live()) { section.classList.remove('story--live'); return; }
    section.classList.add('story--live');
    resize(); onScroll();
  };
  new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) loadAll(); }, { rootMargin: '150% 0px' }).observe(section);
  // The page's floating download button would cover the step text on phones; it steps aside while the story plays
  new IntersectionObserver((es) => es.forEach((e) => root.classList.toggle('story-on', e.isIntersecting && section.classList.contains('story--live')))).observe(track);
  img(F1[0]).addEventListener('load', () => draw(true));
  onscreen.addEventListener('load', () => draw(true));
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', () => { if (section.classList.contains('story--live')) resize(); });
  reduced.addEventListener('change', start);
  new MutationObserver(start).observe(root, { attributes: true, attributeFilter: ['class'] });
  start();
})();
