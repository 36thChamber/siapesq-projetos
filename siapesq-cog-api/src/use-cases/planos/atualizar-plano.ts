import Joi from "joi";

import httpStatus from "../../consts/http-status-enum";
import Planos from "../../models/Planos";

import {
  AtualizarPlanoBodyRequest,
  AtualizarPlanoResponse,
  BuscarPlanoPorIdParamsRequest,
  toPlanoResponse,
} from "../../types/planos-types";

export default class AtualizarPlanoUseCase {
  static async valida(
    params: BuscarPlanoPorIdParamsRequest,
    body: AtualizarPlanoBodyRequest
  ): Promise<void> {
    const schema = Joi.object({
      params: Joi.object({
        id_plano: Joi.string().uuid().required(),
      }).required(),

      body: Joi.object({
        nome: Joi.string().optional(),
        periodicidade: Joi.string().optional(),
        especies_disponiveis: Joi.number().integer().min(0).optional(),
        especies_ilimitadas: Joi.boolean().optional(),
        valor_mensal: Joi.number().min(0).optional(),
        valor_total: Joi.number().min(0).optional(),
        ativo: Joi.boolean().optional(),
      }).required(),
    });

    try {
      await schema.validateAsync({ params, body });
    } catch (err: any) {
      throw { message: err.message, status: httpStatus.BAD_REQUEST };
    }
  }

  static async executa(
    params: BuscarPlanoPorIdParamsRequest,
    body: AtualizarPlanoBodyRequest
  ): Promise<AtualizarPlanoResponse> {
    await this.valida(params, body);

    const plano = await Planos.findByPk(params.id_plano);

    if (!plano) {
      throw {
        message: "Plano não encontrado",
        status: httpStatus.NOT_FOUND,
      };
    }

    await plano.update(body);

    return toPlanoResponse(plano);
  }
}