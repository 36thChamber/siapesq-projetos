import Joi from "joi";

import httpStatus from "../../consts/http-status-enum";
import Planos from "../../models/Planos";

import {
  DeletarPlanoParamsRequest,
  DeletarPlanoResponse,
  toPlanoResponse,
} from "../../types/planos-types";

export default class DeletarPlanoUseCase {
  static async valida(params: DeletarPlanoParamsRequest): Promise<void> {
    const schema = Joi.object({
      id_plano: Joi.string().uuid().required(),
    });

    try {
      await schema.validateAsync(params);
    } catch (err: any) {
      throw { message: err.message, status: httpStatus.BAD_REQUEST };
    }
  }

  static async executa(params: DeletarPlanoParamsRequest): Promise<DeletarPlanoResponse> {
    await this.valida(params);

    const plano = await Planos.findByPk(params.id_plano);

    if (!plano) {
      throw {
        message: "Plano não encontrado",
        status: httpStatus.NOT_FOUND,
      };
    }

    const response = toPlanoResponse(plano);

    await plano.destroy();

    return response;
  }
}