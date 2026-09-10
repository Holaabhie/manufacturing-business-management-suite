const fs = require('fs');
const babelParser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

const files = [
  'apps/web/src/app/dashboard/production/page.tsx',
  'apps/web/src/app/dashboard/production/create/page.tsx',
  'apps/web/src/app/dashboard/production/[id]/page.tsx',
  'apps/web/src/app/dashboard/production/my-productions/page.tsx',
  'apps/web/src/components/production/AssignStaffDialog.tsx',
  'apps/web/src/components/production/EditProductionSheet.tsx',
  'apps/web/src/components/production/MaterialsStep.tsx',
];

const results = {};

files.forEach(file => {
  if (!fs.existsSync(file)) return;
  results[file] = [];
  const code = fs.readFileSync(file, 'utf8');
  try {
    const ast = babelParser.parse(code, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript'],
    });

    traverse(ast, {
      JSXText(path) {
        const text = path.node.value.trim();
        if (text && !/^[0-9\s.,\/#!$%\^&\*;:{}=\-_`~()•|–—]+$/.test(text)) {
          results[file].push({ type: 'text', line: path.node.loc.start.line, text });
        }
      },
      JSXAttribute(path) {
        const name = path.node.name.name;
        if (['placeholder', 'title', 'aria-label', 'label', 'alt'].includes(name)) {
          if (path.node.value && path.node.value.type === 'StringLiteral') {
            const val = path.node.value.value.trim();
            if (val) {
              results[file].push({ type: `attr:${name}`, line: path.node.loc.start.line, text: val });
            }
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
            results[file].push({ type: 'toast', line: path.node.loc.start.line, text: arg.value });
          }
        }
      }
    });
  } catch (e) {
    console.error(`Error parsing ${file}:`, e.message);
  }
});

fs.writeFileSync('scratch/production_strings.json', JSON.stringify(results, null, 2));
console.log('Finished scanning production files.');
for (const [f, items] of Object.entries(results)) {
  console.log(`${f}: ${items.length} items`);
}
