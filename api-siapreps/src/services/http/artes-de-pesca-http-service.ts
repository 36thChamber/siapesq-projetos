import { Response, NextFunction } from "express";
import http_status from "../../consts/http-status-enum";
import ArtesDePescaServices from "../artes-de-pesca-services";
import { RequestAutenticado } from "../../types/express-types";
import { paginatedResponse } from "../../utils/response-utils";

export default class ArtesDePescaHttpService {
  async get(req: RequestAutenticado, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const arteDePesca = await ArtesDePescaServices.get({ id: parseInt(id) });
      return res.status(http_status.OK).json(arteDePesca);
    } catch (err) {
      next(err);
    }
  }

  async list(req: RequestAutenticado, res: Response, next: NextFunction) {
    try {
      const { limit, offset } = req.pagination!;
      const result = await ArtesDePescaServices.list({ limit, offset });
      return res.status(http_status.OK).json(
        paginatedResponse(result.artesDePesca, result.total, limit, offset)
      );
    } catch (err) {
      next(err);
    }
  }

  async create(req: RequestAutenticado, res: Response, next: NextFunction) {
    try {
      const arteDePesca = await ArtesDePescaServices.create(req.body);
      return res.status(http_status.CREATED).json(arteDePesca);
    } catch (err) {
      next(err);
    }
  }

  async update(req: RequestAutenticado, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const params = { id: parseInt(id) };
      const arteDePesca = await ArtesDePescaServices.update(params, req.body);
      return res.status(http_status.OK).json(arteDePesca);
    } catch (err) {
      next(err);
    }
  }

  async delete(req: RequestAutenticado, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await ArtesDePescaServices.delete({ id: parseInt(id) });
      return res.status(http_status.NO_CONTENT).send();
    } catch (err) {
      next(err);
    }
  }
}