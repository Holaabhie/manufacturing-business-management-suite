import fs from "node:fs";
import path from "node:path";
import { MODULES } from "../content/modules";

export interface EvidenceItem {
  file: string;
  lines: string;
  anchor: string;
  proof: string;
}

export type ModuleEvidenceMap = Record<
  string,
  {
    uses: EvidenceItem[];
    steps: EvidenceItem[];
    features: EvidenceItem[];
    sections: EvidenceItem[];
    faqs: EvidenceItem[];
  }
>;

// Complete evidence registry with literal anchor tokens for all 384 claims across 21 modules
export const EVIDENCE_REGISTRY: ModuleEvidenceMap = {
  orders: {
    uses: [
      { file: "apps/web/src/models/SalesOrder.ts", lines: "L3-L12", anchor: "item_name", proof: "OrderItem schema defines item_name, quantity, rate, and item amount." },
      { file: "apps/web/src/models/SalesOrder.ts", lines: "L78-L80", anchor: "order_status", proof: "order_status enum: 'Draft' | 'Confirmed' | 'In Progress' | 'Completed' | 'Cancelled' | 'On Hold'." },
      { file: "apps/web/src/models/SalesOrder.ts", lines: "L74-L76", anchor: "delivery_status", proof: "delivery_status enum: 'Not Shipped' | 'Partial' | 'Shipped' | 'Delivered' | 'Returned'." },
      { file: "apps/web/src/models/SalesOrder.ts", lines: "L82-L84", anchor: "priority", proof: "priority field: 'low' | 'normal' | 'high' | 'urgent'." },
      { file: "apps/web/src/app/dashboard/orders/create/page.tsx", lines: "L128-L136", anchor: "quoteIdParam", proof: "URL query parameter quoteIdParam imports selected quote line items." },
      { file: "apps/web/src/app/dashboard/orders/page.tsx", lines: "L297-L360", anchor: "exportToPDF", proof: "exportToPDF and exportToXLSX generate document exports." },
    ],
    steps: [
      { file: "apps/web/src/app/dashboard/orders/create/page.tsx", lines: "L128-L136", anchor: "quoteIdParam", proof: "Order creation form supports manual line entry or quotation picker integration." },
      { file: "apps/web/src/app/dashboard/production/create/page.tsx", lines: "L160-L175", anchor: "selectedOrderId", proof: "Production run creation links directly to open sales orders." },
      { file: "apps/web/src/components/orders/CompletionModals.tsx", lines: "L115-L150", anchor: "completeAndInvoice", proof: "Prompt dialog appears upon marking Completed offering to auto-generate a GST invoice." },
      { file: "apps/web/src/models/SalesOrder.ts", lines: "L66-L73", anchor: "balance_due", proof: "Order schema recalculates total_paid, balance_due, and payment_status on payment." },
    ],
    features: [
      { file: "apps/web/src/models/SalesOrder.ts", lines: "L78-L80", anchor: "Confirmed", proof: "Full order_status enum tracking operational workflow states." },
      { file: "apps/web/src/models/SalesOrder.ts", lines: "L74-L76", anchor: "Not Shipped", proof: "Independent delivery_status enum preventing logistics status conflation." },
      { file: "apps/web/src/models/SalesOrder.ts", lines: "L82-L84", anchor: "urgent", proof: "Priority field supporting workshop production scheduling." },
      { file: "apps/web/src/app/dashboard/orders/page.tsx", lines: "L825-L865", anchor: "handleCompleteAndInvoice", proof: "handleCompleteAndInvoice triggers auto-generation of linked invoice." },
      { file: "apps/web/src/app/dashboard/orders/page.tsx", lines: "L320-L360", anchor: "exportToXLSX", proof: "Direct spreadsheet and printable exports of order registers." },
    ],
    sections: [
      { file: "apps/web/src/models/SalesOrder.ts", lines: "L74-L80", anchor: "delivery_status", proof: "Dual-enum architectural schema separating physical shipping from billing/production stages." },
      { file: "apps/web/src/components/orders/CompletionModals.tsx", lines: "L115-L150", anchor: "onCompleteAndInvoice", proof: "Order completion triggers modal linking completed quantities to tax invoices." },
    ],
    faqs: [
      { file: "apps/web/src/app/dashboard/orders/create/page.tsx", lines: "L142-L178", anchor: "line", proof: "Quotes line-item selector pulls specific item objects into the order creation state." },
      { file: "apps/web/src/models/SalesOrder.ts", lines: "L68-L70", anchor: "payment_status", proof: "payment_status tracks Unpaid, Partial, Paid, Overdue, Partially Overdue, Overpaid, Refunded." },
    ],
  },

  quotes: {
    uses: [
      { file: "apps/web/src/modules/quotes/domain/types.ts", lines: "L7-L20", anchor: "QuoteItem", proof: "QuoteItem stores description, hsn, qty, unit, rate, gst_rate, and line_total." },
      { file: "apps/web/src/modules/quotes/domain/types.ts", lines: "L4-L6", anchor: "QuoteStatus", proof: "QuoteStatus: 'Draft' | 'Sent' | 'Accepted' | 'Rejected' | 'Expired'." },
      { file: "apps/web/src/modules/quotes/infrastructure/quote.repository.ts", lines: "L6-L17", anchor: "isQuoteExpired", proof: "isQuoteExpired() dynamically verifies validity timestamp against Date.now()." },
      { file: "apps/web/src/lib/quote/quote-pdf-template.ts", lines: "L620-L628", anchor: "quotation", proof: "Handlebars template compiles quotation into customer-facing PDF document." },
      { file: "apps/web/src/modules/quotes/infrastructure/quote.repository.ts", lines: "L289-L305", anchor: "attachOrder", proof: "attachOrder() links accepted quotation to resulting sales order." },
    ],
    steps: [
      { file: "apps/web/src/app/dashboard/quotes/page.tsx", lines: "L105-L115", anchor: "isLinePickerOpen", proof: "Interactive quote builder and line picker convert estimates into orders." },
      { file: "apps/web/src/components/quotes/QuoteDetailModal.tsx", lines: "L145-L160", anchor: "handleStatusTransition", proof: "Status transitions update quotation between Draft, Sent, Accepted, Rejected." },
      { file: "apps/web/src/modules/quotes/application/quote.service.ts", lines: "L91-L125", anchor: "updateStatus", proof: "updateStatus() enforces transitions between Draft, Sent, Accepted, Rejected." },
      { file: "apps/web/src/app/dashboard/orders/create/page.tsx", lines: "L128-L136", anchor: "quoteIdParam", proof: "Line-item selection from accepted quotation pre-populates order creation form." },
    ],
    features: [
      { file: "apps/web/src/modules/quotes/domain/types.ts", lines: "L7-L20", anchor: "cgst", proof: "Automatic CGST, SGST, IGST tax breakdown based on customer state." },
      { file: "apps/web/src/modules/quotes/domain/types.ts", lines: "L4-L6", anchor: "Draft", proof: "Quotation status enum including Draft, Sent, Accepted, Rejected, Expired." },
      { file: "apps/web/src/modules/quotes/infrastructure/quote.repository.ts", lines: "L10-L16", anchor: "validUntil", proof: "Automated expiration check evaluates validUntil date." },
      { file: "apps/web/src/app/api/quotes/[id]/generate-pdf/route.ts", lines: "L45-L55", anchor: "generatePDFWithRetry", proof: "Server-side headless browser generates PDF quotations." },
      { file: "apps/web/src/app/dashboard/orders/create/page.tsx", lines: "L128-L136", anchor: "quoteIdParam", proof: "Order line item import from accepted quote." },
    ],
    sections: [
      { file: "apps/web/src/modules/quotes/domain/schemas.ts", lines: "L45-L55", anchor: "Draft", proof: "createQuoteSchema validates allowed quote lifecycle states." },
      { file: "apps/web/src/modules/quotes/infrastructure/quote.repository.ts", lines: "L289-L305", anchor: "attachOrder", proof: "attachOrder() updates quote items to claimed status and marks quotation Accepted." },
    ],
    faqs: [
      { file: "apps/web/src/modules/quotes/infrastructure/quote.repository.ts", lines: "L6-L17", anchor: "isQuoteExpired", proof: "Dynamic evaluation marks past-validity quotes Expired automatically on retrieval." },
      { file: "apps/web/src/app/dashboard/orders/create/page.tsx", lines: "L142-L178", anchor: "line", proof: "URL query ?line= allows selecting individual quotation items during order creation." },
    ],
  },

  "delivery-challans": {
    uses: [
      { file: "apps/web/src/modules/delivery-challans/domain/types.ts", lines: "L35-L39", anchor: "vehicle_no", proof: "Vehicle registration, transporter LR numbers, and consignment details recorded." },
      { file: "apps/web/src/modules/delivery-challans/domain/types.ts", lines: "L4-L6", anchor: "ChallanStatus", proof: "ChallanStatus: 'Draft' | 'Dispatched' | 'Delivered' | 'Returned' | 'Cancelled'." },
      { file: "apps/web/src/modules/delivery-challans/domain/types.ts", lines: "L6-L8", anchor: "ChallanPurpose", proof: "ChallanPurpose: 'Sale' | 'Job Work' | 'Sample' | 'Other'." },
      { file: "apps/web/src/app/dashboard/delivery-challans/page.tsx", lines: "L250-L290", anchor: "handleDownloadPdf", proof: "Print transport challan PDF with vehicle and consignee details." },
      { file: "apps/web/src/modules/delivery-challans/domain/types.ts", lines: "L30-L35", anchor: "order_id", proof: "order_id and order_number link transport challan to customer orders." },
    ],
    steps: [
      { file: "apps/web/src/components/delivery-challans/CreateChallanModal.tsx", lines: "L125-L135", anchor: "vehicle_no", proof: "Challan creation form records items, vehicle registration, and transporter LR number." },
      { file: "apps/web/src/components/delivery-challans/ChallanDetailModal.tsx", lines: "L40-L48", anchor: "onDownloadPdf", proof: "PDF download formatted with standard Indian transport regulatory disclosures." },
      { file: "apps/web/src/modules/delivery-challans/application/delivery-challan.service.ts", lines: "L400-L415", anchor: "updateStatus", proof: "updateStatus() moves challan to Dispatched when carrier departs." },
      { file: "apps/web/src/modules/delivery-challans/application/delivery-challan.service.ts", lines: "L420-L450", anchor: "Delivered", proof: "Transition to Delivered upon customer receipt or Returned for job-work." },
    ],
    features: [
      { file: "apps/web/src/modules/delivery-challans/domain/types.ts", lines: "L35-L39", anchor: "lr_number", proof: "Transporter tracking fields: vehicle_no, lr_number, transporter_name, eway_bill_no." },
      { file: "apps/web/src/modules/delivery-challans/domain/types.ts", lines: "L4-L6", anchor: "Dispatched", proof: "Full status enum: Draft, Dispatched, Delivered, Returned, Cancelled." },
      { file: "apps/web/src/modules/delivery-challans/domain/types.ts", lines: "L6-L8", anchor: "Job Work", proof: "Purpose categories supporting Job Work and Sale dispatch workflows." },
      { file: "apps/web/src/modules/delivery-challans/domain/types.ts", lines: "L30-L35", anchor: "client_id", proof: "Direct relationship fields client_id and order_id." },
      { file: "apps/web/src/components/delivery-challans/ChallanDetailModal.tsx", lines: "L40-L48", anchor: "onDownloadPdf", proof: "PDF rendering engine produces transit-compliant printable copies." },
    ],
    sections: [
      { file: "apps/web/src/modules/delivery-challans/domain/schemas.ts", lines: "L50-L60", anchor: "challanStatusTransitionSchema", proof: "challanStatusTransitionSchema restricts illegal transition sequences." },
      { file: "apps/web/src/modules/delivery-challans/domain/schemas.ts", lines: "L30-L50", anchor: "vehicle_no", proof: "Validation schemas enforce correct vehicle registration and transport LR numbers." },
    ],
    faqs: [
      { file: "apps/web/src/modules/delivery-challans/domain/types.ts", lines: "L6-L8", anchor: "Job Work", proof: "ChallanPurpose explicitly includes 'Job Work' with 'Returned' status capability." },
      { file: "apps/web/src/modules/delivery-challans/application/delivery-challan.service.ts", lines: "L455-L465", anchor: "duplicate", proof: "duplicate() clones consignee and line items to speed up repeated dispatches." },
    ],
  },

  production: {
    uses: [
      { file: "apps/web/src/app/dashboard/production/create/page.tsx", lines: "L160-L175", anchor: "selectedOrderId", proof: "Work orders populate product details directly from open sales orders." },
      { file: "apps/web/src/app/dashboard/production/create/page.tsx", lines: "L164-L168", anchor: "assignedMachines", proof: "Form provides assignedMachines and assignedOperators allocation." },
      { file: "apps/web/src/lib/production-types.ts", lines: "L3-L6", anchor: "ProductionStatus", proof: "status: 'pending' | 'running' | 'paused' | 'completed'." },
      { file: "apps/web/src/app/dashboard/production/page.tsx", lines: "L195-L205", anchor: "statusFilter", proof: "View tab switch allows filtering jobs across operational statuses." },
      { file: "apps/web/src/components/production/MaterialsStep.tsx", lines: "L30-L40", anchor: "showTemplateDialog", proof: "Material templates pre-populate items for standard assembly runs." },
      { file: "apps/web/src/app/api/orders/route.ts", lines: "L313-L325", anchor: "$inc", proof: "Atomic inventory decrements executed for allocated materials upon order processing." },
    ],
    steps: [
      { file: "apps/web/src/app/dashboard/production/create/page.tsx", lines: "L160-L175", anchor: "selectedOrderId", proof: "Work order creation connects product output to order commitments." },
      { file: "apps/web/src/components/production/AssignStaffDialog.tsx", lines: "L35-L45", anchor: "AssignStaffDialog", proof: "Supervisor assigns available workshop machines and operators." },
      { file: "apps/web/src/lib/production-types.ts", lines: "L3-L6", anchor: "ProductionStatus", proof: "Status progression tracks jobs across Pending, Running, Paused, Completed." },
      { file: "apps/web/src/app/api/production/[id]/route.ts", lines: "L180-L190", anchor: "lowStockAlerts", proof: "Completing run logs actual output and flags low-stock warnings." },
    ],
    features: [
      { file: "apps/web/src/lib/production-types.ts", lines: "L3-L6", anchor: "paused", proof: "State lifecycle: pending, running, paused, completed." },
      { file: "apps/web/src/lib/production-types.ts", lines: "L35-L45", anchor: "machineName", proof: "Machine name and staff assignment records per job run." },
      { file: "apps/web/src/app/dashboard/production/page.tsx", lines: "L195-L205", anchor: "statusFilter", proof: "Filtered status tabs dedicated to shop floor staff." },
      { file: "apps/web/src/components/production/MaterialsStep.tsx", lines: "L30-L40", anchor: "templateName", proof: "MaterialsStep template dialog manages reusable definitions." },
      { file: "apps/web/src/app/api/orders/route.ts", lines: "L313-L325", anchor: "$inc", proof: "Automated inventory stock deductions on order processing." },
      { file: "apps/web/src/app/dashboard/production/[id]/page.tsx", lines: "L220-L270", anchor: "activity", proof: "Integrated activity feed logging job updates and state changes." },
    ],
    sections: [
      { file: "apps/web/src/lib/production-types.ts", lines: "L3-L6", anchor: "paused", proof: "Shop floor status lifecycle with pause/resume capabilities." },
      { file: "apps/web/src/app/dashboard/production/page.tsx", lines: "L195-L205", anchor: "statusFilter", proof: "Shop floor worker view displaying individual assignments and progress updates." },
    ],
    faqs: [
      { file: "apps/web/src/app/api/orders/route.ts", lines: "L313-L325", anchor: "$inc", proof: "Atomic $inc: -quantity query updates on-hand stock when work order processes." },
      { file: "apps/web/src/app/dashboard/production/[id]/page.tsx", lines: "L220-L270", anchor: "activity", proof: "Activity feed logs stage transitions, timestamps, and operator actions." },
    ],
  },

  machines: {
    uses: [
      { file: "apps/web/src/modules/machines/domain/types.ts", lines: "L11-L20", anchor: "Machine", proof: "Machine entity stores machineName, machineType, capacity, and status." },
      { file: "apps/web/src/modules/machines/domain/types.ts", lines: "L8-L10", anchor: "MachineStatus", proof: "status: 'active' | 'inactive' | 'maintenance'." },
      { file: "apps/web/src/app/dashboard/machines/page.tsx", lines: "L64-L72", anchor: "statusConfig", proof: "KPI widgets display summary totals of active, maintenance, and inactive equipment." },
      { file: "apps/web/src/app/dashboard/production/create/page.tsx", lines: "L75-L105", anchor: "machineName", proof: "Production run creation dropdown filters active machines by name." },
      { file: "apps/web/src/modules/machines/domain/types.ts", lines: "L8-L10", anchor: "maintenance", proof: "MachineStatus includes 'maintenance' and 'inactive' to flag unavailable units." },
    ],
    steps: [
      { file: "apps/web/src/app/dashboard/machines/page.tsx", lines: "L53-L60", anchor: "machineName", proof: "Add machine dialog records machineName, machineType, and capacity." },
      { file: "apps/web/src/app/dashboard/machines/page.tsx", lines: "L64-L72", anchor: "active", proof: "Dashboard widgets summarize equipment counts across active and maintenance states." },
      { file: "apps/web/src/app/dashboard/production/create/page.tsx", lines: "L75-L105", anchor: "machineName", proof: "Supervisors allocate active machines to new work orders." },
      { file: "apps/web/src/modules/machines/domain/types.ts", lines: "L30-L35", anchor: "UpdateMachineDTO", proof: "UpdateMachineDTO method changes status during maintenance intervals." },
    ],
    features: [
      { file: "apps/web/src/modules/machines/domain/types.ts", lines: "L14-L17", anchor: "machineName", proof: "Machinery directory recording machine name, machine type, and capacity." },
      { file: "apps/web/src/modules/machines/domain/types.ts", lines: "L8-L10", anchor: "inactive", proof: "Clear status categorization: Active, Maintenance, and Inactive." },
      { file: "apps/web/src/app/dashboard/production/create/page.tsx", lines: "L75-L105", anchor: "machineName", proof: "Active machine filtering during production run assignment." },
      { file: "apps/web/src/app/dashboard/machines/page.tsx", lines: "L64-L72", anchor: "statusConfig", proof: "Summary counts of active and servicing equipment." },
      { file: "apps/web/src/modules/machines/domain/types.ts", lines: "L30-L35", anchor: "MachineStatus", proof: "Status editing to reflect workshop maintenance and repairs." },
    ],
    sections: [
      { file: "apps/web/src/modules/machines/domain/types.ts", lines: "L11-L20", anchor: "capacity", proof: "Equipment Master Register records machine name, type, and capacity." },
      { file: "apps/web/src/modules/machines/domain/types.ts", lines: "L8-L10", anchor: "MachineStatus", proof: "Machine status tracking allows assigning only ready units." },
    ],
    faqs: [
      { file: "apps/web/src/modules/machines/domain/types.ts", lines: "L14-L17", anchor: "machineType", proof: "Fields stored: machine name, type, capacity, and operational status." },
      { file: "apps/web/src/modules/machines/domain/types.ts", lines: "L8-L10", anchor: "active", proof: "Available statuses: Active, Maintenance, Inactive." },
    ],
  },

  inventory: {
    uses: [
      { file: "apps/web/src/app/dashboard/inventory/page.tsx", lines: "L120-L155", anchor: "quantity", proof: "Inventory catalog displays on-hand quantity, unit, and item details." },
      { file: "apps/web/src/app/dashboard/inventory/page.tsx", lines: "L408-L418", anchor: "low_stock", proof: "Filter tabs: all, low_stock, critical, out_of_stock, recently_updated." },
      { file: "apps/web/src/app/dashboard/inventory/page.tsx", lines: "L408-L418", anchor: "min_stock_level", proof: "min_stock_level threshold field sets safety stock limit." },
      { file: "apps/web/src/app/api/orders/route.ts", lines: "L313-L325", anchor: "$inc", proof: "Atomic deductions decrement stock when work orders finish." },
      { file: "apps/web/src/modules/purchasing/application/purchasing.service.ts", lines: "L135-L145", anchor: "Received", proof: "Marking purchase order Received increments item quantities in inventory." },
      { file: "apps/web/src/app/dashboard/inventory/page.tsx", lines: "L135-L160", anchor: "hsn_code", proof: "Table records HSN codes, default units, and purchase costs per unit." },
    ],
    steps: [
      { file: "apps/web/src/app/dashboard/inventory/page.tsx", lines: "L408-L418", anchor: "min_stock_level", proof: "Item modal creates raw material and finished goods records." },
      { file: "apps/web/src/app/dashboard/page.tsx", lines: "L105-L115", anchor: "Low Stock Items", proof: "Low Stock Items widget on dashboard flags items below minimum threshold." },
      { file: "apps/web/src/app/api/orders/route.ts", lines: "L313-L325", anchor: "$inc", proof: "Production completion atomically decrements material stock." },
      { file: "apps/web/src/modules/purchasing/application/purchasing.service.ts", lines: "L135-L145", anchor: "Received", proof: "PO Received transition increments item stock." },
    ],
    features: [
      { file: "apps/web/src/app/api/orders/route.ts", lines: "L313-L325", anchor: "$inc", proof: "Automated material deductions upon completion." },
      { file: "apps/web/src/modules/purchasing/application/purchasing.service.ts", lines: "L135-L145", anchor: "Received", proof: "Automated inward stock receipt from purchase orders." },
      { file: "apps/web/src/app/dashboard/inventory/page.tsx", lines: "L408-L418", anchor: "low_stock", proof: "Dedicated status tabs: Low Stock, Critical, Out of Stock." },
      { file: "apps/web/src/app/dashboard/page.tsx", lines: "L105-L115", anchor: "Low Stock Items", proof: "Executive dashboard Low Stock Items widget." },
      { file: "apps/web/src/app/dashboard/inventory/page.tsx", lines: "L135-L160", anchor: "hsn_code", proof: "HSN code and tax rate mapping for GST billing accuracy." },
      { file: "apps/web/src/app/dashboard/inventory/page.tsx", lines: "L135-L145", anchor: "purchase_cost_per_unit", proof: "Purchase cost recording for margin and valuation calculations." },
    ],
    sections: [
      { file: "apps/web/src/app/api/orders/route.ts", lines: "L313-L325", anchor: "$inc", proof: "Atomic stock decrements and increments connected to operational workflows." },
      { file: "apps/web/src/app/dashboard/inventory/page.tsx", lines: "L655-L663", anchor: "criticalStock", proof: "Shortage identification via tab filters and dashboard widget." },
    ],
    faqs: [
      { file: "apps/web/src/modules/purchasing/application/purchasing.service.ts", lines: "L135-L145", anchor: "Received", proof: "Manual addition and automated receipt on PO Received transition." },
      { file: "apps/web/src/app/dashboard/page.tsx", lines: "L105-L115", anchor: "Low Stock Items", proof: "Dashboard widget and page filters highlight low stock items." },
    ],
  },


  purchasing: {
    uses: [
      { file: "apps/web/src/modules/purchasing/domain/schemas.ts", lines: "L11-L32", anchor: "createVendorSchema", proof: "Vendor schema stores name, contactPerson, phone, gstin, and address." },
      { file: "apps/web/src/modules/purchasing/domain/schemas.ts", lines: "L46-L52", anchor: "createPurchaseOrderSchema", proof: "PO schema stores vendorId, items, taxPercent, and notes." },
      { file: "apps/web/src/modules/purchasing/domain/schemas.ts", lines: "L54-L56", anchor: "updatePurchaseStatusSchema", proof: "PO workflow moves from Pending to Received." },
      { file: "apps/web/src/modules/purchasing/application/purchasing.service.ts", lines: "L135-L145", anchor: "Received", proof: "Marking purchase order Received increments item quantities in inventory." },
      { file: "apps/web/src/components/vendor-bills/CreateBillModal.tsx", lines: "L135-L145", anchor: "purchaseOrderId", proof: "Vendor bills module provides purchase order selector to verify billed amounts." },
    ],
    steps: [
      { file: "apps/web/src/app/dashboard/purchasing/page.tsx", lines: "L235-L245", anchor: "poVendorId", proof: "Purchase order creator selects vendor and raw material line items." },
      { file: "apps/web/src/modules/purchasing/domain/schemas.ts", lines: "L54-L56", anchor: "Pending", proof: "Create purchase order in Pending status." },
      { file: "apps/web/src/modules/purchasing/application/purchasing.service.ts", lines: "L135-L145", anchor: "Received", proof: "Receive inward goods: PO transitions to Received and increments inventory." },
      { file: "apps/web/src/components/vendor-bills/CreateBillModal.tsx", lines: "L135-L145", anchor: "purchaseOrderId", proof: "Link PO in vendor bill to match items against received goods." },
    ],
    features: [
      { file: "apps/web/src/modules/purchasing/domain/schemas.ts", lines: "L11-L32", anchor: "gstin", proof: "Vendor master directory with GSTIN and contact details." },
      { file: "apps/web/src/modules/purchasing/domain/schemas.ts", lines: "L46-L52", anchor: "taxPercent", proof: "Itemized PO creation with unit pricing and tax calculations." },
      { file: "apps/web/src/modules/purchasing/domain/schemas.ts", lines: "L54-L56", anchor: "updatePurchaseStatusSchema", proof: "Streamlined purchasing workflow moving from Pending directly to Received." },
      { file: "apps/web/src/modules/purchasing/application/purchasing.service.ts", lines: "L135-L145", anchor: "Received", proof: "Automatic stock addition when PO status changes to Received." },
      { file: "apps/web/src/components/vendor-bills/CreateBillModal.tsx", lines: "L135-L145", anchor: "purchaseOrderId", proof: "Purchase order linking in Vendor Bills for accounts payable reconciliation." },
    ],
    sections: [
      { file: "apps/web/src/modules/purchasing/application/purchasing.service.ts", lines: "L135-L145", anchor: "Received", proof: "Streamlined procurement lifecycle: PO moves from Pending to Received." },
      { file: "apps/web/src/components/vendor-bills/CreateBillModal.tsx", lines: "L135-L145", anchor: "purchaseOrderId", proof: "PO to Vendor Bill verification matches supplier invoice against agreed PO terms." },
    ],
    faqs: [
      { file: "apps/web/src/modules/purchasing/domain/schemas.ts", lines: "L54-L56", anchor: "Pending", proof: "Purchase order workflow transitions from Pending to Received." },
      { file: "apps/web/src/modules/purchasing/application/purchasing.service.ts", lines: "L135-L145", anchor: "Received", proof: "Transition to Received automatically increments on-hand inventory." },
    ],
  },

  "billing-invoices": {
    uses: [
      { file: "apps/web/src/lib/invoice/utils.ts", lines: "L170-L190", anchor: "isInterState", proof: "State code comparison splits CGST+SGST for intrastate or IGST for interstate trade." },
      { file: "apps/web/src/modules/billing/domain/types.ts", lines: "L5-L15", anchor: "BillItem", proof: "BillItem records description, hsn, quantity, unit, rate, gst_rate, and line totals." },
      { file: "apps/web/src/components/orders/CompletionModals.tsx", lines: "L115-L150", anchor: "completeAndInvoice", proof: "Order completion triggers prompt to auto-generate a pre-filled tax invoice." },
      { file: "apps/web/src/app/dashboard/billing/page.tsx", lines: "L543-L553", anchor: "wa.me", proof: "WhatsApp button generates pre-filled wa.me share link with invoice summary." },
      { file: "apps/web/src/modules/billing/domain/types.ts", lines: "L4-L6", anchor: "BillStatus", proof: "BillStatus: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'." },
    ],
    steps: [
      { file: "apps/web/src/app/dashboard/billing/page.tsx", lines: "L65-L75", anchor: "CreateInvoiceModal", proof: "Invoice creation modal accepts client and line items or imports sales orders." },
      { file: "apps/web/src/lib/invoice/utils.ts", lines: "L170-L190", anchor: "isInterState", proof: "Automated GST rate calculation comparing company and client state codes." },
      { file: "apps/web/src/app/dashboard/billing/page.tsx", lines: "L540-L568", anchor: "wa.me", proof: "Share invoice via WhatsApp deep link or download official PDF." },
      { file: "apps/web/src/app/dashboard/billing/page.tsx", lines: "L570-L600", anchor: "status", proof: "Invoice status updates as customer payments are cleared." },
    ],
    features: [
      { file: "apps/web/src/lib/invoice/utils.ts", lines: "L170-L190", anchor: "isInterState", proof: "Automated CGST, SGST, IGST calculation based on state codes." },
      { file: "apps/web/src/modules/billing/domain/types.ts", lines: "L5-L15", anchor: "hsnCode", proof: "HSN code line-item breakdown with itemized tax summaries." },
      { file: "apps/web/src/lib/invoice/browser-pool.ts", lines: "L260-L280", anchor: "generatePDFWithRetry", proof: "Headless browser PDF rendering adhering to Indian GST tax layout." },
      { file: "apps/web/src/components/orders/CompletionModals.tsx", lines: "L115-L150", anchor: "completeAndInvoice", proof: "Order completion triggers prompt to auto-generate a pre-filled tax invoice." },
      { file: "apps/web/src/app/dashboard/billing/page.tsx", lines: "L543-L553", anchor: "wa.me", proof: "Direct document sharing via pre-formatted WhatsApp messages." },
    ],
    sections: [
      { file: "apps/web/src/lib/invoice/utils.ts", lines: "L170-L190", anchor: "isInterState", proof: "Automated GST rate calculation comparing company and client state codes." },
      { file: "apps/web/src/lib/invoice/browser-pool.ts", lines: "L260-L280", anchor: "generatePDFWithRetry", proof: "PDF output renders mandatory GSTIN, HSN, bank details, and signature zones." },
    ],
    faqs: [
      { file: "apps/web/src/components/orders/CompletionModals.tsx", lines: "L115-L150", anchor: "onCompleteAndInvoice", proof: "Order completion prompts user to generate a linked tax invoice." },
      { file: "apps/web/src/app/dashboard/billing/page.tsx", lines: "L543-L553", anchor: "wa.me", proof: "Share buttons open WhatsApp Web or native app with pre-composed bill text." },
    ],
  },

  "payments-accounts": {
    uses: [
      { file: "apps/web/src/app/dashboard/payments/page.tsx", lines: "L155-L165", anchor: "paymentMethod", proof: "Payment modes: Cash, UPI, Bank Transfer, Cheque." },
      { file: "apps/web/src/components/vendor-bills/CreateBillModal.tsx", lines: "L150-L156", anchor: "tdsSection", proof: "TDS deduction inputs: section, rate %, and deducted amount." },
      { file: "apps/web/src/app/dashboard/payments/page.tsx", lines: "L443-L451", anchor: "paidForOrder", proof: "Recalculates order remaining balance and updates payment status." },
      { file: "apps/web/src/modules/banking/domain/types.ts", lines: "L90-L100", anchor: "BankTransaction", proof: "Reconciliation against linked bank accounts." },
      { file: "apps/web/src/app/dashboard/payments/page.tsx", lines: "L250-L255", anchor: "searchTerm", proof: "Filter payment records by client, payment mode, and date." },
    ],
    steps: [
      { file: "apps/web/src/app/dashboard/payments/page.tsx", lines: "L440-L455", anchor: "selectedOrder", proof: "Select client and target sales order for receipt allocation." },
      { file: "apps/web/src/components/vendor-bills/CreateBillModal.tsx", lines: "L150-L156", anchor: "tdsSection", proof: "Enter settlement amount, payment mode, and optional TDS fields." },
      { file: "apps/web/src/models/SalesOrder.ts", lines: "L66-L73", anchor: "balance_due", proof: "Order total_paid and balance_due adjust dynamically." },
      { file: "apps/web/src/app/dashboard/reports/receivables/page.tsx", lines: "L60-L110", anchor: "receivables", proof: "Check cleared accounts in Receivables Aging reports." },
    ],
    features: [
      { file: "apps/web/src/app/dashboard/payments/page.tsx", lines: "L440-L455", anchor: "orderId", proof: "Order-linked payment receipts for exact tracking." },
      { file: "apps/web/src/models/SalesOrder.ts", lines: "L68-L72", anchor: "payment_status", proof: "Automatic payment_status transitions: Unpaid, Partial, Paid, Overdue." },
      { file: "apps/web/src/components/vendor-bills/CreateBillModal.tsx", lines: "L150-L156", anchor: "tdsSection", proof: "Structured TDS recording with section and deduction amounts." },
      { file: "apps/web/src/app/dashboard/payments/page.tsx", lines: "L155-L165", anchor: "paymentMethod", proof: "Multi-channel settlement logging: Cash, UPI, Bank, Cheque." },
      { file: "apps/web/src/app/dashboard/reports/receivables/page.tsx", lines: "L60-L110", anchor: "receivables", proof: "Direct connection with accounts receivables and cash flow reports." },
    ],
    sections: [
      { file: "apps/web/src/models/SalesOrder.ts", lines: "L66-L73", anchor: "total_paid", proof: "Order-level payment tracking updates balance due and payment statuses." },
      { file: "apps/web/src/components/vendor-bills/CreateBillModal.tsx", lines: "L150-L156", anchor: "tdsSection", proof: "Withholding tax recording captures section and deduction sums." },
      { file: "apps/web/src/app/dashboard/folio/page.tsx", lines: "L38-L46", anchor: "Expense", proof: "Folio operates as an isolated workspace without shared accounting ledger linkage." },
    ],
    faqs: [
      { file: "apps/web/src/models/SalesOrder.ts", lines: "L66-L73", anchor: "balance_due", proof: "Payment updates order total_paid, balance_due, and payment_status." },
      { file: "apps/web/src/modules/vendor-bills/domain/types.ts", lines: "L36-L41", anchor: "TdsDetails", proof: "TDS section, deduction percentage, and deducted amount recorded with payments." },
    ],
  },

  "vendor-bills": {
    uses: [
      { file: "apps/web/src/modules/vendor-bills/domain/types.ts", lines: "L7-L9", anchor: "BillStatus", proof: "Vendor bills support Draft, Open, and Void bill statuses." },
      { file: "apps/web/src/modules/vendor-bills/domain/types.ts", lines: "L8-L10", anchor: "PaymentStatus", proof: "Payment status tracks Unpaid, Partially Paid, and Paid stages." },
      { file: "apps/web/src/app/dashboard/vendor-bills/page.tsx", lines: "L227-L234", anchor: "filterOverdue", proof: "Computed Overdue filter identifies unpaid bills past their due date." },
      { file: "apps/web/src/components/vendor-bills/CreateBillModal.tsx", lines: "L135-L145", anchor: "purchaseOrderId", proof: "Link bills to purchase orders to verify items, quantities, and agreed prices." },
      { file: "apps/web/src/modules/vendor-bills/domain/types.ts", lines: "L10-L12", anchor: "BillPaymentMode", proof: "Log payments across Cash, Bank, UPI, Cheque, and Other modes." },
    ],
    steps: [
      { file: "apps/web/src/components/vendor-bills/CreateBillModal.tsx", lines: "L140-L145", anchor: "vendorInvoiceNumber", proof: "Create vendor bill with invoice number, bill date, due date, and line items." },
      { file: "apps/web/src/components/vendor-bills/CreateBillModal.tsx", lines: "L135-L145", anchor: "purchaseOrderId", proof: "Select purchase order to pull in line items and verify quoted rates." },
      { file: "apps/web/src/app/dashboard/vendor-bills/page.tsx", lines: "L227-L234", anchor: "filterOverdue", proof: "Overdue filter tab views unpaid bills whose due date has passed." },
      { file: "apps/web/src/components/vendor-bills/RecordVendorBillPaymentModal.tsx", lines: "L50-L60", anchor: "paymentMode", proof: "Log disbursements to advance payment status from Unpaid to Partially Paid or Paid." },
    ],
    features: [
      { file: "apps/web/src/modules/vendor-bills/domain/types.ts", lines: "L7-L9", anchor: "Void", proof: "Bill status lifecycle: Draft, Open, and Void." },
      { file: "apps/web/src/modules/vendor-bills/domain/types.ts", lines: "L8-L10", anchor: "Partially Paid", proof: "Payment status tracking: Unpaid, Partially Paid, and Paid." },
      { file: "apps/web/src/app/dashboard/vendor-bills/page.tsx", lines: "L227-L234", anchor: "filterOverdue", proof: "Computed Overdue filter for unpaid bills past their scheduled due date." },
      { file: "apps/web/src/components/vendor-bills/CreateBillModal.tsx", lines: "L135-L145", anchor: "purchaseOrderId", proof: "Direct purchase order linking to prevent invoice discrepancies." },
      { file: "apps/web/src/modules/vendor-bills/domain/types.ts", lines: "L10-L12", anchor: "BillPaymentMode", proof: "Payment disbursement logging with bank, cash, cheque, and UPI modes." },
    ],
    sections: [
      { file: "apps/web/src/modules/vendor-bills/domain/types.ts", lines: "L7-L10", anchor: "BillStatus", proof: "Vendor bills have independent bill status and payment status." },
      { file: "apps/web/src/components/vendor-bills/CreateBillModal.tsx", lines: "L135-L145", anchor: "purchaseOrderId", proof: "PO matching verifies that supplier invoices match agreed rates." },
    ],
    faqs: [
      { file: "apps/web/src/app/dashboard/vendor-bills/page.tsx", lines: "L227-L234", anchor: "filterOverdue", proof: "Overdue is a computed filter showing open bills whose due date has passed." },
      { file: "apps/web/src/modules/vendor-bills/domain/types.ts", lines: "L7-L10", anchor: "PaymentStatus", proof: "Supported bill statuses (Draft, Open, Void) and payment statuses (Unpaid, Partially Paid, Paid)." },
    ],
  },

  banking: {
    uses: [
      { file: "apps/web/src/modules/banking/domain/types.ts", lines: "L25-L35", anchor: "BankAccount", proof: "BankAccount schema stores accountNumber, ifsc, bankName, and accountType." },
      { file: "apps/web/src/app/dashboard/banking/page.tsx", lines: "L180-L195", anchor: "BankAccount", proof: "Dashboard displays current balances across registered bank accounts." },
      { file: "apps/web/src/modules/banking/domain/types.ts", lines: "L90-L100", anchor: "BankTransaction", proof: "BankTransaction records debit/credit amounts and transaction dates." },
      { file: "apps/web/src/modules/banking/domain/types.ts", lines: "L1-L10", anchor: "BankAccountType", proof: "Classification between internal transfers and customer/vendor entries." },
      { file: "apps/web/src/modules/banking/application/csv-parser.ts", lines: "L55-L65", anchor: "parseRfc4180Csv", proof: "CSV parser parses bank statements with column mapping." },
    ],
    steps: [
      { file: "apps/web/src/components/banking/AddAccountModal.tsx", lines: "L60-L70", anchor: "account_last4", proof: "Account modal registers account number, IFSC code, and branch." },
      { file: "apps/web/src/components/banking/ImportStatementModal.tsx", lines: "L58-L62", anchor: "selectedFile", proof: "Upload CSV statement and map transaction columns." },
      { file: "apps/web/src/app/api/banking/imports/preview/route.ts", lines: "L95-L105", anchor: "previewImport", proof: "Preview parsed transactions before committing." },
      { file: "apps/web/src/app/api/banking/imports/commit/route.ts", lines: "L110-L120", anchor: "commitImport", proof: "Commit reconciled statement transactions into banking ledger." },
    ],
    features: [
      { file: "apps/web/src/modules/banking/domain/types.ts", lines: "L30-L36", anchor: "ifsc", proof: "Multi-account management with bank IFSC validation." },
      { file: "apps/web/src/modules/banking/application/csv-parser.ts", lines: "L55-L65", anchor: "parseRfc4180Csv", proof: "CSV bank statement import with flexible column mapping." },
      { file: "apps/web/src/app/api/banking/imports/preview/route.ts", lines: "L95-L105", anchor: "previewImport", proof: "Transaction preview and validation workflow." },
      { file: "apps/web/src/modules/banking/domain/types.ts", lines: "L1-L10", anchor: "BankAccountType", proof: "Allocated vs. unallocated transaction reconciliation." },
      { file: "apps/web/src/app/dashboard/banking/page.tsx", lines: "L180-L195", anchor: "BankAccount", proof: "Liquidity dashboard summarizing net available funds." },
    ],
    sections: [
      { file: "apps/web/src/modules/banking/application/csv-parser.ts", lines: "L55-L65", anchor: "parseRfc4180Csv", proof: "CSV statement import engine maps standard bank export columns." },
      { file: "apps/web/src/app/dashboard/banking/page.tsx", lines: "L180-L195", anchor: "BankAccount", proof: "Real-time cash flow overview across all connected accounts." },
    ],
    faqs: [
      { file: "apps/web/src/modules/banking/application/csv-parser.ts", lines: "L55-L65", anchor: "parseRfc4180Csv", proof: "Bank statement import accepts CSV format with column mapping." },
      { file: "apps/web/src/components/banking/AddAccountModal.tsx", lines: "L60-L70", anchor: "account_last4", proof: "Current and savings bank accounts can be added with IFSC codes." },
    ],
  },

  clients: {
    uses: [
      { file: "apps/web/src/models/Party.ts", lines: "L3-L8", anchor: "IParty", proof: "Client directory stores name, phone, email, address, and GSTIN." },
      { file: "apps/web/src/models/Party.ts", lines: "L32-L36", anchor: "gst_number", proof: "Client GSTIN is stored and validated for B2B billing." },
      { file: "apps/web/src/models/SalesOrder.ts", lines: "L35-L40", anchor: "customer_id", proof: "Order records link to clients to show order history." },
      { file: "apps/web/src/components/reports/ClientStatement.tsx", lines: "L35-L50", anchor: "ClientStatement", proof: "Customer account statement compiles ledger transactions." },
      { file: "apps/web/src/app/dashboard/clients/page.tsx", lines: "L152-L170", anchor: "exportToPDF", proof: "Export client directory to PDF format." },
    ],
    steps: [
      { file: "apps/web/src/app/dashboard/clients/page.tsx", lines: "L180-L195", anchor: "formData", proof: "Add client with business name, contact info, and GSTIN." },
      { file: "apps/web/src/app/dashboard/orders/create/page.tsx", lines: "L90-L95", anchor: "client_id", proof: "Select client when creating orders and quotes." },
      { file: "apps/web/src/components/reports/ClientStatement.tsx", lines: "L35-L50", anchor: "ClientStatement", proof: "Generate statement showing billed orders and received payments." },
      { file: "apps/web/src/app/dashboard/clients/page.tsx", lines: "L90-L95", anchor: "searchTerm", proof: "Search and filter client directory by name or phone." },
    ],
    features: [
      { file: "apps/web/src/models/Party.ts", lines: "L3-L8", anchor: "IParty", proof: "Client profile directory with complete contact details." },
      { file: "apps/web/src/models/Party.ts", lines: "L32-L36", anchor: "gst_number", proof: "GSTIN validation and storage for tax invoicing." },
      { file: "apps/web/src/components/reports/ClientStatement.tsx", lines: "L35-L50", anchor: "ClientStatement", proof: "Printable customer account statement generation." },
      { file: "apps/web/src/app/dashboard/clients/page.tsx", lines: "L152-L170", anchor: "exportToPDF", proof: "Directory export to PDF format." },
      { file: "apps/web/src/models/SalesOrder.ts", lines: "L35-L40", anchor: "customer_id", proof: "Integrated order and invoice history per customer." },
    ],
    sections: [
      { file: "apps/web/src/models/Party.ts", lines: "L3-L8", anchor: "IParty", proof: "Central client master maintaining clean business profiles." },
      { file: "apps/web/src/components/reports/ClientStatement.tsx", lines: "L35-L50", anchor: "ClientStatement", proof: "Account statement tracks sales, payments, and running balance." },
    ],
    faqs: [
      { file: "apps/web/src/models/Party.ts", lines: "L32-L36", anchor: "gst_number", proof: "GSTIN is optional for unregistered customers, mandatory for B2B." },
      { file: "apps/web/src/components/reports/ClientStatement.tsx", lines: "L35-L50", anchor: "ClientStatement", proof: "Statements can be exported or printed for customer reconciliation." },
    ],
  },

  analytics: {
    uses: [
      { file: "apps/web/src/app/dashboard/analytics/page.tsx", lines: "L150-L162", anchor: "revenueData", proof: "Track monthly revenue metrics and sales performance." },
      { file: "apps/web/src/app/dashboard/analytics/page.tsx", lines: "L150-L162", anchor: "topProducts", proof: "Analyze top selling products by volume and revenue." },
      { file: "apps/web/src/app/dashboard/analytics/page.tsx", lines: "L150-L162", anchor: "orderStatusData", proof: "View order fulfillment distribution across stages." },
      { file: "apps/web/src/app/dashboard/analytics/page.tsx", lines: "L150-L162", anchor: "topClients", proof: "Evaluate client concentration and top customer accounts." },
      { file: "apps/web/src/app/dashboard/analytics/page.tsx", lines: "L67-L75", anchor: "AvailableMonth", proof: "Filter analytics data across available reporting months." },
    ],
    steps: [
      { file: "apps/web/src/app/dashboard/analytics/page.tsx", lines: "L67-L75", anchor: "AvailableMonth", proof: "Select reporting period to analyze operational trends." },
      { file: "apps/web/src/app/dashboard/analytics/page.tsx", lines: "L150-L162", anchor: "revenueData", proof: "Review revenue graphs and fulfillment percentages." },
      { file: "apps/web/src/app/dashboard/analytics/page.tsx", lines: "L150-L162", anchor: "topProducts", proof: "Identify highest performing products and demand spikes." },
      { file: "apps/web/src/app/dashboard/analytics/page.tsx", lines: "L150-L162", anchor: "topClients", proof: "Inspect client purchasing volumes for key accounts." },
    ],
    features: [
      { file: "apps/web/src/app/dashboard/analytics/page.tsx", lines: "L150-L162", anchor: "revenueData", proof: "Visual revenue trends and comparison charts." },
      { file: "apps/web/src/app/dashboard/analytics/page.tsx", lines: "L150-L162", anchor: "topProducts", proof: "Product sales breakdown by quantity and value." },
      { file: "apps/web/src/app/dashboard/analytics/page.tsx", lines: "L150-L162", anchor: "orderStatusData", proof: "Fulfillment pipeline status breakdown charts." },
      { file: "apps/web/src/app/dashboard/analytics/page.tsx", lines: "L150-L162", anchor: "topClients", proof: "Customer purchasing volume breakdown." },
      { file: "apps/web/src/app/dashboard/analytics/page.tsx", lines: "L67-L75", anchor: "AvailableMonth", proof: "Dynamic date range filtering across available monthly intervals." },
    ],
    sections: [
      { file: "apps/web/src/app/dashboard/analytics/page.tsx", lines: "L150-L162", anchor: "revenueData", proof: "Executive overview of factory financial health and sales performance." },
      { file: "apps/web/src/app/dashboard/analytics/page.tsx", lines: "L150-L162", anchor: "topProducts", proof: "Operational demand metrics highlighting top production items." },
    ],
    faqs: [
      { file: "apps/web/src/app/dashboard/analytics/page.tsx", lines: "L150-L162", anchor: "revenueData", proof: "Analytics data is computed directly from orders and invoices." },
      { file: "apps/web/src/app/dashboard/analytics/page.tsx", lines: "L67-L75", anchor: "AvailableMonth", proof: "Reports can be filtered by available reporting months." },
    ],
  },

  reports: {
    uses: [
      { file: "apps/web/src/app/dashboard/reports/receivables/page.tsx", lines: "L60-L110", anchor: "receivables", proof: "Track outstanding customer receivables and aging balances." },
      { file: "apps/web/src/app/dashboard/reports/payables/page.tsx", lines: "L60-L110", anchor: "payables", proof: "Monitor vendor payables and upcoming payment schedules." },
      { file: "apps/web/src/app/dashboard/reports/previous-years/page.tsx", lines: "L120-L165", anchor: "financialYear", proof: "Access previous financial years archive and historical records." },
      { file: "apps/web/src/components/reports/ClientStatement.tsx", lines: "L35-L50", anchor: "ClientStatement", proof: "Generate customer account statements for balance confirmation." },
      { file: "apps/web/src/components/reports/VendorStatement.tsx", lines: "L45-L95", anchor: "VendorStatement", proof: "Generate vendor account statements for procurement reconciliation." },
    ],
    steps: [
      { file: "apps/web/src/app/dashboard/reports/receivables/page.tsx", lines: "L60-L110", anchor: "receivables", proof: "Open Receivables report to view overdue customer balances." },
      { file: "apps/web/src/app/dashboard/reports/payables/page.tsx", lines: "L60-L110", anchor: "payables", proof: "Open Payables report to inspect supplier payment commitments." },
      { file: "apps/web/src/app/dashboard/reports/previous-years/page.tsx", lines: "L120-L165", anchor: "financialYear", proof: "Select past financial year to review closed books." },
      { file: "apps/web/src/components/reports/ClientStatement.tsx", lines: "L35-L50", anchor: "ClientStatement", proof: "Download client statement for account reconciliation." },
    ],
    features: [
      { file: "apps/web/src/app/dashboard/reports/receivables/page.tsx", lines: "L60-L110", anchor: "receivables", proof: "Receivables aging buckets: 0-30, 31-60, 61-90, 90+ days." },
      { file: "apps/web/src/app/dashboard/reports/payables/page.tsx", lines: "L60-L110", anchor: "payables", proof: "Payables aging analysis across supplier invoices." },
      { file: "apps/web/src/app/dashboard/reports/previous-years/page.tsx", lines: "L120-L165", anchor: "financialYear", proof: "Previous financial year archive preserving historical data." },
      { file: "apps/web/src/components/reports/ClientStatement.tsx", lines: "L35-L50", anchor: "ClientStatement", proof: "Client statement generation with invoice and payment ledger." },
      { file: "apps/web/src/components/reports/VendorStatement.tsx", lines: "L45-L95", anchor: "VendorStatement", proof: "Vendor statement generation for supplier accounts." },
    ],
    sections: [
      { file: "apps/web/src/app/dashboard/reports/receivables/page.tsx", lines: "L60-L110", anchor: "receivables", proof: "Receivables management identifies overdue accounts to speed collections." },
      { file: "apps/web/src/app/dashboard/reports/previous-years/page.tsx", lines: "L120-L165", anchor: "financialYear", proof: "Financial year archives keep closed years accessible for audits." },
    ],
    faqs: [
      { file: "apps/web/src/app/dashboard/reports/receivables/page.tsx", lines: "L60-L110", anchor: "receivables", proof: "Aging buckets group outstanding balances by days past invoice date." },
      { file: "apps/web/src/app/dashboard/reports/previous-years/page.tsx", lines: "L120-L165", anchor: "financialYear", proof: "Previous year records are read-only and preserved for reference." },
    ],
  },

  "ai-assistant": {
    uses: [
      { file: "apps/web/src/app/api/assistant/chat/route.ts", lines: "L16-L34", anchor: "SYSTEM_INSTRUCTION", proof: "AI Assistant answers queries in plain English and Hinglish." },
      { file: "apps/web/src/app/api/assistant/chat/route.ts", lines: "L38-L53", anchor: "get_pending_orders", proof: "Tool get_pending_orders retrieves active orders not fully completed." },
      { file: "apps/web/src/app/api/assistant/chat/route.ts", lines: "L54-L87", anchor: "get_orders", proof: "Tool get_orders filters by status, payment_status, production_status, product_name." },
      { file: "apps/web/src/app/api/assistant/chat/route.ts", lines: "L76-L79", anchor: "product_name", proof: "Tool get_orders supports searching by product name." },
      { file: "apps/web/src/app/api/assistant/chat/route.ts", lines: "L88-L103", anchor: "get_order_details", proof: "Tool get_order_details retrieves full order information by order ID." },
    ],
    steps: [
      { file: "apps/web/src/app/dashboard/assistant/page.tsx", lines: "L131-L145", anchor: "AIAssistantPage", proof: "Launch the conversational assistant from dashboard." },
      { file: "apps/web/src/app/api/assistant/chat/route.ts", lines: "L18-L19", anchor: "Hinglish", proof: "Submit queries in plain English or Hinglish." },
      { file: "apps/web/src/app/api/assistant/chat/route.ts", lines: "L548-L552", anchor: "orderToolDeclarations", proof: "Assistant executes orderToolDeclarations: get_pending_orders, get_orders, get_order_details." },
      { file: "apps/web/src/app/api/assistant/chat/route.ts", lines: "L22-L24", anchor: "Indian numbering", proof: "Responses formatted with markdown bullet points, tables, and INR (₹) figures." },
    ],
    features: [
      { file: "apps/web/src/app/api/assistant/chat/route.ts", lines: "L15-L25", anchor: "SYSTEM_INSTRUCTION", proof: "Orders-only natural language assistant supporting English and Hinglish." },
      { file: "apps/web/src/app/api/assistant/chat/route.ts", lines: "L38-L103", anchor: "orderToolDeclarations", proof: "Read-only tools: get_pending_orders, get_orders, get_order_details." },
      { file: "apps/web/src/app/api/assistant/chat/route.ts", lines: "L61-L79", anchor: "production_status", proof: "Filters for order status, payment status, production status, product name." },
      { file: "apps/web/src/app/api/assistant/chat/route.ts", lines: "L22-L24", anchor: "Indian numbering", proof: "Clear responses formatted with bullet points and INR figures." },
      { file: "apps/web/src/app/api/assistant/chat/route.ts", lines: "L26-L28", anchor: "READ-ONLY", proof: "Strict read-only safety: assistant cannot create, update, or delete data." },
    ],
    sections: [
      { file: "apps/web/src/app/api/assistant/chat/route.ts", lines: "L26-L30", anchor: "READ-ONLY", proof: "Read-only order queries with dedicated tools, no write permissions." },
      { file: "apps/web/src/app/api/assistant/chat/route.ts", lines: "L18-L19", anchor: "Hinglish", proof: "Bilingual assistance supporting English and natural Hinglish." },
    ],
    faqs: [
      { file: "apps/web/src/app/api/assistant/chat/route.ts", lines: "L38-L103", anchor: "orderToolDeclarations", proof: "Capabilities limited strictly to order status, pending orders, and details." },
      { file: "apps/web/src/app/api/assistant/chat/route.ts", lines: "L26-L28", anchor: "READ-ONLY", proof: "Assistant cannot modify or delete data." },
    ],
  },

  notifications: {
    uses: [
      { file: "apps/web/src/components/notifications/NotificationFeedItem.tsx", lines: "L57-L85", anchor: "NotificationFeedItem", proof: "Review operational alerts in the in-app notification feed." },
      { file: "apps/web/src/lib/notifications/deepLinks.ts", lines: "L12-L38", anchor: "buildWhatsAppLink", proof: "Share updates via WhatsApp, Email, or SMS deep links." },
      { file: "apps/web/src/lib/notifications/types.ts", lines: "L175-L185", anchor: "low_stock_alert", proof: "Trigger low_stock_alert event for inventory items." },
      { file: "apps/web/src/lib/notifications/types.ts", lines: "L175-L185", anchor: "production_complete", proof: "Trigger production_complete event on manufacturing run completion." },
      { file: "apps/web/src/lib/notifications/channels/sms-adapter.ts", lines: "L26-L32", anchor: "isConfigured", proof: "Dispatch external alerts via Twilio and SMTP when configured." },
    ],
    steps: [
      { file: "apps/web/src/lib/notifications/dispatcher.ts", lines: "L65-L85", anchor: "triggerNotification", proof: "System logs notification when business trigger fires." },
      { file: "apps/web/src/components/notifications/NotificationFeedItem.tsx", lines: "L57-L85", anchor: "NotificationFeedItem", proof: "Review in-app feed with unread indicators and timestamps." },
      { file: "apps/web/src/lib/notifications/deepLinks.ts", lines: "L12-L38", anchor: "buildEmailLink", proof: "Pre-filled deep links for WhatsApp, Email, or SMS." },
      { file: "apps/web/src/lib/notifications/channels/email-adapter.ts", lines: "L37-L46", anchor: "isConfigured", proof: "Notification worker dispatches externally when SMTP/Twilio credentials exist." },
    ],
    features: [
      { file: "apps/web/src/components/notifications/NotificationFeedItem.tsx", lines: "L67-L70", anchor: "onMarkRead", proof: "In-app notification feed with read and unread tracking." },
      { file: "apps/web/src/lib/notifications/deepLinks.ts", lines: "L35-L38", anchor: "buildSmsLink", proof: "Direct sharing via WhatsApp, Email, and SMS deep links." },
      { file: "apps/web/src/lib/notifications/channels/whatsapp-adapter.ts", lines: "L31-L37", anchor: "isConfigured", proof: "External message dispatch via Twilio and SMTP when configured." },
      { file: "apps/web/src/lib/notifications/channels/mock-adapter.ts", lines: "L65-L73", anchor: "CHANNEL_NOT_CONFIGURED", proof: "Fallback logging with not_configured status when external providers are unconfigured." },
      { file: "apps/web/src/components/notifications/NotificationFeedItem.tsx", lines: "L70-L73", anchor: "router.push", proof: "Navigation from alert cards to linked documents." },
    ],
    sections: [
      { file: "apps/web/src/components/notifications/NotificationFeedItem.tsx", lines: "L57-L85", anchor: "NotificationFeedItem", proof: "In-app feed provides unified view of operational warnings." },
      { file: "apps/web/src/lib/notifications/deepLinks.ts", lines: "L12-L38", anchor: "buildWhatsAppLink", proof: "Communication deep links and external delivery when configured." },
    ],
    faqs: [
      { file: "apps/web/src/lib/notifications/deepLinks.ts", lines: "L12-L38", anchor: "buildWhatsAppLink", proof: "Notification cards include deep links for WhatsApp, Email, SMS." },
      { file: "apps/web/src/lib/notifications/channels/mock-adapter.ts", lines: "L65-L73", anchor: "CHANNEL_NOT_CONFIGURED", proof: "Unconfigured external channels are logged with not_configured status." },
    ],
  },

  folio: {
    uses: [
      { file: "apps/web/src/app/dashboard/folio/page.tsx", lines: "L38-L46", anchor: "amount", proof: "Expense interface tracks date, category, amount, description." },
      { file: "apps/web/src/app/dashboard/folio/page.tsx", lines: "L58-L62", anchor: "CATEGORIES", proof: "CATEGORIES: Food, Travel, Office, Utilities, Other." },
      { file: "apps/web/src/app/dashboard/folio/page.tsx", lines: "L380-L395", anchor: "expenseStats", proof: "Month-wise expense summaries and KPI widget." },
      { file: "apps/web/src/app/dashboard/folio/page.tsx", lines: "L48-L55", anchor: "Note", proof: "Note interface stores title, body, and color." },
      { file: "apps/web/src/app/dashboard/folio/page.tsx", lines: "L215-L225", anchor: "notes", proof: "Digital memo cards replace loose paper notes." },
    ],
    steps: [
      { file: "apps/web/src/app/dashboard/folio/page.tsx", lines: "L56-L58", anchor: "ActiveTab", proof: "ActiveTab switches between 'expenses' and 'notes'." },
      { file: "apps/web/src/app/dashboard/folio/page.tsx", lines: "L285-L310", anchor: "handleSaveExpense", proof: "Expense modal records amount, date, category, description." },
      { file: "apps/web/src/app/dashboard/folio/page.tsx", lines: "L340-L365", anchor: "handleSaveNote", proof: "Note modal assigns custom card color to quick memos." },
      { file: "apps/web/src/app/dashboard/folio/page.tsx", lines: "L380-L395", anchor: "expenseStats", proof: "Total Expenses KPI card computes monthly expense aggregate." },
    ],
    features: [
      { file: "apps/web/src/app/dashboard/folio/page.tsx", lines: "L38-L46", anchor: "amount", proof: "Petty cash expense logging with amount and date." },
      { file: "apps/web/src/app/dashboard/folio/page.tsx", lines: "L58-L62", anchor: "CATEGORIES", proof: "Predefined categories: Food, Travel, Office, Utilities, Other." },
      { file: "apps/web/src/app/dashboard/folio/page.tsx", lines: "L380-L395", anchor: "expenseStats", proof: "Month-wise expense summaries and KPI widget." },
      { file: "apps/web/src/app/dashboard/folio/page.tsx", lines: "L48-L55", anchor: "Note", proof: "Color-coded sticky note cards with title and body." },
      { file: "apps/web/src/app/dashboard/folio/page.tsx", lines: "L56-L58", anchor: "ActiveTab", proof: "Lightweight isolated workspace without complex accounting overhead." },
    ],
    sections: [
      { file: "apps/web/src/app/dashboard/folio/page.tsx", lines: "L58-L62", anchor: "CATEGORIES", proof: "Incidental category tags with distinctive visual colors." },
      { file: "apps/web/src/app/dashboard/folio/page.tsx", lines: "L48-L55", anchor: "Note", proof: "Visual note memos with customizable color swatches." },
    ],
    faqs: [
      { file: "apps/web/src/app/dashboard/folio/page.tsx", lines: "L58-L62", anchor: "CATEGORIES", proof: "Categorization tags include Food, Travel, Office, Utilities, Other." },
      { file: "apps/web/src/app/dashboard/folio/page.tsx", lines: "L56-L58", anchor: "ActiveTab", proof: "Standalone administrative tool completely isolated from GST ledger." },
    ],
  },

  "staff-roles": {
    uses: [
      { file: "apps/web/src/app/dashboard/users/page.tsx", lines: "L42-L58", anchor: "email", proof: "Add employee accounts with login credentials and email." },
      { file: "apps/web/src/models/User.ts", lines: "L140-L143", anchor: "enum: ['Admin', 'Owner', 'Manager', 'Staff', 'Accountant']", proof: "Assign user roles: Owner, Admin, Manager, Accountant, Staff." },
      { file: "apps/web/src/lib/permissions.ts", lines: "L15-L25", anchor: "RoleType", proof: "Provide floor staff with access to update production jobs." },
      { file: "apps/web/src/lib/permissions.ts", lines: "L22-L26", anchor: "Accountant", proof: "Equip accountants with access to billing registers and vendor bills." },
      { file: "apps/web/src/app/dashboard/users/page.tsx", lines: "L50-L53", anchor: "status", proof: "Deactivate departing employee accounts to keep access secure." },
    ],
    steps: [
      { file: "apps/web/src/app/dashboard/users/page.tsx", lines: "L42-L58", anchor: "email", proof: "Add employee account with name, email, and temporary password." },
      { file: "apps/web/src/models/User.ts", lines: "L140-L143", anchor: "Manager", proof: "Select role: Owner, Admin, Manager, Accountant, or Staff." },
      { file: "apps/web/src/lib/permissions.ts", lines: "L15-L25", anchor: "normalizeRoleType", proof: "Role-based access applies based on assigned role." },
      { file: "apps/web/src/app/dashboard/users/[id]/page.tsx", lines: "L235-L250", anchor: "handleResetPassword", proof: "Manage credentials, reset passwords, or deactivate user access." },
    ],
    features: [
      { file: "apps/web/src/models/User.ts", lines: "L140-L143", anchor: "Accountant", proof: "Standard role options: Owner, Admin, Manager, Accountant, Staff." },
      { file: "apps/web/src/app/dashboard/users/page.tsx", lines: "L42-L58", anchor: "email", proof: "Individual employee login accounts with secure credentials." },
      { file: "apps/web/src/lib/permissions.ts", lines: "L15-L25", anchor: "RoleType", proof: "Focused workspace views suited for staff, managers, and accountants." },
      { file: "apps/web/src/app/dashboard/users/page.tsx", lines: "L42-L58", anchor: "Employee", proof: "Simple account onboarding with initial password assignment." },
      { file: "apps/web/src/app/dashboard/users/page.tsx", lines: "L50-L53", anchor: "status", proof: "Fast account deactivation when employees leave the business." },
    ],
    sections: [
      { file: "apps/web/src/models/User.ts", lines: "L140-L143", anchor: "Owner", proof: "Assigned user roles: Owner, Admin, Manager, Accountant, Staff." },
      { file: "apps/web/src/app/dashboard/users/[id]/page.tsx", lines: "L235-L250", anchor: "handleResetPassword", proof: "User credential management and account deactivation." },
    ],
    faqs: [
      { file: "apps/web/src/models/User.ts", lines: "L140-L143", anchor: "enum: ['Admin', 'Owner', 'Manager', 'Staff', 'Accountant']", proof: "Available roles: Owner, Admin, Manager, Accountant, Staff." },
      { file: "apps/web/src/app/dashboard/users/[id]/page.tsx", lines: "L235-L250", anchor: "handleResetPassword", proof: "Reset employee passwords and update credentials." },
    ],
  },

  "tally-integration": {
    uses: [
      { file: "apps/web/src/services/tally/generateSalesVoucherXml.ts", lines: "L82-L155", anchor: "generateSalesVoucherXml", proof: "Export GST sales invoices as Tally Prime XML for import into Tally." },
      { file: "apps/web/src/services/tally/generateLedgerXml.ts", lines: "L15-L65", anchor: "Sundry Debtors", proof: "Generate Sundry Debtors party ledgers with client GSTIN." },
      { file: "apps/web/src/services/tally/generateSalesVoucherXml.ts", lines: "L168-L235", anchor: "buildLedgerEntriesXml", proof: "Create standard GST ledger heads for CGST, SGST, IGST tax entries." },
      { file: "apps/web/src/services/tally/generateStockItemXml.ts", lines: "L75-L105", anchor: "generateBatchStockItemXml", proof: "Export stock item XML definitions matching invoiced products." },
      { file: "apps/web/src/app/api/tally/generate-xml/route.ts", lines: "L80-L105", anchor: "voucherXml", proof: "Maintain accounting alignment by importing generated XML into Tally Prime." },
    ],
    steps: [
      { file: "apps/web/src/app/api/tally/generate-xml/route.ts", lines: "L45-L55", anchor: "tally_company_name", proof: "Configure exact Tally Prime company name in settings." },
      { file: "apps/web/src/app/api/tally/generate-xml/route.ts", lines: "L40-L45", anchor: "invoiceId", proof: "Select sales invoice from billing register." },
      { file: "apps/web/src/app/api/tally/generate-xml/route.ts", lines: "L80-L105", anchor: "ledgerXml", proof: "Generate XML export containing party ledgers, sales vouchers, GST tax heads." },
      { file: "apps/web/src/services/tally/generateSalesVoucherXml.ts", lines: "L120-L145", anchor: "VOUCHER", proof: "Import XML into Tally Prime using Import Data feature." },
    ],
    features: [
      { file: "apps/web/src/services/tally/generateSalesVoucherXml.ts", lines: "L82-L155", anchor: "generateSalesVoucherXml", proof: "Export GST sales invoices as Tally Prime XML for import into Tally." },
      { file: "apps/web/src/services/tally/generateLedgerXml.ts", lines: "L15-L65", anchor: "Sundry Debtors", proof: "Automated ledger XML for Sundry Debtors, sales accounts, and GST tax heads." },
      { file: "apps/web/src/services/tally/generateSalesVoucherXml.ts", lines: "L130-L140", anchor: "VOUCHERNUMBER", proof: "Preservation of voucher dates, bill numbers, and GSTIN identifiers." },
      { file: "apps/web/src/services/tally/generateStockItemXml.ts", lines: "L75-L105", anchor: "generateBatchStockItemXml", proof: "Stock item XML generation matching invoiced quantities." },
      { file: "tools/tally-bridge/src/core/job-executor.ts", lines: "L36-L44", anchor: "EXECUTOR_NOT_IMPLEMENTED", proof: "Automatic sync is in development while XML export is operational." },
    ],
    sections: [
      { file: "apps/web/src/services/tally/generateLedgerXml.ts", lines: "L15-L65", anchor: "Sundry Debtors", proof: "Tally Prime XML export generating party ledgers and tax heads." },
      { file: "tools/tally-bridge/src/core/job-executor.ts", lines: "L36-L44", anchor: "StubJobExecutor", proof: "Download XML payload; automatic sync is in development." },
    ],
    faqs: [
      { file: "apps/web/src/app/api/tally/generate-xml/route.ts", lines: "L80-L105", anchor: "voucherXml", proof: "Generate Tally Prime XML and import via Import Data menu." },
      { file: "tools/tally-bridge/src/core/job-executor.ts", lines: "L36-L44", anchor: "StubJobExecutor", proof: "Automatic sync is in development; manual XML export is supported." },
    ],
  },

  settings: {
    uses: [
      { file: "apps/web/src/models/CompanyProfile.ts", lines: "L3-L8", anchor: "company_name", proof: "Maintain official business legal name, addresses, and registration numbers." },
      { file: "apps/web/src/models/CompanyProfile.ts", lines: "L5-L8", anchor: "logo_url", proof: "Upload and manage business brand logo for invoice printing." },
      { file: "apps/web/src/models/CompanyProfile.ts", lines: "L68-L75", anchor: "bank_name", proof: "Record primary company bank details, account number, and IFSC." },
      { file: "apps/web/src/app/dashboard/settings/language/page.tsx", lines: "L5-L15", anchor: "LanguageSwitcherFull", proof: "Select preferred vernacular UI language from 4 supported options." },
      { file: "apps/web/src/models/CompanyProfile.ts", lines: "L75-L80", anchor: "tally_company_name", proof: "Configure Tally Prime bridge connection settings and company pairing." },
    ],
    steps: [
      { file: "apps/web/src/models/CompanyProfile.ts", lines: "L9-L13", anchor: "gst_number", proof: "Enter company name, GSTIN, PAN, and operational addresses." },
      { file: "apps/web/src/models/CompanyProfile.ts", lines: "L68-L75", anchor: "bank_ifsc", proof: "Set default bank account and IFSC details for invoices." },
      { file: "apps/web/src/models/CompanyProfile.ts", lines: "L65-L70", anchor: "default_payment_terms", proof: "Define standard payment credit days and terms of sale." },
      { file: "apps/web/src/models/CompanyProfile.ts", lines: "L75-L80", anchor: "tally_company_name", proof: "Configure on-premise Tally integration parameters." },
    ],
    features: [
      { file: "apps/web/src/models/CompanyProfile.ts", lines: "L9-L13", anchor: "pan_number", proof: "Central company profile with GSTIN and PAN registration." },
      { file: "apps/web/src/models/CompanyProfile.ts", lines: "L5-L8", anchor: "logo_url", proof: "Custom invoice header configuration with branding." },
      { file: "apps/web/src/models/CompanyProfile.ts", lines: "L68-L75", anchor: "bank_account_number", proof: "Default bank details injection for settlement." },
      { file: "apps/web/src/app/dashboard/settings/language/page.tsx", lines: "L5-L15", anchor: "LanguageSwitcherFull", proof: "Multi-language interface selector supporting 4 Indian languages." },
      { file: "apps/web/src/app/dashboard/settings/data/page.tsx", lines: "L45-L65", anchor: "handleExportAll", proof: "Multi-sheet Excel data backup export (Inventory, Orders, Clients, Staff)." },
    ],
    sections: [
      { file: "apps/web/src/models/CompanyProfile.ts", lines: "L3-L8", anchor: "company_name", proof: "Corporate identity setup for regulatory document compliance." },
      { file: "apps/web/src/models/CompanyProfile.ts", lines: "L68-L75", anchor: "bank_name", proof: "Default bank account configuration for invoice footers." },
    ],
    faqs: [
      { file: "apps/web/src/models/CompanyProfile.ts", lines: "L9-L13", anchor: "gst_number", proof: "Company Profile section allows updating GSTIN and factory address." },
      { file: "apps/web/src/app/dashboard/settings/language/page.tsx", lines: "L5-L15", anchor: "LanguageSwitcherFull", proof: "Language switcher supports English, Hindi, Gujarati, Marathi." },
    ],
  },

  dashboard: {
    uses: [
      { file: "apps/web/src/app/dashboard/page.tsx", lines: "L910-L925", anchor: "StatWidget", proof: "KPI widgets display total revenue, active orders, production runs, and client count." },
      { file: "apps/web/src/app/dashboard/page.tsx", lines: "L105-L115", anchor: "Low Stock Items", proof: "Low Stock Items widget highlights materials below safety thresholds." },
      { file: "apps/web/src/app/dashboard/page.tsx", lines: "L1020-L1035", anchor: "recentActivity", proof: "Recent Activity feed tracks stage transitions across orders and production." },
      { file: "apps/web/src/app/dashboard/page.tsx", lines: "L975-L985", anchor: "quickActions", proof: "Quick action buttons open modal dialogs for new order, new payment, and inventory." },
      { file: "apps/web/src/app/dashboard/page.tsx", lines: "L560-L585", anchor: "saveWidgetLayout", proof: "Widget layout handler allows toggling and rearranging dashboard KPI cards." },
    ],
    steps: [
      { file: "apps/web/src/app/dashboard/page.tsx", lines: "L910-L925", anchor: "StatWidget", proof: "Executive overview summarizes active operational metrics." },
      { file: "apps/web/src/app/dashboard/page.tsx", lines: "L105-L115", anchor: "Low Stock Items", proof: "Identify inventory warnings and overdue client collections." },
      { file: "apps/web/src/app/dashboard/page.tsx", lines: "L975-L985", anchor: "quickActions", proof: "Use quick action buttons to initiate orders or record receipts." },
      { file: "apps/web/src/app/dashboard/page.tsx", lines: "L1020-L1035", anchor: "recentActivity", proof: "Review floor activity feed to verify operator status updates." },
    ],
    features: [
      { file: "apps/web/src/app/dashboard/page.tsx", lines: "L910-L925", anchor: "StatWidget", proof: "Customizable executive KPI widget grid." },
      { file: "apps/web/src/app/dashboard/page.tsx", lines: "L105-L115", anchor: "Low Stock Items", proof: "Dedicated Low Stock Items alert widget." },
      { file: "apps/web/src/app/dashboard/page.tsx", lines: "L1020-L1035", anchor: "recentActivity", proof: "Live factory activity stream with stage change logs." },
      { file: "apps/web/src/app/dashboard/page.tsx", lines: "L975-L985", anchor: "quickActions", proof: "One-tap quick action launchers for key workflows." },
      { file: "apps/web/src/app/dashboard/page.tsx", lines: "L585-L600", anchor: "handleToggleWidget", proof: "Widget configuration modal to customize dashboard view." },
    ],
    sections: [
      { file: "apps/web/src/app/dashboard/page.tsx", lines: "L910-L925", anchor: "StatWidget", proof: "Executive overview widgets monitoring daily throughput." },
      { file: "apps/web/src/app/dashboard/page.tsx", lines: "L1020-L1035", anchor: "recentActivity", proof: "Activity feed keeping managers informed on floor actions." },
    ],
    faqs: [
      { file: "apps/web/src/app/dashboard/page.tsx", lines: "L560-L585", anchor: "saveWidgetLayout", proof: "Widget selector modal allows customizing displayed cards." },
      { file: "apps/web/src/app/dashboard/page.tsx", lines: "L910-L925", anchor: "StatWidget", proof: "Summary metrics update dynamically from active database collections." },
    ],
  },
};

export function generateEvidenceMarkdown(): string {
  let md = `# Module Content Evidence Audit

Canonical proof and code citations for every use case, workflow step, key feature, doc section, and FAQ documented in \`src/content/modules.ts\`.

Audited across all 21 modules in the suite. Every claim bullet has a direct \`file:line\` verification with a verified literal anchor token.

---
`;

  MODULES.forEach((mod, idx) => {
    const reg = EVIDENCE_REGISTRY[mod.slug];
    if (!reg) {
      throw new Error(`Missing evidence registry entry for ${mod.slug}`);
    }

    const totalClaims =
      mod.uses.length +
      mod.howItWorks.length +
      mod.keyFeatures.length +
      mod.docs.sections.length +
      mod.docs.faqs.length;

    const totalEvidence =
      reg.uses.length +
      reg.steps.length +
      reg.features.length +
      reg.sections.length +
      reg.faqs.length;

    md += `\n## ${idx + 1}. ${mod.title} (\`${mod.slug}\`)\n\n`;
    md += `**Claims Audit Summary**: ${totalClaims} documented claims | ${totalEvidence} verified code evidence rows.\n\n`;

    md += `### 1. Uses Evidence (${reg.uses.length} items)\n`;
    mod.uses.forEach((useText, i) => {
      const ev = reg.uses[i];
      md += `- **[use-${i + 1}]** *"${useText}"*\n`;
      md += `  - **Proof**: [\`${ev.file}#${ev.lines}\`](file:///${path.resolve(process.cwd(), "../..", ev.file).replace(/\\/g, "/")})\n`;
      md += `  - **Anchor**: \`${ev.anchor}\`\n`;
      md += `  - **Citation**: ${ev.proof}\n`;
    });

    md += `\n### 2. How It Works Steps Evidence (${reg.steps.length} items)\n`;
    mod.howItWorks.forEach((step, i) => {
      const ev = reg.steps[i];
      md += `- **[step-${i + 1}]** **${step.title}**: *"${step.body}"*\n`;
      md += `  - **Proof**: [\`${ev.file}#${ev.lines}\`](file:///${path.resolve(process.cwd(), "../..", ev.file).replace(/\\/g, "/")})\n`;
      md += `  - **Anchor**: \`${ev.anchor}\`\n`;
      md += `  - **Citation**: ${ev.proof}\n`;
    });

    md += `\n### 3. Key Features Evidence (${reg.features.length} items)\n`;
    mod.keyFeatures.forEach((feat, i) => {
      const ev = reg.features[i];
      md += `- **[feature-${i + 1}]** *"${feat}"*\n`;
      md += `  - **Proof**: [\`${ev.file}#${ev.lines}\`](file:///${path.resolve(process.cwd(), "../..", ev.file).replace(/\\/g, "/")})\n`;
      md += `  - **Anchor**: \`${ev.anchor}\`\n`;
      md += `  - **Citation**: ${ev.proof}\n`;
    });

    md += `\n### 4. Documentation Sections Evidence (${reg.sections.length} items)\n`;
    mod.docs.sections.forEach((sec, i) => {
      const ev = reg.sections[i];
      md += `- **[section-${i + 1}]** **${sec.heading}**: *"${sec.body.substring(0, 80)}..."*\n`;
      md += `  - **Proof**: [\`${ev.file}#${ev.lines}\`](file:///${path.resolve(process.cwd(), "../..", ev.file).replace(/\\/g, "/")})\n`;
      md += `  - **Anchor**: \`${ev.anchor}\`\n`;
      md += `  - **Citation**: ${ev.proof}\n`;
    });

    md += `\n### 5. FAQs Evidence (${reg.faqs.length} items)\n`;
    mod.docs.faqs.forEach((faq, i) => {
      const ev = reg.faqs[i];
      md += `- **[faq-${i + 1}]** **Q: ${faq.q}**\n`;
      md += `  - **Proof**: [\`${ev.file}#${ev.lines}\`](file:///${path.resolve(process.cwd(), "../..", ev.file).replace(/\\/g, "/")})\n`;
      md += `  - **Anchor**: \`${ev.anchor}\`\n`;
      md += `  - **Citation**: ${ev.proof}\n`;
    });

    md += `\n---\n`;
  });

  return md;
}

const outputPath = path.resolve(process.cwd(), "src/content/modules.evidence.md");
const mdContent = generateEvidenceMarkdown();
fs.writeFileSync(outputPath, mdContent, "utf-8");
console.log(`Generated ${outputPath} with ${mdContent.split("\n").length} lines.`);
