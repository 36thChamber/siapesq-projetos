import Joi from "joi";

import httpStatus from "../../consts/http-status-enum";

import GruposEspecies from "../../models/GrupoEspecies";

import {
  ListarGruposEspeciesQueryRequest,
  ListarGruposEspeciesResponse,
  toGrupoEspecieResponse,
} from "../../types/grupo-especies-types";

export default class ListarGruposEspeciesUseCase {
  static async valida(
    query: ListarGruposEspeciesQueryRequest
  ): Promise<void> {
    const schema = Joi.object({
      limit: Joi.number().integer().min(0).default(10),
      offset: Joi.number().integer().min(0).default(0),
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
    query: ListarGruposEspeciesQueryRequest
  ): Promise<ListarGruposEspeciesResponse> {
    try {
      await this.valida(query);

      const { rows, count } = await GruposEspecies.findAndCountAll({
        limit: query.limit ?? 10,
        offset: query.offset ?? 0,
      });

      return {
        gruposEspecies: rows.map(toGrupoEspecieResponse),
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