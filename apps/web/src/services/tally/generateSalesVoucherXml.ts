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
 * Duplicate prevention:
 * - UDF tag IND_MANAGER_{invoiceId}
 */

import {
    escapeXml,
    formatTallyDate,
    formatAmount,
    mapUnitToTally,
} from "./tallyXmlHelpers";
import type { TallyVoucherPayload } from "./tallyXmlTypes";
import type { Bill } from "@/modules/billing/domain/types";

/**
 * Converts a Bill domain object to a TallyVoucherPayload.
 */
export function billToVoucherPayload(
    bill: Bill,
    companyName: string,
): TallyVoucherPayload {
    return {
        invoiceId: bill.id,
        invoiceNumber: bill.billNumber,
        invoiceDate: bill.billDate,
        dueDate: bill.dueDate,
        partyLedgerName: bill.clientName,
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
    const partyName = escapeXml(payload.partyLedgerName);
    const invoiceNo = escapeXml(payload.invoiceNumber);
    const narration = escapeXml(payload.narration);
    const tallyDate = formatTallyDate(payload.invoiceDate);

    // Build GST ledger entries
    const gstEntriesXml = buildGSTEntriesXml(payload);

    // Build inventory entries
    const inventoryEntriesXml = buildInventoryEntriesXml(payload);

    return `<ENVELOPE>
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
          <VOUCHER VCHTYPE="Sales" ACTION="Create" OBJVIEW="Invoice Voucher View">
            <DATE>${tallyDate}</DATE>
            <VOUCHERNUMBER>${invoiceNo}</VOUCHERNUMBER>
            <REFERENCE>${invoiceNo}</REFERENCE>
            <PARTYLEDGERNAME>${partyName}</PARTYLEDGERNAME>
            <NARRATION>${narration}</NARRATION>
            <ISINVOICE>Yes</ISINVOICE>
            <PERSISTEDVIEW>Invoice Voucher View</PERSISTEDVIEW>

            <!-- Duplicate prevention UDF tag -->
            <UDF:IND_MANAGER_REF.LIST>
              <UDF:IND_MANAGER_REF>IND_MANAGER_${escapeXml(payload.invoiceId)}</UDF:IND_MANAGER_REF>
            </UDF:IND_MANAGER_REF.LIST>

            <!-- Party Ledger Entry (Dr) — Receivable -->
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>${partyName}</LEDGERNAME>
              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
              <AMOUNT>-${formatAmount(payload.totalAmount)}</AMOUNT>
              <BILLALLOCATIONS.LIST>
                <NAME>${invoiceNo}</NAME>
                <BILLTYPE>New Ref</BILLTYPE>
                <AMOUNT>-${formatAmount(payload.totalAmount)}</AMOUNT>
              </BILLALLOCATIONS.LIST>
            </ALLLEDGERENTRIES.LIST>

            <!-- Sales Ledger Entry (Cr) — Revenue -->
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>Sales Account</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <AMOUNT>${formatAmount(payload.subtotal)}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>

            <!-- GST Ledger Entries (Cr) -->
${gstEntriesXml}
            <!-- Inventory Entries -->
${inventoryEntriesXml}
          </VOUCHER>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;
}

/**
 * Builds GST ledger entry XML.
 * IGST → single entry. CGST+SGST → two entries.
 * Uses EXACT amounts from invoice — no recalculation.
 */
function buildGSTEntriesXml(payload: TallyVoucherPayload): string {
    const entries: string[] = [];

    if (payload.isInterstate) {
        // IGST only
        if (payload.igstAmount > 0) {
            entries.push(`            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>IGST</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <AMOUNT>${formatAmount(payload.igstAmount)}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>`);
        }
    } else {
        // CGST + SGST
        if (payload.cgstAmount > 0) {
            entries.push(`            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>CGST</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <AMOUNT>${formatAmount(payload.cgstAmount)}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>`);
        }
        if (payload.sgstAmount > 0) {
            entries.push(`            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>SGST</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <AMOUNT>${formatAmount(payload.sgstAmount)}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>`);
        }
    }

    return entries.join("\n");
}

/**
 * Builds inventory entry XML for each line item.
 */
function buildInventoryEntriesXml(payload: TallyVoucherPayload): string {
    return payload.lineItems
        .map((item) => {
            const name = escapeXml(item.description);
            const hsn = escapeXml(item.hsnCode || "");

            return `            <INVENTORYENTRIES.LIST>
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
            </INVENTORYENTRIES.LIST>`;
        })
        .join("\n");
}
