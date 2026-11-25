import { Response, NextFunction } from "express";
import http_status from "../../consts/http-status-enum";
import PortosServices from "../portos-services";
import { RequestAutenticado } from "../../types/express-types";
import { paginatedResponse } from "../../utils/response-utils";

export default class PortosHttpService {
  async get(req: RequestAutenticado, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const porto = await PortosServices.get({ id: parseInt(id) });
      return res.status(http_status.OK).json(porto);
    } catch (err) {
      next(err);
    }
  }

  async list(req: RequestAutenticado, res: Response, next: NextFunction) {
    try {
      const { limit, offset } = req.pagination!;
      const result = await PortosServices.list({ limit, offset });
      return res.status(http_status.OK).json(
        paginatedResponse(result.portos, result.total, limit, offset)
      );
    } catch (err) {
      next(err);
    }
  }

  async create(req: RequestAutenticado, res: Response, next: NextFunction) {
    try {
      const porto = await PortosServices.create(req.body);
      return res.status(http_status.CREATED).json(porto);
    } catch (err) {
      next(err);
    }
  }

  async update(req: RequestAutenticado, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const params = { id: parseInt(id) };
      const porto = await PortosServices.update(params, req.body);
      return res.status(http_status.OK).json(porto);
    } catch (err) {
      next(err);
    }
  }

  async delete(req: RequestAutenticado, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const params = { id: parseInt(id) };
      await PortosServices.delete(params);
      return res.status(http_status.NO_CONTENT).send();
    } catch (err) {
      next(err);
    }
  }
}