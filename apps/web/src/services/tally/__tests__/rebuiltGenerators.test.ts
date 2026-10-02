import { describe, it, expect } from "vitest";
import { generateUnitXml } from "../generateUnitXml";
import { generateStockItemXml } from "../generateStockItemXml";
import { generateGSTLedgerXml, generateRoundOffLedgerXml } from "../generateLedgerXml";
import { generateSalesVoucherXml } from "../generateSalesVoucherXml";
import { parseTallyResponse } from "../parseTallyResponse";

describe("Rebuilt Tally XML Generators (Part B)", () => {
    describe("generateUnitXml (B1)", () => {
        it("creates a unit master with ACTION='Create or Alter'", () => {
            const xml = generateUnitXml("NOS", "Test Company");
            expect(xml).toContain('<UNIT NAME="NOS" ACTION="Create or Alter">');
            expect(xml).toContain("<NAME>NOS</NAME>");
            expect(xml).toContain("<ISSIMPLEUNIT>Yes</ISSIMPLEUNIT>");
            expect(xml).toContain("<SVCURRENTCOMPANY>Test Company</SVCURRENTCOMPANY>");
        });
    });

    describe("generateStockItemXml (B2)", () => {
        it("ensures Primary stock group and Unit master exist before stock item", () => {
            const xml = generateStockItemXml(
                {
                    description: "Industrial Valve A1",
                    unit: "NOS",
                    tallyUnit: "NOS",
                    quantity: 10,
                    rate: 500,
                    amount: 5000,
                    hsnCode: "84818090",
                    gstRate: 18,
                },
                "Test Company",
            );

            // Prereq 1: Stock group Primary
            expect(xml).toContain('<STOCKGROUP NAME="Primary" ACTION="Create or Alter">');
            // Prereq 2: Unit master
            expect(xml).toContain('<UNIT NAME="NOS" ACTION="Create or Alter">');
            // Stock Item itself
            expect(xml).toContain('<STOCKITEM NAME="Industrial Valve A1" ACTION="Create or Alter">');
            expect(xml).toContain("<PARENT>Primary</PARENT>");
            expect(xml).toContain("<BASEUNITS>NOS</BASEUNITS>");
            expect(xml).toContain("<HSNCODE>84818090</HSNCODE>");
            expect(xml).toContain("<GSTRATE>18</GSTRATE>");
        });
    });

    describe("generateLedgerXml GST & Round-Off (B3)", () => {
        it("creates GST duty ledgers with TAXTYPE=GST and correct GSTDUTYHEAD", () => {
            const cgstXml = generateGSTLedgerXml("CGST", "Test Company");
            expect(cgstXml).toContain("<TAXTYPE>GST</TAXTYPE>");
            expect(cgstXml).toContain("<GSTDUTYHEAD>Central Tax</GSTDUTYHEAD>");
            expect(cgstXml).toContain("<ISDUTYLEDGER>Yes</ISDUTYLEDGER>");
            expect(cgstXml).toContain("<GSTAPPLICABLE>Applicable</GSTAPPLICABLE>");

            const sgstXml = generateGSTLedgerXml("SGST", "Test Company");
            expect(sgstXml).toContain("<TAXTYPE>GST</TAXTYPE>");
            expect(sgstXml).toContain("<GSTDUTYHEAD>State Tax</GSTDUTYHEAD>");

            const igstXml = generateGSTLedgerXml("IGST", "Test Company");
            expect(sgstXml).toContain("<TAXTYPE>GST</TAXTYPE>");
            expect(igstXml).toContain("<GSTDUTYHEAD>Integrated Tax</GSTDUTYHEAD>");
        });

        it("creates Round Off ledger under Indirect Expenses", () => {
            const roundOffXml = generateRoundOffLedgerXml("Test Company");
            expect(roundOffXml).toContain('<LEDGER NAME="Round Off" ACTION="Create or Alter">');
            expect(roundOffXml).toContain("<PARENT>Indirect Expenses</PARENT>");
        });
    });

    describe("generateSalesVoucherXml (B4)", () => {
        const basePayload = {
            invoiceId: "inv_998877",
            invoiceNumber: "INV-2026-001",
            invoiceDate: "2026-03-31",
            dueDate: "2026-04-15",
            partyLedgerName: "Spike Traders & Sons",
            partyName: "Spike Traders & Sons Enterprise",
            partyState: "Maharashtra",
            companyState: "Maharashtra",
            gstRegistrationType: "Regular",
            totalAmount: 1180,
            subtotal: 1000,
            cgstAmount: 90,
            sgstAmount: 90,
            igstAmount: 0,
            isInterstate: false,
            narration: "Test invoice",
            lineItems: [
                {
                    description: "Steel Pipe 50mm",
                    quantity: 10,
                    rate: 100,
                    amount: 1000,
                    unit: "NOS",
                    tallyUnit: "NOS",
                    hsnCode: "7306",
                    gstRate: 18,
                },
            ],
            companyName: "Star Industries",
        };

        it("generates XML with envelope declaration, REMOTEID, voucher-level fields, and nested accounting allocations", () => {
            const xml = generateSalesVoucherXml(basePayload);

            expect(xml).toContain('<?xml version="1.0" encoding="utf-8"?>');
            expect(xml).toContain('REMOTEID="ind-manager-inv_998877"');
            expect(xml).toContain('ACTION="Create or Alter"');
            expect(xml).toContain('OBJVIEW="Invoice Voucher View"');
            expect(xml).toContain('<VCHENTRYMODE>Accounting Invoice</VCHENTRYMODE>');

            // Voucher level
            expect(xml).toContain("<VOUCHERTYPENAME>Sales</VOUCHERTYPENAME>");
            expect(xml).toContain("<PARTYNAME>Spike Traders &amp; Sons Enterprise</PARTYNAME>");
            expect(xml).toContain("<PARTYLEDGERNAME>Spike Traders &amp; Sons</PARTYLEDGERNAME>");
            expect(xml).toContain("<STATENAME>Maharashtra</STATENAME>");
            expect(xml).toContain("<PLACEOFSUPPLY>Maharashtra</PLACEOFSUPPLY>");
            expect(xml).toContain("<COUNTRYOFRESIDENCE>India</COUNTRYOFRESIDENCE>");
            expect(xml).toContain("<GSTREGISTRATIONTYPE>Regular</GSTREGISTRATIONTYPE>");
            expect(xml).toContain("<CMPGSTREGISTRATIONTYPE>Regular</CMPGSTREGISTRATIONTYPE>");

            // Inventory and Accounting Allocations
            expect(xml).toContain("<ALLINVENTORYENTRIES.LIST>");
            expect(xml).toContain("<STOCKITEMNAME>Steel Pipe 50mm</STOCKITEMNAME>");
            expect(xml).toContain("<ACCOUNTINGALLOCATIONS.LIST>");
            expect(xml).toContain("<LEDGERNAME>Sales Account</LEDGERNAME>");
            expect(xml).toContain("<ISPARTYLEDGER>No</ISPARTYLEDGER>");

            // Tax ledgers in LEDGERENTRIES.LIST
            expect(xml).toContain("<LEDGERENTRIES.LIST>");
            expect(xml).toContain("<LEDGERNAME>CGST</LEDGERNAME>");
            expect(xml).toContain("<LEDGERNAME>SGST</LEDGERNAME>");
        });

        it("handles round-off when diff is between 0.01 and 1.00", () => {
            const payloadWithDiff = {
                ...basePayload,
                totalAmount: 1180.35, // 1000 + 90 + 90 = 1180, diff is +0.35
            };
            const xml = generateSalesVoucherXml(payloadWithDiff);
            expect(xml).toContain("<LEDGERNAME>Round Off</LEDGERNAME>");
            expect(xml).toContain("<AMOUNT>0.35</AMOUNT>");
        });

        it("throws an error when difference is greater than 1.00", () => {
            const payloadBadDiff = {
                ...basePayload,
                totalAmount: 1250, // diff is 70
            };
            expect(() => generateSalesVoucherXml(payloadBadDiff)).toThrow(
                /exceeds allowable round-off limit/i,
            );
        });
    });

    describe("parseTallyResponse (B5)", () => {
        it("returns success when CREATED > 0", () => {
            const xml = `<RESPONSE><CREATED>1</CREATED><ALTERED>0</ALTERED><ERRORS>0</ERRORS><EXCEPTIONS>0</EXCEPTIONS></RESPONSE>`;
            const res = parseTallyResponse(xml);
            expect(res.outcome).toBe("success");
            expect(res.created).toBe(1);
        });

        it("returns permanent_error when LINEERROR is present", () => {
            const xml = `<RESPONSE><CREATED>0</CREATED><ERRORS>1</ERRORS><LINEERROR>Ledger does not exist</LINEERROR></RESPONSE>`;
            const res = parseTallyResponse(xml);
            expect(res.outcome).toBe("permanent_error");
            expect(res.errorMessage).toBe("Ledger does not exist");
        });

        it("returns permanent_error with TALLY_REJECTED_NO_DETAIL when EXCEPTIONS > 0 and no error text", () => {
            const xml = `<RESPONSE><CREATED>0</CREATED><ALTERED>0</ALTERED><ERRORS>0</ERRORS><EXCEPTIONS>1</EXCEPTIONS></RESPONSE>`;
            const res = parseTallyResponse(xml);
            expect(res.outcome).toBe("permanent_error");
            expect(res.errorCode).toBe("TALLY_REJECTED_NO_DETAIL");
            expect(res.errorMessage).toContain("Tally rejected the import with EXCEPTIONS");
        });
    });
});
