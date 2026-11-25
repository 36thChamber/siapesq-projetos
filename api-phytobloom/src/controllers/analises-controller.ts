import { Readable } from "stream";
import { Response } from "express";
import http_status from "../consts/http-status-enum";
import AnalisesService from "../services/analises-services";
import { RequestAutenticado } from "../types/express-types";

function getQueryString(value: unknown, field: string): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string") {
    throw { status: http_status.BAD_REQUEST, message: `${field} invalido` };
  }
  return value;
}

function filenameFromKey(key: string) {
  return key.split("/").filter(Boolean).pop() || "analise";
}

export default class AnalisesController {
  async list(req: RequestAutenticado, res: Response) {
    try {
      const token = getQueryString(req.query.token, "token");
      return res.status(http_status.OK).json(await AnalisesService.list(token));
    } catch (err: any) {
      return res.status(err.status || http_status.INTERNAL_ERROR).json(err);
    }
  }

  async listAnalises(req: RequestAutenticado, res: Response) {
    try {
      const token = getQueryString(req.query.token, "token");
      return res.status(http_status.OK).json(await AnalisesService.listNomes(token));
    } catch (err: any) {
      return res.status(err.status || http_status.INTERNAL_ERROR).json(err);
    }
  }

  async get(req: RequestAutenticado, res: Response) {
    try {
      const nome = getQueryString(req.query.nome ?? req.query.key, "nome");
      if (!nome) {
        throw { status: http_status.BAD_REQUEST, message: "nome da analise e obrigatorio" };
      }

      const object = await AnalisesService.download(nome, req.headers.range);
      if (!object.Body) {
        throw { status: http_status.NOT_FOUND, message: "analise sem conteudo" };
      }

      res.status(object.ContentRange ? 206 : http_status.OK);
      if (object.ContentRange) res.setHeader("Content-Range", object.ContentRange);
      if (object.AcceptRanges) res.setHeader("Accept-Ranges", object.AcceptRanges);
      res.setHeader("Content-Type", object.ContentType || "application/octet-stream");
      if (object.ContentLength !== undefined) res.setHeader("Content-Length", object.ContentLength);
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filenameFromKey(nome).replace(/[\r\n"\\\\]/g, "_")}"`,
      );

      if (object.Body instanceof Readable) {
        object.Body.pipe(res);
      } else {
        Readable.fromWeb(object.Body as never).pipe(res);
      }
    } catch (err: any) {
      return res.status(err.status || http_status.INTERNAL_ERROR).json(err);
    }
  }
}
