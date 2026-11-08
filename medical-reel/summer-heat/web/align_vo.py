"""Align the narration audio to the known script and write word-timed captions.
Inputs : SEGS.json (Whisper text per speech segment, cut at pauses), SIL.txt (pauses), VO.wav (16-bit mono, for the
         speech onset/offset), data/transcript.txt (caption lines)
Output : data/captions.json (word-timed; reel.html derives every shot from it), ../out/captions.srt
Method : Whisper transcribes the START of each segment reliably but often drops its last word or two, so each
         segment's start is located in the script (character alignment with difflib, snapped to a word start) and
         segment k covers the script from its own start to the next segment's start. Inside a segment, words are spread
         over the actual speech span in proportion to their length (plus a small pause after commas).
Usage  : python3 align_vo.py SEGS.json SIL.txt VO.wav
"""
import json, re, sys, difflib, os, wave
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
segs = json.load(open(sys.argv[1], encoding='utf-8'))
sil = [tuple(map(float, l.split()[0].split('-'))) for l in open(sys.argv[2]) if l.strip()]
AR_DIAC = re.compile('[ً-ْٰـ]')
def norm(s):
    s = AR_DIAC.sub('', s).replace('أ', 'ا').replace('إ', 'ا').replace('آ', 'ا').replace('ة', 'ه').replace('ى', 'ي')
    s = re.sub(r'[^\w\s]', ' ', s).lower()
    return re.sub(r'\s+', ' ', s).strip()

# speech onset / offset from the audio energy (20 ms windows, -42 dBFS)
with wave.open(sys.argv[3]) as wf:
    sr = wf.getframerate(); x = np.frombuffer(wf.readframes(wf.getnframes()), dtype=np.int16).astype(np.float32) / 32768
hop = int(sr * .02); rms = np.sqrt(np.mean(x[:len(x) // hop * hop].reshape(-1, hop) ** 2, axis=1) + 1e-12)
loud = np.where(20 * np.log10(rms) > -42)[0]
ONSET, OFFSET = loud[0] * .02, (loud[-1] + 1) * .02
print(f'speech {ONSET:.2f} -> {OFFSET:.2f} s (file {len(x) / sr:.2f} s)')

# caption lines (text, hl = teal *..*, hl2 = coral ^..^) in order
caps = []
for l in open(os.path.join(HERE, 'data/transcript.txt'), encoding='utf-8'):
    l = l.strip()
    if not l or l.startswith('#'): continue
    hl = re.findall(r'\*([^*]+)\*', l); hl2 = re.findall(r'\^([^^]+)\^', l)
    caps.append({'text': re.sub(r'[*^]', '', l).strip(), 'hl': [w for h in hl for w in h.split()], 'hl2': [w for h in hl2 for w in h.split()]})
words = []
for ci, c in enumerate(caps):
    ws = c['text'].split()
    for k, w in enumerate(ws): words.append({'w': w, 'ci': ci, 'n': norm(w), 'comma': bool(re.search(r'[،,:؛…]$', w)) and k < len(ws) - 1 or bool(re.search(r'[،,:؛….؟!]$', w))})
script = ''; wstart = []
for w in words: wstart.append(len(script)); script += w['n'] + ' '

asr = ''; segpos = []
for s in segs:
    t = norm(s['text']); segpos.append((len(asr), len(asr) + len(t))); asr += t + ' '
sm = difflib.SequenceMatcher(None, asr, script, autojunk=False)
amap = [None] * (len(asr) + 1)
for a, b, n in sm.get_matching_blocks():
    for k in range(n): amap[a + k] = b + k
def seg_start_in_script(k):
    a0, a1 = segpos[k]
    for i in range(a0, a1):          # first aligned character of the segment, shifted back to the segment start
        if amap[i] is not None: est = amap[i] - (i - a0); break
    else: return None
    j = min(range(len(wstart)), key=lambda j: abs(wstart[j] - est))     # nearest word start
    # segments are cut at pauses, and the script marks pauses with punctuation: prefer a word that follows one
    near = [i for i in range(max(1, j - 2), min(len(words), j + 3)) if re.search(r'[،,:؛….؟!]$', words[i - 1]['w'])]
    return min(near, key=lambda i: abs(i - j)) if near else j

first_word = [0] + [seg_start_in_script(k) for k in range(1, len(segs))]
for k in range(1, len(first_word)):    # keep monotonic; an unaligned segment gets interpolated below
    if first_word[k] is None or first_word[k] <= first_word[k - 1]: first_word[k] = None
for k in range(1, len(first_word)):
    if first_word[k] is None:
        nxt = next((first_word[j] for j in range(k + 1, len(first_word)) if first_word[j] is not None), len(words))
        first_word[k] = first_word[k - 1] + max(1, (nxt - first_word[k - 1]) // 2)
first_word.append(len(words))

# speech span of each segment: segment edges snapped to the surrounding pauses
pauses = [(0.0, ONSET)] + sil + [(OFFSET, OFFSET)]
def speech_span(a, b):   # segment edges sit inside pauses: speech starts at that pause's end and stops at the next one's start
    near = lambda t: min(pauses, key=lambda p: abs((p[0] + p[1]) / 2 - t))
    pa, pb = near(a), near(b)
    st = pa[1] if abs((pa[0] + pa[1]) / 2 - a) < .6 else a; en = pb[0] if abs((pb[0] + pb[1]) / 2 - b) < .6 else b
    return st, max(st + .2, en)
report = []
for k, s in enumerate(segs):
    st, en = speech_span(s['a'], s['b']); seg = words[first_word[k]:first_word[k + 1]]
    wt = [len(w['n']) + 1.2 + (2.5 if w['comma'] and i < len(seg) - 1 else 0) for i, w in enumerate(seg)]; tot = sum(wt) or 1; acc = 0
    for w, q in zip(seg, wt):
        w['s'] = st + (en - st) * acc / tot; acc += q; w['e'] = st + (en - st) * (acc - (2.5 if w['comma'] else 0) * (w is not seg[-1])) / tot
    report.append(f"[{st:6.2f}-{en:6.2f}] {s['text']}  =>  {' '.join(w['w'] for w in seg)}")
out = []
for ci, c in enumerate(caps):
    ws = [w for w in words if w['ci'] == ci]
    out.append({'start': round(ws[0]['s'], 2), 'end': round(ws[-1]['e'], 2), 'text': c['text'], 'hl': c['hl'], 'hl2': c['hl2'],
                'words': [{'w': w['w'], 's': round(w['s'], 3), 'e': round(w['e'], 3)} for w in ws]})
for a, b in zip(out, out[1:]): a['end'] = round(min(b['start'] - .02, a['end'] + .25), 2)
json.dump(out, open(os.path.join(HERE, 'data/captions.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
def srt(t): ms = int(round(t * 1000)); h, ms = divmod(ms, 3600000); m, ms = divmod(ms, 60000); s, ms = divmod(ms, 1000); return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"
os.makedirs(os.path.join(HERE, '../out'), exist_ok=True)
with open(os.path.join(HERE, '../out/captions.srt'), 'w', encoding='utf-8') as f:
    for i, c in enumerate(out, 1): f.write(f"{i}\n{srt(c['start'])} --> {srt(c['end'])}\n‫{c['text']}‬\n\n")
print('\n'.join(report))
print(f'{len(out)} captions, last ends {out[-1]["end"]:.2f}')
