import twilio from 'twilio';
import { parsePhoneNumber } from 'libphonenumber-js';
import bcrypt from 'bcrypt';
import { Otp } from '@/models/Otp';
import { connectToDatabase } from '@/lib/mongodb';

// Initialize Twilio client
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export class TwilioService {
  static async sendOtp(phone: string, purpose: 'login' | 'forgot-password' = 'login'): Promise<boolean> {
    try {
      // Connect to database
      await connectToDatabase();
      
      // Validate and format phone number
      const phoneNumber = parsePhoneNumber(phone, 'IN');
      if (!phoneNumber.isValid()) {
        throw new Error('Invalid phone number');
      }
      
      const formattedPhone = phoneNumber.format('E.164'); // +91xxxxxxxxxx format
      
      // Rate limiting check
      const ip = this.getClientIP(); // You'll need to implement this based on your deployment
      if (!this.checkRateLimit(ip)) {
        throw new Error('Too many requests. Please try again later.');
      }
      
      // Check if there's an existing OTP for this phone and purpose
      const existingOtp = await Otp.findOne({ phone: formattedPhone, purpose });
      if (existingOtp && existingOtp.expiresAt > new Date()) {
        // Don't send new OTP if existing one hasn't expired
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
      
      // Send OTP via WhatsApp (Twilio Verify handles the template)
      try {
        await client.verify.v2.services(process.env.TWILIO_VERIFY_SERVICE_SID!)
          .verifications
          .create({
            to: formattedPhone,
            channel: 'whatsapp'
          });
      } catch (whatsappError) {
        console.log('WhatsApp failed, falling back to SMS:', whatsappError);
        // Fallback to SMS
        await client.verify.v2.services(process.env.TWILIO_VERIFY_SERVICE_SID!)
          .verifications
          .create({
            to: formattedPhone,
            channel: 'sms'
          });
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
      const phoneNumber = parsePhoneNumber(phone, 'IN');
      if (!phoneNumber.isValid()) {
        throw new Error('Invalid phone number');
      }
      
      const formattedPhone = phoneNumber.format('E.164');
      
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
  
  private static getClientIP(): string {
    // In a real implementation, get the client IP from request headers
    // This is a placeholder - implement based on your deployment setup
    return '127.0.0.1';
  }
  
  private static checkRateLimit(ip: string): boolean {
    const now = Date.now();
    const windowMs = 60 * 60 * 1000; // 1 hour
    const maxRequests = 5;
    
    const record = rateLimitStore.get(ip);
    
    if (!record || record.resetTime < now) {
      // First request or window has passed
      rateLimitStore.set(ip, {
        count: 1,
        resetTime: now + windowMs
      });
      return true;
    }
    
    if (record.count >= maxRequests) {
      return false; // Rate limit exceeded
    }
    
    // Increment count
    record.count++;
    rateLimitStore.set(ip, record);
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