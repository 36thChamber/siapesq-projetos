import Joi from "joi";
import { JsonWebTokenError, TokenExpiredError } from "jsonwebtoken";

import httpStatus from "../../consts/http-status-enum";

import Usuarios from "../../models/Usuarios";
import EmailService from "../../services/verificar-email-services";
import AuthService from "../../services/auth-services";

export type ResetPasswordBodyRequest = {
  token: string;
  novaSenha: string;
};

export default class ResetPasswordUseCase {
  private static emailService: EmailService = new EmailService();

  static async valida(body: ResetPasswordBodyRequest): Promise<void> {
    const schema = Joi.object({
      token: Joi.string().required(),
      novaSenha: Joi.string().min(6).required(),
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

  static async executa(body: ResetPasswordBodyRequest): Promise<void> {
    await this.valida(body);

    const segredo = process.env.JWT_SECRET;
    if (!segredo) {
      throw { message: "JWT_SECRET não configurado.", status: httpStatus.INTERNAL_ERROR };
    }

    let payload: ReturnType<typeof AuthService.decoda_jwt_token>;

    try {
      payload = AuthService.decoda_jwt_token(
        body.token,
        AuthService.segredo_recuperacao_senha(segredo),
      );
    } catch (err) {
      if (err instanceof TokenExpiredError) {
        throw {
          message: "O link de redefinição de senha expirou. Por favor, solicite um novo.",
          status: httpStatus.UNAUTHORIZED,
        };
      }

      if (err instanceof JsonWebTokenError) {
        throw {
          message: "Token de redefinição inválido.",
          status: httpStatus.UNAUTHORIZED,
        };
      }

      throw {
        message: "Erro ao processar o token de redefinição.",
        status: httpStatus.INTERNAL_ERROR,
      };
    }

    if (payload.purpose !== "password_reset" || !payload.id ||
        !payload.email || !payload.passwordVersion) {
      throw { message: "Token de redefinição inválido.", status: httpStatus.UNAUTHORIZED };
    }

    const usuario = await Usuarios.findByPk(payload.id);

    if (!usuario) {
      throw {
        message: "Usuário não encontrado.",
        status: httpStatus.NOT_FOUND,
      };
    }

    if (usuario.email !== payload.email ||
        AuthService.versao_senha_recuperacao(usuario.senha, segredo) !== payload.passwordVersion) {
      throw { message: "Token de redefinição inválido ou já utilizado.", status: httpStatus.UNAUTHORIZED };
    }

    const novaSenhaHash = await AuthService.hash_senha(body.novaSenha);
    const [alterados] = await Usuarios.update(
      { senha: novaSenhaHash },
      { where: { id_usuario: usuario.id_usuario, senha: usuario.senha } },
    );
    if (alterados !== 1) {
      throw { message: "Token de redefinição inválido ou já utilizado.", status: httpStatus.UNAUTHORIZED };
    }

    try {
      await ResetPasswordUseCase.emailService.sendPasswordChangedConfirmation(
        usuario.email,
        usuario.nome,
      );
    } catch {
      // A senha já foi persistida; a falha do aviso não reverte a operação.
    }
  }
}
