import Joi from "joi";
import httpStatus from "../../consts/http-status-enum";
import Iscas from "../../models/Iscas";
import {
  ListarIscasQueryRequest,
  ListarIscasResponse,
  toIscaResponse,
} from "../../types/iscas-types";
import { AppError } from "../../errors/app-error";

const req_query_schema = Joi.object({
  limit: Joi.number()
    .default(10)
    .messages({ "number.base": "Limit invalido" }),
  offset: Joi.number()
    .default(0)
    .messages({ "number.base": "Offset invalido" }),
});

export default class BuscarIscasUseCase {
  static async valida(query: ListarIscasQueryRequest) {
    try {
      await req_query_schema.validateAsync(query);
    } catch (err: any) {
      throw new AppError(httpStatus.BAD_REQUEST, 'VALIDATION_ERROR', err.message);
    }
  }

  static async executa(
    query: ListarIscasQueryRequest,
  ): Promise<ListarIscasResponse> {
    const { limit, offset } = query;
    const { rows, count } = await Iscas.findAndCountAll({
      limit,
      offset,
      where: { ativo: true },
    });

    return {
      iscas: rows.map(toIscaResponse),
      total: count,
    };
  }
}