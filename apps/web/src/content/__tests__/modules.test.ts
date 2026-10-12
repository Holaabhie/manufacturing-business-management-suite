import { describe, it, expect } from "vitest";
import { MODULES, FEATURED_SLUGS, MODULE_GROUPS } from "../modules";
import { FORBIDDEN_PATTERNS, ALLOWED_OVERRIDES, runEvidenceAudit } from "../../scripts/validate-modules";

function collectStrings(value: unknown, path = ""): { path: string; text: string }[] {
  const result: { path: string; text: string }[] = [];
  if (typeof value === "string") {
    result.push({ path, text: value });
  } else if (Array.isArray(value)) {
    value.forEach((item, index) => {
      result.push(...collectStrings(item, `${path}[${index}]`));
    });
  } else if (value !== null && typeof value === "object") {
    Object.entries(value).forEach(([key, val]) => {
      result.push(...collectStrings(val, path ? `${path}.${key}` : key));
    });
  }
  return result;
}

describe("Phase 1b - Tightened Module Content Source of Truth", () => {
  it("should have exactly 21 unique module slugs", () => {
    expect(MODULES.length).toBe(21);
    const slugs = MODULES.map((m) => m.slug);
    const uniqueSlugs = new Set(slugs);
    expect(uniqueSlugs.size).toBe(21);
  });

  it("should have all featured slugs present in the module list", () => {
    const slugSet = new Set(MODULES.map((m) => m.slug));
    expect(FEATURED_SLUGS).toEqual([
      "orders",
      "inventory",
      "production",
      "payments-accounts",
    ]);
    for (const slug of FEATURED_SLUGS) {
      expect(slugSet.has(slug)).toBe(true);
    }
  });

  it("should ensure every connectsWith slug refers to an existing module", () => {
    const slugSet = new Set(MODULES.map((m) => m.slug));
    for (const mod of MODULES) {
      for (const target of mod.connectsWith) {
        expect(slugSet.has(target)).toBe(true);
      }
    }
  });

  it("should ensure every module has a valid group matching the 7 predefined groups", () => {
    expect(MODULE_GROUPS.length).toBe(7);
    for (const mod of MODULES) {
      expect(MODULE_GROUPS.includes(mod.group)).toBe(true);
    }
  });

  it("should have at least 4 uses and at least 3 howItWorks steps per module", () => {
    for (const mod of MODULES) {
      expect(mod.uses.length).toBeGreaterThanOrEqual(4);
      expect(mod.howItWorks.length).toBeGreaterThanOrEqual(3);
      expect(mod.keyFeatures.length).toBeGreaterThanOrEqual(1);
      expect(mod.docs.overview).toBeTruthy();
      expect(mod.docs.sections.length).toBeGreaterThanOrEqual(2);
      expect(mod.docs.faqs.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("should not contain any forbidden terms across all string content without an explicit override", () => {
    for (const mod of MODULES) {
      const strings = collectStrings(mod);
      for (const { path, text } of strings) {
        for (const pattern of FORBIDDEN_PATTERNS) {
          const matches = pattern.regex.test(text);
          if (matches) {
            const hasOverride = ALLOWED_OVERRIDES.some(
              (ov) =>
                ov.slug === mod.slug &&
                ov.path === path &&
                ov.patternLabel === pattern.label
            );
            expect(
              hasOverride,
              `Forbidden pattern "${pattern.label}" found in ${mod.slug} at ${path}: "${text}"`
            ).toBe(true);
          }
        }
      }
    }
  });

  it("should verify that every module has at least as many evidence rows as claims in modules.evidence.md", () => {
    const { results, errors } = runEvidenceAudit();
    expect(errors).toBe(0);
    for (const r of results) {
      expect(r.passed).toBe(true);
      expect(r.evidenceCount).toBeGreaterThanOrEqual(r.claimsCount);
    }
  });
});
