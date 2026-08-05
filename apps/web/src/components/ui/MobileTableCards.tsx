"use client";

import { cn } from "@/lib/utils";

// ─── MobileTableCards ────────────────────────────────────────
// A lightweight helper that renders an array of data rows as
// stacked mobile cards. Each card shows a primary "title" field
// and remaining fields as label/value pairs.
//
// Usage:
//   <MobileTableCards
//     data={rows}
//     fields={[
//       { key: "product_name", label: "Product", primary: true },
//       { key: "quantity",     label: "Quantity" },
//       { key: "total_amount", label: "Amount", render: (v) => formatCurrency(v) },
//     ]}
//     className="md:hidden"
//   />

export interface MobileField<T = any> {
  /** The key on the data object */
  key: string;
  /** Display label shown in the card */
  label: string;
  /** If true, this field is rendered as the card title (first one wins) */
  primary?: boolean;
  /** Optional custom render function for the value */
  render?: (value: any, row: T) => React.ReactNode;
}

interface MobileTableCardsProps<T = any> {
  data: T[];
  fields: MobileField<T>[];
  /** Optional className on the container (e.g. "md:hidden") */
  className?: string;
  /** Optional key extractor — defaults to index */
  keyExtractor?: (row: T, index: number) => string;
  /** Optional empty state message */
  emptyMessage?: string;
}

export function MobileTableCards<T extends Record<string, any>>({
  data,
  fields,
  className,
  keyExtractor,
  emptyMessage = "No data available",
}: MobileTableCardsProps<T>) {
  if (data.length === 0) {
    return (
      <div className={cn("text-center py-12", className)}>
        <p className="text-[14px] text-[var(--muted-foreground)]">{emptyMessage}</p>
      </div>
    );
  }

  const primaryField = fields.find((f) => f.primary) || fields[0];
  const detailFields = fields.filter((f) => f !== primaryField);

  return (
    <div className={cn("space-y-3 p-3 sm:p-4", className)}>
      {data.map((row, index) => {
        const key = keyExtractor ? keyExtractor(row, index) : (row.id ?? String(index));
        const titleValue = primaryField.render
          ? primaryField.render(row[primaryField.key], row)
          : row[primaryField.key];

        return (
          <div
            key={key}
            className="rounded-[14px] border border-[var(--border)] bg-[var(--card)] p-3 sm:p-4 space-y-2.5 overflow-hidden"
          >
            {/* Card title — primary field */}
            <div className="min-w-0">
              <span className="text-[11px] uppercase tracking-wider text-[var(--muted-foreground)] font-medium">
                {primaryField.label}
              </span>
              <div className="text-[15px] font-semibold text-[var(--foreground)] truncate mt-0.5">
                {titleValue ?? "—"}
              </div>
            </div>

            {/* Detail fields — 2-col grid */}
            {detailFields.length > 0 && (
              <div className="grid grid-cols-2 gap-x-3 sm:gap-x-4 gap-y-2 pt-2 border-t border-[var(--border)]/50">
                {detailFields.map((field) => {
                  const value = field.render
                    ? field.render(row[field.key], row)
                    : row[field.key];

                  return (
                    <div key={field.key} className="min-w-0">
                      <span className="text-[11px] uppercase tracking-wider text-[var(--muted-foreground)] font-medium block">
                        {field.label}
                      </span>
                      <div className="text-[14px] text-[var(--foreground)] mt-0.5 break-words">
                        {value ?? "—"}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
