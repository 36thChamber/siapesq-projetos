import Reservatorios from "../../models/Reservatorios";
import Usuarios from "../../models/Usuarios";

import {
  GetUsuarioResponse,
  toUsuarioResponse,
} from "../../types/usuarios-types";
import { toReservatorioResponse } from "../../types/reservatorios-types";

export default class GetUsuarioUseCase {
  static async executa(
    id_usuario: number | string
  ): Promise<GetUsuarioResponse> {

    const usuario = await Usuarios.findByPk(id_usuario);

    if (!usuario) {
      throw {
        message: `Usuario(${id_usuario}) nao encontrado`,
        status: 404,
      };
    }

    const reservatorios = await Reservatorios.findAll({
      where: { id_usuario },
      order: [
        ["prioridade", "ASC"],
        ["id", "ASC"],
      ],
    });

    return {
      ...toUsuarioResponse(usuario),
      reservatorios: reservatorios.map(toReservatorioResponse),
    };
  }
}