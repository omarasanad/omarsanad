# الكبد الدهني (Fatty Liver) · medical motion reel

Part 3 of Dr. Abobakr Sanad's Egyptian Arabic medical series, after H. pylori and IBS. It shares their look:
navy, teal and white with restrained orange, the same logo watermark, the same cartoon doctor and the same caption style.
It is a vertical 1080×1920, 30 fps reel whose length follows the voiceover (about 63 s at the planned pace).

The video is entirely code. `src/film.js` paints any frame from `window.seek(t)`, Playwright captures the frames,
ffmpeg encodes them, and numpy synthesizes the music and sound effects.

## Deliverables (`out/`)
| File | What |
|------|------|
| `fatty_liver_reel.mp4` | The reel: H.264 + AAC, 1080×1920, 30 fps |
| `thumbnail.png` | Poster frame (the hook) |
| `contact_sheet.png` | Overview of every scene |
| `captions_ar.srt` | Egyptian Arabic captions |

## Voiceover
No Egyptian voice generator is available in the build environment. **Until a recording is added, the render has captions, music and sound effects only.**
`docs/voiceover_elevenlabs.md` has the ElevenLabs-ready script (Multilingual v2 and v3 versions, settings, pronunciation fixes).
To add the voice:
1. Upload it as `audio/voiceover.mp3`.
2. Find the sentence pauses with `ffmpeg -i audio/voiceover.mp3 -af silencedetect=noise=-34dB:d=0.12 -f null -`.
   Write one `[start, end]` per sentence (14, in the order of `SENTENCES` in `scripts/timing.py`) to `audio/vo_spans.json`.
3. Run the build below. Scenes, labels, sound cues and captions are all keyed to `src/timing.json`, so everything follows the voice.
   `scripts/vo_envelope.py` makes the presenter's speaking meter follow the real voice.

## Build
```bash
npm install                     # playwright (Chromium)
python3 scripts/timing.py       # -> src/timing.json (scene starts + caption phrases)
python3 scripts/vo_envelope.py  # (with a voiceover) -> src/vo_env.json
python3 scripts/audio.py        # -> audio/music.wav, audio/sfx.wav  (sound cues: audio/cues.json)
node scripts/captions.mjs       # -> out/captions_ar.srt
node scripts/render.mjs         # -> out/silent.mp4   (review frames: --stills 3,20,45)
./scripts/mix.sh                # -> out/fatty_liver_reel.mp4, thumbnail.png, contact_sheet.png
```

## Editing
- **Doctor details** (name, specialty, Facebook page, watermark name) are in `src/config.js`. Leave `doctorName` empty to show an editable placeholder plate instead.
- **Doctor character:** `assets/doctor_cutout.png`, a transparent PNG; `faceAnchor` in `config.js` frames it. **Logo:** `assets/logo/`.
- **Wording:** edit `SENTENCES` in `scripts/timing.py`. On-screen labels are in `src/film.js`, one function per scene.

## Scenes
1. **Hook:** a translucent torso with the ribcage. The camera pushes in on the liver while a scan line passes and fat droplets build up. Titles: «الكبد الدهني» then «ممكن يكون من غير أعراض!».
2. **What it is:** a normal and a fatty liver side by side. A zoom callout shows liver cells filling with fat droplets. Labels: fat build-up, then the causes (excess weight, insulin resistance, type 2 diabetes).
3. **Symptoms:** the doctor stands beside the liver with floating question marks. A check-up scan then finds it: «بيتكتشف بالصدفة أثناء الفحوصات». It also says that having no symptoms doesn't mean there's no problem.
4. **Diagnosis:** cards for Liver Blood Tests (a tube and lab bars, no values) and Abdominal Ultrasound (an animated scan sector). Then «تقييم درجة الخطورة حسب الحالة» and «تحليل طبيعي لوحده مش كفاية».
5. **Lifestyle:** gradual weight loss, a balanced plate and walking. The liver's fat droplets shrink («دهون أقل في الكبد»), with a short appearance by the doctor's presenter bubble.
6. **Closing:** the doctor hero shot with «متعتمدش على الأعراض», «ومتبدأش علاج من نفسك» and «عوامل خطورة؟ استشير دكتور». Then the logo, name and specialty, «اهتم بصحة كبدك», the follow button and the Facebook page.

## Medical content
These points were checked against current MASLD guidance summaries (AASLD and EASL/EASD/EASO 2024, via secondary sources):
- Fatty liver is often symptomless. Normal liver blood tests do not rule it out.
- Ultrasound is the usual first-line imaging. Risk and fibrosis assessment is individual, so the video makes no claim that ultrasound grades fibrosis.
- Gradual weight loss with a healthy lifestyle reduces liver fat.
- The video recommends no drug, supplement, dose, crash diet or "miracle drink". Its results are illustrative and show no lab values.
