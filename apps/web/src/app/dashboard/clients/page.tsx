"use client";

import { useEffect, useState } from "react";
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
  ShoppingCart
} from "lucide-react";


import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
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
import { Badge } from "@/components/ui/badge";
import { GlassCard, GlassInput, GlassButton, TogglePill } from "@/components/ui/glass";
import { Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

import { Skeleton } from "@/components/ui/skeleton";
import { useRole } from "@/lib/hooks/use-role";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ReadOnlyBanner } from "@/components/AccessDenied";
import { generateDataExportPDF } from "@/lib/pdf-generator";
import { NumericInput } from "@/components/ui/numeric-input";
import { EmptyState } from "@/components/ui/EmptyState";

export default function ClientsPage() {
  const { isAdmin, isPro } = useRole();
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [isDeleteDialogOpenConfirm, setIsDeleteDialogOpenConfirm] = useState(false);
  const [clientToDeleteId, setClientToDeleteId] = useState<string | null>(null);

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
    const headers = ["Name", "Email", "Phone", "Address"];
    const rows = clients.map(client => [
      client.name || "—",
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

  // New Client Form
  const [formData, setFormData] = useState({ name: "", email: "", phone: "", address: "", customerSince: new Date().toISOString().split("T")[0] });

  // Edit Client Form
  const [editData, setEditData] = useState({ name: "", email: "", phone: "", address: "", customerSince: "" });

  // Product Form
  const [productForm, setProductForm] = useState({ name: "", defaultRate: "" });

  // Material Form
  const [materialForm, setMaterialForm] = useState({ productId: "", name: "", type: "", defaultQty: "" });

  const fetchClients = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/clients");
      const data = await res.json();
      if (data.error) toast.error("Failed to fetch clients");
      else setClients(data || []);
    } catch (error) {
      toast.error("Failed to fetch clients");
    } finally {
      setLoading(false);
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
    fetchClients();
    const interval = setInterval(fetchClients, 30000);
    return () => clearInterval(interval);
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
        setFormData({ name: "", email: "", phone: "", address: "", customerSince: new Date().toISOString().split("T")[0] });
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
      email: client.email || "",
      phone: client.phone || "",
      address: client.address || ""
    });
    fetchClientDetails(client);
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

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex h-[calc(100vh-120px)] gap-6 overflow-hidden">
      {/* Sidebar List */}
      <div className={cn(
        "flex-1 flex flex-col gap-4 min-w-0 transition-all duration-300",
        selectedClient ? "hidden lg:flex max-w-[400px]" : "w-full"
      )}>
        <div className="flex justify-between items-center gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
          <div className="flex items-center gap-2">
            <GlassButton variant="outline" size="icon" onClick={exportToPDF} className="hidden sm:flex">
              <Download className="h-4 w-4" />
            </GlassButton>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              {isAdmin && (
                <DialogTrigger asChild>
                  <GlassButton className="shadow-lg shadow-primary/20">
                    <Plus className="mr-2 h-4 w-4" /> New Client
                  </GlassButton>
                </DialogTrigger>
              )}
              <DialogContent className="max-w-md p-0 overflow-hidden">
                <ScrollArea className="max-h-[90vh]">
                  <div className="p-6">
                    <DialogHeader>
                      <DialogTitle>Add New Client</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleAddClient} className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Client Name *</Label>
                        <GlassInput
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="e.g. Acme Corp"
                          required
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="email">Email</Label>
                          <GlassInput
                            id="email"
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            placeholder="client@example.com"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="phone">WhatsApp / Phone</Label>
                          <GlassInput
                            id="phone"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            placeholder="+91..."
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="address">Address</Label>
                        <GlassInput
                          id="address"
                          value={formData.address}
                          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                          placeholder="Full business address"
                        />
                      </div>
                      <DialogFooter className="pt-4">
                        <GlassButton type="submit" className="w-full">Create Client Profile</GlassButton>
                      </DialogFooter>
                    </form>
                  </div>
                </ScrollArea>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
          <GlassInput
            placeholder="Search by name or email..."
            className="pl-8 bg-white dark:bg-zinc-900 shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex-1 overflow-y-auto rounded-xl border bg-white dark:bg-zinc-950 shadow-sm">
          {loading ? (
            <div className="p-4 space-y-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-xl" />
              ))}
            </div>
          ) : filteredClients.length === 0 ? (
            searchTerm ? (
              <div className="flex flex-col items-center justify-center h-40 text-center p-4">
                <User className="h-8 w-8 text-zinc-300 mb-2" />
                <p className="text-zinc-500">No clients found matching "{searchTerm}"</p>
              </div>
            ) : (
              <EmptyState
                icon="👤"
                title="No clients yet"
                description="Add your first client to start managing orders, products, and materials"
                actionLabel="+ Add First Client"
                onAction={handleAddNewClick}
              />
            )
          ) : (
            <div className="divide-y">
              {filteredClients.map((client) => (
                <div
                  key={client.id}
                  onClick={() => handleSelectClient(client)}
                  className={cn(
                    "group flex flex-col p-4 cursor-pointer transition-all hover:bg-zinc-50 dark:hover:bg-zinc-900/50",
                    selectedClient?.id === client.id ? "bg-zinc-100 dark:bg-zinc-900 border-l-4 border-primary" : "border-l-4 border-transparent"
                  )}
                >
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-lg leading-none">{client.name}</h3>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <GlassButton variant="ghost" size="icon" className="h-10 w-10 opacity-0 group-hover:opacity-100 rounded-full">
                          <MoreVertical className="h-5 w-5" />
                        </GlassButton>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleSelectClient(client)}>
                          <Edit2 className="mr-2 h-4 w-4" /> View Details
                        </DropdownMenuItem>
                        {isAdmin && (
                          <DropdownMenuItem className="text-red-500" onClick={(e) => {
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
                  <div className="flex items-center gap-4 mt-2 text-zinc-500 text-sm">
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
        </div>
      </div>

      {/* Detailed View */}
      {selectedClient ? (
        <div className="flex-[2] flex flex-col gap-6 overflow-hidden bg-zinc-50 dark:bg-zinc-950/50 rounded-2xl border p-6 shadow-inner">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <User className="h-6 w-6 text-primary" />
                {selectedClient.name}
              </h2>
              <p className="text-zinc-500 text-sm">Customer since {new Date(selectedClient.createdAt || selectedClient.created_at).toLocaleDateString('en-IN')}</p>
            </div>
            <GlassButton variant="ghost" size="icon" onClick={() => setSelectedClient(null)}>
              <X className="h-5 w-5" />
            </GlassButton>
          </div>

          <Tabs defaultValue="profile" className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="bg-zinc-200/50 dark:bg-zinc-900 w-fit p-1 rounded-lg">
              <TabsTrigger value="profile">Profile & Contact</TabsTrigger>
              <TabsTrigger value="materials">Materials / Products</TabsTrigger>
              <TabsTrigger value="orders">Order History</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto mt-4 pr-1">
              <TabsContent value="profile" className="m-0 space-y-6">
                {!isAdmin && <ReadOnlyBanner feature="client management" />}
                <GlassCard>
                  <div className="p-4 border-b border-[var(--border-card)]">
                    <h3 className="text-[17px] font-semibold text-[var(--label-primary)]">Contact Information</h3>
                    <p className="text-[13px] text-[var(--label-secondary)] mt-1">Inline changes are saved when you click update</p>
                  </div>
                  <div className="p-4 pt-6 space-y-4">
                    <fieldset disabled={!isAdmin} className="space-y-4 border-none p-0 m-0 min-w-0">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Display Name</Label>
                          <GlassInput
                            value={editData.name}
                            onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Email Address</Label>
                          <GlassInput
                            value={editData.email}
                            onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Phone / WhatsApp</Label>
                          <GlassInput
                            value={editData.phone}
                            onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Business Address</Label>
                        <GlassInput
                          value={editData.address}
                          onChange={(e) => setEditData({ ...editData, address: e.target.value })}
                        />
                      </div>
                    </fieldset>
                    {isAdmin && (
                      <GlassButton onClick={handleUpdateClient} className="w-fit">
                        <Save className="mr-2 h-4 w-4" /> Save Changes
                      </GlassButton>
                    )}
                  </div>
                </GlassCard>

                <div className="grid grid-cols-2 gap-4">
                  <GlassCard className="border-emerald-200 dark:border-emerald-900 bg-emerald-50/30 dark:bg-emerald-950/10">
                    <div className="p-4" className="pt-6">
                      <div className="flex flex-col items-center text-center">
                        <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center mb-2">
                          <Package className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <p className="text-2xl font-bold">{clientOrders.length}</p>
                        <p className="text-zinc-500 text-xs uppercase tracking-wider font-bold">Total Orders</p>
                      </div>
                    </div>
                  </GlassCard>
                  <GlassCard className="border-blue-200 dark:border-blue-900 bg-blue-50/30 dark:bg-blue-950/10">
                    <div className="p-4" className="pt-6">
                      <div className="flex flex-col items-center text-center">
                        <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center mb-2">
                          <History className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <p className="text-2xl font-bold">
                          ₹{clientOrders.reduce((acc, o) => acc + (Number(o.totalAmount || o.total_amount) || 0), 0).toLocaleString('en-IN')}
                        </p>
                        <p className="text-zinc-500 text-xs uppercase tracking-wider font-bold">Total Spent</p>
                      </div>
                    </div>
                  </GlassCard>
                </div>
              </TabsContent>

              <TabsContent value="materials" className="m-0 space-y-6">
                {isAdmin && (
                  <GlassCard>
                    <h3 className="text-[17px] font-semibold mb-4 border-b border-[var(--border-card)] pb-4 text-[var(--label-primary)]">Add Client Product</h3>
                    <div className="p-4">
                      <form onSubmit={handleAddProduct} className="grid sm:grid-cols-3 gap-4 items-end">
                        <div className="space-y-2 sm:col-span-1">
                          <label className="text-[13px] font-medium text-[var(--label-secondary)] pl-1">Product Name</label>
                          <GlassInput
                            value={productForm.name}
                            onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                            placeholder="e.g. Premium Widget"
                            required
                          />
                        </div>
                        <div className="space-y-2 sm:col-span-1">
                          <label className="text-[13px] font-medium text-[var(--label-secondary)] pl-1">Default Rate (₹)</label>
                          <GlassInput
                            type="number"
                            value={productForm.defaultRate}
                            onChange={(e) => setProductForm({ ...productForm, defaultRate: e.target.value })}
                            className="w-full"
                            placeholder="0.00"
                            min="0"
                            required
                          />
                        </div>
                        <div className="sm:col-span-1">
                          <GlassButton type="submit" variant="primary" className="w-full h-[40px]">
                            <Plus className="h-4 w-4 mr-2" /> Add Product
                          </GlassButton>
                        </div>
                      </form>
                    </div>
                  </GlassCard>
                )}

                <div className="space-y-4">
                  {loadingDetails ? (
                    <div className="text-center py-10 text-[var(--label-secondary)]"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
                  ) : clientProducts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-center p-4 glass-section rounded-[16px]">
                      <Package className="h-8 w-8 text-[var(--label-tertiary)] mx-auto mb-2 opacity-50" />
                      <p className="text-[15px] text-[var(--label-secondary)]">No products mapped for this client.</p>
                    </div>
                  ) : (
                    clientProducts.map((product) => (
                      <GlassCard key={product.id} className="overflow-hidden p-0 mb-4">
                        <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-[var(--fill-quaternary)] transition-colors" onClick={() => toggleProductExpand(product.id)}>
                          <div>
                            <h4 className="font-bold text-[16px] text-[var(--label-primary)] select-none">{product.name}</h4>
                            <p className="text-[13px] text-[var(--label-secondary)] select-none">Rate: <span className="font-semibold text-[var(--label-primary)]">₹{Number(product.defaultRate).toLocaleString()}</span></p>
                          </div>
                          <div className="flex items-center gap-3">
                            {isAdmin && (
                              <GlassButton variant="ghost" size="sm" className="text-[var(--ios-red)] hover:bg-[var(--ios-red)] hover:text-white" onClick={(e) => { e.stopPropagation(); handleDeleteProduct(product.id); }}>
                                <Trash2 className="h-4 w-4" />
                              </GlassButton>
                            )}
                            {expandedProducts.includes(product.id) ? <ChevronUp className="h-5 w-5 text-[var(--label-tertiary)]" /> : <ChevronDown className="h-5 w-5 text-[var(--label-tertiary)]" />}
                          </div>
                        </div>

                        {expandedProducts.includes(product.id) && (
                          <div className="overflow-hidden border-t border-[var(--border-card)]">
                            <div className="p-4 bg-[var(--fill-quaternary)]/30 space-y-4">
                              
                              {isAdmin && (
                                <form onSubmit={(e) => handleAddMaterial(e, product.id)} className="flex items-end gap-3 glass-section p-3 rounded-[12px]">
                                  <div className="flex-1 space-y-1">
                                    <label className="text-[11px] font-semibold text-[var(--label-secondary)] uppercase">New Material Name / Ref</label>
                                    <GlassInput value={materialForm.productId === product.id ? materialForm.name : ""} onChange={(e) => setMaterialForm({ productId: product.id, name: e.target.value, type: materialForm.type, defaultQty: materialForm.defaultQty })} placeholder="e.g. Aluminium Sheet" className="h-9 text-[13px]" required />
                                  </div>
                                  <div className="w-1/4 space-y-1">
                                    <label className="text-[11px] font-semibold text-[var(--label-secondary)] uppercase">Category</label>
                                    <GlassInput value={materialForm.productId === product.id ? materialForm.type : ""} onChange={(e) => setMaterialForm({ ...materialForm, productId: product.id, type: e.target.value })} placeholder="Type" className="h-9 text-[13px]" />
                                  </div>
                                  <GlassButton type="submit" variant="primary" size="sm" className="h-9 px-4 whitespace-nowrap"><Plus className="h-3 w-3 mr-1" /> Add</GlassButton>
                                </form>
                              )}

                              <div className="space-y-2">
                                {loadingMaterials[product.id] ? (
                                  <div className="py-4 text-center text-[var(--label-tertiary)]"><Loader2 className="h-4 w-4 animate-spin mx-auto" /></div>
                                ) : !productMaterials[product.id] || productMaterials[product.id].length === 0 ? (
                                  <div className="py-4 text-center text-[13px] text-[var(--label-secondary)] italic">No specific materials added to this product.</div>
                                ) : (
                                  productMaterials[product.id].map((mat: any) => (
                                    <div key={mat.id} className="flex justify-between items-center p-3 rounded-[10px] bg-[var(--bg-card)] border border-[var(--border-card)] hover:border-white/20 transition-all">
                                      <div>
                                        <p className="font-semibold text-[14px] text-[var(--label-primary)] leading-tight">{mat.name}</p>
                                        {mat.type && <p className="text-[11px] text-[var(--label-tertiary)] mt-0.5">{mat.type}</p>}
                                      </div>
                                      {isAdmin && (
                                        <GlassButton variant="ghost" size="sm" className="h-7 w-7 !p-0 text-[var(--label-tertiary)] hover:text-[var(--ios-red)]" onClick={() => handleDeleteMaterial(product.id, mat.id)}>
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </GlassButton>
                                      )}
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </GlassCard>
                    ))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="orders" className="m-0 space-y-4">
                <div className="flex justify-between items-center px-1">
                  <h3 className="font-bold text-zinc-500 uppercase text-xs tracking-widest">Historical Records</h3>
                </div>
                {loadingDetails ? (
                  <div className="text-center py-10">Loading orders...</div>
                ) : clientOrders.length === 0 ? (
                  <div className="text-center py-12 bg-white dark:bg-zinc-900 rounded-2xl border shadow-sm">
                    <Package className="h-10 w-10 text-zinc-200 mx-auto mb-3" />
                    <p className="text-zinc-500">No previous orders found for this client.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {clientOrders.map((order) => (
                      <div
                        key={order.id}
                        className="flex items-center justify-between p-4 bg-white dark:bg-zinc-900 rounded-xl border shadow-sm hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                            <ShoppingCart className="h-5 w-5 text-zinc-500" />
                          </div>
                          <div>
                            <p className="font-bold text-zinc-900 dark:text-zinc-100">{order.productName || order.product_name || 'Unnamed Order'}</p>
                            <p className="text-xs text-zinc-500">{order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}</p>
                          </div>
                        </div>
                        <div className="text-right flex flex-col items-end gap-1">
                          <span className="font-bold text-primary">₹{(Number(order.totalAmount || order.total_amount) || 0).toLocaleString('en-IN')}</span>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] uppercase font-bold",
                              order.status === 'completed' ? "text-emerald-500 border-emerald-500 bg-emerald-50/50" :
                                order.status === 'pending' ? "text-amber-500 border-amber-500 bg-amber-50/50" :
                                  "text-blue-500 border-blue-500 bg-blue-50/50"
                            )}
                          >
                            {order.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </div>
          </Tabs>
        </div >
      ) : (
        <div className="hidden lg:flex flex-[2] flex-col items-center justify-center text-center p-8 bg-zinc-50 dark:bg-zinc-950/20 rounded-2xl border-2 border-dashed border-zinc-200 dark:border-zinc-800">
          <div className="h-20 w-20 bg-zinc-100 dark:bg-zinc-900 rounded-full flex items-center justify-center mb-4">
            <User className="h-10 w-10 text-zinc-400" />
          </div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Client Detailed View</h2>
          <p className="text-zinc-500 max-w-sm mt-2">Select a client from the list to manage their profile, specific material rates, and view full transaction history.</p>
        </div>
      )}

      <Dialog open={isDeleteDialogOpenConfirm} onOpenChange={setIsDeleteDialogOpenConfirm}>
        <DialogContent className="max-w-[350px]">
          <DialogHeader>
            <DialogTitle>Delete Client</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this client? All their materials and order history will be affected. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2">
            <GlassButton variant="outline" onClick={() => setIsDeleteDialogOpenConfirm(false)} className="flex-1">Cancel</GlassButton>
            <GlassButton
              variant="destructive"
              onClick={() => clientToDeleteId && handleDeleteClient(clientToDeleteId)}
              className="flex-1"
            >
              Delete
            </GlassButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div >
  );
}
