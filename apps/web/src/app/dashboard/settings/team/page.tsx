"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { variantsFadeUp } from "@/lib/motion";
import {
  Users, UserPlus, Shield, ChevronDown, ChevronRight, X, Loader2,
  Check, RotateCcw, Mail, Clock, AlertCircle,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { IOSCard, IOSButton, IOSInput } from "@/components/ui/ios";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  PERMISSION_SECTIONS, ROLE_PRESETS, resolvePermissions,
  countPermissions, type FlatPermissionMap, type RoleType,
} from "@/lib/permissions";
import { SettingsHeader } from "../SettingsHeader";

// ─── Types ──────────────────────────────────────────────────────
interface TeamMember {
  id: string; fullName: string; email: string; phone: string;
  avatar_url: string | null; role: string;
  customPermissions: FlatPermissionMap | null;
  resolvedPermissions: FlatPermissionMap;
  permissionCount: number; lastActiveAt: string | null;
  isActive: boolean; status: string; department: string | null;
  employeeId: string | null; createdAt: string;
}

interface PendingInvite {
  id: string; email: string; role: string; status: string;
  invitedByName: string; expiresAt: string; createdAt: string;
}

const ROLE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Owner: { bg: "rgba(255,159,10,0.12)", text: "#FF9F0A", border: "rgba(255,159,10,0.25)" },
  Admin: { bg: "rgba(255,159,10,0.12)", text: "#FF9F0A", border: "rgba(255,159,10,0.25)" },
  Manager: { bg: "rgba(10,132,255,0.12)", text: "#0A84FF", border: "rgba(10,132,255,0.25)" },
  Staff: { bg: "rgba(48,209,88,0.12)", text: "#30D158", border: "rgba(48,209,88,0.25)" },
  Accountant: { bg: "rgba(191,90,242,0.12)", text: "#BF5AF2", border: "rgba(191,90,242,0.25)" },
};

function RoleBadge({ role, label }: { role: string; label?: string }) {
  const c = ROLE_COLORS[role] || ROLE_COLORS.Staff;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", padding: "3px 10px", borderRadius: 8, fontSize: 12, fontWeight: 600, background: c.bg, color: c.text, border: `1px solid ${c.border}` }}>
      {label || role}
    </span>
  );
}

function timeAgo(dateStr: string | null, t: any): string {
  if (!dateStr) return t("teamPage.timeNever");
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return t("teamPage.timeJustNow");
  if (mins < 60) return t("teamPage.timeMinsAgo", { count: mins });
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return t("teamPage.timeHoursAgo", { count: hrs });
  const days = Math.floor(hrs / 24);
  if (days < 30) return t("teamPage.timeDaysAgo", { count: days });
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

// ─── Main Page ──────────────────────────────────────────────────
export default function TeamPage() {
  const t = useTranslations("settings");
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [editMember, setEditMember] = useState<TeamMember | null>(null);
  const [showInvite, setShowInvite] = useState(false);

  const fetchTeam = useCallback(async () => {
    try {
      const res = await fetch("/api/team");
      const data = await res.json();
      if (data.members) setMembers(data.members);
      if (data.pendingInvitations) setInvites(data.pendingInvitations);
    } catch { toast.error(t("teamPage.toastTeamLoadFailed")); }
    finally { setLoading(false); }
  }, [t]);

  useEffect(() => { fetchTeam(); }, [fetchTeam]);

  const activeCount = members.filter(m => m.isActive).length;

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 400 }}>
        <Loader2 style={{ width: 28, height: 28, color: "#0A84FF", animation: "spin 1s linear infinite" }} />
        <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 overflow-x-hidden space-y-6 max-w-4xl mx-auto pb-16 px-4 sm:px-0">
      <SettingsHeader
        title={t("teamPage.title")}
        subtitle={t("teamPage.subtitle")}
        icon={Users}
        iconColor="#0A84FF"
      >
        <IOSButton
          variant="filled"
          color="blue"
          onClick={() => setShowInvite(true)}
          className="text-[14px] font-semibold h-[42px] px-5 rounded-[12px]"
        >
          <UserPlus size={16} className="mr-2" /> {t("teamPage.inviteMember")}
        </IOSButton>
      </SettingsHeader>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 24 }}>
        {[
          { label: t("teamPage.statTotal"), value: members.length, color: "#0A84FF" },
          { label: t("teamPage.statActive"), value: activeCount, color: "#30D158" },
          { label: t("teamPage.statPending"), value: invites.length, color: "#FF9F0A" },
        ].map(s => (
          <IOSCard key={s.label} className="p-4">
            <p style={{ fontSize: 12, fontWeight: 500, color: "var(--muted-foreground)", margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>{s.label}</p>
            <p style={{ fontSize: 28, fontWeight: 700, color: s.color, margin: 0 }}>{s.value}</p>
          </IOSCard>
        ))}
      </div>

      {/* Members Table */}
      <IOSCard className="p-0 overflow-hidden">
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {[t("teamPage.thMember"), t("teamPage.thRole"), t("teamPage.thLastActive"), t("teamPage.thPermissions"), ""].map((h, idx) => (
                  <th key={idx} style={{ padding: "12px 16px", fontSize: 12, fontWeight: 600, color: "var(--muted-foreground)", textAlign: "left", textTransform: "uppercase", letterSpacing: "0.5px" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {members.map((m, i) => (
                <tr key={m.id} style={{ borderBottom: i < members.length - 1 ? "1px solid var(--border)" : "none", opacity: m.isActive ? 1 : 0.5 }}>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 12, background: "var(--muted)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "var(--muted-foreground)", flexShrink: 0, overflow: "hidden" }}>
                        {m.avatar_url ? <img src={m.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : m.fullName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 600, color: "var(--foreground)", margin: 0 }}>{m.fullName}{!m.isActive && <span style={{ fontSize: 11, color: "#FF453A", marginLeft: 6 }}>{t("teamPage.deactivated")}</span>}</p>
                        <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: 0 }}>{m.email}</p>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "12px 16px" }}><RoleBadge role={m.role} label={t(`teamPage.roles.${m.role}`) || m.role} /></td>
                  <td style={{ padding: "12px 16px", fontSize: 13, color: "var(--muted-foreground)" }}>{timeAgo(m.lastActiveAt, t)}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ fontSize: 13, color: "var(--muted-foreground)", display: "flex", alignItems: "center", gap: 4 }}>
                      <Shield size={13} style={{ opacity: 0.5 }} /> {m.permissionCount}/{Object.keys(ROLE_PRESETS.Owner.permissions).length}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px", textAlign: "right" }}>
                    <button onClick={() => setEditMember(m)} style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--muted)", color: "var(--foreground)", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>{t("teamPage.btnEdit")}</button>
                  </td>
                </tr>
              ))}
              {members.length === 0 && (
                <tr><td colSpan={5} style={{ padding: 40, textAlign: "center", color: "var(--muted-foreground)", fontSize: 14 }}>{t("teamPage.emptyMembers")}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </IOSCard>

      {/* Pending Invitations */}
      {invites.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h3 style={{ fontSize: 17, fontWeight: 600, color: "var(--foreground)", margin: "0 0 12px" }}>{t("teamPage.pendingInvitations")}</h3>
          <IOSCard className="p-0 overflow-hidden">
            {invites.map((inv, i) => (
              <div key={inv.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: i < invites.length - 1 ? "1px solid var(--border)" : "none", gap: 12, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Mail size={16} style={{ color: "#FF9F0A", flexShrink: 0 }} />
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 500, color: "var(--foreground)", margin: 0 }}>{inv.email}</p>
                    <p style={{ fontSize: 12, color: "var(--muted-foreground)", margin: 0, display: "flex", alignItems: "center", gap: 4 }}>
                      <Clock size={11} /> {t("teamPage.expiresIn", { time: timeAgo(inv.expiresAt, t) })}
                    </p>
                  </div>
                </div>
                <RoleBadge role={inv.role} label={t(`teamPage.roles.${inv.role}`) || inv.role} />
              </div>
            ))}
          </IOSCard>
        </div>
      )}

      {/* Edit Drawer */}
      <AnimatePresence>
        {editMember && <EditDrawer member={editMember} onClose={() => setEditMember(null)} onSaved={fetchTeam} />}
      </AnimatePresence>

      {/* Invite Modal */}
      <AnimatePresence>
        {showInvite && <InviteModal onClose={() => setShowInvite(false)} onInvited={fetchTeam} />}
      </AnimatePresence>
    </div>
  );
}

// ─── Edit Drawer ────────────────────────────────────────────────
function EditDrawer({ member, onClose, onSaved }: { member: TeamMember; onClose: () => void; onSaved: () => void }) {
  const t = useTranslations("settings");
  const [role, setRole] = useState(member.role);
  const [perms, setPerms] = useState<FlatPermissionMap>(() => resolvePermissions(member.role, member.customPermissions));
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [deactivating, setDeactivating] = useState(false);

  const toggleSection = (id: string) => setExpanded(p => ({ ...p, [id]: !p[id] }));

  const handleRoleChange = (newRole: string) => {
    setRole(newRole);
    setPerms(resolvePermissions(newRole, null));
  };

  const resetToDefaults = () => setPerms(resolvePermissions(role, null));

  const handleSave = async () => {
    setSaving(true);
    try {
      const rolePreset = resolvePermissions(role, null);
      const custom: FlatPermissionMap = {};
      for (const [k, v] of Object.entries(perms)) {
        if (rolePreset[k] !== v) custom[k] = v;
      }

      await fetch(`/api/team/${member.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, customPermissions: Object.keys(custom).length > 0 ? custom : null }),
      });

      toast.success(t("teamPage.toastPermissionsUpdated"));
      onSaved();
      onClose();
    } catch { toast.error(t("teamPage.toastPermissionsSaveFailed")); }
    finally { setSaving(false); }
  };

  const handleDeactivate = async () => {
    if (!confirm(t("teamPage.confirmDeactivate", { name: member.fullName }))) return;
    setDeactivating(true);
    try {
      const res = await fetch(`/api/team/${member.id}`, { method: "DELETE" });
      if (res.ok) { toast.success(t("teamPage.toastUserDeactivated")); onSaved(); onClose(); }
      else { const d = await res.json(); toast.error(d.error || t("teamPage.toastDeactivateFailed")); }
    } catch { toast.error(t("teamPage.toastDeactivateFailed")); }
    finally { setDeactivating(false); }
  };

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 50, backdropFilter: "blur(4px)" }} />
      <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: "min(400px, 100vw)", background: "var(--card)", borderLeft: "1px solid var(--border)", zIndex: 51, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Header */}
        <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--foreground)", margin: 0 }}>{t("teamPage.editDrawerTitle")}</h3>
            <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: "2px 0 0" }}>{member.email}</p>
          </div>
          <button onClick={onClose} style={{ padding: 6, borderRadius: 8, background: "var(--muted)", border: "none", cursor: "pointer", color: "var(--muted-foreground)" }}>
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
          {/* User info */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24, padding: 16, borderRadius: 16, background: "var(--muted)" }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: "var(--muted)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, color: "var(--muted-foreground)" }}>
              {member.fullName.charAt(0).toUpperCase()}
            </div>
            <div>
              <p style={{ fontSize: 16, fontWeight: 600, color: "var(--foreground)", margin: 0 }}>{member.fullName}</p>
              <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: 0 }}>{member.email}</p>
            </div>
          </div>

          {/* Role Selector */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "var(--muted-foreground)", display: "block", marginBottom: 8 }}>{t("teamPage.roleLabel")}</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {(["Owner", "Manager", "Staff", "Accountant"] as const).map(r => {
                const c = ROLE_COLORS[r];
                const sel = role === r || (r === "Owner" && role === "Admin");
                return (
                  <button key={r} onClick={() => handleRoleChange(r)} style={{
                    padding: "10px 14px", borderRadius: 12, border: `1.5px solid ${sel ? c.border : "var(--border)"}`,
                    background: sel ? c.bg : "transparent", cursor: "pointer", textAlign: "left",
                  }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: sel ? c.text : "var(--foreground)", margin: 0 }}>{t(`teamPage.roles.${r}`)}</p>
                    <p style={{ fontSize: 11, color: "var(--muted-foreground)", margin: "2px 0 0" }}>{t(`teamPage.roles.${r}Desc`).slice(0, 40)}…</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Permission Toggles */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "var(--muted-foreground)" }}>{t("teamPage.permissionsLabel")} ({countPermissions(perms)})</label>
              <button onClick={resetToDefaults} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#0A84FF", background: "none", border: "none", cursor: "pointer", fontWeight: 500 }}>
                <RotateCcw size={12} /> {t("teamPage.resetDefaults")}
              </button>
            </div>

            {PERMISSION_SECTIONS.map(section => (
              <div key={section.id} style={{ marginBottom: 8, borderRadius: 12, border: "1px solid var(--border)", overflow: "hidden" }}>
                <button onClick={() => toggleSection(section.id)} style={{
                  width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "10px 14px", background: "var(--muted)", border: "none", cursor: "pointer",
                }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "var(--foreground)" }}>{section.label}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
                      {section.permissions.filter(p => perms[p.key]).length}/{section.permissions.length}
                    </span>
                    {expanded[section.id] ? <ChevronDown size={14} style={{ color: "var(--muted-foreground)" }} /> : <ChevronRight size={14} style={{ color: "var(--muted-foreground)" }} />}
                  </div>
                </button>
                {expanded[section.id] && (
                  <div style={{ padding: "4px 0" }}>
                    {section.permissions.map(p => (
                      <div key={p.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 14px" }}>
                        <span style={{ fontSize: 13, color: "var(--foreground)" }}>{p.label}</span>
                        <Switch checked={perms[p.key] || false} onCheckedChange={(v: boolean) => setPerms(prev => ({ ...prev, [p.key]: v }))} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "16px 20px", borderTop: "1px solid var(--border)", display: "flex", gap: 10, flexShrink: 0 }}>
          <button onClick={handleDeactivate} disabled={deactivating} style={{
            padding: "10px 16px", borderRadius: 12, border: "1px solid rgba(255,69,58,0.3)", background: "rgba(255,69,58,0.08)",
            color: "#FF453A", fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: deactivating ? 0.5 : 1,
          }}>
            {deactivating ? "…" : t("teamPage.btnDeactivate")}
          </button>
          <div style={{ flex: 1 }} />
          <IOSButton variant="gray" onClick={onClose} className="text-[13px] h-[40px] px-4 rounded-[12px]">{t("teamPage.btnCancel")}</IOSButton>
          <IOSButton variant="filled" color="blue" onClick={handleSave} disabled={saving}
            className="text-[13px] font-semibold h-[40px] px-5 rounded-[12px]">
            {saving ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Check size={14} />}
            <span style={{ marginLeft: 4 }}>{saving ? t("teamPage.saving") : t("teamPage.btnSave")}</span>
          </IOSButton>
        </div>
        <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
      </motion.div>
    </>
  );
}

// ─── Invite Modal ───────────────────────────────────────────────
function InviteModal({ onClose, onInvited }: { onClose: () => void; onInvited: () => void }) {
  const t = useTranslations("settings");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>("Staff");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !email.includes("@")) { setError(t("teamPage.errorEmailInvalid")); return; }

    setSending(true);
    try {
      const res = await fetch("/api/team/invite", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || t("teamPage.errorInviteFailed")); return; }
      toast.success(t("teamPage.toastInviteSuccess", { email }));
      onInvited(); onClose();
    } catch { setError(t("teamPage.errorNetwork")); }
    finally { setSending(false); }
  };

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 50, backdropFilter: "blur(4px)" }} />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }}
        style={{ position: "fixed", inset: 0, margin: "auto", height: "fit-content", width: "min(420px, calc(100vw - 32px))", background: "var(--card)", borderRadius: 24, border: "1px solid var(--border)", zIndex: 51, overflow: "hidden" }}>

        <div style={{ padding: "24px 24px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ fontSize: 20, fontWeight: 700, color: "var(--foreground)", margin: 0 }}>{t("teamPage.inviteModalTitle")}</h3>
          <button onClick={onClose} style={{ padding: 6, borderRadius: 8, background: "var(--muted)", border: "none", cursor: "pointer", color: "var(--muted-foreground)" }}><X size={18} /></button>
        </div>

        <form onSubmit={handleInvite} style={{ padding: 24 }}>
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "var(--muted-foreground)", display: "block", marginBottom: 6 }}>{t("teamPage.emailLabel")}</label>
            <IOSInput type="email" value={email} onChange={(e: any) => setEmail(e.target.value)} placeholder={t("teamPage.emailPlaceholder")} className="h-[44px]" required />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "var(--muted-foreground)", display: "block", marginBottom: 8 }}>{t("teamPage.roleLabel")}</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {(["Manager", "Staff", "Accountant"] as const).map(r => {
                const c = ROLE_COLORS[r]; const sel = role === r;
                return (
                  <button type="button" key={r} onClick={() => setRole(r)} style={{
                    padding: "10px 14px", borderRadius: 12, border: `1.5px solid ${sel ? c.border : "var(--border)"}`,
                    background: sel ? c.bg : "transparent", cursor: "pointer", textAlign: "left",
                  }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: sel ? c.text : "var(--foreground)", margin: 0 }}>{t(`teamPage.roles.${r}`)}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {error && (
            <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(255,69,58,0.1)", border: "1px solid rgba(255,69,58,0.2)", color: "#FF453A", fontSize: 13, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
              <AlertCircle size={14} /> {error}
            </div>
          )}

          <IOSButton type="submit" variant="filled" color="blue" disabled={sending}
            className="w-full text-[15px] font-semibold h-[44px] rounded-[14px]">
            {sending ? <><Loader2 size={16} style={{ marginRight: 6, animation: "spin 1s linear infinite" }} /> {t("teamPage.sending")}</> : <><Mail size={16} style={{ marginRight: 6 }} /> {t("teamPage.btnSendInvite")}</>}
          </IOSButton>
        </form>
        <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
      </motion.div>
    </>
  );
}
