import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import { connectToDatabase } from "@/lib/mongodb";
import { authLogger } from "@/infrastructure/logging/logger";

export const { handlers, signIn, signOut, auth } = NextAuth({
  // NOTE: We intentionally do NOT use MongoDBAdapter here.
  // When using `strategy: "jwt"`, the database adapter can conflict with
  // the JWT flow and cause silent sign-in failures. Instead, we handle
  // user creation/lookup manually in the signIn callback below.
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "select_account",
        },
      },
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
        };
      },
    }),
    MicrosoftEntraID({
      clientId: process.env.AZURE_AD_CLIENT_ID,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET,
      tenantId: process.env.AZURE_AD_TENANT_ID,
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
        };
      },
    }),
  ],
  // Trust the host header (required for OAuth redirects in development)
  trustHost: true,
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!account || !user.email) return true;

      const { User } = await import("@/models/User");
      await connectToDatabase();

      const provider = account.provider;

      if (provider === "google" || provider === "microsoft-entra-id") {
        const providerIdField =
          provider === "google" ? "googleId" : "microsoftId";

        // Check if user already exists by email
        const existingUser = await User.findOne({ email: user.email });

        if (existingUser) {
          // Link OAuth account to existing user
          existingUser[providerIdField] = account.providerAccountId || user.id;
          existingUser.isEmailVerified = true;
          existingUser.lastLogin = new Date();
          existingUser.lastActiveAt = new Date();
          existingUser.failedLoginAttempts = 0;
          existingUser.lockedUntil = undefined;
          await existingUser.save();
          user.id = existingUser._id.toString();
        } else {
          // Create new admin user from OAuth
          const newUser = new User({
            email: user.email,
            fullName: user.name || profile?.name,
            [providerIdField]: account.providerAccountId || user.id,
            phone: "",
            isEmailVerified: true,
            isPhoneVerified: false,
            role: "Admin",
            status: "active",
            subscription_tier: "starter",
            firstLoginCompleted: true,
            company_setup_complete: false,
            failedLoginAttempts: 0,
            lastLogin: new Date(),
            lastActiveAt: new Date(),
          });
          const savedUser = await newUser.save();
          user.id = savedUser._id.toString();
        }
      }

      return true;
    },

    async session({ session, token }) {
      if (token?.sub) {
        session.user.id = token.sub;
      }
      // Attach custom fields from DB
      if (token?.role) {
        (session.user as any).role = token.role;
      }
      if (token?.subscription_tier) {
        (session.user as any).subscription_tier = token.subscription_tier;
      }
      return session;
    },

    async jwt({ token, user, account, trigger }) {
      if (user) {
        token.sub = user.id;
      }

      // On initial sign-in or token refresh, load user data from DB
      if ((user || trigger === "update") && token.sub) {
        try {
          const { User } = await import("@/models/User");
          await connectToDatabase();
          const dbUser = await User.findById(token.sub);
          if (dbUser) {
            token.role = dbUser.role;
            token.subscription_tier = dbUser.subscription_tier;
            token.organizationId = dbUser.organizationId;
            token.email = dbUser.email;
            token.name = dbUser.fullName;
          }
        } catch (e) {
          authLogger.error('JWT callback DB error', { error: e instanceof Error ? e.message : String(e) });
        }
      }

      return token;
    },

    async redirect({ url, baseUrl }) {
      // Prevent open redirect attacks
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (new URL(url).origin === baseUrl) return url;
      return `${baseUrl}/dashboard`;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login?error=oauth",
  },
  useSecureCookies: process.env.NODE_ENV === "production" && !process.env.NEXTAUTH_URL?.startsWith("http://localhost"),
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // Refresh token every 24 hours
  },
  events: {
    async signIn({ user, account }) {
      // Bridge NextAuth session to custom session for unified auth
      if (user?.id && account) {
        try {
          const { getDb } = await import("@/lib/mongodb");
          const { SESSION_COOKIE_NAME } = await import(
            "@/lib/auth-constants"
          );
          const db = await getDb();
          const sessionId = globalThis.crypto.randomUUID();
          const now = new Date();
          const expiresAt = new Date(
            now.getTime() + 1000 * 60 * 60 * 24 * 30
          );

          // Find user in DB to get role
          const dbUser = await db
            .collection("users")
            .findOne({ email: user.email });

          await db.collection("sessions").insertOne({
            _id: sessionId,
            userId: user.id,
            createdAt: now,
            expiresAt,
            organizationId: (dbUser as any)?.organizationId,
            role: (dbUser as any)?.role || "Admin",
            provider: account.provider,
            lastActiveAt: now,
          });

          // We can't set cookies in events directly, but we'll handle
          // this in the middleware by checking both NextAuth and custom sessions
        } catch (e) {
          authLogger.error('Failed to bridge session', { error: e instanceof Error ? e.message : String(e) });
        }
      }
    },
    async signOut() {
      // Custom sign out logic handled in logout route
    },
  },
});