"""Matte-based composite onto the client's background image.
coarse segmentation (2 crops + flip, averaged over neighbouring frames) -> trimap -> closed-form alpha
+ foreground colour estimation at native resolution. The doctor's pixels are only upscaled once and
lightly balanced to the room; no sharpening, smoothing or reconstruction."""
import numpy as np, cv2, sys, subprocess, os
exec(open('matte11.py').read().split("\nif __name__")[0])
W,H=1080,1920
BGPATH=os.environ.get('BG','bg9.png')
BG=cv2.cvtColor(cv2.imread(BGPATH),cv2.COLOR_BGR2RGB).astype(np.float32)/255
BGB=cv2.GaussianBlur(BG,(0,0),18)                     # room colour for light wrap
yy,xx=np.mgrid[0:H,0:W].astype(np.float32)
SUBJ=np.array([1.015,1.0,0.985],np.float32)
def grade_subject(F):
    F=F*SUBJ*0.97
    F=0.42+(F-0.42)*1.05
    F=F*(0.84+0.16*np.exp(-((yy-760)/640)**2))[...,None]   # gentle key-light falloff down the torso
    return np.clip(F,0,1)
def rim_light(a):
    gx=cv2.Sobel(a,cv2.CV_32F,1,0,ksize=5)
    left=np.clip(gx,0,None);left=left/(left.max()+1e-6)
    band=cv2.GaussianBlur(left,(0,0),5)*a
    return band*np.exp(-((xx-0)/750)**2)
def light_wrap(A):
    # thin band just inside the silhouette takes a little of the room's colour
    inner=np.clip(A-cv2.GaussianBlur(A,(0,0),4),0,1)*0+np.clip(1-cv2.GaussianBlur(A,(0,0),5),0,1)*A
    return np.clip(inner*1.6,0,1)
def finish(out,zoom,zc,seed):
    out=out*np.array([1.0,0.995,0.985],np.float32)
    out=0.45+(out-0.45)*1.04
    if zoom!=1.0:
        M=cv2.getRotationMatrix2D(zc,0,zoom);out=cv2.warpAffine(out,M,(W,H),flags=cv2.INTER_CUBIC,borderMode=cv2.BORDER_REFLECT)
    rng=np.random.default_rng(seed);out=out+rng.normal(0,0.0024,(H,W,1)).astype(np.float32)
    out=np.clip(out,0,1);out[:127]=0;out[H-127:]=0
    return out
def composite(fr,p,prev_a=None,prev_fr=None):
    motion=None
    if prev_fr is not None:
        d=np.abs(fr.astype(np.float32)-prev_fr.astype(np.float32)).mean(-1)/255
        motion=cv2.dilate((d>0.08).astype(np.float32),np.ones((5,5),np.uint8))
    a,F,_=matte(fr,p,motion)
    if prev_a is not None:                              # temporal smoothing only where the frame is static
        still=1-np.clip(d*12,0,1)
        k=0.35*cv2.GaussianBlur(still,(0,0),3)
        a=a*(1-k)+prev_a*k
    A=cv2.resize(a,(W,H),interpolation=cv2.INTER_CUBIC).clip(0,1);A=cv2.GaussianBlur(A,(0,0),0.7)
    Fb=cv2.resize(F,(W,H),interpolation=cv2.INTER_LANCZOS4).clip(0,1)
    Fb=grade_subject(Fb)
    Fb=np.clip(Fb+rim_light(A)[...,None]*np.array([0.22,0.11,0.04],np.float32),0,1)
    lw=light_wrap(A)[...,None]*0.22
    Fb=Fb*(1-lw)+BGB*lw
    out=Fb*A[...,None]+BG*(1-A[...,None])
    return out,a
if __name__=='__main__':
    for ts in sys.argv[1:]:
        raw=subprocess.run(["ffmpeg","-v","error","-ss",ts,"-i","src.mp4","-frames:v","1","-f","rawvideo","-pix_fmt","rgb24","-"],capture_output=True).stdout
        fr=np.frombuffer(raw,np.uint8).reshape(SH,SW,3)
        p=keep_main(coarse(fr));out,_=composite(fr,p)
        out=finish(out,1.0,(540,700),0)
        cv2.imwrite(f'c11_{os.path.basename(BGPATH)[:-4]}_{ts}.png',cv2.cvtColor((out*255).astype(np.uint8),cv2.COLOR_RGB2BGR))
