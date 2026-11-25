import Relatorios from "../../models/Relatorios";
import {
  ListarRelatoriosQueryRequest,
  ListarRelatoriosResponse,
  toRelatorioResponse,
} from "../../types/relatorios-types";
import { validarPaginacaoRelatorios } from "./relatorios-validation";

export default class BuscarRelatoriosUseCase {
  static valida(query: ListarRelatoriosQueryRequest) {
    return validarPaginacaoRelatorios(query);
  }

  /**
   * `id_usuarioFiltro` restringe a consulta ao proprietário quando definido.
   * O filtro é aplicado no `where`, antes de `limit`/`offset`, para que a
   * contagem total reflita apenas os registros autorizados.
   */
  static async executa(
    query: ListarRelatoriosQueryRequest,
    id_usuarioFiltro?: number,
  ): Promise<ListarRelatoriosResponse> {
    const { rows, count } = await Relatorios.findAndCountAll({
      where: id_usuarioFiltro !== undefined ? { id_usuario: id_usuarioFiltro } : {},
      limit: query.limit,
      offset: query.offset,
      order: [["criado_em", "DESC"]],
    });

    return {
      relatorios: rows.map(toRelatorioResponse),
      total: count,
    };
  }
}