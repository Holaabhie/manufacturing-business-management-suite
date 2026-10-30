import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Building2, MoreVertical, Trash2, UserPlus } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IOSCard } from "@/components/ui/ios/IOSCard";
import { IOSButton } from "@/components/ui/ios/IOSButton";
import { MobileTableCards } from "@/components/ui/MobileTableCards";
import type { Vendor } from "./types";

interface PurchasingVendorsTableProps {
  vendors: Vendor[];
  vendorsLoading: boolean;
  isAdmin: boolean;
  onOpenVendorDialog: () => void;
  onSelectVendor: (vendor: Vendor) => void;
  onDeleteVendor: (vendor: Vendor) => void;
}

export function PurchasingVendorsTable({
  vendors,
  vendorsLoading,
  isAdmin,
  onOpenVendorDialog,
  onSelectVendor,
  onDeleteVendor,
}: PurchasingVendorsTableProps) {
  const t = useTranslations("purchasing.page");

  return (
    <>
      {/* ── Mobile Card View ── */}
      {!vendorsLoading && vendors.length > 0 && (
        <MobileTableCards
          data={vendors}
          className="md:hidden"
          fields={[
            {
              key: "name",
              label: "Vendor",
              primary: true,
              render: (_v, vendor) => (
                <span>
                  {vendor.name}{" "}
                  <span className="text-[var(--muted-foreground)] font-normal text-[13px]">
                    ({vendor.contactPerson})
                  </span>
                </span>
              ),
            },
            {
              key: "phone",
              label: "Phone",
              render: (_v, vendor) => (
                <span className="text-[var(--primary)] font-medium">
                  {vendor.phone}
                </span>
              ),
            },
            { key: "email", label: t("thEmail") },
            { key: "gstin", label: t("thGstin"), render: (v) => v || "—" },
          ]}
          emptyMessage={t("emptyVendorsTitle")}
          onCardClick={(vendor) => onSelectVendor(vendor)}
        />
      )}

      {/* ── Desktop Table ── */}
      <IOSCard
        variant="elevated"
        padding="none"
        className="overflow-hidden glass-premium !rounded-[20px] hidden md:block"
      >
        <Table>
          <TableHeader>
            <TableRow className="glass-table-header hover:bg-transparent border-b border-white/[0.07]">
              <TableHead className="font-semibold py-3 text-[13px] text-[var(--muted-foreground)] uppercase tracking-wide pl-5">
                {t("thVendorContact")}
              </TableHead>
              <TableHead className="font-semibold py-3 text-[13px] text-[var(--muted-foreground)] uppercase tracking-wide">
                {t("thPhone")}
              </TableHead>
              <TableHead className="font-semibold py-3 text-[13px] text-[var(--muted-foreground)] uppercase tracking-wide">
                Email
              </TableHead>
              <TableHead className="font-semibold py-3 text-[13px] text-[var(--muted-foreground)] uppercase tracking-wide">
                GSTIN
              </TableHead>
              <TableHead className="w-[80px] py-3" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {vendorsLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <div className="h-12 w-full rounded-[10px] bg-[var(--muted)] shimmer" />
                  </TableCell>
                  <TableCell>
                    <div className="h-12 w-full rounded-[10px] bg-[var(--muted)] shimmer" />
                  </TableCell>
                  <TableCell>
                    <div className="h-12 w-full rounded-[10px] bg-[var(--muted)] shimmer" />
                  </TableCell>
                  <TableCell>
                    <div className="h-8 w-20 rounded-[6px] bg-[var(--muted)] shimmer" />
                  </TableCell>
                  <TableCell>
                    <div className="h-8 w-8 rounded-full bg-[var(--muted)] shimmer" />
                  </TableCell>
                </TableRow>
              ))
            ) : vendors.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-16">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-[56px] h-[56px] rounded-[14px] bg-[var(--muted)] flex items-center justify-center">
                      <Building2 className="h-6 w-6 text-[var(--muted-foreground)]" />
                    </div>
                    <p className="text-[17px] font-medium text-[var(--muted-foreground)]">
                      {t("emptyVendorsTitle")}
                    </p>
                    <p className="text-[13px] text-[var(--muted-foreground)]">
                      {t("emptyVendorsSubtitle")}
                    </p>
                    <IOSButton
                      variant="filled"
                      size="small"
                      onClick={onOpenVendorDialog}
                      icon={<UserPlus className="h-3.5 w-3.5" />}
                    >
                      {t("btnAddVendor")}
                    </IOSButton>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              vendors.map((vendor, index) => (
                <motion.tr
                  key={vendor.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: index * 0.03,
                    duration: 0.25,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className="group glass-table-row hover:bg-[var(--muted)] border-b border-[var(--border)] transition-colors cursor-pointer"
                  onClick={() => onSelectVendor(vendor)}
                >
                  <TableCell className="py-3.5 pl-5">
                    <div className="flex items-center gap-3">
                      <div className="w-[40px] h-[40px] rounded-[10px] bg-[rgba(88,86,214,0.1)] flex items-center justify-center flex-shrink-0">
                        <Building2 className="h-[18px] w-[18px] text-[var(--chart-5)]" />
                      </div>
                      <div>
                        <span className="text-[15px] font-semibold text-[var(--foreground)] block leading-[20px]">
                          {vendor.name}
                        </span>
                        <span className="text-[13px] text-[var(--muted-foreground)] block mt-0.5">
                          {vendor.contactPerson}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-3.5">
                    <span className="text-[15px] text-[var(--primary)] font-medium">
                      {vendor.phone}
                    </span>
                  </TableCell>
                  <TableCell className="py-3.5">
                    <span className="text-[13px] text-[var(--muted-foreground)]">
                      {vendor.email || "—"}
                    </span>
                  </TableCell>
                  <TableCell className="py-3.5">
                    <span className="text-[13px] text-[var(--muted-foreground)] font-mono">
                      {vendor.gstin || "—"}
                    </span>
                  </TableCell>
                  <TableCell className="py-3.5 text-right pr-4">
                    {isAdmin && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={(e) => e.stopPropagation()}
                            className="h-[36px] w-[36px] rounded-[10px] flex items-center justify-center hover:bg-[var(--muted)] transition-colors cursor-pointer"
                          >
                            <MoreVertical className="h-[18px] w-[18px] text-[var(--muted-foreground)]" />
                          </motion.button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-[12px]">
                          <DropdownMenuItem
                            className="text-[var(--destructive)] rounded-[8px]"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteVendor(vendor);
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> {t("actionDeleteVendor")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </motion.tr>
              ))
            )}
          </TableBody>
        </Table>
      </IOSCard>
    </>
  );
}
