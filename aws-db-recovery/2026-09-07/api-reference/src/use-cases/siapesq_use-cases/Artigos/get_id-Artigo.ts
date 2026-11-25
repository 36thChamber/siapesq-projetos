import http_status from "../../../consts/http-status-enum";
import artigos from "../../../models/siapesq/Artigos";

export default class BuscarArtigoPorIdUseCase {
  static async executa(id_artigo: string | number) {
    try {
      const artigo = await artigos.findByPk(id_artigo);

      if (!artigo) {
        throw {
          message: `Artigo com ID ${id_artigo} não encontrado`,
          status: http_status.NOT_FOUND,
        };
      }

      return artigo;
    } catch (err: any) {
      const statusCode = err.status || http_status.INTERNAL_ERROR;
      throw { message: err.message, status: statusCode };
    }
  }
}