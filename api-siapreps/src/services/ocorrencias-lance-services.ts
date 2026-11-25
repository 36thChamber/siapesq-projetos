import http_status from "../consts/http-status-enum";
import Especies from "../models/Especies";
import Lances from "../models/Lances";
import Missoes from "../models/Missoes";
import OcorrenciasLance from "../models/OcorrenciasLance";
import { MissaoStatus } from "../models/enums/missao-status.enum";
import {
  AtualizarOcorrenciaLanceBodyRequest,
  CriarOcorrenciaLanceBodyRequest,
  GetOcorrenciaLanceParamsRequest,
  ListarOcorrenciasLanceParamsRequest,
  ListarOcorrenciasLanceQueryRequest,
} from "../types/ocorrencias-lance-types";
import CriarOcorrenciaLanceUseCase from "../use-cases/ocorrenciasLance/criar-ocorrencia-lance";
import DeletarOcorrenciaLanceUseCase from "../use-cases/ocorrenciasLance/deletar-ocorrencia-lance";
import ListarOcorrenciasLanceUseCase from "../use-cases/ocorrenciasLance/buscar-ocorrencias-lance";
import AtualizarOcorrenciaLanceUseCase from "../use-cases/ocorrenciasLance/atualizar-ocorrencia-lance";
import { Transaction } from "sequelize";

export async function validaLanceExiste(idLance: number): Promise<void> {
  const lance = await Lances.findOne({
    where: { id: idLance, ativo: true },
    include: [{ model: Missoes, as: "missao" }],
  });

  if (!lance) {
    throw {
      message: `Lance ${idLance} não encontrado`,
      status: http_status.NOT_FOUND,
    };
  }

  // Impede ocorrências em missão finalizada
  if (lance.missao && lance.missao.status === MissaoStatus.FINALIZADA) {
    throw {
      message: "Não é possível adicionar ou modificar ocorrências de uma missão finalizada",
      status: http_status.CONFLICT,
      code: "MISSION_ALREADY_FINALIZED",
    };
  }
}

export async function validaEspecieExiste(idEspecie: number): Promise<void> {
  const especie = await Especies.findOne({
    where: { id: idEspecie, ativo: true },
  });

  if (!especie) {
    throw {
      message: `Espécie ${idEspecie} não encontrada`,
      status: http_status.NOT_FOUND,
    };
  }
}

export default class OcorrenciasLanceServices {
  static async getById(params: GetOcorrenciaLanceParamsRequest) {
    const ocorrencia = await OcorrenciasLance.findByPk(params.id);
    return ocorrencia ?? null;
  }

  static async create(
    params: ListarOcorrenciasLanceParamsRequest,
    body: CriarOcorrenciaLanceBodyRequest,
    transaction?: Transaction,
  ) {
    await CriarOcorrenciaLanceUseCase.valida(params, body);
    await validaLanceExiste(params.id_lance);
    await validaEspecieExiste(body.id_especie);

    return CriarOcorrenciaLanceUseCase.executa(params, body, transaction);
  }

  static async list(
    params: ListarOcorrenciasLanceParamsRequest,
    query: ListarOcorrenciasLanceQueryRequest,
  ) {
    await ListarOcorrenciasLanceUseCase.valida(params, query);
    await validaLanceExiste(params.id_lance);

    return ListarOcorrenciasLanceUseCase.executa(params, query);
  }

  static async update(
    params: GetOcorrenciaLanceParamsRequest,
    body: AtualizarOcorrenciaLanceBodyRequest,
  ) {
    await AtualizarOcorrenciaLanceUseCase.valida(params, body);

    // Busca a ocorrência para obter o id_lance
    const ocorrencia = await OcorrenciasLance.findByPk(params.id);
    if (!ocorrencia) {
      throw {
        message: `Ocorrência ${params.id} não encontrada`,
        status: http_status.NOT_FOUND,
      };
    }
    await validaLanceExiste(ocorrencia.id_lance);

    if (body.id_especie !== undefined) {
      await validaEspecieExiste(body.id_especie);
    }

    return AtualizarOcorrenciaLanceUseCase.executa(params, body);
  }

  static async delete(params: GetOcorrenciaLanceParamsRequest) {
    await DeletarOcorrenciaLanceUseCase.valida(params);

    // Busca a ocorrência para validar o lance
    const ocorrencia = await OcorrenciasLance.findByPk(params.id);
    if (!ocorrencia) {
      throw {
        message: `Ocorrência ${params.id} não encontrada`,
        status: http_status.NOT_FOUND,
      };
    }
    await validaLanceExiste(ocorrencia.id_lance);

    return DeletarOcorrenciaLanceUseCase.executa(params);
  }
}
