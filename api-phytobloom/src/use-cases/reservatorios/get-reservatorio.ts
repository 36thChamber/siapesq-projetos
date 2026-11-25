import Joi from "joi";

import http_status from "../../consts/http-status-enum";
import Reservatorios from "../../models/Reservatorios";
import AreasAlertas from "../../models/AreasAlertas";
import {
  GetReservatorioParamsRequest,
  GetReservatorioResponse,
  toReservatorioResponse,
} from "../../types/reservatorios-types";

const req_params_schema = Joi.object({
  id: Joi.number()
    .required()
    .error(() => new Error("id do reservatorio invalido")),
});

export default class GetReservatorioUseCase {
  static async valida(params: GetReservatorioParamsRequest) {
    try {
      await req_params_schema.validateAsync(params);
    } catch (err: any) {
      throw { message: err.message, status: http_status.BAD_REQUEST };
    }
  }

  static async executa(
    params: GetReservatorioParamsRequest,
    id_usuario?: number,
  ): Promise<GetReservatorioResponse> {
    const { id } = params;

    const reservatorio = await Reservatorios.findOne({
      where: { id, ...(id_usuario !== undefined ? { id_usuario } : {}) },
      include: [{ model: AreasAlertas, as: "areas" }],
    });

    if (!reservatorio) {
      throw {
        message: `Reservatorio ${id} nao encontrado`,
        status: http_status.NOT_FOUND,
      };
    }

    return toReservatorioResponse(reservatorio);
  }
}
