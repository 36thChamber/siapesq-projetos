import Joi from "joi";

import http_status from "../../consts/http-status-enum";
import {
  AtualizarPrioridadeReservatorioBodyRequest,
  AtualizarPrioridadeReservatorioResponse,
} from "../../types/reservatorios-types";
import UpdateReservatorioUseCase from "./update-reservatorio";

const update_prioridade_schema = Joi.object({
  prioridade: Joi.number()
    .integer()
    .min(1)
    .required()
    .error(() => new Error("Prioridade invalida")),
});

export default class UpdatePrioridadeReservatorioUseCase {
  static async valida(body: AtualizarPrioridadeReservatorioBodyRequest) {
    try {
      await update_prioridade_schema.validateAsync(body);
    } catch (err: any) {
      throw {
        message: err.message,
        status: http_status.BAD_REQUEST,
      };
    }
  }

  static async executa(
    body: AtualizarPrioridadeReservatorioBodyRequest,
    id_reservatorio: number,
  ): Promise<AtualizarPrioridadeReservatorioResponse> {
    return UpdateReservatorioUseCase.executa(body, id_reservatorio);
  }
}
