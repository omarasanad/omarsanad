# Summer Heat & Digestive Health: medical documentary reel (Dr. Abubakr Ahmed Sanad)

## Status

| # | Deliverable | Where | Status |
|---|---|---|---|
| 1 | Medical fact-check report | `docs/01_fact_check_report.md` (English, with references) · `docs/01_fact_check_report_ar.md` (Egyptian Arabic, for the doctor) | ✅ done; 4 questions for the doctor |
| 2 | Final corrected script (Egyptian Arabic) | `docs/02_final_script.md` (narration + explanation + on-screen text) · `script/final_script_ar.txt` · `script/elevenlabs_script.txt` (+ `_plain`) | ✅ done; needs the doctor's approval |
| 3 | Timestamped storyboard | `storyboard/storyboard.md` | ✅ v1 (estimated timings) |
| 4 | Visual identity reference | `identity/visual_identity.md` · `identity/identity_board.jpg` | ✅ done |
| 5 | Sample frames (6) | `identity/sample_0*.jpg` · `identity/samples_contact_sheet.jpg` | ✅ rendered from the production code |
| 6 | 3D medical assets | `web/scene_*.js`, `web/models/build_figure.py` | ✅ six scenes built; the remaining storyboard scenes are next |
| 7 | Final video + subtitles | `out/` | ⏳ needs the narration (doctor's recording or ElevenLabs) |

## Rebuilding

```bash
cd summer-heat/web
python3 models/build_figure.py                 # generates models/figure.bin (sculpted figure, ~10 s)
node render.mjs --page samples.html --preview 1,2,3,4,5,6 --out ../renders/samples
node render.mjs --page identity_board.html --preview 0 --out ../renders/board
node render.mjs --page test.html --preview "body:3:enter,skin:2,barrier:4"   # single scenes
```

Requirements:
- Node + Playwright with Chromium; WebGL runs through SwiftShader, no GPU needed.
- Python 3 with numpy and scikit-image (for the figure).
- FFmpeg.

## Next, once the narration exists

1. Align the narration to the script, word by word, using the same pipeline as the SIBO reel.
2. Build the full timeline: all storyboard scenes, transitions (sunlight, heat haze, anatomical zoom, macro to micro, vascular match cut), captions, sound design and music.
3. Render, then run QA (caption sync, RTL text, black or frozen frames, loudness).
