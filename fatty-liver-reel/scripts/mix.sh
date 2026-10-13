#!/usr/bin/env bash
# Mix picture + music + SFX (+ voiceover if audio/voiceover.wav or .mp3 exists) into out/fatty_liver_reel.mp4.
# Music is side-chain ducked under the voice so narration always stays on top.
set -euo pipefail
cd "$(dirname "$0")/.."
VIDEO=${1:-out/silent.mp4}
VO=$(ls audio/voiceover.wav audio/voiceover.mp3 2>/dev/null | head -1 || true)
if [[ -n "$VO" ]]; then
  echo "Mixing WITH voiceover ($VO)"
  ffmpeg -y -loglevel error -i "$VIDEO" -i audio/music.wav -i audio/sfx.wav -i "$VO" -filter_complex \
    "[3:a]aresample=48000,aformat=channel_layouts=stereo,loudnorm=I=-16:TP=-2:LRA=7,asplit[vo][sc];[1:a]volume=0.35[m];[m][sc]sidechaincompress=threshold=0.02:ratio=10:attack=15:release=450[md];[2:a]volume=0.7[s];[vo][md][s]amix=inputs=3:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=9[a]" \
    -map 0:v -map "[a]" -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -c:a aac -b:a 192k -ar 48000 -shortest -movflags +faststart out/fatty_liver_reel.mp4
else
  echo "No audio/voiceover.(wav|mp3) — mixing music + SFX only (narration placeholder)"
  ffmpeg -y -loglevel error -i "$VIDEO" -i audio/music.wav -i audio/sfx.wav -filter_complex \
    "[1:a][2:a]amix=inputs=2:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=11[a]" \
    -map 0:v -map "[a]" -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -c:a aac -b:a 192k -ar 48000 -shortest -movflags +faststart out/fatty_liver_reel.mp4
fi
# review images
D=$(ffprobe -v error -show_entries format=duration -of csv=p=0 out/fatty_liver_reel.mp4)
FPS=$(python3 -c "print(30/$D)")   # 30 frames spread over the whole reel
ffmpeg -y -loglevel error -i out/fatty_liver_reel.mp4 -vf "fps=$FPS,scale=216:-1,tile=6x5" -frames:v 1 out/contact_sheet.png
ffmpeg -y -loglevel error -ss 3.0 -i out/fatty_liver_reel.mp4 -frames:v 1 out/thumbnail.png
echo "wrote out/fatty_liver_reel.mp4, out/contact_sheet.png, out/thumbnail.png"
