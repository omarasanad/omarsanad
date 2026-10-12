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
    (1, ['بطنك بتوجعك كتير؟']),
    (1, ['وبتحس بانتفاخ', 'أو إن حركة الحمام مش منتظمة؟']),
    (1, ['طب ممكن يكون القولون العصبي', 'له علاقة بالموضوع!']),
    (2, ['القولون العصبي، أو الـ IBS', 'اضطراب بيأثر على طريقة شغل الأمعاء،']),
    (2, ['وممكن يسبب وجع في البطن وانتفاخ', 'وإمساك أو إسهال،']),
    (2, ['وأحيانًا الاتنين بالتبادل.']),
    (3, ['الأعراض ممكن تزيد مع التوتر', 'والضغط النفسي،']),
    (3, ['أو مع أكلات معينة', 'بتختلف من شخص للتاني.']),
    (4, ['طب نعمل إيه؟']),
    (4, ['حاول تلاحظ الأكل', 'اللي بيزود الأعراض عندك،']),
    (4, ['ونظّم مواعيد أكلك،']),
    (4, ['واشرب مياه كفاية،']),
    (4, ['واتحرك بانتظام.']),
    (4, ['ولو الأعراض مستمرة،', 'الأفضل تراجع دكتور.']),
    (5, ['بس خلي بالك،']),
    (5, ['مش كل وجع بطن أو اضطراب في الحمام', 'معناه قولون عصبي،']),
    (5, ['خصوصًا لو فيه دم في البراز', 'أو نزول وزن من غير سبب.']),
    (6, ['متشخّصش نفسك بنفسك.']),
    (6, ['لو الأعراض بتتكرر، استشير دكتور', 'علشان تعرف السبب والعلاج المناسب.']),
    (6, ['تابعنا لمعلومات طبية أكتر.']),
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
