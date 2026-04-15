/**
 * User Model — Mongoose
 * ─────────────────────
 * Stores both credential-based and OAuth-authenticated users.
 * The `googleId` field links Google OAuth accounts.
 */

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
    {
        // ── Identity ──────────────────────────────────────
        fullName: {
            type: String,
            required: true,
            trim: true,
            maxlength: 100,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true,
        },
        password: {
            type: String,
            default: null, // null for OAuth-only users
        },

        // ── OAuth Providers ───────────────────────────────
        googleId: {
            type: String,
            default: null,
            sparse: true,
            index: true,
        },

        // ── Profile ───────────────────────────────────────
        avatar: {
            type: String,
            default: null,
        },
        phone: {
            type: String,
            default: '',
        },

        // ── Authorization ─────────────────────────────────
        role: {
            type: String,
            enum: ['Admin', 'Staff', 'Viewer'],
            default: 'Admin',
        },
        status: {
            type: String,
            enum: ['active', 'inactive', 'suspended'],
            default: 'active',
        },

        // ── Metadata ──────────────────────────────────────
        isEmailVerified: {
            type: Boolean,
            default: false,
        },
        lastLogin: {
            type: Date,
            default: null,
        },
        loginProvider: {
            type: String,
            enum: ['local', 'google', 'microsoft'],
            default: 'local',
        },
    },
    {
        timestamps: true, // createdAt, updatedAt
        collection: 'users',
    }
);

// ── Indexes ───────────────────────────────────────────────
userSchema.index({ googleId: 1 }, { sparse: true });

// ── Instance Methods ──────────────────────────────────────
userSchema.methods.toSafeObject = function () {
    return {
        id: this._id.toString(),
        fullName: this.fullName,
        email: this.email,
        avatar: this.avatar,
        role: this.role,
        status: this.status,
        isEmailVerified: this.isEmailVerified,
        loginProvider: this.loginProvider,
        lastLogin: this.lastLogin,
        createdAt: this.createdAt,
    };
};

const User = mongoose.model('User', userSchema);

module.exports = User;
