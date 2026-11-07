import numpy as np, cv2, sys
from PIL import Image
src=np.asarray(Image.open('bgsrc.webp').convert('RGB'))[:1153].astype(np.float32)/255
H,W=1920,1080;TOP=127
def make(scale,head_x,name):
    x0=head_x-540/scale
    ih=int(round(src.shape[0]*scale))
    M=np.float32([[1/scale,0,x0],[0,1/scale,0]])
    img=cv2.warpAffine(src,M,(W,ih),flags=cv2.INTER_LANCZOS4|cv2.WARP_INVERSE_MAP,borderMode=cv2.BORDER_REFLECT)
    out=np.zeros((H,W,3),np.float32)
    y1=min(H,TOP+ih);out[TOP:y1]=img[:y1-TOP]
    out[:TOP]=img[0]                                  # under the top bar
    if y1<H:                                          # continue the lower wall panel down to the floor
        ref=img[ih-70:ih-8].mean(0)                     # per-column panel colour
        ref=cv2.GaussianBlur(ref[None],(0,0),sigmaX=6)[0]
        n=H-y1;ramp=np.linspace(0,1,n)[:,None,None]
        ext=ref[None]*(1-0.30*ramp**1.3)
        out[y1:]=ext
        # soften the seam
        k=24;wgt=np.linspace(0,1,k)[:,None,None]
        out[y1-k:y1]=img[ih-k:ih]*(1-wgt)+ext[0][None]*wgt
    cv2.imwrite(name,cv2.cvtColor((np.clip(out,0,1)*255).astype(np.uint8),cv2.COLOR_RGB2BGR))
if __name__=='__main__':
    make(float(sys.argv[1]),float(sys.argv[2]),sys.argv[3])
