import Joi from "joi";
import httpStatus from "../../consts/http-status-enum";
import { AppError } from "../../errors/app-error";
import Usuarios from "../../models/Usuarios";
import { toUsuarioResponse } from "../../types/usuarios-types";

const atualizarStatusUsuarioSchema = Joi.object({
  ativo: Joi.boolean().strict().required().messages({
    "any.required": "Informe o campo ativo",
    "boolean.base": "ativo deve ser verdadeiro ou falso",
  }).required(),
}).required();

export default class AtualizarStatusUsuarioUseCase {
  static async valida(body: { ativo?: boolean }) {
    try {
      await atualizarStatusUsuarioSchema.validateAsync(body);
    } catch (err: any) {
      throw new AppError(httpStatus.BAD_REQUEST, "VALIDATION_ERROR", err.message);
    }
  }

  static async executa(idUsuario: number | string, ativo: boolean) {
    const usuario = await Usuarios.findByPk(idUsuario);
    if (!usuario) {
      throw new AppError(httpStatus.NOT_FOUND, "NOT_FOUND", `Usuario(${idUsuario}) nao encontrado`);
    }

    await usuario.update({ ativo });
    return toUsuarioResponse(usuario);
  }
}
