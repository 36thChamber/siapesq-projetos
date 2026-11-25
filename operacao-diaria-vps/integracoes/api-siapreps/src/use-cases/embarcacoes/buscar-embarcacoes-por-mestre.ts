import Joi from "joi";
import http_status from "../../consts/http-status-enum";
import Embarcacoes from "../../models/Embarcacoes";
import {
  ListarEmbarcacoesPorMestreParamsRequest,
  ListarEmbarcacoesQueryRequest,
  ListarEmbarcacoesResponse,
} from "../../types/embarcacoes-types";
import { AppError } from "../../errors/app-error";

const req_params_schema = Joi.object({
  id_mestre: Joi.number().required().error(() => new Error("id do usuário mestre inválido")),
});

const req_query_schema = Joi.object({
  limit: Joi.number().default(10).error(() => new Error("limit inválido")),
  offset: Joi.number().default(0).error(() => new Error("offset inválido")),
});

export default class BuscarEmbarcacoesPorMestreUseCase {
  static async valida(
    params: ListarEmbarcacoesPorMestreParamsRequest,
    query: ListarEmbarcacoesQueryRequest,
  ) {
    try {
      await req_params_schema.validateAsync(params);
      await req_query_schema.validateAsync(query);
    } catch (err: any) {
      throw new AppError(http_status.BAD_REQUEST, 'VALIDATION_ERROR', err.message);
    }
  }

  static async executa(
    params: ListarEmbarcacoesPorMestreParamsRequest,
    query: ListarEmbarcacoesQueryRequest,
  ): Promise<ListarEmbarcacoesResponse> {
    try {
      const { id_mestre } = params;
      const { limit, offset } = query;
      const { rows, count } = await Embarcacoes.findAndCountAll({
        where: { id_mestre },
        limit,
        offset,
      });
      return {
        embarcacoes: rows,
        total: count,
      };
    } catch (err) {
      throw err;
    }
  }
}