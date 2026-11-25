import Joi from "joi";
import http_status from "../../consts/http-status-enum";
import Embarcacoes from "../../models/Embarcacoes";
import {
  ListarEmbarcacoesQueryRequest,
  ListarEmbarcacoesResponse,
} from "../../types/embarcacoes-types";
import { AppError } from "../../errors/app-error";

const req_query_schema = Joi.object({
  limit: Joi.number().default(10).error(() => new Error("limit inválido")),
  offset: Joi.number().default(0).error(() => new Error("offset inválido")),
});

export default class BuscarEmbarcacoesUseCase {
  static async valida(query: ListarEmbarcacoesQueryRequest) {
    try {
      await req_query_schema.validateAsync(query);
    } catch (err: any) {
      throw new AppError(http_status.BAD_REQUEST, 'VALIDATION_ERROR', err.message);
    }
  }

  static async executa(query: ListarEmbarcacoesQueryRequest): Promise<ListarEmbarcacoesResponse> {
    try {
      const { limit, offset } = query;
      const { rows, count } = await Embarcacoes.findAndCountAll({ limit, offset });
      return {
        embarcacoes: rows,
        total: count,
      };
    } catch (err) {
      throw err;
    }
  }
}