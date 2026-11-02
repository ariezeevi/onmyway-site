// App screens carousel: one phone in front, the others beside it.
// Moves by itself only while on screen, stops for good once the visitor takes over,
// and never moves by itself under reduced motion (or the page's "stop animations" switch).
(() => {
  const root = document.getElementById('phones');
  if (!root) return;
  const phones = [...root.querySelectorAll('.phone')];
  const dots = [...document.querySelectorAll('.phones-dots button')];
  const cap = document.getElementById('phones-cap');
  const pauseBtn = document.getElementById('phones-pause');
  const n = phones.length;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let active = 0;
  let timer = 0;
  let inView = false;
  let stopped = reduced.matches;

  const show = (i) => {
    active = (i + n) % n;
    phones.forEach((p, k) => {
      const off = (k - active + n) % n;
      p.dataset.pos = off === 0 ? 'active' : off === 1 ? 'after' : off === n - 1 ? 'before' : 'far';
      p.setAttribute('aria-hidden', off === 0 ? 'false' : 'true');
    });
    dots.forEach((d, k) => d.setAttribute('aria-current', k === active ? 'true' : 'false'));
    cap.textContent = phones[active].querySelector('figcaption').textContent;
  };

  const syncPause = () => {
    pauseBtn.hidden = reduced.matches;
    pauseBtn.setAttribute('aria-label', stopped ? 'הפעל מעבר אוטומטי' : 'עצור מעבר אוטומטי');
    pauseBtn.querySelector('.i-pause').style.display = stopped ? 'none' : '';
    pauseBtn.querySelector('.i-play').style.display = stopped ? '' : 'none';
  };
  const tick = () => {
    clearInterval(timer);
    if (!stopped && inView) timer = setInterval(() => show(active + 1), 4500);
  };
  const takeOver = (i) => { stopped = true; syncPause(); tick(); show(i); };

  document.getElementById('phones-next').addEventListener('click', () => takeOver(active + 1));
  document.getElementById('phones-prev').addEventListener('click', () => takeOver(active - 1));
  dots.forEach((d, k) => d.addEventListener('click', () => takeOver(k)));
  phones.forEach((p, k) => p.addEventListener('click', () => { if (k !== active) takeOver(k); }));
  pauseBtn.addEventListener('click', () => { stopped = !stopped; syncPause(); tick(); });

  // Swipe: in right-to-left, a swipe to the right brings the next screen (it waits on the left)
  let startX = null;
  root.addEventListener('pointerdown', (e) => { startX = e.clientX; });
  root.addEventListener('pointerup', (e) => {
    if (startX === null) return;
    const dx = e.clientX - startX;
    startX = null;
    if (Math.abs(dx) > 40) takeOver(active + (dx > 0 ? 1 : -1));
  });
  root.addEventListener('pointercancel', () => { startX = null; });

  // Arrow keys while focus is inside the carousel (right-to-left: left = next)
  root.closest('.phones-wrap').addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); takeOver(active + 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); takeOver(active - 1); }
  });

  new IntersectionObserver(([e]) => { inView = e.isIntersecting; tick(); }, { threshold: .35 }).observe(root);
  reduced.addEventListener?.('change', () => { if (reduced.matches) stopped = true; syncPause(); tick(); });

  show(0);
  syncPause();
})();
