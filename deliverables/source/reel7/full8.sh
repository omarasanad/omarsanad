set -e
cd /tmp/claude-0/-home-user-omarsanad/8f90bdf1-7131-5a6c-8d46-c4ba36c4e7bf/scratchpad/v8
B=$(python3 -c "import json;print(json.load(open('cuts.json'))['total'])"); N=$(python3 -c "print(int($B*30))"); C=$(( (N+3)/4 ))
TOTAL=$(python3 -c "import json;print(json.load(open('timeline.json'))['total'])")
for w in 0 1 2 3; do a=$((w*C)); b=$(( (w+1)*C < N ? (w+1)*C : N )); (python3 -I run8.py $a $b 2>/dev/null | ffmpeg -v error -y -f rawvideo -pix_fmt rgb24 -s 1080x1920 -r 30 -i - -c:v libx264 -preset fast -crf 12 -pix_fmt yuv420p chunk$w.mkv) & done; wait
for w in 0 1 2 3; do echo "file 'chunk$w.mkv'"; done > chunks.txt; ffmpeg -v error -y -f concat -i chunks.txt -c copy body_raw.mkv
ffmpeg -v error -y -i body_raw.mkv -vf "ass=captions8.ass:fontsdir=fonts" -c:v libx264 -preset fast -crf 12 -pix_fmt yuv420p body.mkv
BD=$(ffprobe -v error -show_entries format=duration -of csv=p=0 body.mkv)
python3 -I audio8.py
I=$(ffmpeg -hide_banner -i narr_pre.wav -af ebur128 -f null - 2>&1 | grep -E "^\s+I:" | awk '{print $2}'); G=$(python3 -c "print(round(-14.6-($I),1))"); echo "narr I=$I gain=$G"
ffmpeg -hide_banner -v error -y -i narr_pre.wav -i music.wav -i sfx.wav -filter_complex "[0:a]aresample=48000,aformat=channel_layouts=stereo,volume=${G}dB,alimiter=limit=0.84:attack=4:release=60:level=false,adelay=2100|2100,apad=whole_dur=${TOTAL},asplit=2[nv][key];[1:a]volume=-13dB[mu];[mu][key]sidechaincompress=threshold=0.02:ratio=5:attack=25:release=400:makeup=1[mud];[2:a]volume=-4dB[fx];[nv][mud][fx]amix=inputs=3:normalize=0:duration=first,alimiter=limit=0.89:level=false,afade=t=out:st=$(python3 -c "print($TOTAL-1.0)"):d=1.0[out]" -map "[out]" -c:a pcm_s24le mix.wav
OUT=/home/user/omarsanad/deliverables/reel7_h_pylori_series_1080x1920.mp4
X1=2.1; X2=$(python3 -c "print(round(2.1+$BD-0.5,3))")
VF="[0:v]settb=1/30,fps=30[i];[1:v]settb=1/30,fps=30[b];[2:v]settb=1/30,fps=30[o];[i][b]xfade=transition=fade:duration=0.5:offset=${X1}[ib];[ib][o]xfade=transition=fade:duration=0.5:offset=${X2},format=yuv420p[v]"
ffmpeg -hide_banner -v error -y -i intro.mkv -i body.mkv -i outro.mkv -filter_complex "$VF" -map "[v]" -an -c:v libx264 -preset slow -b:v 2900k -g 60 -profile:v high -level 4.2 -pass 1 -passlogfile p8 -f null /dev/null
ffmpeg -hide_banner -v error -y -i intro.mkv -i body.mkv -i outro.mkv -i mix.wav -filter_complex "$VF" -map "[v]" -map 3:a -c:v libx264 -preset slow -b:v 2900k -maxrate 6000k -bufsize 9000k -g 60 -profile:v high -level 4.2 -pass 2 -passlogfile p8 -colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv -c:a aac -b:a 192k -ar 48000 -movflags +faststart -t ${TOTAL} $OUT
ffmpeg -hide_banner -i $OUT -vf "freezedetect=n=0.001:d=2.5" -af ebur128=peak=true -f null - 2>&1 | grep -E "freeze_start|freeze_dur|^\s+(I|Peak):" || true
echo "FINAL frames=$(ffprobe -v error -count_frames -select_streams v -show_entries stream=nb_read_frames -of csv=p=0 $OUT) dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 $OUT) size=$(stat -c %s $OUT)"
ffmpeg -v error -y -i $OUT -vf "fps=0.5,scale=180:320,tile=10x4" -frames:v 1 final_sheet.jpg
cd /home/user/omarsanad && mkdir -p deliverables/source/reel7 && cp /tmp/claude-0/-home-user-omarsanad/8f90bdf1-7131-5a6c-8d46-c4ba36c4e7bf/scratchpad/v8/{io.html,rio.js,comp8.py,run8.py,build8.py,full8.sh,captions8.ass} deliverables/source/reel7/ && cp /tmp/claude-0/-home-user-omarsanad/8f90bdf1-7131-5a6c-8d46-c4ba36c4e7bf/scratchpad/v8/captions8_ar_en.srt deliverables/reel7_captions_ar_en.srt
git add deliverables && git commit -q -m "Add reel 7 (H. pylori series) with studio look, custom intro and outro

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01Ui5qk6uBCgQWgMzqQ3BdXs" && git push -u origin claude/nice-albattani-mcjhgk 2>&1 | tail -1
echo ALLDONE
