import Joi from "joi";

import http_status from "../../consts/http-status-enum";
import Reservatorios from "../../models/Reservatorios";
import Usuarios from "../../models/Usuarios";
import {
  ListarReservatoriosPorUsuarioQueryRequest,
  ListarReservatoriosQueryRequest,
  ListarReservatoriosResponse,
  toReservatorioResponse,
} from "../../types/reservatorios-types";

const req_query_schema = Joi.object({
  id_usuario: Joi.number()
    .required()
    .error(() => new Error("id do usuario invalido")),

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
});

export default class ListaReservatoriosPorUsuarioUseCase {
  static async valida(
    query: ListarReservatoriosPorUsuarioQueryRequest
  ) {
    try {
      await req_query_schema.validateAsync(query);
    } catch (err: any) {
      throw {
        message: err.message,
        status: http_status.BAD_REQUEST,
      };
    }
  }

  static async executa(
    query: ListarReservatoriosPorUsuarioQueryRequest
  ): Promise<ListarReservatoriosResponse> {
    const {
      id_usuario,
      limit = 10000,
      offset = 0,
    } = query;

    const usuario = await Usuarios.findByPk(id_usuario);

    if (!usuario) {
      throw {
        message: `Usuario (${id_usuario}) nao encontrado`,
        status: http_status.NOT_FOUND,
      };
    }

    const { rows, count } = await Reservatorios.findAndCountAll({
      where: {
        id_usuario,
      },
      limit,
      offset,
      order: [
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