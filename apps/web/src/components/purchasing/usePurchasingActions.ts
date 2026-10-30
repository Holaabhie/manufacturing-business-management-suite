import { useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { playCompletionSound } from "@/hooks/useCompletionSound";
import { parseNumericValue } from "@/components/ui/numeric-input";
import type {
  Vendor,
  PurchaseOrder,
  InventoryItem,
  VendorFormData,
  VendorFormErrors,
  POItemDraft,
} from "./types";

interface UsePurchasingActionsProps {
  vendors: Vendor[];
  inventoryItems: InventoryItem[];
  fetchOrders: () => Promise<void>;
  fetchVendors: () => Promise<void>;
  fetchInventory: () => Promise<void>;
  fetchStats: () => Promise<void>;
}

export const emptyVendorForm: VendorFormData = {
  name: "",
  contactPerson: "",
  phone: "",
  email: "",
  address: "",
  gstin: "",
};

export function usePurchasingActions({
  vendors,
  inventoryItems,
  fetchOrders,
  fetchVendors,
  fetchInventory,
  fetchStats,
}: UsePurchasingActionsProps) {
  const tToast = useTranslations("purchasing.toasts");
  const tVendorModal = useTranslations("purchasing.vendorModal");

  // Modal dialog states
  const [isVendorDialogOpen, setIsVendorDialogOpen] = useState(false);
  const [isPODialogOpen, setIsPODialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  // Selected targets
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "order" | "vendor";
    id: string;
  } | null>(null);
  const [detailOrder, setDetailOrder] = useState<PurchaseOrder | null>(null);
  const [paymentPO, setPaymentPO] = useState<PurchaseOrder | null>(null);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);

  // Vendor form
  const [vendorForm, setVendorForm] = useState<VendorFormData>(emptyVendorForm);
  const [vendorErrors, setVendorErrors] = useState<VendorFormErrors>({});
  const [isSubmittingVendor, setIsSubmittingVendor] = useState(false);

  // PO form
  const [poVendorId, setPoVendorId] = useState("");
  const [poNotes, setPoNotes] = useState("");
  const [poTaxPercent, setPoTaxPercent] = useState("18");
  const [poItems, setPoItems] = useState<POItemDraft[]>([]);
  const [addToInventory, setAddToInventory] = useState(false);

  const openNewPO = () => {
    setPoVendorId("");
    setPoNotes("");
    setPoTaxPercent("18");
    setPoItems([
      {
        inventoryItemId: "",
        materialName: "",
        quantity: "",
        unit: "kg",
        unitPrice: "",
      },
    ]);
    setAddToInventory(false);
    setIsPODialogOpen(true);
  };

  const addPOItem = () => {
    setPoItems((prev) => [
      ...prev,
      {
        inventoryItemId: "",
        materialName: "",
        quantity: "",
        unit: "kg",
        unitPrice: "",
      },
    ]);
  };

  const removePOItem = (index: number) => {
    setPoItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updatePOItem = (index: number, field: string, value: string) => {
    setPoItems((prev) => {
      const updated = [...prev];
      const target = { ...updated[index] };
      if (field === "inventoryItemId") target.inventoryItemId = value;
      else if (field === "materialName") target.materialName = value;
      else if (field === "quantity") target.quantity = value;
      else if (field === "unit") target.unit = value;
      else if (field === "unitPrice") target.unitPrice = value;

      // Auto-fill from inventory
      if (field === "inventoryItemId" && value) {
        const item = inventoryItems.find((i) => i.id === value);
        if (item) {
          target.materialName = item.name;
          target.unit = item.unit;
          target.unitPrice = String(
            item.purchaseCostPerUnit || item.purchase_cost_per_unit || 0
          );
        }
      }
      updated[index] = target;
      return updated;
    });
  };

  const handleVendorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: VendorFormErrors = {};

    if (!vendorForm.name.trim()) {
      errs.name = tVendorModal("errNameRequired");
    }

    if (!vendorForm.contactPerson.trim()) {
      errs.contactPerson = tVendorModal("errContactRequired");
    }

    const cleanPhone = vendorForm.phone.replace(/[\s\-\+]/g, "");
    if (!cleanPhone) {
      errs.phone = tVendorModal("errPhoneRequired");
    } else {
      const digits =
        cleanPhone.startsWith("91") && cleanPhone.length === 12
          ? cleanPhone.slice(2)
          : cleanPhone;
      if (!/^[6-9]\d{9}$/.test(digits)) {
        errs.phone = tVendorModal("errPhoneInvalid");
      }
    }

    if (
      vendorForm.email.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(vendorForm.email.trim())
    ) {
      errs.email = tVendorModal("errEmailInvalid");
    }

    const cleanGstin = vendorForm.gstin.trim().toUpperCase();
    if (
      cleanGstin &&
      !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(
        cleanGstin
      )
    ) {
      errs.gstin = tVendorModal("errGstinInvalid");
    }

    if (Object.keys(errs).length > 0) {
      setVendorErrors(errs);
      return;
    }

    setVendorErrors({});
    setIsSubmittingVendor(true);
    try {
      const res = await fetch("/api/purchasing/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...vendorForm,
          phone:
            cleanPhone.startsWith("91") && cleanPhone.length === 12
              ? `+${cleanPhone}`
              : cleanPhone.length === 10
              ? `+91${cleanPhone}`
              : vendorForm.phone.trim(),
          gstin: cleanGstin,
          email: vendorForm.email.trim(),
          address: vendorForm.address.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(tToast("vendorAdded"));
        setIsVendorDialogOpen(false);
        setVendorForm(emptyVendorForm);
        setVendorErrors({});
        fetchVendors();
      } else {
        toast.error(data.error || tToast("addVendorFailed"));
      }
    } catch {
      toast.error(tToast("addVendorFailed"));
    } finally {
      setIsSubmittingVendor(false);
    }
  };

  const handlePOSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!poVendorId) {
      toast.error(tToast("selectVendor"));
      return;
    }
    if (poItems.length === 0 || !poItems[0].inventoryItemId) {
      toast.error(tToast("addMaterialMin"));
      return;
    }

    const vendor = vendors.find((v) => v.id === poVendorId);

    const payload = {
      vendorId: poVendorId,
      vendorName: vendor?.name || "",
      taxPercent: parseNumericValue(poTaxPercent, 18),
      notes: poNotes,
      addToInventory,
      items: poItems
        .filter((item) => item.inventoryItemId)
        .map((item) => ({
          inventoryItemId: item.inventoryItemId,
          materialName: item.materialName,
          quantity: parseNumericValue(item.quantity),
          unit: item.unit,
          unitPrice: parseNumericValue(item.unitPrice),
        })),
    };

    try {
      const res = await fetch("/api/purchasing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(
          data.inventorySynced
            ? "Purchase order created & materials added to inventory"
            : "Purchase order created"
        );
        setIsPODialogOpen(false);
        fetchOrders();
        if (data.inventorySynced) fetchInventory();
      } else {
        toast.error(data.error || tToast("createPOFailed"));
      }
    } catch {
      toast.error(tToast("createPOFailed"));
    }
  };

  const handleStatusChange = async (
    orderId: string,
    newStatus: "Received"
  ) => {
    try {
      const res = await fetch(`/api/purchasing/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(tToast("orderReceived"));
        playCompletionSound("general");
        fetchOrders();
        fetchStats();
        if (newStatus === "Received") fetchInventory();
      } else {
        toast.error(data.error || tToast("updateStatusFailed"));
      }
    } catch {
      toast.error(tToast("updateStatusFailed"));
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const url =
        deleteTarget.type === "order"
          ? `/api/purchasing/${deleteTarget.id}`
          : `/api/purchasing/vendors/${deleteTarget.id}`;
      const res = await fetch(url, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        toast.success(tToast("deleteSuccess"));
        if (deleteTarget.type === "order") fetchOrders();
        else fetchVendors();
      } else {
        toast.error(data.error || tToast("deleteFailed"));
      }
    } catch {
      toast.error(tToast("deleteFailed"));
    } finally {
      setIsDeleteDialogOpen(false);
      setDeleteTarget(null);
    }
  };

  return {
    isVendorDialogOpen,
    setIsVendorDialogOpen,
    isPODialogOpen,
    setIsPODialogOpen,
    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
    isDetailDialogOpen,
    setIsDetailDialogOpen,
    isPaymentModalOpen,
    setIsPaymentModalOpen,
    deleteTarget,
    setDeleteTarget,
    detailOrder,
    setDetailOrder,
    paymentPO,
    setPaymentPO,
    selectedVendor,
    setSelectedVendor,
    vendorForm,
    setVendorForm,
    vendorErrors,
    setVendorErrors,
    isSubmittingVendor,
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
    openNewPO,
    addPOItem,
    removePOItem,
    updatePOItem,
    handleVendorSubmit,
    handlePOSubmit,
    handleStatusChange,
    handleDelete,
  };
}
