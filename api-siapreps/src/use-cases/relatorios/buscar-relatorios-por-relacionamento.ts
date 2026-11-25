import Relatorios from "../../models/Relatorios";
import {
  ListarRelatoriosQueryRequest,
  ListarRelatoriosResponse,
  RelatorioRelacionamentoParamsRequest,
  toRelatorioResponse,
} from "../../types/relatorios-types";
import {
  validarPaginacaoRelatorios,
  validarRelacionamentoRelatorio,
} from "./relatorios-validation";

export async function validarListagemPorRelacionamento(
  params: RelatorioRelacionamentoParamsRequest,
  query: ListarRelatoriosQueryRequest,
) {
  await validarRelacionamentoRelatorio(params);
  await validarPaginacaoRelatorios(query);
}

export async function listarRelatoriosPorRelacionamento(
  params: RelatorioRelacionamentoParamsRequest,
  query: ListarRelatoriosQueryRequest,
  id_usuarioFiltro?: number,
): Promise<ListarRelatoriosResponse> {
  const where =
    id_usuarioFiltro !== undefined
      ? { ...params, id_usuario: id_usuarioFiltro }
      : params;

  const { rows, count } = await Relatorios.findAndCountAll({
    where,
    limit: query.limit,
    offset: query.offset,
    order: [["criado_em", "DESC"]],
  });

  return {
    relatorios: rows.map(toRelatorioResponse),
    total: count,
  };
}
