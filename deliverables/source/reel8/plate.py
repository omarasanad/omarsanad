import numpy as np,cv2,subprocess,sys
exec(open('matte11.py').read().split("\nif __name__")[0])
# sample every 15th frame of the cut (2 per second)
raw=subprocess.run(["ffmpeg","-v","error","-i","cut.mkv","-vf","select='not(mod(n\\,15))'","-vsync","0","-f","rawvideo","-pix_fmt","rgb24","-"],capture_output=True).stdout
F=np.frombuffer(raw,np.uint8).reshape(-1,SH,SW,3)
print("samples",len(F),flush=True)
P=np.stack([coarse(f) for f in F])
np.save('plate_samples_p.npy',P.astype(np.float16))
bgm=(P<0.15)
# erode the background mask so we never sample near the person
bgm=np.stack([cv2.erode(m.astype(np.uint8),np.ones((15,15),np.uint8))>0 for m in bgm])
cnt=bgm.sum(0)
Fm=np.where(bgm[...,None],F.astype(np.float32),np.nan)
plate=np.nanmedian(Fm,axis=0)
np.save('plate.npy',plate.astype(np.float32));np.save('plate_cnt.npy',cnt)
print("coverage (cnt>=3):",(cnt>=3).mean().round(3))
# stability: per-sample mean abs diff to plate over its own bg pixels
for i in range(0,len(F),10):
    m=bgm[i]&(cnt>=3)
    d=np.abs(F[i].astype(np.float32)-plate)[m].mean()
    print(i,round(float(d),2),flush=True)
vis=np.nan_to_num(plate,nan=255).astype(np.uint8)
cv2.imwrite('qa/plate.png',cv2.cvtColor(vis,cv2.COLOR_RGB2BGR));cv2.imwrite('qa/plate_cnt.png',np.clip(cnt*8,0,255).astype(np.uint8))
