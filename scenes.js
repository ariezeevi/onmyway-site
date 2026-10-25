// Drawn scenes for the story (SVG, viewBox 400x250), injected into <div data-scene="...">.
// People are built on a real skeleton (hip, knee, ankle, shoulder, elbow, wrist),
// so limbs attach where they should and proportions hold: head ~1/7 of height.
(() => {
  const C = {
    blue: '#1E6FD9', deep: '#1859B4', light: '#6FA8F5', orange: '#EF6C00', amber: '#F59E0B',
    teal: '#0EA5A4', rose: '#E8577A', ink: '#0F172A', slate: '#475569', olive: '#6B7A4F', brown: '#8B5E3C',
  };
  const SKIN = ['#F1C6A3', '#D9A27B', '#B97A56', '#F5D3B5'];
  const HAIR = ['#2B1D16', '#5A3A22', '#8B5A2B', '#C9CED6', '#1F2937'];
  const R = (a) => (a * Math.PI) / 180;
  const f = (n) => n.toFixed(1);
  // Point reached from p by an angle (0 = straight down, + = forward) and a length
  const P = (p, a, len) => [p[0] + len * Math.sin(R(a)), p[1] + len * Math.cos(R(a))];
  const pl = (pts, col, w) => `<path d="M${pts.map((p) => f(p[0]) + ' ' + f(p[1])).join(' L')}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const shade = (hex, k) => {
    const n = parseInt(hex.slice(1), 16);
    const c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.round(v * k));
    return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
  };

  // Poses: legs = [near, far] as [thigh, shin]; arms = [near, far] as [upper, forearm]. Angles in degrees.
  const POSES = {
    stand: { legs: [[1, 0], [-1, -1]], arms: [[5, 9], [-4, -6]] },
    walk: { legs: [[0, 0], [0, 0]], arms: [[0, 6], [0, 6]] },
    run: { legs: [[0, 0], [0, 0]], arms: [[8, 60], [8, 60]] },
    sit: { legs: [[88, 0], [88, 0]], arms: [[98, 62], [98, 62]] },
    wave: { legs: [[1, 0], [-1, -1]], arms: [[150, 162], [-5, -8]] },
    thumb: { legs: [[1, 0], [-1, -1]], arms: [[104, 112], [-5, -8]] },
    cheers: { legs: [[1, 0], [-1, -1]], arms: [[160, 170], [-5, -8]] },
    carry: { legs: [[2, 0], [-2, -1]], arms: [[24, 40], [20, 34]] },
    hug: { legs: [[1, 0], [-1, -1]], arms: [[72, 22], [72, 22]] },
    look: { legs: [[1, 0], [-1, -1]], arms: [[-4, -8], [6, 12]] },
  };

  // Tapered limb: a capsule from a to b, wider at a. Joints are round, so chained limbs read as one body.
  const cap = (a, b, w0, w1, fill) => {
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
    const q = [[a[0] + nx * w0 / 2, a[1] + ny * w0 / 2], [b[0] + nx * w1 / 2, b[1] + ny * w1 / 2], [b[0] - nx * w1 / 2, b[1] - ny * w1 / 2], [a[0] - nx * w0 / 2, a[1] - ny * w0 / 2]];
    return `<path d="M${q.map((p) => f(p[0]) + ' ' + f(p[1])).join(' L')}Z" fill="${fill}"/><circle cx="${f(b[0])}" cy="${f(b[1])}" r="${f(w1 / 2)}" fill="${fill}"/><circle cx="${f(a[0])}" cy="${f(a[1])}" r="${f(w0 / 2)}" fill="${fill}"/>`;
  };
  // Rotate a group about its own origin (a joint) back and forth
  const swing = (inner, amp, dur, phase = 0) => amp
    ? `<g>${inner}<animateTransform attributeName="transform" type="rotate" values="${phase ? `0;${-amp};0;${amp};0` : `0;${amp};0;${-amp};0`}" keyTimes="0;.25;.5;.75;1" calcMode="spline" keySplines=".45 0 .55 1;.45 0 .55 1;.45 0 .55 1;.45 0 .55 1" dur="${dur}s" repeatCount="indefinite"/></g>`
    : inner;
  let gid = 0;

  // A person whose feet are at (x, y). Height about 124 units at s = 1. Faceless on purpose: cleaner than drawn faces.
  function person(o) {
    const { x, y, s = 1, flip = false, shirt = C.blue, pants = '#334155', skin = SKIN[0], hair = HAIR[0],
      pose = 'stand', bag = null, mood = 'smile', hairStyle = 'short', held = null } = o;
    const pz = POSES[pose] || POSES.stand;
    const moving = pose === 'walk' || pose === 'run';
    const dur = pose === 'run' ? .62 : .98;
    const legAmp = pose === 'run' ? 34 : pose === 'walk' ? 22 : 0;
    const armAmp = pose === 'run' ? 30 : pose === 'walk' ? 18 : pose === 'wave' ? 13 : 0;
    const id = 'pg' + (++gid);
    const farPants = shade(pants, .72), farShirt = shade(shirt, .78), farSkin = shade(skin, .9);

    const leg = (q, col, side, far, ph) => {
      const k = P([0, 0], q[0], 29), a = P(k, q[1], 26);
      const shoe = `<g transform="translate(${f(a[0])} ${f(a[1])})"><path d="M-5.5 -3 Q-5 -7 0 -7 L5 -4.5 Q10.5 -3 11 1 L11 3.2 L-6.5 3.2 Z" fill="${far ? '#161E2C' : '#1E293B'}"/><path d="M-6.5 3.2 L11 3.2" stroke="#E2E8F0" stroke-width="1.5" stroke-linecap="round"/></g>`;
      return `<g transform="translate(${side * 3.4} -56)">${swing(cap([0, 0], k, 13, 10.4, col) + cap(k, a, 10.4, 7.8, col) + shoe, legAmp, dur, ph)}</g>`;
    };
    const arm = (q, side, far, ph) => {
      const sleeve = far ? farShirt : shirt, sk = far ? farSkin : skin;
      const e = P([0, 0], q[0], 22), w = P(e, q[1], 19);
      const bottle = held === 'bottle' && !far
        ? `<g transform="translate(${f(w[0])} ${f(w[1])}) rotate(${q[1] > 120 ? -10 : 0})"><rect x="-3" y="-17" width="6" height="15" rx="2.4" fill="${C.amber}"/><rect x="-1.6" y="-22" width="3.2" height="6" rx="1.2" fill="#B45309"/></g>` : '';
      return `<g transform="translate(${side * 12} -90)">${swing(cap([0, 0], e, 8.8, 7.4, sleeve) + cap(e, w, 6.4, 5.2, sk) + `<circle cx="${f(w[0])}" cy="${f(w[1])}" r="3.5" fill="${sk}"/>` + bottle, armAmp, dur, ph)}</g>`;
    };

    const farLeg = leg(pz.legs[1], farPants, -1, true, 1);
    const nearLeg = leg(pz.legs[0], pants, 1, false, 0);
    const farArm = arm(pz.arms[1], -1, true, 0);
    const nearArm = arm(pz.arms[0], 1, false, 1);

    const pack = bag === 'pack'
      ? `<rect x="-25" y="-92" width="14" height="32" rx="6" fill="${C.orange}"/><rect x="-23" y="-76" width="10" height="6" rx="2" fill="#C2410C"/>` : '';
    const schoolBag = bag === 'school'
      ? `<rect x="-23" y="-86" width="13" height="22" rx="4.5" fill="${C.amber}"/><rect x="-21" y="-78" width="9" height="4" rx="1.5" fill="#B45309"/>` : '';
    const duffel = bag === 'duffel'
      ? `<rect x="22" y="-54" width="26" height="14" rx="7" fill="${C.olive}"/><path d="M29 -54 V-40" stroke="#4B5636" stroke-width="2"/>` : '';

    const torso = `<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${shade(shirt, 1.06 > 1 ? 1 : 1)}"/><stop offset="1" stop-color="${shade(shirt, .82)}"/></linearGradient></defs>
      <path d="M-11.5 -60 L11.5 -60 L12.4 -50 Q0 -45 -12.4 -50Z" fill="${pants}"/>
      <path d="M-12.6 -92 Q-13.8 -76 -11.4 -56 L11.4 -56 Q13.8 -76 12.6 -92 Q0 -96.4 -12.6 -92Z" fill="url(#${id})"/>
      <path d="M-11.8 -58 H11.8" stroke="rgba(15,23,42,.2)" stroke-width="1.6"/>
      <path d="M-4.5 -94.5 Q0 -90 4.5 -94.5" stroke="rgba(15,23,42,.16)" stroke-width="1.4" fill="none"/>`;

    const longHair = hairStyle === 'long' ? `<path d="M-8 -107 Q-12.5 -94 -7.5 -86 L1 -89 L3 -106Z" fill="${hair}"/>` : '';
    const cap2 = hairStyle === 'long'
      ? `<path d="M-8.7 -108 Q-9.2 -118.2 0 -117.9 Q9.2 -117.6 8.9 -108 Q5 -111.2 0.2 -111.4 Q-4.6 -111.2 -8.7 -108Z" fill="${hair}"/>`
      : `<path d="M-8.6 -108.4 Q-9.2 -118.2 0 -117.9 Q9.2 -117.6 8.8 -108.4 Q6.4 -112.4 0.4 -112.7 Q-5.2 -112.4 -8.6 -108.4Z" fill="${hair}"/>`;
    const head = `<g transform="translate(0 ${mood === 'sad' ? 1.8 : 0})">
      ${longHair}
      ${cap([0, -93.4], [0, -101], 8.2, 7.4, skin)}
      <ellipse cx="0" cy="-98.2" rx="4.4" ry="1.7" fill="${shade(skin, .88)}"/>
      <ellipse cx="0" cy="-106.6" rx="8.1" ry="9.7" fill="${skin}"/>
      <circle cx="7.7" cy="-105.4" r="1.5" fill="${skin}"/>
      <ellipse cx="-1.4" cy="-106" rx="1.3" ry="2.1" fill="${shade(skin, .86)}"/>
      ${cap2}
    </g>`;

    const body = `${farLeg}${farArm}${pack}${schoolBag}${torso}${nearLeg}${duffel}${nearArm}${head}`;
    const bob = moving
      ? `<animateTransform attributeName="transform" type="translate" values="0 0;0 -1.4;0 0;0 -1.4;0 0" dur="${dur}s" repeatCount="indefinite"/>` : '';
    const ground = pose === 'sit' ? '' : `<ellipse cx="2" cy="1.2" rx="23" ry="4.6" fill="rgba(15,23,42,.17)"/>`;
    return `<g class="person" transform="translate(${x} ${y}) scale(${flip ? -s : s} ${s})">${ground}<g class="pose">${body}${bob}</g></g>`;
  }

  // Shared backdrop: sky, far ridge, mid layer, ground with depth
  const ridge = (y, amp, k, ph) => {
    let d = `M0 ${y}`;
    for (let x = 0; x <= 400; x += 20) d += ` L${x} ${f(y - amp * Math.sin(x * k + ph) - amp * .4 * Math.sin(x * k * 2.3 + ph * 1.7))}`;
    return d + ' V250 H0Z';
  };
  const base = (id, o) => {
    const { sky = ['#CFE3FC', '#F5F9FF'], horizon = 196, far = null, farCol = '#BFD3EE', mid = null, midCol = '#9DBFE6', ground = ['#DCE3EE', '#C3CDDC'], lane = true, sun = null } = o;
    return `<defs>
        <linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky[0]}"/><stop offset="1" stop-color="${sky[1]}"/></linearGradient>
        <linearGradient id="${id}g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${ground[0]}"/><stop offset="1" stop-color="${ground[1]}"/></linearGradient>
        <radialGradient id="${id}r"><stop offset="0" stop-color="#FFF3C4" stop-opacity="1"/><stop offset="1" stop-color="#FFF3C4" stop-opacity="0"/></radialGradient>
      </defs>
      <rect width="400" height="250" fill="url(#${id}s)"/>
      ${sun ? `<circle cx="${sun[0]}" cy="${sun[1]}" r="${sun[2] * 2.6}" fill="url(#${id}r)"/>` : ''}
      ${far ? `<path d="${far}" fill="${farCol}"/>` : ''}
      ${mid ? `<path d="${mid}" fill="${midCol}"/>` : ''}
      <rect y="${horizon}" width="400" height="${250 - horizon}" fill="url(#${id}g)"/>
      <rect y="${horizon}" width="400" height="2.5" fill="rgba(255,255,255,.6)"/>
      <rect y="${horizon + 2.5}" width="400" height="6" fill="rgba(15,23,42,.05)"/>
      ${lane ? `<path d="M0 ${horizon + 34} H400" stroke="#fff" stroke-width="2" stroke-dasharray="18 14" opacity=".6"/>` : ''}`;
  };
  const shadow = () => '';
  const tree = (x, y, s = 1, c = '#5FAE7E') => `<g transform="translate(${x} ${y}) scale(${s})">
    <rect x="-3.5" y="-34" width="7" height="34" rx="2.5" fill="${C.brown}"/>
    <ellipse cx="0" cy="-44" rx="20" ry="22" fill="${shade(c, .85)}"/>
    <ellipse cx="-4" cy="-48" rx="16" ry="18" fill="${c}"/>
    <ellipse cx="-7" cy="-54" rx="7" ry="6" fill="rgba(255,255,255,.18)"/></g>`;
  const cloud = (x, y, s = 1, c = '#fff') => `<g transform="translate(${x} ${y}) scale(${s})" fill="${c}">
    <ellipse cx="0" cy="0" rx="36" ry="13"/><circle cx="-16" cy="-7" r="14"/><circle cx="8" cy="-12" r="18"/><circle cx="28" cy="-3" r="11"/></g>`;
  const sideCar = (x, y, color = C.blue, s = 1, cls = '') => `<g class="${cls}"><g transform="translate(${x} ${y}) scale(${s})"><ellipse cx="3" cy="12" rx="56" ry="5" fill="rgba(15,23,42,.2)"/>
    <path d="M-48 -8 Q-48 -20 -36 -22 L-22 -23 Q-12 -38 4 -38 L22 -38 Q34 -38 42 -23 L48 -21 Q54 -19 54 -8 L54 -2 Q54 2 50 2 L-44 2 Q-48 2 -48 -2Z" fill="${color}"/>
    <path d="M-17 -24 Q-10 -33 1 -33 L8 -33 L8 -24Z M12 -33 L23 -33 Q32 -33 36 -24 L12 -24Z" fill="#DCEBFF"/>
    <path d="M-48 -8 Q-48 -10 -40 -10 L52 -10 Q54 -9 54 -8" stroke="rgba(255,255,255,.35)" stroke-width="1.5" fill="none"/>
    <circle cx="-27" cy="2" r="10" fill="#1E293B"/><circle cx="-27" cy="2" r="4" fill="#94A3B8"/>
    <circle cx="33" cy="2" r="10" fill="#1E293B"/><circle cx="33" cy="2" r="4" fill="#94A3B8"/>
    <rect x="49" y="-16" width="5" height="4.5" rx="1.5" fill="#FFD27A"/></g></g>`;
  const bus = (x, y, s = 1, cls = '') => `<g class="${cls}"><g transform="translate(${x} ${y}) scale(${s})"><ellipse cx="0" cy="13" rx="76" ry="5" fill="rgba(15,23,42,.2)"/>
    <rect x="-72" y="-60" width="144" height="58" rx="11" fill="#E8EEF6" stroke="#94A3B8" stroke-width="2"/>
    <rect x="-72" y="-60" width="144" height="10" rx="5" fill="#F8FAFC"/>
    <rect x="-72" y="-24" width="144" height="11" fill="${C.teal}"/>
    ${[-62, -38, -14, 10, 34].map((wx) => `<rect x="${wx}" y="-50" width="20" height="21" rx="3" fill="#BFD5F7"/>`).join('')}
    <rect x="58" y="-50" width="8" height="36" rx="2" fill="#9FB3CC"/>
    <rect x="-72" y="-6" width="144" height="4" fill="#94A3B8"/>
    <circle cx="-42" cy="2" r="11" fill="#1E293B"/><circle cx="42" cy="2" r="11" fill="#1E293B"/>
    <circle cx="-42" cy="2" r="4.5" fill="#94A3B8"/><circle cx="42" cy="2" r="4.5" fill="#94A3B8"/></g></g>`;

  const S = {};
  // One scale for everything: 52 units = 1 metre (a person is 1.7 m = 89 units at s .72),
  // a car is 4.4 m (about 230 units), a bus 12 m, a door 2.1 m (109 units).
  const P1 = .72;

  // ---- Destinations ----
  S.school = () => base('sc', { sky: ['#DDEBFD', '#F7FAFF'], horizon: 202, far: ridge(150, 14, .02, 1), farCol: '#CFE0F7', sun: [346, 40, 14], lane: false }) +
    `<rect x="78" y="20" width="262" height="182" fill="#F6F8FC"/>
     <rect x="72" y="12" width="274" height="14" rx="2" fill="${C.deep}"/>
     <rect x="78" y="26" width="262" height="6" fill="#E2E8F0"/>
     <rect x="150" y="44" width="118" height="30" rx="6" fill="${C.deep}"/>
     <text x="209" y="66" text-anchor="middle" font-family="Heebo,sans-serif" font-weight="800" font-size="19" fill="#fff">בית ספר</text>
     ${[96, 132, 266, 302].map((x) => `<rect x="${x}" y="100" width="30" height="56" rx="3" fill="#CFE0FA" stroke="#B8CCE8" stroke-width="1.5"/><path d="M${x + 15} 100 V156 M${x} 128 H${x + 30}" stroke="#B8CCE8" stroke-width="1.5"/>`).join('')}
     <rect x="180" y="93" width="58" height="109" rx="3" fill="${C.blue}"/><rect x="186" y="99" width="20" height="40" rx="2" fill="#9CC2F5"/><rect x="212" y="99" width="20" height="40" rx="2" fill="#9CC2F5"/><circle cx="231" cy="150" r="2.5" fill="#FFD27A"/>
     <rect x="170" y="196" width="78" height="6" fill="#D5DDEA"/>
     <path d="M366 202 L366 -6" stroke="#64748B" stroke-width="3.5"/><path class="flag" d="M367 6 L398 15 L367 24Z" fill="${C.orange}"/>` +
    tree(30, 218, 2.5) + tree(396, 220, 2.1, '#7AC495') +
    person({ x: 104, y: 234, s: .62, shirt: C.orange, bag: 'school', pose: 'walk' }) +
    person({ x: 134, y: 238, s: .58, shirt: C.teal, skin: SKIN[1], hair: HAIR[1], bag: 'school', pose: 'walk' }) +
    person({ x: 316, y: 236, s: P1, shirt: C.blue, skin: SKIN[2], pose: 'wave', flip: true });

  S.friends = () => base('fr', { sky: ['#2A2F5E', '#F2A65A'], horizon: 196, far: ridge(170, 22, .012, 2), farCol: '#3D3A6A', sun: [318, 170, 12] }) +
    [30, 70, 110, 150, 190, 230, 270, 310, 350].map((x, i) => `<circle class="twinkle t${i % 3}" cx="${x}" cy="${f(38 + (i % 4) * 9)}" r="${1.4 + (i % 2) * .8}" fill="#FFE2B0"/>`).join('') +
    person({ x: 150, y: 236, s: P1, shirt: C.orange, pose: 'cheers', held: 'bottle', flip: true }) +
    person({ x: 200, y: 236, s: P1, shirt: C.light, skin: SKIN[1], hair: HAIR[1], pose: 'cheers', held: 'bottle', flip: true }) +
    person({ x: 250, y: 236, s: P1, shirt: C.teal, skin: SKIN[2], pose: 'cheers', held: 'bottle' });

  S.dorm = () => `<defs><linearGradient id="dm" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E4ECF8"/><stop offset="1" stop-color="#F7F9FD"/></linearGradient></defs>
    <rect width="400" height="250" fill="url(#dm)"/>
    <rect y="196" width="400" height="54" fill="#CBD6E6"/><path d="M0 196 H400" stroke="#B5C2D6" stroke-width="2"/>
    <rect x="262" y="34" width="70" height="62" rx="5" fill="#1D2C4D"/><path d="M297 34 V96 M262 65 H332" stroke="#E4ECF8" stroke-width="4"/><path d="M276 44 Q270 53 278 58 Q285 52 281 45Z" fill="#FFE7A8"/>
    <rect x="344" y="92" width="40" height="52" rx="3" fill="${C.orange}" opacity=".88"/><path d="M351 108 H377 M351 118 H372" stroke="#fff" stroke-width="3" stroke-linecap="round"/>
    <ellipse cx="96" cy="222" rx="74" ry="6" fill="rgba(15,23,42,.14)"/>
    <rect x="30" y="102" width="7" height="116" rx="3" fill="#64748B"/><rect x="152" y="102" width="7" height="116" rx="3" fill="#64748B"/>
    <rect x="34" y="104" width="122" height="9" rx="4" fill="#94A3B8"/>
    <rect x="34" y="150" width="122" height="9" rx="4" fill="#94A3B8"/>
    <rect x="36" y="96" width="118" height="9" rx="4" fill="#BFD5F7"/><rect x="36" y="142" width="118" height="9" rx="4" fill="#BFD5F7"/>
    <rect x="38" y="86" width="86" height="13" rx="6.5" fill="${C.orange}"/><circle cx="130" cy="92" r="6.5" fill="${SKIN[0]}"/><path d="M123.5 90 Q130 83 136.5 90 Q133 88 123.5 90Z" fill="${HAIR[0]}"/>
    <rect x="38" y="132" width="86" height="13" rx="6.5" fill="${C.blue}"/><circle cx="130" cy="138" r="6.5" fill="${SKIN[1]}"/><path d="M123.5 136 Q130 129 136.5 136 Q133 134 123.5 136Z" fill="${HAIR[1]}"/>
    <g class="zzz" fill="${C.deep}" font-family="Heebo,sans-serif" font-weight="800"><text x="142" y="78" font-size="12">z</text><text x="152" y="66" font-size="15">z</text><text x="164" y="52" font-size="18">z</text></g>` +
    person({ x: 232, y: 236, s: P1, shirt: C.teal, skin: SKIN[2], pose: 'wave', flip: true });

  S.trip = () => base('tr', { sky: ['#CFE3FC', '#F4F8FE'], horizon: 200, far: ridge(120, 40, .018, .4), farCol: '#A8C4EA', mid: ridge(162, 26, .03, 1.2), midCol: '#7FB08F', sun: [318, 58, 18] }) +
    `<g transform="translate(318 58)"><g class="sunrot"><circle r="18" fill="#FFB547"/>${Array.from({ length: 8 }, (_, i) => `<path d="M0 -24 V-32" stroke="#FFB547" stroke-width="3.5" stroke-linecap="round" transform="rotate(${i * 45})"/>`).join('')}</g></g>
     <path d="M-10 232 Q120 192 220 216 T410 206" stroke="#F1E3C8" stroke-width="22" fill="none" opacity=".9"/>
     <path d="M262 168 V120" stroke="#475569" stroke-width="3"/><path class="flag" d="M263 121 L286 128 L263 135Z" fill="${C.orange}"/>` +
    tree(34, 222, 2.6, '#4E9C6E') + tree(372, 224, 2.2, '#6BB787') +
    person({ x: 170, y: 232, s: .66, shirt: C.blue, bag: 'pack', pose: 'walk', flip: true }) +
    person({ x: 206, y: 222, s: .62, shirt: C.orange, skin: SKIN[1], hair: HAIR[2], hairStyle: 'long', bag: 'pack', pose: 'walk', flip: true });

  S.army = () => base('ar', { sky: ['#E3EBF6', '#F8FAFD'], horizon: 200, far: ridge(140, 16, .03, .5), farCol: '#C9CCB8', ground: ['#DCD7C3', '#C7C1A7'], lane: false }) +
    `<path d="M0 74 H400" stroke="#A3A08A" stroke-width="2.5"/><path d="M0 138 H400" stroke="#A3A08A" stroke-width="2"/>
     ${Array.from({ length: 21 }, (_, i) => `<path d="M${i * 20} 74 V200" stroke="#A3A08A" stroke-width="1.6"/>`).join('')}
     <path d="M0 70 Q10 62 20 70 T40 70 T60 70 T80 70 T100 70 T120 70 T140 70 T160 70 T180 70 T200 70 T220 70 T240 70 T260 70 T280 70 T300 70 T320 70 T340 70 T360 70 T380 70 T400 70" stroke="#8C8A76" stroke-width="1.6" fill="none"/>
     <rect x="292" y="28" width="96" height="70" rx="4" fill="#CBC5A9"/><path d="M284 30 L340 4 L396 30Z" fill="#A69F7E"/><rect x="304" y="46" width="72" height="30" rx="3" fill="#8FA6C8"/>
     <rect x="298" y="98" width="8" height="106" fill="#A69F7E"/><rect x="374" y="98" width="8" height="106" fill="#A69F7E"/><path d="M300 200 L376 100 M376 200 L300 100" stroke="#A69F7E" stroke-width="3"/>
     <rect x="52" y="140" width="11" height="64" fill="#9CA3AF"/>
     <g class="barrier"><rect x="60" y="142" width="196" height="8" rx="4" fill="#fff" stroke="#B91C1C" stroke-width="1"/>${[0, 1, 2, 3, 4, 5, 6].map((i) => `<rect x="${68 + i * 26}" y="142" width="13" height="8" fill="#DC2626"/>`).join('')}</g>` +
    person({ x: 196, y: 236, s: P1, shirt: C.olive, pants: '#4B5636', pose: 'carry', bag: 'duffel', flip: true });

  S.partner = () => base('pa', { sky: ['#FFD7B0', '#FCEFF4'], horizon: 202, far: ridge(160, 18, .02, 2), farCol: '#E9C4CF', ground: ['#E9DCE6', '#D7C3D2'], sun: [200, 120, 26], lane: false }) +
    `<circle cx="200" cy="120" r="40" fill="#FFB36B" opacity=".6"/>
     <path d="M340 204 V-14" stroke="#475569" stroke-width="5"/><path d="M340 6 Q340 -4 354 -4 L378 -4" stroke="#475569" stroke-width="5" fill="none"/><circle cx="372" cy="2" r="9" fill="#FFE7A8"/><circle cx="372" cy="2" r="22" fill="#FFE7A8" opacity=".25"/>` +
    person({ x: 180, y: 236, s: P1, shirt: C.blue, pose: 'hug' }) +
    person({ x: 224, y: 236, s: .68, shirt: C.rose, skin: SKIN[3], hair: HAIR[2], hairStyle: 'long', pose: 'hug', flip: true }) +
    `<g class="hearts"><path class="h1" d="M199 88 C193 80 182 84 186 93 L199 105 L212 93 C216 84 205 80 199 88Z" fill="${C.orange}"/>
      <path class="h2" d="M232 66 C229 62 223 64 225 69 L232 75 L239 69 C241 64 235 62 232 66Z" fill="${C.rose}"/>
      <path class="h3" d="M166 62 C164 59 159 61 161 64 L166 69 L171 64 C173 61 168 59 166 62Z" fill="${C.rose}"/></g>`;

  S.family = () => base('fa', { sky: ['#DCEAFD', '#F7FAFF'], horizon: 204, far: ridge(150, 14, .02, 1), farCol: '#CFE0F7', sun: [72, 56, 12], lane: false }) +
    `<g class="smoke" fill="#E2E8F0"><circle cx="276" cy="26" r="7"/><circle cx="284" cy="12" r="9"/><circle cx="294" cy="-2" r="11"/></g>
     <rect x="262" y="26" width="24" height="46" fill="#94A3B8"/>
     <rect x="96" y="70" width="236" height="134" rx="3" fill="#F8FAFF" stroke="#D5DEEA" stroke-width="1.5"/>
     <path d="M80 76 L214 4 L348 76Z" fill="${C.orange}"/><path d="M80 76 L214 4 L348 76" stroke="#B45309" stroke-width="2" fill="none"/>
     ${[110, 262].map((x) => `<rect x="${x}" y="104" width="52" height="54" rx="3" fill="#FFD27A" class="glow"/><path d="M${x + 26} 104 V158 M${x} 131 H${x + 52}" stroke="#fff" stroke-width="3"/>`).join('')}
     <rect x="186" y="95" width="58" height="109" rx="3" fill="#FFE7A8"/><rect x="186" y="95" width="20" height="109" fill="${C.deep}" opacity=".85"/>
     <rect x="176" y="200" width="78" height="6" fill="#D5DDEA"/>` +
    tree(32, 222, 2.5) + tree(386, 222, 2.1, '#7AC495') +
    person({ x: 213, y: 214, s: .66, shirt: '#94A3B8', pants: '#475569', hair: HAIR[3], pose: 'wave', flip: true }) +
    person({ x: 252, y: 214, s: .62, shirt: C.rose, skin: SKIN[3], hair: HAIR[3], hairStyle: 'long', pose: 'wave' }) +
    person({ x: 92, y: 238, s: P1, shirt: C.blue, bag: 'pack', pose: 'walk' });

  // ---- The bus pain ----
  // Car 4.4 m, bus 12 m: the bus is 2.7 times as long.
  S.race = () => `<rect width="400" height="250" fill="#EEF3FA"/>
    <rect x="0" y="40" width="400" height="76" fill="#C9D3E1"/><rect x="0" y="126" width="400" height="86" fill="#BCC8D8"/>
    <rect x="0" y="116" width="400" height="10" fill="#E2E8F0"/>
    <path d="M0 78 H400 M0 169 H400" stroke="#fff" stroke-width="3" stroke-dasharray="18 14" opacity=".8"/>
    <g transform="translate(30 40)">${[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => `<rect x="${i % 2 ? 0 : 8}" y="${i * 8}" width="8" height="8" fill="#1E293B"/><rect x="${i % 2 ? 8 : 0}" y="${i * 8}" width="8" height="8" fill="#fff"/>`).join('')}</g>
    <g class="racer car-racer">${sideCar(360, 98, C.blue, .78)}</g>
    <g class="racer bus-racer">${bus(330, 200, 1.34)}</g>
    <text class="tag tag-car" x="48" y="30" font-size="16" font-weight="800" fill="${C.deep}" font-family="Heebo,sans-serif">20 דק׳ ✓</text>
    <text class="tag tag-bus" x="388" y="240" font-size="16" font-weight="800" fill="#475569" font-family="Heebo,sans-serif" text-anchor="end">שעה וחצי…</text>`;

  S.missed = () => base('ms', { sky: ['#E6EEFA', '#F8FAFD'], horizon: 176, far: ridge(120, 20, .02, 2), farCol: '#CBD8EA', ground: ['#CCD5E2', '#B6C1D1'], lane: false }) +
    `<path d="M0 214 H400" stroke="#fff" stroke-width="3" stroke-dasharray="18 14" opacity=".8"/>
     <path d="M386 196 V28" stroke="#64748B" stroke-width="4"/><circle cx="386" cy="24" r="18" fill="#fff" stroke="${C.teal}" stroke-width="4"/><path d="M378 24 h16 M386 16 v4" stroke="${C.teal}" stroke-width="3" stroke-linecap="round"/>` +
    `<g class="leaving"><g transform="translate(150 0) scale(-1 1)">${bus(0, 206, 2.4)}</g><g class="puffs" fill="#C7D1DF"><circle cx="338" cy="214" r="9"/><circle cx="358" cy="206" r="11"/><circle cx="380" cy="198" r="13"/></g></g>` +
    person({ x: 340, y: 238, s: P1, shirt: C.orange, pose: 'run', cls: 'runner' }) +
    `<g class="shout"><rect x="262" y="52" width="66" height="34" rx="12" fill="#fff" stroke="${C.ink}" stroke-width="2"/><path d="M312 84 L324 110 L300 85Z" fill="#fff" stroke="${C.ink}" stroke-width="2" stroke-linejoin="round"/><text x="295" y="74" font-size="16" font-weight="800" font-family="Heebo,sans-serif" text-anchor="middle" fill="${C.ink}">רגע!</text></g>`;

  S.wait = () => base('wt', { sky: ['#EEF2F8', '#F8FAFD'], horizon: 196, far: ridge(130, 14, .03, 1), farCol: '#D7E0EC', ground: ['#DDE4EE', '#C6D0DE'], lane: false }) +
    `<rect x="150" y="62" width="214" height="12" rx="4" fill="${C.deep}"/>
     <rect x="160" y="74" width="196" height="108" fill="rgba(191,213,247,.42)" stroke="#94A3B8" stroke-width="2"/>
     <path d="M160 74 V198 M356 74 V198" stroke="#64748B" stroke-width="5"/>
     <rect x="186" y="172" width="130" height="7" rx="3" fill="${C.brown}"/><path d="M196 179 V198 M306 179 V198" stroke="#6B4528" stroke-width="4"/>
     <path d="M374 198 V30" stroke="#64748B" stroke-width="4"/><circle cx="374" cy="26" r="16" fill="#fff" stroke="${C.teal}" stroke-width="4"/><path d="M367 26 h14" stroke="${C.teal}" stroke-width="3" stroke-linecap="round"/>` +
    person({ x: 244, y: 216, s: P1, shirt: C.blue, pose: 'sit', mood: 'sad', flip: true }) +
    `<g transform="translate(76 108)"><circle r="46" fill="#fff" stroke="${C.ink}" stroke-width="5"/>
      ${Array.from({ length: 12 }, (_, i) => `<path d="M0 -39 V${i % 3 ? -35 : -32}" stroke="${C.ink}" stroke-width="${i % 3 ? 2 : 4}" transform="rotate(${i * 30})"/>`).join('')}
      <path class="hand-h" d="M0 0 V-20" stroke="${C.ink}" stroke-width="5" stroke-linecap="round"/>
      <path class="hand-m" d="M0 0 V-32" stroke="${C.orange}" stroke-width="3.5" stroke-linecap="round"/><circle r="4" fill="${C.ink}"/></g>
     <text x="76" y="176" font-size="14" font-weight="700" fill="#475569" font-family="Heebo,sans-serif" text-anchor="middle">עוד 60 דק׳</text>`;

  S.night = () => `<defs><linearGradient id="nt" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0B1530"/><stop offset="1" stop-color="#22325A"/></linearGradient>
      <radialGradient id="nl"><stop offset="0" stop-color="#FDE68A" stop-opacity=".55"/><stop offset="1" stop-color="#FDE68A" stop-opacity="0"/></radialGradient></defs>
    <rect width="400" height="250" fill="url(#nt)"/>
    ${[[40, 30], [90, 60], [150, 24], [220, 48], [280, 20], [360, 40], [320, 76], [120, 90]].map(([x, y], i) => `<circle class="twinkle t${i % 3}" cx="${x}" cy="${y}" r="1.8" fill="#fff"/>`).join('')}
    <circle cx="330" cy="62" r="20" fill="#FDF2C4"/><circle cx="321" cy="56" r="18" fill="#132048"/>
    <path d="M0 196 L60 150 L120 182 L190 140 L260 178 L330 146 L400 170 V250 H0Z" fill="#162447"/>
    <rect y="204" width="400" height="46" fill="#1B2A4A"/><path d="M0 232 H400" stroke="#33466F" stroke-width="3" stroke-dasharray="16 16"/>
    <path d="M70 208 V-4 Q70 -10 84 -10 L112 -10" stroke="#33466F" stroke-width="6" fill="none"/>
    <circle cx="108" cy="-4" r="46" fill="url(#nl)"/><circle class="flicker" cx="108" cy="-4" r="7" fill="#FDE68A"/>
    <ellipse cx="108" cy="214" rx="64" ry="9" fill="#FDE68A" opacity=".1" class="flicker"/>
    <path d="M316 208 V40" stroke="#33466F" stroke-width="5"/><circle cx="316" cy="36" r="6" fill="#33466F"/>
    <g fill="#0B1530">${tree(22, 214, 2.6, '#0E1A38')}${tree(386, 214, 2.4, '#0E1A38')}</g>
    <g class="eyes"><circle cx="372" cy="150" r="2" fill="#FDE68A"/><circle cx="381" cy="150" r="2" fill="#FDE68A"/></g>` +
    person({ x: 204, y: 238, s: P1, shirt: '#3B4C75', pants: '#1E293B', skin: '#C9A88C', pose: 'walk', mood: 'sad', flip: true });

  // ---- Weather: one scene, five states (data-w on the wrapper) ----
  S.weather = () => `<rect class="w-bg" width="400" height="250"/>
    <g class="w-sun" transform="translate(70 56)"><g class="sunrot"><circle r="28" fill="#FFB020"/>${Array.from({ length: 10 }, (_, i) => `<path d="M0 -38 V-50" stroke="#FFB020" stroke-width="5" stroke-linecap="round" transform="rotate(${i * 36})"/>`).join('')}</g></g>
    <g class="w-heat" stroke="#F59E0B" stroke-width="2.5" fill="none" stroke-linecap="round" opacity=".7"><path d="M150 70 q8 -8 0 -16 q-8 -8 0 -16"/><path d="M180 64 q8 -8 0 -16 q-8 -8 0 -16"/><path d="M350 80 q8 -8 0 -16 q-8 -8 0 -16"/></g>
    <g class="w-cloud">${cloud(110, 44, 1.2, '#94A3B8')}${cloud(300, 36, 1.1, '#8392A8')}</g>
    <rect y="196" width="400" height="54" fill="#B9C3D2"/><path d="M0 238 H400" stroke="#fff" stroke-width="3" stroke-dasharray="18 14" opacity=".8"/>
    <rect y="188" width="400" height="10" fill="#CED6E2"/>
    <rect x="22" y="70" width="156" height="12" rx="4" fill="${C.deep}"/>
    <g class="w-ice" fill="#E0F2FE">${[30, 50, 74, 96, 120, 146, 168].map((x, i) => `<path d="M${x} 82 l4 ${8 + (i % 3) * 5} l4 -${8 + (i % 3) * 5}Z"/>`).join('')}</g>
    <rect x="30" y="82" width="140" height="106" fill="rgba(255,255,255,.4)" stroke="#94A3B8" stroke-width="2"/>
    <path d="M30 82 V190 M170 82 V190" stroke="#64748B" stroke-width="5"/>
    <rect x="52" y="152" width="96" height="7" rx="3" fill="${C.brown}"/>
    <path d="M214 190 V40" stroke="#64748B" stroke-width="4"/><circle cx="214" cy="34" r="16" fill="#fff" stroke="${C.teal}" stroke-width="4"/><path d="M207 34 h14" stroke="${C.teal}" stroke-width="3" stroke-linecap="round"/>
    <g class="w-hiker">${person({ x: 290, y: 200, s: P1, shirt: C.orange, pose: 'thumb', flip: true, mood: 'sad' })}
      <g class="w-sweat" fill="#60A5FA">${[[276, 104], [300, 98], [284, 92]].map(([x, y], i) => `<path class="drop d${i}" d="M${x} ${y} q4 6 0 9 q-4 -3 0 -9Z"/>`).join('')}</g>
      <g class="w-breath" fill="#fff" opacity=".85"><circle cx="262" cy="108" r="5"/><circle cx="252" cy="102" r="7"/></g></g>
    <g class="w-cars">${sideCar(-150, 196, '#64748B', 2.2, 'zoom z1')}${sideCar(-150, 196, C.light, 2.2, 'zoom z2')}</g>
    <g class="w-rain" stroke="#3B6FB6" stroke-width="2.4" stroke-linecap="round">${Array.from({ length: 34 }, (_, i) => `<path class="rd r${i % 4}" d="M${(i * 37) % 400} ${(i * 53) % 160} l-6 16"/>`).join('')}</g>
    <g class="w-hail" fill="#fff" stroke="#94A3B8" stroke-width="1">${Array.from({ length: 22 }, (_, i) => `<circle class="hd r${i % 4}" cx="${(i * 41 + 13) % 400}" cy="${(i * 29) % 150}" r="${3 + (i % 3)}"/>`).join('')}</g>
    <rect class="w-tint" width="400" height="250"/>`;

  // ---- A stranger in a car ----
  S.stranger = () => base('st', { sky: ['#E6EEFA', '#F8FAFD'], horizon: 196, far: ridge(130, 16, .03, 1), farCol: '#D2DCEB', ground: ['#CBD5E1', '#B6C2D2'], lane: false }) +
    `<path d="M0 226 H400" stroke="#fff" stroke-width="3" stroke-dasharray="18 14" opacity=".6"/>
     <g transform="translate(140 204) scale(2.4)"><ellipse cx="3" cy="12" rx="56" ry="5" fill="rgba(15,23,42,.2)"/>
      <path d="M-48 -8 Q-48 -20 -36 -22 L-22 -23 Q-12 -38 4 -38 L22 -38 Q34 -38 42 -23 L48 -21 Q54 -19 54 -8 L54 -2 Q54 2 50 2 L-44 2 Q-48 2 -48 -2Z" fill="#334155"/>
      <path d="M-17 -24 Q-10 -33 1 -33 L8 -33 L8 -24Z M12 -33 L23 -33 Q32 -33 36 -24 L12 -24Z" fill="#9FB3CC"/>
      <circle cx="24" cy="-28" r="4.4" fill="#0F172A"/><path d="M16 -23 Q24 -27 31 -23" fill="#0F172A"/>
      <rect x="18" y="-29.5" width="9" height="2" rx="1" fill="#475569"/>
      <circle cx="-27" cy="2" r="10" fill="#1E293B"/><circle cx="-27" cy="2" r="4" fill="#94A3B8"/><circle cx="33" cy="2" r="10" fill="#1E293B"/><circle cx="33" cy="2" r="4" fill="#94A3B8"/></g>` +
    `<g transform="translate(346 234) rotate(-8)">${person({ x: 0, y: 0, s: P1, shirt: C.orange, pose: 'look', mood: 'o', flip: true })}</g>` +
    `<g class="bigq"><circle cx="338" cy="58" r="26" fill="#fff" stroke="${C.orange}" stroke-width="3"/><text x="338" y="70" font-size="34" font-weight="800" font-family="Heebo,sans-serif" text-anchor="middle" fill="${C.orange}">?</text>
      <circle cx="326" cy="92" r="5" fill="#fff" stroke="${C.orange}" stroke-width="2"/></g>`;

  S.lines = S.lines || (() => '');

  window.fillScenes = () => {
    document.querySelectorAll('[data-scene]').forEach((el) => {
      const build = S[el.dataset.scene];
      if (!build || el.firstElementChild) return;
      el.innerHTML = `<svg viewBox="0 0 400 250" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">${build()}</svg>`;
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) el.firstElementChild.pauseAnimations?.();
    });
  };
})();
