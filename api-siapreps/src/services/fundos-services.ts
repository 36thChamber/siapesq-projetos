import CriarFundoUseCase from "../use-cases/fundos/criar-fundo";
import BuscarFundoPorIdUseCase from "../use-cases/fundos/buscar-fundo-por-id";
import BuscarFundosUseCase from "../use-cases/fundos/buscar-fundos";
import AtualizarFundoUseCase from "../use-cases/fundos/atualizar-fundo";
import DeletarFundoUseCase from "../use-cases/fundos/deletar-fundo";
import AtivarFundoUseCase from "../use-cases/fundos/ativar-fundo";
import DesativarFundoUseCase from "../use-cases/fundos/desativar-fundo";

import {
  CriarFundoBodyRequest,
  CriarFundoResponse,
  GetFundoParamsRequest,
  GetFundoResponse,
  ListarFundosQueryRequest,
  ListarFundosResponse,
  AtualizarFundoBodyRequest,
  AtualizarFundoResponse,
} from "../types/fundos-types";

export default class FundosServices {
  static async create(body: CriarFundoBodyRequest): Promise<CriarFundoResponse> {
    try {
      await CriarFundoUseCase.valida(body);
      return await CriarFundoUseCase.executa(body);
    } catch (err) {
      throw err;
    }
  }

  static async getById(params: GetFundoParamsRequest): Promise<GetFundoResponse> {
    try {
      await BuscarFundoPorIdUseCase.valida(params);
      return await BuscarFundoPorIdUseCase.executa(params);
    } catch (err) {
      throw err;
    }
  }

  static async list(query: ListarFundosQueryRequest): Promise<ListarFundosResponse> {
    try {
      const validatedQuery = await BuscarFundosUseCase.valida(query);
      return await BuscarFundosUseCase.executa(validatedQuery);
    } catch (err) {
      throw err;
    }
  }

  static async update(id: number, body: AtualizarFundoBodyRequest): Promise<AtualizarFundoResponse> {
    try {
      await AtualizarFundoUseCase.valida(body);
      return await AtualizarFundoUseCase.executa(id, body);
    } catch (err) {
      throw err;
    }
  }

  static async delete(id: number): Promise<void> {
    try {
      await DeletarFundoUseCase.valida({ id });
      await DeletarFundoUseCase.executa(id);
    } catch (err) {
      throw err;
    }
  }

  static async ativar(id: number): Promise<void> {
    try {
      await AtivarFundoUseCase.valida({ id });
      await AtivarFundoUseCase.executa(id);
    } catch (err) {
      throw err;
    }
  }

  static async desativar(id: number): Promise<void> {
    try {
      await DesativarFundoUseCase.valida({ id });
      await DesativarFundoUseCase.executa(id);
    } catch (err) {
      throw err;
    }
  }
}
