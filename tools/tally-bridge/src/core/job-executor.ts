/**
 * Job Executor & Timeout Wrapper
 * ─────────────────────────────────────────────────────────
 * Real TallyJobExecutor:
 * - Builds or retrieves Tally XML for the job:
 *   (master.ledger / master.stock_item / master.unit / voucher.sales)
 * - POSTs it to the configured Tally host:port with a 15s timeout.
 * - Parses response per B5 specifications (bare <RESPONSE> with NO <ENVELOPE>).
 * - Maps outcome to:
 *   - success: CREATED>0 or ALTERED>0
 *   - permanent_error: Tally rejection (ERRORS, LINEERROR, or EXCEPTIONS)
 *   - retryable_error: Network failure, connection refused, or timeout
 *
 * Implemented per research, unverified against live Tally.
 */

import * as http from "node:http";
import {
    JobExecutor,
    JobExecutionResult,
    TallySyncJob,
    ConfigStore,
    Logger,
} from "./types";

export interface TallyJobExecutorOptions {
    host?: string;
    port?: number;
    companyName?: string;
    timeoutMs?: number;
    configStore?: ConfigStore;
    logger?: Logger;
    poster?: (host: string, port: number, xml: string, timeoutMs: number) => Promise<{ status: number; body: string }>;
}

export class StubJobExecutor implements JobExecutor {
    async execute(_job: TallySyncJob): Promise<JobExecutionResult> {
        return {
            outcome: "permanent_error",
            errorCode: "EXECUTOR_NOT_IMPLEMENTED",
            errorMessage: "Bridge executor not installed in this version",
        };
    }
}

/**
 * Escapes special XML characters.
 */
function escapeXml(str: string): string {
    return (str || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

/**
 * Formats a number to 2 decimal places.
 */
function formatAmount(num: number): string {
    return Math.abs(num || 0).toFixed(2);
}

/**
 * Builds minimal Tally XML request for a job if requestXml is not pre-populated.
 */
export function buildJobXml(job: TallySyncJob, companyName: string = "Ind Manager"): string {
    // If requestXml was already built by the cloud server, use it directly
    if (job.requestXml && job.requestXml.trim().length > 0) {
        return job.requestXml;
    }

    const payload = (job as any).payload || {};
    const company = escapeXml(payload.companyName || companyName);

    switch (job.type) {
        case "master.unit": {
            const unit = escapeXml((payload.unitSymbol || payload.symbol || "NOS").toUpperCase());
            const decimals = payload.decimalPlaces ?? 0;
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
          <UNIT NAME="${unit}" ACTION="Create or Alter">
            <NAME>${unit}</NAME>
            <ISSIMPLEUNIT>Yes</ISSIMPLEUNIT>
            <DECIMALPLACES>${decimals}</DECIMALPLACES>
          </UNIT>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;
        }

        case "master.stock_item": {
            const name = escapeXml(payload.name || payload.description || "Sample Item");
            const unit = escapeXml((payload.unit || "NOS").toUpperCase());
            const hsn = escapeXml(payload.hsnCode || "");
            const rate = payload.gstRate ?? 18;
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
          <STOCKGROUP NAME="Primary" ACTION="Create or Alter">
            <NAME>Primary</NAME>
            <PARENT/>
          </STOCKGROUP>
          <UNIT NAME="${unit}" ACTION="Create or Alter">
            <NAME>${unit}</NAME>
            <ISSIMPLEUNIT>Yes</ISSIMPLEUNIT>
            <DECIMALPLACES>0</DECIMALPLACES>
          </UNIT>
          <STOCKITEM NAME="${name}" ACTION="Create or Alter">
            <NAME>${name}</NAME>
            <PARENT>Primary</PARENT>${hsn ? `
            <HSNCODE>${hsn}</HSNCODE>` : ""}
            <GSTAPPLICABLE>Applicable</GSTAPPLICABLE>
            <GSTRATE>${rate}</GSTRATE>
            <BASEUNITS>${unit}</BASEUNITS>
          </STOCKITEM>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;
        }

        case "master.ledger": {
            const name = escapeXml(payload.name || payload.clientName || "Sample Client");
            const alias = escapeXml(payload.alias || payload.clientId || "");
            const gstin = escapeXml(payload.gstin || "");
            const pan = escapeXml(payload.pan || (gstin.length >= 12 ? gstin.substring(2, 12) : ""));
            const state = escapeXml(payload.state || "Maharashtra");
            const regType = gstin ? "Regular" : "Unregistered";
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
            <INCOMETAXNUMBER>${pan}</INCOMETAXNUMBER>` : ""}${state ? `
            <LEDSTATENAME>${state}</LEDSTATENAME>` : ""}
            <GSTREGISTRATIONTYPE>${regType}</GSTREGISTRATIONTYPE>
          </LEDGER>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;
        }

        case "voucher.sales": {
            const invoiceNo = escapeXml(payload.invoiceNumber || "INV-001");
            const invoiceId = escapeXml(payload.invoiceId || job.id);
            const party = escapeXml(payload.partyLedgerName || payload.clientName || "Sample Client");
            const date = escapeXml(payload.invoiceDate || "20260901");
            const state = escapeXml(payload.state || "Maharashtra");
            const total = formatAmount(payload.totalAmount || 0);
            const subtotal = formatAmount(payload.subtotal || 0);
            const cgst = formatAmount(payload.cgstAmount || 0);
            const sgst = formatAmount(payload.sgstAmount || 0);

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
          <VOUCHER VCHTYPE="Sales" ACTION="Create or Alter" OBJVIEW="Invoice Voucher View" REMOTEID="ind-manager-${invoiceId}">
            <DATE>${date}</DATE>
            <VOUCHERNUMBER>${invoiceNo}</VOUCHERNUMBER>
            <REFERENCE>${invoiceNo}</REFERENCE>
            <VOUCHERTYPENAME>Sales</VOUCHERTYPENAME>
            <PARTYLEDGERNAME>${party}</PARTYLEDGERNAME>
            <PARTYNAME>${party}</PARTYNAME>
            <STATENAME>${state}</STATENAME>
            <COUNTRYOFRESIDENCE>India</COUNTRYOFRESIDENCE>
            <PLACEOFSUPPLY>${state}</PLACEOFSUPPLY>
            <GSTREGISTRATIONTYPE>Regular</GSTREGISTRATIONTYPE>
            <CMPGSTREGISTRATIONTYPE>Regular</CMPGSTREGISTRATIONTYPE>
            <NARRATION>Invoice from IND Manager</NARRATION>
            <ISINVOICE>Yes</ISINVOICE>
            <PERSISTEDVIEW>Invoice Voucher View</PERSISTEDVIEW>
            <VCHENTRYMODE>Accounting Invoice</VCHENTRYMODE>
            <UDF:IND_MANAGER_REF.LIST>
              <UDF:IND_MANAGER_REF>IND_MANAGER_${invoiceId}</UDF:IND_MANAGER_REF>
            </UDF:IND_MANAGER_REF.LIST>
            <LEDGERENTRIES.LIST>
              <LEDGERNAME>${party}</LEDGERNAME>
              <ISPARTYLEDGER>Yes</ISPARTYLEDGER>
              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
              <AMOUNT>-${total}</AMOUNT>
              <BILLALLOCATIONS.LIST>
                <NAME>${invoiceNo}</NAME>
                <BILLTYPE>New Ref</BILLTYPE>
                <AMOUNT>-${total}</AMOUNT>
              </BILLALLOCATIONS.LIST>
            </LEDGERENTRIES.LIST>
            <LEDGERENTRIES.LIST>
              <LEDGERNAME>CGST</LEDGERNAME>
              <ISPARTYLEDGER>No</ISPARTYLEDGER>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <AMOUNT>${cgst}</AMOUNT>
            </LEDGERENTRIES.LIST>
            <LEDGERENTRIES.LIST>
              <LEDGERNAME>SGST</LEDGERNAME>
              <ISPARTYLEDGER>No</ISPARTYLEDGER>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <AMOUNT>${sgst}</AMOUNT>
            </LEDGERENTRIES.LIST>
            <ALLINVENTORYENTRIES.LIST>
              <STOCKITEMNAME>Widget</STOCKITEMNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <RATE>${subtotal}/NOS</RATE>
              <AMOUNT>${subtotal}</AMOUNT>
              <ACTUALQTY>1 NOS</ACTUALQTY>
              <BILLEDQTY>1 NOS</BILLEDQTY>
              <BATCHALLOCATIONS.LIST>
                <GODOWNNAME>Main Location</GODOWNNAME>
                <BATCHNAME>Primary Batch</BATCHNAME>
                <AMOUNT>${subtotal}</AMOUNT>
                <ACTUALQTY>1 NOS</ACTUALQTY>
                <BILLEDQTY>1 NOS</BILLEDQTY>
              </BATCHALLOCATIONS.LIST>
              <ACCOUNTINGALLOCATIONS.LIST>
                <LEDGERNAME>Sales Account</LEDGERNAME>
                <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
                <AMOUNT>${subtotal}</AMOUNT>
              </ACCOUNTINGALLOCATIONS.LIST>
            </ALLINVENTORYENTRIES.LIST>
          </VOUCHER>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;
        }

        default:
            throw new Error(`Unsupported job type: ${job.type}`);
    }
}

/**
 * Parses bare Tally response XML.
 */
export function parseTallyResponseXml(rawXml: string): JobExecutionResult {
    const raw = rawXml || "";

    const extractNumber = (tag: string): number => {
        const m = raw.match(new RegExp(`<${tag}>\\s*(\\d+)\\s*<\\/${tag}>`, "i"));
        return m && m[1] ? parseInt(m[1], 10) : 0;
    };

    const extractStrings = (tag: string): string[] => {
        const regex = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "gi");
        const list: string[] = [];
        let m: RegExpExecArray | null;
        while ((m = regex.exec(raw)) !== null) {
            if (m[1]) list.push(m[1].trim());
        }
        return list;
    };

    const created = extractNumber("CREATED");
    const altered = extractNumber("ALTERED");
    const errors = extractNumber("ERRORS");
    const exceptions = extractNumber("EXCEPTIONS");
    const lineErrors = extractStrings("LINEERROR");
    const faultStrings = extractStrings("FAULTSTRING");

    const truncatedResponse = raw.slice(0, 8192);

    if (created > 0 || altered > 0) {
        return {
            outcome: "success",
            created,
            altered,
            errors,
            tallyResponse: truncatedResponse,
        };
    }

    if (errors > 0 || lineErrors.length > 0) {
        const errMsg = lineErrors.length > 0 ? lineErrors.join("; ") : (faultStrings[0] || `Tally reported ${errors} error(s)`);
        return {
            outcome: "permanent_error",
            errorCode: "TALLY_LINE_ERROR",
            errorMessage: errMsg,
            errors: errors || lineErrors.length,
            tallyResponse: truncatedResponse,
        };
    }

    if (exceptions > 0) {
        const detail = faultStrings[0] || (lineErrors.length > 0 ? lineErrors.join("; ") : "");
        if (detail) {
            return {
                outcome: "permanent_error",
                errorCode: "TALLY_EXCEPTION",
                errorMessage: detail,
                errors: exceptions,
                tallyResponse: truncatedResponse,
            };
        }

        return {
            outcome: "permanent_error",
            errorCode: "TALLY_REJECTED_NO_DETAIL",
            errorMessage: "Tally rejected the import with EXCEPTIONS but gave no detailed reason",
            errors: exceptions,
            tallyResponse: truncatedResponse,
        };
    }

    return {
        outcome: "permanent_error",
        errorCode: "TALLY_NO_CHANGES",
        errorMessage: "Tally import response indicated zero masters or vouchers were created or altered",
        tallyResponse: truncatedResponse,
    };
}

/**
 * Standard HTTP POST to local Tally with timeout.
 */
function defaultHttpPost(
    host: string,
    port: number,
    xmlBody: string,
    timeoutMs: number,
): Promise<{ status: number; body: string }> {
    return new Promise((resolve, reject) => {
        const req = http.request(
            {
                hostname: host,
                port,
                method: "POST",
                path: "/",
                headers: {
                    "Content-Type": "text/xml; charset=utf-8",
                    "Content-Length": Buffer.byteLength(xmlBody, "utf-8"),
                },
                timeout: timeoutMs,
            },
            (res) => {
                const chunks: Buffer[] = [];
                res.on("data", (chunk: Buffer) => chunks.push(chunk));
                res.on("end", () => {
                    const raw = Buffer.concat(chunks).toString("utf-8");
                    const cleaned = raw.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");
                    resolve({ status: res.statusCode || 0, body: cleaned });
                });
            },
        );

        req.on("error", (err) => reject(err));
        req.on("timeout", () => {
            req.destroy();
            const timeoutError = new Error(`Request to Tally timed out after ${timeoutMs}ms`);
            (timeoutError as any).code = "ETIMEDOUT";
            reject(timeoutError);
        });

        req.write(xmlBody);
        req.end();
    });
}

/**
 * Production JobExecutor for Tally Bridge.
 */
export class TallyJobExecutor implements JobExecutor {
    private defaultHost: string;
    private defaultPort: number;
    private companyName?: string;
    private timeoutMs: number;
    private configStore?: ConfigStore;
    private logger?: Logger;
    private poster: (host: string, port: number, xml: string, timeoutMs: number) => Promise<{ status: number; body: string }>;

    constructor(options: TallyJobExecutorOptions = {}) {
        this.defaultHost = options.host || "localhost";
        this.defaultPort = options.port || 9000;
        this.companyName = options.companyName;
        this.timeoutMs = options.timeoutMs || 15_000; // 15-second timeout requirement
        this.configStore = options.configStore;
        this.logger = options.logger;
        this.poster = options.poster || defaultHttpPost;
    }

    async execute(job: TallySyncJob): Promise<JobExecutionResult> {
        let host = this.defaultHost;
        let port = this.defaultPort;
        let company = this.companyName || "Ind Manager";

        if (this.configStore) {
            try {
                const cfg = await this.configStore.getConfig();
                if (cfg) {
                    if (cfg.tallyHost) host = cfg.tallyHost;
                    if (cfg.tallyPort) port = cfg.tallyPort;
                    if (cfg.tallyCompany) company = cfg.tallyCompany;
                }
            } catch {
                // Keep default
            }
        }

        // 1. Build or retrieve XML request
        let xml: string;
        try {
            xml = buildJobXml(job, company);
        } catch (err: any) {
            return {
                outcome: "permanent_error",
                errorCode: "XML_BUILD_ERROR",
                errorMessage: err?.message || "Failed to generate Tally XML for job",
            };
        }

        this.logger?.info("Executing Tally job", {
            jobId: job.id,
            jobType: job.type,
            targetHost: host,
            targetPort: port,
        });

        // 2. POST XML to Tally with 15s timeout
        let response: { status: number; body: string };
        try {
            response = await this.poster(host, port, xml, this.timeoutMs);
        } catch (netErr: any) {
            const isTimeout = netErr?.code === "ETIMEDOUT" || /timeout/i.test(netErr?.message);
            return {
                outcome: "retryable_error",
                errorCode: isTimeout ? "TALLY_TIMEOUT" : "TALLY_NETWORK_ERROR",
                errorMessage: netErr?.message ? String(netErr.message).slice(0, 200) : "Failed to connect to Tally XML server",
            };
        }

        // 3. Parse and classify Tally response
        if (response.status !== 200) {
            return {
                outcome: "retryable_error",
                errorCode: "TALLY_HTTP_ERROR",
                errorMessage: `Tally XML server returned HTTP status ${response.status}`,
            };
        }

        return parseTallyResponseXml(response.body);
    }
}

export async function executeJobWithTimeout(
    executor: JobExecutor,
    job: TallySyncJob,
    timeoutMs: number = 90_000,
): Promise<JobExecutionResult> {
    let timer: NodeJS.Timeout;

    const timeoutPromise = new Promise<JobExecutionResult>((resolve) => {
        timer = setTimeout(() => {
            resolve({
                outcome: "retryable_error",
                errorCode: "EXECUTOR_TIMEOUT",
                errorMessage: `Job execution timed out after ${timeoutMs}ms`,
            });
        }, timeoutMs);
    });

    try {
        const result = await Promise.race([executor.execute(job), timeoutPromise]);
        clearTimeout(timer!);
        return result;
    } catch (err: any) {
        clearTimeout(timer!);
        return {
            outcome: "retryable_error",
            errorCode: "EXECUTOR_EXCEPTION",
            errorMessage: err?.message ? String(err.message).slice(0, 100) : "Executor thrown error",
        };
    }
}
