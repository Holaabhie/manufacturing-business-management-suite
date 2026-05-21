"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2, CheckCircle2, AlertCircle, Clock, UserCheck, Mail } from "lucide-react";

type InviteState = "loading" | "valid" | "invite_expired" | "invite_used" | "invite_invalid" | "invite_revoked" | "error";

interface InvitationData {
    email: string;
    role: string;
    invitedByName: string;
    expiresAt: string;
}

export default function AcceptInvitePage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get("token");

    const [state, setState] = useState<InviteState>("loading");
    const [invitation, setInvitation] = useState<InvitationData | null>(null);
    const [errorMessage, setErrorMessage] = useState("");
    const [fullName, setFullName] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState("");

    useEffect(() => {
        if (!token) {
            setState("invite_invalid");
            setErrorMessage("No invitation token found in the URL.");
            return;
        }

        (async () => {
            try {
                const res = await fetch(`/api/invite/accept?token=${encodeURIComponent(token)}`);
                const data = await res.json();

                if (!res.ok) {
                    setState(data.error || "error");
                    setErrorMessage(data.message || "Something went wrong.");
                    return;
                }

                setInvitation(data.invitation);
                setState("valid");
            } catch {
                setState("error");
                setErrorMessage("Failed to validate invitation. Please try again.");
            }
        })();
    }, [token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitError("");

        if (!fullName.trim()) {
            setSubmitError("Please enter your full name.");
            return;
        }

        if (password.length < 6) {
            setSubmitError("Password must be at least 6 characters.");
            return;
        }

        if (password !== confirmPassword) {
            setSubmitError("Passwords do not match.");
            return;
        }

        setSubmitting(true);

        try {
            const res = await fetch("/api/invite/accept", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, fullName: fullName.trim(), password }),
            });

            const data = await res.json();

            if (!res.ok) {
                if (data.error === "email_exists") {
                    setSubmitError("An account with this email already exists. Please log in.");
                } else if (data.error === "invite_expired") {
                    setState("invite_expired");
                    setErrorMessage(data.message);
                } else if (data.error === "invite_used") {
                    setState("invite_used");
                    setErrorMessage(data.message);
                } else {
                    setSubmitError(data.message || "Failed to create account.");
                }
                return;
            }

            // Success — redirect to dashboard
            router.push(data.redirect || "/dashboard");
        } catch {
            setSubmitError("Network error. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    const roleColors: Record<string, string> = {
        Owner: "#FF9F0A",
        Manager: "#0A84FF",
        Staff: "#30D158",
        Accountant: "#BF5AF2",
    };

    // ─── Error States ───────────────────────────────────────────
    if (state === "loading") {
        return (
            <div style={{
                minHeight: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#000",
            }}>
                <Loader2 style={{ width: 32, height: 32, color: "#0A84FF", animation: "spin 1s linear infinite" }} />
                <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    if (state === "invite_expired") {
        return (
            <ErrorScreen
                icon={<Clock style={{ width: 48, height: 48, color: "#FF9F0A" }} />}
                title="Invitation Expired"
                message="This invite link has expired. Ask your admin to send a new one."
                accentColor="#FF9F0A"
            />
        );
    }

    if (state === "invite_used") {
        return (
            <ErrorScreen
                icon={<UserCheck style={{ width: 48, height: 48, color: "#30D158" }} />}
                title="Already Accepted"
                message="This invite has already been used. Try logging in instead."
                accentColor="#30D158"
                linkHref="/login"
                linkText="Go to Login"
            />
        );
    }

    if (state === "invite_invalid" || state === "invite_revoked" || state === "error") {
        return (
            <ErrorScreen
                icon={<AlertCircle style={{ width: 48, height: 48, color: "#FF453A" }} />}
                title="Invalid Invitation"
                message={errorMessage || "This invitation link is not valid."}
                accentColor="#FF453A"
            />
        );
    }

    // ─── Setup Form ─────────────────────────────────────────────
    return (
        <div style={{
            minHeight: "100vh",
            background: "#000",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
        }}>
            <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
                style={{
                    width: "100%",
                    maxWidth: 440,
                    background: "#1C1C1E",
                    borderRadius: 24,
                    border: "1px solid rgba(255,255,255,0.08)",
                    overflow: "hidden",
                }}
            >
                {/* Header */}
                <div style={{
                    padding: "32px 28px 24px",
                    borderBottom: "1px solid rgba(255,255,255,0.06)",
                    textAlign: "center",
                }}>
                    <div style={{
                        width: 64,
                        height: 64,
                        borderRadius: 20,
                        background: "rgba(10,132,255,0.12)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        margin: "0 auto 16px",
                    }}>
                        <Mail style={{ width: 28, height: 28, color: "#0A84FF" }} />
                    </div>
                    <h1 style={{
                        fontSize: 24,
                        fontWeight: 700,
                        color: "rgba(255,255,255,0.85)",
                        margin: "0 0 8px",
                        letterSpacing: "-0.3px",
                    }}>
                        Set Up Your Account
                    </h1>
                    <p style={{
                        fontSize: 15,
                        color: "rgba(235,235,245,0.6)",
                        margin: 0,
                        lineHeight: "1.5",
                    }}>
                        <strong style={{ color: "rgba(255,255,255,0.85)" }}>{invitation?.invitedByName}</strong> invited you as{" "}
                        <span style={{
                            color: roleColors[invitation?.role || ""] || "#0A84FF",
                            fontWeight: 600,
                        }}>
                            {invitation?.role}
                        </span>
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} style={{ padding: "24px 28px 28px" }}>
                    <div style={{ marginBottom: 8, fontSize: 13, fontWeight: 500, color: "rgba(235,235,245,0.6)", paddingLeft: 4 }}>
                        Email
                    </div>
                    <div style={{
                        padding: "12px 16px",
                        borderRadius: 12,
                        background: "rgba(120,120,128,0.12)",
                        fontSize: 15,
                        color: "rgba(235,235,245,0.4)",
                        marginBottom: 20,
                        border: "1px solid rgba(84,84,88,0.36)",
                    }}>
                        {invitation?.email}
                    </div>

                    <div style={{ marginBottom: 8, fontSize: 13, fontWeight: 500, color: "rgba(235,235,245,0.6)", paddingLeft: 4 }}>
                        Full Name
                    </div>
                    <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Enter your full name"
                        required
                        style={{
                            width: "100%",
                            padding: "12px 16px",
                            borderRadius: 12,
                            border: "1px solid rgba(84,84,88,0.36)",
                            background: "rgba(120,120,128,0.12)",
                            color: "rgba(255,255,255,0.85)",
                            fontSize: 15,
                            outline: "none",
                            marginBottom: 20,
                            boxSizing: "border-box",
                        }}
                    />

                    <div style={{ marginBottom: 8, fontSize: 13, fontWeight: 500, color: "rgba(235,235,245,0.6)", paddingLeft: 4 }}>
                        Password
                    </div>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Create a password (min 6 characters)"
                        required
                        minLength={6}
                        style={{
                            width: "100%",
                            padding: "12px 16px",
                            borderRadius: 12,
                            border: "1px solid rgba(84,84,88,0.36)",
                            background: "rgba(120,120,128,0.12)",
                            color: "rgba(255,255,255,0.85)",
                            fontSize: 15,
                            outline: "none",
                            marginBottom: 20,
                            boxSizing: "border-box",
                        }}
                    />

                    <div style={{ marginBottom: 8, fontSize: 13, fontWeight: 500, color: "rgba(235,235,245,0.6)", paddingLeft: 4 }}>
                        Confirm Password
                    </div>
                    <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm your password"
                        required
                        minLength={6}
                        style={{
                            width: "100%",
                            padding: "12px 16px",
                            borderRadius: 12,
                            border: "1px solid rgba(84,84,88,0.36)",
                            background: "rgba(120,120,128,0.12)",
                            color: "rgba(255,255,255,0.85)",
                            fontSize: 15,
                            outline: "none",
                            marginBottom: 24,
                            boxSizing: "border-box",
                        }}
                    />

                    {submitError && (
                        <div style={{
                            padding: "12px 16px",
                            borderRadius: 12,
                            background: "rgba(255,69,58,0.12)",
                            border: "1px solid rgba(255,69,58,0.2)",
                            color: "#FF453A",
                            fontSize: 14,
                            marginBottom: 20,
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                        }}>
                            <AlertCircle style={{ width: 16, height: 16, flexShrink: 0 }} />
                            {submitError}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={submitting}
                        style={{
                            width: "100%",
                            padding: "14px 20px",
                            borderRadius: 14,
                            border: "none",
                            background: submitting ? "rgba(10,132,255,0.5)" : "#0A84FF",
                            color: "#fff",
                            fontSize: 16,
                            fontWeight: 600,
                            cursor: submitting ? "not-allowed" : "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 8,
                            transition: "all 0.2s",
                        }}
                    >
                        {submitting ? (
                            <>
                                <Loader2 style={{ width: 18, height: 18, animation: "spin 1s linear infinite" }} />
                                Creating Account...
                            </>
                        ) : (
                            <>
                                <CheckCircle2 style={{ width: 18, height: 18 }} />
                                Create Account & Join
                            </>
                        )}
                    </button>
                </form>
            </motion.div>
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}

// ─── Reusable Error Screen ──────────────────────────────────────
function ErrorScreen({
    icon,
    title,
    message,
    accentColor,
    linkHref,
    linkText,
}: {
    icon: React.ReactNode;
    title: string;
    message: string;
    accentColor: string;
    linkHref?: string;
    linkText?: string;
}) {
    return (
        <div style={{
            minHeight: "100vh",
            background: "#000",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
        }}>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                    width: "100%",
                    maxWidth: 400,
                    background: "#1C1C1E",
                    borderRadius: 24,
                    border: "1px solid rgba(255,255,255,0.08)",
                    padding: "40px 28px",
                    textAlign: "center",
                }}
            >
                <div style={{
                    width: 80,
                    height: 80,
                    borderRadius: 24,
                    background: `${accentColor}15`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 20px",
                }}>
                    {icon}
                </div>
                <h1 style={{
                    fontSize: 22,
                    fontWeight: 700,
                    color: "rgba(255,255,255,0.85)",
                    margin: "0 0 12px",
                }}>
                    {title}
                </h1>
                <p style={{
                    fontSize: 15,
                    color: "rgba(235,235,245,0.6)",
                    lineHeight: "1.6",
                    margin: 0,
                }}>
                    {message}
                </p>
                {linkHref && (
                    <a
                        href={linkHref}
                        style={{
                            display: "inline-block",
                            marginTop: 24,
                            padding: "12px 28px",
                            borderRadius: 12,
                            background: "#0A84FF",
                            color: "#fff",
                            fontSize: 15,
                            fontWeight: 600,
                            textDecoration: "none",
                            transition: "opacity 0.2s",
                        }}
                    >
                        {linkText}
                    </a>
                )}
            </motion.div>
        </div>
    );
}
