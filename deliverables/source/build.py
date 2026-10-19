"""Build the edited reel: cut list, video/audio filter graphs, captions."""
import json, subprocess, sys, os

SRC = "src.mp4"
DUR = 60.4367
OUT_FPS = 60

# ---------- 1. Cut list from silence detection (-42 dB, >=0.3 s) ----------
sil = [tuple(map(float, l.split())) for l in open("sil42.txt") if l.strip()]
PAD_AFTER, PAD_BEFORE, MIN_CUT = 0.15, 0.12, 0.45
keep, cur = [], None
for s, e in sil:
    if s <= 0.01:                     # leading silence
        cur = max(0.0, e - PAD_BEFORE); continue
    if e >= DUR - 0.05:               # trailing silence
        keep.append((cur, min(DUR, s + 0.35))); cur = None; continue
    if e - s < MIN_CUT:               # short natural pause: keep as is
        continue
    keep.append((cur, s + PAD_AFTER)); cur = e - PAD_BEFORE
if cur is not None:
    keep.append((cur, DUR))
keep = [(round(a, 3), round(b, 3)) for a, b in keep]

def to_edit(t):
    """Map a source timestamp to the edited timeline."""
    acc = 0.0
    for a, b in keep:
        if t < a: return acc
        if t <= b: return acc + (t - a)
        acc += b - a
    return acc

total = sum(b - a for a, b in keep)

# ---------- 2. Per-segment framing (alternating punch-in hides jump cuts) ----------
W, H = 464, 832
def crop_for(z):
    cw = int(round(W / z / 2)) * 2; ch = int(round(H / z / 2)) * 2
    # make exact 9:16
    ch = int(round(cw * 16 / 9 / 2)) * 2
    if ch > H: ch = H; cw = int(round(ch * 9 / 16 / 2)) * 2
    x = (W - cw) // 2
    y = int((H - ch) * 0.30)          # top-biased: keeps head in upper third
    return f"crop={cw}:{ch}:{x}:{y}"

zooms = [1.0 if i % 2 == 0 else 1.13 for i in range(len(keep))]
zooms[0] = 1.06                       # slightly tighter hook shot

# ---------- 3. Video + audio filter graph ----------
base = ("[0:v]fps=60,"
        "lutyuv=u='clip(val+3,16,240)':v='clip(val-4,16,240)',"   # neutralise warm/pink cast
        "eq=contrast=1.05:brightness=-0.01:saturation=1.12:gamma=0.98,"
        "hqdn3d=1.5:1.5:4:4,"                                         # light denoise before upscale
        f"split={len(keep)}" + "".join(f"[v{i}]" for i in range(len(keep))) + ";\n")
parts = [base, f"[0:a]asplit={len(keep)}" + "".join(f"[a{i}]" for i in range(len(keep))) + ";\n"]
for i, ((a, b), z) in enumerate(zip(keep, zooms)):
    parts.append(f"[v{i}]trim=start={a}:end={b},setpts=PTS-STARTPTS,{crop_for(z)},"
                 f"scale=1080:1920:flags=lanczos+accurate_rnd,setsar=1[vs{i}];\n")
    fo = max(0.0, b - a - 0.02)
    parts.append(f"[a{i}]atrim=start={a}:end={b},asetpts=PTS-STARTPTS,"
                 f"afade=t=in:d=0.012,afade=t=out:st={fo:.3f}:d=0.02[as{i}];\n")
parts.append("".join(f"[vs{i}][as{i}]" for i in range(len(keep))) +
             f"concat=n={len(keep)}:v=1:a=1[vc][ac];\n")
LS, LE = to_edit(30.05), to_edit(40.30)          # logo card while he introduces himself
parts.append("[vc]unsharp=5:5:0.45:5:5:0.0,"
             f"fade=t=out:st={total-0.35:.3f}:d=0.35[vu];\n")
parts.append(f"[1:v]format=rgba,fade=t=in:st={LS:.3f}:d=0.3:alpha=1,"
             f"fade=t=out:st={LE-0.3:.3f}:d=0.3:alpha=1[lg];\n")
parts.append(f"[vu][lg]overlay=x=90:y='215+24*max(0,1-(t-{LS:.3f})/0.3)':eval=frame:"
             f"enable='between(t,{LS:.3f},{LE:.3f})',"
             "ass=captions.ass:fontsdir=fonts,format=yuv420p[vout];\n")
parts.append("[ac]highpass=f=75,afftdn=nr=8:nf=-55,"
             "equalizer=f=220:t=q:w=1.0:g=-1.5,equalizer=f=3200:t=q:w=1.2:g=2.0,"
             "acompressor=threshold=-24dB:ratio=2.5:attack=8:release=150:makeup=2,"
             f"afade=t=out:st={total-0.35:.3f}:d=0.35[apre]")
open("graph_pre.txt", "w").write("".join(parts))

# ---------- 4. Captions ----------
# (text, source_start, source_end). *word* = highlighted keyword.
CAPS = [
    ("كام مرة قلت لنفسك", 1.21, 2.48),
    ("دي شوية *حموضة*", 2.97, 3.88),
    ("وهيروح لحاله", 3.88, 4.82),
    ("أو ده *قولون عصبي*؟", 5.76, 6.78),
    ("وغالبًا…", 6.78, 8.11),
    ("وكتير استحملت *الوجع*", 9.24, 10.68),
    ("اللي إنت فيه", 10.68, 11.33),
    ("الحقيقة", 12.33, 13.08),
    ("إنت *مش مضطر*", 13.08, 14.06),
    ("إن إنت تستحمل الوجع ده", 14.06, 15.42),
    ("حالات *كتيرة جدًا*", 16.53, 17.32),
    ("بشوفها في *العيادة*", 17.32, 18.42),
    ("بالنسبة لي جات", 18.88, 20.14),
    ("بعد ما الوجع بدأ", 20.82, 22.32),
    ("يأثر على *حياتها اليومية*", 22.32, 23.94),
    ("لدرجة إن هو بدأ", 24.46, 26.24),
    ("يعمل لها *مشاكل كتير* جدًا", 26.24, 28.99),
    ("أنا *دكتور أبوبكر أحمد سند*", 29.99, 31.68),
    ("أخصائي *الباطنة*", 32.21, 33.04),
    ("و*الجهاز الهضمي*", 33.04, 34.16),
    ("و*الكبد* و*المناظير*", 34.16, 35.43),
    ("وجاي لك أقول لك", 36.26, 37.17),
    ("*ما تستهونش* بالألم", 37.74, 39.28),
    ("اللي موجود معك", 39.28, 40.33),
    ("أنا موجود معك", 41.15, 42.20),
    ("في *مركز النهضة الطبي*", 42.56, 43.77),
    ("بـ*شبين القناطر*", 44.26, 45.15),
    ("عشان نبدأ واحدة واحدة", 45.61, 47.12),
    ("نوصل *للتشخيص الطبي الصح*", 47.69, 49.90),
    ("باستخدام *أحدث الأجهزة الطبية*", 50.36, 52.44),
    ("وعن طريق *التحاليل*", 53.08, 54.50),
    ("و*الإشاعات* المناسبة", 54.50, 55.90),
    ("عشان توصل", 56.47, 57.43),
    ("*للعلاج الصح*", 57.43, 59.62),
]
HL = "&HC0D02F&"   # brand teal #2FD0C0 (ASS is BGR)

def ts(t):
    t = max(0, t); h = int(t // 3600); m = int(t % 3600 // 60); s = t % 60
    return f"{h}:{m:02d}:{s:05.2f}"

def ts_srt(t):
    ms = int(round(t * 1000)); return f"{ms//3600000:02d}:{ms//60000%60:02d}:{ms//1000%60:02d},{ms%1000:03d}"

def ass_text(t):
    out, on = "", False
    for part in t.split("*"):
        if part:
            out += ("{\\c" + HL + "}" if on else "{\\c&HFFFFFF&}") + part
        on = not on
    return out

# timeline in edited time; extend each caption to the next one (max +0.6 s) so text doesn't flicker
ev = [(txt, to_edit(s), to_edit(e)) for txt, s, e in CAPS]
ev2 = []
for i, (txt, s, e) in enumerate(ev):
    nxt = ev[i + 1][1] if i + 1 < len(ev) else total
    e = min(max(e + 0.25, s + 0.6), nxt)
    ev2.append((txt, s, e))

def rrect(w, h, r):
    k = r * 0.45
    return (f"m {r} 0 l {w-r} 0 b {w-k} 0 {w} {k} {w} {r} l {w} {h-r} b {w} {h-k} {w-k} {h} {w-r} {h} "
            f"l {r} {h} b {k} {h} 0 {h-k} 0 {h-r} l 0 {r} b 0 {k} {k} 0 {r} 0")

hdr = """[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 0
ScaledBorderAndShadow: yes
YCbCr Matrix: TV.709

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Cap,Cairo XB,90,&H00FFFFFF,&H00FFFFFF,&H00111111,&H96000000,0,0,0,0,100,100,0,0,1,6,3,5,90,90,0,-1
Style: Card,Cairo XB,76,&H00FFFFFF,&H00FFFFFF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,0,0,5,60,60,0,-1
Style: CardSub,Cairo SB,46,&H00E6E6E6,&H00FFFFFF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,0,0,5,60,60,0,-1
Style: Box,Cairo SB,20,&H00000000,&H00000000,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,0,0,7,0,0,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
CAP_Y = 1300
lines = []
for txt, s, e in ev2:
    anim = ("{\\an5\\pos(540,%d)\\fad(70,80)\\fscx86\\fscy86\\blur0.6"
            "\\t(0,150,0.6,\\fscx100\\fscy100)}" % CAP_Y)
    lines.append(f"Dialogue: 2,{ts(s)},{ts(e)},Cap,,0,0,0,,{anim}{ass_text(txt)}")

def card(s, e, title, sub, w=880, h=210, y=380):
    x0 = 540 - w // 2; y0 = y - h // 2
    move = lambda yy: f"\\move(540,{yy+24},540,{yy},0,260)"
    fade = "\\fad(260,300)"
    out = [f"Dialogue: 0,{ts(s)},{ts(e)},Box,,0,0,0,,{{\\an7\\pos({x0},{y0})\\1c&H331A06&\\1a&H18&\\bord0\\shad0{fade}\\p1}}{rrect(w,h,30)}{{\\p0}}",
           f"Dialogue: 1,{ts(s)},{ts(e)},Box,,0,0,0,,{{\\an7\\pos({x0+w-14},{y0+30})\\1c{HL}\\1a&H00&\\bord0\\shad0{fade}\\p1}}{rrect(6,h-60,3)}{{\\p0}}",
           f"Dialogue: 2,{ts(s)},{ts(e)},Card,,0,0,0,,{{\\an5{move(y-30)}{fade}}}{title}"]
    if sub:
        out.append(f"Dialogue: 2,{ts(s+0.08)},{ts(e)},CardSub,,0,0,0,,{{\\an5{move(y+48)}{fade}}}{sub}")
    return out

lines += card(to_edit(41.20), to_edit(52.40), "مركز النهضة الطبي", "شبين القناطر", w=620)
open("captions.ass", "w", encoding="utf-8").write(hdr + "\n".join(lines) + "\n")

# SRT (plain text, RTL mark so players align punctuation correctly)
RLM = "‏"
with open("captions.srt", "w", encoding="utf-8") as f:
    for i, (txt, s, e) in enumerate(ev2, 1):
        f.write(f"{i}\n{ts_srt(s)} --> {ts_srt(e)}\n{RLM}{txt.replace('*','')}{RLM}\n\n")

json.dump({"keep": keep, "zooms": zooms, "total": total}, open("cuts.json", "w"), indent=1)
print(f"segments={len(keep)} edited={total:.2f}s (source {DUR:.2f}s, removed {DUR-total:.2f}s)")
for (a, b), z in zip(keep, zooms): print(f"  {a:6.2f}-{b:6.2f} ({b-a:4.2f}s) zoom {z}")
