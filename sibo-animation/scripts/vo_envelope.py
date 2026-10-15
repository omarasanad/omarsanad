"""Voiceover -> src/vo_env.json: per-frame (30 fps) audio features that drive Dr. Sanad's lip-sync.
  o: syllabic mouth opening (0..1): loudness relative to its local min/max, so the mouth closes between syllables
  v: loudness (0..~1.2), smoothed lightly; drives when the mouth opens/closes and how wide.
  c: spectral brightness (0..1); dark frames (o/u-like vowels) pick the rounded mouth shape.
usage: python3 scripts/vo_envelope.py [input_audio] [output_json]"""
import json, os, subprocess, sys
import numpy as np
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = sys.argv[1] if len(sys.argv) > 1 else next(os.path.join(ROOT, p) for p in ('audio/voiceover.wav', 'audio/voiceover.mp3') if os.path.exists(os.path.join(ROOT, p)))
dst = sys.argv[2] if len(sys.argv) > 2 else os.path.join(ROOT, 'src/vo_env.json')
SR = 16000
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', src, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
x = np.frombuffer(raw, np.float32); hop = SR // 30; win = hop * 2
frames = [x[i:i + win] for i in range(0, len(x) - win, hop)]
rms = np.array([np.sqrt(np.mean(f ** 2)) for f in frames])
freqs = np.fft.rfftfreq(win, 1 / SR)
cent = []
for f in frames:
    S = np.abs(np.fft.rfft(f * np.hanning(win)))
    band = (freqs > 150) & (freqs < 4000)
    cent.append((S[band] * freqs[band]).sum() / (S[band].sum() + 1e-9))
cent = np.array(cent)
v = np.clip(rms / (np.percentile(rms[rms > 0.005], 90) + 1e-9), 0, 1.2)
v = np.convolve(v, [0.2, 0.6, 0.2], 'same')
voiced = v > 0.13
lo, hi = (np.percentile(cent[voiced], 10), np.percentile(cent[voiced], 90)) if voiced.any() else (500, 2500)
c = np.clip((cent - lo) / (hi - lo + 1e-9), 0, 1)
c = np.convolve(c, [0.25, 0.5, 0.25], 'same')
# syllabic openness: level relative to the local min/max (~0.4 s) so the mouth closes between syllables
from scipy.ndimage import maximum_filter1d, minimum_filter1d
mx, mn = maximum_filter1d(v, 13), minimum_filter1d(v, 9)
o = np.clip((v - mn) / (mx - mn + 0.08), 0, 1) * np.clip(v * 1.6, 0, 1)
o = np.convolve(o, [0.25, 0.5, 0.25], 'same')
json.dump({'fps': 30, 'o': [round(float(a), 3) for a in o], 'v': [round(float(a), 3) for a in v], 'c': [round(float(a), 3) for a in c]}, open(dst, 'w'))
print(f'wrote {dst} ({len(v)} frames from {os.path.basename(src)})')
