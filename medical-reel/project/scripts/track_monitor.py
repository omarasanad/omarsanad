import cv2, numpy as np, json, sys
cap=cv2.VideoCapture(sys.argv[1]); frames=[]
while True:
    ok,f=cap.read()
    if not ok: break
    frames.append(f)
H,W=frames[0].shape[:2]
# monitor quad (bezel) and sidebar-text quad in frame 0, source px (400x368)
mon=np.float32([[26,116],[214,116],[214,240],[26,240]])
side=np.float32([[162,124],[212,124],[212,174],[162,174]])
orb=cv2.ORB_create(3000)
def feats(img,quad):
    g=cv2.cvtColor(img,cv2.COLOR_BGR2GRAY); g=cv2.resize(g,None,fx=2,fy=2)
    m=np.zeros(g.shape,np.uint8); cv2.fillConvexPoly(m,(quad*2).astype(np.int32),255)
    k,d=orb.detectAndCompute(g,m); return k,d
bf=cv2.BFMatcher(cv2.NORM_HAMMING,crossCheck=True)
Hcum=np.eye(3); out=[]; cur_mon=mon.copy()
prev=frames[0]
for i,f in enumerate(frames):
    if i>0:
        k1,d1=feats(prev,np.clip(cur_mon,-2000,4000)); g2=cv2.resize(cv2.cvtColor(f,cv2.COLOR_BGR2GRAY),None,fx=2,fy=2)
        k2,d2=orb.detectAndCompute(g2,None)
        Hs=None
        if d1 is not None and d2 is not None and len(k1)>10:
            m=bf.match(d1,d2)
            if len(m)>12:
                p1=np.float32([k1[x.queryIdx].pt for x in m])/2; p2=np.float32([k2[x.trainIdx].pt for x in m])/2
                Hs,inl=cv2.findHomography(p1,p2,cv2.RANSAC,3.0)
                if Hs is not None and inl.sum()<10: Hs=None
        if Hs is None: Hs=np.eye(3); print("lost",i)
        Hcum=Hs@Hcum
        cur_mon=cv2.perspectiveTransform(mon[None],Hcum)[0]
    s=cv2.perspectiveTransform(side[None],Hcum)[0]
    out.append({"side":s.tolist(),"mon":cv2.perspectiveTransform(mon[None],Hcum)[0].tolist()}); prev=f
json.dump(out,open(sys.argv[2],"w"))
# preview
fps=30
for t in range(0,31,1):
    i=min(t*fps,len(frames)-1); f=frames[i].copy()
    cv2.polylines(f,[np.int32(out[i]["mon"])],True,(0,255,0),2)
    cv2.imwrite(f"{sys.argv[3]}/tr_{t:02d}.png",f)
