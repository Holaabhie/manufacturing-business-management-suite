import { MongoClient, MongoClientOptions } from "mongodb";
import mongoose from "mongoose";

// ─── Environment validation ────────────────────────────────────
const uri = process.env.MONGODB_URI;

if (!uri) {
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

declare global {
  // eslint-disable-next-line no-var
  var __mongoClientPromise: Promise<MongoClient> | undefined;
  // eslint-disable-next-line no-var
  var __mongooseCache: {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
  };
}

// ─── MongoClient (for raw driver queries via getDb()) ──────────
const clientOptions: MongoClientOptions = {
  connectTimeoutMS: 5_000,
  socketTimeoutMS: 45_000,
  serverSelectionTimeoutMS: 5_000,
  maxPoolSize: 10,
  retryWrites: true,
  retryReads: true,
};

const client = new MongoClient(resolvedUri, clientOptions);

async function connectWithRetry(
  maxAttempts = 2,
  delayMs = 500
): Promise<MongoClient> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const connected = await client.connect();
      console.log("✅ MongoDB connected successfully");
      return connected;
    } catch (err) {
      console.error(
        `⚠️  MongoDB connection attempt ${attempt}/${maxAttempts} failed:`,
        err instanceof Error ? err.message : err
      );
      if (attempt === maxAttempts) {
        console.error(
          "❌ All MongoDB connection attempts exhausted. Check your MONGODB_URI."
        );
        throw err;
      }
      // Exponential backoff: 500ms → 1s
      const wait = delayMs * Math.pow(2, attempt - 1);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw new Error("Unreachable");
}

/**
 * Returns a promise that resolves to a connected MongoClient.
 * If the previous connection attempt failed, the cached promise is cleared
 * so the next call will retry instead of returning the stale rejection.
 */
function getClientPromise(): Promise<MongoClient> {
  if (!global.__mongoClientPromise) {
    global.__mongoClientPromise = connectWithRetry().catch((err) => {
      // Clear the cached promise so subsequent requests retry
      global.__mongoClientPromise = undefined;
      throw err;
    });
  }
  return global.__mongoClientPromise;
}

export const mongoClientPromise: Promise<MongoClient> = getClientPromise();

// ─── Mongoose (for models / schemas) ───────────────────────────
let cached = global.__mongooseCache;

if (!cached) {
  cached = global.__mongooseCache = { conn: null, promise: null };
}

export async function connectToDatabase() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      connectTimeoutMS: 5_000,
      socketTimeoutMS: 45_000,
      serverSelectionTimeoutMS: 5_000,
    };

    cached.promise = mongoose.connect(resolvedUri!, opts).then(() => {
      console.log("✅ Mongoose connected successfully");
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    console.error("❌ Mongoose connection failed:", e instanceof Error ? e.message : e);
    throw e;
  }

  return cached.conn;
}

// ─── getDb() — primary API for route handlers ──────────────────
export async function getDb() {
  try {
    const connectedClient = await getClientPromise();
    const dbName = process.env.MONGODB_DB ?? "ind_manager";
    return connectedClient.db(dbName);
  } catch (err) {
    throw new DbUnavailableError(
      "Database is unavailable. Check your MongoDB connection.",
      err
    );
  }
}

// Export clientPromise for NextAuth adapter
export default mongoClientPromise;
