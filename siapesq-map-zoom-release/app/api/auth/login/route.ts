import { NextRequest, NextResponse } from "next/server";
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
      { status: 403 },
    );
  }

  try {
    const body = await request.json();
    const { email, senha } = body || {};

    if (!email || !senha) {
      return NextResponse.json(
        { message: "E-mail e senha são obrigatórios." },
        { status: 400 },
      );
    }

    const upstreamUrl = `${getUpstreamApiUrl()}/usuarios/login`;
    const upstreamRes = await fetch(upstreamUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, senha }),
    });

    const responseData = await upstreamRes.json().catch(() => ({}));

    if (!upstreamRes.ok) {
      return NextResponse.json(responseData, {
        status: upstreamRes.status,
      });
    }

    const token = responseData?.token;
    if (!token) {
      return NextResponse.json(
        { message: "Resposta de autenticação inválida do servidor upstream." },
        { status: 502 },
      );
    }

    const sanitized = sanitizeUser(responseData);
    const response = NextResponse.json(sanitized, { status: 200 });

    setSessionCookie(response, token);
    return response;
  } catch (error: any) {
    console.error("Erro no handler BFF de login:", error);
    return NextResponse.json(
      { message: "Erro interno no servidor de autenticação." },
      { status: 500 },
    );
  }
}
