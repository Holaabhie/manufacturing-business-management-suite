const fs = require('fs');

const raw = JSON.parse(fs.readFileSync('scratch/users_strings_raw.json', 'utf8'));

console.log('=== USERS LIST PAGE STRINGS ===');
raw['apps/web/src/app/dashboard/users/page.tsx'].forEach(s => {
  console.log(`L${s.line} [${s.type}]: ${s.text}`);
});
