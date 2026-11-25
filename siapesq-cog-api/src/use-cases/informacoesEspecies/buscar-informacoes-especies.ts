import Joi from "joi";

import httpStatus from "../../consts/http-status-enum";

import InformacoesEspecies from "../../models/InformacoesEspecies";

import {
  ListarInformacoesEspeciesQueryRequest,
  ListarInformacoesEspeciesResponse,
  toInformacaoEspecieResponse,
} from "../../types/informacoes-especies-types";

export default class ListarInformacoesEspeciesUseCase {
  static async valida(
    query: ListarInformacoesEspeciesQueryRequest
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
    query: ListarInformacoesEspeciesQueryRequest
  ): Promise<ListarInformacoesEspeciesResponse> {
    try {
      await this.valida(query);

      const { rows, count } = await InformacoesEspecies.findAndCountAll({
        limit: query.limit ?? 10,
        offset: query.offset ?? 0,
      });

      return {
        informacoesEspecies: rows.map(toInformacaoEspecieResponse),
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