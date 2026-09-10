const fs = require('fs');
const content = fs.readFileSync('C:/Users/HP/.gemini/antigravity-ide/brain/c06f149f-b400-4523-9e81-825a0f6fc8b4/.system_generated/logs/transcript_full.jsonl', 'utf8');
const lines = content.split('\n');
for (const line of lines) {
  if (line.includes('"step_index":4352')) {
    console.log('Step 4352 found!');
    const entry = JSON.parse(line);
    console.log('Keys:', Object.keys(entry));
    if (entry.content) {
      console.log('Content type:', typeof entry.content);
      if (typeof entry.content === 'object') {
        console.log('Content object keys:', Object.keys(entry.content));
      } else {
        console.log('Content preview:', entry.content.slice(0, 300));
      }
    }
    if (entry.images || entry.media) {
      console.log('Media found:', entry.images || entry.media);
    }
  }
}
