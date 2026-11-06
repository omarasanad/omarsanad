import json
DUR=84.1
sil=[tuple(map(float,l.split())) for l in open("sil.txt") if l.strip()]
PA,PB,MIN=0.15,0.12,0.45
keep,cur=[],0.25
for s,e in sil:
    if s<=0.01: cur=max(0,e-PB);continue
    if e>=DUR-0.5: keep.append((cur,min(DUR,s+0.3)));cur=None;continue
    if e-s<MIN: continue
    keep.append((cur,s+PA));cur=e-PB
if cur is not None: keep.append((cur,min(DUR,83.2)))
keep=[(round(a,3),round(b,3)) for a,b in keep]
def te(t):
    acc=0.0
    for a,b in keep:
        if t<a: return acc
        if t<=b: return acc+(t-a)
        acc+=b-a
    return acc
total=sum(b-a for a,b in keep)
L=[("مين فينا ما بيجيلوش *حموضة*","Who among us hasn't had heartburn",0.375,2.0,1.0),
("أو بيحس بألم في *فم المعدة*؟","or felt pain at the top of the stomach?",2.84,5.42,1.0),
("وجرّب يهدّيها مرة واتنين وتلاتة","You try to calm it once, twice, three times",6.16,8.93,1.05),
("وأول ما يوقّفها… بترجع","and once you stop… it comes back.",9.46,12.58,1.0),
("كتير مننا فاكر إن الموضوع مجرد *لخبطة في المزاج*","Many of us think it's just our mood,",13.03,18.75,1.05),
("*استرس* بيتعرّض له، أو *أكل* بياكله","stress we're under, or something we ate",19.05,22.3,1.0),
("هو اللي بيزوّد المشكلة دي","that makes it worse.",22.48,24.29,1.0),
("الكلام ده كان ممكن يكون صح *لحد أوائل التمانينات*","That might have been true until the early '80s,",24.98,28.68,1.15),
("لما الدكاترة وقتها كانوا معتقدين","when doctors believed",29.24,31.71,1.0),
("إن السبب الرئيسي لزيادة *حموضة المعدة*","that the main cause of excess stomach acid",32.10,35.68,1.0),
("الاسترس اللي بنتعرّض له","was the stress we face",36.16,37.82,1.05),
("أو الأكل اللي مش صحي","or unhealthy food.",38.20,39.82,1.05),
("لأن اتنين من *العلماء الأستراليين*","Then two Australian scientists",40.61,43.07,1.0),
("بدأوا يدوّروا ورا المشكلة دي","started digging into this problem",43.58,46.32,1.0),
("لحد ما وصلوا *لضيف رخم* عايش معانا","until they found an annoying guest living with us.",46.84,51.41,1.05),
("وكتير مننا عارفينه… *جرثومة المعدة*","Many of us know it: H. pylori.",51.81,54.82,1.15),
("اللي بتقدر تعيش في *وسط حامضي شديد*","It survives in a highly acidic environment",55.35,58.69,1.0),
("وتعمل بيئة *متعادلة* تقدر تعيش فيها","and creates a neutral pocket to live in,",59.02,62.84,1.0),
("وتاكل في *جدار المعدة*","eating into the stomach lining,",63.40,65.0,1.05),
("لدرجة إنها ممكن تسبّب *قُرَح*","to the point it can cause ulcers.",65.0,67.02,1.05),
("العلاج *سهل وبسيط*","Treatment is easy and simple,",67.84,69.05,1.15),
("بس اكتشافها محتاج *متخصص*","but detecting it takes a specialist.",69.66,73.16,1.15),
("وبعد كده نقدر *نقضي عليها*","Then we can eliminate it",73.81,75.95,1.0),
("بـ*كورس مكثّف من المضادات الحيوية*","with an intensive course of antibiotics,",76.12,79.60,1.0),
("واللي بيريّحني *على المدى البعيد*","bringing relief in the long run.",80.16,82.93,1.05)]
caps=[(a,e,round(te(s),3),round(te(t),3),z) for a,e,s,t,z in L]
STK=[("أوائل الثمانينات",te(25.2)),("عالِمين أستراليين",te(40.8)),("جرثومة المعدة · H. pylori",te(52.6)),("قُرَح المعدة",te(65.3)),("كورس مضادات حيوية",te(76.4))]
json.dump({"keep":keep,"total":total,"caps":caps,"stk":STK},open("cuts.json","w"),ensure_ascii=False,indent=1)
n=len(keep)
g=["[0:v]fps=30,split=%d%s;"%(n,"".join(f"[v{i}]" for i in range(n))),"[1:a]asplit=%d%s;"%(n,"".join(f"[a{i}]" for i in range(n)))]
for i,(a,b) in enumerate(keep):
    g.append(f"[v{i}]trim=start={a}:end={b},setpts=PTS-STARTPTS[vs{i}];")
    g.append(f"[a{i}]atrim=start={a}:end={b},asetpts=PTS-STARTPTS,afade=t=in:d=0.012,afade=t=out:st={max(0,b-a-0.02):.3f}:d=0.02[as{i}];")
g.append("".join(f"[vs{i}][as{i}]" for i in range(n))+f"concat=n={n}:v=1:a=1[vout][ac];")
g.append("[ac]highpass=f=80,afftdn=nr=14:nf=-50,equalizer=f=220:t=q:w=1.0:g=-1.5,equalizer=f=3200:t=q:w=1.2:g=2.5,acompressor=threshold=-32dB:ratio=2.5:attack=8:release=150:makeup=2[apre]")
open("graph_cut.txt","w").write("\n".join(g))
print(f"segments={n} edited={total:.2f}");[print(f"{c[2]:6.2f}-{c[3]:6.2f} z{c[4]} {c[0]}") for c in caps[:4]]
