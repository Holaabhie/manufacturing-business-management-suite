const fs = require('fs');
const babelParser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

const files = [
  'apps/web/src/app/dashboard/purchasing/page.tsx',
  'apps/web/src/components/purchasing/RecordPaymentModal.tsx',
  'apps/web/src/components/purchasing/VendorDetailDrawer.tsx',
];

const ignoredStrings = new Set([
  'use client',
  'purchasing',
  'common',
  'hi', 'gu', 'mr', 'en',
  'hi-IN', 'gu-IN', 'mr-IN', 'en-IN',
  'ind-manager-locale',
  'all', 'whatsapp', 'telegram', 'email', 'sms',
  'WhatsApp', 'Telegram', 'SMS', 'Email',
  'PDF', 'Excel', 'XLSX', 'INR', '₹',
  'UPI', 'GSTIN', 'PAN', 'Cash', 'Bank', 'Cheque',
  'L', 'ml', 'l', 'kg', 'pcs', 'units',
  'Pending', 'Ordered', 'Received',
  'Unpaid', 'Partial', 'Paid',
  'orders', 'vendors',
  'PATCH', 'POST', 'GET', 'DELETE', 'PUT',
  'application/json',
  'destructive', 'secondary', 'outline', 'ghost', 'default',
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
      if (/^[0-9\s.,\/#!$%\^&\*;:{}=\-_`~()•·×\u00D7|–—\u00B7\u2022\u2014\u2013\u20B9]+$/.test(text)) return;
      if (['WhatsApp', 'Telegram', 'SMS', 'Email', 'PDF', 'Excel', '₹', 'INR', 'UPI', 'Cash', 'Bank', 'Cheque', 'GSTIN'].includes(text)) return;
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
          if (/^[0-9\s.,\/#!$%\^&\*;:{}=\-_`~()•·|–—\u00B7]+$/.test(text)) return;
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
    },
  });
});

console.log('=== PURCHASING AST SCANNER REPORT ===');
console.log(`Total issues found: ${issues.length}`);
issues.forEach(iss => {
  console.log(`[${iss.file}:${iss.line}] ${iss.type}: "${iss.value}"`);
});

fs.writeFileSync('scratch/purchasing_strings.json', JSON.stringify(issues, null, 2), 'utf8');
