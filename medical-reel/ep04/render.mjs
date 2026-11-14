// Frame renderer for the SIBO reel: serves sibo/web, drives window.seek(t) in headless Chromium (WebGL via SwiftShader).
//   node render.mjs --page reel.html --out ../renders/frames --fps 30 --dur 97.5 [--from N] [--workers 3]
//   node render.mjs --page reel.html --preview 5,20,30 --out ../renders/preview
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url); const pw = require('/opt/node22/lib/node_modules/playwright');
const root = path.dirname(new URL(import.meta.url).pathname);
const a = Object.fromEntries(process.argv.slice(2).reduce((o, v, i, arr) => v.startsWith('--') ? o.concat([[v.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true]]) : o, []));
const outDir = path.resolve(root, a.out || '../renders/frames'); fs.mkdirSync(outDir, { recursive: true });
const fps = Number(a.fps || 30), dur = Number(a.dur || 1), from = Number(a.from || 0), to = a.to ? Number(a.to) : Math.round(dur * fps), workers = Number(a.workers || 3);
const ext = a.jpg ? 'jpg' : 'png';   // --jpg: quality-95 JPEG frames (much faster to write than PNG)
const items = a.preview ? String(a.preview).split(',').map(s => ({ t: s, name: `p_${s.replace(':', '_')}.${ext}` }))
  : Array.from({ length: to - from }, (_, k) => ({ t: (from + k) / fps, name: `${String(from + k + 1).padStart(5, '0')}.${ext}` }));
const types = { '.css': 'text/css', '.bin': 'application/octet-stream', '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };
const server = http.createServer((q, s) => { const p = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (!p.startsWith(root) || !fs.existsSync(p)) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(s); });
await new Promise(r => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${server.address().port}/${a.page || 'reel.html'}${a.query ? '?' + a.query : ''}`;   // --query "rs=.85&msaa=0"
const browser = await pw.chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const t0 = Date.now(); let done = 0;
await Promise.all(Array.from({ length: Math.min(workers, items.length) }, async (_, w) => {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  page.on('pageerror', e => console.error('pageerror', e.message)); page.on('console', m => { if (m.type() === 'error') console.error('console', m.text()); });
  await page.goto(url); await page.waitForFunction(() => window.ready === true, null, { timeout: 60000 });
  for (let i = w; i < items.length; i += workers) {
    await page.evaluate(t => window.seek(t), items[i].t);
    await page.screenshot(a.jpg ? { path: path.join(outDir, items[i].name), type: 'jpeg', quality: 95 } : { path: path.join(outDir, items[i].name), type: 'png' });
    if (++done % 100 === 0) console.log(`${done}/${items.length} ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  await page.close();
}));
await browser.close(); server.close();
console.log(`done ${items.length} -> ${outDir} in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
