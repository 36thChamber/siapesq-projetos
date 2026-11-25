import Joi from "joi";

import httpStatus from "../../consts/http-status-enum";

import Pagamentos from "../../models/Pagamentos";
import { StatusPagamento } from "../../models/enums/statusPagamentosEnum";

import {
  BuscarPagamentoPorIdParamsRequest,
  ConfirmarPagamentoBodyRequest,
  ConfirmarPagamentoResponse,
  toPagamentoResponse,
} from "../../types/pagamentos-types";

import {
  AtorAutenticado,
  exigeAdmin,
} from "../../utils/autorizacao-recurso";

export default class ConfirmarPagamentoUseCase {
  static async valida(
    params: BuscarPagamentoPorIdParamsRequest,
    body: ConfirmarPagamentoBodyRequest
  ): Promise<void> {
    const schema = Joi.object({
      params: Joi.object({
        id_pagamento: Joi.string().uuid().required(),
      }).required(),

      body: Joi.object({
        url_fatura: Joi.string().optional().allow(null, ""),
        id_fatura_provedor: Joi.string().optional().allow(null, ""),
        data_pagamento: Joi.date().optional().allow(null),
      }).required(),
    });

    try {
      await schema.validateAsync({ params, body });
    } catch (err: any) {
      throw {
        message: err.message,
        status: httpStatus.BAD_REQUEST,
      };
    }
  }

  static async executa(
    params: BuscarPagamentoPorIdParamsRequest,
    body: ConfirmarPagamentoBodyRequest,
    ator: AtorAutenticado
  ): Promise<ConfirmarPagamentoResponse> {
    exigeAdmin(ator);

    await this.valida(params, body);

    const pagamento = await Pagamentos.findByPk(params.id_pagamento);

    if (!pagamento) {
      throw {
        status: httpStatus.NOT_FOUND,
        message: "Pagamento não encontrado",
      };
    }

    if (pagamento.status === StatusPagamento.REEMBOLSADO) {
      throw {
        status: httpStatus.BAD_REQUEST,
        message: "Pagamento reembolsado não pode ser confirmado",
      };
    }

    await pagamento.update({
      status: StatusPagamento.PAGO,
      data_pagamento: body.data_pagamento ?? new Date(),
      url_fatura:
        body.url_fatura !== undefined
          ? body.url_fatura
          : pagamento.url_fatura,
      id_fatura_provedor:
        body.id_fatura_provedor !== undefined
          ? body.id_fatura_provedor
          : pagamento.id_fatura_provedor,
    });

    return toPagamentoResponse(pagamento);
  }
}