import json
DUR=75.07
sil=[tuple(map(float,l.split())) for l in open("sil.txt") if l.strip()]
PA,PB,MIN=0.15,0.12,0.45
keep,cur=[],0.25
for s,e in sil:
    if s<=0.01: cur=max(0,e-PB);continue
    if e>=DUR-0.5: keep.append((cur,min(DUR,s+0.3)));cur=None;continue
    if e-s<MIN: continue
    keep.append((cur,s+PA));cur=e-PB
if cur is not None: keep.append((cur,min(DUR,74.2)))
keep=[(round(a,3),round(b,3)) for a,b in keep]
def te(t):
    acc=0.0
    for a,b in keep:
        if t<a: return acc
        if t<=b: return acc+(t-a)
        acc+=b-a
    return acc
total=sum(b-a for a,b in keep)
L=[("تحس *بحموضة وارتجاع شديد* في المريء","You feel severe heartburn and reflux",0.79,3.19,1.0),
("غيّرت العلاج أكتر من مرة… ولفّيت ما بين الدكاترة","You've changed treatments, gone from doctor to doctor,",3.83,6.78,1.0),
("وكل ما بتاخد العلاج وتيجي توقّفه","and every time you stop the medicine,",7.49,9.72,1.05),
("ترجع تاني *من نقطة الصفر*","you're back to square one.",10.02,11.95,1.05),
("تعرف إن الموضوع ممكن يكون *بعيد تمامًا عن الحمض*؟","Did you know it may have nothing to do with acid?",12.70,15.91,1.15),
("وإن في *ضيف رخم* هو اللي عامل لك المشكلة","And that an annoying guest is causing the problem?",16.54,20.07,1.0),
("لحد *أوائل التمانينات*","Until the early '80s,",20.51,22.35,1.0),
("الدكاترة كانوا معتقدين","doctors believed",22.90,24.30,1.0),
("إن زيادة الحمض في المعدة","that excess stomach acid",24.38,27.48,1.05),
("السبب الرئيسي لها ممكن يكون *الأكل اللي مش صحي*","was mainly caused by unhealthy food",28.01,32.09,1.0),
("أو *التوتر والضغط* بتاع الشغل","or stress and work pressure,",32.72,34.68,1.0),
("لحد ما اتنين من *العلماء الأستراليين*","until two Australian scientists",35.17,37.80,1.05),
("بدأوا يدوّروا على المشكلة","started looking into the problem",38.06,40.18,1.0),
("ووصلوا لضيف رخم موجود معانا","and found an annoying guest living with us,",40.76,43.27,1.0),
("واللي كلنا عارفينه… *جرثومة المعدة*","one we all know: H. pylori.",43.74,46.19,1.15),
("جرثومة المعدة بتعيش في طبقة من طبقات المعدة","H. pylori lives in a layer of the stomach lining",47.02,50.25,1.0),
("وتحمي نفسها","and protects itself,",50.75,51.94,1.05),
("وتعيش في *الوسط الحامضي الشديد*","surviving in a highly acidic environment",52.36,54.69,1.0),
("عن طريق *تظبيط البيئة المحيطة* بيها","by adjusting the environment around it.",55.15,57.53,1.0),
("تبدأ تستقر في *جدار المعدة*","It settles into the stomach wall,",58.04,59.96,1.05),
("تعمل لك *التهابات*… وأحيانًا *قُرحة في المعدة*","causing inflammation… and sometimes a stomach ulcer.",60.41,63.76,1.05),
("علاجها *سهل وبسيط*","Its treatment is easy and simple,",64.34,66.23,1.15),
("بس الأهم… لازم *التشخيص الصح والدقيق*","but first you need an accurate diagnosis",66.53,70.09,1.15),
("عشان نبدأ العلاج *بشكل مظبوط*","so we can start the right treatment.",70.54,73.78,1.0)]
caps=[(a,e,round(te(s),3),round(te(t),3),z) for a,e,s,t,z in L]
STK=[("أوائل الثمانينات",te(20.7)),("عالِمين أستراليين",te(35.4)),("جرثومة المعدة · H. pylori",te(44.5)),("قُرحة المعدة",te(61.6)),("التشخيص الدقيق",te(67.6))]
json.dump({"keep":keep,"total":total,"caps":caps,"stk":STK},open("cuts.json","w"),ensure_ascii=False,indent=1)
n=len(keep)
g=["[0:v]fps=30,split=%d%s;"%(n,"".join(f"[v{i}]" for i in range(n))),"[1:a]asplit=%d%s;"%(n,"".join(f"[a{i}]" for i in range(n)))]
for i,(a,b) in enumerate(keep):
    g.append(f"[v{i}]trim=start={a}:end={b},setpts=PTS-STARTPTS[vs{i}];")
    g.append(f"[a{i}]atrim=start={a}:end={b},asetpts=PTS-STARTPTS,afade=t=in:d=0.012,afade=t=out:st={max(0,b-a-0.02):.3f}:d=0.02[as{i}];")
g.append("".join(f"[vs{i}][as{i}]" for i in range(n))+f"concat=n={n}:v=1:a=1[vout][ac];")
g.append("[ac]highpass=f=80,afftdn=nr=14:nf=-60,equalizer=f=220:t=q:w=1.0:g=-1.5,equalizer=f=3200:t=q:w=1.2:g=2.5,acompressor=threshold=-32dB:ratio=2.5:attack=8:release=150:makeup=2[apre]")
open("graph_cut.txt","w").write("\n".join(g))
print(f"segments={n} edited={total:.2f}");[print(f"{c[2]:6.2f}-{c[3]:6.2f} z{c[4]} {c[0]}") for c in caps[:4]]
