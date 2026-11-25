import { ProxyLimitError, readUpload } from "./streams";

export function authSignal(request: Request) {
  return AbortSignal.any([request.signal, AbortSignal.timeout(15000)]);
}

export async function authRequestJson(request: Request, signal: AbortSignal) {
  const declared = request.headers.get("content-length");
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > 16384)) throw new ProxyLimitError(413, "Solicitação excede o limite permitido.");
  const body = await readUpload(request.body, 16384, signal);
  try { return JSON.parse(new TextDecoder().decode(body)); }
  catch { throw new ProxyLimitError(400, "Solicitação inválida."); }
}

export async function authResponseJson(response: Response, signal: AbortSignal) {
  const declared = response.headers.get("content-length");
  if (declared && Number(declared) > 65536) throw new ProxyLimitError(502, "Resposta inválida da autenticação.");
  let body;
  try { body = await readUpload(response.body, 65536, signal); }
  catch (error) { if (error instanceof ProxyLimitError) throw new ProxyLimitError(502, "Resposta inválida da autenticação."); throw error; }
  try { return JSON.parse(new TextDecoder().decode(body)); }
  catch { return {}; }
}
