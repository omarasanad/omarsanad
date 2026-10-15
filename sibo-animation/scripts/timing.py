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
    (1, ['بطنك بتنتفخ زي البالونة', 'بعد الأكل بعشر دقايق؟']),
    (1, ['خليك معايا،', 'الموضوع ممكن يكون له تفسير.']),
    (2, ['ولفّيت على دكاترة كتير،', 'وكل مرة يتقالك قولون عصبي،', 'والعلاج مش بيفرق معاك؟']),
    (2, ['القولون العصبي تشخيص حقيقي ومنتشر،', 'بس لما الأعراض تستمر،', 'ساعات بنحتاج ندوّر على أسباب تانية.']),
    (3, ['واحد من الأسباب دي اسمه SIBO،', 'يعني فرط نمو البكتيريا', 'في الأمعاء الدقيقة.']),
    (3, ['الأمعاء الدقيقة طبيعي', 'فيها بكتيريا قليلة،', 'والكمية الكبيرة مكانها القولون.']),
    (3, ['لكن في SIBO،', 'البكتيريا بتزيد في المكان الغلط.']),
    (4, ['البكتيريا الزيادة دي بتتغذى', 'على الأكل قبل ما يتهضم ويتمتص،']),
    (4, ['وبتطلّع غازات،', 'فالأمعاء تنتفخ،', 'وتحس بالانتفاخ والوجع.']),
    (5, ['والفكرة مش جديدة؛', 'العالم إيليا ميتشنيكوف', 'من أكتر من مية سنة', 'كان مهتم ببكتيريا الأمعاء وتأثيرها.']),
    (5, ['وبعدها الأطبا لاحظوا', 'إن بعض العمليات بتعمل جزء مقفول', 'في الأمعاء اسمه الحلقة العمياء،', 'البكتيريا بتزيد فيه', 'وبتسبب نقص فيتامين ب١٢.']),
    (5, ['وفي سنة ٢٠٠٠،', 'الباحث مارك بيمنتل', 'نشر دراسات بتربط بين SIBO', 'وأعراض القولون العصبي،', 'والموضوع لسه بيتدرس لحد النهارده.']),
    (6, ['من الأعراض اللي ممكن تلاحظها:', 'انتفاخ بعد الأكل،']),
    (6, ['وإسهال أو اضطراب في الحمام،']),
    (6, ['وإرهاق،', 'وأحيانًا نقص في فيتامينات زي ب١٢.']),
    (6, ['بس الأعراض دي', 'مش خاصة بـ SIBO لوحده،', 'وعلشان كده التقييم الطبي مهم.']),
    (7, ['التشخيص غالبًا بيبدأ', 'باختبار النَّفَس.']),
    (7, ['بتشرب محلول سكري،', 'وبعدها بنقيس الغازات في نَفَسك', 'على فترات.']),
    (7, ['والنتيجة بيفسرها الدكتور', 'مع الأعراض والفحوصات التانية،', 'لأن الاختبار ليه حدود.']),
    (8, ['والعلاج بيحدده الدكتور حسب حالتك،']),
    (8, ['وممكن يشمل علاج للبكتيريا الزيادة،', 'مع تعديلات في الأكل،', 'وعلاج السبب اللي وراها.']),
    (8, ['والمتابعة مهمة،', 'لأن الأعراض ممكن ترجع.']),
    (9, ['فمتشخّصش نفسك،', 'ولو أعراضك مستمرة،', 'اسأل دكتورك.']),
    (9, ['أساس العلاج الصح', 'هو التشخيص الصح.']),
    (9, ['تابعنا لمعلومات طبية أكتر.']),
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
