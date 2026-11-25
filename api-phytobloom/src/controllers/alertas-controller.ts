import { Response } from "express";
import http_status from "../consts/http-status-enum";
import AlertasService from "../services/alertas-services";
import { RequestAutenticado } from "../types/express-types";

export default class AlertasController {
  async get(req: RequestAutenticado, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const alerta = await AlertasService.get(id, Number(req.id_usuario));
      return res.status(http_status.OK).json(alerta);
    } catch (err: any) {
      return res.status(err.status || http_status.INTERNAL_ERROR).json(err);
    }
  }

  async list(req: RequestAutenticado, res: Response) {
    try {
      const { limit, offset, data_inicio, data_fim } = req.query;

      if (limit && typeof limit !== "string") {
        throw {
          status: http_status.BAD_REQUEST,
          message: "limit deve ser um número",
        };
      }
      if (offset && typeof offset !== "string") {
        throw {
          status: http_status.BAD_REQUEST,
          message: "offset deve ser um número",
        };
      }

      const lista = await AlertasService.list({
        limit: limit ? parseInt(limit) : 10000,
        offset: offset ? parseInt(offset) : 0,
        id_usuario: Number(req.id_usuario),
        data_inicio: data_inicio as string | undefined,
        data_fim: data_fim as string | undefined,
      });

      return res.status(http_status.OK).json(lista);
    } catch (err: any) {
      return res.status(err.status || http_status.INTERNAL_ERROR).json(err);
    }
  }

  async create(req: RequestAutenticado, res: Response) {
    try {
      const alerta = await AlertasService.create(req.body);
      return res.status(http_status.OK).json(alerta);
    } catch (err: any) {
      return res.status(err.status || http_status.INTERNAL_ERROR).json(err);
    }
  }

  async createBulk(req: RequestAutenticado, res: Response) {
    try {
      await AlertasService.createBulk(req.body);
      return res.status(http_status.OK).json("ok");
    } catch (err: any) {
      console.log(err);
      return res.status(err.status || http_status.INTERNAL_ERROR).json(err);
    }
  }

  async update(req: RequestAutenticado, res: Response) {
    try {
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        throw { status: http_status.BAD_REQUEST, message: "id inválido" };
      }

      await AlertasService.get(id, Number(req.id_usuario));
      const { status, visualizado } = req.body;
      const alerta = await AlertasService.update(id, { status, visualizado });

      return res.status(http_status.OK).json(alerta);
    } catch (err: any) {
      return res.status(err.status || http_status.INTERNAL_ERROR).json(err);
    }
  }

  async delete(req: RequestAutenticado, res: Response) {
    try {
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        throw { status: http_status.BAD_REQUEST, message: "id inválido" };
      }

      await AlertasService.get(id, Number(req.id_usuario));
      const alerta = await AlertasService.delete(id);

      return res.status(http_status.OK).json(alerta);
    } catch (err: any) {
      return res.status(err.status || http_status.INTERNAL_ERROR).json(err);
    }
  }
}
