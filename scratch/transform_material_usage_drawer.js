const fs = require('fs');

let code = fs.readFileSync('apps/web/src/components/ui/MaterialUsageDrawer.tsx', 'utf8');
const isCRLF = code.includes('\r\n');
if (isCRLF) code = code.replace(/\r\n/g, '\n');

// 1. Add imports
code = code.replace(
  'import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";',
  'import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";\nimport { useTranslations } from "next-intl";\nimport { useAppLocale } from "@/components/LocaleProvider";'
);

// 2. Add hook calls inside MaterialUsageDrawer
code = code.replace(
  'export function MaterialUsageDrawer({ material, onClose }: MaterialUsageDrawerProps) {',
  `export function MaterialUsageDrawer({ material, onClose }: MaterialUsageDrawerProps) {
    const t = useTranslations("inventory");
    const { locale } = useAppLocale();
    const dateLocale = locale === "hi" ? "hi-IN" : locale === "gu" ? "gu-IN" : locale === "mr" ? "mr-IN" : "en-IN";

    const getStatusLabel = (status: string) => {
        switch (status) {
            case "completed": return t("statusCompleted");
            case "in_progress": return t("statusInProgress");
            case "processing": return t("statusInProduction");
            case "pending": return t("statusPending");
            case "cancelled": return t("statusCancelled");
            default: return status;
        }
    };`
);

// 3. Update filters
code = code.replace(
  `    const filters: { key: FilterType; label: string }[] = [
        { key: "all", label: "All" },
        { key: "completed", label: "Completed" },
        { key: "in_progress", label: "In Progress" },
        { key: "pending", label: "Pending" },
    ];`,
  `    const filters: { key: FilterType; label: string }[] = [
        { key: "all", label: t("filterAll") },
        { key: "completed", label: t("filterCompleted") },
        { key: "in_progress", label: t("filterInProgress") },
        { key: "pending", label: t("filterPending") },
    ];`
);

// 4. Update stats array
code = code.replace(
  `                                            { label: "Total Used", value: \`\${stats?.totalUsed || 0} \${material?.unit}\`, icon: BarChart3, colorClass: "text-[#2563EB] dark:text-[#60A5FA]" },
                                            { label: "Productions", value: stats?.productionCount || 0, icon: Factory, colorClass: "text-[#059669] dark:text-[#34D399]" },
                                            { label: "Avg / Use", value: \`\${stats?.avgPerUse || 0} \${material?.unit}\`, icon: Clock, colorClass: "text-[#D97706] dark:text-[#FBBF24]" },
                                            { label: "Total Records", value: stats?.totalRecords || 0, icon: Package, colorClass: "text-[#7C3AED] dark:text-[#A78BFA]" },`,
  `                                            { label: t("totalUsed"), value: \`\${stats?.totalUsed || 0} \${material?.unit}\`, icon: BarChart3, colorClass: "text-[#2563EB] dark:text-[#60A5FA]" },
                                            { label: t("productions"), value: stats?.productionCount || 0, icon: Factory, colorClass: "text-[#059669] dark:text-[#34D399]" },
                                            { label: t("avgPerUse"), value: \`\${stats?.avgPerUse || 0} \${material?.unit}\`, icon: Clock, colorClass: "text-[#D97706] dark:text-[#FBBF24]" },
                                            { label: t("totalRecords"), value: stats?.totalRecords || 0, icon: Package, colorClass: "text-[#7C3AED] dark:text-[#A78BFA]" },`
);

// 5. Header stock label
code = code.replace(
  'Stock: <span className="text-[#0F172A]',
  '{t("usageStock")} <span className="text-[#0F172A]'
);

// 6. Summary Bar
code = code.replace(
  `<span className="text-[12px] text-[#64748B] dark:text-white/40">
                                            {filteredLogs.length} record{filteredLogs.length !== 1 ? "s" : ""} for <span className="text-[#0F172A] dark:text-white/60 font-medium">{material?.name}</span>
                                        </span>
                                        <span className="text-[12px] text-[#64748B] dark:text-white/40">
                                            Total consumed: <span className="text-[#0F172A] dark:text-white/80 font-semibold" style={{ fontVariantNumeric: "tabular-nums" }}>{Math.round(filteredTotal * 100) / 100} {material?.unit}</span>
                                        </span>`,
  `<span className="text-[12px] text-[#64748B] dark:text-white/40">
                                            {t("recordsForMaterial", { count: filteredLogs.length })} <span className="text-[#0F172A] dark:text-white/60 font-medium">{material?.name}</span>
                                        </span>
                                        <span className="text-[12px] text-[#64748B] dark:text-white/40">
                                            {t("totalConsumed")} <span className="text-[#0F172A] dark:text-white/80 font-semibold" style={{ fontVariantNumeric: "tabular-nums" }}>{Math.round(filteredTotal * 100) / 100} {material?.unit}</span>
                                        </span>`
);

// 7. Empty State
code = code.replace(
  `<p className="text-[15px] font-medium text-[#64748B] dark:text-white/50">No usage records found</p>
                                            <p className="text-[13px] text-[#94A3B8] dark:text-white/30 mt-1">
                                                {filter !== "all" ? "Try a different filter" : "This material hasn't been used in any production yet"}
                                            </p>`,
  `<p className="text-[15px] font-medium text-[#64748B] dark:text-white/50">{t("noUsageTitle")}</p>
                                            <p className="text-[13px] text-[#94A3B8] dark:text-white/30 mt-1">
                                                {filter !== "all" ? t("noUsageEmptyFilter") : t("noUsageEmptyDesc")}
                                            </p>`
);

// 8. Card batch and date
code = code.replace(
  `{log.source === "order"
                                                                                ? (log.batchNumber || log.orderId?.slice(-8).toUpperCase() || "Order")
                                                                                : (log.batchNumber || "No batch")}`,
  `{log.source === "order"
                                                                                ? (log.batchNumber || log.orderId?.slice(-8).toUpperCase() || t("orderBatchDefault"))
                                                                                : (log.batchNumber || t("noBatch"))}`
);

code = code.replace(
  `{new Date(log.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`,
  `{new Date(log.date).toLocaleDateString(dateLocale, { day: "2-digit", month: "short", year: "numeric" })}`
);

// 9. Status badge label
code = code.replace(
  '{sc.label}',
  '{getStatusLabel(log.status)}'
);

// 10. Expanded detail
code = code.replace(
  `<span className="text-[11px] text-[#64748B] dark:text-white/30 uppercase tracking-wider">Product</span>`,
  `<span className="text-[11px] text-[#64748B] dark:text-white/30 uppercase tracking-wider">{t("detailProduct")}</span>`
);

code = code.replace(
  `{log.source === "order" ? "Order Ref" : "Batch"}`,
  `{log.source === "order" ? t("detailOrderRef") : t("detailBatch")}`
);

code = code.replace(
  `{log.source === "order" ? "Client" : "Operator"}`,
  `{log.source === "order" ? t("detailClient") : t("detailOperator")}`
);

code = code.replace(
  `<span className="text-[11px] text-[#64748B] dark:text-white/30 uppercase tracking-wider">% of Total</span>`,
  `<span className="text-[11px] text-[#64748B] dark:text-white/30 uppercase tracking-wider">{t("detailPctOfTotal")}</span>`
);

if (isCRLF) code = code.replace(/\n/g, '\r\n');
fs.writeFileSync('apps/web/src/components/ui/MaterialUsageDrawer.tsx', code, 'utf8');
console.log('MaterialUsageDrawer updated successfully');
