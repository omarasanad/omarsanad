// Fatty liver (الكبد الدهني) — Egyptian Arabic medical reel. 1080x1920, pure function of time.
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

// ------------------------------------------------------------ cartoon liver (clay shading, fat droplets)
const LIVER = new Path2D('M -300 -40 C -305 -150 -160 -195 0 -178 C 130 -168 255 -152 312 -112 C 336 -95 326 -66 292 -58 C 205 -30 120 22 40 92 C -32 152 -125 196 -205 172 C -283 150 -298 62 -300 -40 Z');
const LS = { w: 760, h: 520, ox: 380, oy: 250 };
function liverSprite(stops) {
  const s = mk(LS.w, LS.h), g = s.getContext('2d'); g.translate(LS.ox, LS.oy);
  const base = g.createRadialGradient(-130, -100, 20, -40, -10, 420);
  stops.forEach(([o, col]) => base.addColorStop(o, col));
  g.fillStyle = base; g.fill(LIVER);
  g.save(); g.clip(LIVER);
  g.filter = 'blur(26px)'; g.lineWidth = 80; g.strokeStyle = 'rgba(40,0,10,0.55)'; g.stroke(LIVER); g.filter = 'none';
  const sp = g.createRadialGradient(-150, -120, 0, -150, -120, 170);
  sp.addColorStop(0, 'rgba(255,240,230,0.5)'); sp.addColorStop(1, 'rgba(255,240,230,0)'); g.fillStyle = sp; g.fillRect(-400, -300, 800, 600);
  const sp2 = g.createRadialGradient(150, -110, 0, 150, -110, 90);
  sp2.addColorStop(0, 'rgba(255,240,230,0.25)'); sp2.addColorStop(1, 'rgba(255,240,230,0)'); g.fillStyle = sp2; g.fillRect(-400, -300, 800, 600);
  // falciform ligament
  g.strokeStyle = 'rgba(70,10,20,0.35)'; g.lineWidth = 6; g.beginPath(); g.moveTo(30, -176); g.bezierCurveTo(10, -90, 40, -10, 60, 70); g.stroke();
  g.restore();
  g.lineWidth = 3; g.strokeStyle = 'rgba(130,240,230,0.6)'; g.stroke(LIVER);
  return s;
}
const LIVER_OK = liverSprite([[0, '#f07a62'], [0.35, '#c9453a'], [0.75, '#8e2430'], [1, '#4f0d1b']]);
const LIVER_FAT = liverSprite([[0, '#ffd99a'], [0.35, '#e8a85a'], [0.75, '#b8703a'], [1, '#6b3a1c']]);
const DROPS = (() => {
  const g = mk(10, 10).getContext('2d'), r = rng(44), out = [];
  while (out.length < 64) {
    const x = -290 + r() * 600, y = -180 + r() * 360;
    if (g.isPointInPath(LIVER, x, y) && g.isPointInPath(LIVER, x + 18, y + 18) && g.isPointInPath(LIVER, x - 18, y - 18)) out.push([x, y, 7 + r() * 12, r()]);
  }
  return out;
})();
function liver(c, x, y, s, fat, t, a = 1) {
  if (a <= 0 || s <= 0) return;
  c.save(); c.translate(x, y); c.scale(s, s); c.globalAlpha *= a;
  c.fillStyle = 'rgba(0,8,24,0.35)'; c.beginPath(); c.ellipse(10, 215, 300, 34, 0, 0, TAU); c.fill();
  c.drawImage(LIVER_OK, -LS.ox, -LS.oy);
  if (fat > 0) { c.save(); c.globalAlpha *= clamp(fat) * 0.85; c.drawImage(LIVER_FAT, -LS.ox, -LS.oy); c.restore(); }
  if (fat > 0) {
    c.save(); c.clip(LIVER);
    for (const [dx, dy, r, k] of DROPS) {
      const g = easeOut(clamp(fat * 1.5 - k * 0.5));
      if (g <= 0) continue;
      const rr = r * g * (1 + 0.04 * Math.sin(t * 3 + k * 9));
      c.fillStyle = 'rgba(255,240,170,0.92)'; c.beginPath(); c.arc(dx, dy, rr, 0, TAU); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.75)'; c.beginPath(); c.arc(dx - rr * 0.3, dy - rr * 0.3, rr * 0.32, 0, TAU); c.fill();
      c.strokeStyle = 'rgba(160,100,30,0.35)'; c.lineWidth = 1.5; c.beginPath(); c.arc(dx, dy, rr, 0, TAU); c.stroke();
    }
    c.restore();
  }
  c.restore();
}

// translucent torso with ribcage, for the hook
function torso(c, t, a) {
  if (a <= 0) return;
  c.save(); c.globalAlpha *= a;
  c.beginPath();
  c.moveTo(470, 120); c.bezierCurveTo(468, 200, 450, 240, 400, 270); c.bezierCurveTo(300, 300, 200, 320, 160, 400);
  c.bezierCurveTo(120, 500, 150, 650, 200, 780); c.bezierCurveTo(240, 920, 300, 1000, 300, 1120); c.bezierCurveTo(300, 1220, 270, 1320, 260, 1440);
  c.lineTo(820, 1440); c.bezierCurveTo(810, 1320, 780, 1220, 780, 1120); c.bezierCurveTo(780, 1000, 840, 920, 880, 780);
  c.bezierCurveTo(930, 650, 960, 500, 920, 400); c.bezierCurveTo(880, 320, 780, 300, 680, 270); c.bezierCurveTo(630, 240, 612, 200, 610, 120);
  c.closePath();
  const g = c.createLinearGradient(0, 120, 0, 1440); g.addColorStop(0, 'rgba(150,215,255,0.12)'); g.addColorStop(1, 'rgba(150,215,255,0.03)');
  c.fillStyle = g; c.fill(); c.lineWidth = 3; c.strokeStyle = 'rgba(120,230,225,0.45)'; c.stroke();
  c.strokeStyle = 'rgba(160,230,240,0.14)'; c.lineWidth = 6; c.lineCap = 'round';
  for (let k = 0; k < 6; k++) { c.beginPath(); c.ellipse(540, 420 + k * 58, 330 - k * 10, 130, 0, 0.12 * Math.PI, 0.88 * Math.PI); c.stroke(); }
  c.beginPath(); c.moveTo(540, 360); c.lineTo(540, 700); c.stroke();
  c.restore();
}

// hepatocytes with fat droplets (zoom panel)
function cells(c, x, y, r, fat, t, a) {
  if (a <= 0) return;
  c.save(); c.globalAlpha *= a; c.translate(x, y);
  c.shadowColor = 'rgba(0,8,24,0.5)'; c.shadowBlur = 30;
  c.fillStyle = '#7a2a3a'; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill(); c.shadowColor = 'transparent';
  c.save(); c.beginPath(); c.arc(0, 0, r, 0, TAU); c.clip();
  const R = 46, rr = rng(9);
  for (let row = -5; row <= 5; row++) for (let col = -5; col <= 5; col++) {
    const cx = col * R * 1.73 + (row % 2 ? R * 0.865 : 0), cy = row * R * 1.5;
    if (Math.hypot(cx, cy) > r + R) continue;
    c.beginPath(); for (let k = 0; k < 6; k++) { const an = Math.PI / 6 + k * Math.PI / 3; c.lineTo(cx + Math.cos(an) * R * 0.97, cy + Math.sin(an) * R * 0.97); }
    c.closePath(); const g = c.createRadialGradient(cx - 10, cy - 12, 4, cx, cy, R);
    g.addColorStop(0, '#f3a0a0'); g.addColorStop(1, '#c55a68'); c.fillStyle = g; c.fill();
    c.strokeStyle = 'rgba(120,30,50,0.6)'; c.lineWidth = 3; c.stroke();
    const k = rr(), grow = easeOut(clamp(fat * 1.6 - k * 0.6));
    const dr = R * 0.55 * grow;
    c.fillStyle = '#6a3a8a'; c.beginPath(); c.arc(cx - 10 - dr * 0.4, cy + 12 + dr * 0.25, 9, 0, TAU); c.fill();
    if (dr > 1) {
      c.fillStyle = 'rgba(255,240,170,0.95)'; c.beginPath(); c.arc(cx + 6, cy - 4, dr, 0, TAU); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.8)'; c.beginPath(); c.arc(cx + 6 - dr * 0.3, cy - 4 - dr * 0.3, dr * 0.3, 0, TAU); c.fill();
    }
  }
  c.restore();
  c.lineWidth = 7; c.strokeStyle = C.white; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.stroke();
  c.restore();
}

// small drawn icons for pills
const ICONS = {
  scale(c, r) {
    c.fillStyle = '#fff'; rrect(c, -r * 0.7, -r * 0.55, r * 1.4, r * 1.1, r * 0.25); c.fill();
    c.fillStyle = C.orange; c.beginPath(); c.arc(0, -r * 0.1, r * 0.32, Math.PI, 0); c.fill();
  },
  key(c, r) {
    c.strokeStyle = '#fff'; c.lineWidth = r * 0.18; c.lineCap = 'round';
    c.beginPath(); c.arc(-r * 0.3, 0, r * 0.28, 0, TAU); c.stroke();
    c.beginPath(); c.moveTo(0, 0); c.lineTo(r * 0.65, 0); c.moveTo(r * 0.45, 0); c.lineTo(r * 0.45, r * 0.25); c.stroke();
  },
  drop(c, r) {
    c.fillStyle = '#fff'; c.beginPath(); c.moveTo(0, -r * 0.6); c.bezierCurveTo(r * 0.55, 0, r * 0.45, r * 0.55, 0, r * 0.55);
    c.bezierCurveTo(-r * 0.45, r * 0.55, -r * 0.55, 0, 0, -r * 0.6); c.fill();
  },
  fat(c, r) {
    c.fillStyle = '#fff1aa'; for (const [x, y, s] of [[-0.25, 0.1, 0.32], [0.22, -0.15, 0.26], [0.2, 0.3, 0.2]]) { c.beginPath(); c.arc(x * r, y * r, s * r, 0, TAU); c.fill(); }
  },
};
// pill with a drawn icon
function ipill(c, t, str, right, y, tin, tout, icon, o = {}) {
  const s = spring(t, tin, 12, 0.62), out = tout != null ? easeIn(prog(t, tout, tout + 0.3)) : 0;
  if (s <= 0 || out >= 1) return;
  const size = o.size || 42;
  c.save(); c.direction = 'rtl'; setFont(c, size, 800); c.textBaseline = 'middle'; c.textAlign = 'right';
  const tw = c.measureText(str).width, ir = size * 0.62, w = tw + 90 + ir * 2, h = size * 1.9;
  const x0 = o.center ? 540 + w / 2 : right;
  c.translate(x0, y); const k = lerp(0.6, 1, clamp(s, 0, 1.1)) * (1 - out * 0.4); c.scale(k, k);
  c.globalAlpha = clamp(s * 2) * (1 - out);
  c.shadowColor = 'rgba(0,10,30,0.45)'; c.shadowBlur = 24; c.shadowOffsetY = 8;
  rrect(c, -w, -h / 2, w, h, h / 2); c.fillStyle = o.fill || 'rgba(7,28,58,0.92)'; c.fill(); c.shadowColor = 'transparent';
  if (o.stroke) { c.lineWidth = 4; c.strokeStyle = o.stroke; c.stroke(); }
  c.save(); c.translate(-30 - ir, 0); c.fillStyle = o.iconBg || C.tealDeep; c.beginPath(); c.arc(0, 0, ir, 0, TAU); c.fill();
  ICONS[icon](c, ir); c.restore();
  c.fillStyle = o.color || C.white; c.fillText(str, -50 - ir * 2, 3);
  c.restore();
}

// ------------------------------------------------------------ scenes
function liverState(t) {
  // hook: liver inside the torso, camera pushes in while fat builds up
  const push = easeInOut(prog(t, 0.2, 3.6));
  const fatHook = easeInOut(prog(t, 1.1, 3.4));
  const toS2 = easeInOut(prog(t, SC[1] - 0.2, SC[1] + 0.8));
  const out = easeIn(prog(t, SC[2] - 0.45, SC[2] + 0.1));
  const intro = spring(t, -0.25, 7, 0.8);
  const hx = lerp(460, 480, push), hy = lerp(880, 820, push), hs = lerp(0.55, 0.95, push) * lerp(0.85, 1, clamp(intro, 0, 1.1));
  return { x: lerp(hx, 290, toS2), y: lerp(hy, 585, toS2), s: lerp(hs, 0.42, toS2) * (1 - out * 0.4), fat: fatHook, a: 1 - out, torso: (1 - toS2) * (0.55 + 0.45 * clamp(intro)) };
}

function scene1(c, t) {
  const out = SC[1] - 0.3;
  popText(c, 'الكبد الدهني', 540, 300, t, -0.3, out, { size: 124, color: C.white });
  riseText(c, 'ممكن يكون من غير أعراض!', 540, 430, t, at('من غير ما تحس', -0.05), out, { size: 60, colors: { 3: C.orangeSoft, 4: C.orangeSoft } });
  // scan sweep while fat appears
  const sw = prog(t, 1.0, 3.2);
  if (sw > 0 && sw < 1) {
    const L = liverState(t), y = L.y - 200 * L.s + sw * 400 * L.s;
    c.save(); c.globalAlpha = Math.sin(Math.PI * sw) * 0.8; c.fillStyle = C.teal;
    c.fillRect(L.x - 330 * L.s, y - 2, 660 * L.s, 4); glow(c, SOFT.teal, L.x, y, 200 * L.s, 0.4); c.restore();
  }
}
function scene2(c, t) {
  const tin = SC[1], out = SC[2] - 0.45;
  riseText(c, 'يعني إيه كبد دهني؟', 540, 285, t, tin + 0.15, out, { size: 84 });
  const no = spring(t, tin + 0.45, 10, 0.7), oo = easeIn(prog(t, out, out + 0.35));
  liver(c, 790, 585, 0.42 * clamp(no, 0, 1.15) * (1 - oo * 0.4), 0, t, clamp(no * 2) * (1 - oo));
  // labels
  c.save(); c.globalAlpha = clamp(no * 2) * (1 - oo); c.direction = 'rtl'; setFont(c, 40, 800); c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillStyle = C.teal; c.fillText('طبيعي', 790, 700); c.fillStyle = C.orangeSoft; c.fillText('دهني', 290, 700);
  c.restore();
  // zoom into the cells of the fatty liver
  const zp = easeOut(prog(t, at('جوه خلايا', -0.1), at('جوه خلايا', 0.5))) * (1 - oo);
  if (zp > 0) {
    c.save(); c.globalAlpha = zp * 0.6; c.strokeStyle = C.white; c.lineWidth = 3; c.setLineDash([8, 8]);
    c.beginPath(); c.arc(260, 580, 46, 0, TAU); c.stroke();
    c.beginPath(); c.moveTo(225, 612); c.lineTo(540 - 150, 930); c.moveTo(300, 610); c.lineTo(540 + 120, 820); c.stroke(); c.restore();
    cells(c, 540, 935, 175 * zp, easeInOut(prog(t, at('جوه خلايا', 0.2), at('بنسبة زيادة', 1.0))), t, zp);
  }
  ipill(c, t, 'تراكم الدهون في الكبد', 0, 1145, at('بنسبة زيادة', 0.1), out, 'fat', { center: true, iconBg: C.orange, size: 40 });
  ipill(c, t, 'زيادة الوزن', 1000, 1245, at('منها زيادة', 0.05), out, 'scale', { size: 40 });
  ipill(c, t, 'مقاومة الإنسولين', 1000, 1340, at('ومقاومة', 0.05), out, 'key', { size: 40 });
  ipill(c, t, 'السكر من النوع التاني', 1000, 1435, at('ومرض السكر', 0.05), out, 'drop', { size: 40 });
}
function scene3(c, t) {
  const tin = SC[2], out = SC[3] - 0.4, oo = easeIn(prog(t, out, out + 0.35));
  if (t < tin - 0.1 || oo >= 1) return;
  riseText(c, 'ممكن ميبقاش فيه أعراض واضحة', 540, 285, t, tin + 0.15, out, { size: 64 });
  riseText(c, 'وغياب الأعراض مش معناه إن مفيش مشكلة', 540, 380, t, at('من غير أي أعراض', 0.1), out, { size: 40, weight: 700, color: C.teal });
  const s = spring(t, tin + 0.1, 9, 0.75);
  const lx = 320, ly = 760;
  liver(c, lx, ly, 0.55 * clamp(s, 0, 1.1) * (1 - oo * 0.3), 1, t, clamp(s * 2) * (1 - oo));
  // floating question marks: nothing to feel
  const qa = clamp(s * 2) * (1 - oo) * (1 - easeInOut(prog(t, at('علشان كده'), at('علشان كده', 0.5))));
  [[-150, -170, 0], [40, -210, 1.3], [170, -120, 2.4]].forEach(([dx, dy, ph], i) => {
    const q = spring(t, tin + 0.5 + i * 0.25, 12, 0.5);
    if (q <= 0 || qa <= 0) return;
    c.save(); c.translate(lx + dx, ly + dy + Math.sin(t * 2.4 + ph) * 12); c.scale(clamp(q, 0, 1.3), clamp(q, 0, 1.3)); c.globalAlpha = qa;
    c.fillStyle = i === 1 ? C.orange : C.white; c.beginPath(); c.arc(0, 0, 40, 0, TAU); c.fill();
    setFont(c, 56, 800, EN); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = i === 1 ? '#fff' : C.navy; c.fillText('?', 0, 4);
    c.restore();
  });
  // routine check-up finds it: scan rings + chip
  const fp = easeOut(prog(t, at('علشان كده'), at('علشان كده', 0.6))) * (1 - oo);
  if (fp > 0) {
    for (const k of [0, 1, 2]) {
      const ph = ((t * 0.7 + k / 3) % 1);
      c.save(); c.globalAlpha = fp * (1 - ph) * 0.8; c.strokeStyle = C.teal; c.lineWidth = 5;
      c.beginPath(); c.ellipse(lx, ly, 200 + ph * 120, 140 + ph * 90, 0, 0, TAU); c.stroke(); c.restore();
    }
  }
  ipill(c, t, 'بيتكتشف بالصدفة أثناء الفحوصات', 0, 1250, at('ممكن يحصل بالصدفة', 0.1), out, 'fat', { center: true, size: 40, iconBg: C.tealDeep });
}
function bloodIllo(c, x, y, lt) {
  c.save(); c.translate(x, y);
  c.save(); c.rotate(-0.2);
  rrect(c, -26, -110, 52, 210, 26); c.fillStyle = 'rgba(255,255,255,0.9)'; c.fill();
  c.save(); rrect(c, -20, -100, 40, 194, 20); c.clip();
  c.fillStyle = '#c4253a'; c.fillRect(-20, lerp(94, -20, clamp(lt * 0.8)), 40, 200);
  c.restore();
  c.fillStyle = C.blue; rrect(c, -30, -128, 60, 28, 8); c.fill();
  c.restore();
  // lab panel: bars, no values
  c.translate(80, -10);
  c.fillStyle = 'rgba(255,255,255,0.12)'; rrect(c, 0, -80, 130, 160, 18); c.fill();
  for (let k = 0; k < 4; k++) {
    const w = 90 * clamp(lt * 1.2 - k * 0.2) * (0.5 + 0.5 * ((k * 37) % 7) / 7);
    c.fillStyle = k === 1 ? C.orange : C.teal; rrect(c, 18, -56 + k * 34, w, 16, 8); c.fill();
  }
  c.restore();
}
const SPECKLE = (() => {
  const s = mk(320, 320), g = s.getContext('2d'), id = g.createImageData(320, 320), r = rng(17);
  for (let i = 0; i < id.data.length; i += 4) { const v = 40 + r() * 120; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; }
  g.putImageData(id, 0, 0); return s;
})();
function usIllo(c, x, y, lt) {
  c.save(); c.translate(x, y - 110);
  c.save(); c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, 230, Math.PI / 2 - 0.62, Math.PI / 2 + 0.62); c.closePath(); c.clip();
  c.fillStyle = '#05080c'; c.fillRect(-250, 0, 500, 250);
  c.globalAlpha = 0.55; c.drawImage(SPECKLE, -160 + (Math.floor(lt * 12) % 3) * 4, 0, 320, 260); c.globalAlpha = 1;
  // bright liver outline inside the image
  c.strokeStyle = 'rgba(230,230,230,0.7)'; c.lineWidth = 4;
  c.beginPath(); c.moveTo(-120, 120); c.bezierCurveTo(-60, 80, 60, 90, 110, 150); c.stroke();
  const sw = (lt * 0.8) % 1, a = Math.PI / 2 - 0.62 + sw * 1.24;
  c.strokeStyle = 'rgba(120,255,240,0.6)'; c.lineWidth = 3; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a) * 230, Math.sin(a) * 230); c.stroke();
  c.restore();
  c.fillStyle = '#e6eef5'; rrect(c, -34, -70, 68, 84, 18); c.fill(); c.fillStyle = C.blue; rrect(c, -40, -8, 80, 18, 8); c.fill();
  c.restore();
}
function card(c, t, y, tin, title, en, illo, hl = 0) {
  const s = spring(t, tin, 11, 0.8);
  if (s <= 0) return;
  c.save(); c.translate(0, (1 - s) * 260); c.globalAlpha = clamp(s * 1.5);
  c.shadowColor = 'rgba(0,10,30,0.4)'; c.shadowBlur = 30; c.shadowOffsetY = 12;
  rrect(c, 90, y, 900, 330, 40);
  const g = c.createLinearGradient(0, y, 0, y + 330); g.addColorStop(0, 'rgba(46,110,190,0.75)'); g.addColorStop(1, 'rgba(13,48,100,0.85)');
  c.fillStyle = g; c.fill(); c.shadowColor = 'transparent';
  if (hl > 0) { c.lineWidth = 6; c.strokeStyle = rgba(C.orange, hl * (0.6 + 0.4 * Math.sin(t * 6))); c.stroke(); }
  c.direction = 'rtl'; c.textAlign = 'right'; c.textBaseline = 'middle';
  setFont(c, 50, 800); c.fillStyle = C.white; c.fillText(title, 945, y + 130);
  c.direction = 'ltr'; setFont(c, 36, 600, EN); c.fillStyle = C.teal; c.fillText(en, 940, y + 205);
  illo(c, 215, y + 175, t - tin);
  c.restore();
}
function scene4(c, t) {
  const tin = SC[3], out = SC[4] - 0.4, oo = easeIn(prog(t, out, out + 0.35));
  if (t < tin - 0.1 || oo >= 1) return;
  c.save(); c.globalAlpha = 1 - oo; c.translate(0, -oo * 200);
  popText(c, 'طب نعرف إزاي؟', 540, 290, t, at('طب نعرف', -0.05), null, { size: 100 });
  const warn = easeOut(prog(t, at('ومهم تعرف'), at('ومهم تعرف', 0.6)));
  card(c, t, 410, at('تحاليل وظائف', 0.05), 'تحاليل وظائف الكبد', 'Liver Blood Tests', bloodIllo, warn);
  card(c, t, 775, at('تحاليل وظائف', 1.1), 'سونار على البطن', 'Abdominal Ultrasound', usIllo);
  pill(c, t, 'تقييم درجة الخطورة حسب الحالة', 0, 1185, at('وفحوصات تانية', 0.1), null, { center: true, icon: '✓', iconBg: C.tealDeep, size: 40 });
  pill(c, t, 'تحليل طبيعي لوحده مش كفاية', 0, 1295, at('ومهم تعرف', 0.4), null, { center: true, icon: '!', stroke: C.orange, size: 42 });
  c.restore();
}
function tipTile(c, t, x, y, w, h, s, kind, l1, l2) {
  if (s <= 0) return;
  c.save(); c.globalAlpha = clamp(s * 2);
  c.translate(x + w / 2, y + h / 2); const k = lerp(0.7, 1, clamp(s, 0, 1.1)); c.scale(k, k); c.translate(-w / 2, -h / 2);
  c.shadowColor = 'rgba(0,10,30,0.4)'; c.shadowBlur = 30; c.shadowOffsetY = 12;
  rrect(c, 0, 0, w, h, 40); const g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, 'rgba(46,110,190,0.78)'); g.addColorStop(1, 'rgba(13,48,100,0.88)'); c.fillStyle = g; c.fill(); c.shadowColor = 'transparent';
  c.save(); c.translate(w / 2, 120);
  if (kind === 'plate') {
    c.fillStyle = 'rgba(0,0,0,0.2)'; c.beginPath(); c.ellipse(0, 50, 105, 20, 0, 0, TAU); c.fill();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(0, 0, 92, 0, TAU); c.fill();
    const parts = [['#3cc47a', 0, Math.PI], ['#e8a25a', Math.PI, Math.PI * 1.5], ['#ff7a6b', Math.PI * 1.5, TAU]];
    for (const [col, a0, a1] of parts) { c.fillStyle = col; c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, 72, a0 + t * 0.2, a1 + t * 0.2); c.closePath(); c.fill(); }
    c.strokeStyle = '#fff'; c.lineWidth = 5; c.beginPath(); c.arc(0, 0, 72, 0, TAU); c.stroke();
  }
  if (kind === 'walk') {
    const ph = t * 5.5; c.translate(0, Math.abs(Math.sin(ph)) * -6 + 10);
    const limb = (x0, y0, a1, a2, l, col) => {
      c.strokeStyle = col; c.lineWidth = 15; c.lineCap = 'round';
      const kx = x0 + Math.sin(a1) * l, ky = y0 + Math.cos(a1) * l;
      c.beginPath(); c.moveTo(x0, y0); c.lineTo(kx, ky); c.lineTo(kx + Math.sin(a1 + a2) * l, ky + Math.cos(a1 + a2) * l); c.stroke();
    };
    limb(0, 18, Math.sin(ph) * 0.6, -Math.max(0, Math.sin(ph)) * 0.8, 32, '#1d5fb8');
    limb(-4, -44, -Math.sin(ph) * 0.7, 0.5, 26, '#e9a985');
    c.strokeStyle = C.teal; c.lineWidth = 30; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, -46); c.lineTo(0, 14); c.stroke();
    limb(0, 18, -Math.sin(ph) * 0.6, -Math.max(0, -Math.sin(ph)) * 0.8, 32, '#2f8bff');
    limb(4, -44, Math.sin(ph) * 0.7, 0.5, 26, '#ffc9a3');
    c.fillStyle = '#f0b48c'; c.beginPath(); c.arc(0, -80, 25, 0, TAU); c.fill();
  }
  if (kind === 'scale') {
    c.fillStyle = '#fff'; rrect(c, -82, -70, 164, 140, 30); c.fill();
    c.fillStyle = '#dfe9f2'; rrect(c, -56, -50, 112, 52, 14); c.fill();
    const a = -0.6 + 0.35 * Math.sin(t * 1.2) * 0.3 - easeInOut(clamp((t % 6) / 6)) * 0.3;
    c.strokeStyle = C.orange; c.lineWidth = 6; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, -4); c.lineTo(Math.sin(a) * 40, -4 - Math.cos(a) * 40); c.stroke();
    // gentle downward steps
    c.fillStyle = C.teal; for (let k = 0; k < 3; k++) { rrect(c, -50 + k * 36, 20 + k * 10, 28, 30 - k * 10, 6); c.fill(); }
  }
  c.restore();
  c.direction = 'rtl'; c.textAlign = 'center'; c.textBaseline = 'middle';
  setFont(c, 36, 800); c.fillStyle = C.white; c.fillText(l1, w / 2, h - 82);
  if (l2) { setFont(c, 30, 600); c.fillStyle = C.teal; c.fillText(l2, w / 2, h - 40); }
  c.restore();
}
function scene5(c, t) {
  const tin = SC[4], out = SC[5] - 0.35, oo = easeIn(prog(t, out, out + 0.3));
  if (t < tin - 0.1 || oo >= 1) return;
  c.save(); c.globalAlpha = 1 - oo;
  riseText(c, 'الخبر الكويس', 540, 255, t, tin + 0.1, null, { size: 48, weight: 700, color: C.teal });
  riseText(c, 'نمط الحياة بيفرق', 540, 345, t, tin + 0.3, null, { size: 90 });
  const ls = spring(t, tin + 0.4, 9, 0.75);
  const fat = 1 - 0.7 * easeInOut(prog(t, at('ممكن يساعدوا', -0.2), at('ممكن يساعدوا', 2.4)));
  liver(c, 540, 585, 0.48 * clamp(ls, 0, 1.1), fat, t, clamp(ls * 2));
  const better = easeOut(prog(t, at('ممكن يساعدوا', 1.2), at('ممكن يساعدوا', 1.8)));
  if (better > 0) {
    c.save(); c.globalCompositeOperation = 'lighter'; glow(c, SOFT.teal, 540, 585, 260, 0.35 * better); c.restore();
    pill(c, t, 'دهون أقل في الكبد', 0, 760, at('ممكن يساعدوا', 1.2), null, { center: true, icon: '✓', iconBg: C.tealDeep, size: 36 });
  }
  const W3 = 280, gap = 30, x0 = 90, y = 840, h = 330;
  tipTile(c, t, x0 + 2 * (W3 + gap), y, W3, h, spring(t, at('نزول الوزن', 0.05), 10, 0.68), 'scale', 'نزول وزن تدريجي', 'عند الحاجة');
  tipTile(c, t, x0 + (W3 + gap), y, W3, h, spring(t, at('والأكل المتوازن', 0.05), 10, 0.68), 'plate', 'أكل متوازن');
  tipTile(c, t, x0, y, W3, h, spring(t, at('والأكل المتوازن', 1.0), 10, 0.68), 'walk', 'حركة منتظمة');
  c.restore();
}
function scene6(c, t) {
  const tin = SC[5];
  if (t < tin) return;
  const sw = prog(t, tin, tin + 1.8);
  if (sw > 0 && sw < 1) {
    c.save(); c.globalCompositeOperation = 'soft-light';
    const x = lerp(-400, 1500, easeInOut(sw)), g = c.createLinearGradient(x - 260, 0, x + 260, 400);
    g.addColorStop(0, 'rgba(47,208,192,0)'); g.addColorStop(0.5, 'rgba(140,255,240,0.7)'); g.addColorStop(1, 'rgba(47,208,192,0)');
    c.fillStyle = g; c.fillRect(0, 0, W, H); c.restore();
  }
  const T2 = at('لو عندك عوامل', 0.2);
  pill(c, t, 'متعتمدش على الأعراض', 0, 1150, at('بس متعتمدش', 0.05), T2, { center: true, stroke: C.orange, size: 46, icon: '!' });
  pill(c, t, 'ومتبدأش علاج من نفسك', 0, 1265, at('ومتبدأش', 0.05), T2, { center: true, stroke: C.orange, size: 46, icon: '!' });
  pill(c, t, 'عوامل خطورة؟ استشير دكتور', 0, 1260, at('استشير دكتور', 0.0), at('تابعنا', -0.5), { center: true, fill: C.teal, color: '#04202a', size: 44, icon: '+', iconBg: C.navy });
  const es = spring(t, T2 + 0.3, 11, 0.62);
  if (MARK && es > 0) {
    const sz = 140 * clamp(es, 0, 1.2);
    c.save(); c.shadowColor = 'rgba(0,0,0,0.45)'; c.shadowBlur = 24; c.drawImage(MARK, 540 - sz / 2, 840 - sz / 2, sz, sz); c.restore();
  }
  if (CONFIG.doctorName) {
    riseText(c, CONFIG.doctorName, 540, 975, t, T2 + 0.45, null, { size: 74, stagger: 0.08 });
    const tp = easeOut(prog(t, T2 + 0.8, T2 + 1.2));
    if (tp > 0) { c.fillStyle = C.teal; c.fillRect(540 - 60 * tp, 1028, 120 * tp, 4); }
    if (CONFIG.doctorTitle) riseText(c, CONFIG.doctorTitle, 540, 1075, t, T2 + 0.85, null, { size: 37, weight: 600, color: C.teal, stagger: 0.04 });
  } else {
    const ps = spring(t, T2 + 0.45, 12, 0.85);
    if (ps > 0) {
      c.save(); c.globalAlpha = clamp(ps); c.setLineDash([10, 10]); c.strokeStyle = 'rgba(200,225,240,0.6)'; c.lineWidth = 2;
      rrect(c, 290, 930, 500, 110, 20); c.stroke(); c.setLineDash([]);
      c.direction = 'rtl'; setFont(c, 36, 600); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = 'rgba(200,225,240,0.8)';
      c.fillText('اسم الدكتور  •  التخصص', 540, 986); c.restore();
    }
  }
  riseText(c, 'اهتم بصحة كبدك', 540, 1190, t, at('تابعنا', -0.1), null, { size: 76, colors: { 2: C.teal } });
  const ps = spring(t, at('تابعنا', 0.3), 12, 0.75);
  if (ps > 0) {
    c.save(); c.direction = 'rtl'; setFont(c, 46, 800); c.textAlign = 'center'; c.textBaseline = 'middle';
    const tw = c.measureText('تابعنا لمعلومات طبية أكتر').width + 110, ww = tw * clamp(ps, 0, 1.05);
    rrect(c, 540 - ww / 2, 1270, ww, 92, 46); c.fillStyle = C.teal; c.fill(); c.clip();
    c.fillStyle = '#04202a'; c.fillText('تابعنا لمعلومات طبية أكتر', 540, 1318 + (1 - ps) * 60); c.restore();
  }
  const fp = spring(t, at('تابعنا', 0.9), 12, 0.85);
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

// ------------------------------------------------------------ doctor (transparent cut-out character)
// pose: face anchor (x, y) on screen, scale s; optional round bubble (clip radius).
function drawDoctor(c, t, st, talk) {
  if (!DOC || st.a <= 0) return;
  const [fx, fy] = CONFIG.faceAnchor, br = 1 + 0.006 * Math.sin(t * 1.7), s = st.s * br;
  c.save(); c.globalAlpha *= st.a;
  if (st.bubble) {
    const { bx, by, r } = st.bubble;
    c.save(); c.shadowColor = 'rgba(0,10,30,0.5)'; c.shadowBlur = 30; c.shadowOffsetY = 10;
    const g = c.createLinearGradient(0, by - r, 0, by + r); g.addColorStop(0, '#2a86e8'); g.addColorStop(1, '#0d3f86');
    c.fillStyle = g; c.beginPath(); c.arc(bx, by, r, 0, TAU); c.fill(); c.restore();
    c.save(); c.beginPath(); c.arc(bx, by, r, 0, TAU); c.clip();
    c.drawImage(DOC, bx - fx * s, by + r * 0.08 - fy * s, DOC.naturalWidth * s, DOC.naturalHeight * s); c.restore();
    c.lineWidth = 6; c.strokeStyle = C.teal; c.beginPath(); c.arc(bx, by, r, 0, TAU); c.stroke();
    if (talk > 0.02) {
      c.strokeStyle = C.teal; c.lineCap = 'round'; c.lineWidth = 5;
      for (let k = 0; k < 28; k++) {
        const ang = -Math.PI / 2 + (k / 28) * TAU, n = 0.5 + 0.5 * Math.sin(t * 17 + k * 2.3) * Math.sin(t * 9.7 + k * 0.7), len = 6 + 18 * talk * n;
        c.beginPath(); c.moveTo(bx + Math.cos(ang) * (r + 10), by + Math.sin(ang) * (r + 10));
        c.lineTo(bx + Math.cos(ang) * (r + 10 + len), by + Math.sin(ang) * (r + 10 + len)); c.stroke();
      }
    }
  } else {
    glow(c, SOFT.teal, st.x + 30, st.y - 60, 480 * st.s, 0.3);
    c.translate(st.x, st.y); c.rotate(Math.sin(t * 0.7) * 0.006); c.translate(-fx * s, -fy * s);
    c.drawImage(DOC, 0, 0, DOC.naturalWidth * s, DOC.naturalHeight * s);
  }
  c.restore();
}
function talkLevel(T) {
  if (ENV) { const i = Math.floor(T * ENV.fps); return clamp((ENV.v[i] || 0) * 1.6); }
  return TL.captions.some(([a, b]) => T >= a && T < b - 0.15) ? 0.75 + 0.25 * Math.sin(T * 13) : 0;
}
function doctorPose(t) {
  // scene 3: standing beside the liver; scene 5: short presenter bubble; scene 6: hero close-up
  if (t >= SC[2] - 0.1 && t < SC[3] + 0.1) {
    const inn = spring(t, SC[2] + 0.05, 8, 0.8), out = easeIn(prog(t, SC[3] - 0.45, SC[3] - 0.05));
    return { x: 790 + (1 - clamp(inn, 0, 1.2)) * 520 + out * 520, y: 700 + Math.sin(t * 0.8) * 4, s: 0.6, a: clamp(inn * 2) };
  }
  if (t >= SC[4] && t < SC[5]) {
    const pop = spring(t, at('لو عندك وزن', -0.2), 12, 0.6) * (1 - easeIn(prog(t, SC[5] - 0.45, SC[5] - 0.1)));
    const r = 100 * clamp(pop, 0, 1.2);
    return { a: clamp(pop * 2), s: r / 240, bubble: { bx: 165, by: 1335, r } };
  }
  if (t >= SC[5] - 0.1) {
    const rise = spring(t, SC[5] - 0.1, 7, 0.85), push = lerp(1.08, 1.0, easeInOut(prog(t, SC[5], SC[5] + 2)));
    return { x: 540, y: 470 + (1 - clamp(rise, 0, 1.1)) * 900, s: 1.0 * push, a: clamp(rise * 2), hero: true };
  }
  return { a: 0 };
}
function floor(c, from, a) {
  const fl = c.createLinearGradient(0, from, 0, from + 640);
  fl.addColorStop(0, 'rgba(4,16,36,0)'); fl.addColorStop(0.5, `rgba(4,16,36,${a * 0.8})`); fl.addColorStop(1, `rgba(4,16,36,${a})`);
  c.fillStyle = fl; c.fillRect(0, from, W, H - from);
}

// ------------------------------------------------------------ brand watermark + captions
function watermark(c, t, hero) {
  const a = 1 - easeInOut(prog(t, at('لو عندك عوامل', 0.2), at('لو عندك عوامل', 0.7)));
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
  const pose = doctorPose(t), hero = pose.hero ? pose.a : 0;
  const cine = 1 - easeInOut(prog(t, SC[1] - 0.3, SC[1] + 0.6));
  background(ctx, t, { warn: 0.6 * cine, teal: 1 });
  if (t < SC[2] + 0.2) {
    const L = liverState(t);
    torso(ctx, t, L.torso);
    liver(ctx, L.x, L.y, L.s, L.fat, t, L.a);
  }
  if (t < SC[1] + 0.2) scene1(ctx, t);
  if (t >= SC[1] - 0.1 && t < SC[2] + 0.2) scene2(ctx, t);
  if (t >= SC[2] - 0.1 && t < SC[3] + 0.1) { drawDoctor(ctx, t, pose, 0); scene3(ctx, t); }
  if (t >= SC[3] - 0.1 && t < SC[4] + 0.1) scene4(ctx, t);
  if (t >= SC[4] - 0.1 && t < SC[5] + 0.1) { scene5(ctx, t); drawDoctor(ctx, t, pose, talkLevel(T)); }
  if (pose.hero) { drawDoctor(ctx, t, pose, 0); ctx.save(); ctx.globalAlpha = hero; floor(ctx, 740, 0.93); ctx.restore(); scene6(ctx, t); }
  finish(ctx, t);
  watermark(ctx, t, 0);
  captions(ctx, T);
}

function loadImg(src) { return new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; }); }
window.seek = seek;
window.ready = (async () => {
  TL = await (await fetch('timing.json')).json(); SC = TL.scenes;
  try { ENV = await (await fetch('vo_env.json')).json(); } catch (e) { ENV = null; }
  window.DURATION = TL.duration;
  const fams = ['800 64px Cairo', '700 64px Cairo', '600 64px Cairo', "500 64px 'Noto Kufi Arabic'", '500 64px Inter', '700 64px Inter'];
  await Promise.all(fams.map((f) => document.fonts.load(f, 'الكبد الدهني Liver ?!✓')));
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
