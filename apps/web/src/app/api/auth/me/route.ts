import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-session";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ user: null }, { status: 200 });

  return NextResponse.json({
    user: {
      id: user._id,
      email: user.email,
      role: user.role,
      subscription_tier: user.subscription_tier,
      full_name: user.full_name ?? null,
      phone_number: user.phone_number ?? null,
      avatar_url: user.avatar_url ?? null,
      notification_preferences: user.notification_preferences ?? null,
    },
  });
}

