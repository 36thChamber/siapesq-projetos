import { NextFunction, Response } from "express";
import http_status from "../../consts/http-status-enum";
import { RequestAutenticado } from "../../types/express-types";
import ReconciliarIdentidadeUseCase from "../../use-cases/sync/reconciliar-identidade";

export default class SyncHttpService {
  async reconciliar(req: RequestAutenticado, res: Response, next: NextFunction) {
    try {
      const userId = req.auth?.id_usuario ?? req.id_usuario;
      if (!userId) return res.status(http_status.UNAUTHORIZED).json({ error: "Usuário não autenticado" });
      const resultado = await ReconciliarIdentidadeUseCase.executa({
        entity: req.params.entity,
        clientRecordId: req.params.client_record_id,
        userId,
        administracao: req.auth?.administracao ?? false,
      });
      return res.status(http_status.OK).json(resultado);
    } catch (err) {
      next(err);
    }
  }
}
