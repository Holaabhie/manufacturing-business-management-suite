const fs = require('fs');
const content = fs.readFileSync('C:/Users/HP/.gemini/antigravity-ide/brain/c06f149f-b400-4523-9e81-825a0f6fc8b4/.system_generated/logs/transcript.jsonl', 'utf8');
const lines = content.split('\n');
for (let i = lines.length - 1; i >= Math.max(0, lines.length - 200); i--) {
  if (lines[i].includes('take_screenshot')) {
    console.log(`Line ${i}:`, lines[i].slice(0, 300));
  }
}
