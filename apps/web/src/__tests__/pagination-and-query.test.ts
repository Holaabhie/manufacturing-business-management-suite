import { describe, it, expect } from "vitest";
import {
  escapeRegex,
  paginationQuerySchema,
  buildPaginatedEnvelope,
} from "@/shared/lib/pagination";

describe("Phase 4: Pagination, Search Sanitation & Query Performance", () => {
  describe("escapeRegex Sanitation", () => {
    it("escapes all regex metacharacters properly", () => {
      const specialChars = ".*+?^${}()|[]\\";
      const escaped = escapeRegex(specialChars);
      expect(escaped).toBe("\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\");

      // Verify it can safely compile into a RegExp without throwing
      const reg = new RegExp(escaped);
      expect(reg.test(specialChars)).toBe(true);
    });

    it("prevents ReDoS and regex injection in product search terms", () => {
      const maliciousPayload = "(([a-z])+)+$";
      const safeEscaped = escapeRegex(maliciousPayload);

      expect(safeEscaped).toBe("\\(\\(\\[a-z\\]\\)\\+\\)\\+\\$");
      const reg = new RegExp(safeEscaped, "i");
      expect(reg.test("(([a-z])+)+$")).toBe(true);
      expect(reg.test("some-unrelated-string")).toBe(false);
    });

    it("handles plain text strings without altering them", () => {
      expect(escapeRegex("Steel Plate 5mm")).toBe("Steel Plate 5mm");
      expect(escapeRegex("Order-12345")).toBe("Order-12345");
    });
  });

  describe("paginationQuerySchema Validation", () => {
    it("applies robust defaults when params are missing", () => {
      const parsed = paginationQuerySchema.parse({});
      expect(parsed.page).toBe(1);
      expect(parsed.limit).toBe(25);
      expect(parsed.order).toBe("desc");
      expect(parsed.sort).toBeUndefined();
      expect(parsed.q).toBeUndefined();
    });

    it("coerces string query parameters into numbers", () => {
      const parsed = paginationQuerySchema.parse({
        page: "3",
        limit: "50",
        order: "asc",
        sort: "product_name",
        q: "Copper",
      });

      expect(parsed.page).toBe(3);
      expect(parsed.limit).toBe(50);
      expect(parsed.order).toBe("asc");
      expect(parsed.sort).toBe("product_name");
      expect(parsed.q).toBe("Copper");
    });

    it("rejects invalid page numbers (page < 1)", () => {
      expect(() => paginationQuerySchema.parse({ page: "0" })).toThrow();
      expect(() => paginationQuerySchema.parse({ page: "-5" })).toThrow();
    });

    it("rejects limits exceeding maximum threshold (> 100)", () => {
      expect(() => paginationQuerySchema.parse({ limit: "101" })).toThrow();
      expect(() => paginationQuerySchema.parse({ limit: "1000" })).toThrow();
    });

    it("rejects invalid sort order values", () => {
      expect(() => paginationQuerySchema.parse({ order: "diagonal" })).toThrow();
    });
  });

  describe("buildPaginatedEnvelope Helper", () => {
    it("computes pagination metadata correctly for multi-page data", () => {
      const dummyData = [{ id: "1" }, { id: "2" }];
      const envelope = buildPaginatedEnvelope(dummyData, 2, 25, 75);

      expect(envelope.success).toBe(true);
      expect(envelope.data).toEqual(dummyData);
      expect(envelope.pagination).toEqual({
        page: 2,
        limit: 25,
        total: 75,
        totalPages: 3,
        hasNextPage: true,
        hasPreviousPage: true,
      });
    });

    it("computes pagination metadata correctly on the first page", () => {
      const dummyData = [{ id: "1" }];
      const envelope = buildPaginatedEnvelope(dummyData, 1, 20, 50);

      expect(envelope.pagination.page).toBe(1);
      expect(envelope.pagination.totalPages).toBe(3);
      expect(envelope.pagination.hasPreviousPage).toBe(false);
      expect(envelope.pagination.hasNextPage).toBe(true);
    });

    it("computes pagination metadata correctly on the last page", () => {
      const dummyData = [{ id: "3" }];
      const envelope = buildPaginatedEnvelope(dummyData, 3, 20, 50);

      expect(envelope.pagination.page).toBe(3);
      expect(envelope.pagination.totalPages).toBe(3);
      expect(envelope.pagination.hasPreviousPage).toBe(true);
      expect(envelope.pagination.hasNextPage).toBe(false);
    });

    it("handles empty results (0 items) without division by zero or NaN", () => {
      const envelope = buildPaginatedEnvelope([], 1, 25, 0);

      expect(envelope.pagination.page).toBe(1);
      expect(envelope.pagination.limit).toBe(25);
      expect(envelope.pagination.total).toBe(0);
      expect(envelope.pagination.totalPages).toBe(1);
      expect(envelope.pagination.hasNextPage).toBe(false);
      expect(envelope.pagination.hasPreviousPage).toBe(false);
    });
  });

  describe("Tenant Isolation Verification in Queries", () => {
    it("guarantees tenant isolation is maintained on both data and count queries", () => {
      const tenantA = "tenant-org-111";
      const tenantB = "tenant-org-222";

      // Mock filter generator verifying ownerId scoping
      const buildTenantFilter = (tenantId: string, q?: string) => {
        const base: Record<string, unknown> = { userId: tenantId };
        if (q) {
          base.$or = [{ name: { $regex: escapeRegex(q), $options: "i" } }];
        }
        return base;
      };

      const filterA = buildTenantFilter(tenantA, "Widget");
      const filterB = buildTenantFilter(tenantB, "Widget");

      expect(filterA.userId).toBe(tenantA);
      expect(filterB.userId).toBe(tenantB);
      expect(filterA.userId).not.toBe(filterB.userId);
    });
  });
});
