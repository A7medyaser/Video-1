// Renders video/index.html frame by frame: node render.js outDir fps [workers] [w h]
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const [,, outDir, fpsS = '30', wS = '3'] = process.argv;
  const fps = +fpsS, workers = +wS, DUR = 57, total = Math.round(DUR * fps);
  const b = await chromium.launch();
  let next = 0, done = 0; const t0 = Date.now();
  const work = async () => {
    const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
    p.on('pageerror', e => console.log('ERR', e.message));
    await p.goto('file://' + path.resolve(__dirname, '../video/index.html'));
    await p.evaluate(() => document.fonts.ready);
    while (true) {
      const f = next++; if (f >= total) break;
      await p.evaluate(t => render(t), f / fps);
      await p.screenshot({ path: path.join(outDir, `f${String(f).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 94 });
      if (++done % 150 === 0) console.log(done, '/', total, ((Date.now() - t0) / 1000).toFixed(0) + 's');
    }
  };
  await Promise.all(Array.from({ length: workers }, work));
  await b.close();
})();
