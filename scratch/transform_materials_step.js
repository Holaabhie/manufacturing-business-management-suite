const fs = require('fs');

const file = 'apps/web/src/components/production/MaterialsStep.tsx';
let raw = fs.readFileSync(file, 'utf8');
const isCrlf = raw.includes('\r\n');
let code = raw.replace(/\r\n/g, '\n');

// 1. Imports
if (!code.includes('useTranslations')) {
  code = code.replace(
    'import { useEffect, useState, useMemo } from "react";',
    'import { useEffect, useState, useMemo } from "react";\nimport { useTranslations } from "next-intl";\nimport { useAppLocale } from "@/components/LocaleProvider";'
  );
}

// 2. Component hooks
const oldCompStart = `export function MaterialsStep({ inventory, productName, onMaterialsChange, initialMaterials }: Props) {
    const {`;

const newCompStart = `export function MaterialsStep({ inventory, productName, onMaterialsChange, initialMaterials }: Props) {
    const t = useTranslations("production.materialsStep");
    const tToast = useTranslations("production.toasts");
    const { locale } = useAppLocale();
    const dateLocale = locale === "hi" ? "hi-IN" : locale === "gu" ? "gu-IN" : locale === "mr" ? "mr-IN" : "en-IN";
    const {`;

code = code.replace(oldCompStart, newCompStart);

// 3. Toasts & Templates
code = code.replace('toast.error("Enter a template name");', 'toast.error(tToast("enterTemplateName"));');
code = code.replace('toast.success("Template saved!");', 'toast.success(tToast("templateSaved"));');
code = code.replace('toast.error("Failed to save template");', 'toast.error(tToast("templateSaveFailed"));');
code = code.replace('toast.success(`Template "${t.name}" loaded`);', 'toast.success(tToast("templateLoaded", { name: t.name }));');

// 4. Header
code = code.replace(
  `<h2 className="text-lg font-bold mb-1">Materials</h2>\n                <p className="text-sm text-muted-foreground">Select raw materials and quantities for this production.</p>`,
  `<h2 className="text-lg font-bold mb-1">{t("title")}</h2>\n                <p className="text-sm text-muted-foreground">{t("subtitle")}</p>`
);

// 5. Pre-fill Banner
code = code.replace(
  `📋 Materials pre-filled from {preFill.sourceBatchNumber || "past order"}`,
  `{t("preFillBanner", { batch: preFill.sourceBatchNumber || t("preFillPastOrder") })}`
);
code = code.replace(
  `Last used: {preFill.sourceDate} · Same product: {preFill.sourceProductName} · {preFill.itemCount} items`,
  `{t("preFillMeta", { date: preFill.sourceDate, product: preFill.sourceProductName, count: preFill.itemCount })}`
);
code = code.replace(
  `Clear & Start Fresh`,
  `{t("btnClearStartFresh")}`
);

// 6. Adjustment Warning
code = code.replace(
  `⚠️ {adj} — current stock insufficient`,
  `{t("insufficientStockWarning", { material: adj })}`
);

// 7. Action Bar
code = code.replace(
  `<Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Raw Materials</Label>`,
  `<Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("lblRawMaterials")}</Label>`
);
code = code.replace(
  `<FileDown className="h-3 w-3" /> Load Template`,
  `<FileDown className="h-3 w-3" /> {t("btnLoadTemplate")}`
);
code = code.replace(
  `<RefreshCw className={\`h-3 w-3 \${inventoryLoading ? "animate-spin" : ""}\`} /> Refresh Stock`,
  `<RefreshCw className={\`h-3 w-3 \${inventoryLoading ? "animate-spin" : ""}\`} /> {t("btnRefreshStock")}`
);
code = code.replace(
  `<Plus className="h-3 w-3" /> Add Material`,
  `<Plus className="h-3 w-3" /> {t("btnAddMaterial")}`
);

// 8. Empty State
code = code.replace(
  `{preFill === null ? "No previous orders found for this product. Add materials manually." : "Add raw materials needed for production"}`,
  `{preFill === null ? t("emptyPreFillManual") : t("emptyAddMaterials")}`
);

// 9. Select & Inputs
code = code.replace(
  `placeholder="Select material..."`,
  `placeholder={t("selectMaterialPlaceholder")}`
);
code = code.replace(
  `placeholder="Search materials..."`,
  `placeholder={t("searchMaterialsPlaceholder")}`
);
code = code.replace(
  `Recently Used</span>`,
  `{t("recentlyUsed")}</span>`
);
code = code.replace(
  `Stock: {available}{mat.unit}`,
  `{t("stockLabel", { amount: available, unit: mat.unit })}`
);
code = code.replace(
  `{color === "red" && \` Only \${available}\${mat.unit}\`}`,
  `{color === "red" && t("onlyStockLeft", { amount: available, unit: mat.unit })}`
);

// 10. Summary Card
code = code.replace(
  `Materials Summary\n                        </span>`,
  `{t("summaryTitle")}\n                        </span>`
);
code = code.replace(
  `{materials.filter((m) => m.inventoryId).length} items</Badge>`,
  `{t("summaryItemsCount", { count: materials.filter((m) => m.inventoryId).length })}</Badge>`
);
code = code.replace(
  `<span style={{ color: "#94a3b8" }}>Est. Cost</span>`,
  `<span style={{ color: "#94a3b8" }}>{t("estCost")}</span>`
);
code = code.replace(
  `{"\\u20B9"}{totalEstCost.toLocaleString("en-IN")}`,
  `{"\\u20B9"}{totalEstCost.toLocaleString(dateLocale)}`
);
code = code.replace(
  `⚠️ {lowStockCount} item{lowStockCount > 1 ? "s" : ""} low stock`,
  `{t("lowStockCount", { count: lowStockCount })}`
);

// 11. Template Modals
code = code.replace(
  `<Save className="h-3 w-3" /> Save as Template`,
  `<Save className="h-3 w-3" /> {t("btnSaveAsTemplate")}`
);
code = code.replace(
  `<p style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0", marginBottom: 8 }}>Save as Template</p>`,
  `<p style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0", marginBottom: 8 }}>{t("saveTemplateTitle")}</p>`
);
code = code.replace(
  `placeholder="Template name..."`,
  `placeholder={t("templateNamePlaceholder")}`
);
code = code.replace(
  `<Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setShowTemplateDialog(false)}>Cancel</Button>`,
  `<Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setShowTemplateDialog(false)}>{t("btnClose")}</Button>`
);
code = code.replace(
  `                            Save\n                        </Button>`,
  `                            {t("btnSave")}\n                        </Button>`
);
code = code.replace(
  `<p style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0" }}>Load Template</p>`,
  `<p style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0" }}>{t("loadTemplateTitle")}</p>`
);
code = code.replace(
  `<Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowLoadTemplate(false)}>Close</Button>`,
  `<Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowLoadTemplate(false)}>{t("btnClose")}</Button>`
);
code = code.replace(
  `No templates saved yet`,
  `{t("noTemplatesSaved")}`
);
code = code.replace(
  'if (confirm(`Load template "${t.name}"? This will replace current materials.`)) {',
  'if (confirm(t("loadConfirm", { name: t.name }))) {'
);

if (isCrlf) code = code.replace(/\n/g, '\r\n');
fs.writeFileSync(file, code, 'utf8');
console.log('Successfully transformed apps/web/src/components/production/MaterialsStep.tsx!');
