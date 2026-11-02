// App screens on a 3D ring. It turns by itself, a drag turns it by hand and the throw carries on,
// slowing with friction until the slow automatic turn takes over again. No snapping.
// Turns by itself only while on screen, and never under reduced motion or "stop animations".
(() => {
  const stage = document.getElementById('ring');
  if (!stage) return;
  const imgs = [...stage.querySelectorAll('img')];
  if (imgs.length < 3) return;
  // A fuller ring: repeat screens until there are 8 cards (repeats are hidden from screen readers)
  // (taken from across the ring, so a screen never stands next to its own copy)
  for (let i = 2; imgs.length < 8; i += 2) {
    const copy = imgs[i % imgs.length].cloneNode();
    copy.alt = '';
    copy.setAttribute('aria-hidden', 'true');
    imgs.push(copy);
  }
  const n = imgs.length;

  const SPEED = 24;           // degrees per second, turning right
  const DEG_PER_PX = 1.5;     // drag: degrees per pixel
  const FRICTION = 0.94;      // speed kept each frame after a throw
  const SPACING = 1 + 3 * 0.15;

  // Build: tilt > spin > one card per screen, with a front face and a dimmed rear face
  const tilt = document.createElement('div');
  tilt.className = 'ring-tilt';
  const spin = document.createElement('div');
  spin.className = 'ring-spin';
  tilt.append(spin);
  const cards = imgs.map((img) => {
    const card = document.createElement('figure');
    card.className = 'ring-card';
    const front = document.createElement('div');
    front.className = 'ring-face';
    front.append(img);
    const back = document.createElement('div');
    back.className = 'ring-face ring-face--back';
    back.setAttribute('aria-hidden', 'true');
    const copy = img.cloneNode();
    copy.alt = '';
    back.append(copy);
    card.append(front, back);
    spin.append(card);
    return card;
  });
  stage.append(tilt);

  let radius = 0;
  const layout = () => {
    const w = spin.offsetWidth;
    radius = (w * SPACING) / (2 * Math.tan(Math.PI / n));
    cards.forEach((c, i) => { c.style.transform = `rotateY(${(360 / n) * i}deg) translateZ(${radius}px)`; });
  };

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const pauseBtn = document.getElementById('ring-pause');
  let auto = !reduced.matches;
  let rot = 0;
  let vel = 0;
  let last = 0;
  let inView = false;
  let raf = 0;
  const drag = { on: false, x: 0, y: 0, decided: false };

  const apply = () => { spin.style.transform = `translateZ(${-radius}px) rotateY(${rot}deg)`; };
  const frame = (now) => {
    const dt = last ? Math.min((now - last) / 1000, 0.1) : 0;
    last = now;
    if (!drag.on) {
      if (Math.abs(vel) > 4) { rot += vel * dt; vel *= FRICTION ** (dt * 60); }
      else { vel = 0; if (auto) rot += SPEED * dt; }
    }
    apply();
    raf = inView ? requestAnimationFrame(frame) : 0;
  };
  const start = () => { if (!raf && inView) { last = 0; raf = requestAnimationFrame(frame); } };

  // Horizontal drag turns the ring; a vertical move is left to the page so it still scrolls
  stage.addEventListener('pointerdown', (e) => {
    drag.on = true; drag.decided = false; drag.x = e.clientX; drag.y = e.clientY; vel = 0;
  });
  stage.addEventListener('pointermove', (e) => {
    if (!drag.on) return;
    const dx = e.clientX - drag.x;
    if (!drag.decided) {
      if (Math.abs(dx) < 4 && Math.abs(e.clientY - drag.y) < 4) return;
      drag.decided = true;
      if (Math.abs(e.clientY - drag.y) > Math.abs(dx)) { drag.on = false; return; }
      stage.setPointerCapture?.(e.pointerId);
      stage.classList.add('is-dragging');
    }
    drag.x = e.clientX;
    rot += dx * DEG_PER_PX;
    vel = dx * DEG_PER_PX * 60;
    apply();
    start();
  });
  const end = () => { drag.on = false; stage.classList.remove('is-dragging'); };
  stage.addEventListener('pointerup', end);
  stage.addEventListener('pointercancel', end);

  // Keyboard: arrows turn it one screen
  stage.tabIndex = 0;
  stage.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    vel = (e.key === 'ArrowRight' ? 1 : -1) * 360;
    start();
  });

  const syncPause = () => {
    if (!pauseBtn) return;
    pauseBtn.hidden = reduced.matches;
    pauseBtn.querySelector('.i-pause').style.display = auto ? '' : 'none';
    pauseBtn.querySelector('.i-play').style.display = auto ? 'none' : '';
    pauseBtn.querySelector('span').textContent = auto ? 'עצור סיבוב' : 'הפעל סיבוב';
  };
  pauseBtn?.addEventListener('click', () => { auto = !auto; syncPause(); });
  reduced.addEventListener?.('change', () => { if (reduced.matches) auto = false; syncPause(); });

  new IntersectionObserver(([e]) => { inView = e.isIntersecting; start(); }, { threshold: 0.1 }).observe(stage);
  new ResizeObserver(() => { layout(); apply(); }).observe(spin);

  layout();
  apply();
  syncPause();
})();
