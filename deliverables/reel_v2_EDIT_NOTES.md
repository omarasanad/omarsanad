# Reel v2: editing summary

**File:** `reel_v2_broll_1080x1920.mp4`. It is 1080×1920 (9:16), H.264 High at 60 fps, with AAC 256 kbps / 48 kHz audio. It runs 53.3 s: 50.8 s of speech plus a 2.5 s branded end card. Loudness is −14.3 LUFS integrated, with peaks at −1.0 dBFS.

## Layout system

The edit uses three layouts. Animated moves between them replace hard cuts.

- **Speaker:** the speaker fills the screen, with slow digital push-ins (3–7%).
- **Split:** a brand-navy graphic panel sits on top (0–880 px) and the speaker is below. The panel slides down from the top while the speaker pushes down into the lower half.
- **Full:** a full-screen graphic, with the speaker in a teal-ringed circle at the top right. The speaker shrinks into the circle, which reveals the graphic behind.

Captions move with the layout so they never cover the face: chest level in Speaker, the bottom of the graphic panel in Split, and the lower third in Full.

## Timestamped edit (final video time)

| Time | Narration | Layout / transition | Visual |
|---|---|---|---|
| 0.0–1.5 | كام مرة قلت لنفسك | Speaker, slow push-in | Hook on the face |
| 1.5–3.7 | دي شوية حموضة وهيروح لحاله | → Split (panel slides down, whoosh) | Stomach illustration pops in, animated flames and heat waves rise, red "حموضة" label |
| 3.7–4.7 | أو ده قولون عصبي؟ | Horizontal push inside the panel | Colon illustration with pulsing spasm marks, "قولون عصبي" label |
| 4.7–6.3 | وغالبًا… | → Speaker | Face |
| 6.3–8.6 | وكتير استحملت الوجع اللي إنت فيه | → Full (shrink to circle) | Intestinal-pain icon with expanding pain pulses, "الوجع" in coral, "اللي إنت فيه" sub-label |
| 8.6–12.0 | الحقيقة… إنت مش مضطر… تستحمل الوجع ده | Cross-dissolve → Speaker, slow push-in | Card above his head: "إنت مش مضطر / تستحمل الوجع", with a red line striking through "تستحمل الوجع" (swish) |
| 12.0–15.7 | حالات كتيرة جدًا بشوفها في العيادة… | → Split (mask reveal) | "في العيادة" header with hospital icon and a grid of patient icons popping in one by one (no numbers implied) |
| 15.7–20.9 | بعد ما الوجع بدأ يأثر على حياتها اليومية… | → Full | Three daily-life icons (sleep, eating, walking). As "يأثر" is spoken, a red wave crosses them: rings turn coral, icons dim and warning badges pop. "حياتها اليومية" title draws in. The tiles shake on "مشاكل" |
| 20.9–25.9 | يعمل لها مشاكل كتير جدًا / أنا دكتور أبوبكر أحمد سند | Circle grows back → Speaker | At 24.0 the **logo card** slides in above his head |
| 25.9–29.4 | أخصائي الباطنة والجهاز الهضمي والكبد والمناظير | → Split | The logo moves up into the panel, and four specialty tiles pop in **on each spoken word**: internal medicine, digestive system, liver, endoscopy (custom endoscope drawing) |
| 29.4–33.4 | وجاي لك أقول لك ما تستهونش بالألم اللي موجود معك | → Speaker, 7% push-in | Kept on the face for the emotional direct address |
| 33.4–37.4 | أنا موجود معك في مركز النهضة الطبي بشبين القناطر | → Full | Stylised street-grid background (not a real map) slowly zooms out. A pin drops in with a bounce, thud and ripples. Card "مركز النهضة الطبي" appears, then "شبين القناطر" when it is spoken |
| 37.4–41.7 | عشان نبدأ واحدة واحدة نوصل للتشخيص الطبي الصح | → Split | "واحدة.. واحدة" step indicator fills dot by dot. A magnifier scans a stomach outline. "التشخيص الصح" appears with a check mark (ding) |
| 41.7–47.1 | باستخدام أحدث الأجهزة الطبية وعن طريق التحاليل والإشاعات المناسبة | → Full | Three cards wipe in **as each item is spoken**: ultrasound scanner (animated waves), lab tubes (rising bubbles), X-ray (moving scan line). Earlier cards dim when the next one arrives |
| 47.1–50.6 | عشان توصل للعلاج الصح | → Split | Chip "التشخيص الصح", an arrow draws to "العلاج الصح" (pills icon), and a large check mark draws in (ding) |
| 50.6–53.3 | (end) | Speaker fades out as the panel fills | End card: logo plus "مركز النهضة الطبي · شبين القناطر", music swell, fade out |

## Sound

- **Narration:** the original voice. Noise was reduced, it was lightly EQ'd and compressed, then normalised. It stays the main element.
- **Music:** an original ambient bed composed for this video (A minor → F → C → G at 96 bpm: soft pad, sub bass and gentle plucks). It sits about 13 dB under the voice and is ducked further while he speaks.
- **Sound effects:** subtle whooshes on layout changes, soft pops and ticks on reveals, a pulse for pain, a swish for the strike-through, a thud for the map pin, and a ding for each check mark. All were synthesised for this video.

## Assets and licensing

| Asset | Source | License (verified from the package metadata) |
|---|---|---|
| Medical icons (stomach, colon, intestinal pain, hospital, person, sleepy, nutrition, walking, alert, liver, magnifier, ultrasound scanner, test tubes, X-ray, pills, location, hospital symbol) | Health Icons, by Resolve to Save Lives, via npm `@iconify-json/healthicons` 1.2.13 | MIT |
| Internal-medicine icon | Medical Icons, by Samuel Frémondière, via npm `@iconify-json/medical-icon` 1.2.0 | MIT |
| Cairo font | Google Fonts repository (`ofl/cairo`) | SIL Open Font License 1.1 |
| Logo | Supplied by you | Yours |
| Flames, endoscope, map grid, pin, check marks, all animations | Made for this video | Original, no third-party rights |
| Music and sound effects | Synthesised for this video | Original, no third-party rights |

No stock video or photographs were used. The environment's network policy blocked every stock source tried (Pexels, Pixabay, Unsplash, Wikimedia Commons, Openverse, Freesound), so all B-roll is custom animated illustration.

## Limitations

- **No real stock footage.** If you want real clinic or equipment footage, send clips (ideally from your own clinic) and they can go in place of the illustrated scenes at the same timestamps.
- **Unclear phrase.** One phrase around 4.8–6.3 s ("وغالبًا…") could not be transcribed reliably, so the caption shows only "وغالبًا…".
- **Resolution.** The speaker footage is upscaled from a 464×832 source. The graphics are native 1080×1920.
