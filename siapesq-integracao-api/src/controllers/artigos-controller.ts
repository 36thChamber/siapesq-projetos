import { Response } from "express";

import httpStatus from "../consts/http-status-enum";
import { RequestAutenticado } from "../types/express-types";

import ArtigosService from "../services/artigos-services";

export default class ArtigosController {
  async create(req: RequestAutenticado, res: Response) {
    try {
      const artigo = await ArtigosService.create(req.body);

      return res.status(httpStatus.CREATED).json(artigo);
    } catch (err: any) {
      return res
        .status(err.status ?? httpStatus.INTERNAL_ERROR)
        .json(err);
    }
  }

  async update(req: RequestAutenticado, res: Response) {
    try {
      const { id_artigo: legacyId, ...body } = req.body || {};
      const id_artigo = req.params.id_artigo || legacyId;
      if (!Number.isSafeInteger(Number(id_artigo)) || Number(id_artigo) <= 0) return res.status(400).json({ message: "ID do artigo inválido." });

      const artigo = await ArtigosService.update(
        { id_artigo: Number(id_artigo) },
        body
      );

      return res.status(httpStatus.OK).json(artigo);
    } catch (err: any) {
      return res
        .status(err.status ?? httpStatus.INTERNAL_ERROR)
        .json(err);
    }
  }

  async list(req: RequestAutenticado, res: Response) {
    try {
      const { limit, offset } = req.query;

      const artigos = await ArtigosService.list({
        limit: limit ? Number(limit) : 10000,
        offset: offset ? Number(offset) : 0,
      });

      return res.status(httpStatus.OK).json(artigos);
    } catch (err: any) {
      return res
        .status(err.status ?? httpStatus.INTERNAL_ERROR)
        .json(err);
    }
  }

  async getId(req: RequestAutenticado, res: Response) {
    try {
      const { id_artigo } = req.params;

      const artigo = await ArtigosService.getId({
        id_artigo: Number(id_artigo),
      });

      return res.status(httpStatus.OK).json(artigo);
    } catch (err: any) {
      return res
        .status(err.status ?? httpStatus.INTERNAL_ERROR)
        .json(err);
    }
  }
}
