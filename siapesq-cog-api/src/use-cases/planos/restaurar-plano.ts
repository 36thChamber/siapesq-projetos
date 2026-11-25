import Joi from "joi";

import httpStatus from "../../consts/http-status-enum";
import Planos from "../../models/Planos";

import {
  AtualizarPlanoResponse,
  BuscarPlanoPorIdParamsRequest,
  toPlanoResponse,
} from "../../types/planos-types";

export default class RestaurarPlanoUseCase {
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
  ): Promise<AtualizarPlanoResponse> {
    await this.valida(params);

    const plano = await Planos.findOne({
      where: {
        id_plano: params.id_plano,
      },
      paranoid: false,
    });

    if (!plano) {
      throw {
        message: "Plano não encontrado",
        status: httpStatus.NOT_FOUND,
      };
    }

    await plano.restore();

    await plano.reload();

    return toPlanoResponse(plano);
  }
}