import Joi from "joi";
import http_status from "../../consts/http-status-enum";
import Usuarios from "../../models/Usuarios";
import {
  ListarUsuariosQueryRequest,
  ListarUsuariosResponse,
  toUsuarioResponse,
} from "../../types/usuarios-types";
import { AppError } from "../../errors/app-error";

const req_query_schema = Joi.object({
  limit: Joi.number()
    .default(10)
    .error(() => new Error("limit inválido")),

  offset: Joi.number()
    .default(0)
    .error(() => new Error("offset inválido")),
});

export default class BuscarUsuariosUseCase {
  static async valida(query: ListarUsuariosQueryRequest) {
    try {
      await req_query_schema.validateAsync(query);
    } catch (err: any) {
      throw new AppError(http_status.BAD_REQUEST, 'VALIDATION_ERROR', err.message);
    }
  }

  static async executa(
    query: ListarUsuariosQueryRequest,
  ): Promise<ListarUsuariosResponse> {
    const { limit = 10, offset = 0 } = query;

    const { rows, count } = await Usuarios.findAndCountAll({
      limit,
      offset,
      order: [["id", "DESC"]],
    });

    return {
      usuarios: rows.map(toUsuarioResponse),
      total: count,
    };
  }
}