import Joi from "joi";
import http_status from "../../consts/http-status-enum";
import UsuariosAtivos from "../../models/UsuariosAtivos";
import {
  DeletarUsuarioAtivoParamsRequest,
  DeletarUsuarioAtivoResponse,
  toUsuarioAtivoResponse,
} from "../../types/usuarios-ativos-types";
import { AppError } from "../../errors/app-error";

const req_params_schema = Joi.object({
  id: Joi.number().required().error(() => new Error("id inválido")),
});

export default class DeletarUsuarioAtivoUseCase {
  static async valida(params: DeletarUsuarioAtivoParamsRequest) {
    try {
      await req_params_schema.validateAsync(params);
    } catch (err: any) {
      throw new AppError(http_status.BAD_REQUEST, 'VALIDATION_ERROR', err.message);
    }
  }

  static async executa(
    params: DeletarUsuarioAtivoParamsRequest,
  ): Promise<DeletarUsuarioAtivoResponse> {
    const usuarioAtivo = await UsuariosAtivos.findByPk(params.id);

    if (!usuarioAtivo) {
      throw new AppError(http_status.NOT_FOUND, 'NOT_FOUND', `Usuário ativo ${params.id} não encontrado`);
    }

    await usuarioAtivo.destroy();

    return toUsuarioAtivoResponse(usuarioAtivo);
  }
}