import { Response } from "express";
import { RequestAutenticado } from "../types/express-types";
import http_status from "../consts/http-status-enum";
import AreasAlertasService from "../services/areas-alertas-services";
import {
  CriarAreaAlertaBodyRequest,
  ListarAreasReservatorioQueryRequest,
  AtualizarAreaAlertaBodyRequest,
} from "../types/areas_alertas-types";

export default class Areas_AlertasController {
  async get(req: RequestAutenticado, res: Response) {
    try {
      const { id } = req.params;
      const area = await AreasAlertasService.buscarPorId(
        parseInt(id),
        Number(req.id_usuario),
        Boolean(req.is_admin)
      );
      return res.status(http_status.OK).json({
        success: true,
        message: "Área de alerta encontrada com sucesso.",
        data: area,
      });
    } catch (err: any) {
      const statusCode = err.status || http_status.INTERNAL_ERROR;
      return res.status(statusCode).json({
        success: false,
        message: err.message || "Erro interno do servidor.",
      });
    }
  }

  async list(req: RequestAutenticado, res: Response) {
    try {
      let { limit, offset } = req.query;
      const query: ListarAreasReservatorioQueryRequest = {
        limit: limit ? parseInt(limit as string) : 10000,
        offset: offset ? parseInt(offset as string) : 0,
        id_usuario: Number(req.id_usuario),
      };
      // podemos também passar outros filtros como tipo, ativa se vierem
      const resultado = await AreasAlertasService.listar(
        query,
        Number(req.id_usuario),
        Boolean(req.is_admin)
      );
      return res.status(http_status.OK).json({
        success: true,
        message: "Áreas de alerta listadas com sucesso.",
        data: resultado.areas_alertas,
        total: resultado.total,
      });
    } catch (err: any) {
      const statusCode = err.status || http_status.INTERNAL_ERROR;
      return res.status(statusCode).json({
        success: false,
        message: err.message || "Erro interno do servidor.",
      });
    }
  }

  async listByReservatorio(req: RequestAutenticado, res: Response) {
    try {
      const { id_reservatorio } = req.params;
      let { limit, offset } = req.query;
      const query = {
        id_reservatorio: parseInt(id_reservatorio),
        id_usuario: Number(req.id_usuario),
        limit: limit ? parseInt(limit as string) : 10000,
        offset: offset ? parseInt(offset as string) : 0,
      };
      const resultado = await AreasAlertasService.listarPorReservatorio(
        query,
        Number(req.id_usuario),
        Boolean(req.is_admin)
      );
      return res.status(http_status.OK).json({
        success: true,
        message: "Áreas de alerta do reservatório listadas com sucesso.",
        data: resultado.areas_alertas,
        total: resultado.total,
      });
    } catch (err: any) {
      const statusCode = err.status || http_status.INTERNAL_ERROR;
      return res.status(statusCode).json({
        success: false,
        message: err.message || "Erro interno do servidor.",
      });
    }
  }


  async create(req: RequestAutenticado, res: Response) {
    try {
      const body: CriarAreaAlertaBodyRequest = req.body;
      const area = await AreasAlertasService.criar(body, Number(req.id_usuario));
      return res.status(http_status.CREATED).json({
        success: true,
        message: "Área de alerta criada com sucesso.",
        data: area,
      });
    } catch (err: any) {
      const statusCode = err.status || http_status.INTERNAL_ERROR;
      return res.status(statusCode).json({
        success: false,
        message: err.message || "Erro interno do servidor.",
      });
    }
  }

  async update(req: RequestAutenticado, res: Response) {
    try {
      const { id } = req.params;
      const body: AtualizarAreaAlertaBodyRequest = req.body;

      const areaAtualizada = await AreasAlertasService.atualizar(
        {
          id: parseInt(id),
          ...body,
        },
        Number(req.id_usuario),
      );
      return res.status(http_status.OK).json({
        success: true,
        message: "Área de alerta atualizada com sucesso.",
        data: areaAtualizada,
      });
    } catch (err: any) {
      const statusCode = err.status || http_status.INTERNAL_ERROR;
      return res.status(statusCode).json({
        success: false,
        message: err.message || "Erro interno do servidor.",
      });
    }
  }

  async delete(req: RequestAutenticado, res: Response) {
    try {
      const { id } = req.params;
      await AreasAlertasService.remover(parseInt(id), Number(req.id_usuario));
      return res.status(http_status.OK).json({
        success: true,
        message: "Área de alerta deletada com sucesso.",
      });
    } catch (err: any) {
      const statusCode = err.status || http_status.INTERNAL_ERROR;
      return res.status(statusCode).json({
        success: false,
        message: err.message || "Erro interno do servidor.",
      });
    }
  }
}