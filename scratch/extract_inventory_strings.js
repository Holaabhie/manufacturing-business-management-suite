const fs = require('fs');
const path = require('path');

const files = [
  'apps/web/src/app/dashboard/inventory/page.tsx',
  'apps/web/src/components/inventory/AddMaterialModal.tsx',
  'apps/web/src/components/ui/MaterialUsageDrawer.tsx'
];

const results = {};

for (const f of files) {
  const code = fs.readFileSync(f, 'utf8');
  const lines = code.split('\n');
  const fileStrings = [];

  // Match JSX text: >Text<
  const jsxTextRegex = />\s*([A-Za-z0-9₹][^<>{}\n]*[A-Za-z0-9.!?])\s*</g;
  let match;
  while ((match = jsxTextRegex.exec(code)) !== null) {
    const text = match[1].trim();
    if (text && !text.startsWith('http') && !text.startsWith('var(') && text.length > 1) {
      // Find line number
      const lineNum = code.substring(0, match.index).split('\n').length;
      fileStrings.push({ type: 'jsx', text, line: lineNum });
    }
  }

  // Match placeholder="..."
  const placeholderRegex = /placeholder=["']([^"']+)["']/g;
  while ((match = placeholderRegex.exec(code)) !== null) {
    const text = match[1].trim();
    if (text) {
      const lineNum = code.substring(0, match.index).split('\n').length;
      fileStrings.push({ type: 'placeholder', text, line: lineNum });
    }
  }

  // Match toast.success("..."), toast.error("...")
  const toastRegex = /toast\.(?:success|error|info|warning)\(["'`]([^"'`]+)["'`]/g;
  while ((match = toastRegex.exec(code)) !== null) {
    const text = match[1].trim();
    if (text) {
      const lineNum = code.substring(0, match.index).split('\n').length;
      fileStrings.push({ type: 'toast', text, line: lineNum });
    }
  }

  // Match title="..." or label="..."
  const attrRegex = /(?:title|label|heading|description|emptyText)=["']([^"']+)["']/g;
  while ((match = attrRegex.exec(code)) !== null) {
    const text = match[1].trim();
    if (text && !text.includes('{') && text.length > 1) {
      const lineNum = code.substring(0, match.index).split('\n').length;
      fileStrings.push({ type: 'attr', text, line: lineNum });
    }
  }

  results[f] = fileStrings;
}

fs.writeFileSync('scratch/inventory_strings_raw.json', JSON.stringify(results, null, 2));
console.log('Extraction complete:');
for (const f of files) {
  console.log(f + ': ' + results[f].length + ' strings found');
}
