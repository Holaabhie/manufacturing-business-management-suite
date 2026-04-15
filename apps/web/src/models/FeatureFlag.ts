import { Schema, model, models, Document } from 'mongoose';

// ─── Types ──────────────────────────────────────────────────────
export type SubscriptionTier = 'starter' | 'pro';

export interface IFeatureFlag extends Document {
  /** Unique key used in code references, e.g. "ai_assistant" */
  key: string;
  /** Human-readable display name */
  name: string;
  /** Optional description of what this feature does */
  description?: string;
  /** Which subscription tiers can access this feature */
  allowedTiers: SubscriptionTier[];
  /** If true, only Admin role can access (regardless of tier) */
  adminOnly: boolean;
  /** Global kill switch — if false, feature is off for everyone (except Admin) */
  enabled: boolean;
  /** Timestamps */
  createdAt: Date;
  updatedAt: Date;
}

// ─── Schema ─────────────────────────────────────────────────────
const FeatureFlagSchema = new Schema<IFeatureFlag>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: undefined,
    },
    allowedTiers: {
      type: [String],
      enum: ['starter', 'pro'],
      default: ['pro'],
      validate: {
        validator: (v: string[]) => v.length > 0,
        message: 'At least one tier must be specified',
      },
    },
    adminOnly: {
      type: Boolean,
      default: false,
    },
    enabled: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    collection: 'featureflags',
  }
);

// ─── Indexes ────────────────────────────────────────────────────
FeatureFlagSchema.index({ enabled: 1 });
FeatureFlagSchema.index({ key: 1, enabled: 1 });

export const FeatureFlag =
  models.FeatureFlag || model<IFeatureFlag>('FeatureFlag', FeatureFlagSchema);
