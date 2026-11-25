import BuscarInformacaoEspeciePorIdUseCase from "../use-cases/informacoesEspecies/buscar-informacao-especie-por-id";
import ListarInformacoesEspeciesUseCase from "../use-cases/informacoesEspecies/buscar-informacoes-especies";
import CriarInformacaoEspecieUseCase from "../use-cases/informacoesEspecies/criar-informacao-especie";
import AtualizarInformacaoEspecieUseCase from "../use-cases/informacoesEspecies/atualizar-informacao-especie";
import DeletarInformacaoEspecieUseCase from "../use-cases/informacoesEspecies/deletar-informacao-especie";

import {
  BuscarInformacaoEspeciePorIdParamsRequest,
  CriarInformacaoEspecieBodyRequest,
  AtualizarInformacaoEspecieBodyRequest,
  ListarInformacoesEspeciesQueryRequest,
} from "../types/informacoes-especies-types";

export default class InformacoesEspeciesService {
  static async buscarPorId(
    params: BuscarInformacaoEspeciePorIdParamsRequest
  ) {
    return BuscarInformacaoEspeciePorIdUseCase.executa(
      params
    );
  }

  static async listar(
    query: ListarInformacoesEspeciesQueryRequest
  ) {
    return ListarInformacoesEspeciesUseCase.executa(
      query
    );
  }

  static async criar(
    body: CriarInformacaoEspecieBodyRequest
  ) {
    return CriarInformacaoEspecieUseCase.executa(
      body
    );
  }

  static async atualizar(
    params: BuscarInformacaoEspeciePorIdParamsRequest,
    body: AtualizarInformacaoEspecieBodyRequest
  ) {
    return AtualizarInformacaoEspecieUseCase.executa(
      params,
      body
    );
  }

  static async deletar(
    params: BuscarInformacaoEspeciePorIdParamsRequest
  ) {
    return DeletarInformacaoEspecieUseCase.executa(
      params
    );
  }
}