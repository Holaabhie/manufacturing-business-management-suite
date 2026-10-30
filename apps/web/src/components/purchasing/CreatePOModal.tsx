import { useState } from "react";
import { useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { ShoppingCart, Plus, X, Package } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NumericInput, parseNumericValue } from "@/components/ui/numeric-input";
import { cn } from "@/lib/utils";
import { AddMaterialModal } from "@/components/inventory/AddMaterialModal";
import type { Vendor, InventoryItem, POItemDraft } from "./types";

interface CreatePOModalProps {
  isOpen: boolean;
  onClose: () => void;
  vendors: Vendor[];
  inventoryItems: InventoryItem[];
  poVendorId: string;
  setPoVendorId: (id: string) => void;
  poNotes: string;
  setPoNotes: (notes: string) => void;
  poTaxPercent: string;
  setPoTaxPercent: (tax: string) => void;
  poItems: POItemDraft[];
  setPoItems: React.Dispatch<React.SetStateAction<POItemDraft[]>>;
  addToInventory: boolean;
  setAddToInventory: React.Dispatch<React.SetStateAction<boolean>>;
  onAddPOItem: () => void;
  onRemovePOItem: (index: number) => void;
  onUpdatePOItem: (index: number, field: string, value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onRefreshInventory: () => void;
}

export function CreatePOModal({
  isOpen,
  onClose,
  vendors,
  inventoryItems,
  poVendorId,
  setPoVendorId,
  poNotes,
  setPoNotes,
  poTaxPercent,
  setPoTaxPercent,
  poItems,
  setPoItems,
  addToInventory,
  setAddToInventory,
  onAddPOItem,
  onRemovePOItem,
  onUpdatePOItem,
  onSubmit,
  onRefreshInventory,
}: CreatePOModalProps) {
  const tOrderModal = useTranslations("purchasing.orderModal");
  const queryClient = useQueryClient();

  // Inline Add Material state
  const [addMaterialTargetRow, setAddMaterialTargetRow] = useState<number | null>(null);
  const [isAddMaterialOpen, setIsAddMaterialOpen] = useState(false);
  const emptyMaterialForm = {
    name: "",
    quantity: "" as string,
    unit: "kg",
    min_stock_level: "" as string,
    supplier_whatsapp: "",
    purchase_cost_per_unit: "" as string,
    hsn_code: "",
    tax_rate: "18",
    track_inventory: true,
    track_batches: false,
    item_type: "Goods",
  };
  const [materialFormData, setMaterialFormData] = useState(emptyMaterialForm);

  const formatCurrency = (n: number) =>
    `\u20B9${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

  const handleAddMaterialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!materialFormData.supplier_whatsapp) {
      return;
    }
    try {
      const payload = {
        ...materialFormData,
        quantity: parseNumericValue(materialFormData.quantity),
        min_stock_level: parseNumericValue(materialFormData.min_stock_level, 10),
        purchase_cost_per_unit: parseNumericValue(
          materialFormData.purchase_cost_per_unit
        ),
        tax_rate: parseNumericValue(materialFormData.tax_rate, 18),
      };
      const data = await apiClient.post<{ error?: string; success?: boolean; data?: any }>("/api/v1/inventory", payload);
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory });
      if (data.error || !data.success) {
        return;
      }
      const created = data.data;
      if (addMaterialTargetRow !== null) {
        setPoItems((prev) => {
          const updated = [...prev];
          if (updated[addMaterialTargetRow]) {
            updated[addMaterialTargetRow] = {
              ...updated[addMaterialTargetRow],
              inventoryItemId: created.id,
              materialName: created.name,
              unit: created.unit,
              unitPrice: String(created.purchase_cost_per_unit || 0),
            };
          }
          return updated;
        });
      }
      onRefreshInventory();
      setIsAddMaterialOpen(false);
      setAddMaterialTargetRow(null);
    } catch {
      // handled
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
        <DialogContent
          fullScreenMobile
          className="w-full max-w-[420px] sm:max-w-[560px] md:max-w-[680px] lg:max-w-[750px] p-0 md:max-h-[85dvh] overflow-hidden rounded-[24px] border-[var(--glass-border)] glass-dialog flex flex-col"
        >
          <div className="overflow-y-auto flex-1 min-h-0">
            <div className="p-4 sm:p-6 md:p-8">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  paddingBottom: 12,
                  marginBottom: 12,
                  borderBottom: "1px solid var(--glass-border)",
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background:
                      "linear-gradient(135deg, rgba(34,197,94,0.4), rgba(255,255,255,0.06))",
                    border: "1px solid var(--glass-border)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <ShoppingCart className="h-[18px] w-[18px] text-[#4ade80]" />
                </div>
                <div>
                  <DialogTitle
                    style={{
                      fontSize: 18,
                      fontWeight: 700,
                      color: "var(--g-text-primary)",
                      lineHeight: "22px",
                      margin: 0,
                    }}
                  >
                    {tOrderModal("titleNew")}
                  </DialogTitle>
                  <p
                    style={{
                      fontSize: 13,
                      color: "var(--g-text-secondary)",
                      lineHeight: "18px",
                      margin: "2px 0 0",
                    }}
                  >
                    {tOrderModal("subtitle")}
                  </p>
                </div>
              </div>
              <form onSubmit={onSubmit} className="space-y-5 pt-4">
                {/* Vendor Select */}
                <div className="space-y-1.5">
                  <Label className="text-[13px] text-[var(--muted-foreground)]">
                    {tOrderModal("lblVendor")}
                  </Label>
                  <Select
                    value={poVendorId}
                    onValueChange={setPoVendorId}
                    required
                  >
                    <SelectTrigger className="w-full h-[44px] rounded-[10px] bg-[var(--muted)] px-3 text-[15px] text-[var(--foreground)] border-none outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] transition-shadow cursor-pointer">
                      <SelectValue placeholder={tOrderModal("placeholderVendor")} />
                    </SelectTrigger>
                    <SelectContent className="max-h-[220px] overflow-y-auto scrollbar-thin">
                      {vendors.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.name} — {v.contactPerson}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {vendors.length === 0 && (
                    <p className="text-[12px] text-[var(--erp-warning)]">
                      {tOrderModal("noVendorsHint")}
                    </p>
                  )}
                </div>

                {/* Line Items */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-[13px] font-semibold text-[var(--foreground)]">
                      {tOrderModal("lblMaterials")}
                    </Label>
                    <button
                      type="button"
                      onClick={onAddPOItem}
                      className="text-[13px] text-[var(--primary)] font-medium hover:underline cursor-pointer"
                    >
                      {tOrderModal("btnAddItem")}
                    </button>
                  </div>

                  {poItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-[12px] bg-[var(--muted)] space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] font-bold text-[var(--muted-foreground)] uppercase">
                          {tOrderModal("thItem")} {idx + 1}
                        </span>
                        {poItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => onRemovePOItem(idx)}
                            className="p-1 hover:bg-[var(--muted)] rounded-[6px] cursor-pointer"
                          >
                            <X className="h-3.5 w-3.5 text-[var(--destructive)]" />
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Select
                          value={item.inventoryItemId}
                          onValueChange={(val) =>
                            onUpdatePOItem(idx, "inventoryItemId", val)
                          }
                        >
                          <SelectTrigger className="w-full h-[40px] rounded-[8px] bg-[var(--muted)] px-3 text-[14px] text-[var(--foreground)] border-none outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] transition-shadow cursor-pointer">
                            <SelectValue placeholder={tOrderModal("selectMaterial")} />
                          </SelectTrigger>
                          <SelectContent className="max-h-[220px] overflow-y-auto scrollbar-thin">
                            {inventoryItems.map((inv) => (
                              <SelectItem key={inv.id} value={inv.id}>
                                {inv.name} ({inv.quantity} {inv.unit}{" "}
                                {tOrderModal("inStock")})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <button
                          type="button"
                          title={tOrderModal("titleCreateMaterial")}
                          onClick={() => {
                            setMaterialFormData({ ...emptyMaterialForm });
                            setAddMaterialTargetRow(idx);
                            setIsAddMaterialOpen(true);
                          }}
                          className="p-1 hover:bg-[var(--muted)] rounded-[6px] cursor-pointer flex-shrink-0"
                        >
                          <Plus className="h-3.5 w-3.5 text-[var(--primary)]" />
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-2 md:gap-4">
                        <div>
                          <Label className="text-[11px] text-[var(--muted-foreground)]">
                            {tOrderModal("thQty")}
                          </Label>
                          <NumericInput
                            value={item.quantity}
                            onValueChange={(v) => onUpdatePOItem(idx, "quantity", v)}
                            placeholder="0"
                            allowDecimal
                            min={0}
                          />
                        </div>
                        <div>
                          <Label className="text-[11px] text-[var(--muted-foreground)]">
                            {tOrderModal("thUnit")}
                          </Label>
                          <Input
                            value={item.unit}
                            onChange={(e) =>
                              onUpdatePOItem(idx, "unit", e.target.value)
                            }
                            className="glass-input h-[40px] px-2 text-[14px]"
                          />
                        </div>
                        <div>
                          <Label className="text-[11px] text-[var(--muted-foreground)]">
                            ₹{tOrderModal("thRateUnit")}
                          </Label>
                          <NumericInput
                            value={item.unitPrice}
                            onValueChange={(v) => onUpdatePOItem(idx, "unitPrice", v)}
                            placeholder="0.00"
                            prefix={"\u20B9"}
                            allowDecimal
                            min={0}
                          />
                        </div>
                      </div>
                      {item.quantity && item.unitPrice && (
                        <div className="text-right text-[13px] font-semibold text-[var(--primary)]">
                          {tOrderModal("lblLineTotal")}{" "}
                          {formatCurrency(
                            parseNumericValue(item.quantity) *
                              parseNumericValue(item.unitPrice)
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Tax & Notes */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[13px] text-[var(--muted-foreground)]">
                      {tOrderModal("lblTaxPercent")}
                    </Label>
                    <NumericInput
                      value={poTaxPercent}
                      onValueChange={setPoTaxPercent}
                      placeholder="18"
                      allowDecimal
                      min={0}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[13px] text-[var(--muted-foreground)]">
                      {tOrderModal("lblNotes")}
                    </Label>
                    <Input
                      value={poNotes}
                      onChange={(e) => setPoNotes(e.target.value)}
                      placeholder={tOrderModal("placeholderNotes")}
                      className="glass-input h-[44px] px-3"
                    />
                  </div>
                </div>

                {/* Grand Total Preview */}
                {poItems.some((i) => i.quantity && i.unitPrice) && (
                  <div className="p-3 rounded-[12px] bg-[rgba(0,122,255,0.06)] border border-[var(--primary)]/20">
                    <div className="flex justify-between text-[13px] text-[var(--muted-foreground)]">
                      <span>{tOrderModal("lblSubtotal")}</span>
                      <span>
                        {formatCurrency(
                          poItems.reduce(
                            (a, i) =>
                              a +
                              parseNumericValue(i.quantity) *
                                parseNumericValue(i.unitPrice),
                            0
                          )
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between text-[13px] text-[var(--muted-foreground)] mt-1">
                      <span>
                        {tOrderModal("lblTaxWithPercent", { percent: poTaxPercent })}
                      </span>
                      <span>
                        {formatCurrency(
                          poItems.reduce(
                            (a, i) =>
                              a +
                              parseNumericValue(i.quantity) *
                                parseNumericValue(i.unitPrice),
                            0
                          ) *
                            (parseNumericValue(poTaxPercent, 18) / 100)
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between text-[17px] font-bold text-[var(--foreground)] mt-2 pt-2 border-t border-[var(--border)]">
                      <span>{tOrderModal("lblTotal")}</span>
                      <span className="text-[var(--primary)]">
                        {formatCurrency(
                          poItems.reduce(
                            (a, i) =>
                              a +
                              parseNumericValue(i.quantity) *
                                parseNumericValue(i.unitPrice),
                            0
                          ) *
                            (1 + parseNumericValue(poTaxPercent, 18) / 100)
                        )}
                      </span>
                    </div>
                  </div>
                )}

                {/* ── Add to Inventory Toggle ── */}
                <div
                  className={cn(
                    "p-3 rounded-[14px] border transition-all duration-200 cursor-pointer select-none",
                    addToInventory
                      ? "border-[#2563EB]/40 bg-blue-50 dark:bg-blue-950/30"
                      : "border-[var(--border)] bg-[var(--muted)]"
                  )}
                  onClick={() => setAddToInventory((v) => !v)}
                  role="switch"
                  aria-checked={addToInventory}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setAddToInventory((v) => !v);
                    }
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={cn(
                          "w-[32px] h-[32px] rounded-[8px] flex items-center justify-center transition-colors",
                          addToInventory
                            ? "bg-[#2563EB]/15 text-[#2563EB]"
                            : "bg-[var(--muted)] text-[var(--muted-foreground)]"
                        )}
                      >
                        <Package className="h-4 w-4" />
                      </div>
                      <div>
                        <span
                          className={cn(
                            "text-[13px] font-semibold block leading-[18px]",
                            addToInventory
                              ? "text-[#2563EB] dark:text-blue-400"
                              : "text-[var(--foreground)]"
                          )}
                        >
                          {tOrderModal("lblAddToInventory")}
                        </span>
                        <span className="text-[11px] text-[var(--muted-foreground)] leading-[14px] block">
                          {tOrderModal("lblAddToInventoryDesc")}
                        </span>
                      </div>
                    </div>
                    {/* Pill toggle */}
                    <div
                      className={cn(
                        "w-[42px] h-[24px] rounded-full p-[2px] transition-colors duration-200",
                        addToInventory ? "bg-[#2563EB]" : "bg-slate-300 dark:bg-[#1C2333]"
                      )}
                    >
                      <div
                        className={cn(
                          "w-[20px] h-[20px] rounded-full bg-white shadow-sm transition-transform duration-200",
                          addToInventory ? "translate-x-[18px]" : "translate-x-0"
                        )}
                      />
                    </div>
                  </div>
                  {addToInventory && (
                    <p className="text-[11px] text-[#2563EB]/70 dark:text-blue-400/70 mt-2 leading-[15px] pl-[42px]">
                      {tOrderModal("inventorySyncHintPrefix")}{" "}
                      <strong>{tOrderModal("inventorySyncHintNot")}</strong>{" "}
                      {tOrderModal("inventorySyncHintSuffix")}
                    </p>
                  )}
                </div>

                <DialogFooter className="pt-2">
                  <button
                    type="submit"
                    className="glow-btn w-full h-[50px] text-[17px] flex items-center justify-center gap-2"
                  >
                    <ShoppingCart className="h-5 w-5" />{" "}
                    {tOrderModal("btnCreatePO")}
                  </button>
                </DialogFooter>
              </form>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ════════════ NESTED ADD MATERIAL MODAL (inside PO flow) ════════════ */}
      <AddMaterialModal
        isOpen={isAddMaterialOpen}
        onClose={() => {
          setIsAddMaterialOpen(false);
          setAddMaterialTargetRow(null);
        }}
        formData={materialFormData}
        setFormData={setMaterialFormData}
        onSubmit={handleAddMaterialSubmit}
        isEditing={false}
        zIndex={1100}
      />
    </>
  );
}
