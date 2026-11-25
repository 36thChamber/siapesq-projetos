import { NextRequest, NextResponse } from "next/server";
import { getUpstreamApiUrl, SESSION_COOKIE_NAME } from "@/utils/session";
import { readUpload } from "@/lib/proxy/streams";
import { resolveCogUrl } from "@/lib/cog/catalog";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store" };

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
    const metadataOnly = process.env.COG_AUTHORIZATION_MODE === "metadata";
    const upstream = await fetch(`${getUpstreamApiUrl()}/analises/${encodeURIComponent(id)}/tif${metadataOnly ? "/access" : ""}`, {
      headers: { Authorization: `Bearer ${token}` }, cache: "no-store", redirect: "error", signal,
    });
    if (!upstream.ok) {
      void upstream.body?.cancel().catch(() => {});
      return NextResponse.json({ message: "Análise indisponível ou acesso negado." }, {
        status: upstream.status,
        headers: { ...headers, ...(upstream.status === 401 ? { "x-session-expired": "true" } : {}) },
      });
    }
    const bytes = await readUpload(upstream.body, 65536, signal);
    const original = JSON.parse(new TextDecoder().decode(bytes));
    if (original.id_analise !== id) throw new Error("Resposta inválida da API");
    let source: string | { key: string };
    if (metadataOnly) {
      if (!process.env.COG_BUCKET || original.source_bucket !== process.env.COG_BUCKET || typeof original.source_key !== "string") {
        throw new Error("Metadados de armazenamento inválidos");
      }
      source = { key: original.source_key };
    } else {
      if (typeof original.url !== "string") throw new Error("Resposta inválida da API");
      source = original.url;
    }
    const cog = await resolveCogUrl(source, signal);
    return NextResponse.json({ id_analise: id, ...cog }, { headers });
  } catch {
    return NextResponse.json({ message: "COG indisponível ou ainda não validado para esta análise." }, { status: 503, headers });
  }
}
