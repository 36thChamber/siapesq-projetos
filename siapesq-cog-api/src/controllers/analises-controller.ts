import { Response } from "express";

import httpStatus from "../consts/http-status-enum";
import { RequestAutenticado } from "../types/express-types";

import AnalisesService from "../services/analises-services";
import AdminService from "../services/admin-services";
import AWS_S3_REPOSITORY from "../repositories/aws-s3-repository";
export default class AnalisesController {
  async getTifAccess(req: RequestAutenticado, res: Response) {
    try {
      const result = await AnalisesService.obterAcessoTif({ id_analise: req.params.id_analise, id_usuario: req.id_usuario,
        tipo_usuario: (req as RequestAutenticado & { tipo_usuario?: string }).tipo_usuario }, new AWS_S3_REPOSITORY(process.env.AWS_BUCKET_REGION));
      return res.set("Cache-Control", "private, no-store").json(result);
    } catch (error: any) {
      return res.set("Cache-Control", "private, no-store").status(error.status || 500).json({ message: error.message || "Análise indisponível." });
    }
  }
  async dados_plataforma(_req: any, res: Response<any, Record<string, any>>) {
    try {
      const dados = await AdminService.buscarDadosPlataforma();
      return res.status(httpStatus.OK).json(dados);
    } catch (err: any) {
      console.error("Erro ao buscar dados da plataforma:", err);
      return res.status(err.status ?? httpStatus.INTERNAL_ERROR).json({
        error: err.message ?? "Erro ao buscar dados da plataforma",
      });
    }
  }
  async getTif(req: RequestAutenticado, res: Response) {
    try {
      const awsRepository = new AWS_S3_REPOSITORY(process.env.AWS_BUCKET_REGION);
      const resultado = await AnalisesService.obterTif(
        {
          id_analise: req.params.id_analise,
          id_usuario: req.id_usuario,
          tipo_usuario: (req as RequestAutenticado & { tipo_usuario?: string }).tipo_usuario,
        },
        awsRepository,
      );
      return res.set("Cache-Control", "private, no-store").status(httpStatus.OK).json(resultado);
    } catch (err: any) {
      return res.status(err.status ?? httpStatus.INTERNAL_ERROR).json({
        ...(err.code ? { code: err.code } : {}),
        message: err.message ?? "Erro interno do servidor.",
      });
    }
  }
  async getCsvOcorrencias(req: RequestAutenticado, res: Response) {
    try {
      const awsRepository = new AWS_S3_REPOSITORY(process.env.AWS_BUCKET_REGION);
      const resultado = await AnalisesService.obterCsvOcorrencias(
        {
          id_especie: req.params.id_especie,
          id_usuario: req.id_usuario,
          tipo_usuario: (req as RequestAutenticado & { tipo_usuario?: string }).tipo_usuario,
        },
        awsRepository,
      );
      return res.set("Cache-Control", "private, no-store").status(httpStatus.OK).json(resultado);
    } catch (err: any) {
      return res.status(err.status ?? httpStatus.INTERNAL_ERROR).json({
        ...(err.code ? { code: err.code } : {}),
        message: err.message ?? "Erro interno do servidor.",
      });
    }
  }
  async get(req: RequestAutenticado, res: Response) {
    try {
      const { id_analise } = req.params;

      const analise = await AnalisesService.buscarPorId({
        id_analise,
      });

      return res.status(httpStatus.OK).json(analise);
    } catch (err: any) {
      return res
        .status(err.status ?? httpStatus.INTERNAL_ERROR)
        .json(err);
    }
  }

  async getIdEspecie(req: RequestAutenticado, res: Response) {
    try {
      const { id_especie } = req.params;

      const analises = await AnalisesService.buscarPorEspecie(
        id_especie
      );

      return res.status(httpStatus.OK).json(analises);
    } catch (err: any) {
      return res
        .status(err.status ?? httpStatus.INTERNAL_ERROR)
        .json(err);
    }
  }

  async list(req: RequestAutenticado, res: Response) {
    try {
      const { limit, offset } = req.query;

      const analises = await AnalisesService.listar({
        limit: limit ? Number(limit) : 10000,
        offset: offset ? Number(offset) : 0,
      });

      return res.status(httpStatus.OK).json(analises);
    } catch (err: any) {
      return res
        .status(err.status ?? httpStatus.INTERNAL_ERROR)
        .json(err);
    }
  }

  async create(req: RequestAutenticado, res: Response) {
    try {
      const analise = await AnalisesService.criar(
        req.body,
        (req as RequestAutenticado & { tipo_usuario?: string }).tipo_usuario,
      );

      return res.status(httpStatus.CREATED).json(analise);
    } catch (err: any) {
      return res
        .status(err.status ?? httpStatus.INTERNAL_ERROR)
        .json(err);
    }
  }

  async update(req: RequestAutenticado, res: Response) {
    try {
      const { id_analise } = req.params;

      const analise = await AnalisesService.atualizar(
        { id_analise },
        req.body,
        (req as RequestAutenticado & { tipo_usuario?: string }).tipo_usuario,
      );

      return res.status(httpStatus.OK).json(analise);
    } catch (err: any) {
      return res
        .status(err.status ?? httpStatus.INTERNAL_ERROR)
        .json(err);
    }
  }
}
