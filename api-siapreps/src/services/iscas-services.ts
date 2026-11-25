import CriarIscaUseCase from "../use-cases/iscas/criar-isca";
import BuscarIscaPorIdUseCase from "../use-cases/iscas/buscar-isca-por-id";
import BuscarIscasUseCase from "../use-cases/iscas/buscar-iscas";
import AtualizarIscaUseCase from "../use-cases/iscas/atualizar-isca";
import DeletarIscaUseCase from "../use-cases/iscas/deletar-isca";
import AtivarIscaUseCase from "../use-cases/iscas/ativar-isca";
import DesativarIscaUseCase from "../use-cases/iscas/desativar-isca";
import {
  CriarIscaBodyRequest,
  ListarIscasQueryRequest,
  AtualizarIscaBodyRequest,
} from "../types/iscas-types";

export default class IscasServices {
  static async create(body: CriarIscaBodyRequest) {
    try {
      await CriarIscaUseCase.valida(body);
      return await CriarIscaUseCase.executa(body);
    } catch (err) {
      throw err;
    }
  }

  static async get(id: number) {
    try {
      await BuscarIscaPorIdUseCase.valida({ id });
      return await BuscarIscaPorIdUseCase.executa({ id });
    } catch (err) {
      throw err;
    }
  }

  static async list(query: ListarIscasQueryRequest) {
    try {
      await BuscarIscasUseCase.valida(query);
      return await BuscarIscasUseCase.executa(query);
    } catch (err) {
      throw err;
    }
  }

  static async update(id: number, body: AtualizarIscaBodyRequest) {
    try {
      await AtualizarIscaUseCase.valida({ id }, body);
      return await AtualizarIscaUseCase.executa(id, body);
    } catch (err) {
      throw err;
    }
  }

  static async delete(id: number) {
    try {
      await DeletarIscaUseCase.valida({ id });
      return await DeletarIscaUseCase.executa(id);
    } catch (err) {
      throw err;
    }
  }

  static async ativar(id: number) {
    try {
      await AtivarIscaUseCase.valida({ id });
      return await AtivarIscaUseCase.executa(id);
    } catch (err) {
      throw err;
    }
  }

  static async desativar(id: number) {
    try {
      await DesativarIscaUseCase.valida({ id });
      return await DesativarIscaUseCase.executa(id);
    } catch (err) {
      throw err;
    }
  }
}
