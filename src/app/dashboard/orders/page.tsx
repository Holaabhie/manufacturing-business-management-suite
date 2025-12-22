"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Plus, 
  Search, 
  MoreVertical, 
  Trash2, 
  Edit2,
  Box,
  Download,
  AlertCircle,
  Menu,
  ChevronDown,
  ChevronUp,
  X,
  IndianRupee,
  Factory,
  CheckCircle2,
  PackageCheck
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
  DialogFooter
} from "@/components/ui/dialog";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { jsPDF } from "jspdf";
import { cn } from "@/lib/utils";

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [clientMaterials, setClientMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentOrder, setCurrentOrder] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    client_id: "",
    product_name: "",
    quantity: 1,
    rate: 0,
    delivery_date: "",
    status: "pending",
    payment_status: "pending",
    order_items: [] as { inventory_id: string; quantity_deducted: number }[]
  });

  const fetchData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    const [ordersRes, clientsRes, inventoryRes] = await Promise.all([
      supabase.from('orders').select('*, clients(name, email, address)').eq('user_id', user?.id).order('created_at', { ascending: false }),
      supabase.from('clients').select('id, name').eq('user_id', user?.id),
      supabase.from('inventory').select('id, name, quantity, unit').eq('user_id', user?.id)
    ]);
    
    setOrders(ordersRes.data || []);
    setClients(clientsRes.data || []);
    setInventory(inventoryRes.data || []);
    setLoading(false);
  };

  const fetchClientMaterials = async (clientId: string) => {
    if (!clientId) {
      setClientMaterials([]);
      return;
    }
    const { data } = await supabase
      .from('client_materials')
      .select('*')
      .eq('client_id', clientId);
    setClientMaterials(data || []);
  };

  useEffect(() => {
    fetchData();
    const channel = supabase
      .channel('orders-realtime-v3')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchData())
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  const resetForm = () => {
    setFormData({
      client_id: "",
      product_name: "",
      quantity: 1,
      rate: 0,
      delivery_date: "",
      status: "pending",
      payment_status: "pending",
      order_items: []
    });
    setClientMaterials([]);
    setCurrentOrder(null);
  };

  const handleClientChange = (clientId: string) => {
    setFormData({ ...formData, client_id: clientId, product_name: "", rate: 0 });
    fetchClientMaterials(clientId);
  };

  const handleMaterialSelect = (materialName: string) => {
    const selectedMat = clientMaterials.find(m => m.name === materialName);
    if (selectedMat) {
      setFormData({ 
        ...formData, 
        product_name: selectedMat.name, 
        rate: Number(selectedMat.default_rate || 0) 
      });
    } else {
      setFormData({ ...formData, product_name: materialName });
    }
  };

  const addDeductionRow = () => {
    setFormData({
      ...formData,
      order_items: [...formData.order_items, { inventory_id: "", quantity_deducted: 0 }]
    });
  };

  const removeDeductionRow = (index: number) => {
    const items = [...formData.order_items];
    items.splice(index, 1);
    setFormData({ ...formData, order_items: items });
  };

  const updateDeductionRow = (index: number, field: string, value: any) => {
    const items = [...formData.order_items];
    items[index] = { ...items[index], [field]: value };
    setFormData({ ...formData, order_items: items });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();

    if (!formData.client_id) return toast.error("Select a client");
    if (!formData.product_name) return toast.error("Product name is required");
    if (formData.order_items.length === 0) return toast.error("At least one inventory item must be deducted");

    // Check for negative stock
    for (const item of formData.order_items) {
      if (!item.inventory_id) return toast.error("Select material to deduct");
      const invItem = inventory.find(i => i.id === item.inventory_id);
      if (!invItem || invItem.quantity < item.quantity_deducted) {
        return toast.error(`Insufficient stock for ${invItem?.name || 'Material'}`);
      }
    }

    const total_amount = formData.quantity * formData.rate;
    const orderPayload = {
      client_id: formData.client_id,
      product_name: formData.product_name,
      quantity: formData.quantity,
      rate: formData.rate,
      total_amount,
      delivery_date: formData.delivery_date || null,
      status: formData.status,
      payment_status: formData.payment_status,
      user_id: user?.id
    };

    try {
      if (currentOrder) {
        const { error } = await supabase
          .from('orders')
          .update(orderPayload)
          .eq('id', currentOrder.id);
        if (error) throw error;
        toast.success("Order updated successfully");
      } else {
        // 1. Create Order
        const { data: orderData, error: orderError } = await supabase
          .from('orders')
          .insert([orderPayload])
          .select()
          .single();
        
        if (orderError) throw orderError;

        // 2. Perform Deductions
        for (const item of formData.order_items) {
          const invItem = inventory.find(i => i.id === item.inventory_id);
          const newQty = invItem.quantity - item.quantity_deducted;

          // Deduct from inventory
          const { error: invError } = await supabase
            .from('inventory')
            .update({ quantity: newQty })
            .eq('id', item.inventory_id);
          
          if (invError) throw invError;

          // Record deduction
          await supabase.from('order_inventory_items').insert([{
            order_id: orderData.id,
            inventory_id: item.inventory_id,
            quantity_deducted: item.quantity_deducted,
            user_id: user?.id
          }]);
        }
        toast.success("Order created & stock deducted");
      }
      setIsDialogOpen(false);
      resetForm();
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Operation failed");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Delete this order record? This will NOT restore inventory automatically.")) {
      const { error } = await supabase.from('orders').delete().eq('id', id);
      if (error) toast.error("Delete failed");
      else {
        toast.success("Order deleted");
        fetchData();
      }
    }
  };

  const generateInvoice = (order: any) => {
    const doc = new jsPDF();
    doc.setFontSize(22);
    doc.setTextColor(40, 40, 40);
    doc.text("PURCHASE ORDER", 105, 25, { align: "center" });
    
    doc.setFontSize(10);
    doc.text(`PO Number: ${order.id.slice(0, 8).toUpperCase()}`, 20, 40);
    doc.text(`Date: ${new Date(order.created_at).toLocaleDateString()}`, 20, 45);
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("CLIENT INFORMATION", 20, 60);
    doc.setFont("helvetica", "normal");
    doc.text(order.clients?.name || "N/A", 20, 68);
    doc.text(order.clients?.address || "Address not provided", 20, 75);
    
    doc.line(20, 85, 190, 85);
    doc.setFont("helvetica", "bold");
    doc.text("ITEM DESCRIPTION", 25, 95);
    doc.text("QTY", 120, 95);
    doc.text("RATE", 145, 95);
    doc.text("TOTAL", 170, 95);
    doc.setFont("helvetica", "normal");
    doc.line(20, 100, 190, 100);
    
    doc.text(order.product_name, 25, 110);
    doc.text(order.quantity.toString(), 120, 110);
    doc.text(`Rs. ${order.rate}`, 145, 110);
    doc.text(`Rs. ${order.total_amount}`, 170, 110);
    
    doc.line(20, 130, 190, 130);
    doc.setFont("helvetica", "bold");
    doc.text("NET PAYABLE:", 130, 140);
    doc.text(`Rs. ${order.total_amount}`, 170, 140);
    
    doc.setFontSize(8);
    doc.text("Authorized Signature", 160, 200, { align: "center" });
    doc.line(140, 195, 180, 195);
    
    doc.save(`PO_${order.id.slice(0,8)}.pdf`);
    toast.success("Document downloaded");
  };

  const filteredOrders = orders.filter(order => 
    order.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.clients?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Orders & Production</h1>
          <p className="text-zinc-500 font-medium flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary" /> Integrated material flow
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button size="lg" className="rounded-xl shadow-xl shadow-primary/20 gap-2">
              <Plus className="h-5 w-5" /> New Production Order
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                <Factory className="h-6 w-6 text-primary" />
                {currentOrder ? "Edit Production Status" : "Configure Production Order"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-8 mt-4">
              {/* Step 1: Client & Product */}
              <div className="grid grid-cols-2 gap-6 p-4 bg-zinc-50 dark:bg-zinc-900 rounded-2xl border">
                <div className="col-span-2 space-y-2">
                  <Label className="font-bold uppercase text-[10px] tracking-widest text-zinc-500">Target Client</Label>
                  <Select 
                    value={formData.client_id} 
                    onValueChange={handleClientChange} 
                    required
                  >
                    <SelectTrigger className="h-12 bg-white dark:bg-zinc-950 font-medium">
                      <SelectValue placeholder="Select from directory..." />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-2 space-y-2">
                  <Label className="font-bold uppercase text-[10px] tracking-widest text-zinc-500">Pick Stored Material OR Type New Product</Label>
                  <Select 
                    value={clientMaterials.find(m => m.name === formData.product_name) ? formData.product_name : ""} 
                    onValueChange={handleMaterialSelect}
                  >
                    <SelectTrigger className="h-12 bg-white dark:bg-zinc-950">
                      <SelectValue placeholder="Quick-select client material..." />
                    </SelectTrigger>
                    <SelectContent>
                      {clientMaterials.map(m => (
                        <SelectItem key={m.id} value={m.name}>{m.name} (Rate: ₹{m.default_rate})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input 
                    placeholder="Type product name if not in list..."
                    value={formData.product_name} 
                    className="mt-2 h-11 bg-white dark:bg-zinc-950"
                    onChange={(e) => setFormData({...formData, product_name: e.target.value})}
                    required 
                  />
                </div>

                <div className="space-y-2">
                  <Label className="font-bold uppercase text-[10px] tracking-widest text-zinc-500">Ordered Quantity</Label>
                  <Input 
                    type="number"
                    value={formData.quantity} 
                    className="h-12 bg-white dark:bg-zinc-950 font-bold text-lg"
                    onChange={(e) => setFormData({...formData, quantity: parseFloat(e.target.value)})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold uppercase text-[10px] tracking-widest text-zinc-500">Rate (₹ / Unit)</Label>
                  <Input 
                    type="number"
                    step="0.01"
                    value={formData.rate} 
                    className="h-12 bg-white dark:bg-zinc-950 font-bold text-lg text-primary"
                    onChange={(e) => setFormData({...formData, rate: parseFloat(e.target.value)})}
                    required
                  />
                </div>
              </div>

              {/* Step 2: Inventory Deduction */}
              {!currentOrder && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center px-1">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                      <Box className="h-5 w-5 text-zinc-500" />
                      Mandatory Material Deduction
                    </h3>
                    <Button type="button" variant="outline" size="sm" onClick={addDeductionRow} className="rounded-full">
                      <Plus className="h-4 w-4 mr-1" /> Add Component
                    </Button>
                  </div>
                  
                  <div className="space-y-3">
                    {formData.order_items.length === 0 && (
                      <div className="py-8 text-center bg-zinc-100 rounded-xl border-2 border-dashed border-zinc-300">
                        <AlertCircle className="h-6 w-6 mx-auto mb-2 text-zinc-400" />
                        <p className="text-sm text-zinc-500">You must select which raw materials are used for this order.</p>
                      </div>
                    )}
                    {formData.order_items.map((item, idx) => (
                      <div key={idx} className="flex gap-4 items-end animate-in slide-in-from-left-2 transition-all">
                        <div className="flex-1 space-y-1">
                          <Label className="text-[10px] font-bold text-zinc-500 uppercase ml-1">Raw Material</Label>
                          <Select 
                            value={item.inventory_id} 
                            onValueChange={(v) => updateDeductionRow(idx, 'inventory_id', v)}
                          >
                            <SelectTrigger className="h-11 bg-white dark:bg-zinc-950">
                              <SelectValue placeholder="Select stock..." />
                            </SelectTrigger>
                            <SelectContent>
                              {inventory.map(i => (
                                <SelectItem key={i.id} value={i.id} disabled={i.quantity <= 0}>
                                  {i.name} ({i.quantity} {i.unit} left)
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="w-40 space-y-1">
                          <Label className="text-[10px] font-bold text-zinc-500 uppercase ml-1">Qty Used</Label>
                          <Input 
                            type="number" 
                            className="h-11 bg-white dark:bg-zinc-950 font-bold"
                            value={item.quantity_deducted}
                            onChange={(e) => updateDeductionRow(idx, 'quantity_deducted', parseFloat(e.target.value))}
                          />
                        </div>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon" 
                          className="h-11 w-11 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl"
                          onClick={() => removeDeductionRow(idx)}
                        >
                          <X className="h-5 w-5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 3: Status & Payment */}
              <div className="grid grid-cols-2 gap-4 border-t pt-6">
                <div className="space-y-2">
                  <Label>Expected Delivery</Label>
                  <Input 
                    type="date"
                    value={formData.delivery_date} 
                    onChange={(e) => setFormData({...formData, delivery_date: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Payment Status</Label>
                  <Select value={formData.payment_status} onValueChange={(v) => setFormData({...formData, payment_status: v})}>
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="partial">Partial</SelectItem>
                      <SelectItem value="paid">Fully Paid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="bg-primary/5 p-4 rounded-2xl flex justify-between items-center border border-primary/20">
                <span className="font-bold text-zinc-700 uppercase text-xs">Calculated Total Order Value</span>
                <span className="text-2xl font-black text-primary">₹{(formData.quantity * formData.rate).toLocaleString()}</span>
              </div>

              <DialogFooter className="sticky bottom-0 bg-white dark:bg-zinc-950 pt-4 border-t">
                <Button type="submit" size="lg" className="w-full h-12 rounded-xl text-lg font-bold">
                  {currentOrder ? "Push Updates" : "Issue Order & Deduct Materials"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
        <Input
          placeholder="Filter orders by product or client..."
          className="pl-10 h-11 bg-white dark:bg-zinc-900 shadow-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="rounded-2xl border bg-white dark:bg-zinc-950 shadow-md overflow-hidden">
        <Table>
          <TableHeader className="bg-zinc-50 dark:bg-zinc-900">
            <TableRow>
              <TableHead className="font-bold py-4 pl-6">Production Order</TableHead>
              <TableHead className="font-bold py-4">Financials</TableHead>
              <TableHead className="font-bold py-4">Timeline / Status</TableHead>
              <TableHead className="w-[120px] py-4 pr-6 text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-20 text-zinc-400 font-medium">Crunching factory data...</TableCell>
              </TableRow>
            ) : filteredOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-20 text-zinc-500">No active orders found.</TableCell>
              </TableRow>
            ) : filteredOrders.map((order) => (
              <TableRow key={order.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/40">
                <TableCell className="pl-6 py-5">
                  <div className="flex flex-col">
                    <span className="font-bold text-lg text-zinc-900 dark:text-zinc-100">{order.product_name}</span>
                    <span className="text-sm font-medium text-zinc-500">Client: {order.clients?.name}</span>
                    <div className="flex items-center gap-2 mt-2">
                       <Badge variant="outline" className="text-[10px] font-bold py-0 h-5">{order.quantity} Units</Badge>
                       <span className="text-[10px] text-zinc-400 font-mono uppercase">{order.id.slice(0,8)}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="text-xl font-black text-primary">₹{Number(order.total_amount).toLocaleString()}</span>
                    <Badge variant="outline" className={cn(
                        "w-fit text-[9px] uppercase font-black tracking-tighter mt-1",
                        order.payment_status === 'paid' ? "border-emerald-500 text-emerald-600 bg-emerald-50" : "border-amber-500 text-amber-600"
                    )}>
                        {order.payment_status}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-1.5">
                        <div className={cn(
                            "h-2 w-2 rounded-full",
                            order.status === 'completed' ? "bg-emerald-500" : "bg-amber-500 animate-pulse"
                        )} />
                        <span className="text-xs font-bold uppercase tracking-wider">{order.status}</span>
                    </div>
                    {order.delivery_date && (
                        <span className="text-[10px] bg-zinc-100 dark:bg-zinc-800 w-fit px-2 py-0.5 rounded font-bold text-zinc-500">
                            Due: {new Date(order.delivery_date).toLocaleDateString()}
                        </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="pr-6 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" className="text-zinc-500" onClick={() => generateInvoice(order)}>
                        <Download className="h-4 w-4" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-5 w-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => openEditDialog(order)}>
                          <Edit2 className="mr-2 h-4 w-4" /> Change Progress
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-500" onClick={() => handleDelete(order.id)}>
                          <Trash2 className="mr-2 h-4 w-4" /> Delete Order
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
