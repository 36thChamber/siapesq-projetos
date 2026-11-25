import {
  ListarRelatoriosQueryRequest,
  RelatorioRelacionamentoParamsRequest,
} from "../../types/relatorios-types";
import {
  listarRelatoriosPorRelacionamento,
  validarListagemPorRelacionamento,
} from "./buscar-relatorios-por-relacionamento";

export default class BuscarRelatoriosPorUsuarioUseCase {
  static valida(
    params: RelatorioRelacionamentoParamsRequest,
    query: ListarRelatoriosQueryRequest,
  ) {
    return validarListagemPorRelacionamento(params, query);
  }

  static executa(
    params: RelatorioRelacionamentoParamsRequest,
    query: ListarRelatoriosQueryRequest,
    id_usuarioFiltro?: number,
  ) {
    return listarRelatoriosPorRelacionamento(params, query, id_usuarioFiltro);
  }
}
