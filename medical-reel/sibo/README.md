# SIBO: premium medical reel (Dr. Abobakr Sanad)

## Status

| Deliverable | Where | Status |
|---|---|---|
| 1. Fact-check report | `docs/01_fact_check_report_ar.md` (Egyptian Arabic) · `docs/01_fact_check_report.md` (English, with references) | ✅ done; waiting on the doctor's answers to 4 questions |
| 2. Corrected script (Egyptian Arabic, with a line-by-line explanation and pronunciation) | `docs/02_final_script.md` · `script/final_script_ar.txt` | ✅ done |
| 3. Timestamped storyboard | `storyboard/storyboard.md` | ✅ done |
| 4. 3D scenes and motion-graphics assets | `web/three_scenes.js` (3D) · `web/reel.html` (motion graphics, captions, branding) | ✅ built |
| 5. Preview MP4: every scene in order, music, sound effects, captions; placeholders where the doctor appears | `out/sibo_preview.mp4` (not in git) | ✅ rendered |
| 6. Final MP4 with the doctor's voice and on-camera shots | `out/sibo_final_reel.mp4` via `build_final.sh` | ⏳ needs the recording |
| 7. Arabic subtitle file | `out/captions_preview.srt` (estimated timings) | ✅ preview; re-timed to the recording for the final |

## Changes from the original brief

- **3D engine:** **three.js** (WebGL) instead of Blender. The Blender (`bpy`) download stalled at 3.8 of 402 MB on this network, while three.js installs from npm, which works here.
  - The scenes are real 3D: geometry, physical materials, lights, camera moves and particle systems.
  - They are rendered frame by frame in headless Chromium (software WebGL).
  - Everything is modelled procedurally, with no stock assets or AI images. The look is clean, stylised medical 3D, not photoreal anatomy.
- **No stock footage or generated photos:** none are reachable from this environment.
- **History scene:** text and line drawings only, with no invented portraits.
- **Endoscopy clips:** not used. They show a colonoscopy, which is not how SIBO is diagnosed, so they would mislead in this context.
- **Doctor's inset in the chart scene:** uses the cinematic portrait made from his earlier footage.

## The 3D scenes

All scenes are in `web/three_scenes.js`.

**Torso and anatomy:**
- **Holographic torso** (fresnel shader, scan-line reveal) with an animated abdominal bulge.
- **Digestive tract:** oesophagus and J-shaped stomach; duodenal C-loop; small-intestine coil, with a travelling peristaltic wave; colon with haustra, cecum and appendix; a faint liver; the ileocecal valve as a glowing ring.

**Inside the small intestine:**
- The lining has circular folds (plicae circulares) and about 14,000 villi.
- An "endoscope" light travels with the camera.
- Bacteria are rods and cocci; their number grows from "normal, few" to "overgrowth".
- Food particles and fermentation gas bubbles: H₂ in cyan, CH₄ in amber.

**Other scenes:**
- **Cut-away segment:** shows gas building up and the wall distending.
- **B12 absorption:** about 1 in 3 of the B12 particles are intercepted by bacteria before reaching the wall.
- **Breath test:** a glass of test solution, then an analyser with a live H₂/CH₄ screen ("illustrative values") and a collection bag.

## How to rebuild

```bash
cd sibo/web
node render.mjs --page reel.html --preview 5,20,30 --out ../renders/preview        # stills
node render.mjs --page reel.html --dur 97.5 --out ../renders/frames --workers 4    # all frames (~50 min on 4 CPU cores)
```

- **Caption text and timing:** edit `web/data/transcript.txt`, then run `python3 ../project/scripts/captions.py` with `DATA=../sibo/web/data`.
- **Scene timing:** the `SHOTS` table in `web/reel.html`.

## Final version with the doctor's recording

Record the corrected script (see the recording notes in `docs/02_final_script.md`), then run:

```bash
./build_final.sh path/to/recording.mp4
```

Before the render step, re-time `web/data/transcript.txt` and the `SHOTS` table to his real speech.
