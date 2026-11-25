import Joi from "joi";

import httpStatus from "../../consts/http-status-enum";

import Usuarios from "../../models/Usuarios";

import {
  BuscarUsuarioPorIdParamsRequest,
  BuscarUsuarioPorIdResponse,
  toUsuarioResponse,
} from "../../types/usuarios-types";

import { TipoUsuario } from '../../models/enums/tipoUsuarioEnum';

export default class BuscarUsuarioPorIdUseCase {
  static async valida(params: BuscarUsuarioPorIdParamsRequest): Promise<void> {
    const schema = Joi.object({
      id_usuario: Joi.string().uuid().required(),
    });

    try {
      await schema.validateAsync(params);
    } catch (err: any) {
      throw {
        message: err.message,
        status: httpStatus.BAD_REQUEST,
      };
    }
  }

  static async executa(
    params: BuscarUsuarioPorIdParamsRequest,
    idUsuarioAutenticado: string
  ): Promise<BuscarUsuarioPorIdResponse> {
    await this.valida(params);

    if (params.id_usuario !== idUsuarioAutenticado) {
      const usuarioAutenticado = await Usuarios.findByPk(idUsuarioAutenticado, {
        attributes: ['tipo_usuario'],
      });

      if (
        !usuarioAutenticado ||
        usuarioAutenticado.tipo_usuario !== TipoUsuario.ADMIN
      ) {
        throw {
          message: 'Você não tem permissão para acessar este usuário.',
          status: httpStatus.FORBIDDEN,
        };
      }
    }

    const usuario = await Usuarios.findByPk(params.id_usuario);

    if (!usuario) {
      throw {
        message: "Usuário não encontrado.",
        status: httpStatus.NOT_FOUND,
      };
    }

    return toUsuarioResponse(usuario);
  }
}
