// Render overlay.html frames to transparent PNGs.
// usage: node render_ov.js <startFrame> <endFrame> [step] [outdir]
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const path = require('path'), fs = require('fs');
(async () => {
  const [a, b, step = 1, out = 'ov'] = process.argv.slice(2);
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--allow-file-access-from-files'] });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  page.on('pageerror', e => { console.error('PAGEERR', e.message); process.exit(2); });
  await page.goto('file://' + path.resolve('overlay.html'));
  await page.evaluate(() => window.ready);
  await page.waitForTimeout(300);
  let n = 0;
  for (let f = +a; f < +b; f += +step) {
    const vis = await page.evaluate(t => render(t), f / 60);
    const fn = path.join(out, `f${String(f).padStart(5, '0')}.png`);
    if (vis) { await page.screenshot({ path: fn, omitBackground: true }); n++; }
    else if (fs.existsSync(fn)) fs.unlinkSync(fn);
  }
  console.log(`frames ${a}-${b}: ${n} rendered`);
  await browser.close();
})();
