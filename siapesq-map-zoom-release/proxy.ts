import { NextRequest, NextResponse } from "next/server";
import { contentSecurityPolicy } from "@/lib/security/csp";

export function proxy(request: NextRequest) {
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(request.nextUrl.hostname);
  const response = NextResponse.next();
  response.headers.set("Content-Security-Policy", contentSecurityPolicy(process.env.NODE_ENV === "production" && !local));
  return response;
}
export const config = { matcher: ["/((?!_next|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)"] };
