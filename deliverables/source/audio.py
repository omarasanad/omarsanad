"""Synthesize an original music bed and sound effects (no external assets)."""
import json, wave
import numpy as np

SR = 48000
TL = json.load(open("timeline.json"))
TOTAL = TL["total"]
N = int(TOTAL * SR)
rng = np.random.default_rng(3)
t_all = np.arange(N) / SR


def write(name, x):
    x = np.clip(x, -1, 1)
    if x.ndim == 1:
        x = np.stack([x, x], 1)
    with wave.open(name, "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((x * 32767).astype(np.int16).tobytes())


def hz(n):  # midi -> Hz
    return 440 * 2 ** ((n - 69) / 12)


def reverb(x, secs=2.2, mix=0.28):
    L = int(secs * SR)
    ir = rng.standard_normal(L) * np.exp(-np.arange(L) / SR * 3.2)
    ir[: int(0.012 * SR)] = 0
    n = 1 << int(np.ceil(np.log2(len(x) + L)))
    y = np.fft.irfft(np.fft.rfft(x, n) * np.fft.rfft(ir, n), n)[: len(x)]
    y /= np.max(np.abs(y)) + 1e-9
    return (1 - mix) * x / (np.max(np.abs(x)) + 1e-9) + mix * y


# ---------------- music: Am - F - C - G, 96 bpm, warm pad + soft plucks ----------------
BAR = 60 / 96 * 4
prog = [(57, [57, 60, 64, 69]), (53, [53, 57, 60, 65]), (48, [55, 60, 64, 67]), (55, [55, 59, 62, 67])]
pad = np.zeros(N); pl = np.zeros(N); sub = np.zeros(N)
nbars = int(np.ceil(TOTAL / BAR)) + 1
for b in range(nbars):
    root, notes = prog[b % 4]
    s = int(b * BAR * SR); e = min(N, int((b + 1) * BAR * SR + 0.8 * SR))
    if s >= N: break
    tt = np.arange(e - s) / SR
    env = np.minimum(1, tt / 0.7) * np.minimum(1, np.maximum(0, (BAR + 0.8 - tt) / 0.8))
    for k, n in enumerate(notes):
        f = hz(n)
        v = sum((1 / h ** 1.7) * np.sin(2 * np.pi * f * h * tt * (1 + 0.0015 * (k - 1.5))) for h in range(1, 7))
        pad[s:e] += v * env * 0.12
    sub[s:e] += np.sin(2 * np.pi * hz(root - 12) * tt) * env * 0.10
    # plucks: eighth notes, chord tones an octave up (start after the hook)
    for q in range(8):
        ps = s + int(q * BAR / 8 * SR)
        if ps >= N or b * BAR < 1.5: continue
        n = notes[[0, 2, 1, 3, 2, 1, 3, 2][q]] + 12
        L = min(int(0.6 * SR), N - ps); tt2 = np.arange(L) / SR
        f = hz(n)
        pl[ps:ps + L] += (np.sin(2 * np.pi * f * tt2) + 0.25 * np.sin(4 * np.pi * f * tt2)) * np.exp(-tt2 / 0.18) * 0.07 * (0.8 + 0.2 * (q % 2 == 0))
music = reverb(pad + sub, 2.6, 0.35) * 0.55 + reverb(pl, 1.8, 0.4) * 0.30
fade_in = np.minimum(1, t_all / 1.2)
swell = 1 + 0.5 * np.clip((t_all - 50.4) / 1.0, 0, 1)            # lift under the end card
fade_out = np.clip((TOTAL - t_all) / 1.4, 0, 1)
music = music * fade_in * swell * fade_out
music /= np.max(np.abs(music)) + 1e-9
write("music.wav", music * 0.7)


# ---------------- sound effects ----------------
def bandnoise(L, center, width):
    x = rng.standard_normal(L)
    X = np.fft.rfft(x); f = np.fft.rfftfreq(L, 1 / SR)
    X *= np.exp(-0.5 * ((f - center) / width) ** 2)
    y = np.fft.irfft(X, L); return y / (np.max(np.abs(y)) + 1e-9)


def env_ad(L, a, peak_at=None):
    tt = np.arange(L) / SR; d = L / SR
    pk = peak_at if peak_at else a
    return np.where(tt < pk, (tt / pk) ** 2, np.exp(-(tt - pk) / max(1e-3, (d - pk) / 4)))


def sfx(kind):
    if kind in ("whoosh", "whoosh_s", "swell"):
        d = {"whoosh": .55, "whoosh_s": .35, "swell": .8}[kind]; L = int(d * SR)
        y = np.zeros(L)
        for i, c in enumerate([350, 900, 2200, 4200]):
            e = env_ad(L, 0, peak_at=d * (0.35 + 0.1 * i))
            y += bandnoise(L, c, c * 0.5) * e * (0.6 if kind != "swell" else 0.4) / (1 + i * .3)
        return y
    if kind == "swish":
        L = int(.2 * SR); return bandnoise(L, 5000, 2500) * env_ad(L, 0, .06)
    if kind == "pop":
        L = int(.09 * SR); tt = np.arange(L) / SR
        f = 520 * np.exp(-tt * 18) + 260
        return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt / .025)
    if kind == "tick":
        L = int(.05 * SR); tt = np.arange(L) / SR
        return np.sin(2 * np.pi * 1700 * tt) * np.exp(-tt / .010)
    if kind == "pulse":
        L = int(.5 * SR); tt = np.arange(L) / SR
        b = lambda o: np.sin(2 * np.pi * 70 * (tt - o)) * np.exp(-np.maximum(0, tt - o) / .07) * (tt >= o)
        return b(0) + 0.7 * b(0.22)
    if kind == "thud":
        L = int(.45 * SR); tt = np.arange(L) / SR
        f = 120 * np.exp(-tt * 10) + 50
        return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt / .12) + 0.15 * bandnoise(L, 300, 200) * np.exp(-tt / .03)
    if kind == "ding":
        L = int(1.4 * SR); tt = np.arange(L) / SR
        return sum(a * np.sin(2 * np.pi * f * tt) * np.exp(-tt / dcy) for f, a, dcy in
                   [(1318.5, 1, .55), (1975.5, .45, .35), (2637, .25, .22), (659.3, .3, .8)])
    raise ValueError(kind)


fx = np.zeros(N)
for t, kind, gdb in TL["sfx"]:
    y = sfx(kind); y = y / (np.max(np.abs(y)) + 1e-9) * 10 ** (gdb / 20) * 4.0
    s = int(t * SR)
    if kind in ("whoosh", "whoosh_s", "swell"):        # centre the whoosh on the cut
        s -= int(len(y) * 0.4)
    s = max(0, s); e = min(N, s + len(y)); fx[s:e] += y[: e - s]
write("sfx.wav", reverb(fx, 0.9, 0.18) * np.max(np.abs(fx)))
print("ok", TOTAL)
