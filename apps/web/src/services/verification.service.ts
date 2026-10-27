import crypto from "crypto";
import { getDb } from "@/lib/mongodb";
import { twilioLogger } from "@/infrastructure/logging/logger";

export interface VerificationResult {
  success: boolean;
  error?: string;
  attemptsRemaining?: number;
}

export interface IVerificationService {
  startVerification(
    identifier: string,
    channel?: "sms" | "whatsapp" | "email"
  ): Promise<{
    success: boolean;
    error?: string;
    devOtp?: string;
    providerError?: boolean;
  }>;

  checkVerification(
    identifier: string,
    code: string
  ): Promise<VerificationResult>;
}

// ─── Twilio Verify Service Implementation ───────────────────────────
export class TwilioVerifyService implements IVerificationService {
  private serviceSid: string;
  private client: any;

  constructor() {
    this.serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID || "";
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    if (sid && token) {
      try {
        const twilio = require("twilio");
        this.client = twilio(sid, token);
      } catch (err) {
        twilioLogger.error("Failed to load twilio SDK", { error: String(err) });
      }
    }
  }

  async startVerification(
    phone: string,
    channel: "sms" | "whatsapp" | "email" = "sms"
  ): Promise<{ success: boolean; error?: string; devOtp?: string; providerError?: boolean }> {
    if (!this.client || !this.serviceSid) {
      return { success: false, providerError: true, error: "Twilio Verify not properly configured" };
    }

    try {
      const channelToUse = channel === "email" ? "sms" : channel;
      await this.client.verify.v2
        .services(this.serviceSid)
        .verifications.create({
          to: phone,
          channel: channelToUse,
        });

      twilioLogger.info("Twilio Verify OTP dispatched", { to: phone, channel: channelToUse });
      return { success: true };
    } catch (err: any) {
      twilioLogger.error("Twilio Verify start error", { error: err?.message || String(err), to: phone });
      return { success: false, providerError: true, error: err?.message || "SMS delivery service error" };
    }
  }

  async checkVerification(
    phone: string,
    code: string
  ): Promise<VerificationResult> {
    if (!this.client || !this.serviceSid) {
      return { success: false, error: "Twilio Verify service not configured" };
    }

    try {
      const check = await this.client.verify.v2
        .services(this.serviceSid)
        .verificationChecks.create({
          to: phone,
          code,
        });

      if (check.status === "approved") {
        return { success: true };
      }

      return {
        success: false,
        error: "Invalid or expired verification code",
      };
    } catch (err: any) {
      twilioLogger.error("Twilio verification check error", { error: err?.message || String(err) });
      return {
        success: false,
        error: err?.message || "Invalid or expired verification code",
      };
    }
  }
}

// ─── Local HMAC OTP Verification Implementation ─────────────────────
export class LocalHmacVerificationService implements IVerificationService {
  private secret: string;

  constructor() {
    this.secret =
      process.env.OTP_SECRET ||
      process.env.AUTH_SECRET ||
      process.env.NEXTAUTH_SECRET ||
      "manufacturing-suite-local-otp-secret-key-32b";
  }

  async startVerification(
    identifier: string,
    channel: "sms" | "whatsapp" | "email" = "sms"
  ): Promise<{ success: boolean; error?: string; devOtp?: string; providerError?: boolean }> {
    const isProduction = process.env.NODE_ENV === "production";

    // Requirement 11: Production with no provider configured: fail closed — no OTP in logs,
    // log a server error, return the generic response.
    if (isProduction && !process.env.ENABLE_LOCAL_OTP_IN_PROD) {
      console.error(
        "[VerificationService] Production mode with no SMS provider configured. Failing closed."
      );
      return {
        success: false,
        providerError: true,
        error: "No SMS/verification provider configured in production",
      };
    }

    // Generate 6-digit random number securely
    const code = crypto.randomInt(100000, 1000000).toString();
    const hashedOtp = crypto
      .createHmac("sha256", this.secret)
      .update(code)
      .digest("hex");

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes

    const db = await getDb();
    // Invalidate any previous pending OTP for this identifier
    await db.collection("otps").deleteMany({ identifier });

    await db.collection("otps").insertOne({
      identifier,
      hashedOtp,
      attempts: 0,
      maxAttempts: 5,
      channel,
      expiresAt,
      createdAt: now,
    });

    // In non-production, log to dev console
    if (!isProduction) {
      console.log(`🔐 [DEV ONLY] Verification OTP for ${identifier}: ${code}`);
    }

    return {
      success: true,
      devOtp: !isProduction ? code : undefined,
    };
  }

  async checkVerification(
    identifier: string,
    code: string
  ): Promise<VerificationResult> {
    const db = await getDb();
    const record = await db.collection("otps").findOne({
      identifier,
      expiresAt: { $gt: new Date() },
    });

    if (!record) {
      return {
        success: false,
        error: "Code expired or not found. Please request a new code.",
      };
    }

    // Check maximum attempts
    if (record.attempts >= 5) {
      await db.collection("otps").deleteOne({ _id: record._id });
      return {
        success: false,
        error: "Too many failed attempts. Please request a new code.",
      };
    }

    // Compute HMAC
    const candidateHash = crypto
      .createHmac("sha256", this.secret)
      .update(code)
      .digest("hex");

    const candidateBuf = Buffer.from(candidateHash, "hex");
    const storedBuf = Buffer.from(record.hashedOtp, "hex");

    let isValid = false;
    if (candidateBuf.length === storedBuf.length) {
      isValid = crypto.timingSafeEqual(candidateBuf, storedBuf);
    }

    if (!isValid) {
      const nextAttempts = (record.attempts || 0) + 1;
      await db
        .collection("otps")
        .updateOne({ _id: record._id }, { $inc: { attempts: 1 } });

      const attemptsRemaining = Math.max(0, 5 - nextAttempts);
      return {
        success: false,
        error: `Invalid verification code. ${attemptsRemaining} attempt(s) remaining.`,
        attemptsRemaining,
      };
    }

    // Valid — remove code so it is single-use
    await db.collection("otps").deleteOne({ _id: record._id });
    return { success: true };
  }
}

/**
 * Returns the active verification service based on environment configuration.
 */
export function getVerificationService(): IVerificationService {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const verifySid = process.env.TWILIO_VERIFY_SERVICE_SID;

  const isTwilioConfigured = Boolean(
    sid &&
    token &&
    verifySid &&
    verifySid.startsWith("VA") &&
    !verifySid.includes("your_twilio") &&
    !sid.includes("your_twilio")
  );

  if (isTwilioConfigured) {
    return new TwilioVerifyService();
  }
  return new LocalHmacVerificationService();
}
