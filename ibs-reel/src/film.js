// IBS (القولون العصبي) — Egyptian Arabic medical reel. 1080x1920, pure function of time.
// Every cue is keyed to the caption timeline in timing.json, so re-timing to a recorded voice
// only means regenerating timing.json (scripts/timing.py).
import { clamp, lerp, prog, easeOut, easeIn, easeInOut, spring, rng } from './motion.js';
import { CONFIG } from './config.js';

const W = 1080, H = 1920, TAU = Math.PI * 2;
const cv = document.getElementById('c');
const ctx = cv.getContext('2d');
const QS = new URLSearchParams(location.search);
const RENDER = QS.has('render'), NOSUBS = QS.has('nosubs');

const C = {
  bg0: '#051631', bg1: '#0a2b5a', bg2: '#12468a', blue: '#2f8bff', teal: '#2fd0c0', tealDeep: '#0f8f86',
  white: '#f4f9fc', muted: '#a9c2dc', orange: '#ff8a3d', orangeSoft: '#ffb27a', navy: '#06203f',
};
const AR = "'Cairo', 'Noto Kufi Arabic', sans-serif";
const EN = "'Inter', sans-serif";

let TL = { duration: 54, scenes: [0, 8, 18, 24, 35, 44], captions: [] };
let SC = TL.scenes;
let DOC = null, MARK = null, ENV = null;

// ------------------------------------------------------------ helpers
function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
function rrect(c, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}
function soft(color, size = 256) {
  const s = mk(size, size), g = s.getContext('2d'), gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gr.addColorStop(0, rgba(color, 1)); gr.addColorStop(0.4, rgba(color, 0.4)); gr.addColorStop(1, rgba(color, 0));
  g.fillStyle = gr; g.fillRect(0, 0, size, size); return s;
}
const SOFT = { teal: soft(C.teal), orange: soft(C.orange), white: soft('#ffffff'), blue: soft(C.blue) };
function glow(c, spr, x, y, r, a) { if (a > 0.003 && r > 0) { c.save(); c.globalAlpha *= a; c.drawImage(spr, x - r, y - r, 2 * r, 2 * r); c.restore(); } }
function setFont(c, size, weight = 800, fam = AR) { c.font = `${weight} ${size}px ${fam}`; }
// caption-keyed time: start of the first caption containing `needle`
function at(needle, off = 0) {
  const cap = TL.captions.find((x) => x[2].includes(needle));
  return (cap ? cap[0] : 0) + off;
}
const capEnd = (needle) => { const cap = TL.captions.find((x) => x[2].includes(needle)); return cap ? cap[1] : 0; };

// ------------------------------------------------------------ typography (RTL, word-level so letters stay joined)
function riseText(c, str, x, y, t, tin, tout, o = {}) {
  if (t < tin) return;
  const size = o.size || 72, out = tout != null ? easeIn(prog(t, tout, tout + 0.3)) : 0;
  if (out >= 1) return;
  c.save();
  c.direction = 'rtl'; setFont(c, size, o.weight || 800, o.fam || AR); c.textBaseline = 'middle'; c.textAlign = 'right';
  const words = str.split(' '), ws = words.map((w) => c.measureText(w).width), sp = c.measureText(' ').width;
  const total = ws.reduce((a, b) => a + b, 0) + sp * (words.length - 1);
  let xr = (o.align || 'center') === 'center' ? x + total / 2 : o.align === 'right' ? x : x + total;
  c.beginPath(); c.rect(xr - total - 40, y - size * 1.1, total + 80, size * 1.85); c.clip();
  words.forEach((w, i) => {
    const s = spring(t, tin + i * (o.stagger ?? 0.06), 15, 0.7);
    c.fillStyle = (o.colors && o.colors[i]) || o.color || C.white;
    c.fillText(w, xr, y + (1 - s) * size * 1.15 - out * size * 1.5);
    xr -= ws[i] + sp;
  });
  c.restore();
}
function popText(c, str, x, y, t, tin, tout, o = {}) {
  const s = spring(t, tin, 13, 0.55), out = tout != null ? easeIn(prog(t, tout, tout + 0.25)) : 0;
  if (s <= 0 || out >= 1) return;
  c.save(); c.translate(x, y); const k = clamp(s, 0, 1.3) * (1 - out); c.scale(k, k);
  c.direction = o.ltr ? 'ltr' : 'rtl'; setFont(c, o.size || 90, o.weight || 800, o.fam || AR);
  c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = o.color || C.white; c.fillText(str, 0, 0);
  c.restore();
}

// Rounded pill label; anchored at its right edge (RTL), springs open from the right.
function pill(c, t, str, right, y, tin, tout, o = {}) {
  const s = spring(t, tin, 12, 0.62), out = tout != null ? easeIn(prog(t, tout, tout + 0.3)) : 0;
  if (s <= 0 || out >= 1) return;
  const size = o.size || 46;
  c.save();
  c.direction = 'rtl'; setFont(c, size, 800); c.textBaseline = 'middle'; c.textAlign = 'right';
  const tw = c.measureText(str).width, icon = o.icon ? size * 1.5 : 0, w = tw + 70 + icon, h = size * 1.9;
  const x0 = o.center ? 540 + w / 2 : right;
  c.translate(x0, y); c.rotate((o.rot || 0) * Math.PI / 180 * clamp(s, 0, 1));
  c.scale(lerp(0.6, 1, clamp(s, 0, 1.1)) * (1 - out * 0.4), lerp(0.6, 1, clamp(s, 0, 1.1)) * (1 - out * 0.4));
  c.globalAlpha = clamp(s * 2) * (1 - out);
  c.shadowColor = 'rgba(0,10,30,0.45)'; c.shadowBlur = 24; c.shadowOffsetY = 8;
  rrect(c, -w, -h / 2, w, h, h / 2); c.fillStyle = o.fill || 'rgba(7,28,58,0.92)'; c.fill();
  c.shadowColor = 'transparent';
  if (o.stroke) { c.lineWidth = 4; c.strokeStyle = o.stroke; c.stroke(); }
  if (o.icon) {
    const ix = -35 - size * 0.55;
    c.fillStyle = o.iconBg || C.orange; c.beginPath(); c.arc(ix, 0, size * 0.55, 0, TAU); c.fill();
    c.fillStyle = '#ffffff'; c.textAlign = 'center'; setFont(c, size * 0.75, 800, o.icon.match(/[a-z!?]/i) ? EN : AR);
    c.direction = 'ltr'; c.fillText(o.icon, ix, size * 0.04); c.direction = 'rtl'; setFont(c, size, 800); c.textAlign = 'right';
  }
  c.fillStyle = o.color || C.white; c.fillText(str, -35 - icon, 3);
  c.restore();
}

// ------------------------------------------------------------ backgrounds
const HEX = (() => {
  const s = mk(1500, 2400), g = s.getContext('2d'), R = 78;
  g.strokeStyle = 'rgba(150,215,255,0.07)'; g.lineWidth = 2;
  for (let row = 0; row < 22; row++) for (let col = 0; col < 12; col++) {
    const x = col * R * 1.75 + (row % 2) * R * 0.875, y = row * R * 1.52;
    g.beginPath();
    for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + k * Math.PI / 3; g.lineTo(x + Math.cos(a) * R * 0.9, y + Math.sin(a) * R * 0.9); }
    g.closePath(); g.stroke();
  }
  return s;
})();
const R0 = rng(31);
const DUST = Array.from({ length: 110 }, () => ({ x: R0() * W, y: R0() * H, z: 0.3 + R0() * 0.7, r: 1 + R0() * 2.4, ph: R0() * TAU }));
const GRAIN = Array.from({ length: 6 }, (_, k) => {
  const s = mk(256, 256), g = s.getContext('2d'), id = g.createImageData(256, 256), r = rng(7 + k);
  for (let i = 0; i < id.data.length; i += 4) { const v = r() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; }
  g.putImageData(id, 0, 0); return s;
});
function background(c, t, look) {
  const g = c.createRadialGradient(540, 760, 80, 540, 900, 1350);
  g.addColorStop(0, look.warn ? '#123766' : C.bg2); g.addColorStop(0.5, look.warn ? '#0a2348' : C.bg1); g.addColorStop(1, C.bg0);
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  c.drawImage(HEX, -200 + Math.sin(t * 0.07) * 60, -260 - t * 6 % 240);
  glow(c, SOFT.teal, 420, 520, 620, 0.22 * (look.teal ?? 1));
  glow(c, SOFT.orange, 900, 260, 520, 0.10 + 0.25 * (look.warn || 0));
  glow(c, SOFT.blue, 200, 1500, 700, 0.18);
  for (const p of DUST) {
    const x = (p.x + Math.sin(t * 0.3 + p.ph) * 30 + W) % W, y = ((p.y - t * 14 * p.z) % H + H) % H;
    c.fillStyle = `rgba(210,240,255,${0.35 * p.z * (0.6 + 0.4 * Math.sin(t * 2 + p.ph))})`;
    c.beginPath(); c.arc(x, y, p.r * p.z, 0, TAU); c.fill();
  }
}
function finish(c, t) {
  const v = c.createRadialGradient(540, 900, 600, 540, 960, 1300);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,6,20,0.5)');
  c.fillStyle = v; c.fillRect(0, 0, W, H);
  c.save(); c.globalAlpha = 0.035; c.globalCompositeOperation = 'overlay';
  c.fillStyle = c.createPattern(GRAIN[Math.floor(t * 24) % 6], 'repeat'); c.fillRect(0, 0, W, H); c.restore();
}

// ------------------------------------------------------------ cartoon gut (clay-shaded tubes)
function catmull(pts, step = 3) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    const seg = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]), n = Math.max(2, Math.ceil(seg / step));
    for (let k = 0; k < n; k++) {
      const u = k / n, u2 = u * u, u3 = u2 * u;
      out.push([
        0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * u + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * u2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * u3),
        0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * u + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * u2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * u3)]);
    }
  }
  out.push(pts[pts.length - 1]);
  let L = 0;
  return out.map((p, i) => {
    if (i) L += Math.hypot(p[0] - out[i - 1][0], p[1] - out[i - 1][1]);
    const q = out[Math.min(out.length - 1, i + 1)], r = out[Math.max(0, i - 1)];
    const dx = q[0] - r[0], dy = q[1] - r[1], d = Math.hypot(dx, dy) || 1;
    return { x: p[0], y: p[1], s: L, nx: -dy / d, ny: dx / d };
  });
}
const COLON = catmull([[-205, 300], [-208, 120], [-205, -110], [-180, -200], [-80, -182], [40, -192], [160, -212], [212, -140],
  [218, 60], [214, 225], [175, 318], [85, 296], [32, 330], [12, 420]]);
const SMALL = catmull((() => {
  // irregular meander of the small intestine inside the colon frame (seeded, so identical every frame)
  const r = rng(12), pts = [[-110, -118]], rows = 6;
  for (let i = 0; i < rows; i++) {
    const y = -118 + i * 62, dir = i % 2 ? -1 : 1;
    const xs = [-120, -55, 15, 80, 135].map((x) => x + (r() - 0.5) * 30);
    if (dir < 0) xs.reverse();
    xs.forEach((x, k) => pts.push([x, y + (r() - 0.5) * 30 + (k % 2 ? 10 : -6)]));
    if (i < rows - 1) pts.push([dir * 150, y + 31 + (r() - 0.5) * 10]);
  }
  pts.push([-165, 250], [-188, 262]);
  return pts;
})());
function tube(c, path, base, t, o) {
  const L = path[path.length - 1].s;
  const wave = (s) => {
    const ph = ((t * o.speed * 160) % (L + 300)) - 150;
    return Math.exp(-(((s - ph) / 70) ** 2)) + 0.6 * Math.exp(-(((s - ph + L * 0.5) / 70) ** 2));
  };
  const rad = (p) => base * (1 + o.bloat * 0.3 + 0.2 * wave(p.s));
  const passes = [
    [(r) => r + 4, o.dark, 0, 0, 1],
    [(r) => r, o.col, 0, 0, 1],
    [(r) => r * 0.55, o.light, -0.2, -0.3, 0.5],
    [(r) => r * 0.15, '#ffffff', -0.3, -0.42, 0.35],
  ];
  for (const [rf, col, ox, oy, a] of passes) {
    c.fillStyle = col; c.globalAlpha = a * o.alpha;
    for (let i = 0; i < path.length; i += 1) {
      const p = path[i], r = rf(rad(p));
      c.beginPath(); c.arc(p.x + ox * base, p.y + oy * base, r, 0, TAU); c.fill();
    }
  }
  if (o.haustra) {
    c.strokeStyle = o.dark; c.globalAlpha = 0.45 * o.alpha; c.lineWidth = 3; c.lineCap = 'round';
    for (let i = 0; i < path.length; i++) {
      const p = path[i];
      if (Math.floor(p.s / 34) === Math.floor((path[i - 1] || { s: -99 }).s / 34)) continue;
      const r = rad(p) * 0.82;
      c.beginPath(); c.moveTo(p.x + p.nx * r, p.y + p.ny * r);
      c.quadraticCurveTo(p.x - p.ny * 6, p.y + p.nx * 6, p.x - p.nx * r, p.y - p.ny * r); c.stroke();
    }
  }
  c.globalAlpha = 1;
}
function gut(c, t, o) {
  if (o.alpha <= 0) return;
  c.save(); c.translate(o.x, o.y); c.scale(o.scale, o.scale); c.globalAlpha = o.alpha;
  // translucent cartoon belly
  c.beginPath();
  c.moveTo(-250, -330); c.bezierCurveTo(-330, -200, -340, 120, -300, 300); c.bezierCurveTo(-260, 470, 260, 470, 300, 300);
  c.bezierCurveTo(340, 120, 330, -200, 250, -330); c.bezierCurveTo(120, -380, -120, -380, -250, -330); c.closePath();
  const bg = c.createLinearGradient(0, -380, 0, 470);
  bg.addColorStop(0, 'rgba(160,215,255,0.16)'); bg.addColorStop(1, 'rgba(160,215,255,0.05)');
  c.fillStyle = bg; c.fill(); c.lineWidth = 4; c.strokeStyle = 'rgba(120,230,225,0.45)'; c.stroke();
  const tt = o.time ?? t;
  tube(c, SMALL, 20, tt, { col: '#ff97a6', dark: '#b84a63', light: '#ffd3da', speed: o.speed * 1.3, bloat: o.bloat, alpha: o.alpha });
  tube(c, COLON, 34, tt, { col: '#ffab7d', dark: '#c45d3c', light: '#ffe0c9', speed: o.speed, bloat: o.bloat, haustra: true, alpha: o.alpha });
  // discomfort: soft orange pulses on the colon
  if (o.pain > 0) {
    c.globalCompositeOperation = 'lighter';
    for (const k of [0.15, 0.42, 0.7]) {
      const p = COLON[Math.floor(k * (COLON.length - 1))];
      glow(c, SOFT.orange, p.x, p.y, 120 + 30 * Math.sin(t * 6 + k * 9), 0.55 * o.pain * (0.6 + 0.4 * Math.sin(t * 6 + k * 9)));
    }
    c.globalCompositeOperation = 'source-over';
  }
  // gas bubbles while bloated
  if (o.bloat > 0.05) {
    const r = rng(5);
    for (let i = 0; i < 14; i++) {
      const p = (i % 2 ? COLON : SMALL)[Math.floor(r() * ((i % 2 ? COLON : SMALL).length - 1))];
      const ph = (t * 0.8 + r()) % 1;
      c.fillStyle = `rgba(255,255,255,${0.7 * o.bloat * Math.sin(Math.PI * ph)})`;
      c.beginPath(); c.arc(p.x + (r() - 0.5) * 16, p.y - ph * 18, 4 + r() * 5, 0, TAU); c.fill();
    }
  }
  c.restore();
}

// cartoon brain for the gut–brain link
function brain(c, x, y, r, t, a) {
  if (a <= 0) return;
  c.save(); c.translate(x, y); c.globalAlpha = a; c.scale(1 + 0.03 * Math.sin(t * 3), 1 + 0.03 * Math.sin(t * 3));
  const g = c.createRadialGradient(-r * 0.3, -r * 0.4, 4, 0, 0, r * 1.2);
  g.addColorStop(0, '#ffd6e8'); g.addColorStop(1, '#d97aa8');
  c.fillStyle = g; c.beginPath(); c.ellipse(0, 0, r * 1.15, r * 0.9, 0, 0, TAU); c.fill();
  c.strokeStyle = '#b4527f'; c.lineWidth = 4; c.lineCap = 'round';
  c.beginPath(); c.moveTo(0, -r * 0.85); c.bezierCurveTo(-10, -r * 0.3, 10, r * 0.3, 0, r * 0.85); c.stroke();
  for (const sx of [-1, 1]) for (let k = 0; k < 3; k++) {
    c.beginPath(); const yy = -r * 0.45 + k * r * 0.42;
    c.moveTo(sx * r * 0.2, yy); c.bezierCurveTo(sx * r * 0.5, yy - 16, sx * r * 0.7, yy + 16, sx * r * 0.95, yy - 4); c.stroke();
  }
  c.restore();
}

// ------------------------------------------------------------ doctor (cut-out character)
// p = 0: full "hero" framing; p = 1: round presenter bubble at (bx, by, br).
function doctor(c, t, p, bx, by, br, push = 1, talk = 0) {
  if (!DOC) return;
  const e = easeInOut(p);
  const breathe = 1 + 0.006 * Math.sin(t * 1.7);
  const sH = 1.12 * push * breathe, sB = (br / 255) * breathe;
  const s = Math.exp(lerp(Math.log(sH), Math.log(sB), e));
  const ax = lerp(420 + Math.sin(t * 0.5) * 8, bx, e), ay = lerp(452 + Math.sin(t * 0.8) * 4, by + br * 0.08, e);
  const cx = lerp(540, bx, e), cy = lerp(800, by, e), R = Math.exp(lerp(Math.log(2400), Math.log(br), e));
  c.save();
  if (e > 0) {
    // bubble backdrop
    c.save(); c.globalAlpha = e;
    c.shadowColor = 'rgba(0,10,30,0.5)'; c.shadowBlur = 30; c.shadowOffsetY = 10;
    const g = c.createLinearGradient(0, cy - R, 0, cy + R);
    g.addColorStop(0, '#2a86e8'); g.addColorStop(1, '#0d3f86');
    c.fillStyle = g; c.beginPath(); c.arc(cx, cy, R, 0, TAU); c.fill(); c.restore();
  }
  c.beginPath(); c.arc(cx, cy, R, 0, TAU); c.clip();
  // contact shadow + rim light in hero framing
  if (e < 1) glow(c, SOFT.teal, ax + 40, ay - 120, 520, 0.25 * (1 - e));
  c.save();
  c.translate(ax, ay); c.rotate(Math.sin(t * 0.7) * 0.006 * (1 - e)); c.translate(-405 * s, -360 * s);
  c.drawImage(DOC, 0, 0, DOC.naturalWidth * s, DOC.naturalHeight * s);
  c.restore();
  c.restore();
  if (e > 0.5) {
    const a = (e - 0.5) * 2;
    c.save(); c.globalAlpha = a;
    c.lineWidth = 6; c.strokeStyle = C.teal; c.beginPath(); c.arc(cx, cy, R, 0, TAU); c.stroke();
    // speaking meter: bars around the ring follow the voice
    if (talk > 0.02) {
      c.strokeStyle = C.teal; c.lineCap = 'round'; c.lineWidth = 5;
      for (let k = 0; k < 28; k++) {
        const ang = -Math.PI / 2 + (k / 28) * TAU;
        const n = 0.5 + 0.5 * Math.sin(t * 17 + k * 2.3) * Math.sin(t * 9.7 + k * 0.7);
        const len = 6 + 18 * talk * n;
        c.beginPath(); c.moveTo(cx + Math.cos(ang) * (R + 10), cy + Math.sin(ang) * (R + 10));
        c.lineTo(cx + Math.cos(ang) * (R + 10 + len), cy + Math.sin(ang) * (R + 10 + len)); c.stroke();
      }
    }
    c.restore();
  }
}
function talkLevel(T) {
  if (ENV) { const i = Math.floor(T * ENV.fps); return clamp((ENV.v[i] || 0) * 1.6); }
  return TL.captions.some(([a, b]) => T >= a && T < b - 0.15) ? 0.75 + 0.25 * Math.sin(T * 13) : 0;
}

// Doctor framing over the whole film.
function doctorState(t) {
  const T1 = at('طب ممكن', -0.35), B0 = [165, 1335, 100], B1 = [250, 1335, 125];
  const toBubble = prog(t, T1, T1 + 0.85);
  const move = easeInOut(prog(t, at('ولو الأعراض', -0.3), at('ولو الأعراض', 0.35)));
  const toHero = prog(t, SC[4] - 0.25, SC[4] + 0.75);
  const p = t < SC[4] - 0.25 ? toBubble : 1 - toHero;
  const b = t < SC[4] - 0.25 ? B0.map((v, i) => lerp(v, B1[i], move)) : B1;
  let push = lerp(1.14, 1, spring(t, 0, 6, 0.9));
  if (t >= SC[4] - 0.25) push = t < SC[5] ? lerp(1, 1.1, easeInOut(prog(t, SC[4], SC[5]))) : lerp(1.1, 1.0, easeInOut(prog(t, SC[5], SC[5] + 1.6)));
  const intro = t < 1.2 ? (1 - spring(t, -0.1, 7, 0.85)) * 380 : 0;
  return { p, bx: b[0], by: b[1] + intro, br: b[2], push, intro };
}

// ------------------------------------------------------------ scenes
function gutState(t) {
  const T1 = at('طب ممكن', -0.35);
  const inS = spring(t, T1 + 0.1, 8, 0.8);
  const toS2 = easeInOut(prog(t, SC[1] - 0.2, SC[1] + 0.8));
  const out = easeIn(prog(t, SC[2] - 0.45, SC[2] + 0.2));
  const sentence = at('وممكن يسبب');
  const pain = easeOut(prog(t, sentence + 0.5, sentence + 0.9)) * (1 - easeIn(prog(t, SC[2] - 0.6, SC[2])));
  const bloat = Math.sin(Math.PI * prog(t, sentence + 1.5, sentence + 3.4));
  const alt = prog(t, at('وأحيانًا'), SC[2]);
  const speed = alt > 0 ? (Math.sin(t * 4) > 0 ? 2.4 : 0.35) : (t > at('اضطراب') ? 0.9 + 0.6 * Math.sin(t * 1.3) : 1);
  return {
    x: lerp(540, 520, toS2) + out * 900, y: lerp(lerp(1150, 880, inS), 870, toS2),
    scale: lerp(lerp(0.55, 0.95, clamp(inS, 0, 1.1)), 0.8, toS2) * (1 - out * 0.3),
    alpha: clamp(inS * 2) * (1 - out), pain, bloat, speed,
  };
}

function scene1(c, t) {
  // question chips over the hero shot
  const T1 = at('طب ممكن', -0.35);
  pill(c, t, 'بطنك بتوجعك؟', 985, 1070, at('بطنك', 0.05), T1, { icon: '?', rot: -3, size: 50 });
  pill(c, t, 'انتفاخ؟', 640, 1185, at('وبتحس', 0.5), T1 + 0.05, { icon: '?', rot: 3, size: 50 });
  pill(c, t, 'الحمام مش منتظم؟', 1000, 1300, at('أو إن حركة', 0.35), T1 + 0.1, { icon: '?', rot: -2, size: 50 });
}
function scene1Gut(c, t) {
  const T1 = at('طب ممكن', -0.35);
  riseText(c, 'ممكن يكون', 540, 285, t, T1 + 0.3, SC[1] - 0.3, { size: 62, weight: 600 });
  riseText(c, 'القولون العصبي؟', 540, 395, t, T1 + 0.45, SC[1] - 0.3, { size: 108, colors: { 0: C.teal, 1: C.teal } });
}
function scene2(c, t) {
  const out = SC[2] - 0.4;
  riseText(c, 'يعني إيه قولون عصبي؟', 540, 280, t, SC[1] + 0.15, out, { size: 84 });
  // IBS tag
  const ts = spring(t, SC[1] + 0.5, 12, 0.6), to = easeIn(prog(t, out, out + 0.3));
  if (ts > 0 && to < 1) {
    c.save(); c.translate(540, 385); const k = clamp(ts, 0, 1.2) * (1 - to); c.scale(k, k);
    rrect(c, -82, -36, 164, 72, 36); c.fillStyle = C.orange; c.fill();
    setFont(c, 44, 700, EN); c.fillStyle = '#ffffff'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('IBS', 0, 3);
    c.restore();
  }
  // gut–brain interaction
  const bl = easeOut(prog(t, at('اضطراب'), at('اضطراب', 0.7))) * (1 - to);
  if (bl > 0) {
    const g = gutState(t), ex = g.x + 170 * g.scale, ey = g.y - 205 * g.scale;
    const bx = 875, by = 545;
    brain(c, bx, by, 62 * easeOut(bl), t, bl);
    c.save(); c.globalAlpha = bl; c.setLineDash([10, 12]); c.lineDashOffset = -t * 40;
    c.strokeStyle = 'rgba(120,235,225,0.8)'; c.lineWidth = 5; c.lineCap = 'round';
    c.beginPath(); c.moveTo(bx - 40, by + 55); c.quadraticCurveTo(bx - 60, ey - 30, ex + 18, ey - 18); c.stroke();
    c.setLineDash([]);
    for (let k = 0; k < 3; k++) {
      const u = (t * 0.6 + k / 3) % 1, uu = k % 2 ? u : 1 - u;
      const x = (1 - uu) ** 2 * (bx - 40) + 2 * (1 - uu) * uu * (bx - 60) + uu * uu * (ex + 18);
      const y = (1 - uu) ** 2 * (by + 55) + 2 * (1 - uu) * uu * (ey - 30) + uu * uu * (ey - 18);
      glow(c, SOFT.white, x, y, 16, 0.9); c.fillStyle = '#ffffff'; c.beginPath(); c.arc(x, y, 5, 0, TAU); c.fill();
    }
    c.restore();
    c.save(); c.globalAlpha = bl;
    c.direction = 'rtl'; setFont(c, 30, 700); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = C.teal;
    c.fillText('تواصل المخ والأمعاء', bx, by - 92); c.restore();
  }
  // symptoms
  const sen = at('وممكن يسبب');
  pill(c, t, 'وجع البطن', 1000, 1265, sen + 0.55, out, { icon: '!', size: 44 });
  pill(c, t, 'انتفاخ', 1000, 1360, sen + 1.6, out, { icon: '!', size: 44 });
  pill(c, t, 'إمساك أو إسهال', 1000, 1455, at('وإمساك', 0.05), out, { icon: '⇄', size: 44, iconBg: C.tealDeep });
}

// stress + food tiles
function tile(c, x, y, w, h, s, out) {
  c.save(); c.globalAlpha = clamp(s * 2) * (1 - out);
  c.translate(x + w / 2, y + h / 2 - out * 260); const k = lerp(0.7, 1, clamp(s, 0, 1.1)); c.scale(k, k); c.translate(-w / 2, -h / 2);
  c.shadowColor = 'rgba(0,10,30,0.4)'; c.shadowBlur = 30; c.shadowOffsetY = 12;
  rrect(c, 0, 0, w, h, 44);
  const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(46,110,190,0.75)'); g.addColorStop(1, 'rgba(13,48,100,0.85)');
  c.fillStyle = g; c.fill(); c.shadowColor = 'transparent';
  rrect(c, 3, 3, w - 6, h * 0.45, 40); const hl = c.createLinearGradient(0, 0, 0, h * 0.45);
  hl.addColorStop(0, 'rgba(255,255,255,0.10)'); hl.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = hl; c.fill();
  return () => c.restore();
}
function face(c, x, y, r, t, mood) {
  const g = c.createRadialGradient(x - r * 0.3, y - r * 0.35, 4, x, y, r * 1.1);
  g.addColorStop(0, '#ffe2c8'); g.addColorStop(1, '#e9a985');
  c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
  c.fillStyle = '#3b2a2a';
  for (const sx of [-1, 1]) { c.beginPath(); c.ellipse(x + sx * r * 0.33, y - r * 0.05, r * 0.08, r * 0.11, 0, 0, TAU); c.fill(); }
  c.strokeStyle = '#3b2a2a'; c.lineWidth = r * 0.07; c.lineCap = 'round';
  if (mood === 'stress') {
    for (const sx of [-1, 1]) { c.beginPath(); c.moveTo(x + sx * r * 0.5, y - r * 0.38); c.lineTo(x + sx * r * 0.18, y - r * 0.27); c.stroke(); }
    c.beginPath(); for (let k = 0; k <= 6; k++) c.lineTo(x - r * 0.3 + k * r * 0.1, y + r * 0.42 + (k % 2 ? -r * 0.06 : r * 0.06)); c.stroke();
  } else {
    c.beginPath(); c.arc(x, y + r * 0.2, r * 0.3, 0.2 * Math.PI, 0.8 * Math.PI); c.stroke();
  }
}
function stressIllo(c, cx, cy, t) {
  face(c, cx, cy + 40, 88, t, 'stress');
  // storm cloud
  c.save(); c.translate(cx, cy - 95 + Math.sin(t * 2) * 4);
  c.fillStyle = '#c9d6e6';
  for (const [x, y, r] of [[-60, 0, 38], [-15, -22, 48], [40, -6, 40], [72, 12, 28], [-90, 16, 26]]) { c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); }
  c.fillRect(-100, 10, 185, 30);
  const fl = 0.6 + 0.4 * Math.sign(Math.sin(t * 9));
  c.fillStyle = rgba(C.orange, fl);
  c.beginPath(); c.moveTo(-5, 36); c.lineTo(-30, 92); c.lineTo(-6, 88); c.lineTo(-22, 136); c.lineTo(28, 72); c.lineTo(4, 76); c.lineTo(20, 36); c.closePath(); c.fill();
  c.restore();
  // stress squiggles
  c.strokeStyle = rgba(C.orange, 0.9); c.lineWidth = 5; c.lineCap = 'round';
  for (const sx of [-1, 1]) {
    c.beginPath();
    for (let k = 0; k <= 8; k++) c.lineTo(cx + sx * (120 + k * 4), cy + 10 + k * 8 + Math.sin(t * 10 + k) * 4);
    c.stroke();
  }
}
function foodIllo(c, cx, cy, t) {
  c.save(); c.translate(cx, cy + 30);
  c.fillStyle = 'rgba(0,0,0,0.18)'; c.beginPath(); c.ellipse(0, 70, 150, 26, 0, 0, TAU); c.fill();
  c.fillStyle = '#ffffff'; c.beginPath(); c.ellipse(0, 40, 140, 52, 0, 0, TAU); c.fill();
  c.fillStyle = '#e3eef6'; c.beginPath(); c.ellipse(0, 36, 100, 34, 0, 0, TAU); c.fill();
  // bread
  c.fillStyle = '#e8a25a'; rrect(c, -80, -10, 90, 60, 22); c.fill(); c.fillStyle = '#ffd9a3'; rrect(c, -72, -2, 74, 44, 16); c.fill();
  // greens
  c.fillStyle = '#3cc47a'; for (const [x, y] of [[30, 20], [55, 8], [70, 30]]) { c.beginPath(); c.ellipse(x, y, 22, 12, 0.5, 0, TAU); c.fill(); }
  // cup
  c.fillStyle = '#ffffff'; rrect(c, 110, -60, 56, 66, 12); c.fill();
  c.strokeStyle = '#ffffff'; c.lineWidth = 7; c.beginPath(); c.arc(170, -28, 16, -Math.PI / 2, Math.PI / 2); c.stroke();
  c.fillStyle = '#8b5a3c'; c.fillRect(116, -54, 44, 10);
  c.strokeStyle = 'rgba(255,255,255,0.6)'; c.lineWidth = 4;
  for (const k of [0, 1]) { c.beginPath(); for (let i = 0; i <= 6; i++) c.lineTo(128 + k * 18 + Math.sin(t * 3 + i + k) * 5, -70 - i * 8); c.stroke(); }
  c.restore();
  // question badge: triggers differ by person
  const b = 0.9 + 0.1 * Math.sin(t * 4);
  c.save(); c.translate(cx - 110, cy - 95); c.scale(b, b);
  c.fillStyle = C.orange; c.beginPath(); c.arc(0, 0, 38, 0, TAU); c.fill();
  setFont(c, 50, 800, EN); c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('?', 0, 3);
  c.restore();
}
function avatar(c, x, y, t, shirt, item, hit, s) {
  if (s <= 0) return;
  c.save(); c.translate(x, y + (1 - clamp(s, 0, 1)) * 80); c.globalAlpha = clamp(s * 2);
  c.fillStyle = shirt; c.beginPath(); c.ellipse(0, 70, 62, 44, 0, Math.PI, 0); c.fill(); c.fillRect(-62, 70, 124, 30);
  face(c, 0, 0, 44, t, 'calm');
  // item bubble above
  c.translate(0, -88);
  c.fillStyle = hit ? C.orange : C.tealDeep; c.beginPath(); c.arc(0, 0, 34, 0, TAU); c.fill();
  c.fillStyle = '#ffffff'; c.strokeStyle = '#ffffff'; c.lineWidth = 5; c.lineCap = 'round';
  if (item === 'cup') { rrect(c, -13, -12, 22, 26, 5); c.fill(); c.beginPath(); c.arc(12, 0, 7, -1.4, 1.4); c.stroke(); }
  if (item === 'bread') { rrect(c, -16, -12, 32, 26, 9); c.fill(); }
  if (item === 'milk') { rrect(c, -11, -8, 22, 24, 3); c.fill(); c.beginPath(); c.moveTo(-11, -8); c.lineTo(0, -18); c.lineTo(11, -8); c.fill(); }
  c.restore();
  // reaction badge
  c.save(); c.translate(x + 30, y - 120 + (1 - clamp(s, 0, 1)) * 80); c.globalAlpha = clamp(s * 2);
  c.fillStyle = hit ? '#ffffff' : '#ffffff'; c.beginPath(); c.arc(0, 0, 15, 0, TAU); c.fill();
  setFont(c, 22, 800, EN); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = hit ? C.orange : C.tealDeep;
  c.fillText(hit ? '!' : '✓', 0, 1);
  c.restore();
}
function scene3(c, t) {
  const tin = SC[2], out = easeIn(prog(t, SC[3] - 0.4, SC[3] + 0.1));
  if (out >= 1) return;
  // enters from the left (forward motion in RTL reading)
  const slide = (1 - easeOut(prog(t, tin, tin + 0.6))) * -700;
  c.save(); c.translate(slide, 0);
  riseText(c, 'التوتر والأكل', 540, 285, t, tin + 0.25, SC[3] - 0.4, { size: 96, colors: { 0: C.white, 1: C.white } });
  riseText(c, 'ممكن يزودوا الأعراض', 540, 395, t, tin + 0.45, SC[3] - 0.4, { size: 56, color: C.teal });
  const s1 = spring(t, at('الأعراض ممكن تزيد', 0.9), 10, 0.7), s2 = spring(t, at('أو مع أكلات', 0.1), 10, 0.7);
  if (s1 > 0) { const done = tile(c, 560, 490, 430, 440, s1, out); stressIllo(c, 215, 240, t); done(); }
  if (s2 > 0) { const done = tile(c, 90, 490, 430, 440, s2, out); foodIllo(c, 215, 220, t); done(); }
  c.save(); c.globalAlpha = 1 - out;
  riseText(c, 'وكل شخص ليه محفزات مختلفة', 540, 1030, t, at('بتختلف', -0.1), SC[3] - 0.4, { size: 46, weight: 700 });
  const ta = at('بتختلف', 0.15);
  avatar(c, 820, 1210, t, '#2f8bff', 'cup', true, spring(t, ta, 11, 0.7));
  avatar(c, 600, 1210, t, '#2fd0c0', 'bread', false, spring(t, ta + 0.15, 11, 0.7));
  avatar(c, 380, 1210, t, '#ff8a3d', 'milk', true, spring(t, ta + 0.3, 11, 0.7));
  c.restore();
  c.restore();
}

// what helps: four animated tips
function tipIcon(c, kind, cx, cy, t, lt) {
  c.save(); c.translate(cx, cy);
  if (kind === 'diary') {
    c.rotate(-0.06);
    c.fillStyle = '#ffffff'; rrect(c, -78, -92, 156, 184, 16); c.fill();
    c.fillStyle = C.blue; rrect(c, -78, -92, 26, 184, 10); c.fill();
    for (let k = 0; k < 4; k++) {
      const w = 96 * clamp(lt * 1.4 - k * 0.45);
      c.fillStyle = '#c3d3e2'; rrect(c, -40, -56 + k * 34, w, 10, 5); c.fill();
    }
    const k = Math.min(3, Math.floor(clamp(lt * 1.4) / 0.45 * 0 + clamp(lt * 1.4 / 0.45, 0, 3.99)));
    const px = -40 + 96 * clamp(lt * 1.4 - k * 0.45), py = -56 + k * 34;
    c.save(); c.translate(px + 8, py - 30); c.rotate(0.6);
    c.fillStyle = C.orange; rrect(c, -8, -50, 16, 70, 6); c.fill(); c.fillStyle = '#ffd9b8';
    c.beginPath(); c.moveTo(-8, 20); c.lineTo(8, 20); c.lineTo(0, 36); c.fill(); c.restore();
  }
  if (kind === 'clock') {
    c.fillStyle = '#ffffff'; c.beginPath(); c.arc(0, 0, 88, 0, TAU); c.fill();
    c.strokeStyle = C.blue; c.lineWidth = 10; c.stroke();
    c.fillStyle = '#9fb3c6'; for (let k = 0; k < 12; k++) { const a = k * TAU / 12; c.beginPath(); c.arc(Math.cos(a) * 66, Math.sin(a) * 66, k % 3 ? 3 : 6, 0, TAU); c.fill(); }
    c.strokeStyle = C.navy; c.lineCap = 'round';
    c.lineWidth = 9; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(t * 0.6 - 1.2) * 38, Math.sin(t * 0.6 - 1.2) * 38); c.stroke();
    c.lineWidth = 6; c.strokeStyle = C.orange; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(t * 4) * 58, Math.sin(t * 4) * 58); c.stroke();
    c.fillStyle = C.navy; c.beginPath(); c.arc(0, 0, 8, 0, TAU); c.fill();
  }
  if (kind === 'water') {
    const lvl = clamp(lt * 0.9);
    c.save(); c.beginPath(); c.moveTo(-62, -90); c.lineTo(62, -90); c.lineTo(48, 92); c.lineTo(-48, 92); c.closePath();
    c.fillStyle = 'rgba(255,255,255,0.18)'; c.fill(); c.clip();
    const top = lerp(92, -55, lvl);
    const wg = c.createLinearGradient(0, top, 0, 92); wg.addColorStop(0, '#6fe3ff'); wg.addColorStop(1, '#2f8bff');
    c.fillStyle = wg; c.beginPath(); c.moveTo(-70, 100);
    for (let x = -70; x <= 70; x += 10) c.lineTo(x, top + Math.sin(x / 14 + t * 5) * 5);
    c.lineTo(70, 100); c.closePath(); c.fill();
    const r = rng(3);
    for (let i = 0; i < 8; i++) { const ph = (t * 0.7 + r()) % 1, x = (r() - 0.5) * 80, y = lerp(85, top + 10, ph);
      if (y > top) { c.fillStyle = 'rgba(255,255,255,0.7)'; c.beginPath(); c.arc(x, y, 3 + r() * 4, 0, TAU); c.fill(); } }
    c.restore();
    c.strokeStyle = '#ffffff'; c.lineWidth = 7; c.lineJoin = 'round';
    c.beginPath(); c.moveTo(-62, -90); c.lineTo(-48, 92); c.lineTo(48, 92); c.lineTo(62, -90); c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.5)'; c.fillRect(-44, -70, 10, 130);
  }
  if (kind === 'walk') {
    const ph = t * 5.5;
    c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 5; c.setLineDash([24, 18]); c.lineDashOffset = t * 120;
    c.beginPath(); c.moveTo(-110, 96); c.lineTo(110, 96); c.stroke(); c.setLineDash([]);
    const bob = Math.abs(Math.sin(ph)) * -6;
    c.translate(0, bob);
    const limb = (x, y, a1, a2, l, col) => {
      c.strokeStyle = col; c.lineWidth = 16; c.lineCap = 'round';
      const kx = x + Math.sin(a1) * l, ky = y + Math.cos(a1) * l;
      c.beginPath(); c.moveTo(x, y); c.lineTo(kx, ky); c.lineTo(kx + Math.sin(a1 + a2) * l, ky + Math.cos(a1 + a2) * l); c.stroke();
    };
    limb(0, 22, Math.sin(ph) * 0.6, -Math.max(0, Math.sin(ph)) * 0.8, 36, '#1d5fb8');
    limb(-4, -48, -Math.sin(ph) * 0.7, 0.5, 30, '#e9a985');
    c.strokeStyle = C.teal; c.lineWidth = 34; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, -50); c.lineTo(0, 18); c.stroke();
    limb(0, 22, -Math.sin(ph) * 0.6, -Math.max(0, -Math.sin(ph)) * 0.8, 36, '#2f8bff');
    limb(4, -48, Math.sin(ph) * 0.7, 0.5, 30, '#ffc9a3');
    face(c, 0, -88, 28, t, 'calm');
  }
  c.restore();
}
function scene4(c, t) {
  const tin = SC[3], out = easeIn(prog(t, SC[4] - 0.35, SC[4] + 0.2));
  if (t < tin - 0.1 || out >= 1) return;
  c.save(); c.globalAlpha = 1 - out;
  popText(c, 'طب نعمل إيه؟', 540, 300, t, at('طب نعمل', -0.05), SC[4] - 0.35, { size: 100 });
  const late = easeInOut(prog(t, at('ولو الأعراض', -0.3), at('ولو الأعراض', 0.3)));
  const tips = [
    ['diary', 'راقب الأكل اللي بيتعبك', 560, 450, at('حاول تلاحظ', 0.05)],
    ['clock', 'نظّم مواعيد أكلك', 90, 450, at('ونظّم', 0.05)],
    ['water', 'اشرب مياه كفاية', 560, 820, at('واشرب', 0.05)],
    ['walk', 'اتحرك بانتظام', 90, 820, at('واتحرك', 0.05)],
  ];
  for (const [kind, label, x, y, ts] of tips) {
    const s = spring(t, ts, 10, 0.68);
    if (s <= 0) continue;
    c.save(); c.translate(0, -late * 40);
    const done = tile(c, x, y, 430, 340, s, 0);
    tipIcon(c, kind, 215, 135, t, t - ts);
    c.direction = 'rtl'; setFont(c, 36, 800); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = C.white;
    c.fillText(label, 215, 292);
    done(); c.restore();
  }
  pill(c, t, 'الأعراض مستمرة؟ راجع دكتور', 1000, 1335, at('ولو الأعراض', 0.25), SC[4] - 0.35, { icon: '+', iconBg: C.tealDeep, size: 40 });
  c.restore();
}

// warning (drawn over the doctor)
function alertIcon(c, x, y, t, s) {
  if (s <= 0) return;
  c.save(); c.translate(x, y); c.scale(clamp(s, 0, 1.3), clamp(s, 0, 1.3));
  for (const k of [0, 1]) {
    const ph = ((t - k * 0.6) * 0.8) % 1;
    c.strokeStyle = rgba(C.orange, 0.5 * (1 - ph)); c.lineWidth = 6; c.beginPath(); c.arc(0, 4, 70 + ph * 70, 0, TAU); c.stroke();
  }
  c.shadowColor = 'rgba(0,0,0,0.4)'; c.shadowBlur = 20;
  c.fillStyle = C.orange; c.lineJoin = 'round'; c.lineWidth = 24; c.strokeStyle = C.orange;
  c.beginPath(); c.moveTo(0, -58); c.lineTo(62, 50); c.lineTo(-62, 50); c.closePath(); c.fill(); c.stroke();
  c.shadowColor = 'transparent';
  c.fillStyle = '#ffffff'; rrect(c, -8, -30, 16, 52, 8); c.fill(); c.beginPath(); c.arc(0, 40, 9, 0, TAU); c.fill();
  c.restore();
}
function floor(c, from = 860, a = 0.92) {
  const fl = c.createLinearGradient(0, from, 0, from + 640);
  fl.addColorStop(0, 'rgba(4,16,36,0)'); fl.addColorStop(0.5, `rgba(4,16,36,${a * 0.8})`); fl.addColorStop(1, `rgba(4,16,36,${a})`);
  c.fillStyle = fl; c.fillRect(0, from, W, H - from);
}
function scene5(c, t) {
  const tin = SC[4], out = SC[5] - 0.3;
  if (t < tin - 0.1 || t > out + 0.4) return;
  alertIcon(c, 845, 600, t, spring(t, at('بس خلي', 0.05), 11, 0.55) * (1 - easeIn(prog(t, out, out + 0.3))));
  riseText(c, 'الأعراض المقلقة', 540, 1110, t, at('مش كل وجع', 0.1), out, { size: 84, color: C.orangeSoft });
  riseText(c, 'محتاجة تقييم طبي', 540, 1210, t, at('مش كل وجع', 0.35), out, { size: 64 });
  pill(c, t, 'دم في البراز', 1000, 1335, at('خصوصًا', 0.75), out, { icon: '!', size: 42, stroke: C.orange });
  pill(c, t, 'نزول وزن من غير سبب', 1000, 1440, at('أو نزول', 0.05), out, { icon: '!', size: 42, stroke: C.orange });
}
function scene6(c, t) {
  const tin = SC[5];
  if (t < tin) return;
  // light sweep over the hero
  const sw = prog(t, tin, tin + 1.8);
  if (sw > 0 && sw < 1) {
    c.save(); c.globalCompositeOperation = 'soft-light';
    const x = lerp(-400, 1500, easeInOut(sw)), g = c.createLinearGradient(x - 260, 0, x + 260, 400);
    g.addColorStop(0, 'rgba(47,208,192,0)'); g.addColorStop(0.5, 'rgba(140,255,240,0.7)'); g.addColorStop(1, 'rgba(47,208,192,0)');
    c.fillStyle = g; c.fillRect(0, 0, W, H); c.restore();
  }
  const T2 = at('لو الأعراض بتتكرر', 0.2);
  pill(c, t, 'متشخّصش نفسك بنفسك', 0, 1180, at('متشخّصش', 0.05), T2, { center: true, stroke: C.orange, size: 50, icon: '!' });
  const es = spring(t, T2 + 0.3, 11, 0.62);
  if (MARK && es > 0) {
    const sz = 140 * clamp(es, 0, 1.2);
    c.save(); c.shadowColor = 'rgba(0,0,0,0.45)'; c.shadowBlur = 24; c.drawImage(MARK, 540 - sz / 2, 860 - sz / 2, sz, sz); c.restore();
  }
  if (CONFIG.doctorName) {
    riseText(c, CONFIG.doctorName, 540, 995, t, T2 + 0.45, null, { size: 74, stagger: 0.08 });
    const tp = easeOut(prog(t, T2 + 0.8, T2 + 1.2));
    if (tp > 0) { c.fillStyle = C.teal; c.fillRect(540 - 60 * tp, 1048, 120 * tp, 4); }
    if (CONFIG.doctorTitle) riseText(c, CONFIG.doctorTitle, 540, 1095, t, T2 + 0.85, null, { size: 37, weight: 600, color: C.teal, stagger: 0.04 });
  } else {
    // editable placeholder plate (fill CONFIG in config.js)
    const ps = spring(t, T2 + 0.45, 12, 0.85);
    if (ps > 0) {
      c.save(); c.globalAlpha = clamp(ps); c.setLineDash([10, 10]); c.strokeStyle = 'rgba(200,225,240,0.6)'; c.lineWidth = 2;
      rrect(c, 290, 950, 500, 110, 20); c.stroke(); c.setLineDash([]);
      c.direction = 'rtl'; setFont(c, 36, 600); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = 'rgba(200,225,240,0.8)';
      c.fillText('اسم الدكتور  •  التخصص', 540, 1006); c.restore();
    }
  }
  riseText(c, 'صحتك تبدأ بالمعلومة الصح', 540, 1205, t, at('علشان تعرف', 0.1), null, { size: 66, colors: { 3: C.teal } });
  const ps = spring(t, at('تابعنا', 0.0), 12, 0.75);
  if (ps > 0) {
    c.save(); c.direction = 'rtl'; setFont(c, 46, 800); c.textAlign = 'center'; c.textBaseline = 'middle';
    const tw = c.measureText('تابعنا لمعلومات طبية أكتر').width + 110, ww = tw * clamp(ps, 0, 1.05);
    rrect(c, 540 - ww / 2, 1270, ww, 92, 46); c.fillStyle = C.teal; c.fill(); c.clip();
    c.fillStyle = '#04202a'; c.fillText('تابعنا لمعلومات طبية أكتر', 540, 1318 + (1 - ps) * 60); c.restore();
  }
  const fp = spring(t, at('تابعنا', 0.6), 12, 0.85);
  if (fp > 0) {
    c.save(); c.globalAlpha = clamp(fp); c.translate(0, (1 - fp) * 30);
    const handle = CONFIG.doctorHandle || '@الحساب';
    c.direction = 'ltr'; setFont(c, 38, 700, EN); c.textBaseline = 'middle';
    const hw = c.measureText(handle).width, x0 = 540 - (70 + hw) / 2, y = 1430;
    c.fillStyle = '#1877f2'; c.beginPath(); c.arc(x0 + 26, y, 26, 0, TAU); c.fill();
    c.fillStyle = '#ffffff'; c.textAlign = 'center'; setFont(c, 40, 700, EN); c.fillText('f', x0 + 28, y + 4);
    setFont(c, 38, 700, EN); c.textAlign = 'left'; c.fillStyle = C.white; c.fillText(handle, x0 + 70, y + 1);
    c.restore();
  }
}

// ------------------------------------------------------------ brand watermark + captions
function watermark(c, t, hero) {
  const a = 1 - easeInOut(prog(t, at('لو الأعراض بتتكرر', 0), at('لو الأعراض بتتكرر', 0.5)));
  if (!MARK || a <= 0) return;
  c.save(); c.globalAlpha = a * 0.95;
  c.direction = 'rtl'; setFont(c, 34, 800); c.textBaseline = 'middle'; c.textAlign = 'right';
  const name = CONFIG.logoName || CONFIG.doctorName || '';
  const tw = c.measureText(name).width, ms = 64, gap = 14, total = ms + gap + tw;
  const right = lerp(540 + total / 2, 1010, hero), y = lerp(150, 140, hero);
  c.shadowColor = 'rgba(0,0,0,0.4)'; c.shadowBlur = 12;
  c.drawImage(MARK, right - ms, y - ms / 2, ms, ms);
  c.fillStyle = C.white; c.fillText(name, right - ms - gap, y + 2);
  c.restore();
}
function captions(c, T) {
  if (NOSUBS) return;
  const cap = TL.captions.find(([a, b]) => T >= a && T < b);
  if (!cap) return;
  const s = spring(T, cap[0], 22, 0.85);
  c.save(); c.direction = 'rtl'; setFont(c, 46, 700); c.textAlign = 'center'; c.textBaseline = 'middle';
  const w = c.measureText(cap[2]).width + 64, y = 1560 + (1 - s) * 18;
  rrect(c, 540 - w / 2, y - 40, w, 80, 22); c.fillStyle = 'rgba(2,10,26,0.66)'; c.fill();
  c.fillStyle = '#ffffff'; c.fillText(cap[2], 540, y + 2); c.restore();
}

// ------------------------------------------------------------ compositor
function seek(T) {
  const t = clamp(T, 0, TL.duration);
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
  const d = doctorState(t), hero = 1 - easeInOut(d.p);
  const warn = easeInOut(prog(t, SC[4] - 0.2, SC[4] + 0.6)) * (1 - easeInOut(prog(t, SC[5] - 0.2, SC[5] + 0.8)));
  background(ctx, t, { warn, teal: 1 });
  // gut + scene content under the doctor
  gut(ctx, t, gutState(t));
  if (t < SC[1] + 0.2) scene1Gut(ctx, t);
  if (t >= SC[1] - 0.1 && t < SC[2] + 0.2) scene2(ctx, t);
  if (t >= SC[2] - 0.1 && t < SC[3] + 0.3) scene3(ctx, t);
  if (t >= SC[3] - 0.1 && t < SC[4] + 0.3) scene4(ctx, t);
  // doctor: hero framing gets a dark floor for the typography over it
  doctor(ctx, t, d.p, d.bx, d.by, d.br, d.push, talkLevel(T));
  if (hero > 0.01) { ctx.save(); ctx.globalAlpha = hero; floor(ctx, t > SC[4] ? 760 : 900, 0.9); ctx.restore(); }
  if (t < at('طب ممكن', 0.6)) scene1(ctx, t);
  scene5(ctx, t);
  scene6(ctx, t);
  finish(ctx, t);
  watermark(ctx, t, hero);
  captions(ctx, T);
}

function loadImg(src) { return new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; }); }
window.seek = seek;
window.ready = (async () => {
  TL = await (await fetch('timing.json')).json(); SC = TL.scenes;
  try { ENV = await (await fetch('vo_env.json')).json(); } catch (e) { ENV = null; }
  window.DURATION = TL.duration;
  const fams = ['800 64px Cairo', '700 64px Cairo', '600 64px Cairo', "500 64px 'Noto Kufi Arabic'", '500 64px Inter', '700 64px Inter'];
  await Promise.all(fams.map((f) => document.fonts.load(f, 'القولون العصبي IBS ?!✓⇄')));
  [DOC, MARK] = await Promise.all([loadImg(CONFIG.doctorCutout), loadImg(CONFIG.logoMark)]);
  window.HAS_DOCTOR = !!DOC;
  seek(0);
  return true;
})();

if (!RENDER) {
  document.body.classList.add('preview');
  const bar = Object.assign(document.createElement('input'), { type: 'range', min: 0, max: 60, step: 0.01, value: 0, id: 'bar' });
  const lab = document.createElement('div'); document.body.append(bar, lab);
  let playing = true, t0 = performance.now(), base = 0;
  bar.oninput = () => { base = +bar.value; t0 = performance.now(); seek(base); };
  addEventListener('keydown', (e) => { if (e.code === 'Space') { playing = !playing; base = +bar.value; t0 = performance.now(); } });
  window.ready.then(() => {
    bar.max = window.DURATION;
    const loop = () => {
      if (playing) { const t = (base + (performance.now() - t0) / 1000) % window.DURATION; bar.value = t; seek(t); }
      lab.textContent = `${(+bar.value).toFixed(2)}s  (space = play/pause)`; requestAnimationFrame(loop);
    };
    loop();
  });
}
