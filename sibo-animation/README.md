# SIBO · 2D cartoon episode with Dr. Abobakr Sanad

A vertical (1080×1920, 30 fps) Egyptian Arabic cartoon about **SIBO** (فرط نمو البكتيريا في الأمعاء الدقيقة), presented by Dr. Abobakr Ahmed Sanad.
The doctor is **one layered cartoon character** built from the approved model sheet (`assets/character/doctor_sheet.png`). He talks, blinks, moves his head and brows, changes expression with the narration, gestures, and points at the illustrations.
The supporting illustrations are animated separately: the patient's swelling belly, the gut map with moving bacteria, gas building up inside the intestine, the history reconstruction, symptoms, the breath test, treatment and the closing.

## Deliverables
| File | What |
|------|------|
| `out/final_sibo_animation.mp4` | The episode (H.264 + AAC) |
| `out/captions.srt` | Egyptian Arabic subtitles (also burned in) |
| `out/thumbnail.png`, `out/contact_sheet.png` | Poster frame and an overview of the whole episode |
| `assets/character/doctor_cartoon.png` | The doctor, transparent, assembled from the rig layers |
| `assets/character/rig/` | The reusable rig layers (see below) |
| `test/rig_test.mp4` | 8-second lip-sync test of the rig (see "Verification") |

## The doctor rig (`src/doctor_rig.js`, built by `scripts/build_rig.py`)
The model sheet is a set of finished illustrations, not layered artwork. `build_rig.py` keys out the background and cuts the sheet into separate layers:

| Layer | Animation |
|-------|-----------|
| `torso.png` (coat, tie, stethoscope, legs) | Breathing, subtle sway |
| `head.png` on a neck pivot | Tilt, nods on speech accents, small drift and bob |
| `mouth_rest / mid / open / round / smile / concern` | Mouth shapes from the sheet's expression busts, cross-faded and stretched by the voice level |
| Eyelids | Drawn procedurally: natural irregular blinks, sometimes a double blink |
| `brow.png` | Lifts on emphasis |
| `upper_concern / upper_surprise` | Brow and eye expressions, blended in by narration mood |
| `forearm.png` | Rotates at the elbow and gestures with the speech |
| `hand_point.png` | The index-finger hand (from the "Explaining" bust), swapped in when he points |

Each feature patch is registered against the neutral head and feathered, so the expressions blend on one face. The video never shows the sheet, and never swaps whole-character pictures.

**Lip-sync, stated honestly:** the mouth is driven by the narration audio itself. `scripts/vo_envelope.py` measures every frame's loudness, a syllable-level opening (loudness relative to its local min and max, so the mouth closes between syllables) and spectral brightness.
- The mouth opens and closes on the voice's syllables, and the opening scales with the level.
- Dark-sounding vowels pick the rounded shape.
- It isn't phoneme-recognition lip sync: there are 6 mouth shapes chosen from the audio, not one per Arabic sound.

**No SIBO voiceover has been uploaded yet.** Until it exists, the film uses a placeholder syllable track built from the caption timing, so the preview isn't frozen. The full lip-sync switches on automatically once the recording is added.

## Adding the voiceover (required for real lip-sync)
1. Record the script in `docs/voiceover_elevenlabs.md` and upload it as `audio/voiceover.mp3`.
2. Measure the sentence spans with `ffmpeg -i audio/voiceover.mp3 -af silencedetect=noise=-34dB:d=0.12 -f null -`.
   Write one `[start, end]` per sentence (25, in the order of `SENTENCES` in `scripts/timing.py`) to `audio/vo_spans.json`.
3. Run the build below. Scenes, captions and SFX are keyed to the narration phrases, and the mouth follows the audio.

## Build
```bash
npm install                     # playwright (Chromium)
python3 scripts/build_rig.py    # model sheet -> assets/character/rig/*  (only when the sheet changes)
python3 scripts/timing.py       # -> src/timing.json
python3 scripts/vo_envelope.py  # (with a voiceover) -> src/vo_env.json for lip-sync
python3 scripts/audio.py        # -> audio/music.wav, audio/sfx.wav  (cues: audio/cues.json)
node scripts/captions.mjs && cp out/captions_ar.srt out/captions.srt
node scripts/render.mjs         # -> out/silent.mp4   (review frames: --stills 5,30,60; test page: --page rigtest.html)
./scripts/mix.sh                # -> out/final_sibo_animation.mp4, thumbnail.png, contact_sheet.png
```

## Verification
`test/rig_test.mp4` is an 8-second test: the rig on its own, pointing at an animated intestine, with lip-sync from real audio.
The test audio is an excerpt of the earlier (celiac) voiceover, used only because the SIBO recording doesn't exist yet. Checked frame by frame in the exported MP4:
- one doctor;
- clean crop;
- the mouth opens on loud syllables and closes in the gaps;
- the head, brows, arm and body keep moving.

## Scenes
1. **Hook:** the patient's belly inflates like a balloon after eating, and the doctor walks in.
2. **Misdiagnosis:** clinic after clinic, "IBS" each time. IBS is real, but persistent symptoms may need more investigation.
3. **SIBO intro:** gut map. Few bacteria in the small intestine, many in the colon, then bacteria crowd into the wrong place. The doctor points at the small intestine.
4. **Mechanism:** bacteria feed on the food, gas bubbles build up and the intestine swells. The doctor points at it.
5. **History** (sepia, labelled «إعادة تمثيل تعليمية»): Metchnikoff, the blind loop and B12, Pimentel (2000). The presenter stays out of the reconstruction.
6. **Symptoms:** bloating, diarrhoea, fatigue, B12. These aren't specific to SIBO.
7. **Breath test:** sugar solution, then H₂/CH₄ measured at intervals and interpreted by the doctor. No invented numbers.
8. **Treatment:** decided by the doctor, with no drug names. Treat the overgrowth, adjust the diet, treat the cause, follow up.
9. **Closing:** «أساس العلاج الصح هو التشخيص الصح», with the doctor's name and specialty.

Fact-checking notes are in `docs/fact_check.md`.
