"""Original summer underscore for the Summer Heat reel, synthesized from scratch (no samples).
Bright and warm: marimba-like mallets, soft pad, plucked bass and a light shaker in A major (I-vi-IV-V), 92 BPM.
The arrangement follows the edit (times read from web/data/captions.json):
  intro (mallets + pad) -> groove under the explainer sections -> calmer "listen to your body" section ->
  held dark F#m pad with a slow pulse for the heat-stroke warning -> D - E cadence under the slogan ->
  A major as the end card appears, ringing out.
Usage: python3 music.py OUT.wav
"""
import json, os, sys
import numpy as np, soundfile as sf
from scipy.signal import fftconvolve, butter, sosfilt

HERE = os.path.dirname(os.path.abspath(__file__))
caps = json.load(open(os.path.join(HERE, '../web/data/captions.json'), encoding='utf-8'))
VO_END = caps[-1]['end']
T_GROOVE = caps[1]['start'] - .15            # complaints shot
T_LISTEN = caps[46]['start'] - .15
T_EMERG = caps[53]['start'] - .15
T_SLOGAN = caps[56]['start'] - .15
T_END = VO_END + .7                          # end card
DUR = T_END + 4.3                            # = reel.html TOTAL
SR = 48000; N = int((DUR + 4) * SR)
BPM = 92; BEAT = 60 / BPM; BAR = 4 * BEAT
rng = np.random.default_rng(11)
hz = lambda m: 440 * 2 ** ((m - 69) / 12)
BUS = {k: np.zeros((2, N)) for k in ('pad', 'mal', 'bas', 'shk')}

def add(bus, sig, t, gain=1., pan=0.):          # equal-power pan, -1 (left) .. 1 (right)
    i = int(round(t * SR)); j = min(N, i + len(sig))
    if i < 0 or j <= i: return
    a = (pan + 1) * np.pi / 4
    BUS[bus][0, i:j] += sig[:j - i] * gain * np.cos(a); BUS[bus][1, i:j] += sig[:j - i] * gain * np.sin(a)

def mallet(m, dur=1.5):   # marimba-like bar: fundamental + 4th partial (x3.93) + high partial, fast-decaying overtones
    n = int(dur * SR); t = np.arange(n) / SR; f = hz(m)
    s = np.sin(2 * np.pi * f * t) * np.exp(-t * 3.4)
    s += .3 * np.sin(2 * np.pi * f * 3.93 * t) * np.exp(-t * 12)
    s += .07 * np.sin(2 * np.pi * f * 9.2 * t) * np.exp(-t * 30)
    s += rng.standard_normal(n) * np.exp(-t * 900) * .04            # soft mallet contact
    return s * np.minimum(1, t / .0015)

def pad(chord, dur, att=.9, rel=1.6):
    n = int((dur + rel) * SR); t = np.arange(n) / SR; s = np.zeros(n)
    for m in chord:
        for det in (-.07, 0., .08):                                  # gently detuned voices
            ff = hz(m) * 2 ** (det / 12); ph = rng.uniform(0, 6.28)
            for k, amp in ((1, 1.), (2, .3), (3, .12), (4, .05)): s += amp * np.sin(2 * np.pi * ff * k * t + ph * k)
    e = np.minimum(1, t / att) ** 2; k = int(dur * SR); e[k:] *= np.linspace(1, 0, n - k) ** 1.5
    return s * e * (1 + .06 * np.sin(2 * np.pi * .21 * t)) / (3 * len(chord))

def bass(m, dur=.95, decay=2.4):   # plucked bass with 2nd/3rd harmonics so it still reads on phone speakers
    n = int(dur * SR); t = np.arange(n) / SR; f = hz(m)
    s = np.sin(2 * np.pi * f * t) + .45 * np.sin(4 * np.pi * f * t) * np.exp(-t * 6) + .18 * np.sin(6 * np.pi * f * t) * np.exp(-t * 9)
    e = np.exp(-t * decay) * np.minimum(1, t / .004); e[-int(.05 * SR):] *= np.linspace(1, 0, int(.05 * SR))
    return s * e

def shaker():
    n = int(.09 * SR); t = np.arange(n) / SR
    return rng.standard_normal(n) * np.minimum(1, t / .012) * np.exp(-t * 55)

# chords: pad voicing (mid register), mallet tones (high register), bass root
CH = {
    'A':   ([57, 61, 64, 68, 71], [69, 73, 76, 80, 83], 45),     # Amaj9
    'F#m': ([54, 57, 61, 64, 69], [66, 69, 73, 76, 81], 42),     # F#m7(add11)
    'D':   ([50, 57, 61, 64, 66], [66, 69, 73, 74, 78], 38),     # Dmaj9
    'E':   ([52, 59, 64, 66, 68], [68, 71, 76, 78, 80], 40),     # E(add9)
}
LOOP = ['A', 'F#m', 'D', 'E']                                     # two bars each
PAT = [[0, 2, 1, 3, 2, 4, 3, 2], [0, 2, 4, 3, None, 2, 1, None], [1, 3, 2, 4, 3, 2, 0, None], [0, None, 2, 3, 4, 3, 2, 1]]

# ---- loop sections: intro, groove, listen (all on one bar grid from t = 0) ----
bar = 0
while bar * BAR < T_EMERG:
    t0 = bar * BAR; name = LOOP[(bar // 2) % 4]; padv, mal, root = CH[name]
    sect = 'intro' if t0 < T_GROOVE - .2 else 'groove' if t0 < T_LISTEN - .2 else 'listen'
    if bar % 2 == 0:
        add('pad', pad(padv, min(2 * BAR, T_EMERG - t0)), t0, .9 if sect != 'intro' else .75)
    for k, idx in enumerate(PAT[bar % 4]):                       # mallets: swung eighths (quarters when sparse)
        tt = t0 + k * BEAT / 2 + (.055 * BEAT if k % 2 else 0)
        if idx is None or tt >= T_EMERG - .05: continue
        if sect in ('intro', 'listen') and k % 2: continue
        vel = (1. if k % 4 == 0 else .82 if k % 2 == 0 else .62) * rng.uniform(.88, 1.06)
        if sect == 'listen': vel *= .78
        add('mal', mallet(mal[idx]), tt, vel, pan=np.sin(bar * 1.7 + k * 1.1) * .45)
    if sect == 'groove':                                           # bass: beat 1, the "and" of 2, beat 4
        for b, v in ((0, 1.), (1.5, .7), (3, .8)):
            if t0 + b * BEAT < T_LISTEN - .05: add('bas', bass(root), t0 + b * BEAT, v)
        for s16 in range(16):                                      # shaker: 16ths, accent on the off-beat
            tt = t0 + s16 * BEAT / 4 + (.03 * BEAT if s16 % 2 else 0)
            if tt < T_LISTEN - .05: add('shk', shaker(), tt, (.95, .35, .7, .4)[s16 % 4] * rng.uniform(.8, 1.1), pan=.3 if s16 % 2 else -.2)
    elif sect == 'listen' and bar % 2 == 0:
        add('bas', bass(root, dur=2 * BAR, decay=.7), t0, .55)
    bar += 1

# ---- heat-stroke warning: dark F#m, slow low pulse, no mallets ----
add('pad', pad([42, 49, 54, 57, 61], T_SLOGAN - T_EMERG, att=.35, rel=1.2), T_EMERG, 1.7)
k = 0
while T_EMERG + k * BEAT * 2 < T_SLOGAN - .3:                    # two soft beats ("lub-dub") every half bar
    for d, v in ((0, 1.), (.2, .6)): add('bas', bass(42, dur=.5, decay=7), T_EMERG + .15 + k * BEAT * 2 + d, 1.3 * v)
    k += 1

# ---- slogan cadence D -> E, landing on A for the end card ----
tE = T_SLOGAN + (T_END - T_SLOGAN) * .55
for name, a, b in (('D', T_SLOGAN, tE), ('E', tE, T_END)):
    padv, mal, root = CH[name]
    add('pad', pad(padv, b - a, att=.5, rel=1.0), a, .9); add('bas', bass(root, dur=b - a, decay=.9), a, .6)
    n = int((b - a) / BEAT)
    for q in range(n): add('mal', mallet(mal[(0, 2, 4, 3)[q % 4]]), a + q * BEAT, .55 + .1 * q / max(1, n), pan=(-.3, .3)[q % 2])
padv, mal, root = CH['A']
add('pad', pad(padv, DUR - T_END + 1, att=.25, rel=2.5), T_END, 1.0); add('bas', bass(root, dur=3.5, decay=.8), T_END, .7)
for q, m in enumerate([69, 73, 76, 81, 85]):                      # bright rising flourish on the end card
    add('mal', mallet(m, dur=2.2), T_END + q * BEAT / 4, .8 - .06 * q, pan=-.4 + .2 * q)

# ---- bus processing + reverb ----
def filt(x, kind, f, order=2): return sosfilt(butter(order, f, kind, fs=SR, output='sos'), x, axis=1)
pad_b = filt(filt(BUS['pad'], 'low', 2800), 'high', 90)
mal_b = filt(filt(BUS['mal'], 'low', 7000), 'high', 180)
bas_b = filt(BUS['bas'], 'low', 900)
shk_b = filt(filt(BUS['shk'], 'high', 6000), 'low', 12000)
irn = int(2.4 * SR); ti = np.arange(irn) / SR
ir = np.stack([rng.standard_normal(irn), rng.standard_normal(irn)]) * np.exp(-ti * 2.6)
ir = filt(ir, 'low', 5200, 1); ir /= np.sqrt((ir ** 2).sum(axis=1, keepdims=True))
send = pad_b * .25 + mal_b * .6
wet = np.stack([fftconvolve(send[c], ir[c])[:N] for c in range(2)])
mix = pad_b * .55 + mal_b * .5 + bas_b * .5 + shk_b * .1 + wet * .22
n = int(DUR * SR); mix = mix[:, :n]
fi = int(.04 * SR); fo = int(2.6 * SR)
env = np.ones(n); env[:fi] = np.linspace(0, 1, fi); env[-fo:] = np.linspace(1, 0, fo) ** 1.6
mix *= env; mix /= np.abs(mix).max() / .7
sf.write(sys.argv[1], mix.T.astype(np.float32), SR)
print(f'music {sys.argv[1]} {DUR:.2f}s  groove {T_GROOVE:.1f}  listen {T_LISTEN:.1f}  warning {T_EMERG:.1f}  slogan {T_SLOGAN:.1f}  end card {T_END:.1f}')
