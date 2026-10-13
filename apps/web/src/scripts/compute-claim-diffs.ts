import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { MODULES as CURRENT_MODULES } from "../content/modules.ts";

// Write baseline modules to a temp file
const baselineCode = execSync("git show 5680b54:apps/web/src/content/modules.ts", {
  maxBuffer: 10 * 1024 * 1024,
}).toString();

const tempBaselinePath = path.resolve(process.cwd(), "src/scripts/temp_baseline_modules.ts");
fs.writeFileSync(tempBaselinePath, baselineCode);

async function main() {
  const { MODULES: BASELINE_MODULES } = await import("./temp_baseline_modules.ts");

  interface ClaimDiff {
    slug: string;
    deleted: number;
    rewritten: number;
    kept: number;
    totalBaseline: number;
    totalCurrent: number;
  }

  const results: ClaimDiff[] = [];

  function extractClaims(mod: any): { id: string; text: string }[] {
    const list: { id: string; text: string }[] = [];
    mod.uses.forEach((u: string, idx: number) => list.push({ id: `use-${idx + 1}`, text: u }));
    mod.howItWorks.forEach((s: any, idx: number) =>
      list.push({ id: `step-${idx + 1}`, text: `${s.title}: ${s.body}` })
    );
    mod.keyFeatures.forEach((f: string, idx: number) =>
      list.push({ id: `feature-${idx + 1}`, text: f })
    );
    mod.docs.sections.forEach((sec: any, idx: number) =>
      list.push({ id: `section-${idx + 1}`, text: `${sec.heading}: ${sec.body}` })
    );
    mod.docs.faqs.forEach((faq: any, idx: number) =>
      list.push({ id: `faq-${idx + 1}`, text: `${faq.q} ${faq.a}` })
    );
    return list;
  }

  for (const cur of CURRENT_MODULES) {
    const base = BASELINE_MODULES.find((m: any) => m.slug === cur.slug);
    if (!base) {
      continue;
    }

    const curClaims = extractClaims(cur);
    const baseClaims = extractClaims(base);

    let kept = 0;
    let rewritten = 0;
    let deleted = 0;

    // Check baseline against current
    baseClaims.forEach((bClaim) => {
      const match = curClaims.find((c) => c.id === bClaim.id);
      if (!match) {
        deleted++;
      } else if (match.text.trim() === bClaim.text.trim()) {
        kept++;
      } else {
        rewritten++;
      }
    });

    results.push({
      slug: cur.slug,
      deleted,
      rewritten,
      kept,
      totalBaseline: baseClaims.length,
      totalCurrent: curClaims.length,
    });
  }

  // Print table
  console.log("| Module | Claims Deleted | Claims Rewritten | Claims Kept | Total Claims |");
  console.log("| :--- | :---: | :---: | :---: | :---: |");
  let sumDel = 0;
  let sumRew = 0;
  let sumKept = 0;
  let sumTotal = 0;

  for (const r of results) {
    console.log(`| \`${r.slug}\` | ${r.deleted} | ${r.rewritten} | ${r.kept} | ${r.totalCurrent} |`);
    sumDel += r.deleted;
    sumRew += r.rewritten;
    sumKept += r.kept;
    sumTotal += r.totalCurrent;
  }
  console.log(`| **TOTAL** | **${sumDel}** | **${sumRew}** | **${sumKept}** | **${sumTotal}** |`);

  // Clean up
  try {
    fs.unlinkSync(tempBaselinePath);
  } catch {}
}

main().catch(console.error);
