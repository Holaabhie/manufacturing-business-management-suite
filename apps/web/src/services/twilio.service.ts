import bcrypt from 'bcrypt';
import { Otp } from '@/models/Otp';
import { connectToDatabase } from '@/lib/mongodb';
import { twilioLogger } from '@/infrastructure/logging/logger';

// ─── Lazy Twilio Client ─────────────────────────────────────────
// Only initialized when actually needed, and only if env vars are set.
let _twilioClient: any = null;

function getTwilioClient() {
  if (_twilioClient) return _twilioClient;

  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;

  if (!sid || !token) {
    twilioLogger.warn('TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN not set. OTP will be logged only (dev mode).');
    return null;
  }

  try {
    // Dynamic import to avoid crash when twilio package is not installed
    const twilio = require('twilio');
    _twilioClient = twilio(sid, token);
    return _twilioClient;
  } catch (err) {
    twilioLogger.warn('"twilio" package not installed. OTP will be logged only (dev mode).');
    return null;
  }
}

// ─── Phone Validation Helper ────────────────────────────────────
function validateAndFormatPhone(phone: string): string {
  // Remove all non-digit characters except leading +
  let cleaned = phone.replace(/[^\d+]/g, '');

  // Ensure Indian number format
  if (cleaned.startsWith('+91') && cleaned.length === 13) {
    return cleaned; // Already E.164 format
  }
  if (cleaned.startsWith('91') && cleaned.length === 12) {
    return '+' + cleaned;
  }
  if (cleaned.length === 10 && /^[6-9]\d{9}$/.test(cleaned)) {
    return '+91' + cleaned;
  }

  // Try using libphonenumber-js if available
  try {
    const { parsePhoneNumber } = require('libphonenumber-js');
    const phoneNumber = parsePhoneNumber(phone, 'IN');
    if (phoneNumber.isValid()) {
      return phoneNumber.format('E.164');
    }
  } catch {
    // libphonenumber-js not installed, use basic validation
  }

  throw new Error('Invalid phone number format. Expected Indian number (10 digits).');
}

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export class TwilioService {
  static async sendOtp(phone: string, purpose: 'login' | 'forgot-password' = 'login'): Promise<boolean> {
    try {
      // Connect to database
      await connectToDatabase();

      // Validate and format phone number
      const formattedPhone = validateAndFormatPhone(phone);

      // Rate limiting check
      if (!this.checkRateLimit(formattedPhone)) {
        throw new Error('Too many requests. Please try again later.');
      }

      // Check if there's an existing OTP for this phone and purpose
      const existingOtp = await Otp.findOne({ phone: formattedPhone, purpose });
      if (existingOtp && existingOtp.expiresAt > new Date()) {
        const timeRemaining = Math.ceil((existingOtp.expiresAt.getTime() - Date.now()) / 1000 / 60);
        throw new Error(`Please wait ${timeRemaining} minutes before requesting a new OTP`);
      }

      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();

      // Hash the OTP for storage
      const hashedOtp = await bcrypt.hash(otp, 10);

      // Calculate expiration (5 minutes)
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

      // Save OTP to database
      await Otp.findOneAndUpdate(
        { phone: formattedPhone, purpose },
        {
          phone: formattedPhone,
          hashedOtp,
          attempts: 0,
          expiresAt,
          purpose
        },
        { upsert: true, new: true }
      );

      // ─── Send OTP ──────────────────────────────────────────────
      const client = getTwilioClient();

      if (client && process.env.TWILIO_VERIFY_SERVICE_SID) {
        // Strategy 1: Twilio Verify service (WhatsApp → SMS fallback)
        try {
          await client.verify.v2.services(process.env.TWILIO_VERIFY_SERVICE_SID)
            .verifications
            .create({
              to: formattedPhone,
              channel: 'whatsapp'
            });
        } catch (whatsappError) {
          twilioLogger.info('WhatsApp failed, falling back to SMS', { error: String(whatsappError) });
          await client.verify.v2.services(process.env.TWILIO_VERIFY_SERVICE_SID)
            .verifications
            .create({
              to: formattedPhone,
              channel: 'sms'
            });
        }
      } else if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
        // Strategy 2: Direct SMS via Twilio Messages API
        const messagesUrl = process.env.TWILIO_MESSAGES_API
          || `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`;

        const authHeader = 'Basic ' + Buffer.from(
          `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
        ).toString('base64');

        const smsBody = `[IND Manager] Your OTP is: ${otp}. Valid for 5 minutes. Do not share this code.`;

        const response = await fetch(messagesUrl, {
          method: 'POST',
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            To: formattedPhone,
            From: process.env.TWILIO_PHONE_NUMBER,
            Body: smsBody,
          }).toString(),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          twilioLogger.error('Messages API error', { status: response.status, errorData });
          throw new Error(`SMS delivery failed: ${(errorData as any)?.message || response.statusText}`);
        }

        const result = await response.json();
        twilioLogger.info('SMS sent via Messages API', { sid: (result as any)?.sid });
      } else {
        // Strategy 3: Development fallback — log OTP
        twilioLogger.info('Dev OTP generated', {
          phone: formattedPhone,
          otp,
          purpose,
          expiresAt: expiresAt.toISOString(),
        });
      }

      return true;
    } catch (error) {
      twilioLogger.error('Error sending OTP', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  static async verifyOtp(phone: string, otp: string, purpose: 'login' | 'forgot-password' = 'login'): Promise<boolean> {
    try {
      // Connect to database
      await connectToDatabase();

      // Validate and format phone number
      const formattedPhone = validateAndFormatPhone(phone);

      // Find OTP record
      const otpRecord = await Otp.findOne({ phone: formattedPhone, purpose });
      if (!otpRecord) {
        throw new Error('No OTP found for this phone number');
      }

      // Check if expired
      if (otpRecord.expiresAt < new Date()) {
        await Otp.deleteOne({ phone: formattedPhone, purpose });
        throw new Error('OTP has expired');
      }

      // Check attempt limit (max 3 attempts)
      if (otpRecord.attempts >= 3) {
        await Otp.deleteOne({ phone: formattedPhone, purpose });
        throw new Error('Too many failed attempts. Please request a new OTP.');
      }

      // Verify OTP
      const isValid = await bcrypt.compare(otp, otpRecord.hashedOtp);

      if (!isValid) {
        // Increment attempts
        await Otp.updateOne(
          { phone: formattedPhone, purpose },
          { $inc: { attempts: 1 } }
        );
        throw new Error('Invalid OTP');
      }

      // OTP verified successfully - delete it
      await Otp.deleteOne({ phone: formattedPhone, purpose });

      return true;
    } catch (error) {
      twilioLogger.error('Error verifying OTP', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  private static checkRateLimit(key: string): boolean {
    const now = Date.now();
    const windowMs = 60 * 60 * 1000; // 1 hour
    const maxRequests = 5;

    const record = rateLimitStore.get(key);

    if (!record || record.resetTime < now) {
      rateLimitStore.set(key, {
        count: 1,
        resetTime: now + windowMs
      });
      return true;
    }

    if (record.count >= maxRequests) {
      return false; // Rate limit exceeded
    }

    record.count++;
    rateLimitStore.set(key, record);
    return true;
  }

  static async cleanupExpiredOtps(): Promise<void> {
    try {
      await connectToDatabase();
      const result = await Otp.deleteMany({ expiresAt: { $lt: new Date() } });
      twilioLogger.info('Cleaned up expired OTPs', { deletedCount: result.deletedCount });
    } catch (error) {
      twilioLogger.error('Error cleaning up expired OTPs', { error: error instanceof Error ? error.message : String(error) });
    }
  }
}