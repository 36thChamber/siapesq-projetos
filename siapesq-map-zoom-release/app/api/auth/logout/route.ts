import { NextRequest, NextResponse } from "next/server";
import { clearSessionCookie, validateCsrf } from "@/utils/session";

export async function POST(request: NextRequest) {
  if (!validateCsrf(request)) {
    return NextResponse.json(
      { message: "Solicitação rejeitada por validação CSRF/origem." },
      { status: 403 },
    );
  }

  const response = NextResponse.json(
    { ok: true, message: "Sessão encerrada com sucesso." },
    { status: 200 },
  );

  clearSessionCookie(response);
  return response;
}
