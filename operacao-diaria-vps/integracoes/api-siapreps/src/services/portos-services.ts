import {
  AtualizarPortoBodyRequest,
  CriarPortoBodyRequest,
  GetPortoParamsRequest,
  ListarPortosQueryRequest,
} from "../types/portos-types";
import CriarPortoUseCase from "../use-cases/portos/criar-porto";
import DeletarPortoUseCase from "../use-cases/portos/deletar-porto";
import BuscarPortoPorIdUseCase from "../use-cases/portos/buscar-porto-por-id";
import BuscarPortosUseCase from "../use-cases/portos/buscar-portos";
import AtualizarPortoUseCase from "../use-cases/portos/atualizar-porto";

export default class PortosServices {
  static async get(params: GetPortoParamsRequest) {
    await BuscarPortoPorIdUseCase.valida(params);
    return BuscarPortoPorIdUseCase.executa(params);
  }

  static async list(query: ListarPortosQueryRequest) {
    await BuscarPortosUseCase.valida(query);
    return BuscarPortosUseCase.executa(query);
  }

  static async create(body: CriarPortoBodyRequest) {
    await CriarPortoUseCase.valida(body);
    return CriarPortoUseCase.executa(body);
  }

  static async update(params: GetPortoParamsRequest, body: AtualizarPortoBodyRequest) {
    await AtualizarPortoUseCase.valida(params, body);
    return AtualizarPortoUseCase.executa(params, body);
  }

  static async delete(params: GetPortoParamsRequest) {
    await DeletarPortoUseCase.valida(params);
    return DeletarPortoUseCase.executa(params);
  }
}
