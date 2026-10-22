set -e
cd /tmp/claude-0/-home-user-omarsanad/8f90bdf1-7131-5a6c-8d46-c4ba36c4e7bf/scratchpad/v4
[ -f base_orig.mkv ] || mv base.mkv base_orig.mkv
ffmpeg -v error -y -i base_orig.mkv -vf "format=rgb24,$(cat g4.txt),cas=0.45,format=yuv420p" -c:v libx264 -preset medium -crf 10 -r 30 -c:a copy base.mkv
N=1398; C=350
for w in 0 1 2 3; do a=$((w*C)); b=$(( (w+1)*C < N ? (w+1)*C : N )); (python3 -I compose4.py $a $b | ffmpeg -v error -y -f rawvideo -pix_fmt rgb24 -s 1080x1920 -r 30 -i - -c:v libx264 -preset fast -crf 8 -pix_fmt yuv444p chunk$w.mkv) & done; wait
ffmpeg -v error -y -f concat -i chunks.txt -c copy comp.mkv
OUT=/home/user/omarsanad/deliverables/reel3_milk_acidity_1080x1920.mp4
VF="[0:v]ass=captions.ass:fontsdir=fonts,fade=t=out:st=46.15:d=0.45,format=yuv420p[v];[1:a]afade=t=out:st=45.9:d=0.7[a]"
ffmpeg -hide_banner -v error -y -i comp.mkv -i mix.wav -filter_complex "$VF" -map "[v]" -map "[a]" -c:v libx264 -preset slower -b:v 4600k -pass 1 -passlogfile p4 -profile:v high -level 4.2 -r 30 -g 60 -an -f null /dev/null
ffmpeg -hide_banner -v error -y -i comp.mkv -i mix.wav -filter_complex "$VF" -map "[v]" -map "[a]" -c:v libx264 -preset slower -b:v 4600k -maxrate 8000k -bufsize 12000k -pass 2 -passlogfile p4 -profile:v high -level 4.2 -r 30 -g 60 -colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv -c:a aac -b:a 192k -ar 48000 -movflags +faststart -t 46.6 $OUT
ffmpeg -hide_banner -i $OUT -vf "freezedetect=n=0.002:d=1.0" -an -f null - 2>&1 | grep -E "freeze_start" || true
echo "FINAL frames=$(ffprobe -v error -count_frames -select_streams v -show_entries stream=nb_read_frames -of csv=p=0 $OUT) size=$(stat -c %s $OUT)"
