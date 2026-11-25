import Joi from "joi";
import http_status from "../../consts/http-status-enum";
import Usuarios from "../../models/Usuarios";
import UsuariosAtivos from "../../models/UsuariosAtivos";
import {
  CriarUsuarioAtivoBodyRequest,
  CriarUsuarioAtivoResponse,
  toUsuarioAtivoResponse,
} from "../../types/usuarios-ativos-types";
import { AppError } from "../../errors/app-error";

const create_body_schema = Joi.object({
  id_usuario: Joi.number().required().error(() => new Error("id_usuario inválido")),

  tipo_assinatura: Joi.string()
    .required()
    .error(() => new Error("Tipo de assinatura inválida")),

  ativo: Joi.boolean().default(true).error(() => new Error("Modo ativo inválido")),

  data_criacao: Joi.date().default(() => new Date()).error(() => new Error("data_criacao inválida")),

  data_fim: Joi.date().allow(null).error(() => new Error("data_fim inválida")),
});

export default class CriarUsuarioAtivoUseCase {
  static async valida(body: CriarUsuarioAtivoBodyRequest) {
    try {
      await create_body_schema.validateAsync(body);
    } catch (err: any) {
      throw new AppError(http_status.BAD_REQUEST, 'VALIDATION_ERROR', err.message);
    }
  }

  static async executa(
    body: CriarUsuarioAtivoBodyRequest,
  ): Promise<CriarUsuarioAtivoResponse> {
    const {
      id_usuario,
      tipo_assinatura,
      ativo = true,
      data_criacao = new Date(),
      data_fim = null,
    } = body;

    const usuarioExiste = await Usuarios.findByPk(id_usuario);

    if (!usuarioExiste) {
      throw new AppError(http_status.NOT_FOUND, 'NOT_FOUND', `Usuário ${id_usuario} não foi encontrado`);
    }

    const usuarioAtivoExistente = await UsuariosAtivos.findOne({
      where: { id_usuario },
    });

    if (usuarioAtivoExistente) {
      throw new AppError(http_status.CONFLICT, 'DUPLICATE_ENTRY', `Usuário ${id_usuario} já possui registro ativo`);
    }

    const usuarioAtivo = await UsuariosAtivos.create({
      id_usuario,
      tipo_assinatura,
      ativo,
      data_criacao,
      data_fim,
    });

    return toUsuarioAtivoResponse(usuarioAtivo);
  }
}