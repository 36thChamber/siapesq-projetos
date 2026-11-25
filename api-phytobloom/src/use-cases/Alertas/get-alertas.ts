import Joi from "joi";

import http_status from "../../consts/http-status-enum";
import Alertas from "../../models/Alertas";
import {
  GetAlertaParamsRequest,
  GetAlertaResponse,
  toAlertaResponse,
} from "../../types/alertas-types";

const req_params_schema = Joi.object({
  id: Joi.number()
    .required()
    .error(() => new Error("id do alerta inválido")),
});

export default class GetAlertaUseCase {
  static async valida(params: GetAlertaParamsRequest) {
    try {
      await req_params_schema.validateAsync(params);
    } catch (err: any) {
      throw {
        message: err.message,
        status: http_status.BAD_REQUEST,
      };
    }
  }

  static async executa(
    params: GetAlertaParamsRequest,
    id_usuario?: number,
  ): Promise<GetAlertaResponse> {
    const alerta = await Alertas.findOne({
      where: { id: params.id, ...(id_usuario !== undefined ? { id_usuario } : {}) },
    });

    if (!alerta) {
      throw {
        message: `Alerta ${params.id} não encontrado`,
        status: http_status.NOT_FOUND,
      };
    }

    return toAlertaResponse(alerta);
  }
}
