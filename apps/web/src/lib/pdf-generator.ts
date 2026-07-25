/**
 * Enterprise PDF Generator v2 — IND Manager
 *
 * Pixel-perfect, Tally/Zoho-quality invoices.
 * Uses a strict fixed-grid layout engine built on jsPDF.
 *
 * Key design principles:
 * ─ Fixed column widths (never shift, regardless of text length)
 * ─ Right-aligned numerics with tabular-number formatting
 * ─ Multi-page support with repeated table headers
 * ─ Logo pre-loaded as base64 to guarantee render
 * ─ A4-optimised with professional print margins
 */
import { jsPDF } from "jspdf";

// ═══════════════════════════════════════════════════════════════════
//  Types
// ═══════════════════════════════════════════════════════════════════

export interface CompanyInfo {
    companyName: string;
    address: string;
    phone: string;
    email: string;
    logoUrl?: string;
    gstin?: string;
    pan?: string;
    bankName?: string;
    accountNo?: string;
    ifsc?: string;
    upiId?: string;
}

export interface InvoiceItem {
    description: string;
    hsnCode?: string;
    quantity: number;
    unit: string;
    rate: number;
    amount: number;
    gstRate: number;
}

export interface InvoiceData {
    billNumber: string;
    billDate: string;
    dueDate: string;
    clientName: string;
    clientAddress?: string;
    clientGSTIN?: string;
    clientPhone?: string;
    clientEmail?: string;
    items: InvoiceItem[];
    subtotal: number;
    cgstAmount: number;
    sgstAmount: number;
    igstAmount: number;
    totalAmount: number;
    amountInWords: string;
    notes?: string;
    terms?: string;
    status?: string;
}

// ═══════════════════════════════════════════════════════════════════
//  Color Palette — Enterprise Deep Blue-Grey
// ═══════════════════════════════════════════════════════════════════

type RGB = [number, number, number];

const C = {
    // Accent / brand
    primary: [17, 24, 39] as RGB,  // slate-900  (header bar, table head)
    primaryLight: [241, 245, 249] as RGB,  // slate-100  (shaded bg)
    accent: [29, 78, 216] as RGB,  // blue-700   (badge bg)
    accentLight: [239, 246, 255] as RGB,  // blue-50

    // Text
    heading: [15, 23, 42] as RGB,  // slate-950
    body: [51, 65, 85] as RGB,  // slate-700
    muted: [100, 116, 139] as RGB, // slate-500
    subtle: [148, 163, 184] as RGB, // slate-400

    // Surfaces
    border: [226, 232, 240] as RGB, // slate-200
    rowAlt: [248, 250, 252] as RGB, // slate-50
    white: [255, 255, 255] as RGB,

    // Totals
    totalBg: [17, 24, 39] as RGB,  // slate-900
    totalText: [255, 255, 255] as RGB,

    // Status badges
    paidBg: [220, 252, 231] as RGB,
    paidText: [22, 101, 52] as RGB,
    draftBg: [241, 245, 249] as RGB,
    draftText: [71, 85, 105] as RGB,
    overdueBg: [254, 226, 226] as RGB,
    overdueText: [153, 27, 27] as RGB,
    sentBg: [219, 234, 254] as RGB,
    sentText: [30, 64, 175] as RGB,
};

// ═══════════════════════════════════════════════════════════════════
//  A4 Grid Constants (mm)
// ═══════════════════════════════════════════════════════════════════

const PAGE_W = 210;
const PAGE_H = 297;
const ML = 15;          // margin left
const MR = 15;          // margin right
const MT = 20;          // margin top (increased from 15)
const MB = 22;          // margin bottom (footer space)
const CW = PAGE_W - ML - MR; // content width = 180

// ═══════════════════════════════════════════════════════════════════
//  Helpers
// ═══════════════════════════════════════════════════════════════════

/** Indian-style formatting with two decimal places */
function fmt(n: number): string {
    return "Rs. " + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Compact number (no \u20B9) for table cells to save space */
function fmtNum(n: number): string {
    return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(dateStr: string): string {
    try {
        return new Date(dateStr).toLocaleDateString("en-IN", {
            day: "2-digit", month: "short", year: "numeric",
        });
    } catch { return dateStr; }
}

/** Resolve any logo URL to base64 data-uri */
async function resolveLogoBase64(url: string | undefined): Promise<string | null> {
    if (!url) return null;
    if (url.startsWith("data:image")) return url;
    try {
        const res = await fetch(url);
        const blob = await res.blob();
        return await new Promise<string | null>((resolve) => {
            const r = new FileReader();
            r.onloadend = () => resolve(r.result as string);
            r.onerror = () => resolve(null);
            r.readAsDataURL(blob);
        });
    } catch { return null; }
}

// ─── Low-level drawing helpers ───────────────────────────────────

function hline(doc: jsPDF, x1: number, y: number, x2: number, color: RGB = C.border, width = 0.3) {
    doc.setDrawColor(...color);
    doc.setLineWidth(width);
    doc.line(x1, y, x2, y);
}

/** Print text clipped to maxW, with optional alignment */
function clippedText(
    doc: jsPDF,
    text: string,
    x: number,
    y: number,
    maxW: number,
    align: "left" | "right" | "center" = "left",
) {
    let t = text;
    // Truncate if it overflows the allotted width
    while (doc.getTextWidth(t) > maxW && t.length > 1) {
        t = t.slice(0, -1);
    }
    if (t !== text) t = t.slice(0, -1) + "…";

    if (align === "right") {
        doc.text(t, x + maxW, y, { align: "right" });
    } else if (align === "center") {
        doc.text(t, x + maxW / 2, y, { align: "center" });
    } else {
        doc.text(t, x, y);
    }
}

/** Word-wrap and return lines that fit within maxW */
function wrapText(doc: jsPDF, text: string, maxW: number): string[] {
    return doc.splitTextToSize(text, maxW) as string[];
}

// ═══════════════════════════════════════════════════════════════════
//  Fixed Column Grid for Invoice Table
// ═══════════════════════════════════════════════════════════════════

interface ColDef {
    label: string;
    x: number;        // absolute x position
    w: number;         // column width
    align: "left" | "right" | "center";
    pad: number;       // internal padding from edge
}

/**
 * Strictly-defined table columns.
 * Total width = CW = 180 mm
 *
 * #   Description   HSN/SAC   Qty   Unit   Rate      GST %   Amount
 * 8    62           20        15    15     20        12      28
 *                                                          Total = 180
 * Verified: 8+62+20+15+15+20+12+28 = 180 ✔
 */
function getInvoiceCols(): ColDef[] {
    const x0 = ML;
    const cols: ColDef[] = [
        { label: "#", x: x0, w: 8, align: "center", pad: 1 },
        { label: "DESCRIPTION", x: x0 + 8, w: 58, align: "left", pad: 3 },  // reduced from 62
        { label: "HSN/SAC", x: x0 + 66, w: 20, align: "left", pad: 2 },
        { label: "QTY", x: x0 + 86, w: 15, align: "right", pad: 2 },
        { label: "UNIT", x: x0 + 101, w: 15, align: "center", pad: 1 },
        { label: "RATE", x: x0 + 116, w: 22, align: "right", pad: 2 },      // widened, removed (INR)
        { label: "GST %", x: x0 + 138, w: 12, align: "right", pad: 2 },
        { label: "AMOUNT", x: x0 + 150, w: 30, align: "right", pad: 3 },    // widened, removed (INR)
    ];
    return cols;
}

// ═══════════════════════════════════════════════════════════════════
//  Draw Table Header Row
// ═══════════════════════════════════════════════════════════════════

function drawTableHeader(doc: jsPDF, y: number, cols: ColDef[]): number {
    const h = 11;  // taller header
    // Dark background
    doc.setFillColor(...C.primary);
    doc.rect(ML, y, CW, h, "F");
    // White text
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...C.totalText);

    for (const col of cols) {
        const tx = col.align === "right"
            ? col.x + col.w - col.pad
            : col.align === "center"
                ? col.x + col.w / 2
                : col.x + col.pad;
        doc.text(col.label, tx, y + 7.2, { align: col.align });
    }

    return y + h;
}

// ═══════════════════════════════════════════════════════════════════
//  Draw Page Footer (every page)
// ═══════════════════════════════════════════════════════════════════

function drawPageFooter(doc: jsPDF, pageNum: number, totalPages: number) {
    const fy = PAGE_H - 10;
    hline(doc, ML, fy, ML + CW, C.border, 0.2);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.setTextColor(...C.subtle);
    doc.text(
        "This is a computer-generated invoice and does not require a physical signature.",
        ML + CW / 2, fy + 4,
        { align: "center" },
    );
    doc.text(`Page ${pageNum} of ${totalPages}`, ML + CW, fy + 4, { align: "right" });
    doc.text("Generated by IND Manager", ML, fy + 4);
}

// ═══════════════════════════════════════════════════════════════════
//  MAIN: generateInvoicePDF
// ═══════════════════════════════════════════════════════════════════

export async function generateInvoicePDF(
    invoice: InvoiceData,
    company: CompanyInfo | null,
    options: { download?: boolean; filename?: string } = { download: true },
): Promise<jsPDF> {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const cols = getInvoiceCols();

    // ─── Pre-load logo ──────────────────────────────────────────
    const logoBase64 = await resolveLogoBase64(company?.logoUrl);

    // ─── Helper: create new page with header bar ────────────────
    let pageNum = 1;
    const addNewPage = () => {
        doc.addPage();
        pageNum++;
    };

    // ─── Cursor ─────────────────────────────────────────────────
    let y = MT;

    // ═══════════════════════════════════════════════════════════
    //  SECTION 1 — TOP ACCENT BAR
    // ═══════════════════════════════════════════════════════════

    doc.setFillColor(...C.primary);
    doc.rect(0, 0, PAGE_W, 3.5, "F");

    // ═══════════════════════════════════════════════════════════
    //  SECTION 2 — COMPANY HEADER + LOGO
    // ═══════════════════════════════════════════════════════════

    y = 15;
    let headerTextX = ML;

    if (logoBase64) {
        try {
            doc.addImage(logoBase64, "PNG", ML, y, 22, 22);
            headerTextX = ML + 28;
        } catch { /* logo failed — continue without it */ }
    }

    // Company name
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(...C.heading);
    doc.text(company?.companyName || "Your Company", headerTextX, y + 8);

    // Address line
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...C.muted);
    const addr = company?.address?.replace(/\n/g, ", ") || "";
    if (addr) doc.text(addr, headerTextX, y + 14);

    // Contact line
    const contactParts: string[] = [];
    if (company?.phone) contactParts.push(`Tel: ${company.phone}`);
    if (company?.email) contactParts.push(company.email);
    if (contactParts.length) {
        doc.setFontSize(7.5);
        doc.setTextColor(...C.subtle);
        doc.text(contactParts.join("  |  "), headerTextX, y + 18.5);
    }

    // Tax IDs
    const taxParts: string[] = [];
    if (company?.gstin) taxParts.push(`GSTIN: ${company.gstin}`);
    if (company?.pan) taxParts.push(`PAN: ${company.pan}`);
    if (taxParts.length) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        doc.setTextColor(...C.body);
        doc.text(taxParts.join("  |  "), headerTextX, y + 20.5);
    }

    // ─── TAX INVOICE Badge (top-right) ──────────────────────────

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    const badgeLabel = "TAX INVOICE";
    const badgeW = doc.getTextWidth(badgeLabel) + 14;
    const badgeH = 10;
    const badgeX = ML + CW - badgeW;
    const badgeY = y;
    doc.setFillColor(...C.accent);
    doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 2, 2, "F");
    doc.setTextColor(...C.white);
    doc.text(badgeLabel, badgeX + badgeW / 2, badgeY + 7.2, { align: "center" });

    // Status badge beneath
    if (invoice.status) {
        const statusMap: Record<string, { bg: RGB; text: RGB; label: string }> = {
            paid: { bg: C.paidBg, text: C.paidText, label: "PAID" },
            draft: { bg: C.draftBg, text: C.draftText, label: "DRAFT" },
            overdue: { bg: C.overdueBg, text: C.overdueText, label: "OVERDUE" },
            sent: { bg: C.sentBg, text: C.sentText, label: "SENT" },
        };
        const s = statusMap[invoice.status] || statusMap.draft!;
        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        const sw = doc.getTextWidth(s.label) + 10;
        const sx = ML + CW - sw;
        doc.setFillColor(...s.bg);
        doc.roundedRect(sx, badgeY + badgeH + 2, sw, 6.5, 1.5, 1.5, "F");
        doc.setTextColor(...s.text);
        doc.text(s.label, sx + sw / 2, badgeY + badgeH + 6.5, { align: "center" });
    }

    y = 36;
    hline(doc, ML, y, ML + CW, C.border, 0.5);

    // ═══════════════════════════════════════════════════════════
    //  SECTION 3 — BILL-TO + INVOICE META (side-by-side)
    // ═══════════════════════════════════════════════════════════

    y += 4;
    const halfW = (CW - 6) / 2;
    const boxH = 40;

    // ─── Left box: BILL TO ──────────────────────────────────────
    doc.setFillColor(...C.rowAlt);
    doc.roundedRect(ML, y, halfW, boxH, 2, 2, "F");
    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.3);
    doc.roundedRect(ML, y, halfW, boxH, 2, 2, "S");

    let bx = ML + 5;
    let by = y + 6;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6);
    doc.setTextColor(...C.muted);
    doc.text("BILL TO", bx, by);
    by += 5;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...C.heading);
    clippedText(doc, invoice.clientName || "—", bx, by, halfW - 10);
    by += 5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...C.body);

    if (invoice.clientAddress) {
        const addrLines = wrapText(doc, invoice.clientAddress.replace(/\n/g, ", "), halfW - 12);
        const maxAddrLines = Math.min(addrLines.length, 3);
        for (let i = 0; i < maxAddrLines; i++) {
            doc.text(addrLines[i], bx, by);
            by += 3.5;
        }
    }

    if (invoice.clientGSTIN) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        doc.setTextColor(...C.body);
        doc.text(`GSTIN: ${invoice.clientGSTIN}`, bx, by + 1);
        by += 4.5;
    }

    const clientContact: string[] = [];
    if (invoice.clientPhone) clientContact.push(invoice.clientPhone);
    if (invoice.clientEmail) clientContact.push(invoice.clientEmail);
    if (clientContact.length) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(6.5);
        doc.setTextColor(...C.muted);
        doc.text(clientContact.join("  |  "), bx, by + 1);
    }

    // ─── Right box: INVOICE DETAILS ──────────────────────────────
    const rx = ML + halfW + 6;
    doc.setFillColor(...C.rowAlt);
    doc.roundedRect(rx, y, halfW, boxH, 2, 2, "F");
    doc.setDrawColor(...C.border);
    doc.roundedRect(rx, y, halfW, boxH, 2, 2, "S");

    const metaRows: [string, string][] = [
        ["Invoice No.", invoice.billNumber],
        ["Issue Date", fmtDate(invoice.billDate)],
        ["Due Date", fmtDate(invoice.dueDate)],
        ["Status", (invoice.status || "Draft").toUpperCase()],
    ];

    const metaLabelX = rx + 5;
    const metaValueX = rx + halfW - 5;
    let my = y + 7;
    for (const [label, value] of metaRows) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(...C.muted);
        doc.text(label.toUpperCase(), metaLabelX, my);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(...C.heading);
        doc.text(value, metaValueX, my, { align: "right" });

        my += 8;
    }

    y += boxH + 6;

    // ═══════════════════════════════════════════════════════════
    //  SECTION 4 — ITEMS TABLE
    // ═══════════════════════════════════════════════════════════

    y = drawTableHeader(doc, y, cols);

    // Row rendering
    // Body text: 9pt minimum, 3mm+ vertical cell padding
    const CELL_PAD_V = 3;      // 3mm vertical padding top & bottom
    const LINE_H = 3.8;        // height per wrapped line at 9pt
    const MIN_ROW_H = CELL_PAD_V * 2 + LINE_H;  // ~9.8mm minimum

    for (let idx = 0; idx < invoice.items.length; idx++) {
        const item = invoice.items[idx];

        // Calculate row height based on description wrapping at 9pt
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        const descMaxW = cols[1].w - cols[1].pad * 2;
        const descLines = wrapText(doc, item.description, descMaxW);
        const lineCount = Math.min(descLines.length, 3); // max 3 lines
        const rowH = Math.max(MIN_ROW_H, lineCount * LINE_H + CELL_PAD_V * 2);

        // ─── Page break check ────────────────────────────────
        if (y + rowH > PAGE_H - MB - 60) {
            // Leave space for totals section on last page
            addNewPage();
            // Top accent bar on continuation page
            doc.setFillColor(...C.primary);
            doc.rect(0, 0, PAGE_W, 3.5, "F");
            y = 12;
            // "Continued" label
            doc.setFont("helvetica", "italic");
            doc.setFontSize(7);
            doc.setTextColor(...C.muted);
            doc.text("Invoice continued…", ML, y + 3);
            y += 7;
            y = drawTableHeader(doc, y, cols);
        }

        // Alternating row background: even rows = #f8fafd, odd rows = white
        if (idx % 2 === 0) {
            doc.setFillColor(248, 250, 253);
            doc.rect(ML, y, CW, rowH, "F");
        } else {
            doc.setFillColor(255, 255, 255);
            doc.rect(ML, y, CW, rowH, "F");
        }

        // Light bottom border for every row
        hline(doc, ML, y + rowH, ML + CW, C.border, 0.15);

        const textY = y + (rowH / 2) + 2;   // vertically centered baseline
        const descY = y + CELL_PAD_V + 3;    // top-aligned with padding for wrapped text

        // Col 0: Serial #
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(...C.body);
        doc.text(String(idx + 1), cols[0].x + cols[0].w / 2, textY, { align: "center" });

        // Col 1: Description (wrapped, left-aligned, 9pt)
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(...C.heading);
        for (let li = 0; li < lineCount; li++) {
            doc.text(descLines[li], cols[1].x + cols[1].pad, descY + li * LINE_H);
        }

        // Col 2: HSN
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(...C.body);
        clippedText(doc, item.hsnCode || "—", cols[2].x + cols[2].pad, textY, cols[2].w - cols[2].pad * 2);

        // Col 3: Qty — RIGHT ALIGNED
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(...C.heading);
        doc.text(item.quantity.toLocaleString("en-IN"), cols[3].x + cols[3].w - cols[3].pad, textY, { align: "right" });

        // Col 4: Unit — CENTER
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(...C.muted);
        doc.text(item.unit || "pcs", cols[4].x + cols[4].w / 2, textY, { align: "center" });

        // Col 5: Rate — RIGHT ALIGNED
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(...C.heading);
        doc.text(fmtNum(item.rate), cols[5].x + cols[5].w - cols[5].pad, textY, { align: "right" });

        // Col 6: GST % — RIGHT ALIGNED
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(...C.body);
        const gRate = Number(item.gstRate) || 0;
        doc.text(`${gRate}%`, cols[6].x + cols[6].w - cols[6].pad, textY, { align: "right" });

        // Col 7: Amount — RIGHT ALIGNED, BOLD
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(...C.heading);
        doc.text(fmtNum(item.amount), cols[7].x + cols[7].w - cols[7].pad, textY, { align: "right" });

        y += rowH;
    }

    // Table bottom border
    hline(doc, ML, y, ML + CW, C.primary, 0.6);

    // ═══════════════════════════════════════════════════════════
    //  SECTION 5 — TOTALS (right-aligned block)
    // ═══════════════════════════════════════════════════════════

    y += 8;  // 5-8mm section gap

    // Page break guard for totals
    if (y + 55 > PAGE_H - MB) {
        addNewPage();
        doc.setFillColor(...C.primary);
        doc.rect(0, 0, PAGE_W, 3.5, "F");
        y = 15;
    }

    const TW = 85;                // totals block width
    const TX = ML + CW - TW;     // totals block left edge
    const TVX = ML + CW - 4;     // values right edge

    // Helper to draw a single totals row
    const drawTotalRow = (label: string, value: string, bold = false, size = 9) => {
        doc.setFont("helvetica", bold ? "bold" : "normal");
        doc.setFontSize(size);
        doc.setTextColor(...C.body);
        doc.text(label, TX + 4, y);
        // Use helvetica for values
        doc.setFont("helvetica", bold ? "bold" : "normal");
        doc.setTextColor(...C.heading);
        doc.text(value, TVX, y, { align: "right" });
        y += 7;
    };

    drawTotalRow("Subtotal", fmt(invoice.subtotal));

    // Always show CGST and SGST separately for GST compliance
    if (invoice.igstAmount > 0) {
        drawTotalRow("IGST", fmt(invoice.igstAmount));
    } else {
        // Calculate individual GST rates from items for label clarity
        const gstRates = [...new Set(invoice.items.map(i => Number(i.gstRate) || 0))];
        const cgstLabel = gstRates.length === 1 ? `CGST @ ${gstRates[0] / 2}%` : "CGST";
        const sgstLabel = gstRates.length === 1 ? `SGST @ ${gstRates[0] / 2}%` : "SGST";
        drawTotalRow(cgstLabel, fmt(invoice.cgstAmount));
        drawTotalRow(sgstLabel, fmt(invoice.sgstAmount));
    }

    hline(doc, TX, y - 3, TVX + 2, C.border, 0.3);
    y += 3;

    // Grand Total — highlighted box: brand accent background, white text
    const gtH = 15;
    doc.setFillColor(...C.accent);  // High contrast brand blue
    doc.roundedRect(TX - 2, y - 2, TW + 4, gtH, 3, 3, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);  // white text
    doc.text("TOTAL", TX + 5, y + 8.5);
    doc.text(fmt(invoice.totalAmount), TVX, y + 8.5, { align: "right" });

    y += gtH + 8;  // 5-8mm section gap

    // Amount in words
    if (invoice.amountInWords) {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(8);
        doc.setTextColor(...C.muted);
        const wordsLines = wrapText(doc, `Amount in words: ${invoice.amountInWords}`, CW);
        doc.text(wordsLines[0], ML, y);
        y += 7;
    }

    hline(doc, ML, y, ML + CW, C.border, 0.3);

    // ═══════════════════════════════════════════════════════════
    //  SECTION 6 — BANK DETAILS + SIGNATURE (side-by-side)
    // ═══════════════════════════════════════════════════════════

    y += 5;

    // Page-break guard
    if (y + 40 > PAGE_H - MB) {
        addNewPage();
        doc.setFillColor(...C.primary);
        doc.rect(0, 0, PAGE_W, 3.5, "F");
        y = 15;
    }

    // ─── Bank details (left) ─────────────────────────────────

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...C.heading);
    doc.text("BANK DETAILS", ML, y);
    y += 5;

    const bankData: [string, string][] = [
        ["Bank Name", company?.bankName || "—"],
        ["Account No", company?.accountNo || "—"],
        ["IFSC Code", company?.ifsc || "—"],
    ];
    if (company?.upiId) bankData.push(["UPI ID", company.upiId]);

    for (const [label, val] of bankData) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(...C.muted);
        doc.text(label + ":", ML, y);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...C.body);
        doc.text(val, ML + 25, y);
        y += 4;
    }

    // ─── Authorized Signatory (right) ────────────────────────

    const sigBlockX = ML + CW - 55;
    const sigBlockY = y - 14;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...C.heading);
    doc.text(`For ${company?.companyName || "Company"}`, sigBlockX, sigBlockY);

    hline(doc, sigBlockX, sigBlockY + 14, ML + CW, C.subtle, 0.3);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...C.muted);
    doc.text("Authorized Signatory", sigBlockX + 12, sigBlockY + 18);

    y += 4;

    // ═══════════════════════════════════════════════════════════
    //  SECTION 7 — NOTES & TERMS
    // ═══════════════════════════════════════════════════════════

    if (invoice.notes || invoice.terms) {
        hline(doc, ML, y, ML + CW, C.border, 0.2);
        y += 5;

        if (invoice.notes) {
            // Page-break guard
            if (y + 15 > PAGE_H - MB) {
                addNewPage();
                doc.setFillColor(...C.primary);
                doc.rect(0, 0, PAGE_W, 3.5, "F");
                y = 15;
            }

            doc.setFont("helvetica", "bold");
            doc.setFontSize(7);
            doc.setTextColor(...C.heading);
            doc.text("NOTES", ML, y);
            y += 4;
            doc.setFont("helvetica", "normal");
            doc.setFontSize(7);
            doc.setTextColor(...C.body);
            const noteLines = wrapText(doc, invoice.notes, CW);
            const maxNoteLines = Math.min(noteLines.length, 4);
            for (let i = 0; i < maxNoteLines; i++) {
                doc.text(noteLines[i], ML, y);
                y += 3.5;
            }
            y += 2;
        }

        if (invoice.terms) {
            // Page-break guard
            if (y + 15 > PAGE_H - MB) {
                addNewPage();
                doc.setFillColor(...C.primary);
                doc.rect(0, 0, PAGE_W, 3.5, "F");
                y = 15;
            }

            doc.setFont("helvetica", "bold");
            doc.setFontSize(6.5);
            doc.setTextColor(...C.heading);
            doc.text("TERMS & CONDITIONS", ML, y);
            y += 4;
            doc.setFont("helvetica", "normal");
            doc.setFontSize(6);
            doc.setTextColor(...C.muted);
            const termLines = wrapText(doc, invoice.terms.replace(/\n/g, "  •  "), CW);
            const maxTermLines = Math.min(termLines.length, 5);
            for (let i = 0; i < maxTermLines; i++) {
                doc.text(termLines[i], ML, y);
                y += 3;
            }
        }
    }

    // ═══════════════════════════════════════════════════════════
    //  PAGE FOOTERS (all pages)
    // ═══════════════════════════════════════════════════════════

    const totalPages = doc.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        // Bottom accent strip
        doc.setFillColor(...C.primary);
        doc.rect(0, PAGE_H - 5, PAGE_W, 5, "F");
        drawPageFooter(doc, p, totalPages);
    }

    // ─── Output ─────────────────────────────────────────────────
    const filename = options.filename || `Invoice_${invoice.billNumber.replace(/\//g, "_")}.pdf`;
    if (options.download !== false) {
        doc.save(filename);
    }
    return doc;
}


// ═══════════════════════════════════════════════════════════════════
//  Purchase Order PDF Generator
// ═══════════════════════════════════════════════════════════════════

export interface PurchaseOrderData {
    orderId: string;
    orderDate: string;
    clientName: string;
    clientAddress?: string;
    productName: string;
    quantity: number;
    rate: number;
    totalAmount: number;
    status: string;
    deliveryDate?: string;
    deductions?: { description: string; amount: number }[];
}

export async function generatePurchaseOrderPDF(
    order: PurchaseOrderData,
    company: CompanyInfo | null,
): Promise<void> {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    let y = MT;

    const logoBase64 = await resolveLogoBase64(company?.logoUrl);

    // Top accent bar
    doc.setFillColor(...C.primary);
    doc.rect(0, 0, PAGE_W, 3.5, "F");

    // Logo + Company header
    y = 10;
    let headerX = ML;
    if (logoBase64) {
        try {
            doc.addImage(logoBase64, "PNG", ML, y, 18, 18);
            headerX = ML + 22;
        } catch { /* skip */ }
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(...C.heading);
    doc.text(company?.companyName || "Your Company", headerX, y + 6);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...C.muted);
    if (company?.address) doc.text(company.address.replace(/\n/g, ", "), headerX, y + 11);

    // PO Badge
    const badge = "PURCHASE ORDER";
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    const bw = doc.getTextWidth(badge) + 12;
    doc.setFillColor(...C.accent);
    doc.roundedRect(ML + CW - bw, y, bw, 9, 2, 2, "F");
    doc.setTextColor(...C.white);
    doc.text(badge, ML + CW - bw + bw / 2, y + 6.5, { align: "center" });

    y = 34;
    hline(doc, ML, y, ML + CW, C.border, 0.4);
    y += 6;

    // Meta info (side-by-side)
    const halfW = (CW - 6) / 2;
    const metaBoxH = 26;

    // Left box — Client
    doc.setFillColor(...C.rowAlt);
    doc.roundedRect(ML, y, halfW, metaBoxH, 2, 2, "F");
    doc.setDrawColor(...C.border);
    doc.roundedRect(ML, y, halfW, metaBoxH, 2, 2, "S");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6);
    doc.setTextColor(...C.muted);
    doc.text("CLIENT", ML + 5, y + 6);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...C.heading);
    clippedText(doc, order.clientName, ML + 5, y + 12, halfW - 12);
    if (order.clientAddress) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(...C.body);
        clippedText(doc, order.clientAddress, ML + 5, y + 17, halfW - 12);
    }

    // Right box — PO details
    const rbX = ML + halfW + 6;
    doc.setFillColor(...C.rowAlt);
    doc.roundedRect(rbX, y, halfW, metaBoxH, 2, 2, "F");
    doc.setDrawColor(...C.border);
    doc.roundedRect(rbX, y, halfW, metaBoxH, 2, 2, "S");

    const poMeta: [string, string][] = [
        ["PO Number", order.orderId.slice(0, 8).toUpperCase()],
        ["Date", fmtDate(order.orderDate)],
        ["Delivery", order.deliveryDate ? fmtDate(order.deliveryDate) : "—"],
    ];
    poMeta.forEach(([lbl, val], i) => {
        const ry = y + 7 + i * 7;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(...C.muted);
        doc.text(lbl.toUpperCase(), rbX + 5, ry);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(...C.heading);
        doc.text(val, rbX + halfW - 5, ry, { align: "right" });
    });

    y += metaBoxH + 6;

    // Items table — fixed width columns
    const poCols: ColDef[] = [
        { label: "ITEM DESCRIPTION", x: ML, w: 100, align: "left", pad: 4 },
        { label: "QTY", x: ML + 100, w: 24, align: "right", pad: 2 },
        { label: "RATE (\u20B9)", x: ML + 124, w: 28, align: "right", pad: 2 },
        { label: "TOTAL (\u20B9)", x: ML + 152, w: 28, align: "right", pad: 2 },
    ];

    y = drawTableHeader(doc, y, poCols);

    // Item row
    const poRowH = 9;
    doc.setFillColor(...C.rowAlt);
    doc.rect(ML, y, CW, poRowH, "F");
    hline(doc, ML, y + poRowH, ML + CW, C.border, 0.15);

    const poTextY = y + 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...C.heading);
    clippedText(doc, order.productName, poCols[0].x + poCols[0].pad, poTextY, poCols[0].w - poCols[0].pad * 2);

    doc.text(order.quantity.toString(), poCols[1].x + poCols[1].w - poCols[1].pad, poTextY, { align: "right" });
    doc.text(fmtNum(order.rate), poCols[2].x + poCols[2].w - poCols[2].pad, poTextY, { align: "right" });
    doc.setFont("helvetica", "bold");
    doc.text(fmtNum(order.totalAmount), poCols[3].x + poCols[3].w - poCols[3].pad, poTextY, { align: "right" });

    y += poRowH;
    hline(doc, ML, y, ML + CW, C.primary, 0.5);
    y += 5;

    // Deductions
    if (order.deductions && order.deductions.length > 0) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(...C.body);
        for (const ded of order.deductions) {
            doc.text(`Less: ${ded.description}`, ML + CW - 78, y);
            doc.text(`- ${fmt(ded.amount)}`, ML + CW - 3, y, { align: "right" });
            y += 5;
        }
    }

    // Net total
    hline(doc, ML + CW - 80, y, ML + CW, C.border, 0.3);
    y += 3;
    const netH = 10;
    doc.setFillColor(...C.totalBg);
    doc.roundedRect(ML + CW - 82, y, 84, netH, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...C.totalText);
    doc.text("NET PAYABLE", ML + CW - 78, y + 7);
    doc.text(fmt(order.totalAmount), ML + CW - 3, y + 7, { align: "right" });

    // Signature
    y += netH + 20;
    const sigX = ML + CW - 55;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...C.heading);
    doc.text(`For ${company?.companyName || "Company"}`, sigX, y);
    hline(doc, sigX, y + 12, ML + CW, C.subtle, 0.3);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...C.muted);
    doc.text("Authorized Signatory", sigX + 10, y + 16);

    // Footer
    doc.setFillColor(...C.primary);
    doc.rect(0, PAGE_H - 5, PAGE_W, 5, "F");
    hline(doc, ML, PAGE_H - 10, ML + CW, C.border, 0.2);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.setTextColor(...C.subtle);
    doc.text("This is a computer-generated document.", ML + CW / 2, PAGE_H - 7, { align: "center" });

    doc.save(`PO_${order.orderId.slice(0, 8).toUpperCase()}.pdf`);
}


// ═══════════════════════════════════════════════════════════════════
//  Generic Data Export to PDF (replaces CSV exports)
// ═══════════════════════════════════════════════════════════════════

export interface DataExportOptions {
    title: string;
    subtitle?: string;
    headers: string[];
    rows: string[][];
    filename: string;
    company?: CompanyInfo | null;
}

export function generateDataExportPDF(options: DataExportOptions): void {
    const { title, subtitle, headers, rows, filename, company } = options;
    const landscape = headers.length > 6;
    const doc = new jsPDF({
        unit: "mm",
        format: "a4",
        orientation: landscape ? "landscape" : "portrait",
    });
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();
    const ml = 12;
    const mr = 12;
    const cw = pw - ml - mr;
    let y = 12;

    // Calculate fixed column widths proportionally
    const colCount = headers.length;
    const colW = cw / colCount;

    // ─── Render header (reusable for page breaks) ────────────
    const renderPageHeader = (isFirst: boolean) => {
        // Top bar
        doc.setFillColor(...C.primary);
        doc.rect(0, 0, pw, 3, "F");

        if (isFirst) {
            y = 12;
            doc.setFont("helvetica", "bold");
            doc.setFontSize(14);
            doc.setTextColor(...C.heading);
            doc.text(title, ml, y + 8);

            if (subtitle) {
                doc.setFont("helvetica", "normal");
                doc.setFontSize(8);
                doc.setTextColor(...C.muted);
                doc.text(subtitle, ml, y + 13);
            }

            if (company?.companyName) {
                doc.setFont("helvetica", "bold");
                doc.setFontSize(9);
                doc.setTextColor(...C.accent);
                doc.text(company.companyName, pw - mr, y + 8, { align: "right" });
            }

            doc.setFont("helvetica", "normal");
            doc.setFontSize(7);
            doc.setTextColor(...C.subtle);
            doc.text(
                `Generated: ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}  •  ${rows.length} records`,
                pw - mr, y + 13, { align: "right" },
            );

            y += 18;
            hline(doc, ml, y, pw - mr, C.border, 0.3);
            y += 3;
        } else {
            y = 10;
        }

        // Table header
        doc.setFillColor(...C.primary);
        doc.roundedRect(ml, y, cw, 7, 1, 1, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(...C.totalText);
        headers.forEach((h, i) => {
            doc.text(h.toUpperCase(), ml + i * colW + 3, y + 5);
        });
        y += 7;
    };

    renderPageHeader(true);

    // Table rows
    const rowH = 6.5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);

    for (let idx = 0; idx < rows.length; idx++) {
        if (y + rowH > ph - 15) {
            doc.addPage();
            renderPageHeader(false);
        }

        if (idx % 2 === 0) {
            doc.setFillColor(...C.rowAlt);
            doc.rect(ml, y, cw, rowH, "F");
        }

        doc.setTextColor(...C.body);
        const row = rows[idx];
        row.forEach((cell, i) => {
            const cellText = (cell ?? "—").toString();
            const maxChars = Math.floor(colW / 1.8);
            const truncated = cellText.length > maxChars
                ? cellText.substring(0, maxChars - 1) + "…"
                : cellText;
            doc.text(truncated, ml + i * colW + 3, y + 4.5);
        });
        y += rowH;
    }

    // Footer on all pages
    const totalPages = doc.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        doc.setFillColor(...C.primary);
        doc.rect(0, ph - 6, pw, 6, "F");
        doc.setFont("helvetica", "normal");
        doc.setFontSize(5.5);
        doc.setTextColor(...C.totalText);
        doc.text(
            `IND Manager  •  ${title}  •  ${new Date().toLocaleDateString("en-IN")}  •  Page ${p}/${totalPages}`,
            pw / 2, ph - 2.5,
            { align: "center" },
        );
    }

    doc.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
}
