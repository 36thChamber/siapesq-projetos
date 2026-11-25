import BuscarAnalisePorIdUseCase from "../use-cases/analises/buscar-analise-por-id";
import BuscarAnalisesPorEspecieUseCase from "../use-cases/analises/buscar-analises-por-especie";
import BuscarAnalisesUseCase from "../use-cases/analises/buscar-analises";
import CriarAnaliseUseCase from "../use-cases/analises/criar-analise";
import AtualizarAnaliseUseCase from "../use-cases/analises/atualizar-analise";
import ObterTifAdequabilidadeUseCase, { ObterTifParams } from "../use-cases/analises/obter-tif-adequabilidade";
import ObterCsvOcorrenciasUseCase, { ObterCsvOcorrenciasParams } from "../use-cases/analises/obter-csv-ocorrencias";
import AWS_S3_REPOSITORY from "../repositories/aws-s3-repository";

import {
  CriarAnaliseBodyRequest,
  AtualizarAnaliseBodyRequest,
  BuscarAnalisePorIdParamsRequest,
  ListarAnalisesQueryRequest,
} from "../types/analises-types";

export default class AnalisesService {
  static async obterAcessoTif(params: ObterTifParams, awsRepository: AWS_S3_REPOSITORY) {
    return ObterTifAdequabilidadeUseCase.executa(params, awsRepository, true);
  }
  static async obterTif(params: ObterTifParams, awsRepository: AWS_S3_REPOSITORY) {
    return ObterTifAdequabilidadeUseCase.executa(params, awsRepository);
  }
  static async obterCsvOcorrencias(params: ObterCsvOcorrenciasParams, awsRepository: AWS_S3_REPOSITORY) {
    return ObterCsvOcorrenciasUseCase.executa(params, awsRepository);
  }
  static async buscarPorId(params: BuscarAnalisePorIdParamsRequest) {
    return BuscarAnalisePorIdUseCase.executa(params);
  }

  static async buscarPorEspecie(id_especie: string) {
    return BuscarAnalisesPorEspecieUseCase.executa({
      id_especie,
    });
  }

  static async listar(query: ListarAnalisesQueryRequest) {
    return BuscarAnalisesUseCase.executa(query);
  }

  static async criar(body: CriarAnaliseBodyRequest, tipo_usuario?: string) {
    return CriarAnaliseUseCase.executa(body, tipo_usuario);
  }

  static async atualizar(
    params: BuscarAnalisePorIdParamsRequest,
    body: AtualizarAnaliseBodyRequest,
    tipo_usuario?: string,
  ) {
    return AtualizarAnaliseUseCase.executa(params, body, tipo_usuario);
  }
}
