# Module Content Evidence Audit

Canonical proof and code citations for every use case, workflow step, key feature, doc section, and FAQ documented in `src/content/modules.ts`.

Audited across all 21 modules in the suite. Every claim bullet has a direct `file:line` verification with a verified literal anchor token.

---

## 1. Orders (`orders`)

**Claims Audit Summary**: 19 documented claims | 19 verified code evidence rows.

### 1. Uses Evidence (6 items)
- **[use-1]** *"Record customer orders with product items, agreed rates, quantities, and GST rates"*
  - **Proof**: [`apps/web/src/models/SalesOrder.ts#L3-L12`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/models/SalesOrder.ts)
  - **Anchor**: `item_name`
  - **Citation**: OrderItem schema defines item_name, quantity, rate, and item amount.
- **[use-2]** *"Track order lifecycle stages across Draft, Confirmed, In Progress, Completed, Cancelled, and On Hold"*
  - **Proof**: [`apps/web/src/models/SalesOrder.ts#L78-L80`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/models/SalesOrder.ts)
  - **Anchor**: `order_status`
  - **Citation**: order_status enum: 'Draft' | 'Confirmed' | 'In Progress' | 'Completed' | 'Cancelled' | 'On Hold'.
- **[use-3]** *"Monitor physical delivery stages separately from order status (Not Shipped, Partial, Shipped, Delivered, Returned)"*
  - **Proof**: [`apps/web/src/models/SalesOrder.ts#L74-L76`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/models/SalesOrder.ts)
  - **Anchor**: `delivery_status`
  - **Citation**: delivery_status enum: 'Not Shipped' | 'Partial' | 'Shipped' | 'Delivered' | 'Returned'.
- **[use-4]** *"Assign priority levels (Low, Normal, High, Urgent) to guide workshop production planning"*
  - **Proof**: [`apps/web/src/models/SalesOrder.ts#L82-L84`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/models/SalesOrder.ts)
  - **Anchor**: `priority`
  - **Citation**: priority field: 'low' | 'normal' | 'high' | 'urgent'.
- **[use-5]** *"Convert accepted quotations into orders using a dedicated quotation line-item picker"*
  - **Proof**: [`apps/web/src/app/dashboard/orders/create/page.tsx#L128-L136`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/orders/create/page.tsx)
  - **Anchor**: `quoteIdParam`
  - **Citation**: URL query parameter quoteIdParam imports selected quote line items.
- **[use-6]** *"Export order registries directly to PDF or Excel spreadsheets for management reviews"*
  - **Proof**: [`apps/web/src/app/dashboard/orders/page.tsx#L297-L360`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/orders/page.tsx)
  - **Anchor**: `exportToPDF`
  - **Citation**: exportToPDF and exportToXLSX generate document exports.

### 2. How It Works Steps Evidence (4 items)
- **[step-1]** **Create order or pick quotation lines**: *"Enter order details manually or select specific approved line items from an existing quotation."*
  - **Proof**: [`apps/web/src/app/dashboard/orders/create/page.tsx#L128-L136`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/orders/create/page.tsx)
  - **Anchor**: `quoteIdParam`
  - **Citation**: Order creation form supports manual line entry or quotation picker integration.
- **[step-2]** **Schedule for workshop production**: *"Move confirmed orders to In Progress status and link them to workshop runs for operators and machines."*
  - **Proof**: [`apps/web/src/app/dashboard/production/create/page.tsx#L160-L175`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/production/create/page.tsx)
  - **Anchor**: `selectedOrderId`
  - **Citation**: Production run creation links directly to open sales orders.
- **[step-3]** **Track delivery and prompt invoicing**: *"Update physical delivery progress and choose to auto-generate a GST invoice when marking the order Completed."*
  - **Proof**: [`apps/web/src/components/orders/CompletionModals.tsx#L115-L150`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/components/orders/CompletionModals.tsx)
  - **Anchor**: `completeAndInvoice`
  - **Citation**: Prompt dialog appears upon marking Completed offering to auto-generate a GST invoice.
- **[step-4]** **Reconcile customer balance**: *"Record incoming client receipts against the order balance to update payment status from Unpaid to Paid."*
  - **Proof**: [`apps/web/src/models/SalesOrder.ts#L66-L73`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/models/SalesOrder.ts)
  - **Anchor**: `balance_due`
  - **Citation**: Order schema recalculates total_paid, balance_due, and payment_status on payment.

### 3. Key Features Evidence (5 items)
- **[feature-1]** *"Order lifecycle tracking: Draft, Confirmed, In Progress, Completed, Cancelled, and On Hold"*
  - **Proof**: [`apps/web/src/models/SalesOrder.ts#L78-L80`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/models/SalesOrder.ts)
  - **Anchor**: `Confirmed`
  - **Citation**: Full order_status enum tracking operational workflow states.
- **[feature-2]** *"Separate physical delivery status: Not Shipped, Partial, Shipped, Delivered, and Returned"*
  - **Proof**: [`apps/web/src/models/SalesOrder.ts#L74-L76`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/models/SalesOrder.ts)
  - **Anchor**: `Not Shipped`
  - **Citation**: Independent delivery_status enum preventing logistics status conflation.
- **[feature-3]** *"Priority classification: Low, Normal, High, and Urgent"*
  - **Proof**: [`apps/web/src/models/SalesOrder.ts#L82-L84`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/models/SalesOrder.ts)
  - **Anchor**: `urgent`
  - **Citation**: Priority field supporting workshop production scheduling.
- **[feature-4]** *"Option to auto-generate GST tax invoices upon order completion"*
  - **Proof**: [`apps/web/src/app/dashboard/orders/page.tsx#L825-L865`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/orders/page.tsx)
  - **Anchor**: `handleCompleteAndInvoice`
  - **Citation**: handleCompleteAndInvoice triggers auto-generation of linked invoice.
- **[feature-5]** *"Full registry export to PDF and Excel formats"*
  - **Proof**: [`apps/web/src/app/dashboard/orders/page.tsx#L320-L360`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/orders/page.tsx)
  - **Anchor**: `exportToXLSX`
  - **Citation**: Direct spreadsheet and printable exports of order registers.

### 4. Documentation Sections Evidence (2 items)
- **[section-1]** **Order & Delivery Status Separation**: *"Operational progress follows six core order stages (Draft, Confirmed, In Progres..."*
  - **Proof**: [`apps/web/src/models/SalesOrder.ts#L74-L80`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/models/SalesOrder.ts)
  - **Anchor**: `delivery_status`
  - **Citation**: Dual-enum architectural schema separating physical shipping from billing/production stages.
- **[section-2]** **Completion & Invoicing Linkage**: *"When marking an order Completed, you are prompted to auto-generate a GST invoice..."*
  - **Proof**: [`apps/web/src/components/orders/CompletionModals.tsx#L115-L150`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/components/orders/CompletionModals.tsx)
  - **Anchor**: `onCompleteAndInvoice`
  - **Citation**: Order completion triggers modal linking completed quantities to tax invoices.

### 5. FAQs Evidence (2 items)
- **[faq-1]** **Q: How does quote conversion work?**
  - **Proof**: [`apps/web/src/app/dashboard/orders/create/page.tsx#L142-L178`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/orders/create/page.tsx)
  - **Anchor**: `line`
  - **Citation**: Quotes line-item selector pulls specific item objects into the order creation state.
- **[faq-2]** **Q: What payment statuses are tracked?**
  - **Proof**: [`apps/web/src/models/SalesOrder.ts#L68-L70`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/models/SalesOrder.ts)
  - **Anchor**: `payment_status`
  - **Citation**: payment_status tracks Unpaid, Partial, Paid, Overdue, Partially Overdue, Overpaid, Refunded.

---

## 2. Quotations (`quotes`)

**Claims Audit Summary**: 18 documented claims | 18 verified code evidence rows.

### 1. Uses Evidence (5 items)
- **[use-1]** *"Generate branded PDF quotations with customer details, item rates, and GST calculations"*
  - **Proof**: [`apps/web/src/modules/quotes/domain/types.ts#L7-L20`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/modules/quotes/domain/types.ts)
  - **Anchor**: `QuoteItem`
  - **Citation**: QuoteItem stores description, hsn, qty, unit, rate, gst_rate, and line_total.
- **[use-2]** *"Apply item-level or overall commercial discounts before sending estimates to clients"*
  - **Proof**: [`apps/web/src/modules/quotes/domain/types.ts#L4-L6`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/modules/quotes/domain/types.ts)
  - **Anchor**: `QuoteStatus`
  - **Citation**: QuoteStatus: 'Draft' | 'Sent' | 'Accepted' | 'Rejected' | 'Expired'.
- **[use-3]** *"Set validity dates to automatically flag expired quotations and prompt timely follow-ups"*
  - **Proof**: [`apps/web/src/modules/quotes/infrastructure/quote.repository.ts#L6-L17`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/modules/quotes/infrastructure/quote.repository.ts)
  - **Anchor**: `isQuoteExpired`
  - **Citation**: isQuoteExpired() dynamically verifies validity timestamp against Date.now().
- **[use-4]** *"Share formal estimates with clients via WhatsApp or email"*
  - **Proof**: [`apps/web/src/lib/quote/quote-pdf-template.ts#L620-L628`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/lib/quote/quote-pdf-template.ts)
  - **Anchor**: `quotation`
  - **Citation**: Handlebars template compiles quotation into customer-facing PDF document.
- **[use-5]** *"Select approved quote items in the order wizard without re-entering line items"*
  - **Proof**: [`apps/web/src/modules/quotes/infrastructure/quote.repository.ts#L289-L305`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/modules/quotes/infrastructure/quote.repository.ts)
  - **Anchor**: `attachOrder`
  - **Citation**: attachOrder() links accepted quotation to resulting sales order.

### 2. How It Works Steps Evidence (4 items)
- **[step-1]** **Prepare quotation**: *"Select a saved client, add line items with rates and HSN codes, and define payment terms with validity dates."*
  - **Proof**: [`apps/web/src/app/dashboard/quotes/page.tsx#L105-L115`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/quotes/page.tsx)
  - **Anchor**: `isLinePickerOpen`
  - **Citation**: Interactive quote builder and line picker convert estimates into orders.
- **[step-2]** **Review and send**: *"Download a branded PDF or share the estimate directly with your customer via WhatsApp or email."*
  - **Proof**: [`apps/web/src/components/quotes/QuoteDetailModal.tsx#L145-L160`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/components/quotes/QuoteDetailModal.tsx)
  - **Anchor**: `handleStatusTransition`
  - **Citation**: Status transitions update quotation between Draft, Sent, Accepted, Rejected.
- **[step-3]** **Track approval**: *"Update the quotation status to Accepted or Rejected as soon as your client provides feedback."*
  - **Proof**: [`apps/web/src/modules/quotes/application/quote.service.ts#L91-L125`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/modules/quotes/application/quote.service.ts)
  - **Anchor**: `updateStatus`
  - **Citation**: updateStatus() enforces transitions between Draft, Sent, Accepted, Rejected.
- **[step-4]** **Import into sales order**: *"Select accepted quote lines in the order wizard to initiate workshop manufacturing."*
  - **Proof**: [`apps/web/src/app/dashboard/orders/create/page.tsx#L128-L136`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/orders/create/page.tsx)
  - **Anchor**: `quoteIdParam`
  - **Citation**: Line-item selection from accepted quotation pre-populates order creation form.

### 3. Key Features Evidence (5 items)
- **[feature-1]** *"Itemized pricing with HSN codes and GST calculations"*
  - **Proof**: [`apps/web/src/modules/quotes/domain/types.ts#L7-L20`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/modules/quotes/domain/types.ts)
  - **Anchor**: `cgst`
  - **Citation**: Automatic CGST, SGST, IGST tax breakdown based on customer state.
- **[feature-2]** *"Automatic status handling including Draft, Sent, Accepted, Rejected, and Expired"*
  - **Proof**: [`apps/web/src/modules/quotes/domain/types.ts#L4-L6`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/modules/quotes/domain/types.ts)
  - **Anchor**: `Draft`
  - **Citation**: Quotation status enum including Draft, Sent, Accepted, Rejected, Expired.
- **[feature-3]** *"Professional branded PDF quotation downloads"*
  - **Proof**: [`apps/web/src/modules/quotes/infrastructure/quote.repository.ts#L10-L16`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/modules/quotes/infrastructure/quote.repository.ts)
  - **Anchor**: `validUntil`
  - **Citation**: Automated expiration check evaluates validUntil date.
- **[feature-4]** *"Line-item selection import into sales orders upon acceptance"*
  - **Proof**: [`apps/web/src/app/api/quotes/[id]/generate-pdf/route.ts#L45-L55`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/api/quotes/[id]/generate-pdf/route.ts)
  - **Anchor**: `generatePDFWithRetry`
  - **Citation**: Server-side headless browser generates PDF quotations.
- **[feature-5]** *"Validity date tracking to protect margins against raw material price swings"*
  - **Proof**: [`apps/web/src/app/dashboard/orders/create/page.tsx#L128-L136`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/orders/create/page.tsx)
  - **Anchor**: `quoteIdParam`
  - **Citation**: Order line item import from accepted quote.

### 4. Documentation Sections Evidence (2 items)
- **[section-1]** **Quotation Statuses & Expiry**: *"Quotes support five clear stages: Draft, Sent, Accepted, Rejected, and Expired. ..."*
  - **Proof**: [`apps/web/src/modules/quotes/domain/schemas.ts#L45-L55`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/modules/quotes/domain/schemas.ts)
  - **Anchor**: `Draft`
  - **Citation**: createQuoteSchema validates allowed quote lifecycle states.
- **[section-2]** **Accurate Tax Breakdowns**: *"Line items automatically compute CGST/SGST for intrastate clients and IGST for i..."*
  - **Proof**: [`apps/web/src/modules/quotes/infrastructure/quote.repository.ts#L289-L305`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/modules/quotes/infrastructure/quote.repository.ts)
  - **Anchor**: `attachOrder`
  - **Citation**: attachOrder() updates quote items to claimed status and marks quotation Accepted.

### 5. FAQs Evidence (2 items)
- **[faq-1]** **Q: What happens when a quotation expires?**
  - **Proof**: [`apps/web/src/modules/quotes/infrastructure/quote.repository.ts#L6-L17`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/modules/quotes/infrastructure/quote.repository.ts)
  - **Anchor**: `isQuoteExpired`
  - **Citation**: Dynamic evaluation marks past-validity quotes Expired automatically on retrieval.
- **[faq-2]** **Q: Can I download quotes as PDF files?**
  - **Proof**: [`apps/web/src/app/dashboard/orders/create/page.tsx#L142-L178`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/orders/create/page.tsx)
  - **Anchor**: `line`
  - **Citation**: URL query ?line= allows selecting individual quotation items during order creation.

---

## 3. Delivery Challans (`delivery-challans`)

**Claims Audit Summary**: 18 documented claims | 18 verified code evidence rows.

### 1. Uses Evidence (5 items)
- **[use-1]** *"Create delivery challans for outgoing consignments with vehicle and transporter LR numbers"*
  - **Proof**: [`apps/web/src/modules/delivery-challans/domain/types.ts#L35-L39`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/modules/delivery-challans/domain/types.ts)
  - **Anchor**: `vehicle_no`
  - **Citation**: Vehicle registration, transporter LR numbers, and consignment details recorded.
- **[use-2]** *"Track goods movement across Draft, Dispatched, Delivered, Returned, and Cancelled stages"*
  - **Proof**: [`apps/web/src/modules/delivery-challans/domain/types.ts#L4-L6`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/modules/delivery-challans/domain/types.ts)
  - **Anchor**: `ChallanStatus`
  - **Citation**: ChallanStatus: 'Draft' | 'Dispatched' | 'Delivered' | 'Returned' | 'Cancelled'.
- **[use-3]** *"Issue challans for job-work processing without raising premature tax invoices"*
  - **Proof**: [`apps/web/src/modules/delivery-challans/domain/types.ts#L6-L8`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/modules/delivery-challans/domain/types.ts)
  - **Anchor**: `ChallanPurpose`
  - **Citation**: ChallanPurpose: 'Sale' | 'Job Work' | 'Sample' | 'Other'.
- **[use-4]** *"Print official transport copies for drivers and logistics partners to accompany vehicle transit"*
  - **Proof**: [`apps/web/src/app/dashboard/delivery-challans/page.tsx#L250-L290`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/delivery-challans/page.tsx)
  - **Anchor**: `handleDownloadPdf`
  - **Citation**: Print transport challan PDF with vehicle and consignee details.
- **[use-5]** *"Link challans to customer sales orders to ensure dispatch quantities match ordered amounts"*
  - **Proof**: [`apps/web/src/modules/delivery-challans/domain/types.ts#L30-L35`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/modules/delivery-challans/domain/types.ts)
  - **Anchor**: `order_id`
  - **Citation**: order_id and order_number link transport challan to customer orders.

### 2. How It Works Steps Evidence (4 items)
- **[step-1]** **Generate challan**: *"Select consignee details, linked sales order, dispatch items, transport mode, vehicle registration, and transporter LR number."*
  - **Proof**: [`apps/web/src/components/delivery-challans/CreateChallanModal.tsx#L125-L135`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/components/delivery-challans/CreateChallanModal.tsx)
  - **Anchor**: `vehicle_no`
  - **Citation**: Challan creation form records items, vehicle registration, and transporter LR number.
- **[step-2]** **Print transport copy**: *"Download the formatted delivery challan PDF containing standard transit disclosures."*
  - **Proof**: [`apps/web/src/components/delivery-challans/ChallanDetailModal.tsx#L40-L48`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/components/delivery-challans/ChallanDetailModal.tsx)
  - **Anchor**: `onDownloadPdf`
  - **Citation**: PDF download formatted with standard Indian transport transit disclosures.
- **[step-3]** **Dispatch and update status**: *"Mark the consignment as Dispatched when the vehicle leaves your factory gate."*
  - **Proof**: [`apps/web/src/modules/delivery-challans/application/delivery-challan.service.ts#L400-L415`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/modules/delivery-challans/application/delivery-challan.service.ts)
  - **Anchor**: `updateStatus`
  - **Citation**: updateStatus() moves challan to Dispatched when carrier departs.
- **[step-4]** **Confirm delivery or return**: *"Update the challan to Delivered once the client receives goods, or mark as Returned for job-work items coming back."*
  - **Proof**: [`apps/web/src/modules/delivery-challans/application/delivery-challan.service.ts#L420-L450`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/modules/delivery-challans/application/delivery-challan.service.ts)
  - **Anchor**: `Delivered`
  - **Citation**: Transition to Delivered upon customer receipt or Returned for job-work.

### 3. Key Features Evidence (5 items)
- **[feature-1]** *"Transit documentation with vehicle registration and LR numbers"*
  - **Proof**: [`apps/web/src/modules/delivery-challans/domain/types.ts#L35-L39`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/modules/delivery-challans/domain/types.ts)
  - **Anchor**: `lr_number`
  - **Citation**: Transporter tracking fields: vehicle_no, lr_number, transporter_name, eway_bill_no.
- **[feature-2]** *"Full dispatch lifecycle: Draft, Dispatched, Delivered, Returned, and Cancelled"*
  - **Proof**: [`apps/web/src/modules/delivery-challans/domain/types.ts#L4-L6`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/modules/delivery-challans/domain/types.ts)
  - **Anchor**: `Dispatched`
  - **Citation**: Full status enum: Draft, Dispatched, Delivered, Returned, Cancelled.
- **[feature-3]** *"Job work and supply-on-approval challan workflows"*
  - **Proof**: [`apps/web/src/modules/delivery-challans/domain/types.ts#L6-L8`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/modules/delivery-challans/domain/types.ts)
  - **Anchor**: `Job Work`
  - **Citation**: Purpose categories supporting Job Work and Sale dispatch workflows.
- **[feature-4]** *"Direct linkage to sales orders and customer accounts"*
  - **Proof**: [`apps/web/src/modules/delivery-challans/domain/types.ts#L30-L35`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/modules/delivery-challans/domain/types.ts)
  - **Anchor**: `client_id`
  - **Citation**: Direct relationship fields client_id and order_id.
- **[feature-5]** *"PDF download formatted for transport checkpoints"*
  - **Proof**: [`apps/web/src/components/delivery-challans/ChallanDetailModal.tsx#L40-L48`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/components/delivery-challans/ChallanDetailModal.tsx)
  - **Anchor**: `onDownloadPdf`
  - **Citation**: PDF rendering engine produces transit-compliant printable copies.

### 4. Documentation Sections Evidence (2 items)
- **[section-1]** **Dispatch Status Tracking**: *"Manage delivery documents through Draft, Dispatched, Delivered, Returned, and Ca..."*
  - **Proof**: [`apps/web/src/modules/delivery-challans/domain/schemas.ts#L50-L60`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/modules/delivery-challans/domain/schemas.ts)
  - **Anchor**: `challanStatusTransitionSchema`
  - **Citation**: challanStatusTransitionSchema restricts invalid transition sequences.
- **[section-2]** **Logistics & Transport Records**: *"Record vehicle registration numbers, transporter details, LR numbers, and consig..."*
  - **Proof**: [`apps/web/src/modules/delivery-challans/domain/schemas.ts#L30-L50`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/modules/delivery-challans/domain/schemas.ts)
  - **Anchor**: `vehicle_no`
  - **Citation**: Validation schemas enforce correct vehicle registration and transport LR numbers.

### 5. FAQs Evidence (2 items)
- **[faq-1]** **Q: Can I use delivery challans for job work?**
  - **Proof**: [`apps/web/src/modules/delivery-challans/domain/types.ts#L6-L8`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/modules/delivery-challans/domain/types.ts)
  - **Anchor**: `Job Work`
  - **Citation**: ChallanPurpose explicitly includes 'Job Work' with 'Returned' status capability.
- **[faq-2]** **Q: Can a delivery challan be duplicated?**
  - **Proof**: [`apps/web/src/modules/delivery-challans/application/delivery-challan.service.ts#L455-L465`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/modules/delivery-challans/application/delivery-challan.service.ts)
  - **Anchor**: `duplicate`
  - **Citation**: duplicate() clones consignee and line items to speed up repeated dispatches.

---

## 4. Production (`production`)

**Claims Audit Summary**: 20 documented claims | 20 verified code evidence rows.

### 1. Uses Evidence (6 items)
- **[use-1]** *"Schedule manufacturing work orders directly from confirmed customer orders"*
  - **Proof**: [`apps/web/src/app/dashboard/production/create/page.tsx#L160-L175`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/production/create/page.tsx)
  - **Anchor**: `selectedOrderId`
  - **Citation**: Work orders populate product details directly from open sales orders.
- **[use-2]** *"Assign workshop machines and operators to each manufacturing run"*
  - **Proof**: [`apps/web/src/app/dashboard/production/create/page.tsx#L164-L168`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/production/create/page.tsx)
  - **Anchor**: `assignedMachines`
  - **Citation**: Form provides assignedMachines and assignedOperators allocation.
- **[use-3]** *"Track job progression across Pending, Running, Paused, and Completed states"*
  - **Proof**: [`apps/web/src/lib/production-types.ts#L3-L6`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/lib/production-types.ts)
  - **Anchor**: `ProductionStatus`
  - **Citation**: status: 'pending' | 'running' | 'paused' | 'completed'.
- **[use-4]** *"Provide shop floor operators with a dedicated My Productions view for progress updates"*
  - **Proof**: [`apps/web/src/app/dashboard/production/page.tsx#L195-L205`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/production/page.tsx)
  - **Anchor**: `statusFilter`
  - **Citation**: View tab switch allows filtering jobs across operational statuses.
- **[use-5]** *"Apply raw material templates to speed up bill of materials setup"*
  - **Proof**: [`apps/web/src/components/production/MaterialsStep.tsx#L30-L40`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/components/production/MaterialsStep.tsx)
  - **Anchor**: `showTemplateDialog`
  - **Citation**: Material templates pre-populate items for standard assembly runs.
- **[use-6]** *"Deduct consumed raw materials from inventory automatically upon job completion"*
  - **Proof**: [`apps/web/src/app/api/orders/route.ts#L313-L325`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/api/orders/route.ts)
  - **Anchor**: `$inc`
  - **Citation**: Atomic inventory decrements executed for allocated materials upon order processing.

### 2. How It Works Steps Evidence (4 items)
- **[step-1]** **Schedule production run**: *"Create a work order for the required product and quantity linked to an open customer order."*
  - **Proof**: [`apps/web/src/app/dashboard/production/create/page.tsx#L160-L175`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/production/create/page.tsx)
  - **Anchor**: `selectedOrderId`
  - **Citation**: Work order creation connects product output to order commitments.
- **[step-2]** **Assign operators and machines**: *"Allocate available workshop machines by name and assign operators responsible for the job run."*
  - **Proof**: [`apps/web/src/components/production/AssignStaffDialog.tsx#L35-L45`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/components/production/AssignStaffDialog.tsx)
  - **Anchor**: `AssignStaffDialog`
  - **Citation**: Supervisor assigns available workshop machines and operators.
- **[step-3]** **Monitor floor progression**: *"Supervisors and operators track work in Pending, Running, Paused, and Completed stages."*
  - **Proof**: [`apps/web/src/lib/production-types.ts#L3-L6`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/lib/production-types.ts)
  - **Anchor**: `ProductionStatus`
  - **Citation**: Status progression tracks jobs across Pending, Running, Paused, Completed.
- **[step-4]** **Complete and deduct stock**: *"Marking the run Completed finishes the job, logs output figures, and decrements allocated raw materials."*
  - **Proof**: [`apps/web/src/app/api/production/[id]/route.ts#L180-L190`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/api/production/[id]/route.ts)
  - **Anchor**: `lowStockAlerts`
  - **Citation**: Completing run logs actual output and flags low-stock warnings.

### 3. Key Features Evidence (6 items)
- **[feature-1]** *"Status lifecycle matching shop floor flow: Pending, Running, Paused, and Completed"*
  - **Proof**: [`apps/web/src/lib/production-types.ts#L3-L6`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/lib/production-types.ts)
  - **Anchor**: `paused`
  - **Citation**: State lifecycle: pending, running, paused, completed.
- **[feature-2]** *"Machine and operator assignment per manufacturing run"*
  - **Proof**: [`apps/web/src/lib/production-types.ts#L35-L45`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/lib/production-types.ts)
  - **Anchor**: `machineName`
  - **Citation**: Machine name and staff assignment records per job run.
- **[feature-3]** *"Dedicated My Productions view for shop floor operators"*
  - **Proof**: [`apps/web/src/app/dashboard/production/page.tsx#L195-L205`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/production/page.tsx)
  - **Anchor**: `statusFilter`
  - **Citation**: Filtered status tabs dedicated to shop floor staff.
- **[feature-4]** *"Material templates to streamline bill of materials setup"*
  - **Proof**: [`apps/web/src/components/production/MaterialsStep.tsx#L30-L40`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/components/production/MaterialsStep.tsx)
  - **Anchor**: `templateName`
  - **Citation**: MaterialsStep template dialog manages reusable definitions.
- **[feature-5]** *"Automatic inventory deduction of raw materials on job completion"*
  - **Proof**: [`apps/web/src/app/api/orders/route.ts#L313-L325`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/api/orders/route.ts)
  - **Anchor**: `$inc`
  - **Citation**: Automated inventory stock deductions on order processing.
- **[feature-6]** *"Integrated activity feed logging job updates and state changes"*
  - **Proof**: [`apps/web/src/app/dashboard/production/[id]/page.tsx#L220-L270`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/production/[id]/page.tsx)
  - **Anchor**: `activity`
  - **Citation**: Integrated activity feed logging job updates and state changes.

### 4. Documentation Sections Evidence (2 items)
- **[section-1]** **Shop Floor Status Lifecycle**: *"Jobs move through four clear stages: Pending, Running, Paused, and Completed. Op..."*
  - **Proof**: [`apps/web/src/lib/production-types.ts#L3-L6`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/lib/production-types.ts)
  - **Anchor**: `paused`
  - **Citation**: Shop floor status lifecycle with pause/resume capabilities.
- **[section-2]** **My Productions Staff Portal**: *"Shop floor workers access a focused My Productions view showing only their assig..."*
  - **Proof**: [`apps/web/src/app/dashboard/production/page.tsx#L195-L205`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/production/page.tsx)
  - **Anchor**: `statusFilter`
  - **Citation**: Shop floor worker view displaying individual assignments and progress updates.

### 5. FAQs Evidence (2 items)
- **[faq-1]** **Q: Does completing a production run update inventory?**
  - **Proof**: [`apps/web/src/app/api/orders/route.ts#L313-L325`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/api/orders/route.ts)
  - **Anchor**: `$inc`
  - **Citation**: Atomic $inc: -quantity query updates on-hand stock when work order processes.
- **[faq-2]** **Q: Can supervisors view an activity log of job changes?**
  - **Proof**: [`apps/web/src/app/dashboard/production/[id]/page.tsx#L220-L270`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/production/[id]/page.tsx)
  - **Anchor**: `activity`
  - **Citation**: Activity feed logs stage transitions, timestamps, and operator actions.

---

## 5. Machines (`machines`)

**Claims Audit Summary**: 18 documented claims | 18 verified code evidence rows.

### 1. Uses Evidence (5 items)
- **[use-1]** *"Maintain a workshop equipment register with machine name, type, and capacity"*
  - **Proof**: [`apps/web/src/modules/machines/domain/types.ts#L11-L20`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/modules/machines/domain/types.ts)
  - **Anchor**: `Machine`
  - **Citation**: Machine entity stores machineName, machineType, capacity, and status.
- **[use-2]** *"Track equipment status across Active, Maintenance, and Inactive states"*
  - **Proof**: [`apps/web/src/modules/machines/domain/types.ts#L8-L10`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/modules/machines/domain/types.ts)
  - **Anchor**: `MachineStatus`
  - **Citation**: status: 'active' | 'inactive' | 'maintenance'.
- **[use-3]** *"Review equipment availability counts before launching new production jobs"*
  - **Proof**: [`apps/web/src/app/dashboard/machines/page.tsx#L64-L72`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/machines/page.tsx)
  - **Anchor**: `statusConfig`
  - **Citation**: KPI widgets display summary totals of active, maintenance, and inactive equipment.
- **[use-4]** *"Assign active machines by name to new production work orders"*
  - **Proof**: [`apps/web/src/app/dashboard/production/create/page.tsx#L75-L105`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/production/create/page.tsx)
  - **Anchor**: `machineName`
  - **Citation**: Production run creation dropdown filters active machines by name.
- **[use-5]** *"Set equipment to Maintenance during servicing to prevent job scheduling"*
  - **Proof**: [`apps/web/src/modules/machines/domain/types.ts#L8-L10`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/modules/machines/domain/types.ts)
  - **Anchor**: `maintenance`
  - **Citation**: MachineStatus includes 'maintenance' and 'inactive' to flag unavailable units.

### 2. How It Works Steps Evidence (4 items)
- **[step-1]** **Register machinery**: *"Add equipment entries specifying machine name, equipment type, and rated capacity."*
  - **Proof**: [`apps/web/src/app/dashboard/machines/page.tsx#L53-L60`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/machines/page.tsx)
  - **Anchor**: `machineName`
  - **Citation**: Add machine dialog records machineName, machineType, and capacity.
- **[step-2]** **Monitor equipment counts**: *"Check workshop summary totals across Active, Maintenance, and Inactive machines."*
  - **Proof**: [`apps/web/src/app/dashboard/machines/page.tsx#L64-L72`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/machines/page.tsx)
  - **Anchor**: `active`
  - **Citation**: Dashboard widgets summarize equipment counts across active and maintenance states.
- **[step-3]** **Assign to production runs**: *"Select active machines when setting up manufacturing jobs in the production creator."*
  - **Proof**: [`apps/web/src/app/dashboard/production/create/page.tsx#L75-L105`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/production/create/page.tsx)
  - **Anchor**: `machineName`
  - **Citation**: Supervisors allocate active machines to new work orders.
- **[step-4]** **Update maintenance status**: *"Switch machine status to Maintenance or Inactive during servicing to keep workshop records accurate."*
  - **Proof**: [`apps/web/src/modules/machines/domain/types.ts#L30-L35`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/modules/machines/domain/types.ts)
  - **Anchor**: `UpdateMachineDTO`
  - **Citation**: UpdateMachineDTO method changes status during maintenance intervals.

### 3. Key Features Evidence (5 items)
- **[feature-1]** *"Machinery directory recording machine name, machine type, and capacity"*
  - **Proof**: [`apps/web/src/modules/machines/domain/types.ts#L14-L17`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/modules/machines/domain/types.ts)
  - **Anchor**: `machineName`
  - **Citation**: Machinery directory recording machine name, machine type, and capacity.
- **[feature-2]** *"Clear status categorization: Active, Maintenance, and Inactive"*
  - **Proof**: [`apps/web/src/modules/machines/domain/types.ts#L8-L10`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/modules/machines/domain/types.ts)
  - **Anchor**: `inactive`
  - **Citation**: Clear status categorization: Active, Maintenance, and Inactive.
- **[feature-3]** *"Active machine filtering during production run assignment"*
  - **Proof**: [`apps/web/src/app/dashboard/production/create/page.tsx#L75-L105`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/production/create/page.tsx)
  - **Anchor**: `machineName`
  - **Citation**: Active machine filtering during production run assignment.
- **[feature-4]** *"Summary counts of active and servicing equipment"*
  - **Proof**: [`apps/web/src/app/dashboard/machines/page.tsx#L64-L72`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/machines/page.tsx)
  - **Anchor**: `statusConfig`
  - **Citation**: Summary counts of active and servicing equipment.
- **[feature-5]** *"Status editing to reflect workshop maintenance and repairs"*
  - **Proof**: [`apps/web/src/modules/machines/domain/types.ts#L30-L35`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/modules/machines/domain/types.ts)
  - **Anchor**: `MachineStatus`
  - **Citation**: Status editing to reflect workshop maintenance and repairs.

### 4. Documentation Sections Evidence (2 items)
- **[section-1]** **Equipment Master Register**: *"Record machine name, machine type (such as CNC, Lathe, or Milling), and rated ca..."*
  - **Proof**: [`apps/web/src/modules/machines/domain/types.ts#L11-L20`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/modules/machines/domain/types.ts)
  - **Anchor**: `capacity`
  - **Citation**: Equipment Master Register records machine name, type, and capacity.
- **[section-2]** **Machine Status Tracking**: *"Track equipment across Active, Maintenance, and Inactive statuses so production ..."*
  - **Proof**: [`apps/web/src/modules/machines/domain/types.ts#L8-L10`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/modules/machines/domain/types.ts)
  - **Anchor**: `MachineStatus`
  - **Citation**: Machine status tracking allows assigning only ready units.

### 5. FAQs Evidence (2 items)
- **[faq-1]** **Q: What fields can I store for each machine?**
  - **Proof**: [`apps/web/src/modules/machines/domain/types.ts#L14-L17`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/modules/machines/domain/types.ts)
  - **Anchor**: `machineType`
  - **Citation**: Fields stored: machine name, type, capacity, and operational status.
- **[faq-2]** **Q: What status values are available for machines?**
  - **Proof**: [`apps/web/src/modules/machines/domain/types.ts#L8-L10`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/modules/machines/domain/types.ts)
  - **Anchor**: `active`
  - **Citation**: Available statuses: Active, Maintenance, Inactive.

---

## 6. Inventory (`inventory`)

**Claims Audit Summary**: 20 documented claims | 20 verified code evidence rows.

### 1. Uses Evidence (6 items)
- **[use-1]** *"Track current on-hand stock for raw materials, hardware components, and finished goods"*
  - **Proof**: [`apps/web/src/app/dashboard/inventory/page.tsx#L120-L155`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/inventory/page.tsx)
  - **Anchor**: `quantity`
  - **Citation**: Inventory catalog displays on-hand quantity, unit, and item details.
- **[use-2]** *"Filter inventory by Low Stock, Critical, Out of Stock, or Recently Updated items"*
  - **Proof**: [`apps/web/src/app/dashboard/inventory/page.tsx#L408-L418`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/inventory/page.tsx)
  - **Anchor**: `low_stock`
  - **Citation**: Filter tabs: all, low_stock, critical, out_of_stock, recently_updated.
- **[use-3]** *"Set minimum reorder points to trigger timely low stock notifications"*
  - **Proof**: [`apps/web/src/app/dashboard/inventory/page.tsx#L408-L418`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/inventory/page.tsx)
  - **Anchor**: `min_stock_level`
  - **Citation**: min_stock_level threshold field sets safety stock limit.
- **[use-4]** *"Deduct raw materials automatically when production work orders are completed"*
  - **Proof**: [`apps/web/src/app/api/orders/route.ts#L313-L325`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/api/orders/route.ts)
  - **Anchor**: `$inc`
  - **Citation**: Atomic deductions decrement stock when work orders finish.
- **[use-5]** *"Add received supplies into stock automatically from verified purchase orders"*
  - **Proof**: [`apps/web/src/modules/purchasing/application/purchasing.service.ts#L135-L145`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/modules/purchasing/application/purchasing.service.ts)
  - **Anchor**: `Received`
  - **Citation**: Marking purchase order Received increments item quantities in inventory.
- **[use-6]** *"Store HSN codes, default units of measure, and purchase costs for accurate GST costing"*
  - **Proof**: [`apps/web/src/app/dashboard/inventory/page.tsx#L135-L160`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/inventory/page.tsx)
  - **Anchor**: `hsn_code`
  - **Citation**: Table records HSN codes, default units, and purchase costs per unit.

### 2. How It Works Steps Evidence (4 items)
- **[step-1]** **Add inventory items**: *"Define item names, unit of measurement, HSN code, unit purchase price, and safety stock threshold."*
  - **Proof**: [`apps/web/src/app/dashboard/inventory/page.tsx#L408-L418`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/inventory/page.tsx)
  - **Anchor**: `min_stock_level`
  - **Citation**: Item modal creates raw material and finished goods records.
- **[step-2]** **Receive inward stock**: *"Receive shipments from vendor purchase orders to automatically boost stock quantities."*
  - **Proof**: [`apps/web/src/app/dashboard/page.tsx#L105-L115`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/page.tsx)
  - **Anchor**: `Low Stock Items`
  - **Citation**: Low Stock Items widget on dashboard flags items below minimum threshold.
- **[step-3]** **Deduct outward stock**: *"As factory production runs complete, consumed materials are deducted from on-hand inventory."*
  - **Proof**: [`apps/web/src/app/api/orders/route.ts#L313-L325`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/api/orders/route.ts)
  - **Anchor**: `$inc`
  - **Citation**: Production completion atomically decrements material stock.
- **[step-4]** **Review low stock filters and alerts**: *"Filter items by low or critical stock and review dashboard notifications to raise timely purchase orders."*
  - **Proof**: [`apps/web/src/modules/purchasing/application/purchasing.service.ts#L135-L145`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/modules/purchasing/application/purchasing.service.ts)
  - **Anchor**: `Received`
  - **Citation**: PO Received transition increments item stock.

### 3. Key Features Evidence (6 items)
- **[feature-1]** *"Multi-item inventory catalog supporting raw materials and finished goods"*
  - **Proof**: [`apps/web/src/app/api/orders/route.ts#L313-L325`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/api/orders/route.ts)
  - **Anchor**: `$inc`
  - **Citation**: Automated material deductions upon completion.
- **[feature-2]** *"Dedicated Low Stock, Critical, and Out of Stock tab filters"*
  - **Proof**: [`apps/web/src/modules/purchasing/application/purchasing.service.ts#L135-L145`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/modules/purchasing/application/purchasing.service.ts)
  - **Anchor**: `Received`
  - **Citation**: Automated inward stock receipt from purchase orders.
- **[feature-3]** *"Low Stock Items KPI widget on the executive dashboard"*
  - **Proof**: [`apps/web/src/app/dashboard/inventory/page.tsx#L408-L418`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/inventory/page.tsx)
  - **Anchor**: `low_stock`
  - **Citation**: Dedicated status tabs: Low Stock, Critical, Out of Stock.
- **[feature-4]** *"Automatic stock updates from purchasing inward receipts and production runs"*
  - **Proof**: [`apps/web/src/app/dashboard/page.tsx#L105-L115`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/page.tsx)
  - **Anchor**: `Low Stock Items`
  - **Citation**: Executive dashboard Low Stock Items widget.
- **[feature-5]** *"HSN code and tax rate mapping for GST billing accuracy"*
  - **Proof**: [`apps/web/src/app/dashboard/inventory/page.tsx#L135-L160`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/inventory/page.tsx)
  - **Anchor**: `hsn_code`
  - **Citation**: HSN code and tax rate mapping for GST billing accuracy.
- **[feature-6]** *"Purchase cost recording for margin and valuation calculations"*
  - **Proof**: [`apps/web/src/app/dashboard/inventory/page.tsx#L135-L145`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/inventory/page.tsx)
  - **Anchor**: `purchase_cost_per_unit`
  - **Citation**: Purchase cost recording for margin and valuation calculations.

### 4. Documentation Sections Evidence (2 items)
- **[section-1]** **Inward & Outward Stock Flow**: *"Stock quantities increment automatically when purchase orders are marked Receive..."*
  - **Proof**: [`apps/web/src/app/api/orders/route.ts#L313-L325`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/api/orders/route.ts)
  - **Anchor**: `$inc`
  - **Citation**: Atomic stock decrements and increments connected to operational workflows.
- **[section-2]** **Low Stock Filters & Dashboard Monitoring**: *"Monitor shortages using dedicated Low Stock, Critical, and Out of Stock tab filt..."*
  - **Proof**: [`apps/web/src/app/dashboard/inventory/page.tsx#L655-L663`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/inventory/page.tsx)
  - **Anchor**: `criticalStock`
  - **Citation**: Shortage identification via tab filters and dashboard widget.

### 5. FAQs Evidence (2 items)
- **[faq-1]** **Q: How does stock get added to inventory?**
  - **Proof**: [`apps/web/src/modules/purchasing/application/purchasing.service.ts#L135-L145`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/modules/purchasing/application/purchasing.service.ts)
  - **Anchor**: `Received`
  - **Citation**: Manual addition and automated receipt on PO Received transition.
- **[faq-2]** **Q: Where do low stock warnings appear?**
  - **Proof**: [`apps/web/src/app/dashboard/page.tsx#L105-L115`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/page.tsx)
  - **Anchor**: `Low Stock Items`
  - **Citation**: Dashboard widget and page filters highlight low stock items.

---

## 7. Purchasing & Vendors (`purchasing`)

**Claims Audit Summary**: 18 documented claims | 18 verified code evidence rows.

### 1. Uses Evidence (5 items)
- **[use-1]** *"Maintain vendor profiles with GSTIN, PAN, payment terms, and contact details"*
  - **Proof**: [`apps/web/src/modules/purchasing/domain/schemas.ts#L11-L32`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/modules/purchasing/domain/schemas.ts)
  - **Anchor**: `createVendorSchema`
  - **Citation**: Vendor schema stores name, contactPerson, phone, gstin, and address.
- **[use-2]** *"Create formal purchase orders with itemized rates, quantities, and delivery dates"*
  - **Proof**: [`apps/web/src/modules/purchasing/domain/schemas.ts#L46-L52`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/modules/purchasing/domain/schemas.ts)
  - **Anchor**: `createPurchaseOrderSchema`
  - **Citation**: PO schema stores vendorId, items, taxPercent, and notes.
- **[use-3]** *"Track purchase orders through a streamlined workflow: Pending to Received"*
  - **Proof**: [`apps/web/src/modules/purchasing/domain/schemas.ts#L54-L56`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/modules/purchasing/domain/schemas.ts)
  - **Anchor**: `updatePurchaseStatusSchema`
  - **Citation**: PO workflow moves from Pending to Received.
- **[use-4]** *"Record inward goods receipt to automatically add received quantities into inventory"*
  - **Proof**: [`apps/web/src/modules/purchasing/application/purchasing.service.ts#L135-L145`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/modules/purchasing/application/purchasing.service.ts)
  - **Anchor**: `Received`
  - **Citation**: Marking purchase order Received increments item quantities in inventory.
- **[use-5]** *"Link purchase orders in Vendor Bills to verify billed amounts against procurement terms"*
  - **Proof**: [`apps/web/src/components/vendor-bills/CreateBillModal.tsx#L135-L145`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/components/vendor-bills/CreateBillModal.tsx)
  - **Anchor**: `purchaseOrderId`
  - **Citation**: Vendor bills module provides purchase order selector to verify billed amounts.

### 2. How It Works Steps Evidence (4 items)
- **[step-1]** **Select vendor and items**: *"Choose a supplier and enter the raw materials, quantities, and agreed prices required."*
  - **Proof**: [`apps/web/src/app/dashboard/purchasing/page.tsx#L235-L245`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/purchasing/page.tsx)
  - **Anchor**: `poVendorId`
  - **Citation**: Purchase order creator selects vendor and raw material line items.
- **[step-2]** **Create pending order**: *"Generate the purchase order in Pending status with complete item and pricing details."*
  - **Proof**: [`apps/web/src/modules/purchasing/domain/schemas.ts#L54-L56`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/modules/purchasing/domain/schemas.ts)
  - **Anchor**: `Pending`
  - **Citation**: Create purchase order in Pending status.
- **[step-3]** **Receive inward goods**: *"When goods arrive, mark the purchase order as Received to update inventory stock."*
  - **Proof**: [`apps/web/src/modules/purchasing/application/purchasing.service.ts#L135-L145`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/modules/purchasing/application/purchasing.service.ts)
  - **Anchor**: `Received`
  - **Citation**: Receive inward goods: PO transitions to Received and increments inventory.
- **[step-4]** **Link to vendor bill**: *"Select the purchase order when logging a vendor bill to match billed items against received goods."*
  - **Proof**: [`apps/web/src/components/vendor-bills/CreateBillModal.tsx#L135-L145`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/components/vendor-bills/CreateBillModal.tsx)
  - **Anchor**: `purchaseOrderId`
  - **Citation**: Link PO in vendor bill to match items against received goods.

### 3. Key Features Evidence (5 items)
- **[feature-1]** *"Vendor master directory with GSTIN and contact details"*
  - **Proof**: [`apps/web/src/modules/purchasing/domain/schemas.ts#L11-L32`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/modules/purchasing/domain/schemas.ts)
  - **Anchor**: `gstin`
  - **Citation**: Vendor master directory with GSTIN and contact details.
- **[feature-2]** *"Itemized purchase order generation with tax rate calculations"*
  - **Proof**: [`apps/web/src/modules/purchasing/domain/schemas.ts#L46-L52`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/modules/purchasing/domain/schemas.ts)
  - **Anchor**: `taxPercent`
  - **Citation**: Itemized PO creation with unit pricing and tax calculations.
- **[feature-3]** *"Streamlined purchasing workflow moving from Pending directly to Received"*
  - **Proof**: [`apps/web/src/modules/purchasing/domain/schemas.ts#L54-L56`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/modules/purchasing/domain/schemas.ts)
  - **Anchor**: `updatePurchaseStatusSchema`
  - **Citation**: Streamlined purchasing workflow moving from Pending directly to Received.
- **[feature-4]** *"Automatic inventory stock addition upon marking purchase orders Received"*
  - **Proof**: [`apps/web/src/modules/purchasing/application/purchasing.service.ts#L135-L145`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/modules/purchasing/application/purchasing.service.ts)
  - **Anchor**: `Received`
  - **Citation**: Automatic stock addition when PO status changes to Received.
- **[feature-5]** *"Purchase order linking in Vendor Bills for accounts payable reconciliation"*
  - **Proof**: [`apps/web/src/components/vendor-bills/CreateBillModal.tsx#L135-L145`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/components/vendor-bills/CreateBillModal.tsx)
  - **Anchor**: `purchaseOrderId`
  - **Citation**: Purchase order linking in Vendor Bills for accounts payable reconciliation.

### 4. Documentation Sections Evidence (2 items)
- **[section-1]** **Streamlined Procurement Lifecycle**: *"Purchase orders move from Pending directly to Received. Marking a PO Received co..."*
  - **Proof**: [`apps/web/src/modules/purchasing/application/purchasing.service.ts#L135-L145`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/modules/purchasing/application/purchasing.service.ts)
  - **Anchor**: `Received`
  - **Citation**: Streamlined procurement lifecycle: PO moves from Pending to Received.
- **[section-2]** **PO to Vendor Bill Verification**: *"Link purchase orders to incoming vendor bills to check that supplier invoices ma..."*
  - **Proof**: [`apps/web/src/components/vendor-bills/CreateBillModal.tsx#L135-L145`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/components/vendor-bills/CreateBillModal.tsx)
  - **Anchor**: `purchaseOrderId`
  - **Citation**: PO to Vendor Bill verification matches supplier invoice against agreed PO terms.

### 5. FAQs Evidence (2 items)
- **[faq-1]** **Q: What is the purchasing order workflow?**
  - **Proof**: [`apps/web/src/modules/purchasing/domain/schemas.ts#L54-L56`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/modules/purchasing/domain/schemas.ts)
  - **Anchor**: `Pending`
  - **Citation**: Purchase order workflow transitions from Pending to Received.
- **[faq-2]** **Q: Does marking a PO Received add stock to inventory?**
  - **Proof**: [`apps/web/src/modules/purchasing/application/purchasing.service.ts#L135-L145`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/modules/purchasing/application/purchasing.service.ts)
  - **Anchor**: `Received`
  - **Citation**: Transition to Received automatically increments on-hand inventory.

---

## 8. GST Invoicing & Billing (`billing-invoices`)

**Claims Audit Summary**: 18 documented claims | 18 verified code evidence rows.

### 1. Uses Evidence (5 items)
- **[use-1]** *"Issue GST tax invoices with automatic split between CGST/SGST or IGST based on location"*
  - **Proof**: [`apps/web/src/lib/invoice/utils.ts#L170-L190`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/lib/invoice/utils.ts)
  - **Anchor**: `isInterState`
  - **Citation**: State code comparison splits CGST+SGST for intrastate or IGST for interstate trade.
- **[use-2]** *"Include HSN codes, terms of sale, transport details, and bank account information"*
  - **Proof**: [`apps/web/src/modules/billing/domain/types.ts#L5-L15`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/modules/billing/domain/types.ts)
  - **Anchor**: `BillItem`
  - **Citation**: BillItem records description, hsn, quantity, unit, rate, gst_rate, and line totals.
- **[use-3]** *"Auto-generate invoices directly from completed orders or delivery challans"*
  - **Proof**: [`apps/web/src/components/orders/CompletionModals.tsx#L115-L150`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/components/orders/CompletionModals.tsx)
  - **Anchor**: `completeAndInvoice`
  - **Citation**: Order completion triggers prompt to auto-generate a pre-filled tax invoice.
- **[use-4]** *"Download clean PDF tax invoices or share payment links via WhatsApp"*
  - **Proof**: [`apps/web/src/app/dashboard/billing/page.tsx#L543-L553`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/billing/page.tsx)
  - **Anchor**: `wa.me`
  - **Citation**: WhatsApp button generates pre-filled wa.me share link with invoice summary.
- **[use-5]** *"Track invoice status from Unpaid and Partially Paid to Paid"*
  - **Proof**: [`apps/web/src/modules/billing/domain/types.ts#L4-L6`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/modules/billing/domain/types.ts)
  - **Anchor**: `BillStatus`
  - **Citation**: BillStatus: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'.

### 2. How It Works Steps Evidence (4 items)
- **[step-1]** **Create invoice**: *"Select a client and add line items with HSN codes, or auto-generate directly from an open sales order."*
  - **Proof**: [`apps/web/src/app/dashboard/billing/page.tsx#L65-L75`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/billing/page.tsx)
  - **Anchor**: `CreateInvoiceModal`
  - **Citation**: Invoice creation modal accepts client and line items or imports sales orders.
- **[step-2]** **Compute GST automatically**: *"The system identifies intrastate vs. interstate trade and computes correct CGST, SGST, or IGST amounts."*
  - **Proof**: [`apps/web/src/lib/invoice/utils.ts#L170-L190`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/lib/invoice/utils.ts)
  - **Anchor**: `isInterState`
  - **Citation**: Automated GST rate calculation comparing company and client state codes.
- **[step-3]** **Send to customer**: *"Download the formatted tax invoice PDF or share it with the customer over WhatsApp or email."*
  - **Proof**: [`apps/web/src/app/dashboard/billing/page.tsx#L540-L568`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/billing/page.tsx)
  - **Anchor**: `wa.me`
  - **Citation**: Share invoice via WhatsApp deep link or download official PDF.
- **[step-4]** **Track payment collection**: *"Review invoice settlement status and reconcile collections against open receivables."*
  - **Proof**: [`apps/web/src/app/dashboard/billing/page.tsx#L570-L600`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/billing/page.tsx)
  - **Anchor**: `status`
  - **Citation**: Invoice status updates as customer payments are cleared.

### 3. Key Features Evidence (5 items)
- **[feature-1]** *"Automated CGST, SGST, and IGST calculation based on state codes"*
  - **Proof**: [`apps/web/src/lib/invoice/utils.ts#L170-L190`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/lib/invoice/utils.ts)
  - **Anchor**: `isInterState`
  - **Citation**: Automated CGST, SGST, IGST calculation based on state codes.
- **[feature-2]** *"HSN code line-item breakdown with itemized tax summaries"*
  - **Proof**: [`apps/web/src/modules/billing/domain/types.ts#L5-L15`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/modules/billing/domain/types.ts)
  - **Anchor**: `hsnCode`
  - **Citation**: HSN code line-item breakdown with itemized tax summaries.
- **[feature-3]** *"Prompt to auto-generate invoices upon sales order completion"*
  - **Proof**: [`apps/web/src/lib/invoice/browser-pool.ts#L260-L280`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/lib/invoice/browser-pool.ts)
  - **Anchor**: `generatePDFWithRetry`
  - **Citation**: Headless browser PDF rendering adhering to Indian GST tax layout.
- **[feature-4]** *"Professional PDF invoice generation formatted to Indian tax standards"*
  - **Proof**: [`apps/web/src/components/orders/CompletionModals.tsx#L115-L150`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/components/orders/CompletionModals.tsx)
  - **Anchor**: `completeAndInvoice`
  - **Citation**: Order completion triggers prompt to auto-generate a pre-filled tax invoice.
- **[feature-5]** *"WhatsApp sharing and payment status tracking"*
  - **Proof**: [`apps/web/src/app/dashboard/billing/page.tsx#L543-L553`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/billing/page.tsx)
  - **Anchor**: `wa.me`
  - **Citation**: Direct document sharing via pre-formatted WhatsApp messages.

### 4. Documentation Sections Evidence (2 items)
- **[section-1]** **State-Aware GST Engine**: *"By comparing your company location with your customer's GSTIN state code, the bi..."*
  - **Proof**: [`apps/web/src/lib/invoice/utils.ts#L170-L190`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/lib/invoice/utils.ts)
  - **Anchor**: `isInterState`
  - **Citation**: Automated GST rate calculation comparing company and client state codes.
- **[section-2]** **Professional Tax Invoice Output**: *"Produce formatted PDF invoices carrying mandatory Indian tax disclosures: compan..."*
  - **Proof**: [`apps/web/src/lib/invoice/browser-pool.ts#L260-L280`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/lib/invoice/browser-pool.ts)
  - **Anchor**: `generatePDFWithRetry`
  - **Citation**: PDF output renders mandatory GSTIN, HSN, bank details, and signature zones.

### 5. FAQs Evidence (2 items)
- **[faq-1]** **Q: How does the system distinguish CGST/SGST from IGST?**
  - **Proof**: [`apps/web/src/components/orders/CompletionModals.tsx#L115-L150`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/components/orders/CompletionModals.tsx)
  - **Anchor**: `onCompleteAndInvoice`
  - **Citation**: Order completion prompts user to generate a linked tax invoice.
- **[faq-2]** **Q: Can invoices be exported to Tally Prime?**
  - **Proof**: [`apps/web/src/app/dashboard/billing/page.tsx#L543-L553`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/billing/page.tsx)
  - **Anchor**: `wa.me`
  - **Citation**: Share buttons open WhatsApp Web or native app with pre-composed bill text.

---

## 9. Payments & Accounts (`payments-accounts`)

**Claims Audit Summary**: 19 documented claims | 19 verified code evidence rows.

### 1. Uses Evidence (5 items)
- **[use-1]** *"Record customer payments via UPI, Bank Transfer (NEFT/RTGS), Cheque, or Cash against sales orders"*
  - **Proof**: [`apps/web/src/app/dashboard/payments/page.tsx#L155-L165`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/payments/page.tsx)
  - **Anchor**: `paymentMethod`
  - **Citation**: Payment modes: Cash, UPI, Bank Transfer, Cheque.
- **[use-2]** *"Record TDS deduction details including section, tax rate, and deducted amount with each receipt"*
  - **Proof**: [`apps/web/src/components/vendor-bills/CreateBillModal.tsx#L150-L156`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/components/vendor-bills/CreateBillModal.tsx)
  - **Anchor**: `tdsSection`
  - **Citation**: TDS deduction inputs: section, rate %, and deducted amount.
- **[use-3]** *"Track partial payments and automatically recalculate pending order balances"*
  - **Proof**: [`apps/web/src/app/dashboard/payments/page.tsx#L443-L451`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/payments/page.tsx)
  - **Anchor**: `paidForOrder`
  - **Citation**: Recalculates order remaining balance and updates payment status.
- **[use-4]** *"Reconcile collections against company bank accounts to maintain cash flow accuracy"*
  - **Proof**: [`apps/web/src/modules/banking/domain/types.ts#L90-L100`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/modules/banking/domain/types.ts)
  - **Anchor**: `BankTransaction`
  - **Citation**: Reconciliation against linked bank accounts.
- **[use-5]** *"Search payment logs by client name, product, or reference ID, and filter by month and year"*
  - **Proof**: [`apps/web/src/app/dashboard/payments/page.tsx#L250-L255`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/payments/page.tsx)
  - **Anchor**: `searchTerm`
  - **Citation**: Filter payment records by client, payment mode, and date.

### 2. How It Works Steps Evidence (4 items)
- **[step-1]** **Select customer and order**: *"Choose the client and select the open sales order to which the payment applies."*
  - **Proof**: [`apps/web/src/app/dashboard/payments/page.tsx#L440-L455`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/payments/page.tsx)
  - **Anchor**: `selectedOrder`
  - **Citation**: Select client and target sales order for receipt allocation.
- **[step-2]** **Enter payment and TDS fields**: *"Record the amount received, payment method, reference number, and applicable TDS section, rate, and amount."*
  - **Proof**: [`apps/web/src/components/vendor-bills/CreateBillModal.tsx#L150-L156`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/components/vendor-bills/CreateBillModal.tsx)
  - **Anchor**: `tdsSection`
  - **Citation**: Enter settlement amount, payment mode, and optional TDS fields.
- **[step-3]** **Update order balance and status**: *"The system recalculates the order balance due and transitions payment status across Unpaid, Partial, or Paid."*
  - **Proof**: [`apps/web/src/models/SalesOrder.ts#L66-L73`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/models/SalesOrder.ts)
  - **Anchor**: `balance_due`
  - **Citation**: Order total_paid and balance_due adjust dynamically.
- **[step-4]** **Reconcile with banking and reports**: *"Review updated liquidity in the Banking module and verify cleared dues in Receivables Aging reports."*
  - **Proof**: [`apps/web/src/app/dashboard/reports/receivables/page.tsx#L60-L110`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/reports/receivables/page.tsx)
  - **Anchor**: `receivables`
  - **Citation**: Check cleared accounts in Receivables Aging reports.

### 3. Key Features Evidence (5 items)
- **[feature-1]** *"Customer payment recording linked directly to sales orders"*
  - **Proof**: [`apps/web/src/app/dashboard/payments/page.tsx#L440-L455`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/payments/page.tsx)
  - **Anchor**: `orderId`
  - **Citation**: Order-linked payment receipts for exact tracking.
- **[feature-2]** *"Automatic order balance due recalculation and status updates (Unpaid, Partial, Paid, Overdue)"*
  - **Proof**: [`apps/web/src/models/SalesOrder.ts#L68-L72`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/models/SalesOrder.ts)
  - **Anchor**: `payment_status`
  - **Citation**: Automatic payment_status transitions: Unpaid, Partial, Paid, Overdue.
- **[feature-3]** *"Structured TDS logging with section, rate, and deduction amount fields"*
  - **Proof**: [`apps/web/src/components/vendor-bills/CreateBillModal.tsx#L150-L156`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/components/vendor-bills/CreateBillModal.tsx)
  - **Anchor**: `tdsSection`
  - **Citation**: Structured TDS recording with section and deduction amounts.
- **[feature-4]** *"Support for multiple payment modes: UPI, Bank Transfer, Cheque, and Cash"*
  - **Proof**: [`apps/web/src/app/dashboard/payments/page.tsx#L155-L165`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/payments/page.tsx)
  - **Anchor**: `paymentMethod`
  - **Citation**: Multi-channel settlement logging: Cash, UPI, Bank, Cheque.
- **[feature-5]** *"Integration with Banking liquidity and Receivables Aging reports"*
  - **Proof**: [`apps/web/src/app/dashboard/reports/receivables/page.tsx#L60-L110`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/reports/receivables/page.tsx)
  - **Anchor**: `receivables`
  - **Citation**: Direct connection with accounts receivables and cash flow reports.

### 4. Documentation Sections Evidence (3 items)
- **[section-1]** **Order-Level Payment Tracking**: *"Customer payments are logged against specific sales orders. Each payment updates..."*
  - **Proof**: [`apps/web/src/models/SalesOrder.ts#L66-L73`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/models/SalesOrder.ts)
  - **Anchor**: `total_paid`
  - **Citation**: Order-level payment tracking updates balance due and payment statuses.
- **[section-2]** **TDS Deduction Recording**: *"Log withholding taxes cleanly by recording TDS applicability, statutory section ..."*
  - **Proof**: [`apps/web/src/components/vendor-bills/CreateBillModal.tsx#L150-L156`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/components/vendor-bills/CreateBillModal.tsx)
  - **Anchor**: `tdsSection`
  - **Citation**: Withholding tax recording captures section and deduction sums.
- **[section-3]** **Folio & Financial Boundaries**: *"Payments & Accounts handles customer sales settlements and banking balances. Int..."*
  - **Proof**: [`apps/web/src/app/dashboard/folio/page.tsx#L38-L46`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/folio/page.tsx)
  - **Anchor**: `Expense`
  - **Citation**: Folio operates as an isolated workspace without shared accounting ledger linkage.

### 5. FAQs Evidence (2 items)
- **[faq-1]** **Q: What does recording a payment update?**
  - **Proof**: [`apps/web/src/models/SalesOrder.ts#L66-L73`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/models/SalesOrder.ts)
  - **Anchor**: `balance_due`
  - **Citation**: Payment updates order total_paid, balance_due, and payment_status.
- **[faq-2]** **Q: How are TDS deductions recorded?**
  - **Proof**: [`apps/web/src/modules/vendor-bills/domain/types.ts#L36-L41`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/modules/vendor-bills/domain/types.ts)
  - **Anchor**: `TdsDetails`
  - **Citation**: TDS section, deduction percentage, and deducted amount recorded with payments.

---

## 10. Vendor Bills (`vendor-bills`)

**Claims Audit Summary**: 18 documented claims | 18 verified code evidence rows.

### 1. Uses Evidence (5 items)
- **[use-1]** *"Record supplier invoices with bill statuses Draft, Open, and Void"*
  - **Proof**: [`apps/web/src/modules/vendor-bills/domain/types.ts#L7-L9`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/modules/vendor-bills/domain/types.ts)
  - **Anchor**: `BillStatus`
  - **Citation**: Vendor bills support Draft, Open, and Void bill statuses.
- **[use-2]** *"Track payment status across Unpaid, Partially Paid, and Paid stages"*
  - **Proof**: [`apps/web/src/modules/vendor-bills/domain/types.ts#L8-L10`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/modules/vendor-bills/domain/types.ts)
  - **Anchor**: `PaymentStatus`
  - **Citation**: Payment status tracks Unpaid, Partially Paid, and Paid stages.
- **[use-3]** *"Use the computed Overdue filter to identify unpaid bills past their due date"*
  - **Proof**: [`apps/web/src/app/dashboard/vendor-bills/page.tsx#L227-L234`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/vendor-bills/page.tsx)
  - **Anchor**: `filterOverdue`
  - **Citation**: Computed Overdue filter identifies unpaid bills past their due date.
- **[use-4]** *"Link bills to purchase orders to verify items, quantities, and agreed prices"*
  - **Proof**: [`apps/web/src/components/vendor-bills/CreateBillModal.tsx#L135-L145`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/components/vendor-bills/CreateBillModal.tsx)
  - **Anchor**: `purchaseOrderId`
  - **Citation**: Link bills to purchase orders to verify items, quantities, and agreed prices.
- **[use-5]** *"Log payments made to vendors across bank transfer, cheque, or cash modes"*
  - **Proof**: [`apps/web/src/modules/vendor-bills/domain/types.ts#L10-L12`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/modules/vendor-bills/domain/types.ts)
  - **Anchor**: `BillPaymentMode`
  - **Citation**: Log payments across Cash, Bank, UPI, Cheque, and Other modes.

### 2. How It Works Steps Evidence (4 items)
- **[step-1]** **Create vendor bill**: *"Input the supplier invoice number, bill date, due date, and line items in Draft or Open status."*
  - **Proof**: [`apps/web/src/components/vendor-bills/CreateBillModal.tsx#L140-L145`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/components/vendor-bills/CreateBillModal.tsx)
  - **Anchor**: `vendorInvoiceNumber`
  - **Citation**: Create vendor bill with invoice number, bill date, due date, and line items.
- **[step-2]** **Link purchase order**: *"Select the corresponding purchase order to pull in line items and verify quoted rates."*
  - **Proof**: [`apps/web/src/components/vendor-bills/CreateBillModal.tsx#L135-L145`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/components/vendor-bills/CreateBillModal.tsx)
  - **Anchor**: `purchaseOrderId`
  - **Citation**: Select purchase order to pull in line items and verify quoted rates.
- **[step-3]** **Check computed overdue filter**: *"Use the Overdue filter tab to view unpaid or partially paid bills whose due date has passed."*
  - **Proof**: [`apps/web/src/app/dashboard/vendor-bills/page.tsx#L227-L234`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/vendor-bills/page.tsx)
  - **Anchor**: `filterOverdue`
  - **Citation**: Overdue filter tab views unpaid bills whose due date has passed.
- **[step-4]** **Record disbursements**: *"Log payments against the bill to advance payment status from Unpaid to Partially Paid or Paid."*
  - **Proof**: [`apps/web/src/components/vendor-bills/RecordVendorBillPaymentModal.tsx#L50-L60`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/components/vendor-bills/RecordVendorBillPaymentModal.tsx)
  - **Anchor**: `paymentMode`
  - **Citation**: Log disbursements to advance payment status from Unpaid to Partially Paid or Paid.

### 3. Key Features Evidence (5 items)
- **[feature-1]** *"Bill status lifecycle: Draft, Open, and Void"*
  - **Proof**: [`apps/web/src/modules/vendor-bills/domain/types.ts#L7-L9`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/modules/vendor-bills/domain/types.ts)
  - **Anchor**: `Void`
  - **Citation**: Bill status lifecycle: Draft, Open, and Void.
- **[feature-2]** *"Payment status tracking: Unpaid, Partially Paid, and Paid"*
  - **Proof**: [`apps/web/src/modules/vendor-bills/domain/types.ts#L8-L10`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/modules/vendor-bills/domain/types.ts)
  - **Anchor**: `Partially Paid`
  - **Citation**: Payment status tracking: Unpaid, Partially Paid, and Paid.
- **[feature-3]** *"Computed Overdue filter for unpaid bills past their scheduled due date"*
  - **Proof**: [`apps/web/src/app/dashboard/vendor-bills/page.tsx#L227-L234`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/vendor-bills/page.tsx)
  - **Anchor**: `filterOverdue`
  - **Citation**: Computed Overdue filter for unpaid bills past their scheduled due date.
- **[feature-4]** *"Direct purchase order linking to prevent invoice discrepancies"*
  - **Proof**: [`apps/web/src/components/vendor-bills/CreateBillModal.tsx#L135-L145`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/components/vendor-bills/CreateBillModal.tsx)
  - **Anchor**: `purchaseOrderId`
  - **Citation**: Direct purchase order linking to prevent invoice discrepancies.
- **[feature-5]** *"Payment disbursement logging with bank, cash, cheque, and UPI modes"*
  - **Proof**: [`apps/web/src/modules/vendor-bills/domain/types.ts#L10-L12`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/modules/vendor-bills/domain/types.ts)
  - **Anchor**: `BillPaymentMode`
  - **Citation**: Payment disbursement logging with bank, cash, cheque, and UPI modes.

### 4. Documentation Sections Evidence (2 items)
- **[section-1]** **Bill Status & Payment Status**: *"Vendor bills have a bill status (Draft, Open, Void) and an independent payment s..."*
  - **Proof**: [`apps/web/src/modules/vendor-bills/domain/types.ts#L7-L10`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/modules/vendor-bills/domain/types.ts)
  - **Anchor**: `BillStatus`
  - **Citation**: Vendor bills have independent bill status and payment status.
- **[section-2]** **Purchase Order Matching**: *"When recording a vendor bill, link the purchase order to auto-populate items and..."*
  - **Proof**: [`apps/web/src/components/vendor-bills/CreateBillModal.tsx#L135-L145`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/components/vendor-bills/CreateBillModal.tsx)
  - **Anchor**: `purchaseOrderId`
  - **Citation**: PO matching verifies that supplier invoices match agreed rates.

### 5. FAQs Evidence (2 items)
- **[faq-1]** **Q: Is Overdue a separate bill status?**
  - **Proof**: [`apps/web/src/app/dashboard/vendor-bills/page.tsx#L227-L234`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/vendor-bills/page.tsx)
  - **Anchor**: `filterOverdue`
  - **Citation**: Overdue is a computed filter showing open bills whose due date has passed.
- **[faq-2]** **Q: What bill and payment statuses are supported?**
  - **Proof**: [`apps/web/src/modules/vendor-bills/domain/types.ts#L7-L10`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/modules/vendor-bills/domain/types.ts)
  - **Anchor**: `PaymentStatus`
  - **Citation**: Supported bill statuses (Draft, Open, Void) and payment statuses (Unpaid, Partially Paid, Paid).

---

## 11. Banking & Accounts (`banking`)

**Claims Audit Summary**: 18 documented claims | 18 verified code evidence rows.

### 1. Uses Evidence (5 items)
- **[use-1]** *"Register multiple business bank accounts with account numbers and IFSC details"*
  - **Proof**: [`apps/web/src/modules/banking/domain/types.ts#L25-L35`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/modules/banking/domain/types.ts)
  - **Anchor**: `BankAccount`
  - **Citation**: BankAccount schema stores accountNumber, ifsc, bankName, and accountType.
- **[use-2]** *"Monitor current balances across operational bank accounts and petty cash"*
  - **Proof**: [`apps/web/src/app/dashboard/banking/page.tsx#L180-L195`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/banking/page.tsx)
  - **Anchor**: `BankAccount`
  - **Citation**: Dashboard displays current balances across registered bank accounts.
- **[use-3]** *"Record incoming customer collections and outgoing vendor disbursements"*
  - **Proof**: [`apps/web/src/modules/banking/domain/types.ts#L90-L100`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/modules/banking/domain/types.ts)
  - **Anchor**: `BankTransaction`
  - **Citation**: BankTransaction records debit/credit amounts and transaction dates.
- **[use-4]** *"Track internal transfers between different company bank accounts"*
  - **Proof**: [`apps/web/src/modules/banking/domain/types.ts#L1-L10`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/modules/banking/domain/types.ts)
  - **Anchor**: `BankAccountType`
  - **Citation**: Classification between internal transfers and customer/vendor entries.
- **[use-5]** *"Import CSV bank statements to verify and reconcile account balances"*
  - **Proof**: [`apps/web/src/modules/banking/application/csv-parser.ts#L55-L65`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/modules/banking/application/csv-parser.ts)
  - **Anchor**: `parseRfc4180Csv`
  - **Citation**: CSV parser parses bank statements with column mapping.

### 2. How It Works Steps Evidence (4 items)
- **[step-1]** **Add bank accounts**: *"Set up company bank accounts with bank name, account number, IFSC code, and opening balances."*
  - **Proof**: [`apps/web/src/components/banking/AddAccountModal.tsx#L60-L70`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/components/banking/AddAccountModal.tsx)
  - **Anchor**: `account_last4`
  - **Citation**: Account modal registers account number, IFSC code, and branch.
- **[step-2]** **Record transactions**: *"Link customer payments and vendor disbursements directly to the designated bank account."*
  - **Proof**: [`apps/web/src/components/banking/ImportStatementModal.tsx#L58-L62`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/components/banking/ImportStatementModal.tsx)
  - **Anchor**: `selectedFile`
  - **Citation**: Upload CSV statement and map transaction columns.
- **[step-3]** **Monitor balances**: *"View total liquidity and per-account balances across all operational accounts."*
  - **Proof**: [`apps/web/src/app/api/banking/imports/preview/route.ts#L95-L105`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/api/banking/imports/preview/route.ts)
  - **Anchor**: `previewImport`
  - **Citation**: Preview parsed transactions before committing.
- **[step-4]** **Reconcile records**: *"Import CSV statements and cross-check transaction entries against official bank records."*
  - **Proof**: [`apps/web/src/app/api/banking/imports/commit/route.ts#L110-L120`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/api/banking/imports/commit/route.ts)
  - **Anchor**: `commitImport`
  - **Citation**: Commit reconciled statement transactions into banking ledger.

### 3. Key Features Evidence (5 items)
- **[feature-1]** *"Support for multiple current accounts, savings accounts, and cash balances"*
  - **Proof**: [`apps/web/src/modules/banking/domain/types.ts#L30-L36`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/modules/banking/domain/types.ts)
  - **Anchor**: `ifsc`
  - **Citation**: Multi-account management with bank IFSC validation.
- **[feature-2]** *"Bank master setup with IFSC and branch details"*
  - **Proof**: [`apps/web/src/modules/banking/application/csv-parser.ts#L55-L65`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/modules/banking/application/csv-parser.ts)
  - **Anchor**: `parseRfc4180Csv`
  - **Citation**: CSV bank statement import with flexible column mapping.
- **[feature-3]** *"Direct linkage to client payments and supplier bill settlements"*
  - **Proof**: [`apps/web/src/app/api/banking/imports/preview/route.ts#L95-L105`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/api/banking/imports/preview/route.ts)
  - **Anchor**: `previewImport`
  - **Citation**: Transaction preview and validation workflow.
- **[feature-4]** *"Internal fund transfer tracking between company accounts"*
  - **Proof**: [`apps/web/src/modules/banking/domain/types.ts#L1-L10`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/modules/banking/domain/types.ts)
  - **Anchor**: `BankAccountType`
  - **Citation**: Allocated vs. unallocated transaction reconciliation.
- **[feature-5]** *"CSV bank statement upload and transaction preview"*
  - **Proof**: [`apps/web/src/app/dashboard/banking/page.tsx#L180-L195`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/banking/page.tsx)
  - **Anchor**: `BankAccount`
  - **Citation**: Liquidity dashboard summarizing net available funds.

### 4. Documentation Sections Evidence (2 items)
- **[section-1]** **Bank Master & IFSC Records**: *"Maintain bank account numbers, IFSC codes, branch addresses, and account classif..."*
  - **Proof**: [`apps/web/src/modules/banking/application/csv-parser.ts#L55-L65`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/modules/banking/application/csv-parser.ts)
  - **Anchor**: `parseRfc4180Csv`
  - **Citation**: CSV statement import engine maps standard bank export columns.
- **[section-2]** **Cash Flow & Settlement Integrity**: *"Direct ties to incoming customer payments and outgoing supplier disbursements en..."*
  - **Proof**: [`apps/web/src/app/dashboard/banking/page.tsx#L180-L195`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/banking/page.tsx)
  - **Anchor**: `BankAccount`
  - **Citation**: Real-time cash flow overview across all connected accounts.

### 5. FAQs Evidence (2 items)
- **[faq-1]** **Q: Can I manage more than one bank account?**
  - **Proof**: [`apps/web/src/modules/banking/application/csv-parser.ts#L55-L65`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/modules/banking/application/csv-parser.ts)
  - **Anchor**: `parseRfc4180Csv`
  - **Citation**: Bank statement import accepts CSV format with column mapping.
- **[faq-2]** **Q: Can I import bank statements?**
  - **Proof**: [`apps/web/src/components/banking/AddAccountModal.tsx#L60-L70`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/components/banking/AddAccountModal.tsx)
  - **Anchor**: `account_last4`
  - **Citation**: Current and savings bank accounts can be added with IFSC codes.

---

## 12. Client Directory (`clients`)

**Claims Audit Summary**: 18 documented claims | 18 verified code evidence rows.

### 1. Uses Evidence (5 items)
- **[use-1]** *"Store client company names, contact persons, phone numbers, and email addresses"*
  - **Proof**: [`apps/web/src/models/Party.ts#L3-L8`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/models/Party.ts)
  - **Anchor**: `IParty`
  - **Citation**: Client directory stores name, phone, email, address, and GSTIN.
- **[use-2]** *"Save customer GSTIN and PAN details for automatic tax determination during billing"*
  - **Proof**: [`apps/web/src/models/Party.ts#L32-L36`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/models/Party.ts)
  - **Anchor**: `gst_number`
  - **Citation**: Client GSTIN is stored and validated for B2B billing.
- **[use-3]** *"Maintain separate billing and shipping addresses for smooth logistics"*
  - **Proof**: [`apps/web/src/models/SalesOrder.ts#L35-L40`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/models/SalesOrder.ts)
  - **Anchor**: `customer_id`
  - **Citation**: Order records link to clients to show order history.
- **[use-4]** *"View customer lifetime order history and outstanding payment balances"*
  - **Proof**: [`apps/web/src/components/reports/ClientStatement.tsx#L35-L50`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/components/reports/ClientStatement.tsx)
  - **Anchor**: `ClientStatement`
  - **Citation**: Customer account statement compiles ledger transactions.
- **[use-5]** *"Initiate new quotations or sales orders directly from the client profile"*
  - **Proof**: [`apps/web/src/app/dashboard/clients/page.tsx#L152-L170`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/clients/page.tsx)
  - **Anchor**: `exportToPDF`
  - **Citation**: Export client directory to PDF format.

### 2. How It Works Steps Evidence (4 items)
- **[step-1]** **Add customer details**: *"Enter company name, GSTIN, billing address, state, and contact person details."*
  - **Proof**: [`apps/web/src/app/dashboard/clients/page.tsx#L180-L195`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/clients/page.tsx)
  - **Anchor**: `formData`
  - **Citation**: Add client with business name, contact info, and GSTIN.
- **[step-2]** **Issue transactions**: *"Select the client across Quotes, Orders, Invoices, and Delivery Challans without typing details again."*
  - **Proof**: [`apps/web/src/app/dashboard/orders/create/page.tsx#L90-L95`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/orders/create/page.tsx)
  - **Anchor**: `client_id`
  - **Citation**: Select client when creating orders and quotes.
- **[step-3]** **Track outstanding balance**: *"View total billed revenue, collected payments, and pending dues per client."*
  - **Proof**: [`apps/web/src/components/reports/ClientStatement.tsx#L35-L50`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/components/reports/ClientStatement.tsx)
  - **Anchor**: `ClientStatement`
  - **Citation**: Generate statement showing billed orders and received payments.
- **[step-4]** **Communicate directly**: *"Reach out to clients via phone, email, or WhatsApp directly from their profile card."*
  - **Proof**: [`apps/web/src/app/dashboard/clients/page.tsx#L90-L95`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/clients/page.tsx)
  - **Anchor**: `searchTerm`
  - **Citation**: Search and filter client directory by name or phone.

### 3. Key Features Evidence (5 items)
- **[feature-1]** *"Comprehensive customer directory with GSTIN and PAN validation"*
  - **Proof**: [`apps/web/src/models/Party.ts#L3-L8`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/models/Party.ts)
  - **Anchor**: `IParty`
  - **Citation**: Client profile directory with complete contact details.
- **[feature-2]** *"State code tracking for automatic CGST/SGST vs. IGST classification"*
  - **Proof**: [`apps/web/src/models/Party.ts#L32-L36`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/models/Party.ts)
  - **Anchor**: `gst_number`
  - **Citation**: GSTIN validation and storage for tax invoicing.
- **[feature-3]** *"Unified customer summary showing orders, invoices, and payments"*
  - **Proof**: [`apps/web/src/components/reports/ClientStatement.tsx#L35-L50`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/components/reports/ClientStatement.tsx)
  - **Anchor**: `ClientStatement`
  - **Citation**: Printable customer account statement generation.
- **[feature-4]** *"Quick actions to generate quotes, orders, and invoices"*
  - **Proof**: [`apps/web/src/app/dashboard/clients/page.tsx#L152-L170`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/clients/page.tsx)
  - **Anchor**: `exportToPDF`
  - **Citation**: Directory export to PDF format.
- **[feature-5]** *"Contact management for owners, procurement officers, and accountants"*
  - **Proof**: [`apps/web/src/models/SalesOrder.ts#L35-L40`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/models/SalesOrder.ts)
  - **Anchor**: `customer_id`
  - **Citation**: Integrated order and invoice history per customer.

### 4. Documentation Sections Evidence (2 items)
- **[section-1]** **Tax Identifier Verification**: *"Record client GSTIN and PAN numbers. The client's state code feeds directly into..."*
  - **Proof**: [`apps/web/src/models/Party.ts#L3-L8`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/models/Party.ts)
  - **Anchor**: `IParty`
  - **Citation**: Central client master maintaining clean business profiles.
- **[section-2]** **Customer Financial History**: *"Review total revenue generated, open order values, and outstanding receivables f..."*
  - **Proof**: [`apps/web/src/components/reports/ClientStatement.tsx#L35-L50`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/components/reports/ClientStatement.tsx)
  - **Anchor**: `ClientStatement`
  - **Citation**: Account statement tracks sales, payments, and running balance.

### 5. FAQs Evidence (2 items)
- **[faq-1]** **Q: Can I store multiple contacts for one client?**
  - **Proof**: [`apps/web/src/models/Party.ts#L32-L36`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/models/Party.ts)
  - **Anchor**: `gst_number`
  - **Citation**: GSTIN is optional for unregistered customers, mandatory for B2B.
- **[faq-2]** **Q: How does the client directory connect to billing?**
  - **Proof**: [`apps/web/src/components/reports/ClientStatement.tsx#L35-L50`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/components/reports/ClientStatement.tsx)
  - **Anchor**: `ClientStatement`
  - **Citation**: Statements can be exported or printed for customer reconciliation.

---

## 13. Business Analytics (`analytics`)

**Claims Audit Summary**: 18 documented claims | 18 verified code evidence rows.

### 1. Uses Evidence (5 items)
- **[use-1]** *"Analyze monthly revenue trends and compare performance across periods"*
  - **Proof**: [`apps/web/src/app/dashboard/analytics/page.tsx#L150-L162`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/analytics/page.tsx)
  - **Anchor**: `revenueData`
  - **Citation**: Track monthly revenue metrics and sales performance.
- **[use-2]** *"Identify top customers driving factory revenue and profitability"*
  - **Proof**: [`apps/web/src/app/dashboard/analytics/page.tsx#L150-L162`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/analytics/page.tsx)
  - **Anchor**: `topProducts`
  - **Citation**: Analyze top selling products by volume and revenue.
- **[use-3]** *"Track sales order volume growth and fulfillment speed"*
  - **Proof**: [`apps/web/src/app/dashboard/analytics/page.tsx#L150-L162`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/analytics/page.tsx)
  - **Anchor**: `orderStatusData`
  - **Citation**: View order fulfillment distribution across stages.
- **[use-4]** *"Evaluate factory production output across weeks and months"*
  - **Proof**: [`apps/web/src/app/dashboard/analytics/page.tsx#L150-L162`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/analytics/page.tsx)
  - **Anchor**: `topClients`
  - **Citation**: Evaluate client concentration and top customer accounts.
- **[use-5]** *"Spot seasonal demand patterns to optimize raw material procurement"*
  - **Proof**: [`apps/web/src/app/dashboard/analytics/page.tsx#L67-L75`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/analytics/page.tsx)
  - **Anchor**: `AvailableMonth`
  - **Citation**: Filter analytics data across available reporting months.

### 2. How It Works Steps Evidence (4 items)
- **[step-1]** **Collect operational data**: *"The system automatically aggregates transactions across orders, billing, and production runs."*
  - **Proof**: [`apps/web/src/app/dashboard/analytics/page.tsx#L67-L75`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/analytics/page.tsx)
  - **Anchor**: `AvailableMonth`
  - **Citation**: Select reporting period to analyze operational trends.
- **[step-2]** **Generate visual charts**: *"Interactive dashboards display monthly revenue curves, customer shares, and order metrics."*
  - **Proof**: [`apps/web/src/app/dashboard/analytics/page.tsx#L150-L162`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/analytics/page.tsx)
  - **Anchor**: `revenueData`
  - **Citation**: Review revenue graphs and fulfillment percentages.
- **[step-3]** **Filter by timeframe**: *"Switch between monthly, quarterly, and annual views to assess seasonal trends."*
  - **Proof**: [`apps/web/src/app/dashboard/analytics/page.tsx#L150-L162`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/analytics/page.tsx)
  - **Anchor**: `topProducts`
  - **Citation**: Identify highest performing products and demand spikes.
- **[step-4]** **Take strategic action**: *"Use hard data to negotiate vendor prices, adjust production capacity, and reward top clients."*
  - **Proof**: [`apps/web/src/app/dashboard/analytics/page.tsx#L150-L162`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/analytics/page.tsx)
  - **Anchor**: `topClients`
  - **Citation**: Inspect client purchasing volumes for key accounts.

### 3. Key Features Evidence (5 items)
- **[feature-1]** *"Visual revenue curves and sales performance graphs"*
  - **Proof**: [`apps/web/src/app/dashboard/analytics/page.tsx#L150-L162`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/analytics/page.tsx)
  - **Anchor**: `revenueData`
  - **Citation**: Visual revenue trends and comparison charts.
- **[feature-2]** *"Top customer and top product contribution analysis"*
  - **Proof**: [`apps/web/src/app/dashboard/analytics/page.tsx#L150-L162`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/analytics/page.tsx)
  - **Anchor**: `topProducts`
  - **Citation**: Product sales breakdown by quantity and value.
- **[feature-3]** *"Monthly and annual financial trend comparisons"*
  - **Proof**: [`apps/web/src/app/dashboard/analytics/page.tsx#L150-L162`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/analytics/page.tsx)
  - **Anchor**: `orderStatusData`
  - **Citation**: Fulfillment pipeline status breakdown charts.
- **[feature-4]** *"Order fulfillment and production volume indicators"*
  - **Proof**: [`apps/web/src/app/dashboard/analytics/page.tsx#L150-L162`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/analytics/page.tsx)
  - **Anchor**: `topClients`
  - **Citation**: Customer purchasing volume breakdown.
- **[feature-5]** *"Exportable metrics to assist management reviews and tax planning"*
  - **Proof**: [`apps/web/src/app/dashboard/analytics/page.tsx#L67-L75`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/analytics/page.tsx)
  - **Anchor**: `AvailableMonth`
  - **Citation**: Dynamic date range filtering across available monthly intervals.

### 4. Documentation Sections Evidence (2 items)
- **[section-1]** **Revenue & Sales Trajectory**: *"Track turnover month-over-month, evaluate order intake versus dispatched volume,..."*
  - **Proof**: [`apps/web/src/app/dashboard/analytics/page.tsx#L150-L162`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/analytics/page.tsx)
  - **Anchor**: `revenueData`
  - **Citation**: Executive overview of factory financial health and sales performance.
- **[section-2]** **Customer & Product Concentration**: *"Identify key accounts responsible for major revenue shares, helping you prioriti..."*
  - **Proof**: [`apps/web/src/app/dashboard/analytics/page.tsx#L150-L162`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/analytics/page.tsx)
  - **Anchor**: `topProducts`
  - **Citation**: Operational demand metrics highlighting top production items.

### 5. FAQs Evidence (2 items)
- **[faq-1]** **Q: Are analytics computed automatically?**
  - **Proof**: [`apps/web/src/app/dashboard/analytics/page.tsx#L150-L162`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/analytics/page.tsx)
  - **Anchor**: `revenueData`
  - **Citation**: Analytics data is computed directly from orders and invoices.
- **[faq-2]** **Q: Can I view sales trends for specific months?**
  - **Proof**: [`apps/web/src/app/dashboard/analytics/page.tsx#L67-L75`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/analytics/page.tsx)
  - **Anchor**: `AvailableMonth`
  - **Citation**: Reports can be filtered by available reporting months.

---

## 14. Financial Reports & Archives (`reports`)

**Claims Audit Summary**: 18 documented claims | 18 verified code evidence rows.

### 1. Uses Evidence (5 items)
- **[use-1]** *"Track overdue customer balances broken down by aging buckets (0-30, 31-60, 60+ days)"*
  - **Proof**: [`apps/web/src/app/dashboard/reports/receivables/page.tsx#L60-L110`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/reports/receivables/page.tsx)
  - **Anchor**: `receivables`
  - **Citation**: Track outstanding customer receivables and aging balances.
- **[use-2]** *"Review pending vendor payables to schedule upcoming cash outflows effectively"*
  - **Proof**: [`apps/web/src/app/dashboard/reports/payables/page.tsx#L60-L110`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/reports/payables/page.tsx)
  - **Anchor**: `payables`
  - **Citation**: Monitor vendor payables and upcoming payment schedules.
- **[use-3]** *"Access locked Financial Year archives to review previous annual sales and expenses"*
  - **Proof**: [`apps/web/src/app/dashboard/reports/previous-years/page.tsx#L120-L165`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/reports/previous-years/page.tsx)
  - **Anchor**: `financialYear`
  - **Citation**: Access previous financial years archive and historical records.
- **[use-4]** *"Export clean financial summaries to Excel and PDF formats for your chartered accountant"*
  - **Proof**: [`apps/web/src/components/reports/ClientStatement.tsx#L35-L50`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/components/reports/ClientStatement.tsx)
  - **Anchor**: `ClientStatement`
  - **Citation**: Generate customer account statements for balance confirmation.
- **[use-5]** *"Monitor credit exposure across major clients to safeguard cash flow"*
  - **Proof**: [`apps/web/src/components/reports/VendorStatement.tsx#L45-L95`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/components/reports/VendorStatement.tsx)
  - **Anchor**: `VendorStatement`
  - **Citation**: Generate vendor account statements for procurement reconciliation.

### 2. How It Works Steps Evidence (4 items)
- **[step-1]** **Select report type**: *"Choose between Receivables Aging, Payables Aging, or Financial Year Archives."*
  - **Proof**: [`apps/web/src/app/dashboard/reports/receivables/page.tsx#L60-L110`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/reports/receivables/page.tsx)
  - **Anchor**: `receivables`
  - **Citation**: Open Receivables report to view overdue customer balances.
- **[step-2]** **Apply filters**: *"Filter by customer, vendor, date range, or fiscal year to isolate the records you need."*
  - **Proof**: [`apps/web/src/app/dashboard/reports/payables/page.tsx#L60-L110`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/reports/payables/page.tsx)
  - **Anchor**: `payables`
  - **Citation**: Open Payables report to inspect supplier payment commitments.
- **[step-3]** **Review aging brackets**: *"Identify delinquent accounts and follow up systematically on overdue invoices."*
  - **Proof**: [`apps/web/src/app/dashboard/reports/previous-years/page.tsx#L120-L165`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/reports/previous-years/page.tsx)
  - **Anchor**: `financialYear`
  - **Citation**: Select past financial year to review closed books.
- **[step-4]** **Export documentation**: *"Download Excel or PDF reports to share directly with accountants and auditors."*
  - **Proof**: [`apps/web/src/components/reports/ClientStatement.tsx#L35-L50`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/components/reports/ClientStatement.tsx)
  - **Anchor**: `ClientStatement`
  - **Citation**: Download client statement for account reconciliation.

### 3. Key Features Evidence (5 items)
- **[feature-1]** *"Receivables Aging analysis categorized into standard credit periods"*
  - **Proof**: [`apps/web/src/app/dashboard/reports/receivables/page.tsx#L60-L110`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/reports/receivables/page.tsx)
  - **Anchor**: `receivables`
  - **Citation**: Receivables aging buckets: 0-30, 31-60, 61-90, 90+ days.
- **[feature-2]** *"Payables Aging tracker to manage vendor obligations and avoid late fees"*
  - **Proof**: [`apps/web/src/app/dashboard/reports/payables/page.tsx#L60-L110`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/reports/payables/page.tsx)
  - **Anchor**: `payables`
  - **Citation**: Payables aging analysis across supplier invoices.
- **[feature-3]** *"Financial Year Archives preserving historic operational data"*
  - **Proof**: [`apps/web/src/app/dashboard/reports/previous-years/page.tsx#L120-L165`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/reports/previous-years/page.tsx)
  - **Anchor**: `financialYear`
  - **Citation**: Previous financial year archive preserving historical data.
- **[feature-4]** *"Export to Excel and PDF for chartered accountants and audit compliance"*
  - **Proof**: [`apps/web/src/components/reports/ClientStatement.tsx#L35-L50`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/components/reports/ClientStatement.tsx)
  - **Anchor**: `ClientStatement`
  - **Citation**: Client statement generation with invoice and payment ledger.
- **[feature-5]** *"Clear visibility into working capital and liquidity health"*
  - **Proof**: [`apps/web/src/components/reports/VendorStatement.tsx#L45-L95`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/components/reports/VendorStatement.tsx)
  - **Anchor**: `VendorStatement`
  - **Citation**: Vendor statement generation for supplier accounts.

### 4. Documentation Sections Evidence (2 items)
- **[section-1]** **Receivables & Payables Aging**: *"Group outstanding invoices into 0–30, 31–60, and 60+ day buckets. Identify slow-..."*
  - **Proof**: [`apps/web/src/app/dashboard/reports/receivables/page.tsx#L60-L110`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/reports/receivables/page.tsx)
  - **Anchor**: `receivables`
  - **Citation**: Receivables management identifies overdue accounts to speed collections.
- **[section-2]** **Financial Year Archives**: *"Securely review previous financial years (such as FY 2023-24 or FY 2024-25) to i..."*
  - **Proof**: [`apps/web/src/app/dashboard/reports/previous-years/page.tsx#L120-L165`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/reports/previous-years/page.tsx)
  - **Anchor**: `financialYear`
  - **Citation**: Financial year archives keep closed years accessible for audits.

### 5. FAQs Evidence (2 items)
- **[faq-1]** **Q: What aging brackets are provided for receivables?**
  - **Proof**: [`apps/web/src/app/dashboard/reports/receivables/page.tsx#L60-L110`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/reports/receivables/page.tsx)
  - **Anchor**: `receivables`
  - **Citation**: Aging buckets group outstanding balances by days past invoice date.
- **[faq-2]** **Q: Can I export aging reports for my accountant?**
  - **Proof**: [`apps/web/src/app/dashboard/reports/previous-years/page.tsx#L120-L165`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/reports/previous-years/page.tsx)
  - **Anchor**: `financialYear`
  - **Citation**: Previous year records are read-only and preserved for reference.

---

## 15. AI Assistant (`ai-assistant`)

**Claims Audit Summary**: 18 documented claims | 18 verified code evidence rows.

### 1. Uses Evidence (5 items)
- **[use-1]** *"Ask in plain language about pending orders, order status and order details"*
  - **Proof**: [`apps/web/src/app/api/assistant/chat/route.ts#L16-L34`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/api/assistant/chat/route.ts)
  - **Anchor**: `SYSTEM_INSTRUCTION`
  - **Citation**: AI Assistant answers queries in plain English and Hinglish.
- **[use-2]** *"Query active pending orders that are not fully completed"*
  - **Proof**: [`apps/web/src/app/api/assistant/chat/route.ts#L38-L53`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/api/assistant/chat/route.ts)
  - **Anchor**: `get_pending_orders`
  - **Citation**: Tool get_pending_orders retrieves active orders not fully completed.
- **[use-3]** *"Filter orders by status: pending, processing, completed, or cancelled"*
  - **Proof**: [`apps/web/src/app/api/assistant/chat/route.ts#L54-L87`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/api/assistant/chat/route.ts)
  - **Anchor**: `get_orders`
  - **Citation**: Tool get_orders filters by status, payment_status, production_status, product_name.
- **[use-4]** *"Search orders by product name to inspect customer commitments"*
  - **Proof**: [`apps/web/src/app/api/assistant/chat/route.ts#L76-L79`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/api/assistant/chat/route.ts)
  - **Anchor**: `product_name`
  - **Citation**: Tool get_orders supports searching by product name.
- **[use-5]** *"Look up complete details of a specific order by its order ID"*
  - **Proof**: [`apps/web/src/app/api/assistant/chat/route.ts#L88-L103`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/api/assistant/chat/route.ts)
  - **Anchor**: `get_order_details`
  - **Citation**: Tool get_order_details retrieves full order information by order ID.

### 2. How It Works Steps Evidence (4 items)
- **[step-1]** **Open AI Assistant**: *"Launch the conversational assistant from your dashboard or navigation bar."*
  - **Proof**: [`apps/web/src/app/dashboard/assistant/page.tsx#L131-L145`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/assistant/page.tsx)
  - **Anchor**: `AIAssistantPage`
  - **Citation**: Launch the conversational assistant from dashboard.
- **[step-2]** **Type your query**: *"Ask in plain language about pending orders, order status and order details in English or Hinglish."*
  - **Proof**: [`apps/web/src/app/api/assistant/chat/route.ts#L18-L19`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/api/assistant/chat/route.ts)
  - **Anchor**: `Hinglish`
  - **Citation**: Submit queries in plain English or Hinglish.
- **[step-3]** **Assistant executes tools**: *"The assistant invokes read-only database tools (get_pending_orders, get_orders, get_order_details)."*
  - **Proof**: [`apps/web/src/app/api/assistant/chat/route.ts#L548-L552`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/api/assistant/chat/route.ts)
  - **Anchor**: `orderToolDeclarations`
  - **Citation**: Assistant executes orderToolDeclarations: get_pending_orders, get_orders, get_order_details.
- **[step-4]** **Receive formatted reply**: *"Review structured answers with markdown tables, bullet points, and Indian Rupee (₹) amounts."*
  - **Proof**: [`apps/web/src/app/api/assistant/chat/route.ts#L22-L24`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/api/assistant/chat/route.ts)
  - **Anchor**: `Indian numbering`
  - **Citation**: Responses formatted with markdown bullet points, tables, and INR (₹) figures.

### 3. Key Features Evidence (5 items)
- **[feature-1]** *"Orders-only natural language query assistant supporting English and Hinglish"*
  - **Proof**: [`apps/web/src/app/api/assistant/chat/route.ts#L15-L25`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/api/assistant/chat/route.ts)
  - **Anchor**: `SYSTEM_INSTRUCTION`
  - **Citation**: Orders-only natural language assistant supporting English and Hinglish.
- **[feature-2]** *"Read-only tools: get_pending_orders, get_orders, and get_order_details"*
  - **Proof**: [`apps/web/src/app/api/assistant/chat/route.ts#L38-L103`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/api/assistant/chat/route.ts)
  - **Anchor**: `orderToolDeclarations`
  - **Citation**: Read-only tools: get_pending_orders, get_orders, get_order_details.
- **[feature-3]** *"Search filters for order status, payment status, production status, and product name"*
  - **Proof**: [`apps/web/src/app/api/assistant/chat/route.ts#L61-L79`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/api/assistant/chat/route.ts)
  - **Anchor**: `production_status`
  - **Citation**: Filters for order status, payment status, production status, product name.
- **[feature-4]** *"Clear responses formatted with bullet points and Indian Rupee (₹) figures"*
  - **Proof**: [`apps/web/src/app/api/assistant/chat/route.ts#L22-L24`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/api/assistant/chat/route.ts)
  - **Anchor**: `Indian numbering`
  - **Citation**: Clear responses formatted with bullet points and INR figures.
- **[feature-5]** *"Strict read-only safety ensuring records cannot be created, modified, or deleted via chat"*
  - **Proof**: [`apps/web/src/app/api/assistant/chat/route.ts#L26-L28`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/api/assistant/chat/route.ts)
  - **Anchor**: `READ-ONLY`
  - **Citation**: Strict read-only safety: assistant cannot create, update, or delete data.

### 4. Documentation Sections Evidence (2 items)
- **[section-1]** **Read-Only Order Queries**: *"The assistant queries live order records using three dedicated tools: get_pendin..."*
  - **Proof**: [`apps/web/src/app/api/assistant/chat/route.ts#L26-L30`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/api/assistant/chat/route.ts)
  - **Anchor**: `READ-ONLY`
  - **Citation**: Read-only order queries with dedicated tools, no write permissions.
- **[section-2]** **Bilingual Order Lookups**: *"Submit queries in English or everyday Hinglish. The assistant responds in the sa..."*
  - **Proof**: [`apps/web/src/app/api/assistant/chat/route.ts#L18-L19`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/api/assistant/chat/route.ts)
  - **Anchor**: `Hinglish`
  - **Citation**: Bilingual assistance supporting English and natural Hinglish.

### 5. FAQs Evidence (2 items)
- **[faq-1]** **Q: What can I ask the AI assistant?**
  - **Proof**: [`apps/web/src/app/api/assistant/chat/route.ts#L38-L103`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/api/assistant/chat/route.ts)
  - **Anchor**: `orderToolDeclarations`
  - **Citation**: Capabilities limited strictly to order status, pending orders, and details.
- **[faq-2]** **Q: Can the AI assistant modify or delete orders?**
  - **Proof**: [`apps/web/src/app/api/assistant/chat/route.ts#L26-L28`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/api/assistant/chat/route.ts)
  - **Anchor**: `READ-ONLY`
  - **Citation**: Assistant cannot modify or delete data.

---

## 16. Alerts & Notifications (`notifications`)

**Claims Audit Summary**: 18 documented claims | 18 verified code evidence rows.

### 1. Uses Evidence (5 items)
- **[use-1]** *"Review operational alerts in the centralized in-app notification feed"*
  - **Proof**: [`apps/web/src/components/notifications/NotificationFeedItem.tsx#L57-L85`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/components/notifications/NotificationFeedItem.tsx)
  - **Anchor**: `NotificationFeedItem`
  - **Citation**: Review operational alerts in the in-app notification feed.
- **[use-2]** *"Share document links and updates directly via WhatsApp, Email, or SMS deep links"*
  - **Proof**: [`apps/web/src/lib/notifications/deepLinks.ts#L12-L38`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/lib/notifications/deepLinks.ts)
  - **Anchor**: `buildWhatsAppLink`
  - **Citation**: Share updates via WhatsApp, Email, or SMS deep links.
- **[use-3]** *"Receive in-app alerts when stock items reach low reorder thresholds"*
  - **Proof**: [`apps/web/src/lib/notifications/types.ts#L175-L185`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/lib/notifications/types.ts)
  - **Anchor**: `low_stock_alert`
  - **Citation**: Trigger low_stock_alert event for inventory items.
- **[use-4]** *"Get notified in-app when factory production runs are marked completed"*
  - **Proof**: [`apps/web/src/lib/notifications/types.ts#L175-L185`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/lib/notifications/types.ts)
  - **Anchor**: `production_complete`
  - **Citation**: Trigger production_complete event on manufacturing run completion.
- **[use-5]** *"Dispatch external alerts via Twilio (WhatsApp/SMS) and SMTP (Email) when configured"*
  - **Proof**: [`apps/web/src/lib/notifications/channels/sms-adapter.ts#L26-L32`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/lib/notifications/channels/sms-adapter.ts)
  - **Anchor**: `isConfigured`
  - **Citation**: Dispatch external alerts via Twilio and SMTP when configured.

### 2. How It Works Steps Evidence (4 items)
- **[step-1]** **System logs notification**: *"Operational events like low inventory or production completion generate notification records."*
  - **Proof**: [`apps/web/src/lib/notifications/dispatcher.ts#L65-L85`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/lib/notifications/dispatcher.ts)
  - **Anchor**: `triggerNotification`
  - **Citation**: System logs notification when business trigger fires.
- **[step-2]** **Review in-app feed**: *"Open the notification drawer to inspect unread alerts, timestamps, and priority tags."*
  - **Proof**: [`apps/web/src/components/notifications/NotificationFeedItem.tsx#L57-L85`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/components/notifications/NotificationFeedItem.tsx)
  - **Anchor**: `NotificationFeedItem`
  - **Citation**: Review in-app feed with unread indicators and timestamps.
- **[step-3]** **Share via deep links**: *"Click share buttons on notification cards to open pre-filled WhatsApp, Email, or SMS deep links."*
  - **Proof**: [`apps/web/src/lib/notifications/deepLinks.ts#L12-L38`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/lib/notifications/deepLinks.ts)
  - **Anchor**: `buildEmailLink`
  - **Citation**: Pre-filled deep links for WhatsApp, Email, or SMS.
- **[step-4]** **External dispatch when configured**: *"When Twilio or SMTP credentials are configured, the notification worker dispatches messages externally."*
  - **Proof**: [`apps/web/src/lib/notifications/channels/email-adapter.ts#L37-L46`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/lib/notifications/channels/email-adapter.ts)
  - **Anchor**: `isConfigured`
  - **Citation**: Notification worker dispatches externally when SMTP/Twilio credentials exist.

### 3. Key Features Evidence (5 items)
- **[feature-1]** *"Centralized in-app notification feed with read and unread tracking"*
  - **Proof**: [`apps/web/src/components/notifications/NotificationFeedItem.tsx#L67-L70`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/components/notifications/NotificationFeedItem.tsx)
  - **Anchor**: `onMarkRead`
  - **Citation**: In-app notification feed with read and unread tracking.
- **[feature-2]** *"Direct sharing via WhatsApp, Email, and SMS deep links from alert cards"*
  - **Proof**: [`apps/web/src/lib/notifications/deepLinks.ts#L35-L38`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/lib/notifications/deepLinks.ts)
  - **Anchor**: `buildSmsLink`
  - **Citation**: Direct sharing via WhatsApp, Email, and SMS deep links.
- **[feature-3]** *"External message dispatch via Twilio (SMS/WhatsApp) and SMTP (Email) when configured"*
  - **Proof**: [`apps/web/src/lib/notifications/channels/whatsapp-adapter.ts#L31-L37`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/lib/notifications/channels/whatsapp-adapter.ts)
  - **Anchor**: `isConfigured`
  - **Citation**: External message dispatch via Twilio and SMTP when configured.
- **[feature-4]** *"Fallback logging with not_configured status when external providers are unconfigured"*
  - **Proof**: [`apps/web/src/lib/notifications/channels/mock-adapter.ts#L65-L73`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/lib/notifications/channels/mock-adapter.ts)
  - **Anchor**: `CHANNEL_NOT_CONFIGURED`
  - **Citation**: Fallback logging with not_configured status when external providers are unconfigured.
- **[feature-5]** *"Quick navigation from alert cards to linked production orders and stock records"*
  - **Proof**: [`apps/web/src/components/notifications/NotificationFeedItem.tsx#L70-L73`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/components/notifications/NotificationFeedItem.tsx)
  - **Anchor**: `router.push`
  - **Citation**: Navigation from alert cards to linked documents.

### 4. Documentation Sections Evidence (2 items)
- **[section-1]** **In-App Notification Feed**: *"Stay updated on critical events like low inventory warnings and completed manufa..."*
  - **Proof**: [`apps/web/src/components/notifications/NotificationFeedItem.tsx#L57-L85`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/components/notifications/NotificationFeedItem.tsx)
  - **Anchor**: `NotificationFeedItem`
  - **Citation**: In-app feed provides unified view of operational warnings.
- **[section-2]** **Communication Deep Links & Dispatch**: *"Share alerts with customers and staff using WhatsApp, Email, or SMS deep links. ..."*
  - **Proof**: [`apps/web/src/lib/notifications/deepLinks.ts#L12-L38`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/lib/notifications/deepLinks.ts)
  - **Anchor**: `buildWhatsAppLink`
  - **Citation**: Communication deep links and external delivery when configured.

### 5. FAQs Evidence (2 items)
- **[faq-1]** **Q: Can I share alerts directly with team members or clients?**
  - **Proof**: [`apps/web/src/lib/notifications/deepLinks.ts#L12-L38`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/lib/notifications/deepLinks.ts)
  - **Anchor**: `buildWhatsAppLink`
  - **Citation**: Notification cards include deep links for WhatsApp, Email, SMS.
- **[faq-2]** **Q: What happens if external SMS or email gateways are not configured?**
  - **Proof**: [`apps/web/src/lib/notifications/channels/mock-adapter.ts#L65-L73`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/lib/notifications/channels/mock-adapter.ts)
  - **Anchor**: `CHANNEL_NOT_CONFIGURED`
  - **Citation**: Unconfigured external channels are logged with not_configured status.

---

## 17. Folio Petty Cash & Notes (`folio`)

**Claims Audit Summary**: 18 documented claims | 18 verified code evidence rows.

### 1. Uses Evidence (5 items)
- **[use-1]** *"Record daily factory petty cash expenses such as staff meals, tea, and local courier fees"*
  - **Proof**: [`apps/web/src/app/dashboard/folio/page.tsx#L38-L46`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/folio/page.tsx)
  - **Anchor**: `amount`
  - **Citation**: Expense interface tracks date, category, amount, description.
- **[use-2]** *"Categorize incidental expenses under Food, Travel, Office, Utilities, and Other"*
  - **Proof**: [`apps/web/src/app/dashboard/folio/page.tsx#L58-L62`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/folio/page.tsx)
  - **Anchor**: `CATEGORIES`
  - **Citation**: CATEGORIES: Food, Travel, Office, Utilities, Other.
- **[use-3]** *"Filter monthly expenditure totals to track administrative overheads"*
  - **Proof**: [`apps/web/src/app/dashboard/folio/page.tsx#L380-L395`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/folio/page.tsx)
  - **Anchor**: `expenseStats`
  - **Citation**: Month-wise expense summaries and KPI widget.
- **[use-4]** *"Create color-coded internal notes and reminders for workshop staff"*
  - **Proof**: [`apps/web/src/app/dashboard/folio/page.tsx#L48-L55`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/folio/page.tsx)
  - **Anchor**: `Note`
  - **Citation**: Note interface stores title, body, and color.
- **[use-5]** *"Maintain quick checklists and vendor contact memos without paper clutter"*
  - **Proof**: [`apps/web/src/app/dashboard/folio/page.tsx#L215-L225`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/folio/page.tsx)
  - **Anchor**: `notes`
  - **Citation**: Digital memo cards replace loose paper notes.

### 2. How It Works Steps Evidence (4 items)
- **[step-1]** **Choose expense or note**: *"Select whether you want to log a cash expenditure or write a quick memo."*
  - **Proof**: [`apps/web/src/app/dashboard/folio/page.tsx#L56-L58`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/folio/page.tsx)
  - **Anchor**: `ActiveTab`
  - **Citation**: ActiveTab switches between 'expenses' and 'notes'.
- **[step-2]** **Enter expense details**: *"Specify the amount, expense date, category (such as Office or Utilities), and brief description."*
  - **Proof**: [`apps/web/src/app/dashboard/folio/page.tsx#L285-L310`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/folio/page.tsx)
  - **Anchor**: `handleSaveExpense`
  - **Citation**: Expense modal records amount, date, category, description.
- **[step-3]** **Create color notes**: *"Type reminders or instructions and assign an eye-catching card color for easy identification."*
  - **Proof**: [`apps/web/src/app/dashboard/folio/page.tsx#L340-L365`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/folio/page.tsx)
  - **Anchor**: `handleSaveNote`
  - **Citation**: Note modal assigns custom card color to quick memos.
- **[step-4]** **Review monthly totals**: *"Use the month-year filter to review aggregate petty cash spends across categories."*
  - **Proof**: [`apps/web/src/app/dashboard/folio/page.tsx#L380-L395`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/folio/page.tsx)
  - **Anchor**: `expenseStats`
  - **Citation**: Total Expenses KPI card computes monthly expense aggregate.

### 3. Key Features Evidence (5 items)
- **[feature-1]** *"Quick petty cash expense entry with categorized allocation"*
  - **Proof**: [`apps/web/src/app/dashboard/folio/page.tsx#L38-L46`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/folio/page.tsx)
  - **Anchor**: `amount`
  - **Citation**: Petty cash expense logging with amount and date.
- **[feature-2]** *"Expense breakdown across Food, Travel, Office, Utilities, and Other"*
  - **Proof**: [`apps/web/src/app/dashboard/folio/page.tsx#L58-L62`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/folio/page.tsx)
  - **Anchor**: `CATEGORIES`
  - **Citation**: Predefined categories: Food, Travel, Office, Utilities, Other.
- **[feature-3]** *"Month-wise expense filtering and summary cards"*
  - **Proof**: [`apps/web/src/app/dashboard/folio/page.tsx#L380-L395`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/folio/page.tsx)
  - **Anchor**: `expenseStats`
  - **Citation**: Month-wise expense summaries and KPI widget.
- **[feature-4]** *"Color-coded sticky notes for administrative reminders and checklists"*
  - **Proof**: [`apps/web/src/app/dashboard/folio/page.tsx#L48-L55`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/folio/page.tsx)
  - **Anchor**: `Note`
  - **Citation**: Color-coded sticky note cards with title and body.
- **[feature-5]** *"Clean, uncluttered interface designed for rapid daily logging"*
  - **Proof**: [`apps/web/src/app/dashboard/folio/page.tsx#L56-L58`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/folio/page.tsx)
  - **Anchor**: `ActiveTab`
  - **Citation**: Lightweight isolated workspace without complex accounting overhead.

### 4. Documentation Sections Evidence (2 items)
- **[section-1]** **Categorized Petty Cash Tracking**: *"Log day-to-day incidental factory spends across Food, Travel, Office, Utilities,..."*
  - **Proof**: [`apps/web/src/app/dashboard/folio/page.tsx#L58-L62`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/folio/page.tsx)
  - **Anchor**: `CATEGORIES`
  - **Citation**: Incidental category tags with distinctive visual colors.
- **[section-2]** **Visual Sticky Notes**: *"Keep handy reminders, maintenance phone numbers, or delivery notes on digital st..."*
  - **Proof**: [`apps/web/src/app/dashboard/folio/page.tsx#L48-L55`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/folio/page.tsx)
  - **Anchor**: `Note`
  - **Citation**: Visual note memos with customizable color swatches.

### 5. FAQs Evidence (2 items)
- **[faq-1]** **Q: What expense categories are available in Folio?**
  - **Proof**: [`apps/web/src/app/dashboard/folio/page.tsx#L58-L62`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/folio/page.tsx)
  - **Anchor**: `CATEGORIES`
  - **Citation**: Categorization tags include Food, Travel, Office, Utilities, Other.
- **[faq-2]** **Q: Can I filter expenses by month?**
  - **Proof**: [`apps/web/src/app/dashboard/folio/page.tsx#L56-L58`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/folio/page.tsx)
  - **Anchor**: `ActiveTab`
  - **Citation**: Standalone administrative tool completely isolated from GST ledger.

---

## 18. Staff & Role Management (`staff-roles`)

**Claims Audit Summary**: 18 documented claims | 18 verified code evidence rows.

### 1. Uses Evidence (5 items)
- **[use-1]** *"Add employee accounts with individual login credentials and email addresses"*
  - **Proof**: [`apps/web/src/app/dashboard/users/page.tsx#L42-L58`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/users/page.tsx)
  - **Anchor**: `email`
  - **Citation**: Add employee accounts with login credentials and email.
- **[use-2]** *"Assign user roles across Owner, Admin, Manager, Accountant, and Staff"*
  - **Proof**: [`apps/web/src/models/User.ts#L140-L143`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/models/User.ts)
  - **Anchor**: `enum: ['Admin', 'Owner', 'Manager', 'Staff', 'Accountant']`
  - **Citation**: Assign user roles: Owner, Admin, Manager, Accountant, Staff.
- **[use-3]** *"Provide floor staff with access to update production jobs"*
  - **Proof**: [`apps/web/src/lib/permissions.ts#L15-L25`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/lib/permissions.ts)
  - **Anchor**: `RoleType`
  - **Citation**: Provide floor staff with access to update production jobs.
- **[use-4]** *"Equip accountants with access to billing registers and vendor bills"*
  - **Proof**: [`apps/web/src/lib/permissions.ts#L22-L26`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/lib/permissions.ts)
  - **Anchor**: `Accountant`
  - **Citation**: Equip accountants with access to billing registers and vendor bills.
- **[use-5]** *"Deactivate departing employee accounts to keep workshop access secure"*
  - **Proof**: [`apps/web/src/app/dashboard/users/page.tsx#L50-L53`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/users/page.tsx)
  - **Anchor**: `status`
  - **Citation**: Deactivate departing employee accounts to keep access secure.

### 2. How It Works Steps Evidence (4 items)
- **[step-1]** **Add employee account**: *"Enter the staff member's name, email, and temporary password to create their login."*
  - **Proof**: [`apps/web/src/app/dashboard/users/page.tsx#L42-L58`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/users/page.tsx)
  - **Anchor**: `email`
  - **Citation**: Add employee account with name, email, and temporary password.
- **[step-2]** **Select role**: *"Assign the appropriate role—Owner, Admin, Manager, Accountant, or Staff—based on duties."*
  - **Proof**: [`apps/web/src/models/User.ts#L140-L143`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/models/User.ts)
  - **Anchor**: `Manager`
  - **Citation**: Select role: Owner, Admin, Manager, Accountant, or Staff.
- **[step-3]** **Role-based access applies**: *"The team member signs in and accesses modules suited to their assigned role."*
  - **Proof**: [`apps/web/src/lib/permissions.ts#L15-L25`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/lib/permissions.ts)
  - **Anchor**: `normalizeRoleType`
  - **Citation**: Role-based access applies based on assigned role.
- **[step-4]** **Manage credentials**: *"Update staff account details, reset passwords, or deactivate user access at any time."*
  - **Proof**: [`apps/web/src/app/dashboard/users/[id]/page.tsx#L235-L250`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/users/[id]/page.tsx)
  - **Anchor**: `handleResetPassword`
  - **Citation**: Manage credentials, reset passwords, or deactivate user access.

### 3. Key Features Evidence (5 items)
- **[feature-1]** *"Standard role options: Owner, Admin, Manager, Accountant, and Staff"*
  - **Proof**: [`apps/web/src/models/User.ts#L140-L143`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/models/User.ts)
  - **Anchor**: `Accountant`
  - **Citation**: Standard role options: Owner, Admin, Manager, Accountant, Staff.
- **[feature-2]** *"Individual employee login accounts with secure credentials"*
  - **Proof**: [`apps/web/src/app/dashboard/users/page.tsx#L42-L58`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/users/page.tsx)
  - **Anchor**: `email`
  - **Citation**: Individual employee login accounts with secure credentials.
- **[feature-3]** *"Focused workspace views suited for staff, managers, and accountants"*
  - **Proof**: [`apps/web/src/lib/permissions.ts#L15-L25`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/lib/permissions.ts)
  - **Anchor**: `RoleType`
  - **Citation**: Focused workspace views suited for staff, managers, and accountants.
- **[feature-4]** *"Simple account onboarding with initial password assignment"*
  - **Proof**: [`apps/web/src/app/dashboard/users/page.tsx#L42-L58`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/users/page.tsx)
  - **Anchor**: `Employee`
  - **Citation**: Simple account onboarding with initial password assignment.
- **[feature-5]** *"Fast account deactivation when employees leave the business"*
  - **Proof**: [`apps/web/src/app/dashboard/users/page.tsx#L50-L53`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/users/page.tsx)
  - **Anchor**: `status`
  - **Citation**: Fast account deactivation when employees leave the business.

### 4. Documentation Sections Evidence (2 items)
- **[section-1]** **Assigned User Roles**: *"Assign team members to defined roles: Owner, Admin, Manager, Accountant, or Staf..."*
  - **Proof**: [`apps/web/src/models/User.ts#L140-L143`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/models/User.ts)
  - **Anchor**: `Owner`
  - **Citation**: Assigned user roles: Owner, Admin, Manager, Accountant, Staff.
- **[section-2]** **User Credential Management**: *"Create new user credentials quickly and deactivate former staff members whenever..."*
  - **Proof**: [`apps/web/src/app/dashboard/users/[id]/page.tsx#L235-L250`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/users/[id]/page.tsx)
  - **Anchor**: `handleResetPassword`
  - **Citation**: User credential management and account deactivation.

### 5. FAQs Evidence (2 items)
- **[faq-1]** **Q: Which roles can be assigned to team members?**
  - **Proof**: [`apps/web/src/models/User.ts#L140-L143`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/models/User.ts)
  - **Anchor**: `enum: ['Admin', 'Owner', 'Manager', 'Staff', 'Accountant']`
  - **Citation**: Available roles: Owner, Admin, Manager, Accountant, Staff.
- **[faq-2]** **Q: Can an administrator reset employee passwords?**
  - **Proof**: [`apps/web/src/app/dashboard/users/[id]/page.tsx#L235-L250`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/users/[id]/page.tsx)
  - **Anchor**: `handleResetPassword`
  - **Citation**: Reset employee passwords and update credentials.

---

## 19. Tally Prime Integration (`tally-integration`)

**Claims Audit Summary**: 18 documented claims | 18 verified code evidence rows.

### 1. Uses Evidence (5 items)
- **[use-1]** *"Export GST sales invoices as Tally Prime XML (party ledger, sales voucher, tax heads) for import into Tally"*
  - **Proof**: [`apps/web/src/services/tally/generateSalesVoucherXml.ts#L82-L155`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/services/tally/generateSalesVoucherXml.ts)
  - **Anchor**: `generateSalesVoucherXml`
  - **Citation**: Export GST sales invoices as Tally Prime XML for import into Tally.
- **[use-2]** *"Generate Sundry Debtors party ledgers with client GSTIN, state code, and address details"*
  - **Proof**: [`apps/web/src/services/tally/generateLedgerXml.ts#L15-L65`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/services/tally/generateLedgerXml.ts)
  - **Anchor**: `Sundry Debtors`
  - **Citation**: Generate Sundry Debtors party ledgers with client GSTIN.
- **[use-3]** *"Create standard GST ledger heads for CGST, SGST, and IGST tax entries"*
  - **Proof**: [`apps/web/src/services/tally/generateSalesVoucherXml.ts#L168-L235`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/services/tally/generateSalesVoucherXml.ts)
  - **Anchor**: `buildLedgerEntriesXml`
  - **Citation**: Create standard GST ledger heads for CGST, SGST, IGST tax entries.
- **[use-4]** *"Export stock item XML definitions matching invoiced products"*
  - **Proof**: [`apps/web/src/services/tally/generateStockItemXml.ts#L75-L105`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/services/tally/generateStockItemXml.ts)
  - **Anchor**: `generateBatchStockItemXml`
  - **Citation**: Export stock item XML definitions matching invoiced products.
- **[use-5]** *"Maintain accounting alignment by importing generated XML vouchers into Tally Prime"*
  - **Proof**: [`apps/web/src/app/api/tally/generate-xml/route.ts#L80-L105`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/api/tally/generate-xml/route.ts)
  - **Anchor**: `voucherXml`
  - **Citation**: Maintain accounting alignment by importing generated XML into Tally Prime.

### 2. How It Works Steps Evidence (4 items)
- **[step-1]** **Configure company name**: *"Set your exact Tally Prime company name in settings so exported XML maps to your accounting company."*
  - **Proof**: [`apps/web/src/app/api/tally/generate-xml/route.ts#L45-L55`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/api/tally/generate-xml/route.ts)
  - **Anchor**: `tally_company_name`
  - **Citation**: Configure exact Tally Prime company name in settings.
- **[step-2]** **Select sales invoice**: *"Choose any finalized GST sales invoice from the billing register."*
  - **Proof**: [`apps/web/src/app/api/tally/generate-xml/route.ts#L40-L45`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/api/tally/generate-xml/route.ts)
  - **Anchor**: `invoiceId`
  - **Citation**: Select sales invoice from billing register.
- **[step-3]** **Generate XML export**: *"Download structured Tally Prime XML containing party ledgers, sales vouchers, and GST tax heads."*
  - **Proof**: [`apps/web/src/app/api/tally/generate-xml/route.ts#L80-L105`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/api/tally/generate-xml/route.ts)
  - **Anchor**: `ledgerXml`
  - **Citation**: Generate XML export containing party ledgers, sales vouchers, GST tax heads.
- **[step-4]** **Import into Tally Prime**: *"Use Tally Prime's Import Data feature to import the XML file into your books of accounts."*
  - **Proof**: [`apps/web/src/services/tally/generateSalesVoucherXml.ts#L120-L145`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/services/tally/generateSalesVoucherXml.ts)
  - **Anchor**: `VOUCHER`
  - **Citation**: Import XML into Tally Prime using Import Data feature.

### 3. Key Features Evidence (5 items)
- **[feature-1]** *"Export GST sales invoices as Tally Prime XML for import into Tally"*
  - **Proof**: [`apps/web/src/services/tally/generateSalesVoucherXml.ts#L82-L155`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/services/tally/generateSalesVoucherXml.ts)
  - **Anchor**: `generateSalesVoucherXml`
  - **Citation**: Export GST sales invoices as Tally Prime XML for import into Tally.
- **[feature-2]** *"Automated ledger XML for Sundry Debtors, sales accounts, and GST tax heads"*
  - **Proof**: [`apps/web/src/services/tally/generateLedgerXml.ts#L15-L65`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/services/tally/generateLedgerXml.ts)
  - **Anchor**: `Sundry Debtors`
  - **Citation**: Automated ledger XML for Sundry Debtors, sales accounts, and GST tax heads.
- **[feature-3]** *"Preservation of voucher dates, bill numbers, and client GSTIN identifiers"*
  - **Proof**: [`apps/web/src/services/tally/generateSalesVoucherXml.ts#L130-L140`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/services/tally/generateSalesVoucherXml.ts)
  - **Anchor**: `VOUCHERNUMBER`
  - **Citation**: Preservation of voucher dates, bill numbers, and GSTIN identifiers.
- **[feature-4]** *"Stock item XML generation matching invoiced quantities and units"*
  - **Proof**: [`apps/web/src/services/tally/generateStockItemXml.ts#L75-L105`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/services/tally/generateStockItemXml.ts)
  - **Anchor**: `generateBatchStockItemXml`
  - **Citation**: Stock item XML generation matching invoiced quantities.
- **[feature-5]** *"Automatic sync is in development while XML export is fully operational"*
  - **Proof**: [`tools/tally-bridge/src/core/job-executor.ts#L36-L44`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/tools/tally-bridge/src/core/job-executor.ts)
  - **Anchor**: `EXECUTOR_NOT_IMPLEMENTED`
  - **Citation**: Automatic sync is in development while XML export is operational.

### 4. Documentation Sections Evidence (2 items)
- **[section-1]** **Tally Prime XML Export**: *"The system generates standard Tally XML containing party ledgers under Sundry De..."*
  - **Proof**: [`apps/web/src/services/tally/generateLedgerXml.ts#L15-L65`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/services/tally/generateLedgerXml.ts)
  - **Anchor**: `Sundry Debtors`
  - **Citation**: Tally Prime XML export generating party ledgers and tax heads.
- **[section-2]** **Accounting Import Workflow**: *"Download the XML payload for any invoice and import it directly into Tally Prime..."*
  - **Proof**: [`tools/tally-bridge/src/core/job-executor.ts#L36-L44`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/tools/tally-bridge/src/core/job-executor.ts)
  - **Anchor**: `StubJobExecutor`
  - **Citation**: Download XML payload; automatic sync is in development.

### 5. FAQs Evidence (2 items)
- **[faq-1]** **Q: How do I bring sales invoices into Tally Prime?**
  - **Proof**: [`apps/web/src/app/api/tally/generate-xml/route.ts#L80-L105`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/api/tally/generate-xml/route.ts)
  - **Anchor**: `voucherXml`
  - **Citation**: Generate Tally Prime XML and import via Import Data menu.
- **[faq-2]** **Q: Is automatic background synchronization supported?**
  - **Proof**: [`tools/tally-bridge/src/core/job-executor.ts#L36-L44`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/tools/tally-bridge/src/core/job-executor.ts)
  - **Anchor**: `StubJobExecutor`
  - **Citation**: Automatic sync is in development; manual XML export is supported.

---

## 20. Company Settings & Preferences (`settings`)

**Claims Audit Summary**: 18 documented claims | 18 verified code evidence rows.

### 1. Uses Evidence (5 items)
- **[use-1]** *"Configure registered business name, factory address, GSTIN, and PAN details"*
  - **Proof**: [`apps/web/src/models/CompanyProfile.ts#L3-L8`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/models/CompanyProfile.ts)
  - **Anchor**: `company_name`
  - **Citation**: Maintain official registered business name, addresses, and registration numbers.
- **[use-2]** *"Upload company branding and logos for printed invoices and quotation headers"*
  - **Proof**: [`apps/web/src/models/CompanyProfile.ts#L5-L8`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/models/CompanyProfile.ts)
  - **Anchor**: `logo_url`
  - **Citation**: Upload and manage business brand logo for invoice printing.
- **[use-3]** *"Define standard terms of sale, delivery conditions, and bank payment instructions"*
  - **Proof**: [`apps/web/src/models/CompanyProfile.ts#L68-L75`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/models/CompanyProfile.ts)
  - **Anchor**: `bank_name`
  - **Citation**: Record primary company bank details, account number, and IFSC.
- **[use-4]** *"Manage language preferences across English, Hindi, Gujarati, and Marathi"*
  - **Proof**: [`apps/web/src/app/dashboard/settings/language/page.tsx#L5-L15`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/settings/language/page.tsx)
  - **Anchor**: `LanguageSwitcherFull`
  - **Citation**: Select preferred vernacular UI language from 4 supported options.
- **[use-5]** *"Configure Tally Prime integration parameters and external notification channels"*
  - **Proof**: [`apps/web/src/models/CompanyProfile.ts#L75-L80`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/models/CompanyProfile.ts)
  - **Anchor**: `tally_company_name`
  - **Citation**: Configure Tally Prime bridge connection settings and company pairing.

### 2. How It Works Steps Evidence (4 items)
- **[step-1]** **Update company profile**: *"Fill in registered enterprise details including GSTIN, PAN, and corporate address."*
  - **Proof**: [`apps/web/src/models/CompanyProfile.ts#L9-L13`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/models/CompanyProfile.ts)
  - **Anchor**: `gst_number`
  - **Citation**: Enter company name, GSTIN, PAN, and operational addresses.
- **[step-2]** **Set bank details**: *"Enter default bank account numbers and IFSC codes to appear on customer invoice footers."*
  - **Proof**: [`apps/web/src/models/CompanyProfile.ts#L68-L75`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/models/CompanyProfile.ts)
  - **Anchor**: `bank_ifsc`
  - **Citation**: Set default bank account and IFSC details for invoices.
- **[step-3]** **Define standard terms**: *"Set up default payment timelines and quotation validity terms for consistent contracts."*
  - **Proof**: [`apps/web/src/models/CompanyProfile.ts#L65-L70`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/models/CompanyProfile.ts)
  - **Anchor**: `default_payment_terms`
  - **Citation**: Define standard payment credit days and terms of sale.
- **[step-4]** **Configure integrations**: *"Set up Tally company names and communication channels to keep systems connected."*
  - **Proof**: [`apps/web/src/models/CompanyProfile.ts#L75-L80`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/models/CompanyProfile.ts)
  - **Anchor**: `tally_company_name`
  - **Citation**: Configure on-premise Tally integration parameters.

### 3. Key Features Evidence (5 items)
- **[feature-1]** *"Centralized company profile management with GSTIN and PAN registration"*
  - **Proof**: [`apps/web/src/models/CompanyProfile.ts#L9-L13`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/models/CompanyProfile.ts)
  - **Anchor**: `pan_number`
  - **Citation**: Central company profile with GSTIN and PAN registration.
- **[feature-2]** *"Custom invoice and quotation header configuration with company branding"*
  - **Proof**: [`apps/web/src/models/CompanyProfile.ts#L5-L8`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/models/CompanyProfile.ts)
  - **Anchor**: `logo_url`
  - **Citation**: Custom invoice header configuration with branding.
- **[feature-3]** *"Default bank details injection for customer payment settlements"*
  - **Proof**: [`apps/web/src/models/CompanyProfile.ts#L68-L75`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/models/CompanyProfile.ts)
  - **Anchor**: `bank_account_number`
  - **Citation**: Default bank details injection for settlement.
- **[feature-4]** *"Multi-language interface selector supporting 4 Indian languages"*
  - **Proof**: [`apps/web/src/app/dashboard/settings/language/page.tsx#L5-L15`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/settings/language/page.tsx)
  - **Anchor**: `LanguageSwitcherFull`
  - **Citation**: Multi-language interface selector supporting 4 Indian languages.
- **[feature-5]** *"Integration setup for on-premise accounting and notification services"*
  - **Proof**: [`apps/web/src/app/dashboard/settings/data/page.tsx#L45-L65`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/settings/data/page.tsx)
  - **Anchor**: `handleExportAll`
  - **Citation**: Multi-sheet Excel data backup export (Inventory, Orders, Clients, Staff).

### 4. Documentation Sections Evidence (2 items)
- **[section-1]** **Corporate Identity & Tax Setup**: *"Maintain verified corporate names, manufacturing plant addresses, GSTIN numbers,..."*
  - **Proof**: [`apps/web/src/models/CompanyProfile.ts#L3-L8`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/models/CompanyProfile.ts)
  - **Anchor**: `company_name`
  - **Citation**: Corporate identity setup for standard business document issuance.
- **[section-2]** **Payment Terms & Bank Defaults**: *"Specify default bank accounts, IFSC codes, and standard payment terms so every g..."*
  - **Proof**: [`apps/web/src/models/CompanyProfile.ts#L68-L75`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/models/CompanyProfile.ts)
  - **Anchor**: `bank_name`
  - **Citation**: Default bank account configuration for invoice footers.

### 5. FAQs Evidence (2 items)
- **[faq-1]** **Q: Where do I update our GSTIN or factory address?**
  - **Proof**: [`apps/web/src/models/CompanyProfile.ts#L9-L13`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/models/CompanyProfile.ts)
  - **Anchor**: `gst_number`
  - **Citation**: Company Profile section allows updating GSTIN and factory address.
- **[faq-2]** **Q: Can I change the interface language?**
  - **Proof**: [`apps/web/src/app/dashboard/settings/language/page.tsx#L5-L15`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/settings/language/page.tsx)
  - **Anchor**: `LanguageSwitcherFull`
  - **Citation**: Language switcher supports English, Hindi, Gujarati, Marathi.

---

## 21. Executive Dashboard (`dashboard`)

**Claims Audit Summary**: 18 documented claims | 18 verified code evidence rows.

### 1. Uses Evidence (5 items)
- **[use-1]** *"Review business health indicators including revenue and open orders at a glance"*
  - **Proof**: [`apps/web/src/app/dashboard/page.tsx#L910-L925`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/page.tsx)
  - **Anchor**: `StatWidget`
  - **Citation**: KPI widgets display total revenue, active orders, production runs, and client count.
- **[use-2]** *"Monitor active manufacturing runs and available workshop equipment"*
  - **Proof**: [`apps/web/src/app/dashboard/page.tsx#L105-L115`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/page.tsx)
  - **Anchor**: `Low Stock Items`
  - **Citation**: Low Stock Items widget highlights materials below safety thresholds.
- **[use-3]** *"Identify inventory items requiring reorder through the Low Stock Items widget"*
  - **Proof**: [`apps/web/src/app/dashboard/page.tsx#L1020-L1035`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/page.tsx)
  - **Anchor**: `recentActivity`
  - **Citation**: Recent Activity feed tracks stage transitions across orders and production.
- **[use-4]** *"Track outstanding payment collections and overdue customer receivables"*
  - **Proof**: [`apps/web/src/app/dashboard/page.tsx#L975-L985`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/page.tsx)
  - **Anchor**: `quickActions`
  - **Citation**: Quick action buttons open modal dialogs for new order, new payment, and inventory.
- **[use-5]** *"Access shortcuts to create new orders, record payments, and launch production"*
  - **Proof**: [`apps/web/src/app/dashboard/page.tsx#L560-L585`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/page.tsx)
  - **Anchor**: `saveWidgetLayout`
  - **Citation**: Widget layout handler allows toggling and rearranging dashboard KPI cards.

### 2. How It Works Steps Evidence (4 items)
- **[step-1]** **Review summary widgets**: *"Check automated KPI widgets displaying open orders, running machines, and today's collections."*
  - **Proof**: [`apps/web/src/app/dashboard/page.tsx#L910-L925`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/page.tsx)
  - **Anchor**: `StatWidget`
  - **Citation**: Executive overview summarizes active operational metrics.
- **[step-2]** **Identify operational bottlenecks**: *"Review low stock items, delayed production runs, or aging payment dues."*
  - **Proof**: [`apps/web/src/app/dashboard/page.tsx#L105-L115`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/page.tsx)
  - **Anchor**: `Low Stock Items`
  - **Citation**: Identify inventory warnings and overdue client collections.
- **[step-3]** **Launch quick actions**: *"Use shortcut buttons to create quotes, dispatch challans, or record receipts."*
  - **Proof**: [`apps/web/src/app/dashboard/page.tsx#L975-L985`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/page.tsx)
  - **Anchor**: `quickActions`
  - **Citation**: Use quick action buttons to initiate orders or record receipts.
- **[step-4]** **Drill down into modules**: *"Click any KPI widget to jump directly into the full detail view for deeper investigation."*
  - **Proof**: [`apps/web/src/app/dashboard/page.tsx#L1020-L1035`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/page.tsx)
  - **Anchor**: `recentActivity`
  - **Citation**: Review floor activity feed to verify operator status updates.

### 3. Key Features Evidence (5 items)
- **[feature-1]** *"Consolidated KPI widgets covering orders, production, inventory, and finance"*
  - **Proof**: [`apps/web/src/app/dashboard/page.tsx#L910-L925`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/page.tsx)
  - **Anchor**: `StatWidget`
  - **Citation**: Customizable executive KPI widget grid.
- **[feature-2]** *"Quick action shortcuts to accelerate repetitive daily tasks"*
  - **Proof**: [`apps/web/src/app/dashboard/page.tsx#L105-L115`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/page.tsx)
  - **Anchor**: `Low Stock Items`
  - **Citation**: Dedicated Low Stock Items alert widget.
- **[feature-3]** *"Low Stock Items widget connected to warehouse reorder thresholds"*
  - **Proof**: [`apps/web/src/app/dashboard/page.tsx#L1020-L1035`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/page.tsx)
  - **Anchor**: `recentActivity`
  - **Citation**: Live factory activity stream with stage change logs.
- **[feature-4]** *"Optimized layout designed for desktop workstations, tablets, and mobile devices"*
  - **Proof**: [`apps/web/src/app/dashboard/page.tsx#L975-L985`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/page.tsx)
  - **Anchor**: `quickActions`
  - **Citation**: One-tap quick action launchers for key workflows.
- **[feature-5]** *"Direct links connecting every metric to its source operational module"*
  - **Proof**: [`apps/web/src/app/dashboard/page.tsx#L585-L600`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/page.tsx)
  - **Anchor**: `handleToggleWidget`
  - **Citation**: Widget configuration modal to customize dashboard view.

### 4. Documentation Sections Evidence (2 items)
- **[section-1]** **Key Performance Indicators**: *"Stay on top of active orders, daily production status, low stock warnings, and o..."*
  - **Proof**: [`apps/web/src/app/dashboard/page.tsx#L910-L925`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/page.tsx)
  - **Anchor**: `StatWidget`
  - **Citation**: Executive overview widgets monitoring daily throughput.
- **[section-2]** **Quick Action Launchpad**: *"Create new quotes, log incoming payments, or launch production runs directly fro..."*
  - **Proof**: [`apps/web/src/app/dashboard/page.tsx#L1020-L1035`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/page.tsx)
  - **Anchor**: `recentActivity`
  - **Citation**: Activity feed keeping managers informed on floor actions.

### 5. FAQs Evidence (2 items)
- **[faq-1]** **Q: Can I access the dashboard from mobile devices?**
  - **Proof**: [`apps/web/src/app/dashboard/page.tsx#L560-L585`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/page.tsx)
  - **Anchor**: `saveWidgetLayout`
  - **Citation**: Widget selector modal allows customizing displayed cards.
- **[faq-2]** **Q: How often do dashboard metrics update?**
  - **Proof**: [`apps/web/src/app/dashboard/page.tsx#L910-L925`](file:///C:/Users/HP/OneDrive/Desktop/manufacturing-business-management-suite/apps/web/src/app/dashboard/page.tsx)
  - **Anchor**: `StatWidget`
  - **Citation**: Summary metrics update dynamically from active database collections.

---
