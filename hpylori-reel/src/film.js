// H. pylori — Egyptian Arabic medical reel. 1080x1920, pure function of time.
import { clamp, lerp, prog, easeOut, easeIn, easeInOut, expoOut, spring, track, rng } from './motion.js';
import { CONFIG, DURATION, SCENES, CAPTIONS } from './script.js';

const W = 1080, H = 1920;
const cv = document.getElementById('c');
const ctx = cv.getContext('2d');
const RENDER = new URLSearchParams(location.search).has('render');
const NOSUBS = new URLSearchParams(location.search).has('nosubs');

const C = {
  navy0: '#030a16', navy1: '#071a33', navy2: '#0d2c52',
  teal: '#2fd0c0', tealDeep: '#0f8f86', white: '#f3f8fb', muted: '#93a9c2',
  red: '#e5484d', redDeep: '#8f1a2b',
};
const AR = "'Cairo', 'Noto Kufi Arabic', sans-serif";
const EN = "'Inter', sans-serif";
const TAU = Math.PI * 2;

// ---------------------------------------------------------------- utilities
function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
const rgba = (hex, a) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
};
function rrect(c, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  c.beginPath();
  c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}
function softSprite(color, size = 256) {
  const s = mk(size, size), g = s.getContext('2d');
  const gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gr.addColorStop(0, rgba(color, 1)); gr.addColorStop(0.35, rgba(color, 0.45)); gr.addColorStop(1, rgba(color, 0));
  g.fillStyle = gr; g.fillRect(0, 0, size, size);
  return s;
}
function glow(c, spr, x, y, r, a) {
  if (a <= 0 || r <= 0) return;
  c.save(); c.globalAlpha = a; c.drawImage(spr, x - r, y - r, r * 2, r * 2); c.restore();
}

// ---------------------------------------------------------------- typography
function setFont(c, size, weight = 800, fam = AR) { c.font = `${weight} ${size}px ${fam}`; }

// Word-by-word masked rise, laid out right-to-left so Arabic shaping stays intact.
// colors: optional map {wordIndex: color}
function riseText(c, str, x, y, t, tin, tout, o = {}) {
  const size = o.size || 72, weight = o.weight || 800, fam = o.fam || AR;
  const align = o.align || 'center', stagger = o.stagger ?? 0.06;
  if (t < tin) return;
  c.save();
  c.direction = 'rtl'; setFont(c, size, weight, fam); c.textBaseline = 'middle'; c.textAlign = 'right';
  const words = str.split(' ');
  const ws = words.map((w) => c.measureText(w).width);
  const sp = c.measureText(' ').width;
  const total = ws.reduce((a, b) => a + b, 0) + sp * (words.length - 1);
  let xr = align === 'center' ? x + total / 2 : align === 'right' ? x : x + total;
  const out = tout != null ? easeIn(prog(t, tout, tout + 0.35)) : 0;
  if (out >= 1) { c.restore(); return; }
  c.beginPath(); c.rect(xr - total - 40, y - size * 1.05, total + 80, size * 1.75); c.clip();
  words.forEach((w, i) => {
    const s = spring(t, tin + i * stagger, 15, 0.72);
    const dy = (1 - s) * size * 1.1 - out * size * 1.4;
    c.fillStyle = (o.colors && o.colors[i]) || o.color || C.white;
    c.fillText(w, xr, y + dy);
    xr -= ws[i] + sp;
  });
  c.restore();
  return total;
}

// Right-to-left wipe with a leading teal edge.
function wipeText(c, str, x, y, t, tin, tout, o = {}) {
  const size = o.size || 80, weight = o.weight || 800, fam = o.fam || AR, dur = o.dur || 0.55;
  if (t < tin) return;
  c.save();
  c.direction = o.ltr ? 'ltr' : 'rtl'; setFont(c, size, weight, fam);
  c.textBaseline = 'middle'; c.textAlign = 'center';
  const total = c.measureText(str).width;
  const p = easeInOut(prog(t, tin, tin + dur));
  const out = tout != null ? easeIn(prog(t, tout, tout + 0.35)) : 0;
  if (out >= 1) { c.restore(); return; }
  const right = x + total / 2 + 20, left = x - total / 2 - 20;
  const edge = lerp(right, left, p);
  c.save();
  c.beginPath(); c.rect(edge, y - size, right - edge + 4, size * 2); c.clip();
  c.fillStyle = o.color || C.white;
  c.fillText(str, x, y - out * size * 1.4);
  c.restore();
  if (p < 1 && p > 0) {
    c.fillStyle = C.teal;
    c.fillRect(edge - 3, y - size * 0.62, 5, size * 1.24);
  }
  c.restore();
}

// ---------------------------------------------------------------- precomputed layers
const R = rng(20241012);
const particles = Array.from({ length: 150 }, () => ({
  x: R() * W, y: R() * H, z: 0.25 + R() * 0.75, r: 1 + R() * 2.6, ph: R() * TAU, vy: -6 - R() * 16, vx: -4 + R() * 8,
}));
const bokeh = Array.from({ length: 14 }, () => ({
  x: R() * W, y: R() * H, r: 60 + R() * 140, ph: R() * TAU, a: 0.04 + R() * 0.07, teal: R() > 0.3,
}));
const sprTeal = softSprite(C.teal), sprRed = softSprite(C.red), sprWhite = softSprite('#ffffff');
const grain = Array.from({ length: 6 }, (_, k) => {
  const s = mk(256, 256), g = s.getContext('2d'), id = g.createImageData(256, 256), rr = rng(99 + k);
  for (let i = 0; i < id.data.length; i += 4) { const v = rr() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; }
  g.putImageData(id, 0, 0); return s;
});

// Stomach geometry (local units, origin near the body centre).
const STOMACH = new Path2D(`
  M -72 -480 L -62 -330
  C -50 -200 10 -40 -60 60
  C -110 120 -200 120 -270 112
  L -330 106 C -380 106 -402 140 -406 200 L -410 330 L -344 330 L -342 215
  C -340 186 -322 176 -292 180
  C -230 262 -60 352 90 302
  C 250 242 335 60 312 -150
  C 296 -330 200 -452 80 -422
  C 30 -410 8 -385 -2 -350 L -5 -480 Z`);
const SO = { w: 1100, h: 1200, ox: 560, oy: 640 }; // sprite size + origin
const stomachSprite = (() => {
  const s = mk(SO.w, SO.h), g = s.getContext('2d');
  g.translate(SO.ox, SO.oy);
  const base = g.createRadialGradient(140, -170, 20, 40, -40, 640);
  base.addColorStop(0, '#ff9c8f'); base.addColorStop(0.3, '#e65a62'); base.addColorStop(0.62, '#a8243f'); base.addColorStop(1, '#4b0a20');
  g.fillStyle = base; g.fill(STOMACH);
  g.save(); g.clip(STOMACH);
  // mucosal vessels
  const rv = rng(7);
  for (let k = 0; k < 90; k++) {
    let x = -420 + rv() * 760, y = -560 + rv() * 900, a = rv() * TAU;
    const dark = rv() > 0.5;
    g.strokeStyle = dark ? 'rgba(90,0,25,0.28)' : 'rgba(255,200,190,0.16)';
    g.lineWidth = 0.8 + rv() * 2.2; g.beginPath(); g.moveTo(x, y);
    for (let i = 0; i < 14; i++) { a += (rv() - 0.5) * 1.1; x += Math.cos(a) * 14; y += Math.sin(a) * 14; g.lineTo(x, y); }
    g.stroke();
  }
  // rugae: folds running along the body towards the antrum (drawn on a layer, feathered out at the ends)
  const outer = g; { const L = mk(SO.w, SO.h); const g = L.getContext('2d'); g.translate(SO.ox, SO.oy);
  const P0 = [175, -330], P1 = [270, 300], P2 = [-290, 150];
  const qb = (u) => [
    (1 - u) * (1 - u) * P0[0] + 2 * (1 - u) * u * P1[0] + u * u * P2[0],
    (1 - u) * (1 - u) * P0[1] + 2 * (1 - u) * u * P1[1] + u * u * P2[1]];
  for (let k = -4; k <= 4; k++) {
    for (const pass of [0, 1]) {
      g.beginPath();
      for (let i = 0; i <= 60; i++) {
        const u = i / 60, [x, y] = qb(u), [x2, y2] = qb(Math.min(1, u + 0.01));
        let nx = -(y2 - y), ny = x2 - x; const L = Math.hypot(nx, ny) || 1; nx /= L; ny /= L;
        const off = k * 38 * (0.55 + 0.45 * Math.sin(Math.PI * u)) + Math.sin(u * 22 + k) * 7;
        const px = x + nx * off + (pass ? -3 : 0), py = y + ny * off + (pass ? -4 : 0);
        i ? g.lineTo(px, py) : g.moveTo(px, py);
      }
      g.strokeStyle = pass ? 'rgba(255,205,195,0.22)' : 'rgba(70,0,20,0.38)';
      g.lineWidth = pass ? 3 : 11; g.filter = pass ? 'blur(1px)' : 'blur(3px)'; g.stroke(); g.filter = 'none';
    }
  }
  g.globalCompositeOperation = 'destination-in';
  const m = g.createRadialGradient(80, 20, 120, 80, 20, 420);
  m.addColorStop(0, 'rgba(0,0,0,1)'); m.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = m; g.fillRect(-SO.ox, -SO.oy, SO.w, SO.h);
  outer.drawImage(L, -SO.ox, -SO.oy); }
  // inner shadow for volume
  g.filter = 'blur(30px)'; g.lineWidth = 90; g.strokeStyle = 'rgba(25,0,12,0.7)'; g.stroke(STOMACH); g.filter = 'none';
  // specular
  const sp = g.createRadialGradient(215, -300, 0, 215, -300, 150);
  sp.addColorStop(0, 'rgba(255,240,235,0.45)'); sp.addColorStop(1, 'rgba(255,240,235,0)');
  g.fillStyle = sp; g.fillRect(-500, -600, 1000, 1000);
  const sp2 = g.createRadialGradient(40, 200, 0, 40, 200, 170);
  sp2.addColorStop(0, 'rgba(255,220,210,0.18)'); sp2.addColorStop(1, 'rgba(255,220,210,0)');
  g.fillStyle = sp2; g.fillRect(-500, -600, 1000, 1000);
  g.restore();
  // teal rim light
  g.lineWidth = 3; g.strokeStyle = 'rgba(120,240,228,0.55)'; g.stroke(STOMACH);
  // feather the cut ends of the oesophagus and duodenum
  g.globalCompositeOperation = 'destination-out';
  const fe = g.createLinearGradient(0, -490, 0, -390);
  fe.addColorStop(0, 'rgba(0,0,0,1)'); fe.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = fe; g.fillRect(-200, -500, 300, 110);
  const fd = g.createLinearGradient(0, 340, 0, 250);
  fd.addColorStop(0, 'rgba(0,0,0,1)'); fd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = fd; g.fillRect(-430, 250, 110, 100);
  g.globalCompositeOperation = 'source-over';
  return s;
})();

// Gastric epithelium (cross-section) for scene 2.
const surfY = (x) => 1190 + 34 * Math.sin(x / 165) + 16 * Math.sin(x / 61 + 1.3);
function drawCells(g, yOff, scaleH, dark, seed) {
  const r = rng(seed);
  for (let x = -140; x < 1260; x += 92) {
    const w = 86 + r() * 6, x0 = x + 3, x1 = x + w - 3;
    const top0 = surfY(x0) + yOff, top1 = surfY(x1) + yOff, bot = 1960;
    g.beginPath();
    g.moveTo(x0 + 6, top0 + 10);
    g.quadraticCurveTo(x0, top0 - 4, (x0 + x1) / 2, Math.min(top0, top1) - 10);
    g.quadraticCurveTo(x1, top1 - 4, x1 - 6, top1 + 10);
    g.lineTo(x1 - 2, bot); g.lineTo(x0 + 2, bot); g.closePath();
    const gr = g.createLinearGradient(0, top0, 0, top0 + 520 * scaleH);
    gr.addColorStop(0, dark ? '#9a3a58' : '#f39aa0'); gr.addColorStop(0.5, dark ? '#6a2142' : '#d0566d'); gr.addColorStop(1, dark ? '#3a0f2a' : '#8b2448');
    g.fillStyle = gr; g.fill();
    g.strokeStyle = dark ? 'rgba(255,190,200,0.12)' : 'rgba(255,215,220,0.4)'; g.lineWidth = 2; g.stroke();
    // nucleus
    const ny = top0 + (300 + r() * 50) * scaleH, nx = (x0 + x1) / 2 + (r() - 0.5) * 10;
    const ng = g.createRadialGradient(nx - 8, ny - 12, 2, nx, ny, 34);
    ng.addColorStop(0, dark ? '#7a5296' : '#b48ad0'); ng.addColorStop(1, dark ? '#2c1640' : '#4c2468');
    g.fillStyle = ng; g.beginPath(); g.ellipse(nx, ny, 24, 38 * scaleH, 0, 0, TAU); g.fill();
    // mucin granules near the apex
    for (let i = 0; i < 7; i++) {
      g.fillStyle = dark ? 'rgba(255,220,230,0.08)' : 'rgba(255,235,240,0.32)';
      g.beginPath(); g.arc(x0 + 14 + r() * (w - 30), top0 + 28 + r() * 80 * scaleH, 3 + r() * 5, 0, TAU); g.fill();
    }
  }
}
const mucosaSprite = (() => {
  const s = mk(W, H), g = s.getContext('2d');
  g.filter = 'blur(7px)'; drawCells(g, -70, 0.85, true, 3); g.filter = 'none';
  drawCells(g, 0, 1, false, 5);
  const d = g.createLinearGradient(0, 1380, 0, 1920);
  d.addColorStop(0, 'rgba(20,4,18,0)'); d.addColorStop(1, 'rgba(20,4,18,0.78)');
  g.fillStyle = d; g.fillRect(0, 1380, W, 540);
  return s;
})();

// ---------------------------------------------------------------- H. pylori
// Helical rod with a tuft of unipolar sheathed flagella.
function hp(c, x, y, ang, len, th, ph, a = 1) {
  if (a <= 0) return;
  c.save(); c.translate(x, y); c.rotate(ang); c.globalAlpha *= a;
  const N = 28, turns = 1.5, A = th * 0.42, top = [], bot = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N, px = (u - 0.5) * len, arg = u * turns * TAU + ph;
    const py = A * Math.sin(arg), d = (A * turns * TAU / len) * Math.cos(arg);
    const L = Math.hypot(d, 1), nx = -d / L, ny = 1 / L;
    const hw = (th / 2) * Math.pow(Math.sin(Math.PI * clamp(u, 0.001, 0.999)), 0.32);
    top.push([px + nx * hw, py + ny * hw]); bot.push([px - nx * hw, py - ny * hw]);
  }
  // flagella from the trailing pole
  const tail = [(-0.5) * len, A * Math.sin(ph)];
  c.lineCap = 'round';
  for (let f = 0; f < 5; f++) {
    const spread = (f - 2) * 0.2, fl = len * (0.62 + 0.08 * Math.sin(f * 2.1));
    c.beginPath();
    for (let i = 0; i <= 22; i++) {
      const s = i / 22, ax = -s * fl, wav = Math.sin(s * 9 - ph * 2.4 + f) * th * 0.3 * s;
      const rx = ax * Math.cos(spread) - wav * Math.sin(spread), ry = ax * Math.sin(spread) + wav * Math.cos(spread);
      i ? c.lineTo(tail[0] + rx, tail[1] + ry) : c.moveTo(tail[0] + rx, tail[1] + ry);
    }
    c.strokeStyle = 'rgba(175,245,230,0.7)'; c.lineWidth = Math.max(1.2, th * 0.08); c.stroke();
  }
  c.beginPath();
  top.forEach(([px, py], i) => (i ? c.lineTo(px, py) : c.moveTo(px, py)));
  for (let i = bot.length - 1; i >= 0; i--) c.lineTo(bot[i][0], bot[i][1]);
  c.closePath();
  const gr = c.createLinearGradient(0, -th, 0, th);
  gr.addColorStop(0, '#9ff2d6'); gr.addColorStop(0.35, '#3fbf9f'); gr.addColorStop(0.75, '#14665f'); gr.addColorStop(1, '#0a3b3a');
  c.fillStyle = gr; c.fill();
  c.strokeStyle = 'rgba(10,40,40,0.55)'; c.lineWidth = Math.max(1, th * 0.05); c.stroke();
  // specular line along the coil
  c.beginPath();
  for (let i = 3; i <= N - 3; i++) {
    const [tx, ty] = top[i], [bx, by] = bot[i];
    const px = lerp(tx, bx, 0.28), py = lerp(ty, by, 0.28);
    i > 3 ? c.lineTo(px, py) : c.moveTo(px, py);
  }
  c.strokeStyle = 'rgba(225,255,245,0.55)'; c.lineWidth = Math.max(1, th * 0.12); c.stroke();
  c.restore();
}

// ---------------------------------------------------------------- shared layers
function background(c, t, redAmt = 0, tealAmt = 1, cy = 820) {
  const g = c.createRadialGradient(540, cy, 60, 540, cy, 1250);
  g.addColorStop(0, C.navy2); g.addColorStop(0.55, C.navy1); g.addColorStop(1, C.navy0);
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  glow(c, sprRed, 540, cy + 80, 900, 0.32 * redAmt);
  glow(c, sprTeal, 860, 260, 700, 0.06 * tealAmt);
}
function dust(c, t, camX = 0, camY = 0, amt = 1) {
  for (const b of bokeh) {
    const x = (b.x + Math.sin(t * 0.2 + b.ph) * 40 - camX * 0.3 + W) % W;
    const y = (b.y + Math.cos(t * 0.15 + b.ph) * 30 - camY * 0.3 + H) % H;
    glow(c, b.teal ? sprTeal : sprWhite, x, y, b.r, b.a * amt);
  }
  for (const p of particles) {
    const x = ((p.x + p.vx * t - camX * p.z) % W + W) % W;
    const y = ((p.y + p.vy * t * p.z - camY * p.z) % H + H) % H;
    const tw = 0.55 + 0.45 * Math.sin(t * 1.7 + p.ph);
    c.fillStyle = `rgba(190,245,240,${0.38 * p.z * tw * amt})`;
    c.beginPath(); c.arc(x, y, p.r * p.z, 0, TAU); c.fill();
  }
}
function finish(c, t) {
  const v = c.createRadialGradient(540, 900, 520, 540, 960, 1250);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,4,12,0.62)');
  c.fillStyle = v; c.fillRect(0, 0, W, H);
  c.save(); c.globalAlpha = 0.045; c.globalCompositeOperation = 'overlay';
  c.fillStyle = c.createPattern(grain[Math.floor(t * 24) % 6], 'repeat'); c.fillRect(0, 0, W, H);
  c.restore();
}

// ---------------------------------------------------------------- scene 1 — hook
const S1_BUGS = [
  [150, -150, 0.6], [60, 60, -0.4], [220, -40, 1.9], [-20, 210, 0.2], [130, 160, 2.6],
  [250, -230, 1.2], [-160, 230, -0.2], [30, -230, 2.2], [200, 90, -1.1],
].map(([x, y, a], i) => ({ x, y, a, i }));
function scene1(c, t) {
  const pulse = 0.5 + 0.5 * Math.sin(t * 5.2);
  background(c, t, 0.75 + 0.25 * pulse, 0.6, 940);
  // camera: punch-in on frame 0, slow push, then zoom-through into the lining
  const s0 = lerp(1.22, 0.92, spring(t, 0, 9, 0.75));
  const push = lerp(0, 0.16, easeInOut(prog(t, 0.6, 6.0)));
  const thru = easeIn(prog(t, 5.95, 6.7));
  const scale = (s0 + push) * (1 + thru * 7);
  const fx = lerp(560, 560 - 150 * 1.1 * thru * 6, thru), fy = lerp(1040, 1040 + 30 * thru * 6, thru);
  dust(c, t, push * 300, -push * 200);
  c.save();
  c.translate(fx, fy); c.scale(scale, scale);
  // subtle 3D turn
  const turn = Math.sin(t * 0.6) * 0.04;
  c.transform(1 - Math.abs(turn), turn * 0.3, 0, 1, 0, 0);
  c.drawImage(stomachSprite, -SO.ox, -SO.oy);
  c.save(); c.clip(STOMACH);
  c.globalCompositeOperation = 'lighter';
  for (const b of S1_BUGS) glow(c, sprRed, b.x, b.y, 70 + 20 * Math.sin(t * 4 + b.i), 0.22 + 0.25 * pulse);
  c.globalCompositeOperation = 'source-over';
  for (const b of S1_BUGS) {
    const appear = spring(t, 0.15 + b.i * 0.12, 12, 0.8);
    const dx = Math.cos(b.a) * t * 6, dy = Math.sin(b.a) * t * 6;
    hp(c, b.x + dx, b.y + dy, b.a + Math.sin(t * 2 + b.i) * 0.15, 62 * appear, 15, t * 9 + b.i, clamp(appear));
  }
  c.restore();
  c.restore();

  // hook typography
  wipeText(c, 'حرقان ووجع في المعدة؟', 540, 330, t, -0.3, 3.3, { size: 92, dur: 0.6 });
  riseText(c, 'ممكن تكون', 540, 265, t, 3.55, 6.0, { size: 62, weight: 600, color: C.white });
  riseText(c, 'جرثومة المعدة!', 540, 400, t, 3.75, 6.0, { size: 108, color: C.teal, stagger: 0.09 });
  return thru;
}

// ---------------------------------------------------------------- scene 2 — bacteria and mucosa
const S2_SWIM = [
  // x0, y0, vx, ang, len, depth
  [140, 960, 18, -0.15, 120, 0.6], [880, 900, -14, 3.0, 110, 0.55], [300, 1060, 10, 0.3, 150, 0.85],
  [990, 1080, -20, 2.7, 140, 0.8], [520, 860, 8, -0.4, 90, 0.4], [760, 1010, -9, 2.9, 130, 0.75],
];
const S2_STUCK = [[230, -1.25], [450, -1.9], [705, -1.35], [905, -1.75]];
function heroPos(lt) {
  const x = lerp(470, 600, easeInOut(prog(lt, 0, 7))), y = lerp(990, 1110, easeInOut(prog(lt, 0, 6.5)));
  return { x, y, ang: lerp(-0.1, 0.55, easeInOut(prog(lt, 0, 6.5))) };
}
function scene2(c, t) {
  const lt = t - 6.5;
  background(c, t, 0.15, 1, 700);
  const cam = lerp(1.6, 1.0, spring(lt, 0, 6, 0.9)) + 0.05 * prog(lt, 0, 7);
  const out = easeIn(prog(t, 13.05, 13.6));
  const scale = cam * (1 - out * 0.55);
  c.save();
  c.translate(540, 1080); c.scale(scale, scale); c.translate(-540 + Math.sin(lt * 0.4) * 10, -1080);
  dust(c, t, 0, 0, 0.8);
  // mucus gel
  const mg = c.createLinearGradient(0, 820, 0, 1220);
  mg.addColorStop(0, 'rgba(90,200,200,0)'); mg.addColorStop(0.5, 'rgba(90,210,205,0.10)'); mg.addColorStop(1, 'rgba(120,230,215,0.22)');
  c.fillStyle = mg; c.fillRect(-200, 820, W + 400, 420);
  for (let k = 0; k < 7; k++) {
    c.beginPath();
    for (let x = -100; x <= W + 100; x += 20) {
      const y = 900 + k * 42 + Math.sin(x / 120 + lt * 0.8 + k) * 14;
      x > -100 ? c.lineTo(x, y) : c.moveTo(x, y);
    }
    c.strokeStyle = 'rgba(160,240,230,0.07)'; c.lineWidth = 2; c.stroke();
  }
  c.drawImage(mucosaSprite, 0, 0);
  // inflammation under attached bacteria
  const inf = easeOut(prog(t, 10.4, 11.6));
  c.save(); c.globalCompositeOperation = 'lighter';
  for (const [x] of S2_STUCK) glow(c, sprRed, x, surfY(x) + 90, 170 + 30 * Math.sin(lt * 3 + x), 0.55 * inf);
  c.restore();
  // attached bacteria
  S2_STUCK.forEach(([x, a], i) => {
    const y = surfY(x) - 52;
    hp(c, x, y, a + Math.PI + Math.sin(lt * 2 + i) * 0.08, 120, 30, lt * 7 + i, clamp(spring(lt, 0.3 + i * 0.15)));
  });
  // swimmers (back to front)
  for (const [x0, y0, vx, ang, len, z] of S2_SWIM) {
    const x = x0 + vx * lt, y = y0 + Math.sin(lt * 1.3 + x0) * 12;
    c.save(); if (z < 0.6) c.filter = 'blur(2px)';
    hp(c, x, y, ang + Math.sin(lt * 1.5 + y0) * 0.12, len, len * 0.24, lt * 9 + x0, 0.5 + 0.5 * z);
    c.restore();
  }
  const h = heroPos(lt);
  hp(c, h.x, h.y, h.ang, 230, 54, lt * 8.5, 1);
  c.restore();

  // labels (screen space, follow the hero)
  const hs = { x: 540 + (h.x - 540) * scale, y: 1080 + (h.y - 1080) * scale };
  wipeText(c, 'إيه هي جرثومة المعدة؟', 540, 330, t, 7.0, 12.95, { size: 80 });
  const lp = easeOut(prog(t, 8.2, 8.75)), lo = easeIn(prog(t, 12.8, 13.1));
  if (lp > 0 && lo < 1) {
    const ax = hs.x + Math.cos(h.ang) * 100 * scale, ay = hs.y + Math.sin(h.ang) * 100 * scale - 10;
    const ex = 780, ey = 640;
    c.save(); c.globalAlpha = 1 - lo;
    c.strokeStyle = C.white; c.lineWidth = 3;
    c.beginPath(); c.arc(ax, ay, 12 * lp, 0, TAU); c.stroke();
    const mid = { x: ax + (ex - ax) * 0.0, y: ey };
    const seg1 = clamp(lp * 2), seg2 = clamp(lp * 2 - 1);
    c.beginPath(); c.moveTo(ax, ay - 12); c.lineTo(ax, lerp(ay - 12, mid.y, seg1));
    if (seg2 > 0) c.lineTo(lerp(mid.x, ex - 160, seg2), mid.y);
    c.stroke();
    c.restore();
    c.save(); c.globalAlpha = 1 - lo;
    c.beginPath(); c.rect(ex - 170, ey - 120, 400, 110); c.clip();
    setFont(c, 76, 700, EN); c.textAlign = 'left'; c.textBaseline = 'alphabetic'; c.fillStyle = C.white;
    c.font = `italic 700 76px ${EN}`;
    c.fillText('H. pylori', ex - 150, ey - 20 + (1 - spring(t, 8.45, 14, 0.75)) * 100);
    c.restore();
    c.save(); c.globalAlpha = 1 - lo;
    riseText(c, 'بكتيريا حلزونية الشكل', ex + 190, ey + 38, t, 8.75, null, { size: 38, weight: 600, color: C.teal, align: 'right' });
    c.restore();
  }
  // inflammation callout
  const ip = easeOut(prog(t, 10.6, 11.1));
  if (ip > 0 && lo < 1) {
    const sx = 540 + (450 - 540) * scale, sy = 1080 + (surfY(450) + 60 - 1080) * scale;
    c.save(); c.globalAlpha = 1 - lo; c.strokeStyle = C.red; c.lineWidth = 3;
    c.beginPath(); c.moveTo(sx, sy); c.lineTo(sx - 120 * ip, sy - 210 * ip); c.lineTo(sx - 120 * ip - 60 * ip, sy - 210 * ip); c.stroke();
    c.restore();
    c.save(); c.globalAlpha = 1 - lo;
    riseText(c, 'التهاب', sx - 200, sy - 212, t, 10.8, null, { size: 50, color: '#ff8a8e', align: 'right' });
    c.restore();
  }
  return out;
}

// ---------------------------------------------------------------- scene 3 — symptoms
function torso(c) {
  c.beginPath();
  c.moveTo(470, 150); c.bezierCurveTo(468, 230, 450, 270, 400, 300);
  c.bezierCurveTo(300, 330, 210, 350, 170, 420); c.bezierCurveTo(130, 500, 150, 640, 190, 760);
  c.bezierCurveTo(230, 900, 300, 980, 300, 1100); c.bezierCurveTo(300, 1200, 260, 1300, 250, 1420);
  c.moveTo(610, 150); c.bezierCurveTo(612, 230, 630, 270, 680, 300);
  c.bezierCurveTo(780, 330, 870, 350, 910, 420); c.bezierCurveTo(950, 500, 930, 640, 890, 760);
  c.bezierCurveTo(850, 900, 780, 980, 780, 1100); c.bezierCurveTo(780, 1200, 820, 1300, 830, 1420);
}
function scene3(c, t) {
  const lt = t - 13.5;
  background(c, t, 0.1, 1, 800);
  dust(c, t, 0, 0, 0.7);
  const cam = lerp(2.6, 1, spring(lt, 0, 5.5, 0.95)) + 0.04 * prog(lt, 1, 9);
  const calm = easeInOut(prog(t, 18.6, 19.6));
  c.save();
  c.translate(560, 760); c.scale(cam, cam); c.translate(-560, -760);
  // body outline
  c.save();
  c.lineWidth = 3; c.strokeStyle = 'rgba(140,220,230,0.45)'; torso(c); c.stroke();
  // ribs + sternum hints
  c.strokeStyle = 'rgba(140,220,230,0.12)'; c.lineWidth = 2;
  for (let k = 0; k < 5; k++) {
    c.beginPath(); c.ellipse(540, 440 + k * 52, 300 - k * 12, 120, 0, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke();
  }
  c.beginPath(); c.moveTo(540, 380); c.lineTo(540, 640); c.stroke();
  c.restore();
  // stomach in the upper abdomen (patient's left = viewer's right)
  c.save(); c.translate(590, 770); c.scale(0.46, 0.46);
  c.drawImage(stomachSprite, -SO.ox, -SO.oy);
  c.restore();
  // epigastric highlight: red while symptoms are named, calmer teal for "no symptoms"
  const beat = 0.5 + 0.5 * Math.sin(lt * 6);
  const on = easeOut(prog(t, 13.9, 14.6));
  c.save(); c.globalCompositeOperation = 'lighter';
  glow(c, sprRed, 560, 700, 230 + 30 * beat, (0.55 + 0.25 * beat) * on * (1 - calm));
  glow(c, sprTeal, 560, 700, 240, 0.35 * calm);
  c.restore();
  c.restore();
  // heading
  wipeText(c, 'الأعراض', 540, 280, t, 13.8, 22.2, { size: 72 });
  // symptom chips, revealed from the right (reading direction)
  chip(c, t, 'وجع أو حرقان أعلى البطن', 1080, 14.0, C.red);
  chip(c, t, 'انتفاخ أو غثيان', 1190, 16.8, C.red);
  chip(c, t, 'وممكن من غير أعراض', 1300, 18.6, C.teal, true);
}
function chip(c, t, str, y, tin, dot, tealText = false) {
  if (t < tin) return;
  c.save();
  c.direction = 'rtl'; setFont(c, 50, 800); c.textBaseline = 'middle'; c.textAlign = 'right';
  const tw = c.measureText(str).width, w = tw + 140, right = 990;
  const s = spring(t, tin, 13, 0.78);
  const ww = w * clamp(s, 0, 1.04);
  rrect(c, right - ww, y - 46, ww, 92, 46); c.fillStyle = 'rgba(8,26,50,0.88)'; c.fill();
  c.clip();
  c.fillStyle = dot; c.beginPath(); c.arc(right - 50, y, 12 * clamp(spring(t, tin + 0.1, 16, 0.5), 0, 2), 0, TAU); c.fill();
  c.fillStyle = tealText ? C.teal : C.white;
  c.fillText(str, right - 86 + (1 - s) * 60, y + 2);
  c.restore();
}

// ---------------------------------------------------------------- scene 4 — diagnosis
function card(c, t, y, tin, title, en, illo) {
  const s = spring(t, tin, 11, 0.8);
  if (s <= 0) return;
  c.save();
  c.translate(0, (1 - s) * 260);
  c.globalAlpha = clamp(s * 1.5);
  rrect(c, 90, y, 900, 360, 40);
  const g = c.createLinearGradient(0, y, 0, y + 360);
  g.addColorStop(0, 'rgba(26,62,104,0.75)'); g.addColorStop(1, 'rgba(10,30,58,0.75)');
  c.fillStyle = g; c.fill();
  c.direction = 'rtl'; c.textAlign = 'right'; c.textBaseline = 'middle';
  setFont(c, 60, 800); c.fillStyle = C.white; c.fillText(title, 935, y + 140);
  c.direction = 'ltr'; setFont(c, 36, 500, EN); c.fillStyle = C.teal; c.fillText(en, 935, y + 215);
  illo(c, 120, y, t - tin);
  c.restore();
}
function breathIllo(c, x, y, lt) {
  // collection bag with mouthpiece, breath particles flowing in
  c.save(); c.translate(x + 150, y + 190);
  c.strokeStyle = C.teal; c.lineWidth = 5; c.lineJoin = 'round';
  rrect(c, -95, -90, 190, 210, 50); c.fillStyle = 'rgba(47,208,192,0.08)'; c.fill(); c.stroke();
  c.beginPath(); c.moveTo(-18, -90); c.lineTo(-18, -150); c.lineTo(18, -150); c.lineTo(18, -90); c.stroke();
  rrect(c, -34, -170, 68, 26, 10); c.fillStyle = C.teal; c.fill();
  const rr = rng(4);
  for (let i = 0; i < 18; i++) {
    const ph = (lt * 0.55 + rr()) % 1, px = (rr() - 0.5) * 140 * ph, py = lerp(-120, 90, ph) - Math.sin(ph * 6 + i) * 8;
    c.fillStyle = `rgba(200,250,245,${0.75 * Math.sin(Math.PI * ph)})`;
    c.beginPath(); c.arc(px, py, 5 + rr() * 5, 0, TAU); c.fill();
  }
  c.direction = 'ltr'; setFont(c, 30, 700, EN); c.fillStyle = C.white; c.textAlign = 'center';
  c.globalAlpha *= 0.85; c.fillText('CO₂', Math.sin(lt * 1.2) * 20, 30 + Math.cos(lt) * 10);
  c.restore();
}
function stoolIllo(c, x, y, lt) {
  c.save(); c.translate(x + 150, y + 190);
  c.strokeStyle = C.teal; c.lineWidth = 5; c.lineJoin = 'round';
  // specimen container
  c.beginPath(); c.moveTo(-120, -40); c.lineTo(-110, 110); c.quadraticCurveTo(-108, 125, -92, 125);
  c.lineTo(-38, 125); c.quadraticCurveTo(-22, 125, -20, 110); c.lineTo(-10, -40); c.closePath();
  c.fillStyle = 'rgba(47,208,192,0.08)'; c.fill(); c.stroke();
  rrect(c, -128, -78, 126, 36, 10); c.fillStyle = C.teal; c.fill();
  // lateral-flow cassette: window shown empty — no result is depicted
  c.save(); c.translate(70, 20); c.rotate(-0.08);
  rrect(c, -48, -120, 96, 240, 22); c.fillStyle = '#e9f3f6'; c.fill();
  rrect(c, -22, -70, 44, 100, 8); c.fillStyle = '#c7d7de'; c.fill();
  c.beginPath(); c.arc(0, 70, 18, 0, TAU); c.fillStyle = '#c7d7de'; c.fill();
  setFont(c, 22, 700, EN); c.fillStyle = '#4b6676'; c.textAlign = 'right'; c.direction = 'ltr';
  c.fillText('C', -28, -45); c.fillText('T', -28, 5);
  // scanning shimmer
  const sy = -70 + ((lt * 0.7) % 1) * 100;
  c.fillStyle = 'rgba(47,208,192,0.35)'; c.fillRect(-22, sy, 44, 6);
  c.restore();
  c.restore();
}
function scene4(c, t) {
  background(c, t, 0, 1, 760);
  dust(c, t, 0, 0, 0.6);
  const hs = spring(t, 22.75, 12, 0.6);
  c.save(); c.translate(540, 320); c.scale(lerp(1.4, 1, clamp(hs, 0, 1.2)), lerp(1.4, 1, clamp(hs, 0, 1.2)));
  c.globalAlpha = clamp(hs * 3);
  c.direction = 'rtl'; setFont(c, 100, 800); c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillStyle = C.white; c.fillText('نتأكد إزاي؟', 0, 0);
  c.restore();
  riseText(c, 'اختبار النفس أو تحليل البراز', 540, 440, t, 24.6, null, { size: 48, weight: 600, color: C.teal });
  card(c, t, 540, 25.4, 'اختبار النفس', 'Urea Breath Test', breathIllo);
  card(c, t, 940, 26.3, 'تحليل البراز', 'Stool Antigen Test', stoolIllo);
}

// ---------------------------------------------------------------- scene 5 — treatment
function scene5(c, t) {
  background(c, t, 0.1 * easeOut(prog(t, 34.6, 35.4)), 1, 820);
  dust(c, t, 0, 0, 0.6);
  wipeText(c, 'العلاج حسب تقييم الدكتور', 540, 340, t, 30.9, 34.2, { size: 74 });
  // clinician assessment board
  const bin = spring(t, 30.9, 10, 0.8), bout = easeIn(prog(t, 34.2, 34.8));
  if (bout < 1) {
    c.save(); c.translate(540, 860 - bout * 500 + (1 - bin) * 400); c.globalAlpha = 1 - bout;
    rrect(c, -230, -300, 460, 600, 36); c.fillStyle = '#e8f1f5'; c.fill();
    rrect(c, -90, -330, 180, 70, 20); c.fillStyle = C.tealDeep; c.fill();
    // medical cross on the clip
    c.fillStyle = '#ffffff'; c.fillRect(-9, -318, 18, 46); c.fillRect(-23, -304, 46, 18);
    for (let k = 0; k < 3; k++) {
      const y = -150 + k * 140, tk = 31.8 + k * 0.6;
      rrect(c, 120, y - 32, 64, 64, 14); c.fillStyle = '#c9dbe2'; c.fill();
      rrect(c, -180, y - 14, 260 - k * 50, 28, 14); c.fillStyle = '#b7cad3'; c.fill();
      const p = easeOut(prog(t, tk, tk + 0.3));
      if (p > 0) {
        c.strokeStyle = C.tealDeep; c.lineWidth = 10; c.lineCap = 'round'; c.lineJoin = 'round';
        c.beginPath(); c.moveTo(134, y);
        const p1 = clamp(p * 2), p2 = clamp(p * 2 - 1);
        c.lineTo(134 + 14 * p1, y + 16 * p1);
        if (p2 > 0) c.lineTo(148 + 24 * p2, y + 16 - 36 * p2);
        c.stroke();
      }
    }
    c.restore();
  }
  // generic capsule, then the "not by yourself" warning
  const cin = spring(t, 34.5, 10, 0.65);
  if (cin > 0) {
    c.save(); c.translate(540, 860 + (1 - cin) * 500); c.rotate(lerp(-1.6, -0.6, clamp(cin, 0, 1.1)));
    rrect(c, -170, -66, 340, 132, 66); c.save(); c.clip();
    const g1 = c.createLinearGradient(0, -66, 0, 66); g1.addColorStop(0, '#ffffff'); g1.addColorStop(1, '#b8c9d2');
    c.fillStyle = g1; c.fillRect(0, -66, 170, 132);
    const g2 = c.createLinearGradient(0, -66, 0, 66); g2.addColorStop(0, '#5fe3d3'); g2.addColorStop(1, '#0f8f86');
    c.fillStyle = g2; c.fillRect(-170, -66, 170, 132);
    c.fillStyle = 'rgba(255,255,255,0.35)'; c.fillRect(-150, -46, 300, 14);
    c.restore(); c.restore();
    const np = easeInOut(prog(t, 35.2, 35.8));
    if (np > 0) {
      c.save(); c.translate(540, 860); c.strokeStyle = C.red; c.lineWidth = 18; c.lineCap = 'round';
      c.beginPath(); c.arc(0, 0, 250, -Math.PI / 2, -Math.PI / 2 + TAU * np); c.stroke();
      const sp = easeOut(prog(t, 35.6, 35.95));
      if (sp > 0) { c.beginPath(); c.moveTo(-176, -176); c.lineTo(-176 + 352 * sp, -176 + 352 * sp); c.stroke(); }
      c.restore();
    }
  }
  riseText(c, 'متاخدش مضادات حيوية', 540, 1230, t, 34.7, null, { size: 70 });
  riseText(c, 'من نفسك', 540, 1335, t, 35.1, null, { size: 84, color: '#ff6b70' });
}

// ---------------------------------------------------------------- scene 6 — doctor reveal
let IMG = null, CUT = null;
function placeholderDoctor(c, cx, top, s) {
  c.save(); c.translate(cx, top); c.scale(s, s);
  const g = c.createLinearGradient(0, 0, 0, 1300);
  g.addColorStop(0, '#1a4a6e'); g.addColorStop(1, '#0a2340');
  c.fillStyle = g;
  c.beginPath(); c.ellipse(0, 330, 165, 205, 0, 0, TAU); c.fill();
  c.beginPath(); c.moveTo(-430, 1400); c.bezierCurveTo(-430, 820, -300, 640, 0, 620);
  c.bezierCurveTo(300, 640, 430, 820, 430, 1400); c.closePath(); c.fill();
  c.strokeStyle = 'rgba(120,240,228,0.5)'; c.lineWidth = 4; c.stroke();
  c.beginPath(); c.ellipse(0, 330, 165, 205, 0, 0, TAU); c.stroke();
  c.direction = 'rtl'; setFont(c, 34, 600); c.textAlign = 'center'; c.fillStyle = 'rgba(200,230,240,0.55)';
  c.fillText('صورة الدكتور', 0, 1000);
  c.restore();
}
function scene6(c, t) {
  const lt = t - 38.5;
  background(c, t, 0, 1.4, 700);
  const push = lerp(1.1, 1.0, spring(lt, 0, 4, 1)) + 0.035 * prog(lt, 1, 11.5);
  const par = Math.sin(lt * 0.35) * 14;
  if (IMG) {
    const iw = IMG.naturalWidth, ih = IMG.naturalHeight;
    const s = (W / iw) * 1.04 * push;
    // back layer: soft, enlarged copy fills the frame for depth
    c.save(); c.filter = 'blur(26px) brightness(0.45)';
    const sb = (H / ih) * 1.12; c.drawImage(IMG, 540 - iw * sb / 2 - par * 2, -60, iw * sb, ih * sb);
    c.restore();
    c.save();
    const dw = iw * s, dh = ih * s, dx = 540 - dw / 2 + par, dy = 20 - (push - 1) * 300;
    if (CUT) {
      c.globalAlpha = 0.85; c.drawImage(IMG, dx - par * 1.5, dy, dw, dh); c.globalAlpha = 1;
      c.drawImage(CUT, dx + par * 0.6, dy, dw, dh);
    } else {
      c.drawImage(IMG, dx, dy, dw, dh);
    }
    c.restore();
  } else {
    dust(c, t, 0, 0, 0.7);
    placeholderDoctor(c, 540 + par, 40 - (push - 1) * 200, push * 1.05);
  }
  // teal light sweep across the portrait
  const sw = prog(lt, 0.4, 2.8);
  if (sw > 0 && sw < 1) {
    c.save(); c.globalCompositeOperation = 'soft-light';
    const x = lerp(-400, 1500, easeInOut(sw));
    const g = c.createLinearGradient(x - 260, 0, x + 260, 400);
    g.addColorStop(0, 'rgba(47,208,192,0)'); g.addColorStop(0.5, 'rgba(120,255,240,0.65)'); g.addColorStop(1, 'rgba(47,208,192,0)');
    c.fillStyle = g; c.fillRect(0, 0, W, H); c.restore();
  }
  // grade: teal cast top, navy floor for typography
  c.save(); c.globalCompositeOperation = 'soft-light';
  c.fillStyle = 'rgba(30,160,170,0.35)'; c.fillRect(0, 0, W, H); c.restore();
  const fl = c.createLinearGradient(0, 860, 0, 1600);
  fl.addColorStop(0, 'rgba(3,10,22,0)'); fl.addColorStop(0.45, 'rgba(3,10,22,0.82)'); fl.addColorStop(1, 'rgba(3,10,22,1)');
  c.fillStyle = fl; c.fillRect(0, 860, W, H - 860);

  riseText(c, 'صحتك تبدأ بالمعلومة الصح', 540, 1135, t, 41.3, null, { size: 80, colors: { 3: C.teal } });
  // follow CTA pill
  const ps = spring(t, 45.5, 12, 0.75);
  if (ps > 0) {
    c.save(); c.direction = 'rtl'; setFont(c, 48, 800); c.textAlign = 'center'; c.textBaseline = 'middle';
    const tw = c.measureText('تابعنا لمعلومات طبية أكتر').width + 110, ww = tw * clamp(ps, 0, 1.05);
    rrect(c, 540 - ww / 2, 1222, ww, 96, 48); c.fillStyle = C.teal; c.fill(); c.clip();
    c.fillStyle = '#04202a'; c.fillText('تابعنا لمعلومات طبية أكتر', 540, 1272 + (1 - ps) * 60);
    c.restore();
  }
  // name / handle — editable in script.js; dashed plate marks an unfilled placeholder
  const np = spring(t, 46.3, 12, 0.85);
  if (np > 0) {
    c.save(); c.globalAlpha = clamp(np); c.translate(0, (1 - np) * 30);
    const name = CONFIG.doctorName, handle = CONFIG.doctorHandle;
    if (name || handle) {
      c.direction = 'rtl'; setFont(c, 44, 800); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = C.white;
      c.fillText(name, 540, 1370);
      c.direction = 'ltr'; setFont(c, 36, 500, EN); c.fillStyle = C.teal; c.fillText(handle, 540, 1420);
    } else {
      c.setLineDash([10, 10]); c.strokeStyle = 'rgba(200,225,240,0.5)'; c.lineWidth = 2;
      rrect(c, 300, 1340, 480, 92, 20); c.stroke(); c.setLineDash([]);
      c.direction = 'rtl'; setFont(c, 34, 600); c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillStyle = 'rgba(200,225,240,0.7)'; c.fillText('اسم الدكتور  •  @الحساب', 540, 1388);
    }
    c.restore();
  }
}

// ---------------------------------------------------------------- captions
function captions(c, t) {
  if (NOSUBS) return;
  const cap = CAPTIONS.find(([a, b]) => t >= a && t < b);
  if (!cap) return;
  const [a, , str] = cap;
  const s = spring(t, a, 22, 0.85);
  c.save();
  c.direction = 'rtl'; setFont(c, 46, 700); c.textAlign = 'center'; c.textBaseline = 'middle';
  const w = c.measureText(str).width + 64, y = 1530 + (1 - s) * 18;
  rrect(c, 540 - w / 2, y - 40, w, 80, 22); c.fillStyle = 'rgba(2,8,20,0.62)'; c.fill();
  c.fillStyle = '#ffffff'; c.fillText(str, 540, y + 2);
  c.restore();
}

// ---------------------------------------------------------------- compositor
function layer(fn, t) { fn(ctx, t); }
function seek(t) {
  t = clamp(t, 0, DURATION);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
  ctx.fillStyle = C.navy0; ctx.fillRect(0, 0, W, H);

  if (t < 6.7) {
    scene1(ctx, t);
  }
  if (t >= 6.3 && t < 13.6) {
    // zoom-through crossfade from the stomach wall into the lining
    const a = easeInOut(prog(t, 6.3, 6.7));
    ctx.save(); ctx.globalAlpha = a; scene2(ctx, t); ctx.restore();
  }
  if (t >= 13.2 && t < 22.8) {
    const a = easeInOut(prog(t, 13.2, 13.6));
    if (t < 22.2) { ctx.save(); ctx.globalAlpha = a; scene3(ctx, t); ctx.restore(); }
    else {
      // diagonal right-to-left wipe into the diagnosis scene
      const p = easeInOut(prog(t, 22.2, 22.8)), e = lerp(1400, -420, p);
      ctx.save(); ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(e, 0); ctx.lineTo(e + 320, H); ctx.lineTo(-10, H); ctx.clip();
      scene3(ctx, t); ctx.restore();
      ctx.save(); ctx.beginPath(); ctx.moveTo(e, 0); ctx.lineTo(W + 10, 0); ctx.lineTo(W + 10, H); ctx.lineTo(e + 320, H); ctx.clip();
      scene4(ctx, t); ctx.restore();
      ctx.save(); ctx.strokeStyle = C.teal; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(e, 0); ctx.lineTo(e + 320, H); ctx.stroke(); ctx.restore();
    }
  }
  if (t >= 22.8 && t < 30.2) scene4(ctx, t);
  if (t >= 30.2 && t < 30.8) {
    // vertical push
    const p = easeInOut(prog(t, 30.2, 30.8));
    ctx.save(); ctx.translate(0, -H * p); scene4(ctx, t); ctx.restore();
    ctx.save(); ctx.translate(0, H * (1 - p)); scene5(ctx, t); ctx.restore();
  }
  if (t >= 30.8 && t < 39.2) scene5(ctx, t);
  if (t >= 38.3) {
    // iris reveal of the doctor
    const p = easeInOut(prog(t, 38.3, 39.2)), r = lerp(0, 1300, p);
    ctx.save();
    if (p < 1) { ctx.beginPath(); ctx.arc(540, 700, r, 0, TAU); ctx.clip(); }
    scene6(ctx, t);
    ctx.restore();
    if (p > 0 && p < 1) {
      ctx.save(); ctx.strokeStyle = C.teal; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(540, 700, r, 0, TAU); ctx.stroke(); ctx.restore();
    }
  }
  finish(ctx, t);
  captions(ctx, t);
}

// ---------------------------------------------------------------- boot
function loadImg(src) {
  return new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
}
window.seek = seek;
window.DURATION = DURATION;
window.ready = (async () => {
  const fams = ["800 64px Cairo", "700 64px Cairo", "600 64px Cairo", "400 64px Cairo", "500 64px 'Noto Kufi Arabic'", "800 64px 'Noto Kufi Arabic'", "500 64px Inter", "700 64px Inter", "italic 700 64px Inter"];
  await Promise.all(fams.map((f) => document.fonts.load(f, 'جرثومة المعدة H. pylori CO₂')));
  [IMG, CUT] = await Promise.all([loadImg(CONFIG.doctorStylized), loadImg(CONFIG.doctorCutout)]);
  seek(0);
  window.HAS_DOCTOR = !!IMG;
  return true;
})();

if (!RENDER) {
  document.body.classList.add('preview');
  const bar = Object.assign(document.createElement('input'), { type: 'range', min: 0, max: DURATION, step: 0.01, value: 0, id: 'bar' });
  const lab = document.createElement('div');
  document.body.append(bar, lab);
  let playing = true, t0 = performance.now(), base = 0;
  bar.oninput = () => { base = +bar.value; t0 = performance.now(); seek(base); };
  addEventListener('keydown', (e) => { if (e.code === 'Space') { playing = !playing; base = +bar.value; t0 = performance.now(); } });
  window.ready.then(() => {
    const loop = () => {
      if (playing) { const t = (base + (performance.now() - t0) / 1000) % DURATION; bar.value = t; seek(t); }
      lab.textContent = `${(+bar.value).toFixed(2)}s  (space = play/pause)`;
      requestAnimationFrame(loop);
    };
    loop();
  });
}
