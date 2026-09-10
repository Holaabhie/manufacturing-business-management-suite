const fs = require('fs');

let code = fs.readFileSync('apps/web/src/components/inventory/AddMaterialModal.tsx', 'utf8');
const isCRLF = code.includes('\r\n');
if (isCRLF) code = code.replace(/\r\n/g, '\n');

// 1. Add import
code = code.replace(
  'import { cn } from "@/lib/utils";',
  'import { cn } from "@/lib/utils";\nimport { useTranslations } from "next-intl";'
);

// 2. Update CATEGORIES array
code = code.replace(
  `const CATEGORIES = [
  "Raw Material",
  "Packaging",
  "Chemical",
  "Consumable",
  "Finished Goods",
] as const;`,
  `const CATEGORIES = [
  { value: "Raw Material", labelKey: "catRawMaterial" },
  { value: "Packaging", labelKey: "catPackaging" },
  { value: "Chemical", labelKey: "catChemical" },
  { value: "Consumable", labelKey: "catConsumable" },
  { value: "Finished Goods", labelKey: "catFinishedGoods" },
] as const;`
);

// 3. Update getStockHealth
code = code.replace(
  `function getStockHealth(
  qty: number,
  lowStockAlert: number,
  reorderLevel: number
): { label: string; color: string; dotClass: string; bgClass: string } {
  if (qty === 0)
    return {
      label: "No Stock",
      color: "text-[#94A3B8]",
      dotClass: "bg-[#94A3B8]",
      bgClass: "bg-slate-500/10 border-slate-500/20",
    };
  if (qty <= lowStockAlert)
    return {
      label: "Critical",
      color: "text-[#EF4444]",
      dotClass: "bg-[#EF4444]",
      bgClass: "bg-red-500/10 border-red-500/20",
    };
  if (qty <= reorderLevel)
    return {
      label: "Low Stock",
      color: "text-[#F59E0B]",
      dotClass: "bg-[#F59E0B]",
      bgClass: "bg-amber-500/10 border-amber-500/20",
    };
  return {
    label: "Healthy",
    color: "text-[#10B981]",
    dotClass: "bg-[#10B981]",
    bgClass: "bg-green-500/10 border-green-500/20",
  };
}`,
  `function getStockHealth(
  qty: number,
  lowStockAlert: number,
  reorderLevel: number,
  t: (key: any) => string
): { label: string; color: string; dotClass: string; bgClass: string } {
  if (qty === 0)
    return {
      label: t("healthNoStock"),
      color: "text-[#94A3B8]",
      dotClass: "bg-[#94A3B8]",
      bgClass: "bg-slate-500/10 border-slate-500/20",
    };
  if (qty <= lowStockAlert)
    return {
      label: t("healthCritical"),
      color: "text-[#EF4444]",
      dotClass: "bg-[#EF4444]",
      bgClass: "bg-red-500/10 border-red-500/20",
    };
  if (qty <= reorderLevel)
    return {
      label: t("healthLowStock"),
      color: "text-[#F59E0B]",
      dotClass: "bg-[#F59E0B]",
      bgClass: "bg-amber-500/10 border-amber-500/20",
    };
  return {
    label: t("healthHealthy"),
    color: "text-[#10B981]",
    dotClass: "bg-[#10B981]",
    bgClass: "bg-green-500/10 border-green-500/20",
  };
}`
);

// 4. Hook call in AddMaterialModal
code = code.replace(
  'export function AddMaterialModal({',
  `export function AddMaterialModal({`
);

code = code.replace(
  '  // ── Local UI state (does NOT affect API) ──',
  `  const t = useTranslations("inventory");\n  // ── Local UI state (does NOT affect API) ──`
);

// 5. Update stockHealth call
code = code.replace(
  '() => getStockHealth(quantity, lowStockAlert, reorderLevelNum),',
  '() => getStockHealth(quantity, lowStockAlert, reorderLevelNum, t),'
);
code = code.replace(
  '[quantity, lowStockAlert, reorderLevelNum]',
  '[quantity, lowStockAlert, reorderLevelNum, t]'
);

// 6. Header
code = code.replace(
  '{isEditing ? "Edit Material" : "Add New Material"}',
  '{isEditing ? t("modalTitleEdit") : t("modalTitleAdd")}'
);
code = code.replace(
  `{isEditing
                      ? "Update stock and supplier details"
                      : "Add raw material to inventory and track stock levels"}`,
  `{isEditing ? t("modalSubtitleEdit") : t("modalSubtitleAdd")}`
);

// 7. Live preview
code = code.replace(
  `<span className="text-[12px] font-medium text-[#64748B] dark:text-[#94A3B8]">
                    Live Preview
                  </span>`,
  `<span className="text-[12px] font-medium text-[#64748B] dark:text-[#94A3B8]">
                    {t("livePreview")}
                  </span>`
);
code = code.replace(
  `<span className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                    Estimated Inventory Value
                  </span>`,
  `<span className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                    {t("estimatedValue")}
                  </span>`
);
code = code.replace(
  `<p className="text-[11px] uppercase tracking-wider text-[#94A3B8]">Estimated Inventory Value</p>`,
  `<p className="text-[11px] uppercase tracking-wider text-[#94A3B8]">{t("estimatedValue")}</p>`
);

// 8. Section 1
code = code.replace(
  `<SectionCard number={1} title="Material Details">`,
  `<SectionCard number={1} title={t("section1Title")}>`
);
code = code.replace(
  `<FieldLabel htmlFor="modal-name" required>
                          Material Name
                        </FieldLabel>`,
  `<FieldLabel htmlFor="modal-name" required>
                          {t("materialName")}
                        </FieldLabel>`
);
code = code.replace(
  'placeholder="e.g. Polyester Yarn"',
  'placeholder={t("materialNamePlaceholder")}'
);
code = code.replace(
  `<FieldLabel htmlFor="modal-category">
                            Category
                          </FieldLabel>`,
  `<FieldLabel htmlFor="modal-category">
                            {t("category")}
                          </FieldLabel>`
);
code = code.replace(
  `<option value="">Select category</option>
                            {CATEGORIES.map((cat) => (
                              <option key={cat} value={cat}>
                                {cat}
                              </option>
                            ))}`,
  `<option value="">{t("selectCategory")}</option>
                            {CATEGORIES.map((cat) => (
                              <option key={cat.value} value={cat.value}>
                                {t(cat.labelKey)}
                              </option>
                            ))}`
);
code = code.replace(
  `<FieldLabel htmlFor="modal-hsn">HSN Code</FieldLabel>`,
  `<FieldLabel htmlFor="modal-hsn">{t("hsnCode")}</FieldLabel>`
);
code = code.replace(
  'placeholder="e.g. 5402"',
  'placeholder={t("hsnPlaceholder")}'
);

// 9. Section 2
code = code.replace(
  `<SectionCard number={2} title="Inventory Setup">`,
  `<SectionCard number={2} title={t("section2Title")}>`
);
code = code.replace(
  `<FieldLabel htmlFor="modal-quantity" required>
                            Quantity
                          </FieldLabel>`,
  `<FieldLabel htmlFor="modal-quantity" required>
                            {t("quantity")}
                          </FieldLabel>`
);
code = code.replace(
  'placeholder="Enter quantity"',
  'placeholder={t("quantityPlaceholder")}'
);
code = code.replace(
  `<FieldLabel htmlFor="modal-unit" required>
                            Unit
                          </FieldLabel>`,
  `<FieldLabel htmlFor="modal-unit" required>
                            {t("unit")}
                          </FieldLabel>`
);
code = code.replace(
  'placeholder="kg, pcs, meters"',
  'placeholder={t("unitPlaceholder")}'
);
code = code.replace(
  `<InfoChip>
                        Total stock after adding will be reflected in inventory
                      </InfoChip>`,
  `<InfoChip>
                        {t("stockReflectNotice")}
                      </InfoChip>`
);

// 10. Section 3
code = code.replace(
  `<SectionCard number={3} title="Cost & Tax Configuration">`,
  `<SectionCard number={3} title={t("section3Title")}>`
);
code = code.replace(
  `<FieldLabel htmlFor="modal-cost" required>
                            Cost Per Unit
                          </FieldLabel>`,
  `<FieldLabel htmlFor="modal-cost" required>
                            {t("costPerUnitLabel")}
                          </FieldLabel>`
);
code = code.replace(
  'placeholder="0.00"',
  'placeholder={t("costPerUnitPlaceholder")}'
);
code = code.replace(
  `<FieldLabel>GST %</FieldLabel>`,
  `<FieldLabel>{t("gstLabel")}</FieldLabel>`
);
code = code.replace(
  'placeholder="18"',
  'placeholder={t("gstPlaceholder")}'
);
code = code.replace(
  `<span className="text-[12px] font-medium text-[#0F172A] dark:text-[#F1F5F9]">
                            Inclusive of GST
                          </span>
                          <span className="text-[11px] text-[#64748B] dark:text-[#94A3B8] ml-1.5">
                            · Cost already includes GST
                          </span>`,
  `<span className="text-[12px] font-medium text-[#0F172A] dark:text-[#F1F5F9]">
                            {t("gstInclusive")}
                          </span>
                          <span className="text-[11px] text-[#64748B] dark:text-[#94A3B8] ml-1.5">
                            {t("gstInclusiveDesc")}
                          </span>`
);

// 11. Section 4
code = code.replace(
  `<SectionCard number={4} title="Stock Monitoring">`,
  `<SectionCard number={4} title={t("section4Title")}>`
);
code = code.replace(
  `<FieldLabel htmlFor="modal-min-stock">
                            Low Stock Alert
                          </FieldLabel>`,
  `<FieldLabel htmlFor="modal-min-stock">
                            {t("lowStockAlert")}
                          </FieldLabel>`
);
code = code.replace(
  'placeholder="e.g. 10"',
  'placeholder={t("lowStockPlaceholder")}'
);
code = code.replace(
  `<FieldLabel htmlFor="modal-reorder">
                            Reorder Level
                          </FieldLabel>`,
  `<FieldLabel htmlFor="modal-reorder">
                            {t("reorderLevel")}
                          </FieldLabel>`
);
code = code.replace(
  'placeholder="e.g. 20"',
  'placeholder={t("reorderPlaceholder")}'
);
code = code.replace(
  `<InfoChip>
                        You will be notified when stock reaches low stock level
                      </InfoChip>`,
  `<InfoChip>
                        {t("notifyAlertDesc")}
                      </InfoChip>`
);

// 12. Section 5
code = code.replace(
  `<SectionCard number={5} title="Additional Information (Optional)">`,
  `<SectionCard number={5} title={t("section5Title")}>`
);
code = code.replace(
  `<FieldLabel htmlFor="modal-whatsapp" required>
                            Supplier WhatsApp
                          </FieldLabel>`,
  `<FieldLabel htmlFor="modal-whatsapp" required>
                            {t("supplierWhatsApp")}
                          </FieldLabel>`
);
code = code.replace(
  'placeholder="e.g. +91 9876543210"',
  'placeholder={t("supplierWhatsAppPlaceholder")}'
);
code = code.replace(
  `<FieldLabel htmlFor="modal-notes">Notes</FieldLabel>`,
  `<FieldLabel htmlFor="modal-notes">{t("notes")}</FieldLabel>`
);
code = code.replace(
  'placeholder="Optional notes..."',
  'placeholder={t("notesPlaceholder")}'
);

// 13. Mobile accordion & right panel
code = code.replace(
  `<span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8]">
                          Inventory Summary
                        </span>`,
  `<span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8]">
                          {t("summaryTitle")}
                        </span>`
);
code = code.replace(
  `{formData.name || "Material Name"}`,
  `{formData.name || t("materialName")}`
);
code = code.replace(
  `<span className="text-[#64748B] dark:text-[#94A3B8]">Quantity</span>`,
  `<span className="text-[#64748B] dark:text-[#94A3B8]">{t("summaryQty")}</span>`
);
code = code.replace(
  `<span className="text-[#64748B] dark:text-[#94A3B8]">Unit</span>`,
  `<span className="text-[#64748B] dark:text-[#94A3B8]">{t("summaryUnit")}</span>`
);
code = code.replace(
  `<span className="text-[#64748B] dark:text-[#94A3B8]">Cost Per Unit</span>`,
  `<span className="text-[#64748B] dark:text-[#94A3B8]">{t("summaryCost")}</span>`
);
code = code.replace(
  `<span className="text-[#10B981] font-medium">Subtotal</span>`,
  `<span className="text-[#10B981] font-medium">{t("summarySubtotal")}</span>`
);
code = code.replace(
  `<span className="text-[#64748B] dark:text-[#94A3B8]">GST Tax ({gst}%)</span>`,
  `<span className="text-[#64748B] dark:text-[#94A3B8]">{t("summaryGst", { gst })}</span>`
);
code = code.replace(
  `<span className="text-[11px] uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8] font-semibold">Total</span>`,
  `<span className="text-[11px] uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8] font-semibold">{t("summaryTotal")}</span>`
);
code = code.replace(
  `<p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] font-medium mb-2">
                                Stock Health
                              </p>`,
  `<p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] font-medium mb-2">
                                {t("summaryStockHealth")}
                              </p>`
);
code = code.replace(
  `{isEditing ? "Update Details" : "Save Material"}`,
  `{isEditing ? t("updateDetails") : t("saveMaterial")}`
);
code = code.replace(
  `<button
                    type="button"
                    onClick={onClose}
                    className="w-full h-[48px] bg-transparent border border-[rgba(148,163,184,0.20)] text-[#94A3B8] font-medium text-[14px] rounded-[10px] transition-colors duration-150 cursor-pointer"
                  >
                    Cancel
                  </button>`,
  `<button
                    type="button"
                    onClick={onClose}
                    className="w-full h-[48px] bg-transparent border border-[rgba(148,163,184,0.20)] text-[#94A3B8] font-medium text-[14px] rounded-[10px] transition-colors duration-150 cursor-pointer"
                  >
                    {t("cancel")}
                  </button>`
);

// Right sidebar (Desktop)
code = code.replace(
  `<h3 className="text-[11px] uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8] font-semibold">
                    Inventory Summary
                  </h3>`,
  `<h3 className="text-[11px] uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8] font-semibold">
                    {t("summaryTitle")}
                  </h3>`
);
code = code.replace(
  `{formData.name || "Material Name"}`,
  `{formData.name || t("materialName")}`
);
code = code.replace(
  `<span className="text-[#64748B] dark:text-[#94A3B8]">
                          Quantity
                        </span>`,
  `<span className="text-[#64748B] dark:text-[#94A3B8]">
                          {t("summaryQty")}
                        </span>`
);
code = code.replace(
  `<span className="text-[#64748B] dark:text-[#94A3B8]">
                          Unit
                        </span>`,
  `<span className="text-[#64748B] dark:text-[#94A3B8]">
                          {t("summaryUnit")}
                        </span>`
);
code = code.replace(
  `<span className="text-[#64748B] dark:text-[#94A3B8]">
                          Cost Per Unit
                        </span>`,
  `<span className="text-[#64748B] dark:text-[#94A3B8]">
                          {t("summaryCost")}
                        </span>`
);
code = code.replace(
  `<span className="text-[#10B981] font-medium">
                          Subtotal
                        </span>`,
  `<span className="text-[#10B981] font-medium">
                          {t("summarySubtotal")}
                        </span>`
);
code = code.replace(
  `<span className="text-[#64748B] dark:text-[#94A3B8]">
                          GST Tax ({gst}%)
                        </span>`,
  `<span className="text-[#64748B] dark:text-[#94A3B8]">
                          {t("summaryGst", { gst })}
                        </span>`
);
code = code.replace(
  `<p className="text-[10px] uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8] font-semibold mb-1">
                      Total Inventory Value
                    </p>`,
  `<p className="text-[10px] uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8] font-semibold mb-1">
                      {t("estimatedValue")}
                    </p>`
);
code = code.replace(
  `<p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] font-medium mb-2">
                      Stock Health
                    </p>`,
  `<p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] font-medium mb-2">
                      {t("summaryStockHealth")}
                    </p>`
);
code = code.replace(
  `<button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 rounded-[10px] text-[13px] font-medium text-[#64748B] dark:text-[#94A3B8] border border-[rgba(15,23,42,0.08)] dark:border-[rgba(148,163,184,0.2)] bg-transparent hover:bg-slate-500/5 transition-colors cursor-pointer"
                >
                  Cancel
                </button>`,
  `<button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 rounded-[10px] text-[13px] font-medium text-[#64748B] dark:text-[#94A3B8] border border-[rgba(15,23,42,0.08)] dark:border-[rgba(148,163,184,0.2)] bg-transparent hover:bg-slate-500/5 transition-colors cursor-pointer"
                >
                  {t("cancel")}
                </button>`
);
code = code.replace(
  `{isEditing ? "Update Details" : "Save to Inventory"}`,
  `{isEditing ? t("updateDetails") : t("saveToInventory")}`
);

if (isCRLF) code = code.replace(/\n/g, '\r\n');
fs.writeFileSync('apps/web/src/components/inventory/AddMaterialModal.tsx', code, 'utf8');
console.log('AddMaterialModal updated successfully');
