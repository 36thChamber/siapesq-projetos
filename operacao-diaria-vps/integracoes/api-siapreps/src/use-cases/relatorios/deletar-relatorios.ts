import httpStatus from "../../consts/http-status-enum";
import Relatorios from "../../models/Relatorios";
import { RelatorioIdParamsRequest, RelatorioResponse, toRelatorioResponse } from "../../types/relatorios-types";
import { validarIdRelatorio } from "./relatorios-validation";
import { AppError } from "../../errors/app-error";

export default class DeletarRelatorioUseCase {
  static valida(params: RelatorioIdParamsRequest) {
    return validarIdRelatorio(params);
  }

  static async executa(params: RelatorioIdParamsRequest): Promise<RelatorioResponse> {
    const relatorio = await Relatorios.findByPk(params.id);
    if (!relatorio) {
      throw new AppError(httpStatus.NOT_FOUND, 'NOT_FOUND', `Relatório ${params.id} não encontrado`);
    }

    await relatorio.destroy();
    return toRelatorioResponse(relatorio);
  }
}