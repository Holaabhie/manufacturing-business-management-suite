/**
 * Tally Ledger XML Generator
 * ─────────────────────────────────────────────────────────
 * Generates XML to auto-create ledgers in Tally Prime:
 * - Party ledger (Sundry Debtors) for clients
 * - Sales Account ledger
 * - GST duty ledgers (CGST/SGST/IGST)
 */

import { escapeXml, derivePanFromGstin, getTallyStateName } from "./tallyXmlHelpers";

interface PartyInfo {
  clientName: string;
  clientGSTIN?: string;
  clientAddress?: string;
  stateCode?: string;
}

/**
 * Generates XML to create a party ledger (Sundry Debtors) in Tally.
 * Uses bill-level client data since the Client model may not have GSTIN.
 */
export function generatePartyLedgerXml(party: PartyInfo, companyName: string): string {
  const name = escapeXml(party.clientName);
  const gstin = escapeXml(party.clientGSTIN || "");
  const pan = escapeXml(derivePanFromGstin(party.clientGSTIN || ""));
  const address = escapeXml(party.clientAddress || "");
  const stateName = party.stateCode
    ? escapeXml(getTallyStateName(party.stateCode))
    : "";
  const regType = party.clientGSTIN ? "Regular" : "Unregistered";
  const company = escapeXml(companyName);

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
          <LEDGER NAME="${name}" ACTION="Create or Alter">
            <NAME>${name}</NAME>
            <PARENT>Sundry Debtors</PARENT>
            <ISBILLWISEON>Yes</ISBILLWISEON>
            <AFFECTSSTOCK>No</AFFECTSSTOCK>${gstin ? `
            <PARTYGSTIN>${gstin}</PARTYGSTIN>
            <GSTIN>${gstin}</GSTIN>` : ""}${pan ? `
            <INCOMETAXNUMBER>${pan}</INCOMETAXNUMBER>` : ""}${address ? `
            <ADDRESS.LIST>
              <ADDRESS>${address}</ADDRESS>
            </ADDRESS.LIST>` : ""}${stateName ? `
            <LEDSTATENAME>${stateName}</LEDSTATENAME>` : ""}
            <GSTREGISTRATIONTYPE>${regType}</GSTREGISTRATIONTYPE>
          </LEDGER>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;
}

/**
 * Generates XML to create the "Sales Account" ledger in Tally.
 */
export function generateSalesLedgerXml(companyName: string): string {
  const company = escapeXml(companyName);

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
          <LEDGER NAME="Sales Account" ACTION="Create or Alter">
            <NAME>Sales Account</NAME>
            <PARENT>Sales Accounts</PARENT>
            <AFFECTSSTOCK>No</AFFECTSSTOCK>
          </LEDGER>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;
}

/**
 * Generates XML to create a GST duty ledger in Tally.
 * @param type — "CGST" | "SGST" | "IGST"
 */
export function generateGSTLedgerXml(
  type: "CGST" | "SGST" | "IGST",
  companyName: string,
): string {
  const company = escapeXml(companyName);

  const config = {
    CGST: { name: "CGST", taxType: "Central Tax" },
    SGST: { name: "SGST", taxType: "State Tax" },
    IGST: { name: "IGST", taxType: "Integrated Tax" },
  }[type];

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
          <LEDGER NAME="${config.name}" ACTION="Create or Alter">
            <NAME>${config.name}</NAME>
            <PARENT>Duties &amp; Taxes</PARENT>
            <TAXTYPE>${config.taxType}</TAXTYPE>
            <AFFECTSSTOCK>No</AFFECTSSTOCK>
            <ISDUTYLEDGER>Yes</ISDUTYLEDGER>
          </LEDGER>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;
}
