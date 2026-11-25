import Relatorios from "../../models/Relatorios";
import { CriarRelatorioBodyRequest, RelatorioResponse, toRelatorioResponse } from "../../types/relatorios-types";
import { mapRelatorioPersistenceError } from "./relatorios-persistence-error";
import { validarCriacaoRelatorio } from "./relatorios-validation";

export default class CriarRelatorioUseCase {
  static valida(body: CriarRelatorioBodyRequest) {
    return validarCriacaoRelatorio(body);
  }

  static async executa(body: CriarRelatorioBodyRequest): Promise<RelatorioResponse> {
    try {
      const relatorio = await Relatorios.create(body as any);
      return toRelatorioResponse(relatorio);
    } catch (err) {
      return mapRelatorioPersistenceError(err);
    }
  }
}