"""Arabic ASR draft with sherpa-onnx Whisper exports (downloadable from GitHub releases:
https://github.com/k2-fsa/sherpa-onnx/releases/tag/asr-models , e.g. sherpa-onnx-whisper-large-v3).
Transcribes each speech chunk (cut at natural pauses, data/speech_regions.json) so every phrase keeps
real timing, plus a whole-clip pass for context. Output is a DRAFT: review it against the audio.
Usage: python3 scripts/transcribe_sherpa.py MODEL_DIR AUDIO.wav OUT.json
"""
import sys, os, json, glob
import numpy as np, soundfile as sf, sherpa_onnx
from scipy.signal import resample_poly

mdir, wav, out = sys.argv[1], sys.argv[2], sys.argv[3]
pick = lambda pat: sorted(glob.glob(os.path.join(mdir, pat)), key=len)[0]
enc = pick("*encoder.int8.onnx") if glob.glob(os.path.join(mdir, "*encoder.int8.onnx")) else pick("*encoder.onnx")
dec = pick("*decoder.int8.onnx") if glob.glob(os.path.join(mdir, "*decoder.int8.onnx")) else pick("*decoder.onnx")
rec = sherpa_onnx.OfflineRecognizer.from_whisper(encoder=enc, decoder=dec, tokens=pick("*tokens.txt"),
                                                 language="ar", task="transcribe", num_threads=4)
x, sr = sf.read(wav)
if x.ndim > 1: x = x.mean(1)
if sr != 16000: x = resample_poly(x, 16000, sr); sr = 16000
x = x.astype(np.float32)

def run(a, b):
    s = rec.create_stream(); s.accept_waveform(sr, x[int(a * sr):int(b * sr)]); rec.decode_stream(s)
    return s.result.text.strip()

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
regions = json.load(open(os.path.join(root, "data", "speech_regions.json")))
# merge regions into chunks: join gaps < 0.6 s and keep chunks under ~8 s
chunks = []
for a, b in regions:
    if chunks and a - chunks[-1][1] < 0.6 and b - chunks[-1][0] < 8: chunks[-1][1] = b
    else: chunks.append([a, b])
res = {"model": os.path.basename(mdir.rstrip('/')), "chunks": [], "whole": []}
for a, b in chunks:
    t = run(max(0, a - 0.15), b + 0.15); res["chunks"].append({"start": a, "end": b, "text": t})
    print(f"[{a:5.2f}-{b:5.2f}] {t}", flush=True)
for a, b in ((0, 16.0), (15.9, len(x) / sr)):
    t = run(a, b); res["whole"].append({"start": a, "end": b, "text": t}); print(f"WHOLE [{a:.1f}-{b:.1f}] {t}", flush=True)
json.dump(res, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
