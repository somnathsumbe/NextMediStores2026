import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { getMongoDb } from "@/lib/mongodb";

export async function getAuth() {
  const authDb = await getMongoDb();

  return betterAuth({
    database: mongodbAdapter(authDb, {
      usePlural: false,
      transaction: false,
    }),
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL,
    emailAndPassword: {
      enabled: true,
      autoSignIn: true,
      requireEmailVerification: false,
      minPasswordLength: 8,
      maxPasswordLength: 128,
    },
  });
}
