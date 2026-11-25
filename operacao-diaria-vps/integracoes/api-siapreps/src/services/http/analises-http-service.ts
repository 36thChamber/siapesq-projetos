import { Response, NextFunction } from "express";
import { RequestAutenticado } from "../../types/express-types";
import http_status from "../../consts/http-status-enum";
import AnalisesService from "../analises-services";

export default class AnalisesHttpService {
  private analisesService = new AnalisesService();

  async list(req: RequestAutenticado, res: Response, next: NextFunction) {
    try {
      const paginationToken = req.query.pagination_token
        ? String(req.query.pagination_token)
        : undefined;
      const objetos = await this.analisesService.listarAnalises(paginationToken);
      return res.status(http_status.OK).json(objetos);
    } catch (err) {
      next(err);
    }
  }

  async get(req: RequestAutenticado, res: Response, next: NextFunction) {
    try {
      const objectName = String(req.query.object_name || "");

      const {
        readStream,
        contentRange,
        contentLength,
        acceptRanges,
        dataBucket,
        dataAnalise,
        objectName: resolvedObjectName,
      } = await this.analisesService.downloadAnalise(objectName, req.headers.range);

      res.status(contentRange ? 206 : http_status.OK);
      if (contentRange) res.setHeader("Content-Range", contentRange);
      if (acceptRanges) res.setHeader("Accept-Ranges", acceptRanges);
      if (contentLength !== undefined) res.setHeader("Content-Length", contentLength);
      res.contentType(
        resolvedObjectName.toLowerCase().endsWith(".nc")
          ? "application/x-netcdf"
          : "image/tiff",
      );
      res.setHeader("X-Analysis-Date", dataAnalise);
      res.setHeader("X-Bucket-Date", dataBucket);
      res.setHeader("X-Analysis-Object", encodeURIComponent(resolvedObjectName));

      const writableStream = new WritableStream({
        write(chunk) { res.write(chunk); },
        close() { res.end(); },
        abort(error) { res.status(http_status.INTERNAL_ERROR).json({ error: error.message }); },
      });
      await readStream.pipeTo(writableStream);
    } catch (err) {
      next(err);
    }
  }

  async listAnalises(req: RequestAutenticado, res: Response, next: NextFunction) {
    try {
      const nomes = await this.analisesService.listarNomesAnalises(req.query);
      return res.status(http_status.OK).json(nomes);
    } catch (err) {
      next(err);
    }
  }
}