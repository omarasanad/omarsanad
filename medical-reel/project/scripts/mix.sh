#!/usr/bin/env bash
# Final audio mix: cleaned voice (primary) + ducked music + SFX, normalized to -14 LUFS / -1.5 dBTP.
# Usage: [DATA=episodes/ep02 BUILD=build/ep02 AUDIO=build/ep02] scripts/mix.sh  (run from project/)  -> $BUILD/mix.wav
set -euo pipefail
DATA=${DATA:-data}; BUILD=${BUILD:-build}; AUDIO=${AUDIO:-audio}   # per-episode folders
TL=$DATA/timeline.json
VD=$(python3 -c "import json;print(json.load(open('$TL'))['videoDur'])")
TOT=$(python3 -c "import json;d=json.load(open('$TL'));print(d['videoDur']+d['outroDur'])")
# voice: trim to picture end, short fade where the source recording stops, pad to full length
ffmpeg -v error -y -i $AUDIO/cleaned_voice.wav -af "atrim=0:$VD,afade=t=out:st=$(python3 -c "print($VD-0.12)"):d=0.12,apad=whole_dur=$TOT,aformat=channel_layouts=stereo" -ar 48000 $BUILD/voice_st.wav
# music: base level ~9 dB under the voice, ducked further while the doctor speaks, lifted for the outro
ffmpeg -v error -y -i $AUDIO/music.wav -i $BUILD/voice_st.wav -filter_complex "
 [0:a]atrim=0:$TOT,volume=-9dB,volume='if(gte(t,$VD),1.6,1)':eval=frame[m];
 [1:a]asplit=2[v][key];
 [m][key]sidechaincompress=threshold=0.02:ratio=5:attack=60:release=700:makeup=1[md];
 [v][md]amix=inputs=2:normalize=0[vm]" -map "[vm]" -ar 48000 $BUILD/voice_music.wav
ffmpeg -v error -y -i $BUILD/voice_music.wav -i $AUDIO/sfx.wav -filter_complex "[1:a]volume=-6dB[s];[0:a][s]amix=inputs=2:normalize=0,atrim=0:$TOT" -ar 48000 $BUILD/premix.wav
# two-pass loudness normalization (linear)
J=$(ffmpeg -hide_banner -i $BUILD/premix.wav -af loudnorm=I=-14:TP=-1.5:LRA=9:print_format=json -f null - 2>&1 | sed -n '/{/,/}/p')
g(){ echo "$J" | python3 -c "import json,sys;print(json.load(sys.stdin)['$1'])"; }
ffmpeg -v error -y -i $BUILD/premix.wav -af "loudnorm=I=-14:TP=-1.5:LRA=9:measured_I=$(g input_i):measured_TP=$(g input_tp):measured_LRA=$(g input_lra):measured_thresh=$(g input_thresh):offset=$(g target_offset):linear=true" -ar 48000 $BUILD/mix.wav
ffmpeg -hide_banner -i $BUILD/mix.wav -af ebur128=peak=true -f null - 2>&1 | grep -E "^\s+(I|LRA|Peak):" || true
