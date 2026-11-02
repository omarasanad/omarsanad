#!/usr/bin/env bash
# Encode the narration version: rendered frames + mix + corner watermark.
#   ./encode_vo.sh [logo.png]   (default: the round brand mark). The logo is fitted into a 96x96 badge, top-left,
#   fading in over the first 0.4 s and hidden during the outro. Swapping the logo needs only this step, not a re-render.
set -euo pipefail; cd "$(dirname "$0")"
LOGO="${1:-web/brand/brand_mark.png}"
OUTRO=$(python3 -c "import json;print([s for s in json.load(open('web/data/shots.json'))['shots'] if s[2]=='outro'][0][0])")
ffmpeg -v error -y -i "$LOGO" -vf "scale=96:96:force_original_aspect_ratio=decrease,pad=96:96:(ow-iw)/2:(oh-ih)/2:color=0x00000000,format=rgba" build/wm.png
ffmpeg -v error -y -framerate 30 -i renders/frames_vo/%05d.png -loop 1 -framerate 30 -i build/wm.png -i build/mix.wav \
  -filter_complex "[1:v]format=rgba,fade=t=in:st=0:d=0.4:alpha=1,colorchannelmixer=aa=0.95[w];[0:v][w]overlay=44:70:shortest=1:enable='lt(t,$OUTRO)'[v]" \
  -map "[v]" -map 2:a -c:v libx264 -preset slow -crf 17 -pix_fmt yuv420p -profile:v high -movflags +faststart -c:a aac -b:a 256k -shortest out/sibo_reel_elevenlabs.mp4
echo "done -> out/sibo_reel_elevenlabs.mp4"
