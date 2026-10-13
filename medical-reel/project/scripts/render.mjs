// Frame renderer: serves the project folder, drives window.seek(t) in headless Chromium,
// and writes PNG frames.
//   node scripts/render.mjs --out build/render            (all frames)
//   node scripts/render.mjs --preview 0.5,9,17,25,32 --out build/preview
//   node scripts/render.mjs --page thumbnail.html --preview 0 --out build/thumb
//   node scripts/render.mjs --page logo_export.html --preview 0 --w 1080 --h 1080 --transparent --out build/logo
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch { pw = require('/opt/node22/lib/node_modules/playwright'); }

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => (v.startsWith('--') ? a.concat([[v.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true]]) : a), []));
const outDir = path.resolve(root, args.out || 'build/render');
const pageName = args.page || 'index.html';
const workers = Number(args.workers || 3);
fs.mkdirSync(outDir, { recursive: true });

const tl = JSON.parse(fs.readFileSync(path.join(root, 'data/timeline.json')));
const fps = tl.fps, total = tl.videoDur + tl.outroDur;
const allTimes = Array.from({ length: Math.round(total * fps) }, (_, i) => i / fps);
const from = Number(args.from || 0);            // --from FRAME: re-render only frames >= FRAME (1-based names kept)
const times = args.preview ? String(args.preview).split(',').map(Number) : allTimes.slice(from);

const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(root) || !fs.existsSync(p)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${server.address().port}/${pageName}`;

const browser = await pw.chromium.launch();
const t0 = Date.now();
await Promise.all(Array.from({ length: Math.min(workers, times.length) }, async (_, w) => {
  const page = await browser.newPage({ viewport: { width: Number(args.w || 1080), height: Number(args.h || 1920) }, deviceScaleFactor: 1 });
  page.on('pageerror', e => console.error('pageerror', e.message));
  await page.goto(url);
  await page.waitForFunction(() => window.ready === true, null, { timeout: 30000 });
  for (let i = w; i < times.length; i += workers) {
    await page.evaluate(t => window.seek(t), times[i]);
    const name = args.preview ? `t_${times[i].toFixed(2)}.png` : `${String(i + from + 1).padStart(5, '0')}.png`;
    await page.screenshot({ path: path.join(outDir, name), type: 'png', omitBackground: !!args.transparent });
    if (!args.preview && i % 150 === 0) console.log(`frame ${i}/${times.length} ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  await page.close();
}));
await browser.close(); server.close();
console.log(`done ${times.length} frames -> ${outDir} in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
