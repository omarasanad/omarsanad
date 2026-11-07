import json
C=json.load(open('cuts.json'))
def ts(t): return f"{int(t//3600)}:{int(t%3600//60):02d}:{t%60:05.2f}"
hdr=open('../v7/captions7.ass',encoding='utf-8').read().split('[Events]')[0]
L=[];caps=C['caps'];B=C['total']
for i,(ar,en,s,e,z) in enumerate(caps):
    nxt=caps[i+1][2] if i+1<len(caps) else B
    e2=min(max(e+0.2,s+0.7),nxt-0.03)
    L.append(f"Dialogue: 2,{ts(s)},{ts(e2)},Ar,,0,0,0,,"+"{\\an2\\pos(540,1210)\\fad(80,80)\\fscx94\\fscy94\\t(0,140,\\fscx100\\fscy100)}"+ar.replace('*','').replace('|','\\N'))
    L.append(f"Dialogue: 2,{ts(s)},{ts(e2)},En,,0,0,0,,"+"{\\an8\\pos(540,1236)\\fad(80,80)}"+en)
for txt,t in C['stk']:
    t1=min(t+2.6,B-0.15)
    L.append(f"Dialogue: 3,{ts(t)},{ts(t1)},Stk,,0,0,0,,"+"{\\an5\\pos(540,1520)\\frz4\\fad(90,160)\\fscx55\\fscy55\\t(0,200,\\fscx106\\fscy106)\\t(200,320,\\fscx100\\fscy100)}"+txt)
open('captions9.ass','w',encoding='utf-8').write(hdr+"[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n"+"\n".join(L)+"\n")
ms=lambda x:f"{int(x//3600):02d}:{int(x//60)%60:02d}:{int(x)%60:02d},{int(round(x*1000))%1000:03d}"
OFF=2.1
open('captions9_ar_en.srt','w',encoding='utf-8').write("\n".join(f"{i+1}\n{ms(s+OFF)} --> {ms(e+OFF)}\n‏{ar.replace('*','').replace('|',' ')}‏\n{en}\n" for i,(ar,en,s,e,z) in enumerate(caps)))
TOTAL=round(2.1+B+4.6-0.5,2)
sfx=[(OFF+x[1]-0.05,"pop",-30) for x in C['stk']]+[(0.3,"swell",-26),(0.95,"swish",-30),(1.95,"whoosh_s",-28),(OFF+B-0.6,"swell",-27),(OFF+B+0.6,"swish",-30)]
json.dump({"fps":30,"total":TOTAL,"body":B,"sfx":sfx},open('timeline.json','w'))
print(len(L),"total",TOTAL,"body",B)
