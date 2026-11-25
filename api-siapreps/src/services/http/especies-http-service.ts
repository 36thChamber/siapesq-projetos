import { Response, NextFunction } from "express";
import httpStatus from "../../consts/http-status-enum";
import EspeciesServices from "../especies-services";
import { RequestAutenticado } from "../../types/express-types";
import { paginatedResponse } from "../../utils/response-utils";

export default class EspeciesHttpService {
  async create(req: RequestAutenticado, res: Response, next: NextFunction) {
    try {
      const especie = await EspeciesServices.create(req.body);
      return res.status(httpStatus.CREATED).json(especie);
    } catch (err) {
      next(err);
    }
  }

  async get(req: RequestAutenticado, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      const especie = await EspeciesServices.get(id);
      return res.status(httpStatus.OK).json(especie);
    } catch (err) {
      next(err);
    }
  }

  async list(req: RequestAutenticado, res: Response, next: NextFunction) {
    try {
      const { limit, offset } = req.pagination!;
      const result = await EspeciesServices.list({ limit, offset });
      return res.status(httpStatus.OK).json(
        paginatedResponse(result.especies, result.total, limit, offset)
      );
    } catch (err) {
      next(err);
    }
  }

  async update(req: RequestAutenticado, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      const especie = await EspeciesServices.update(id, req.body);
      return res.status(httpStatus.OK).json(especie);
    } catch (err) {
      next(err);
    }
  }

  async delete(req: RequestAutenticado, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      await EspeciesServices.delete(id);
      return res.status(httpStatus.NO_CONTENT).send();
    } catch (err) {
      next(err);
    }
  }

  async ativar(req: RequestAutenticado, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      const especie = await EspeciesServices.ativar(id);
      return res.status(httpStatus.OK).json(especie);
    } catch (err) {
      next(err);
    }
  }

  async desativar(req: RequestAutenticado, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      const especie = await EspeciesServices.desativar(id);
      return res.status(httpStatus.OK).json(especie);
    } catch (err) {
      next(err);
    }
  }
}