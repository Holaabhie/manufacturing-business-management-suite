"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
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
  History,
  Package,
  Save,
  MessageSquare,
  ChevronRight,
  User,
  ExternalLink,
  ShoppingCart
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

import { Skeleton } from "@/components/ui/skeleton";
import { useRole } from "@/lib/hooks/use-role";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function ClientsPage() {
  const { isAdmin } = useRole();
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [isDeleteDialogOpenConfirm, setIsDeleteDialogOpenConfirm] = useState(false);
  const [clientToDeleteId, setClientToDeleteId] = useState<string | null>(null);

  const exportToCSV = () => {
    const headers = ["Name", "Email", "Phone", "Address"];
    const rows = clients.map(client => [
      client.name,
      client.email,
      client.phone,
      client.address
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n"
      + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `clients_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Clients exported!");
  };
  
  // Materials and Orders for selected client
  const [clientMaterials, setClientMaterials] = useState<any[]>([]);
  const [clientOrders, setClientOrders] = useState<any[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // New Client Form
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: ""
  });

  // Edit Client Form (Detailed View)
  const [editData, setEditData] = useState({
    name: "",
    email: "",
    phone: "",
    address: ""
  });

  // Material Form
  const [materialForm, setMaterialForm] = useState({
    name: "",
    type: "",
    default_rate: ""
  });

  const fetchClients = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('user_id', user?.id)
      .order('name');
    
    if (error) toast.error("Failed to fetch clients");
    else setClients(data || []);
    setLoading(false);
  };

  const fetchClientDetails = async (client: any) => {
    setLoadingDetails(true);
    const [materialsRes, ordersRes] = await Promise.all([
      supabase.from('client_materials').select('*').eq('client_id', client.id).order('created_at'),
      supabase.from('orders').select('*').eq('client_id', client.id).order('created_at', { ascending: false })
    ]);

    setClientMaterials(materialsRes.data || []);
    setClientOrders(ordersRes.data || []);
    setLoadingDetails(false);
  };

  useEffect(() => {
    fetchClients();

    const channel = supabase
      .channel('clients-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, () => fetchClients())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'client_materials' }, () => {
          if (selectedClient) fetchClientDetails(selectedClient);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedClient?.id]);

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('clients')
      .insert([{ ...formData, user_id: user?.id }])
      .select()
      .single();
    
    if (error) toast.error("Failed to create client");
    else {
      toast.success("Client created");
      fetchClients();
        setIsDialogOpen(false);
      setFormData({ name: "", email: "", phone: "", address: "" });
      handleSelectClient(data);
    }
  };

  const handleUpdateClient = async () => {
    if (!selectedClient) return;

    const { error } = await supabase
      .from('clients')
      .update(editData)
      .eq('id', selectedClient.id);
    
    if (error) toast.error("Failed to update client");
    else {
      toast.success("Client information updated");
      fetchClients();
    }
  };

  const handleDeleteClient = async (id: string) => {
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id);
    
    if (error) toast.error("Failed to delete client");
    else {
      toast.success("Client deleted");
      if (selectedClient?.id === id) setSelectedClient(null);
      fetchClients();
    }
    setIsDeleteDialogOpenConfirm(false);
    setClientToDeleteId(null);
  };

  const handleSelectClient = (client: any) => {
    setSelectedClient(client);
    setEditData({
      name: client.name,
      email: client.email || "",
      phone: client.phone || "",
      address: client.address || ""
    });
    fetchClientDetails(client);
  };

  const handleAddMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) return;

    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from('client_materials')
      .insert([{
        ...materialForm,
        default_rate: Number(materialForm.default_rate),
        client_id: selectedClient.id,
        user_id: user?.id
      }]);
    
    if (error) toast.error("Failed to add material");
    else {
      toast.success("Material added");
      setMaterialForm({ name: "", type: "", default_rate: "" });
      fetchClientDetails(selectedClient);
    }
  };

  const handleDeleteMaterial = async (id: string) => {
    const { error } = await supabase
      .from('client_materials')
      .delete()
      .eq('id', id);
    
    if (error) toast.error("Failed to delete material");
    else {
      toast.success("Material deleted");
      fetchClientDetails(selectedClient);
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
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> New Client
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Client</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddClient} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Client Name *</Label>
                  <Input 
                    id="name" 
                    value={formData.name} 
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="e.g. Acme Corp"
                    required 
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      value={formData.email} 
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      placeholder="client@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">WhatsApp / Phone</Label>
                    <Input 
                      id="phone" 
                      value={formData.phone} 
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      placeholder="+91..."
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input 
                    id="address" 
                    value={formData.address} 
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    placeholder="Full business address"
                  />
                </div>
                <DialogFooter>
                  <Button type="submit" className="w-full">Create Client Profile</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
          <Input
            placeholder="Search by name or email..."
            className="pl-8 bg-white dark:bg-zinc-900 shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex-1 overflow-y-auto rounded-xl border bg-white dark:bg-zinc-950 shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center h-40 text-zinc-500">Loading directory...</div>
          ) : filteredClients.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-center p-4">
              <User className="h-8 w-8 text-zinc-300 mb-2" />
              <p className="text-zinc-500">No clients found matching "{searchTerm}"</p>
            </div>
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
                        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleSelectClient(client)}>
                          <Edit2 className="mr-2 h-4 w-4" /> View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-500" onClick={(e) => {
                          e.stopPropagation();
                          setClientToDeleteId(client.id);
                          setIsDeleteDialogOpenConfirm(true);
                        }}>
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
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
              <p className="text-zinc-500 text-sm">Customer since {new Date(selectedClient.created_at).toLocaleDateString()}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setSelectedClient(null)}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          <Tabs defaultValue="profile" className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="bg-zinc-200/50 dark:bg-zinc-900 w-fit p-1 rounded-lg">
              <TabsTrigger value="profile">Profile & Contact</TabsTrigger>
              <TabsTrigger value="materials">Materials / Products</TabsTrigger>
              <TabsTrigger value="orders">Order History</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto mt-4 pr-1">
              <TabsContent value="profile" className="m-0 space-y-6">
                <Card>
                  <CardHeader className="pb-3 border-b">
                    <CardTitle className="text-lg">Contact Information</CardTitle>
                    <CardDescription>Inline changes are saved when you click update</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Display Name</Label>
                        <Input 
                          value={editData.name} 
                          onChange={(e) => setEditData({...editData, name: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Email Address</Label>
                        <Input 
                          value={editData.email} 
                          onChange={(e) => setEditData({...editData, email: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Phone / WhatsApp</Label>
                        <Input 
                          value={editData.phone} 
                          onChange={(e) => setEditData({...editData, phone: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Client ID (Internal)</Label>
                        <Input value={selectedClient.id} disabled className="font-mono text-[10px]" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Business Address</Label>
                      <Input 
                        value={editData.address} 
                        onChange={(e) => setEditData({...editData, address: e.target.value})}
                      />
                    </div>
                    <Button onClick={handleUpdateClient} className="w-fit">
                      <Save className="mr-2 h-4 w-4" /> Save Changes
                    </Button>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-2 gap-4">
                  <Card className="border-emerald-200 dark:border-emerald-900 bg-emerald-50/30 dark:bg-emerald-950/10">
                    <CardContent className="pt-6">
                      <div className="flex flex-col items-center text-center">
                        <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center mb-2">
                          <Package className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <p className="text-2xl font-bold">{clientOrders.length}</p>
                        <p className="text-zinc-500 text-xs uppercase tracking-wider font-bold">Total Orders</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-blue-200 dark:border-blue-900 bg-blue-50/30 dark:bg-blue-950/10">
                    <CardContent className="pt-6">
                      <div className="flex flex-col items-center text-center">
                        <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center mb-2">
                          <History className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <p className="text-2xl font-bold">
                          ₹{clientOrders.reduce((acc, o) => acc + Number(o.total_amount || 0), 0).toLocaleString()}
                        </p>
                        <p className="text-zinc-500 text-xs uppercase tracking-wider font-bold">Total Spent</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="materials" className="m-0 space-y-6">
                <Card>
                  <CardHeader className="pb-3 border-b">
                    <CardTitle className="text-lg">Add Specific Material/Product</CardTitle>
                    <CardDescription>Define materials commonly ordered by this client</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <form onSubmit={handleAddMaterial} className="flex flex-wrap gap-4">
                      <div className="flex-1 min-w-[200px] space-y-2">
                        <Label>Material Name</Label>
                        <Input 
                          placeholder="e.g. Cotton 50kg bag" 
                          value={materialForm.name}
                          onChange={(e) => setMaterialForm({...materialForm, name: e.target.value})}
                          required
                        />
                      </div>
                      <div className="w-40 space-y-2">
                        <Label>Type</Label>
                        <Input 
                          placeholder="Raw / Finished" 
                          value={materialForm.type}
                          onChange={(e) => setMaterialForm({...materialForm, type: e.target.value})}
                        />
                      </div>
                      <div className="w-32 space-y-2">
                        <Label>Default Rate</Label>
                        <Input 
                          type="number" 
                          placeholder="0.00" 
                          value={materialForm.default_rate}
                          onChange={(e) => setMaterialForm({...materialForm, default_rate: e.target.value})}
                        />
                      </div>
                      <div className="flex gap-2 self-end">
                        <Button type="submit">
                          <Plus className="h-4 w-4 mr-2" /> Add
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>

                <div className="grid gap-4">
                  <h3 className="font-bold text-zinc-500 uppercase text-xs tracking-widest pl-1">Stored Materials</h3>
                  {clientMaterials.length === 0 ? (
                    <div className="text-center py-10 bg-zinc-100/50 dark:bg-zinc-900 rounded-xl border-2 border-dashed">
                      <p className="text-zinc-500 text-sm">No materials stored for this client yet.</p>
                    </div>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {clientMaterials.map((mat) => (
                        <Card key={mat.id} className="relative overflow-hidden group">
                          <CardContent className="p-4 flex justify-between items-center">
                            <div>
                              <p className="font-bold">{mat.name}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="secondary" className="text-[10px] uppercase font-bold">{mat.type || 'Standard'}</Badge>
                                <span className="text-sm font-medium text-primary">₹{mat.default_rate}/unit</span>
                              </div>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-red-500 opacity-0 group-hover:opacity-100"
                              onClick={() => handleDeleteMaterial(mat.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
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
                            <p className="font-bold text-zinc-900 dark:text-zinc-100">{order.product_name}</p>
                            <p className="text-xs text-zinc-500">{new Date(order.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className="text-right flex flex-col items-end gap-1">
                          <span className="font-bold text-primary">₹{Number(order.total_amount).toLocaleString()}</span>
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
        </div>
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
            <Button variant="outline" onClick={() => setIsDeleteDialogOpenConfirm(false)} className="flex-1">Cancel</Button>
            <Button 
              variant="destructive" 
              onClick={() => clientToDeleteId && handleDeleteClient(clientToDeleteId)}
              className="flex-1"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
