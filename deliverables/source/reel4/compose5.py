"""Composite speaker base + overlay frames per the layout timeline; pipe to ffmpeg."""
import json, os, subprocess, sys
import numpy as np
from PIL import Image, ImageDraw

TL = json.load(open("timeline.json"))
FPS, TOTAL = TL["fps"], TL["total"]
N = int(round(TOTAL * FPS))
W, H = 1080, 1920
NAVY = (6, 26, 51)
TEAL = (47, 208, 192)

STATE = {
    "S":     dict(dest=(0, 0, 1080, 1920), src=(0, 0, 1080, 1920), r=0, a=1.0),
    "SPLIT": dict(dest=(0, 880, 1080, 1040), src=(0, 240, 1080, 1040), r=0, a=1.0),
    "FULL":  dict(dest=(760, 260, 280, 280), src=(230, 240, 620, 620), r=140, a=1.0),
}
STATE["END"] = dict(STATE["SPLIT"], a=0.0)
FACE = (540, 560)


def eio(x):
    return 4 * x ** 3 if x < .5 else 1 - (-2 * x + 2) ** 3 / 2


def segzoom(t):
    for a, b, z in TL["segs"]:
        if a <= t < b: return z
    return 1.0


def zoom_at(t):
    return segzoom(t) * _push(t)


def _push(t):
    for a, b, z0, z1 in TL["push"]:
        if a <= t <= b + 1.2:
            p = min(1, max(0, (t - a) / (b - a)))
            return z0 + (z1 - z0) * p
    return 1.0


def zoomed(src, z):
    x, y, w, h = src
    cx, cy = FACE
    return (cx - (cx - x) / z, cy - (cy - y) / z, w / z, h / z)


def lerp4(a, b, p):
    return tuple(a[i] + (b[i] - a[i]) * p for i in range(4))


def layout(t):
    """Return list of speaker draw ops: (src, dest, r, alpha, on_top)."""
    M = TL["modes"]
    i = max(k for k in range(len(M)) if M[k][0] <= t)
    s, m, d, kind = M[i]
    prev = M[i - 1][1] if i > 0 else m
    p = eio(min(1, (t - s) / d)) if d > 0 else 1.0
    z = zoom_at(t)

    def st(name):
        S = dict(STATE[name])
        if name == "S":
            S["src"] = zoomed(S["src"], z)
        return S
    A, B = st(prev), st(m)
    if p >= 1:
        A = B
    if kind == "dissolve" and m == "S" and p < 1:          # PiP fades out over full speaker
        return [(B["src"], B["dest"], 0, 1.0, False), (A["src"], A["dest"], A["r"], 1 - p, True)]
    if kind == "dissolve" and m == "END":                  # speaker fades as end card expands
        return [(A["src"], A["dest"], A["r"], 1 - p, prev == "FULL")]
    top = "FULL" in (prev, m) if p < 1 else m == "FULL"
    return [(lerp4(A["src"], B["src"], p), lerp4(A["dest"], B["dest"], p),
             A["r"] + (B["r"] - A["r"]) * p, A["a"] + (B["a"] - A["a"]) * p, top)]


def rr(img, box, radius, **kw):
    d = ImageDraw.Draw(img); w = box[2] - box[0]; h = box[3] - box[1]; m = min(w, h) / 2
    if radius >= m - 2 and abs(w - h) < 6: d.ellipse(box, **kw)
    else: d.rounded_rectangle(box, radius=max(0, min(radius, m - 2)), **kw)


def draw_speaker(canvas, frame, op):
    src, dest, r, alpha, _ = op
    if alpha <= 0.002:
        return
    dx, dy, dw, dh = dest
    dw, dh = max(2, int(round(dw))), max(2, int(round(dh)))
    sx, sy, sw, sh = src
    if sw / sh > dw / dh:                      # match aspect, keep centre
        nw = sh * dw / dh; sx += (sw - nw) / 2; sw = nw
    else:
        nh = sw * dh / dw; sy += (sh - nh) / 2; sh = nh
    box = (max(0, sx), max(0, sy), min(W, sx + sw), min(H, sy + sh))
    img = frame.resize((dw, dh), Image.BICUBIC, box=box)
    mask = Image.new("L", (dw, dh), int(255 * alpha))
    if r > 0.5:
        mask = Image.new("L", (dw, dh), 0)
        rr(mask, (0, 0, dw - 1, dh - 1), r, fill=int(255 * alpha))
    canvas.paste(img, (int(round(dx)), int(round(dy))), mask)
    if r > 4:                                  # teal ring around the PiP
        ring = Image.new("RGBA", (dw + 16, dh + 16), (0, 0, 0, 0))
        rr(ring, (3, 3, dw + 12, dh + 12), r + 5, outline=TEAL + (int(255 * alpha * min(1, r / 140)),), width=7)
        canvas.alpha_composite(ring, (int(round(dx)) - 8, int(round(dy)) - 8))


def main():
    a, b = (int(sys.argv[1]), int(sys.argv[2])) if len(sys.argv) > 2 else (0, N)
    dec = subprocess.Popen(["ffmpeg", "-v", "error", "-ss", f"{a / FPS:.4f}", "-i", "base.mkv",
                            "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE)
    out = sys.stdout.buffer
    last = None
    for f in range(a, b):
        t = f / FPS
        buf = dec.stdout.read(W * H * 3)
        if len(buf) == W * H * 3:
            last = Image.frombuffer("RGB", (W, H), buf).copy()
        frame = last
        canvas = Image.new("RGBA", (W, H), NAVY + (255,))
        ops = layout(t)
        for op in ops:
            if not op[4]:
                draw_speaker(canvas, frame, op)
        ov = f"ov/f{f:05d}.png"
        if os.path.exists(ov):
            canvas.alpha_composite(Image.open(ov).convert("RGBA"))
        for op in ops:
            if op[4]:
                draw_speaker(canvas, frame, op)
        out.write(canvas.convert("RGB").tobytes())
    dec.kill()


if __name__ == "__main__":
    main()
