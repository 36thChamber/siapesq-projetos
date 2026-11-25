import Joi from "joi";

import httpStatus from "../../consts/http-status-enum";
import Especies from "../../models/Especies";

import {
  ListarEspeciesQueryRequest,
  ListarEspeciesResponse,
  toEspecieListResponse,
} from "../../types/especies-types";

export default class ListarEspeciesUseCase {
  static async valida(query: ListarEspeciesQueryRequest): Promise<void> {
    const schema = Joi.object({
      limit: Joi.number().integer().min(0).default(10),
      offset: Joi.number().integer().min(0).default(0),
    });

    try {
      await schema.validateAsync(query);
    } catch (err: any) {
      throw { message: err.message, status: httpStatus.BAD_REQUEST };
    }
  }

  static async executa(
    query: ListarEspeciesQueryRequest
  ): Promise<ListarEspeciesResponse> {
    try {
      await this.valida(query);

      const { rows, count } = await Especies.findAndCountAll({
        limit: query.limit ?? 10,
        offset: query.offset ?? 0,
      });

      return {
        especies: rows.map(toEspecieListResponse),
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