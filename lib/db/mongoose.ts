import mongoose from "mongoose";

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

declare global {
  var __mongooseCache: MongooseCache | undefined;
}

const globalCache: MongooseCache = global.__mongooseCache ?? {
  conn: null,
  promise: null,
};

global.__mongooseCache = globalCache;

export async function connectToDatabase(): Promise<typeof mongoose> {
  if (globalCache.conn) return globalCache.conn;

  const uri = process.env.MONGODB_URI ?? process.env.DB_URI;
  if (!uri) {
    throw new Error("Missing MONGODB_URI (or DB_URI) in environment");
  }

  if (!globalCache.promise) {
    globalCache.promise = mongoose.connect(uri, {
      // Keep default options; Mongoose v7+ uses stable defaults.
      bufferCommands: false,
    }) as unknown as Promise<typeof mongoose>;
  }

  globalCache.conn = await globalCache.promise;
  console.log("dbbbbbbbbbbbbbbbbbbbbbb connnnnnnectecd");
  return globalCache.conn;
}
