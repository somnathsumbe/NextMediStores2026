import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = new Set(["/", "/forgot-password", "/signup"]);

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === "/login") return NextResponse.redirect(new URL("/", request.url));
  if (PUBLIC_PATHS.has(pathname)) {
    if (pathname === "/" && request.cookies.has("medistores_auth")) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }
  if (!request.cookies.has("medistores_auth")) return NextResponse.redirect(new URL("/", request.url));
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/products/:path*",
    "/parties/:path*",
    "/sales-orders/:path*",
    "/purchase-orders/:path*",
    "/transactions/:path*",
    "/reports/:path*",
    "/invoice/:path*",
    "/masters/:path*",
    "/users/:path*",
    "/profile/:path*",
    "/bankinfo/:path*",
    "/login",
  ],
};