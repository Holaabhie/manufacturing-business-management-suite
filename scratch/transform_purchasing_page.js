const fs = require('fs');

const filePath = 'apps/web/src/app/dashboard/purchasing/page.tsx';
let code = fs.readFileSync(filePath, 'utf8');

// 1. Add i18n imports
if (!code.includes('useTranslations')) {
  code = code.replace(
    'import { useEffect, useState, useCallback, useRef } from "react";',
    'import { useEffect, useState, useCallback, useRef } from "react";\nimport { useTranslations } from "next-intl";\nimport { useAppLocale } from "@/components/LocaleProvider";'
  );
}

// 2. Setup translation hooks inside component
const hookSetup = `export default function PurchasingPage() {
  const t = useTranslations("purchasing.page");
  const tKpi = useTranslations("purchasing.kpi");
  const tStatus = useTranslations("purchasing.statuses");
  const tPayStatus = useTranslations("purchasing.paymentStatuses");
  const tVendorModal = useTranslations("purchasing.vendorModal");
  const tOrderModal = useTranslations("purchasing.orderModal");
  const tOrderDetail = useTranslations("purchasing.orderDetail");
  const tToast = useTranslations("purchasing.toasts");
  const tDelete = useTranslations("purchasing.deleteModal");
  const { currentLocale } = useAppLocale();
  const dateLocale = currentLocale === "hi" ? "hi-IN" : currentLocale === "gu" ? "gu-IN" : currentLocale === "mr" ? "mr-IN" : "en-IN";

  const getStatusLabel = (status: "Pending" | "Ordered" | "Received") => {
    switch (status) {
      case "Pending": return tStatus("pending");
      case "Ordered": return tStatus("ordered");
      case "Received": return tStatus("received");
    }
  };`;

code = code.replace('export default function PurchasingPage() {', hookSetup);

// 3. Update toasts
code = code.replace('toast.error("Failed to fetch purchase orders");', 'toast.error(tToast("fetchOrdersFailed"));');
code = code.replace('toast.error("Failed to fetch purchase orders");', 'toast.error(tToast("fetchOrdersFailed"));');
code = code.replace('toast.error("Failed to fetch vendors");', 'toast.error(tToast("fetchVendorsFailed"));');
code = code.replace('toast.error("Failed to fetch vendors");', 'toast.error(tToast("fetchVendorsFailed"));');
code = code.replace('toast.success("Vendor added successfully");', 'toast.success(tToast("vendorAdded"));');
code = code.replace('toast.error(data.error || "Failed to add vendor");', 'toast.error(data.error || tToast("addVendorFailed"));');
code = code.replace('toast.error("Failed to add vendor");', 'toast.error(tToast("addVendorFailed"));');
code = code.replace('toast.error("Supplier WhatsApp is mandatory");', 'toast.error(tToast("supplierPhoneMandatory"));');
code = code.replace('toast.error(data.error?.message || "Failed to add material");', 'toast.error(data.error?.message || tToast("addMaterialFailed"));');
code = code.replace('toast.success("Material added to inventory");', 'toast.success(tToast("materialAdded"));');
code = code.replace('toast.error("Failed to add material");', 'toast.error(tToast("addMaterialFailed"));');
code = code.replace('toast.error("Please select a vendor");', 'toast.error(tToast("selectVendor"));');
code = code.replace('toast.error("Please add at least one material");', 'toast.error(tToast("addMaterialMin"));');
code = code.replace(
  'toast.success(\n          data.inventorySynced\n            ? "Purchase order created & materials added to inventory"\n            : "Purchase order created",\n        );',
  'toast.success(tToast("poCreated"));'
);
code = code.replace('toast.error(data.error || "Failed to create PO");', 'toast.error(data.error || tToast("createPOFailed"));');
code = code.replace('toast.error("Failed to create purchase order");', 'toast.error(tToast("createPOFailed"));');
code = code.replace('toast.success("Order received — inventory updated!");', 'toast.success(tToast("orderReceived"));');
code = code.replace('toast.error(data.error || "Failed to update status");', 'toast.error(data.error || tToast("updateStatusFailed"));');
code = code.replace('toast.error("Failed to update status");', 'toast.error(tToast("updateStatusFailed"));');
code = code.replace('toast.success(`${deleteTarget.type === "order" ? "Purchase order" : "Vendor"} deleted`);', 'toast.success(tToast("deleteSuccess"));');
code = code.replace('toast.error(data.error || "Delete failed");', 'toast.error(data.error || tToast("deleteFailed"));');
code = code.replace('toast.error("Delete failed");', 'toast.error(tToast("deleteFailed"));');

// 4. Update skeleton and root container layout classes
code = code.replace('<div className="space-y-6">', '<div className="space-y-6 w-full min-w-0 overflow-x-hidden">');
code = code.replace(
  '<motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-6">',
  '<motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-6 w-full min-w-0 overflow-x-hidden">'
);

// 5. Header title, subtitle, buttons
code = code.replace(
  `<h1 className="text-[24px] sm:text-[28px] md:text-[34px] font-bold text-[var(--foreground)] leading-[1.2] md:leading-[41px] tracking-[0.37px] truncate">\n            Purchasing\n          </h1>`,
  `<h1 className="text-[24px] sm:text-[28px] md:text-[34px] font-bold text-[var(--foreground)] leading-[1.2] md:leading-[41px] tracking-[0.37px] truncate">\n            {t("title")}\n          </h1>`
);
code = code.replace(
  `<p className="text-[15px] text-[var(--muted-foreground)] mt-1 leading-[20px] break-words">\n            Manage vendors, create purchase orders, and track deliveries.\n          </p>`,
  `<p className="text-[15px] text-[var(--muted-foreground)] mt-1 leading-[20px] break-words">\n            {t("subtitle")}\n          </p>`
);
code = code.replace(
  `icon={<UserPlus className="h-4 w-4" />}\n            >\n              Add Vendor\n            </IOSButton>`,
  `icon={<UserPlus className="h-4 w-4" />}\n            >\n              {t("btnAddVendor")}\n            </IOSButton>`
);
// Handle both 10-space and 12-space indentation on buttons
code = code.replace(
  /icon=\{<UserPlus className="h-4 w-4" \/>\}\s*>\s*Add Vendor\s*<\/IOSButton>/,
  `icon={<UserPlus className="h-4 w-4" />}\n          >\n            {t("btnAddVendor")}\n          </IOSButton>`
);
code = code.replace(
  /icon=\{<Plus className="h-4 w-4" \/>\}\s*>\s*New Purchase\s*<\/IOSButton>/,
  `icon={<Plus className="h-4 w-4" />}\n          >\n            {t("btnNewPurchase")}\n          </IOSButton>`
);

// 6. StatWidget labels
code = code.replace('label="Total Spent"', 'label={tKpi("totalSpent")}');
code = code.replace('label="Pending"', 'label={tKpi("pending")}');
code = code.replace('label="In Transit"', 'label={tKpi("inTransit")}');
code = code.replace('label="Received"', 'label={tKpi("received")}');

// 7. Tabs
code = code.replace(
  `<ClipboardList className="h-4 w-4" /> Purchase Orders`,
  `<ClipboardList className="h-4 w-4" /> {t("tabOrders")}`
);
code = code.replace(
  `<Building2 className="h-4 w-4" /> Vendors`,
  `<Building2 className="h-4 w-4" /> {t("tabVendors")}`
);

// 8. Search bar
code = code.replace(
  `placeholder={activeTab === "orders" ? "Search PO# or vendor..." : "Search vendors..."}`,
  `placeholder={activeTab === "orders" ? t("searchOrdersPlaceholder") : t("searchVendorsPlaceholder")}`
);
code = code.replace(
  `{activeTab === "orders" ? \`\${filteredOrders.length} orders\` : \`\${filteredVendors.length} vendors\`}`,
  `{activeTab === "orders" ? t("ordersCount", { count: filteredOrders.length }) : t("vendorsCount", { count: filteredVendors.length })}`
);

// 9. Mobile cards in orders
code = code.replace(
  `{ key: "items", label: "Items", render: (_v, o) => \`\${o.items.length} item\${o.items.length !== 1 ? "s" : ""}\` },`,
  `{ key: "items", label: t("thItems"), render: (_v, o) => t("itemsCount", { count: o.items.length }) },`
);
code = code.replace(
  `{ key: "totalAmount", label: "Amount", render: (_v, o) => (`,
  `{ key: "totalAmount", label: t("thAmount"), render: (_v, o) => (`
);
code = code.replace(
  `{ key: "status", label: "Status", render: (_v, o) => (`,
  `{ key: "status", label: t("thStatus"), render: (_v, o) => (`
);
code = code.replace(
  `<IOSBadge color={STATUS_CONFIG[o.status].color} variant="tinted" dot size="medium">{STATUS_CONFIG[o.status].label}</IOSBadge>`,
  `<IOSBadge color={STATUS_CONFIG[o.status].color} variant="tinted" dot size="medium">{getStatusLabel(o.status)}</IOSBadge>`
);
code = code.replace(
  /className="text-\[12px\] font-medium text-\[var\(--primary\)\] bg-\[var\(--primary\)\]\/10 px-\[10px\] py-\[6px\] rounded-\[8px\] active:bg-\[var\(--primary\)\]\/15 cursor-pointer"\s*>\s*Received\s*<\/motion\.button>/,
  `className="text-[12px] font-medium text-[var(--primary)] bg-[var(--primary)]/10 px-[10px] py-[6px] rounded-[8px] active:bg-[var(--primary)]/15 cursor-pointer">\n                            {t("btnMarkReceived")}\n                          </motion.button>`
);
code = code.replace(
  `{ key: "createdAt", label: "Date", render: (_v, o) => new Date(o.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" }) },`,
  `{ key: "createdAt", label: t("thDate"), render: (_v, o) => new Date(o.createdAt).toLocaleDateString(dateLocale, { day: "2-digit", month: "short", year: "2-digit" }) },`
);
code = code.replace(
  `emptyMessage="No purchase orders yet"`,
  `emptyMessage={t("emptyOrdersTitle")}`
);
code = code.replace(
  `<Eye className="mr-2 h-4 w-4" /> View Details`,
  `<Eye className="mr-2 h-4 w-4" /> {t("actionViewDetails")}`
);
code = code.replace(
  `<Wallet className="mr-2 h-4 w-4" /> Record Payment`,
  `<Wallet className="mr-2 h-4 w-4" /> {t("actionRecordPayment")}`
);
code = code.replace(
  `<Trash2 className="mr-2 h-4 w-4" /> Delete`,
  `<Trash2 className="mr-2 h-4 w-4" /> {t("actionDelete")}`
);

// 10. Desktop Table Headers - Orders
code = code.replace(
  `PO # & Vendor\n                    </TableHead>`,
  `{t("thPONumberVendor")}\n                    </TableHead>`
);
code = code.replace(
  `Items\n                    </TableHead>`,
  `{t("thItems")}\n                    </TableHead>`
);
code = code.replace(
  `Amount\n                    </TableHead>`,
  `{t("thAmount")}\n                    </TableHead>`
);
code = code.replace(
  `Status\n                    </TableHead>`,
  `{t("thStatus")}\n                    </TableHead>`
);
code = code.replace(
  `Date\n                    </TableHead>`,
  `{t("thDate")}\n                    </TableHead>`
);

// 11. Desktop Table Empty State - Orders
code = code.replace(
  `<p className="text-[17px] font-medium text-[var(--muted-foreground)]">No purchase orders yet</p>`,
  `<p className="text-[17px] font-medium text-[var(--muted-foreground)]">{t("emptyOrdersTitle")}</p>`
);
code = code.replace(
  `<p className="text-[13px] text-[var(--muted-foreground)]">\n                            Create your first purchase order to get started\n                          </p>`,
  `<p className="text-[13px] text-[var(--muted-foreground)]">\n                            {t("emptyOrdersSubtitle")}\n                          </p>`
);
code = code.replace(
  /icon=\{<Plus className="h-3.5 w-3.5" \/>\}>\s*New Purchase Order\s*<\/IOSButton>/,
  `icon={<Plus className="h-3.5 w-3.5" />}>\n                            {t("btnNewPO")}\n                          </IOSButton>`
);

// 12. Desktop Rows - Orders
code = code.replace(
  `{order.items.length} item{order.items.length !== 1 ? "s" : ""}`,
  `{t("itemsCount", { count: order.items.length })}`
);
code = code.replace(
  `Tax: {formatCurrency(order.taxAmount)}`,
  `{t("taxLabel")} {formatCurrency(order.taxAmount)}`
);
code = code.replace(
  `<IOSBadge color={statusConfig.color} variant="tinted" dot size="medium">\n                              {statusConfig.label}\n                            </IOSBadge>`,
  `<IOSBadge color={statusConfig.color} variant="tinted" dot size="medium">\n                              {getStatusLabel(order.status)}\n                            </IOSBadge>`
);
code = code.replace(
  `new Date(order.createdAt).toLocaleDateString("en-IN", {`,
  `new Date(order.createdAt).toLocaleDateString(dateLocale, {`
);
code = code.replace(
  `<CheckCircle2 className="mr-2 h-4 w-4" /> Mark as Received`,
  `<CheckCircle2 className="mr-2 h-4 w-4" /> {t("actionMarkReceived")}`
);

// 13. Vendors Tab Mobile
code = code.replace(
  `{ key: "phone", label: "Phone",`,
  `{ key: "phone", label: t("thPhone"),`
);
code = code.replace(
  `{ key: "email", label: "Email" },`,
  `{ key: "email", label: t("thEmail") },`
);
code = code.replace(
  `{ key: "gstin", label: "GSTIN", render: (v) => v || "—" },`,
  `{ key: "gstin", label: t("thGstin"), render: (v) => v || "—" },`
);
code = code.replace(
  `emptyMessage="No vendors added"`,
  `emptyMessage={t("emptyVendorsTitle")}`
);

// 14. Vendors Tab Desktop
code = code.replace(
  `Vendor & Contact\n                    </TableHead>`,
  `{t("thVendorContact")}\n                    </TableHead>`
);
code = code.replace(
  `Phone\n                    </TableHead>`,
  `{t("thPhone")}\n                    </TableHead>`
);
code = code.replace(
  `Email\n                    </TableHead>`,
  `{t("thEmail")}\n                    </TableHead>`
);
code = code.replace(
  `GSTIN\n                    </TableHead>`,
  `{t("thGstin")}\n                    </TableHead>`
);
code = code.replace(
  `<p className="text-[17px] font-medium text-[var(--muted-foreground)]">No vendors added</p>`,
  `<p className="text-[17px] font-medium text-[var(--muted-foreground)]">{t("emptyVendorsTitle")}</p>`
);
code = code.replace(
  `<p className="text-[13px] text-[var(--muted-foreground)]">Add your first vendor to start purchasing</p>`,
  `<p className="text-[13px] text-[var(--muted-foreground)]">{t("emptyVendorsSubtitle")}</p>`
);
code = code.replace(
  /icon=\{<UserPlus className="h-3.5 w-3.5" \/>\}\s*>\s*Add Vendor\s*<\/IOSButton>/,
  `icon={<UserPlus className="h-3.5 w-3.5" />}>\n                            {t("btnAddVendor")}\n                          </IOSButton>`
);
code = code.replace(
  `<Trash2 className="mr-2 h-4 w-4" /> Delete Vendor`,
  `<Trash2 className="mr-2 h-4 w-4" /> {t("actionDeleteVendor")}`
);

// 15. Vendor Dialog
code = code.replace(
  `<DialogTitle style={{ fontSize: 18, fontWeight: 700, color: "var(--g-text-primary)", lineHeight: "22px", margin: 0 }}>New Vendor</DialogTitle>`,
  `<DialogTitle style={{ fontSize: 18, fontWeight: 700, color: "var(--g-text-primary)", lineHeight: "22px", margin: 0 }}>{tVendorModal("titleNew")}</DialogTitle>`
);
code = code.replace(
  `<p style={{ fontSize: 13, color: "var(--g-text-secondary)", lineHeight: "18px", margin: "2px 0 0" }}>Add supplier details</p>`,
  `<p style={{ fontSize: 13, color: "var(--g-text-secondary)", lineHeight: "18px", margin: "2px 0 0" }}>{tVendorModal("subtitle")}</p>`
);
code = code.replace(
  `<Label className="text-[13px] text-[var(--muted-foreground)]">Vendor Name *</Label>`,
  `<Label className="text-[13px] text-[var(--muted-foreground)]">{tVendorModal("lblName")}</Label>`
);
code = code.replace(
  `placeholder="e.g. Reliance Industries"`,
  `placeholder={tVendorModal("placeholderName")}`
);
code = code.replace(
  `<Label className="text-[13px] text-[var(--muted-foreground)]">Contact Person *</Label>`,
  `<Label className="text-[13px] text-[var(--muted-foreground)]">{tVendorModal("lblContact")}</Label>`
);
code = code.replace(
  `placeholder="Full name"`,
  `placeholder={tVendorModal("placeholderContact")}`
);
code = code.replace(
  `<Label className="text-[13px] text-[var(--muted-foreground)]">Phone *</Label>`,
  `<Label className="text-[13px] text-[var(--muted-foreground)]">{tVendorModal("lblPhone")}</Label>`
);
code = code.replace(
  `placeholder="+91 98765 43210"`,
  `placeholder={tVendorModal("placeholderPhone")}`
);
code = code.replace(
  `placeholder="vendor@company.com"`,
  `placeholder={tVendorModal("placeholderEmail")}`
);
code = code.replace(
  `placeholder="22AAAAA0000A1Z5"`,
  `placeholder={tVendorModal("placeholderGstin")}`
);
code = code.replace(
  `<Label className="text-[13px] text-[var(--muted-foreground)]">Address</Label>`,
  `<Label className="text-[13px] text-[var(--muted-foreground)]">{tVendorModal("lblAddress")}</Label>`
);
code = code.replace(
  `placeholder="Full address"`,
  `placeholder={tVendorModal("placeholderAddress")}`
);
code = code.replace(
  /<button type="submit" className="glow-btn w-full h-\[50px\] text-\[17px\] flex items-center justify-center gap-2">\s*Save Vendor\s*<\/button>/,
  `<button type="submit" className="glow-btn w-full h-[50px] text-[17px] flex items-center justify-center gap-2">\n                    {tVendorModal("btnSave")}\n                  </button>`
);

// 16. New PO Dialog
code = code.replace(
  `<DialogTitle style={{ fontSize: 18, fontWeight: 700, color: "var(--g-text-primary)", lineHeight: "22px", margin: 0 }}>New Purchase Order</DialogTitle>`,
  `<DialogTitle style={{ fontSize: 18, fontWeight: 700, color: "var(--g-text-primary)", lineHeight: "22px", margin: 0 }}>{tOrderModal("titleNew")}</DialogTitle>`
);
code = code.replace(
  `<p style={{ fontSize: 13, color: "var(--g-text-secondary)", lineHeight: "18px", margin: "2px 0 0" }}>Create a purchase order</p>`,
  `<p style={{ fontSize: 13, color: "var(--g-text-secondary)", lineHeight: "18px", margin: "2px 0 0" }}>{tOrderModal("subtitle")}</p>`
);
code = code.replace(
  `<Label className="text-[13px] text-[var(--muted-foreground)]">Select Vendor *</Label>`,
  `<Label className="text-[13px] text-[var(--muted-foreground)]">{tOrderModal("lblVendor")}</Label>`
);
code = code.replace(
  `<SelectValue placeholder="Choose vendor..." />`,
  `<SelectValue placeholder={tOrderModal("placeholderVendor")} />`
);
code = code.replace(
  `No vendors found. Add a vendor first.`,
  `{tOrderModal("noVendorsHint")}`
);
code = code.replace(
  `<Label className="text-[13px] font-semibold text-[var(--foreground)]">Materials *</Label>`,
  `<Label className="text-[13px] font-semibold text-[var(--foreground)]">{tOrderModal("lblMaterials")}</Label>`
);
code = code.replace(
  `+ Add Item\n                    </button>`,
  `{tOrderModal("btnAddItem")}\n                    </button>`
);
code = code.replace(
  `Item {idx + 1}`,
  `{tOrderModal("thItem")} {idx + 1}`
);
code = code.replace(
  `<SelectValue placeholder="Select material..." />`,
  `<SelectValue placeholder={tOrderModal("selectMaterial")} />`
);
code = code.replace(
  `{inv.name} ({inv.quantity} {inv.unit} in stock)`,
  `{inv.name} ({inv.quantity} {inv.unit} {tOrderModal("inStock")}`
);
code = code.replace(
  `title="Create new material"`,
  `title={tOrderModal("titleCreateMaterial")}`
);
code = code.replace(
  `<Label className="text-[11px] text-[var(--muted-foreground)]">Qty</Label>`,
  `<Label className="text-[11px] text-[var(--muted-foreground)]">{tOrderModal("thQty")}</Label>`
);
code = code.replace(
  `<Label className="text-[11px] text-[var(--muted-foreground)]">Unit</Label>`,
  `<Label className="text-[11px] text-[var(--muted-foreground)]">{tOrderModal("thUnit")}</Label>`
);
code = code.replace(
  `<Label className="text-[11px] text-[var(--muted-foreground)]">{"\\u20B9"}/Unit</Label>`,
  `<Label className="text-[11px] text-[var(--muted-foreground)]">₹{tOrderModal("thRateUnit")}</Label>`
);
code = code.replace(
  `Line Total: {formatCurrency(parseNumericValue(item.quantity) * parseNumericValue(item.unitPrice))}`,
  `{tOrderModal("lblLineTotal")} {formatCurrency(parseNumericValue(item.quantity) * parseNumericValue(item.unitPrice))}`
);
code = code.replace(
  `<Label className="text-[13px] text-[var(--muted-foreground)]">Tax %</Label>`,
  `<Label className="text-[13px] text-[var(--muted-foreground)]">{tOrderModal("lblTaxPercent")}</Label>`
);
code = code.replace(
  `<Label className="text-[13px] text-[var(--muted-foreground)]">Notes</Label>`,
  `<Label className="text-[13px] text-[var(--muted-foreground)]">{tOrderModal("lblNotes")}</Label>`
);
code = code.replace(
  `placeholder="Optional notes"`,
  `placeholder={tOrderModal("placeholderNotes")}`
);
code = code.replace(
  `<span>Subtotal</span>\n                      <span>\n                        {formatCurrency(`,
  `<span>{tOrderModal("lblSubtotal")}</span>\n                      <span>\n                        {formatCurrency(`
);
code = code.replace(
  `<span>Tax ({poTaxPercent}%)</span>`,
  `<span>{tOrderModal("lblTaxWithPercent", { percent: poTaxPercent })}</span>`
);
code = code.replace(
  `<span>Total</span>\n                      <span className="text-[var(--primary)]">`,
  `<span>{tOrderModal("lblTotal")}</span>\n                      <span className="text-[var(--primary)]">`
);
code = code.replace(
  `Add to Inventory\n                        </span>`,
  `{tOrderModal("lblAddToInventory")}\n                        </span>`
);
code = code.replace(
  `Update stock levels on creation\n                        </span>`,
  `{tOrderModal("lblAddToInventoryDesc")}\n                        </span>`
);
code = code.replace(
  `<p className="text-[11px] text-[#2563EB]/70 dark:text-blue-400/70 mt-2 leading-[15px] pl-[42px]">\n                      Stock will be added now. When this PO is later marked as &ldquo;Received&rdquo;, inventory will <strong>not</strong> be incremented again.\n                    </p>`,
  `<p className="text-[11px] text-[#2563EB]/70 dark:text-blue-400/70 mt-2 leading-[15px] pl-[42px]">\n                      {tOrderModal("inventorySyncHintPrefix")} <strong>{tOrderModal("inventorySyncHintNot")}</strong> {tOrderModal("inventorySyncHintSuffix")}\n                    </p>`
);
code = code.replace(
  /<ShoppingCart className="h-5 w-5" \/> Create Purchase Order\s*<\/button>/,
  `<ShoppingCart className="h-5 w-5" /> {tOrderModal("btnCreatePO")}\n                  </button>`
);

// 17. Detail Dialog
code = code.replace(
  `<DialogDescription style={{ fontSize: 13, color: "var(--g-text-secondary)", lineHeight: "18px", margin: "2px 0 0" }}>Vendor: {detailOrder.vendorName}</DialogDescription>`,
  `<DialogDescription style={{ fontSize: 13, color: "var(--g-text-secondary)", lineHeight: "18px", margin: "2px 0 0" }}>{tOrderDetail("lblVendor")} {detailOrder.vendorName}</DialogDescription>`
);
code = code.replace(
  `<IOSBadge color={STATUS_CONFIG[detailOrder.status].color} variant="tinted" size="medium">\n                    {detailOrder.status}\n                  </IOSBadge>`,
  `<IOSBadge color={STATUS_CONFIG[detailOrder.status].color} variant="tinted" size="medium">\n                    {getStatusLabel(detailOrder.status)}\n                  </IOSBadge>`
);
code = code.replace(
  `Created: {new Date(detailOrder.createdAt).toLocaleDateString("en-IN")}`,
  `{tOrderDetail("lblCreated")} {new Date(detailOrder.createdAt).toLocaleDateString(dateLocale)}`
);
code = code.replace(
  `Materials\n                  </h4>`,
  `{tOrderDetail("lblMaterials")}\n                  </h4>`
);
code = code.replace(
  `<span>Subtotal</span>\n                    <span>{formatCurrency(detailOrder.subtotal)}</span>`,
  `<span>{tOrderDetail("lblSubtotal")}</span>\n                    <span>{formatCurrency(detailOrder.subtotal)}</span>`
);
code = code.replace(
  `<span>Tax</span>\n                    <span>{formatCurrency(detailOrder.taxAmount)}</span>`,
  `<span>{tOrderDetail("lblTax")}</span>\n                    <span>{formatCurrency(detailOrder.taxAmount)}</span>`
);
code = code.replace(
  `<span>Total</span>\n                    <span className="text-[var(--primary)]">{formatCurrency(detailOrder.totalAmount)}</span>`,
  `<span>{tOrderDetail("lblTotal")}</span>\n                    <span className="text-[var(--primary)]">{formatCurrency(detailOrder.totalAmount)}</span>`
);
code = code.replace(
  `<span className="font-medium">Notes:</span> {detailOrder.notes}`,
  `<span className="font-medium">{tOrderDetail("lblNotes")}</span> {detailOrder.notes}`
);
code = code.replace(
  `Ordered: {new Date(detailOrder.orderedAt).toLocaleDateString("en-IN")}`,
  `{tOrderDetail("lblOrdered")} {new Date(detailOrder.orderedAt).toLocaleDateString(dateLocale)}`
);
code = code.replace(
  `✓ Received: {new Date(detailOrder.receivedAt).toLocaleDateString("en-IN")}`,
  `{tOrderDetail("lblReceived")} {new Date(detailOrder.receivedAt).toLocaleDateString(dateLocale)}`
);

// 18. Delete Sheet
code = code.replace(
  `entityLabel={deleteTarget?.type === "order" ? "purchase order" : "vendor"}`,
  `entityLabel={deleteTarget?.type === "order" ? tDelete("entityOrder") : tDelete("entityVendor")}`
);
code = code.replace(
  /consequenceText=\{\s*deleteTarget\?\.type === "order"\s*\?\s*"will be permanently removed from purchasing records\. This cannot be undone\."\s*:\s*"will be permanently removed along with its purchase history\. This cannot be undone\."\s*\}/,
  `consequenceText={\n          deleteTarget?.type === "order"\n            ? tDelete("consequenceOrder")\n            : tDelete("consequenceVendor")\n        }`
);

fs.writeFileSync(filePath, code, 'utf8');
console.log('Purchasing page transformed successfully.');
