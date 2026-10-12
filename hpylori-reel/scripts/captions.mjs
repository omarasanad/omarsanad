// Export the caption timeline from src/script.js as SRT (also the voiceover timing guide).
import fs from 'node:fs';
import { CAPTIONS } from '../src/script.js';
const ts = (s) => {
  const ms = Math.round(s * 1000), h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, sec = Math.floor(ms / 1000) % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')},${String(ms % 1000).padStart(3, '0')}`;
};
const srt = CAPTIONS.map(([a, b, txt], i) => `${i + 1}\n${ts(a)} --> ${ts(b)}\n${txt}\n`).join('\n');
fs.mkdirSync('out', { recursive: true });
fs.writeFileSync('out/captions_ar.srt', srt);
console.log(`wrote out/captions_ar.srt (${CAPTIONS.length} cues)`);
