"""Final audio for the Summer Heat reel: narration (primary) + music ducked under the voice + sound design,
loudness-normalised to -14 LUFS / -1.5 dBTP (two-pass loudnorm, linear gain).
Writes audio/voice.wav and audio/mix.wav (48 kHz stereo, video length).
Usage: python3 scripts/mix.py VOICEOVER.mp3      (run scripts/music.py and scripts/sfx.py first)
"""
import json, os, re, subprocess, sys
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'); os.chdir(ROOT)
caps = json.load(open('web/data/captions.json', encoding='utf-8')); DUR = round(caps[-1]['end'] + .7 + 4.3, 3)

def ff(*args): subprocess.run(['ffmpeg', '-hide_banner', '-v', 'error', '-y', *args], check=True)
def measure(path, chain=''):   # first loudnorm pass -> measured values
    r = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', path, '-af', (chain + ',' if chain else '') + 'loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-'],
                       capture_output=True, text=True)
    return json.loads(re.findall(r'\{[^{}]*\}', r.stderr)[-1])
def loudnorm(m, I, TP, LRA):
    return (f"loudnorm=I={I}:TP={TP}:LRA={LRA}:measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}"
            f":measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true")

# 1) narration: light clean-up (rumble cut, slight mud cut / presence lift, gentle compression), -16 LUFS, padded
pre = 'aresample=48000,highpass=f=70,equalizer=f=250:t=q:w=1.0:g=-1.5,equalizer=f=3500:t=q:w=1.2:g=1.5,acompressor=threshold=-30dB:ratio=2.2:attack=10:release=160:makeup=1'
m = measure(sys.argv[1], pre)
ff('-i', sys.argv[1], '-af', f'{pre},{loudnorm(m, -16, -2, 7)},aresample=48000,apad=whole_dur={DUR}', '-ac', '1', '-ar', '48000', '-t', str(DUR), 'audio/voice.wav')
# 2) premix: music -6 dB and ducked by the voice (sidechain), sound design -3 dB
graph = ('[0:a]volume=-6dB[m];[1:a]aformat=channel_layouts=stereo,asplit=2[v][k];'
         '[m][k]sidechaincompress=threshold=0.025:ratio=4:attack=80:release=650:makeup=1[md];'
         '[2:a]volume=-3dB[s];[v][md][s]amix=inputs=3:normalize=0:duration=first[out]')
ff('-i', 'audio/music.wav', '-i', 'audio/voice.wav', '-i', 'audio/sfx.wav', '-filter_complex', graph, '-map', '[out]', '-ar', '48000', '-c:a', 'pcm_f32le', 'audio/premix.wav')
# 3) final loudness: -14 LUFS integrated, -1.5 dBTP
m = measure('audio/premix.wav')
ff('-i', 'audio/premix.wav', '-af', loudnorm(m, -14, -1.5, 11) + ',aresample=48000', '-ar', '48000', '-c:a', 'pcm_s24le', '-t', str(DUR), 'audio/mix.wav')
r = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', 'audio/mix.wav', '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr
print('mix -> audio/mix.wav', DUR, 's |', ' '.join(re.findall(r'(I:\s+[-\d.]+ LUFS|LRA:\s+[\d.]+ LU|Peak:\s+[-\d.]+ dBFS)', r.split('Summary')[-1])))
