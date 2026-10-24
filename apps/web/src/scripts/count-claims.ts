import { MODULES } from "../content/modules";

let totalClaims = 0;
console.log("Module Claim Counts:");
for (const m of MODULES) {
  const uses = m.uses.length;
  const steps = m.howItWorks.length;
  const features = m.keyFeatures.length;
  const sections = m.docs.sections.length;
  const faqs = m.docs.faqs.length;
  const sum = uses + steps + features + sections + faqs;
  totalClaims += sum;
  console.log(`${m.slug}: ${sum} (uses: ${uses}, steps: ${steps}, features: ${features}, sections: ${sections}, faqs: ${faqs})`);
}
console.log(`TOTAL CLAIMS: ${totalClaims}`);
