// Dr. Sanad — 2D cutout rig built from the approved master illustration (scripts/build_master_rig.py).
// One character. Parts: torso (breathing, weight shift) · head on a neck pivot (tilt, nod) with a jaw that
// really opens (pre-warped from the master art, 8 levels x wide/round) · brows (raise / concern, warped from the
// same face) · eyelids (procedural blink) · both forearms rotating at the elbows (gestures, pointing).

const BASE = '../assets/character/master_rig/';
export const MR = { j: null, img: {} };
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));

export async function loadMasterRig() {
  MR.j = await (await fetch(BASE + 'rig.json')).json();
  const names = ['torso', 'forearm_l', 'forearm_r', 'brow_up1', 'brow_up2', 'brow_concern'];
  for (const s of MR.j.parts.head.shapes) for (let k = 0; k < MR.j.parts.head.levels; k++) names.push(`head_${s}_${k}`);
  await Promise.all(names.map((n) => new Promise((res) => { const i = new Image(); i.onload = () => { MR.img[n] = i; res(); }; i.onerror = res; i.src = BASE + n + '.png'; })));
  return names.every((n) => MR.img[n]);
}

// st: { jaw: {shape, open 0..1}, brow: {raise 0..1, concern 0..1}, blink 0..1, head: {tilt, dx, dy},
//       arm: {l, r} (elbow rotation, outward positive for both), breathe -1..1, sway (rad) }
export function drawMaster(c, x, y, scale, st, flip = false) {
  const J = MR.j, I = MR.img; if (!J) return;
  const P = J.parts, [fx, fy] = J.feet;
  c.save();
  c.translate(x, y); c.scale(flip ? -scale : scale, scale); c.rotate(st.sway || 0); c.translate(-fx, -fy);
  const br = st.breathe || 0, lift = br * 2.2;                     // shoulders/head rise a little on the in-breath
  // torso: breathing = tiny vertical stretch about the hips
  c.save(); c.translate(fx, 1300); c.scale(1 + br * 0.002, 1 + br * 0.0045); c.translate(-fx, -1300);
  c.drawImage(I.torso, ...P.torso.offset);
  c.restore();
  // head
  const hd = st.head || {}, [hx, hy] = P.head.pivot;
  c.save();
  c.translate(hx + (hd.dx || 0), hy + (hd.dy || 0) - lift); c.rotate(hd.tilt || 0); c.translate(-hx, -hy);
  const jw = st.jaw || { shape: 'wide', open: 0 }, L = P.head.levels - 1, f = clamp(jw.open) * L;
  const k0 = Math.floor(f), k1 = Math.min(L, k0 + 1), w = f - k0, [ox, oy] = P.head.offset;
  c.drawImage(I[`head_${jw.shape}_${k0}`], ox, oy);
  if (w > 0.02) { c.globalAlpha = w; c.drawImage(I[`head_${jw.shape}_${k1}`], ox, oy); c.globalAlpha = 1; }
  const b = st.brow || {};
  const r = clamp(b.raise || 0);
  if (b.concern > 0.02) { c.globalAlpha = clamp(b.concern); c.drawImage(I.brow_concern, ox, oy); c.globalAlpha = 1; }
  else if (r > 0.02) {
    c.globalAlpha = clamp(r * 2); c.drawImage(I.brow_up1, ox, oy);
    if (r > 0.5) { c.globalAlpha = (r - 0.5) * 2; c.drawImage(I.brow_up2, ox, oy); }
    c.globalAlpha = 1;
  }
  if (st.blink > 0.02) lids(c, st.blink);
  c.restore();
  // forearms (in front of the coat), rotating at the elbows
  for (const side of ['l', 'r']) {
    const p = P['forearm_' + side], [px, py] = p.pivot, a = (st.arm && st.arm[side]) || 0;
    c.save(); c.translate(px, py - lift * 0.6); c.rotate(side === 'l' ? a : -a); c.translate(-px, -py);
    c.drawImage(I['forearm_' + side], ...p.offset); c.restore();
  }
  c.restore();
}

function lids(c, k) {
  const [lr, lg, lb] = MR.j.lid;
  for (const [x, y, rx, ry, a] of MR.j.eyes) {
    c.save(); c.translate(x, y); c.rotate(a);
    c.beginPath(); c.ellipse(0, 0, rx + 1, ry + 1.5, 0, 0, Math.PI * 2); c.clip();
    const edge = -ry - 2 + (2 * ry + 4) * clamp(k);
    const g = c.createLinearGradient(0, -ry - 2, 0, edge);
    g.addColorStop(0, `rgb(${lr - 12},${lg - 16},${lb - 16})`); g.addColorStop(1, `rgb(${lr},${lg},${lb})`);
    c.fillStyle = g; c.fillRect(-rx - 4, -ry - 4, 2 * rx + 8, edge + ry + 4);
    c.strokeStyle = '#2b1712'; c.lineWidth = 4.5; c.lineCap = 'round';
    const sag = k > 0.85 ? 6 : 3;
    c.beginPath(); c.moveTo(-rx - 1, edge - 2); c.quadraticCurveTo(0, edge + sag, rx + 1, edge - 2); c.stroke();
    c.restore();
  }
}

// ------------------------------------------------------------------ performance
// Lip-sync comes from the voiceover audio (vo_env.json from scripts/vo_envelope.py):
//   o = syllabic opening (closes between syllables), c = spectral brightness (dark vowels -> rounded mouth).
// The jaw opening follows `o` frame by frame; this is audio-driven, not phoneme-recognition lip-sync.
export function blinkAt(t, seed = 0) {
  let k = 0;
  for (let n = Math.floor(t / 3.4) - 1; n <= Math.floor(t / 3.4) + 1; n++) {
    const h = Math.abs(Math.sin((n + seed * 3.7) * 78.233)) % 1, t0 = n * 3.4 + h * 2.2;
    for (const off of (h > 0.78 ? [0, 0.3] : [0])) { const p = (t - t0 - off) / 0.16; if (p > 0 && p < 1) k = Math.max(k, Math.sin(p * Math.PI)); }
  }
  return k;
}

// opts: { mood: 'neutral'|'concern'|'surprise'|'smile', moodAmt, point: {side:'l'|'r', amt 0..1, angle}, gesture 0..1 }
export function performMaster(env, T, opts = {}) {
  const at = (arr, t) => (env && env[arr] ? env[arr][Math.max(0, Math.floor(t * env.fps))] || 0 : 0);
  const o = at('o', T), cc = env && env.c ? at('c', T) : 0.5;
  let act = 0; for (let k = 0; k < 12; k++) act += at('v', T - k * 0.07); act = clamp(act / 12 * 1.4);     // speaking activity
  const acc = (t) => clamp((at('v', t) - at('v', t - 0.16)) * 2.4);                                    // accents
  let A = 0; for (let k = 0; k < 9; k++) A += acc(T - k / 30) * (1 - k / 9); A = clamp(A / 2.2);
  const mood = opts.mood || 'neutral', ma = opts.moodAmt ?? 1;
  const round = cc < 0.14 && o > 0.45;
  const pt = opts.point || { side: 'l', amt: 0, angle: 1.2 };
  // talking gestures: the forearms drift with the phrasing; one hand leads
  const gL = (opts.gesture ?? 1) * act, s1 = Math.sin(T * 1.9) * 0.5 + 0.5, s2 = Math.sin(T * 1.3 + 1) * 0.5 + 0.5;
  let al = 0.04 + gL * (0.1 + 0.22 * s1) + A * 0.1 * gL, ar = 0.03 + gL * (0.06 + 0.16 * s2);
  if (pt.amt > 0) {
    const e = clamp(pt.amt), ang = pt.angle + Math.sin(T * 2.6) * 0.04;
    if (pt.side === 'l') al = al * (1 - e) + ang * e; else ar = ar * (1 - e) + ang * e;
  }
  return {
    jaw: { shape: round ? 'round' : 'wide', open: clamp(o * 1.05) * (mood === 'surprise' ? 1 : 1) + (mood === 'surprise' ? 0.25 * ma * (1 - o) : 0) },
    brow: { raise: clamp(A * 0.9 + (mood === 'surprise' ? ma : 0) + (mood === 'smile' ? 0.15 : 0)), concern: mood === 'concern' ? ma : 0 },
    blink: blinkAt(T, 1),
    breathe: Math.sin(T * 1.7),
    sway: Math.sin(T * 0.7) * 0.0045 + Math.sin(T * 1.9) * 0.0015 * act,
    head: {
      tilt: 0.022 * Math.sin(T * 0.6) + 0.012 * Math.sin(T * 1.45) + act * 0.018 * Math.sin(T * 2.2) - A * 0.022 + (mood === 'concern' ? 0.03 * ma : 0),
      dx: Math.sin(T * 0.85) * 4 + (opts.lookX || 0) * 10,
      dy: A * 7 + Math.sin(T * 2.1) * 1.5,
    },
    arm: { l: al, r: ar },
  };
}
