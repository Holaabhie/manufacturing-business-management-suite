import { getDb } from "@/lib/mongodb";

/**
 * Ensures all MongoDB collection validators and indexes are in place.
 *
 * Call once at app startup (e.g. from a setup script or admin endpoint).
 * Safe to run multiple times — uses createCollection with `validator`
 * and createIndex with implicit dedup.
 */
export async function ensureCollections() {
    const db = await getDb();

    // ─── Helper: create collection with JSON Schema validator ────
    async function ensure(name: string, validator: object) {
        try {
            await db.createCollection(name, { validator });
        } catch (err: any) {
            // Collection already exists — update the validator
            if (err.codeName === "NamespaceExists" || err.code === 48) {
                await db.command({ collMod: name, validator });
            } else {
                throw err;
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // 1. USERS
    // ═══════════════════════════════════════════════════════════════
    await ensure("ind_users", {
        $jsonSchema: {
            bsonType: "object",
            required: ["name", "email", "role", "isActive", "createdAt", "updatedAt"],
            properties: {
                name: { bsonType: "string", description: "Full display name" },
                email: { bsonType: "string", description: "Unique email address" },
                phone: { bsonType: ["string", "null"] },
                passwordHash: { bsonType: ["string", "null"] },
                googleId: { bsonType: ["string", "null"] },
                avatar: { bsonType: ["string", "null"] },
                businessId: { bsonType: "objectId" },
                role: {
                    bsonType: "string",
                    enum: ["owner", "manager", "staff", "accountant"],
                },
                customPermissions: { bsonType: "object" },
                isActive: { bsonType: "bool" },
                lastLoginAt: { bsonType: ["date", "null"] },
                lastActiveAt: { bsonType: ["date", "null"] },
                rememberMe: { bsonType: "bool" },
                deviceTokens: {
                    bsonType: "array",
                    items: { bsonType: "string" },
                },
                createdAt: { bsonType: "date" },
                updatedAt: { bsonType: "date" },
            },
        },
    });

    const usersCol = db.collection("ind_users");
    await usersCol.createIndex({ email: 1 }, { unique: true });
    await usersCol.createIndex({ businessId: 1 });
    await usersCol.createIndex({ googleId: 1 }, { sparse: true, unique: true });
    await usersCol.createIndex({ role: 1, businessId: 1 });

    // ═══════════════════════════════════════════════════════════════
    // 2. BUSINESSES
    // ═══════════════════════════════════════════════════════════════
    await ensure("ind_businesses", {
        $jsonSchema: {
            bsonType: "object",
            required: ["name", "createdAt", "updatedAt"],
            properties: {
                name: { bsonType: "string" },
                gstin: { bsonType: ["string", "null"] },
                pan: { bsonType: ["string", "null"] },
                address: {
                    bsonType: "object",
                    properties: {
                        line1: { bsonType: "string" },
                        line2: { bsonType: ["string", "null"] },
                        city: { bsonType: "string" },
                        state: { bsonType: "string" },
                        stateCode: { bsonType: "string" },
                        pincode: { bsonType: "string" },
                        country: { bsonType: "string" },
                    },
                },
                phone: { bsonType: ["string", "null"] },
                email: { bsonType: ["string", "null"] },
                logo: { bsonType: ["string", "null"] },
                bankDetails: {
                    bsonType: "object",
                    properties: {
                        bankName: { bsonType: "string" },
                        accountNo: { bsonType: "string" },
                        ifsc: { bsonType: "string" },
                        branch: { bsonType: "string" },
                    },
                },
                invoiceSettings: {
                    bsonType: "object",
                    properties: {
                        prefix: { bsonType: "string" },
                        nextNumber: { bsonType: "int" },
                        termsAndConditions: { bsonType: "string" },
                        defaultDueDays: { bsonType: "int" },
                    },
                },
                gstSettings: {
                    bsonType: "object",
                    properties: {
                        registrationType: {
                            bsonType: "string",
                            enum: ["regular", "composition", "unregistered"],
                        },
                        defaultGstRate: { bsonType: "number" },
                    },
                },
                subscriptionPlan: {
                    bsonType: "string",
                    enum: ["free", "starter", "pro", "enterprise"],
                },
                subscriptionExpiry: { bsonType: ["date", "null"] },
                createdAt: { bsonType: "date" },
                updatedAt: { bsonType: "date" },
            },
        },
    });

    const bizCol = db.collection("ind_businesses");
    await bizCol.createIndex({ gstin: 1 }, { sparse: true, unique: true });
    await bizCol.createIndex({ pan: 1 }, { sparse: true, unique: true });
    await bizCol.createIndex({ subscriptionPlan: 1 });

    // ═══════════════════════════════════════════════════════════════
    // 3. SESSIONS
    // ═══════════════════════════════════════════════════════════════
    await ensure("ind_sessions", {
        $jsonSchema: {
            bsonType: "object",
            required: ["userId", "token", "expiresAt", "createdAt"],
            properties: {
                userId: { bsonType: "objectId" },
                token: { bsonType: "string" },
                deviceInfo: { bsonType: ["string", "null"] },
                ipAddress: { bsonType: ["string", "null"] },
                expiresAt: { bsonType: "date" },
                rememberMe: { bsonType: "bool" },
                createdAt: { bsonType: "date" },
            },
        },
    });

    const sessCol = db.collection("ind_sessions");
    await sessCol.createIndex({ token: 1 }, { unique: true });
    await sessCol.createIndex({ userId: 1 });
    await sessCol.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

    // ═══════════════════════════════════════════════════════════════
    // 4. OTP TOKENS
    // ═══════════════════════════════════════════════════════════════
    await ensure("ind_otp_tokens", {
        $jsonSchema: {
            bsonType: "object",
            required: ["phone", "otp", "purpose", "attempts", "expiresAt", "createdAt"],
            properties: {
                phone: { bsonType: "string" },
                otp: { bsonType: "string" },
                purpose: {
                    bsonType: "string",
                    enum: ["login", "verify", "reset"],
                },
                attempts: { bsonType: "int" },
                expiresAt: { bsonType: "date" },
                createdAt: { bsonType: "date" },
            },
        },
    });

    const otpCol = db.collection("ind_otp_tokens");
    await otpCol.createIndex({ phone: 1, purpose: 1 });
    await otpCol.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

    // ═══════════════════════════════════════════════════════════════
    // 5. AUDIT LOGS
    // ═══════════════════════════════════════════════════════════════
    await ensure("ind_audit_logs", {
        $jsonSchema: {
            bsonType: "object",
            required: ["businessId", "userId", "action", "entityType", "createdAt"],
            properties: {
                businessId: { bsonType: "objectId" },
                userId: { bsonType: "objectId" },
                action: { bsonType: "string" },
                entityType: { bsonType: "string" },
                entityId: { bsonType: ["objectId", "string"] },
                changes: { bsonType: "object" },
                ipAddress: { bsonType: ["string", "null"] },
                userAgent: { bsonType: ["string", "null"] },
                createdAt: { bsonType: "date" },
            },
        },
    });

    const auditCol = db.collection("ind_audit_logs");
    await auditCol.createIndex({ businessId: 1, createdAt: -1 });
    await auditCol.createIndex({ entityType: 1, entityId: 1 });
    await auditCol.createIndex({ userId: 1, createdAt: -1 });
    await auditCol.createIndex({ action: 1 });

    console.log("✅ All IND Manager collections and indexes ensured.");
}
