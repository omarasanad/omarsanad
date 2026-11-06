"""Procedural studio backdrop matching the reference: warm brown wall, soft light pool and
diagonal light shafts from upper-left, warm glow at left edge, wooden shelf ladder on the right,
white boucle sofa arms at the bottom corners. Rendered at 1080x1920 (letterbox applied later)."""
import numpy as np, cv2
W,H=1080,1920
rng=np.random.default_rng(7)
y,x=np.mgrid[0:H,0:W].astype(np.float32)
def blur(a,s): return cv2.GaussianBlur(a,(0,0),s)
img=np.zeros((H,W,3),np.float32)
# wall base (linear-ish RGB 0..1)
base=np.array([0.215,0.150,0.110]);img[:]=base
img*= (0.62+0.38*np.exp(-((y-760)/700)**2))[...,None]
# plaster texture
tex=blur(rng.standard_normal((H,W)).astype(np.float32),3)*0.035+blur(rng.standard_normal((H,W)).astype(np.float32),18)*0.05
img*= (1+tex)[...,None]
# soft light pool upper-left/centre
pool=np.exp(-(((x-420)/520)**2+((y-560)/430)**2))
img+= pool[...,None]*np.array([0.19,0.125,0.075])
# diagonal shafts (top-left -> down-right)
ang=np.deg2rad(28);u=(x*np.cos(ang)-y*np.sin(ang))
shafts=np.zeros((H,W),np.float32)
for c,wid,a in [(-60,70,1.0),(110,55,.75),(250,80,.6)]:
    shafts+=a*np.exp(-((u-c)/wid)**2)
shafts=blur(shafts,22)*np.clip(1-(y/1500),0,1)**1.2*np.clip((x+200)/600,0,1)
img+= shafts[...,None]*np.array([0.13,0.09,0.055])
# warm orange glow / lit arch at the left edge
glow=np.exp(-((x-10)/120)**2)*np.exp(-((y-820)/520)**2)
img+= glow[...,None]*np.array([0.50,0.21,0.07])
# shelf ladder on the right (dark wood posts and rungs), slightly out of focus
shelf=np.zeros((H,W,3),np.float32);m=np.zeros((H,W),np.float32)
for px in (905,1052):
    m[:,px-16:px+16]=1
for ry in range(260,1700,250):
    m[ry-7:ry+7,905:1052]=1
wood=np.array([0.11,0.075,0.05])
hl=np.zeros((H,W),np.float32)
for px in (905,1052): hl[:,px-16:px-10]=1
for ry in range(260,1700,250): hl[ry-7:ry-3,905:1052]=1
m=blur(m,1.6);hl=blur(hl,1.8)
img=img*(1-m[...,None]*0.85)+m[...,None]*wood+hl[...,None]*np.array([0.10,0.07,0.045])*0.8
# right side falls into darkness
img*= (1-0.55*np.clip((x-700)/380,0,1)**1.3)[...,None]
# tall arched panel on the left, lit warm orange (as in the reference)
arch=np.zeros((H,W),np.float32)
ax0,ax1,atop=-40,170,330
inside=(x>ax0)&(x<ax1)&(y>atop+ (ax1-ax0)/2)
cx_,r_=(ax0+ax1)/2,(ax1-ax0)/2
cap=((x-cx_)**2+(y-(atop+r_))**2<r_**2)&(y<=atop+r_)
arch[inside|cap]=1
arch=blur(arch,7)
archcol=np.array([0.60,0.29,0.11])*(0.45+0.55*np.exp(-((y-700)/560)**2))[...,None]
img=img*(1-arch[...,None]*0.85)+archcol*arch[...,None]*0.85
edge=np.clip(blur(arch,1.5)-blur(arch,9),0,1)*1.6
img+=edge[...,None]*np.array([0.08,0.04,0.02])
# crisper light shafts with a little haze
sh2=np.zeros((H,W),np.float32)
for c,wid in [(-20,38),(150,30),(290,44)]:
    sh2+=np.exp(-((u-c)/wid)**4)
sh2=blur(sh2,6)*np.clip(1-(y/1350),0,1)**1.4*np.clip((x+100)/700,0,1)
img+=sh2[...,None]*np.array([0.11,0.075,0.045])
haze=blur(rng.standard_normal((H,W)).astype(np.float32),40)*0.06*np.clip(1-y/1400,0,1)
img*= (1+haze)[...,None]
# subtle vertical wall panel seams
for px in (330,640):
    img[:,px-1:px+1]*=0.93
# depth of field
img=np.dstack([blur(img[...,c],3.2) for c in range(3)])
# white boucle sofa arms at bottom corners
def arm(cx,cy,rx,ry,flip):
    d=((x-cx)/rx)**2+((y-cy)/ry)**2
    a=np.clip((1-d)*6,0,1)
    shade=np.clip(0.55+0.45*(1-(y-(cy-ry))/(2*ry)),0,1)*(0.85+0.15*((x-cx)/rx*(-1 if flip else 1)))
    bt=1+blur(rng.standard_normal((H,W)).astype(np.float32),1.2)*0.06
    col=np.array([0.60,0.56,0.50])*(shade*bt)[...,None]
    return a,col
for cx,flip in ((-40,False),(1120,True)):
    a,col=arm(cx,1960,250,330,flip)
    a=blur(a,2.0)
    img=img*(1-a[...,None])+col*a[...,None]
# vignette
v=1-0.35*(((x-W/2)/(W*0.75))**2+((y-H*0.45)/(H*0.7))**2)
img*=np.clip(v,0.35,1)[...,None]
out=np.clip(img,0,1)
cv2.imwrite('studio_bg.png',cv2.cvtColor((out*255).astype(np.uint8),cv2.COLOR_RGB2BGR))
print('ok',out.mean(0).mean(0))
