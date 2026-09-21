"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { IOSButton } from "@/components/ui/ios";
import { Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export interface BridgeDeviceItem {
  id: string;
  name: string;
  platform: string;
  appVersion: string;
  lastSeenAt: string | null;
  online: boolean;
  tally?: {
    reachable: boolean;
    company: string;
    host: string;
    port: number;
    lastError?: string | null;
  };
  revokedAt?: string | null;
  createdAt: string;
}

interface RevokeDeviceDialogProps {
  device: BridgeDeviceItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function RevokeDeviceDialog({
  device,
  open,
  onOpenChange,
  onSuccess,
}: RevokeDeviceDialogProps) {
  const t = useTranslations("settings.tallyPage");
  const [revoking, setRevoking] = useState(false);

  if (!device) return null;

  const handleRevoke = async () => {
    setRevoking(true);
    try {
      const res = await fetch(`/api/tally/bridge/devices/${device.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || t("toastRevokeFailed"));
      }
      toast.success(t("toastDeviceRevoked"));
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || t("toastRevokeFailed"));
    } finally {
      setRevoking(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[420px] p-6 rounded-[20px] bg-[var(--card)] border border-[var(--border)]">
        <DialogHeader className="space-y-3">
          <div className="h-10 w-10 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <DialogTitle className="text-[17px] font-semibold text-[var(--foreground)]">
            {t("revokeDialogTitle")}
          </DialogTitle>
          <DialogDescription className="text-[13px] text-[var(--muted-foreground)] leading-relaxed">
            {t("revokeDialogDesc", { name: device.name })}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex flex-row items-center justify-end gap-2 pt-4 border-t border-[var(--border)]">
          <IOSButton
            type="button"
            variant="gray"
            disabled={revoking}
            onClick={() => onOpenChange(false)}
            className="h-[38px] px-4 text-[13px] font-medium rounded-[10px]"
          >
            {t("revokeDialogCancel")}
          </IOSButton>
          <IOSButton
            type="button"
            variant="filled"
            color="red"
            disabled={revoking}
            onClick={handleRevoke}
            className="h-[38px] px-4 text-[13px] font-semibold rounded-[10px] bg-red-600 hover:bg-red-700 text-white"
          >
            {revoking ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : null}
            {revoking ? t("revoking") : t("revokeDialogConfirm")}
          </IOSButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
