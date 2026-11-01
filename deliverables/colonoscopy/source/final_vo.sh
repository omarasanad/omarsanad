set -e
cd /tmp/claude-0/-home-user-omarsanad/8f90bdf1-7131-5a6c-8d46-c4ba36c4e7bf/scratchpad/colo
pgrep -f "http.server 8765" >/dev/null || (python3 -m http.server 8765 --bind 127.0.0.1 >/dev/null 2>&1 &)
sleep 1; rm -rf fr; mkdir fr
N=2828; C=707
python3 -I audio_colo.py
# voice: 1.1x, clean, -16 LUFS; music ducked under voice
ffmpeg -hide_banner -v error -y -i vo.mp3 -i music.wav -i sfx.wav -filter_complex "[0:a]aresample=48000,aformat=channel_layouts=stereo,atempo=1.1,highpass=f=70,equalizer=f=3000:t=q:w=1.2:g=1.5,loudnorm=I=-15:TP=-1.5:LRA=7,apad=whole_dur=94.27,asplit=2[v][k];[1:a]volume=-9dB[m];[m][k]sidechaincompress=threshold=0.03:ratio=6:attack=20:release=350:makeup=1[md];[2:a]volume=-6dB[f];[v][md][f]amix=inputs=3:normalize=0:duration=first,alimiter=limit=0.89:level=false,afade=t=out:st=93.2:d=1.0[a]" -map "[a]" -c:a pcm_s24le mixvo.wav
for w in 0 1 2 3; do node rend.js 8765 fr --range $((w*C)) $(( (w+1)*C )) 30 2>&1 | grep -v 404 & done; wait
n=$(ls fr | wc -l); echo "frames=$n"; [ "$n" -eq $N ] || { echo MISSING; exit 1; }
OUT=/home/user/omarsanad/deliverables/colonoscopy/colonoscopy_reel_1080x1920.mp4
VF="[0:v]ass=vo_caps.ass:fontsdir=fonts,fade=t=in:st=0:d=0.3,fade=t=out:st=93.6:d=0.6,format=yuv420p[v]"
ffmpeg -hide_banner -v error -y -framerate 30 -i fr/f%05d.jpg -i mixvo.wav -filter_complex "$VF" -map "[v]" -an -c:v libx264 -preset slow -b:v 2300k -pass 1 -passlogfile pc -f null /dev/null
ffmpeg -hide_banner -v error -y -framerate 30 -i fr/f%05d.jpg -i mixvo.wav -filter_complex "$VF" -map "[v]" -map 1:a -c:v libx264 -preset slow -b:v 2300k -maxrate 5000k -bufsize 8000k -pass 2 -passlogfile pc -profile:v high -level 4.2 -g 60 -colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv -c:a aac -b:a 192k -ar 48000 -movflags +faststart -t 94.27 $OUT
ffmpeg -hide_banner -i $OUT -vf "freezedetect=n=0.001:d=2.5,blackdetect=d=0.2:pix_th=0.05" -af ebur128=peak=true -f null - 2>&1 | grep -E "freeze_start|freeze_dur|black_start|^\s+(I|Peak):" || true
echo "FINAL frames=$(ffprobe -v error -count_frames -select_streams v -show_entries stream=nb_read_frames -of csv=p=0 $OUT) size=$(stat -c %s $OUT)"
ffmpeg -v error -y -i $OUT -vf "fps=0.5,scale=180:320,tile=12x4" -frames:v 1 final_sheet.jpg
