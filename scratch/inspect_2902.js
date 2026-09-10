const fs = require('fs');

const lines = fs.readFileSync('C:/Users/HP/.gemini/antigravity-ide/brain/c06f149f-b400-4523-9e81-825a0f6fc8b4/.system_generated/logs/transcript_full.jsonl', 'utf8').split('\n');

for (const l of lines) {
  if (l.includes('"step_index":2902')) {
    const obj = JSON.parse(l);
    console.log('Keys in step 2902:', Object.keys(obj));
    console.log('Content preview:', obj.content);
    if (obj.attachments) console.log('Attachments:', obj.attachments);
    break;
  }
}
