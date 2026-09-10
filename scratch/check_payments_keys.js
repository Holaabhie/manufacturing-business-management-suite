const fs = require('fs');

function getKeys(obj, prefix = '') {
  let keys = [];
  for (const k in obj) {
    const full = prefix ? `${prefix}.${k}` : k;
    if (typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k])) {
      keys = keys.concat(getKeys(obj[k], full));
    } else {
      keys.push(full);
    }
  }
  return keys;
}

const en = JSON.parse(fs.readFileSync('apps/web/messages/en.json', 'utf8')).payments;
const hi = JSON.parse(fs.readFileSync('apps/web/messages/hi.json', 'utf8')).payments;
const gu = JSON.parse(fs.readFileSync('apps/web/messages/gu.json', 'utf8')).payments;
const mr = JSON.parse(fs.readFileSync('apps/web/messages/mr.json', 'utf8')).payments;

const enKeys = new Set(getKeys(en));
const hiKeys = new Set(getKeys(hi));
const guKeys = new Set(getKeys(gu));
const mrKeys = new Set(getKeys(mr));

let errorCount = 0;

['hi', 'gu', 'mr'].forEach(lang => {
  const targetKeys = lang === 'hi' ? hiKeys : (lang === 'gu' ? guKeys : mrKeys);
  for (const key of enKeys) {
    if (!targetKeys.has(key)) {
      console.error(`[${lang}] Missing key: ${key}`);
      errorCount++;
    }
  }
  for (const key of targetKeys) {
    if (!enKeys.has(key)) {
      console.error(`[${lang}] Extra key not in en: ${key}`);
      errorCount++;
    }
  }
});

console.log(`Payments key parity check complete. Total key count: ${enKeys.size}. Errors: ${errorCount}`);
if (errorCount > 0) process.exit(1);
