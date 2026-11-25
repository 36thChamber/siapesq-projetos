import { Response } from "express";
import { RequestAutenticado } from "../../types/express-types";
import http_status from "../../consts/http-status-enum";
import CriarPeixeRFIDUseCase from "../../use-cases/peixeRFID/criar-peixeRFID";
import GetPeixeRFIDUseCase from "../../use-cases/peixeRFID/get-peixeRFID";
import ListaPeixeRFIDUseCase from "../../use-cases/peixeRFID/listar-peixeRFID";
import DeletarPeixeRFIDUseCase from "../../use-cases/peixeRFID/deletar-peixeRFID";

export default class PeixeRFIDController {
  async get(req: RequestAutenticado, res: Response) {
    try {
      const { id } = req.params;
      await GetPeixeRFIDUseCase.valida({ id: parseInt(id) });
      const peixeRFID = await GetPeixeRFIDUseCase.executa({ id: parseInt(id) });
      return res.status(http_status.OK).json(peixeRFID);
    } catch (err: any) {
      const statusCode = err.status || http_status.INTERNAL_ERROR;
      return res.status(statusCode).json(err);
    }
  }
  async getId(req: RequestAutenticado, res: Response) {
    try {
      const { id } = req.params;
      await GetPeixeRFIDUseCase.valida({ id: parseInt(id) });
      const peixeRFID = await GetPeixeRFIDUseCase.executa({ id: parseInt(id) });
      return res.status(http_status.OK).json(peixeRFID);
    } catch (err: any) {
      const statusCode = err.status || http_status.INTERNAL_ERROR;
      return res.status(statusCode).json(err);
    }
  }

  async list(req: RequestAutenticado, res: Response) {
    try {
      let { limit, offset } = req.query;
      if (limit && typeof limit !== "string") {
        throw {};
      }
      if (offset && typeof offset !== "string") {
        throw {};
      }
      const query = {
        limit: limit ? parseInt(limit) : 10000,
        offset: offset ? parseInt(offset) : 0,
      };
      await ListaPeixeRFIDUseCase.valida(query);
      const lista = await ListaPeixeRFIDUseCase.executa(query);
      return res.status(http_status.OK).json(lista);
    } catch (err: any) {
      const statusCode = err.status || http_status.INTERNAL_ERROR;
      return res.status(statusCode).json(err);
    }
  }

  async create(req: RequestAutenticado, res: Response) {
    try {
      await CriarPeixeRFIDUseCase.valida(req.body);
      const peixeRFID = await CriarPeixeRFIDUseCase.executa(req.body);
      return res.status(http_status.OK).json(peixeRFID);
    } catch (err: any) {
      const statusCode = err.status || http_status.INTERNAL_ERROR;
      return res.status(statusCode).json(err);
    }
  }

  async delete(req: RequestAutenticado, res: Response) {
    try {
      const { id } = req.params;
      await DeletarPeixeRFIDUseCase.valida({ id: parseInt(id) });
      await DeletarPeixeRFIDUseCase.executa({ id: parseInt(id) });
      return res
        .status(http_status.OK)
        .json({ message: "PeixeRFID deletado com sucesso." });
    } catch (err: any) {
      const statusCode = err.status || http_status.INTERNAL_ERROR;
      return res.status(statusCode).json(err);
    }
  }
}
