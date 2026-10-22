import json
DUR=49.707
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
CAPS=[("سؤال يا دكتور",0.69,1.42),("هل *اللبن* بيهدّي *حموضة المعدة*",2.00,4.58),("زي ما سمعنا فعلًا؟",4.89,5.96),
("السؤال ده *كويس جدًا*",6.83,8.40),("وكتير للأسف عندهم المعلومة دي",8.40,10.60),("*مش مظبوطة*",10.60,11.46),
("إحنا *اللبن* لما بنشربه",12.32,13.50),("بيعمل في الأول *طبقة*",13.50,15.60),("عن طريقها *بيغلّف المعدة*",15.60,17.90),
("بس بعد كده نتيجة وجود",17.95,19.50),("*الدهون* و*الكالسيوم* اللي فيه",19.50,21.42),("بيزوّد من *إفراز الحمض* بتاع المعدة",22.00,24.52),
("فبيعمل لك ما يُسمّى بالـ",25.15,26.90),("*Rebound Hyperacidity*",26.90,28.41),("تلاقي بعدها بتحس *بحموضة جديدة*",29.20,31.42),
("*أكتر من الأول*",31.88,32.90),("*خلّي بالك* دايمًا",33.69,34.59),("*الحموضة المستمرة*",35.11,36.50),("ممكن تكون *إنذار* للمعدة",36.50,38.70),
("محتاج إن إنت *تكشف وتطمّن*",38.70,40.88),("عشان نعرف *السبب الرئيسي* ليها",41.43,42.87),("أنا *دكتور أبوبكر أحمد سند*",43.68,45.36),
("أخصائي *الباطنة*",45.74,46.50),("و*الجهاز الهضمي* و*الكبد* و*المناظير*",46.50,48.87)]
caps=[(t,round(to_edit(s),3),round(to_edit(e),3)) for t,s,e in CAPS]
json.dump({"keep":keep,"total":total,"caps":caps},open("cuts.json","w"),ensure_ascii=False,indent=1)
n=len(keep)
g=["[0:v]eq=contrast=1.04:saturation=1.06:gamma=0.99,hqdn3d=1.2:1.2:3:3,split=%d%s;"%(n,"".join(f"[v{i}]" for i in range(n))),
   "[0:a]asplit=%d%s;"%(n,"".join(f"[a{i}]" for i in range(n)))]
for i,(a,b) in enumerate(keep):
    g.append(f"[v{i}]trim=start={a}:end={b},setpts=PTS-STARTPTS,scale=1080:1920:flags=lanczos,setsar=1[vs{i}];")
    g.append(f"[a{i}]atrim=start={a}:end={b},asetpts=PTS-STARTPTS,afade=t=in:d=0.012,afade=t=out:st={max(0,b-a-0.02):.3f}:d=0.02[as{i}];")
g.append("".join(f"[vs{i}][as{i}]" for i in range(n))+f"concat=n={n}:v=1:a=1[vc][ac];")
g.append("[vc]unsharp=5:5:0.3:5:5:0.0,format=yuv420p[vout];")
g.append("[ac]highpass=f=75,afftdn=nr=10:nf=-50,equalizer=f=220:t=q:w=1.0:g=-1.5,equalizer=f=3200:t=q:w=1.2:g=2.0,acompressor=threshold=-30dB:ratio=2.5:attack=8:release=150:makeup=2[apre]")
open("graph_base.txt","w").write("\n".join(g))
print(f"segments={n} edited={total:.2f} removed={DUR-total:.2f}")
for c in caps: print(f"{c[1]:6.2f}-{c[2]:6.2f} {c[0]}")
