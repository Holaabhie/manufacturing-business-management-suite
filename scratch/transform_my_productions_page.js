const fs = require('fs');

const file = 'apps/web/src/app/dashboard/production/my-productions/page.tsx';
let raw = fs.readFileSync(file, 'utf8');
const isCrlf = raw.includes('\r\n');
let code = raw.replace(/\r\n/g, '\n');

// 1. Imports
if (!code.includes('useTranslations')) {
  code = code.replace(
    'import { useRouter } from "next/navigation";',
    'import { useRouter } from "next/navigation";\nimport { useTranslations } from "next-intl";\nimport { useAppLocale } from "@/components/LocaleProvider";'
  );
}

// 2. Remove static statusConfig
const oldStaticConfig = `// ─── Status config ──────────────────────────────────────────────────
const statusConfig: Record<
    string,
    { label: string; color: string; bgColor: string; borderColor: string; icon: any }
> = {
    pending: {
        label: "Pending",
        color: "text-amber-600 dark:text-amber-400",
        bgColor: "bg-amber-500/10",
        borderColor: "border-amber-500/20",
        icon: Clock,
    },
    running: {
        label: "Running",
        color: "text-blue-600 dark:text-blue-400",
        bgColor: "bg-blue-500/10",
        borderColor: "border-blue-500/20",
        icon: Play,
    },
    paused: {
        label: "Paused",
        color: "text-orange-600 dark:text-orange-400",
        bgColor: "bg-orange-500/10",
        borderColor: "border-orange-500/20",
        icon: Pause,
    },
    completed: {
        label: "Completed",
        color: "text-green-600 dark:text-green-400",
        bgColor: "bg-green-500/10",
        borderColor: "border-green-500/20",
        icon: CheckCircle2,
    },
};`;

code = code.replace(oldStaticConfig, '// Status Config dynamically initialized inside component');

// 3. Component start
const oldCompStart = `export default function MyProductionsPage() {
    const router = useRouter();`;

const newCompStart = `export default function MyProductionsPage() {
    const t = useTranslations("production.myProductions");
    const tFloor = useTranslations("production.floor");
    const tStatus = useTranslations("production.statuses");
    const tToast = useTranslations("production.toasts");
    const { locale } = useAppLocale();
    const router = useRouter();

    const statusConfig: Record<
        string,
        { label: string; color: string; bgColor: string; borderColor: string; icon: any }
    > = {
        pending: {
            label: tStatus("pending"),
            color: "text-amber-600 dark:text-amber-400",
            bgColor: "bg-amber-500/10",
            borderColor: "border-amber-500/20",
            icon: Clock,
        },
        running: {
            label: tStatus("running"),
            color: "text-blue-600 dark:text-blue-400",
            bgColor: "bg-blue-500/10",
            borderColor: "border-blue-500/20",
            icon: Play,
        },
        paused: {
            label: tStatus("paused"),
            color: "text-orange-600 dark:text-orange-400",
            bgColor: "bg-orange-500/10",
            borderColor: "border-orange-500/20",
            icon: Pause,
        },
        completed: {
            label: tStatus("completed"),
            color: "text-green-600 dark:text-green-400",
            bgColor: "bg-green-500/10",
            borderColor: "border-green-500/20",
            icon: CheckCircle2,
        },
    };`;

code = code.replace(oldCompStart, newCompStart);

// 4. API Error / Toasts
code = code.replace(
  `setError("You don't have access to view productions.");`,
  `setError(t("accessDenied"));`
);
code = code.replace(
  `throw new Error("Failed to load productions");`,
  `throw new Error(tToast("loadProductionFailed"));`
);
code = code.replace(
  `toast.error("Failed to load productions");`,
  `toast.error(tToast("loadProductionFailed"));`
);

// 5. Retry Button
code = code.replace(
  `                    Retry
                </Button>`,
  `                    {t("btnRetry")}
                </Button>`
);

// 6. Empty State
code = code.replace(
  `<h1 className="text-[24px] font-semibold text-foreground leading-tight">\n                        My Productions\n                    </h1>`,
  `<h1 className="text-[24px] font-semibold text-foreground leading-tight">\n                        {t("title")}\n                    </h1>`
);
code = code.replace(
  `<p className="text-[14px] text-muted-foreground flex items-center gap-2">\n                        <Activity className="h-4 w-4 text-primary" />\n                        Productions assigned to you\n                    </p>`,
  `<p className="text-[14px] text-muted-foreground flex items-center gap-2">\n                        <Activity className="h-4 w-4 text-primary" />\n                        {t("subtitle")}\n                    </p>`
);
code = code.replace(
  `<p className="text-[16px] font-semibold text-foreground">\n                        No productions assigned to you yet\n                    </p>`,
  `<p className="text-[16px] font-semibold text-foreground">\n                        {t("emptyTitle")}\n                    </p>`
);
code = code.replace(
  `<p className="text-[13px] text-muted-foreground text-center max-w-sm">\n                        Contact your admin if you believe this is a mistake. Productions will appear here once you are assigned.\n                    </p>`,
  `<p className="text-[13px] text-muted-foreground text-center max-w-sm">\n                        {t("emptyDesc")}\n                    </p>`
);

// 7. Main List Header
code = code.replace(
  `<h1 className="text-[24px] font-semibold text-foreground leading-tight">\n                        My Productions\n                    </h1>`,
  `<h1 className="text-[24px] font-semibold text-foreground leading-tight">\n                        {t("title")}\n                    </h1>`
);
code = code.replace(
  `<p className="text-[14px] text-muted-foreground flex items-center gap-2">\n                        <Activity className="h-4 w-4 text-primary" />\n                        {total} production{total !== 1 ? "s" : ""} assigned to you\n                    </p>`,
  `<p className="text-[14px] text-muted-foreground flex items-center gap-2">\n                        <Activity className="h-4 w-4 text-primary" />\n                        {t("assignedCount", { count: total })}\n                    </p>`
);

// 8. Rejected & Shift
code = code.replace(
  `{production.rejectQuantity} rejected`,
  `{tFloor("rejectedCount", { count: production.rejectQuantity })}`
);
code = code.replace(
  `<span className="capitalize">\n                                    {production.shift} shift\n                                </span>`,
  `<span className="capitalize">\n                                    {t("shiftSuffix", { shift: production.shift })}\n                                </span>`
);

// 9. Pagination
code = code.replace(
  `                        Previous
                    </Button>`,
  `                        {t("btnPrev")}
                    </Button>`
);
code = code.replace(
  `Page {page} of {totalPages}`,
  `{t("pageOf", { current: page, total: totalPages })}`
);
code = code.replace(
  `                        Next
                    </Button>`,
  `                        {t("btnNext")}
                    </Button>`
);

// 10. Layout containment
code = code.replace(
  'className="space-y-6 pb-28"',
  'className="w-full min-w-0 overflow-x-hidden space-y-6 pb-28"'
);

if (isCrlf) code = code.replace(/\n/g, '\r\n');
fs.writeFileSync(file, code, 'utf8');
console.log('Successfully transformed apps/web/src/app/dashboard/production/my-productions/page.tsx!');
