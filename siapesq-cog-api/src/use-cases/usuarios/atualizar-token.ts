import Joi from "joi";

import httpStatus from "../../consts/http-status-enum";

import Usuarios from "../../models/Usuarios";
import AuthServices from "../../services/auth-services";

import {
  UsuarioLoginResponse,
  toUsuarioResponse,
} from "../../types/usuarios-types";

export type RefreshTokenParamsRequest = {
  id_usuario: string;
};

export default class RefreshTokenUseCase {
  static async valida(params: RefreshTokenParamsRequest): Promise<void> {
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
    params: RefreshTokenParamsRequest
  ): Promise<UsuarioLoginResponse> {
    await this.valida(params);

    const usuario = await Usuarios.findByPk(params.id_usuario);

    if (!usuario) {
      throw {
        status: httpStatus.NOT_FOUND,
        message: "Usuário não encontrado",
      };
    }

    const segredo = process.env.JWT_SECRET;

    if (!segredo) {
      throw {
        status: httpStatus.INTERNAL_ERROR,
        message: "JWT_SECRET não configurado",
      };
    }

    const token = AuthServices.gera_jwt_token(
      {
        id: usuario.id_usuario,
        tipo_usuario: usuario.tipo_usuario,
        passwordVersion: AuthServices.versao_senha_sessao(usuario.senha, segredo),
      },
      segredo
    );

    await usuario.update({
      ultimo_acesso: new Date(),
    });

    return {
      ...toUsuarioResponse(usuario),
      token,
    };
  }
}
