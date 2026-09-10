const fs = require('fs');
const content = fs.readFileSync('C:/Users/HP/.gemini/antigravity-ide/brain/c06f149f-b400-4523-9e81-825a0f6fc8b4/.system_generated/logs/transcript_full.jsonl', 'utf8');
const lines = content.split('\n');
for (let i = lines.length - 1; i >= Math.max(0, lines.length - 50); i--) {
  if (lines[i].includes('Took a screenshot')) {
    console.log('Line index:', i);
    const entry = JSON.parse(lines[i]);
    console.log('step_index:', entry.step_index, 'type:', entry.type);
    console.log(JSON.stringify(entry).slice(0, 1000));
  }
}
