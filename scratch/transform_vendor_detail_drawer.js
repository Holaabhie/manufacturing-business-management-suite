const fs = require('fs');

const file = 'apps/web/src/components/purchasing/VendorDetailDrawer.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Add imports
code = code.replace(
  `import { useState, useEffect, useMemo, useCallback } from "react";`,
  `import { useState, useEffect, useMemo, useCallback } from "react";\nimport { useTranslations } from "next-intl";\nimport { useAppLocale } from "@/components/LocaleProvider";`
);

// 2. Add translation hooks
code = code.replace(
  `export function VendorDetailDrawer({ vendor, orders, onClose }: VendorDetailDrawerProps) {\n  const [portalMounted, setPortalMounted] = useState(false);`,
  `export function VendorDetailDrawer({ vendor, orders, onClose }: VendorDetailDrawerProps) {\n  const t = useTranslations("purchasing.vendorDrawer");\n  const tStatus = useTranslations("purchasing.statuses");\n  const tPayStatus = useTranslations("purchasing.paymentStatuses");\n  const { locale } = useAppLocale();\n  const dateLocale = locale === "hi" ? "hi-IN" : locale === "gu" ? "gu-IN" : locale === "mr" ? "mr-IN" : "en-IN";\n  const [portalMounted, setPortalMounted] = useState(false);`
);

// 3. Filters
code = code.replace(
  `  const filters: { key: FilterType; label: string }[] = [\n    { key: "all", label: "All" },\n    { key: "Pending", label: "Pending" },\n    { key: "Ordered", label: "Ordered" },\n    { key: "Received", label: "Received" },\n  ];`,
  `  const filters: { key: FilterType; label: string }[] = [\n    { key: "all", label: tStatus("all") },\n    { key: "Pending", label: tStatus("pending") },\n    { key: "Ordered", label: tStatus("ordered") },\n    { key: "Received", label: tStatus("received") },\n  ];`
);

// 4. Stats Row
code = code.replace(
  `                    label: "Total Spend",`,
  `                    label: t("lblTotalSpend"),`
);
code = code.replace(
  `                    label: "Amount Paid",`,
  `                    label: t("lblAmountPaid"),`
);
code = code.replace(
  `                    label: "Balance Due",`,
  `                    label: t("lblBalanceDue"),`
);
code = code.replace(
  `                    label: "PO Count",`,
  `                    label: t("lblPOCount"),`
);

// 5. Summary Bar
code = code.replace(
  `<span className="text-[12px] text-[#64748B] dark:text-white/40">\n                  {filteredOrders.length} order\n                  {filteredOrders.length !== 1 ? "s" : ""}\n                </span>`,
  `<span className="text-[12px] text-[#64748B] dark:text-white/40">\n                  {t("ordersCount", { count: filteredOrders.length })}\n                </span>`
).replace(
  `<span className="text-[12px] text-[#64748B] dark:text-white/40">\r\n                  {filteredOrders.length} order\r\n                  {filteredOrders.length !== 1 ? "s" : ""}\r\n                </span>`,
  `<span className="text-[12px] text-[#64748B] dark:text-white/40">\r\n                  {t("ordersCount", { count: filteredOrders.length })}\r\n                </span>`
);

code = code.replace(
  `Total:{" "}`,
  `{t("lblTotal")}{" "}`
);

// 6. Empty State
code = code.replace(
  `                  <p className="text-[15px] font-medium text-[#64748B] dark:text-white/50">\n                    No purchase orders found\n                  </p>\n                  <p className="text-[13px] text-[#94A3B8] dark:text-white/30 mt-1">\n                    {filter !== "all"\n                      ? "Try a different filter"\n                      : "No orders with this vendor yet"}\n                  </p>`,
  `                  <p className="text-[15px] font-medium text-[#64748B] dark:text-white/50">\n                    {t("emptyOrdersTitle")}\n                  </p>\n                  <p className="text-[13px] text-[#94A3B8] dark:text-white/30 mt-1">\n                    {filter !== "all"\n                      ? t("emptyOrdersFilterHint")\n                      : t("emptyOrdersAllHint")}\n                  </p>`
).replace(
  `                  <p className="text-[15px] font-medium text-[#64748B] dark:text-white/50">\r\n                    No purchase orders found\r\n                  </p>\r\n                  <p className="text-[13px] text-[#94A3B8] dark:text-white/30 mt-1">\r\n                    {filter !== "all"\r\n                      ? "Try a different filter"\r\n                      : "No orders with this vendor yet"}\r\n                  </p>`,
  `                  <p className="text-[15px] font-medium text-[#64748B] dark:text-white/50">\r\n                    {t("emptyOrdersTitle")}\r\n                  </p>\r\n                  <p className="text-[13px] text-[#94A3B8] dark:text-white/30 mt-1">\r\n                    {filter !== "all"\r\n                      ? t("emptyOrdersFilterHint")\r\n                      : t("emptyOrdersAllHint")}\r\n                  </p>`
);

// 7. Timeline Item date and items count
code = code.replace(
  `                                  {new Date(\n                                    po.orderedAt || po.createdAt\n                                  ).toLocaleDateString("en-IN", {\n                                    day: "2-digit",\n                                    month: "short",\n                                    year: "numeric",\n                                  })}\n                                  {" · "}\n                                  {po.items.length} item\n                                  {po.items.length !== 1 ? "s" : ""}`,
  `                                  {new Date(\n                                    po.orderedAt || po.createdAt\n                                  ).toLocaleDateString(dateLocale, {\n                                    day: "2-digit",\n                                    month: "short",\n                                    year: "numeric",\n                                  })}\n                                  {" · "}\n                                  {t("itemsCount", { count: po.items.length })}`
).replace(
  `                                  {new Date(\r\n                                    po.orderedAt || po.createdAt\r\n                                  ).toLocaleDateString("en-IN", {\r\n                                    day: "2-digit",\r\n                                    month: "short",\r\n                                    year: "numeric",\r\n                                  })}\r\n                                  {" · "}\r\n                                  {po.items.length} item\r\n                                  {po.items.length !== 1 ? "s" : ""}`,
  `                                  {new Date(\r\n                                    po.orderedAt || po.createdAt\r\n                                  ).toLocaleDateString(dateLocale, {\r\n                                    day: "2-digit",\r\n                                    month: "short",\r\n                                    year: "numeric",\r\n                                  })}\r\n                                  {" · "}\r\n                                  {t("itemsCount", { count: po.items.length })}`
);

// 8. Paid: label
code = code.replace(
  `Paid: {formatCurrency(po.paidAmount)}`,
  `{t("lblPaid")} {formatCurrency(po.paidAmount)}`
);

// 9. Status badges labels
code = code.replace(
  `{sc.label}`,
  `{tStatus(po.status.toLowerCase())}`
);
code = code.replace(
  `{psc.label}`,
  `{tPayStatus(ps.toLowerCase())}`
);

// 10. Expanded section
code = code.replace(
  `<span className="text-[11px] text-[#64748B] dark:text-white/30 uppercase tracking-wider">\n                                       Balance Due\n                                     </span>`,
  `<span className="text-[11px] text-[#64748B] dark:text-white/30 uppercase tracking-wider">\n                                       {t("lblBalanceDue")}\n                                     </span>`
).replace(
  `<span className="text-[11px] text-[#64748B] dark:text-white/30 uppercase tracking-wider">\r\n                                       Balance Due\r\n                                     </span>`,
  `<span className="text-[11px] text-[#64748B] dark:text-white/30 uppercase tracking-wider">\r\n                                       {t("lblBalanceDue")}\r\n                                     </span>`
);

code = code.replace(
  `<span className="text-[11px] text-[#64748B] dark:text-white/30 uppercase tracking-wider block">\n                                       Items\n                                     </span>`,
  `<span className="text-[11px] text-[#64748B] dark:text-white/30 uppercase tracking-wider block">\n                                       {t("lblItems")}\n                                     </span>`
).replace(
  `<span className="text-[11px] text-[#64748B] dark:text-white/30 uppercase tracking-wider block">\r\n                                       Items\r\n                                     </span>`,
  `<span className="text-[11px] text-[#64748B] dark:text-white/30 uppercase tracking-wider block">\r\n                                       {t("lblItems")}\r\n                                     </span>`
);

code = code.replace(
  `<span className="text-[11px] text-[#64748B] dark:text-white/30 uppercase tracking-wider">\n                                       Tax\n                                     </span>`,
  `<span className="text-[11px] text-[#64748B] dark:text-white/30 uppercase tracking-wider">\n                                       {t("lblTax")}\n                                     </span>`
).replace(
  `<span className="text-[11px] text-[#64748B] dark:text-white/30 uppercase tracking-wider">\r\n                                       Tax\r\n                                     </span>`,
  `<span className="text-[11px] text-[#64748B] dark:text-white/30 uppercase tracking-wider">\r\n                                       {t("lblTax")}\r\n                                     </span>`
);

fs.writeFileSync(file, code, 'utf8');
console.log('VendorDetailDrawer.tsx transformed successfully');
