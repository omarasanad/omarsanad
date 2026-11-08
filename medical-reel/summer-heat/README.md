# Summer Heat & Digestive Health: medical documentary reel (Dr. Abubakr Ahmed Sanad)

## Status

| # | Deliverable | Where | Status |
|---|---|---|---|
| 1 | Medical fact-check report | `docs/01_fact_check_report.md` (English, with references) · `docs/01_fact_check_report_ar.md` (Egyptian Arabic, for the doctor) | ✅ done; 4 questions for the doctor |
| 2 | Final corrected script (Egyptian Arabic) | `docs/02_final_script.md` (narration + explanation + on-screen text) · `script/final_script_ar.txt` · `script/elevenlabs_script.txt` (+ `_plain`) | ✅ done; voiced with ElevenLabs |
| 3 | Timestamped storyboard | `storyboard/storyboard.md` | ✅ v2, timed to the narration |
| 4 | Visual identity reference | `identity/visual_identity.md` · `identity/identity_board.jpg` | ✅ done |
| 5 | Sample frames (6) | `identity/sample_0*.jpg` · `identity/samples_contact_sheet.jpg` | ✅ rendered from the production code |
| 6 | 3D medical assets | `web/scene_*.js`, `web/models/build_figure.py` | ✅ eight scenes |
| 7 | Timeline, captions, sound | `web/reel.html` (19 shots) · `web/data/captions.json` · `scripts/music.py`, `scripts/sfx.py`, `scripts/mix.py` | ✅ |
| 8 | Final video + subtitles | `out/summer_heat_reel.mp4` · `out/captions.srt` (not in git: public repo) | see the latest render |

The doctor's logo and name lockup ("د. أبو بكر أحمد سند" / "أخصائي الجهاز الهضمي والكبد والمناظير") sit top left on every shot; the end card shows them large with the Facebook handle.

## Building the reel

Inputs: the narration MP3 (ElevenLabs export) and the code in this folder.

```bash
cd summer-heat/web
python3 models/build_figure.py                       # sculpted figure -> models/figure.bin (~10 s)

# 1. align the narration to the script (word timings drive every shot, label and caption)
#    segs.json = Whisper text per pause-separated segment, sil.txt = pauses (ffmpeg silencedetect), vo.wav = 16-bit mono
python3 align_vo.py segs.json sil.txt vo.wav          # -> data/captions.json, ../out/captions.srt

# 2. frames (JPEG, 3D at 0.85 scale + FXAA: ~2 s/frame on CPU-only SwiftShader, ~2 h for 3,891 frames)
node render.mjs --page reel.html --query "rs=0.85&msaa=0" --jpg --fps 30 --dur 129.7 --workers 3 --out ../renders/frames
node render.mjs --page reel.html --preview 20,45.8,68.6 --out ../renders/preview          # spot checks (PNG)

# 3. audio: original music + sound design + narration, mixed to -14 LUFS / -1.5 dBTP
cd .. && python3 scripts/music.py audio/music.wav && python3 scripts/sfx.py audio/sfx.wav
python3 scripts/mix.py path/to/Voiceover.mp3          # -> audio/voice.wav, audio/mix.wav

# 4. encode: 1080x1920, 30 fps, H.264 High CRF 17 (BT.709) + AAC 256k
scripts/encode.sh                                     # -> out/summer_heat_reel.mp4
```

Requirements:
- Node + Playwright with Chromium; WebGL runs through SwiftShader, no GPU needed.
- Python 3 with numpy, scipy, soundfile and scikit-image.
- FFmpeg.
- For the alignment step: sherpa-onnx with a Whisper model (large-v3 was used).

`web/core.js` takes `rs` (3D render scale) and `msaa` (samples) from the page URL. The defaults (`rs=1`, `msaa=4`) are what the sample frames and identity board use.

## Limitations

- **No stock footage or generated photos** (not reachable from this environment). The "person in the heat" moments use a sculpted clay figure, and the summer table is a 3D still life.
- **Stylised anatomy:** organs and vessels are anatomically placed and recognisable, but not photoreal medical scans.
- **Illustrative numbers** are labelled as such on screen (the blood-flow chart and the gastric-emptying bars). The sourced figure, about 50% of cardiac output to the skin in severe heat stress, carries its reference.
