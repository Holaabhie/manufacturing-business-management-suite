/**
 * Tally Stock Item XML Generator
 * ─────────────────────────────────────────────────────────
 * Generates XML to auto-create stock items in Tally Prime
 * from invoice line items. Each item gets HSN code,
 * GST rate, and mapped unit.
 */

import { escapeXml, mapUnitToTally } from "./tallyXmlHelpers";
import type { TallyLineItem } from "./tallyXmlTypes";

/**
 * Generates XML to create a stock item in Tally.
 * Called once per unique line item in an invoice.
 */
export function generateStockItemXml(
    item: TallyLineItem,
    companyName: string,
): string {
    const name = escapeXml(item.description);
    const company = escapeXml(companyName);
    const hsn = escapeXml(item.hsnCode || "");
    const unit = mapUnitToTally(item.unit);

    return `<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>All Masters</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>${company}</SVCURRENTCOMPANY>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <STOCKITEM NAME="${name}" ACTION="Create">
            <NAME>${name}</NAME>
            <PARENT>Primary</PARENT>${hsn ? `
            <HSNCODE>${hsn}</HSNCODE>` : ""}
            <GSTAPPLICABLE>Applicable</GSTAPPLICABLE>
            <GSTRATE>${item.gstRate}</GSTRATE>
            <BASEUNITS>${unit}</BASEUNITS>
          </STOCKITEM>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;
}

/**
 * Generates XML for multiple stock items in a single envelope.
 * More efficient than individual calls when importing a full invoice.
 */
export function generateBatchStockItemXml(
    items: TallyLineItem[],
    companyName: string,
): string {
    const company = escapeXml(companyName);

    // Deduplicate by description (same product = same stock item)
    const seen = new Set<string>();
    const uniqueItems = items.filter((item) => {
        const key = item.description.toLowerCase().trim();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });

    const stockItemsXml = uniqueItems
        .map((item) => {
            const name = escapeXml(item.description);
            const hsn = escapeXml(item.hsnCode || "");
            const unit = mapUnitToTally(item.unit);

            return `          <STOCKITEM NAME="${name}" ACTION="Create">
            <NAME>${name}</NAME>
            <PARENT>Primary</PARENT>${hsn ? `
            <HSNCODE>${hsn}</HSNCODE>` : ""}
            <GSTAPPLICABLE>Applicable</GSTAPPLICABLE>
            <GSTRATE>${item.gstRate}</GSTRATE>
            <BASEUNITS>${unit}</BASEUNITS>
          </STOCKITEM>`;
        })
        .join("\n");

    return `<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>All Masters</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>${company}</SVCURRENTCOMPANY>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
${stockItemsXml}
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;
}
