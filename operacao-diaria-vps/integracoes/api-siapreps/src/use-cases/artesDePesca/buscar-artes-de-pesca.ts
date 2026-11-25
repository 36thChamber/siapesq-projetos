import Joi from "joi";
import http_status from "../../consts/http-status-enum";
import ArtesDePesca from "../../models/ArtesDePesca";
import { AppError } from "../../errors/app-error";
import {
  ListarArtesDePescaQueryRequest,
  ListarArtesDePescaResponse,
} from "../../types/artes-de-pesca-types";

const req_query_schema = Joi.object({
  limit: Joi.number().default(10).error(() => new Error("limit inválido")),
  offset: Joi.number().default(0).error(() => new Error("offset inválido")),
});

export default class BuscarArtesDePescaUseCase {
  static async valida(query: ListarArtesDePescaQueryRequest) {
    try {
      await req_query_schema.validateAsync(query);
    } catch (err: any) {
      throw new AppError(
        http_status.BAD_REQUEST,
        'VALIDATION_ERROR',
        err.message
      );
    }
  }

  static async executa(
    query: ListarArtesDePescaQueryRequest,
  ): Promise<ListarArtesDePescaResponse> {
    try {
      const { limit, offset } = query;
      const { rows, count } = await ArtesDePesca.findAndCountAll({ limit, offset });

      return {
        artesDePesca: rows,
        total: count,
      };
    } catch (err) {
      throw err;
    }
  }
}