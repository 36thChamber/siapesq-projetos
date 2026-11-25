import { Response, NextFunction } from "express";
import http_status from "../../consts/http-status-enum";
import { TipoOcorrenciaLance } from "../../models/OcorrenciasLance";
import OcorrenciasLanceServices from "../ocorrencias-lance-services";
import { RequestAutenticado } from "../../types/express-types";
import { exigeVersaoEsperada, setEtagHeader } from "../../utils/versao-otimista";

export default class OcorrenciasLanceHttpService {
  // Rota direta: GET /ocorrencias-lance/:id
  async getById(req: RequestAutenticado, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const ocorrencia = await OcorrenciasLanceServices.getById({ id: parseInt(id) });
      if (!ocorrencia) {
        return res.status(http_status.NOT_FOUND).json({ message: "Ocorrência de lance não encontrada" });
      }
      return res.status(http_status.OK).json(ocorrencia);
    } catch (err) {
      next(err);
    }
  }

  // Rota direta: PATCH /ocorrencias-lance/:id
  async update(req: RequestAutenticado, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const versaoEsperada = exigeVersaoEsperada(req);
      const body = { ...req.body };
      delete body.versao;
      const params = { id: parseInt(id), versaoEsperada };
      const ocorrencia = await OcorrenciasLanceServices.update(params, body);
      setEtagHeader(res, ocorrencia.versao);
      return res.status(http_status.OK).json(ocorrencia);
    } catch (err) {
      next(err);
    }
  }

  // Rota direta: DELETE /ocorrencias-lance/:id
  async delete(req: RequestAutenticado, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const params = { id: parseInt(id) };
      const ocorrencia = await OcorrenciasLanceServices.delete(params);
      return res.status(http_status.OK).json(ocorrencia);
    } catch (err) {
      next(err);
    }
  }

  // Rota aninhada: GET /lances/:lanceId/ocorrencias
  async listByLance(req: RequestAutenticado, res: Response, next: NextFunction) {
    try {
      const { lanceId } = req.params;
      const { limit, offset, tipo_ocorrencia, updated_after } = req.query;
      const query = {
        limit: limit ? parseInt(limit as string) : 10000,
        offset: offset ? parseInt(offset as string) : 0,
        tipo_ocorrencia: tipo_ocorrencia as TipoOcorrenciaLance | undefined,
        ...(typeof updated_after === "string" ? { updated_after } : {}),
      };
      const params = { id_lance: parseInt(lanceId) };
      const lista = await OcorrenciasLanceServices.list(params, query);
      return res.status(http_status.OK).json(lista);
    } catch (err) {
      next(err);
    }
  }

  // Rota aninhada: POST /lances/:lanceId/ocorrencias
  async createForLance(req: RequestAutenticado, res: Response, next: NextFunction) {
    try {
      const { lanceId } = req.params;
      const params = { id_lance: parseInt(lanceId) };
      const { id_lance, ...body } = req.body;
      const result = await OcorrenciasLanceServices.create(params, body, req.transaction);
      if (result.replayed) res.setHeader("Idempotent-Replay", "true");
      return res.status(result.replayed ? http_status.OK : http_status.CREATED).json(result.response);
    } catch (err) {
      next(err);
    }
  }
}
