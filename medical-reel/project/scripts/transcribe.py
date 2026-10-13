"""Word-timed Arabic ASR draft with faster-whisper (needs model download access to huggingface.co).
The output is a STARTING POINT only — review every word against the audio before using it.
Usage: python3 scripts/transcribe.py SOURCE.mp4 [model=large-v3]  -> data/asr_words.json
Then:  python3 scripts/captions.py --asr data/asr_words.json   (or copy the reviewed text into data/transcript.txt)
"""
import sys, json, os, subprocess, tempfile
from faster_whisper import WhisperModel
src = sys.argv[1]; model = sys.argv[2] if len(sys.argv) > 2 else "large-v3"
wav = os.path.join(tempfile.mkdtemp(), "a16.wav")
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", src, "-ac", "1", "-ar", "16000", wav], check=True)
m = WhisperModel(model, device="cpu", compute_type="int8")
segs, _ = m.transcribe(wav, language="ar", word_timestamps=True, beam_size=5, condition_on_previous_text=False,
                       initial_prompt="كلام دكتور باللهجة المصرية عن منظار القولون.")
out = []
for s in segs:
    print(f"[{s.start:6.2f}-{s.end:6.2f}] {s.text}")
    out.append({"start": s.start, "end": s.end, "text": s.text,
                "words": [{"w": w.word, "s": round(w.start, 2), "e": round(w.end, 2), "p": round(w.probability, 2)} for w in s.words]})
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
json.dump(out, open(os.path.join(root, "data", "asr_words.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
