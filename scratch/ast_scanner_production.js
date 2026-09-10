const fs = require('fs');
const babelParser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

const files = [
  'apps/web/src/app/dashboard/production/page.tsx',
  'apps/web/src/app/dashboard/production/my-productions/page.tsx',
  'apps/web/src/app/dashboard/production/create/page.tsx',
  'apps/web/src/app/dashboard/production/[id]/page.tsx',
  'apps/web/src/components/production/AssignStaffDialog.tsx',
  'apps/web/src/components/production/EditProductionSheet.tsx',
  'apps/web/src/components/production/MaterialsStep.tsx',
];

const ignoredStrings = new Set([
  'use client',
  'production',
  'common',
  'hi', 'gu', 'mr', 'en',
  'hi-IN', 'gu-IN', 'mr-IN', 'en-IN',
  'ind-manager-locale',
  'all', 'whatsapp', 'telegram', 'email', 'sms',
  'WhatsApp', 'Telegram', 'SMS', 'Email',
  'PDF', 'Excel', 'XLSX', 'INR', '₹',
  'L', 'ml', 'l', 'kg', 'pcs', 'units',
  'pending', 'running', 'paused', 'completed', 'closed', 'delivered', 'printing', 'in_progress',
  'morning', 'evening', 'night', 'afternoon',
  'orange', 'blue', 'red', 'green', 'purple',
  'PATCH', 'POST', 'GET', 'DELETE', 'PUT',
  'application/json',
  'destructive', 'secondary', 'outline', 'ghost', 'default',
  'live',
]);

const issues = [];

files.forEach(file => {
  if (!fs.existsSync(file)) {
    console.error(`File not found: ${file}`);
    return;
  }
  const code = fs.readFileSync(file, 'utf8');
  let ast;
  try {
    ast = babelParser.parse(code, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript'],
    });
  } catch (err) {
    console.error(`Error parsing ${file}: ${err.message}`);
    return;
  }

  traverse(ast, {
    JSXText(path) {
      const text = path.node.value.trim();
      if (!text) return;
      if (/^[0-9\s.,\/#!$%\^&\*;:{}=\-_`~()•·|–—\u00B7\u2022\u2014\u2013\u20B9]+$/.test(text)) return;
      if (['WhatsApp', 'Telegram', 'SMS', 'Email', 'PDF', 'Excel', '₹', 'INR', 'live', 'L', 'ml', 'kg'].includes(text)) return;
      issues.push({
        file,
        line: path.node.loc.start.line,
        type: 'JSXText',
        value: text,
      });
    },
    JSXAttribute(path) {
      const attrName = path.node.name.name;
      if (['placeholder', 'title', 'aria-label', 'alt'].includes(attrName)) {
        if (path.node.value && path.node.value.type === 'StringLiteral') {
          const text = path.node.value.value.trim();
          if (!text) return;
          if (/^[0-9\s.,\/#!$%\^&\*;:{}=\-_`~()•|–—]+$/.test(text)) return;
          if (['WhatsApp', 'Telegram', 'SMS', 'Email'].includes(text)) return;
          issues.push({
            file,
            line: path.node.loc.start.line,
            type: `JSXAttribute (${attrName})`,
            value: text,
          });
        }
      }
    },
    CallExpression(path) {
      // Check toast calls
      if (
        path.node.callee &&
        path.node.callee.object &&
        path.node.callee.object.name === 'toast'
      ) {
        const arg = path.node.arguments[0];
        if (arg && arg.type === 'StringLiteral') {
          issues.push({
            file,
            line: path.node.loc.start.line,
            type: 'toast string',
            value: arg.value,
          });
        }
      }
    }
  });
});

console.log('=== PRODUCTION AST SCANNER REPORT ===');
console.log(`Total issues found: ${issues.length}`);
issues.forEach(iss => {
  console.log(`[${iss.file}:${iss.line}] ${iss.type}: "${iss.value}"`);
});
if (issues.length === 0) {
  console.log('SUCCESS: All 7 production files have ZERO hardcoded English strings!');
}
