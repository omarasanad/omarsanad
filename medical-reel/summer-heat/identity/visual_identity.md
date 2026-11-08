# Summer Heat × Human Physiology: visual identity

**Visual references:**
- `identity_board.jpg`: palette, type and components.
- Six sample frames: `sample_01` … `sample_06` (all six on one page: `samples_contact_sheet.jpg`).

**How it's built:** the frames are rendered from the actual production code (`web/`), not mock-ups. They come out of the same pipeline that will produce the video.

## Concept

The viewer starts in the heat of an Egyptian summer and travels inside the body.
- **Warm** colours mean the outside world and external heat: the sun, the watermelon, the skin flushing.
- **Cool** colours mean internal physiology: clinical blue for structure, muted teal for the body's own regulation.
- **Warm red** is reserved for emergencies.

The look is a bright, warm, editorial medical documentary, the opposite of the dark navy and neon-cyan SIBO reel.

## Palette

| Role | Name | Hex | Use |
|---|---|---|---|
| Background | Ivory | `#F6F0E6` | Default background, studio cove |
| Background | Paper | `#FCFAF6` | Caption strips, label pills |
| Background | Sand | `#E8DCC8` | Panels, dividers |
| Background | Beige | `#D9C8AE` | Plinths, secondary surfaces |
| Medical | Clinical blue | `#1F3A5F` | Headlines, labels, structure |
| Medical | Blue | `#3D6A93` | Scientific terms (italic) |
| Medical | Anatomical pink | `#E8A39A` | Tissue, cells |
| Medical | Muted teal | `#4E8C88` | Regulation: sweat glands, tight junctions, "normal" |
| Heat | Amber | `#E9A23B` | Sunlight, the progress "sun line" |
| Heat | Sunlit orange | `#F08A3C` | Warm highlights |
| Heat | Burnt coral | `#D9583B` | Key words, numbers, heat effects |
| Heat | Warm red | `#B83A2E` | **Emergency only** (heat stroke band) |

**Not used:** dark navy full-frame backgrounds, glowing cyan or turquoise borders, neon.

## Typography (all SIL Open Font License)

| Font | Role |
|---|---|
| **Alexandria** (300 / 700 / 900) | Editorial headlines. Black + Light contrast: "اسمع **لجسمك**". |
| **IBM Plex Sans Arabic** (400 / 600) | Body text, labels, kickers, footnotes. |
| **Fraunces Italic** | Latin scientific terms: *Splanchnic circulation*, *Tight junctions*. |
| **Amiri** | Spoken quotes: «أكيد أخدت برد في معدتي». |

## Components

- **Sun line:** a thin amber-to-coral line along the top edge that fills as the video progresses.
- **Kicker** (top right): chapter number in Alexandria Light + rule + chapter name, in coral.
- **Brand mark** (top left): the doctor's round logo, 84 px.
- **Label with leader line:** Plex label + italic term; a line from the label's nearest edge to a dot on the anatomy. Paper "pill" behind it when sitting over 3D.
- **Caption strip:** paper card with a coral spine on the right (RTL start); Alexandria 700, key words in coral or teal; lower safe area.
- **Chip:** outlined pill for states ("طبيعي", "إجهاد حراري شديد", "أغلب الأدلة من الحيوانات").
- **Source line:** every number on screen carries its source in small italic type.

## Composition rules

- Every scene has a different layout:
  - full-bleed 3D;
  - top/bottom split;
  - stacked comparison;
  - full-screen data;
  - macro;
  - editorial column beside a sculpture.
- At most one caption and three labels per frame.
- Faces stay unobstructed when the doctor is on camera.
- The rendering pipeline (post-processing) adds a warm/cool split-tone grade, gentle vignette, film grain, sun glow, and heat-haze shimmer for heat scenes only. Depth of field is used for macro shots.

## 3D assets (procedural, built in code)

| Asset | File | Contents |
|---|---|---|
| Summer still life | `web/scene_watermelon.js` | Watermelon round cut into wedges (one lifts), whole striped melon, seeds, condensation, ice, juice drop, sunlit linen, sky dome with foliage bokeh |
| Sculpted figure | `web/models/build_figure.py` → `figure.bin` | Faceless clay mannequin, hand on the upper abdomen, generated as a signed-distance field + marching cubes |
| Body / circulation | `web/scene_body.js` | The figure turns to frosted glass. Inside: oesophagus, stomach, small intestine, colon, liver, kidneys, heart, aorta, iliacs, celiac trunk (splenic, hepatic, left gastric), SMA + jejunal branches, IMA, IVC, portal vein. Animated red-cell flow; adjustable gut flow vs. skin flush |
| Skin cross-section | `web/scene_skin.js` | Epidermis, dermis, fat lobules; coiled sweat glands and ducts, hair follicle, deep and superficial vascular plexus, capillary loops that dilate, sweat beads, vapour |
| Intestinal barrier | `web/scene_barrier.js` | Epithelial cells with nuclei, microvilli, tight-junction strands, basement membrane, capillary, endotoxin particles; "normal" vs "severe heat stress" |
| Microbiome | `web/scene_microbiome.js` | Rods, cocci chains, spirals, vibrios and translucent cocci, in macro depth of field |
| Porcelain stomach | `web/scene_stomach.js` | Editorial sculpture for the warning-signs section |

## Limitations

- **No stock footage or generated photos:** they cannot be reached from this environment. The "person in the summer heat" and "doctor examining a patient" moments are shown with the sculpted figure and editorial typography instead.
  - Real phone footage (watermelon being cut in sunlight, the doctor's closing line) can replace them; the edit will slot it in.
- **Stylised anatomy:** organs and vessels are anatomically placed and recognisable, but not photoreal medical scans.
