import { Op } from "sequelize";
import Joi from "joi";
import http_status from "../../consts/http-status-enum";
import Lances from "../../models/Lances";
import {
  ListarLancesPorMissaoParamsRequest,
  ListarLancesQueryRequest,
  ListarLancesResponse,
  toLanceResponse,
} from "../../types/Lances-types";
import { AppError } from "../../errors/app-error";

const req_params_schema = Joi.object({
  id_missao: Joi.number().required().error(() => new Error("id_missao inválido")),
});

const req_query_schema = Joi.object({
  limit: Joi.number().default(10).error(() => new Error("limit inválido")),
  offset: Joi.number().default(0).error(() => new Error("offset inválido")),
});

export default class BuscarLancesPorMissaoUseCase {
  static async valida(
    params: ListarLancesPorMissaoParamsRequest,
    query: ListarLancesQueryRequest,
  ) {
    try {
      await req_params_schema.validateAsync(params);
      await req_query_schema.validateAsync(query);
    } catch (err: any) {
      throw new AppError(http_status.BAD_REQUEST, 'VALIDATION_ERROR', err.message);
    }
  }

  static async executa(
    params: ListarLancesPorMissaoParamsRequest,
    query: ListarLancesQueryRequest,
  ): Promise<ListarLancesResponse> {
    const { limit = 10, offset = 0 } = query;

    const { count, rows } = await Lances.findAndCountAll({
      where: {
        id_missao: params.id_missao,
        deletado_em: { [Op.is]: null },
      },
      limit,
      offset,
      order: [["numero_lance", "ASC"]],
    });

    return {
      lances: rows.map(toLanceResponse),
      total: count,
    };
  }
}