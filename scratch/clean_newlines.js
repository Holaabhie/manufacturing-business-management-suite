const fs = require('fs');
const filePath = 'apps/web/src/app/dashboard/purchasing/page.tsx';
let code = fs.readFileSync(filePath, 'utf8');

code = code.replace(/\\n/g, '\n');

fs.writeFileSync(filePath, code, 'utf8');
console.log('Replaced literal \\n with actual newlines!');
