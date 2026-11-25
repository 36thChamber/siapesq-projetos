import Joi from "joi";

import http_status from "../consts/http-status-enum";
import Usuarios from "../models/Usuarios";
import AuthServices from "../services/auth-services";
import {
  UsuarioLoginBodyRequest,
  UsuarioLoginResponse,
  toUsuarioResponse,
} from "../types/usuarios-types";

const login_body_schema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .error(() => new Error("email invalido")),

  senha: Joi.string()
    .required()
    .error(() => new Error("senha invalida")),
});

export default class LoginUseCase {
  static async valida(body: UsuarioLoginBodyRequest) {
    try {
      await login_body_schema.validateAsync(body);
    } catch (err: any) {
      throw {
        message: err.message,
        status: http_status.BAD_REQUEST,
      };
    }
  }

  static async executa(
    body: UsuarioLoginBodyRequest
  ): Promise<UsuarioLoginResponse> {
    const { email, senha } = body;

    const usuario = await Usuarios.findOne({
      where: { email },
    });

    if (!usuario) {
      throw {
        message: `Usuario ${email} nao encontrado`,
        status: http_status.NOT_FOUND,
      };
    }

    const senha_valida = await AuthServices.compara_senha_com_hash(
      senha,
      usuario.senha
    );

    if (!senha_valida) {
      throw {
        message: "Senha incorreta",
        status: http_status.UNAUTHORIZED,
      };
    }

    const jwt_secret = process.env.JWT_SECRET;

    if (!jwt_secret) {
      throw {
        message: "JWT_SECRET nao foi setada",
        status: http_status.INTERNAL_ERROR,
      };
    }

    const token = AuthServices.gera_jwt_token(
      { id: usuario.id },
      jwt_secret
    );

    return {
      ...toUsuarioResponse(usuario),
      token,
    };
  }
}