# Reel: منظار القولون — إمتى تحتاج تعمله وليه؟

**Video:** `colonoscopy_reel_1080x1920.mp4`. It is 1080×1920 (9:16), H.264 at 30 fps with AAC audio, and runs **94 s**, with the ElevenLabs voiceover you supplied.

**Final version notes:**
- The voiceover (98 s) was sped up to 1.1× so it still sounds natural, then loudness-normalised and lightly EQ'd. Music ducks automatically under the voice.
- Every scene was re-timed to the voice. Each card, label, 3D event and the polyp removal starts on the word that describes it.
- Word-synced Arabic captions are burned in (`colonoscopy_captions_ar.srt` is included). They replace the long on-screen sentences.
- The total is 94 s rather than 60–90 s because the supplied voiceover is 98 s long.

## Important: no voice in this version

No recording of the doctor exists for this topic. I did not generate an artificial voice in his name, because that would put words in a real doctor's mouth. Text-to-speech services were also unavailable in this environment.

So this version is **text-led**. The full message is carried by animated Arabic typography, with original music and sound effects. This format works well for reels, since most people watch with the sound off.

**To add his voice:** the doctor reads the script below. A phone voice note is fine, and the timings are only a guide. Send it over and I'll edit the visuals to his natural pace, then add clean audio, ducked music and subtitles from his actual words.

---

## 1. Voiceover script (Egyptian Arabic) and timing

| Time | Section | Script |
|---|---|---|
| 0–8 | **Hook** | بتخاف من منظار القولون؟ طب تعرف إن المنظار ده ممكن يكتشف مشكلة قبل ما تتحول لحاجة خطيرة؟ |
| 8–14 | What it is | منظار القولون عبارة عن أنبوبة رفيعة ومرنة، في آخرها كاميرا صغيرة ونور. بتدخل من فتحة الشرج وتمشي جوه القولون بهدوء… |
| 14–20 | | …وبنشوف بطانة القولون من جوه على الشاشة بوضوح. |
| 20–25 | Sedation and preparation | وغالبًا بيتعمل تحت تهدئة أو مخدر عشان تبقى مرتاح، وقبله لازم تجهيز للقولون بملين حسب تعليمات الدكتور، عشان الرؤية تبقى واضحة. |
| 25–27 | **When is it needed?** | طب إمتى تحتاج منظار قولون؟ |
| 27–31 | | لو لاحظت دم مع البراز، أو نزيف من فتحة الشرج من غير سبب واضح. |
| 31–36 | | لو حصل تغيير مستمر في طبيعة الإخراج، إمساك أو إسهال، ومالوش تفسير. |
| 36–40 | | لو عندك أنيميا نقص حديد من غير سبب معروف. |
| 40–44 | | لو في اشتباه في التهابات القولون المزمنة أو أي مشكلة تانية مقلقة في الأمعاء. |
| 44–50 | Screening | وكمان للكشف المبكر عن سرطان القولون: الإرشادات الأمريكية الكبرى بتنصح بالبدء من سن ٤٥ للشخص متوسط الخطورة، والتوصيات بتختلف حسب البلد وحسب حالتك. |
| 50–52 | | ولو في تاريخ عائلي أو عوامل خطورة تانية، ممكن نحتاج نبدأ بدري عن كده. |
| 52–55 | | بس خلي بالك: مش كل انتفاخ أو مغص محتاج منظار. |
| 55–59 | **Why it matters** | طب ليه المنظار مهم؟ |
| 59–62 | | لأنه ممكن يكتشف الزوائد اللحمية، اللي بنسميها بوليبات… |
| 62–69 | | …وأحيانًا بنشيلها في نفس الجلسة. |
| 69–75 | | وده بيساعد نمنع أنواع من سرطان القولون قبل ما تبدأ. |
| 75–78 | **Closing** | المنظار مش حاجة تخوفك، لكن الأهم تعرف إمتى تحتاجه. |
| 78–80 | | التجهيز والتخدير ليهم احتياطات، ومفيش إجراء طبي من غير أي مخاطر، علشان كده القرار بيتاخد مع دكتورك. |
| 80–83 | | ولو عندك أعراض مستمرة أو عوامل خطورة، استشير دكتور متخصص. |
| 83–88 | Outro | (logo and location, no speech) |

The script deliberately does **not** promise a painless experience. It says sedation is "for comfort", and it states plainly that preparation and sedation need precautions and that no procedure is risk-free.

## 2. Storyboard and what was built

All 3D visuals were modelled and animated in code (three.js) for this video. No stock footage was used.

| Time | Scene | Visual | Transition |
|---|---|---|---|
| 0–8 | A: Hook | A **3D large intestine** (caecum, appendix, ascending, transverse, descending and sigmoid colon, rectum), with haustra and taeniae, lit in navy and teal, with a slow cinematic camera push. Arabic headline builds word by word | Fade from navy |
| 8–13.5 | B1: How it works | The colon turns translucent. A **flexible scope** enters through the rectum and travels the colon's path to the caecum, with a glowing light at its tip. Labels: "أنبوبة رفيعة ومرنة", then "في آخرها كاميرا ونور" | Camera dives into the scope tip, with a light flash |
| 13.5–20 | B2: Inside the colon | A **first-person endoscopic fly-through**: textured mucosa with blood vessels, circular folds, a wet surface lit by the scope, and depth falloff. Endoscope-style round vignette | — |
| 20–25 | B3: Comfort and preparation | The lumen dims. Cards for "تحت تهدئة أو مخدر" and "تجهيز للقولون بملين" | Cross-fade |
| 25–55 | C: When is it needed | Blurred 3D colon in the background. Numbered icon cards slide in **one at a time**: bleeding, a change in bowel habits, iron-deficiency anaemia, suspected IBD. Then a screening card where the age counter runs up to **45**, with the "US guidelines, depends on your country and case" caveat, then family history, then "مش كل انتفاخ أو مغص محتاج منظار" | Whoosh with a 3D background change |
| 55–69.5 | D: Polyp | Back inside the colon. A **pedunculated polyp** appears on the wall and is marked with a rotating ring and the label "بوليب (زائدة لحمية)". A **snare catheter** comes out of the scope channel, the loop opens around the polyp head, slides to the stalk and tightens. The polyp is removed, leaving a small pale site, and "اتشال" appears | Flash cut into the lumen |
| 69.5–75 | D: Why it matters | Card: "اكتشاف البوليب وإزالته بدري". Diagram: polyp → cancer, crossed out → "بيساعد نمنع أنواع من سرطان القولون" | Dim |
| 75–82.5 | E: Closing | Calm 3D colon. "المنظار مش حاجة تخوفك / الأهم تعرف إمتى تحتاجه", then a precautions card (⚠), then "استشير دكتور متخصص" | Flash |
| 82.5–88 | E: Outro | **The doctor's real footage** (a composed moment from his clinic video where he isn't speaking, slowed down and warm-graded), his logo, and "مركز النهضة الطبي · شبين القناطر" | Fade out |

## 3. Medical verification

| Claim used | Basis |
|---|---|
| Screening starts at **45** for average-risk adults (US) | USPSTF 2021 final recommendation: screening for adults 45–49 (grade B) and 50–75 (grade A). The American Cancer Society and the US Multi-Society Task Force agree on 45 |
| Family history or risk factors may mean **starting earlier** | US Multi-Society Task Force: a first-degree relative with colorectal cancer or an advanced adenoma diagnosed under 60 means colonoscopy from age 40, or 10 years before the relative's diagnosis, whichever is earlier, every 5 years |
| Unexplained **iron-deficiency anaemia** is an indication | BSG guideline (Snook et al., *Gut* 2021): for men and postmenopausal women with iron-deficiency anaemia, upper and lower endoscopy are the first-line GI investigations |
| Bleeding, persistent bowel-habit change, suspected IBD | Standard diagnostic indications for colonoscopy (ASGE appropriate-use guidance) |
| Polyps can be found and **often removed in the same session**, which helps prevent **some** colorectal cancers | National Polyp Study and later cohort data: removing adenomas reduces colorectal cancer incidence and mortality. The wording is hedged ("أنواع من", "بيساعد") |
| **Not risk-free**: preparation and sedation need precautions | ASGE complications position statement: perforation is usually under 0.1% in large studies; bleeding is a few per 1,000, higher after polypectomy; sedation-related heart and breathing events are uncommon |
| Not every case of bloating or abdominal pain needs a colonoscopy | Isolated functional symptoms without alarm features usually don't need one. This is consistent with appropriate-use guidance |

The video shows no rates or percentages. The only number is the age 45, which comes from the US guidelines and is labelled with that caveat on screen.

### Sources
- [USPSTF 2021: screening lowered to 45 (UCLA Health summary)](https://www.uclahealth.org/news/article/colorectal-cancer-screenings-now-recommended-beginning-at-age-45)
- [USPSTF final recommendation coverage (Healio)](https://www.healio.com/news/hematology-oncology/20201125/uspstf-expands-colorectal-cancer-screening-recommendation-to-include-adults-age-45-years)
- [US Multi-Society Task Force recommendations (AJMC)](https://www.ajmc.com/view/us-multi-society-task-forces-new-colorectal-cancer-screening-recommendations)
- [Family-history screening (AAFP, Am Fam Physician 2015)](https://aafp.org/pubs/afp/issues/2015/0115/p93.pdf)
- [BSG guidelines for iron-deficiency anaemia in adults](https://www.bsg.org.uk/clinical-resource/guidelines-iron-deficiency-anaemia-in-adults)
- [BSG IDA guideline full text (Gut 2021)](https://gut.bmj.com/content/gutjnl/70/11/2030.full.pdf)
- [ASGE complications of colonoscopy (position statement)](https://www.asge.org/assets/0/71542/71544/56321364-c4d8-4742-8158-55b6bef2a568.pdf)

**The doctor should review the script before publishing.** He is responsible for local (Egyptian) practice, preparation instructions and how he phrases risks to his patients.

## 4. Assets and licensing
- The 3D colon, scope, lumen, polyp, snare and all animation were built in code for this video, using three.js (MIT).
- Icons: Health Icons (MIT, Resolve to Save Lives).
- Font: Cairo (SIL OFL 1.1).
- Music and sound effects: synthesised for this video.
- Doctor footage and logo: supplied by you.

## 5. Limitations
- **3D realism:** the models are clean, stylised, medical-illustration quality, rendered in real time with software WebGL. They are not film-grade photoreal renders.
- **Voice:** none, as explained above. Send a recording of the script and I'll sync everything to it.
