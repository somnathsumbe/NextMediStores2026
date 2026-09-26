import { MongoClient, type MongoClientOptions } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "medistore";

if (!uri) {
  throw new Error("MONGODB_URI is not configured. Add it to .env.local on the server.");
}

const mongodbUri = uri;

const options: MongoClientOptions = {
  maxPoolSize: 10,
  minPoolSize: 0,
  maxIdleTimeMS: 60_000,
  connectTimeoutMS: 10_000,
  serverSelectionTimeoutMS: 5_000,
};

declare global {
  // eslint-disable-next-line no-var
  var __medistoreMongoClientPromise: Promise<MongoClient> | undefined;
}

let clientPromise: Promise<MongoClient> | undefined;

function getClientPromise() {
  if (clientPromise) return clientPromise;

  clientPromise = global.__medistoreMongoClientPromise ?? new MongoClient(mongodbUri, options).connect().catch((error) => {
    console.error("MongoDB Atlas connection failed:", error);
    const message = error instanceof Error ? error.message : "Unknown MongoDB connection error.";
    throw new Error(`MongoDB Atlas connection failed. Check Atlas cluster status, IP allowlist, credentials, and MONGODB_URI. Details: ${message}`);
  });

  if (process.env.NODE_ENV !== "production") {
    global.__medistoreMongoClientPromise = clientPromise;
  }

  return clientPromise;
}

export async function getMongoDb() {
  const connectedClient = await getClientPromise();
  return connectedClient.db(dbName);
}

export { dbName };
