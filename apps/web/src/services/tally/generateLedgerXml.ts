/**
 * Tally Ledger XML Generator
 * ─────────────────────────────────────────────────────────
 * Generates XML to auto-create ledgers in Tally Prime:
 * - Party ledger (Sundry Debtors) for clients
 * - Sales Account ledger
 * - GST duty ledgers (CGST/SGST/IGST) with proper GSTDutyHead classification
 * - Round Off ledger (under Indirect Expenses)
 *
 * Implemented per research, unverified against live Tally.
 */

import { escapeXml, derivePanFromGstin, getTallyStateName } from "./tallyXmlHelpers";

export interface PartyInfo {
  clientName: string;
  clientGSTIN?: string;
  clientAddress?: string;
  stateCode?: string;
  alias?: string;
}

/**
 * Generates XML to create a party ledger (Sundry Debtors) in Tally.
 * Uses bill-level client data since the Client model may not have GSTIN.
 */
export function generatePartyLedgerXml(party: PartyInfo, companyName: string): string {
  const name = escapeXml(party.clientName);
  const alias = escapeXml(party.alias || "");
  const gstin = escapeXml(party.clientGSTIN || "");
  const pan = escapeXml(derivePanFromGstin(party.clientGSTIN || ""));
  const address = escapeXml(party.clientAddress || "");
  const stateName = party.stateCode
    ? escapeXml(getTallyStateName(party.stateCode))
    : "";
  const regType = party.clientGSTIN ? "Regular" : "Unregistered";
  const company = escapeXml(companyName);

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
          <LEDGER NAME="${name}" ACTION="Create or Alter">
            <NAME>${name}</NAME>${alias ? `
            <ALIAS>${alias}</ALIAS>` : ""}
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
 * Adapts a Client entity to Tally Party Ledger XML.
 * Sets <ALIAS> to client._id / client.id for stable cross-rename tracking.
 */
export function buildClientLedgerXml(
  client: {
    id?: string;
    _id?: unknown;
    name: string;
    gstin?: string;
    state?: string;
    address?: string;
  },
  companyName: string,
): string {
  const alias = client.id || (client._id ? String(client._id) : undefined);

  // If state is not provided, try deriving state code from the first 2 characters of GSTIN
  let stateCode = client.state?.trim();
  if (!stateCode && client.gstin && client.gstin.trim().length >= 2) {
    stateCode = client.gstin.trim().substring(0, 2);
  }

  return generatePartyLedgerXml(
    {
      clientName: client.name,
      clientGSTIN: client.gstin?.trim() || undefined,
      clientAddress: client.address?.trim() || undefined,
      stateCode: stateCode || undefined,
      alias,
    },
    companyName,
  );
}

/**
 * Generates XML to create the "Sales Account" ledger in Tally.
 */
export function generateSalesLedgerXml(companyName: string): string {
  const company = escapeXml(companyName);

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
 * Adds TAXTYPE="GST", GSTDUTYHEAD, and GSTAPPLICABLE per Tally GST specifications.
 * @param type — "CGST" | "SGST" | "IGST"
 */
export function generateGSTLedgerXml(
  type: "CGST" | "SGST" | "IGST",
  companyName: string,
): string {
  const company = escapeXml(companyName);

  const config = {
    CGST: { name: "CGST", dutyHead: "Central Tax" },
    SGST: { name: "SGST", dutyHead: "State Tax" },
    IGST: { name: "IGST", dutyHead: "Integrated Tax" },
  }[type];

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
          <LEDGER NAME="${config.name}" ACTION="Create or Alter">
            <NAME>${config.name}</NAME>
            <PARENT>Duties &amp; Taxes</PARENT>
            <TAXTYPE>GST</TAXTYPE>
            <GSTDUTYHEAD>${config.dutyHead}</GSTDUTYHEAD>
            <GSTAPPLICABLE>Applicable</GSTAPPLICABLE>
            <AFFECTSSTOCK>No</AFFECTSSTOCK>
            <ISDUTYLEDGER>Yes</ISDUTYLEDGER>
          </LEDGER>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;
}

/**
 * Generates XML to create the "Round Off" ledger in Tally under Indirect Expenses.
 */
export function generateRoundOffLedgerXml(companyName: string): string {
  const company = escapeXml(companyName);

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
          <LEDGER NAME="Round Off" ACTION="Create or Alter">
            <NAME>Round Off</NAME>
            <PARENT>Indirect Expenses</PARENT>
            <AFFECTSSTOCK>No</AFFECTSSTOCK>
          </LEDGER>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;
}
