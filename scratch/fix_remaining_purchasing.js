const fs = require('fs');

const filePath = 'apps/web/src/app/dashboard/purchasing/page.tsx';
let code = fs.readFileSync(filePath, 'utf8');

// Header
code = code.replace(/>\s*Purchasing\s*<\/h1>/, '>\\n            {t("title")}\\n          </h1>');
code = code.replace(/>\s*Manage vendors, create purchase orders, and track deliveries\.\s*<\/p>/, '>\\n            {t("subtitle")}\\n          </p>');

// Desktop Table Headers - Orders
code = code.replace(/>\s*PO # & Vendor\s*<\/TableHead>/, '>\\n                      {t("thPONumberVendor")}\\n                    </TableHead>');
code = code.replace(/>\s*Items\s*<\/TableHead>/, '>\\n                      {t("thItems")}\\n                    </TableHead>');
code = code.replace(/>\s*Amount\s*<\/TableHead>/, '>\\n                      {t("thAmount")}\\n                    </TableHead>');
code = code.replace(/>\s*Status\s*<\/TableHead>/, '>\\n                      {t("thStatus")}\\n                    </TableHead>');
code = code.replace(/>\s*Date\s*<\/TableHead>/, '>\\n                      {t("thDate")}\\n                    </TableHead>');

// Desktop Empty Orders Subtitle
code = code.replace(/>\s*Create your first purchase order to get started\s*<\/p>/, '>\\n                            {t("emptyOrdersSubtitle")}\\n                          </p>');

// Desktop Table Actions Dropdown - Orders
code = code.replace(
  /<Eye className="mr-2 h-4 w-4" \/> View Details\s*<\/DropdownMenuItem>/,
  '<Eye className="mr-2 h-4 w-4" /> {t("actionViewDetails")}\\n                                </DropdownMenuItem>'
);
code = code.replace(
  /<Wallet className="mr-2 h-4 w-4" \/> Record Payment\s*<\/DropdownMenuItem>/,
  '<Wallet className="mr-2 h-4 w-4" /> {t("actionRecordPayment")}\\n                                </DropdownMenuItem>'
);
code = code.replace(
  /<Trash2 className="mr-2 h-4 w-4" \/> Delete\s*<\/DropdownMenuItem>/,
  '<Trash2 className="mr-2 h-4 w-4" /> {t("actionDelete")}\\n                                </DropdownMenuItem>'
);

// Desktop Table Headers - Vendors
code = code.replace(/>\s*Vendor & Contact\s*<\/TableHead>/, '>\\n                      {t("thVendorContact")}\\n                    </TableHead>');
code = code.replace(/>\s*Phone\s*<\/TableHead>/, '>\\n                      {t("thPhone")}\\n                    </TableHead>');

// PO Dialog - + Add Item
code = code.replace(/>\s*\+ Add Item\s*<\/button>/, '>\\n                      {tOrderModal("btnAddItem")}\\n                    </button>');

// PO Dialog - Subtotal and Total
code = code.replace(/<span>Subtotal<\/span>/, '<span>{tOrderModal("lblSubtotal")}</span>');
code = code.replace(/<span>Total<\/span>/, '<span>{tOrderModal("lblTotal")}</span>');

// PO Dialog - Add to Inventory
code = code.replace(/>\s*Add to Inventory\s*<\/span>/, '>\\n                          {tOrderModal("lblAddToInventory")}\\n                        </span>');
code = code.replace(/>\s*Update stock levels on creation\s*<\/span>/, '>\\n                          {tOrderModal("lblAddToInventoryDesc")}\\n                        </span>');
code = code.replace(
  /Stock will be added now\. When this PO is later marked as &ldquo;Received&rdquo;, inventory will <strong>not<\/strong> be incremented again\./,
  '{tOrderModal("inventorySyncHintPrefix")} <strong>{tOrderModal("inventorySyncHintNot")}</strong> {tOrderModal("inventorySyncHintSuffix")}'
);

// Detail Dialog - Materials & Totals
code = code.replace(/>\s*Materials\s*<\/h4>/, '>\\n                    {tOrderDetail("lblMaterials")}\\n                  </h4>');
// Detail dialog Subtotal / Tax / Total
code = code.replace(
  /<span>Subtotal<\/span>\s*<span>\{formatCurrency\(detailOrder\.subtotal\)\}<\/span>/,
  '<span>{tOrderDetail("lblSubtotal")}</span>\\n                    <span>{formatCurrency(detailOrder.subtotal)}</span>'
);
code = code.replace(
  /<span>Tax<\/span>\s*<span>\{formatCurrency\(detailOrder\.taxAmount\)\}<\/span>/,
  '<span>{tOrderDetail("lblTax")}</span>\\n                    <span>{formatCurrency(detailOrder.taxAmount)}</span>'
);
code = code.replace(
  /<span>Total<\/span>\s*<span className="text-\[var\(--primary\)\]">\{formatCurrency\(detailOrder\.totalAmount\)\}<\/span>/,
  '<span>{tOrderDetail("lblTotal")}</span>\\n                    <span className="text-[var(--primary)]">{formatCurrency(detailOrder.totalAmount)}</span>'
);

fs.writeFileSync(filePath, code, 'utf8');
console.log('Remaining items fixed!');
