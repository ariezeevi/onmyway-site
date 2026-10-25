// The download buttons open a small sheet:
//  - phone: "which phone?" (Android / iPhone), then the install steps for that phone and a button
//    that opens the web app (which shows its own install sheet there)
//  - the browser inside Instagram, Facebook and similar apps: how to open a real browser
//  - a computer: a QR code for the phone
(() => {
  const APP = 'https://onmyway.co.il/app/';
  const ua = navigator.userAgent || '';
  const inApp = /Instagram|FBAN|FBAV|FB_IAB|FBIOS|TikTok|musical_ly|Line\//i.test(ua);
  const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const android = /Android/i.test(ua);
  const env = inApp ? 'inapp' : (ios || android ? 'phone' : 'desktop');

  const dlg = document.getElementById('get');
  if (!dlg || typeof dlg.showModal !== 'function') return;        // old browser: the plain link still works
  const bodies = [...dlg.querySelectorAll('.get-body')];
  const show = (name) => bodies.forEach((b) => { b.hidden = b.dataset.env !== name; });
  const steps = [...dlg.querySelectorAll('.get-step')];

  // Show one step of the phone flow, keep the dialog's name in sync, and move focus to its heading
  const goStep = (name, focus = true) => {
    steps.forEach((x) => { x.hidden = x.dataset.step !== name; });
    const h = dlg.querySelector(`.get-step[data-step="${name}"] h2`);
    if (h) dlg.setAttribute('aria-labelledby', h.id);
    if (focus && h) h.focus({ preventScroll: true });
  };

  // Mark the phone we think this is, but still ask
  const guess = ios ? 'ios' : android ? 'android' : null;
  dlg.querySelectorAll('.choice').forEach((c) => {
    c.addEventListener('click', () => goStep(c.dataset.pick));
    if (c.dataset.pick === guess) { c.classList.add('is-guess'); c.querySelector('.choice-tag').hidden = false; }
  });
  dlg.querySelectorAll('[data-back]').forEach((b) => b.addEventListener('click', () => goStep('choose')));

  document.querySelectorAll('[data-download]').forEach((a) => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      show(env === 'phone' ? 'phone' : env);
      if (env === 'phone') goStep('choose', false);
      else dlg.setAttribute('aria-labelledby', env === 'desktop' ? 'get-h-desktop' : 'get-h-inapp');
      dlg.showModal();
    });
  });

  const close = () => dlg.close();
  document.getElementById('get-x')?.addEventListener('click', close);
  dlg.addEventListener('click', (e) => { if (e.target === dlg) close(); });   // click outside the card

  // In-app browser: copy the link, or try to hand the page to the real browser
  const copy = document.getElementById('get-copy');
  copy?.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(APP); copy.textContent = 'הועתק ✓'; }
    catch { copy.textContent = 'לחץ והחזק על הכתובת'; }
  });
  const tryOpen = document.getElementById('get-try');
  if (tryOpen && inApp) {
    tryOpen.href = android
      ? `intent://onmyway.co.il/app/#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(APP)};end`
      : ios ? 'x-safari-https://onmyway.co.il/app/' : APP;
  }
})();
