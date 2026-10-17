// Habkan brand film — deterministic renderer. window.render(t) draws the frame at t seconds.
const DUR = 57;
const $ = id => document.getElementById(id);
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, k) => a + (b - a) * k;
const P = (t, a, b) => clamp((t - a) / (b - a));
const eOut = k => 1 - Math.pow(1 - k, 3);
const eOut5 = k => 1 - Math.pow(1 - k, 5);
const eIn = k => k * k * k;
const eIO = k => (k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const eBack = k => { const c = 1.7; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };
const AR = n => String(n);
const fmt = n => Math.round(n).toLocaleString('en-US');
const rnd = s => { const x = Math.sin(s * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

function tf(el, { o = 1, x = 0, y = 0, s = 1, r = 0, blur = 0, sx, sy } = {}) {
  el.style.opacity = o;
  el.style.transform = `translate(${x}px,${y}px) rotate(${r}deg) scale(${sx ?? s},${sy ?? s})`;
  el.style.filter = blur > 0.05 ? `blur(${blur}px)` : 'none';
}
function show(id, on) { $(id).style.display = on ? 'block' : 'none'; }

// ---------- word reveal ----------
function splitWords(el) {
  if (el._words) return el._words;
  const walk = (node, out) => {
    [...node.childNodes].forEach(n => {
      if (n.nodeType === 3) {
        const parts = n.textContent.split(/(\s+)/);
        const frag = document.createDocumentFragment();
        parts.forEach(p => {
          if (!p) return;
          if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(p)); return; }
          const w = document.createElement('span'); w.className = 'w';
          const i = document.createElement('i'); i.textContent = p; w.appendChild(i); frag.appendChild(w); out.push(i);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1 && n.tagName !== 'BR' && !n.classList.contains('ck')) {
        if (n.classList.contains('saf')) { // keep gradient span intact as one unit
          const w = document.createElement('span'); w.className = 'w'; const i = document.createElement('i');
          n.replaceWith(w); w.appendChild(i); i.appendChild(n); out.push(i);
        } else walk(n, out);
      }
    });
  };
  const out = []; walk(el, out); el._words = out; return out;
}
// in: reveal starting at a; out: exit starting at b
function words(id, t, a, b = 1e9, { st = 0.08, d = 0.55, outD = 0.4 } = {}) {
  const el = $(id); const ws = splitWords(el);
  if (t < a - 0.01 || t > b + outD + 0.01) { el.style.visibility = 'hidden'; return; }
  el.style.visibility = 'visible';
  ws.forEach((w, i) => {
    const k = eOut5(P(t, a + i * st, a + i * st + d));
    const ko = eIn(P(t, b + i * st * .5, b + i * st * .5 + outD));
    w.style.transform = `translateY(${(1 - k) * 110 - ko * 60}%)`;
    w.style.opacity = Math.min(k * 1.4, 1) * (1 - ko);
  });
  el.style.filter = 'none';
}
function fade(id, t, a, b, { d = 0.5, od = 0.4, y = 30, s0 = 1 } = {}) {
  const el = $(id); const k = eOut(P(t, a, a + d)), ko = eIn(P(t, b, b + od));
  tf(el, { o: k * (1 - ko), y: (1 - k) * y - ko * y * .6, s: lerp(s0, 1, k), blur: (1 - k) * 8 + ko * 6 });
}

// ---------- background ----------
const gctx = $('grain').getContext('2d');
(() => { const im = gctx.createImageData(1024, 1024); for (let i = 0; i < im.data.length; i += 4) { const v = Math.random() * 255; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; } gctx.putImageData(im, 0, 0); })();
function bg(t) {
  $('grain').style.transform = `translate(${-rnd(Math.floor(t * 24)) * 180}px,${-rnd(Math.floor(t * 24) + 9) * 180}px)`;
  $('pattern').style.transform = `translate(${-(t * 6) % 120}px,${-(t * 3) % 120}px)`;
  $('bg').style.transform = `translate(${Math.sin(t * .2) * 30}px,${Math.cos(t * .15) * 20}px)`;
}

// ---------- store mockup ----------
const PRODUCTS = [
  { n: 'عود ملكي', p: '240 ر.س', c1: '#3B2F4A', c2: '#C89B5A', tag: 'الأكثر مبيعًا' },
  { n: 'مسك الورد', p: '180 ر.س', c1: '#9C4A5E', c2: '#F2C6CF', tag: 'جديد' },
  { n: 'عنبر الليل', p: '210 ر.س', c1: '#1F3B4A', c2: '#B8D3D9', tag: 'خصم 15٪' },
];
const bottle = (c1, c2) => `<svg width="110" height="130" viewBox="0 0 110 130"><rect x="44" y="6" width="22" height="16" rx="3" fill="${c2}"/><rect x="38" y="20" width="34" height="14" rx="4" fill="#2a2433"/><path d="M22 40h66a10 10 0 0 1 10 10v62a12 12 0 0 1-12 12H24a12 12 0 0 1-12-12V50a10 10 0 0 1 10-10z" fill="${c1}"/><rect x="30" y="66" width="50" height="30" rx="4" fill="${c2}" opacity=".85"/><path d="M24 48h10v64h-6a6 6 0 0 1-4-4z" fill="#fff" opacity=".18"/></svg>`;
$('cards').innerHTML = PRODUCTS.map(p => `<div class="card"><div class="img">${bottle(p.c1, p.c2)}</div><div class="tag">${p.tag}</div><div class="nm">${p.n}</div><div class="pr">${p.p}</div><div class="stars">★★★★★</div><div class="add">أضف للسلة</div></div>`).join('');
const cards = [...document.querySelectorAll('#mock .card')];
document.querySelectorAll('.ck').forEach(c => c.innerHTML = `<svg width="46" height="46" viewBox="0 0 46 46"><circle cx="23" cy="23" r="21" fill="none" stroke="#3DDC97" stroke-width="3"/><path class="ckp" d="M13 24l7 7 14-15" fill="none" stroke="#3DDC97" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" pathLength="1" stroke-dasharray="1"/></svg>`);

const NOTIFS = [
  ['طلب جديد #1041', 'عود ملكي × 2 — الرياض', '+480'],
  ['طلب جديد #1042', 'مسك الورد — جدة', '+180'],
  ['طلب جديد #1043', 'عنبر الليل × 3 — الدمام', '+535'],
  ['طلب جديد #1044', 'عود ملكي — مكة', '+240'],
  ['طلب جديد #1045', 'مجموعة الهدايا — الخبر', '+690'],
];
$('notifs').innerHTML = NOTIFS.map(n => `<div class="notif"><div class="ic"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><path d="M5 7h14l-1.5 12h-11z"/><path d="M9 7a3 3 0 0 1 6 0"/></svg></div><div class="tx"><b>${n[0].replace(/\d+/, m => AR(m))}</b><span>${n[1]}</span></div><div class="amt">${n[2]} ر.س</div></div>`).join('');
const notifEls = [...document.querySelectorAll('.notif')];

function storeScene(t) {
  const A = t < 20; // act one vs. act three (after Habkan)
  const mock = $('mock');
  if (A) {
    // build-in 2.0 → 4.2
    const kIn = eOut5(P(t, 1.9, 2.9));
    let x = 0, y = (1 - kIn) * 80, s = lerp(0.92, 1, kIn), o = kIn, r = 0, blur = (1 - kIn) * 10;
    // drift
    y += Math.sin(t * .8) * 4;
    // sad dimming 8 → 10.7
    const dim = P(t, 7.9, 9.4);
    mock.style.filter = `grayscale(${dim * 0.85}) brightness(${1 - dim * .35})`;
    // glitch + collapse into a thread 10.7 → 11.9
    const g = P(t, 10.45, 10.95), col = eIO(P(t, 10.85, 11.4));
    if (g > 0 && g < 1) { const j = Math.floor(t * 30); x += (rnd(j) - .5) * 40 * g; r = (rnd(j + 3) - .5) * 2 * g;
      mock.style.filter += ` drop-shadow(${8 * g}px 0 rgba(255,60,90,.8)) drop-shadow(${-8 * g}px 0 rgba(60,200,255,.8))`; }
    const sy = lerp(1, 0.006, col), sx = lerp(1, 1.75, col);
    tf(mock, { o: o * (1 - P(t, 11.3, 11.45)), x: x + col * 310, y, sx: s * sx, sy: s * sy, r, blur });
    // product cards stagger
    cards.forEach((c, i) => { const k = eOut(P(t, 2.5 + i * .12, 3.2 + i * .12)); c.style.transform = `translateY(${(1 - k) * 40}px)`; c.style.opacity = k;
      c.querySelector('.tag').style.opacity = 0; c.querySelector('.stars').style.opacity = 0; c.querySelector('.add').style.height = '0px'; });
    $('ship').style.opacity = 0; $('cartN').textContent = '0';
    $('heroBtn').style.background = '#F6EEE3'; $('heroBtn').style.color = '#3B2F4A';
    // stats 7.9 → 10.5
    const ks = eOut(P(t, 7.6, 8.3));
    tf($('statbar'), { o: ks * (1 - P(t, 10.4, 10.7)), y: (1 - ks) * 40 });
    $('stVisits').textContent = fmt(2480 * eOut(P(t, 7.8, 10.2)));
    $('stCart').textContent = fmt(Math.floor(3 * P(t, 8.4, 9.6)));
    const blink = t > 9 && Math.floor(t * 4) % 2 === 0;
    $('stOrders').textContent = '0'; $('stOrders').style.color = t > 8.8 ? (blink ? '#FF5A5F' : '#b33f44') : 'var(--sand)';
    // cursor: wanders over a product then leaves
    const cu = $('cursor'), path = [[1400, 1000, 7.7], [700, 690, 8.4], [640, 640, 8.9], [520, 600, 9.4], [500, 610, 9.7], [-120, 1150, 10.5]];
    let cx = path[0][0], cy = path[0][1];
    for (let i = 0; i < path.length - 1; i++) { const [x0, y0, t0] = path[i], [x1, y1, t1] = path[i + 1];
      if (t >= t0) { const k = eIO(P(t, t0, t1)); cx = lerp(x0, x1, k); cy = lerp(y0, y1, k); } }
    tf(cu, { o: (t > 7.7 && t < 10.5) ? 1 : 0, x: cx, y: cy, s: 1.2 });
    notifEls.forEach(n => n.style.opacity = 0);
  } else {
    // act three: 35.2 → 39.3, the store comes back alive
    const kIn = eOut5(P(t, 37.15, 37.85));
    const out = eIn(P(t, 38.85, 39.25));
    mock.style.filter = 'none';
    tf(mock, { o: kIn * (1 - out), x: -(1 - kIn) * 60 - out * 80, y: Math.sin(t * .8) * 4, s: lerp(1.06, 1, kIn) * (1 - out * .05), blur: (1 - kIn) * 8 + out * 6 });
    cards.forEach((c, i) => { c.style.transform = 'none'; c.style.opacity = 1;
      const k = eBack(P(t, 37.4 + i * .1, 37.8 + i * .1));
      c.querySelector('.tag').style.opacity = k; c.querySelector('.tag').style.transform = `scale(${0.5 + .5 * k})`;
      c.querySelector('.stars').style.opacity = k; c.querySelector('.add').style.height = `${36 * eOut(P(t, 37.3 + i * .1, 37.7 + i * .1))}px`; });
    $('ship').style.opacity = eOut(P(t, 37.3, 37.6));
    $('heroBtn').style.background = 'linear-gradient(120deg,#FFB43C,#E9542B)'; $('heroBtn').style.color = '#fff';
    tf($('statbar'), { o: 0 });
    tf($('cursor'), { o: 0 });
    let n = 0;
    notifEls.forEach((el, i) => {
      const a = 37.6 + i * 0.27; const k = eOut5(P(t, a, a + .4)); if (t > a) n = i + 1;
      el.style.top = '0px';
      const stackY = 260 + i * 116;
      tf(el, { o: k * (1 - out), x: (1 - k) * 220 + out * 120, y: stackY, s: lerp(.9, 1, k) });
    });
    $('cartN').textContent = AR(n * 3 + Math.floor(P(t, 37.6, 39) * 4));
  }
}
function storeText(t) {
  // opening: a single thread runs across the dark, a rhombus "dot" rides its head
  const il = eIO(P(t, 0.1, 1.6)), io = P(t, 1.7, 2.3);
  $('introLine').style.strokeDashoffset = 1 - il; $('introLine').style.opacity = (t < 2.3 ? 1 : 0) * (1 - io);
  $('introLine').setAttribute('transform', `translate(0,${-io * 0}) scale(1,${1 - io})`); $('introLine').style.transformOrigin = '960px 540px';
  $('introKnot').setAttribute('transform', `translate(${1920 - il * 1160},540) rotate(45) scale(${1 - io})`);
  $('introKnot').style.opacity = (t > 0.1 && t < 2.3) ? 1 - io : 0;
  words('t1a', t, 1.0, 7.5, { d: .7 });
  words('t1b', t, 2.3, 7.5);
  words('t1c', t, 4.47, 7.5); words('t1d', t, 5.96, 7.5);
  ['t1c', 't1d'].forEach((id, i) => { const a = [4.47, 5.96][i]; const ck = $(id).querySelector('.ck');
    ck.style.opacity = P(t, a, a + .2) * (1 - P(t, 7.5, 7.9)); ck.querySelector('.ckp').style.strokeDashoffset = 1 - eOut(P(t, a + .1, a + .5)); });
  words('t2a', t, 7.98, 10.5);
  words('t2b', t, 9.06, 10.55, { st: .12 });
  words('t8a', t, 35.5, 36.85);
  words('t8b', t, 35.78, 36.85);
  $('days').textContent = AR(Math.max(1, Math.round(1 + 29 * eIO(P(t, 35.9, 36.9)))));
  words('t8c', t, 37.59, 38.85, { st: .14 });
  // in act three the text lives on the left, the mockup on the right
  const act3 = t > 20;
  $('mock').style.left = '150px'; $('mock').style.top = act3 ? '250px' : '200px';
  $('notifs').style.cssText = 'position:absolute;left:0;top:0;width:1920px;height:1080px';
  notifEls.forEach(el => { el.style.left = 'auto'; el.style.right = '110px'; });
}

// ---------- S3: the plot ----------
function plotScene(t) {
  words('t3a', t, 11.05, 12.7, { d: .6 });
  words('t3b', t, 12.93, 14.25, { st: .14, d: .5 });
  // the collapsed store becomes a thread, then underlines "الحبكة"
  const k1 = P(t, 11.32, 11.6), k2 = eIO(P(t, 12.95, 13.6)), out = eIn(P(t, 14.1, 14.55));
  const y = lerp(520, 640, k2);
  const xL = lerp(lerp(150, 780, 0), 520, k2), xR = lerp(1770, 1040, k2);
  const wav = 26 * (1 - k2) * Math.sin(t * 9);
  const d = `M${xL},${y} C${lerp(xL, xR, .33)},${y - wav} ${lerp(xL, xR, .66)},${y + wav} ${xR},${y}`;
  $('plotPath').setAttribute('d', d);
  $('plotPath').style.opacity = (k1 > 0 ? 1 : 0) * (1 - out);
  $('plotPath').setAttribute('stroke-width', lerp(14, 8, k2));
  // the underline needs to sit under the word on the right side, measure it once
  const sp = $('t3b').querySelector('.saf');
  if (sp && t > 12.9) { const r = sp.getBoundingClientRect(); const k = eIO(P(t, 12.95, 13.6));
    $('plotPath').setAttribute('d', `M${lerp(xL, r.left + 10, k)},${lerp(y, r.bottom + 6, k)} L${lerp(xR, r.right - 10, k)},${lerp(y, r.bottom + 6, k)}`); }
}

// ---------- logo (S4 + S10) ----------
const L = window.LOGO;
const SQ = 300, RR = SQ * Math.SQRT2;
$('logoDefs').innerHTML = L.defs.replace(/<\/?defs>/g, '');
$('knotFinal').innerHTML = L.knot;
$('knotDraw').innerHTML = `<path id="kA" d="M${-SQ},${-SQ}H${SQ}V${SQ}H${-SQ}Z" fill="none" stroke="url(#safk)" stroke-width="76" stroke-linejoin="round" pathLength="1" stroke-dasharray="1 1"/>` +
  `<path id="kB" d="M${RR},0L0,${RR}L${-RR},0L0,${-RR}Z" fill="none" stroke="#F4EBDD" stroke-width="76" stroke-linejoin="round" pathLength="1" stroke-dasharray="1 1"/>`;
$('wmWrap').innerHTML = L.letters.map(l => `<g class="lt" data-id="${l.id}"><path transform="translate(${l.x},0) scale(1,-1)" d="${l.d}" fill="#F4EBDD"/></g>`).join('') +
  `<path id="dotBeh" d="${L.dots.beh}" fill="url(#saf)"/><path id="dotNoon" d="${L.dots.noon}" fill="#F4EBDD"/>`;
const letters = [...document.querySelectorAll('#wmWrap .lt')];
// eight converging threads
$('threads').innerHTML = Array.from({ length: 8 }, (_, i) => `<path class="th" fill="none" stroke="${i % 2 ? '#F4EBDD' : 'url(#gS)'}" stroke-width="5" stroke-linecap="round"/>`).join('');
const ths = [...document.querySelectorAll('#threads .th')];

function placeLogo(cx, cy, ks, wmx, wmy, ws) {
  $('knotWrap').setAttribute('transform', `translate(${cx},${cy}) scale(${ks})`);
  $('wmWrap').setAttribute('transform', `translate(${wmx},${wmy}) scale(${ws})`);
}
function logoScene(t) {
  const first = t < 30;
  let knotDraw = 1, knotO = 1, flash = 0, wmK = 1, dotK = 1, thK = 0, gO = 1;
  if (first) {
    // threads converge 13.9 → 15.45
    thK = eIO(P(t, 13.95, 15.4));
    ths.forEach((p, i) => {
      const a = i * Math.PI / 4 + 0.35; const R0 = 1300, R = lerp(R0, 0, thK);
      const sx = 960 + Math.cos(a) * R0, sy = 470 + Math.sin(a) * R0;
      const ex = 960 + Math.cos(a) * R * .25, ey = 470 + Math.sin(a) * R * .25;
      const mx = lerp(sx, ex, .5) + Math.cos(a + 1.4) * 160 * (1 - thK), my = lerp(sy, ey, .5) + Math.sin(a + 1.4) * 160 * (1 - thK);
      p.setAttribute('d', `M${lerp(sx, ex, eOut(P(t, 13.9, 14.6)) * .7)},${lerp(sy, ey, eOut(P(t, 13.9, 14.6)) * .7)} Q${mx},${my} ${ex},${ey}`);
      p.style.opacity = P(t, 13.9, 14.1) * (1 - P(t, 15.3, 15.5));
    });
    knotDraw = eIO(P(t, 14.7, 15.45));
    flash = Math.max(0, 1 - Math.abs(t - 15.47) / 0.1) * .12;
    wmK = 1; dotK = 1;
    // positions: knot centered above, wordmark below
    const settle = eOut5(P(t, 15.45, 16.4));
    const ks = lerp(0.62, 0.46, settle) * (1 + 0.04 * Math.max(0, 1 - Math.abs(t - 15.5) / .25));
    placeLogo(960, lerp(540, 420, settle), ks * .92, 960 - 1310 * 0.26, 845, 0.26);
    gO = 1 - eIn(P(t, 16.95, 17.3));
    letters.forEach((g, i) => { const a = 15.55 + (4 - i) * .07; const k = eOut5(P(t, a, a + .55));
      g.setAttribute('transform', `translate(0,${(1 - k) * 260})`); g.style.opacity = k; });
    const dk = eBack(P(t, 16.15, 16.55));
    $('dotBeh').setAttribute('transform', `translate(0,${(1 - dk) * -500})`); $('dotBeh').style.opacity = P(t, 16.1, 16.2);
    const nk = eOut(P(t, 15.9, 16.2)); $('dotNoon').style.opacity = nk; $('dotNoon').setAttribute('transform', `translate(0,${(1 - nk) * -60})`);
    words('t4a', t, 14.59, 16.9, { d: .5 });
    fade('latin', t, 16.2, 16.95, { d: .5 }); $('latin').style.top = '935px';
    ['t10a', 't10b', 't10c', 't10d', 't10e'].forEach(id => $(id).style.visibility = 'hidden');
  } else {
    // end card 45.2 → 57
    ths.forEach(p => p.style.opacity = 0);
    $('t4a').style.visibility = 'hidden';
    knotDraw = eIO(P(t, 45.25, 45.95));
    flash = Math.max(0, 1 - Math.abs(t - 45.98) / 0.1) * .12 + Math.max(0, 1 - Math.abs(t - 50.6) / 0.1) * .08;
    const lift = eIO(P(t, 46.5, 47.2));
    const final = eIO(P(t, 52.0, 53.0));
    // horizontal lockup centered; lifts up for taglines
    const baseY = lerp(lerp(560, 470, lift), 450, final);
    const sc = 0.30;
    // centered horizontal lockup: knot on the left, wordmark on the right (reads RTL)
    $('wmWrap').setAttribute('transform', `translate(751,${baseY + 70}) scale(${sc})`);
    $('knotWrap').setAttribute('transform', `translate(517,${baseY - 45}) scale(0.36)`);
    letters.forEach((g, i) => { const a = 45.66 + (4 - i) * .06; const k = eOut5(P(t, a, a + .55));
      g.setAttribute('transform', `translate(0,${(1 - k) * 200})`); g.style.opacity = k; });
    const dk = eBack(P(t, 46.1, 46.5));
    $('dotBeh').setAttribute('transform', `translate(0,${(1 - dk) * -420})`); $('dotBeh').style.opacity = P(t, 46.05, 46.15);
    const nk = eOut(P(t, 45.9, 46.2)); $('dotNoon').style.opacity = nk; $('dotNoon').setAttribute('transform', `translate(0,${(1 - nk) * -60})`);
    $('latin').style.top = `${baseY + 150}px`; fade('latin', t, 46.3, 1e9, { d: .6 });
    $('latin').style.opacity = Math.min(+$('latin').style.opacity, 1 - P(t, 46.6, 47.0) + P(t, 52.4, 53.0));
    words('t10a', t, 46.74, 51.9, { st: .1 });
    words('t10b', t, 48.97, 51.9, { st: .14 });
    $('t10a').style.top = '700px'; $('t10b').style.top = '790px';
    // the "يبيع" word lands with a punch
    const sp = $('t10b').querySelector('.saf');
    if (sp) { const k = P(t, 50.55, 50.9); sp.parentElement.style.transform = `scale(${1 + .25 * Math.max(0, 1 - Math.abs(t - 50.65) / .3)})`; sp.style.opacity = P(t, 50.5, 50.62); }
    words('t10c', t, 53.0, 1e9, { st: .12 }); $('t10c').style.top = '690px';
    fade('t10d', t, 53.6, 1e9, { d: .7 }); $('t10d').style.top = '790px';
    fade('t10e', t, 54.0, 1e9, { d: .7 }); $('t10e').style.top = '850px';
    gO = 1 - P(t, 56.2, 57);
  }
  // knot drawing → woven final
  const drawn = knotDraw < 1;
  $('kA').style.strokeDashoffset = 1 - knotDraw; $('kB').style.strokeDashoffset = 1 - eIO(clamp(knotDraw * 1.15 - .15));
  $('knotDraw').style.opacity = drawn ? 1 : 0; $('knotFinal').style.opacity = drawn ? 0 : 1;
  $('knotWrap').style.opacity = knotDraw > 0 ? 1 : 0;
  $('logoSvg').style.opacity = gO;
  $('flash').style.opacity = flash;
  // slow spin of the knot core while idle
  const core = document.querySelector('#knotFinal .knot-core'); if (core) core.setAttribute('transform', `rotate(${(t * 20) % 360})`);
}

// ---------- S5: the question ----------
const SW = ['#E9542B', '#FFB43C', '#3B2F4A', '#9C4A5E', '#1F3B4A', '#C89B5A', '#3DDC97'];
$('swatches').innerHTML = SW.map((c, i) => `<div class="abs sw" style="width:150px;height:190px;border-radius:24px;background:${c};box-shadow:0 20px 50px rgba(0,0,0,.4)"></div>`).join('') +
  `<div class="abs sw" style="width:190px;height:190px;border-radius:24px;background:#F4EBDD;color:#0F0E13;display:grid;place-items:center;font:900 90px Alx">أ ب</div>`;
const sws = [...document.querySelectorAll('#swatches .sw')];
function askScene(t) {
  sws.forEach((s, i) => {
    const n = sws.length; const k = eOut5(P(t, 17.0 + i * .06, 17.7 + i * .06));
    const fx = 960 + (i - (n - 1) / 2) * 190 - 75, fy = 470 + Math.sin(i * 1.7) * 30;
    const fall = eIn(P(t, 18.2 + i * .05, 19.0 + i * .05));
    tf(s, { o: k * (1 - fall), x: fx + (rnd(i) - .5) * 400 * (1 - k), y: fy + (1 - k) * 200 + fall * 700, r: (rnd(i + 2) - .5) * 30 * (1 - k) + fall * (rnd(i + 5) - .5) * 90, s: lerp(.6, 1, k) });
  });
  words('t5a', t, 17.08, 18.6);
  words('t5b', t, 18.91, 22.0);
  words('t5c', t, 20.34, 22.0, { st: .14, d: .5 });
  words('t5d', t, 21.62, 22.05, { d: .45 });
  $('t5c').style.transform = `scale(${1 + .04 * eOut(P(t, 20.3, 22))})`;
}

// ---------- S6: three threads ----------
const TH_COL = ['url(#gS2)', '#F4EBDD', '#E9542B'];
$('pThreads').innerHTML = [0, 1, 2].map(i => `<path id="pt${i}" fill="none" stroke="${TH_COL[i]}" stroke-width="5" stroke-linecap="round" pathLength="1" stroke-dasharray="1 1"/>`).join('');
// card visuals
$('v1').innerHTML = [40, 70, 55, 95, 120, 150, 175].map((h, i) => `<rect class="bar1" data-h="${h}" x="${14 + i * 54}" y="190" width="36" height="0" rx="7" fill="${i === 6 ? 'url(#gS2)' : '#3a3448'}"/>`).join('');
$('v2').innerHTML = [['أنت', 168, 'url(#gS2)'], ['منافس أ', 120, '#4a4359'], ['منافس ب', 92, '#4a4359'], ['منافس ج', 64, '#4a4359']].map((r, i) => `<text x="394" y="${30 + i * 46}" text-anchor="end" font-family="Alx" font-weight="500" font-size="17" fill="#9A92A6">${r[0]}</text><rect class="bar2" data-w="${r[1] * 1.6}" x="${394 - 100 - r[1] * 1.6}" y="${14 + i * 46}" height="24" width="0" rx="6" fill="${r[2]}"/>`).join('');
$('v3').innerHTML = `<circle cx="300" cy="80" r="56" fill="#24202f" stroke="url(#gS2)" stroke-width="3"/><circle cx="300" cy="64" r="18" fill="#F4EBDD"/><path d="M268 112a32 26 0 0 1 64 0" fill="#F4EBDD"/>` +
  `<g id="bubble"><rect x="10" y="20" width="200" height="110" rx="22" fill="#2a2536" stroke="#3d3650"/><text x="190" y="64" text-anchor="end" font-family="Alx" font-weight="700" font-size="22" fill="#F4EBDD">ليه أشتري</text><text x="190" y="100" text-anchor="end" font-family="Alx" font-weight="700" font-size="22" fill="#FFB43C">من هنا؟</text><path d="M210 70l24 10-24 10z" fill="#2a2536"/></g>`;
function pillarsScene(t) {
  const starts = [22.86, 24.06, 25.66];
  const outT = 28.95;
  ['p1', 'p2', 'p3'].forEach((id, i) => {
    const a = starts[i] - .15; const k = eOut5(P(t, a, a + .7)); const o = eIn(P(t, outT + i * .05, outT + .45 + i * .05));
    tf($(id), { o: k * (1 - o), y: (1 - k) * 120 - o * 0, s: lerp(.94, 1, k) * (1 - o * .15), blur: (1 - k) * 6 });
    // threads hang from top into each card
    const cx = [1525, 960, 395][i];
    const tk = eIO(P(t, a - .1, a + .6));
    const p = $('pt' + i); p.setAttribute('d', `M${cx + (i - 1) * 40},-20 C${cx + (i - 1) * 40},120 ${cx},150 ${cx},250`);
    p.style.strokeDashoffset = 1 - tk;
    // during exit the threads swing toward the center (they are about to be woven)
    p.style.opacity = 1 - o;
  });
  document.querySelectorAll('#v1 .bar1').forEach((r, i) => { const k = eOut(P(t, 23.1 + i * .08, 23.6 + i * .08)); const h = +r.dataset.h * k; r.setAttribute('height', h); r.setAttribute('y', 190 - h); });
  document.querySelectorAll('#v2 .bar2').forEach((r, i) => { const k = eOut(P(t, 24.3 + i * .1, 24.9 + i * .1)); r.setAttribute('width', +r.dataset.w * k); });
  const bk = eBack(P(t, 26.0, 26.5)); $('bubble').setAttribute('transform', `translate(${(1 - bk) * 120},${(1 - bk) * 20}) `); $('bubble').style.opacity = clamp(bk);
  words('t6a', t, 27.12, 28.9, { st: .1 });
  // a single blinking pixel next to the line
  const px = $('pixel'); const r = $('t6a').getBoundingClientRect();
  px.style.left = (r.left + (r.width - $('t6a').scrollWidth) / 2 - 50) + 'px';
  const sp = $('t6a').querySelector('.saf'); if (sp) { const b = sp.getBoundingClientRect(); px.style.left = (b.left - 46) + 'px'; px.style.top = (b.top + b.height / 2 - 11) + 'px'; }
  px.style.opacity = (t > 27.9 && t < 28.9 && Math.floor(t * 5) % 2 === 0) ? 1 : 0;
}

// ---------- S7: weave ----------
const STEPS = ['أول نظرة', 'ثقة', 'رغبة', 'السلة', 'إتمام الطلب'];
const NX = [1700, 1405, 1110, 815, 520], NY = 650;
$('nodes').innerHTML = STEPS.map((s, i) => `<div class="node" style="left:${NX[i]}px;top:${NY - 32}px"><div class="dot">${AR(i + 1)}</div><div class="lb">${s}</div></div>`).join('');
const nodes = [...document.querySelectorAll('.node')];
const braidD = i => { let d = ''; for (let x = 1900; x >= 300; x -= 10) { const ph = (1900 - x) / 150 * Math.PI + i * 2 * Math.PI / 3;
  const amp = 46 * clamp((x - 330) / 300); const y = NY + Math.sin(ph) * amp; d += (d ? 'L' : 'M') + x + ',' + y.toFixed(1); } return d; };
$('braid').innerHTML = [0, 1, 2].map(i => `<path id="br${i}" d="${braidD(i)}" fill="none" stroke="${TH_COL[i]}" stroke-width="7" stroke-linecap="round" pathLength="1" stroke-dasharray="1 1"/>`).join('');
$('checkout').className = 'abs grad';
function weaveScene(t) {
  words('t7a', t, 29.57, 34.9, { st: .1 });
  words('t7b', t, 30.6, 34.9, { st: .1 });
  const k = eIO(P(t, 29.4, 34.0));
  const o = 1 - eIn(P(t, 34.9, 35.4));
  [0, 1, 2].forEach(i => { const p = $('br' + i); p.style.strokeDashoffset = 1 - k; p.style.opacity = o; });
  const headX = 1900 - k * 1600;
  nodes.forEach((n, i) => {
    const a = t > 29.3 ? (headX <= NX[i] + 5) : false;
    const ap = eBack(P(t, 29.6 + i * .15, 30.1 + i * .15));
    n.style.opacity = clamp(ap) * o; n.style.transform = `scale(${0.6 + .4 * ap})`;
    const dot = n.querySelector('.dot'), lb = n.querySelector('.lb');
    const hi = (i === 0 && t > 32.57) || (i === 4 && t > 33.95) || (a && i > 0 && i < 4);
    dot.style.background = a ? 'linear-gradient(135deg,#FFB43C,#E9542B)' : 'var(--ink2)';
    dot.style.borderColor = a ? '#FFB43C' : '#3a3448'; dot.style.color = a ? '#fff' : 'var(--muted)';
    lb.style.color = hi ? '#F4EBDD' : (a ? '#cfc6d8' : 'var(--muted)');
    lb.style.transform = `scale(${(i === 0 && t > 32.57 && t < 33.9) || (i === 4 && t > 33.95) ? 1.18 : 1})`;
  });
  const ck = eBack(P(t, 33.95, 34.35));
  const press = 1 - .06 * Math.max(0, 1 - Math.abs(t - 34.5) / .12);
  tf($('checkout'), { o: clamp(ck) * o, s: (.6 + .4 * ck) * press, y: 0 });
  $('checkout').style.left = (NX[4] - 150) + 'px'; $('checkout').style.top = '810px';
}

// ---------- S9: services ----------
function servicesScene(t) {
  const out = 45.05;
  [['sv1', 39.14], ['sv2', 40.02], ['sv3', 40.81]].forEach(([id, a], i) => {
    const k = eOut5(P(t, a - .1, a + .5)), o = eIn(P(t, out + i * .05, out + .4 + i * .05));
    tf($(id), { o: k * (1 - o), x: (1 - k) * -160, blur: (1 - k) * 10 + o * 8, s: 1 - o * .1 });
  });
  words('t9a', t, 41.21, out);
  [['pl1', 41.75], ['pl2', 42.57], ['pl3', 43.37]].forEach(([id, a], i) => {
    const k = eBack(P(t, a, a + .5)), o = eIn(P(t, out + .1 + i * .05, out + .5 + i * .05));
    tf($(id), { o: clamp(k * 1.5) * (1 - o), s: (.5 + .5 * k) * (1 - o * .2), y: (1 - clamp(k)) * 40 });
  });
}

// ---------- master ----------
const IN = (t, a, b) => t >= a && t <= b;
window.render = function (t) {
  bg(t);
  const storeOn = IN(t, 0, 11.6) || IN(t, 35.2, 39.3);
  show('sStore', storeOn); show('sStoreText', storeOn);
  if (storeOn) { storeText(t); storeScene(t); }
  show('sPlot', IN(t, 10.6, 14.6)); if (IN(t, 10.6, 14.6)) plotScene(t);
  const logoOn = IN(t, 13.9, 17.35) || IN(t, 45.2, 57.1);
  show('sLogo', logoOn); if (logoOn) logoScene(t); else $('flash').style.opacity = 0;
  show('sAsk', IN(t, 16.9, 22.6)); if (IN(t, 16.9, 22.6)) askScene(t);
  show('sPillars', IN(t, 22.4, 29.6)); if (IN(t, 22.4, 29.6)) pillarsScene(t);
  show('sWeave', IN(t, 29.2, 35.5)); if (IN(t, 29.2, 35.5)) weaveScene(t);
  show('sServices', IN(t, 38.9, 45.7)); if (IN(t, 38.9, 45.7)) servicesScene(t);
  // opening & closing fades
  $('stage').style.opacity = Math.min(P(t, 0, 0.6), 1 - P(t, 56.4, 57));
};
window.DUR = DUR;
if (!/headless/i.test(navigator.userAgent)) { // live preview in a normal browser
  const t0 = performance.now(); const loop = () => { render(((performance.now() - t0) / 1000) % DUR); requestAnimationFrame(loop); }; document.fonts.ready.then(loop);
}
// extra: giant question mark in S5
const _ask = askScene;
askScene = function (t) { _ask(t); const k = eOut(P(t, 18.8, 19.8)), o = P(t, 21.9, 22.4);
  tf($('qmark'), { o: k * (1 - o), s: lerp(1.25, 1, k), r: lerp(-12, 0, k) + (t - 19) * 1.5, blur: (1 - k) * 10 }); };
