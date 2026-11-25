export class ProxyLimitError extends Error {
  constructor(public readonly status: number, message: string) { super(message); }
}

/** Read uploads up to a hard bound before sending any bytes to the API. */
export async function readUpload(body: ReadableStream<Uint8Array> | null, limit: number, signal: AbortSignal) {
  if (!body) return undefined;
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  const abort = () => { void reader.cancel().catch(() => {}); };
  signal.addEventListener("abort", abort, { once: true });
  try {
    signal.throwIfAborted();
    for (;;) {
      const { done, value } = await reader.read();
      signal.throwIfAborted();
      if (done) break;
      size += value.byteLength;
      if (size > limit) throw new ProxyLimitError(413, "Upload excede o limite permitido.");
      chunks.push(value);
    }
    if (!size) return undefined;
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    return bytes;
  } catch (error) {
    void reader.cancel().catch(() => {});
    throw error;
  } finally {
    signal.removeEventListener("abort", abort);
    reader.releaseLock();
  }
}

/** Backpressure-aware response with a byte ceiling, deadline and cancellation. */
export function streamResponse(body: ReadableStream<Uint8Array>, limit: number, signal: AbortSignal, finish: () => void) {
  const reader = body.getReader();
  let size = 0;
  let closed = false;
  let output: ReadableStreamDefaultController<Uint8Array>;
  const cleanup = () => {
    if (closed) return;
    closed = true;
    signal.removeEventListener("abort", abort);
    finish();
  };
  const abort = () => {
    if (closed) return;
    output.error(signal.reason);
    void reader.cancel(signal.reason).catch(() => {});
    cleanup();
  };
  return new ReadableStream<Uint8Array>({
    start(controller) {
      output = controller;
      signal.addEventListener("abort", abort, { once: true });
      if (signal.aborted) abort();
    },
    async pull(controller) {
      try {
        const { done, value } = await reader.read();
        if (closed) return;
        signal.throwIfAborted();
        if (done) { controller.close(); cleanup(); return; }
        size += value.byteLength;
        if (size > limit) throw new ProxyLimitError(502, "Resposta upstream excede o limite permitido.");
        controller.enqueue(value);
      } catch (error) {
        if (!closed) controller.error(error);
        void reader.cancel(error).catch(() => {});
        cleanup();
      }
    },
    cancel(reason) {
      cleanup();
      return reader.cancel(reason);
    },
  });
}

export function positiveLimit(value: string | undefined, fallback: number, ceiling: number) {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > ceiling) throw new Error("Limite de proxy inválido");
  return parsed;
}
