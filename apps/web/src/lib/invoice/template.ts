/**
 * Premium Invoice HTML Template
 * ─────────────────────────────
 * Generates a pixel-perfect, Stripe/Razorpay-grade HTML invoice
 * optimized for Puppeteer PDF rendering.
 *
 * Design principles:
 * ─ A4 format with 20mm margins
 * ─ Inter font via Google Fonts
 * ─ 8px spacing system
 * ─ CSS print media rules for page breaks
 * ─ No external dependencies at render time
 */

import type { InvoicePayload, InvoiceStatus } from "./types";
import { formatINR, formatNumber, formatDate, numberToWords } from "./utils";

// ─── Status Badge Colors ──────────────────────────────────────

const STATUS_THEME: Record<InvoiceStatus, { bg: string; text: string; label: string }> = {
    paid: { bg: "#dcfce7", text: "#166534", label: "PAID" },
    sent: { bg: "#dbeafe", text: "#1e40af", label: "SENT" },
    draft: { bg: "#f1f5f9", text: "#475569", label: "DRAFT" },
    overdue: { bg: "#fee2e2", text: "#991b1b", label: "OVERDUE" },
    cancelled: { bg: "#fef3c7", text: "#92400e", label: "CANCELLED" },
    partially_paid: { bg: "#e0e7ff", text: "#3730a3", label: "PARTIAL" },
};

// ─── Build Full HTML ──────────────────────────────────────────

export function buildInvoiceHTML(data: InvoicePayload): string {
    const {
        invoiceNumber, issueDate, dueDate, status,
        company, client, items,
        subtotal, cgstAmount, sgstAmount, igstAmount, totalAmount,
        amountInWords, notes, terms, placeOfSupply, qrCodeDataUrl,
    } = data;

    const statusTheme = STATUS_THEME[status] || STATUS_THEME.draft;

    // Calculate effective GST rates for labels
    const gstRates = [...new Set(items.map(i => Number(i.gstRate) || 0))];
    const cgstLabel = gstRates.length === 1 ? `CGST @ ${(gstRates[0] / 2) || 0}%` : "CGST";
    const sgstLabel = gstRates.length === 1 ? `SGST @ ${(gstRates[0] / 2) || 0}%` : "SGST";

    const wordsText = amountInWords || numberToWords(totalAmount);

    // Render item rows
    const itemRows = items.map((item, idx) => `
    <tr class="${idx % 2 === 0 ? "row-even" : "row-odd"}">
      <td class="cell-center cell-serial">${idx + 1}</td>
      <td class="cell-desc">
        <span class="desc-text">${escapeHtml(item.description)}</span>
        ${item.hsnCode ? `<span class="hsn-badge">HSN: ${escapeHtml(item.hsnCode)}</span>` : ""}
      </td>
      <td class="cell-right cell-mono">${formatNumber(item.quantity)}</td>
      <td class="cell-center cell-unit">${escapeHtml(item.unit)}</td>
      <td class="cell-right cell-mono">${formatNumber(item.rate)}</td>
      <td class="cell-center cell-gst">${Number(item.gstRate) || 0}%</td>
      <td class="cell-right cell-mono cell-amount">${formatNumber(item.amount)}</td>
    </tr>
  `).join("\n");

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Invoice ${escapeHtml(invoiceNumber)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
  <style>
    /* ═══════════════════════════════════════════════════════════ */
    /*  CSS Reset & Base                                         */
    /* ═══════════════════════════════════════════════════════════ */
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

    :root {
      --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      --font-mono: 'JetBrains Mono', 'SF Mono', 'Consolas', monospace;

      /* Spacing scale (8px base) */
      --sp-1: 4px;
      --sp-2: 8px;
      --sp-3: 12px;
      --sp-4: 16px;
      --sp-5: 20px;
      --sp-6: 24px;
      --sp-8: 32px;
      --sp-10: 40px;
      --sp-12: 48px;

      /* Colors */
      --slate-50: #f8fafc;
      --slate-100: #f1f5f9;
      --slate-200: #e2e8f0;
      --slate-300: #cbd5e1;
      --slate-400: #94a3b8;
      --slate-500: #64748b;
      --slate-600: #475569;
      --slate-700: #334155;
      --slate-800: #1e293b;
      --slate-900: #0f172a;
      --slate-950: #020617;

      --blue-50: #eff6ff;
      --blue-600: #2563eb;
      --blue-700: #1d4ed8;
      --blue-800: #1e40af;

      --accent: #2563eb;
      --accent-dark: #1e40af;
    }

    @page {
      size: A4;
      margin: 0;
    }

    body {
      font-family: var(--font-sans);
      font-size: 10px;
      line-height: 1.5;
      color: var(--slate-700);
      background: #fff;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    .invoice-page {
      width: 210mm;
      min-height: 297mm;
      padding: 20mm;
      position: relative;
      background: #fff;
      overflow: hidden;
    }

    /* ═══════════════════════════════════════════════════════════ */
    /*  Top Accent Bar                                           */
    /* ═══════════════════════════════════════════════════════════ */
    .accent-bar {
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 4px;
      background: linear-gradient(90deg, var(--accent) 0%, #8b5cf6 50%, var(--accent) 100%);
    }

    /* ═══════════════════════════════════════════════════════════ */
    /*  Header                                                   */
    /* ═══════════════════════════════════════════════════════════ */
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
      width: 52px;
      height: 52px;
      border-radius: 12px;
      object-fit: contain;
      border: 1px solid var(--slate-200);
      background: var(--slate-50);
      flex-shrink: 0;
    }

    .company-logo-placeholder {
      width: 52px;
      height: 52px;
      border-radius: 12px;
      background: linear-gradient(135deg, var(--accent), #8b5cf6);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .company-logo-placeholder span {
      font-size: 20px;
      font-weight: 800;
      color: #fff;
      letter-spacing: -0.5px;
    }

    .company-name {
      font-size: 17px;
      font-weight: 700;
      color: var(--slate-900);
      letter-spacing: -0.3px;
      line-height: 1.2;
    }

    .company-address {
      font-size: 9px;
      color: var(--slate-500);
      max-width: 280px;
      line-height: 1.4;
      margin-top: 3px;
    }

    .company-contact {
      font-size: 8.5px;
      color: var(--slate-400);
      margin-top: 2px;
    }

    .company-gstin {
      font-size: 9px;
      font-weight: 600;
      color: var(--slate-600);
      margin-top: 4px;
      letter-spacing: 0.3px;
    }

    .invoice-title-block {
      text-align: right;
      flex-shrink: 0;
    }

    .invoice-title {
      font-size: 28px;
      font-weight: 800;
      color: var(--slate-900);
      letter-spacing: -1px;
      line-height: 1;
    }

    .invoice-number {
      font-family: var(--font-mono);
      font-size: 12px;
      font-weight: 600;
      color: var(--accent);
      margin-top: 6px;
      letter-spacing: 0.5px;
    }

    .invoice-meta-row {
      display: flex;
      justify-content: flex-end;
      gap: var(--sp-6);
      margin-top: var(--sp-3);
    }

    .meta-item {
      text-align: right;
    }

    .meta-label {
      font-size: 7.5px;
      font-weight: 600;
      color: var(--slate-400);
      text-transform: uppercase;
      letter-spacing: 0.8px;
    }

    .meta-value {
      font-size: 10.5px;
      font-weight: 600;
      color: var(--slate-800);
      margin-top: 1px;
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 3px 10px;
      border-radius: 20px;
      font-size: 8.5px;
      font-weight: 700;
      letter-spacing: 0.8px;
      margin-top: 8px;
    }

    .status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
    }

    /* ═══════════════════════════════════════════════════════════ */
    /*  Client Card                                              */
    /* ═══════════════════════════════════════════════════════════ */
    .client-section {
      margin-bottom: var(--sp-6);
    }

    .client-card {
      border: 1px solid var(--slate-200);
      border-radius: 12px;
      padding: var(--sp-4) var(--sp-5);
      background: var(--slate-50);
    }

    .client-label {
      font-size: 7.5px;
      font-weight: 700;
      color: var(--slate-400);
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: var(--sp-2);
    }

    .client-name {
      font-size: 14px;
      font-weight: 700;
      color: var(--slate-900);
      letter-spacing: -0.2px;
    }

    .client-address {
      font-size: 9.5px;
      color: var(--slate-500);
      margin-top: 4px;
      line-height: 1.5;
    }

    .client-details {
      display: flex;
      gap: var(--sp-8);
      margin-top: var(--sp-2);
      flex-wrap: wrap;
    }

    .client-detail {
      font-size: 8.5px;
    }

    .client-detail-label {
      color: var(--slate-400);
      font-weight: 600;
    }

    .client-detail-value {
      color: var(--slate-700);
      font-weight: 500;
      font-family: var(--font-mono);
      font-size: 8.5px;
    }

    /* ═══════════════════════════════════════════════════════════ */
    /*  Items Table                                              */
    /* ═══════════════════════════════════════════════════════════ */
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: var(--sp-6);
    }

    .items-table thead th {
      background: var(--slate-900);
      color: #fff;
      font-size: 7.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      padding: 10px 12px;
      white-space: nowrap;
    }

    .items-table thead th:first-child {
      border-radius: 8px 0 0 0;
      padding-left: 14px;
    }

    .items-table thead th:last-child {
      border-radius: 0 8px 0 0;
    }

    .items-table tbody td {
      padding: 10px 12px;
      font-size: 9.5px;
      border-bottom: 1px solid var(--slate-100);
      vertical-align: middle;
    }

    .items-table tbody td:first-child {
      padding-left: 14px;
    }

    .row-even { background: #fff; }
    .row-odd  { background: var(--slate-50); }

    .cell-center { text-align: center; }
    .cell-right  { text-align: right; }
    .cell-mono   { font-family: var(--font-mono); font-size: 9.5px; font-weight: 500; }

    .cell-serial {
      font-weight: 600;
      color: var(--slate-400);
      font-size: 9px;
      width: 32px;
    }

    .cell-desc {
      max-width: 220px;
      line-height: 1.4;
    }

    .desc-text {
      color: var(--slate-800);
      font-weight: 500;
    }

    .hsn-badge {
      display: inline-block;
      font-size: 7.5px;
      font-family: var(--font-mono);
      color: var(--slate-400);
      background: var(--slate-100);
      padding: 1px 6px;
      border-radius: 4px;
      margin-left: 6px;
      font-weight: 500;
      vertical-align: middle;
    }

    .cell-unit {
      color: var(--slate-500);
      font-size: 9px;
      text-transform: lowercase;
    }

    .cell-gst {
      color: var(--slate-500);
      font-size: 9px;
    }

    .cell-amount {
      font-weight: 600;
      color: var(--slate-900);
    }

    /* ═══════════════════════════════════════════════════════════ */
    /*  Summary Card                                             */
    /* ═══════════════════════════════════════════════════════════ */
    .summary-section {
      display: flex;
      justify-content: flex-end;
      margin-bottom: var(--sp-6);
    }

    .summary-card {
      width: 260px;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04);
      border: 1px solid var(--slate-200);
    }

    .summary-body {
      padding: var(--sp-4) var(--sp-5);
    }

    .summary-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 0;
    }

    .summary-label {
      font-size: 9.5px;
      color: var(--slate-500);
      font-weight: 500;
    }

    .summary-value {
      font-family: var(--font-mono);
      font-size: 10px;
      font-weight: 500;
      color: var(--slate-800);
    }

    .summary-divider {
      height: 1px;
      background: var(--slate-200);
      margin: var(--sp-2) 0;
    }

    .summary-total {
      background: linear-gradient(135deg, var(--slate-900), var(--slate-800));
      padding: var(--sp-4) var(--sp-5);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .total-label {
      font-size: 11px;
      font-weight: 700;
      color: #fff;
      letter-spacing: 0.5px;
    }

    .total-value {
      font-family: var(--font-mono);
      font-size: 16px;
      font-weight: 700;
      color: #fff;
      letter-spacing: -0.3px;
    }

    .amount-words {
      display: flex;
      justify-content: flex-end;
      margin-top: var(--sp-2);
      margin-bottom: var(--sp-5);
    }

    .amount-words-text {
      font-size: 8.5px;
      color: var(--slate-400);
      font-style: italic;
      max-width: 260px;
      text-align: right;
      line-height: 1.4;
    }

    /* ═══════════════════════════════════════════════════════════ */
    /*  Payment Section                                          */
    /* ═══════════════════════════════════════════════════════════ */
    .payment-section {
      display: flex;
      gap: var(--sp-6);
      padding: var(--sp-5);
      border: 1px solid var(--slate-200);
      border-radius: 12px;
      background: var(--slate-50);
      margin-bottom: var(--sp-6);
      align-items: flex-start;
    }

    .bank-details {
      flex: 1;
    }

    .bank-title {
      font-size: 8px;
      font-weight: 700;
      color: var(--slate-400);
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: var(--sp-3);
    }

    .bank-row {
      display: flex;
      margin-bottom: 5px;
    }

    .bank-label {
      font-size: 8.5px;
      font-weight: 600;
      color: var(--slate-400);
      width: 85px;
      flex-shrink: 0;
    }

    .bank-value {
      font-size: 9px;
      font-weight: 500;
      color: var(--slate-700);
      font-family: var(--font-mono);
    }

    .qr-block {
      flex-shrink: 0;
      text-align: center;
    }

    .qr-code {
      width: 72px;
      height: 72px;
      border: 1px solid var(--slate-200);
      border-radius: 8px;
      background: #fff;
      padding: 4px;
    }

    .qr-label {
      font-size: 7px;
      color: var(--slate-400);
      margin-top: 4px;
      font-weight: 500;
    }

    /* ═══════════════════════════════════════════════════════════ */
    /*  Notes & Terms                                            */
    /* ═══════════════════════════════════════════════════════════ */
    .notes-section {
      margin-bottom: var(--sp-5);
    }

    .notes-title {
      font-size: 8px;
      font-weight: 700;
      color: var(--slate-400);
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: var(--sp-2);
    }

    .notes-text {
      font-size: 8.5px;
      color: var(--slate-500);
      line-height: 1.6;
    }

    .terms-list {
      font-size: 8px;
      color: var(--slate-400);
      line-height: 1.7;
      padding-left: 0;
      list-style: none;
    }

    .terms-list li::before {
      content: "•";
      color: var(--slate-300);
      margin-right: 6px;
    }

    /* ═══════════════════════════════════════════════════════════ */
    /*  Footer                                                   */
    /* ═══════════════════════════════════════════════════════════ */
    .invoice-footer {
      border-top: 1px solid var(--slate-200);
      padding-top: var(--sp-4);
      text-align: center;
    }

    .footer-thank-you {
      font-size: 11px;
      font-weight: 600;
      color: var(--slate-400);
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }

    .footer-legal {
      font-size: 7.5px;
      color: var(--slate-300);
      line-height: 1.4;
    }

    /* ═══════════════════════════════════════════════════════════ */
    /*  Print                                                    */
    /* ═══════════════════════════════════════════════════════════ */
    @media print {
      body { margin: 0; }
      .invoice-page { padding: 20mm; }
      .items-table { page-break-inside: auto; }
      .items-table tr { page-break-inside: avoid; page-break-after: auto; }
      .summary-section { page-break-inside: avoid; }
      .payment-section { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="invoice-page">
    <div class="accent-bar"></div>

    <!-- ═══ HEADER ═══════════════════════════════════════════ -->
    <div class="header">
      <div class="company-block">
        ${company.logoUrl
            ? `<img src="${escapeHtml(company.logoUrl)}" alt="Logo" class="company-logo" />`
            : `<div class="company-logo-placeholder"><span>${getInitials(company.companyName)}</span></div>`
        }
        <div>
          <div class="company-name">${escapeHtml(company.companyName)}</div>
          <div class="company-address">${escapeHtml(company.address)}</div>
          <div class="company-contact">${[company.phone, company.email].filter(Boolean).join("  ·  ")}</div>
          ${company.gstin ? `<div class="company-gstin">GSTIN: ${escapeHtml(company.gstin)}${company.pan ? `  |  PAN: ${escapeHtml(company.pan)}` : ""}</div>` : ""}
        </div>
      </div>

      <div class="invoice-title-block">
        <div class="invoice-title">INVOICE</div>
        <div class="invoice-number">${escapeHtml(invoiceNumber)}</div>

        <div class="invoice-meta-row">
          <div class="meta-item">
            <div class="meta-label">Issue Date</div>
            <div class="meta-value">${formatDate(issueDate)}</div>
          </div>
          <div class="meta-item">
            <div class="meta-label">Due Date</div>
            <div class="meta-value">${formatDate(dueDate)}</div>
          </div>
        </div>

        <div class="status-badge" style="background: ${statusTheme.bg}; color: ${statusTheme.text};">
          <span class="status-dot" style="background: ${statusTheme.text};"></span>
          ${statusTheme.label}
        </div>
      </div>
    </div>

    <!-- ═══ CLIENT CARD ══════════════════════════════════════ -->
    <div class="client-section">
      <div class="client-card">
        <div class="client-label">Bill To</div>
        <div class="client-name">${escapeHtml(client.name)}</div>
        ${client.address ? `<div class="client-address">${escapeHtml(client.address)}</div>` : ""}
        <div class="client-details">
          ${client.gstin ? `<div class="client-detail"><span class="client-detail-label">GSTIN: </span><span class="client-detail-value">${escapeHtml(client.gstin)}</span></div>` : ""}
          ${client.phone ? `<div class="client-detail"><span class="client-detail-label">Phone: </span><span class="client-detail-value">${escapeHtml(client.phone)}</span></div>` : ""}
          ${client.email ? `<div class="client-detail"><span class="client-detail-label">Email: </span><span class="client-detail-value">${escapeHtml(client.email)}</span></div>` : ""}
          ${placeOfSupply ? `<div class="client-detail"><span class="client-detail-label">Place of Supply: </span><span class="client-detail-value">${escapeHtml(placeOfSupply)}</span></div>` : ""}
        </div>
      </div>
    </div>

    <!-- ═══ ITEMS TABLE ══════════════════════════════════════ -->
    <table class="items-table">
      <thead>
        <tr>
          <th class="cell-center" style="width: 32px;">#</th>
          <th style="text-align: left;">Description</th>
          <th class="cell-right" style="width: 60px;">Qty</th>
          <th class="cell-center" style="width: 48px;">Unit</th>
          <th class="cell-right" style="width: 80px;">Rate (\u20B9)</th>
          <th class="cell-center" style="width: 48px;">GST</th>
          <th class="cell-right" style="width: 90px;">Amount (\u20B9)</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
      </tbody>
    </table>

    <!-- ═══ SUMMARY CARD ═════════════════════════════════════ -->
    <div class="summary-section">
      <div class="summary-card">
        <div class="summary-body">
          <div class="summary-row">
            <span class="summary-label">Subtotal</span>
            <span class="summary-value">${formatINR(subtotal)}</span>
          </div>
          ${igstAmount > 0 ? `
            <div class="summary-row">
              <span class="summary-label">IGST @ ${gstRates.length === 1 ? gstRates[0] : "—"}%</span>
              <span class="summary-value">${formatINR(igstAmount)}</span>
            </div>
          ` : `
            <div class="summary-row">
              <span class="summary-label">${cgstLabel}</span>
              <span class="summary-value">${formatINR(cgstAmount)}</span>
            </div>
            <div class="summary-row">
              <span class="summary-label">${sgstLabel}</span>
              <span class="summary-value">${formatINR(sgstAmount)}</span>
            </div>
          `}
          <div class="summary-divider"></div>
        </div>
        <div class="summary-total">
          <span class="total-label">GRAND TOTAL</span>
          <span class="total-value">${formatINR(totalAmount)}</span>
        </div>
      </div>
    </div>

    <div class="amount-words">
      <div class="amount-words-text">${escapeHtml(wordsText)}</div>
    </div>

    <!-- ═══ PAYMENT SECTION ══════════════════════════════════ -->
    ${(company.bankName || company.accountNo || qrCodeDataUrl) ? `
    <div class="payment-section">
      <div class="bank-details">
        <div class="bank-title">Payment Details</div>
        ${company.bankName ? `<div class="bank-row"><span class="bank-label">Bank Name</span><span class="bank-value">${escapeHtml(company.bankName)}</span></div>` : ""}
        ${company.accountNo ? `<div class="bank-row"><span class="bank-label">Account No.</span><span class="bank-value">${escapeHtml(company.accountNo)}</span></div>` : ""}
        ${company.ifsc ? `<div class="bank-row"><span class="bank-label">IFSC Code</span><span class="bank-value">${escapeHtml(company.ifsc)}</span></div>` : ""}
        ${company.upiId ? `<div class="bank-row"><span class="bank-label">UPI ID</span><span class="bank-value">${escapeHtml(company.upiId)}</span></div>` : ""}
      </div>
      ${qrCodeDataUrl ? `
      <div class="qr-block">
        <img src="${qrCodeDataUrl}" alt="QR Code" class="qr-code" />
        <div class="qr-label">Scan to Pay</div>
      </div>
      ` : ""}
    </div>
    ` : ""}

    <!-- ═══ NOTES & TERMS ════════════════════════════════════ -->
    ${notes ? `
    <div class="notes-section">
      <div class="notes-title">Notes</div>
      <div class="notes-text">${escapeHtml(notes)}</div>
    </div>
    ` : ""}

    ${terms ? `
    <div class="notes-section">
      <div class="notes-title">Terms & Conditions</div>
      <ul class="terms-list">
        ${terms.split("\n").filter(Boolean).map(t => `<li>${escapeHtml(t.replace(/^\d+\.\s*/, ""))}</li>`).join("")}
      </ul>
    </div>
    ` : ""}

    <!-- ═══ FOOTER ═══════════════════════════════════════════ -->
    <div class="invoice-footer">
      <div class="footer-thank-you">Thank you for your business</div>
      <div class="footer-legal">
        This is a computer-generated invoice and does not require a physical signature.
        ${company.website ? ` · ${escapeHtml(company.website)}` : ""}
      </div>
    </div>
  </div>
</body>
</html>`;
}

// ─── Helpers ──────────────────────────────────────────────────

function escapeHtml(str: string): string {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function getInitials(name: string): string {
    return name
        .split(/\s+/)
        .slice(0, 2)
        .map(w => w[0]?.toUpperCase() || "")
        .join("");
}
