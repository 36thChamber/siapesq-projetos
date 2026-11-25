import { Request, Response } from "express";
import http_status from "../consts/http-status-enum";
import { RequestAutenticado } from "../types/express-types";
import services from "../services/reservatorios-services";

function parseId(value: string) {
  const id = Number(value);
  if (Number.isNaN(id)) {
    throw { status: http_status.BAD_REQUEST, message: "id invalido" };
  }
  return id;
}

function parsePagination(query: Request["query"]) {
  const { limit, offset } = query;
  if (limit && typeof limit !== "string") {
    throw {
      status: http_status.BAD_REQUEST,
      message: "Parametros invalidos: limit e offset devem ser numeros",
    };
  }
  if (offset && typeof offset !== "string") {
    throw {
      status: http_status.BAD_REQUEST,
      message: "Parametros invalidos: limit e offset devem ser numeros",
    };
  }

  return {
    limit: limit ? Number(limit) : 10000,
    offset: offset ? Number(offset) : 0,
  };
}

export default class ReservatorioController {
  async get(req: RequestAutenticado, res: Response) {
    try {
      // req.id_usuario só existe em requisições autenticadas via JWT (checa_token).
      // Chamadas autenticadas via x-api-key (ex.: acolite_application) não têm um
      // usuário associado e devem enxergar qualquer reservatório existente, assim
      // como já ocorre em POST /alertas/bulk.
      const idUsuario = req.id_usuario !== undefined ? Number(req.id_usuario) : undefined;
      const reservatorio = await services.get(parseId(req.params.id), idUsuario);
      return res.status(http_status.OK).json(reservatorio);
    } catch (err: any) {
      const statusCode = err.status || http_status.INTERNAL_ERROR;
      return res.status(statusCode).json(err);
    }
  }

  async list(req: RequestAutenticado, res: Response) {
    try {
      const idUsuario = req.id_usuario !== undefined ? Number(req.id_usuario) : undefined;
      const lista = await services.list({ ...parsePagination(req.query), id_usuario: idUsuario });
      return res.status(http_status.OK).json(lista);
    } catch (err: any) {
      const statusCode = err.status || http_status.INTERNAL_ERROR;
      return res.status(statusCode).json(err);
    }
  }

  async listByUsuario(req: RequestAutenticado, res: Response) {
    try {
      const idUsuario = req.id_usuario ?? parseId(req.params.id);
      const query = {
        id_usuario: Number(idUsuario),
        ...parsePagination(req.query),
      };
      const lista = await services.listByUsuario(query);
      return res.status(http_status.OK).json(lista);
    } catch (err: any) {
      const statusCode = err.status || http_status.INTERNAL_ERROR;
      return res.status(statusCode).json(err);
    }
  }

  async create(req: RequestAutenticado, res: Response) {
    try {
      const reservatorio = await services.create({ ...req.body, id_usuario: Number(req.id_usuario) });
      return res.status(http_status.CREATED).json(reservatorio);
    } catch (err: any) {
      const statusCode = err.status || http_status.INTERNAL_ERROR;
      return res.status(statusCode).json(err);
    }
  }

  async update(req: RequestAutenticado, res: Response) {
    try {
      const id = parseId(req.params.id);
      await services.get(id, Number(req.id_usuario));
      const { id_usuario: _idUsuario, ...body } = req.body;
      const update = await services.update(body, id);
      return res.status(http_status.OK).json(update);
    } catch (err: any) {
      const statusCode = err.status || http_status.INTERNAL_ERROR;
      return res.status(statusCode).json(err);
    }
  }

  async updatePrioridade(req: RequestAutenticado, res: Response) {
    try {
      const id = parseId(req.params.id);
      await services.get(id, Number(req.id_usuario));
      const update = await services.updatePrioridade(req.body, id);
      return res.status(http_status.OK).json(update);
    } catch (err: any) {
      const statusCode = err.status || http_status.INTERNAL_ERROR;
      return res.status(statusCode).json(err);
    }
  }

  async updateFavorito(req: RequestAutenticado, res: Response) {
    try {
      const id = parseId(req.params.id);
      await services.get(id, Number(req.id_usuario));
      const update = await services.updateFavorito(req.body, id);
      return res.status(http_status.OK).json(update);
    } catch (err: any) {
      const statusCode = err.status || http_status.INTERNAL_ERROR;
      return res.status(statusCode).json(err);
    }
  }

  async delete(req: RequestAutenticado, res: Response) {
    try {
      const id = parseId(req.params.id);
      await services.get(id, Number(req.id_usuario));
      const reservatorio = await services.delete(id);
      return res.status(http_status.OK).json(reservatorio);
    } catch (err: any) {
      const statusCode = err.status || http_status.INTERNAL_ERROR;
      return res.status(statusCode).json(err);
    }
  }
}
