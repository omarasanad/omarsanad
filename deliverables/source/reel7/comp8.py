import numpy as np, cv2, sys, json, subprocess
from ai_edge_litert.interpreter import Interpreter
W,H=1080,1920; SW,SH=576,1024
it=Interpreter(model_path='../segm/selfie_multiclass_256x256.tflite',num_threads=1);it.allocate_tensors()
I0=it.get_input_details()[0]['index'];O0=it.get_output_details()[0]['index']
BG=cv2.cvtColor(cv2.imread('studio_bg.png'),cv2.COLOR_BGR2RGB).astype(np.float32)/255
yy,xx=np.mgrid[0:H,0:W].astype(np.float32)
def softmax(o):
    e=np.exp(o-o.max(-1,keepdims=True));return e/e.sum(-1,keepdims=True)
def seg_crop(img):
    x=cv2.resize(img,(256,256),interpolation=cv2.INTER_AREA).astype(np.float32)/255
    it.set_tensor(I0,x[None]);it.invoke();return softmax(it.get_tensor(O0)[0])
def segment(fr):  # fr: 1024x576 RGB uint8 -> fg prob at native res (two overlapping square crops)
    top=seg_crop(fr[0:576]);bot=seg_crop(fr[448:1024])
    T=cv2.resize(top,(SW,576),interpolation=cv2.INTER_LINEAR);B=cv2.resize(bot,(SW,576),interpolation=cv2.INTER_LINEAR)
    P=np.zeros((SH,SW,6),np.float32);P[:448]=T[:448];P[576:]=B[128:]
    r=(np.arange(128,dtype=np.float32)/127)[:,None,None];wB=0.5-0.5*np.cos(np.pi*r)
    P[448:576]=T[448:576]*(1-wB)+B[:128]*wB
    fg=1-P[...,0]
    lum=fr.astype(np.float32).mean(-1)
    spill=(lum>225)&((P[...,1]+P[...,5])>0.25)&(P[...,3]<0.3)
    fg[spill]=0
    b=(fg>0.5).astype(np.uint8);b=cv2.morphologyEx(b,cv2.MORPH_OPEN,np.ones((5,5),np.uint8))
    n,lab,st,_=cv2.connectedComponentsWithStats(b,8)
    if n>1:
        k=1+np.argmax(st[1:,cv2.CC_STAT_AREA]);keep=cv2.dilate((lab==k).astype(np.uint8),np.ones((9,9),np.uint8)).astype(np.float32)
        fg*=cv2.GaussianBlur(keep,(0,0),2)
    return fg
def refine(fr_big,fg):
    g=cv2.resize(fr_big,(540,960),interpolation=cv2.INTER_AREA).astype(np.float32)/255
    m=cv2.resize(fg,(540,960),interpolation=cv2.INTER_LINEAR)
    m=cv2.ximgproc.guidedFilter(g,m.astype(np.float32),8,2e-3)
    m=np.clip((m-0.25)/0.5,0,1)
    return cv2.resize(m,(W,H),interpolation=cv2.INTER_LINEAR)
def relight(s):
    K=(0.86+0.16*np.clip(1-(xx-120)/900,0,1))*(0.84+0.18*np.exp(-((yy-700)/560)**2))
    s=s*K[...,None]
    s=s*np.array([1.045,1.0,0.945])
    s=0.46+(s-0.46)*1.10
    l=s.mean(-1,keepdims=True);s=l+(s-l)*1.02
    return np.clip(s,0,1)
def place(img,a,S,cx=540):  # scale subject about bottom-centre
    M=np.float32([[S,0,cx-S*W/2],[0,S,H-S*H]])
    return cv2.warpAffine(img,M,(W,H),flags=cv2.INTER_LINEAR,borderMode=cv2.BORDER_REPLICATE),cv2.warpAffine(a,M,(W,H),flags=cv2.INTER_LINEAR,borderValue=0)
def compose(fr,prev_m,S=0.88,zoom=1.0,zc=(540,760),seed=0):
    big=cv2.resize(fr,(W,H),interpolation=cv2.INTER_LANCZOS4)
    big=cv2.fastNlMeansDenoisingColored(big,None,3,3,5,15) if False else big
    bl=cv2.GaussianBlur(big,(0,0),1.4);big=cv2.addWeighted(big,1.7,bl,-0.7,0)
    bl2=cv2.GaussianBlur(big,(0,0),4.0);big=cv2.addWeighted(big,1.15,bl2,-0.15,0)
    m=refine(big,segment(fr))
    if prev_m is not None: m=0.6*m+0.4*prev_m
    s=big.astype(np.float32)/255
    hard=(m>0.5).astype(np.uint8)
    core=cv2.erode(hard,np.ones((45,45),np.uint8)).astype(np.float32)
    num=cv2.GaussianBlur(s*core[...,None],(0,0),16);den=cv2.GaussianBlur(core,(0,0),16)[...,None]+1e-4
    inner=num/den
    band=(cv2.dilate(hard,np.ones((7,7),np.uint8))-cv2.erode(hard,np.ones((41,41),np.uint8))).astype(np.float32)
    band=cv2.GaussianBlur(band,(0,0),6)[...,None]
    bright=np.clip((s.mean(-1,keepdims=True)-inner.mean(-1,keepdims=True))*5,0,1)  # only where the edge is brighter than the body (window spill)
    k=band*bright*0.9
    s=s*(1-k)+inner*k
    ring=(cv2.dilate(hard,np.ones((9,9),np.uint8))-cv2.erode(hard,np.ones((31,31),np.uint8))).astype(np.float32)
    lum0=(big.astype(np.float32)/255).mean(-1);lin=inner.mean(-1)
    glow=np.clip((lum0-lin-0.06)*6,0,1)*ring
    m=m*(1-cv2.GaussianBlur(glow,(0,0),2))
    s=relight(s)
    sp,ap=place(s,m,S)
    ap=cv2.erode(ap,np.ones((7,7),np.uint8))
    a=cv2.GaussianBlur(ap,(0,0),1.4)[...,None]
    wrap=cv2.GaussianBlur(BG,(0,0),14)
    edge=np.clip(cv2.GaussianBlur(1-ap,(0,0),6)[...,None]*a,0,1)
    sp=sp*(1-edge*0.12)+wrap*edge*0.12                         # faint light wrap from the set
    out=BG*(1-a)+sp*a
    if zoom!=1.0:
        M=cv2.getRotationMatrix2D(zc,0,zoom);out=cv2.warpAffine(out,M,(W,H),flags=cv2.INTER_LINEAR,borderMode=cv2.BORDER_REFLECT)
    rng=np.random.default_rng(seed);out=out+rng.normal(0,0.007,(H,W,1)).astype(np.float32)
    out=np.clip(out,0,1)
    out[:127]=0;out[H-127:]=0
    return out,m
if __name__=='__main__':
    import glob
    for t in sys.argv[1:]:
        raw=subprocess.run(["ffmpeg","-v","error","-ss",t,"-i","main.mp4","-frames:v","1","-f","rawvideo","-pix_fmt","rgb24","-"],capture_output=True).stdout
        fr=np.frombuffer(raw,np.uint8).reshape(SH,SW,3)
        out,_=compose(fr,None)
        cv2.imwrite(f'cmp_{t}.png',cv2.cvtColor((out*255).astype(np.uint8),cv2.COLOR_RGB2BGR))
