import Joi from "joi";

import http_status from "../../consts/http-status-enum";
import Usuarios from "../../models/Usuarios";
import AuthServices from "../../services/auth-services";
import {
  CriarUsuarioBodyRequest,
  CriarUsuarioResponse,
  toUsuarioResponse,
} from "../../types/usuarios-types";

const create_body_schema = Joi.object({
  nome: Joi.string()
    .required()
    .error(() => new Error("Nome invalido")),

  email: Joi.string()
    .email()
    .required()
    .error(() => new Error("Email invalido")),

  senha: Joi.string()
    .required()
    .error(() => new Error("Senha invalida")),

  documento: Joi.string()
    .required()
    .error(() => new Error("Documento invalido")),

  telefone: Joi.string()
    .required()
    .error(() => new Error("Telefone invalido")),
});

export default class CriarUsuarioUseCase {
  static async valida(body: CriarUsuarioBodyRequest) {
    try {
      await create_body_schema.validateAsync(body, {
        stripUnknown: true,
      });
    } catch (err: any) {
      throw {
        message: err.message,
        status: http_status.BAD_REQUEST,
      };
    }
  }

  static async executa(
    body: CriarUsuarioBodyRequest
  ): Promise<CriarUsuarioResponse> {
    const {
      nome,
      email,
      senha,
      documento,
      telefone,
    } = body;

    const email_cadastrado = await Usuarios.findOne({
      where: { email },
    });

    if (email_cadastrado) {
      throw {
        message: `Usuario ${email} ja foi cadastrado`,
        status: http_status.CONFLICT,
      };
    }

    const documento_cadastrado = await Usuarios.findOne({
      where: { documento },
    });

    if (documento_cadastrado) {
      throw {
        message: `Documento ${documento} ja foi cadastrado`,
        status: http_status.CONFLICT,
      };
    }

    const usuario = await Usuarios.create({
      nome,
      email,
      senha: await AuthServices.hash_senha(senha),
      // ativo:false na criação: a resolução do merge de conflito (3a3c024) havia
      // trocado para true, reativando contas por padrão e anulando o gate de
      // aprovação implementado em bb63e96.
      ativo: false,
      user_verify: false,
      is_admin: false, // nunca pode ser definido via cadastro público
      telefone,
      documento,
    });

    const segredo = process.env.JWT_SECRET;

    if (!segredo) {
      throw {
        message: "JWT_SECRET nao setado",
        status: http_status.INTERNAL_ERROR,
      };
    }

    const token = AuthServices.gera_jwt_token(
      { id: usuario.id },
      segredo
    );

    return {
      ...toUsuarioResponse(usuario),
      token,
    };
  }
}
