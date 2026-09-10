const fs = require('fs');
const babelParser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

const file = 'apps/web/src/app/dashboard/payments/page.tsx';

const issues = [];

if (!fs.existsSync(file)) {
  console.error(`File not found: ${file}`);
  process.exit(1);
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
  process.exit(1);
}

traverse(ast, {
  JSXText(path) {
    const text = path.node.value.trim();
    if (!text) return;
    if (/^[0-9\s.,\/#!$%\^&\*;:{}=\-_`~()•·×\u00D7|–—\u00B7\u2022\u2014\u2013\u20B9*+]+$/.test(text)) return;
    if (['WhatsApp', 'Telegram', 'SMS', 'Email', 'PDF', 'Excel', '₹', 'INR', 'UPI', 'Cash', 'Bank', 'Cheque', 'GSTIN', 'Bank Transfer', 'Credit/Due'].includes(text)) return;
    issues.push({
      file,
      line: path.node.loc.start.line,
      type: 'JSXText',
      value: text,
    });
  },
  JSXAttribute(path) {
    const attrName = path.node.name.name;
    if (['placeholder', 'title', 'aria-label', 'alt', 'label'].includes(attrName)) {
      if (path.node.value && path.node.value.type === 'StringLiteral') {
        const text = path.node.value.value.trim();
        if (!text) return;
        if (/^[0-9\s.,\/#!$%\^&\*;:{}=\-_`~()•·|–—\u00B7]+$/.test(text)) return;
        if (['WhatsApp', 'Telegram', 'SMS', 'Email', '₹', 'INR', 'UPI', 'Cash', 'Bank', 'Cheque'].includes(text)) return;
        issues.push({
          file,
          line: path.node.loc.start.line,
          type: `JSXAttribute (${attrName})`,
          value: text,
        });
      }
    }
    if (attrName === 'entityLabel' || attrName === 'consequenceText') {
      if (path.node.value && path.node.value.type === 'StringLiteral') {
        issues.push({
          file,
          line: path.node.loc.start.line,
          type: `JSXAttribute (${attrName})`,
          value: path.node.value.value,
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

console.log('=== PAYMENTS AST SCANNER REPORT ===');
console.log(`Total issues found: ${issues.length}`);
issues.forEach(iss => {
  console.log(`[${iss.file}:${iss.line}] ${iss.type}: "${iss.value}"`);
});

fs.writeFileSync('scratch/payments_strings.json', JSON.stringify(issues, null, 2), 'utf8');
