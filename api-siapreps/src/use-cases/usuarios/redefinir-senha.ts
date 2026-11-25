import crypto from "crypto";
import Joi from "joi";
import httpStatus from "../../consts/http-status-enum";
import RecuperacoesSenha from "../../models/RecuperacoesSenha";
import Usuarios from "../../models/Usuarios";
import AuthServices from "../../services/auth-services";
import { AppError } from "../../errors/app-error";

const schema = Joi.object({
  token: Joi.string().required(),
  senha: Joi.string().min(6).required().messages({
    "any.required": "Senha e obrigatoria",
    "string.min": "Senha deve ter pelo menos 6 caracteres",
  }),
});

export default class RedefinirSenhaUseCase {
  static async executa(body: { token: string; senha: string }) {
    try {
      await schema.validateAsync(body);
    } catch (err: any) {
      throw new AppError(httpStatus.BAD_REQUEST, 'VALIDATION_ERROR', err.message);
    }

    const tokenHash = crypto.createHash("sha256").update(body.token).digest("hex");
    const sequelize = RecuperacoesSenha.sequelize;
    if (!sequelize) {
      throw new AppError(
        httpStatus.INTERNAL_ERROR,
        "PASSWORD_RESET_STORAGE_ERROR",
        "Recuperacao de senha indisponivel",
      );
    }

    await sequelize.transaction(async (transaction) => {
      const recuperacao = await RecuperacoesSenha.findOne({
        where: { token_hash: tokenHash, utilizado_em: null },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!recuperacao || recuperacao.expira_em.getTime() < Date.now()) {
        throw new AppError(httpStatus.UNAUTHORIZED, 'INVALID_TOKEN', "Token de recuperacao invalido ou expirado");
      }

      const usuario = await Usuarios.findByPk(recuperacao.id_usuario, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!usuario) {
        throw new AppError(httpStatus.NOT_FOUND, 'NOT_FOUND', "Usuario nao encontrado");
      }

      await usuario.update(
        { senha: await AuthServices.hash_senha(body.senha) },
        { transaction },
      );
      await recuperacao.update({ utilizado_em: new Date() }, { transaction });
      await RecuperacoesSenha.destroy({
        where: { id_usuario: usuario.id, utilizado_em: null },
        transaction,
      });
    });
  }
}
