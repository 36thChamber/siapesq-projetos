import { NextRequest, NextResponse } from "next/server";
import { BASE_API } from "@/resources/BASE_API";
import { Usuario } from "@/services/types/usuario.types";
import { getProductionApiUrl, normalizeApiUrl } from "@/config/api-url";

export const SESSION_COOKIE_NAME = "siapesq_session";
export const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 dias

export function getUpstreamApiUrl(): string {
  if (process.env.NODE_ENV === "production") {
    return getProductionApiUrl();
  }

  // NEXT_PUBLIC_API_URL é compatibilidade de desenvolvimento. O navegador usa
  // somente /api; em produção o BFF deve receber API_URL no ambiente do servidor.
  const url = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || BASE_API;
  return normalizeApiUrl(url, "API_URL, NEXT_PUBLIC_API_URL ou BASE_API");
}

/**
 * Sanitiza o objeto retornado pela API para garantir que credenciais brutas
 * (como tokens JWT) não sejam expostas ao JavaScript da aplicação cliente.
 */
export function sanitizeUser(user: any): Partial<Usuario> {
  if (!user || typeof user !== "object") return user;
  const { token, senha, password, ...sanitized } = user;
  return sanitized as Partial<Usuario>;
}

/**
 * Aplica o cookie de sessão HttpOnly com atributos seguros e SameSite=Lax.
 */
export function setSessionCookie(response: NextResponse, token: string): void {
  const isProduction = process.env.NODE_ENV === "production";

  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

/**
 * Remove/expira o cookie de sessão HttpOnly no navegador.
 */
export function clearSessionCookie(response: NextResponse): void {
  const isProduction = process.env.NODE_ENV === "production";

  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  });
}

/**
 * Validação de origem e proteção CSRF para requisições com mutação de estado.
 */
export function validateCsrf(request: NextRequest): boolean {
  // Métodos seguros não precisam de validação estrita de CSRF
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) {
    return true;
  }

  const origin = request.headers.get("origin");
  const host = request.headers.get("host");

  // Se não houver origin (ex: chamadas internas do mesmo host/server ou mobile/curl),
  // verifica referer
  if (!origin) {
    const referer = request.headers.get("referer");
    if (!referer) return false; // Falha fechada sem evidência de origem
    try {
      const refererHost = new URL(referer).host;
      return refererHost === host;
    } catch {
      return false;
    }
  }

  try {
    const originHost = new URL(origin).host;
    return originHost === host;
  } catch {
    return false;
  }
}
