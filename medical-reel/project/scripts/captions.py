"""Build synchronized captions from a reviewed transcript.

Input  data/transcript.txt — one short phrase per line, in the doctor's exact (Egyptian Arabic) wording.
       Optional timing prefix:  [12.40-14.10] النص هنا
       Highlight medical terms with *asterisks* (teal) or ^carets^ (orange accent).
       Lines starting with # are ignored.
       Alternatively pass a word-timed ASR file from scripts/transcribe.py:  --asr data/asr_words.json
Output data/captions.json (used by index.html) and ../output/captions.srt

Phrases without timestamps are laid onto the detected speech regions (data/speech_regions.json)
in proportion to their length, so every phrase sits on real speech; refine with [start-end] where needed.
Usage: python3 scripts/captions.py [--asr data/asr_words.json]
"""
import json, re, sys, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(ROOT, *a)

def srt_time(t):
    ms = int(round(t * 1000)); h, ms = divmod(ms, 3600000); m, ms = divmod(ms, 60000); s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"

def parse_line(line):
    m = re.match(r"^\[(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\]\s*(.*)$", line)
    t0, t1, body = (float(m[1]), float(m[2]), m[3]) if m else (None, None, line)
    hl = re.findall(r"\*([^*]+)\*", body); hl2 = re.findall(r"\^([^^]+)\^", body)
    text = re.sub(r"[*^]", "", body).strip()
    return {"start": t0, "end": t1, "text": text,
            "hl": [w for h in hl for w in h.split()], "hl2": [w for h in hl2 for w in h.split()]}

def from_transcript():
    lines = [l.strip() for l in open(P("data/transcript.txt"), encoding="utf-8") if l.strip() and not l.startswith("#")]
    caps = [parse_line(l) for l in lines]
    all_regions = json.load(open(P("data/speech_regions.json")))
    def fill(run, lo, hi):
        # speech-time axis inside [lo, hi]: map a 0..1 fraction onto the concatenated speech regions
        regions = [[max(a, lo), min(b, hi)] for a, b in all_regions if min(b, hi) > max(a, lo)] or [[lo, hi]]
        total = sum(b - a for a, b in regions)
        def at(frac):
            x = frac * total
            for a, b in regions:
                if x <= b - a: return a + x
                x -= b - a
            return regions[-1][1]
        n = sum(len(c["text"]) for c in run) or 1; acc = 0
        for c in run:
            c["start"] = round(at(acc / n), 2); acc += len(c["text"]); c["end"] = round(at(acc / n), 2)
    run, lo = [], 0.0
    for c in caps + [None]:                    # runs of untimed lines sit between their timed neighbours
        if c is not None and c["start"] is None: run.append(c); continue
        hi = c["start"] if c is not None else all_regions[-1][1]
        if run: fill(run, lo, hi); run = []
        if c is not None: lo = c["end"]
    return caps

def from_asr(path, max_words=5, max_dur=2.6):
    words = [w for seg in json.load(open(path, encoding="utf-8")) for w in seg["words"]]
    caps, cur = [], []
    for w in words:
        cur.append(w)
        end_punct = w["w"].strip()[-1:] in "،.؟!"
        if len(cur) >= max_words or (cur[-1]["e"] - cur[0]["s"]) > max_dur or end_punct:
            caps.append(cur); cur = []
    if cur: caps.append(cur)
    return [{"start": round(c[0]["s"], 2), "end": round(c[-1]["e"], 2),
             "text": " ".join(w["w"].strip() for w in c), "hl": [], "hl2": [],
             "words": [{"w": w["w"].strip(), "s": w["s"], "e": w["e"]} for w in c]} for c in caps]

if __name__ == "__main__":
    caps = from_asr(sys.argv[sys.argv.index("--asr") + 1]) if "--asr" in sys.argv else from_transcript()
    caps.sort(key=lambda c: c["start"])
    for a, b in zip(caps, caps[1:]):           # no overlaps
        a["end"] = min(a["end"], b["start"] - 0.02)
    json.dump(caps, open(P("data/captions.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    os.makedirs(P("..", "output"), exist_ok=True)
    with open(P("..", "output", "captions.srt"), "w", encoding="utf-8") as f:
        for i, c in enumerate(caps, 1):
            f.write(f"{i}\n{srt_time(c['start'])} --> {srt_time(c['end'])}\n‫{c['text']}‬\n\n")
    print(f"{len(caps)} captions -> data/captions.json, output/captions.srt")
