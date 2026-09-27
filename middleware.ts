import { NextRequest, NextResponse } from "next/server";

const protectedPaths = [
  "/dashboard",
  "/products",
  "/parties",
  "/orders",
  "/sales-orders",
  "/reports",
  "/profile",
  "/user-management",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = protectedPaths.some((path) =>
    pathname === path || pathname.startsWith(`${path}/`),
  );

  if (!isProtected) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get("medistores_auth");

  if (!sessionCookie) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/products/:path*",
    "/parties/:path*",
    "/orders/:path*",
    "/sales-orders/:path*",
    "/reports/:path*",
    "/profile/:path*",
    "/user-management/:path*",
  ],
};
