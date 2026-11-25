import CriarEspecieUseCase from "../use-cases/especies/criar-especie";
import BuscarEspeciePorIdUseCase from "../use-cases/especies/buscar-especie-por-id";
import BuscarEspeciesUseCase from "../use-cases/especies/buscar-especies";
import UpdateEspecieUseCase from "../use-cases/especies/atualizar-especie";
import DeletarEspecieUseCase from "../use-cases/especies/deletar-especie";
import AtivarEspecieUseCase from "../use-cases/especies/ativar-especie";
import DesativarEspecieUseCase from "../use-cases/especies/desativar-especie";
import {
  CriarEspecieBodyRequest,
  ListarEspeciesQueryRequest,
  AtualizarEspecieBodyRequest,
} from "../types/especies-types";

export default class EspeciesServices {
  static async create(body: CriarEspecieBodyRequest) {
    try {
      await CriarEspecieUseCase.valida(body);
      return await CriarEspecieUseCase.executa(body);
    } catch (err) {
      throw err;
    }
  }

  static async get(id: number) {
    try {
      await BuscarEspeciePorIdUseCase.valida({ id });
      return await BuscarEspeciePorIdUseCase.executa({ id });
    } catch (err) {
      throw err;
    }
  }

  static async list(query: ListarEspeciesQueryRequest) {
    try {
      await BuscarEspeciesUseCase.valida(query);
      return await BuscarEspeciesUseCase.executa(query);
    } catch (err) {
      throw err;
    }
  }

  static async update(id: number, body: AtualizarEspecieBodyRequest) {
    try {
      await UpdateEspecieUseCase.valida({ id }, body);
      return await UpdateEspecieUseCase.executa(id, body);
    } catch (err) {
      throw err;
    }
  }

  static async delete(id: number) {
    try {
      await DeletarEspecieUseCase.valida({ id });
      return await DeletarEspecieUseCase.executa(id);
    } catch (err) {
      throw err;
    }
  }

  static async ativar(id: number) {
    try {
      await AtivarEspecieUseCase.valida({ id });
      return await AtivarEspecieUseCase.executa(id);
    } catch (err) {
      throw err;
    }
  }

  static async desativar(id: number) {
    try {
      await DesativarEspecieUseCase.valida({ id });
      return await DesativarEspecieUseCase.executa(id);
    } catch (err) {
      throw err;
    }
  }
}
