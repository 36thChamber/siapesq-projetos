import { Response } from "express";

import httpStatus from "../consts/http-status-enum";
import { RequestAutenticado } from "../types/express-types";

import PagamentosService from "../services/pagamentos-services";
import { atorDaRequisicao } from "../utils/autorizacao-recurso";

export default class PagamentosController {
  async get(req: RequestAutenticado, res: Response) {
    try {
      const pagamento = await PagamentosService.buscarPorId(
        { id_pagamento: req.params.id },
        atorDaRequisicao(req)
      );

      return res.status(httpStatus.OK).json(pagamento);
    } catch (err: any) {
      return res.status(err.status ?? httpStatus.INTERNAL_ERROR).json(err);
    }
  }

  async list(req: RequestAutenticado, res: Response) {
    try {
      const lista = await PagamentosService.listar(
        {
          limit: req.query.limit ? Number(req.query.limit) : 10000,
          offset: req.query.offset ? Number(req.query.offset) : 0,
        },
        atorDaRequisicao(req)
      );

      return res.status(httpStatus.OK).json(lista);
    } catch (err: any) {
      return res.status(err.status ?? httpStatus.INTERNAL_ERROR).json(err);
    }
  }

  async create(req: RequestAutenticado, res: Response) {
    try {
      const pagamento = await PagamentosService.criar(
        req.body,
        atorDaRequisicao(req)
      );

      return res.status(httpStatus.CREATED).json(pagamento);
    } catch (err: any) {
      return res.status(err.status ?? httpStatus.INTERNAL_ERROR).json(err);
    }
  }

  async getByUsuario(req: RequestAutenticado, res: Response) {
    try {
      const pagamentos = await PagamentosService.buscarPorUsuario(
        { id_usuario: req.params.id_usuario },
        atorDaRequisicao(req)
      );

      return res.status(httpStatus.OK).json(pagamentos);
    } catch (err: any) {
      return res.status(err.status ?? httpStatus.INTERNAL_ERROR).json(err);
    }
  }

  async getByAssinatura(req: RequestAutenticado, res: Response) {
    try {
      const pagamentos = await PagamentosService.buscarPorAssinatura(
        { id_assinatura: req.params.id_assinatura },
        atorDaRequisicao(req)
      );

      return res.status(httpStatus.OK).json(pagamentos);
    } catch (err: any) {
      return res.status(err.status ?? httpStatus.INTERNAL_ERROR).json(err);
    }
  }

  async confirmar(req: RequestAutenticado, res: Response) {
    try {
      const pagamento = await PagamentosService.confirmar(
        { id_pagamento: req.params.id },
        req.body,
        atorDaRequisicao(req)
      );

      return res.status(httpStatus.OK).json(pagamento);
    } catch (err: any) {
      return res.status(err.status ?? httpStatus.INTERNAL_ERROR).json(err);
    }
  }

  async falhar(req: RequestAutenticado, res: Response) {
    try {
      const pagamento = await PagamentosService.falhar(
        { id_pagamento: req.params.id },
        atorDaRequisicao(req)
      );

      return res.status(httpStatus.OK).json(pagamento);
    } catch (err: any) {
      return res.status(err.status ?? httpStatus.INTERNAL_ERROR).json(err);
    }
  }

  async reembolsar(req: RequestAutenticado, res: Response) {
    try {
      const pagamento = await PagamentosService.reembolsar(
        { id_pagamento: req.params.id },
        atorDaRequisicao(req)
      );

      return res.status(httpStatus.OK).json(pagamento);
    } catch (err: any) {
      return res.status(err.status ?? httpStatus.INTERNAL_ERROR).json(err);
    }
  }
}