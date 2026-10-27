import React from "react";
import Link from "next/link";
import { MODULES, MODULE_GROUPS, type ModuleSlug } from "@/content/modules";
import { ModuleIcon } from "./ModuleIcon";

interface DocsSidebarProps {
  currentSlug?: ModuleSlug | string;
  className?: string;
}

export function DocsSidebar({ currentSlug, className = "" }: DocsSidebarProps) {
  return (
    <aside
      className={`w-64 xl:w-72 shrink-0 border-r border-border pr-4 overflow-y-auto scrollbar-hide select-none ${className}`}
      aria-label="Module documentation navigation"
    >
      <div className="space-y-6 pb-12 pt-2">
        <div className="px-3">
          <Link
            href="/modules"
            className="inline-flex items-center text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
          >
            All Modules Directory
          </Link>
        </div>

        {MODULE_GROUPS.map((group) => {
          const groupModules = MODULES.filter((m) => m.group === group);
          if (groupModules.length === 0) return null;

          return (
            <div key={group} className="space-y-1.5">
              <h2 className="px-3 text-xs font-bold uppercase tracking-wider text-muted-foreground/80">
                {group}
              </h2>

              <ul className="space-y-0.5">
                {groupModules.map((mod) => {
                  const isActive = mod.slug === currentSlug;
                  return (
                    <li key={mod.slug}>
                      <Link
                        href={`/modules/${mod.slug}`}
                        className={`group flex items-center justify-between min-h-[44px] px-3 py-2 rounded-xl text-sm transition-colors duration-150 ${
                          isActive
                            ? "bg-primary/10 text-primary font-semibold shadow-sm"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                        }`}
                      >
                        <span className="flex items-center gap-2.5 min-w-0">
                          <span
                            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors"
                            style={{
                              backgroundColor: isActive
                                ? mod.color.iconBg
                                : "var(--muted)",
                            }}
                          >
                            <ModuleIcon
                              name={mod.iconName}
                              className="h-4 w-4"
                              style={{
                                color: isActive
                                  ? mod.color.iconColor
                                  : "var(--foreground)",
                              }}
                            />
                          </span>
                          <span className="truncate">{mod.title}</span>
                        </span>

                        {mod.status === "beta" && (
                          <span className="ml-1.5 shrink-0 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            Beta
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
