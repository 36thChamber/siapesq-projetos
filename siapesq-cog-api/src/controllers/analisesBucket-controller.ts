import { Response } from "express";

import httpStatus from "../consts/http-status-enum";
import { RequestAutenticado } from "../types/express-types";

import AWS_S3_REPOSITORY from "../repositories/aws-s3-repository";
import AnalisesBucketService from "../services/analises-bucket-services";

export default class AnalisesBucketController {
  async list(req: RequestAutenticado, res: Response) {
    try {
      const awsRepository = new AWS_S3_REPOSITORY(
        process.env.AWS_BUCKET_REGION
      );

      const bucket_name = process.env.AWS_TIFF_STE ?? "";

      const aws_pagination_token = req.query.pagination_token
        ? String(req.query.pagination_token)
        : undefined;

      const objetos = await AnalisesBucketService.listar(
        {
          bucket_name,
          aws_pagination_token,
        },
        awsRepository
      );

      return res.status(httpStatus.OK).json(objetos);
    } catch (err: any) {
      return res
        .status(err.status ?? httpStatus.INTERNAL_ERROR)
        .json(err);
    }
  }

  async get(req: RequestAutenticado, res: Response) {
    try {
      const awsRepository = new AWS_S3_REPOSITORY(
        process.env.AWS_BUCKET_REGION
      );

      const bucket_name = process.env.AWS_TIFF_STE ?? "";
      const object_name = String(req.query.object_name ?? "");

      const readstream = await AnalisesBucketService.download(
        {
          bucket_name,
          object_name,
        },
        awsRepository
      );

      res.status(httpStatus.OK);
      res.contentType("image/tif");

      const writableStream = new WritableStream({
        write(chunk) {
          res.write(chunk);
        },
        close() {
          res.end();
        },
      });

      await readstream?.pipeTo(writableStream);
    } catch (err: any) {
      return res
        .status(err.status ?? httpStatus.INTERNAL_ERROR)
        .json(err);
    }
  }

  async getCsv(req: RequestAutenticado, res: Response) {
    try {
      const awsRepository = new AWS_S3_REPOSITORY(
        process.env.AWS_BUCKET_REGION
      );

      const bucket_name = process.env.AWS_TIFF_STE ?? "";
      const object_name = String(req.query.object_name ?? "");

      const readstream = await AnalisesBucketService.downloadCsv(
        {
          bucket_name,
          object_name,
        },
        awsRepository
      );

      res.status(httpStatus.OK);
      res.contentType("text/csv");

      const writableStream = new WritableStream({
        write(chunk) {
          res.write(chunk);
        },
        close() {
          res.end();
        },
      });

      await readstream?.pipeTo(writableStream);
    } catch (err: any) {
      return res
        .status(err.status ?? httpStatus.INTERNAL_ERROR)
        .json(err);
    }
  }
}