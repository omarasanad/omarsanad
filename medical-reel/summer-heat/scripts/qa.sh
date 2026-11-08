#!/usr/bin/env bash
# QA for the delivery MP4: format, decode errors, black/frozen frames, loudness, caption timing, contact sheet.
#   scripts/qa.sh [out/summer_heat_reel.mp4]
set -uo pipefail
cd "$(dirname "$0")/.."
F="${1:-out/summer_heat_reel.mp4}"
echo "== format"
ffprobe -v error -show_entries stream=codec_name,profile,width,height,r_frame_rate,pix_fmt,color_space,color_transfer,color_primaries,sample_rate,channels,bit_rate:format=duration,size,bit_rate -of default=nw=1 "$F"
echo "== decode errors (none expected)"
ffmpeg -hide_banner -v error -i "$F" -f null - 2>&1 | head -5
echo "== black frames (none expected)"
ffmpeg -hide_banner -nostats -i "$F" -vf blackdetect=d=0.1:pix_th=0.08 -an -f null - 2>&1 | grep -o "black_start.*" | head -5
echo "== frozen stretches over 2 s (none expected: every shot moves)"
ffmpeg -hide_banner -nostats -i "$F" -vf freezedetect=n=0.0005:d=2 -an -f null - 2>&1 | grep -o "freeze_start.*\|freeze_duration.*" | head -10
echo "== loudness (target -14 LUFS integrated, true peak <= -1.5 dBTP)"
ffmpeg -hide_banner -nostats -i "$F" -vn -af ebur128=peak=true -f null - 2>&1 | grep -A12 Summary | grep -E "I:|LRA:|Peak:"
echo "== captions: count, first/last cue, monotonic and non-overlapping"
python3 - <<'EOF'
import re
s = open('out/captions.srt', encoding='utf-8').read()
cues = re.findall(r'(\d\d):(\d\d):(\d\d),(\d{3}) --> (\d\d):(\d\d):(\d\d),(\d{3})', s)
t = [(int(a)*3600+int(b)*60+int(c)+int(d)/1000, int(e)*3600+int(f)*60+int(g)+int(h)/1000) for a,b,c,d,e,f,g,h in cues]
bad = [i for i in range(len(t)) if t[i][1] <= t[i][0] or (i and t[i][0] < t[i-1][1])]
print(f'{len(t)} cues, {t[0][0]:.2f} -> {t[-1][1]:.2f} s, problems: {bad or "none"}')
EOF
echo "== contact sheet -> out/contact_sheet.jpg"
ffmpeg -hide_banner -v error -y -i "$F" -vf "fps=1/6.5,scale=216:384,tile=10x2:padding=6:color=black" -frames:v 1 -q:v 3 out/contact_sheet.jpg && echo ok
