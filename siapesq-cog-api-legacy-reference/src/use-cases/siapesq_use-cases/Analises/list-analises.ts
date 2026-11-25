import http_status from "../../../consts/http-status-enum";
import analises from "../../../models/siapesq/Analises";
import {
  ListarAnalisesQueryRequest,
  ListarAnalisesResponse,
} from "../../../types/siapesq_types/Analises-types";

export default class ListarAnalisesUseCase {
  static async executa(
    query: ListarAnalisesQueryRequest
  ): Promise<ListarAnalisesResponse> {
    try {
      
      const { limit, offset } = query;

      const { rows, count } = await analises.findAndCountAll({
        limit,
        offset,
        order: [["id_analise", "ASC"]],
      });

      return {
        analises: rows,
        total: count,
      };
    } catch (err: any) {
      throw { message: err.message, status: http_status.BAD_REQUEST };
    }
  }
}
