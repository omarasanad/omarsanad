#!/usr/bin/env bash
# Final SIBO reel once the doctor's direct-to-camera recording exists.
#   ./build_final.sh path/to/doctor_recording.mp4
# Steps: 1) frames of the recording (vertical 1080x1920) -> web/media/doc
#        2) cleaned voice (same chain as the series)
#        3) re-time: edit web/data/transcript.txt timings to the real speech (draft with
#           ../project/scripts/transcribe_sherpa.py), regenerate captions, and update SHOTS in web/reel.html
#        4) render frames, mix voice + ducked music + sfx, encode.
set -euo pipefail
cd "$(dirname "$0")"; SRC="$1"; R=../project
mkdir -p web/media/doc build out
ffmpeg -v error -y -i "$SRC" -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30" -q:v 2 web/media/doc/%05d.jpg
echo '{"frames":"media/doc/%05d.jpg","fps":30,"offset":0}' > web/data/doc.json
ffmpeg -v error -y -i "$SRC" -ac 1 -ar 48000 build/a48.wav
python3 $R/scripts/clean_voice.py build/a48.wav build/dn.wav "${PAUSES:-[[0,0.4]]}"   # set PAUSES to 2-3 silent stretches of the recording
ffmpeg -v error -y -i build/dn.wav -af "highpass=f=85,lowpass=f=12500,equalizer=f=220:t=q:w=1.2:g=-2.5,equalizer=f=3200:t=q:w=1.0:g=2.5,acompressor=threshold=-26dB:ratio=3:attack=8:release=120:makeup=4,alimiter=limit=0.89:level=false,loudnorm=I=-16:TP=-1.5:LRA=7" -ar 48000 -ac 1 build/cleaned_voice.wav
( cd $R && DATA=../sibo/web/data OUT=../sibo/out python3 scripts/captions.py )
echo "== check timings in web/data/transcript.txt and SHOTS in web/reel.html before continuing (Ctrl-C to stop)"; read -r _
DUR=$(python3 -c "import re;s=open('web/reel.html').read();print(re.search(r'DURATION = ([0-9.]+)',s).group(1))")
( cd web && node render.mjs --page reel.html --dur "$DUR" --out ../build/frames --workers 4 )
python3 $R/scripts/music.py build/music.wav "$DUR"; python3 $R/scripts/sfx.py web/data/timeline_audio.json build/sfx.wav
ffmpeg -v error -y -i build/cleaned_voice.wav -af "apad=whole_dur=$DUR,aformat=channel_layouts=stereo" -ar 48000 build/voice_st.wav
ffmpeg -v error -y -i build/music.wav -i build/voice_st.wav -i build/sfx.wav -filter_complex "[0:a]volume=-9dB[m];[1:a]asplit=2[v][k];[m][k]sidechaincompress=threshold=0.02:ratio=5:attack=60:release=700[md];[2:a]volume=-6dB[s];[v][md][s]amix=inputs=3:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=9" -ar 48000 build/mix.wav
ffmpeg -v error -y -framerate 30 -i build/frames/%05d.png -i build/mix.wav -c:v libx264 -preset slow -crf 17 -pix_fmt yuv420p -movflags +faststart -c:a aac -b:a 256k -shortest out/sibo_final_reel.mp4
echo "done -> out/sibo_final_reel.mp4"
