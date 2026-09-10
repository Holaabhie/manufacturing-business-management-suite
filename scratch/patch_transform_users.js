const fs = require('fs');

let s = fs.readFileSync('scratch/transform_users_page.js', 'utf8').replace(/\r\n/g, '\n');

// 1. Component start
const oldComp = "const oldComponentStart = `export default function UsersPage() {\n    const router = useRouter();`;\n\nconst newComponentStart = `export default function UsersPage() {\n    const router = useRouter();\n    const t = useTranslations(\"users\");\n    const tCommon = useTranslations(\"common\");\n    const { locale } = useAppLocale();\n    const dateLocale = locale === \"hi\" ? \"hi-IN\" : locale === \"gu\" ? \"gu-IN\" : locale === \"mr\" ? \"mr-IN\" : \"en-IN\";\n    const getTemplateLabel = (key: string) => t(`templates.${key}` as any) || TEMPLATE_LABELS[key] || key;\n    const getDepartmentLabel = (key: string) => t(`departments.${key}` as any) || key;`;";

const correctComp = "const oldComponentStart = `export default function EmployeeManagementPage() {\n    const tCommon = useTranslations(\"common\");\n    const router = useRouter();`;\n\nconst newComponentStart = `export default function EmployeeManagementPage() {\n    const t = useTranslations(\"users\");\n    const tCommon = useTranslations(\"common\");\n    const router = useRouter();\n    const { locale } = useAppLocale();\n    const dateLocale = locale === \"hi\" ? \"hi-IN\" : locale === \"gu\" ? \"gu-IN\" : locale === \"mr\" ? \"mr-IN\" : \"en-IN\";\n    const getTemplateLabel = (key: string) => t(`templates.${key}` as any) || TEMPLATE_LABELS[key] || key;\n    const getDepartmentLabel = (key: string) => t(`departments.${key}` as any) || key;`;";

if (s.includes(oldComp)) {
  s = s.replace(oldComp, correctComp);
  console.log('Replaced oldComponentStart!');
} else {
  console.log('Could not find oldComponentStart directly, will use regex');
  s = s.replace(/const oldComponentStart = `export default function UsersPage\(\)[\s\S]*?departments\.\${key}` as any\) \|\| key;`;/, correctComp);
}

// 2. Change password requirements
s = s.replace(/code = code\.replace\(\s*`\/?} 8\+ chars[\s\S]*?`\s*,\s*`\/> \{t\("reqMinChars"\)\}[\s\S]*?`\s*\);/, 'code = code.replace(\'/>} 8+ chars\\n\', \'/>} {t("reqMinChars")}\\n\');');
s = s.replace(/code = code\.replace\(\s*`\/?} Uppercase[\s\S]*?`\s*,\s*`\/> \{t\("reqUppercase"\)\}[\s\S]*?`\s*\);/, 'code = code.replace(\'/>} Uppercase\\n\', \'/>} {t("reqUppercase")}\\n\');');
s = s.replace(/code = code\.replace\(\s*`\/?} Lowercase[\s\S]*?`\s*,\s*`\/> \{t\("reqLowercase"\)\}[\s\S]*?`\s*\);/, 'code = code.replace(\'/>} Lowercase\\n\', \'/>} {t("reqLowercase")}\\n\');');
s = s.replace(/code = code\.replace\(\s*`\/?} Number[\s\S]*?`\s*,\s*`\/> \{t\("reqNumber"\)\}[\s\S]*?`\s*\);/, 'code = code.replace(\'/>} Number\\n\', \'/>} {t("reqNumber")}\\n\');');

fs.writeFileSync('scratch/transform_users_page.js', s, 'utf8');
console.log('Saved scratch/transform_users_page.js');
