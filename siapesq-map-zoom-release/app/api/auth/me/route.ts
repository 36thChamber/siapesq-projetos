import { NextRequest, NextResponse } from "next/server";
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

async function handleRefresh(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json(
      { message: "Sessão ausente ou não autenticado." },
      { status: 401 },
    );
  }

  try {
    const upstreamUrl = `${getUpstreamApiUrl()}/usuarios/refresh-token`;
    const upstreamRes = await fetch(upstreamUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!upstreamRes.ok) {
      const errorData = (await upstreamRes
        .json()
        .catch(() => ({}))) as UpstreamErrorBody;

      if (upstreamRes.status !== 401) {
        return NextResponse.json(
          {
            message:
              errorData.message ||
              "Não foi possível verificar a sessão no momento.",
            sessionUnavailable: true,
          },
          { status: upstreamRes.status },
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
            "x-session-expired": "true",
          },
        },
      );
      clearSessionCookie(response);
      return response;
    }

    const responseData = await upstreamRes.json().catch(() => ({}));
    const newToken = responseData?.token || token;
    const sanitized = sanitizeUser(responseData);

    const response = NextResponse.json(sanitized, { status: 200 });
    setSessionCookie(response, newToken);
    return response;
  } catch (error: unknown) {
    console.error("Erro no handler BFF de refresh/me:", error);
    return NextResponse.json(
      {
        message: "Não foi possível verificar a sessão no momento.",
        sessionUnavailable: true,
      },
      { status: 502 },
    );
  }
}

export async function GET(request: NextRequest) {
  return handleRefresh(request);
}

export async function POST(request: NextRequest) {
  if (!validateCsrf(request)) {
    return NextResponse.json(
      { message: "Solicitação rejeitada por validação CSRF/origem." },
      { status: 403 },
    );
  }

  return handleRefresh(request);
}
