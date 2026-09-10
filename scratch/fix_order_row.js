const fs = require('fs');

const filePath = 'apps/web/src/app/dashboard/purchasing/page.tsx';
let code = fs.readFileSync(filePath, 'utf8');

const targetRegex = /transition=\{\{ delay: index \* 0\.03, duration: 0\.25, ease: \[0\.16, 1, 0\.3, 1\] \}\}[\s\S]*?<TableCell className="py-3\.5 text-right pr-4">/;

const cleanReplacement = `transition={{ delay: index * 0.03, duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                          className="group glass-table-row hover:bg-[var(--muted)] border-b border-[var(--border)] transition-colors"
                        >
                          <TableCell className="py-3.5 pl-5">
                            <div className="flex items-center gap-3">
                              <div className="w-[40px] h-[40px] rounded-[10px] bg-[var(--muted)] flex items-center justify-center flex-shrink-0">
                                <ShoppingCart className="h-[18px] w-[18px] text-[var(--muted-foreground)]" />
                              </div>
                              <div>
                                <span className="text-[15px] font-bold text-[var(--primary)] block leading-[20px]">
                                  {order.poNumber}
                                </span>
                                <span className="text-[13px] text-[var(--muted-foreground)] mt-0.5 block">
                                  {order.vendorName}
                                </span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-3.5">
                            <span className="text-[15px] font-medium text-[var(--foreground)]">
                              {t("itemsCount", { count: order.items.length })}
                            </span>
                          </TableCell>
                          <TableCell className="py-3.5">
                            <span className="text-[15px] font-semibold text-[var(--foreground)]">
                              {formatCurrency(order.totalAmount)}
                            </span>
                            <span className="text-[11px] text-[var(--muted-foreground)] block">
                              {t("taxLabel")} {formatCurrency(order.taxAmount)}
                            </span>
                          </TableCell>
                          <TableCell className="py-3.5">
                            <IOSBadge color={statusConfig.color} variant="tinted" dot size="medium">
                              {getStatusLabel(order.status)}
                            </IOSBadge>
                          </TableCell>
                          <TableCell className="py-3.5">
                            <span className="text-[13px] text-[var(--muted-foreground)]">
                              {new Date(order.createdAt).toLocaleDateString(dateLocale, {
                                day: "2-digit",
                                month: "short",
                                year: "2-digit",
                              })}
                            </span>
                          </TableCell>
                          <TableCell className="py-3.5 text-right pr-4">`;

if (targetRegex.test(code)) {
  code = code.replace(targetRegex, cleanReplacement);
  fs.writeFileSync(filePath, code, 'utf8');
  console.log('Successfully fixed order table row!');
} else {
  console.error('Target regex not found in code!');
}
