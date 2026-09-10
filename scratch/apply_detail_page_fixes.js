const fs = require('fs');

const targetFile = 'apps/web/src/app/dashboard/production/[id]/page.tsx';
let code = fs.readFileSync(targetFile, 'utf8');

// 1. Action buttons
code = code.replace(
  /<PlayCircle className="h-4 w-4" \/>\s*Start Production/g,
  '<PlayCircle className="h-4 w-4" />\n                            {t("btnStart")}'
);
code = code.replace(
  /<PauseCircle className="h-4 w-4" \/>\s*Pause/g,
  '<PauseCircle className="h-4 w-4" />\n                                {t("btnPause")}'
);
code = code.replace(
  /<Flag className="h-4 w-4" \/>\s*Complete/g,
  '<Flag className="h-4 w-4" />\n                                {t("btnComplete")}'
);
code = code.replace(
  /<PlayCircle className="h-4 w-4" \/>\s*Resume/g,
  '<PlayCircle className="h-4 w-4" />\n                            {t("btnResume")}'
);
code = code.replace(
  /<Users className="h-4 w-4" \/>\s*Assign Staff/g,
  '<Users className="h-4 w-4" />\n                            {t("btnAssignStaff")}'
);

// 2. Tab progress
code = code.replace(
  /<span className="text-sm font-bold">Production Progress<\/span>/g,
  '<span className="text-sm font-bold">{t("tabProgress")}</span>'
);

// 3. Rejected badge
code = code.replace(
  /\{formatNumber\(production\.rejectQuantity\)\} \{unit\} rejected/g,
  '{formatNumber(production.rejectQuantity)} {unit} {t("statRejected").toLowerCase()}'
);

// 4. KPI cards
code = code.replace(
  /<span className="text-\[11px\] font-bold uppercase tracking-wider text-muted-foreground">\s*Efficiency\s*<\/span>/g,
  '<span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">\n                            {t("statEfficiency")}\n                        </span>'
);
code = code.replace(
  /<p className="text-xs text-muted-foreground mt-1">\s*Output vs target\s*<\/p>/g,
  '<p className="text-xs text-muted-foreground mt-1">\n                        {t("statOutputVsTarget")}\n                    </p>'
);
code = code.replace(
  /<span className="text-\[11px\] font-bold uppercase tracking-wider text-muted-foreground">\s*Material Used\s*<\/span>/g,
  '<span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">\n                            {t("statMaterialUsed")}\n                        </span>'
);
code = code.replace(
  /<p className="text-xs text-muted-foreground mt-1">\s*Total \{unit\} consumed\s*<\/p>/g,
  '<p className="text-xs text-muted-foreground mt-1">\n                        {t("statTotalConsumed")} ({unit})\n                    </p>'
);
code = code.replace(
  /<span className="text-\[11px\] font-bold uppercase tracking-wider text-muted-foreground">\s*Wastage\s*<\/span>/g,
  '<span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">\n                            {t("statWastage")}\n                        </span>'
);
code = code.replace(
  /<span className="text-\[11px\] font-bold uppercase tracking-wider text-muted-foreground">\s*Staff\s*<\/span>/g,
  '<span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">\n                            {t("statStaff")}\n                        </span>'
);
code = code.replace(
  /<p className="text-xs text-muted-foreground mt-1">\s*\{production\.producedQuantity\} produced\s*<\/p>/g,
  '<p className="text-xs text-muted-foreground mt-1">\n                        {production.producedQuantity} {t("statProduced").toLowerCase()}\n                    </p>'
);

// 5. Tabs list
code = code.replace(
  /<BarChart3 className="h-3\.5 w-3\.5" \/>\s*Update Progress/g,
  '<BarChart3 className="h-3.5 w-3.5" />\n                            {t("tabUpdateProgress")}'
);
code = code.replace(
  /<Cpu className="h-3\.5 w-3\.5" \/>\s*Production Details/g,
  '<Cpu className="h-3.5 w-3.5" />\n                            {t("tabDetails")}'
);
code = code.replace(
  /<History className="h-3\.5 w-3\.5" \/>\s*Activity Log/g,
  '<History className="h-3.5 w-3.5" />\n                            {t("tabActivityLog")}'
);

// 6. Admin override
code = code.replace(
  /<p className="text-sm font-semibold" style=\{\{ color: '#facc15' \}\}>Admin Override Mode<\/p>/g,
  '<p className="text-sm font-semibold" style={{ color: \'#facc15\' }}>{t("overrideModeTitle")}</p>'
);
code = code.replace(
  /<p className="text-xs" style=\{\{ color: '#9ca3af' \}\}>Turn on to update production progress directly<\/p>/g,
  '<p className="text-xs" style={{ color: \'#9ca3af\' }}>{t("overrideModeDesc")}</p>'
);

// 7. Produced & Rejected labels
code = code.replace(
  /<p className="text-\[10px\] font-bold uppercase tracking-wider text-muted-foreground mt-1">Produced<\/p>/g,
  '<p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-1">{t("statProduced")}</p>'
);
code = code.replace(
  /<p className="text-\[10px\] font-bold uppercase tracking-wider text-muted-foreground mt-1">Rejected<\/p>/g,
  '<p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-1">{t("statRejected")}</p>'
);
code = code.replace(
  /Target: \{formatNumber\(production\.expectedOutput\)\} \{unit\} &middot; Progress: \{production\.progressPercent\}%/g,
  '{t("lblTarget")}: {formatNumber(production.expectedOutput)} {unit} &middot; {t("lblProgress")}: {production.progressPercent}%'
);
code = code.replace(
  /Target: \{formatNumber\(production\.expectedOutput\)\} \{unit\}/g,
  '{t("lblTarget")}: {formatNumber(production.expectedOutput)} {unit}'
);

// 8. Saving & Save Progress
code = code.replace(
  /<div className="h-4 w-4 border-2 border-white\/30 border-t-white rounded-full animate-spin" \/>\s*Saving\.\.\./g,
  '<div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />\n                                                {t("btnSaving")}'
);
code = code.replace(
  /<TrendingUp className="h-4 w-4" \/>\s*Save Progress/g,
  '<TrendingUp className="h-4 w-4" />\n                                                {t("btnSaveProgress")}'
);

// 9. History
code = code.replace(
  /<History className="h-3\.5 w-3\.5" \/>\s*Progress History/g,
  '<History className="h-3.5 w-3.5" />\n                                                {t("secProgressHistory")}'
);
code = code.replace(
  /<span>\s*Produced:\{" "\}/g,
  '<span>\n                                                                {t("statProduced")}:{" "}'
);
code = code.replace(
  /<span>\s*Rejected:\{" "\}/g,
  '<span>\n                                                                {t("statRejected")}:{" "}'
);

// 10. Detail items & materials
code = code.replace(
  /<DetailItem label="Operator" value=\{production\.operatorName \|\| "—"\} \/>/g,
  '<DetailItem label={t("lblOperator")} value={production.operatorName || "—"} />'
);
code = code.replace(
  /<DetailItem label="Batch No\." value=\{production\.batchNumber\} \/>/g,
  '<DetailItem label={t("lblBatchNumber")} value={production.batchNumber} />'
);
code = code.replace(
  /Materials Used \(\{production\.materials\.length\}\)/g,
  '{t("secMaterialsUsed")} ({production.materials.length})'
);
code = code.replace(
  /<p className="text-sm text-muted-foreground">\s*No materials recorded\.\s*<\/p>/g,
  '<p className="text-sm text-muted-foreground">\n                                        {t("noMaterialsRecorded")}\n                                    </p>'
);

// 11. Notes & Activity
code = code.replace(
  /<h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">\s*Notes\s*<\/h3>/g,
  '<h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">\n                                            {t("secNotes")}\n                                        </h3>'
);
code = code.replace(
  /<History className="h-5 w-5 text-muted-foreground" \/>\s*Activity Timeline/g,
  '<History className="h-5 w-5 text-muted-foreground" />\n                                {t("secActivityTimeline")}'
);
code = code.replace(
  /<p className="text-sm text-muted-foreground text-center py-8">\s*No activity yet\.\s*<\/p>/g,
  '<p className="text-sm text-muted-foreground text-center py-8">\n                                    {t("noActivityYet")}\n                                </p>'
);

// 12. Dialogs
code = code.replace(
  /<PauseCircle className="h-4 w-4 text-orange-500" \/>\s*Pause Production/g,
  '<PauseCircle className="h-4 w-4 text-orange-500" />\n                            {t("pauseModalTitle")}'
);
code = code.replace(
  /<Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">\s*Reason \(Optional\)\s*<\/Label>/g,
  '<Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">\n                                {t("lblPauseReason")}\n                            </Label>'
);
code = code.replace(
  /onClick=\{\(\) => setPauseDialogOpen\(false\)\}\s*className="flex-1 rounded-xl"\s*>\s*Cancel/g,
  'onClick={() => setPauseDialogOpen(false)}\n                                className="flex-1 rounded-xl"\n                            >\n                                {t("btnCancel")}'
);
code = code.replace(
  /disabled=\{updating\}\s*>\s*Pause Production/g,
  'disabled={updating}\n                            >\n                                {t("btnConfirmPause")}'
);

code = code.replace(
  /<Flag className="h-4 w-4 text-emerald-500" \/>\s*Complete Production/g,
  '<Flag className="h-4 w-4 text-emerald-500" />\n                            {t("completeModalTitle")}'
);
code = code.replace(
  /onClick=\{\(\) => setCompleteDialogOpen\(false\)\}\s*className="flex-1 rounded-xl"\s*>\s*Cancel/g,
  'onClick={() => setCompleteDialogOpen(false)}\n                                className="flex-1 rounded-xl"\n                            >\n                                {t("btnCancel")}'
);
code = code.replace(
  /disabled=\{updating\}\s*>\s*Complete/g,
  'disabled={updating}\n                            >\n                                {t("btnConfirmComplete")}'
);

fs.writeFileSync(targetFile, code, 'utf8');
console.log('Detail page fixes applied successfully');
