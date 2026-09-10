const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'apps', 'web', 'src', 'app', 'dashboard', 'payments', 'page.tsx');
let code = fs.readFileSync(filePath, 'utf8');

// Normalize CRLF to LF for clean replacement
code = code.replace(/\r\n/g, '\n');

function replaceExact(search, replace, label) {
  if (!code.includes(search)) {
    console.error(`ERROR: Target not found for: ${label}`);
    process.exit(1);
  }
  code = code.replace(search, replace);
  console.log(`OK: ${label}`);
}

// 1. Import
replaceExact(
  'import { useTranslations } from "next-intl";',
  'import { useTranslations } from "next-intl";\nimport { useAppLocale } from "@/components/LocaleProvider";',
  'Import useAppLocale'
);

// 2. PaymentHistoryCard
const oldCard = `// ─── PaymentHistoryCard — wrapper for useLongPress hook ─
function PaymentHistoryCard({
  payment,
  onLongPress,
}: {
  payment: Payment;
  onLongPress: (p: Payment) => void;
}) {
  const color = METHOD_COLORS[payment.paymentMethod] || '#6366f1';
  const MethodIcon = METHOD_ICONS[payment.paymentMethod] || Banknote;

  const longPressHandlers = useLongPress(
    () => onLongPress(payment),
    undefined,
  );

  return (
    <div
      className="bg-white dark:bg-[#1C2333] rounded-[14px] border border-black/[0.04] dark:border-white/[0.06] shadow-[0_1px_3px_rgba(0,0,0,0.08)] overflow-hidden cursor-pointer active:scale-[0.98] transition-transform duration-150"
      style={{ borderLeftWidth: 4, borderLeftColor: color }}
      {...longPressHandlers}
    >
      <div className="px-4 py-3 space-y-1.5">
        {/* Row 1: Client + amount */}
        <div className="flex items-start justify-between gap-2">
          <span className="text-[15px] font-semibold text-[var(--foreground)] truncate flex-1">
            {payment.client?.name || 'Unknown'}
          </span>
          <span className="text-[15px] font-bold text-emerald-500 dark:text-emerald-400 tabular-nums whitespace-nowrap">
            +{"\\u20B9"}{Number(payment.amount ?? 0).toLocaleString('en-IN')}
          </span>
        </div>
        {/* Row 2: Method badge + Completed badge */}
        <div className="flex items-center gap-2">
          <span
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider"
            style={{ background: \`\${color}15\`, color, border: \`1px solid \${color}30\` }}
          >
            <MethodIcon className="h-3 w-3" />
            {payment.paymentMethod}
          </span>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border border-emerald-500/20">
            Completed
          </span>
        </div>
        {/* Row 3: Product/ref · date */}
        <div className="flex items-center justify-between gap-2 text-[12px] text-[var(--muted-foreground)]">
          <span className="truncate">
            {payment.order?.productName || payment.referenceId || 'General'}
          </span>
          {payment.paymentDate && (
            <span className="whitespace-nowrap">
              {new Date(payment.paymentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}`;

const newCard = `// ─── PaymentHistoryCard — wrapper for useLongPress hook ─
function PaymentHistoryCard({
  payment,
  onLongPress,
}: {
  payment: Payment;
  onLongPress: (p: Payment) => void;
}) {
  const t = useTranslations("payments");
  const { locale } = useAppLocale();
  const dateLocale = locale === 'hi' ? 'hi-IN' : locale === 'gu' ? 'gu-IN' : locale === 'mr' ? 'mr-IN' : 'en-IN';
  const color = METHOD_COLORS[payment.paymentMethod] || '#6366f1';
  const MethodIcon = METHOD_ICONS[payment.paymentMethod] || Banknote;

  const longPressHandlers = useLongPress(
    () => onLongPress(payment),
    undefined,
  );

  return (
    <div
      className="bg-white dark:bg-[#1C2333] rounded-[14px] border border-black/[0.04] dark:border-white/[0.06] shadow-[0_1px_3px_rgba(0,0,0,0.08)] overflow-hidden cursor-pointer active:scale-[0.98] transition-transform duration-150"
      style={{ borderLeftWidth: 4, borderLeftColor: color }}
      {...longPressHandlers}
    >
      <div className="px-4 py-3 space-y-1.5">
        {/* Row 1: Client + amount */}
        <div className="flex items-start justify-between gap-2">
          <span className="text-[15px] font-semibold text-[var(--foreground)] truncate flex-1">
            {payment.client?.name || t("statuses.unknownClient")}
          </span>
          <span className="text-[15px] font-bold text-emerald-500 dark:text-emerald-400 tabular-nums whitespace-nowrap">
            +{"\\u20B9"}{Number(payment.amount ?? 0).toLocaleString(dateLocale)}
          </span>
        </div>
        {/* Row 2: Method badge + Completed badge */}
        <div className="flex items-center gap-2">
          <span
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider"
            style={{ background: \`\${color}15\`, color, border: \`1px solid \${color}30\` }}
          >
            <MethodIcon className="h-3 w-3" />
            {payment.paymentMethod}
          </span>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border border-emerald-500/20">
            {t("statuses.completed")}
          </span>
        </div>
        {/* Row 3: Product/ref · date */}
        <div className="flex items-center justify-between gap-2 text-[12px] text-[var(--muted-foreground)]">
          <span className="truncate">
            {payment.order?.productName || payment.referenceId || t("statuses.general")}
          </span>
          {payment.paymentDate && (
            <span className="whitespace-nowrap">
              {new Date(payment.paymentDate).toLocaleDateString(dateLocale, { day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}`;

replaceExact(oldCard, newCard, 'PaymentHistoryCard localization');

// 3. Skeleton layout containment
replaceExact(
  '<div className="space-y-8 animate-in fade-in duration-300">',
  '<div className="w-full min-w-0 overflow-x-hidden space-y-8 animate-in fade-in duration-300">',
  'PaymentsSkeleton containment'
);

// 4. PaymentsPage hook initialization
replaceExact(
  'export default function PaymentsPage() {\n  const tCommon = useTranslations("common");',
  'export default function PaymentsPage() {\n  const t = useTranslations("payments");\n  const tCommon = useTranslations("common");\n  const { locale } = useAppLocale();\n  const dateLocale = locale === \'hi\' ? \'hi-IN\' : locale === \'gu\' ? \'gu-IN\' : locale === \'mr\' ? \'mr-IN\' : \'en-IN\';',
  'PaymentsPage hooks'
);

// 5. Toast validations
replaceExact(
  'return toast.error("Please select a client and enter a valid amount");',
  'return toast.error(t("toasts.selectClientAmount"));',
  'Toast select client amount'
);

replaceExact(
  'if (!selectedOrder) return toast.error("Selected order not found");',
  'if (!selectedOrder) return toast.error(t("toasts.orderNotFound"));',
  'Toast order not found'
);

replaceExact(
  'return toast.error(`Amount exceeds remaining balance for this order (\\u20B9${remaining.toLocaleString()})`);',
  'return toast.error(t("toasts.amountExceedsRemaining", { amount: remaining.toLocaleString(dateLocale) }));',
  'Toast amount exceeds remaining'
);

// 6. Page root containment and header
replaceExact(
  '  return (\n    <div className="space-y-8">\n      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">\n        <div>\n          <h1 className="text-3xl font-bold tracking-tight">Payments & Ledger</h1>\n          <p className="text-zinc-500">Manage client settlements, track outstanding balances, and view transaction history.</p>\n        </div>\n        <IOSButton variant="filled" className="px-5" onClick={() => setIsDialogOpen(true)}>\n          <Plus className="mr-2 h-4 w-4" /> New Payment Entry\n        </IOSButton>\n      </div>',
  '  return (\n    <div className="w-full min-w-0 overflow-x-hidden space-y-8">\n      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">\n        <div>\n          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>\n          <p className="text-zinc-500">{t("subtitle")}</p>\n        </div>\n        <IOSButton variant="filled" className="px-5" onClick={() => setIsDialogOpen(true)}>\n          <Plus className="mr-2 h-4 w-4" /> {t("btnNewPayment")}\n        </IOSButton>\n      </div>',
  'Page root containment and header'
);

// 7. Modal header
replaceExact(
  '<h2 id="record-payment-title" className="text-[17px] font-semibold text-[#0F172A] dark:text-white leading-tight">\n                        Record Payment\n                      </h2>',
  '<h2 id="record-payment-title" className="text-[17px] font-semibold text-[#0F172A] dark:text-white leading-tight">\n                        {t("modal.title")}\n                      </h2>',
  'Modal title'
);

replaceExact(
  '<p className="text-[13px] text-[#64748B] dark:text-slate-400 mt-0.5">\n                        Track client payments and outstanding balances\n                      </p>',
  '<p className="text-[13px] text-[#64748B] dark:text-slate-400 mt-0.5">\n                        {t("modal.subtitle")}\n                      </p>',
  'Modal subtitle'
);

replaceExact(
  '<span className="text-[11px] font-medium text-[#64748B] dark:text-slate-400 uppercase tracking-wide">Outstanding</span>',
  '<span className="text-[11px] font-medium text-[#64748B] dark:text-slate-400 uppercase tracking-wide">{t("modal.lblOutstanding")}</span>',
  'Modal header outstanding badge'
);

// 8. Modal form fields
replaceExact(
  '<label className="text-[12px] font-medium text-[#64748B] dark:text-slate-400 uppercase tracking-wide">Client</label>',
  '<label className="text-[12px] font-medium text-[#64748B] dark:text-slate-400 uppercase tracking-wide">{t("modal.lblClient")}</label>',
  'Modal client label'
);

replaceExact(
  '<option value="" disabled>Select Client</option>',
  '<option value="" disabled>{t("modal.selectClientPlaceholder")}</option>',
  'Modal select client placeholder'
);

replaceExact(
  '<label className="text-[12px] font-medium text-[#64748B] dark:text-slate-400 uppercase tracking-wide">Linked Order</label>',
  '<label className="text-[12px] font-medium text-[#64748B] dark:text-slate-400 uppercase tracking-wide">{t("modal.lblLinkedOrder")}</label>',
  'Modal linked order label'
);

replaceExact(
  '<option value="none">General Payment</option>',
  '<option value="none">{t("statuses.generalPayment")}</option>',
  'Modal general payment option'
);

replaceExact(
  '{o.productName} (Due: {"\\u20B9"}{formatIndianNumber(orderDue)})',
  '{o.productName} ({t("modal.duePrefix")} {"\\u20B9"}{formatIndianNumber(orderDue)})',
  'Modal order due option label'
);

replaceExact(
  '<label className="text-[12px] font-medium text-[#64748B] dark:text-slate-400 uppercase tracking-wide">Amount</label>',
  '<label className="text-[12px] font-medium text-[#64748B] dark:text-slate-400 uppercase tracking-wide">{t("modal.lblAmount")}</label>',
  'Modal amount label'
);

replaceExact(
  '<label className="text-[12px] font-medium text-[#64748B] dark:text-slate-400 uppercase tracking-wide">Payment Mode</label>',
  '<label className="text-[12px] font-medium text-[#64748B] dark:text-slate-400 uppercase tracking-wide">{t("modal.lblPaymentMode")}</label>',
  'Modal payment mode label'
);

replaceExact(
  '<label className="text-[12px] font-medium text-[#64748B] dark:text-slate-400 uppercase tracking-wide">Payment Date</label>',
  '<label className="text-[12px] font-medium text-[#64748B] dark:text-slate-400 uppercase tracking-wide">{t("modal.lblPaymentDate")}</label>',
  'Modal payment date label'
);

replaceExact(
  '<label className="text-[12px] font-medium text-[#64748B] dark:text-slate-400 uppercase tracking-wide">Reference / UTR</label>',
  '<label className="text-[12px] font-medium text-[#64748B] dark:text-slate-400 uppercase tracking-wide">{t("modal.lblReference")}</label>',
  'Modal reference label'
);

replaceExact(
  'placeholder="TXN..."',
  'placeholder={t("modal.placeholderReference")}',
  'Modal reference placeholder'
);

replaceExact(
  '<label className="text-[12px] font-medium text-[#64748B] dark:text-slate-400 uppercase tracking-wide">Payment Notes</label>',
  '<label className="text-[12px] font-medium text-[#64748B] dark:text-slate-400 uppercase tracking-wide">{t("modal.lblPaymentNotes")}</label>',
  'Modal payment notes label'
);

replaceExact(
  'placeholder="Note about the payment..."',
  'placeholder={t("modal.placeholderPaymentNotes")}',
  'Modal payment notes placeholder'
);

// 9. Modal Summary Card
replaceExact(
  '<p className="text-[11px] font-semibold text-[#64748B] dark:text-slate-400 uppercase tracking-widest mb-3">Payment Summary</p>',
  '<p className="text-[11px] font-semibold text-[#64748B] dark:text-slate-400 uppercase tracking-widest mb-3">{t("modal.summaryTitle")}</p>',
  'Modal summary title'
);

replaceExact(
  '<p className="text-[11px] text-[#64748B] dark:text-slate-500 mb-0.5">Client</p>',
  '<p className="text-[11px] text-[#64748B] dark:text-slate-500 mb-0.5">{t("modal.summaryClient")}</p>',
  'Modal summary client label'
);

replaceExact(
  '<p className="text-[11px] text-[#64748B] dark:text-slate-500 mb-0.5">Order</p>',
  '<p className="text-[11px] text-[#64748B] dark:text-slate-500 mb-0.5">{t("modal.summaryOrder")}</p>',
  'Modal summary order label'
);

replaceExact(
  '<p className="text-[11px] text-[#64748B] dark:text-slate-500 mb-0.5">Outstanding</p>',
  '<p className="text-[11px] text-[#64748B] dark:text-slate-500 mb-0.5">{t("modal.summaryOutstanding")}</p>',
  'Modal summary outstanding label'
);

replaceExact(
  '<p className="text-[11px] text-[#64748B] dark:text-slate-500 mb-0.5">Recording</p>',
  '<p className="text-[11px] text-[#64748B] dark:text-slate-500 mb-0.5">{t("modal.summaryRecording")}</p>',
  'Modal summary recording label'
);

replaceExact(
  '<p className="text-[11px] text-[#64748B] dark:text-slate-500 mb-0.5">Remaining</p>',
  '<p className="text-[11px] text-[#64748B] dark:text-slate-500 mb-0.5">{t("modal.summaryRemaining")}</p>',
  'Modal summary remaining label'
);

replaceExact(
  "{remaining < 0 && ' over'}",
  "{remaining < 0 && ` ${t(\"modal.lblOver\")}`}",
  'Modal summary over label'
);

// 10. Modal footer buttons
replaceExact(
  'Cancel\n                  </button>',
  '{t("modal.btnCancel")}\n                  </button>',
  'Modal cancel button'
);

replaceExact(
  "{createPayment.isPending ? 'Recording\\u2026' : 'Record Payment'}",
  '{createPayment.isPending ? t("modal.btnRecording") : t("modal.btnRecord")}',
  'Modal submit button'
);

// 11. KPI widgets
replaceExact(
  'label="Total Collected"',
  'label={t("kpi.totalCollected")}',
  'KPI total collected'
);

replaceExact(
  'label="Outstanding Arrears"',
  'label={t("kpi.outstandingArrears")}',
  'KPI outstanding arrears'
);

replaceExact(
  'label="Recovery Efficiency"',
  'label={t("kpi.recoveryEfficiency")}',
  'KPI recovery efficiency'
);

// 12. Tabs & search
replaceExact(
  'Active Due\n            </button>',
  '{t("tabs.activeDue")}\n            </button>',
  'Tab active due'
);

replaceExact(
  'Client Summary\n            </button>',
  '{t("tabs.clientSummary")}\n            </button>',
  'Tab client summary'
);

replaceExact(
  'Full History\n            </button>',
  '{t("tabs.fullHistory")}\n            </button>',
  'Tab full history'
);

replaceExact(
  'placeholder="Search financials..."',
  'placeholder={t("searchPlaceholder")}',
  'Search placeholder'
);

// 13. Receivables mobile cards
replaceExact(
  '<p style={{ fontSize: 15, fontWeight: 600, color: \'#34d399\', display: \'flex\', alignItems: \'center\', justifyContent: \'center\', gap: 6 }}>All orders fully settled <Sparkles size={16} style={{ color: \'#34d399\' }} /></p>\n                <p style={{ fontSize: 13, color: \'#64748B\', marginTop: 4, fontWeight: 400 }}>No pending dues</p>',
  '<p style={{ fontSize: 15, fontWeight: 600, color: \'#34d399\', display: \'flex\', alignItems: \'center\', justifyContent: \'center\', gap: 6 }}>{t("empty.allSettledTitle")} <Sparkles size={16} style={{ color: \'#34d399\' }} /></p>\n                <p style={{ fontSize: 13, color: \'#64748B\', marginTop: 4, fontWeight: 400 }}>{t("empty.allSettledDesc")}</p>',
  'Mobile empty all settled'
);

replaceExact(
  '{order.client?.name || \'Unknown\'}',
  '{order.client?.name || t("statuses.unknownClient")}',
  'Mobile card client unknown'
);

replaceExact(
  'Billed: {"\\u20B9"}{Number(order.totalAmount ?? 0).toLocaleString(\'en-IN\')}',
  '{t("table.lblBilled")} {"\\u20B9"}{Number(order.totalAmount ?? 0).toLocaleString(dateLocale)}',
  'Mobile card billed amount'
);

replaceExact(
  'Paid: {"\\u20B9"}{Number(paid ?? 0).toLocaleString(\'en-IN\')}',
  '{t("table.lblPaid")} {"\\u20B9"}{Number(paid ?? 0).toLocaleString(dateLocale)}',
  'Mobile card paid amount'
);

replaceExact(
  "{order.paymentStatus === 'partial' ? 'Partial' : 'Pending'}",
  "{order.paymentStatus === 'partial' ? t(\"statuses.partial\") : t(\"statuses.pending\")}",
  'Mobile card status badge'
);

// 14. Receivables desktop table
replaceExact(
  '<th scope="col" className="px-6 py-4 font-semibold rounded-tl-[16px]">Client / Order</th>\n                    <th scope="col" className="px-6 py-4 font-semibold">Total Billed</th>\n                    <th scope="col" className="px-6 py-4 font-semibold">Paid</th>\n                    <th scope="col" className="px-6 py-4 font-semibold text-right">Outstanding</th>\n                    <th scope="col" className="px-6 py-4 font-semibold text-center">Status</th>',
  '<th scope="col" className="px-6 py-4 font-semibold rounded-tl-[16px]">{t("table.thClientOrder")}</th>\n                    <th scope="col" className="px-6 py-4 font-semibold">{t("table.thTotalBilled")}</th>\n                    <th scope="col" className="px-6 py-4 font-semibold">{t("table.thPaid")}</th>\n                    <th scope="col" className="px-6 py-4 font-semibold text-right">{t("table.thOutstanding")}</th>\n                    <th scope="col" className="px-6 py-4 font-semibold text-center">{t("table.thStatus")}</th>',
  'Receivables desktop table th'
);

replaceExact(
  '<span style={{ display: \'inline-flex\', alignItems: \'center\', gap: 6 }}>All orders fully settled <Sparkles size={16} style={{ color: \'#34d399\' }} /></span>\n                      <p style={{ fontSize: 13, color: \'#64748B\', marginTop: 4, fontWeight: 400 }}>No pending dues</p>',
  '<span style={{ display: \'inline-flex\', alignItems: \'center\', gap: 6 }}>{t("empty.allSettledTitle")} <Sparkles size={16} style={{ color: \'#34d399\' }} /></span>\n                      <p style={{ fontSize: 13, color: \'#64748B\', marginTop: 4, fontWeight: 400 }}>{t("empty.allSettledDesc")}</p>',
  'Desktop empty all settled'
);

replaceExact(
  "{order.paymentStatus === 'partial' ? 'Partially Paid' : 'Pending'}",
  "{order.paymentStatus === 'partial' ? t(\"statuses.partiallyPaid\") : t(\"statuses.pending\")}",
  'Desktop table status badge'
);

// 15. Client summary tab
replaceExact(
  '<div className="text-[var(--muted-foreground)]">Orders Billed</div>',
  '<div className="text-[var(--muted-foreground)]">{t("table.lblOrdersBilled")}</div>',
  'Client summary orders billed label'
);

replaceExact(
  '<div className="text-[var(--muted-foreground)]">Payments Recv.</div>',
  '<div className="text-[var(--muted-foreground)]">{t("table.lblPaymentsRecv")}</div>',
  'Client summary payments recv label'
);

replaceExact(
  '<span className="text-[10px] font-semibold uppercase text-[var(--muted-foreground)] block tracking-wider mb-1">Status</span>',
  '<span className="text-[10px] font-semibold uppercase text-[var(--muted-foreground)] block tracking-wider mb-1">{t("table.thStatus")}</span>',
  'Client summary status th label'
);

replaceExact(
  "{summary.outstanding > 0 ? 'Due' : (summary.outstanding < 0 ? 'Advance' : 'Settled')}",
  "{summary.outstanding > 0 ? t(\"statuses.due\") : (summary.outstanding < 0 ? t(\"statuses.advance\") : t(\"statuses.settled\"))}",
  'Client summary status badge'
);

replaceExact(
  "{summary.outstanding >= 0 ? 'Outstanding' : 'Credit Balance'}",
  "{summary.outstanding >= 0 ? t(\"table.thOutstanding\") : t(\"table.lblCreditBalance\")}",
  'Client summary balance header'
);

replaceExact(
  'Record Payment\n                      </IOSButton>',
  '{t("actions.recordPayment")}\n                      </IOSButton>',
  'Client summary record payment button'
);

// 16. Full history tab
replaceExact(
  '<p style={{ fontSize: 15, color: \'#948e9c\' }}>No payment records found.</p>',
  '<p style={{ fontSize: 15, color: \'#948e9c\' }}>{t("empty.noRecords")}</p>',
  'Full history mobile empty'
);

replaceExact(
  '<th scope="col" className="px-6 py-4 font-semibold rounded-tl-[16px]">Date</th>\n                    <th scope="col" className="px-6 py-4 font-semibold">Client</th>\n                    <th scope="col" className="px-6 py-4 font-semibold">Mode</th>\n                    <th scope="col" className="px-6 py-4 font-semibold">Reference / Remark</th>\n                    <th scope="col" className="px-6 py-4 font-semibold text-right">Amount</th>',
  '<th scope="col" className="px-6 py-4 font-semibold rounded-tl-[16px]">{t("table.thDate")}</th>\n                    <th scope="col" className="px-6 py-4 font-semibold">{t("table.thClient")}</th>\n                    <th scope="col" className="px-6 py-4 font-semibold">{t("table.thMode")}</th>\n                    <th scope="col" className="px-6 py-4 font-semibold">{t("table.thReferenceRemark")}</th>\n                    <th scope="col" className="px-6 py-4 font-semibold text-right">{t("table.thAmount")}</th>',
  'Full history desktop th'
);

replaceExact(
  'No payment records found.</td></tr>',
  '{t("empty.noRecords")}</td></tr>',
  'Full history desktop empty'
);

replaceExact(
  '{new Date(p.paymentDate).toLocaleDateString()}',
  '{new Date(p.paymentDate).toLocaleDateString(dateLocale)}',
  'Full history payment date'
);

replaceExact(
  "{p.order?.productName || 'General Payment'}",
  '{p.order?.productName || t("statuses.generalPayment")}',
  'Full history product name'
);

// 17. ConfirmDeleteSheet
replaceExact(
  'entityLabel={tCommon("entityPayment")}',
  'entityLabel={t("actions.entityPayment")}',
  'ConfirmDeleteSheet entityLabel'
);

replaceExact(
  'consequenceText={tCommon("consequencePayment")}',
  'consequenceText={t("actions.deleteConsequence")}',
  'ConfirmDeleteSheet consequenceText'
);

// 18. Long Press Action Sheet
replaceExact(
  '{selectedPayment.client?.name || \'Unknown\'}',
  '{selectedPayment.client?.name || t("statuses.unknownClient")}',
  'Long press client unknown'
);

replaceExact(
  "toast.info('Payment detail view coming soon');",
  'toast.info(t("toasts.detailComingSoon"));',
  'Long press detail toast'
);

replaceExact(
  '<Receipt className="h-[18px] w-[18px] text-[var(--muted-foreground)]" />\n              View Details',
  '<Receipt className="h-[18px] w-[18px] text-[var(--muted-foreground)]" />\n              {t("actions.viewDetails")}',
  'Long press view details action'
);

replaceExact(
  '<IndianRupee className="h-[18px] w-[18px] text-[var(--muted-foreground)]" />\n              Record Payment',
  '<IndianRupee className="h-[18px] w-[18px] text-[var(--muted-foreground)]" />\n              {t("actions.recordPayment")}',
  'Long press record payment action'
);

replaceExact(
  "toast.info('Reminder feature coming soon');",
  'toast.info(t("toasts.reminderComingSoon"));',
  'Long press reminder toast'
);

replaceExact(
  '<Send className="h-[18px] w-[18px] text-[var(--muted-foreground)]" />\n              Send Reminder',
  '<Send className="h-[18px] w-[18px] text-[var(--muted-foreground)]" />\n              {t("actions.sendReminder")}',
  'Long press send reminder action'
);

replaceExact(
  '<Trash2 className="h-[18px] w-[18px]" />\n              Delete Payment',
  '<Trash2 className="h-[18px] w-[18px]" />\n              {t("actions.deletePayment")}',
  'Long press delete payment action'
);

fs.writeFileSync(filePath, code, 'utf8');
console.log('SUCCESS: All 46 payments transformations applied cleanly!');
