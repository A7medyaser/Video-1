// usage: node shot.js file.html out.png [w h]
const { chromium } = require('playwright');
(async () => {
  const [,, file, out, w='1920', h='1080'] = process.argv;
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: +w, height: +h } });
  await p.goto('file://' + require('path').resolve(file));
  await p.evaluate(() => document.fonts.ready);
  if (process.env.T) await p.evaluate(t => window.render && window.render(+t), process.env.T);
  await p.screenshot({ path: out });
  await b.close();
})();
