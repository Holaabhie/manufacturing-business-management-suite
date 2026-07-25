"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Users, Check, Loader2, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface StaffUser {
    id: string;
    fullName: string;
    email: string;
    role: string;
    status: string;
}

interface AssignStaffDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    productionId: string;
    productionName: string;
    currentStaffIds?: string[];
    onSuccess?: () => void;
}

export function AssignStaffDialog({
    open,
    onOpenChange,
    productionId,
    productionName,
    currentStaffIds = [],
    onSuccess,
}: AssignStaffDialogProps) {
    const router = useRouter();
    const [staffList, setStaffList] = useState<StaffUser[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isAssigning, setIsAssigning] = useState(false);
    const [search, setSearch] = useState("");

    // Fetch staff members from /api/team
    const fetchStaff = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/team", { credentials: "include" });
            if (!res.ok) throw new Error("Failed to fetch team");
            const data = await res.json();
            const staffMembers = (data.members || []).filter(
                (m: any) => m.role === "Staff" && m.status !== "inactive"
            );
            setStaffList(staffMembers);
        } catch (err) {
            toast.error("Failed to load staff members");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (open) {
            fetchStaff();
            // Pre-select currently assigned staff
            setSelectedIds(new Set(currentStaffIds));
            setSearch("");
        }
    }, [open, fetchStaff, currentStaffIds]);

    const toggleStaff = (id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const handleAssign = async () => {
        if (isAssigning) return; // Race condition guard
        if (selectedIds.size === 0) {
            toast.error("Select at least one staff member");
            return;
        }

        setIsAssigning(true);
        try {
            const res = await fetch(
                `/api/production/${productionId}/assign-staff`,
                {
                    method: "PATCH",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        staffIds: Array.from(selectedIds),
                    }),
                }
            );

            const data = await res.json();

            if (!res.ok || !data.success) {
                toast.error(data.message || "Failed to assign staff");
                return;
            }

            toast.success("Staff assigned successfully");
            onOpenChange(false);
            router.refresh(); // Invalidate Next.js cache
            onSuccess?.();
        } catch (err: any) {
            toast.error(err.message || "Failed to assign staff");
        } finally {
            setIsAssigning(false);
        }
    };

    const filtered = staffList.filter(
        (s) =>
            s.fullName.toLowerCase().includes(search.toLowerCase()) ||
            s.email.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[440px] p-0 gap-0 rounded-2xl overflow-hidden">
                <DialogHeader className="px-5 pt-5 pb-3">
                    <DialogTitle className="text-[16px] font-semibold flex items-center gap-2">
                        <Users className="h-4.5 w-4.5 text-primary" />
                        Assign Staff
                    </DialogTitle>
                    <DialogDescription className="text-[13px] text-muted-foreground">
                        Select staff members for{" "}
                        <span className="font-medium text-foreground">
                            {productionName}
                        </span>
                    </DialogDescription>
                </DialogHeader>

                {/* Search */}
                <div className="px-5 pb-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search staff..."
                            className={cn(
                                "w-full h-9 pl-9 pr-8 rounded-xl text-[13px] transition-all",
                                "bg-muted/50 border border-border",
                                "placeholder:text-muted-foreground/50",
                                "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
                            )}
                        />
                        {search && (
                            <button
                                type="button"
                                onClick={() => setSearch("")}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground cursor-pointer"
                            >
                                <X size={13} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Staff List */}
                <div className="px-3 max-h-[280px] overflow-y-auto overscroll-contain border-t border-border">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="text-center py-10 text-[13px] text-muted-foreground">
                            {staffList.length === 0
                                ? "No staff members found in your team."
                                : "No results match your search."}
                        </div>
                    ) : (
                        <div className="py-1.5">
                            {filtered.map((staff) => {
                                const isSelected = selectedIds.has(staff.id);
                                return (
                                    <button
                                        key={staff.id}
                                        type="button"
                                        onClick={() => toggleStaff(staff.id)}
                                        className={cn(
                                            "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all cursor-pointer",
                                            isSelected
                                                ? "bg-primary/8 border border-primary/20"
                                                : "hover:bg-muted/60 border border-transparent"
                                        )}
                                    >
                                        {/* Checkbox */}
                                        <div
                                            className={cn(
                                                "w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all",
                                                isSelected
                                                    ? "bg-primary border-primary"
                                                    : "border-muted-foreground/30"
                                            )}
                                        >
                                            {isSelected && (
                                                <Check className="h-3 w-3 text-white" />
                                            )}
                                        </div>

                                        {/* Avatar + Info */}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[13px] font-medium text-foreground truncate">
                                                {staff.fullName}
                                            </p>
                                            <p className="text-[11px] text-muted-foreground truncate">
                                                {staff.email}
                                            </p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <DialogFooter className="px-5 py-4 border-t border-border bg-muted/30">
                    <div className="flex items-center justify-between w-full gap-3">
                        <p className="text-[12px] text-muted-foreground">
                            {selectedIds.size} selected
                        </p>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onOpenChange(false)}
                                className="h-9 px-4 rounded-xl text-[13px]"
                            >
                                Cancel
                            </Button>
                            <Button
                                size="sm"
                                onClick={handleAssign}
                                disabled={isAssigning || selectedIds.size === 0}
                                className="h-9 px-5 rounded-xl text-[13px] bg-primary hover:bg-primary/90 text-white gap-1.5"
                            >
                                {isAssigning ? (
                                    <>
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        Assigning...
                                    </>
                                ) : (
                                    "Assign Staff"
                                )}
                            </Button>
                        </div>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
