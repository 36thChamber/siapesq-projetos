import Joi from "joi";
import { Op } from "sequelize";

import http_status from "../../consts/http-status-enum";
import Usuarios from "../../models/Usuarios";
import AuthServices from "../../services/auth-services";
import {
  AtualizarUsuarioBodyRequest,
  AtualizarUsuarioResponse,
  toUsuarioResponse,
} from "../../types/usuarios-types";

const update_usuario_schema = Joi.object({
  nome: Joi.string()
    .optional()
    .error(() => new Error("'nome' nao e uma string")),

  email: Joi.string()
    .email()
    .optional()
    .error(() => new Error("'email' nao e uma string ou um email valido")),

  telefone: Joi.string()
    .optional()
    .error(() => new Error("'telefone' nao e uma string")),

  ativo: Joi.boolean()
    .optional()
    .error(() => new Error("ativo invalido")),

  user_verify: Joi.boolean()
    .optional()
    .error(() => new Error("user_verify invalido")),

  senha: Joi.string()
    .optional()
    .error(() => new Error("'senha' nao e uma string")),

  antiga_senha: Joi.string()
    .optional()
    .error(() => new Error("'antiga_senha' nao e uma string")),

  documento: Joi.string()
    .optional()
    .error(() => new Error("'documento' nao e uma string")),
}).min(1);

export default class UpdateUsuarioUseCase {
  static async valida(body: AtualizarUsuarioBodyRequest) {
    try {
      await update_usuario_schema.validateAsync(body, { stripUnknown: true });
    } catch (err: any) {
      throw {
        message: err.message,
        status: http_status.BAD_REQUEST,
      };
    }
  }

  static async executa(
    body: AtualizarUsuarioBodyRequest,
    id_usuario: number | string
  ): Promise<AtualizarUsuarioResponse> {
    const usuario = await Usuarios.findByPk(id_usuario);

    if (!usuario) {
      throw {
        message: `Usuario(${id_usuario}) nao encontrado`,
        status: http_status.NOT_FOUND,
      };
    }

    const dadosAtualizacao: AtualizarUsuarioBodyRequest = { ...body };

    // Campos protegidos: nunca podem ser alterados via rota pública
    // is_admin    apenas via banco/seed
    // user_verify  apenas via confirmação de e-mail (GET /verificarEmail)
    delete (dadosAtualizacao as any).is_admin;
    delete (dadosAtualizacao as any).user_verify;
    if (dadosAtualizacao.senha) {
      if (!dadosAtualizacao.antiga_senha) {
        throw {
          message:
            "Quando o campo 'senha' for enviado o campo 'antiga_senha' tambem deve ser enviado",
          status: http_status.BAD_REQUEST,
        };
      }

      const antiga_senha_eh_valida = await AuthServices.compara_senha_com_hash(
        dadosAtualizacao.antiga_senha,
        usuario.senha
      );

      if (!antiga_senha_eh_valida) {
        throw {
          message: "'antiga_senha' esta incorreta",
          status: http_status.UNAUTHORIZED,
        };
      }

      dadosAtualizacao.senha = await AuthServices.hash_senha(
        dadosAtualizacao.senha
      );

      delete dadosAtualizacao.antiga_senha;
    }

    if (dadosAtualizacao.email) {
      const email_cadastrado = await Usuarios.findOne({
        where: {
          email: dadosAtualizacao.email,
          id: {
            [Op.ne]: id_usuario,
          },
        },
      });

      if (email_cadastrado) {
        throw {
          message: "Email ja cadastrado",
          status: http_status.CONFLICT,
        };
      }
    }

    if (dadosAtualizacao.documento) {
      const documento_cadastrado = await Usuarios.findOne({
        where: {
          documento: dadosAtualizacao.documento,
          id: {
            [Op.ne]: id_usuario,
          },
        },
      });

      if (documento_cadastrado) {
        throw {
          message: "Documento ja cadastrado",
          status: http_status.CONFLICT,
        };
      }
    }

    await usuario.update(dadosAtualizacao);

    return toUsuarioResponse(usuario);
  }
}
