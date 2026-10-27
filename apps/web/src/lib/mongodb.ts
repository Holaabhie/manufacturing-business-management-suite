import { MongoClient, type Db } from "mongodb";
import mongoose from "mongoose";

function assertMongoClient(client: unknown): asserts client is MongoClient {
  if (!client || typeof client !== "object" || !("db" in client)) {
    throw new DbUnavailableError("Underlying MongoClient is invalid or unavailable.");
  }
}

function assertDb(db: unknown): asserts db is Db {
  if (!db || typeof db !== "object" || !("collection" in db)) {
    throw new DbUnavailableError("Underlying Db is invalid or unavailable.");
  }
}

// ─── Environment validation ────────────────────────────────────
const uri = process.env.MONGODB_URI;
const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";

if (!uri) {
  if (process.env.NODE_ENV === "production" && !isBuildPhase) {
    throw new Error(
      "FATAL: MONGODB_URI environment variable is not set in production. " +
      "Refusing to start with localhost fallback. " +
      "Set MONGODB_URI to your MongoDB connection string and restart."
    );
  }

  console.error(
    "\n" +
    "╔══════════════════════════════════════════════════════════╗\n" +
    "║  ⚠️  MONGODB_URI environment variable is not set        ║\n" +
    "║                                                        ║\n" +
    "║  Using fallback: mongodb://localhost:27017              ║\n" +
    "║                                                        ║\n" +
    "║  To fix:                                               ║\n" +
    "║  1. Copy .env.local.example to .env.local              ║\n" +
    "║  2. Set MONGODB_URI to your MongoDB connection string  ║\n" +
    "║  3. Restart the dev server                             ║\n" +
    "╚══════════════════════════════════════════════════════════╝\n"
  );
}

const resolvedUri = uri || "mongodb://localhost:27017";

// ─── Typed error for DB unavailability ─────────────────────────
export class DbUnavailableError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "DbUnavailableError";
  }
}

/** Type-guard route handlers can use to detect DB connection issues */
export function isDbUnavailableError(err: unknown): err is DbUnavailableError {
  return err instanceof DbUnavailableError;
}

// ─── Global Connection Cache (Resolved instances only) ─────────
interface MongoServerlessCache {
  conn: typeof mongoose | null;
  client: MongoClient | null;
}

declare global {
  var __mongoServerlessCache: MongoServerlessCache | undefined;
  var __mongoClientPromise: Promise<MongoClient> | undefined;
}

const isVercel = Boolean(process.env.VERCEL);

const mongoOpts: mongoose.ConnectOptions = {
  bufferCommands: false,
  connectTimeoutMS: isVercel ? 8_000 : 15_000,
  serverSelectionTimeoutMS: isVercel ? 8_000 : 30_000,
  socketTimeoutMS: 30_000,
  heartbeatFrequencyMS: 10_000,
  maxPoolSize: 10,
  minPoolSize: 0, // Serverless safe: never hold idle connections open
  maxIdleTimeMS: 20_000,
};

function getCache(): MongoServerlessCache {
  if (!global.__mongoServerlessCache) {
    global.__mongoServerlessCache = { conn: null, client: null };
  }
  return global.__mongoServerlessCache;
}

/**
 * Connects to MongoDB via Mongoose and caches the RESOLVED connection and client.
 * Uses a single unified connection pool for both Mongoose schemas and native driver queries.
 */
export async function connectToDatabase(): Promise<typeof mongoose> {
  const cached = getCache();

  if (!process.env.MONGODB_URI && process.env.NODE_ENV === "production" && !isBuildPhase) {
    throw new Error(
      "FATAL: MONGODB_URI environment variable is not set in production. " +
      "Set MONGODB_URI to your MongoDB connection string and restart."
    );
  }

  // 1. If we have a healthy active connection (readyState 1 = connected), reuse it
  if (cached.conn && cached.conn.connection?.readyState === 1) {
    return cached.conn;
  }

  // 2. If cached connection is dead or disconnecting, ensure cleanup
  if (cached.conn && cached.conn.connection?.readyState !== 1) {
    try {
      await mongoose.disconnect().catch(() => {});
    } catch {
      // Ignore disconnect errors
    }
    cached.conn = null;
    cached.client = null;
  }

  // 3. Connect fresh and store RESOLVED connection & client
  try {
    const conn = await mongoose.connect(resolvedUri, mongoOpts);
    const rawClient: unknown = conn.connection.getClient();
    assertMongoClient(rawClient);
    cached.conn = conn;
    cached.client = rawClient;
    return conn;
  } catch (err) {
    // On failure: close any partial connection and clear cache immediately
    try {
      await mongoose.disconnect().catch(() => {});
    } catch {
      // Ignore
    }
    cached.conn = null;
    cached.client = null;
    console.error("❌ MongoDB connection failed:", err instanceof Error ? err.message : err);
    throw err;
  }
}

/**
 * Primary API for raw driver queries.
 * Wraps the single shared Mongoose connection pool to prevent dual-driver socket leaks
 * and BSON version incompatibility.
 */
export async function getDb(): Promise<Db> {
  try {
    const conn = await connectToDatabase();
    const db = conn.connection.db;
    if (!db) {
      const dbName = process.env.MONGODB_DB ?? "ind_manager";
      const rawClient: unknown = conn.connection.getClient();
      assertMongoClient(rawClient);
      return rawClient.db(dbName);
    }
    assertDb(db);
    return db;
  } catch (err) {
    throw new DbUnavailableError(
      "Database is unavailable. Check your MongoDB connection.",
      err
    );
  }
}

/**
 * Returns the underlying MongoClient from the single shared pool.
 */
export async function getMongoClient(): Promise<MongoClient> {
  const conn = await connectToDatabase();
  const rawClient: unknown = conn.connection.getClient();
  assertMongoClient(rawClient);
  return rawClient;
}

// Export lazy promise for any consumer needing Promise<MongoClient>
export const mongoClientPromise: Promise<MongoClient> = (async () => {
  return getMongoClient();
})();

export default mongoClientPromise;
