# Voiceover: ElevenLabs script

## Settings

- **Voice:** Voice Library → filter Language: Arabic, Accent: Egyptian, Gender: male. Pick a warm, conversational voice, not a newsreader.
- **Model:** Eleven v3 (best Egyptian intonation, uses audio tags) or Eleven Multilingual v2 (supports `<break>` tags).
- **Settings (v2):** Stability 45–50%, Similarity 75%, Style 15–25%, Speaker boost on, Speed 0.95–1.0.
- **Target length:** about 48 s in total. The video is 50 s long.
- **Export:** WAV 48 kHz (or MP3 192k). Save as `audio/voiceover.wav`, then run `./scripts/mix.sh`.

## Version A: Multilingual v2 (paste as-is)

```
عمرك حسيت بحرقان أو وجع في معدتك بيتكرر كتير؟ <break time="0.3s" /> طب تعرف إن ممكن تكون جرثومة المعدة هي السبب؟ <break time="0.5s" />

جرثومة المعدة دي نوع من البكتيريا بتعيش في بطانة المعدة، <break time="0.2s" /> وممكن تسبب التهاب أو قرحة عند بعض الناس. <break time="0.5s" />

أعراضها ممكن تكون وجع أو حرقان في أعلى البطن، <break time="0.2s" /> وانتفاخ أو غثيان، <break time="0.3s" /> وفي ناس بيكون عندها الجرثومة من غير أي أعراض خالص. <break time="0.5s" />

طيب نعرف إزاي إنها موجودة؟ <break time="0.4s" /> عن طريق تحليل البراز أو اختبار النفس، <break time="0.2s" /> حسب ما الدكتور يحدد لحالتك. <break time="0.5s" />

ولو التحليل أكد وجودها، <break time="0.2s" /> الدكتور بيحددلك العلاج المناسب، <break time="0.2s" /> واللي ممكن يشمل مضادات حيوية وأدوية لتقليل حموضة المعدة. <break time="0.6s" />

بس مهم جدًا: <break time="0.3s" /> متاخدش علاج من نفسك، <break time="0.2s" /> واتأكد من الشفاء بالمتابعة والتحليل اللي الدكتور يحدده. <break time="0.5s" />

تابعنا علشان تعرف معلومات طبية أكتر تهم صحتك.
```

## Version B: Eleven v3 (audio tags; v3 ignores `<break>` tags)

```
[curious] عمرك حسيت بحرقان أو وجع في معدتك بيتكرر كتير؟ ... طب تعرف إن ممكن تكون جرثومة المعدة هي السبب؟

[calm, explaining] جرثومة المعدة دي نوع من البكتيريا بتعيش في بطانة المعدة، وممكن تسبب التهاب أو قرحة عند بعض الناس.

أعراضها ممكن تكون وجع أو حرقان في أعلى البطن، وانتفاخ أو غثيان... [reassuring] وفي ناس بيكون عندها الجرثومة من غير أي أعراض خالص.

[curious] طيب نعرف إزاي إنها موجودة؟ ... [calm] عن طريق تحليل البراز أو اختبار النفس، حسب ما الدكتور يحدد لحالتك.

ولو التحليل أكد وجودها، الدكتور بيحددلك العلاج المناسب، واللي ممكن يشمل مضادات حيوية وأدوية لتقليل حموضة المعدة.

[serious] بس مهم جدًا: متاخدش علاج من نفسك، واتأكد من الشفاء بالمتابعة والتحليل اللي الدكتور يحدده.

[warm, smiling] تابعنا علشان تعرف معلومات طبية أكتر تهم صحتك.
```

## Pronunciation fixes (only if a word comes out wrong)

Replace just that word with this lightly-voweled spelling and regenerate:

| Word | Use | Sounds like |
|------|-----|-------------|
| متاخدش | مَتاخُدْش | ma-takhodsh |
| بيحددلك | بِيحَدِّدْلَك | bi-ḥaddedlak |
| إزاي | إزّاي | ezzay |
| علشان | عَلَشان | 'alashan |
| طب | طَب | ṭab |
| أكتر | أكْتَر | aktar |
| جرثومة | جُرْثومة | gorthooma (Egyptian ج = g) |

The video's timing per scene, if you generate scene by scene:

| Scene | Starts at | Target length |
|-------|-----------|---------------|
| 1 Hook | 0.3 s | about 6 s |
| 2 Explanation | 6.6 s | about 7 s |
| 3 Symptoms | 13.6 s | about 8.5 s |
| 4 Diagnosis | 22.6 s | about 7.5 s |
| 5 Treatment | 30.6 s | about 7.5 s |
| 6 Closing | 38.6 s | about 10 s |

If the recording's pacing differs, send it back and the caption timings in `src/script.js` can be realigned to it.
