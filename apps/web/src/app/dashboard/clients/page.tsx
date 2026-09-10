"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useAppLocale } from "@/components/LocaleProvider";
import {
  Plus,
  Search,
  MoreVertical,
  Edit2,
  Trash2,
  Mail,
  Phone,
  MapPin,
  X,
  Download,
  History,
  Package,
  Save,
  MessageSquare,
  ChevronRight,
  User,
  ExternalLink,
  ShoppingCart,
  Loader2,
  ChevronDown,
  ChevronUp,
  IndianRupee
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  IOSCard,
  IOSCardHeader,
  IOSCardContent,
  IOSButton,
  IOSInput,
  IOSBadge,
  IOSSearchBar,
} from "@/components/ui/ios";
import { motion } from "framer-motion";
import { staggerContainer, staggerItem } from "@/styles/animations";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

import { Skeleton } from "@/components/ui/skeleton";
import { useRole } from "@/lib/hooks/use-role";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ReadOnlyBanner } from "@/components/AccessDenied";
import { generateDataExportPDF } from "@/lib/pdf-generator";
import { NumericInput } from "@/components/ui/numeric-input";
import { EmptyState } from "@/components/ui/EmptyState";
import { useCachedPage } from "@/hooks/useCachedPage";
import { ConfirmDeleteSheet } from "@/components/ui/ConfirmDeleteSheet";

export default function ClientsPage() {
  const t = useTranslations("clients");
  const { locale } = useAppLocale();
  const dateLocale = locale === "hi" ? "hi-IN" : locale === "gu" ? "gu-IN" : locale === "mr" ? "mr-IN" : "en-IN";
  const { isAdmin, isPro } = useRole();
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [isDeleteDialogOpenConfirm, setIsDeleteDialogOpenConfirm] = useState(false);
  const [clientToDeleteId, setClientToDeleteId] = useState<string | null>(null);
  const [restoredFromCache, setRestoredFromCache] = useState(false);
  const restoredFromCacheRef = useRef(false);

  // ── Cache persistence ──
  const { restoreState, persist, scrollYRef, containerRef: cachedScrollRef, restoreScroll } = useCachedPage({
    pageKey: "clients",
    maxAgeMs: 5 * 60 * 1000,
  });

  // Restore cached state on mount (runs before first fetch)
  useEffect(() => {
    const cached = restoreState();
    if (cached) {
      if (cached.searchTerm !== undefined) setSearchTerm(cached.searchTerm as string);
      if (cached.selectedClient) setSelectedClient(cached.selectedClient as any);
      if (cached.clients && (cached.clients as any[]).length > 0) {
        setClients(cached.clients as any[]);
        setLoading(false);
        setRestoredFromCache(true);
        restoredFromCacheRef.current = true;
      }
      if (typeof cached.scrollY === "number" && cached.scrollY > 0) {
        restoreScroll(cached.scrollY);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist state on unmount
  const stateRef = useRef({ clients, searchTerm, selectedClient });
  useEffect(() => {
    stateRef.current = { clients, searchTerm, selectedClient };
  });
  useEffect(() => {
    return () => {
      persist({ ...stateRef.current, scrollY: scrollYRef.current });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const starterLimit = 5;
  const isAtLimit = !isPro && clients.length >= starterLimit;

  const handleAddNewClick = () => {
    if (isAtLimit) {
      toast.error(`Starter tier limit reached (${starterLimit} clients). Please upgrade to Pro for unlimited CRM capacity.`, {
        action: {
          label: "Upgrade",
          onClick: () => window.location.href = "/dashboard/upgrade"
        }
      });
      return;
    }
    setIsDialogOpen(true);
  };

  const exportToPDF = () => {
    const headers = [t("lblName"), t("lblCompany"), t("lblEmail"), t("lblPhone"), t("lblAddress")];
    const rows = clients.map(client => [
      client.name || "—",
      client.company || "—",
      client.email || "—",
      client.phone || "—",
      client.address || "—"
    ]);

    generateDataExportPDF({
      title: "Clients Directory",
      subtitle: "Complete list of all registered clients",
      headers,
      rows,
      filename: `clients_${new Date().toISOString().split('T')[0]}.pdf`,
    });
    toast.success(t("toasts.pdfDownloaded"));
  };

    // Products, Materials and Orders for selected client
  const [clientProducts, setClientProducts] = useState<any[]>([]);
  const [productMaterials, setProductMaterials] = useState<Record<string, any[]>>({});
  const [expandedProducts, setExpandedProducts] = useState<string[]>([]);
  const [clientOrders, setClientOrders] = useState<any[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [loadingMaterials, setLoadingMaterials] = useState<Record<string, boolean>>({});
  const [avatarUploading, setAvatarUploading] = useState(false);

  // New Client Form
  const [formData, setFormData] = useState({ name: "", company: "", email: "", phone: "", address: "", customerSince: new Date().toISOString().split("T")[0] });

  // Edit Client Form
  const [editData, setEditData] = useState({ name: "", company: "", email: "", phone: "", address: "", customerSince: "" });

  // Product Form
  const [productForm, setProductForm] = useState({ name: "", defaultRate: "" });

  // Material Form
  const [materialForm, setMaterialForm] = useState({ productId: "", name: "", type: "", defaultQty: "" });

  const fetchClients = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const res = await fetch("/api/clients");
      const data = await res.json();
      if (data.error) toast.error(t("toasts.fetchFailed"));
      else setClients(data || []);
    } catch (error) {
      toast.error(t("toasts.fetchFailed"));
    } finally {
      if (showLoading) setLoading(false);
    }
  };

    const fetchClientDetails = async (client: any) => {
    setLoadingDetails(true);
    try {
      const [productsRes, ordersRes] = await Promise.all([
        fetch(`/api/v1/clients/${client.id}/products`).then(r => r.json()),
        fetch(`/api/v1/orders?clientId=${client.id}`).then(r => r.json())
      ]);

      if (productsRes.error) throw new Error(productsRes.error.message);
      if (ordersRes.error) throw new Error(ordersRes.error.message);

      const filteredOrders = ordersRes.data || [];

      setClientProducts(productsRes.data || []);
      setClientOrders(filteredOrders);
      setExpandedProducts([]);
    } catch (error) {
      toast.error(t("toasts.fetchDetailsFailed"));
    } finally {
      setLoadingDetails(false);
    }
  };

  const fetchMaterialsForProduct = async (productId: string) => {
    if (!selectedClient) return;
    setLoadingMaterials(prev => ({ ...prev, [productId]: true }));
    try {
      const res = await fetch(`/api/v1/clients/${selectedClient.id}/products/${productId}/materials`);
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      setProductMaterials(prev => ({ ...prev, [productId]: json.data || [] }));
    } catch (error) {
      toast.error(t("toasts.fetchMaterialsFailed"));
    } finally {
      setLoadingMaterials(prev => ({ ...prev, [productId]: false }));
    }
  };

  const toggleProductExpand = (productId: string) => {
    setExpandedProducts(prev => {
      const isExpanded = prev.includes(productId);
      if (!isExpanded && !productMaterials[productId]) {
        fetchMaterialsForProduct(productId);
      }
      return isExpanded ? prev.filter(id => id !== productId) : [...prev, productId];
    });
  };

  useEffect(() => {
    // Use ref (not state) to avoid stale-closure: state hasn't updated yet in this render frame
    fetchClients(!restoredFromCacheRef.current);
    const interval = setInterval(() => fetchClients(false), 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedClient) {
      fetchClientDetails(selectedClient);
    }
  }, [selectedClient?.id]);

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();

      if (data.error) toast.error(t("toasts.createFailed"));
      else {
        toast.success(t("toasts.created"));
        fetchClients();
        setIsDialogOpen(false);
        setFormData({ name: "", company: "", email: "", phone: "", address: "", customerSince: new Date().toISOString().split("T")[0] });
        handleSelectClient(data);
      }
    } catch (error) {
      toast.error(t("toasts.createFailed"));
    }
  };

  const handleUpdateClient = async () => {
    if (!selectedClient) return;

    try {
      const res = await fetch(`/api/clients/${selectedClient.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editData),
      });
      const data = await res.json();

      if (data.error) toast.error(t("toasts.updateFailed"));
      else {
        toast.success(t("toasts.updated"));
        fetchClients();
      }
    } catch (error) {
      toast.error(t("toasts.updateFailed"));
    }
  };

  const handleDeleteClient = async (id: string) => {
    try {
      const res = await fetch(`/api/clients/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (data.error) toast.error(t("toasts.deleteFailed"));
      else {
        toast.success(t("toasts.deleted"));
        if (selectedClient?.id === id) setSelectedClient(null);
        fetchClients();
      }
    } catch (error) {
      toast.error(t("toasts.deleteFailed"));
    } finally {
      setIsDeleteDialogOpenConfirm(false);
      setClientToDeleteId(null);
    }
  };

  const handleSelectClient = (client: any) => {
    setSelectedClient(client);
    setEditData({
      name: client.name, customerSince: client.createdAt ? new Date(client.createdAt).toISOString().split("T")[0] : "",
      company: client.company || "",
      email: client.email || "",
      phone: client.phone || "",
      address: client.address || ""
    });
    fetchClientDetails(client);
    // Lazy-load avatar from single-client endpoint (not included in list fetch to avoid payload bloat)
    fetch(`/api/v1/clients/${client.id}`)
      .then(r => r.ok ? r.json() : null)
      .then(res => {
        if (res?.data?.avatarUrl) {
          setSelectedClient((prev: any) => prev?.id === client.id ? { ...prev, avatarUrl: res.data.avatarUrl } : prev);
        }
      })
      .catch(() => { /* avatar fetch is best-effort */ });
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) return;
    try {
      const res = await fetch(`/api/v1/clients/${selectedClient.id}/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: productForm.name, defaultRate: Number(productForm.defaultRate) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.error) {
        toast.error(data?.error?.message || data?.error || "Failed to add product");
      } else {
        toast.success(t("toasts.productAdded"));
        setProductForm({ name: "", defaultRate: "" });
        fetchClientDetails(selectedClient);
      }
    } catch (error) {
      toast.error(t("toasts.productAddFailed"));
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!selectedClient) return;
    try {
      const res = await fetch(`/api/v1/clients/products/${productId}`, {
        method: "DELETE",
      });
      if (res.ok || res.status === 404) {
        toast.success(t("toasts.productDeleted"));
        setClientProducts((prev) => prev.filter((p) => p.id !== productId));
        fetchClientDetails(selectedClient);
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data?.error?.message || data?.error || "Failed to delete product");
      }
    } catch (error) {
      toast.error(t("toasts.productDeleteFailed"));
    }
  };

  const handleAddMaterial = async (e: React.FormEvent, productId: string) => {
    e.preventDefault();
    if (!selectedClient) return;
    try {
      const res = await fetch(`/api/v1/clients/${selectedClient.id}/products/${productId}/materials`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: materialForm.name, type: materialForm.type, defaultQty: materialForm.defaultQty || null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.error) {
        toast.error(data?.error?.message || data?.error || "Failed to add material");
      } else {
        toast.success(t("toasts.materialAdded"));
        setMaterialForm({ productId: "", name: "", type: "", defaultQty: "" });
        fetchMaterialsForProduct(productId);
      }
    } catch (error) {
      toast.error(t("toasts.materialAddFailed"));
    }
  };

  const handleDeleteMaterial = async (productId: string, materialId: string) => {
    if (!selectedClient) return;
    try {
      const res = await fetch(`/api/v1/clients/materials/${materialId}`, {
        method: "DELETE",
      });
      if (res.ok || res.status === 404) {
        toast.success(t("toasts.materialDeleted"));
        setProductMaterials((prev) => ({
          ...prev,
          [productId]: (prev[productId] || []).filter((m) => m.id !== materialId),
        }));
        fetchMaterialsForProduct(productId);
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data?.error?.message || data?.error || "Failed to delete material");
      }
    } catch (error) {
      toast.error(t("toasts.materialDeleteFailed"));
    }
  };

  const filteredClients = clients.filter((client) => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return true;
    const name = String(client?.name || "").toLowerCase();
    const company = String(client?.company || "").toLowerCase();
    const email = String(client?.email || "").toLowerCase();
    return name.includes(q) || company.includes(q) || email.includes(q);
  });

  const clientInitials = (nameLike: unknown) => {
    const name = String(nameLike || "").trim();
    if (!name) return "CL";
    const parts = name.split(/\s+/).filter(Boolean);
    const letters = parts.slice(0, 2).map((w) => w[0]).join("");
    return (letters || name[0] || "C").toUpperCase();
  };

  const selectedOrdersTotal = clientOrders.reduce(
    (acc, o) => acc + (Number(o?.totalAmount ?? o?.total_amount) || 0),
    0
  );

  return (
    <motion.div variants={staggerContainer} initial="initial" animate="animate" className="flex flex-col h-[calc(100vh-120px)] gap-4 overflow-hidden max-w-7xl mx-auto w-full min-w-0">
      {/* Client List Grid */}
      <motion.div variants={staggerItem} className="flex flex-col gap-4 min-w-0 w-full flex-1 overflow-hidden">
        <div className="flex justify-between items-center gap-2">
          <h1 className="text-[28px] sm:text-[34px] font-bold tracking-tight text-[var(--foreground)]">{t("title")}</h1>
          <div className="flex items-center gap-2">
            <IOSButton variant="gray" size="small" onClick={exportToPDF} className="hidden sm:flex">
              <Download className="h-4 w-4" />
            </IOSButton>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              {isAdmin && (
                <DialogTrigger asChild>
                  <IOSButton variant="filled" size="medium" icon={<Plus className="h-4 w-4" />}>
                    {t("btnNewClient")}
                  </IOSButton>
                </DialogTrigger>
              )}
              <DialogContent fullScreenMobile className="max-w-md p-0 overflow-hidden">
                <ScrollArea className="max-h-[90vh]">
                  <div className="p-6">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 16, marginBottom: 16, borderBottom: '1px solid var(--border)' }}>
                      <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--muted)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <User className="h-[18px] w-[18px] text-[var(--primary)]" />
                      </div>
                      <div>
                        <DialogTitle style={{ fontSize: 18, fontWeight: 700, color: 'var(--foreground)', lineHeight: '22px', margin: 0 }}>{t("addDialogTitle")}</DialogTitle>
                        <p style={{ fontSize: 13, color: 'var(--muted-foreground)', lineHeight: '18px', margin: '2px 0 0' }}>{t("addDialogSubtitle")}</p>
                      </div>
                    </div>
                    <form onSubmit={handleAddClient} className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <label className="text-[13px] font-medium text-[var(--muted-foreground)] ml-1">{t("lblName")} *</label>
                        <IOSInput
                          id="name"
                          value={formData.name}
                          onChange={(e: any) => setFormData({ ...formData, name: e.target.value })}
                          placeholder={t("placeholderName")}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[13px] font-medium text-[var(--muted-foreground)] ml-1">{t("lblCompany")}</label>
                        <IOSInput
                          id="company"
                          value={formData.company}
                          onChange={(e: any) => setFormData({ ...formData, company: e.target.value })}
                          placeholder={t("placeholderCompany")}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[13px] font-medium text-[var(--muted-foreground)] ml-1">{t("lblEmail")}</label>
                          <IOSInput
                            id="email"
                            type="email"
                            value={formData.email}
                            onChange={(e: any) => setFormData({ ...formData, email: e.target.value })}
                            placeholder={t("placeholderEmail")}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[13px] font-medium text-[var(--muted-foreground)] ml-1">{t("lblPhone")}</label>
                          <IOSInput
                            id="phone"
                            value={formData.phone}
                            onChange={(e: any) => setFormData({ ...formData, phone: e.target.value })}
                            placeholder={t("placeholderPhone")}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[13px] font-medium text-[var(--muted-foreground)] ml-1">{t("lblAddress")}</label>
                        <IOSInput
                          id="address"
                          value={formData.address}
                          onChange={(e: any) => setFormData({ ...formData, address: e.target.value })}
                          placeholder={t("placeholderAddress")}
                        />
                      </div>
                      <button type="submit" style={{ width: '100%', height: 48, borderRadius: 14, background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', border: '1px solid rgba(16,185,129,0.3)', boxShadow: '0 4px 16px rgba(16,185,129,0.25)', marginTop: 16 }}>{t("btnCreateProfile")}</button>
                    </form>
                  </div>
                </ScrollArea>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <IOSSearchBar
          placeholder={t("searchPlaceholder")}
          value={searchTerm}
          onValueChange={setSearchTerm}
        />

        <div className="flex-1 overflow-y-auto min-h-0 pr-0.5 scrollbar-hide">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4 p-1">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-28 w-full rounded-[16px]" />
              ))}
            </div>
          ) : filteredClients.length === 0 ? (
            searchTerm ? (
              <div className="flex flex-col items-center justify-center h-40 text-center p-4">
                <User className="h-8 w-8 text-[var(--muted-foreground)] mb-2" />
                <p className="text-[var(--muted-foreground)] text-[15px]">{t("noClientsMatch", { term: searchTerm })}</p>
              </div>
            ) : (
              <EmptyState
                icon="👥"
                title={t("emptyTitle")}
                description={t("emptyDesc")}
                actionLabel={t("emptyBtn")}
                onAction={handleAddNewClick}
              />
            )
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4 p-1">
              {filteredClients.map((client) => (
                <div
                  key={client.id}
                  onClick={() => handleSelectClient(client)}
                  className={cn(
                    "group flex flex-col justify-between p-4 cursor-pointer transition-all duration-200",
                    "rounded-[16px] border border-[var(--border)] bg-[var(--card)] shadow-sm hover:shadow-md hover:border-[var(--primary)]/40 min-w-0 overflow-hidden",
                    selectedClient?.id === client.id ? "bg-[var(--muted)] border-[var(--primary)] ring-1 ring-[var(--primary)]/50" : ""
                  )}
                >
                  <div>
                    <div className="flex justify-between items-start gap-2">
                      <h3 className="font-bold text-[17px] leading-[22px] text-[var(--foreground)] truncate min-w-0">{client.name}</h3>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <button className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 rounded-full flex items-center justify-center hover:bg-[var(--muted)] transition-all cursor-pointer">
                            <MoreVertical className="h-4 w-4 text-[var(--muted-foreground)]" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleSelectClient(client)}>
                            <Edit2 className="mr-2 h-4 w-4" /> {t("btnViewDetails")}
                          </DropdownMenuItem>
                          {isAdmin && (
                            <DropdownMenuItem className="text-[var(--destructive)]" onClick={(e) => {
                              e.stopPropagation();
                              setClientToDeleteId(client.id);
                              setIsDeleteDialogOpenConfirm(true);
                            }}>
                              <Trash2 className="mr-2 h-4 w-4" /> {t("btnDelete")}
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    {!!client.company && (
                      <div className="mt-1 text-[12px] text-[var(--muted-foreground)] truncate">
                        {client.company}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-3 text-[var(--muted-foreground)] text-[13px] flex-wrap">
                    {client.phone && (
                      <div className="flex items-center min-w-0">
                        <Phone className="mr-1 h-3 w-3 shrink-0" /> <span className="truncate">{client.phone}</span>
                      </div>
                    )}
                    {client.email && (
                      <div className="flex items-center min-w-0 truncate">
                        <Mail className="mr-1 h-3 w-3 shrink-0" /> <span className="truncate">{client.email}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      {/* Client profile modal (name, company, profile, orders, sum) */}
      <Dialog open={!!selectedClient} onOpenChange={(open) => { if (!open) setSelectedClient(null); }}>
        <DialogContent fullScreenMobile className="max-w-[900px] w-full p-0 overflow-hidden rounded-2xl" aria-describedby={undefined}>
          <DialogTitle className="sr-only">{t("profileDialogTitle")}</DialogTitle>
          {selectedClient && (
            <div
              className="flex flex-col overflow-hidden bg-[var(--background)] border border-[var(--border)] shadow-lg"
            >
              {/* -- Header Bar -- */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
                <button onClick={() => setSelectedClient(null)} className="w-[38px] h-[38px] rounded-xl bg-[var(--muted)] border border-[var(--border)] flex items-center justify-center cursor-pointer text-[var(--muted-foreground)] hover:bg-[var(--accent)]/10 transition-colors">
                  <X className="h-4 w-4" />
                </button>
                <h2 className="text-[17px] font-bold text-[var(--foreground)] tracking-tight">
                  {selectedClient?.name ? t("clientHeader", { name: selectedClient.name }) : t("profileDialogTitle")}
                </h2>
                {isAdmin ? (
                  <button onClick={handleUpdateClient} className="w-[38px] h-[38px] rounded-xl bg-[var(--muted)] border border-[var(--border)] flex items-center justify-center cursor-pointer text-[var(--muted-foreground)] hover:bg-[var(--accent)]/10 transition-colors">
                    <Edit2 className="h-4 w-4" />
                  </button>
                ) : <div style={{ width: 38 }} />}
              </div>

              <div className="flex-1 overflow-y-auto" style={{ padding: '0 20px 24px', maxHeight: '85vh' }}>
                {/* -- Avatar + Name Hero -- */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '24px 0 16px' }}>
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <input
                      type="file"
                      accept="image/*"
                      id="client-avatar-upload"
                      style={{ display: 'none' }}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file || !selectedClient) return;
                        // Reset file input so re-selecting the same file fires onChange
                        e.target.value = '';
                        if (file.size > 500 * 1024) {
                          toast.error(t("toasts.avatarSize"));
                          return;
                        }
                        setAvatarUploading(true);
                        const reader = new FileReader();
                        reader.onloadend = async () => {
                          const base64String = reader.result as string;
                          // Show optimistic preview
                          const prevAvatar = selectedClient.avatarUrl;
                          setSelectedClient((prev: any) => prev ? { ...prev, avatarUrl: base64String } : prev);
                          try {
                            const res = await fetch(`/api/clients/${selectedClient.id}`, {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ ...editData, avatarUrl: base64String }),
                            });
                            if (!res.ok) throw new Error('Failed to save avatar');
                            toast.success(t("toasts.avatarSaved"));
                          } catch (err: any) {
                            // Revert on failure
                            setSelectedClient((prev: any) => prev ? { ...prev, avatarUrl: prevAvatar } : prev);
                            toast.error(err.message || 'Failed to upload avatar');
                          } finally {
                            setAvatarUploading(false);
                          }
                        };
                        reader.readAsDataURL(file);
                      }}
                    />
                    <div
                      style={{
                        width: 72, height: 72, borderRadius: '50%',
                        background: selectedClient?.avatarUrl ? 'transparent' : 'linear-gradient(135deg, #007AFF, #5856D6)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 4px 24px rgba(0,122,255,0.35), 0 0 0 3px var(--background), 0 0 0 5px rgba(0,122,255,0.25)',
                        fontSize: 24, fontWeight: 800, color: '#fff', letterSpacing: 1,
                        overflow: 'hidden', position: 'relative',
                        cursor: isAdmin ? 'pointer' : 'default',
                        opacity: avatarUploading ? 0.6 : 1,
                      }}
                      onClick={() => isAdmin && document.getElementById('client-avatar-upload')?.click()}
                    >
                      {selectedClient?.avatarUrl ? (
                        <img
                          src={selectedClient.avatarUrl}
                          alt="avatar"
                          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                        />
                      ) : (
                        clientInitials(selectedClient?.name)
                      )}
                      {isAdmin && (
                        <div
                          style={{
                            position: 'absolute', inset: 0, borderRadius: '50%',
                            background: 'rgba(0,0,0,0.45)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            opacity: 0, transition: 'opacity 0.2s',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                          onMouseLeave={(e) => (e.currentTarget.style.opacity = '0')}
                          onClick={(e) => {
                            e.stopPropagation();
                            document.getElementById('client-avatar-upload')?.click();
                          }}
                        >
                          <Edit2 size={16} color="#fff" />
                        </div>
                      )}
                    </div>
                    <div style={{ position: 'absolute', bottom: 2, left: 2, width: 14, height: 14, borderRadius: '50%', background: '#30D158', border: '3px solid var(--background)', boxShadow: '0 0 8px rgba(48,209,88,0.5)' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-[22px] font-extrabold text-[var(--foreground)] tracking-tight m-0">{selectedClient.name || "Unnamed Client"}</h3>
                      {!!(selectedClient.company || editData.company) && (
                        <span className="text-[11px] font-extrabold text-[var(--primary)] bg-[var(--primary)]/10 border border-[var(--primary)]/20 px-2.5 py-0.5 rounded-full tracking-wide whitespace-nowrap">
                          {selectedClient.company || editData.company}
                        </span>
                      )}
                    </div>
                    <p className="text-[13px] text-[var(--muted-foreground)] mt-1.5 flex items-center gap-1.5">
                      <History className="h-3.5 w-3.5 opacity-60" />
                      {t("customerSince", { date: new Date(selectedClient.createdAt || selectedClient.created_at || Date.now()).toLocaleDateString(dateLocale, { month: 'short', year: 'numeric' }) })}
                    </p>
                  </div>
                </div>

                {/* -- Orders summary -- */}
                <div className="grid grid-cols-2 gap-3 mb-3.5">
                  <div className="bg-[var(--muted)]/50 border border-[var(--border)] rounded-2xl p-3.5">
                    <div className="flex items-center gap-2">
                      <ShoppingCart className="h-4 w-4 text-emerald-400" />
                      <span className="text-[11px] font-extrabold text-emerald-400 uppercase tracking-wide">{t("tabOrders")}</span>
                    </div>
                    <div className="mt-2 text-[22px] font-black text-[var(--foreground)]">{clientOrders.length}</div>
                  </div>
                  <div className="bg-[var(--muted)]/50 border border-[var(--border)] rounded-2xl p-3.5">
                    <div className="flex items-center gap-2">
                      <IndianRupee className="h-4 w-4 text-blue-400" />
                      <span className="text-[11px] font-extrabold text-blue-400 uppercase tracking-wide">{t("totalSum")}</span>
                    </div>
                    <div className="mt-2 text-[22px] font-black text-[var(--foreground)]">₹{selectedOrdersTotal.toLocaleString('en-IN')}</div>
                  </div>
                </div>

                {/* -- Segmented Tabs -- */}
                <Tabs defaultValue="profile" className="flex flex-col">
            <TabsList className="bg-[var(--muted)] border border-[var(--border)] rounded-[14px] p-[3px] flex gap-0.5 w-full">
              <TabsTrigger value="profile" className="flex-1 rounded-[11px] text-[13px] font-semibold py-2 transition-all data-[state=active]:!bg-[#007AFF] data-[state=active]:!text-white data-[state=active]:!shadow-[0_2px_12px_rgba(0,122,255,0.35)] text-[var(--muted-foreground)]">{t("tabProfile")}</TabsTrigger>
              <TabsTrigger value="materials" className="flex-1 rounded-[11px] text-[13px] font-semibold py-2 transition-all data-[state=active]:!bg-[#007AFF] data-[state=active]:!text-white data-[state=active]:!shadow-[0_2px_12px_rgba(0,122,255,0.35)] text-[var(--muted-foreground)]">{t("tabMaterials")}</TabsTrigger>
              <TabsTrigger value="orders" className="flex-1 rounded-[11px] text-[13px] font-semibold py-2 transition-all data-[state=active]:!bg-[#007AFF] data-[state=active]:!text-white data-[state=active]:!shadow-[0_2px_12px_rgba(0,122,255,0.35)] text-[var(--muted-foreground)]">{t("tabOrders")}</TabsTrigger>
            </TabsList>

            {/* --- PROFILE TAB --- */}
            <TabsContent value="profile" className="m-0 mt-5 space-y-5">
              {!isAdmin && <ReadOnlyBanner feature="client management" />}

              {/* Contact Information Card */}
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-[18px] overflow-hidden">
                <div className="px-4 py-3.5 border-b border-[var(--border)] flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center">
                    <User className="h-3.5 w-3.5 text-[var(--primary)]" />
                  </div>
                  <span className="text-[16px] font-bold text-[var(--foreground)]">{t("secContactInfo")}</span>
                </div>
                <div className="p-4">
                  <fieldset disabled={!isAdmin} style={{ border: 'none', padding: 0, margin: 0 }}>
                    <div className="grid grid-cols-2 gap-3">
                      {/* Full Name */}
                      <div>
                        <label className="text-[11px] font-bold text-[var(--muted-foreground)] uppercase tracking-wide mb-1.5 block">{t("lblFullName")}</label>
                        <div className="bg-[var(--muted)] border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-[14px] text-[var(--foreground)]">
                          <input value={editData.name} onChange={(e) => setEditData({ ...editData, name: e.target.value })} className="bg-transparent border-none outline-none text-inherit text-[inherit] w-full" />
                        </div>
                      </div>
                      {/* Company */}
                      <div>
                        <label className="text-[11px] font-bold text-[var(--muted-foreground)] uppercase tracking-wide mb-1.5 block">{t("lblCompany")}</label>
                        <div className="bg-[var(--muted)] border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-[14px] text-[var(--foreground)]">
                          <input value={editData.company} onChange={(e) => setEditData({ ...editData, company: e.target.value })} className="bg-transparent border-none outline-none text-inherit text-[inherit] w-full" />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-3">
                      {/* Email */}
                      <div>
                        <label className="text-[11px] font-bold text-[var(--muted-foreground)] uppercase tracking-wide mb-1.5 block">{t("lblEmailAddress")}</label>
                        <div className="bg-[var(--muted)] border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-[14px] text-[var(--foreground)] flex items-center gap-2">
                          <Mail className="h-4 w-4 text-[var(--muted-foreground)] shrink-0" />
                          <input value={editData.email} onChange={(e) => setEditData({ ...editData, email: e.target.value })} className="bg-transparent border-none outline-none text-inherit text-[inherit] w-full min-w-0" />
                        </div>
                      </div>
                      {/* Phone */}
                      <div>
                        <label className="text-[11px] font-bold text-[var(--muted-foreground)] uppercase tracking-wide mb-1.5 block">{t("lblPhoneNumber")}</label>
                        <div className="bg-[var(--muted)] border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-[14px] text-[var(--foreground)] flex items-center gap-2">
                          <Phone className="h-4 w-4 text-[var(--muted-foreground)] shrink-0" />
                          <input value={editData.phone} onChange={(e) => setEditData({ ...editData, phone: e.target.value })} className="bg-transparent border-none outline-none text-inherit text-[inherit] w-full" />
                        </div>
                      </div>
                    </div>
                  </fieldset>
                </div>
              </div>

              {/* Billing Address Card */}
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-[18px] overflow-hidden">
                <div className="px-4 py-3.5 border-b border-[var(--border)]">
                  <span className="text-[11px] font-bold text-[var(--muted-foreground)] uppercase tracking-wide">{t("lblBillingAddress")}</span>
                </div>
                <div className="p-4">
                  <div className="bg-[var(--muted)] border border-[var(--border)] rounded-xl px-3.5 py-3 flex items-start gap-2.5">
                    <MapPin className="h-4 w-4 text-[var(--muted-foreground)] shrink-0 mt-0.5" />
                    <textarea
                      value={editData.address}
                      onChange={(e) => setEditData({ ...editData, address: e.target.value })}
                      disabled={!isAdmin}
                      rows={2}
                      className="bg-transparent border-none outline-none text-[var(--foreground)] text-[14px] leading-5 w-full resize-none"
                    />
                  </div>
                </div>
              </div>

              {isAdmin && (
                <button onClick={handleUpdateClient} style={{ width: '100%', height: 48, borderRadius: 14, background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', border: '1px solid rgba(16,185,129,0.3)', boxShadow: '0 4px 16px rgba(16,185,129,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <Save className="h-4 w-4" /> {t("btnSaveChanges")}
                </button>
              )}

              {/* -- Stat Cards -- */}
              <div className="grid grid-cols-2 gap-3">
                {/* Total Orders */}
                <div className="bg-emerald-500/[0.08] dark:bg-emerald-500/[0.12] border border-emerald-500/15 rounded-[18px] px-4 py-[18px]">
                  <div className="flex items-center gap-2 mb-3">
                    <ShoppingCart className="h-4 w-4 text-emerald-400" />
                    <span className="text-[11px] font-bold text-emerald-300 dark:text-emerald-300 uppercase tracking-wide">{t("cardTotalOrders")}</span>
                  </div>
                  <p className="text-[32px] font-extrabold text-emerald-400 tracking-tight leading-none">{clientOrders.length}</p>
                  {clientOrders.filter(o => { const d = new Date(o.createdAt); const now = new Date(); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); }).length > 0 && (
                    <span className="inline-block mt-2 text-[11px] font-semibold text-emerald-300 bg-emerald-500/15 px-2.5 py-0.5 rounded-full">
                      +{t("thisMonth", { count: clientOrders.filter(o => { const d = new Date(o.createdAt); const now = new Date(); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); }).length })}
                    </span>
                  )}
                </div>

                {/* Total Spent */}
                <div className="bg-blue-500/[0.08] dark:bg-blue-500/[0.12] border border-blue-500/15 rounded-[18px] px-4 py-[18px]">
                  <div className="flex items-center gap-2 mb-3">
                    <IndianRupee className="h-4 w-4 text-blue-400" />
                    <span className="text-[11px] font-bold text-blue-300 dark:text-blue-300 uppercase tracking-wide">{t("cardTotalSpent")}</span>
                  </div>
                  <p className="text-[32px] font-extrabold text-blue-400 tracking-tight leading-none">
                    ₹{(() => { const total = clientOrders.reduce((acc, o) => acc + (Number(o.totalAmount || o.total_amount) || 0), 0); return total >= 100000 ? (total / 100000).toFixed(1) + 'L' : total.toLocaleString('en-IN'); })()}
                  </p>
                  {(() => { const thisMonth = clientOrders.filter(o => { const d = new Date(o.createdAt); const now = new Date(); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); }).reduce((acc, o) => acc + (Number(o.totalAmount || o.total_amount) || 0), 0); return thisMonth > 0 ? (
                    <span className="inline-block mt-2 text-[11px] font-semibold text-blue-300 bg-blue-500/15 px-2.5 py-0.5 rounded-full">
                      {t("thisMonthAmount", { amount: thisMonth >= 1000 ? (thisMonth / 1000).toFixed(0) + 'K' : thisMonth.toLocaleString('en-IN') })}
                    </span>
                  ) : null; })()}
                </div>
              </div>
            </TabsContent>

              <TabsContent value="materials" className="m-0 space-y-6">
                {isAdmin && (
                <IOSCard variant="elevated" padding="none">
                    <h3 className="text-[17px] font-semibold mb-4 border-b border-[var(--border)] pb-4 px-4 pt-4 text-[var(--foreground)]">{t("secAddProduct")}</h3>
                    <div className="p-4">
                      <form onSubmit={handleAddProduct} className="grid sm:grid-cols-3 gap-4 items-end">
                        <div className="space-y-2 sm:col-span-1">
                          <label className="text-[13px] font-medium text-[var(--muted-foreground)] pl-1">{t("lblProductName")}</label>
                          <IOSInput
                            value={productForm.name}
                            onChange={(e: any) => setProductForm({ ...productForm, name: e.target.value })}
                            placeholder={t("placeholderProduct")}
                            required
                          />
                        </div>
                        <div className="space-y-2 sm:col-span-1">
                          <label className="text-[13px] font-medium text-[var(--muted-foreground)] pl-1">{t("lblDefaultRate")}</label>
                          <IOSInput
                            type="number"
                            value={productForm.defaultRate}
                            onChange={(e: any) => setProductForm({ ...productForm, defaultRate: e.target.value })}
                            className="w-full"
                            placeholder="0.00"
                            min="0"
                            required
                          />
                        </div>
                        <div className="sm:col-span-1">
                          <IOSButton type="submit" variant="filled" size="small" className="w-full h-[40px]" icon={<Plus className="h-4 w-4" />}>
                            {t("btnAddProduct")}
                          </IOSButton>
                        </div>
                      </form>
                    </div>
                </IOSCard>
                )}

                <div className="space-y-4">
                  {loadingDetails ? (
                    <div className="text-center py-10 text-[var(--muted-foreground)]"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
                  ) : clientProducts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-center p-4 glass-section rounded-[16px]">
                      <Package className="h-8 w-8 text-[var(--muted-foreground)] mx-auto mb-2 opacity-50" />
                      <p className="text-[15px] text-[var(--muted-foreground)]">{t("noProductsMapped")}</p>
                    </div>
                  ) : (
                    clientProducts.map((product) => (
                      <IOSCard key={product.id} variant="elevated" padding="none" className="mb-4">
                        <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-[var(--muted)] transition-colors" onClick={() => toggleProductExpand(product.id)}>
                          <div>
                            <h4 className="font-bold text-[16px] text-[var(--foreground)] select-none">{product.name}</h4>
                            <p className="text-[13px] text-[var(--muted-foreground)] select-none">{t("rateLabel")} <span className="font-semibold text-[var(--foreground)]">₹{Number(product.defaultRate).toLocaleString()}</span></p>
                          </div>
                          <div className="flex items-center gap-3">
                            {isAdmin && (
                              <button className="h-7 w-7 rounded-full flex items-center justify-center text-[var(--muted-foreground)] hover:text-[var(--destructive)] hover:bg-[var(--destructive)]/10 transition-all cursor-pointer" onClick={(e) => { e.stopPropagation(); handleDeleteProduct(product.id); }}>
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                            {expandedProducts.includes(product.id) ? <ChevronUp className="h-5 w-5 text-[var(--muted-foreground)]" /> : <ChevronDown className="h-5 w-5 text-[var(--muted-foreground)]" />}
                          </div>
                        </div>

                        {expandedProducts.includes(product.id) && (
                          <div className="overflow-hidden border-t border-[var(--border)]">
                            <div className="p-4 bg-[var(--muted)]/30 space-y-4">
                              
                              {isAdmin && (
                                <form onSubmit={(e) => handleAddMaterial(e, product.id)} className="flex items-end gap-3 glass-section p-3 rounded-[12px]">
                                  <div className="flex-1 space-y-1">
                                    <label className="text-[11px] font-semibold text-[var(--muted-foreground)] uppercase">{t("lblNewMaterial")}</label>
                                    <IOSInput value={materialForm.productId === product.id ? materialForm.name : ""} onChange={(e: any) => setMaterialForm({ productId: product.id, name: e.target.value, type: materialForm.type, defaultQty: materialForm.defaultQty })} placeholder={t("placeholderMaterial")} className="h-9 text-[13px]" required />
                                  </div>
                                  <div className="w-1/4 space-y-1">
                                    <label className="text-[11px] font-semibold text-[var(--muted-foreground)] uppercase">{t("lblCategory")}</label>
                                    <IOSInput value={materialForm.productId === product.id ? materialForm.type : ""} onChange={(e: any) => setMaterialForm({ ...materialForm, productId: product.id, type: e.target.value })} placeholder={t("placeholderCategory")} className="h-9 text-[13px]" />
                                  </div>
                                  <IOSButton type="submit" variant="filled" size="small" className="h-9 px-4 whitespace-nowrap" icon={<Plus className="h-3 w-3" />}>{t("btnAdd")}</IOSButton>
                                </form>
                              )}

                              <div className="space-y-2">
                                {loadingMaterials[product.id] ? (
                                  <div className="py-4 text-center text-[var(--muted-foreground)]"><Loader2 className="h-4 w-4 animate-spin mx-auto" /></div>
                                ) : !productMaterials[product.id] || productMaterials[product.id].length === 0 ? (
                                  <div className="py-4 text-center text-[13px] text-[var(--muted-foreground)] italic">{t("noMaterialsForProduct")}</div>
                                ) : (
                                  productMaterials[product.id].map((mat: any) => (
                                    <div key={mat.id} className="flex justify-between items-center p-3 rounded-[10px] bg-[var(--card)] border border-[var(--border)] hover:border-white/20 transition-all">
                                      <div>
                                        <p className="font-semibold text-[14px] text-[var(--foreground)] leading-tight">{mat.name}</p>
                                        {mat.type && <p className="text-[11px] text-[var(--muted-foreground)] mt-0.5">{mat.type}</p>}
                                      </div>
                                      {isAdmin && (
                                        <button className="h-7 w-7 rounded-full flex items-center justify-center text-[var(--muted-foreground)] hover:text-[var(--destructive)] transition-colors cursor-pointer" onClick={() => handleDeleteMaterial(product.id, mat.id)}>
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </IOSCard>
                    ))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="orders" className="m-0 mt-5 space-y-4">
                <div className="flex justify-between items-center px-1">
                  <h3 className="text-[11px] font-bold text-[var(--muted-foreground)] uppercase tracking-wide">{t("historicalRecords")}</h3>
                  <div className="text-[12px] font-extrabold text-blue-400">
                    {t("totalOrdersAmount", { amount: selectedOrdersTotal.toLocaleString('en-IN') })}
                  </div>
                </div>
                {loadingDetails ? (
                  <div className="text-center py-10 text-[var(--muted-foreground)]"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
                ) : clientOrders.length === 0 ? (
                  <div className="text-center py-12 px-5 rounded-2xl bg-[var(--muted)]/30 border border-[var(--border)]">
                    <Package className="h-10 w-10 mx-auto mb-3 text-[var(--muted-foreground)] opacity-50" />
                    <p className="text-[15px] text-[var(--muted-foreground)]">{t("noOrdersFound")}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {clientOrders.map((order) => (
                      <div
                        key={order.id}
                        className="flex items-center justify-between p-4 bg-[var(--card)] border border-[var(--border)] rounded-[14px]"
                      >
                        <div className="flex items-center gap-3.5">
                          <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center">
                            <ShoppingCart className="h-5 w-5 text-blue-400" />
                          </div>
                          <div>
                            <p className="font-bold text-[var(--foreground)] text-[15px]">{order.productName || order.product_name || 'Unnamed Order'}</p>
                            <p className="text-[12px] text-[var(--muted-foreground)] mt-0.5">{order.createdAt ? new Date(order.createdAt).toLocaleDateString(dateLocale, { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}</p>
                          </div>
                        </div>
                        <div className="text-right flex flex-col items-end gap-1">
                          <span className="font-bold text-blue-400 text-[15px]">₹{(Number(order.totalAmount || order.total_amount) || 0).toLocaleString('en-IN')}</span>
                          <IOSBadge color={order.status === 'completed' ? 'green' : order.status === 'pending' ? 'orange' : 'blue'}>
                            {order.status}
                          </IOSBadge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
                </Tabs>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDeleteSheet
        open={isDeleteDialogOpenConfirm}
        onClose={() => setIsDeleteDialogOpenConfirm(false)}
        onConfirm={async () => {
          if (clientToDeleteId) {
            await handleDeleteClient(clientToDeleteId);
          }
        }}
        entityLabel={t("deleteEntityLabel")}
        entityName={
          clients.find((c) => c.id === clientToDeleteId)?.name ||
          clients.find((c) => c.id === clientToDeleteId)?.companyName ||
          clients.find((c) => c.id === clientToDeleteId)?.contactPerson
        }
        consequenceText={t("deleteConsequence")}
        confirmText={t("deleteConfirm")}
        cancelText={t("deleteCancel")}
      />
    </motion.div>
  );
}
