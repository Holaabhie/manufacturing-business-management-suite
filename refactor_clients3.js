const fs = require('fs');
const path = require('path');

const filePath = path.join('c:\\Users\\HP\\OneDrive\\Desktop\\manufacturing-business-management-suite\\apps\\web\\src\\app\\dashboard\\clients\\page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Simple string replacements O(N)
content = content.replace('import { Button } from "@/components/ui/button";', '');
content = content.replace('import { Input } from "@/components/ui/input";', '');
content = content.replace('import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";', 
`import { GlassCard, GlassInput, GlassButton, TogglePill } from "@/components/ui/glass";
import { Loader2, ChevronDown, ChevronUp } from "lucide-react";`);

content = content.replaceAll('<Button', '<GlassButton');
content = content.replaceAll('</Button>', '</GlassButton>');
content = content.replaceAll('<Input', '<GlassInput');

content = content.replaceAll('<Card ', '<GlassCard ');
content = content.replaceAll('<Card>', '<GlassCard>');
content = content.replaceAll('</Card>', '</GlassCard>');
content = content.replaceAll('<CardContent ', '<div className="p-4" ');
content = content.replaceAll('<CardContent>', '<div className="p-4">');
content = content.replaceAll('</CardContent>', '</div>');

content = content.replaceAll('<CardHeader>', '<div className="p-4 border-b border-[var(--border-card)]">');
content = content.replaceAll('</CardHeader>', '</div>');
content = content.replaceAll('<CardTitle>', '<h3 className="text-[17px] font-semibold text-[var(--label-primary)]">');
content = content.replaceAll('</CardTitle>', '</h3>');
content = content.replaceAll('<CardDescription>', '<p className="text-[13px] text-[var(--label-secondary)] mt-1">');
content = content.replaceAll('</CardDescription>', '</p>');

content = content.replaceAll('formData.address', 'formData.address, customerSince: formData.customerSince');
content = content.replaceAll('editData.address', 'editData.address, createdAt: editData.customerSince ? new Date(editData.customerSince).toISOString() : undefined');

// Fix the bad regex replacement of formData.address
content = content.replaceAll(
  'value={formData.address, customerSince: formData.customerSince}', 
  'value={formData.address}'
);
content = content.replaceAll(
  'setFormData({ ...formData, address: e.target.value, customerSince: formData.customerSince })', 
  'setFormData({ ...formData, address: e.target.value })'
);

content = content.replaceAll(
  'value={editData.address, createdAt: editData.customerSince ? new Date(editData.customerSince).toISOString() : undefined}', 
  'value={editData.address}'
);
content = content.replaceAll(
  'setEditData({ ...editData, address: e.target.value, createdAt: editData.customerSince ? new Date(editData.customerSince).toISOString() : undefined })', 
  'setEditData({ ...editData, address: e.target.value })'
);

// We need to insert the customer fields into State
content = content.replace(
  'const [formData, setFormData] = useState({ name: "", email: "", phone: "", address: "" });',
  'const [formData, setFormData] = useState({ name: "", email: "", phone: "", address: "", customerSince: new Date().toISOString().split("T")[0] });'
);
content = content.replace(
  'const [editData, setEditData] = useState({ name: "", email: "", phone: "", address: "" });',
  'const [editData, setEditData] = useState({ name: "", email: "", phone: "", address: "", customerSince: "" });'
);

// Inject the Product and Material states
content = content.replace(
  'const [clientMaterials, setClientMaterials] = useState<any[]>([]);',
  `const [clientProducts, setClientProducts] = useState<any[]>([]);
  const [productMaterials, setProductMaterials] = useState<Record<string, any[]>>({});
  const [expandedProducts, setExpandedProducts] = useState<string[]>([]);
  const [productForm, setProductForm] = useState({ name: "", defaultRate: "" });
  const [materialForm, setMaterialForm] = useState({ productId: "", name: "", type: "", defaultQty: "" });
  const [loadingMaterials, setLoadingMaterials] = useState<Record<string, boolean>>({});`
);


// Replace entire fetchClientDetails block
const oldFetchDetails = `  const fetchClientDetails = async (client: any) => {
    setLoadingDetails(true);
    try {
      const [materialsRes, ordersRes] = await Promise.all([
        fetch(\`/api/v1/clients/\${client.id}/materials\`).then(r => r.json()),
        fetch("/api/v1/orders").then(r => r.json())
      ]);

      if (materialsRes.error) throw new Error(materialsRes.error.message);
      if (ordersRes.error) throw new Error(ordersRes.error.message);

      const allOrders = ordersRes.data || [];
      const filteredOrders = allOrders.filter((o: any) => o.clientId === client.id || o.client_id === client.id);

      setClientMaterials(materialsRes.data || []);
      setClientOrders(filteredOrders);
    } catch (error) {
      toast.error("Failed to fetch client details");
    } finally {
      setLoadingDetails(false);
    }
  };`;

const newFetchDetails = `  const fetchClientDetails = async (client: any) => {
    setLoadingDetails(true);
    try {
      const [productsRes, ordersRes] = await Promise.all([
        fetch(\`/api/v1/clients/\${client.id}/products\`).then(r => r.json()),
        fetch("/api/v1/orders").then(r => r.json())
      ]);

      if (productsRes.error) throw new Error(productsRes.error.message);
      if (ordersRes.error) throw new Error(ordersRes.error.message);

      const allOrders = ordersRes.data || [];
      const filteredOrders = allOrders.filter((o: any) => o.clientId === client.id || o.client_id === client.id);

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
      const res = await fetch(\`/api/v1/clients/\${selectedClient.id}/products/\${productId}/materials\`);
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
  };`;
content = content.replace(oldFetchDetails, newFetchDetails);


// Replace handleDeleteMaterial and handleAddMaterial
const oldActions = `  const handleAddMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) return;

    try {
      const res = await fetch(\`/api/v1/clients/\${selectedClient.id}/materials\`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(materialForm),
      });

      const json = await res.json();

      if (!res.ok || json.error) {
        throw new Error(json.error?.message || "Failed to add material");
      }

      toast.success("Material added successfully");
      setMaterialForm({ name: "", default_rate: "", type: "raw_material" });
      fetchClientDetails(selectedClient);
    } catch (error: any) {
      toast.error(error.message || "Failed to add material");
    }
  };

  const handleDeleteMaterial = async (materialId: string) => {
    try {
      const res = await fetch(\`/api/v1/clients/materials/\${materialId}\`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete material");

      toast.success("Material deleted successfully");
      fetchClientDetails(selectedClient);
    } catch (error: any) {
      toast.error(error.message || "Failed to delete material");
    }
  };`;

const newActions = `  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) return;
    try {
      const res = await fetch(\`/api/v1/clients/\${selectedClient.id}/products\`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(productForm),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error?.message || "Failed to add product");
      toast.success("Product added");
      setProductForm({ name: "", defaultRate: "" });
      fetchClientDetails(selectedClient);
    } catch (error: any) {
      toast.error(error.message || "Failed to add product");
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      const res = await fetch(\`/api/v1/clients/products/\${id}\`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete product");
      toast.success("Product deleted");
      fetchClientDetails(selectedClient);
    } catch (error: any) {
      toast.error(error.message || "Failed to delete product");
    }
  };

  const handleAddMaterial = async (e: React.FormEvent, productId: string) => {
    e.preventDefault();
    if (!selectedClient) return;
    try {
      const res = await fetch(\`/api/v1/clients/\${selectedClient.id}/products/\${productId}/materials\`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...materialForm, productId }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error?.message || "Failed to add material");
      toast.success("Material added");
      setMaterialForm({ productId: "", name: "", type: "", defaultQty: "" });
      fetchMaterialsForProduct(productId);
    } catch (error: any) {
      toast.error(error.message || "Failed to add material");
    }
  };

  const handleDeleteMaterial = async (productId: string, materialId: string) => {
    try {
      const res = await fetch(\`/api/v1/clients/materials/\${materialId}\`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete material");
      toast.success("Material deleted");
      fetchMaterialsForProduct(productId);
    } catch (error: any) {
      toast.error(error.message || "Failed to delete material");
    }
  };`;

content = content.replace(oldActions, newActions);

// Insert UI fields
content = content.replace(
  '<div className="space-y-2">\n                        <label className="text-[13px] font-medium text-[var(--label-secondary)] pl-1">Address</label>\n                        <GlassInput\n                          value={formData.address}\n                          onChange={(e) => setFormData({ ...formData, address: e.target.value })}\n                          placeholder="Full business address"\n                        />\n                      </div>',
  `<div className="space-y-2">
                        <label className="text-[13px] font-medium text-[var(--label-secondary)] pl-1">Address</label>
                        <GlassInput value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} placeholder="Full business address" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[13px] font-medium text-[var(--label-secondary)] pl-1">Customer Since</label>
                        <GlassInput type="date" value={formData.customerSince} onChange={(e) => setFormData({ ...formData, customerSince: e.target.value })} />
                      </div>`
);

content = content.replace(
  '<div className="space-y-2">\n                          <label className="text-[13px] font-medium text-[var(--label-secondary)] pl-1">Address</label>\n                          <GlassInput\n                            value={editData.address}\n                            onChange={(e) => setEditData({ ...editData, address: e.target.value })}\n                          />\n                        </div>',
  `<div className="space-y-2">
                          <label className="text-[13px] font-medium text-[var(--label-secondary)] pl-1">Address</label>
                          <GlassInput value={editData.address} onChange={(e) => setEditData({ ...editData, address: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[13px] font-medium text-[var(--label-secondary)] pl-1">Customer Since</label>
                          <GlassInput type="date" value={editData.customerSince} onChange={(e) => setEditData({ ...editData, customerSince: e.target.value })} />
                        </div>`
);

// Tab Materials Replacement
const tabStart = content.indexOf('<TabsContent value="materials" className="m-0 space-y-6">');
const tabEndPattern = '</TabsContent>';
const afterTabStart = content.substring(tabStart);
const tabEndOffset = afterTabStart.indexOf(tabEndPattern);
const oldTab = content.substring(tabStart, tabStart + tabEndOffset + tabEndPattern.length);

const newMaterialsTab = `<TabsContent value="materials" className="m-0 space-y-6">
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
              </TabsContent>`;

content = content.replace(oldTab, newMaterialsTab);

// Add missing handleSelectEdit
content = content.replace('name: client.name,', 'name: client.name, customerSince: client.createdAt ? new Date(client.createdAt).toISOString().split("T")[0] : "",');

fs.writeFileSync(filePath, content);
console.log('Success - deterministic O(N)');
