import AtivarPlanoUseCase from "../use-cases/planos/ativar-plano";
import DeletarPlanoUseCase from "../use-cases/planos/deletar-plano";
import DesativarPlanoUseCase from "../use-cases/planos/desativar-plano";
import BuscarPlanoPorIdUseCase from "../use-cases/planos/buscar-plano-por-id";
import ListarPlanosUseCase from "../use-cases/planos/buscar-planos";
import ListarPlanosAtivosUseCase from "../use-cases/planos/buscar-planos-ativos";
import ListarPlanosInativosUseCase from "../use-cases/planos/buscar-planos-inativos";
import CriarPlanoUseCase from "../use-cases/planos/criar-plano";
import RestaurarPlanoUseCase from "../use-cases/planos/restaurar-plano";
import AtualizarPlanoUseCase from "../use-cases/planos/atualizar-plano";

import {
  AtualizarPlanoBodyRequest,
  BuscarPlanoPorIdParamsRequest,
  CriarPlanoBodyRequest,
  DeletarPlanoParamsRequest,
  ListarPlanosQueryRequest,
} from "../types/planos-types";

export default class PlanosService {
  static async buscarPorId(params: BuscarPlanoPorIdParamsRequest) {
    return BuscarPlanoPorIdUseCase.executa(params);
  }

  static async listar(query: ListarPlanosQueryRequest) {
    return ListarPlanosUseCase.executa(query);
  }

  static async listarAtivos(query: ListarPlanosQueryRequest) {
    return ListarPlanosAtivosUseCase.executa(query);
  }

  static async listarInativos(query: ListarPlanosQueryRequest) {
    return ListarPlanosInativosUseCase.executa(query);
  }

  static async criar(body: CriarPlanoBodyRequest) {
    return CriarPlanoUseCase.executa(body);
  }

  static async atualizar(
    params: BuscarPlanoPorIdParamsRequest,
    body: AtualizarPlanoBodyRequest
  ) {
    return AtualizarPlanoUseCase.executa(params, body);
  }

  static async deletar(params: DeletarPlanoParamsRequest) {
    return DeletarPlanoUseCase.executa(params);
  }

  static async ativar(params: BuscarPlanoPorIdParamsRequest) {
    return AtivarPlanoUseCase.executa(params);
  }

  static async desativar(params: BuscarPlanoPorIdParamsRequest) {
    return DesativarPlanoUseCase.executa(params);
  }

  static async restaurar(params: BuscarPlanoPorIdParamsRequest) {
    return RestaurarPlanoUseCase.executa(params);
  }
}