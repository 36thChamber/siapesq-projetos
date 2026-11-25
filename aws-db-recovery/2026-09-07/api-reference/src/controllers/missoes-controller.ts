import { Response } from "express";
import { RequestAutenticado } from "../types/express-types";
import http_status from "../consts/http-status-enum";
import CriarMissaoUseCase from "../use-cases/missoes/criar-missao";
import GetMissaoUseCase from "../use-cases/missoes/get-missao";
import ListaMissaosUseCase from "../use-cases/missoes/listar-missoes";
import GetDetalhesMissao from "../use-cases/missoes/get-detalhes-missao";
export default class MissaosController {
  async get(req: RequestAutenticado, res: Response) {
    try {
      const { id } = req.params;
      await GetMissaoUseCase.valida({ id: parseInt(id) });
      const Missao = await GetMissaoUseCase.executa({ id: parseInt(id) });
      return res.status(http_status.OK).json(Missao);
    } catch (err: any) {
      const statusCode = err.status || http_status.INTERNAL_ERROR;
      return res.status(statusCode).json(err);
    }
  }
  async getDetalhesMissao(req: RequestAutenticado, res: Response) {
    try {
      const { id } = req.params;
      await GetDetalhesMissao.valida({ id: parseInt(id) });
      const Missao = await GetDetalhesMissao.executa({ id: parseInt(id) });
      return res.status(http_status.OK).json(Missao);
    } catch (err: any) {
      const statusCode = err.status || http_status.INTERNAL_ERROR;
      return res.status(statusCode).json(err);
    }
  }
  async list(req: RequestAutenticado, res: Response) {
    try {
      let { limit, offset } = req.query;
      if (limit && typeof limit !== "string") {
        throw {
          status: http_status.BAD_REQUEST,
          message: "Parâmetros inválidos: limit e offset devem ser números",
        };
      }
      if (offset && typeof offset !== "string") {
        throw {
          status: http_status.BAD_REQUEST,
          message: "Parâmetros inválidos: limit e offset devem ser números",
        };
      }
      const query = {
        limit: limit ? parseInt(limit) : 10000,
        offset: offset ? parseInt(offset) : 0,
      };
      await ListaMissaosUseCase.valida(query);
      const lista = await ListaMissaosUseCase.executa(query);
      return res.status(http_status.OK).json(lista);
    } catch (err: any) {
      const statusCode = err.status || http_status.INTERNAL_ERROR;
      return res.status(statusCode).json(err);
    }
  }
  async create(req: RequestAutenticado, res: Response) {
    try {
      await CriarMissaoUseCase.valida(req.body);
      const Missao = await CriarMissaoUseCase.executa(req.body);
      return res.status(http_status.OK).json(Missao);
    } catch (err: any) {
      const statusCode = err.status || http_status.INTERNAL_ERROR;
      return res.status(statusCode).json(err);
    }
  }
}
