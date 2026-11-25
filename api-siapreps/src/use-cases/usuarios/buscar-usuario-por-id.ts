import httpStatus from "../../consts/http-status-enum";
import Usuarios from "../../models/Usuarios";
import {
  BuscarUsuarioPorIdResponse,
  toUsuarioResponse,
} from "../../types/usuarios-types";
import { AppError } from "../../errors/app-error";

export default class BuscarUsuarioPorIdUseCase {
  static async executa(
    id_usuario: number | string
  ): Promise<BuscarUsuarioPorIdResponse> {

    const usuario = await Usuarios.findByPk(id_usuario);

    if (!usuario) {
      throw new AppError(httpStatus.NOT_FOUND, 'NOT_FOUND', `Usuario(${id_usuario}) nao encontrado`);
    }

    return {
      ...toUsuarioResponse(usuario),
      embarcacoes: [],
    };
  }
}