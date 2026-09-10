const fs = require('fs');

const locales = ['en', 'hi', 'gu', 'mr'];
const dicts = {};
for (const loc of locales) {
  dicts[loc] = JSON.parse(fs.readFileSync(`apps/web/messages/${loc}.json`, 'utf8')).users;
}

const enKeys = Object.keys(dicts.en);
console.log(`English top-level users keys count: ${enKeys.length}`);

let missing = 0;

function checkObject(path, enObj, loc, locObj) {
  for (const k of Object.keys(enObj)) {
    const fullPath = path ? `${path}.${k}` : k;
    if (typeof enObj[k] === 'object' && enObj[k] !== null) {
      if (!locObj || !locObj[k]) {
        console.error(`Missing object in ${loc}: ${fullPath}`);
        missing++;
      } else {
        checkObject(fullPath, enObj[k], loc, locObj[k]);
      }
    } else {
      if (!locObj || !locObj[k]) {
        console.error(`Missing key in ${loc}: ${fullPath}`);
        missing++;
      }
    }
  }
}

for (const loc of ['hi', 'gu', 'mr']) {
  checkObject('', dicts.en, loc, dicts[loc]);
}

if (missing === 0) {
  console.log('All users keys 100% synchronized across en, hi, gu, mr!');
} else {
  console.error(`Total missing keys: ${missing}`);
  process.exit(1);
}
