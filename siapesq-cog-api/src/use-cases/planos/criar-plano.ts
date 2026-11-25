import Joi from "joi";

import httpStatus from "../../consts/http-status-enum";
import Planos from "../../models/Planos";

import {
  CriarPlanoBodyRequest,
  CriarPlanoResponse,
  toPlanoResponse,
} from "../../types/planos-types";

export default class CriarPlanoUseCase {
  static async valida(body: CriarPlanoBodyRequest): Promise<void> {
    const schema = Joi.object({
      nome: Joi.string().required(),
      periodicidade: Joi.string().required(),
      especies_disponiveis: Joi.number().integer().min(0).required(),
      especies_ilimitadas: Joi.boolean().required(),
      valor_mensal: Joi.number().min(0).required(),
      valor_total: Joi.number().min(0).required(),
      ativo: Joi.boolean().optional(),
    });

    try {
      await schema.validateAsync(body);
    } catch (err: any) {
      throw { message: err.message, status: httpStatus.BAD_REQUEST };
    }
  }

  static async executa(body: CriarPlanoBodyRequest): Promise<CriarPlanoResponse> {
    await this.valida(body);

    const plano = await Planos.create({
      nome: body.nome,
      periodicidade: body.periodicidade,
      especies_disponiveis: body.especies_disponiveis,
      especies_ilimitadas: body.especies_ilimitadas,
      valor_mensal: body.valor_mensal,
      valor_total: body.valor_total,
      ativo: body.ativo ?? true,
    });

    return toPlanoResponse(plano);
  }
}