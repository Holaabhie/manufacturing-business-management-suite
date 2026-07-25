/**
 * Handlebars Invoice Template Engine
 * ────────────────────────────────────
 * Compiles and caches a production-grade GST-compliant invoice
 * template using Handlebars. Registers custom helpers for currency,
 * date formatting, amount-in-words, and conditional rendering.
 *
 * Design:
 *   - A4 format with optimized margins
 *   - Inter + JetBrains Mono from Google Fonts
 *   - 8px spacing system
 *   - CSS print media rules for multi-page
 *   - Conditional CGST+SGST vs IGST
 *   - Reverse charge & e-Invoice slots
 *   - Authorized signatory block
 *   - Bank details & UPI QR code
 */

import Handlebars from "handlebars";
import type { InvoicePayload, InvoiceStatus } from "./types";
import { formatINR, formatNumber, formatDate, numberToWords, calculateLineItemTax } from "./utils";

// ─── Register Handlebars Helpers ──────────────────────────────

Handlebars.registerHelper("formatCurrency", (amount: number) => formatINR(amount));
Handlebars.registerHelper("formatNum", (n: number) => formatNumber(n));
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

// ─── Status Themes ────────────────────────────────────────────

const STATUS_THEME: Record<InvoiceStatus, { bg: string; text: string; label: string }> = {
    paid: { bg: "#dcfce7", text: "#166534", label: "PAID" },
    sent: { bg: "#dbeafe", text: "#1e40af", label: "SENT" },
    draft: { bg: "#f1f5f9", text: "#475569", label: "DRAFT" },
    overdue: { bg: "#fee2e2", text: "#991b1b", label: "OVERDUE" },
    cancelled: { bg: "#fef3c7", text: "#92400e", label: "CANCELLED" },
    partially_paid: { bg: "#e0e7ff", text: "#3730a3", label: "PARTIAL" },
};

// ─── Template Source ──────────────────────────────────────────

const INVOICE_TEMPLATE_SOURCE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Invoice {{invoiceNumber}}</title>
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
      --slate-900: #0f172a; --slate-950: #020617;

      --blue-50: #eff6ff; --blue-600: #2563eb; --blue-700: #1d4ed8;
      --accent: #2563eb; --accent-dark: #1e40af;
    }

    @page { size: A4; margin: 0; }

    body {
      font-family: var(--font-sans);
      font-size: 10px;
      line-height: 1.5;
      color: var(--slate-700);
      background: #fff;
      -webkit-font-smoothing: antialiased;
    }

    .invoice-page {
      width: 210mm;
      min-height: 297mm;
      padding: 18mm 16mm 20mm 16mm;
      position: relative;
      background: #fff;
    }

    /* ═══ Accent Bar ═══ */
    .accent-bar {
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 4px;
      background: linear-gradient(90deg, var(--accent) 0%, #8b5cf6 50%, var(--accent) 100%);
    }

    /* ═══ Header ═══ */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: var(--sp-6);
      padding-bottom: var(--sp-5);
      border-bottom: 1.5px solid var(--slate-200);
    }

    .company-block {
      display: flex;
      align-items: flex-start;
      gap: var(--sp-4);
    }

    .company-logo {
      width: 52px; height: 52px;
      border-radius: 12px;
      object-fit: contain;
      border: 1px solid var(--slate-200);
      background: var(--slate-50);
      flex-shrink: 0;
    }

    .company-logo-placeholder {
      width: 52px; height: 52px;
      border-radius: 12px;
      background: linear-gradient(135deg, var(--accent), #8b5cf6);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .company-logo-placeholder span {
      font-size: 20px; font-weight: 800; color: #fff;
      letter-spacing: -0.5px;
    }

    .company-name {
      font-size: 17px; font-weight: 700; color: var(--slate-900);
      letter-spacing: -0.3px; line-height: 1.2;
    }

    .company-address {
      font-size: 9px; color: var(--slate-500);
      max-width: 280px; line-height: 1.4; margin-top: 3px;
    }

    .company-contact {
      font-size: 8.5px; color: var(--slate-400); margin-top: 2px;
    }

    .company-gstin {
      font-size: 9px; font-weight: 600; color: var(--slate-600);
      margin-top: 4px; letter-spacing: 0.3px;
    }

    .invoice-title-block { text-align: right; flex-shrink: 0; }

    .invoice-title {
      font-size: 28px; font-weight: 800; color: var(--slate-900);
      letter-spacing: -1px; line-height: 1;
    }

    .invoice-number {
      font-family: var(--font-mono);
      font-size: 12px; font-weight: 600; color: var(--accent);
      margin-top: 6px; letter-spacing: 0.5px;
    }

    .invoice-meta-row {
      display: flex;
      justify-content: flex-end;
      gap: var(--sp-6);
      margin-top: var(--sp-3);
    }

    .meta-item { text-align: right; }

    .meta-label {
      font-size: 7.5px; font-weight: 600; color: var(--slate-400);
      text-transform: uppercase; letter-spacing: 0.8px;
    }

    .meta-value {
      font-size: 10.5px; font-weight: 600; color: var(--slate-800);
      margin-top: 1px;
    }

    .status-badge {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 3px 10px; border-radius: 20px;
      font-size: 8.5px; font-weight: 700;
      letter-spacing: 0.8px; margin-top: 8px;
    }

    .status-dot {
      width: 6px; height: 6px; border-radius: 50%;
    }

    /* ═══ Reverse Charge / E-Invoice Banner ═══ */
    .rc-banner {
      background: #fef3c7;
      border: 1px solid #f59e0b;
      border-radius: 8px;
      padding: 8px 14px;
      font-size: 9px;
      font-weight: 600;
      color: #92400e;
      margin-bottom: var(--sp-4);
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .rc-banner .rc-icon { font-size: 14px; }

    .einvoice-banner {
      background: #f0fdf4;
      border: 1px solid #22c55e;
      border-radius: 8px;
      padding: 8px 14px;
      font-size: 9px;
      font-weight: 500;
      color: #166534;
      margin-bottom: var(--sp-4);
    }

    .einvoice-banner strong {
      font-weight: 700;
      font-family: var(--font-mono);
      letter-spacing: 0.3px;
    }

    /* ═══ Client Card ═══ */
    .client-section { margin-bottom: var(--sp-5); }

    .client-card {
      border: 1px solid var(--slate-200);
      border-radius: 12px;
      padding: var(--sp-4) var(--sp-5);
      background: var(--slate-50);
    }

    .client-label {
      font-size: 7.5px; font-weight: 700; color: var(--slate-400);
      text-transform: uppercase; letter-spacing: 1px;
      margin-bottom: var(--sp-2);
    }

    .client-name {
      font-size: 14px; font-weight: 700; color: var(--slate-900);
      letter-spacing: -0.2px;
    }

    .client-address {
      font-size: 9.5px; color: var(--slate-500);
      margin-top: 4px; line-height: 1.5;
    }

    .client-details {
      display: flex; gap: var(--sp-8);
      margin-top: var(--sp-2); flex-wrap: wrap;
    }

    .client-detail { font-size: 8.5px; }
    .client-detail-label { color: var(--slate-400); font-weight: 600; }
    .client-detail-value {
      color: var(--slate-700); font-weight: 500;
      font-family: var(--font-mono); font-size: 8.5px;
    }

    /* ═══ Items Table ═══ */
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: var(--sp-5);
      table-layout: fixed;
    }

    .items-table thead th {
      background: var(--slate-900); color: #fff;
      font-size: 7.5px; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.8px;
      padding: 10px 8px; white-space: nowrap;
    }

    .items-table thead th:first-child { border-radius: 8px 0 0 0; padding-left: 12px; }
    .items-table thead th:last-child { border-radius: 0 8px 0 0; }

    .items-table tbody td {
      padding: 9px 8px; font-size: 9.5px;
      border-bottom: 1px solid var(--slate-100);
      vertical-align: middle;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .items-table tbody td:first-child { padding-left: 12px; }

    .row-even { background: #fff; }
    .row-odd  { background: var(--slate-50); }

    .cell-center { text-align: center; }
    .cell-right  { text-align: right; }
    .cell-mono   { font-family: var(--font-mono); font-size: 9.5px; font-weight: 500; }

    .cell-serial { font-weight: 600; color: var(--slate-400); font-size: 9px; }

    .cell-desc { line-height: 1.4; }
    .desc-text { color: var(--slate-800); font-weight: 500; }

    .hsn-badge {
      display: inline-block; font-size: 7.5px;
      font-family: var(--font-mono); color: var(--slate-400);
      background: var(--slate-100); padding: 1px 6px;
      border-radius: 4px; margin-left: 6px;
      font-weight: 500; vertical-align: middle;
    }

    .cell-unit { color: var(--slate-500); font-size: 9px; text-transform: lowercase; }
    .cell-gst  { color: var(--slate-500); font-size: 9px; }
    .cell-amount { font-weight: 600; color: var(--slate-900); }

    /* Column widths */
    .col-sno   { width: 30px; }
    .col-desc  { width: auto; }
    .col-hsn   { width: 50px; }
    .col-qty   { width: 48px; }
    .col-unit  { width: 40px; }
    .col-rate  { width: 72px; }
    .col-disc  { width: 56px; }
    .col-tax   { width: 56px; }
    .col-gst   { width: 44px; }
    .col-amt   { width: 80px; }

    /* ═══ Tax Breakdown Table ═══ */
    .tax-summary-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: var(--sp-5);
      font-size: 8.5px;
    }

    .tax-summary-table thead th {
      background: var(--slate-100);
      padding: 6px 8px;
      font-size: 7px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: var(--slate-500);
      border-bottom: 1px solid var(--slate-200);
    }

    .tax-summary-table tbody td {
      padding: 5px 8px;
      font-size: 8.5px;
      border-bottom: 1px solid var(--slate-100);
      font-family: var(--font-mono);
      font-weight: 500;
    }

    /* ═══ Summary Card ═══ */
    .summary-section {
      display: flex;
      justify-content: flex-end;
      margin-bottom: var(--sp-5);
    }

    .summary-card {
      width: 280px;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04);
      border: 1px solid var(--slate-200);
    }

    .summary-body { padding: var(--sp-4) var(--sp-5); }

    .summary-row {
      display: flex; justify-content: space-between;
      align-items: center; padding: 5px 0;
    }

    .summary-label { font-size: 9.5px; color: var(--slate-500); font-weight: 500; }
    .summary-value {
      font-family: var(--font-mono); font-size: 10px;
      font-weight: 500; color: var(--slate-800);
    }

    .summary-divider { height: 1px; background: var(--slate-200); margin: var(--sp-2) 0; }

    .summary-roundoff .summary-label { font-size: 8.5px; color: var(--slate-400); }
    .summary-roundoff .summary-value { font-size: 9px; color: var(--slate-400); }

    .summary-total {
      background: linear-gradient(135deg, var(--slate-900), var(--slate-800));
      padding: var(--sp-4) var(--sp-5);
      display: flex; justify-content: space-between; align-items: center;
    }

    .total-label { font-size: 11px; font-weight: 700; color: #fff; letter-spacing: 0.5px; }
    .total-value {
      font-family: var(--font-mono); font-size: 16px;
      font-weight: 700; color: #fff; letter-spacing: -0.3px;
    }

    .amount-words {
      display: flex; justify-content: flex-end;
      margin-top: var(--sp-2); margin-bottom: var(--sp-5);
    }

    .amount-words-text {
      font-size: 8.5px; color: var(--slate-400); font-style: italic;
      max-width: 280px; text-align: right; line-height: 1.4;
    }

    /* ═══ Payment Section ═══ */
    .payment-section {
      display: flex; gap: var(--sp-6);
      padding: var(--sp-5);
      border: 1px solid var(--slate-200);
      border-radius: 12px; background: var(--slate-50);
      margin-bottom: var(--sp-5);
      align-items: flex-start;
    }

    .bank-details { flex: 1; }
    .bank-title {
      font-size: 8px; font-weight: 700; color: var(--slate-400);
      text-transform: uppercase; letter-spacing: 1px;
      margin-bottom: var(--sp-3);
    }

    .bank-row { display: flex; margin-bottom: 5px; }
    .bank-label {
      font-size: 8.5px; font-weight: 600; color: var(--slate-400);
      width: 90px; flex-shrink: 0;
    }
    .bank-value {
      font-size: 9px; font-weight: 500; color: var(--slate-700);
      font-family: var(--font-mono);
    }

    .qr-block { flex-shrink: 0; text-align: center; }
    .qr-code {
      width: 72px; height: 72px;
      border: 1px solid var(--slate-200);
      border-radius: 8px; background: #fff; padding: 4px;
    }
    .qr-label { font-size: 7px; color: var(--slate-400); margin-top: 4px; font-weight: 500; }

    /* ═══ Signatory ═══ */
    .signatory-section {
      display: flex;
      justify-content: flex-end;
      margin-bottom: var(--sp-6);
      margin-top: var(--sp-6);
    }

    .signatory-block {
      text-align: center;
      min-width: 180px;
    }

    .signatory-line {
      border-top: 1px solid var(--slate-300);
      padding-top: 6px;
      margin-top: 40px;
    }

    .signatory-label {
      font-size: 8px;
      color: var(--slate-400);
      font-weight: 600;
    }

    .signatory-company {
      font-size: 9px;
      color: var(--slate-600);
      font-weight: 600;
      margin-top: 2px;
    }

    /* ═══ Notes & Terms ═══ */
    .notes-section { margin-bottom: var(--sp-4); }
    .notes-title {
      font-size: 8px; font-weight: 700; color: var(--slate-400);
      text-transform: uppercase; letter-spacing: 1px;
      margin-bottom: var(--sp-2);
    }
    .notes-text { font-size: 8.5px; color: var(--slate-500); line-height: 1.6; }

    .terms-list {
      font-size: 8px; color: var(--slate-400);
      line-height: 1.7; padding-left: 0; list-style: none;
    }
    .terms-list li::before { content: "•"; color: var(--slate-300); margin-right: 6px; }

    /* ═══ Footer ═══ */
    .invoice-footer {
      border-top: 1px solid var(--slate-200);
      padding-top: var(--sp-4);
      text-align: center;
    }

    .footer-thank-you {
      font-size: 11px; font-weight: 600; color: var(--slate-400);
      letter-spacing: 0.5px; margin-bottom: 4px;
    }

    .footer-legal {
      font-size: 7.5px; color: var(--slate-300); line-height: 1.4;
    }

    /* ═══ Print ═══ */
    @media print {
      body { margin: 0; }
      .invoice-page { padding: 15mm 12mm 20mm 12mm; }
      .items-table { page-break-inside: auto; }
      .items-table tr { page-break-inside: avoid; page-break-after: auto; }
      .summary-section { page-break-inside: avoid; }
      .payment-section { page-break-inside: avoid; }
      .signatory-section { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="invoice-page">
    <div class="accent-bar"></div>

    <!-- ═══ HEADER ═══ -->
    <div class="header">
      <div class="company-block">
        {{#if company.logoUrl}}
          <img src="{{company.logoUrl}}" alt="Logo" class="company-logo" />
        {{else}}
          <div class="company-logo-placeholder">
            <span>{{getInitials company.companyName}}</span>
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
              {{#if company.stateCode}} | State: {{company.state}} ({{company.stateCode}}){{/if}}
            </div>
          {{/if}}
        </div>
      </div>

      <div class="invoice-title-block">
        <div class="invoice-title">TAX INVOICE</div>
        <div class="invoice-number">{{invoiceNumber}}</div>

        <div class="invoice-meta-row">
          <div class="meta-item">
            <div class="meta-label">Issue Date</div>
            <div class="meta-value">{{formatDate issueDate}}</div>
          </div>
          <div class="meta-item">
            <div class="meta-label">Due Date</div>
            <div class="meta-value">{{formatDate dueDate}}</div>
          </div>
        </div>

        {{#if poNumber}}
          <div class="invoice-meta-row" style="margin-top:4px">
            <div class="meta-item">
              <div class="meta-label">PO Number</div>
              <div class="meta-value">{{poNumber}}</div>
            </div>
          </div>
        {{/if}}

        <div class="status-badge" style="background: {{statusTheme.bg}}; color: {{statusTheme.text}};">
          <span class="status-dot" style="background: {{statusTheme.text}};"></span>
          {{statusTheme.label}}
        </div>
      </div>
    </div>

    <!-- ═══ REVERSE CHARGE BANNER ═══ -->
    {{#if isReverseCharge}}
      <div class="rc-banner">
        <span class="rc-icon">⚠️</span>
        <span>Tax is payable on reverse charge basis — {{reverseChargeText}}</span>
      </div>
    {{/if}}

    <!-- ═══ E-INVOICE IRN ═══ -->
    {{#if eInvoiceIRN}}
      <div class="einvoice-banner">
        <strong>IRN:</strong> {{eInvoiceIRN}}
        {{#if eInvoiceAckNo}} &nbsp;|&nbsp; <strong>Ack No:</strong> {{eInvoiceAckNo}}{{/if}}
        {{#if eInvoiceAckDate}} &nbsp;|&nbsp; <strong>Ack Date:</strong> {{formatDate eInvoiceAckDate}}{{/if}}
      </div>
    {{/if}}

    <!-- ═══ CLIENT CARD ═══ -->
    <div class="client-section">
      <div class="client-card">
        <div class="client-label">Bill To</div>
        <div class="client-name">{{client.name}}</div>
        {{#if client.address}}<div class="client-address">{{client.address}}</div>{{/if}}
        <div class="client-details">
          {{#if client.gstin}}
            <div class="client-detail">
              <span class="client-detail-label">GSTIN: </span>
              <span class="client-detail-value">{{client.gstin}}</span>
            </div>
          {{/if}}
          {{#if client.phone}}
            <div class="client-detail">
              <span class="client-detail-label">Phone: </span>
              <span class="client-detail-value">{{client.phone}}</span>
            </div>
          {{/if}}
          {{#if client.email}}
            <div class="client-detail">
              <span class="client-detail-label">Email: </span>
              <span class="client-detail-value">{{client.email}}</span>
            </div>
          {{/if}}
          {{#if displayPlaceOfSupply}}
            <div class="client-detail">
              <span class="client-detail-label">Place of Supply: </span>
              <span class="client-detail-value">{{displayPlaceOfSupply}}</span>
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
          <th style="text-align: left;" class="col-desc">Description</th>
          <th class="cell-center col-hsn">HSN</th>
          <th class="cell-right col-qty">Qty</th>
          <th class="cell-center col-unit">Unit</th>
          <th class="cell-right col-rate">Rate (\u20B9)</th>
          {{#if hasDiscount}}<th class="cell-right col-disc">Disc.</th>{{/if}}
          <th class="cell-right col-tax">Taxable</th>
          <th class="cell-center col-gst">GST</th>
          <th class="cell-right col-amt">Amount (\u20B9)</th>
        </tr>
      </thead>
      <tbody>
        {{#each computedItems}}
        <tr class="{{#isEven @index}}row-even{{else}}row-odd{{/isEven}}">
          <td class="cell-center cell-serial">{{inc @index}}</td>
          <td class="cell-desc">
            <span class="desc-text">{{this.description}}</span>
            {{#if this.hsnCode}}<span class="hsn-badge">HSN: {{this.hsnCode}}</span>{{/if}}
          </td>
          <td class="cell-center cell-mono" style="font-size:8.5px">{{this.hsnCode}}</td>
          <td class="cell-right cell-mono">{{formatNum this.quantity}}</td>
          <td class="cell-center cell-unit">{{this.unit}}</td>
          <td class="cell-right cell-mono">{{formatNum this.rate}}</td>
          {{#if ../hasDiscount}}<td class="cell-right cell-mono">{{formatNum this.discount}}</td>{{/if}}
          <td class="cell-right cell-mono">{{formatNum this.taxableAmount}}</td>
          <td class="cell-center cell-gst">{{this.gstRate}}%</td>
          <td class="cell-right cell-mono cell-amount">{{formatNum this.total}}</td>
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
            <span class="summary-value">{{formatCurrency computedTotals.totalTaxableAmount}}</span>
          </div>

          {{#if hasDiscount}}
          <div class="summary-row">
            <span class="summary-label">Total Discount</span>
            <span class="summary-value" style="color:#ef4444">- {{formatCurrency computedTotals.totalDiscount}}</span>
          </div>
          {{/if}}

          {{#ifEqual taxTypeResolved "IGST"}}
            <div class="summary-row">
              <span class="summary-label">IGST</span>
              <span class="summary-value">{{formatCurrency computedTotals.totalIgst}}</span>
            </div>
          {{else}}
            <div class="summary-row">
              <span class="summary-label">CGST</span>
              <span class="summary-value">{{formatCurrency computedTotals.totalCgst}}</span>
            </div>
            <div class="summary-row">
              <span class="summary-label">SGST</span>
              <span class="summary-value">{{formatCurrency computedTotals.totalSgst}}</span>
            </div>
          {{/ifEqual}}

          {{#ifGt computedTotals.roundOff 0}}
            <div class="summary-row summary-roundoff">
              <span class="summary-label">Round Off</span>
              <span class="summary-value">+ {{formatCurrency computedTotals.roundOff}}</span>
            </div>
          {{else}}
            {{#ifGt 0 computedTotals.roundOff}}
              <div class="summary-row summary-roundoff">
                <span class="summary-label">Round Off</span>
                <span class="summary-value">{{formatCurrency computedTotals.roundOff}}</span>
              </div>
            {{/ifGt}}
          {{/ifGt}}

          <div class="summary-divider"></div>
        </div>
        <div class="summary-total">
          <span class="total-label">GRAND TOTAL</span>
          <span class="total-value">{{formatCurrency computedTotals.grandTotal}}</span>
        </div>
      </div>
    </div>

    <div class="amount-words">
      <div class="amount-words-text">{{wordsText}}</div>
    </div>

    <!-- ═══ PAYMENT SECTION ═══ -->
    {{#if showPaymentSection}}
    <div class="payment-section">
      <div class="bank-details">
        <div class="bank-title">Payment Details</div>
        {{#if bankName}}<div class="bank-row"><span class="bank-label">Bank Name</span><span class="bank-value">{{bankName}}</span></div>{{/if}}
        {{#if accountNo}}<div class="bank-row"><span class="bank-label">Account No.</span><span class="bank-value">{{accountNo}}</span></div>{{/if}}
        {{#if ifscCode}}<div class="bank-row"><span class="bank-label">IFSC Code</span><span class="bank-value">{{ifscCode}}</span></div>{{/if}}
        {{#if upiId}}<div class="bank-row"><span class="bank-label">UPI ID</span><span class="bank-value">{{upiId}}</span></div>{{/if}}
      </div>
      {{#if qrCodeDataUrl}}
      <div class="qr-block">
        <img src="{{qrCodeDataUrl}}" alt="QR Code" class="qr-code" />
        <div class="qr-label">Scan to Pay</div>
      </div>
      {{/if}}
    </div>
    {{/if}}

    <!-- ═══ NOTES & TERMS ═══ -->
    {{#if notes}}
    <div class="notes-section">
      <div class="notes-title">Notes</div>
      <div class="notes-text">{{notes}}</div>
    </div>
    {{/if}}

    {{#if terms}}
    <div class="notes-section">
      <div class="notes-title">Terms & Conditions</div>
      <ul class="terms-list">
        {{{escapeNewlines terms}}}
      </ul>
    </div>
    {{/if}}

    <!-- ═══ SIGNATORY ═══ -->
    <div class="signatory-section">
      <div class="signatory-block">
        <div class="signatory-line">
          <div class="signatory-label">Authorized Signatory</div>
          <div class="signatory-company">For {{company.companyName}}</div>
        </div>
      </div>
    </div>

    <!-- ═══ FOOTER ═══ -->
    <div class="invoice-footer">
      <div class="footer-thank-you">Thank you for your business</div>
      <div class="footer-legal">
        This is a computer-generated invoice and does not require a physical signature.
        {{#if company.website}} · {{company.website}}{{/if}}
      </div>
    </div>
  </div>
</body>
</html>`;

// ─── Compile & Cache Template ─────────────────────────────────

let compiledTemplate: Handlebars.TemplateDelegate | null = null;

function getCompiledTemplate(): Handlebars.TemplateDelegate {
    if (!compiledTemplate) {
        compiledTemplate = Handlebars.compile(INVOICE_TEMPLATE_SOURCE);
    }
    return compiledTemplate;
}

// ─── Build Invoice HTML ───────────────────────────────────────

/**
 * Build complete HTML invoice from payload using Handlebars.
 * Computes per-line-item taxes and totals before rendering.
 */
export function buildInvoiceHTMLHandlebars(data: InvoicePayload): string {
    const template = getCompiledTemplate();

    // Determine tax type
    const taxTypeResolved: string = data.taxType ||
        (data.igstAmount > 0 ? "IGST" : "CGST_SGST");

    // Compute per-line-item tax
    const computedItems = data.items.map(item =>
        calculateLineItemTax(item, taxTypeResolved as any)
    );

    // Compute totals
    let computedTotals = data.totals;
    if (!computedTotals) {
        const { calculateInvoiceTotals } = require("./utils");
        computedTotals = calculateInvoiceTotals(data.items, taxTypeResolved as any);
    }

    // Determine bank details (from bankDetails object or company fields)
    const bankName = data.bankDetails?.bankName || data.company.bankName || "";
    const accountNo = data.bankDetails?.accountNo || data.company.accountNo || "";
    const ifscCode = data.bankDetails?.ifsc || data.company.ifsc || "";
    const upiId = data.bankDetails?.upiId || data.company.upiId || "";

    const showPaymentSection = !!(bankName || accountNo || data.qrCodeDataUrl);

    // Check if any item has discount
    const hasDiscount = computedItems.some(item => (item.discount ?? 0) > 0);

    // Status theme
    const statusTheme = STATUS_THEME[data.status] || STATUS_THEME.draft;

    // Amount in words
    const wordsText = data.amountInWords || numberToWords(computedTotals!.grandTotal ?? data.totalAmount);

    // Place of supply display
    const displayPlaceOfSupply = data.placeOfSupply || data.client.placeOfSupply || "";

    // Template context
    const context = {
        ...data,
        taxTypeResolved,
        computedItems,
        computedTotals,
        statusTheme,
        wordsText,
        displayPlaceOfSupply,
        hasDiscount,
        showPaymentSection,
        bankName,
        accountNo,
        ifscCode,
        upiId,
    };

    return template(context);
}
