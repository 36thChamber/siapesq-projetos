import httpStatus from "../../consts/http-status-enum";
import Especies from "../../models/Especies";
import GruposEspecies from "../../models/GrupoEspecies";
import InformacoesEspecies from "../../models/InformacoesEspecies";
import Analises from "../../models/Analises";

import { DadosPlataformaResponse } from "../../types/admin-types";

export default class BuscarDadosPlataformaUseCase {
  static async executa(): Promise<DadosPlataformaResponse> {
    try {
      const [total_especies, total_grupos, total_informacoes, total_analises] =
        await Promise.all([
          Especies.count(),
          GruposEspecies.count(),
          InformacoesEspecies.count(),
          Analises.count(),
        ]);

      return {
        total_especies,
        total_grupos,
        total_informacoes,
        total_analises,
      };
    } catch (err: any) {
      throw {
        message: err.message ?? "Erro ao buscar dados da plataforma",
        status: err.status ?? httpStatus.INTERNAL_ERROR,
      };
    }
  }
}
