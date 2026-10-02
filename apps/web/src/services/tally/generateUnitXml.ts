/**
 * Tally Unit XML Generator
 * ─────────────────────────────────────────────────────────
 * Generates XML to auto-create simple unit masters in Tally Prime
 * (e.g. NOS, KGS, PCS, BOX, MTR, SET).
 * Action is "Create or Alter" for idempotency.
 *
 * Implemented per research, unverified against live Tally.
 */

import { escapeXml } from "./tallyXmlHelpers";

/**
 * Builds the inner <UNIT> XML message.
 */
export function buildUnitMessageXml(
  unitSymbol: string,
  decimalPlaces: number = 0,
): string {
  const symbol = escapeXml(unitSymbol.trim().toUpperCase());
  return `          <UNIT NAME="${symbol}" ACTION="Create or Alter">
            <NAME>${symbol}</NAME>
            <ISSIMPLEUNIT>Yes</ISSIMPLEUNIT>
            <DECIMALPLACES>${decimalPlaces}</DECIMALPLACES>
          </UNIT>`;
}

/**
 * Generates a full Tally envelope to create/alter a simple unit master.
 */
export function generateUnitXml(
  unitSymbol: string,
  companyName: string,
  decimalPlaces: number = 0,
): string {
  const company = escapeXml(companyName);
  const unitMessage = buildUnitMessageXml(unitSymbol, decimalPlaces);

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
${unitMessage}
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;
}
