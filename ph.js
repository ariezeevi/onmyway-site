// PostHog (EU servers): page views, taps and a screen recording of the visit, to see what works
// and fix what doesn't. Typed fields are hidden in recordings; no cookies (local storage only).
// Explained in cookies.html and privacy.html.
(function () {
  function clean(url) { return String(url).split(/[?#]/)[0]; }
  var TOKEN = 'phc_knN88EySWFPxqmxnx36rief34w3mJao6jT5pEtrqJCBR';
  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://eu-assets.i.posthog.com/static/array.js';
  s.onload = function () {
    if (!window.posthog) return;
    window.posthog.init(TOKEN, {
      api_host: 'https://eu.i.posthog.com',
      ui_host: 'https://eu.posthog.com',
      defaults: '2026-08-30',
      person_profiles: 'identified_only',
      persistence: 'localStorage',
      capture_exceptions: true,
      // Addresses lose their ?... and #... (an invite link carries a personal code).
      session_recording: { maskAllInputs: true, maskCapturedNetworkRequestFn: function (r) { r.name = clean(r.name); return r; } },
      before_send: function (event) {
        var p = event && event.properties;
        if (p) ['$current_url', '$referrer', '$initial_current_url', '$initial_referrer'].forEach(function (k) {
          if (typeof p[k] === 'string') p[k] = clean(p[k]);
        });
        return event;
      },
    });
  };
  document.head.appendChild(s);
  document.addEventListener('click', function (e) {
    var el = e.target && e.target.closest && e.target.closest('[data-download]');
    if (el && window.posthog && window.posthog.capture) window.posthog.capture('download_clicked');
  });
})();
