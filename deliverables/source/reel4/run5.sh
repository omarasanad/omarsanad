set -e
cd /tmp/claude-0/-home-user-omarsanad/8f90bdf1-7131-5a6c-8d46-c4ba36c4e7bf/scratchpad/v5
N=3696; C=924
rm -rf ov; mkdir ov
(for w in 0 1 2 3; do node render_ov.js $((w*C)) $(( (w+1)*C < N ? (w+1)*C : N )) 1 ov & done; wait) | grep -E "frames|ERR"
python3 -I audio5.py
for w in 0 1 2 3; do a=$((w*C)); b=$(( (w+1)*C < N ? (w+1)*C : N )); (python3 -I compose5.py $a $b | ffmpeg -v error -y -f rawvideo -pix_fmt rgb24 -s 1080x1920 -r 60 -i - -c:v libx264 -preset fast -crf 10 -pix_fmt yuv444p chunk$w.mkv) & done; wait
for w in 0 1 2 3; do echo "file 'chunk$w.mkv'"; done > chunks.txt; ffmpeg -v error -y -f concat -i chunks.txt -c copy comp.mkv
I=$(ffmpeg -hide_banner -i narr_pre.wav -af ebur128 -f null - 2>&1 | grep -E "^\s+I:" | awk '{print $2}'); G=$(python3 -c "print(round(-14.6-($I),1))"); echo "narr I=$I gain=$G"
ffmpeg -hide_banner -v error -y -i narr_pre.wav -i music.wav -i sfx.wav -filter_complex "[0:a]aresample=48000,aformat=channel_layouts=stereo,volume=${G}dB,alimiter=limit=0.84:attack=4:release=60:level=false,apad=whole_dur=61.6,asplit=2[nv][key];[1:a]volume=-12.5dB[mu];[mu][key]sidechaincompress=threshold=0.02:ratio=5:attack=25:release=400:makeup=1[mud];[2:a]volume=-3dB[fx];[nv][mud][fx]amix=inputs=3:normalize=0:duration=first,alimiter=limit=0.89:attack=3:release=50:level=false[out]" -map "[out]" -c:a pcm_s24le mix.wav
OUT=/home/user/omarsanad/deliverables/reel4_fatty_liver_1080x1920.mp4
ffmpeg -hide_banner -v error -y -i comp.mkv -i mix.wav -filter_complex "[0:v]ass=captions.ass:fontsdir=fonts,fade=t=out:st=61.15:d=0.45,format=yuv420p[v];[1:a]afade=t=out:st=60.9:d=0.7[a]" -map "[v]" -map "[a]" -c:v libx264 -preset slow -crf 17 -maxrate 20M -bufsize 30M -profile:v high -level 4.2 -r 60 -g 120 -colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv -c:a aac -b:a 256k -ar 48000 -movflags +faststart -t 61.6 $OUT
ffmpeg -hide_banner -i $OUT -vf "freezedetect=n=0.002:d=1.0,blackdetect=d=0.1:pix_th=0.08" -af ebur128=peak=true -f null - 2>&1 | grep -E "freeze_start|freeze_dur|black_start|^\s+(I|Peak):"
echo "FINAL frames=$(ffprobe -v error -count_frames -select_streams v -show_entries stream=nb_read_frames -of csv=p=0 $OUT) size=$(stat -c %s $OUT)"
ffmpeg -v error -y -i $OUT -vf "fps=1,scale=216:384,tile=11x6" -frames:v 1 final_sheet.jpg
