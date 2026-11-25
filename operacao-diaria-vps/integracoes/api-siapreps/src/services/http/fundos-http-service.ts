import { Response, NextFunction } from "express";
import httpStatus from "../../consts/http-status-enum";
import FundosServices from "../fundos-services";
import { RequestAutenticado } from "../../types/express-types";
import { paginatedResponse } from "../../utils/response-utils";

export default class FundosHttpService {
  async create(req: RequestAutenticado, res: Response, next: NextFunction) {
    try {
      const fundo = await FundosServices.create(req.body);
      return res.status(httpStatus.CREATED).json(fundo);
    } catch (err) {
      next(err);
    }
  }

  async get(req: RequestAutenticado, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      const fundo = await FundosServices.getById({ id });
      return res.status(httpStatus.OK).json(fundo);
    } catch (err) {
      next(err);
    }
  }

  async list(req: RequestAutenticado, res: Response, next: NextFunction) {
    try {
      const { limit, offset } = req.pagination!;
      const result = await FundosServices.list({ limit, offset });
      return res.status(httpStatus.OK).json(
        paginatedResponse(result.fundos, result.total, limit, offset)
      );
    } catch (err) {
      next(err);
    }
  }

  async update(req: RequestAutenticado, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      const fundo = await FundosServices.update(id, req.body);
      return res.status(httpStatus.OK).json(fundo);
    } catch (err) {
      next(err);
    }
  }

  async delete(req: RequestAutenticado, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      await FundosServices.delete(id);
      return res.status(httpStatus.NO_CONTENT).send();
    } catch (err) {
      next(err);
    }
  }

  async ativar(req: RequestAutenticado, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      await FundosServices.ativar(id);
      return res.status(httpStatus.OK).json({ message: "Fundo ativado com sucesso" });
    } catch (err) {
      next(err);
    }
  }

  async desativar(req: RequestAutenticado, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      await FundosServices.desativar(id);
      return res.status(httpStatus.OK).json({ message: "Fundo desativado com sucesso" });
    } catch (err) {
      next(err);
    }
  }
}