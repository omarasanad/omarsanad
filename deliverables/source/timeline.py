"""Shared timeline for the v2 edit (edited-timeline seconds).

Writes timeline.json (read by overlay.html and compose.py),
captions_v2.ass (captions positioned per layout) and icons.js.
"""
import json, re

FPS = 60
TOTAL = 53.3            # 50.82 s of speech + end card

# Layout keyframes: (start, mode, duration, kind)
# S = speaker full screen, SPLIT = graphic top / speaker bottom,
# FULL = full-screen graphic + speaker in a circle, END = end card.
MODES = [
    (0.00, "S", 0.0, "geom"),
    (1.50, "SPLIT", 0.50, "geom"),
    (4.65, "S", 0.50, "geom"),
    (6.25, "FULL", 0.55, "geom"),
    (8.62, "S", 0.50, "dissolve"),
    (12.00, "SPLIT", 0.50, "geom"),
    (15.70, "FULL", 0.55, "geom"),
    (20.85, "S", 0.55, "geom"),
    (25.85, "SPLIT", 0.50, "geom"),
    (29.35, "S", 0.50, "geom"),
    (33.35, "FULL", 0.55, "geom"),
    (37.40, "SPLIT", 0.50, "geom"),
    (41.66, "FULL", 0.50, "geom"),
    (47.10, "SPLIT", 0.50, "geom"),
    (50.55, "END", 0.60, "dissolve"),
]
# Slow push-ins while the speaker is full screen: (start, end, zoom_from, zoom_to)
PUSH = [(0.0, 1.5, 1.0, 1.035), (8.62, 12.0, 1.0, 1.04),
        (20.85, 25.85, 1.0, 1.03), (29.35, 33.35, 1.0, 1.07)]

# Sound effects: (time, kind, gain_db)
SFX = []
for t, m, d, k in MODES[1:]:
    SFX.append((t, "whoosh" if k == "geom" else "swell", -24 if k == "geom" else -27))
SFX += [(1.80, "pop", -26), (3.72, "whoosh_s", -27), (4.05, "pop", -27),
        (6.45, "pulse", -25), (10.30, "swish", -25), (12.45, "pop", -27),
        (15.95, "pop", -28), (16.15, "pop", -29), (16.35, "pop", -29), (17.35, "pulse", -26),
        (24.05, "whoosh_s", -26), (26.0, "tick", -27), (26.85, "tick", -27), (27.95, "tick", -27),
        (28.65, "tick", -27), (34.38, "thud", -22), (35.0, "pop", -27), (39.4, "whoosh_s", -28),
        (40.62, "ding", -26), (41.9, "pop", -27), (44.2, "pop", -27), (45.6, "pop", -27),
        (47.8, "swish", -28), (48.6, "ding", -24)]

PANEL = {"S": 0, "SPLIT": 880, "FULL": 1920, "END": 1920}
CAP_Y = {"S": 1300, "SPLIT": 800, "FULL": 1420, "END": 1420}


def mode_at(t):
    m = MODES[0][1]
    for s, mm, d, k in MODES:
        if t >= s + d * 0.5:
            m = mm
    return m


json.dump({"fps": FPS, "total": TOTAL, "modes": MODES, "push": PUSH, "sfx": SFX,
           "panel": PANEL}, open("timeline.json", "w"), indent=1)
open("timeline.js", "w").write("window.TL=" + json.dumps({"total": TOTAL, "modes": MODES, "panel": PANEL}) + ";")

# Captions: reuse v1 caption events; position by layout; drop old cards.
src = open("captions.ass", encoding="utf-8").read()
head, ev = src.split("[Events]")
head = head.replace("Style: Cap,Cairo XB,90,", "Style: Cap,Cairo XB,82,")
out = []
for line in ev.splitlines():
    if ",Cap," not in line:
        if line.startswith("Format"):
            out.append(line)
        continue
    p = line.split(",", 9)
    hms = p[1].split(":")
    t0 = int(hms[0]) * 3600 + int(hms[1]) * 60 + float(hms[2])
    y = CAP_Y[mode_at(t0 + 0.45)]
    p[9] = p[9].replace("\\pos(540,1300)", f"\\pos(540,{y})")
    out.append(",".join(p))
open("captions_v2.ass", "w", encoding="utf-8").write(head + "[Events]\n" + "\n".join(out) + "\n")

# Icons (MIT): Health Icons, Medical Icons
ic = json.load(open("mg/node_modules/@iconify-json/healthicons/icons.json"))
mi = json.load(open("mg/node_modules/@iconify-json/medical-icon/icons.json"))
want = ["stomach", "stomach-outline", "colon", "intestinal-pain", "hospital", "person", "sleepy",
        "nutrition", "walking", "alert-circle", "liver", "magnifying-glass", "ultrasound-scanner",
        "test-tubes", "xray", "pills-2", "geo-location", "doctor-male", "hospital-symbol"]
icons = {n: {"body": ic["icons"][n]["body"], "w": ic["icons"][n].get("width", ic.get("width", 48)),
             "h": ic["icons"][n].get("height", ic.get("height", 48))} for n in want}
icons["internal-medicine"] = {"body": mi["icons"]["internal-medicine"]["body"],
                              "w": mi["icons"]["internal-medicine"].get("width", mi.get("width", 24)),
                              "h": mi["icons"]["internal-medicine"].get("height", mi.get("height", 24))}
open("icons.js", "w").write("window.ICONS=" + json.dumps(icons) + ";")
print("modes", len(MODES), "sfx", len(SFX), "frames", int(TOTAL * FPS))
