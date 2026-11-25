import Joi from "joi";

import httpStatus from "../../consts/http-status-enum";

import Assinaturas from "../../models/Assinaturas";
import Pagamentos from "../../models/Pagamentos";
import Usuarios from "../../models/Usuarios";

import {
  BuscarPagamentoPorIdParamsRequest,
  BuscarPagamentoPorIdResponse,
  toPagamentoResponse,
} from "../../types/pagamentos-types";

import {
  AtorAutenticado,
  exigeDonoOuAdmin,
} from "../../utils/autorizacao-recurso";

export default class BuscarPagamentoPorIdUseCase {
  static async valida(params: BuscarPagamentoPorIdParamsRequest): Promise<void> {
    const schema = Joi.object({
      id_pagamento: Joi.string().uuid().required(),
    });

    try {
      await schema.validateAsync(params);
    } catch (err: any) {
      throw { message: err.message, status: httpStatus.BAD_REQUEST };
    }
  }

  static async executa(
    params: BuscarPagamentoPorIdParamsRequest,
    ator: AtorAutenticado
  ): Promise<BuscarPagamentoPorIdResponse> {
    await this.valida(params);

    const pagamento = await Pagamentos.findByPk(params.id_pagamento, {
      include: [{ model: Usuarios }, { model: Assinaturas }],
    });

    if (!pagamento) {
      throw {
        status: httpStatus.NOT_FOUND,
        message: "Pagamento não encontrado",
      };
    }

    exigeDonoOuAdmin(ator, pagamento.id_usuario);

    return toPagamentoResponse(pagamento);
  }
}