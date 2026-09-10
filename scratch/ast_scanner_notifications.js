const fs = require('fs');
const babelParser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

const files = [
  'apps/web/src/app/dashboard/notifications/page.tsx',
  'apps/web/src/components/notifications/NotificationFeedItem.tsx',
  'apps/web/src/components/NotificationDropdown.tsx',
];

const ignoredStrings = new Set([
  'use client',
  'notifications',
  'common',
  'orders',
  'activity',
  'hi', 'gu', 'mr', 'en',
  'hi-IN', 'gu-IN', 'mr-IN', 'en-IN',
  'ind-manager-locale',
  'all', 'whatsapp', 'telegram', 'email', 'sms',
  'WhatsApp', 'Telegram', 'SMS', 'Email',
  'sent', 'delivered', 'failed', 'pending', 'queued',
  'order_status_update', 'invoice_generated', 'payment_reminder', 'low_stock_alert', 'production_complete',
  'numeric', 'short', '2-digit',
  'feed', 'templates', 'logs',
  'PATCH', 'POST', 'GET', 'DELETE',
  'application/json',
  'bg-emerald-500/10', 'text-emerald-500', 'border-emerald-500/20',
  'bg-amber-500/10', 'text-amber-500', 'border-amber-500/20',
  'bg-red-500/10', 'text-red-500', 'border-red-500/20',
  'bg-blue-500/10', 'text-blue-500', 'border-blue-500/20',
  'var(--ind-green)', 'var(--ind-text-muted)', 'var(--ind-text)',
  'var(--ind-amber)', 'var(--ind-red)', 'var(--ind-border)',
  'var(--ind-card-bg)', 'var(--chart-1)', 'var(--chart-2)', 'var(--chart-4)',
  'var(--accent-blue,#007AFF)',
  'h:mm a', 'MMM d, yyyy', 'd MMM',
  'HH:mm', 'yyyy-MM-dd',
  // Lucide icon names or class names / paths
  '/dashboard/notifications',
  '/dashboard/orders/',
  '/dashboard/billing/',
  '/dashboard/inventory/',
  'system', 'order', 'payment', 'inventory', 'machine',
  'low', 'medium', 'high', 'urgent',
  'today', 'yesterday',
  'destructive', 'secondary', 'outline', 'ghost', 'default',
]);

const issues = [];

files.forEach(file => {
  if (!fs.existsSync(file)) {
    console.error(`File not found: ${file}`);
    return;
  }
  const code = fs.readFileSync(file, 'utf8');
  const ast = babelParser.parse(code, {
    sourceType: 'module',
    plugins: ['jsx', 'typescript'],
  });

  traverse(ast, {
    JSXText(path) {
      const text = path.node.value.trim();
      if (!text) return;
      if (/^[0-9\s.,\/#!$%\^&\*;:{}=\-_`~()•|–—]+$/.test(text)) return;
      // Check if it's Roman technical term
      if (['WhatsApp', 'Telegram', 'SMS', 'Email', 'PDF', 'Excel', '₹'].includes(text)) return;
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

console.log('=== AST SCANNER REPORT ===');
console.log(`Total issues found: ${issues.length}`);
issues.forEach(iss => {
  console.log(`[${iss.file}:${iss.line}] ${iss.type}: "${iss.value}"`);
});
if (issues.length === 0) {
  console.log('SUCCESS: All 3 files have ZERO hardcoded English strings!');
}
