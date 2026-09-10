const fs = require('fs');

const file = 'apps/web/src/app/dashboard/production/create/page.tsx';
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

// 2. Remove static top-level steps definition
const oldStaticSteps = `// ─── Step definitions ───────────────────────────────────────────────
const steps = [
    { id: 1, title: "Order Selection", icon: ShoppingCart, description: "Select a confirmed order" },
    { id: 2, title: "Production Setup", icon: Settings, description: "Machine & operator" },
    { id: 3, title: "Materials", icon: Package, description: "Raw materials & stock" },
    { id: 4, title: "Configuration", icon: Sliders, description: "Output targets & schedule" },
];`;

code = code.replace(oldStaticSteps, '// Step definitions dynamically created inside component');

// 3. Component Start Hooks
const oldCompStart = `export default function CreateProductionPage() {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState(1);`;

const newCompStart = `export default function CreateProductionPage() {
    const t = useTranslations("production.create");
    const tToast = useTranslations("production.toasts");
    const { locale } = useAppLocale();
    const dateLocale = locale === "hi" ? "hi-IN" : locale === "gu" ? "gu-IN" : locale === "mr" ? "mr-IN" : "en-IN";
    const router = useRouter();

    const steps = [
        { id: 1, title: t("stepOrder"), icon: ShoppingCart, description: t("stepOrderDesc") },
        { id: 2, title: t("stepSetup"), icon: Settings, description: t("stepSetupDesc") },
        { id: 3, title: t("stepMaterials"), icon: Package, description: t("stepMaterialsDesc") },
        { id: 4, title: t("lblConfig"), icon: Sliders, description: t("lblConfigDesc") },
    ];

    const [currentStep, setCurrentStep] = useState(1);`;

code = code.replace(oldCompStart, newCompStart);

// 4. Toasts
code = code.replace('toast.error("Failed to load data");', 'toast.error(tToast("loadDataFailed"));');
code = code.replace('toast.success("Production created successfully!");', 'toast.success(tToast("createSuccess"));');
code = code.replace('toast.error("Failed to create production");', 'toast.error(tToast("createFailed"));');

// 5. Layout containment
code = code.replace(
  'className="flex flex-col min-h-full pb-28"',
  'className="w-full min-w-0 overflow-x-hidden flex flex-col min-h-full pb-28"'
);

// 6. Breadcrumb & Page Title
code = code.replace(
  `                    Production\n                </button>\n                <ChevronRight className="h-3.5 w-3.5" />\n                <span className="text-foreground font-medium">Create Production</span>`,
  `                    {t("breadcrumbProduction")}\n                </button>\n                <ChevronRight className="h-3.5 w-3.5" />\n                <span className="text-foreground font-medium">{t("breadcrumbCreate")}</span>`
);
code = code.replace(
  `<h1 className="text-2xl font-bold tracking-tight">New Production Run</h1>`,
  `<h1 className="text-2xl font-bold tracking-tight">{t("pageTitle")}</h1>`
);
code = code.replace(
  `Step {currentStep} of {steps.length}`,
  `{t("stepCounter", { current: currentStep, total: steps.length })}`
);

// 7. Step 1 (Order Selection)
code = code.replace(
  `<h2 className="text-lg font-bold mb-1">Select Order</h2>\n                                    <p className="text-sm text-muted-foreground">\n                                        Choose a confirmed order to start production for.\n                                    </p>`,
  `<h2 className="text-lg font-bold mb-1">{t("stepOrder")}</h2>\n                                    <p className="text-sm text-muted-foreground">\n                                        {t("stepOrderDesc")}\n                                    </p>`
);
code = code.replace(
  `placeholder="Search orders by product or client..."`,
  `placeholder={t("searchOrdersPlaceholder")}`
);
code = code.replace(
  `<SelectValue placeholder="All Statuses" />`,
  `<SelectValue placeholder={t("filterAllStatuses")} />`
);
code = code.replace(
  `<SelectItem value="all">All Statuses</SelectItem>`,
  `<SelectItem value="all">{t("filterAllStatuses")}</SelectItem>`
);
code = code.replace(
  `<SelectItem value="pending">Pending</SelectItem>`,
  `<SelectItem value="pending">{t("orderStatusPending")}</SelectItem>`
);
code = code.replace(
  `<SelectItem value="confirmed">Confirmed</SelectItem>`,
  `<SelectItem value="confirmed">{t("orderStatusConfirmed")}</SelectItem>`
);
code = code.replace(
  `<SelectItem value="processing">In Production</SelectItem>`,
  `<SelectItem value="processing">{t("orderStatusInProduction")}</SelectItem>`
);
code = code.replace(
  `<h3 className="font-semibold mb-1">No confirmed orders</h3>\n                                        <p className="text-sm text-muted-foreground">\n                                            Create an order first, then come back to start production.\n                                        </p>`,
  `<h3 className="font-semibold mb-1">{t("noConfirmedOrdersTitle")}</h3>\n                                        <p className="text-sm text-muted-foreground">\n                                            {t("noConfirmedOrdersDesc")}\n                                        </p>`
);
code = code.replace(
  `<h3 className="font-semibold mb-1">No matching orders</h3>\n                                        <p className="text-sm text-muted-foreground">\n                                            Try adjusting your search or filter.\n                                        </p>`,
  `<h3 className="font-semibold mb-1">{t("noMatchingOrdersTitle")}</h3>\n                                        <p className="text-sm text-muted-foreground">\n                                            {t("noMatchingOrdersDesc")}\n                                        </p>`
);

// 8. Step 2 (Production Setup)
code = code.replace(
  `<h2 className="text-lg font-bold mb-1">Production Setup</h2>\n                                    <p className="text-sm text-muted-foreground">\n                                        Assign machines and operators for this production run.\n                                    </p>`,
  `<h2 className="text-lg font-bold mb-1">{t("stepSetup")}</h2>\n                                    <p className="text-sm text-muted-foreground">\n                                        {t("stepSetupDesc")}\n                                    </p>`
);
code = code.replace(
  `{selectedOrder.quantity} units`,
  `{t("orderQtyUnits", { qty: selectedOrder.quantity })}`
);
code = code.replace(
  `<Cpu className="h-3.5 w-3.5" />\n                                            Assign Machines`,
  `<Cpu className="h-3.5 w-3.5" />\n                                            {t("lblMachine")}`
);
code = code.replace(
  `<Plus className="h-3 w-3" />\n                                            Add Machine`,
  `<Plus className="h-3 w-3" />\n                                            {t("btnAddMachine")}`
);
code = code.replace(
  `<p className="text-xs text-amber-700 dark:text-amber-400 font-semibold">No machines found</p>\n                                            <p className="text-[10px] text-muted-foreground mt-1">Admin must add machines in Machine Management first.</p>`,
  `<p className="text-xs text-amber-700 dark:text-amber-400 font-semibold">{t("noMachinesTitle")}</p>\n                                            <p className="text-[10px] text-muted-foreground mt-1">{t("noMachinesDesc")}</p>`
);
code = code.replace(
  `placeholder="Select machine..."`,
  `placeholder={t("placeholderSelectMachine")}`
);
code = code.replace(
  `<User className="h-3.5 w-3.5" />\n                                            Assign Operators`,
  `<User className="h-3.5 w-3.5" />\n                                            {t("lblOperator")}`
);
code = code.replace(
  `<Plus className="h-3 w-3" />\n                                            Add Operator`,
  `<Plus className="h-3 w-3" />\n                                            {t("btnAddOperator")}`
);
code = code.replace(
  `<p className="text-xs text-amber-700 dark:text-amber-400 font-semibold">No staff found</p>\n                                            <p className="text-[10px] text-muted-foreground mt-1">Admin must add staff members first.</p>`,
  `<p className="text-xs text-amber-700 dark:text-amber-400 font-semibold">{t("noStaffTitle")}</p>\n                                            <p className="text-[10px] text-muted-foreground mt-1">{t("noStaffDesc")}</p>`
);
code = code.replace(
  `placeholder="Select operator..."`,
  `placeholder={t("placeholderSelectOperator")}`
);

// 9. Step 4 (Configuration)
code = code.replace(
  `<h2 className="text-lg font-bold mb-1">\n                                        Production Configuration\n                                    </h2>\n                                    <p className="text-sm text-muted-foreground">\n                                        Set targets, schedule, and shift details.\n                                    </p>`,
  `<h2 className="text-lg font-bold mb-1">\n                                        {t("lblConfig")}\n                                    </h2>\n                                    <p className="text-sm text-muted-foreground">\n                                        {t("lblConfigDesc")}\n                                    </p>`
);
code = code.replace(
  `Expected Output (Units)\n                                        </Label>`,
  `{t("lblExpectedOutput")}\n                                        </Label>`
);
code = code.replace(
  `Order requires {selectedOrder.quantity} units`,
  `{t("summaryOrderRequires", { qty: selectedOrder.quantity })}`
);
code = code.replace(
  `<Clock className="h-3.5 w-3.5" />\n                                            Start Time`,
  `<Clock className="h-3.5 w-3.5" />\n                                            {t("lblStartDate")}`
);
code = code.replace(
  `Shift\n                                        </Label>`,
  `{t("lblShift")}\n                                        </Label>`
);
code = code.replace(
  `Morning (6 AM — 2 PM)`,
  `{t("shiftMorning")}`
);
code = code.replace(
  `Afternoon (2 PM — 10 PM)`,
  `{t("shiftAfternoon")}`
);
code = code.replace(
  `Night (10 PM — 6 AM)`,
  `{t("shiftNight")}`
);
code = code.replace(
  `<Calendar className="h-3.5 w-3.5" />\n                                            Target Completion`,
  `<Calendar className="h-3.5 w-3.5" />\n                                            {t("lblTargetCompletion")}`
);
code = code.replace(
  `Labour Cost (INR)\n                                        </Label>`,
  `{t("lblLabourCost")}\n                                        </Label>`
);
code = code.replace(
  `Overhead (INR)\n                                        </Label>`,
  `{t("lblOverheadCost")}\n                                        </Label>`
);
code = code.replace(
  `Sale Value (INR)\n                                        </Label>`,
  `{t("lblSaleValue")}\n                                        </Label>`
);
code = code.replace(
  `Production Notes (Optional)\n                                    </Label>`,
  `{t("lblNotes")}\n                                    </Label>`
);
code = code.replace(
  `placeholder="Special instructions, quality requirements, etc..."`,
  `placeholder={t("placeholderNotes")}`
);

// 10. Cost & Profit Summary
code = code.replace(
  `Cost & Profit Summary\n                                        </span>`,
  `{t("costSummaryTitle")}\n                                        </span>`
);
code = code.replace(
  `{ label: 'Material cost', value: materialCost },\n                                        { label: 'Labour cost', value: labourCost },\n                                        { label: 'Overhead', value: overhead },`,
  `{ label: t("costMaterial"), value: materialCost },\n                                        { label: t("costLabour"), value: labourCost },\n                                        { label: t("costOverhead"), value: overhead },`
);
code = code.replace(
  `<span style={{ fontSize: '12px', color: 'hsl(var(--muted-foreground))' }}>Total cost</span>`,
  `<span style={{ fontSize: '12px', color: 'hsl(var(--muted-foreground))' }}>{t("costTotal")}</span>`
);
code = code.replace(
  `<span style={{ fontSize: '12px', color: 'hsl(var(--muted-foreground))' }}>Sale value</span>`,
  `<span style={{ fontSize: '12px', color: 'hsl(var(--muted-foreground))' }}>{t("costSale")}</span>`
);
code = code.replace(
  `<span style={{ fontSize: '11px', color: 'hsl(var(--muted-foreground))' }}>Net margin</span>`,
  `<span style={{ fontSize: '11px', color: 'hsl(var(--muted-foreground))' }}>{t("costMargin")}</span>`
);
code = code.replace(
  `Production Summary\n                                    </h3>`,
  `{t("secProductionSummary")}\n                                    </h3>`
);

// 11. Navigation Buttons
code = code.replace(
  `{currentStep === 1 ? "Cancel" : "Back"}`,
  `{currentStep === 1 ? t("btnCancel") : t("btnBack")}`
);
code = code.replace(
  `Next Step\n                                    <ChevronRight className="h-4 w-4" />`,
  `{t("btnNextStep")}\n                                    <ChevronRight className="h-4 w-4" />`
);
code = code.replace(
  `{submitting ? "Launching..." : "Launch Production"}`,
  `{submitting ? t("btnLaunching") : t("btnLaunch")}`
);

if (isCrlf) code = code.replace(/\n/g, '\r\n');
fs.writeFileSync(file, code, 'utf8');
console.log('Successfully transformed apps/web/src/app/dashboard/production/create/page.tsx!');
