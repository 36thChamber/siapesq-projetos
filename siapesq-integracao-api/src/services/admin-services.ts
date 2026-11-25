import BuscarDadosPlataformaUseCase from "../use-cases/admin/buscar-dados-plataforma";

import { DadosPlataformaResponse } from "../types/admin-types";

export default class AdminService {
  static async buscarDadosPlataforma(): Promise<DadosPlataformaResponse> {
    return BuscarDadosPlataformaUseCase.executa();
  }
}
