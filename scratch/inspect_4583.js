const fs = require('fs');
const content = fs.readFileSync('C:/Users/HP/.gemini/antigravity-ide/brain/c06f149f-b400-4523-9e81-825a0f6fc8b4/.system_generated/logs/transcript_full.jsonl', 'utf8');
const lines = content.split('\n');
for (const l of lines) {
  if (l.includes('"step_index":4583')) {
    const entry = JSON.parse(l);
    console.log('Step 4583 keys:', Object.keys(entry));
    if (entry.content) console.log('content:', entry.content.slice(0, 300));
    if (entry.media) console.log('media:', entry.media);
    if (entry.images) console.log('images:', entry.images);
    for (const [k, v] of Object.entries(entry)) {
      if (typeof v === 'string' && v.length > 500) console.log(k, 'length:', v.length);
    }
  }
}
