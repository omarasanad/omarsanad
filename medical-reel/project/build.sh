#!/usr/bin/env bash
# One-command rebuild of the reel. Run from this folder:  ./build.sh [path/to/source.mp4]
# Steps 1-2 only run when build/frames is missing (or FORCE=1), because they are the slow, source-specific part.
set -euo pipefail
cd "$(dirname "$0")"
SRC="${1:-source/source.mp4}"
OUT=../output
mkdir -p build "$OUT"

if [ ! -d build/frames ] || [ "${FORCE:-0}" = 1 ]; then
  echo "== 1. privacy: track monitor + blur patient/physician identifiers"
  mkdir -p build/track
  python3 scripts/track_monitor.py "$SRC" build/track_full.json build/track
  python3 scripts/export_track.py build/track_full.json data/track.json
  python3 scripts/anonymize.py "$SRC" build/track_full.json build/private.avi   # see README: check blur on new clips
  echo "== 2. frames (2x Lanczos)"
  rm -rf build/frames; mkdir -p build/frames
  ffmpeg -v error -y -i build/private.avi -vf "scale=800:736:flags=lanczos,unsharp=5:5:0.6:5:5:0,eq=contrast=1.04:saturation=1.02" -q:v 2 build/frames/%04d.jpg
  echo "== 3. voice cleanup"
  ffmpeg -v error -y -i "$SRC" -ac 1 -ar 48000 build/a48.wav
  python3 scripts/clean_voice.py build/a48.wav build/dn.wav
  ffmpeg -v error -y -i build/dn.wav -af "highpass=f=85,lowpass=f=12500,$(cat data/beep_notch_filters.txt),equalizer=f=220:t=q:w=1.2:g=-2.5,equalizer=f=3200:t=q:w=1.0:g=2.5,equalizer=f=6500:t=q:w=2:g=-1.5,acompressor=threshold=-26dB:ratio=3:attack=8:release=120:makeup=4,alimiter=limit=0.89:level=false,loudnorm=I=-16:TP=-1.5:LRA=7" -ar 48000 -ac 1 audio/cleaned_voice.wav
fi

echo "== 4. music + sfx"
TOT=$(python3 -c "import json;d=json.load(open('data/timeline.json'));print(d['videoDur']+d['outroDur'])")
python3 scripts/music.py audio/music.wav "$TOT"
python3 scripts/sfx.py data/timeline.json audio/sfx.wav

echo "== 5. captions"
if grep -qv '^\s*#' data/transcript.txt 2>/dev/null && grep -q '[^[:space:]]' <(grep -v '^\s*#' data/transcript.txt); then
  python3 scripts/captions.py
else
  echo "   data/transcript.txt has no lines yet -> rendering without spoken-word captions"; echo '[]' > data/captions.json
fi

echo "== 6. render frames"
rm -rf build/render
node scripts/render.mjs --out build/render --workers 4

echo "== 7. audio mix"
scripts/mix.sh

echo "== 8. encode"
ffmpeg -v error -y -framerate 30 -i build/render/%05d.png -i build/mix.wav \
  -c:v libx264 -preset slow -crf 17 -pix_fmt yuv420p -profile:v high -level 4.1 -movflags +faststart \
  -c:a aac -b:a 256k -ar 48000 -shortest "$OUT/final_medical_reel.mp4"

echo "== 9. thumbnail, logo, voice"
node scripts/render.mjs --page thumbnail.html --preview 0 --out build/thumb && cp build/thumb/t_0.00.png "$OUT/thumbnail.png"
node scripts/render.mjs --page logo_export.html --preview 0 --w 1080 --h 1080 --transparent --out build/logo && cp build/logo/t_0.00.png "$OUT/medical_logo.png"
cp graphics/logo.svg "$OUT/medical_logo.svg"; cp graphics/logo_lockup.svg "$OUT/medical_logo_lockup_editable.svg"
cp audio/cleaned_voice.wav "$OUT/cleaned_voice.wav"
echo "done -> $OUT"
