const fs = require('fs');

const files = [
  'apps/web/src/app/dashboard/inventory/page.tsx',
  'apps/web/src/components/inventory/AddMaterialModal.tsx',
  'apps/web/src/components/ui/MaterialUsageDrawer.tsx'
];

let totalIssues = 0;

for (const filePath of files) {
  console.log(`\n=== Checking ${filePath} ===`);
  const code = fs.readFileSync(filePath, 'utf8');
  const lines = code.split('\n');

  // 1. Raw JSX Text: >Some English Text<
  const jsxTextRegex = />\s*([A-Za-z0-9₹][^<>{}\n]*[A-Za-z0-9.!?])\s*</g;
  let match;
  while ((match = jsxTextRegex.exec(code)) !== null) {
    const text = match[1].trim();
    // Exclude imports, styles, variables, URLs, SVG path/numbers
    if (
      !text.startsWith('http') &&
      !text.startsWith('var(') &&
      !text.startsWith('calc(') &&
      !/^[0-9.,% ₹+-]+$/.test(text) &&
      text.length > 1
    ) {
      const lineNum = code.substring(0, match.index).split('\n').length;
      const lineContent = lines[lineNum - 1] || '';
      // Exclude comments
      if (!lineContent.trim().startsWith('//') && !lineContent.trim().startsWith('/*') && !lineContent.trim().startsWith('*')) {
        console.log(`  [JSX Text] L${lineNum}: "${text}"`);
        totalIssues++;
      }
    }
  }

  // 2. Untranslated placeholder="..."
  const placeholderRegex = /placeholder=["']([^"']+)["']/g;
  while ((match = placeholderRegex.exec(code)) !== null) {
    const text = match[1].trim();
    const lineNum = code.substring(0, match.index).split('\n').length;
    console.log(`  [Placeholder] L${lineNum}: "${text}"`);
    totalIssues++;
  }

  // 3. Untranslated title="..." (excluding standard HTML like title="...")
  const titleRegex = /\btitle=["']([A-Za-z][^"']+)["']/g;
  while ((match = titleRegex.exec(code)) !== null) {
    const text = match[1].trim();
    const lineNum = code.substring(0, match.index).split('\n').length;
    console.log(`  [Title] L${lineNum}: "${text}"`);
    totalIssues++;
  }

  // 4. Untranslated toast strings
  const toastRegex = /toast\.(?:success|error|info|warning)\(["'`]([^"'`]+)["'`]/g;
  while ((match = toastRegex.exec(code)) !== null) {
    const text = match[1].trim();
    const lineNum = code.substring(0, match.index).split('\n').length;
    console.log(`  [Toast] L${lineNum}: "${text}"`);
    totalIssues++;
  }
}

console.log(`\n================================`);
console.log(`Total potential issues: ${totalIssues}`);
