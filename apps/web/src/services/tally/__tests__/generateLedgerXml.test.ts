import { describe, it, expect } from "vitest";
import { generatePartyLedgerXml, buildClientLedgerXml } from "../generateLedgerXml";
import { getTallyStateName } from "../tallyXmlHelpers";

describe("Tally Ledger XML Generation", () => {
    it("includes <ALIAS> tag when alias is provided in PartyInfo", () => {
        const xml = generatePartyLedgerXml(
            {
                clientName: "Acme Corp",
                clientGSTIN: "27AABCS1429B1ZV",
                alias: "client_12345",
            },
            "Test Company",
        );

        expect(xml).toContain("<NAME>Acme Corp</NAME>");
        expect(xml).toContain("<ALIAS>client_12345</ALIAS>");
        expect(xml).toContain("<PARENT>Sundry Debtors</PARENT>");
        expect(xml).toContain("<PARTYGSTIN>27AABCS1429B1ZV</PARTYGSTIN>");
    });

    it("omits <ALIAS> tag when alias is not provided", () => {
        const xml = generatePartyLedgerXml(
            {
                clientName: "Acme Corp",
            },
            "Test Company",
        );

        expect(xml).toContain("<NAME>Acme Corp</NAME>");
        expect(xml).not.toContain("<ALIAS>");
    });

    it("buildClientLedgerXml maps client entity with ID to <ALIAS>", () => {
        const client = {
            id: "66f3a1b2c3d4e5f60718293a",
            name: "Sharma Enterprises",
            gstin: "24AAACS1234A1Z5",
            state: "Gujarat",
            address: "123 Industrial Area, Ahmedabad",
        };

        const xml = buildClientLedgerXml(client, "Star Manufacturing");

        expect(xml).toContain("<NAME>Sharma Enterprises</NAME>");
        expect(xml).toContain("<ALIAS>66f3a1b2c3d4e5f60718293a</ALIAS>");
        expect(xml).toContain("<PARTYGSTIN>24AAACS1234A1Z5</PARTYGSTIN>");
        expect(xml).toContain("<LEDSTATENAME>Gujarat</LEDSTATENAME>");
        expect(xml).toContain("<ADDRESS>123 Industrial Area, Ahmedabad</ADDRESS>");
        expect(xml).toContain("<SVCURRENTCOMPANY>Star Manufacturing</SVCURRENTCOMPANY>");
    });

    it("buildClientLedgerXml derives state code from GSTIN when state is missing", () => {
        const client = {
            id: "66f3a1b2c3d4e5f60718293b",
            name: "Maharashtra Trading",
            gstin: "27AAACS1234A1Z5",
        };

        const xml = buildClientLedgerXml(client, "Star Manufacturing");
        expect(xml).toContain("<LEDSTATENAME>Maharashtra</LEDSTATENAME>");
    });

    it("buildClientLedgerXml generates valid XML when gstin and state are absent", () => {
        const client = {
            id: "66f3a1b2c3d4e5f60718293c",
            name: "Unregistered Buyer",
        };

        const xml = buildClientLedgerXml(client, "Star Manufacturing");
        expect(xml).toContain("<NAME>Unregistered Buyer</NAME>");
        expect(xml).toContain("<ALIAS>66f3a1b2c3d4e5f60718293c</ALIAS>");
        expect(xml).toContain("<GSTREGISTRATIONTYPE>Unregistered</GSTREGISTRATIONTYPE>");
        expect(xml).not.toContain("<PARTYGSTIN>");
        expect(xml).not.toContain("<LEDSTATENAME>");
    });

    it("getTallyStateName handles 2-digit codes and full state names", () => {
        expect(getTallyStateName("27")).toBe("Maharashtra");
        expect(getTallyStateName("24")).toBe("Gujarat");
        expect(getTallyStateName("Maharashtra")).toBe("Maharashtra");
        expect(getTallyStateName("gujarat")).toBe("Gujarat");
        expect(getTallyStateName("UnknownState123")).toBe("Other Territory");
    });
});
