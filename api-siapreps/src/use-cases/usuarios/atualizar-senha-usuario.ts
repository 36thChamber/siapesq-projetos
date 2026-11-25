import Joi from "joi";
import http_status from "../../consts/http-status-enum";
import Usuarios from "../../models/Usuarios";
import AuthServices from "../../services/auth-services";
import {
  AtualizarUsuarioBodyRequest,
  AtualizarUsuarioResponse,
  toUsuarioResponse,
} from "../../types/usuarios-types";
import { AppError } from "../../errors/app-error";

const update_usuario_schema = Joi.object({
  senha: Joi.string()
    .min(6)
    .required()
    .messages({
      "any.required": "Senha é obrigatória",
      "string.empty": "Senha não pode ser vazia",
      "string.min": "Senha deve ter pelo menos 6 caracteres",
      "string.base": "'senha' não é uma string",
    }),
});

export default class AtualizarSenhaUsuarioUseCase {
  static async valida(body: AtualizarUsuarioBodyRequest) {
    try {
      await update_usuario_schema.validateAsync(body);
    } catch (err: any) {
      throw new AppError(
        http_status.BAD_REQUEST,
        "VALIDATION_ERROR",
        err.message
      );
    }
  }

  static async executa(id: number, body: AtualizarUsuarioBodyRequest) {
    if (!body.senha) {
      throw new AppError(
        http_status.BAD_REQUEST,
        "VALIDATION_ERROR",
        "Senha é obrigatória"
      );
    }

    const hashedPassword = await AuthServices.hash_senha(body.senha);
    const usuario = await Usuarios.update(
      { senha: hashedPassword },
      {
        where: { id },
        returning: true,
      }
    );

    if (!usuario[0]) {
      throw new AppError(
        http_status.NOT_FOUND,
        "NOT_FOUND",
        "Usuário não encontrado"
      );
    }

    return toUsuarioResponse(usuario[1][0]);
  }
}
