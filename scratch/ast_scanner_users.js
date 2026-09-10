const fs = require('fs');
const ts = require('c:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/node_modules/typescript');

const files = [
  'apps/web/src/app/dashboard/users/page.tsx',
  'apps/web/src/app/dashboard/users/[id]/page.tsx'
];

const allowedStatutory = new Set([
  'GSTIN', 'PAN', 'HSN', 'GST', 'CGST', 'SGST', 'IGST', 'TDS', 'TCS',
  'WhatsApp', 'Tally', 'Tally Prime', 'UPI', 'IFSC', 'PDF', 'Excel', 'XLS', 'XLSX',
  'EMP-XXXX', '0 %', '₹ 0', 'KG', 'pcs', 'box', 'set', 'ltr', 'm', '—', '-', '*', '×', '•'
]);

let issues = [];

files.forEach(file => {
  const code = fs.readFileSync(file, 'utf8');
  const sourceFile = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

  function visit(node) {
    if (ts.isJsxText(node)) {
      const text = node.text.trim();
      if (text && !/^[0-9\s₹\-\—·\/,.:;%*+()_&|><=#\\×•@]+$/.test(text) && !allowedStatutory.has(text)) {
        const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
        issues.push({ file, line: line + 1, type: 'JsxText', text });
      }
    } else if (ts.isJsxAttribute(node)) {
      const name = node.name.text;
      if (['placeholder', 'title', 'aria-label'].includes(name) && node.initializer && ts.isStringLiteral(node.initializer)) {
        const text = node.initializer.text.trim();
        if (text && !/^[0-9\s₹\-\—·\/,.:;%*+()_&|><=#\\×•@]+$/.test(text) && !allowedStatutory.has(text)) {
          const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
          issues.push({ file, line: line + 1, type: `Attr:${name}`, text });
        }
      }
    } else if (ts.isCallExpression(node)) {
      if (ts.isPropertyAccessExpression(node.expression)) {
        const obj = node.expression.expression;
        const prop = node.expression.name;
        if (ts.isIdentifier(obj) && (obj.text === 'toast' || obj.text === 'sonnerToast') && ['success', 'error', 'info', 'warning'].includes(prop.text)) {
          const firstArg = node.arguments[0];
          if (firstArg && ts.isStringLiteral(firstArg)) {
            const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
            issues.push({ file, line: line + 1, type: 'RawToast', text: firstArg.text });
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
});

console.log('Total TS AST issues in users/page.tsx:', issues.length);
if (issues.length > 0) {
  console.log(JSON.stringify(issues, null, 2));
}
