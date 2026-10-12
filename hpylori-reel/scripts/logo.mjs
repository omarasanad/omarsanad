// Export the doctor's logo: assets/logo/{logo_mark.png, logo_full_dark.png, logo_full_light.png, logo_full_transparent.png}
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TYPES = { '.html': 'text/html', '.svg': 'image/svg+xml', '.ttf': 'font/ttf' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(ROOT) || !fs.existsSync(p)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 2400, height: 1200 } });
await page.goto(`http://127.0.0.1:${server.address().port}/assets/logo/logo.html`);
await page.evaluate(() => document.fonts.ready);
const out = (n) => path.join(ROOT, 'assets/logo', n);
for (const [cls, file, transparent] of [['dark', 'logo_full_dark.png'], ['light', 'logo_full_light.png'], ['', 'logo_full_transparent.png', true]]) {
  await page.evaluate((c) => { document.body.className = c; }, cls);
  await page.locator('#lockup').screenshot({ path: out(file), omitBackground: !!transparent });
}
await page.evaluate(() => { document.body.className = 'mark'; });
await page.locator('#mark').screenshot({ path: out('logo_mark.png'), omitBackground: true });
await browser.close(); server.close();
console.log('wrote assets/logo/*.png');
