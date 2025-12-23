"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { 
  Users, 
  Package, 
  ShoppingCart, 
  TrendingUp, 
  AlertTriangle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  IndianRupee,
  Box,
  ChevronRight,
  Activity
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
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar
} from "recharts";

export default function DashboardPage() {
  const [timeRange, setTimeRange] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [stats, setStats] = useState({
    totalClients: 0,
    newClientsThisWeek: 0,
    activeOrders: 0,
    totalRevenue: 0,
    totalCollected: 0,
    totalOutstanding: 0,
    lowStockItems: 0,
    totalStockValue: 0,
    revenueGrowth: 0,
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Fetch Clients
      const { data: clientsData } = await supabase
        .from('clients')
        .select('created_at')
        .eq('user_id', user.id);
      
      const clientCount = clientsData?.length || 0;
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const newClientsThisWeek = clientsData?.filter(c => new Date(c.created_at) >= oneWeekAgo).length || 0;

      // 2. Fetch Orders for Stats and Chart
      const { data: allOrders } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user.id);

      const activeOrders = allOrders?.filter(o => o.status !== 'completed').length || 0;
      const totalRevenue = allOrders?.reduce((acc, o) => acc + Number(o.total_amount), 0) || 0;

      // Calculate Revenue Growth
      const now = new Date();
      let currentPeriodRevenue = 0;
      let previousPeriodRevenue = 0;

      if (timeRange === 'daily') {
        const periodStart = new Date(now);
        periodStart.setDate(now.getDate() - 7);
        const prevPeriodStart = new Date(periodStart);
        prevPeriodStart.setDate(periodStart.getDate() - 7);

        currentPeriodRevenue = allOrders?.filter(o => {
          const d = new Date(o.created_at);
          return d >= periodStart && d <= now;
        }).reduce((acc, o) => acc + Number(o.total_amount), 0) || 0;

        previousPeriodRevenue = allOrders?.filter(o => {
          const d = new Date(o.created_at);
          return d >= prevPeriodStart && d < periodStart;
        }).reduce((acc, o) => acc + Number(o.total_amount), 0) || 0;
      } else if (timeRange === 'weekly') {
        const periodStart = new Date(now);
        periodStart.setDate(now.getDate() - 28);
        const prevPeriodStart = new Date(periodStart);
        prevPeriodStart.setDate(periodStart.getDate() - 28);

        currentPeriodRevenue = allOrders?.filter(o => {
          const d = new Date(o.created_at);
          return d >= periodStart && d <= now;
        }).reduce((acc, o) => acc + Number(o.total_amount), 0) || 0;

        previousPeriodRevenue = allOrders?.filter(o => {
          const d = new Date(o.created_at);
          return d >= prevPeriodStart && d < periodStart;
        }).reduce((acc, o) => acc + Number(o.total_amount), 0) || 0;
      } else {
        const periodStart = new Date(now);
        periodStart.setMonth(now.getMonth() - 6);
        const prevPeriodStart = new Date(periodStart);
        prevPeriodStart.setMonth(periodStart.getMonth() - 6);

        currentPeriodRevenue = allOrders?.filter(o => {
          const d = new Date(o.created_at);
          return d >= periodStart && d <= now;
        }).reduce((acc, o) => acc + Number(o.total_amount), 0) || 0;

        previousPeriodRevenue = allOrders?.filter(o => {
          const d = new Date(o.created_at);
          return d >= prevPeriodStart && d < periodStart;
        }).reduce((acc, o) => acc + Number(o.total_amount), 0) || 0;
      }

      const revenueGrowth = previousPeriodRevenue === 0 
        ? (currentPeriodRevenue > 0 ? 100 : 0) 
        : Math.round(((currentPeriodRevenue - previousPeriodRevenue) / previousPeriodRevenue) * 100);

      // 3. Fetch Payments for Stats
      const { data: allPayments } = await supabase
        .from('payments')
        .select('amount')
        .eq('user_id', user.id);

      const totalCollected = allPayments?.reduce((acc, p) => acc + Number(p.amount), 0) || 0;
      const totalOutstanding = totalRevenue - totalCollected;

      // 4. Process Revenue Data for Chart
      const chartData = processRevenueData(allOrders || [], timeRange);
      setRevenueData(chartData);

      // 5. Fetch Inventory
      const { data: inventoryData } = await supabase
        .from('inventory')
        .select('*')
        .eq('user_id', user.id);
      
      const lowStockItems = inventoryData?.filter(item => Number(item.quantity) <= Number(item.min_stock_level)) || [];
      const totalStockValue = inventoryData?.reduce((acc, item) => acc + (Number(item.quantity) * Number(item.purchase_cost_per_unit || 0)), 0) || 0;

      // 6. Fetch Recent Orders
      const { data: recent } = await supabase
        .from('orders')
        .select('*, clients(name)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(6);

      // 7. Fetch Recent Activity
      const activity = await fetchActivityFeed(user.id);
      setRecentActivity(activity);

      setStats({
        totalClients: clientCount || 0,
        newClientsThisWeek,
        activeOrders,
        totalRevenue,
        totalCollected,
        totalOutstanding,
        lowStockItems: lowStockItems.length,
        totalStockValue,
        revenueGrowth: 0, // Simplified for performance
      });
      setRecentOrders(recent || []);
      setLowStockProducts(lowStockItems.slice(0, 3));
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const processRevenueData = (orders: any[], range: string) => {
    const now = new Date();
    const data: { name: string, total: number }[] = [];

    if (range === 'daily') {
      // Last 7 days
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
        const dayTotal = orders
          .filter(o => new Date(o.created_at).toDateString() === d.toDateString())
          .reduce((acc, o) => acc + Number(o.total_amount), 0);
        data.push({ name: dayName, total: dayTotal });
      }
    } else if (range === 'weekly') {
      // Last 4 weeks
      for (let i = 3; i >= 0; i--) {
        const start = new Date();
        start.setDate(now.getDate() - (i * 7 + 6));
        const end = new Date();
        end.setDate(now.getDate() - (i * 7));
        
        const weekTotal = orders
          .filter(o => {
            const date = new Date(o.created_at);
            return date >= start && date <= end;
          })
          .reduce((acc, o) => acc + Number(o.total_amount), 0);
        data.push({ name: `Week ${4-i}`, total: weekTotal });
      }
    } else {
      // Last 6 months
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(now.getMonth() - i);
        const monthName = d.toLocaleDateString('en-US', { month: 'short' });
        const monthTotal = orders
          .filter(o => {
            const date = new Date(o.created_at);
            return date.getMonth() === d.getMonth() && date.getFullYear() === d.getFullYear();
          })
          .reduce((acc, o) => acc + Number(o.total_amount), 0);
        data.push({ name: monthName, total: monthTotal });
      }
    }
    return data;
  };

  const fetchActivityFeed = async (userId: string) => {
    const [orders, inventory, clients, payments] = await Promise.all([
      supabase.from('orders').select('product_name, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(3),
      supabase.from('inventory').select('name, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(3),
      supabase.from('clients').select('name, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(3),
      supabase.from('payments').select('amount, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(3),
    ]);

    const feed: any[] = [
      ...(orders.data?.map(o => ({ title: `New order: ${o.product_name}`, time: o.created_at, type: 'order', color: 'bg-accent' })) || []),
      ...(inventory.data?.map(i => ({ title: `Stock added: ${i.name}`, time: i.created_at, type: 'stock', color: 'bg-chart-3' })) || []),
      ...(clients.data?.map(c => ({ title: `New client: ${c.name}`, time: c.created_at, type: 'client', color: 'bg-primary' })) || []),
      ...(payments.data?.map(p => ({ title: `Payment received: ₹${p.amount}`, time: p.created_at, type: 'payment', color: 'bg-emerald-500' })) || []),
    ];

    return feed.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 5);
  };

  const formatTimeAgo = (date: string) => {
    const now = new Date();
    const then = new Date(date);
    const diff = now.getTime() - then.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 60) return `${minutes} mins ago`;
    if (hours < 24) return `${hours} hours ago`;
    return `${days} days ago`;
  };

  useEffect(() => {
    fetchDashboardData();

    // Set up Real-time subscriptions
      const channel = supabase
        .channel('dashboard-all-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, () => fetchDashboardData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchDashboardData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory' }, () => fetchDashboardData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => fetchDashboardData())
        .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [timeRange]);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  if (loading) {
    return (
      <div className="grid gap-6">
        <div className="flex flex-col gap-2">
          <div className="h-10 w-48 bg-muted animate-pulse rounded-lg" />
          <div className="h-5 w-72 bg-muted animate-pulse rounded-lg" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-7">
          <div className="md:col-span-4 h-[400px] bg-muted animate-pulse rounded-xl" />
          <div className="md:col-span-3 h-[400px] bg-muted animate-pulse rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-8"
    >
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Factory Analytics</h1>
          <p className="text-muted-foreground">Performance overview for IND Manager Manufacturing.</p>
        </div>
        <div className="flex items-center gap-2 bg-card p-1 rounded-xl border shadow-sm">
          <Button 
            variant="ghost" 
            size="sm" 
            className={cn("rounded-lg", timeRange === 'daily' && "bg-accent text-accent-foreground shadow-sm")}
            onClick={() => setTimeRange('daily')}
          >
            Daily
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className={cn("rounded-lg", timeRange === 'weekly' && "bg-accent text-accent-foreground shadow-sm")}
            onClick={() => setTimeRange('weekly')}
          >
            Weekly
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className={cn("rounded-lg", timeRange === 'monthly' && "bg-accent text-accent-foreground shadow-sm")}
            onClick={() => setTimeRange('monthly')}
          >
            Monthly
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <motion.div variants={item}>
          <Card className="relative overflow-hidden group hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 border-none bg-primary text-primary-foreground">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
              <IndianRupee size={80} />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium opacity-80">Collected Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tracking-tight">₹{stats.totalCollected.toLocaleString()}</div>
              <div className="flex items-center mt-2 text-xs font-medium text-accent">
                <span>Total from {stats.totalRevenue.toLocaleString()} billed</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="group hover:shadow-xl hover:shadow-amber-500/5 transition-all duration-300 border-amber-200 bg-amber-50/50 dark:bg-amber-950/10">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-amber-600">Pending Arrears</CardTitle>
              <div className="p-2 bg-amber-100 rounded-lg">
                <Clock className="h-4 w-4 text-amber-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tracking-tight text-amber-700">₹{stats.totalOutstanding.toLocaleString()}</div>
              <div className="mt-3">
                <div className="flex items-center justify-between text-[10px] uppercase font-bold text-amber-600 mb-1">
                  <span>Recovery Efficiency</span>
                  <span>{stats.totalRevenue > 0 ? Math.round((stats.totalCollected / stats.totalRevenue) * 100) : 100}%</span>
                </div>
                <Progress 
                  value={stats.totalRevenue > 0 ? (stats.totalCollected / stats.totalRevenue) * 100 : 100} 
                  className="h-1.5 bg-amber-100" 
                  indicatorClassName="bg-amber-500" 
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="group hover:shadow-xl transition-all duration-300 border-border bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Orders</CardTitle>
              <div className="p-2 bg-accent/10 rounded-lg group-hover:bg-accent/20 transition-colors">
                <ShoppingCart className="h-4 w-4 text-accent" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tracking-tight">{stats.activeOrders}</div>
              <div className="flex items-center mt-2 text-xs text-muted-foreground">
                <span className="flex items-center text-chart-2 font-medium">
                  Currently in production
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className={cn(
            "group hover:shadow-xl transition-all duration-300 border-border",
            stats.lowStockItems > 0 ? "border-chart-3/30 bg-chart-3/5" : "bg-card"
          )}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Inventory Alerts</CardTitle>
              <div className={cn(
                "p-2 rounded-lg transition-colors",
                stats.lowStockItems > 0 ? "bg-chart-3/20" : "bg-muted"
              )}>
                <AlertTriangle className={cn("h-4 w-4", stats.lowStockItems > 0 ? "text-chart-3" : "text-muted-foreground")} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tracking-tight">{stats.lowStockItems}</div>
              <p className="text-xs text-muted-foreground mt-2">
                {stats.lowStockItems > 0 ? `${stats.lowStockItems} items need restocking` : "All stock levels healthy"}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid gap-6 md:grid-cols-7">
        {/* Revenue Chart */}
        <motion.div variants={item} className="md:col-span-4">
          <Card className="h-full border-none shadow-md bg-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Revenue Trend</CardTitle>
                <CardDescription>{timeRange.charAt(0).toUpperCase() + timeRange.slice(1)} financial performance</CardDescription>
              </div>
              <div className="p-2 bg-muted rounded-lg cursor-pointer hover:bg-muted/80 transition-colors">
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueData}>
                    <defs>
                      <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="oklch(0.7 0.15 140)" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="oklch(0.7 0.15 140)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="oklch(0.9 0.02 240)" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: 'oklch(0.5 0.02 240)', fontSize: 12 }}
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: 'oklch(0.5 0.02 240)', fontSize: 12 }}
                      tickFormatter={(value) => `₹${value}`}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'oklch(1 0 0)', 
                        border: '1px solid oklch(0.9 0.02 240)',
                        borderRadius: '12px',
                        boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'
                      }} 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="total" 
                      stroke="oklch(0.7 0.15 140)" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorTotal)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Order Status / Inventory Overview */}
        <motion.div variants={item} className="md:col-span-3">
          <Card className="h-full border-none shadow-md bg-card">
            <CardHeader>
              <CardTitle className="text-lg">Stock Management</CardTitle>
              <CardDescription>Value and low-stock indicators</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 bg-muted/50 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Box className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Inventory Value</p>
                    <p className="text-xl font-bold">₹{stats.totalStockValue.toLocaleString('en-IN')}</p>
                  </div>
                </div>
                <div className="h-12 w-24">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={revenueData.slice(-4)}>
                      <Bar dataKey="total" fill="oklch(0.3 0.05 240)" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-chart-3" />
                    Restock Required
                  </h4>
                  <Link href="/dashboard/inventory" className="text-xs text-primary font-bold hover:underline">View All</Link>
                </div>
                <div className="space-y-3">
                  {lowStockProducts.length > 0 ? lowStockProducts.map((p) => (
                    <div key={p.id} className="flex items-center justify-between p-3 border rounded-xl hover:bg-muted/50 transition-colors">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{p.name}</span>
                        <span className="text-xs text-muted-foreground">Current: {p.quantity} {p.unit}</span>
                      </div>
                      <Badge variant="outline" className="border-chart-3 text-chart-3">
                        Min: {p.min_stock_level}
                      </Badge>
                    </div>
                  )) : (
                    <div className="text-center py-6 text-muted-foreground bg-muted/20 rounded-xl">
                      <Activity className="h-8 w-8 mx-auto mb-2 opacity-20" />
                      <p className="text-sm">Stock is looking good!</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid gap-6 md:grid-cols-7">
        {/* Recent Orders Table */}
        <motion.div variants={item} className="md:col-span-5">
          <Card className="border-none shadow-md overflow-hidden bg-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Recent Orders</CardTitle>
                <CardDescription>Last 6 orders placed in the factory</CardDescription>
              </div>
              <Link href="/dashboard/orders">
                <Button variant="outline" size="sm" className="rounded-lg font-bold gap-2">
                  All Orders <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="pl-6 font-bold text-xs uppercase text-muted-foreground tracking-wider">Product</TableHead>
                    <TableHead className="font-bold text-xs uppercase text-muted-foreground tracking-wider">Client</TableHead>
                    <TableHead className="font-bold text-xs uppercase text-muted-foreground tracking-wider">Status</TableHead>
                    <TableHead className="text-right pr-6 font-bold text-xs uppercase text-muted-foreground tracking-wider">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentOrders.map((order) => (
                    <TableRow key={order.id} className="hover:bg-muted/30 transition-colors border-border">
                      <TableCell className="pl-6">
                        <div className="flex flex-col">
                          <span className="font-bold text-sm">{order.product_name}</span>
                          <span className="text-[10px] text-muted-foreground font-mono">{new Date(order.created_at).toLocaleDateString()}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground font-medium">{order.clients?.name}</span>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          className={cn(
                            "rounded-full px-2 py-0 h-5 text-[10px] font-bold uppercase tracking-tighter",
                            order.status === 'completed' ? "bg-accent/10 text-accent border-accent/20" : 
                            order.status === 'processing' ? "bg-primary/10 text-primary border-primary/20" :
                            "bg-chart-3/10 text-chart-3 border-chart-3/20"
                          )}
                          variant="outline"
                        >
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <span className="font-bold text-sm">₹{Number(order.total_amount).toLocaleString()}</span>
                      </TableCell>
                    </TableRow>
                  ))}
                  {recentOrders.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-10 text-muted-foreground bg-muted/5">
                        No orders found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Activity Timeline */}
        <motion.div variants={item} className="md:col-span-2">
          <Card className="h-full border-none shadow-md bg-card">
            <CardHeader>
              <CardTitle className="text-lg">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative space-y-6 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-border before:via-border before:to-transparent">
                {recentActivity.map((activity, idx) => (
                  <div key={idx} className="relative flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className={cn("relative w-10 h-10 rounded-full flex items-center justify-center ring-4 ring-background shadow-sm", activity.color)}>
                        <Clock className="h-4 w-4 text-white" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-foreground">{activity.title}</span>
                        <span className="text-xs text-muted-foreground">{formatTimeAgo(activity.time)}</span>
                      </div>
                    </div>
                  </div>
                ))}
                {recentActivity.length === 0 && (
                  <div className="text-center py-10 text-muted-foreground">
                    No recent activity
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { 
  Users, 
  Package, 
  ShoppingCart, 
  TrendingUp, 
  AlertTriangle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  IndianRupee,
  Box,
  ChevronRight,
  Activity
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
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar
} from "recharts";

export default function DashboardPage() {
  const [timeRange, setTimeRange] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [stats, setStats] = useState({
    totalClients: 0,
    newClientsThisWeek: 0,
    activeOrders: 0,
    totalRevenue: 0,
    totalCollected: 0,
    totalOutstanding: 0,
    lowStockItems: 0,
    totalStockValue: 0,
    revenueGrowth: 0,
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Fetch Clients
      const { count: clientCount, data: clientsData } = await supabase
        .from('clients')
        .select('created_at', { count: 'exact' })
        .eq('user_id', user.id);
      
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const newClientsThisWeek = clientsData?.filter(c => new Date(c.created_at) >= oneWeekAgo).length || 0;

      // 2. Fetch Orders for Stats and Chart
      const { data: allOrders } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user.id);

      const activeOrders = allOrders?.filter(o => o.status !== 'completed').length || 0;
      const totalRevenue = allOrders?.reduce((acc, o) => acc + Number(o.total_amount), 0) || 0;

      // 3. Fetch Payments for Stats
      const { data: allPayments } = await supabase
        .from('payments')
        .select('amount')
        .eq('user_id', user.id);

      const totalCollected = allPayments?.reduce((acc, p) => acc + Number(p.amount), 0) || 0;
      const totalOutstanding = totalRevenue - totalCollected;

      // 4. Process Revenue Data for Chart
      const chartData = processRevenueData(allOrders || [], timeRange);
      setRevenueData(chartData);

      // 5. Fetch Inventory
      const { data: inventoryData } = await supabase
        .from('inventory')
        .select('*')
        .eq('user_id', user.id);
      
      const lowStockItems = inventoryData?.filter(item => Number(item.quantity) <= Number(item.min_stock_level)) || [];
      const totalStockValue = inventoryData?.reduce((acc, item) => acc + (Number(item.quantity) * Number(item.purchase_cost_per_unit || 0)), 0) || 0;

      // 6. Fetch Recent Orders
      const { data: recent } = await supabase
        .from('orders')
        .select('*, clients(name)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(6);

      // 7. Fetch Recent Activity
      const activity = await fetchActivityFeed(user.id);
      setRecentActivity(activity);

      setStats({
        totalClients: clientCount || 0,
        newClientsThisWeek,
        activeOrders,
        totalRevenue,
        totalCollected,
        totalOutstanding,
        lowStockItems: lowStockItems.length,
        totalStockValue,
        revenueGrowth: 0, // Simplified for performance
      });
      setRecentOrders(recent || []);
      setLowStockProducts(lowStockItems.slice(0, 3));
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const processRevenueData = (orders: any[], range: string) => {
    const now = new Date();
    const data: { name: string, total: number }[] = [];

    if (range === 'daily') {
      // Last 7 days
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
        const dayTotal = orders
          .filter(o => new Date(o.created_at).toDateString() === d.toDateString())
          .reduce((acc, o) => acc + Number(o.total_amount), 0);
        data.push({ name: dayName, total: dayTotal });
      }
    } else if (range === 'weekly') {
      // Last 4 weeks
      for (let i = 3; i >= 0; i--) {
        const start = new Date();
        start.setDate(now.getDate() - (i * 7 + 6));
        const end = new Date();
        end.setDate(now.getDate() - (i * 7));
        
        const weekTotal = orders
          .filter(o => {
            const date = new Date(o.created_at);
            return date >= start && date <= end;
          })
          .reduce((acc, o) => acc + Number(o.total_amount), 0);
        data.push({ name: `Week ${4-i}`, total: weekTotal });
      }
    } else {
      // Last 6 months
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(now.getMonth() - i);
        const monthName = d.toLocaleDateString('en-US', { month: 'short' });
        const monthTotal = orders
          .filter(o => {
            const date = new Date(o.created_at);
            return date.getMonth() === d.getMonth() && date.getFullYear() === d.getFullYear();
          })
          .reduce((acc, o) => acc + Number(o.total_amount), 0);
        data.push({ name: monthName, total: monthTotal });
      }
    }
    return data;
  };

  const fetchActivityFeed = async (userId: string) => {
    const [orders, inventory, clients, payments] = await Promise.all([
      supabase.from('orders').select('product_name, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(3),
      supabase.from('inventory').select('name, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(3),
      supabase.from('clients').select('name, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(3),
      supabase.from('payments').select('amount, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(3),
    ]);

    const feed: any[] = [
      ...(orders.data?.map(o => ({ title: `New order: ${o.product_name}`, time: o.created_at, type: 'order', color: 'bg-accent' })) || []),
      ...(inventory.data?.map(i => ({ title: `Stock added: ${i.name}`, time: i.created_at, type: 'stock', color: 'bg-chart-3' })) || []),
      ...(clients.data?.map(c => ({ title: `New client: ${c.name}`, time: c.created_at, type: 'client', color: 'bg-primary' })) || []),
      ...(payments.data?.map(p => ({ title: `Payment received: ₹${p.amount}`, time: p.created_at, type: 'payment', color: 'bg-emerald-500' })) || []),
    ];

    return feed.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 5);
  };

  const formatTimeAgo = (date: string) => {
    const now = new Date();
    const then = new Date(date);
    const diff = now.getTime() - then.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 60) return `${minutes} mins ago`;
    if (hours < 24) return `${hours} hours ago`;
    return `${days} days ago`;
  };

  useEffect(() => {
    fetchDashboardData();

    // Set up Real-time subscriptions
      const channel = supabase
        .channel('dashboard-all-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, () => fetchDashboardData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchDashboardData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory' }, () => fetchDashboardData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => fetchDashboardData())
        .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [timeRange]);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  if (loading) {
    return (
      <div className="grid gap-6">
        <div className="flex flex-col gap-2">
          <div className="h-10 w-48 bg-muted animate-pulse rounded-lg" />
          <div className="h-5 w-72 bg-muted animate-pulse rounded-lg" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-7">
          <div className="md:col-span-4 h-[400px] bg-muted animate-pulse rounded-xl" />
          <div className="md:col-span-3 h-[400px] bg-muted animate-pulse rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-8"
    >
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Factory Analytics</h1>
          <p className="text-muted-foreground">Performance overview for IND Manager Manufacturing.</p>
        </div>
        <div className="flex items-center gap-2 bg-card p-1 rounded-xl border shadow-sm">
          <Button 
            variant="ghost" 
            size="sm" 
            className={cn("rounded-lg", timeRange === 'daily' && "bg-accent text-accent-foreground shadow-sm")}
            onClick={() => setTimeRange('daily')}
          >
            Daily
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className={cn("rounded-lg", timeRange === 'weekly' && "bg-accent text-accent-foreground shadow-sm")}
            onClick={() => setTimeRange('weekly')}
          >
            Weekly
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className={cn("rounded-lg", timeRange === 'monthly' && "bg-accent text-accent-foreground shadow-sm")}
            onClick={() => setTimeRange('monthly')}
          >
            Monthly
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <motion.div variants={item}>
          <Card className="relative overflow-hidden group hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 border-none bg-primary text-primary-foreground">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
              <IndianRupee size={80} />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium opacity-80">Collected Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tracking-tight">₹{stats.totalCollected.toLocaleString()}</div>
              <div className="flex items-center mt-2 text-xs font-medium text-accent">
                <span>Total from {stats.totalRevenue.toLocaleString()} billed</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="group hover:shadow-xl hover:shadow-amber-500/5 transition-all duration-300 border-amber-200 bg-amber-50/50 dark:bg-amber-950/10">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-amber-600">Pending Arrears</CardTitle>
              <div className="p-2 bg-amber-100 rounded-lg">
                <Clock className="h-4 w-4 text-amber-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tracking-tight text-amber-700">₹{stats.totalOutstanding.toLocaleString()}</div>
              <div className="mt-3">
                <div className="flex items-center justify-between text-[10px] uppercase font-bold text-amber-600 mb-1">
                  <span>Recovery Efficiency</span>
                  <span>{stats.totalRevenue > 0 ? Math.round((stats.totalCollected / stats.totalRevenue) * 100) : 100}%</span>
                </div>
                <Progress 
                  value={stats.totalRevenue > 0 ? (stats.totalCollected / stats.totalRevenue) * 100 : 100} 
                  className="h-1.5 bg-amber-100" 
                  indicatorClassName="bg-amber-500" 
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="group hover:shadow-xl transition-all duration-300 border-border bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Orders</CardTitle>
              <div className="p-2 bg-accent/10 rounded-lg group-hover:bg-accent/20 transition-colors">
                <ShoppingCart className="h-4 w-4 text-accent" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tracking-tight">{stats.activeOrders}</div>
              <div className="flex items-center mt-2 text-xs text-muted-foreground">
                <span className="flex items-center text-chart-2 font-medium">
                  Currently in production
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className={cn(
            "group hover:shadow-xl transition-all duration-300 border-border",
            stats.lowStockItems > 0 ? "border-chart-3/30 bg-chart-3/5" : "bg-card"
          )}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Inventory Alerts</CardTitle>
              <div className={cn(
                "p-2 rounded-lg transition-colors",
                stats.lowStockItems > 0 ? "bg-chart-3/20" : "bg-muted"
              )}>
                <AlertTriangle className={cn("h-4 w-4", stats.lowStockItems > 0 ? "text-chart-3" : "text-muted-foreground")} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tracking-tight">{stats.lowStockItems}</div>
              <p className="text-xs text-muted-foreground mt-2">
                {stats.lowStockItems > 0 ? `${stats.lowStockItems} items need restocking` : "All stock levels healthy"}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid gap-6 md:grid-cols-7">
        {/* Revenue Chart */}
        <motion.div variants={item} className="md:col-span-4">
          <Card className="h-full border-none shadow-md bg-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Revenue Trend</CardTitle>
                <CardDescription>{timeRange.charAt(0).toUpperCase() + timeRange.slice(1)} financial performance</CardDescription>
              </div>
              <div className="p-2 bg-muted rounded-lg cursor-pointer hover:bg-muted/80 transition-colors">
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueData}>
                    <defs>
                      <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="oklch(0.7 0.15 140)" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="oklch(0.7 0.15 140)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="oklch(0.9 0.02 240)" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: 'oklch(0.5 0.02 240)', fontSize: 12 }}
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: 'oklch(0.5 0.02 240)', fontSize: 12 }}
                      tickFormatter={(value) => `₹${value}`}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'oklch(1 0 0)', 
                        border: '1px solid oklch(0.9 0.02 240)',
                        borderRadius: '12px',
                        boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'
                      }} 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="total" 
                      stroke="oklch(0.7 0.15 140)" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorTotal)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Order Status / Inventory Overview */}
        <motion.div variants={item} className="md:col-span-3">
          <Card className="h-full border-none shadow-md bg-card">
            <CardHeader>
              <CardTitle className="text-lg">Stock Management</CardTitle>
              <CardDescription>Value and low-stock indicators</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 bg-muted/50 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Box className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Inventory Value</p>
                    <p className="text-xl font-bold">₹{stats.totalStockValue.toLocaleString('en-IN')}</p>
                  </div>
                </div>
                <div className="h-12 w-24">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={revenueData.slice(-4)}>
                      <Bar dataKey="total" fill="oklch(0.3 0.05 240)" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-chart-3" />
                    Restock Required
                  </h4>
                  <Link href="/dashboard/inventory" className="text-xs text-primary font-bold hover:underline">View All</Link>
                </div>
                <div className="space-y-3">
                  {lowStockProducts.length > 0 ? lowStockProducts.map((p) => (
                    <div key={p.id} className="flex items-center justify-between p-3 border rounded-xl hover:bg-muted/50 transition-colors">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{p.name}</span>
                        <span className="text-xs text-muted-foreground">Current: {p.quantity} {p.unit}</span>
                      </div>
                      <Badge variant="outline" className="border-chart-3 text-chart-3">
                        Min: {p.min_stock_level}
                      </Badge>
                    </div>
                  )) : (
                    <div className="text-center py-6 text-muted-foreground bg-muted/20 rounded-xl">
                      <Activity className="h-8 w-8 mx-auto mb-2 opacity-20" />
                      <p className="text-sm">Stock is looking good!</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid gap-6 md:grid-cols-7">
        {/* Recent Orders Table */}
        <motion.div variants={item} className="md:col-span-5">
          <Card className="border-none shadow-md overflow-hidden bg-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Recent Orders</CardTitle>
                <CardDescription>Last 6 orders placed in the factory</CardDescription>
              </div>
              <Link href="/dashboard/orders">
                <Button variant="outline" size="sm" className="rounded-lg font-bold gap-2">
                  All Orders <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="pl-6 font-bold text-xs uppercase text-muted-foreground tracking-wider">Product</TableHead>
                    <TableHead className="font-bold text-xs uppercase text-muted-foreground tracking-wider">Client</TableHead>
                    <TableHead className="font-bold text-xs uppercase text-muted-foreground tracking-wider">Status</TableHead>
                    <TableHead className="text-right pr-6 font-bold text-xs uppercase text-muted-foreground tracking-wider">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentOrders.map((order) => (
                    <TableRow key={order.id} className="hover:bg-muted/30 transition-colors border-border">
                      <TableCell className="pl-6">
                        <div className="flex flex-col">
                          <span className="font-bold text-sm">{order.product_name}</span>
                          <span className="text-[10px] text-muted-foreground font-mono">{new Date(order.created_at).toLocaleDateString()}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground font-medium">{order.clients?.name}</span>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          className={cn(
                            "rounded-full px-2 py-0 h-5 text-[10px] font-bold uppercase tracking-tighter",
                            order.status === 'completed' ? "bg-accent/10 text-accent border-accent/20" : 
                            order.status === 'processing' ? "bg-primary/10 text-primary border-primary/20" :
                            "bg-chart-3/10 text-chart-3 border-chart-3/20"
                          )}
                          variant="outline"
                        >
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <span className="font-bold text-sm">₹{Number(order.total_amount).toLocaleString()}</span>
                      </TableCell>
                    </TableRow>
                  ))}
                  {recentOrders.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-10 text-muted-foreground bg-muted/5">
                        No orders found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Activity Timeline */}
        <motion.div variants={item} className="md:col-span-2">
          <Card className="h-full border-none shadow-md bg-card">
            <CardHeader>
              <CardTitle className="text-lg">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative space-y-6 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-border before:via-border before:to-transparent">
                {recentActivity.map((activity, idx) => (
                  <div key={idx} className="relative flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className={cn("relative w-10 h-10 rounded-full flex items-center justify-center ring-4 ring-background shadow-sm", activity.color)}>
                        <Clock className="h-4 w-4 text-white" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-foreground">{activity.title}</span>
                        <span className="text-xs text-muted-foreground">{formatTimeAgo(activity.time)}</span>
                      </div>
                    </div>
                  </div>
                ))}
                {recentActivity.length === 0 && (
                  <div className="text-center py-10 text-muted-foreground">
                    No recent activity
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
