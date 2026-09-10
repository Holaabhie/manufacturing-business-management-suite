const fs = require('fs');

const file = 'apps/web/src/app/dashboard/production/page.tsx';
let raw = fs.readFileSync(file, 'utf8');
const isCrlf = raw.includes('\r\n');
let code = raw.replace(/\r\n/g, '\n');

// 1. Imports
if (!code.includes('useTranslations')) {
  code = code.replace(
    'import { useCachedPage } from "@/hooks/useCachedPage";',
    'import { useTranslations } from "next-intl";\nimport { useAppLocale } from "@/components/LocaleProvider";\nimport { useCachedPage } from "@/hooks/useCachedPage";'
  );
}

// 2. Remove top-level static statusConfig
const oldStaticConfig = `// ─── Status Config ───────────────────────────────────────
const statusConfig: Record<
    ProductionStatus,
    { label: string; color: "orange" | "blue" | "red" | "green"; icon: any }
> = {
    pending: { label: "Pending", color: "orange", icon: Clock },
    running: { label: "Running", color: "blue", icon: Play },
    paused: { label: "Paused", color: "red", icon: Pause },
    completed: { label: "Completed", color: "green", icon: CheckCircle2 },
};`;

code = code.replace(oldStaticConfig, '// Status Config dynamically created inside component with translations');

// 3. Component Start Hooks
const oldCompStart = `export default function ProductionPage() {
    const { progress: collapseProgress } = useCollapseProgress();
    const router = useRouter();`;

const newCompStart = `export default function ProductionPage() {
    const t = useTranslations("production.floor");
    const tStatus = useTranslations("production.statuses");
    const tToast = useTranslations("production.toasts");
    const { locale } = useAppLocale();
    const { progress: collapseProgress } = useCollapseProgress();
    const router = useRouter();

    const statusConfig: Record<
        ProductionStatus,
        { label: string; color: "orange" | "blue" | "red" | "green"; icon: any }
    > = {
        pending: { label: tStatus("pending"), color: "orange", icon: Clock },
        running: { label: tStatus("running"), color: "blue", icon: Play },
        paused: { label: tStatus("paused"), color: "red", icon: Pause },
        completed: { label: tStatus("completed"), color: "green", icon: CheckCircle2 },
    };`;

code = code.replace(oldCompStart, newCompStart);

// 4. Toasts
code = code.replace('toast.error("Failed to fetch productions");', 'toast.error(tToast("fetchFailed"));');
code = code.replace('toast.success("Production closed");', 'toast.success(tToast("productionClosed"));');
code = code.replace('toast.error(json?.error?.message || "Delete failed");', 'toast.error(json?.error?.message || tToast("deleteFailed"));');
code = code.replace('toast.error("Delete failed");', 'toast.error(tToast("deleteFailed"));');

// 5. KPI Cards
code = code.replace('label: "Active Runs",', 'label: t("kpiActiveRuns"),');
code = code.replace('subtitle: `${stats.paused} paused`,', 'subtitle: t("kpiActiveRunsSub", { count: stats.paused }),');
code = code.replace('label: "Pending",', 'label: t("kpiPending"),');
code = code.replace('subtitle: "Awaiting start",', 'subtitle: t("kpiPendingSub"),');
code = code.replace('label: "Completed",', 'label: t("kpiCompleted"),');
code = code.replace('subtitle: "All time",', 'subtitle: t("kpiCompletedSub"),');
code = code.replace('label: "Avg. Efficiency",', 'label: t("kpiAvgEfficiency"),');
code = code.replace('subtitle: "Across batches",', 'subtitle: t("kpiAvgEfficiencySub"),');

// 6. Page Root Container
code = code.replace(
  'className="space-y-4 md:space-y-6"',
  'className="w-full min-w-0 overflow-x-hidden space-y-4 md:space-y-6"'
);

// 7. Collapsing Title
code = code.replace('title="Production Floor"', 'title={t("title")}');
code = code.replace(
  'subtitle={`${stats.running} active runs · ${stats.pending} pending · ${stats.completed} completed`}',
  'subtitle={t("subtitle", { running: stats.running, pending: stats.pending, completed: stats.completed })}'
);

// 8. Search bar
code = code.replace('placeholder="Search by product, batch, client..."', 'placeholder={t("searchPlaceholder")}');
code = code.replace('aria-label="Clear search"', 'aria-label={t("clearSearch")}');

// 9. Create Button
code = code.replace('<span className="hidden sm:inline">Create Production</span>', '<span className="hidden sm:inline">{t("btnCreate")}</span>');
code = code.replace('<span className="sm:hidden">Create</span>', '<span className="sm:hidden">{t("btnCreateShort")}</span>');

// 10. Status Pills
const oldPills = `                            {([
                                { key: "all", label: "All" },
                                { key: "running", label: "Running" },
                                { key: "pending", label: "Pending" },
                                { key: "paused", label: "Paused" },
                                { key: "completed", label: "Completed" },
                            ] as { key: string; label: string }[]).map((item) => (`;

const newPills = `                            {([
                                { key: "all", label: t("filterAll") },
                                { key: "running", label: tStatus("running") },
                                { key: "pending", label: tStatus("pending") },
                                { key: "paused", label: tStatus("paused") },
                                { key: "completed", label: tStatus("completed") },
                            ] as { key: string; label: string }[]).map((item) => (`;

code = code.replace(oldPills, newPills);

// 11. Date Dropdown
code = code.replace('<option value="">All Time</option>', '<option value="">{t("dateAllTime")}</option>');
code = code.replace('<option value="today">Today</option>', '<option value="today">{t("dateToday")}</option>');
code = code.replace('<option value="week">This Week</option>', '<option value="week">{t("dateWeek")}</option>');
code = code.replace('<option value="month">This Month</option>', '<option value="month">{t("dateMonth")}</option>');

// 12. Clear button
code = code.replace(
  `                                    Clear
                                </button>`,
  `                                    {t("btnClear")}
                                </button>`
);

// 13. Result Count
const oldResultCount = `                            {statusFilter !== "all" || dateFilter
                                ? \`Showing \${totalFiltered} of \${productions.length} productions\`
                                : \`\${totalFiltered} of \${productions.length} productions\`
                            }`;

const newResultCount = `                            {statusFilter !== "all" || dateFilter
                                ? t("showingCount", { filtered: totalFiltered, total: productions.length })
                                : t("showingTotal", { filtered: totalFiltered, total: productions.length })
                            }`;

code = code.replace(oldResultCount, newResultCount);

// 14. Table Headers
const oldHeaders = `{["Production", "Status", "Progress", "Machine / Operator", "Order", ""].map((h) => (`;
const newHeaders = `{[t("thProduction"), t("thStatus"), t("thProgress"), t("thMachineOperator"), t("thOrder"), ""].map((h) => (`;

code = code.replace(oldHeaders, newHeaders);

// 15. Empty State
code = code.replace(
  `title={searchQuery ? "No productions match your search" : "No productions found"}`,
  `title={searchQuery ? t("emptySearchTitle") : t("emptyTitle")}`
);
code = code.replace(
  `subtitle={searchQuery || statusFilter !== "all" || dateFilter
                                ? "Try adjusting your filters to find what you're looking for."
                                : "Create your first production to start tracking runs."}`,
  `subtitle={searchQuery || statusFilter !== "all" || dateFilter
                                ? t("emptySearchSubtitle")
                                : t("emptySubtitle")}`
);
code = code.replace(
  `label: "Create First Production",`,
  `label: t("emptyAction"),`
);

// 16. Row Items
code = code.replace(
  `{production.rejectQuantity} rejected`,
  `{t("rejectedCount", { count: production.rejectQuantity })}`
);
code = code.replace(
  `{production.operatorName || "Unassigned"}`,
  `{production.operatorName || t("unassigned")}`
);
code = code.replace(
  `<Eye className="mr-2 h-4 w-4" /> View Details`,
  `<Eye className="mr-2 h-4 w-4" /> {t("actionViewDetails")}`
);
code = code.replace(
  `<Trash2 className="mr-2 h-4 w-4" /> Delete`,
  `<Trash2 className="mr-2 h-4 w-4" /> {t("actionDelete")}`
);

// 17. Delete Sheet
code = code.replace('entityLabel="production job"', 'entityLabel={t("deleteEntityLabel")}');
code = code.replace('consequenceText="will be permanently removed. This cannot be undone."', 'consequenceText={t("deleteConsequence")}');

if (isCrlf) code = code.replace(/\n/g, '\r\n');
fs.writeFileSync(file, code, 'utf8');
console.log('Successfully transformed apps/web/src/app/dashboard/production/page.tsx!');
