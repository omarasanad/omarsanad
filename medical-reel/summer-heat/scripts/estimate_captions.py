"""Estimated caption timing (used until the real narration exists): words at the pace of the series' ElevenLabs voice
(274 words / 118 s ≈ 2.32 w/s overall, i.e. ~2.8 w/s speaking) plus pauses after punctuation and between sections.
Writes web/data/captions.json in the same format align_vo.py produces (start/end + word timings)."""
import json, re, os
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WPS = 2.78   # speaking rate; with the pauses below this lands at the series pace (~2.3 words/s overall)
lines = open(os.path.join(HERE, 'web/data/transcript.txt'), encoding='utf-8').read().split('\n')
caps, t, gap_next = [], 0.35, 0.0
for raw in lines:
    l = raw.strip()
    if l.startswith('#'): continue
    if not l: gap_next = 0.75; continue
    t += gap_next; gap_next = 0.0
    hl = re.findall(r'\*([^*]+)\*', l); hl2 = re.findall(r'\^([^^]+)\^', l)
    text = re.sub(r'[*^]', '', l).strip(); ws = text.split()
    dur = len(ws) / WPS; tot = sum(len(w) + 1 for w in ws); acc = t; words = []
    for w in ws: d = dur * (len(w) + 1) / tot; words.append({'w': w, 's': round(acc, 3), 'e': round(acc + d, 3)}); acc += d
    caps.append({'start': round(t, 2), 'end': round(t + dur, 2), 'text': text, 'hl': [x for h in hl for x in h.split()], 'hl2': [x for h in hl2 for x in h.split()], 'words': words})
    t += dur + (0.42 if text[-1] in '.؟!…:' else 0.16)
json.dump(caps, open(os.path.join(HERE, 'web/data/captions.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(len(caps), 'captions, narration ends at', caps[-1]['end'], 's')
