import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const response = NextResponse.json({ success: true });
  response.cookies.set("medistores_auth", "", { expires: new Date(0), maxAge: 0, httpOnly: true, sameSite: "lax", secure: request.url.startsWith("https://"), path: "/" });
  return response;
}
