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
  ArrowUpCircle,
  ArrowDownCircle
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

export default function InventoryPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<any>(null);

  const [formData, setFormData] = useState({
    name: "",
    quantity: 0,
    unit: "kg",
    min_stock_level: 10
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
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'inventory' },
        () => fetchInventory()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();

    if (currentItem) {
      const { error } = await supabase
        .from('inventory')
        .update(formData)
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
        .insert([{ ...formData, user_id: user?.id }]);
      
      if (error) toast.error("Failed to add item");
      else {
        toast.success("Item added");
        fetchInventory();
        setIsDialogOpen(false);
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this item?")) {
      const { error } = await supabase
        .from('inventory')
        .delete()
        .eq('id', id);
      
      if (error) toast.error("Failed to delete item");
      else {
        toast.success("Item deleted");
        fetchInventory();
      }
    }
  };

  const openEditDialog = (item: any) => {
    setCurrentItem(item);
    setFormData({
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      min_stock_level: item.min_stock_level
    });
    setIsDialogOpen(true);
  };

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory</h1>
          <p className="text-zinc-500">Manage raw materials and stock levels.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setCurrentItem(null);
            setFormData({ name: "", quantity: 0, unit: "kg", min_stock_level: 10 });
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Add Item
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{currentItem ? "Edit Item" : "Add New Item"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Item Name *</Label>
                <Input 
                  id="name" 
                  value={formData.name} 
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quantity">Current Stock</Label>
                  <Input 
                    id="quantity" 
                    type="number"
                    step="0.01"
                    value={formData.quantity} 
                    onChange={(e) => setFormData({...formData, quantity: parseFloat(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unit">Unit (kg, L, rolls, etc.)</Label>
                  <Input 
                    id="unit" 
                    value={formData.unit} 
                    onChange={(e) => setFormData({...formData, unit: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="min_stock">Minimum Stock Level (Alert threshold)</Label>
                <Input 
                  id="min_stock" 
                  type="number"
                  step="0.01"
                  value={formData.min_stock_level} 
                  onChange={(e) => setFormData({...formData, min_stock_level: parseFloat(e.target.value)})}
                />
              </div>
              <DialogFooter>
                <Button type="submit">{currentItem ? "Update" : "Save"} Item</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
          <Input
            placeholder="Search inventory..."
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
              <TableHead>Item Name</TableHead>
              <TableHead>Current Stock</TableHead>
              <TableHead>Min Level</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">Loading inventory...</TableCell>
              </TableRow>
            ) : filteredItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-zinc-500">No items found.</TableCell>
              </TableRow>
            ) : filteredItems.map((item) => {
              const isLowStock = item.quantity <= item.min_stock_level;
              return (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center">
                      <Package className="mr-2 h-4 w-4 text-zinc-400" />
                      {item.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center font-semibold">
                      {item.quantity} {item.unit}
                    </div>
                  </TableCell>
                  <TableCell className="text-zinc-500">
                    {item.min_stock_level} {item.unit}
                  </TableCell>
                  <TableCell>
                    {isLowStock ? (
                      <Badge variant="destructive" className="flex items-center w-fit">
                        <AlertCircle className="mr-1 h-3 w-3" /> Low Stock
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                        Healthy
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditDialog(item)}>
                          <Edit2 className="mr-2 h-4 w-4" /> Edit
                      </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(item.id)}>
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                      </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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
