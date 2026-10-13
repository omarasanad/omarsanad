"""Original ambient underscore, synthesized from scratch (no samples) -> project/audio/music.wav.
Calm, clean, slightly cinematic: soft pad + gentle pluck arpeggio + sub, D major, 84 BPM.
Usage: python3 music.py OUT.wav DURATION_SECONDS"""
import numpy as np, soundfile as sf, sys
from scipy.signal import fftconvolve, butter, sosfilt
SR=48000; out=sys.argv[1]; DUR=float(sys.argv[2])
rng=np.random.default_rng(7)
BPM=84; beat=60/BPM; bar=4*beat
N=int(DUR*SR)+SR; L=np.zeros(N); R=np.zeros(N)
def hz(m): return 440*2**((m-69)/12)
# chord cycle (MIDI): Dmaj9, Bm7(add11), Gmaj7#11, Asus2
chords=[[50,57,62,66,69,76],[47,54,62,66,69,73],[43,55,62,66,69,73],[45,52,61,64,69,71]]
def env_adsr(n,a,r):
    e=np.ones(n); ai=int(a*SR); ri=int(r*SR)
    e[:ai]=np.linspace(0,1,ai)**2; e[-ri:]*=np.linspace(1,0,ri)**1.5; return e
def pad_note(f,n):
    t=np.arange(n)/SR; s=np.zeros(n)
    for det in (-0.06,0.0,0.07):           # gently detuned voices
        ff=f*2**(det/12)
        for k,amp in ((1,1),(2,.35),(3,.16),(4,.07)):
            s+=amp*np.sin(2*np.pi*ff*k*t+rng.uniform(0,6.28))
    lfo=1+0.08*np.sin(2*np.pi*0.18*t+rng.uniform(0,6.28))
    return s*lfo
t_cursor=0.0; ci=0
while t_cursor<DUR:
    ch=chords[ci%4]; dur=2*bar; n=int((dur+1.2)*SR); s=np.zeros(n)
    for m in ch: s+=pad_note(hz(m),n)*(0.55 if m<55 else 0.32)
    s*=env_adsr(n,1.4,1.6)
    i=int(t_cursor*SR); j=min(N,i+n); L[i:j]+=s[:j-i]*0.9; R[i:j]+=s[:j-i]*0.9
    # sub
    nb=int(dur*SR); tb=np.arange(nb)/SR; sub=np.sin(2*np.pi*hz(ch[0]-12)*tb)*env_adsr(nb,0.6,0.8)*0.9
    j=min(N,i+nb); L[i:j]+=sub[:j-i]; R[i:j]+=sub[:j-i]
    # pluck arpeggio (8ths), enters after the first cycle start for a gentle build
    arp=[ch[2]+12,ch[3]+12,ch[4]+12,ch[3]+12,ch[5]+12,ch[4]+12,ch[3]+12,ch[2]+12]
    for k in range(int(dur/(beat/2))):
        tt=t_cursor+k*beat/2
        if tt<2.0 or tt>DUR-1: continue
        f=hz(arp[k%8]); nn=int(1.2*SR); tp=np.arange(nn)/SR
        p=(np.sin(2*np.pi*f*tp)+0.25*np.sin(2*np.pi*2*f*tp))*np.exp(-tp*5.5)*np.minimum(1,tp/0.004)
        vel=0.22*(1.0 if k%2==0 else 0.75); pan=0.5+0.35*np.sin(k*1.3)
        i2=int(tt*SR); j2=min(N,i2+nn); L[i2:j2]+=p[:j2-i2]*vel*(1-pan)*2; R[i2:j2]+=p[:j2-i2]*vel*pan*2
    t_cursor+=dur; ci+=1
# soft lowpass to keep it out of the voice's presence band
sos=butter(2,3800,'low',fs=SR,output='sos'); L=sosfilt(sos,L); R=sosfilt(sos,R)
sos=butter(2,45,'high',fs=SR,output='sos'); L=sosfilt(sos,L); R=sosfilt(sos,R)
# synthetic hall reverb (decorrelated noise IRs)
irn=int(2.8*SR); ti=np.arange(irn)/SR
irL=rng.standard_normal(irn)*np.exp(-ti*2.4); irR=rng.standard_normal(irn)*np.exp(-ti*2.4)
sos=butter(1,5000,'low',fs=SR,output='sos'); irL=sosfilt(sos,irL); irR=sosfilt(sos,irR)
wL=fftconvolve(L,irL)[:N]; wR=fftconvolve(R,irR)[:N]
L=L*0.7+wL*0.012; R=R*0.7+wR*0.012
n=int(DUR*SR); L=L[:n]; R=R[:n]
fi=int(1.5*SR); fo=int(2.5*SR); fade=np.ones(n); fade[:fi]=np.linspace(0,1,fi)**2; fade[-fo:]=np.linspace(1,0,fo)**1.5
st=np.stack([L*fade,R*fade],1); st/=np.abs(st).max()/0.7
sf.write(out,st.astype(np.float32),SR)
print("music",out,DUR)
