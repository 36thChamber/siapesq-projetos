import BuscarEspeciePorIdUseCase from "../use-cases/especies/buscar-especie-por-id";
import ListarEspeciesUseCase from "../use-cases/especies/buscar-especies";
import CriarEspecieUseCase from "../use-cases/especies/criar-especie";

import {
  BuscarEspeciePorIdParamsRequest,
  CriarEspecieBodyRequest,
  ListarEspeciesQueryRequest,
} from "../types/especies-types";

export default class EspeciesService {
  static async buscarPorId(params: BuscarEspeciePorIdParamsRequest) {
    return BuscarEspeciePorIdUseCase.executa(params);
  }

  static async listar(query: ListarEspeciesQueryRequest) {
    return ListarEspeciesUseCase.executa(query);
  }

  static async criar(body: CriarEspecieBodyRequest) {
    return CriarEspecieUseCase.executa(body);
  }
}