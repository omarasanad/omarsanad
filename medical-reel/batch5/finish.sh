#!/usr/bin/env bash
# Mix (voice + ducked music, -14 LUFS two-pass) and encode one clip:  ./finish.sh N OUTNAME
set -euo pipefail
cd "$(dirname "$0")"; v=$1; D=build/v$v; mkdir -p out
TOT=$(python3 -c "import soundfile as sf;print(round(sf.info('$D/music.wav').duration,3))")
ffmpeg -v error -y -i $D/voice.wav -af "apad=whole_dur=$TOT,aformat=channel_layouts=stereo" -ar 48000 $D/voice_st.wav
ffmpeg -v error -y -i $D/music.wav -i $D/voice_st.wav -filter_complex "[0:a]volume=-8dB[m];[1:a]asplit=2[v][k];[m][k]sidechaincompress=threshold=0.02:ratio=5:attack=60:release=700[md];[v][md]amix=inputs=2:normalize=0[o]" -map "[o]" -ar 48000 $D/pre.wav
M=$(ffmpeg -hide_banner -nostats -i $D/pre.wav -af loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json -f null - 2>&1 | python3 -c "import sys,re,json;d=json.loads(re.findall(r'\{[^{}]*\}',sys.stdin.read())[-1]);print(f\"measured_I={d['input_i']}:measured_TP={d['input_tp']}:measured_LRA={d['input_lra']}:measured_thresh={d['input_thresh']}:offset={d['target_offset']}\")")
ffmpeg -v error -y -i $D/pre.wav -af "loudnorm=I=-14:TP=-1.5:LRA=11:$M:linear=true,aresample=48000" -ar 48000 $D/mix.wav
ffmpeg -v error -y -framerate 30 -i $D/render/%05d.png -i $D/mix.wav -c:v libx264 -preset slow -crf 19 -pix_fmt yuv420p -profile:v high -level 4.1 -colorspace bt709 -color_primaries bt709 -color_trc bt709 -c:a aac -b:a 256k -ar 48000 -movflags +faststart -shortest out/$2.mp4
ffprobe -v error -show_entries format=duration,size -of csv=p=0 out/$2.mp4
