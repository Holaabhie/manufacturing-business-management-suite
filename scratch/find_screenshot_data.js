const fs = require('fs');
const content = fs.readFileSync('C:/Users/HP/.gemini/antigravity-ide/brain/c06f149f-b400-4523-9e81-825a0f6fc8b4/.system_generated/logs/transcript_full.jsonl', 'utf8');
const lines = content.split('\n');
for (let i = lines.length - 1; i >= Math.max(0, lines.length - 30); i--) {
  if (lines[i].includes('Took a screenshot of the current page')) {
    console.log('Found screenshot step at index:', i);
    const parsed = JSON.parse(lines[i]);
    console.log('Keys:', Object.keys(parsed));
    console.log('Step index:', parsed.step_index);
    if (parsed.images) console.log('Images:', parsed.images);
    if (parsed.media) console.log('Media:', parsed.media);
    for (const k of Object.keys(parsed)) {
      if (typeof parsed[k] === 'string' && parsed[k].length > 1000) {
        console.log(`Key ${k} has length ${parsed[k].length}`);
      }
    }
    break;
  }
}
