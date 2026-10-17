// node frames.js out_prefix t1 t2 ... -> PNG per time (for review)
const { chromium } = require('playwright');
(async () => {
  const [,, prefix, ...ts] = process.argv;
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  p.on('console', m => console.log('console:', m.text())); p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto('file://' + require('path').resolve(__dirname, '../video/index.html'));
  await p.evaluate(() => document.fonts.ready);
  for (const t of ts) { await p.evaluate(t => render(+t), t); await p.screenshot({ path: `${prefix}${t}.png` }); }
  await b.close();
})();
