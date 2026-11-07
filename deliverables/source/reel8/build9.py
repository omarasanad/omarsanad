import json
DUR=122.17
sil=[tuple(map(float,l.split())) for l in open("sil.txt") if l.strip()]
PA,PB,MIN=0.13,0.10,0.40
keep,cur=[],0.25
for s,e in sil:
    if s<=0.01: cur=max(0,e-PB);continue
    if e>=DUR-1.0: keep.append((cur,min(DUR,s+0.35)));cur=None;continue
    if e-s<MIN: continue
    keep.append((cur,s+PA));cur=e-PB
if cur is not None: keep.append((cur,min(DUR,121.3)))
keep=[(round(a,3),round(b,3)) for a,b in keep]
import math
# real segment lengths after frame quantisation (fps=30 before trim; concat uses the longer of video/audio)
SEGD=[max((math.ceil(b*30-1e-9)-math.ceil(a*30-1e-9))/30,b-a) for a,b in keep]
def te(t):
    acc=0.0
    for (a,b),d in zip(keep,SEGD):
        if t<a: return acc
        if t<=b: return acc+(t-a)
        acc+=d
    return acc
total=sum(SEGD)
L=[("وأنا ليه كل ما بتعصّب… ألاقي قولوني اتنفخ؟","Why does my colon bloat every time I get upset?",0.62,3.84,1.0),
("أو لو عندي مشوار مهم… أو حتى إنترفيو في الشغل","Before something important… even a job interview?",4.32,7.97,1.05),
("ألاقي بطني بدأت تتنفخ… وأحس إنها زي البالونة","My belly starts to swell… like a balloon.",8.56,12.23,1.0),
("وتروح تكشف مرة… واتنين… وتلاتة","You see a doctor once, twice, three times…",12.98,15.43,1.05),
("ويقولك: إنت كويس…|دي اضطرابات قولون بس موجودة معاك","and they say: you're fine, it's just a bowel disorder.",15.89,19.39,1.15),
("الفترة اللي فاتت… ونتيجة تطور الأبحاث في الطب","In recent years, as medical research advanced,",20.41,23.28,1.0),
("اكتشفنا إن في مخ تاني…|موجود حوالين الجهاز الهضمي","we found a \"second brain\" around the digestive system,",24.04,27.78,1.05),
("اللي هو مسمّى بـ محور الأمعاء والمخ","known as the Gut–Brain Axis.",28.27,31.55,1.15),
("وده على اتصال ٢٤ ساعة بالمخ","It talks to the brain 24 hours a day",31.93,34.64,1.0),
("عن طريق سلك صغير… اسمه العصب الحائر","through a small \"wire\" called the vagus nerve,",35.33,39.44,1.05),
("يبدأ يدّي إشارات عصبية عكسية…|ما بين المخ والجهاز الهضمي","sending signals back and forth between brain and gut.",40.12,44.75,1.0),
("فلما يحصل معايا توتر…|بطني تتنفخ وأحس إنها زي البالونة","So when I'm stressed, my belly swells like a balloon.",45.59,50.92,1.05),
("خلّي بالك… إن هرمون السعادة|بيطلع من جهازك الهضمي","The \"happy hormone\" comes from your gut —",51.72,56.21,1.0),
("و٩٠٪ منه… بيتصنع هناك","90% of it is made there.",56.74,59.35,1.15),
("عشان كده طالما قولونك مضطرب…","So as long as your colon is upset,",59.97,63.06,1.0),
("هيكون مزاجك مش رايق","your mood will be off too.",63.49,66.01,1.05),
("والسر كله… إن إحنا لازم نبتدي نهدّي نفسنا","The key: we need to start calming ourselves down",66.54,70.29,1.15),
("ونظبط الأكل اللي بناكله","and fix what we eat —",71.01,73.24,1.0),
("اللي بيهيّج القولون…|لما بيتخمّر بطريقة معيّنة","food that irritates the colon as it ferments.",73.61,78.53,1.05),
("في حاجات لازم نبدأ نبعد عنها","Some foods we should start avoiding,",79.12,81.21,1.0),
("عشان دي من الحاجات اللي بتسبب هيجان للقولون","because they irritate the colon,",81.57,85.84,1.05),
("زي التوم… وزي البصل","like garlic… and onions,",86.35,88.34,1.15),
("وأحيانًا السكر اللي في اللبن","and sometimes the sugar in milk (lactose).",88.78,91.82,1.05),
("وكمان نتجنّب تمامًا…|إن أنا آكل وأنا متعصّب","Also, never eat while you're upset,",92.49,96.76,1.0),
("لأن ده بيزوّد الاضطرابات والكركبة عن الأول","because it makes the bloating and rumbling worse.",97.38,100.60,1.05),
("وأحيانًا بنحتاج نستخدم مضادات للتقلصات","Sometimes we need antispasmodics",101.44,105.26,1.0),
("وحاجات بتساعد على زيادة|البكتيريا النافعة في القولون","and things that boost the good bacteria in the colon.",105.73,109.80,1.05),
("أنا د. أبوبكر أحمد سند","I'm Dr. Abobakr Ahmed Sanad,",110.54,112.22,1.0),
("أخصائي الباطنة والجهاز الهضمي والكبد","Internal Medicine, GI & Liver Specialist.",112.61,115.27,1.0),
("وبقولك… خلّي بالك من نفسك","Take care of yourself,",115.86,118.25,1.05),
("لأن أساس العلاج الصح… هو التشخيص الصح","because the right treatment starts with the right diagnosis.",118.78,120.95,1.15)]
caps=[(a,e,round(te(s),3),round(te(t),3),z) for a,e,s,t,z in L]
STK=[("القولون العصبي · IBS",te(17.4)),("Gut–Brain Axis",te(29.2)),("العصب الحائر · Vagus nerve",te(38.4)),
     ("٩٠٪ من هرمون السعادة",te(57.3)),("التوم · البصل · سكر اللبن",te(86.6)),("البكتيريا النافعة",te(107.0)),("التشخيص الصح",te(119.0))]
json.dump({"keep":keep,"segd":SEGD,"total":total,"caps":caps,"stk":STK},open("cuts.json","w"),ensure_ascii=False,indent=1)
n=len(keep)
g=["[0:v]fps=30,split=%d%s;"%(n,"".join(f"[v{i}]" for i in range(n))),"[1:a]asplit=%d%s;"%(n,"".join(f"[a{i}]" for i in range(n)))]
for i,(a,b) in enumerate(keep):
    g.append(f"[v{i}]trim=start={a}:end={b},setpts=PTS-STARTPTS[vs{i}];")
    g.append(f"[a{i}]atrim=start={a}:end={b},asetpts=PTS-STARTPTS,afade=t=in:d=0.012,afade=t=out:st={max(0,b-a-0.02):.3f}:d=0.02[as{i}];")
g.append("".join(f"[vs{i}][as{i}]" for i in range(n))+f"concat=n={n}:v=1:a=1[vout][ac];")
g.append("[ac]highpass=f=80,afftdn=nr=14:nf=-62,equalizer=f=220:t=q:w=1.0:g=-1.5,equalizer=f=3200:t=q:w=1.2:g=2.5,acompressor=threshold=-34dB:ratio=2.5:attack=8:release=150:makeup=2[apre]")
open("graph_cut.txt","w").write("\n".join(g))
print(f"segments={n} edited={total:.2f}")
for c in caps: print(f"{c[2]:6.2f}-{c[3]:6.2f} z{c[4]} {c[0]}")
print([round(s[1],2) for s in STK])
