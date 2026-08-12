"use client";

import { useEffect, useRef, useState } from "react";
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
  const { isAdmin, isPro } = useRole();
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [isDeleteDialogOpenConfirm, setIsDeleteDialogOpenConfirm] = useState(false);
  const [clientToDeleteId, setClientToDeleteId] = useState<string | null>(null);
  const [restoredFromCache, setRestoredFromCache] = useState(false);

  // ── Cache persistence ──
  const { restoreState, persist, scrollYRef, containerRef: cachedScrollRef, restoreScroll } = useCachedPage({
    pageKey: "clients",
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
    const headers = ["Name", "Company", "Email", "Phone", "Address"];
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
    toast.success("Clients report PDF downloaded!");
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
      if (data.error) toast.error("Failed to fetch clients");
      else setClients(data || []);
    } catch (error) {
      toast.error("Failed to fetch clients");
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
      toast.error("Failed to fetch client details");
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
      toast.error("Failed to fetch materials for product");
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
    // If cache served data, fetch silently in background; otherwise show loading
    fetchClients(!restoredFromCache);
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

      if (data.error) toast.error("Failed to create client");
      else {
        toast.success("Client created");
        fetchClients();
        setIsDialogOpen(false);
        setFormData({ name: "", company: "", email: "", phone: "", address: "", customerSince: new Date().toISOString().split("T")[0] });
        handleSelectClient(data);
      }
    } catch (error) {
      toast.error("Failed to create client");
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

      if (data.error) toast.error("Failed to update client");
      else {
        toast.success("Client information updated");
        fetchClients();
      }
    } catch (error) {
      toast.error("Failed to update client");
    }
  };

  const handleDeleteClient = async (id: string) => {
    try {
      const res = await fetch(`/api/clients/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (data.error) toast.error("Failed to delete client");
      else {
        toast.success("Client deleted");
        if (selectedClient?.id === id) setSelectedClient(null);
        fetchClients();
      }
    } catch (error) {
      toast.error("Failed to delete client");
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
      const data = await res.json();
      if (data.error) toast.error("Failed to add product");
      else {
        toast.success("Product added");
        setProductForm({ name: "", defaultRate: "" });
        fetchClientDetails(selectedClient);
      }
    } catch (error) {
      toast.error("Failed to add product");
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!selectedClient) return;
    try {
      const res = await fetch(`/api/v1/clients/products/${productId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.error) toast.error("Failed to delete product");
      else {
        toast.success("Product deleted");
        fetchClientDetails(selectedClient);
      }
    } catch (error) {
      toast.error("Failed to delete product");
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
      const data = await res.json();
      if (data.error) toast.error("Failed to add material");
      else {
        toast.success("Material added");
        setMaterialForm({ productId: "", name: "", type: "", defaultQty: "" });
        fetchMaterialsForProduct(productId);
      }
    } catch (error) {
      toast.error("Failed to add material");
    }
  };

  const handleDeleteMaterial = async (productId: string, materialId: string) => {
    if (!selectedClient) return;
    try {
      const res = await fetch(`/api/v1/clients/materials/${materialId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.error) toast.error("Failed to delete material");
      else {
        toast.success("Material deleted");
        fetchMaterialsForProduct(productId);
      }
    } catch (error) {
      toast.error("Failed to delete material");
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
    <motion.div variants={staggerContainer} initial="initial" animate="animate" className="flex h-[calc(100vh-120px)] gap-6 overflow-hidden max-w-7xl mx-auto w-full">
      {/* Sidebar List */}
      <motion.div variants={staggerItem} className={cn(
        "flex flex-col gap-4 min-w-0 transition-all duration-300",
        "w-full md:max-w-sm lg:max-w-md"
      )}>
        <div className="flex justify-between items-center gap-2">
          <h1 className="text-[28px] sm:text-[34px] font-bold tracking-tight text-[var(--foreground)]">Clients</h1>
          <div className="flex items-center gap-2">
            <IOSButton variant="gray" size="small" onClick={exportToPDF} className="hidden sm:flex">
              <Download className="h-4 w-4" />
            </IOSButton>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              {isAdmin && (
                <DialogTrigger asChild>
                  <IOSButton variant="filled" size="medium" icon={<Plus className="h-4 w-4" />}>
                    New Client
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
                        <DialogTitle style={{ fontSize: 18, fontWeight: 700, color: 'var(--foreground)', lineHeight: '22px', margin: 0 }}>Add New Client</DialogTitle>
                        <p style={{ fontSize: 13, color: 'var(--muted-foreground)', lineHeight: '18px', margin: '2px 0 0' }}>Create a new client profile</p>
                      </div>
                    </div>
                    <form onSubmit={handleAddClient} className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <label className="text-[13px] font-medium text-[var(--muted-foreground)] ml-1">Client Name *</label>
                        <IOSInput
                          id="name"
                          value={formData.name}
                          onChange={(e: any) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="e.g. Acme Corp"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[13px] font-medium text-[var(--muted-foreground)] ml-1">Company</label>
                        <IOSInput
                          id="company"
                          value={formData.company}
                          onChange={(e: any) => setFormData({ ...formData, company: e.target.value })}
                          placeholder="e.g. Acme Manufacturing Pvt Ltd"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[13px] font-medium text-[var(--muted-foreground)] ml-1">Email</label>
                          <IOSInput
                            id="email"
                            type="email"
                            value={formData.email}
                            onChange={(e: any) => setFormData({ ...formData, email: e.target.value })}
                            placeholder="client@example.com"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[13px] font-medium text-[var(--muted-foreground)] ml-1">WhatsApp / Phone</label>
                          <IOSInput
                            id="phone"
                            value={formData.phone}
                            onChange={(e: any) => setFormData({ ...formData, phone: e.target.value })}
                            placeholder="+91..."
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[13px] font-medium text-[var(--muted-foreground)] ml-1">Address</label>
                        <IOSInput
                          id="address"
                          value={formData.address}
                          onChange={(e: any) => setFormData({ ...formData, address: e.target.value })}
                          placeholder="Full business address"
                        />
                      </div>
                      <button type="submit" style={{ width: '100%', height: 48, borderRadius: 14, background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', border: '1px solid rgba(16,185,129,0.3)', boxShadow: '0 4px 16px rgba(16,185,129,0.25)', marginTop: 16 }}>Create Client Profile</button>
                    </form>
                  </div>
                </ScrollArea>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <IOSSearchBar
          placeholder="Search by name, company, or email..."
          value={searchTerm}
          onValueChange={setSearchTerm}
        />

        <IOSCard variant="elevated" padding="none" className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 space-y-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-[12px]" />
              ))}
            </div>
          ) : filteredClients.length === 0 ? (
            searchTerm ? (
              <div className="flex flex-col items-center justify-center h-40 text-center p-4">
                <User className="h-8 w-8 text-[var(--muted-foreground)] mb-2" />
                <p className="text-[var(--muted-foreground)] text-[15px]">No clients found matching &quot;{searchTerm}&quot;</p>
              </div>
            ) : (
              <EmptyState
                icon="??"
                title="No clients yet"
                description="Add your first client to start managing orders, products, and materials"
                actionLabel="+ Add First Client"
                onAction={handleAddNewClick}
              />
            )
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {filteredClients.map((client) => (
                <div
                  key={client.id}
                  onClick={() => handleSelectClient(client)}
                  className={cn(
                    "group flex flex-col p-4 cursor-pointer transition-all duration-200",
                    "hover:bg-[var(--muted)]",
                    selectedClient?.id === client.id ? "bg-[var(--muted)] border-l-4 border-[var(--primary)]" : "border-l-4 border-transparent"
                  )}
                >
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-[17px] leading-[22px] text-[var(--foreground)]">{client.name}</h3>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <button className="h-8 w-8 opacity-0 group-hover:opacity-100 rounded-full flex items-center justify-center hover:bg-[var(--muted)] transition-all cursor-pointer">
                          <MoreVertical className="h-4 w-4 text-[var(--muted-foreground)]" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleSelectClient(client)}>
                          <Edit2 className="mr-2 h-4 w-4" /> View Details
                        </DropdownMenuItem>
                        {isAdmin && (
                          <DropdownMenuItem className="text-[var(--destructive)]" onClick={(e) => {
                            e.stopPropagation();
                            setClientToDeleteId(client.id);
                            setIsDeleteDialogOpenConfirm(true);
                          }}>
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
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
                  <div className="flex items-center gap-4 mt-2 text-[var(--muted-foreground)] text-[13px]">
                    {client.phone && (
                      <div className="flex items-center">
                        <Phone className="mr-1 h-3 w-3" /> {client.phone}
                      </div>
                    )}
                    {client.email && (
                      <div className="flex items-center max-w-[150px] truncate">
                        <Mail className="mr-1 h-3 w-3" /> {client.email}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </IOSCard>
      </motion.div>

      {/* Client profile modal (name, company, profile, orders, sum) */}
      <Dialog open={!!selectedClient} onOpenChange={(open) => { if (!open) setSelectedClient(null); }}>
        <DialogContent fullScreenMobile className="max-w-[900px] w-full p-0 overflow-hidden rounded-2xl" aria-describedby={undefined}>
          <DialogTitle className="sr-only">Client Profile</DialogTitle>
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
                  {selectedClient?.name ? `Client: ${selectedClient.name}` : "Client Profile"}
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
                          toast.error('Avatar must be smaller than 500KB');
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
                            toast.success('Avatar saved!');
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
                      Customer since {new Date(selectedClient.createdAt || selectedClient.created_at || Date.now()).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>

                {/* -- Orders summary -- */}
                <div className="grid grid-cols-2 gap-3 mb-3.5">
                  <div className="bg-[var(--muted)]/50 border border-[var(--border)] rounded-2xl p-3.5">
                    <div className="flex items-center gap-2">
                      <ShoppingCart className="h-4 w-4 text-emerald-400" />
                      <span className="text-[11px] font-extrabold text-emerald-400 uppercase tracking-wide">Orders</span>
                    </div>
                    <div className="mt-2 text-[22px] font-black text-[var(--foreground)]">{clientOrders.length}</div>
                  </div>
                  <div className="bg-[var(--muted)]/50 border border-[var(--border)] rounded-2xl p-3.5">
                    <div className="flex items-center gap-2">
                      <IndianRupee className="h-4 w-4 text-blue-400" />
                      <span className="text-[11px] font-extrabold text-blue-400 uppercase tracking-wide">Total sum</span>
                    </div>
                    <div className="mt-2 text-[22px] font-black text-[var(--foreground)]">₹{selectedOrdersTotal.toLocaleString('en-IN')}</div>
                  </div>
                </div>

                {/* -- Segmented Tabs -- */}
                <Tabs defaultValue="profile" className="flex flex-col">
            <TabsList className="bg-[var(--muted)] border border-[var(--border)] rounded-[14px] p-[3px] flex gap-0.5 w-full">
              <TabsTrigger value="profile" className="flex-1 rounded-[11px] text-[13px] font-semibold py-2 transition-all data-[state=active]:!bg-[#007AFF] data-[state=active]:!text-white data-[state=active]:!shadow-[0_2px_12px_rgba(0,122,255,0.35)] text-[var(--muted-foreground)]">Profile</TabsTrigger>
              <TabsTrigger value="materials" className="flex-1 rounded-[11px] text-[13px] font-semibold py-2 transition-all data-[state=active]:!bg-[#007AFF] data-[state=active]:!text-white data-[state=active]:!shadow-[0_2px_12px_rgba(0,122,255,0.35)] text-[var(--muted-foreground)]">Materials</TabsTrigger>
              <TabsTrigger value="orders" className="flex-1 rounded-[11px] text-[13px] font-semibold py-2 transition-all data-[state=active]:!bg-[#007AFF] data-[state=active]:!text-white data-[state=active]:!shadow-[0_2px_12px_rgba(0,122,255,0.35)] text-[var(--muted-foreground)]">Orders</TabsTrigger>
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
                  <span className="text-[16px] font-bold text-[var(--foreground)]">Contact Information</span>
                </div>
                <div className="p-4">
                  <fieldset disabled={!isAdmin} style={{ border: 'none', padding: 0, margin: 0 }}>
                    <div className="grid grid-cols-2 gap-3">
                      {/* Full Name */}
                      <div>
                        <label className="text-[11px] font-bold text-[var(--muted-foreground)] uppercase tracking-wide mb-1.5 block">Full Name</label>
                        <div className="bg-[var(--muted)] border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-[14px] text-[var(--foreground)]">
                          <input value={editData.name} onChange={(e) => setEditData({ ...editData, name: e.target.value })} className="bg-transparent border-none outline-none text-inherit text-[inherit] w-full" />
                        </div>
                      </div>
                      {/* Company */}
                      <div>
                        <label className="text-[11px] font-bold text-[var(--muted-foreground)] uppercase tracking-wide mb-1.5 block">Company</label>
                        <div className="bg-[var(--muted)] border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-[14px] text-[var(--foreground)]">
                          <input value={editData.company} onChange={(e) => setEditData({ ...editData, company: e.target.value })} className="bg-transparent border-none outline-none text-inherit text-[inherit] w-full" />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-3">
                      {/* Email */}
                      <div>
                        <label className="text-[11px] font-bold text-[var(--muted-foreground)] uppercase tracking-wide mb-1.5 block">Email Address</label>
                        <div className="bg-[var(--muted)] border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-[14px] text-[var(--foreground)] flex items-center gap-2">
                          <Mail className="h-4 w-4 text-[var(--muted-foreground)] shrink-0" />
                          <input value={editData.email} onChange={(e) => setEditData({ ...editData, email: e.target.value })} className="bg-transparent border-none outline-none text-inherit text-[inherit] w-full min-w-0" />
                        </div>
                      </div>
                      {/* Phone */}
                      <div>
                        <label className="text-[11px] font-bold text-[var(--muted-foreground)] uppercase tracking-wide mb-1.5 block">Phone Number</label>
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
                  <span className="text-[11px] font-bold text-[var(--muted-foreground)] uppercase tracking-wide">Billing Address</span>
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
                  <Save className="h-4 w-4" /> Save Changes
                </button>
              )}

              {/* -- Stat Cards -- */}
              <div className="grid grid-cols-2 gap-3">
                {/* Total Orders */}
                <div className="bg-emerald-500/[0.08] dark:bg-emerald-500/[0.12] border border-emerald-500/15 rounded-[18px] px-4 py-[18px]">
                  <div className="flex items-center gap-2 mb-3">
                    <ShoppingCart className="h-4 w-4 text-emerald-400" />
                    <span className="text-[11px] font-bold text-emerald-300 dark:text-emerald-300 uppercase tracking-wide">Total Orders</span>
                  </div>
                  <p className="text-[32px] font-extrabold text-emerald-400 tracking-tight leading-none">{clientOrders.length}</p>
                  {clientOrders.filter(o => { const d = new Date(o.createdAt); const now = new Date(); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); }).length > 0 && (
                    <span className="inline-block mt-2 text-[11px] font-semibold text-emerald-300 bg-emerald-500/15 px-2.5 py-0.5 rounded-full">
                      +{clientOrders.filter(o => { const d = new Date(o.createdAt); const now = new Date(); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); }).length} this month
                    </span>
                  )}
                </div>

                {/* Total Spent */}
                <div className="bg-blue-500/[0.08] dark:bg-blue-500/[0.12] border border-blue-500/15 rounded-[18px] px-4 py-[18px]">
                  <div className="flex items-center gap-2 mb-3">
                    <IndianRupee className="h-4 w-4 text-blue-400" />
                    <span className="text-[11px] font-bold text-blue-300 dark:text-blue-300 uppercase tracking-wide">Total Spent</span>
                  </div>
                  <p className="text-[32px] font-extrabold text-blue-400 tracking-tight leading-none">
                    ₹{(() => { const total = clientOrders.reduce((acc, o) => acc + (Number(o.totalAmount || o.total_amount) || 0), 0); return total >= 100000 ? (total / 100000).toFixed(1) + 'L' : total.toLocaleString('en-IN'); })()}
                  </p>
                  {(() => { const thisMonth = clientOrders.filter(o => { const d = new Date(o.createdAt); const now = new Date(); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); }).reduce((acc, o) => acc + (Number(o.totalAmount || o.total_amount) || 0), 0); return thisMonth > 0 ? (
                    <span className="inline-block mt-2 text-[11px] font-semibold text-blue-300 bg-blue-500/15 px-2.5 py-0.5 rounded-full">
                      ₹{thisMonth >= 1000 ? (thisMonth / 1000).toFixed(0) + 'K' : thisMonth.toLocaleString('en-IN')} this month
                    </span>
                  ) : null; })()}
                </div>
              </div>
            </TabsContent>

              <TabsContent value="materials" className="m-0 space-y-6">
                {isAdmin && (
                <IOSCard variant="elevated" padding="none">
                    <h3 className="text-[17px] font-semibold mb-4 border-b border-[var(--border)] pb-4 px-4 pt-4 text-[var(--foreground)]">Add Client Product</h3>
                    <div className="p-4">
                      <form onSubmit={handleAddProduct} className="grid sm:grid-cols-3 gap-4 items-end">
                        <div className="space-y-2 sm:col-span-1">
                          <label className="text-[13px] font-medium text-[var(--muted-foreground)] pl-1">Product Name</label>
                          <IOSInput
                            value={productForm.name}
                            onChange={(e: any) => setProductForm({ ...productForm, name: e.target.value })}
                            placeholder="e.g. Premium Widget"
                            required
                          />
                        </div>
                        <div className="space-y-2 sm:col-span-1">
                          <label className="text-[13px] font-medium text-[var(--muted-foreground)] pl-1">Default Rate (₹)</label>
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
                            Add Product
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
                      <p className="text-[15px] text-[var(--muted-foreground)]">No products mapped for this client.</p>
                    </div>
                  ) : (
                    clientProducts.map((product) => (
                      <IOSCard key={product.id} variant="elevated" padding="none" className="mb-4">
                        <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-[var(--muted)] transition-colors" onClick={() => toggleProductExpand(product.id)}>
                          <div>
                            <h4 className="font-bold text-[16px] text-[var(--foreground)] select-none">{product.name}</h4>
                            <p className="text-[13px] text-[var(--muted-foreground)] select-none">Rate: <span className="font-semibold text-[var(--foreground)]">₹{Number(product.defaultRate).toLocaleString()}</span></p>
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
                                    <label className="text-[11px] font-semibold text-[var(--muted-foreground)] uppercase">New Material Name / Ref</label>
                                    <IOSInput value={materialForm.productId === product.id ? materialForm.name : ""} onChange={(e: any) => setMaterialForm({ productId: product.id, name: e.target.value, type: materialForm.type, defaultQty: materialForm.defaultQty })} placeholder="e.g. Aluminium Sheet" className="h-9 text-[13px]" required />
                                  </div>
                                  <div className="w-1/4 space-y-1">
                                    <label className="text-[11px] font-semibold text-[var(--muted-foreground)] uppercase">Category</label>
                                    <IOSInput value={materialForm.productId === product.id ? materialForm.type : ""} onChange={(e: any) => setMaterialForm({ ...materialForm, productId: product.id, type: e.target.value })} placeholder="Type" className="h-9 text-[13px]" />
                                  </div>
                                  <IOSButton type="submit" variant="filled" size="small" className="h-9 px-4 whitespace-nowrap" icon={<Plus className="h-3 w-3" />}>Add</IOSButton>
                                </form>
                              )}

                              <div className="space-y-2">
                                {loadingMaterials[product.id] ? (
                                  <div className="py-4 text-center text-[var(--muted-foreground)]"><Loader2 className="h-4 w-4 animate-spin mx-auto" /></div>
                                ) : !productMaterials[product.id] || productMaterials[product.id].length === 0 ? (
                                  <div className="py-4 text-center text-[13px] text-[var(--muted-foreground)] italic">No specific materials added to this product.</div>
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
                  <h3 className="text-[11px] font-bold text-[var(--muted-foreground)] uppercase tracking-wide">Historical Records</h3>
                  <div className="text-[12px] font-extrabold text-blue-400">
                    Total: ₹{selectedOrdersTotal.toLocaleString('en-IN')}
                  </div>
                </div>
                {loadingDetails ? (
                  <div className="text-center py-10 text-[var(--muted-foreground)]"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
                ) : clientOrders.length === 0 ? (
                  <div className="text-center py-12 px-5 rounded-2xl bg-[var(--muted)]/30 border border-[var(--border)]">
                    <Package className="h-10 w-10 mx-auto mb-3 text-[var(--muted-foreground)] opacity-50" />
                    <p className="text-[15px] text-[var(--muted-foreground)]">No previous orders found for this client.</p>
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
                            <p className="text-[12px] text-[var(--muted-foreground)] mt-0.5">{order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}</p>
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
        entityLabel="client"
        entityName={
          clients.find((c) => c.id === clientToDeleteId)?.name ||
          clients.find((c) => c.id === clientToDeleteId)?.companyName ||
          clients.find((c) => c.id === clientToDeleteId)?.contactPerson
        }
        consequenceText="will be permanently removed along with their contact & order history. This cannot be undone."
      />
    </motion.div>
  );
}
