type SerializedRequest = {
  id?: string | number;
  method?: string;
  url?: string;
  remoteAddress?: string;
  remotePort?: number;
};

function redactUrl(url: string | undefined): string | undefined {
  if (!url || !url.includes("?")) return url;
  try {
    const parsed = new URL(url, "http://localhost");
    for (const key of parsed.searchParams.keys()) {
      if (/token/i.test(key)) parsed.searchParams.set(key, "[REDACTED]");
    }
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return "[URL_REDACTED]";
  }
}

export function serializeSafeRequest(req: SerializedRequest) {
  return {
    id: req.id,
    method: req.method,
    url: redactUrl(req.url),
    remoteAddress: req.remoteAddress,
    remotePort: req.remotePort,
  };
}
