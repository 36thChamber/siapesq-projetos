import http_status from "../../consts/http-status-enum";
import UsuariosAtivos from "../../models/UsuariosAtivos";
import {
  BuscarUsuarioAtivoPorIdResponse,
  toUsuarioAtivoResponse,
} from "../../types/usuarios-ativos-types";
import { AppError } from "../../errors/app-error";

export default class BuscarUsuarioAtivoPorIdUseCase {
  static async executa(
    id_usuario: number,
  ): Promise<BuscarUsuarioAtivoPorIdResponse> {
    const usuarioAtivo = await UsuariosAtivos.findOne({
      where: {
        id_usuario,
      },
    });

    if (!usuarioAtivo) {
      throw new AppError(http_status.NOT_FOUND, 'NOT_FOUND', `Nenhum usuário ativo encontrado para o usuário ${id_usuario}`);
    }

    return toUsuarioAtivoResponse(usuarioAtivo);
  }
}