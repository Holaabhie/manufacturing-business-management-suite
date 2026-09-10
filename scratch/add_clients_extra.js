const fs = require('fs');

const extra = {
  en: {
    pdfTitle: "Clients Directory",
    pdfSubtitle: "Complete list of all registered clients",
    clientHeader: "Client: {name}",
    statusPending: "Pending",
    statusCompleted: "Completed",
    statusInProgress: "In Progress"
  },
  hi: {
    pdfTitle: "क्लाइंट डायरेक्टरी",
    pdfSubtitle: "सभी पंजीकृत क्लाइंट्स की पूरी सूची",
    clientHeader: "क्लाइंट: {name}",
    statusPending: "लंबित",
    statusCompleted: "पूर्ण",
    statusInProgress: "प्रगति पर"
  },
  gu: {
    pdfTitle: "ક્લાયન્ટ ડિરેક્ટરી",
    pdfSubtitle: "બધા નોંધાયેલા ક્લાયન્ટ્સની સંપૂર્ણ યાદી",
    clientHeader: "ક્લાયન્ટ: {name}",
    statusPending: "બાકી",
    statusCompleted: "પૂર્ણ",
    statusInProgress: "પ્રગતિમાં"
  },
  mr: {
    pdfTitle: "क्लायंट डिरेक्टरी",
    pdfSubtitle: "सर्व नोंदणीकृत क्लायंट्सची संपूर्ण यादी",
    clientHeader: "क्लायंट: {name}",
    statusPending: "प्रलंबित",
    statusCompleted: "पूर्ण",
    statusInProgress: "प्रगतीपथावर"
  }
};

for (const loc of ['en', 'hi', 'gu', 'mr']) {
  const jsonPath = `apps/web/messages/${loc}.json`;
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  data.clients = {
    ...data.clients,
    ...extra[loc]
  };
  fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2) + '\n', 'utf8');

  // Also update src/messages/${loc}.ts
  const tsPath = `apps/web/src/messages/${loc}.ts`;
  const tsContent = `const messages = ${JSON.stringify(data, null, 2)} as const;\n\nexport default messages;\n`;
  fs.writeFileSync(tsPath, tsContent, 'utf8');
}

console.log('Updated extra clients keys across all 4 locales and recompiled TS files!');
