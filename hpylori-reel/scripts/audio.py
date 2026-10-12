"""Synthesize the reel's score and sound effects (deterministic, numpy only).

    python3 scripts/audio.py            -> audio/music.wav, audio/sfx.wav
"""
import json
import os
import wave

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR = 48000
# Everything below is authored in film time; W() maps it onto the voiceover-aligned video time.
TL = json.load(open(os.path.join(ROOT, 'src/timeline.json')))
DUR = float(TL['duration'])
N = int(SR * DUR)
_wf, _wv = zip(*TL['warp'])


def W(x):
    return np.interp(x, _wf, _wv)

rng = np.random.default_rng(7)


def write(path, stereo):
    stereo = np.clip(stereo, -1, 1)
    data = (stereo.T.reshape(-1) * 32767).astype('<i2').tobytes()
    with wave.open(path, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(data)


def hz(midi):
    return 440.0 * 2 ** ((midi - 69) / 12)


def onepole(x, coef):
    """Time-varying one-pole lowpass; coef array or scalar in (0,1]."""
    y = np.empty_like(x); acc = 0.0
    c = np.broadcast_to(coef, x.shape)
    for i in range(len(x)):
        acc += c[i] * (x[i] - acc); y[i] = acc
    return y


def reverb(st, seconds=2.4, mix=0.28):
    n = int(SR * seconds)
    out = np.empty_like(st)
    for ch in range(2):
        ir = rng.standard_normal(n) * np.exp(-np.linspace(0, 7, n))
        ir[: int(SR * 0.012)] = 0
        ir /= np.sqrt((ir ** 2).sum())
        L = len(st[ch]) + n
        size = 1 << (L - 1).bit_length()
        wet = np.fft.irfft(np.fft.rfft(st[ch], size) * np.fft.rfft(ir, size), size)[: len(st[ch])]
        out[ch] = st[ch] * (1 - mix) + wet * mix
    return out


t = np.arange(N) / SR

# ------------------------------------------------------------------ music
# 120 BPM grid, one chord per 2 bars (4 s). D minor, resolving to F major for the close.
CHORDS = [
    (0, [38, 50, 57, 62, 64, 65]),        # Dm9
    (6.5, [34, 46, 53, 58, 62, 69]),      # Bbmaj7
    (10.5, [41, 53, 57, 60, 64, 67]),     # Fmaj9
    (14.5, [36, 48, 55, 60, 62, 67]),     # Cadd9
    (18.5, [38, 50, 57, 62, 64, 65]),     # Dm9
    (22.5, [34, 46, 53, 58, 62, 69]),     # Bbmaj7
    (26.5, [41, 53, 57, 60, 64, 67]),     # Fmaj9
    (30.5, [36, 48, 55, 60, 62, 67]),     # Cadd9
    (34.5, [38, 50, 57, 62, 65, 69]),     # Dm
    (38.5, [34, 46, 53, 58, 62, 65]),     # Bbmaj7 — doctor reveal
    (42.5, [36, 48, 55, 60, 64, 67]),     # C
    (46.5, [41, 53, 57, 60, 64, 69]),     # F — resolution
    (DUR, None),
]


def pad_voice(f, n, detune):
    tt = np.arange(n) / SR
    v = np.zeros(n)
    for d in (-detune, 0, detune):
        for h in range(1, 9):
            v += np.sin(2 * np.pi * f * (1 + d) * h * tt + h * 1.3) / h * np.exp(-h / 2.6)
    return v / 3


music = np.zeros((2, N))
CHORDS = [(float(W(a)), n) for a, n in CHORDS[:-1]] + [(DUR, None)]
for i in range(len(CHORDS) - 1):
    a, notes = CHORDS[i]; b = CHORDS[i + 1][0]
    s0, s1 = int(a * SR), min(N, int((b + 0.8) * SR))
    n = s1 - s0
    env = np.minimum(1, np.arange(n) / (0.9 * SR)) * np.minimum(1, (n - np.arange(n)) / (0.9 * SR))
    for k, m in enumerate(notes):
        g = 0.05 if k == 0 else 0.032
        for ch, det in ((0, 0.0021), (1, 0.0029)):
            music[ch, s0:s1] += pad_voice(hz(m), n, det) * env * g

# gentle swell: quieter under the hook text, fuller for the reveal
swell = np.interp(t, W([0, 1, 6.5, 13.5, 30.5, 38.5, 39.5, 47, 48.6]).tolist() + [DUR], [0.5, 0.8, 0.8, 0.9, 0.95, 0.75, 1.1, 1.1, 0.9, 0.0])
music *= swell

# heartbeat sub pulse (scenes 1-5), on beats 1 and 1.5
pulse = np.zeros(N)
for bt in np.arange(0.0, 38.0, 2.0):
    for off, g in ((0, 1.0), (0.32, 0.55)):
        s = int(W(bt + off) * SR); n = int(0.45 * SR)
        if s + n > N: continue
        tt = np.arange(n) / SR
        f = 48 + 30 * np.exp(-tt * 30)
        pulse[s:s + n] += np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 9) * g
pulse *= np.interp(t, W([0, 0.2, 6.5, 13.5, 22.5, 36, 38.4]), [0.0, 0.16, 0.12, 0.09, 0.1, 0.1, 0.0])
music += pulse

# eighth-note plucks over scenes 3-4 and the close
pl = np.zeros((2, N))
for i in range(len(CHORDS) - 1):
    a, notes = CHORDS[i]; b = CHORDS[i + 1][0]
    for j, bt in enumerate(np.arange(a, b, 0.25)):
        if not (W(13.5) <= bt < W(30.5) or W(39.5) <= bt < W(48.5)): continue
        m = notes[2:][(j * 2 + (j // 4)) % len(notes[2:])] + 12
        s = int(bt * SR); n = int(0.5 * SR)
        if s + n > N: continue
        tt = np.arange(n) / SR
        v = (np.sin(2 * np.pi * hz(m) * tt) + 0.25 * np.sin(4 * np.pi * hz(m) * tt)) * np.exp(-tt * 9)
        v *= 0.022 * (1.0 if j % 4 == 0 else 0.65)
        pan = 0.5 + 0.35 * np.sin(j * 1.7)
        pl[0, s:s + n] += v * (1 - pan); pl[1, s:s + n] += v * pan
music += pl

# low tension drone + air for the hook
air = onepole(rng.standard_normal(N), 0.02) * np.interp(t, W([0, 0.3, 6, 7]), [0, 0.05, 0.05, 0])
music += np.stack([air, np.roll(air, 300)])

music = reverb(music, 3.0, 0.35)
music *= 0.5 / (np.abs(music).max() + 1e-9)
music[:, -int(SR * 1.5):] *= np.linspace(1, 0, int(SR * 1.5))

# ------------------------------------------------------------------ sfx
def env_ad(n, a, d):
    tt = np.arange(n) / SR
    return np.minimum(1, tt / max(a, 1e-4)) * np.exp(-np.maximum(0, tt - a) / d)


def sfx_impact():
    n = int(0.9 * SR); tt = np.arange(n) / SR
    f = 42 + 110 * np.exp(-tt * 18)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 5)
    nz = onepole(rng.standard_normal(n), 0.08) * np.exp(-tt * 25) * 0.7
    return body + nz


def sfx_whoosh(dur=0.7):
    n = int(dur * SR); x = np.linspace(0, 1, n)
    shape = np.sin(np.pi * x) ** 1.6
    coef = 0.02 + 0.22 * np.sin(np.pi * x) ** 2
    return onepole(rng.standard_normal(n), coef) * shape * 1.6


def sfx_pop():
    n = int(0.16 * SR); tt = np.arange(n) / SR
    f = 380 + 700 * np.exp(-tt * 60)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env_ad(n, 0.002, 0.045)


def sfx_click():
    n = int(0.05 * SR); tt = np.arange(n) / SR
    return (np.sin(2 * np.pi * 2200 * tt) * 0.6 + rng.standard_normal(n) * 0.25) * env_ad(n, 0.0005, 0.008)


def sfx_tick():
    n = int(0.12 * SR); tt = np.arange(n) / SR
    return (np.sin(2 * np.pi * 1320 * tt) + 0.4 * np.sin(2 * np.pi * 2640 * tt)) * env_ad(n, 0.001, 0.03)


def sfx_riser(dur=1.0):
    n = int(dur * SR); x = np.linspace(0, 1, n)
    nz = onepole(rng.standard_normal(n), 0.01 + 0.3 * x ** 2) * x ** 2
    f = 200 + 600 * x ** 2
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * x ** 3 * 0.25
    return (nz * 1.6 + tone)


def sfx_chime():
    n = int(2.2 * SR); tt = np.arange(n) / SR; v = np.zeros(n)
    for f, g, d in ((880, 1, 1.2), (1318.5, 0.6, 0.9), (1760, 0.35, 0.6), (2637, 0.15, 0.4)):
        v += np.sin(2 * np.pi * f * tt) * g * np.exp(-tt / d)
    return v * env_ad(n, 0.004, 10) * 0.5


def sfx_pulse():
    n = int(1.2 * SR); tt = np.arange(n) / SR
    v = np.sin(2 * np.pi * 55 * tt) * np.exp(-tt * 3) + 0.3 * np.sin(2 * np.pi * 110 * tt) * np.exp(-tt * 6)
    return v * np.minimum(1, tt / 0.03)


GEN = {'impact': sfx_impact, 'whoosh': sfx_whoosh, 'pop': sfx_pop, 'click': sfx_click, 'tick': sfx_tick,
       'riser': sfx_riser, 'chime': sfx_chime, 'pulse': sfx_pulse}

cues = json.load(open(os.path.join(ROOT, 'audio/cues.json')))['cues']
sfx = np.zeros((2, N))
for i, c in enumerate(cues):
    fn = GEN[c['type']]
    v = fn(c['dur']) if 'dur' in c else fn()
    v = v / (np.abs(v).max() + 1e-9) * 10 ** (c.get('gain', -10) / 20)
    s = int(W(c['t']) * SR); e = min(N, s + len(v)); v = v[: e - s]
    pan = 0.5 + (0.25 * np.sin(i * 2.3) if c['type'] in ('pop', 'click', 'tick', 'whoosh') else 0)
    sfx[0, s:e] += v * np.sqrt(1 - pan); sfx[1, s:e] += v * np.sqrt(pan)
sfx = reverb(sfx, 1.2, 0.18)

os.makedirs(os.path.join(ROOT, 'audio'), exist_ok=True)
write(os.path.join(ROOT, 'audio/music.wav'), music)
write(os.path.join(ROOT, 'audio/sfx.wav'), sfx)
print('wrote audio/music.wav, audio/sfx.wav', DUR, 's')
