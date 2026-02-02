import { MongoClient } from "mongodb";
import mongoose from "mongoose";

const uri = process.env.MONGODB_URI;
if (!uri) {
  throw new Error("Missing MONGODB_URI env var");
}

declare global {
  // eslint-disable-next-line no-var
  var __mongoClientPromise: Promise<MongoClient> | undefined;
  var mongoose: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };
}

// For NextAuth MongoDB adapter
const client = new MongoClient(uri);

export const mongoClientPromise =
  global.__mongoClientPromise ?? (global.__mongoClientPromise = client.connect());

// For Mongoose models
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
    };

    cached.promise = mongoose.connect(uri!, opts).then((mongoose) => {
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export async function getDb() {
  const connectedClient = await mongoClientPromise;
  const dbName = process.env.MONGODB_DB ?? "ind_manager";
  return connectedClient.db(dbName);
}

// Export clientPromise for NextAuth adapter
export default mongoClientPromise;

