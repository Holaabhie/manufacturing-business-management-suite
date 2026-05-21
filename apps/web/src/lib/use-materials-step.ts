"use client";
import { useState, useCallback, useRef, useEffect } from "react";
import type {
    InventoryItem, SelectedMaterial, MaterialHistoryResponse,
    RecentMaterial, MaterialTemplate, StockWarning, PreFillInfo,
} from "@/lib/materials-types";

export function useMaterialsStep(productName: string, inventory: InventoryItem[]) {
    const [materials, setMaterials] = useState<SelectedMaterial[]>([]);
    const [recentItems, setRecentItems] = useState<RecentMaterial[]>([]);
    const [templates, setTemplates] = useState<MaterialTemplate[]>([]);
    const [stockWarnings, setStockWarnings] = useState<StockWarning[]>([]);
    const [preFill, setPreFill] = useState<PreFillInfo | null>(null);
    const [inventoryLoading, setInventoryLoading] = useState(false);
    const [liveInventory, setLiveInventory] = useState<InventoryItem[]>(inventory);
    const debounceRef = useRef<Record<number, NodeJS.Timeout>>({});
    const hasFetchedHistory = useRef(false);

    // Refresh inventory from API
    const refreshInventory = useCallback(async () => {
        setInventoryLoading(true);
        try {
            const res = await fetch("/api/inventory");
            if (res.ok) {
                const data = await res.json();
                setLiveInventory(Array.isArray(data) ? data : []);
            }
        } catch { /* silent */ } finally {
            setInventoryLoading(false);
        }
    }, []);

    // Fetch recent materials
    const fetchRecent = useCallback(async () => {
        try {
            const res = await fetch("/api/production/materials/recent");
            if (res.ok) setRecentItems(await res.json());
        } catch { /* silent */ }
    }, []);

    // Fetch templates
    const fetchTemplates = useCallback(async () => {
        try {
            const res = await fetch("/api/production/templates");
            if (res.ok) setTemplates(await res.json());
        } catch { /* silent */ }
    }, []);

    // Fetch material history for pre-fill
    const fetchHistory = useCallback(async () => {
        if (!productName || hasFetchedHistory.current) return;
        hasFetchedHistory.current = true;
        try {
            const res = await fetch(
                `/api/production/materials/history?productName=${encodeURIComponent(productName)}`
            );
            if (!res.ok) return;
            const data: MaterialHistoryResponse = await res.json();
            if (!data.matched || data.materials.length === 0) return;

            const adjustments: string[] = [];
            const preFilled: SelectedMaterial[] = data.materials.map((m) => {
                const inv = liveInventory.find((i) => i.id === m.inventoryItemId);
                const available = inv?.quantity ?? 0;
                let qty = m.quantityUsed;
                if (inv && qty > available) {
                    adjustments.push(
                        `${m.itemName} reduced to ${available}${m.unit} (was ${qty}${m.unit})`
                    );
                    qty = available;
                }
                return {
                    inventoryId: m.inventoryItemId,
                    name: m.itemName,
                    quantityUsed: qty,
                    unit: m.unit,
                    availableStock: available,
                    unitCost: inv?.purchase_cost_per_unit || 0,
                };
            });

            setMaterials(preFilled);
            setPreFill({
                active: true,
                sourceBatchNumber: data.sourceBatchNumber || "",
                sourceProductName: data.sourceProductName || "",
                sourceDate: data.sourceCompletedAt
                    ? new Date(data.sourceCompletedAt).toLocaleDateString("en-IN", {
                          day: "numeric", month: "short",
                      })
                    : "",
                itemCount: preFilled.length,
                adjustments,
            });
        } catch { /* silent */ }
    }, [productName, liveInventory]);

    // Stock check with debounce
    const checkStock = useCallback((index: number, qty: number) => {
        if (debounceRef.current[index]) clearTimeout(debounceRef.current[index]);
        debounceRef.current[index] = setTimeout(() => {
            const mat = materials[index];
            if (!mat) return;
            const inv = liveInventory.find((i) => i.id === mat.inventoryId);
            if (!inv) return;
            setStockWarnings((prev) => {
                const filtered = prev.filter((w) => w.index !== index);
                if (qty > inv.quantity) {
                    return [...filtered, {
                        index, type: "over" as const,
                        message: `Only ${inv.quantity}${inv.unit} available (need ${qty}${inv.unit})`,
                    }];
                }
                return filtered;
            });
        }, 400);
    }, [materials, liveInventory]);

    // Material CRUD
    const addMaterial = useCallback(() => {
        setMaterials((prev) => [
            ...prev,
            { inventoryId: "", name: "", quantityUsed: 0, unit: "", availableStock: 0 },
        ]);
    }, []);

    const updateMaterial = useCallback((index: number, field: string, value: any) => {
        setMaterials((prev) => {
            const updated = [...prev];
            if (field === "inventoryId") {
                const item = liveInventory.find((i) => i.id === value);
                if (item) {
                    updated[index] = {
                        inventoryId: value, name: item.name, quantityUsed: 0,
                        unit: item.unit, availableStock: item.quantity,
                        unitCost: item.purchase_cost_per_unit || 0,
                    };
                }
            } else if (field === "quantityUsed") {
                updated[index] = { ...updated[index], quantityUsed: Number(value) || 0 };
                checkStock(index, Number(value) || 0);
            } else {
                (updated[index] as any)[field] = value;
            }
            return updated;
        });
    }, [liveInventory, checkStock]);

    const removeMaterial = useCallback((index: number) => {
        setMaterials((prev) => prev.filter((_, i) => i !== index));
        setStockWarnings((prev) => prev.filter((w) => w.index !== index));
    }, []);

    const clearAll = useCallback(() => {
        setMaterials([]);
        setPreFill(null);
        setStockWarnings([]);
    }, []);

    // Template operations
    const saveTemplate = useCallback(async (name: string) => {
        if (materials.length === 0) return;
        try {
            const res = await fetch("/api/production/templates", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name, productName,
                    items: materials.map((m) => ({
                        inventoryItemId: m.inventoryId, itemName: m.name,
                        quantity: m.quantityUsed, unit: m.unit,
                    })),
                }),
            });
            if (res.ok) { await fetchTemplates(); return true; }
        } catch { /* silent */ }
        return false;
    }, [materials, productName, fetchTemplates]);

    const loadTemplate = useCallback((template: MaterialTemplate) => {
        const loaded: SelectedMaterial[] = template.items.map((item) => {
            const inv = liveInventory.find((i) => i.id === item.inventoryItemId);
            return {
                inventoryId: item.inventoryItemId, name: item.itemName,
                quantityUsed: item.quantity, unit: item.unit,
                availableStock: inv?.quantity ?? 0,
                unitCost: inv?.purchase_cost_per_unit || 0,
            };
        });
        setMaterials(loaded);
        setPreFill(null);
        setStockWarnings([]);
    }, [liveInventory]);

    const deleteTemplate = useCallback(async (id: string) => {
        try {
            await fetch(`/api/production/templates/${id}`, { method: "DELETE" });
            await fetchTemplates();
        } catch { /* silent */ }
    }, [fetchTemplates]);

    // Get stock indicator color
    const getStockColor = useCallback((required: number, available: number) => {
        if (available > required * 2) return "green";
        if (available >= required) return "amber";
        return "red";
    }, []);

    // Summary computations
    const totalEstCost = materials.reduce(
        (sum, m) => sum + m.quantityUsed * (m.unitCost || 0), 0
    );
    const lowStockCount = materials.filter((m) => {
        const inv = liveInventory.find((i) => i.id === m.inventoryId);
        return inv && m.quantityUsed > inv.quantity;
    }).length;

    // Sync liveInventory when prop changes
    useEffect(() => { setLiveInventory(inventory); }, [inventory]);

    return {
        materials, setMaterials, recentItems, templates, stockWarnings,
        preFill, inventoryLoading, liveInventory, totalEstCost, lowStockCount,
        refreshInventory, fetchRecent, fetchTemplates, fetchHistory,
        addMaterial, updateMaterial, removeMaterial, clearAll,
        saveTemplate, loadTemplate, deleteTemplate, getStockColor,
    };
}
