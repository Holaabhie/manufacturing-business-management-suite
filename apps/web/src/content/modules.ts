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
        body: "Update physical delivery progress and choose Complete & Invoice to auto-generate a tax invoice, or Complete Only when finishing the order.",
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
      "Choose Complete & Invoice or Complete Only upon marking orders Completed",
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
          body: "When marking an order Completed, you can choose Complete & Invoice to generate a tax invoice pre-filled with order items and rates, or Complete Only to close the order without invoicing.",
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
    tagline: "Create professional itemized estimates and track customer approvals.",
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
    tagline: "Issue standardized transport challans and track physical goods movement.",
    summary:
      "Create delivery documents for goods leaving your factory for sale, job work, sample, or other transit purposes. Track dispatch status, vehicle numbers, transporter name, and e-way bill details to maintain complete dispatch oversight.",
    uses: [
      "Create delivery challans for outgoing consignments with vehicle and transporter LR numbers",
      "Track goods movement across Draft, Dispatched, Delivered, Returned, and Cancelled stages",
      "Issue challans for job work, samples, or sales without raising premature tax invoices",
      "Print official transport copies for drivers and logistics partners to accompany vehicle transit",
      "Link challans to customer sales orders to pre-fill item descriptions and remaining dispatch quantities",
    ],
    howItWorks: [
      {
        title: "Generate challan",
        body: "Select consignee details, linked sales order, dispatch items, transport mode, vehicle number, transporter name, LR number, and e-way bill.",
      },
      {
        title: "Print transport copy",
        body: "Download the formatted delivery challan PDF containing transport details and dispatch notes.",
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
      "Designated transit purposes: Sale, Job Work, Sample, and Other",
      "Direct linkage to sales orders and customer accounts",
      "PDF download formatted with vehicle number, LR number, and e-way bill",
    ],
    connectsWith: ["orders", "clients", "billing-invoices"],
    docs: {
      overview:
        "Delivery Challans provide official transit documentation when physical materials move between your factory, processing units, or customer facilities without immediate invoice generation.",
      sections: [
        {
          heading: "Dispatch Status Tracking",
          body: "Manage delivery documents through Draft, Dispatched, Delivered, Returned, and Cancelled stages, keeping your dispatch desk and warehouse managers synchronized.",
        },
        {
          heading: "Logistics & Transport Records",
          body: "Record vehicle numbers, transporter names, LR numbers, e-way bill numbers, and consignee addresses to verify dispatch details at customer gate receipts.",
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
      "Coordinate workshop manufacturing runs from work order creation to finished goods handover. Assign operators and machines to jobs, monitor live stage progression, and deduct raw materials automatically upon run launch.",
    uses: [
      "Schedule manufacturing work orders directly from confirmed customer orders",
      "Assign active workshop machines and multiple shop-floor operators to each manufacturing run",
      "Track job progression across Pending, Running, Paused, and Completed states",
      "Provide shop floor operators with a dedicated dashboard work panel showing assigned orders and tasks",
      "Apply raw material templates to speed up bill of materials setup",
      "Deduct required raw materials from inventory automatically upon launching each production run",
    ],
    howItWorks: [
      {
        title: "Schedule production run",
        body: "Create a work order for the required product and quantity linked to an open customer order, deducting bill of materials from inventory upon launch.",
      },
      {
        title: "Assign operators and machines",
        body: "Allocate active workshop machines (excluding maintenance units) and assign operators responsible for the job run.",
      },
      {
        title: "Monitor floor progression",
        body: "Supervisors and operators track work in Pending, Running, Paused, and Completed stages.",
      },
      {
        title: "Complete production run",
        body: "Marking the run Completed finishes the job, logs output figures in the activity log, and updates order fulfillment without double-deducting stock.",
      },
    ],
    keyFeatures: [
      "Status lifecycle matching shop floor flow: Pending, Running, Paused, and Completed",
      "Multiple operator and active machine assignment with maintenance exclusion",
      "Dedicated staff dashboard work panel showing assigned orders and tasks",
      "Material templates to streamline bill of materials setup",
      "Automatic inventory deduction of raw materials upon production run launch",
      "Integrated activity feed logging job updates and state changes",
    ],
    connectsWith: ["orders", "machines", "inventory", "staff-roles"],
    docs: {
      overview:
        "The Production module organizes your factory floor into defined work orders, allocating staff and equipment while updating material balances automatically upon launching each job.",
      sections: [
        {
          heading: "Shop Floor Status Lifecycle",
          body: "Jobs move through four clear stages: Pending, Running, Paused, and Completed. Operators can pause jobs for tooling adjustments and resume them when ready.",
        },
        {
          heading: "Staff Dashboard Work Panel",
          body: "Shop floor workers access a focused work panel on the dashboard showing their assigned orders, pending work, and today's tasks.",
        },
      ],
      faqs: [
        {
          q: "When are raw materials deducted for a production run?",
          a: "Raw materials are deducted from inventory when launching the production run, preventing double deduction when marking the run completed.",
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
      "Maintain a centralized register of workshop equipment with machine name, type, and capacity. Track machinery status across Active, Maintenance, and Inactive states to coordinate shop floor operations.",
    uses: [
      "Maintain a workshop equipment register with machine name, type, and capacity",
      "Track equipment status across Active, Maintenance, and Inactive states",
      "Review equipment availability counts before launching new production jobs",
      "Assign active machines by name to new production work orders",
      "Set equipment to Maintenance during servicing to prevent job scheduling",
    ],
    howItWorks: [
      {
        title: "Register machinery",
        body: "Add equipment entries specifying machine name, equipment type, and rated capacity.",
      },
      {
        title: "Monitor equipment counts",
        body: "Check workshop summary totals across Active, Maintenance, and Inactive machines.",
      },
      {
        title: "Assign to production runs",
        body: "Select active machines when setting up manufacturing jobs in the production creator.",
      },
      {
        title: "Update maintenance status",
        body: "Switch machine status to Maintenance or Inactive during servicing to keep workshop records accurate.",
      },
    ],
    keyFeatures: [
      "Machinery directory recording machine name, machine type, and capacity",
      "Clear status categorization: Active, Maintenance, and Inactive",
      "Active machine filtering during production run assignment",
      "Summary counts of active and servicing equipment",
      "Status editing to reflect workshop maintenance and repairs",
    ],
    connectsWith: ["production", "dashboard"],
    docs: {
      overview:
        "The Machines module maintains an active equipment master for your workshop, recording machine name, type, and capacity across Active, Maintenance, and Inactive statuses.",
      sections: [
        {
          heading: "Equipment Master Register",
          body: "Record machine name, machine type (such as CNC, Lathe, or Milling), and rated capacity for every piece of workshop equipment.",
        },
        {
          heading: "Machine Status Tracking",
          body: "Track equipment across Active, Maintenance, and Inactive statuses so production supervisors can assign work only to ready machinery.",
        },
      ],
      faqs: [
        {
          q: "What fields can I store for each machine?",
          a: "You can specify machine name, machine type, rated capacity, and operational status.",
        },
        {
          q: "What status values are available for machines?",
          a: "Machines can be set to Active, Maintenance, or Inactive status.",
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
      "Track raw materials and finished goods with automatic stock deductions when jobs are launched. Low stock alerts help you stay ahead of shortages.",
    summary:
      "Stay in control of stock levels across warehouse bins and shop floor storage. Receive automated alerts when items drop below safety thresholds, helping you identify low stock and place timely purchase orders before shortages occur.",
    uses: [
      "Track current on-hand stock for raw materials, hardware components, and finished goods",
      "Filter inventory by Low Stock, Critical, Out of Stock, or Recently Updated items",
      "Set minimum reorder points to trigger timely low stock notifications",
      "Deduct raw materials automatically when orders are confirmed or production runs are launched",
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
        body: "When sales orders or production runs are created, required raw materials are deducted atomically from on-hand inventory.",
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
      "Automatic stock updates from purchasing receipts, order confirmations, and production job launches",
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
          body: "Stock quantities increment automatically when purchase orders are marked Received, and decrement when orders or production jobs are launched, eliminating manual stock tallying.",
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
      "Manage vendor directories, issue purchase orders, and record receipts through a streamlined Pending to Received workflow. Update inventory upon receiving goods while maintaining clean supplier records.",
    uses: [
      "Maintain vendor profiles with contact persons, phone numbers, addresses, and 15-character GSTIN details",
      "Create formal purchase orders with itemized rates, quantities, and delivery dates",
      "Track purchase orders through a streamlined workflow: Pending to Received",
      "Record inward goods receipt to automatically add received quantities into inventory",
      "Link purchase orders in Vendor Bills to verify billed amounts against procurement terms",
    ],
    howItWorks: [
      {
        title: "Select vendor and items",
        body: "Choose a supplier and enter the raw materials, quantities, and agreed prices required.",
      },
      {
        title: "Create pending order",
        body: "Generate the purchase order in Pending status with complete item and pricing details.",
      },
      {
        title: "Receive inward goods",
        body: "When goods arrive, mark the purchase order as Received to update inventory stock.",
      },
      {
        title: "Link to vendor bill",
        body: "Select the purchase order when logging a vendor bill to match billed items against received goods.",
      },
    ],
    keyFeatures: [
      "Vendor master directory with GSTIN and contact details",
      "Itemized purchase order generation with PO-level tax percentage calculation",
      "Streamlined purchasing workflow moving from Pending directly to Received",
      "Automatic inventory stock addition upon marking purchase orders Received",
      "Purchase order linking in Vendor Bills for accounts payable reconciliation",
    ],
    connectsWith: ["inventory", "vendor-bills", "payments-accounts"],
    docs: {
      overview:
        "The Purchasing module controls procurement from supplier ordering to goods receipt, following a clear Pending to Received workflow.",
      sections: [
        {
          heading: "Streamlined Procurement Lifecycle",
          body: "Purchase orders move from Pending directly to Received. Marking a PO Received confirms receipt at the factory gate and adds items to inventory.",
        },
        {
          heading: "PO to Vendor Bill Verification",
          body: "Link purchase orders to incoming vendor bills to check that supplier invoices match agreed rates and received quantities.",
        },
      ],
      faqs: [
        {
          q: "What is the purchasing order workflow?",
          a: "Purchase orders start as Pending and transition directly to Received when inward goods are verified.",
        },
        {
          q: "Does marking a PO Received add stock to inventory?",
          a: "Yes. When a purchase order transitions to Received, on-hand inventory quantities are automatically incremented.",
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
    tagline: "Generate professional tax invoices with automated tax calculations.",
    summary:
      "Create professional GST tax invoices with automatic CGST, SGST, and IGST calculations based on client state codes. Generate PDF invoices, share via WhatsApp, and track payment collection status effortlessly.",
    uses: [
      "Issue GST tax invoices with automatic split between CGST/SGST or IGST based on location",
      "Include HSN codes, terms of sale, transport details, and bank account information",
      "Choose Complete & Invoice when completing an order to generate a tax invoice automatically",
      "Download clean PDF tax invoices or share payment links via WhatsApp",
      "Track invoice status from Unpaid and Partially Paid to Paid",
    ],
    howItWorks: [
      {
        title: "Create invoice",
        body: "Select a client and add line items with HSN codes, or choose Complete & Invoice when completing a sales order.",
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
      "Option to choose Complete & Invoice upon marking a sales order Completed",
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
        "The Billing module generates standardized Indian GST tax invoices, handling state tax rules, HSN codes, and payment status updates seamlessly.",
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
      "Track incoming supplier invoices with bill status (Draft, Open, Void) and payment status (Unpaid, Partially Paid, Paid). Link bills to purchase orders and filter overdue payables based on due dates.",
    uses: [
      "Record supplier invoices with bill statuses Draft, Open, and Void",
      "Track payment status across Unpaid, Partially Paid, and Paid stages",
      "Use the computed Overdue filter to identify unpaid bills past their due date",
      "Link bills to purchase orders to verify items, quantities, and agreed prices",
      "Record vendor bill disbursements across Cash, Bank, UPI, Cheque, and Other modes",
    ],
    howItWorks: [
      {
        title: "Create vendor bill",
        body: "Input the supplier invoice number, bill date, due date, and line items in Draft or Open status.",
      },
      {
        title: "Link purchase order",
        body: "Select the corresponding purchase order to pull in line items and verify quoted rates.",
      },
      {
        title: "Check computed overdue filter",
        body: "Use the Overdue filter tab to view unpaid or partially paid bills whose due date has passed.",
      },
      {
        title: "Record disbursements",
        body: "Log payments against the bill to advance payment status from Unpaid to Partially Paid or Paid.",
      },
    ],
    keyFeatures: [
      "Bill status lifecycle: Draft, Open, and Void",
      "Payment status tracking: Unpaid, Partially Paid, and Paid",
      "Computed Overdue filter for unpaid bills past their scheduled due date",
      "Direct purchase order linking to prevent invoice discrepancies",
      "Payment disbursement logging across Cash, Bank, UPI, Cheque, and Other modes",
    ],
    connectsWith: ["purchasing", "banking", "reports", "payments-accounts"],
    docs: {
      overview:
        "The Vendor Bills module handles accounts payable, tracking supplier invoices with clear bill and payment statuses while identifying overdue obligations via computed date filters.",
      sections: [
        {
          heading: "Bill Status & Payment Status",
          body: "Vendor bills have a bill status (Draft, Open, Void) and an independent payment status (Unpaid, Partially Paid, Paid). In addition, an Overdue view serves as a computed filter for bills past their due date.",
        },
        {
          heading: "Purchase Order Matching",
          body: "When recording a vendor bill, link the purchase order to auto-populate items and verify that supplier invoices match agreed rates.",
        },
      ],
      faqs: [
        {
          q: "Is Overdue a separate bill status?",
          a: "No. Overdue is a computed filter showing open bills whose due date has passed without full payment.",
        },
        {
          q: "What bill and payment statuses are supported?",
          a: "Bills support Draft, Open, and Void statuses, while payments are tracked as Unpaid, Partially Paid, or Paid.",
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
      "Record incoming customer collections and outgoing vendor bill disbursements",
      "Track internal transfers between different company bank accounts",
      "Import CSV statements and match bank entries to recorded payments with atomic paise allocation",
    ],
    howItWorks: [
      {
        title: "Add bank accounts",
        body: "Set up company bank accounts with bank name, account number, IFSC code, and opening balances.",
      },
      {
        title: "Record transactions",
        body: "Match imported bank transaction lines against recorded client payments and vendor bill payments.",
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
      "Match statement transactions to recorded client payments and vendor bill payments",
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
          heading: "Statement Matching & Allocation",
          body: "Link imported statement lines directly to recorded client payments or vendor bill payments with atomic paise allocation, preventing duplicate matches and balance discrepancies.",
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
        title: "Filter by calendar month",
        body: "Select any month since account creation from the period dropdown to recalculate revenue, order flow, production rates, and inventory movements for that exact billing month.",
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
    tagline: "Ask in plain language about pending orders, order status and order details.",
    summary:
      "Ask in plain language about pending orders, order status and order details. The AI assistant uses read-only tools to retrieve exact sales order records directly from your database.",
    uses: [
      "Ask in plain language about pending orders, order status and order details",
      "Query active pending orders that are not fully completed",
      "Filter orders by status: pending, processing, completed, or cancelled",
      "Search orders by product name to inspect customer commitments",
      "Look up complete details of a specific order by its order ID",
    ],
    howItWorks: [
      {
        title: "Open AI Assistant",
        body: "Launch the conversational assistant from your dashboard or navigation bar.",
      },
      {
        title: "Type your query",
        body: "Ask in plain language about pending orders, order status and order details in English or Hinglish.",
      },
      {
        title: "Assistant executes tools",
        body: "The assistant invokes read-only database tools (get_pending_orders, get_orders, get_order_details).",
      },
      {
        title: "Receive formatted reply",
        body: "Review structured answers with markdown tables, bullet points, and Indian Rupee (₹) amounts.",
      },
    ],
    keyFeatures: [
      "Orders-only natural language query assistant supporting English and Hinglish",
      "Dedicated order lookup tools for pending orders, order search, and order details",
      "Search filters for order status, payment status, production status, and product name",
      "Clear responses formatted with bullet points and Indian Rupee (₹) figures",
      "Strict read-only safety ensuring records cannot be created, modified, or deleted via chat",
    ],
    connectsWith: ["orders"],
    docs: {
      overview:
        "The AI Assistant provides read-only lookups for sales orders, allowing operators and managers to query pending orders, order status and order details in plain language.",
      sections: [
        {
          heading: "Read-Only Order Queries",
          body: "The assistant queries live order records using dedicated tools for active orders, order queries, and detailed order items. It operates in read-only mode and cannot create, modify, or delete data.",
        },
        {
          heading: "Bilingual Order Lookups",
          body: "Submit queries in English or everyday Hinglish. The assistant responds in the same language with clear summaries and tables based strictly on order data.",
        },
      ],
      faqs: [
        {
          q: "What can I ask the AI assistant?",
          a: "You can ask in plain language about pending orders, order status and order details.",
        },
        {
          q: "Can the AI assistant modify or delete orders?",
          a: "No. The assistant is strictly read-only and cannot alter, update, or delete any records.",
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
    tagline: "Track factory alerts in-app and share updates via communication deep links.",
    summary:
      "Monitor operational milestones with an in-app notification feed and share updates via WhatsApp, Email, or SMS deep links. External dispatch routes via Twilio and SMTP when configured.",
    uses: [
      "Review operational alerts in the centralized in-app notification feed",
      "Share document links and updates directly via WhatsApp, Email, or SMS deep links",
      "Receive in-app alerts when stock items reach low reorder thresholds",
      "Get notified in-app when factory production runs are marked completed",
      "Dispatch external alerts via Twilio (WhatsApp/SMS) and SMTP (Email) when configured",
    ],
    howItWorks: [
      {
        title: "System logs notification",
        body: "Operational events like low inventory or production completion generate notification records.",
      },
      {
        title: "Review in-app feed",
        body: "Open the notification page or navbar popover to inspect unread alerts and timestamps.",
      },
      {
        title: "Share via deep links",
        body: "Click share buttons on notification cards to open pre-filled WhatsApp, Email, or SMS deep links.",
      },
      {
        title: "External dispatch when configured",
        body: "When Twilio or SMTP credentials are configured, the notification worker dispatches messages externally.",
      },
    ],
    keyFeatures: [
      "Centralized in-app notification feed with read and unread tracking",
      "Direct sharing via WhatsApp, Email, and SMS deep links from alert cards",
      "External message dispatch via Twilio (SMS/WhatsApp) and SMTP (Email) when configured",
      "Fallback logging with not_configured status when external providers are unconfigured",
      "Quick navigation from alert cards to linked production orders and stock records",
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
        "The Notifications module provides an in-app alert center and communication sharing shortcuts, with external delivery available when providers are configured.",
      sections: [
        {
          heading: "In-App Notification Feed",
          body: "Stay updated on critical events like low inventory warnings and completed manufacturing runs through the dedicated in-app notification feed.",
        },
        {
          heading: "Communication Deep Links & Dispatch",
          body: "Share alerts with customers and staff using WhatsApp, Email, or SMS deep links. External dispatch via Twilio and SMTP operates when configured.",
        },
      ],
      faqs: [
        {
          q: "Can I share alerts directly with team members or clients?",
          a: "Yes. Notification cards include deep links to share updates directly via WhatsApp, Email, or SMS.",
        },
        {
          q: "What happens if external SMS or email gateways are not configured?",
          a: "Alerts remain fully visible in your in-app notification feed, while unconfigured external channels are logged with a not_configured status.",
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
    tagline: "Assign team members to defined roles and manage employee account access.",
    summary:
      "Manage employee accounts and assign access across defined roles—Owner, Admin, Manager, Accountant, and Staff. Ensure each team member has the appropriate login access for their daily responsibilities.",
    uses: [
      "Add employee accounts with individual login credentials and email addresses",
      "Assign user roles and permission templates across Full Access, Operations, Sales, and View Only",
      "Provide floor staff with access to update production jobs",
      "Equip accountants with access to billing registers and vendor bills",
      "Deactivate employee accounts with immediate session termination to keep workshop access secure",
    ],
    howItWorks: [
      {
        title: "Provision employee login",
        body: "Enter employee name, phone, department, designation, and direct login credentials.",
      },
      {
        title: "Assign permission template",
        body: "Select Full Access, Operations, Sales, or View Only to provision module access.",
      },
      {
        title: "Work with role-focused views",
        body: "Staff see assigned production runs on their dashboard panel while financial records stay restricted.",
      },
      {
        title: "Fast status deactivation",
        body: "Toggle employee status to inactive to terminate active sessions immediately.",
      },
    ],
    keyFeatures: [
      "Role presets for Owner, Manager, Staff, and Accountant with customizable permissions",
      "Individual employee login accounts with secure credentials",
      "Focused workspace views suited for staff, managers, and accountants",
      "Direct credential provisioning with individual employee logins",
      "Fast account deactivation with immediate session termination",
    ],
    connectsWith: ["production", "settings", "dashboard"],
    docs: {
      overview:
        "The Staff & Role Management module allows businesses to set up individual employee accounts and assign team members to defined operational roles.",
      sections: [
        {
          heading: "Factory Role Separation",
          body: "Separate shop-floor execution from financial ledgers: Owner has full system control; Manager oversees orders, production, clients, and inventory; Staff handles assigned shop-floor jobs; Accountant manages invoices and reports.",
        },
        {
          heading: "Direct Provisioning & Fast Deactivation",
          body: "Provision employee accounts directly with username and password. When employees depart, toggle status to inactive to destroy all active sessions immediately.",
        },
      ],
      faqs: [
        {
          q: "Which roles can be assigned to team members?",
          a: "You can assign team members to Owner, Admin, Manager, Accountant, or Staff roles.",
        },
        {
          q: "Can an administrator reset employee passwords?",
          a: "Yes. Administrators and owners can update employee credentials or deactivate accounts from the staff directory.",
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
    tagline: "Generate Tally Prime XML for party ledgers and evaluate voucher import.",
    summary:
      "Export customer party ledgers and invoice voucher XML for Tally Prime. Party ledgers have verified import, while voucher import is currently undergoing testing and validation in beta.",
    uses: [
      "Export customer party ledgers under Sundry Debtors formatted for Tally Prime",
      "Generate party ledger definitions with client state code and address details",
      "Create standard GST ledger heads for CGST, SGST, and IGST tax entries",
      "Generate invoice voucher XML for testing and import validation in Tally Prime",
      "Configure company name mapping to match your target Tally Prime company file",
    ],
    howItWorks: [
      {
        title: "Configure company name",
        body: "Set your exact Tally Prime company name in settings so exported XML maps to your accounting company.",
      },
      {
        title: "Select sales invoice",
        body: "Choose any finalized GST sales invoice from the billing register.",
      },
      {
        title: "Generate XML export",
        body: "Download structured Tally Prime XML containing customer party ledgers and invoice voucher definitions.",
      },
      {
        title: "Test import in Tally Prime",
        body: "Review exported XML and test import into your Tally Prime test environment while voucher import is being validated.",
      },
    ],
    keyFeatures: [
      "Export customer party ledgers with verified Tally Prime import",
      "Automated ledger XML for Sundry Debtors, sales accounts, and GST tax heads",
      "Tally Prime company name mapping configuration in settings",
      "Voucher XML generation currently undergoing validation in beta",
      "Direct XML export available while automated bridge synchronization is in development",
    ],
    connectsWith: ["billing-invoices", "clients", "settings"],
    docs: {
      overview:
        "The Tally Prime Integration exports customer party ledgers and sales voucher XML for Tally Prime. Party ledger import has been verified with Tally Prime, while sales voucher import is currently in beta validation.",
      sections: [
        {
          heading: "Party Ledger Export",
          body: "The system generates standard Tally XML for party ledgers under Sundry Debtors, sales accounts, and tax heads with verified Tally Prime compatibility.",
        },
        {
          heading: "Voucher Import Beta Testing",
          body: "Sales invoice voucher XML export is in beta. Manual testing and validation are underway to ensure full voucher acceptance in Tally Prime.",
        },
      ],
      faqs: [
        {
          q: "Are ledgers verified to import into Tally Prime?",
          a: "Yes, party ledgers under Sundry Debtors have been tested and verified to import successfully into Tally Prime.",
        },
        {
          q: "What is the status of voucher import and automatic sync?",
          a: "Voucher import is currently in beta validation, and automatic bridge synchronization is in development.",
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
      "Customize your enterprise profile, tax identifiers, banking defaults, and communication preferences. Ensure printed quotations, tax invoices, and delivery challans feature your verified company name, logo, and business terms.",
    uses: [
      "Configure registered business name, factory address, GSTIN, and PAN details",
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
          heading: "Corporate Identity & Tax Setup",
          body: "Maintain verified corporate names, manufacturing plant addresses, GSTIN numbers, and PAN identifiers across customer-facing documents.",
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
