set -e
cd /tmp/claude-0/-home-user-omarsanad/8f90bdf1-7131-5a6c-8d46-c4ba36c4e7bf/scratchpad/v7
N=2316; C=579
for w in 0 1 2 3; do a=$((w*C)); b=$(( (w+1)*C < N ? (w+1)*C : N )); (python3 -I run7.py $a $b 2>/dev/null | ffmpeg -v error -y -f rawvideo -pix_fmt rgb24 -s 1080x1920 -r 30 -i - -c:v libx264 -preset fast -crf 12 -pix_fmt yuv420p chunk$w.mkv) & done; wait
for w in 0 1 2 3; do echo "file 'chunk$w.mkv'"; done > chunks.txt; ffmpeg -v error -y -f concat -i chunks.txt -c copy body.mkv
echo "body frames=$(ffprobe -v error -count_frames -select_streams v -show_entries stream=nb_read_frames -of csv=p=0 body.mkv)"
# end card: darkened studio + logo, letterboxed, 2.6 s
ffmpeg -v error -y -loop 1 -framerate 30 -i studio_bg.png -loop 1 -framerate 30 -i logo.png -filter_complex "[0:v]eq=brightness=-0.08,drawbox=x=0:y=0:w=1080:h=127:color=black:t=fill,drawbox=x=0:y=1793:w=1080:h=127:color=black:t=fill[b];[1:v]scale=900:-1,format=rgba,fade=t=in:st=0.15:d=0.5:alpha=1[l];[b][l]overlay=(W-w)/2:(H-h)/2-20,fade=t=in:st=0:d=0.35,fade=t=out:st=2.15:d=0.45,format=yuv420p" -t 2.6 -r 30 -c:v libx264 -preset fast -crf 12 end.mkv
python3 -I audio7.py
I=$(ffmpeg -hide_banner -i narr_pre.wav -af ebur128 -f null - 2>&1 | grep -E "^\s+I:" | awk '{print $2}'); G=$(python3 -c "print(round(-14.6-($I),1))"); echo "narr I=$I gain=$G"
ffmpeg -hide_banner -v error -y -i narr_pre.wav -i music.wav -i sfx.wav -filter_complex "[0:a]aresample=48000,aformat=channel_layouts=stereo,volume=${G}dB,alimiter=limit=0.84:attack=4:release=60:level=false,apad=whole_dur=79.8,asplit=2[nv][key];[1:a]volume=-14dB[mu];[mu][key]sidechaincompress=threshold=0.02:ratio=5:attack=25:release=400:makeup=1[mud];[2:a]volume=-4dB[fx];[nv][mud][fx]amix=inputs=3:normalize=0:duration=first,alimiter=limit=0.89:level=false,afade=t=out:st=79.0:d=0.8[out]" -map "[out]" -c:a pcm_s24le mix.wav
OUT=/home/user/omarsanad/deliverables/reel6_h_pylori_studio_1080x1920.mp4
ffmpeg -hide_banner -v error -y -i body.mkv -i end.mkv -i mix.wav -filter_complex "[0:v]ass=captions7.ass:fontsdir=fonts[b];[b][1:v]concat=n=2:v=1:a=0,format=yuv420p[v]" -map "[v]" -an -c:v libx264 -preset slow -b:v 2600k -g 60 -profile:v high -level 4.2 -pass 1 -passlogfile p7 -f null /dev/null
ffmpeg -hide_banner -v error -y -i body.mkv -i end.mkv -i mix.wav -filter_complex "[0:v]ass=captions7.ass:fontsdir=fonts[b];[b][1:v]concat=n=2:v=1:a=0,format=yuv420p[v]" -map "[v]" -map 2:a -c:v libx264 -preset slow -b:v 2600k -maxrate 6000k -bufsize 9000k -g 60 -profile:v high -level 4.2 -pass 2 -passlogfile p7 -colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv -c:a aac -b:a 192k -ar 48000 -movflags +faststart -t 79.8 $OUT
ffmpeg -hide_banner -i $OUT -vf "freezedetect=n=0.001:d=2.5" -af ebur128=peak=true -f null - 2>&1 | grep -E "freeze_start|^\s+(I|Peak):" || true
echo "FINAL frames=$(ffprobe -v error -count_frames -select_streams v -show_entries stream=nb_read_frames -of csv=p=0 $OUT) size=$(stat -c %s $OUT)"
ffmpeg -v error -y -i $OUT -vf "fps=0.5,scale=180:320,tile=10x4" -frames:v 1 final_sheet.jpg
