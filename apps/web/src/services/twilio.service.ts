import bcrypt from 'bcrypt';
import { Otp } from '@/models/Otp';
import { connectToDatabase } from '@/lib/mongodb';

// ─── Lazy Twilio Client ─────────────────────────────────────────
// Only initialized when actually needed, and only if env vars are set.
let _twilioClient: any = null;

function getTwilioClient() {
  if (_twilioClient) return _twilioClient;

  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;

  if (!sid || !token) {
    console.warn('[TwilioService] TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN not set. OTP will be logged to console only (dev mode).');
    return null;
  }

  try {
    // Dynamic import to avoid crash when twilio package is not installed
    const twilio = require('twilio');
    _twilioClient = twilio(sid, token);
    return _twilioClient;
  } catch (err) {
    console.warn('[TwilioService] "twilio" package not installed. OTP will be logged to console only (dev mode).');
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
        // Production: use Twilio Verify
        try {
          await client.verify.v2.services(process.env.TWILIO_VERIFY_SERVICE_SID)
            .verifications
            .create({
              to: formattedPhone,
              channel: 'whatsapp'
            });
        } catch (whatsappError) {
          console.log('WhatsApp failed, falling back to SMS:', whatsappError);
          // Fallback to SMS
          await client.verify.v2.services(process.env.TWILIO_VERIFY_SERVICE_SID)
            .verifications
            .create({
              to: formattedPhone,
              channel: 'sms'
            });
        }
      } else {
        // Development fallback: log OTP to console
        console.log(`\n══════════════════════════════════════════`);
        console.log(`  📱 OTP for ${formattedPhone}: ${otp}`);
        console.log(`  Purpose: ${purpose}`);
        console.log(`  Expires: ${expiresAt.toLocaleTimeString()}`);
        console.log(`══════════════════════════════════════════\n`);
      }

      return true;
    } catch (error) {
      console.error('Error sending OTP:', error);
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
      console.error('Error verifying OTP:', error);
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
      console.log(`Cleaned up ${result.deletedCount} expired OTPs`);
    } catch (error) {
      console.error('Error cleaning up expired OTPs:', error);
    }
  }
}