import { NextRequest, NextResponse } from "next/server";
import { getUpstreamApiUrl, SESSION_COOKIE_NAME } from "@/utils/session";
import { resolveCogUrl } from "@/lib/cog/catalog";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store" };

async function boundedJson(response: Response) {
  if (!response.body) throw new Error("Resposta vazia da API");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 65536) throw new Error("Resposta da API excede o limite");
      chunks.push(value);
    }
  } finally { await reader.cancel().catch(() => {}); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return JSON.parse(new TextDecoder().decode(bytes));
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ message: "Sessão ausente." }, { status: 401, headers });
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ message: "ID de análise inválido." }, { status: 400, headers });
  }
  try {
    const signal = AbortSignal.any([request.signal, AbortSignal.timeout(15000)]);
    signal.throwIfAborted();
    // The original API still checks user, plan and quota before disclosing a source.
    const upstream = await fetch(`${getUpstreamApiUrl()}/analises/${encodeURIComponent(id)}/tif`, {
      headers: { Authorization: `Bearer ${token}` }, cache: "no-store", redirect: "error", signal,
    });
    if (!upstream.ok) {
      void upstream.body?.cancel().catch(() => {});
      return NextResponse.json({ message: "Análise indisponível ou acesso negado." }, {
        status: upstream.status,
        headers: { ...headers, ...(upstream.status === 401 ? { "x-session-expired": "true" } : {}) },
      });
    }
    const original = await boundedJson(upstream);
    if (original.id_analise !== id || typeof original.url !== "string") throw new Error("Resposta inválida da API");
    const cog = await resolveCogUrl(original.url, signal);
    return NextResponse.json({ id_analise: id, ...cog }, { headers });
  } catch {
    return NextResponse.json({ message: "COG indisponível ou ainda não validado para esta análise." }, { status: 503, headers });
  }
}
