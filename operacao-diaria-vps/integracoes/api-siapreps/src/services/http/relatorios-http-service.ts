import { Response, NextFunction } from "express";
import httpStatus from "../../consts/http-status-enum";
import RelatoriosServices from "../relatorios-services";
import { RequestAutenticado } from "../../types/express-types";
import { RelatorioActor } from "../../types/relatorios-types";
import { paginatedResponse } from "../../utils/response-utils";

function atorDe(req: RequestAutenticado): RelatorioActor {
  return {
    id_usuario: req.auth!.id_usuario,
    administracao: req.auth!.administracao,
  };
}

function identidadeDivergente(valor: unknown, actor: RelatorioActor): boolean {
  // Apenas um inteiro positivo explícito e diferente do ator caracteriza
  // tentativa de reatribuição. Valores inválidos seguem para a validação
  // (400), preservando o contrato anterior para payloads malformados.
  if (
    typeof valor !== "number" ||
    !Number.isInteger(valor) ||
    valor <= 0
  ) {
    return false;
  }

  return valor !== Number(actor.id_usuario);
}

export default class RelatoriosHttpService {
  async get(req: RequestAutenticado, res: Response, next: NextFunction) {
    try {
      const relatorio = await RelatoriosServices.get({ id: Number(req.params.id) });
      return res.status(httpStatus.OK).json(relatorio);
    } catch (err) {
      next(err);
    }
  }

  async list(req: RequestAutenticado, res: Response, next: NextFunction) {
    try {
      const { limit, offset } = req.pagination!;
      const result = await RelatoriosServices.list({ limit, offset }, atorDe(req));
      return res.status(httpStatus.OK).json(
        paginatedResponse(result.relatorios, result.total, limit, offset)
      );
    } catch (err) {
      next(err);
    }
  }

  async listByUsuario(req: RequestAutenticado, res: Response, next: NextFunction) {
    try {
      const actor = atorDe(req);
      const idAlvo = Number(req.params.id);

      // Não-admin consulta somente o próprio id; terceiro recebe 404 sem dados.
      if (
        Number.isInteger(idAlvo) &&
        idAlvo > 0 &&
        !actor.administracao &&
        idAlvo !== actor.id_usuario
      ) {
        return res.status(httpStatus.NOT_FOUND).json({
          message: "recurso não encontrado",
        });
      }

      const { limit, offset } = req.pagination!;
      const result = await RelatoriosServices.listByUsuario(
        { id_usuario: idAlvo },
        { limit, offset },
        actor
      );
      return res.status(httpStatus.OK).json(
        paginatedResponse(result.relatorios, result.total, limit, offset)
      );
    } catch (err) {
      next(err);
    }
  }

  async listByEmbarcacao(req: RequestAutenticado, res: Response, next: NextFunction) {
    try {
      const { limit, offset } = req.pagination!;
      const result = await RelatoriosServices.listByEmbarcacao(
        { id_embarcacao: Number(req.params.id) },
        { limit, offset },
        atorDe(req)
      );
      return res.status(httpStatus.OK).json(
        paginatedResponse(result.relatorios, result.total, limit, offset)
      );
    } catch (err) {
      next(err);
    }
  }

  async listByMissao(req: RequestAutenticado, res: Response, next: NextFunction) {
    try {
      const { limit, offset } = req.pagination!;
      const result = await RelatoriosServices.listByMissao(
        { id_missao: Number(req.params.id) },
        { limit, offset },
        atorDe(req)
      );
      return res.status(httpStatus.OK).json(
        paginatedResponse(result.relatorios, result.total, limit, offset)
      );
    } catch (err) {
      next(err);
    }
  }

  async create(req: RequestAutenticado, res: Response, next: NextFunction) {
    try {
      const actor = atorDe(req);
      if (!actor.administracao && identidadeDivergente(req.body?.id_usuario, actor)) {
        return res.status(httpStatus.FORBIDDEN).json({
          message: "Acesso negado: id_usuario diferente do usuário autenticado",
        });
      }

      const relatorio = await RelatoriosServices.create(req.body, actor);
      return res.status(httpStatus.CREATED).json(relatorio);
    } catch (err) {
      next(err);
    }
  }

  async update(req: RequestAutenticado, res: Response, next: NextFunction) {
    try {
      const actor = atorDe(req);
      if (!actor.administracao && identidadeDivergente(req.body?.id_usuario, actor)) {
        return res.status(httpStatus.FORBIDDEN).json({
          message: "Acesso negado: id_usuario diferente do usuário autenticado",
        });
      }

      const relatorio = await RelatoriosServices.update(
        { id: Number(req.params.id) },
        req.body,
        actor
      );
      return res.status(httpStatus.OK).json(relatorio);
    } catch (err) {
      next(err);
    }
  }

  async delete(req: RequestAutenticado, res: Response, next: NextFunction) {
    try {
      await RelatoriosServices.delete({ id: Number(req.params.id) });
      return res.status(httpStatus.NO_CONTENT).send();
    } catch (err) {
      next(err);
    }
  }
}