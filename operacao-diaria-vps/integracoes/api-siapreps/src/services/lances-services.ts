// src/services/lances-services.ts
import CriarLanceUseCase from "../use-cases/lances/criar-lance";
import BuscarLancePorIdUseCase from "../use-cases/lances/buscar-lance-por-id";
import BuscarLancesUseCase from "../use-cases/lances/buscar-lances";
import BuscarLancesPorMissaoUseCase from "../use-cases/lances/buscar-lances-por-missoes";
import AtualizarLanceUseCase from "../use-cases/lances/atualizar-lance";
import DeletarLanceUseCase from "../use-cases/lances/deletar-lance";
import { Transaction } from "sequelize";
import RecolherLanceUseCase from "../use-cases/lances/recolher-lance";

import {
  AtualizarLanceBodyRequest,
  CriarLanceBodyRequest,
  GetLanceParamsRequest,
  ListarLancesPorMissaoParamsRequest,
  ListarLancesQueryRequest,
} from "../types/Lances-types";

export default class LancesServices {
  static async get(params: GetLanceParamsRequest) {
    await BuscarLancePorIdUseCase.valida(params);
    return BuscarLancePorIdUseCase.executa(params);
  }

  static async list(query: ListarLancesQueryRequest) {
    await BuscarLancesUseCase.valida(query);
    return BuscarLancesUseCase.executa(query);
  }

  static async listByMissao(
    params: ListarLancesPorMissaoParamsRequest,
    query: ListarLancesQueryRequest,
  ) {
    await BuscarLancesPorMissaoUseCase.valida(params, query);
    return BuscarLancesPorMissaoUseCase.executa(params, query);
  }

  static async create(body: CriarLanceBodyRequest, transaction?: Transaction) {
    await CriarLanceUseCase.valida(body);
    return CriarLanceUseCase.executa(body, transaction);
  }

  static async update(
    params: GetLanceParamsRequest,
    body: AtualizarLanceBodyRequest,
  ) {
    await AtualizarLanceUseCase.valida(params, body);
    return AtualizarLanceUseCase.executa(params, body);
  }

  static async delete(params: GetLanceParamsRequest) {
    await DeletarLanceUseCase.valida(params);
    return DeletarLanceUseCase.executa(params);
  }

  static async recolher(params: { id: number; versaoEsperada: number; recolhido_em_observado?: string }, transaction?: Transaction) {
    await RecolherLanceUseCase.valida(params);
    return RecolherLanceUseCase.executa(params, transaction);
  }
}
