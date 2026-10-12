# H. pylori — جرثومة المعدة · medical motion reel

A vertical (1080×1920, 30 fps, about 50 s) Egyptian Arabic educational reel about *Helicobacter pylori*.
The whole video is code. `src/film.js` paints any frame on an HTML canvas through `window.seek(t)`,
Playwright screenshots every frame, ffmpeg encodes the result, and the score and sound effects are
synthesized with numpy.

## Deliverables (`out/`)

| File | What |
|------|------|
| `out/final.mp4` | The finished reel: H.264 + AAC, 1080×1920, 30 fps |
| `out/preview.png` | Poster frame (the hook) |
| `out/contact_sheet.png` | 30-frame overview of the whole timeline |
| `out/captions_ar.srt` | Egyptian Arabic captions, which also serve as the voiceover timing guide |
| `audio/music.wav`, `audio/sfx.wav` | The synthesized score and sound effects as separate stems |

## Things you need to add

1. **Doctor portrait.** Put the stylized portrait at `assets/doctor_stylized.png`. A transparent
   cutout at `assets/doctor_cutout.png` is optional and enables layered parallax. When the file is
   missing, scene 6 shows a neutral silhouette marked «صورة الدكتور».
2. **Name and handle.** Set `doctorName` and `doctorHandle` in `src/script.js`. While they're empty,
   the end card shows a dashed placeholder plate.
3. **Voiceover.** No Egyptian Arabic voice generator was available in the build environment, so the
   reel ships **without narration**. The captions carry the script, and the music and sound effects
   are mixed for that. To add the voice:
   - Record the script from `docs/shotlist.md` / `out/captions_ar.srt`, following the caption timings
     (warm, conversational Egyptian, about 2.6 words per second).
   - Save it as `audio/voiceover.wav`, starting at 0.0 s.
   - If your pacing differs, edit the times in `CAPTIONS` in `src/script.js` and re-render, so the
     captions match the voice.
   - Run `./scripts/mix.sh`. It detects the voiceover, side-chain ducks the music under it and
     normalizes to -14 LUFS.

## Build

Requires Node 20+, ffmpeg, and Python 3 with numpy.

```bash
npm install                       # installs playwright (Chromium: npx playwright install chromium)
python3 scripts/audio.py          # -> audio/music.wav, audio/sfx.wav   (edit audio/cues.json for SFX timing)
node scripts/render.mjs           # -> out/silent.mp4   (--fps 30 --workers 4; --nosubs renders without captions)
node scripts/captions.mjs         # -> out/captions_ar.srt
./scripts/mix.sh                  # -> out/final.mp4, out/preview.png, out/contact_sheet.png
```

Preview the film interactively by serving the folder and opening `src/index.html`, for example
with `npx serve .`. It plays with a scrub bar; Space pauses.
Render stills for review with `node scripts/render.mjs --stills 0.5,9,42` (written to `out/stills/`).

## Files

```
src/index.html     canvas + font faces
src/film.js        all six scenes, transitions, captions (pure function of time)
src/motion.js      springs, easing, seeded RNG
src/script.js      narration/caption timing, doctor name/handle, image slots
audio/cues.json    sound-effect cue list
scripts/           render.mjs, audio.py, captions.mjs, mix.sh
assets/fonts/      Cairo, Noto Kufi Arabic, Inter (SIL Open Font License, from Google Fonts)
docs/shotlist.md   scene-by-scene plan
```

## Arabic typography

Text is drawn with `direction = 'rtl'` in Cairo, which has full Arabic shaping. Kinetic effects
animate whole words, never single letters, so the letters always stay joined. Every on-screen
phrase was checked visually in rendered frames.

## Medical content

- The script separates possible symptoms from confirmed infection, says some carriers have no
  symptoms, and points to diagnosis by urea breath test or stool antigen test.
- It describes treatment as clinician-directed (antibiotics plus acid-reducing medication) and
  warns against self-medication.
- It recommends confirming eradication with follow-up testing.
- These points match the ACG 2024 clinical guideline (Chey et al., *Am J Gastroenterol* 2024),
  which recommends a test of cure by UBT, stool antigen or biopsy at least 4 weeks after therapy.
- No drug names, doses, success rates or test results appear. The cassette's result window is
  deliberately left empty.
