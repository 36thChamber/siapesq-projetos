import httpStatus from "../../consts/http-status-enum";
import Relatorios from "../../models/Relatorios";
import {
  AtualizarRelatorioBodyRequest,
  RelatorioIdParamsRequest,
  RelatorioResponse,
  toRelatorioResponse,
} from "../../types/relatorios-types";
import { mapRelatorioPersistenceError } from "./relatorios-persistence-error";
import { validarAtualizacaoRelatorio, validarIdRelatorio } from "./relatorios-validation";
import { AppError } from "../../errors/app-error";

export default class AtualizarRelatorioUseCase {
  static async valida(params: RelatorioIdParamsRequest, body: AtualizarRelatorioBodyRequest) {
    await validarIdRelatorio(params);
    await validarAtualizacaoRelatorio(body);
  }

  static async executa(
    params: RelatorioIdParamsRequest,
    body: AtualizarRelatorioBodyRequest,
  ): Promise<RelatorioResponse> {
    const relatorio = await Relatorios.findByPk(params.id);
    if (!relatorio) {
      throw new AppError(httpStatus.NOT_FOUND, 'NOT_FOUND', `Relatório ${params.id} não encontrado`);
    }

    try {
      await relatorio.update(body);
      return toRelatorioResponse(relatorio);
    } catch (err) {
      return mapRelatorioPersistenceError(err);
    }
  }
}