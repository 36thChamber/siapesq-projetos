import { Response, NextFunction } from 'express';
import http_status from '../../consts/http-status-enum';
import { RequestAutenticado } from '../../types/express-types';
import IncidentesServices from '../incidentes-services';
import { GrupoIncidente } from '../../models/Incidentes';
import { paginatedResponse } from '../../utils/response-utils';
import { exigeVersaoEsperada, setEtagHeader } from '../../utils/versao-otimista';

export default class IncidentesHttpService {
  async criar(req: RequestAutenticado, res: Response, next: NextFunction) {
    try {
      const usuarioId = req.id_usuario;
      if (!usuarioId) {
        return res.status(http_status.UNAUTHORIZED).json({ error: 'Usuário não autenticado' });
      }
      const missaoId = parseInt(req.params.missaoId);
      const body = req.body;
      delete body.id_missao;
      const result = await IncidentesServices.criar({ missaoId, usuarioId, administracao: req.auth?.administracao }, body, req.transaction);
      if (result.replayed) res.setHeader("Idempotent-Replay", "true");
      return res.status(result.replayed ? http_status.OK : http_status.CREATED).json(result.response);
    } catch (err) {
      next(err);
    }
  }

  async listarPorMissao(req: RequestAutenticado, res: Response, next: NextFunction) {
    try {
      const usuarioId = req.id_usuario;
      if (!usuarioId) {
        return res.status(http_status.UNAUTHORIZED).json({ error: 'Usuário não autenticado' });
      }
      const missaoId = parseInt(req.params.missaoId);
      const { limit, offset } = req.pagination!;
      const { grupo } = req.query;

      const params: any = {
        usuarioId,
        missaoId,
        limit,
        offset,
      };
      if (grupo) params.grupo = grupo as GrupoIncidente;

      const result = await IncidentesServices.listarPorMissao(params);
      return res.status(http_status.OK).json(
        paginatedResponse(result.incidentes, result.total, limit, offset)
      );
    } catch (err) {
      next(err);
    }
  }

  async atualizar(req: RequestAutenticado, res: Response, next: NextFunction) {
    try {
      const usuarioId = req.id_usuario;
      if (!usuarioId) {
        return res.status(http_status.UNAUTHORIZED).json({ error: 'Usuário não autenticado' });
      }
      const versaoEsperada = exigeVersaoEsperada(req);
      const id = parseInt(req.params.id);
      const body = req.body;

      delete body.id_missao;
      delete body.id_lance;
      delete body.id_especie;
      delete body.versao;

      const incidente = await IncidentesServices.atualizar({ id, usuarioId, versaoEsperada }, body);
      setEtagHeader(res, incidente.versao);
      return res.status(http_status.OK).json(incidente);
    } catch (err) {
      next(err);
    }
  }

}
