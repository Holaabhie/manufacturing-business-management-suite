const fs = require('fs');

// ── 1. MaterialsStep.tsx ──
let matFile = 'apps/web/src/components/production/MaterialsStep.tsx';
let matCode = fs.readFileSync(matFile, 'utf8').replace(/\r\n/g, '\n');
matCode = matCode.replace(
  `{t.items.length} items{t.productName ? \` · \${t.productName}\` : ""}`,
  `{t("summaryItemsCount", { count: t.items.length })}{t.productName ? \` · \${t.productName}\` : ""}`
);
fs.writeFileSync(matFile, matCode.replace(/\n/g, '\r\n'), 'utf8');
console.log('Fixed MaterialsStep.tsx');

// ── 2. create/page.tsx ──
let crFile = 'apps/web/src/app/dashboard/production/create/page.tsx';
let crCode = fs.readFileSync(crFile, 'utf8').replace(/\r\n/g, '\n');

crCode = crCode.replace(
  'toast.success("Production created successfully!");',
  'toast.success(tToast("createSuccess"));'
);

crCode = crCode.replace(
  `<span className="text-xs text-muted-foreground">{order.quantity} units</span>`,
  `<span className="text-xs text-muted-foreground">{t("orderQtyUnits", { qty: order.quantity })}</span>`
);

crCode = crCode.replace(
  `<span className="text-muted-foreground whitespace-nowrap">Product: </span>`,
  `<span className="text-muted-foreground whitespace-nowrap">{t("lblProduct")}: </span>`
);
crCode = crCode.replace(
  `<span className="text-muted-foreground whitespace-nowrap">Client: </span>`,
  `<span className="text-muted-foreground whitespace-nowrap">{t("lblClient")}: </span>`
);
crCode = crCode.replace(
  `<span className="text-muted-foreground whitespace-nowrap">Materials: </span>`,
  `<span className="text-muted-foreground whitespace-nowrap">{t("stepMaterials")}: </span>`
);
crCode = crCode.replace(
  `{selectedMaterials.length} items</span>`,
  `{t("summaryItemsCount", { count: selectedMaterials.length })}</span>`
);
crCode = crCode.replace(
  `<span className="text-muted-foreground whitespace-nowrap">Machines: </span>`,
  `<span className="text-muted-foreground whitespace-nowrap">{t("lblMachineAssigned")}: </span>`
);
crCode = crCode.replace(
  `<span className="text-muted-foreground whitespace-nowrap">Operators: </span>`,
  `<span className="text-muted-foreground whitespace-nowrap">{t("lblOperatorAssigned")}: </span>`
);
crCode = crCode.replace(
  `<span className="text-muted-foreground whitespace-nowrap">Target: </span>`,
  `<span className="text-muted-foreground whitespace-nowrap">{t("lblTarget")}: </span>`
);
crCode = crCode.replace(
  `{expectedOutput || selectedOrder?.quantity || 0} units</span>`,
  `{t("orderQtyUnits", { qty: expectedOutput || selectedOrder?.quantity || 0 })}</span>`
);

crCode = crCode.replace(
  `Continue\n                                    <ChevronRight className="h-4 w-4" />`,
  `{t("btnContinue")}\n                                    <ChevronRight className="h-4 w-4" />`
);
crCode = crCode.replace(
  `Creating...\n                                    </>`,
  `{t("btnLaunching")}\n                                    </>`
);
crCode = crCode.replace(
  `"Launch Production"\n                                )}`,
  `t("btnLaunch")\n                                )}`
);

fs.writeFileSync(crFile, crCode.replace(/\n/g, '\r\n'), 'utf8');
console.log('Fixed create/page.tsx');

// ── 3. [id]/page.tsx ──
let idFile = 'apps/web/src/app/dashboard/production/[id]/page.tsx';
let idCode = fs.readFileSync(idFile, 'utf8').replace(/\r\n/g, '\n');

if (!idCode.includes('const tFloor = useTranslations("production.floor");')) {
  idCode = idCode.replace(
    'const t = useTranslations("production.detail");',
    'const t = useTranslations("production.detail");\n    const tFloor = useTranslations("production.floor");'
  );
}

// Action buttons
idCode = idCode.replace(
  `<Play className="h-4 w-4" />\n                            Start Production`,
  `<Play className="h-4 w-4" />\n                            {t("btnStart")}`
);
idCode = idCode.replace(
  `<Pause className="h-4 w-4" />\n                            Pause`,
  `<Pause className="h-4 w-4" />\n                            {t("btnPause")}`
);
idCode = idCode.replace(
  `<CheckCircle2 className="h-4 w-4" />\n                            Complete`,
  `<CheckCircle2 className="h-4 w-4" />\n                            {t("btnComplete")}`
);
idCode = idCode.replace(
  `<Play className="h-4 w-4" />\n                            Resume`,
  `<Play className="h-4 w-4" />\n                            {t("btnResume")}`
);
idCode = idCode.replace(
  `<Users className="h-4 w-4" />\n                        Assign Staff`,
  `<Users className="h-4 w-4" />\n                        {t("btnAssignStaff")}`
);

// Progress card & stats
idCode = idCode.replace(
  `<h2 className="text-base font-semibold">Production Progress</h2>`,
  `<h2 className="text-base font-semibold">{t("tabProgress")}</h2>`
);
idCode = idCode.replace(
  `{production.rejectQuantity} rejected`,
  `{tFloor("rejectedCount", { count: production.rejectQuantity })}`
);
idCode = idCode.replace(
  `% wastage rate)`,
  `{t("statWastageRate")})`
);
idCode = idCode.replace(
  `<span>Efficiency</span>`,
  `<span>{t("statEfficiency")}</span>`
);
idCode = idCode.replace(
  `Output vs target\n                                </span>`,
  `{t("statOutputVsTarget")}\n                                </span>`
);
idCode = idCode.replace(
  `<span>Material Used</span>`,
  `<span>{t("statMaterialUsed")}</span>`
);
idCode = idCode.replace(
  `Total\n                                    </span>\n                                    <span className="font-semibold text-foreground">\n                                        {totalConsumed.toLocaleString()}`,
  `{t("statTotalConsumed")}\n                                    </span>\n                                    <span className="font-semibold text-foreground">\n                                        {totalConsumed.toLocaleString()}`
);
idCode = idCode.replace(
  `<span>Wastage</span>`,
  `<span>{t("statWastage")}</span>`
);
idCode = idCode.replace(
  `<span>Staff</span>`,
  `<span>{t("secStaff", { count: production.assignedStaff?.length || 0 })}</span>`
);
idCode = idCode.replace(
  `produced\n                                </span>`,
  `{t("statProduced")}\n                                </span>`
);

// Tabs
idCode = idCode.replace(
  `Update Progress\n                    </TabsTrigger>`,
  `{t("tabUpdateProgress")}\n                    </TabsTrigger>`
);
idCode = idCode.replace(
  `Production Details\n                    </TabsTrigger>`,
  `{t("tabDetails")}\n                    </TabsTrigger>`
);
idCode = idCode.replace(
  `Activity Log\n                    </TabsTrigger>`,
  `{t("tabActivityLog")}\n                    </TabsTrigger>`
);

// Override Mode & Notices
idCode = idCode.replace(
  `<p className="text-xs font-semibold text-amber-700 dark:text-amber-400">Admin Override Mode</p>\n                                <p className="text-[10px] text-muted-foreground">Turn on to update production progress directly</p>`,
  `<p className="text-xs font-semibold text-amber-700 dark:text-amber-400">{t("overrideModeTitle")}</p>\n                                <p className="text-[10px] text-muted-foreground">{t("overrideModeDesc")}</p>`
);
idCode = idCode.replace(
  `This production has been completed. No further updates are\n                                        possible.`,
  `{t("completedNotice")}`
);
idCode = idCode.replace(
  `Enable Override Mode above to update production quantities.`,
  `{t("overrideNotice")}`
);
idCode = idCode.replace(
  `<p className="text-xs text-muted-foreground">Produced</p>`,
  `<p className="text-xs text-muted-foreground">{t("statProduced")}</p>`
);
idCode = idCode.replace(
  `<p className="text-xs text-muted-foreground">Rejected</p>`,
  `<p className="text-xs text-muted-foreground">{t("statRejected")}</p>`
);
idCode = idCode.replace(
  `Target: {production.expectedOutput}`,
  `{t("lblTarget")}: {production.expectedOutput}`
);
idCode = idCode.replace(
  `· Progress: {progressPct}%`,
  `· {t("lblProgress")}: {progressPct}%`
);

// Update progress inputs
idCode = idCode.replace(
  `Record the current produced and rejected quantities.`,
  `{t("updateOutputDesc")}`
);
idCode = idCode.replace(
  `Produced Quantity\n                                            </Label>`,
  `{t("lblProducedQty")}\n                                            </Label>`
);
idCode = idCode.replace(
  `Rejected Quantity\n                                            </Label>`,
  `{t("lblRejectedQty")}\n                                            </Label>`
);
idCode = idCode.replace(
  `Rejected qty cannot exceed produced qty`,
  `{t("errRejectExceedsProduced")}`
);
idCode = idCode.replace(
  `Update Notes (Optional)\n                                        </Label>`,
  `{t("lblUpdateNotes")}\n                                        </Label>`
);
idCode = idCode.replace(
  `placeholder="Add notes about this progress update..."`,
  `placeholder={t("placeholderUpdateNotes")}`
);
idCode = idCode.replace(
  `Saving...\n                                                </>`,
  `{t("btnSaving")}\n                                                </>`
);
idCode = idCode.replace(
  `"Save Progress"\n                                            )}`,
  `t("btnSaveProgress")\n                                            )}`
);

// Progress history
idCode = idCode.replace(
  `<h3 className="text-sm font-semibold mb-3">Progress History</h3>`,
  `<h3 className="text-sm font-semibold mb-3">{t("secProgressHistory")}</h3>`
);
idCode = idCode.replace(
  `Produced: <span className="font-semibold text-foreground">`,
  `{t("lblProduced")}: <span className="font-semibold text-foreground">`
);
idCode = idCode.replace(
  `Rejected: <span className="font-semibold text-red-500">`,
  `{t("lblRejected")}: <span className="font-semibold text-red-500">`
);

// Details tab
idCode = idCode.replace(
  `Order Information\n                                </h3>`,
  `{t("secOrderInfo")}\n                                </h3>`
);
idCode = idCode.replace(
  `Production Setup\n                                </h3>`,
  `{t("secProductionSetup")}\n                                </h3>`
);
idCode = idCode.replace(
  `Materials Used ({production.materialsUsed?.length || 0})`,
  `{t("secMaterialsUsed")} ({production.materialsUsed?.length || 0})`
);
idCode = idCode.replace(
  `<p className="text-sm text-muted-foreground">No materials recorded.</p>`,
  `<p className="text-sm text-muted-foreground">{t("noMaterialsRecorded")}</p>`
);
idCode = idCode.replace(
  `Schedule\n                                </h3>`,
  `{t("secSchedule")}\n                                </h3>`
);
idCode = idCode.replace(
  `Notes\n                                </h3>`,
  `{t("secNotes")}\n                                </h3>`
);
idCode = idCode.replace(
  `<h3 className="text-base font-semibold">Activity Timeline</h3>`,
  `<h3 className="text-base font-semibold">{t("secActivityTimeline")}</h3>`
);
idCode = idCode.replace(
  `<p className="text-sm text-muted-foreground">No activity yet.</p>`,
  `<p className="text-sm text-muted-foreground">{t("noActivityYet")}</p>`
);

// Pause Dialog
idCode = idCode.replace(
  `<DialogTitle className="text-[15px] font-medium flex items-center gap-2">\n                        <Pause className="h-4 w-4 text-orange-500" />\n                        Pause Production\n                    </DialogTitle>`,
  `<DialogTitle className="text-[15px] font-medium flex items-center gap-2">\n                        <Pause className="h-4 w-4 text-orange-500" />\n                        {t("pauseModalTitle")}\n                    </DialogTitle>`
);
idCode = idCode.replace(
  `Optionally provide a reason for pausing.`,
  `{t("pauseModalDesc")}`
);
idCode = idCode.replace(
  `Reason (Optional)\n                        </Label>`,
  `{t("lblPauseReason")}\n                        </Label>`
);
idCode = idCode.replace(
  `placeholder="e.g. Machine malfunction, Material shortage..."`,
  `placeholder={t("placeholderPauseReason")}`
);
idCode = idCode.replace(
  `Cancel\n                        </Button>\n                        <Button\n                            className="rounded-xl bg-orange-600 hover:bg-orange-700 text-white"\n                            onClick={handlePauseConfirm}\n                        >\n                            Pause Production`,
  `{t("btnCancel")}\n                        </Button>\n                        <Button\n                            className="rounded-xl bg-orange-600 hover:bg-orange-700 text-white"\n                            onClick={handlePauseConfirm}\n                        >\n                            {t("btnConfirmPause")}`
);

// Complete Dialog
idCode = idCode.replace(
  `<DialogTitle className="text-[15px] font-medium flex items-center gap-2">\n                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />\n                        Complete Production\n                    </DialogTitle>`,
  `<DialogTitle className="text-[15px] font-medium flex items-center gap-2">\n                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />\n                        {t("completeModalTitle")}\n                    </DialogTitle>`
);
idCode = idCode.replace(
  `Mark this production as completed? This action is final.`,
  `{t("completeModalDesc")}`
);
idCode = idCode.replace(
  `<span className="text-muted-foreground">Produced:</span>`,
  `<span className="text-muted-foreground">{t("lblProduced")}:</span>`
);
idCode = idCode.replace(
  `<span className="text-muted-foreground">Rejected:</span>`,
  `<span className="text-muted-foreground">{t("lblRejected")}:</span>`
);
idCode = idCode.replace(
  `<span className="text-muted-foreground">Target:</span>`,
  `<span className="text-muted-foreground">{t("lblTarget")}:</span>`
);
idCode = idCode.replace(
  `Cancel\n                        </Button>\n                        <Button\n                            className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"\n                            onClick={handleCompleteConfirm}\n                        >\n                            Complete`,
  `{t("btnCancel")}\n                        </Button>\n                        <Button\n                            className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"\n                            onClick={handleCompleteConfirm}\n                        >\n                            {t("btnConfirmComplete")}`
);

fs.writeFileSync(idFile, idCode.replace(/\n/g, '\r\n'), 'utf8');
console.log('Fixed [id]/page.tsx');
