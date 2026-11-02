// The "open the app" buttons ([data-download]):
//  - a phone: straight to the web app (it shows its own install steps there)
//  - the browser inside Instagram, Facebook and similar apps: "open in a real browser" first, copy the link second
//  - a computer: a QR code for the phone, or open it here
// Every link carries ?src=site-<button>[-<channel>] so the app can count which button (and which channel,
// e.g. an Instagram link onmyway.co.il/?src=ig) brought the visit (logged as 'from_site' in app_events).
(() => {
  const APP = 'https://onmyway.co.il/app/';
  const ua = navigator.userAgent || '';
  const instagram = /Instagram/i.test(ua);
  const inApp = instagram || /FBAN|FBAV|FB_IAB|FBIOS|TikTok|musical_ly|Line\//i.test(ua);
  const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const android = /Android/i.test(ua);
  const desktop = !inApp && !(ios || android);

  const clean = (v) => (v || '').toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 20);
  const channel = clean(new URLSearchParams(location.search).get('src')) || (instagram ? 'ig' : inApp ? 'inapp' : '');
  const appUrl = (button) => `${APP}?src=${encodeURIComponent(['site', clean(button) || 'link', channel].filter(Boolean).join('-'))}`;

  // Hand the page to the phone's real browser (best effort: Android Chrome intent, iOS Safari scheme)
  const browserUrl = (url) => {
    const u = new URL(url);
    if (android) return `intent://${u.host}${u.pathname}${u.search}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(url)};end`;
    if (ios) return `x-safari-${url}`;
    return url;
  };

  const copyLink = async (btn, url) => {
    try { await navigator.clipboard.writeText(url); btn.textContent = 'הועתק ✓'; }
    catch { btn.textContent = 'לחצו והחזיקו על הכתובת'; }
  };

  // Every button points at the app with its own tag, so it also works without the sheet
  document.querySelectorAll('[data-download]').forEach((a) => { a.href = appUrl(a.dataset.src); });

  // In-app browser: the banner at the top
  const banner = document.getElementById('inapp');
  if (inApp && banner) {
    banner.hidden = false;
    const open = document.getElementById('inapp-open');
    if (open) open.href = browserUrl(appUrl('banner'));
    const copy = document.getElementById('inapp-copy');
    copy?.addEventListener('click', () => copyLink(copy, appUrl('banner')));
    document.getElementById('inapp-x')?.addEventListener('click', () => { banner.hidden = true; });
  }

  const dlg = document.getElementById('get');
  if (!dlg || typeof dlg.showModal !== 'function') return;        // old browser: the plain links still work
  if (!inApp && !desktop) return;                                  // a phone browser: the links go straight to the app

  const env = inApp ? 'inapp' : 'desktop';
  dlg.querySelectorAll('.get-body').forEach((b) => { b.hidden = b.dataset.env !== env; });
  dlg.setAttribute('aria-labelledby', `get-h-${env}`);
  const tryOpen = document.getElementById('get-try');
  const copy = document.getElementById('get-copy');
  const here = document.getElementById('get-here');
  let current = APP;

  document.querySelectorAll('[data-download]').forEach((a) => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      current = appUrl(a.dataset.src);
      if (tryOpen) tryOpen.href = browserUrl(current);
      if (here) here.href = current;
      if (copy) copy.textContent = 'העתק קישור';
      dlg.showModal();
    });
  });
  copy?.addEventListener('click', () => copyLink(copy, current));

  document.getElementById('get-x')?.addEventListener('click', () => dlg.close());
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });   // click outside the card
})();

// WhatsApp share: same text, with the link tagged so a friend's visit counts as 'wa'
(() => {
  const a = document.getElementById('share-wa');
  if (!a) return;
  const text = 'מצאתי אפליקציה שמחברת נהגים שכבר נוסעים עם מי שצריך טרמפ לאותו כיוון. חינם: https://onmyway.co.il/?src=wa';
  a.href = `https://wa.me/?text=${encodeURIComponent(text)}`;
})();
