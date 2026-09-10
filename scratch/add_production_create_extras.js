const fs = require('fs');

const extras = {
  en: {
    costSummaryTitle: "Cost & Profit Summary",
    costMaterial: "Material cost",
    costLabour: "Labour cost",
    costOverhead: "Overhead",
    costTotal: "Total cost",
    costSale: "Sale value",
    costMargin: "Net margin",
    secProductionSummary: "Production Summary",
    summaryOrderRequires: "Order requires {qty} units",
    shiftAfternoon: "Afternoon (2 PM - 10 PM)",
    lblLabourCost: "Labour Cost (INR)",
    lblOverheadCost: "Overhead (INR)",
    lblSaleValue: "Sale Value (INR)",
    lblNotes: "Production Notes (Optional)",
    placeholderNotes: "Special instructions, quality requirements, etc..."
  },
  hi: {
    costSummaryTitle: "लागत और लाभ सारांश",
    costMaterial: "सामग्री लागत",
    costLabour: "श्रम लागत",
    costOverhead: "ओवरहेड",
    costTotal: "कुल लागत",
    costSale: "बिक्री मूल्य",
    costMargin: "शुद्ध मार्जिन",
    secProductionSummary: "उत्पादन सारांश",
    summaryOrderRequires: "ऑर्डर के लिए {qty} इकाइयों की आवश्यकता है",
    shiftAfternoon: "दोपहर (2 अपराह्न - 10 अपराह्न)",
    lblLabourCost: "श्रम लागत (INR)",
    lblOverheadCost: "ओवरहेड (INR)",
    lblSaleValue: "बिक्री मूल्य (INR)",
    lblNotes: "उत्पादन नोट्स (वैकल्पिक)",
    placeholderNotes: "विशेष निर्देश, गुणवत्ता आवश्यकताएं, आदि..."
  },
  gu: {
    costSummaryTitle: "ખર્ચ અને નફાનો સારાંશ",
    costMaterial: "સામગ્રી ખર્ચ",
    costLabour: "મજૂરી ખર્ચ",
    costOverhead: "ઓવરહેડ",
    costTotal: "કુલ ખર્ચ",
    costSale: "વેચાણ મૂલ્ય",
    costMargin: "ચોખ્ખો નફો (માર્જિન)",
    secProductionSummary: "ઉત્પાદન સારાંશ",
    summaryOrderRequires: "ઓર્ડર માટે {qty} એકમો જરૂરી છે",
    shiftAfternoon: "બપોરે (2 PM - 10 PM)",
    lblLabourCost: "મજૂરી ખર્ચ (INR)",
    lblOverheadCost: "ઓવરહેડ (INR)",
    lblSaleValue: "વેચાણ મૂલ્ય (INR)",
    lblNotes: "ઉત્પાદન નોંધો (વૈકલ્પિક)",
    placeholderNotes: "ખાસ સૂચનાઓ, ગુણવત્તા જરૂરિયાતો, વગેરે..."
  },
  mr: {
    costSummaryTitle: "खर्च आणि नफा सारांश",
    costMaterial: "साहित्य खर्च",
    costLabour: "मजुरी खर्च",
    costOverhead: "ओव्हरहेड",
    costTotal: "एकूण खर्च",
    costSale: "विक्री मूल्य",
    costMargin: "निव्वळ नफा (मार्जिन)",
    secProductionSummary: "उत्पादन सारांश",
    summaryOrderRequires: "ऑर्डरसाठी {qty} युनिट्स आवश्यक आहेत",
    shiftAfternoon: "दुपार (2 PM - 10 PM)",
    lblLabourCost: "मजुरी खर्च (INR)",
    lblOverheadCost: "ओव्हरहेड (INR)",
    lblSaleValue: "विक्री मूल्य (INR)",
    lblNotes: "उत्पादन टिपा (पर्यायी)",
    placeholderNotes: "विशेष सूचना, गुणवत्ता आवश्यकता, इ..."
  }
};

['en', 'hi', 'gu', 'mr'].forEach(loc => {
  const jsonPath = `apps/web/messages/${loc}.json`;
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  Object.assign(data.production.create, extras[loc]);
  fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf8');

  const tsPath = `apps/web/src/messages/${loc}.ts`;
  const tsContent = `// Auto-generated locale messages for ${loc}\nconst messages = ${JSON.stringify(data, null, 2)} as const;\n\nexport default messages;\n`;
  fs.writeFileSync(tsPath, tsContent, 'utf8');
});

console.log('Successfully updated create extras across all 4 locales!');
