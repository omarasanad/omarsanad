"""Synthesized sound-design bed for the Summer Heat reel (no samples). Cue times come from the same word anchors the
visuals use (web/data/captions.json + the shot list in web/reel.html), so every sound lands on its on-screen event.
Kept subtle: soft transitions, small pops for chips and labels, a heartbeat under the blood-flow chart, a clock tick,
a fizz for the soda, a bell for "جرس إنذار", a chime for the slogan and a sting for the end card.
Usage: python3 sfx.py OUT.wav
"""
import json, os, re, sys
import numpy as np, soundfile as sf
from scipy.signal import butter, sosfilt

HERE = os.path.dirname(os.path.abspath(__file__))
CAPS = json.load(open(os.path.join(HERE, '../web/data/captions.json'), encoding='utf-8'))
SR = 48000; rng = np.random.default_rng(5)

def norm(s):   # same normalisation as reel.html
    s = re.sub('[ً-ْٰـ]', '', s)
    s = re.sub('[أإآ]', 'ا', s).replace('ة', 'ه').replace('ى', 'ي')
    return re.sub('[^؀-ۿA-Za-z0-9]', '', s)
def C(i): return CAPS[i]['start']
def Wd(i, p):
    n = norm(p)
    for w in CAPS[i]['words']:
        if norm(w['w']).startswith(n): return w['s']
    raise SystemExit(f'anchor not found: {i} {p}')
VO_END = CAPS[-1]['end']; DUR = VO_END + .7 + 4.3
SH = dict(zip('melon complaints quote enter thermo bloodviz vascular barrier context microbiome habits water reflux food listen warnings emergency slogan'.split(),
              [0] + [C(i) - .15 for i in (1, 3, 6, 8, 11, 13, 17, 22, 24, 28, 33, 35, 39, 46, 49, 53, 56)]))
SH['endcard'] = VO_END + .7
N = int((DUR + 2) * SR); OUT = np.zeros((2, N))

def bp(x, lo, hi, order=2): return sosfilt(butter(order, [lo, hi], 'band', fs=SR, output='sos'), x)
def lp(x, f, order=2): return sosfilt(butter(order, f, 'low', fs=SR, output='sos'), x)
def hp(x, f, order=2): return sosfilt(butter(order, f, 'high', fs=SR, output='sos'), x)
def env(n, peak=.5, a=2., r=1.6):
    t = np.linspace(0, 1, n); return np.where(t < peak, (t / peak) ** a, ((1 - t) / (1 - peak)) ** r)
def tt(d): return np.arange(int(d * SR)) / SR

def sweep(d, f0, f1, q=1.3):   # band-pass noise sweeping f0 -> f1
    n = int(d * SR); x = rng.standard_normal(n); y = np.zeros(n); blk = 480
    for i in range(0, n, blk):
        f = f0 * (f1 / f0) ** (i / n); y[i:i + blk] = bp(x[i:i + blk + 0], max(40, f / q / 1.5), min(20000, f * q * 1.5))[:len(y[i:i + blk])]
    return y
def whoosh(): y = sweep(.75, 280, 3600); return y * env(len(y), .62, 2.2) * .8, .62      # (signal, fraction where it peaks)
def swish():  y = sweep(.32, 1400, 6000); return y * env(len(y), .45, 1.5) * .55, .45
def air():    y = lp(rng.standard_normal(int(.6 * SR)), 1800); return y * env(len(y), .62, 2.4, 2.2) * .9, .62
def pop():
    t = tt(.14); f = 560 * np.exp(-t * 16) + 240
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 28) * np.minimum(1, t / .002), 0
def tick():
    t = tt(.05); return (np.sin(2 * np.pi * 2600 * t) * .6 + np.sin(2 * np.pi * 1250 * t)) * np.exp(-t * 110) * .7, 0
def thump():   # soft heartbeat: lub-dub
    t = tt(.5); y = np.zeros(len(t))
    for d, a in ((0, 1.), (.19, .65)):
        u = np.clip(t - d, 0, None); y += a * np.sin(2 * np.pi * (58 + 20 * np.exp(-u * 30)) * u) * np.exp(-u * 16) * (t >= d) * np.minimum(1, u / .004)
    return y, 0
def drip():
    t = tt(.35); f = 700 + 1500 * (1 - np.exp(-t * 60))
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 22) * np.minimum(1, t / .002)
    return y + hp(rng.standard_normal(len(t)), 3000) * np.exp(-t * 60) * .08, 0
def fizz():
    n = int(1.3 * SR); y = np.zeros(n)
    for _ in range(170):
        i = int(rng.uniform(0, 1) ** 1.6 * (n - 800)); k = np.arange(400) / SR
        y[i:i + 400] += np.sin(2 * np.pi * rng.uniform(2500, 7000) * k) * np.exp(-k * rng.uniform(250, 600)) * rng.uniform(.2, 1)
    return hp(y, 1800) * np.linspace(1, .25, n) * .5, 0
def swell():
    y = lp(rng.standard_normal(int(.9 * SR)), 650); return y * env(len(y), .55, 1.8, 1.8) * 1.6, .55
def shimmer():
    n = int(1.4 * SR); t = np.arange(n) / SR; y = hp(rng.standard_normal(n), 5000) * env(n, .25, 1.5, 2) * .25
    for f in (2093, 2637, 3136, 3951, 4186):
        d = rng.uniform(0, .35); u = np.clip(t - d, 0, None); y += np.sin(2 * np.pi * f * u) * np.exp(-u * 4.5) * (t >= d) * .18
    return y, .2
def thud():
    t = tt(.4); return (np.sin(2 * np.pi * (52 + 40 * np.exp(-t * 25)) * t) * np.exp(-t * 9) + lp(rng.standard_normal(len(t)), 900) * np.exp(-t * 60) * .3) * np.minimum(1, t / .003), 0
def stamp():
    a, _ = thud(); b, _ = pop(); y = np.zeros(len(a)); y += a * .9; y[:len(b)] += b * .5; return y, 0
def chime(base=880):
    t = tt(1.8); y = np.zeros(len(t))
    for f, a, d in ((base, 1, 0), (base * 1.4983, .7, .07), (base * 2, .4, .14)):
        u = np.clip(t - d, 0, None); y += a * np.sin(2 * np.pi * f * u) * np.exp(-u * 3) * (t >= d) * np.minimum(1, u / .004)
    return y * .4, 0
def bell():    # small inharmonic bell for "جرس إنذار"
    t = tt(1.6); y = np.zeros(len(t))
    for r, a, dc in ((1, 1, 3.2), (2.76, .45, 5), (5.4, .2, 8), (8.93, .08, 12)): y += a * np.sin(2 * np.pi * 784 * r * t) * np.exp(-t * dc)
    return y * np.minimum(1, t / .002) * .35, 0
def sting():
    a, _ = shimmer(); b, _ = chime(1108.7); c, _ = thud(); y = np.zeros(max(len(a), len(b)))
    y[:len(a)] += a; y[:len(b)] += b * .9; y[:len(c)] += c * .5; return y, .0

def cue(fn, t, gain, pan=0.):
    y, peak = fn(); i = int(round((t - peak * len(y) / SR) * SR)); j = min(N, i + len(y))
    if i < 0: y = y[-i:]; i = 0
    a = (pan + 1) * np.pi / 4; OUT[0, i:j] += y[:j - i] * gain * np.cos(a); OUT[1, i:j] += y[:j - i] * gain * np.sin(a)

# ---------------- the cue sheet ----------------
cue(shimmer, .05, .35, -.3)
for k, w in enumerate(('حموضه', 'وانتفاخ', 'وتقل')): cue(pop, Wd(2, w), .45, (-.2, .2, 0)[k])
cue(whoosh, SH['quote'], .4); cue(swish, Wd(5, 'اكيد') - .05, .25, .3)
cue(air, SH['enter'], .3); cue(thud, Wd(6, 'الحر'), .3)
cue(shimmer, SH['thermo'], .35, -.4); cue(drip, Wd(10, 'بيعرق'), .35, .25); cue(swell, Wd(10, 'وبيوسع'), .3)
cue(swish, SH['bloodviz'], .4, -.3)
t = SH['bloodviz'] + .4                                    # heartbeat in step with the pulsing heart on screen
k0 = int(np.ceil((t * 7.5 - np.pi / 2) / (2 * np.pi)))
while True:
    tb = (np.pi / 2 + 2 * np.pi * k0) / 7.5
    if tb > SH['vascular'] - .3: break
    cue(thump, tb - .03, .22, .35); k0 += 1
cue(pop, Wd(12, 'جزء'), .4, -.3)
cue(air, SH['vascular'], .3); cue(pop, Wd(15, 'بتفضي'), .3, -.3); cue(pop, Wd(16, 'بتقل'), .3, .2); cue(pop, Wd(16, 'وغثيان'), .3, .1)
cue(air, SH['barrier'], .3); cue(swell, Wd(19, 'جدار'), .25); cue(swish, Wd(21, 'فتعدي'), .22, -.3)
cue(thud, SH['context'], .4); cue(stamp, Wd(23, 'مش'), .45)
cue(air, SH['microbiome'], .3); cue(pop, Wd(25, 'الحيوانات'), .28, -.2); cue(pop, Wd(27, 'الانسان') - .2, .28, .2)
cue(whoosh, SH['habits'], .4); cue(fizz, Wd(29, 'المياه'), .35, -.3)
for w, i in (('والاكل', 29), ('والوجبات', 30), ('البطيخ', 31)): cue(pop, Wd(i, w), .28, .2)
cue(drip, SH['water'], .4)
for k, w in enumerate(('صداع', 'وغثيان', 'وامساك')): cue(pop, Wd(34, w), .4, (-.2, .2, 0)[k])
cue(swish, SH['reflux'], .4, .3)
for w, i in (('الاكل', 36), ('والنوم', 37), ('المياه', 38)): cue(pop, Wd(i, w), .28, .25)
cue(whoosh, SH['food'], .4); cue(pop, Wd(42, 'نزله'), .3, .2); cue(pop, Wd(42, 'تسمم'), .3, -.2)
h2 = Wd(44, 'ساعتين')
for q in range(5): cue(tick, h2 - .2 + q * .22, .3, -.35)
cue(pop, Wd(45, 'ساعه'), .4, .2)
cue(air, SH['listen'], .3)
for k, ti in enumerate([Wd(49, 'متكرر'), Wd(49, 'بيصحيك'), Wd(50, 'نزول'), Wd(51, 'قيء')] + [Wd(52, 'جرس') + d for d in (.5, .8, 1.1)]):
    cue(tick, ti - .05, .22, .2)
cue(bell, Wd(52, 'جرس'), .35)
cue(thud, SH['emergency'], .5)
for k, w in enumerate(('تشوش', 'اغماء')): cue(pop, Wd(53, w), .4, (-.2, .2)[k])
cue(pop, Wd(54, 'سخونيه'), .4); cue(stamp, Wd(55, 'وطوارئ'), .5)
cue(air, SH['slogan'], .3); cue(chime, Wd(57, 'اساس'), .35)
cue(sting, SH['endcard'], .45)

st = OUT[:, :int(DUR * SR)]
sf.write(sys.argv[1], st.T.astype(np.float32), SR)
print(f'sfx {sys.argv[1]} {DUR:.2f}s peak {20 * np.log10(np.abs(st).max()):.1f} dBFS')
