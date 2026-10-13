# السيلياك · 2D cartoon episode

A vertical (1080×1920, 30 fps) Egyptian Arabic cartoon episode about celiac disease, presented by Dr. Abobakr Ahmed Sanad.
It has real character animation: posable vector rigs with walk cycles, gestures, blinking, expressions and talking mouths, a living bread character, immune "soldiers", gluten grains and animated villi.
Everything is drawn in code on an HTML canvas, captured with Playwright and encoded with ffmpeg. The music and sound effects are synthesized.

## Deliverables (`out/`)
| File | What |
|------|------|
| `final_animation.mp4` | The episode: H.264 + AAC, 1080×1920, 30 fps |
| `thumbnail.png` | Poster frame |
| `contact_sheet.png` | Overview of the whole episode |
| `captions.srt` | Egyptian Arabic subtitles (also burned in) |

## Narration
The brief's script didn't arrive, so the narration was **drafted and fact-checked** for this episode. See:
- `docs/voiceover_elevenlabs.md`: the full script, ready to paste into ElevenLabs.
- `docs/fact_check.md`: what was verified and corrected. In particular, the Dicke / Hunger Winter account is told accurately: he suspected wheat before the war, and the famine confirmed it.

**There is no voice yet.** The current render has subtitles, music and sound effects, timed at a natural planned pace.
To add the recording:
1. Upload it as `audio/voiceover.mp3` (ElevenLabs, or the doctor's own voice).
2. Measure the sentence spans with `ffmpeg -i audio/voiceover.mp3 -af silencedetect=noise=-34dB:d=0.12 -f null -`.
   Write one `[start, end]` per sentence (30, in the order of `SENTENCES` in `scripts/timing.py`) to `audio/vo_spans.json`.
3. Run the build below. Every action is keyed to a narration phrase, so the whole cartoon follows the voice, and
   `scripts/vo_envelope.py` drives Dr. Sanad's mouth from the real audio.

## Build
```bash
npm install                     # playwright (Chromium)
python3 scripts/timing.py       # -> src/timing.json (scene starts + caption phrases)
python3 scripts/vo_envelope.py  # (with a voiceover) -> src/vo_env.json for lip movement
python3 scripts/audio.py        # -> audio/music.wav, audio/sfx.wav  (cues: audio/cues.json)
node scripts/captions.mjs && cp out/captions_ar.srt out/captions.srt
node scripts/render.mjs         # -> out/silent.mp4   (review frames: --stills 5,30,60)
./scripts/mix.sh                # -> out/final_animation.mp4, thumbnail.png, contact_sheet.png
```
To preview interactively, serve the folder (for example `npx serve .`) and open `src/index.html`; Space pauses.

## Project layout
```
src/rig.js      character rigs + props (reusable): drawPerson(look, pose), CAST models, drawBread,
                drawGluten, drawImmune, drawVilli. Character sheets: src/sheet.html, src/sheet2.html
src/film.js     the 8 scenes, transitions, subtitles, watermark (one function per scene)
src/config.js   doctor name, specialty, logo
scripts/        timing.py, audio.py, captions.mjs, render.mjs, mix.sh, vo_envelope.py
assets/         fonts, logo, doctor_reference.png (the model reference for Dr. Sanad's rig)
```

### The character rig
`drawPerson(ctx, CAST.sanad, { x, y, s, flip, lean, headTilt, legs: 'stand'|'walk'|'sit', walk,
arms: { l: [shoulder, elbow, hand], r: [...] }, belly, face: { mood, blink, talk }, look: [dx, dy] })`

- **Hands:** `fist`, `open`, `point` or `thumb`.
- **Moods:** `neutral`, `happy`, `worried`, `sad`, `tired`, `surprised`, `pain` or `sly`.
- **Cast:** Dr. Sanad, Karim (patient), clinic doctor, Dr. Dicke, two children, nurse, and a Dutch man and woman. Add a new character by adding a `CAST` entry.

## Scenes
1. **Bread hook (kitchen):** bread lands, Karim lifts it, and the bread comes alive with a sly face. A friend eats bread happily (it's fine for most people), and Dr. Sanad wags his finger: «مش عند كل الناس».
2. **The long road (clinic):** Karim walks in bloated and tired. The doctor considers IBS, weeks pass, and she picks up the magnifying glass: further investigation is needed.
3. **Inside:** immune soldiers treat gluten grains as enemies, then wheat, barley and rye, then the villi absorbing food until the attack makes them wilt. Comparison cards: celiac vs wheat allergy vs intolerance.
4. **History (sepia, labelled as an educational reconstruction):** Dicke's office, the Hunger Winter queue at an empty bakery, the ward where the children improve and then relapse when the bread truck returns, and his research.
5. **Symptoms:** Karim acts out bloating, anaemia, fatigue, bone (calcium and vitamin D) and an itchy rash; someone else has no clear symptoms.
6. **Diagnosis:** Dr. Sanad leads the antibody blood test. Karim nearly throws his bread away and is stopped ("keep eating gluten until you're tested"). Then endoscopy, biopsy and microscope.
7. **Treatment:** the bread slides off, rice, corn and potato characters hop on, certified gluten-free oats appear, and the villi regrow over time.
8. **Closing:** Dr. Sanad waves and gestures with the logo, his name, his specialty and «أساس العلاج الصح هو التشخيص الصح».
