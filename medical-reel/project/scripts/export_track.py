"""build/track_full.json -> data/track.json (smoothed monitor bbox per frame, used for punch-in focus + magnifier)."""
import json, sys, numpy as np
d = json.load(open(sys.argv[1]))
b = np.array([[min(p[0] for p in f['mon']), min(p[1] for p in f['mon']), max(p[0] for p in f['mon']), max(p[1] for p in f['mon'])] for f in d], float)
k = np.ones(9) / 9
s = np.stack([np.convolve(np.pad(b[:, i], 4, mode='edge'), k, 'valid') for i in range(4)], 1)
json.dump({"fps": 30, "src": [400, 368], "mon": [[round(v, 1) for v in r] for r in s]}, open(sys.argv[2], 'w'))
