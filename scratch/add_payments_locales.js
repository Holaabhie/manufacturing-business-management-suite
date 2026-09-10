const fs = require('fs');
const path = require('path');

const paymentsEn = {
  title: "Payments & Ledger",
  subtitle: "Manage client settlements, track outstanding balances, and view transaction history.",
  btnNewPayment: "New Payment Entry",
  kpi: {
    totalCollected: "Total Collected",
    outstandingArrears: "Outstanding Arrears",
    recoveryEfficiency: "Recovery Efficiency"
  },
  tabs: {
    activeDue: "Active Due",
    clientSummary: "Client Summary",
    fullHistory: "Full History"
  },
  searchPlaceholder: "Search financials...",
  table: {
    thClientOrder: "Client / Order",
    thTotalBilled: "Total Billed",
    thPaid: "Paid",
    thOutstanding: "Outstanding",
    thStatus: "Status",
    thDate: "Date",
    thClient: "Client",
    thMode: "Mode",
    thReferenceRemark: "Reference / Remark",
    thAmount: "Amount",
    lblBilled: "Billed:",
    lblPaid: "Paid:",
    lblOrdersBilled: "Orders Billed",
    lblPaymentsRecv: "Payments Recv.",
    lblCreditBalance: "Credit Balance"
  },
  statuses: {
    completed: "Completed",
    paid: "Paid",
    partial: "Partial",
    partiallyPaid: "Partially Paid",
    pending: "Pending",
    due: "Due",
    advance: "Advance",
    settled: "Settled",
    unknownClient: "Unknown",
    general: "General",
    generalPayment: "General Payment"
  },
  empty: {
    allSettledTitle: "All orders fully settled",
    allSettledDesc: "No pending dues",
    noRecords: "No payment records found."
  },
  modal: {
    title: "Record Payment",
    subtitle: "Track client payments and outstanding balances",
    lblOutstanding: "Outstanding",
    lblClient: "Client",
    selectClientPlaceholder: "Select Client",
    lblLinkedOrder: "Linked Order",
    duePrefix: "Due:",
    lblAmount: "Amount",
    lblPaymentMode: "Payment Mode",
    lblPaymentDate: "Payment Date",
    lblReference: "Reference / UTR",
    placeholderReference: "TXN...",
    lblPaymentNotes: "Payment Notes",
    placeholderPaymentNotes: "Note about the payment...",
    summaryTitle: "Payment Summary",
    summaryClient: "Client",
    summaryOrder: "Order",
    summaryOutstanding: "Outstanding",
    summaryRecording: "Recording",
    summaryRemaining: "Remaining",
    lblOver: "over",
    btnCancel: "Cancel",
    btnRecord: "Record Payment",
    btnRecording: "Recording…"
  },
  actions: {
    viewDetails: "View Details",
    recordPayment: "Record Payment",
    sendReminder: "Send Reminder",
    deletePayment: "Delete Payment",
    entityPayment: "Payment",
    deleteConsequence: "will be permanently deleted. This transaction record cannot be recovered."
  },
  toasts: {
    selectClientAmount: "Please select a client and enter a valid amount",
    orderNotFound: "Selected order not found",
    amountExceedsRemaining: "Amount exceeds remaining balance for this order (\u20B9{amount})",
    detailComingSoon: "Payment detail view coming soon",
    reminderComingSoon: "Reminder feature coming soon"
  }
};

const paymentsHi = {
  title: "भुगतान और लेजर",
  subtitle: "ग्राहक निपटान प्रबंधित करें, बकाया राशि ट्रैक करें और लेनदेन इतिहास देखें।",
  btnNewPayment: "नया भुगतान प्रविष्टि",
  kpi: {
    totalCollected: "कुल प्राप्त",
    outstandingArrears: "बकाया राशि",
    recoveryEfficiency: "वसूली दक्षता"
  },
  tabs: {
    activeDue: "सक्रिय बकाया",
    clientSummary: "ग्राहक सारांश",
    fullHistory: "पूरा इतिहास"
  },
  searchPlaceholder: "वित्तीय लेनदेन खोजें...",
  table: {
    thClientOrder: "ग्राहक / ऑर्डर",
    thTotalBilled: "कुल बिल",
    thPaid: "भुगतान किया",
    thOutstanding: "बकाया",
    thStatus: "स्थिति",
    thDate: "दिनांक",
    thClient: "ग्राहक",
    thMode: "माध्यम",
    thReferenceRemark: "संदर्भ / टिप्पणी",
    thAmount: "राशि",
    lblBilled: "बिल किया:",
    lblPaid: "भुगतान:",
    lblOrdersBilled: "ऑर्डर बिल किए गए",
    lblPaymentsRecv: "भुगतान प्राप्त",
    lblCreditBalance: "जमा शेष"
  },
  statuses: {
    completed: "पूर्ण",
    paid: "भुगतान किया",
    partial: "आंशिक",
    partiallyPaid: "आंशिक भुगतान",
    pending: "लंबित",
    due: "बकाया",
    advance: "अग्रिम",
    settled: "चुकाया गया",
    unknownClient: "अज्ञात",
    general: "सामान्य",
    generalPayment: "सामान्य भुगतान"
  },
  empty: {
    allSettledTitle: "सभी ऑर्डर का पूर्ण भुगतान हो चुका है",
    allSettledDesc: "कोई बकाया देय नहीं है",
    noRecords: "कोई भुगतान रिकॉर्ड नहीं मिला।"
  },
  modal: {
    title: "भुगतान दर्ज करें",
    subtitle: "ग्राहक भुगतान और बकाया शेष ट्रैक करें",
    lblOutstanding: "बकाया",
    lblClient: "ग्राहक",
    selectClientPlaceholder: "ग्राहक चुनें",
    lblLinkedOrder: "संबद्ध ऑर्डर",
    duePrefix: "बकाया:",
    lblAmount: "राशि",
    lblPaymentMode: "भुगतान का माध्यम",
    lblPaymentDate: "भुगतान की तारीख",
    lblReference: "संदर्भ / UTR",
    placeholderReference: "TXN...",
    lblPaymentNotes: "भुगतान टिप्पणी",
    placeholderPaymentNotes: "भुगतान के बारे में टिप्पणी लिखें...",
    summaryTitle: "भुगतान सारांश",
    summaryClient: "ग्राहक",
    summaryOrder: "ऑर्डर",
    summaryOutstanding: "बकाया",
    summaryRecording: "दर्ज की जा रही",
    summaryRemaining: "शेष",
    lblOver: "अधिक",
    btnCancel: "रद्द करें",
    btnRecord: "भुगतान दर्ज करें",
    btnRecording: "दर्ज हो रहा है…"
  },
  actions: {
    viewDetails: "विवरण देखें",
    recordPayment: "भुगतान दर्ज करें",
    sendReminder: "याद दिलाएं",
    deletePayment: "भुगतान हटाएं",
    entityPayment: "भुगतान",
    deleteConsequence: "स्थायी रूप से हटा दिया जाएगा। यह लेनदेन रिकॉर्ड पुनर्प्राप्त नहीं किया जा सकता।"
  },
  toasts: {
    selectClientAmount: "कृपया एक ग्राहक चुनें और एक मान्य राशि दर्ज करें",
    orderNotFound: "चयनित ऑर्डर नहीं मिला",
    amountExceedsRemaining: "राशि इस ऑर्डर की शेष बकाया राशि (\u20B9{amount}) से अधिक है",
    detailComingSoon: "भुगतान विवरण दृश्य जल्द आ रहा है",
    reminderComingSoon: "रिमाइंडर सुविधा जल्द आ रही है"
  }
};

const paymentsGu = {
  title: "ચુકવણી અને લેજર",
  subtitle: "ગ્રાહક સેટલમેન્ટ મેનેજ કરો, બાકી રકમ ટ્રેક કરો અને વ્યવહાર ઇતિહાસ જુઓ.",
  btnNewPayment: "નવી ચુકવણી એન્ટ્રી",
  kpi: {
    totalCollected: "કુલ મળેલ",
    outstandingArrears: "બાકી લેણાં",
    recoveryEfficiency: "રિકવરી કાર્યક્ષમતા"
  },
  tabs: {
    activeDue: "સક્રિય બાકી",
    clientSummary: "ગ્રાહક સારાંશ",
    fullHistory: "સંપૂર્ણ ઇતિહાસ"
  },
  searchPlaceholder: "નાણાકીય વ્યવહારો શોધો...",
  table: {
    thClientOrder: "ગ્રાહક / ઓર્ડર",
    thTotalBilled: "કુલ બિલ",
    thPaid: "ચૂકવેલ",
    thOutstanding: "બાકી",
    thStatus: "સ્થિતિ",
    thDate: "તારીખ",
    thClient: "ગ્રાહક",
    thMode: "માધ્યમ",
    thReferenceRemark: "સંદર્ભ / નોંધ",
    thAmount: "રકમ",
    lblBilled: "બિલ કરેલ:",
    lblPaid: "ચૂકવેલ:",
    lblOrdersBilled: "ઓર્ડર બિલ કરેલ",
    lblPaymentsRecv: "ચુકવણીઓ મળેલ",
    lblCreditBalance: "જમા બાકી"
  },
  statuses: {
    completed: "પૂર્ણ",
    paid: "ચૂકવેલ",
    partial: "આંશિક",
    partiallyPaid: "આંશિક ચૂકવેલ",
    pending: "બાકી",
    due: "બાકી",
    advance: "એડવાન્સ",
    settled: "ચૂકવાઈ ગયેલ",
    unknownClient: "અજ્ઞાત",
    general: "સામાન્ય",
    generalPayment: "સામાન્ય ચુકવણી"
  },
  empty: {
    allSettledTitle: "બધા ઓર્ડર સંપૂર્ણપણે પતી ગયા છે",
    allSettledDesc: "કોઈ બાકી લેણાં નથી",
    noRecords: "કોઈ ચુકવણી રેકોર્ડ મળ્યા નથી."
  },
  modal: {
    title: "ચુકવણી નોંધો",
    subtitle: "ગ્રાહક ચુકવણી અને બાકી બેલેન્સ ટ્રેક કરો",
    lblOutstanding: "બાકી",
    lblClient: "ગ્રાહક",
    selectClientPlaceholder: "ગ્રાહક પસંદ કરો",
    lblLinkedOrder: "જોડાયેલ ઓર્ડર",
    duePrefix: "બાકી:",
    lblAmount: "રકમ",
    lblPaymentMode: "ચુકવણી પદ્ધતિ",
    lblPaymentDate: "ચુકવણી તારીખ",
    lblReference: "સંદર્ભ / UTR",
    placeholderReference: "TXN...",
    lblPaymentNotes: "ચુકવણી નોંધો",
    placeholderPaymentNotes: "ચુકવણી વિશે નોંધ લખો...",
    summaryTitle: "ચુકવણી સારાંશ",
    summaryClient: "ગ્રાહક",
    summaryOrder: "ઓર્ડર",
    summaryOutstanding: "બાકી",
    summaryRecording: "નોંધાઈ રહેલ",
    summaryRemaining: "બાકી રહેલ",
    lblOver: "વધુ",
    btnCancel: "રદ કરો",
    btnRecord: "ચુકવણી નોંધો",
    btnRecording: "નોંધાઈ રહ્યું છે…"
  },
  actions: {
    viewDetails: "વિગતો જુઓ",
    recordPayment: "ચુકવણી નોંધો",
    sendReminder: "રીમાઇન્ડર મોકલો",
    deletePayment: "ચુકવણી કાઢી નાખો",
    entityPayment: "ચુકવણી",
    deleteConsequence: "કાયમ માટે કાઢી નાખવામાં આવશે. આ વ્યવહાર રેકોર્ડ પુનઃપ્રાપ્ત કરી શકાતો નથી."
  },
  toasts: {
    selectClientAmount: "કૃપા કરીને ગ્રાહક પસંદ કરો અને માન્ય રકમ દાખલ કરો",
    orderNotFound: "પસંદ કરેલ ઓર્ડર મળ્યો નથી",
    amountExceedsRemaining: "આ ઓર્ડર માટે બાકી રહેલી રકમ (\u20B9{amount}) કરતાં રકમ વધી જાય છે",
    detailComingSoon: "ચુકવણી વિગત દૃશ્ય ટૂંક સમયમાં આવી રહ્યું છે",
    reminderComingSoon: "રીમાઇન્ડર સુવિધા ટૂંક સમયમાં આવી રહી છે"
  }
};

const paymentsMr = {
  title: "पेमेंट आणि लेजर",
  subtitle: "ग्राहक सेटलमेंट व्यवस्थापित करा, शिल्लक रक्कम ट्रॅक करा आणि व्यवहार इतिहास पहा.",
  btnNewPayment: "नवीन पेमेंट नोंद",
  kpi: {
    totalCollected: "एकूण जमा",
    outstandingArrears: "शिल्लक थकबाकी",
    recoveryEfficiency: "वसुली कार्यक्षमता"
  },
  tabs: {
    activeDue: "सक्रिय बाकी",
    clientSummary: "ग्राहक सारांश",
    fullHistory: "संपूर्ण इतिहास"
  },
  searchPlaceholder: "वित्तीय व्यवहार शोधा...",
  table: {
    thClientOrder: "ग्राहक / ऑर्डर",
    thTotalBilled: "एकूण बिल",
    thPaid: "जमा केलेले",
    thOutstanding: "शिल्लक",
    thStatus: "स्थिती",
    thDate: "तारीख",
    thClient: "ग्राहक",
    thMode: "माध्यम",
    thReferenceRemark: "संदर्भ / शेरा",
    thAmount: "रक्कम",
    lblBilled: "बिल केलेले:",
    lblPaid: "जमा:",
    lblOrdersBilled: "ऑर्डर्स बिल केलेले",
    lblPaymentsRecv: "पेमेंट जमा",
    lblCreditBalance: "जमा शिल्लक"
  },
  statuses: {
    completed: "पूर्ण",
    paid: "जमा",
    partial: "अंशतः",
    partiallyPaid: "अंशतः भरलेले",
    pending: "प्रलंबित",
    due: "बाकी",
    advance: "आगाऊ",
    settled: "निकाली काढलेले",
    unknownClient: "अज्ञात",
    general: "सामान्य",
    generalPayment: "सामान्य पेमेंट"
  },
  empty: {
    allSettledTitle: "सर्व ऑर्डर्स पूर्णपणे निकाली काढल्या आहेत",
    allSettledDesc: "कोणतीही देणी बाकी नाहीत",
    noRecords: "कोणतेही पेमेंट रेकॉर्ड आढळले नाही."
  },
  modal: {
    title: "पेमेंट नोंदवा",
    subtitle: "ग्राहक पेमेंट आणि शिल्लक ट्रॅक करा",
    lblOutstanding: "शिल्लक",
    lblClient: "ग्राहक",
    selectClientPlaceholder: "ग्राहक निवडा",
    lblLinkedOrder: "जोडलेली ऑर्डर",
    duePrefix: "बाकी:",
    lblAmount: "रक्कम",
    lblPaymentMode: "पेमेंट पद्धत",
    lblPaymentDate: "पेमेंट तारीख",
    lblReference: "संदर्भ / UTR",
    placeholderReference: "TXN...",
    lblPaymentNotes: "पेमेंट शेरा",
    placeholderPaymentNotes: "पेमेंटबद्दल शेरा लिहा...",
    summaryTitle: "पेमेंट सारांश",
    summaryClient: "ग्राहक",
    summaryOrder: "ऑर्डर",
    summaryOutstanding: "शिल्लक",
    summaryRecording: "नोंदवत असलेली",
    summaryRemaining: "उर्वरित",
    lblOver: "जास्त",
    btnCancel: "रद्द करा",
    btnRecord: "पेमेंट नोंदवा",
    btnRecording: "नोंदवत आहे…"
  },
  actions: {
    viewDetails: "तपशील पहा",
    recordPayment: "पेमेंट नोंदवा",
    sendReminder: "स्मरणपत्र पाठवा",
    deletePayment: "पेमेंट हटवा",
    entityPayment: "पेमेंट",
    deleteConsequence: "कायमचे हटवले जाईल. हा व्यवहार रेकॉर्ड पुनर्प्राप्त केला जाऊ शकत नाही."
  },
  toasts: {
    selectClientAmount: "कृपया ग्राहक निवडा आणि वैध रक्कम प्रविष्ट करा",
    orderNotFound: "निवडलेली ऑर्डर आढळली नाही",
    amountExceedsRemaining: "या ऑर्डरसाठी शिल्लक रकमेपेक्षा (\u20B9{amount}) रक्कम जास्त आहे",
    detailComingSoon: "पेमेंट तपशील दृश्य लवकरच येत आहे",
    reminderComingSoon: "स्मरणपत्र वैशिष्ट्य लवकरच येत आहे"
  }
};

const map = {
  en: paymentsEn,
  hi: paymentsHi,
  gu: paymentsGu,
  mr: paymentsMr
};

['en', 'hi', 'gu', 'mr'].forEach(loc => {
  const jsonPath = path.join(__dirname, '..', 'apps', 'web', 'messages', `${loc}.json`);
  const tsPath = path.join(__dirname, '..', 'apps', 'web', 'src', 'messages', `${loc}.ts`);

  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  data.payments = map[loc];
  fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2) + '\n', 'utf8');
  console.log(`Updated ${jsonPath}`);

  const tsContent = `const messages = ${JSON.stringify(data, null, 2)} as const;\n\nexport default messages;\n`;
  fs.writeFileSync(tsPath, tsContent, 'utf8');
  console.log(`Updated ${tsPath}`);
});

console.log('Successfully added payments namespace across all 4 locales!');
