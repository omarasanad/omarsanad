"""Frame prep for phone-filmed endoscopy-room clips (batch of 2026-11-17).
- finds the round endoscope image on the monitor in every frame (colour + shape), smooths it over time
- privacy: blurs the whole monitor screen around that image (date/time, patient and physician fields, menus),
  keeping only the image itself sharp
- writes 1080x1920 JPEG frames + scope.json (per-frame endoscope image box in output pixels, or null)
Usage: python3 prep.py SRC.mp4 OUTDIR [pink|purple]
"""
import cv2, numpy as np, json, sys, os
from scipy.ndimage import median_filter
src, out = sys.argv[1], sys.argv[2]; mode = sys.argv[3] if len(sys.argv) > 3 else 'pink'
os.makedirs(os.path.join(out, 'frames'), exist_ok=True)
cap = cv2.VideoCapture(src); frames = []
while True:
    ok, f = cap.read()
    if not ok: break
    frames.append(f)
H, W = frames[0].shape[:2]
if mode.startswith('box:'):   # fixed screen box (source px): blur the whole screen, no image kept sharp
    x0, y0, x1, y1 = map(int, mode[4:].split(',')); S = 1080 / W; prev = []
    for i, f in enumerate(frames):
        g = f.copy(); reg = g[y0:y1, x0:x1]; g[y0:y1, x0:x1] = cv2.GaussianBlur(cv2.GaussianBlur(reg, (0, 0), 10), (0, 0), 10)
        o = cv2.resize(g, (1080, int(round(H * S))), interpolation=cv2.INTER_LANCZOS4); o = cv2.addWeighted(o, 1.35, cv2.GaussianBlur(o, (0, 0), 2.2), -.35, 0)
        cv2.imwrite(os.path.join(out, 'frames', f'{i + 1:04d}.jpg'), o, [cv2.IMWRITE_JPEG_QUALITY, 92])
        if i % 90 == 0: prev.append(cv2.resize(o, (216, int(H * S / 5))))
    json.dump({'n': len(frames), 'h': int(round(H * S)), 'scope': [None] * len(frames)}, open(os.path.join(out, 'scope.json'), 'w'))
    cv2.imwrite(os.path.join(out, 'check.jpg'), np.hstack(prev)); print(out, len(frames), 'frames, fixed box'); sys.exit()
boxes = []
for f in frames:
    top = f[: int(H * (.72 if mode == 'pink' else .34))].astype(int); b, g, r = top[..., 0], top[..., 1], top[..., 2]
    if mode == 'pink':   # endoscope mucosa: saturated red/orange/pink, brighter than skin
        m = (r > 150) & (r - g > 60) & (r - b > 50) & (g < 170)
    else:                # scope outside the body: violet/blue screen image
        m = (b > 120) & (b - g > 35) & (r > 70) & (b > r - 10)
    m = cv2.morphologyEx(m.astype(np.uint8) * 255, cv2.MORPH_CLOSE, np.ones((11, 11), np.uint8))
    n, lab, st, _ = cv2.connectedComponentsWithStats(m); best = None
    for k in range(1, n):
        x, y, w, h, a = st[k]
        if w > W * .07 and h > W * .06 and .55 < w / max(h, 1) < 1.9 and a > .45 * w * h and (best is None or a > st[best][4]): best = k
    boxes.append([np.nan] * 4 if best is None else [st[best][0], st[best][1], st[best][0] + st[best][2], st[best][1] + st[best][3]])
B = np.array(boxes, float)
# fill short gaps (a hand or the camera passing) and smooth jitter
idx = np.arange(len(B)); good = ~np.isnan(B[:, 0])
gap_ok = np.zeros(len(B), bool)
if good.any():
    for k in range(4): B[:, k] = np.interp(idx, idx[good], B[good, k])
    last = -999
    for i in range(len(B)):
        if good[i]: last = i
        gap_ok[i] = good[i] or (i - last <= 40 and any(good[i:i + 41]))
    for k in range(4): B[:, k] = median_filter(B[:, k], 7, mode='nearest')
S = 1080 / W; meta = []; prev = []
for i, f in enumerate(frames):
    g = f.copy(); box = None
    if gap_ok[i]:
        x0, y0, x1, y1 = B[i]; w, h = x1 - x0, y1 - y0
        # whole monitor screen around the image (generous), blurred; the image ellipse stays sharp
        X0, X1 = int(max(0, x0 - .62 * w)), int(min(W, x1 + .62 * w)); Y0, Y1 = int(max(0, y0 - .32 * h)), int(min(H, y1 + .32 * h))
        if X1 > X0 and Y1 > Y0:
            reg = g[Y0:Y1, X0:X1]; bl = cv2.GaussianBlur(reg, (0, 0), 9); bl = cv2.GaussianBlur(bl, (0, 0), 9)
            mask = np.ones(reg.shape[:2], np.uint8)
            cv2.ellipse(mask, (int((x0 + x1) / 2 - X0), int((y0 + y1) / 2 - Y0)), (int(w * .47), int(h * .47)), 0, 0, 360, 0, -1)
            g[Y0:Y1, X0:X1] = np.where(mask[..., None] == 1, bl, reg)
        box = [round(v * S, 1) for v in (x0, y0, x1, y1)]
    meta.append(box)
    o = cv2.resize(g, (1080, int(round(H * S))), interpolation=cv2.INTER_LANCZOS4)
    o = cv2.addWeighted(o, 1.35, cv2.GaussianBlur(o, (0, 0), 2.2), -.35, 0)   # mild sharpening after the upscale
    cv2.imwrite(os.path.join(out, 'frames', f'{i + 1:04d}.jpg'), o, [cv2.IMWRITE_JPEG_QUALITY, 92])
    if i % 90 == 0: prev.append(cv2.resize(o, (216, int(H * S / 5))))
json.dump({'n': len(frames), 'h': int(round(H * S)), 'scope': meta}, open(os.path.join(out, 'scope.json'), 'w'))
cv2.imwrite(os.path.join(out, 'check.jpg'), np.hstack(prev[:12]))
print(out, len(frames), 'frames; image found in', int(gap_ok.sum()), 'of', len(frames))
