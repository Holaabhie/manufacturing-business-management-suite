const en = require('../apps/web/messages/en.json');
const hi = require('../apps/web/messages/hi.json');
const gu = require('../apps/web/messages/gu.json');
const mr = require('../apps/web/messages/mr.json');

console.log('EN machines keys count:', Object.keys(en.machines || {}).length);
console.log('HI machines keys count:', Object.keys(hi.machines || {}).length);
console.log('GU machines keys count:', Object.keys(gu.machines || {}).length);
console.log('MR machines keys count:', Object.keys(mr.machines || {}).length);

const enKeys = Object.keys(en.machines || {});
['hi', 'gu', 'mr'].forEach(lang => {
  const dict = lang === 'hi' ? hi : lang === 'gu' ? gu : mr;
  const missing = enKeys.filter(k => !(dict.machines && dict.machines[k]));
  console.log(`Missing in ${lang}:`, missing);
});
