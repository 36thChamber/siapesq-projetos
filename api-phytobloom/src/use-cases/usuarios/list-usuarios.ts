import Joi from "joi";

import http_status from "../../consts/http-status-enum";
import Usuarios from "../../models/Usuarios";
import {
  ListarUsuariosQueryRequest,
  ListarUsuariosResponse,
  toUsuarioResponse,
} from "../../types/usuarios-types";

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

  ativo: Joi.boolean()
    .optional()
    .error(() => new Error("ativo invalido")),

  user_verify: Joi.boolean()
    .optional()
    .error(() => new Error("user_verify invalido")),
});

export default class ListandoUsuarios {
  static async valida(query: ListarUsuariosQueryRequest) {
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
    query: ListarUsuariosQueryRequest
  ): Promise<ListarUsuariosResponse> {
    const {
      limit = 10000,
      offset = 0,
      ativo,
      user_verify,
    } = query;

    const where: any = {};

    if (ativo !== undefined) {
      where.ativo = ativo;
    }

    if (user_verify !== undefined) {
      where.user_verify = user_verify;
    }

    const { rows, count } = await Usuarios.findAndCountAll({
      where,
      attributes: {
        exclude: ["senha"],
      },
      limit,
      offset,
      order: [["id", "ASC"]],
    });

    return {
      usuarios: rows.map(toUsuarioResponse),
      total: count,
    };
  }
}