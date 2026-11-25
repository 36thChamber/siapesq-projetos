import { NextFunction, Response } from "express";

import http_status from "../consts/http-status-enum";
import IdempotenciaServices from "../services/idempotencia-services";
import { hashCanonicalPayload } from "../services/sync-identities-service";
import { RequestAutenticado } from "../types/express-types";

const ENTITY_BY_SCOPE: Record<string, string> = {
  "criar-missao": "missoes",
  "criar-lance": "lances",
  "criar-ocorrencia-lance": "ocorrencias-lance",
  "criar-incidente": "incidentes",
};

export default function checaIdempotencia(escopo: string) {
  return async function (
    req: RequestAutenticado,
    res: Response,
    next: NextFunction,
  ) {
    let transaction: Awaited<ReturnType<typeof IdempotenciaServices.iniciarTransacao>> | undefined;
    try {
      const chave = req.headers["idempotency-key"];
      if (!chave || typeof chave !== "string" || chave.length > 255) {
        throw {
          status: http_status.BAD_REQUEST,
          message: "Header Idempotency-Key deve conter de 1 a 255 caracteres",
        };
      }

      const id_usuario = req.auth?.id_usuario ?? req.id_usuario;
      if (!id_usuario) {
        throw {
          status: http_status.UNAUTHORIZED,
          message: "Usuário não autenticado",
        };
      }

      const hashCorpo = hashCanonicalPayload({
        method: req.method.toUpperCase(),
        path: `${req.baseUrl}${req.path}`,
        ifMatch: req.headers["if-match"] ?? null,
        body: req.body ?? {},
      });

      transaction = await IdempotenciaServices.iniciarTransacao();
      await IdempotenciaServices.bloquearChaveTransacao(
        transaction,
        `idempotency:${id_usuario}:${escopo}:${chave}`,
      );
      const resultado = await IdempotenciaServices.verificar({
        chave,
        escopo,
        id_usuario,
        hashCorpo,
      }, transaction);

      if (resultado.tipo === "replay") {
        await transaction.commit();
        res.setHeader("Idempotent-Replay", "true");
        return res.status(resultado.status).json(resultado.corpo);
      }

      if (resultado.tipo === "conflito") {
        await transaction.rollback();
        return res.status(http_status.CONFLICT).json({
          error: "Idempotency-Key já utilizada com payload diferente",
          code: "IDEMPOTENCY_KEY_CONFLICT",
        });
      }

      const clientRecordId = req.body?.client_record_id;
      const entityType = ENTITY_BY_SCOPE[escopo];
      if (entityType && typeof clientRecordId === "string") {
        await IdempotenciaServices.bloquearChaveTransacao(
          transaction,
          `sync-identity:${entityType}:${clientRecordId.toLowerCase()}`,
        );
      }

      req.transaction = transaction;
      const originalJson = res.json.bind(res);
      let finalizando = false;
      res.json = ((body: any) => {
        if (finalizando) return res;
        finalizando = true;
        const status = res.statusCode;
        void (async () => {
          if (status < 400) {
            await IdempotenciaServices.registrar({
              chave,
              escopo,
              id_usuario,
              hashCorpo,
              status,
              corpo: body,
            }, transaction!);
            await transaction!.commit();
          } else {
            await transaction!.rollback();
          }
          res.json = originalJson;
          originalJson(body);
        })().catch(async (err) => {
          if (transaction && !(transaction as any).finished) {
            try { await transaction.rollback(); } catch { /* transaction already aborted */ }
          }
          res.json = originalJson;
          next(err);
        });
        return res;
      }) as Response["json"];

      next();
    } catch (err: any) {
      if (transaction && !(transaction as any).finished) {
        try { await transaction.rollback(); } catch { /* transaction already aborted */ }
      }
      const statusCode = err.status || http_status.INTERNAL_ERROR;
      return res.status(statusCode).json({ error: err.message });
    }
  };
}
