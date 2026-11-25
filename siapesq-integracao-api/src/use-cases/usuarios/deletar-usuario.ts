import Joi from "joi";

import httpStatus from "../../consts/http-status-enum";
import Usuarios from "../../models/Usuarios";

import {
  DeletarUsuarioParamsRequest,
  DeletarUsuarioResponse,
  toUsuarioResponse,
} from "../../types/usuarios-types";

export default class DeletarUsuarioUseCase {
  static async valida(params: DeletarUsuarioParamsRequest): Promise<void> {
    const schema = Joi.object({
      id_usuario: Joi.string().uuid().required(),
    });

    try {
      await schema.validateAsync(params);
    } catch (err: any) {
      throw { message: err.message, status: httpStatus.BAD_REQUEST };
    }
  }

  static async executa(params: DeletarUsuarioParamsRequest): Promise<DeletarUsuarioResponse> {
    await this.valida(params);

    const usuario = await Usuarios.findByPk(params.id_usuario);

    if (!usuario) {
      throw {
        message: "Usuário não encontrado.",
        status: httpStatus.NOT_FOUND,
      };
    }

    const response = toUsuarioResponse(usuario);

    await usuario.destroy();

    return response;
  }
}