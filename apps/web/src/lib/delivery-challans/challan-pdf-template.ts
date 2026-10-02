/**
 * Handlebars Delivery Challan PDF Template Engine
 * ───────────────────────────────────────────────
 * Derived from Quote PDF template with minimum diff:
 *   - Title: "DELIVERY CHALLAN"
 *   - Consignee & Ship-To details
 *   - Transport Block (Transporter, Vehicle, LR, E-way bill)
 *   - Order Reference Block
 *   - Items Table (No prices, rates, taxes, or currency)
 *   - Received By / Signature / Date Block
 */

import Handlebars from "handlebars";
import { formatDate } from "@/lib/invoice/utils";
import type { DeliveryChallan } from "@/modules/delivery-challans/domain/types";

// Register helper safe checks
try {
    Handlebars.registerHelper("formatDate", (dateStr: string) => (dateStr ? formatDate(dateStr) : "-"));
    Handlebars.registerHelper("inc", (n: number) => (n || 0) + 1);
    Handlebars.registerHelper("isEven", (index: number) => Number(index) % 2 === 0);
} catch {
    // Helpers may already be registered
}

export interface CompanyPDFInfo {
    companyName: string;
    address: string;
    phone: string;
    email: string;
    gstin?: string;
    pan?: string;
    logoUrl?: string;
}

export interface ChallanPDFPayload {
    challan: DeliveryChallan;
    company: CompanyPDFInfo;
}

const DELIVERY_CHALLAN_TEMPLATE_SOURCE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Delivery Challan {{challan.challan_number}}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
  <style>
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

    :root {
      --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      --font-mono: 'JetBrains Mono', 'SF Mono', 'Consolas', monospace;
      --sp-1: 4px; --sp-2: 8px; --sp-3: 12px; --sp-4: 16px;
      --sp-5: 20px; --sp-6: 24px; --sp-8: 32px; --sp-10: 40px;

      --slate-50: #f8fafc; --slate-100: #f1f5f9; --slate-200: #e2e8f0;
      --slate-300: #cbd5e1; --slate-400: #94a3b8; --slate-500: #64748b;
      --slate-600: #475569; --slate-700: #334155; --slate-800: #1e293b;
      --slate-900: #0f172a;
      --accent: #2563eb;
    }

    body {
      font-family: var(--font-sans);
      font-size: 10px;
      color: var(--slate-800);
      background: #fff;
      -webkit-font-smoothing: antialiased;
      line-height: 1.4;
    }

    .challan-page {
      max-width: 210mm;
      margin: 0 auto;
      padding: 14mm 14mm 16mm 14mm;
      background: #fff;
      position: relative;
    }

    .accent-bar {
      height: 4px;
      background: linear-gradient(90deg, #2563eb, #3b82f6, #60a5fa);
      border-radius: 2px;
      margin-bottom: var(--sp-6);
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: var(--sp-6);
      gap: var(--sp-6);
    }

    .company-block {
      display: flex;
      align-items: flex-start;
      gap: var(--sp-3);
      max-width: 60%;
    }

    .company-logo {
      width: 52px;
      height: 52px;
      object-fit: contain;
      border-radius: 8px;
      flex-shrink: 0;
    }

    .company-logo-placeholder {
      width: 52px;
      height: 52px;
      border-radius: 8px;
      background: linear-gradient(135deg, #1e293b, #0f172a);
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 16px;
      flex-shrink: 0;
    }

    .company-name {
      font-size: 16px;
      font-weight: 800;
      color: var(--slate-900);
      letter-spacing: -0.3px;
      margin-bottom: 2px;
    }

    .company-address, .company-contact {
      font-size: 9px;
      color: var(--slate-500);
      line-height: 1.4;
    }

    .company-gstin {
      font-family: var(--font-mono);
      font-size: 8.5px;
      color: var(--slate-600);
      font-weight: 500;
      margin-top: 3px;
    }

    .challan-title-block {
      text-align: right;
    }

    .challan-title {
      font-size: 20px;
      font-weight: 800;
      color: var(--slate-900);
      letter-spacing: -0.5px;
      text-transform: uppercase;
    }

    .challan-number {
      font-family: var(--font-mono);
      font-size: 12px;
      font-weight: 600;
      color: var(--accent);
      margin-top: 1px;
      margin-bottom: var(--sp-2);
    }

    .challan-meta-row {
      display: flex;
      justify-content: flex-end;
      gap: var(--sp-4);
    }

    .meta-item { text-align: right; }
    .meta-label {
      font-size: 8px;
      font-weight: 600;
      color: var(--slate-400);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .meta-value {
      font-family: var(--font-mono);
      font-size: 9.5px;
      font-weight: 600;
      color: var(--slate-800);
      margin-top: 1px;
    }

    .badge {
      display: inline-block;
      padding: 2px 7px;
      border-radius: 4px;
      font-size: 8px;
      font-weight: 700;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      margin-top: var(--sp-1);
    }
    .badge-Draft { background: #f1f5f9; color: #475569; }
    .badge-Dispatched { background: #eff6ff; color: #1d4ed8; }
    .badge-Delivered { background: #f0fdf4; color: #15803d; }
    .badge-Returned { background: #fef2f2; color: #b91c1c; }
    .badge-Cancelled { background: #fef2f2; color: #991b1b; }

    .grid-2col {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--sp-4);
      margin-bottom: var(--sp-4);
    }

    .info-card {
      background: var(--slate-50);
      border: 1px solid var(--slate-200);
      border-radius: 8px;
      padding: var(--sp-3) var(--sp-4);
    }

    .card-label {
      font-size: 8px;
      font-weight: 700;
      color: var(--slate-400);
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin-bottom: var(--sp-1);
    }

    .card-title {
      font-size: 11px;
      font-weight: 700;
      color: var(--slate-900);
      margin-bottom: 2px;
    }

    .card-text {
      font-size: 8.5px;
      color: var(--slate-600);
      line-height: 1.4;
    }

    .card-mono {
      font-family: var(--font-mono);
      font-size: 8.5px;
      color: var(--slate-700);
      margin-top: 2px;
    }

    /* Transport Block */
    .transport-bar {
      background: var(--slate-50);
      border: 1px solid var(--slate-200);
      border-radius: 8px;
      padding: var(--sp-3) var(--sp-4);
      margin-bottom: var(--sp-5);
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: var(--sp-3);
    }

    .transport-item .t-label {
      font-size: 7.5px;
      font-weight: 600;
      color: var(--slate-400);
      text-transform: uppercase;
    }
    .transport-item .t-value {
      font-family: var(--font-mono);
      font-size: 9px;
      font-weight: 600;
      color: var(--slate-800);
      margin-top: 1px;
    }

    /* Items Table */
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: var(--sp-6);
    }

    .items-table thead th {
      background: var(--slate-800);
      color: #fff;
      font-size: 8px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      padding: 7px 10px;
      text-align: left;
    }

    .items-table thead th.th-num { width: 35px; text-align: center; }
    .items-table thead th.th-qty { width: 80px; text-align: right; }
    .items-table thead th.th-unit { width: 60px; text-align: center; }
    .items-table thead th.th-remarks { width: 140px; text-align: left; }

    .items-table tbody td {
      padding: 8px 10px;
      border-bottom: 1px solid var(--slate-200);
      font-size: 9px;
      vertical-align: top;
    }

    .items-table tbody tr.row-even {
      background: var(--slate-50);
    }

    .td-num { text-align: center; font-family: var(--font-mono); color: var(--slate-500); }
    .td-desc { font-weight: 600; color: var(--slate-900); }
    .td-qty { text-align: right; font-family: var(--font-mono); font-weight: 700; color: var(--slate-900); }
    .td-unit { text-align: center; font-family: var(--font-mono); color: var(--slate-600); }
    .td-remarks { color: var(--slate-500); font-size: 8.5px; }

    .notes-section {
      background: var(--slate-50);
      border: 1px solid var(--slate-200);
      border-radius: 8px;
      padding: var(--sp-3) var(--sp-4);
      margin-bottom: var(--sp-6);
    }
    .notes-title {
      font-size: 8px;
      font-weight: 700;
      color: var(--slate-400);
      text-transform: uppercase;
      margin-bottom: 2px;
    }
    .notes-text {
      font-size: 8.5px;
      color: var(--slate-600);
      line-height: 1.4;
      white-space: pre-line;
    }

    /* Dual Signature Section */
    .signatory-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--sp-8);
      margin-top: var(--sp-6);
      margin-bottom: var(--sp-6);
    }

    .signatory-box {
      border: 1px dashed var(--slate-300);
      border-radius: 8px;
      padding: var(--sp-4);
      min-height: 90px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    .signatory-header {
      font-size: 8px;
      font-weight: 700;
      color: var(--slate-500);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .signatory-footer {
      border-top: 1px solid var(--slate-300);
      padding-top: 4px;
      display: flex;
      justify-content: space-between;
      font-size: 8px;
      color: var(--slate-400);
    }

    .challan-footer {
      border-top: 1px solid var(--slate-200);
      padding-top: var(--sp-3);
      text-align: center;
      font-size: 7.5px;
      color: var(--slate-400);
    }

    @media print {
      body { margin: 0; }
      .challan-page { padding: 10mm 10mm 12mm 10mm; }
    }
  </style>
</head>
<body>
  <div class="challan-page">
    <div class="accent-bar"></div>

    <!-- ═══ HEADER ═══ -->
    <div class="header">
      <div class="company-block">
        {{#if company.logoUrl}}
          <img src="{{company.logoUrl}}" alt="Logo" class="company-logo" />
        {{else}}
          <div class="company-logo-placeholder">
            <span>{{companyInitials}}</span>
          </div>
        {{/if}}
        <div>
          <div class="company-name">{{company.companyName}}</div>
          <div class="company-address">{{company.address}}</div>
          <div class="company-contact">{{company.phone}}  ·  {{company.email}}</div>
          {{#if company.gstin}}
            <div class="company-gstin">
              GSTIN: {{company.gstin}}
              {{#if company.pan}} | PAN: {{company.pan}}{{/if}}
            </div>
          {{/if}}
        </div>
      </div>

      <div class="challan-title-block">
        <div class="challan-title">DELIVERY CHALLAN</div>
        <div class="challan-number">{{challan.challan_number}}</div>
        <div class="challan-meta-row">
          <div class="meta-item">
            <div class="meta-label">Date</div>
            <div class="meta-value">{{formatDate challan.challan_date}}</div>
          </div>
          <div class="meta-item">
            <div class="meta-label">Purpose</div>
            <div class="meta-value">{{challan.purpose}}</div>
          </div>
        </div>
        <div>
          <span class="badge badge-{{challan.status}}">{{challan.status}}</span>
        </div>
      </div>
    </div>

    <!-- ═══ CONSIGNEE & SHIP-TO ═══ -->
    <div class="grid-2col">
      <div class="info-card">
        <div class="card-label">Consignee (Bill To)</div>
        <div class="card-title">{{challan.consignee.name}}</div>
        <div class="card-text">{{challan.consignee.address}}</div>
        {{#if challan.consignee.phone}}
          <div class="card-text">Phone: {{challan.consignee.phone}}</div>
        {{/if}}
        {{#if challan.consignee.gstin}}
          <div class="card-mono">GSTIN: {{challan.consignee.gstin}}</div>
        {{/if}}
      </div>

      <div class="info-card">
        <div class="card-label">Dispatch / Ship To</div>
        <div class="card-title">{{challan.consignee.name}}</div>
        <div class="card-text">{{challan.ship_to_address}}</div>
        {{#if challan.order_id}}
          <div class="card-mono" style="margin-top: 4px; color: var(--accent);">
            Order Ref: {{challan.order_id}}
          </div>
        {{/if}}
      </div>
    </div>

    <!-- ═══ TRANSPORT DETAILS ═══ -->
    <div class="transport-bar">
      <div class="transport-item">
        <div class="t-label">Transporter</div>
        <div class="t-value">{{#if challan.transporter_name}}{{challan.transporter_name}}{{else}}-{{/if}}</div>
      </div>
      <div class="transport-item">
        <div class="t-label">Vehicle No</div>
        <div class="t-value">{{#if challan.vehicle_no}}{{challan.vehicle_no}}{{else}}-{{/if}}</div>
      </div>
      <div class="transport-item">
        <div class="t-label">LR / RR No</div>
        <div class="t-value">{{#if challan.lr_number}}{{challan.lr_number}}{{else}}-{{/if}}</div>
      </div>
      <div class="transport-item">
        <div class="t-label">E-Way Bill No</div>
        <div class="t-value">{{#if challan.eway_bill_no}}{{challan.eway_bill_no}}{{else}}-{{/if}}</div>
      </div>
    </div>

    <!-- ═══ ITEMS TABLE ═══ -->
    <table class="items-table">
      <thead>
        <tr>
          <th class="th-num">#</th>
          <th>Item & Description</th>
          <th class="th-qty">Quantity</th>
          <th class="th-unit">Unit</th>
          <th class="th-remarks">Remarks</th>
        </tr>
      </thead>
      <tbody>
        {{#each challan.items}}
          <tr class="{{#if (isEven @index)}}row-even{{/if}}">
            <td class="td-num">{{inc @index}}</td>
            <td class="td-desc">{{this.description}}</td>
            <td class="td-qty">{{this.qty}}</td>
            <td class="td-unit">{{this.unit}}</td>
            <td class="td-remarks">{{#if this.remarks}}{{this.remarks}}{{else}}-{{/if}}</td>
          </tr>
        {{/each}}
      </tbody>
    </table>

    <!-- ═══ NOTES ═══ -->
    {{#if challan.notes}}
      <div class="notes-section">
        <div class="notes-title">Notes / Instructions</div>
        <div class="notes-text">{{challan.notes}}</div>
      </div>
    {{/if}}

    <!-- ═══ DUAL SIGNATURE / ACKNOWLEDGMENT BLOCK ═══ -->
    <div class="signatory-section">
      <div class="signatory-box">
        <div class="signatory-header">Receiver's Acknowledgment</div>
        <div style="font-size: 8px; color: var(--slate-500); margin-top: 4px;">
          Received the above goods in good condition & specified quantity.
        </div>
        <div class="signatory-footer">
          <span>Receiver's Signature & Date</span>
          <span>Company Stamp / Seal</span>
        </div>
      </div>

      <div class="signatory-box">
        <div class="signatory-header" style="text-align: right;">For {{company.companyName}}</div>
        <div style="flex: 1;"></div>
        <div class="signatory-footer" style="justify-content: flex-end;">
          <span>Authorized Signatory</span>
        </div>
      </div>
    </div>

    <!-- ═══ FOOTER ═══ -->
    <div class="challan-footer">
      This is a computer-generated delivery challan and serves as proof of dispatch/transfer.
    </div>
  </div>
</body>
</html>`;

export function buildDeliveryChallanHTML(payload: ChallanPDFPayload): string {
    const template = Handlebars.compile(DELIVERY_CHALLAN_TEMPLATE_SOURCE);
    const companyInitials = payload.company.companyName
        .split(/\s+/)
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase() || "")
        .join("") || "DC";

    return template({
        ...payload,
        companyInitials,
    });
}
