"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Plus, 
  Search, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  Package,
  AlertCircle,
  Phone,
  IndianRupee,
  ShoppingBag,
  ExternalLink,
  Box,
  TrendingUp
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
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function InventoryPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isDeleteDialogOpenConfirm, setIsDeleteDialogOpenConfirm] = useState(false);
    const [itemToDeleteId, setItemToDeleteId] = useState<string | null>(null);
  const [currentItem, setCurrentItem] = useState<any>(null);

  const [formData, setFormData] = useState({
    name: "",
    quantity: 0,
    unit: "kg",
    min_stock_level: 10,
    supplier_whatsapp: "",
    purchase_cost_per_unit: 0
  });

  const fetchInventory = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('inventory')
      .select('*')
      .eq('user_id', user?.id)
      .order('name');
    
    if (error) toast.error("Failed to fetch inventory");
    else setItems(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchInventory();

    const channel = supabase
      .channel('inventory-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory' }, () => fetchInventory())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const totalPurchasingCost = items.reduce((acc, item) => 
    acc + (Number(item.quantity) * Number(item.purchase_cost_per_unit || 0)), 0
  );

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-IN', {
      maximumFractionDigits: 0,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.supplier_whatsapp) {
        toast.error("Supplier WhatsApp is mandatory");
        return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    const payload = {
        ...formData,
        quantity: Number(formData.quantity),
        min_stock_level: Number(formData.min_stock_level),
        purchase_cost_per_unit: Number(formData.purchase_cost_per_unit)
    };

    if (currentItem) {
      const { error } = await supabase
        .from('inventory')
        .update(payload)
        .eq('id', currentItem.id);
      
      if (error) toast.error("Failed to update item");
      else {
        toast.success("Item updated");
        fetchInventory();
        setIsDialogOpen(false);
      }
    } else {
      const { error } = await supabase
        .from('inventory')
        .insert([{ ...payload, user_id: user?.id }]);
      
      if (error) toast.error("Failed to add item");
      else {
        toast.success("Item added");
        fetchInventory();
        setIsDialogOpen(false);
      }
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('inventory')
      .delete()
      .eq('id', id);
    
    if (error) toast.error("Failed to delete item");
    else {
      toast.success("Item deleted");
      fetchInventory();
    }
    setIsDeleteDialogOpenConfirm(false);
    setItemToDeleteId(null);
  };

  const openEditDialog = (item: any) => {
    setCurrentItem(item);
    setFormData({
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      min_stock_level: item.min_stock_level,
      supplier_whatsapp: item.supplier_whatsapp || "",
      purchase_cost_per_unit: item.purchase_cost_per_unit || 0
    });
    setIsDialogOpen(true);
  };

  const handleRestock = (item: any) => {
    const message = `Halo Supplier, I need to restock ${item.name}. My current stock is ${item.quantity} ${item.unit}. Please provide availability and current price.`;
    const whatsappUrl = `https://wa.me/${item.supplier_whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory</h1>
          <p className="text-zinc-500">Track raw materials, costs, and supplier connectivity.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setCurrentItem(null);
            setFormData({ 
              name: "", 
              quantity: 0, 
              unit: "kg", 
              min_stock_level: 10,
              supplier_whatsapp: "",
              purchase_cost_per_unit: 0
            });
          }
        }}>
          <DialogTrigger asChild>
            <Button className="shadow-lg shadow-primary/20">
              <Plus className="mr-2 h-4 w-4" /> Add New Material
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{currentItem ? "Modify Inventory Item" : "New Inventory Item"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Material Name *</Label>
                <Input 
                  id="name" 
                  value={formData.name} 
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g. Polyester Yarn"
                  required 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quantity">Stock Quantity</Label>
                  <Input 
                    id="quantity" 
                    type="number"
                    step="0.01"
                    value={formData.quantity} 
                    onChange={(e) => setFormData({...formData, quantity: parseFloat(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unit">Unit</Label>
                  <Input 
                    id="unit" 
                    value={formData.unit} 
                    placeholder="kg, pcs, meters"
                    onChange={(e) => setFormData({...formData, unit: e.target.value})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="min_stock">Low Stock Alert</Label>
                  <Input 
                    id="min_stock" 
                    type="number"
                    step="0.01"
                    value={formData.min_stock_level} 
                    onChange={(e) => setFormData({...formData, min_stock_level: parseFloat(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cost">Landing Cost / Unit</Label>
                  <Input 
                    id="cost" 
                    type="number"
                    step="0.01"
                    value={formData.purchase_cost_per_unit} 
                    onChange={(e) => setFormData({...formData, purchase_cost_per_unit: parseFloat(e.target.value)})}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="whatsapp" className="text-primary font-bold">Supplier WhatsApp Number *</Label>
                <Input 
                  id="whatsapp" 
                  value={formData.supplier_whatsapp} 
                  onChange={(e) => setFormData({...formData, supplier_whatsapp: e.target.value})}
                  placeholder="e.g. +91 9876543210"
                  required
                />
              </div>
              <DialogFooter className="pt-4">
                <Button type="submit" className="w-full">{currentItem ? "Update Details" : "Save to Inventory"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Board */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-primary text-primary-foreground border-none shadow-xl overflow-hidden relative">
          <div className="absolute -right-4 -top-4 opacity-10">
            <TrendingUp size={120} />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold opacity-90 uppercase tracking-widest">Total Valuation (Landing)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold flex items-center gap-1">
              <span className="text-xl opacity-80">₹</span>
              {formatCurrency(totalPurchasingCost)}
            </div>
            <p className="text-[10px] mt-2 opacity-70 font-medium">Value of {items.length} items in stock</p>
          </CardContent>
        </Card>
        
        <Card className="bg-white dark:bg-zinc-900 border shadow-sm relative overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Total Materials</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
              <Box className="h-6 w-6 text-primary/40" /> {items.length}
            </div>
            <p className="text-[10px] mt-2 text-zinc-400 font-medium">Distinct categories</p>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-zinc-900 border shadow-sm relative overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Critical Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold flex items-center gap-2 text-red-600">
              <AlertCircle className="h-6 w-6 opacity-40" /> {items.filter(i => i.quantity <= i.min_stock_level).length}
            </div>
            <p className="text-[10px] mt-2 text-zinc-400 font-medium">Items below alert level</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input
            placeholder="Filter list by material name..."
            className="pl-10 h-11 bg-white dark:bg-zinc-900"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-2xl border bg-white dark:bg-zinc-950 shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-zinc-50 dark:bg-zinc-900">
            <TableRow className="hover:bg-transparent">
              <TableHead className="font-bold py-4">Item & Supplier</TableHead>
              <TableHead className="font-bold py-4">Stock Level</TableHead>
              <TableHead className="font-bold py-4">Unit Cost</TableHead>
              <TableHead className="font-bold py-4">Status</TableHead>
              <TableHead className="w-[120px] py-4"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-20 text-zinc-400">Loading stock logs...</TableCell>
              </TableRow>
            ) : filteredItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-20 text-zinc-500 font-medium">No results found.</TableCell>
              </TableRow>
            ) : filteredItems.map((item) => {
              const isLowStock = item.quantity <= item.min_stock_level;
              return (
                <TableRow key={item.id} className="group hover:bg-zinc-50 dark:hover:bg-zinc-900/40">
                  <TableCell className="py-4">
                    <div className="flex items-center">
                      <div className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg mr-3">
                        <Package className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-zinc-900 dark:text-zinc-100">{item.name}</span>
                        <div className="flex items-center text-xs text-primary font-medium mt-1">
                          <Phone className="h-3 w-3 mr-1" /> {item.supplier_whatsapp}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-lg">{item.quantity} {item.unit}</span>
                      <span className="text-[10px] text-zinc-500 uppercase tracking-tighter">Min: {item.min_stock_level} {item.unit}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <span className="font-semibold text-zinc-700 dark:text-zinc-300">₹{Number(item.purchase_cost_per_unit || 0).toLocaleString('en-IN')}</span>
                  </TableCell>
                  <TableCell className="py-4">
                    {isLowStock ? (
                      <Badge variant="destructive" className="flex items-center h-7 gap-1 px-3 rounded-full animate-pulse">
                        <AlertCircle className="h-3 w-3" /> RESTOCK
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50 h-7 px-3 rounded-full">
                        In Stock
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {isLowStock && (
                        <Button 
                          size="sm" 
                          className="bg-green-600 hover:bg-green-700 text-white h-8 px-3 rounded-full font-bold text-xs"
                          onClick={() => handleRestock(item)}
                        >
                          Restock
                        </Button>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-zinc-200 dark:hover:bg-zinc-800">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(item)}>
                            <Edit2 className="mr-2 h-4 w-4" /> Edit Item
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(item.id)}>
                            <Trash2 className="mr-2 h-4 w-4" /> Mark as Removed
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
