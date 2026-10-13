# Voice cleanup: spectral-gate denoise using a noise profile from the natural pauses.
import soundfile as sf, numpy as np, noisereduce as nr, sys
x,sr=sf.read(sys.argv[1])
pauses=[(1.45,1.85),(6.2,6.5),(15.85,16.2),(19.8,20.15),(21.9,22.35),(22.62,23.05)]
noise=np.concatenate([x[int(a*sr):int(b*sr)] for a,b in pauses])
y=nr.reduce_noise(y=x,sr=sr,y_noise=noise,stationary=True,prop_decrease=0.78,n_std_thresh_stationary=1.3,freq_mask_smooth_hz=400,time_mask_smooth_ms=80)
sf.write(sys.argv[2],y.astype(np.float32),sr,subtype="FLOAT")
