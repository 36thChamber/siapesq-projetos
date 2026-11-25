import { NextRequest, NextResponse } from "next/server";
import { contentSecurityPolicy } from "@/lib/security/csp";
import { testAccessAllowed } from "@/lib/security/test-access";

export function proxy(request: NextRequest) {
  if (!testAccessAllowed(request.headers.get("authorization"), process.env.TEST_ACCESS_USER, process.env.TEST_ACCESS_PASSWORD)) {
    return new NextResponse("Ambiente de testes. Autenticação necessária.", { status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="SIAPESQ Teste", charset="UTF-8"', "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" } });
  }
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
  if (process.env.CLONE_TEST_MODE === "true") response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

export const config = { matcher: ["/((?!_next|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)"] };
