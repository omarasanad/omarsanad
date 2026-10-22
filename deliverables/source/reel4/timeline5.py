import json
FPS,TOTAL=60,61.6
C=json.load(open("cuts.json"))
MODES=[(0.00,"S",0.0,"geom"),(1.30,"SPLIT",0.50,"geom"),(5.60,"S",0.50,"geom"),(13.70,"SPLIT",0.50,"geom"),
 (17.50,"S",0.50,"dissolve"),(23.45,"FULL",0.55,"geom"),(34.70,"S",0.50,"geom"),(37.40,"FULL",0.50,"geom"),
 (45.45,"SPLIT",0.55,"geom"),(54.50,"FULL",0.55,"geom"),(59.10,"END",0.60,"dissolve")]
segs,acc=[],0.0
for i,(a,b) in enumerate(C["keep"]):
    segs.append((round(acc,3),round(acc+b-a,3),1.0 if i%2==0 else 1.12)); acc+=b-a
PUSH=[(0.0,1.3,1.0,1.03),(5.6,13.7,1.0,1.05),(17.5,23.45,1.0,1.04),(34.7,37.4,1.0,1.04)]
SFX=[(t,"whoosh" if k=="geom" else "swell",-24 if k=="geom" else -27) for t,m,d,k in MODES[1:]]
SFX+=[(1.6,"pop",-27),(2.0,"swish",-29),(3.95,"ding",-28),(7.35,"whoosh_s",-28),(9.7,"tick",-27),(10.3,"tick",-27),(12.0,"thud",-22),
 (14.0,"pop",-27),(15.75,"pulse",-25),(17.65,"whoosh_s",-26),(23.7,"pop",-27),(24.2,"swell",-30),(26.2,"tick",-30),(27.5,"ding",-26),
 (29.85,"swish",-28),(30.2,"pop",-29),(32.1,"pulse",-25),(37.6,"pulse",-25),(41.8,"thud",-24),(43.1,"pop",-26),
 (47.6,"pop",-27),(49.8,"pop",-27),(51.6,"pop",-27),(54.7,"swell",-28),(56.8,"swish",-28),(57.4,"ding",-25)]
PANEL={"S":0,"SPLIT":880,"FULL":1920,"END":1920}
CAP_Y={"S":1300,"SPLIT":800,"FULL":1420,"END":1420}
def mode_at(t):
    m=MODES[0][1]
    for s,mm,d,k in MODES:
        if t>=s+d*0.5: m=mm
    return m
json.dump({"fps":FPS,"total":TOTAL,"modes":MODES,"push":PUSH,"segs":segs,"sfx":SFX,"panel":PANEL},open("timeline.json","w"),indent=1)
open("timeline.js","w").write("window.TL="+json.dumps({"total":TOTAL,"modes":MODES,"panel":PANEL})+";")
head=open("../captions_v2.ass",encoding="utf-8").read().split("[Events]")[0]
HL="&HC0D02F&"
def ts(t): return f"{int(t//3600)}:{int(t%3600//60):02d}:{t%60:05.2f}"
def ass_text(t):
    out,on="",False
    for part in t.split("*"):
        if part: out+=("{\\c"+HL+"}" if on else "{\\c&HFFFFFF&}")+part
        on=not on
    return out
caps=C["caps"];lines,srt=[],[]
ms=lambda x:f"{int(x//3600):02d}:{int(x//60)%60:02d}:{int(x)%60:02d},{int(round(x*1000))%1000:03d}"
for i,(txt,s,e) in enumerate(caps):
    nxt=caps[i+1][1] if i+1<len(caps) else TOTAL
    e=min(max(e+0.25,s+0.6),nxt); y=CAP_Y[mode_at(s+0.45)]
    anim="{\\an5\\pos(540,%d)\\fad(70,80)\\fscx86\\fscy86\\blur0.6\\t(0,150,0.6,\\fscx100\\fscy100)}"%y
    lines.append(f"Dialogue: 2,{ts(s)},{ts(e)},Cap,,0,0,0,,{anim}{ass_text(txt)}")
    srt.append(f"{i+1}\n{ms(s)} --> {ms(e)}\n‏{txt.replace('*','')}‏\n")
open("captions.ass","w",encoding="utf-8").write(head+"[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n"+"\n".join(lines)+"\n")
open("captions.srt","w",encoding="utf-8").write("\n".join(srt))
ic=json.load(open("../mg/node_modules/@iconify-json/healthicons/icons.json"))
mi=json.load(open("../mg/node_modules/@iconify-json/medical-icon/icons.json"))
want=["liver","ultrasound-scanner","alert-triangle","geo-location","nutrition","test-tubes","stomach"]
icons={n:{"body":ic["icons"][n]["body"],"w":ic["icons"][n].get("width",ic.get("width",48)),"h":ic["icons"][n].get("height",ic.get("height",48))} for n in want}
icons["internal-medicine"]={"body":mi["icons"]["internal-medicine"]["body"],"w":mi["icons"]["internal-medicine"].get("width",mi.get("width",24)),"h":mi["icons"]["internal-medicine"].get("height",mi.get("height",24))}
open("icons.js","w").write("window.ICONS="+json.dumps(icons)+";")
print([(c[0][:16],CAP_Y[mode_at(c[1]+0.45)]) for c in caps])
