import {
  AtualizarArteDePescaBodyRequest,
  CriarArteDePescaBodyRequest,
  GetArteDePescaParamsRequest,
  ListarArtesDePescaQueryRequest,
} from "../types/artes-de-pesca-types";
import CriarArteDePescaUseCase from "../use-cases/artesDePesca/criar-arte-de-pesca";
import DeletarArteDePescaUseCase from "../use-cases/artesDePesca/deletar-arte-de-pesca";
import BuscarArteDePescaPorId from "../use-cases/artesDePesca/buscar-arte-de-pesca-por-id";
import BuscarArtesDePesca from "../use-cases/artesDePesca/buscar-artes-de-pesca";
import AtualizarArteDePescaUseCase from "../use-cases/artesDePesca/atualizar-arte-de-pesca";

export default class ArtesDePescaServices {
  static async get(params: GetArteDePescaParamsRequest) {
    await BuscarArteDePescaPorId.valida(params);
    return BuscarArteDePescaPorId.executa(params);
  }

  static async list(query: ListarArtesDePescaQueryRequest) {
    await BuscarArtesDePesca.valida(query);
    return BuscarArtesDePesca.executa(query);
  }

  static async create(body: CriarArteDePescaBodyRequest) {
    await CriarArteDePescaUseCase.valida(body);
    return CriarArteDePescaUseCase.executa(body);
  }

  static async update(
    params: GetArteDePescaParamsRequest,
    body: AtualizarArteDePescaBodyRequest,
  ) {
    await AtualizarArteDePescaUseCase.valida(params, body);
    return AtualizarArteDePescaUseCase.executa(params, body);
  }

  static async delete(params: GetArteDePescaParamsRequest) {
    await DeletarArteDePescaUseCase.valida(params);
    return DeletarArteDePescaUseCase.executa(params);
  }
}
