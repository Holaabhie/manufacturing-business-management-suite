const fs = require('fs');

const lines = fs.readFileSync('C:/Users/HP/.gemini/antigravity-ide/brain/c06f149f-b400-4523-9e81-825a0f6fc8b4/.system_generated/logs/transcript.jsonl', 'utf8').split('\n');

for (const l of lines) {
  if (l.includes('"step_index":2975') || l.includes('"step_index":2983') || l.includes('"step_index":2999')) {
    console.log(l);
  }
}
