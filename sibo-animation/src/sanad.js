// Dr. Abobakr Sanad — illustrated presenter rig (waist-up), built from the reference photo.
// Natural proportions, cel shading, fine outlines, textured hair/beard, articulated hands.
//
// drawSanad(c, pose, t)
//   pose: { x, y (waist line), s, flip, lean, headTilt, headTurn (-1..1), look:[dx,dy],
//           arms: { l:[shoulder, elbow, hand], r:[...] }   hand: 'present'|'point'|'open'|'fist'|'thumb'|'rest'
//           face: { mood:'happy'|'neutral'|'serious'|'surprised'|'worried', viseme, talk, blink, brows } }
// Arm angles: radians from straight down; positive swings out/up to the character's own side.
// Set OUTFIT.inner to 'tie' (white shirt + black tie, as in the photo) or 'scrubs' (teal V-neck).

const TAU = Math.PI * 2;
export const OUTFIT = { inner: 'tie' };
const P = {
  ink: '#1c1f26', skin: '#d9a07c', skinShade: '#b97c5c', skinLight: '#ecc0a0', hair: '#1d1714',
  beard: 'rgba(32,24,22,0.62)', coat: '#fbfcfe', coatShade: '#d5dde8', coatDeep: '#b9c5d4',
  shirt: '#f3f6fa', tie: '#16181c', scrub: '#3c8f9e', glass: '#15171b', iris: '#4a2f22',
};
const LW = 3.2;
function ln(c, w = LW, col = P.ink) { c.lineWidth = w; c.strokeStyle = col; c.lineJoin = 'round'; c.lineCap = 'round'; c.stroke(); }
function fill(c, col) { c.fillStyle = col; c.fill(); }
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// ------------------------------------------------------------------ hands
function finger(c, x, y, ang, len, w) {
  c.save(); c.translate(x, y); c.rotate(ang);
  c.beginPath(); c.moveTo(-w / 2, 0); c.lineTo(-w / 2, len - w / 2); c.arc(0, len - w / 2, w / 2, Math.PI, 0, true); c.lineTo(w / 2, 0); c.closePath();
  fill(c, P.skin); ln(c, 2.6);
  c.beginPath(); c.moveTo(-w * 0.3, len * 0.55); c.lineTo(w * 0.25, len * 0.55); ln(c, 1.4, 'rgba(120,70,50,0.5)');
  c.restore();
}
function hand(c, x, y, ang, kind, side) {
  c.save(); c.translate(x, y); c.rotate(-ang); if (side < 0) c.scale(-1, 1);
  const palm = () => { c.beginPath(); c.moveTo(-26, -6); c.quadraticCurveTo(-30, 30, -18, 50); c.lineTo(22, 50); c.quadraticCurveTo(32, 26, 26, -6); c.closePath(); };
  if (kind === 'fist' || kind === 'rest') {
    c.beginPath(); c.ellipse(0, 26, 30, 32, 0, 0, TAU); fill(c, P.skin); ln(c);
    for (const dx of [-14, 0, 14]) { c.beginPath(); c.moveTo(dx - 6, 48); c.quadraticCurveTo(dx, 54, dx + 6, 48); ln(c, 1.8); }
    c.beginPath(); c.moveTo(26, 10); c.quadraticCurveTo(34, 28, 20, 40); ln(c, 2.2);
  } else if (kind === 'point') {
    finger(c, 4, 44, 0, 62, 15);
    c.beginPath(); c.ellipse(0, 28, 28, 30, 0, 0, TAU); fill(c, P.skin); ln(c);
    for (const dx of [-14, -2]) { c.beginPath(); c.moveTo(dx - 5, 50); c.quadraticCurveTo(dx, 55, dx + 5, 50); ln(c, 1.8); }
    finger(c, 22, 30, -0.35, 24, 13);
  } else if (kind === 'thumb') {
    c.beginPath(); c.ellipse(0, 28, 30, 30, 0, 0, TAU); fill(c, P.skin); ln(c);
    finger(c, -16, 10, Math.PI * 0.95, 44, 15);
  } else {
    // open / present: palm with spread fingers (present = palm up, slightly cupped)
    const spread = kind === 'present' ? 0.12 : 0.22;
    [-1.5, -0.5, 0.5, 1.5].forEach((k, i) => finger(c, k * 11, 44, k * spread, [44, 52, 50, 40][i], 14));
    palm(); fill(c, P.skin); ln(c);
    c.beginPath(); c.moveTo(-14, 22); c.quadraticCurveTo(0, 30, 16, 20); ln(c, 1.6, 'rgba(120,70,50,0.6)');
    finger(c, 26, 12, -0.95, 38, 15);
  }
  c.restore();
}

// ------------------------------------------------------------------ arm (sleeve with shading + cuff + hand)
function arm(c, sx, a1, a2, kind) {
  const shX = sx * 188, shY = -452, l1 = 196, l2 = 178, w = 80;
  const A1 = sx * a1, A2 = sx * a2;
  const ex = shX + Math.sin(A1) * l1, ey = shY + Math.cos(A1) * l1;
  const hx = ex + Math.sin(A1 + A2) * l2, hy = ey + Math.cos(A1 + A2) * l2;
  for (const [col, ww] of [[P.ink, w + LW * 2], [P.coat, w]]) {
    c.strokeStyle = col; c.lineWidth = ww; c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath(); c.moveTo(shX, shY); c.lineTo(ex, ey); c.lineTo(hx - Math.sin(A1 + A2) * 30, hy - Math.cos(A1 + A2) * 30); c.stroke();
  }
  // sleeve shading on the outer side
  c.strokeStyle = P.coatShade; c.lineWidth = w * 0.32; c.lineCap = 'round';
  const ox = Math.cos(A1) * sx * w * 0.3, oy = -Math.sin(A1) * sx * w * 0.3;
  c.beginPath(); c.moveTo(shX + ox, shY + oy); c.lineTo(ex + ox, ey + oy); c.stroke();
  // elbow crease + cuff
  c.beginPath(); c.arc(ex, ey, w * 0.28, A1 + 1.2, A1 + 2.2); ln(c, 2, 'rgba(120,135,155,0.8)');
  const cx = hx - Math.sin(A1 + A2) * 36, cy = hy - Math.cos(A1 + A2) * 36;
  c.save(); c.translate(cx, cy); c.rotate(-(A1 + A2));
  c.beginPath(); c.rect(-w / 2 + 6, -10, w - 12, 20); fill(c, P.coatShade); ln(c, 2.4); c.restore();
  if (sx < 0) {   // watch on the left wrist
    c.save(); c.translate(hx - Math.sin(A1 + A2) * 8, hy - Math.cos(A1 + A2) * 8); c.rotate(-(A1 + A2));
    c.beginPath(); c.rect(-24, -12, 48, 24); fill(c, '#22252b'); ln(c, 2); c.beginPath(); c.arc(0, 0, 13, 0, TAU); fill(c, '#3a4048'); ln(c, 2); c.restore();
  }
  hand(c, hx, hy, A1 + A2, kind, sx);
}

// ------------------------------------------------------------------ head
function mouth(c, v, open, mood) {
  c.save(); c.translate(0, 74);
  if (!v || v === 'rest') {
    if (mood === 'happy') {
      c.beginPath(); c.moveTo(-34, -4); c.quadraticCurveTo(0, 22, 34, -4); c.quadraticCurveTo(0, 8, -34, -4); fill(c, '#fff'); ln(c, 2.6);
      c.beginPath(); c.moveTo(-34, -4); c.quadraticCurveTo(0, 30, 34, -4); ln(c, 3);
      c.beginPath(); c.moveTo(-24, 16); c.quadraticCurveTo(0, 30, 24, 16); ln(c, 1.6, 'rgba(110,60,50,0.6)');
    } else {
      const sm = mood === 'serious' || mood === 'worried' ? -3 : 6;
      c.beginPath(); c.moveTo(-28, 0); c.quadraticCurveTo(0, sm, 28, 0); ln(c, 3);
      c.beginPath(); c.moveTo(-16, 12); c.quadraticCurveTo(0, 18, 16, 12); ln(c, 1.5, 'rgba(110,60,50,0.55)');
    }
  } else if (v === 'M') {
    c.beginPath(); c.moveTo(-26, 0); c.quadraticCurveTo(0, 4, 26, 0); ln(c, 4.5);
  } else {
    const o = 0.35 + 0.65 * open, sh = { A: [24, 20], E: [30, 11], O: [14, 16], F: [24, 9] }[v];
    const w = sh[0], h = Math.max(4, sh[1] * o);
    c.beginPath(); c.moveTo(-w, 0); c.quadraticCurveTo(0, -h * 0.9, w, 0); c.quadraticCurveTo(0, h * 1.6, -w, 0); c.closePath();
    fill(c, '#5a1e22'); ln(c, 2.8);
    c.save(); c.clip();
    c.fillStyle = '#fff'; c.fillRect(-w, -h, w * 2, h * 0.75);
    if (v === 'F') { c.fillStyle = '#a5554c'; c.fillRect(-w, h * 0.2, w * 2, h * 1.4); }
    else { c.fillStyle = '#c9545e'; c.beginPath(); c.ellipse(0, h * 1.1, w * 0.6, h * 0.55, 0, 0, TAU); c.fill(); }
    c.restore();
  }
  c.restore();
}
function head(c, f, look, turn, t) {
  const mood = f.mood || 'neutral', blink = f.blink || 0, brow = f.brows || 0, tx = turn * 10;
  // neck
  c.beginPath(); c.moveTo(-46, 120); c.lineTo(-44, 182); c.lineTo(44, 182); c.lineTo(46, 120); c.closePath(); fill(c, P.skin); ln(c);
  c.beginPath(); c.moveTo(-46, 128); c.quadraticCurveTo(0, 160, 46, 128); c.lineTo(46, 150); c.quadraticCurveTo(0, 180, -46, 150); c.closePath(); fill(c, P.skinShade);
  // ears
  for (const sx of [-1, 1]) {
    c.beginPath(); c.ellipse(sx * 96 + tx * 0.3, 10, 18, 32, sx * 0.1, 0, TAU); fill(c, P.skin); ln(c);
    c.beginPath(); c.arc(sx * 96 + tx * 0.3, 10, 10, sx > 0 ? -1.3 : 1.8, sx > 0 ? 1.3 : 4.4); ln(c, 2, P.skinShade);
  }
  // face shape (long, defined jaw)
  const face = () => {
    c.beginPath(); c.moveTo(-90, -40); c.bezierCurveTo(-96, -150, 96, -150, 90, -40);
    c.bezierCurveTo(92, 30, 80, 80, 54, 112); c.bezierCurveTo(36, 132, 16, 140, 0, 140);
    c.bezierCurveTo(-16, 140, -36, 132, -54, 112); c.bezierCurveTo(-80, 80, -92, 30, -90, -40); c.closePath();
  };
  face(); fill(c, P.skin);
  c.save(); face(); c.clip();
  // cel shading: shadow side + cheek planes
  const g = c.createLinearGradient(-90, 0, 90, 0); g.addColorStop(0, 'rgba(150,90,60,0.28)'); g.addColorStop(0.35, 'rgba(150,90,60,0)'); g.addColorStop(1, 'rgba(255,240,220,0.12)');
  c.fillStyle = g; c.fillRect(-100, -160, 200, 320);
  c.fillStyle = 'rgba(150,90,60,0.18)'; c.beginPath(); c.moveTo(-90, 20); c.quadraticCurveTo(-60, 40, -50, 90); c.lineTo(-90, 110); c.closePath(); c.fill();
  // beard: short, full, following the jaw; mustache
  c.fillStyle = P.beard;
  c.beginPath(); c.moveTo(-94, 6); c.bezierCurveTo(-84, 50, -70, 52, -54, 54); c.bezierCurveTo(-42, 56, -36, 62, -34, 70);
  c.bezierCurveTo(-30, 102, -14, 112, 0, 112); c.bezierCurveTo(14, 112, 30, 102, 34, 70); c.bezierCurveTo(36, 62, 42, 56, 54, 54);
  c.bezierCurveTo(70, 52, 84, 50, 94, 6); c.lineTo(100, 160); c.lineTo(-100, 160); c.closePath(); c.fill();
  c.beginPath(); c.moveTo(-36, 64); c.quadraticCurveTo(0, 46, 36, 64); c.quadraticCurveTo(0, 58, -36, 64); c.fillStyle = 'rgba(28,20,18,0.78)'; c.fill();
  const r = rng(5); c.strokeStyle = 'rgba(20,14,12,0.45)'; c.lineWidth = 1.4;
  for (let i = 0; i < 140; i++) { const a = 0.15 * Math.PI + r() * 0.7 * Math.PI, rad = 92 + r() * 40; const x = Math.cos(a) * rad * 0.95, y = 6 + Math.sin(a) * rad * 0.85; if (y > 50) { c.beginPath(); c.moveTo(x, y); c.lineTo(x + (r() - 0.5) * 4, y + 4); c.stroke(); } }
  c.restore();
  face(); ln(c);
  // hair: short, dark, receding at the temples, thin on the crown
  c.beginPath();
  const hairPath = () => { c.beginPath(); c.moveTo(-92, -10); c.quadraticCurveTo(-104, -112, -20, -138); c.quadraticCurveTo(70, -150, 100, -70); c.quadraticCurveTo(98, -40, 92, -10);
  c.quadraticCurveTo(88, -60, 74, -76); c.quadraticCurveTo(62, -88, 56, -108); c.quadraticCurveTo(28, -118, 0, -114);
  c.quadraticCurveTo(-28, -118, -56, -108); c.quadraticCurveTo(-62, -88, -74, -76); c.quadraticCurveTo(-88, -60, -92, -10); c.closePath(); };
  hairPath(); fill(c, P.hair);
  c.save(); c.clip(); c.strokeStyle = 'rgba(90,70,60,0.55)'; c.lineWidth = 1.4; const rh = rng(9);
  for (let i = 0; i < 70; i++) { const x = -90 + rh() * 180, y = -140 + rh() * 60; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 6, y - 3); c.stroke(); }
  c.fillStyle = 'rgba(217,160,124,0.4)'; c.beginPath(); c.ellipse(4, -126, 40, 10, 0, 0, TAU); c.fill(); c.restore();
  hairPath(); ln(c, 2.6);
  // eyebrows
  for (const sx of [-1, 1]) {
    const ang = { worried: sx * 0.22, serious: -sx * 0.1, surprised: 0 }[mood] ?? sx * 0.04;
    c.save(); c.translate(sx * 38 + tx, -46 - brow * 12 - (mood === 'surprised' ? 8 : 0)); c.rotate(ang);
    c.beginPath(); c.moveTo(-26, 4); c.quadraticCurveTo(-4, -8, 24, -1); c.quadraticCurveTo(-2, 2, -26, 8); c.closePath(); fill(c, P.hair);
    c.restore();
  }
  // eyes
  const [lx, ly] = look;
  for (const sx of [-1, 1]) {
    const ex = sx * 38 + tx, ey = -12;
    if (mood === 'happy' && blink < 0.5 && !(f.viseme && f.viseme !== 'rest')) {
      c.beginPath(); c.moveTo(ex - 18, ey + 2); c.quadraticCurveTo(ex, ey - 12, ex + 18, ey + 2); ln(c, 3.4);
      c.beginPath(); c.moveTo(ex - 14, ey + 10); c.quadraticCurveTo(ex, ey + 14, ex + 14, ey + 10); ln(c, 1.4, 'rgba(110,60,50,0.5)');
    } else {
      const h = 15 * Math.max(0.05, 1 - blink) * (mood === 'surprised' ? 1.25 : 1);
      c.beginPath(); c.moveTo(ex - 22, ey + 1); c.quadraticCurveTo(ex - 2, ey - h * 1.5, ex + 22, ey - 1); c.quadraticCurveTo(ex, ey + h * 1.05, ex - 22, ey + 1); c.closePath();
      fill(c, '#fbf7f2');
      if (h > 3) { c.save(); c.clip(); c.beginPath(); c.arc(ex + lx * 5, ey + ly * 3, 11, 0, TAU); fill(c, P.iris); c.beginPath(); c.arc(ex + lx * 5, ey + ly * 3, 5, 0, TAU); fill(c, '#0e0a08'); c.beginPath(); c.arc(ex + lx * 5 - 3, ey + ly * 3 - 3, 2, 0, TAU); fill(c, '#fff'); c.restore(); }
      c.beginPath(); c.moveTo(ex - 22, ey + 1); c.quadraticCurveTo(ex - 2, ey - h * 1.5, ex + 22, ey - 1); ln(c, 3.6);
      c.beginPath(); c.moveTo(ex - 14, ey + 12); c.quadraticCurveTo(ex, ey + 16, ex + 14, ey + 11); ln(c, 1.3, 'rgba(110,60,50,0.45)');
    }
  }
  // glasses: thin dark rounded-rectangle frames
  for (const sx of [-1, 1]) {
    const gx = sx * 40 + tx;
    c.beginPath(); c.moveTo(gx - 34, -30); c.quadraticCurveTo(gx, -36, gx + 34, -30); c.quadraticCurveTo(gx + 38, 4, gx + 26, 18); c.quadraticCurveTo(gx, 24, gx - 26, 18); c.quadraticCurveTo(gx - 38, 4, gx - 34, -30); c.closePath();
    c.fillStyle = 'rgba(210,230,245,0.14)'; c.fill(); ln(c, 4, P.glass);
    c.beginPath(); c.moveTo(gx - 32, -30); c.quadraticCurveTo(gx, -37, gx + 32, -30); ln(c, 6.5, P.glass);
    c.beginPath(); c.moveTo(gx - 26, -22); c.lineTo(gx - 18, -6); ln(c, 2, 'rgba(255,255,255,0.45)');
  }
  c.beginPath(); c.moveTo(-6 + tx, -22); c.quadraticCurveTo(tx, -27, 6 + tx, -22); ln(c, 4, P.glass);
  for (const sx of [-1, 1]) { c.beginPath(); c.moveTo(sx * 74 + tx, -26); c.lineTo(sx * 94, -18); ln(c, 4, P.glass); }
  // nose: bridge shadow, tip, nostrils
  c.beginPath(); c.moveTo(-4 + tx, -14); c.quadraticCurveTo(-8 + tx, 18, -14 + tx, 34); ln(c, 2.2, 'rgba(120,70,50,0.7)');
  c.beginPath(); c.moveTo(-16 + tx, 36); c.quadraticCurveTo(-4 + tx, 46, 4 + tx, 42); c.quadraticCurveTo(12 + tx, 46, 18 + tx, 36); ln(c, 2.8);
  c.fillStyle = 'rgba(255,235,215,0.5)'; c.beginPath(); c.ellipse(2 + tx, 30, 6, 4, 0, 0, TAU); c.fill();
  // smile lines
  if (mood === 'happy') for (const sx of [-1, 1]) { c.beginPath(); c.moveTo(sx * 26 + tx, 40); c.quadraticCurveTo(sx * 44 + tx, 60, sx * 40 + tx, 80); ln(c, 1.8, 'rgba(110,60,50,0.5)'); }
  c.save(); c.translate(tx, 0); mouth(c, f.viseme, f.talk || 0, mood); c.restore();
}

// ------------------------------------------------------------------ torso (coat, shirt/tie or scrubs, stethoscope)
function torso(c) {
  const coat = () => { c.beginPath(); c.moveTo(-226, 900); c.lineTo(-238, -360); c.bezierCurveTo(-236, -440, -200, -480, -150, -490); c.lineTo(-60, -520); c.lineTo(60, -520); c.lineTo(150, -490); c.bezierCurveTo(200, -480, 236, -440, 238, -360); c.lineTo(226, 900); c.closePath(); };
  coat(); fill(c, P.coat);
  c.save(); coat(); c.clip();
  const g = c.createLinearGradient(-240, 0, 240, 0); g.addColorStop(0, P.coatShade); g.addColorStop(0.25, 'rgba(255,255,255,0)'); g.addColorStop(0.8, 'rgba(255,255,255,0)'); g.addColorStop(1, P.coatShade);
  c.fillStyle = g; c.fillRect(-250, -530, 500, 1440);
  c.restore();
  coat(); ln(c);
  // inner: shirt + tie, or scrubs
  const v = () => { c.beginPath(); c.moveTo(-62, -518); c.lineTo(0, -300); c.lineTo(62, -518); c.closePath(); };
  if (OUTFIT.inner === 'scrubs') { v(); fill(c, P.scrub); ln(c); c.beginPath(); c.moveTo(-30, -518); c.lineTo(0, -430); c.lineTo(30, -518); fill(c, P.skin); ln(c, 2.4); }
  else {
    v(); fill(c, P.shirt); ln(c);
    c.beginPath(); c.moveTo(-44, -520); c.lineTo(-6, -486); c.lineTo(-30, -470); c.closePath(); fill(c, '#e7edf4'); ln(c, 2.2);
    c.beginPath(); c.moveTo(44, -520); c.lineTo(6, -486); c.lineTo(30, -470); c.closePath(); fill(c, '#e7edf4'); ln(c, 2.2);
    c.beginPath(); c.moveTo(-14, -490); c.lineTo(14, -490); c.lineTo(10, -466); c.lineTo(-10, -466); c.closePath(); fill(c, P.tie); ln(c, 2.2);
    c.beginPath(); c.moveTo(-10, -466); c.lineTo(10, -466); c.lineTo(20, -330); c.lineTo(0, -306); c.lineTo(-20, -330); c.closePath(); fill(c, P.tie); ln(c, 2.2);
    c.beginPath(); c.moveTo(-4, -440); c.lineTo(-10, -340); ln(c, 1.4, 'rgba(255,255,255,0.18)');
  }
  // lapels
  for (const sx of [-1, 1]) {
    c.beginPath(); c.moveTo(sx * 62, -518); c.lineTo(sx * 4, -300); c.lineTo(sx * 40, -320); c.lineTo(sx * 84, -420); c.lineTo(sx * 130, -470); c.lineTo(sx * 98, -506); c.closePath();
    fill(c, P.coat); ln(c);
    c.beginPath(); c.moveTo(sx * 84, -420); c.lineTo(sx * 40, -320); ln(c, 1.6, P.coatDeep);
  }
  c.beginPath(); c.moveTo(0, -300); c.lineTo(0, 900); ln(c, 2.4);
  for (const by of [-250, -140, -30, 80, 190]) { c.beginPath(); c.arc(-14, by, 7, 0, TAU); fill(c, '#e4e9ef'); ln(c, 1.8); }
  c.beginPath(); c.rect(70, -300, 110, 90); ln(c, 2.4); c.beginPath(); c.moveTo(70, -282); c.lineTo(180, -282); ln(c, 1.4, P.coatDeep);
  c.beginPath(); c.moveTo(96, -300); c.lineTo(96, -330); ln(c, 5, '#2a4d7a');
  // stethoscope around the neck
  c.strokeStyle = '#121418'; c.lineWidth = 11; c.lineCap = 'round';
  c.beginPath(); c.moveTo(-58, -524); c.bezierCurveTo(-120, -470, -120, -330, -96, -250); c.stroke();
  c.beginPath(); c.moveTo(58, -524); c.bezierCurveTo(120, -470, 112, -340, 128, -250); c.stroke();
  c.lineWidth = 5; c.strokeStyle = '#b9c2cc';
  c.beginPath(); c.moveTo(-96, -250); c.quadraticCurveTo(-112, -210, -136, -214); c.stroke(); c.beginPath(); c.moveTo(-96, -250); c.quadraticCurveTo(-80, -206, -58, -212); c.stroke();
  for (const [x, y] of [[-140, -214], [-54, -212]]) { c.beginPath(); c.arc(x, y, 8, 0, TAU); fill(c, '#121418'); }
  c.beginPath(); c.arc(128, -236, 22, 0, TAU); fill(c, '#c9d1d9'); ln(c, 3); c.beginPath(); c.arc(128, -236, 12, 0, TAU); fill(c, '#e9eef3'); ln(c, 2);
}

export function drawSanad(c, p, t = 0) {
  const s = p.s ?? 1;
  c.save(); c.translate(p.x, p.y); c.scale(s * (p.flip ? -1 : 1), s); c.rotate(p.lean || 0);
  const arms = p.arms || {};
  const L = arms.l || [0.08, 0.1, 'rest'], R = arms.r || [0.08, 0.1, 'rest'];
  torso(c);
  c.save(); c.translate(0, -690); c.rotate(p.headTilt || 0); head(c, p.face || {}, p.look || [0, 0], p.headTurn || 0, t); c.restore();
  arm(c, -1, L[0], L[1], L[2]); arm(c, 1, R[0], R[1], R[2]);
  c.restore();
}
