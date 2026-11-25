import { Response, NextFunction } from 'express';
import http_status from '../../consts/http-status-enum';
import { RequestAutenticado } from "../../types/express-types";
import MissoesServices from '../missoes-services';
import LancesServices from '../lances-services';
import { paginatedResponse } from '../../utils/response-utils';
import { exigeVersaoEsperada, setEtagHeader } from '../../utils/versao-otimista';

export default class MissoesHttpService {
  async get(req: RequestAutenticado, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const missoes = await MissoesServices.get({ id: parseInt(id) });
      return res.status(http_status.OK).json(missoes);
    } catch (err) {
      next(err);
    }
  }

  async list(req: RequestAutenticado, res: Response, next: NextFunction) {
    try {
      const { limit, offset } = req.pagination!;
      const result = await MissoesServices.list({
        limit,
        offset,
        id_usuario: req.auth!.id_usuario,
      });
      return res.status(http_status.OK).json(
        paginatedResponse(result.missoes, result.total, limit, offset)
      );
    } catch (err) {
      next(err);
    }
  }

  async listByUsuario(req: RequestAutenticado, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { limit, offset } = req.pagination!;
      const result = await MissoesServices.listByUsuario(
        { id_usuario: parseInt(id) },
        { limit, offset }
      );
      return res.status(http_status.OK).json(
        paginatedResponse(result.missoes, result.total, limit, offset)
      );
    } catch (err) {
      next(err);
    }
  }

  async listByEmbarcacao(req: RequestAutenticado, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { limit, offset } = req.pagination!;
      const result = await MissoesServices.listByEmbarcacao(
        { id_embarcacao: parseInt(id) },
        { limit, offset }
      );
      return res.status(http_status.OK).json(
        paginatedResponse(result.missoes, result.total, limit, offset)
      );
    } catch (err) {
      next(err);
    }
  }

  async create(req: RequestAutenticado, res: Response, next: NextFunction) {
    try {

      // A missão sempre pertence ao usuário do token. O id_usuario do corpo é
      // aceito por compatibilidade, mas não pode apontar para outro usuário.
      const { id_usuario: idUsuarioCorpo, ...body } = req.body;
      if (
        idUsuarioCorpo !== undefined &&
        idUsuarioCorpo !== null &&
        Number(idUsuarioCorpo) !== req.auth!.id_usuario
      ) {
        return res.status(http_status.FORBIDDEN).json({
          error: 'Acesso negado: id_usuario diferente do usuário autenticado',
        });
      }

      const criacao = await MissoesServices.create({
        ...body,
        id_usuario: req.auth!.id_usuario,
      }, req.transaction);
      if (criacao.replayed) res.setHeader("Idempotent-Replay", "true");
      return res.status(criacao.replayed ? http_status.OK : http_status.CREATED).json(criacao.response);
    } catch (err) {
      next(err);
    }
  }

  async update(req: RequestAutenticado, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const versaoEsperada = exigeVersaoEsperada(req);
      const updateData = { ...req.body };
      delete updateData.id_usuario;
      delete updateData.id_embarcacao;
      delete updateData.status;
      delete updateData.versao;

      const atualizacao_missao = await MissoesServices.update(
        { id: parseInt(id), versaoEsperada },
        updateData
      );
      setEtagHeader(res, atualizacao_missao.versao);
      return res.status(http_status.OK).json(atualizacao_missao);
    } catch (err) {
      next(err);
    }
  }

  async delete(req: RequestAutenticado, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await MissoesServices.delete({ id: parseInt(id) });
      return res.status(http_status.NO_CONTENT).send();
    } catch (err) {
      next(err);
    }
  }

  async iniciar(req: RequestAutenticado, res: Response, next: NextFunction) {
    try {
      const usuarioId = req.id_usuario;
      if (!usuarioId) {
        return res.status(http_status.UNAUTHORIZED).json({ error: 'Usuário não autenticado' });
      }
      const versaoEsperada = exigeVersaoEsperada(req);
      const { id } = req.params;
      const missao = await MissoesServices.iniciar({ id: parseInt(id), usuarioId, versaoEsperada, iniciou_em_observado: req.body?.iniciou_em_observado }, req.transaction);
      setEtagHeader(res, missao.versao);
      return res.status(http_status.OK).json(missao);
    } catch (err) {
      next(err);
    }
  }

  async finalizar(req: RequestAutenticado, res: Response, next: NextFunction) {
    try {
      const usuarioId = req.id_usuario;
      if (!usuarioId) {
        return res.status(http_status.UNAUTHORIZED).json({ error: 'Usuário não autenticado' });
      }
      const versaoEsperada = exigeVersaoEsperada(req);
      const { id } = req.params;
      const missao = await MissoesServices.finalizar({ id: parseInt(id), usuarioId, versaoEsperada, terminou_em_observado: req.body?.terminou_em_observado }, req.transaction);
      setEtagHeader(res, missao.versao);
      return res.status(http_status.OK).json(missao);
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

  async criarLance(req: RequestAutenticado, res: Response, next: NextFunction) {
    try {
      const { missaoId } = req.params;
      const { id_missao, ...rest } = req.body;
      const body = {
        ...rest,
        id_missao: parseInt(missaoId),
      };
      const criacao = await LancesServices.create(body, req.transaction);
      if (criacao.replayed) res.setHeader("Idempotent-Replay", "true");
      return res.status(criacao.replayed ? http_status.OK : http_status.CREATED).json(criacao.response);
    } catch (err) {
      next(err);
    }
  }
}
