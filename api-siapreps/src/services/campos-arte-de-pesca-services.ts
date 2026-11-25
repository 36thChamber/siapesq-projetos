// src/services/campos-arte-de-pesca-services.ts
import CriarCampoArteDePescaUseCase from "../use-cases/camposArteDePesca/criar-campo-arte-de-pesca";
import GetCampoArteDePescaUseCase from "../use-cases/camposArteDePesca/buscar-campo-arte-de-pesca";
import ListarCamposArteDePescaUseCase from "../use-cases/camposArteDePesca/listar-campos-arte-de-pesca";
import AtualizarCampoArteDePescaUseCase from "../use-cases/camposArteDePesca/atualizar-campo-arte-de-pesca";
import DeletarCampoArteDePescaUseCase from "../use-cases/camposArteDePesca/deletar-campo-arte-de-pesca";
import BuscarCamposPorArteDePescaUseCase from "../use-cases/camposArteDePesca/buscar-campos-por-arte";

import {
  CriarCampoArteDePescaBodyRequest,
  AtualizarCampoArteDePescaBodyRequest,
  GetCampoArteDePescaParamsRequest,
  ListarCamposArteDePescaQueryRequest,
  BuscarCamposPorArteDePescaParamsRequest,
} from "../types/campos-arte-de-pesca-types";

export default class CamposArteDePescaServices {
  static async create(body: CriarCampoArteDePescaBodyRequest) {
    await CriarCampoArteDePescaUseCase.valida(body);
    return CriarCampoArteDePescaUseCase.executa(body);
  }

  static async get(params: GetCampoArteDePescaParamsRequest) {
    await GetCampoArteDePescaUseCase.valida(params);
    return GetCampoArteDePescaUseCase.executa(params);
  }

  static async list(query: ListarCamposArteDePescaQueryRequest) {
    await ListarCamposArteDePescaUseCase.valida(query);
    return ListarCamposArteDePescaUseCase.executa(query);
  }

  static async listByArtePescaId(
    params: BuscarCamposPorArteDePescaParamsRequest,
  ) {
    await BuscarCamposPorArteDePescaUseCase.valida(params);
    return BuscarCamposPorArteDePescaUseCase.executa(params);
  }

  static async update(
    params: GetCampoArteDePescaParamsRequest,
    body: AtualizarCampoArteDePescaBodyRequest,
  ) {
    await AtualizarCampoArteDePescaUseCase.valida(params, body);
    return AtualizarCampoArteDePescaUseCase.executa(params, body);
  }

  static async delete(params: GetCampoArteDePescaParamsRequest) {
    await DeletarCampoArteDePescaUseCase.valida(params);
    return DeletarCampoArteDePescaUseCase.executa(params);
  }
}