import json
DUR=58.858
sil=[tuple(map(float,l.split())) for l in open("sil42.txt") if l.strip()]
PA,PB,MIN=0.15,0.12,0.45
keep,cur=[],None
for s,e in sil:
    if s<=0.01: cur=max(0,e-PB); continue
    if e>=DUR-0.05: keep.append((cur,min(DUR,s+0.30))); cur=None; continue
    if e-s<MIN: continue
    keep.append((cur,s+PA)); cur=e-PB
if cur is not None: keep.append((cur,DUR))
keep=[(round(a,3),round(b,3)) for a,b in keep]
def to_edit(t):
    acc=0.0
    for a,b in keep:
        if t<a: return acc
        if t<=b: return acc+(t-a)
        acc+=b-a
    return acc
total=sum(b-a for a,b in keep)
CAPS=[("أكتر كلمة بسمعها من *العيانين*",1.51,3.46),("دكتور، إحنا بنبقى جايين *نكشف*",3.99,5.53),
("وإحنا بنبقى شايلين همّ *الكشف*",5.90,7.41),("و*التشخيص*",7.77,8.40),("و*العلاج*",8.71,9.15),
("فمن معرفتي، أكتر حاجة *بتريّح المريض*",10.26,12.42),("إن المكان اللي يدخله",13.31,14.52),("يبقى *متقدَّر* فيه",15.14,16.14),
("يبقى *كلمته مسموعة*",16.80,18.00),("ما يحسّش إنه *مجرد رقم*",18.35,19.85),("عشان كده *هدفي الأساسي*",20.77,22.39),
("إن أنا أبقى متواجد",22.97,23.94),("بعيادتي",24.60,25.17),("بـ*مركز النهضة*",25.48,26.44),("بـ*شبين القناطر*",27.08,27.74),
("هنا قدرنا نوفّر لكم",28.73,29.96),("كل *الرعاية الطبية المتكاملة*",30.32,32.04),("بدايتها من *الكشف الطبي*",32.78,34.34),
("تحت *نخبة من أمهر الدكاترة*",34.74,36.96),("اللي موجودين في شبين القناطر",36.96,38.16),("مرورًا",39.07,39.66),("بـ*التشخيص*",40.14,40.82),
("عن طريق",41.57,42.16),("*الإشاعات* و*التحاليل الطبية*",42.53,44.39),("نهايةً *بالعمليات والطوارئ*",45.04,47.23),
("أنا *دكتور أبوبكر أحمد سند*",48.02,49.73),("أخصائي *الباطنة*",50.33,51.26),("و*الجهاز الهضمي* و*الكبد* و*المناظير*",51.26,53.57),
("*مستنيكم* تشرّفونا",54.19,55.76),("في *مركز النهضة الطبي*",56.41,57.59),("في *شبين القناطر*",57.93,58.51)]
caps=[(t,round(to_edit(s),3),round(to_edit(e),3)) for t,s,e in CAPS]
json.dump({"keep":keep,"total":total,"caps":caps},open("cuts.json","w"),ensure_ascii=False,indent=1)
n=len(keep)
g=["[0:v]fps=60,lutyuv=u='clip(val+5,16,240)':v='clip(val-6,16,240)',eq=contrast=1.05:brightness=-0.005:saturation=1.06:gamma=0.98,hqdn3d=1.5:1.5:4:4,split=%d%s;"%(n,"".join(f"[v{i}]" for i in range(n))),
   "[0:a]asplit=%d%s;"%(n,"".join(f"[a{i}]" for i in range(n)))]
for i,(a,b) in enumerate(keep):
    g.append(f"[v{i}]trim=start={a}:end={b},setpts=PTS-STARTPTS,scale=1664:928:flags=lanczos+accurate_rnd,setsar=1[vs{i}];")
    g.append(f"[a{i}]atrim=start={a}:end={b},asetpts=PTS-STARTPTS,afade=t=in:d=0.012,afade=t=out:st={max(0,b-a-0.02):.3f}:d=0.02[as{i}];")
g.append("".join(f"[vs{i}][as{i}]" for i in range(n))+f"concat=n={n}:v=1:a=1[vc][ac];")
g.append("[vc]unsharp=5:5:0.4:5:5:0.0,format=yuv420p[vout];")
g.append("[ac]highpass=f=75,afftdn=nr=8:nf=-55,equalizer=f=220:t=q:w=1.0:g=-1.5,equalizer=f=3200:t=q:w=1.2:g=2.0,acompressor=threshold=-24dB:ratio=2.5:attack=8:release=150:makeup=2[apre]")
open("graph_base.txt","w").write("\n".join(g))
print(f"segments={n} edited={total:.2f} removed={DUR-total:.2f}")
for c in caps: print(f"{c[1]:6.2f}-{c[2]:6.2f} {c[0]}")
