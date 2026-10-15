// Render src/index.html frame by frame into out/silent.mp4.
//   node scripts/render.mjs [--fps 30] [--dur 50] [--workers 4] [--out out/silent.mp4]
//   node scripts/render.mjs --from 37.5 --out out/part.mp4   (partial render)
//   node scripts/render.mjs --stills 0.5,3,8   -> out/stills/t_<time>.png
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => {
  if (v.startsWith('--')) a.push([v.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true]);
  return a;
}, []));
const FPS = +(args.fps || 30);
const WORKERS = +(args.workers || 4);
const OUT = path.join(ROOT, args.out || 'out/silent.mp4');
const QS = args.nosubs ? 'render&nosubs' : 'render';

const TYPES = { '.svg': 'image/svg+xml', '.json': 'application/json', '.html': 'text/html', '.js': 'text/javascript', '.ttf': 'font/ttf', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': TYPES[path.extname(p).toLowerCase()] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const URL_ = `http://127.0.0.1:${server.address().port}/src/${args.page || 'index.html'}?${QS}`;

const browser = await chromium.launch({ args: ['--font-render-hinting=none', '--disable-lcd-text'] });
async function openPage() {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.error('pageerror:', e.message));
  await page.goto(URL_);
  await page.evaluate(() => window.ready);
  return page;
}
// PNG for stills; high-quality JPEG for video frames (PNG encoding is ~15x slower).
const shot = (page, png = false) => page.locator('#c').screenshot(png ? { type: 'png' } : { type: 'jpeg', quality: 97 });

if (args.stills) {
  const page = await openPage();
  const dir = path.join(ROOT, 'out/stills'); fs.mkdirSync(dir, { recursive: true });
  for (const t of String(args.stills).split(',').map(Number)) {
    await page.evaluate((t) => window.seek(t), t);
    fs.writeFileSync(path.join(dir, `t_${t.toFixed(2)}.png`), await shot(page, true));
  }
  console.log('has doctor image:', await page.evaluate(() => window.HAS_DOCTOR));
  await browser.close(); server.close(); process.exit(0);
}

const DUR = +(args.dur || (await (await openPage()).evaluate(() => window.DURATION)));
// --from/--to (seconds) render only part of the timeline, e.g. to patch one scene.
const F0 = Math.round(+(args.from || 0) * FPS);
const total = Math.round(+(args.to || DUR) * FPS) - F0;
const tmp = path.join(ROOT, 'out/segments'); fs.mkdirSync(tmp, { recursive: true });
const per = Math.ceil(total / WORKERS);
const t0 = Date.now();
let done = 0;

async function worker(w) {
  const a = w * per, b = Math.min(total, a + per);
  if (a >= b) return null;
  const page = await openPage();
  const file = path.join(tmp, `seg_${w}.mp4`);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '15', '-pix_fmt', 'yuv420p', '-color_range', 'tv', '-r', String(FPS), file], { stdio: ['pipe', 'inherit', 'inherit'] });
  for (let f = a; f < b; f++) {
    await page.evaluate((t) => window.seek(t), (F0 + f) / FPS);
    const buf = await shot(page);
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    if (++done % 60 === 0) console.log(`${done}/${total} frames  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  ff.stdin.end();
  await new Promise((r) => ff.on('close', r));
  return file;
}
const files = (await Promise.all(Array.from({ length: WORKERS }, (_, w) => worker(w)))).filter(Boolean);
fs.writeFileSync(path.join(tmp, 'list.txt'), files.map((f) => `file '${f}'`).join('\n'));
await new Promise((r) => spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', path.join(tmp, 'list.txt'), '-c', 'copy', '-movflags', '+faststart', OUT], { stdio: 'inherit' }).on('close', r));
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`wrote ${OUT}: ${total} frames @ ${FPS}fps in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
await browser.close(); server.close();
