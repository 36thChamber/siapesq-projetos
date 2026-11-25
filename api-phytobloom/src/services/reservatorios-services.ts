import {
  CriarReservatorioBodyRequest,
  ListarReservatoriosPorUsuarioQueryRequest,
  ListarReservatoriosQueryRequest,
  AtualizarFavoritoReservatorioBodyRequest,
  AtualizarPrioridadeReservatorioBodyRequest,
  AtualizarReservatorioBodyRequest,
} from "../types/reservatorios-types";
import CriarReservatorioUseCase from "../use-cases/reservatorios/criar-reservatorio";
import DeletarReservatorioUseCase from "../use-cases/reservatorios/delete-reservatorio";
import GetReservatorioUseCase from "../use-cases/reservatorios/get-reservatorio";
import ListaReservatorioUseCase from "../use-cases/reservatorios/list-reservatorio";
import ListaReservatoriosPorUsuarioUseCase from "../use-cases/reservatorios/list-reservatorios-by-usuario";
import UpdateFavoritoReservatorioUseCase from "../use-cases/reservatorios/update-favorito-reservatorio";
import UpdatePrioridadeReservatorioUseCase from "../use-cases/reservatorios/update-prioridade-reservatorio";
import UpdateReservatorioUseCase from "../use-cases/reservatorios/update-reservatorio";

export default class ReservatoriosService {
  static async create(body: CriarReservatorioBodyRequest) {
    await CriarReservatorioUseCase.valida(body);
    return await CriarReservatorioUseCase.executa(body);
  }

  static async list(query: ListarReservatoriosQueryRequest) {
    await ListaReservatorioUseCase.valida(query);
    return await ListaReservatorioUseCase.executa(query);
  }

  static async listByUsuario(query: ListarReservatoriosPorUsuarioQueryRequest) {
    await ListaReservatoriosPorUsuarioUseCase.valida(query);
    return await ListaReservatoriosPorUsuarioUseCase.executa(query);
  }

  static async get(id: number, id_usuario?: number) {
    await GetReservatorioUseCase.valida({ id });
    return await GetReservatorioUseCase.executa({ id }, id_usuario);
  }

  static async update(body: AtualizarReservatorioBodyRequest, id: number) {
    await UpdateReservatorioUseCase.valida(body);
    return await UpdateReservatorioUseCase.executa(body, id);
  }

  static async updatePrioridade(
    body: AtualizarPrioridadeReservatorioBodyRequest,
    id: number,
  ) {
    await UpdatePrioridadeReservatorioUseCase.valida(body);
    return await UpdatePrioridadeReservatorioUseCase.executa(body, id);
  }

  static async updateFavorito(
    body: AtualizarFavoritoReservatorioBodyRequest,
    id: number,
  ) {
    await UpdateFavoritoReservatorioUseCase.valida(body);
    return await UpdateFavoritoReservatorioUseCase.executa(body, id);
  }

  static async delete(id: number) {
    await DeletarReservatorioUseCase.valida({ id });
    return await DeletarReservatorioUseCase.executa({ id });
  }
}
