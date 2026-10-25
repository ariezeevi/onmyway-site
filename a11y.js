// Accessibility helpers, loaded first on every page:
// - a manual "stop animations" switch (for people whose device setting is not on),
//   which makes every script treat the page as "reduced motion".
(() => {
  const root = document.documentElement;
  const real = window.matchMedia.bind(window);
  let calm = false;
  try { calm = localStorage.getItem('omw.calm') === '1'; } catch { /* storage may be blocked */ }
  if (calm) root.classList.add('calm');
  window.matchMedia = (q) => (/prefers-reduced-motion:\s*reduce/.test(q) && root.classList.contains('calm')
    ? { matches: true, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }
    : real(q));
  addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('calm');
    if (!btn) return;
    if (real('(prefers-reduced-motion: reduce)').matches) {
      btn.textContent = 'האנימציות מופחתות לפי הגדרת המכשיר';
      btn.disabled = true;
      return;
    }
    const on = root.classList.contains('calm');
    btn.setAttribute('aria-pressed', String(on));
    btn.textContent = on ? 'הפעל אנימציות' : 'עצור אנימציות';
    btn.addEventListener('click', () => {
      try { localStorage.setItem('omw.calm', on ? '0' : '1'); } catch { /* ignore */ }
      location.reload();
    });
  });
})();
