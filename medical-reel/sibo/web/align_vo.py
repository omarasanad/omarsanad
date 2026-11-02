"""Align the narration audio to the known script and re-time captions + shots.
Inputs : segs.json (Whisper text per speech segment, cut at pauses), sil.txt (pauses), data/transcript.txt (caption lines)
Output : data/captions.json (word-timed), data/shots.json (shot boundaries + time-warp anchors), ../out/captions.srt
Method : ASR text of all segments is aligned to the script text character-by-character (difflib), so each segment
         boundary maps to a script position; inside a segment, words are spread over the actual speech span by length.
Usage  : python3 align_vo.py SEGS.json SIL.txt
"""
import json, re, sys, difflib, os
HERE = os.path.dirname(os.path.abspath(__file__))
segs = json.load(open(sys.argv[1], encoding='utf-8'))
sil = [tuple(map(float, l.split()[0].split('-'))) for l in open(sys.argv[2])]
AR_DIAC = re.compile('[ً-ْٰـ]')
def norm(s):
    s = AR_DIAC.sub('', s).replace('أ', 'ا').replace('إ', 'ا').replace('آ', 'ا').replace('ة', 'ه').replace('ى', 'ي').replace('ـ', '')
    s = re.sub(r'[^\w\s]', ' ', s).lower()
    return re.sub(r'\s+', ' ', s).strip()

# caption lines (text, hl, hl2) in order
caps = []
for l in open(os.path.join(HERE, 'data/transcript.txt'), encoding='utf-8'):
    l = l.strip()
    if not l or l.startswith('#'): continue
    body = re.sub(r'^\[[^\]]*\]\s*', '', l)
    hl = re.findall(r'\*([^*]+)\*', body); hl2 = re.findall(r'\^([^^]+)\^', body)
    caps.append({'text': re.sub(r'[*^]', '', body).strip(), 'hl': [w for h in hl for w in h.split()], 'hl2': [w for h in hl2 for w in h.split()]})
# script words with caption index
words = []
for ci, c in enumerate(caps):
    for w in c['text'].split(): words.append({'w': w, 'ci': ci, 'n': norm(w)})
script = ''; wstart = []
for w in words: wstart.append(len(script)); script += w['n'] + ' '
# speech span of each segment = between surrounding pauses
pauses = [(0.0, 0.0)] + sil + [(segs[-1]['b'], segs[-1]['b'])]
def speech_span(a, b):
    st = max([pe for ps, pe in pauses if pe <= a + .3] + [a]); en = min([ps for ps, pe in pauses if ps >= b - .3] + [b])
    return st, max(st + .2, en)
asr = ''; segpos = []
for s in segs:
    t = norm(s['text']); segpos.append((len(asr), len(asr) + len(t))); asr += t + ' '
sm = difflib.SequenceMatcher(None, asr, script, autojunk=False)
amap = [None] * (len(asr) + 1)
for a, b, n in sm.get_matching_blocks():
    for k in range(n + 1): amap[a + k] = b + k
def to_script(i):  # nearest mapped position
    for d in range(0, 400):
        for j in (i - d, i + d):
            if 0 <= j < len(amap) and amap[j] is not None: return amap[j]
    return 0
bounds = [0]
for k, (sa, se) in enumerate(segpos[:-1]): bounds.append(to_script(se))
bounds.append(len(script))
for k in range(1, len(bounds)): bounds[k] = max(bounds[k], bounds[k - 1])
# word times
for k, s in enumerate(segs):
    st, en = speech_span(s['a'], s['b']); c0, c1 = bounds[k], bounds[k + 1]
    for i, w in enumerate(words):
        p = wstart[i]
        if c0 <= p < c1 or (k == len(segs) - 1 and p >= c0):
            e = p + len(w['n']); w['s'] = st + (en - st) * (p - c0) / max(1, c1 - c0); w['e'] = st + (en - st) * min(1, (e - c0) / max(1, c1 - c0))
for i, w in enumerate(words):   # fill gaps if any
    if 's' not in w: w['s'] = words[i - 1]['e']; w['e'] = w['s'] + .3
out = []
for ci, c in enumerate(caps):
    ws = [w for w in words if w['ci'] == ci]
    out.append({'start': round(ws[0]['s'], 2), 'end': round(ws[-1]['e'], 2), 'text': c['text'], 'hl': c['hl'], 'hl2': c['hl2'],
                'words': [{'w': w['w'], 's': round(w['s'], 3), 'e': round(w['e'], 3)} for w in ws]})
for a, b in zip(out, out[1:]): a['end'] = round(min(b['start'] - .02, a['end'] + .25), 2)
json.dump(out, open(os.path.join(HERE, 'data/captions.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

def W(word, after=0.0):  # time of first word (normalised match) at/after a time
    n = norm(word)
    for w in words:
        if w['s'] >= after - .01 and w['n'].startswith(n): return round(w['s'], 2)
    raise SystemExit('anchor not found: ' + word)
C = lambda i: out[i]['start']
END = round(segs[-1]['b'] + .35, 2)
sh = [  # [start, end, name, chapter, warp anchors [[actual_lt, design_lt]...], design_len]
  [0, C(1), 'doc', 'السؤال', [], None],
  [C(1), C(6), 'torso', 'الانتفاخ', [[W('sibo', C(4)) - .35 - C(1), 4.7]], 9.2],
  [C(6), C(10), 'anatomy', 'جوه الجسم', [[W('بالقولون', C(6)) - C(6), 2.3], [W('حمض', C(9)) - C(6), 6.5], [W('وحركه', C(9)) - C(6), 8.0], [W('والصمام', C(9)) - C(6), 9.9]], 11.5],
  [C(10), C(12), 'lumen', 'الأمعاء الدقيقة', [[W('تزيد', C(11)) - C(10), 1.9]], 3.5],
  [C(12), W('والنتيجه', C(13)), 'ferment', 'التخمير', [], 2.2],
  [W('والنتيجه', C(13)), C(14), 'cutaway', 'الانتفاخ', [], 1.8],
  [C(14), C(18), 'mg:history', 'الحكاية', [[C(17) - C(14), 6.5]], 10],
  [C(18), C(20), 'mg:stats', 'الأبحاث', [[C(19) - C(18), 3.5]], 6.5],
  [C(20), C(21), 'doc', 'العلامات', [], None],
  [C(21), C(22), 'torsoSide', 'العلامات ١', [], 3],
  [C(22), C(23), 'mg:lanes', 'العلامات ٢', [[W('امساك', C(22)) - C(22), 1.4]], 4],
  [C(23), C(24), 'b12', 'العلامات ٣', [], 3.2],
  [C(24), C(25), 'mg:fatigue', 'العلامات ٣', [], 1.3],
  [C(25), C(26), 'mg:cards', 'العلامات', [], 3],
  [C(26), W('وتنفخ', C(27)), 'drink', 'التشخيص', [], 2.9],
  [W('وتنفخ', C(27)), C(29), 'device', 'التشخيص', [], 4.1],
  [C(29), C(32), 'mg:chart', 'التشخيص', [[C(30) - C(29), 2.1], [C(31) - C(29), 3.9]], 6.5],
  [C(32), C(33), 'doc', 'العلاج', [], None],
  [C(33), C(36), 'mg:plan', 'العلاج', [[C(34) - C(33), 2.6], [W('تعويض', C(35)) - C(33), 4.6], [W('ونظام', C(35)) - C(33), 5.3]], 6.2],
  [C(36), C(37), 'mg:noself', 'العلاج', [], 2.5],
  [C(37), END, 'doc:slogan', 'الخلاصة', [[W('اساس', C(38)) - C(37), 1.9]], 5.5],
  [END, round(END + 3.2, 2), 'outro', '', [], 3.2]]
json.dump({'shots': sh, 'duration': round(END + 3.2, 2), 'voEnd': segs[-1]['b']}, open(os.path.join(HERE, 'data/shots.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
def srt(t): ms = int(round(t * 1000)); h, ms = divmod(ms, 3600000); m, ms = divmod(ms, 60000); s, ms = divmod(ms, 1000); return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"
os.makedirs(os.path.join(HERE, '../out'), exist_ok=True)
with open(os.path.join(HERE, '../out/captions.srt'), 'w', encoding='utf-8') as f:
    for i, c in enumerate(out, 1): f.write(f"{i}\n{srt(c['start'])} --> {srt(c['end'])}\n‫{c['text']}‬\n\n")
for s in sh: print(f"{s[0]:7.2f}-{s[1]:7.2f} {s[2]:12s} anchors={s[4]}")
print('duration', round(END + 3.2, 2))
