import BuscarArtigoPorIdUseCase from "../use-cases/artigos/buscar-artigo-por-id";
import BuscarArtigosUseCase from "../use-cases/artigos/buscar-artigos";
import CriarArtigoUseCase from "../use-cases/artigos/criar-artigo";
import AtualizarArtigoUseCase from "../use-cases/artigos/atualizar-artigo";

import {
  CriarArtigoBodyRequest,
  AtualizarArtigoBodyRequest,
  BuscarArtigoPorIdParamsRequest,
  ListarArtigosQueryRequest,
} from "../types/artigos-types";

export default class ArtigosService {
  static async create(body: CriarArtigoBodyRequest) {
    return CriarArtigoUseCase.executa(body);
  }

  static async update(
    params: BuscarArtigoPorIdParamsRequest,
    body: AtualizarArtigoBodyRequest
  ) {
    return AtualizarArtigoUseCase.executa(params, body);
  }

  static async list(query: ListarArtigosQueryRequest) {
    return BuscarArtigosUseCase.executa(query);
  }

  static async getId(params: BuscarArtigoPorIdParamsRequest) {
    return BuscarArtigoPorIdUseCase.executa(params);
  }
}