import sys,json,subprocess,numpy as np,cv2
exec(open('comp8.py').read().split("if __name__")[0])
C=json.load(open('cuts.json'));FPS=30
a,b=int(sys.argv[1]),int(sys.argv[2])
caps=C['caps']
KEEP=C['keep'];SEGS=[];acc=0.0
for a_,b_ in KEEP: SEGS.append((acc,acc+b_-a_));acc+=b_-a_
def zoom_at(t):
    z=1.0
    for ar,en,s,e,zz in caps:
        if t>=s-0.25: z=zz
    for s0,s1 in SEGS:                      # slow push-in within every shot
        if s0<=t<s1: z*=1+0.035*(t-s0)/max(1.0,s1-s0);break
    return z
dec=subprocess.Popen(["ffmpeg","-v","error","-ss",f"{a/FPS:.4f}","-i","cut.mkv","-f","rawvideo","-pix_fmt","rgb24","-"],stdout=subprocess.PIPE)
out=sys.stdout.buffer;prev=None
for f in range(a,b):
    buf=dec.stdout.read(SW*SH*3)
    if len(buf)<SW*SH*3: break
    fr=np.frombuffer(buf,np.uint8).reshape(SH,SW,3)
    img,prev=compose(fr,prev,S=1.0,zoom=zoom_at(f/FPS),zc=(540,700),seed=f)
    out.write((img*255).astype(np.uint8).tobytes())
dec.kill()
