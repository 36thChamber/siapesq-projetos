export class DiagnosticError extends Error {
  readonly status = 500;

  constructor(
    readonly stage: string,
    message: string,
    readonly originalError?: unknown,
  ) {
    super(message);
    this.name = "DiagnosticError";
  }
}

type ErrorRecord = Record<string, unknown>;

function asRecord(value: unknown): ErrorRecord | undefined {
  return value !== null && typeof value === "object"
    ? value as ErrorRecord
    : undefined;
}

export function redactSensitiveText(value: string): string {
  return value
    .replace(/\b(?:eyJ[A-Za-z0-9_-]+\.)[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, "[TOKEN_REDACTED]")
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[EMAIL_REDACTED]")
    .replace(/\b(SENHA_EMAIL|EMAIL_PASSWORD|SMTP_PASSWORD|SMTP_USER|JWT_SECRET|password|senha|secret|token|credential|authorization|api[_-]?key|username|user|pass|email)\b(\s*[:=]\s*)("[^"]*"|'[^']*'|[^\s,;]+)/gi, "$1$2[REDACTED]")
    .replace(/\bBearer\s+[A-Za-z0-9._~+/-]+=*/gi, "Bearer [REDACTED]")
    .replace(/([?&](?:token|access_token|refresh_token|password|secret|api[_-]?key)=)[^&#\s]*/gi, "$1[REDACTED]")
    .replace(/(smtps?:\/\/)[^\s/@]+@/gi, "$1[REDACTED]@");
}

function rootError(error: unknown): unknown {
  let current = error;
  for (let depth = 0; depth < 5; depth += 1) {
    const record = asRecord(current);
    const cause = record?.originalError ?? record?.cause;
    if (cause === undefined || cause === current) break;
    current = cause;
  }
  return current;
}

export function serializeSafeError(error: unknown) {
  const outer = asRecord(error);
  const root = rootError(error);
  const details = asRecord(root);

  const name = typeof details?.name === "string"
    ? details.name
    : root instanceof Error
      ? root.name
      : typeof root === "object" && root !== null
        ? "Object"
        : typeof root;
  const message = typeof details?.message === "string"
    ? details.message
    : root instanceof Error
      ? root.message
      : String(root);
  const stack = typeof details?.stack === "string"
    ? details.stack
    : root instanceof Error
      ? root.stack
      : undefined;
  const code = details?.code ?? outer?.code;
  const stage = outer?.stage;

  return {
    ...(typeof stage === "string" ? { stage: redactSensitiveText(stage) } : {}),
    error: {
      type: redactSensitiveText(name),
      message: redactSensitiveText(message),
      ...(typeof code === "string" || typeof code === "number"
        ? { code: redactSensitiveText(String(code)).slice(0, 64) }
        : {}),
      ...(stack ? { stack: redactSensitiveText(stack).slice(0, 8000) } : {}),
    },
  };
}
