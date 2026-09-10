const fs = require('fs');

const raw = JSON.parse(fs.readFileSync('scratch/users_strings_raw.json', 'utf8'));

console.log('=== STAFF DETAIL PAGE STRINGS ===');
raw['apps/web/src/app/dashboard/users/[id]/page.tsx'].forEach(s => {
  console.log(`L${s.line} [${s.type}]: ${s.text}`);
});
