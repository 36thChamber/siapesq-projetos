import { Response } from "express";
import { RequestAutenticado } from "../types/express-types";
import http_status from "../consts/http-status-enum";
import AssinaturasService from "../services/assinaturas-services";
import { atorDaRequisicao } from "../utils/autorizacao-recurso";

export default class AssinaturasController {
  async get(req: RequestAutenticado, res: Response) {
    try {
      const { id } = req.params;
      const assinatura = await AssinaturasService.get(id, atorDaRequisicao(req));
      return res.status(http_status.OK).json(assinatura);
    } catch (err: any) {
      return res.status(err.status || http_status.INTERNAL_ERROR).json(err);
    }
  }

  async getByUsuario(req: RequestAutenticado, res: Response) {
    try {
      const { id_usuario } = req.params;
      const assinatura = await AssinaturasService.getByUsuario(
        id_usuario,
        atorDaRequisicao(req)
      );
      return res.status(http_status.OK).json(assinatura);
    } catch (err: any) {
      return res.status(err.status || http_status.INTERNAL_ERROR).json(err);
    }
  }

  async list(req: RequestAutenticado, res: Response) {
    try {
      const limit = parseInt(req.query.limit as string) || 10000;
      const offset = parseInt(req.query.offset as string) || 0;

      const lista = await AssinaturasService.list(
        { limit, offset },
        atorDaRequisicao(req)
      );
      return res.status(http_status.OK).json(lista);
    } catch (err: any) {
      return res.status(err.status || http_status.INTERNAL_ERROR).json(err);
    }
  }

  async listAtivas(req: RequestAutenticado, res: Response) {
    try {
      const limit = parseInt(req.query.limit as string) || 10000;
      const offset = parseInt(req.query.offset as string) || 0;

      const lista = await AssinaturasService.listAtivas(
        { limit, offset },
        atorDaRequisicao(req)
      );
      return res.status(http_status.OK).json(lista);
    } catch (err: any) {
      return res.status(err.status || http_status.INTERNAL_ERROR).json(err);
    }
  }

  async create(req: RequestAutenticado, res: Response) {
    try {
      const assinatura = await AssinaturasService.create(
        req.body,
        atorDaRequisicao(req)
      );
      return res.status(http_status.OK).json(assinatura);
    } catch (err: any) {
      return res.status(err.status || http_status.INTERNAL_ERROR).json(err);
    }
  }

  async update(req: RequestAutenticado, res: Response) {
    try {
      const assinatura = await AssinaturasService.update(
        { id_assinatura: req.params.id },
        req.body,
        atorDaRequisicao(req),
      );

      return res.status(http_status.OK).json(assinatura);
    } catch (err: any) {
      return res.status(err.status || http_status.INTERNAL_ERROR).json(err);
    }
  }

  async ativar(req: RequestAutenticado, res: Response) {
    try {
      const { id } = req.params;
      const assinatura = await AssinaturasService.ativar(id, atorDaRequisicao(req));
      return res.status(http_status.OK).json(assinatura);
    } catch (err: any) {
      return res.status(err.status || http_status.INTERNAL_ERROR).json(err);
    }
  }

  async cancelar(req: RequestAutenticado, res: Response) {
    try {
      const { id } = req.params;
      const assinatura = await AssinaturasService.cancelar(id, atorDaRequisicao(req));
      return res.status(http_status.OK).json(assinatura);
    } catch (err: any) {
      return res.status(err.status || http_status.INTERNAL_ERROR).json(err);
    }
  }

  async expirar(req: RequestAutenticado, res: Response) {
    try {
      const { id } = req.params;
      const assinatura = await AssinaturasService.expirar(id, atorDaRequisicao(req));
      return res.status(http_status.OK).json(assinatura);
    } catch (err: any) {
      return res.status(err.status || http_status.INTERNAL_ERROR).json(err);
    }
  }
}
