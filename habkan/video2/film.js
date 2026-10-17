// Habkan reel — collage motion system. Deterministic: window.render(t) draws the frame at t seconds.
// Format comes from the URL (?w=1080&h=1920 for 9:16, ?w=1920&h=1080 for 16:9).
const Q = new URLSearchParams(location.search);
const W = +(Q.get('w') || 1080), H = +(Q.get('h') || 1920), V = H > W;
const DUR = 53.5, OFF = 0.5;
const pick = (v, h) => (V ? v : h);
const $ = id => document.getElementById(id);
const stage = $('stage'); stage.style.width = W + 'px'; stage.style.height = H + 'px';
document.body.style.width = W + 'px'; document.body.style.height = H + 'px';

// ---------------------------------------------------------------- math
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, k) => a + (b - a) * k;
const P = (t, a, b) => clamp((t - a) / (b - a));
const eOut = k => 1 - Math.pow(1 - k, 3);
const eOut5 = k => 1 - Math.pow(1 - k, 5);
const eIn = k => k * k * k;
const eIO = k => (k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const eBack = (k, c = 1.9) => (k <= 0 ? 0 : k >= 1 ? 1 : 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2));
const rnd = s => { const x = Math.sin(s * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const fmt = n => Math.round(n).toLocaleString('en-US');

// ---------------------------------------------------------------- voice cues (VO seconds) -> video time
const CUE = {
  sarf: 0.0, dafa: 1.40, musamim: 2.52, jalast: 3.24, awwal: 5.04, talab: 5.62,
  yom: 5.98, ziyarat: 7.04, salla: 8.10, fadya: 8.80,
  tabda: 9.26, aib1: 10.60, muntaji: 11.58, wala: 12.72, souq: 13.36,
  la1: 13.72, aib2: 14.22, mo1: 15.00,
  matjarak: 15.48, yijbak: 17.32, mo2: 17.90, yiqni: 18.74,
  matjar1: 19.50, mayibi: 20.60, matjar2: 21.70, wrah: 22.92, habka: 23.62,
  habkan: 24.38, manibda: 24.82, nibda2: 26.10, min: 27.38, wish: 28.24, walish: 29.38,
  nigra: 30.54, nifakkik: 31.42, nibni: 32.76, qarar: 34.28, minawwal: 35.52, lin: 36.72, talab2: 37.78,
  tasmim: 38.12, tatwir: 38.88, iada: 39.52, matajir: 40.64, salla2: 41.16, zid: 41.78, shopify: 42.48,
  la2: 43.32, khal: 44.78, habkan2: 45.36, tihbik: 45.88, yibi: 47.68,
};
const T = k => CUE[k] + OFF;

// ---------------------------------------------------------------- textures
const texCanvas = document.createElement('canvas'); texCanvas.width = texCanvas.height = 512;
(() => { const c = texCanvas.getContext('2d'); const im = c.createImageData(512, 512);
  for (let i = 0; i < im.data.length; i += 4) { const v = 200 + Math.random() * 55; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; }
  c.putImageData(im, 0, 0); c.globalAlpha = .08; c.strokeStyle = '#000';
  for (let i = 0; i < 260; i++) { c.beginPath(); const x = Math.random() * 512, y = Math.random() * 512, a = Math.random() * 6.28, l = 10 + Math.random() * 40;
    c.moveTo(x, y); c.quadraticCurveTo(x + Math.cos(a) * l / 2 + 5, y + Math.sin(a) * l / 2 - 5, x + Math.cos(a) * l, y + Math.sin(a) * l); c.stroke(); } })();
document.documentElement.style.setProperty('--tex', `url(${texCanvas.toDataURL()})`);
const gctx = $('grain').getContext('2d');
(() => { const im = gctx.createImageData(1024, 1024); for (let i = 0; i < im.data.length; i += 4) { const v = Math.random() * 255; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; } gctx.putImageData(im, 0, 0); })();

// ---------------------------------------------------------------- element helpers
function mk(root, html, { cls = '', css = '' } = {}) {
  const d = document.createElement('div'); d.className = 'it ' + cls; d.style.cssText = css; d.innerHTML = html; root.appendChild(d); return d;
}
const txt = (root, html, size, color = 'var(--paper)', extra = '') => mk(root, html, { cls: 't', css: `font-size:${size}px;color:${color};${extra}` });
// place an item by its centre
function put(e, x, y, { s = 1, r = 0, o = 1, blur = 0, sx = null, sy = null } = {}) {
  if (e.classList.contains('t') && o > 0) { const w = e.offsetWidth, mw = W * (V ? .9 : .62); if (w * s > mw) s = mw / w; }
  e.style.transform = `translate(${x}px,${y}px) translate(-50%,-50%) rotate(${r}deg) scale(${sx ?? s},${sy ?? s})`;
  e.style.opacity = o; e.style.filter = blur > .1 ? `blur(${blur}px)` : 'none';
  e.style.visibility = o <= 0.001 ? 'hidden' : 'visible';
}
// stop-motion jitter: changes 12 times a second
const jit = (seed, t, a = 1) => { const k = Math.floor(t * 12); return { dx: (rnd(seed * 13 + k) - .5) * 4 * a, dy: (rnd(seed * 7 + k + 3) - .5) * 4 * a, dr: (rnd(seed * 3 + k + 9) - .5) * 1.2 * a }; };
// standard "slap" entrance + exit; returns state
function anim(e, t, x, y, a, b = 1e9, { r = 0, r0 = null, s = 1, from = 'pop', d = .45, od = .3, seed = 1, jitA = 1, dist = 260, outTo = 'fade' } = {}) {
  if (t < a - .02 || t > b + od + .02) { e.style.visibility = 'hidden'; e.style.opacity = 0; return 0; }
  const k = P(t, a, a + d), ko = eIn(P(t, b, b + od)), kb = eBack(k);
  let X = x, Y = y, S = s, R = r, O = Math.min(1, k * 3) * (1 - ko), B = 0;
  if (from === 'pop') { S = s * lerp(.55, 1, kb); R = lerp(r0 ?? r + (rnd(seed) - .5) * 24, r, kb); }
  else if (from === 'slam') { S = s * lerp(1.6, 1, eOut5(k)); R = lerp(r0 ?? r - 8, r, eOut5(k)); O = Math.min(1, k * 5) * (1 - ko); }
  else { const dir = { up: [0, 1], down: [0, -1], left: [-1, 0], right: [1, 0] }[from];
    const kk = eOut5(k); X += dir[0] * dist * (1 - kk); Y += dir[1] * dist * (1 - kk); R = lerp(r0 ?? r + (dir[0] || dir[1]) * 6, r, kk); B = (1 - kk) * 14; }
  if (outTo === 'up') Y -= ko * 160; else if (outTo === 'left') X -= ko * 600; else if (outTo === 'right') X += ko * 600; else if (outTo === 'down') Y += ko * 300; else S *= (1 - ko * .15);
  const j = jit(seed, t, jitA * (k >= 1 ? 1 : 0));
  put(e, X + j.dx, Y + j.dy, { s: S, r: R + j.dr, o: O, blur: B + ko * 8 });
  return k;
}
// RTL word-by-word reveal for big text
function splitWords(el) {
  if (el._w) return el._w;
  const out = [];
  const walk = n => [...n.childNodes].forEach(c => {
    if (c.nodeType === 3) {
      const f = document.createDocumentFragment();
      c.textContent.split(/(\s+)/).forEach(p => { if (!p) return; if (/^\s+$/.test(p)) { f.appendChild(document.createTextNode(p)); return; }
        const s = document.createElement('span'); s.style.display = 'inline-block'; s.textContent = p; f.appendChild(s); out.push(s); });
      c.replaceWith(f);
    } else if (c.nodeType === 1 && c.tagName !== 'BR') { if (c.dataset.unit != null) { c.style.display = 'inline-block'; out.push(c); } else walk(c); }
  });
  walk(el); el._w = out; return out;
}
function words(e, t, x, y, a, b = 1e9, { st = .07, d = .4, od = .25, s = 1, r = 0, seed = 1 } = {}) {
  if (t < a - .02 || t > b + od + .02) { e.style.visibility = 'hidden'; return; }
  const ws = splitWords(e);
  ws.forEach((w, i) => { const k = P(t, a + i * st, a + i * st + d), kb = eBack(k, 2.4);
    w.style.transform = `translateY(${(1 - eOut5(k)) * 40}px) scale(${lerp(.4, 1, kb)}) rotate(${(1 - kb) * (rnd(i + seed) - .5) * 30}deg)`;
    w.style.opacity = Math.min(1, k * 4); });
  const ko = eIn(P(t, b, b + od)); const j = jit(seed + 50, t, .6);
  put(e, x + j.dx, y + j.dy - ko * 40, { s, r: r + j.dr, o: 1 - ko, blur: ko * 10 });
}
const kash = (n) => 'ـ'.repeat(Math.max(0, Math.round(n)));

// ---------------------------------------------------------------- reusable pieces
const L = window.LOGO;
const tileSVG = (size, tile = L.C.lime, glyph = L.C.ink) => `<svg width="${size}" height="${size}" viewBox="-520 -520 1040 1040"><path d="${L.squircle}" fill="${tile}"/><g transform="scale(0.62) translate(-366,98) scale(1,-1)"><path d="${L.hah}" fill="${glyph}"/></g></svg>`;
const wordSVG = (h, fill = L.C.paper, dot = L.C.lime) => {
  const g = L.letters.map(l => `<path class="lt" transform="translate(${l.x},0) scale(1,-1)" d="${l.d}" fill="${fill}"/>`).join('');
  const sq = ([cx, cy, s]) => `M${cx - s / 2},${cy - s / 2}h${s}v${s}h${-s}z`;
  return `<svg height="${h}" viewBox="-60 -1020 3220 1400" style="overflow:visible">${g}<path class="dotB" d="${sq(L.DOTS.beh)}" fill="${dot}"/><path class="dotN" d="${sq(L.DOTS.noon)}" fill="${fill}"/></svg>`;
};
const PRODUCT = (c1, c2) => `<svg width="70" height="96" viewBox="0 0 70 96"><rect x="27" y="2" width="16" height="12" rx="2" fill="${c2}"/><rect x="22" y="12" width="26" height="10" rx="3" fill="#222"/><rect x="6" y="24" width="58" height="70" rx="12" fill="${c1}"/><rect x="16" y="46" width="38" height="22" rx="3" fill="${c2}" opacity=".85"/></svg>`;
const storeScreen = (title = 'متجر ريم', extra = '') => `<div class="scr"><div class="nb"><span>${title}</span><span style="font:700 18px Alx;color:#8B909B">☰</span></div>
  <div class="hero"><h5>عطور تُشبهك</h5><p>تشكيلة جديدة من أفخم الروائح</p><i>تسوّق الآن</i></div>
  <div class="row"><div class="pc"><div>${PRODUCT('#2B2F35', '#C9A86A')}</div><b>عود ملكي</b><s>240 ر.س</s></div><div class="pc"><div>${PRODUCT('#8E4B5C', '#F0C9D2')}</div><b>مسك الورد</b><s>180 ر.س</s></div></div>${extra}</div>`;
const phone = (root, inner) => mk(root, `<div class="phone">${inner}</div>`);
const ICON = {
  eye: c => `<svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2.2"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>`,
  shield: c => `<svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2.2" stroke-linejoin="round"><path d="M12 2l8 4v6c0 5-3.4 8.5-8 10-4.6-1.5-8-5-8-10V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/></svg>`,
  heart: c => `<svg width="56" height="56" viewBox="0 0 24 24" fill="${c}"><path d="M12 21s-7.5-4.6-9.5-9.3C1 8 3.4 4.5 7 4.5c2 0 3.5 1.1 5 3 1.5-1.9 3-3 5-3 3.6 0 6 3.5 4.5 7.2C19.5 16.4 12 21 12 21z"/></svg>`,
  cart: c => `<svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2.2" stroke-linejoin="round"><path d="M3 4h2l2.4 11h10.4L20 8H6.2"/><circle cx="9" cy="19.5" r="1.5"/><circle cx="17" cy="19.5" r="1.5"/></svg>`,
  check: c => `<svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12.5l5 5L20 6.5"/></svg>`,
  pen: c => `<svg width="70" height="70" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" stroke-linejoin="round"><path d="M12 2l4.5 7.5L12 22 7.5 9.5z"/><circle cx="12" cy="10" r="1.6"/></svg>`,
  code: c => `<svg width="70" height="70" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16"/></svg>`,
  rebuild: c => `<svg width="70" height="70" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 11a8 8 0 0 0-14.9-3M4 4v4h4M4 13a8 8 0 0 0 14.9 3M20 20v-4h-4"/></svg>`,
  cal: c => `<svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2.2" stroke-linejoin="round"><rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M8 3v4M16 3v4M3.5 10h17M9 15l2 2 4-4" stroke-linecap="round"/></svg>`,
  chat: c => `<svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2.2" stroke-linejoin="round"><path d="M12 3a9 9 0 0 0-7.8 13.5L3 21l4.6-1.2A9 9 0 1 0 12 3z"/></svg>`,
  search: c => `<svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2.4" stroke-linecap="round"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21"/></svg>`,
};
const notif = (title, sub, amt) => `<div class="dk" style="width:600px;height:118px;display:flex;align-items:center;gap:20px;padding:0 24px;direction:rtl;border-radius:28px">
  <div style="width:70px;height:70px;border-radius:20px;background:var(--lime);display:grid;place-items:center">${ICON.cart('#0D0F10')}</div>
  <div style="flex:1"><b style="display:block;font:900 27px Alx">${title.replace(/#\d+/, m => `<bdi dir="ltr">${m}</bdi>`)}</b><span style="font:500 20px Alx;color:var(--mute)">${sub}</span></div>
  <b style="font:900 27px MR;color:var(--lime);direction:ltr">${amt}</b></div>`;

// ---------------------------------------------------------------- scenes
const scenes = [];
function scene(a, b, bg, build, update) { const root = document.createElement('div'); root.className = 'scene'; $('cam').appendChild(root); const S = { a, b, bg, root, el: build(root), update }; scenes.push(S); return S; }
const cx = W / 2, cy = H / 2;

// A — paid, and waiting (ink)
scene(0, T('yom') - .02, 'ink', r => ({
  ph: phone(r, storeScreen()),
  rec: mk(r, `<div class="stk tex" style="width:420px;padding:34px 34px 30px;direction:rtl;position:relative;border-radius:14px">
    <div style="font:900 34px Alx">فاتورة</div><div style="font:500 20px Alx;color:#6b7078;margin-top:4px">تصميم متجر إلكتروني</div>
    <div style="border-top:3px dashed #c9cbc4;margin:20px 0 14px"></div>
    <div style="display:flex;justify-content:space-between;font:700 22px Alx"><span>تصميم واجهة</span><span style="font-family:MR">6,500</span></div>
    <div style="display:flex;justify-content:space-between;font:700 22px Alx;margin-top:8px"><span>قالب + إعداد</span><span style="font-family:MR">3,000</span></div>
    <div style="display:flex;justify-content:space-between;font:900 30px Alx;margin-top:16px"><span>الإجمالي</span><span style="font-family:MR">9,500 ر.س</span></div></div>`),
  stamp: mk(r, `<div style="border:8px solid var(--lime);color:var(--lime);border-radius:16px;padding:6px 26px;font:900 64px Alx;letter-spacing:2px;background:rgba(13,15,16,.25)">مدفوع ✓</div>`),
  clock: mk(r, `<div class="stk" style="width:190px;height:190px;border-radius:50%;position:relative;border:10px solid var(--ink)"><b id="hM" style="position:absolute;left:50%;top:50%;width:8px;height:62px;margin:-62px 0 0 -4px;background:var(--ink);border-radius:4px;transform-origin:50% 100%"></b><b id="hH" style="position:absolute;left:50%;top:50%;width:10px;height:42px;margin:-42px 0 0 -5px;background:#9aa013;border-radius:5px;transform-origin:50% 100%"></b><b style="position:absolute;left:50%;top:50%;width:18px;height:18px;margin:-9px;background:var(--ink);border-radius:50%"></b></div>`),
  a1: txt(r, 'صرفت على المتجر…', pick(108, 96)),
  a2: txt(r, 'ودفعت لمصمّم…', pick(108, 96)),
  a3: txt(r, 'وجلست <span class="lime">تنتظر…</span>', pick(108, 96)),
  a4: txt(r, '', pick(150, 132)),
  a4s: txt(r, 'أول', pick(70, 62), 'var(--mute)'),
}), (t, E) => {
  const ph = pick([540, 700], [560, 560]);
  anim(E.ph, t, ph[0], ph[1], 0.05, 1e9, { from: 'down', dist: 900, r: -3, s: pick(.9, .9), seed: 3, d: .6 });
  anim(E.rec, t, ph[0] + pick(210, 260), ph[1] + pick(190, 120), T('dafa') + .05, 1e9, { from: 'right', dist: 700, r: 7, s: pick(.85, .82), seed: 5 });
  anim(E.stamp, t, ph[0] + pick(230, 290), ph[1] + pick(300, 250), T('musamim') + .35, 1e9, { from: 'slam', r: -12, s: pick(.9, .85), seed: 6, jitA: .3 });
  anim(E.clock, t, ph[0] - pick(230, 300), ph[1] - pick(300, 280), T('jalast') + .1, 1e9, { from: 'pop', r: -8, seed: 7 });
  const spin = Math.max(0, t - T('jalast')) * 1400; $('hM').style.transform = `rotate(${spin}deg)`; $('hH').style.transform = `rotate(${spin / 12}deg)`;
  const tx = pick(cx, 1400), ty = pick(1500, 540);
  words(E.a1, t, tx, ty, T('sarf') + .05, T('dafa') - .1, { seed: 1 });
  words(E.a2, t, tx, ty, T('dafa'), T('jalast') - .1, { seed: 2 });
  words(E.a3, t, tx, ty, T('jalast'), T('awwal') - .1, { seed: 3 });
  E.a4.textContent = 'طلـ' + kash(lerp(0, 9, eOut(P(t, T('talab'), T('talab') + .7)))) + 'ب';
  anim(E.a4, t, tx, ty + pick(30, 30), T('talab') - .12, 1e9, { from: 'slam', s: 1, seed: 9, jitA: .5 });
  anim(E.a4s, t, tx, ty - pick(120, 110), T('awwal') - .05, 1e9, { from: 'up', dist: 60, seed: 10 });
  return { zoom: lerp(1, 1.06, P(t, 0, 6.4)), punch: [T('musamim') + .35] };
});

// B — day after day (ink)
scene(T('yom') - .02, T('tabda') + .18, 'ink', r => ({
  cal: mk(r, `<div class="stk tex" style="width:400px;height:440px;border-radius:26px;overflow:hidden;position:relative">
     <div style="height:96px;background:var(--ink3);color:var(--paper);font:900 40px Alx;display:grid;place-items:center">يوم</div>
     <div id="dayN" style="font:800 230px MR;text-align:center;line-height:330px;color:var(--ink)">1</div></div>`),
  page: mk(r, `<div class="stk" style="width:400px;height:344px;border-radius:0 0 26px 26px;font:800 230px MR;text-align:center;line-height:330px;color:var(--ink)" id="pageN">1</div>`),
  b1: txt(r, 'يوم ورا يوم…', pick(112, 100)),
  st: mk(r, `<div class="dk" style="width:470px;padding:28px 34px;direction:rtl"><div style="font:500 26px Alx;color:var(--mute)">الزيارات</div><div style="display:flex;align-items:center;gap:14px"><b id="vis" style="font:800 84px MR;color:var(--lime)">0</b><span style="font:900 44px MR;color:var(--lime)">↑</span></div></div>`),
  cart: mk(r, `<div class="stk tex" style="width:470px;padding:28px 34px;direction:rtl;display:flex;align-items:center;gap:22px;position:relative"><div style="width:96px;height:96px;border-radius:24px;background:var(--ink);display:grid;place-items:center">${ICON.cart('#D0F05C')}</div><div><div style="font:500 26px Alx;color:#6b7078">السلة</div><b style="font:800 84px MR;line-height:1">0</b></div></div>`),
  b2: txt(r, '', pick(112, 100)),
}), (t, E) => {
  const c = pick([540, 640], [560, 540]);
  anim(E.cal, t, c[0], c[1], T('yom') - .05, 1e9, { from: 'pop', r: 4, seed: 21 });
  const days = 1 + Math.floor(13 * eIO(P(t, T('yom') + .25, T('salla'))));
  $('dayN').textContent = days + 1 > 14 ? 14 : days;
  // a page tearing off at each flip
  const flipT = (t - (T('yom') + .25)) / ((T('salla') - T('yom') - .25) / 13);
  const fk = flipT - Math.floor(flipT);
  const tearing = t > T('yom') + .25 && t < T('salla');
  $('pageN').textContent = Math.max(1, days - 1);
  put(E.page, c[0] + fk * 260, c[1] + 48 + fk * fk * 700, { r: fk * 40, o: tearing && days > 1 ? 1 - fk : 0 });
  words(E.b1, t, pick(cx, 1400), pick(250, 300), T('yom'), T('salla') - .15, { seed: 11 });
  anim(E.st, t, pick(cx, 1400), pick(1200, 560), T('ziyarat') - .05, 1e9, { from: 'right', r: -3, seed: 22 });
  $('vis').textContent = fmt(3120 * eOut(P(t, T('ziyarat'), T('fadya') + .6)));
  anim(E.cart, t, pick(cx, 1400), pick(1420, 800), T('salla') - .05, 1e9, { from: 'slam', r: 3, seed: 23 });
  E.b2.textContent = 'والسلة فاضـ' + kash(lerp(0, 7, eOut(P(t, T('fadya'), T('fadya') + .8)))) + 'ية';
  anim(E.b2, t, pick(cx, 1400), pick(1640, 300), T('salla') - .05, 1e9, { from: 'up', dist: 50, seed: 24 });
  E.b2.style.color = 'var(--paper)';
  return { zoom: lerp(1.02, 1.08, P(t, 6.4, 10)), punch: [T('salla')] };
});

// C — self-doubt (lime)
scene(T('tabda') + .18, T('la1') - .07, 'lime', r => ({
  q: mk(r, `<div style="font:900 ${pick(1300, 1100)}px Alx;color:transparent;-webkit-text-stroke:6px rgba(13,15,16,.12);line-height:1">؟</div>`),
  c0: txt(r, 'وتبدأ تسأل نفسك:', pick(70, 62), 'var(--ink)', 'font-weight:700'),
  n1: mk(r, `<div class="dk tex" style="background:var(--ink);padding:30px 52px;font:900 ${pick(96, 84)}px Alx;direction:rtl;position:relative"><i class="tape"></i>العيب فيني؟</div>`),
  n2: mk(r, `<div class="dk tex" style="background:var(--ink);padding:30px 52px;font:900 ${pick(96, 84)}px Alx;direction:rtl;position:relative"><i class="tape"></i>في منتجي؟</div>`),
  n3: mk(r, `<div class="dk tex" style="background:var(--ink);padding:30px 52px;font:900 ${pick(96, 84)}px Alx;direction:rtl;position:relative"><i class="tape"></i>ولا في السوق؟</div>`),
}), (t, E) => {
  put(E.q, cx, cy + pick(40, 20), { r: (t - 10) * 4 - 6, o: .9 * P(t, 9.9, 10.4), s: 1 + (t - 10) * .015 });
  words(E.c0, t, cx, pick(330, 150), T('tabda') + .25, 1e9, { seed: 30 });
  const pos = V ? [[540, 720, -5], [570, 1040, 4], [520, 1360, -3]] : [[1400, 400, -5], [700, 590, 4], [1250, 820, -3]];
  [[E.n1, 'aib1'], [E.n2, 'muntaji'], [E.n3, 'wala']].forEach(([e, k], i) => anim(e, t, pos[i][0], pos[i][1], T(k) - .02, 1e9, { from: 'slam', r: pos[i][2], seed: 31 + i, jitA: 1.4 }));
  return { zoom: lerp(1, 1.08, P(t, 10, 14.2)), shake: P(t, 11, 14.1) * 7, punch: [T('aib1'), T('muntaji'), T('wala')] };
});

// D — "it's not you" (ink)
scene(T('la1') - .07, T('matjarak') - .02, 'ink', r => ({
  d1: txt(r, 'لا…', pick(300, 260)),
  d2: txt(r, 'العيب <span class="mark" data-unit><b></b><span class="ink">مو فيك.</span></span>', pick(130, 120)),
}), (t, E) => {
  const up = eIO(P(t, T('aib2') - .1, T('aib2') + .25));
  anim(E.d1, t, cx, cy - up * pick(220, 170), T('la1') - .05, 1e9, { from: 'slam', seed: 40, s: lerp(1, .7, up) });
  words(E.d2, t, cx, cy + pick(120, 130), T('aib2'), 1e9, { seed: 41, st: .12 });
  const m = E.d2.querySelector('.mark>b'), mi = E.d2.querySelector('.mark>.ink');
  const mk_ = eOut5(P(t, T('mo1') - .05, T('mo1') + .3));
  m.style.transform = `scaleX(${mk_})`; mi.style.color = mk_ > .5 ? 'var(--ink)' : 'var(--paper)';
  return { zoom: lerp(1.05, 1, eOut(P(t, 14.2, 15))), punch: [T('la1')] };
});

// E — designed to please you, not to convince your customer (ink)
scene(T('matjarak') - .02, T('matjar1') - .04, 'ink', r => ({
  ph: phone(r, storeScreen()),
  heart: mk(r, `<div style="width:150px;height:150px;border-radius:50%;background:var(--lime);display:grid;place-items:center;box-shadow:0 18px 40px rgba(0,0,0,.45)">${ICON.heart('#0D0F10').replace('width="56" height="56"', 'width="84" height="84"')}</div>`),
  you: mk(r, `<div class="stk" style="padding:12px 26px;font:900 40px Alx;border-radius:16px">إنت 😍</div>`),
  cust: mk(r, `<div class="stk tex" style="width:430px;padding:30px;direction:rtl;position:relative;border-radius:26px">
     <div style="display:flex;align-items:center;gap:18px"><div style="width:96px;height:96px;border-radius:50%;background:var(--ink);position:relative;overflow:hidden"><b style="position:absolute;left:50%;top:22px;width:38px;height:38px;margin-left:-19px;border-radius:50%;background:#8B909B"></b><b style="position:absolute;left:50%;bottom:-26px;width:76px;height:56px;margin-left:-38px;border-radius:50%;background:#8B909B"></b></div>
     <div><div style="font:900 34px Alx">عميلك</div><div style="font:500 22px Alx;color:#6b7078">يتصفّح… ويطلع</div></div></div>
     <div style="margin-top:20px;display:flex;justify-content:space-between;align-items:center;background:#e6e7e1;border-radius:16px;padding:14px 20px;font:700 26px Alx"><span>مقتنع؟</span><span style="font:900 34px MR;color:#d64533">✕</span></div></div>`),
  e1: txt(r, 'متجرك انصمم عشان <span class="lime">يعجبك…</span>', pick(84, 80)),
  e2: txt(r, 'مو عشان <span class="mark" data-unit><b></b><span class="ink">يقنع عميلك.</span></span>', pick(84, 80)),
}), (t, E) => {
  const ph = pick([400, 760], [520, 560]);
  const shift = eIO(P(t, T('mo2') - .1, T('mo2') + .3));
  anim(E.ph, t, ph[0], ph[1], T('matjarak'), 1e9, { from: 'left', dist: 600, r: -4, s: pick(.78, .82), seed: 51 });
  anim(E.heart, t, ph[0] + pick(150, 150), ph[1] - pick(250, 250), T('yijbak') - .05, 1e9, { from: 'pop', r: 10, seed: 52 });
  E.heart.style.filter = `grayscale(${shift})`; E.heart.style.opacity = lerp(1, .45, shift) * (+E.heart.style.opacity || 0);
  anim(E.you, t, ph[0] - pick(110, 120), ph[1] - pick(330, 340), T('yijbak') + .1, 1e9, { from: 'pop', r: -6, seed: 53 });
  anim(E.cust, t, pick(760, 1420), pick(1040, 560), T('mo2') + .05, 1e9, { from: 'right', r: 5, seed: 54, dist: 500 });
  words(E.e1, t, pick(cx, 1300), pick(230, 190), T('matjarak'), 1e9, { seed: 55 });
  words(E.e2, t, pick(cx, 1300), pick(1600, 900), T('mo2'), 1e9, { seed: 56 });
  const m = E.e2.querySelector('.mark>b'), k = eOut5(P(t, T('yiqni'), T('yiqni') + .35));
  m.style.transform = `scaleX(${k})`; E.e2.querySelector('.mark>.ink').style.color = k > .5 ? 'var(--ink)' : 'var(--paper)';
  return { zoom: lerp(1, 1.06, P(t, 15.9, 20)), punch: [T('yijbak')] };
});

// F1 — a pretty store doesn't sell by itself (ink)
scene(T('matjar1') - .04, T('matjar2') - .35, 'ink', r => ({
  ph: phone(r, storeScreen()),
  sp: [0, 1, 2, 3].map(i => mk(r, `<div style="font:900 ${70 + i * 10}px Alx;color:var(--lime)">✦</div>`)),
  f1: txt(r, 'المتجر <span class="lime">الحلو…</span>', pick(120, 110)),
  stamp: mk(r, `<div style="border:10px solid var(--paper);color:var(--paper);border-radius:20px;padding:6px 34px;font:900 ${pick(84, 76)}px Alx;direction:rtl;background:rgba(13,15,16,.55);box-shadow:0 0 0 6px rgba(13,15,16,.4)">ما يبيع لحاله ✕</div>`),
}), (t, E) => {
  const ph = pick([540, 820], [600, 560]);
  anim(E.ph, t, ph[0], ph[1], T('matjar1'), 1e9, { from: 'up', dist: 900, r: 3, s: pick(.82, .82), seed: 61 });
  const sp = [[-230, -280], [220, -200], [-250, 140], [240, 260]];
  E.sp.forEach((e, i) => anim(e, t, ph[0] + sp[i][0], ph[1] + sp[i][1], T('matjar1') + .45 + i * .07, 1e9, { from: 'pop', r: (t * 90 + i * 40) % 360, seed: 62 + i }));
  words(E.f1, t, pick(cx, 1380), pick(250, 380), T('matjar1'), 1e9, { seed: 66 });
  anim(E.stamp, t, pick(cx, 1380), pick(1560, 660), T('mayibi') + .1, 1e9, { from: 'slam', r: -9, seed: 67, jitA: .4 });
  return { zoom: lerp(1, 1.05, P(t, 20, 22.4)), shake: Math.max(0, 1 - (t - T('mayibi') - .15) / .25) * 14 * (t > T('mayibi') + .15 ? 1 : 0), punch: [T('mayibi') + .15] };
});

// F2 — the store that sells has a plot (lime)
scene(T('matjar2') - .35, T('habkan') - .02, 'lime', r => ({
  th: mk(r, `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${[0, 1, 2, 3, 4].map(i => `<path id="thr${i}" fill="none" stroke="#0D0F10" stroke-width="${i % 2 ? 6 : 10}" stroke-linecap="round" pathLength="1" stroke-dasharray="1 1" opacity="${i % 2 ? .35 : .9}"/>`).join('')}</svg>`),
  f2: txt(r, 'المتجر اللي يبيع…', pick(96, 88), 'var(--ink)'),
  f3: txt(r, '', pick(250, 220), 'var(--ink)'),
  f3s: txt(r, 'وراه', pick(90, 80), 'var(--ink)', 'font-weight:700'),
}), (t, E) => {
  put(E.th, cx, cy);
  for (let i = 0; i < 5; i++) {
    let d = ''; const yc = cy + pick(60, 40) + (i - 2) * pick(36, 30);
    for (let x = -40; x <= W + 40; x += 20) { const y = yc + Math.sin(x / pick(140, 180) + i * 1.3 + t * 1.2) * pick(70, 60) * Math.cos((x / W - .5) * 2); d += (d ? 'L' : 'M') + x + ',' + y.toFixed(1); }
    const p = $('thr' + i); p.setAttribute('d', d); p.style.strokeDashoffset = 1 - eIO(P(t, T('matjar2') + .1 + i * .08, T('habka') + .3 + i * .05));
  }
  words(E.f2, t, cx, pick(520, 230), T('matjar2'), 1e9, { seed: 70 });
  anim(E.f3s, t, cx, cy - pick(170, 150), T('wrah'), 1e9, { from: 'up', dist: 60, seed: 71 });
  E.f3.textContent = 'حبـ' + kash(lerp(0, 12, eOut(P(t, T('habka') - .05, T('habka') + .5)))) + 'كة';
  anim(E.f3, t, cx, cy + pick(40, 40), T('habka') - .15, 1e9, { from: 'slam', seed: 72, jitA: .5 });
  return { zoom: lerp(1, 1.07, P(t, 22.3, 24.8)), punch: [T('habka') - .1] };
});

// G — Habkan: we start with your customer (ink)
scene(T('habkan') - .02, T('nigra') + .02, 'ink', r => ({
  tile: mk(r, tileSVG(pick(250, 230))),
  wm: mk(r, wordSVG(pick(190, 170))),
  sw: ['#D0F05C', '#F2F3EE', '#8B909B', '#2A2D31', '#5BD27A', '#FF6B57'].map(c => mk(r, `<div class="tex" style="width:150px;height:190px;border-radius:20px;background:${c};position:relative;box-shadow:0 18px 40px rgba(0,0,0,.45);border:6px solid #F2F3EE"></div>`)),
  g1: txt(r, 'ما نبدأ بالألوان…', pick(100, 92)),
  g2: txt(r, 'نبدأ <span class="lime">بعميلك:</span>', pick(110, 100)),
  card: mk(r, `<div class="stk tex" style="width:${pick(900, 940)}px;padding:40px 44px;direction:rtl;position:relative;border-radius:34px">
    <div style="display:flex;align-items:center;gap:22px;margin-bottom:18px"><div style="width:110px;height:110px;border-radius:30px;background:var(--ink);display:grid;place-items:center;position:relative;overflow:hidden"><b style="position:absolute;left:50%;top:22px;width:42px;height:42px;margin-left:-21px;border-radius:50%;background:#D0F05C"></b><b style="position:absolute;left:50%;bottom:-30px;width:84px;height:62px;margin-left:-42px;border-radius:50%;background:#D0F05C"></b></div>
    <div><div style="font:900 46px Alx">ملف عميلك</div><div style="font:500 24px Alx;color:#6b7078">قبل أي تصميم</div></div></div>
    ${[['مين هو؟', 'سيدة، 28–40، الرياض'], ['وش يقلقه؟', 'الجودة ووقت التوصيل'], ['ليش بيشتري؟', 'هدية تفرق في المناسبات']].map(([q, a], i) => `
    <div class="row${i}" style="display:flex;align-items:center;justify-content:space-between;gap:20px;border-top:2px solid #dcddd6;padding:22px 0">
      <div style="display:flex;align-items:center;gap:16px"><span class="ck${i}" style="width:54px;height:54px;border-radius:16px;background:var(--ink);display:grid;place-items:center">${ICON.check('#D0F05C').replace('width="56" height="56"', 'width="34" height="34"')}</span><b style="font:900 40px Alx">${q}</b></div>
      <span class="an${i}" style="background:var(--lime);padding:10px 20px;border-radius:14px;font:700 28px Alx">${a}</span></div>`).join('')}</div>`),
}), (t, E) => {
  // logo slam, then it parks at the top as a header
  const a = T('habkan') - .02, park = eIO(P(t, a + .62, a + 1.0));
  const lx = pick(cx, cx), ly = lerp(cy - pick(40, 30), pick(150, 110), park), ls = lerp(1, pick(.42, .4), park);
  const tw = pick(250, 230) + 40 + pick(190, 170) * 3220 / 1400;
  const kT = eOut5(P(t, a - .02, a + .35));
  put(E.tile, lx + (tw / 2 - pick(125, 115)) * ls, ly, { s: ls * lerp(2.4, 1, kT), r: lerp(-30, 0, kT), o: Math.min(1, kT * 4) });
  E.wm.style.width = 'auto';
  put(E.wm, lx - (tw / 2 - (pick(190, 170) * 3220 / 1400) / 2) * ls, ly + 10 * ls, { s: ls, o: t > a ? 1 : 0 });
  E.wm.querySelectorAll('.lt').forEach((p, i) => { const k = eOut5(P(t, a + .12 + (4 - i) * .05, a + .5 + (4 - i) * .05)); p.style.opacity = k; p.style.transform = p.getAttribute('transform') + ` translate(0,${(1 - k) * -300})`; });
  ['.dotB', '.dotN'].forEach((s, i) => { const k = eBack(P(t, a + .45 + i * .06, a + .75 + i * .06)); E.wm.querySelector(s).style.opacity = clamp(k * 3); E.wm.querySelector(s).style.transform = `translate(0,${(1 - k) * -400}px)`; });
  // colour swatches fan out and get swept away
  E.sw.forEach((e, i) => { const n = E.sw.length, k = eBack(P(t, T('manibda') + .35 + i * .05, T('manibda') + .8 + i * .05)), sweep = eIn(P(t, T('nibda2') + .2 + i * .03, T('nibda2') + .6 + i * .03));
    const x = cx + (i - (n - 1) / 2) * pick(150, 190) + sweep * -1400, y = cy + pick(60, 90) + Math.sin(i * 1.9) * 40;
    put(e, x, y, { s: lerp(.4, 1, k) * pick(.85, 1), r: (rnd(i) - .5) * 30 + sweep * -60, o: clamp(k * 3) * (1 - sweep), blur: sweep * 10 }); });
  words(E.g1, t, cx, pick(470, 330), T('manibda') + .45, T('nibda2') - .05, { seed: 80 });
  words(E.g2, t, cx, pick(470, 300), T('nibda2'), 1e9, { seed: 81 });
  anim(E.card, t, cx, pick(1180, 690), T('nibda2') + .45, 1e9, { from: 'up', dist: 900, r: -1.5, s: pick(1, .82), seed: 82, jitA: .6 });
  [['min', 0], ['wish', 1], ['walish', 2]].forEach(([k, i]) => {
    const kk = eBack(P(t, T(k) - .05, T(k) + .3)); const row = E.card.querySelector('.row' + i);
    row.style.opacity = .25 + .75 * clamp(kk * 2);
    E.card.querySelector('.ck' + i).style.transform = `scale(${kk})`;
    const an = E.card.querySelector('.an' + i); an.style.transform = `scale(${kk})`; an.style.transformOrigin = '0 50%';
  });
  return { zoom: lerp(1, 1.05, P(t, 24.8, 31)), punch: [a, T('min'), T('wish'), T('walish')] };
});

// H — market, competitors, every page built on the buying decision (ink)
scene(T('nigra') + .02, T('tasmim') - .22, 'ink', r => ({
  h1: txt(r, 'نقرأ <span class="lime">السوق</span>', pick(130, 116)),
  h2: txt(r, 'نفكّك <span class="lime">منافسينك</span>', pick(116, 104)),
  h3: txt(r, 'نبني كل صفحة', pick(104, 92)),
  h3b: txt(r, 'على <span class="mark" data-unit><b></b><span class="ink">قرار الشراء</span></span>', pick(104, 92)),
  h4: txt(r, 'من أول نظرة…', pick(104, 96)),
  h4b: txt(r, 'لين <span class="lime">إتمام الطلب</span>', pick(116, 104)),
  chart: mk(r, `<div class="stk tex" style="width:640px;height:420px;padding:34px;position:relative;border-radius:30px"><svg width="572" height="352" viewBox="0 0 572 352">${[60, 110, 90, 170, 150, 230, 300].map((h, i) => `<rect class="cb" data-h="${h}" x="${18 + i * 80}" y="330" width="54" height="0" rx="10" fill="${i === 6 ? '#0D0F10' : '#c9cbc4'}"/>`).join('')}<path id="trend" d="M30,290 L130,250 L210,262 L290,180 L370,196 L450,118 L540,40" fill="none" stroke="#9DBB34" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" pathLength="1" stroke-dasharray="1 1"/></svg></div>`),
  lens: mk(r, `<div style="width:220px;height:220px;border-radius:50%;background:rgba(208,240,92,.15);border:14px solid var(--lime);box-shadow:0 18px 40px rgba(0,0,0,.4)"></div>`),
  comps: [0, 1, 2].map(i => [0, 1].map(h => mk(r, `<div style="width:260px;height:${h ? 230 : 230}px;overflow:hidden;border-radius:${h ? '0 0 24px 24px' : '24px 24px 0 0'};background:#E9E6DF;box-shadow:0 16px 36px rgba(0,0,0,.45)">
     <div style="margin-top:${h ? -230 : 0}px;height:460px;padding:16px;direction:rtl;color:#16181B"><div style="font:900 22px Alx">منافس ${i + 1}</div><div style="height:150px;border-radius:16px;background:${['#3a3f46', '#6b5a4a', '#43505c'][i]};margin-top:12px"></div><div style="display:flex;gap:10px;margin-top:12px"><div style="flex:1;height:120px;border-radius:12px;background:#fff"></div><div style="flex:1;height:120px;border-radius:12px;background:#fff"></div></div><div style="height:60px;border-radius:12px;background:#d8d4cc;margin-top:12px"></div></div></div>`))),
  tags: ['عرض ضعيف', 'شحن غالي', 'ما فيه ثقة'].map(s => mk(r, `<div style="background:var(--lime);color:var(--ink);padding:10px 22px;border-radius:14px;font:900 30px Alx;box-shadow:0 12px 30px rgba(0,0,0,.4)">${s}</div>`)),
  ph: phone(r, `<div class="scr" style="background:#F6F4EF"><div class="nb"><span>متجرك</span><span style="font:700 18px Alx;color:#8B909B">☰</span></div><div id="blocks"></div></div>`),
  steps: ['أول نظرة', 'ثقة', 'رغبة', 'إتمام الطلب'].map((s, i) => mk(r, `<div style="display:flex;flex-direction:column;align-items:center;gap:16px;width:240px"><div class="sd" style="width:120px;height:120px;border-radius:34px;background:var(--ink2);border:3px solid var(--line);display:grid;place-items:center">${[ICON.eye, ICON.shield, ICON.heart, ICON.check][i]('#8B909B')}</div><b style="font:900 34px Alx;white-space:nowrap">${s}</b></div>`)),
  bar: mk(r, `<div style="width:${pick(8, 1200)}px;height:${pick(1000, 8)}px;background:var(--line);border-radius:4px;position:relative"><b id="barF" style="position:absolute;${V ? 'left:0;right:0;top:0' : 'top:0;bottom:0;right:0'};background:var(--lime);border-radius:4px"></b></div>`),
  btn: mk(r, `<div style="height:120px;padding:0 56px;border-radius:60px;background:var(--lime);color:var(--ink);font:900 50px Alx;display:flex;align-items:center;gap:18px;direction:rtl;box-shadow:0 20px 50px rgba(208,240,92,.25)">إتمام الطلب ${ICON.check('#0D0F10')}</div>`),
}), (t, E) => {
  const s1 = T('nigra'), s2 = T('nifakkik'), s3 = T('nibni'), s4 = T('minawwal');
  const head = [pick(cx, 1400), pick(330, 230)];
  // H1 market
  words(E.h1, t, head[0], head[1], s1 - .05, s2 - .32, { seed: 90 });
  anim(E.chart, t, pick(cx, 640), pick(1020, 600), s1, s2 - .1, { from: 'up', r: -2, seed: 91, dist: 500, s: pick(1, .95) });
  E.chart.querySelectorAll('.cb').forEach((b, i) => { const k = eOut(P(t, s1 + .1 + i * .05, s1 + .45 + i * .05)); const h = +b.dataset.h * k; b.setAttribute('height', h); b.setAttribute('y', 330 - h); });
  $('trend').style.strokeDashoffset = 1 - eIO(P(t, s1 + .3, s1 + .9));
  const lk = eOut(P(t, s1 + .2, s2 - .2));
  anim(E.lens, t, pick(cx, 640) + lerp(-200, 210, lk), pick(1020, 600) + lerp(80, -120, lk), s1 + .15, s2 - .1, { from: 'pop', seed: 92 });
  // H2 competitors split apart
  words(E.h2, t, head[0], head[1], s2 - .05, s3 - .3, { seed: 93 });
  const cxs = V ? [[810, 1060], [540, 1060], [270, 1060]] : [[1500, 640], [1180, 640], [860, 640]];
  E.comps.forEach((pair, i) => pair.forEach((e, h) => {
    const sp = eOut5(P(t, s2 + .35 + i * .12, s2 + .7 + i * .12));
    anim(e, t, cxs[i][0] + (h ? 1 : -1) * sp * 10, cxs[i][1] + (h ? 115 : -115) + (h ? 1 : -1) * sp * 60, s2 + i * .08, s3 - .1, { from: 'up', dist: 500, r: (h ? 1 : -1) * sp * 6 + (i - 1) * 3, seed: 100 + i * 2 + h, s: pick(.92, .95) });
  }));
  E.tags.forEach((e, i) => anim(e, t, cxs[i][0], cxs[i][1] + pick(10, 10), s2 + .55 + i * .14, s3 - .1, { from: 'slam', r: [-8, 6, -4][i], seed: 110 + i }));
  // H3 phone blocks stack
  words(E.h3, t, head[0], head[1], s3 - .05, s4 - .32, { seed: 120 });
  words(E.h3b, t, head[0], head[1] + pick(130, 120), T('qarar'), s4 - .32, { seed: 121 });
  const mb = E.h3b.querySelector('.mark>b'), kq = eOut5(P(t, T('qarar') + .4, T('qarar') + .75)); mb.style.transform = `scaleX(${kq})`; E.h3b.querySelector('.mark>.ink').style.color = kq > .5 ? 'var(--ink)' : 'var(--paper)';
  anim(E.ph, t, pick(cx, 640), pick(1180, 600), s3, s4 - .1, { from: 'up', dist: 1000, seed: 122, s: pick(1.05, .78) });
  const BL = [['hero', `<div class="hero" style="height:200px"><h5>عطور تُشبهك</h5><p>اختيار 12,000 عميل</p><i style="background:var(--lime)">اطلب الحين</i></div>`],
    ['rev', `<div class="blk" style="background:#fff;border:1px solid #e8e4dc"><span style="color:#b38b00">★★★★★</span><span>2,340 تقييم</span></div>`],
    ['off', `<div class="blk" style="background:#0D0F10;color:#D0F05C"><span>الثانية بنصف السعر</span><span>٪</span></div>`],
    ['gu', `<div class="blk" style="background:#fff;border:1px solid #e8e4dc"><span>ضمان استرجاع 14 يوم</span><span>✓</span></div>`],
    ['cta', `<div class="blk" style="background:#D0F05C;justify-content:center;font-size:22px;height:64px">أضف للسلة</div>`]];
  const bl = $('blocks'); if (!bl.children.length) bl.innerHTML = BL.map(b => `<div class="bb">${b[1]}</div>`).join('');
  [...bl.children].forEach((c, i) => { const k = eBack(P(t, s3 + .3 + i * .32, s3 + .6 + i * .32)); c.style.opacity = clamp(k * 3); c.style.transform = `translateY(${(1 - eOut5(clamp(k))) * -120}px) scale(${lerp(1.2, 1, clamp(k))})`; });
  // H4 journey
  words(E.h4, t, head[0], head[1], s4 - .05, T('tasmim') - .3, { seed: 130 });
  words(E.h4b, t, head[0], head[1] + pick(140, 130), T('lin'), T('tasmim') - .3, { seed: 131 });
  const prog = eIO(P(t, s4 + .1, T('talab2') + .05));
  const along = (k) => V ? [cx, lerp(620, 1440, k)] : [lerp(1500, 420, k), 620];
  anim(E.bar, t, ...along(.5), s4, T('tasmim') - .3, { from: 'pop', seed: 132, jitA: 0 });
  $('barF').style[V ? 'height' : 'width'] = (prog * 100) + '%';
  E.steps.forEach((e, i) => { const k = i / 3; const pp = along(k);
    anim(e, t, pp[0] + pick(-190, 0), pp[1] + pick(0, 30), s4 + i * .1, T('tasmim') - .3, { from: 'pop', seed: 140 + i, jitA: .4 });
    const on = prog >= k - .001; const sd = e.querySelector('.sd'); sd.style.background = on ? 'var(--lime)' : 'var(--ink2)'; sd.style.borderColor = on ? 'var(--lime)' : 'var(--line)';
    sd.querySelectorAll('[stroke]').forEach(n => n.setAttribute('stroke', on ? '#0D0F10' : '#8B909B')); sd.querySelectorAll('svg[fill]:not([fill="none"])').forEach(n => n.setAttribute('fill', on ? '#0D0F10' : '#8B909B')); });
  const press = 1 - .08 * Math.max(0, 1 - Math.abs(t - T('talab2') - .2) / .12);
  anim(E.btn, t, pick(cx, 960), pick(1660, 880), T('talab2') - .05, T('tasmim') - .3, { from: 'slam', seed: 150, s: press });
  return { zoom: lerp(1, 1.04, P(t, s1, s2)) * 0 + 1 + .03 * ((t - s1) % 1.3) / 1.3, punch: [s1, s2, s3, s4, T('talab2') + .2] };
});

// I — services and platforms (lime)
scene(T('tasmim') - .22, T('la2') + .25, 'lime', r => ({
  w: [['تصميم', ICON.pen], ['تطوير', ICON.code], ['إعادة بناء', ICON.rebuild]].map(([s, ic]) => mk(r, `<div style="display:flex;align-items:center;gap:30px;direction:rtl"><div style="width:150px;height:150px;border-radius:40px;background:var(--ink);display:grid;place-items:center;box-shadow:0 16px 36px rgba(0,0,0,.25)">${ic('#D0F05C')}</div><b style="font:900 ${pick(130, 118)}px Alx;color:var(--ink);white-space:nowrap">${s}</b></div>`)),
  m: txt(r, 'متاجر', pick(64, 58), 'var(--ink)', 'font-weight:700'),
  p: [['سلّة', 'Alx'], ['زد', 'Alx'], ['Shopify', 'MR']].map(([s, f]) => mk(r, `<div style="height:${pick(124, 120)}px;padding:0 50px;border-radius:62px;background:var(--ink);color:var(--lime);font:900 ${pick(60, 58)}px ${f};display:grid;place-items:center;box-shadow:0 16px 36px rgba(0,0,0,.3);white-space:nowrap">${s}</div>`)),
}), (t, E) => {
  const ks = ['tasmim', 'tatwir', 'iada'];
  E.w.forEach((e, i) => anim(e, t, pick(cx, 1300), pick(580 + i * 240, 290 + i * 230), T(ks[i]) - .06, 1e9, { from: 'slam', r: [-2, 1.5, -1][i], seed: 160 + i }));
  anim(E.m, t, pick(cx, 520), pick(1330, 230), T('matajir') - .05, 1e9, { from: 'up', dist: 60, seed: 170 });
  const pk = ['salla2', 'zid', 'shopify'];
  const pp = V ? [[790, 1500], [540, 1500], [265, 1500]] : [[520, 400], [520, 600], [520, 800]];
  E.p.forEach((e, i) => anim(e, t, pp[i][0] + (V && i === 2 ? 0 : 0), pp[i][1], T(pk[i]) + .3, 1e9, { from: 'pop', r: [4, -3, 2][i], seed: 171 + i }));
  return { zoom: lerp(1, 1.06, P(t, 38.4, 43.8)), punch: ks.map(T).concat(pk.map(k => T(k) + .3)) };
});

// J — don't lose more; Habkan knits you a store that sells (ink) + end card
scene(T('la2') + .25, DUR, 'ink', r => ({
  loss: mk(r, `<div class="stk tex" style="width:600px;padding:30px 34px;direction:rtl;position:relative"><div style="display:flex;justify-content:space-between;font:700 28px Alx;color:#55595f"><span>صرف الإعلانات</span><span style="color:var(--warn);font-family:MR;font-weight:800">−38%</span></div><svg width="490" height="170" viewBox="0 0 490 170" style="margin-top:12px"><path id="lossP" d="M10,30 L90,50 L160,40 L240,90 L310,80 L390,130 L480,150" fill="none" stroke="#FF6B57" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" pathLength="1" stroke-dasharray="1 1"/></svg></div>`),
  j1: txt(r, 'لا تخسر أكثر…', pick(130, 116)),
  tile: mk(r, tileSVG(pick(230, 210))),
  wm: mk(r, wordSVG(pick(175, 160))),
  j2: txt(r, 'خلّ حبكان تَحبِك لك متجر…', pick(76, 70)),
  j3: txt(r, '', pick(240, 210), 'var(--lime)'),
  n: [['طلب جديد #2041', 'عود ملكي × 2', '+480'], ['طلب جديد #2042', 'مسك الورد', '+180'], ['طلب جديد #2043', 'مجموعة هدايا', '+690']].map(a => mk(r, notif(...a))),
  tag: txt(r, 'متجر محبوك… <span class="lime">يبيع.</span>', pick(72, 64)),
  c1: mk(r, `<div class="cta" style="width:${pick(940, 820)}px;height:170px;background:var(--lime);color:var(--ink);box-shadow:0 0 60px rgba(208,240,92,.25)"><div class="ic" style="background:rgba(13,15,16,.12)">${ICON.cal('#0D0F10')}</div><div class="tx"><b>احجز <i style="font-style:normal;font-family:MR">Audit</i> مجاني لمتجرك</b><span style="color:#3d4a14">Book a free store audit</span></div><b style="font:800 54px MR">←</b></div>`),
  c2: mk(r, `<div class="cta" style="width:${pick(940, 820)}px;height:150px;background:var(--ink);border:2px solid var(--line);color:var(--paper)"><div class="ic" style="background:#17241B">${ICON.chat('#5BD27A')}</div><div class="tx"><b style="font-size:36px">راسلنا على <i style="font-style:normal;font-family:MR">WhatsApp</i></b><span style="color:var(--mute)">Quick chat — DM "STORE"</span></div><b style="font:800 50px MR;color:var(--mute)">←</b></div>`),
  handle: txt(r, '<bdi dir="ltr" style="font-family:MR;font-weight:800;letter-spacing:4px">@habkan</bdi>', pick(40, 36), 'var(--mute)'),
}), (t, E) => {
  const a = T('la2') + .25;
  words(E.j1, t, cx, pick(800, 330), T('la2') + .3, T('khal') + .25, { seed: 180 });
  anim(E.loss, t, cx, pick(1150, 680), T('la2') + .45, T('khal') + .25, { from: 'up', r: -2, seed: 181, dist: 400 });
  $('lossP').style.strokeDashoffset = 1 - eIO(P(t, T('la2') + .6, T('la2') + 1.4));
  // logo + promise
  const L0 = T('habkan2'), end = 49.3, settle = eIO(P(t, end, end + .7));
  const tileS = pick(230, 210), wmH = pick(175, 160), wmW = wmH * 3220 / 1400, gap = 40, tw = tileS + gap + wmW;
  const ly = lerp(pick(560, 300), pick(520, 250), settle), ls = lerp(1, pick(.92, .8), settle);
  const kT = eOut5(P(t, L0 - .05, L0 + .3));
  put(E.tile, cx + (tw / 2 - tileS / 2) * ls, ly, { s: ls * lerp(2.6, 1, kT), r: lerp(25, 0, kT), o: Math.min(1, kT * 4) * P(t, L0 - .06, L0) });
  // in RTL the wordmark sits to the right of the tile
  put(E.wm, cx - (tw / 2 - wmW / 2) * ls, ly + 8 * ls, { s: ls, o: t > L0 ? 1 : 0 });
  E.tile.style.transform = E.tile.style.transform; // keep
  E.wm.querySelectorAll('.lt').forEach((p, i) => { const k = eOut5(P(t, T('tihbik') - .2 + (4 - i) * .06, T('tihbik') + .25 + (4 - i) * .06)); p.style.opacity = k; p.style.transform = p.getAttribute('transform') + ` translate(0,${(1 - k) * -300})`; });
  ['.dotB', '.dotN'].forEach((s, i) => { const k = eBack(P(t, T('tihbik') + .35 + i * .06, T('tihbik') + .65 + i * .06)); E.wm.querySelector(s).style.opacity = clamp(k * 3); E.wm.querySelector(s).style.transform = `translate(0,${(1 - k) * -400}px)`; });
  words(E.j2, t, cx, pick(820, 520), T('tihbik') - .1, end - .2, { seed: 182 });
  E.j3.textContent = 'يبيـ' + kash(lerp(0, 9, eOut(P(t, T('yibi') + .2, T('yibi') + 1.2)))) + 'ع';
  anim(E.j3, t, cx, pick(1100, 720), T('yibi') - .05, end - .2, { from: 'slam', seed: 183, jitA: .4 });
  const np = V ? [[cx, 1420, -3], [cx + 40, 1560, 2], [cx - 30, 1700, -1]] : [[1520, 960, -3], [960, 960, 2], [400, 960, -1]];
  E.n.forEach((e, i) => anim(e, t, np[i][0], np[i][1], T('yibi') + .1 + i * .28, end - .2, { from: 'up', dist: 300, r: np[i][2], seed: 190 + i, s: pick(1, .76) }));
  // end card
  words(E.tag, t, cx, pick(820, 470), end + .35, 1e9, { seed: 195 });
  anim(E.c1, t, cx, pick(1120, 690), end + .7, 1e9, { from: 'up', dist: 200, seed: 196, jitA: 0 });
  anim(E.c2, t, cx, pick(1310, 870), end + .9, 1e9, { from: 'up', dist: 200, seed: 197, jitA: 0 });
  anim(E.handle, t, cx, pick(1500, 1010), end + 1.2, 1e9, { from: 'up', dist: 40, seed: 198, jitA: 0 });
  return { zoom: lerp(1, 1.04, P(t, a, DUR)), punch: [L0, T('yibi') + .1], flash: [L0] };
});

// ---------------------------------------------------------------- transitions (torn paper) + master render
function tearPath(edge, dir, seed) { // a sheet whose jagged edge is at x=edge, covering toward dir (+1 right)
  const pts = []; const n = 34;
  for (let i = 0; i <= n; i++) { const y = -40 + (H + 80) * i / n; pts.push([edge + (rnd(seed + i) - .5) * 70 + Math.sin(i * 1.7) * 18, y]); }
  const far = dir > 0 ? W + 200 : -200;
  return `M${far},-40 ` + pts.map(p => `L${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ') + ` L${far},${H + 40} Z`;
}
const TEARS = [];
for (let i = 1; i < scenes.length; i++) if (scenes[i].bg !== scenes[i - 1].bg) TEARS.push({ t: scenes[i].a, to: scenes[i].bg, seed: i * 17 });
const tearSvg = $('tear'); tearSvg.setAttribute('width', W); tearSvg.setAttribute('height', H);

window.render = function (t) {
  const k = Math.floor(t * 24);
  $('grain').style.transform = `translate(${-rnd(k) * 180}px,${-rnd(k + 9) * 180}px)`;
  let cur = null;
  scenes.forEach(S => { const on = t >= S.a && t < S.b; S.root.style.display = on ? 'block' : 'none'; if (on) cur = S; });
  let bgLime = cur && cur.bg === 'lime';
  // the tear sweeps in the new colour 0.32s before the cut and finishes on it
  let tearD = '';
  for (const tr of TEARS) {
    const k0 = P(t, tr.t - .3, tr.t);
    if (k0 > 0 && k0 < 1) { const edge = lerp(W + 120, -120, eIO(k0)); tearD = tearPath(edge, 1, tr.seed);
      $('tearPath').setAttribute('fill', tr.to === 'lime' ? 'url(#gl)' : '#0D0F10'); }
  }
  $('tearPath').setAttribute('d', tearD);
  $('bgLime').style.opacity = bgLime ? 1 : 0;
  let cam = { zoom: 1, punch: [], shake: 0, flash: [] };
  if (cur) cam = Object.assign(cam, cur.update(t, cur.el) || {});
  let z = cam.zoom;
  cam.punch.forEach(p => { const d = t - p; if (d >= 0 && d < .35) z *= 1 + .045 * Math.exp(-d * 12) * Math.sin(Math.min(d * 18, Math.PI)); });
  const sh = cam.shake || 0, sk = Math.floor(t * 30);
  $('cam').style.transform = `translate(${(rnd(sk) - .5) * sh}px,${(rnd(sk + 5) - .5) * sh}px) scale(${z})`;
  let fl = 0; (cam.flash || []).forEach(f => { fl = Math.max(fl, Math.max(0, 1 - Math.abs(t - f) / .12) * .35); });
  $('flash').style.opacity = fl;
  stage.style.opacity = Math.min(P(t, 0, .25), 1 - P(t, DUR - .5, DUR));
};
window.DUR = DUR;
if (!/headless/i.test(navigator.userAgent)) { const t0 = performance.now(); const loop = () => { render(((performance.now() - t0) / 1000) % DUR); requestAnimationFrame(loop); }; document.fonts.ready.then(loop); }
