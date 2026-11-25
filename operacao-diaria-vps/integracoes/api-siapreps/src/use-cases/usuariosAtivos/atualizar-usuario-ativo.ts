import Joi from "joi";
import http_status from "../../consts/http-status-enum";
import UsuariosAtivos from "../../models/UsuariosAtivos";
import {
  AtualizarUsuarioAtivoBodyRequest,
  AtualizarUsuarioAtivoResponse,
  toUsuarioAtivoResponse,
} from "../../types/usuarios-ativos-types";
import { AppError } from "../../errors/app-error";

const updateUsuarioAtivoSchema = Joi.object({
  id_usuario: Joi.number().required().messages({
    "any.required": "ID do usuário é obrigatório",
    "number.base": "ID do usuário inválido",
  }),
  ativo: Joi.boolean().messages({
    "boolean.base": "Valor errado para ativo",
  }),
  data_fim: Joi.date().allow(null).messages({
    "date.base": "data_fim não é válida",
  }),
  data_criacao: Joi.date().messages({
    "date.base": "data_criacao não é válida",
  }),
  tipo_assinatura: Joi.string().messages({
    "string.base": "'tipo_assinatura' não é uma string",
  }),
})
  .min(2)
  .messages({
    "object.min": "Informe ao menos um campo para atualizar",
  });

export default class AtualizarUsuarioAtivoUseCase {
  static async valida(body: AtualizarUsuarioAtivoBodyRequest) {
    try {
      await updateUsuarioAtivoSchema.validateAsync(body);
    } catch (err: any) {
      throw new AppError(http_status.BAD_REQUEST, 'VALIDATION_ERROR', err.message);
    }
  }

  static async executa(
    body: AtualizarUsuarioAtivoBodyRequest,
  ): Promise<AtualizarUsuarioAtivoResponse> {
    const { id_usuario, ...dadosAtualizacao } = body;

    const usuarioAtivo = await UsuariosAtivos.findOne({
      where: { id_usuario },
    });

    if (!usuarioAtivo) {
      throw new AppError(http_status.NOT_FOUND, 'NOT_FOUND', `Usuário ativo do usuário ${id_usuario} não encontrado`);
    }

    await usuarioAtivo.update(dadosAtualizacao);

    return toUsuarioAtivoResponse(usuarioAtivo);
  }
}