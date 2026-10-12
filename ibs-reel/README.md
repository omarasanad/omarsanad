# القولون العصبي (IBS) · medical motion reel

A vertical (1080×1920, 30 fps, about 54 s) Egyptian Arabic educational reel on irritable bowel syndrome,
presented by Dr. Abobakr Sanad's character. The video is entirely code. `src/film.js` paints any frame from
`window.seek(t)`, Playwright captures the frames, ffmpeg encodes them, and numpy synthesizes the music and sound effects.

## Deliverables (`out/`)
| File | What |
|------|------|
| `final.mp4` | The reel: H.264 + AAC, 1080×1920, 30 fps |
| `preview.png` | Poster frame |
| `contact_sheet.png` | Overview of the whole timeline |
| `captions_ar.srt` | Egyptian Arabic captions |

## Voiceover
No Egyptian voice generator is available in the build environment, so the current render has **captions + music + SFX only**.
`docs/voiceover_elevenlabs.md` has the ElevenLabs-ready script. To add the voice:
1. Save the recording as `audio/voiceover.mp3` (or `.wav`).
2. Measure the sentence spans: `ffmpeg -i audio/voiceover.mp3 -af silencedetect=noise=-34dB:d=0.12 -f null -`.
   Write one `[start, end]` per sentence (20, in the order of `SENTENCES` in `scripts/timing.py`) to `audio/vo_spans.json`.
3. Run `python3 scripts/timing.py && python3 scripts/audio.py && node scripts/captions.mjs && node scripts/render.mjs && ./scripts/mix.sh`.
   Every scene, label, sound cue and caption is keyed to `src/timing.json`, so it all follows the voice.
   The mix side-chain ducks the music under the voice.

## Build
```bash
npm install                     # playwright (Chromium)
python3 scripts/cutout.py       # assets/doctor.png -> assets/doctor_cutout.png (needs numpy, scipy, pillow)
python3 scripts/timing.py       # -> src/timing.json (scenes + captions)
python3 scripts/audio.py        # -> audio/music.wav, audio/sfx.wav (cues in audio/cues.json)
node scripts/captions.mjs       # -> out/captions_ar.srt
node scripts/render.mjs         # -> out/silent.mp4 (--stills 3,12,40 for review frames)
./scripts/mix.sh                # -> out/final.mp4, preview.png, contact_sheet.png
```
Doctor name, specialty, Facebook page and the image/logo paths live in `src/config.js`.
Leave `doctorName` empty to show an editable placeholder plate.

## Scenes
1. **Hook:** the doctor enters with a camera push, and question chips pop up. He then shrinks into a presenter bubble and the cartoon gut appears with «ممكن يكون القولون العصبي؟».
2. **What is IBS:** clay-style colon and small intestine with irregular peristalsis, a gut–brain link, and symptom labels. Discomfort shows as pulses, bloating as swelling, and constipation/diarrhoea as alternating slow and fast motion.
3. **Triggers:** stress and food tiles, plus three people with different triggers, to show that triggers differ between people.
4. **What helps:** four animated tips (symptom diary, meal times, water, movement), then "persistent symptoms? see a doctor".
5. **Warning:** the doctor full frame with an alert icon, «الأعراض المقلقة محتاجة تقييم طبي», blood in the stool, and unexplained weight loss.
6. **Closing:** «متشخّصش نفسك بنفسك», logo, name, specialty, «صحتك تبدأ بالمعلومة الصح», follow button, and Facebook page.

The doctor's logo is a watermark through every scene. The presenter bubble has a speaking meter that follows the narration.

## Medical content
- IBS is presented as a disorder of gut–brain interaction that affects how the bowel works. Nothing shows inflammation or damage.
- Stress and food are presented as things that can *worsen* symptoms, with triggers that differ from person to person. Stress is not presented as the cause.
- No diet, medicine or dose is recommended.
- Blood in the stool and unexplained weight loss are flagged for medical evaluation, consistent with ACG guidance on alarm features.
