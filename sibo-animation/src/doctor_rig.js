// Dr. Sanad — layered 2D cutout rig built from the approved model sheet (scripts/build_rig.py).
// One character, separately animated parts:
//   torso (breathing, sway) · head on a neck pivot (tilt, nod, bob) · mouth shapes · eyelids (procedural blink)
//   brows (lift) · expression bands (concern / surprise) · forearm rotating at the elbow · palm / pointing hand.
// All coordinates below are rig pixels (the sheet upscaled x2).

const PARTS = ['torso', 'forearm', 'hand_point', 'head', 'brow', 'upper_concern', 'upper_surprise',
  'mouth_rest', 'mouth_mid', 'mouth_open', 'mouth_smile', 'mouth_round', 'mouth_concern'];
export const RIG = { img: {}, j: null };

export async function loadDoctorRig(base = '../assets/character/rig/') {
  RIG.j = await (await fetch(base + 'rig.json')).json();
  await Promise.all(PARTS.map((n) => new Promise((res) => {
    const i = new Image(); i.onload = () => { RIG.img[n] = i; res(); }; i.onerror = () => res(); i.src = base + n + '.png';
  })));
  return Object.keys(RIG.img).length === PARTS.length;
}

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const FEET = [474, 1918];          // ground point of the body in rig px (between the shoes)
const WAIST = 960;                 // breathing scales the upper body about this row
const MOUTH_C = [292, 510];        // mouth centre in head px
const WRIST_CUT = 6;               // forearm clip: distance past the wrist point along the forearm (rig px)

// state: { mouth: { a, b, w, open }, blink, brow, upper: { name, amt }, head: { tilt, dx, dy },
//          arm: { rot, hand: 'open'|'point', handRot }, breathe, sway }
export function drawDoctor(c, x, y, scale, flip, st) {
  const I = RIG.img, J = RIG.j;
  if (!J || !I.torso) return;
  c.save();
  c.translate(x, y); c.scale(flip ? -scale : scale, scale);
  c.rotate(st.sway || 0);
  c.translate(-FEET[0], -FEET[1]);

  // breathing: the upper body rises a hair and the chest widens
  const br = st.breathe || 0;
  c.save();
  c.translate(FEET[0], WAIST); c.scale(1 + br * 0.004, 1 + br * 0.008); c.translate(-FEET[0], -WAIST);
  c.drawImage(I.torso, 0, 0);

  // ---- head on the neck pivot
  const H = J.head, hs = H.scale, [nx, ny] = J.neck, [cx, cy] = H.chin, hd = st.head || {};
  c.save();
  c.translate(nx + (hd.dx || 0), ny + (hd.dy || 0));
  c.rotate(hd.tilt || 0);
  c.scale(hs * (1 + (hd.turn || 0) * -0.03), hs);
  c.translate(-cx, -cy);
  c.drawImage(I.head, 0, 0);
  const up = st.upper;
  if (up && up.amt > 0.01 && I['upper_' + up.name]) { c.globalAlpha = clamp(up.amt); c.drawImage(I['upper_' + up.name], 0, 0); c.globalAlpha = 1; }
  // brows lift for emphasis (the neutral brow band, shifted up)
  const bl = st.brow || 0;
  if (bl > 0.02 && (!up || up.amt < 0.5)) c.drawImage(I.brow, 0, -bl * 9);
  // eyelids: procedural blink, closing over each eye from the top
  if (st.blink > 0.02) eyelids(c, st.blink);
  // mouth: cross-faded shapes, scaled open by the voice level
  const m = st.mouth || { a: 'rest', b: 'rest', w: 0, open: 0 };
  drawMouth(c, m.a, 1 - m.w, m.open);
  if (m.w > 0.01) drawMouth(c, m.b, m.w, m.open);
  c.restore();

  // ---- forearm (rotates at the elbow) + hand
  const arm = st.arm || {}, [ex, ey] = J.elbow, rot = arm.rot || 0;
  c.save();
  c.translate(ex, ey); c.rotate(rot); c.translate(-ex, -ey);
  if (arm.hand === 'point') {
    // hide the open palm: clip the forearm at the cuff, across the forearm direction
    const [wx, wy] = J.wrist, ang = Math.atan2(wy - ey, wx - ex);
    c.save(); c.translate(wx, wy); c.rotate(ang); c.beginPath(); c.rect(-900, -600, 900 + WRIST_CUT, 1200); c.rotate(-ang); c.translate(-wx, -wy); c.clip();
    c.drawImage(I.forearm, 0, 0); c.restore();
    // index-finger hand, its wrist on the cuff, finger continuing the forearm line (+ wrist bend)
    const [hw, hh] = J.hand_point.size, k = 0.8;
    c.save(); c.translate(wx, wy); c.rotate(ang + Math.PI / 2 + (arm.handRot || 0));
    c.drawImage(I.hand_point, -90 * k, -278 * k, hw * k, hh * k); c.restore();
  } else c.drawImage(I.forearm, 0, 0);
  c.restore();

  c.restore();
  c.restore();
}

function drawMouth(c, name, alpha, open) {
  const im = RIG.img['mouth_' + name]; if (!im || alpha <= 0.01) return;
  // only the open shapes stretch with the voice; closed shapes stay put
  const sy = name === 'open' || name === 'round' ? 0.8 + clamp(open) * 0.32 : name === 'mid' ? 0.92 + clamp(open) * 0.14 : 1;
  c.save(); c.globalAlpha = alpha;
  c.translate(MOUTH_C[0], MOUTH_C[1] - 14); c.scale(name === 'round' ? 0.86 : 1, name === 'round' ? sy * 0.85 : sy); c.translate(-MOUTH_C[0], -(MOUTH_C[1] - 14));
  c.drawImage(im, 0, 0); c.restore();
}

// eye openings in head px: centre, half-width, half-height, tilt
const EYES = [[198, 386, 34, 14, -0.1], [323, 359, 33, 13, -0.16]];
function eyelids(c, k) {
  for (const [x, y, rx, ry, a] of EYES) {
    c.save(); c.translate(x, y); c.rotate(a);
    c.beginPath(); c.ellipse(0, 0, rx + 3, ry + 4, 0, 0, Math.PI * 2); c.clip();
    const edge = -ry - 4 + (2 * ry + 8) * clamp(k);
    const g = c.createLinearGradient(0, -ry - 4, 0, edge);
    g.addColorStop(0, '#d98f62'); g.addColorStop(1, '#e8a77c');
    c.fillStyle = g; c.fillRect(-rx - 6, -ry - 6, 2 * rx + 12, edge + ry + 6);
    // lash line along the lid edge
    c.strokeStyle = '#2a1a16'; c.lineWidth = 3.2; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-rx, edge - 1 + (k > 0.85 ? 2 : 0)); c.quadraticCurveTo(0, edge + (k > 0.85 ? 5 : 2), rx, edge - 1 + (k > 0.85 ? 2 : 0)); c.stroke();
    c.restore();
  }
}

// ------------------------------------------------------------------ performance driver
// Lip-sync from the narration audio (vo_env.json: per-frame loudness `v` and spectral brightness `c`).
// Each frame picks a mouth shape from the audio itself:
//   silence -> closed (rest / smile / concern, by mood); low level -> 'mid'; loud -> 'open';
//   loud + dark spectrum (o/u-like vowels) -> 'round'. Shapes cross-fade over ~2 frames; the opening scales with level.
// This is audio-driven lip-sync (timing and openness follow the voice), not phoneme-recognition lip-sync.
export function mouthAt(env, T, mood = 'neutral') {
  const closed = mood === 'smile' ? 'smile' : mood === 'concern' ? 'concern' : 'rest';
  if (!env) return { a: closed, b: closed, w: 0, open: 0, v: 0 };
  const f = T * env.fps, i = Math.floor(f), fr = f - i;
  const shapeAt = (j) => {
    const o = env.o ? env.o[j] || 0 : env.v[j] || 0, cc = env.c ? env.c[j] ?? 0.5 : 0.5;
    if (o < 0.16) return [closed, o];
    if (o < 0.45) return ['mid', o];
    return [cc < 0.1 && o > 0.6 ? 'round' : 'open', o];
  };
  const [a, va] = shapeAt(i), [b, vb] = shapeAt(i + 1);
  const open = va + (vb - va) * fr;
  return a === b ? { a, b, w: 0, open, v: open } : { a, b, w: clamp((fr - 0.35) / 0.5), open, v: open };
}

export const blinkCurve = (t, seed = 0) => {
  // irregular natural blinks: ~every 2.5–5 s, 0.16 s long, occasional double blink
  let k = 0;
  for (let n = Math.floor(t / 3.6) - 1; n <= Math.floor(t / 3.6) + 1; n++) {
    const h = Math.abs(Math.sin((n + seed * 7.1) * 91.7)) % 1;
    const t0 = n * 3.6 + h * 2.4;
    for (const off of (h > 0.8 ? [0, 0.32] : [0])) {
      const p = (t - t0 - off) / 0.17;
      if (p > 0 && p < 1) k = Math.max(k, Math.sin(p * Math.PI));
    }
  }
  return k;
};

// Whole-body performance for one frame. opts: { mood: 'neutral'|'smile'|'concern'|'surprise',
//   point: 0..1 (raise the forearm and point with the index finger), pointDir: finger tilt (rad),
//   gesture: 0..1 (how much the palm hand moves with the speech), look: head offset }
export function perform(env, T, opts = {}) {
  const mood = opts.mood || 'neutral';
  const vAt = (t) => (env ? env.v[Math.max(0, Math.floor(t * env.fps))] || 0 : 0);
  const v = vAt(T);
  let avg = 0; for (let k = 0; k < 10; k++) avg += vAt(T - k * 0.08); avg /= 10;          // speaking activity (last 0.8 s)
  const onset = clamp((v - vAt(T - 0.18)) * 2.2);                                          // syllable/phrase accents
  let acc = 0; for (let k = 0; k < 8; k++) acc += clamp((vAt(T - k / 30) - vAt(T - k / 30 - 0.18)) * 2.2) * (1 - k / 8);
  const mouth = mouthAt(env, T, mood === 'surprise' ? 'neutral' : mood);
  if (mood === 'surprise' && mouth.a !== 'open' && mouth.a !== 'mid') { mouth.a = mouth.b = 'round'; mouth.w = 0; mouth.open = Math.max(mouth.open, 0.35); }
  const upper = mood === 'concern' ? { name: 'concern', amt: opts.moodAmt ?? 1 } : mood === 'surprise' ? { name: 'surprise', amt: opts.moodAmt ?? 1 } : null;
  const pt = clamp(opts.point || 0), g = opts.gesture ?? 1;
  const look = opts.look || [0, 0];
  return {
    mouth, upper,
    blink: blinkCurve(T, 1),
    brow: clamp(acc * 0.35 + (mood === 'smile' ? 0.15 : 0)),
    breathe: Math.sin(T * 1.9),
    sway: Math.sin(T * 0.8) * 0.006 + Math.sin(T * 1.7) * 0.002 * avg,
    head: {
      tilt: 0.03 * Math.sin(T * 0.63) + 0.018 * Math.sin(T * 1.37) + avg * 0.03 * Math.sin(T * 2.3) - acc * 0.025 + (opts.headTilt || 0),
      dx: Math.sin(T * 0.9) * 3 + look[0] * 10,
      dy: -acc * 5 + Math.sin(T * 1.9) * 1.5 + look[1] * 6,
      turn: look[0] * 0.5,
    },
    arm: {
      rot: -pt * 0.4 + (1 - pt) * g * (-avg * 0.16 + Math.sin(T * 2.4) * 0.07 * avg - acc * 0.05) + pt * Math.sin(T * 3) * 0.03,
      hand: pt > 0.5 ? 'point' : 'open',
      handRot: (opts.pointDir ?? 0.35),
    },
  };
}
