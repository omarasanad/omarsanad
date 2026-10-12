#!/usr/bin/env bash
# Mix picture + music + SFX (+ voiceover if audio/voiceover.wav exists) into out/final.mp4.
# Music is side-chain ducked under the voice so narration always stays on top.
set -euo pipefail
cd "$(dirname "$0")/.."
VIDEO=${1:-out/silent.mp4}
if [[ -f audio/voiceover.wav ]]; then
  echo "Mixing WITH voiceover (audio/voiceover.wav)"
  ffmpeg -y -loglevel error -i "$VIDEO" -i audio/music.wav -i audio/sfx.wav -i audio/voiceover.wav -filter_complex \
    "[3:a]aformat=channel_layouts=stereo,asplit[vo][sc];[1:a]volume=0.45[m];[m][sc]sidechaincompress=threshold=0.02:ratio=10:attack=15:release=450[md];[2:a]volume=0.7[s];[vo][md][s]amix=inputs=3:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=9[a]" \
    -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -ar 48000 -shortest -movflags +faststart out/final.mp4
else
  echo "No audio/voiceover.wav — mixing music + SFX only (narration placeholder)"
  ffmpeg -y -loglevel error -i "$VIDEO" -i audio/music.wav -i audio/sfx.wav -filter_complex \
    "[1:a][2:a]amix=inputs=2:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=11[a]" \
    -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -ar 48000 -shortest -movflags +faststart out/final.mp4
fi
# review images
ffmpeg -y -loglevel error -i out/final.mp4 -vf "fps=0.6,scale=216:-1,tile=6x5" -frames:v 1 out/contact_sheet.png
ffmpeg -y -loglevel error -ss 4.6 -i out/final.mp4 -frames:v 1 out/preview.png
echo "wrote out/final.mp4, out/contact_sheet.png, out/preview.png"
