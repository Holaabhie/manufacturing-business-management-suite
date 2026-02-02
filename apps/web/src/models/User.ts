import { Schema, model, models, Document } from 'mongoose';

export interface IUser extends Document {
  // Core identification
  email?: string;
  phone: string;
  password?: string;
  
  // OAuth provider IDs
  googleId?: string;
  microsoftId?: string;
  
  // User information
  fullName?: string;
  role: 'Admin' | 'Staff';
  subscription_tier: 'starter' | 'pro';
  subscription_status?: string;
  
  // Verification status
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  
  // Additional information
  notification_preferences?: Record<string, unknown>;
  avatar_url?: string;
  company_details?: {
    companyName: string;
    address: string;
    phone: string;
    email: string;
    logoUrl?: string;
    gstin?: string;
    pan?: string;
    bankName?: string;
    accountNo?: string;
    ifsc?: string;
    upiId?: string;
  };
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>({
  // Core identification - phone is required, email is optional but unique when provided
  email: { 
    type: String, 
    unique: true, 
    sparse: true,
    lowercase: true,
    trim: true
  },
  phone: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true
  },
  password: { 
    type: String,
    // Required only for email/password auth, not for OAuth
  },
  
  // OAuth provider IDs
  googleId: { 
    type: String, 
    unique: true, 
    sparse: true 
  },
  microsoftId: { 
    type: String, 
    unique: true, 
    sparse: true 
  },
  
  // User information
  fullName: { 
    type: String,
    trim: true 
  },
  role: { 
    type: String, 
    enum: ['Admin', 'Staff'], 
    default: 'Staff' 
  },
  subscription_tier: { 
    type: String, 
    enum: ['starter', 'pro'], 
    default: 'starter' 
  },
  subscription_status: String,
  
  // Verification status
  isEmailVerified: { 
    type: Boolean, 
    default: false 
  },
  isPhoneVerified: { 
    type: Boolean, 
    default: false 
  },
  
  // Additional information
  notification_preferences: Object,
  avatar_url: String,
  company_details: {
    companyName: String,
    address: String,
    phone: String,
    email: String,
    logoUrl: String,
    gstin: String,
    pan: String,
    bankName: String,
    accountNo: String,
    ifsc: String,
    upiId: String
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
UserSchema.index({ email: 1 });
UserSchema.index({ phone: 1 });
UserSchema.index({ googleId: 1 });
UserSchema.index({ microsoftId: 1 });

// Compound index for account linking
UserSchema.index({ email: 1, phone: 1 }, { unique: true, sparse: true });

export const User = models.User || model<IUser>('User', UserSchema);