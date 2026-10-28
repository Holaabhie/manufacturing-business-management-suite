import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MESSAGES_DIR = path.resolve(__dirname, '../src/messages');
const LOCALES = ['en', 'hi', 'gu', 'mr'];

function loadLocale(lang) {
  const filePath = path.join(MESSAGES_DIR, `${lang}.ts`);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Locale file not found: ${filePath}`);
  }
  let content = fs.readFileSync(filePath, 'utf-8');
  content = content.replace(/^\s*\/\/[^\n]*/gm, ''); // strip whole-line comments
  content = content.replace(/export\s+default\s+/, '').trim();
  content = content.replace(/as\s+const\s*;?$/, '').trim();
  return JSON.parse(content);
}

function getNestedKeys(obj, prefix = '') {
  let keys = [];
  for (const [k, v] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      keys = keys.concat(getNestedKeys(v, full));
    } else {
      keys.push(full);
    }
  }
  return keys;
}

function runCheck() {
  console.log('====================================================');
  console.log('   i18n Missing / Extra Key Checker (Reference: EN)');
  console.log('====================================================\n');

  const enData = loadLocale('en');
  const enKeys = new Set(getNestedKeys(enData));
  console.log(`[OK] Reference locale 'en.ts' loaded with ${enKeys.size} keys.\n`);

  let hasDiscrepancy = false;

  for (const lang of ['hi', 'gu', 'mr']) {
    const langData = loadLocale(lang);
    const langKeys = new Set(getNestedKeys(langData));

    const missing = [...enKeys].filter((k) => !langKeys.has(k));
    const extra = [...langKeys].filter((k) => !enKeys.has(k));

    console.log(`--- ${lang.toUpperCase()} vs EN ---`);
    console.log(`Total keys: ${langKeys.size}`);

    if (missing.length === 0 && extra.length === 0) {
      console.log(`[PASS] ${lang.toUpperCase()} is 100% in sync with EN (0 missing, 0 extra).\n`);
    } else {
      hasDiscrepancy = true;
      if (missing.length > 0) {
        console.warn(`[WARN] Missing in ${lang} (${missing.length} keys):`);
        missing.slice(0, 10).forEach((k) => console.warn(`   - ${k}`));
        if (missing.length > 10) console.warn(`   ...and ${missing.length - 10} more`);
      }
      if (extra.length > 0) {
        console.warn(`[WARN] Extra in ${lang} (${extra.length} keys):`);
        extra.slice(0, 10).forEach((k) => console.warn(`   + ${k}`));
        if (extra.length > 10) console.warn(`   ...and ${extra.length - 10} more`);
      }
      console.log();
    }
  }

  if (hasDiscrepancy) {
    console.warn('[NOTICE] One or more locale discrepancies detected (warn-only mode).\n');
  } else {
    console.log('[SUCCESS] All locales (hi, gu, mr) are perfectly synchronized with en.ts!\n');
  }

  // Warn-only: always exit 0
  process.exit(0);
}

runCheck();
