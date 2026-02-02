import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import clientPromise from "@/lib/mongodb";
import bcrypt from "bcrypt";
import { connectToDatabase } from "@/lib/mongodb";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: MongoDBAdapter(clientPromise),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
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
  callbacks: {
    async signIn({ user, account, profile }) {
      // Import User model inside the function to avoid Edge Runtime issues
      const { User } = await import("@/models/User");
      await connectToDatabase();
      
      if (account?.provider === "google") {
        // Check if user exists with same email
        const existingUser = await User.findOne({ email: user.email });
        
        if (existingUser) {
          // Link Google account to existing user
          existingUser.googleId = user.id;
          existingUser.isEmailVerified = true;
          await existingUser.save();
          user.id = existingUser._id.toString();
        } else {
          // Create new user
          const newUser = new User({
            email: user.email,
            fullName: user.name,
            googleId: user.id,
            phone: "", // Will be collected later if needed
            isEmailVerified: true,
            isPhoneVerified: false,
            role: "Staff",
            subscription_tier: "starter"
          });
          const savedUser = await newUser.save();
          user.id = savedUser._id.toString();
        }
      } else if (account?.provider === "microsoft-entra-id") {
        // Check if user exists with same email
        const existingUser = await User.findOne({ email: user.email });
        
        if (existingUser) {
          // Link Microsoft account to existing user
          existingUser.microsoftId = user.id;
          existingUser.isEmailVerified = true;
          await existingUser.save();
          user.id = existingUser._id.toString();
        } else {
          // Create new user
          const newUser = new User({
            email: user.email,
            fullName: user.name,
            microsoftId: user.id,
            phone: "",
            isEmailVerified: true,
            isPhoneVerified: false,
            role: "Staff",
            subscription_tier: "starter"
          });
          const savedUser = await newUser.save();
          user.id = savedUser._id.toString();
        }
      }
      
      return true;
    },
    async session({ session, user }) {
      // Import User model inside the function to avoid Edge Runtime issues
      const { User } = await import("@/models/User");
      await connectToDatabase();
      
      // Find user in our database
      const dbUser = await User.findById(user.id);
      if (dbUser) {
        session.user = {
          id: dbUser._id.toString(),
          email: dbUser.email,
          name: dbUser.fullName,
          phone: dbUser.phone,
          role: dbUser.role,
          subscription_tier: dbUser.subscription_tier,
          isPhoneVerified: dbUser.isPhoneVerified,
          isEmailVerified: dbUser.isEmailVerified,
        };
      }
      return session;
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  events: {
    async signOut({ session, token }) {
      // Custom sign out logic if needed
    },
  },
});