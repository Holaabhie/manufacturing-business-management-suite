import { Schema, model, models, Document } from 'mongoose';
import type { PermissionMap } from '@/lib/permissions';

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

  // ─── RBAC Fields ──────────────────────────────────────────────
  // Organization scoping
  organizationId?: string;

  // Employee identification
  employeeId?: string;
  department?: string;

  // Granular permissions
  permissions?: PermissionMap;
  permissionTemplateId?: string;

  // Account status
  status: 'active' | 'inactive' | 'suspended' | 'pending_setup';

  // First-time setup tracking
  firstLoginCompleted: boolean;
  setupSteps: {
    passwordChanged: boolean;
    otpConfigured: boolean;
    profileCompleted: boolean;
    termsAccepted: boolean;
  };

  // Security
  failedLoginAttempts: number;
  lockedUntil?: Date;
  lastLogin?: Date;
  lastActiveAt?: Date;
  passwordChangedAt?: Date;

  // OTP configuration
  otpDeliveryMethod: 'email' | 'sms' | 'authenticator';
  otpSecret?: string; // For TOTP authenticator apps

  // Invitation tracking
  invitedBy?: string;
  invitationId?: string;

  // ─── Existing Fields ──────────────────────────────────────────
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

  // ─── RBAC Fields ──────────────────────────────────────────────
  organizationId: {
    type: String,
    index: true,
  },
  employeeId: {
    type: String,
    sparse: true,
    trim: true,
  },
  department: {
    type: String,
    trim: true,
  },
  permissions: {
    type: Schema.Types.Mixed,
    default: undefined,
  },
  permissionTemplateId: String,

  // Account status
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'pending_setup'],
    default: 'active',
  },

  // First-time setup
  firstLoginCompleted: {
    type: Boolean,
    default: true, // true for existing users, false for new staff
  },
  setupSteps: {
    type: Object,
    default: {
      passwordChanged: true,
      otpConfigured: false,
      profileCompleted: false,
      termsAccepted: false,
    },
  },

  // Security
  failedLoginAttempts: {
    type: Number,
    default: 0,
  },
  lockedUntil: Date,
  lastLogin: Date,
  lastActiveAt: Date,
  passwordChangedAt: Date,

  // OTP configuration
  otpDeliveryMethod: {
    type: String,
    enum: ['email', 'sms', 'authenticator'],
    default: 'email',
  },
  otpSecret: String,

  // Invitation tracking
  invitedBy: String,
  invitationId: String,

  // ─── Existing Fields ──────────────────────────────────────────
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
UserSchema.index({ organizationId: 1, role: 1 });
UserSchema.index({ organizationId: 1, status: 1 });
UserSchema.index({ organizationId: 1, employeeId: 1 });
UserSchema.index({ organizationId: 1, department: 1 });

// Compound index for account linking
UserSchema.index({ email: 1, phone: 1 }, { unique: true, sparse: true });

export const User = models.User || model<IUser>('User', UserSchema);