import { NextRequest, NextResponse } from "next/server";
import { authResponseJson, authSignal } from "@/lib/proxy/auth-json";
import {
  clearSessionCookie,
  getUpstreamApiUrl,
  sanitizeUser,
  setSessionCookie,
  SESSION_COOKIE_NAME,
  validateCsrf,
} from "@/utils/session";

type UpstreamErrorBody = {
  message?: string;
};

async function handleRefresh(request: NextRequest, updateCookie: boolean) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json(
      { message: "Sessão ausente ou não autenticado." },
      { status: 401, headers: { "Cache-Control": "private, no-store" } },
    );
  }

  try {
    const signal = authSignal(request);
    const upstreamUrl = `${getUpstreamApiUrl()}/usuarios/refresh-token`;
    const upstreamRes = await fetch(upstreamUrl, {
      method: "GET",
      signal, cache: "no-store", redirect: "error",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!upstreamRes.ok) {
      const errorData = (await authResponseJson(upstreamRes, signal)) as UpstreamErrorBody;

      if (upstreamRes.status !== 401) {
        return NextResponse.json(
          {
            message:
              errorData.message ||
              "Não foi possível verificar a sessão no momento.",
            sessionUnavailable: true,
          },
          { status: upstreamRes.status, headers: { "Cache-Control": "private, no-store" } },
        );
      }

      const response = NextResponse.json(
        {
          message: errorData.message || "Sessão expirada.",
          sessionExpired: true,
        },
        {
          status: 401,
          headers: {
            "Cache-Control": "private, no-store",
            "x-session-expired": "true",
          },
        },
      );
      // A delayed session read must not delete a cookie set by a newer login.
      if (updateCookie) clearSessionCookie(response);
      return response;
    }

    const responseData = await authResponseJson(upstreamRes, signal);
    const newToken = responseData?.token || token;
    const sanitized = sanitizeUser(responseData);

    const response = NextResponse.json(sanitized, { status: 200, headers: { "Cache-Control": "private, no-store" } });
    // Only an explicit CSRF-checked POST renews the bounded session cookie.
    if (updateCookie) setSessionCookie(response, newToken);
    return response;
  } catch (error: unknown) {
    return NextResponse.json(
      {
        message: "Não foi possível verificar a sessão no momento.",
        sessionUnavailable: true,
      },
      { status: error instanceof Error && ["TimeoutError", "AbortError"].includes(error.name) ? 504 : 502, headers: { "Cache-Control": "private, no-store" } },
    );
  }
}

export async function GET(request: NextRequest) {
  return handleRefresh(request, false);
}

export async function POST(request: NextRequest) {
  if (!validateCsrf(request)) {
    return NextResponse.json(
      { message: "Solicitação rejeitada por validação CSRF/origem." },
      { status: 403 },
    );
  }

  return handleRefresh(request, true);
}
