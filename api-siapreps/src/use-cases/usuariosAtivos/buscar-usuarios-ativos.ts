import Joi from "joi";
import http_status from "../../consts/http-status-enum";
import UsuariosAtivos from "../../models/UsuariosAtivos";
import {
  ListarUsuariosAtivosQueryRequest,
  ListarUsuariosAtivosResponse,
  toUsuarioAtivoResponse,
} from "../../types/usuarios-ativos-types";
import { AppError } from "../../errors/app-error";

const req_query_schema = Joi.object({
  limit: Joi.number()
    .default(10)
    .error(() => new Error("limit inválido")),

  offset: Joi.number()
    .default(0)
    .error(() => new Error("offset inválido")),
});

export default class ListarUsuariosAtivosUseCase {
  static async valida(query: ListarUsuariosAtivosQueryRequest) {
    try {
      await req_query_schema.validateAsync(query);
    } catch (err: any) {
      throw new AppError(http_status.BAD_REQUEST, 'VALIDATION_ERROR', err.message);
    }
  }

  static async executa(
    query: ListarUsuariosAtivosQueryRequest,
  ): Promise<ListarUsuariosAtivosResponse> {
    const { limit = 10, offset = 0 } = query;

    const { rows, count } = await UsuariosAtivos.findAndCountAll({
      limit,
      offset,
      order: [["id", "DESC"]],
    });

    return {
      usuariosAtivos: rows.map(toUsuarioAtivoResponse),
      total: count,
    };
  }
}