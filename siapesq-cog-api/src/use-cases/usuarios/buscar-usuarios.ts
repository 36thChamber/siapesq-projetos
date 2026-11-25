import Joi from "joi";

import httpStatus from "../../consts/http-status-enum";
import Usuarios from "../../models/Usuarios";

import {
  ListarUsuariosQueryRequest,
  ListarUsuariosResponse,
  toUsuarioResponse,
} from "../../types/usuarios-types";

export default class ListarUsuariosUseCase {
  static async valida(query: ListarUsuariosQueryRequest): Promise<void> {
    const schema = Joi.object({
      limit: Joi.number().integer().min(0).default(10),
      offset: Joi.number().integer().min(0).default(0),
    });

    try {
      await schema.validateAsync(query);
    } catch (err: any) {
      throw { message: err.message, status: httpStatus.BAD_REQUEST };
    }
  }

  static async executa(query: ListarUsuariosQueryRequest): Promise<ListarUsuariosResponse> {
    await this.valida(query);

    const { rows, count } = await Usuarios.findAndCountAll({
      limit: query.limit ?? 10,
      offset: query.offset ?? 0,
    });

    return {
      usuarios: rows.map(toUsuarioResponse),
      total: count,
    };
  }
}