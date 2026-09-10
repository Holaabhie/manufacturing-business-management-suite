const fs = require('fs');

const file = 'apps/web/src/components/production/AssignStaffDialog.tsx';
let raw = fs.readFileSync(file, 'utf8');
const isCrlf = raw.includes('\r\n');
let code = raw.replace(/\r\n/g, '\n');

// 1. Imports
if (!code.includes('useTranslations')) {
  code = code.replace(
    'import { useState, useEffect, useCallback } from "react";',
    'import { useState, useEffect, useCallback } from "react";\nimport { useTranslations } from "next-intl";'
  );
}

// 2. Component hooks
const oldCompStart = `export function AssignStaffDialog({
    open,
    onOpenChange,
    productionId,
    productionName,
    currentStaffIds = [],
    onSuccess,
}: AssignStaffDialogProps) {
    const router = useRouter();`;

const newCompStart = `export function AssignStaffDialog({
    open,
    onOpenChange,
    productionId,
    productionName,
    currentStaffIds = [],
    onSuccess,
}: AssignStaffDialogProps) {
    const t = useTranslations("production.assignStaff");
    const tToast = useTranslations("production.toasts");
    const router = useRouter();`;

code = code.replace(oldCompStart, newCompStart);

// 3. Toasts
code = code.replace('toast.error("Failed to load staff members");', 'toast.error(tToast("loadStaffFailed"));');
code = code.replace('toast.error("Select at least one staff member");', 'toast.error(tToast("selectStaffMin"));');
code = code.replace('toast.error(data.message || "Failed to assign staff");', 'toast.error(data.message || tToast("staffAssignFailed"));');
code = code.replace('toast.success("Staff assigned successfully");', 'toast.success(tToast("staffAssignSuccess"));');
code = code.replace('toast.error(err.message || "Failed to assign staff");', 'toast.error(err.message || tToast("staffAssignFailed"));');

// 4. Header title & description
code = code.replace(
  `<Users className="h-4.5 w-4.5 text-primary" />\n                        Assign Staff`,
  `<Users className="h-4.5 w-4.5 text-primary" />\n                        {t("title")}`
);
code = code.replace(
  `<DialogDescription className="text-[13px] text-muted-foreground">\n                        Select staff members for{" "}\n                        <span className="font-medium text-foreground">\n                            {productionName}\n                        </span>\n                    </DialogDescription>`,
  `<DialogDescription className="text-[13px] text-muted-foreground">\n                        {t("description", { name: productionName })}\n                    </DialogDescription>`
);

// 5. Search placeholder
code = code.replace('placeholder="Search staff..."', 'placeholder={t("searchPlaceholder")}');

// 6. Empty list messages
code = code.replace(
  `                            {staffList.length === 0\n                                ? "No staff members found in your team."\n                                : "No results match your search."}`,
  `                            {staffList.length === 0\n                                ? t("emptyNoStaff")\n                                : t("emptyNoResults")}`
);

// 7. Footer
code = code.replace(
  `<p className="text-[12px] text-muted-foreground">\n                            {selectedIds.size} selected\n                        </p>`,
  `<p className="text-[12px] text-muted-foreground">\n                            {t("selectedCount", { count: selectedIds.size })}\n                        </p>`
);
code = code.replace(
  `                                Cancel\n                            </Button>`,
  `                                {t("btnCancel")}\n                            </Button>`
);
code = code.replace(
  `                                        Assigning...\n                                    </>`,
  `                                        {t("btnAssigning")}\n                                    </>`
);
code = code.replace(
  `                                    "Assign Staff"\n                                )}`,
  `                                    t("btnAssign")\n                                )}`
);

if (isCrlf) code = code.replace(/\n/g, '\r\n');
fs.writeFileSync(file, code, 'utf8');
console.log('Successfully transformed apps/web/src/components/production/AssignStaffDialog.tsx!');
