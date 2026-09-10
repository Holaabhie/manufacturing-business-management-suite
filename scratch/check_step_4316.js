const fs = require('fs');
const content = fs.readFileSync('C:/Users/HP/.gemini/antigravity-ide/brain/c06f149f-b400-4523-9e81-825a0f6fc8b4/.system_generated/logs/transcript.jsonl', 'utf8');
const lines = content.split('\n');
for (const line of lines) {
  if (line.includes('"step_index":4316')) {
    console.log('Found 4316:', line.slice(0, 500));
  }
}
