import { MongoClient, MongoClientOptions } from "mongodb";
import mongoose from "mongoose";

// ─── Environment validation ────────────────────────────────────
const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error(
    "\n" +
    "╔══════════════════════════════════════════════════════════╗\n" +
    "║  ❌  MONGODB_URI environment variable is not set        ║\n" +
    "║                                                        ║\n" +
    "║  To fix:                                               ║\n" +
    "║  1. Copy .env.local.example to .env.local              ║\n" +
    "║  2. Set MONGODB_URI to your MongoDB connection string  ║\n" +
    "║  3. Restart the dev server                             ║\n" +
    "╚══════════════════════════════════════════════════════════╝\n"
  );
  throw new Error(
    "Missing MONGODB_URI — copy .env.local.example to .env.local and configure it."
  );
}

declare global {
  // eslint-disable-next-line no-var
  var __mongoClientPromise: Promise<MongoClient> | undefined;
  var mongoose: {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
  };
}

// ─── MongoClient (for raw driver queries via getDb()) ──────────
const clientOptions: MongoClientOptions = {
  connectTimeoutMS: 10_000,
  socketTimeoutMS: 45_000,
  serverSelectionTimeoutMS: 10_000,
  maxPoolSize: 10,
  retryWrites: true,
  retryReads: true,
};

const client = new MongoClient(uri, clientOptions);

async function connectWithRetry(
  maxAttempts = 3,
  delayMs = 1000
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
      // Exponential backoff: 1s → 2s → 4s
      const wait = delayMs * Math.pow(2, attempt - 1);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw new Error("Unreachable");
}

export const mongoClientPromise: Promise<MongoClient> =
  global.__mongoClientPromise ??
  (global.__mongoClientPromise = connectWithRetry());

// ─── Mongoose (for models / schemas) ───────────────────────────
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

export async function connectToDatabase() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      connectTimeoutMS: 10_000,
      socketTimeoutMS: 45_000,
      serverSelectionTimeoutMS: 10_000,
    };

    cached.promise = mongoose.connect(uri!, opts).then(() => {
      console.log("✅ Mongoose connected successfully");
      return mongoose as typeof mongoose;
    }) as Promise<typeof mongoose>;
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
  const connectedClient = await mongoClientPromise;
  const dbName = process.env.MONGODB_DB ?? "ind_manager";
  return connectedClient.db(dbName);
}

// Export clientPromise for NextAuth adapter
export default mongoClientPromise;

