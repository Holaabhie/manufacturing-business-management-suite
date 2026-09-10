const fs = require('fs');

const locales = {
  en: {
    entityMachine: "machine",
    deleteConsequence: "will be permanently removed from machine management. This cannot be undone."
  },
  hi: {
    entityMachine: "मशीन",
    deleteConsequence: "मशीन प्रबंधन से स्थायी रूप से हटा दिया जाएगा। इसे पूर्ववत नहीं किया जा सकता।"
  },
  gu: {
    entityMachine: "મશીન",
    deleteConsequence: "મશીન મેનેજમેન્ટમાંથી કાયમ માટે દૂર કરવામાં આવશે. આ ક્રિયા પૂર્વવત્ કરી શકાતી નથી."
  },
  mr: {
    entityMachine: "मशीन",
    deleteConsequence: "मशीन व्यवस्थापनातून कायमचे काढून टाकले जाईल. ही कृती पूर्ववत केली जाऊ शकत नाही."
  }
};

for (const [lang, keys] of Object.entries(locales)) {
  const jsonPath = `apps/web/messages/${lang}.json`;
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  if (!data.machines) data.machines = {};
  Object.assign(data.machines, keys);
  fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf8');

  // Also compile to apps/web/src/messages/{lang}.ts
  const tsPath = `apps/web/src/messages/${lang}.ts`;
  const tsContent = `const messages = ${JSON.stringify(data, null, 2)} as const;\n\nexport default messages;\n`;
  fs.writeFileSync(tsPath, tsContent, 'utf8');

  console.log(`Updated and compiled ${lang}`);
}
