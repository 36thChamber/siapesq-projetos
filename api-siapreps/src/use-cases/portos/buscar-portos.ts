import Joi from "joi";
import http_status from "../../consts/http-status-enum";
import Portos from "../../models/Portos";
import {
  ListarPortosQueryRequest,
  ListarPortosResponse,
} from "../../types/portos-types";
import { AppError } from "../../errors/app-error";

const req_query_schema = Joi.object({
  limit: Joi.number()
    .default(10)
    .error(() => new Error("limit inválido")),
  offset: Joi.number()
    .default(0)
    .error(() => new Error("offset inválido")),
});

export default class BuscarPortosUseCase {
  static async valida(query: ListarPortosQueryRequest) {
    try {
      await req_query_schema.validateAsync(query);
    } catch (err: any) {
      throw new AppError(http_status.BAD_REQUEST, 'VALIDATION_ERROR', err.message);
    }
  }

  static async executa(
    query: ListarPortosQueryRequest,
  ): Promise<ListarPortosResponse> {
    try {
      const { limit, offset } = query;
      const { rows, count } = await Portos.findAndCountAll({ limit, offset });
      return {
        portos: rows,
        total: count,
      };
    } catch (err) {
      throw err;
    }
  }
}