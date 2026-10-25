// On My Way site: the scroll is the drive.
// The road is drawn up to the reading line, a car rides its tip, passes the
// first hitchhiker without stopping, and stops for the second one.
(() => {
  const NS = 'http://www.w3.org/2000/svg';
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');

  const journey = document.querySelector('.journey');
  const road = journey.querySelector('.road');
  const $ = (s) => road.querySelector(s);
  const paths = ['.r-ghost', '.r-casing', '.r-road', '.r-line', '.r-mask'].map($);
  const [ghost, casing, asphalt, line, mask] = paths;
  const car = $('.car'), carBody = $('.car-body'), startDot = $('.r-start'), endDot = $('.r-end');
  const ridersLayer = $('.riders');
  const grad = road.querySelector('#rg');
  const peak = document.getElementById('peak');
  const stepSecs = [...document.querySelectorAll('.stop--steps')].map((sec) => ({
    sec, n: +sec.dataset.steps, cur: -1,
    items: [...sec.querySelectorAll('[data-i]')],
    weather: sec.querySelector('[data-w]'),
  }));
  const WEATHER = ['heat', 'cold', 'rain', 'hail', 'pass'];
  const heroMark = document.querySelector('.mark');
  const bar = document.getElementById('bar');
  const barCta = bar.querySelector('.cta');

  const HEAD = 0.56; // the reading line, as a share of the viewport height
  let W = 0, vh = 0, jTop = 0, total = 0, mobile = false;
  let ys = new Float32Array(0), xs = ys, ls = ys;
  let startY = 0, endY = 0, riders = [], pickup = null;

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const ease = (t) => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  const el = (tag, attrs, parent) => {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  };

  function centerY(node) {
    const r = node.getBoundingClientRect();
    return r.top + scrollY - jTop + r.height / 2;
  }

  function layout() {
    vh = innerHeight;
    W = journey.clientWidth;
    mobile = W < 760;
    jTop = journey.getBoundingClientRect().top + scrollY;
    const H = journey.offsetHeight;
    road.setAttribute('width', W);
    road.setAttribute('height', H);
    road.setAttribute('viewBox', `0 0 ${W} ${H}`);
    grad.setAttribute('y2', H);

    // The road swings to the side the card is not on (RTL: "start" is the right)
    const lane = (side) => {
      if (mobile) return side === 'start' ? W * .075 : side === 'end' ? W * .925 : W * .5;
      return side === 'start' ? W * .27 : side === 'end' ? W * .73 : W * .5;
    };
    stepSecs.forEach((s) => s.sec.style.setProperty('--n', s.n));

    // Anchors: the start, one per stop, the destination
    const pts = [];
    const start = journey.querySelector('.road-start');
    pts.push({ x: W * .5, y: start.offsetTop + 6 });
    const stops = [...journey.querySelectorAll('[data-road]')];
    riders = [];
    stops.forEach((s) => {
      const side = s.dataset.side || s.closest('.stop')?.dataset.side;
      const x = lane(side);
      // A long scrolling section: the road runs beside it, gently waving
      if (s.classList.contains('stop--steps')) {
        const top = s.getBoundingClientRect().top + scrollY - jTop, h = s.offsetHeight;
        const y0 = top + vh * .5, y1 = top + h - vh * .5;
        const n = Math.max(1, Math.round((y1 - y0) / (vh * .75)));
        for (let k = 0; k <= n; k++) {
          const wob = k === 0 || k === n || mobile ? 0 : (k % 2 ? 1 : -1) * W * .035;
          pts.push({ x: x + wob, y: y0 + (y1 - y0) * k / n });
        }
        return;
      }
      const p = { x, y: centerY(s) };
      pts.push(p);
      if (s.dataset.rider) {
        const off = mobile ? (side === 'start' ? 44 : -44) : (side === 'start' ? 110 : -110);
        riders.push({ kind: s.dataset.rider, x: p.x + off, y: p.y });
      }
    });

    let d = `M${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i], k = (b.y - a.y) * .5;
      d += ` C${a.x.toFixed(1)} ${(a.y + k).toFixed(1)} ${b.x.toFixed(1)} ${(b.y - k).toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
    }
    paths.forEach((p) => p.setAttribute('d', d));

    const w = mobile ? 28 : 46;
    ghost.setAttribute('stroke-width', mobile ? 2.5 : 3);
    ghost.setAttribute('stroke-dasharray', mobile ? '1 9' : '1 12');
    casing.setAttribute('stroke-width', w + 8);
    casing.setAttribute('transform', 'translate(0 4)');
    asphalt.setAttribute('stroke-width', w);
    line.setAttribute('stroke-width', mobile ? 1.5 : 2);
    line.setAttribute('stroke-dasharray', mobile ? '8 12' : '12 18');
    mask.setAttribute('stroke-width', w + 24);

    total = asphalt.getTotalLength();
    mask.style.strokeDasharray = `${total + 2} ${total + 2}`;
    const n = Math.max(2, Math.ceil(total / 3));
    xs = new Float32Array(n + 1); ys = new Float32Array(n + 1); ls = new Float32Array(n + 1);
    for (let i = 0; i <= n; i++) {
      const l = (i / n) * total, p = asphalt.getPointAtLength(l);
      xs[i] = p.x; ys[i] = p.y; ls[i] = l;
    }
    startY = ys[0]; endY = ys[n];

    startDot.setAttribute('cx', xs[0]); startDot.setAttribute('cy', ys[0]);
    startDot.setAttribute('r', w * .62);
    endDot.setAttribute('transform', `translate(${xs[n]} ${ys[n]})`);
    endDot.querySelectorAll('circle').forEach((c) => c.setAttribute('r', mobile ? 10 : 14));
    carBody.setAttribute('transform', `scale(${mobile ? .98 : 1.45})`);

    // Hitchhikers on the roadside
    ridersLayer.textContent = '';
    riders.forEach((r) => {
      const g = el('g', { class: 'rider' }, ridersLayer);
      r.g = g;
      const pos = el('g', { transform: `translate(${r.x} ${r.y})` }, g);
      r.pos = pos;
      if (r.kind === 'pickup') {
        const sx = mobile ? -2 : (r.x > xs[0] ? 28 : -28);
        el('line', { class: 'r-post', x1: sx, y1: 2, x2: sx, y2: -30 }, pos);
        const sg = el('g', { transform: `translate(${sx} -44)` }, pos);
        el('rect', { class: 'r-sign', x: -36, y: -11, width: 72, height: 22, rx: 7 }, sg);
        const t = el('text', { class: 'r-sign-text', x: 0, y: 4, 'text-anchor': 'middle', direction: 'rtl' }, sg);
        t.textContent = 'טרמפיאדה';
      }
      const dg = el('g', { class: 'r-dot-g' }, pos);
      el('circle', { class: 'r-halo', r: mobile ? 9 : 12 }, dg);
      el('circle', { class: 'r-dot', r: mobile ? 9 : 13 }, dg);
      r.dot = dg;
      if (r.kind === 'wait') g.classList.add('waiting');
      if (r.kind === 'pickup') pickup = r;
    });

    drawContours();
    update();
  }

  // Find the drawn length whose point sits at height y (the road always runs down)
  function indexAtY(y) {
    let lo = 0, hi = ys.length - 1;
    if (y <= ys[0]) return 0;
    if (y >= ys[hi]) return hi;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (ys[mid] < y) lo = mid; else hi = mid;
    }
    return hi;
  }

  // Story sections: which picture is showing depends on how far into the section we are
  function updateSteps() {
    stepSecs.forEach((s) => {
      const r = s.sec.getBoundingClientRect();
      const p = clamp(-r.top / Math.max(1, r.height - vh), 0, .9999);
      const i = Math.floor(p * s.n);
      if (i === s.cur) return;
      s.cur = i;
      s.items.forEach((el) => {
        const k = +el.dataset.i;
        el.classList.toggle('is-on', k === i);
        el.classList.toggle('is-past', k < i);
      });
      if (s.weather) s.weather.dataset.w = WEATHER[i];
    });
  }

  function update() {
    updateSteps();
    if (!ys.length) return;
    const last = ys.length - 1;

    if (reduced.matches) {
      mask.style.strokeDashoffset = 0;
      car.setAttribute('opacity', 0);
      road.classList.add('arrived');
      peak.classList.add('got');
      return;
    }

    const head = scrollY + vh * HEAD - jTop;
    let eff = head, pickT = head > (pickup ? pickup.y : Infinity) ? 1 : 0;

    // The car stops for the second hitchhiker, then catches up with the reading line
    if (pickup) {
      const D = vh * .45, C = vh * 1.1, y0 = pickup.y;
      if (head >= y0 && head < y0 + D) { eff = y0; pickT = (head - y0) / D; }
      else if (head >= y0 + D && head < y0 + D + C) { eff = y0 + (head - y0 - D) * (D + C) / C; pickT = 1; }
    }

    const shown = head > startY;
    const i = indexAtY(clamp(eff, startY, endY));
    const l = shown ? ls[i] : 0;
    mask.style.strokeDashoffset = total + 2 - l;

    car.setAttribute('opacity', shown ? 1 : 0);
    const a = Math.max(0, i - 4), b = Math.min(last, i + 4);
    const ang = Math.atan2(ys[b] - ys[a], xs[b] - xs[a]) * 180 / Math.PI + 90;
    car.setAttribute('transform', `translate(${xs[i].toFixed(1)} ${ys[i].toFixed(1)}) rotate(${ang.toFixed(1)})`);
    road.classList.toggle('arrived', eff >= endY - 1);

    riders.forEach((r) => {
      if (r.kind === 'wait') r.g.classList.toggle('passed', head > r.y + 40);
    });

    if (pickup) {
      const t = clamp(pickT, 0, 1), e = ease(clamp(t / .85, 0, 1));
      const x = pickup.x + (xs[i] - pickup.x) * e, y = pickup.y + (ys[i] - pickup.y) * e;
      pickup.dot.setAttribute('transform', `translate(${(x - pickup.x).toFixed(1)} ${(y - pickup.y).toFixed(1)}) scale(${(1 - .55 * e).toFixed(3)})`);
      pickup.dot.style.opacity = t > .85 ? 0 : 1;
      car.classList.toggle('has-passenger', t > .85);
      peak.classList.toggle('got', t > .12);
    }


    if (scrollY < vh * 1.2) heroMark.style.transform = `translateY(${(scrollY * .12).toFixed(1)}px)`;
    if (contours) contours.style.transform = `translateY(${(-scrollY * .18).toFixed(1)}px)`;
  }

  // Faint topographic lines behind everything, drifting slower than the page
  let contours = null;
  function drawContours() {
    const svgC = document.querySelector('.contours');
    if (!svgC) return;
    contours = svgC;
    const docH = document.documentElement.scrollHeight;
    const Hc = vh + Math.max(0, docH - vh) * .18 + 80, Wc = innerWidth, gap = mobile ? 40 : 52;
    svgC.setAttribute('viewBox', `0 0 ${Wc} ${Hc}`);
    svgC.style.height = `${Hc}px`;
    let out = '';
    for (let r = 0, y0 = 20; y0 < Hc; r++, y0 += gap) {
      let d = '';
      for (let x = -20; x <= Wc + 40; x += 40) {
        const y = y0 + 12 * Math.sin(x * .0042 + r * .65) + 7 * Math.sin(x * .011 + r * 1.37) + 4 * Math.sin(x * .023 - r * .4);
        d += (d ? ' L' : 'M') + x + ' ' + y.toFixed(1);
      }
      out += `<path class="${r % 5 === 0 ? 'major' : ''}" d="${d}"/>`;
    }
    svgC.innerHTML = out;
  }

  if (window.fillScenes) window.fillScenes();

  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { ticking = false; update(); });
  };

  // Copy blocks fade in as they arrive
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -12% 0px', threshold: .15 });
  document.querySelectorAll('.reveal').forEach((n) => io.observe(n));

  // The bar's button shows once the hero button has gone
  new IntersectionObserver(([e]) => {
    const show = !e.isIntersecting && e.boundingClientRect.top < 0;
    bar.classList.toggle('show-cta', show);
    barCta.tabIndex = show ? 0 : -1;
  }).observe(document.getElementById('hero-cta'));

  let rz;
  const relayout = () => { clearTimeout(rz); rz = setTimeout(layout, 120); };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', relayout);
  reduced.addEventListener?.('change', layout);
  if (document.fonts?.ready) document.fonts.ready.then(layout);
  addEventListener('load', layout);
  layout();
})();

// Hero: the driver's car follows the logo's road, stops for the waiting passenger,
// takes them in and drives on to the destination. Runs once; reduced motion shows the end state.
(() => {
  const svg = document.querySelector('.mark');
  if (!svg || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const q = (s) => svg.querySelector(s);
  const tagWait = q('.m-tag--wait'), tagSeat = q('.m-tag--seat');
  const road = q('.m-road'), car = q('.m-car'), wrap = q('.m-hiker-wrap'), link = q('.m-link'), pass = q('.m-passenger');
  const L = road.getTotalLength();
  const HX = 248, HY = 286;
  let pick = 0, best = Infinity;
  for (let l = 0; l <= L; l += 2) {
    const p = road.getPointAtLength(l), d = (p.x - HX) ** 2 + (p.y - HY) ** 2;
    if (d < best) { best = d; pick = l; }
  }
  const park = Math.max(0, pick - 46);               // the car stops just before the passenger
  const at = (l) => {
    const p = road.getPointAtLength(l), a = road.getPointAtLength(Math.min(L, l + 2)), b = road.getPointAtLength(Math.max(0, l - 2));
    return { x: p.x, y: p.y, deg: Math.atan2(a.y - b.y, a.x - b.x) * 180 / Math.PI + 90 };
  };
  const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
  const inOut = (t) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const outCubic = (t) => 1 - Math.pow(1 - t, 3);
  const T = { start: 1800, d1: 1700, hold: 450, board: 650, d2: 1900 };
  const t1 = T.start + T.d1, t2 = t1 + T.hold, t3 = t2 + T.board, t4 = t3 + T.d2;
  const t0 = performance.now();
  let done = false;

  const place = (l) => {
    const c = at(l);
    tagSeat.setAttribute('transform', `translate(${(c.x - 66).toFixed(1)} ${(c.y + 4).toFixed(1)})`);
    tagSeat.setAttribute('opacity', t4 > 0 && performance.now() - t0 < t2 + 150 ? 1 : 0);
    car.setAttribute('transform', `translate(${c.x.toFixed(1)} ${c.y.toFixed(1)}) rotate(${c.deg.toFixed(1)})`);
    return c;
  };

  function frame(now) {
    const t = now - t0;
    if (t > 1300 && t < t2 + 150) tagWait.setAttribute('opacity', 1); else tagWait.setAttribute('opacity', 0);
    if (t < T.start) { requestAnimationFrame(frame); return; }
    car.setAttribute('opacity', 1);

    if (t < t1) {                                   // drive to the passenger, slowing down
      const u = (t - T.start) / T.d1;
      const c = place(park * outCubic(inOut(u) * .5 + u * .5));
      link.setAttribute('x1', HX); link.setAttribute('y1', HY);
      link.setAttribute('x2', c.x.toFixed(1)); link.setAttribute('y2', c.y.toFixed(1));
      link.setAttribute('opacity', (clamp((u - .35) / .4) * .85).toFixed(2));
    } else if (t < t2) {                            // a beat of stillness: they have found each other
      place(park);
      const c = at(park);
      link.setAttribute('x2', c.x.toFixed(1)); link.setAttribute('y2', c.y.toFixed(1));
      link.setAttribute('opacity', .85);
    } else if (t < t3) {                            // the passenger steps in
      const u = inOut((t - t2) / T.board), c = at(park);
      const x = HX + (c.x - HX) * u, y = HY + (c.y - HY) * u, s = 1 - .72 * u;
      wrap.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${s.toFixed(3)}) translate(${-HX} ${-HY})`);
      wrap.style.opacity = (1 - clamp((u - .6) / .4)).toFixed(2);
      link.setAttribute('opacity', (.85 * (1 - u)).toFixed(2));
      svg.classList.add('picked');
      pass.setAttribute('opacity', clamp((u - .55) / .35).toFixed(2));
    } else if (t < t4) {                            // both drive on
      const u = inOut((t - t3) / T.d2);
      wrap.style.opacity = 0; link.setAttribute('opacity', 0); pass.setAttribute('opacity', 1);
      place(park + (L - park) * u);
    } else if (!done) {
      done = true;
      place(L);
      wrap.removeAttribute('transform'); wrap.style.opacity = '';
      svg.classList.remove('picked');
      svg.classList.add('arrived');
      return;
    }
    requestAnimationFrame(frame);
  }
  // wait until the road has finished drawing, and keep off hidden tabs
  requestAnimationFrame(frame);
})();

// Install guidance: tell people where they are and what to do next.
(() => {
  const ua = navigator.userAgent || '';
  const inApp = /Instagram|FBAN|FBAV|FB_IAB|FBIOS|TikTok|musical_ly|Line\//i.test(ua);
  const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const android = /Android/i.test(ua);
  const banner = document.getElementById('inapp');
  if (inApp && banner) {
    banner.hidden = false;
    const copy = document.getElementById('inapp-copy');
    copy?.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(location.href); copy.textContent = 'הועתק ✓'; }
      catch { copy.textContent = 'לחץ והחזק על הכתובת'; }
    });
    document.getElementById('inapp-x')?.addEventListener('click', () => { banner.hidden = true; });
    return;
  }
})();
