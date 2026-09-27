import { toNextJsHandler } from "better-auth/next-js";
import { getAuth } from "@/lib/auth";

export const { GET, POST, PATCH, PUT, DELETE } = toNextJsHandler(async (request: Request) => {
  const auth = await getAuth();
  return auth.handler(request);
});
