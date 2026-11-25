import Joi from "joi";
import http_status from "../../consts/http-status-enum";
import Analises from "../../models/Analises";
import { AppError } from "../../errors/app-error";
import {
  ListarAnalisesQueryRequest,
  ListarAnalisesResponse,
  toAnaliseResponse,
} from "../../types/analises-types";

const req_query_schema = Joi.object({
  limit: Joi.number()
    .default(10)
    .error(() => new Error("limit inválido")),
  offset: Joi.number()
    .default(0)
    .error(() => new Error("offset inválido")),
});

export default class BuscarAnalisesUseCase {
  static async valida(query: ListarAnalisesQueryRequest) {
    try {
      return await req_query_schema.validateAsync(query);
    } catch (err: any) {
      throw new AppError(
        http_status.BAD_REQUEST,
        'VALIDATION_ERROR',
        err.message
      );
    }
  }

  static async executa(
    query: ListarAnalisesQueryRequest,
  ): Promise<ListarAnalisesResponse> {
    try {
      const { limit, offset } = query;

      const { rows, count } = await Analises.findAndCountAll({
        limit,
        offset,
        order: [["nome_padrao", "ASC"]],
      });

      return {
        analises: rows.map(toAnaliseResponse),
        total: count,
      };
    } catch (err) {
      throw err;
    }
  }
}