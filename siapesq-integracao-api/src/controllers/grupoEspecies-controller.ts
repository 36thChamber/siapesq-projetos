import { Response } from "express";

import httpStatus from "../consts/http-status-enum";
import { RequestAutenticado } from "../types/express-types";

import GruposEspeciesService from "../services/grupo-especies-services"

export default class GruposEspeciesController {
  async buscarPorId(req: RequestAutenticado, res: Response) {
    try {
      const { id_gruposespecies } = req.params;

      const grupoEspecie = await GruposEspeciesService.buscarPorId({
        id_gruposespecies,
      });

      return res.status(httpStatus.OK).json(grupoEspecie);
    } catch (err: any) {
      return res
        .status(err.status ?? httpStatus.INTERNAL_ERROR)
        .json(err);
    }
  }

  async listar(req: RequestAutenticado, res: Response) {
    try {
      const { limit, offset } = req.query;

      const gruposEspecies = await GruposEspeciesService.listar({
        limit: limit ? Number(limit) : 10000,
        offset: offset ? Number(offset) : 0,
      });

      return res.status(httpStatus.OK).json(gruposEspecies);
    } catch (err: any) {
      return res
        .status(err.status ?? httpStatus.INTERNAL_ERROR)
        .json(err);
    }
  }

  async criar(req: RequestAutenticado, res: Response) {
    try {
      const grupoEspecie = await GruposEspeciesService.criar(req.body);

      return res.status(httpStatus.CREATED).json(grupoEspecie);
    } catch (err: any) {
      return res
        .status(err.status ?? httpStatus.INTERNAL_ERROR)
        .json(err);
    }
  }

  async listarEspecies(req: RequestAutenticado, res: Response) {
    try {
      const { id_gruposespecies } = req.params;

      const especies = await GruposEspeciesService.listarEspecies({
        id_gruposespecies,
      });

      return res.status(httpStatus.OK).json(especies);
    } catch (err: any) {
      return res
        .status(err.status ?? httpStatus.INTERNAL_ERROR)
        .json(err);
    }
  }
}