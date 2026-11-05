import json
DUR=76.79
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
CAPS=[("دكتور، بعد إذنك…",0.0,1.6),("أنا مؤخرًا اتشخّصت إن عندي *قولون عصبي*",1.6,4.0),("وباخد علاج… بس *الانتفاخات* لسه مستمرة",4.0,8.78),
("هل ده فعلًا صحيح؟",9.09,10.6),("ولا في *حاجة تانية* ممكن تكون عندي؟",10.6,12.84),("إحنا بقالنا أكتر من *4 شهور*",12.84,15.4),("والحالة دي عمّالة *تتردد* معايا",15.4,17.6),
("وكل شوية تيجيلي و*نغيّر العلاج*",17.7,20.18),("شوية ناخد *مسكنات*",20.66,22.4),("وشوية *مضادات للتقلصات والغازات*",22.4,24.69),("وفي الآخر *بترجع لنفس الشكوى*",25.16,27.12),
("الوضع يتحسن معاك يوم",27.59,29.03),("ويرجع يزيد معاك *عشر أيام* بعده",29.52,31.97),("إحنا محتاجين نعمل *سونار على البطن والحوض*",32.61,35.47),("عن طريق *دكتور متخصص*",35.95,37.81),
("عشان يقدر يبيّن لي *حاجات تانية*…",38.12,41.86),("زي ما اكتشفنا كده عندك",42.41,43.98),("إحنا لقينا *حصوات في المرارة*",44.3,47.26),("وهي اللي مسبّبة لك *المغص الشديد المتكرر*",47.26,51.08),
("ولو كنا سمعنا *النصيحة* من الأول",51.08,53.77),("وعملنا *السونار* من وقتها",54.1,55.64),("كان زمانّا…",55.64,58.3),("مستنيينكم في *عيادة الباطنة والجهاز الهضمي*",58.3,63.24),
("بـ*مركز النهضة الطبي* بشبين القناطر",63.24,65.76),("عشان *نسمعك صح*",65.76,67.18),("و*نشخّصك صح*",67.18,68.8),("وندّيك *العلاج المناسب*",68.8,70.12),
("أنا *دكتور أبوبكر أحمد سند*",70.54,72.38),("أخصائي *الباطنة*",72.38,73.68),("و*الجهاز الهضمي* و*الكبد* و*المناظير*",73.68,76.6)]
caps=[(t,round(to_edit(s),3),round(to_edit(e),3)) for t,s,e in CAPS]
json.dump({"keep":keep,"total":total,"caps":caps},open("cuts.json","w"),ensure_ascii=False,indent=1)
n=len(keep)
g=["[0:v]fps=30,format=rgb24,curves=all='0/0 0.25/0.31 0.5/0.60 0.75/0.82 1/1',colorbalance=rs=0.02:rm=0.06:gm=0.01:bm=-0.06:rh=0.015:bh=-0.02,eq=saturation=1.08,format=yuv420p,hqdn3d=1.6:1.6:4:4,split=%d%s;"%(n,"".join(f"[v{i}]" for i in range(n))),
   "[0:a]asplit=%d%s;"%(n,"".join(f"[a{i}]" for i in range(n)))]
for i,(a,b) in enumerate(keep):
    g.append(f"[v{i}]trim=start={a}:end={b},setpts=PTS-STARTPTS,scale=1080:1920:flags=lanczos,cas=0.4,setsar=1[vs{i}];")
    g.append(f"[a{i}]atrim=start={a}:end={b},asetpts=PTS-STARTPTS,afade=t=in:d=0.012,afade=t=out:st={max(0,b-a-0.02):.3f}:d=0.02[as{i}];")
g.append("".join(f"[vs{i}][as{i}]" for i in range(n))+f"concat=n={n}:v=1:a=1[vc][ac];")
g.append("[vc]unsharp=5:5:0.3:5:5:0.0,format=yuv420p[vout];")
g.append("[ac]highpass=f=75,afftdn=nr=12:nf=-46,equalizer=f=220:t=q:w=1.0:g=-1.5,equalizer=f=3200:t=q:w=1.2:g=2.0,acompressor=threshold=-30dB:ratio=2.5:attack=8:release=150:makeup=2[apre]")
open("graph_base.txt","w").write("\n".join(g))
print(f"segments={n} edited={total:.2f} removed={DUR-total:.2f}")
for c in caps: print(f"{c[1]:6.2f}-{c[2]:6.2f} {c[0]}")
