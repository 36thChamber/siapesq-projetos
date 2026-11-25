import Joi from "joi";

import httpStatus from "../../consts/http-status-enum";

import Pagamentos from "../../models/Pagamentos";
import { StatusPagamento } from "../../models/enums/statusPagamentosEnum";

import {
  BuscarPagamentoPorIdParamsRequest,
  ReembolsarPagamentoResponse,
  toPagamentoResponse,
} from "../../types/pagamentos-types";

import {
  AtorAutenticado,
  exigeAdmin,
} from "../../utils/autorizacao-recurso";

export default class ReembolsarPagamentoUseCase {
  static async valida(params: BuscarPagamentoPorIdParamsRequest): Promise<void> {
    const schema = Joi.object({
      id_pagamento: Joi.string().uuid().required(),
    });

    try {
      await schema.validateAsync(params);
    } catch (err: any) {
      throw {
        status: httpStatus.BAD_REQUEST,
        message: err.message,
      };
    }
  }

  static async executa(
    params: BuscarPagamentoPorIdParamsRequest,
    ator: AtorAutenticado
  ): Promise<ReembolsarPagamentoResponse> {
    exigeAdmin(ator);

    await this.valida(params);

    const pagamento = await Pagamentos.findByPk(params.id_pagamento);

    if (!pagamento) {
      throw {
        status: httpStatus.NOT_FOUND,
        message: "Pagamento não encontrado",
      };
    }

    if (pagamento.status !== StatusPagamento.PAGO) {
      throw {
        status: httpStatus.BAD_REQUEST,
        message: "Apenas pagamentos com status pago podem ser reembolsados",
      };
    }

    await pagamento.update({
      status: StatusPagamento.REEMBOLSADO,
    });

    return toPagamentoResponse(pagamento);
  }
}