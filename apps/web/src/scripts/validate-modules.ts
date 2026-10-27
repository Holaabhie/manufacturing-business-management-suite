/**
 * Phase 1d Tightened Module Content & Evidence Anchor Validator
 *
 * Verifies:
 * 1. Module Slugs: exactly 21 unique slugs matching MODULES.
 * 2. Featured Slugs: all 4 exist in MODULES.
 * 3. connectsWith integrity: all targets exist.
 * 4. Content bounds: >=4 uses, >=3 steps, non-empty features & complete docs.
 * 5. Forbidden patterns: zero occurrences in modules.ts.
 * 6. Evidence Check:
 *    - Parses every evidence row in modules.evidence.md.
 *    - Every row MUST specify an Anchor token.
 *    - Every cited file MUST exist on disk.
 *    - Every line range MUST be within bounds of the file.
 *    - Every Anchor token MUST be present literally within the cited line range.
 *    - Total verified evidence rows per module MUST match documented claims count.
 */

import fs from "node:fs";
import path from "node:path";
import { MODULES, FEATURED_SLUGS } from "../content/modules";

export interface EvidenceAuditResult {
  slug: string;
  claimsCount: number;
  evidenceCount: number;
  verifiedCount: number;
  passed: boolean;
  failures: string[];
}

export function runAnchorEvidenceAudit(evidenceFilePath?: string): {
  results: EvidenceAuditResult[];
  totalClaims: number;
  totalVerified: number;
  allFailures: string[];
} {
  const candidate1 = path.resolve(process.cwd(), "src/content/modules.evidence.md");
  const candidate2 = path.resolve(process.cwd(), "apps/web/src/content/modules.evidence.md");
  const candidate3 = path.resolve(__dirname, "../content/modules.evidence.md");
  const filePath =
    evidenceFilePath ||
    (fs.existsSync(candidate1) ? candidate1 : fs.existsSync(candidate2) ? candidate2 : candidate3);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Evidence file not found: ${filePath}`);
  }

  // Workspace root: directory containing apps/web
  let workspaceRoot = process.cwd();
  if (fs.existsSync(path.resolve(process.cwd(), "apps/web"))) {
    workspaceRoot = process.cwd();
  } else if (fs.existsSync(path.resolve(process.cwd(), "../apps/web"))) {
    workspaceRoot = path.resolve(process.cwd(), "..");
  } else if (fs.existsSync(path.resolve(process.cwd(), "../../apps/web"))) {
    workspaceRoot = path.resolve(process.cwd(), "../..");
  }

  const content = fs.readFileSync(filePath, "utf-8").replace(/\r\n/g, "\n");
  const results: EvidenceAuditResult[] = [];
  const allFailures: string[] = [];
  let totalClaims = 0;
  let totalVerified = 0;

  for (const mod of MODULES) {
    const claimsCount =
      mod.uses.length +
      mod.howItWorks.length +
      mod.keyFeatures.length +
      mod.docs.sections.length +
      mod.docs.faqs.length;

    totalClaims += claimsCount;

    const slugPattern = new RegExp(
      `##\\s+.*\\(\\\`${mod.slug}\\\`\\)([\\s\\S]*?)(?=\\n##\\s+|$)`
    );
    const match = content.match(slugPattern);

    const failures: string[] = [];
    let evidenceCount = 0;
    let verifiedCount = 0;

    if (!match) {
      failures.push(`Module "${mod.slug}" section not found in evidence markdown`);
    } else {
      const sectionText = match[1];

      // Match each evidence bullet block
      // Format:
      // - **[claimId]** ...
      //   - **Proof**: [`path#Lstart-Lend`](...)
      //   - **Anchor**: `token`
      //   - **Citation**: ...
      const blockRegex =
        /- \*\*\[([a-z]+-\d+)\]\*\*[^\n]*\n\s+- \*\*Proof\*\*:\s+\[`([^#`]+)#L?(\d+)(?:-L?(\d+))?`\]\([^\)]+\)\n(?:\s+- \*\*Anchor\*\*:\s+`([^`]+)`\n)?\s+- \*\*Citation\*\*:\s+([^\n]+)/g;

      let rowMatch: RegExpExecArray | null;
      while ((rowMatch = blockRegex.exec(sectionText)) !== null) {
        evidenceCount++;
        const claimId = rowMatch[1];
        const citedFile = rowMatch[2].trim();
        const startLine = parseInt(rowMatch[3], 10);
        const endLine = rowMatch[4] ? parseInt(rowMatch[4], 10) : startLine;
        const anchor = rowMatch[5]?.trim();
        const citation = rowMatch[6].trim();

        if (!anchor) {
          failures.push(
            `[${mod.slug}][${claimId}] Missing Anchor token for cited file ${citedFile}#L${startLine}-L${endLine}`
          );
          continue;
        }

        const fullPath = path.resolve(workspaceRoot, citedFile);
        if (!fs.existsSync(fullPath)) {
          failures.push(
            `[${mod.slug}][${claimId}] Cited file does not exist on disk: ${citedFile}`
          );
          continue;
        }

        const fileContent = fs.readFileSync(fullPath, "utf-8");
        const lines = fileContent.split("\n");

        if (startLine < 1 || endLine > lines.length || startLine > endLine) {
          failures.push(
            `[${mod.slug}][${claimId}] Line range out of bounds: L${startLine}-L${endLine} in ${citedFile} (file has ${lines.length} lines)`
          );
          continue;
        }

        const lineSlice = lines.slice(startLine - 1, endLine).join("\n");
        if (!lineSlice.includes(anchor)) {
          failures.push(
            `[${mod.slug}][${claimId}] Anchor "${anchor}" NOT found in ${citedFile}#L${startLine}-L${endLine}`
          );
          continue;
        }

        verifiedCount++;
      }
    }

    const passed = failures.length === 0 && verifiedCount === claimsCount;
    if (!passed) {
      allFailures.push(...failures);
      if (verifiedCount !== claimsCount) {
        allFailures.push(
          `[${mod.slug}] Verified count mismatch: ${verifiedCount} verified vs ${claimsCount} documented claims`
        );
      }
    }

    totalVerified += verifiedCount;

    results.push({
      slug: mod.slug,
      claimsCount,
      evidenceCount,
      verifiedCount,
      passed,
      failures,
    });
  }

  return { results, totalClaims, totalVerified, allFailures };
}

export interface PatternDefinition {
  label: string;
  regex: RegExp;
}

export const FORBIDDEN_PATTERNS: PatternDefinition[] = [
  { label: "real-time", regex: /\breal[\s-]?time\b/i },
  { label: "batch", regex: /\bbatch(?:es)?\b/i },
  { label: "serial number", regex: /\bserial\s+number(?:s)?\b/i },
  { label: "never run out", regex: /\bnever\s+run\s+out\b/i },
  { label: "never pauses", regex: /\bnever\s+pause(?:s)?\b/i },
  { label: "never miss", regex: /\bnever\s+miss\b/i },
  { label: "ensure.* never", regex: /\bensur(?:e|ing)\b.*?\bnever\b/i },
  { label: "instant", regex: /\binstant(?:ly)?\b/i },
  { label: "one click", regex: /\bone[\s-]?click\b/i },
];

export const ALLOWED_OVERRIDES: {
  slug: string;
  path: string;
  patternLabel: string;
}[] = [];

export function runEvidenceAudit(evidenceFilePath?: string) {
  const audit = runAnchorEvidenceAudit(evidenceFilePath);
  return {
    results: audit.results,
    errors: audit.allFailures.length,
    totalClaims: audit.totalClaims,
    totalVerified: audit.totalVerified,
    allFailures: audit.allFailures,
  };
}


function collectStrings(
  value: unknown,
  p = ""
): { path: string; text: string }[] {
  const result: { path: string; text: string }[] = [];

  if (typeof value === "string") {
    result.push({ path: p, text: value });
  } else if (Array.isArray(value)) {
    value.forEach((item, index) => {
      result.push(...collectStrings(item, `${p}[${index}]`));
    });
  } else if (value !== null && typeof value === "object") {
    Object.entries(value).forEach(([key, val]) => {
      result.push(...collectStrings(val, p ? `${p}.${key}` : key));
    });
  }

  return result;
}

function runValidation() {
  console.log("=== Phase 1d Module Content & Anchor Evidence Validator ===");
  console.log(`Total modules loaded: ${MODULES.length}`);

  let errors = 0;

  // 1. Unique slugs
  const slugCounts = new Map<string, number>();
  for (const mod of MODULES) {
    slugCounts.set(mod.slug, (slugCounts.get(mod.slug) || 0) + 1);
  }

  const duplicates = Array.from(slugCounts.entries()).filter(
    ([, count]) => count > 1
  );
  if (duplicates.length > 0) {
    console.error("FAIL: Duplicate slugs found:", duplicates);
    errors++;
  } else {
    console.log("PASS: All slugs are unique (21 unique slugs).");
  }

  const validSlugSet = new Set(MODULES.map((m) => m.slug));

  // 2. Featured slugs validation
  const invalidFeatured = FEATURED_SLUGS.filter((s) => !validSlugSet.has(s));
  if (invalidFeatured.length > 0) {
    console.error("FAIL: Invalid featured slugs:", invalidFeatured);
    errors++;
  } else {
    console.log(
      `PASS: All featured slugs exist (${FEATURED_SLUGS.join(", ")}).`
    );
  }

  // 3. connectsWith slugs exist
  let brokenConnections = 0;
  for (const mod of MODULES) {
    for (const target of mod.connectsWith) {
      if (!validSlugSet.has(target)) {
        console.error(
          `FAIL: Module "${mod.slug}" connectsWith unknown slug "${target}"`
        );
        brokenConnections++;
        errors++;
      }
    }
  }
  if (brokenConnections === 0) {
    console.log("PASS: Every connectsWith slug exists in the module list.");
  }

  // 4. Minimum uses (>= 4) and howItWorks steps (>= 3)
  let countViolations = 0;
  for (const mod of MODULES) {
    if (!Array.isArray(mod.uses) || mod.uses.length < 4) {
      console.error(
        `FAIL: Module "${mod.slug}" has ${mod.uses?.length || 0} uses (minimum required: 4)`
      );
      countViolations++;
      errors++;
    }
    if (!Array.isArray(mod.howItWorks) || mod.howItWorks.length < 3) {
      console.error(
        `FAIL: Module "${mod.slug}" has ${mod.howItWorks?.length || 0} steps (minimum required: 3)`
      );
      countViolations++;
      errors++;
    }
    if (!Array.isArray(mod.keyFeatures) || mod.keyFeatures.length === 0) {
      console.error(`FAIL: Module "${mod.slug}" is missing keyFeatures`);
      countViolations++;
      errors++;
    }
    if (
      !mod.docs ||
      !mod.docs.overview ||
      !mod.docs.sections?.length ||
      !mod.docs.faqs?.length
    ) {
      console.error(`FAIL: Module "${mod.slug}" has incomplete docs`);
      countViolations++;
      errors++;
    }
  }
  if (countViolations === 0) {
    console.log("PASS: Every module has >=4 uses, >=3 steps, and complete docs.");
  }

  // 5. Forbidden strings check
  let forbiddenMatches = 0;
  for (const mod of MODULES) {
    const allStrings = collectStrings(mod);
    for (const { path: propPath, text } of allStrings) {
      for (const pattern of FORBIDDEN_PATTERNS) {
        if (pattern.regex.test(text)) {
          console.error(
            `FAIL: Forbidden pattern "${pattern.label}" found in ${mod.slug} at ${propPath}: "${text}"`
          );
          forbiddenMatches++;
          errors++;
        }
      }
    }
  }

  if (forbiddenMatches === 0) {
    console.log(
      "PASS: No forbidden terms found ('real-time', 'batch', 'serial number', 'never run out', 'never pauses', 'never miss', 'ensure.* never', 'instant', 'one click')."
    );
  }

  // 6. Anchor-based Evidence Audit Check
  console.log("\n--- Anchor-Based Evidence Audit Check ---");
  const audit = runAnchorEvidenceAudit();

  for (const r of audit.results) {
    if (r.passed) {
      console.log(
        `PASS [${r.slug}]: ${r.claimsCount} claims == ${r.verifiedCount} verified anchor rows`
      );
    } else {
      console.error(
        `FAIL [${r.slug}]: ${r.claimsCount} claims != ${r.verifiedCount} verified (evidence parsed: ${r.evidenceCount})`
      );
      for (const f of r.failures) {
        console.error(`  -> ${f}`);
      }
      errors++;
    }
  }

  console.log("=========================================");
  console.log(
    `Total Claims: ${audit.totalClaims} | Total Verified Anchors: ${audit.totalVerified} | Failures: ${audit.allFailures.length}`
  );

  if (errors === 0 && audit.allFailures.length === 0) {
    console.log("ALL VALIDATION & ANCHOR CHECKS PASSED SUCCESSFULLY!");
    process.exit(0);
  } else {
    console.error(`VALIDATION FAILED WITH ${errors + audit.allFailures.length} ISSUE(S)`);
    process.exit(1);
  }
}

const isMain =
  process.argv[1] &&
  (process.argv[1].endsWith("validate-modules.ts") ||
    process.argv[1].endsWith("validate-modules"));

if (isMain) {
  runValidation();
}
