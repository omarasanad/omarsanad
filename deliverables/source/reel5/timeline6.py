import json
FPS,TOTAL=30,79.6
C=json.load(open("cuts.json"))
MODES=[(0.00,"S",0.0,"geom"),(0.90,"SPLIT",0.50,"geom"),(12.70,"FULL",0.55,"geom"),(31.20,"SPLIT",0.55,"geom"),(40.55,"S",0.50,"dissolve"),
 (42.45,"FULL",0.55,"geom"),(49.30,"SPLIT",0.55,"geom"),(56.45,"S",0.50,"geom"),(68.70,"SPLIT",0.50,"geom"),(75.05,"END",0.60,"dissolve")]
segs,acc=[],0.0
for i,(a,b) in enumerate(C["keep"]):
    segs.append((round(acc,3),round(acc+b-a,3),1.0 if i%2==0 else 1.1)); acc+=b-a
PUSH=[(0.0,0.9,1.0,1.02),(40.55,42.45,1.0,1.03),(56.45,68.7,1.0,1.06)]
SFX=[(t,"whoosh" if k=="geom" else "swell",-24 if k=="geom" else -27) for t,m,d,k in MODES[1:]]
SFX+=[(1.2,"pop",-28),(1.7,"pop",-28),(4.1,"pop",-28),(9.1,"pop",-27),(13.0,"tick",-28),(13.4,"tick",-28),(13.8,"tick",-28),(14.2,"tick",-28),(14.6,"ding",-27),
 (17.8,"swish",-27),(20.5,"pop",-27),(22.25,"pop",-27),(24.8,"pulse",-26),(27.0,"swish",-28),(28.7,"pulse",-27),(31.6,"pop",-27),(34.6,"pop",-27),(36.8,"whoosh_s",-28),
 (42.9,"swish",-28),(43.6,"ding",-25),(45.7,"pulse",-25),(49.6,"pop",-28),(52.45,"ding",-26),(56.8,"thud",-25),(64.15,"tick",-26),(65.55,"tick",-26),(67.15,"ding",-26),
 (68.9,"whoosh_s",-26),(70.75,"tick",-27),(72.05,"tick",-27),(73.05,"tick",-27),(73.63,"tick",-27),(75.4,"swell",-27),(76.6,"pop",-27)]
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
want=["liver","ultrasound-scanner","alert-triangle","geo-location","stomach","person","pills-2","calendar","doctor-male","magnifying-glass","hospital"]
icons={n:{"body":ic["icons"][n]["body"],"w":ic["icons"][n].get("width",ic.get("width",48)),"h":ic["icons"][n].get("height",ic.get("height",48))} for n in want}
icons["internal-medicine"]={"body":mi["icons"]["internal-medicine"]["body"],"w":mi["icons"]["internal-medicine"].get("width",mi.get("width",24)),"h":mi["icons"]["internal-medicine"].get("height",mi.get("height",24))}
open("icons.js","w").write("window.ICONS="+json.dumps(icons)+";")
print([(c[0][:16],CAP_Y[mode_at(c[1]+0.45)]) for c in caps])
