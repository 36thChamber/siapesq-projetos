import Joi from "joi";

import httpStatus from "../../consts/http-status-enum";
import Planos from "../../models/Planos";

import {
  BuscarPlanoPorIdParamsRequest,
  BuscarPlanoPorIdResponse,
  toPlanoResponse,
} from "../../types/planos-types";

export default class BuscarPlanoPorIdUseCase {
  static async valida(params: BuscarPlanoPorIdParamsRequest): Promise<void> {
    const schema = Joi.object({
      id_plano: Joi.string().uuid().required(),
    });

    try {
      await schema.validateAsync(params);
    } catch (err: any) {
      throw { message: err.message, status: httpStatus.BAD_REQUEST };
    }
  }

  static async executa(
    params: BuscarPlanoPorIdParamsRequest
  ): Promise<BuscarPlanoPorIdResponse> {
    await this.valida(params);

    const plano = await Planos.findByPk(params.id_plano);

    if (!plano) {
      throw {
        message: "Plano não encontrado",
        status: httpStatus.NOT_FOUND,
      };
    }

    return toPlanoResponse(plano);
  }
}