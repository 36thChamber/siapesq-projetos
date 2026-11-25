import Joi from "joi";

import httpStatus from "../../consts/http-status-enum";

import Assinaturas from "../../models/Assinaturas";
import Pagamentos from "../../models/Pagamentos";
import Usuarios from "../../models/Usuarios";

import {
  ListarPagamentosQueryRequest,
  ListarPagamentosResponse,
  toPagamentoResponse,
} from "../../types/pagamentos-types";

import {
  AtorAutenticado,
  exigeAdmin,
} from "../../utils/autorizacao-recurso";

export default class ListarPagamentosUseCase {
  static async valida(query: ListarPagamentosQueryRequest): Promise<void> {
    const schema = Joi.object({
      limit: Joi.number().integer().min(0).default(10),
      offset: Joi.number().integer().min(0).default(0),
    });

    try {
      await schema.validateAsync(query);
    } catch (err: any) {
      throw { message: err.message, status: httpStatus.BAD_REQUEST };
    }
  }

  static async executa(
    query: ListarPagamentosQueryRequest,
    ator: AtorAutenticado
  ): Promise<ListarPagamentosResponse> {
    exigeAdmin(ator);

    await this.valida(query);

    const { rows, count } = await Pagamentos.findAndCountAll({
      include: [{ model: Usuarios }, { model: Assinaturas }],
      limit: query.limit ?? 10,
      offset: query.offset ?? 0,
      order: [["criado_em", "DESC"]],
    });

    return {
      pagamentos: rows.map(toPagamentoResponse),
      total: count,
    };
  }
}