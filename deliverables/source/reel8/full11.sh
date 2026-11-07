set -e
cd /tmp/claude-0/-home-user-omarsanad/8f90bdf1-7131-5a6c-8d46-c4ba36c4e7bf/scratchpad/v9
N=$(ffprobe -v error -count_frames -select_streams v -show_entries stream=nb_read_frames -of csv=p=0 cut.mkv); C=$(( (N+3)/4 ))
python3 -c "import json;t=json.load(open('timeline.json'));t['total']=round(2.1+$N/30+4.1,3);json.dump(t,open('timeline.json','w'))"
TOTAL=$(python3 -c "import json;print(json.load(open('timeline.json'))['total'])"); echo "N=$N TOTAL=$TOTAL"
export OMP_NUM_THREADS=1 NUMBA_NUM_THREADS=1 OPENBLAS_NUM_THREADS=1 MKL_NUM_THREADS=1
for w in 0 1 2 3; do a=$((w*C)); b=$(( (w+1)*C < N ? (w+1)*C : N )); (python3 -I run11.py $a $b 2>p$w.log | ffmpeg -v error -y -f rawvideo -pix_fmt rgb24 -s 1080x1920 -r 30 -i - -c:v libx264 -preset fast -crf 12 -pix_fmt yuv420p chunk$w.mkv) & done; wait
for w in 0 1 2 3; do echo "file 'chunk$w.mkv'"; done > chunks.txt; ffmpeg -v error -y -f concat -i chunks.txt -c copy body_raw.mkv
echo "body_raw frames=$(ffprobe -v error -count_frames -select_streams v -show_entries stream=nb_read_frames -of csv=p=0 body_raw.mkv) expected=$N"
ffmpeg -v error -y -i body_raw.mkv -vf "ass=captions9.ass:fontsdir=fonts" -c:v libx264 -preset fast -crf 12 -pix_fmt yuv420p body.mkv
BD=$(ffprobe -v error -show_entries format=duration -of csv=p=0 body.mkv)
python3 -I audio9.py
I=$(ffmpeg -hide_banner -i narr_pre.wav -af ebur128 -f null - 2>&1 | grep -E "^\s+I:" | awk '{print $2}'); G=$(python3 -c "print(round(-14.6-($I),1))"); echo "narr I=$I gain=$G"
ffmpeg -hide_banner -v error -y -i narr_pre.wav -i music.wav -i sfx.wav -filter_complex "[0:a]aresample=48000,aformat=channel_layouts=stereo,volume=${G}dB,agate=threshold=0.016:ratio=3:range=0.32:attack=4:release=160:knee=4,alimiter=limit=0.84:attack=4:release=60:level=false,adelay=2100|2100,apad=whole_dur=${TOTAL},asplit=2[nv][key];[1:a]volume=-13dB[mu];[mu][key]sidechaincompress=threshold=0.02:ratio=5:attack=25:release=400:makeup=1[mud];[2:a]volume=-4dB[fx];[nv][mud][fx]amix=inputs=3:normalize=0:duration=first,alimiter=limit=0.89:level=false,afade=t=out:st=$(python3 -c "print($TOTAL-1.0)"):d=1.0[out]" -map "[out]" -c:a pcm_s24le mix.wav
OUT=/home/user/omarsanad/deliverables/reel8_ibs_gut_brain_1080x1920.mp4
VB=$(python3 -c "print(int((29.3e6*8/$TOTAL-128000)*0.985/1000))"); echo "video bitrate ${VB}k"
X1=2.1; X2=$(python3 -c "print(round(2.1+$BD-0.5,3))")
VF="[0:v]settb=1/30,fps=30[i];[1:v]settb=1/30,fps=30[b];[2:v]settb=1/30,fps=30[o];[i][b]xfade=transition=fade:duration=0.5:offset=${X1}[ib];[ib][o]xfade=transition=fade:duration=0.5:offset=${X2},format=yuv420p[v]"
ffmpeg -hide_banner -v error -y -i intro.mkv -i body.mkv -i outro.mkv -filter_complex "$VF" -map "[v]" -an -c:v libx264 -preset slow -b:v ${VB}k -g 60 -profile:v high -level 4.2 -x264-params aq-mode=3 -pass 1 -passlogfile p11 -f null /dev/null
ffmpeg -hide_banner -v error -y -i intro.mkv -i body.mkv -i outro.mkv -i mix.wav -filter_complex "$VF" -map "[v]" -map 3:a -c:v libx264 -preset slow -b:v ${VB}k -maxrate 4500k -bufsize 7000k -g 60 -profile:v high -level 4.2 -x264-params aq-mode=3 -pass 2 -passlogfile p11 -colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv -c:a aac -b:a 128k -ar 48000 -movflags +faststart -t ${TOTAL} $OUT
ffmpeg -hide_banner -i $OUT -vf "freezedetect=n=0.001:d=2.5" -af ebur128=peak=true -f null - 2>&1 | grep -E "freeze_start|freeze_dur|^\s+(I|Peak):" || true
echo "FINAL frames=$(ffprobe -v error -count_frames -select_streams v -show_entries stream=nb_read_frames -of csv=p=0 $OUT) dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 $OUT) size=$(stat -c %s $OUT)"
ffmpeg -v error -y -i $OUT -vf "fps=0.4,scale=180:320,tile=10x5" -frames:v 1 final_sheet.jpg
echo ALLDONE
