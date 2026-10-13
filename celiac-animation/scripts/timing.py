"""Build src/timing.json: scene starts + caption phrases, the single timeline for picture, captions and audio.

    python3 scripts/timing.py

Without audio/vo_spans.json the narration is laid out at a natural planned pace (about 14 Arabic characters/s).
With a recorded voiceover, put the measured [start, end] of every sentence (same order as SENTENCES) in
audio/vo_spans.json and re-run; phrases are spread inside each sentence by length.
"""
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RATE = 14.5  # characters per second, planned pace

# (scene, [caption phrases]) — one entry per spoken sentence, exact approved wording.
SENTENCES = [
    (1, ['تعرف إن رغيف العيش', 'اللي بتاكله كل يوم', 'ممكن يكون السبب في تعبك؟']),
    (1, ['مش عند كل الناس طبعًا،', 'بس عند اللي عندهم مرض السيلياك.']),
    (2, ['تخيل واحد بطنه بتنفخ،', 'وعنده إسهال، وتعبان على طول.']),
    (2, ['يروح للدكتور،', 'وأعراضه تتشابه مع القولون العصبي،']),
    (2, ['بس لما التعب يفضل مستمر،', 'لازم ندوّر أكتر.']),
    (3, ['السيلياك مرض مناعي،', 'الجسم فيه بيعتبر الجلوتين عدو،']),
    (3, ['والجلوتين بروتين موجود', 'في القمح والشعير والجاودار.']),
    (3, ['المناعة بتهاجم', 'بطانة الأمعاء الدقيقة،', 'والخملات،', 'الصوابع الصغيرة اللي بتمتص الأكل،', 'بتدبل ومتقدرش تمتص كويس.']),
    (3, ['وده غير حساسية القمح،', 'وغير إن معدتك متقبلش أكلة معينة.']),
    (4, ['والحكاية بدأت تتضح', 'مع دكتور أطفال هولندي', 'اسمه ويليم ديكه.']),
    (4, ['كان شاكك في العيش من قبل الحرب،', 'وفي شتا المجاعة سنة ١٩٤٤،', 'لما العيش بقى نادر،']),
    (4, ['لاحظ إن حالة أطفال كتير', 'عندهم المرض اتحسنت،']),
    (4, ['ولما العيش رجع،', 'رجعلهم التعب.']),
    (4, ['وأبحاثه بعد كده', 'أثبتت إن بروتين القمح هو السبب.']),
    (5, ['الأعراض بتختلف من شخص للتاني:', 'انتفاخ وإسهال،']),
    (5, ['وأنيميا نقص الحديد،', 'وإرهاق مستمر،']),
    (5, ['ونقص كالسيوم وفيتامين د', 'بيأثر على العضم،']),
    (5, ['وأحيانًا طفح جلدي بيهرش.']),
    (5, ['وفي ناس', 'ممكن ميبقاش عندها أعراض واضحة.']),
    (6, ['التشخيص بيبدأ بتحليل دم', 'للأجسام المضادة،']),
    (6, ['وإنت لسه بتاكل جلوتين،', 'فمتبطلش العيش قبل التحليل', 'من غير ما تسأل دكتورك.']),
    (6, ['وغالبًا بيتأكد بالمنظار،', 'وعينة صغيرة من الأمعاء الدقيقة', 'بتتفحص تحت الميكروسكوب.']),
    (7, ['والعلاج؟', 'أكل خالي من الجلوتين طول العمر،']),
    (7, ['بعد التشخيص،', 'وبمتابعة الدكتور وأخصائي التغذية.']),
    (7, ['الرز والدرة والبطاطس', 'بدايل طبيعية،']),
    (7, ['والشوفان لازم يكون', 'مضمون إنه خالي من الجلوتين.']),
    (7, ['ومع الوقت،', 'الأمعاء بتبدأ تتعافى.']),
    (8, ['أنا د. أبوبكر أحمد سند،', 'وبقولك:']),
    (8, ['أساس العلاج الصح', 'هو التشخيص الصح.']),
    (8, ['تابعنا لمعلومات طبية أكتر.']),
]
TAIL = 2.2  # seconds of end card after the last word


def planned_spans():
    spans, t, prev_scene = [], 0.35, 1
    for scene, chunks in SENTENCES:
        if scene != prev_scene:
            t += 0.35  # breath between scenes
        d = sum(len(c) for c in chunks) / RATE
        spans.append([round(t, 2), round(t + d, 2)])
        t += d + 0.25
        prev_scene = scene
    return spans


def main():
    vo = os.path.join(ROOT, 'audio/vo_spans.json')
    spans = json.load(open(vo)) if os.path.exists(vo) else planned_spans()
    assert len(spans) == len(SENTENCES), f'need {len(SENTENCES)} spans, got {len(spans)}'
    caps, scenes = [], {}
    for (scene, chunks), (a, b) in zip(SENTENCES, spans):
        scenes.setdefault(scene, a)
        L = sum(len(c) for c in chunks); x = a
        for c in chunks:
            d = (b - a) * len(c) / L
            caps.append([x, x + d, c]); x += d
    out = []
    for i, (s, e, c) in enumerate(caps):
        nxt = caps[i + 1][0] - 0.05 if i + 1 < len(caps) else e + 0.8
        out.append([round(max(0, s - 0.05), 2), round(min(e + 0.25, nxt), 2), c])
    # a scene's picture starts a beat before its first word
    starts = [0.0] + [round(scenes[k] - 0.35, 2) for k in range(2, max(scenes) + 1)]
    data = {
        'duration': round(spans[-1][1] + TAIL, 2),
        'scenes': starts,
        'captions': out,
        'source': 'voiceover' if os.path.exists(vo) else 'planned pace',
    }
    json.dump(data, open(os.path.join(ROOT, 'src/timing.json'), 'w'), ensure_ascii=False, indent=1)
    print(f"src/timing.json: {data['duration']} s, scenes at {starts} ({data['source']})")


main()
