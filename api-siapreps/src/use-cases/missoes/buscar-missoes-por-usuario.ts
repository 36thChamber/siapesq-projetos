import { Op } from "sequelize";
import Joi from "joi";
import http_status from "../../consts/http-status-enum";
import Missoes from "../../models/Missoes";
import {
  ListarMissoesPorUsuarioParamsRequest,
  ListarMissoesQueryRequest,
  ListarMissoesResponse,
  toMissaoResponse,
} from "../../types/Missoes-types";
import { AppError } from "../../errors/app-error";

const req_params_schema = Joi.object({
  id_usuario: Joi.number()
    .required()
    .error(() => new Error("id_usuario inválido")),
});

const req_query_schema = Joi.object({
  limit: Joi.number()
    .default(10)
    .error(() => new Error("limit inválido")),
  offset: Joi.number()
    .default(0)
    .error(() => new Error("offset inválido")),
});

export default class BuscarMissoesPorUsuarioUseCase {
  static async valida(
    params: ListarMissoesPorUsuarioParamsRequest,
    query: ListarMissoesQueryRequest,
  ) {
    try {
      await req_params_schema.validateAsync(params);
      await req_query_schema.validateAsync(query);
    } catch (err: any) {
      throw new AppError(http_status.BAD_REQUEST, 'VALIDATION_ERROR', err.message);
    }
  }

  static async executa(
    params: ListarMissoesPorUsuarioParamsRequest,
    query: ListarMissoesQueryRequest,
  ): Promise<ListarMissoesResponse> {
    const { limit, offset } = query;
    const { count, rows } = await Missoes.findAndCountAll({
      where: {
        id_usuario: params.id_usuario,
        deletado_em: { [Op.is]: null },
      },
      limit,
      offset,
      order: [["id", "DESC"]],
    });
    return {
      missoes: rows.map(toMissaoResponse),
      total: count,
    };
  }
}