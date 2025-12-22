"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { 
  CreditCard, 
  Search, 
  IndianRupee, 
  TrendingUp, 
  Clock, 
  CheckCircle2,
  Plus,
  ArrowUpRight,
  TrendingDown,
  History,
  User,
  AlertCircle,
  MoreVertical,
  X
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function PaymentsPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedClientHistory, setSelectedClientHistory] = useState<any>(null);

  // New Payment Form
  const [formData, setFormData] = useState({
    order_id: "",
    client_id: "",
    amount: 0,
    payment_method: "Cash",
    payment_date: new Date().toISOString().split('T')[0]
  });

  const fetchData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    const [ordersRes, paymentsRes] = await Promise.all([
      supabase.from('orders').select('*, clients(*)').eq('user_id', user?.id).order('created_at', { ascending: false }),
      supabase.from('payments').select('*, clients(*), orders(product_name)').eq('user_id', user?.id).order('created_at', { ascending: false })
    ]);
    
    setOrders(ordersRes.data || []);
    setPayments(paymentsRes.data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    const channel = supabase
      .channel('payments-realtime-v4')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchData())
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  const totalRevenue = orders.reduce((acc, o) => acc + Number(o.total_amount), 0);
  const totalReceived = payments.reduce((acc, p) => acc + Number(p.amount), 0);
  const totalOutstanding = totalRevenue - totalReceived;

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.order_id || formData.amount <= 0) return toast.error("Valid order and amount required");

    const { data: { user } } = await supabase.auth.getUser();
    const selectedOrder = orders.find(o => o.id === formData.order_id);
    
    const { error } = await supabase
      .from('payments')
      .insert([{
        ...formData,
        client_id: selectedOrder.client_id,
        user_id: user?.id,
        amount: Number(formData.amount)
      }]);
    
    if (error) toast.error("Failed to record payment");
    else {
      // Update order status based on total paid
      const orderPayments = [...payments, { order_id: formData.order_id, amount: formData.amount }]
        .filter(p => p.order_id === formData.order_id)
        .reduce((acc, p) => acc + Number(p.amount), 0);
      
      let newStatus = 'pending';
      if (orderPayments >= selectedOrder.total_amount) newStatus = 'paid';
      else if (orderPayments > 0) newStatus = 'partial';

      await supabase
        .from('orders')
        .update({ payment_status: newStatus })
        .eq('id', formData.order_id);

      toast.success("Payment recorded");
      setIsDialogOpen(false);
      setFormData({
        order_id: "",
        client_id: "",
        amount: 0,
        payment_method: "Cash",
        payment_date: new Date().toISOString().split('T')[0]
      });
      fetchData();
    }
  };

  const filteredOrders = orders.filter(order => 
    order.clients?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.product_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Receivables & Payments</h1>
          <p className="text-zinc-500">Track incoming cashflow and client settlement history.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="shadow-lg shadow-emerald-500/20 bg-emerald-600 hover:bg-emerald-700">
              <Plus className="mr-2 h-4 w-4" /> Collect Payment
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record Client Payment</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddPayment} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Select Active Order</Label>
                <Select value={formData.order_id} onValueChange={(v) => setFormData({...formData, order_id: v})}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Search order / client..." />
                  </SelectTrigger>
                  <SelectContent>
                    {orders.filter(o => o.payment_status !== 'paid').map(o => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.clients?.name} - {o.product_name} (Due: ₹{Number(o.total_amount).toLocaleString()})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Amount Collected (₹)</Label>
                  <Input 
                    type="number" 
                    className="h-12 text-lg font-bold text-emerald-600"
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: parseFloat(e.target.value)})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Payment Method</Label>
                  <Select value={formData.payment_method} onValueChange={(v) => setFormData({...formData, payment_method: v})}>
                    <SelectTrigger className="h-12">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                      <SelectItem value="Cheque">Cheque</SelectItem>
                      <SelectItem value="UPI">UPI / Digital</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Received On</Label>
                <Input 
                  type="date" 
                  value={formData.payment_date}
                  onChange={(e) => setFormData({...formData, payment_date: e.target.value})}
                />
              </div>
              <DialogFooter className="pt-4">
                <Button type="submit" className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 font-bold">Post Payment Entry</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Board */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-emerald-600">Total Collected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-emerald-700">₹{totalReceived.toLocaleString()}</div>
            <div className="flex items-center mt-2 text-xs font-bold text-emerald-600">
              <ArrowUpRight className="h-3 w-3 mr-1" /> Verified income
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-amber-600">Pending Receivables</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-amber-700">₹{totalOutstanding.toLocaleString()}</div>
            <div className="flex items-center mt-2 text-xs font-bold text-amber-600">
              <Clock className="h-3 w-3 mr-1" /> Awaiting settlement
            </div>
          </CardContent>
        </Card>

        <Card className="border-zinc-200 bg-white dark:bg-zinc-900 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-zinc-500">Collection Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-zinc-900 dark:text-zinc-100">
              {totalRevenue > 0 ? Math.round((totalReceived / totalRevenue) * 100) : 100}%
            </div>
            <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-1.5 rounded-full mt-3 overflow-hidden">
               <div 
                 className="bg-emerald-500 h-full transition-all" 
                 style={{ width: `${totalRevenue > 0 ? (totalReceived / totalRevenue) * 100 : 100}%` }} 
               />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <Input
            placeholder="Search by client or product..."
            className="pl-10 h-11"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between px-1">
             <h3 className="font-bold text-zinc-500 uppercase text-xs tracking-widest">Active Receivables</h3>
          </div>
          <div className="rounded-2xl border bg-white dark:bg-zinc-950 shadow-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-zinc-50 dark:bg-zinc-900">
                <TableRow>
                  <TableHead className="font-bold py-4 pl-6">Client / Order</TableHead>
                  <TableHead className="font-bold py-4 text-right">Outstanding</TableHead>
                  <TableHead className="font-bold py-4 text-center">Status</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-20 text-zinc-400">Loading financials...</TableCell>
                  </TableRow>
                ) : filteredOrders.filter(o => o.payment_status !== 'paid').length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-20 text-emerald-500 font-medium italic">All current orders are fully settled!</TableCell>
                  </TableRow>
                ) : filteredOrders.filter(o => o.payment_status !== 'paid').map((order) => {
                  const orderPayments = payments.filter(p => p.order_id === order.id).reduce((acc, p) => acc + Number(p.amount), 0);
                  const due = Number(order.total_amount) - orderPayments;
                  return (
                    <TableRow key={order.id} className="group transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900/40">
                      <TableCell className="pl-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-zinc-900 dark:text-zinc-100">{order.clients?.name}</span>
                          <span className="text-xs text-zinc-500">{order.product_name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right py-4">
                        <div className="flex flex-col items-end">
                          <span className="font-black text-amber-600">₹{due.toLocaleString()}</span>
                          <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-tighter">Total: ₹{Number(order.total_amount).toLocaleString()}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center py-4">
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "rounded-full text-[10px] font-black uppercase tracking-tighter",
                            order.payment_status === 'partial' ? "border-blue-400 text-blue-600 bg-blue-50" : "border-amber-400 text-amber-600 bg-amber-50"
                          )}
                        >
                          {order.payment_status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-4">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-8 rounded-full font-bold opacity-0 group-hover:opacity-100"
                          onClick={() => {
                            setFormData({...formData, order_id: order.id, amount: due});
                            setIsDialogOpen(true);
                          }}
                        >
                          Settle
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Recent Payment History */}
        <Card className="h-fit shadow-md">
          <CardHeader className="border-b bg-zinc-50/50 dark:bg-zinc-900/50 pb-4">
            <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Payment History</CardTitle>
            </div>
            <CardDescription>Recently recorded incoming entries</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y max-h-[600px] overflow-y-auto">
              {payments.length === 0 ? (
                <div className="p-10 text-center text-zinc-400 text-sm">No payment history yet.</div>
              ) : payments.map((p) => (
                <div key={p.id} className="p-4 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors flex items-center justify-between">
                  <div>
                    <p className="font-bold text-sm text-zinc-900 dark:text-zinc-100">{p.clients?.name}</p>
                    <p className="text-[10px] text-zinc-500 font-medium group flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" /> {p.payment_method} • {new Date(p.payment_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-emerald-600">₹{Number(p.amount).toLocaleString()}</p>
                    <p className="text-[9px] text-zinc-400 truncate max-w-[80px]">{p.orders?.product_name}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
