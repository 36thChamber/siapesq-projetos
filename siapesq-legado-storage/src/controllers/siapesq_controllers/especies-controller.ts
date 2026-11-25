import { Response } from "express";
import { RequestAutenticado } from "../../types/express-types";
import http_status from "../../consts/http-status-enum";
import CriarEspecieUseCase from "../../use-cases/siapesq_use-cases/Especies/post-Especies";
import GetEspecieUseCase from "../../use-cases/siapesq_use-cases/Especies/get-Especies";
import ListaEspeciesUseCase from "../../use-cases/siapesq_use-cases/Especies/listar-Especies";
import especies from "../../models/siapesq/Especies";
import { Op } from "sequelize";
export default class EspeciesController {
  async get(req: RequestAutenticado, res: Response) {
    try {
      const { id } = req.params;
      await GetEspecieUseCase.valida({ id });
      const especie = await GetEspecieUseCase.executa({ id });
      return res.status(http_status.OK).json(especie);
    } catch (err: any) {
      const statusCode = err.status || http_status.INTERNAL_ERROR;
      return res.status(statusCode).json(err);
    }
  }
  async list(req: RequestAutenticado, res: Response) {
    try {
      const { limit, offset } = req.query as {
        limit?: string;
        offset?: string;
      };

      const limitNum = limit ? parseInt(limit) : 10000;
      const offsetNum = offset ? parseInt(offset) : 0;

      if (isNaN(limitNum) || isNaN(offsetNum)) {
        throw {
          status: http_status.BAD_REQUEST,
          message: "Parâmetros inválidos: limit e offset devem ser números",
        };
      }

      const query = { limit: limitNum, offset: offsetNum };

      await ListaEspeciesUseCase.valida(query);
      const lista = await ListaEspeciesUseCase.executa(query);
      return res.status(http_status.OK).json(lista);
    } catch (err: any) {
      const statusCode = err.status || http_status.INTERNAL_ERROR;
      return res.status(statusCode).json(err);
    }
  }
  async create(req: RequestAutenticado, res: Response) {
    try {
      await CriarEspecieUseCase.valida(req.body);
      const especie = await CriarEspecieUseCase.executa(req.body);
      return res.status(http_status.OK).json(especie);
    } catch (err: any) {
      const statusCode = err.status || http_status.INTERNAL_ERROR;
      return res.status(statusCode).json(err);
    }
  }
}
