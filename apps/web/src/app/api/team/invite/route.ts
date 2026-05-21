import { NextResponse } from "next/server";
import { getSessionUser, getDataOwnerId } from "@/lib/auth-session";
import { getDb } from "@/lib/mongodb";
import { isOwnerRole, hasPermission, resolvePermissions, type FlatPermissionMap } from "@/lib/permissions";

/**
 * POST /api/team/invite
 * Create a pending invitation and optionally send email via Resend
 * 
 * Body: { email, role, customPermissions? }
 */
export async function POST(request: Request) {
    try {
        const user = await getSessionUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Check permission: Owner or team.invite
        const isOwner = isOwnerRole(user.role);
        if (!isOwner) {
            const resolved = resolvePermissions(user.role, user.customPermissions as FlatPermissionMap);
            if (!hasPermission(resolved, "team.invite", false)) {
                return NextResponse.json(
                    { error: "Forbidden - You don't have team.invite permission" },
                    { status: 403 }
                );
            }
        }

        const body = await request.json();
        const { email, role, customPermissions } = body;

        // Validate
        if (!email || !email.includes("@")) {
            return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
        }

        const validRoles = ["Owner", "Manager", "Staff", "Accountant"];
        if (!role || !validRoles.includes(role)) {
            return NextResponse.json(
                { error: `Invalid role. Must be one of: ${validRoles.join(", ")}` },
                { status: 400 }
            );
        }

        const db = await getDb();

        // Check if user already exists with this email
        const existingUser = await db.collection("users").findOne({ email: email.toLowerCase().trim() });
        if (existingUser) {
            return NextResponse.json(
                { error: "A user with this email already exists in the system" },
                { status: 409 }
            );
        }

        // Check if there's already a pending invitation for this email
        const existingInvite = await db.collection("invitations").findOne({
            email: email.toLowerCase().trim(),
            status: "pending",
        });
        if (existingInvite) {
            return NextResponse.json(
                { error: "A pending invitation for this email already exists" },
                { status: 409 }
            );
        }

        // Create invitation token
        const token = globalThis.crypto.randomUUID();
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

        const invitation = {
            organizationId: user.organizationId || String(user._id),
            email: email.toLowerCase().trim(),
            role,
            customPermissions: customPermissions || undefined,
            token,
            status: "pending",
            invitedBy: String(user._id),
            invitedByName: user.fullName || user.full_name || user.email || "Admin",
            expiresAt,
            resendCount: 0,
            createdAt: now,
            updatedAt: now,
        };

        await db.collection("invitations").insertOne(invitation);

        // Attempt to send email via Resend (graceful fallback)
        let emailSent = false;
        try {
            const resendApiKey = process.env.RESEND_API_KEY;
            if (resendApiKey) {
                const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
                const inviteUrl = `${baseUrl}/invite/accept?token=${token}`;

                const emailRes = await fetch("https://api.resend.com/emails", {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${resendApiKey}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        from: process.env.RESEND_FROM_EMAIL || "noreply@indmanager.com",
                        to: [email],
                        subject: `You're invited to join ${user.company_details?.companyName || "the team"} on IND Manager`,
                        html: `
                            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 32px;">
                                <h2 style="color: #1a1a1a; margin-bottom: 16px;">You're invited!</h2>
                                <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                                    <strong>${invitation.invitedByName}</strong> has invited you to join as <strong>${role}</strong> on IND Manager.
                                </p>
                                <div style="margin: 32px 0;">
                                    <a href="${inviteUrl}" 
                                       style="display: inline-block; background: #007AFF; color: white; padding: 14px 28px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 16px;">
                                        Accept Invitation
                                    </a>
                                </div>
                                <p style="color: #8a8a8a; font-size: 13px;">
                                    This invitation expires in 7 days. If the button doesn't work, copy and paste this link:<br/>
                                    <a href="${inviteUrl}" style="color: #007AFF;">${inviteUrl}</a>
                                </p>
                            </div>
                        `,
                    }),
                });

                emailSent = emailRes.ok;
                if (!emailRes.ok) {
                    console.warn("[team/invite] Resend email failed:", await emailRes.text());
                }
            } else {
                console.warn("[team/invite] RESEND_API_KEY not configured — skipping email");
            }
        } catch (emailError) {
            console.warn("[team/invite] Email sending failed:", emailError);
        }

        return NextResponse.json({
            invitation: {
                id: invitation.token, // using token as ref
                email: invitation.email,
                role: invitation.role,
                token: invitation.token,
                status: invitation.status,
                expiresAt: invitation.expiresAt,
            },
            emailSent,
        });
    } catch (error: any) {
        console.error("[team/invite POST] Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
