import CriarIncidenteUseCase from '../use-cases/incidentes/criar-incidente';
import ListarIncidentesPorMissaoUseCase from '../use-cases/incidentes/listar-incidentes-por-missao';
import AtualizarIncidenteUseCase from '../use-cases/incidentes/atualizar-incidente';
import {
  CriarIncidenteBodyRequest,
  AtualizarIncidenteBodyRequest,
} from '../types/incidentes-types';
import { GrupoIncidente } from '../models/Incidentes';
import { Transaction } from 'sequelize';

export default class IncidentesServices {
  static async criar(params: { missaoId: number; usuarioId: number; administracao?: boolean }, body: CriarIncidenteBodyRequest, transaction?: Transaction) {
    await CriarIncidenteUseCase.valida({ ...params, dados: body });
    return CriarIncidenteUseCase.executa({ missaoId: params.missaoId, dados: body }, transaction);
  }

  static async listarPorMissao(params: {
    usuarioId: number;
    missaoId: number;
    limit?: number;
    offset?: number;
    grupo?: GrupoIncidente;
  }) {
    await ListarIncidentesPorMissaoUseCase.valida(params);
    return ListarIncidentesPorMissaoUseCase.executa(params);
  }

  static async atualizar(
    params: { id: number; usuarioId: number; versaoEsperada: number },
    body: AtualizarIncidenteBodyRequest,
  ) {
    await AtualizarIncidenteUseCase.valida({ ...params, dados: body });
    return AtualizarIncidenteUseCase.executa({
      id: params.id,
      versaoEsperada: params.versaoEsperada,
      dados: body,
    });
  }
}
