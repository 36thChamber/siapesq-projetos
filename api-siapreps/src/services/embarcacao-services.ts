import {
  AtualizarEmbarcacaoBodyRequest,
  CriarEmbarcacaoBodyRequest,
  GetEmbarcacaoParamsRequest,
  ListarEmbarcacoesPorMestreParamsRequest,
  ListarEmbarcacoesQueryRequest,
} from "../types/embarcacoes-types";
import CriarEmbarcacaoUseCase from "../use-cases/embarcacoes/criar-embarcacao";
import DeletarEmbarcacaoUseCase from "../use-cases/embarcacoes/deletar-embarcacao";
import BuscarEmbarcacaoPorIdUseCase from "../use-cases/embarcacoes/buscar-embarcacao-por-id";
import BuscarEmbarcacoesPorMestreUseCase from "../use-cases/embarcacoes/buscar-embarcacoes-por-mestre";
import BuscarEmbarcacoesUseCase from "../use-cases/embarcacoes/buscar-embarcacoes";
import AtualizarEmbarcacaoUseCase from "../use-cases/embarcacoes/atualizar-embarcacao";

export async function validaUsuarioExiste(_idMestre: number): Promise<void> {
  // TODO: Quando Usuarios for migrado, validar com Usuarios.findByPk(_idMestre).
}

export default class EmbarcacaoServices {
  static async get(params: GetEmbarcacaoParamsRequest) {
    await BuscarEmbarcacaoPorIdUseCase.valida(params);
    return BuscarEmbarcacaoPorIdUseCase.executa(params);
  }

  static async list(query: ListarEmbarcacoesQueryRequest) {
    await BuscarEmbarcacoesUseCase.valida(query);
    return BuscarEmbarcacoesUseCase.executa(query);
  }

  static async listByMestre(
    params: ListarEmbarcacoesPorMestreParamsRequest,
    query: ListarEmbarcacoesQueryRequest,
  ) {
    await BuscarEmbarcacoesPorMestreUseCase.valida(params, query);
    return BuscarEmbarcacoesPorMestreUseCase.executa(params, query);
  }

  static async create(body: CriarEmbarcacaoBodyRequest) {
    await CriarEmbarcacaoUseCase.valida(body);
    await validaUsuarioExiste(body.id_mestre);
    return CriarEmbarcacaoUseCase.executa(body);
  }

  static async update(
    params: GetEmbarcacaoParamsRequest,
    body: AtualizarEmbarcacaoBodyRequest,
  ) {
    await AtualizarEmbarcacaoUseCase.valida(params, body);
    if (body.id_mestre !== undefined) {
      await validaUsuarioExiste(body.id_mestre);
    }
    return AtualizarEmbarcacaoUseCase.executa(params, body);
  }

  static async delete(params: GetEmbarcacaoParamsRequest) {
    await DeletarEmbarcacaoUseCase.valida(params);
    return DeletarEmbarcacaoUseCase.executa(params);
  }
}
