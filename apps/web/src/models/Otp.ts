import { Schema, model, models, Document } from 'mongoose';

export interface IOtp extends Document {
  phone: string;
  hashedOtp: string;
  attempts: number;
  expiresAt: Date;
  purpose: 'login' | 'forgot-password';
  createdAt: Date;
}

const OtpSchema = new Schema<IOtp>({
  phone: { 
    type: String, 
    required: true,
    trim: true
  },
  hashedOtp: { 
    type: String, 
    required: true 
  },
  attempts: { 
    type: Number, 
    default: 0 
  },
  expiresAt: { 
    type: Date, 
    required: true 
  },
  purpose: { 
    type: String, 
    enum: ['login', 'forgot-password'],
    required: true
  }
}, {
  timestamps: true
});

// Index for cleanup of expired OTPs
OtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Index for efficient phone lookups
OtpSchema.index({ phone: 1, purpose: 1 });

export const Otp = models.Otp || model<IOtp>('Otp', OtpSchema);