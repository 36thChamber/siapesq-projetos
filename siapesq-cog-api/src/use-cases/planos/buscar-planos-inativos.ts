import Joi from "joi";

import httpStatus from "../../consts/http-status-enum";
import Planos from "../../models/Planos";

import {
  ListarPlanosQueryRequest,
  PlanoResponse,
  toPlanoResponse,
} from "../../types/planos-types";

export default class ListarPlanosAtivosUseCase {
  static async valida(query: ListarPlanosQueryRequest): Promise<void> {
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
    query: ListarPlanosQueryRequest
  ): Promise<PlanoResponse[]> {
    await this.valida(query);

    const planos = await Planos.findAll({
      where: { ativo: true },
      limit: query.limit ?? 10,
      offset: query.offset ?? 0,
      order: [["criado_em", "DESC"]],
    });

    return planos.map(toPlanoResponse);
  }
}