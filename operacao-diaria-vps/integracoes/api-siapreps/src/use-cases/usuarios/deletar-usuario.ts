import httpStatus from "../../consts/http-status-enum";
import Usuarios from "../../models/Usuarios";
import {
  DeletarUsuarioResponse,
  toUsuarioResponse,
} from "../../types/usuarios-types";
import { AppError } from "../../errors/app-error";

export default class DeletarUsuarioUseCase {
  static async executa(
    id_usuario: number | string
  ): Promise<DeletarUsuarioResponse> {
    const usuario = await Usuarios.findByPk(id_usuario);

    if (!usuario) {
      throw new AppError(httpStatus.NOT_FOUND, 'NOT_FOUND', `Usuario(${id_usuario}) nao encontrado`);
    }

    await usuario.update({
      ativo: false,
      deletado_em: new Date(),
    });

    return toUsuarioResponse(usuario);
  }
}