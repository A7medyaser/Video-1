// node render2.js W H fps outDir [workers] -> JPEG frames of video2
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const [,, w, h, fpsS, outDir, wS = '4'] = process.argv;
  const fps = +fpsS, DUR = 53.5, total = Math.round(DUR * fps);
  const b = await chromium.launch(); let next = 0, done = 0; const t0 = Date.now();
  const work = async () => {
    const p = await b.newPage({ viewport: { width: +w, height: +h } });
    p.on('pageerror', e => console.log('ERR', e.message));
    await p.goto('file://' + path.resolve(__dirname, '../video2/index.html') + `?w=${w}&h=${h}`);
    await p.evaluate(() => document.fonts.ready);
    for (;;) { const f = next++; if (f >= total) break;
      await p.evaluate(t => render(t), f / fps);
      await p.screenshot({ path: path.join(outDir, `f${String(f).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 94 });
      if (++done % 300 === 0) console.log(w + 'x' + h, done, '/', total, ((Date.now() - t0) / 1000).toFixed(0) + 's'); }
  };
  await Promise.all(Array.from({ length: +wS }, work)); await b.close();
})();
