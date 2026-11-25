import Joi from "joi";

import httpStatus from "../../consts/http-status-enum";

import Pagamentos from "../../models/Pagamentos";
import { StatusPagamento } from "../../models/enums/statusPagamentosEnum";

import {
  BuscarPagamentoPorIdParamsRequest,
  FalharPagamentoResponse,
  toPagamentoResponse,
} from "../../types/pagamentos-types";

import {
  AtorAutenticado,
  exigeAdmin,
} from "../../utils/autorizacao-recurso";

export default class FalharPagamentoUseCase {
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
  ): Promise<FalharPagamentoResponse> {
    exigeAdmin(ator);

    await this.valida(params);

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
        message: "Pagamento reembolsado não pode ser alterado para falhou",
      };
    }

    await pagamento.update({
      status: StatusPagamento.FALHOU,
    });

    return toPagamentoResponse(pagamento);
  }
}