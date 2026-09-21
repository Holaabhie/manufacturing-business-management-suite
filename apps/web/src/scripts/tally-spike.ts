/**
 * Tally SPIKE — Live Integration Experiment
 * ─────────────────────────────────────────────────────────
 * Throwaway script to test existing XML generators against
 * a real TallyPrime instance and record raw facts.
 *
 * Run with:
 *   npx tsx src/scripts/tally-spike.ts --company "YourCompany" --date 2026-09-19
 *
 * Requires TallyPrime running with XML server on --port (default 9000).
 */

import * as http from "node:http";
import * as fs from "node:fs";
import * as path from "node:path";

// ── Import existing generators (no copies, no modifications) ──────────
import {
  generatePartyLedgerXml,
  generateSalesLedgerXml,
  generateGSTLedgerXml,
  generateStockItemXml,
  generateSalesVoucherXml,
  formatTallyDate,
  escapeXml,
  mapUnitToTally,
} from "@/services/tally";
import type {
  TallyVoucherPayload,
  TallyLineItem,
} from "@/services/tally";

// ── CLI Argument Parsing (no deps) ────────────────────────────────────
function parseArgs(): { host: string; port: number; company: string; date: string } {
  const args = process.argv.slice(2);
  const map: Record<string, string> = {};
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i]?.replace(/^--/, "");
    const val = args[i + 1];
    if (key && val) map[key] = val;
  }
  if (!map.company) {
    console.error("ERROR: --company is required (exact Tally company name)");
    process.exit(1);
  }
  if (!map.date) {
    console.error("ERROR: --date is required (YYYY-MM-DD)");
    process.exit(1);
  }
  return {
    host: map.host || "localhost",
    port: parseInt(map.port || "9000", 10),
    company: map.company,
    date: map.date,
  };
}

// ── HTTP POST helper (Node built-in, no deps) ─────────────────────────
function postToTally(host: string, port: number, xmlBody: string): Promise<{ status: number; body: string }> {
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
        timeout: 30000,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          const raw = Buffer.concat(chunks).toString("utf-8");
          // Strip invalid XML control characters (Tally sometimes emits 0x01–0x1F)
          const cleaned = raw.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");
          resolve({ status: res.statusCode || 0, body: cleaned });
        });
      },
    );
    req.on("error", (err) => reject(err));
    req.on("timeout", () => { req.destroy(); reject(new Error("Timeout")); });
    req.write(xmlBody);
    req.end();
  });
}

// ── Simple XML tag extractor (no XML parser dep) ──────────────────────
function extractTag(xml: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
  const m = xml.match(re);
  return m ? m[1].trim() : "";
}

function countTag(xml: string, tag: string): number {
  const re = new RegExp(`<${tag}[^>]*>`, "gi");
  return (xml.match(re) || []).length;
}

// ── Export Ledger list from Tally (read-only XML request) ─────────────
function buildExportLedgersXml(company: string): string {
  return `<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Export Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <EXPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>List of Ledgers</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>${escapeXml(company)}</SVCURRENTCOMPANY>
        </STATICVARIABLES>
      </REQUESTDESC>
    </EXPORTDATA>
  </BODY>
</ENVELOPE>`;
}

// ── Result row type ───────────────────────────────────────────────────
interface ScenarioResult {
  scenario: string;
  httpStatus: number;
  created: number;
  altered: number;
  errors: number;
  lineError: string;
  exceptions: string;
}

// ── Parse Tally response for import stats ─────────────────────────────
function parseImportResponse(body: string): { created: number; altered: number; errors: number; lineError: string; exceptions: string } {
  const created = parseInt(extractTag(body, "CREATED") || "0", 10) || 0;
  const altered = parseInt(extractTag(body, "ALTERED") || "0", 10) || 0;

  // Errors: check LINEERROR, ERRORS count, or EXCEPTIONS
  const lineError = extractTag(body, "LINEERROR");
  const errors = parseInt(extractTag(body, "ERRORS") || "0", 10) || (lineError ? 1 : 0);
  const exceptions = extractTag(body, "FAULTSTRING") || extractTag(body, "EXCEPTION") || "";

  return { created, altered, errors, lineError, exceptions };
}

// ══════════════════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════════════════

async function main() {
  const { host, port, company, date } = parseArgs();
  const suffix = Date.now().toString(36);  // unique suffix for reruns
  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);

  console.log("═══════════════════════════════════════════════════════════");
  console.log(" TALLY SPIKE — Live Integration Experiment");
  console.log("═══════════════════════════════════════════════════════════");
  console.log(`  Host:    ${host}:${port}`);
  console.log(`  Company: ${company}`);
  console.log(`  Date:    ${date}`);
  console.log(`  Suffix:  ${suffix}`);
  console.log(`  Time:    ${ts}`);
  console.log("");

  // ── Precondition: Tally reachable ──────────────────────────────────
  console.log("▶ Precondition check: HTTP GET ...");
  try {
    await new Promise<void>((resolve, reject) => {
      const req = http.get(`http://${host}:${port}`, { timeout: 5000 }, (res) => {
        res.resume();
        resolve();
      });
      req.on("error", reject);
      req.on("timeout", () => { req.destroy(); reject(new Error("Timeout")); });
    });
    console.log("  ✅ Tally reachable\n");
  } catch (err: any) {
    console.error(`  ❌ TALLY UNREACHABLE: ${err.message}`);
    process.exit(2);
  }

  // ── Output directory ───────────────────────────────────────────────
  const outDir = path.resolve(process.cwd(), "tally-spike-output", ts);
  fs.mkdirSync(outDir, { recursive: true });
  console.log(`  Output dir: ${outDir}\n`);

  const results: ScenarioResult[] = [];

  // Helper: run a scenario
  async function runScenario(name: string, xml: string): Promise<ScenarioResult> {
    console.log(`▶ ${name} ...`);

    // Save request
    const reqFile = path.join(outDir, `${name}.request.xml`);
    fs.writeFileSync(reqFile, xml, "utf-8");

    try {
      const { status, body } = await postToTally(host, port, xml);

      // Save response
      const resFile = path.join(outDir, `${name}.response.xml`);
      fs.writeFileSync(resFile, body, "utf-8");

      const parsed = parseImportResponse(body);
      const result: ScenarioResult = {
        scenario: name,
        httpStatus: status,
        created: parsed.created,
        altered: parsed.altered,
        errors: parsed.errors,
        lineError: parsed.lineError.slice(0, 120),
        exceptions: parsed.exceptions.slice(0, 120),
      };
      results.push(result);
      console.log(`  HTTP ${status} | C:${parsed.created} A:${parsed.altered} E:${parsed.errors} ${parsed.lineError ? "LINEERR:" + parsed.lineError.slice(0, 60) : "OK"}`);
      return result;
    } catch (err: any) {
      const result: ScenarioResult = {
        scenario: name,
        httpStatus: 0,
        created: 0,
        altered: 0,
        errors: 1,
        lineError: "",
        exceptions: err.message,
      };
      results.push(result);
      console.log(`  ❌ REQUEST FAILED: ${err.message}`);
      return result;
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // SCENARIOS
  // ═══════════════════════════════════════════════════════════════════

  // ── S1a: Ledger create (no XML declaration) ────────────────────────
  const partyName1a = `Spike Traders & Sons Enterprise ${suffix}`;
  const s1aXml = generatePartyLedgerXml(
    {
      clientName: partyName1a,
      clientGSTIN: "27AABCS1429B1ZV",
      clientAddress: "123 Test Street, Mumbai",
      stateCode: "27",
    },
    company,
  );
  await runScenario(`S1a-ledger-no-xmldecl-${suffix}`, s1aXml);

  // ── S1b: Ledger create (WITH XML declaration prepended) ────────────
  const partyName1b = `Spike Traders & Sons Enterprise ${suffix}-b`;
  const s1bXmlBase = generatePartyLedgerXml(
    {
      clientName: partyName1b,
      clientGSTIN: "27AABCS1429B1ZV",
      clientAddress: "123 Test Street, Mumbai",
      stateCode: "27",
    },
    company,
  );
  const s1bXml = `<?xml version="1.0" encoding="utf-8"?>\n${s1bXmlBase}`;
  await runScenario(`S1b-ledger-with-xmldecl-${suffix}`, s1bXml);

  // ── S1-export: Export Ledger collection ────────────────────────────
  const exportXml = buildExportLedgersXml(company);
  await runScenario(`S1-export-ledgers-${suffix}`, exportXml);

  // ── S2: Stock item create ──────────────────────────────────────────
  const testItem: TallyLineItem = {
    description: `Spike Widget Alpha ${suffix}`,
    hsnCode: "8471",
    quantity: 10,
    unit: "pcs",
    tallyUnit: mapUnitToTally("pcs"),
    rate: 100,
    amount: 1000,
    gstRate: 18,
  };
  const s2Xml = generateStockItemXml(testItem, company);
  await runScenario(`S2-stockitem-${suffix}`, s2Xml);

  // ── Ensure prerequisite ledgers exist ──────────────────────────────
  console.log("\n▶ Creating prerequisite ledgers (Sales Account, CGST, SGST) ...");
  await runScenario(`S-prereq-sales-ledger-${suffix}`, generateSalesLedgerXml(company));
  await runScenario(`S-prereq-cgst-${suffix}`, generateGSTLedgerXml("CGST", company));
  await runScenario(`S-prereq-sgst-${suffix}`, generateGSTLedgerXml("SGST", company));

  // ── S3: Sales voucher — unbalanced (round-off) ─────────────────────
  const partyNameVoucher = partyName1a; // reuse ledger from S1a
  const tallyDate = formatTallyDate(date);

  const voucherPayloadS3: TallyVoucherPayload = {
    invoiceId: `spike-inv-s3-${suffix}`,
    invoiceNumber: `SPIKE-S3-${suffix}`,
    invoiceDate: date,
    dueDate: date,
    partyLedgerName: partyNameVoucher,
    totalAmount: 1180.50, // Deliberate mismatch: subtotal(1000) + CGST(90) + SGST(90) = 1180, not 1180.50
    subtotal: 1000,
    cgstAmount: 90,
    sgstAmount: 90,
    igstAmount: 0,
    isInterstate: false,
    narration: "Spike test S3 — unbalanced by 0.50 round-off",
    lineItems: [testItem],
    companyName: company,
  };
  const s3Xml = generateSalesVoucherXml(voucherPayloadS3);
  await runScenario(`S3-voucher-unbalanced-${suffix}`, s3Xml);

  // ── S4: Sales voucher — exactly balanced ───────────────────────────
  const itemS4: TallyLineItem = {
    description: `Spike Widget Alpha ${suffix}`,
    hsnCode: "8471",
    quantity: 10,
    unit: "pcs",
    tallyUnit: mapUnitToTally("pcs"),
    rate: 123.456,
    amount: 1234.56,
    gstRate: 18,
  };
  const voucherPayloadS4: TallyVoucherPayload = {
    invoiceId: `spike-inv-s4-${suffix}`,
    invoiceNumber: `SPIKE-S4-${suffix}`,
    invoiceDate: date,
    dueDate: date,
    partyLedgerName: partyNameVoucher,
    totalAmount: 1456.78,  // 1234.56 + 111.11 + 111.11 = 1456.78
    subtotal: 1234.56,
    cgstAmount: 111.11,
    sgstAmount: 111.11,
    igstAmount: 0,
    isInterstate: false,
    narration: "Spike test S4 — exactly balanced",
    lineItems: [itemS4],
    companyName: company,
  };
  const s4Xml = generateSalesVoucherXml(voucherPayloadS4);
  await runScenario(`S4-voucher-balanced-${suffix}`, s4Xml);

  // ── S5: Duplicate — re-send S4's identical XML ─────────────────────
  await runScenario(`S5-voucher-duplicate-${suffix}`, s4Xml);

  // ── S6: S4's XML with REMOTEID on VOUCHER tag, sent twice ──────────
  const s6Xml = s4Xml.replace(
    `<VOUCHER VCHTYPE="Sales" ACTION="Create" OBJVIEW="Invoice Voucher View">`,
    `<VOUCHER VCHTYPE="Sales" ACTION="Create" OBJVIEW="Invoice Voucher View" REMOTEID="ind-spike-${suffix}">`,
  );
  await runScenario(`S6a-voucher-remoteid-${suffix}`, s6Xml);
  await runScenario(`S6b-voucher-remoteid-dup-${suffix}`, s6Xml);

  // ── S7: S4's XML with UDF:IND_MANAGER_REF removed ─────────────────
  const s7Xml = s4Xml
    .replace(/\s*<UDF:IND_MANAGER_REF\.LIST>[\s\S]*?<\/UDF:IND_MANAGER_REF\.LIST>/g, "")
    .replace(
      `SPIKE-S4-${suffix}`,
      `SPIKE-S7-${suffix}`,
    );
  await runScenario(`S7-voucher-no-udf-${suffix}`, s7Xml);

  // ═══════════════════════════════════════════════════════════════════
  // SUMMARY TABLE
  // ═══════════════════════════════════════════════════════════════════
  console.log("\n\n═══════════════════════════════════════════════════════════");
  console.log(" SUMMARY TABLE");
  console.log("═══════════════════════════════════════════════════════════");

  const header = [
    "Scenario".padEnd(45),
    "HTTP".padStart(4),
    "CREATED".padStart(7),
    "ALTERED".padStart(7),
    "ERRORS".padStart(6),
    "LINEERROR".padEnd(60),
    "EXCEPTIONS".padEnd(60),
  ].join(" | ");
  const sep = "─".repeat(header.length);

  console.log(sep);
  console.log(header);
  console.log(sep);

  for (const r of results) {
    console.log([
      r.scenario.padEnd(45),
      String(r.httpStatus).padStart(4),
      String(r.created).padStart(7),
      String(r.altered).padStart(7),
      String(r.errors).padStart(6),
      (r.lineError || "-").padEnd(60),
      (r.exceptions || "-").padEnd(60),
    ].join(" | "));
  }

  console.log(sep);
  console.log(`\nOutput files: ${outDir}`);
  console.log(`Total scenarios: ${results.length}`);
  console.log(`  Passed (created>0 or altered>0): ${results.filter(r => r.created > 0 || r.altered > 0).length}`);
  console.log(`  Errors: ${results.filter(r => r.errors > 0).length}`);
  console.log(`  Failed (HTTP 0): ${results.filter(r => r.httpStatus === 0).length}`);
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
