"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { 
  CreditCard, 
  Search, 
  IndianRupee, 
  TrendingUp, 
  Clock, 
  CheckCircle2 
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { toast } from "sonner";

export default function PaymentsPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchPayments = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('orders')
      .select('*, clients(name)')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false });
    
    if (error) toast.error("Failed to fetch payments");
    else setOrders(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchPayments();

    const channel = supabase
      .channel('payments-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => fetchPayments()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const updatePaymentStatus = async (orderId: string, status: string) => {
    const { error } = await supabase
      .from('orders')
      .update({ payment_status: status })
      .eq('id', orderId);
    
    if (error) toast.error("Failed to update status");
    else {
      toast.success("Payment status updated");
      fetchPayments();
    }
  };

  const totals = orders.reduce((acc, order) => {
    const amount = Number(order.total_amount);
    if (order.payment_status === 'paid') acc.paid += amount;
    else if (order.payment_status === 'partial') {
        acc.paid += amount * 0.5; // Simplified for demo
        acc.pending += amount * 0.5;
    } else acc.pending += amount;
    return acc;
  }, { paid: 0, pending: 0 });

  const filteredOrders = orders.filter(order => 
    order.clients?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.product_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payments</h1>
          <p className="text-zinc-500">Track and manage client payments and receivables.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-green-50 dark:bg-green-950/20 border-green-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Collected Revenue</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-700">₹{totals.paid.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pending Receivables</CardTitle>
              <Clock className="h-4 w-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-700">₹{totals.pending.toLocaleString()}</div>
            </CardContent>
          </Card>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
          <Input
            placeholder="Search payments..."
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
              <TableHead>Client</TableHead>
              <TableHead>Order</TableHead>
              <TableHead>Total Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">Loading...</TableCell>
              </TableRow>
            ) : filteredOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-zinc-500">No records found.</TableCell>
              </TableRow>
            ) : filteredOrders.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="font-medium">{order.clients?.name}</TableCell>
                <TableCell>{order.product_name}</TableCell>
                  <TableCell>₹{Number(order.total_amount).toLocaleString()}</TableCell>
                <TableCell>
                  <Badge variant={
                    order.payment_status === 'paid' ? 'default' : 
                    order.payment_status === 'partial' ? 'secondary' : 'outline'
                  }>
                    {order.payment_status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {order.payment_status !== 'paid' && (
                      <Button size="sm" variant="outline" onClick={() => updatePaymentStatus(order.id, 'paid')}>
                        Mark Paid
                      </Button>
                    )}
                    {order.payment_status === 'pending' && (
                      <Button size="sm" variant="ghost" onClick={() => updatePaymentStatus(order.id, 'partial')}>
                        Partial
                      </Button>
                    )}
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
