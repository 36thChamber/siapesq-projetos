import { Response, NextFunction } from "express";
import httpStatus from "../../consts/http-status-enum";
import IscasServices from "../iscas-services";
import { RequestAutenticado } from "../../types/express-types";
import { paginatedResponse } from "../../utils/response-utils";

export default class IscasHttpService {
  async create(req: RequestAutenticado, res: Response, next: NextFunction) {
    try {
      const isca = await IscasServices.create(req.body);
      return res.status(httpStatus.CREATED).json(isca);
    } catch (err) {
      next(err);
    }
  }

  async get(req: RequestAutenticado, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      const isca = await IscasServices.get(id);
      return res.status(httpStatus.OK).json(isca);
    } catch (err) {
      next(err);
    }
  }

  async list(req: RequestAutenticado, res: Response, next: NextFunction) {
    try {
      const { limit, offset } = req.pagination!;
      const result = await IscasServices.list({ limit, offset });
      return res.status(httpStatus.OK).json(
        paginatedResponse(result.iscas, result.total, limit, offset)
      );
    } catch (err) {
      next(err);
    }
  }

  async update(req: RequestAutenticado, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      const isca = await IscasServices.update(id, req.body);
      return res.status(httpStatus.OK).json(isca);
    } catch (err) {
      next(err);
    }
  }

  async delete(req: RequestAutenticado, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      await IscasServices.delete(id);
      return res.status(httpStatus.NO_CONTENT).send();
    } catch (err) {
      next(err);
    }
  }

  async ativar(req: RequestAutenticado, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      const isca = await IscasServices.ativar(id);
      return res.status(httpStatus.OK).json(isca);
    } catch (err) {
      next(err);
    }
  }

  async desativar(req: RequestAutenticado, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      const isca = await IscasServices.desativar(id);
      return res.status(httpStatus.OK).json(isca);
    } catch (err) {
      next(err);
    }
  }
}