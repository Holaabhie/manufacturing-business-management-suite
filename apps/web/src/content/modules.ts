/**
 * Module Content Source of Truth
 * ─────────────────────────────────────────────────────────
 * Canonical metadata, use-cases, workflow steps, and documentation
 * for all public-facing modules in the suite.
 *
 * Designed for Indian manufacturing SMB owners.
 * English-only in this phase.
 */

export type ModuleSlug =
  | "orders"
  | "quotes"
  | "delivery-challans"
  | "production"
  | "machines"
  | "inventory"
  | "purchasing"
  | "billing-invoices"
  | "payments-accounts"
  | "vendor-bills"
  | "banking"
  | "clients"
  | "analytics"
  | "reports"
  | "ai-assistant"
  | "notifications"
  | "folio"
  | "staff-roles"
  | "tally-integration"
  | "settings"
  | "dashboard";

export interface ModuleColorTokens {
  iconBg: string;
  iconColor: string;
  glowColor: string;
}

export interface HowItWorksStep {
  title: string;
  body: string;
}

export interface DocSection {
  heading: string;
  body: string;
}

export interface DocFaq {
  q: string;
  a: string;
}

export interface ModuleDocs {
  overview: string;
  sections: DocSection[];
  faqs: DocFaq[];
}

export type ModuleGroup =
  | "Overview"
  | "Operations"
  | "Finance"
  | "Relationships"
  | "Insights"
  | "Workspace"
  | "Admin & Integrations";

export const MODULE_GROUPS: readonly ModuleGroup[] = [
  "Overview",
  "Operations",
  "Finance",
  "Relationships",
  "Insights",
  "Workspace",
  "Admin & Integrations",
] as const;

export interface ModuleContent {
  slug: ModuleSlug;
  group: ModuleGroup;
  iconName: string;
  color: ModuleColorTokens;
  title: string;
  tagline: string;
  cardBlurb?: string;
  summary: string;
  uses: string[];
  howItWorks: HowItWorksStep[];
  keyFeatures: string[];
  connectsWith: ModuleSlug[];
  docs: ModuleDocs;
  status: "live" | "beta";
}

export const FEATURED_SLUGS: readonly ModuleSlug[] = [
  "orders",
  "inventory",
  "production",
  "payments-accounts",
] as const;

export const MODULES: readonly ModuleContent[] = [
  {
    slug: "orders",
    group: "Operations",
    iconName: "ClipboardList",
    color: {
      iconBg: "rgba(37, 99, 235, 0.1)",
      iconColor: "#2563EB",
      glowColor: "rgba(37, 99, 235, 0.04)",
    },
    title: "Orders",
    tagline: "Track customer sales orders from quotation to final delivery.",
    cardBlurb:
      "Create, track, and manage customer orders from quotation to delivery. Status updates keep everyone aligned.",
    summary:
      "Manage customer sales orders across structured fulfillment stages. Keep production, dispatch, and billing teams synchronized with distinct order statuses, delivery milestones, and payment reconciliations.",
    uses: [
      "Record customer orders with product items, agreed rates, quantities, and GST rates",
      "Track order lifecycle stages across Draft, Confirmed, In Progress, Completed, Cancelled, and On Hold",
      "Monitor physical delivery stages separately from order status (Not Shipped, Partial, Shipped, Delivered, Returned)",
      "Assign priority levels (Low, Normal, High, Urgent) to guide workshop production planning",
      "Convert accepted quotations into orders using a dedicated quotation line-item picker",
      "Export order registries directly to PDF or Excel spreadsheets for management reviews",
    ],
    howItWorks: [
      {
        title: "Create order or pick quotation lines",
        body: "Enter order details manually or select specific approved line items from an existing quotation.",
      },
      {
        title: "Schedule for workshop production",
        body: "Move confirmed orders to In Progress status and link them to workshop runs for operators and machines.",
      },
      {
        title: "Track delivery and prompt invoicing",
        body: "Update physical delivery progress and choose to auto-generate a GST invoice when marking the order Completed.",
      },
      {
        title: "Reconcile customer balance",
        body: "Record incoming client receipts against the order balance to update payment status from Unpaid to Paid.",
      },
    ],
    keyFeatures: [
      "Order lifecycle tracking: Draft, Confirmed, In Progress, Completed, Cancelled, and On Hold",
      "Separate physical delivery status: Not Shipped, Partial, Shipped, Delivered, and Returned",
      "Priority classification: Low, Normal, High, and Urgent",
      "Option to auto-generate GST tax invoices upon order completion",
      "Full registry export to PDF and Excel formats",
    ],
    connectsWith: [
      "quotes",
      "production",
      "delivery-challans",
      "billing-invoices",
      "clients",
      "payments-accounts",
    ],
    docs: {
      overview:
        "The Orders module acts as your central sales command post, connecting customer commitments to workshop execution and accounting books.",
      sections: [
        {
          heading: "Order & Delivery Status Separation",
          body: "Operational progress follows six core order stages (Draft, Confirmed, In Progress, Completed, Cancelled, On Hold). Physical dispatch is tracked independently through dedicated delivery states (Not Shipped, Partial, Shipped, Delivered, Returned) to prevent logistics confusion.",
        },
        {
          heading: "Completion & Invoicing Linkage",
          body: "When marking an order Completed, you are prompted to auto-generate a GST invoice pre-filled with the order items, rates, and client details, eliminating duplicate billing entries.",
        },
      ],
      faqs: [
        {
          q: "How does quote conversion work?",
          a: "When creating an order from a quotation, you choose the specific quote and select the desired line items to import into the order form.",
        },
        {
          q: "What payment statuses are tracked?",
          a: "The system tracks payment status across Unpaid, Partial, Paid, and Overdue, updating balance figures automatically as customer payments are recorded.",
        },
      ],
    },
    status: "live",
  },

  {
    slug: "quotes",
    group: "Operations",
    iconName: "FileText",
    color: {
      iconBg: "rgba(245, 158, 11, 0.1)",
      iconColor: "#D97706",
      glowColor: "rgba(245, 158, 11, 0.04)",
    },
    title: "Quotations",
    tagline: "Create professional GST-compliant estimates and track customer approvals.",
    summary:
      "Send formal price quotations with HSN codes, discounts, and GST breakdowns in minutes. Monitor customer acceptance, follow up on pending deals, and convert approved quote items into active orders.",
    uses: [
      "Generate branded PDF quotations with customer details, item rates, and GST calculations",
      "Apply item-level or overall commercial discounts before sending estimates to clients",
      "Set validity dates to automatically flag expired quotations and prompt timely follow-ups",
      "Share formal estimates with clients via WhatsApp or email",
      "Select approved quote items in the order wizard without re-entering line items",
    ],
    howItWorks: [
      {
        title: "Prepare quotation",
        body: "Select a saved client, add line items with rates and HSN codes, and define payment terms with validity dates.",
      },
      {
        title: "Review and send",
        body: "Download a branded PDF or share the estimate directly with your customer via WhatsApp or email.",
      },
      {
        title: "Track approval",
        body: "Update the quotation status to Accepted or Rejected as soon as your client provides feedback.",
      },
      {
        title: "Import into sales order",
        body: "Select accepted quote lines in the order wizard to initiate workshop manufacturing.",
      },
    ],
    keyFeatures: [
      "Itemized pricing with HSN codes and GST calculations",
      "Automatic status handling including Draft, Sent, Accepted, Rejected, and Expired",
      "Professional branded PDF quotation downloads",
      "Line-item selection import into sales orders upon acceptance",
      "Validity date tracking to protect margins against raw material price swings",
    ],
    connectsWith: ["clients", "orders", "billing-invoices"],
    docs: {
      overview:
        "The Quotations module gives your sales team an accurate estimation workflow, ensuring your pricing is tax-compliant and easy to convert into production orders.",
      sections: [
        {
          heading: "Quotation Statuses & Expiry",
          body: "Quotes support five clear stages: Draft, Sent, Accepted, Rejected, and Expired. When a quote in Sent status passes its validity date, the system dynamically marks it as Expired to protect your profitability.",
        },
        {
          heading: "Accurate Tax Breakdowns",
          body: "Line items automatically compute CGST/SGST for intrastate clients and IGST for interstate clients, preventing billing discrepancies before contracts are finalized.",
        },
      ],
      faqs: [
        {
          q: "What happens when a quotation expires?",
          a: "The status automatically updates to Expired based on your validity date setting, prompting your sales team to re-negotiate or issue an updated quote.",
        },
        {
          q: "Can I download quotes as PDF files?",
          a: "Yes. You can generate printable PDF documents complete with your company logo, bank details, and terms of service.",
        },
      ],
    },
    status: "live",
  },

  {
    slug: "delivery-challans",
    group: "Operations",
    iconName: "Truck",
    color: {
      iconBg: "rgba(13, 148, 136, 0.1)",
      iconColor: "#0D9488",
      glowColor: "rgba(13, 148, 136, 0.04)",
    },
    title: "Delivery Challans",
    tagline: "Issue GST-compliant transport challans and track physical goods movement.",
    summary:
      "Create official delivery documents for goods leaving your factory for job work, client delivery, or supply on approval. Track dispatch status, vehicle numbers, and transporter details to maintain complete transit compliance.",
    uses: [
      "Create delivery challans for outgoing consignments with vehicle and transporter LR numbers",
      "Track goods movement across Draft, Dispatched, Delivered, Returned, and Cancelled stages",
      "Issue challans for job-work processing without raising premature tax invoices",
      "Print official transport copies for drivers and logistics partners to accompany vehicle transit",
      "Link challans to customer sales orders to ensure dispatch quantities match ordered amounts",
    ],
    howItWorks: [
      {
        title: "Generate challan",
        body: "Select consignee details, linked sales order, dispatch items, transport mode, vehicle registration, and transporter LR number.",
      },
      {
        title: "Print transport copy",
        body: "Download the formatted delivery challan PDF containing regulatory transit disclosures.",
      },
      {
        title: "Dispatch and update status",
        body: "Mark the consignment as Dispatched when the vehicle leaves your factory gate.",
      },
      {
        title: "Confirm delivery or return",
        body: "Update the challan to Delivered once the client receives goods, or mark as Returned for job-work items coming back.",
      },
    ],
    keyFeatures: [
      "Transit documentation with vehicle registration and LR numbers",
      "Full dispatch lifecycle: Draft, Dispatched, Delivered, Returned, and Cancelled",
      "Job work and supply-on-approval challan workflows",
      "Direct linkage to sales orders and customer accounts",
      "PDF download formatted for transport checkpoints",
    ],
    connectsWith: ["orders", "clients", "billing-invoices"],
    docs: {
      overview:
        "Delivery Challans provide legal transport documentation when physical materials move between your factory, processing units, or customer facilities without immediate invoice generation.",
      sections: [
        {
          heading: "Dispatch Status Tracking",
          body: "Manage delivery documents through Draft, Dispatched, Delivered, Returned, and Cancelled stages, keeping your dispatch desk and warehouse managers synchronized.",
        },
        {
          heading: "Logistics & Transport Records",
          body: "Record vehicle registration numbers, transporter details, LR numbers, and consignee addresses to satisfy transport inspections and customer gate receipts.",
        },
      ],
      faqs: [
        {
          q: "Can I use delivery challans for job work?",
          a: "Yes. You can issue challans for goods sent out for electroplating, powder coating, or heat treatment, and mark them as Returned upon their arrival.",
        },
        {
          q: "Can a delivery challan be duplicated?",
          a: "Yes. You can duplicate existing challans to speed up recurring shipments to the same consignee.",
        },
      ],
    },
    status: "live",
  },

  {
    slug: "production",
    group: "Operations",
    iconName: "Factory",
    color: {
      iconBg: "rgba(139, 92, 246, 0.1)",
      iconColor: "#8B5CF6",
      glowColor: "rgba(139, 92, 246, 0.04)",
    },
    title: "Production",
    tagline: "Assign staff and machines to production runs, and monitor completion status.",
    cardBlurb:
      "Assign staff and machines to production runs, and monitor completion status.",
    summary:
      "Coordinate workshop manufacturing runs from work order creation to finished goods handover. Assign operators and machines to jobs, monitor live stage progression, and deduct raw materials upon completion.",
    uses: [
      "Schedule manufacturing work orders directly from confirmed customer orders",
      "Assign workshop machines and operators to each manufacturing run",
      "Track job progression across Pending, Running, Paused, and Completed states",
      "Provide shop floor operators with a dedicated My Productions view for progress updates",
      "Apply raw material templates to speed up bill of materials setup",
      "Deduct consumed raw materials from inventory automatically upon job completion",
    ],
    howItWorks: [
      {
        title: "Schedule production run",
        body: "Create a work order for the required product and quantity linked to an open customer order.",
      },
      {
        title: "Assign operators and machines",
        body: "Allocate available workshop machines by name and assign operators responsible for the job run.",
      },
      {
        title: "Monitor floor progression",
        body: "Supervisors and operators track work in Pending, Running, Paused, and Completed stages.",
      },
      {
        title: "Complete and deduct stock",
        body: "Marking the run Completed finishes the job, logs output figures, and decrements allocated raw materials.",
      },
    ],
    keyFeatures: [
      "Status lifecycle matching shop floor flow: Pending, Running, Paused, and Completed",
      "Machine and operator assignment per manufacturing run",
      "Dedicated My Productions view for shop floor operators",
      "Material templates to streamline bill of materials setup",
      "Automatic inventory deduction of raw materials on job completion",
      "Integrated activity feed logging job updates and state changes",
    ],
    connectsWith: ["orders", "machines", "inventory", "staff-roles"],
    docs: {
      overview:
        "The Production module organizes your factory floor into defined work orders, allocating staff and equipment while updating material balances automatically upon job completion.",
      sections: [
        {
          heading: "Shop Floor Status Lifecycle",
          body: "Jobs move through four clear stages: Pending, Running, Paused, and Completed. Operators can pause jobs for tooling adjustments and resume them when ready.",
        },
        {
          heading: "My Productions Staff Portal",
          body: "Shop floor workers access a focused My Productions view showing only their assigned tasks, where they can log produced output and report reject quantities.",
        },
      ],
      faqs: [
        {
          q: "Does completing a production run update inventory?",
          a: "Yes. When a work order is marked Completed, raw materials allocated to that run are automatically deducted from stock.",
        },
        {
          q: "Can supervisors view an activity log of job changes?",
          a: "Yes. The production detail page includes an activity feed documenting status transitions, timestamps, and staff actions.",
        },
      ],
    },
    status: "live",
  },

  {
    slug: "machines",
    group: "Operations",
    iconName: "Cpu",
    color: {
      iconBg: "rgba(100, 116, 139, 0.1)",
      iconColor: "#475569",
      glowColor: "rgba(100, 116, 139, 0.04)",
    },
    title: "Machines",
    tagline: "Maintain an equipment register and track machinery operational status.",
    summary:
      "Maintain a centralized register of workshop equipment, machine classifications, and operational states. Ensure production jobs are assigned only to available and active machines.",
    uses: [
      "Maintain a register of workshop machinery with names, types, and rated capacities",
      "Track equipment operational status across Active, Running, Idle, Maintenance, and Disabled",
      "Review equipment availability counts before launching urgent production runs",
      "Assign active machines by name to new production work orders",
      "Flag equipment under maintenance to prevent accidental job scheduling",
    ],
    howItWorks: [
      {
        title: "Register machinery",
        body: "Add machine names, equipment classifications (such as CNC, Lathe, or Milling), and nominal rated capacities.",
      },
      {
        title: "Monitor equipment counts",
        body: "View the workshop summary to check counts of active, running, idle, and maintenance units.",
      },
      {
        title: "Assign to production runs",
        body: "Select active machines when configuring manufacturing jobs in the production creator.",
      },
      {
        title: "Update servicing status",
        body: "Switch equipment to Maintenance or Disabled during servicing to keep workshop records accurate.",
      },
    ],
    keyFeatures: [
      "Machinery master directory with equipment name, type, and capacity text",
      "Status categorization: Active, Running, Idle, Maintenance, and Disabled",
      "Active machine filtering during production run assignment",
      "Summary counts of available and servicing equipment",
      "Quick status editing to reflect workshop servicing schedules",
    ],
    connectsWith: ["production", "dashboard"],
    docs: {
      overview:
        "The Machines module maintains an active equipment master for your workshop, giving managers clear visibility into equipment classifications and operational readiness.",
      sections: [
        {
          heading: "Equipment Master Register",
          body: "Record machine names, equipment types (such as CNC, VMC, Lathe, or Press), and rated output capacities for clear workshop identification.",
        },
        {
          heading: "Operational Readiness Tracking",
          body: "Track machinery states (Active, Running, Idle, Maintenance, or Disabled) so supervisors can verify operational units before scheduling high-priority jobs.",
        },
      ],
      faqs: [
        {
          q: "What details can I store for each machine?",
          a: "You can specify the machine name, equipment classification type, rated production capacity text, and current operational status.",
        },
        {
          q: "How does this connect to production?",
          a: "When scheduling a production run, supervisors select from active machines, ensuring work orders reference operational units.",
        },
      ],
    },
    status: "live",
  },

  {
    slug: "inventory",
    group: "Operations",
    iconName: "Package",
    color: {
      iconBg: "rgba(22, 163, 74, 0.1)",
      iconColor: "#16A34A",
      glowColor: "rgba(22, 163, 74, 0.04)",
    },
    title: "Inventory",
    tagline: "Track raw materials and finished goods with automated stock deductions.",
    cardBlurb:
      "Track raw materials and finished goods with automatic stock deductions during production. Low stock alerts help you stay ahead of shortages.",
    summary:
      "Stay in control of stock levels across warehouse bins and shop floor storage. Receive automated alerts when items drop below safety thresholds, helping you identify low stock and place timely purchase orders before shortages occur.",
    uses: [
      "Track current on-hand stock for raw materials, hardware components, and finished goods",
      "Filter inventory by Low Stock, Critical, Out of Stock, or Recently Updated items",
      "Set minimum reorder points to trigger timely low stock notifications",
      "Deduct raw materials automatically when production work orders are completed",
      "Add received supplies into stock automatically from verified purchase orders",
      "Store HSN codes, default units of measure, and purchase costs for accurate GST costing",
    ],
    howItWorks: [
      {
        title: "Add inventory items",
        body: "Define item names, unit of measurement, HSN code, unit purchase price, and safety stock threshold.",
      },
      {
        title: "Receive inward stock",
        body: "Receive shipments from vendor purchase orders to automatically boost stock quantities.",
      },
      {
        title: "Deduct outward stock",
        body: "As factory production runs complete, consumed materials are deducted from on-hand inventory.",
      },
      {
        title: "Review low stock filters and alerts",
        body: "Filter items by low or critical stock and review dashboard notifications to raise timely purchase orders.",
      },
    ],
    keyFeatures: [
      "Multi-item inventory catalog supporting raw materials and finished goods",
      "Dedicated Low Stock, Critical, and Out of Stock tab filters",
      "Low Stock Items KPI widget on the executive dashboard",
      "Automatic stock updates from purchasing inward receipts and production runs",
      "HSN code and tax rate mapping for GST billing accuracy",
      "Purchase cost recording for margin and valuation calculations",
    ],
    connectsWith: ["production", "purchasing", "billing-invoices", "orders"],
    docs: {
      overview:
        "The Inventory module coordinates physical stock with factory operations, updating balances automatically as materials arrive from suppliers or are consumed during manufacturing runs.",
      sections: [
        {
          heading: "Inward & Outward Stock Flow",
          body: "Stock quantities increment automatically when purchase orders are marked Received, and decrement when manufacturing jobs finish, eliminating manual stock tallying.",
        },
        {
          heading: "Low Stock Filters & Dashboard Monitoring",
          body: "Monitor shortages using dedicated Low Stock, Critical, and Out of Stock tab filters on the Inventory page, combined with the Low Stock Items KPI widget on the executive dashboard.",
        },
      ],
      faqs: [
        {
          q: "How does stock get added to inventory?",
          a: "You can add items manually or automatically sync incoming quantities when marking purchase orders as Received.",
        },
        {
          q: "Where do low stock warnings appear?",
          a: "Low stock items appear in dedicated filters on the Inventory page, trigger in-app alerts, and show up on the Low Stock Items dashboard widget.",
        },
      ],
    },
    status: "live",
  },

  {
    slug: "purchasing",
    group: "Operations",
    iconName: "ShoppingCart",
    color: {
      iconBg: "rgba(79, 70, 229, 0.1)",
      iconColor: "#4F46E5",
      glowColor: "rgba(79, 70, 229, 0.04)",
    },
    title: "Purchasing & Vendors",
    tagline: "Streamline raw material procurement, purchase orders, and supplier receipts.",
    summary:
      "Manage vendor directories, issue formal purchase orders, and record incoming material receipts. Ensure inventory balances update immediately upon receiving goods while maintaining clean supplier audit trails.",
    uses: [
      "Maintain vendor profiles with GSTIN, PAN, payment terms, and contact information",
      "Create formal purchase orders with itemized rates, quantities, and expected delivery dates",
      "Record inward goods delivery and automatically add received quantities into inventory",
      "Track procurement status across Pending, Ordered, and Received stages",
      "Link purchase orders in the Vendor Bills module to verify billed amounts against procurement terms",
    ],
    howItWorks: [
      {
        title: "Select vendor and items",
        body: "Choose a registered supplier and specify the raw materials, quantities, and agreed prices needed.",
      },
      {
        title: "Issue purchase order",
        body: "Send the formal purchase order document to the vendor to confirm the procurement terms.",
      },
      {
        title: "Receive shipments",
        body: "When goods arrive at the factory, mark the PO as Received to automatically update inventory stock.",
      },
      {
        title: "Link to vendor bill",
        body: "Select the purchase order when creating a vendor bill to populate billed items and verify rates.",
      },
    ],
    keyFeatures: [
      "Vendor master directory with GSTIN and contact management",
      "Formal PO creation with itemized pricing and delivery schedules",
      "Automatic inventory stock addition upon marking purchase orders Received",
      "Purchase order linking in Vendor Bills for accounts payable reconciliation",
      "Complete procurement history to assist supplier price negotiations",
    ],
    connectsWith: ["inventory", "vendor-bills", "payments-accounts"],
    docs: {
      overview:
        "The Purchasing module controls procurement from supplier quotation to warehouse delivery, ensuring raw material purchases are structured, verified, and linked to inventory.",
      sections: [
        {
          heading: "Inward Goods & Stock Integration",
          body: "When you mark a purchase order as Received, the system atomically updates inventory stock quantities, preventing double-entry and maintaining exact warehouse counts.",
        },
        {
          heading: "PO to Vendor Bill Reconciliations",
          body: "Incoming supplier bills can be linked directly to your original purchase order, helping accounts verify billed rates and quantities against authorized procurement terms.",
        },
      ],
      faqs: [
        {
          q: "Does marking a purchase order Received add stock to inventory?",
          a: "Yes. When a purchase order transitions to Received, the on-hand quantity for each item is automatically updated in inventory.",
        },
        {
          q: "Does receiving a purchase order automatically create a vendor bill?",
          a: "No. You record vendor bills in the Vendor Bills module, where you can select the purchase order to pre-fill line items and verify billed amounts.",
        },
      ],
    },
    status: "live",
  },

  {
    slug: "billing-invoices",
    group: "Finance",
    iconName: "Receipt",
    color: {
      iconBg: "rgba(37, 99, 235, 0.1)",
      iconColor: "#2563EB",
      glowColor: "rgba(37, 99, 235, 0.04)",
    },
    title: "GST Invoicing & Billing",
    tagline: "Generate GST-compliant tax invoices with automated tax calculations.",
    summary:
      "Create professional GST tax invoices with automatic CGST, SGST, and IGST calculations based on client state codes. Generate PDF invoices, share via WhatsApp, and track payment collection status effortlessly.",
    uses: [
      "Issue GST tax invoices with automatic split between CGST/SGST or IGST based on location",
      "Include HSN codes, terms of sale, transport details, and bank account information",
      "Auto-generate invoices directly from completed orders or delivery challans",
      "Download clean PDF tax invoices or share payment links via WhatsApp",
      "Track invoice status from Unpaid and Partially Paid to Paid",
    ],
    howItWorks: [
      {
        title: "Create invoice",
        body: "Select a client and add line items with HSN codes, or auto-generate directly from an open sales order.",
      },
      {
        title: "Compute GST automatically",
        body: "The system identifies intrastate vs. interstate trade and computes correct CGST, SGST, or IGST amounts.",
      },
      {
        title: "Send to customer",
        body: "Download the formatted tax invoice PDF or share it with the customer over WhatsApp or email.",
      },
      {
        title: "Track payment collection",
        body: "Review invoice settlement status and reconcile collections against open receivables.",
      },
    ],
    keyFeatures: [
      "Automated CGST, SGST, and IGST calculation based on state codes",
      "HSN code line-item breakdown with itemized tax summaries",
      "Prompt to auto-generate invoices upon sales order completion",
      "Professional PDF invoice generation formatted to Indian tax standards",
      "WhatsApp sharing and payment status tracking",
    ],
    connectsWith: [
      "orders",
      "clients",
      "payments-accounts",
      "tally-integration",
      "reports",
    ],
    docs: {
      overview:
        "The Billing module generates compliant Indian GST tax invoices, handling state tax rules, HSN codes, and payment status updates seamlessly.",
      sections: [
        {
          heading: "State-Aware GST Engine",
          body: "By comparing your company location with your customer's GSTIN state code, the billing engine automatically applies CGST and SGST for intrastate trade or IGST for interstate trade.",
        },
        {
          heading: "Professional Tax Invoice Output",
          body: "Produce formatted PDF invoices carrying mandatory Indian tax disclosures: company GSTIN, client GSTIN, HSN summaries, bank account IFSC details, and authorized signature spaces.",
        },
      ],
      faqs: [
        {
          q: "How does the system distinguish CGST/SGST from IGST?",
          a: "The billing engine evaluates the customer GSTIN state code against your company profile state code and applies the correct tax heads automatically.",
        },
        {
          q: "Can invoices be exported to Tally Prime?",
          a: "Yes. Invoices can be converted into standard Tally XML vouchers and exported directly into Tally Prime.",
        },
      ],
    },
    status: "live",
  },

  {
    slug: "payments-accounts",
    group: "Finance",
    iconName: "Wallet",
    color: {
      iconBg: "rgba(37, 99, 235, 0.1)",
      iconColor: "#2563EB",
      glowColor: "rgba(37, 99, 235, 0.04)",
    },
    title: "Payments & Accounts",
    tagline: "Record customer receipts, manage TDS deductions, and track cash flow.",
    cardBlurb:
      "Record client payments with TDS details, track receivables, and generate reports. Keep your finances organized and transparent.",
    summary:
      "Record and track customer settlements against sales orders, manage TDS withholding details, and maintain accurate cash flow records across your company bank accounts.",
    uses: [
      "Record customer payments via UPI, Bank Transfer (NEFT/RTGS), Cheque, or Cash against sales orders",
      "Record TDS deduction details including section, tax rate, and deducted amount with each receipt",
      "Track partial payments and automatically recalculate pending order balances",
      "Reconcile collections against company bank accounts to maintain cash flow accuracy",
      "Search payment logs by client name, product, or reference ID, and filter by month and year",
    ],
    howItWorks: [
      {
        title: "Select customer and order",
        body: "Choose the client and select the open sales order to which the payment applies.",
      },
      {
        title: "Enter payment and TDS fields",
        body: "Record the amount received, payment method, reference number, and applicable TDS section, rate, and amount.",
      },
      {
        title: "Update order balance and status",
        body: "The system recalculates the order balance due and transitions payment status across Unpaid, Partial, or Paid.",
      },
      {
        title: "Reconcile with banking and reports",
        body: "Review updated liquidity in the Banking module and verify cleared dues in Receivables Aging reports.",
      },
    ],
    keyFeatures: [
      "Customer payment recording linked directly to sales orders",
      "Automatic order balance due recalculation and status updates (Unpaid, Partial, Paid, Overdue)",
      "Structured TDS logging with section, rate, and deduction amount fields",
      "Support for multiple payment modes: UPI, Bank Transfer, Cheque, and Cash",
      "Integration with Banking liquidity and Receivables Aging reports",
    ],
    connectsWith: [
      "orders",
      "billing-invoices",
      "banking",
      "clients",
      "reports",
    ],
    docs: {
      overview:
        "The Payments & Accounts module tracks incoming funds from customers, managing payment modes, tax deductions, and order balance reconciliations.",
      sections: [
        {
          heading: "Order-Level Payment Tracking",
          body: "Customer payments are logged against specific sales orders. Each payment updates total paid amounts, recalculates balance due, and adjusts order payment statuses across Unpaid, Partial, Paid, or Overdue.",
        },
        {
          heading: "TDS Deduction Recording",
          body: "Log withholding taxes cleanly by recording TDS applicability, statutory section text, percentage rate, and deducted amounts alongside the net receipt.",
        },
        {
          heading: "Folio & Financial Boundaries",
          body: "Payments & Accounts handles customer sales settlements and banking balances. Internal petty cash spends and workshop memos are managed in the separate Folio module without shared ledger linkage.",
        },
      ],
      faqs: [
        {
          q: "What does recording a payment update?",
          a: "Recording a payment updates the selected sales order's total paid amount, remaining balance due, and payment status (Unpaid, Partial, or Paid).",
        },
        {
          q: "How are TDS deductions recorded?",
          a: "You can enable TDS on the payment entry, specify the section code, deduction rate, and TDS amount to maintain complete tax deduction logs.",
        },
      ],
    },
    status: "live",
  },

  {
    slug: "vendor-bills",
    group: "Finance",
    iconName: "ReceiptText",
    color: {
      iconBg: "rgba(225, 29, 72, 0.1)",
      iconColor: "#E11D48",
      glowColor: "rgba(225, 29, 72, 0.04)",
    },
    title: "Vendor Bills",
    tagline: "Manage supplier invoices, purchase expenses, and outgoing payables.",
    summary:
      "Track all incoming bills from raw material suppliers, machine service providers, and factory vendors. Match bills against issued purchase orders to prevent overpayment and maintain timely payment schedules.",
    uses: [
      "Log incoming supplier invoices with bill numbers, due dates, and GST breakdowns",
      "Link bills directly to purchase orders to verify billed quantities and prices",
      "Track outstanding liabilities and upcoming payment due dates to avoid supplier friction",
      "Record payments made to vendors across bank transfer, cheque, or cash modes",
      "Maintain a clear audit trail of paid and pending vendor payables",
    ],
    howItWorks: [
      {
        title: "Enter vendor bill",
        body: "Input the supplier invoice number, billing date, payment due date, and line item amounts.",
      },
      {
        title: "Link purchase order",
        body: "Select the corresponding PO to auto-populate items and verify prices against agreed terms.",
      },
      {
        title: "Track payment schedule",
        body: "Monitor payment due dates to prioritize upcoming supplier disbursements.",
      },
      {
        title: "Record outgoing payment",
        body: "Log payments made from company bank accounts to mark bills Paid or Partially Paid.",
      },
    ],
    keyFeatures: [
      "Itemized supplier invoice entry with GST and HSN breakdown",
      "Direct purchase order linking to prevent invoice discrepancies",
      "Payment status tracking: Unpaid, Partially Paid, and Paid",
      "Payables scheduling to maintain strong vendor relationships",
      "Seamless integration with Banking accounts and Payables Aging reports",
    ],
    connectsWith: ["purchasing", "banking", "reports", "payments-accounts"],
    docs: {
      overview:
        "The Vendor Bills module handles accounts payable, matching supplier demands against procurement records and scheduling payments responsibly.",
      sections: [
        {
          heading: "Purchase Order Verification",
          body: "When recording a vendor bill, select the linked purchase order to auto-populate line items and ensure billed amounts match agreed quotation rates.",
        },
        {
          heading: "Cash Flow Protection",
          body: "Track due dates systematically to prioritize vendor disbursements, take advantage of early-payment terms, and protect factory creditworthiness.",
        },
      ],
      faqs: [
        {
          q: "Can a vendor bill be linked to an existing PO?",
          a: "Yes. When creating a bill, you can choose from your purchase orders to pull in line items and supplier details automatically.",
        },
        {
          q: "How do bill payments affect financial reports?",
          a: "Settling a vendor bill updates your Payables Aging report and deducts the funds from your chosen bank account balance.",
        },
      ],
    },
    status: "live",
  },

  {
    slug: "banking",
    group: "Finance",
    iconName: "Landmark",
    color: {
      iconBg: "rgba(5, 150, 105, 0.1)",
      iconColor: "#059669",
      glowColor: "rgba(5, 150, 105, 0.04)",
    },
    title: "Banking & Accounts",
    tagline: "Manage company bank accounts, monitor cash flow, and reconcile entries.",
    summary:
      "Keep track of multiple business bank accounts, current accounts, and petty cash reserves in one secure place. Review inflow and outflow transactions, verify account numbers with IFSC codes, and maintain liquidity visibility.",
    uses: [
      "Register multiple business bank accounts with account numbers and IFSC details",
      "Monitor current balances across operational bank accounts and petty cash",
      "Record incoming customer collections and outgoing vendor disbursements",
      "Track internal transfers between different company bank accounts",
      "Import CSV bank statements to verify and reconcile account balances",
    ],
    howItWorks: [
      {
        title: "Add bank accounts",
        body: "Set up company bank accounts with bank name, account number, IFSC code, and opening balances.",
      },
      {
        title: "Record transactions",
        body: "Link customer payments and vendor disbursements directly to the designated bank account.",
      },
      {
        title: "Monitor balances",
        body: "View total liquidity and per-account balances across all operational accounts.",
      },
      {
        title: "Reconcile records",
        body: "Import CSV statements and cross-check transaction entries against official bank records.",
      },
    ],
    keyFeatures: [
      "Support for multiple current accounts, savings accounts, and cash balances",
      "Bank master setup with IFSC and branch details",
      "Direct linkage to client payments and supplier bill settlements",
      "Internal fund transfer tracking between company accounts",
      "CSV bank statement upload and transaction preview",
    ],
    connectsWith: ["payments-accounts", "vendor-bills", "reports"],
    docs: {
      overview:
        "The Banking module manages your company's cash and bank positions, tracking funds across multiple commercial accounts and cash drawers.",
      sections: [
        {
          heading: "Bank Master & IFSC Records",
          body: "Maintain bank account numbers, IFSC codes, branch addresses, and account classifications for seamless printing on customer invoices.",
        },
        {
          heading: "Cash Flow & Settlement Integrity",
          body: "Direct ties to incoming customer payments and outgoing supplier disbursements ensure book balances reflect actual factory banking activities.",
        },
      ],
      faqs: [
        {
          q: "Can I manage more than one bank account?",
          a: "Yes. You can configure multiple current and savings accounts along with separate petty cash accounts.",
        },
        {
          q: "Can I import bank statements?",
          a: "Yes. The Banking module supports uploading CSV statements to inspect and verify recorded transactions.",
        },
      ],
    },
    status: "live",
  },

  {
    slug: "clients",
    group: "Relationships",
    iconName: "Users",
    color: {
      iconBg: "rgba(2, 132, 199, 0.1)",
      iconColor: "#0284C7",
      glowColor: "rgba(2, 132, 199, 0.04)",
    },
    title: "Client Directory",
    tagline: "Centralize customer profiles, GSTIN details, and transaction histories.",
    summary:
      "Maintain an organized customer directory with GSTIN numbers, billing addresses, state codes, and primary contacts. View purchase histories, outstanding balances, and quotation records for every customer in one profile.",
    uses: [
      "Store client company names, contact persons, phone numbers, and email addresses",
      "Save customer GSTIN and PAN details for automatic tax determination during billing",
      "Maintain separate billing and shipping addresses for smooth logistics",
      "View customer lifetime order history and outstanding payment balances",
      "Initiate new quotations or sales orders directly from the client profile",
    ],
    howItWorks: [
      {
        title: "Add customer details",
        body: "Enter company name, GSTIN, billing address, state, and contact person details.",
      },
      {
        title: "Issue transactions",
        body: "Select the client across Quotes, Orders, Invoices, and Delivery Challans without typing details again.",
      },
      {
        title: "Track outstanding balance",
        body: "View total billed revenue, collected payments, and pending dues per client.",
      },
      {
        title: "Communicate directly",
        body: "Reach out to clients via phone, email, or WhatsApp directly from their profile card.",
      },
    ],
    keyFeatures: [
      "Comprehensive customer directory with GSTIN and PAN validation",
      "State code tracking for automatic CGST/SGST vs. IGST classification",
      "Unified customer summary showing orders, invoices, and payments",
      "Quick actions to generate quotes, orders, and invoices",
      "Contact management for owners, procurement officers, and accountants",
    ],
    connectsWith: [
      "orders",
      "quotes",
      "billing-invoices",
      "payments-accounts",
      "delivery-challans",
    ],
    docs: {
      overview:
        "The Client Directory acts as your unified customer relationship hub, keeping compliance identifiers, contact info, and transaction summaries organized.",
      sections: [
        {
          heading: "Tax Identifier Verification",
          body: "Record client GSTIN and PAN numbers. The client's state code feeds directly into billing logic, ensuring every invoice automatically applies the appropriate tax breakdown.",
        },
        {
          heading: "Customer Financial History",
          body: "Review total revenue generated, open order values, and outstanding receivables for each client in a clean unified profile.",
        },
      ],
      faqs: [
        {
          q: "Can I store multiple contacts for one client?",
          a: "Yes. You can store primary contact details, phone numbers, email addresses, and dedicated billing addresses.",
        },
        {
          q: "How does the client directory connect to billing?",
          a: "Selecting a client in billing automatically populates the invoice with their registered billing address, state code, and GSTIN.",
        },
      ],
    },
    status: "live",
  },

  {
    slug: "analytics",
    group: "Insights",
    iconName: "BarChart3",
    color: {
      iconBg: "rgba(147, 51, 234, 0.1)",
      iconColor: "#9333EA",
      glowColor: "rgba(147, 51, 234, 0.04)",
    },
    title: "Business Analytics",
    tagline: "Gain visual insights into factory revenue, order trends, and margins.",
    summary:
      "Make confident management decisions with interactive performance charts and business health indicators. Review monthly revenue growth, top customers, order volume trends, and production output without building spreadsheets.",
    uses: [
      "Analyze monthly revenue trends and compare performance across periods",
      "Identify top customers driving factory revenue and profitability",
      "Track sales order volume growth and fulfillment speed",
      "Evaluate factory production output across weeks and months",
      "Spot seasonal demand patterns to optimize raw material procurement",
    ],
    howItWorks: [
      {
        title: "Collect operational data",
        body: "The system automatically aggregates transactions across orders, billing, and production runs.",
      },
      {
        title: "Generate visual charts",
        body: "Interactive dashboards display monthly revenue curves, customer shares, and order metrics.",
      },
      {
        title: "Filter by timeframe",
        body: "Switch between monthly, quarterly, and annual views to assess seasonal trends.",
      },
      {
        title: "Take strategic action",
        body: "Use hard data to negotiate vendor prices, adjust production capacity, and reward top clients.",
      },
    ],
    keyFeatures: [
      "Visual revenue curves and sales performance graphs",
      "Top customer and top product contribution analysis",
      "Monthly and annual financial trend comparisons",
      "Order fulfillment and production volume indicators",
      "Exportable metrics to assist management reviews and tax planning",
    ],
    connectsWith: [
      "orders",
      "billing-invoices",
      "production",
      "reports",
      "dashboard",
    ],
    docs: {
      overview:
        "The Analytics module translates daily shop floor and billing transactions into actionable visual charts, giving business owners clarity on company trajectory.",
      sections: [
        {
          heading: "Revenue & Sales Trajectory",
          body: "Track turnover month-over-month, evaluate order intake versus dispatched volume, and spot seasonal trends to plan factory staffing and cash requirements.",
        },
        {
          heading: "Customer & Product Concentration",
          body: "Identify key accounts responsible for major revenue shares, helping you prioritize client relationships and manage commercial credit risk.",
        },
      ],
      faqs: [
        {
          q: "Are analytics computed automatically?",
          a: "Yes. Charts and summary metrics update automatically as new orders are booked, produced, and invoiced.",
        },
        {
          q: "Can I view sales trends for specific months?",
          a: "Yes. You can adjust the timeframe filters to compare monthly performance and examine quarterly growth.",
        },
      ],
    },
    status: "live",
  },

  {
    slug: "reports",
    group: "Insights",
    iconName: "FileBarChart",
    color: {
      iconBg: "rgba(67, 56, 202, 0.1)",
      iconColor: "#4338CA",
      glowColor: "rgba(67, 56, 202, 0.04)",
    },
    title: "Financial Reports & Archives",
    tagline: "Review Receivables Aging, Payables Aging, and past Financial Year archives.",
    summary:
      "Stay ahead of your working capital needs with dedicated aging reports for customer dues and vendor payables. Browse historical Financial Year archives to review past performance, audits, and compliance records whenever needed.",
    uses: [
      "Track overdue customer balances broken down by aging buckets (0-30, 31-60, 60+ days)",
      "Review pending vendor payables to schedule upcoming cash outflows effectively",
      "Access locked Financial Year archives to review previous annual sales and expenses",
      "Export clean financial summaries to Excel and PDF formats for your chartered accountant",
      "Monitor credit exposure across major clients to safeguard cash flow",
    ],
    howItWorks: [
      {
        title: "Select report type",
        body: "Choose between Receivables Aging, Payables Aging, or Financial Year Archives.",
      },
      {
        title: "Apply filters",
        body: "Filter by customer, vendor, date range, or fiscal year to isolate the records you need.",
      },
      {
        title: "Review aging brackets",
        body: "Identify delinquent accounts and follow up systematically on overdue invoices.",
      },
      {
        title: "Export documentation",
        body: "Download Excel or PDF reports to share directly with accountants and auditors.",
      },
    ],
    keyFeatures: [
      "Receivables Aging analysis categorized into standard credit periods",
      "Payables Aging tracker to manage vendor obligations and avoid late fees",
      "Financial Year Archives preserving historic operational data",
      "Export to Excel and PDF for chartered accountants and audit compliance",
      "Clear visibility into working capital and liquidity health",
    ],
    connectsWith: [
      "billing-invoices",
      "vendor-bills",
      "payments-accounts",
      "banking",
      "analytics",
    ],
    docs: {
      overview:
        "The Reports module provides financial control through structured aging analysis and archived fiscal year records, ensuring healthy cash collection and audit readiness.",
      sections: [
        {
          heading: "Receivables & Payables Aging",
          body: "Group outstanding invoices into 0–30, 31–60, and 60+ day buckets. Identify slow-paying customers early and plan vendor disbursements without draining working capital.",
        },
        {
          heading: "Financial Year Archives",
          body: "Securely review previous financial years (such as FY 2023-24 or FY 2024-25) to inspect historical billing, revenue, and tax summaries during annual audits.",
        },
      ],
      faqs: [
        {
          q: "What aging brackets are provided for receivables?",
          a: "Unpaid invoices are sorted into standard aging brackets (0-30 days, 31-60 days, and 60+ days) to help prioritize follow-up calls.",
        },
        {
          q: "Can I export aging reports for my accountant?",
          a: "Yes. You can export aging summaries to Excel (XLSX) or PDF formats for accounting reconciliation.",
        },
      ],
    },
    status: "live",
  },

  {
    slug: "ai-assistant",
    group: "Insights",
    iconName: "Sparkles",
    color: {
      iconBg: "rgba(124, 58, 237, 0.1)",
      iconColor: "#7C3AED",
      glowColor: "rgba(124, 58, 237, 0.04)",
    },
    title: "AI Assistant",
    tagline: "Ask questions in plain English or Hinglish to query your sales order records.",
    summary:
      "Get conversational answers about active customer orders, pending production stages, and outstanding payment amounts. The AI assistant queries your active order records directly using read-only Google GenAI tools.",
    uses: [
      "Ask for summaries like 'Show me pending orders that are not fully completed'",
      "Query orders filtered by order status, payment status, or production stage",
      "Search active orders by product name to inspect customer commitments",
      "Look up complete details for a specific order by ID including client, items, and status",
      "Ask business questions in English or everyday Hinglish (Hindi-English mix)",
    ],
    howItWorks: [
      {
        title: "Open AI Assistant",
        body: "Click the AI Assistant icon from your dashboard or top navigation bar.",
      },
      {
        title: "Type your query",
        body: "Ask natural language questions about active or pending orders in English or Hinglish.",
      },
      {
        title: "Assistant executes tools",
        body: "The assistant calls read-only tools to retrieve exact matching order documents from the database.",
      },
      {
        title: "Receive formatted reply",
        body: "Review formatted responses with bullet points, markdown tables, and Indian rupee (₹) currency figures.",
      },
    ],
    keyFeatures: [
      "Natural language order query engine tailored for Indian manufacturing",
      "Multilingual conversational understanding supporting English and Hinglish",
      "Read-only database tools: get_pending_orders, get_orders, and get_order_details",
      "Concise formatted responses with Indian Rupee (₹) currency figures",
      "Strict read-only safety ensuring records cannot be created, modified, or deleted via chat",
    ],
    connectsWith: ["orders", "dashboard"],
    docs: {
      overview:
        "The AI Assistant provides read-only conversational lookups for business owners and managers, turning sales order and production queries into clear conversations.",
      sections: [
        {
          heading: "Read-Only Business Queries",
          body: "The assistant uses structured tools (get_pending_orders, get_orders, get_order_details) to fetch live order data. It is strictly read-only and cannot alter records.",
        },
        {
          heading: "English and Hinglish Support",
          body: "Ask questions in English or everyday Hinglish. The assistant responds naturally in the same language with clear tables and bullet points.",
        },
      ],
      faqs: [
        {
          q: "Can the AI assistant modify or delete my data?",
          a: "No. The AI assistant is strictly read-only and cannot create, update, or delete records.",
        },
        {
          q: "What data can the assistant look up?",
          a: "It queries open and completed orders, pending balances, production status, and specific order item details.",
        },
      ],
    },
    status: "live",
  },

  {
    slug: "notifications",
    group: "Insights",
    iconName: "Bell",
    color: {
      iconBg: "rgba(217, 119, 6, 0.1)",
      iconColor: "#D97706",
      glowColor: "rgba(217, 119, 6, 0.04)",
    },
    title: "Alerts & Notifications",
    tagline: "Stay informed on low stock levels, order status updates, and payment alerts.",
    summary:
      "Keep track of critical operational events with automated in-app notifications and dispatch alerts. Receive warnings when stock drops below safety thresholds or when client orders are completed on the shop floor.",
    uses: [
      "Receive alerts when inventory items reach or drop below minimum stock levels",
      "Get notified as soon as a factory production run is marked completed",
      "Monitor customer payment updates and outstanding collection alerts",
      "Configure automated notifications across in-app activity feeds and WhatsApp channels",
      "Keep workshop supervisors and owners synchronized without manual follow-up calls",
    ],
    howItWorks: [
      {
        title: "System monitors events",
        body: "Background triggers watch for critical operational milestones such as inventory deductions and order completions.",
      },
      {
        title: "Generate notifications",
        body: "The system records alert items with clear descriptions, timestamps, and priority levels.",
      },
      {
        title: "Review in dashboard",
        body: "Click the notification bell icon to review unread alerts and dismiss completed items.",
      },
      {
        title: "Act on warnings",
        body: "Tap directly on alert cards to open the affected purchase order, inventory item, or sales order.",
      },
    ],
    keyFeatures: [
      "Automated low stock warnings to help prevent line stoppages",
      "Order and production completion alerts for supervisors and owners",
      "Centralized in-app notification center with read/unread tracking",
      "Configurable notification channels including in-app and WhatsApp messaging",
      "Quick navigation from alert cards to underlying business records",
    ],
    connectsWith: [
      "inventory",
      "orders",
      "production",
      "payments-accounts",
      "dashboard",
    ],
    docs: {
      overview:
        "The Notifications module keeps managers proactive by highlighting important factory milestones and material shortages as they happen.",
      sections: [
        {
          heading: "Shortage & Supply Alerts",
          body: "When an inventory item drops beneath its configured safety threshold, the system triggers an alert so procurement can place timely purchase orders.",
        },
        {
          heading: "Production & Delivery Triggers",
          body: "Supervisors receive alerts when orders enter production, complete manufacturing, or dispatch, ensuring smooth handoffs across teams.",
        },
      ],
      faqs: [
        {
          q: "What types of events trigger notifications?",
          a: "Common triggers include low stock threshold crossings, production completion, new order placements, and payment receipts.",
        },
        {
          q: "Can I dismiss or mark notifications as read?",
          a: "Yes. You can mark individual notifications as read or clear them from your notification center.",
        },
      ],
    },
    status: "live",
  },

  {
    slug: "folio",
    group: "Workspace",
    iconName: "BookOpen",
    color: {
      iconBg: "rgba(168, 85, 247, 0.1)",
      iconColor: "#A855F7",
      glowColor: "rgba(168, 85, 247, 0.04)",
    },
    title: "Folio Petty Cash & Notes",
    tagline: "Record day-to-day workshop expenses, petty cash, and internal team memos.",
    summary:
      "Keep miscellaneous factory expenditures and quick notes organized in a lightweight administrative workspace. Categorize food, travel, office supplies, and utility expenses while maintaining color-coded memos for daily operations.",
    uses: [
      "Record daily factory petty cash expenses such as staff meals, tea, and local courier fees",
      "Categorize incidental expenses under Food, Travel, Office, Utilities, and Other",
      "Filter monthly expenditure totals to track administrative overheads",
      "Create color-coded internal notes and reminders for workshop staff",
      "Maintain quick checklists and vendor contact memos without paper clutter",
    ],
    howItWorks: [
      {
        title: "Choose expense or note",
        body: "Select whether you want to log a cash expenditure or write a quick memo.",
      },
      {
        title: "Enter expense details",
        body: "Specify the amount, expense date, category (such as Office or Utilities), and brief description.",
      },
      {
        title: "Create color notes",
        body: "Type reminders or instructions and assign an eye-catching card color for easy identification.",
      },
      {
        title: "Review monthly totals",
        body: "Use the month-year filter to review aggregate petty cash spends across categories.",
      },
    ],
    keyFeatures: [
      "Quick petty cash expense entry with categorized allocation",
      "Expense breakdown across Food, Travel, Office, Utilities, and Other",
      "Month-wise expense filtering and summary cards",
      "Color-coded sticky notes for administrative reminders and checklists",
      "Clean, uncluttered interface designed for rapid daily logging",
    ],
    connectsWith: ["dashboard", "settings"],
    docs: {
      overview:
        "Folio serves as a practical, lightweight scratchpad for factory office managers to track miscellaneous cash spending and operational notes without complex bookkeeping.",
      sections: [
        {
          heading: "Categorized Petty Cash Tracking",
          body: "Log day-to-day incidental factory spends across Food, Travel, Office, Utilities, and Other to maintain oversight of administrative out-of-pocket expenses.",
        },
        {
          heading: "Visual Sticky Notes",
          body: "Keep handy reminders, maintenance phone numbers, or delivery notes on digital sticky cards with custom color themes.",
        },
      ],
      faqs: [
        {
          q: "What expense categories are available in Folio?",
          a: "Standard categories include Food, Travel, Office, Utilities, and Other.",
        },
        {
          q: "Can I filter expenses by month?",
          a: "Yes. The built-in month and year filter allows you to examine monthly petty cash totals and category trends.",
        },
      ],
    },
    status: "live",
  },

  {
    slug: "staff-roles",
    group: "Admin & Integrations",
    iconName: "UserCheck",
    color: {
      iconBg: "rgba(30, 64, 175, 0.1)",
      iconColor: "#1E40AF",
      glowColor: "rgba(30, 64, 175, 0.04)",
    },
    title: "Staff & Role Management",
    tagline: "Control team permissions, assign role-based access, and secure company data.",
    summary:
      "Empower your team while keeping sensitive financials secure. Assign defined roles to owners, admins, managers, accountants, and floor staff so each employee accesses only the modules required for their daily duties.",
    uses: [
      "Add employee accounts with individual login credentials and secure passwords",
      "Assign role-based access across Owner, Admin, Manager, Accountant, and Staff",
      "Restrict access to sensitive financial reports and billing settings for floor staff",
      "Allow production operators to update manufacturing runs without seeing client prices",
      "Deactivate former employee credentials to protect factory data",
    ],
    howItWorks: [
      {
        title: "Add team member",
        body: "Create a user account by entering employee name, email address, and temporary login credentials.",
      },
      {
        title: "Assign appropriate role",
        body: "Select the employee role—such as Manager, Accountant, or Staff—based on job responsibilities.",
      },
      {
        title: "Enforce permissions",
        body: "The system automatically adjusts accessible dashboard menus and restrictions per user role.",
      },
      {
        title: "Manage credentials",
        body: "Reset employee passwords or deactivate departing staff accounts whenever needed.",
      },
    ],
    keyFeatures: [
      "Granular role tiers: Owner, Admin, Manager, Accountant, and Staff",
      "Automatic menu and module filtering based on assigned employee roles",
      "Protection of sensitive pricing, profit margins, and banking ledgers",
      "Fast staff onboarding with temporary credential creation",
      "Prompt access revocation through user deactivation",
    ],
    connectsWith: ["production", "settings", "dashboard"],
    docs: {
      overview:
        "The Staff & Roles module safeguards proprietary financial data while allowing workshop operators and office clerks to do their daily work efficiently.",
      sections: [
        {
          heading: "Tiered Access Control",
          body: "Choose from defined roles—Owner, Admin, Manager, Accountant, or Staff. Floor workers can update production jobs without viewing client profit margins or company banking.",
        },
        {
          heading: "Credential Security",
          body: "Manage employee credentials safely. Set up new joiners and deactivate departing staff immediately to maintain security.",
        },
      ],
      faqs: [
        {
          q: "Can factory workers see company bank balances?",
          a: "No. Staff roles are restricted from viewing financial reports, bank accounts, and sensitive margins.",
        },
        {
          q: "How many roles are available?",
          a: "The system supports Owner, Admin, Manager, Accountant, and Staff roles.",
        },
      ],
    },
    status: "live",
  },

  {
    slug: "tally-integration",
    group: "Admin & Integrations",
    iconName: "ArrowLeftRight",
    color: {
      iconBg: "rgba(234, 88, 12, 0.1)",
      iconColor: "#EA580C",
      glowColor: "rgba(234, 88, 12, 0.04)",
    },
    title: "Tally Prime Integration",
    tagline: "Export GST invoices and ledgers to Tally Prime via XML and desktop bridge.",
    summary:
      "Eliminate double data entry by exporting sales invoices, party ledgers, and tax details directly into Tally Prime as standard XML vouchers. Connect our on-premise desktop bridge to push accounting vouchers into your local Tally setup.",
    uses: [
      "Export finalized GST sales invoices into Tally Prime XML voucher format",
      "Generate Sundry Debtors party ledgers with client GSTIN, state, and address details",
      "Create automated GST ledgers for CGST, SGST, and IGST tax heads",
      "Pair a desktop bridge connector running on your office accounting PC",
      "Push vouchers directly into open Tally Prime companies without manual re-typing",
    ],
    howItWorks: [
      {
        title: "Configure Tally company",
        body: "Enter your exact Tally Prime company name in settings to match your accounting master.",
      },
      {
        title: "Generate XML export",
        body: "Export individual sales invoices or ranges as structured Tally XML vouchers.",
      },
      {
        title: "Pair desktop bridge",
        body: "Use a secure pairing code to connect our desktop agent on the computer running Tally Prime.",
      },
      {
        title: "Import vouchers into Tally",
        body: "Import the XML payload into Tally Prime to populate sales and debtor registers.",
      },
    ],
    keyFeatures: [
      "Standard Tally Prime XML generation for sales vouchers and party ledgers",
      "Automated mapping of CGST, SGST, IGST, and round-off tax heads",
      "Desktop bridge pairing for streamlined on-premise accounting integration",
      "Eliminates double-entry accounting between factory floor billing and Tally registers",
      "Preservation of voucher dates, invoice numbers, and client tax identifiers",
    ],
    connectsWith: ["billing-invoices", "clients", "settings"],
    docs: {
      overview:
        "The Tally Prime Integration bridges factory billing and desktop accounting, generating standard XML vouchers and supporting desktop agent pairing to push sales entries directly into Tally.",
      sections: [
        {
          heading: "Standard Tally XML Generation",
          body: "The system formats sales vouchers, customer party masters under Sundry Debtors, and GST tax ledgers into standard Tally XML, ready for import via Tally Prime Gateway.",
        },
        {
          heading: "Desktop Bridge Connector",
          body: "Our desktop bridge pairs with your local accounting PC using a secure pairing code, communicating directly with Tally Prime's local XML port for direct voucher pushing.",
        },
      ],
      faqs: [
        {
          q: "Does this require changing our Tally Prime chart of accounts?",
          a: "No. The XML generator maps sales, party ledgers, and standard CGST, SGST, and IGST tax heads to match standard Tally conventions.",
        },
        {
          q: "Is two-way sync supported?",
          a: "Currently, the integration supports outward export from the suite into Tally Prime. Two-way data synchronization is not active.",
        },
      ],
    },
    status: "beta",
  },

  {
    slug: "settings",
    group: "Admin & Integrations",
    iconName: "Settings",
    color: {
      iconBg: "rgba(71, 85, 105, 0.1)",
      iconColor: "#475569",
      glowColor: "rgba(71, 85, 105, 0.04)",
    },
    title: "Company Settings & Preferences",
    tagline: "Configure company profiles, GSTIN registrations, and factory branding.",
    summary:
      "Customize your enterprise profile, tax identifiers, banking defaults, and communication preferences. Ensure printed quotations, tax invoices, and delivery challans feature your verified company name, logo, and legal terms.",
    uses: [
      "Configure business legal name, factory address, GSTIN, and PAN details",
      "Upload company branding and logos for printed invoices and quotation headers",
      "Define standard terms of sale, delivery conditions, and bank payment instructions",
      "Manage language preferences across English, Hindi, Gujarati, and Marathi",
      "Configure Tally Prime integration parameters and external notification channels",
    ],
    howItWorks: [
      {
        title: "Update company profile",
        body: "Fill in registered enterprise details including GSTIN, PAN, and corporate address.",
      },
      {
        title: "Set bank details",
        body: "Enter default bank account numbers and IFSC codes to appear on customer invoice footers.",
      },
      {
        title: "Define standard terms",
        body: "Set up default payment timelines and quotation validity terms for consistent contracts.",
      },
      {
        title: "Configure integrations",
        body: "Set up Tally company names and communication channels to keep systems connected.",
      },
    ],
    keyFeatures: [
      "Centralized company profile management with GSTIN and PAN registration",
      "Custom invoice and quotation header configuration with company branding",
      "Default bank details injection for customer payment settlements",
      "Multi-language interface selector supporting 4 Indian languages",
      "Integration setup for on-premise accounting and notification services",
    ],
    connectsWith: [
      "billing-invoices",
      "tally-integration",
      "staff-roles",
      "dashboard",
    ],
    docs: {
      overview:
        "The Settings module defines your enterprise identity across all documents, establishing tax parameters, banking defaults, and operational configurations.",
      sections: [
        {
          heading: "Legal Identity & Tax Setup",
          body: "Maintain verified corporate names, manufacturing plant addresses, GSTIN numbers, and PAN identifiers to support compliance across customer-facing documents.",
        },
        {
          heading: "Payment Terms & Bank Defaults",
          body: "Specify default bank accounts, IFSC codes, and standard payment terms so every generated invoice carries accurate settlement details.",
        },
      ],
      faqs: [
        {
          q: "Where do I update our GSTIN or factory address?",
          a: "You can update these anytime under the Company Profile section within Settings.",
        },
        {
          q: "Can I change the interface language?",
          a: "Yes. You can switch between English, Hindi, Gujarati, and Marathi.",
        },
      ],
    },
    status: "live",
  },

  {
    slug: "dashboard",
    group: "Overview",
    iconName: "LayoutDashboard",
    color: {
      iconBg: "rgba(37, 99, 235, 0.1)",
      iconColor: "#2563EB",
      glowColor: "rgba(37, 99, 235, 0.04)",
    },
    title: "Executive Dashboard",
    tagline: "View key metrics and operational statuses across your factory.",
    summary:
      "Start your workday with a clear summary of critical key performance indicators. Track open orders, active production runs, low stock items, and pending receivables from a single responsive command center.",
    uses: [
      "Review business health indicators including revenue and open orders at a glance",
      "Monitor active manufacturing runs and available workshop equipment",
      "Identify inventory items requiring reorder through the Low Stock Items widget",
      "Track outstanding payment collections and overdue customer receivables",
      "Access shortcuts to create new orders, record payments, and launch production",
    ],
    howItWorks: [
      {
        title: "Review summary widgets",
        body: "Check automated KPI widgets displaying open orders, running machines, and today's collections.",
      },
      {
        title: "Identify operational bottlenecks",
        body: "Review low stock items, delayed production runs, or aging payment dues.",
      },
      {
        title: "Launch quick actions",
        body: "Use shortcut buttons to create quotes, dispatch challans, or record receipts.",
      },
      {
        title: "Drill down into modules",
        body: "Click any KPI widget to jump directly into the full detail view for deeper investigation.",
      },
    ],
    keyFeatures: [
      "Consolidated KPI widgets covering orders, production, inventory, and finance",
      "Quick action shortcuts to accelerate repetitive daily tasks",
      "Low Stock Items widget connected to warehouse reorder thresholds",
      "Optimized layout designed for desktop workstations, tablets, and mobile devices",
      "Direct links connecting every metric to its source operational module",
    ],
    connectsWith: [
      "orders",
      "production",
      "inventory",
      "billing-invoices",
      "payments-accounts",
      "analytics",
    ],
    docs: {
      overview:
        "The Executive Dashboard serves as your morning cockpit, distilling factory activity into actionable metrics and quick shortcuts.",
      sections: [
        {
          heading: "Key Performance Indicators",
          body: "Stay on top of active orders, daily production status, low stock warnings, and outstanding receivables without hunting through reports.",
        },
        {
          heading: "Quick Action Launchpad",
          body: "Create new quotes, log incoming payments, or launch production runs directly from the dashboard header, cutting admin overhead for busy owners.",
        },
      ],
      faqs: [
        {
          q: "Can I access the dashboard from mobile devices?",
          a: "Yes. The dashboard layout is fully responsive and optimized for mobile screens, tablets, and desktop displays.",
        },
        {
          q: "How often do dashboard metrics update?",
          a: "Widgets update whenever you refresh or open the page, reflecting your active business records.",
        },
      ],
    },
    status: "live",
  },
] as const;

export function getModuleBySlug(slug: string): ModuleContent | undefined {
  return MODULES.find((m) => m.slug === slug);
}

export function getModulesByGroup(): Record<ModuleGroup, ModuleContent[]> {
  const grouped: Record<ModuleGroup, ModuleContent[]> = {
    Overview: [],
    Operations: [],
    Finance: [],
    Relationships: [],
    Insights: [],
    Workspace: [],
    "Admin & Integrations": [],
  };

  for (const mod of MODULES) {
    grouped[mod.group].push(mod);
  }

  return grouped;
}
