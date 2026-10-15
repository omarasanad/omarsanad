// Cartoon character rigs and props for the celiac episode.
// Everything is vector-drawn on canvas with bold outlines, posed by numbers (pure function of time).
//
// drawPerson(c, look, pose)
//   look: the character model (skin, hair style, outfit, accessories) — see CAST below
//   pose: { x, y, s, flip, lean, bob, headTilt, look:[dx,dy], arms:{l:[a1,a2,hand], r:[a1,a2,hand]},
//           legs:'stand'|'walk'|'sit', walk (phase), face:{mood, blink, talk, brows}, belly (0..1 bloat) }
//   Arm angles are radians from straight down; positive swings the arm forward/out to the character's side.

const TAU = Math.PI * 2;
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export const INK = '#1d2433';
const LW = 6;

function outline(c, w = LW) { c.lineWidth = w; c.strokeStyle = INK; c.lineJoin = 'round'; c.lineCap = 'round'; c.stroke(); }
function blob(c, fill) { c.fillStyle = fill; c.fill(); outline(c); }
function rr(c, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}
function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.max(0, Math.min(255, Math.round(v * k)));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

// ------------------------------------------------------------------ cast
export const CAST = {
  sanad: { id: 'sanad', skin: '#d9a07c', hair: 'sanad', hairColor: '#1f1a17', beard: true, glasses: true, outfit: 'coat', inner: '#eef3f8', tie: '#15181d', steth: true, pants: '#2b3445', shoes: '#1b1e24', watch: true },
  karim: { skin: '#d9a07a', hair: 'short', hairColor: '#2a1d16', outfit: 'shirt', top: '#f08a3c', pants: '#36507a', shoes: '#2b2b2b' },
  clinicDoc: { skin: '#c98d6a', hair: 'hijab', hairColor: '#3c6e9e', outfit: 'scrubs', top: '#3fb6a8', pants: '#3fb6a8', shoes: '#f4f4f4', glasses: false },
  dicke: { skin: '#f0c9a8', hair: 'sidepart', hairColor: '#6b5b4e', glasses: true, outfit: 'coat', inner: '#d9d4c8', tie: '#5a2a2a', steth: false, pants: '#3f3a36', shoes: '#2a2420' },
  kidA: { skin: '#f3cfb0', hair: 'kid', hairColor: '#c58b3a', outfit: 'sweater', top: '#8a5a44', pants: '#5b5f6b', shoes: '#3a2f2a', kid: true },
  kidB: { skin: '#f1c6a3', hair: 'girl', hairColor: '#7a4a2a', outfit: 'sweater', top: '#5c7a63', pants: '#7a3b3b', shoes: '#3a2f2a', kid: true },
  nurse: { skin: '#f0c9a8', hair: 'nursecap', hairColor: '#5a4636', outfit: 'scrubs', top: '#e9e4d8', pants: '#e9e4d8', shoes: '#2a2420' },
  dutchMan: { skin: '#eac2a0', hair: 'cap', hairColor: '#4a4038', outfit: 'longcoat', top: '#4b4a46', pants: '#2f2e2c', shoes: '#211d1a' },
  mech: { skin: '#f0d2b4', hair: 'mech', hairColor: '#d9d6cf', glasses: true, bigBeard: '#e6e3dc', outfit: 'longcoat', top: '#3e3a36', pants: '#2c2926', shoes: '#1e1b18' },
  researcher: { skin: '#efc9a8', hair: 'sidepart', hairColor: '#8c8a86', glasses: true, outfit: 'coat', inner: '#dfe9f2', tie: '#2a4d7a', steth: false, pants: '#3a4252', shoes: '#22262e' },
  dutchWoman: { skin: '#f0c9a8', hair: 'scarf', hairColor: '#8a3b3b', outfit: 'longcoat', top: '#6b5a46', pants: '#3a332c', shoes: '#211d1a' },
};

// ------------------------------------------------------------------ person
function limb(c, x, y, a1, a2, l1, l2, w, col) {
  const kx = x + Math.sin(a1) * l1, ky = y + Math.cos(a1) * l1;
  const ex = kx + Math.sin(a1 + a2) * l2, ey = ky + Math.cos(a1 + a2) * l2;
  c.lineCap = 'round'; c.lineJoin = 'round';
  c.strokeStyle = INK; c.lineWidth = w + LW * 2;
  c.beginPath(); c.moveTo(x, y); c.lineTo(kx, ky); c.lineTo(ex, ey); c.stroke();
  c.strokeStyle = col; c.lineWidth = w;
  c.beginPath(); c.moveTo(x, y); c.lineTo(kx, ky); c.lineTo(ex, ey); c.stroke();
  return [ex, ey, a1 + a2];
}
function hand(c, x, y, ang, kind, skin) {
  c.save(); c.translate(x, y); c.rotate(-ang);
  if (kind === 'point') {
    c.beginPath(); rr(c, -5, 4, 11, 34, 6); blob(c, skin);
  }
  if (kind === 'thumb') {
    c.beginPath(); rr(c, -16, -30, 12, 30, 6); blob(c, skin);
  }
  c.beginPath(); c.arc(0, 6, 19, 0, TAU); blob(c, skin);
  if (kind === 'open') {
    for (const dx of [-10, 0, 10]) { c.beginPath(); rr(c, dx - 4, 16, 9, 18, 4); blob(c, skin); }
  }
  c.restore();
}
function shoe(c, x, y, col, flip = 1) {
  c.beginPath(); c.ellipse(x + 12 * flip, y + 4, 30, 15, 0, 0, TAU); blob(c, col);
}

export function drawPerson(c, L, p, t = 0) {
  const s = p.s ?? 1, kid = L.kid ? 0.78 : 1;
  c.save();
  c.translate(p.x, p.y + (p.bob || 0)); c.scale(s * kid * (p.flip ? -1 : 1), s * kid);
  const legLen = L.kid ? 92 : 108;
  // ---- legs
  const hipY = -2 * legLen + 6;
  if (p.legs === 'sit') {
    for (const sx of [-1, 1]) {
      const [ex, ey] = limb(c, sx * 26, hipY, 1.5, -1.45, legLen, legLen, 42, L.pants);
      shoe(c, ex, ey, L.shoes);
    }
  } else {
    const ph = p.walk || 0, walking = p.legs === 'walk';
    for (const sx of [-1, 1]) {
      const sw = walking ? Math.sin(ph + (sx > 0 ? Math.PI : 0)) : 0;
      const a1 = walking ? sw * 0.42 : sx * -0.04, a2 = walking ? -Math.max(0, -Math.cos(ph + (sx > 0 ? Math.PI : 0))) * 0.7 : 0;
      const [ex, ey] = limb(c, sx * 26, hipY, a1, a2, legLen, legLen, 42, L.pants);
      shoe(c, ex, ey, L.shoes);
    }
  }
  // ---- torso (leans around the hips)
  c.save(); c.translate(0, hipY); c.rotate(p.lean || 0);
  const TH = L.kid ? 190 : 225, SW = L.kid ? 74 : 86, HW = L.kid ? 64 : 72;
  const belly = p.belly || 0;
  const torso = () => {
    c.beginPath();
    c.moveTo(-HW, 0); c.bezierCurveTo(-HW - belly * 60, -TH * 0.3, -SW - 6, -TH * 0.7, -SW + 8, -TH);
    c.quadraticCurveTo(0, -TH - 18, SW - 8, -TH);
    c.bezierCurveTo(SW + 6, -TH * 0.7, HW + belly * 60, -TH * 0.3, HW, 0);
    c.quadraticCurveTo(0, 14 + belly * 30, -HW, 0); c.closePath();
  };
  const outfitCol = L.outfit === 'coat' ? '#f7f9fc' : L.top;
  torso(); blob(c, outfitCol);
  if (L.outfit === 'coat') {
    // shirt + tie in the V, lapels, pocket
    c.beginPath(); c.moveTo(-34, -TH + 4); c.lineTo(0, -TH * 0.55); c.lineTo(34, -TH + 4); c.closePath(); blob(c, L.inner);
    c.beginPath(); c.moveTo(-9, -TH + 8); c.lineTo(9, -TH + 8); c.lineTo(12, -TH * 0.62); c.lineTo(0, -TH * 0.55); c.lineTo(-12, -TH * 0.62); c.closePath(); blob(c, L.tie);
    c.beginPath(); c.moveTo(-34, -TH + 4); c.lineTo(-10, -TH * 0.5); c.lineTo(-30, -TH * 0.42); c.moveTo(34, -TH + 4); c.lineTo(10, -TH * 0.5); c.lineTo(30, -TH * 0.42); outline(c, 4);
    c.beginPath(); c.moveTo(0, -TH * 0.52); c.lineTo(0, -6); outline(c, 3);
    for (const by of [0.4, 0.22]) { c.beginPath(); c.arc(-8, -TH * by, 4, 0, TAU); c.fillStyle = '#c9d2dc'; c.fill(); }
    c.beginPath(); rr(c, 22, -TH * 0.5, 36, 30, 4); outline(c, 3);
    if (L.steth) {
      c.strokeStyle = INK; c.lineWidth = 7; c.lineCap = 'round';
      c.beginPath(); c.moveTo(-38, -TH + 6); c.bezierCurveTo(-58, -TH * 0.6, -40, -TH * 0.38, -24, -TH * 0.36); c.stroke();
      c.beginPath(); c.moveTo(38, -TH + 6); c.bezierCurveTo(54, -TH * 0.7, 46, -TH * 0.5, 40, -TH * 0.4); c.stroke();
      c.beginPath(); c.arc(40, -TH * 0.36, 11, 0, TAU); c.fillStyle = '#c7ced6'; c.fill(); outline(c, 4);
    }
  } else if (L.outfit === 'scrubs') {
    c.beginPath(); c.moveTo(-30, -TH + 4); c.lineTo(0, -TH * 0.72); c.lineTo(30, -TH + 4); blob(c, L.skin);
  } else if (L.outfit === 'shirt') {
    c.beginPath(); c.moveTo(-26, -TH + 2); c.lineTo(0, -TH + 30); c.lineTo(26, -TH + 2); c.closePath(); blob(c, shade(L.top, 0.85));
    for (const by of [0.6, 0.4, 0.2]) { c.beginPath(); c.arc(0, -TH * by, 4, 0, TAU); c.fillStyle = shade(L.top, 0.7); c.fill(); }
  } else if (L.outfit === 'sweater') {
    c.beginPath(); c.moveTo(-30, -TH + 2); c.quadraticCurveTo(0, -TH + 22, 30, -TH + 2); outline(c, 4);
    c.beginPath(); c.moveTo(-HW + 4, -16); c.lineTo(HW - 4, -16); outline(c, 3);
  } else if (L.outfit === 'longcoat') {
    c.beginPath(); c.moveTo(0, -TH + 10); c.lineTo(0, 0); outline(c, 3);
    for (const by of [0.7, 0.45, 0.2]) { c.beginPath(); c.arc(-12, -TH * by, 5, 0, TAU); c.fillStyle = INK; c.fill(); }
  }
  // ---- arms
  const shY = -TH + 12, sleeve = L.outfit === 'coat' ? '#f7f9fc' : (L.outfit === 'longcoat' ? L.top : L.top);
  if (p.crossed) {
    // arms folded across the chest (the doctor's signature pose)
    const y1 = -TH * 0.44, y2 = -TH * 0.37;
    for (const sx of [-1, 1]) limb(c, sx * (SW - 10), shY, sx * 0.16, 0, (y2 - shY) / Math.cos(0.16), 1, 34, sleeve);
    c.lineCap = 'round';
    for (const [y, x0, x1, top] of [[y2, -SW - 8, SW - 34, false], [y1, SW + 8, -SW + 34, true]]) {
      c.strokeStyle = INK; c.lineWidth = 34 + LW * 2; c.beginPath(); c.moveTo(x0, y); c.lineTo(x1, y - 6); c.stroke();
      c.strokeStyle = sleeve; c.lineWidth = 34; c.beginPath(); c.moveTo(x0, y); c.lineTo(x1, y - 6); c.stroke();
      if (top) { c.beginPath(); c.ellipse(x1 + 4, y - 8, 22, 15, 0, 0, TAU); blob(c, L.skin); }
    }
    if (L.watch) { c.beginPath(); c.arc(-SW + 44, y2 - 2, 12, 0, TAU); blob(c, '#2b2f36'); }
    c.beginPath(); c.ellipse(SW - 26, y2 - 4, 20, 14, 0, 0, TAU); blob(c, L.skin);
  }
  const arms = p.arms || {};
  const armDef = (k) => arms[k] || [0.12, 0.1, 'fist'];
  for (const [k, sx] of (p.crossed ? [] : [['l', -1], ['r', 1]])) {
    const [a1, a2, kind] = armDef(k);
    const A1 = sx * a1, A2 = sx * a2;
    const [ex, ey, ang] = limb(c, sx * (SW - 10), shY, A1, A2, L.kid ? 74 : 92, L.kid ? 70 : 86, 32, sleeve);
    if (L.watch && k === 'l') {
      const wx = sx * (SW - 10) + Math.sin(A1) * 92 + Math.sin(A1 + A2) * 70, wy = shY + Math.cos(A1) * 92 + Math.cos(A1 + A2) * 70;
      c.beginPath(); c.arc(wx, wy, 11, 0, TAU); blob(c, '#2b2f36');
    }
    hand(c, ex, ey, ang, kind, L.skin);
  }
  // ---- neck + head
  c.beginPath(); rr(c, -20, -TH - 34, 40, 44, 12); blob(c, L.skin);
  c.translate(0, -TH - 95); c.rotate(p.headTilt || 0);
  drawHead(c, L, p.face || {}, p.look || [0, 0], t);
  c.restore();
  c.restore();
}

export function drawHead(c, L, f, look, t) {
  if (L.id === 'sanad') return drawSanadHead(c, L, f, look, t);
  const sk = L.skin;
  // hair behind
  if (L.hair === 'girl') { c.beginPath(); c.ellipse(0, 30, 92, 110, 0, 0, TAU); blob(c, L.hairColor); }
  if (L.hair === 'hijab') { c.beginPath(); c.ellipse(0, 22, 102, 118, 0, 0, TAU); blob(c, L.hairColor); c.beginPath(); c.moveTo(-90, 60); c.quadraticCurveTo(0, 170, 90, 60); c.lineTo(90, 120); c.quadraticCurveTo(0, 190, -90, 120); c.closePath(); blob(c, L.hairColor); }
  if (L.hair === 'scarf') { c.beginPath(); c.ellipse(0, 10, 98, 104, 0, 0, TAU); blob(c, L.hairColor); }
  // ears
  if (!['hijab', 'scarf'].includes(L.hair)) for (const sx of [-1, 1]) { c.beginPath(); c.ellipse(sx * 80, 6, 16, 22, 0, 0, TAU); blob(c, sk); }
  // face
  c.beginPath(); c.ellipse(0, 0, 80, 90, 0, 0, TAU); blob(c, sk);
  // beard stubble + mustache (Dr. Sanad)
  if (L.beard) {
    c.save(); c.beginPath(); c.ellipse(0, 0, 77, 87, 0, 0, TAU); c.clip();
    c.fillStyle = 'rgba(40,28,24,0.42)';
    c.beginPath(); c.moveTo(-80, 5); c.quadraticCurveTo(-70, 60, -30, 80); c.quadraticCurveTo(0, 100, 30, 80); c.quadraticCurveTo(70, 60, 80, 5);
    c.lineTo(80, 100); c.lineTo(-80, 100); c.closePath(); c.fill();
    c.restore();
    c.fillStyle = 'rgba(40,28,24,0.5)'; c.beginPath(); c.moveTo(-24, 34); c.quadraticCurveTo(0, 24, 24, 34); c.quadraticCurveTo(0, 30, -24, 34); c.fill();
  }
  // hair on top
  c.fillStyle = L.hairColor;
  if (L.hair === 'sanad') {
    // short dark hair on top, receding at the temples, close-cropped sides
    c.beginPath();
    c.moveTo(-81, -2); c.quadraticCurveTo(-90, -86, -8, -101); c.quadraticCurveTo(84, -100, 82, -2);
    c.quadraticCurveTo(80, -34, 66, -44); c.quadraticCurveTo(58, -64, 44, -66);
    c.quadraticCurveTo(20, -72, 0, -68); c.quadraticCurveTo(-22, -72, -44, -66);
    c.quadraticCurveTo(-58, -64, -66, -44); c.quadraticCurveTo(-80, -34, -81, -2); c.closePath(); blob(c, L.hairColor);
    c.fillStyle = 'rgba(255,255,255,0.16)'; c.beginPath(); c.ellipse(-10, -88, 30, 6, -0.1, 0, TAU); c.fill();
  } else if (L.hair === 'short' || L.hair === 'kid') {
    c.beginPath(); c.moveTo(-84, -4); c.quadraticCurveTo(-92, -90, 0, -98); c.quadraticCurveTo(92, -90, 84, -4);
    c.quadraticCurveTo(70, -50, 30, -58); c.quadraticCurveTo(L.hair === 'kid' ? 10 : 0, -40, -20, -60); c.quadraticCurveTo(-70, -52, -84, -4); c.closePath(); blob(c, L.hairColor);
    if (L.hair === 'kid') for (const dx of [-30, 0, 30]) { c.beginPath(); c.moveTo(dx - 10, -94); c.lineTo(dx, -114); c.lineTo(dx + 10, -94); blob(c, L.hairColor); }
  } else if (L.hair === 'girl') {
    c.beginPath(); c.moveTo(-84, 10); c.quadraticCurveTo(-90, -96, 0, -98); c.quadraticCurveTo(90, -96, 84, 10); c.quadraticCurveTo(66, -54, 0, -62); c.quadraticCurveTo(-66, -54, -84, 10); blob(c, L.hairColor);
  } else if (L.hair === 'sidepart') {
    c.beginPath(); c.moveTo(-84, -6); c.quadraticCurveTo(-88, -96, 10, -100); c.quadraticCurveTo(90, -90, 84, -6); c.quadraticCurveTo(80, -60, 20, -66); c.lineTo(-20, -82); c.quadraticCurveTo(-70, -60, -84, -6); blob(c, L.hairColor);
  } else if (L.hair === 'cap') {
    c.beginPath(); c.ellipse(0, -66, 92, 40, 0, Math.PI, 0); c.closePath(); blob(c, L.hairColor);
    c.beginPath(); rr(c, -96, -70, 140, 18, 8); blob(c, shade(L.hairColor, 0.8));
  } else if (L.hair === 'scarf' || L.hair === 'hijab') {
    c.beginPath(); c.ellipse(0, -30, 84, 66, 0, Math.PI, 0); c.closePath(); blob(c, L.hairColor);
  } else if (L.hair === 'mech') {
    c.beginPath(); c.moveTo(-86, 30); c.quadraticCurveTo(-96, -60, -50, -80); c.quadraticCurveTo(0, -60, 50, -80); c.quadraticCurveTo(96, -60, 86, 30); c.quadraticCurveTo(70, -20, 0, -40); c.quadraticCurveTo(-70, -20, -86, 30); blob(c, L.hairColor);
  } else if (L.hair === 'nursecap') {
    c.beginPath(); c.moveTo(-84, -4); c.quadraticCurveTo(-90, -90, 0, -96); c.quadraticCurveTo(90, -90, 84, -4); c.quadraticCurveTo(50, -60, -84, -4); blob(c, L.hairColor);
    c.beginPath(); rr(c, -46, -128, 92, 42, 8); blob(c, '#fbfbf6'); c.fillStyle = '#c0392b'; c.fillRect(-6, -120, 12, 26); c.fillRect(-13, -113, 26, 12);
  }
  // ---- face features
  const mood = f.mood || 'neutral', blink = f.blink || 0;
  const [lx, ly] = look;
  for (const sx of [-1, 1]) {
    const ex = sx * 30, ey = -8;
    if (mood === 'happy' && !f.talk) {
      c.beginPath(); c.arc(ex, ey + 6, 13, Math.PI * 1.1, Math.PI * 1.9); outline(c, 6);
    } else {
      const big = mood === 'surprised' ? 1.25 : 1, lid = mood === 'tired' ? 0.45 : 1;
      const hy = 18 * big * Math.max(0.08, (1 - blink)) * lid;
      c.beginPath(); c.ellipse(ex, ey + (1 - lid) * 6, 15 * big, hy, 0, 0, TAU); blob(c, '#ffffff');
      if (hy > 4) { c.beginPath(); c.arc(ex + lx * 6, ey + ly * 5 + (1 - lid) * 6, 7 * big, 0, TAU); c.fillStyle = INK; c.fill(); }
      if (mood === 'tired') { c.beginPath(); c.moveTo(ex - 16, ey - 2); c.lineTo(ex + 16, ey - 2); outline(c, 5); }
    }
    // brows
    const bAng = { worried: sx * 0.35, angry: -sx * 0.4, sly: sx * (sx > 0 ? -0.4 : 0.1), surprised: 0, sad: sx * 0.3 }[mood] ?? 0;
    const by = ey - 32 - (mood === 'surprised' ? 8 : 0) + (f.brows || 0);
    c.save(); c.translate(ex, by); c.rotate(bAng);
    c.beginPath(); c.moveTo(-15, 0); c.lineTo(15, 0); outline(c, 8); c.restore();
  }
  if (L.glasses) {
    c.lineWidth = 6; c.strokeStyle = '#121418';
    for (const sx of [-1, 1]) { c.beginPath(); rr(c, sx * 30 - 26, -30, 52, 42, 16); c.stroke(); }
    c.beginPath(); c.moveTo(-4, -14); c.lineTo(4, -14); c.stroke();
    c.beginPath(); c.moveTo(-56, -16); c.lineTo(-78, -12); c.moveTo(56, -16); c.lineTo(78, -12); c.stroke();
  }
  // nose
  c.beginPath(); c.moveTo(-2, 4); c.quadraticCurveTo(10, 18, -4, 22); outline(c, 4);
  // mouth
  const talk = f.talk || 0;
  c.save(); c.translate(0, 48);
  if (talk > 0.05) {
    const h = 6 + 20 * talk;
    c.beginPath(); c.ellipse(0, 0, 18 + 6 * talk, h, 0, 0, TAU); blob(c, '#7a2630');
    c.save(); c.clip(); c.fillStyle = '#e46a76'; c.beginPath(); c.ellipse(0, h, 14, h * 0.6, 0, 0, TAU); c.fill();
    c.fillStyle = '#fff'; c.fillRect(-14, -h, 28, 6); c.restore();
  } else if (mood === 'happy' || mood === 'neutral' || mood === 'sly') {
    c.beginPath(); c.arc(0, -10, 26, 0.2 * Math.PI, 0.8 * Math.PI); outline(c, 6);
    if (mood === 'sly') { c.beginPath(); c.moveTo(16, 8); c.lineTo(28, 2); outline(c, 6); }
  } else if (mood === 'worried' || mood === 'sad' || mood === 'tired') {
    c.beginPath(); c.arc(0, 20, 20, 1.2 * Math.PI, 1.8 * Math.PI); outline(c, 6);
  } else if (mood === 'surprised') {
    c.beginPath(); c.ellipse(0, 4, 12, 16, 0, 0, TAU); blob(c, '#7a2630');
  } else if (mood === 'pain') {
    c.beginPath(); for (let k = 0; k <= 6; k++) c.lineTo(-22 + k * 7.3, (k % 2 ? -5 : 5)); outline(c, 6);
  }
  c.restore();
  if (L.bigBeard) {
    c.beginPath(); c.moveTo(-70, 20); c.quadraticCurveTo(-80, 150, 0, 190); c.quadraticCurveTo(80, 150, 70, 20); c.quadraticCurveTo(40, 70, 20, 62); c.quadraticCurveTo(0, 74, -20, 62); c.quadraticCurveTo(-40, 70, -70, 20); blob(c, L.bigBeard);
    c.beginPath(); c.moveTo(-34, 40); c.quadraticCurveTo(0, 26, 34, 40); c.quadraticCurveTo(0, 50, -34, 40); blob(c, L.bigBeard);
  }
  if (f.blush) { c.fillStyle = 'rgba(240,110,110,0.35)'; for (const sx of [-1, 1]) { c.beginPath(); c.ellipse(sx * 50, 26, 16, 9, 0, 0, TAU); c.fill(); } }
}

// ------------------------------------------------------------------ props & characters
// Egyptian baladi bread; alive > 0 grows a cheeky face.
export function drawBread(c, x, y, s, t, o = {}) {
  c.save(); c.translate(x, y); c.rotate(o.rot || 0); c.scale(s * (1 + (o.squash || 0)), s * (1 - (o.squash || 0)));
  c.fillStyle = 'rgba(0,0,0,0.18)'; c.beginPath(); c.ellipse(0, 74, 150, 22, 0, 0, TAU); c.fill();
  c.beginPath(); c.ellipse(0, 0, 160, 92, 0, 0, TAU);
  const g = c.createRadialGradient(-40, -40, 10, 0, 0, 170); g.addColorStop(0, '#f2c27c'); g.addColorStop(0.6, '#d9944a'); g.addColorStop(1, '#a8652b');
  c.fillStyle = g; c.fill(); outline(c, 7);
  c.beginPath(); c.ellipse(-10, -26, 110, 46, 0, Math.PI * 1.05, Math.PI * 1.95); c.strokeStyle = 'rgba(255,240,210,0.6)'; c.lineWidth = 8; c.stroke();
  c.fillStyle = 'rgba(120,60,20,0.45)';
  for (const [dx, dy, r] of [[-90, 20, 9], [60, 30, 12], [100, -10, 7], [-40, 50, 8], [20, -50, 6], [-120, -20, 6]]) { c.beginPath(); c.arc(dx, dy, r, 0, TAU); c.fill(); }
  c.fillStyle = 'rgba(255,250,235,0.85)';
  for (const [dx, dy] of [[-60, -40], [40, -60], [90, 20], [-110, 30], [10, 40]]) { c.beginPath(); c.arc(dx, dy, 3, 0, TAU); c.fill(); }
  const a = o.alive || 0;
  if (a > 0) {
    c.save(); c.globalAlpha *= Math.min(1, a * 1.5); c.translate(0, -6); c.scale(0.6 + 0.4 * a, 0.6 + 0.4 * a);
    for (const sx of [-1, 1]) {
      c.beginPath(); c.ellipse(sx * 42, -6, 20, 24, 0, 0, TAU); blob(c, '#fff');
      c.beginPath(); c.arc(sx * 42 + (o.lookX || 0) * 8, 0, 9, 0, TAU); c.fillStyle = INK; c.fill();
      c.save(); c.translate(sx * 42, -40); c.rotate(sx * (o.mood === 'sly' ? -0.35 : 0.2)); c.beginPath(); c.moveTo(-18, 0); c.lineTo(18, 0); outline(c, 8); c.restore();
    }
    c.beginPath(); c.moveTo(-30, 34); c.quadraticCurveTo(0, 52, 34, 28); outline(c, 7);
    c.restore();
  }
  c.restore();
}
// a gluten grain with a mischievous face
export function drawGluten(c, x, y, s, t, ph = 0) {
  c.save(); c.translate(x, y + Math.sin(t * 5 + ph) * 4); c.rotate(Math.sin(t * 3 + ph) * 0.2); c.scale(s, s);
  c.beginPath(); c.ellipse(0, 0, 22, 32, 0, 0, TAU); blob(c, '#f2c14e');
  c.beginPath(); c.moveTo(0, -30); c.lineTo(0, 30); c.strokeStyle = 'rgba(160,110,20,0.6)'; c.lineWidth = 3; c.stroke();
  for (const sx of [-1, 1]) {
    c.beginPath(); c.arc(sx * 9, -4, 5, 0, TAU); c.fillStyle = INK; c.fill();
    c.save(); c.translate(sx * 9, -14); c.rotate(-sx * 0.5); c.beginPath(); c.moveTo(-6, 0); c.lineTo(6, 0); outline(c, 4); c.restore();
  }
  c.beginPath(); c.arc(0, 8, 7, 0.1 * Math.PI, 0.9 * Math.PI); outline(c, 4);
  c.restore();
}
// immune "soldier" cell
export function drawImmune(c, x, y, s, t, ph = 0, angry = 1) {
  c.save(); c.translate(x, y + Math.sin(t * 6 + ph) * 3); c.scale(s, s);
  c.beginPath(); for (let k = 0; k < 14; k++) { const a = k / 14 * TAU, r = 34 + 4 * Math.sin(k * 3 + t * 4 + ph); c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.closePath(); blob(c, '#7fb3ff');
  c.beginPath(); c.ellipse(0, -26, 30, 16, 0, Math.PI, 0); c.closePath(); blob(c, '#4a6b3a');
  for (const sx of [-1, 1]) {
    c.beginPath(); c.arc(sx * 11, -2, 6, 0, TAU); c.fillStyle = INK; c.fill();
    c.save(); c.translate(sx * 11, -12); c.rotate(-sx * 0.45 * angry); c.beginPath(); c.moveTo(-8, 0); c.lineTo(8, 0); outline(c, 4); c.restore();
  }
  c.beginPath(); c.moveTo(-8, 14); c.lineTo(8, 14); outline(c, 4);
  c.restore();
}

// Strip of small-intestine lining: villi heights 0..1 (1 healthy, ~0.2 flattened), inflamed 0..1.
export function drawVilli(c, x, y, w, h, health, t, o = {}) {
  c.save(); c.translate(x, y);
  const n = o.n || 9, cw = w / n, inflamed = 1 - health;
  // tissue base
  c.beginPath(); rr(c, 0, h * 0.62, w, h * 0.38, 18);
  const tg = c.createLinearGradient(0, h * 0.6, 0, h); tg.addColorStop(0, '#f0a3a3'); tg.addColorStop(1, '#c8667a');
  c.fillStyle = tg; c.fill(); outline(c);
  for (let i = 0; i < n; i++) {
    const cx = cw * (i + 0.5), vh = h * 0.62 * (0.18 + 0.82 * health) * (0.9 + 0.1 * Math.sin(i * 1.7));
    const sway = Math.sin(t * 2 + i) * 6 * health;
    c.beginPath();
    c.moveTo(cx - cw * 0.36, h * 0.64);
    c.bezierCurveTo(cx - cw * 0.4, h * 0.64 - vh * 0.7, cx - cw * 0.34 + sway, h * 0.64 - vh, cx + sway, h * 0.64 - vh);
    c.bezierCurveTo(cx + cw * 0.34 + sway, h * 0.64 - vh, cx + cw * 0.4, h * 0.64 - vh * 0.7, cx + cw * 0.36, h * 0.64);
    c.closePath();
    const r = Math.round(244 - 20 * inflamed), g = Math.round(170 - 90 * inflamed), b = Math.round(170 - 80 * inflamed);
    c.fillStyle = `rgb(${r},${g},${b})`; c.fill(); outline(c, 5);
    // capillary line
    c.beginPath(); c.moveTo(cx, h * 0.64); c.lineTo(cx + sway * 0.6, h * 0.64 - vh * 0.75); c.strokeStyle = 'rgba(180,40,60,0.45)'; c.lineWidth = 4; c.stroke();
  }
  c.restore();
}

// generic outlined rounded box / sign helpers for scenery
export function box(c, x, y, w, h, r, fill, lw = LW) { c.beginPath(); rr(c, x, y, w, h, r); c.fillStyle = fill; c.fill(); outline(c, lw); }
export { rr, outline, blob, shade };


// ------------------------------------------------------------------ Dr. Sanad: dedicated head with visemes
// Mouth shapes for speech: rest, M (closed/pressed), A (wide open), E (spread), O (round), F (teeth on lip).
const VISEMES = ['rest', 'M', 'A', 'E', 'O', 'F'];
export { VISEMES };
function sanadMouth(c, v, open, mood) {
  c.save(); c.translate(0, 52);
  const lip = '#9a4e46', dark = '#5a1f22';
  if (v === 'rest' || v === undefined) {
    const smile = mood === 'happy' ? 1 : mood === 'worried' || mood === 'serious' ? -0.4 : 0.55;
    c.beginPath(); c.moveTo(-24, -2); c.quadraticCurveTo(0, 10 * smile + 2, 24, -2); outline(c, 5);
    if (mood === 'happy') { c.beginPath(); c.moveTo(-20, 0); c.quadraticCurveTo(0, 16, 20, 0); c.quadraticCurveTo(0, 8, -20, 0); c.fillStyle = '#fff'; c.fill(); }
  } else if (v === 'M') {
    c.beginPath(); c.moveTo(-20, 0); c.quadraticCurveTo(0, 4, 20, 0); outline(c, 7);
  } else {
    const o = 0.35 + 0.65 * open;
    const sh = { A: [20, 17], E: [26, 9], O: [12, 14], F: [20, 8] }[v];
    const w = sh[0] * (v === 'O' ? 1 : 0.9 + 0.1 * o), h = sh[1] * o;
    c.beginPath(); c.ellipse(0, 2, w, Math.max(3, h), 0, 0, TAU); c.fillStyle = dark; c.fill(); outline(c, 5);
    c.save(); c.beginPath(); c.ellipse(0, 2, w - 2, Math.max(2, h - 2), 0, 0, TAU); c.clip();
    c.fillStyle = '#fff'; c.fillRect(-w, 2 - h, w * 2, Math.min(7, h * 0.5));                 // upper teeth
    if (v === 'F') { c.fillStyle = lip; c.fillRect(-w, 2 + h * 0.2, w * 2, h); }               // lower lip under teeth
    else { c.fillStyle = '#d4626e'; c.beginPath(); c.ellipse(0, 2 + h * 0.8, w * 0.6, h * 0.5, 0, 0, TAU); c.fill(); } // tongue
    c.restore();
  }
  c.restore();
}
export function drawSanadHead(c, L, f, look, t) {
  const sk = L.skin, mood = f.mood || 'neutral', blink = f.blink || 0, brow = f.brows || 0;
  // ears
  for (const sx of [-1, 1]) {
    c.beginPath(); c.ellipse(sx * 74, 6, 15, 25, 0, 0, TAU); blob(c, sk);
    c.beginPath(); c.arc(sx * 74, 6, 8, sx > 0 ? -1.2 : 1.9, sx > 0 ? 1.2 : 4.4); outline(c, 3);
  }
  // face: long oval narrowing to a bearded chin
  const face = () => { c.beginPath(); c.moveTo(-72, -28); c.bezierCurveTo(-76, -112, 76, -112, 72, -28); c.bezierCurveTo(74, 44, 48, 96, 0, 100); c.bezierCurveTo(-48, 96, -74, 44, -72, -28); c.closePath(); };
  face(); blob(c, sk);
  c.save(); face(); c.clip();
  // short beard along the jaw, chin and mustache (stubble texture)
  c.fillStyle = 'rgba(28,22,22,0.5)';
  c.beginPath(); c.moveTo(-76, -6); c.bezierCurveTo(-70, 30, -60, 30, -44, 34); c.bezierCurveTo(-34, 30, -30, 30, -26, 36);
  c.bezierCurveTo(-30, 64, -14, 76, 0, 76); c.bezierCurveTo(14, 76, 30, 64, 26, 36); c.bezierCurveTo(30, 30, 34, 30, 44, 34);
  c.bezierCurveTo(60, 30, 70, 30, 76, -6); c.lineTo(80, 110); c.lineTo(-80, 110); c.closePath(); c.fill();
  c.beginPath(); c.moveTo(-28, 38); c.quadraticCurveTo(0, 26, 28, 38); c.quadraticCurveTo(0, 34, -28, 38); c.fillStyle = 'rgba(28,22,22,0.7)'; c.fill();
  const r = rng(12); c.fillStyle = 'rgba(15,12,12,0.22)';
  for (let i = 0; i < 90; i++) { const a = r() * Math.PI, rr2 = 60 + r() * 30; const x = Math.cos(a) * rr2 * 0.9, y = 20 + Math.sin(a) * rr2 * 0.85; if (y > 30) { c.beginPath(); c.arc(x, y, 1.6, 0, TAU); c.fill(); } }
  // soft cheek shading
  c.fillStyle = 'rgba(160,80,60,0.12)'; for (const sx of [-1, 1]) { c.beginPath(); c.ellipse(sx * 44, 22, 18, 12, 0, 0, TAU); c.fill(); }
  c.restore();
  // hair: very short and dark, receding at the temples, thinner on top
  c.beginPath();
  c.moveTo(-74, -4); c.quadraticCurveTo(-84, -92, 0, -104); c.quadraticCurveTo(84, -92, 74, -4);
  c.quadraticCurveTo(72, -38, 62, -50); c.quadraticCurveTo(52, -56, 46, -74);
  c.quadraticCurveTo(22, -86, 0, -84); c.quadraticCurveTo(-22, -86, -46, -74);
  c.quadraticCurveTo(-52, -56, -62, -50); c.quadraticCurveTo(-72, -38, -74, -4); c.closePath();
  c.fillStyle = '#231a16'; c.fill(); outline(c, 5);
  c.fillStyle = 'rgba(217,160,124,0.35)'; c.beginPath(); c.ellipse(0, -90, 30, 9, 0, 0, TAU); c.fill();   // thinning crown
  // eyebrows (raise with emphasis)
  for (const sx of [-1, 1]) {
    const ang = { worried: sx * 0.28, serious: -sx * 0.12, surprised: 0 }[mood] ?? sx * 0.06;
    c.save(); c.translate(sx * 29, -36 - brow * 10 - (mood === 'surprised' ? 8 : 0)); c.rotate(ang);
    c.beginPath(); c.moveTo(-17, 2); c.quadraticCurveTo(0, -5, 17, 1); c.lineCap = 'round'; c.strokeStyle = '#1e1613'; c.lineWidth = 9; c.stroke(); c.restore();
  }
  // eyes: almond shape, brown iris; squint when smiling
  const [lx, ly] = look;
  for (const sx of [-1, 1]) {
    const ex = sx * 29, ey = -8;
    if (mood === 'happy' && blink < 0.5) {
      c.beginPath(); c.moveTo(ex - 13, ey + 3); c.quadraticCurveTo(ex, ey - 9, ex + 13, ey + 3); outline(c, 5);
    } else {
      const h = 10 * Math.max(0.06, 1 - blink) * (mood === 'surprised' ? 1.3 : 1);
      c.beginPath(); c.moveTo(ex - 14, ey); c.quadraticCurveTo(ex, ey - h * 1.4, ex + 14, ey); c.quadraticCurveTo(ex, ey + h * 1.1, ex - 14, ey); c.closePath();
      c.fillStyle = '#fff'; c.fill(); outline(c, 3.5);
      if (h > 3) { c.save(); c.clip(); c.beginPath(); c.arc(ex + lx * 4, ey + ly * 3, 7, 0, TAU); c.fillStyle = '#4a2f22'; c.fill(); c.beginPath(); c.arc(ex + lx * 4, ey + ly * 3, 3.2, 0, TAU); c.fillStyle = '#120c0a'; c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(ex + lx * 4 - 2, ey + ly * 3 - 2, 1.6, 0, TAU); c.fill(); c.restore(); }
      c.beginPath(); c.moveTo(ex - 14, ey); c.quadraticCurveTo(ex, ey - h * 1.4, ex + 14, ey); outline(c, 4);
    }
  }
  // glasses: thin dark rounded-rectangle frames, heavier top rim
  for (const sx of [-1, 1]) {
    c.beginPath(); rr(c, sx * 30 - 27, -28, 54, 40, 14); c.fillStyle = 'rgba(200,225,240,0.12)'; c.fill(); c.lineWidth = 4.5; c.strokeStyle = '#17191d'; c.stroke();
    c.beginPath(); c.moveTo(sx * 30 - 25, -26); c.quadraticCurveTo(sx * 30, -31, sx * 30 + 25, -26); c.lineWidth = 7; c.stroke();
    c.beginPath(); c.moveTo(sx * 57, -20); c.lineTo(sx * 74, -14); c.lineWidth = 4.5; c.stroke();
  }
  c.beginPath(); c.moveTo(-3, -16); c.quadraticCurveTo(0, -20, 3, -16); c.lineWidth = 4; c.stroke();
  // nose: longer, with a nostril curve
  c.beginPath(); c.moveTo(-3, -4); c.quadraticCurveTo(-4, 16, -10, 24); c.quadraticCurveTo(0, 32, 10, 25); outline(c, 4);
  // mouth: viseme if speaking, otherwise expression
  sanadMouth(c, f.viseme || 'rest', f.talk || 0, mood);
}
