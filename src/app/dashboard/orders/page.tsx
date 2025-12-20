"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Plus, 
  Search, 
  MoreVertical, 
  FileText, 
  Trash2, 
    Calendar,
    IndianRupee,
    Box,
    CheckCircle2,
    Clock,
    Download
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
import { jsPDF } from "jspdf";

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
    const [currentOrder, setCurrentOrder] = useState<any>(null);

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

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel('orders-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const total_amount = formData.quantity * formData.rate;
    const { data: { user } } = await supabase.auth.getUser();
    
    // 1. Create Order
    const { data: newOrder, error: orderError } = await supabase
      .from('orders')
      .insert([{
        ...formData,
        total_amount,
        user_id: user?.id
      }])
      .select()
      .single();

    if (orderError) {
      toast.error("Failed to create order");
      return;
    }

    // 2. Deduct inventory if specified
    if (formData.inventory_item_id && formData.inventory_consumed > 0) {
      const selectedItem = inventory.find(i => i.id === formData.inventory_item_id);
      if (selectedItem) {
        const newQuantity = selectedItem.quantity - formData.inventory_consumed;
        const { error: invError } = await supabase
          .from('inventory')
          .update({ quantity: newQuantity })
          .eq('id', formData.inventory_item_id);
        
        if (invError) toast.error("Inventory deduction failed, but order was created.");
        else toast.success("Order created and inventory updated");
      }
    } else {
      toast.success("Order created");
    }

    fetchData();
    setIsDialogOpen(false);
    setFormData({
      client_id: "",
      product_name: "",
      quantity: 0,
      rate: 0,
      delivery_date: "",
      inventory_item_id: "",
      inventory_consumed: 0,
      status: "pending",
      payment_status: "pending"
    });
  };

  const generateInvoice = (order: any) => {
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text("INVOICE", 105, 20, { align: "center" });
    
    doc.setFontSize(12);
    doc.text(`Invoice ID: ${order.id.slice(0, 8).toUpperCase()}`, 20, 40);
    doc.text(`Date: ${new Date(order.created_at).toLocaleDateString()}`, 20, 50);
    
    doc.text("BILL TO:", 20, 70);
    doc.text(order.clients?.name || "Customer", 20, 80);
    doc.text(order.clients?.address || "", 20, 90);
    doc.text(order.clients?.email || "", 20, 100);
    
    doc.line(20, 110, 190, 110);
    
    doc.text("Description", 20, 120);
    doc.text("Qty", 120, 120);
    doc.text("Rate", 145, 120);
    doc.text("Total", 175, 120);
    
    doc.line(20, 125, 190, 125);
    
    doc.text(order.product_name, 20, 135);
    doc.text(order.quantity.toString(), 120, 135);
    doc.text(`Rs. ${order.rate}`, 145, 135);
    doc.text(`Rs. ${order.total_amount}`, 175, 135);
    
    doc.line(20, 145, 190, 145);
    
    doc.setFont("helvetica", "bold");
    doc.text("GRAND TOTAL:", 140, 160);
    doc.text(`Rs. ${order.total_amount}`, 175, 160);
    
    doc.setFont("helvetica", "normal");
    doc.text(`Delivery Date: ${order.delivery_date || "N/A"}`, 20, 180);
    doc.text(`Payment Status: ${order.payment_status.toUpperCase()}`, 20, 190);
    
    doc.save(`Invoice_${order.id.slice(0, 8)}.pdf`);
    toast.success("Invoice generated");
  };

  const filteredOrders = orders.filter(order => 
    order.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.clients?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
          <p className="text-zinc-500">Track production orders and delivery schedules.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> New Order
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Order</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label>Client *</Label>
                <Select onValueChange={(v) => setFormData({...formData, client_id: v})} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Product Name *</Label>
                <Input 
                  value={formData.product_name} 
                  onChange={(e) => setFormData({...formData, product_name: e.target.value})}
                  placeholder="e.g. 50kg Printed LDPE Bags"
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input 
                  type="number"
                  value={formData.quantity} 
                  onChange={(e) => setFormData({...formData, quantity: parseFloat(e.target.value)})}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Rate (per unit)</Label>
                <Input 
                  type="number"
                  step="0.01"
                  value={formData.rate} 
                  onChange={(e) => setFormData({...formData, rate: parseFloat(e.target.value)})}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Delivery Date</Label>
                <Input 
                  type="date"
                  value={formData.delivery_date} 
                  onChange={(e) => setFormData({...formData, delivery_date: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Payment Status</Label>
                <Select onValueChange={(v) => setFormData({...formData, payment_status: v})} defaultValue="pending">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="partial">Partial</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="col-span-2 border-t pt-4 mt-2">
                <h3 className="text-sm font-semibold mb-3">Inventory Deduction (Optional)</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Material Used</Label>
                    <Select onValueChange={(v) => setFormData({...formData, inventory_item_id: v})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select material" />
                      </SelectTrigger>
                      <SelectContent>
                        {inventory.map(i => (
                          <SelectItem key={i.id} value={i.id}>{i.name} ({i.quantity} {i.unit} available)</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Quantity Consumed</Label>
                    <Input 
                      type="number"
                      step="0.1"
                      value={formData.inventory_consumed} 
                      onChange={(e) => setFormData({...formData, inventory_consumed: parseFloat(e.target.value)})}
                    />
                  </div>
                </div>
              </div>

              <DialogFooter className="col-span-2 mt-4">
                <Button type="submit" className="w-full">Create Order & Deduct Stock</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
          <Input
            placeholder="Search orders or clients..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-md border bg-white dark:bg-zinc-900">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order Info</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Total Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead className="w-[100px]">Invoice</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">Loading orders...</TableCell>
              </TableRow>
            ) : filteredOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-zinc-500">No orders found.</TableCell>
              </TableRow>
            ) : filteredOrders.map((order) => (
              <TableRow key={order.id}>
                <TableCell>
                  <div className="font-medium">{order.product_name}</div>
                  <div className="text-xs text-zinc-500 flex items-center mt-1">
                    <Box className="mr-1 h-3 w-3" /> {order.quantity} units
                  </div>
                </TableCell>
                <TableCell>{order.clients?.name}</TableCell>
                  <TableCell className="font-semibold">₹{order.total_amount}</TableCell>
                <TableCell>
                  <Badge variant={order.status === 'completed' ? 'default' : 'secondary'}>
                    {order.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={order.payment_status === 'paid' ? 'default' : 'outline'}>
                    {order.payment_status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" onClick={() => generateInvoice(order)}>
                    <Download className="h-4 w-4 mr-2" /> PDF
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
