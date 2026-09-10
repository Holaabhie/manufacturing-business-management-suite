const fs = require('fs');
const code = fs.readFileSync('apps/web/src/components/inventory/AddMaterialModal.tsx', 'utf8');

// Match JSX text: >Text<
const jsxTextRegex = />\s*([A-Za-z0-9₹][^<>{}\n]*[A-Za-z0-9.!?])\s*</g;
let match;
let found = 0;
while ((match = jsxTextRegex.exec(code)) !== null) {
  const text = match[1].trim();
  if (text && !text.startsWith('http') && !text.startsWith('var(') && text.length > 1) {
    const lineNum = code.substring(0, match.index).split('\n').length;
    console.log('L' + lineNum + ': ' + text);
    found++;
  }
}
console.log('Found total JSX text strings:', found);

// Check placeholders
const plRegex = /placeholder=["']([^"']+)["']/g;
while ((match = plRegex.exec(code)) !== null) {
  const text = match[1].trim();
  const lineNum = code.substring(0, match.index).split('\n').length;
  console.log('Placeholder L' + lineNum + ': ' + text);
}
