"""audio/voiceover.(mp3|wav) -> src/vo_env.json: per-frame loudness (30 fps) that drives the presenter's speaking meter."""
import json, os, subprocess
import numpy as np
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = next(p for p in ('audio/voiceover.wav', 'audio/voiceover.mp3') if os.path.exists(os.path.join(ROOT, p)))
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', os.path.join(ROOT, src), '-ac', '1', '-ar', '48000', '-f', 'f32le', '-'],
                     capture_output=True, check=True).stdout
x = np.frombuffer(raw, np.float32); hop = 48000 // 30
rms = np.array([np.sqrt(np.mean(x[i:i + hop] ** 2)) for i in range(0, len(x) - hop, hop)])
v = np.clip(rms / (np.percentile(rms[rms > 0.005], 90) + 1e-9), 0, 1.2)
v = np.convolve(v, [0.25, 0.5, 0.25], 'same')
json.dump({'fps': 30, 'v': [round(float(a), 3) for a in v]}, open(os.path.join(ROOT, 'src/vo_env.json'), 'w'))
print(f'wrote src/vo_env.json ({len(v)} frames from {src})')
