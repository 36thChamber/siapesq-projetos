import { Response, NextFunction } from "express";
import http_status from "../../consts/http-status-enum";
import CamposArteDePescaServices from "../campos-arte-de-pesca-services";
import { RequestAutenticado } from "../../types/express-types";
import { paginatedResponse } from "../../utils/response-utils";

export default class CamposArteDePescaHttpService {
  async get(req: RequestAutenticado, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const campo = await CamposArteDePescaServices.get({ id: parseInt(id) });
      return res.status(http_status.OK).json(campo);
    } catch (err) {
      next(err);
    }
  }

  async list(req: RequestAutenticado, res: Response, next: NextFunction) {
    try {
      const { limit, offset } = req.pagination!;
      const result = await CamposArteDePescaServices.list({ limit, offset });
      return res.status(http_status.OK).json(
        paginatedResponse(result.campos, result.total, limit, offset)
      );
    } catch (err) {
      next(err);
    }
  }

  async listByArtePescaId(req: RequestAutenticado, res: Response, next: NextFunction) {
    try {
      const { id_arte_pesca } = req.params;
      const idArtePesca = Number(id_arte_pesca);
      if (!id_arte_pesca || Number.isNaN(idArtePesca)) {
        throw { status: http_status.BAD_REQUEST, message: "Parâmetro inválido: id_arte_pesca deve ser um número" };
      }
      const campos = await CamposArteDePescaServices.listByArtePescaId({
        id_arte_pesca: idArtePesca,
      });
      return res.status(http_status.OK).json(campos);
    } catch (err) {
      next(err);
    }
  }

  async create(req: RequestAutenticado, res: Response, next: NextFunction) {
    try {
      const campo = await CamposArteDePescaServices.create(req.body);
      return res.status(http_status.CREATED).json(campo);
    } catch (err) {
      next(err);
    }
  }

  async update(req: RequestAutenticado, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const campo = await CamposArteDePescaServices.update({ id: parseInt(id) }, req.body);
      return res.status(http_status.OK).json(campo);
    } catch (err) {
      next(err);
    }
  }

  async delete(req: RequestAutenticado, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await CamposArteDePescaServices.delete({ id: parseInt(id) });
      return res.status(http_status.NO_CONTENT).send();
    } catch (err) {
      next(err);
    }
  }
}