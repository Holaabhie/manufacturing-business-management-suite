const fs = require('fs');

const file = 'apps/web/src/app/dashboard/clients/page.tsx';
let lines = fs.readFileSync(file, 'utf8').split('\r\n');

// Find index where line is "                            placeholder={t(\"placeholderProduct\")}"
const idx = lines.findIndex(l => l.includes('placeholder={t("placeholderProduct")}'));
console.log('Found placeholder at line index:', idx);

const insertLines = [
  '                            placeholder={t("placeholderProduct")}',
  '                            required',
  '                          />',
  '                        </div>',
  '                        <div className="space-y-2 sm:col-span-1">',
  '                          <label className="text-[13px] font-medium text-[var(--muted-foreground)] pl-1">{t("lblDefaultRate")}</label>',
  '                          <IOSInput',
  '                            type="number"',
  '                            value={productForm.defaultRate}',
  '                            onChange={(e: any) => setProductForm({ ...productForm, defaultRate: e.target.value })}',
  '                            className="w-full"',
  '                            placeholder="0.00"',
  '                            min="0"',
  '                            required',
  '                          />',
  '                        </div>',
  '                        <div className="sm:col-span-1">',
  '                          <IOSButton type="submit" variant="filled" size="small" className="w-full h-[40px]" icon={<Plus className="h-4 w-4" />}>',
  '                            {t("btnAddProduct")}',
  '                          </IOSButton>',
  '                        </div>',
  '                      </form>',
  '                    </div>',
  '                </IOSCard>',
  '                )}',
  '',
  '                <div className="space-y-4">',
  '                  {loadingDetails ? (',
  '                    <div className="text-center py-10 text-[var(--muted-foreground)]"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>',
  '                  ) : clientProducts.length === 0 ? (',
  '                    <div className="flex flex-col items-center justify-center h-40 text-center p-4 glass-section rounded-[16px]">'
];

// Replace from idx up to the line before <Package ...
// In lines, idx is line 904. Line 905 is <Package ...
lines.splice(idx, 1, ...insertLines);

fs.writeFileSync(file, lines.join('\r\n'), 'utf8');
console.log('Successfully restored product form and card!');
