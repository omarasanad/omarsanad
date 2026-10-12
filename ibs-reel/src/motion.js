// Deterministic motion helpers. Everything is a pure function of time.

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const prog = (t, a, b) => clamp((t - a) / (b - a));
export const easeOut = (x) => 1 - Math.pow(1 - clamp(x), 3);
export const easeIn = (x) => Math.pow(clamp(x), 3);
export const easeInOut = (x) => {
  x = clamp(x);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};
export const expoOut = (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * clamp(x)));

// Closed-form damped spring step response (0 -> 1), started at t0.
// k: angular frequency (rad/s), z: damping ratio (<1 overshoots).
export function spring(t, t0, k = 14, z = 0.6) {
  const s = t - t0;
  if (s <= 0) return 0;
  if (z >= 1) return 1 - Math.exp(-k * s) * (1 + k * s);
  const wd = k * Math.sqrt(1 - z * z);
  return 1 - Math.exp(-z * k * s) * (Math.cos(wd * s) + ((z * k) / wd) * Math.sin(wd * s));
}

// Keyframe track: [[t, v], ...] with optional easing per segment.
export function track(t, keys, ease = easeInOut) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [t1, v1] = keys[i];
    const [t0, v0] = keys[i - 1];
    if (t <= t1) return lerp(v0, v1, (keys[i][2] || ease)((t - t0) / (t1 - t0)));
  }
  return keys[keys.length - 1][1];
}

// Alpha for an element living in [a, b] with in/out durations.
export function window_(t, a, b, fin = 0.25, fout = 0.25) {
  return Math.min(prog(t, a, a + fin), 1 - prog(t, b - fout, b));
}

// Seeded RNG (mulberry32).
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
