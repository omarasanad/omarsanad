import sys,json,subprocess,numpy as np,cv2
exec(open('comp10.py').read().split("\nif __name__")[0])
C=json.load(open('cuts.json'));FPS=30;caps=C['caps']
KEEP=C['keep'];SEGS=[];acc=0.0
for a_,b_ in KEEP: SEGS.append((acc,acc+b_-a_));acc+=b_-a_
def zoom_at(t):
    z=1.0
    for ar,en,s,e,zz in caps:
        if t>=s-0.25: z=zz
    for s0,s1 in SEGS:
        if s0<=t<s1: z*=1+0.035*(t-s0)/max(1.0,s1-s0);break
    return z
a,b=int(sys.argv[1]),int(sys.argv[2]);start=max(0,a-1)
dec=subprocess.Popen(["ffmpeg","-v","error","-ss",f"{start/FPS:.4f}","-i","cut.mkv","-f","rawvideo","-pix_fmt","rgb24","-"],stdout=subprocess.PIPE)
def read():
    buf=dec.stdout.read(SW*SH*3)
    return None if len(buf)<SW*SH*3 else np.frombuffer(buf,np.uint8).reshape(SH,SW,3)
out=sys.stdout.buffer
from collections import deque
win=deque(maxlen=3)            # (index, frame, coarse prob) -- one frame look-behind and look-ahead
prev_a=None;prev_fr=None
def emit(k):
    global prev_a,prev_fr
    items=list(win);idx=[it[0] for it in items].index(k)
    lo,hi=max(0,idx-1),min(len(items)-1,idx+1)
    p=keep_main(np.mean([items[j][2] for j in range(lo,hi+1)],axis=0))
    fr=items[idx][1]
    img,a_=composite(fr,p,prev_a,prev_fr);prev_a,prev_fr=a_,fr
    if a<=k<b:
        img=finish(img,zoom_at(k/FPS),(540,700),k);out.write((img*255).astype(np.uint8).tobytes())
f=start;nxt=start
fr=read()
while fr is not None and f<=b:
    win.append((f,fr,coarse(fr)))
    if f-1>=nxt and len(win)>=2: emit(f-1);nxt=f
    f+=1;fr=read() if f<=b else None
while nxt<f: emit(nxt);nxt+=1
dec.kill()
