/**
 * Tally Stock Item XML Generator
 * ─────────────────────────────────────────────────────────
 * Generates XML to auto-create stock items in Tally Prime
 * from invoice line items. Ensures the "Primary" Stock Group
 * and the item's unit master exist via idempotent "Create or Alter"
 * blocks before the stock item is declared.
 *
 * Implemented per research, unverified against live Tally.
 */

import { escapeXml, mapUnitToTally } from "./tallyXmlHelpers";
import { buildUnitMessageXml } from "./generateUnitXml";
import type { TallyLineItem } from "./tallyXmlTypes";

/**
 * Builds the idempotent Primary stock group XML message.
 */
function buildPrimaryStockGroupXml(): string {
  return `          <STOCKGROUP NAME="Primary" ACTION="Create or Alter">
            <NAME>Primary</NAME>
            <PARENT/>
          </STOCKGROUP>`;
}

/**
 * Generates XML to create or alter a stock item in Tally.
 * Ensures "Primary" stock group and unit master exist.
 */
export function generateStockItemXml(
  item: TallyLineItem,
  companyName: string,
): string {
  const name = escapeXml(item.description);
  const company = escapeXml(companyName);
  const hsn = escapeXml(item.hsnCode || "");
  const unit = mapUnitToTally(item.unit);

  const groupXml = buildPrimaryStockGroupXml();
  const unitXml = buildUnitMessageXml(unit);

  return `<?xml version="1.0" encoding="utf-8"?>
<ENVELOPE>
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
${groupXml}
${unitXml}
          <STOCKITEM NAME="${name}" ACTION="Create or Alter">
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
 * Pre-creates "Primary" stock group and all unique units referenced.
 */
export function generateBatchStockItemXml(
  items: TallyLineItem[],
  companyName: string,
): string {
  const company = escapeXml(companyName);

  // Deduplicate by description (same product = same stock item)
  const seenItems = new Set<string>();
  const uniqueItems = items.filter((item) => {
    const key = item.description.toLowerCase().trim();
    if (seenItems.has(key)) return false;
    seenItems.add(key);
    return true;
  });

  // Extract all unique units referenced
  const uniqueUnits = Array.from(
    new Set(uniqueItems.map((item) => mapUnitToTally(item.unit))),
  );

  const groupXml = buildPrimaryStockGroupXml();
  const unitsXml = uniqueUnits.map((u) => buildUnitMessageXml(u)).join("\n");

  const stockItemsXml = uniqueItems
    .map((item) => {
      const name = escapeXml(item.description);
      const hsn = escapeXml(item.hsnCode || "");
      const unit = mapUnitToTally(item.unit);

      return `          <STOCKITEM NAME="${name}" ACTION="Create or Alter">
            <NAME>${name}</NAME>
            <PARENT>Primary</PARENT>${hsn ? `
            <HSNCODE>${hsn}</HSNCODE>` : ""}
            <GSTAPPLICABLE>Applicable</GSTAPPLICABLE>
            <GSTRATE>${item.gstRate}</GSTRATE>
            <BASEUNITS>${unit}</BASEUNITS>
          </STOCKITEM>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="utf-8"?>
<ENVELOPE>
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
${groupXml}
${unitsXml}
${stockItemsXml}
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;
}
