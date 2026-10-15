// SIBO (فرط نمو البكتيريا في الأمعاء الدقيقة) — 2D cartoon episode with Dr. Sanad as presenter. 1080x1920, 30 fps, pure function of time.
// Characters come from rig.js; every action is keyed to a narration phrase in timing.json via at().
import { clamp, lerp, prog, easeOut, easeIn, easeInOut, spring, rng } from './motion.js';
import { drawPerson, drawHead, CAST, drawBread, drawGluten, drawImmune, drawVilli, box, rr, outline, blob, INK } from './rig.js';
import { CONFIG } from './config.js';
import { drawSanad } from './sanad.js';

const W = 1080, H = 1920, TAU = Math.PI * 2;
const cv = document.getElementById('c');
const ctx = cv.getContext('2d');
const QS = new URLSearchParams(location.search);
const RENDER = QS.has('render'), NOSUBS = QS.has('nosubs');
const AR = "'Cairo', 'Noto Kufi Arabic', sans-serif", EN = "'Inter', sans-serif";
const C = { navy: '#0b2a52', teal: '#2fd0c0', tealDeep: '#0f8f86', orange: '#ff8a3d', white: '#ffffff', red: '#e5484d', cream: '#fff6e6' };

let TL = { duration: 112, scenes: [0, 6, 18, 32, 40, 64, 78, 90, 102], captions: [] };
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

function kitchen(c, t, shelf = true) {
  wall(c, '#ffe9c9', '#ffd9a8', 1420, '#e2a46a');
  c.fillStyle = 'rgba(255,255,255,0.35)'; for (let x = 0; x < W; x += 90) for (let y = 980; y < 1180; y += 90) { c.beginPath(); rr(c, x + 6, y + 6, 78, 78, 8); c.fill(); }
  windowFrame(c, 640, 330, 320, 300, '#9fdcff', t);
  if (shelf) { box(c, 90, 420, 360, 24, 6, '#b8774a');
  for (const [x, col] of [[130, '#ff9f68'], [210, '#ffd166'], [290, '#7fd1b9'], [370, '#f78fb3']]) box(c, x - 26, 360, 52, 60, 12, col); }
  plant(c, 960, 1280, t);
}
function lab(c, t) { wall(c, '#e6f7f5', '#cdeee9', 1450, '#8fc7bf'); box(c, 60, 300, 380, 260, 16, '#ffffff'); c.strokeStyle = '#7fd1b9'; c.lineWidth = 8; c.beginPath(); for (let i = 0; i <= 20; i++) c.lineTo(80 + i * 17, 430 + Math.sin(i + t * 4) * 30 * (i % 3 === 0 ? 1.5 : 0.4)); c.stroke(); }
function studio(c, t) {
  const g = c.createRadialGradient(540, 700, 100, 540, 900, 1300); g.addColorStop(0, '#1f5fa8'); g.addColorStop(1, '#0a2448');
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  c.strokeStyle = 'rgba(150,215,255,0.09)'; c.lineWidth = 3;
  for (let row = 0; row < 16; row++) for (let col = 0; col < 8; col++) {
    const R = 80, x = col * R * 1.75 + (row % 2) * R * 0.875 - 40, y = row * R * 1.52 - 60 - (t * 8) % (R * 3.04);
    c.beginPath(); for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + k * Math.PI / 3; c.lineTo(x + Math.cos(a) * R * 0.9, y + Math.sin(a) * R * 0.9); } c.closePath(); c.stroke();
  }
}
// ------------------------------------------------------------ speech: mouth shapes driven by the narration audio
// Simplified lip animation: the voice loudness (vo_env.json) opens the mouth; syllable-sized steps cycle through
// the visemes A/E/O/F, closing to M in short dips and to rest in pauses. Not phoneme-accurate lip sync.
let SP = { talk: 0, viseme: 'rest', brow: 0, nod: 0 };
function speech(T) {
  let v;
  if (ENV) { const i = Math.floor(T * ENV.fps); v = clamp((ENV.v[i] || 0) * 1.4); }
  else v = TL.captions.some(([a, b]) => T >= a && T < b - 0.12) ? clamp(0.5 + 0.45 * Math.sin(T * 17) * Math.sin(T * 6.3)) : 0;
  const inCap = TL.captions.some(([a, b]) => T >= a - 0.05 && T < b);
  const k = Math.floor(T * 7.5), h = ((k * 2654435761) >>> 0) % 8;
  const viseme = v < 0.12 ? (inCap ? 'M' : 'rest') : ['A', 'E', 'O', 'A', 'E', 'F', 'A', 'O'][h];
  let vPrev = 0;
  if (ENV) { const j = Math.floor((T - 0.25) * ENV.fps); vPrev = clamp((ENV.v[j] || 0) * 1.4); }
  return { talk: v, viseme, brow: clamp((v - vPrev - 0.25) * 2.5) * 0.9, nod: Math.sin(T * 3.1) * 0.035 * v };
}
const docFace = (t, mood = 'happy', extraBrow = 0) => ({ mood, talk: SP.talk, viseme: SP.viseme, brows: SP.brow + extraBrow, blink: blinkAt(t, 1) });
// Dr. Sanad is drawn with the illustrated presenter rig (sanad.js), waist-up, coat running off the bottom.
// Scene code places him by the feet position (x, y) and scale s of a full figure; this maps that to the bust.
function doctor(c, t, pose) {
  const s = pose.s || 1, hs = s * 0.62, walking = pose.legs === 'walk';
  const bob = walking ? -Math.abs(Math.sin((pose.walk || 0))) * 10 : Math.sin(t * 1.6) * 2;
  const map = (a) => a ? [a[0], a[1], a[2] === 'fist' ? 'rest' : a[2] || 'rest'] : [0.08, 0.1, 'rest'];
  drawSanad(c, { x: pose.x, y: pose.y - 250 * s + bob, s: hs, flip: pose.flip, lean: pose.lean || 0,
    headTilt: (pose.headTilt || 0) + SP.nod, look: pose.look || [0, 0],
    arms: { l: map(pose.arms && pose.arms.l), r: map(pose.arms && pose.arms.r) },
    face: pose.face || docFace(t, pose.mood) }, t);
}
function wallClock(c, x, y, r, t, speed = 1) {
  c.beginPath(); c.arc(x, y, r, 0, TAU); c.fillStyle = '#fff'; c.fill(); outline(c, 6);
  c.strokeStyle = INK; c.lineCap = 'round';
  c.lineWidth = 7; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(t * 0.3 * speed - 1.5) * r * 0.45, y + Math.sin(t * 0.3 * speed - 1.5) * r * 0.45); c.stroke();
  c.lineWidth = 5; c.strokeStyle = C.orange; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(t * 3 * speed - 1.5) * r * 0.75, y + Math.sin(t * 3 * speed - 1.5) * r * 0.75); c.stroke();
}
function bug(c, x, y, s, t, ph = 0, col = '#5cc98a') {
  c.save(); c.translate(x + Math.sin(t * 3 + ph) * 4, y + Math.cos(t * 2.4 + ph) * 3); c.rotate(Math.sin(t * 2 + ph) * 0.4); c.scale(s, s);
  c.beginPath(); c.ellipse(0, 0, 26, 14, 0, 0, TAU); blob(c, col);
  for (let k = -1; k <= 1; k++) { c.beginPath(); c.moveTo(-26, k * 6); c.quadraticCurveTo(-36, k * 6 + Math.sin(t * 12 + k + ph) * 5, -44, k * 8); c.strokeStyle = INK; c.lineWidth = 2.5; c.stroke(); }
  for (const sx of [6, 16]) { c.beginPath(); c.arc(sx, -3, 3.2, 0, TAU); c.fillStyle = INK; c.fill(); }
  c.beginPath(); c.arc(11, 4, 4, 0.1 * Math.PI, 0.9 * Math.PI); c.lineWidth = 2.5; c.stroke();
  c.restore();
}
function bellyBalloon(c, x, y, s, amt) {
  if (amt <= 0.2) return;
  c.save(); c.globalAlpha = clamp((amt - 0.2) * 1.5); c.fillStyle = 'rgba(255,255,255,0.55)';
  c.beginPath(); c.ellipse(x - 40 * s, y, 18 * s * amt, 34 * s * amt, -0.4, 0, TAU); c.fill(); c.restore();
}

// ------------------------------------------------------------ scene 1 — the balloon belly
function scene1(c, t, T) {
  kitchen(c, t);
  const q = at('بطنك بتنتفخ'), after = at('بعد الأكل'), stay = at('خليك معايا');
  wallClock(c, 850, 470, 70, t, t > after - 0.3 && t < after + 1.2 ? 8 : 1);
  const eat = t < after ? 1 : 0;
  const spoon = eat ? Math.max(0, Math.sin(t * 5)) : 0;
  const inflate = clamp(spring(t, after + 0.1, 6, 0.35), 0, 1.4) * 1.7;
  const wobble = inflate > 0 ? Math.sin(t * 14) * 0.08 * Math.exp(-(t - after) * 1.5) : 0;
  const mood = t < after - 0.1 ? 'happy' : t < after + 0.6 ? 'surprised' : 'pain';
  drawPerson(c, CAST.karim, {
    x: 520, y: 1600, s: 1.45, legs: 'sit', belly: inflate + wobble, lean: inflate > 0.5 ? -0.05 : 0,
    arms: eat ? { r: [0.35, -1.2 - spoon * 1.0, 'fist'], l: [0.25, -0.9, 'fist'] } : { r: [0.25, -1.0 - inflate * 0.2, 'open'], l: [0.25, -1.0 - inflate * 0.2, 'open'] },
    face: { mood, blink: blinkAt(t, 2), talk: eat ? spoon * 0.4 : 0 }, look: t > after + 0.4 ? [0.3, 0.9] : [0, 0],
  }, t);
  bellyBalloon(c, 520, 1150, 1.45, inflate);
  if (inflate > 1) squiggles(c, 560, 1050, t, clamp(inflate - 1));
  if (t > after + 0.5) sweat(c, 610, 640, t, 1);
  table(c, 1340, '#b97a46', '#fbfbf6');
  // plate: food disappears while eating
  c.beginPath(); c.ellipse(520, 1330, 120, 30, 0, 0, TAU); blob(c, '#ffffff');
  const left = 1 - clamp(prog(t, 0, after));
  if (left > 0) { c.beginPath(); c.ellipse(520, 1318, 80 * left, 18 * left, 0, Math.PI, 0); blob(c, '#e8a25a'); }
  tag(c, t, 'بعد الأكل بعشر دقايق', 540, 330, after, stay, { size: 44, fill: '#fff3b0' });
  // the doctor walks in, then turns to the viewer
  const walk = prog(t, stay - 0.6, stay + 0.4);
  if (walk > 0) {
    const turned = walk >= 1;
    doctor(c, t, { x: lerp(1280, 860, easeOut(walk)), y: 1640, s: 1.3, flip: !turned, legs: turned ? 'stand' : 'walk', walk: t * 7,
      arms: turned ? { r: [2.4 + Math.sin(t * 6) * 0.15, 0.3, 'open'], l: [0.15, 0.1] } : { r: [0.2, 0.1], l: [0.2, 0.1] }, look: turned ? [0, 0] : [-1, 0] });
  }
}

// ------------------------------------------------------------ scene 2 — doctor after doctor
function hallway(c, t) {
  wall(c, '#e3eef7', '#d2e2ef', 1440, '#a9c3d6');
  [['١', 160], ['٢', 540], ['٣', 920]].forEach(([n, x]) => {
    box(c, x - 120, 640, 240, 800, 10, '#f7e9cf'); c.beginPath(); c.arc(x + 85, 1060, 12, 0, TAU); blob(c, '#c9a45c');
    box(c, x - 80, 560, 160, 60, 12, '#5aa9e6'); c.direction = 'rtl'; setFont(c, 34, 800); c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(`عيادة ${n}`, x, 592);
  });
}
function scene2(c, t, T) {
  hallway(c, t);
  const tour = at('ولفّيت'), each = at('وكل مرة'), noFix = at('والعلاج مش'), real = at('القولون العصبي تشخيص'), last = at('بس لما الأعراض'), other = at('ساعات بنحتاج');
  // Karim walks from door to door (left to right in screen = RTL story order right-to-left)
  const doors = [920, 540, 160];
  const pos = clamp(prog(t, SC[1], noFix) * 2.6);
  const di = Math.min(2, Math.floor(pos)), fr = pos - di;
  let kx = lerp(doors[di], doors[Math.min(2, di + 1)], easeInOut(clamp(fr * 1.6 - 0.6)));
  const walking = fr > 0.4 && fr < 0.99 && di < 2;
  const dr = t > real - 0.4;
  if (dr) kx = lerp(kx, 270, easeInOut(prog(t, real - 0.4, real + 0.4)));
  drawPerson(c, CAST.karim, { x: kx, y: 1660, s: 1.25, flip: !dr, legs: walking ? 'walk' : 'stand', walk: t * 7, belly: 0.9,
    arms: { l: [0.1, -1.1, 'open'], r: [0.1, -1.1, 'open'] }, face: { mood: t > noFix ? 'sad' : 'worried', blink: blinkAt(t, 3) }, look: dr ? [1, 0] : [0, 0] }, t);
  // each clinic: a doctor peeks out, the same answer every time
  for (let k = 0; k < 3; k++) {
    const tk = each + k * 0.55;
    tag(c, t, 'قولون عصبي', doors[k], 470, tk, real - 0.3, { size: 38, fill: '#ffffff', rot: k % 2 ? 4 : -4 });
  }
  bubble(c, kx + 150, 820, 110, t, noFix + 0.1, real - 0.2, (b) => {
    b.fillStyle = '#fff7ec'; b.fillRect(-110, -110, 220, 220);
    box(b, -60, -30, 120, 70, 16, '#ffffff'); b.fillStyle = '#5aa9e6'; b.fillRect(-56, -26, 112, 20);
    setFont(b, 70, 800, EN); b.fillStyle = C.red; b.textAlign = 'center'; b.textBaseline = 'middle'; b.fillText('?', 0, 70);
  }, { tail: [-60, 150] });
  if (dr) {
    const inn = spring(t, real - 0.4, 8, 0.8);
    doctor(c, t, { x: lerp(1300, 780, clamp(inn, 0, 1.05)), y: 1680, s: 1.35, flip: true,
      arms: t > other ? { r: [1.0, -1.7, 'fist'], l: [0.15, 0.1] } : { r: [0.55, 0.75, 'present'], l: [0.15, 0.1] }, look: [-0.6, 0] });
    if (t > other) {
      const s = spring(t, other + 0.1, 10, 0.6);
      c.save(); c.translate(690, 1090); c.scale(clamp(s, 0, 1.2), clamp(s, 0, 1.2)); c.rotate(-0.5);
      c.beginPath(); c.arc(0, 0, 54, 0, TAU); c.fillStyle = 'rgba(190,240,255,0.5)'; c.fill(); outline(c, 10);
      box(c, -11, 54, 22, 80, 10, '#7a5230'); c.restore();
    }
    tag(c, t, 'IBS تشخيص حقيقي ✓', 540, 330, real + 0.2, last, { size: 42, fill: '#e3f5e6' });
    tag(c, t, 'الأعراض مستمرة؟', 540, 330, last + 0.1, other, { size: 44, fill: '#fff3b0' });
    tag(c, t, 'ندوّر على أسباب تانية', 540, 330, other + 0.2, null, { size: 44, fill: '#fff3b0' });
  }
}

// ------------------------------------------------------------ scene 3 — what SIBO is (digestive map)
const SMALL3 = (() => { const pts = []; for (let k = 0; k < 7; k++) { const y = 770 + k * 62, a = k % 2 ? 620 : 340, b = k % 2 ? 340 : 620; for (let i = 0; i <= 10; i++) pts.push([lerp(a, b, i / 10), y]); if (k < 6) for (let i = 1; i < 8; i++) { const ang = -Math.PI / 2 + (i / 8) * Math.PI; pts.push([b + (k % 2 ? -1 : 1) * Math.cos(ang) * 31, y + 31 + Math.sin(ang) * 31]); } } return pts; })();
function gutMap(c, t, over) {
  box(c, 60, 360, 960, 1060, 50, '#fdf6ee');
  // stomach
  c.save(); c.translate(560, 560); c.rotate(-0.3); c.beginPath(); c.ellipse(0, 0, 110, 70, 0, 0, TAU); blob(c, '#ffb3a7'); c.restore();
  // colon frame
  c.strokeStyle = INK; c.lineCap = 'round'; c.lineJoin = 'round';
  const colon = () => { c.beginPath(); c.moveTo(230, 1250); c.lineTo(230, 700); c.lineTo(850, 700); c.lineTo(850, 1250); c.lineTo(640, 1300); };
  c.lineWidth = 104; colon(); c.stroke(); c.strokeStyle = '#d9925a'; c.lineWidth = 90; colon(); c.stroke();
  // small intestine coils
  c.lineJoin = 'round'; c.strokeStyle = INK; c.lineWidth = 50; c.beginPath(); SMALL3.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.stroke();
  c.strokeStyle = '#ff9fb0'; c.lineWidth = 38; c.beginPath(); SMALL3.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.stroke();
  // bacteria: many in the colon; few in the small intestine — until they overgrow
  const r = rng(21);
  for (let i = 0; i < 26; i++) {
    const side = i % 3, u = r();
    const x = side === 0 ? 230 + (r() - 0.5) * 50 : side === 1 ? 850 + (r() - 0.5) * 50 : 260 + u * 560, y = side === 2 ? 700 + (r() - 0.5) * 50 : 740 + u * 500;
    bug(c, x, y, 0.75, t, i, '#8bc34a');
  }
  const nSmall = Math.round(3 + 22 * over);
  for (let i = 0; i < nSmall; i++) {
    const seg = SMALL3[(i * 11) % (SMALL3.length - 1)], nxt = SMALL3[(i * 11) % (SMALL3.length - 1) + 1], u = ((i * 0.37) % 1);
    const birth = i < 3 ? 1 : clamp((over * 22 - (i - 3)) * 1.5);
    if (birth <= 0) continue;
    bug(c, lerp(seg[0], nxt[0], u), lerp(seg[1], nxt[1], u), 0.7 * easeOut(birth), t, i + 50, '#5cc98a');
  }
}
function scene3(c, t, T) {
  const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0f6f78'); g.addColorStop(1, '#0a3f5c'); c.fillStyle = g; c.fillRect(0, 0, W, H);
  const name = at('اسمه SIBO'), mean = at('يعني فرط'), normal = at('الأمعاء الدقيقة طبيعي'), colonK = at('والكمية الكبيرة'), sibo = at('لكن في SIBO'), wrong = at('البكتيريا بتزيد في المكان');
  const over = easeInOut(prog(t, wrong - 0.2, wrong + 2.0));
  c.save(); c.translate(-40, 0); gutMap(c, t, over);
  tag(c, t, 'الأمعاء الدقيقة', 470, 980, normal, null, { size: 36, fill: '#ffe1e6' });
  tag(c, t, 'القولون', 230, 650, colonK, null, { size: 36, fill: '#ffe8d2' });
  if (over > 0) {
    // arrows: overgrowth in the wrong place
    for (const [x, y] of [[300, 900], [560, 1000]]) { c.save(); c.globalAlpha = over; c.strokeStyle = C.red; c.lineWidth = 10; c.lineCap = 'round'; c.beginPath(); c.moveTo(x, y + 60); c.lineTo(x, y - 20); c.moveTo(x - 20, y); c.lineTo(x, y - 24); c.lineTo(x + 20, y); c.stroke(); c.restore(); }
  }
  c.restore();
  // title
  const ts = spring(t, name, 11, 0.55);
  if (ts > 0) { c.save(); c.translate(540, 285); c.scale(clamp(ts, 0, 1.2), clamp(ts, 0, 1.2)); setFont(c, 110, 800, EN); c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineWidth = 14; c.strokeStyle = INK; c.strokeText('SIBO', 0, 0); c.fillStyle = C.orange; c.fillText('SIBO', 0, 0); c.restore(); }
  tag(c, t, 'فرط نمو البكتيريا في الأمعاء الدقيقة', 540, 1480, mean, null, { size: 38, fill: '#ffffff' });
  tag(c, t, 'في المكان الغلط!', 540, 395, wrong + 0.3, null, { size: 40, fill: '#ffe1e1' });
  doctor(c, t, { x: 930, y: 1690, s: 1.05, flip: true, arms: { r: [1.9, 0.4, 'point'], l: [0.15, 0.1] }, look: [-0.8, -0.4] });
}

// ------------------------------------------------------------ scene 4 — bacteria + food -> gas -> bloating
function scene4(c, t, T) {
  const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#ffd9df'); g.addColorStop(1, '#f6a8b6'); c.fillStyle = g; c.fillRect(0, 0, W, H);
  const feed = at('البكتيريا الزيادة دي'), gas = at('وبتطلّع غازات'), swell = at('فالأمعاء تنتفخ'), feel = at('وتحس بالانتفاخ');
  const bubbles = clamp(prog(t, gas, swell + 1.5));
  const bulge = easeInOut(prog(t, swell - 0.2, swell + 1.0));
  const cy = 860, base = 250 + bulge * 120;
  // the tube (inner lumen) with folded walls
  const edge = (sgn) => { c.beginPath(); for (let x = -20; x <= W + 20; x += 20) { const y = cy + sgn * (base + Math.sin(x / 60 + t * 2) * 12 + Math.sin(x / 23) * 6); x > -20 ? c.lineTo(x, y) : c.moveTo(x, y); } };
  c.fillStyle = '#c4566c'; c.fillRect(0, 0, W, H);
  c.beginPath(); for (let x = -20; x <= W + 20; x += 20) c.lineTo(x, cy - (base + Math.sin(x / 60 + t * 2) * 12 + Math.sin(x / 23) * 6));
  for (let x = W + 20; x >= -20; x -= 20) c.lineTo(x, cy + (base + Math.sin(x / 60 + t * 2) * 12 + Math.sin(x / 23) * 6));
  c.closePath(); c.fillStyle = '#ffe3e8'; c.fill();
  edge(-1); outline(c, 8); edge(1); outline(c, 8);
  // food pieces flowing through
  const r = rng(31);
  for (let i = 0; i < 9; i++) {
    const ph = (t * 0.08 + r()) % 1, x = lerp(-80, W + 80, ph), y = cy + (r() - 0.5) * base;
    const eaten = t > feed ? clamp((t - feed) * 0.6 - r() * 0.5) : 0;
    const s = 1 - 0.7 * eaten;
    c.save(); c.translate(x, y); c.rotate(ph * 6); c.beginPath();
    if (i % 3 === 0) c.ellipse(0, 0, 34 * s, 22 * s, 0, 0, TAU); else if (i % 3 === 1) { c.moveTo(-28 * s, 20 * s); c.lineTo(0, -26 * s); c.lineTo(28 * s, 20 * s); c.closePath(); } else rr(c, -24 * s, -24 * s, 48 * s, 48 * s, 12 * s);
    blob(c, ['#ffd166', '#9ad97a', '#e8a25a'][i % 3]); c.restore();
  }
  // bacteria munching
  for (let i = 0; i < 9; i++) {
    const x = 90 + i * 112, y = cy + ((i % 2) ? 1 : -1) * base * 0.55;
    bug(c, x, y, 1.15, t * (t > feed ? 1.6 : 1), i);
  }
  // gas bubbles rise and gather
  if (bubbles > 0) {
    for (let i = 0; i < 40 * bubbles; i++) {
      const ph = (t * 0.5 + i * 0.137) % 1, x = 60 + ((i * 97) % 960), y = cy + base * 0.6 - ph * base * 1.3;
      c.beginPath(); c.arc(x, y, 8 + (i % 4) * 5, 0, TAU); c.fillStyle = 'rgba(255,255,255,0.85)'; c.fill(); c.lineWidth = 3; c.strokeStyle = 'rgba(29,36,51,0.5)'; c.stroke();
    }
  }
  tag(c, t, 'البكتيريا بتتغذى على الأكل', 540, 300, feed + 0.2, gas, { size: 42 });
  tag(c, t, 'غازات', 540, 300, gas + 0.1, swell, { size: 48, fill: '#e6f0ff' });
  tag(c, t, 'الأمعاء بتنتفخ', 540, 300, swell + 0.1, null, { size: 46, fill: '#fff3b0' });
  // link to the patient
  bubble(c, 790, 1460, 200, t, feel - 0.1, null, (b) => {
    b.fillStyle = '#eaf4ff'; b.fillRect(-200, -200, 400, 400);
    drawPerson(b, CAST.karim, { x: 0, y: 520, s: 1.0, belly: 1.4 + Math.sin(t * 10) * 0.05, arms: { l: [0.1, -1.1, 'open'], r: [0.1, -1.1, 'open'] }, face: { mood: 'pain', blink: blinkAt(t) } }, t);
  });
}

// ------------------------------------------------------------ scene 5 — history (educational reconstruction)
function oldLab(c, t) {
  wall(c, '#efe2c8', '#e0cfae', 1440, '#9a7a52');
  box(c, 620, 330, 380, 420, 8, '#c9b48e'); for (let k = 0; k < 4; k++) box(c, 640, 350 + k * 100, 340, 80, 6, ['#7a4a3a', '#4a5a6a', '#6a6a3a', '#5a3a4a'][k], 4);
  box(c, -20, 1260, W + 40, 60, 8, '#7a5a3a');
  for (let k = 0; k < 3; k++) { c.beginPath(); c.moveTo(640 + k * 110, 1260); c.lineTo(660 + k * 110, 1150); c.lineTo(700 + k * 110, 1150); c.lineTo(720 + k * 110, 1260); c.closePath(); blob(c, ['#cfe9d8', '#f2d9a6', '#e8c0c0'][k]); }
}
function scene5(c, t, T) {
  const old = at('والفكرة مش'), mech = at('العالم إيليا'), surg = at('وبعدها الأطبا'), loop = at('في الأمعاء اسمه الحلقة'), b12 = at('وبتسبب نقص'), y2000 = at('وفي سنة'), pim = at('الباحث مارك'), still = at('والموضوع لسه');
  const part = t < surg - 0.2 ? 0 : t < y2000 - 0.2 ? 1 : 2;
  if (part === 0) {
    oldLab(c, t);
    drawPerson(c, CAST.mech, { x: 420, y: 1720, s: 1.4, arms: { r: [0.5, -1.5, 'fist'], l: [0.3, -1.4, 'fist'] }, face: { mood: 'neutral', blink: blinkAt(t, 6) }, look: [0.6, 0.6] }, t);
    c.save(); c.translate(560, 1260); box(c, -50, -30, 100, 30, 6, '#3c3c3c'); box(c, -14, -220, 28, 190, 8, '#555'); box(c, -44, -250, 64, 44, 10, '#666'); c.restore();
    bubble(c, 790, 900, 150, t, mech + 0.6, null, (b) => { b.fillStyle = '#f3ecd8'; b.fillRect(-150, -150, 300, 300); for (let i = 0; i < 7; i++) bug(b, -90 + (i % 4) * 60, -40 + Math.floor(i / 4) * 70, 0.9, t, i, '#9ab86a'); });
    tag(c, t, 'إيليا ميتشنيكوف', 330, 560, mech + 0.1, null, { size: 44 });
    tag(c, t, 'أوائل القرن العشرين', 330, 650, mech + 0.5, null, { size: 34 });
  } else if (part === 1) {
    wall(c, '#efe6d4', '#e2d6bd', 1440, '#a98b62');
    box(c, 90, 360, 900, 900, 40, '#fbf6ea');
    // intestine with a surgically created dead-end loop
    c.save(); c.strokeStyle = INK; c.lineCap = 'round'; c.lineJoin = 'round';
    const main = () => { c.beginPath(); c.moveTo(200, 500); c.bezierCurveTo(500, 520, 380, 820, 640, 820); c.bezierCurveTo(880, 820, 860, 1100, 600, 1150); };
    const blind = () => { c.beginPath(); c.moveTo(560, 830); c.bezierCurveTo(500, 950, 330, 960, 300, 1080); };
    c.lineWidth = 70; main(); c.stroke(); blind(); c.stroke();
    c.strokeStyle = '#ff9fb0'; c.lineWidth = 56; main(); c.stroke(); blind(); c.stroke();
    c.restore();
    const crowd = easeOut(prog(t, loop, loop + 1.5));
    for (let i = 0; i < Math.round(12 * crowd); i++) { const u = i / 12; bug(c, lerp(520, 310, u) + Math.sin(i * 2) * 14, lerp(880, 1070, u) + Math.cos(i * 3) * 14, 0.7, t, i); }
    tag(c, t, 'الحلقة العمياء', 330, 1180, loop + 0.2, null, { size: 44, fill: '#fff3b0' });
    if (t > b12) {
      const lvl = 1 - easeInOut(prog(t, b12, b12 + 1.2));
      c.save(); c.translate(800, 560); box(c, -60, -90, 120, 170, 20, '#ffffff'); box(c, -66, -112, 132, 32, 10, '#d9534f');
      c.fillStyle = '#e57373'; c.fillRect(-52, 72 - 150 * lvl, 104, 150 * lvl); setFont(c, 40, 800, EN); c.fillStyle = INK; c.textAlign = 'center'; c.fillText('B12', 0, 10); c.restore();
      tag(c, t, 'نقص فيتامين ب١٢', 800, 720, b12 + 0.3, null, { size: 36 });
    }
  } else {
    wall(c, '#eef4f8', '#dfe9f0', 1440, '#9fb4c4');
    box(c, 520, 420, 470, 340, 20, '#22303e'); c.strokeStyle = C.teal; c.lineWidth = 7; c.beginPath();
    for (let i = 0; i <= 24; i++) { const x = 550 + i * 17, y = 680 - 180 * (1 / (1 + Math.exp(-(i - 12) / 2.5))) * clamp(prog(t, pim, pim + 2)); i ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke();
    box(c, 700, 760, 110, 80, 6, '#8a98a6');
    drawPerson(c, CAST.researcher, { x: 330, y: 1720, s: 1.4, arms: { r: [1.7, 0.5, 'point'], l: [0.15, 0.1] }, face: { mood: 'neutral', blink: blinkAt(t, 7) }, look: [0.8, -0.3] }, t);
    box(c, -20, 1300, W + 40, 50, 8, '#c9d4dc');
    tag(c, t, 'سنة ٢٠٠٠', 540, 330, y2000 + 0.1, null, { size: 46 });
    tag(c, t, 'مارك بيمنتل', 760, 860, pim + 0.2, null, { size: 40 });
    tag(c, t, 'لسه بيتدرس', 760, 960, still + 0.2, null, { size: 40, fill: '#fff3b0' });
  }
  setFont(c, 30, 700); c.direction = 'rtl'; c.textAlign = 'center'; c.fillStyle = 'rgba(40,30,20,0.75)'; c.fillText('إعادة تمثيل تعليمية', 540, 230);
}

// ------------------------------------------------------------ scene 6 — symptoms (Karim acts them out)
function scene6(c, t, T) {
  wall(c, '#e3f1ff', '#cfe4fa', 1450, '#9bb8d8'); windowFrame(c, 700, 320, 280, 260, '#bfe6ff', t);
  box(c, 60, 640, 230, 810, 10, '#f3e3c3'); box(c, 120, 720, 110, 60, 10, '#5aa9e6'); setFont(c, 36, 800, EN); c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('WC', 175, 752);
  const bloatK = at('انتفاخ بعد الأكل'), diar = at('وإسهال أو'), tired = at('وإرهاق،'), vit = at('وأحيانًا نقص'), notOnly = at('مش خاصة'), eval_ = at('وعلشان كده التقييم');
  const run = t > diar && t < tired;
  const sleepy = t > tired && t < vit + 1.5;
  const bel = Math.sin(Math.PI * clamp(prog(t, bloatK - 0.2, diar)));
  const kx = run ? lerp(620, 300, Math.abs(Math.sin((t - diar) * 2))) : 620;
  const docIn = t > notOnly - 0.3;
  drawPerson(c, CAST.karim, { x: docIn ? lerp(620, 380, easeInOut(prog(t, notOnly - 0.3, notOnly + 0.4))) : kx, y: 1720, s: 1.45, flip: run && Math.cos((t - diar) * 2) > 0,
    legs: run ? 'walk' : 'stand', walk: t * 11, belly: bel * 1.2, lean: sleepy ? 0.12 : 0, headTilt: sleepy ? 0.2 : 0,
    arms: bel > 0.2 ? { l: [0.1, -1.1, 'open'], r: [0.1, -1.1, 'open'] } : sleepy ? { l: [0.05, 0.05], r: [0.05, 0.05] } : { l: [0.15, 0.1], r: [0.15, 0.1] },
    face: { mood: sleepy ? 'tired' : run ? 'worried' : bel > 0.2 ? 'pain' : 'neutral', blink: blinkAt(t, 2) } }, t);
  if (bel > 0.2) squiggles(c, 640, 1240, t, bel);
  if (run) { sweat(c, kx + 70, 680, t); tag(c, t, '⇄', kx, 560, diar + 0.2, tired, { size: 60, fill: '#ffe8d2', ltr: true }); }
  if (sleepy) { setFont(c, 70, 800, EN); c.fillStyle = '#4a6fa5'; c.textAlign = 'center'; c.fillText('z', 760 + Math.sin(t * 3) * 10, 640 - ((t * 40) % 80)); c.fillText('Z', 800, 560 - ((t * 30) % 60)); }
  tag(c, t, 'انتفاخ بعد الأكل', 540, 330, bloatK + 0.1, diar, { size: 44 });
  tag(c, t, 'إسهال أو اضطراب في الحمام', 540, 330, diar + 0.1, tired, { size: 42 });
  tag(c, t, 'إرهاق', 540, 330, tired + 0.1, vit, { size: 46 });
  if (t > vit && t < notOnly + 0.2) {
    const lvl = 1 - easeInOut(prog(t, vit + 0.2, vit + 1.6));
    c.save(); c.translate(820, 760); const s = spring(t, vit, 10, 0.6); c.scale(clamp(s, 0, 1.1), clamp(s, 0, 1.1));
    box(c, -70, -100, 140, 190, 24, '#ffffff'); box(c, -76, -126, 152, 36, 10, '#5aa9e6');
    c.fillStyle = '#ffd166'; c.fillRect(-56, 76 - 150 * lvl, 112, 150 * lvl); setFont(c, 44, 800, EN); c.fillStyle = INK; c.textAlign = 'center'; c.fillText('B12', 0, 0); c.restore();
    tag(c, t, 'نقص فيتامينات', 540, 330, vit + 0.2, notOnly, { size: 44 });
  }
  if (docIn) {
    const s = spring(t, notOnly - 0.3, 8, 0.8);
    doctor(c, t, { x: lerp(1300, 800, clamp(s, 0, 1.05)), y: 1720, s: 1.4, flip: true, arms: t > eval_ ? { r: [1.3, 1.4, 'open'], l: [0.15, 0.1] } : { r: [2.6 + Math.sin(t * 8) * 0.15, 0.1, 'point'], l: [0.15, 0.1] }, look: [-0.5, 0] });
    tag(c, t, 'مش خاصة بـ SIBO لوحده', 540, 330, notOnly + 0.2, eval_, { size: 42, fill: '#fff3b0' });
    tag(c, t, 'التقييم الطبي مهم', 540, 330, eval_ + 0.2, null, { size: 46, fill: '#e3f5e6' });
  }
}

// ------------------------------------------------------------ scene 7 — the breath test
function scene7(c, t, T) {
  lab(c, t);
  const starts = at('التشخيص غالبًا'), drink = at('بتشرب محلول'), measure = at('وبعدها بنقيس'), interval = at('على فترات'), interp = at('والنتيجة بيفسرها'), limits = at('لأن الاختبار');
  doctor(c, t, { x: 250, y: 1720, s: 1.4, arms: t > interp ? { r: [0.3, -1.9, 'fist'], l: [0.3, -1.9, 'fist'] } : { r: [1.8, 0.5, 'point'], l: [0.15, 0.1] }, mood: t > interp ? 'neutral' : 'happy', look: [0.6, 0] });
  const drinking = t > drink && t < measure;
  const blowing = t > measure && t < interp;
  const sip = drinking ? Math.max(0, Math.sin((t - drink) * 3)) : 0;
  box(c, 640, 1460, 280, 26, 8, '#f08a3c');
  drawPerson(c, CAST.karim, { x: 780, y: 1610, s: 1.2, legs: 'sit', flip: true,
    arms: drinking ? { r: [0.4, -1.3 - sip * 1.1, 'fist'], l: [0.1, 0.1] } : blowing ? { r: [0.4, -2.2, 'fist'], l: [0.1, 0.1] } : { r: [0.15, 0.1], l: [0.15, 0.1] },
    face: { mood: 'neutral', blink: blinkAt(t, 2), talk: blowing ? 0.5 + 0.2 * Math.sin(t * 6) : 0, viseme: 'O' } }, t);
  if (drinking) { c.save(); c.translate(720 + sip * 20, 1100 - sip * 120); c.rotate(-sip * 0.9); box(c, -26, -40, 52, 70, 8, '#ffffff'); c.fillStyle = '#ffe9a8'; c.fillRect(-22, -10, 44, 36); c.restore(); }
  if (blowing) { c.save(); c.translate(700, 760); c.strokeStyle = INK; c.lineWidth = 8; c.beginPath(); c.moveTo(60, 60); c.lineTo(-40, 120); c.stroke();
    const puff = 0.6 + 0.4 * Math.abs(Math.sin(t * 2)); c.beginPath(); c.ellipse(-100, 150, 70 * puff, 54 * puff, 0, 0, TAU); c.fillStyle = 'rgba(220,240,255,0.9)'; c.fill(); outline(c, 6); c.restore(); }
  // timed samples
  if (t > interval - 0.2) {
    const n = Math.min(4, 1 + Math.floor((t - interval) * 1.6));
    for (let k = 0; k < n; k++) { c.save(); c.translate(560 + k * 110, 1300); box(c, -36, -70, 72, 110, 16, '#e6f3ff'); setFont(c, 30, 800, EN); c.fillStyle = INK; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(k + 1), 0, -14); c.restore(); }
    wallClock(c, 920, 470, 70, t, 6);
  }
  // analyser screen: a schematic curve, no values
  if (t > measure + 0.6) {
    const s = spring(t, measure + 0.6, 10, 0.7);
    c.save(); c.translate(260, 430); c.scale(clamp(s, 0, 1.1), clamp(s, 0, 1.1));
    box(c, -200, -140, 400, 280, 24, '#22303e');
    for (const [col, k] of [[C.teal, 0], [C.orange, 1]]) { c.strokeStyle = col; c.lineWidth = 6; c.beginPath(); for (let i = 0; i <= 20; i++) { const x = -170 + i * 17, y = 80 - (40 + 60 * k) * Math.sin(i / 20 * Math.PI * 0.8) * clamp(prog(t, measure + 0.8, measure + 2.5)); i ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke(); }
    setFont(c, 28, 700, EN); c.fillStyle = C.teal; c.textAlign = 'left'; c.fillText('H₂', -170, -100); c.fillStyle = C.orange; c.fillText('CH₄', -100, -100);
    c.restore();
  }
  tag(c, t, 'اختبار النَّفَس', 540, 230, starts + 0.3, null, { size: 44, fill: '#e3f5e6' });
  tag(c, t, 'محلول سكري', 820, 900, drink + 0.2, measure, { size: 38 });
  tag(c, t, 'الدكتور بيفسّر النتيجة', 650, 800, interp + 0.2, limits, { size: 38 });
  tag(c, t, 'الاختبار ليه حدود', 650, 800, limits + 0.2, null, { size: 42, fill: '#fff3b0' });
}

// ------------------------------------------------------------ scene 8 — treatment plan
function scene8(c, t, T) {
  wall(c, '#e9f6f4', '#d3ece8', 1440, '#a6d0c8');
  const plan = at('والعلاج بيحدده'), bugs = at('وممكن يشمل'), diet = at('مع تعديلات'), cause = at('وعلاج السبب'), follow = at('والمتابعة مهمة'), back = at('لأن الأعراض ممكن');
  box(c, 80, 300, 920, 760, 40, '#ffffff');
  const steps = [
    [plan + 0.2, 'خطة يحددها الدكتور', (k) => { k.beginPath(); k.arc(0, 0, 34, 0, TAU); k.strokeStyle = INK; k.lineWidth = 8; k.stroke(); k.beginPath(); k.moveTo(-24, -40); k.lineTo(-24, -10); k.moveTo(24, -40); k.lineTo(24, -10); k.stroke(); }],
    [bugs + 0.2, 'علاج البكتيريا الزيادة', (k) => { for (let i = 0; i < 3; i++) bug(k, -40 + i * 40, 0, 0.7, t, i); k.strokeStyle = C.tealDeep; k.lineWidth = 8; k.beginPath(); k.moveTo(-60, 30); k.lineTo(60, 30); k.stroke(); }],
    [diet + 0.2, 'تعديلات في الأكل', (k) => { k.beginPath(); k.arc(0, 0, 44, 0, TAU); blob(k, '#ffffff'); k.fillStyle = '#9ad97a'; k.beginPath(); k.moveTo(0, 0); k.arc(0, 0, 32, 0, Math.PI); k.fill(); k.fillStyle = '#ffd166'; k.beginPath(); k.moveTo(0, 0); k.arc(0, 0, 32, Math.PI, Math.PI * 1.6); k.fill(); }],
    [cause + 0.2, 'علاج السبب', (k) => { for (const r of [44, 30, 16]) { k.beginPath(); k.arc(0, 0, r, 0, TAU); k.fillStyle = r === 30 ? '#fff' : C.red; k.fill(); outline(k, 4); } }],
    [follow + 0.2, 'متابعة', (k) => { box(k, -40, -36, 80, 76, 10, '#fff'); k.fillStyle = C.red; k.fillRect(-37, -33, 74, 18); k.save(); k.rotate(t * 2); k.strokeStyle = C.tealDeep; k.lineWidth = 6; k.beginPath(); k.arc(0, 10, 18, 0, 4.5); k.stroke(); k.restore(); }],
  ];
  steps.forEach(([tin, label, icon], i) => {
    const s = spring(t, tin, 11, 0.6); if (s <= 0) return;
    const y = 380 + i * 140;
    c.save(); c.translate((1 - clamp(s, 0, 1)) * 400, 0); c.globalAlpha = clamp(s * 2);
    c.save(); c.translate(870, y + 50); icon(c); c.restore();
    c.direction = 'rtl'; setFont(c, 46, 800); c.textAlign = 'right'; c.textBaseline = 'middle'; c.fillStyle = INK; c.fillText(label, 790, y + 52);
    c.beginPath(); c.arc(160, y + 50, 26, 0, TAU); c.fillStyle = C.tealDeep; c.fill(); setFont(c, 34, 800, EN); c.fillStyle = '#fff'; c.textAlign = 'center'; c.fillText('✓', 160, y + 52);
    c.restore();
  });
  doctor(c, t, { x: 270, y: 1760, s: 1.3, arms: { r: [2.0, 0.5, 'point'], l: [0.15, 0.1] }, look: [0.4, -0.6] });
  drawPerson(c, CAST.karim, { x: 800, y: 1760, s: 1.3, flip: true, belly: 0.1, face: { mood: t > follow ? 'happy' : 'neutral', blink: blinkAt(t, 3) }, headTilt: Math.sin(t * 5) * 0.04 * (t > plan ? 1 : 0) }, t);
  tag(c, t, 'الأعراض ممكن ترجع', 540, 1150, back + 0.2, null, { size: 40, fill: '#fff3b0' });
}

// ------------------------------------------------------------ scene 9 — closing
function scene9(c, t, T) {
  studio(c, t);
  const self = at('فمتشخّصش'), ask = at('اسأل دكتورك'), msg = at('أساس العلاج'), follow = at('تابعنا');
  const s = spring(t, SC[8], 7, 0.8);
  doctor(c, t, { x: 540, y: 2080 + (1 - clamp(s, 0, 1.1)) * 700, s: 1.85, lean: Math.sin(t * 1.2) * 0.015,
    arms: t < ask ? { r: [2.6 + Math.sin(t * 8) * 0.2, 0.1, 'point'], l: [0.15, 0.1] } : t < follow ? { r: [1.1, 1.5, 'open'], l: [0.15, 0.1] } : { r: [2.6 + Math.sin(t * 7) * 0.3, 0.3, 'open'], l: [0.15, 0.1] } });
  riseText(c, CONFIG.doctorName, 540, 385, t, SC[8] + 0.4, null, { size: 70 });
  riseText(c, CONFIG.doctorTitle, 540, 462, t, SC[8] + 0.8, null, { size: 36, weight: 600, color: C.teal });
  tag(c, t, 'متشخّصش نفسك', 540, 1330, self + 0.1, msg - 0.2, { size: 46, fill: '#fff3b0' });
  const ps = spring(t, msg - 0.1, 10, 0.75);
  if (ps > 0) { c.save(); c.globalAlpha = clamp(ps * 2); rr(c, 90, 1250 + (1 - clamp(ps, 0, 1)) * 60, 900, 230, 40); c.fillStyle = 'rgba(8,24,48,0.9)'; c.fill(); c.lineWidth = 5; c.strokeStyle = C.teal; c.stroke(); c.restore(); }
  riseText(c, 'أساس العلاج الصح', 540, 1320, t, msg, null, { size: 62 });
  riseText(c, 'هو التشخيص الصح', 540, 1410, t, msg + 0.5, null, { size: 66, colors: { 1: C.teal, 2: C.teal } });
  const ls = spring(t, SC[8] + 0.2, 9, 0.55);
  if (MARK && ls > 0) { c.save(); c.translate(540, 230); c.rotate((1 - clamp(ls, 0, 1)) * -2.5); const k = 140 * clamp(ls, 0, 1.15); c.drawImage(MARK, -k / 2, -k / 2, k, k); c.restore(); }
  tag(c, t, 'تابعنا لمعلومات طبية أكتر', 540, 1535, follow + 0.1, null, { size: 40, fill: C.teal });
}

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
const SCENES = [scene1, scene2, scene3, scene4, scene5, scene6, scene7, scene8, scene9];
const BUF = mk(W, H), bctx = BUF.getContext('2d');
function drawScene(i, c, t, T) { c.save(); SCENES[i](c, t, T); c.restore(); }
function sceneIndex(t) { let i = 0; for (let k = 0; k < SC.length; k++) if (t >= SC[k]) i = k; return i; }

function seek(T) {
  const t = clamp(T, 0, TL.duration);
  SP = speech(T);
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.filter = 'none';
  const i = sceneIndex(t), D = 0.7, tr = prog(t, SC[i] - 0.001, SC[i] + D);
  const prev = i > 0 && tr < 1 ? i - 1 : -1;
  // history scene renders through a sepia "old film" pass
  const paint = (k, c) => {
    if (k === 4) {
      bctx.setTransform(1, 0, 0, 1, 0, 0); bctx.clearRect(0, 0, W, H); drawScene(k, bctx, t, T);
      c.save(); c.filter = t < at('وفي سنة', -0.2) ? 'sepia(0.75) saturate(0.85) contrast(1.05)' : 'sepia(0.2)'; c.drawImage(BUF, 0, 0); c.restore();
      c.save(); c.globalAlpha = 0.08; c.fillStyle = '#000'; const r = rng(Math.floor(t * 24)); for (let n = 0; n < 6; n++) c.fillRect(r() * W, 0, 2, H); c.restore();
    } else drawScene(k, c, t, T);
  };
  if (prev < 0) paint(i, ctx);
  else {
    const e = easeInOut(tr);
    // per-transition styles: 1 bread-roll wipe, 2 poster zoom-through, 3 iris to the past, 4 page lift,
    // 5 slide, 6 iris out of the microscope, 7 rise to the studio
    if (i === 1 || i === 5 || i === 7) {
      const x = lerp(W + 200, -200, e);
      ctx.save(); ctx.beginPath(); ctx.rect(x, 0, W, H); ctx.clip(); paint(prev, ctx); ctx.restore();
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, x, H); ctx.clip(); paint(i, ctx); ctx.restore();
      ctx.fillStyle = C.teal; ctx.fillRect(x - 6, 0, 12, H);
    } else if (i === 2) {
      ctx.save(); ctx.translate(690, 1090); ctx.scale(1 + e * 4, 1 + e * 4); ctx.translate(-690, -1090); ctx.globalAlpha = 1 - e; paint(prev, ctx); ctx.restore();
      ctx.save(); ctx.globalAlpha = e; ctx.translate(540, 900); ctx.scale(0.6 + 0.4 * e, 0.6 + 0.4 * e); ctx.translate(-540, -900); paint(i, ctx); ctx.restore();
    } else if (i === 3 || i === 4) {
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
  await Promise.all(['800 64px Cairo', '700 64px Cairo', '600 64px Cairo', '800 64px Inter', '700 64px Inter'].map((f) => document.fonts.load(f, 'SIBO B12 H₂ CH₄ عيادة')));
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
