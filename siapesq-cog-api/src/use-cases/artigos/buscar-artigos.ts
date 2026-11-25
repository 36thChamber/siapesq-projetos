import Joi from "joi";

import httpStatus from "../../consts/http-status-enum";

import Artigos from "../../models/Artigos";

import {
  ListarArtigosQueryRequest,
  ListarArtigosResponse,
  toArtigoResponse,
} from "../../types/artigos-types";

export default class BuscarArtigosUseCase {
  static async valida(
    query: ListarArtigosQueryRequest
  ): Promise<void> {
    const schema = Joi.object({
      limit: Joi.number().default(10),
      offset: Joi.number().default(0),
    });

    try {
      await schema.validateAsync(query);
    } catch (err: any) {
      throw {
        message: err.message,
        status: httpStatus.BAD_REQUEST,
      };
    }
  }

  static async executa(
    query: ListarArtigosQueryRequest
  ): Promise<ListarArtigosResponse> {
    try {
      await this.valida(query);

      const limit = query.limit ?? 10;
      const offset = query.offset ?? 0;

      const { rows, count } = await Artigos.findAndCountAll({
        limit,
        offset,
      });

      return {
        artigos: rows.map(toArtigoResponse),
        total: count,
      };
    } catch (err: any) {
      throw {
        message: err.message,
        status: err.status ?? httpStatus.INTERNAL_ERROR,
      };
    }
  }
}