#!/usr/bin/env bash
# Encode the rendered frames + final mix into the delivery MP4: 1080x1920 9:16, 30 fps, H.264 High (BT.709) + AAC 48 kHz.
#   scripts/encode.sh            (after: web/render.mjs -> renders/frames, scripts/mix.py -> audio/mix.wav)
# Frames are Chromium JPEGs (full-range BT.601); they are converted to limited-range BT.709 and tagged as such.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p out
ffmpeg -hide_banner -v error -stats -y -framerate 30 -i renders/frames/%05d.jpg -i audio/mix.wav \
  -vf "scale=in_range=full:in_color_matrix=bt601:out_range=tv:out_color_matrix=bt709,format=yuv420p" \
  -c:v libx264 -preset slow -crf 17 -profile:v high -level 4.1 -g 60 \
  -color_primaries bt709 -color_trc bt709 -colorspace bt709 \
  -c:a aac -b:a 256k -ar 48000 -movflags +faststart -shortest out/summer_heat_reel.mp4
ffprobe -v error -show_entries format=duration,size,bit_rate -of default=nw=1 out/summer_heat_reel.mp4
