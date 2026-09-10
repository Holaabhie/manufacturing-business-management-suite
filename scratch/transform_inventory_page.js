const fs = require('fs');

let code = fs.readFileSync('apps/web/src/app/dashboard/inventory/page.tsx', 'utf8');
const isCRLF = code.includes('\r\n');
if (isCRLF) code = code.replace(/\r\n/g, '\n');

// 1. Add imports
code = code.replace(
  'import { CollapsingTitle } from "@/components/ui/CollapsingTitle";',
  'import { CollapsingTitle } from "@/components/ui/CollapsingTitle";\nimport { useTranslations } from "next-intl";\nimport { useAppLocale } from "@/components/LocaleProvider";'
);

// 2. Add hook calls in InventoryPage
code = code.replace(
  'export default function InventoryPage() {',
  `export default function InventoryPage() {
  const t = useTranslations("inventory");
  const { locale } = useAppLocale();
  const dateLocale = locale === "hi" ? "hi-IN" : locale === "gu" ? "gu-IN" : locale === "mr" ? "mr-IN" : "en-IN";`
);

// 3. Starter tier limit toast
code = code.replace(
  `      toast.error(
        \`Starter tier limit reached (\${starterLimit} items). Please upgrade to Pro for unlimited inventory.\`,
        {
          action: {
            label: "Upgrade",
            onClick: () => (window.location.href = "/dashboard/upgrade"),
          },
        }
      );`,
  `      toast.error(
        t("starterLimitReached", { count: starterLimit }),
        {
          action: {
            label: t("upgrade"),
            onClick: () => (window.location.href = "/dashboard/upgrade"),
          },
        }
      );`
);

// 4. Export to PDF
code = code.replace(
  `    const headers = ["Name", "Quantity", "Unit", "Min Level", "Supplier", "Landed/Unit", "HSN", "Tax"];`,
  `    const headers = [
      t("pdfColName"),
      t("pdfColQty"),
      t("pdfColUnit"),
      t("pdfColMin"),
      t("pdfColSupplier"),
      t("pdfColLanded"),
      t("pdfColHsn"),
      t("pdfColTax"),
    ];`
);

code = code.replace(
  `    generateDataExportPDF({
      title: "Inventory Report",
      subtitle: "Raw materials, stock levels, and supplier details",
      headers,
      rows,
      filename: \`inventory_\${new Date().toISOString().split("T")[0]}.pdf\`,
    });
    toast.success("Inventory report PDF downloaded!");`,
  `    generateDataExportPDF({
      title: t("pdfTitle"),
      subtitle: t("pdfSubtitle"),
      headers,
      rows,
      filename: \`inventory_\${new Date().toISOString().split("T")[0]}.pdf\`,
    });
    toast.success(t("pdfDownloaded"));`
);

// 5. Export to XLSX
code = code.replace(
  `    const columns = [
      { header: "Material name", key: "name" },
      { header: "Stock level", key: "quantity" },
      { header: "Base cost", key: "purchase_cost_per_unit" },
      { header: "Landed cost", key: "landed_cost" },
      { header: "Critical stock", key: "min_stock_level" },
      { header: "Last updated", key: "updatedAt" },
    ];`,
  `    const columns = [
      { header: t("excelColName"), key: "name" },
      { header: t("excelColStock"), key: "quantity" },
      { header: t("excelColBaseCost"), key: "purchase_cost_per_unit" },
      { header: t("excelColLandedCost"), key: "landed_cost" },
      { header: t("excelColCriticalStock"), key: "min_stock_level" },
      { header: t("excelColLastUpdated"), key: "updatedAt" },
    ];`
);

code = code.replace(
  `    exportToExcel(
      \`inventory_\${new Date().toISOString().split("T")[0]}.xlsx\`,
      "Inventory",
      dataToExport,
      columns
    );
    toast.success("Inventory Excel downloaded!");`,
  `    exportToExcel(
      \`inventory_\${new Date().toISOString().split("T")[0]}.xlsx\`,
      t("excelSheetName"),
      dataToExport,
      columns
    );
    toast.success(t("excelDownloaded"));`
);

// 6. Fetch & CRUD toasts
code = code.replace(
  'if (!data.success) toast.error("Failed to fetch inventory");',
  'if (!data.success) toast.error(t("fetchError"));'
);
code = code.replace(
  '} catch (error) {\n      toast.error("Failed to fetch inventory");',
  '} catch (error) {\n      toast.error(t("fetchError"));'
);
code = code.replace(
  'toast.error("Supplier WhatsApp is mandatory");',
  'toast.error(t("supplierWhatsAppRequired"));'
);
code = code.replace(
  'if (data.error) toast.error("Failed to update item");\n        else {\n          toast.success("Item updated");',
  'if (data.error) toast.error(t("updateError"));\n        else {\n          toast.success(t("itemUpdated"));'
);
code = code.replace(
  'if (data.error) toast.error("Failed to add item");\n        else {\n          toast.success("Item added");',
  'if (data.error) toast.error(t("addError"));\n        else {\n          toast.success(t("itemAdded"));'
);
code = code.replace(
  '} catch (error) {\n      toast.error("Operation failed");',
  '} catch (error) {\n      toast.error(t("operationFailed"));'
);
code = code.replace(
  'if (res.ok) {\n        toast.success("Item deleted");',
  'if (res.ok) {\n        toast.success(t("itemDeleted"));'
);
code = code.replace(
  'toast.error(data.error || "Failed to delete item");',
  'toast.error(data.error || t("deleteError"));'
);
code = code.replace(
  '} catch (error) {\n      toast.error("Failed to delete item");',
  '} catch (error) {\n      toast.error(t("deleteError"));'
);

// 7. Restock WhatsApp message
code = code.replace(
  'const message = `Halo Supplier, I need to restock ${item.name}. My current stock is ${item.quantity} ${item.unit}. Please provide availability and current price.`;',
  'const message = t("restockMessage", { name: item.name, qty: item.quantity, unit: item.unit });'
);

// 8. getStockStatus labels
code = code.replace(
  `  const getStockStatus = (item: any): { label: string; color: "green" | "orange" | "red"; level: string } => {
    const qty = Number(item.quantity || 0);
    const minLevel = Number(item.min_stock_level || 0);
    if (minLevel <= 0) {
      return qty > 0
        ? { label: "Healthy", color: "green", level: "healthy" }
        : { label: "Out of Stock", color: "red", level: "critical" };
    }
    if (qty <= minLevel) return { label: "Critical", color: "red", level: "critical" };
    if (qty <= minLevel * 2) return { label: "Low", color: "orange", level: "low" };
    return { label: "Healthy", color: "green", level: "healthy" };
  };`,
  `  const getStockStatus = (item: any): { label: string; color: "green" | "orange" | "red"; level: string } => {
    const qty = Number(item.quantity || 0);
    const minLevel = Number(item.min_stock_level || 0);
    if (minLevel <= 0) {
      return qty > 0
        ? { label: t("statusHealthy"), color: "green", level: "healthy" }
        : { label: t("statusOutOfStock"), color: "red", level: "critical" };
    }
    if (qty <= minLevel) return { label: t("statusCritical"), color: "red", level: "critical" };
    if (qty <= minLevel * 2) return { label: t("statusLow"), color: "orange", level: "low" };
    return { label: t("statusHealthy"), color: "green", level: "healthy" };
  };`
);

// 9. formatSourceDate
code = code.replace(
  `      return new Date(dateStr).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
      });`,
  `      return new Date(dateStr).toLocaleDateString(dateLocale, {
        day: "numeric",
        month: "short",
      });`
);

// 10. CollapsingTitle
code = code.replace(
  `        <CollapsingTitle
          title="Inventory"
          subtitle={\`\${items.length} materials registered · \${items.filter(i => Number(i.quantity || 0) <= Number(i.min_stock_level || 10)).length} low stock\`}
          subtitleLoading={loading}
          collapseProgress={collapseProgress}
          actions={
            <>
              {/* PDF Export */}
              <button
                onClick={exportToPDF}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/15 bg-gray-100 dark:bg-[rgba(255,255,255,0.08)] hover:bg-gray-200 dark:hover:bg-white/15 text-gray-700 dark:text-white text-xs font-medium cursor-pointer transition-all duration-150"
                title="Print PDF"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                  <rect width="24" height="24" rx="4" fill="#FF0000"/>
                  <text x="12" y="15" textAnchor="middle" fontFamily="Arial" fontWeight="bold" fontSize="8" fill="#fff">PDF</text>
                </svg>
                <span>PDF</span>
              </button>
              {/* Excel Export */}
              <button
                onClick={exportToXLSX}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/15 bg-gray-100 dark:bg-[rgba(255,255,255,0.08)] hover:bg-gray-200 dark:hover:bg-white/15 text-gray-700 dark:text-white text-xs font-medium cursor-pointer transition-all duration-150"
                title="Excel Export"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                  <rect width="24" height="24" rx="4" fill="#217346"/>
                  <path d="M14 3v5h4" fill="none" stroke="#fff" strokeWidth="1" opacity="0.5"/>
                  <text x="12" y="15" textAnchor="middle" fontFamily="Arial" fontWeight="bold" fontSize="8" fill="#fff">XLS</text>
                </svg>
                <span>Export</span>
              </button>
              {/* Add Material */}
              <IOSButton variant="filled" color="blue" size="medium" onClick={handleAddNewClick} className="!bg-[#2563EB] text-white hover:!bg-[#1D51C8] dark:!bg-[#2563EB] dark:text-white dark:hover:!bg-[#1D51C8]" icon={<Plus className="h-4 w-4" />}>
                Add Material
              </IOSButton>
            </>
          }
        />`,
  `        <CollapsingTitle
          title={t("title")}
          subtitle={t("subtitleStats", { count: items.length, lowStock: items.filter(i => Number(i.quantity || 0) <= Number(i.min_stock_level || 10)).length })}
          subtitleLoading={loading}
          collapseProgress={collapseProgress}
          actions={
            <>
              {/* PDF Export */}
              <button
                onClick={exportToPDF}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/15 bg-gray-100 dark:bg-[rgba(255,255,255,0.08)] hover:bg-gray-200 dark:hover:bg-white/15 text-gray-700 dark:text-white text-xs font-medium cursor-pointer transition-all duration-150"
                title={t("exportPdfTitle")}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                  <rect width="24" height="24" rx="4" fill="#FF0000"/>
                  <text x="12" y="15" textAnchor="middle" fontFamily="Arial" fontWeight="bold" fontSize="8" fill="#fff">PDF</text>
                </svg>
                <span>{t("exportPdf")}</span>
              </button>
              {/* Excel Export */}
              <button
                onClick={exportToXLSX}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/15 bg-gray-100 dark:bg-[rgba(255,255,255,0.08)] hover:bg-gray-200 dark:hover:bg-white/15 text-gray-700 dark:text-white text-xs font-medium cursor-pointer transition-all duration-150"
                title={t("exportExcelTitle")}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                  <rect width="24" height="24" rx="4" fill="#217346"/>
                  <path d="M14 3v5h4" fill="none" stroke="#fff" strokeWidth="1" opacity="0.5"/>
                  <text x="12" y="15" textAnchor="middle" fontFamily="Arial" fontWeight="bold" fontSize="8" fill="#fff">XLS</text>
                </svg>
                <span>{t("exportExcel")}</span>
              </button>
              {/* Add Material */}
              <IOSButton variant="filled" color="blue" size="medium" onClick={handleAddNewClick} className="!bg-[#2563EB] text-white hover:!bg-[#1D51C8] dark:!bg-[#2563EB] dark:text-white dark:hover:!bg-[#1D51C8]" icon={<Plus className="h-4 w-4" />}>
                {t("addMaterial")}
              </IOSButton>
            </>
          }
        />`
);

// 11. View Mode toggle
code = code.replace(
  '<Package className="h-3.5 w-3.5" /> Stock',
  '<Package className="h-3.5 w-3.5" /> {t("viewStock")}'
);
code = code.replace(
  '<Activity className="h-3.5 w-3.5" /> Forecast',
  '<Activity className="h-3.5 w-3.5" /> {t("viewForecast")}'
);

// 12. KPI row
code = code.replace(
  'label="Total Valuation"',
  'label={t("totalValuation")}'
);
code = code.replace(
  'label="Total Materials"',
  'label={t("totalMaterials")}'
);
code = code.replace(
  'label="Critical Stock"',
  'label={t("criticalStock")}'
);

// 13. SearchBar
code = code.replace(
  'placeholder="Search by material name..."',
  'placeholder={t("searchPlaceholder")}'
);
code = code.replace(
  'ariaLabel="Search inventory"',
  'ariaLabel={t("searchPlaceholder")}'
);

// 14. Filter pills
code = code.replace(
  `              {([
                { key: "all", label: "All" },
                { key: "critical", label: "Critical" },
                { key: "low_stock", label: "Low Stock" },
                { key: "out_of_stock", label: "Out of Stock" },
                { key: "recently_updated", label: "Recent" },
              ] as { key: InventoryFilter; label: string }[]).map((item) => (`,
  `              {([
                { key: "all", label: t("filterAll") },
                { key: "critical", label: t("filterCritical") },
                { key: "low_stock", label: t("filterLowStock") },
                { key: "out_of_stock", label: t("filterOutOfStock") },
                { key: "recently_updated", label: t("filterRecent") },
              ] as { key: InventoryFilter; label: string }[]).map((item) => (`
);

// 15. Quick add + Clear + Item count
code = code.replace(
  `                <button
                  type="button"
                  onClick={handleAddNewClick}
                  className="h-9 px-3 rounded-lg bg-[var(--primary)] text-white text-xs font-semibold hover:opacity-90 cursor-pointer transition-opacity"
                >
                  Quick add
                </button>`,
  `                <button
                  type="button"
                  onClick={handleAddNewClick}
                  className="h-9 px-3 rounded-lg bg-[var(--primary)] text-white text-xs font-semibold hover:opacity-90 cursor-pointer transition-opacity"
                >
                  {t("quickAdd")}
                </button>`
);

code = code.replace(
  `                  <button
                    type="button"
                    onClick={() => {
                      handleSearch("");
                      setInventoryFilter("all");
                    }}
                    className="h-9 px-3 rounded-lg text-xs font-medium text-[var(--muted-foreground)] bg-[var(--muted)] hover:bg-[var(--accent)] cursor-pointer"
                  >
                    Clear
                  </button>`,
  `                  <button
                    type="button"
                    onClick={() => {
                      handleSearch("");
                      setInventoryFilter("all");
                    }}
                    className="h-9 px-3 rounded-lg text-xs font-medium text-[var(--muted-foreground)] bg-[var(--muted)] hover:bg-[var(--accent)] cursor-pointer"
                  >
                    {t("clear")}
                  </button>`
);

code = code.replace(
  `<span className="text-sm text-[var(--muted-foreground)] tabular-nums">{totalFiltered} of {totalItems} items</span>`,
  `<span className="text-sm text-[var(--muted-foreground)] tabular-nums">{t("itemsCount", { filtered: totalFiltered, total: totalItems })}</span>`
);

// 16. Table Headers
code = code.replace(
  `<TableHead className="font-semibold py-3 text-[13px] text-[var(--muted-foreground)] uppercase tracking-wide pl-5">Item & Supplier</TableHead>
                    <TableHead className="font-semibold py-3 text-[13px] text-[var(--muted-foreground)] uppercase tracking-wide">Stock Level</TableHead>
                    <TableHead className="font-semibold py-3 text-[13px] text-[var(--muted-foreground)] uppercase tracking-wide">Unit Cost (Landed)</TableHead>
                    <TableHead className="font-semibold py-3 text-[13px] text-[var(--muted-foreground)] uppercase tracking-wide">Status</TableHead>`,
  `<TableHead className="font-semibold py-3 text-[13px] text-[var(--muted-foreground)] uppercase tracking-wide pl-5">{t("colItemSupplier")}</TableHead>
                    <TableHead className="font-semibold py-3 text-[13px] text-[var(--muted-foreground)] uppercase tracking-wide">{t("colStockLevel")}</TableHead>
                    <TableHead className="font-semibold py-3 text-[13px] text-[var(--muted-foreground)] uppercase tracking-wide">{t("colUnitCost")}</TableHead>
                    <TableHead className="font-semibold py-3 text-[13px] text-[var(--muted-foreground)] uppercase tracking-wide">{t("colStatus")}</TableHead>`
);

// 17. Table Empty State
code = code.replace(
  `                        <TableEmptyState
                          variant={searchQuery ? "no-results" : "no-data"}
                          title={searchQuery ? "No materials found" : "No materials added yet"}
                          subtitle={searchQuery ? "Try a different search term" : "Add your raw materials to start tracking stock and get AI-powered forecasts"}
                          action={!searchQuery ? { label: "+ Add First Material", onClick: handleAddNewClick } : undefined}
                        />`,
  `                        <TableEmptyState
                          variant={searchQuery ? "no-results" : "no-data"}
                          title={searchQuery ? t("emptyNoResults") : t("emptyNoData")}
                          subtitle={searchQuery ? t("emptyNoResultsSubtitle") : t("emptyNoDataSubtitle")}
                          action={!searchQuery ? { label: t("addFirstMaterial"), onClick: handleAddNewClick } : undefined}
                        />`
);

// 18. Table Rows
code = code.replace(
  `                                  {item.last_source_po_number && (
                                    <span className="text-[11px] text-[var(--muted-foreground)]">
                                      · From {item.last_source_po_number}{formatSourceDate(item.last_received_at) ? \` · \${formatSourceDate(item.last_received_at)}\` : ""}
                                    </span>
                                  )}`,
  `                                  {item.last_source_po_number && (
                                    <span className="text-[11px] text-[var(--muted-foreground)]">
                                      {t("fromPo", {
                                        po: item.last_source_po_number,
                                        date: formatSourceDate(item.last_received_at) ? \` · \${formatSourceDate(item.last_received_at)}\` : ""
                                      })}
                                    </span>
                                  )}`
);

code = code.replace(
  `<span className="text-[11px] text-[var(--muted-foreground)] uppercase tracking-wide">Min: {item.min_stock_level} {item.unit}</span>`,
  `<span className="text-[11px] text-[var(--muted-foreground)] uppercase tracking-wide">{t("minStock", { min: item.min_stock_level, unit: item.unit })}</span>`
);

code = code.replace(
  `<span className="text-[11px] text-[var(--muted-foreground)] uppercase tracking-wide">
                                {"\\u20B9"}{Number(item.purchase_cost_per_unit || 0).toLocaleString("en-IN")} + {item.tax_rate}% Tax
                              </span>`,
  `<span className="text-[11px] text-[var(--muted-foreground)] uppercase tracking-wide">
                                {"\\u20B9"}{Number(item.purchase_cost_per_unit || 0).toLocaleString("en-IN")} {t("taxSuffix", { tax: item.tax_rate })}
                              </span>`
);

code = code.replace(
  `                                <IOSButton
                                  variant="filled"
                                  size="small"
                                  onClick={() => handleRestock(item)}
                                  className="bg-[var(--erp-success)] hover:bg-[#2DB84E]"
                                >
                                  Restock
                                </IOSButton>`,
  `                                <IOSButton
                                  variant="filled"
                                  size="small"
                                  onClick={() => handleRestock(item)}
                                  className="bg-[var(--erp-success)] hover:bg-[#2DB84E]"
                                >
                                  {t("restock")}
                                </IOSButton>`
);

code = code.replace(
  `<Edit2 className="mr-2 h-4 w-4" /> Edit Item`,
  `<Edit2 className="mr-2 h-4 w-4" /> {t("editItem")}`
);

code = code.replace(
  `<Trash2 className="mr-2 h-4 w-4" /> Mark as Removed`,
  `<Trash2 className="mr-2 h-4 w-4" /> {t("markAsRemoved")}`
);

// 19. Mobile empty state
code = code.replace(
  `<p className="text-muted-foreground text-sm">{searchQuery ? "No materials found" : "No materials added yet"}</p>`,
  `<p className="text-muted-foreground text-sm">{searchQuery ? t("emptyNoResults") : t("emptyNoData")}</p>`
);

// 20. Forecast view
code = code.replace(
  `<span className="ind-pulse-dot" style={{ background: "var(--ind-green)" }} />
              AI-Powered Projection`,
  `<span className="ind-pulse-dot" style={{ background: "var(--ind-green)" }} />
              {t("aiProjection")}`
);

code = code.replace(
  `<p className="ind-subtitle">6-week stock forecast based on recent order consumption patterns</p>`,
  `<p className="ind-subtitle">{t("forecastSubtitle")}</p>`
);

code = code.replace(
  `                      {forecastData.summary.critical > 0
                        ? \`\${forecastData.summary.critical} material\${forecastData.summary.critical > 1 ? "s" : ""} below reorder level\`
                        : \`\${forecastData.summary.warning} material\${forecastData.summary.warning > 1 ? "s" : ""} approaching reorder level\`}`,
  `                      {forecastData.summary.critical > 0
                        ? t("criticalAlert", { count: forecastData.summary.critical })
                        : t("warningAlert", { count: forecastData.summary.warning })}`
);

code = code.replace(
  `<p className="text-[13px]" style={{ color: "var(--ind-text-muted)" }}>
                      Review and restock to avoid production delays
                    </p>`,
  `<p className="text-[13px]" style={{ color: "var(--ind-text-muted)" }}>
                      {t("alertDesc")}
                    </p>`
);

code = code.replace(
  `<span className="ind-stat-card__label">Total Materials</span>`,
  `<span className="ind-stat-card__label">{t("totalMaterials")}</span>`
);
code = code.replace(
  `<span className="ind-stat-card__label">Need Attention</span>`,
  `<span className="ind-stat-card__label">{t("needAttention")}</span>`
);
code = code.replace(
  `<span className="ind-stat-card__label">Sufficient</span>`,
  `<span className="ind-stat-card__label">{t("sufficient")}</span>`
);

code = code.replace(
  `{material.supplierWhatsapp || "No supplier"}`,
  `{material.supplierWhatsapp || t("noSupplier")}`
);

code = code.replace(
  `{material.status === "critical" ? "CRITICAL" : material.status === "warning" ? "WARNING" : "OK"}`,
  `{material.status === "critical" ? t("statusBadgeCritical") : material.status === "warning" ? t("statusBadgeWarning") : t("statusBadgeOk")}`
);

code = code.replace(
  `<span className="ind-stat-card__label" style={{ fontSize: 10 }}>Weekly Usage</span>`,
  `<span className="ind-stat-card__label" style={{ fontSize: 10 }}>{t("weeklyUsage")}</span>`
);
code = code.replace(
  `<span className="ind-stat-card__label" style={{ fontSize: 10 }}>Days to Reorder</span>`,
  `<span className="ind-stat-card__label" style={{ fontSize: 10 }}>{t("daysToReorder")}</span>`
);
code = code.replace(
  `<span className="ind-stat-card__label" style={{ fontSize: 10 }}>Reorder By</span>`,
  `<span className="ind-stat-card__label" style={{ fontSize: 10 }}>{t("reorderBy")}</span>`
);
code = code.replace(
  `{material.daysUntilReorder >= 999 ? "N/A" : new Date(material.reorderDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`,
  `{material.daysUntilReorder >= 999 ? "N/A" : new Date(material.reorderDate).toLocaleDateString(dateLocale, { day: "numeric", month: "short" })}`
);
code = code.replace(
  `<span className="ind-stat-card__label" style={{ fontSize: 10 }}>Cost/Unit</span>`,
  `<span className="ind-stat-card__label" style={{ fontSize: 10 }}>{t("costPerUnit")}</span>`
);

code = code.replace(
  `<p className="text-[12px] font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--ind-text-muted)" }}>6-Week Projection</p>`,
  `<p className="text-[12px] font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--ind-text-muted)" }}>{t("sixWeekProjection")}</p>`
);

code = code.replace(
  `<span className="ind-forecast-bar__label">Now</span>`,
  `<span className="ind-forecast-bar__label">{t("now")}</span>`
);

code = code.replace(
  `<span className="text-[10px] font-medium" style={{ color: "var(--ind-red)" }}>Min: {material.minStockLevel} {material.unit}</span>`,
  `<span className="text-[10px] font-medium" style={{ color: "var(--ind-red)" }}>{t("minStock", { min: material.minStockLevel, unit: material.unit })}</span>`
);

code = code.replace(
  `                                const msg = \`Hi, I need to restock \${material.name}. Current stock: \${material.currentStock} \${material.unit}. Please share availability and price.\`;`,
  `                                const msg = t("restockWhatsAppMessage", { name: material.name, qty: material.currentStock, unit: material.unit });`
);

code = code.replace(
  `<Phone className="h-4 w-4" /> Contact Supplier via WhatsApp`,
  `<Phone className="h-4 w-4" /> {t("contactSupplierWhatsApp")}`
);

code = code.replace(
  `<p className="text-[17px] font-medium text-[var(--muted-foreground)]">No forecast data</p>
              <p className="text-[13px] text-[var(--muted-foreground)]">Add inventory items and create orders to generate forecasts</p>`,
  `<p className="text-[17px] font-medium text-[var(--muted-foreground)]">{t("noForecastData")}</p>
              <p className="text-[13px] text-[var(--muted-foreground)]">{t("noForecastDataDesc")}</p>`
);

// 21. Delete Confirm Sheet
code = code.replace(
  `      <ConfirmDeleteSheet
        open={isDeleteDialogOpenConfirm}
        onClose={() => setIsDeleteDialogOpenConfirm(false)}
        onConfirm={async () => {
          if (itemToDeleteId) {
            await handleDelete(itemToDeleteId);
          }
        }}
        entityLabel="item"
        entityName={items.find((i) => i.id === itemToDeleteId)?.name}
        consequenceText="will be removed from inventory stock records. This cannot be undone."
      />`,
  `      <ConfirmDeleteSheet
        open={isDeleteDialogOpenConfirm}
        onClose={() => setIsDeleteDialogOpenConfirm(false)}
        onConfirm={async () => {
          if (itemToDeleteId) {
            await handleDelete(itemToDeleteId);
          }
        }}
        entityLabel={t("deleteEntityLabel")}
        entityName={items.find((i) => i.id === itemToDeleteId)?.name}
        consequenceText={t("deleteConsequence")}
        title={t("deleteTitle")}
        confirmText={t("deleteConfirm")}
        cancelText={t("cancel")}
      />`
);

// 22. Long Press Action Sheet
code = code.replace(
  `<p className="text-sm text-[var(--muted-foreground)]">
                Stock: {longPressedItem.quantity} {longPressedItem.unit}
              </p>`,
  `<p className="text-sm text-[var(--muted-foreground)]">
                {t("stockLevelLabel", { qty: longPressedItem.quantity, unit: longPressedItem.unit })}
              </p>`
);

code = code.replace(
  `<Edit2 className="h-[18px] w-[18px] text-[var(--muted-foreground)]" />
              Edit Item`,
  `<Edit2 className="h-[18px] w-[18px] text-[var(--muted-foreground)]" />
              {t("editItem")}`
);

code = code.replace(
  `<Plus className="h-[18px] w-[18px] text-[var(--muted-foreground)]" />
              Add Stock`,
  `<Plus className="h-[18px] w-[18px] text-[var(--muted-foreground)]" />
              {t("addStock")}`
);

code = code.replace(
  `toast.info("Update the stock quantity to add stock");`,
  `toast.info(t("addStockHint"));`
);

code = code.replace(
  `<Minus className="h-[18px] w-[18px] text-[var(--muted-foreground)]" />
              Reduce Stock`,
  `<Minus className="h-[18px] w-[18px] text-[var(--muted-foreground)]" />
              {t("reduceStock")}`
);

code = code.replace(
  `toast.info("Update the stock quantity to reduce stock");`,
  `toast.info(t("reduceStockHint"));`
);

code = code.replace(
  `<History className="h-[18px] w-[18px] text-[var(--muted-foreground)]" />
              View Stock History`,
  `<History className="h-[18px] w-[18px] text-[var(--muted-foreground)]" />
              {t("viewStockHistory")}`
);

code = code.replace(
  `<Trash2 className="h-[18px] w-[18px]" />
              Delete Item`,
  `<Trash2 className="h-[18px] w-[18px]" />
              {t("deleteItem")}`
);

// 23. Mobile Inventory Card
code = code.replace(
  `function MobileInventoryCard({
  item,
  getStockStatus,
  formatSourceDate,
  onTap,
  onLongPress,
}: {
  item: any;
  getStockStatus: (item: any) => { label: string; color: "green" | "orange" | "red"; level: string };
  formatSourceDate: (dateStr: string | null | undefined) => string;
  onTap: () => void;
  onLongPress: () => void;
}) {`,
  `function MobileInventoryCard({
  item,
  getStockStatus,
  formatSourceDate,
  onTap,
  onLongPress,
}: {
  item: any;
  getStockStatus: (item: any) => { label: string; color: "green" | "orange" | "red"; level: string };
  formatSourceDate: (dateStr: string | null | undefined) => string;
  onTap: () => void;
  onLongPress: () => void;
}) {
  const t = useTranslations("inventory");`
);

code = code.replace(
  `<span className={cn("text-sm font-semibold", isLowStock ? "text-red-500 dark:text-red-400" : "text-blue-600 dark:text-blue-400")}>Stock: {item.quantity} {item.unit}</span>
        <span className="text-gray-500 dark:text-gray-400 text-xs">Min: {item.min_stock_level}</span>`,
  `<span className={cn("text-sm font-semibold", isLowStock ? "text-red-500 dark:text-red-400" : "text-blue-600 dark:text-blue-400")}>{t("stockLevelLabel", { qty: item.quantity, unit: item.unit })}</span>
        <span className="text-gray-500 dark:text-gray-400 text-xs">{t("minStockShort", { min: item.min_stock_level })}</span>`
);

code = code.replace(
  `          {item.last_source_po_number
            ? \`From \${item.last_source_po_number}\${formatSourceDate(item.last_received_at) ? \` · \${formatSourceDate(item.last_received_at)}\` : ""}\`
            : item.supplier_whatsapp || "No supplier"}`,
  `          {item.last_source_po_number
            ? t("fromPoMobile", {
                po: item.last_source_po_number,
                date: formatSourceDate(item.last_received_at) ? \` · \${formatSourceDate(item.last_received_at)}\` : ""
              })
            : item.supplier_whatsapp || t("noSupplier")}`
);

code = code.replace(
  `<span className="text-gray-600 dark:text-gray-300 text-xs whitespace-nowrap">{"\\u20B9"}{Number(item.purchase_cost_per_unit || 0).toLocaleString('en-IN')} + {item.tax_rate || 0}% TAX</span>`,
  `<span className="text-gray-600 dark:text-gray-300 text-xs whitespace-nowrap">{"\\u20B9"}{Number(item.purchase_cost_per_unit || 0).toLocaleString('en-IN')} {t("taxSuffixUpper", { tax: item.tax_rate || 0 })}</span>`
);

if (isCRLF) code = code.replace(/\n/g, '\r\n');
fs.writeFileSync('apps/web/src/app/dashboard/inventory/page.tsx', code, 'utf8');
console.log('inventory/page.tsx transformed successfully');
