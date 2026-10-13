"""Write an SRT of speech-timing slots (no text) to help a subtitler: ../output/captions_timing_slots.srt"""
import json, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
from captions import srt_time
reg = json.load(open(os.path.join(ROOT, "data/speech_regions.json"))); slots = []
for a, b in reg:
    n = max(1, round((b - a) / 2.4))
    slots += [(a + (b - a) * k / n, a + (b - a) * (k + 1) / n) for k in range(n)]
with open(os.path.join(ROOT, "..", "output", "captions_timing_slots.srt"), "w", encoding="utf-8") as f:
    for i, (a, b) in enumerate(slots, 1):
        f.write(f"{i}\n{srt_time(a)} --> {srt_time(b)}\n[{i}]\n\n")
print(len(slots), "slots")
