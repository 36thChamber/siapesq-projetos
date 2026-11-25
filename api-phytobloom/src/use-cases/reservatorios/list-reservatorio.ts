import Joi from "joi";

import http_status from "../../consts/http-status-enum";
import Reservatorios from "../../models/Reservatorios";
import AreasAlertas from "../../models/AreasAlertas";
import {
  ListarReservatoriosQueryRequest,
  ListarReservatoriosResponse,
  toReservatorioResponse,
} from "../../types/reservatorios-types";

const req_query_schema = Joi.object({
  limit: Joi.number()
    .integer()
    .min(1)
    .default(10000)
    .error(() => new Error("limit invalido")),

  offset: Joi.number()
    .integer()
    .min(0)
    .default(0)
    .error(() => new Error("offset invalido")),

  id_usuario: Joi.number()
    .integer()
    .optional()
    .error(() => new Error("id_usuario invalido")),

  favorito: Joi.boolean()
    .optional()
    .error(() => new Error("favorito invalido")),
});

export default class ListaReservatorioUseCase {
  static async valida(query: ListarReservatoriosQueryRequest) {
    try {
      await req_query_schema.validateAsync(query);
    } catch (err: any) {
      throw { message: err.message, status: http_status.BAD_REQUEST };
    }
  }

  static async executa(
    query: ListarReservatoriosQueryRequest
  ): Promise<ListarReservatoriosResponse> {
    const {
      limit = 10000,
      offset = 0,
      id_usuario,
      favorito,
    } = query;

    const where: any = {};

    if (id_usuario !== undefined) {
      where.id_usuario = id_usuario;
    }

    if (favorito !== undefined) {
      where.favorito = favorito;
    }

    const { rows, count } = await Reservatorios.findAndCountAll({
      where,
      limit,
      offset,
      // separate: true evita que o JOIN com "areas" (hasMany) duplique linhas
      // de reservatorio antes do LIMIT/OFFSET, o que reduziria incorretamente
      // a página e poderia truncar as áreas do último reservatório da página.
      include: [{ model: AreasAlertas, as: "areas", separate: true }],
      order: [
        ["id_usuario", "ASC"],
        ["prioridade", "ASC"],
        ["id", "ASC"],
      ],
    });

    return {
      reservatorios: rows.map(toReservatorioResponse),
      total: count,
    };
  }
}