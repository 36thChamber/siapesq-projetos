import { Response } from "express";

import httpStatus from "../consts/http-status-enum";
import { RequestAutenticado } from "../types/express-types";

import PlanosService from "../services/planos-services";

export default class PlanosController {

  async get(req: RequestAutenticado, res: Response) {
    try {
      const plano = await PlanosService.buscarPorId({
        id_plano: req.params.id,
      });

      return res.status(httpStatus.OK).json(plano);
    } catch (err: any) {
      return res
        .status(err.status ?? httpStatus.INTERNAL_ERROR)
        .json(err);
    }
  }

  async list(req: RequestAutenticado, res: Response) {
    try {
      const lista = await PlanosService.listar({
        limit: req.query.limit ? Number(req.query.limit) : 10000,
        offset: req.query.offset ? Number(req.query.offset) : 0,
      });

      return res.status(httpStatus.OK).json(lista);
    } catch (err: any) {
      return res
        .status(err.status ?? httpStatus.INTERNAL_ERROR)
        .json(err);
    }
  }

  async listAtivos(req: RequestAutenticado, res: Response) {
    try {
      const lista = await PlanosService.listarAtivos({
        limit: req.query.limit ? Number(req.query.limit) : 10000,
        offset: req.query.offset ? Number(req.query.offset) : 0,
      });

      return res.status(httpStatus.OK).json(lista);
    } catch (err: any) {
      return res
        .status(err.status ?? httpStatus.INTERNAL_ERROR)
        .json(err);
    }
  }

  async listInativos(req: RequestAutenticado, res: Response) {
    try {
      const lista = await PlanosService.listarInativos({
        limit: req.query.limit ? Number(req.query.limit) : 10000,
        offset: req.query.offset ? Number(req.query.offset) : 0,
      });

      return res.status(httpStatus.OK).json(lista);
    } catch (err: any) {
      return res
        .status(err.status ?? httpStatus.INTERNAL_ERROR)
        .json(err);
    }
  }

  async create(req: RequestAutenticado, res: Response) {
    try {
      const plano = await PlanosService.criar(req.body);

      return res.status(httpStatus.CREATED).json(plano);
    } catch (err: any) {
      return res
        .status(err.status ?? httpStatus.INTERNAL_ERROR)
        .json(err);
    }
  }

  async update(req: RequestAutenticado, res: Response) {
    try {
      const plano = await PlanosService.atualizar(
        { id_plano: req.params.id },
        req.body
      );

      return res.status(httpStatus.OK).json(plano);
    } catch (err: any) {
      return res
        .status(err.status ?? httpStatus.INTERNAL_ERROR)
        .json(err);
    }
  }

  async delete(req: RequestAutenticado, res: Response) {
    try {
      const result = await PlanosService.deletar({
        id_plano: req.params.id,
      });

      return res.status(httpStatus.OK).json(result);
    } catch (err: any) {
      return res
        .status(err.status ?? httpStatus.INTERNAL_ERROR)
        .json(err);
    }
  }

  async ativar(req: RequestAutenticado, res: Response) {
    try {
      const plano = await PlanosService.ativar({
        id_plano: req.params.id,
      });

      return res.status(httpStatus.OK).json(plano);
    } catch (err: any) {
      return res
        .status(err.status ?? httpStatus.INTERNAL_ERROR)
        .json(err);
    }
  }

  async desativar(req: RequestAutenticado, res: Response) {
    try {
      const plano = await PlanosService.desativar({
        id_plano: req.params.id,
      });

      return res.status(httpStatus.OK).json(plano);
    } catch (err: any) {
      return res
        .status(err.status ?? httpStatus.INTERNAL_ERROR)
        .json(err);
    }
  }

  async restaurar(req: RequestAutenticado, res: Response) {
    try {
      const plano = await PlanosService.restaurar({
        id_plano: req.params.id,
      });

      return res.status(httpStatus.OK).json(plano);
    } catch (err: any) {
      return res
        .status(err.status ?? httpStatus.INTERNAL_ERROR)
        .json(err);
    }
  }
}