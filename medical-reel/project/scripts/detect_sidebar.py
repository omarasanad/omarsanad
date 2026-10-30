"""Per-frame detection of the endoscopy monitor's screen and its info sidebar (no tracking drift).
Finds the pink endoscope image (the most distinctive thing in frame), derives the screen from fixed layout
ratios, and treats everything right of the image as the sidebar (date, patient fields). Smooths over time and fills frames where a hand hides it.
Writes the same format as track_monitor.py: [{"side":quad,"mon":quad}, ...] (mon = screen box).
Usage: python3 detect_sidebar.py SRC.mp4 OUT.json PREVIEW.png [ymax_fraction=0.6] ['{"l":..,"r":..,"t":..,"b":..}']
"""
import cv2, numpy as np, json, sys
from scipy.ndimage import median_filter

src, out, prev = sys.argv[1], sys.argv[2], sys.argv[3]
ymax = float(sys.argv[4]) if len(sys.argv) > 4 else 0.6
# screen edges beyond the endoscope image, as fractions of the image width/height (measured on this monitor)
R = json.loads(sys.argv[5]) if len(sys.argv) > 5 else {"l": 0.06, "r": 0.56, "t": 0.11, "b": 0.11}
cap = cv2.VideoCapture(src); boxes = []; frames = []
while True:
    ok, f = cap.read()
    if not ok: break
    frames.append(f)
    H, W = f.shape[:2]; top = f[: int(H * ymax)]
    pink = ((top[..., 2] > 130) & (top[..., 2].astype(int) - top[..., 1] > 45) & (top[..., 0] < top[..., 2] - 25)).astype(np.uint8) * 255
    pink = cv2.morphologyEx(pink, cv2.MORPH_CLOSE, np.ones((15, 15), np.uint8))
    n, lab, st, _ = cv2.connectedComponentsWithStats(pink)
    best = None
    for k in range(1, n):
        x, y, w, h, a = st[k]
        if w > W * 0.2 and h > 40 and a > 0.55 * w * h and (best is None or a > st[best][4]): best = k
    if best is None: boxes.append([np.nan] * 4); continue
    x, y, w, h, _ = st[best]; boxes.append([x, y, x + w, y + h])     # endoscope image bbox

B = np.array(boxes, float)
for j in range(4):                                              # fill misses by interpolation
    v = B[:, j]; bad = np.isnan(v)
    if bad.all(): sys.exit("no screen found")
    v[bad] = np.interp(np.nonzero(bad)[0], np.nonzero(~bad)[0], v[~bad])
B = median_filter(B, size=(9, 1), mode="nearest")    # reject single-frame glitches (hand passing)
res = []
for il, it, ir, ib in B:
    iw, ih = ir - il, ib - it                                   # screen layout measured relative to the image (ratios R)
    x0, x1 = il - R["l"] * iw, ir + R["r"] * iw; y0, y1 = it - R["t"] * ih, ib + R["b"] * ih
    res.append({"side": [[ir + 2, y0], [x1, y0], [x1, y1], [ir + 2, y1]], "mon": [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]})
json.dump(res, open(out, "w"))
tiles = []
for i in range(0, len(frames), 12):
    f = frames[i].copy(); r = res[i]
    cv2.polylines(f, [np.int32(r["side"])], True, (0, 255, 0), 2); cv2.polylines(f, [np.int32(r["mon"])], True, (255, 0, 255), 1)
    tiles.append(cv2.resize(f[: int(f.shape[0] * 0.75)], (160, int(160 * f.shape[0] * 0.75 / f.shape[1]))))
rows = [np.hstack(tiles[k:k + 10] + [np.zeros_like(tiles[0])] * (10 - len(tiles[k:k + 10]))) for k in range(0, len(tiles), 10)]
cv2.imwrite(prev, np.vstack(rows)); print(len(res), "frames")
