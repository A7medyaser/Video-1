// node frames2.js W H out_prefix t1 t2 ... -> review PNGs of video2 at a given format
const { chromium } = require('playwright');
(async () => {
  const [,, w, h, prefix, ...ts] = process.argv;
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: +w, height: +h } });
  p.on('pageerror', e => console.log('ERR', e.message)); p.on('console', m => m.type() === 'error' && console.log('console:', m.text()));
  await p.goto('file://' + require('path').resolve(__dirname, '../video2/index.html') + `?w=${w}&h=${h}`);
  await p.evaluate(() => document.fonts.ready);
  for (const t of ts) { await p.evaluate(t => render(+t), t); await p.screenshot({ path: `${prefix}${t}.png` }); }
  await b.close();
})();
