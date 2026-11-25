import { NextFunction, Request, Response } from "express";

export function isIsolatedStaging(): boolean {
  return process.env.STAGING_ISOLATED === "true";
}

export function assertStagingDatabase(): void {
  if (!isIsolatedStaging()) return;
  const target = new URL(process.env.DATABASE_URL || "");
  if (target.protocol !== "postgresql:" || target.hostname !== "127.0.0.1" ||
      target.port !== "54519" || target.pathname !== "/siapesq_clone_staging" ||
      process.env.HOST !== "127.0.0.1" || process.env.DB_SSL !== "false") {
    throw new Error("Homologação exige banco e servidor locais exclusivos.");
  }
  if (process.env.STAGING_WORKFLOWS === "true" && process.env.STAGING_MAIL_MODE !== "file") {
    throw new Error("Staging workflows require local mail capture");
  }
}

/** Keep mail, billing, webhooks, administrative writes and S3 uploads unreachable. */
export function stagingRequests(req: Request, res: Response, next: NextFunction) {
  if (!isIsolatedStaging()) return next();
  const workflows = process.env.STAGING_WORKFLOWS === "true" && process.env.STAGING_MAIL_MODE === "file";
  if (workflows) {
    if (process.env.STAGING_CERTIFICATES === 'true' && /^\/usuarios\/[0-9a-f-]{36}\/comprovante(?:\/download)?$/.test(req.path) && ['GET','HEAD','PUT'].includes(req.method)) return next();
    if (process.env.STAGING_PAYMENT_MODE === "simulation" && req.method === "POST" &&
        (req.path === "/checkout" || /^\/homologacao\/pagamentos\/[0-9a-f-]{36}$/.test(req.path))) return next();
    const users = /^\/usuarios(?:\/(?:forgot-password|reset-password|send-verification-email|verify-email))?\/?$/.test(req.path);
    const administration = /^\/(?:especies|gruposEspecies|informacoes-especies|artigos)(?:\/[0-9a-f-]{36})?\/?$/.test(req.path);
    const adminRead = ["GET", "HEAD"].includes(req.method) && /^\/(?:admin|homologacao)(?:\/|$)/.test(req.path);
    const approval = req.method === "PUT" && req.path === "/admin/aprovar-usuario";
    const cancellation = req.method === "PATCH" && /^\/assinaturas\/[0-9a-f-]{36}\/cancelar$/.test(req.path);
    if ((users && ["GET", "POST", "PUT"].includes(req.method)) || (administration && ["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) || adminRead || approval || cancellation) return next();
  }
  const login = req.method === "POST" && req.path === "/usuarios/login";
  const read = ["GET", "HEAD"].includes(req.method) &&
    /^\/(health(?:\/|$)|docs(?:\/|$)|especies(?:\/|$)|gruposEspecies(?:\/|$)|analises(?:\/|$)|informacoes-especies(?:\/|$)|artigos(?:\/|$)|planos(?:\/|$)|assinaturas(?:\/|$)|usuarios\/(?:refresh-token|[0-9a-f-]{36})$)/i.test(req.path);
  if (login || read) return next();
  return res.status(403).json({ code: "STAGING_OPERATION_DISABLED", message: "Operação desabilitada na homologação isolada." });
}

export function assertS3WriteAllowed(): void {
  if (isIsolatedStaging()) throw new Error("S3 writes disabled in isolated staging");
}
