"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  Package,
  ShoppingCart,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  IndianRupee,
  Box,
  ChevronRight,
  Activity,
  Sparkles,
  Brain,
  Zap,
  Bell,
  CheckCircle2,
  Factory,
  BarChart3,
  AlertCircle
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
  Bar,
  LineChart,
  Line
} from "recharts";

// Sparkline component for KPI cards
const Sparkline = ({ data, color, trend }: { data: number[], color: string, trend: "up" | "down" | "neutral" }) => {
  const sparkData = data.map((value, index) => ({ value, index }));
  return (
    <div className="h-12 w-24">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={sparkData}>
          <defs>
            <linearGradient id={`sparkline-${color}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill={`url(#sparkline-${color})`}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

// Animated counter component
const AnimatedCounter = ({ value, prefix = "", suffix = "" }: { value: number, prefix?: string, suffix?: string }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const duration = 1000;
    const steps = 30;
    const increment = value / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [value]);

  return <span>{prefix}{displayValue.toLocaleString()}{suffix}</span>;
};

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

  // Mock sparkline data
  const revenueSparkline = [12, 15, 13, 18, 20, 17, 22, 25, 23, 28];
  const ordersSparkline = [5, 8, 6, 9, 7, 10, 8, 11, 9, 12];
  const inventorySparkline = [100, 95, 92, 88, 90, 85, 82, 80, 78, 75];
  const paymentsSparkline = [3, 2, 4, 3, 5, 4, 3, 5, 4, 6];

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [statsRes, recentOrdersRes, activityRes, lowStockRes, revenueRes] = await Promise.all([
        fetch("/api/dashboard/stats").then(r => r.json()),
        fetch("/api/dashboard/recent-orders").then(r => r.json()),
        fetch("/api/dashboard/activity").then(r => r.json()),
        fetch("/api/dashboard/low-stock").then(r => r.json()),
        fetch(`/api/dashboard/revenue-chart?range=${timeRange}`).then(r => r.json()),
      ]);

      if (statsRes.error) throw new Error(statsRes.error);

      setStats(statsRes);
      setRecentOrders(recentOrdersRes);
      setRecentActivity(activityRes.map((a: any) => ({
        title: a.message,
        time: a.createdAt,
        type: a.type,
        color: a.type === 'order' ? 'bg-blue-500' : a.type === 'inventory' ? 'bg-amber-500' : a.type === 'client' ? 'bg-emerald-500' : 'bg-purple-500'
      })));
      setLowStockProducts(lowStockRes.slice(0, 3));
      setRevenueData(revenueRes.map((d: any) => ({ name: d.date, total: d.revenue })));
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (date: string) => {
    const now = new Date();
    const then = new Date(date);
    const diff = now.getTime() - then.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, [timeRange]);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  // AI Insights data
  const aiInsights = [
    {
      type: "anomaly",
      title: "Unusual Order Pattern",
      description: "15% increase in orders from ABC Corp this week",
      severity: "info",
      icon: Brain
    },
    {
      type: "prediction",
      title: "Stock Alert Predicted",
      description: "Steel rods likely to hit minimum level in 3 days",
      severity: "warning",
      icon: TrendingDown
    },
    {
      type: "recommendation",
      title: "Optimization Opportunity",
      description: "Consolidate 3 pending shipments to reduce costs by ₹2,500",
      severity: "success",
      icon: Sparkles
    }
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-2">
          <div className="h-8 w-48 bg-muted rounded-lg shimmer" />
          <div className="h-4 w-72 bg-muted rounded-lg shimmer" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-36 bg-muted rounded-xl shimmer" />
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-7">
          <div className="md:col-span-4 h-[400px] bg-muted rounded-xl shimmer" />
          <div className="md:col-span-3 h-[400px] bg-muted rounded-xl shimmer" />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Factory Analytics</h1>
          <p className="text-muted-foreground text-sm">Real-time performance overview for IND Manager Manufacturing.</p>
        </div>
        <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-lg border">
          {(['daily', 'weekly', 'monthly'] as const).map((range) => (
            <Button
              key={range}
              variant="ghost"
              size="sm"
              className={cn(
                "rounded-md text-xs h-8",
                timeRange === range && "bg-background shadow-sm font-semibold"
              )}
              onClick={() => setTimeRange(range)}
            >
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {/* Enhanced KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Revenue Card */}
        <motion.div variants={item}>
          <Card className="overflow-hidden border-none shadow-lg kpi-gradient-primary text-white">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium opacity-90">Total Revenue</CardTitle>
                <div className="flex items-center gap-1 text-emerald-300 text-xs font-medium">
                  <ArrowUpRight className="h-3 w-3" />
                  +12%
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-3xl font-bold tracking-tight">
                    <AnimatedCounter value={stats.totalCollected} prefix="₹" />
                  </div>
                  <p className="text-xs opacity-70 mt-1">
                    of ₹{stats.totalRevenue.toLocaleString()} billed
                  </p>
                </div>
                <Sparkline data={revenueSparkline} color="#10b981" trend="up" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Active Orders Card */}
        <motion.div variants={item}>
          <Card className="overflow-hidden border-none shadow-lg kpi-gradient-success text-white">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium opacity-90">Active Orders</CardTitle>
                <ShoppingCart className="h-4 w-4 opacity-70" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-3xl font-bold tracking-tight">
                    <AnimatedCounter value={stats.activeOrders} />
                  </div>
                  <p className="text-xs opacity-70 mt-1">in production pipeline</p>
                </div>
                <Sparkline data={ordersSparkline} color="#ffffff" trend="up" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Inventory Value Card */}
        <motion.div variants={item}>
          <Card className="overflow-hidden shadow-lg">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">Inventory Value</CardTitle>
                <div className="flex items-center gap-1 text-amber-600 text-xs font-medium">
                  <ArrowDownRight className="h-3 w-3" />
                  -3%
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-3xl font-bold tracking-tight">
                    <AnimatedCounter value={stats.totalStockValue} prefix="₹" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">across all items</p>
                </div>
                <Sparkline data={inventorySparkline} color="#f59e0b" trend="down" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Pending Payments Card */}
        <motion.div variants={item}>
          <Card className={cn(
            "overflow-hidden shadow-lg",
            stats.totalOutstanding > 50000 && "border-amber-500/50"
          )}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">Pending Payments</CardTitle>
                {stats.lowStockItems > 5 && (
                  <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20 text-[10px]">
                    {stats.lowStockItems} alerts
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-3xl font-bold tracking-tight text-amber-600">
                    <AnimatedCounter value={stats.totalOutstanding} prefix="₹" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">outstanding balance</p>
                </div>
                <Sparkline data={paymentsSparkline} color="#ef4444" trend="neutral" />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Revenue Chart - 2 columns */}
        <motion.div variants={item} className="lg:col-span-2">
          <Card className="shadow-lg border-none h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-base">Revenue Trend</CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  {timeRange.charAt(0).toUpperCase() + timeRange.slice(1)} performance analysis
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
                <BarChart3 className="h-3 w-3" />
                View Details
              </Button>
            </CardHeader>
            <CardContent>
              <div className="h-[280px] mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueData}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#059669" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#64748b', fontSize: 11 }}
                      dy={8}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#64748b', fontSize: 11 }}
                      tickFormatter={(value) => `₹${value >= 1000 ? `${value / 1000}k` : value}`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                      }}
                      formatter={(value) => [`₹${Number(value ?? 0).toLocaleString()}`, 'Revenue']}
                    />
                    <Area
                      type="monotone"
                      dataKey="total"
                      stroke="#059669"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorRevenue)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* AI Insights Panel - 1 column */}
        <motion.div variants={item}>
          <Card className="shadow-lg border-none h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-purple-500/10 rounded-lg">
                    <Brain className="h-4 w-4 text-purple-600" />
                  </div>
                  <CardTitle className="text-base">AI Insights</CardTitle>
                </div>
                <Badge variant="secondary" className="text-[10px]">3 new</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {aiInsights.map((insight, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * idx }}
                  className={cn(
                    "p-3 rounded-xl border transition-colors hover:bg-muted/50 cursor-pointer",
                    insight.severity === "warning" && "border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-900",
                    insight.severity === "info" && "border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-900",
                    insight.severity === "success" && "border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20 dark:border-emerald-900"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "p-1.5 rounded-lg shrink-0",
                      insight.severity === "warning" && "bg-amber-500/10 text-amber-600",
                      insight.severity === "info" && "bg-blue-500/10 text-blue-600",
                      insight.severity === "success" && "bg-emerald-500/10 text-emerald-600"
                    )}>
                      <insight.icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{insight.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{insight.description}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
              <Button variant="ghost" className="w-full h-9 text-xs mt-2" asChild>
                <Link href="/dashboard/assistant">
                  View all insights
                  <ChevronRight className="h-3 w-3 ml-1" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Bottom Section */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Recent Orders Table */}
        <motion.div variants={item} className="lg:col-span-3">
          <Card className="shadow-lg border-none overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base">Recent Orders</CardTitle>
                <CardDescription className="text-xs mt-0.5">Latest orders in production</CardDescription>
              </div>
              <Button variant="outline" size="sm" className="h-8 text-xs" asChild>
                <Link href="/dashboard/orders">
                  View All
                  <ChevronRight className="h-3 w-3 ml-1" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="pl-6 text-xs font-semibold">Product</TableHead>
                    <TableHead className="text-xs font-semibold">Client</TableHead>
                    <TableHead className="text-xs font-semibold">Status</TableHead>
                    <TableHead className="text-right pr-6 text-xs font-semibold">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentOrders.slice(0, 5).map((order, idx) => (
                    <TableRow key={order.id} className="hover:bg-muted/30">
                      <TableCell className="pl-6">
                        <div>
                          <p className="font-medium text-sm">{order.product_name}</p>
                          <p className="text-[10px] text-muted-foreground font-mono">
                            {new Date(order.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {order.clients?.name}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] font-medium",
                            order.status === 'completed' && "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
                            order.status === 'processing' && "bg-blue-500/10 text-blue-600 border-blue-500/20",
                            order.status === 'pending' && "bg-amber-500/10 text-amber-600 border-amber-500/20"
                          )}
                        >
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-6 font-semibold text-sm">
                        ₹{Number(order.total_amount).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                  {recentOrders.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">No orders found</p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </motion.div>

        {/* Activity & Stock Panel */}
        <motion.div variants={item} className="lg:col-span-2 space-y-6">
          {/* Low Stock Alert */}
          <Card className="shadow-lg border-none">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <CardTitle className="text-base">Low Stock Alert</CardTitle>
                </div>
                <Badge variant="outline" className="text-amber-600 bg-amber-50 border-amber-200 text-[10px]">
                  {lowStockProducts.length} items
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {lowStockProducts.length > 0 ? lowStockProducts.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-2.5 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div>
                    <p className="text-sm font-medium">{p.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      Current: {p.quantity} {p.unit}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-amber-600 border-amber-300 text-[10px]">
                    Min: {p.min_stock_level}
                  </Badge>
                </div>
              )) : (
                <div className="text-center py-6 text-muted-foreground">
                  <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-500/50" />
                  <p className="text-sm">All stock levels healthy</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="shadow-lg border-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4 text-muted-foreground" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentActivity.slice(0, 4).map((activity, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <div className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0", activity.color)} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{activity.title}</p>
                      <p className="text-[10px] text-muted-foreground">{formatTimeAgo(activity.time)}</p>
                    </div>
                  </div>
                ))}
                {recentActivity.length === 0 && (
                  <div className="text-center py-6 text-muted-foreground">
                    <Clock className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No recent activity</p>
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
