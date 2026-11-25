import { Response } from "express";

import httpStatus from "../consts/http-status-enum";
import { RequestAutenticado } from "../types/express-types";

import EspeciesService from "../services/especies-services";
import SpeciesImagesService, {
  SpeciesImagesServiceError,
} from "../services/especies-imagens-service";
import AWS_S3_REPOSITORY from "../repositories/aws-s3-repository";

const speciesImagesRepository = new AWS_S3_REPOSITORY(process.env.AWS_BUCKET_REGION);
const speciesImagesService = new SpeciesImagesService(speciesImagesRepository);

export default class EspeciesController {
  async images(req: RequestAutenticado, res: Response) {
    try {
      const response = await speciesImagesService.listar(req.params.usageKey);
      return res.status(httpStatus.OK).json(response);
    } catch (error) {
      if (error instanceof SpeciesImagesServiceError) {
        const log = (req as any).log;
        log?.error?.({
          awsErrorName: error.awsErrorName,
          awsStatusCode: error.awsStatusCode,
          awsRequestId: error.awsRequestId,
        }, "Failed to load species images catalog");
      }
      throw error;
    }
  }

  async get(req: RequestAutenticado, res: Response) {
    try {
      const { id } = req.params;

      const especie = await EspeciesService.buscarPorId({
        id_especie: id,
      });

      return res.status(httpStatus.OK).json(especie);
    } catch (err: any) {
      return res
        .status(err.status ?? httpStatus.INTERNAL_ERROR)
        .json(err);
    }
  }

  async list(req: RequestAutenticado, res: Response) {
    try {
      const { limit, offset } = req.query;

      const lista = await EspeciesService.listar({
        limit: limit ? Number(limit) : 10000,
        offset: offset ? Number(offset) : 0,
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
      const especie = await EspeciesService.criar(req.body);

      return res.status(httpStatus.CREATED).json(especie);
    } catch (err: any) {
      return res
        .status(err.status ?? httpStatus.INTERNAL_ERROR)
        .json(err);
    }
  }
}
