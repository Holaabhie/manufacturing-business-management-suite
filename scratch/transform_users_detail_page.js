const fs = require('fs');

const file = 'apps/web/src/app/dashboard/users/[id]/page.tsx';
let raw = fs.readFileSync(file, 'utf8');
const isCrlf = raw.includes('\r\n');
let code = raw.replace(/\r\n/g, '\n');

// 1. Imports
if (!code.includes('useTranslations')) {
  code = code.replace(
    'import { toast } from "sonner";',
    'import { toast } from "sonner";\nimport { useTranslations } from "next-intl";\nimport { useAppLocale } from "@/components/LocaleProvider";'
  );
}

// 2. StatusBadge localization
const oldStatusBadge = `function StatusBadge({ status }: { status: string }) {
    const config: Record<string, { label: string; classes: string; icon: any }> = {
        active: { label: "Active", classes: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-800 dark:text-emerald-400", icon: Check },
        inactive: { label: "Disabled", classes: "border-red-200 bg-red-50 text-red-700 dark:bg-red-950/20 dark:border-red-800 dark:text-red-400", icon: PowerOff },
        suspended: { label: "Suspended", classes: "border-amber-200 bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:border-amber-800 dark:text-amber-400", icon: AlertTriangle },
        pending_setup: { label: "Pending Setup", classes: "border-blue-200 bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:border-blue-800 dark:text-blue-400", icon: Clock },
    };
    const c = config[status] || config.active;
    const Icon = c.icon;
    return (
        <Badge variant="outline" className={\`gap-1 pl-1.5 pr-2.5 py-0.5 rounded-full font-semibold text-[11px] \${c.classes}\`}>
            <Icon className="h-3 w-3" />{c.label}
        </Badge>
    );
}`;

const newStatusBadge = `function StatusBadge({ status }: { status: string }) {
    const t = useTranslations("users");
    const config: Record<string, { label: string; classes: string; icon: any }> = {
        active: { label: t("statusActive"), classes: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-800 dark:text-emerald-400", icon: Check },
        inactive: { label: t("statusInactive"), classes: "border-red-200 bg-red-50 text-red-700 dark:bg-red-950/20 dark:border-red-800 dark:text-red-400", icon: PowerOff },
        suspended: { label: t("statusSuspended"), classes: "border-amber-200 bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:border-amber-800 dark:text-amber-400", icon: AlertTriangle },
        pending_setup: { label: t("statusPendingSetup"), classes: "border-blue-200 bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:border-blue-800 dark:text-blue-400", icon: Clock },
    };
    const c = config[status] || config.active;
    const Icon = c.icon;
    return (
        <Badge variant="outline" className={\`gap-1 pl-1.5 pr-2.5 py-0.5 rounded-full font-semibold text-[11px] \${c.classes}\`}>
            <Icon className="h-3 w-3" />{c.label}
        </Badge>
    );
}`;

code = code.replace(oldStatusBadge, newStatusBadge);

// 3. Component hooks wiring
const oldCompStart = `export default function EmployeeDetailPage() {
    const router = useRouter();
    const params = useParams();
    const employeeId = params.id as string;`;

const newCompStart = `export default function EmployeeDetailPage() {
    const router = useRouter();
    const params = useParams();
    const employeeId = params.id as string;
    const t = useTranslations("users");
    const tCommon = useTranslations("common");
    const { locale } = useAppLocale();
    const dateLocale = locale === "hi" ? "hi-IN" : locale === "gu" ? "gu-IN" : locale === "mr" ? "mr-IN" : "en-IN";
    const getTemplateLabel = (key: string) => t(\`templates.\${key}\` as any) || TEMPLATE_LABELS[key] || key;
    const getDepartmentLabel = (key: string) => t(\`departments.\${key}\` as any) || key;`;

code = code.replace(oldCompStart, newCompStart);

// 4. Toasts
code = code.replace(
  'toast.success(`Employee ${json.status === "active" ? "activated" : "deactivated"}`);',
  'toast.success(json.status === "active" ? t("btnActivate") : t("btnDeactivate"));'
);
code = code.replace('toast.success("Password reset successfully");', 'toast.success(t("toasts.passwordReset"));');
code = code.replace('if (changePwdNewPassword.length < 8) { toast.error("Password must be at least 8 characters"); return; }', 'if (changePwdNewPassword.length < 8) { toast.error(t("toasts.passwordMin")); return; }');
code = code.replace('if (!/[A-Z]/.test(changePwdNewPassword)) { toast.error("Password must contain an uppercase letter"); return; }', 'if (!/[A-Z]/.test(changePwdNewPassword)) { toast.error(t("toasts.passwordUpper")); return; }');
code = code.replace('if (!/[a-z]/.test(changePwdNewPassword)) { toast.error("Password must contain a lowercase letter"); return; }', 'if (!/[a-z]/.test(changePwdNewPassword)) { toast.error(t("toasts.passwordLower")); return; }');
code = code.replace('if (!/[0-9]/.test(changePwdNewPassword)) { toast.error("Password must contain a number"); return; }', 'if (!/[0-9]/.test(changePwdNewPassword)) { toast.error(t("toasts.passwordNumber")); return; }');
code = code.replace('if (changePwdNewPassword !== changePwdConfirm) { toast.error("Passwords do not match"); return; }', 'if (changePwdNewPassword !== changePwdConfirm) { toast.error(t("toasts.passwordMismatch")); return; }');
code = code.replace('toast.success("Account unlocked");', 'toast.success(t("toasts.accountUnlocked"));');
code = code.replace('toast.success("All sessions terminated");', 'toast.success(t("toasts.sessionsTerminated"));');
code = code.replace('toast.success("Profile updated");', 'toast.success(t("toasts.profileUpdated"));');
code = code.replace('toast.success("Permissions updated");', 'toast.success(t("toasts.permissionsUpdated"));');
code = code.replace('toast.success("Employee deleted");', 'toast.success(t("toasts.employeeDeleted"));');

// 5. Guards & Header
code = code.replace(
  '<AccessDenied title="Restricted Access" description="Employee details are restricted to administrators." />',
  '<AccessDenied title={t("restrictedAccess")} description="Employee details are restricted to administrators." />'
);
code = code.replace('<h2 className="text-xl font-bold">Employee Not Found</h2>', '<h2 className="text-xl font-bold">{t("employeeNotFound")}</h2>');
code = code.replace('<ArrowLeft className="mr-2 h-4 w-4" />Back to Employees', '<ArrowLeft className="mr-2 h-4 w-4" />{t("btnBackToEmployees")}');
code = code.replace('Employees\n                    </button>', '{t("breadcrumbEmployees")}\n                    </button>');
code = code.replace('<Building2 className="h-3.5 w-3.5" /> {employee.department}', '<Building2 className="h-3.5 w-3.5" /> {getDepartmentLabel(employee.department)}');
code = code.replace('<Calendar className="h-3.5 w-3.5" /> Added {new Date(employee.createdAt).toLocaleDateString()}', '<Calendar className="h-3.5 w-3.5" /> {t("addedOn")} {new Date(employee.createdAt).toLocaleDateString(dateLocale)}');
code = code.replace('<KeyRound className="mr-1.5 h-3.5 w-3.5" />Change Password', '<KeyRound className="mr-1.5 h-3.5 w-3.5" />{t("btnChangePassword")}');
code = code.replace('<><PowerOff className="mr-1.5 h-3.5 w-3.5" />Deactivate</>', '<><PowerOff className="mr-1.5 h-3.5 w-3.5" />{t("btnDeactivate")}</>');
code = code.replace('<><Power className="mr-1.5 h-3.5 w-3.5" />Activate</>', '<><Power className="mr-1.5 h-3.5 w-3.5" />{t("btnActivate")}</>');

// 6. Warning Banners
code = code.replace('<span>This employee has not completed first-time login setup. Temporary password is still active.</span>', '<span>{t("firstLoginNotice")}</span>');
code = code.replace(
  '<span>Account locked due to failed login attempts ({employee.failedLoginAttempts} attempts).</span>',
  '<span>{t("accountLockedNotice", { count: employee.failedLoginAttempts })}</span>'
);
code = code.replace('<Unlock className="mr-1.5 h-3.5 w-3.5" />Unlock', '<Unlock className="mr-1.5 h-3.5 w-3.5" />{t("btnUnlock")}');

// 7. Tabs
code = code.replace('<UserCog className="h-3.5 w-3.5" />Profile', '<UserCog className="h-3.5 w-3.5" />{t("tabProfile")}');
code = code.replace('<Shield className="h-3.5 w-3.5" />Permissions', '<Shield className="h-3.5 w-3.5" />{t("tabPermissions")}');
code = code.replace('<Activity className="h-3.5 w-3.5" />Activity', '<Activity className="h-3.5 w-3.5" />{t("tabActivity")}');
code = code.replace('<MonitorSmartphone className="h-3.5 w-3.5" />Sessions', '<MonitorSmartphone className="h-3.5 w-3.5" />{t("tabSessions")}');

// 8. Profile Tab
code = code.replace('<CardTitle className="text-lg">Employee Profile</CardTitle>', '<CardTitle className="text-lg">{t("secProfileTitle")}</CardTitle>');
code = code.replace('<CardDescription>Personal and organizational information.</CardDescription>', '<CardDescription>{t("secProfileSubtitle")}</CardDescription>');
code = code.replace('<Edit3 className="mr-1.5 h-3.5 w-3.5" />Edit', '<Edit3 className="mr-1.5 h-3.5 w-3.5" />{t("btnEdit")}');
code = code.replace('<X className="mr-1 h-3.5 w-3.5" />Cancel', '<X className="mr-1 h-3.5 w-3.5" />{t("btnCancel")}');
code = code.replace('Save\n                                        </Button>', '{t("btnSave")}\n                                        </Button>');
code = code.replace('<Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Employee ID</Label>', '<Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("lblEmployeeId")}</Label>');
code = code.replace('<TooltipContent>Copy ID</TooltipContent>', '<TooltipContent>{t("btnCopyId")}</TooltipContent>');
code = code.replace('<Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Full Name</Label>', '<Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("lblName")}</Label>');
code = code.replace('<Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Email</Label>', '<Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("lblEmail")}</Label>');
code = code.replace('placeholder="employee@company.com"', 'placeholder={t("placeholderEmail")}');
code = code.replace('<span className="text-muted-foreground italic">Not provided</span>', '<span className="text-muted-foreground italic">{t("lblNotProvided")}</span>');
code = code.replace('<Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Phone</Label>', '<Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("lblPhone")}</Label>');
code = code.replace('<span className="text-muted-foreground italic">Not provided</span>', '<span className="text-muted-foreground italic">{t("lblNotProvided")}</span>');
code = code.replace('<Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Department</Label>', '<Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("lblDepartment")}</Label>');
code = code.replace('{DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}', '{DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{getDepartmentLabel(d)}</SelectItem>)}');
code = code.replace('<span className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5" />{employee.department}</span>', '<span className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5" />{getDepartmentLabel(employee.department)}</span>');
code = code.replace('<Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Designation</Label>', '<Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("lblDesignation")}</Label>');
code = code.replace('placeholder="e.g. Machine Operator"', 'placeholder={t("placeholderDesignation")}');
code = code.replace('<span className="text-muted-foreground italic">Not set</span>', '<span className="text-muted-foreground italic">{t("lblNotSet")}</span>');
code = code.replace('<Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Last Login</Label>', '<Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("lblLastLogin")}</Label>');
code = code.replace('{employee.lastLogin ? new Date(employee.lastLogin).toLocaleString() : "Never"}', '{employee.lastLogin ? new Date(employee.lastLogin).toLocaleString(dateLocale) : t("lblNotSet")}');
code = code.replace('<Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Last Active</Label>', '<Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("lblLastActive")}</Label>');
code = code.replace('Danger Zone\n                                    </h3>', '{t("secDangerZone")}\n                                    </h3>');
code = code.replace('<Trash2 className="mr-1.5 h-3.5 w-3.5" />Delete Employee', '<Trash2 className="mr-1.5 h-3.5 w-3.5" />{t("btnDelete")}');

// 9. Permissions Tab
code = code.replace('<CardTitle className="text-lg">Access Permissions</CardTitle>', '<CardTitle className="text-lg">{t("secPermissionsTitle")}</CardTitle>');
code = code.replace(
  'Template: <span className="font-semibold text-foreground">{TEMPLATE_LABELS[employee.permissionTemplate] || employee.permissionTemplate}</span>',
  '{t("lblTemplatePrefix")} <span className="font-semibold text-foreground">{getTemplateLabel(employee.permissionTemplate)}</span>'
);
code = code.replace('<Edit3 className="mr-1.5 h-3.5 w-3.5" />Change', '<Edit3 className="mr-1.5 h-3.5 w-3.5" />{t("btnChangeTemplate")}');
code = code.replace('<Button variant="ghost" size="sm" onClick={() => setEditingPerms(false)}>Cancel</Button>', '<Button variant="ghost" size="sm" onClick={() => setEditingPerms(false)}>{t("btnCancel")}</Button>');
code = code.replace('Apply\n                                        </Button>', '{t("btnApplyTemplate")}\n                                        </Button>');
code = code.replace(
  '<Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 block">Select Permission Template</Label>',
  '<Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 block">{t("selectTemplateTitle")}</Label>'
);
code = code.replace(
  '{Object.entries(TEMPLATE_LABELS).filter(([k]) => k !== "custom").map(([key, label]) => (\n                                                    <SelectItem key={key} value={key}>{label}</SelectItem>\n                                                ))}',
  '{Object.entries(TEMPLATE_LABELS).filter(([k]) => k !== "custom").map(([key]) => (\n                                                    <SelectItem key={key} value={key}>{getTemplateLabel(key)}</SelectItem>\n                                                ))}'
);
code = code.replace('<p>No permissions set. Using default role-based access.</p>', '<p>{t("noPermissionsNotice")}</p>');

// 10. Activity Tab
code = code.replace('<CardTitle className="text-lg">Activity Log</CardTitle>', '<CardTitle className="text-lg">{t("secActivityTitle")}</CardTitle>');
code = code.replace('<CardDescription>Recent actions by this employee across all modules.</CardDescription>', '<CardDescription>{t("secActivitySubtitle")}</CardDescription>');
code = code.replace('<p>No activity recorded yet.</p>', '<p>{t("noActivity")}</p>');
code = code.replace('<span>{new Date(entry.timestamp).toLocaleString()}</span>', '<span>{new Date(entry.timestamp).toLocaleString(dateLocale)}</span>');

// 11. Sessions Tab
code = code.replace('<CardTitle className="text-lg">Active Sessions</CardTitle>', '<CardTitle className="text-lg">{t("secSessionsTitle")}</CardTitle>');
code = code.replace('<CardDescription>{sessions.length} active session(s).</CardDescription>', '<CardDescription>{t("sessionsCount", { count: sessions.length })}</CardDescription>');
code = code.replace('<LogOut className="mr-1.5 h-3.5 w-3.5" />Terminate All', '<LogOut className="mr-1.5 h-3.5 w-3.5" />{t("btnTerminateAll")}');
code = code.replace('<p>No active sessions.</p>', '<p>{t("noSessions")}</p>');
code = code.replace(
  'IP: {session.ipAddress} • Last active: {timeAgo(session.lastActiveAt)}',
  '{t("sessionIp")} {session.ipAddress} • {t("sessionLastActive")} {timeAgo(session.lastActiveAt)}'
);

// 12. Change Password Modal
code = code.replace('{changePwdStep === "success" ? "Password Changed" : "Change Password"}', '{changePwdStep === "success" ? t("passwordUpdatedTitle") : t("changePasswordTitle")}');
code = code.replace('placeholder="Enter new password"', 'placeholder={t("placeholderNewPassword")}');
code = code.replace('} 8+ chars\n', '} {t("reqMinChars")}\n');
code = code.replace('} Uppercase\n', '} {t("reqUppercase")}\n');
code = code.replace('} Lowercase\n', '} {t("reqLowercase")}\n');
code = code.replace('} Number\n', '} {t("reqNumber")}\n');
code = code.replace('<Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Confirm New Password</Label>', '<Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("lblConfirmNewPassword")}</Label>');
code = code.replace('placeholder="Re-enter new password"', 'placeholder={t("placeholderConfirmNewPassword")}');
code = code.replace('<X className="h-3 w-3" /> Passwords do not match</p>', '<X className="h-3 w-3" /> {t("passwordsMismatch")}</p>');
code = code.replace('<Check className="h-3 w-3" /> Passwords match</p>', '<Check className="h-3 w-3" /> {t("passwordsMatch")}</p>');
code = code.replace('<Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Admin Password (Recommended)</Label>', '<Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("adminPasswordRecommend")}</Label>');
code = code.replace('placeholder="Enter YOUR password to confirm"', 'placeholder={t("placeholderAdminPassword")}');
code = code.replace(
  '<p className="text-[10px] text-muted-foreground">Re-enter your admin password for security verification. Optional but recommended.</p>',
  '<p className="text-[10px] text-muted-foreground">{t("adminPasswordRecommendHint")}</p>'
);
code = code.replace('<p className="font-semibold text-lg">Password Updated Successfully</p>', '<p className="font-semibold text-lg">{t("passwordUpdatedTitle")}</p>');
code = code.replace(
  'The password for <strong>{employee.fullName}</strong> has been changed. All existing sessions have been terminated. The staff member must log in with the new password.',
  '{t("passwordUpdatedDesc")}'
);
code = code.replace(
  'This action has been recorded in the audit trail.',
  '{t("auditRecordedNotice")}'
);
code = code.replace(
  '<Button className="w-full text-white" style={{ background: "var(--primary)" }} onClick={resetChangePwdDialog}>Done</Button>',
  '<Button className="w-full text-white" style={{ background: "var(--primary)" }} onClick={resetChangePwdDialog}>{t("btnDone")}</Button>'
);
code = code.replace('<Button variant="outline" onClick={resetChangePwdDialog}>Cancel</Button>', '<Button variant="outline" onClick={resetChangePwdDialog}>{t("btnCancel")}</Button>');
code = code.replace('Change Password\n                                    </Button>', '{t("changePasswordTitle")}\n                                    </Button>');

// 13. Auto-Generate Password Modal
code = code.replace('<DialogTitle>Auto-Generate Password</DialogTitle>', '<DialogTitle>{t("autoGeneratePasswordTitle")}</DialogTitle>');
code = code.replace(
  '<p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">New Temporary Password</p>',
  '<p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{t("newTempPassword")}</p>'
);
code = code.replace(
  '<Button className="w-full" onClick={() => { setShowResetPwd(false); setResetPwdResult(null); }}>Done</Button>',
  '<Button className="w-full" onClick={() => { setShowResetPwd(false); setResetPwdResult(null); }}>{t("btnDone")}</Button>'
);
code = code.replace('<Button variant="outline" onClick={() => setShowResetPwd(false)}>Cancel</Button>', '<Button variant="outline" onClick={() => setShowResetPwd(false)}>{t("btnCancel")}</Button>');
code = code.replace('Generate Password\n                                    </Button>', '{t("btnGeneratePassword")}\n                                    </Button>');

// 14. Confirm Delete Sheet
code = code.replace('entityLabel="employee"', 'entityLabel={t("deleteEntityLabel")}');
code = code.replace(
  'consequenceText="will be permanently removed from staff records. This cannot be undone."',
  'consequenceText={t("deleteConsequence")}'
);

if (isCrlf) code = code.replace(/\n/g, '\r\n');
fs.writeFileSync(file, code, 'utf8');
console.log('Successfully transformed apps/web/src/app/dashboard/users/[id]/page.tsx!');
