"""Composite v3: navy canvas + overlay + speaker (band / lower band / circle)."""
import json, os, subprocess, sys
from PIL import Image, ImageDraw
TL=json.load(open("timeline.json")); FPS,TOTAL=TL["fps"],TL["total"]; N=int(round(TOTAL*FPS))
W,H=1080,1920; BW,BH=1664,928
NAVY=(6,26,51); TEAL=(47,208,192)
FULLSRC=(659,95,330,330)
ST={"BAND":dict(dest=(40,640,1000,558),r=30),"SPLIT":dict(dest=(40,1000,1000,558),r=30),
    "FULL":dict(dest=(760,250,280,280),r=140),"END":dict(dest=(760,250,280,280),r=140)}
def eio(x): return 4*x**3 if x<.5 else 1-(-2*x+2)**3/2
def band_src(t):
    for a,b,z in TL["segs"]:
        if a<=t<b or (t>=b and b==TL["segs"][-1][1]):
            z=z*(1+0.03*min(1,(t-a)/max(.5,b-a))); break
    else: z=1.0
    cx,cy=830,470; w,h=BW/z,BH/z
    return (cx-cx/z,cy-cy/z,w,h)
def src_for(m,t): return FULLSRC if m in("FULL","END") else band_src(t)
def lerp4(a,b,p): return tuple(a[i]+(b[i]-a[i])*p for i in range(4))
def ops(t):
    M=TL["modes"]; i=max(k for k in range(len(M)) if M[k][0]<=t); s,m,d,kind=M[i]
    prev=M[i-1][1] if i>0 else m; p=eio(min(1,(t-s)/d)) if d>0 else 1.0
    A=dict(ST[prev],src=src_for(prev,t)); B=dict(ST[m],src=src_for(m,t))
    if kind=="dissolve" and m=="END": return [(A["src"],A["dest"],A["r"],1-p)]
    if kind=="dissolve" and p<1: return [(B["src"],B["dest"],B["r"],p),(A["src"],A["dest"],A["r"],1-p)]
    if p>=1: return [(B["src"],B["dest"],B["r"],1.0)]
    return [(lerp4(A["src"],B["src"],p),lerp4(A["dest"],B["dest"],p),A["r"]+(B["r"]-A["r"])*p,1.0)]
def rr(img,box,radius,**kw):
    d=ImageDraw.Draw(img); w=box[2]-box[0]; h=box[3]-box[1]; m=min(w,h)/2
    if radius>=m-2 and abs(w-h)<6: d.ellipse(box,**kw)
    else: d.rounded_rectangle(box,radius=max(0,min(radius,m-2)),**kw)
def draw(canvas,frame,op):
    src,dest,r,alpha=op
    if alpha<=0.002: return
    dx,dy,dw,dh=dest; dw,dh=max(2,int(round(dw))),max(2,int(round(dh)))
    sx,sy,sw,sh=src
    if sw/sh>dw/dh: nw=sh*dw/dh; sx+=(sw-nw)/2; sw=nw
    else: nh=sw*dh/dw; sy+=(sh-nh)/2; sh=nh
    img=frame.resize((dw,dh),Image.BICUBIC,box=(max(0,sx),max(0,sy),min(BW,sx+sw),min(BH,sy+sh)))
    # soft shadow
    sh_=Image.new("RGBA",(dw+60,dh+60),(0,0,0,0)); rr(sh_,(30,40,dw+30,dh+40),r+6,fill=(0,0,0,int(90*alpha)))
    canvas.alpha_composite(sh_,(int(dx)-30,int(dy)-30))
    mask=Image.new("L",(dw,dh),0); rr(mask,(0,0,dw-1,dh-1),r,fill=int(255*alpha))
    canvas.paste(img,(int(round(dx)),int(round(dy))),mask)
    ring=Image.new("RGBA",(dw+16,dh+16),(0,0,0,0))
    rr(ring,(3,3,dw+12,dh+12),r+5,outline=TEAL+(int(255*alpha*(0.35+0.65*min(1,(r-30)/110))),),width=5 if r<60 else 7)
    canvas.alpha_composite(ring,(int(round(dx))-8,int(round(dy))-8))
def main():
    a,b=int(sys.argv[1]),int(sys.argv[2])
    dec=subprocess.Popen(["ffmpeg","-v","error","-ss",f"{a/FPS:.4f}","-i","base.mkv","-f","rawvideo","-pix_fmt","rgb24","-"],stdout=subprocess.PIPE)
    out=sys.stdout.buffer; last=None
    for f in range(a,b):
        t=f/FPS; buf=dec.stdout.read(BW*BH*3)
        if len(buf)==BW*BH*3: last=Image.frombuffer("RGB",(BW,BH),buf).copy()
        c=Image.new("RGBA",(W,H),NAVY+(255,))
        ov=f"ov/f{f:05d}.png"
        if os.path.exists(ov): c.alpha_composite(Image.open(ov).convert("RGBA"))
        for op in ops(t): draw(c,last,op)
        out.write(c.convert("RGB").tobytes())
    dec.kill()
main()
