import numpy as np, cv2, time, sys, subprocess
from ai_edge_litert.interpreter import Interpreter
from pymatting import estimate_alpha_cf, estimate_foreground_ml
SW,SH=576,1024
it=Interpreter(model_path='../segm/selfie_multiclass_256x256.tflite',num_threads=1);it.allocate_tensors()
I0=it.get_input_details()[0]['index'];O0=it.get_output_details()[0]['index']
def seg_crop(img):
    x=cv2.resize(img,(256,256),interpolation=cv2.INTER_AREA).astype(np.float32)/255
    it.set_tensor(I0,x[None]);it.invoke();o=it.get_tensor(O0)[0]
    e=np.exp(o-o.max(-1,keepdims=True));p=e/e.sum(-1,keepdims=True);return 1-p[...,0]
def coarse(fr):
    out=np.zeros((SH,SW),np.float32)
    for flip in (False,True):
        f=fr[:,::-1] if flip else fr
        T=cv2.resize(seg_crop(f[0:576]),(SW,576));B=cv2.resize(seg_crop(f[448:1024]),(SW,576))
        M=np.zeros((SH,SW),np.float32);M[:448]=T[:448];M[576:]=B[128:]
        r=(np.arange(128,dtype=np.float32)/127)[:,None];w=0.5-0.5*np.cos(np.pi*r);M[448:576]=T[448:576]*(1-w)+B[:128]*w
        out+=M[:,::-1] if flip else M
    return out/2
# clean plate of the (static) plaid backdrop, built from confidently-background pixels across the cut
_PL=np.load('plate.npy');_CNT=np.load('plate_cnt.npy')
PLATE_OK=(_CNT>=2)&np.isfinite(_PL).all(-1);PLATE=np.nan_to_num(_PL,nan=0.0).astype(np.float32)
def plate_bg(fr):
    """pixels whose 5x5 neighbourhood matches the clean plate -> certainly background"""
    D=cv2.blur(np.abs(fr.astype(np.float32)-PLATE).mean(-1),(5,5))
    m=(PLATE_OK&(D<10.0)).astype(np.uint8)
    return cv2.morphologyEx(m,cv2.MORPH_OPEN,np.ones((3,3),np.uint8))>0
def keep_main(m):
    b=(m>0.5).astype(np.uint8);n,lab,st,_=cv2.connectedComponentsWithStats(b,8)
    if n>1:
        k=1+np.argmax(st[1:,cv2.CC_STAT_AREA]);keep=cv2.dilate((lab==k).astype(np.uint8),np.ones((25,25),np.uint8)).astype(np.float32)
        m=m*keep
    return m
def trimap(p,motion=None,bgs=None):
    hard=(p>0.5).astype(np.uint8)
    fg=cv2.erode(hard,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(9,9)))
    bgz=cv2.dilate(hard,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(11,11)))
    if motion is not None:                      # widen the unknown band where things move (motion blur on hands)
        fg=fg&(motion<0.5);bgz=np.maximum(bgz,cv2.dilate((motion>0.5).astype(np.uint8),np.ones((9,9),np.uint8)))
    t=np.full(p.shape,0.5);t[fg>0]=1.0;t[bgz==0]=0.0
    if bgs is not None: t[bgs]=0.0             # matches the clean plate: backdrop showing through
    return t
def drop_islands(a,img):
    """remove small specks detached from the body (backdrop bits); skin-coloured specks (fingertips) are kept"""
    m=(a>0.05).astype(np.uint8);n,lab,st,_=cv2.connectedComponentsWithStats(m,8)
    if n<=2: return a
    k=1+np.argmax(st[1:,cv2.CC_STAT_AREA])
    for i in range(1,n):
        if i==k or st[i,cv2.CC_STAT_AREA]>=1500: continue
        sel=lab==i
        if (img[...,0][sel]-img[...,2][sel]).mean()*255>25: continue
        a[sel]=0
    return a
def matte(fr,p,motion=None):
    img=fr.astype(np.float64)/255
    t=trimap(p,motion,plate_bg(fr))
    a=estimate_alpha_cf(img,t,laplacian_kwargs={"epsilon":1e-6},cg_kwargs={"maxiter":400})
    a=np.clip(a,0,1)
    # suppress stray matte far from the person (plaid lines picked up as foreground)
    pd=cv2.dilate(p,np.ones((7,7),np.uint8));a=a*np.clip((pd-0.12)/0.3,0,1)
    # edge-aware smoothing of the matte (removes stair-stepping without blurring the edge)
    a=cv2.ximgproc.guidedFilter(img.astype(np.float32),a.astype(np.float32),2,1e-4).astype(np.float64)
    a=np.clip(a,0,1);a[a<0.02]=0;a[a>0.98]=1
    a=drop_islands(a,img)
    F=estimate_foreground_ml(img,a)
    return a.astype(np.float32),F.astype(np.float32),t
if __name__=='__main__':
    for ts in sys.argv[1:]:
        raw=subprocess.run(["ffmpeg","-v","error","-ss",ts,"-i","main.mp4","-frames:v","1","-f","rawvideo","-pix_fmt","rgb24","-"],capture_output=True).stdout
        fr=np.frombuffer(raw,np.uint8).reshape(SH,SW,3)
        t0=time.time();p=keep_main(coarse(fr));t1=time.time();a,F,t=matte(fr,p);t2=time.time()
        print(ts,f"seg {t1-t0:.2f}s matte {t2-t1:.2f}s",flush=True)
        np.save(f'a_{ts}.npy',a);np.save(f'F_{ts}.npy',F)
        cv2.imwrite(f'tri_{ts}.png',(t*255).astype(np.uint8))
        # checkerboard preview at native res
        bg=np.full_like(F,0.15);bg[...,0]=0.55;bg[...,2]=0.55
        comp=F*a[...,None]+bg*(1-a[...,None])
        cv2.imwrite(f'mt_{ts}.png',cv2.cvtColor((np.clip(comp,0,1)*255).astype(np.uint8),cv2.COLOR_RGB2BGR))
