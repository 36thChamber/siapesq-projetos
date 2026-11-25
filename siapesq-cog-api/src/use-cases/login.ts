import Joi from "joi";

import httpStatus from "../consts/http-status-enum";

import Usuarios from "../models/Usuarios";
import AuthServices from "../services/auth-services";

import {
  UsuarioLoginBodyRequest,
  UsuarioLoginResponse,
  toUsuarioResponse,
} from "../types/usuarios-types";

export default class LoginUseCase {
  static async valida(
    body: UsuarioLoginBodyRequest
  ): Promise<void> {
    const schema = Joi.object({
      email: Joi.string().email().required(),
      senha: Joi.string().required(),
    });

    try {
      await schema.validateAsync(body);
    } catch (err: any) {
      throw {
        message: err.message,
        status: httpStatus.BAD_REQUEST,
      };
    }
  }

  static async executa(
    body: UsuarioLoginBodyRequest
  ): Promise<UsuarioLoginResponse> {
    try {
      await this.valida(body);

      const usuario = await Usuarios.findOne({
        where: {
          email: body.email,
        },
      });

      if (!usuario) {
        throw {
          message: `Usuário ${body.email} não encontrado`,
          status: httpStatus.NOT_FOUND,
        };
      }

      const senhaValida = await AuthServices.compara_senha_com_hash(
        body.senha,
        usuario.senha
      );

      if (!senhaValida) {
        throw {
          message: "Senha incorreta",
          status: httpStatus.UNAUTHORIZED,
        };
      }

      if (!usuario.email_verificado) {
        throw {
          status: httpStatus.FORBIDDEN,
          code: "EMAIL_NAO_VERIFICADO",
          message: "Verifique seu e-mail antes de acessar o sistema.",
        };
      }

      const jwtSecret = process.env.JWT_SECRET;

      if (!jwtSecret) {
        throw {
          message: "JWT_SECRET não foi setada",
          status: httpStatus.INTERNAL_ERROR,
        };
      }

      const token = AuthServices.gera_jwt_token(
        {
          id: usuario.id_usuario,
          tipo_usuario: usuario.tipo_usuario,
          passwordVersion: AuthServices.versao_senha_sessao(usuario.senha, jwtSecret),
        },
        jwtSecret
      );

      return {
        ...toUsuarioResponse(usuario),
        token,
      };
    } catch (err: any) {
      throw {
        message: err.message,
        status: err.status ?? httpStatus.INTERNAL_ERROR,
        ...(err.code ? { code: err.code } : {}),
      };
    }
  }
}
