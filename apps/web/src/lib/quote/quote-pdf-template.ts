/**
 * Handlebars Quotation PDF Template Engine
 * ─────────────────────────────────────────
 * Derived from lib/invoice/handlebars-template.ts with minimum diff:
 *   - Title: "QUOTATION" (instead of "TAX INVOICE")
 *   - Meta label: "Valid Until" (instead of "Due Date")
 *   - No payment/bank details or balance section
 *   - Exact same styling, typography, spacing, and GST item table
 */

import Handlebars from "handlebars";
import { formatINR, formatNumber, formatDate, numberToWords } from "@/lib/invoice/utils";
import type { Quotation } from "@/modules/quotes/domain/types";

// ─── Register Handlebars Helpers ──────────────────────────────
Handlebars.registerHelper("formatCurrency", (amount: number) => formatINR(amount));
Handlebars.registerHelper("formatNum", (n: number) => formatNumber(n));
Handlebars.registerHelper("formatNumber", (n: number) => formatNumber(n));
Handlebars.registerHelper("formatDate", (dateStr: string) => formatDate(dateStr));
Handlebars.registerHelper("amountInWords", (amount: number) => numberToWords(amount));

Handlebars.registerHelper("ifEqual", function (this: any, a: any, b: any, options: any) {
    return a === b ? options.fn(this) : options.inverse(this);
});

Handlebars.registerHelper("ifGt", function (this: any, a: number, b: number, options: any) {
    return a > b ? options.fn(this) : options.inverse(this);
});

Handlebars.registerHelper("multiply", (a: number, b: number) => {
    return formatNumber((a || 0) * (b || 0));
});

Handlebars.registerHelper("add", (a: number, b: number) => (a || 0) + (b || 0));
Handlebars.registerHelper("inc", (n: number) => (n || 0) + 1);

Handlebars.registerHelper("isEven", function (this: any, index: number, options: any) {
    return index % 2 === 0 ? options.fn(this) : options.inverse(this);
});

Handlebars.registerHelper("escapeNewlines", (str: string) => {
    if (!str) return "";
    return str.split("\n").filter(Boolean).map(line =>
        `<li>${Handlebars.Utils.escapeExpression(line.replace(/^\d+\.\s*/, ""))}</li>`
    ).join("");
});

Handlebars.registerHelper("getInitials", (name: string) => {
    if (!name) return "";
    return name.split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() || "").join("");
});

Handlebars.registerHelper("joinWith", (arr: string[], sep: string) => {
    if (!Array.isArray(arr)) return "";
    return arr.filter(Boolean).join(sep);
});

export interface CompanyPDFInfo {
    companyName: string;
    address: string;
    phone: string;
    email: string;
    gstin?: string;
    pan?: string;
    state?: string;
    stateCode?: string;
    logoUrl?: string;
}

export interface QuotePDFPayload {
    quotation: Quotation;
    company: CompanyPDFInfo;
}

const QUOTATION_TEMPLATE_SOURCE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Quotation {{quotation.quotation_number}}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
  <style>
    /* ═══ CSS Reset & Base ═══ */
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
      line-height: 1.5;
      color: var(--slate-700);
      background: #fff;
      -webkit-font-smoothing: antialiased;
    }

    .quote-page {
      width: 210mm;
      min-height: 297mm;
      padding: 18mm 16mm 20mm 16mm;
      margin: 0 auto;
      background: #fff;
      position: relative;
    }

    .accent-bar {
      height: 4px;
      background: linear-gradient(90deg, #2563eb, #3b82f6, #60a5fa);
      position: absolute;
      top: 0; left: 0; right: 0;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: var(--sp-6);
      padding-bottom: var(--sp-5);
      border-bottom: 1px solid var(--slate-200);
    }

    .company-block {
      display: flex;
      gap: var(--sp-4);
      align-items: flex-start;
      max-width: 55%;
    }

    .company-logo {
      width: 52px;
      height: 52px;
      border-radius: 10px;
      object-fit: cover;
      flex-shrink: 0;
    }

    .company-logo-placeholder {
      width: 52px;
      height: 52px;
      border-radius: 10px;
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

    .quote-title-block {
      text-align: right;
    }

    .quote-title {
      font-size: 22px;
      font-weight: 800;
      color: var(--slate-900);
      letter-spacing: -0.5px;
      text-transform: uppercase;
    }

    .quote-number {
      font-family: var(--font-mono);
      font-size: 12px;
      font-weight: 600;
      color: var(--accent);
      margin-top: 1px;
      margin-bottom: var(--sp-3);
    }

    .quote-meta-row {
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

    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 8.5px;
      font-weight: 700;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      margin-top: var(--sp-2);
    }

    .client-section {
      margin-bottom: var(--sp-5);
    }

    .client-card {
      background: var(--slate-50);
      border: 1px solid var(--slate-200);
      border-radius: 10px;
      padding: var(--sp-3) var(--sp-4);
      max-width: 320px;
    }

    .client-label {
      font-size: 7.5px;
      font-weight: 700;
      color: var(--slate-400);
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin-bottom: 2px;
    }

    .client-name {
      font-size: 12px;
      font-weight: 700;
      color: var(--slate-900);
    }

    .client-address {
      font-size: 8.5px;
      color: var(--slate-500);
      line-height: 1.4;
      margin-top: 2px;
    }

    .client-detail {
      font-size: 8.5px;
      margin-top: 2px;
    }
    .client-detail-label { color: var(--slate-400); font-weight: 600; }
    .client-detail-value { font-family: var(--font-mono); color: var(--slate-700); font-weight: 500; }

    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: var(--sp-5);
    }

    .items-table th {
      background: var(--slate-800);
      color: #fff;
      font-size: 8px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 8px 6px;
      text-align: left;
    }

    .items-table th.cell-right { text-align: right; }
    .items-table th.cell-center { text-align: center; }

    .items-table td {
      padding: 7px 6px;
      font-size: 8.5px;
      border-bottom: 1px solid var(--slate-200);
      color: var(--slate-700);
      vertical-align: middle;
    }

    .items-table tr:nth-child(even) td {
      background: var(--slate-50);
    }

    .items-table td.cell-right { text-align: right; font-family: var(--font-mono); }
    .items-table td.cell-center { text-align: center; font-family: var(--font-mono); }

    .col-sno { width: 24px; }
    .col-desc { width: 35%; }
    .col-hsn { width: 65px; }
    .col-qty { width: 50px; }
    .col-rate { width: 65px; }
    .col-disc { width: 55px; }
    .col-tax { width: 65px; }
    .col-total { width: 75px; }

    .summary-section {
      display: flex;
      justify-content: flex-end;
      margin-bottom: var(--sp-5);
    }

    .summary-card {
      width: 280px;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06);
      border: 1px solid var(--slate-200);
    }

    .summary-body { padding: var(--sp-3) var(--sp-4); }

    .summary-row {
      display: flex; justify-content: space-between;
      align-items: center; padding: 4px 0;
    }

    .summary-label { font-size: 9px; color: var(--slate-500); font-weight: 500; }
    .summary-value {
      font-family: var(--font-mono); font-size: 9.5px;
      font-weight: 500; color: var(--slate-800);
    }

    .summary-divider { height: 1px; background: var(--slate-200); margin: var(--sp-1) 0; }

    .summary-total {
      background: linear-gradient(135deg, var(--slate-900), var(--slate-800));
      padding: var(--sp-3) var(--sp-4);
      display: flex; justify-content: space-between; align-items: center;
    }

    .total-label { font-size: 10px; font-weight: 700; color: #fff; letter-spacing: 0.5px; }
    .total-value {
      font-family: var(--font-mono); font-size: 14px;
      font-weight: 700; color: #fff;
    }

    .notes-section {
      margin-bottom: var(--sp-4);
    }

    .notes-title {
      font-size: 8px; font-weight: 700; color: var(--slate-400);
      text-transform: uppercase; letter-spacing: 1px;
      margin-bottom: var(--sp-1);
    }

    .notes-text { font-size: 8.5px; color: var(--slate-500); line-height: 1.5; white-space: pre-line; }

    .terms-text { font-size: 8px; color: var(--slate-400); line-height: 1.5; white-space: pre-line; }

    .signatory-section {
      display: flex;
      justify-content: flex-end;
      margin-top: var(--sp-8);
      margin-bottom: var(--sp-6);
    }

    .signatory-block {
      text-align: center;
      min-width: 180px;
    }

    .signatory-line {
      border-top: 1px solid var(--slate-300);
      padding-top: 6px;
      margin-top: 36px;
    }

    .signatory-label { font-size: 8px; color: var(--slate-400); font-weight: 600; }
    .signatory-company { font-size: 8.5px; color: var(--slate-600); font-weight: 600; margin-top: 2px; }

    .quote-footer {
      border-top: 1px solid var(--slate-200);
      padding-top: var(--sp-3);
      text-align: center;
    }

    .footer-thank-you {
      font-size: 10px; font-weight: 600; color: var(--slate-400);
      letter-spacing: 0.5px; margin-bottom: 2px;
    }

    .footer-legal { font-size: 7.5px; color: var(--slate-300); }

    @media print {
      body { margin: 0; }
      .quote-page { padding: 12mm 12mm 16mm 12mm; }
    }
  </style>
</head>
<body>
  <div class="quote-page">
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

      <div class="quote-title-block">
        <div class="quote-title">QUOTATION</div>
        <div class="quote-number">{{quotation.quotation_number}}</div>

        <div class="quote-meta-row">
          <div class="meta-item">
            <div class="meta-label">Quote Date</div>
            <div class="meta-value">{{formatDate quotation.quotation_date}}</div>
          </div>
          <div class="meta-item">
            <div class="meta-label">Valid Until</div>
            <div class="meta-value">{{formatDate quotation.valid_until}}</div>
          </div>
        </div>

        <div class="status-badge" style="background: {{statusTheme.bg}}; color: {{statusTheme.text}};">
          {{statusTheme.label}}
        </div>
      </div>
    </div>

    <!-- ═══ CLIENT CARD ═══ -->
    <div class="client-section">
      <div class="client-card">
        <div class="client-label">Quote To</div>
        <div class="client-name">{{quotation.clientName}}</div>
        {{#if quotation.clientAddress}}<div class="client-address">{{quotation.clientAddress}}</div>{{/if}}
        <div class="client-details">
          {{#if quotation.clientGSTIN}}
            <div class="client-detail">
              <span class="client-detail-label">GSTIN: </span>
              <span class="client-detail-value">{{quotation.clientGSTIN}}</span>
            </div>
          {{/if}}
          {{#if quotation.clientPhone}}
            <div class="client-detail">
              <span class="client-detail-label">Phone: </span>
              <span class="client-detail-value">{{quotation.clientPhone}}</span>
            </div>
          {{/if}}
          {{#if quotation.clientEmail}}
            <div class="client-detail">
              <span class="client-detail-label">Email: </span>
              <span class="client-detail-value">{{quotation.clientEmail}}</span>
            </div>
          {{/if}}
        </div>
      </div>
    </div>

    <!-- ═══ ITEMS TABLE ═══ -->
    <table class="items-table">
      <thead>
        <tr>
          <th class="cell-center col-sno">#</th>
          <th class="col-desc">Item Description</th>
          <th class="col-hsn">HSN/SAC</th>
          <th class="cell-center col-qty">Qty</th>
          <th class="cell-right col-rate">Rate (₹)</th>
          <th class="cell-right col-disc">Disc (₹)</th>
          <th class="cell-right col-tax">GST</th>
          <th class="cell-right col-total">Total (₹)</th>
        </tr>
      </thead>
      <tbody>
        {{#each quotation.items}}
          <tr>
            <td class="cell-center">{{add @index 1}}</td>
            <td><strong>{{description}}</strong></td>
            <td class="cell-center">{{hsn_sac}}</td>
            <td class="cell-center">{{qty}} {{unit}}</td>
            <td class="cell-right">{{formatNumber rate}}</td>
            <td class="cell-right">{{formatNumber discount}}</td>
            <td class="cell-right">{{gst_rate}}%</td>
            <td class="cell-right">{{formatNumber line_total}}</td>
          </tr>
        {{/each}}
      </tbody>
    </table>

    <!-- ═══ SUMMARY CARD ═══ -->
    <div class="summary-section">
      <div class="summary-card">
        <div class="summary-body">
          <div class="summary-row">
            <span class="summary-label">Subtotal</span>
            <span class="summary-value">{{formatCurrency quotation.subtotal}}</span>
          </div>

          {{#if quotation.total_discount}}
            <div class="summary-row">
              <span class="summary-label">Discount</span>
              <span class="summary-value">- {{formatCurrency quotation.total_discount}}</span>
            </div>
          {{/if}}

          {{#if quotation.is_igst}}
            <div class="summary-row">
              <span class="summary-label">IGST</span>
              <span class="summary-value">{{formatCurrency quotation.igst_amount}}</span>
            </div>
          {{else}}
            <div class="summary-row">
              <span class="summary-label">CGST</span>
              <span class="summary-value">{{formatCurrency quotation.cgst_amount}}</span>
            </div>
            <div class="summary-row">
              <span class="summary-label">SGST</span>
              <span class="summary-value">{{formatCurrency quotation.sgst_amount}}</span>
            </div>
          {{/if}}

          <div class="summary-divider"></div>
        </div>

        <div class="summary-total">
          <span class="total-label">Grand Total</span>
          <span class="total-value">{{formatCurrency quotation.grand_total}}</span>
        </div>
      </div>
    </div>

    <!-- ═══ NOTES & TERMS ═══ -->
    {{#if quotation.notes}}
      <div class="notes-section">
        <div class="notes-title">Notes / Remarks</div>
        <div class="notes-text">{{quotation.notes}}</div>
      </div>
    {{/if}}

    {{#if quotation.terms}}
      <div class="notes-section">
        <div class="notes-title">Terms & Conditions</div>
        <div class="terms-text">{{quotation.terms}}</div>
      </div>
    {{/if}}

    <!-- ═══ SIGNATORY ═══ -->
    <div class="signatory-section">
      <div class="signatory-block">
        <div class="signatory-line">
          <div class="signatory-label">Authorized Signatory</div>
          <div class="signatory-company">{{company.companyName}}</div>
        </div>
      </div>
    </div>

    <!-- ═══ FOOTER ═══ -->
    <div class="quote-footer">
      <div class="footer-thank-you">Thank you for your business consideration!</div>
      <div class="footer-legal">This is a quotation estimate, valid until the stated date. It does not constitute a tax invoice.</div>
    </div>
  </div>
</body>
</html>`;

export function buildQuotationHTMLHandlebars(payload: QuotePDFPayload): string {
    const { quotation, company } = payload;

    const initials = company.companyName
        ? company.companyName.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() || "").join("")
        : "QT";

    const statusThemes: Record<string, { bg: string; text: string; label: string }> = {
        Draft: { bg: "#f1f5f9", text: "#475569", label: "DRAFT" },
        Sent: { bg: "#dbeafe", text: "#1e40af", label: "SENT" },
        Accepted: { bg: "#dcfce7", text: "#166534", label: "ACCEPTED" },
        Rejected: { bg: "#fee2e2", text: "#991b1b", label: "REJECTED" },
        Expired: { bg: "#fef3c7", text: "#92400e", label: "EXPIRED" },
    };

    const statusTheme = statusThemes[quotation.status] || statusThemes.Draft;

    const template = Handlebars.compile(QUOTATION_TEMPLATE_SOURCE);
    return template({
        quotation,
        company,
        companyInitials: initials,
        statusTheme,
    });
}
