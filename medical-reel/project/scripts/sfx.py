"""Synthesized SFX bed from data/timeline.json cues -> audio/sfx.wav (no samples used)."""
import numpy as np, soundfile as sf, json, sys
from scipy.signal import butter, sosfilt
SR=48000; tl=json.load(open(sys.argv[1])); dur=tl["videoDur"]+tl["outroDur"]
N=int(dur*SR)+SR; L=np.zeros(N); R=np.zeros(N); rng=np.random.default_rng(3)
def sweep_noise(d,f0,f1,q=1.2):
    n=int(d*SR); x=rng.standard_normal(n); y=np.zeros(n); blk=480
    for i in range(0,n,blk):
        u=i/n; f=f0*(f1/f0)**u; sos=butter(2,[max(40,f/q/1.5),min(20000,f*q*1.5)],'band',fs=SR,output='sos')
        y[i:i+blk]=sosfilt(sos,x[i:i+blk+0])[:len(y[i:i+blk])]
    return y
def env(n,a,peak=.5):
    t=np.linspace(0,1,n); e=np.where(t<peak,(t/peak)**a,((1-t)/(1-peak))**1.6); return e
def whoosh(): d=.6; y=sweep_noise(d,300,3800); return y*env(len(y),2,.62)*0.9
def swish():  d=.3; y=sweep_noise(d,1500,6000); return y*env(len(y),1.5,.45)*0.6
def tick():
    n=int(.05*SR); t=np.arange(n)/SR; return np.sin(2*np.pi*1900*t)*np.exp(-t*90)*0.8
def pop():
    n=int(.12*SR); t=np.arange(n)/SR; f=520*np.exp(-t*14)+260; ph=2*np.pi*np.cumsum(f)/SR
    return np.sin(ph)*np.exp(-t*30)*np.minimum(1,t/.002)
def chime():
    n=int(1.6*SR); t=np.arange(n)/SR; y=np.zeros(n)
    for f,a,dl in ((880,1,0),(1318.5,.7,.06),(1760,.35,.12)):
        tt=np.clip(t-dl,0,None); y+=a*np.sin(2*np.pi*f*tt)*np.exp(-tt*3.2)*(t>=dl)*np.minimum(1,tt/.004)
    return y*0.35
GEN={"whoosh":whoosh,"swish":swish,"tick":tick,"pop":pop,"chime":chime}
for c in tl["sfx"]:
    y=GEN[c["type"]]()*c["gain"]; i=int(c["t"]*SR)
    if c["type"] in("whoosh","swish"): i=max(0,i-int(len(y)*.55))   # peak lands on the cue
    j=min(N,i+len(y)); pan=.5
    L[i:j]+=y[:j-i]*(1-pan)*1.4; R[i:j]+=y[:j-i]*pan*1.4
st=np.stack([L,R],1)[:int(dur*SR)]
sf.write(sys.argv[2],st.astype(np.float32),SR); print("sfx peak dB",20*np.log10(np.abs(st).max()))
