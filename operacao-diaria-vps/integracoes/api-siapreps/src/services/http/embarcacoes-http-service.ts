import { Response, NextFunction } from "express";
import http_status from "../../consts/http-status-enum";
import EmbarcacaoServices from "../embarcacao-services";
import { RequestAutenticado } from "../../types/express-types";
import MissoesServices from '../missoes-services';
import { paginatedResponse } from "../../utils/response-utils";

export default class EmbarcacoesHttpService {
  async get(req: RequestAutenticado, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const embarcacao = await EmbarcacaoServices.get({ id: parseInt(id) });
      return res.status(http_status.OK).json(embarcacao);
    } catch (err) {
      next(err);
    }
  }

  async list(req: RequestAutenticado, res: Response, next: NextFunction) {
    try {
      const { limit, offset } = req.pagination!;
      const result = await EmbarcacaoServices.list({ limit, offset });
      return res.status(http_status.OK).json(
        paginatedResponse(result.embarcacoes, result.total, limit, offset)
      );
    } catch (err) {
      next(err);
    }
  }

  async listByMestre(req: RequestAutenticado, res: Response, next: NextFunction) {
    try {
      if (!req.id_usuario) {
        return res.status(http_status.UNAUTHORIZED).json({ message: "Usuário não autenticado" });
      }
      const { limit, offset } = req.pagination!;
      const result = await EmbarcacaoServices.listByMestre(
        { id_mestre: req.id_usuario },
        { limit, offset }
      );
      return res.status(http_status.OK).json(
        paginatedResponse(result.embarcacoes, result.total, limit, offset)
      );
    } catch (err) {
      next(err);
    }
  }

  async create(req: RequestAutenticado, res: Response, next: NextFunction) {
    try {
      
      const { id_mestre, ...body } = req.body;
      const embarcacao = await EmbarcacaoServices.create({
        ...body,
        id_mestre: req.auth!.id_usuario,
      });

      return res.status(http_status.CREATED).json(embarcacao);
    } catch (err) {
      next(err);
    }
  }

  async update(req: RequestAutenticado, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const body = { ...req.body };
    
      if (!req.auth!.administracao) {
        delete body.id_mestre;
      }
      const embarcacao = await EmbarcacaoServices.update(
        { id: parseInt(id) },
        body,
      );
      return res.status(http_status.OK).json(embarcacao);
    } catch (err) {
      next(err);
    }
  }

  async delete(req: RequestAutenticado, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await EmbarcacaoServices.delete({ id: parseInt(id) });
      return res.status(http_status.NO_CONTENT).send();
    } catch (err) {
      next(err);
    }
  }

  async criarMissao(req: RequestAutenticado, res: Response, next: NextFunction) {
    try {
      const { embarcacaoId } = req.params;
      const usuarioId = req.id_usuario;
      if (!usuarioId) {
        return res.status(http_status.UNAUTHORIZED).json({ error: 'Usuário não autenticado' });
      }
      const { id_embarcacao, id_usuario, ...rest } = req.body;
      const body = {
        ...rest,
        id_embarcacao: parseInt(embarcacaoId),
        id_usuario: usuarioId,
      };
      const criacao = await MissoesServices.create(body, req.transaction);
      if (criacao.replayed) res.setHeader("Idempotent-Replay", "true");
      return res.status(criacao.replayed ? http_status.OK : http_status.CREATED).json(criacao.response);
    } catch (err) {
      next(err);
    }
  }
}
