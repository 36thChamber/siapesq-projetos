import Joi from "joi";

import http_status from "../../consts/http-status-enum";
import {
  AtualizarFavoritoReservatorioBodyRequest,
  AtualizarFavoritoReservatorioResponse,
} from "../../types/reservatorios-types";
import UpdateReservatorioUseCase from "./update-reservatorio";

const update_favorito_schema = Joi.object({
  favorito: Joi.boolean()
    .required()
    .error(() => new Error("Favorito invalido")),
});

export default class UpdateFavoritoReservatorioUseCase {
  static async valida(body: AtualizarFavoritoReservatorioBodyRequest) {
    try {
      await update_favorito_schema.validateAsync(body);
    } catch (err: any) {
      throw {
        message: err.message,
        status: http_status.BAD_REQUEST,
      };
    }
  }

  static async executa(
    body: AtualizarFavoritoReservatorioBodyRequest,
    id_reservatorio: number,
  ): Promise<AtualizarFavoritoReservatorioResponse> {
    return UpdateReservatorioUseCase.executa(body, id_reservatorio);
  }
}
