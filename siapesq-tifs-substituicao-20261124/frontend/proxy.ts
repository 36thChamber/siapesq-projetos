import { NextRequest, NextResponse } from "next/server";
import { contentSecurityPolicy } from "@/lib/security/csp";

export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api/")) return NextResponse.next();
  const nonce = Buffer.from(crypto.getRandomValues(new Uint8Array(24))).toString("base64");
  const development = process.env.NODE_ENV === "development";
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(request.nextUrl.hostname);
  const policy = contentSecurityPolicy(nonce, development, !development && !local);
  const headers = new Headers(request.headers);
  headers.set("x-nonce", nonce);
  headers.set("Content-Security-Policy", policy);
  const response = NextResponse.next({ request: { headers } });
  response.headers.set("Content-Security-Policy", policy);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = { matcher: ["/((?!_next|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)"] };
