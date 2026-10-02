// Implemented per research, unverified against live Tally
/**
 * Tally Sales Voucher XML Generator
 * ─────────────────────────────────────────────────────────
 * Generates the complete Tally XML envelope for importing
 * a Sales Invoice (voucher) into Tally Prime.
 *
 * GST Rules:
 * - igstAmount > 0 → IGST only (one ledger entry)
 * - Otherwise      → CGST + SGST (two ledger entries)
 * - Uses exact amounts from invoice — NO recalculation
 *
 * Amount sign convention (Tally standard):
 * - Party Dr (receivable) = NEGATIVE amount
 * - All Cr entries (sales, GST) = POSITIVE amount
 *
 * Voucher View & Entry Mode:
 * - OBJVIEW="Invoice Voucher View"
 * - PERSISTEDVIEW="Invoice Voucher View"
 * - VCHENTRYMODE="Accounting Invoice"
 * - ISINVOICE="Yes"
 *
 * Idempotency:
 * - REMOTEID="ind-manager-<invoiceId>"
 * - ACTION="Create or Alter"
 * - UDF tag IND_MANAGER_<invoiceId>
 */

import {
    escapeXml,
    formatTallyDate,
    formatAmount,
    mapUnitToTally,
    getTallyStateName,
} from "./tallyXmlHelpers";
import type { TallyVoucherPayload } from "./tallyXmlTypes";
import type { Bill } from "@/modules/billing/domain/types";

/**
 * Converts a Bill domain object to a TallyVoucherPayload.
 */
export function billToVoucherPayload(
    bill: Bill,
    companyName: string,
    partyState?: string,
    companyState?: string,
): TallyVoucherPayload {
    return {
        invoiceId: bill.id,
        invoiceNumber: bill.billNumber,
        invoiceDate: bill.billDate,
        dueDate: bill.dueDate,
        partyLedgerName: bill.clientName,
        partyName: bill.clientName,
        partyState,
        companyState,
        gstRegistrationType: "Regular",
        totalAmount: bill.totalAmount,
        subtotal: bill.subtotal,
        cgstAmount: bill.cgstAmount,
        sgstAmount: bill.sgstAmount,
        igstAmount: bill.igstAmount,
        isInterstate: bill.igstAmount > 0,
        narration: bill.notes || "Invoice from IND Manager",
        lineItems: (bill.items || []).map((item) => ({
            description: item.description,
            hsnCode: item.hsnCode,
            quantity: item.quantity,
            unit: item.unit,
            tallyUnit: mapUnitToTally(item.unit),
            rate: item.rate,
            amount: item.amount,
            gstRate: item.gstRate,
        })),
        companyName,
    };
}

/**
 * Generates the complete Tally XML envelope for a Sales Invoice.
 */
export function generateSalesVoucherXml(payload: TallyVoucherPayload): string {
    const company = escapeXml(payload.companyName);
    const partyLedger = escapeXml(payload.partyLedgerName);
    const partyName = escapeXml(payload.partyName || payload.partyLedgerName);
    const invoiceNo = escapeXml(payload.invoiceNumber);
    const narration = escapeXml(payload.narration);
    const tallyDate = formatTallyDate(payload.invoiceDate);
    const remoteId = `ind-manager-${escapeXml(payload.invoiceId)}`;

    // Resolve state for STATENAME and PLACEOFSUPPLY
    const rawState = payload.partyState || payload.companyState || "Maharashtra";
    const stateName = escapeXml(getTallyStateName(rawState));
    const gstRegType = escapeXml(payload.gstRegistrationType || "Regular");

    // Calculate round-off difference
    const taxTotal = payload.isInterstate
        ? payload.igstAmount
        : (payload.cgstAmount + payload.sgstAmount);
    const computedTotal = payload.subtotal + taxTotal;
    const diff = Math.round((payload.totalAmount - computedTotal) * 100) / 100;

    if (Math.abs(diff) > 1.00) {
        throw new Error(
            `Voucher total mismatch (${payload.totalAmount}) vs subtotal+taxes (${computedTotal}) exceeds allowable round-off limit of 1.00`,
        );
    }

    // Build ledger entries (Party + Tax + optional standalone Sales + optional Round Off)
    const ledgerEntriesXml = buildLedgerEntriesXml(payload, diff);

    // Build inventory entries (with nested ACCOUNTINGALLOCATIONS.LIST to Sales Account)
    const inventoryEntriesXml = buildInventoryEntriesXml(payload);

    return `<?xml version="1.0" encoding="utf-8"?>
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Vouchers</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>${company}</SVCURRENTCOMPANY>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <VOUCHER VCHTYPE="Sales" ACTION="Create or Alter" OBJVIEW="Invoice Voucher View" REMOTEID="${remoteId}">
            <DATE>${tallyDate}</DATE>
            <VOUCHERNUMBER>${invoiceNo}</VOUCHERNUMBER>
            <REFERENCE>${invoiceNo}</REFERENCE>
            <VOUCHERTYPENAME>Sales</VOUCHERTYPENAME>
            <PARTYLEDGERNAME>${partyLedger}</PARTYLEDGERNAME>
            <PARTYNAME>${partyName}</PARTYNAME>
            <STATENAME>${stateName}</STATENAME>
            <COUNTRYOFRESIDENCE>India</COUNTRYOFRESIDENCE>
            <PLACEOFSUPPLY>${stateName}</PLACEOFSUPPLY>
            <GSTREGISTRATIONTYPE>${gstRegType}</GSTREGISTRATIONTYPE>
            <CMPGSTREGISTRATIONTYPE>Regular</CMPGSTREGISTRATIONTYPE>
            <NARRATION>${narration}</NARRATION>
            <ISINVOICE>Yes</ISINVOICE>
            <PERSISTEDVIEW>Invoice Voucher View</PERSISTEDVIEW>
            <VCHENTRYMODE>Accounting Invoice</VCHENTRYMODE>

            <!-- Duplicate prevention UDF tag -->
            <UDF:IND_MANAGER_REF.LIST>
              <UDF:IND_MANAGER_REF>IND_MANAGER_${escapeXml(payload.invoiceId)}</UDF:IND_MANAGER_REF>
            </UDF:IND_MANAGER_REF.LIST>
${ledgerEntriesXml}
${inventoryEntriesXml}
          </VOUCHER>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;
}

/**
 * Builds all LEDGERENTRIES.LIST entries for the voucher:
 * 1. Party ledger (Dr) with ISPARTYLEDGER=Yes
 * 2. Standalone Sales Account (if accounting-only with no line items) with ISPARTYLEDGER=No
 * 3. Tax ledgers (CGST/SGST or IGST) (Cr) with ISPARTYLEDGER=No
 * 4. Round Off ledger (if 0.01 <= |diff| <= 1.00) with ISPARTYLEDGER=No
 */
function buildLedgerEntriesXml(payload: TallyVoucherPayload, diff: number): string {
    const partyLedger = escapeXml(payload.partyLedgerName);
    const invoiceNo = escapeXml(payload.invoiceNumber);
    const entries: string[] = [];

    // 1. Party Ledger (Dr)
    entries.push(`            <LEDGERENTRIES.LIST>
              <LEDGERNAME>${partyLedger}</LEDGERNAME>
              <ISPARTYLEDGER>Yes</ISPARTYLEDGER>
              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
              <AMOUNT>-${formatAmount(payload.totalAmount)}</AMOUNT>
              <BILLALLOCATIONS.LIST>
                <NAME>${invoiceNo}</NAME>
                <BILLTYPE>New Ref</BILLTYPE>
                <AMOUNT>-${formatAmount(payload.totalAmount)}</AMOUNT>
              </BILLALLOCATIONS.LIST>
            </LEDGERENTRIES.LIST>`);

    // 2. If NO inventory items, include Sales Account directly in LEDGERENTRIES.LIST
    if (!payload.lineItems || payload.lineItems.length === 0) {
        entries.push(`            <LEDGERENTRIES.LIST>
              <LEDGERNAME>Sales Account</LEDGERNAME>
              <ISPARTYLEDGER>No</ISPARTYLEDGER>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <AMOUNT>${formatAmount(payload.subtotal)}</AMOUNT>
            </LEDGERENTRIES.LIST>`);
    }

    // 3. Tax Ledgers (Cr)
    if (payload.isInterstate) {
        if (payload.igstAmount > 0) {
            entries.push(`            <LEDGERENTRIES.LIST>
              <LEDGERNAME>IGST</LEDGERNAME>
              <ISPARTYLEDGER>No</ISPARTYLEDGER>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <AMOUNT>${formatAmount(payload.igstAmount)}</AMOUNT>
            </LEDGERENTRIES.LIST>`);
        }
    } else {
        if (payload.cgstAmount > 0) {
            entries.push(`            <LEDGERENTRIES.LIST>
              <LEDGERNAME>CGST</LEDGERNAME>
              <ISPARTYLEDGER>No</ISPARTYLEDGER>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <AMOUNT>${formatAmount(payload.cgstAmount)}</AMOUNT>
            </LEDGERENTRIES.LIST>`);
        }
        if (payload.sgstAmount > 0) {
            entries.push(`            <LEDGERENTRIES.LIST>
              <LEDGERNAME>SGST</LEDGERNAME>
              <ISPARTYLEDGER>No</ISPARTYLEDGER>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <AMOUNT>${formatAmount(payload.sgstAmount)}</AMOUNT>
            </LEDGERENTRIES.LIST>`);
        }
    }

    // 4. Round Off (if 0.01 <= |diff| <= 1.00)
    if (Math.abs(diff) >= 0.01 && Math.abs(diff) <= 1.00) {
        const isDeemedPositive = diff < 0 ? "Yes" : "No";
        const signedAmount = diff < 0 ? `-${formatAmount(Math.abs(diff))}` : formatAmount(diff);
        entries.push(`            <LEDGERENTRIES.LIST>
              <LEDGERNAME>Round Off</LEDGERNAME>
              <ISPARTYLEDGER>No</ISPARTYLEDGER>
              <ISDEEMEDPOSITIVE>${isDeemedPositive}</ISDEEMEDPOSITIVE>
              <AMOUNT>${signedAmount}</AMOUNT>
            </LEDGERENTRIES.LIST>`);
    }

    return entries.join("\n");
}

/**
 * Builds inventory entry XML for each line item with nested ACCOUNTINGALLOCATIONS.LIST.
 */
function buildInventoryEntriesXml(payload: TallyVoucherPayload): string {
    if (!payload.lineItems || payload.lineItems.length === 0) {
        return "";
    }

    return payload.lineItems
        .map((item) => {
            const name = escapeXml(item.description);
            const hsn = escapeXml(item.hsnCode || "");

            return `            <ALLINVENTORYENTRIES.LIST>
              <STOCKITEMNAME>${name}</STOCKITEMNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <RATE>${formatAmount(item.rate)}/${item.tallyUnit}</RATE>
              <AMOUNT>${formatAmount(item.amount)}</AMOUNT>
              <ACTUALQTY>${item.quantity} ${item.tallyUnit}</ACTUALQTY>
              <BILLEDQTY>${item.quantity} ${item.tallyUnit}</BILLEDQTY>${hsn ? `
              <HSNCODE>${hsn}</HSNCODE>` : ""}
              <BATCHALLOCATIONS.LIST>
                <GODOWNNAME>Main Location</GODOWNNAME>
                <BATCHNAME>Primary Batch</BATCHNAME>
                <AMOUNT>${formatAmount(item.amount)}</AMOUNT>
                <ACTUALQTY>${item.quantity} ${item.tallyUnit}</ACTUALQTY>
                <BILLEDQTY>${item.quantity} ${item.tallyUnit}</BILLEDQTY>
              </BATCHALLOCATIONS.LIST>
              <ACCOUNTINGALLOCATIONS.LIST>
                <LEDGERNAME>Sales Account</LEDGERNAME>
                <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
                <AMOUNT>${formatAmount(item.amount)}</AMOUNT>
              </ACCOUNTINGALLOCATIONS.LIST>
            </ALLINVENTORYENTRIES.LIST>`;
        })
        .join("\n");
}
