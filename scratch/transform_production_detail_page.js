const fs = require('fs');

const file = 'apps/web/src/app/dashboard/production/[id]/page.tsx';
let raw = fs.readFileSync(file, 'utf8');
const isCrlf = raw.includes('\r\n');
let code = raw.replace(/\r\n/g, '\n');

// 1. Imports
if (!code.includes('useTranslations')) {
  code = code.replace(
    'import { useRouter, useParams } from "next/navigation";',
    'import { useRouter, useParams } from "next/navigation";\nimport { useTranslations } from "next-intl";\nimport { useAppLocale } from "@/components/LocaleProvider";'
  );
}

// 2. Remove static top-level statusConfig
const oldStaticConfig = `// ─── Status config ──────────────────────────────────────────────────
const statusConfig: Record<
    ProductionStatus,
    { label: string; color: string; bgColor: string; borderColor: string; icon: any }
> = {
    pending: {
        label: "Pending",
        color: "text-amber-500",
        bgColor: "bg-amber-500/10",
        borderColor: "border-amber-500/20",
        icon: Clock,
    },
    running: {
        label: "Running",
        color: "text-blue-500",
        bgColor: "bg-blue-500/10",
        borderColor: "border-blue-500/20",
        icon: Play,
    },
    paused: {
        label: "Paused",
        color: "text-orange-500",
        bgColor: "bg-orange-500/10",
        borderColor: "border-orange-500/20",
        icon: Pause,
    },
    completed: {
        label: "Completed",
        color: "text-emerald-500",
        bgColor: "bg-emerald-500/10",
        borderColor: "border-emerald-500/20",
        icon: CheckCircle2,
    },
};`;

code = code.replace(oldStaticConfig, '// Status Config dynamically initialized inside component');

// 3. Component start
const oldCompStart = `export default function ProductionDetailPage() {
    const router = useRouter();`;

const newCompStart = `export default function ProductionDetailPage() {
    const t = useTranslations("production.detail");
    const tStatus = useTranslations("production.statuses");
    const tToast = useTranslations("production.toasts");
    const { locale } = useAppLocale();
    const dateLocale = locale === "hi" ? "hi-IN" : locale === "gu" ? "gu-IN" : locale === "mr" ? "mr-IN" : "en-IN";
    const router = useRouter();

    const statusConfig: Record<
        ProductionStatus,
        { label: string; color: string; bgColor: string; borderColor: string; icon: any }
    > = {
        pending: {
            label: tStatus("pending"),
            color: "text-amber-500",
            bgColor: "bg-amber-500/10",
            borderColor: "border-amber-500/20",
            icon: Clock,
        },
        running: {
            label: tStatus("running"),
            color: "text-blue-500",
            bgColor: "bg-blue-500/10",
            borderColor: "border-blue-500/20",
            icon: Play,
        },
        paused: {
            label: tStatus("paused"),
            color: "text-orange-500",
            bgColor: "bg-orange-500/10",
            borderColor: "border-orange-500/20",
            icon: Pause,
        },
        completed: {
            label: tStatus("completed"),
            color: "text-emerald-500",
            bgColor: "bg-emerald-500/10",
            borderColor: "border-emerald-500/20",
            icon: CheckCircle2,
        },
    };`;

code = code.replace(oldCompStart, newCompStart);

// 4. Toasts
code = code.replace('toast.error("Production not found");', 'toast.error(tToast("productionNotFound"));');
code = code.replace('toast.error("Failed to load production");', 'toast.error(tToast("loadProductionFailed"));');
code = code.replace('toast.error("Action failed");', 'toast.error(tToast("actionFailed"));');
code = code.replace('toast.success("Production batch completed successfully! 🎉");', 'toast.success(tToast("completedSuccess"));');
code = code.replace('toast.success("Progress updated!");', 'toast.success(tToast("progressUpdated"));');
code = code.replace('toast.error("Failed to update progress");', 'toast.error(tToast("progressUpdateFailed"));');

// 5. Error & Not Found Views
code = code.replace(
  `<p className="text-[15px] font-semibold">Failed to load production</p>\n                <p className="text-[13px] text-muted-foreground text-center">\n                    Check your connection and try again.\n                </p>`,
  `<p className="text-[15px] font-semibold">{t("notFoundTitle")}</p>\n                <p className="text-[13px] text-muted-foreground text-center">\n                    {t("notFoundDesc")}\n                </p>`
);
code = code.replace(
  `                    Retry\n                </Button>`,
  `                    {t("btnRetry")}\n                </Button>`
);
code = code.replace(
  `<h2 className="text-xl font-bold mb-2">Production Not Found</h2>`,
  `<h2 className="text-xl font-bold mb-2">{t("notFoundTitle")}</h2>`
);
code = code.replace(
  `<ArrowLeft className="h-4 w-4" />\n                    Back to Productions`,
  `<ArrowLeft className="h-4 w-4" />\n                    {t("btnBackToProductions")}`
);

// 6. Layout containment
code = code.replace(
  'className="space-y-6 pb-28"',
  'className="w-full min-w-0 overflow-x-hidden space-y-6 pb-28"'
);

// 7. Breadcrumb
code = code.replace(
  `                    Production\n                </button>\n                <ChevronRight className="h-3.5 w-3.5" />`,
  `                    {t("breadcrumbProduction")}\n                </button>\n                <ChevronRight className="h-3.5 w-3.5" />`
);

// 8. Shift
code = code.replace(
  `<span className="capitalize">{production.shift} shift</span>`,
  `<span className="capitalize">{t("shiftSuffix", { shift: production.shift })}</span>`
);

// 9. Action Buttons
code = code.replace(
  `<Play className="h-4 w-4" />\n                            Start Production`,
  `<Play className="h-4 w-4" />\n                            {t("btnStart")}`
);
code = code.replace(
  `<Pause className="h-4 w-4" />\n                            Pause`,
  `<Pause className="h-4 w-4" />\n                            {t("btnPause")}`
);
code = code.replace(
  `<Play className="h-4 w-4" />\n                            Resume`,
  `<Play className="h-4 w-4" />\n                            {t("btnResume")}`
);
code = code.replace(
  `<CheckCircle2 className="h-4 w-4" />\n                            Complete Batch`,
  `<CheckCircle2 className="h-4 w-4" />\n                            {t("btnComplete")}`
);
code = code.replace(
  `<Edit3 className="h-4 w-4" />\n                        Edit Production`,
  `<Edit3 className="h-4 w-4" />\n                        {t("btnEdit")}`
);
code = code.replace(
  `<Users className="h-4 w-4" />\n                        Assign Staff`,
  `<Users className="h-4 w-4" />\n                        {t("btnAssignStaff")}`
);

// 10. Progress card
code = code.replace(
  `<h3 className="font-bold text-lg mb-1">Production Complete</h3>`,
  `<h3 className="font-bold text-lg mb-1">{t("completionComplete")}</h3>`
);
code = code.replace(
  `<h3 className="font-bold text-lg mb-1">Production Summary</h3>`,
  `<h3 className="font-bold text-lg mb-1">{t("completionSummary")}</h3>`
);
code = code.replace(
  `<h3 className="text-lg font-bold mb-1">Update Output</h3>`,
  `<h3 className="text-lg font-bold mb-1">{t("updateOutputTitle")}</h3>`
);
code = code.replace(
  `Good Units Produced\n                                            </Label>`,
  `{t("lblGoodUnits")}\n                                            </Label>`
);
code = code.replace(
  `Rejected / Defect Units\n                                            </Label>`,
  `{t("lblRejectUnits")}\n                                            </Label>`
);
code = code.replace(
  `                                                Updating...\n                                            </>`,
  `                                                {t("updatingProgress")}\n                                            </>`
);
code = code.replace(
  `                                            "Update Progress"\n                                        )}`,
  `                                            t("btnUpdateProgress")\n                                        )}`
);

// 11. Detail Cards
code = code.replace(
  `Batch Information\n                    </h3>`,
  `{t("secBatchInfo")}\n                    </h3>`
);
code = code.replace(
  `label="Batch Number"`,
  `label={t("lblBatchNumber")}`
);
code = code.replace(
  `label="Order Reference"`,
  `label={t("lblOrder")}`
);
code = code.replace(
  `label="Client"`,
  `label={t("lblClient")}`
);
code = code.replace(
  `label="Created On"`,
  `label={t("lblCreated")}`
);
code = code.replace(
  `label="Start Time"`,
  `label={t("lblStartTime")}`
);
code = code.replace(
  `label="Target Completion"`,
  `label={t("lblTargetCompletion")}`
);

code = code.replace(
  `Assigned Resources\n                    </h3>`,
  `{t("secResources")}\n                    </h3>`
);
code = code.replace(
  `label="Machine"`,
  `label={t("lblMachine")}`
);
code = code.replace(
  `label="Primary Operator"`,
  `label={t("lblOperator")}`
);
code = code.replace(
  `label="Shift"`,
  `label={t("lblShift")}`
);

code = code.replace(
  `Assigned Staff ({production.assignedStaff?.length || 0})`,
  `{t("secStaff", { count: production.assignedStaff?.length || 0 })}`
);
code = code.replace(
  `<p className="text-sm text-muted-foreground">No staff assigned yet</p>`,
  `<p className="text-sm text-muted-foreground">{t("noStaffAssigned")}</p>`
);

code = code.replace(
  `Materials Used\n                </h3>`,
  `{t("secMaterials")}\n                </h3>`
);
code = code.replace(
  `<p className="text-sm text-muted-foreground">No materials recorded for this run</p>`,
  `<p className="text-sm text-muted-foreground">{t("noMaterialsRecorded")}</p>`
);
code = code.replace(
  `<span>Material</span>`,
  `<span>{t("thMaterial")}</span>`
);
code = code.replace(
  `<span>Allocated</span>`,
  `<span>{t("thAllocated")}</span>`
);
code = code.replace(
  `<span>Unit</span>`,
  `<span>{t("thUnit")}</span>`
);

// 12. Pause & Complete Dialogs
code = code.replace(
  `<Pause className="h-4 w-4 text-orange-500" />\n                        Pause Production`,
  `<Pause className="h-4 w-4 text-orange-500" />\n                        {t("pauseModalTitle")}`
);
code = code.replace(
  `<DialogDescription className="text-[13px]">\n                        Are you sure you want to pause this production batch?`,
  `<DialogDescription className="text-[13px]">\n                        {t("pauseModalDesc")}`
);
code = code.replace(
  `Cancel\n                        </Button>\n                        <Button\n                            className="rounded-xl bg-orange-600 hover:bg-orange-700 text-white"\n                            onClick={handlePauseConfirm}\n                        >\n                            Pause Production`,
  `{t("btnCancel")}\n                        </Button>\n                        <Button\n                            className="rounded-xl bg-orange-600 hover:bg-orange-700 text-white"\n                            onClick={handlePauseConfirm}\n                        >\n                            {t("btnConfirmPause")}`
);

code = code.replace(
  `<CheckCircle2 className="h-4 w-4 text-emerald-500" />\n                        Complete Production`,
  `<CheckCircle2 className="h-4 w-4 text-emerald-500" />\n                        {t("completeModalTitle")}`
);
code = code.replace(
  `<DialogDescription className="text-[13px]">\n                        Mark this production run as completed? This will lock the batch output.`,
  `<DialogDescription className="text-[13px]">\n                        {t("completeModalDesc")}`
);
code = code.replace(
  `Cancel\n                        </Button>\n                        <Button\n                            className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"\n                            onClick={handleCompleteConfirm}\n                        >\n                            Complete Production`,
  `{t("btnCancel")}\n                        </Button>\n                        <Button\n                            className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"\n                            onClick={handleCompleteConfirm}\n                        >\n                            {t("btnConfirmComplete")}`
);

if (isCrlf) code = code.replace(/\n/g, '\r\n');
fs.writeFileSync(file, code, 'utf8');
console.log('Successfully transformed apps/web/src/app/dashboard/production/[id]/page.tsx!');
