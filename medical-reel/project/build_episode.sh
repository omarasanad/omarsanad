#!/usr/bin/env bash
# Build one episode of the series:  ./build_episode.sh ep02
#   needs: source/<ep>.mp4 and episodes/<ep>/{config,timeline,settings}.json + transcript.txt
#   writes: build/<ep>/... and ../output/<ep>/{final_medical_reel.mp4,captions.srt,thumbnail.png,cleaned_voice.wav}
# Steps 1-3 (tracking, blur, frames, voice) run only when build/<ep>/frames is missing or FORCE=1.
set -euo pipefail
cd "$(dirname "$0")"
EP="$1"; E="episodes/$EP"; B="build/$EP"; OUT="../output/$EP"; SRC="source/$EP.mp4"
mkdir -p "$B" "$OUT"
J(){ python3 -c "import json,sys;d=json.load(open('$E/settings.json'));print(json.dumps(d$1) if not isinstance(d$1,str) else d$1)"; }
IFS=, read W H < <(ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "$SRC")

if [ ! -d "$B/frames" ] || [ "${FORCE:-0}" = 1 ]; then
  echo "== 1. privacy: track monitor + blur patient identifiers"
  mkdir -p "$B/track"
  if [ "$(J "['trackMethod']" 2>/dev/null)" = "detect" ]; then   # per-frame detection from the endoscope image (no drift)
    python3 scripts/detect_sidebar.py "$SRC" "$B/track_full.json" "$B/detect_check.png"
  else                                                         # feature tracking from starting quads
    python3 scripts/track_monitor.py "$SRC" "$B/track_full.json" "$B/track" "$(J "['trackQuads']")"
  fi
  python3 scripts/export_track.py "$B/track_full.json" "$E/track.json" "$W" "$H"
  python3 scripts/anonymize.py "$SRC" "$B/track_full.json" "$B/private.avi" "$(J "['anonymize']")"
  echo "== 2. frames (2x Lanczos)"
  rm -rf "$B/frames"; mkdir -p "$B/frames"
  ffmpeg -v error -y -i "$B/private.avi" -vf "scale=$((W*2)):$((H*2)):flags=lanczos,unsharp=5:5:0.5:5:5:0,eq=contrast=1.03:saturation=1.02" -q:v 2 "$B/frames/%04d.jpg"
  echo "== 3. voice cleanup"
  ffmpeg -v error -y -i "$SRC" -ac 1 -ar 48000 "$B/a48.wav"
  python3 scripts/clean_voice.py "$B/a48.wav" "$B/dn.wav" "$(J "['pauses']")"
  ffmpeg -v error -y -i "$B/dn.wav" -af "highpass=f=85,lowpass=f=12500,$(cat "$E/beep_notch_filters.txt"),equalizer=f=220:t=q:w=1.2:g=-2.5,equalizer=f=3200:t=q:w=1.0:g=2.5,equalizer=f=6500:t=q:w=2:g=-1.5,acompressor=threshold=-26dB:ratio=3:attack=8:release=120:makeup=4,alimiter=limit=0.89:level=false,loudnorm=I=-16:TP=-1.5:LRA=7" -ar 48000 -ac 1 "$B/cleaned_voice.wav"
fi

echo "== 4. music + sfx"
TOT=$(python3 -c "import json;d=json.load(open('$E/timeline.json'));print(d['videoDur']+d['outroDur'])")
python3 scripts/music.py "$B/music.wav" "$TOT"
python3 scripts/sfx.py "$E/timeline.json" "$B/sfx.wav"

echo "== 5. captions"
DATA="$E" OUT="$OUT" python3 scripts/captions.py

echo "== 6. render frames"
rm -rf "$B/render"; node scripts/render.mjs --ep "$EP" --workers 4

echo "== 7. mix"
DATA="$E" BUILD="$B" AUDIO="$B" scripts/mix.sh

echo "== 8. encode"
ffmpeg -v error -y -framerate 30 -i "$B/render/%05d.png" -i "$B/mix.wav" \
  -c:v libx264 -preset slow -crf 17 -pix_fmt yuv420p -profile:v high -level 4.1 -movflags +faststart \
  -c:a aac -b:a 256k -ar 48000 -shortest "$OUT/final_medical_reel.mp4"

echo "== 9. thumbnail + voice"
node scripts/render.mjs --ep "$EP" --page thumbnail.html --preview 0 --out "$B/thumb" && cp "$B/thumb/t_0.00.png" "$OUT/thumbnail.png"
cp "$B/cleaned_voice.wav" "$OUT/cleaned_voice.wav"
echo "done -> $OUT"
