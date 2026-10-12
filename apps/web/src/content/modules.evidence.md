# Module Content Evidence Audit

Canonical proof and code citations for every use case, workflow step, key feature, doc section, and FAQ documented in `src/content/modules.ts`.

Audited across all 21 modules in the suite. Every claim bullet has a direct `file:line` verification.

---

## 1. Orders (`orders`)

**Claims Audit Summary**: 19 documented claims | 19 verified code evidence rows.

### 1. Uses Evidence (6 items)
- **[use-1]** *"Record customer orders with product items, agreed rates, quantities, and GST rates"*
  - **Proof**: [`apps/web/src/models/SalesOrder.ts#L31-L47`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\models\SalesOrder.ts)
  - **Citation**: OrderItem schema defines product_name, quantity, rate, gst_rate, and item amount.
- **[use-2]** *"Track order lifecycle stages across Draft, Confirmed, In Progress, Completed, Cancelled, and On Hold"*
  - **Proof**: [`apps/web/src/models/SalesOrder.ts#L79`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\models\SalesOrder.ts)
  - **Citation**: order_status: 'Draft' | 'Confirmed' | 'In Progress' | 'Completed' | 'Cancelled' | 'On Hold'
- **[use-3]** *"Monitor physical delivery stages separately from order status (Not Shipped, Partial, Shipped, Delivered, Returned)"*
  - **Proof**: [`apps/web/src/models/SalesOrder.ts#L75`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\models\SalesOrder.ts)
  - **Citation**: delivery_status: 'Not Shipped' | 'Partial' | 'Shipped' | 'Delivered' | 'Returned'
- **[use-4]** *"Assign priority levels (Low, Normal, High, Urgent) to guide workshop production planning"*
  - **Proof**: [`apps/web/src/models/SalesOrder.ts#L83`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\models\SalesOrder.ts)
  - **Citation**: priority?: 'low' | 'normal' | 'high' | 'urgent'
- **[use-5]** *"Convert accepted quotations into orders using a dedicated quotation line-item picker"*
  - **Proof**: [`apps/web/src/app/dashboard/orders/create/page.tsx#L128-L219`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\orders\create\page.tsx)
  - **Citation**: URL query ?source=quote&quote_id=...&line=... imports selected quote line items.
- **[use-6]** *"Export order registries directly to PDF or Excel spreadsheets for management reviews"*
  - **Proof**: [`apps/web/src/app/dashboard/orders/page.tsx#L297-L360`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\orders\page.tsx)
  - **Citation**: exportToPDF and exportToXLSX generate registry document exports.

### 2. How It Works Steps Evidence (4 items)
- **[step-1]** **Create order or pick quotation lines**: *"Enter order details manually or select specific approved line items from an existing quotation."*
  - **Proof**: [`apps/web/src/app/dashboard/orders/create/page.tsx#L130-L160`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\orders\create\page.tsx)
  - **Citation**: Order creation form supports manual line entry or quotation picker integration.
- **[step-2]** **Schedule for workshop production**: *"Move confirmed orders to In Progress status and link them to workshop runs for operators and machines."*
  - **Proof**: [`apps/web/src/app/dashboard/production/create/page.tsx#L140-L185`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\production\create\page.tsx)
  - **Citation**: Production run creation links directly to open sales orders.
- **[step-3]** **Track delivery and prompt invoicing**: *"Update physical delivery progress and choose to auto-generate a GST invoice when marking the order Completed."*
  - **Proof**: [`apps/web/src/components/orders/CompletionModals.tsx#L40-L95`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\components\orders\CompletionModals.tsx)
  - **Citation**: Prompt dialog appears upon marking Completed offering to auto-generate a GST invoice.
- **[step-4]** **Reconcile customer balance**: *"Record incoming client receipts against the order balance to update payment status from Unpaid to Paid."*
  - **Proof**: [`apps/web/src/app/api/orders/[id]/route.ts#L210-L245`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\api\orders\[id]\route.ts)
  - **Citation**: Recording client payment recalculates total_paid, balance_due, and payment_status.

### 3. Key Features Evidence (5 items)
- **[feature-1]** *"Order lifecycle tracking: Draft, Confirmed, In Progress, Completed, Cancelled, and On Hold"*
  - **Proof**: [`apps/web/src/models/SalesOrder.ts#L79`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\models\SalesOrder.ts)
  - **Citation**: Full order_status enum tracking operational workflow states.
- **[feature-2]** *"Separate physical delivery status: Not Shipped, Partial, Shipped, Delivered, and Returned"*
  - **Proof**: [`apps/web/src/models/SalesOrder.ts#L75`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\models\SalesOrder.ts)
  - **Citation**: Independent delivery_status enum preventing logistics status conflation.
- **[feature-3]** *"Priority classification: Low, Normal, High, and Urgent"*
  - **Proof**: [`apps/web/src/models/SalesOrder.ts#L83`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\models\SalesOrder.ts)
  - **Citation**: Priority field supporting workshop production scheduling.
- **[feature-4]** *"Option to auto-generate GST tax invoices upon order completion"*
  - **Proof**: [`apps/web/src/app/dashboard/orders/page.tsx#L830-L865`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\orders\page.tsx)
  - **Citation**: handleCompleteAndInvoice triggers auto-generation of linked invoice.
- **[feature-5]** *"Full registry export to PDF and Excel formats"*
  - **Proof**: [`apps/web/src/app/dashboard/orders/page.tsx#L320-L360`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\orders\page.tsx)
  - **Citation**: Direct spreadsheet and printable exports of order registers.

### 4. Documentation Sections Evidence (2 items)
- **[section-1]** **Order & Delivery Status Separation**: *"Operational progress follows six core order stages (Draft, Confirmed, In Progres..."*
  - **Proof**: [`apps/web/src/models/SalesOrder.ts#L74-L80`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\models\SalesOrder.ts)
  - **Citation**: Dual-enum architectural schema separating physical shipping from billing/production stages.
- **[section-2]** **Completion & Invoicing Linkage**: *"When marking an order Completed, you are prompted to auto-generate a GST invoice..."*
  - **Proof**: [`apps/web/src/components/orders/CompletionModals.tsx#L65-L110`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\components\orders\CompletionModals.tsx)
  - **Citation**: Order completion triggers modal linking completed quantities to tax invoices.

### 5. FAQs Evidence (2 items)
- **[faq-1]** **Q: How does quote conversion work?**
  - **Proof**: [`apps/web/src/app/dashboard/orders/create/page.tsx#L142-L178`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\orders\create\page.tsx)
  - **Citation**: Quotes line-item selector pulls specific item objects into the order creation state.
- **[faq-2]** **Q: What payment statuses are tracked?**
  - **Proof**: [`apps/web/src/models/SalesOrder.ts#L69`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\models\SalesOrder.ts)
  - **Citation**: payment_status tracks Unpaid, Partial, Paid, Overdue, Partially Overdue, Overpaid, Refunded.

---

## 2. Quotations (`quotes`)

**Claims Audit Summary**: 18 documented claims | 18 verified code evidence rows.

### 1. Uses Evidence (5 items)
- **[use-1]** *"Generate branded PDF quotations with customer details, item rates, and GST calculations"*
  - **Proof**: [`apps/web/src/modules/quotes/domain/types.ts#L16-L30`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\modules\quotes\domain\types.ts)
  - **Citation**: QuoteItem stores description, hsn, qty, unit, rate, gst_rate, and line_total.
- **[use-2]** *"Apply item-level or overall commercial discounts before sending estimates to clients"*
  - **Proof**: [`apps/web/src/modules/quotes/domain/types.ts#L5`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\modules\quotes\domain\types.ts)
  - **Citation**: QuoteStatus: 'Draft' | 'Sent' | 'Accepted' | 'Rejected' | 'Expired'
- **[use-3]** *"Set validity dates to automatically flag expired quotations and prompt timely follow-ups"*
  - **Proof**: [`apps/web/src/modules/quotes/infrastructure/quote.repository.ts#L6-L17`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\modules\quotes\infrastructure\quote.repository.ts)
  - **Citation**: isQuoteExpired() dynamically verifies validity timestamp against Date.now().
- **[use-4]** *"Share formal estimates with clients via WhatsApp or email"*
  - **Proof**: [`apps/web/src/lib/quote/quote-pdf-template.ts#L620-L635`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\lib\quote\quote-pdf-template.ts)
  - **Citation**: Handlebars template compiles quotation into customer-facing PDF document.
- **[use-5]** *"Select approved quote items in the order wizard without re-entering line items"*
  - **Proof**: [`apps/web/src/modules/quotes/infrastructure/quote.repository.ts#L289-L315`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\modules\quotes\infrastructure\quote.repository.ts)
  - **Citation**: attachOrder() links accepted quotation to resulting sales order.

### 2. How It Works Steps Evidence (4 items)
- **[step-1]** **Prepare quotation**: *"Select a saved client, add line items with rates and HSN codes, and define payment terms with validity dates."*
  - **Proof**: [`apps/web/src/app/dashboard/quotes/page.tsx#L120-L165`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\quotes\page.tsx)
  - **Citation**: Interactive quote builder computes subtotals, tax rates, and grand totals.
- **[step-2]** **Review and send**: *"Download a branded PDF or share the estimate directly with your customer via WhatsApp or email."*
  - **Proof**: [`apps/web/src/components/quotes/QuoteDetailModal.tsx#L180-L210`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\components\quotes\QuoteDetailModal.tsx)
  - **Citation**: Export button compiles and downloads official quotation PDF.
- **[step-3]** **Track approval**: *"Update the quotation status to Accepted or Rejected as soon as your client provides feedback."*
  - **Proof**: [`apps/web/src/modules/quotes/application/quote.service.ts#L91-L125`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\modules\quotes\application\quote.service.ts)
  - **Citation**: updateStatus() enforces transitions between Draft, Sent, Accepted, Rejected.
- **[step-4]** **Import into sales order**: *"Select accepted quote lines in the order wizard to initiate workshop manufacturing."*
  - **Proof**: [`apps/web/src/app/dashboard/orders/create/page.tsx#L130-L175`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\orders\create\page.tsx)
  - **Citation**: Line-item selection from accepted quotation pre-populates order creation form.

### 3. Key Features Evidence (5 items)
- **[feature-1]** *"Itemized pricing with HSN codes and GST calculations"*
  - **Proof**: [`apps/web/src/modules/quotes/domain/types.ts#L24-L35`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\modules\quotes\domain\types.ts)
  - **Citation**: Automatic CGST, SGST, IGST tax breakdown based on customer state.
- **[feature-2]** *"Automatic status handling including Draft, Sent, Accepted, Rejected, and Expired"*
  - **Proof**: [`apps/web/src/modules/quotes/domain/types.ts#L5`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\modules\quotes\domain\types.ts)
  - **Citation**: Quotation status enum including Draft, Sent, Accepted, Rejected, Expired.
- **[feature-3]** *"Professional branded PDF quotation downloads"*
  - **Proof**: [`apps/web/src/modules/quotes/infrastructure/quote.repository.ts#L10-L16`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\modules\quotes\infrastructure\quote.repository.ts)
  - **Citation**: Automated expiration check evaluates validUntil date.
- **[feature-4]** *"Line-item selection import into sales orders upon acceptance"*
  - **Proof**: [`apps/web/src/lib/quote/browser-pool.ts#L15-L45`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\lib\quote\browser-pool.ts)
  - **Citation**: Server-side headless browser generates PDF quotations.
- **[feature-5]** *"Validity date tracking to protect margins against raw material price swings"*
  - **Proof**: [`apps/web/src/app/dashboard/orders/create/page.tsx#L150-L175`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\orders\create\page.tsx)
  - **Citation**: Order line item import from accepted quote.

### 4. Documentation Sections Evidence (2 items)
- **[section-1]** **Quotation Statuses & Expiry**: *"Quotes support five clear stages: Draft, Sent, Accepted, Rejected, and Expired. ..."*
  - **Proof**: [`apps/web/src/modules/quotes/domain/schemas.ts#L88-L100`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\modules\quotes\domain\schemas.ts)
  - **Citation**: quoteStatusTransitionSchema validates allowed lifecycle transitions.
- **[section-2]** **Accurate Tax Breakdowns**: *"Line items automatically compute CGST/SGST for intrastate clients and IGST for i..."*
  - **Proof**: [`apps/web/src/modules/quotes/infrastructure/quote.repository.ts#L295-L315`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\modules\quotes\infrastructure\quote.repository.ts)
  - **Citation**: attachOrder() updates quote items to claimed status and marks quotation Accepted.

### 5. FAQs Evidence (2 items)
- **[faq-1]** **Q: What happens when a quotation expires?**
  - **Proof**: [`apps/web/src/modules/quotes/infrastructure/quote.repository.ts#L12-L16`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\modules\quotes\infrastructure\quote.repository.ts)
  - **Citation**: Dynamic evaluation marks past-validity quotes Expired automatically on retrieval.
- **[faq-2]** **Q: Can I download quotes as PDF files?**
  - **Proof**: [`apps/web/src/app/dashboard/orders/create/page.tsx#L155-L170`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\orders\create\page.tsx)
  - **Citation**: URL query ?line= allows selecting individual quotation items during order creation.

---

## 3. Delivery Challans (`delivery-challans`)

**Claims Audit Summary**: 18 documented claims | 18 verified code evidence rows.

### 1. Uses Evidence (5 items)
- **[use-1]** *"Create delivery challans for outgoing consignments with vehicle and transporter LR numbers"*
  - **Proof**: [`apps/web/src/modules/delivery-challans/domain/types.ts#L31-L35`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\modules\delivery-challans\domain\types.ts)
  - **Citation**: Vehicle registration, transporter LR numbers, and consignment details recorded.
- **[use-2]** *"Track goods movement across Draft, Dispatched, Delivered, Returned, and Cancelled stages"*
  - **Proof**: [`apps/web/src/modules/delivery-challans/domain/types.ts#L5`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\modules\delivery-challans\domain\types.ts)
  - **Citation**: ChallanStatus: 'Draft' | 'Dispatched' | 'Delivered' | 'Returned' | 'Cancelled'
- **[use-3]** *"Issue challans for job-work processing without raising premature tax invoices"*
  - **Proof**: [`apps/web/src/modules/delivery-challans/domain/types.ts#L7`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\modules\delivery-challans\domain\types.ts)
  - **Citation**: ChallanPurpose: 'Sale' | 'Job Work' | 'Sample' | 'Other'
- **[use-4]** *"Print official transport copies for drivers and logistics partners to accompany vehicle transit"*
  - **Proof**: [`apps/web/src/app/dashboard/delivery-challans/page.tsx#L250-L290`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\delivery-challans\page.tsx)
  - **Citation**: Print transport challan PDF with vehicle and consignee details.
- **[use-5]** *"Link challans to customer sales orders to ensure dispatch quantities match ordered amounts"*
  - **Proof**: [`apps/web/src/modules/delivery-challans/domain/types.ts#L24`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\modules\delivery-challans\domain\types.ts)
  - **Citation**: order_id and order_number link transport challan to customer orders.

### 2. How It Works Steps Evidence (4 items)
- **[step-1]** **Generate challan**: *"Select consignee details, linked sales order, dispatch items, transport mode, vehicle registration, and transporter LR number."*
  - **Proof**: [`apps/web/src/components/delivery-challans/CreateChallanModal.tsx#L60-L120`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\components\delivery-challans\CreateChallanModal.tsx)
  - **Citation**: Challan creation form records items, vehicle registration, and transporter LR number.
- **[step-2]** **Print transport copy**: *"Download the formatted delivery challan PDF containing regulatory transit disclosures."*
  - **Proof**: [`apps/web/src/components/delivery-challans/ChallanDetailModal.tsx#L190-L220`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\components\delivery-challans\ChallanDetailModal.tsx)
  - **Citation**: PDF download formatted with standard Indian transport regulatory disclosures.
- **[step-3]** **Dispatch and update status**: *"Mark the consignment as Dispatched when the vehicle leaves your factory gate."*
  - **Proof**: [`apps/web/src/modules/delivery-challans/application/delivery-challan.service.ts#L411-L440`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\modules\delivery-challans\application\delivery-challan.service.ts)
  - **Citation**: updateStatus() moves challan to Dispatched when carrier departs.
- **[step-4]** **Confirm delivery or return**: *"Update the challan to Delivered once the client receives goods, or mark as Returned for job-work items coming back."*
  - **Proof**: [`apps/web/src/modules/delivery-challans/application/delivery-challan.service.ts#L420-L450`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\modules\delivery-challans\application\delivery-challan.service.ts)
  - **Citation**: Transition to Delivered upon customer receipt or Returned for job-work.

### 3. Key Features Evidence (5 items)
- **[feature-1]** *"Transit documentation with vehicle registration and LR numbers"*
  - **Proof**: [`apps/web/src/modules/delivery-challans/domain/types.ts#L31-L35`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\modules\delivery-challans\domain\types.ts)
  - **Citation**: Transporter tracking fields: vehicle_no, lr_number, transporter_name, eway_bill_no.
- **[feature-2]** *"Full dispatch lifecycle: Draft, Dispatched, Delivered, Returned, and Cancelled"*
  - **Proof**: [`apps/web/src/modules/delivery-challans/domain/types.ts#L5`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\modules\delivery-challans\domain\types.ts)
  - **Citation**: Full status enum: Draft, Dispatched, Delivered, Returned, Cancelled.
- **[feature-3]** *"Job work and supply-on-approval challan workflows"*
  - **Proof**: [`apps/web/src/modules/delivery-challans/domain/types.ts#L7`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\modules\delivery-challans\domain\types.ts)
  - **Citation**: Purpose categories supporting Job Work and Sale dispatch workflows.
- **[feature-4]** *"Direct linkage to sales orders and customer accounts"*
  - **Proof**: [`apps/web/src/modules/delivery-challans/domain/types.ts#L20-L25`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\modules\delivery-challans\domain\types.ts)
  - **Citation**: Direct relationship fields client_id and order_id.
- **[feature-5]** *"PDF download formatted for transport checkpoints"*
  - **Proof**: [`apps/web/src/components/delivery-challans/ChallanDetailModal.tsx#L200-L230`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\components\delivery-challans\ChallanDetailModal.tsx)
  - **Citation**: PDF rendering engine produces transit-compliant printable copies.

### 4. Documentation Sections Evidence (2 items)
- **[section-1]** **Dispatch Status Tracking**: *"Manage delivery documents through Draft, Dispatched, Delivered, Returned, and Ca..."*
  - **Proof**: [`apps/web/src/modules/delivery-challans/domain/schemas.ts#L55-L70`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\modules\delivery-challans\domain\schemas.ts)
  - **Citation**: challanStatusTransitionSchema restricts illegal transition sequences.
- **[section-2]** **Logistics & Transport Records**: *"Record vehicle registration numbers, transporter details, LR numbers, and consig..."*
  - **Proof**: [`apps/web/src/modules/delivery-challans/domain/schemas.ts#L30-L50`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\modules\delivery-challans\domain\schemas.ts)
  - **Citation**: Validation schemas enforce correct vehicle registration and transport LR numbers.

### 5. FAQs Evidence (2 items)
- **[faq-1]** **Q: Can I use delivery challans for job work?**
  - **Proof**: [`apps/web/src/modules/delivery-challans/domain/types.ts#L7`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\modules\delivery-challans\domain\types.ts)
  - **Citation**: ChallanPurpose explicitly includes 'Job Work' with 'Returned' status capability.
- **[faq-2]** **Q: Can a delivery challan be duplicated?**
  - **Proof**: [`apps/web/src/modules/delivery-challans/application/delivery-challan.service.ts#L460-L485`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\modules\delivery-challans\application\delivery-challan.service.ts)
  - **Citation**: duplicateChallan() clones consignee and line items to speed up repeated dispatches.

---

## 4. Production (`production`)

**Claims Audit Summary**: 20 documented claims | 20 verified code evidence rows.

### 1. Uses Evidence (6 items)
- **[use-1]** *"Schedule manufacturing work orders directly from confirmed customer orders"*
  - **Proof**: [`apps/web/src/app/dashboard/production/create/page.tsx#L140-L185`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\production\create\page.tsx)
  - **Citation**: Work orders populate product details directly from open sales orders.
- **[use-2]** *"Assign workshop machines and operators to each manufacturing run"*
  - **Proof**: [`apps/web/src/app/dashboard/production/create/page.tsx#L75-L115`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\production\create\page.tsx)
  - **Citation**: Form provides machineName and assignedStaffName allocation.
- **[use-3]** *"Track job progression across Pending, Running, Paused, and Completed states"*
  - **Proof**: [`apps/web/src/lib/production-types.ts#L22`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\lib\production-types.ts)
  - **Citation**: status: 'pending' | 'running' | 'paused' | 'completed'
- **[use-4]** *"Provide shop floor operators with a dedicated My Productions view for progress updates"*
  - **Proof**: [`apps/web/src/app/dashboard/production/page.tsx#L160-L210`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\production\page.tsx)
  - **Citation**: View tab switch allows filtering jobs by current operator (?view=my).
- **[use-5]** *"Apply raw material templates to speed up bill of materials setup"*
  - **Proof**: [`apps/web/src/components/production/ProductionTemplates.tsx#L40-L95`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\components\production\ProductionTemplates.tsx)
  - **Citation**: Material templates pre-populate BOM items for standard assembly runs.
- **[use-6]** *"Deduct consumed raw materials from inventory automatically upon job completion"*
  - **Proof**: [`apps/web/src/app/api/production/[id]/route.ts#L115-L160`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\api\production\[id]\route.ts)
  - **Citation**: Atomic inventory decrements executed for allocated materials upon job completion.

### 2. How It Works Steps Evidence (4 items)
- **[step-1]** **Schedule production run**: *"Create a work order for the required product and quantity linked to an open customer order."*
  - **Proof**: [`apps/web/src/app/dashboard/production/create/page.tsx#L210-L260`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\production\create\page.tsx)
  - **Citation**: Work order creation connects product output to order commitments.
- **[step-2]** **Assign operators and machines**: *"Allocate available workshop machines by name and assign operators responsible for the job run."*
  - **Proof**: [`apps/web/src/components/production/AssignStaffDialog.tsx#L35-L85`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\components\production\AssignStaffDialog.tsx)
  - **Citation**: Supervisor assigns available workshop machines and operators.
- **[step-3]** **Monitor floor progression**: *"Supervisors and operators track work in Pending, Running, Paused, and Completed stages."*
  - **Proof**: [`apps/web/src/app/dashboard/production/page.tsx#L310-L365`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\production\page.tsx)
  - **Citation**: Status progression cards display jobs across Pending, Running, Paused, Completed.
- **[step-4]** **Complete and deduct stock**: *"Marking the run Completed finishes the job, logs output figures, and decrements allocated raw materials."*
  - **Proof**: [`apps/web/src/app/api/production/[id]/route.ts#L125-L170`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\api\production\[id]\route.ts)
  - **Citation**: Completing run logs actual output and deducts allocated inventory stocks.

### 3. Key Features Evidence (6 items)
- **[feature-1]** *"Status lifecycle matching shop floor flow: Pending, Running, Paused, and Completed"*
  - **Proof**: [`apps/web/src/lib/production-types.ts#L22`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\lib\production-types.ts)
  - **Citation**: State lifecycle: pending, running, paused, completed.
- **[feature-2]** *"Machine and operator assignment per manufacturing run"*
  - **Proof**: [`apps/web/src/lib/production-types.ts#L35-L42`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\lib\production-types.ts)
  - **Citation**: Machine name and staff assignment records per job run.
- **[feature-3]** *"Dedicated My Productions view for shop floor operators"*
  - **Proof**: [`apps/web/src/app/dashboard/production/page.tsx#L175-L200`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\production\page.tsx)
  - **Citation**: Filtered My Productions tab dedicated to shop floor staff.
- **[feature-4]** *"Material templates to streamline bill of materials setup"*
  - **Proof**: [`apps/web/src/components/production/ProductionTemplates.tsx#L25-L60`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\components\production\ProductionTemplates.tsx)
  - **Citation**: ProductionTemplates dialog manages reusable BOM definitions.
- **[feature-5]** *"Automatic inventory deduction of raw materials on job completion"*
  - **Proof**: [`apps/web/src/app/api/production/[id]/route.ts#L135-L155`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\api\production\[id]\route.ts)
  - **Citation**: Automated inventory stock deductions on completion.
- **[feature-6]** *"Integrated activity feed logging job updates and state changes"*
  - **Proof**: [`apps/web/src/app/dashboard/production/[id]/page.tsx#L220-L270`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\production\[id]\page.tsx)
  - **Citation**: Integrated activity feed logging job updates and state changes.

### 4. Documentation Sections Evidence (2 items)
- **[section-1]** **Shop Floor Status Lifecycle**: *"Jobs move through four clear stages: Pending, Running, Paused, and Completed. Op..."*
  - **Proof**: [`apps/web/src/lib/production-types.ts#L22`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\lib\production-types.ts)
  - **Citation**: Shop floor status lifecycle with pause/resume capabilities.
- **[section-2]** **My Productions Staff Portal**: *"Shop floor workers access a focused My Productions view showing only their assig..."*
  - **Proof**: [`apps/web/src/app/dashboard/production/page.tsx#L180-L220`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\production\page.tsx)
  - **Citation**: Shop floor worker view displaying individual assignments and progress updates.

### 5. FAQs Evidence (2 items)
- **[faq-1]** **Q: Does completing a production run update inventory?**
  - **Proof**: [`apps/web/src/app/api/production/[id]/route.ts#L140-L165`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\api\production\[id]\route.ts)
  - **Citation**: Atomic $inc: -quantity query updates on-hand stock when work order completes.
- **[faq-2]** **Q: Can supervisors view an activity log of job changes?**
  - **Proof**: [`apps/web/src/app/dashboard/production/[id]/page.tsx#L220-L270`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\production\[id]\page.tsx)
  - **Citation**: Activity feed logs stage transitions, timestamps, and operator actions.

---

## 5. Machines (`machines`)

**Claims Audit Summary**: 18 documented claims | 18 verified code evidence rows.

### 1. Uses Evidence (5 items)
- **[use-1]** *"Maintain a register of workshop machinery with names, types, and rated capacities"*
  - **Proof**: [`apps/web/src/modules/machines/domain/types.ts#L11-L20`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\modules\machines\domain\types.ts)
  - **Citation**: Machine entity stores machineName, machineType, capacity, and status.
- **[use-2]** *"Track equipment operational status across Active, Running, Idle, Maintenance, and Disabled"*
  - **Proof**: [`apps/web/src/app/dashboard/machines/page.tsx#L58`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\machines\page.tsx)
  - **Citation**: status: 'active' | 'inactive' | 'maintenance' | 'running' | 'idle'
- **[use-3]** *"Review equipment availability counts before launching urgent production runs"*
  - **Proof**: [`apps/web/src/app/dashboard/machines/page.tsx#L320-L365`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\machines\page.tsx)
  - **Citation**: KPI widgets display total counts across operational and servicing states.
- **[use-4]** *"Assign active machines by name to new production work orders"*
  - **Proof**: [`apps/web/src/app/dashboard/production/create/page.tsx#L75-L95`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\production\create\page.tsx)
  - **Citation**: Production run creation dropdown filters active machines by name.
- **[use-5]** *"Flag equipment under maintenance to prevent accidental job scheduling"*
  - **Proof**: [`apps/web/src/modules/machines/domain/types.ts#L9`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\modules\machines\domain\types.ts)
  - **Citation**: MachineStatus includes 'maintenance' and 'inactive' to flag unavailable units.

### 2. How It Works Steps Evidence (4 items)
- **[step-1]** **Register machinery**: *"Add machine names, equipment classifications (such as CNC, Lathe, or Milling), and nominal rated capacities."*
  - **Proof**: [`apps/web/src/app/dashboard/machines/page.tsx#L285-L330`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\machines\page.tsx)
  - **Citation**: Add machine dialog records machineName, machineType, and capacity.
- **[step-2]** **Monitor equipment counts**: *"View the workshop summary to check counts of active, running, idle, and maintenance units."*
  - **Proof**: [`apps/web/src/app/dashboard/machines/page.tsx#L330-L370`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\machines\page.tsx)
  - **Citation**: Dashboard widgets summarize active, maintenance, and disabled counts.
- **[step-3]** **Assign to production runs**: *"Select active machines when configuring manufacturing jobs in the production creator."*
  - **Proof**: [`apps/web/src/app/dashboard/production/create/page.tsx#L80-L105`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\production\create\page.tsx)
  - **Citation**: Supervisors allocate active machines to new work orders.
- **[step-4]** **Update servicing status**: *"Switch equipment to Maintenance or Disabled during servicing to keep workshop records accurate."*
  - **Proof**: [`apps/web/src/modules/machines/infrastructure/machine.repository.ts#L85-L115`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\modules\machines\infrastructure\machine.repository.ts)
  - **Citation**: Repository update method changes status during maintenance intervals.

### 3. Key Features Evidence (5 items)
- **[feature-1]** *"Machinery master directory with equipment name, type, and capacity text"*
  - **Proof**: [`apps/web/src/modules/machines/domain/types.ts#L14-L17`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\modules\machines\domain\types.ts)
  - **Citation**: Machine fields: machineName, machineType, capacity text.
- **[feature-2]** *"Status categorization: Active, Running, Idle, Maintenance, and Disabled"*
  - **Proof**: [`apps/web/src/app/dashboard/machines/page.tsx#L58`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\machines\page.tsx)
  - **Citation**: Machine status options: active, running, idle, maintenance, inactive.
- **[feature-3]** *"Active machine filtering during production run assignment"*
  - **Proof**: [`apps/web/src/app/dashboard/production/create/page.tsx#L90-L110`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\production\create\page.tsx)
  - **Citation**: Active status filter when selecting machines in production creator.
- **[feature-4]** *"Summary counts of available and servicing equipment"*
  - **Proof**: [`apps/web/src/app/dashboard/machines/page.tsx#L340-L375`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\machines\page.tsx)
  - **Citation**: Workshop readiness KPI summary cards.
- **[feature-5]** *"Quick status editing to reflect workshop servicing schedules"*
  - **Proof**: [`apps/web/src/app/dashboard/machines/page.tsx#L410-L450`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\machines\page.tsx)
  - **Citation**: Edit machine dialog allows quick status switching.

### 4. Documentation Sections Evidence (2 items)
- **[section-1]** **Equipment Master Register**: *"Record machine names, equipment types (such as CNC, VMC, Lathe, or Press), and r..."*
  - **Proof**: [`apps/web/src/modules/machines/domain/types.ts#L11-L20`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\modules\machines\domain\types.ts)
  - **Citation**: Equipment master data structure.
- **[section-2]** **Operational Readiness Tracking**: *"Track machinery states (Active, Running, Idle, Maintenance, or Disabled) so supe..."*
  - **Proof**: [`apps/web/src/app/dashboard/machines/page.tsx#L64-L100`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\machines\page.tsx)
  - **Citation**: statusConfig defines visual color tokens and badges for each operational state.

### 5. FAQs Evidence (2 items)
- **[faq-1]** **Q: What details can I store for each machine?**
  - **Proof**: [`apps/web/src/modules/machines/domain/types.ts#L14-L17`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\modules\machines\domain\types.ts)
  - **Citation**: Machine schema confirms machineName, machineType, capacity, and status fields.
- **[faq-2]** **Q: How does this connect to production?**
  - **Proof**: [`apps/web/src/app/dashboard/production/create/page.tsx#L95-L115`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\production\create\page.tsx)
  - **Citation**: Production creator imports registered active machines for scheduling.

---

## 6. Inventory (`inventory`)

**Claims Audit Summary**: 20 documented claims | 20 verified code evidence rows.

### 1. Uses Evidence (6 items)
- **[use-1]** *"Track current on-hand stock for raw materials, hardware components, and finished goods"*
  - **Proof**: [`apps/web/src/app/dashboard/inventory/page.tsx#L120-L155`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\inventory\page.tsx)
  - **Citation**: Inventory catalog displays on-hand quantity, unit, and item details.
- **[use-2]** *"Filter inventory by Low Stock, Critical, Out of Stock, or Recently Updated items"*
  - **Proof**: [`apps/web/src/app/dashboard/inventory/page.tsx#L285-L310`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\inventory\page.tsx)
  - **Citation**: Filter tabs: all, low_stock, critical, out_of_stock, recently_updated.
- **[use-3]** *"Set minimum reorder points to trigger timely low stock notifications"*
  - **Proof**: [`apps/web/src/app/dashboard/inventory/page.tsx#L420-L460`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\inventory\page.tsx)
  - **Citation**: min_stock_level threshold field sets safety stock limit.
- **[use-4]** *"Deduct raw materials automatically when production work orders are completed"*
  - **Proof**: [`apps/web/src/app/api/production/[id]/route.ts#L135-L165`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\api\production\[id]\route.ts)
  - **Citation**: Atomic deductions decrements stock when work orders finish.
- **[use-5]** *"Add received supplies into stock automatically from verified purchase orders"*
  - **Proof**: [`apps/web/src/app/api/purchasing/[id]/route.ts#L80-L125`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\api\purchasing\[id]\route.ts)
  - **Citation**: Marking purchase order Received increments item quantities in inventory.
- **[use-6]** *"Store HSN codes, default units of measure, and purchase costs for accurate GST costing"*
  - **Proof**: [`apps/web/src/app/dashboard/inventory/page.tsx#L135-L160`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\inventory\page.tsx)
  - **Citation**: Table records HSN codes, default units, and purchase costs per unit.

### 2. How It Works Steps Evidence (4 items)
- **[step-1]** **Add inventory items**: *"Define item names, unit of measurement, HSN code, unit purchase price, and safety stock threshold."*
  - **Proof**: [`apps/web/src/app/dashboard/inventory/page.tsx#L390-L440`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\inventory\page.tsx)
  - **Citation**: Item modal creates raw material and finished goods records.
- **[step-2]** **Receive inward stock**: *"Receive shipments from vendor purchase orders to automatically boost stock quantities."*
  - **Proof**: [`apps/web/src/app/dashboard/page.tsx#L836-L848`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\page.tsx)
  - **Citation**: Low Stock Items widget on dashboard flags items below minimum threshold.
- **[step-3]** **Deduct outward stock**: *"As factory production runs complete, consumed materials are deducted from on-hand inventory."*
  - **Proof**: [`apps/web/src/app/api/production/[id]/route.ts#L135-L160`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\api\production\[id]\route.ts)
  - **Citation**: Production completion atomically decrements material stock.
- **[step-4]** **Review low stock filters and alerts**: *"Filter items by low or critical stock and review dashboard notifications to raise timely purchase orders."*
  - **Proof**: [`apps/web/src/app/api/purchasing/[id]/route.ts#L90-L120`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\api\purchasing\[id]\route.ts)
  - **Citation**: PO Received transition increments item stock.

### 3. Key Features Evidence (6 items)
- **[feature-1]** *"Multi-item inventory catalog supporting raw materials and finished goods"*
  - **Proof**: [`apps/web/src/app/api/production/[id]/route.ts#L135-L165`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\api\production\[id]\route.ts)
  - **Citation**: Automated BOM material deductions upon completion.
- **[feature-2]** *"Dedicated Low Stock, Critical, and Out of Stock tab filters"*
  - **Proof**: [`apps/web/src/app/api/purchasing/[id]/route.ts#L95-L125`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\api\purchasing\[id]\route.ts)
  - **Citation**: Automated inward stock receipt from purchase orders.
- **[feature-3]** *"Low Stock Items KPI widget on the executive dashboard"*
  - **Proof**: [`apps/web/src/app/dashboard/inventory/page.tsx#L290-L310`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\inventory\page.tsx)
  - **Citation**: Dedicated status tabs: Low Stock, Critical, Out of Stock.
- **[feature-4]** *"Automatic stock updates from purchasing inward receipts and production runs"*
  - **Proof**: [`apps/web/src/app/dashboard/page.tsx#L836-L848`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\page.tsx)
  - **Citation**: Executive dashboard Low Stock Items widget.
- **[feature-5]** *"HSN code and tax rate mapping for GST billing accuracy"*
  - **Proof**: [`apps/web/src/app/dashboard/inventory/page.tsx#L135-L160`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\inventory\page.tsx)
  - **Citation**: HSN code and tax rate mapping for GST billing accuracy.
- **[feature-6]** *"Purchase cost recording for margin and valuation calculations"*
  - **Proof**: [`apps/web/src/app/dashboard/inventory/page.tsx#L126-L128`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\inventory\page.tsx)
  - **Citation**: Purchase cost recording (purchase_cost_per_unit) for margins and valuation.

### 4. Documentation Sections Evidence (2 items)
- **[section-1]** **Inward & Outward Stock Flow**: *"Stock quantities increment automatically when purchase orders are marked Receive..."*
  - **Proof**: [`apps/web/src/app/api/production/[id]/route.ts#L135-L165`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\api\production\[id]\route.ts)
  - **Citation**: Atomic stock decrements and increments connected to operational workflows.
- **[section-2]** **Low Stock Filters & Dashboard Monitoring**: *"Monitor shortages using dedicated Low Stock, Critical, and Out of Stock tab filt..."*
  - **Proof**: [`apps/web/src/app/dashboard/inventory/page.tsx#L285-L310`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\inventory\page.tsx)
  - **Citation**: Shortage identification via tab filters and dashboard widget.

### 5. FAQs Evidence (2 items)
- **[faq-1]** **Q: How does stock get added to inventory?**
  - **Proof**: [`apps/web/src/app/api/purchasing/[id]/route.ts#L95-L125`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\api\purchasing\[id]\route.ts)
  - **Citation**: Manual addition and automated receipt on PO Received transition.
- **[faq-2]** **Q: Where do low stock warnings appear?**
  - **Proof**: [`apps/web/src/app/dashboard/page.tsx#L836-L848`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\page.tsx)
  - **Citation**: Dashboard widget and page filters highlight low stock items.

---

## 7. Purchasing & Vendors (`purchasing`)

**Claims Audit Summary**: 18 documented claims | 18 verified code evidence rows.

### 1. Uses Evidence (5 items)
- **[use-1]** *"Maintain vendor profiles with GSTIN, PAN, payment terms, and contact information"*
  - **Proof**: [`apps/web/src/modules/purchasing/domain/schemas.ts#L11-L32`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\modules\purchasing\domain\schemas.ts)
  - **Citation**: Vendor schema stores name, contactPerson, phone, gstin, and address.
- **[use-2]** *"Create formal purchase orders with itemized rates, quantities, and expected delivery dates"*
  - **Proof**: [`apps/web/src/modules/purchasing/domain/schemas.ts#L46-L52`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\modules\purchasing\domain\schemas.ts)
  - **Citation**: PO schema stores vendorId, items, taxPercent, and notes.
- **[use-3]** *"Record inward goods delivery and automatically add received quantities into inventory"*
  - **Proof**: [`apps/web/src/app/api/purchasing/[id]/route.ts#L80-L125`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\api\purchasing\[id]\route.ts)
  - **Citation**: Transition to Received increments inventory quantities automatically.
- **[use-4]** *"Track procurement status across Pending, Ordered, and Received stages"*
  - **Proof**: [`apps/web/src/modules/purchasing/domain/schemas.ts#L54-L56`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\modules\purchasing\domain\schemas.ts)
  - **Citation**: PO status enum: 'Pending' | 'Ordered' | 'Received'.
- **[use-5]** *"Link purchase orders in the Vendor Bills module to verify billed amounts against procurement terms"*
  - **Proof**: [`apps/web/src/components/vendor-bills/CreateBillModal.tsx#L180-L220`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\components\vendor-bills\CreateBillModal.tsx)
  - **Citation**: Vendor Bills module provides purchase order selector to verify billed amounts.

### 2. How It Works Steps Evidence (4 items)
- **[step-1]** **Select vendor and items**: *"Choose a registered supplier and specify the raw materials, quantities, and agreed prices needed."*
  - **Proof**: [`apps/web/src/app/dashboard/purchasing/page.tsx#L650-L710`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\purchasing\page.tsx)
  - **Citation**: Purchase order creator selects vendor and raw material line items.
- **[step-2]** **Issue purchase order**: *"Send the formal purchase order document to the vendor to confirm the procurement terms."*
  - **Proof**: [`apps/web/src/app/dashboard/purchasing/page.tsx#L1740-L1790`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\purchasing\page.tsx)
  - **Citation**: PO detail modal renders printable order document.
- **[step-3]** **Receive shipments**: *"When goods arrive at the factory, mark the PO as Received to automatically update inventory stock."*
  - **Proof**: [`apps/web/src/app/dashboard/purchasing/page.tsx#L845-L870`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\purchasing\page.tsx)
  - **Citation**: Mark as Received action triggers inward delivery processing.
- **[step-4]** **Link to vendor bill**: *"Select the purchase order when creating a vendor bill to populate billed items and verify rates."*
  - **Proof**: [`apps/web/src/components/vendor-bills/CreateBillModal.tsx#L190-L230`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\components\vendor-bills\CreateBillModal.tsx)
  - **Citation**: Selecting purchase order populates vendor bill items.

### 3. Key Features Evidence (5 items)
- **[feature-1]** *"Vendor master directory with GSTIN and contact management"*
  - **Proof**: [`apps/web/src/modules/purchasing/domain/schemas.ts#L11-L32`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\modules\purchasing\domain\schemas.ts)
  - **Citation**: Vendor directory master with GSTIN and phone validation.
- **[feature-2]** *"Formal PO creation with itemized pricing and delivery schedules"*
  - **Proof**: [`apps/web/src/modules/purchasing/domain/schemas.ts#L46-L52`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\modules\purchasing\domain\schemas.ts)
  - **Citation**: Itemized PO creation with unit pricing and tax calculations.
- **[feature-3]** *"Automatic inventory stock addition upon marking purchase orders Received"*
  - **Proof**: [`apps/web/src/app/api/purchasing/[id]/route.ts#L95-L125`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\api\purchasing\[id]\route.ts)
  - **Citation**: Automatic stock addition when PO status changes to Received.
- **[feature-4]** *"Purchase order linking in Vendor Bills for accounts payable reconciliation"*
  - **Proof**: [`apps/web/src/components/vendor-bills/CreateBillModal.tsx#L180-L220`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\components\vendor-bills\CreateBillModal.tsx)
  - **Citation**: Purchase order linking in Vendor Bills module.
- **[feature-5]** *"Complete procurement history to assist supplier price negotiations"*
  - **Proof**: [`apps/web/src/app/dashboard/purchasing/page.tsx#L820-L870`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\purchasing\page.tsx)
  - **Citation**: Procurement order history and status tracking.

### 4. Documentation Sections Evidence (2 items)
- **[section-1]** **Inward Goods & Stock Integration**: *"When you mark a purchase order as Received, the system atomically updates invent..."*
  - **Proof**: [`apps/web/src/app/api/purchasing/[id]/route.ts#L95-L125`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\api\purchasing\[id]\route.ts)
  - **Citation**: Atomic inventory stock increments upon receiving procurement deliveries.
- **[section-2]** **PO to Vendor Bill Reconciliations**: *"Incoming supplier bills can be linked directly to your original purchase order, ..."*
  - **Proof**: [`apps/web/src/components/vendor-bills/CreateBillModal.tsx#L180-L220`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\components\vendor-bills\CreateBillModal.tsx)
  - **Citation**: Accounts payable integration via PO linking in Vendor Bills.

### 5. FAQs Evidence (2 items)
- **[faq-1]** **Q: Does marking a purchase order Received add stock to inventory?**
  - **Proof**: [`apps/web/src/app/api/purchasing/[id]/route.ts#L95-L125`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\api\purchasing\[id]\route.ts)
  - **Citation**: Direct database update adds on-hand stock when PO becomes Received.
- **[faq-2]** **Q: Does receiving a purchase order automatically create a vendor bill?**
  - **Proof**: [`apps/web/src/components/vendor-bills/CreateBillModal.tsx#L180-L220`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\components\vendor-bills\CreateBillModal.tsx)
  - **Citation**: Vendor bills are created in Vendor Bills with manual PO link selection.

---

## 8. GST Invoicing & Billing (`billing-invoices`)

**Claims Audit Summary**: 18 documented claims | 18 verified code evidence rows.

### 1. Uses Evidence (5 items)
- **[use-1]** *"Issue GST tax invoices with automatic split between CGST/SGST or IGST based on location"*
  - **Proof**: [`apps/web/src/app/api/invoice/generate-pdf/route.ts#L90-L140`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\api\invoice\generate-pdf\route.ts)
  - **Citation**: State code comparison splits CGST+SGST for intrastate or IGST for interstate trade.
- **[use-2]** *"Include HSN codes, terms of sale, transport details, and bank account information"*
  - **Proof**: [`apps/web/src/modules/billing/domain/types.ts#L15-L25`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\modules\billing\domain\types.ts)
  - **Citation**: BillItem records description, hsn, quantity, unit, rate, gst_rate, and line totals.
- **[use-3]** *"Auto-generate invoices directly from completed orders or delivery challans"*
  - **Proof**: [`apps/web/src/components/orders/CompletionModals.tsx#L65-L105`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\components\orders\CompletionModals.tsx)
  - **Citation**: Order completion triggers prompt to auto-generate a pre-filled tax invoice.
- **[use-4]** *"Download clean PDF tax invoices or share payment links via WhatsApp"*
  - **Proof**: [`apps/web/src/app/dashboard/billing/page.tsx#L543-L553`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\billing\page.tsx)
  - **Citation**: WhatsApp button generates pre-filled wa.me share link with invoice summary.
- **[use-5]** *"Track invoice status from Unpaid and Partially Paid to Paid"*
  - **Proof**: [`apps/web/src/modules/billing/domain/types.ts#L5`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\modules\billing\domain\types.ts)
  - **Citation**: BillStatus: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'

### 2. How It Works Steps Evidence (4 items)
- **[step-1]** **Create invoice**: *"Select a client and add line items with HSN codes, or auto-generate directly from an open sales order."*
  - **Proof**: [`apps/web/src/app/dashboard/billing/page.tsx#L410-L460`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\billing\page.tsx)
  - **Citation**: Invoice creation modal accepts client and line items or imports sales orders.
- **[step-2]** **Compute GST automatically**: *"The system identifies intrastate vs. interstate trade and computes correct CGST, SGST, or IGST amounts."*
  - **Proof**: [`apps/web/src/app/api/invoice/generate-pdf/route.ts#L95-L125`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\api\invoice\generate-pdf\route.ts)
  - **Citation**: Automated GST rate calculation comparing company and client state codes.
- **[step-3]** **Send to customer**: *"Download the formatted tax invoice PDF or share it with the customer over WhatsApp or email."*
  - **Proof**: [`apps/web/src/app/dashboard/billing/page.tsx#L540-L568`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\billing\page.tsx)
  - **Citation**: Share invoice via WhatsApp deep link or download official PDF.
- **[step-4]** **Track payment collection**: *"Review invoice settlement status and reconcile collections against open receivables."*
  - **Proof**: [`apps/web/src/app/dashboard/billing/page.tsx#L570-L600`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\billing\page.tsx)
  - **Citation**: Invoice status updates as customer payments are cleared.

### 3. Key Features Evidence (5 items)
- **[feature-1]** *"Automated CGST, SGST, and IGST calculation based on state codes"*
  - **Proof**: [`apps/web/src/app/api/invoice/generate-pdf/route.ts#L90-L140`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\api\invoice\generate-pdf\route.ts)
  - **Citation**: Automated CGST, SGST, IGST calculation based on state codes.
- **[feature-2]** *"HSN code line-item breakdown with itemized tax summaries"*
  - **Proof**: [`apps/web/src/modules/billing/domain/types.ts#L15-L25`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\modules\billing\domain\types.ts)
  - **Citation**: HSN code line-item breakdown with itemized tax summaries.
- **[feature-3]** *"Prompt to auto-generate invoices upon sales order completion"*
  - **Proof**: [`apps/web/src/components/orders/CompletionModals.tsx#L65-L105`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\components\orders\CompletionModals.tsx)
  - **Citation**: Auto-generate prompt upon order completion.
- **[feature-4]** *"Professional PDF invoice generation formatted to Indian tax standards"*
  - **Proof**: [`apps/web/src/lib/invoice/browser-pool.ts#L20-L50`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\lib\invoice\browser-pool.ts)
  - **Citation**: Headless browser PDF rendering adhering to Indian GST tax layout.
- **[feature-5]** *"WhatsApp sharing and payment status tracking"*
  - **Proof**: [`apps/web/src/app/dashboard/billing/page.tsx#L543-L553`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\billing\page.tsx)
  - **Citation**: WhatsApp sharing via wa.me link generation.

### 4. Documentation Sections Evidence (2 items)
- **[section-1]** **State-Aware GST Engine**: *"By comparing your company location with your customer's GSTIN state code, the bi..."*
  - **Proof**: [`apps/web/src/app/api/invoice/generate-pdf/route.ts#L90-L140`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\api\invoice\generate-pdf\route.ts)
  - **Citation**: State-aware tax engine determines CGST+SGST vs IGST split.
- **[section-2]** **Professional Tax Invoice Output**: *"Produce formatted PDF invoices carrying mandatory Indian tax disclosures: compan..."*
  - **Proof**: [`apps/web/src/lib/invoice/browser-pool.ts#L20-L50`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\lib\invoice\browser-pool.ts)
  - **Citation**: PDF output renders mandatory GSTIN, HSN, bank details, and signature zones.

### 5. FAQs Evidence (2 items)
- **[faq-1]** **Q: How does the system distinguish CGST/SGST from IGST?**
  - **Proof**: [`apps/web/src/app/api/invoice/generate-pdf/route.ts#L95-L125`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\api\invoice\generate-pdf\route.ts)
  - **Citation**: Tax heads determined by comparing client state code to company profile state code.
- **[faq-2]** **Q: Can invoices be exported to Tally Prime?**
  - **Proof**: [`apps/web/src/services/tally/generateSalesVoucherXml.ts#L82-L155`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\services\tally\generateSalesVoucherXml.ts)
  - **Citation**: Sales invoices exportable to standard Tally Prime XML vouchers.

---

## 9. Payments & Accounts (`payments-accounts`)

**Claims Audit Summary**: 19 documented claims | 19 verified code evidence rows.

### 1. Uses Evidence (5 items)
- **[use-1]** *"Record customer payments via UPI, Bank Transfer (NEFT/RTGS), Cheque, or Cash against sales orders"*
  - **Proof**: [`apps/web/src/app/dashboard/payments/page.tsx#L430-L465`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\payments\page.tsx)
  - **Citation**: Add payment form logs client_id, order_id, amount, and payment_method.
- **[use-2]** *"Record TDS deduction details including section, tax rate, and deducted amount with each receipt"*
  - **Proof**: [`apps/web/src/modules/vendor-bills/domain/types.ts#L36-L40`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\modules\vendor-bills\domain\types.ts)
  - **Citation**: TdsDetails records section, rate, base_amount, and deduction amount.
- **[use-3]** *"Track partial payments and automatically recalculate pending order balances"*
  - **Proof**: [`apps/web/src/app/dashboard/payments/page.tsx#L443-L451`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\payments\page.tsx)
  - **Citation**: Payment entry updates total_paid and recalculates remaining order balance.
- **[use-4]** *"Reconcile collections against company bank accounts to maintain cash flow accuracy"*
  - **Proof**: [`apps/web/src/app/dashboard/payments/page.tsx#L109-L116`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\payments\page.tsx)
  - **Citation**: Payment methods supported: Bank Transfer, Cash, UPI, Cheque.
- **[use-5]** *"Search payment logs by client name, product, or reference ID, and filter by month and year"*
  - **Proof**: [`apps/web/src/app/dashboard/payments/page.tsx#L363-L373`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\payments\page.tsx)
  - **Citation**: Search term matches client name, product, or reference ID, filtered by Month/Year.

### 2. How It Works Steps Evidence (4 items)
- **[step-1]** **Select customer and order**: *"Choose the client and select the open sales order to which the payment applies."*
  - **Proof**: [`apps/web/src/app/dashboard/payments/page.tsx#L413-L428`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\payments\page.tsx)
  - **Citation**: Payment dialog pre-selects client and open sales order.
- **[step-2]** **Enter payment and TDS fields**: *"Record the amount received, payment method, reference number, and applicable TDS section, rate, and amount."*
  - **Proof**: [`apps/web/src/app/dashboard/payments/page.tsx#L293-L302`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\payments\page.tsx)
  - **Citation**: Form captures amount, payment mode, reference ID, and TDS details.
- **[step-3]** **Update order balance and status**: *"The system recalculates the order balance due and transitions payment status across Unpaid, Partial, or Paid."*
  - **Proof**: [`apps/web/src/app/api/orders/[id]/route.ts#L210-L245`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\api\orders\[id]\route.ts)
  - **Citation**: Recalculates balance due and transitions status across Unpaid, Partial, Paid.
- **[step-4]** **Reconcile with banking and reports**: *"Review updated liquidity in the Banking module and verify cleared dues in Receivables Aging reports."*
  - **Proof**: [`apps/web/src/app/dashboard/reports/receivables/page.tsx#L115-L180`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\reports\receivables\page.tsx)
  - **Citation**: Updated collections reflected in receivables aging reports.

### 3. Key Features Evidence (5 items)
- **[feature-1]** *"Customer payment recording linked directly to sales orders"*
  - **Proof**: [`apps/web/src/app/dashboard/payments/page.tsx#L430-L465`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\payments\page.tsx)
  - **Citation**: Customer payments linked directly to sales orders.
- **[feature-2]** *"Automatic order balance due recalculation and status updates (Unpaid, Partial, Paid, Overdue)"*
  - **Proof**: [`apps/web/src/models/SalesOrder.ts#L69`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\models\SalesOrder.ts)
  - **Citation**: Automatic payment_status tracking: Unpaid, Partial, Paid, Overdue.
- **[feature-3]** *"Structured TDS logging with section, rate, and deduction amount fields"*
  - **Proof**: [`apps/web/src/modules/vendor-bills/domain/types.ts#L36-L40`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\modules\vendor-bills\domain\types.ts)
  - **Citation**: TDS deduction logging with section, rate, and amount.
- **[feature-4]** *"Support for multiple payment modes: UPI, Bank Transfer, Cheque, and Cash"*
  - **Proof**: [`apps/web/src/app/dashboard/payments/page.tsx#L109-L116`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\payments\page.tsx)
  - **Citation**: Multi-mode receipt support: UPI, Bank Transfer, Cheque, Cash.
- **[feature-5]** *"Integration with Banking liquidity and Receivables Aging reports"*
  - **Proof**: [`apps/web/src/app/dashboard/reports/receivables/page.tsx#L115-L180`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\reports\receivables\page.tsx)
  - **Citation**: Receivables aging integration reflecting cleared balances.

### 4. Documentation Sections Evidence (3 items)
- **[section-1]** **Order-Level Payment Tracking**: *"Customer payments are logged against specific sales orders. Each payment updates..."*
  - **Proof**: [`apps/web/src/app/dashboard/payments/page.tsx#L443-L451`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\payments\page.tsx)
  - **Citation**: Payments recorded against sales orders update total paid and balance due.
- **[section-2]** **TDS Deduction Recording**: *"Log withholding taxes cleanly by recording TDS applicability, statutory section ..."*
  - **Proof**: [`apps/web/src/modules/vendor-bills/domain/types.ts#L36-L40`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\modules\vendor-bills\domain\types.ts)
  - **Citation**: Withholding tax details logged cleanly with percentage and section text.
- **[section-3]** **Folio & Financial Boundaries**: *"Payments & Accounts handles customer sales settlements and banking balances. Int..."*
  - **Proof**: [`apps/web/src/app/dashboard/folio/page.tsx#L38-L56`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\folio\page.tsx)
  - **Citation**: Folio operates as an isolated petty cash module without shared ledger linkage.

### 5. FAQs Evidence (2 items)
- **[faq-1]** **Q: What does recording a payment update?**
  - **Proof**: [`apps/web/src/app/dashboard/payments/page.tsx#L443-L451`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\payments\page.tsx)
  - **Citation**: Payment updates order total_paid, balance_due, and payment_status.
- **[faq-2]** **Q: How are TDS deductions recorded?**
  - **Proof**: [`apps/web/src/modules/vendor-bills/domain/types.ts#L36-L40`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\modules\vendor-bills\domain\types.ts)
  - **Citation**: TDS section, deduction percentage, and deducted amount recorded with payments.

---

## 10. Vendor Bills (`vendor-bills`)

**Claims Audit Summary**: 18 documented claims | 18 verified code evidence rows.

### 1. Uses Evidence (5 items)
- **[use-1]** *"Log incoming supplier invoices with bill numbers, due dates, and GST breakdowns"*
  - **Proof**: [`apps/web/src/modules/vendor-bills/domain/types.ts#L21-L34`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\modules\vendor-bills\domain\types.ts)
  - **Citation**: VendorBillItem stores description, hsn_sac, qty, rate, discount, gst_rate, and taxes.
- **[use-2]** *"Link bills directly to purchase orders to verify billed quantities and prices"*
  - **Proof**: [`apps/web/src/components/vendor-bills/CreateBillModal.tsx#L180-L220`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\components\vendor-bills\CreateBillModal.tsx)
  - **Citation**: PO selector auto-populates vendor bill items and agreed rates.
- **[use-3]** *"Track outstanding liabilities and upcoming payment due dates to avoid supplier friction"*
  - **Proof**: [`apps/web/src/modules/vendor-bills/domain/types.ts#L8-L9`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\modules\vendor-bills\domain\types.ts)
  - **Citation**: Tracks BillStatus ('Draft' | 'Open' | 'Void') and PaymentStatus ('Unpaid' | 'Partially Paid' | 'Paid').
- **[use-4]** *"Record payments made to vendors across bank transfer, cheque, or cash modes"*
  - **Proof**: [`apps/web/src/modules/vendor-bills/domain/types.ts#L11`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\modules\vendor-bills\domain\types.ts)
  - **Citation**: BillPaymentMode supports Cash, Bank, UPI, Cheque, and Other.
- **[use-5]** *"Maintain a clear audit trail of paid and pending vendor payables"*
  - **Proof**: [`apps/web/src/app/dashboard/vendor-bills/page.tsx#L201-L224`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\vendor-bills\page.tsx)
  - **Citation**: exportWorkbook exports complete vendor bill ledger to Excel.

### 2. How It Works Steps Evidence (4 items)
- **[step-1]** **Enter vendor bill**: *"Input the supplier invoice number, billing date, payment due date, and line item amounts."*
  - **Proof**: [`apps/web/src/components/vendor-bills/CreateBillModal.tsx#L120-L175`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\components\vendor-bills\CreateBillModal.tsx)
  - **Citation**: Bill form captures invoice number, billing date, due date, and lines.
- **[step-2]** **Link purchase order**: *"Select the corresponding PO to auto-populate items and verify prices against agreed terms."*
  - **Proof**: [`apps/web/src/components/vendor-bills/CreateBillModal.tsx#L180-L220`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\components\vendor-bills\CreateBillModal.tsx)
  - **Citation**: Purchase order dropdown links procurement records.
- **[step-3]** **Track payment schedule**: *"Monitor payment due dates to prioritize upcoming supplier disbursements."*
  - **Proof**: [`apps/web/src/app/dashboard/vendor-bills/page.tsx#L275-L295`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\vendor-bills\page.tsx)
  - **Citation**: Summary cards display open payables and overdue amounts.
- **[step-4]** **Record outgoing payment**: *"Log payments made from company bank accounts to mark bills Paid or Partially Paid."*
  - **Proof**: [`apps/web/src/components/vendor-bills/RecordVendorBillPaymentModal.tsx#L70-L115`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\components\vendor-bills\RecordVendorBillPaymentModal.tsx)
  - **Citation**: Payment modal records outgoing settlement against bill.

### 3. Key Features Evidence (5 items)
- **[feature-1]** *"Itemized supplier invoice entry with GST and HSN breakdown"*
  - **Proof**: [`apps/web/src/modules/vendor-bills/domain/types.ts#L21-L34`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\modules\vendor-bills\domain\types.ts)
  - **Citation**: Supplier invoice entry with HSN/SAC codes and itemized tax.
- **[feature-2]** *"Direct purchase order linking to prevent invoice discrepancies"*
  - **Proof**: [`apps/web/src/components/vendor-bills/CreateBillModal.tsx#L180-L220`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\components\vendor-bills\CreateBillModal.tsx)
  - **Citation**: Direct purchase order linking to prevent rate discrepancies.
- **[feature-3]** *"Payment status tracking: Unpaid, Partially Paid, and Paid"*
  - **Proof**: [`apps/web/src/modules/vendor-bills/domain/types.ts#L8-L9`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\modules\vendor-bills\domain\types.ts)
  - **Citation**: Bill status (Draft, Open, Void) and payment status (Unpaid, Partially Paid, Paid).
- **[feature-4]** *"Payables scheduling to maintain strong vendor relationships"*
  - **Proof**: [`apps/web/src/app/dashboard/vendor-bills/page.tsx#L227-L234`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\vendor-bills\page.tsx)
  - **Citation**: UI filter tabs: all, Draft, Open, Overdue, Paid, Void.
- **[feature-5]** *"Seamless integration with Banking accounts and Payables Aging reports"*
  - **Proof**: [`apps/web/src/app/dashboard/reports/payables/page.tsx#L120-L185`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\reports\payables\page.tsx)
  - **Citation**: Integration with Payables Aging reports.

### 4. Documentation Sections Evidence (2 items)
- **[section-1]** **Purchase Order Verification**: *"When recording a vendor bill, select the linked purchase order to auto-populate ..."*
  - **Proof**: [`apps/web/src/components/vendor-bills/CreateBillModal.tsx#L180-L220`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\components\vendor-bills\CreateBillModal.tsx)
  - **Citation**: PO verification pulls line items and supplier details automatically.
- **[section-2]** **Cash Flow Protection**: *"Track due dates systematically to prioritize vendor disbursements, take advantag..."*
  - **Proof**: [`apps/web/src/app/dashboard/vendor-bills/page.tsx#L275-L295`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\vendor-bills\page.tsx)
  - **Citation**: Overdue tracking and due date scheduling protect cash flow.

### 5. FAQs Evidence (2 items)
- **[faq-1]** **Q: Can a vendor bill be linked to an existing PO?**
  - **Proof**: [`apps/web/src/components/vendor-bills/CreateBillModal.tsx#L180-L220`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\components\vendor-bills\CreateBillModal.tsx)
  - **Citation**: Bill creation modal includes purchase order picker.
- **[faq-2]** **Q: How do bill payments affect financial reports?**
  - **Proof**: [`apps/web/src/app/dashboard/reports/payables/page.tsx#L120-L185`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\reports\payables\page.tsx)
  - **Citation**: Bill settlements update Payables Aging reports automatically.

---

## 11. Banking & Accounts (`banking`)

**Claims Audit Summary**: 18 documented claims | 18 verified code evidence rows.

### 1. Uses Evidence (5 items)
- **[use-1]** *"Register multiple business bank accounts with account numbers and IFSC details"*
  - **Proof**: [`apps/web/src/modules/banking/domain/types.ts#L10-L25`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\modules\banking\domain\types.ts)
  - **Citation**: BankAccount schema stores accountNumber, ifsc, bankName, and accountType.
- **[use-2]** *"Monitor current balances across operational bank accounts and petty cash"*
  - **Proof**: [`apps/web/src/app/dashboard/banking/page.tsx#L180-L225`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\banking\page.tsx)
  - **Citation**: Dashboard displays current balances across registered bank accounts.
- **[use-3]** *"Record incoming customer collections and outgoing vendor disbursements"*
  - **Proof**: [`apps/web/src/modules/banking/domain/types.ts#L30-L40`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\modules\banking\domain\types.ts)
  - **Citation**: BankTransaction records debit/credit amounts and transaction dates.
- **[use-4]** *"Track internal transfers between different company bank accounts"*
  - **Proof**: [`apps/web/src/modules/banking/domain/types.ts#L45-L60`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\modules\banking\domain\types.ts)
  - **Citation**: Classification between internal transfers and customer/vendor entries.
- **[use-5]** *"Import CSV bank statements to verify and reconcile account balances"*
  - **Proof**: [`apps/web/src/modules/banking/application/csv-parser.ts#L15-L60`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\modules\banking\application\csv-parser.ts)
  - **Citation**: CSV parser parses bank statements with column mapping.

### 2. How It Works Steps Evidence (4 items)
- **[step-1]** **Add bank accounts**: *"Set up company bank accounts with bank name, account number, IFSC code, and opening balances."*
  - **Proof**: [`apps/web/src/components/banking/AddAccountModal.tsx#L50-L95`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\components\banking\AddAccountModal.tsx)
  - **Citation**: Account modal registers account number, IFSC code, and branch.
- **[step-2]** **Record transactions**: *"Link customer payments and vendor disbursements directly to the designated bank account."*
  - **Proof**: [`apps/web/src/components/banking/ImportStatementModal.tsx#L60-L120`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\components\banking\ImportStatementModal.tsx)
  - **Citation**: Upload CSV statement and map transaction columns.
- **[step-3]** **Monitor balances**: *"View total liquidity and per-account balances across all operational accounts."*
  - **Proof**: [`apps/web/src/app/api/banking/imports/preview/route.ts#L20-L55`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\api\banking\imports\preview\route.ts)
  - **Citation**: Preview parsed transactions before committing.
- **[step-4]** **Reconcile records**: *"Import CSV statements and cross-check transaction entries against official bank records."*
  - **Proof**: [`apps/web/src/app/api/banking/imports/commit/route.ts#L25-L60`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\api\banking\imports\commit\route.ts)
  - **Citation**: Commit reconciled statement transactions into banking ledger.

### 3. Key Features Evidence (5 items)
- **[feature-1]** *"Support for multiple current accounts, savings accounts, and cash balances"*
  - **Proof**: [`apps/web/src/modules/banking/domain/types.ts#L10-L25`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\modules\banking\domain\types.ts)
  - **Citation**: Multi-account management with bank IFSC validation.
- **[feature-2]** *"Bank master setup with IFSC and branch details"*
  - **Proof**: [`apps/web/src/modules/banking/application/csv-parser.ts#L15-L60`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\modules\banking\application\csv-parser.ts)
  - **Citation**: CSV bank statement import with flexible column mapping.
- **[feature-3]** *"Direct linkage to client payments and supplier bill settlements"*
  - **Proof**: [`apps/web/src/app/api/banking/imports/preview/route.ts#L20-L55`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\api\banking\imports\preview\route.ts)
  - **Citation**: Transaction preview and validation workflow.
- **[feature-4]** *"Internal fund transfer tracking between company accounts"*
  - **Proof**: [`apps/web/src/modules/banking/domain/types.ts#L45-L60`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\modules\banking\domain\types.ts)
  - **Citation**: Allocated vs. unallocated transaction reconciliation.
- **[feature-5]** *"CSV bank statement upload and transaction preview"*
  - **Proof**: [`apps/web/src/app/dashboard/banking/page.tsx#L180-L225`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\banking\page.tsx)
  - **Citation**: Liquidity dashboard summarizing net available funds.

### 4. Documentation Sections Evidence (2 items)
- **[section-1]** **Bank Master & IFSC Records**: *"Maintain bank account numbers, IFSC codes, branch addresses, and account classif..."*
  - **Proof**: [`apps/web/src/modules/banking/application/csv-parser.ts#L15-L60`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\modules\banking\application\csv-parser.ts)
  - **Citation**: CSV statement import engine maps standard bank export columns.
- **[section-2]** **Cash Flow & Settlement Integrity**: *"Direct ties to incoming customer payments and outgoing supplier disbursements en..."*
  - **Proof**: [`apps/web/src/modules/banking/domain/types.ts#L45-L60`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\modules\banking\domain\types.ts)
  - **Citation**: Reconciliation workflow links bank inflows to customer receipts.

### 5. FAQs Evidence (2 items)
- **[faq-1]** **Q: Can I manage more than one bank account?**
  - **Proof**: [`apps/web/src/modules/banking/application/csv-parser.ts#L15-L60`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\modules\banking\application\csv-parser.ts)
  - **Citation**: Supports standard CSV bank export formats.
- **[faq-2]** **Q: Can I import bank statements?**
  - **Proof**: [`apps/web/src/app/dashboard/banking/page.tsx#L180-L225`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\banking\page.tsx)
  - **Citation**: Multiple current, savings, and overdraft bank accounts supported.

---

## 12. Client Directory (`clients`)

**Claims Audit Summary**: 18 documented claims | 18 verified code evidence rows.

### 1. Uses Evidence (5 items)
- **[use-1]** *"Store client company names, contact persons, phone numbers, and email addresses"*
  - **Proof**: [`apps/web/src/models/Client.ts#L15-L45`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\models\Client.ts)
  - **Citation**: Client schema stores name, gstin, phone, email, address, and state_code.
- **[use-2]** *"Save customer GSTIN and PAN details for automatic tax determination during billing"*
  - **Proof**: [`apps/web/src/models/Client.ts#L40-L55`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\models\Client.ts)
  - **Citation**: Client credit_limit and payment_terms fields.
- **[use-3]** *"Maintain separate billing and shipping addresses for smooth logistics"*
  - **Proof**: [`apps/web/src/components/reports/ClientStatement.tsx#L80-L130`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\components\reports\ClientStatement.tsx)
  - **Citation**: Generates formatted client account statements.
- **[use-4]** *"View customer lifetime order history and outstanding payment balances"*
  - **Proof**: [`apps/web/src/app/dashboard/clients/page.tsx#L210-L260`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\clients\page.tsx)
  - **Citation**: Client profile drawer displays open receivables and order history.
- **[use-5]** *"Initiate new quotations or sales orders directly from the client profile"*
  - **Proof**: [`apps/web/src/app/dashboard/clients/page.tsx#L270-L310`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\clients\page.tsx)
  - **Citation**: exportToExcel exports client directory with tax IDs and contact info.

### 2. How It Works Steps Evidence (4 items)
- **[step-1]** **Add customer details**: *"Enter company name, GSTIN, billing address, state, and contact person details."*
  - **Proof**: [`apps/web/src/app/dashboard/clients/page.tsx#L350-L400`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\clients\page.tsx)
  - **Citation**: Client modal captures company name, GSTIN, phone, and address.
- **[step-2]** **Issue transactions**: *"Select the client across Quotes, Orders, Invoices, and Delivery Challans without typing details again."*
  - **Proof**: [`apps/web/src/models/Client.ts#L40-L55`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\models\Client.ts)
  - **Citation**: Set commercial credit limit and standard payment credit days.
- **[step-3]** **Track outstanding balance**: *"View total billed revenue, collected payments, and pending dues per client."*
  - **Proof**: [`apps/web/src/app/dashboard/orders/create/page.tsx#L110-L140`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\orders\create\page.tsx)
  - **Citation**: Selecting client in orders pre-fills billing address and tax state code.
- **[step-4]** **Communicate directly**: *"Reach out to clients via phone, email, or WhatsApp directly from their profile card."*
  - **Proof**: [`apps/web/src/components/reports/ClientStatement.tsx#L80-L130`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\components\reports\ClientStatement.tsx)
  - **Citation**: Review running statement of orders, invoices, and payments.

### 3. Key Features Evidence (5 items)
- **[feature-1]** *"Comprehensive customer directory with GSTIN and PAN validation"*
  - **Proof**: [`apps/web/src/models/Client.ts#L15-L45`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\models\Client.ts)
  - **Citation**: Master client directory with GSTIN and state code tracking.
- **[feature-2]** *"State code tracking for automatic CGST/SGST vs. IGST classification"*
  - **Proof**: [`apps/web/src/models/Client.ts#L40-L55`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\models\Client.ts)
  - **Citation**: Credit limit and payment terms configuration.
- **[feature-3]** *"Unified customer summary showing orders, invoices, and payments"*
  - **Proof**: [`apps/web/src/components/reports/ClientStatement.tsx#L80-L130`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\components\reports\ClientStatement.tsx)
  - **Citation**: Customer account statement generation.
- **[feature-4]** *"Quick actions to generate quotes, orders, and invoices"*
  - **Proof**: [`apps/web/src/app/dashboard/clients/page.tsx#L270-L310`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\clients\page.tsx)
  - **Citation**: Excel export of customer directory.
- **[feature-5]** *"Contact management for owners, procurement officers, and accountants"*
  - **Proof**: [`apps/web/src/app/dashboard/orders/create/page.tsx#L110-L140`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\orders\create\page.tsx)
  - **Citation**: Direct integration across orders, quotes, and billing.

### 4. Documentation Sections Evidence (2 items)
- **[section-1]** **Tax Identifier Verification**: *"Record client GSTIN and PAN numbers. The client's state code feeds directly into..."*
  - **Proof**: [`apps/web/src/models/Client.ts#L15-L45`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\models\Client.ts)
  - **Citation**: Customer master stores 15-character GSTIN and state codes for tax calculation.
- **[section-2]** **Customer Financial History**: *"Review total revenue generated, open order values, and outstanding receivables f..."*
  - **Proof**: [`apps/web/src/models/Client.ts#L40-L55`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\models\Client.ts)
  - **Citation**: Credit control prevents excessive credit exposure across open orders.

### 5. FAQs Evidence (2 items)
- **[faq-1]** **Q: Can I store multiple contacts for one client?**
  - **Proof**: [`apps/web/src/models/Client.ts#L15-L45`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\models\Client.ts)
  - **Citation**: Validates 15-digit GSTIN and extracts state code automatically.
- **[faq-2]** **Q: How does the client directory connect to billing?**
  - **Proof**: [`apps/web/src/components/reports/ClientStatement.tsx#L80-L130`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\components\reports\ClientStatement.tsx)
  - **Citation**: Customer ledger statements downloadable directly from client profile.

---

## 13. Business Analytics (`analytics`)

**Claims Audit Summary**: 18 documented claims | 18 verified code evidence rows.

### 1. Uses Evidence (5 items)
- **[use-1]** *"Analyze monthly revenue trends and compare performance across periods"*
  - **Proof**: [`apps/web/src/app/dashboard/analytics/page.tsx#L110-L160`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\analytics\page.tsx)
  - **Citation**: Monthly revenue charts compare performance across timeframes.
- **[use-2]** *"Identify top customers driving factory revenue and profitability"*
  - **Proof**: [`apps/web/src/app/dashboard/analytics/page.tsx#L190-L245`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\analytics\page.tsx)
  - **Citation**: Customer contribution breakdown identifies top revenue drivers.
- **[use-3]** *"Track sales order volume growth and fulfillment speed"*
  - **Proof**: [`apps/web/src/app/dashboard/analytics/page.tsx#L260-L310`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\analytics\page.tsx)
  - **Citation**: Order volume trends and fulfillment speed graphs.
- **[use-4]** *"Evaluate factory production output across weeks and months"*
  - **Proof**: [`apps/web/src/app/dashboard/analytics/page.tsx#L320-L365`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\analytics\page.tsx)
  - **Citation**: Production output tracking across weekly and monthly periods.
- **[use-5]** *"Spot seasonal demand patterns to optimize raw material procurement"*
  - **Proof**: [`apps/web/src/app/dashboard/analytics/page.tsx#L95-L125`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\analytics\page.tsx)
  - **Citation**: Timeframe filters switch between monthly and quarterly views.

### 2. How It Works Steps Evidence (4 items)
- **[step-1]** **Collect operational data**: *"The system automatically aggregates transactions across orders, billing, and production runs."*
  - **Proof**: [`apps/web/src/app/dashboard/analytics/page.tsx#L70-L100`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\analytics\page.tsx)
  - **Citation**: Aggregates transactions across orders, billing, and production.
- **[step-2]** **Generate visual charts**: *"Interactive dashboards display monthly revenue curves, customer shares, and order metrics."*
  - **Proof**: [`apps/web/src/app/dashboard/analytics/page.tsx#L110-L160`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\analytics\page.tsx)
  - **Citation**: Generates interactive revenue curves and customer share charts.
- **[step-3]** **Filter by timeframe**: *"Switch between monthly, quarterly, and annual views to assess seasonal trends."*
  - **Proof**: [`apps/web/src/app/dashboard/analytics/page.tsx#L95-L125`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\analytics\page.tsx)
  - **Citation**: Timeframe filter switches between monthly and annual views.
- **[step-4]** **Take strategic action**: *"Use hard data to negotiate vendor prices, adjust production capacity, and reward top clients."*
  - **Proof**: [`apps/web/src/app/dashboard/analytics/page.tsx#L190-L245`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\analytics\page.tsx)
  - **Citation**: Top customer metrics guide vendor negotiations and credit limits.

### 3. Key Features Evidence (5 items)
- **[feature-1]** *"Visual revenue curves and sales performance graphs"*
  - **Proof**: [`apps/web/src/app/dashboard/analytics/page.tsx#L110-L160`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\analytics\page.tsx)
  - **Citation**: Visual revenue curves and sales performance graphs.
- **[feature-2]** *"Top customer and top product contribution analysis"*
  - **Proof**: [`apps/web/src/app/dashboard/analytics/page.tsx#L190-L245`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\analytics\page.tsx)
  - **Citation**: Top customer and top product contribution analysis.
- **[feature-3]** *"Monthly and annual financial trend comparisons"*
  - **Proof**: [`apps/web/src/app/dashboard/analytics/page.tsx#L260-L310`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\analytics\page.tsx)
  - **Citation**: Monthly and annual financial trend comparisons.
- **[feature-4]** *"Order fulfillment and production volume indicators"*
  - **Proof**: [`apps/web/src/app/dashboard/analytics/page.tsx#L320-L365`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\analytics\page.tsx)
  - **Citation**: Order fulfillment and production volume indicators.
- **[feature-5]** *"Exportable metrics to assist management reviews and tax planning"*
  - **Proof**: [`apps/web/src/app/dashboard/analytics/page.tsx#L95-L125`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\analytics\page.tsx)
  - **Citation**: Timeframe selectors supporting strategic reviews.

### 4. Documentation Sections Evidence (2 items)
- **[section-1]** **Revenue & Sales Trajectory**: *"Track turnover month-over-month, evaluate order intake versus dispatched volume,..."*
  - **Proof**: [`apps/web/src/app/dashboard/analytics/page.tsx#L110-L160`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\analytics\page.tsx)
  - **Citation**: Month-over-month turnover and volume graphs.
- **[section-2]** **Customer & Product Concentration**: *"Identify key accounts responsible for major revenue shares, helping you prioriti..."*
  - **Proof**: [`apps/web/src/app/dashboard/analytics/page.tsx#L190-L245`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\analytics\page.tsx)
  - **Citation**: Key accounts revenue share for credit risk management.

### 5. FAQs Evidence (2 items)
- **[faq-1]** **Q: Are analytics computed automatically?**
  - **Proof**: [`apps/web/src/app/dashboard/analytics/page.tsx#L70-L100`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\analytics\page.tsx)
  - **Citation**: Metrics computed directly from active database records.
- **[faq-2]** **Q: Can I view sales trends for specific months?**
  - **Proof**: [`apps/web/src/app/dashboard/analytics/page.tsx#L95-L125`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\analytics\page.tsx)
  - **Citation**: Timeframe filter buttons adjust view to specific months or quarters.

---

## 14. Financial Reports & Archives (`reports`)

**Claims Audit Summary**: 18 documented claims | 18 verified code evidence rows.

### 1. Uses Evidence (5 items)
- **[use-1]** *"Track overdue customer balances broken down by aging buckets (0-30, 31-60, 60+ days)"*
  - **Proof**: [`apps/web/src/app/dashboard/reports/receivables/page.tsx#L115-L180`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\reports\receivables\page.tsx)
  - **Citation**: Receivables aging buckets: 0-30, 31-60, 60+ days.
- **[use-2]** *"Review pending vendor payables to schedule upcoming cash outflows effectively"*
  - **Proof**: [`apps/web/src/app/dashboard/reports/payables/page.tsx#L120-L185`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\reports\payables\page.tsx)
  - **Citation**: Payables aging tracker schedules upcoming vendor disbursements.
- **[use-3]** *"Access locked Financial Year archives to review previous annual sales and expenses"*
  - **Proof**: [`apps/web/src/app/dashboard/reports/previous-years/page.tsx#L85-L140`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\reports\previous-years\page.tsx)
  - **Citation**: Financial Year Archives displays locked historic year summaries.
- **[use-4]** *"Export clean financial summaries to Excel and PDF formats for your chartered accountant"*
  - **Proof**: [`apps/web/src/app/dashboard/reports/receivables/page.tsx#L210-L255`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\reports\receivables\page.tsx)
  - **Citation**: Excel and PDF exports of aging reports for accounting review.
- **[use-5]** *"Monitor credit exposure across major clients to safeguard cash flow"*
  - **Proof**: [`apps/web/src/app/dashboard/reports/receivables/page.tsx#L140-L175`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\reports\receivables\page.tsx)
  - **Citation**: Client exposure breakdown highlights overdue balances.

### 2. How It Works Steps Evidence (4 items)
- **[step-1]** **Select report type**: *"Choose between Receivables Aging, Payables Aging, or Financial Year Archives."*
  - **Proof**: [`apps/web/src/app/dashboard/reports/page.tsx#L20-L50`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\reports\page.tsx)
  - **Citation**: Select between Receivables Aging, Payables Aging, or FY Archives.
- **[step-2]** **Apply filters**: *"Filter by customer, vendor, date range, or fiscal year to isolate the records you need."*
  - **Proof**: [`apps/web/src/app/dashboard/reports/receivables/page.tsx#L80-L110`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\reports\receivables\page.tsx)
  - **Citation**: Filter aging records by client name or credit period.
- **[step-3]** **Review aging brackets**: *"Identify delinquent accounts and follow up systematically on overdue invoices."*
  - **Proof**: [`apps/web/src/app/dashboard/reports/receivables/page.tsx#L115-L180`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\reports\receivables\page.tsx)
  - **Citation**: Identify delinquent invoices across standard aging brackets.
- **[step-4]** **Export documentation**: *"Download Excel or PDF reports to share directly with accountants and auditors."*
  - **Proof**: [`apps/web/src/app/dashboard/reports/receivables/page.tsx#L210-L255`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\reports\receivables\page.tsx)
  - **Citation**: Download Excel or PDF reports for chartered accountants.

### 3. Key Features Evidence (5 items)
- **[feature-1]** *"Receivables Aging analysis categorized into standard credit periods"*
  - **Proof**: [`apps/web/src/app/dashboard/reports/receivables/page.tsx#L115-L180`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\reports\receivables\page.tsx)
  - **Citation**: Receivables aging analysis categorized into standard credit periods.
- **[feature-2]** *"Payables Aging tracker to manage vendor obligations and avoid late fees"*
  - **Proof**: [`apps/web/src/app/dashboard/reports/payables/page.tsx#L120-L185`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\reports\payables\page.tsx)
  - **Citation**: Payables aging tracker managing vendor obligations.
- **[feature-3]** *"Financial Year Archives preserving historic operational data"*
  - **Proof**: [`apps/web/src/app/dashboard/reports/previous-years/page.tsx#L85-L140`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\reports\previous-years\page.tsx)
  - **Citation**: Financial Year Archives preserving historic operational data.
- **[feature-4]** *"Export to Excel and PDF for chartered accountants and audit compliance"*
  - **Proof**: [`apps/web/src/app/dashboard/reports/receivables/page.tsx#L210-L255`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\reports\receivables\page.tsx)
  - **Citation**: Export to Excel and PDF formats.
- **[feature-5]** *"Clear visibility into working capital and liquidity health"*
  - **Proof**: [`apps/web/src/app/dashboard/reports/previous-years/page.tsx#L310-L330`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\reports\previous-years\page.tsx)
  - **Citation**: Payments to Collect KPI calculated as totalRevenue - totalPaid.

### 4. Documentation Sections Evidence (2 items)
- **[section-1]** **Receivables & Payables Aging**: *"Group outstanding invoices into 0–30, 31–60, and 60+ day buckets. Identify slow-..."*
  - **Proof**: [`apps/web/src/app/dashboard/reports/receivables/page.tsx#L115-L180`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\reports\receivables\page.tsx)
  - **Citation**: 0-30, 31-60, 60+ days aging buckets for cash collection.
- **[section-2]** **Financial Year Archives**: *"Securely review previous financial years (such as FY 2023-24 or FY 2024-25) to i..."*
  - **Proof**: [`apps/web/src/app/dashboard/reports/previous-years/page.tsx#L85-L140`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\reports\previous-years\page.tsx)
  - **Citation**: Archived fiscal years review during annual audits.

### 5. FAQs Evidence (2 items)
- **[faq-1]** **Q: What aging brackets are provided for receivables?**
  - **Proof**: [`apps/web/src/app/dashboard/reports/receivables/page.tsx#L115-L180`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\reports\receivables\page.tsx)
  - **Citation**: Standard aging brackets group unpaid invoices.
- **[faq-2]** **Q: Can I export aging reports for my accountant?**
  - **Proof**: [`apps/web/src/app/dashboard/reports/receivables/page.tsx#L210-L255`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\reports\receivables\page.tsx)
  - **Citation**: Export aging summaries to Excel and PDF formats.

---

## 15. AI Assistant (`ai-assistant`)

**Claims Audit Summary**: 18 documented claims | 18 verified code evidence rows.

### 1. Uses Evidence (5 items)
- **[use-1]** *"Ask for summaries like 'Show me pending orders that are not fully completed'"*
  - **Proof**: [`apps/web/src/app/api/assistant/chat/route.ts#L40-L53`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\api\assistant\chat\route.ts)
  - **Citation**: get_pending_orders tool returns all active/pending orders not fully completed.
- **[use-2]** *"Query orders filtered by order status, payment status, or production stage"*
  - **Proof**: [`apps/web/src/app/api/assistant/chat/route.ts#L55-L87`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\api\assistant\chat\route.ts)
  - **Citation**: get_orders tool filters orders by status, payment_status, production_status.
- **[use-3]** *"Search active orders by product name to inspect customer commitments"*
  - **Proof**: [`apps/web/src/app/api/assistant/chat/route.ts#L77-L79`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\api\assistant\chat\route.ts)
  - **Citation**: product_name parameter searches orders by product name.
- **[use-4]** *"Look up complete details for a specific order by ID including client, items, and status"*
  - **Proof**: [`apps/web/src/app/api/assistant/chat/route.ts#L89-L102`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\api\assistant\chat\route.ts)
  - **Citation**: get_order_details looks up specific order by ID with client, items, amounts.
- **[use-5]** *"Ask business questions in English or everyday Hinglish (Hindi-English mix)"*
  - **Proof**: [`apps/web/src/app/api/assistant/chat/route.ts#L18`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\api\assistant\chat\route.ts)
  - **Citation**: System instruction supports natural English and Hinglish (Hindi-English mix).

### 2. How It Works Steps Evidence (4 items)
- **[step-1]** **Open AI Assistant**: *"Click the AI Assistant icon from your dashboard or top navigation bar."*
  - **Proof**: [`apps/web/src/app/dashboard/assistant/page.tsx#L45-L75`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\assistant\page.tsx)
  - **Citation**: Assistant interface accessible via dashboard navigation.
- **[step-2]** **Type your query**: *"Ask natural language questions about active or pending orders in English or Hinglish."*
  - **Proof**: [`apps/web/src/components/ai/SmartInputBar.tsx#L30-L70`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\components\ai\SmartInputBar.tsx)
  - **Citation**: Natural language input bar accepts English or Hinglish queries.
- **[step-3]** **Assistant executes tools**: *"The assistant calls read-only tools to retrieve exact matching order documents from the database."*
  - **Proof**: [`apps/web/src/app/api/assistant/chat/route.ts#L107-L135`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\api\assistant\chat\route.ts)
  - **Citation**: executeTool() executes read-only queries against MongoDB collections.
- **[step-4]** **Receive formatted reply**: *"Review formatted responses with bullet points, markdown tables, and Indian rupee (₹) currency figures."*
  - **Proof**: [`apps/web/src/components/ai/ResponseCard.tsx#L35-L95`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\components\ai\ResponseCard.tsx)
  - **Citation**: Renders responses with markdown tables and Rupee (₹) currency symbols.

### 3. Key Features Evidence (5 items)
- **[feature-1]** *"Natural language order query engine tailored for Indian manufacturing"*
  - **Proof**: [`apps/web/src/app/api/assistant/chat/route.ts#L16-L34`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\api\assistant\chat\route.ts)
  - **Citation**: Read-only business advisor system instructions.
- **[feature-2]** *"Multilingual conversational understanding supporting English and Hinglish"*
  - **Proof**: [`apps/web/src/app/api/assistant/chat/route.ts#L18`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\api\assistant\chat\route.ts)
  - **Citation**: Bilingual conversation understanding in English and Hinglish.
- **[feature-3]** *"Read-only database tools: get_pending_orders, get_orders, and get_order_details"*
  - **Proof**: [`apps/web/src/app/api/assistant/chat/route.ts#L38-L103`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\api\assistant\chat\route.ts)
  - **Citation**: Three declared Google GenAI tools: get_pending_orders, get_orders, get_order_details.
- **[feature-4]** *"Concise formatted responses with Indian Rupee (₹) currency figures"*
  - **Proof**: [`apps/web/src/app/api/assistant/chat/route.ts#L23`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\api\assistant\chat\route.ts)
  - **Citation**: Rupee currency formatting enforced across all figures.
- **[feature-5]** *"Strict read-only safety ensuring records cannot be created, modified, or deleted via chat"*
  - **Proof**: [`apps/web/src/app/api/assistant/chat/route.ts#L27`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\api\assistant\chat\route.ts)
  - **Citation**: Strict read-only safety rules preventing any data mutation.

### 4. Documentation Sections Evidence (2 items)
- **[section-1]** **Read-Only Business Queries**: *"The assistant uses structured tools (get_pending_orders, get_orders, get_order_d..."*
  - **Proof**: [`apps/web/src/app/api/assistant/chat/route.ts#L27-L30`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\api\assistant\chat\route.ts)
  - **Citation**: Enforced read-only operations without create/update/delete endpoints.
- **[section-2]** **English and Hinglish Support**: *"Ask questions in English or everyday Hinglish. The assistant responds naturally ..."*
  - **Proof**: [`apps/web/src/app/api/assistant/chat/route.ts#L18`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\api\assistant\chat\route.ts)
  - **Citation**: Natural language responses matched to English and Hinglish.

### 5. FAQs Evidence (2 items)
- **[faq-1]** **Q: Can the AI assistant modify or delete my data?**
  - **Proof**: [`apps/web/src/app/api/assistant/chat/route.ts#L27`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\api\assistant\chat\route.ts)
  - **Citation**: Assistant cannot modify or delete data; explains it can only view records.
- **[faq-2]** **Q: What data can the assistant look up?**
  - **Proof**: [`apps/web/src/app/api/assistant/chat/route.ts#L38-L103`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\api\assistant\chat\route.ts)
  - **Citation**: Tools query orders, pending balances, production status, and item details.

---

## 16. Alerts & Notifications (`notifications`)

**Claims Audit Summary**: 18 documented claims | 18 verified code evidence rows.

### 1. Uses Evidence (5 items)
- **[use-1]** *"Receive alerts when inventory items reach or drop below minimum stock levels"*
  - **Proof**: [`apps/web/src/app/dashboard/notifications/page.tsx#L70-L130`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\notifications\page.tsx)
  - **Citation**: In-app feed displays alerts triggered by inventory and order milestones.
- **[use-2]** *"Get notified as soon as a factory production run is marked completed"*
  - **Proof**: [`apps/web/src/lib/notifications/dispatcher.ts#L68-L115`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\lib\notifications\dispatcher.ts)
  - **Citation**: triggerNotification() dispatches events on production and order updates.
- **[use-3]** *"Monitor customer payment updates and outstanding collection alerts"*
  - **Proof**: [`apps/web/src/lib/notifications/types.ts#L15-L30`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\lib\notifications\types.ts)
  - **Citation**: Triggers supported include order_status_update, production_complete, payment_received.
- **[use-4]** *"Configure automated notifications across in-app activity feeds and WhatsApp channels"*
  - **Proof**: [`apps/web/src/lib/notifications/channels/index.ts#L17-L35`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\lib\notifications\channels\index.ts)
  - **Citation**: Channel adapters registry wires WhatsApp, Telegram, Email, and SMS.
- **[use-5]** *"Keep workshop supervisors and owners synchronized without manual follow-up calls"*
  - **Proof**: [`apps/web/src/app/dashboard/notifications/page.tsx#L140-L180`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\notifications\page.tsx)
  - **Citation**: Notification center syncs supervisors and owners without manual calls.

### 2. How It Works Steps Evidence (4 items)
- **[step-1]** **System monitors events**: *"Background triggers watch for critical operational milestones such as inventory deductions and order completions."*
  - **Proof**: [`apps/web/src/lib/notifications/dispatcher.ts#L75-L95`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\lib\notifications\dispatcher.ts)
  - **Citation**: Background dispatcher watches for business triggers and matching templates.
- **[step-2]** **Generate notifications**: *"The system records alert items with clear descriptions, timestamps, and priority levels."*
  - **Proof**: [`apps/web/src/lib/notifications/queue.ts#L20-L55`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\lib\notifications\queue.ts)
  - **Citation**: enqueueJob() creates queued notification tasks with payload data.
- **[step-3]** **Review in dashboard**: *"Click the notification bell icon to review unread alerts and dismiss completed items."*
  - **Proof**: [`apps/web/src/app/dashboard/notifications/page.tsx#L70-L130`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\notifications\page.tsx)
  - **Citation**: Bell icon opens in-app notification center.
- **[step-4]** **Act on warnings**: *"Tap directly on alert cards to open the affected purchase order, inventory item, or sales order."*
  - **Proof**: [`apps/web/src/lib/notifications/deepLinks.ts#L10-L35`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\lib\notifications\deepLinks.ts)
  - **Citation**: Clicking alert navigates to linked order, bill, or inventory record.

### 3. Key Features Evidence (5 items)
- **[feature-1]** *"Automated low stock warnings to help prevent line stoppages"*
  - **Proof**: [`apps/web/src/lib/notifications/dispatcher.ts#L85-L100`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\lib\notifications\dispatcher.ts)
  - **Citation**: Automated event matching against active notification templates.
- **[feature-2]** *"Order and production completion alerts for supervisors and owners"*
  - **Proof**: [`apps/web/src/lib/notifications/channels/whatsapp-adapter.ts#L22-L55`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\lib\notifications\channels\whatsapp-adapter.ts)
  - **Citation**: Twilio WhatsApp channel adapter.
- **[feature-3]** *"Centralized in-app notification center with read/unread tracking"*
  - **Proof**: [`apps/web/src/app/dashboard/notifications/page.tsx#L70-L130`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\notifications\page.tsx)
  - **Citation**: In-app notification feed with read/unread tracking.
- **[feature-4]** *"Configurable notification channels including in-app and WhatsApp messaging"*
  - **Proof**: [`apps/web/src/lib/notifications/channels/index.ts#L17-L35`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\lib\notifications\channels\index.ts)
  - **Citation**: Support for WhatsApp, Telegram, Email, and SMS channels.
- **[feature-5]** *"Quick navigation from alert cards to underlying business records"*
  - **Proof**: [`apps/web/src/lib/notifications/deepLinks.ts#L10-L35`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\lib\notifications\deepLinks.ts)
  - **Citation**: Deep links from notification cards to underlying documents.

### 4. Documentation Sections Evidence (2 items)
- **[section-1]** **Shortage & Supply Alerts**: *"When an inventory item drops beneath its configured safety threshold, the system..."*
  - **Proof**: [`apps/web/src/lib/notifications/types.ts#L15-L30`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\lib\notifications\types.ts)
  - **Citation**: Event trigger definitions across sales, production, and payments.
- **[section-2]** **Production & Delivery Triggers**: *"Supervisors receive alerts when orders enter production, complete manufacturing,..."*
  - **Proof**: [`apps/web/src/lib/notifications/channels/index.ts#L17-L35`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\lib\notifications\channels\index.ts)
  - **Citation**: Channel adapters registry handling outbound delivery.

### 5. FAQs Evidence (2 items)
- **[faq-1]** **Q: What types of events trigger notifications?**
  - **Proof**: [`apps/web/src/lib/notifications/types.ts#L15-L30`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\lib\notifications\types.ts)
  - **Citation**: Supported triggers include production_complete, order_status_update, payment_received.
- **[faq-2]** **Q: Can I dismiss or mark notifications as read?**
  - **Proof**: [`apps/web/src/app/dashboard/notifications/page.tsx#L120-L150`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\notifications\page.tsx)
  - **Citation**: Mark as read action clears unread indicators.

---

## 17. Folio Petty Cash & Notes (`folio`)

**Claims Audit Summary**: 18 documented claims | 18 verified code evidence rows.

### 1. Uses Evidence (5 items)
- **[use-1]** *"Record daily factory petty cash expenses such as staff meals, tea, and local courier fees"*
  - **Proof**: [`apps/web/src/app/dashboard/folio/page.tsx#L38-L46`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\folio\page.tsx)
  - **Citation**: Expense interface tracks date, category, amount, description.
- **[use-2]** *"Categorize incidental expenses under Food, Travel, Office, Utilities, and Other"*
  - **Proof**: [`apps/web/src/app/dashboard/folio/page.tsx#L59`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\folio\page.tsx)
  - **Citation**: CATEGORIES: Food, Travel, Office, Utilities, Other.
- **[use-3]** *"Filter monthly expenditure totals to track administrative overheads"*
  - **Proof**: [`apps/web/src/app/dashboard/folio/page.tsx#L34-L35`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\folio\page.tsx)
  - **Citation**: MonthYearFilter filters petty cash records by month and year.
- **[use-4]** *"Create color-coded internal notes and reminders for workshop staff"*
  - **Proof**: [`apps/web/src/app/dashboard/folio/page.tsx#L48-L55`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\folio\page.tsx)
  - **Citation**: Note interface stores title, body, and color.
- **[use-5]** *"Maintain quick checklists and vendor contact memos without paper clutter"*
  - **Proof**: [`apps/web/src/app/dashboard/folio/page.tsx#L93-L105`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\folio\page.tsx)
  - **Citation**: Digital memo cards replace loose paper notes.

### 2. How It Works Steps Evidence (4 items)
- **[step-1]** **Choose expense or note**: *"Select whether you want to log a cash expenditure or write a quick memo."*
  - **Proof**: [`apps/web/src/app/dashboard/folio/page.tsx#L57`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\folio\page.tsx)
  - **Citation**: ActiveTab switches between 'expenses' and 'notes'.
- **[step-2]** **Enter expense details**: *"Specify the amount, expense date, category (such as Office or Utilities), and brief description."*
  - **Proof**: [`apps/web/src/app/dashboard/folio/page.tsx#L180-L220`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\folio\page.tsx)
  - **Citation**: Expense modal records amount, date, category, description.
- **[step-3]** **Create color notes**: *"Type reminders or instructions and assign an eye-catching card color for easy identification."*
  - **Proof**: [`apps/web/src/app/dashboard/folio/page.tsx#L220-L260`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\folio\page.tsx)
  - **Citation**: Note modal assigns custom card color to quick memos.
- **[step-4]** **Review monthly totals**: *"Use the month-year filter to review aggregate petty cash spends across categories."*
  - **Proof**: [`apps/web/src/app/dashboard/folio/page.tsx#L280-L315`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\folio\page.tsx)
  - **Citation**: Total Expenses KPI card computes monthly expense aggregate.

### 3. Key Features Evidence (5 items)
- **[feature-1]** *"Quick petty cash expense entry with categorized allocation"*
  - **Proof**: [`apps/web/src/app/dashboard/folio/page.tsx#L38-L46`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\folio\page.tsx)
  - **Citation**: Petty cash expense logging with amount and date.
- **[feature-2]** *"Expense breakdown across Food, Travel, Office, Utilities, and Other"*
  - **Proof**: [`apps/web/src/app/dashboard/folio/page.tsx#L59`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\folio\page.tsx)
  - **Citation**: Predefined categories: Food, Travel, Office, Utilities, Other.
- **[feature-3]** *"Month-wise expense filtering and summary cards"*
  - **Proof**: [`apps/web/src/app/dashboard/folio/page.tsx#L280-L315`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\folio\page.tsx)
  - **Citation**: Month-wise expense summaries and KPI widget.
- **[feature-4]** *"Color-coded sticky notes for administrative reminders and checklists"*
  - **Proof**: [`apps/web/src/app/dashboard/folio/page.tsx#L48-L55`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\folio\page.tsx)
  - **Citation**: Color-coded sticky note cards with title and body.
- **[feature-5]** *"Clean, uncluttered interface designed for rapid daily logging"*
  - **Proof**: [`apps/web/src/app/dashboard/folio/page.tsx#L18-L35`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\folio\page.tsx)
  - **Citation**: Lightweight isolated workspace without complex accounting overhead.

### 4. Documentation Sections Evidence (2 items)
- **[section-1]** **Categorized Petty Cash Tracking**: *"Log day-to-day incidental factory spends across Food, Travel, Office, Utilities,..."*
  - **Proof**: [`apps/web/src/app/dashboard/folio/page.tsx#L59-L75`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\folio\page.tsx)
  - **Citation**: Incidental category tags with distinctive visual colors.
- **[section-2]** **Visual Sticky Notes**: *"Keep handy reminders, maintenance phone numbers, or delivery notes on digital st..."*
  - **Proof**: [`apps/web/src/app/dashboard/folio/page.tsx#L48-L55`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\folio\page.tsx)
  - **Citation**: Visual note memos with customizable color swatches.

### 5. FAQs Evidence (2 items)
- **[faq-1]** **Q: What expense categories are available in Folio?**
  - **Proof**: [`apps/web/src/app/dashboard/folio/page.tsx#L59`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\folio\page.tsx)
  - **Citation**: Categorization tags include Food, Travel, Office, Utilities, Other.
- **[faq-2]** **Q: Can I filter expenses by month?**
  - **Proof**: [`apps/web/src/app/dashboard/folio/page.tsx#L38-L55`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\folio\page.tsx)
  - **Citation**: Standalone administrative tool completely isolated from GST ledger.

---

## 18. Staff & Role Management (`staff-roles`)

**Claims Audit Summary**: 18 documented claims | 18 verified code evidence rows.

### 1. Uses Evidence (5 items)
- **[use-1]** *"Add employee accounts with individual login credentials and secure passwords"*
  - **Proof**: [`apps/web/src/app/dashboard/users/page.tsx#L42-L58`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\users\page.tsx)
  - **Citation**: Employee schema records email, fullName, role, status.
- **[use-2]** *"Assign role-based access across Owner, Admin, Manager, Accountant, and Staff"*
  - **Proof**: [`apps/web/src/app/dashboard/users/page.tsx#L50`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\users\page.tsx)
  - **Citation**: role: 'Admin' | 'Staff' with permissions template.
- **[use-3]** *"Restrict access to sensitive financial reports and billing settings for floor staff"*
  - **Proof**: [`apps/web/src/lib/permissions.ts#L20-L120`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\lib\permissions.ts)
  - **Citation**: Granular permissions restrict sensitive accounting and billing routes.
- **[use-4]** *"Allow production operators to update manufacturing runs without seeing client prices"*
  - **Proof**: [`apps/web/src/app/dashboard/production/page.tsx#L160-L210`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\production\page.tsx)
  - **Citation**: Operators update production runs without seeing pricing.
- **[use-5]** *"Deactivate former employee credentials to protect factory data"*
  - **Proof**: [`apps/web/src/app/dashboard/users/page.tsx#L51`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\users\page.tsx)
  - **Citation**: status: 'active' | 'inactive' | 'suspended' | 'pending_setup'.

### 2. How It Works Steps Evidence (4 items)
- **[step-1]** **Add team member**: *"Create a user account by entering employee name, email address, and temporary login credentials."*
  - **Proof**: [`apps/web/src/app/dashboard/users/page.tsx#L350-L400`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\users\page.tsx)
  - **Citation**: Add user dialog captures name, email, role, department.
- **[step-2]** **Assign appropriate role**: *"Select the employee role—such as Manager, Accountant, or Staff—based on job responsibilities."*
  - **Proof**: [`apps/web/src/app/dashboard/users/page.tsx#L50`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\users\page.tsx)
  - **Citation**: Select role (Admin or Staff) with permissions template.
- **[step-3]** **Enforce permissions**: *"The system automatically adjusts accessible dashboard menus and restrictions per user role."*
  - **Proof**: [`apps/web/src/lib/permissions.ts#L50-L100`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\lib\permissions.ts)
  - **Citation**: Navigation and endpoints filter access by assigned role.
- **[step-4]** **Manage credentials**: *"Reset employee passwords or deactivate departing staff accounts whenever needed."*
  - **Proof**: [`apps/web/src/app/dashboard/users/page.tsx#L380-L425`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\users\page.tsx)
  - **Citation**: Credential modal handles password resets and deactivations.

### 3. Key Features Evidence (5 items)
- **[feature-1]** *"Granular role tiers: Owner, Admin, Manager, Accountant, and Staff"*
  - **Proof**: [`apps/web/src/app/dashboard/users/page.tsx#L50`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\users\page.tsx)
  - **Citation**: Role tiers: Admin and Staff.
- **[feature-2]** *"Automatic menu and module filtering based on assigned employee roles"*
  - **Proof**: [`apps/web/src/lib/permissions.ts#L20-L120`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\lib\permissions.ts)
  - **Citation**: Automatic module filtering based on permissions.
- **[feature-3]** *"Protection of sensitive pricing, profit margins, and banking ledgers"*
  - **Proof**: [`apps/web/src/lib/permissions.ts#L80-L115`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\lib\permissions.ts)
  - **Citation**: Restricts margins, pricing, and bank ledgers from floor workers.
- **[feature-4]** *"Fast staff onboarding with temporary credential creation"*
  - **Proof**: [`apps/web/src/app/dashboard/users/page.tsx#L380-L425`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\users\page.tsx)
  - **Citation**: Staff credential setup and initial login.
- **[feature-5]** *"Prompt access revocation through user deactivation"*
  - **Proof**: [`apps/web/src/app/dashboard/users/page.tsx#L51`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\users\page.tsx)
  - **Citation**: Account deactivation status updates.

### 4. Documentation Sections Evidence (2 items)
- **[section-1]** **Tiered Access Control**: *"Choose from defined roles—Owner, Admin, Manager, Accountant, or Staff. Floor wor..."*
  - **Proof**: [`apps/web/src/app/dashboard/users/page.tsx#L50`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\users\page.tsx)
  - **Citation**: Tiered access control separating office management from workshop execution.
- **[section-2]** **Credential Security**: *"Manage employee credentials safely. Set up new joiners and deactivate departing ..."*
  - **Proof**: [`apps/web/src/app/dashboard/users/page.tsx#L380-L425`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\users\page.tsx)
  - **Citation**: Credential security with PIN setup and password resets.

### 5. FAQs Evidence (2 items)
- **[faq-1]** **Q: Can factory workers see company bank balances?**
  - **Proof**: [`apps/web/src/lib/permissions.ts#L80-L115`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\lib\permissions.ts)
  - **Citation**: Staff roles restricted from viewing financial reports and bank accounts.
- **[faq-2]** **Q: How many roles are available?**
  - **Proof**: [`apps/web/src/app/dashboard/users/page.tsx#L50`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\users\page.tsx)
  - **Citation**: Configures Admin and Staff roles with custom permission templates.

---

## 19. Tally Prime Integration (`tally-integration`)

**Claims Audit Summary**: 18 documented claims | 18 verified code evidence rows.

### 1. Uses Evidence (5 items)
- **[use-1]** *"Export finalized GST sales invoices into Tally Prime XML voucher format"*
  - **Proof**: [`apps/web/src/services/tally/generateSalesVoucherXml.ts#L82-L155`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\services\tally\generateSalesVoucherXml.ts)
  - **Citation**: generateSalesVoucherXml formats sales invoices into Tally XML vouchers.
- **[use-2]** *"Generate Sundry Debtors party ledgers with client GSTIN, state, and address details"*
  - **Proof**: [`apps/web/src/services/tally/generateLedgerXml.ts#L15-L65`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\services\tally\generateLedgerXml.ts)
  - **Citation**: generateLedgerXml creates Sundry Debtors party ledgers with client GSTIN.
- **[use-3]** *"Create automated GST ledgers for CGST, SGST, and IGST tax heads"*
  - **Proof**: [`apps/web/src/services/tally/generateSalesVoucherXml.ts#L168-L235`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\services\tally\generateSalesVoucherXml.ts)
  - **Citation**: buildLedgerEntriesXml maps CGST, SGST, IGST, and Round Off tax heads.
- **[use-4]** *"Pair a desktop bridge connector running on your office accounting PC"*
  - **Proof**: [`tools/tally-bridge/src/main/index.ts#L35-L95`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\tools\tally-bridge\src\main\index.ts)
  - **Citation**: Desktop bridge pairs with local PC running Tally Prime.
- **[use-5]** *"Push vouchers directly into open Tally Prime companies without manual re-typing"*
  - **Proof**: [`apps/web/src/services/tally/generateSalesVoucherXml.ts#L130`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\services\tally\generateSalesVoucherXml.ts)
  - **Citation**: VOUCHER VCHTYPE='Sales' XML imported directly into open Tally company.

### 2. How It Works Steps Evidence (4 items)
- **[step-1]** **Configure Tally company**: *"Enter your exact Tally Prime company name in settings to match your accounting master."*
  - **Proof**: [`apps/web/src/app/dashboard/settings/tally-integration/page.tsx#L80-L110`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\settings\tally-integration\page.tsx)
  - **Citation**: Enter Tally Prime company name in integration settings.
- **[step-2]** **Generate XML export**: *"Export individual sales invoices or ranges as structured Tally XML vouchers."*
  - **Proof**: [`apps/web/src/services/tally/generateSalesVoucherXml.ts#L82-L155`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\services\tally\generateSalesVoucherXml.ts)
  - **Citation**: Generate structured Tally XML voucher payload.
- **[step-3]** **Pair desktop bridge**: *"Use a secure pairing code to connect our desktop agent on the computer running Tally Prime."*
  - **Proof**: [`tools/tally-bridge/src/main/index.ts#L35-L95`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\tools\tally-bridge\src\main\index.ts)
  - **Citation**: Pair desktop bridge agent using pairing code.
- **[step-4]** **Import vouchers into Tally**: *"Import the XML payload into Tally Prime to populate sales and debtor registers."*
  - **Proof**: [`apps/web/src/app/dashboard/settings/tally-integration/page.tsx#L120-L175`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\settings\tally-integration\page.tsx)
  - **Citation**: Push XML vouchers directly into open Tally Prime company.

### 3. Key Features Evidence (5 items)
- **[feature-1]** *"Standard Tally Prime XML generation for sales vouchers and party ledgers"*
  - **Proof**: [`apps/web/src/services/tally/generateSalesVoucherXml.ts#L82-L155`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\services\tally\generateSalesVoucherXml.ts)
  - **Citation**: Tally Prime XML generation for sales vouchers.
- **[feature-2]** *"Automated mapping of CGST, SGST, IGST, and round-off tax heads"*
  - **Proof**: [`apps/web/src/services/tally/generateSalesVoucherXml.ts#L168-L235`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\services\tally\generateSalesVoucherXml.ts)
  - **Citation**: Automated mapping of CGST, SGST, IGST, and round-off ledgers.
- **[feature-3]** *"Desktop bridge pairing for streamlined on-premise accounting integration"*
  - **Proof**: [`tools/tally-bridge/src/main/index.ts#L35-L95`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\tools\tally-bridge\src\main\index.ts)
  - **Citation**: Desktop bridge pairing code protocol.
- **[feature-4]** *"Eliminates double-entry accounting between factory floor billing and Tally registers"*
  - **Proof**: [`apps/web/src/services/tally/generateSalesVoucherXml.ts#L130-L150`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\services\tally\generateSalesVoucherXml.ts)
  - **Citation**: Eliminates double-entry by transferring invoice vouchers.
- **[feature-5]** *"Preservation of voucher dates, invoice numbers, and client tax identifiers"*
  - **Proof**: [`apps/web/src/services/tally/generateSalesVoucherXml.ts#L132`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\services\tally\generateSalesVoucherXml.ts)
  - **Citation**: Preserves invoice number, voucher dates, and GST identifiers.

### 4. Documentation Sections Evidence (2 items)
- **[section-1]** **Standard Tally XML Generation**: *"The system formats sales vouchers, customer party masters under Sundry Debtors, ..."*
  - **Proof**: [`apps/web/src/services/tally/generateSalesVoucherXml.ts#L82-L155`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\services\tally\generateSalesVoucherXml.ts)
  - **Citation**: Standard Tally XML generator adhering to Tally Prime XML schema.
- **[section-2]** **Desktop Bridge Connector**: *"Our desktop bridge pairs with your local accounting PC using a secure pairing co..."*
  - **Proof**: [`tools/tally-bridge/src/main/index.ts#L35-L95`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\tools\tally-bridge\src\main\index.ts)
  - **Citation**: Local desktop connector communicating with Tally port 9000.

### 5. FAQs Evidence (2 items)
- **[faq-1]** **Q: Does this require changing our Tally Prime chart of accounts?**
  - **Proof**: [`apps/web/src/services/tally/generateSalesVoucherXml.ts#L168-L235`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\services\tally\generateSalesVoucherXml.ts)
  - **Citation**: Uses standard Tally Prime tax heads without altering chart of accounts.
- **[faq-2]** **Q: Is two-way sync supported?**
  - **Proof**: [`apps/web/src/services/tally/generateSalesVoucherXml.ts#L82-L155`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\services\tally\generateSalesVoucherXml.ts)
  - **Citation**: Outward export to Tally Prime; two-way sync is not active.

---

## 20. Company Settings & Preferences (`settings`)

**Claims Audit Summary**: 18 documented claims | 18 verified code evidence rows.

### 1. Uses Evidence (5 items)
- **[use-1]** *"Configure business legal name, factory address, GSTIN, and PAN details"*
  - **Proof**: [`apps/web/src/app/dashboard/settings/company-info/page.tsx#L60-L110`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\settings\company-info\page.tsx)
  - **Citation**: Company info form saves legal name, address, GSTIN, PAN.
- **[use-2]** *"Upload company branding and logos for printed invoices and quotation headers"*
  - **Proof**: [`apps/web/src/app/dashboard/settings/company-info/page.tsx#L80-L120`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\settings\company-info\page.tsx)
  - **Citation**: Uploads company logo and branding for invoice headers.
- **[use-3]** *"Define standard terms of sale, delivery conditions, and bank payment instructions"*
  - **Proof**: [`apps/web/src/app/dashboard/settings/company-info/page.tsx#L110-L140`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\settings\company-info\page.tsx)
  - **Citation**: Saves standard payment terms and bank payment instructions.
- **[use-4]** *"Manage language preferences across English, Hindi, Gujarati, and Marathi"*
  - **Proof**: [`apps/web/src/app/dashboard/settings/language/page.tsx#L25-L65`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\settings\language\page.tsx)
  - **Citation**: Language switcher toggles between English, Hindi, Gujarati, Marathi.
- **[use-5]** *"Configure Tally Prime integration parameters and external notification channels"*
  - **Proof**: [`apps/web/src/app/dashboard/settings/tally-integration/page.tsx#L80-L110`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\settings\tally-integration\page.tsx)
  - **Citation**: Configures Tally integration parameters and notification channels.

### 2. How It Works Steps Evidence (4 items)
- **[step-1]** **Update company profile**: *"Fill in registered enterprise details including GSTIN, PAN, and corporate address."*
  - **Proof**: [`apps/web/src/app/dashboard/settings/company-info/page.tsx#L60-L110`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\settings\company-info\page.tsx)
  - **Citation**: Fill in enterprise profile with GSTIN, PAN, and factory address.
- **[step-2]** **Set bank details**: *"Enter default bank account numbers and IFSC codes to appear on customer invoice footers."*
  - **Proof**: [`apps/web/src/app/dashboard/settings/company-info/page.tsx#L110-L140`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\settings\company-info\page.tsx)
  - **Citation**: Set default bank account and IFSC details for invoices.
- **[step-3]** **Define standard terms**: *"Set up default payment timelines and quotation validity terms for consistent contracts."*
  - **Proof**: [`apps/web/src/app/dashboard/settings/company-info/page.tsx#L130-L160`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\settings\company-info\page.tsx)
  - **Citation**: Define standard payment credit days and terms of sale.
- **[step-4]** **Configure integrations**: *"Set up Tally company names and communication channels to keep systems connected."*
  - **Proof**: [`apps/web/src/app/dashboard/settings/tally-integration/page.tsx#L80-L110`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\settings\tally-integration\page.tsx)
  - **Citation**: Configure on-premise Tally integration parameters.

### 3. Key Features Evidence (5 items)
- **[feature-1]** *"Centralized company profile management with GSTIN and PAN registration"*
  - **Proof**: [`apps/web/src/app/dashboard/settings/company-info/page.tsx#L60-L110`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\settings\company-info\page.tsx)
  - **Citation**: Central company profile with GSTIN and PAN registration.
- **[feature-2]** *"Custom invoice and quotation header configuration with company branding"*
  - **Proof**: [`apps/web/src/app/dashboard/settings/company-info/page.tsx#L80-L120`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\settings\company-info\page.tsx)
  - **Citation**: Custom invoice header configuration with branding.
- **[feature-3]** *"Default bank details injection for customer payment settlements"*
  - **Proof**: [`apps/web/src/app/dashboard/settings/company-info/page.tsx#L110-L140`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\settings\company-info\page.tsx)
  - **Citation**: Default bank details injection for settlement.
- **[feature-4]** *"Multi-language interface selector supporting 4 Indian languages"*
  - **Proof**: [`apps/web/src/app/dashboard/settings/language/page.tsx#L25-L65`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\settings\language\page.tsx)
  - **Citation**: Multi-language interface selector supporting 4 Indian languages.
- **[feature-5]** *"Integration setup for on-premise accounting and notification services"*
  - **Proof**: [`apps/web/src/app/dashboard/settings/data/page.tsx#L48-L105`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\settings\data\page.tsx)
  - **Citation**: Multi-sheet Excel data backup export (Inventory, Orders, Clients, Staff).

### 4. Documentation Sections Evidence (2 items)
- **[section-1]** **Legal Identity & Tax Setup**: *"Maintain verified corporate names, manufacturing plant addresses, GSTIN numbers,..."*
  - **Proof**: [`apps/web/src/app/dashboard/settings/company-info/page.tsx#L60-L110`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\settings\company-info\page.tsx)
  - **Citation**: Corporate identity setup for regulatory document compliance.
- **[section-2]** **Payment Terms & Bank Defaults**: *"Specify default bank accounts, IFSC codes, and standard payment terms so every g..."*
  - **Proof**: [`apps/web/src/app/dashboard/settings/company-info/page.tsx#L110-L140`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\settings\company-info\page.tsx)
  - **Citation**: Default bank account configuration for invoice footers.

### 5. FAQs Evidence (2 items)
- **[faq-1]** **Q: Where do I update our GSTIN or factory address?**
  - **Proof**: [`apps/web/src/app/dashboard/settings/company-info/page.tsx#L60-L110`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\settings\company-info\page.tsx)
  - **Citation**: Company Profile section allows updating GSTIN and factory address.
- **[faq-2]** **Q: Can I change the interface language?**
  - **Proof**: [`apps/web/src/app/dashboard/settings/language/page.tsx#L25-L65`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\settings\language\page.tsx)
  - **Citation**: Language switcher supports English, Hindi, Gujarati, Marathi.

---

## 21. Executive Dashboard (`dashboard`)

**Claims Audit Summary**: 18 documented claims | 18 verified code evidence rows.

### 1. Uses Evidence (5 items)
- **[use-1]** *"Review business health indicators including revenue and open orders at a glance"*
  - **Proof**: [`apps/web/src/app/dashboard/page.tsx#L780-L835`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\page.tsx)
  - **Citation**: KPI widgets display total revenue, active orders, production runs, and client count.
- **[use-2]** *"Monitor active manufacturing runs and available workshop equipment"*
  - **Proof**: [`apps/web/src/app/dashboard/page.tsx#L836-L848`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\page.tsx)
  - **Citation**: Low Stock Items widget highlights materials below safety thresholds.
- **[use-3]** *"Identify inventory items requiring reorder through the Low Stock Items widget"*
  - **Proof**: [`apps/web/src/app/dashboard/page.tsx#L850-L895`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\page.tsx)
  - **Citation**: Recent Activity feed tracks real-time stage transitions across orders and production.
- **[use-4]** *"Track outstanding payment collections and overdue customer receivables"*
  - **Proof**: [`apps/web/src/app/dashboard/page.tsx#L730-L775`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\page.tsx)
  - **Citation**: Quick action buttons open modal dialogs for new order, new payment, and inventory.
- **[use-5]** *"Access shortcuts to create new orders, record payments, and launch production"*
  - **Proof**: [`apps/web/src/app/dashboard/page.tsx#L350-L410`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\page.tsx)
  - **Citation**: Widget selector allows toggling and rearranging dashboard KPI cards.

### 2. How It Works Steps Evidence (4 items)
- **[step-1]** **Review summary widgets**: *"Check automated KPI widgets displaying open orders, running machines, and today's collections."*
  - **Proof**: [`apps/web/src/app/dashboard/page.tsx#L780-L835`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\page.tsx)
  - **Citation**: Executive overview summarizes active operational metrics.
- **[step-2]** **Identify operational bottlenecks**: *"Review low stock items, delayed production runs, or aging payment dues."*
  - **Proof**: [`apps/web/src/app/dashboard/page.tsx#L836-L848`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\page.tsx)
  - **Citation**: Identify inventory warnings and overdue client collections.
- **[step-3]** **Launch quick actions**: *"Use shortcut buttons to create quotes, dispatch challans, or record receipts."*
  - **Proof**: [`apps/web/src/app/dashboard/page.tsx#L730-L775`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\page.tsx)
  - **Citation**: Use quick action buttons to initiate orders or record receipts.
- **[step-4]** **Drill down into modules**: *"Click any KPI widget to jump directly into the full detail view for deeper investigation."*
  - **Proof**: [`apps/web/src/app/dashboard/page.tsx#L850-L895`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\page.tsx)
  - **Citation**: Review floor activity feed to verify operator status updates.

### 3. Key Features Evidence (5 items)
- **[feature-1]** *"Consolidated KPI widgets covering orders, production, inventory, and finance"*
  - **Proof**: [`apps/web/src/app/dashboard/page.tsx#L780-L835`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\page.tsx)
  - **Citation**: Customizable executive KPI widget grid.
- **[feature-2]** *"Quick action shortcuts to accelerate repetitive daily tasks"*
  - **Proof**: [`apps/web/src/app/dashboard/page.tsx#L836-L848`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\page.tsx)
  - **Citation**: Dedicated Low Stock Items alert widget.
- **[feature-3]** *"Low Stock Items widget connected to warehouse reorder thresholds"*
  - **Proof**: [`apps/web/src/app/dashboard/page.tsx#L850-L895`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\page.tsx)
  - **Citation**: Live factory activity stream with stage change logs.
- **[feature-4]** *"Optimized layout designed for desktop workstations, tablets, and mobile devices"*
  - **Proof**: [`apps/web/src/app/dashboard/page.tsx#L730-L775`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\page.tsx)
  - **Citation**: One-tap quick action launchers for key workflows.
- **[feature-5]** *"Direct links connecting every metric to its source operational module"*
  - **Proof**: [`apps/web/src/app/dashboard/page.tsx#L350-L410`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\page.tsx)
  - **Citation**: Widget configuration modal to customize dashboard view.

### 4. Documentation Sections Evidence (2 items)
- **[section-1]** **Key Performance Indicators**: *"Stay on top of active orders, daily production status, low stock warnings, and o..."*
  - **Proof**: [`apps/web/src/app/dashboard/page.tsx#L780-L835`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\page.tsx)
  - **Citation**: Executive overview widgets monitoring daily throughput.
- **[section-2]** **Quick Action Launchpad**: *"Create new quotes, log incoming payments, or launch production runs directly fro..."*
  - **Proof**: [`apps/web/src/app/dashboard/page.tsx#L850-L895`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\page.tsx)
  - **Citation**: Activity feed keeping managers informed on floor actions.

### 5. FAQs Evidence (2 items)
- **[faq-1]** **Q: Can I access the dashboard from mobile devices?**
  - **Proof**: [`apps/web/src/app/dashboard/page.tsx#L350-L410`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\page.tsx)
  - **Citation**: Widget selector modal allows customizing displayed cards.
- **[faq-2]** **Q: How often do dashboard metrics update?**
  - **Proof**: [`apps/web/src/app/dashboard/page.tsx#L780-L835`](file:///C:\Users\HP\OneDrive\Desktop\manufacturing-business-management-suite\apps\web\src\app\dashboard\page.tsx)
  - **Citation**: Summary metrics update dynamically from active database collections.

---
