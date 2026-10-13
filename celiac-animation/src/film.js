// Celiac disease (السيلياك) — 2D cartoon episode. 1080x1920, 30 fps, pure function of time.
// Characters come from rig.js; every action is keyed to a narration phrase in timing.json via at().
import { clamp, lerp, prog, easeOut, easeIn, easeInOut, spring, rng } from './motion.js';
import { drawPerson, drawHead, CAST, drawBread, drawGluten, drawImmune, drawVilli, box, rr, outline, blob, INK } from './rig.js';
import { CONFIG } from './config.js';

const W = 1080, H = 1920, TAU = Math.PI * 2;
const cv = document.getElementById('c');
const ctx = cv.getContext('2d');
const QS = new URLSearchParams(location.search);
const RENDER = QS.has('render'), NOSUBS = QS.has('nosubs');
const AR = "'Cairo', 'Noto Kufi Arabic', sans-serif", EN = "'Inter', sans-serif";
const C = { navy: '#0b2a52', teal: '#2fd0c0', tealDeep: '#0f8f86', orange: '#ff8a3d', white: '#ffffff', red: '#e5484d', cream: '#fff6e6' };

let TL = { duration: 108, scenes: [0, 8, 19, 38, 56, 70, 84, 99], captions: [] };
let SC = TL.scenes, MARK = null, ENV = null;

// ------------------------------------------------------------ helpers
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
function at(needle, off = 0) { const cap = TL.captions.find((x) => x[2].includes(needle)); return (cap ? cap[0] : 0) + off; }
function setFont(c, size, weight = 800, fam = AR) { c.font = `${weight} ${size}px ${fam}`; }
const blinkAt = (t, seed = 0) => { const p = (t + seed * 1.37) % 3.6; return p < 0.14 ? Math.sin((p / 0.14) * Math.PI) : 0; };
function talkLevel(T) {
  if (ENV) { const i = Math.floor(T * ENV.fps); return clamp((ENV.v[i] || 0) * 1.5); }
  return TL.captions.some(([a, b]) => T >= a && T < b - 0.12) ? clamp(0.45 + 0.45 * Math.sin(T * 17) * Math.sin(T * 6.3)) : 0;
}
let TALK = 0; // narrator mouth level for the current frame

// RTL kinetic text (word-level, letters stay joined)
function riseText(c, str, x, y, t, tin, tout, o = {}) {
  if (t < tin) return;
  const size = o.size || 72, out = tout != null ? easeIn(prog(t, tout, tout + 0.3)) : 0;
  if (out >= 1) return;
  c.save(); c.direction = 'rtl'; setFont(c, size, o.weight || 800); c.textBaseline = 'middle'; c.textAlign = 'right';
  const words = str.split(' '), ws = words.map((w) => c.measureText(w).width), sp = c.measureText(' ').width;
  const total = ws.reduce((a, b) => a + b, 0) + sp * (words.length - 1);
  let xr = x + total / 2;
  if (o.plate) { c.fillStyle = o.plate; rr(c, x - total / 2 - 34, y - size * 0.8, total + 68, size * 1.6, size * 0.5); c.fill(); outline(c, 5); }
  c.beginPath(); c.rect(xr - total - 40, y - size * 1.1, total + 80, size * 2); c.clip();
  words.forEach((w, i) => {
    const s = spring(t, tin + i * 0.06, 15, 0.7);
    c.fillStyle = (o.colors && o.colors[i]) || o.color || C.white;
    if (o.stroke) { c.lineWidth = o.stroke; c.strokeStyle = INK; c.lineJoin = 'round'; c.strokeText(w, xr, y + (1 - s) * size * 1.2 - out * size * 1.5); }
    c.fillText(w, xr, y + (1 - s) * size * 1.2 - out * size * 1.5);
    xr -= ws[i] + sp;
  });
  c.restore();
}
// cartoon label: white rounded tag with bold outline, pops with a squash
function tag(c, t, str, x, y, tin, tout, o = {}) {
  const s = spring(t, tin, 13, 0.5), out = tout != null ? easeIn(prog(t, tout, tout + 0.25)) : 0;
  if (s <= 0 || out >= 1) return;
  const size = o.size || 44;
  c.save(); c.direction = o.ltr ? 'ltr' : 'rtl'; setFont(c, size, 800, o.ltr ? EN : AR); c.textAlign = 'center'; c.textBaseline = 'middle';
  const w = c.measureText(str).width + 56, h = size * 1.7;
  c.translate(x, y); c.rotate((o.rot || 0) * Math.PI / 180);
  const k = clamp(s, 0, 1.25) * (1 - out); c.scale(k, k);
  rr(c, -w / 2, -h / 2, w, h, h * 0.42); c.fillStyle = o.fill || '#ffffff'; c.fill(); outline(c, 6);
  c.fillStyle = o.color || INK; c.fillText(str, 0, 3);
  c.restore();
}
function bubble(c, x, y, r, t, tin, tout, draw, o = {}) {
  const s = spring(t, tin, 12, 0.55), out = tout != null ? easeIn(prog(t, tout, tout + 0.25)) : 0;
  if (s <= 0 || out >= 1) return;
  c.save(); c.translate(x, y); const k = clamp(s, 0, 1.2) * (1 - out); c.scale(k, k);
  if (o.tail) { c.beginPath(); c.moveTo(-20, r - 10); c.lineTo(o.tail[0], o.tail[1]); c.lineTo(20, r - 10); c.closePath(); c.fillStyle = o.fill || '#fff'; c.fill(); outline(c, 6); }
  c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fillStyle = o.fill || '#fff'; c.fill(); outline(c, 7);
  c.save(); c.beginPath(); c.arc(0, 0, r - 4, 0, TAU); c.clip(); draw(c); c.restore();
  c.restore();
}
function sweat(c, x, y, t, a = 1) {
  if (a <= 0) return;
  c.save(); c.globalAlpha *= a; c.translate(x, y + ((t * 60) % 30));
  c.beginPath(); c.moveTo(0, -18); c.quadraticCurveTo(14, 4, 0, 10); c.quadraticCurveTo(-14, 4, 0, -18); c.fillStyle = '#8fd3ff'; c.fill(); outline(c, 4); c.restore();
}
function squiggles(c, x, y, t, a = 1, col = '#ff8a3d') {
  if (a <= 0) return;
  c.save(); c.globalAlpha *= a; c.strokeStyle = col; c.lineWidth = 6; c.lineCap = 'round';
  for (let k = 0; k < 3; k++) {
    c.beginPath();
    for (let i = 0; i <= 8; i++) c.lineTo(x - 30 + i * 7 + k * 26, y - 20 - k * 6 + Math.sin(t * 12 + i + k) * 7);
    c.stroke();
  }
  c.restore();
}

// ------------------------------------------------------------ scenery
function wall(c, top, bot, floorY, floorCol) {
  const g = c.createLinearGradient(0, 0, 0, floorY); g.addColorStop(0, top); g.addColorStop(1, bot);
  c.fillStyle = g; c.fillRect(0, 0, W, floorY); c.fillStyle = floorCol; c.fillRect(0, floorY, W, H - floorY);
  c.beginPath(); c.moveTo(0, floorY); c.lineTo(W, floorY); outline(c, 6);
}
function windowFrame(c, x, y, w, h, sky, t) {
  box(c, x, y, w, h, 16, sky);
  c.save(); rr(c, x, y, w, h, 16); c.clip();
  c.fillStyle = '#fff3b0'; c.beginPath(); c.arc(x + w * 0.7, y + h * 0.3, 40, 0, TAU); c.fill();
  c.fillStyle = 'rgba(255,255,255,0.85)';
  for (const [dx, dy] of [[0.2, 0.5], [0.5, 0.7]]) { const cx = x + ((w * dx + t * 12) % (w + 120)) - 60; c.beginPath(); c.ellipse(cx, y + h * dy, 46, 18, 0, 0, TAU); c.fill(); }
  c.restore();
  c.beginPath(); c.moveTo(x + w / 2, y); c.lineTo(x + w / 2, y + h); c.moveTo(x, y + h / 2); c.lineTo(x + w, y + h / 2); outline(c, 6);
}
function table(c, y, col = '#c98a52', cloth = null) {
  box(c, -20, y, W + 40, 60, 10, col);
  if (cloth) { c.beginPath(); c.moveTo(120, y); c.lineTo(960, y); c.lineTo(990, y + 120); c.lineTo(90, y + 120); c.closePath(); c.fillStyle = cloth; c.fill(); outline(c, 5); }
  for (const x of [80, W - 80]) box(c, x - 20, y + 60, 40, 400, 8, col);
}
function plant(c, x, y, t) {
  box(c, x - 34, y, 68, 60, 10, '#d9774a');
  c.save(); c.translate(x, y);
  for (const [a, l] of [[-0.6, 70], [0, 90], [0.6, 70], [-0.25, 80], [0.3, 75]]) {
    c.save(); c.rotate(a + Math.sin(t * 1.5 + a * 3) * 0.05); c.beginPath(); c.ellipse(0, -l / 2, 16, l / 2, 0, 0, TAU); blob(c, '#4caf6e'); c.restore();
  }
  c.restore();
}

// ------------------------------------------------------------ scene 1 — the bread hook (kitchen)
function kitchen(c, t, shelf = true) {
  wall(c, '#ffe9c9', '#ffd9a8', 1420, '#e2a46a');
  c.fillStyle = 'rgba(255,255,255,0.35)'; for (let x = 0; x < W; x += 90) for (let y = 980; y < 1180; y += 90) { c.beginPath(); rr(c, x + 6, y + 6, 78, 78, 8); c.fill(); }
  windowFrame(c, 640, 330, 320, 300, '#9fdcff', t);
  if (shelf) { box(c, 90, 420, 360, 24, 6, '#b8774a');
  for (const [x, col] of [[130, '#ff9f68'], [210, '#ffd166'], [290, '#7fd1b9'], [370, '#f78fb3']]) box(c, x - 26, 360, 52, 60, 12, col); }
  plant(c, 960, 1280, t);
}
function scene1(c, t, T) {
  kitchen(c, t);
  const sick = at('ممكن يكون السبب', 0), notAll = at('مش عند كل'), celiac = at('بس عند اللي');
  // friend in the background happily eating bread — bread is fine for most people
  const fr = spring(t, notAll + 0.1, 8, 0.8);
  if (fr > 0) {
    drawPerson(c, CAST.kidB, { x: 200 - (1 - clamp(fr, 0, 1)) * 300, y: 1290, s: 1.25, arms: { l: [0.3, -1.9, 'fist'], r: [0.2, 0.2] }, face: { mood: 'happy', blink: blinkAt(t, 2) } }, t);
    drawBread(c, 214 - (1 - clamp(fr, 0, 1)) * 300, 975, 0.25, t, {});
  }
  // Karim at the table
  const lift = easeInOut(prog(t, at('اللي بتاكله', 0), at('اللي بتاكله', 0.6)));
  const freeze = prog(t, sick, sick + 0.3);
  const mood = t > sick ? 'surprised' : t > 1.1 ? 'happy' : 'neutral';
  const leanBack = t > sick ? -0.06 * easeOut(freeze) : 0;
  const armsHold = t > 0.9;
  drawPerson(c, CAST.karim, {
    x: 600, y: 1640, s: 1.55, lean: leanBack + Math.sin(t * 2) * 0.01,
    arms: armsHold ? { l: [0.22, -1.9 + lift * 0.25, 'fist'], r: [0.22, -1.9 + lift * 0.25, 'fist'] } : { l: [0.15, 0.1], r: [0.15, 0.1] },
    face: { mood, blink: blinkAt(t), talk: 0 }, look: t > sick ? [-0.6, 0.4] : t < 0.9 ? [0, 1] : [0, 0.4],
  }, t);
  table(c, 1360, '#b97a46', '#fbfbf6');
  // bread: drops onto the table, gets lifted, then comes alive
  const drop = easeIn(prog(t, -0.2, 0.35)), land = spring(t, 0.35, 18, 0.35);
  let bx = 600, by = lerp(-200, 1300, drop), sq = t > 0.35 ? (1 - clamp(land, 0, 1.3)) * 0.25 : 0;
  if (armsHold) { by = lerp(1300, 1130, easeOut(prog(t, 0.9, 1.3))) - lift * 120; sq = 0; }
  const alive = easeOut(prog(t, sick, sick + 0.35));
  const wiggle = alive * Math.sin(t * 7) * 0.06;
  drawBread(c, bx, by, 0.95, t, { squash: sq, alive, mood: 'sly', lookX: Math.sin(t * 2), rot: wiggle });
  if (t > sick) { sweat(c, 720, 470, t, freeze); }
  // Dr. Sanad pops in from the right: "not for everyone"
  const dr = spring(t, notAll - 0.1, 9, 0.75);
  if (dr > 0) {
    const wag = Math.sin(t * 9) * 0.25;
    drawPerson(c, CAST.sanad, { x: 880 + (1 - clamp(dr, 0, 1.1)) * 420, y: 1500, s: 1.15, flip: true, arms: { r: [2.5 + wag, 0.1, 'point'], l: [0.15, 0.1] }, face: { mood: 'happy', talk: TALK, blink: blinkAt(t, 1) } }, t);
  }
  riseText(c, 'السيلياك', 540, 300, t, celiac + 0.2, null, { size: 130, color: '#fff', stroke: 14 });
  tag(c, t, 'مش عند كل الناس', 760, 450, notAll + 0.2, celiac, { rot: -4 });
}

// ------------------------------------------------------------ scene 2 — the long road (clinic)
function clinic(c, t, poster = 1) {
  wall(c, '#d9f2ef', '#bfe6e1', 1420, '#9ccfc6');
  box(c, 80, 1000, 920, 24, 6, '#ffffff');
  // gut poster on the wall
  if (poster > 0) {
    box(c, 600, 300, 340, 440, 18, '#ffffff');
    c.save(); c.translate(770, 520); c.strokeStyle = '#f39a7a'; c.lineWidth = 34; c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath(); c.moveTo(-90, 120); c.lineTo(-90, -110); c.lineTo(90, -110); c.lineTo(90, 120); c.lineTo(20, 140); c.stroke();
    c.strokeStyle = '#ff9fb0'; c.lineWidth = 18; c.beginPath();
    for (let k = 0; k < 5; k++) { const y = -70 + k * 40; c.lineTo(k % 2 ? 55 : -55, y); c.lineTo(k % 2 ? -55 : 55, y + 20); }
    c.stroke(); c.restore();
    c.beginPath(); rr(c, 600, 300, 340, 440, 18); outline(c, 6);
  }
  // door with a little WC sign
  box(c, 90, 600, 230, 820, 10, '#f3e3c3'); c.beginPath(); c.arc(290, 1040, 12, 0, TAU); blob(c, '#c9a45c');
  box(c, 150, 680, 110, 60, 10, '#5aa9e6'); setFont(c, 36, 800, EN); c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('WC', 205, 712);
}
function scene2(c, t, T) {
  const L = t - SC[1];
  const goDoc = at('يروح للدكتور'), similar = at('وأعراضه تتشابه'), persist = at('بس لما التعب'), more = at('لازم ندوّر');
  clinic(c, t);
  // desk + clinic doctor
  const docTalk = t > similar && t < persist ? clamp(0.4 + 0.4 * Math.sin(t * 14)) : 0;
  const thinking = t > more;
  drawPerson(c, CAST.clinicDoc, { x: 830, y: 1600, s: 1.3, flip: true, arms: thinking ? { r: [2.6, 0.2, 'fist'], l: [0.2, 0.2] } : t > similar ? { r: [1.4, 0.9, 'point'], l: [0.15, 0.1] } : { l: [0.2, 0.3], r: [0.2, 0.3] }, face: { mood: thinking ? 'neutral' : 'neutral', talk: docTalk, blink: blinkAt(t, 3) }, look: [-0.5, 0] }, t);
  box(c, 600, 1330, 480, 70, 12, '#ffffff'); box(c, 640, 1400, 40, 260, 8, '#dfe7ec'); box(c, 1000, 1400, 40, 260, 8, '#dfe7ec');
  // magnifying glass when she decides to look further
  if (thinking) {
    const s = spring(t, more, 10, 0.6);
    c.save(); c.translate(690, 760); c.scale(clamp(s, 0, 1.2), clamp(s, 0, 1.2)); c.rotate(-0.5 + Math.sin(t * 3) * 0.1);
    c.beginPath(); c.arc(0, 0, 60, 0, TAU); c.fillStyle = 'rgba(190,240,255,0.5)'; c.fill(); outline(c, 10);
    c.beginPath(); rr(c, -12, 60, 24, 90, 10); blob(c, '#7a5230'); c.restore();
  }
  // Karim: walks in bloated & tired, sits, leaves, comes back
  const walkIn = prog(t, SC[1] - 0.1, goDoc - 0.1);
  let kx = lerp(-160, 380, easeOut(walkIn)), legs = walkIn < 1 ? 'walk' : 'sit', ky = legs === 'sit' ? 1560 : 1620;
  const leave = prog(t, persist, persist + 0.7), back = prog(t, persist + 1.0, persist + 1.6);
  if (leave > 0 && back < 1) { kx = lerp(380, -200, easeIn(leave)); legs = 'walk'; ky = 1620; }
  if (back > 0) { kx = lerp(-200, 380, easeOut(back)); legs = back < 1 ? 'walk' : 'sit'; ky = legs === 'sit' ? 1560 : 1620; }
  const bloat = clamp(easeOut(prog(t, SC[1] + 0.2, SC[1] + 1.2)));
  const tired = t > at('وعنده إسهال', 0.8);
  if (legs === 'sit') box(c, kx - 90, 1420, 180, 26, 8, '#f08a3c');
  drawPerson(c, CAST.karim, { x: kx, y: ky, s: 1.2, legs, walk: t * 7, belly: bloat * 0.8, lean: tired ? 0.08 : 0,
    arms: { l: [0.1, -1.1, 'open'], r: [0.1, -1.1, 'open'] },
    face: { mood: tired ? 'tired' : 'pain', blink: blinkAt(t, 4) }, headTilt: tired ? 0.12 : 0 }, t);
  squiggles(c, kx + 10, ky - 300, t, clamp(prog(t, SC[1] + 0.4, SC[1] + 0.8)) * (t < goDoc ? 1 : 0.5));
  // quick glance at the WC door (diarrhoea), then the yawn (fatigue)
  const wc = Math.sin(Math.PI * prog(t, at('وعنده إسهال'), at('وعنده إسهال', 1.0)));
  if (wc > 0) { c.save(); c.globalAlpha = wc; c.strokeStyle = C.orange; c.lineWidth = 8; c.setLineDash([16, 14]); c.beginPath(); c.moveTo(kx - 40, ky - 420); c.quadraticCurveTo(260, 560, 210, 760); c.stroke(); c.restore(); }
  bubble(c, kx + 120, ky - 640, 70, t, at('وتعبان'), goDoc + 0.3, (b) => {
    b.fillStyle = '#e8eef3'; b.fillRect(-70, -70, 140, 140);
    box(b, -40, -22, 72, 44, 8, '#fff'); box(b, 32, -10, 10, 20, 3, '#fff');
    b.fillStyle = C.red; b.fillRect(-34, -16, 14, 32);
  });
  // symptoms told to the doctor
  bubble(c, 620, 820, 150, t, goDoc + 0.3, similar + 0.2, (b) => {
    b.fillStyle = '#fff7ec'; b.fillRect(-150, -150, 300, 300);
    b.save(); b.translate(-60, -40); b.beginPath(); b.ellipse(0, 0, 44, 50, 0, 0, TAU); blob(b, '#ffb27a'); b.restore();
    b.save(); b.translate(60, -40); b.strokeStyle = INK; b.lineWidth = 8; b.beginPath(); b.moveTo(-10, -40); b.lineTo(12, -4); b.lineTo(-8, 0); b.lineTo(14, 40); b.stroke(); b.restore();
    setFont(b, 60, 800, EN); b.fillStyle = '#4a6fa5'; b.textAlign = 'center'; b.fillText('z z', 0, 90);
  }, { tail: [-160, 200] });
  // "could be IBS?" note on the poster
  tag(c, t, 'قولون عصبي؟', 770, 280, similar + 0.3, more, { rot: 5, fill: '#fff3b0' });
  // calendar: weeks pass, still unwell
  const cal = prog(t, persist + 0.1, persist + 1.6);
  if (cal > 0 && cal < 1.2) {
    const pages = Math.floor(cal * 4);
    c.save(); c.translate(440, 470);
    box(c, -90, -80, 180, 170, 14, '#ffffff'); c.fillStyle = C.red; c.fillRect(-87, -77, 174, 40);
    setFont(c, 70, 800, EN); c.fillStyle = INK; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(7 + pages * 7), 0, 30);
    c.restore();
  }
  tag(c, t, 'محتاجين ندوّر أكتر', 560, 1180, more + 0.2, null, { fill: '#fff3b0', size: 48 });
}

// ------------------------------------------------------------ scene 3 — inside: what celiac is
function inside(c, t) {
  const g = c.createRadialGradient(540, 800, 100, 540, 900, 1300); g.addColorStop(0, '#ffd6dc'); g.addColorStop(1, '#f19aa8');
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  const r = rng(5);
  for (let i = 0; i < 14; i++) { c.fillStyle = 'rgba(255,255,255,0.18)'; c.beginPath(); c.arc(r() * W, (r() * H + t * 20 * (0.5 + r())) % H, 20 + r() * 60, 0, TAU); c.fill(); }
}
function stalk(c, x, y, s, t, kind) {
  c.save(); c.translate(x, y); c.scale(s, s); c.rotate(Math.sin(t * 2 + x) * 0.05);
  c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -220); outline(c, 8); c.strokeStyle = '#c99a3a'; c.lineWidth = 5; c.stroke();
  const col = kind === 'barley' ? '#d8b15a' : kind === 'rye' ? '#b98e4a' : '#e8c15a';
  for (let k = 0; k < 6; k++) for (const sx of [-1, 1]) {
    c.save(); c.translate(sx * 10, -200 + k * 26); c.rotate(sx * 0.5); c.beginPath(); c.ellipse(0, 0, 11, 20, 0, 0, TAU); blob(c, col);
    if (kind !== 'rye') { c.beginPath(); c.moveTo(0, -18); c.lineTo(sx * 10, -60); outline(c, 3); }
    c.restore();
  }
  c.restore();
}
function sanadBubble(c, x, y, r, t, tin, tout, mood = 'happy', point = false) {
  const s = spring(t, tin, 11, 0.6), out = tout != null ? easeIn(prog(t, tout, tout + 0.3)) : 0;
  if (s <= 0 || out >= 1) return;
  c.save(); c.translate(x, y); const k = clamp(s, 0, 1.15) * (1 - out); c.scale(k, k);
  c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fillStyle = '#2a86e8'; c.fill(); outline(c, 8);
  c.save(); c.beginPath(); c.arc(0, 0, r - 5, 0, TAU); c.clip();
  drawPerson(c, CAST.sanad, { x: 0, y: r * 2.7, s: r / 150, arms: point ? { r: [2.3, 0.2, 'point'], l: [0.1, 0.1] } : { l: [0.1, 0.1], r: [0.1, 0.1] }, face: { mood, talk: TALK, blink: blinkAt(t, 5) } }, t);
  c.restore(); c.restore();
}
function scene3(c, t, T) {
  inside(c, t);
  const enemy = at('الجسم فيه بيعتبر'), grains = at('والجلوتين بروتين'), attack = at('المناعة بتهاجم'), villiK = at('والخملات'), wilt = at('بتدبل'), allergy = at('وده غير حساسية'), intol = at('وغير إن معدتك');
  const zoom = easeInOut(prog(t, attack - 0.2, attack + 0.6)), cmp = easeInOut(prog(t, allergy - 0.2, allergy + 0.4));
  if (cmp < 1) {
    c.save(); c.globalAlpha = 1 - cmp;
    if (zoom < 1) {
      c.save(); c.globalAlpha *= 1 - zoom;
      // a big cartoon small-intestine coil with immune patrols and gluten sneaking in
      c.save(); c.translate(540, 900); c.strokeStyle = INK; c.lineCap = 'round'; c.lineJoin = 'round';
      const path = () => { c.beginPath(); c.moveTo(-300, -260); for (let k = 0; k < 5; k++) { const y = -260 + k * 120; c.lineTo(k % 2 ? -300 : 300, y); c.quadraticCurveTo(k % 2 ? -380 : 380, y + 60, k % 2 ? -300 : 300, y + 120); } };
      c.lineWidth = 130; path(); c.stroke(); c.strokeStyle = '#ff9fb0'; c.lineWidth = 116; path(); c.stroke();
      c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 30; c.save(); c.translate(-10, -22); path(); c.stroke(); c.restore();
      c.restore();
      const gIn = prog(t, SC[2] + 0.4, SC[2] + 2.0);
      for (let i = 0; i < 5; i++) drawGluten(c, 200 + i * 160, lerp(-80, 560 + (i % 2) * 120, easeOut(clamp(gIn * 1.4 - i * 0.1))), 1.4, t, i);
      const alarm = t > enemy;
      for (let i = 0; i < 4; i++) {
        const px = 200 + i * 230 + Math.sin(t * 2 + i) * 40;
        drawImmune(c, px, 1240 + (i % 2) * 140, 1.5, t, i, alarm ? 1 : 0.2);
        if (alarm) tag(c, t, '!', px, 1150 + (i % 2) * 140, enemy + i * 0.1, null, { size: 50, fill: '#ffd166', ltr: true });
      }
      c.restore();
    }
    // wheat, barley, rye
    const gs = spring(t, grains, 10, 0.7), go = easeIn(prog(t, attack - 0.4, attack));
    if (gs > 0 && go < 1) {
      c.save(); c.globalAlpha = 1 - go;
      box(c, 90, 330, 900, 420, 40, '#fff6e6');
      [['wheat', 'القمح', 790], ['barley', 'الشعير', 540], ['rye', 'الجاودار', 290]].forEach(([k, label, x], i) => {
        const s = spring(t, grains + 0.2 + i * 0.35, 12, 0.6);
        if (s <= 0) return;
        stalk(c, x, 680, clamp(s, 0, 1.1), t, k);
        tag(c, t, label, x, 700, grains + 0.35 + i * 0.35, null, { size: 40 });
      });
      c.restore();
    }
    // close-up of the lining: villi absorbing food, then immune attack flattens them
    if (zoom > 0) {
      c.save(); c.globalAlpha *= zoom;
      const health = 1 - 0.82 * easeInOut(prog(t, wilt - 0.3, wilt + 1.2));
      const vy = 760, vh = 620;
      drawVilli(c, 60, vy, 960, vh, health, t, { n: 8 });
      // nutrients: absorbed when healthy, bounce off when damaged
      const r = rng(8);
      for (let i = 0; i < 16; i++) {
        const ph = (t * 0.35 + r()) % 1, x0 = 80 + r() * 920, col = ['#ffd166', '#7fd1b9', '#f78fb3', '#9ab8ff'][i % 4];
        const sink = health > 0.6 ? ph : Math.min(ph, 0.55);
        const y = lerp(vy - 140, vy + vh * 0.62 - 380 * health + 60, sink);
        const x = health > 0.6 ? x0 : x0 + Math.max(0, ph - 0.55) * 600;
        c.beginPath(); c.arc(x, y, 16, 0, TAU); c.fillStyle = col; c.fill(); outline(c, 4);
      }
      const atk = prog(t, attack + 0.2, wilt + 1.4);
      if (atk > 0) for (let i = 0; i < 4; i++) {
        const x = 170 + i * 240, hop = Math.abs(Math.sin(t * 6 + i)) * 50;
        drawImmune(c, x, vy + 140 - hop, 1.3, t, i, 1);
        drawGluten(c, x + 70, vy + 120 - hop * 0.5, 0.9, t, i + 3);
      }
      tag(c, t, 'الخملات', 540, vy - 230, villiK, allergy - 0.3, { size: 50 });
      if (t > wilt) tag(c, t, 'خملات متأثرة', 540, vy + vh + 60, wilt + 0.6, allergy - 0.3, { size: 44, fill: '#ffe1e1' });
      c.restore();
    }
    c.restore();
  }
  // celiac vs wheat allergy vs intolerance
  if (cmp > 0) {
    c.save(); c.globalAlpha = cmp;
    const card = (y, tin, title, sub, fill, draw) => {
      const s = spring(t, tin, 11, 0.7); if (s <= 0) return;
      c.save(); c.translate((1 - clamp(s, 0, 1)) * 600, 0);
      box(c, 80, y, 920, 300, 36, fill); draw(c, 250, y + 150);
      c.direction = 'rtl'; c.textAlign = 'right'; c.textBaseline = 'middle';
      setFont(c, 52, 800); c.fillStyle = INK; c.fillText(title, 950, y + 115);
      setFont(c, 34, 600); c.fillStyle = '#3a4a5a'; c.fillText(sub, 950, y + 190);
      c.restore();
    };
    card(330, allergy - 0.1, 'السيلياك', 'مناعة بتأذي بطانة الأمعاء', '#ffe1e6', (k, x, y) => { drawVilli(k, x - 110, y - 90, 220, 170, 0.2, t, { n: 4 }); drawImmune(k, x + 60, y - 40, 0.9, t, 1); });
    card(670, allergy + 0.3, 'حساسية القمح', 'رد فعل حساسية سريع', '#e6f0ff', (k, x, y) => {
      k.save(); k.translate(x, y + 10); k.scale(0.85, 0.85); drawHead(k, CAST.karim, { mood: 'surprised', blink: 0 }, [0, 0], t);
      const r = rng(4); for (let i = 0; i < 9; i++) { k.beginPath(); k.arc(-60 + r() * 120, -20 + r() * 80, 7, 0, TAU); k.fillStyle = 'rgba(229,72,77,0.8)'; k.fill(); }
      k.restore();
      k.save(); k.translate(x + 120, y - 30); k.strokeStyle = '#4a90d9'; k.lineWidth = 6; k.lineCap = 'round';
      for (let i = 0; i < 3; i++) { k.beginPath(); k.moveTo(0, -20 + i * 20); k.lineTo(40 + Math.sin(t * 10 + i) * 8, -30 + i * 28); k.stroke(); } k.restore();
    });
    card(1010, intol + 0.1, 'عدم تحمّل', 'إزعاج من غير أذى للأمعاء', '#e9fbf2', (k, x, y) => {
      k.save(); k.translate(x, y); k.beginPath(); k.ellipse(0, 10, 70, 80, 0, 0, TAU); blob(k, '#ffb27a'); squiggles(k, 0, 0, t, 1, INK); k.restore();
    });
    c.restore();
  }
  sanadBubble(c, 150, 1380, 110, t, SC[2] + 0.4, allergy - 0.4, 'happy', true);
}

// ------------------------------------------------------------ scene 4 — history (sepia reconstruction)
function house(c, x, y, w, h, col, t) {
  c.beginPath(); c.moveTo(x, y + h); c.lineTo(x, y); const st = 5, sw = w / (st * 2);
  for (let k = 0; k < st; k++) { c.lineTo(x + sw * k, y - k * 28); c.lineTo(x + sw * (k + 1), y - k * 28); }
  for (let k = st - 1; k >= 0; k--) { c.lineTo(x + w - sw * (k + 1), y - k * 28); c.lineTo(x + w - sw * k, y - k * 28); }
  c.lineTo(x + w, y + h); c.closePath(); blob(c, col);
  for (let r = 0; r < 3; r++) for (let k = 0; k < 2; k++) box(c, x + w * 0.2 + k * w * 0.38, y + 30 + r * 110, w * 0.22, 70, 6, '#f6e7b8', 4);
}
function snow(c, t, n = 60) {
  const r = rng(3);
  c.fillStyle = 'rgba(255,255,255,0.9)';
  for (let i = 0; i < n; i++) { const x = (r() * W + Math.sin(t + i) * 20) % W, y = (r() * H + t * (60 + r() * 60)) % H; c.beginPath(); c.arc(x, y, 3 + r() * 4, 0, TAU); c.fill(); }
}
function truck(c, x, y, t, bread) {
  c.save(); c.translate(x, y);
  box(c, -240, -170, 300, 170, 14, '#6d6a4f'); box(c, 60, -130, 150, 130, 18, '#57543e'); box(c, 90, -112, 90, 60, 8, '#cfe3e6', 4);
  if (bread) for (let k = 0; k < 4; k++) drawBread(c, -200 + k * 70, -190 - (k % 2) * 20, 0.28, t, {});
  for (const wx of [-170, 130]) { c.beginPath(); c.arc(wx, 0, 44, 0, TAU); blob(c, '#2a2622'); c.save(); c.translate(wx, 0); c.rotate(-t * 6); c.beginPath(); c.moveTo(-20, 0); c.lineTo(20, 0); outline(c, 5); c.restore(); }
  c.restore();
}
function bed(c, x, y, kid, mood, t, seed) {
  box(c, x - 150, y - 40, 300, 70, 14, '#e8e2d2'); box(c, x - 160, y - 140, 20, 230, 6, '#8a8478'); box(c, x + 140, y - 120, 20, 210, 6, '#8a8478');
  c.save(); c.translate(x - 70, y - 70); c.scale(0.6, 0.6); drawHead(c, kid, { mood, blink: blinkAt(t, seed) }, [0, 0], t); c.restore();
  box(c, x - 20, y - 70, 170, 50, 16, '#f4f0e4');
}
function scene4(c, t, T) {
  const nameK = at('اسمه ويليم'), doubt = at('كان شاكك'), winter = at('وفي شتا المجاعة'), better = at('لاحظ إن حالة'), back = at('ولما العيش رجع'), research = at('وأبحاثه');
  const part = t < winter - 0.2 ? 0 : t < better - 0.2 ? 1 : t < research - 0.2 ? 2 : 3;
  if (part === 0) {
    // the doctor's office at a children's hospital
    wall(c, '#e8dcc4', '#d8c8a8', 1420, '#a98b62');
    box(c, 640, 320, 330, 380, 10, '#c9b48e'); for (let k = 0; k < 4; k++) box(c, 660, 340 + k * 90, 290, 70, 6, ['#7a4a3a', '#4a5a6a', '#6a6a3a', '#5a3a4a'][k], 4);
    box(c, 70, 330, 400, 120, 10, '#f6efdf'); setFont(c, 34, 800, EN); c.fillStyle = INK; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('KINDERZIEKENHUIS', 270, 392);
    const doubtA = t > doubt;
    drawPerson(c, CAST.dicke, { x: 480, y: 1640, s: 1.45, arms: doubtA ? { r: [0.25, -1.9, 'fist'], l: [0.3, -2.2, 'fist'] } : { r: [0.15, 0.1], l: [0.15, 0.1] }, face: { mood: doubtA ? 'worried' : 'neutral', blink: blinkAt(t, 6) }, look: doubtA ? [0.3, 0.8] : [0, 0], headTilt: doubtA ? 0.08 : 0 }, t);
    box(c, -20, 1380, W + 40, 50, 8, '#7a5a3a');
    if (doubtA) {
      drawBread(c, 470, 1105, 0.45, t, { rot: Math.sin(t * 2) * 0.1 });
      bubble(c, 800, 760, 120, t, doubt + 0.2, null, (b) => { b.fillStyle = '#fbf5e6'; b.fillRect(-120, -120, 240, 240); stalk(b, -20, 90, 0.75, t, 'wheat'); setFont(b, 90, 800, EN); b.fillStyle = C.red; b.textAlign = 'center'; b.fillText('?', 60, 20); }, { tail: [-200, 210] });
    }
    tag(c, t, 'د. ويليم ديكه', 300, 600, nameK + 0.1, null, { size: 46 });
    tag(c, t, 'طبيب أطفال هولندي', 300, 690, nameK + 0.4, null, { size: 34 });
  } else if (part === 1) {
    // Hunger Winter street: snow, an empty bakery, a queue
    const g = c.createLinearGradient(0, 0, 0, 1400); g.addColorStop(0, '#9aa7b0'); g.addColorStop(1, '#c9cfd2'); c.fillStyle = g; c.fillRect(0, 0, W, 1400);
    house(c, -40, 520, 300, 880, '#8a5a44', t); house(c, 250, 600, 300, 800, '#6e4a3a', t); house(c, 820, 560, 280, 840, '#7a5240', t);
    box(c, 540, 820, 300, 580, 6, '#5a4a3e');
    box(c, 560, 860, 260, 70, 6, '#efe3c4'); setFont(c, 40, 800, EN); c.fillStyle = INK; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('BAKKERIJ', 690, 897);
    box(c, 570, 960, 240, 200, 6, '#d6cdb6'); for (let k = 0; k < 3; k++) { c.beginPath(); c.moveTo(580, 1000 + k * 55); c.lineTo(800, 1000 + k * 55); outline(c, 4); }
    c.fillStyle = '#f2efe8'; c.fillRect(0, 1400, W, 520); c.beginPath(); c.moveTo(0, 1400); c.lineTo(W, 1400); outline(c, 6);
    const q = [CAST.dutchWoman, CAST.dutchMan, CAST.kidA, CAST.dutchMan];
    q.forEach((L, i) => drawPerson(c, L, { x: 520 - i * 150 + Math.sin(t * 8 + i) * 2, y: 1700, s: 0.95, flip: true, face: { mood: 'sad', blink: blinkAt(t, i) }, arms: { l: [0.1, -1.4], r: [0.1, -1.4] }, bob: Math.sin(t * 9 + i) * 2 }, t));
    snow(c, t, 70);
    tag(c, t, 'شتا المجاعة ١٩٤٤–١٩٤٥', 540, 330, winter, null, { size: 44, fill: '#f6efdf' });
    tag(c, t, 'العيش نادر', 760, 1250, at('لما العيش بقى', 0.1), null, { size: 40, rot: -4 });
  } else if (part === 2) {
    // the ward: children improve while bread is scarce, relapse when it returns
    wall(c, '#e9e3d3', '#dcd4c0', 1450, '#b9a98a');
    windowFrame(c, 620, 300, 340, 300, '#b9c3c8', t * 0);
    const relapse = t > back, moodK = relapse ? 'sad' : t > better + 0.6 ? 'happy' : 'sad';
    bed(c, 300, 1050, CAST.kidA, moodK, t, 1); bed(c, 760, 1050, CAST.kidB, moodK, t, 2);
    drawPerson(c, CAST.nurse, { x: 920, y: 1720, s: 1.0, flip: true, face: { mood: relapse ? 'worried' : 'happy', blink: blinkAt(t, 7) } }, t);
    drawPerson(c, CAST.dicke, { x: 420, y: 1760, s: 1.15, arms: { r: [0.5, -1.9, 'fist'], l: [0.3, -1.9, 'fist'] }, face: { mood: relapse ? 'worried' : 'happy', blink: blinkAt(t, 8) } }, t);
    // clipboard chart
    c.save(); c.translate(520, 1430); box(c, -100, -120, 200, 230, 12, '#f6efdf');
    c.strokeStyle = relapse ? C.red : '#2e8b57'; c.lineWidth = 8; c.lineCap = 'round'; c.beginPath();
    const up = easeOut(prog(t, better, better + 1.2)), dn = easeOut(prog(t, back, back + 1.0));
    for (let k = 0; k <= 10; k++) { const x = -80 + k * 16, y = 60 - 110 * up * (k / 10) + 120 * dn * Math.max(0, (k - 4) / 6); k ? c.lineTo(x, y) : c.moveTo(x, y); }
    c.stroke(); c.restore();
    if (t > back) { c.save(); rr(c, 620, 300, 340, 300, 16); c.clip(); c.translate(0, 0); c.scale(0.55, 0.55); truck(c, lerp(2000, 1450, easeOut(prog(t, back, back + 1))), 1040, t, true); c.restore(); c.beginPath(); c.moveTo(790, 300); c.lineTo(790, 600); c.moveTo(620, 450); c.lineTo(960, 450); outline(c, 6); }
    tag(c, t, 'الأطفال اتحسنوا', 540, 330, better + 0.6, back, { size: 44, fill: '#e3f5e6' });
    tag(c, t, 'العيش رجع… والتعب رجع', 540, 330, back + 0.3, null, { size: 42, fill: '#ffe1e1' });
  } else {
    // research
    wall(c, '#e3dccb', '#d2c8b2', 1450, '#a98b62');
    box(c, -20, 1250, W + 40, 60, 8, '#7a5a3a');
    for (let k = 0; k < 3; k++) { box(c, 640 + k * 90, 1070, 50, 180, 20, ['#f2d06b', '#9fd3c7', '#e8a0a0'][k], 5); }
    c.save(); c.translate(860, 1250); box(c, -40, -40, 80, 40, 6, '#555'); box(c, -14, -230, 28, 190, 8, '#666'); box(c, -60, -260, 80, 40, 10, '#777'); c.restore();
    drawPerson(c, CAST.dicke, { x: 380, y: 1760, s: 1.35, arms: { r: [2.3, 0.3, 'point'], l: [0.2, 0.2] }, face: { mood: 'happy', blink: blinkAt(t, 9) } }, t);
    const bulb = spring(t, research + 0.5, 10, 0.5);
    if (bulb > 0) { c.save(); c.translate(380, 760); c.scale(clamp(bulb, 0, 1.2), clamp(bulb, 0, 1.2)); c.beginPath(); c.arc(0, 0, 60, 0, TAU); blob(c, '#ffe36e'); box(c, -26, 50, 52, 40, 8, '#bbb'); c.restore(); }
    tag(c, t, 'بروتين القمح هو السبب', 640, 420, at('أثبتت', 0.3), null, { size: 46, fill: '#fff3b0' });
    tag(c, t, 'رسالته العلمية ١٩٥٠', 640, 520, at('أثبتت', 0.8), null, { size: 34 });
  }
  setFont(c, 30, 700); c.direction = 'rtl'; c.textAlign = 'center'; c.fillStyle = 'rgba(40,30,20,0.75)'; c.fillText('إعادة تمثيل تعليمية', 540, 230);
}

// ------------------------------------------------------------ scene 5 — symptoms (Karim)
function living(c, t) { wall(c, '#e3f1ff', '#cfe4fa', 1450, '#9bb8d8'); windowFrame(c, 700, 320, 280, 260, '#bfe6ff', t); plant(c, 140, 1330, t); }
function scene5(c, t, T) {
  living(c, t);
  const bloatK = at('انتفاخ وإسهال'), anemia = at('وأنيميا'), tired = at('وإرهاق'), bone = at('ونقص كالسيوم'), rash = at('وأحيانًا طفح'), none = at('وفي ناس');
  const scratching = t > rash && t < none;
  const isTired = t > tired && t < bone + 0.5;
  const bel = Math.sin(Math.PI * clamp(prog(t, bloatK - 0.1, anemia + 0.6))) * 1.0;
  const fr = t > none ? easeInOut(prog(t, none, none + 0.6)) : 0;
  drawPerson(c, CAST.karim, {
    x: lerp(560, 380, fr), y: 1760, s: 1.75, belly: bel, lean: isTired ? 0.1 : 0, headTilt: isTired ? 0.15 : 0,
    arms: scratching ? { l: [0.2, 0.3], r: [0.9, -2.2 + Math.sin(t * 22) * 0.2, 'fist'] } : bel > 0.2 ? { l: [0.1, -1.1, 'open'], r: [0.1, -1.1, 'open'] } : { l: [0.15, 0.1], r: [0.15, 0.1] },
    face: { mood: isTired ? 'tired' : scratching ? 'pain' : bel > 0.2 ? 'pain' : t > none ? 'neutral' : 'worried', blink: blinkAt(t, 3) },
  }, t);
  squiggles(c, 560, 1250, t, bel);
  if (isTired) { c.save(); setFont(c, 70, 800, EN); c.fillStyle = '#4a6fa5'; c.textAlign = 'center'; c.fillText('z', 700 + Math.sin(t * 3) * 10, 620 - ((t * 40) % 80)); c.restore(); }
  // vignettes
  bubble(c, 250, 620, 150, t, anemia, tired + 0.6, (b) => {
    b.fillStyle = '#fff1f1'; b.fillRect(-150, -150, 300, 300);
    for (const [x, y] of [[-60, -30], [40, -50], [-10, 40], [70, 40]]) { b.beginPath(); b.ellipse(x, y, 40, 30, 0.3, 0, TAU); blob(b, '#f4a6a6'); b.beginPath(); b.ellipse(x, y, 16, 10, 0.3, 0, TAU); b.fillStyle = '#e88f8f'; b.fill(); }
    setFont(b, 44, 800, EN); b.fillStyle = '#9a6a6a'; b.textAlign = 'center'; b.fillText('Fe ↓', 0, 120);
  });
  tag(c, t, 'أنيميا نقص الحديد', 250, 820, anemia + 0.2, tired + 0.6, { size: 38 });
  bubble(c, 830, 620, 130, t, tired, bone + 0.6, (b) => {
    b.fillStyle = '#f1f6ff'; b.fillRect(-130, -130, 260, 260);
    box(b, -70, -36, 130, 72, 12, '#fff'); box(b, 60, -16, 16, 32, 4, '#fff');
    b.fillStyle = C.red; b.fillRect(-62, -28, 26, 56);
  });
  tag(c, t, 'إرهاق', 830, 800, tired + 0.2, bone + 0.6, { size: 40 });
  bubble(c, 260, 620, 150, t, bone, rash + 0.4, (b) => {
    b.fillStyle = '#1d4f7a'; b.fillRect(-150, -150, 300, 300);
    b.save(); b.rotate(-0.6); b.fillStyle = '#f2f6fa';
    for (const sy of [-1, 1]) for (const sx of [-1, 1]) { b.beginPath(); b.arc(sx * 18, sy * 95, 24, 0, TAU); b.fill(); }
    b.fillRect(-18, -95, 36, 190); b.restore();
    setFont(b, 40, 800, EN); b.fillStyle = '#ffd166'; b.textAlign = 'center'; b.fillText('Ca  D', 0, 120);
  });
  tag(c, t, 'كالسيوم وفيتامين د', 260, 820, bone + 0.2, rash + 0.4, { size: 38 });
  bubble(c, 820, 640, 140, t, rash, none, (b) => {
    b.fillStyle = '#fff4ea'; b.fillRect(-140, -140, 280, 280);
    b.beginPath(); rr(b, -140, -40, 280, 90, 40); blob(b, CAST.karim.skin);
    const r = rng(2); for (let i = 0; i < 12; i++) { b.beginPath(); b.arc(-110 + r() * 220, -20 + r() * 50, 7 + r() * 5, 0, TAU); b.fillStyle = '#e5484d'; b.fill(); }
  });
  tag(c, t, 'طفح جلدي بيهرش', 820, 820, rash + 0.2, none, { size: 38 });
  // some people have no clear symptoms
  if (fr > 0) {
    drawPerson(c, CAST.kidB, { x: lerp(1300, 780, fr), y: 1700, s: 1.6, face: { mood: 'happy', blink: blinkAt(t, 4) }, arms: { r: [0.6, 0.6, 'open'] } }, t);
    tag(c, t, 'ممكن من غير أعراض', 760, 600, none + 0.4, null, { size: 44, fill: '#fff3b0' });
  }
  tag(c, t, 'بتختلف من شخص للتاني', 540, 330, SC[4] + 0.3, none, { size: 44, fill: '#ffffff' });
}

// ------------------------------------------------------------ scene 6 — diagnosis with Dr. Sanad
function lab(c, t) { wall(c, '#e6f7f5', '#cdeee9', 1450, '#8fc7bf'); box(c, 60, 300, 380, 260, 16, '#ffffff'); c.strokeStyle = '#7fd1b9'; c.lineWidth = 8; c.beginPath(); for (let i = 0; i <= 20; i++) c.lineTo(80 + i * 17, 430 + Math.sin(i + t * 4) * 30 * (i % 3 === 0 ? 1.5 : 0.4)); c.stroke(); }
function scene6(c, t, T) {
  lab(c, t);
  const blood = at('التشخيص بيبدأ'), ab = at('للأجسام المضادة'), stop = at('وإنت لسه'), scope = at('وغالبًا بيتأكد'), biopsy = at('وعينة صغيرة'), micro = at('بتتفحص');
  const stopNow = t > stop && t < scope;
  drawPerson(c, CAST.sanad, { x: 300, y: 1700, s: 1.5, arms: stopNow ? { r: [1.3, 1.5, 'open'], l: [0.15, 0.1] } : { r: [1.9, 0.5, 'point'], l: [0.15, 0.1] }, face: { mood: stopNow ? 'neutral' : 'happy', talk: TALK, blink: blinkAt(t, 1) } }, t);
  // Karim, still eating his normal diet (bread in hand), about to throw it away -> stops
  const toss = Math.sin(Math.PI * clamp(prog(t, stop, stop + 0.9)));
  box(c, 680, 1440, 240, 26, 8, '#f08a3c');
  drawPerson(c, CAST.karim, { x: 800, y: 1590, s: 1.15, legs: 'sit', flip: true, arms: { r: [0.6 + toss * 1.4, -1.2 + toss * 1.6, 'fist'], l: [0.1, 0.1] }, face: { mood: t > stop + 0.9 && t < scope ? 'happy' : 'neutral', blink: blinkAt(t, 2) } }, t);
  if (t > stop - 1 && t < scope + 0.4) drawBread(c, 800 - 110 - toss * 60, 1180 - toss * 220, 0.32, t, {});
  // blood test vignette -> lab analyser
  bubble(c, 760, 640, 170, t, blood, stop, (b) => {
    b.fillStyle = '#fff'; b.fillRect(-170, -170, 340, 340);
    if (t < ab) {
      b.beginPath(); rr(b, -170, -10, 340, 90, 40); blob(b, CAST.karim.skin);
      b.save(); b.translate(30, -10); b.rotate(-0.5); box(b, -14, -130, 28, 140, 10, '#eef4f8'); b.fillStyle = C.red; const fill = clamp(prog(t, blood + 0.3, blood + 1.4)); b.fillRect(-10, -126 + 120 * (1 - fill), 20, 120 * fill); b.restore();
    } else {
      box(b, -120, -90, 240, 180, 20, '#dfe9ef'); b.save(); b.translate(0, 0); b.rotate(t * 10);
      for (let k = 0; k < 4; k++) { b.rotate(Math.PI / 2); box(b, -8, -70, 16, 50, 6, C.red, 3); } b.restore();
      setFont(b, 30, 800, EN); b.fillStyle = INK; b.textAlign = 'center'; b.fillText('tTG-IgA', 0, 130);
    }
  });
  tag(c, t, 'تحليل دم للأجسام المضادة', 760, 870, blood + 0.4, stop, { size: 38 });
  tag(c, t, 'متبطلش الجلوتين قبل التحليل', 540, 330, stop + 0.3, scope, { size: 44, fill: '#fff3b0' });
  // endoscopy (simplified, non-graphic) -> biopsy -> microscope
  if (t > scope - 0.1) {
    const s = spring(t, scope, 10, 0.75);
    c.save(); c.globalAlpha = clamp(s * 2); c.translate(0, -150);
    box(c, 520, 380, 500, 680, 40, '#ffffff');
    if (t < biopsy) {
      c.save(); c.translate(760, 720);
      c.beginPath(); c.moveTo(-120, -240); c.quadraticCurveTo(-160, -300, -100, -320); c.quadraticCurveTo(-20, -330, -10, -260); c.lineTo(-10, -200); c.quadraticCurveTo(110, -170, 120, 60); c.lineTo(120, 280); c.lineTo(-140, 280); c.lineTo(-140, -180); c.closePath(); c.fillStyle = '#cfe9f5'; c.fill(); outline(c, 6);
      c.strokeStyle = '#f39a7a'; c.lineWidth = 26; c.lineCap = 'round'; c.beginPath(); c.moveTo(-60, -200); c.lineTo(-40, -40); c.quadraticCurveTo(40, 0, 20, 60); c.quadraticCurveTo(-10, 100, 40, 130); c.stroke();
      const sp = easeInOut(prog(t, scope + 0.2, scope + 1.4));
      c.strokeStyle = INK; c.lineWidth = 8; c.beginPath(); c.moveTo(-70, -330); c.lineTo(-60, -200); c.lineTo(-48, -200 + 160 * sp); if (sp > 0.8) c.quadraticCurveTo(30, 10, 20 * sp, 60 * sp); c.stroke();
      c.fillStyle = '#ffe36e'; c.beginPath(); c.arc(sp > 0.8 ? 20 * sp : -48, sp > 0.8 ? 60 * sp : -200 + 160 * sp, 10, 0, TAU); c.fill();
      c.restore();
      tag(c, t, 'المنظار', 770, 980, scope + 0.3, biopsy, { size: 40 });
    } else if (t < micro) {
      drawVilli(c, 560, 520, 420, 380, 0.25, t, { n: 5 });
      const g = easeInOut(prog(t, biopsy + 0.2, biopsy + 1.0));
      c.save(); c.translate(lerp(980, 780, g), lerp(420, 700, g)); c.rotate(0.7);
      box(c, -10, -260, 20, 260, 8, '#9aa5ae'); c.beginPath(); c.arc(0, 0, 20, 0, TAU); blob(c, '#9aa5ae');
      if (t > biopsy + 1.0) { c.beginPath(); c.arc(0, 0, 9, 0, TAU); c.fillStyle = '#e5484d'; c.fill(); }
      c.restore();
      tag(c, t, 'عينة صغيرة', 770, 980, biopsy + 0.4, micro, { size: 40 });
    } else {
      c.save(); c.translate(660, 900); box(c, -60, -20, 120, 30, 6, '#5a6470'); box(c, -16, -300, 32, 280, 10, '#6b7684'); box(c, -50, -330, 70, 50, 10, '#7a8694'); c.restore();
      const v = spring(t, micro + 0.3, 10, 0.7);
      if (v > 0) {
        c.save(); c.translate(850, 640); c.scale(clamp(v, 0, 1.1), clamp(v, 0, 1.1));
        c.beginPath(); c.arc(0, 0, 150, 0, TAU); c.fillStyle = '#fdf0f3'; c.fill(); outline(c, 10);
        c.save(); c.beginPath(); c.arc(0, 0, 145, 0, TAU); c.clip(); drawVilli(c, -150, -60, 300, 200, 0.22, t, { n: 4 }); c.restore();
        c.restore();
      }
      tag(c, t, 'تحت الميكروسكوب', 770, 980, micro + 0.4, null, { size: 40 });
    }
    c.restore();
  }
}

// ------------------------------------------------------------ scene 7 — treatment & recovery
function foodChar(c, kind, x, y, s, t, ph) {
  c.save(); c.translate(x, y + Math.abs(Math.sin(t * 4 + ph)) * -18); c.scale(s, s);
  if (kind === 'rice') { c.beginPath(); c.ellipse(0, -20, 80, 50, 0, Math.PI, 0); blob(c, '#ffffff'); c.beginPath(); c.moveTo(-90, -20); c.quadraticCurveTo(0, 90, 90, -20); c.closePath(); blob(c, '#5aa9e6'); }
  if (kind === 'corn') { c.beginPath(); c.ellipse(0, -10, 44, 90, 0, 0, TAU); blob(c, '#ffd23f'); for (let k = -3; k <= 3; k++) { c.beginPath(); c.moveTo(-40, k * 22); c.lineTo(40, k * 22); c.strokeStyle = 'rgba(150,110,0,0.4)'; c.lineWidth = 3; c.stroke(); } c.beginPath(); c.moveTo(-40, 50); c.quadraticCurveTo(-70, 0, -30, -70); c.lineTo(0, 70); c.closePath(); blob(c, '#6cc070'); }
  if (kind === 'potato') { c.beginPath(); c.ellipse(0, 0, 80, 60, 0.2, 0, TAU); blob(c, '#d9a86c'); c.fillStyle = 'rgba(120,80,30,0.4)'; for (const [dx, dy] of [[-40, -20], [30, 20], [10, -30]]) { c.beginPath(); c.arc(dx, dy, 5, 0, TAU); c.fill(); } }
  if (kind === 'oats') { box(c, -60, -110, 120, 160, 16, '#f6e7c8'); box(c, -66, -130, 132, 30, 10, '#c98a52'); c.fillStyle = '#e8d3a8'; c.beginPath(); c.arc(0, -40, 34, 0, TAU); c.fill(); }
  // faces
  const fy = kind === 'rice' ? -40 : kind === 'oats' ? 10 : -6;
  for (const sx of [-1, 1]) { c.beginPath(); c.arc(sx * 18, fy, 7, 0, TAU); c.fillStyle = INK; c.fill(); }
  c.beginPath(); c.arc(0, fy + 10, 14, 0.15 * Math.PI, 0.85 * Math.PI); outline(c, 5);
  c.restore();
}
function scene7(c, t, T) {
  kitchen(c, t, false);
  const gf = at('أكل خالي'), dx = at('بعد التشخيص'), alt = at('الرز والدرة'), oats = at('والشوفان'), time = at('ومع الوقت');
  drawPerson(c, CAST.sanad, { x: 260, y: 1560, s: 1.25, arms: t > oats ? { r: [1.1, 1.4, 'thumb'], l: [0.15, 0.1] } : { r: [1.6, 0.6, 'open'], l: [0.15, 0.1] }, face: { mood: 'happy', talk: TALK, blink: blinkAt(t, 1) } }, t);
  drawPerson(c, CAST.karim, { x: 840, y: 1560, s: 1.25, flip: true, arms: t > time ? { r: [2.6, 0.2, 'fist'], l: [2.6, 0.2, 'fist'] } : { r: [0.15, 0.1], l: [0.15, 0.1] }, face: { mood: t > alt ? 'happy' : 'neutral', blink: blinkAt(t, 2) } }, t);
  table(c, 1300, '#b97a46', '#fbfbf6');
  // the wheat bread slides off with a "gluten-free for life" stamp
  const slide = easeIn(prog(t, gf + 0.6, gf + 1.6));
  if (slide < 1) { drawBread(c, 540 + slide * 700, 1250, 0.55, t, { alive: t < gf ? 0 : 0.8, mood: 'sly' }); }
  tag(c, t, 'خالي من الجلوتين طول العمر', 540, 330, gf + 0.2, null, { size: 42, fill: '#e3f5e6' });
  tag(c, t, 'بعد التشخيص + متابعة دكتور وأخصائي تغذية', 540, 430, dx + 0.2, oats, { size: 32 });
  const foods = [['rice', 'رز', 300], ['corn', 'درة', 540], ['potato', 'بطاطس', 780]];
  foods.forEach(([k, label, x], i) => {
    const s = spring(t, alt + 0.1 + i * 0.35, 10, 0.55);
    if (s <= 0) return;
    foodChar(c, k, x, 1240 - (1 - clamp(s, 0, 1)) * 600, 0.9, t, i);
    tag(c, t, label, x, 1350, alt + 0.4 + i * 0.35, null, { size: 36 });
  });
  const os = spring(t, oats, 10, 0.6);
  if (os > 0) {
    foodChar(c, 'oats', 540, 980 - (1 - clamp(os, 0, 1)) * 400, 1.1, t, 4);
    tag(c, t, 'شوفان مضمون خالي من الجلوتين', 540, 780, oats + 0.3, null, { size: 36, fill: '#fff3b0' });
  }
  // recovery: villi regrow over time (no fixed timeline)
  const rec = easeInOut(prog(t, time, time + 2.2));
  if (t > time - 0.2) {
    c.save(); const s = spring(t, time, 10, 0.7); c.translate(540, 640); c.scale(clamp(s, 0, 1.1), clamp(s, 0, 1.1));
    box(c, -300, -200, 600, 400, 36, '#ffe9ee'); c.save(); rr(c, -300, -200, 600, 400, 36); c.clip(); drawVilli(c, -290, -170, 580, 360, 0.2 + 0.75 * rec, t, { n: 7 }); c.restore();
    c.restore();
    tag(c, t, 'الأمعاء بتتعافى مع الوقت', 540, 900, time + 0.4, null, { size: 40, fill: '#e3f5e6' });
  }
}

// ------------------------------------------------------------ scene 8 — Dr. Sanad closing
function studio(c, t) {
  const g = c.createRadialGradient(540, 700, 100, 540, 900, 1300); g.addColorStop(0, '#1f5fa8'); g.addColorStop(1, '#0a2448');
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  c.strokeStyle = 'rgba(150,215,255,0.09)'; c.lineWidth = 3;
  for (let row = 0; row < 16; row++) for (let col = 0; col < 8; col++) {
    const R = 80, x = col * R * 1.75 + (row % 2) * R * 0.875 - 40, y = row * R * 1.52 - 60 - (t * 8) % (R * 3.04);
    c.beginPath(); for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + k * Math.PI / 3; c.lineTo(x + Math.cos(a) * R * 0.9, y + Math.sin(a) * R * 0.9); } c.closePath(); c.stroke();
  }
}
function scene8(c, t, T) {
  studio(c, t);
  const intro = SC[7], msg = at('أساس العلاج'), follow = at('تابعنا');
  const wave = t < at('وبقولك') ? Math.sin(t * 9) * 0.35 : 0;
  const s = spring(t, intro, 7, 0.8);
  drawPerson(c, CAST.sanad, { x: 540, y: 1800 + (1 - clamp(s, 0, 1.1)) * 700, s: 1.85, lean: Math.sin(t * 1.2) * 0.015,
    arms: t < at('وبقولك') ? { r: [2.6 + wave, 0.3, 'open'], l: [0.15, 0.1] } : t < follow ? { r: [1.1, 1.5, 'open'], l: [0.15, 0.1] } : { r: [0.9, -1.6, 'point'], l: [0.15, 0.1] },
    face: { mood: 'happy', talk: TALK, blink: blinkAt(t, 1) } }, t);
  riseText(c, CONFIG.doctorName, 540, 385, t, intro + 0.4, null, { size: 70 });
  riseText(c, CONFIG.doctorTitle, 540, 462, t, intro + 0.8, null, { size: 36, weight: 600, color: C.teal });
  const ps = spring(t, msg - 0.1, 10, 0.75);
  if (ps > 0) { c.save(); c.globalAlpha = clamp(ps * 2); rr(c, 90, 1250 + (1 - clamp(ps, 0, 1)) * 60, 900, 230, 40); c.fillStyle = 'rgba(8,24,48,0.9)'; c.fill(); c.lineWidth = 5; c.strokeStyle = C.teal; c.stroke(); c.restore(); }
  riseText(c, 'أساس العلاج الصح', 540, 1320, t, msg, null, { size: 62 });
  riseText(c, 'هو التشخيص الصح', 540, 1410, t, msg + 0.5, null, { size: 66, colors: { 1: C.teal, 2: C.teal } });
  // logo animation
  const ls = spring(t, intro + 0.2, 9, 0.55);
  if (MARK && ls > 0) { c.save(); c.translate(540, 230); c.rotate((1 - clamp(ls, 0, 1)) * -2.5); const k = 140 * clamp(ls, 0, 1.15); c.drawImage(MARK, -k / 2, -k / 2, k, k); c.restore(); }
  tag(c, t, 'تابعنا لمعلومات طبية أكتر', 540, 1535, follow + 0.1, null, { size: 40, fill: C.teal });
}

// ------------------------------------------------------------ captions, watermark, compositor
function captions(c, T) {
  if (NOSUBS) return;
  const cap = TL.captions.find(([a, b]) => T >= a && T < b);
  if (!cap) return;
  const s = spring(T, cap[0], 22, 0.85);
  c.save(); c.direction = 'rtl'; setFont(c, 46, 800); c.textAlign = 'center'; c.textBaseline = 'middle';
  const w = c.measureText(cap[2]).width + 64, y = 1620 + (1 - s) * 16;
  rr(c, 540 - w / 2, y - 42, w, 84, 26); c.fillStyle = 'rgba(14,22,38,0.82)'; c.fill();
  c.fillStyle = '#ffffff'; c.fillText(cap[2], 540, y + 2); c.restore();
}
function watermark(c, t) {
  if (!MARK || t > SC[7] - 0.2) return;
  c.save(); c.globalAlpha = 0.9; c.direction = 'rtl'; setFont(c, 30, 800); c.textBaseline = 'middle'; c.textAlign = 'right';
  const name = CONFIG.logoName, tw = c.measureText(name).width, ms = 56, total = ms + 12 + tw, right = 540 + total / 2;
  rr(c, 540 - total / 2 - 18, 120, total + 36, 72, 36); c.fillStyle = 'rgba(14,22,38,0.55)'; c.fill();
  c.drawImage(MARK, right - ms, 156 - ms / 2, ms, ms); c.fillStyle = '#fff'; c.fillText(name, right - ms - 12, 158);
  c.restore();
}
const SCENES = [scene1, scene2, scene3, scene4, scene5, scene6, scene7, scene8];
const BUF = mk(W, H), bctx = BUF.getContext('2d');
function drawScene(i, c, t, T) { c.save(); SCENES[i](c, t, T); c.restore(); }
function sceneIndex(t) { let i = 0; for (let k = 0; k < SC.length; k++) if (t >= SC[k]) i = k; return i; }

function seek(T) {
  const t = clamp(T, 0, TL.duration);
  TALK = talkLevel(T);
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.filter = 'none';
  const i = sceneIndex(t), D = 0.7, tr = prog(t, SC[i] - 0.001, SC[i] + D);
  const prev = i > 0 && tr < 1 ? i - 1 : -1;
  // history scene renders through a sepia "old film" pass
  const paint = (k, c) => {
    if (k === 3) {
      bctx.setTransform(1, 0, 0, 1, 0, 0); bctx.clearRect(0, 0, W, H); drawScene(k, bctx, t, T);
      c.save(); c.filter = 'sepia(0.75) saturate(0.85) contrast(1.05)'; c.drawImage(BUF, 0, 0); c.restore();
      c.save(); c.globalAlpha = 0.08; c.fillStyle = '#000'; const r = rng(Math.floor(t * 24)); for (let n = 0; n < 6; n++) c.fillRect(r() * W, 0, 2, H); c.restore();
    } else drawScene(k, c, t, T);
  };
  if (prev < 0) paint(i, ctx);
  else {
    const e = easeInOut(tr);
    // per-transition styles: 1 bread-roll wipe, 2 poster zoom-through, 3 iris to the past, 4 page lift,
    // 5 slide, 6 iris out of the microscope, 7 rise to the studio
    if (i === 1 || i === 4 || i === 5) {
      const x = lerp(W + 200, -200, e);
      ctx.save(); ctx.beginPath(); ctx.rect(x, 0, W, H); ctx.clip(); paint(prev, ctx); ctx.restore();
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, x, H); ctx.clip(); paint(i, ctx); ctx.restore();
      if (i === 1) drawBread(ctx, x, 1300, 1.3, t, { rot: -t * 8, alive: 1, mood: 'sly' });
      else { ctx.fillStyle = C.teal; ctx.fillRect(x - 6, 0, 12, H); }
    } else if (i === 2) {
      ctx.save(); ctx.translate(770, 520); ctx.scale(1 + e * 4, 1 + e * 4); ctx.translate(-770, -520); ctx.globalAlpha = 1 - e; paint(prev, ctx); ctx.restore();
      ctx.save(); ctx.globalAlpha = e; ctx.translate(540, 900); ctx.scale(0.6 + 0.4 * e, 0.6 + 0.4 * e); ctx.translate(-540, -900); paint(i, ctx); ctx.restore();
    } else if (i === 3 || i === 6) {
      const r1 = 1300 * (1 - easeIn(prog(t, SC[i], SC[i] + D / 2))), r2 = 1300 * easeOut(prog(t, SC[i] + D / 2, SC[i] + D));
      ctx.fillStyle = INK; ctx.fillRect(0, 0, W, H);
      if (tr < 0.5) { ctx.save(); ctx.beginPath(); ctx.arc(540, 800, r1, 0, TAU); ctx.clip(); paint(prev, ctx); ctx.restore(); }
      else { ctx.save(); ctx.beginPath(); ctx.arc(540, 800, r2, 0, TAU); ctx.clip(); paint(i, ctx); ctx.restore(); }
    } else {
      paint(i, ctx);
      ctx.save(); ctx.translate(0, -H * e); paint(prev, ctx); ctx.restore();
    }
  }
  watermark(ctx, t);
  captions(ctx, T);
}

function loadImg(src) { return new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; }); }
window.seek = seek;
window.ready = (async () => {
  TL = await (await fetch('timing.json')).json(); SC = TL.scenes;
  try { ENV = await (await fetch('vo_env.json')).json(); } catch (e) { ENV = null; }
  window.DURATION = TL.duration;
  await Promise.all(['800 64px Cairo', '700 64px Cairo', '600 64px Cairo', '800 64px Inter', '700 64px Inter'].map((f) => document.fonts.load(f, 'السيلياك BAKKERIJ tTG')));
  MARK = await loadImg(CONFIG.logoMark);
  window.HAS_DOCTOR = !!MARK;
  seek(0);
  return true;
})();

if (!RENDER) {
  document.body.classList.add('preview');
  const bar = Object.assign(document.createElement('input'), { type: 'range', min: 0, max: 120, step: 0.01, value: 0, id: 'bar' });
  const lab = document.createElement('div'); document.body.append(bar, lab);
  let playing = true, t0 = performance.now(), base = 0;
  bar.oninput = () => { base = +bar.value; t0 = performance.now(); seek(base); };
  addEventListener('keydown', (e) => { if (e.code === 'Space') { playing = !playing; base = +bar.value; t0 = performance.now(); } });
  window.ready.then(() => {
    bar.max = window.DURATION;
    const loop = () => { if (playing) { const t = (base + (performance.now() - t0) / 1000) % window.DURATION; bar.value = t; seek(t); } lab.textContent = `${(+bar.value).toFixed(2)}s`; requestAnimationFrame(loop); };
    loop();
  });
}
