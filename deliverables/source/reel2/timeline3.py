"""Timeline for video 2 (horizontal source framed in a vertical layout)."""
import json

FPS, TOTAL = 60, 51.4
C = json.load(open("cuts.json"))
# BAND = horizontal shot in the middle (graphics above), SPLIT = shot lower (graphics zone 0-860),
# FULL = full-screen graphic + circle PiP, END = end card (speaker fades)
MODES = [
    (0.00, "BAND", 0.0, "geom"),
    (4.05, "SPLIT", 0.50, "geom"),
    (7.62, "BAND", 0.50, "geom"),
    (10.05, "FULL", 0.55, "geom"),
    (16.15, "BAND", 0.50, "dissolve"),
    (19.30, "FULL", 0.50, "geom"),
    (22.35, "SPLIT", 0.55, "geom"),
    (27.85, "BAND", 0.50, "geom"),
    (31.55, "FULL", 0.55, "geom"),
    (38.95, "BAND", 0.55, "geom"),
    (40.95, "SPLIT", 0.50, "geom"),
    (44.40, "FULL", 0.55, "geom"),
    (48.88, "END", 0.60, "dissolve"),
]
# alternate framing per cut (hides jump cuts), plus slow drift inside each segment
segs, acc = [], 0.0
for i, (a, b) in enumerate(C["keep"]):
    segs.append((round(acc, 3), round(acc + b - a, 3), 1.0 if i % 2 == 0 else 1.16))
    acc += b - a

SFX = [(t, "whoosh" if k == "geom" else "swell", -24 if k == "geom" else -27) for t, m, d, k in MODES[1:]]
SFX += [(0.35, "tick", -30), (0.6, "tick", -31), (0.85, "tick", -31), (2.3, "pop", -27),
        (5.33, "pop", -27), (6.12, "pop", -27), (7.06, "pop", -27), (8.0, "pulse", -27),
        (10.3, "pop", -28), (11.7, "ding", -28), (12.95, "ding", -28), (14.5, "swish", -26), (15.0, "pop", -27),
        (16.85, "thud", -24), (19.75, "thud", -23), (20.3, "pop", -28), (24.05, "swell", -28), (26.05, "ding", -28),
        (28.0, "pop", -29), (28.2, "pop", -30), (28.4, "pop", -30), (28.6, "pop", -30), (28.8, "pop", -30),
        (32.56, "ding", -28), (34.47, "pop", -27), (35.3, "pop", -27), (37.12, "pop", -27), (38.24, "pop", -27),
        (39.1, "whoosh_s", -26), (41.05, "tick", -27), (41.98, "tick", -27), (43.0, "tick", -27), (43.6, "tick", -27),
        (44.6, "swish", -27), (46.45, "thud", -25)]

CAP_Y = {"BAND": 1330, "SPLIT": 920, "FULL": 1420, "END": 1420}


def mode_at(t):
    m = MODES[0][1]
    for s, mm, d, k in MODES:
        if t >= s + d * 0.5:
            m = mm
    return m


json.dump({"fps": FPS, "total": TOTAL, "modes": MODES, "segs": segs, "sfx": SFX}, open("timeline.json", "w"), indent=1)
open("timeline.js", "w").write("window.TL=" + json.dumps({"total": TOTAL, "modes": MODES}) + ";")

# captions (ASS), same style as video 1
head = open("../captions_v2.ass", encoding="utf-8").read().split("[Events]")[0]
HL = "&HC0D02F&"


def ts(t):
    return f"{int(t // 3600)}:{int(t % 3600 // 60):02d}:{t % 60:05.2f}"


def ass_text(t):
    out, on = "", False
    for part in t.split("*"):
        if part:
            out += ("{\\c" + HL + "}" if on else "{\\c&HFFFFFF&}") + part
        on = not on
    return out


caps = C["caps"]
lines, srt = [], []
for i, (txt, s, e) in enumerate(caps):
    nxt = caps[i + 1][1] if i + 1 < len(caps) else TOTAL
    e = min(max(e + 0.25, s + 0.6), nxt)
    y = CAP_Y[mode_at(s + 0.45)]
    anim = "{\\an5\\pos(540,%d)\\fad(70,80)\\fscx86\\fscy86\\blur0.6\\t(0,150,0.6,\\fscx100\\fscy100)}" % y
    lines.append(f"Dialogue: 2,{ts(s)},{ts(e)},Cap,,0,0,0,,{anim}{ass_text(txt)}")
    ms = lambda x: f"{int(x//3600):02d}:{int(x//60)%60:02d}:{int(x)%60:02d},{int(round(x*1000))%1000:03d}"
    srt.append(f"{i+1}\n{ms(s)} --> {ms(e)}\n‏{txt.replace('*','')}‏\n")
open("captions.ass", "w", encoding="utf-8").write(head + "[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n" + "\n".join(lines) + "\n")
open("captions.srt", "w", encoding="utf-8").write("\n".join(srt))

ic = json.load(open("../mg/node_modules/@iconify-json/healthicons/icons.json"))
mi = json.load(open("../mg/node_modules/@iconify-json/medical-icon/icons.json"))
want = ["person", "stethoscope", "magnifying-glass", "pills-2", "heart", "ear", "hospital", "hospital-symbol",
        "geo-location", "doctor-male", "doctor-female", "xray", "test-tubes", "general-surgery",
        "accident-and-emergency", "stomach", "liver", "star-small"]
icons = {n: {"body": ic["icons"][n]["body"], "w": ic["icons"][n].get("width", ic.get("width", 48)),
             "h": ic["icons"][n].get("height", ic.get("height", 48))} for n in want}
icons["internal-medicine"] = {"body": mi["icons"]["internal-medicine"]["body"],
                              "w": mi["icons"]["internal-medicine"].get("width", mi.get("width", 24)),
                              "h": mi["icons"]["internal-medicine"].get("height", mi.get("height", 24))}
open("icons.js", "w").write("window.ICONS=" + json.dumps(icons) + ";")
print("caption y:", [(c[0][:14], CAP_Y[mode_at(c[1] + 0.45)]) for c in caps])
