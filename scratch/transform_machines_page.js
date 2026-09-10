const fs = require('fs');

const filePath = 'apps/web/src/app/dashboard/machines/page.tsx';
let code = fs.readFileSync(filePath, 'utf8');

// 1. Add getStatusLabel helper inside component
const hookSetup = `export default function MachinesPage() {
    const router = useRouter();
    const { isAdmin } = useRole();
    const t = useTranslations("machines");
    const tCommon = useTranslations("common");
    const { formatDate } = useFormatters();

    const getStatusLabel = (status: string) => {
        switch (status) {
            case "active": return t("statusActive");
            case "running": return t("statusRunning");
            case "idle": return t("statusIdle");
            case "inactive": return t("statusDisabled");
            case "maintenance": return t("statusMaintenance");
            default: return status;
        }
    };`;

code = code.replace(
  /export default function MachinesPage\(\) \{[\s\S]*?const \{ formatDate \} = useFormatters\(\);/,
  hookSetup
);

// 2. Add overflow containment to non-admin view
code = code.replace(
  '<div className="flex flex-col items-center justify-center py-32">',
  '<div className="flex flex-col items-center justify-center py-32 w-full min-w-0 overflow-x-hidden">'
);

// 3. Add overflow containment to loading skeleton
code = code.replace(
  'if (loading) {\n        return (\n            <div className="space-y-6">',
  'if (loading) {\n        return (\n            <div className="space-y-6 w-full min-w-0 overflow-x-hidden">'
);

// 4. Add overflow containment to root motion.div
code = code.replace(
  '<motion.div\n            className="space-y-6"',
  '<motion.div\n            className="space-y-6 w-full min-w-0 overflow-x-hidden"'
);

// 5. Replace inline status label mapping
code = code.replace(
  /\{\(\{ active: t\("statusActive"\), running: t\("statusRunning"\), idle: t\("statusIdle"\), inactive: t\("statusDisabled"\), maintenance: t\("statusMaintenance"\) \} as Record<string, string>\)\[machine\.status\] \|\| sc\.label\}/,
  '{getStatusLabel(machine.status)}'
);

// 6. Fix theme colors in dialog header and footer per AGENTS.md Fix #2
code = code.replace(
  "borderBottom: '1px solid rgba(255,255,255,0.07)'",
  "borderBottom: '1px solid var(--border)'"
);
code = code.replace(
  "color: '#f1f5f9'",
  "color: 'var(--foreground)'"
);
code = code.replace(
  "color: '#64748b'",
  "color: 'var(--muted-foreground)'"
);
code = code.replace(
  "borderTop: '1px solid rgba(255,255,255,0.07)'",
  "borderTop: '1px solid var(--border)'"
);
code = code.replace(
  "background: 'rgba(255,255,255,0.06)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.10)'",
  "background: 'var(--muted)', color: 'var(--muted-foreground)', border: '1px solid var(--border)'"
);

// 7. Update ConfirmDeleteSheet entityLabel and consequenceText
code = code.replace(
  'entityLabel="machine"',
  'entityLabel={t("entityMachine")}'
);
code = code.replace(
  'consequenceText="will be permanently removed from machine management. This cannot be undone."',
  'consequenceText={t("deleteConsequence")}'
);

fs.writeFileSync(filePath, code, 'utf8');
console.log('Machines page transformed successfully!');
