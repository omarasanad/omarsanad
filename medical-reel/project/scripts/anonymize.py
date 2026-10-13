# Blur on-monitor patient/physician identifiers (tracked quad + manual keyframes for the push-in)
import cv2, numpy as np, json, sys
side=[d['side'] if isinstance(d,dict) else d for d in json.load(open(sys.argv[2]))]; fps=30
# NOTE: the tracked quad is used until 21.9 s; KF below are hand-placed keyframes for the camera push-in of THIS clip.
# For a new clip, re-check the blur visually and edit KF (source pixel coords, x0,y0,x1,y1).
KF=[(22.0,(345,10,400,130)),(22.5,(355,0,400,130)),(23.0,(372,0,400,125)),(23.5,(366,0,400,115)),
    (24.0,(342,5,400,108)),(24.5,(338,0,400,105)),(25.0,(322,0,400,82)),(25.5,(322,0,400,40)),
    (26.0,(345,0,400,30)),(26.5,(358,0,400,16))]
def rect_at(t):
    if t<KF[0][0] or t>KF[-1][0]: return None
    for (t0,a),(t1,b) in zip(KF,KF[1:]):
        if t0<=t<=t1:
            u=(t-t0)/(t1-t0); return [a[k]+(b[k]-a[k])*u for k in range(4)]
cap=cv2.VideoCapture(sys.argv[1]); w=None; i=0
while True:
    ok,f=cap.read()
    if not ok: break
    t=i/fps; m=np.zeros(f.shape[:2],np.uint8)
    if t<21.9:
        q=np.array(side[i],np.float32); c=q.mean(0); q=c+(q-c)*1.18
        cv2.fillConvexPoly(m,q.astype(np.int32),255)
    r=rect_at(t)
    if r: cv2.rectangle(m,(int(r[0])-4,int(r[1])-4),(int(r[2])+4,int(r[3])+6),255,-1)
    if m.any():
        sm=cv2.resize(cv2.resize(f,(f.shape[1]//7,f.shape[0]//7),interpolation=cv2.INTER_AREA),(f.shape[1],f.shape[0]),interpolation=cv2.INTER_NEAREST)
        sm=cv2.GaussianBlur(sm,(0,0),5)
        mm=cv2.GaussianBlur(m,(0,0),1.5)[...,None]/255.0
        f=(f*(1-mm)+sm*mm).astype(np.uint8)
    if w is None: w=cv2.VideoWriter(sys.argv[3],cv2.VideoWriter_fourcc(*'MJPG'),fps,(f.shape[1],f.shape[0]))
    w.write(f); i+=1
w.release(); print(i,"frames")
