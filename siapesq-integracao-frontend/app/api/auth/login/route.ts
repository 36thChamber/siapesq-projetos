import { NextRequest, NextResponse } from "next/server";
import { authRequestJson, authResponseJson, authSignal } from "@/lib/proxy/auth-json";
import { ProxyLimitError } from "@/lib/proxy/streams";
import {
  getUpstreamApiUrl,
  sanitizeUser,
  setSessionCookie,
  validateCsrf,
} from "@/utils/session";

export async function POST(request: NextRequest) {
  if (!validateCsrf(request)) {
    return NextResponse.json(
      { message: "Solicitação rejeitada por validação CSRF/origem." },
      { status: 403, headers: { "Cache-Control": "private, no-store" } },
    );
  }

  try {
    const signal = authSignal(request);
    const body = await authRequestJson(request, signal);
    const { email, senha } = body || {};

    if (!email || !senha) {
      return NextResponse.json(
        { message: "E-mail e senha são obrigatórios." },
        { status: 400, headers: { "Cache-Control": "private, no-store" } },
      );
    }

    const upstreamUrl = `${getUpstreamApiUrl()}/usuarios/login`;
    const upstreamRes = await fetch(upstreamUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, senha }),
      signal, cache: "no-store", redirect: "error",
    });

    const responseData = await authResponseJson(upstreamRes, signal);

    if (!upstreamRes.ok) {
      return NextResponse.json(responseData, {
        status: upstreamRes.status,
        headers: { "Cache-Control": "private, no-store" },
      });
    }

    const token = responseData?.token;
    if (!token) {
      return NextResponse.json(
        { message: "Resposta de autenticação inválida do servidor upstream." },
        { status: 502, headers: { "Cache-Control": "private, no-store" } },
      );
    }

    const sanitized = sanitizeUser(responseData);
    const response = NextResponse.json(sanitized, { status: 200, headers: { "Cache-Control": "private, no-store" } });

    setSessionCookie(response, token);
    return response;
  } catch (error: any) {
    const status = error instanceof ProxyLimitError ? error.status : ["TimeoutError", "AbortError"].includes(error?.name) ? 504 : 502;
    return NextResponse.json(
      { message: error instanceof ProxyLimitError ? error.message : "Não foi possível concluir a autenticação." },
      { status, headers: { "Cache-Control": "private, no-store" } },
    );
  }
}
