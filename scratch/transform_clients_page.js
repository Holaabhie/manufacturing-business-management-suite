const fs = require('fs');

const file = 'apps/web/src/app/dashboard/clients/page.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Imports
if (!code.includes('useTranslations')) {
  code = code.replace(
    'import { useState, useEffect, useRef } from "react";',
    'import { useState, useEffect, useRef } from "react";\nimport { useTranslations } from "next-intl";\nimport { useAppLocale } from "@/components/LocaleProvider";'
  );
  // fallback if import statement format is different
  if (!code.includes('useTranslations')) {
    code = code.replace(
      'import { useEffect, useRef, useState } from "react";',
      'import { useEffect, useRef, useState } from "react";\nimport { useTranslations } from "next-intl";\nimport { useAppLocale } from "@/components/LocaleProvider";'
    );
  }
}

// 2. Component hook declarations
if (!code.includes('const t = useTranslations("clients");')) {
  code = code.replace(
    'export default function ClientsPage() {',
    `export default function ClientsPage() {\n  const t = useTranslations("clients");\n  const { locale } = useAppLocale();\n  const dateLocale = locale === "hi" ? "hi-IN" : locale === "gu" ? "gu-IN" : locale === "mr" ? "mr-IN" : "en-IN";`
  );
}

// 3. Toasts & PDF Export
code = code.replace(
  `    const headers = ["Name", "Company", "Email", "Phone", "Address"];`,
  `    const headers = [t("lblName"), t("lblCompany"), t("lblEmail"), t("lblPhone"), t("lblAddress")];`
);

code = code.replace(
  `      title: "Clients Directory",\n      subtitle: "Complete list of all registered clients",`,
  `      title: t("pdfTitle"),\n      subtitle: t("pdfSubtitle"),`
);

code = code.replace(
  `toast.success("Clients report PDF downloaded!");`,
  `toast.success(t("toasts.pdfDownloaded"));`
);

code = code.replace(
  `toast.error("Failed to fetch clients");`,
  `toast.error(t("toasts.fetchFailed"));`
);

// multiple occurrences of "Failed to fetch clients"
code = code.replace(
  `toast.error("Failed to fetch clients");`,
  `toast.error(t("toasts.fetchFailed"));`
);

code = code.replace(
  `toast.error("Failed to fetch client details");`,
  `toast.error(t("toasts.fetchDetailsFailed"));`
);

code = code.replace(
  `toast.error("Failed to fetch materials for product");`,
  `toast.error(t("toasts.fetchMaterialsFailed"));`
);

code = code.replace(
  `toast.error("Failed to create client");`,
  `toast.error(t("toasts.createFailed"));`
);

code = code.replace(
  `toast.success("Client created");`,
  `toast.success(t("toasts.created"));`
);

code = code.replace(
  `toast.error("Failed to create client");`,
  `toast.error(t("toasts.createFailed"));`
);

code = code.replace(
  `toast.error("Failed to update client");`,
  `toast.error(t("toasts.updateFailed"));`
);

code = code.replace(
  `toast.success("Client information updated");`,
  `toast.success(t("toasts.updated"));`
);

code = code.replace(
  `toast.error("Failed to update client");`,
  `toast.error(t("toasts.updateFailed"));`
);

code = code.replace(
  `toast.error("Failed to delete client");`,
  `toast.error(t("toasts.deleteFailed"));`
);

code = code.replace(
  `toast.success("Client deleted");`,
  `toast.success(t("toasts.deleted"));`
);

code = code.replace(
  `toast.error("Failed to delete client");`,
  `toast.error(t("toasts.deleteFailed"));`
);

code = code.replace(
  `toast.success("Product added");`,
  `toast.success(t("toasts.productAdded"));`
);

code = code.replace(
  `toast.error("Failed to add product");`,
  `toast.error(t("toasts.productAddFailed"));`
);

code = code.replace(
  `toast.success("Product deleted");`,
  `toast.success(t("toasts.productDeleted"));`
);

code = code.replace(
  `toast.error("Failed to delete product");`,
  `toast.error(t("toasts.productDeleteFailed"));`
);

code = code.replace(
  `toast.success("Material added");`,
  `toast.success(t("toasts.materialAdded"));`
);

code = code.replace(
  `toast.error("Failed to add material");`,
  `toast.error(t("toasts.materialAddFailed"));`
);

code = code.replace(
  `toast.success("Material deleted");`,
  `toast.success(t("toasts.materialDeleted"));`
);

code = code.replace(
  `toast.error("Failed to delete material");`,
  `toast.error(t("toasts.materialDeleteFailed"));`
);

code = code.replace(
  `toast.error('Avatar must be smaller than 500KB');`,
  `toast.error(t("toasts.avatarSize"));`
);

code = code.replace(
  `toast.success('Avatar saved!');`,
  `toast.success(t("toasts.avatarSaved"));`
);

// 4. Header and Add Client Modal
code = code.replace(
  `<h1 className="text-[28px] sm:text-[34px] font-bold tracking-tight text-[var(--foreground)]">Clients</h1>`,
  `<h1 className="text-[28px] sm:text-[34px] font-bold tracking-tight text-[var(--foreground)]">{t("title")}</h1>`
);

code = code.replace(
  `<IOSButton variant="filled" size="medium" icon={<Plus className="h-4 w-4" />}>\n                    New Client\n                  </IOSButton>`,
  `<IOSButton variant="filled" size="medium" icon={<Plus className="h-4 w-4" />}>\n                    {t("btnNewClient")}\n                  </IOSButton>`
);

code = code.replace(
  `<DialogTitle style={{ fontSize: 18, fontWeight: 700, color: 'var(--foreground)', lineHeight: '22px', margin: 0 }}>Add New Client</DialogTitle>`,
  `<DialogTitle style={{ fontSize: 18, fontWeight: 700, color: 'var(--foreground)', lineHeight: '22px', margin: 0 }}>{t("addDialogTitle")}</DialogTitle>`
);

code = code.replace(
  `<p style={{ fontSize: 13, color: 'var(--muted-foreground)', lineHeight: '18px', margin: '2px 0 0' }}>Create a new client profile</p>`,
  `<p style={{ fontSize: 13, color: 'var(--muted-foreground)', lineHeight: '18px', margin: '2px 0 0' }}>{t("addDialogSubtitle")}</p>`
);

code = code.replace(
  `<label className="text-[13px] font-medium text-[var(--muted-foreground)] ml-1">Client Name *</label>`,
  `<label className="text-[13px] font-medium text-[var(--muted-foreground)] ml-1">{t("lblName")} *</label>`
);

code = code.replace(
  `placeholder="e.g. Acme Corp"`,
  `placeholder={t("placeholderName")}`
);

code = code.replace(
  `<label className="text-[13px] font-medium text-[var(--muted-foreground)] ml-1">Company</label>`,
  `<label className="text-[13px] font-medium text-[var(--muted-foreground)] ml-1">{t("lblCompany")}</label>`
);

code = code.replace(
  `placeholder="e.g. Acme Manufacturing Pvt Ltd"`,
  `placeholder={t("placeholderCompany")}`
);

code = code.replace(
  `<label className="text-[13px] font-medium text-[var(--muted-foreground)] ml-1">Email</label>`,
  `<label className="text-[13px] font-medium text-[var(--muted-foreground)] ml-1">{t("lblEmail")}</label>`
);

code = code.replace(
  `placeholder="client@example.com"`,
  `placeholder={t("placeholderEmail")}`
);

code = code.replace(
  `<label className="text-[13px] font-medium text-[var(--muted-foreground)] ml-1">WhatsApp / Phone</label>`,
  `<label className="text-[13px] font-medium text-[var(--muted-foreground)] ml-1">{t("lblPhone")}</label>`
);

code = code.replace(
  `placeholder="+91..."`,
  `placeholder={t("placeholderPhone")}`
);

code = code.replace(
  `<label className="text-[13px] font-medium text-[var(--muted-foreground)] ml-1">Address</label>`,
  `<label className="text-[13px] font-medium text-[var(--muted-foreground)] ml-1">{t("lblAddress")}</label>`
);

code = code.replace(
  `placeholder="Full business address"`,
  `placeholder={t("placeholderAddress")}`
);

code = code.replace(
  `>Create Client Profile</button>`,
  `>{t("btnCreateProfile")}</button>`
);

// 5. Search Bar & Empty State
code = code.replace(
  `placeholder="Search by name, company, or email..."`,
  `placeholder={t("searchPlaceholder")}`
);

code = code.replace(
  `<p className="text-[var(--muted-foreground)] text-[15px]">No clients found matching &quot;{searchTerm}&quot;</p>`,
  `<p className="text-[var(--muted-foreground)] text-[15px]">{t("noClientsMatch", { term: searchTerm })}</p>`
);

code = code.replace(
  `<EmptyState\n                icon="👥"\n                title="No clients yet"\n                description="Add your first client to start managing orders, products, and materials"\n                actionLabel="+ Add First Client"\n                onAction={handleAddNewClick}\n              />`,
  `<EmptyState\n                icon="👥"\n                title={t("emptyTitle")}\n                description={t("emptyDesc")}\n                actionLabel={t("emptyBtn")}\n                onAction={handleAddNewClick}\n              />`
);

// 6. Action items in client card
code = code.replace(
  `<Edit2 className="mr-2 h-4 w-4" /> View Details`,
  `<Edit2 className="mr-2 h-4 w-4" /> {t("btnViewDetails")}`
);

code = code.replace(
  `<Trash2 className="mr-2 h-4 w-4" /> Delete`,
  `<Trash2 className="mr-2 h-4 w-4" /> {t("btnDelete")}`
);

// 7. Client Profile Dialog
code = code.replace(
  `<DialogTitle className="sr-only">Client Profile</DialogTitle>`,
  `<DialogTitle className="sr-only">{t("profileDialogTitle")}</DialogTitle>`
);

code = code.replace(
  `{selectedClient?.name ? \`Client: \${selectedClient.name}\` : "Client Profile"}`,
  `{selectedClient?.name ? t("clientHeader", { name: selectedClient.name }) : t("profileDialogTitle")}`
);

code = code.replace(
  `Customer since {new Date(selectedClient.createdAt || selectedClient.created_at || Date.now()).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}`,
  `{t("customerSince", { date: new Date(selectedClient.createdAt || selectedClient.created_at || Date.now()).toLocaleDateString(dateLocale, { month: 'short', year: 'numeric' }) })}`
);

code = code.replace(
  `<span className="text-[11px] font-extrabold text-emerald-400 uppercase tracking-wide">Orders</span>`,
  `<span className="text-[11px] font-extrabold text-emerald-400 uppercase tracking-wide">{t("tabOrders")}</span>`
);

code = code.replace(
  `<span className="text-[11px] font-extrabold text-blue-400 uppercase tracking-wide">Total sum</span>`,
  `<span className="text-[11px] font-extrabold text-blue-400 uppercase tracking-wide">{t("totalSum")}</span>`
);

code = code.replace(
  `>Profile</TabsTrigger>`,
  `>{t("tabProfile")}</TabsTrigger>`
);

code = code.replace(
  `>Materials</TabsTrigger>`,
  `>{t("tabMaterials")}</TabsTrigger>`
);

code = code.replace(
  `>Orders</TabsTrigger>`,
  `>{t("tabOrders")}</TabsTrigger>`
);

// 8. Contact Info
code = code.replace(
  `<span className="text-[16px] font-bold text-[var(--foreground)]">Contact Information</span>`,
  `<span className="text-[16px] font-bold text-[var(--foreground)]">{t("secContactInfo")}</span>`
);

code = code.replace(
  `<label className="text-[11px] font-bold text-[var(--muted-foreground)] uppercase tracking-wide mb-1.5 block">Full Name</label>`,
  `<label className="text-[11px] font-bold text-[var(--muted-foreground)] uppercase tracking-wide mb-1.5 block">{t("lblFullName")}</label>`
);

code = code.replace(
  `<label className="text-[11px] font-bold text-[var(--muted-foreground)] uppercase tracking-wide mb-1.5 block">Company</label>`,
  `<label className="text-[11px] font-bold text-[var(--muted-foreground)] uppercase tracking-wide mb-1.5 block">{t("lblCompany")}</label>`
);

code = code.replace(
  `<label className="text-[11px] font-bold text-[var(--muted-foreground)] uppercase tracking-wide mb-1.5 block">Email Address</label>`,
  `<label className="text-[11px] font-bold text-[var(--muted-foreground)] uppercase tracking-wide mb-1.5 block">{t("lblEmailAddress")}</label>`
);

code = code.replace(
  `<label className="text-[11px] font-bold text-[var(--muted-foreground)] uppercase tracking-wide mb-1.5 block">Phone Number</label>`,
  `<label className="text-[11px] font-bold text-[var(--muted-foreground)] uppercase tracking-wide mb-1.5 block">{t("lblPhoneNumber")}</label>`
);

code = code.replace(
  `<span className="text-[11px] font-bold text-[var(--muted-foreground)] uppercase tracking-wide">Billing Address</span>`,
  `<span className="text-[11px] font-bold text-[var(--muted-foreground)] uppercase tracking-wide">{t("lblBillingAddress")}</span>`
);

code = code.replace(
  `<Save className="h-4 w-4" /> Save Changes`,
  `<Save className="h-4 w-4" /> {t("btnSaveChanges")}`
);

code = code.replace(
  `<span className="text-[11px] font-bold text-emerald-300 dark:text-emerald-300 uppercase tracking-wide">Total Orders</span>`,
  `<span className="text-[11px] font-bold text-emerald-300 dark:text-emerald-300 uppercase tracking-wide">{t("cardTotalOrders")}</span>`
);

code = code.replace(
  `+{clientOrders.filter(o => { const d = new Date(o.createdAt); const now = new Date(); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); }).length} this month`,
  `+{t("thisMonth", { count: clientOrders.filter(o => { const d = new Date(o.createdAt); const now = new Date(); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); }).length })}`
);

code = code.replace(
  `<span className="text-[11px] font-bold text-blue-300 dark:text-blue-300 uppercase tracking-wide">Total Spent</span>`,
  `<span className="text-[11px] font-bold text-blue-300 dark:text-blue-300 uppercase tracking-wide">{t("cardTotalSpent")}</span>`
);

code = code.replace(
  `₹{thisMonth >= 1000 ? (thisMonth / 1000).toFixed(0) + 'K' : thisMonth.toLocaleString('en-IN')} this month`,
  `{t("thisMonthAmount", { amount: thisMonth >= 1000 ? (thisMonth / 1000).toFixed(0) + 'K' : thisMonth.toLocaleString('en-IN') })}`
);

// 9. Materials tab
code = code.replace(
  `<h3 className="text-[17px] font-semibold mb-4 border-b border-[var(--border)] pb-4 px-4 pt-4 text-[var(--foreground)]">Add Client Product</h3>`,
  `<h3 className="text-[17px] font-semibold mb-4 border-b border-[var(--border)] pb-4 px-4 pt-4 text-[var(--foreground)]">{t("secAddProduct")}</h3>`
);

code = code.replace(
  `<label className="text-[13px] font-medium text-[var(--muted-foreground)] pl-1">Product Name</label>`,
  `<label className="text-[13px] font-medium text-[var(--muted-foreground)] pl-1">{t("lblProductName")}</label>`
);

code = code.replace(
  `placeholder="e.g. Premium Widget"`,
  `placeholder={t("placeholderProduct")}`
);

code = code.replace(
  `<label className="text-[13px] font-medium text-[var(--muted-foreground)] pl-1">Default Rate (₹)</label>`,
  `<label className="text-[13px] font-medium text-[var(--muted-foreground)] pl-1">{t("lblDefaultRate")}</label>`
);

code = code.replace(
  `Add Product\n                          </IOSButton>`,
  `{t("btnAddProduct")}\n                          </IOSButton>`
);

code = code.replace(
  `<p className="text-[15px] text-[var(--muted-foreground)]">No products mapped for this client.</p>`,
  `<p className="text-[15px] text-[var(--muted-foreground)]">{t("noProductsMapped")}</p>`
);

code = code.replace(
  `<p className="text-[13px] text-[var(--muted-foreground)] select-none">Rate: <span className="font-semibold text-[var(--foreground)]">₹{Number(product.defaultRate).toLocaleString()}</span></p>`,
  `<p className="text-[13px] text-[var(--muted-foreground)] select-none">{t("rateLabel")} <span className="font-semibold text-[var(--foreground)]">₹{Number(product.defaultRate).toLocaleString()}</span></p>`
);

code = code.replace(
  `<label className="text-[11px] font-semibold text-[var(--muted-foreground)] uppercase">New Material Name / Ref</label>`,
  `<label className="text-[11px] font-semibold text-[var(--muted-foreground)] uppercase">{t("lblNewMaterial")}</label>`
);

code = code.replace(
  `placeholder="e.g. Aluminium Sheet"`,
  `placeholder={t("placeholderMaterial")}`
);

code = code.replace(
  `<label className="text-[11px] font-semibold text-[var(--muted-foreground)] uppercase">Category</label>`,
  `<label className="text-[11px] font-semibold text-[var(--muted-foreground)] uppercase">{t("lblCategory")}</label>`
);

code = code.replace(
  `placeholder="Type"`,
  `placeholder={t("placeholderCategory")}`
);

code = code.replace(
  `>Add</IOSButton>`,
  `>{t("btnAdd")}</IOSButton>`
);

code = code.replace(
  `<div className="py-4 text-center text-[13px] text-[var(--muted-foreground)] italic">No specific materials added to this product.</div>`,
  `<div className="py-4 text-center text-[13px] text-[var(--muted-foreground)] italic">{t("noMaterialsForProduct")}</div>`
);

// 10. Orders tab & Delete Confirmation
code = code.replace(
  `<h3 className="text-[11px] font-bold text-[var(--muted-foreground)] uppercase tracking-wide">Historical Records</h3>`,
  `<h3 className="text-[11px] font-bold text-[var(--muted-foreground)] uppercase tracking-wide">{t("historicalRecords")}</h3>`
);

code = code.replace(
  `Total: ₹{selectedOrdersTotal.toLocaleString('en-IN')}`,
  `{t("totalOrdersAmount", { amount: selectedOrdersTotal.toLocaleString('en-IN') })}`
);

code = code.replace(
  `<p className="text-[15px] text-[var(--muted-foreground)]">No previous orders found for this client.</p>`,
  `<p className="text-[15px] text-[var(--muted-foreground)]">{t("noOrdersFound")}</p>`
);

code = code.replace(
  `: '—'}`,
  `: '—'}`
);

code = code.replace(
  `{order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}`,
  `{order.createdAt ? new Date(order.createdAt).toLocaleDateString(dateLocale, { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}`
);

code = code.replace(
  `<IOSBadge color={order.status === 'completed' ? 'green' : order.status === 'pending' ? 'orange' : 'blue'}>\n                            {order.status}\n                          </IOSBadge>`,
  `<IOSBadge color={order.status === 'completed' ? 'green' : order.status === 'pending' ? 'orange' : 'blue'}>\n                            {order.status === 'completed' ? t("statusCompleted") : order.status === 'pending' ? t("statusPending") : order.status}\n                          </IOSBadge>`
);

code = code.replace(
  `entityLabel="client"`,
  `entityLabel={t("deleteEntityLabel")}`
);

code = code.replace(
  `consequenceText="will be permanently removed along with their contact & order history. This cannot be undone."`,
  `consequenceText={t("deleteConsequence")}\n        confirmText={t("deleteConfirm")}\n        cancelText={t("deleteCancel")}`
);

fs.writeFileSync(file, code, 'utf8');
console.log('Successfully transformed apps/web/src/app/dashboard/clients/page.tsx!');
