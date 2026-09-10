const fs = require('fs');

const file = 'apps/web/src/components/purchasing/RecordPaymentModal.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Add useTranslations import
code = code.replace(
  `import { useState, useEffect } from "react";`,
  `import { useState, useEffect } from "react";\nimport { useTranslations } from "next-intl";`
);

// 2. Add translation hooks
code = code.replace(
  `export function RecordPaymentModal({`,
  `export function RecordPaymentModal({\n  // Hooks\n`
);
code = code.replace(
  `  const [portalMounted, setPortalMounted] = useState(false);`,
  `  const t = useTranslations("purchasing.recordPayment");\n  const tToast = useTranslations("purchasing.toasts");\n  const [portalMounted, setPortalMounted] = useState(false);`
);

// 3. Toasts
code = code.replace(
  `toast.success("Payment recorded successfully");`,
  `toast.success(tToast("paymentRecorded"));`
);
code = code.replace(
  `toast.error("Failed to record payment");`,
  `toast.error(tToast("recordPaymentFailed"));`
);

// 4. Header title & outstanding
code = code.replace(
  `                    Record Payment\n                  </h2>`,
  `                    {t("title")}\n                  </h2>`
).replace(
  `                    Record Payment\r\n                  </h2>`,
  `                    {t("title")}\r\n                  </h2>`
);

code = code.replace(
  `                  Outstanding\n                </span>`,
  `                  {t("lblOutstanding")}\n                </span>`
).replace(
  `                  Outstanding\r\n                </span>`,
  `                  {t("lblOutstanding")}\r\n                </span>`
);

code = code.replace(
  `                  Outstanding\n                </span>\n                <span className="text-[17px] font-bold text-[#0F172A] dark:text-white tabular-nums">`,
  `                  {t("lblOutstanding")}\n                </span>\n                <span className="text-[17px] font-bold text-[#0F172A] dark:text-white tabular-nums">`
).replace(
  `                  Outstanding\r\n                </span>\r\n                <span className="text-[17px] font-bold text-[#0F172A] dark:text-white tabular-nums">`,
  `                  {t("lblOutstanding")}\r\n                </span>\r\n                <span className="text-[17px] font-bold text-[#0F172A] dark:text-white tabular-nums">`
);

// 5. Section 1 fields
code = code.replace(
  `                  <label className="text-[12px] font-medium text-[#64748B] dark:text-slate-400 uppercase tracking-wide">\n                    Amount\n                  </label>`,
  `                  <label className="text-[12px] font-medium text-[#64748B] dark:text-slate-400 uppercase tracking-wide">\n                    {t("lblAmount")}\n                  </label>`
).replace(
  `                  <label className="text-[12px] font-medium text-[#64748B] dark:text-slate-400 uppercase tracking-wide">\r\n                    Amount\r\n                  </label>`,
  `                  <label className="text-[12px] font-medium text-[#64748B] dark:text-slate-400 uppercase tracking-wide">\r\n                    {t("lblAmount")}\r\n                  </label>`
);

code = code.replace(
  `                  <label className="text-[12px] font-medium text-[#64748B] dark:text-slate-400 uppercase tracking-wide">\n                    Payment Mode\n                  </label>`,
  `                  <label className="text-[12px] font-medium text-[#64748B] dark:text-slate-400 uppercase tracking-wide">\n                    {t("lblPaymentMode")}\n                  </label>`
).replace(
  `                  <label className="text-[12px] font-medium text-[#64748B] dark:text-slate-400 uppercase tracking-wide">\r\n                    Payment Mode\r\n                  </label>`,
  `                  <label className="text-[12px] font-medium text-[#64748B] dark:text-slate-400 uppercase tracking-wide">\r\n                    {t("lblPaymentMode")}\r\n                  </label>`
);

code = code.replace(
  `                  <label className="text-[12px] font-medium text-[#64748B] dark:text-slate-400 uppercase tracking-wide">\n                    Payment Date\n                  </label>`,
  `                  <label className="text-[12px] font-medium text-[#64748B] dark:text-slate-400 uppercase tracking-wide">\n                    {t("lblPaymentDate")}\n                  </label>`
).replace(
  `                  <label className="text-[12px] font-medium text-[#64748B] dark:text-slate-400 uppercase tracking-wide">\r\n                    Payment Date\r\n                  </label>`,
  `                  <label className="text-[12px] font-medium text-[#64748B] dark:text-slate-400 uppercase tracking-wide">\r\n                    {t("lblPaymentDate")}\r\n                  </label>`
);

code = code.replace(
  `                  <label className="text-[12px] font-medium text-[#64748B] dark:text-slate-400 uppercase tracking-wide">\n                    Reference / UTR\n                  </label>`,
  `                  <label className="text-[12px] font-medium text-[#64748B] dark:text-slate-400 uppercase tracking-wide">\n                    {t("lblReference")}\n                  </label>`
).replace(
  `                  <label className="text-[12px] font-medium text-[#64748B] dark:text-slate-400 uppercase tracking-wide">\r\n                    Reference / UTR\r\n                  </label>`,
  `                  <label className="text-[12px] font-medium text-[#64748B] dark:text-slate-400 uppercase tracking-wide">\r\n                    {t("lblReference")}\r\n                  </label>`
);

// 6. Section 2: Notes
code = code.replace(
  `                  Payment Notes\n                </label>`,
  `                  {t("lblPaymentNotes")}\n                </label>`
).replace(
  `                  Payment Notes\r\n                </label>`,
  `                  {t("lblPaymentNotes")}\r\n                </label>`
);
code = code.replace(
  `placeholder="Note about the payment..."`,
  `placeholder={t("placeholderPaymentNotes")}`
);

// 7. Section 3: Summary
code = code.replace(
  `Payment Summary\n                </p>`,
  `{t("summaryTitle")}\n                </p>`
).replace(
  `Payment Summary\r\n                </p>`,
  `{t("summaryTitle")}\r\n                </p>`
);

code = code.replace(
  `                      Outstanding\n                    </p>`,
  `                      {t("summaryOutstanding")}\n                    </p>`
).replace(
  `                      Outstanding\r\n                    </p>`,
  `                      {t("summaryOutstanding")}\r\n                    </p>`
);

code = code.replace(
  `                      Recording\n                    </p>`,
  `                      {t("summaryRecording")}\n                    </p>`
).replace(
  `                      Recording\r\n                    </p>`,
  `                      {t("summaryRecording")}\r\n                    </p>`
);

code = code.replace(
  `                      Remaining\n                    </p>`,
  `                      {t("summaryRemaining")}\n                    </p>`
).replace(
  `                      Remaining\r\n                    </p>`,
  `                      {t("summaryRemaining")}\r\n                    </p>`
);

code = code.replace(
  `{remaining < 0 && " over"}`,
  `{remaining < 0 && \` \${t("summaryOver")}\`}`
);

// 8. Footer button
code = code.replace(
  `{submitting ? "Recording…" : "Record Payment"}`,
  `{submitting ? t("btnRecording") : t("btnRecord")}`
);

fs.writeFileSync(file, code, 'utf8');
console.log('RecordPaymentModal.tsx transformed successfully');
