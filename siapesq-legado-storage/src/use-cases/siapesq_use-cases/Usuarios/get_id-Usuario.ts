import http_status from "../../../consts/http-status-enum";
import usuarios from "../../../models/siapesq/Usuarios";
import { GetUsuarioResponse } from "../../../types/siapesq_types/Usuarios-types";

export default class BuscarUsuarioUseCase {
  static async executa(id_usuario: string | number): Promise<GetUsuarioResponse> {
    try {
      const usuario = await usuarios.findOne({
        where: {
          id_usuario: id_usuario,
        },
      });

      if (!usuario) {
        throw {
          message: "Usuário não encontrado.",
          status: http_status.NOT_FOUND,
        };
      }

      return {
        id_usuario: usuario.id_usuario,
        nome: usuario.nome,
        email: usuario.email,
        contato: usuario.contato,
        cpf: usuario.cpf,
        titulo_cientifico: usuario.titulo_cientifico,
        tipo_usuario: usuario.tipo_usuario,
        email_verificado: usuario.email_verificado,
        ultimo_acesso: usuario.ultimo_acesso,
        criado_em: usuario.criado_em,
        atualizado_em: usuario.atualizado_em,
        deletado_em: usuario.deletado_em,
      };
    } catch (err: any) {
      throw { message: err.message, status: http_status.BAD_REQUEST };
    }
  }
}
