import CriarMissaoUseCase from "../use-cases/missoes/criar-missao";
import BuscarMissaoPorIdUseCase from "../use-cases/missoes/buscar-missao-por-id";
import BuscarMissoesUseCase from "../use-cases/missoes/buscar-missoes";
import BuscarMissoesPorEmbarcacaoUseCase from "../use-cases/missoes/buscar-missoes-por-embarcacao";
import BuscarMissoesPorUsuarioUseCase from "../use-cases/missoes/buscar-missoes-por-usuario";
import AtualizarMissaoUseCase from "../use-cases/missoes/atualizar-missao";
import DeletarMissaoUseCase from "../use-cases/missoes/deletar-missao";
import { Transaction } from "sequelize";
import IniciarMissaoUseCase from "../use-cases/missoes/iniciar-missao";
import FinalizarMissaoUseCase from "../use-cases/missoes/finalizar-missao";

import {
  GetMissaoParamsRequest,
  ListarMissoesQueryRequest,
  ListarMissoesPorUsuarioParamsRequest,
  ListarMissoesPorEmbarcacaoParamsRequest,
  CriarMissaoBodyRequest,
  AtualizarMissaoBodyRequest,
} from "../types/Missoes-types";

export default class MissoesServices {
  static async get(params: GetMissaoParamsRequest) {
    await BuscarMissaoPorIdUseCase.valida(params);
    return BuscarMissaoPorIdUseCase.executa(params);
  }

  static async list(query: ListarMissoesQueryRequest) {
    await BuscarMissoesUseCase.valida(query);
    return BuscarMissoesUseCase.executa(query);
  }

  static async listByUsuario(
    params: ListarMissoesPorUsuarioParamsRequest,
    query: ListarMissoesQueryRequest,
  ) {
    await BuscarMissoesPorUsuarioUseCase.valida(params, query);
    return BuscarMissoesPorUsuarioUseCase.executa(params, query);
  }

  static async listByEmbarcacao(
    params: ListarMissoesPorEmbarcacaoParamsRequest,
    query: ListarMissoesQueryRequest,
  ) {
    await BuscarMissoesPorEmbarcacaoUseCase.valida(params, query);
    return BuscarMissoesPorEmbarcacaoUseCase.executa(params, query);
  }

  static async create(body: CriarMissaoBodyRequest, transaction?: Transaction) {
    await CriarMissaoUseCase.valida(body);
    return CriarMissaoUseCase.executa(body, transaction);
  }

  static async update(
    params: GetMissaoParamsRequest,
    body: AtualizarMissaoBodyRequest,
  ) {
    await AtualizarMissaoUseCase.valida(params, body);
    return AtualizarMissaoUseCase.executa(params, body);
  }

  static async delete(params: GetMissaoParamsRequest) {
    await DeletarMissaoUseCase.valida(params);
    return DeletarMissaoUseCase.executa(params);
  }

  static async iniciar(params: { id: number; usuarioId: number; versaoEsperada: number; iniciou_em_observado?: string }, transaction?: Transaction) {
    await IniciarMissaoUseCase.valida(params);
    return IniciarMissaoUseCase.executa(params, transaction);
  }

  static async finalizar(params: { id: number; usuarioId: number; versaoEsperada: number; terminou_em_observado?: string }, transaction?: Transaction) {
    await FinalizarMissaoUseCase.valida(params);
    return FinalizarMissaoUseCase.executa(params, transaction);
  }
}
