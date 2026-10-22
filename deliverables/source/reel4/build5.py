import json
DUR=67.736
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
CAPS=[("سؤال بصراحة يا دكتور",0.82,1.86),("كتير مننا لما بيعمل *سونار*",2.72,4.94),("بيطلع عنده *دهون على الكبد*",5.74,7.32),
("والإجابة المعتادة",8.06,9.18),("عادي، المصريين كلهم عندهم دهون",9.62,11.68),("هل الكلام ده *صح ولا غلط*؟",12.32,14.36),
("للأسف الكلام ده *مش صح*",15.40,16.98),("لأن الدهون اللي على الكبد",17.66,19.30),("تعتبر *بداية المشكلة*",19.84,21.42),
("لو إنت ما اهتمّتش بيها",22.24,24.30),("على *المدى البعيد*",24.80,25.70),("ممكن تحصل معانا *مشاكل*",26.14,27.36),("إحنا في غنى عنها",27.66,28.24),
("*الكبد* عضو مهم جدًا في الجسم",29.06,31.36),("مسؤول عن أكتر من *500 عملية حيوية*",31.90,35.24),("لما بيحصل معاه *تراكم للدهون*",35.96,37.96),
("ممكن بعد فترة يحصل *التهاب على الكبد*",38.42,40.88),("اللي هو…",41.44,43.90),("*التهاب كبد دهني*",44.22,45.68),("ممكن في المدى البعيد يحصل معاه",45.68,48.40),
("*تليّف الكبد*",48.40,49.70),("و*مضاعفاته*",49.70,51.92),("فالدهون اللي على الكبد محتاجة",52.22,54.20),("إن أنا أبدأ *أتخلّص منها*",54.20,56.06),
("وعمل *الفحوصات الصحيحة*",56.40,57.92),("واتّباعها مع *تنظيم غذائي*",58.40,61.22),("ساعتها الأمور بتاعتك *تتحسّن*",61.88,63.68),("والدهون اللي على الكبد دي *بتروح*",64.02,66.22)]
caps=[(t,round(to_edit(s),3),round(to_edit(e),3)) for t,s,e in CAPS]
json.dump({"keep":keep,"total":total,"caps":caps},open("cuts.json","w"),ensure_ascii=False,indent=1)
n=len(keep)
g=["[0:v]fps=60,eq=contrast=1.05:saturation=1.06:gamma=0.99,hqdn3d=2:2:5:5,split=%d%s;"%(n,"".join(f"[v{i}]" for i in range(n))),
   "[0:a]asplit=%d%s;"%(n,"".join(f"[a{i}]" for i in range(n)))]
for i,(a,b) in enumerate(keep):
    g.append(f"[v{i}]trim=start={a}:end={b},setpts=PTS-STARTPTS,scale=1080:1920:flags=lanczos,setsar=1[vs{i}];")
    g.append(f"[a{i}]atrim=start={a}:end={b},asetpts=PTS-STARTPTS,afade=t=in:d=0.012,afade=t=out:st={max(0,b-a-0.02):.3f}:d=0.02[as{i}];")
g.append("".join(f"[vs{i}][as{i}]" for i in range(n))+f"concat=n={n}:v=1:a=1[vc][ac];")
g.append("[vc]unsharp=5:5:0.3:5:5:0.0,format=yuv420p[vout];")
g.append("[ac]highpass=f=75,afftdn=nr=12:nf=-46,equalizer=f=220:t=q:w=1.0:g=-1.5,equalizer=f=3200:t=q:w=1.2:g=2.0,acompressor=threshold=-30dB:ratio=2.5:attack=8:release=150:makeup=2[apre]")
open("graph_base.txt","w").write("\n".join(g))
print(f"segments={n} edited={total:.2f} removed={DUR-total:.2f}")
for c in caps: print(f"{c[1]:6.2f}-{c[2]:6.2f} {c[0]}")
