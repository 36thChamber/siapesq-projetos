import {
  GetAreaAlertaResponse,
  ListarAreasReservatorioQueryRequest,
  ListarAreasReservatorioResponse,
  CriarAreaAlertaBodyRequest,
  CriarAreaAlertaResponse,
  AtualizarAreaAlertaBodyRequest,
  AtualizarAreaAlertaResponse,
} from "../types/areas_alertas-types";
import DeletarAreas_AlertaUseCase from "../use-cases/AreasAlertas/delete-area-alerta";
import GetAreas_AlertaUseCase from "../use-cases/AreasAlertas/get-area-alerta-by-id";
import ListarAreas_AlertasUseCase from "../use-cases/AreasAlertas/get-areas-alertas";
import ListarAreasPorReservatorioUseCase from "../use-cases/AreasAlertas/get-areas-alertas-by-reservatorio";
import CriarAreas_AlertaUseCase from "../use-cases/AreasAlertas/post-area-alerta";
import AtualizarAreas_AlertaUseCase from "../use-cases/AreasAlertas/update-area-alerta-use-case";

export default class AreasAlertasService {
  static async buscarPorId(
    id: number,
    id_usuario: number,
    is_admin: boolean = false
  ): Promise<GetAreaAlertaResponse> {
    try {
      await GetAreas_AlertaUseCase.valida({ id, id_usuario });
      return await GetAreas_AlertaUseCase.executa({ id, id_usuario }, is_admin);
    } catch (err) {
      throw err;
    }
  }

  static async listar(
    query: ListarAreasReservatorioQueryRequest,
    id_usuario?: number,
    is_admin: boolean = false
  ): Promise<ListarAreasReservatorioResponse> {
    try {
      await ListarAreas_AlertasUseCase.valida(query);
      return await ListarAreas_AlertasUseCase.executa(query, is_admin);
    } catch (err) {
      throw err;
    }
  }

  static async listarPorReservatorio(
    query: any,
    id_usuario?: number,
    is_admin: boolean = false
  ): Promise<ListarAreasReservatorioResponse> {
    try {
      await ListarAreasPorReservatorioUseCase.valida(query);
      return await ListarAreasPorReservatorioUseCase.executa(query, id_usuario, is_admin);
    } catch (err) {
      throw err;
    }
  }

  static async criar(
    data: CriarAreaAlertaBodyRequest,
    id_usuario: number,
  ): Promise<CriarAreaAlertaResponse> {
    try {
      await CriarAreas_AlertaUseCase.valida(data);
      return await CriarAreas_AlertaUseCase.executa(data, id_usuario);
    } catch (err) {
      throw err;
    }
  }

  static async atualizar(
    data: AtualizarAreaAlertaBodyRequest & { id: number },
    id_usuario: number,
  ): Promise<AtualizarAreaAlertaResponse> {
    try {
      await AtualizarAreas_AlertaUseCase.valida(data);
      return await AtualizarAreas_AlertaUseCase.executa(data, id_usuario);
    } catch (err) {
      throw err;
    }
  }

  static async remover(id: number, id_usuario: number): Promise<void> {
    try {
      await DeletarAreas_AlertaUseCase.valida({ id });
      await DeletarAreas_AlertaUseCase.executa({ id }, id_usuario);
    } catch (err) {
      throw err;
    }
  }
}