import Joi from "joi";
import { JsonWebTokenError, TokenExpiredError } from "jsonwebtoken";

import httpStatus from "../../consts/http-status-enum";
import Usuarios from "../../models/Usuarios";
import AuthServices from "../../services/auth-services";

export type ConfirmarEmailBodyRequest = {
  token: string;
};

export default class ConfirmarEmailUseCase {
  static async valida(body: ConfirmarEmailBodyRequest): Promise<void> {
    const schema = Joi.object({
      token: Joi.string().required(),
    });

    try {
      await schema.validateAsync(body);
    } catch (err: any) {
      throw { message: err.message, status: httpStatus.BAD_REQUEST };
    }
  }

  static async executa(body: ConfirmarEmailBodyRequest): Promise<void> {
    await this.valida(body);

    const segredo = process.env.JWT_SECRET;

    if (!segredo) {
      throw {
        message: "Erro de configuração: JWT_SECRET não está definido.",
        status: httpStatus.INTERNAL_ERROR,
      };
    }

    try {
      const payload = AuthServices.decoda_jwt_token(
        body.token,
        AuthServices.segredo_verificacao_email(segredo),
      );

      if (payload.purpose !== "email_verification" || !payload.email || !payload.id) {
        throw {
          status: httpStatus.UNAUTHORIZED,
          message: "Token de verificação inválido.",
        };
      }

      const usuario = await Usuarios.findByPk(payload.id);

      if (!usuario) {
        throw {
          status: httpStatus.NOT_FOUND,
          message: "Usuário não encontrado.",
        };
      }

      if (usuario.email !== payload.email) {
        throw {
          status: httpStatus.UNAUTHORIZED,
          message: "Token de verificação inválido ou expirado.",
        };
      }

      // Idempotente: se já está verificado, nada a fazer.
      if (usuario.email_verificado) {
        return;
      }

      await usuario.update({
        email_verificado: true,
      });
    } catch (err: any) {
      if (err instanceof TokenExpiredError) {
        throw {
          status: httpStatus.UNAUTHORIZED,
          code: "EMAIL_TOKEN_EXPIRED",
          message: "O link de verificação expirou. Por favor, solicite o reenvio.",
        };
      }

      if (err instanceof JsonWebTokenError) {
        throw {
          status: httpStatus.UNAUTHORIZED,
          message: "Token de verificação inválido ou malformado.",
        };
      }

      throw err;
    }
  }
}
