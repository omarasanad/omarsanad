// Export the caption timeline (src/timing.json) as SRT.
import fs from 'node:fs';
const { captions } = JSON.parse(fs.readFileSync('src/timing.json', 'utf8'));
const ts = (s) => {
  const ms = Math.round(s * 1000), h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, sec = Math.floor(ms / 1000) % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')},${String(ms % 1000).padStart(3, '0')}`;
};
fs.mkdirSync('out', { recursive: true });
fs.writeFileSync('out/captions_ar.srt', captions.map(([a, b, txt], i) => `${i + 1}\n${ts(a)} --> ${ts(b)}\n${txt}\n`).join('\n'));
console.log(`wrote out/captions_ar.srt (${captions.length} cues)`);
