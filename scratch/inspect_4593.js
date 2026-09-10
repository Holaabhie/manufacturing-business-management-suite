const fs = require('fs');
const content = fs.readFileSync('C:/Users/HP/.gemini/antigravity-ide/brain/c06f149f-b400-4523-9e81-825a0f6fc8b4/.system_generated/logs/transcript_full.jsonl', 'utf8');
const lines = content.split('\n');
for (const l of lines) {
  if (l.includes('"step_index":4593')) {
    const entry = JSON.parse(l);
    console.log('Keys in 4593:', Object.keys(entry));
    for (const k of Object.keys(entry)) {
      console.log(k, typeof entry[k], String(entry[k]).slice(0, 100));
    }
  }
}
