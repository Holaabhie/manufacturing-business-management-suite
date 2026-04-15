/**
 * Suspicious Login Detection
 *
 * Detects anomalous login patterns to protect against account takeover.
 *
 * Detection Signals:
 * 1. New device / browser fingerprint
 * 2. Unusual login time (outside user's typical hours)
 * 3. Rapid geographic change (impossible travel)
 * 4. Multiple failed attempts followed by a success
 * 5. Login from a previously-unseen IP range
 *
 * Actions:
 * - Log the event with severity
 * - Flag the session for review
 * - (Optional) Send notification to user email
 */

import { getDb } from "@/lib/mongodb";
import { logAuthEvent } from "@/lib/audit";
import { authLogger } from "@/infrastructure/logging/logger";

export interface LoginContext {
    userId: string;
    userName: string;
    userRole: "Admin" | "Staff";
    organizationId: string;
    ipAddress: string;
    userAgent?: string;
    email?: string;
}

export interface SuspiciousLoginResult {
    isSuspicious: boolean;
    reasons: string[];
    riskScore: number; // 0-100
    action: "allow" | "flag" | "block";
}

/**
 * Analyze a login attempt for suspicious behaviour.
 */
export async function detectSuspiciousLogin(
    ctx: LoginContext
): Promise<SuspiciousLoginResult> {
    const reasons: string[] = [];
    let riskScore = 0;

    try {
        const db = await getDb();

        // ─── 1. Check login history for this user ────────────────────
        const recentSessions = await db
            .collection("sessions")
            .find({ userId: ctx.userId })
            .sort({ createdAt: -1 })
            .limit(10)
            .toArray();

        // New user — no history, skip analysis
        if (recentSessions.length === 0) {
            return {
                isSuspicious: false,
                reasons: [],
                riskScore: 0,
                action: "allow",
            };
        }

        // ─── 2. Check for new IP address ─────────────────────────────
        const knownIps = new Set(
            recentSessions.map((s) => s.ipAddress).filter(Boolean)
        );
        if (ctx.ipAddress !== "unknown" && !knownIps.has(ctx.ipAddress)) {
            reasons.push(`Login from new IP: ${ctx.ipAddress}`);
            riskScore += 20;
        }

        // ─── 3. Check for new user agent (device/browser) ────────────
        const knownAgents = new Set(
            recentSessions.map((s) => simplifyUserAgent(s.userAgent)).filter(Boolean)
        );
        const currentAgent = simplifyUserAgent(ctx.userAgent);
        if (currentAgent && !knownAgents.has(currentAgent)) {
            reasons.push(`Login from new device/browser: ${currentAgent}`);
            riskScore += 15;
        }

        // ─── 4. Check for recent failed attempts ─────────────────────
        const recentFailures = await db
            .collection("audit_logs")
            .countDocuments({
                userId: ctx.userId,
                module: "auth",
                actionType: "security",
                action: { $regex: /^Failed login attempt/ },
                timestamp: { $gt: new Date(Date.now() - 30 * 60 * 1000) }, // last 30 min
            });

        if (recentFailures >= 3) {
            reasons.push(
                `${recentFailures} failed login attempts in the last 30 minutes`
            );
            riskScore += 25;
        }

        // ─── 5. Check for unusual login time ─────────────────────────
        // Calculate user's typical login hour range from history
        const loginHours = recentSessions
            .map((s) => new Date(s.createdAt).getHours())
            .filter((h) => !isNaN(h));

        if (loginHours.length >= 3) {
            const currentHour = new Date().getHours();
            const avgHour =
                loginHours.reduce((a, b) => a + b, 0) / loginHours.length;
            const hourDiff = Math.abs(currentHour - avgHour);

            // If login is >6 hours away from typical time
            if (hourDiff > 6 && hourDiff < 18) {
                reasons.push(`Unusual login time (${currentHour}:00 vs typical ~${Math.round(avgHour)}:00)`);
                riskScore += 15;
            }
        }

        // ─── 6. Check for impossible travel ──────────────────────────
        // If user logged in from a different IP within the last 30 minutes
        const lastSession = recentSessions[0];
        if (lastSession) {
            const timeSinceLastMs =
                Date.now() - new Date(lastSession.createdAt).getTime();
            const timeSinceLastMin = timeSinceLastMs / (1000 * 60);

            if (
                timeSinceLastMin < 30 &&
                lastSession.ipAddress &&
                lastSession.ipAddress !== ctx.ipAddress &&
                ctx.ipAddress !== "unknown"
            ) {
                // Different IP within 30 minutes — potential impossible travel
                const lastIpPrefix = lastSession.ipAddress.split(".").slice(0, 2).join(".");
                const currentIpPrefix = ctx.ipAddress.split(".").slice(0, 2).join(".");

                if (lastIpPrefix !== currentIpPrefix) {
                    reasons.push(
                        `Rapid IP change: ${lastSession.ipAddress} → ${ctx.ipAddress} within ${Math.round(timeSinceLastMin)} minutes`
                    );
                    riskScore += 30;
                }
            }
        }
    } catch (error) {
        // Don't block login on detection failure
        authLogger.error('Suspicious login detection error', { error: error instanceof Error ? error.message : String(error) });
        return {
            isSuspicious: false,
            reasons: [],
            riskScore: 0,
            action: "allow",
        };
    }

    // ─── Determine action ───────────────────────────────────────────
    riskScore = Math.min(100, riskScore);

    let action: "allow" | "flag" | "block" = "allow";
    if (riskScore >= 70) {
        action = "block";
    } else if (riskScore >= 30) {
        action = "flag";
    }

    const isSuspicious = riskScore >= 30;

    // Log if suspicious
    if (isSuspicious) {
        logAuthEvent({
            organizationId: ctx.organizationId,
            userId: ctx.userId,
            userName: ctx.userName,
            userRole: ctx.userRole,
            action: `Suspicious login detected (risk: ${riskScore}/100)`,
            actionType: "security",
            ipAddress: ctx.ipAddress,
            userAgent: ctx.userAgent,
            severity: riskScore >= 70 ? "critical" : "warning",
            details: reasons.join("; "),
        });
    }

    return { isSuspicious, reasons, riskScore, action };
}

// ─── Helpers ──────────────────────────────────────────────────────

/**
 * Simplify user-agent to a comparable fingerprint
 * e.g. "Chrome/Windows" instead of full UA string
 */
function simplifyUserAgent(ua?: string): string | null {
    if (!ua) return null;

    let browser = "Unknown";
    if (/chrome/i.test(ua) && !/edge/i.test(ua)) browser = "Chrome";
    else if (/firefox/i.test(ua)) browser = "Firefox";
    else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = "Safari";
    else if (/edge/i.test(ua)) browser = "Edge";

    let os = "Unknown";
    if (/windows/i.test(ua)) os = "Windows";
    else if (/mac/i.test(ua)) os = "macOS";
    else if (/linux/i.test(ua)) os = "Linux";
    else if (/android/i.test(ua)) os = "Android";
    else if (/iphone|ipad/i.test(ua)) os = "iOS";

    return `${browser}/${os}`;
}
