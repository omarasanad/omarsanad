"""Synthesize the fatty-liver reel's score and sound effects (deterministic, numpy only), keyed to src/timing.json.

    python3 scripts/audio.py            -> audio/music.wav, audio/sfx.wav
"""
import json
import os
import wave

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR = 48000
TL = json.load(open(os.path.join(ROOT, 'src/timing.json')))
DUR = float(TL['duration'])
SC = TL['scenes']
N = int(SR * DUR)


def at(needle, off=0.0):
    for a, b, txt in TL['captions']:
        if needle in txt:
            return a + off
    raise KeyError(needle)


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
# Calm, bright C major / A minor bed; darker for the warning scene, resolving warmly at the close.
BRIGHT = [[41, 53, 57, 60, 64, 67], [36, 48, 55, 60, 64, 67], [45, 57, 60, 64, 67, 71], [43, 55, 59, 62, 67, 69]]  # Fmaj9 C Am7 G6
WARN = [[45, 57, 60, 64, 69], [38, 50, 57, 62, 65]]                                                         # Am Dm
CLOSE = [[41, 53, 57, 60, 64, 69], [43, 55, 59, 62, 67, 71], [36, 48, 55, 60, 64, 67, 72]]                   # F G C
CHORDS, x, k = [], 0.0, 0
WF, WT = SC[2], SC[3]  # thoughtful minor colour under 'no clear symptoms'
while x < WF:
    CHORDS.append((x, BRIGHT[k % 4])); x += 4.0; k += 1
CHORDS.append((WF, WARN[0])); CHORDS.append(((WF + WT) / 2, WARN[1]))
x = WT
while x < SC[5]:
    CHORDS.append((x, BRIGHT[k % 4])); x += 4.0; k += 1
x = SC[5]
for ch in CLOSE:
    CHORDS.append((x, ch)); x += (DUR - SC[5]) / 3
CHORDS = [c for i, c in enumerate(CHORDS) if i == 0 or c[0] > CHORDS[i - 1][0] + 0.5] + [(DUR, None)]


def pad_voice(f, n, detune):
    tt = np.arange(n) / SR
    v = np.zeros(n)
    for d in (-detune, 0, detune):
        for h in range(1, 7):
            v += np.sin(2 * np.pi * f * (1 + d) * h * tt + h * 1.1) / h * np.exp(-h / 2.0)
    return v / 3


music = np.zeros((2, N))
for i in range(len(CHORDS) - 1):
    a, notes = CHORDS[i]; b = CHORDS[i + 1][0]
    s0, s1 = int(a * SR), min(N, int((b + 0.8) * SR)); n = s1 - s0
    env = np.minimum(1, np.arange(n) / (0.8 * SR)) * np.minimum(1, (n - np.arange(n)) / (0.8 * SR))
    for j, m in enumerate(notes):
        g = 0.045 if j == 0 else 0.026
        for ch, det in ((0, 0.0018), (1, 0.0026)):
            music[ch, s0:s1] += pad_voice(hz(m), n, det) * env * g

# marimba-like plucks on 8ths (not under the warning)
pl = np.zeros((2, N))
for i in range(len(CHORDS) - 1):
    a, notes = CHORDS[i]; b = CHORDS[i + 1][0]
    for j, bt in enumerate(np.arange(a, b, 0.25)):
        if WF - 0.2 <= bt < WT or bt > DUR - 1.6:
            continue
        if j % 8 in (3, 7):
            continue
        m = notes[1:][(j * 3 + j // 4) % len(notes[1:])] + 12
        s = int(bt * SR); n = int(0.45 * SR)
        if s + n > N: continue
        tt = np.arange(n) / SR
        v = (np.sin(2 * np.pi * hz(m) * tt) + 0.35 * np.sin(2 * np.pi * hz(m) * 4.0 * tt) * np.exp(-tt * 30)) * np.exp(-tt * 11)
        v *= 0.02 * (1.0 if j % 4 == 0 else 0.6)
        pan = 0.5 + 0.35 * np.sin(j * 1.9)
        pl[0, s:s + n] += v * (1 - pan); pl[1, s:s + n] += v * pan
music += pl

# soft heartbeat-like low pulse under the warning
for bt in np.arange(WF, WT, 1.0):
    s = int(bt * SR); n = int(0.4 * SR); tt = np.arange(n) / SR
    v = np.sin(2 * np.pi * np.cumsum(50 + 25 * np.exp(-tt * 30)) / SR) * np.exp(-tt * 9) * 0.12
    music[:, s:s + n] += v

t = np.arange(N) / SR
music *= np.interp(t, [0, 0.6, WF - 0.3, WF + 0.3, WT, WT + 0.5, DUR - 2, DUR], [0.6, 0.85, 0.85, 0.7, 0.7, 0.9, 1.0, 0.0])
music = reverb(music, 2.6, 0.32)
music *= 0.5 / (np.abs(music).max() + 1e-9)
music[:, -int(SR * 1.2):] *= np.linspace(1, 0, int(SR * 1.2))

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


def cue_time(c):
    if 'cap' in c:
        return at(c['cap'], c.get('off', 0))
    if 'scene' in c:
        return SC[c['scene'] - 1] + c.get('off', 0)
    return c['t']


cues = json.load(open(os.path.join(ROOT, 'audio/cues.json')))['cues']
sfx = np.zeros((2, N))
for i, c in enumerate(cues):
    fn = GEN[c['type']]
    v = fn(c['dur']) if 'dur' in c else fn()
    v = v / (np.abs(v).max() + 1e-9) * 10 ** (c.get('gain', -10) / 20)
    s = max(0, int(cue_time(c) * SR)); e = min(N, s + len(v)); v = v[: e - s]
    pan = 0.5 + (0.25 * np.sin(i * 2.3) if c['type'] in ('pop', 'click', 'tick', 'whoosh') else 0)
    sfx[0, s:e] += v * np.sqrt(1 - pan); sfx[1, s:e] += v * np.sqrt(pan)
sfx = reverb(sfx, 1.2, 0.18)

write(os.path.join(ROOT, 'audio/music.wav'), music)
write(os.path.join(ROOT, 'audio/sfx.wav'), sfx)
print('wrote audio/music.wav, audio/sfx.wav', DUR, 's')
