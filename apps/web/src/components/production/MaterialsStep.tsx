"use client";
import { useEffect, useState, useMemo } from "react";
import { Package, Plus, X, Search, RefreshCw, Save, FileDown, Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { NumericInput } from "@/components/ui/numeric-input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useMaterialsStep } from "@/lib/use-materials-step";
import type { InventoryItem, SelectedMaterial } from "@/lib/materials-types";

interface Props {
    inventory: InventoryItem[];
    productName: string;
    onMaterialsChange: (materials: SelectedMaterial[]) => void;
    initialMaterials?: SelectedMaterial[];
}

export function MaterialsStep({ inventory, productName, onMaterialsChange, initialMaterials }: Props) {
    const {
        materials, recentItems, templates, stockWarnings, preFill,
        inventoryLoading, liveInventory, totalEstCost, lowStockCount,
        refreshInventory, fetchRecent, fetchTemplates, fetchHistory,
        addMaterial, updateMaterial, removeMaterial, clearAll,
        saveTemplate, loadTemplate, deleteTemplate, getStockColor,
    } = useMaterialsStep(productName, inventory);

    const [materialSearch, setMaterialSearch] = useState("");
    const [showTemplateDialog, setShowTemplateDialog] = useState(false);
    const [templateName, setTemplateName] = useState("");
    const [showLoadTemplate, setShowLoadTemplate] = useState(false);

    // Fetch data on mount
    useEffect(() => {
        refreshInventory();
        fetchRecent();
        fetchTemplates();
    }, []);

    // Fetch history when productName is available
    useEffect(() => { fetchHistory(); }, [fetchHistory]);

    // Sync materials up to parent
    useEffect(() => { onMaterialsChange(materials); }, [materials]);

    // Recently used item IDs for sorting dropdown
    const recentIds = useMemo(() => new Set(recentItems.map((r) => r.inventoryItemId)), [recentItems]);

    // Filter inventory for dropdown
    const filteredInventory = useMemo(() => {
        let items = [...liveInventory];
        if (materialSearch.trim()) {
            const term = materialSearch.toLowerCase();
            items = items.filter((i) => i.name.toLowerCase().includes(term));
        }
        // Sort: recent first, then alphabetical
        items.sort((a, b) => {
            const aRecent = recentIds.has(a.id) ? 0 : 1;
            const bRecent = recentIds.has(b.id) ? 0 : 1;
            if (aRecent !== bRecent) return aRecent - bRecent;
            return a.name.localeCompare(b.name);
        });
        return items;
    }, [liveInventory, materialSearch, recentIds]);

    const handleSaveTemplate = async () => {
        if (!templateName.trim()) { toast.error("Enter a template name"); return; }
        const ok = await saveTemplate(templateName.trim());
        if (ok) { toast.success("Template saved!"); setShowTemplateDialog(false); setTemplateName(""); }
        else toast.error("Failed to save template");
    };

    // ─── Inline styles (dark glassmorphism) ───
    const cardStyle: React.CSSProperties = {
        background: "rgba(15,23,42,0.6)", backdropFilter: "blur(16px)",
        border: "1px solid rgba(99,102,241,0.15)", borderRadius: 16, padding: 16,
    };
    const bannerStyle: React.CSSProperties = {
        ...cardStyle, background: "rgba(99,102,241,0.08)",
        border: "1px solid rgba(99,102,241,0.25)", padding: "12px 16px",
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
    };
    const amberBanner: React.CSSProperties = {
        ...cardStyle, background: "rgba(234,179,8,0.08)",
        border: "1px solid rgba(234,179,8,0.25)", padding: "10px 14px", marginBottom: 8,
    };
    const rowStyle: React.CSSProperties = {
        ...cardStyle, padding: "12px 14px", marginBottom: 8,
        display: "flex", flexDirection: "column", gap: 8,
    };
    const summaryStyle: React.CSSProperties = {
        ...cardStyle, background: "rgba(15,23,42,0.8)",
        border: "1px solid rgba(99,102,241,0.2)",
    };
    const pillGreen: React.CSSProperties = {
        display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600,
        color: "#34d399", background: "rgba(52,211,153,0.1)", padding: "2px 8px", borderRadius: 20,
    };
    const pillAmber: React.CSSProperties = {
        ...pillGreen, color: "#fbbf24", background: "rgba(251,191,36,0.1)",
    };
    const pillRed: React.CSSProperties = {
        ...pillGreen, color: "#f87171", background: "rgba(248,113,113,0.1)",
    };

    return (
        <div className="space-y-4">
            {/* ─── Header ─── */}
            <div>
                <h2 className="text-lg font-bold mb-1">Materials</h2>
                <p className="text-sm text-muted-foreground">Select raw materials and quantities for this production.</p>
            </div>

            {/* ─── Pre-fill Banner ─── */}
            {preFill?.active && (
                <div style={bannerStyle}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#a5b4fc" }}>
                            📋 Materials pre-filled from {preFill.sourceBatchNumber || "past order"}
                        </div>
                        <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                            Last used: {preFill.sourceDate} · Same product: {preFill.sourceProductName} · {preFill.itemCount} items
                        </div>
                    </div>
                    <Button variant="outline" size="sm" className="rounded-lg text-xs h-8 shrink-0"
                        onClick={clearAll} style={{ borderColor: "rgba(99,102,241,0.3)", color: "#a5b4fc" }}>
                        Clear & Start Fresh
                    </Button>
                </div>
            )}

            {/* ─── Adjustment warnings ─── */}
            {preFill?.adjustments && preFill.adjustments.length > 0 && (
                <div style={amberBanner}>
                    {preFill.adjustments.map((adj, i) => (
                        <div key={i} style={{ fontSize: 12, color: "#fbbf24", display: "flex", alignItems: "center", gap: 6 }}>
                            <AlertTriangle style={{ width: 14, height: 14, flexShrink: 0 }} /> ⚠️ {adj} — current stock insufficient
                        </div>
                    ))}
                </div>
            )}

            {/* ─── Action bar ─── */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Raw Materials</Label>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <Button variant="outline" size="sm" className="rounded-lg h-8 text-xs gap-1" onClick={() => setShowLoadTemplate(true)}
                        style={{ borderColor: "rgba(99,102,241,0.2)" }}>
                        <FileDown className="h-3 w-3" /> Load Template
                    </Button>
                    <Button variant="outline" size="sm" className="rounded-lg h-8 text-xs gap-1"
                        onClick={() => refreshInventory()} disabled={inventoryLoading}
                        style={{ borderColor: "rgba(99,102,241,0.2)" }}>
                        <RefreshCw className={`h-3 w-3 ${inventoryLoading ? "animate-spin" : ""}`} /> Refresh Stock
                    </Button>
                    <Button variant="outline" size="sm" className="rounded-lg h-8 text-xs gap-1" onClick={addMaterial}
                        style={{ borderColor: "rgba(99,102,241,0.3)", color: "#a5b4fc" }}>
                        <Plus className="h-3 w-3" /> Add Material
                    </Button>
                </div>
            </div>

            {/* ─── Materials List ─── */}
            {inventoryLoading && materials.length === 0 ? (
                <div className="space-y-3">
                    {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
                </div>
            ) : materials.length === 0 ? (
                <div style={{ ...cardStyle, textAlign: "center", padding: "40px 16px", borderStyle: "dashed", borderWidth: 2, borderColor: "rgba(99,102,241,0.15)" }}>
                    <Package style={{ width: 28, height: 28, margin: "0 auto 8px", color: "#64748b" }} />
                    <p style={{ fontSize: 13, color: "#94a3b8" }}>
                        {preFill === null ? "No previous orders found for this product. Add materials manually." : "Add raw materials needed for production"}
                    </p>
                </div>
            ) : (
                <div className="space-y-2">
                    {materials.map((mat, idx) => {
                        const inv = liveInventory.find((i) => i.id === mat.inventoryId);
                        const available = inv?.quantity ?? mat.availableStock;
                        const color = mat.quantityUsed > 0 ? getStockColor(mat.quantityUsed, available) : "green";
                        const warning = stockWarnings.find((w) => w.index === idx);
                        return (
                            <div key={idx} style={rowStyle}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <Select value={mat.inventoryId} onValueChange={(v) => updateMaterial(idx, "inventoryId", v)}>
                                            <SelectTrigger className="h-9 bg-card/50" style={{ borderColor: "rgba(99,102,241,0.15)" }}>
                                                <SelectValue placeholder="Select material..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <div className="px-2 py-1.5">
                                                    <div className="relative">
                                                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                                        <Input placeholder="Search materials..." className="h-8 pl-8 text-xs"
                                                            value={materialSearch} onChange={(e) => setMaterialSearch(e.target.value)} />
                                                    </div>
                                                </div>
                                                {recentIds.size > 0 && !materialSearch && (
                                                    <div className="px-2 py-1">
                                                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Recently Used</span>
                                                    </div>
                                                )}
                                                {filteredInventory.map((item) => (
                                                    <SelectItem key={item.id} value={item.id} disabled={item.quantity <= 0}>
                                                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                            {recentIds.has(item.id) && !materialSearch && (
                                                                <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#818cf8", flexShrink: 0 }} />
                                                            )}
                                                            <span>{item.name}</span>
                                                            <span style={{ fontSize: 10, color: "#64748b" }}>
                                                                {item.quantity}{item.unit}
                                                            </span>
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0"
                                        onClick={() => removeMaterial(idx)}
                                        style={{ color: "#f87171" }}>
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                    <div style={{ width: 90, flexShrink: 0 }}>
                                        <NumericInput className="h-9 bg-card/50 font-semibold text-center rounded-lg"
                                            style={{ borderColor: warning ? "rgba(248,113,113,0.5)" : "rgba(99,102,241,0.15)" }}
                                            value={mat.quantityUsed || ""} placeholder="0"
                                            onValueChange={(v) => updateMaterial(idx, "quantityUsed", v)}
                                            allowDecimal={["L", "ml", "l"].includes(mat.unit)} min={0} />
                                    </div>
                                    {mat.unit && <span style={{ fontSize: 11, color: "#94a3b8", flexShrink: 0 }}>{mat.unit}</span>}
                                    {mat.inventoryId && (
                                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: "auto" }}>
                                            <span style={{ fontSize: 11, color: "#94a3b8" }}>
                                                Stock: {available}{mat.unit}
                                            </span>
                                            <span style={color === "green" ? pillGreen : color === "amber" ? pillAmber : pillRed}>
                                                {color === "green" ? "🟢" : color === "amber" ? "🟡" : "🔴"}
                                                {color === "red" && ` Only ${available}${mat.unit}`}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                {warning && (
                                    <div style={{ fontSize: 11, color: "#f87171", display: "flex", alignItems: "center", gap: 4 }}>
                                        <AlertTriangle style={{ width: 12, height: 12 }} /> {warning.message}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ─── Summary Card ─── */}
            {materials.length > 0 && materials.some((m) => m.inventoryId) && (
                <div style={summaryStyle}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "#94a3b8", textTransform: "uppercase" }}>
                            Materials Summary
                        </span>
                        <Badge variant="outline" className="text-[9px]">{materials.filter((m) => m.inventoryId).length} items</Badge>
                    </div>
                    <div style={{ borderTop: "1px solid rgba(99,102,241,0.1)", paddingTop: 8 }}>
                        {materials.filter((m) => m.inventoryId).map((m, i) => (
                            <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 12 }}>
                                <span style={{ color: "#cbd5e1" }}>{m.name}</span>
                                <span style={{ fontWeight: 600, color: "#e2e8f0" }}>{m.quantityUsed}{m.unit}</span>
                            </div>
                        ))}
                    </div>
                    <div style={{ borderTop: "1px solid rgba(99,102,241,0.1)", marginTop: 4, paddingTop: 8 }}>
                        {totalEstCost > 0 && (
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                                <span style={{ color: "#94a3b8" }}>Est. Cost</span>
                                <span style={{ fontWeight: 600, color: "#a5b4fc" }}>{"\u20B9"}{totalEstCost.toLocaleString("en-IN")}</span>
                            </div>
                        )}
                        {lowStockCount > 0 && (
                            <div style={{ fontSize: 11, color: "#fbbf24", display: "flex", alignItems: "center", gap: 4 }}>
                                <AlertTriangle style={{ width: 12, height: 12 }} />
                                ⚠️ {lowStockCount} item{lowStockCount > 1 ? "s" : ""} low stock
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ─── Template Actions ─── */}
            {materials.length > 0 && (
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <Button variant="outline" size="sm" className="rounded-lg h-8 text-xs gap-1"
                        onClick={() => { setShowTemplateDialog(true); setTemplateName(""); }}
                        style={{ borderColor: "rgba(99,102,241,0.2)" }}>
                        <Save className="h-3 w-3" /> Save as Template
                    </Button>
                </div>
            )}

            {/* ─── Save Template Dialog (inline) ─── */}
            {showTemplateDialog && (
                <div style={{ ...cardStyle, border: "1px solid rgba(99,102,241,0.3)" }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0", marginBottom: 8 }}>Save as Template</p>
                    <Input placeholder="Template name..." value={templateName} onChange={(e) => setTemplateName(e.target.value)}
                        className="h-9 mb-3 bg-card/50" style={{ borderColor: "rgba(99,102,241,0.2)" }} />
                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                        <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setShowTemplateDialog(false)}>Cancel</Button>
                        <Button size="sm" className="h-8 text-xs rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white" onClick={handleSaveTemplate}>
                            Save
                        </Button>
                    </div>
                </div>
            )}

            {/* ─── Load Template Dropdown (inline) ─── */}
            {showLoadTemplate && (
                <div style={{ ...cardStyle, border: "1px solid rgba(99,102,241,0.3)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0" }}>Load Template</p>
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowLoadTemplate(false)}>Close</Button>
                    </div>
                    {templates.length === 0 ? (
                        <p style={{ fontSize: 12, color: "#64748b", textAlign: "center", padding: "16px 0" }}>No templates saved yet</p>
                    ) : (
                        <ScrollArea className="max-h-[200px]">
                            <div className="space-y-2">
                                {templates.map((t) => (
                                    <div key={t.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
                                        padding: "8px 12px", borderRadius: 10, background: "rgba(99,102,241,0.06)",
                                        border: "1px solid rgba(99,102,241,0.12)", cursor: "pointer" }}
                                        onClick={() => {
                                            if (confirm(`Load template "${t.name}"? This will replace current materials.`)) {
                                                loadTemplate(t); setShowLoadTemplate(false);
                                                toast.success(`Template "${t.name}" loaded`);
                                            }
                                        }}>
                                        <div>
                                            <div style={{ fontSize: 12, fontWeight: 600, color: "#e2e8f0" }}>{t.name}</div>
                                            <div style={{ fontSize: 10, color: "#64748b" }}>{t.items.length} items{t.productName ? ` · ${t.productName}` : ""}</div>
                                        </div>
                                        <Button variant="ghost" size="icon" className="h-7 w-7" style={{ color: "#f87171" }}
                                            onClick={(e) => { e.stopPropagation(); deleteTemplate(t.id); }}>
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    )}
                </div>
            )}
        </div>
    );
}
