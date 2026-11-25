import { Response, NextFunction } from 'express';
import http_status from '../../consts/http-status-enum';
import LancesServices from '../lances-services';
import { RequestAutenticado } from '../../types/express-types';
import { paginatedResponse } from '../../utils/response-utils';
import { exigeVersaoEsperada, setEtagHeader } from '../../utils/versao-otimista';
import {
  mesmoIdentificador,
  resolveDonoMissao,
} from '../../middlewares/checa-propriedade';

export default class LancesHttpService {
  async get(req: RequestAutenticado, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const lance = await LancesServices.get({ id: parseInt(id) });
      return res.status(http_status.OK).json(lance);
    } catch (err) {
      next(err);
    }
  }

  async list(req: RequestAutenticado, res: Response, next: NextFunction) {
    try {
      const { limit, offset } = req.pagination!;
      const result = await LancesServices.list({
        limit,
        offset,
        id_usuario: req.auth!.id_usuario,
      });
      return res.status(http_status.OK).json(
        paginatedResponse(result.lances, result.total, limit, offset)
      );
    } catch (err) {
      next(err);
    }
  }

  async listByMissao(req: RequestAutenticado, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { limit, offset } = req.pagination!;
      const result = await LancesServices.listByMissao(
        { id_missao: parseInt(id) },
        { limit, offset }
      );
      return res.status(http_status.OK).json(
        paginatedResponse(result.lances, result.total, limit, offset)
      );
    } catch (err) {
      next(err);
    }
  }

  async create(req: RequestAutenticado, res: Response, next: NextFunction) {
    try {
      const { id_missao } = req.body;

      if (!req.auth!.administracao) {
        const donoMissao = await resolveDonoMissao(Number(id_missao));
        if (
          !donoMissao ||
          !mesmoIdentificador(
            donoMissao.id_usuario_dono,
            req.auth!.id_usuario,
          )
        ) {
          return res.status(http_status.NOT_FOUND).json({ message: "missão não encontrada" });
        }
      }

      const criacao = await LancesServices.create(req.body, req.transaction);
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
      delete updateData.id_missao;
      delete updateData.lancado_em;
      delete updateData.status;
      delete updateData.recolhido_em;
      delete updateData.versao;

      const lance = await LancesServices.update({ id: parseInt(id), versaoEsperada }, updateData);
      setEtagHeader(res, lance.versao);
      return res.status(http_status.OK).json(lance);
    } catch (err) {
      next(err);
    }
  }

  async delete(req: RequestAutenticado, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await LancesServices.delete({ id: parseInt(id) });
      return res.status(http_status.NO_CONTENT).send();
    } catch (err) {
      next(err);
    }
  }

  async recolher(req: RequestAutenticado, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const versaoEsperada = exigeVersaoEsperada(req);
      const lance = await LancesServices.recolher({ id: parseInt(id), versaoEsperada, recolhido_em_observado: req.body?.recolhido_em_observado }, req.transaction);
      setEtagHeader(res, lance.versao);
      return res.status(http_status.OK).json(lance);
    } catch (err) {
      next(err);
    }
  }
}
