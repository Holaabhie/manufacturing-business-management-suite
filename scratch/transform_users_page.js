const fs = require('fs');
const file = 'apps/web/src/app/dashboard/users/page.tsx';
let raw = fs.readFileSync(file, 'utf8');
const isCrlf = raw.includes('\r\n');
let code = raw.replace(/\r\n/g, '\n');

// 1. Imports
if (!code.includes('useAppLocale')) {
  code = code.replace(
    'import { useTranslations } from "next-intl";',
    'import { useTranslations } from "next-intl";\nimport { useAppLocale } from "@/components/LocaleProvider";'
  );
}

// 2. StatusBadge localization
const oldStatusBadge = `function StatusBadge({ status }: { status: string }) {
    const config: Record<string, { label: string; classes: string; icon: any }> = {
        active: {
            label: "Active",
            classes: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-800 dark:text-emerald-400",
            icon: Check,
        },
        inactive: {
            label: "Disabled",
            classes: "border-red-200 bg-red-50 text-red-700 dark:bg-red-950/20 dark:border-red-800 dark:text-red-400",
            icon: PowerOff,
        },
        suspended: {
            label: "Suspended",
            classes: "border-amber-200 bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:border-amber-800 dark:text-amber-400",
            icon: AlertTriangle,
        },
        pending_setup: {
            label: "Pending Setup",
            classes: "border-blue-200 bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:border-blue-800 dark:text-blue-400",
            icon: Clock,
        },
    };`;

const newStatusBadge = `function StatusBadge({ status }: { status: string }) {
    const t = useTranslations("users");
    const config: Record<string, { label: string; classes: string; icon: any }> = {
        active: {
            label: t("statusActive"),
            classes: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-800 dark:text-emerald-400",
            icon: Check,
        },
        inactive: {
            label: t("statusInactive"),
            classes: "border-red-200 bg-red-50 text-red-700 dark:bg-red-950/20 dark:border-red-800 dark:text-red-400",
            icon: PowerOff,
        },
        suspended: {
            label: t("statusSuspended"),
            classes: "border-amber-200 bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:border-amber-800 dark:text-amber-400",
            icon: AlertTriangle,
        },
        pending_setup: {
            label: t("statusPendingSetup"),
            classes: "border-blue-200 bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:border-blue-800 dark:text-blue-400",
            icon: Clock,
        },
    };`;

code = code.replace(oldStatusBadge, newStatusBadge);

// 3. Inside UsersPage component hook wiring
const oldComponentStart = `export default function EmployeeManagementPage() {
    const tCommon = useTranslations("common");
    const router = useRouter();`;

const newComponentStart = `export default function EmployeeManagementPage() {
    const t = useTranslations("users");
    const tCommon = useTranslations("common");
    const router = useRouter();
    const { locale } = useAppLocale();
    const dateLocale = locale === "hi" ? "hi-IN" : locale === "gu" ? "gu-IN" : locale === "mr" ? "mr-IN" : "en-IN";
    const getTemplateLabel = (key: string) => t(\`templates.\${key}\` as any) || TEMPLATE_LABELS[key] || key;
    const getDepartmentLabel = (key: string) => t(\`departments.\${key}\` as any) || key;`;

code = code.replace(oldComponentStart, newComponentStart);

// 4. Toasts
code = code.replace(`sonnerToast.error("Failed to load employee data");`, `sonnerToast.error(t("toasts.loadFailed"));`);
code = code.replace(`sonnerToast.error("Employee name is required");`, `sonnerToast.error(t("toasts.nameRequired"));`);
code = code.replace(`sonnerToast.error("Email is required for staff accounts");`, `sonnerToast.error(t("toasts.emailRequired"));`);
code = code.replace(`sonnerToast.error("Password is required");`, `sonnerToast.error(t("toasts.passwordRequired"));`);
code = code.replace(`sonnerToast.error("Password must be at least 8 characters");`, `sonnerToast.error(t("toasts.passwordMin"));`);
code = code.replace(`sonnerToast.error("Password must contain an uppercase letter");`, `sonnerToast.error(t("toasts.passwordUpper"));`);
code = code.replace(`sonnerToast.error("Password must contain a lowercase letter");`, `sonnerToast.error(t("toasts.passwordLower"));`);
code = code.replace(`sonnerToast.error("Password must contain a number");`, `sonnerToast.error(t("toasts.passwordNumber"));`);
code = code.replace(`sonnerToast.error("Passwords do not match");`, `sonnerToast.error(t("toasts.passwordMismatch"));`);
code = code.replace(`sonnerToast.success("Password reset successfully");`, `sonnerToast.success(t("toasts.passwordReset"));`);
code = code.replace(`sonnerToast.error("Password must be at least 8 characters");`, `sonnerToast.error(t("toasts.passwordMin"));`);
code = code.replace(`sonnerToast.error("Password must contain an uppercase letter");`, `sonnerToast.error(t("toasts.passwordUpper"));`);
code = code.replace(`sonnerToast.error("Password must contain a lowercase letter");`, `sonnerToast.error(t("toasts.passwordLower"));`);
code = code.replace(`sonnerToast.error("Password must contain a number");`, `sonnerToast.error(t("toasts.passwordNumber"));`);
code = code.replace(`sonnerToast.error("Passwords do not match");`, `sonnerToast.error(t("toasts.passwordMismatch"));`);
code = code.replace(`sonnerToast.success("Staff Excel downloaded!");`, `sonnerToast.success(t("toasts.excelExported"));`);

// 5. Loading Guard
code = code.replace(
  `<p className="text-sm text-muted-foreground">Loading employee management...</p>`,
  `<p className="text-sm text-muted-foreground">{t("loadingEmployees")}</p>`
);

// 6. Legacy warning banner
code = code.replace(
  `<p className="text-[14px] font-semibold text-amber-500 dark:text-amber-400">Legacy Staff Accounts Detected</p>`,
  `<p className="text-[14px] font-semibold text-amber-500 dark:text-amber-400">{t("legacyWarningTitle")}</p>`
);

code = code.replace(
  `                                {employees.filter(e => e.email?.endsWith("@staff.local") || !e.email).length} staff account(s) are missing email addresses and use legacy Employee ID login.\n                                Update their profiles with a real email for secure authentication.`,
  `                                {t("legacyWarningDesc", { count: employees.filter(e => e.email?.endsWith("@staff.local") || !e.email).length })}`
);

// 7. Header
code = code.replace(
  `<span className="truncate">Employee Management</span>`,
  `<span className="truncate">{t("title")}</span>`
);

code = code.replace(
  `<p className="text-[13px] text-[var(--muted-foreground)] mt-1.5 break-words">Create, manage, and monitor your workforce.</p>`,
  `<p className="text-[13px] text-[var(--muted-foreground)] mt-1.5 break-words">{t("subtitle")}</p>`
);

code = code.replace(
  `title="Excel Export"`,
  `title={t("btnExportTitle")}`
);

code = code.replace(
  `<span>Export</span>`,
  `<span>{t("btnExport")}</span>`
);

code = code.replace(
  `<Plus className="h-4 w-4 mr-1.5" />\n                            Add Employee`,
  `<Plus className="h-4 w-4 mr-1.5" />\n                            {t("btnAddEmployee")}`
);

// 8. KPI Widgets
code = code.replace(`label="Total Staff"`, `label={t("kpiTotalStaff")}`);
code = code.replace(`label="Active"`, `label={t("kpiActive")}`);
code = code.replace(`label="Disabled"`, `label={t("kpiDisabled")}`);
code = code.replace(`label="Pending Setup"`, `label={t("kpiPendingSetup")}`);

// 9. Toolbar & Filters
code = code.replace(
  `placeholder="Search by name, ID, email, dept..."`,
  `placeholder={t("searchPlaceholder")}`
);

code = code.replace(
  `label={<div className="flex items-center gap-1.5"><Filter className="h-3.5 w-3.5" /> Status</div>}`,
  `label={<div className="flex items-center gap-1.5"><Filter className="h-3.5 w-3.5" /> {t("statusFilter")}</div>}`
);

code = code.replace(
  `options={[\n                                    { value: "all", label: "All Status" },\n                                    { value: "active", label: "Active" },\n                                    { value: "inactive", label: "Disabled" },\n                                    { value: "pending_setup", label: "Pending Setup" },\n                                ]}`,
  `options={[\n                                    { value: "all", label: t("allStatuses") },\n                                    { value: "active", label: t("statusActive") },\n                                    { value: "inactive", label: t("statusInactive") },\n                                    { value: "pending_setup", label: t("statusPendingSetup") },\n                                ]}`
);

code = code.replace(
  `label={<div className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" /> Dept</div>}`,
  `label={<div className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" /> {t("deptFilter")}</div>}`
);

code = code.replace(
  `options={[\n                                    { value: "all", label: "All Depts" },\n                                    ...departments.map(d => ({ value: d, label: d }))\n                                ]}`,
  `options={[\n                                    { value: "all", label: t("allDepartments") },\n                                    ...departments.map(d => ({ value: d, label: getDepartmentLabel(d) }))\n                                ]}`
);

code = code.replace(
  `Sort: {sortField === "createdAt" ? "Date Added" : sortField === "fullName" ? "Name (A→Z)" : "Last Active"} {sortDir === "asc" ? "↑" : "↓"}`,
  `{t("sortBy")} {sortField === "createdAt" ? "Date Added" : sortField === "fullName" ? "Name (A→Z)" : "Last Active"} {sortDir === "asc" ? "↑" : "↓"}`
);

// 10. Table Headers
code = code.replace(
  `<th className="font-semibold text-[11px] text-[var(--muted-foreground)] uppercase tracking-wider px-6 py-3 w-[90px]">ID</th>\n                                    <th className="font-semibold text-[11px] text-[var(--muted-foreground)] uppercase tracking-wider px-6 py-3">Employee</th>\n                                    <th className="font-semibold text-[11px] text-[var(--muted-foreground)] uppercase tracking-wider px-6 py-3 hidden md:table-cell w-[130px]">Department</th>\n                                    <th className="font-semibold text-[11px] text-[var(--muted-foreground)] uppercase tracking-wider px-6 py-3 hidden lg:table-cell w-[140px]">Permissions</th>\n                                    <th className="font-semibold text-[11px] text-[var(--muted-foreground)] uppercase tracking-wider px-6 py-3 w-[110px]">Status</th>\n                                    <th className="font-semibold text-[11px] text-[var(--muted-foreground)] uppercase tracking-wider px-6 py-3 hidden md:table-cell w-[120px]">Last Active</th>\n                                    <th className="font-semibold text-[11px] text-[var(--muted-foreground)] uppercase tracking-wider px-6 py-3 text-right w-[60px]">Actions</th>`,
  `<th className="font-semibold text-[11px] text-[var(--muted-foreground)] uppercase tracking-wider px-6 py-3 w-[90px]">{t("thId")}</th>\n                                    <th className="font-semibold text-[11px] text-[var(--muted-foreground)] uppercase tracking-wider px-6 py-3">{t("thEmployee")}</th>\n                                    <th className="font-semibold text-[11px] text-[var(--muted-foreground)] uppercase tracking-wider px-6 py-3 hidden md:table-cell w-[130px]">{t("thDepartment")}</th>\n                                    <th className="font-semibold text-[11px] text-[var(--muted-foreground)] uppercase tracking-wider px-6 py-3 hidden lg:table-cell w-[140px]">{t("thPermissions")}</th>\n                                    <th className="font-semibold text-[11px] text-[var(--muted-foreground)] uppercase tracking-wider px-6 py-3 w-[110px]">{t("thStatus")}</th>\n                                    <th className="font-semibold text-[11px] text-[var(--muted-foreground)] uppercase tracking-wider px-6 py-3 hidden md:table-cell w-[120px]">{t("thLastActive")}</th>\n                                    <th className="font-semibold text-[11px] text-[var(--muted-foreground)] uppercase tracking-wider px-6 py-3 text-right w-[60px]">{t("thActions")}</th>`
);

code = code.replace(
  `<p className="text-[13px]">Loading employees...</p>`,
  `<p className="text-[13px]">{t("loadingEmployees")}</p>`
);

code = code.replace(
  `                                            <p className="font-semibold text-[var(--muted-foreground)]">\n                                                {employees.length === 0 ? "No employees yet" : "No employees match filters"}\n                                            </p>\n                                            <p className="text-[13px] text-[var(--muted-foreground)] mt-1">\n                                                {employees.length === 0\n                                                    ? "Click \\"Add Employee\\" to create your first staff member."\n                                                    : "Try adjusting your search or filters."}\n                                            </p>\n                                            {employees.length === 0 && (\n                                                <IOSButton\n                                                    variant="filled"\n                                                    color="blue"\n                                                    className="mt-4 mx-auto"\n                                                    onClick={() => setShowAddDialog(true)}\n                                                >\n                                                    <Plus className="h-4 w-4 mr-1.5" />\n                                                    Add First Employee\n                                                </IOSButton>\n                                            )}`,
  `                                            <p className="font-semibold text-[var(--muted-foreground)]">\n                                                {employees.length === 0 ? t("emptyTitle") : t("emptyTitle")}\n                                            </p>\n                                            <p className="text-[13px] text-[var(--muted-foreground)] mt-1">\n                                                {employees.length === 0\n                                                    ? t("emptyDesc")\n                                                    : t("emptyDesc")}\n                                            </p>\n                                            {employees.length === 0 && (\n                                                <IOSButton\n                                                    variant="filled"\n                                                    color="blue"\n                                                    className="mt-4 mx-auto"\n                                                    onClick={() => setShowAddDialog(true)}\n                                                >\n                                                    <Plus className="h-4 w-4 mr-1.5" />\n                                                    {t("emptyBtn")}\n                                                </IOSButton>\n                                            )}`
);

code = code.replace(
  `<IOSBadge variant="outline" color="orange" className="text-[9px] px-1 py-0 border-amber-300 flex-shrink-0">NEW</IOSBadge>`,
  `<IOSBadge variant="outline" color="orange" className="text-[9px] px-1 py-0 border-amber-300 flex-shrink-0">{t("badgeNew")}</IOSBadge>`
);

code = code.replace(
  `TEMPLATE_LABELS[emp.permissionTemplate] || emp.permissionTemplate`,
  `getTemplateLabel(emp.permissionTemplate)`
);

code = code.replace(
  `<Eye className="mr-2 h-4 w-4" />View Details`,
  `<Eye className="mr-2 h-4 w-4" />{t("btnViewDetails")}`
);

code = code.replace(
  `<KeyRound className="mr-2 h-4 w-4 text-[var(--erp-warning)]" />Change Password`,
  `<KeyRound className="mr-2 h-4 w-4 text-[var(--erp-warning)]" />{t("btnChangePassword")}`
);

code = code.replace(
  `<KeyRound className="mr-2 h-4 w-4" />Auto-Reset Password`,
  `<KeyRound className="mr-2 h-4 w-4" />{t("btnAutoResetPassword")}`
);

code = code.replace(
  `<><PowerOff className="mr-2 h-4 w-4 text-[var(--destructive)]" /><span className="text-[var(--destructive)]">Deactivate</span></>`,
  `<><PowerOff className="mr-2 h-4 w-4 text-[var(--destructive)]" /><span className="text-[var(--destructive)]">{t("btnDeactivate")}</span></>`
);

code = code.replace(
  `<><Power className="mr-2 h-4 w-4 text-[var(--erp-success)]" /><span className="text-[var(--erp-success)]">Activate</span></>`,
  `<><Power className="mr-2 h-4 w-4 text-[var(--erp-success)]" /><span className="text-[var(--erp-success)]">{t("btnActivate")}</span></>`
);

code = code.replace(
  `<Trash2 className="mr-2 h-4 w-4" />Delete Employee`,
  `<Trash2 className="mr-2 h-4 w-4" />{t("btnDelete")}`
);

code = code.replace(
  `Showing {filteredEmployees.length} of {employees.length} employees`,
  `{t("paginationShowing", { current: filteredEmployees.length, total: employees.length })}`
);

// 11. Add Employee Dialog
code = code.replace(
  `<DialogTitle style={{ fontSize: 18, fontWeight: 700, color: "#f1f5f9", lineHeight: "22px", margin: 0 }}>Add New Employee</DialogTitle>\n                                    <DialogDescription style={{ fontSize: 13, color: "#64748b", lineHeight: "18px", margin: "2px 0 0" }}>Set up login credentials for new staff</DialogDescription>`,
  `<DialogTitle style={{ fontSize: 18, fontWeight: 700, color: "var(--foreground)", lineHeight: "22px", margin: 0 }}>{t("addModalTitle")}</DialogTitle>\n                                    <DialogDescription style={{ fontSize: 13, color: "var(--muted-foreground)", lineHeight: "18px", margin: "2px 0 0" }}>{t("addModalSubtitle")}</DialogDescription>`
);

code = code.replace(
  `<label className="text-[13px] font-medium text-[var(--muted-foreground)] px-1">Full Name *</label>`,
  `<label className="text-[13px] font-medium text-[var(--muted-foreground)] px-1">{t("lblName")}</label>`
);

code = code.replace(
  `placeholder="e.g. Rajesh Kumar"`,
  `placeholder={t("placeholderName")}`
);

code = code.replace(
  `<label className="text-[13px] font-medium text-[var(--muted-foreground)] px-1">Email *</label>`,
  `<label className="text-[13px] font-medium text-[var(--muted-foreground)] px-1">{t("lblEmail")}</label>`
);

code = code.replace(
  `placeholder="employee@company.com"`,
  `placeholder={t("placeholderEmail")}`
);

code = code.replace(
  `<label className="text-[13px] font-medium text-[var(--muted-foreground)] px-1">Phone</label>`,
  `<label className="text-[13px] font-medium text-[var(--muted-foreground)] px-1">{t("lblPhone")}</label>`
);

code = code.replace(
  `placeholder="+91..."`,
  `placeholder={t("placeholderPhone")}`
);

code = code.replace(
  `label="Department"`,
  `label={t("lblDepartment")}`
);

code = code.replace(
  `DEPARTMENTS.map(d => ({ value: d, label: d }))`,
  `DEPARTMENTS.map(d => ({ value: d, label: getDepartmentLabel(d) }))`
);

code = code.replace(
  `<label className="text-[13px] font-medium text-[var(--muted-foreground)] px-1">Designation</label>`,
  `<label className="text-[13px] font-medium text-[var(--muted-foreground)] px-1">{t("lblDesignation")}</label>`
);

code = code.replace(
  `placeholder="e.g. Machine Operator"`,
  `placeholder={t("placeholderDesignation")}`
);

code = code.replace(
  `label="Permission Template"`,
  `label={t("lblTemplate")}`
);

code = code.replace(
  `options={[\n                                            { value: "full_access", label: "Full Access Staff - All operational modules" },\n                                            { value: "operations", label: "Operations Staff - Orders, Production, Inventory" },\n                                            { value: "sales", label: "Sales Executive - Orders & Clients focus" },\n                                            { value: "view_only", label: "View Only - Read-only access everywhere" },\n                                        ]}`,
  `options={[\n                                            { value: "full_access", label: t("templates.full_access") },\n                                            { value: "operations", label: t("templates.operations") },\n                                            { value: "sales", label: t("templates.sales") },\n                                            { value: "view_only", label: t("templates.view_only") },\n                                        ]}`
);

code = code.replace(
  `<label className="text-[13px] font-medium text-[var(--muted-foreground)] px-1">Password *</label>`,
  `<label className="text-[13px] font-medium text-[var(--muted-foreground)] px-1">{t("lblPassword")}</label>`
);

code = code.replace(
  `placeholder="Min 8 chars"`,
  `placeholder={t("placeholderPassword")}`
);

code = code.replace(
  `<label className="text-[13px] font-medium text-[var(--muted-foreground)] px-1">Confirm Password *</label>`,
  `<label className="text-[13px] font-medium text-[var(--muted-foreground)] px-1">{t("lblConfirmPassword")}</label>`
);

code = code.replace(
  `placeholder="Re-enter password"`,
  `placeholder={t("placeholderConfirmPassword")}`
);

code = code.replace(
  `>✓ 8+ chars</span>`,
  `>{t("reqMinChars")}</span>`
);

code = code.replace(
  `>✓ Uppercase</span>`,
  `>{t("reqUppercase")}</span>`
);

code = code.replace(
  `>✓ Lowercase</span>`,
  `>{t("reqLowercase")}</span>`
);

code = code.replace(
  `>✓ Number</span>`,
  `>{t("reqNumber")}</span>`
);

code = code.replace(
  `<p className="font-semibold text-[var(--foreground)]">What happens next?</p>`,
  `<p className="font-semibold text-[var(--foreground)]">{t("nextStepsTitle")}</p>`
);

code = code.replace(
  `<li>• A unique Employee ID (EMP-XXXX) will be generated</li>`,
  `<li>{t("step1")}</li>`
);

code = code.replace(
  `<li>• Staff will log in using their email and password</li>`,
  `<li>{t("step2")}</li>`
);

code = code.replace(
  `<li>• Share the email and password securely</li>`,
  `<li>{t("step3")}</li>`
);

code = code.replace(
  `<IOSButton variant="gray" onClick={() => setShowAddDialog(false)} className="flex-1">Cancel</IOSButton>`,
  `<IOSButton variant="gray" onClick={() => setShowAddDialog(false)} className="flex-1">{t("btnCancel")}</IOSButton>`
);

code = code.replace(
  `{adding ? "Creating..." : "Create Employee"}`,
  `{adding ? t("creatingEmployee") : t("btnCreateEmployee")}`
);

// 12. Credentials Dialog
code = code.replace(
  `<DialogTitle style={{ fontSize: 18, fontWeight: 700, color: "#f1f5f9", lineHeight: "22px", margin: 0 }}>Employee Created</DialogTitle>\n                                    <DialogDescription style={{ fontSize: 13, color: "#64748b", lineHeight: "18px", margin: "2px 0 0" }}>Share login details with {createdEmployee?.fullName}</DialogDescription>`,
  `<DialogTitle style={{ fontSize: 18, fontWeight: 700, color: "var(--foreground)", lineHeight: "22px", margin: 0 }}>{t("createdModalTitle")}</DialogTitle>\n                                    <DialogDescription style={{ fontSize: 13, color: "var(--muted-foreground)", lineHeight: "18px", margin: "2px 0 0" }}>{t("createdModalSubtitle", { name: createdEmployee?.fullName || "" })}</DialogDescription>`
);

code = code.replace(
  `<p className="text-[13px] font-semibold text-[#34C759]">Account created successfully!</p>`,
  `<p className="text-[13px] font-semibold text-[#34C759]">{t("createdSuccess")}</p>`
);

code = code.replace(
  `<p className="text-[10px] uppercase font-bold text-[var(--muted-foreground)] tracking-wider">Login Email</p>`,
  `<p className="text-[10px] uppercase font-bold text-[var(--muted-foreground)] tracking-wider">{t("lblLoginEmail")}</p>`
);

code = code.replace(
  `<p className="text-[10px] uppercase font-bold text-[var(--muted-foreground)] tracking-wider">Employee ID (Internal)</p>`,
  `<p className="text-[10px] uppercase font-bold text-[var(--muted-foreground)] tracking-wider">{t("lblEmployeeId")}</p>`
);

code = code.replace(
  `                                    <div className="text-[13px] text-[var(--muted-foreground)]">\n                                        Staff will log in using their <strong>email and password</strong> on the Staff Portal.\n                                    </div>`,
  `                                    <div className="text-[13px] text-[var(--muted-foreground)]">\n                                        {t("portalHint")}\n                                    </div>`
);

code = code.replace(
  `                                    className="w-full text-[15px] font-semibold"\n                                    onClick={() => { setShowCredentials(false); setCreatedEmployee(null); }}\n                                >\n                                    Done\n                                </IOSButton>`,
  `                                    className="w-full text-[15px] font-semibold"\n                                    onClick={() => { setShowCredentials(false); setCreatedEmployee(null); }}\n                                >\n                                    {t("btnDone")}\n                                </IOSButton>`
);

// 13. Action Confirmation Sheet & Dialog
code = code.replace(
  `entityLabel={tCommon("entityEmployee")}`,
  `entityLabel={t("deleteEntityLabel")}`
);

code = code.replace(
  `consequenceText={tCommon("consequenceEmployee")}`,
  `consequenceText={t("deleteConsequence")}\n                    confirmText={t("deleteConfirm")}\n                    cancelText={t("deleteCancel")}`
);

code = code.replace(
  `<DialogTitle style={{ fontSize: 18, fontWeight: 700, color: "#f1f5f9", lineHeight: "22px", margin: 0 }}>\n                                {actionType === "deactivate" && "Deactivate Employee"}\n                                {actionType === "activate" && "Activate Employee"}\n                                {actionType === "reset_password" && (resetPasswordResult ? "Password Reset Complete" : "Reset Password")}\n                            </DialogTitle>`,
  `<DialogTitle style={{ fontSize: 18, fontWeight: 700, color: "var(--foreground)", lineHeight: "22px", margin: 0 }}>\n                                {actionType === "deactivate" && t("btnDeactivate")}\n                                {actionType === "activate" && t("btnActivate")}\n                                {actionType === "reset_password" && (resetPasswordResult ? t("passwordUpdatedTitle") : t("autoResetTitle"))}\n                            </DialogTitle>`
);

code = code.replace(
  `                                {actionType === "deactivate" && (\n                                    <>This will disable <strong>{actionTarget?.fullName}</strong>&apos;s account and terminate active sessions. They will be unable to log in.</>\n                                )}\n                                {actionType === "activate" && (\n                                    <>This will re-enable <strong>{actionTarget?.fullName}</strong>&apos;s account. They will be able to log in again.</>\n                                )}\n                                {actionType === "reset_password" && !resetPasswordResult && (\n                                    <>This will generate a new password for <strong>{actionTarget?.fullName}</strong> ({actionTarget?.employeeId}) and terminate all their active sessions.</>\n                                )}`,
  `                                {actionType === "deactivate" && (\n                                    <>{t("deactivateConfirm", { name: actionTarget?.fullName || "" })}</>\n                                )}\n                                {actionType === "activate" && (\n                                    <>{t("activateConfirm", { name: actionTarget?.fullName || "" })}</>\n                                )}\n                                {actionType === "reset_password" && !resetPasswordResult && (\n                                    <>{t("autoResetConfirm", { name: actionTarget?.fullName || "", id: actionTarget?.employeeId || "" })}</>\n                                )}`
);

code = code.replace(
  `<p className="text-[10px] uppercase font-bold text-[var(--muted-foreground)] tracking-wider">New Password</p>`,
  `<p className="text-[10px] uppercase font-bold text-[var(--muted-foreground)] tracking-wider">{t("lblNewPassword")}</p>`
);

code = code.replace(
  `Share this password securely with the employee.`,
  `{t("sharePasswordHint")}`
);

code = code.replace(
  `Done\n                                </IOSButton>`,
  `{t("btnDone")}\n                                </IOSButton>`
);

code = code.replace(
  `<IOSButton variant="gray" className="flex-1 text-[15px] font-semibold" onClick={() => { setActionTarget(null); setActionType(null); }}>\n                                        Cancel\n                                    </IOSButton>`,
  `<IOSButton variant="gray" className="flex-1 text-[15px] font-semibold" onClick={() => { setActionTarget(null); setActionType(null); }}>\n                                        {t("btnCancel")}\n                                    </IOSButton>`
);

code = code.replace(
  `                                        {actionType === "deactivate" && "Deactivate"}\n                                        {actionType === "activate" && "Activate"}\n                                        {actionType === "reset_password" && "Reset"}`,
  `                                        {actionType === "deactivate" && t("btnDeactivate")}\n                                        {actionType === "activate" && t("btnActivate")}\n                                        {actionType === "reset_password" && t("autoResetTitle")}`
);

// 14. Change Password Dialog
code = code.replace(
  `<DialogTitle style={{ fontSize: 18, fontWeight: 700, color: "#f1f5f9", lineHeight: "22px", margin: 0 }}>{changePwdStep === "success" ? "Password Changed" : "Change Password"}</DialogTitle>\n                                    <DialogDescription style={{ fontSize: 13, color: "#64748b", lineHeight: "18px", margin: "2px 0 0" }}>{changePwdStep === "success" ? \`Updated for \${changePwdTarget?.fullName}\` : \`Set new password for \${changePwdTarget?.fullName}\`}</DialogDescription>`,
  `<DialogTitle style={{ fontSize: 18, fontWeight: 700, color: "var(--foreground)", lineHeight: "22px", margin: 0 }}>{changePwdStep === "success" ? t("passwordUpdatedTitle") : t("changePasswordTitle")}</DialogTitle>\n                                    <DialogDescription style={{ fontSize: 13, color: "var(--muted-foreground)", lineHeight: "18px", margin: "2px 0 0" }}>{changePwdStep === "success" ? \`Updated for \${changePwdTarget?.fullName}\` : \`Set new password for \${changePwdTarget?.fullName}\`}</DialogDescription>`
);

code = code.replace(
  `<label className="text-[13px] font-medium text-[var(--muted-foreground)] px-1">New Password</label>`,
  `<label className="text-[13px] font-medium text-[var(--muted-foreground)] px-1">{t("lblNewPassword")}</label>`
);

code = code.replace(
  `placeholder="Enter new password"`,
  `placeholder={t("placeholderNewPassword")}`
);

code = code.replace('/>} 8+ chars\n', '/>} {t("reqMinChars")}\n');

code = code.replace('/>} Uppercase\n', '/>} {t("reqUppercase")}\n');

code = code.replace('/>} Lowercase\n', '/>} {t("reqLowercase")}\n');

code = code.replace('/>} Number\n', '/>} {t("reqNumber")}\n');

code = code.replace(
  `<label className="text-[13px] font-medium text-[var(--muted-foreground)] px-1">Confirm New Password</label>`,
  `<label className="text-[13px] font-medium text-[var(--muted-foreground)] px-1">{t("lblConfirmNewPassword")}</label>`
);

code = code.replace(
  `placeholder="Re-enter new password"`,
  `placeholder={t("placeholderConfirmNewPassword")}`
);

code = code.replace(
  `<p className="text-[11px] font-medium text-[#FF3B30] flex items-center gap-1 px-1 pt-0.5"><X className="h-3 w-3" /> Passwords do not match</p>`,
  `<p className="text-[11px] font-medium text-[#FF3B30] flex items-center gap-1 px-1 pt-0.5"><X className="h-3 w-3" /> {t("passwordsMismatch")}</p>`
);

code = code.replace(
  `<p className="text-[11px] font-medium text-[#34C759] flex items-center gap-1 px-1 pt-0.5"><Check className="h-3 w-3" /> Passwords match</p>`,
  `<p className="text-[11px] font-medium text-[#34C759] flex items-center gap-1 px-1 pt-0.5"><Check className="h-3 w-3" /> {t("passwordsMatch")}</p>`
);

code = code.replace(
  `<label className="text-[13px] font-semibold text-[var(--foreground)]">Admin Verification</label>`,
  `<label className="text-[13px] font-semibold text-[var(--foreground)]">{t("lblAdminVerification")}</label>`
);

code = code.replace(
  `placeholder="Enter YOUR admin password"`,
  `placeholder={t("placeholderAdminPassword")}`
);

code = code.replace(
  `<p className="text-[12px] text-[var(--muted-foreground)] pl-1">Required to authorize this high-privilege action.</p>`,
  `<p className="text-[12px] text-[var(--muted-foreground)] pl-1">{t("adminVerificationDesc")}</p>`
);

code = code.replace(
  `<p className="text-[18px] font-semibold text-[var(--foreground)]">Password Updated Successfully</p>`,
  `<p className="text-[18px] font-semibold text-[var(--foreground)]">{t("passwordUpdatedTitle")}</p>`
);

code = code.replace(
  `The password has been changed and existing sessions terminated.`,
  `{t("passwordUpdatedDesc")}`
);

code = code.replace(
  `<IOSButton variant="filled" color="blue" onClick={resetChangePwdDialog} className="w-full text-[15px] font-semibold">Done</IOSButton>`,
  `<IOSButton variant="filled" color="blue" onClick={resetChangePwdDialog} className="w-full text-[15px] font-semibold">{t("btnDone")}</IOSButton>`
);

code = code.replace(
  `<IOSButton variant="gray" onClick={resetChangePwdDialog} className="flex-1 text-[15px] font-semibold">Cancel</IOSButton>`,
  `<IOSButton variant="gray" onClick={resetChangePwdDialog} className="flex-1 text-[15px] font-semibold">{t("btnCancel")}</IOSButton>`
);

code = code.replace(
  `Change Password\n                                        </IOSButton>`,
  `{t("changePasswordTitle")}\n                                        </IOSButton>`
);

code = code.replace('>✓ 8+ chars</span>', '>✓ {t("reqMinChars")}</span>');
code = code.replace('>✓ Uppercase</span>', '>✓ {t("reqUppercase")}</span>');
code = code.replace('>✓ Lowercase</span>', '>✓ {t("reqLowercase")}</span>');
code = code.replace('>✓ Number</span>', '>✓ {t("reqNumber")}</span>');

if (isCrlf) code = code.replace(/\n/g, '\r\n');
fs.writeFileSync(file, code, 'utf8');
console.log('Successfully transformed apps/web/src/app/dashboard/users/page.tsx!');
