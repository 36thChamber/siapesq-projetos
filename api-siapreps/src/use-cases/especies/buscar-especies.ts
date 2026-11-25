import Joi from "joi";
import httpStatus from "../../consts/http-status-enum";
import Especies from "../../models/Especies";
import {
  ListarEspeciesQueryRequest,
  ListarEspeciesResponse,
  toEspecieResponse,
} from "../../types/especies-types";
import { AppError } from "../../errors/app-error";

const req_query_schema = Joi.object({
  limit: Joi.number()
    .default(10)
    .messages({ "number.base": "Limit invalido" }),
  offset: Joi.number()
    .default(0)
    .messages({ "number.base": "Offset invalido" }),
});

export default class ListarEspeciesUseCase {
  static async valida(query: ListarEspeciesQueryRequest) {
    try {
      await req_query_schema.validateAsync(query);
    } catch (err: any) {
      throw new AppError(httpStatus.BAD_REQUEST, 'VALIDATION_ERROR', err.message);
    }
  }

  static async executa(
    query: ListarEspeciesQueryRequest,
  ): Promise<ListarEspeciesResponse> {
    const { limit = 10, offset = 0 } = query;

    const { rows, count } = await Especies.findAndCountAll({
      limit,
      offset,
      where: { ativo: true },
    });

    return {
      especies: rows.map(toEspecieResponse),
      total: count,
    };
  }
}