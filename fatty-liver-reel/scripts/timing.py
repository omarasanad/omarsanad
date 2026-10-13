"""Build src/timing.json: scene starts + caption phrases, the single timeline for picture, captions and audio.

    python3 scripts/timing.py

Without audio/vo_spans.json the narration is laid out at a natural planned pace (about 14 Arabic characters/s).
With a recorded voiceover, put the measured [start, end] of every sentence (same order as SENTENCES) in
audio/vo_spans.json and re-run; phrases are spread inside each sentence by length.
"""
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RATE = 15.0  # characters per second, planned pace (ElevenLabs speed ~1.05)

# (scene, [caption phrases]) — one entry per spoken sentence, exact approved wording.
SENTENCES = [
    (1, ['تعرف إن ممكن يكون عندك كبد دهني', 'من غير ما تحس بأي أعراض؟']),
    (2, ['الكبد الدهني يعني إن الدهون بتتراكم', 'جوه خلايا الكبد', 'بنسبة زيادة عن الطبيعي،']),
    (2, ['وده ممكن يحصل لأسباب مختلفة،']),
    (2, ['منها زيادة الوزن،', 'ومقاومة الإنسولين،', 'ومرض السكر من النوع التاني.']),
    (3, ['والمشكلة إن ناس كتير', 'بيكون عندها كبد دهني', 'من غير أي أعراض واضحة،']),
    (3, ['علشان كده اكتشافه', 'ممكن يحصل بالصدفة أثناء الفحوصات.']),
    (4, ['طب نعرف إزاي؟']),
    (4, ['الدكتور ممكن يطلب', 'تحاليل وظائف الكبد، أو سونار،', 'وفحوصات تانية حسب حالتك.']),
    (4, ['ومهم تعرف إن تحليل', 'وظائف الكبد الطبيعي لوحده', 'مش كفاية علشان يستبعد وجود المشكلة.']),
    (5, ['الخبر الكويس إن تغيير نمط الحياة', 'بيفرق جدًا.']),
    (5, ['لو عندك وزن زائد،', 'نزول الوزن بشكل تدريجي،', 'والأكل المتوازن، والحركة المنتظمة،', 'ممكن يساعدوا في تقليل دهون الكبد', 'وتحسين صحته.']),
    (6, ['بس متعتمدش على الأعراض،', 'ومتبدأش أي علاج من نفسك.']),
    (6, ['لو عندك عوامل خطورة', 'أو قلقان على صحة الكبد،', 'استشير دكتور', 'علشان يحدد الفحوصات المناسبة ليك.']),
    (6, ['تابعنا علشان تعرف', 'معلومات طبية أكتر تهم صحتك.']),
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
    starts = [0.0] + [round(scenes[k] - 0.35, 2) for k in range(2, 7)]
    data = {
        'duration': round(spans[-1][1] + TAIL, 2),
        'scenes': starts,
        'captions': out,
        'source': 'voiceover' if os.path.exists(vo) else 'planned pace',
    }
    json.dump(data, open(os.path.join(ROOT, 'src/timing.json'), 'w'), ensure_ascii=False, indent=1)
    print(f"src/timing.json: {data['duration']} s, scenes at {starts} ({data['source']})")


main()
